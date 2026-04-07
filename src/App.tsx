import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { TripDetails } from './pages/TripDetails';
import { CreateTrip } from './pages/CreateTrip';
import { Profile } from './pages/Profile';
import { Chat } from './pages/Chat';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
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
                path: 'chat',
                element: <Chat />,
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
