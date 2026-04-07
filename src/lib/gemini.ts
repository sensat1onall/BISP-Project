import { aiApi } from './api';

export interface TripContentResult {
    description: string;
    durationDays: number;
    difficulty: 'easy' | 'moderate' | 'hard';
    distanceKm: number;
    altitudeGainM: number;
    category: 'hiking' | 'camping' | 'sightseeing';
    bestSeason: string;
    suggestedPrice?: number;
}

export interface WeatherWithRecommendations {
    temp: number;
    condition: string;
    icon: string;
    forecast: Array<{
        date: string;
        temp: number;
        condition: string;
        icon: string;
    }>;
    recommendations: string;
}

export interface AIWeatherForecast {
    temp: number;
    condition: string;
    forecast?: Array<{
        day: string;
        temp: number;
        icon: string;
    }>;
}

export const generateTripContent = async (title: string, location: string): Promise<TripContentResult | null> => {
    try {
        return await aiApi.generateTrip(title, location);
    } catch (error) {
        console.error('Trip generation error:', error);
        throw error;
    }
};

export const getWeatherWithRecommendations = async (
    location: string,
    startDate: string,
    endDate: string
): Promise<WeatherWithRecommendations | null> => {
    try {
        return await aiApi.getWeather(location, startDate, endDate);
    } catch (error) {
        console.error('Weather error:', error);
        return {
            temp: 22,
            condition: 'Sunny',
            icon: 'sun',
            forecast: [],
            recommendations: 'Check local weather conditions before your trip and pack accordingly.',
        };
    }
};

export const getAIWeatherForecast = async (location: string): Promise<AIWeatherForecast | null> => {
    try {
        return await aiApi.getWeatherForecast(location);
    } catch (error) {
        console.error('Weather forecast error:', error);
        return {
            temp: 22,
            condition: 'Sunny',
            forecast: [],
        };
    }
};
