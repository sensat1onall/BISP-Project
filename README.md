# SafarGo — Your Journey Starts Here

A peer-to-peer travel marketplace connecting travelers with local guides across Uzbekistan. Built with React 19, Vite, Tailwind CSS, Supabase, and Express.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Supabase](https://supabase.com/) project with auth and database configured
- A [Gemini API key](https://aistudio.google.com/app/apikey) for AI features

## Setup

1. Install dependencies:

```bash
npm install
cd server && npm install && cd ..
```

2. Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

3. Start the development servers:

```bash
npm run dev          # Frontend on http://localhost:5173
cd server && npm run dev  # Backend on http://localhost:3001
```

## Production

```bash
npm run build   # Builds frontend + backend
npm start       # Serves everything from Express
```

## Features

- **Role Switching** — Switch between Traveler and Guide in your profile
- **AI Auto-Fill** — Generate trip details with Gemini AI
- **AI Weather** — Trip pages show AI-powered weather forecasts
- **Wallet** — Book trips and manage funds
- **Localization** — English, Russian, and Uzbek
- **Theming** — Dark and light mode
- **Google OAuth** — One-click sign-up with Google
- **Admin Dashboard** — User stats, trip monitoring, guide verification
