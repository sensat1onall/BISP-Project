import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { SignInPage } from '../components/ui/sign-in';
import { Boxes } from '../components/ui/background-boxes';
import { Mail, CheckCircle } from 'lucide-react';

export const Register = () => {
    const { register, signInWithGoogle, language, theme, setTheme } = useApp();
    const navigate = useNavigate();
    const t = translations[language].auth;

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password.length < 6) {
            setError(t.passwordTooShort);
            return;
        }

        if (password !== confirmPassword) {
            setError(t.passwordMismatch);
            return;
        }

        setIsLoading(true);
        const result = await register(name, email, password);
        setIsLoading(false);

        if (result.success && result.needsConfirmation) {
            setRegisteredEmail(email);
            setEmailSent(true);
        } else if (result.success) {
            navigate('/');
        } else {
            setError(result.error || t.registerFailed);
        }
    };

    // Email confirmation success screen
    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail size={36} className="text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-bold dark:text-white mb-3">Check your email</h1>
                    <p className="text-muted-foreground mb-2">
                        We've sent a confirmation link to
                    </p>
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-6">
                        {registeredEmail}
                    </p>
                    <p className="text-sm text-muted-foreground mb-8">
                        Click the link in the email to verify your account and start your journey with SafarGo.
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3 text-left">
                            <CheckCircle size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                <p className="font-medium mb-1">Didn't receive the email?</p>
                                <p className="text-slate-400">Check your spam folder or try registering again with a different email.</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                        Go to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background text-foreground relative overflow-hidden">
            <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
                <Boxes className="pointer-events-auto" />
            </div>
            <SignInPage
                mode="signup"
                title={
                    <span className="font-light text-foreground tracking-tighter">
                        {t.joinUs} <span className="text-emerald-500">.</span>
                    </span>
                }
                description={t.joinUsSub}
                heroImageSrc="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2160&q=80"
                onSignIn={handleSignUp}
                onGoogleSignIn={signInWithGoogle}
                onGoToSignIn={() => navigate('/login')}
                onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                isDark={theme === 'dark'}
                error={error}
                isLoading={isLoading}
                submitLabel={t.register}
                switchLabel={t.hasAccount}
                switchLinkLabel={t.login}
                orContinueText={t.orContinue}
            />
        </div>
    );
};
