import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';
import { Mail, Lock, Eye, EyeOff, MapPin, Loader2, LogIn, Compass } from 'lucide-react';
import { MetalButton } from '../components/ui/liquid-glass-button';

export const Login = () => {
    const { login, language } = useApp();
    const navigate = useNavigate();
    const t = translations[language].auth;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
            {/* Hero Section */}
            <div className="relative h-56 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-6 right-10 opacity-20">
                    <Compass size={100} className="text-white animate-spin" style={{ animationDuration: '20s' }} />
                </div>
                <div className="absolute bottom-8 left-6 opacity-10">
                    <MapPin size={80} className="text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border border-white/30">
                        <MapPin size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{t.welcome}</h1>
                    <p className="text-white/80 text-sm mt-1">{t.welcomeSub}</p>
                </div>
            </div>

            {/* Form Section */}
            <div className="flex-1 px-6 -mt-8 relative z-10">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-md mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300 animate-in fade-in duration-200">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                {t.email}
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                {t.password}
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <MetalButton
                                variant="success"
                                type="submit"
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin mr-2" />
                                ) : (
                                    <LogIn size={20} className="mr-2" />
                                )}
                                {isLoading ? translations[language].common.loading : t.login}
                            </MetalButton>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs text-slate-400">{t.orContinue}</span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    </div>

                    {/* Link to Register */}
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                        {t.noAccount}{' '}
                        <Link
                            to="/register"
                            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                        >
                            {t.register}
                        </Link>
                    </p>
                </div>

                {/* Bottom Spacing */}
                <div className="h-8" />
            </div>
        </div>
    );
};
