import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { SignInPage } from '../components/ui/sign-in';

export const Register = () => {
    const { register, language, theme, setTheme } = useApp();
    const navigate = useNavigate();
    const t = translations[language].auth;

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error || t.registerFailed);
        }
    };

    return (
        <div className="bg-background text-foreground">
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
                onGoogleSignIn={() => {}}
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
