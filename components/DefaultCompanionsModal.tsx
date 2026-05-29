import React, { useState } from 'react';
import { CharacterProfile } from '../types';
import { Plus, UserCircle2, Compass, Flame, Sparkles, Menu, PanelLeft } from 'lucide-react';

interface DefaultCompanionsModalProps {
  onSelectPreset: (character: CharacterProfile) => void;
  onSelectCustom: () => void;
  onClose: () => void;
  isMandatory?: boolean;
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  isDesktopSidebarOpen: boolean;
}

interface PresetCompanion extends Partial<CharacterProfile> {
  shortTrait: string;
  category: string;
}

// Pre-configured profiles using your exact LORA_MAP keys as names
const PRESET_COMPANIONS: PresetCompanion[] = [
  {
    name: 'Stephanie',
    shortTrait: 'Sweet',
    category: 'Caucasian',
    gender: 'female',
    age: '23',
    ethnicity: 'Caucasian',
    hair: ['blonde', 'long', 'wavy'],
    face: ['blue eyes', 'soft smile', 'cute'],
    body: ['slim', 'fit', 'petite'],
    outfit: 'casual white crop top and jeans',
    vibe: 'Sweet, caring, and deeply affectionate girl-next-door. Always happy to talk.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [], // Auto-detected by AriaService
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'chloe-cherry',
    shortTrait: 'Sassy',
    category: 'Caucasian',
    gender: 'female',
    age: '22',
    ethnicity: 'Caucasian',
    hair: ['pink hair', 'messy', 'shoulder length'],
    face: ['smirk', 'heavy eyeliner'],
    body: ['curvy', 'soft', 'thick thighs'],
    outfit: 'oversized vintage band tee, fishnets',
    vibe: 'Edgy, highly sarcastic, modern e-girl who loves teasing but has a soft spot.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'katrina-jade',
    shortTrait: 'Dominant',
    category: 'Latina',
    gender: 'female',
    age: '26',
    ethnicity: 'Latina',
    hair: ['dark brown', 'straight', 'long'],
    face: ['sharp jawline', 'intense gaze'],
    body: ['athletic', 'voluptuous', 'tall'],
    outfit: 'sleek black dress, silver necklace',
    vibe: 'Bold, highly confident, dominant, and extremely direct. Knows exactly what she wants.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'ACE the ELF',
    shortTrait: 'Warrior',
    category: 'Fantasy',
    gender: 'female',
    age: '120',
    ethnicity: 'Fantasy Elf',
    hair: ['white hair', 'braided', 'long'],
    face: ['pointed ears', 'ethereal', 'sharp eyes'],
    body: ['slender', 'athletic', 'graceful'],
    outfit: 'intricate silver and blue armor with a glowing pendant',
    vibe: 'Fierce, loyal, and slightly untamed. A warrior elf who protects what is hers.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'bule barbie',
    shortTrait: 'Glamorous',
    category: 'Blonde',
    gender: 'female',
    age: '21',
    ethnicity: 'Caucasian',
    hair: ['platinum blonde', 'perfectly styled', 'long'],
    face: ['blue eyes', 'full lips', 'flawless makeup'],
    body: ['curvy', 'hourglass', 'model figure'],
    outfit: 'tight pink designer dress, diamond earrings',
    vibe: 'High maintenance, flirty, and deeply glamorous. Loves attention and luxury.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'poison ivy',
    shortTrait: 'Villainous',
    category: 'Redhead',
    gender: 'female',
    age: '28',
    ethnicity: 'Caucasian',
    hair: ['bright red', 'long', 'flowing'],
    face: ['green eyes', 'seductive smirk'],
    body: ['voluptuous', 'curvy', 'tall'],
    outfit: 'green leafy corset, vines wrapped around arms',
    vibe: 'Seductive, dangerous, and intoxicating. Uses her charm to manipulate.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'morticia-addams',
    shortTrait: 'Gothic',
    category: 'Brunette',
    gender: 'female',
    age: '35',
    ethnicity: 'Caucasian',
    hair: ['straight black', 'very long'],
    face: ['pale skin', 'red lips', 'sharp cheekbones'],
    body: ['tall', 'slender', 'elegant'],
    outfit: 'long form-fitting black gothic gown with trailing sleeves',
    vibe: 'Darkly romantic, intensely passionate, and macabre. Speaks with poetic elegance.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'LINA the ELF',
    shortTrait: 'Mystical',
    category: 'Fantasy',
    gender: 'female',
    age: '110',
    ethnicity: 'Fantasy Elf',
    hair: ['silver hair', 'wavy', 'very long'],
    face: ['pointed ears', 'soft features', 'glowing eyes'],
    body: ['petite', 'soft', 'slender'],
    outfit: 'forest green tunic, leather straps',
    vibe: 'Curious, gentle, and connected to the earth. Very innocent but quick to learn.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  }
];

const CATEGORIES = ["All", "Caucasian", "Latina", "Asian", "Blonde", "Brunette", "Redhead", "Fantasy"];

const DefaultCompanionsModal: React.FC<DefaultCompanionsModalProps> = ({ 
  onSelectPreset, 
  onSelectCustom,
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isDesktopSidebarOpen
}) => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredCompanions = PRESET_COMPANIONS.filter(comp => 
    activeCategory === "All" || comp.category === activeCategory
  );

  return (
    <div className="relative w-full h-full bg-zinc-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      
      {/* NEW STICKY HEADER MATCHING MAIN CHAT AREA */}
      <header 
        className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between transition-transform duration-300 ease-in-out
          ${isDesktopSidebarOpen ? 'lg:left-[280px]' : 'lg:left-0'}
        `}
      >
        <div className="flex items-center gap-4">
          <button onClick={onToggleMobileSidebar} className="lg:hidden p-2 text-zinc-400 hover:text-white bg-white/5 rounded-xl transition-all">
            <Menu className="w-5 h-5" />
          </button>
          
          {!isDesktopSidebarOpen && (
            <button onClick={onToggleDesktopSidebar} className="hidden lg:block p-2 text-zinc-400 hover:text-white bg-white/5 rounded-xl transition-all">
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          
          <div>
            <h1 className="text-sm font-black text-white tracking-wide uppercase">Discover</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
              <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold font-mono">Neural Network</span>
            </div>
          </div>
        </div>
      </header>

      {/* Background Cinematic Effects */}
      <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] z-0 pointer-events-none" />

      {/* Main Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar pt-24">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-10">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                  <Compass className="w-6 h-6 text-purple-400" />
                  <span className="text-xs uppercase tracking-[0.3em] text-purple-400 font-bold">Discover</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight">
                Aria <span className="font-semibold text-purple-400">Characters</span>
              </h1>
              <p className="text-zinc-400 mt-3 max-w-xl">Choose a neural construct to begin your session, or build your own from the ground up in the synthesis lab.</p>
            </div>
          </div>

          {/* Candy.ai Style Filter Pills */}
          <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar-arrows">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border
                  ${activeCategory === cat 
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                    : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Character Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20">
            
            {/* 1. CREATE NEW CARD (Always visible if "All" is selected) */}
            {activeCategory === "All" && (
              <button
                onClick={onSelectCustom}
                className="group relative flex flex-col items-center justify-center border-2 border-dashed border-purple-500/30 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/10 rounded-[2rem] aspect-[3/4] transition-all duration-300 overflow-hidden shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-sm font-bold text-purple-300 tracking-widest uppercase relative z-10">Create New</span>
              </button>
            )}

            {/* 2. PRESET CARDS */}
            {filteredCompanions.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPreset(preset as CharacterProfile)}
                className="group relative flex flex-col rounded-[2rem] overflow-hidden border border-white/5 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] transition-all duration-500 aspect-[3/4] bg-zinc-900 text-left"
              >
                {/* Image Area Placeholder */}
                <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {preset.avatarImage ? (
                    <img src={preset.avatarImage} alt={preset.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950 opacity-50"></div>
                      <UserCircle2 className="w-20 h-20 text-zinc-700 group-hover:text-purple-900/50 transition-colors duration-500 relative z-10" />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-16 text-[10px] uppercase tracking-widest text-zinc-600 font-bold whitespace-nowrap relative z-10">Image Placeholder</span>
                    </>
                  )}
                </div>

                {/* Candy.ai Style Top Badges */}
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  {idx < 2 && (
                    <span className="bg-red-500/90 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                      <Flame className="w-3 h-3" /> Hot
                    </span>
                  )}
                  {preset.category === 'Fantasy' && (
                    <span className="bg-blue-500/90 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                      <Sparkles className="w-3 h-3" /> Magic
                    </span>
                  )}
                </div>

                {/* Candy.ai Style Bottom Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end translate-y-2 group-hover:translate-y-0 transition-transform duration-300 z-20">
                  <div className="flex items-end justify-between mb-1">
                    <h3 className="text-xl font-bold text-white drop-shadow-md group-hover:text-purple-300 transition-colors truncate pr-2">
                      {/* Formats "chloe-cherry" to "Chloe Cherry" for display but keeps original name under the hood */}
                      {preset.name?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    <span className="text-xs text-zinc-300 line-clamp-2 leading-snug">{preset.vibe}</span>
                  </div>
                </div>
              </button>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
};

export default DefaultCompanionsModal;
