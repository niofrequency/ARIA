import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

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

                {/* TOGGLE BUTTON */}
                <div className="mt-14 h-14">
                    <Button 
                        onClick={handleInitialize}
                        disabled={isExiting}
                        variant="outline" 
                        size="lg"
                        className={`group relative overflow-hidden transition-all duration-500 min-w-[220px] bg-white/[0.03] border-white/10 hover:border-purple-500/50 backdrop-blur-md rounded-full shadow-2xl ${isExiting ? 'w-[220px] border-purple-500' : ''}`}
                    >
                        <span className={`mr-10 transition-all duration-500 tracking-[0.2em] uppercase text-[11px] font-bold text-white/80 ${isExiting ? 'opacity-0 -translate-x-10' : 'group-hover:opacity-0'}`}>
                            Get Started
                        </span>

                        <i className={`absolute right-1 top-1 bottom-1 rounded-full z-10 grid place-items-center transition-all duration-500 not-italic
                            ${isExiting 
                                ? 'left-1 w-[calc(100%-0.5rem)] bg-purple-600 shadow-[0_0_30px_rgba(147,51,234,0.6)]' 
                                : 'w-1/4 bg-white/10 group-hover:w-[calc(100%-0.5rem)] group-hover:bg-purple-600/80 group-hover:shadow-[0_0_20px_rgba(147,51,234,0.4)]'
                            }`}
                        >
                            <ChevronRight 
                                className={`transition-all duration-500 text-white ${isExiting ? 'scale-125 rotate-90' : 'group-hover:translate-x-1'}`} 
                                size={20} 
                                strokeWidth={2.5} 
                            />
                        </i>
                    </Button>
                </div>

                {/* Status Footer - Replaced Morph with CSS Dots */}
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
