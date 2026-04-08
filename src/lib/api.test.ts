import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiApi } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
});

// Mock import.meta.env
vi.stubGlobal('import', { meta: { env: { PROD: false } } });

describe('aiApi', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('generateTrip sends correct request', async () => {
        const mockResponse = {
            description: 'A beautiful hike',
            durationDays: 2,
            difficulty: 'moderate',
            distanceKm: 15,
            altitudeGainM: 800,
            category: 'hiking',
            bestSeason: 'Spring',
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        });

        const result = await aiApi.generateTrip('Mountain Hike', 'Chimgan');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/ai/generate-trip');
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual({
            title: 'Mountain Hike',
            location: 'Chimgan',
        });
        expect(result).toEqual(mockResponse);
    });

    it('getWeather sends location and dates', async () => {
        const mockWeather = {
            temp: 22,
            condition: 'Sunny',
            icon: 'sun',
            forecast: [],
            recommendations: 'Pack sunscreen',
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockWeather),
        });

        const result = await aiApi.getWeather('Chimgan', '2026-05-01', '2026-05-03');

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.location).toBe('Chimgan');
        expect(body.startDate).toBe('2026-05-01');
        expect(body.endDate).toBe('2026-05-03');
        expect(result.temp).toBe(22);
    });

    it('throws error on failed request', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
        });

        await expect(aiApi.generateTrip('Test', 'Test')).rejects.toThrow('Server error');
    });
});
