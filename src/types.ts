// =============================================================================
// types.ts — Central type definitions for the entire SafarGo application
// =============================================================================
// This file is the single source of truth for all TypeScript interfaces and types
// used across the app. Every major entity in SafarGo — users, trips, bookings,
// chat messages, weather data — is defined here. We keep them all in one place
// so that both frontend components and utility functions can import from a single
// location, which makes refactoring way easier and avoids circular dependency issues.
// =============================================================================

// The three roles a user can have in the system. Travelers browse and book trips,
// guides create and lead trips, and admins manage everything from the dashboard.
export type Role = 'traveler' | 'guide' | 'admin';

// We support three languages across the UI — English, Russian, and Uzbek.
// This type is used by the i18n system to enforce only valid language codes.
export type Language = 'en' | 'ru' | 'uz';

// Theme preference for the user — 'system' means we follow the OS dark/light setting.
export type Theme = 'light' | 'dark' | 'system';

// The main User interface. This represents a user profile as it comes from Supabase.
// It's used everywhere — in the auth context, profile page, admin dashboard, chat, etc.
// The walletBalance and walletEscrow fields are for our in-app payment system where
// users pay in UZS. Escrow holds funds that are locked in pending bookings.
export interface User {
    id: string;
    name: string;
    avatar: string;
    role: Role;
    walletBalance: number;
    walletEscrow: number;
    isVerified: boolean;
    isBanned: boolean;
    guideLevel?: number; // 1-5, only set for guides — represents their experience tier
    completedTrips: number;
    rating: number;
    memberSince: string;
}

// Tracks where a user's guide application is in the pipeline.
// 'none' means they haven't applied yet, then it goes pending -> approved/rejected.
export type GuideApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

// When a traveler wants to become a guide, they fill out an application form.
// This interface captures all the data from that form plus the review status.
// The optional userName/userAvatar/userEmail fields are joined from the profiles
// table when admins view the application — we don't store them in the application itself.
export interface GuideApplication {
    id: string;
    userId: string;
    fullName: string;
    surname: string;
    age: number;
    gender: string;
    experience: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    reviewedAt?: string;
    // Joined from profiles for admin view
    userName?: string;
    userAvatar?: string;
    userEmail?: string;
}

// After a trip is completed, travelers can leave a rating for the guide.
// This feeds into the guide's overall rating and helps other travelers decide
// who to book with. The raterId is the traveler, guideId is the guide being rated.
export interface TripRating {
    id: string;
    raterId: string;    // User who rated
    guideId: string;    // User being rated (guide)
    tripId: string;
    rating: number;     // 1-5 stars
    comment?: string;
    createdAt: string;
}

// A booking represents a traveler reserving a spot on a trip. The status flow is:
// pending -> confirmed (guide accepts) -> completed (trip finished) or cancelled.
// hasRated tracks whether the traveler already left a review, so we don't show
// the rating prompt twice.
export interface Booking {
    id: string;
    travelerId: string; // Traveler who booked
    tripId: string;
    bookedAt: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    hasRated: boolean;  // Whether the traveler has rated this trip
}

// The big one — this is the Trip entity. Guides create these, travelers browse and book them.
// Each trip has a location in Uzbekistan, pricing in UZS, seat limits, difficulty level, etc.
// The images array can hold up to 9 photos (stored as URLs or base64 strings).
// Weather and AI recommendations are fetched on-demand and cached here so we don't
// re-call the Gemini API every time someone views the trip details page.
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
    isArchived?: boolean;
}

// Basic weather data that gets displayed on trip cards and the trip details page.
// The forecast array holds day-by-day predictions so we can show a little weather timeline.
export interface WeatherForecast {
    temp: number;
    condition: string; // 'Sunny', 'Cloudy', 'Rain', 'Snow', etc.
    icon: string;
    forecast?: DayForecast[];
}

// A single day's weather within a multi-day forecast. Used inside WeatherForecast.forecast[].
export interface DayForecast {
    date: string;
    temp: number;
    condition: string;
    icon: string;
}

// Chat groups are created automatically when a trip gets its first booking.
// Each trip has exactly one chat group where the guide and all booked travelers
// can coordinate plans, share updates, and ask questions before the trip.
export interface ChatGroup {
    id: string;
    tripId: string;
    name: string;
    image: string;
    createdAt: string;
}

// Tracks who is in a chat group. Members are added when they book a trip
// and the guide is always a member of their own trip's chat.
export interface ChatMember {
    id: string;
    chatId: string;
    userId: string;
    joinedAt: string;
}

// A single message in a chat group. The isAi flag is true when the message
// was generated by our AI assistant (like the welcome message with packing tips).
// We store senderName and senderAvatar directly on the message so we don't have
// to join against the profiles table every time we load chat history.
export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    content: string;
    createdAt: string;
    isAi: boolean;
}

// This is the lightweight version of a chat group used in the chat list sidebar.
// Instead of loading all messages, we just show the last message preview, timestamp,
// and member count so the list loads fast.
export interface ChatPreview {
    id: string;
    name: string;
    image: string;
    lastMessage: string;
    lastMessageTime: string;
    memberCount: number;
}
