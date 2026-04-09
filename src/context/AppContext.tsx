import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Trip, Language, Theme, Booking, TripRating, GuideApplicationStatus } from '../types';
import { supabase } from '../lib/supabase';
import { getChatWelcomeMessage } from '../lib/gemini';

export interface Notification {
    id: string;
    message: string;
    read: boolean;
    createdAt: string;
}

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
    // Admin actions
    adminBanUser: (userId: string, ban: boolean) => Promise<void>;
    adminArchiveTrip: (tripId: string, archive: boolean) => Promise<void>;
    adminDeleteTrip: (tripId: string) => Promise<void>;
    adminVerifyGuide: (userId: string, verify: boolean) => Promise<void>;
    adminChangeRole: (userId: string, newRole: 'traveler' | 'guide') => Promise<void>;
    adminApproveApplication: (appId: string, userId: string) => Promise<void>;
    adminRejectApplication: (appId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper: map Supabase profile row to User
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

// Helper: map Supabase trip row to Trip
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
        ratings: [],
    };
}

// Helper: map Supabase booking row to Booking
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

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>(DEFAULT_USER);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [guideApplicationStatus, setGuideApplicationStatus] = useState<GuideApplicationStatus>('none');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [language, setLanguageState] = useState<Language>('en');
    const [theme, setThemeState] = useState<Theme>('system');

    // --- Data loading ---

    const loadProfile = useCallback(async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) {
            const profile = mapProfile(data);
            setUser(profile);
            return profile;
        }
        return null;
    }, []);

    const refreshTrips = useCallback(async () => {
        const { data: tripRows } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
        if (!tripRows) return;

        // Load ratings for each trip
        const { data: allRatings } = await supabase.from('ratings').select('*');

        const mappedTrips = tripRows.map(row => {
            const trip = mapTrip(row);
            if (allRatings) {
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
                if (trip.ratings.length > 0) {
                    const avg = trip.ratings.reduce((sum, r) => sum + r.rating, 0) / trip.ratings.length;
                    trip.averageRating = Math.round(avg * 10) / 10;
                }
            }
            return trip;
        });

        setTrips(mappedTrips);
    }, []);

    const refreshBookings = useCallback(async () => {
        if (!user.id) return;
        const { data } = await supabase.from('bookings').select('*').eq('traveler_id', user.id);
        if (data) setBookings(data.map(mapBooking));
    }, [user.id]);

    // Refresh profile from DB (used when admin changes role externally)
    const refreshProfile = useCallback(async () => {
        // Get user ID from Supabase session directly (most reliable source)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || user.id;
        if (!userId) return;
        await loadProfile(userId);
        await loadGuideApplicationStatus(userId);
    }, [user.id, loadProfile]);

    // --- Auth init ---

    useEffect(() => {
        const savedLang = localStorage.getItem('app-lang') as Language;
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedLang) setLanguageState(savedLang);
        if (savedTheme) setThemeState(savedTheme);

        // Check current Supabase session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadProfile(session.user.id).then((profile) => {
                    setIsAuthenticated(true);
                    setIsAuthLoading(false);
                    loadGuideApplicationStatus(session.user.id);
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
                setIsAuthLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadProfile(session.user.id).then(() => {
                    setIsAuthenticated(true);
                });
            } else {
                setIsAuthenticated(false);
                setUser(DEFAULT_USER);
            }
        });

        return () => subscription.unsubscribe();
    }, [loadProfile]);

    // Load trips on mount, bookings when user changes
    useEffect(() => {
        refreshTrips();
    }, [refreshTrips]);

    useEffect(() => {
        if (user.id) refreshBookings();
    }, [user.id, refreshBookings]);

    // --- Theme ---

    useEffect(() => {
        const root = window.document.documentElement;
        const applyTheme = () => {
            root.classList.remove('light', 'dark');
            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(theme);
            }
        };
        applyTheme();
        localStorage.setItem('app-theme', theme);

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => { if (theme === 'system') applyTheme(); };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-lang', lang);
    };
    const setTheme = (t: Theme) => setThemeState(t);

    // --- Notifications ---

    const addNotification = (message: string) => {
        setNotifications(prev => [{
            id: `n${Date.now()}`,
            message,
            read: false,
            createdAt: new Date().toISOString(),
        }, ...prev]);
    };

    const markNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // --- Auth ---

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: string }> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        const profile = await loadProfile(data.user.id);
        setIsAuthenticated(true);
        addNotification('Welcome back to SafarGo!');
        return { success: true, role: profile?.role };
    };

    const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });
        if (error) return { success: false, error: error.message };
        if (!data.user) return { success: false, error: 'Registration failed' };

        // If email confirmation is enabled, the session will be null
        if (!data.session) {
            return { success: true, needsConfirmation: true };
        }

        // If auto-confirmed, load profile immediately
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadProfile(data.user.id);
        setIsAuthenticated(true);
        addNotification('Welcome to SafarGo! Start exploring trips.');
        return { success: true };
    };

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setUser(DEFAULT_USER);
        setBookings([]);
        setNotifications([]);
    };

    // --- User ---

    // Guide can switch back to traveler mode (they earned guide access)
    const switchToTraveler = async () => {
        if (user.role !== 'guide') return;
        await supabase.from('profiles').update({ role: 'traveler' }).eq('id', user.id);
        setUser(prev => ({ ...prev, role: 'traveler' }));
    };

    // Previously approved guide can switch back to guide mode
    const switchToGuide = async () => {
        if (guideApplicationStatus !== 'approved') return;
        await supabase.from('profiles').update({ role: 'guide' }).eq('id', user.id);
        setUser(prev => ({ ...prev, role: 'guide' }));
    };

    // Load guide application status for current user
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

    // Submit guide application
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

    const withdrawFunds = async () => {
        const amount = user.walletBalance;
        await supabase.from('profiles').update({ wallet_balance: 0 }).eq('id', user.id);
        setUser(prev => ({ ...prev, walletBalance: 0 }));
        addNotification(`Withdrawal of ${amount} UZS processed.`);
    };

    // --- Trips ---

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
            setTrips(prev => [trip, ...prev]);
            addNotification(`Trip "${trip.title}" published successfully!`);

            // Auto-create chat group for the guide's new trip
            createOrJoinChatGroup(trip);
        }
    };

    const deleteTrip = (tripId: string): boolean => {
        const trip = trips.find(t => t.id === tripId);
        if (!trip || trip.guideId !== user.id) return false;

        supabase.from('trips').delete().eq('id', tripId).then();
        setTrips(prev => prev.filter(t => t.id !== tripId));
        addNotification(`Trip "${trip.title}" has been deleted.`);
        return true;
    };

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

    // --- Bookings ---

    const bookTrip = (tripId: string): boolean => {
        if (user.isBanned) {
            addNotification('Your account is suspended. Contact support for assistance.');
            return false;
        }
        const trip = trips.find(t => t.id === tripId);
        if (!trip || user.walletBalance < trip.price || trip.bookedSeats >= trip.maxSeats) return false;

        const newBalance = user.walletBalance - trip.price;
        const bookingId = crypto.randomUUID();

        // Update DB asynchronously
        supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id).then();
        supabase.from('trips').update({ booked_seats: trip.bookedSeats + 1 }).eq('id', tripId).then();
        supabase.from('bookings').insert({
            id: bookingId,
            traveler_id: user.id,
            trip_id: tripId,
            status: 'confirmed',
        }).then();

        // Auto-create or join chat group for this trip
        createOrJoinChatGroup(trip);

        // Update local state immediately
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

    // --- Chat ---

    const createOrJoinChatGroup = async (trip: Trip) => {
        try {
            // Check if chat group already exists for this trip
            const { data: existingGroups } = await supabase
                .from('chat_groups')
                .select('id')
                .eq('trip_id', trip.id);

            let chatId: string;
            let isNewGroup = false;

            if (existingGroups && existingGroups.length > 0) {
                chatId = existingGroups[0].id;
            } else {
                // Create new chat group with client-generated ID
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

                // Add the guide as first member
                await supabase.from('chat_members').insert({
                    chat_id: chatId,
                    user_id: trip.guideId,
                });
            }

            // Add the current user as a member
            const { error: memberError } = await supabase.from('chat_members').upsert({
                chat_id: chatId,
                user_id: user.id,
            }, { onConflict: 'chat_id,user_id', ignoreDuplicates: true });

            if (memberError) {
                console.error('Failed to add chat member:', memberError);
            }

            // Generate AI welcome message for new groups
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

    // --- Ratings ---

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

        // Insert to DB
        supabase.from('ratings').insert({
            id: ratingId,
            rater_id: user.id,
            guide_id: trip.guideId,
            trip_id: tripId,
            rating,
            comment: comment || null,
        }).then();
        supabase.from('bookings').update({ has_rated: true }).eq('id', booking.id).then();

        // Update average rating on trip
        const updatedRatings = [...(trip.ratings || []), newRating];
        const avgRating = updatedRatings.reduce((sum, r) => sum + r.rating, 0) / updatedRatings.length;
        const roundedAvg = Math.round(avgRating * 10) / 10;
        supabase.from('trips').update({ average_rating: roundedAvg }).eq('id', tripId).then();

        // Local state
        setTrips(prev => prev.map(t => {
            if (t.id === tripId) return { ...t, ratings: updatedRatings, averageRating: roundedAvg };
            return t;
        }));
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, hasRated: true } : b));
        return true;
    };

    const getUserBookingForTrip = (tripId: string): Booking | undefined => {
        return bookings.find(b => b.tripId === tripId && b.travelerId === user.id);
    };

    // --- Admin Actions ---

    const adminBanUser = async (userId: string, ban: boolean) => {
        await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId);
        addNotification(`User ${ban ? 'banned' : 'unbanned'} successfully.`);
    };

    const adminArchiveTrip = async (tripId: string, archive: boolean) => {
        await supabase.from('trips').update({ is_archived: archive }).eq('id', tripId);
        setTrips(prev => prev.map(t => t.id === tripId ? { ...t, isArchived: archive } : t));
        addNotification(`Trip ${archive ? 'archived' : 'restored'} successfully.`);
    };

    const adminDeleteTrip = async (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        await supabase.from('trips').delete().eq('id', tripId);
        setTrips(prev => prev.filter(t => t.id !== tripId));
        addNotification(`Trip "${trip?.title || ''}" deleted permanently.`);
    };

    const adminVerifyGuide = async (userId: string, verify: boolean) => {
        await supabase.from('profiles').update({ is_verified: verify }).eq('id', userId);
        addNotification(`Guide ${verify ? 'verified' : 'unverified'} successfully.`);
    };

    const adminChangeRole = async (userId: string, newRole: 'traveler' | 'guide') => {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        addNotification(`User role changed to ${newRole}.`);
    };

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

    const adminRejectApplication = async (appId: string) => {
        const { error } = await supabase.from('guide_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', appId);
        if (error) console.error('Failed to reject application:', error);
        addNotification('Guide application rejected.');
    };

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

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
