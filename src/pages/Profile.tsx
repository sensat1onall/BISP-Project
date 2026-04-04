import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { formatCurrency } from '../utils/format';
import {
    Settings, CreditCard, ChevronRight, LogOut, CheckCircle2,
    Globe, Moon, Sun, Monitor, ShieldCheck, Map, CheckCheck
} from 'lucide-react';
import { cn } from '../lib/cn';
import { MetalButton } from '../components/ui/liquid-glass-button';

export const Profile = () => {
    const { user, language, theme, setTheme, setLanguage, switchRole, withdrawFunds } = useApp();
    const t = translations[language].profile;
    const commonT = translations[language].common;
    const walletT = translations[language].wallet;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleWithdraw = () => {
        if (window.confirm(walletT.withdrawConfirm)) {
            withdrawFunds();
        }
    };

    return (
        <div className="pb-20 bg-slate-50 dark:bg-slate-900 min-h-screen">
            {/* Header / Cover */}
            <div className="h-40 bg-gradient-to-r from-emerald-600 to-teal-500 relative">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* Profile Info */}
            <div className="px-4 -mt-12 relative z-10">
                <div className="flex justify-between items-end mb-4">
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-md object-cover"
                    />
                    <div className="mb-1">
                        {user.isVerified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                <ShieldCheck size={12} className="mr-1" />
                                {t.verified}
                            </span>
                        )}
                    </div>
                </div>

                <h1 className="text-2xl font-bold dark:text-white">{user.name}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                    {user.role === 'guide' ? 'Adventure Guide' : 'Travel Enthusiast'} • Member since {new Date(user.memberSince).getFullYear()}
                </p>

                {/* Wallet Card */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/20 mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16 group-hover:bg-emerald-500/20 transition-all duration-700"></div>

                    <div className="relative z-10 flex justify-between items-start mb-8">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">{t.wallet}</p>
                            <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(user.walletBalance)}</h2>
                        </div>
                        <CreditCard className="text-emerald-400" size={32} />
                    </div>

                    <div className="relative z-10 flex gap-3">
                        <MetalButton
                            variant="success"
                            onClick={handleWithdraw}
                            disabled={user.walletBalance === 0}
                            className="flex-1"
                        >
                            {t.withdraw}
                        </MetalButton>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                            <CheckCircle2 size={18} />
                            <span className="text-xs font-medium uppercase">{t.completed}</span>
                        </div>
                        <p className="text-2xl font-bold dark:text-white">{user.completedTrips}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                            <Map size={18} />
                            <span className="text-xs font-medium uppercase">Rating</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <p className="text-2xl font-bold dark:text-white">{user.rating}</p>
                            <span className="text-sm text-slate-400">/ 5.0</span>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                    <button
                        onClick={switchRole}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                <LogOut size={20} />
                            </div>
                            <span className="font-medium dark:text-white">
                                {user.role === 'guide' ? t.travelerMode : t.guideMode}
                            </span>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                    </button>

                    <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                                <Settings size={20} />
                            </div>
                            <span className="font-medium dark:text-white">{t.settings}</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in slide-in-from-bottom duration-300">
                        <h2 className="text-xl font-bold mb-6 dark:text-white">{t.settings}</h2>
                        <button
                            onClick={() => setIsSettingsOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <span className="sr-only">Close</span>
                            ✕
                        </button>

                        <div className="space-y-6">
                            {/* Theme */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">{t.theme}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['light', 'dark', 'system'].map((tMode) => (
                                        <button
                                            key={tMode}
                                            onClick={() => setTheme(tMode as any)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                                                theme === tMode
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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

                            {/* Language */}
                            <div>
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">{t.language}</label>
                                <div className="space-y-2">
                                    {[
                                        { code: 'en', name: 'English' },
                                        { code: 'ru', name: 'Русский' },
                                        { code: 'uz', name: 'O\'zbekcha' }
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setLanguage(lang.code as any)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                                                language === lang.code
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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

                        <div className="mt-8 flex justify-center">
                            <MetalButton
                                variant="primary"
                                onClick={() => setIsSettingsOpen(false)}
                                className="w-full"
                            >
                                {commonT.confirm}
                            </MetalButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
