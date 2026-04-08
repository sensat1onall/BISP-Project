import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Gemini with server-side API key (never exposed to client)
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
}

// Input sanitization to prevent injection attacks
function sanitizeInput(input: unknown): string {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 500).replace(/[<>]/g, '');
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

    const title = sanitizeInput(req.body.title);
    const location = sanitizeInput(req.body.location);
    if (!title || !location) {
        res.status(400).json({ error: 'Title and location are required' });
        return;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const location = sanitizeInput(req.body.location);
    const { startDate, endDate } = req.body;
    if (!location || !startDate || !endDate) {
        res.status(400).json({ error: 'Location, startDate, and endDate are required' });
        return;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const location = sanitizeInput(req.body.location);
    if (!location) {
        res.status(400).json({ error: 'Location is required' });
        return;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

// Generate chat welcome message with trip tips
router.post('/chat-welcome', async (req: Request, res: Response): Promise<void> => {
    if (!genAI) {
        res.json({ message: 'Welcome to the trip group! Feel free to discuss plans and coordinate with your group.' });
        return;
    }

    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
        res.json({ message: 'Welcome to the trip group! Feel free to discuss plans and coordinate with your group.' });
        return;
    }

    const tripName = sanitizeInput(req.body.tripName);
    const location = sanitizeInput(req.body.location);
    const difficulty = sanitizeInput(req.body.difficulty);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            You are SafarGo, a friendly travel assistant bot for a trip group chat in Uzbekistan.
            Generate a short, warm welcome message (2-3 sentences max) for a group chat for this trip:

            Trip: "${tripName}"
            Location: "${location}, Uzbekistan"
            Difficulty: "${difficulty}"

            Include 2-3 practical packing tips specific to the location and difficulty.
            Keep it casual and friendly. Use 1-2 emojis. Return ONLY the plain text message, no JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        res.json({ message: text });
    } catch (error) {
        console.error('Chat welcome error:', error);
        res.json({ message: `Welcome to ${tripName || 'the trip'}! Pack comfortable shoes, sunscreen, and plenty of water. Have a great adventure! 🏔️` });
    }
});

// Generate trip itinerary (hour-by-hour schedule)
router.post('/generate-itinerary', async (req: Request, res: Response): Promise<void> => {
    if (!genAI) {
        res.status(503).json({ error: 'AI service not configured' });
        return;
    }

    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
    }

    const title = sanitizeInput(req.body.title);
    const location = sanitizeInput(req.body.location);
    const durationDays = Number(req.body.durationDays) || 1;
    const difficulty = sanitizeInput(req.body.difficulty);

    if (!title || !location) {
        res.status(400).json({ error: 'Title and location are required' });
        return;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            You are a professional trip planner for Uzbekistan adventures.
            Create a detailed hour-by-hour itinerary for this trip:

            Trip: "${title}"
            Location: "${location}, Uzbekistan"
            Duration: ${durationDays} day(s)
            Difficulty: "${difficulty}"

            Return ONLY raw JSON with no markdown:
            {
                "days": [
                    {
                        "day": 1,
                        "title": "Day 1 - Arrival & Setup",
                        "activities": [
                            { "time": "07:00", "activity": "Meet at departure point", "description": "Brief description" },
                            { "time": "08:30", "activity": "Travel to location", "description": "Brief description" }
                        ]
                    }
                ],
                "packingList": ["item1", "item2", "item3"],
                "safetyTips": "Brief safety paragraph"
            }

            Make it realistic for Uzbekistan terrain. Include meal breaks, rest stops, and realistic timing.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);
        res.json(data);
    } catch (error) {
        console.error('Itinerary generation error:', error);
        res.status(500).json({ error: 'Failed to generate itinerary' });
    }
});

export { router as aiRouter };
