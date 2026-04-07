import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Gemini with server-side API key (never exposed to client)
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
}

// Simple in-memory rate limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimiter.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }

    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    entry.count++;
    return true;
}

// Generate trip content
router.post('/generate-trip', async (req: Request, res: Response): Promise<void> => {
    if (!genAI) {
        res.status(503).json({ error: 'AI service not configured' });
        return;
    }

    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
    }

    const { title, location } = req.body;
    if (!title || !location) {
        res.status(400).json({ error: 'Title and location are required' });
        return;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);
        res.json(data);
    } catch (error) {
        console.error('Trip generation error:', error);
        res.status(500).json({ error: 'Failed to generate trip content' });
    }
});

// Get weather with recommendations
router.post('/weather', async (req: Request, res: Response): Promise<void> => {
    if (!genAI) {
        res.status(503).json({ error: 'AI service not configured' });
        return;
    }

    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
    }

    const { location, startDate, endDate } = req.body;
    if (!location || !startDate || !endDate) {
        res.status(400).json({ error: 'Location, startDate, and endDate are required' });
        return;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
                    { "date": "Mon 15", "temp": 5, "condition": "Snow", "icon": "snowflake" }
                ],
                "recommendations": "A helpful paragraph with specific advice."
            }

            Generate realistic seasonal weather for Uzbekistan. Be specific and helpful with recommendations.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);
        res.json(data);
    } catch (error) {
        console.error('Weather generation error:', error);
        // Fallback response
        res.json({
            temp: 22,
            condition: 'Sunny',
            icon: 'sun',
            forecast: [],
            recommendations: 'Check local weather conditions before your trip and pack accordingly.',
        });
    }
});

// Weather forecast (legacy endpoint)
router.post('/weather-forecast', async (req: Request, res: Response): Promise<void> => {
    if (!genAI) {
        res.status(503).json({ error: 'AI service not configured' });
        return;
    }

    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
    }

    const { location } = req.body;
    if (!location) {
        res.status(400).json({ error: 'Location is required' });
        return;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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
        const data = JSON.parse(cleanedText);
        res.json(data);
    } catch (error) {
        console.error('Weather forecast error:', error);
        res.json({
            temp: 22,
            condition: 'Sunny',
            forecast: [],
        });
    }
});

export { router as aiRouter };
