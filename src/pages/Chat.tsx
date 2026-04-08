import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { Search, MoreVertical, CheckCheck } from 'lucide-react';

const MOCK_CHATS = [
    {
        id: 'c1',
        name: 'Chimgan Group',
        lastMessage: 'Let\'s meet at 8 AM near the parking lot.',
        time: '10:30 AM',
        unread: 2,
        avatar: 'https://images.unsplash.com/photo-1682687982501-1e58ab814717?w=200&h=200&fit=crop',
        isGroup: true
    },
    {
        id: 'c2',
        name: 'Jahongir Guide',
        lastMessage: 'Yes, hiking boots are recommended for this trail.',
        time: 'Yesterday',
        unread: 0,
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop',
        isGroup: false,
        online: true
    }
];

export const Chat = () => {
    const { language } = useApp();
    const t = translations[language].nav;

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                <h1 className="text-2xl font-bold dark:text-white">{t.chat}</h1>
                <div className="flex gap-2">
                    <button aria-label="Search conversations" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Search size={20} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <button aria-label="More options" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <MoreVertical size={20} className="text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div role="list" aria-label="Conversations" className="flex-1 overflow-y-auto">
                {MOCK_CHATS.map(chat => (
                    <div role="listitem" key={chat.id} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800/50 relative">
                        <div className="relative">
                            <img
                                src={chat.avatar}
                                alt={chat.name}
                                className={`w-14 h-14 rounded-full object-cover ${chat.isGroup ? 'border-2 border-indigo-500 p-0.5' : ''}`}
                            />
                            {chat.online && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white truncate pr-2">{chat.name}</h3>
                                <span className="text-xs text-slate-400 whitespace-nowrap">{chat.time}</span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                {!chat.unread && <CheckCheck size={14} className="text-emerald-500" />}
                                {chat.lastMessage}
                            </p>
                        </div>

                        {chat.unread > 0 && (
                            <div className="min-w-[20px] h-5 bg-emerald-500 rounded-full flex items-center justify-center px-1.5">
                                <span className="text-[10px] font-bold text-white">{chat.unread}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
