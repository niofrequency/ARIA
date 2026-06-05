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
  Wand2,          
  ExternalLink,   
  Youtube,
  Play,
  Volume2,
  VolumeX // ✅ ADDED VOLUMEX ICON FOR STOP STATE
} from 'lucide-react';
import { playAriaSpeech } from '../services/ttsService';

interface ChatMessageProps {
  message: Message;
  characterName: string;
  characterVoiceId?: string;
  onMediaClick: (url: string, type: 'image' | 'video' | 'embed' | 'youtube') => void;
  onAnimateRequest: (message: Message) => void;
  onRegenerateImage: (message: Message) => void;
  // ✅ ADDED TTS STATE PROPS FROM MAINCHATAREA
  isCurrentlyPlaying?: boolean;
  onToggleTTS?: (text: string, messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  characterName, 
  characterVoiceId,
  onMediaClick,
  onAnimateRequest,
  onRegenerateImage,
  isCurrentlyPlaying = false, // ✅ Default to false
  onToggleTTS // ✅ Extracted prop
}) => {
  const isUser = message.role === 'user';
  const [viewMode, setViewMode] = useState<'video' | 'image'>('video');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);

  // --- TYPEWRITER STATE ---
  const [shouldAnimate] = useState(() => {
    const isHistory = (Date.now() - (message.timestamp || 0)) > 5000;
    return !isUser && !isHistory;
  });

  const [displayedText, setDisplayedText] = useState(shouldAnimate ? '' : message.text);
  const [isTypingComplete, setIsTypingComplete] = useState(!shouldAnimate);

  // --- HELPER: DETECT LINK TYPE ---
  const getMediaType = (url: string | undefined) => {
    if (!url) return 'none';
    
    // 1. YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    
    // 2. EMBEDS (Pornhub, Redtube, etc.)
    if (url.includes('/embed/') || url.includes('embed.redtube')) return 'embed'; 
    
    // 3. Native Files (MP4/Blob)
    if (url.match(/\.(mp4|webm|ogg)$/i) || url.startsWith('blob:') || url.includes('firebasestorage')) return 'video_file';
    
    // 4. Fallback (Generic Links)
    return 'external_link'; 
  };

  const mediaType = getMediaType(message.videoUrl);

  // --- HELPER: GET YOUTUBE EMBED ---
  const getYoutubeEmbed = (url: string) => {
    try {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
        return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {
        return url;
    }
  };

  // --- HELPER: FORMAT TEXT FOR ITALICS ---
  const formatMessageText = (text: string) => {
    if (!text) return null;
    const parts = text.split('*');
    return parts.map((part, index) => {
      // Every odd index means the text was inside an asterisk pair
      if (index % 2 === 1) {
        return <em key={index} className="italic opacity-80">{part}</em>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // --- TYPING EFFECT LOGIC ---
  useEffect(() => {
    if (!shouldAnimate) {
      if (displayedText !== message.text) setDisplayedText(message.text || '');
      setIsTypingComplete(true);
      return;
    }
    if (displayedText === message.text) { setIsTypingComplete(true); return; }
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
  
  // --- MEDIA SYNC ---
  useEffect(() => {
    if (message.videoUrl) setViewMode('video');
    else setViewMode('image');
  }, [message.videoUrl]);

  // --- DOWNLOAD HANDLER ---
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    const urlToDownload = viewMode === 'video' && message.videoUrl ? message.videoUrl : message.imageUrl;
    if (!urlToDownload) return;

    setIsDownloading(true);
    try {
      // Direct open for external links/embeds
      if (mediaType === 'youtube' || mediaType === 'external_link' || mediaType === 'embed') {
          window.open(urlToDownload, '_blank');
          setIsDownloading(false);
          return;
      }
      // Blob download for native files
      const response = await fetch(urlToDownload);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = viewMode === 'video' ? 'mp4' : 'png';
      a.download = `${characterName.toLowerCase()}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(urlToDownload, '_blank'); 
    } finally {
      setIsDownloading(false);
    }
  };

  const getImageAspectRatio = () => {
    const text = message.text?.toLowerCase() || '';
    if (text.includes('landscape') || text.includes('panoramic')) return 'aspect-video'; 
    return 'aspect-[3/4]'; 
  };

  // Helper to check if we should show the footer
  const shouldShowFooter = !message.isVideoLoading && (
    mediaType === 'video_file' || 
    mediaType === 'embed' || 
    mediaType === 'youtube' || 
    (!message.videoUrl && message.imageUrl)
  );

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* HEADER */}
        <div className={`flex items-center gap-2 mb-1.5 px-1`}>
            {!isUser && <Cpu className="w-3 h-3 text-purple-500" />}
            <span className={`text-[10px] uppercase tracking-[0.3em] font-bold ${isUser ? 'text-zinc-500' : 'text-purple-500'}`}>
                {isUser ? 'User Protocol' : `${characterName} Interface`}
            </span>
            {isUser && <User className="w-3 h-3 text-zinc-500" />}
        </div>

        {/* TEXT BUBBLE */}
        {message.text && (
          <div className={`relative px-5 py-4 rounded-2xl text-sm md:text-[15px] leading-relaxed backdrop-blur-md transition-all
              ${isUser 
                ? 'bg-white/[0.03] text-zinc-200 rounded-tr-none border border-white/10 shadow-lg' 
                : 'bg-purple-600/10 text-white rounded-tl-none border border-purple-500/30 shadow-[0_0_20px_rgba(147,51,234,0.1)]'
              }`}>
            {!isUser && <div className="absolute -inset-0.5 bg-purple-500/10 rounded-2xl blur-md -z-10"></div>}
            <p className="relative z-10 font-light tracking-wide whitespace-pre-wrap">
              {formatMessageText(displayedText)}
              {!isTypingComplete && !isUser && <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 align-middle animate-pulse" />}
            </p>
          </div>
        )}

        {/* LOADING SKELETON (Imaging Protocol) */}
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
            <div className={`group relative overflow-hidden rounded-2xl border border-white/10 transition-all duration-500 ${isUser ? '' : 'rounded-tl-none'}`}>
              
              {/* --- CASE 1: YOUTUBE LINK (Embed) --- */}
              {mediaType === 'youtube' && message.videoUrl ? (
                 <iframe 
                   src={getYoutubeEmbed(message.videoUrl)}
                   className="w-[280px] md:w-[360px] aspect-video block bg-black"
                   title="YouTube video"
                   frameBorder="0"
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                   allowFullScreen
                 />
              ) 
              
              /* --- CASE 2: SPICY EMBED (Iframe) --- */
              : mediaType === 'embed' && message.videoUrl ? (
                 <iframe 
                   src={message.videoUrl}
                   className="w-[280px] md:w-[360px] aspect-video block bg-black"
                   title="Video Player"
                   frameBorder="0"
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                   allowFullScreen
                   scrolling="no"
                 />
              )

              /* --- CASE 3: GENERIC EXTERNAL LINK (Smart Card) --- */
              : mediaType === 'external_link' && message.videoUrl ? (
                 <a 
                   href={message.videoUrl} 
                   target="_blank" 
                   rel="noreferrer"
                   className="w-[280px] md:w-[360px] p-4 bg-zinc-900/80 hover:bg-zinc-800 flex items-center gap-4 transition-colors cursor-pointer text-left"
                 >
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <ExternalLink className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-0.5">External Link</p>
                        <p className="text-sm text-white truncate underline decoration-white/30">{message.videoUrl}</p>
                    </div>
                 </a>
              )
              
              /* --- CASE 4: NATIVE VIDEO FILE (MP4/Blob) --- */
              : message.videoUrl && viewMode === 'video' ? (
                <video 
                  key={message.videoUrl}
                  src={message.videoUrl}
                  autoPlay loop muted playsInline disablePictureInPicture
                  onClick={() => onMediaClick(message.videoUrl!, 'video')} 
                  className="w-[280px] md:w-[360px] h-auto block bg-black shadow-inner rounded-2xl cursor-pointer"
                />
              ) 
              
              /* --- CASE 5: STATIC IMAGE --- */
              : (
                <img 
                  key={message.imageUrl}
                  src={message.imageUrl} 
                  alt="Visual" 
                  onClick={(e) => {
                    // Tap toggle for mobile, instant click for desktop
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      e.stopPropagation();
                      setShowMobileOverlay(prev => !prev);
                    } else {
                      onMediaClick(message.imageUrl!, 'image');
                    }
                  }} 
                  className={`w-[280px] md:w-[360px] h-auto min-h-[100px] object-cover block bg-zinc-900 transition-all duration-700 cursor-pointer ${message.isVideoLoading ? 'blur-xl scale-110 brightness-50' : 'group-hover:scale-105'}`}
                />
              )}

              {/* === OVERLAYS (Only for Native Video/Image, NOT for Iframe Embeds) === */}
              {(mediaType === 'video_file' || (!message.videoUrl && message.imageUrl)) && (
                  <>
                    {/* HOVER OVERLAY: Neural Motion Button & Fullscreen */}
                    {!message.videoUrl && !message.isVideoLoading && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] transition-all duration-300 pointer-events-none ${showMobileOverlay ? 'bg-black/40 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMobileOverlay(false); onAnimateRequest(message); }} 
                                className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-tighter hover:bg-purple-500 hover:text-white transition-all active:scale-95 shadow-xl"
                            >
                                <Film className="w-3.5 h-3.5" /> Neural Motion
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMobileOverlay(false); onMediaClick(message.imageUrl!, 'image'); }} 
                                className="pointer-events-auto text-white/70 hover:text-white text-[9px] uppercase tracking-[0.2em] font-bold py-1"
                            >
                                View Fullscreen
                            </button>
                        </div>
                    )}
                    
                    {/* LOADING OVERLAY: "Synthesizing" */}
                    {message.isVideoLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none">
                            <div className="relative mb-3">
                                <div className="absolute -inset-6 bg-purple-600/40 rounded-full blur-3xl animate-pulse"></div>
                                <Loader2 className="w-10 h-10 text-purple-400 animate-spin relative" />
                            </div>
                            <div className="flex flex-col items-center gap-1 relative z-10">
                                <span className="text-[11px] text-white font-black uppercase tracking-[0.4em] animate-pulse">Synthesizing</span>
                            </div>
                        </div>
                    )}
                    
                    {/* ZOOM ICON (Top Right) */}
                    {!message.isVideoLoading && (
                        <div className={`absolute top-3 right-3 transition-opacity pointer-events-none ${showMobileOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                                {message.videoUrl && viewMode === 'video' ? <Maximize2 className="w-3.5 h-3.5 text-white" /> : <ZoomIn className="w-3.5 h-3.5 text-white" />}
                            </div>
                        </div>
                    )}
                  </>
              )}
            </div>

            {/* === FOOTER / CONTROL BAR === */}
            {shouldShowFooter && (
              <div className="flex items-center justify-between w-[280px] md:w-[360px] px-1">
                
                {/* LEFT BUTTONS: THEATER MODE or NATIVE CONTROLS */}
                {mediaType === 'embed' || mediaType === 'youtube' ? (
                   <button onClick={() => onMediaClick(message.videoUrl!, mediaType as any)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-white transition-colors">
                     <Maximize2 className="w-3 h-3" /> Theater Mode
                   </button>
                ) : message.videoUrl ? (
                  <button onClick={() => setViewMode(prev => prev === 'video' ? 'image' : 'video')} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors">
                    {viewMode === 'video' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                    {viewMode === 'video' ? 'Show Static' : 'Show Motion'}
                  </button>
                ) : (
                   <button onClick={() => onAnimateRequest(message)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors animate-pulse">
                    <Wand2 className="w-3 h-3" />
                    <span className="md:hidden">Animate</span>
                    <span className="hidden md:inline">Generate Motion</span>
                  </button>
                )}
                
                {/* RIGHT BUTTONS: DOWNLOAD / REFRESH (Only for Native Files) */}
                {mediaType !== 'embed' && mediaType !== 'youtube' && (
                    <div className="flex items-center gap-3">
                        <button onClick={() => { if (message.videoUrl && viewMode === 'video') onAnimateRequest(message); else onRegenerateImage(message); }} className="text-zinc-600 hover:text-purple-400 transition-all hover:rotate-180 duration-500">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleDownload} disabled={isDownloading} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${isDownloading ? 'text-zinc-600 cursor-wait' : 'text-zinc-500 hover:text-purple-400'}`}>
                            {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {isDownloading ? 'Saving...' : (viewMode === 'video' && message.videoUrl ? 'Save MP4' : 'Save PNG')}
                        </button>
                    </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* TIMESTAMP & TTS CONTROLS */}
        <div className="flex items-center gap-3 mt-2 px-1 text-[9px] text-zinc-600 font-mono tracking-tighter uppercase">
          <span>[{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}]</span>
          
          {mediaType === 'youtube' && <span className="text-red-500 font-bold flex items-center gap-1"><Youtube className="w-3 h-3"/> YouTube</span>}
          {mediaType === 'embed' && <span className="text-purple-500 font-bold flex items-center gap-1"><Play className="w-3 h-3 fill-current"/> Video Feed</span>}

          {/* ✅ DYNAMIC TTS CONTROL BUTTON FOR AI MESSAGES */}
          {!isUser && message.text && (
              <>
                  <span className="text-zinc-700">•</span>
                  <button 
                      onClick={() => {
                          const speechText = message.text?.replace(/\*.*?\*/g, '').trim();
                          if (speechText) {
                              if (onToggleTTS) {
                                  // Pass to central tracker in MainChatArea
                                  onToggleTTS(speechText, message.id);
                              } else {
                                  // Fallback for standalone usage
                                  playAriaSpeech(speechText, characterVoiceId || 'ara');
                              }
                          }
                      }}
                      className={`flex items-center gap-1 font-bold transition-colors cursor-pointer ${isCurrentlyPlaying ? 'text-purple-400 animate-pulse' : 'hover:text-purple-400'}`}
                      title={isCurrentlyPlaying ? "Stop Playing" : "Read Aloud"}
                  >
                      {isCurrentlyPlaying ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />} 
                      {isCurrentlyPlaying ? 'Playing...' : 'Read Aloud'}
                  </button>
              </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.imageUrl === nextProps.message.imageUrl &&
    prevProps.message.videoUrl === nextProps.message.videoUrl &&
    prevProps.message.isImageLoading === nextProps.message.isImageLoading &&
    prevProps.message.isVideoLoading === nextProps.message.isVideoLoading &&
    prevProps.characterName === nextProps.characterName &&
    prevProps.characterVoiceId === nextProps.characterVoiceId &&
    prevProps.isCurrentlyPlaying === nextProps.isCurrentlyPlaying // ✅ Add TTS state to memo check
  );
});
