/**
 * AdminDashboard.tsx - The control center for platform administrators.
 *
 * This page gives admins a bird's-eye view of the entire SafarGo platform and
 * the power to manage everything. It's structured as a tabbed interface with:
 *
 *   Overview tab: Dashboard stats (total users, revenue, guides, banned users, etc.)
 *                 plus quick-glance lists of recent users and active trips
 *   Users tab:    Full user table with actions to ban/unban, switch roles, and top up wallets
 *   Trips tab:    All trips with archive/restore and permanent delete actions
 *   Guides tab:   Guide-specific view with verify/unverify and ban actions
 *   Applications: Review pending guide applications (approve or reject)
 *
 * The admin dashboard has its own local state for users and stats (fetched directly
 * from Supabase), separate from the global AppContext trips. This is because the
 * admin needs to see ALL users (not just their own profile) and needs the full
 * picture of the platform.
 *
 * Admin powers:
 *   - Ban/unban any user (prevents them from booking trips)
 *   - Switch user roles between traveler and guide
 *   - Top up any user's wallet balance (for testing/support)
 *   - Archive/restore trips (soft delete)
 *   - Permanently delete trips (hard delete with confirmation)
 *   - Verify/unverify guides (trust badge)
 *   - Approve/reject guide applications
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import {
    Users, Map, ShieldCheck, Wallet, LogOut, TrendingUp,
    Eye, UserCheck, Mountain, Loader2, AlertCircle,
    Ban, Archive, ArchiveRestore, Trash2, ShieldOff, ArrowRightLeft, DollarSign, UserX,
    ClipboardCheck, CheckCircle, XCircle, Plus
} from 'lucide-react';
import { GuideApplication } from '../types';

// The five tabs available in the admin dashboard
type Tab = 'overview' | 'users' | 'trips' | 'guides' | 'applications';

export const AdminDashboard = () => {
    // Pull admin actions from global context, plus the current admin user and trips
    const { user, logout, trips, adminBanUser, adminArchiveTrip, adminDeleteTrip, adminVerifyGuide, adminChangeRole, adminApproveApplication, adminRejectApplication } = useApp();
    const navigate = useNavigate();

    // Local type for the admin's view of a user (includes email and other fields
    // that the regular User type might not expose)
    interface AdminUser {
        id: string;
        name: string;
        email: string;
        avatar: string;
        role: string;
        walletBalance: number;
        isVerified: boolean;
        isBanned: boolean;
        guideLevel: number;
        completedTrips: number;
        rating: number;
        memberSince: string;
    }

    // Aggregated stats for the overview dashboard
    interface AdminStats {
        totalUsers: number;
        travelers: number;
        guides: number;
        verifiedGuides: number;
        bannedUsers: number;
        totalBalance: number;    // sum of all user wallet balances
        totalRevenue: number;    // estimated revenue (price * booked seats for all trips)
        archivedTrips: number;
    }

    // Local state for the admin dashboard (separate from global context)
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [applications, setApplications] = useState<GuideApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Tracks which item currently has an action in progress (for loading spinners on buttons)
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Load all admin data on mount
    useEffect(() => {
        loadData();
    }, []);

    /**
     * loadData - Fetches all the data the admin dashboard needs.
     *
     * This pulls:
     * 1. All user profiles (excluding admins - we don't need to manage ourselves)
     * 2. Calculates aggregate stats from the profiles and trips
     * 3. All guide applications (with user info joined in)
     *
     * The stats are calculated client-side from the fetched data rather than
     * using Supabase aggregate queries. This works fine at our scale.
     */
    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch all non-admin user profiles
            const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin');

            // Map raw Supabase rows to our AdminUser shape
            const mappedUsers: AdminUser[] = (profiles || []).map((p: Record<string, unknown>) => ({
                id: p.id as string,
                name: p.name as string,
                email: (p.name as string), // using name as email placeholder since profiles don't store email
                avatar: p.avatar as string || '',
                role: p.role as string || 'traveler',
                walletBalance: Number(p.wallet_balance) || 0,
                isVerified: p.is_verified as boolean || false,
                isBanned: p.is_banned as boolean || false,
                guideLevel: Number(p.guide_level) || 0,
                completedTrips: Number(p.completed_trips) || 0,
                rating: Number(p.rating) || 0,
                memberSince: p.member_since as string || '',
            }));

            setUsers(mappedUsers);

            // Calculate platform-wide stats from the loaded data
            const archivedCount = trips.filter(t => t.isArchived).length;
            const revenue = trips.reduce((sum, t) => sum + (t.price * t.bookedSeats), 0);

            setStats({
                totalUsers: mappedUsers.length,
                travelers: mappedUsers.filter(u => u.role === 'traveler').length,
                guides: mappedUsers.filter(u => u.role === 'guide').length,
                verifiedGuides: mappedUsers.filter(u => u.role === 'guide' && u.isVerified).length,
                bannedUsers: mappedUsers.filter(u => u.isBanned).length,
                totalBalance: mappedUsers.reduce((sum, u) => sum + u.walletBalance, 0),
                totalRevenue: revenue,
                archivedTrips: archivedCount,
            });

            // Load all guide applications with their associated user info
            const { data: apps } = await supabase
                .from('guide_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (apps) {
                // For each application, look up the applicant's name and avatar
                // from the profiles we already fetched
                const mappedApps: GuideApplication[] = await Promise.all(
                    apps.map(async (a: Record<string, unknown>) => {
                        const appUser = (profiles || []).find((p: Record<string, unknown>) => p.id === a.user_id);
                        return {
                            id: a.id as string,
                            userId: a.user_id as string,
                            fullName: a.full_name as string,
                            surname: a.surname as string,
                            age: Number(a.age),
                            gender: a.gender as string,
                            experience: a.experience as string,
                            status: a.status as 'pending' | 'approved' | 'rejected',
                            createdAt: a.created_at as string,
                            reviewedAt: a.reviewed_at as string || undefined,
                            userName: appUser ? (appUser as Record<string, unknown>).name as string : 'Unknown',
                            userAvatar: appUser ? (appUser as Record<string, unknown>).avatar as string : '',
                        };
                    })
                );
                setApplications(mappedApps);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // --- Action handlers ---
    // Each handler wraps the global admin action with local loading state management
    // and also updates the local users array so the table reflects changes immediately.

    /** Ban or unban a user and update the local users list */
    const handleBanUser = async (userId: string, ban: boolean) => {
        setActionLoading(userId);
        await adminBanUser(userId, ban);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: ban } : u));
        setActionLoading(null);
    };

    /** Toggle a user's role between traveler and guide */
    const handleChangeRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'traveler' ? 'guide' : 'traveler';
        setActionLoading(userId);
        await adminChangeRole(userId, newRole as 'traveler' | 'guide');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setActionLoading(null);
    };

    /** Archive or restore a trip */
    const handleArchiveTrip = async (tripId: string, archive: boolean) => {
        setActionLoading(tripId);
        await adminArchiveTrip(tripId, archive);
        setActionLoading(null);
    };

    /** Permanently delete a trip (with browser confirmation dialog) */
    const handleDeleteTrip = async (tripId: string) => {
        if (!window.confirm('Are you sure? This permanently deletes the trip and all its bookings.')) return;
        setActionLoading(tripId);
        await adminDeleteTrip(tripId);
        setActionLoading(null);
    };

    /** Verify or unverify a guide (toggle the trust badge) */
    const handleVerifyGuide = async (userId: string, verify: boolean) => {
        setActionLoading(userId);
        await adminVerifyGuide(userId, verify);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: verify } : u));
        setActionLoading(null);
    };

    /**
     * handleTopUp - Admin can add funds to any user's wallet.
     *
     * Shows a browser prompt for the amount, validates it's a positive number,
     * then updates the balance directly in Supabase. This is useful for testing
     * or for customer support (giving a user a refund/credit).
     */
    const handleTopUp = async (userId: string, currentBalance: number) => {
        const input = window.prompt('Enter amount to add (UZS):', '500000');
        if (!input) return;
        const amount = Number(input);
        if (isNaN(amount) || amount <= 0) return;
        setActionLoading(userId);
        const newBalance = currentBalance + amount;
        await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, walletBalance: newBalance } : u));
        setActionLoading(null);
    };

    /** Log out the admin and redirect to login page */
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Pre-filter users by role for the guides tab
    const guides = users.filter(u => u.role === 'guide');
    const travelers = users.filter(u => u.role === 'traveler');

    // Tab definitions with icons and labels
    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'trips', label: 'Trips', icon: Map },
        { id: 'guides', label: 'Guides', icon: ShieldCheck },
        { id: 'applications', label: 'Applications', icon: ClipboardCheck },
    ];

    // Count pending applications for the badge
    const pendingApps = applications.filter(a => a.status === 'pending');

    /** Approve a guide application, then reload all data to refresh stats */
    const handleApproveApp = async (appId: string, userId: string) => {
        setActionLoading(appId);
        await adminApproveApplication(appId, userId);
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'approved' as const } : a));
        setActionLoading(null);
        // Reload everything because approving changes user roles and stats
        loadData();
    };

    /** Reject a guide application */
    const handleRejectApp = async (appId: string) => {
        setActionLoading(appId);
        await adminRejectApplication(appId);
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' as const } : a));
        setActionLoading(null);
    };

    // Show a full-screen loader while initial data is being fetched
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                    <p className="text-sm text-slate-400">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Top Bar - Shows the admin branding and logout button */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    {/* Red icon to distinguish admin panel from the main app's green branding */}
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                        <ShieldCheck size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold dark:text-white">Admin Panel</h1>
                        <p className="text-xs text-slate-400">Logged in as {user.name}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    aria-label="Log out of admin panel"
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </header>

            <div className="flex">
                {/* Sidebar navigation - Hidden on mobile, shown on desktop (md+) */}
                <nav role="tablist" aria-label="Admin sections" className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-[calc(100vh-73px)] p-4 hidden md:block">
                    <div className="space-y-1">
                        {tabs.map(tab => (
                            <button
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Mobile tab bar - Fixed at the bottom of the screen on small devices */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex z-20">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-400'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area - Renders the active tab's content */}
                <main className="flex-1 p-6 pb-24 md:pb-6">
                    {/* Error banner - shows if data loading failed */}
                    {error && (
                        <div role="alert" className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
                            <AlertCircle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* OVERVIEW TAB - Platform stats at a glance                    */}
                    {/* Shows 8 stat cards in a grid plus recent users and trips     */}
                    {/* ============================================================ */}
                    {activeTab === 'overview' && stats && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold dark:text-white">Dashboard Overview</h2>

                            {/* First row of stats: users, travelers, guides, total balance */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toString()} color="blue" />
                                <StatCard icon={Eye} label="Travelers" value={stats.travelers.toString()} color="emerald" />
                                <StatCard icon={Mountain} label="Guides" value={stats.guides.toString()} color="purple" />
                                <StatCard icon={Wallet} label="Total Balance" value={formatCurrency(stats.totalBalance)} color="amber" />
                            </div>

                            {/* Second row of stats: revenue, verified guides, banned users, archived trips */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard icon={DollarSign} label="Est. Revenue" value={formatCurrency(stats.totalRevenue)} color="emerald" />
                                <StatCard icon={UserCheck} label="Verified Guides" value={stats.verifiedGuides.toString()} color="blue" />
                                <StatCard icon={UserX} label="Banned Users" value={stats.bannedUsers.toString()} color="red" />
                                <StatCard icon={Archive} label="Archived Trips" value={stats.archivedTrips.toString()} color="slate" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Recent Users panel - shows the 5 most recently loaded users */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                    <h3 className="font-semibold dark:text-white mb-4 flex items-center gap-2">
                                        <Users size={18} className="text-blue-500" />
                                        Recent Users
                                    </h3>
                                    <div className="space-y-3">
                                        {users.slice(0, 5).map(u => (
                                            <div key={u.id} className="flex items-center gap-3">
                                                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium dark:text-white truncate">
                                                        {u.name}
                                                        {/* Banned users get a red "BANNED" label next to their name */}
                                                        {u.isBanned && <span className="ml-2 text-[10px] text-red-500 font-bold">BANNED</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                </div>
                                                <RoleBadge role={u.role} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Active Trips panel - shows the 5 most recent non-archived trips */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                    <h3 className="font-semibold dark:text-white mb-4 flex items-center gap-2">
                                        <Map size={18} className="text-emerald-500" />
                                        Active Trips
                                    </h3>
                                    <div className="space-y-3">
                                        {trips.filter(t => !t.isArchived).slice(0, 5).map(trip => (
                                            <div key={trip.id} className="flex items-center gap-3">
                                                <img src={trip.images[0]} alt={trip.title} className="w-10 h-10 rounded-lg object-cover" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium dark:text-white truncate">{trip.title}</p>
                                                    <p className="text-xs text-slate-400">{trip.location}</p>
                                                </div>
                                                {/* Show booking fill rate (e.g., 3/10 seats) */}
                                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                    {trip.bookedSeats}/{trip.maxSeats}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* USERS TAB - Full table of all platform users                 */}
                    {/* Admin can ban/unban, switch roles, and top up wallets here    */}
                    {/* ============================================================ */}
                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold dark:text-white">All Users</h2>
                                <span className="text-sm text-slate-400">{users.length} total</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table aria-label="All users table" className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">User</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Role</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Balance</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(u => (
                                                // Banned users get a subtle red background, others get a hover effect
                                                <tr key={u.id} className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${u.isBanned ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {/* Banned users' avatars are grayed out */}
                                                            <img src={u.avatar} alt={u.name} className={`w-8 h-8 rounded-full object-cover ${u.isBanned ? 'opacity-50 grayscale' : ''}`} />
                                                            <div>
                                                                <p className="text-sm font-medium dark:text-white">{u.name}</p>
                                                                {u.isVerified && (
                                                                    <span className="text-[10px] text-blue-600 flex items-center gap-0.5">
                                                                        <UserCheck size={10} /> Verified
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4"><RoleBadge role={u.role} /></td>
                                                    <td className="p-4 text-sm font-medium dark:text-white">{formatCurrency(u.walletBalance)}</td>
                                                    <td className="p-4">
                                                        {u.isBanned ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Banned</span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            {/* Ban/Unban toggle button */}
                                                            <button
                                                                onClick={() => handleBanUser(u.id, !u.isBanned)}
                                                                disabled={actionLoading === u.id}
                                                                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                    u.isBanned
                                                                        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 hover:bg-green-100'
                                                                        : 'bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100'
                                                                }`}
                                                                title={u.isBanned ? 'Unban user' : 'Ban user'}
                                                            >
                                                                {u.isBanned ? <ShieldCheck size={14} /> : <Ban size={14} />}
                                                            </button>

                                                            {/* Role switch button (traveler <-> guide) */}
                                                            <button
                                                                onClick={() => handleChangeRole(u.id, u.role)}
                                                                disabled={actionLoading === u.id}
                                                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 transition-colors"
                                                                title={`Switch to ${u.role === 'traveler' ? 'guide' : 'traveler'}`}
                                                            >
                                                                <ArrowRightLeft size={14} />
                                                            </button>

                                                            {/* Wallet top-up button (for testing/support) */}
                                                            <button
                                                                onClick={() => handleTopUp(u.id, u.walletBalance)}
                                                                disabled={actionLoading === u.id}
                                                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                                title="Top up wallet balance"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Empty state when no users exist */}
                                {users.length === 0 && (
                                    <div className="p-12 text-center text-slate-400">
                                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No users registered yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* TRIPS TAB - All trips with archive/delete actions             */}
                    {/* Shows trip details, category, price, booking fill, and status */}
                    {/* ============================================================ */}
                    {activeTab === 'trips' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold dark:text-white">All Trips</h2>
                                <span className="text-sm text-slate-400">{trips.length} total ({trips.filter(t => t.isArchived).length} archived)</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table aria-label="All trips table" className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Trip</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Category</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Price</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Bookings</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trips.map(trip => (
                                                // Archived trips are dimmed out with reduced opacity
                                                <tr key={trip.id} className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${trip.isArchived ? 'bg-amber-50/50 dark:bg-amber-900/10 opacity-70' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={trip.images[0]} alt={trip.title} className="w-10 h-10 rounded-lg object-cover" />
                                                            <div>
                                                                <p className="text-sm font-medium dark:text-white max-w-[200px] truncate">{trip.title}</p>
                                                                <p className="text-xs text-slate-400">{trip.location}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                                                            {trip.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(trip.price)}</td>
                                                    <td className="p-4 text-sm dark:text-white">
                                                        <span className="font-medium">{trip.bookedSeats}</span>
                                                        <span className="text-slate-400">/{trip.maxSeats}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        {trip.isArchived ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Archived</span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            {/* Archive/Restore toggle - soft delete/restore */}
                                                            <button
                                                                onClick={() => handleArchiveTrip(trip.id, !trip.isArchived)}
                                                                disabled={actionLoading === trip.id}
                                                                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                    trip.isArchived
                                                                        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 hover:bg-green-100'
                                                                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-100'
                                                                }`}
                                                                title={trip.isArchived ? 'Restore trip' : 'Archive trip'}
                                                            >
                                                                {trip.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                                            </button>

                                                            {/* Permanent delete - shows a confirmation dialog */}
                                                            <button
                                                                onClick={() => handleDeleteTrip(trip.id)}
                                                                disabled={actionLoading === trip.id}
                                                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 transition-colors"
                                                                title="Delete trip permanently"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Empty state */}
                                {trips.length === 0 && (
                                    <div className="p-12 text-center text-slate-400">
                                        <Map size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No trips created yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* GUIDES TAB - Card-based view of all registered guides         */}
                    {/* Shows guide stats (level, trips, rating) and admin actions    */}
                    {/* ============================================================ */}
                    {activeTab === 'guides' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold dark:text-white">Registered Guides</h2>
                                <span className="text-sm text-slate-400">{guides.length} guides</span>
                            </div>

                            {guides.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {guides.map(g => (
                                        // Each guide gets a card with their info, stats, and action buttons
                                        // Banned guides have reduced opacity and a red border
                                        <div key={g.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 ${g.isBanned ? 'opacity-60 border-red-300 dark:border-red-800' : ''}`}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <img src={g.avatar} alt={g.name} className="w-12 h-12 rounded-full object-cover" />
                                                <div className="flex-1">
                                                    <p className="font-semibold dark:text-white">
                                                        {g.name}
                                                        {g.isBanned && <span className="ml-1 text-[10px] text-red-500 font-bold">BANNED</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{g.email}</p>
                                                </div>
                                            </div>
                                            {/* Guide stats: level, completed trips, and average rating */}
                                            <div className="grid grid-cols-3 gap-3 text-center">
                                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2">
                                                    <p className="text-xs text-slate-400">Level</p>
                                                    <p className="font-bold dark:text-white">{g.guideLevel}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2">
                                                    <p className="text-xs text-slate-400">Trips</p>
                                                    <p className="font-bold dark:text-white">{g.completedTrips}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2">
                                                    <p className="text-xs text-slate-400">Rating</p>
                                                    <p className="font-bold dark:text-white">{g.rating > 0 ? g.rating.toFixed(1) : '—'}</p>
                                                </div>
                                            </div>

                                            {/* Admin action buttons for this guide */}
                                            <div className="mt-4 flex items-center gap-2">
                                                {/* Verify/Unverify button - toggles the trust badge */}
                                                <button
                                                    onClick={() => handleVerifyGuide(g.id, !g.isVerified)}
                                                    disabled={actionLoading === g.id}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                                                        g.isVerified
                                                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-100'
                                                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {g.isVerified ? <><ShieldOff size={12} /> Unverify</> : <><ShieldCheck size={12} /> Verify</>}
                                                </button>

                                                {/* Ban/Unban button */}
                                                <button
                                                    onClick={() => handleBanUser(g.id, !g.isBanned)}
                                                    disabled={actionLoading === g.id}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                                                        g.isBanned
                                                            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 hover:bg-green-100'
                                                            : 'bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100'
                                                    }`}
                                                >
                                                    {g.isBanned ? <><ShieldCheck size={12} /> Unban</> : <><Ban size={12} /> Ban</>}
                                                </button>
                                            </div>

                                            {/* Footer: member since date and verification status */}
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-xs text-slate-400">Since {g.memberSince}</span>
                                                {g.isVerified ? (
                                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <UserCheck size={12} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-amber-600 dark:text-amber-400">Unverified</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Empty state when no guides are registered
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                                    <ShieldCheck size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-400">No guides registered yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Travelers: {travelers.length}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* APPLICATIONS TAB - Review guide applications                  */}
                    {/* Shows applicant details, experience, and approve/reject       */}
                    {/* ============================================================ */}
                    {activeTab === 'applications' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold dark:text-white">Guide Applications</h2>
                                <span className="text-sm text-slate-400">{pendingApps.length} pending</span>
                            </div>

                            {applications.length > 0 ? (
                                <div className="space-y-4">
                                    {applications.map(app => (
                                        // Each application card has a colored border based on status:
                                        // green for approved, red for rejected, default for pending
                                        <div key={app.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 ${app.status === 'approved' ? 'border-emerald-300 dark:border-emerald-800' : app.status === 'rejected' ? 'border-red-300 dark:border-red-800 opacity-60' : ''}`}>
                                            <div className="flex items-start gap-4">
                                                <img src={app.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.userName || '')}&background=10b981&color=fff`} alt={app.userName} className="w-12 h-12 rounded-full object-cover" />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <p className="font-semibold dark:text-white">{app.userName}</p>
                                                            <p className="text-xs text-slate-400">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        {/* Status badge: pending (amber), approved (green), rejected (red) */}
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                                            app.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                            : app.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                        }`}>{app.status}</span>
                                                    </div>

                                                    {/* Application details: name, age, gender, user ID */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                                                            <p className="text-[10px] text-slate-400 uppercase">Legal Name</p>
                                                            <p className="text-sm font-medium dark:text-white">{app.fullName} {app.surname}</p>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                                                            <p className="text-[10px] text-slate-400 uppercase">Age</p>
                                                            <p className="text-sm font-medium dark:text-white">{app.age}</p>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                                                            <p className="text-[10px] text-slate-400 uppercase">Gender</p>
                                                            <p className="text-sm font-medium dark:text-white capitalize">{app.gender}</p>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                                                            <p className="text-[10px] text-slate-400 uppercase">User ID</p>
                                                            <p className="text-sm font-mono dark:text-white truncate">{app.userId.slice(0, 8)}...</p>
                                                        </div>
                                                    </div>

                                                    {/* The applicant's experience description */}
                                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mb-3">
                                                        <p className="text-[10px] text-slate-400 uppercase mb-1">Experience</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300">{app.experience}</p>
                                                    </div>

                                                    {/* Approve/Reject buttons only show for pending applications */}
                                                    {app.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleApproveApp(app.id, app.userId)}
                                                                disabled={actionLoading === app.id}
                                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl text-xs font-medium hover:bg-emerald-100 transition-colors"
                                                            >
                                                                <CheckCircle size={14} /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectApp(app.id)}
                                                                disabled={actionLoading === app.id}
                                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors"
                                                            >
                                                                <XCircle size={14} /> Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Empty state when no applications exist
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                                    <ClipboardCheck size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-400">No guide applications yet</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// =========================================================================
// HELPER COMPONENTS - Small presentational components used in the dashboard
// =========================================================================

/**
 * StatCard - A single statistic card for the overview dashboard.
 *
 * Displays an icon, a big number/value, and a label. The color prop
 * determines the icon background color to visually categorize different stats.
 */
const StatCard = ({ icon: Icon, label, value, color }: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'slate';
}) => {
    // Color mapping for the icon background
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
        purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600',
        amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
        red: 'bg-red-50 dark:bg-red-900/30 text-red-600',
        slate: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400',
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
                <Icon size={20} />
            </div>
            <p className="text-2xl font-bold dark:text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
        </div>
    );
};

/**
 * RoleBadge - A small colored badge that shows a user's role (traveler/guide).
 *
 * Travelers get a blue badge, guides get a green badge.
 * Used throughout the admin dashboard wherever user roles are displayed.
 */
const RoleBadge = ({ role }: { role: string }) => {
    const styles: Record<string, string> = {
        traveler: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        guide: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[role] || 'bg-slate-100 text-slate-600'}`}>
            {role}
        </span>
    );
};
