const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

// Auth
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        role: 'traveler' | 'guide' | 'admin';
        walletBalance: number;
        walletEscrow: number;
        isVerified: boolean;
        guideLevel: number;
        completedTrips: number;
        rating: number;
        memberSince: string;
    };
}

export const authApi = {
    register: (name: string, email: string, password: string) =>
        apiRequest<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        }),

    login: (email: string, password: string) =>
        apiRequest<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    getProfile: () =>
        apiRequest<{ user: AuthResponse['user'] }>('/auth/me'),
};

// Admin
export interface AdminUser {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'traveler' | 'guide';
    walletBalance: number;
    walletEscrow: number;
    isVerified: boolean;
    guideLevel: number;
    completedTrips: number;
    rating: number;
    memberSince: string;
}

export interface AdminStats {
    totalUsers: number;
    travelers: number;
    guides: number;
    verifiedGuides: number;
    totalBalance: number;
}

export const adminApi = {
    getUsers: () =>
        apiRequest<{ users: AdminUser[] }>('/admin/users'),

    getStats: () =>
        apiRequest<{ stats: AdminStats }>('/admin/stats'),
};

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
};
