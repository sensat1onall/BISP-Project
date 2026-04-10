// =============================================================================
// App.tsx — Root application component with routing configuration
// =============================================================================
// This is the top-level component that defines the entire routing structure of
// SafarGo. We use React Router v6's createBrowserRouter for data-aware routing.
//
// The route structure has three layers:
// 1. Public routes (login, register) — anyone can access these, no auth needed
// 2. Admin route (/admin) — wrapped in AdminRoute, only accessible by admin users
// 3. Protected routes (everything else) — wrapped in ProtectedRoute, requires login
//
// All the main app pages (home, trips, chat, profile) live under the "/" parent
// route which provides the Layout shell (navbar, sidebar, bottom nav, etc.).
// =============================================================================

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Home } from './pages/Home';
import { TripDetails } from './pages/TripDetails';
import { CreateTrip } from './pages/CreateTrip';
import { Profile } from './pages/Profile';
import { Chat } from './pages/Chat';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { Ticket } from './pages/Ticket';
import { NotFound } from './pages/NotFound';

const router = createBrowserRouter([
    // Public routes — no authentication required.
    // If a logged-in user hits these, the Login/Register components
    // will redirect them back to the home page.
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Register />,
    },

    // Admin dashboard — sits outside the main Layout because it has its own
    // full-page layout. AdminRoute checks if the user has role === 'admin'
    // and redirects non-admins to the home page.
    {
        path: '/admin',
        element: (
            <AdminRoute>
                <AdminDashboard />
            </AdminRoute>
        ),
    },

    // All protected app routes live under "/" with the shared Layout wrapper.
    // ProtectedRoute checks for a valid auth session and redirects to /login if not found.
    // The errorElement catches any rendering errors and shows the NotFound page.
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        errorElement: <NotFound />,
        children: [
            // Home page — the main trip browse/search view
            {
                index: true,
                element: <Home />,
            },
            // "My Trips" page — same Home component but filtered to only show
            // trips the current user has booked. We pass showBooked as a prop
            // instead of making a separate component.
            {
                path: 'my-trips',
                element: <Home showBooked={true} />,
            },
            // Trip details page — shows full info, weather, booking button, ratings
            {
                path: 'trip/:id',
                element: <TripDetails />,
            },
            // Trip creation form — only guides see the nav link to this, but the
            // route itself is accessible to anyone logged in (the form handles role checks)
            {
                path: 'create',
                element: <CreateTrip />,
            },
            // User profile — wallet, settings, guide application, etc.
            {
                path: 'profile',
                element: <Profile />,
            },
            // E-ticket page — shows a printable ticket with QR code after booking
            {
                path: 'ticket/:bookingId',
                element: <Ticket />,
            },
            // Group chat — has its own error boundary because real-time chat is
            // the most likely feature to have intermittent issues (websocket drops, etc.)
            {
                path: 'chat',
                element: <Chat />,
                errorElement: <div className="p-20 text-center"><p className="text-xl font-semibold dark:text-white">Chat temporarily unavailable</p><a href="/" className="text-emerald-600 hover:underline text-sm mt-2 block">Go Home</a></div>,
            },
        ],
    },
]);

// The AppProvider wraps everything and provides global state (current user, theme,
// language) via React Context. RouterProvider then handles all the routing.
function App() {
    return (
        <AppProvider>
            <RouterProvider router={router} />
        </AppProvider>
    );
}

export default App;
