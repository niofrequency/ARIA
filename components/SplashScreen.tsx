import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface SplashScreenProps {
    onFinish: () => void;
} 

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [mounted, setMounted] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleInitialize = () => {
        setIsExiting(true);
        setTimeout(() => {
            onFinish();
        }, 800);
    };

    return (
        <div className={`relative flex items-center justify-center min-h-screen bg-[#050507] overflow-hidden transition-all duration-1000 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            
            {/* Background Grid & Glows */}
            <div 
                className="absolute inset-0 z-0 opacity-[0.15]" 
                style={{ 
                    backgroundImage: `radial-gradient(#4f46e5 0.5px, transparent 0.5px), linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)`,
                    backgroundSize: '20px 20px, 40px 40px, 40px 40px' 
                }}
            />
            <div className="absolute w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] z-0 animate-pulse" />

            <div 
                className={`relative z-10 flex flex-col items-center transition-all duration-1000 ease-out ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            >
                {/* Logo Section */}
                <div className={`relative group mb-10 transition-all duration-700 ${isExiting ? 'scale-95 opacity-0' : ''}`}>
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full blur opacity-30"></div>
                    <img 
                        src="/img/ARIA-LOGO.PNG" 
                        alt="ARIA AI" 
                        className="relative w-36 h-36 md:w-48 md:h-48 object-contain drop-shadow-[0_0_30px_rgba(147,51,234,0.3)]"
                    />
                </div>

                {/* Heading */}
                <div className={`text-center transition-all duration-700 delay-75 ${isExiting ? 'translate-y-4 opacity-0' : ''}`}>
                    <h1 className="text-5xl font-extralight text-white tracking-[0.2em] flex items-center justify-center">
                        ARIA 
                        <span className="relative ml-4">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 font-black tracking-normal">AI</span>
                        </span>
                    </h1>
                </div>

                {/* NEW MODERN TOGGLE BUTTON */}
                <div className="mt-14 h-14 flex items-center justify-center">
                    <button
                        onClick={handleInitialize}
                        disabled={isExiting}
                        className={`group relative flex items-center justify-center rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none
                            ${isExiting
                                ? 'w-14 h-14 bg-purple-600 shadow-[0_0_40px_rgba(147,51,234,0.8)] border-transparent scale-110'
                                : 'w-[240px] h-14 bg-zinc-950/50 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 hover:bg-zinc-900/80 shadow-2xl cursor-pointer'
                            }
                        `}
                    >
                        {/* Inner text that blurs and floats away on click */}
                        <span
                            className={`absolute left-8 transition-all duration-500 tracking-[0.25em] uppercase text-[11px] font-bold text-zinc-400 group-hover:text-white
                                ${isExiting ? 'opacity-0 -translate-y-4 blur-sm' : 'opacity-100 translate-y-0 blur-0'}
                            `}
                        >
                            Initialize Link
                        </span>

                        {/* The Arrow Container that handles the morph */}
                        <div
                            className={`absolute transition-all duration-700 flex items-center justify-center rounded-full
                                ${isExiting
                                    ? 'inset-0 w-full h-full bg-transparent text-white -rotate-90 scale-125 animate-pulse'
                                    : 'right-2 w-10 h-10 bg-white/[0.05] text-zinc-500 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(147,51,234,0.6)]'
                                }
                            `}
                        >
                            <ChevronRight 
                                size={18} 
                                strokeWidth={isExiting ? 3 : 2.5} 
                                className={`transition-all duration-500 ${!isExiting && 'group-hover:translate-x-0.5'}`} 
                            />
                        </div>
                    </button>
                </div>

                {/* Status Footer */}
                <div className={`mt-20 flex flex-col items-center gap-3 transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="flex gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-purple-500/50 animate-pulse"></span>
                        <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse [animation-delay:200ms]"></span>
                        <span className="w-1 h-1 rounded-full bg-purple-500/50 animate-pulse [animation-delay:400ms]"></span>
                    </div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-[0.4em] font-bold">Systems Nominal</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
