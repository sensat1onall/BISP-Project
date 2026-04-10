/**
 * Login.tsx - The sign-in page for SafarGo.
 *
 * This page handles the authentication flow for existing users. It provides:
 *   - Email + password sign-in via Supabase Auth
 *   - Google OAuth sign-in (redirects to Google, then back)
 *   - Link to the registration page for new users
 *   - Theme toggle (light/dark mode)
 *   - Animated background using the Boxes component
 *   - Error display for invalid credentials
 *   - Loading state while the auth request is in flight
 *
 * The actual sign-in form UI comes from the reusable SignInPage component
 * (src/components/ui/sign-in.tsx), which handles the form layout, hero image,
 * input fields, and all the visual stuff. This Login component just provides
 * the business logic (what happens when you click "Sign In").
 *
 * Auth flow:
 * 1. User fills in email and password
 * 2. handleSignIn calls context.login() which hits Supabase Auth
 * 3. On success, the user is redirected based on role:
 *    - Admins go to /admin
 *    - Everyone else goes to / (home/explore page)
 * 4. On failure, the error message is shown below the form
 *
 * Google OAuth flow:
 * 1. User clicks "Continue with Google"
 * 2. signInWithGoogle() redirects to Google's OAuth consent screen
 * 3. After authenticating, Google redirects back to the app
 * 4. The onAuthStateChange listener in AppContext picks up the new session
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { SignInPage } from '../components/ui/sign-in';
import { Boxes } from '../components/ui/background-boxes';

export const Login = () => {
    const { login, signInWithGoogle, language, theme, setTheme } = useApp();
    const navigate = useNavigate();
    // Get translated strings for the current language
    const t = translations[language].auth;

    // Local state for error messages and loading indicator
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * handleSignIn - Called when the user submits the login form.
     *
     * Extracts email and password from the form data, calls the login function
     * from AppContext, and handles the result. The form uses native FormData
     * instead of controlled inputs for simplicity.
     */
    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        // Extract form values using native FormData API
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        setIsLoading(true);
        const result = await login(email, password);
        setIsLoading(false);

        if (result.success) {
            // Redirect based on user role: admins go to admin panel, others go home
            navigate(result.role === 'admin' ? '/admin' : '/');
        } else {
            // Show the error message from Supabase (e.g., "Invalid login credentials")
            setError(result.error || t.loginFailed);
        }
    };

    return (
        <div className="bg-background text-foreground relative overflow-hidden">
            {/* Animated background - the Boxes component creates a grid of floating colored boxes.
                It sits behind the sign-in form with z-0 and a fixed position so it covers
                the entire viewport. */}
            <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900 z-0">
                <Boxes />
            </div>

            {/* SignInPage is a reusable UI component that renders the split-screen layout:
                - Left side: hero image (nature landscape)
                - Right side: sign-in form with email, password, Google button
                All the visual layout and styling is handled by SignInPage.
                We just pass in the callbacks and configuration props. */}
            <SignInPage
                mode="signin"
                title={
                    <span className="font-light text-foreground tracking-tighter">
                        {t.welcome} <span className="text-emerald-500">.</span>
                    </span>
                }
                description={t.welcomeSub}
                heroImageSrc="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=2160&q=80"
                onSignIn={handleSignIn}
                onGoogleSignIn={signInWithGoogle}
                onResetPassword={() => {}} // not implemented yet
                onCreateAccount={() => navigate('/register')}
                onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                isDark={theme === 'dark'}
                error={error}
                isLoading={isLoading}
                submitLabel={t.login}
                switchLabel={t.noAccount}
                switchLinkLabel={t.register}
                orContinueText={t.orContinue}
            />
        </div>
    );
};
