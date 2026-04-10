/**
 * TripCard.tsx - A card component that displays a trip preview in the explore grid.
 *
 * This is one of the most visible components in the app - it's what users see when
 * browsing the trip listing. Each card shows:
 *   - Hero image with hover zoom effect
 *   - Difficulty badge (easy/moderate/hard with color coding)
 *   - Average rating star badge (if the trip has been rated)
 *   - Status badges (Almost Full, Sold Out, New)
 *   - Trip title overlaid on the image
 *   - Location and date
 *   - Price in UZS currency format
 *   - Available spots count
 *
 * Accessibility features:
 *   - The entire card is a clickable button (role="button")
 *   - tabIndex={0} makes it focusable with keyboard
 *   - onKeyDown handles Enter and Space keys for keyboard navigation
 *   - aria-label provides a descriptive label for screen readers
 *   - Clicking anywhere on the card navigates to the trip detail page
 *
 * Status badges logic:
 *   - "Almost Full" (red, with flame icon): Shows when 1-2 spots are left
 *   - "Sold Out" (dark): Shows when zero spots are left
 *   - "New" (green, with sparkles): Shows for trips starting within the next 7 days
 */
import React from 'react';
import { Trip } from '../types';
import { MapPin, Calendar, Users, Star, Flame, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';

interface TripCardProps {
    trip: Trip;
}

export const TripCard: React.FC<TripCardProps> = ({ trip }) => {
    const navigate = useNavigate();
    const { language } = useApp();
    const t = translations[language].common;

    // Color mapping for difficulty levels - each level gets its own color scheme
    // that works in both light and dark mode
    const difficultyColor = {
        easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    // Calculate remaining spots for the "Almost Full" / "Sold Out" badges
    const spotsLeft = trip.maxSeats - trip.bookedSeats;

    // Format the trip start date based on the user's selected language
    const dateObj = new Date(trip.startDate);
    const formattedDate = dateObj.toLocaleDateString(language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'short', day: 'numeric' });

    return (
        <article
            onClick={() => navigate(`/trip/${trip.id}`)}
            // Keyboard navigation: Enter and Space trigger the same navigation as click
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/trip/${trip.id}`); } }}
            role="button"
            tabIndex={0}
            // Descriptive aria-label for screen readers who can't see the visual card
            aria-label={`${trip.title} in ${trip.location} - ${formatCurrency(trip.price)}`}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 w-full active:scale-[0.98] cursor-pointer"
        >
            {/* Hero Image Section - Shows the trip's first image with an overlay */}
            <div className="relative h-48 w-full overflow-hidden">
                {/* The image zooms in slightly on hover (group-hover:scale-110) for a nice effect */}
                <img
                    src={trip.images[0]}
                    alt={`${trip.title} in ${trip.location}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Top-left badges: difficulty level and average rating */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    {/* Difficulty badge with backdrop blur for readability over the image */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${difficultyColor[trip.difficulty]}`}>
                        {trip.difficulty.charAt(0).toUpperCase() + trip.difficulty.slice(1)}
                    </span>
                    {/* Star rating badge - only shown if the trip has been rated */}
                    {trip.averageRating && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                            <Star size={12} fill="currentColor" />
                            {trip.averageRating.toFixed(1)}
                        </span>
                    )}
                </div>

                {/* Top-right status badges - urgency and freshness indicators */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    {/* "Almost Full" badge - shows when only 1-2 spots remain.
                        Uses a flame icon to create urgency. */}
                    {spotsLeft <= 2 && spotsLeft > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center gap-1">
                            <Flame size={10} /> Almost Full
                        </span>
                    )}
                    {/* "Sold Out" badge - shows when zero spots are left */}
                    {spotsLeft === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white">
                            Sold Out
                        </span>
                    )}
                    {/* "New" badge - shows for trips starting within the next 7 days
                        that haven't already passed. Creates a sense of timeliness. */}
                    {new Date(trip.startDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && new Date(trip.startDate).getTime() > Date.now() && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1">
                            <Sparkles size={10} /> New
                        </span>
                    )}
                </div>

                {/* Bottom gradient overlay with trip title - creates a dark-to-transparent
                    gradient so the white text is readable over any image */}
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">{trip.title}</h3>
                </div>
            </div>

            {/* Card Details Section - Location, date, price, and spots */}
            <div className="p-4 space-y-3">
                {/* Location and date row */}
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                        <MapPin size={16} className="text-emerald-500" />
                        <span>{trip.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar size={16} className="text-blue-500" />
                        <span>{formattedDate}</span>
                    </div>
                </div>

                {/* Price and available spots row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400">{t.price}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                            {formatCurrency(trip.price)}
                        </span>
                    </div>

                    {/* Spots remaining pill - shows how many seats are still available */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                        <Users size={14} className="text-slate-600 dark:text-slate-300" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {spotsLeft} {t.spotsLeft}
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
};
