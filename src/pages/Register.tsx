import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { SignInPage, Testimonial } from '../components/ui/sign-in';

const testimonials: Testimonial[] = [
    {
        avatarSrc: 'https://randomuser.me/api/portraits/men/75.jpg',
        name: 'Jamshid T.',
        handle: '@jamshid_guide',
        text: 'Started as a traveler, now I\'m a verified guide earning through the platform. Life-changing!',
    },
    {
        avatarSrc: 'https://randomuser.me/api/portraits/women/32.jpg',
        name: 'Dildora M.',
        handle: '@dildora_hikes',
        text: 'The community here is incredible. Met amazing people on every trip I booked.',
    },
    {
        avatarSrc: 'https://randomuser.me/api/portraits/men/22.jpg',
        name: 'Sardor B.',
        handle: '@sardor_camp',
        text: 'Best camping trips in Uzbekistan, all organized through this app. 5 stars!',
    },
];

export const Register = () => {
    const { register, language } = useApp();
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
                heroImageSrc="https://images.unsplash.com/photo-1682687982501-1e58ab814717?w=2160&q=80"
                testimonials={testimonials}
                onSignIn={handleSignUp}
                onGoogleSignIn={() => {}}
                onGoToSignIn={() => navigate('/login')}
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
