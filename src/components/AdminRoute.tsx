/**
 * AdminRoute - Route guard that restricts access to admin-only pages.
 *
 * This works just like ProtectedRoute but with an extra layer: it checks that the
 * user's role is 'admin'. It's a two-gate system:
 *
 * Gate 1: Is the user authenticated at all? If not -> redirect to /login
 * Gate 2: Is the user an admin? If not -> redirect to / (home page)
 *
 * The loading state is handled first so we don't make any redirect decisions until
 * we know for sure whether someone is logged in and what their role is.
 *
 * This guards the /admin route which shows the AdminDashboard with all the
 * platform management powers (ban users, verify guides, manage trips, etc.)
 *
 * Usage in the router:
 *   <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
 */
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isAuthLoading, user } = useApp();

    // Still checking auth status - show a loading spinner
    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                    <p className="text-sm text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in at all - send them to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but not an admin - send them to the home page instead.
    // Regular users should never see the admin dashboard, even if they
    // somehow navigate to /admin directly.
    if (user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // User is authenticated AND is an admin - show the admin content
    return <>{children}</>;
};
