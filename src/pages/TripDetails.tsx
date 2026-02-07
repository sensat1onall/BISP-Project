import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { getAIWeatherForecast } from '../lib/gemini';
import { Trip, WeatherForecast } from '../types';
import { formatCurrency } from '../utils/format';
import { ArrowLeft, Clock, Mountain, Map as MapIcon, Calendar, Info, CloudSun, CheckCircle, AlertCircle, Star, Send, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/cn';

export const TripDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { trips, user, bookTrip, language, getUserBookingForTrip, rateTrip } = useApp();
    const t = translations[language].trip;
    const commonT = translations[language].common;

    const trip = trips.find(t => t.id === id);
    const [weather, setWeather] = useState<any>(null);
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Rating state
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    const booking = trip ? getUserBookingForTrip(trip.id) : undefined;
    const canRate = booking?.status === 'completed' && !booking?.hasRated;

    useEffect(() => {
        if (trip) {
            getAIWeatherForecast(trip.location).then(data => {
                if (data) setWeather(data);
            });
        }
    }, [trip]);

    if (!trip) return <div className="p-8 text-center">Trip not found</div>;

    const isOrganizer = user.id === trip.guideId;
    const hasFunds = user.walletBalance >= trip.price;
    const spotsLeft = trip.maxSeats - trip.bookedSeats;

    const handleBook = () => {
        if (bookTrip(trip.id)) {
            setBookingStatus('success');
            setTimeout(() => setBookingStatus('idle'), 3000);
        } else {
            setBookingStatus('error');
            setTimeout(() => setBookingStatus('idle'), 3000);
        }
    };

    const handleSubmitRating = () => {
        if (rateTrip(trip.id, ratingValue, ratingComment)) {
            setRatingSubmitted(true);
        }
    };

    // Star rating component
    const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => {
        return (
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
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28 relative">
            {/* Hero Section */}
            <div className="relative h-72 lg:h-96">
                <img src={trip.images[0]} alt={trip.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>

                {/* Rating Badge */}
                {trip.averageRating && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full">
                        <Star size={16} fill="gold" className="text-amber-400" />
                        <span className="text-white font-semibold">{trip.averageRating.toFixed(1)}</span>
                        <span className="text-white/70 text-sm">({trip.ratings?.length || 0})</span>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 p-6 w-full">
                    <span className="inline-block px-3 py-1 bg-emerald-500 rounded-full text-xs font-bold text-white mb-2 uppercase tracking-wide">
                        {trip.category}
                    </span>
                    <h1 className="text-3xl font-bold text-white mb-1 shadow-sm leading-tight">{trip.title}</h1>
                    <div className="flex items-center text-slate-200 text-sm gap-2">
                        <MapIcon size={16} />
                        {trip.location}
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="px-5 -mt-6 relative z-10">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 mb-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center">
                            <Clock size={20} className="text-blue-500 mb-1" />
                            <span className="text-xs text-slate-400">{commonT.duration}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{trip.durationDays}d</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center">
                            <MapIcon size={20} className="text-emerald-500 mb-1" />
                            <span className="text-xs text-slate-400">{commonT.distance}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{trip.distanceKm}km</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center">
                            <Mountain size={20} className="text-purple-500 mb-1" />
                            <span className="text-xs text-slate-400">{commonT.altitude}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{trip.altitudeGainM}m</span>
                        </div>
                    </div>

                    <h2 className="font-bold text-lg dark:text-white mb-2">Description</h2>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-sm">{trip.description}</p>

                    {/* AI Recommendations */}
                    {trip.aiRecommendations && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-1">Packing Tips</h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-300">{trip.aiRecommendations}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Weather Section (AI) */}
                    {weather && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-blue-100 dark:border-slate-600 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <CloudSun className="text-yellow-500" />
                                    {t.weatherTitle}
                                </h3>
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{weather.temp}°C</span>
                            </div>

                            <div className="flex justify-between divide-x divide-blue-200 dark:divide-slate-600">
                                {weather.forecast?.map((day: any, i: number) => (
                                    <div key={i} className="flex-1 flex flex-col items-center text-center px-1">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{day.day}</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{day.temp}°</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rating Section - Only show if user can rate */}
                    {canRate && !ratingSubmitted && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 border border-amber-200 dark:border-slate-600 mb-6">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                                <Star className="text-amber-500" />
                                Rate Your Experience
                            </h3>
                            <div className="flex justify-center mb-3">
                                <StarRating value={ratingValue} onChange={setRatingValue} />
                            </div>
                            <textarea
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Share your experience..."
                                className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-600 rounded-lg p-3 text-sm resize-none h-20 dark:text-white mb-3"
                            />
                            <button
                                onClick={handleSubmitRating}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <Send size={16} />
                                Submit Rating
                            </button>
                        </div>
                    )}

                    {ratingSubmitted && (
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                <CheckCircle size={20} />
                                <span className="font-medium">Thank you for your rating!</span>
                            </div>
                        </div>
                    )}

                    {/* Existing Ratings */}
                    {trip.ratings && trip.ratings.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Star className="text-amber-500" size={18} />
                                Reviews ({trip.ratings.length})
                            </h3>
                            <div className="space-y-3">
                                {trip.ratings.slice(0, 5).map((rating) => (
                                    <div key={rating.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={12}
                                                        fill={i < rating.rating ? "gold" : "none"}
                                                        className={i < rating.rating ? "text-amber-400" : "text-slate-300"}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {new Date(rating.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {rating.comment && (
                                            <p className="text-sm text-slate-600 dark:text-slate-300">{rating.comment}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe z-50">
                <div className="max-w-md mx-auto flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400">{commonT.perPerson}</span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(trip.price)}</span>
                    </div>

                    {isOrganizer ? (
                        <button disabled className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold py-3.5 rounded-xl">
                            {t.organizer}
                        </button>
                    ) : booking ? (
                        <button disabled className="flex-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                            <CheckCircle size={20} />
                            Booked
                        </button>
                    ) : (
                        <button
                            onClick={handleBook}
                            disabled={spotsLeft === 0 || (!hasFunds && bookingStatus !== 'success')}
                            className={cn(
                                "flex-1 font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                                bookingStatus === 'success' ? "bg-green-500 text-white" :
                                    bookingStatus === 'error' ? "bg-red-500 text-white" :
                                        !hasFunds ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed" :
                                            "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700"
                            )}
                        >
                            {bookingStatus === 'success' ? (
                                <>
                                    <CheckCircle size={20} />
                                    {t.booked}
                                </>
                            ) : bookingStatus === 'error' ? (
                                <>
                                    <AlertCircle size={20} />
                                    {t.insufficientFunds}
                                </>
                            ) : (
                                <>
                                    {commonT.bookNow}
                                    {spotsLeft < 5 && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md ml-1">{spotsLeft} left</span>}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
