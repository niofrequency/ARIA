import React, { useEffect, useState } from 'react';
import { Power } from 'lucide-react'; // ✅ Swapped Chevron for Power icon

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
                <div className={`relative mb-10 transition-all duration-700 ${isExiting ? 'scale-95 opacity-0' : ''}`}>
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

                {/* ✅ NEW CONCEPT: THE NEURAL CORE BUTTON */}
                <div className="mt-14 h-28 flex flex-col items-center justify-center relative group">
                    <button
                        onClick={handleInitialize}
                        disabled={isExiting}
                        className={`relative flex items-center justify-center rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none
                            ${isExiting
                                ? 'w-24 h-24 bg-purple-600 shadow-[0_0_100px_rgba(147,51,234,1)] scale-[4] border-transparent opacity-0'
                                : 'w-20 h-20 bg-zinc-950/80 backdrop-blur-xl border border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/30 shadow-[0_0_30px_rgba(147,51,234,0.2)] cursor-pointer'
                            }
                        `}
                    >
                        {/* Outer rotating orbital ring */}
                        <div className={`absolute inset-[-6px] rounded-full border-t-2 border-r-2 border-purple-500/40 transition-all duration-500
                            ${isExiting ? 'opacity-0' : 'animate-[spin_4s_linear_infinite] group-hover:border-purple-400 group-hover:animate-[spin_2s_linear_infinite]'}
                        `} />

                        {/* Inner pulsing icon */}
                        <Power 
                            size={28} 
                            strokeWidth={2}
                            className={`transition-all duration-700
                                ${isExiting ? 'text-white scale-0 rotate-180 opacity-0' : 'text-purple-400 group-hover:text-white group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'}
                            `} 
                        />
                    </button>

                    {/* Under-text that appears and glows on hover */}
                    <span
                        className={`absolute -bottom-6 transition-all duration-500 tracking-[0.3em] uppercase text-[9px] font-bold 
                            ${isExiting ? 'opacity-0 translate-y-4 blur-sm text-purple-500' : 'opacity-100 translate-y-0 blur-0 text-zinc-600 group-hover:text-purple-400'}
                        `}
                    >
                        Tap to Awaken
                    </span>
                </div>

                {/* Status Footer */}
                <div className={`mt-16 flex flex-col items-center gap-3 transition-opacity duration-700 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
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
