import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { formatCurrency } from '../utils/format';
import { Theme, Language } from '../types';
import { ArrowUpRight } from 'lucide-react';
import {
    Settings, CreditCard, ChevronRight, LogOut, CheckCircle2,
    Globe, Moon, Sun, Monitor, ShieldCheck, Map, CheckCheck,
    Edit3, X, Save, Clock, XCircle, Loader2
} from 'lucide-react';
import { cn } from '../lib/cn';
import { MetalButton } from '../components/ui/liquid-glass-button';

export const Profile = () => {
    const { user, language, theme, setTheme, setLanguage, switchToTraveler, guideApplicationStatus, submitGuideApplication, withdrawFunds, logout, updateUser, bookings, trips } = useApp();
    const t = translations[language].profile;
    const commonT = translations[language].common;
    const walletT = translations[language].wallet;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [showGuideForm, setShowGuideForm] = useState(false);
    const [guideForm, setGuideForm] = useState({ fullName: '', surname: '', age: '', gender: '', experience: '' });
    const [isSubmittingApp, setIsSubmittingApp] = useState(false);

    const handleWithdraw = () => {
        if (window.confirm(walletT.withdrawConfirm)) {
            withdrawFunds();
        }
    };

    const handleSaveProfile = () => {
        if (editName.trim()) {
            updateUser({ name: editName.trim() });
            setIsEditing(false);
        }
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="py-8 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Profile Card */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="h-28 bg-gradient-to-r from-emerald-600 to-teal-500 relative" />
                            <div className="px-6 pb-6 -mt-12">
                                <div className="flex items-end justify-between mb-3">
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-md object-cover"
                                    />
                                    {user.isVerified && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 mb-1">
                                            <ShieldCheck size={12} className="mr-1" />
                                            {t.verified}
                                        </span>
                                    )}
                                </div>

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

                        {/* Stats */}
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

                    {/* Right: Wallet + Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Wallet */}
                        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                            <div className="relative z-10 flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium mb-1">{t.wallet}</p>
                                    <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(user.walletBalance)}</h2>
                                </div>
                                <CreditCard className="text-emerald-400" size={32} />
                            </div>
                            <MetalButton variant="success" onClick={handleWithdraw} disabled={user.walletBalance === 0}>
                                {t.withdraw}
                            </MetalButton>
                        </div>

                        {/* Transaction History */}
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

                        {/* Menu */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Guide Role Section */}
                            {user.role === 'guide' ? (
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
                            ) : guideApplicationStatus === 'pending' ? (
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

                            <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                                        <Settings size={18} />
                                    </div>
                                    <span className="font-medium dark:text-white text-sm">{t.settings}</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </button>

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

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                        <h2 className="text-xl font-bold mb-6 dark:text-white">{t.settings}</h2>
                        <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={20} />
                        </button>

                        <div className="space-y-6">
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
            {showGuideForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowGuideForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold dark:text-white mb-1">Apply to Become a Guide</h2>
                        <p className="text-xs text-slate-400 mb-5">Fill in your details. An admin will review your application.</p>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSubmittingApp(true);
                            const success = await submitGuideApplication({
                                fullName: guideForm.fullName,
                                surname: guideForm.surname,
                                age: Number(guideForm.age),
                                gender: guideForm.gender,
                                experience: guideForm.experience,
                            });
                            setIsSubmittingApp(false);
                            if (success) setShowGuideForm(false);
                        }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">First Name (as in ID)</label>
                                    <input
                                        required
                                        value={guideForm.fullName}
                                        onChange={e => setGuideForm(p => ({ ...p, fullName: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="Aziz"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Surname (as in ID)</label>
                                    <input
                                        required
                                        value={guideForm.surname}
                                        onChange={e => setGuideForm(p => ({ ...p, surname: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="Karimov"
                                    />
                                </div>
                            </div>

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
