import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { TripDetails } from './pages/TripDetails';
import { CreateTrip } from './pages/CreateTrip';
import { Profile } from './pages/Profile';
import { Chat } from './pages/Chat';
import { NotFound } from './pages/NotFound';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
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
