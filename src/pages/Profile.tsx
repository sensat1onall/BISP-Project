// =============================================================================
// Profile.tsx — The user profile and account management page for SafarGo.
// This is a pretty packed page that handles: user profile display and editing,
// wallet management (deposit/withdraw via HUMO and UZCARD — Uzbekistan's local
// payment cards), transaction history, guide application form, role switching
// between traveler and guide modes, avatar upload, settings modal (theme and
// language), and logout. The wallet system is in demo mode — no real charges.
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { formatCurrency } from '../utils/format';
import { Theme, Language } from '../types';
import { ArrowUpRight } from 'lucide-react';
import {
    Settings, CreditCard, ChevronRight, LogOut, CheckCircle2,
    Globe, Moon, Sun, Monitor, ShieldCheck, Map, CheckCheck,
    Edit3, X, Save, Clock, XCircle, Loader2, Camera
} from 'lucide-react';
import { cn } from '../lib/cn';
import { MetalButton } from '../components/ui/liquid-glass-button';

export const Profile = () => {
    const { user, language, theme, setTheme, setLanguage, switchToTraveler, switchToGuide, guideApplicationStatus, submitGuideApplication, withdrawFunds, logout, updateUser, bookings, trips, refreshProfile } = useApp();

    // Refresh the user profile from the database when this page loads.
    // This catches any changes made by admins (like role changes, bans, etc.)
    // that happened while the user was on other pages.
    useEffect(() => {
        refreshProfile();
    }, []);
    const t = translations[language].profile;
    const commonT = translations[language].common;
    void translations[language].wallet;

    // -- UI state for various modals and editing modes --
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);      // Settings modal (theme + language)
    const [isEditing, setIsEditing] = useState(false);                // Name editing mode
    const [editName, setEditName] = useState(user.name);              // Temp name value while editing

    // Guide application form state
    const [showGuideForm, setShowGuideForm] = useState(false);
    const [guideForm, setGuideForm] = useState({ fullName: '', surname: '', age: '', gender: '', experience: '' });
    const [isSubmittingApp, setIsSubmittingApp] = useState(false);
    const [appError, setAppError] = useState('');

    // Hidden file input ref for avatar upload
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // -- Payment/wallet state --
    // These control the deposit and withdrawal modals and their forms.
    // Both HUMO and UZCARD are Uzbekistan's local debit card systems.
    const [showDeposit, setShowDeposit] = useState(false);            // Deposit modal visibility
    const [showWithdrawModal, setShowWithdrawModal] = useState(false); // Withdrawal modal visibility
    const [paymentMethod, setPaymentMethod] = useState<'humo' | 'uzcard'>('humo');  // Selected card type
    const [cardNumber, setCardNumber] = useState('');                  // Card number input
    const [cardExpiry, setCardExpiry] = useState('');                  // Expiry date input
    const [depositAmount, setDepositAmount] = useState('');            // How much to deposit
    const [paymentProcessing, setPaymentProcessing] = useState(false); // Shows loading spinner during "processing"
    const [paymentSuccess, setPaymentSuccess] = useState(false);       // Shows success animation after payment

    // Format card number with spaces every 4 digits (e.g., "9860 1234 5678 9012")
    // and cap at 16 digits total. This is just for display — makes it easier to read.
    const formatCardNumber = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    // Format expiry date as MM/YY — auto-inserts the slash after 2 digits
    const formatExpiry = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 4);
        if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
        return digits;
    };

    // Handle deposit — this is DEMO MODE, so we just simulate a 2-second "processing" delay
    // and then add the amount to the user's wallet balance. No real API calls happen.
    const handleDeposit = async () => {
        if (!cardNumber || !cardExpiry || !depositAmount) return;
        setPaymentProcessing(true);
        // Simulate payment processing (demo mode)
        await new Promise(r => setTimeout(r, 2000));
        const amount = Number(depositAmount);
        if (amount > 0) {
            updateUser({ walletBalance: user.walletBalance + amount });
        }
        setPaymentProcessing(false);
        setPaymentSuccess(true);
        // Auto-close the modal after showing the success animation
        setTimeout(() => {
            setShowDeposit(false);
            setPaymentSuccess(false);
            setCardNumber('');
            setCardExpiry('');
            setDepositAmount('');
        }, 1500);
    };

    // Handle withdrawal — similar demo flow. Withdraws the entire wallet balance
    // to the specified card. Again, no real money moves in demo mode.
    const handleWithdrawToCard = async () => {
        if (!cardNumber || !cardExpiry || user.walletBalance === 0) return;
        setPaymentProcessing(true);
        await new Promise(r => setTimeout(r, 2000));
        withdrawFunds();
        setPaymentProcessing(false);
        setPaymentSuccess(true);
        setTimeout(() => {
            setShowWithdrawModal(false);
            setPaymentSuccess(false);
            setCardNumber('');
            setCardExpiry('');
        }, 1500);
    };

    // Avatar upload — reads the selected image file as a base64 data URL
    // and saves it to the user's profile. The image is stored directly in state.
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            updateUser({ avatar: base64 });
        };
        reader.readAsDataURL(file);
    };



    // Save the edited profile name — trims whitespace and updates the user object
    const handleSaveProfile = () => {
        if (editName.trim()) {
            updateUser({ name: editName.trim() });
            setIsEditing(false);
        }
    };

    // Simple logout handler
    const handleLogout = () => {
        logout();
    };

    return (
        <div className="py-8 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Two-column layout: profile card on the left, wallet + actions on the right */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile Card + Stats */}
                    <div className="space-y-6">
                        {/* Profile Card — shows avatar, name, role badge, and member-since date.
                            The header gradient changes color based on role (blue for guides, green for travelers).
                            Clicking the avatar opens a file picker for uploading a new photo. */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Color-coded header banner — blue for guides, green for travelers */}
                            <div className={`h-28 relative ${user.role === 'guide' ? 'bg-gradient-to-r from-blue-600 to-indigo-500' : 'bg-gradient-to-r from-emerald-600 to-teal-500'}`}>
                                {user.role === 'guide' && (
                                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-white">
                                        GUIDE
                                    </div>
                                )}
                            </div>
                            <div className="px-6 pb-6 -mt-12">
                                {/* Avatar with camera overlay on hover — clicking opens file picker */}
                                <div className="flex items-end justify-between mb-3">
                                    <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                        <img
                                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff&size=80`}
                                            alt={user.name}
                                            className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-md object-cover"
                                        />
                                        {/* Camera icon overlay — appears on hover */}
                                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera size={20} className="text-white" />
                                        </div>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                        />
                                    </div>
                                    {/* Verified badge — shown if the user's account is verified */}
                                    {user.isVerified && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 mb-1">
                                            <ShieldCheck size={12} className="mr-1" />
                                            {t.verified}
                                        </span>
                                    )}
                                </div>

                                {/* Name display — toggles between view mode and edit mode.
                                    In edit mode, shows an input field with Save/Cancel buttons. */}
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-lg font-bold dark:text-white"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleSaveProfile} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm">
                                                <Save size={14} /> Save
                                            </button>
                                            <button onClick={() => { setIsEditing(false); setEditName(user.name); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm">
                                                <X size={14} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-bold dark:text-white">{user.name}</h1>
                                        <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-emerald-500 transition-colors">
                                            <Edit3 size={14} />
                                        </button>
                                    </div>
                                )}
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    {user.role === 'guide' ? 'Adventure Guide' : 'Travel Enthusiast'} &middot; Since {new Date(user.memberSince).getFullYear()}
                                </p>
                            </div>
                        </div>

                        {/* Stats Cards — completed trips count and average rating */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                                    <CheckCircle2 size={16} />
                                    <span className="text-xs font-medium uppercase">{t.completed}</span>
                                </div>
                                <p className="text-2xl font-bold dark:text-white">{user.completedTrips}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                                    <Map size={16} />
                                    <span className="text-xs font-medium uppercase">Rating</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-2xl font-bold dark:text-white">{user.rating}</p>
                                    <span className="text-sm text-slate-400">/ 5.0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Wallet, Transactions, Menu — takes up 2/3 on large screens */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Wallet Card — dark background with a big balance display.
                            Has Deposit and Withdraw buttons that open their respective modals.
                            The decorative blurred green circle in the background is purely aesthetic. */}
                        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                            <div className="relative z-10 flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium mb-1">{t.wallet}</p>
                                    <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(user.walletBalance)}</h2>
                                </div>
                                <CreditCard className="text-emerald-400" size={32} />
                            </div>
                            <div className="flex gap-3">
                                <MetalButton variant="primary" onClick={() => setShowDeposit(true)} className="flex-1">
                                    Deposit
                                </MetalButton>
                                <MetalButton variant="success" onClick={() => setShowWithdrawModal(true)} disabled={user.walletBalance === 0} className="flex-1">
                                    {t.withdraw}
                                </MetalButton>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 text-center">Demo mode — HUMO & UZCARD payments simulated</p>
                        </div>

                        {/* Transaction History — shows the last 10 bookings as transaction records.
                            Each entry shows the trip name, date, and amount deducted. */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="font-semibold dark:text-white text-sm mb-3">Recent Transactions</h3>
                            {bookings.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {bookings.slice(0, 10).map(b => {
                                        const trip = trips.find(t => t.id === b.tripId);
                                        return (
                                            <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                        <ArrowUpRight size={12} className="text-red-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium dark:text-white truncate max-w-[150px]">{trip?.title || 'Trip booking'}</p>
                                                        <p className="text-[10px] text-slate-400">{new Date(b.bookedAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-red-500">-{trip ? formatCurrency(trip.price) : '—'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400">No transactions yet. Book a trip to see your history.</p>
                            )}
                        </div>

                        {/* Action Menu — role switching, settings, and logout.
                            The role section changes based on the current guide application status:
                            - Guide users: can switch back to traveler mode
                            - Approved applicants: can switch to guide mode
                            - Pending: shows "waiting for review" status
                            - Rejected: can re-apply
                            - No application: shows "Apply to Become a Guide" button */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Guide Role Section — different UI for each application status */}
                            {user.role === 'guide' ? (
                                // Already a guide — show option to switch back to traveler mode
                                <button
                                    onClick={switchToTraveler}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                            <LogOut size={18} />
                                        </div>
                                        <span className="font-medium dark:text-white text-sm">{t.travelerMode}</span>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-400" />
                                </button>
                            ) : guideApplicationStatus === 'approved' ? (
                                // Application approved — they can now switch to guide mode
                                <button
                                    onClick={switchToGuide}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <span className="font-medium dark:text-white text-sm">Switch to Guide Mode</span>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-400" />
                                </button>
                            ) : guideApplicationStatus === 'pending' ? (
                                // Application pending — just a status indicator, no action available
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <span className="font-medium dark:text-white text-sm block">Guide Application Pending</span>
                                            <span className="text-xs text-slate-400">Waiting for admin review</span>
                                        </div>
                                    </div>
                                </div>
                            ) : guideApplicationStatus === 'rejected' ? (
                                // Application rejected — they can try again
                                <button
                                    onClick={() => setShowGuideForm(true)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                                            <XCircle size={18} />
                                        </div>
                                        <div>
                                            <span className="font-medium dark:text-white text-sm block">Application Rejected</span>
                                            <span className="text-xs text-slate-400">Tap to re-apply</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-400" />
                                </button>
                            ) : (
                                // No application yet — show the "Apply to Become a Guide" button
                                <button
                                    onClick={() => setShowGuideForm(true)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <span className="font-medium dark:text-white text-sm">Apply to Become a Guide</span>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-400" />
                                </button>
                            )}

                            {/* Settings button — opens the theme/language modal */}
                            <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                                        <Settings size={18} />
                                    </div>
                                    <span className="font-medium dark:text-white text-sm">{t.settings}</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </button>

                            {/* Logout button — styled in red to indicate it's a destructive action */}
                            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                                        <LogOut size={18} />
                                    </div>
                                    <span className="font-medium text-red-600 dark:text-red-400 text-sm">{translations[language].auth.logout}</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Modal — allows changing the app theme (light/dark/system) and language (EN/RU/UZ) */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                        <h2 className="text-xl font-bold mb-6 dark:text-white">{t.settings}</h2>
                        <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={20} />
                        </button>

                        <div className="space-y-6">
                            {/* Theme selector — three options with icons */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">{t.theme}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['light', 'dark', 'system'].map((tMode) => (
                                        <button
                                            key={tMode}
                                            onClick={() => setTheme(tMode as Theme)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                                                theme === tMode
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            {tMode === 'light' && <Sun size={20} className="mb-1" />}
                                            {tMode === 'dark' && <Moon size={20} className="mb-1" />}
                                            {tMode === 'system' && <Monitor size={20} className="mb-1" />}
                                            <span className="text-xs capitalize">{tMode}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Language selector — supports English, Russian, and Uzbek */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">{t.language}</label>
                                <div className="space-y-2">
                                    {[
                                        { code: 'en', name: 'English' },
                                        { code: 'ru', name: 'Русский' },
                                        { code: 'uz', name: "O'zbekcha" }
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setLanguage(lang.code as Language)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                                                language === lang.code
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Globe size={18} />
                                                <span>{lang.name}</span>
                                            </div>
                                            {language === lang.code && <CheckCheck size={18} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <MetalButton variant="primary" onClick={() => setIsSettingsOpen(false)} className="w-full">
                                {commonT.confirm}
                            </MetalButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Guide Application Modal */}
            {/* Deposit Modal — lets users add funds to their wallet via HUMO or UZCARD.
                In demo mode, this just simulates a 2-second processing delay and adds the amount.
                Shows a success animation with checkmark after "payment" completes. */}
            {showDeposit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        <button onClick={() => { setShowDeposit(false); setPaymentSuccess(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>

                        {/* Payment success state — shown after processing completes */}
                        {paymentSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCheck size={32} className="text-emerald-600" />
                                </div>
                                <p className="text-lg font-bold dark:text-white">Deposit Successful!</p>
                                <p className="text-sm text-slate-400 mt-1">Funds added to your wallet</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold dark:text-white mb-1">Deposit Funds</h2>
                                <p className="text-xs text-slate-400 mb-5">Demo mode — no real charges will be made</p>

                                {/* Payment Method Selector — toggle between HUMO and UZCARD.
                                    HUMO cards start with 9860, UZCARD starts with 8600. */}
                                <div className="flex gap-2 mb-5">
                                    <button
                                        onClick={() => setPaymentMethod('humo')}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'humo' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <p className="text-sm font-bold text-blue-600">HUMO</p>
                                        <p className="text-[10px] text-slate-400">Uzbekistan</p>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('uzcard')}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'uzcard' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <p className="text-sm font-bold text-green-600">UZCARD</p>
                                        <p className="text-[10px] text-slate-400">Uzbekistan</p>
                                    </button>
                                </div>

                                {/* Card details form — card number, expiry, and amount */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Card Number</label>
                                        <input
                                            value={cardNumber}
                                            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                            placeholder={paymentMethod === 'humo' ? '9860 •••• •••• ••••' : '8600 •••• •••• ••••'}
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono tracking-wider"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Expiry Date</label>
                                            <input
                                                value={cardExpiry}
                                                onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                                                placeholder="MM/YY"
                                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Amount (UZS)</label>
                                            <input
                                                type="number"
                                                value={depositAmount}
                                                onChange={e => setDepositAmount(e.target.value)}
                                                placeholder="500000"
                                                min={1000}
                                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                    </div>

                                    <MetalButton
                                        variant="primary"
                                        onClick={handleDeposit}
                                        disabled={paymentProcessing || !cardNumber || !cardExpiry || !depositAmount}
                                        className="w-full"
                                    >
                                        {paymentProcessing ? <><Loader2 size={16} className="animate-spin mr-2" /> Processing...</> : `Deposit via ${paymentMethod.toUpperCase()}`}
                                    </MetalButton>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Withdraw Modal — lets users withdraw their entire wallet balance to a card.
                Same demo flow as deposit — simulated processing with a success animation. */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        <button onClick={() => { setShowWithdrawModal(false); setPaymentSuccess(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>

                        {paymentSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCheck size={32} className="text-emerald-600" />
                                </div>
                                <p className="text-lg font-bold dark:text-white">Withdrawal Successful!</p>
                                <p className="text-sm text-slate-400 mt-1">{formatCurrency(user.walletBalance)} sent to your card</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold dark:text-white mb-1">Withdraw to Card</h2>
                                <p className="text-xs text-slate-400 mb-2">Demo mode — no real transfer will be made</p>
                                <p className="text-sm font-semibold text-emerald-600 mb-5">Available: {formatCurrency(user.walletBalance)}</p>

                                {/* Payment Method Selector — same HUMO/UZCARD toggle as deposit */}
                                <div className="flex gap-2 mb-5">
                                    <button
                                        onClick={() => setPaymentMethod('humo')}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'humo' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <p className="text-sm font-bold text-blue-600">HUMO</p>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('uzcard')}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all ${paymentMethod === 'uzcard' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <p className="text-sm font-bold text-green-600">UZCARD</p>
                                    </button>
                                </div>

                                {/* Card details for withdrawal */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Card Number</label>
                                        <input
                                            value={cardNumber}
                                            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                            placeholder={paymentMethod === 'humo' ? '9860 •••• •••• ••••' : '8600 •••• •••• ••••'}
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono tracking-wider"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Expiry Date</label>
                                        <input
                                            value={cardExpiry}
                                            onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                                            placeholder="MM/YY"
                                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                                        />
                                    </div>

                                    <MetalButton
                                        variant="success"
                                        onClick={handleWithdrawToCard}
                                        disabled={paymentProcessing || !cardNumber || !cardExpiry || user.walletBalance === 0}
                                        className="w-full"
                                    >
                                        {paymentProcessing ? <><Loader2 size={16} className="animate-spin mr-2" /> Processing...</> : `Withdraw ${formatCurrency(user.walletBalance)}`}
                                    </MetalButton>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Guide Application Form Modal — collects personal info (name, surname, age, gender)
                and a description of their guiding experience. Submitted to the admin for review.
                The admin can approve or reject from the admin panel. */}
            {showGuideForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowGuideForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold dark:text-white mb-1">Apply to Become a Guide</h2>
                        <p className="text-xs text-slate-400 mb-5">Fill in your details. An admin will review your application.</p>

                        {/* Error message if submission fails */}
                        {appError && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-300 mb-4">
                                {appError}
                            </div>
                        )}

                        {/* Application form — submits to the backend via submitGuideApplication */}
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setAppError('');
                            setIsSubmittingApp(true);
                            const success = await submitGuideApplication({
                                fullName: guideForm.fullName,
                                surname: guideForm.surname,
                                age: Number(guideForm.age),
                                gender: guideForm.gender,
                                experience: guideForm.experience,
                            });
                            setIsSubmittingApp(false);
                            if (success) {
                                setShowGuideForm(false);
                            } else {
                                setAppError('Failed to submit application. Please try again.');
                            }
                        }} className="space-y-4">
                            {/* First name and surname — as shown on official ID */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">First Name (as in ID)</label>
                                    <input
                                        required
                                        value={guideForm.fullName}
                                        onChange={e => setGuideForm(p => ({ ...p, fullName: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="Name..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Surname (as in ID)</label>
                                    <input
                                        required
                                        value={guideForm.surname}
                                        onChange={e => setGuideForm(p => ({ ...p, surname: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="Surname..."
                                    />
                                </div>
                            </div>

                            {/* Age and gender — age must be 18-70 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Age</label>
                                    <input
                                        required
                                        type="number"
                                        min={18}
                                        max={70}
                                        value={guideForm.age}
                                        onChange={e => setGuideForm(p => ({ ...p, age: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="25"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Gender</label>
                                    <select
                                        required
                                        value={guideForm.gender}
                                        onChange={e => setGuideForm(p => ({ ...p, gender: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    >
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                            </div>

                            {/* Experience textarea — the most important field for the admin to review */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Guiding Experience</label>
                                <textarea
                                    required
                                    value={guideForm.experience}
                                    onChange={e => setGuideForm(p => ({ ...p, experience: e.target.value }))}
                                    rows={4}
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                    placeholder="Describe your experience with outdoor activities, trips, or group management..."
                                />
                            </div>

                            <MetalButton variant="primary" type="submit" disabled={isSubmittingApp} className="w-full">
                                {isSubmittingApp ? <><Loader2 size={16} className="animate-spin mr-2" /> Submitting...</> : 'Submit Application'}
                            </MetalButton>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
