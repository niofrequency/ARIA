import React, { useState, useEffect } from 'react';
import { CharacterProfile } from '../types';
import { X, Save, Sparkles, Cpu, Fingerprint, Activity, Loader2, Plus, Heart, Camera, Box } from 'lucide-react';

interface BotCustomizationModalProps {
  character: CharacterProfile;
  onSave: (updatedCharacter: CharacterProfile) => void;
  onClose: () => void;
  isNewBot?: boolean;
}

// Extended CharacterProfile
export interface ExtendedCharacterProfile extends CharacterProfile {
  bodyType?: string;
  preferredAngles?: string[];
  preferredShotTypes?: string[];
  favoriteLoras?: string[];
  nsfwSpecialties?: string[];
  aestheticStyle?: string;
}

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

const BotCustomizationModal: React.FC<BotCustomizationModalProps> = ({ 
  character, 
  onSave, 
  onClose, 
  isNewBot = false 
}) => {

  const [formData, setFormData] = useState<ExtendedCharacterProfile>({
    ...character,
    hair: Array.isArray(character.hair) ? character.hair : [],
    face: Array.isArray(character.face) ? character.face : [],
    body: Array.isArray(character.body) ? character.body : [],
    preferredAngles: Array.isArray(character.preferredAngles) ? character.preferredAngles : [],
    preferredShotTypes: Array.isArray(character.preferredShotTypes) ? character.preferredShotTypes : [],
    favoriteLoras: Array.isArray(character.favoriteLoras) ? character.favoriteLoras : [],
    nsfwSpecialties: Array.isArray(character.nsfwSpecialties) ? character.nsfwSpecialties : [],
  });

  const [tagInputs, setTagInputs] = useState({ hair: '', face: '', body: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);

  // Scroll Lock + Escape Key
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
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
      if (!isNaN(ageNum) && ageNum >= 18) setAgeError(null);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
    if (!value || (formData[field] as string[]).includes(value)) return;

    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value]
    }));
    setTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  const handleRemoveTag = (field: 'hair' | 'face' | 'body', tag: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter(t => t !== tag)
    }));
  };

  const handleSubmit = async () => {
    const ageNum = parseInt(formData.age as string, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      setAgeError('Neural link requires age 18 or older.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error("Failed to save character:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTagField = (field: 'hair' | 'face' | 'body', label: string, placeholder: string) => (
    <div className="space-y-2">
      <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/10 rounded-xl min-h-[52px]">
        {(formData[field] as string[]).map((tag, idx) => (
          <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] rounded-lg">
            {tag}
            <button onClick={() => handleRemoveTag(field, tag)} className="hover:text-white transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={tagInputs[field]}
          onChange={(e) => setTagInputs(prev => ({ ...prev, [field]: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(field))}
          placeholder={placeholder}
          className="flex-1 min-w-[140px] bg-transparent text-sm placeholder-zinc-700 focus:outline-none"
        />
        <button onClick={() => handleAddTag(field)} className="text-zinc-400 hover:text-purple-400">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-2" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl max-h-[92dvh] bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-5 h-5 text-purple-500" />
            <span className="uppercase tracking-[0.4em] text-xs text-purple-500 font-bold">Qwen AIO NSFW Profile</span>
          </div>
          <h2 className="text-3xl font-light tracking-tight">
            {isNewBot ? 'Create New' : 'Configure'} <span className="text-purple-500 font-semibold">Interface</span>
          </h2>
        </div>

        <div className="overflow-y-auto p-8 space-y-10 custom-scrollbar max-h-[calc(92dvh-180px)]">
          
          {/* Core Identity */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-zinc-400" />
              <h3 className="uppercase text-xs tracking-widest text-zinc-400 font-bold">Core Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">Designation</label>
                <input
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm"
                  placeholder="Interface Name"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age || ''}
                  onChange={handleChange}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm"
                  placeholder="18"
                />
                {ageError && <p className="text-red-500 text-xs mt-1">{ageError}</p>}
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">Gender</label>
                <input
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleChange}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm"
                  placeholder="female"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">Ethnicity</label>
                <input
                  name="ethnicity"
                  value={formData.ethnicity || ''}
                  onChange={handleChange}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm"
                  placeholder="Asian, Latina, etc."
                />
              </div>
            </div>
          </div>

          {/* Morphological Profile */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-zinc-400" />
              <h3 className="uppercase text-xs tracking-widest text-zinc-400 font-bold">Morphological Profile</h3>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {renderTagField('hair', 'Hair Configuration', 'long silver hair, bangs...')}
              {renderTagField('face', 'Facial Details', 'blue eyes, freckles...')}
              {renderTagField('body', 'Body Details', 'thick thighs, slim waist...')}

              {/* Body Type */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Primary Body Type</label>
                <div className="flex flex-wrap gap-2">
                  {BODY_TYPES.map(bt => (
                    <button
                      key={bt}
                      onClick={() => setFormData(prev => ({ ...prev, bodyType: bt }))}
                      className={`px-4 py-2 rounded-xl text-sm transition-all ${formData.bodyType === bt 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                name="outfit"
                value={formData.outfit || ''}
                onChange={handleChange}
                placeholder="Default outfit / clothing style..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm min-h-[80px]"
              />
            </div>
          </div>

          {/* Generation Preferences */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-zinc-400" />
              <h3 className="uppercase text-xs tracking-widest text-zinc-400 font-bold">Generation Preferences</h3>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Preferred Camera Angles</label>
              <div className="flex flex-wrap gap-2">
                {CAMERA_ANGLES.map(angle => (
                  <button
                    key={angle}
                    onClick={() => toggleArrayItem('preferredAngles', angle)}
                    className={`px-4 py-1.5 text-sm rounded-xl transition-all border ${formData.preferredAngles?.includes(angle) 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400' 
                      : 'border-white/10 hover:border-white/30'}`}
                  >
                    {angle}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Preferred Shot Types</label>
              <div className="flex flex-wrap gap-2">
                {SHOT_TYPES.map(shot => (
                  <button
                    key={shot}
                    onClick={() => toggleArrayItem('preferredShotTypes', shot)}
                    className={`px-4 py-1.5 text-sm rounded-xl transition-all border ${formData.preferredShotTypes?.includes(shot) 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400' 
                      : 'border-white/10 hover:border-white/30'}`}
                  >
                    {shot}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Favorite LoRAs (Qwen AIO)</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_LORAS.map(lora => (
                  <button
                    key={lora.id}
                    onClick={() => toggleArrayItem('favoriteLoras', lora.id)}
                    className={`px-4 py-1.5 text-xs rounded-xl transition-all border ${formData.favoriteLoras?.includes(lora.id) 
                      ? 'border-rose-500 bg-rose-500/10 text-rose-400' 
                      : 'border-white/10 hover:border-white/30'}`}
                  >
                    {lora.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4" /> NSFW Specialties
              </label>
              <input
                type="text"
                placeholder="creampie, ahegao, breeding..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    toggleArrayItem('nsfwSpecialties', e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.nsfwSpecialties?.map((spec, i) => (
                  <div key={i} className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-3 py-1 rounded-lg flex items-center gap-1">
                    {spec}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleArrayItem('nsfwSpecialties', spec)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Behavioral & Negative Prompt */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              <h3 className="uppercase text-xs tracking-widest text-zinc-400 font-bold">Behavioral Logic</h3>
            </div>
            {renderTagField('vibe', 'Personality Matrix', 'bratty, submissive, teasing...')}

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Negative Prompt</label>
              <textarea
                name="negativePrompt"
                value={formData.negativePrompt || ''}
                onChange={handleChange}
                placeholder="low quality, blurry, deformed, extra limbs..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 rounded-2xl border border-white/10 text-zinc-400 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-70 transition-all"
          >
            {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : isNewBot ? <Sparkles className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Saving...' : isNewBot ? 'Initialize Neural Link' : 'Save Character'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotCustomizationModal;