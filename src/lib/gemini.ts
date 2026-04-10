// =============================================================================
// gemini.ts — Frontend AI wrapper functions
// =============================================================================
// This file provides friendly wrapper functions around the AI API calls defined
// in api.ts. The idea is that components don't need to deal with error handling
// or fallback logic — they just call these functions and get back usable data.
//
// Every function here has a try/catch with sensible fallback values, so the app
// never crashes just because the AI service is temporarily down or the API key
// ran out of quota. If Gemini fails, we return safe defaults (like generic weather
// data or a simple welcome message) and the user experience stays smooth.
// =============================================================================

import { aiApi } from './api';

// The shape of what comes back from the trip generation endpoint.
// This mirrors the response type in api.ts — we define it here too so that
// components importing from gemini.ts don't also need to import from api.ts.
export interface TripContentResult {
    description: string;
    durationDays: number;
    difficulty: 'easy' | 'moderate' | 'hard';
    distanceKm: number;
    altitudeGainM: number;
    category: 'hiking' | 'camping' | 'sightseeing';
    bestSeason: string;
    suggestedPrice?: number;
}

// Weather response that includes AI-generated packing and safety recommendations
// alongside the forecast data. Used on the trip details page.
export interface WeatherWithRecommendations {
    temp: number;
    condition: string;
    icon: string;
    forecast: Array<{
        date: string;
        temp: number;
        condition: string;
        icon: string;
    }>;
    recommendations: string;
}

// Simpler weather forecast type for the card-level weather display.
// Doesn't include recommendations — just temp, condition, and a short forecast.
export interface AIWeatherForecast {
    temp: number;
    condition: string;
    forecast?: Array<{
        day: string;
        temp: number;
        icon: string;
    }>;
}

// Generates a full trip description and metadata from just a title and location.
// Used in the CreateTrip form — when a guide types a title and picks a location,
// we call this to auto-populate description, difficulty, distance, altitude, etc.
// If it fails, we re-throw so the form can show an error message to the user.
export const generateTripContent = async (title: string, location: string): Promise<TripContentResult | null> => {
    try {
        return await aiApi.generateTrip(title, location);
    } catch (error) {
        console.error('Trip generation error:', error);
        throw error;
    }
};

// Fetches weather data and recommendations for a trip's specific date range.
// If the AI call fails (network issue, quota exceeded, etc.), we return safe
// fallback data — 22 degrees, sunny, with a generic "check local weather" tip.
// This way the trip details page still renders properly even without real weather.
export const getWeatherWithRecommendations = async (
    location: string,
    startDate: string,
    endDate: string
): Promise<WeatherWithRecommendations | null> => {
    try {
        return await aiApi.getWeather(location, startDate, endDate);
    } catch (error) {
        console.error('Weather error:', error);
        return {
            temp: 22,
            condition: 'Sunny',
            icon: 'sun',
            forecast: [],
            recommendations: 'Check local weather conditions before your trip and pack accordingly.',
        };
    }
};

// Generates a welcome message for a trip's group chat. The AI writes something
// friendly and specific to the trip, with relevant packing tips. If the AI is
// unavailable, we return a perfectly fine hardcoded welcome message instead.
export const getChatWelcomeMessage = async (tripName: string, location: string, difficulty: string): Promise<string> => {
    try {
        const result = await aiApi.getChatWelcome(tripName, location, difficulty);
        return result.message;
    } catch (error) {
        console.error('Chat welcome error:', error);
        return `Welcome to ${tripName}! Pack comfortable shoes, sunscreen, and plenty of water. Have a great adventure! 🏔️`;
    }
};

// Gets a simple 3-day weather forecast for a location. Used on trip cards in the
// browse list where we just need a quick temperature and condition overview, not
// the full detailed forecast with recommendations. Falls back to sunny/22 degrees.
export const getAIWeatherForecast = async (location: string): Promise<AIWeatherForecast | null> => {
    try {
        return await aiApi.getWeatherForecast(location);
    } catch (error) {
        console.error('Weather forecast error:', error);
        return {
            temp: 22,
            condition: 'Sunny',
            forecast: [],
        };
    }
};
