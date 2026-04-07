import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { SignInPage, Testimonial } from '../components/ui/sign-in';

const testimonials: Testimonial[] = [
    {
        avatarSrc: 'https://randomuser.me/api/portraits/women/44.jpg',
        name: 'Nilufar K.',
        handle: '@nilufar_travels',
        text: 'Found the most amazing hiking guide through this platform. Chimgan was breathtaking!',
    },
    {
        avatarSrc: 'https://randomuser.me/api/portraits/men/36.jpg',
        name: 'Bobur A.',
        handle: '@bobur_adventure',
        text: 'As a guide, this app helped me connect with travelers from all over. Highly recommend!',
    },
    {
        avatarSrc: 'https://randomuser.me/api/portraits/women/68.jpg',
        name: 'Madina R.',
        handle: '@madina_explorer',
        text: 'The AI trip recommendations are spot on. Made planning our Samarkand trip so easy.',
    },
];

export const Login = () => {
    const { login, language } = useApp();
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
            navigate('/');
        } else {
            setError(result.error || t.loginFailed);
        }
    };

    return (
        <div className="bg-background text-foreground">
            <SignInPage
                mode="signin"
                title={
                    <span className="font-light text-foreground tracking-tighter">
                        {t.welcome} <span className="text-emerald-500">.</span>
                    </span>
                }
                description={t.welcomeSub}
                heroImageSrc="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=2160&q=80"
                testimonials={testimonials}
                onSignIn={handleSignIn}
                onGoogleSignIn={() => {}}
                onResetPassword={() => {}}
                onCreateAccount={() => navigate('/register')}
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
