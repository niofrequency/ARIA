import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from './ui/button';

const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (isLogin) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Identification required: Please enter email.");
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await auth.sendPasswordResetEmail(email);
            setSuccess("Recovery protocol dispatched to inbox.");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen p-4 bg-zinc-950 overflow-hidden">
            {/* Tech Grid Background */}
            <div className="absolute inset-0 z-0 opacity-20" 
                 style={{ backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>
            
            {/* Ambient Purple Glow */}
            <div className="absolute w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] z-0" />

            <div className="relative z-10 w-full max-w-md mx-auto bg-white/[0.02] backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10">
                <div className="text-center mb-8">
                    <div className="relative inline-block mb-4">
                        <div className="absolute -inset-1 bg-purple-600/20 rounded-full blur-md"></div>
                        <img 
                            src="/img/ARIA-LOGO.PNG" 
                            alt="ARIA Logo" 
                            className="relative w-20 h-20 object-contain mx-auto"
                        />
                    </div>
                    
                    <h2 className="text-[10px] uppercase tracking-[0.4em] text-purple-500 font-bold mb-1">
                        Identity Verification
                    </h2>
                    <h1 className="text-2xl font-light text-white tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Create Interface'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label htmlFor="email" className="block text-[10px] uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all text-white placeholder-zinc-600"
                            placeholder="neural@interface.com"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center ml-1">
                            <label htmlFor="password" className="block text-[10px] uppercase tracking-widest text-zinc-500">Access Key</label>
                            {isLogin && (
                                <button 
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-[9px] uppercase tracking-tighter text-purple-400/60 hover:text-purple-400 transition-colors"
                                >
                                    Forget Access Key?
                                </button>
                            )}
                        </div>
                        <input
                            id="password"
                            type="password"
                            required={!success}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all text-white placeholder-zinc-600"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] py-2 px-3 rounded-lg text-center uppercase tracking-wider">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] py-2 px-3 rounded-lg text-center uppercase tracking-wider">
                            {success}
                        </div>
                    )}

                    {/* USING YOUR CUSTOM BUTTON COMPONENT */}
                    <Button
                        type="submit"
                        disabled={loading}
                        size="lg"
                        className="w-full rounded-xl gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                <span className="uppercase tracking-widest text-xs font-bold">
                                    {isLogin ? 'Initialize Session' : 'Register Protocol'}
                                </span>
                            </>
                        )}
                    </Button>

                    <div className="pt-4 text-center">
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                                setSuccess(null);
                            }} 
                            className="text-xs text-zinc-500 hover:text-purple-400 transition-colors tracking-wide"
                        >
                            {isLogin ? "Need a new interface? Register here." : "Existing identity detected? Sign in."}
                        </button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center opacity-40">
                    <span className="text-[8px] uppercase tracking-tighter text-zinc-500">Encrypted Connection</span>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse delay-75"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
