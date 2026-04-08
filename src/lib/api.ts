const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('safargo_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options?.headers },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
}

// AI (proxied through backend - API key stays server-side)
export const aiApi = {
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

    getWeatherForecast: (location: string) =>
        apiRequest<{
            temp: number;
            condition: string;
            forecast?: Array<{ day: string; temp: number; icon: string }>;
        }>('/ai/weather-forecast', {
            method: 'POST',
            body: JSON.stringify({ location }),
        }),

    getChatWelcome: (tripName: string, location: string, difficulty: string) =>
        apiRequest<{ message: string }>('/ai/chat-welcome', {
            method: 'POST',
            body: JSON.stringify({ tripName, location, difficulty }),
        }),

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
