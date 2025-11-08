import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

const backgroundImage = 'https://images.unsplash.com/photo-1544161515-cfd626dba494?auto=format&fit=crop&w=1280&q=80';

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.512-11.01-8.244l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,36.49,44,30.861,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

interface AuthScreenProps {
    onDevLogin: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onDevLogin }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) {
                setMessage(error.message);
            } else {
                setMessage(t('auth_confirm_signup'));
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setMessage(error.message);
            }
            // On success, onAuthStateChange in App.tsx will handle the redirect.
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) {
            setMessage(error.message);
            setLoading(false);
        }
    };


    return (
        <div className="relative flex flex-col min-h-screen text-white">
            <div
                className="absolute inset-0 bg-cover bg-center -z-10"
                style={{ backgroundImage: `url("${backgroundImage}")` }}
            />
            <div className="absolute inset-0 bg-black/70 -z-10" />

            <header className="w-full flex justify-end p-4 sm:p-6">
                <LanguageSwitcher />
            </header>
            <main className="flex flex-col items-center justify-center flex-grow text-center p-4 sm:p-6">
                <h1 className="text-4xl font-bold mb-4">{t('welcome_title')}</h1>
                <p className="text-lg text-slate-300 mb-8 max-w-md">
                    {t('auth_subtitle')}
                </p>

                <div className="w-full max-w-sm mb-8 space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('email_placeholder')}
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-4 text-lg focus:ring-amber-500 focus:border-amber-500 placeholder-slate-500"
                            required
                            autoFocus
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('password_placeholder')}
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-4 text-lg focus:ring-amber-500 focus:border-amber-500 placeholder-slate-500"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-amber-500 text-slate-900 font-bold py-4 px-10 rounded-full text-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                            {loading ? t('auth_sending') : (isSignUp ? t('auth_sign_up') : t('auth_sign_in'))}
                        </button>
                    </form>
                    
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-amber-400 hover:text-amber-300 underline"
                    >
                       {isSignUp ? t('auth_go_to_signin') : t('auth_go_to_signup')}
                    </button>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-900/80 px-2 text-sm text-slate-500">{t('auth_or')}</span>
                        </div>
                    </div>
                     <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white text-slate-800 font-semibold py-3 px-10 rounded-full text-base hover:bg-slate-200 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                        <GoogleIcon />
                        {t('auth_sign_in_google')}
                    </button>
                     <button
                        onClick={onDevLogin}
                        className="w-full bg-slate-700 text-slate-200 font-semibold py-3 px-10 rounded-full text-base hover:bg-slate-600 transition-colors"
                    >
                        {t('auth_dev_login')}
                    </button>
                </div>
                {message && <p className="text-amber-300">{message}</p>}
            </main>
        </div>
    );
};