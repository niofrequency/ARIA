import React, { useState, useEffect } from 'react';
import { CharacterProfile } from '../types';
import { X, Save, Sparkles, Cpu, Fingerprint, Activity, Loader2, Plus, AlertCircle, Box, Camera, Heart } from 'lucide-react';

// --- EXTENDED PROFILE INTERFACE ---
export interface ExtendedCharacterProfile extends CharacterProfile {
  bodyType?: string;
  preferredAngles?: string[];
  preferredShotTypes?: string[];
  favoriteLoras?: string[];
  nsfwSpecialties?: string[];
}

interface BotCustomizationModalProps {
  character: CharacterProfile | ExtendedCharacterProfile;
  onSave: (updatedCharacter: ExtendedCharacterProfile) => void;
  onClose: () => void;
  isNewBot?: boolean;
}

// --- CONSTANTS ---
const BODY_TYPES = ['Petite', 'Slim', 'Athletic', 'Curvy', 'Thick', 'Plus-size', 'Hourglass', 'Random'];
const CAMERA_ANGLES = ['Eye-level', 'High angle', 'Low angle', 'Three-quarter view', 'Side profile', 'From behind'];
const SHOT_TYPES = ['Close-up (Face)', 'Close-up (Body)', 'Medium shot', 'Full body', 'Dynamic pose'];
const COMMON_LORAS = [
  { id: "hairypussyv7.safetensors", name: "Hairy Pussy v7" },
  { id: "hairypussyv9.safetensors", name: "Hairy Pussy v9" },
  { id: "ENZOM_BJ.safetensors", name: "Enzo BJ" },
  { id: "LIMABOG_PUSSY.safetensors", name: "Limabog Pussy" },
  { id: "qwen4play.safetensors", name: "Qwen 4Play" },
  { id: "FemNde.safetensors", name: "Fem Nude" },
  { id: "creampie.safetensors", name: "Creampie" },
  { id: "twerk.safetensors", name: "Twerk" },
];

const BotCustomizationModal: React.FC<BotCustomizationModalProps> = ({ character, onSave, onClose, isNewBot = false }) => {
  // --- UPGRADED INITIALIZATION (ARRAY SAFETY) ---
  const [formData, setFormData] = useState<ExtendedCharacterProfile>({
    ...character,
    hair: Array.isArray(character.hair) ? character.hair : [],
    face: Array.isArray(character.face) ? character.face : [],
    body: Array.isArray(character.body) ? character.body : [],
    preferredAngles: Array.isArray((character as ExtendedCharacterProfile).preferredAngles) ? (character as ExtendedCharacterProfile).preferredAngles : [],
    preferredShotTypes: Array.isArray((character as ExtendedCharacterProfile).preferredShotTypes) ? (character as ExtendedCharacterProfile).preferredShotTypes : [],
    favoriteLoras: Array.isArray((character as ExtendedCharacterProfile).favoriteLoras) ? (character as ExtendedCharacterProfile).favoriteLoras : [],
    nsfwSpecialties: Array.isArray((character as ExtendedCharacterProfile).nsfwSpecialties) ? (character as ExtendedCharacterProfile).nsfwSpecialties : [],
    bodyType: (character as ExtendedCharacterProfile).bodyType || 'Random',
  });
  
  const [ageError, setAgeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [tagInputs, setTagInputs] = useState({ hair: '', face: '', body: '' });

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'age') {
      const ageNum = parseInt(value, 10);
      if (!isNaN(ageNum) && ageNum >= 18) {
        setAgeError(null);
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- TAG & ARRAY MANAGEMENT ---
  const toggleArrayItem = (field: keyof ExtendedCharacterProfile, value: string) => {
    setFormData(prev => {
      const current = Array.isArray(prev[field]) ? prev[field] as string[] : [];
      const newArray = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleAddTag = (field: 'hair' | 'face' | 'body') => {
    const value = tagInputs[field].trim().toLowerCase();
    if (!value) return;

    if (!(formData[field] as string[]).includes(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value]
      }));
    }
    setTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  const handleRemoveTag = (field: 'hair' | 'face' | 'body', tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent, field: 'hair' | 'face' | 'body') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(field);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      setAgeError('Neural link requires age 18 or older.');
      return;
    }
    
    setAgeError(null);
    setIsSaving(true);
    
    try {
      await onSave(formData);
    } catch (err) {
      console.error("Failed to save character:", err);
      setIsSaving(false);
    }
  };

  // --- RENDER HELPERS ---
  const renderTagField = (field: 'hair' | 'face' | 'body', label: string, placeholder: string) => (
    <div className="space-y-2">
      <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/10 rounded-xl min-h-[52px] focus-within:border-purple-500/50 transition-all">
        {(formData[field] as string[]).map((tag, idx) => (
          <div 
            key={`${field}-${idx}`} 
            className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-bold rounded-lg animate-in zoom-in duration-200"
          >
            {tag}
            <button 
              type="button" 
              onClick={() => handleRemoveTag(field, tag)}
              className="hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={tagInputs[field]}
          onChange={(e) => setTagInputs(prev => ({ ...prev, [field]: e.target.value }))}
          onKeyDown={(e) => handleTagKeyDown(e, field)}
          placeholder={(formData[field] as string[]).length === 0 ? placeholder : "Add more..."}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-zinc-700 focus:outline-none"
        />
        <button 
          type="button"
          onClick={() => handleAddTag(field)}
          className="p-1 hover:bg-white/5 rounded-md text-zinc-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderInput = (
    name: keyof ExtendedCharacterProfile, 
    label: string, 
    placeholder: string, 
    type: 'text' | 'number' | 'textarea' = 'text',
    isAnchor: boolean = false
  ) => (
    <div className="space-y-1.5">
      <label htmlFor={name} className={`block text-[10px] uppercase tracking-[0.2em] font-bold ml-1 ${isAnchor ? 'text-purple-500' : 'text-zinc-500'}`}>
        {isAnchor ? `Identity Anchor (${label})` : label}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          disabled={isSaving}
          value={formData[name] as string || ''}
          onChange={handleChange}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none custom-scrollbar disabled:opacity-50"
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          disabled={isSaving}
          value={formData[name] as string || ''}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full bg-white/[0.02] border rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all disabled:opacity-50 ${isAnchor ? 'border-purple-500/40 focus:border-purple-500 focus:ring-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.05)]' : 'border-white/10 focus:border-purple-500/50 focus:ring-purple-500/50'}`}
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl max-h-[90dvh] flex flex-col bg-zinc-950 border border-white/10 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
              style={{ backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] z-0 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex justify-between items-start p-6 md:p-10 pb-4 md:pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span className="text-[10px] uppercase tracking-[0.4em] text-purple-500 font-bold">Neural Configuration</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-light text-white tracking-tight">
              {isNewBot ? 'Initialize' : 'Modify'} <span className="font-semibold text-purple-500">Interface</span>
            </h2>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-2 bg-white/5 text-zinc-500 hover:text-white rounded-xl transition-all disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="relative z-10 flex-1 overflow-y-auto px-6 md:px-10 pb-6 custom-scrollbar space-y-8">
          
          {/* SECTION 1: Core Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Fingerprint className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Core Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInput('name', 'Designation', 'Unique Interface Name', 'text', true)}
                <div>
                  {renderInput('age', 'Chronological Age', 'Min. 18', 'number')}
                  {ageError && <p className="text-red-500 text-[10px] uppercase mt-1 font-bold">{ageError}</p>}
                </div>
                {renderInput('gender', 'Biological Blueprint', 'female, male, etc.')}
                {renderInput('ethnicity', 'Ethnicity', 'Latina, Asian, Caucasian, etc.')}
            </div>
          </div>

          {/* SECTION 2: Morphological Specs (UPGRADED) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Box className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Morphological Specs</h3>
            </div>
            
            <div className="space-y-4">
                {renderTagField('hair', 'Hair Detail Configuration', 'blonde, long, wavy')}
                {renderTagField('face', 'Facial Neural Markers', 'freckles, blue eyes, sharp jawline')}
                {renderTagField('body', 'Physique Parameters', 'athletic, tall, hourglass')}
            </div>

            {/* NEW: Body Type Selector */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Primary Body Type</label>
              <div className="flex flex-wrap gap-2">
                {BODY_TYPES.map(bt => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bodyType: bt }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${formData.bodyType === bt 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {renderInput('outfit', 'Apparel Protocol', 'Silk dress, oversized sweater, etc.', 'textarea')}
          </div>

          {/* SECTION 3: Generation Preferences (NEW) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Camera className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Generation Preferences</h3>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Preferred Camera Angles</label>
              <div className="flex flex-wrap gap-2">
                {CAMERA_ANGLES.map(angle => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => toggleArrayItem('preferredAngles', angle)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all border ${formData.preferredAngles?.includes(angle) 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400' 
                      : 'border-white/10 hover:border-white/30 text-zinc-400'}`}
                  >
                    {angle}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Preferred Shot Types</label>
              <div className="flex flex-wrap gap-2">
                {SHOT_TYPES.map(shot => (
                  <button
                    key={shot}
                    type="button"
                    onClick={() => toggleArrayItem('preferredShotTypes', shot)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all border ${formData.preferredShotTypes?.includes(shot) 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400' 
                      : 'border-white/10 hover:border-white/30 text-zinc-400'}`}
                  >
                    {shot}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Favorite LoRAs</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_LORAS.map(lora => (
                  <button
                    key={lora.id}
                    type="button"
                    onClick={() => toggleArrayItem('favoriteLoras', lora.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all border ${formData.favoriteLoras?.includes(lora.id) 
                      ? 'border-rose-500 bg-rose-500/10 text-rose-400' 
                      : 'border-white/10 hover:border-white/30 text-zinc-400'}`}
                  >
                    {lora.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1 flex items-center gap-1.5">
                <Heart className="w-3 h-3 text-rose-500" /> NSFW Specialties
              </label>
              <input
                type="text"
                placeholder="Type and press Enter (e.g., ahegao, breeding)"
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    e.preventDefault();
                    toggleArrayItem('nsfwSpecialties', e.currentTarget.value.trim().toLowerCase());
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.nsfwSpecialties?.map((spec, i) => (
                  <div key={i} className="bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-lg flex items-center gap-1.5 animate-in zoom-in duration-200">
                    {spec}
                    <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => toggleArrayItem('nsfwSpecialties', spec)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: Behavioral Logic */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Activity className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Behavioral Logic</h3>
            </div>
            <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                {renderInput('vibe', 'Personality Matrix', 'Nurturing, playful, etc.', 'textarea')}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Sparkles className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Imaging Filters (Negative)</h3>
            </div>
            {renderInput('negativePrompt', 'Exclusion Parameters', 'Glasses, hats, jewelry, extra fingers...', 'textarea')}
          </div>
        </form>

        {/* Footer */}
        <div className="relative z-10 flex flex-col-reverse sm:flex-row justify-end gap-3 p-6 md:p-10 pt-4 md:pt-6 border-t border-white/5 bg-zinc-950">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3 rounded-xl border border-white/10 text-zinc-400 text-xs uppercase tracking-widest font-bold hover:bg-white/5 transition-all disabled:opacity-30"
            >
              Abort
            </button>
            <button 
              onClick={() => handleSubmit()}
              type="button" 
              onPointerDown={(e) => e.preventDefault()} 
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white text-xs uppercase tracking-[0.2em] font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:bg-purple-500 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isNewBot ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Processing...' : isNewBot ? 'Initialize Link' : 'Sync Protocols'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default BotCustomizationModal;
