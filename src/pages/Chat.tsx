// =============================================================================
// Chat.tsx — Real-time group chat system for SafarGo.
// When a user books a trip, they get added to that trip's chat group.
// This page uses Supabase Realtime (PostgreSQL LISTEN/NOTIFY under the hood)
// to push new messages to all connected clients instantly. The layout is a
// two-panel design: chat list on the left, messages on the right — similar to
// WhatsApp Web. On mobile, it switches between the two panels since there's
// not enough room for both. Also supports AI messages from the SafarGo bot.
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { translations } from '../i18n/translations';
import { ChatMessage } from '../types';
import { Send, ArrowLeft, Users, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '../lib/cn';

// TypeScript types for the raw Supabase rows — these match the database schema
interface ChatGroupRow {
    id: string;
    trip_id: string;
    name: string;
    image: string;
    created_at: string;
}

// Preview data we build for the chat list sidebar — includes last message and member count
interface ChatPreviewData {
    id: string;
    name: string;
    image: string;
    lastMessage: string;
    lastMessageTime: string;
    memberCount: number;
}

export const Chat = () => {
    const { user, language } = useApp();
    const t = translations[language].nav;

    // -- Core state --
    const [chatGroups, setChatGroups] = useState<ChatPreviewData[]>([]);  // All chat groups the user belongs to
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);  // Currently open chat
    const [messages, setMessages] = useState<ChatMessage[]>([]);  // Messages for the selected chat
    const [newMessage, setNewMessage] = useState('');  // Text in the message input
    const [loading, setLoading] = useState(true);  // Initial loading state
    const [error, setError] = useState<string | null>(null);  // Error state for failed loads
    const [sending, setSending] = useState(false);  // Prevents double-sending while a message is in flight

    // Refs for auto-scrolling to the latest message and focusing the input
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Smooth-scroll to the bottom of the messages list whenever new messages come in
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load all chat groups the user is a member of.
    // The flow is: get memberships -> get group details -> for each group, fetch last message + member count.
    // This builds the preview data shown in the left sidebar.
    const loadChatGroups = useCallback(async () => {
        if (!user.id) return;

        try {
        // Step 1: Find all chat_ids this user is a member of
        const { data: memberships, error: memberErr } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('user_id', user.id);

        if (memberErr) {
            console.error('Chat load error:', memberErr);
            setError('Could not load chats. Please try again.');
            setLoading(false);
            return;
        }

        // If the user hasn't booked any trips yet, they won't have any chat groups
        if (!memberships || memberships.length === 0) {
            setChatGroups([]);
            setLoading(false);
            return;
        }

        const chatIds = memberships.map(m => m.chat_id);

        // Step 2: Get the actual chat group details (name, image, etc.)
        const { data: groups } = await supabase
            .from('chat_groups')
            .select('*')
            .in('id', chatIds)
            .order('created_at', { ascending: false });

        if (!groups) {
            setLoading(false);
            return;
        }

        // Step 3: For each group, fetch the last message and member count in parallel.
        // This gives us the preview text and member badge for the sidebar list.
        const previews: ChatPreviewData[] = await Promise.all(
            groups.map(async (group: ChatGroupRow) => {
                // Get the most recent message for the preview text
                const { data: lastMsg } = await supabase
                    .from('chat_messages')
                    .select('content, created_at')
                    .eq('chat_id', group.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Get the member count using Supabase's count feature (no data transfer, just the count)
                const { count } = await supabase
                    .from('chat_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('chat_id', group.id);

                return {
                    id: group.id,
                    name: group.name,
                    image: group.image,
                    lastMessage: lastMsg?.content || 'No messages yet',
                    lastMessageTime: lastMsg?.created_at || group.created_at,
                    memberCount: count || 0,
                };
            })
        );

        setChatGroups(previews);
        setLoading(false);
        } catch (err) {
            console.error('Chat load error:', err);
            setError('Could not load chats. Please try again.');
            setLoading(false);
        }
    }, [user.id]);

    // Load all messages for a specific chat, ordered chronologically.
    // Maps the snake_case database columns to our camelCase ChatMessage type.
    const loadMessages = useCallback(async (chatId: string) => {
        const { data, error: msgErr } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (msgErr) {
            console.error('Messages load error:', msgErr);
            return;
        }

        if (data) {
            setMessages(data.map(m => ({
                id: m.id,
                chatId: m.chat_id,
                senderId: m.sender_id,
                senderName: m.sender_name,
                senderAvatar: m.sender_avatar,
                content: m.content,
                createdAt: m.created_at,
                isAi: m.is_ai,
            })));
        }
    }, []);

    // Initial load — fetch chat groups when the component mounts
    useEffect(() => {
        loadChatGroups();
    }, [loadChatGroups]);

    // When the user selects a different chat, load its messages and focus the input
    useEffect(() => {
        if (selectedChatId) {
            loadMessages(selectedChatId);
            inputRef.current?.focus();
        }
    }, [selectedChatId, loadMessages]);

    // Auto-scroll to the bottom whenever the messages array changes (new message received/sent)
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Supabase Realtime subscription — this is the magic that makes chat feel instant.
    // We subscribe to INSERT events on the chat_messages table, filtered to our selected chat.
    // When another user sends a message, Supabase pushes it to us via WebSocket and we add
    // it to the local state. We also check for duplicates because our optimistic updates
    // might have already added the message before the server confirms it.
    useEffect(() => {
        if (!selectedChatId) return;

        const channel = supabase
            .channel(`chat-${selectedChatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `chat_id=eq.${selectedChatId}`,
            }, (payload) => {
                // Map the incoming row to our ChatMessage type
                const m = payload.new as Record<string, unknown>;
                const newMsg: ChatMessage = {
                    id: m.id as string,
                    chatId: m.chat_id as string,
                    senderId: m.sender_id as string,
                    senderName: m.sender_name as string,
                    senderAvatar: m.sender_avatar as string,
                    content: m.content as string,
                    createdAt: m.created_at as string,
                    isAi: m.is_ai as boolean,
                };
                setMessages(prev => {
                    // Dedup check — if we already have this message (from optimistic update), skip it
                    if (prev.some(msg => msg.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            })
            .subscribe();

        // Cleanup: unsubscribe when we leave the chat or select a different one
        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedChatId]);

    // Send a message with optimistic update.
    // The idea: we immediately add the message to local state so it appears instantly,
    // then insert it into the database in the background. This makes the chat feel snappy
    // even on slow connections. The dedup check in the realtime subscription above prevents
    // the message from showing up twice when the server confirms it.
    const handleSend = async () => {
        if (!newMessage.trim() || !selectedChatId || sending) return;

        setSending(true);
        const content = newMessage.trim();
        const tempId = crypto.randomUUID();
        setNewMessage('');  // Clear the input right away for a snappy feel

        // Optimistically add the message to local state so it shows up immediately
        const optimisticMsg: ChatMessage = {
            id: tempId,
            chatId: selectedChatId,
            senderId: user.id,
            senderName: user.name,
            senderAvatar: user.avatar,
            content,
            createdAt: new Date().toISOString(),
            isAi: false,
        };
        setMessages(prev => [...prev, optimisticMsg]);

        // Actually persist the message to Supabase in the background
        await supabase.from('chat_messages').insert({
            id: tempId,
            chat_id: selectedChatId,
            sender_id: user.id,
            sender_name: user.name,
            sender_avatar: user.avatar,
            content,
            is_ai: false,
        });

        setSending(false);
        inputRef.current?.focus();
    };

    // Send on Enter key (but not Shift+Enter, which should create a new line in multi-line inputs)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Smart time formatting — shows "HH:MM" for today, "Yesterday" for yesterday,
    // and "Mon DD" for older messages. Keeps the UI clean without showing full timestamps.
    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Find the currently selected group's details for the chat header
    const selectedGroup = chatGroups.find(g => g.id === selectedChatId);

    // ---- RENDER ----

    // Loading spinner while fetching chat groups from Supabase
    if (loading) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="text-center text-slate-400">
                    <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm">Loading chats...</p>
                </div>
            </div>
        );
    }

    // Error state with a retry button — shown when Supabase queries fail
    if (error) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="text-center">
                    <MessageCircle size={48} className="text-red-300 mx-auto mb-3" />
                    <p className="text-sm text-red-500 mb-3">{error}</p>
                    <button
                        onClick={() => { setError(null); setLoading(true); loadChatGroups(); }}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mx-4 my-4">
            {/* Left Panel: Chat List — shows all groups the user belongs to.
                On mobile, this panel is hidden when a chat is selected (we show messages instead).
                On desktop (md+), both panels are always visible side by side. */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col",
                selectedChatId ? "hidden md:flex" : "flex"
            )}>
                {/* Chat list header with count */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <h1 className="text-xl font-bold dark:text-white">{t.chat}</h1>
                    <p className="text-xs text-slate-400 mt-1">{chatGroups.length} trip group{chatGroups.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Chat group list — or an empty state if the user hasn't joined any chats yet */}
                {chatGroups.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            <MessageCircle size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-sm font-medium dark:text-slate-400">No chats yet</p>
                            <p className="text-xs text-slate-400 mt-1">Book a trip to join a group chat!</p>
                        </div>
                    </div>
                ) : (
                    <div role="list" aria-label="Chat groups" className="flex-1 overflow-y-auto">
                        {chatGroups.map(group => (
                            <button
                                role="listitem"
                                key={group.id}
                                onClick={() => setSelectedChatId(group.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 dark:border-slate-800/50",
                                    selectedChatId === group.id
                                        ? "bg-emerald-50 dark:bg-emerald-900/20"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                )}
                            >
                                {/* Group avatar image */}
                                <img
                                    src={group.image || 'https://images.unsplash.com/photo-1682687982501-1e58ab814717?w=100&h=100&fit=crop'}
                                    alt={group.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-semibold text-sm dark:text-white truncate">{group.name}</h3>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{formatTime(group.lastMessageTime)}</span>
                                    </div>
                                    {/* Last message preview — truncated with CSS ellipsis */}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{group.lastMessage}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Users size={10} className="text-slate-400" />
                                        <span className="text-[10px] text-slate-400">{group.memberCount} members</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Panel: Messages — shows the conversation for the selected chat.
                On mobile, this takes over the full width when a chat is selected.
                On desktop, it's always visible (shows a placeholder if no chat is selected). */}
            <div className={cn(
                "flex-1 flex flex-col",
                !selectedChatId ? "hidden md:flex" : "flex"
            )}>
                {/* Placeholder when no chat is selected (desktop only) */}
                {!selectedChatId ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageCircle size={64} className="text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-400 text-sm">Select a chat to start messaging</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header — shows group name, image, member count.
                            On mobile, there's a back arrow to return to the chat list. */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            {/* Back button — only visible on mobile to go back to chat list */}
                            <button
                                onClick={() => setSelectedChatId(null)}
                                aria-label="Back to chat list"
                                className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                            </button>
                            <img
                                src={selectedGroup?.image || 'https://images.unsplash.com/photo-1682687982501-1e58ab814717?w=100&h=100&fit=crop'}
                                alt={selectedGroup?.name || ''}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                                <h2 className="font-semibold text-sm dark:text-white">{selectedGroup?.name}</h2>
                                <p className="text-[11px] text-slate-400">{selectedGroup?.memberCount} members</p>
                            </div>
                        </div>

                        {/* Messages Area — scrollable container for all messages.
                            Messages are aligned differently based on who sent them:
                            - Your messages: right-aligned with green bubble
                            - Other users: left-aligned with white bubble + avatar
                            - AI messages: centered with a gradient border and sparkle icon */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
                            {messages.map(msg => (
                                <div key={msg.id} className={cn(
                                    "flex gap-2 max-w-[85%]",
                                    msg.isAi ? "mx-auto max-w-[90%]" : msg.senderId === user.id ? "ml-auto flex-row-reverse" : ""
                                )}>
                                    {/* AI message — special styling with gradient background and sparkle icon */}
                                    {msg.isAi ? (
                                        <div className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles size={16} className="text-emerald-600" />
                                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">SafarGo AI</span>
                                            </div>
                                            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">{msg.content}</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Avatar — only shown for messages from other users, not your own */}
                                            {msg.senderId !== user.id && (
                                                <img
                                                    src={msg.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=10b981&color=fff&size=32`}
                                                    alt={msg.senderName}
                                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
                                                />
                                            )}
                                            <div>
                                                {/* Sender name label — only for other users' messages */}
                                                {msg.senderId !== user.id && (
                                                    <p className="text-[11px] text-slate-400 mb-1 ml-1">{msg.senderName}</p>
                                                )}
                                                {/* Message bubble — green for your messages, white for others.
                                                    The rounded corners are slightly different on the "tail" side. */}
                                                <div className={cn(
                                                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                                                    msg.senderId === user.id
                                                        ? "bg-emerald-600 text-white rounded-br-md"
                                                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-md"
                                                )}>
                                                    {msg.content}
                                                </div>
                                                {/* Timestamp below each message */}
                                                <p className={cn(
                                                    "text-[10px] text-slate-400 mt-1",
                                                    msg.senderId === user.id ? "text-right mr-1" : "ml-1"
                                                )}>
                                                    {formatTime(msg.createdAt)}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {/* Invisible anchor element for auto-scrolling to the bottom */}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input Bar — fixed at the bottom of the chat panel */}
                        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                    aria-label="Type a message"
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-sm text-slate-900 dark:text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                                {/* Send button — disabled when input is empty or a message is being sent */}
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || sending}
                                    aria-label="Send message"
                                    className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
