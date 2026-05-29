import React, { useEffect } from 'react';
import { CharacterProfile } from '../types';
import { X, Sparkles, Cpu, ChevronRight, UserCircle2 } from 'lucide-react';

interface DefaultCompanionsModalProps {
  onSelectPreset: (character: CharacterProfile) => void;
  onSelectCustom: () => void;
  onClose: () => void;
  isMandatory?: boolean;
}

// Pre-configured profiles utilizing your existing LoRAs
const PRESET_COMPANIONS: Partial<CharacterProfile>[] = [
  {
    name: 'Stephanie',
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
        className="relative w-full max-w-5xl h-[85dvh] flex flex-col bg-zinc-950 border border-purple-500/20 rounded-[2rem] shadow-2xl overflow-hidden" 
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
              Select <span className="font-semibold text-purple-400">Companion Construct</span>
            </h2>
          </div>
          {!isMandatory && (
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5 transition-all">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 md:px-10 pb-10 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Custom Forge Card */}
            <button
              onClick={onSelectCustom}
              className="group relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-900/20 to-zinc-900/40 border border-purple-500/30 rounded-3xl hover:border-purple-400 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] transition-all duration-300 text-left overflow-hidden min-h-[200px]"
            >
              <div className="absolute inset-0 bg-purple-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
              <Sparkles className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">Forge Custom Identity</h3>
              <p className="text-sm text-zinc-400 text-center relative z-10">Build a completely unique companion from scratch using the Synthesis Laboratory.</p>
            </button>

            {/* Default Companions Mapping */}
            {PRESET_COMPANIONS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPreset(preset as CharacterProfile)}
                className="group flex items-start gap-4 p-6 bg-white/[0.02] border border-white/5 hover:border-purple-500/30 rounded-3xl hover:bg-white/[0.04] transition-all duration-300 text-left min-h-[200px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-purple-500/50 transition-colors shadow-inner">
                  <UserCircle2 className="w-8 h-8 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">{preset.name}</h3>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] uppercase tracking-widest text-zinc-400">{preset.ethnicity}</span>
                    <span className="px-2 py-0.5 bg-white/5 rounded-md text-[9px] uppercase tracking-widest text-zinc-400">{preset.age} YRS</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3 group-hover:text-zinc-400 transition-colors">
                    {preset.vibe}
                  </p>
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
