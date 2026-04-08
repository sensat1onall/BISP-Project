import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TripCard } from './TripCard';
import { Trip } from '../types';

// Mock useApp context
vi.mock('../context/AppContext', () => ({
    useApp: vi.fn(() => ({ language: 'en' })),
}));

const mockTrip: Trip = {
    id: 'trip-1',
    guideId: 'guide-1',
    title: 'Chimgan Mountains Hike',
    description: 'A beautiful hike through the Chimgan mountains.',
    location: 'Chimgan, Tashkent',
    price: 250000,
    maxSeats: 12,
    bookedSeats: 5,
    startDate: '2026-05-15',
    durationDays: 2,
    difficulty: 'moderate',
    category: 'hiking',
    images: ['https://example.com/photo.jpg'],
    distanceKm: 15,
    altitudeGainM: 800,
    ratings: [],
};

describe('TripCard', () => {
    const renderCard = (trip = mockTrip) =>
        render(
            <MemoryRouter>
                <TripCard trip={trip} />
            </MemoryRouter>
        );

    it('renders the trip title', () => {
        renderCard();
        expect(screen.getByText('Chimgan Mountains Hike')).toBeInTheDocument();
    });

    it('renders the trip location', () => {
        renderCard();
        expect(screen.getByText('Chimgan, Tashkent')).toBeInTheDocument();
    });

    it('renders the formatted price', () => {
        renderCard();
        expect(screen.getByText(/250k UZS/)).toBeInTheDocument();
    });

    it('shows available spots', () => {
        renderCard();
        expect(screen.getByText(/7/)).toBeInTheDocument(); // 12 - 5 = 7
    });

    it('displays the difficulty badge', () => {
        renderCard();
        expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('renders the trip image with alt text', () => {
        renderCard();
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt', 'Chimgan Mountains Hike in Chimgan, Tashkent');
    });

    it('shows rating when available', () => {
        const tripWithRating = { ...mockTrip, averageRating: 4.5 };
        renderCard(tripWithRating);
        expect(screen.getByText('4.5')).toBeInTheDocument();
    });
});
