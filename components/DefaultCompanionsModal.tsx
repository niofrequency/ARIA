import React, { useEffect } from 'react';
import { CharacterProfile } from '../types';
import { X, Plus, UserCircle2, Cpu } from 'lucide-react';

interface DefaultCompanionsModalProps {
  onSelectPreset: (character: CharacterProfile) => void;
  onSelectCustom: () => void;
  onClose: () => void;
  isMandatory?: boolean;
}

// Extended locally to include 'shortTrait' for the UI pill
interface PresetCompanion extends Partial<CharacterProfile> {
  shortTrait: string;
}

// Pre-configured profiles utilizing your existing LoRAs
const PRESET_COMPANIONS: PresetCompanion[] = [
  {
    name: 'Stephanie',
    shortTrait: 'Sweet',
    gender: 'female',
    age: '23',
    ethnicity: 'Caucasian',
    hair: ['blonde', 'long', 'wavy'],
    face: ['blue eyes', 'soft smile', 'cute', 'stephanie'],
    body: ['slim', 'fit', 'petite'],
    outfit: 'casual white crop top and jeans',
    vibe: 'Sweet, caring, and deeply affectionate girl-next-door. Always happy to talk.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [{ id: 'stephanie-lvl2.safetensors', name: 'Stephanie Base', strength: 0.85 }],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'Chloe',
    shortTrait: 'Sassy',
    gender: 'female',
    age: '22',
    ethnicity: 'Caucasian',
    hair: ['pink hair', 'messy', 'shoulder length'],
    face: ['smirk', 'heavy eyeliner', 'chloe-cherry'],
    body: ['curvy', 'soft', 'thick thighs'],
    outfit: 'oversized vintage band tee, fishnets',
    vibe: 'Edgy, highly sarcastic, modern e-girl who loves teasing but has a soft spot.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [{ id: 'chloe-cherry.safetensors', name: 'Chloe Cherry', strength: 0.85 }],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'Katrina',
    shortTrait: 'Dominant',
    gender: 'female',
    age: '26',
    ethnicity: 'Latina',
    hair: ['dark brown', 'straight', 'long'],
    face: ['sharp jawline', 'intense gaze', 'katrina-jade'],
    body: ['athletic', 'voluptuous', 'tall'],
    outfit: 'sleek black dress, silver necklace',
    vibe: 'Bold, highly confident, dominant, and extremely direct. Knows exactly what she wants.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [{ id: 'katrina-jade.safetensors', name: 'Katrina Jade', strength: 0.85 }],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  },
  {
    name: 'Lina',
    shortTrait: 'Mystical',
    gender: 'female',
    age: '120',
    ethnicity: 'Fantasy Elf',
    hair: ['silver hair', 'braided', 'very long'],
    face: ['pointed ears', 'ethereal', 'LINA_the_ELF'],
    body: ['slender', 'petite', 'graceful'],
    outfit: 'intricate forest green tunic with gold accents',
    vibe: 'Mystical, curious, and deeply connected to nature. Speaks with a slight poetic grace.',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [{ id: 'LINA_the_ELF.safetensors', name: 'Lina Elf', strength: 0.85 }],
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark',
    avatarImage: null,
  }
];

const DefaultCompanionsModal: React.FC<DefaultCompanionsModalProps> = ({ 
  onSelectPreset, 
  onSelectCustom, 
  onClose, 
  isMandatory = false 
}) => {

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMandatory) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose, isMandatory]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300"
      onClick={() => { if (!isMandatory) onClose(); }}
    >
      <div 
        className="relative w-full max-w-6xl h-[90dvh] md:h-[85dvh] flex flex-col bg-zinc-950 border border-purple-500/20 rounded-[2rem] shadow-2xl overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] z-0 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex justify-between items-center p-8 md:p-10 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.4em] text-purple-400 font-bold">Neural Archive</span>
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight">
              Choose Your <span className="font-semibold text-purple-400">Companion</span>
            </h2>
          </div>
          {!isMandatory && (
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-all">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content: Grid Layout matching your screenshot */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 md:px-10 pb-10 custom-scrollbar">
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* 1. CREATE NEW CARD */}
            <button
              onClick={onSelectCustom}
              className="group relative flex flex-col items-center justify-center border-2 border-dashed border-purple-500/30 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/10 rounded-3xl aspect-[3/4] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm font-bold text-purple-300 tracking-widest uppercase relative z-10">Create New</span>
            </button>

            {/* 2. PRESET CARDS */}
            {PRESET_COMPANIONS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPreset(preset as CharacterProfile)}
                className="group relative flex flex-col rounded-3xl overflow-hidden border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] transition-all duration-300 aspect-[3/4] bg-zinc-900 text-left"
              >
                {/* Image Area Placeholder */}
                <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {preset.avatarImage ? (
                    <img src={preset.avatarImage} alt={preset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" />
                  ) : (
                    <>
                      <UserCircle2 className="w-20 h-20 text-zinc-700 group-hover:text-purple-900/50 transition-colors duration-500" />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-16 text-[10px] uppercase tracking-widest text-zinc-600 font-bold whitespace-nowrap">Image Placeholder</span>
                    </>
                  )}
                </div>

                {/* Bottom Overlay Info Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent flex items-end justify-between translate-y-0 transition-transform duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-white drop-shadow-md group-hover:text-purple-300 transition-colors">{preset.name}</h3>
                  </div>
                  <div className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-full backdrop-blur-md shadow-lg">
                    <span className="text-[10px] uppercase tracking-widest text-purple-300 font-bold">{preset.shortTrait}</span>
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
