// =============================================================================
// Home.tsx — The main landing page / trip discovery page for SafarGo.
// This is where travelers browse, search, filter, and sort available trips.
// It also doubles as a "My Trips" page when showBooked is true, which shows
// only trips the current user has booked. Think of it as the Airbnb-style
// explore page but for adventure trips in Uzbekistan.
// =============================================================================

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TripCard } from '../components/TripCard';
import { translations } from '../i18n/translations';
import { Search, Map, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { LiquidButton } from '../components/ui/liquid-glass-button';

// The showBooked prop controls whether we show all available trips (the default explore mode)
// or just the trips the current user has booked (the "My Trips" view). Same component, two modes.
export const Home = ({ showBooked = false }: { showBooked?: boolean }) => {
    const { trips, bookings, user, language } = useApp();
    const t = translations[language].home;
    const navT = translations[language].nav;

    // -- State for filtering and sorting --
    // activeCategory tracks which category tab the user clicked (all, hiking, camping, sightseeing)
    const [activeCategory, setActiveCategory] = useState<string>('all');

    // searchQuery is the text the user types in the search bar — we match against title and location
    const [searchQuery, setSearchQuery] = useState('');

    // showFilters controls whether the expandable filter panel is visible
    const [showFilters, setShowFilters] = useState(false);

    // difficultyFilter lets users narrow down by easy/moderate/hard difficulty levels
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

    // maxPrice is controlled by a range slider — 0 means "no limit" (show everything)
    const [maxPrice, setMaxPrice] = useState<number>(0);

    // sortBy determines the order trips appear in — newest first by default
    const [sortBy, setSortBy] = useState<string>('newest');

    // These are the category pills that show up as horizontal buttons.
    // Labels come from i18n so they change based on the selected language.
    const categories = [
        { id: 'all', label: t.categories.all },
        { id: 'hiking', label: t.categories.hiking },
        { id: 'camping', label: t.categories.camping },
        { id: 'sightseeing', label: t.categories.sightseeing },
    ];

    // Difficulty options for the expanded filter panel
    const difficulties = [
        { id: 'all', label: 'All' },
        { id: 'easy', label: 'Easy' },
        { id: 'moderate', label: 'Moderate' },
        { id: 'hard', label: 'Hard' },
    ];

    // -- The main filtering pipeline --
    // We chain multiple filters together. Each trip must pass ALL active filters to show up.
    // This runs on every render, which is fine because the trip list is small enough.
    const filteredTrips = trips.filter(trip => {
        // Hide archived trips from public view (admin can still see them in admin panel)
        if (trip.isArchived && user.role !== 'admin') return false;

        // If we're in "My Trips" mode, only show trips this user has actually booked
        if (showBooked) {
            const userBookings = bookings.filter(b => b.travelerId === user.id);
            return userBookings.some(b => b.tripId === trip.id);
        }

        // Check if the trip matches the selected category (or "all" means no filter)
        const matchesCategory = activeCategory === 'all' || trip.category === activeCategory;

        // Search is case-insensitive and checks both the trip title and location
        const matchesSearch = trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.location.toLowerCase().includes(searchQuery.toLowerCase());

        // Difficulty filter — "all" means show every difficulty level
        const matchesDifficulty = difficultyFilter === 'all' || trip.difficulty === difficultyFilter;

        // Price filter — 0 means no upper limit, otherwise we cap at the user's chosen max
        const matchesPrice = maxPrice === 0 || trip.price <= maxPrice;
        return matchesCategory && matchesSearch && matchesDifficulty && matchesPrice;
    });

    // -- Sorting logic --
    // We spread into a new array first so we don't mutate the filtered results.
    // The sort options are pretty self-explanatory: price, rating, popularity (booked seats), or date.
    const sortedTrips = [...filteredTrips].sort((a, b) => {
        switch (sortBy) {
            case 'price-low': return a.price - b.price;
            case 'price-high': return b.price - a.price;
            case 'rating': return (b.averageRating || 0) - (a.averageRating || 0);
            case 'popular': return b.bookedSeats - a.bookedSeats;
            case 'newest':
            default: return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }
    });

    // Quick check to see if any filters are active so we can show the badge count
    // on the filter button and display the "Clear all" option
    const hasActiveFilters = difficultyFilter !== 'all' || maxPrice > 0;

    // Reset all filters back to their defaults
    const clearFilters = () => {
        setDifficultyFilter('all');
        setMaxPrice(0);
    };

    return (
        <div className="py-8 px-6">
            {/* Page Header — shows "Featured Trips" or "My Trips" depending on the mode */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">
                        {showBooked ? navT.myTrips : t.featured}
                    </h1>
                    {/* Live region so screen readers announce the count when it changes */}
                    <p role="status" aria-live="polite" className="text-sm text-slate-400 mt-1">
                        {sortedTrips.length} {sortedTrips.length === 1 ? 'trip' : 'trips'} found
                    </p>
                </div>
            </div>

            {/* Search Bar + Filter Toggle + Sort Dropdown — all in one row */}
            <div className="flex items-center gap-3 mb-6">
                {/* The search input with a magnifying glass icon on the left */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={translations[language].common.searchPlaceholder}
                        aria-label="Search trips"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                    />
                </div>

                {/* Filter toggle button — it lights up green when filters are active,
                    and shows a badge with the number of active filters */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                    aria-label="Toggle filters"
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

                {/* Sort Dropdown — native <select> styled to look custom with a little arrow icon */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        aria-label="Sort trips"
                        className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium px-4 py-2.5 pr-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                    >
                        <option value="newest">Newest</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Top Rated</option>
                        <option value="popular">Most Popular</option>
                    </select>
                    <ArrowUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Expanded Filters Panel — only visible when the user clicks the filter button.
                Contains difficulty buttons and a price range slider. */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold dark:text-white">Filter Trips</h3>
                        {/* "Clear all" link only shows when there are active filters to clear */}
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                <X size={12} /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Difficulty filter — a row of pill buttons, the active one gets highlighted */}
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

                        {/* Price range slider — goes from 0 to 2,000,000 UZS in 50k steps.
                            When set to 0 it means "any price" (no limit). */}
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

            {/* Category Tabs — horizontal scrollable pills for quick category filtering.
                The active category gets a fancy LiquidButton style, inactive ones are plain buttons. */}
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

            {/* Trip Grid — responsive grid that adapts from 1 column on mobile to 4 on large screens.
                Each trip is rendered as a TripCard component. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                ))}
            </div>

            {/* Empty state — shown when no trips match the current filters/search.
                Gives the user a hint to adjust their criteria. */}
            {sortedTrips.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Map size={48} strokeWidth={1.5} className="mb-4 text-slate-300 dark:text-slate-600" />
                    <p className="text-lg font-medium">No trips found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
};
