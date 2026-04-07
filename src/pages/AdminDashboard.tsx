import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import {
    Users, Map, ShieldCheck, Wallet, LogOut, TrendingUp,
    Eye, UserCheck, Mountain, Loader2, AlertCircle
} from 'lucide-react';

type Tab = 'overview' | 'users' | 'trips' | 'guides';

export const AdminDashboard = () => {
    const { user, logout, trips } = useApp();
    const navigate = useNavigate();

    interface AdminUser {
        id: string;
        name: string;
        email: string;
        avatar: string;
        role: string;
        walletBalance: number;
        isVerified: boolean;
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
        totalBalance: number;
    }

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                guideLevel: Number(p.guide_level) || 0,
                completedTrips: Number(p.completed_trips) || 0,
                rating: Number(p.rating) || 0,
                memberSince: p.member_since as string || '',
            }));

            setUsers(mappedUsers);
            setStats({
                totalUsers: mappedUsers.length,
                travelers: mappedUsers.filter(u => u.role === 'traveler').length,
                guides: mappedUsers.filter(u => u.role === 'guide').length,
                verifiedGuides: mappedUsers.filter(u => u.role === 'guide' && u.isVerified).length,
                totalBalance: mappedUsers.reduce((sum, u) => sum + u.walletBalance, 0),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
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
    ];

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
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <nav className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-[calc(100vh-73px)] p-4 hidden md:block">
                    <div className="space-y-1">
                        {tabs.map(tab => (
                            <button
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
                        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
                            <AlertCircle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Overview Tab */}
                    {activeTab === 'overview' && stats && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold dark:text-white">Dashboard Overview</h2>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    icon={Users}
                                    label="Total Users"
                                    value={stats.totalUsers.toString()}
                                    color="blue"
                                />
                                <StatCard
                                    icon={Eye}
                                    label="Travelers"
                                    value={stats.travelers.toString()}
                                    color="emerald"
                                />
                                <StatCard
                                    icon={Mountain}
                                    label="Guides"
                                    value={stats.guides.toString()}
                                    color="purple"
                                />
                                <StatCard
                                    icon={Wallet}
                                    label="Total Balance"
                                    value={formatCurrency(stats.totalBalance)}
                                    color="amber"
                                />
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
                                                    <p className="text-sm font-medium dark:text-white truncate">{u.name}</p>
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
                                        {trips.slice(0, 5).map(trip => (
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
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">User</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Email</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Role</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Balance</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Trips</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Rating</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Joined</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(u => (
                                                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
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
                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                                                    <td className="p-4"><RoleBadge role={u.role} /></td>
                                                    <td className="p-4 text-sm font-medium dark:text-white">{formatCurrency(u.walletBalance)}</td>
                                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{u.completedTrips}</td>
                                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{u.rating > 0 ? u.rating.toFixed(1) : '—'}</td>
                                                    <td className="p-4 text-sm text-slate-400">{u.memberSince}</td>
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
                                <span className="text-sm text-slate-400">{trips.length} total</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Trip</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Location</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Category</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Difficulty</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Price</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Bookings</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Rating</th>
                                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trips.map(trip => (
                                                <tr key={trip.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={trip.images[0]} alt={trip.title} className="w-10 h-10 rounded-lg object-cover" />
                                                            <p className="text-sm font-medium dark:text-white max-w-[200px] truncate">{trip.title}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{trip.location}</td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                                                            {trip.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <DifficultyBadge difficulty={trip.difficulty} />
                                                    </td>
                                                    <td className="p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(trip.price)}</td>
                                                    <td className="p-4 text-sm dark:text-white">
                                                        <span className="font-medium">{trip.bookedSeats}</span>
                                                        <span className="text-slate-400">/{trip.maxSeats}</span>
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                                                        {trip.averageRating ? trip.averageRating.toFixed(1) : '—'}
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-400">
                                                        {new Date(trip.startDate).toLocaleDateString()}
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
                                        <div key={g.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3 mb-4">
                                                <img src={g.avatar} alt={g.name} className="w-12 h-12 rounded-full object-cover" />
                                                <div>
                                                    <p className="font-semibold dark:text-white">{g.name}</p>
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
                                            <div className="mt-3 flex items-center justify-between">
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
    color: 'blue' | 'emerald' | 'purple' | 'amber';
}) => {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
        purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600',
        amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
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

const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
    const styles: Record<string, string> = {
        easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        moderate: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        hard: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[difficulty] || ''}`}>
            {difficulty}
        </span>
    );
};
