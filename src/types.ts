export type Role = 'traveler' | 'guide';
export type Language = 'en' | 'ru' | 'uz';
export type Theme = 'light' | 'dark' | 'system';

export interface User {
    id: string;
    name: string;
    avatar: string;
    role: Role;
    walletBalance: number;
    walletEscrow: number;
    isVerified: boolean;
    guideLevel?: number; // 1-5
    completedTrips: number;
    rating: number;
    memberSince: string;
}

export interface TripRating {
    id: string;
    raterId: string;    // User who rated
    guideId: string;    // User being rated (guide)
    tripId: string;
    rating: number;     // 1-5 stars
    comment?: string;
    createdAt: string;
}

export interface Booking {
    id: string;
    travelerId: string; // Traveler who booked
    tripId: string;
    bookedAt: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    hasRated: boolean;  // Whether the traveler has rated this trip
}

export interface Trip {
    id: string;
    guideId: string;
    title: string;
    description: string;
    location: string;
    price: number;
    maxSeats: number;
    bookedSeats: number;
    startDate: string;  // ISO date
    endDate?: string;   // ISO date (optional, calculated from duration if not set)
    durationDays: number;
    difficulty: 'easy' | 'moderate' | 'hard';
    category: 'hiking' | 'camping' | 'sightseeing';
    images: string[];   // Up to 9 images (URLs or base64)
    distanceKm: number;
    altitudeGainM: number;
    weather?: WeatherForecast;
    ratings?: TripRating[];
    averageRating?: number;
    aiRecommendations?: string; // AI-generated tips based on weather/conditions
}

export interface WeatherForecast {
    temp: number;
    condition: string; // 'Sunny', 'Cloudy', 'Rain', 'Snow', etc.
    icon: string;
    forecast?: DayForecast[];
}

export interface DayForecast {
    date: string;
    temp: number;
    condition: string;
    icon: string;
}

export interface Message {
    id: string;
    senderId: string;
    receiverId?: string; // If private
    groupId?: string; // If group chat
    content: string;
    timestamp: string;
    read: boolean;
}

export interface ChatPreview {
    id: string; // userId or groupId
    name: string;
    avatar: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
    isGroup: boolean;
    online?: boolean;
}
