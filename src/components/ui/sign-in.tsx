import React, { useState } from 'react';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.801 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
    avatarSrc: string;
    name: string;
    handle: string;
    text: string;
}

interface SignInPageProps {
    mode?: 'signin' | 'signup';
    title?: React.ReactNode;
    description?: React.ReactNode;
    heroImageSrc?: string;
    testimonials?: Testimonial[];
    onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
    onGoogleSignIn?: () => void;
    onResetPassword?: () => void;
    onCreateAccount?: () => void;
    onGoToSignIn?: () => void;
    onToggleTheme?: () => void;
    isDark?: boolean;
    error?: string;
    isLoading?: boolean;
    submitLabel?: string;
    switchLabel?: string;
    switchLinkLabel?: string;
    orContinueText?: string;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-emerald-400/70 focus-within:bg-emerald-500/10">
        {children}
    </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
    <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
        <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
        <div className="text-sm leading-snug">
            <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
            <p className="text-muted-foreground">{testimonial.handle}</p>
            <p className="mt-1 text-foreground/80">{testimonial.text}</p>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
    mode = 'signin',
    title = <span className="font-light text-foreground tracking-tighter">Welcome</span>,
    description = "Access your account and continue your journey with us",
    heroImageSrc,
    testimonials = [],
    onSignIn,
    onGoogleSignIn,
    onResetPassword,
    onCreateAccount,
    onGoToSignIn,
    onToggleTheme,
    isDark = false,
    error,
    isLoading = false,
    submitLabel = 'Sign In',
    switchLabel = 'New to our platform?',
    switchLinkLabel = 'Create Account',
    orContinueText = 'Or continue with',
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw]">
            {/* Left column: sign-in form */}
            <section className="flex-1 flex items-center justify-center p-8 overflow-y-auto relative">
                {/* Theme toggle */}
                {onToggleTheme && (
                    <button
                        onClick={onToggleTheme}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="absolute top-6 right-6 p-2 rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors"
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                )}

                <div className="w-full max-w-md">
                    <div className="flex flex-col gap-6">
                        <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
                        <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

                        {/* Error */}
                        {error && (
                            <div role="alert" aria-live="assertive" className="animate-element bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <form className="space-y-5" onSubmit={onSignIn}>
                            {/* Name field (sign-up only) */}
                            {mode === 'signup' && (
                                <div className="animate-element animate-delay-200">
                                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                    <GlassInputWrapper>
                                        <input
                                            name="name"
                                            type="text"
                                            placeholder="Enter your full name"
                                            className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground"
                                            required
                                        />
                                    </GlassInputWrapper>
                                </div>
                            )}

                            <div className={`animate-element ${mode === 'signup' ? 'animate-delay-300' : 'animate-delay-300'}`}>
                                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                                <GlassInputWrapper>
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="Enter your email address"
                                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground"
                                        required
                                    />
                                </GlassInputWrapper>
                            </div>

                            <div className={`animate-element ${mode === 'signup' ? 'animate-delay-400' : 'animate-delay-400'}`}>
                                <label className="text-sm font-medium text-muted-foreground">Password</label>
                                <GlassInputWrapper>
                                    <div className="relative">
                                        <input
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground"
                                            required
                                            minLength={6}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                                            {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                                        </button>
                                    </div>
                                </GlassInputWrapper>
                            </div>

                            {/* Confirm password (sign-up only) */}
                            {mode === 'signup' && (
                                <div className="animate-element animate-delay-500">
                                    <label className="text-sm font-medium text-muted-foreground">Confirm Password</label>
                                    <GlassInputWrapper>
                                        <div className="relative">
                                            <input
                                                name="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Confirm your password"
                                                className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-foreground placeholder:text-muted-foreground"
                                                required
                                                minLength={6}
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-3 flex items-center">
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                                            </button>
                                        </div>
                                    </GlassInputWrapper>
                                </div>
                            )}

                            {/* Remember me + Reset (sign-in only) */}
                            {mode === 'signin' && (
                                <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                                        <span className="text-foreground/90">Keep me signed in</span>
                                    </label>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); onResetPassword?.(); }}
                                        className="hover:underline text-emerald-500 transition-colors"
                                    >
                                        Reset password
                                    </a>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`animate-element ${mode === 'signup' ? 'animate-delay-600' : 'animate-delay-600'} w-full rounded-2xl bg-emerald-600 py-4 font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Loading...
                                    </span>
                                ) : submitLabel}
                            </button>
                        </form>

                        <div className={`animate-element ${mode === 'signup' ? 'animate-delay-700' : 'animate-delay-700'} relative flex items-center justify-center`}>
                            <span className="w-full border-t border-border"></span>
                            <span className="px-4 text-sm text-muted-foreground bg-background absolute whitespace-nowrap">{orContinueText}</span>
                        </div>

                        <button
                            onClick={onGoogleSignIn}
                            className={`animate-element ${mode === 'signup' ? 'animate-delay-800' : 'animate-delay-800'} w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors`}
                        >
                            <GoogleIcon />
                            Continue with Google
                        </button>

                        <p className={`animate-element ${mode === 'signup' ? 'animate-delay-900' : 'animate-delay-900'} text-center text-sm text-muted-foreground`}>
                            {switchLabel}{' '}
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (mode === 'signin') onCreateAccount?.();
                                    else onGoToSignIn?.();
                                }}
                                className="text-emerald-500 hover:underline transition-colors font-medium"
                            >
                                {switchLinkLabel}
                            </a>
                        </p>
                    </div>
                </div>
            </section>

            {/* Right column: hero image + testimonials */}
            {heroImageSrc && (
                <section className="hidden md:block flex-1 relative p-4">
                    <div
                        className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
                        style={{ backgroundImage: `url(${heroImageSrc})` }}
                    />
                    {testimonials.length > 0 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
                            <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                            {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
                            {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};
