import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { SignInPage } from '../components/ui/sign-in';
import { Boxes } from '../components/ui/background-boxes';

export const Login = () => {
    const { login, signInWithGoogle, language, theme, setTheme } = useApp();
    const navigate = useNavigate();
    const t = translations[language].auth;

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        setIsLoading(true);
        const result = await login(email, password);
        setIsLoading(false);

        if (result.success) {
            navigate(result.role === 'admin' ? '/admin' : '/');
        } else {
            setError(result.error || t.loginFailed);
        }
    };

    return (
        <div className="bg-background text-foreground relative overflow-hidden">
            <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900 z-0">
                <Boxes />
            </div>
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
                onResetPassword={() => {}}
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
