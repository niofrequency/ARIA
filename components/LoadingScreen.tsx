import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ isReady }: { isReady: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 92) return 92; // Hold just before 100 until ready
        const increment = Math.floor(Math.random() * 9) + 3;
        return Math.min(92, old + increment);
      });
    }, 45);

    if (isReady && progress >= 92) {
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
      }, 900);
    }

    return () => clearInterval(interval);
  }, [isReady, progress]);

  const getStatusText = () => {
    if (progress === 100) return "SYSTEM ONLINE";
    if (progress >= 85) return "ESTABLISHING NEURAL LINK";
    if (progress > 60) return "SYNCING BIO-SIGNATURE";
    if (progress > 35) return "LOADING QUANTUM CORE";
    return "INITIALIZING ARIA PROTOCOL";
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-[#050507] flex flex-col items-center justify-center overflow-hidden">
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
                progress === 100 ? 'scale-150 opacity-70' : 'animate-pulse'
              }`}
            />
            <img
              src="/img/ARIA-LOGO.PNG"
              alt="Aria AI"
              className="w-16 h-16 object-contain drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]"
            />
          </div>
          <span className="text-xl font-light tracking-[0.5em] text-white uppercase">
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

          {/* Progress Fill */}
          <div
            className="h-px bg-gradient-to-r from-purple-400 via-purple-500 to-purple-400 relative transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shine_1.5s_linear_infinite]" />
          </div>

          {/* Percentage */}
          <div className="mt-4 flex justify-between items-baseline text-sm tabular-nums">
            <span className="text-purple-400/80 text-xs tracking-widest">PROGRESS</span>
            <div className="flex items-center gap-1">
              <span
                className={`font-light text-5xl transition-all duration-300 text-white ${
                  progress === 100 ? 'tracking-normal' : ''
                }`}
              >
                {progress}
              </span>
              <span className="text-purple-400/70 text-2xl font-light -translate-y-1">%</span>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-12 h-7 flex items-center">
          <p
            className={`text-[10px] font-mono uppercase tracking-[0.35em] transition-all duration-500 ${
              progress === 100
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

      <style jsx>{`
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
