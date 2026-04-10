/**
 * AppContext.tsx - The brain of the entire SafarGo application.
 *
 * This file implements the global state management pattern using React Context API.
 * Instead of Redux or Zustand, we're using a single context provider that wraps the
 * entire app tree. Every component that needs global state calls useApp() to get it.
 *
 * Here's what this context handles:
 *   - Authentication (login, register, Google OAuth, session persistence via Supabase)
 *   - User profile management (role switching, wallet, avatar updates)
 *   - Trip CRUD operations (create, read, update, delete trips in Supabase)
 *   - Booking flow (wallet deduction, seat reservation, chat group auto-creation)
 *   - Guide application system (apply, approve, reject - admin workflow)
 *   - Rating system (rate completed trips, update averages)
 *   - Admin actions (ban users, archive trips, verify guides, manage applications)
 *   - Notifications (in-app notification queue)
 *   - Theme and language preferences (persisted to localStorage)
 *
 * The general pattern is: every function updates the Supabase database first (or fires
 * it off async), then updates the local React state so the UI feels instant. This is
 * an optimistic update approach - the UI reflects changes immediately without waiting
 * for the server roundtrip.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Trip, Language, Theme, Booking, TripRating, GuideApplicationStatus } from '../types';
import { supabase } from '../lib/supabase';
import { getChatWelcomeMessage } from '../lib/gemini';

/**
 * Notification shape for the in-app notification system.
 * These are ephemeral - they live in React state and don't persist to the database.
 * They're used for things like "Trip booked successfully!" or "Welcome back!"
 */
export interface Notification {
    id: string;
    message: string;
    read: boolean;
    createdAt: string;
}

/**
 * The default user object we start with before anyone logs in.
 * Everything is zeroed out / empty. This gets replaced once Supabase
 * confirms a valid session and we load the user's profile.
 */
const DEFAULT_USER: User = {
    id: '',
    name: '',
    avatar: '',
    role: 'traveler',
    walletBalance: 0,
    walletEscrow: 0,
    isVerified: false,
    isBanned: false,
    guideLevel: 0,
    completedTrips: 0,
    rating: 0,
    memberSince: '',
};

/**
 * The full shape of what our context provides. This is the "contract" that
 * every consumer of useApp() can rely on. It's a big interface because this
 * context really is the central nervous system of the app.
 *
 * Grouped roughly by domain:
 *   - Auth: login, register, signInWithGoogle, logout, isAuthenticated, isAuthLoading
 *   - User: user object, updateUser, switchToTraveler/Guide, guideApplicationStatus
 *   - Trips: trips array, addTrip, deleteTrip, updateTrip, refreshTrips
 *   - Bookings: bookings array, bookTrip, refreshBookings, getUserBookingForTrip
 *   - Ratings: rateTrip
 *   - Notifications: notifications array, addNotification, markNotificationsRead
 *   - Preferences: language, theme, setLanguage, setTheme
 *   - Admin: adminBanUser, adminArchiveTrip, adminDeleteTrip, adminVerifyGuide, etc.
 */
interface AppContextType {
    user: User;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
    signInWithGoogle: () => Promise<void>;
    logout: () => void;
    trips: Trip[];
    bookings: Booking[];
    notifications: Notification[];
    language: Language;
    theme: Theme;
    setLanguage: (lang: Language) => void;
    setTheme: (theme: Theme) => void;
    switchToTraveler: () => void;
    switchToGuide: () => void;
    guideApplicationStatus: GuideApplicationStatus;
    submitGuideApplication: (data: { fullName: string; surname: string; age: number; gender: string; experience: string }) => Promise<boolean>;
    bookTrip: (tripId: string) => boolean;
    addTrip: (trip: Trip) => void;
    deleteTrip: (tripId: string) => boolean;
    updateTrip: (tripId: string, updates: Partial<Trip>) => void;
    updateUser: (updates: Partial<User>) => void;
    withdrawFunds: () => void;
    rateTrip: (tripId: string, rating: number, comment?: string) => boolean;
    getUserBookingForTrip: (tripId: string) => Booking | undefined;
    markNotificationsRead: () => void;
    addNotification: (message: string) => void;
    refreshTrips: () => Promise<void>;
    refreshBookings: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    // Admin actions - only usable by users with role === 'admin'
    adminBanUser: (userId: string, ban: boolean) => Promise<void>;
    adminArchiveTrip: (tripId: string, archive: boolean) => Promise<void>;
    adminDeleteTrip: (tripId: string) => Promise<void>;
    adminVerifyGuide: (userId: string, verify: boolean) => Promise<void>;
    adminChangeRole: (userId: string, newRole: 'traveler' | 'guide') => Promise<void>;
    adminApproveApplication: (appId: string, userId: string) => Promise<void>;
    adminRejectApplication: (appId: string) => Promise<void>;
}

// Create the context with undefined as default - we'll throw if someone tries
// to use it outside the provider (see useApp() at the bottom).
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * mapProfile - Converts a raw Supabase "profiles" table row into our frontend User type.
 *
 * Supabase returns snake_case column names (like wallet_balance, is_verified) but our
 * frontend User type uses camelCase (walletBalance, isVerified). This mapper bridges
 * that gap. It also handles null/undefined values with sensible defaults so we don't
 * get crashes from missing database fields.
 *
 * The Record<string, unknown> type is used because Supabase's .select('*') returns
 * a generic object shape that TypeScript doesn't know about at compile time.
 */
function mapProfile(row: Record<string, unknown>): User {
    return {
        id: row.id as string,
        name: row.name as string,
        avatar: row.avatar as string || '',
        role: (row.role as User['role']) || 'traveler',
        walletBalance: Number(row.wallet_balance) || 0,
        walletEscrow: Number(row.wallet_escrow) || 0,
        isVerified: row.is_verified as boolean || false,
        isBanned: row.is_banned as boolean || false,
        guideLevel: Number(row.guide_level) || 0,
        completedTrips: Number(row.completed_trips) || 0,
        rating: Number(row.rating) || 0,
        memberSince: row.member_since as string || '',
    };
}

/**
 * mapTrip - Converts a raw Supabase "trips" table row into our frontend Trip type.
 *
 * Similar to mapProfile but for trips. Notice that ratings start as an empty array
 * here - they get populated separately in refreshTrips() by joining with the ratings table.
 * The images field comes back as a Postgres array (stored as JSONB or text[]).
 */
function mapTrip(row: Record<string, unknown>): Trip {
    return {
        id: row.id as string,
        guideId: row.guide_id as string,
        title: row.title as string,
        description: row.description as string || '',
        location: row.location as string,
        price: Number(row.price) || 0,
        maxSeats: Number(row.max_seats) || 1,
        bookedSeats: Number(row.booked_seats) || 0,
        startDate: row.start_date as string || '',
        endDate: row.end_date as string || undefined,
        durationDays: Number(row.duration_days) || 1,
        difficulty: (row.difficulty as Trip['difficulty']) || 'moderate',
        category: (row.category as Trip['category']) || 'hiking',
        images: (row.images as string[]) || [],
        distanceKm: Number(row.distance_km) || 0,
        altitudeGainM: Number(row.altitude_gain_m) || 0,
        averageRating: row.average_rating ? Number(row.average_rating) : undefined,
        aiRecommendations: row.ai_recommendations as string || undefined,
        isArchived: row.is_archived as boolean || false,
        ratings: [], // ratings get loaded separately and attached in refreshTrips()
    };
}

/**
 * mapBooking - Converts a raw Supabase "bookings" table row into our frontend Booking type.
 *
 * Bookings connect travelers to trips. The status field tracks the booking lifecycle:
 * 'confirmed' -> 'completed' (or 'cancelled'). The hasRated flag prevents double-rating.
 */
function mapBooking(row: Record<string, unknown>): Booking {
    return {
        id: row.id as string,
        travelerId: row.traveler_id as string,
        tripId: row.trip_id as string,
        bookedAt: row.booked_at as string,
        status: (row.status as Booking['status']) || 'confirmed',
        hasRated: row.has_rated as boolean || false,
    };
}

/**
 * AppProvider - The main context provider component that wraps the entire app.
 *
 * This is where all the state lives and all the business logic functions are defined.
 * It gets mounted once at the top of the component tree (in App.tsx or main.tsx),
 * and every child component can access any of this state via useApp().
 */
export const AppProvider = ({ children }: { children: ReactNode }) => {
    // --- Core state pieces ---
    const [user, setUser] = useState<User>(DEFAULT_USER);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // isAuthLoading starts true because we need to check if there's an existing session
    // before we can know whether the user is logged in or not. This prevents the app
    // from briefly flashing the login page on refresh.
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    // Tracks whether the current user has applied to be a guide, and the status of that application
    const [guideApplicationStatus, setGuideApplicationStatus] = useState<GuideApplicationStatus>('none');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    // Language and theme are persisted to localStorage so they survive page refreshes
    const [language, setLanguageState] = useState<Language>('en');
    const [theme, setThemeState] = useState<Theme>('system');

    // =========================================================================
    // DATA LOADING - Functions to fetch data from Supabase
    // =========================================================================

    /**
     * loadProfile - Fetches a single user's profile from Supabase by their ID.
     *
     * This is called after login, after registration, and when refreshing the session.
     * It sets the user state directly, so the entire app re-renders with the new profile.
     * Returns the profile so callers can chain logic (like checking the role after login).
     *
     * useCallback is used here to prevent unnecessary re-creation of this function,
     * which would cause the useEffect that depends on it to re-run.
     */
    const loadProfile = useCallback(async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) {
            const profile = mapProfile(data);
            setUser(profile);
            return profile;
        }
        return null;
    }, []);

    /**
     * refreshTrips - Loads ALL trips from Supabase plus their ratings.
     *
     * This does two queries: one for all trips, one for all ratings. Then it joins
     * them in JavaScript (rather than using a Supabase join) because we need to
     * calculate average ratings on the fly. Trips are sorted newest-first by created_at.
     *
     * The average rating calculation: sum all ratings, divide by count, round to 1 decimal.
     * This gets stored on each trip object so TripCard can display it without re-computing.
     */
    const refreshTrips = useCallback(async () => {
        const { data: tripRows } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
        if (!tripRows) return;

        // Load all ratings in one query instead of one per trip (way more efficient)
        const { data: allRatings } = await supabase.from('ratings').select('*');

        const mappedTrips = tripRows.map(row => {
            const trip = mapTrip(row);
            if (allRatings) {
                // Filter ratings for this specific trip and map them to our frontend shape
                trip.ratings = allRatings
                    .filter(r => r.trip_id === trip.id)
                    .map(r => ({
                        id: r.id,
                        raterId: r.rater_id,
                        guideId: r.guide_id,
                        tripId: r.trip_id,
                        rating: r.rating,
                        comment: r.comment || undefined,
                        createdAt: r.created_at,
                    }));
                // Calculate the average rating if there are any reviews
                if (trip.ratings.length > 0) {
                    const avg = trip.ratings.reduce((sum, r) => sum + r.rating, 0) / trip.ratings.length;
                    trip.averageRating = Math.round(avg * 10) / 10; // round to 1 decimal place
                }
            }
            return trip;
        });

        setTrips(mappedTrips);
    }, []);

    /**
     * refreshBookings - Loads bookings for the currently logged-in user.
     *
     * Only fetches bookings where traveler_id matches the current user, so each
     * user only sees their own bookings. Bails out early if there's no user ID
     * (which happens before login).
     */
    const refreshBookings = useCallback(async () => {
        if (!user.id) return;
        const { data } = await supabase.from('bookings').select('*').eq('traveler_id', user.id);
        if (data) setBookings(data.map(mapBooking));
    }, [user.id]);

    /**
     * refreshProfile - Re-fetches the current user's profile from the database.
     *
     * This is especially useful when an admin changes a user's role externally -
     * calling refreshProfile will pick up those changes. Notice it reads from
     * supabase.auth.getSession() directly rather than using the user.id from state.
     * That's because the session is the most reliable source of truth for "who is
     * actually logged in" - the user state might be stale if something went wrong.
     *
     * Also reloads the guide application status since that might have changed too.
     */
    const refreshProfile = useCallback(async () => {
        // Get user ID from Supabase session directly (most reliable source)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || user.id;
        if (!userId) return;
        await loadProfile(userId);
        await loadGuideApplicationStatus(userId);
    }, [user.id, loadProfile]);

    // =========================================================================
    // AUTH INITIALIZATION - Runs once on app mount to restore existing sessions
    // =========================================================================

    /**
     * This useEffect handles the initial authentication check and ongoing auth state changes.
     *
     * When the app first loads:
     * 1. Restore language and theme preferences from localStorage
     * 2. Check if there's an existing Supabase session (from a previous login)
     * 3. If yes, load the user's profile and set isAuthenticated = true
     * 4. If no, just set isAuthLoading = false so the app shows the login page
     *
     * The onAuthStateChange listener handles:
     * - User logs in from another tab
     * - Session expires or gets refreshed
     * - OAuth redirect comes back (Google sign-in)
     * - User logs out from another tab
     *
     * We return a cleanup function that unsubscribes from auth changes when the
     * component unmounts (though AppProvider should never unmount in practice).
     */
    useEffect(() => {
        // Restore saved preferences from localStorage
        const savedLang = localStorage.getItem('app-lang') as Language;
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedLang) setLanguageState(savedLang);
        if (savedTheme) setThemeState(savedTheme);

        // Check if the user already has an active Supabase session (e.g., they refreshed the page)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                // User has a valid session - load their profile from the database
                loadProfile(session.user.id).then((profile) => {
                    setIsAuthenticated(true);
                    setIsAuthLoading(false);
                    loadGuideApplicationStatus(session.user.id);
                    // Show a welcome-back notification if profile loaded successfully
                    if (profile) {
                        setNotifications([{
                            id: 'n1',
                            message: 'Welcome back to SafarGo!',
                            read: true,
                            createdAt: new Date().toISOString(),
                        }]);
                    }
                });
            } else {
                // No session found - user needs to log in
                setIsAuthLoading(false);
            }
        });

        // Subscribe to auth state changes (login, logout, token refresh, etc.)
        // This fires whenever Supabase auth state changes, even from other browser tabs
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadProfile(session.user.id).then(() => {
                    setIsAuthenticated(true);
                });
            } else {
                // User logged out or session expired - reset everything
                setIsAuthenticated(false);
                setUser(DEFAULT_USER);
            }
        });

        // Cleanup: stop listening for auth changes when this component unmounts
        return () => subscription.unsubscribe();
    }, [loadProfile]);

    // Load all trips as soon as the app mounts (everyone can see trips, even guests technically)
    useEffect(() => {
        refreshTrips();
    }, [refreshTrips]);

    // Load the user's bookings whenever the user ID changes (i.e., after login)
    useEffect(() => {
        if (user.id) refreshBookings();
    }, [user.id, refreshBookings]);

    // =========================================================================
    // THEME MANAGEMENT - Dark mode, light mode, or follow system preference
    // =========================================================================

    /**
     * This effect applies the selected theme to the HTML root element by adding/removing
     * CSS classes ('light' or 'dark'). Tailwind's dark mode uses these classes.
     *
     * When theme is 'system', we check the OS preference via matchMedia and also listen
     * for changes (in case the user toggles their OS dark mode while using the app).
     */
    useEffect(() => {
        const root = window.document.documentElement;
        const applyTheme = () => {
            root.classList.remove('light', 'dark');
            if (theme === 'system') {
                // Follow the OS preference
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(theme);
            }
        };
        applyTheme();
        localStorage.setItem('app-theme', theme);

        // Listen for OS dark mode changes so we can react in real-time when theme is 'system'
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => { if (theme === 'system') applyTheme(); };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    // Persist the selected language to localStorage so it survives page refreshes
    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-lang', lang);
    };
    const setTheme = (t: Theme) => setThemeState(t);

    // =========================================================================
    // NOTIFICATIONS - Simple in-memory notification system
    // =========================================================================

    /**
     * addNotification - Pushes a new notification to the top of the list.
     * New notifications are unread by default. The ID uses Date.now() for uniqueness.
     */
    const addNotification = (message: string) => {
        setNotifications(prev => [{
            id: `n${Date.now()}`,
            message,
            read: false,
            createdAt: new Date().toISOString(),
        }, ...prev]);
    };

    /**
     * markNotificationsRead - Marks ALL notifications as read.
     * Called when the user opens the notification dropdown in the navbar.
     */
    const markNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // =========================================================================
    // AUTHENTICATION - Login, register, Google OAuth, and logout
    // =========================================================================

    /**
     * login - Signs in with email and password using Supabase Auth.
     *
     * Returns an object with success/error/role so the caller (Login page) can decide
     * what to do next. The role is important because admins get redirected to /admin
     * while regular users go to the home page.
     */
    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: string }> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        const profile = await loadProfile(data.user.id);
        setIsAuthenticated(true);
        addNotification('Welcome back to SafarGo!');
        return { success: true, role: profile?.role };
    };

    /**
     * register - Creates a new account with email, password, and display name.
     *
     * Supabase supports email confirmation. If it's enabled (which it is for production),
     * the session will be null after signup - the user needs to click the confirmation link
     * in their email first. We return needsConfirmation: true so the Register page can
     * show the "check your email" screen.
     *
     * If email confirmation is disabled (dev mode), the user gets auto-confirmed and we
     * load their profile immediately. The 500ms delay is there to give the Supabase trigger
     * time to create the profile row (there's a database trigger that creates a profile
     * when a new auth user is inserted).
     */
    const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }, // this gets stored in auth.users.raw_user_meta_data
        });
        if (error) return { success: false, error: error.message };
        if (!data.user) return { success: false, error: 'Registration failed' };

        // If email confirmation is enabled, the session will be null
        if (!data.session) {
            return { success: true, needsConfirmation: true };
        }

        // If auto-confirmed, wait a bit for the DB trigger to create the profile row
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadProfile(data.user.id);
        setIsAuthenticated(true);
        addNotification('Welcome to SafarGo! Start exploring trips.');
        return { success: true };
    };

    /**
     * signInWithGoogle - Initiates the Google OAuth flow.
     *
     * This redirects the user to Google's login page. After they authenticate,
     * Google redirects them back to our app (redirectTo: window.location.origin).
     * The onAuthStateChange listener picks up the new session automatically.
     */
    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
    };

    /**
     * logout - Signs out of Supabase and resets all local state.
     *
     * Clears the user, bookings, and notifications. The onAuthStateChange listener
     * will also fire with a null session, but we reset state here too for immediate UI feedback.
     */
    const logout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUser(DEFAULT_USER);
        setBookings([]);
        setNotifications([]);
    };

    // =========================================================================
    // USER MANAGEMENT - Role switching, guide applications, profile updates
    // =========================================================================

    /**
     * switchToTraveler - Lets a guide temporarily switch back to traveler mode.
     *
     * This is for guides who also want to book trips as travelers. They earned
     * guide access through the application process, so they can switch back and
     * forth freely. Updates both Supabase and local state.
     */
    const switchToTraveler = async () => {
        if (user.role !== 'guide') return;
        await supabase.from('profiles').update({ role: 'traveler' }).eq('id', user.id);
        setUser(prev => ({ ...prev, role: 'traveler' }));
    };

    /**
     * switchToGuide - Lets a previously-approved guide switch back to guide mode.
     *
     * Only works if the user has an approved guide application. This check prevents
     * random users from just flipping their role to 'guide' - they have to go
     * through the application process first.
     */
    const switchToGuide = async () => {
        if (guideApplicationStatus !== 'approved') return;
        await supabase.from('profiles').update({ role: 'guide' }).eq('id', user.id);
        setUser(prev => ({ ...prev, role: 'guide' }));
    };

    /**
     * loadGuideApplicationStatus - Checks if the current user has a guide application
     * and what its status is (none, pending, approved, rejected).
     *
     * Fetches the most recent application (ordered by created_at desc, limit 1).
     * If no application exists, status is 'none'. This is called during login
     * and on profile refresh.
     */
    const loadGuideApplicationStatus = async (userId: string) => {
        const { data } = await supabase
            .from('guide_applications')
            .select('status')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            setGuideApplicationStatus(data[0].status as GuideApplicationStatus);
        } else {
            setGuideApplicationStatus('none');
        }
    };

    /**
     * submitGuideApplication - Sends a guide application for admin review.
     *
     * The user fills in their personal details (name, surname, age, gender, experience)
     * and this function inserts a new row in the guide_applications table with status 'pending'.
     * An admin can then approve or reject it from the admin dashboard.
     *
     * Returns true on success, false on failure (e.g., database error).
     */
    const submitGuideApplication = async (data: {
        fullName: string; surname: string; age: number; gender: string; experience: string;
    }): Promise<boolean> => {
        const { error } = await supabase.from('guide_applications').insert({
            user_id: user.id,
            full_name: data.fullName,
            surname: data.surname,
            age: data.age,
            gender: data.gender,
            experience: data.experience,
            status: 'pending',
        });

        if (error) {
            console.error('Guide application error:', error);
            return false;
        }

        setGuideApplicationStatus('pending');
        addNotification('Your guide application has been submitted! An admin will review it shortly.');
        return true;
    };

    /**
     * updateUser - Updates the current user's profile (name, avatar, wallet balance, etc.)
     *
     * Translates our camelCase frontend field names to snake_case database column names,
     * then updates Supabase and local state. Only sends fields that actually changed.
     */
    const updateUser = async (updates: Partial<User>) => {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.walletBalance !== undefined) dbUpdates.wallet_balance = updates.walletBalance;

        if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
        }
        setUser(prev => ({ ...prev, ...updates }));
    };

    /**
     * withdrawFunds - Withdraws the user's entire wallet balance.
     *
     * In a real app, this would integrate with a payment provider. For now, it just
     * zeros out the balance in Supabase and shows a notification with the amount.
     */
    const withdrawFunds = async () => {
        const amount = user.walletBalance;
        await supabase.from('profiles').update({ wallet_balance: 0 }).eq('id', user.id);
        setUser(prev => ({ ...prev, walletBalance: 0 }));
        addNotification(`Withdrawal of ${amount} UZS processed.`);
    };

    // =========================================================================
    // TRIP MANAGEMENT - CRUD operations for trips
    // =========================================================================

    /**
     * addTrip - Creates a new trip in Supabase and adds it to local state.
     *
     * After successfully inserting the trip, it also auto-creates a chat group
     * for the trip so the guide and future travelers can communicate.
     * The trip object is pre-built by the CreateTrip page with a UUID already generated.
     */
    const addTrip = async (trip: Trip) => {
        const { error } = await supabase.from('trips').insert({
            id: trip.id,
            guide_id: trip.guideId,
            title: trip.title,
            description: trip.description,
            location: trip.location,
            price: trip.price,
            max_seats: trip.maxSeats,
            booked_seats: 0,
            start_date: trip.startDate,
            end_date: trip.endDate || null,
            duration_days: trip.durationDays,
            difficulty: trip.difficulty,
            category: trip.category,
            images: trip.images,
            distance_km: trip.distanceKm,
            altitude_gain_m: trip.altitudeGainM,
            ai_recommendations: trip.aiRecommendations || null,
        });

        if (!error) {
            // Add to local state immediately (optimistic update - no waiting for refetch)
            setTrips(prev => [trip, ...prev]);
            addNotification(`Trip "${trip.title}" published successfully!`);

            // Auto-create a chat group for this trip so the guide can start chatting
            createOrJoinChatGroup(trip);
        }
    };

    /**
     * deleteTrip - Removes a trip from the database.
     *
     * Only the guide who created the trip can delete it (guideId check).
     * Uses a fire-and-forget pattern for the Supabase delete (.then() with no await).
     * Returns false if the trip doesn't exist or the user isn't the owner.
     */
    const deleteTrip = (tripId: string): boolean => {
        const trip = trips.find(t => t.id === tripId);
        if (!trip || trip.guideId !== user.id) return false;

        supabase.from('trips').delete().eq('id', tripId).then();
        setTrips(prev => prev.filter(t => t.id !== tripId));
        addNotification(`Trip "${trip.title}" has been deleted.`);
        return true;
    };

    /**
     * updateTrip - Partially updates a trip's data (title, description, price, seats).
     *
     * Translates camelCase field names to snake_case for the database.
     * Only sends changed fields to minimize the update payload.
     */
    const updateTrip = async (tripId: string, updates: Partial<Trip>) => {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.maxSeats !== undefined) dbUpdates.max_seats = updates.maxSeats;

        if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('trips').update(dbUpdates).eq('id', tripId);
        }
        setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updates } : t));
    };

    // =========================================================================
    // BOOKING FLOW - The core booking logic with wallet deduction and chat creation
    // =========================================================================

    /**
     * bookTrip - Books a trip for the current user. This is the main booking flow.
     *
     * Here's what happens step by step:
     * 1. Ban check: If the user is banned, reject immediately with a notification
     * 2. Validation: Make sure the trip exists, user has enough money, and seats are available
     * 3. Wallet deduction: Subtract the trip price from the user's wallet balance
     * 4. Seat reservation: Increment the trip's booked_seats count
     * 5. Booking creation: Insert a new booking row in the database
     * 6. Chat group: Auto-join (or create) the trip's chat group
     * 7. Local state: Update everything in React state for instant UI feedback
     *
     * The database operations are fire-and-forget (.then() without await) for speed.
     * This is an optimistic update pattern - we update the UI immediately and trust
     * that the database operations will succeed. In production, you'd want error
     * handling and rollback logic for failed DB operations.
     *
     * Returns true if booking succeeded, false if it failed validation.
     */
    const bookTrip = (tripId: string): boolean => {
        // Step 1: Check if the user is banned
        if (user.isBanned) {
            addNotification('Your account is suspended. Contact support for assistance.');
            return false;
        }
        // Step 2: Validate - trip exists, sufficient funds, seats available
        const trip = trips.find(t => t.id === tripId);
        if (!trip || user.walletBalance < trip.price || trip.bookedSeats >= trip.maxSeats) return false;

        const newBalance = user.walletBalance - trip.price;
        const bookingId = crypto.randomUUID();

        // Step 3-5: Fire off all three database updates in parallel (no await, fire-and-forget)
        supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id).then();
        supabase.from('trips').update({ booked_seats: trip.bookedSeats + 1 }).eq('id', tripId).then();
        supabase.from('bookings').insert({
            id: bookingId,
            traveler_id: user.id,
            trip_id: tripId,
            status: 'confirmed',
        }).then();

        // Step 6: Auto-create or join the chat group for this trip
        createOrJoinChatGroup(trip);

        // Step 7: Update local state immediately for instant UI feedback
        setUser(prev => ({ ...prev, walletBalance: newBalance }));
        setTrips(prev => prev.map(t => t.id === tripId ? { ...t, bookedSeats: t.bookedSeats + 1 } : t));
        setBookings(prev => [...prev, {
            id: bookingId,
            travelerId: user.id,
            tripId,
            bookedAt: new Date().toISOString(),
            status: 'confirmed',
            hasRated: false,
        }]);
        addNotification(`You booked "${trip.title}" successfully!`);
        return true;
    };

    // =========================================================================
    // CHAT GROUP AUTO-CREATION - Creates/joins chat groups when booking or creating trips
    // =========================================================================

    /**
     * createOrJoinChatGroup - Handles the automatic chat group creation/joining logic.
     *
     * Every trip gets its own chat group where the guide and travelers can talk.
     * This function is called in two scenarios:
     *   1. When a guide creates a new trip (addTrip) - creates the group
     *   2. When a traveler books a trip (bookTrip) - joins the existing group
     *
     * The flow:
     * 1. Check if a chat group already exists for this trip_id
     * 2. If yes, use the existing group's ID
     * 3. If no, create a new chat group with the trip's title and first image
     *    - Add the guide as the first member
     *    - Generate an AI welcome message using Gemini (the getChatWelcomeMessage function)
     * 4. Add the current user to the chat group (upsert with ignoreDuplicates to handle
     *    the case where the guide is both the creator and a member)
     *
     * The AI welcome message is generated asynchronously and inserted as a chat message
     * with is_ai: true and sender_name: 'SafarGo AI'. This gives new chat groups a
     * friendly starting message with trip-specific context.
     */
    const createOrJoinChatGroup = async (trip: Trip) => {
        try {
            // Check if a chat group already exists for this trip
            const { data: existingGroups } = await supabase
                .from('chat_groups')
                .select('id')
                .eq('trip_id', trip.id);

            let chatId: string;
            let isNewGroup = false;

            if (existingGroups && existingGroups.length > 0) {
                // Chat group already exists - just grab its ID so we can add the user
                chatId = existingGroups[0].id;
            } else {
                // No chat group yet - create one with a client-generated UUID
                chatId = crypto.randomUUID();
                isNewGroup = true;

                const { error } = await supabase.from('chat_groups').insert({
                    id: chatId,
                    trip_id: trip.id,
                    name: trip.title,
                    image: trip.images[0] || '',
                });

                if (error) {
                    console.error('Failed to create chat group:', error);
                    return;
                }

                // The guide who created the trip is automatically the first member
                await supabase.from('chat_members').insert({
                    chat_id: chatId,
                    user_id: trip.guideId,
                });
            }

            // Add the current user as a member of the chat group.
            // Uses upsert with ignoreDuplicates so it won't fail if the user is already a member
            // (e.g., the guide who created the trip is already added above).
            const { error: memberError } = await supabase.from('chat_members').upsert({
                chat_id: chatId,
                user_id: user.id,
            }, { onConflict: 'chat_id,user_id', ignoreDuplicates: true });

            if (memberError) {
                console.error('Failed to add chat member:', memberError);
            }

            // For brand new groups, generate an AI welcome message using Gemini.
            // This runs asynchronously - we don't await it because it's not critical.
            if (isNewGroup) {
                getChatWelcomeMessage(trip.title, trip.location, trip.difficulty).then(async (message) => {
                    await supabase.from('chat_messages').insert({
                        chat_id: chatId,
                        sender_id: trip.guideId,
                        sender_name: 'SafarGo AI',
                        sender_avatar: '',
                        content: message,
                        is_ai: true,
                    });
                });
            }
        } catch (err) {
            console.error('Chat group error:', err);
        }
    };

    // =========================================================================
    // RATINGS - Trip rating system for completed bookings
    // =========================================================================

    /**
     * rateTrip - Lets a traveler rate a completed trip.
     *
     * Validation rules:
     * 1. The user must have a booking for this trip
     * 2. The booking status must be 'completed' (can't rate a trip you haven't finished)
     * 3. The user hasn't already rated this trip (hasRated flag prevents double-rating)
     *
     * After validation, it:
     * - Inserts a new rating row in the database
     * - Marks the booking as rated (has_rated = true)
     * - Recalculates the trip's average rating
     * - Updates the trip's average_rating in the database
     * - Updates all the local state for instant UI feedback
     */
    const rateTrip = (tripId: string, rating: number, comment?: string): boolean => {
        const booking = bookings.find(b => b.tripId === tripId && b.travelerId === user.id);
        if (!booking || booking.status !== 'completed' || booking.hasRated) return false;

        const trip = trips.find(t => t.id === tripId);
        if (!trip) return false;

        const ratingId = crypto.randomUUID();
        const newRating: TripRating = {
            id: ratingId,
            raterId: user.id,
            guideId: trip.guideId,
            tripId,
            rating,
            comment,
            createdAt: new Date().toISOString(),
        };

        // Insert the rating and mark the booking as rated (fire-and-forget)
        supabase.from('ratings').insert({
            id: ratingId,
            rater_id: user.id,
            guide_id: trip.guideId,
            trip_id: tripId,
            rating,
            comment: comment || null,
        }).then();
        supabase.from('bookings').update({ has_rated: true }).eq('id', booking.id).then();

        // Recalculate the average rating for this trip
        const updatedRatings = [...(trip.ratings || []), newRating];
        const avgRating = updatedRatings.reduce((sum, r) => sum + r.rating, 0) / updatedRatings.length;
        const roundedAvg = Math.round(avgRating * 10) / 10;
        supabase.from('trips').update({ average_rating: roundedAvg }).eq('id', tripId).then();

        // Update local state so the UI reflects the new rating immediately
        setTrips(prev => prev.map(t => {
            if (t.id === tripId) return { ...t, ratings: updatedRatings, averageRating: roundedAvg };
            return t;
        }));
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, hasRated: true } : b));
        return true;
    };

    /**
     * getUserBookingForTrip - Quick lookup to find if the current user has booked a specific trip.
     * Returns the booking object if found, undefined if not. Used by the TripDetail page
     * to show the "View Ticket" button or the "Rate Trip" form.
     */
    const getUserBookingForTrip = (tripId: string): Booking | undefined => {
        return bookings.find(b => b.tripId === tripId && b.travelerId === user.id);
    };

    // =========================================================================
    // ADMIN ACTIONS - Powers available only to admin users
    // =========================================================================
    // These functions are called from the AdminDashboard page. They update Supabase
    // directly and show a notification. The admin dashboard does its own local state
    // management for the user/trip lists it displays.

    /**
     * adminBanUser - Bans or unbans a user by flipping the is_banned flag.
     * Banned users can't book trips or interact with the platform.
     */
    const adminBanUser = async (userId: string, ban: boolean) => {
        await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId);
        addNotification(`User ${ban ? 'banned' : 'unbanned'} successfully.`);
    };

    /**
     * adminArchiveTrip - Archives or restores a trip.
     * Archived trips are hidden from the main explore page but not deleted.
     * This is a soft-delete pattern - data is preserved for record-keeping.
     */
    const adminArchiveTrip = async (tripId: string, archive: boolean) => {
        await supabase.from('trips').update({ is_archived: archive }).eq('id', tripId);
        setTrips(prev => prev.map(t => t.id === tripId ? { ...t, isArchived: archive } : t));
        addNotification(`Trip ${archive ? 'archived' : 'restored'} successfully.`);
    };

    /**
     * adminDeleteTrip - Permanently deletes a trip from the database.
     * This is a hard delete - the trip and all associated data are gone.
     * The admin dashboard shows a confirmation dialog before calling this.
     */
    const adminDeleteTrip = async (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        await supabase.from('trips').delete().eq('id', tripId);
        setTrips(prev => prev.filter(t => t.id !== tripId));
        addNotification(`Trip "${trip?.title || ''}" deleted permanently.`);
    };

    /**
     * adminVerifyGuide - Toggles a guide's verified status.
     * Verified guides get a checkmark badge on their profile, which builds
     * trust with travelers. Think of it like Twitter's blue check.
     */
    const adminVerifyGuide = async (userId: string, verify: boolean) => {
        await supabase.from('profiles').update({ is_verified: verify }).eq('id', userId);
        addNotification(`Guide ${verify ? 'verified' : 'unverified'} successfully.`);
    };

    /**
     * adminChangeRole - Directly changes a user's role between traveler and guide.
     * This bypasses the guide application process - it's an admin override.
     */
    const adminChangeRole = async (userId: string, newRole: 'traveler' | 'guide') => {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        addNotification(`User role changed to ${newRole}.`);
    };

    /**
     * adminApproveApplication - Approves a pending guide application.
     *
     * This does TWO things:
     * 1. Updates the application status to 'approved' with a reviewed_at timestamp
     * 2. Changes the user's role from 'traveler' to 'guide'
     *
     * If the role update fails (often due to Row Level Security policies), it shows
     * an error notification so the admin knows something went wrong.
     */
    const adminApproveApplication = async (appId: string, userId: string) => {
        const { error: appErr } = await supabase.from('guide_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', appId);
        if (appErr) console.error('Failed to update application:', appErr);

        const { error: roleErr } = await supabase.from('profiles').update({ role: 'guide' }).eq('id', userId);
        if (roleErr) {
            console.error('Failed to update user role:', roleErr);
            addNotification('Error: Could not update user role. Check RLS policies.');
            return;
        }
        addNotification('Guide application approved. User is now a guide.');
    };

    /**
     * adminRejectApplication - Rejects a pending guide application.
     * Sets the status to 'rejected' with a reviewed_at timestamp.
     * The user can see their application was rejected on their profile page.
     */
    const adminRejectApplication = async (appId: string) => {
        const { error } = await supabase.from('guide_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', appId);
        if (error) console.error('Failed to reject application:', error);
        addNotification('Guide application rejected.');
    };

    // =========================================================================
    // PROVIDER RENDER - Pass everything down through the context
    // =========================================================================

    return (
        <AppContext.Provider value={{
            user,
            isAuthenticated,
            isAuthLoading,
            login,
            register,
            signInWithGoogle,
            logout,
            trips,
            bookings,
            notifications,
            language,
            theme,
            setLanguage,
            setTheme,
            switchToTraveler,
            switchToGuide,
            guideApplicationStatus,
            submitGuideApplication,
            bookTrip,
            addTrip,
            deleteTrip,
            updateTrip,
            updateUser,
            withdrawFunds,
            rateTrip,
            getUserBookingForTrip,
            markNotificationsRead,
            addNotification,
            refreshTrips,
            refreshBookings,
            refreshProfile,
            adminBanUser,
            adminArchiveTrip,
            adminDeleteTrip,
            adminVerifyGuide,
            adminChangeRole,
            adminApproveApplication,
            adminRejectApplication,
        }}>
            {children}
        </AppContext.Provider>
    );
};

/**
 * useApp - Custom hook to access the global app context.
 *
 * This is the main way every component gets access to global state.
 * Usage: const { user, trips, bookTrip } = useApp();
 *
 * Throws an error if called outside of AppProvider, which helps catch
 * bugs during development (like forgetting to wrap a route in the provider).
 */
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
