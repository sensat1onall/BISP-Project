import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { aiRouter } from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
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

app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
    ],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/ai', aiRouter);

// Serve frontend build in production
const distPath = join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
