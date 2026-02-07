import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TripCard } from '../components/TripCard';
import { translations } from '../i18n/translations';
import { Search, Bell, SlidersHorizontal, Map } from 'lucide-react';
import { cn } from '../lib/cn';

export const Home = ({ showBooked = false }: { showBooked?: boolean }) => {
    const { user, trips, language } = useApp();
    const t = translations[language].home;
    const navT = translations[language].nav;
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        { id: 'all', label: t.categories.all },
        { id: 'hiking', label: t.categories.hiking },
        { id: 'camping', label: t.categories.camping },
        { id: 'sightseeing', label: t.categories.sightseeing },
    ];

    const filteredTrips = trips.filter(trip => {
        // Basic filter logic for demo purposes
        if (showBooked) {
            // Since we don't have a real backend, we'll just show 'booked' trips as those with bookedSeats > 0 (as a proxy)
            // In reality we would check user.bookedTripIds
            return trip.bookedSeats > 0;
        }

        const matchesCategory = activeCategory === 'all' || trip.category === activeCategory;
        const matchesSearch = trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 sticky top-0 z-10 px-4 pt-4 pb-2 shadow-sm transition-colors duration-300">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={user.avatar}
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-emerald-500 object-cover"
                        />
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t.greeting},</p>
                            <h1 className="font-bold text-lg dark:text-white leading-none">{user.name}</h1>
                        </div>
                    </div>
                    <button className="p-2 relative bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <Bell size={20} className="text-slate-600 dark:text-slate-300" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={translations[language].common.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium text-sm"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <SlidersHorizontal size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </button>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-300",
                                activeCategory === cat.id
                                    ? "bg-emerald-600 text-white shadow-emerald-500/30 shadow-lg scale-105"
                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50"
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 mt-2">
                <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
                    {showBooked ? navT.myTrips : t.featured}
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md self-center">
                        {filteredTrips.length}
                    </span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrips.map(trip => (
                        <TripCard key={trip.id} trip={trip} />
                    ))}
                </div>

                {filteredTrips.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Map size={48} strokeWidth={1.5} className="mb-4 text-slate-300 dark:text-slate-600" />
                        <p>No trips found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
