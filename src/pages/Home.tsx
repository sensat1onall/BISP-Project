import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TripCard } from '../components/TripCard';
import { translations } from '../i18n/translations';
import { Search, Map, SlidersHorizontal, X } from 'lucide-react';
import { LiquidButton } from '../components/ui/liquid-glass-button';

export const Home = ({ showBooked = false }: { showBooked?: boolean }) => {
    const { trips, bookings, user, language } = useApp();
    const t = translations[language].home;
    const navT = translations[language].nav;
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
    const [maxPrice, setMaxPrice] = useState<number>(0);

    const categories = [
        { id: 'all', label: t.categories.all },
        { id: 'hiking', label: t.categories.hiking },
        { id: 'camping', label: t.categories.camping },
        { id: 'sightseeing', label: t.categories.sightseeing },
    ];

    const difficulties = [
        { id: 'all', label: 'All' },
        { id: 'easy', label: 'Easy' },
        { id: 'moderate', label: 'Moderate' },
        { id: 'hard', label: 'Hard' },
    ];

    const filteredTrips = trips.filter(trip => {
        if (showBooked) {
            const userBookings = bookings.filter(b => b.travelerId === user.id);
            return userBookings.some(b => b.tripId === trip.id);
        }

        const matchesCategory = activeCategory === 'all' || trip.category === activeCategory;
        const matchesSearch = trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDifficulty = difficultyFilter === 'all' || trip.difficulty === difficultyFilter;
        const matchesPrice = maxPrice === 0 || trip.price <= maxPrice;
        return matchesCategory && matchesSearch && matchesDifficulty && matchesPrice;
    });

    const hasActiveFilters = difficultyFilter !== 'all' || maxPrice > 0;

    const clearFilters = () => {
        setDifficultyFilter('all');
        setMaxPrice(0);
    };

    return (
        <div className="py-8 px-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">
                        {showBooked ? navT.myTrips : t.featured}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'} found
                    </p>
                </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={translations[language].common.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        showFilters || hasActiveFilters
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    <SlidersHorizontal size={16} />
                    Filters
                    {hasActiveFilters && (
                        <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] flex items-center justify-center">
                            {(difficultyFilter !== 'all' ? 1 : 0) + (maxPrice > 0 ? 1 : 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold dark:text-white">Filter Trips</h3>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                <X size={12} /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Difficulty</label>
                            <div className="flex gap-2">
                                {difficulties.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => setDifficultyFilter(d.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            difficultyFilter === d.id
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">
                                Max Price {maxPrice > 0 ? `(${(maxPrice / 1000).toFixed(0)}k UZS)` : '(Any)'}
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={2000000}
                                step={50000}
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                className="w-full accent-emerald-600"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Categories */}
            <div className="flex gap-2 mb-8 flex-wrap">
                {categories.map(cat => (
                    activeCategory === cat.id ? (
                        <LiquidButton
                            key={cat.id}
                            size="sm"
                            onClick={() => setActiveCategory(cat.id)}
                            className="rounded-full bg-emerald-600 text-white shadow-emerald-500/30 shadow-lg"
                        >
                            {cat.label}
                        </LiquidButton>
                    ) : (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className="px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50"
                        >
                            {cat.label}
                        </button>
                    )
                ))}
            </div>

            {/* Trip Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                ))}
            </div>

            {filteredTrips.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Map size={48} strokeWidth={1.5} className="mb-4 text-slate-300 dark:text-slate-600" />
                    <p className="text-lg font-medium">No trips found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
};
