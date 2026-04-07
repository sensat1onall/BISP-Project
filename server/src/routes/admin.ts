import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { users } from './auth.js';

const router = Router();

// Admin guard middleware
function adminOnly(req: AuthRequest, res: Response, next: () => void): void {
    const user = users.find(u => u.id === req.userId);
    if (!user || user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}

// Get all users
router.get('/users', authMiddleware, adminOnly, (_req: AuthRequest, res: Response): void => {
    const safeUsers = users
        .filter(u => u.role !== 'admin')
        .map(({ passwordHash: _, ...user }) => user);
    res.json({ users: safeUsers });
});

// Get dashboard stats
router.get('/stats', authMiddleware, adminOnly, (_req: AuthRequest, res: Response): void => {
    const totalUsers = users.filter(u => u.role !== 'admin').length;
    const travelers = users.filter(u => u.role === 'traveler').length;
    const guides = users.filter(u => u.role === 'guide').length;
    const verifiedGuides = users.filter(u => u.role === 'guide' && u.isVerified).length;
    const totalBalance = users.reduce((sum, u) => sum + u.walletBalance, 0);

    res.json({
        stats: {
            totalUsers,
            travelers,
            guides,
            verifiedGuides,
            totalBalance,
        },
    });
});

export { router as adminRouter };
