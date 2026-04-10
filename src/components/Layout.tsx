/**
 * Layout.tsx - The app shell that wraps every authenticated page.
 *
 * This is the main layout component that provides the consistent structure
 * across all pages: top navbar, main content area, and footer. It uses
 * React Router's <Outlet /> to render the current page inside the content area.
 *
 * Structure:
 *   [Skip to content link] - Hidden accessibility link for keyboard users
 *   [Animated Background]  - The Boxes component that creates floating colored boxes
 *   [Top Navbar]           - Logo, navigation links, theme toggle, notifications, user menu
 *   [Main Content]         - <Outlet /> renders the current route's page here
 *   [Footer]               - Simple branding and copyright
 *
 * The navbar has role-based features:
 *   - All users: Explore, My Trips, Chat links + theme toggle + notifications + user menu
 *   - Guides only: "Create Trip" button (green, with PlusCircle icon)
 *
 * The notification dropdown shows all notifications with unread count badge.
 * When opened, it automatically marks all notifications as read.
 *
 * The user menu dropdown shows the user's name, role, and links to Profile and Logout.
 *
 * Both dropdowns close when clicking outside of them (via a mousedown event listener).
 */
import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, MessageCircle, User, Map, PlusCircle, LogOut, Bell, ChevronDown, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { cn } from '../lib/cn';
import { Boxes } from './ui/background-boxes';

export const Layout = () => {
    const { user, language, logout, theme, setTheme, notifications, markNotificationsRead } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const t = translations[language].nav;

    // Dropdown open/close state
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    // Refs for click-outside detection on the dropdowns
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Helper to check if a nav link is the current page (for active styling)
    const isActive = (path: string) => location.pathname === path;

    // Count unread notifications for the badge number on the bell icon
    const unreadCount = notifications?.filter(n => !n.read).length || 0;

    /**
     * Close dropdowns when clicking outside of them.
     * We listen for mousedown on the entire document and check if the click
     * target is inside either dropdown's ref. If not, close them.
     */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /** Log out and redirect to the login page */
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Main navigation links - shown to all authenticated users
    const navLinks = [
        { path: '/', icon: Compass, label: t.explore },
        { path: '/my-trips', icon: Map, label: t.myTrips },
        { path: '/chat', icon: MessageCircle, label: t.chat },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
            {/* Interactive animated background - floating colored boxes behind all content.
                Fixed position so it stays in place while scrolling. z-0 puts it behind everything. */}
            <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900 z-0">
                <Boxes />
            </div>

            {/* Skip to main content link - An accessibility feature for keyboard/screen reader users.
                It's visually hidden (sr-only) but becomes visible when focused with Tab.
                This lets keyboard users skip the entire navbar and jump straight to the page content. */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg">
                Skip to main content
            </a>

            {/* ================================================================ */}
            {/* TOP NAVBAR - Sticky header with logo, nav links, and user controls */}
            {/* ================================================================ */}
            <header className="sticky top-0 z-50 bg-white dark:bg-slate-800/95 dark:backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
                    {/* Logo - Clicking it goes to the home page */}
                    <button
                        onClick={() => navigate('/')}
                        aria-label="SafarGo home"
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <Compass size={18} className="text-white" />
                        </div>
                        {/* Brand name is hidden on small screens (sm:block) to save space */}
                        <span className="text-lg font-bold dark:text-white hidden sm:block">
                            Safar<span className="text-emerald-600">Go</span>
                        </span>
                    </button>

                    {/* Center Navigation Links - Explore, My Trips, Chat */}
                    <nav aria-label="Main navigation" className="flex items-center gap-1">
                        {navLinks.map(link => (
                            <button
                                key={link.path}
                                onClick={() => navigate(link.path)}
                                // aria-current="page" tells screen readers which link is the current page
                                aria-current={isActive(link.path) ? 'page' : undefined}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    isActive(link.path)
                                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                )}
                            >
                                <link.icon size={18} />
                                {/* Labels are hidden on mobile (md:inline) - only icons show */}
                                <span className="hidden md:inline">{link.label}</span>
                            </button>
                        ))}

                        {/* Create Trip button - Only shown to users with the 'guide' role.
                            Regular travelers and admins don't see this button. */}
                        {user.role === 'guide' && (
                            <button
                                onClick={() => navigate('/create')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors ml-1"
                            >
                                <PlusCircle size={18} />
                                <span className="hidden md:inline">{t.addTrip}</span>
                            </button>
                        )}
                    </nav>

                    {/* Right side: Theme toggle, Notifications, and User Menu */}
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle - Switches between light and dark mode.
                            Shows a Sun icon in dark mode (click to go light) and
                            Moon icon in light mode (click to go dark). */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Notification Bell Dropdown */}
                        <div ref={notifRef} className="relative">
                            <button
                                onClick={() => {
                                    setNotifOpen(!notifOpen);
                                    // Auto-mark notifications as read when opening the dropdown
                                    if (!notifOpen && unreadCount > 0) markNotificationsRead?.();
                                }}
                                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                                aria-expanded={notifOpen}
                                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative"
                            >
                                <Bell size={18} />
                                {/* Red badge with unread count - only shows when there are unread notifications */}
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification dropdown panel - shows list of all notifications */}
                            {notifOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                                    <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-sm font-semibold dark:text-white">Notifications</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications && notifications.length > 0 ? notifications.map(n => (
                                            <div key={n.id} className={cn(
                                                "px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 text-sm",
                                                // Unread notifications get a subtle green background
                                                !n.read && "bg-emerald-50/50 dark:bg-emerald-900/10"
                                            )}>
                                                <p className="dark:text-white">{n.message}</p>
                                                <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        )) : (
                                            <div className="p-6 text-center text-slate-400 text-sm">No notifications yet</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Menu Dropdown - Shows user avatar, name, and actions */}
                        <div ref={userMenuRef} className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                aria-label="User menu"
                                aria-expanded={userMenuOpen}
                                aria-haspopup="true"
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                {/* User avatar with green border ring */}
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500"
                                />
                                {/* Name and chevron hidden on smaller screens */}
                                <span className="text-sm font-medium dark:text-white hidden lg:block">{user.name}</span>
                                <ChevronDown size={14} className="text-slate-400 hidden lg:block" />
                            </button>

                            {/* User menu dropdown content */}
                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                                    {/* User info header */}
                                    <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-sm font-semibold dark:text-white">{user.name}</p>
                                        <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                                    </div>
                                    {/* Menu actions: Profile and Logout */}
                                    <div className="p-1">
                                        <button
                                            onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <User size={16} />
                                            {t.profile}
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <LogOut size={16} />
                                            {translations[language].auth.logout}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ================================================================ */}
            {/* MAIN CONTENT - React Router's Outlet renders the active page here */}
            {/* ================================================================ */}
            <main id="main-content" className="max-w-7xl mx-auto relative z-30">
                <Outlet />
            </main>

            {/* ================================================================ */}
            {/* FOOTER - Simple branding bar at the bottom of every page          */}
            {/* ================================================================ */}
            <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/95 dark:backdrop-blur-sm mt-12 relative z-30">
                <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
                            <Compass size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold dark:text-white">SafarGo</span>
                    </div>
                    <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} SafarGo. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};
