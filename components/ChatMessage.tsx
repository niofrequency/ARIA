import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { 
  Loader2, 
  ZoomIn, 
  Cpu, 
  User, 
  Film, 
  Image as ImageIcon,  
  Download, 
  RefreshCw, 
  Maximize2,
  Wand2 // ✅ FIX 1: Added Wand2 Import
} from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  characterName: string;
  onMediaClick: (url: string, type: 'image' | 'video') => void;
  onAnimateRequest: (message: Message) => void;
  onRegenerateImage: (message: Message) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  characterName, 
  onMediaClick,
  onAnimateRequest,
  onRegenerateImage
}) => {
  const isUser = message.role === 'user';
  const [viewMode, setViewMode] = useState<'video' | 'image'>('video');
  const [isDownloading, setIsDownloading] = useState(false);

  // --- TYPEWRITER STATE ---
  const [shouldAnimate] = useState(() => {
    const isHistory = (Date.now() - (message.timestamp || 0)) > 5000;
    return !isUser && !isHistory;
  });

  const [displayedText, setDisplayedText] = useState(shouldAnimate ? '' : message.text);
  const [isTypingComplete, setIsTypingComplete] = useState(!shouldAnimate);

  /**
   * TYPING EFFECT LOGIC
   */
  useEffect(() => {
    if (!shouldAnimate) {
      if (displayedText !== message.text) {
        setDisplayedText(message.text || '');
      }
      setIsTypingComplete(true);
      return;
    }

    if (displayedText === message.text) {
      setIsTypingComplete(true);
      return;
    }

    setIsTypingComplete(false);
    
    let currentIndex = 0;
    const fullText = message.text || '';
    
    const typingInterval = setInterval(() => {
      setDisplayedText((prev) => {
        if (!prev && prev !== '') return fullText.slice(0, 1);
        
        const nextIndex = prev ? prev.length + 1 : 1;
        if (nextIndex > fullText.length) {
            clearInterval(typingInterval);
            setIsTypingComplete(true);
            return fullText;
        }
        return fullText.slice(0, nextIndex);
      });
    }, 50);

    return () => clearInterval(typingInterval);
  }, [message.text, shouldAnimate]);
  
  /**
   * MEDIA SYNC
   */
  useEffect(() => {
    if (message.videoUrl) {
      setViewMode('video');
    } else {
      setViewMode('image');
    }
  }, [message.videoUrl]);

  /**
   * UNIVERSAL DOWNLOAD HANDLER
   */
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    const isVideoMode = viewMode === 'video' && message.videoUrl;
    const urlToDownload = isVideoMode ? message.videoUrl : message.imageUrl;
    const extension = isVideoMode ? 'mp4' : 'png';

    if (!urlToDownload) return;

    setIsDownloading(true);
    try {
      const response = await fetch(urlToDownload);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${characterName.toLowerCase()}-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(urlToDownload, '_blank'); 
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * ASPECT RATIO DETECTOR
   */
  const getImageAspectRatio = () => {
    const text = message.text?.toLowerCase() || '';
    if (text.includes('landscape') || text.includes('panoramic') || text.includes('wide shot')) {
      return 'aspect-video'; 
    }
    // ✅ FIX 2: Changed from 9/16 to 3/4 to match your actual image generation size
    return 'aspect-[3/4]'; 
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* HEADER: Identity Designation */}
        <div className={`flex items-center gap-2 mb-1.5 px-1`}>
            {!isUser && <Cpu className="w-3 h-3 text-purple-500" />}
            <span className={`text-[10px] uppercase tracking-[0.3em] font-bold ${isUser ? 'text-zinc-500' : 'text-purple-500'}`}>
                {isUser ? 'User Protocol' : `${characterName} Interface`}
            </span>
            {isUser && <User className="w-3 h-3 text-zinc-500" />}
        </div>

        {/* TEXT CONTENT */}
        {message.text && (
          <div
            className={`relative px-5 py-4 rounded-2xl text-sm md:text-[15px] leading-relaxed backdrop-blur-md transition-all
              ${isUser 
                ? 'bg-white/[0.03] text-zinc-200 rounded-tr-none border border-white/10 shadow-lg' 
                : 'bg-purple-600/10 text-white rounded-tl-none border border-purple-500/30 shadow-[0_0_20px_rgba(147,51,234,0.1)]'
              }
            `}
          >
            {!isUser && (
                <div className="absolute -inset-0.5 bg-purple-500/10 rounded-2xl blur-md -z-10"></div>
            )}
            
            <p className="relative z-10 font-light tracking-wide whitespace-pre-wrap">
              {displayedText}
              {!isTypingComplete && !isUser && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 align-middle animate-pulse" />
              )}
            </p>
          </div>
        )}

        {/* INITIAL IMAGING SKELETON */}
        {message.isImageLoading && (
           <div className={`mt-3 w-[280px] md:w-[360px] ${getImageAspectRatio()} bg-zinc-900/50 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 animate-pulse ${isUser ? '' : 'rounded-tl-none'}`}>
              <div className="relative">
                <div className="absolute -inset-2 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin relative" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.2em]">Imaging Protocol</span>
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Rendering Neural Visuals...</span>
              </div>
           </div>
        )}

        {/* MEDIA DISPLAY AREA */}
        {(message.imageUrl || message.videoUrl) && !message.isImageLoading && (
          <div className="flex flex-col gap-2 mt-3">
            
            <div 
              className={`group relative overflow-hidden rounded-2xl border border-white/10 transition-all duration-500 
                ${message.videoUrl ? 'border-purple-500/40 shadow-[0_0_30px_rgba(147,51,234,0.15)]' : 'hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)]'} 
                ${isUser ? '' : 'rounded-tl-none'}`}
            >
              {/* MEDIA RENDERER */}
              {message.videoUrl && viewMode === 'video' ? (
                <video 
                  key={message.videoUrl}
                  src={message.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  disablePictureInPicture
                  onClick={() => onMediaClick(message.videoUrl!, 'video')} 
                  className="w-[280px] md:w-[360px] h-auto block bg-black shadow-inner rounded-2xl cursor-pointer"
                />
              ) : (
                <img 
                  key={message.imageUrl}
                  src={message.imageUrl} 
                  alt="Neural Visual" 
                  onClick={() => onMediaClick(message.imageUrl!, 'image')} 
                  className={`w-[280px] md:w-[360px] h-auto min-h-[100px] object-cover block bg-zinc-900 transition-all duration-700 cursor-pointer
                    ${message.isVideoLoading ? 'blur-xl scale-110 brightness-50' : 'group-hover:scale-105'}`}
                />
              )}
              
              {/* DESKTOP OVERLAY (Hover-based) */}
              {!message.videoUrl && !message.isVideoLoading && !isUser && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] pointer-events-none hidden md:flex">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAnimateRequest(message); }}
                    className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-tighter hover:bg-purple-500 hover:text-white transition-all active:scale-95 shadow-xl"
                  >
                    <Film className="w-3.5 h-3.5" />
                    Neural Motion
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onMediaClick(message.imageUrl!, 'image'); }}
                    className="pointer-events-auto text-white/70 hover:text-white text-[9px] uppercase tracking-[0.2em] font-bold py-1"
                  >
                    View Fullscreen
                  </button>
                </div>
              )}

              {/* SYNTHESIS LOADING OVERLAY */}
              {message.isVideoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none">
                  <div className="relative mb-3">
                      <div className="absolute -inset-6 bg-purple-600/40 rounded-full blur-3xl animate-pulse"></div>
                      <Loader2 className="w-10 h-10 text-purple-400 animate-spin relative" />
                  </div>
                  <div className="flex flex-col items-center gap-1 relative z-10">
                    <span className="text-[11px] text-white font-black uppercase tracking-[0.4em] animate-pulse">Synthesizing</span>
                    <span className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">Wan 2.1 Neural Link</span>
                  </div>
                </div>
              )}

              {/* UTILITY ICONS */}
              {!message.isVideoLoading && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                    {message.videoUrl && viewMode === 'video' ? <Maximize2 className="w-3.5 h-3.5 text-white" /> : <ZoomIn className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              )}
            </div>

            {/* --- MEDIA CONTROL BAR --- */}
            {(message.videoUrl || message.imageUrl) && !message.isVideoLoading && (
              <div className="flex items-center justify-between w-[280px] md:w-[360px] px-1">
                
                {/* Left Side: Mode Toggle OR Mobile Action */}
                {message.videoUrl ? (
                  <button 
                    onClick={() => setViewMode(prev => prev === 'video' ? 'image' : 'video')}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors"
                  >
                    {viewMode === 'video' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                    {viewMode === 'video' ? 'Show Static' : 'Show Motion'}
                  </button>
                ) : (
                   // ✅ FIX 3: THE MOBILE "ANIMATE" BUTTON
                   // Replaced the static <span> with this button so phones can trigger video.
                   <button 
                    onClick={() => onAnimateRequest(message)}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors animate-pulse"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span className="md:hidden">Animate</span>
                    <span className="hidden md:inline">Generate Motion</span>
                  </button>
                )}

                {/* Right Side: Actions */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                        if (message.videoUrl && viewMode === 'video') {
                            onAnimateRequest(message); // Re-animate
                        } else {
                            onRegenerateImage(message); // Re-generate
                        }
                    }}
                    className="text-zinc-600 hover:text-purple-400 transition-all hover:rotate-180 duration-500"
                    title={viewMode === 'video' && message.videoUrl ? "Regenerate Motion" : "Regenerate Image"}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  
                  <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors
                      ${isDownloading ? 'text-zinc-600 cursor-wait' : 'text-zinc-500 hover:text-purple-400'}`}
                  >
                    {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {isDownloading ? 'Saving...' : (viewMode === 'video' && message.videoUrl ? 'Save MP4' : 'Save PNG')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* FOOTER: Session Metadata */}
        <div className="flex items-center gap-2 mt-2 px-1 text-[9px] text-zinc-600 font-mono tracking-tighter uppercase">
          <span>[{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}]</span>
          <span className="w-1.5 h-0.5 bg-zinc-800"></span>
          <span className={`${message.videoUrl ? 'text-purple-500 font-bold' : ''}`}>
            {message.videoUrl ? 'Motion: Synced' : 'Status: Static'}
          </span>
          {message.videoUrl && <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
