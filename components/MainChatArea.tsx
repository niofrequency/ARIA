import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { Message, CharacterProfile, UserData } from '../types';
import { generateAriaResponse, checkForImageRequest, extractContextPrompt } from '../services/ariaService';
import { generateAriaImage } from '../services/generateAriaImage'; 
import { initiateNeuralMotion, pollNeuralMotionStatus } from '../services/neuralMotionService';
import { uploadImageToStorage, deleteMediaFromStorage } from '../services/firebaseService';
import { Loader2, X, Download, Menu, Settings, Cpu, ArrowUp, PanelLeft } from 'lucide-react';
import { storeMemory } from '../services/memoryService';
  
interface MainChatAreaProps {
  character: CharacterProfile;
  messages: Message[];
  userData: UserData;
  onImageGenerated: () => void;
  onSendMessage: (message: Message) => void; 
  onUpdateMessage: (messageId: string, updates: Partial<Message>) => void;
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  isDesktopSidebarOpen: boolean;
  isLoadingResponse: boolean;
  onOpenBotCustomization: (botId: string) => void;
  botId: string;
  setIsLoading?: (loading: boolean) => void;
}

const MainChatArea: React.FC<MainChatAreaProps> = ({
  character,
  messages,
  userData,
  onImageGenerated,
  onSendMessage,
  onUpdateMessage,
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isDesktopSidebarOpen,
  isLoadingResponse,
  onOpenBotCustomization,
  botId,
  setIsLoading
}) => {
  const [input, setInput] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- UI: SCROLL DRIVEN HEADER ---
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const currentScrollY = scrollContainerRef.current.scrollTop;
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      setShowHeader(false); // Hide on scroll down
    } else {
      setShowHeader(true); // Show on scroll up
    }
    setLastScrollY(currentScrollY);
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'video/mp4';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  /**
   * REGENERATE IMAGE HANDLER
   * Logic: Syncs history to find original hair/look intent to prevent prompt dilution.
   */
  const handleRegenerateImage = async (message: Message) => {
    if (!character) return;

    onUpdateMessage(message.id, { isImageLoading: true });

    try {
      // 1. LOOKBACK: Find the original user prompt that triggered this look
      const messageIndex = messages.findIndex(m => m.id === message.id);
      const originalUserRequest = (messageIndex > 0 && messages[messageIndex - 1].role === 'user') 
        ? messages[messageIndex - 1].text 
        : "high-fidelity portrait";

      // 2. IDENTITY FORCING: We pass the hair tags as the primary userPrompt 
      // to ensure generateAriaImage puts them at the very start of the string.
      const lookAnchor = `${character.hair.join(", ")} hair, ${originalUserRequest}`;

      console.log("🔄 Regenerating with Identity Anchor:", lookAnchor);

      const oldImageUrl = message.imageUrl;
      const oldVideoUrl = message.videoUrl;

      // Passing the bot's dialogue as context and the harvested intent as the anchor
      const tempImageUrl = await generateAriaImage(message.text || "", lookAnchor, character);
      
      if (tempImageUrl) {
        if (oldImageUrl && oldImageUrl.startsWith('http')) deleteMediaFromStorage(oldImageUrl);
        if (oldVideoUrl && oldVideoUrl.startsWith('http')) deleteMediaFromStorage(oldVideoUrl);

        onUpdateMessage(message.id, { 
          imageUrl: tempImageUrl, 
          videoUrl: undefined,           
          motionStatus: 'idle',     
          isImageLoading: false 
        });
        
        onImageGenerated();
      } else {
        onUpdateMessage(message.id, { isImageLoading: false });
      }
    } catch (err) {
      console.error("❌ Image Regeneration Error:", err);
      onUpdateMessage(message.id, { isImageLoading: false });
    }
  };

/**
 * NEURAL MOTION HANDLER
 * logic:
 * 1. Synchronizes User Intent + AI Context for high-fidelity physics.
 * 2. Persists temporary blobs to Storage before worker ingestion.
 * 3. Forces UI refresh via cache-busting while maintaining backend compatibility.
 */
const handleAnimateRequest = async (message: Message) => {
  if (!message.imageUrl || !character) {
    console.error("❌ Animation Aborted: Missing Image or Character Profile");
    return;
  }

  // 1. UI Reset: Clear old state and trigger the Synthesis Overlay
  onUpdateMessage(message.id, { 
    videoUrl: undefined,
    isVideoLoading: true, 
    motionStatus: 'synthesizing' 
  });

  try {
    // 2. CONTEXT HARVESTING
    // Find the User Message immediately preceding this bot response to detect liquid/motion intent
    const messageIndex = messages.findIndex(m => m.id === message.id);
    const userPrompt = (messageIndex > 0 && messages[messageIndex - 1].role === 'user') 
      ? messages[messageIndex - 1].text 
      : "";

    let sourceImageUrl = message.imageUrl;

    // 3. PERSISTENCE CHECK
    // Ensure temporary blobs are archived to Storage before the Worker attempts to download them
    if (sourceImageUrl.startsWith('blob:') || sourceImageUrl.startsWith('data:')) {
      if (userData?.uid) {
        sourceImageUrl = await uploadImageToStorage(userData.uid, botId, message.imageUrl);
        onUpdateMessage(message.id, { imageUrl: sourceImageUrl });
      } else {
        throw new Error("User ID missing for persistence");
      }
    }

    const aiDialogue = message.text || "";
    const negPrompt = character.negativePrompt || "blurry, distorted, static, flickering";

    // 4. NEURAL DISPATCH (Wan 2.1 Optimized)
    // Passing all 5 arguments to ensure correct Orchestration and LoRA mapping
    const jobId = await initiateNeuralMotion(
      sourceImageUrl, 
      aiDialogue, 
      userPrompt, 
      character, 
      negPrompt
    );

    if (!jobId) throw new Error("No Job ID received from Neural Engine");

    // 5. STATUS POLLING & UI SYNC
    pollNeuralMotionStatus(
      jobId,
      async (videoOutput) => {
        let displayUrl = videoOutput;

        // Convert base64 responses to local blobs for immediate playback performance
        if (videoOutput.startsWith('data:video')) {
          const blob = dataURLtoBlob(videoOutput);
          displayUrl = URL.createObjectURL(blob);
        }

        // --- CACHE BUSTER LOGIC ---
        // Forces the browser to ignore the video cache and play the fresh generation.
        // App.tsx handleVideoSynthesized will strip this 't=' before archiving.
        const timestampedUrl = `${displayUrl}${displayUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

        onUpdateMessage(message.id, {
          videoUrl: timestampedUrl, 
          isVideoLoading: false,
          motionStatus: 'completed'
        });

        // Delay sync to allow UI to settle before permanent Firebase archiving triggers
        setTimeout(() => {
          onImageGenerated();
        }, 800);
      },
      (error) => {
        console.error("❌ Neural Motion Failed:", error);
        onUpdateMessage(message.id, { isVideoLoading: false, motionStatus: 'failed' });
      }
    );

  } catch (err: any) {
    console.error("❌ Neural Motion Init Failed:", err.message);
    onUpdateMessage(message.id, { isVideoLoading: false, motionStatus: 'failed' });
  }
};

  
  /**
   * CORE INTERACTION: HANDLE SEND
   */
  const handleSend = async () => {
    if (!input.trim() || isLoadingResponse || !character) return;

    const userText = input.trim();
    const isImageRequested = checkForImageRequest(userText);
    const responseMessageId = generateId('bot'); 
    setInput('');
    
    onSendMessage({ 
      id: generateId('user'), 
      role: 'user', 
      text: userText, 
      timestamp: Date.now() 
    });

    try {
      const history = (messages || []).map(m => ({ 
        role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user', 
        content: m.text || '' 
      }));

      // Call Brain Proxy (Now with Memory IDs for recall)
      const rawResponse = await generateAriaResponse(userText, history, character, userData?.uid, botId);
      
      // DESTRUCTURE: Now extracting memoryText along with visual prompts
      const { cleanText, contextPrompt, memoryText } = extractContextPrompt(rawResponse);
      
      // AUTO-SAVE MEMORY: If the brain marked a fact, save it to the database
      if (memoryText && userData?.uid) {
        console.log("💾 Auto-Saving Memory:", memoryText);
        storeMemory(memoryText, userData.uid, botId);
      }

      const isGeneratingImage = isImageRequested || !!contextPrompt;
      
      onSendMessage({
        id: responseMessageId,
        role: 'model',
        text: cleanText, // This text is clean (no [[VISUAL]] or [[MEMORY]] tags)
        isImageLoading: isGeneratingImage,
        timestamp: Date.now()
      });

      // Call Body Generator (Tag-Aware)
      if (isGeneratingImage) {
        try {
          // If the AI didn't provide a specific visual tag but user asked for one, fallback to userText
          const promptToUse = contextPrompt || userText;
          
          const tempImageUrl = await generateAriaImage(promptToUse, userText, character);
          
          if (tempImageUrl) {
            onUpdateMessage(responseMessageId, { 
              imageUrl: tempImageUrl, 
              isImageLoading: false 
            });
            onImageGenerated();
          } else {
            onUpdateMessage(responseMessageId, { isImageLoading: false });
          }
        } catch (err) {
          console.error("❌ Image Generation Error:", err);
          onUpdateMessage(responseMessageId, { isImageLoading: false });
        }
      }

    } catch (error) {
      console.error("❌ Aria Interaction Error:", error);
      onSendMessage({ 
        id: generateId('err'), 
        role: 'model', 
        text: "Neural link timeout. Connection interrupted. 🛰️", 
        timestamp: Date.now() 
      });
      if (setIsLoading) setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const downloadMedia = async (url: string, type: 'image' | 'video') => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${character.name.toLowerCase()}-${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`relative flex flex-col h-[100dvh] flex-1 bg-zinc-950 overflow-hidden transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'lg:ml-[300px]' : 'lg:ml-0'}`}>
      
      {/* Background Matrix */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <header 
        className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between transition-transform duration-300 ease-in-out
          ${showHeader ? 'translate-y-0' : '-translate-y-full'}
          ${isDesktopSidebarOpen ? 'lg:left-[300px]' : 'lg:left-0'}
        `}
      >
        <div className="flex items-center gap-4">
          {/* Mobile Toggle */}
          <button onClick={onToggleMobileSidebar} className="lg:hidden p-2 text-zinc-400 hover:text-white bg-white/5 rounded-xl transition-all">
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Desktop Toggle (Only visible when sidebar is closed) */}
          {!isDesktopSidebarOpen && (
            <button onClick={onToggleDesktopSidebar} className="hidden lg:block p-2 text-zinc-400 hover:text-white bg-white/5 rounded-xl transition-all">
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          
          <div>
            <h1 className="text-sm font-black text-white tracking-wide uppercase">{character.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
              <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold font-mono">Neural Link Active</span>
            </div>
          </div>
        </div>
        
        <button onClick={() => onOpenBotCustomization(botId)} className="p-2.5 bg-white/5 text-zinc-400 hover:text-purple-400 hover:bg-white/10 rounded-xl transition-all">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 pt-24 pb-32 custom-scrollbar"
      >
        <div className="w-full mx-auto space-y-6 max-w-4xl">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-center space-y-4">
              <Cpu className="w-12 h-12 text-zinc-800 animate-pulse" />
              <p className="text-zinc-500 tracking-widest text-[10px] font-bold uppercase">Initialize Neural Session</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                characterName={character.name} 
                onMediaClick={(url, type) => setSelectedMedia({ url, type })}
                onAnimateRequest={() => handleAnimateRequest(msg)}
                onRegenerateImage={() => handleRegenerateImage(msg)}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* INPUT AREA */}
      <footer 
        className={`fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent
          ${isDesktopSidebarOpen ? 'lg:left-[300px]' : 'lg:left-0'}
        `}
      >
        <div className="max-w-4xl mx-auto relative group flex items-end bg-zinc-900/80 border border-white/10 rounded-[26px] backdrop-blur-md focus-within:border-purple-500/50 shadow-2xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${character.name}...`}
            className="w-full bg-transparent border-none rounded-[26px] pl-5 pr-14 py-4 min-h-[56px] max-h-[160px] focus:outline-none text-white placeholder-zinc-600 resize-none text-[16px]"
            rows={1}
          />
          <div className="absolute right-2 bottom-2">
            <button 
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={handleSend} 
              disabled={!input.trim() || isLoadingResponse} 
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 active:scale-90
                  ${!input.trim() || isLoadingResponse 
                  ? 'bg-zinc-800 text-zinc-600' 
                  : 'bg-white text-black hover:bg-zinc-200'}`}
            >
              {isLoadingResponse ? <Loader2 className="animate-spin w-5 h-5" /> : <ArrowUp className="w-5 h-5 stroke-[3px]" />}
            </button>
          </div>
        </div>
      </footer>

      {/* MEDIA MODAL */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={() => setSelectedMedia(null)}>
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            
            {selectedMedia.type === 'video' ? (
              <video 
                src={selectedMedia.url} 
                controls 
                autoPlay 
                loop
                className="max-h-[80vh] w-auto max-w-full rounded-2xl border border-purple-500/30 shadow-[0_0_50px_rgba(147,51,234,0.3)]"
              />
            ) : (
              <img 
                src={selectedMedia.url} 
                alt="Neural Output" 
                className="max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl" 
              />
            )}

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => downloadMedia(selectedMedia.url, selectedMedia.type)} 
                disabled={isDownloading}
                className={`flex items-center gap-2 px-8 py-3.5 bg-white text-black font-black rounded-xl hover:bg-purple-500 hover:text-white transition-all
                  ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span className="uppercase text-[10px] tracking-widest">
                  {isDownloading ? 'Saving...' : `Save ${selectedMedia.type === 'video' ? 'MP4' : 'PNG'}`}
                </span>
              </button>
              <button 
                onClick={() => setSelectedMedia(null)} 
                className="p-3.5 bg-zinc-900 border border-white/10 text-white rounded-xl hover:bg-zinc-800 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainChatArea;
