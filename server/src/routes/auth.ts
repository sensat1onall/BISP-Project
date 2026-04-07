import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// In-memory user store (replace with database in production)
export interface StoredUser {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    avatar: string;
    role: 'traveler' | 'guide' | 'admin';
    walletBalance: number;
    walletEscrow: number;
    isVerified: boolean;
    guideLevel: number;
    completedTrips: number;
    rating: number;
    memberSince: string;
}

export const users: StoredUser[] = [
    {
        id: 'admin',
        name: 'Admin',
        email: 'admin',
        passwordHash: '$2a$10$Fuc0hO8PHo2m/hIUBDmPB.Zo3hcyD4LUQsKKdtGwQ5z1wkDSlllsy', // admin123
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff',
        role: 'admin',
        walletBalance: 0,
        walletEscrow: 0,
        isVerified: true,
        guideLevel: 0,
        completedTrips: 0,
        rating: 0,
        memberSince: '2023-01-01',
    },
    {
        id: 'u1',
        name: 'Aziz Rakhimov',
        email: 'aziz@example.com',
        passwordHash: '$2a$10$XQxBj3GhKN8SQxHlTz3JhO5v8wZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        role: 'traveler',
        walletBalance: 1250000,
        walletEscrow: 0,
        isVerified: true,
        guideLevel: 4,
        completedTrips: 12,
        rating: 4.8,
        memberSince: '2023-01-15',
    },
];

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and password are required' });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
    }

    const existing = users.find(u => u.email === email);
    if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: StoredUser = {
        id: `u${Date.now()}`,
        name,
        email,
        passwordHash,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`,
        role: 'traveler',
        walletBalance: 500000,
        walletEscrow: 0,
        isVerified: false,
        guideLevel: 0,
        completedTrips: 0,
        rating: 0,
        memberSince: new Date().toISOString().split('T')[0],
    };

    users.push(newUser);

    const token = generateToken(newUser.id);
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ token, user: userWithoutPassword });
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const token = generateToken(user.id);
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
});

// Get current user profile
router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
    const user = users.find(u => u.id === req.userId);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
});

export { router as authRouter };
