import React, { useState, useEffect, useRef } from 'react';
import { CharacterProfile } from '../types';
import { X, Save, Sparkles, Cpu, Fingerprint, Activity, Loader2, Plus, AlertCircle, Box, Camera, Upload, Server, Image as ImageIcon } from 'lucide-react';

// --- INTERFACES & TYPES ---
export interface ActiveLora { 
  id: string; 
  name: string; 
  strength: number; 
}

export interface ExtendedCharacterProfile extends CharacterProfile {
  favoriteLoras?: string[];
  // --- NEW RUNPOD & IMAGE FIELDS ---
  avatarImage?: string | null;
  runpodModel?: string;
  activeRunpodLoras?: ActiveLora[];
}

interface BotCustomizationModalProps {
  character: CharacterProfile | ExtendedCharacterProfile;
  onSave: (updatedCharacter: ExtendedCharacterProfile) => void;
  onClose: () => void;
  isNewBot?: boolean;
}

// --- CONSTANTS ---
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

const RUNPOD_MODELS = [
  { id: "Qwen-Rapid-AIO-NSFW-v23.safetensors", name: "Qwen AIO (Rapid-v23)" },
  { id: "Qwen-Rapid-AIO-NSFW-v19.safetensors", name: "Qwen AIO (Rapid-v19)" }
];

const LORA_OPTIONS = [
  { id: "yarn_qwen.safetensors", name: "YARN" }, { id: "hmfemme_qwen.safetensors", name: "HMFEM" },  { id: "shavedpussyv1.safetensors", name: "PSY1" }, 
  { id: "hairypussyv5.safetensors", name: "HRYPSY5" },{ id: "hairypussyv6.safetensors", name: "HRYPSY6" },{ id: "hairypussyv7.safetensors", name: "HRYPSY7" },{ id: "hairypussyv8.safetensors", name: "HRYPSY8" },{ id: "hairypussyv9.safetensors", name: "HRYPSY9" },
  { id: "qwen4play.safetensors", name: "QWEN4PLAY" }, { id: "FemNde.safetensors", name: "FEMNUDE" },
  { id: "ENZOM_BJ.safetensors", name: "ENZOM_BJ" }, { id: "ZOOTALLURES_BJ.safetensors", name: "ZOOTALLURES_BJ" },
  { id: "GNASS_SXE.safetensors", name: "GNASS_SXE" }, { id: "FOK_SXE.safetensors", name: "FOK_SXE" },
  { id: "BRAND_ENHANCER.safetensors", name: "BRAND_ENHANCER" }, { id: "HEARME_BOOBS.safetensors", name: "HEARME_BOOBS" },
  { id: "LIMABOG_PUSSY.safetensors", name: "LIMABOG_PUSSY" }, { id: "HARPY_BKAKKE.safetensors", name: "HARPY_BKAKKE" },
  { id: "IR_BJ.safetensors", name: "IR_BJ" }, { id: "JIB_SKIN.safetensors", name: "JIB_SKIN" },
  { id: "NRDX_LIGHTING.safetensors", name: "NRDX_LIGHTING" }, { id: "ALCAITIFF.safetensors", name: "ALCAITIFF" },
  { id: "NATURALSKIN.safetensors", name: "NATURALSKIN" }
];

// --- UPLOAD ZONE COMPONENT ---
const UploadZone = ({ label, file, preview, onClear, onProcess, icon: Icon = Upload, accept = "image/*" }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  return (
    <div 
      onClick={() => !file && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onProcess(f); }}
      className={`relative group cursor-pointer border rounded-2xl p-4 sm:p-6 transition-all duration-300 overflow-hidden h-full flex flex-col items-center justify-center min-h-[140px] ${
        isDragging ? 'border-purple-400 bg-purple-500/10 scale-[1.02]' : file ? 'bg-white/[0.02] border-white/20' : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/30'
      }`}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) onProcess(f); }} className="hidden" accept={accept} />
      {preview ? (
        <div onClick={() => fileInputRef.current?.click()} className="relative w-full h-full rounded-xl overflow-hidden shadow-md border border-white/10 flex-1 flex items-center justify-center group bg-black/50">
          <img src={preview} alt="Preview" className="max-h-[160px] w-full object-cover rounded-xl" />
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
            <span className="text-zinc-100 text-[10px] sm:text-xs font-medium uppercase tracking-widest bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-700">Replace</span>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-red-400 text-[10px] font-medium uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 px-5 py-2 rounded-full hover:bg-red-500/20 transition-colors">Clear</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center pointer-events-none">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-500 ${isDragging ? 'bg-purple-500 text-white scale-110' : 'bg-white/5 border border-white/10 text-zinc-400 group-hover:scale-110 group-hover:border-white/20 group-hover:text-zinc-100'}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <p className="text-[10px] sm:text-xs font-bold text-zinc-400 mb-1 tracking-widest uppercase">{label}</p>
        </div>
      )}
    </div>
  );
};

const BotCustomizationModal: React.FC<BotCustomizationModalProps> = ({ character, onSave, onClose, isNewBot = false }) => {
  // --- INITIALIZATION ---
  const [formData, setFormData] = useState<ExtendedCharacterProfile>({
    ...character,
    hair: Array.isArray(character.hair) ? character.hair : [],
    face: Array.isArray(character.face) ? character.face : [],
    body: Array.isArray(character.body) ? character.body : [],
    favoriteLoras: Array.isArray((character as ExtendedCharacterProfile).favoriteLoras) ? (character as ExtendedCharacterProfile).favoriteLoras : [],
    runpodModel: (character as ExtendedCharacterProfile).runpodModel || 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: Array.isArray((character as ExtendedCharacterProfile).activeRunpodLoras) ? (character as ExtendedCharacterProfile).activeRunpodLoras : [],
    avatarImage: (character as ExtendedCharacterProfile).avatarImage || null,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  // --- RUNPOD & LORA LOGIC ---
  const handleImageProcess = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    // Create base64 for saving in profile
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatarImage: reader.result as string }));
    };
  };

  const addRunpodLora = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'none') return;
    const opt = LORA_OPTIONS.find(l => l.id === val);
    const currentLoras = formData.activeRunpodLoras || [];
    
    if (opt && !currentLoras.find(l => l.id === val)) {
      setFormData(prev => ({
        ...prev,
        activeRunpodLoras: [...currentLoras, { id: opt.id, name: opt.name, strength: 0.8 }]
      }));
    }
    e.target.value = 'none';
  };

  const updateRunpodLoraStrength = (id: string, strength: number) => {
    setFormData(prev => ({
      ...prev,
      activeRunpodLoras: (prev.activeRunpodLoras || []).map(l => 
        l.id === id ? { ...l, strength } : l
      )
    }));
  };

  const removeRunpodLora = (id: string) => {
    setFormData(prev => ({
      ...prev,
      activeRunpodLoras: (prev.activeRunpodLoras || []).filter(l => l.id !== id)
    }));
  };

  // --- SUBMIT ---
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const ageNum = parseInt(formData.age as string, 10);
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

          {/* SECTION 2: RunPod Engine Integration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Server className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">RunPod Engine & Avatar</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Drop Zone */}
              <div className="h-48">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Identity Image (Reference)</label>
                <UploadZone 
                  label="Drop Identity Image" 
                  file={formData.avatarImage} 
                  preview={formData.avatarImage} 
                  accept="image/*"
                  onClear={() => setFormData(prev => ({ ...prev, avatarImage: null }))} 
                  onProcess={(f: File) => handleImageProcess(f)} 
                />
              </div>

              {/* RunPod Models & LoRAs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Base Architecture</label>
                  <select
                    name="runpodModel"
                    value={formData.runpodModel}
                    onChange={handleChange}
                    className="w-full p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm text-zinc-300 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors cursor-pointer"
                  >
                    {RUNPOD_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1 flex items-center justify-between">
                    <span>Active LoRAs</span>
                  </label>
                  
                  <div className="space-y-2 mb-3">
                    {(formData.activeRunpodLoras || []).map(lora => (
                      <div key={lora.id} className="flex items-center gap-3 bg-white/[0.02] p-2 rounded-lg border border-white/10">
                        <span className="text-[10px] font-mono text-zinc-300 w-24 truncate">{lora.name}</span>
                        <input 
                          type="range" min="0" max="2" step="0.1" 
                          value={lora.strength} 
                          onChange={(e) => updateRunpodLoraStrength(lora.id, Number(e.target.value))}
                          className="flex-1 accent-purple-500 h-1" 
                        />
                        <span className="text-[10px] font-mono text-zinc-500 w-6 text-right">{lora.strength.toFixed(1)}</span>
                        <button type="button" onClick={() => removeRunpodLora(lora.id)} className="text-zinc-600 hover:text-red-400 p-1 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(formData.activeRunpodLoras || []).length === 0 && (
                      <div className="text-[10px] font-mono text-zinc-600 italic text-center py-2">No LoRAs injected</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select 
                      onChange={addRunpodLora}
                      value="none"
                      className="flex-1 p-2 bg-white/[0.02] border border-white/10 rounded-lg text-[10px] uppercase tracking-widest outline-none focus:border-purple-500/50 text-zinc-400 shadow-inner"
                    >
                      <option value="none">Add LoRA to Chain...</option>
                      {LORA_OPTIONS.filter(opt => !(formData.activeRunpodLoras || []).find(l => l.id === opt.id)).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-zinc-500 border border-white/10 pointer-events-none">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Morphological Specs */}
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

            {renderInput('outfit', 'Apparel Protocol', 'Silk dress, oversized sweater, etc.', 'textarea')}
          </div>

          {/* SECTION 4: Generation Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Camera className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Generation Preferences</h3>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Favorite Prompts (Classic LoRAs)</label>
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
          </div>

          {/* SECTION 5: Behavioral Logic */}
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
