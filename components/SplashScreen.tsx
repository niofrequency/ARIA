import React, { useEffect, useState } from 'react';

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
        if (isExiting) return;
        setIsExiting(true);
        setTimeout(() => {
            onFinish();
        }, 800);
    };

    return (
        <div 
            onClick={handleInitialize}
            className={`relative flex items-center justify-center min-h-screen bg-[#050507] overflow-hidden transition-all duration-1000 cursor-pointer ${isExiting ? 'opacity-0' : 'opacity-100'}`}
        >
            
            {/* Background Grid */}
            <div 
                className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isExiting ? 'opacity-0' : 'opacity-[0.15]'}`} 
                style={{ 
                    backgroundImage: `radial-gradient(#4f46e5 0.5px, transparent 0.5px), linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)`,
                    backgroundSize: '20px 20px, 40px 40px, 40px 40px' 
                }}
            />
            
            {/* Center Glow - Erupts on click */}
            <div className={`absolute w-[500px] h-[500px] rounded-full blur-[120px] z-0 transition-all duration-1000 ease-out
                ${isExiting ? 'bg-purple-500/60 scale-[2.5]' : 'bg-purple-600/10 animate-pulse scale-100'}`} 
            />

            <div 
                className={`relative z-10 flex flex-col items-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            >
                {/* Logo Section - Scales up towards the user on exit */}
                <div className={`relative mb-10 transition-all duration-700 ease-in-out origin-center ${isExiting ? 'scale-[3] opacity-0 blur-2xl' : 'scale-100 opacity-100 blur-0 hover:scale-105'}`}>
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full blur opacity-30"></div>
                    <img 
                        src="/img/ARIA-LOGO.PNG" 
                        alt="ARIA AI" 
                        className="relative w-36 h-36 md:w-48 md:h-48 object-contain drop-shadow-[0_0_30px_rgba(147,51,234,0.3)]"
                    />
                </div>

    {/* Heading */}
<div className={`text-center transition-all duration-700 delay-75 ${isExiting ? 'translate-y-10 opacity-0 blur-md' : 'translate-y-0 opacity-100 blur-0'}`}>
    <h1 className="text-5xl font-light tracking-[0.5em] pl-[0.5em] text-white uppercase flex items-center justify-center">
        ARIA 
    </h1>
</div>

                {/* Tap Anywhere Hint */}
                <div className={`mt-28 flex flex-col items-center gap-4 transition-all duration-500 ${isExiting ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
                    <span className="text-[11px] text-purple-400/90 uppercase tracking-[0.5em] font-bold animate-pulse drop-shadow-[0_0_15px_rgba(147,51,234,0.6)]">
                        Tap Anywhere To Start
                    </span>
                    
                    <div className="flex gap-1.5 opacity-40 mt-2">
                        <span className="w-1 h-1 rounded-full bg-purple-500/50 animate-pulse"></span>
                        <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse [animation-delay:200ms]"></span>
                        <span className="w-1 h-1 rounded-full bg-purple-500/50 animate-pulse [animation-delay:400ms]"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
