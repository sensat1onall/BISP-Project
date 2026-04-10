// =============================================================================
// server/src/index.ts — Express backend server entry point
// =============================================================================
// This is the main server file for SafarGo's backend. The backend exists primarily
// to proxy AI calls to Google's Gemini API so we don't expose the API key in the
// browser. It also serves the production frontend build as static files, so in
// production we only need one server process (not separate frontend and backend).
//
// The server handles: security headers (Helmet), CORS for local development,
// AI API routes, and a health check endpoint for monitoring.
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { aiRouter } from './routes/ai.js';

// ESM doesn't have __dirname built in like CommonJS does, so we have to
// reconstruct it from import.meta.url. This is the standard workaround.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the .env file in the project root.
// We go up two directories because this file lives in server/src/.
dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Helmet sets a bunch of security-related HTTP headers automatically.
// We customize the Content Security Policy (CSP) to whitelist the domains our app
// actually needs to talk to: Supabase for the database, Unsplash for trip images,
// and Google's Generative AI API for Gemini calls. Without these exceptions,
// the browser would block those requests. crossOriginEmbedderPolicy is disabled
// because it conflicts with loading images from external domains.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.supabase.co"],
            connectSrc: ["'self'", "https://*.supabase.co", "https://generativelanguage.googleapis.com", process.env.FRONTEND_URL || 'http://localhost:5173'],
            fontSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration — in development, Vite's dev server runs on a different port
// than our Express server, so cross-origin requests happen. We whitelist the common
// Vite dev ports (5173, 5174, 5175) plus whatever FRONTEND_URL is set to in production.
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
    ],
    credentials: true,
}));

// Parse JSON request bodies with a 10MB limit. The limit is generous because
// trip creation can include base64-encoded images in the request body.
app.use(express.json({ limit: '10mb' }));

// API Routes — the health check is useful for monitoring and deployment checks.
// The AI router handles all the Gemini-powered endpoints (trip generation, weather, etc.)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/ai', aiRouter);

// In production, serve the Vite-built frontend as static files. The catch-all '*' route
// sends index.html for any non-API path, which lets React Router handle client-side routing.
// Without this, refreshing the page on /trip/123 would give a 404 from Express.
const distPath = join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
