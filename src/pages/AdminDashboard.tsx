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

type Tab = 'overview' | 'users' | 'trips' | 'guides' | 'applications';

export const AdminDashboard = () => {
    const { user, logout, trips, adminBanUser, adminArchiveTrip, adminDeleteTrip, adminVerifyGuide, adminChangeRole, adminApproveApplication, adminRejectApplication } = useApp();
    const navigate = useNavigate();

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

    interface AdminStats {
        totalUsers: number;
        travelers: number;
        guides: number;
        verifiedGuides: number;
        bannedUsers: number;
        totalBalance: number;
        totalRevenue: number;
        archivedTrips: number;
    }

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [applications, setApplications] = useState<GuideApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin');

            const mappedUsers: AdminUser[] = (profiles || []).map((p: Record<string, unknown>) => ({
                id: p.id as string,
                name: p.name as string,
                email: (p.name as string),
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

            // Load guide applications
            const { data: apps } = await supabase
                .from('guide_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (apps) {
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

    const handleBanUser = async (userId: string, ban: boolean) => {
        setActionLoading(userId);
        await adminBanUser(userId, ban);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: ban } : u));
        setActionLoading(null);
    };

    const handleChangeRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'traveler' ? 'guide' : 'traveler';
        setActionLoading(userId);
        await adminChangeRole(userId, newRole as 'traveler' | 'guide');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setActionLoading(null);
    };

    const handleArchiveTrip = async (tripId: string, archive: boolean) => {
        setActionLoading(tripId);
        await adminArchiveTrip(tripId, archive);
        setActionLoading(null);
    };

    const handleDeleteTrip = async (tripId: string) => {
        if (!window.confirm('Are you sure? This permanently deletes the trip and all its bookings.')) return;
        setActionLoading(tripId);
        await adminDeleteTrip(tripId);
        setActionLoading(null);
    };

    const handleVerifyGuide = async (userId: string, verify: boolean) => {
        setActionLoading(userId);
        await adminVerifyGuide(userId, verify);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: verify } : u));
        setActionLoading(null);
    };

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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const guides = users.filter(u => u.role === 'guide');
    const travelers = users.filter(u => u.role === 'traveler');

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'trips', label: 'Trips', icon: Map },
        { id: 'guides', label: 'Guides', icon: ShieldCheck },
        { id: 'applications', label: 'Applications', icon: ClipboardCheck },
    ];

    const pendingApps = applications.filter(a => a.status === 'pending');

    const handleApproveApp = async (appId: string, userId: string) => {
        setActionLoading(appId);
        await adminApproveApplication(appId, userId);
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'approved' as const } : a));
        setActionLoading(null);
        loadData();
    };

    const handleRejectApp = async (appId: string) => {
        setActionLoading(appId);
        await adminRejectApplication(appId);
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' as const } : a));
        setActionLoading(null);
    };

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
            {/* Top Bar */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
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
                {/* Sidebar */}
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

                {/* Mobile tabs */}
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

                {/* Main Content */}
                <main className="flex-1 p-6 pb-24 md:pb-6">
                    {error && (
                        <div role="alert" className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
                            <AlertCircle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Overview Tab */}
                    {activeTab === 'overview' && stats && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold dark:text-white">Dashboard Overview</h2>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toString()} color="blue" />
                                <StatCard icon={Eye} label="Travelers" value={stats.travelers.toString()} color="emerald" />
                                <StatCard icon={Mountain} label="Guides" value={stats.guides.toString()} color="purple" />
                                <StatCard icon={Wallet} label="Total Balance" value={formatCurrency(stats.totalBalance)} color="amber" />
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard icon={DollarSign} label="Est. Revenue" value={formatCurrency(stats.totalRevenue)} color="emerald" />
                                <StatCard icon={UserCheck} label="Verified Guides" value={stats.verifiedGuides.toString()} color="blue" />
                                <StatCard icon={UserX} label="Banned Users" value={stats.bannedUsers.toString()} color="red" />
                                <StatCard icon={Archive} label="Archived Trips" value={stats.archivedTrips.toString()} color="slate" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Recent Users */}
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
                                                        {u.isBanned && <span className="ml-2 text-[10px] text-red-500 font-bold">BANNED</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                </div>
                                                <RoleBadge role={u.role} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Active Trips */}
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

                    {/* Users Tab */}
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
                                                <tr key={u.id} className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${u.isBanned ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
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
                                                            {/* Ban/Unban */}
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

                                                            {/* Switch Role */}
                                                            <button
                                                                onClick={() => handleChangeRole(u.id, u.role)}
                                                                disabled={actionLoading === u.id}
                                                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 transition-colors"
                                                                title={`Switch to ${u.role === 'traveler' ? 'guide' : 'traveler'}`}
                                                            >
                                                                <ArrowRightLeft size={14} />
                                                            </button>

                                                            {/* Top Up Balance */}
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
                                {users.length === 0 && (
                                    <div className="p-12 text-center text-slate-400">
                                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No users registered yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Trips Tab */}
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
                                                            {/* Archive/Restore */}
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

                                                            {/* Delete */}
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
                                {trips.length === 0 && (
                                    <div className="p-12 text-center text-slate-400">
                                        <Map size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No trips created yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Guides Tab */}
                    {activeTab === 'guides' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold dark:text-white">Registered Guides</h2>
                                <span className="text-sm text-slate-400">{guides.length} guides</span>
                            </div>

                            {guides.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {guides.map(g => (
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

                                            {/* Admin Actions */}
                                            <div className="mt-4 flex items-center gap-2">
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
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                                    <ShieldCheck size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-400">No guides registered yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Travelers: {travelers.length}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Applications Tab */}
                    {activeTab === 'applications' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold dark:text-white">Guide Applications</h2>
                                <span className="text-sm text-slate-400">{pendingApps.length} pending</span>
                            </div>

                            {applications.length > 0 ? (
                                <div className="space-y-4">
                                    {applications.map(app => (
                                        <div key={app.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 ${app.status === 'approved' ? 'border-emerald-300 dark:border-emerald-800' : app.status === 'rejected' ? 'border-red-300 dark:border-red-800 opacity-60' : ''}`}>
                                            <div className="flex items-start gap-4">
                                                <img src={app.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.userName || '')}&background=10b981&color=fff`} alt={app.userName} className="w-12 h-12 rounded-full object-cover" />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <p className="font-semibold dark:text-white">{app.userName}</p>
                                                            <p className="text-xs text-slate-400">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                                            app.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                            : app.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                        }`}>{app.status}</span>
                                                    </div>

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

                                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mb-3">
                                                        <p className="text-[10px] text-slate-400 uppercase mb-1">Experience</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300">{app.experience}</p>
                                                    </div>

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

// --- Helper Components ---

const StatCard = ({ icon: Icon, label, value, color }: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'slate';
}) => {
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
