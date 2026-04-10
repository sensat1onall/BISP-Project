/**
 * ProtectedRoute - Auth guard component that protects routes from unauthenticated users.
 *
 * This is the classic "route guard" pattern in React. You wrap any route that requires
 * login with this component, and it handles three scenarios:
 *
 * 1. Auth is still loading (checking Supabase session) -> Show a loading spinner.
 *    Without this, the app would flash the login page briefly on every page refresh
 *    before the session check completes.
 *
 * 2. User is NOT authenticated -> Redirect to /login using React Router's Navigate.
 *    The "replace" prop means the redirect replaces the current history entry,
 *    so hitting the back button won't take them back to the protected page.
 *
 * 3. User IS authenticated -> Render the children (the actual page content).
 *
 * Usage in the router:
 *   <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
 */
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isAuthLoading } = useApp();

    // Still checking if the user has a valid session - show a spinner so we don't
    // flash the login page on refresh
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

    // Not logged in - bounce them to the login page
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // All good - render the protected page content
    return <>{children}</>;
};
