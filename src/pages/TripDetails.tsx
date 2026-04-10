// =============================================================================
// TripDetails.tsx — The detailed view for a single trip in SafarGo.
// When a user clicks on a trip card from the Home page, they land here.
// This page handles a LOT: image gallery, trip stats, weather forecast via
// Gemini AI, booking flow with a confirmation modal, rating/review system
// for completed trips, and different views depending on whether you're the
// guide who created the trip or a traveler looking to book it.
// =============================================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { getAIWeatherForecast, AIWeatherForecast } from '../lib/gemini';
import { formatCurrency } from '../utils/format';
import { ArrowLeft, Clock, Mountain, Map as MapIcon, CloudSun, CheckCircle, AlertCircle, Star, Send, AlertTriangle, Trash2, Users, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { MetalButton } from '../components/ui/liquid-glass-button';

export const TripDetails = () => {
    // Grab the trip ID from the URL params (e.g., /trip/abc-123)
    const { id } = useParams();
    const navigate = useNavigate();
    const { trips, user, bookTrip, deleteTrip, language, getUserBookingForTrip, rateTrip } = useApp();
    const t = translations[language].trip;
    const commonT = translations[language].common;

    // Find the trip from our global state using the URL param
    const trip = trips.find(t => t.id === id);

    // Weather data fetched from Gemini AI — shows forecast for the trip's location
    const [weather, setWeather] = useState<AIWeatherForecast | null>(null);

    // Tracks the booking flow state: idle (default), success (just booked), error (something went wrong)
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // For the image gallery — tracks which image is currently shown as the big hero image
    const [selectedImage, setSelectedImage] = useState(0);

    // Controls visibility of the booking confirmation modal
    const [showBookingModal, setShowBookingModal] = useState(false);

    // -- Rating state --
    // These are for the post-trip rating form that shows up after a completed booking
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    // Check if the current user has a booking for this trip, and whether they can rate it.
    // You can only rate a trip if your booking status is "completed" and you haven't rated yet.
    const booking = trip ? getUserBookingForTrip(trip.id) : undefined;
    const canRate = booking?.status === 'completed' && !booking?.hasRated;

    // Fetch the AI-powered weather forecast when the trip loads.
    // This calls the Gemini API with the trip's location to get temperature and multi-day forecast.
    useEffect(() => {
        if (trip) {
            getAIWeatherForecast(trip.location).then(data => {
                if (data) setWeather(data);
            });
        }
    }, [trip]);

    // If the trip doesn't exist (bad URL or deleted), show a simple error with a link home
    if (!trip) return (
        <div className="p-20 text-center">
            <p className="text-xl font-semibold dark:text-white">Trip not found</p>
            <button onClick={() => navigate('/')} className="mt-4 text-emerald-600 hover:underline">Go Home</button>
        </div>
    );

    // -- Key permission checks --
    // isOrganizer: true if the current user is the guide who created this trip.
    //   Guides see a "delete" button instead of "book", since you can't book your own trip.
    // hasFunds: checks if the user has enough wallet balance to cover the trip price.
    // spotsLeft: how many seats are still available for booking.
    const isOrganizer = user.role === 'guide' && user.id === trip.guideId;
    const hasFunds = user.walletBalance >= trip.price;
    const spotsLeft = trip.maxSeats - trip.bookedSeats;

    // Handle the actual booking when the user confirms in the modal.
    // bookTrip returns true/false from the context — it handles wallet deduction,
    // seat incrementing, and creating the booking record all in one go.
    // We show success/error for 3 seconds then reset back to idle.
    const handleBook = () => {
        if (bookTrip(trip.id)) {
            setBookingStatus('success');
            setShowBookingModal(false);
            setTimeout(() => setBookingStatus('idle'), 3000);
        } else {
            setBookingStatus('error');
            setTimeout(() => setBookingStatus('idle'), 3000);
        }
    };

    // Delete the trip — only available to the guide who created it.
    // Shows a browser confirm dialog first because this is destructive.
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this trip?')) {
            deleteTrip(trip.id);
            navigate('/');
        }
    };

    // Submit a rating for a completed trip. The rateTrip function in context
    // handles adding the rating to the trip's ratings array and updating the average.
    const handleSubmitRating = () => {
        if (rateTrip(trip.id, ratingValue, ratingComment)) {
            setRatingSubmitted(true);
        }
    };

    // A reusable star rating component used both for the rating form (interactive)
    // and for displaying existing ratings (read-only when onChange is undefined).
    const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange?.(star)}
                    disabled={!onChange}
                    className={cn(
                        "transition-colors",
                        onChange && "hover:scale-110 active:scale-95",
                        star <= value ? "text-amber-400" : "text-slate-300 dark:text-slate-600"
                    )}
                >
                    <Star size={24} fill={star <= value ? "currentColor" : "none"} />
                </button>
            ))}
        </div>
    );

    return (
        <div className="py-8 px-6">
            {/* Back Button — navigates to the previous page in browser history */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 transition-colors"
            >
                <ArrowLeft size={18} />
                {commonT.back}
            </button>

            {/* Main layout: 2-column grid on large screens (images+info on left, booking sidebar on right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Images, description, weather, ratings — takes up 2/3 of the width */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Image Gallery — hero image on top with clickable thumbnails below.
                        The category and difficulty badges are overlaid on the top-left of the hero image,
                        and the average rating badge sits in the top-right corner. */}
                    <div className="space-y-3">
                        <div className="relative rounded-2xl overflow-hidden aspect-[16/9]">
                            <img
                                src={trip.images[selectedImage] || trip.images[0]}
                                alt={trip.title}
                                className="w-full h-full object-cover"
                            />
                            {/* Gradient overlay at the bottom for visual depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                            {/* Category and difficulty badges — color-coded by difficulty level */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className="px-3 py-1 bg-emerald-500 rounded-full text-xs font-bold text-white uppercase tracking-wide">
                                    {trip.category}
                                </span>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wide",
                                    trip.difficulty === 'easy' ? 'bg-green-500' : trip.difficulty === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
                                )}>
                                    {trip.difficulty}
                                </span>
                            </div>

                            {/* Average rating badge — only shows if the trip has been rated */}
                            {trip.averageRating && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
                                    <Star size={14} fill="gold" className="text-amber-400" />
                                    <span className="text-white font-semibold text-sm">{trip.averageRating.toFixed(1)}</span>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail strip — only shows when there are multiple images.
                            Clicking a thumbnail swaps the hero image above. */}
                        {trip.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto">
                                {trip.images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedImage(i)}
                                        className={cn(
                                            "flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all",
                                            selectedImage === i ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-transparent opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Title & Location */}
                    <div>
                        <h1 className="text-3xl font-bold dark:text-white mb-2">{trip.title}</h1>
                        <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm gap-2">
                            <MapIcon size={16} className="text-emerald-500" />
                            {trip.location}
                        </div>
                    </div>

                    {/* Stats Grid — four key metrics displayed in a 4-column grid.
                        Each stat card has an icon, label, and value. */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { icon: Clock, label: commonT.duration, value: `${trip.durationDays} days`, color: 'text-blue-500' },
                            { icon: MapIcon, label: commonT.distance, value: `${trip.distanceKm} km`, color: 'text-emerald-500' },
                            { icon: Mountain, label: commonT.altitude, value: `${trip.altitudeGainM} m`, color: 'text-purple-500' },
                            { icon: Users, label: 'Spots Left', value: `${spotsLeft}/${trip.maxSeats}`, color: 'text-orange-500' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-center">
                                <stat.icon size={20} className={`${stat.color} mx-auto mb-1`} />
                                <p className="text-xs text-slate-400">{stat.label}</p>
                                <p className="font-bold text-sm dark:text-white">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Description Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                        <h2 className="font-bold text-lg dark:text-white mb-3">Description</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{trip.description}</p>
                    </div>

                    {/* AI Packing Recommendations — generated by Gemini when the trip was created.
                        Only shows up if the guide fetched weather/recommendations during trip creation. */}
                    {trip.aiRecommendations && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Packing Tips</h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-300">{trip.aiRecommendations}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Weather Forecast Section — fetched from the Gemini AI API on page load.
                        Shows the current temperature and a multi-day forecast if available.
                        This helps travelers decide if the weather is good for the trip dates. */}
                    {weather && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-blue-100 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold dark:text-white flex items-center gap-2">
                                    <CloudSun className="text-yellow-500" />
                                    {t.weatherTitle}
                                </h3>
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{weather.temp}°C</span>
                            </div>
                            {weather.forecast && weather.forecast.length > 0 && (
                                <div className="flex gap-3">
                                    {weather.forecast.map((day, i) => (
                                        <div key={i} className="flex-1 bg-white dark:bg-slate-700 rounded-lg p-3 text-center">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{day.day}</span>
                                            <p className="text-lg font-bold dark:text-white">{day.temp}°</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rating Form — only visible to users who completed this trip and haven't rated yet.
                        Once submitted, it disappears and shows a thank-you message instead. */}
                    {canRate && !ratingSubmitted && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold dark:text-white flex items-center gap-2 mb-4">
                                <Star className="text-amber-500" />
                                Rate Your Experience
                            </h3>
                            <div className="flex justify-center mb-4">
                                <StarRating value={ratingValue} onChange={setRatingValue} />
                            </div>
                            <textarea
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Share your experience..."
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm resize-none h-20 dark:text-white mb-3"
                            />
                            <MetalButton variant="gold" onClick={handleSubmitRating} className="w-full">
                                <Send size={16} className="mr-2" /> Submit Rating
                            </MetalButton>
                        </div>
                    )}

                    {/* Rating submitted confirmation — shows after successfully submitting a rating */}
                    {ratingSubmitted && (
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                <CheckCircle size={20} />
                                <span className="font-medium">Thank you for your rating!</span>
                            </div>
                        </div>
                    )}

                    {/* Existing Reviews Section — shows all ratings/reviews left by other travelers.
                        Each review has star display, date, and optional comment text. */}
                    {trip.ratings && trip.ratings.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2 mb-4">
                                <Star className="text-amber-500" size={18} />
                                Reviews ({trip.ratings.length})
                            </h3>
                            <div className="space-y-3">
                                {trip.ratings.map((rating) => (
                                    <div key={rating.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} fill={i < rating.rating ? "gold" : "none"} className={i < rating.rating ? "text-amber-400" : "text-slate-300"} />
                                                ))}
                                            </div>
                                            <span className="text-xs text-slate-400">{new Date(rating.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {rating.comment && <p className="text-sm text-slate-600 dark:text-slate-300">{rating.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Booking Sidebar — sticky on desktop so it follows as you scroll.
                    This is where the price, key info, and booking button live. */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 sticky top-24">
                        {/* Price display */}
                        <div className="mb-4">
                            <span className="text-xs text-slate-400">{commonT.perPerson}</span>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(trip.price)}</p>
                        </div>

                        {/* Quick info summary */}
                        <div className="space-y-3 mb-6 text-sm">
                            <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                <span>Duration</span>
                                <span className="font-medium dark:text-white">{trip.durationDays} days</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                <span>Spots left</span>
                                <span className="font-medium dark:text-white">{spotsLeft} of {trip.maxSeats}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                <span>Start date</span>
                                <span className="font-medium dark:text-white">{new Date(trip.startDate).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Booking Action Area — different states depending on user role and booking status:
                            1. Guide who created this trip -> "Organizer" badge + delete button
                            2. Already booked -> "Booked" badge + e-ticket link
                            3. Just booked (success) -> green "Booked" confirmation
                            4. Booking failed (error) -> red "Insufficient Funds" message
                            5. Default -> "Book Now" button (disabled if no spots or no funds) */}
                        {isOrganizer ? (
                            <div className="space-y-2">
                                <MetalButton variant="default" disabled className="w-full">{t.organizer}</MetalButton>
                                <button
                                    onClick={handleDelete}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-red-200 dark:border-red-800"
                                >
                                    <Trash2 size={16} /> Delete Trip
                                </button>
                            </div>
                        ) : booking ? (
                            <div className="space-y-2">
                                <MetalButton variant="success" disabled className="w-full">
                                    <CheckCircle size={20} className="mr-2" /> Booked
                                </MetalButton>
                                {/* E-Ticket button — navigates to the ticket page with QR code */}
                                <button
                                    onClick={() => navigate(`/ticket/${booking.id}`)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800"
                                >
                                    View E-Ticket
                                </button>
                            </div>
                        ) : bookingStatus === 'success' ? (
                            <MetalButton variant="success" disabled className="w-full">
                                <CheckCircle size={20} className="mr-2" /> {t.booked}
                            </MetalButton>
                        ) : bookingStatus === 'error' ? (
                            <MetalButton variant="error" disabled className="w-full">
                                <AlertCircle size={20} className="mr-2" /> {t.insufficientFunds}
                            </MetalButton>
                        ) : (
                            <MetalButton
                                variant="primary"
                                onClick={() => setShowBookingModal(true)}
                                disabled={spotsLeft === 0 || !hasFunds}
                                className="w-full"
                            >
                                {commonT.bookNow}
                            </MetalButton>
                        )}

                        {/* Warning message when the user doesn't have enough wallet balance */}
                        {!hasFunds && !booking && !isOrganizer && (
                            <p className="text-xs text-red-500 mt-2 text-center">Insufficient wallet balance</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Booking Confirmation Modal — pops up when the user clicks "Book Now".
                Shows a summary of the trip, the price, the user's current balance,
                and what their balance will be after booking. Two buttons: Cancel and Confirm. */}
            {showBookingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        <button onClick={() => setShowBookingModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold dark:text-white mb-4">Confirm Booking</h2>

                        {/* Trip preview card inside the modal */}
                        <div className="flex items-center gap-3 mb-4 bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
                            <img src={trip.images[0]} alt={trip.title} className="w-16 h-12 rounded-lg object-cover" />
                            <div>
                                <p className="font-semibold dark:text-white text-sm">{trip.title}</p>
                                <p className="text-xs text-slate-400">{trip.location}</p>
                            </div>
                        </div>

                        {/* Price breakdown — shows trip price, current balance, and remaining balance */}
                        <div className="space-y-2 mb-6 text-sm">
                            <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                <span>Trip price</span>
                                <span className="font-medium dark:text-white">{formatCurrency(trip.price)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                <span>Your balance</span>
                                <span className="font-medium dark:text-white">{formatCurrency(user.walletBalance)}</span>
                            </div>
                            <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
                                <span className="font-medium dark:text-white">After booking</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(user.walletBalance - trip.price)}</span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBookingModal(false)}
                                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                {commonT.cancel}
                            </button>
                            <MetalButton variant="success" onClick={handleBook} className="flex-1">
                                {commonT.confirm}
                            </MetalButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
