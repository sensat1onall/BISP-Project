import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Mock useApp with different states
const mockUseApp = vi.fn();
vi.mock('../context/AppContext', () => ({
    useApp: () => mockUseApp(),
}));

describe('ProtectedRoute', () => {
    it('shows loading spinner when auth is loading', () => {
        mockUseApp.mockReturnValue({ isAuthenticated: false, isAuthLoading: true });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
        mockUseApp.mockReturnValue({ isAuthenticated: false, isAuthLoading: false });

        render(
            <MemoryRouter initialEntries={['/profile']}>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders children when authenticated', () => {
        mockUseApp.mockReturnValue({ isAuthenticated: true, isAuthLoading: false });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});
