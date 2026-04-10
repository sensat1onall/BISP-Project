// =============================================================================
// api.ts — API client for communicating with our Express backend
// =============================================================================
// This file provides a typed API client that all frontend code uses to talk to the
// backend server. The key reason we have a backend at all (instead of calling APIs
// directly from the browser) is to hide the Gemini API key. If we called Google's
// Generative AI API directly from the frontend, anyone could open DevTools and steal
// our API key. By proxying AI calls through our Express server, the API key stays
// safely on the server and never touches the browser.
//
// The apiRequest function handles auth headers, error parsing, and base URL resolution
// so individual API calls stay clean and simple.
// =============================================================================

// Figure out where the backend lives. In production, the frontend and backend are
// served from the same origin so we just use '/api'. In development, Vite runs on
// port 5173 and our Express server runs on port 3001, so we need the full URL.
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// Generic request wrapper that handles all the boilerplate: setting the auth token
// from localStorage, parsing JSON responses, and throwing meaningful errors.
// Every API call in the app goes through this function.
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Grab the JWT token we stored after login — this is how the backend knows who's calling
    const token = localStorage.getItem('safargo_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options?.headers },
    });

    // If the request failed, try to extract a meaningful error message from the response body.
    // If the body isn't valid JSON (like a 502 gateway error), fall back to a generic message.
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
}

// All AI-related API calls, proxied through our backend to keep the Gemini API key secret.
// Each method corresponds to an endpoint in server/src/routes/ai.ts.
export const aiApi = {
    // Asks Gemini to generate trip details (description, difficulty, distance, etc.)
    // based on just a title and location. This is used in the trip creation form to
    // auto-fill fields so guides don't have to manually enter everything.
    generateTrip: (title: string, location: string) =>
        apiRequest<{
            description: string;
            durationDays: number;
            difficulty: 'easy' | 'moderate' | 'hard';
            distanceKm: number;
            altitudeGainM: number;
            category: 'hiking' | 'camping' | 'sightseeing';
            bestSeason: string;
            suggestedPrice?: number;
        }>('/ai/generate-trip', {
            method: 'POST',
            body: JSON.stringify({ title, location }),
        }),

    // Fetches AI-generated weather data and packing recommendations for a specific trip
    // date range. Since we don't use a real weather API, Gemini generates realistic
    // seasonal weather data for Uzbekistan locations.
    getWeather: (location: string, startDate: string, endDate: string) =>
        apiRequest<{
            temp: number;
            condition: string;
            icon: string;
            forecast: Array<{ date: string; temp: number; condition: string; icon: string }>;
            recommendations: string;
        }>('/ai/weather', {
            method: 'POST',
            body: JSON.stringify({ location, startDate, endDate }),
        }),

    // Simpler weather forecast without date range — just gives a general 3-day outlook.
    // This is the older endpoint kept around for backward compatibility with some components.
    getWeatherForecast: (location: string) =>
        apiRequest<{
            temp: number;
            condition: string;
            forecast?: Array<{ day: string; temp: number; icon: string }>;
        }>('/ai/weather-forecast', {
            method: 'POST',
            body: JSON.stringify({ location }),
        }),

    // Generates a friendly welcome message for trip group chats. The AI tailors packing
    // tips based on the trip's location and difficulty level.
    getChatWelcome: (tripName: string, location: string, difficulty: string) =>
        apiRequest<{ message: string }>('/ai/chat-welcome', {
            method: 'POST',
            body: JSON.stringify({ tripName, location, difficulty }),
        }),

    // Creates a detailed day-by-day, hour-by-hour itinerary for a trip. Guides can use
    // this to plan out activities, meal breaks, and rest stops for their group.
    generateItinerary: (title: string, location: string, durationDays: number, difficulty: string) =>
        apiRequest<{
            days: Array<{
                day: number;
                title: string;
                activities: Array<{ time: string; activity: string; description: string }>;
            }>;
            packingList: string[];
            safetyTips: string;
        }>('/ai/generate-itinerary', {
            method: 'POST',
            body: JSON.stringify({ title, location, durationDays, difficulty }),
        }),
};
