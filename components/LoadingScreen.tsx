import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ isReady }: { isReady: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simulate a rapid boot sequence
    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 90) return 90; // Hold at 90% until Firebase says 'isReady'
        return old + Math.floor(Math.random() * 12) + 2;
      });
    }, 60);

    // When Firebase finishes loading
    if (isReady) {
      setProgress(100);
      // Wait a bit longer so the user sees the satisfying 100% "lock in" animation
      setTimeout(() => setIsVisible(false), 800); 
    }

    return () => clearInterval(interval);
  }, [isReady]);

  if (!isVisible) return null;

  // Dynamic text that changes based on the fake loading progress
  const getStatusText = () => {
    if (progress === 100) return "SYSTEM READY";
    if (progress >= 90 && !isReady) return "AWAITING SERVER HANDSHAKE";
    if (progress > 60) return "SYNCING BIO-METRICS";
    if (progress > 30) return "DECRYPTING NEURAL PATHWAYS";
    return "INITIALIZING PROTOCOLS";
  };

  return (
    <div className={`fixed inset-0 z-[999] bg-[#050507] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${progress === 100 ? 'opacity-0 delay-300' : 'opacity-100'}`}>
      
      {/* Subtle Background Grid */}
      <div 
          className="absolute inset-0 z-0 opacity-10" 
          style={{ 
              backgroundImage: `radial-gradient(#4f46e5 0.5px, transparent 0.5px)`,
              backgroundSize: '30px 30px' 
          }}
      />

      <div className="relative z-10 flex flex-col items-center">
        
        {/* Top Logo Area */}
        <div className="mb-12 relative flex flex-col items-center">
          <div className={`absolute -inset-8 bg-purple-600/10 rounded-full blur-2xl transition-all duration-700 ${progress === 100 ? 'bg-purple-500/40 scale-150' : 'animate-pulse'}`}></div>
          <img src="/img/ARIA-LOGO.PNG" alt="Aria AI" className="w-14 h-14 relative object-contain mb-3 drop-shadow-[0_0_15px_rgba(147,51,234,0.3)]" />
          <span className="text-lg font-light text-white tracking-[0.3em] uppercase relative">
            Aria <span className="text-purple-500 font-bold">AI</span>
          </span>
        </div>

        {/* CIRCULAR NEURAL LOADER */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          
          {/* Outer Dashed Ring (Slow Spin) */}
          <div className={`absolute inset-0 rounded-full border border-dashed transition-all duration-500 ease-out
            ${progress === 100 
              ? 'border-purple-500/80 scale-110 shadow-[0_0_30px_rgba(147,51,234,0.4)] rotate-0' 
              : 'border-purple-500/20 animate-[spin_12s_linear_infinite]'
            }`}
          />

          {/* Middle Broken Ring (Reverse Fast Spin) */}
          <div className={`absolute inset-3 rounded-full border-t-2 border-l-2 transition-all duration-500 ease-out
            ${progress === 100 
              ? 'border-white scale-105 rotate-45' 
              : 'border-purple-400/60 animate-[spin_4s_linear_infinite_reverse]'
            }`}
          />

          {/* Inner Dotted Ring (Normal Spin) */}
          <div className={`absolute inset-6 rounded-full border-2 border-dotted transition-all duration-500 ease-out
            ${progress === 100 
              ? 'border-transparent scale-125' 
              : 'border-white/10 animate-[spin_8s_linear_infinite]'
            }`}
          />

          {/* Center Percentage Display */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className={`tabular-nums font-light transition-all duration-300
              ${progress === 100 
                ? 'text-4xl text-white font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-110' 
                : 'text-5xl text-purple-100'
              }`}
            >
              {progress}
            </div>
            <span className={`text-[8px] uppercase tracking-[0.4em] mt-1 transition-colors duration-300
              ${progress === 100 ? 'text-white' : 'text-purple-500/80 font-bold'}`}
            >
              Percent
            </span>
          </div>
        </div>

        {/* Dynamic Status Text Footer */}
        <div className="mt-12 h-6 flex items-center justify-center">
          <p className={`text-[10px] tracking-[0.4em] uppercase font-bold transition-all duration-300
            ${progress === 100 ? 'text-white drop-shadow-[0_0_10px_rgba(147,51,234,0.8)] scale-110' : 'text-zinc-500 animate-pulse'}`}
          >
            {getStatusText()}
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoadingScreen;
