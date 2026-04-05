import React, { useState, useEffect } from 'react';

// Pass 'isReady=true' when Firebase finishes loading
const LoadingScreen = ({ isReady }: { isReady: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simulate a rapid boot sequence
    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 90) return 90; // Hold at 90% until Firebase says 'isReady'
        return old + Math.floor(Math.random() * 15) + 5;
      });
    }, 50);

    // When Firebase finishes loading
    if (isReady) {
      setProgress(100);
      // Wait a split second for the bar to hit 100% visually, then fade out
      setTimeout(() => setIsVisible(false), 400); 
    }

    return () => clearInterval(interval);
  }, [isReady]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-zinc-950 flex flex-col items-center justify-center transition-opacity duration-300">
      
      {/* Optional: Your Logo pulsing above the bar */}
      <div className="mb-8 relative flex flex-col items-center">
        <div className="absolute -inset-4 bg-purple-600/20 rounded-full blur-xl animate-pulse"></div>
        <img src="/img/ARIA-LOGO.PNG" alt="Aria AI" className="w-16 h-16 relative object-contain mb-2" />
        <span className="text-xl font-light text-white tracking-widest uppercase relative">
          Aria <span className="text-purple-500 font-bold">AI</span>
        </span>
      </div>

      {/* The Loading Bar Container */}
      <div className="relative w-64 h-8 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 shadow-[0_0_20px_rgba(147,51,234,0.1)]">
        
        {/* The Purple Fill */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />

        {/* The Percentage Text (Centered) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white tracking-[0.3em] drop-shadow-md z-10">
            {progress === 100 ? 'SYSTEM READY' : `ESTABLISHING LINK ${progress}%`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
