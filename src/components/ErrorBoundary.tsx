/**
 * ErrorBoundary - React error boundary that catches JavaScript errors in child components.
 *
 * This is one of the few places in the app that uses a class component instead of
 * a function component. That's because React error boundaries REQUIRE class components -
 * there's no hook equivalent for getDerivedStateFromError or componentDidCatch (as of React 18).
 *
 * How it works:
 * - Wraps part of the component tree (usually the entire app or major sections)
 * - If any child component throws an error during rendering, this catches it
 * - Instead of the whole app crashing with a white screen, it shows a friendly error UI
 * - The user gets a "Reload Page" button to recover
 *
 * What it catches:
 * - Errors during rendering (e.g., accessing .property on null)
 * - Errors in lifecycle methods
 * - Errors in constructors of child components
 *
 * What it does NOT catch:
 * - Errors in event handlers (use try/catch for those)
 * - Errors in async code (promises, setTimeout)
 * - Errors thrown in the error boundary itself
 *
 * The getDerivedStateFromError static method is called when an error is thrown.
 * It returns the new state (hasError: true + the error object) which triggers
 * a re-render showing the fallback error UI instead of the broken component tree.
 */
import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        // Start with no error - everything is fine until proven otherwise
        this.state = { hasError: false };
    }

    // This static method gets called by React when a child throws an error.
    // Whatever we return here becomes the new state, which triggers a re-render.
    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    render() {
        // If an error was caught, show the fallback UI instead of the broken components
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                        {/* Big warning icon to make it clear something went wrong */}
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold dark:text-white mb-2">Something went wrong</h2>
                        {/* Show the actual error message if available - helps with debugging */}
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        {/* The simplest recovery action - just reload the entire page */}
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        // No error - render children normally as if this wrapper doesn't exist
        return this.props.children;
    }
}
