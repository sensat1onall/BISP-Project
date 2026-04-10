// =============================================================================
// CreateTrip.tsx — The trip creation form for guides in SafarGo.
// This is a pretty feature-rich page that lets guides create new trips with
// AI assistance. It includes: AI auto-fill (generates description, difficulty,
// category from just a title + location), AI-powered weather forecasting for
// the trip dates, AI-generated itinerary with day-by-day activities, multi-image
// upload, and all the standard form fields like price, seats, dates, etc.
// Only users with the "guide" role can access this page — everyone else gets
// redirected to apply on their profile.
// =============================================================================

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { generateTripContent, getWeatherWithRecommendations, WeatherWithRecommendations } from '../lib/gemini';
import { aiApi } from '../lib/api';
import {
    Sparkles, MapPin, DollarSign, Users, Mountain, ArrowLeft, Loader2,
    Calendar, Ruler, ImagePlus, X, CloudSun, AlertTriangle, Check, ClipboardList, Clock, ShieldCheck, Backpack
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Trip } from '../types';
import { MetalButton } from '../components/ui/liquid-glass-button';

export const CreateTrip = () => {
    const { user, addTrip, language } = useApp();
    const navigate = useNavigate();
    const t = translations[language].create;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Guard: only guides can create trips.
    // If a regular traveler somehow navigates here (e.g., typing the URL directly),
    // we show a friendly message and link them to the profile page where they can apply.
    if (user.role !== 'guide') {
        return (
            <div className="py-20 text-center">
                <p className="text-xl font-semibold dark:text-white mb-2">Guide Access Required</p>
                <p className="text-slate-400 text-sm mb-4">You need to be an approved guide to create trips.</p>
                <button onClick={() => navigate('/profile')} className="text-emerald-600 hover:underline text-sm">
                    Go to Profile to apply
                </button>
            </div>
        );
    }

    // -- Loading states for the various AI features --
    // Each AI feature has its own loading flag so we can show spinners independently
    const [isGenerating, setIsGenerating] = useState(false);           // AI auto-fill for description
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);   // Weather forecast fetch
    const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false); // AI itinerary generation

    // Weather data returned from the Gemini API — includes temp, forecast, and packing recommendations
    const [weatherData, setWeatherData] = useState<WeatherWithRecommendations | null>(null);

    // AI-generated itinerary with day-by-day activities, packing list, and safety tips
    const [itinerary, setItinerary] = useState<{
        days: Array<{ day: number; title: string; activities: Array<{ time: string; activity: string; description: string }> }>;
        packingList: string[];
        safetyTips: string;
    } | null>(null);

    // -- Main form state --
    // All the trip details live here. Some fields get auto-filled by AI, others are manual.
    const [formData, setFormData] = useState({
        title: '',
        location: '',
        price: 0,
        maxSeats: 0,
        description: '',
        difficulty: 'moderate' as 'easy' | 'moderate' | 'hard',
        category: 'hiking' as 'hiking' | 'camping' | 'sightseeing',
        distanceKm: 0,
        altitudeGainM: 0,
        startDate: '',
        endDate: '',
        images: [] as string[]
    });

    // Helper to handle integer inputs — strips leading zeros so "007" becomes "7".
    // Without this, number inputs can behave weirdly with leading zeros.
    const handleNumberInput = (field: keyof typeof formData, value: string) => {
        const cleanValue = value.replace(/^0+/, '');
        const numValue = parseInt(cleanValue || '0', 10);
        setFormData(prev => ({ ...prev, [field]: numValue }));
    };

    // Similar helper for float inputs (like distance in km which can be 12.5)
    const handleFloatInput = (field: keyof typeof formData, value: string) => {
        const numValue = parseFloat(value || '0');
        setFormData(prev => ({ ...prev, [field]: isNaN(numValue) ? 0 : numValue }));
    };

    // AI Auto-Fill — the main "Smart Assist" feature.
    // Given just a title and location, this calls the Gemini API to generate a full description,
    // suggest difficulty level, category, distance, altitude gain, and even a suggested price.
    // The guide can then tweak these values manually if the AI got something wrong.
    const handleAutoFill = async () => {
        if (!formData.title || !formData.location) return;

        setIsGenerating(true);
        try {
            const content = await generateTripContent(formData.title, formData.location);
            if (content) {
                setFormData(prev => ({
                    ...prev,
                    description: content.description,
                    difficulty: content.difficulty || 'moderate',
                    category: content.category || 'hiking',
                    distanceKm: content.distanceKm || 5,
                    altitudeGainM: content.altitudeGainM || 100,
                    price: content.suggestedPrice || prev.price
                }));
            }
        } catch (error) {
            console.error("Failed to generate content");
        } finally {
            setIsGenerating(false);
        }
    };

    // Weather Fetch — calls Gemini with the location and date range to get a forecast.
    // The recommendations from this (like "bring rain gear") get saved into the trip
    // and shown on the TripDetails page as packing tips.
    const handleGetWeather = async () => {
        if (!formData.location || !formData.startDate || !formData.endDate) return;

        setIsLoadingWeather(true);
        try {
            const weather = await getWeatherWithRecommendations(
                formData.location,
                formData.startDate,
                formData.endDate
            );
            setWeatherData(weather);
        } catch (error) {
            console.error("Failed to get weather");
        } finally {
            setIsLoadingWeather(false);
        }
    };

    // AI Itinerary Generation — creates a detailed day-by-day schedule with activities,
    // time slots, a packing list, and safety tips. Uses the backend AI API endpoint.
    // The duration is calculated from the start/end dates so the AI knows how many days to plan for.
    const handleGenerateItinerary = async () => {
        if (!formData.title || !formData.location) return;
        setIsGeneratingItinerary(true);
        try {
            const duration = formData.startDate && formData.endDate
                ? Math.max(1, Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)))
                : 1;
            const data = await aiApi.generateItinerary(
                formData.title,
                formData.location,
                duration,
                formData.difficulty
            );
            setItinerary(data);
        } catch {
            console.error('Itinerary generation failed');
        } finally {
            setIsGeneratingItinerary(false);
        }
    };

    // Image Upload Handler — reads selected files as base64 data URLs and adds them to form state.
    // We cap at 9 images total. If the user selects more files than remaining slots, we just
    // take the first N that fit. The hidden file input is triggered by clicking the "Add" button.
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Figure out how many more images we can accept (max 9 total)
        const remainingSlots = 9 - formData.images.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, base64]
                }));
            };
            reader.readAsDataURL(file);
        });

        // Reset the file input so the same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove a specific image from the upload list by its index
    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    // Calculate trip duration in days from the start and end dates.
    // Returns at least 1 day even if start and end are the same date.
    const calculateDuration = () => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(1, diffDays);
        }
        return 1;
    };

    // Form submission — builds the Trip object and adds it to the global state.
    // If no images were uploaded, we use a fallback Unsplash placeholder.
    // The weather recommendations (if fetched) get attached to the trip for display on the details page.
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const durationDays = calculateDuration();

        const newTrip: Trip = {
            id: crypto.randomUUID(),
            guideId: user.id,
            title: formData.title,
            description: formData.description,
            location: formData.location,
            price: formData.price,
            maxSeats: formData.maxSeats,
            bookedSeats: 0,
            startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
            endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
            durationDays: durationDays,
            difficulty: formData.difficulty,
            category: formData.category,
            distanceKm: formData.distanceKm,
            altitudeGainM: formData.altitudeGainM,
            images: formData.images.length > 0
                ? formData.images
                : ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop'],
            aiRecommendations: weatherData?.recommendations,
            ratings: [],
            averageRating: undefined
        };
        addTrip(newTrip);
        navigate('/');
    };

    // Get today's date string for the date inputs' min attribute so guides can't create trips in the past
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
            {/* Header — sticky at the top with a back button */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold dark:text-white">{t.title}</h1>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-lg mx-auto">
                {/* AI Smart Assist Section — wrapped in a gradient border to make it stand out.
                    This is where the guide enters the trip title and location, and can click
                    "Auto-Fill" to have AI generate the description and other details. */}
                <div className="p-0.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
                    <div className="bg-white dark:bg-slate-900 rounded-[14px] p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold dark:text-white flex items-center gap-2">
                                <Sparkles className="text-emerald-500" size={18} />
                                Smart Assist
                            </h2>
                            {/* Auto-Fill button — disabled until both title and location are entered */}
                            <button
                                type="button"
                                onClick={handleAutoFill}
                                disabled={isGenerating || !formData.title || !formData.location}
                                className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : null}
                                {isGenerating ? t.generating : t.autoFill}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Trip title input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.tripTitle}</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    placeholder="e.g., Hiking in Chimgan"
                                    required
                                />
                            </div>
                            {/* Location input with a map pin icon */}
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.location}</label>
                                <div className="relative">
                                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                                        className="w-full pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        placeholder="Region or City"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date Selection Section — start and end date pickers with auto-calculated duration.
                    Once dates and location are set, a "Get Weather" button appears to fetch forecasts. */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-4">
                    <h3 className="font-semibold dark:text-white flex items-center gap-2">
                        <Calendar className="text-blue-500" size={18} />
                        Trip Dates
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                min={today}
                                onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                min={formData.startDate || today}
                                onChange={(e) => setFormData(p => ({ ...p, endDate: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 dark:text-white"
                                required
                            />
                        </div>
                    </div>
                    {/* Auto-calculated duration display — shows up once both dates are set */}
                    {formData.startDate && formData.endDate && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Duration: <span className="font-semibold text-emerald-600">{calculateDuration()} day(s)</span>
                        </p>
                    )}

                    {/* Weather Forecast Button — only appears when location + both dates are filled.
                        Fetches AI weather predictions and packing recommendations from Gemini. */}
                    {formData.location && formData.startDate && formData.endDate && (
                        <button
                            type="button"
                            onClick={handleGetWeather}
                            disabled={isLoadingWeather}
                            className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                        >
                            {isLoadingWeather ? <Loader2 size={16} className="animate-spin" /> : <CloudSun size={16} />}
                            {isLoadingWeather ? 'Getting weather...' : 'Get Weather & Recommendations'}
                        </button>
                    )}

                    {/* Weather Display — shows after the forecast is fetched.
                        Includes current temp, multi-day forecast cards, and packing recommendations. */}
                    {weatherData && (
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-slate-800 dark:text-white">{weatherData.temp}°C</span>
                                <span className="text-slate-600 dark:text-slate-300">{weatherData.condition}</span>
                            </div>
                            {weatherData.forecast && weatherData.forecast.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {weatherData.forecast.map((day, idx) => (
                                        <div key={idx} className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-center">
                                            <p className="text-xs text-slate-500">{day.date}</p>
                                            <p className="font-semibold dark:text-white">{day.temp}°</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* AI-generated packing recommendations based on weather conditions */}
                            {weatherData.recommendations && (
                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-amber-800 dark:text-amber-200">{weatherData.recommendations}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* AI Itinerary Section — generates a full day-by-day schedule using AI.
                    Includes time-slotted activities, a packing checklist, and safety tips.
                    The guide needs to have entered a title and location before this can be generated. */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold dark:text-white flex items-center gap-2">
                            <ClipboardList className="text-indigo-500" size={18} />
                            AI Trip Itinerary
                        </h3>
                        <button
                            type="button"
                            onClick={handleGenerateItinerary}
                            disabled={!formData.title || !formData.location || isGeneratingItinerary}
                            aria-label="Generate trip itinerary with AI"
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isGeneratingItinerary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isGeneratingItinerary ? 'Generating...' : 'Generate Itinerary'}
                        </button>
                    </div>

                    {/* Placeholder text shown before any itinerary is generated */}
                    {!itinerary && !isGeneratingItinerary && (
                        <p className="text-xs text-slate-400">Enter a trip title and location, then generate a detailed hour-by-hour schedule with AI.</p>
                    )}

                    {/* Generated itinerary display — each day has a card with time-slotted activities */}
                    {itinerary && (
                        <div className="space-y-4">
                            {itinerary.days.map((day) => (
                                <div key={day.day} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                                    <h4 className="font-semibold text-sm dark:text-white mb-3 flex items-center gap-2">
                                        <Calendar size={14} className="text-indigo-500" />
                                        {day.title}
                                    </h4>
                                    <div className="space-y-2">
                                        {day.activities.map((act, idx) => (
                                            <div key={idx} className="flex gap-3 text-sm">
                                                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-mono text-xs min-w-[50px]">
                                                    <Clock size={10} />
                                                    {act.time}
                                                </div>
                                                <div>
                                                    <p className="font-medium dark:text-white">{act.activity}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{act.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Packing list — displayed as pill-shaped tags */}
                            {itinerary.packingList.length > 0 && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                                    <h4 className="font-semibold text-sm text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                                        <Backpack size={14} /> Packing List
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {itinerary.packingList.map((item, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Safety tips from the AI */}
                            {itinerary.safetyTips && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                                    <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                                        <ShieldCheck size={14} /> Safety Tips
                                    </h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-300">{itinerary.safetyTips}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Trip Photos Section — allows uploading up to 9 images.
                    Images are stored as base64 data URLs in the form state.
                    Each uploaded image shows a hover-to-delete button. */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-4">
                    <h3 className="font-semibold dark:text-white flex items-center gap-2">
                        <ImagePlus className="text-purple-500" size={18} />
                        Trip Photos ({formData.images.length}/9)
                    </h3>

                    {/* Image Grid — shows uploaded images + an "Add" button if under the limit */}
                    <div className="grid grid-cols-3 gap-2">
                        {formData.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                                <img src={img} alt={`Trip ${idx + 1}`} className="w-full h-full object-cover" />
                                {/* Delete button appears on hover */}
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        {/* Add Image Button — triggers the hidden file input */}
                        {formData.images.length < 9 && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                            >
                                <ImagePlus size={24} className="text-slate-400" />
                                <span className="text-xs text-slate-400">Add</span>
                            </button>
                        )}
                    </div>

                    {/* Hidden file input — we click it programmatically from the Add button above */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                    <p className="text-xs text-slate-400">Select images from your device. Maximum 9 photos.</p>
                </div>

                {/* Trip Details Section — price, seats, distance, altitude, difficulty, category, description.
                    Some of these may have been auto-filled by the AI Smart Assist feature. */}
                <div className="space-y-4">
                    {/* Price and max seats — side by side */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.price}</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="number"
                                    value={formData.price.toString()}
                                    onChange={(e) => handleNumberInput('price', e.target.value)}
                                    className="w-full pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white"
                                    min="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t.seats}</label>
                            <div className="relative">
                                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="number"
                                    value={formData.maxSeats.toString()}
                                    onChange={(e) => handleNumberInput('maxSeats', e.target.value)}
                                    className="w-full pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Distance and altitude gain — these can be auto-filled by AI */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Distance (km)</label>
                            <div className="relative">
                                <Ruler size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.distanceKm.toString()}
                                    onChange={(e) => handleFloatInput('distanceKm', e.target.value)}
                                    className="w-full pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white"
                                    min="0"
                                    placeholder="12.5"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Altitude Gain (m)</label>
                            <div className="relative">
                                <Mountain size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="number"
                                    value={formData.altitudeGainM.toString()}
                                    onChange={(e) => handleNumberInput('altitudeGainM', e.target.value)}
                                    className="w-full pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white"
                                    min="0"
                                    placeholder="850"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Difficulty and category dropdowns — can also be set by AI auto-fill */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Difficulty</label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData(p => ({ ...p, difficulty: e.target.value as 'easy' | 'moderate' | 'hard' }))}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white appearance-none"
                            >
                                <option value="easy">Easy</option>
                                <option value="moderate">Moderate</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as 'hiking' | 'camping' | 'sightseeing' }))}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white appearance-none"
                            >
                                <option value="hiking">Hiking</option>
                                <option value="camping">Camping</option>
                                <option value="sightseeing">Sightseeing</option>
                            </select>
                        </div>
                    </div>

                    {/* Description textarea — often auto-filled by AI but fully editable */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 dark:text-white h-32 resize-none"
                            placeholder="Describe the adventure..."
                        />
                    </div>
                </div>

                {/* Submit Button — publishes the trip and navigates back to the home page */}
                <div className="pt-4 flex justify-center">
                    <MetalButton
                        variant="success"
                        type="submit"
                        className="w-full"
                    >
                        <Check size={20} className="mr-2" />
                        {t.publish}
                    </MetalButton>
                    {/* Friendly warning if the price is set to 0 — maybe the guide forgot to set it */}
                    {formData.price === 0 && (
                        <p className="text-center text-xs text-amber-500 mt-2">Warning: Price is set to 0 (Free)</p>
                    )}
                </div>
            </form>
        </div>
    );
};
