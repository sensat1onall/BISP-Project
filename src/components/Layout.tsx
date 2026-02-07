import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, MessageCircle, User, Map, PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { cn } from '../lib/cn';

export const Layout = () => {
    const { user, language } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const t = translations[language].nav;

    const isActive = (path: string) => location.pathname === path;

    // Navigation Items Logic
    const renderNavItems = () => {
        const baseClass = "flex flex-col items-center justify-center p-2 w-full transition-colors duration-200";
        const activeClass = "text-emerald-600 dark:text-emerald-500 scale-105";
        const inactiveClass = "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200";

        const Item = ({ path, icon: Icon, label }: { path: string, icon: React.ElementType, label: string }) => (
            <button
                onClick={() => navigate(path)}
                className={cn(baseClass, isActive(path) ? activeClass : inactiveClass)}
            >
                <Icon size={24} strokeWidth={isActive(path) ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-1">{label}</span>
            </button>
        );

        if (user.role === 'traveler') {
            return (
                <>
                    <Item path="/" icon={Compass} label={t.explore} />
                    <Item path="/chat" icon={MessageCircle} label={t.chat} />
                    <Item path="/my-trips" icon={Map} label={t.myTrips} />
                    <Item path="/profile" icon={User} label={t.profile} />
                </>
            );
        } else {
            // Guide Role
            return (
                <>
                    <Item path="/" icon={Compass} label={t.explore} />
                    <Item path="/chat" icon={MessageCircle} label={t.chat} />
                    {/* Floating Add Button */}
                    <div className="relative -top-5">
                        <button
                            onClick={() => navigate('/create')}
                            className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            <PlusCircle size={28} />
                        </button>
                    </div>
                    <Item path="/profile" icon={User} label={t.profile} />
                </>
            );
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Main Content Area - Scrollable */}
            <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-lg z-50 pb-safe">
                <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                    {renderNavItems()}
                </div>
            </nav>
        </div>
    );
};
