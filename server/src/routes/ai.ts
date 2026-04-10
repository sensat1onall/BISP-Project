// =============================================================================
// server/src/routes/ai.ts — AI-powered API endpoints using Google Gemini
// =============================================================================
// This file contains all the Express routes that talk to Google's Gemini AI.
// These endpoints are the whole reason the backend exists — we proxy AI calls
// through here so the Gemini API key never gets exposed to the browser.
//
// Every endpoint follows the same pattern:
// 1. Check if Gemini is configured (API key present)
// 2. Rate limit the request (20 requests per minute per IP)
// 3. Sanitize all user inputs to prevent prompt injection
// 4. Send a structured prompt to Gemini asking for JSON output
// 5. Parse the JSON response and send it back to the client
// 6. If anything fails, return a sensible fallback or error
//
// All prompts ask Gemini to return raw JSON (no markdown formatting) because
// Gemini sometimes wraps responses in ```json blocks, so we strip those out
// just in case before parsing.
// =============================================================================

import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Gemini with the server-side API key. We check both VITE_GEMINI_API_KEY
// (for backward compat from when the frontend called Gemini directly) and GEMINI_API_KEY.
// If neither is set, genAI stays null and all endpoints return 503.
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
}

// Input sanitization to prevent prompt injection attacks. We trim whitespace,
// cap length at 500 chars (nobody needs a longer location name), and strip
// angle brackets to prevent any HTML/XML injection attempts. This isn't bulletproof
// but it covers the obvious attack vectors for our use case.
function sanitizeInput(input: unknown): string {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 500).replace(/[<>]/g, '');
}

// Simple in-memory rate limiter. Each IP address gets a counter that resets every
// 60 seconds. After 20 requests in a window, we start returning 429 (Too Many Requests).
// This is intentionally simple — we're not using Redis or anything because the server
// only handles AI requests and the traffic is low. In a high-traffic scenario you'd
// want something more robust, but for a university project this works great.
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimiter.get(ip);

    // If no entry exists or the window has expired, start a fresh counter
    if (!entry || now > entry.resetTime) {
        rateLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }

    // If they've hit the limit, deny the request
    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    // Otherwise, increment and allow
    entry.count++;
    return true;
}

// =============================================================================
// POST /generate-trip — Auto-generate trip details from a title and location
// =============================================================================
// This is used on the trip creation form. When a guide types "Chimgan Mountain Hike"
// and selects "Tashkent Region", we call Gemini to generate a full trip description,
// difficulty level, estimated distance, altitude gain, category, best season, and
// a suggested price in UZS. Saves the guide a ton of typing.
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

        // The prompt is carefully structured to get consistent JSON output.
        // We specify exact field names, types, and value ranges so the response
        // can be parsed reliably. Gemini is told to act as a travel guide for Uzbekistan.
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

        // Gemini sometimes wraps its JSON in ```json ... ``` code blocks even when
        // we tell it not to. We strip those out before parsing to be safe.
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);
        res.json(data);
    } catch (error) {
        console.error('Trip generation error:', error);
        res.status(500).json({ error: 'Failed to generate trip content' });
    }
});

// =============================================================================
// POST /weather — Get detailed weather forecast with packing recommendations
// =============================================================================
// This endpoint generates realistic seasonal weather for a specific Uzbekistan location
// and date range. It returns temperature, conditions, a day-by-day forecast, and
// personalized packing/safety recommendations. Used on the trip details page.
// If Gemini fails, we return a sunny-day fallback so the page doesn't break.
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

        // Format dates nicely for the prompt so Gemini understands the time of year
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
        // Fallback response so the frontend doesn't crash — better to show generic
        // weather than an error message where the weather widget should be
        res.json({
            temp: 22,
            condition: 'Sunny',
            icon: 'sun',
            forecast: [],
            recommendations: 'Check local weather conditions before your trip and pack accordingly.',
        });
    }
});

// =============================================================================
// POST /weather-forecast — Simple 3-day weather forecast (legacy endpoint)
// =============================================================================
// This is the older, simpler weather endpoint that some components still use.
// It just returns a basic 3-day forecast without the detailed recommendations.
// We kept it around for backward compatibility rather than migrating everything
// to the newer /weather endpoint above.
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
        // Same idea — return safe fallback data instead of an error
        res.json({
            temp: 22,
            condition: 'Sunny',
            forecast: [],
        });
    }
});

// =============================================================================
// POST /chat-welcome — Generate a welcome message for trip group chats
// =============================================================================
// When a new group chat is created for a trip, we send an AI-generated welcome
// message with packing tips tailored to the trip's location and difficulty.
// This endpoint is extra fault-tolerant — even if Gemini is down or rate limited,
// we still return a generic welcome message instead of an error, because failing
// to send a welcome message shouldn't break the chat experience.
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

        // We tell Gemini to act as "SafarGo" — our travel assistant bot persona.
        // The prompt asks for a short, casual message with practical packing tips.
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

// =============================================================================
// POST /generate-itinerary — Create a detailed hour-by-hour trip schedule
// =============================================================================
// This is the most complex AI endpoint. It generates a full day-by-day itinerary
// with specific times, activities, and descriptions, plus a packing list and safety
// tips. Guides use this to plan their trips and travelers can view it to know exactly
// what to expect. The prompt asks for realistic Uzbekistan-specific timing with
// meal breaks and rest stops factored in.
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
