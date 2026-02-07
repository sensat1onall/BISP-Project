import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="mb-6">Page not found</p>
            <Link to="/" className="text-emerald-600 hover:underline">Go Home</Link>
        </div>
    );
};
