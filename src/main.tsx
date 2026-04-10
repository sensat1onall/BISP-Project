// =============================================================================
// main.tsx — React application entry point
// =============================================================================
// This is the very first file that runs when the browser loads the app. It grabs
// the root DOM element, creates a React root, and mounts our App component.
// StrictMode is enabled to catch potential problems during development (it double-
// renders components to help find side effects). The ErrorBoundary wraps the entire
// app so if anything catastrophically breaks, we show a friendly error screen
// instead of a blank white page.
// =============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'

// The '!' after getElementById is a non-null assertion — we know the 'root' div
// exists in index.html, so this is safe. If it somehow didn't exist, React would
// throw a clear error anyway.
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)
