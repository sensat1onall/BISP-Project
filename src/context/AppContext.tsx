import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Trip, Language, Theme, Booking, TripRating } from '../types';
import { authApi } from '../lib/api';

const MOCK_USER: User = {
    id: 'u1',
    name: 'Aziz Rakhimov',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    role: 'traveler',
    walletBalance: 1250000, // 1.25M UZS
    walletEscrow: 0,
    isVerified: true,
    guideLevel: 4,
    completedTrips: 12,
    rating: 4.8,
    memberSince: '2023-01-15'
};

const MOCK_TRIPS: Trip[] = [
    {
        id: 't1',
        guideId: 'u2',
        title: 'Chimgan Mountains Hiking',
        description: 'A beautiful hike through the Greater Chimgan peak. Experience breathtaking views and fresh mountain air.',
        location: 'Chimgan, Tashkent Region',
        price: 450000,
        maxSeats: 8,
        bookedSeats: 3,
        startDate: '2024-05-12T08:00:00Z',
        endDate: '2024-05-12T18:00:00Z',
        durationDays: 1,
        difficulty: 'moderate',
        category: 'hiking',
        images: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop'],
        distanceKm: 12.5,
        altitudeGainM: 850,
        ratings: [
            { id: 'r1', raterId: 'u3', guideId: 'u2', tripId: 't1', rating: 5, comment: 'Amazing experience!', createdAt: '2024-04-15T10:00:00Z' },
            { id: 'r2', raterId: 'u4', guideId: 'u2', tripId: 't1', rating: 4, comment: 'Great guide, beautiful views', createdAt: '2024-04-10T14:00:00Z' }
        ],
        averageRating: 4.5
    },
    {
        id: 't2',
        guideId: 'u3',
        title: 'Samarkand Golden History',
        description: 'Explore the ancient city of Samarkand, the jewel of the Silk Road. Visit Registan Square and Gur-e-Amir.',
        location: 'Samarkand',
        price: 900000,
        maxSeats: 15,
        bookedSeats: 12,
        startDate: '2024-05-20T09:00:00Z',
        endDate: '2024-05-21T18:00:00Z',
        durationDays: 2,
        difficulty: 'easy',
        category: 'sightseeing',
        images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop'],
        distanceKm: 5,
        altitudeGainM: 0,
        ratings: [
            { id: 'r3', raterId: 'u5', guideId: 'u3', tripId: 't2', rating: 5, comment: 'Best tour ever!', createdAt: '2024-04-20T12:00:00Z' }
        ],
        averageRating: 5.0
    }
];

// Mock bookings for the current user
const MOCK_BOOKINGS: Booking[] = [
    {
        id: 'b1',
        travelerId: 'u1', // Current user booked this
        tripId: 't1',
        bookedAt: '2024-04-01T10:00:00Z',
        status: 'completed',
        hasRated: false
    }
];

interface AppContextType {
    user: User;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    trips: Trip[];
    bookings: Booking[];
    language: Language;
    theme: Theme;
    setLanguage: (lang: Language) => void;
    setTheme: (theme: Theme) => void;
    switchRole: () => void;
    bookTrip: (tripId: string) => boolean;
    addTrip: (trip: Trip) => void;
    withdrawFunds: () => void;
    rateTrip: (tripId: string, rating: number, comment?: string) => boolean;
    getUserBookingForTrip: (tripId: string) => Booking | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>(MOCK_USER);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
    const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
    const [language, setLanguageState] = useState<Language>('en');
    const [theme, setThemeState] = useState<Theme>('system');

    // Load persistence + check existing auth token
    useEffect(() => {
        const savedLang = localStorage.getItem('app-lang') as Language;
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedLang) setLanguageState(savedLang);
        if (savedTheme) setThemeState(savedTheme);

        const token = localStorage.getItem('bisp_token');
        if (token) {
            authApi.getProfile()
                .then(({ user: profileUser }) => {
                    setUser({
                        id: profileUser.id,
                        name: profileUser.name,
                        avatar: profileUser.avatar,
                        role: profileUser.role,
                        walletBalance: profileUser.walletBalance,
                        walletEscrow: profileUser.walletEscrow,
                        isVerified: profileUser.isVerified,
                        guideLevel: profileUser.guideLevel,
                        completedTrips: profileUser.completedTrips,
                        rating: profileUser.rating,
                        memberSince: profileUser.memberSince,
                    });
                    setIsAuthenticated(true);
                })
                .catch(() => {
                    localStorage.removeItem('bisp_token');
                })
                .finally(() => setIsAuthLoading(false));
        } else {
            setIsAuthLoading(false);
        }
    }, []);

    // Theme effect
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

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => { if (theme === 'system') applyTheme(); };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-lang', lang);
    };

    const setTheme = (t: Theme) => {
        setThemeState(t);
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: string }> => {
        try {
            const { token, user: authUser } = await authApi.login(email, password);
            localStorage.setItem('bisp_token', token);
            setUser({
                id: authUser.id,
                name: authUser.name,
                avatar: authUser.avatar,
                role: authUser.role,
                walletBalance: authUser.walletBalance,
                walletEscrow: authUser.walletEscrow,
                isVerified: authUser.isVerified,
                guideLevel: authUser.guideLevel,
                completedTrips: authUser.completedTrips,
                rating: authUser.rating,
                memberSince: authUser.memberSince,
            });
            setIsAuthenticated(true);
            return { success: true, role: authUser.role };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
        }
    };

    const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { token, user: authUser } = await authApi.register(name, email, password);
            localStorage.setItem('bisp_token', token);
            setUser({
                id: authUser.id,
                name: authUser.name,
                avatar: authUser.avatar,
                role: authUser.role,
                walletBalance: authUser.walletBalance,
                walletEscrow: authUser.walletEscrow,
                isVerified: authUser.isVerified,
                guideLevel: authUser.guideLevel,
                completedTrips: authUser.completedTrips,
                rating: authUser.rating,
                memberSince: authUser.memberSince,
            });
            setIsAuthenticated(true);
            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('bisp_token');
        setIsAuthenticated(false);
        setUser(MOCK_USER);
    };

    const switchRole = () => {
        setUser((prev: User) => ({
            ...prev,
            role: prev.role === 'traveler' ? 'guide' : 'traveler'
        }));
    };

    const bookTrip = (tripId: string) => {
        const trip = trips.find(t => t.id === tripId);
        if (!trip) return false;
        if (user.walletBalance < trip.price) return false;

        // Deduct
        setUser((prev: User) => ({
            ...prev,
            walletBalance: prev.walletBalance - trip.price
        }));

        // Update Trip seats
        setTrips((prev: Trip[]) => prev.map(t =>
            t.id === tripId ? { ...t, bookedSeats: t.bookedSeats + 1 } : t
        ));

        // Create booking
        const newBooking: Booking = {
            id: `b${Date.now()}`,
            travelerId: user.id,
            tripId: tripId,
            bookedAt: new Date().toISOString(),
            status: 'confirmed',
            hasRated: false
        };
        setBookings(prev => [...prev, newBooking]);

        return true;
    };

    const addTrip = (trip: Trip) => {
        setTrips((prev: Trip[]) => [trip, ...prev]);
    };

    const withdrawFunds = () => {
        setUser((prev: User) => ({ ...prev, walletBalance: 0 }));
    };

    // Rate a trip (only for travelers who completed the trip)
    const rateTrip = (tripId: string, rating: number, comment?: string): boolean => {
        const booking = bookings.find(b => b.tripId === tripId && b.travelerId === user.id);
        if (!booking || booking.status !== 'completed' || booking.hasRated) {
            return false;
        }

        const trip = trips.find(t => t.id === tripId);
        if (!trip) return false;

        const newRating: TripRating = {
            id: `r${Date.now()}`,
            raterId: user.id,
            guideId: trip.guideId,
            tripId: tripId,
            rating: rating,
            comment: comment,
            createdAt: new Date().toISOString()
        };

        // Update trip with new rating
        setTrips((prev: Trip[]) => prev.map(t => {
            if (t.id === tripId) {
                const updatedRatings = [...(t.ratings || []), newRating];
                const avgRating = updatedRatings.reduce((sum, r) => sum + r.rating, 0) / updatedRatings.length;
                return {
                    ...t,
                    ratings: updatedRatings,
                    averageRating: Math.round(avgRating * 10) / 10
                };
            }
            return t;
        }));

        // Mark booking as rated
        setBookings(prev => prev.map(b =>
            b.id === booking.id ? { ...b, hasRated: true } : b
        ));

        return true;
    };

    const getUserBookingForTrip = (tripId: string): Booking | undefined => {
        return bookings.find(b => b.tripId === tripId && b.travelerId === user.id);
    };

    return (
        <AppContext.Provider value={{
            user,
            isAuthenticated,
            isAuthLoading,
            login,
            register,
            logout,
            trips,
            bookings,
            language,
            theme,
            setLanguage,
            setTheme,
            switchRole,
            bookTrip,
            addTrip,
            withdrawFunds,
            rateTrip,
            getUserBookingForTrip
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
