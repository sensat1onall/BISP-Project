import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: any = null;
try {
    if (API_KEY) {
        genAI = new GoogleGenerativeAI(API_KEY);
    }
} catch (e) {
    console.error("Failed to initialize Gemini Client", e);
}

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

export const generateTripContent = async (title: string, location: string): Promise<TripContentResult | null> => {
    if (!genAI) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
            You are a creative travel guide assistant for Uzbekistan.
            Generate a JSON object for a nature trip based on this title: "${title}" and location: "${location}".
            
            Return ONLY the raw JSON string with no markdown formatting.
            Structure:
            {
                "description": "2-3 sentences attractive description.",
                "durationDays": number (1-7),
                "difficulty": "easy" | "moderate" | "hard",
                "distanceKm": number (approx hiking/walking distance),
                "altitudeGainM": number (elevation gain in meters, 0 for flat terrains),
                "category": "hiking" | "camping" | "sightseeing",
                "bestSeason": "Spring/Summer/Autumn/Winter",
                "suggestedPrice": number (in UZS, typical range 200000-2000000)
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw error;
    }
};

export const getWeatherWithRecommendations = async (
    location: string,
    startDate: string,
    endDate: string
): Promise<WeatherWithRecommendations | null> => {
    if (!genAI) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const startFormatted = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endFormatted = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const prompt = `
            You are a helpful travel assistant. Generate a weather forecast and packing/safety recommendations for a trip.
            
            Location: "${location}, Uzbekistan"
            Trip dates: ${startFormatted} to ${endFormatted}
            
            Return ONLY raw JSON with no markdown:
            {
                "temp": number (average temperature in Celsius for these dates),
                "condition": "Sunny" | "Cloudy" | "Rain" | "Snow" | "Partly Cloudy",
                "icon": "sun" | "cloud" | "cloud-rain" | "snowflake" | "cloud-sun",
                "forecast": [
                    { "date": "Mon 15", "temp": 5, "condition": "Snow", "icon": "snowflake" },
                    { "date": "Tue 16", "temp": 3, "condition": "Snow", "icon": "snowflake" }
                ],
                "recommendations": "A helpful paragraph with specific advice like: 'It will be snowing during your trip! Don't forget to bring warm gloves, a winter hat, and waterproof boots. Pack layers and bring hand warmers for the cold mountain air.' Be specific about the weather conditions and what to pack."
            }
            
            Generate realistic seasonal weather for Uzbekistan. Be specific and helpful with recommendations.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Gemini Weather Error:", error);
        // Fallback
        return {
            temp: 22,
            condition: "Sunny",
            icon: "sun",
            forecast: [],
            recommendations: "Check local weather conditions before your trip and pack accordingly."
        };
    }
};

// Legacy function for compatibility
export const getAIWeatherForecast = async (location: string) => {
    if (!genAI) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const prompt = `
            Generate a simulated 3-day weather forecast for "${location}, Uzbekistan" for the upcoming weekend.
            Return ONLY the raw JSON string.
            Structure:
            {
                "temp": number (current temp in Celsius),
                "condition": "Sunny" | "Cloudy" | "Rain" | "Snow",
                "forecast": [
                    { "day": "Sat", "temp": 24, "icon": "sun" },
                    { "day": "Sun", "temp": 22, "icon": "cloud" }
                ]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Gemini Weather Error:", error);
        // Fallback
        return {
            temp: 22,
            condition: "Sunny",
            forecast: []
        };
    }
};
