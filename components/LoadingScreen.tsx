import React, { useState, useEffect } from 'react';

// Store progress globally so it doesn't reset to 0 if the component unmounts and remounts 
// between different route transitions (e.g. from App.tsx to ChatDashboard.tsx)
let globalProgress = 0;

const LoadingScreen = ({ isReady }: { isReady?: boolean }) => {
  const [progress, setProgress] = useState(globalProgress);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        let next = prev;

        if (isReady) {
          // The app is fully loaded. Accelerate rapidly to 100% smoothly.
          next += (100 - prev) * 0.15 + 2; 
        } else {
          // Asymptotic loading curve: 
          // Moves fast initially, then slows down dramatically as it nears 99%.
          // This perfectly masks the exact wait time without ever getting completely stuck.
          const distance = 99 - prev;
          
          if (prev < 60) {
            next += Math.random() * 2 + 1; // Fast early loading
          } else if (prev < 85) {
            next += Math.random() * 0.8 + 0.2; // Mid-phase
          } else {
            next += distance * 0.015; // Infinitesimal crawl (Zeno's paradox)
          }
          
          if (next > 99.5) next = 99.5; // Safe decimal cap while waiting
        }

        // Cap at 100 and ensure it never goes backwards
        next = Math.min(100, next);
        if (next < globalProgress) next = globalProgress;

        globalProgress = next;
        return globalProgress;
      });
    }, 30); // Faster tick rate for butter-smooth CSS animation

    return () => clearInterval(interval);
  }, [isReady]);

  // Use Math.floor so the UI text shows whole numbers, 
  // but keep the actual progress state as a float for smooth CSS bar width scaling.
  const displayProgress = Math.floor(progress);

  const getStatusText = () => {
    if (displayProgress >= 100) return "SYSTEM ONLINE";
    if (displayProgress >= 85) return "ESTABLISHING NEURAL LINK";
    if (displayProgress > 60) return "SYNCING BIO-SIGNATURE";
    if (displayProgress > 35) return "LOADING QUANTUM CORE";
    return "INITIALIZING ARIA PROTOCOL";
  };

  return (
    <div 
      className={`fixed inset-0 z-[999] bg-[#050507] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        progress >= 100 && isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle animated grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, #4f46e5 1px, transparent 0)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 25s linear infinite',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-8">
        {/* Logo Area */}
        <div className="mb-16 flex flex-col items-center">
          <div className="relative mb-6">
            <div
              className={`absolute -inset-12 bg-gradient-to-br from-purple-600/20 to-transparent rounded-full blur-3xl transition-all duration-1000 ${
                progress >= 100 ? 'scale-150 opacity-70' : 'animate-pulse'
              }`}
            />
            <img
              src="/img/ARIA-LOGO.PNG"
              alt="Aria AI"
              className="w-16 h-16 object-contain drop-shadow-[0_0_25px_rgba(168,85,247,0.5)] relative z-10"
            />
          </div>
          <span className="text-xl font-light tracking-[0.5em] text-white uppercase relative z-10">
            ARIA
          </span>
        </div>

        {/* Premium Progress Bar */}
        <div className="w-full relative">
          {/* Track */}
          <div className="h-px w-full bg-zinc-800 relative overflow-hidden">
            {/* Glow line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          </div>

          {/* Progress Fill (Uses the exact float progress for sub-pixel smooth width) */}
          <div
            className="absolute top-0 left-0 h-px bg-gradient-to-r from-purple-400 via-purple-500 to-purple-400 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shine_1.5s_linear_infinite]" />
          </div>

          {/* Percentage */}
          <div className="mt-4 flex justify-between items-baseline text-sm tabular-nums">
            <span className="text-purple-400/80 text-xs tracking-widest uppercase">PROGRESS</span>
            <div className="flex items-center gap-1">
              <span
                className={`font-light text-5xl transition-all duration-300 text-white ${
                  displayProgress >= 100 ? 'tracking-normal text-purple-300' : ''
                }`}
              >
                {Math.min(100, displayProgress)}
              </span>
              <span className="text-purple-400/70 text-2xl font-light -translate-y-1">%</span>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-12 h-7 flex items-center">
          <p
            className={`text-[10px] font-mono uppercase tracking-[0.35em] transition-all duration-500 ${
              displayProgress >= 100
                ? 'text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]'
                : 'text-zinc-500'
            }`}
          >
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Bottom subtle branding */}
      <div className="absolute bottom-8 text-[9px] text-zinc-700 tracking-widest font-mono">
        NEURAL v0.9 • SECURE BOOT SEQUENCE
      </div>

      <style>{`
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        
        @keyframes shine {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
