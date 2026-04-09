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
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Register />,
    },
    {
        path: '/admin',
        element: (
            <AdminRoute>
                <AdminDashboard />
            </AdminRoute>
        ),
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        errorElement: <NotFound />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: 'my-trips',
                element: <Home showBooked={true} />,
            },
            {
                path: 'trip/:id',
                element: <TripDetails />,
            },
            {
                path: 'create',
                element: <CreateTrip />,
            },
            {
                path: 'profile',
                element: <Profile />,
            },
            {
                path: 'ticket/:bookingId',
                element: <Ticket />,
            },
            {
                path: 'chat',
                element: <Chat />,
                errorElement: <div className="p-20 text-center"><p className="text-xl font-semibold dark:text-white">Chat temporarily unavailable</p><a href="/" className="text-emerald-600 hover:underline text-sm mt-2 block">Go Home</a></div>,
            },
        ],
    },
]);

function App() {
    return (
        <AppProvider>
            <RouterProvider router={router} />
        </AppProvider>
    );
}

export default App;
