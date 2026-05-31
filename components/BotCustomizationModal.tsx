import React, { useState, useEffect } from 'react';
import { CharacterProfile } from '../types';
import { X, Save, Cpu, Fingerprint, Activity, Loader2, Plus, Box, Camera, Upload, Server } from 'lucide-react';

export interface ActiveLora { 
  id: string; 
  name: string; 
  strength: number; 
}

interface BotCustomizationModalProps {
  character: CharacterProfile;
  onSave: (updatedCharacter: CharacterProfile) => void;
  onClose: () => void;
}

const RUNPOD_MODELS = [
  { id: "Qwen-Rapid-AIO-NSFW-v23.safetensors", name: "Qwen AIO (Rapid-v23)" },
  { id: "Qwen-Rapid-AIO-NSFW-v19.safetensors", name: "Qwen AIO (Rapid-v19)" }
];

const LORA_OPTIONS = [
  // Core Image Adjustment LoRAs
  { id: "yarn_qwen.safetensors", name: "YARN" }, { id: "hmfemme_qwen.safetensors", name: "HMFEM" },  { id: "shavedpussyv1.safetensors", name: "PSY1" }, 
  { id: "hairypussyv5.safetensors", name: "HRYPSY5" },{ id: "hairypussyv6.safetensors", name: "HRYPSY6" },{ id: "hairypussyv7.safetensors", name: "HRYPSY7" },{ id: "hairypussyv8.safetensors", name: "HRYPSY8" },{ id: "hairypussyv9.safetensors", name: "HRYPSY9" },
  { id: "qwen4play.safetensors", name: "QWEN4PLAY" }, { id: "FemNde.safetensors", name: "FEMNUDE" },
  { id: "ENZOM_BJ.safetensors", name: "ENZOM_BJ" }, { id: "ZOOTALLURES_BJ.safetensors", name: "ZOOTALLURES_BJ" },
  { id: "GNASS_SXE.safetensors", name: "GNASS_SXE" }, { id: "FOK_SXE.safetensors", name: "FOK_SXE" },
  { id: "BRAND_ENHANCER.safetensors", name: "BRAND_ENHANCER" }, { id: "HEARME_BOOBS.safetensors", name: "HEARME_BOOBS" },
  { id: "LIMABOG_PUSSY.safetensors", name: "LIMABOG_PUSSY" }, { id: "HARPY_BKAKKE.safetensors", name: "HARPY_BKAKKE" },
  { id: "IR_BJ.safetensors", name: "IR_BJ" }, { id: "JIB_SKIN.safetensors", name: "JIB_SKIN" },
  { id: "NRDX_LIGHTING.safetensors", name: "NRDX_LIGHTING" }, { id: "ALCAITIFF.safetensors", name: "ALCAITIFF" },
  { id: "NATURALSKIN.safetensors", name: "NATURALSKIN" },

  // Identity Map LoRAs synced from the generator engine
  { id: "ACE_the_ELF.safetensors", name: "ACE the ELF" },
  { id: "amai-liu.safetensors", name: "amai-liu" },
  { id: "AMY_the_ELF.safetensors", name: "AMY the ELF" },
  { id: "ariana-grande.safetensors", name: "ariana-grande" },
  { id: "asmrvida.safetensors", name: "asmrvida" },
  { id: "aubreyplaza-v1.safetensors", name: "aubrey plaza" },
  { id: "baca-v1.safetensors", name: "baca-v1" },
  { id: "brittanyspears-v1.safetensors", name: "brittany spears" },
  { id: "bule-barbie.safetensors", name: "bule barbie" },
  { id: "cheyenne-000009.safetensors", name: "cheyenne" },
  { id: "chloe-cherry.safetensors", name: "chloe cherry" },
  { id: "cum-on-your-face.safetensors", name: "cum on your mouth" },
  { id: "debby-ryan.safetensors", name: "debby ryan" },
  { id: "des.safetensors", name: "des210" },
  { id: "dreamgurl.safetensors", name: "dreamgurl" },
  { id: "dolores-umbridge.safetensors", name: "dolores umbridge" },
  { id: "eva-the-elf.safetensors", name: "eva the elf" },
  { id: "francescale.safetensors", name: "francescale" },
  { id: "irina-spalko.safetensors", name: "irina spalko" },
  { id: "ivyharper-v1.safetensors", name: "ivy harper" },
  { id: "jennaortega-v1.safetensors", name: "jenna ortega" },
  { id: "katrina-jade.safetensors", name: "katrina jade" },
  { id: "kim-kardashian.safetensors", name: "kim kardashian" },
  { id: "larkin-love.safetensors", name: "larkin love" },
  { id: "leighbaker-v1.safetensors", name: "leigh baker" },
  { id: "lia-marie.safetensors", name: "lia marie" },
  { id: "LINA_the_ELF.safetensors", name: "LINA the ELF" },
  { id: "maria-brazil.safetensors", name: "maria brazil" },
  { id: "mercedes-santos.safetensors", name: "mercedes santos" },
  { id: "morticia-addams.safetensors", name: "morticia addams" },
  { id: "natasha-kaur.safetensors", name: "natasha kaur" },
  { id: "naveen.safetensors", name: "naveen" },
  { id: "pam-pink-000009.safetensors", name: "pam pink" },
  { id: "poison-ivy.safetensors", name: "poison ivy" },
  { id: "priyarai.safetensors", name: "priya rai" },
  { id: "queenofhearts.safetensors", name: "queen of hearts" },
  { id: "raven-v1.safetensors", name: "raven-v1" },
  { id: "regina-evilqueen.safetensors", name: "regina evilqueen" },
  { id: "rizzkallah.safetensors", name: "rizzkallah" },
  { id: "shaghana-doyle.safetensors", name: "shaghana doyle" },
  { id: "stephanie-og2.safetensors", name: "stephanie og2" },
  { id: "stephanie-lvl2.safetensors", name: "stephanie lvl2" },
  { id: "stephanie-og-000009.safetensors", name: "stephanie og" },
  { id: "stephanie-proxy.safetensors", name: "stephanie proxy" },
  { id: "stephanie-v1-000009.safetensors", name: "stephanie v1" },
  { id: "theresa.safetensors", name: "theresa" },
  { id: "tinkerbell.safetensors", name: "tinkerbell" },
  { id: "velma-dinkle.safetensors", name: "velma dinkle" },
  { id: "wild-beast.safetensors", name: "wild beast" },
  { id: "witchofoz.safetensors", name: "witch of oz" },
  { id: "xochitl-v1.safetensors", name: "xochitl gomez" }
];

const BotCustomizationModal: React.FC<BotCustomizationModalProps> = ({ character, onSave, onClose }) => {
  const [formData, setFormData] = useState<CharacterProfile>({
    ...character,
    hair: Array.isArray(character.hair) ? character.hair : [],
    face: Array.isArray(character.face) ? character.face : [],
    body: Array.isArray(character.body) ? character.body : [],
    favoriteLoras: Array.isArray(character.favoriteLoras) ? character.favoriteLoras : [],
    runpodModel: character.runpodModel || 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: Array.isArray(character.activeRunpodLoras) ? character.activeRunpodLoras : [],
    avatarImage: character.avatarImage || null,
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
      if (!isNaN(ageNum) && ageNum >= 0) {
        setAgeError(null);
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleImageProcess = (file: File) => {
    if (!file.type.startsWith('image/')) return;
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
    name: keyof CharacterProfile, 
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
                <span className="text-[10px] uppercase tracking-[0.4em] text-purple-500 font-bold">Interface Parameters</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-light text-white tracking-tight">
              Modify <span className="font-semibold text-purple-500">Companion Specs</span>
            </h2>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-2 bg-white/5 text-zinc-500 hover:text-white rounded-xl transition-all disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="relative z-10 flex-1 overflow-y-auto px-6 md:px-10 pb-6 custom-scrollbar space-y-8">
          
          {/* SECTION 1: Identity Base */}
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

          {/* SECTION 2: Morphological Specs */}
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

          {/* SECTION 3: Imaging Architecture & LoRAs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Server className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Neural Engine & Core Image</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Image Preview & Upload Dropzone */}
              <div className="flex flex-col gap-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 ml-1">
                  Avatar Reference
                </label>
                
                {formData.avatarImage ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-md border border-white/10 flex items-center justify-center group bg-black/50">
                    <img src={formData.avatarImage} alt="Avatar Preview" className="h-full w-full object-cover rounded-xl" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-2">
                      <span className="text-zinc-100 text-[10px] font-medium uppercase tracking-widest bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-700">Identity Active</span>
                      <div className="relative cursor-pointer text-purple-400 text-[10px] font-medium uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 px-5 py-2 rounded-full hover:bg-purple-500/20 transition-colors">
                        <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleImageProcess(f); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                        Replace Image
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative group cursor-pointer border border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/30 rounded-xl h-48 p-4 transition-all flex flex-col items-center justify-center text-center">
                     <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleImageProcess(f); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" />
                     <Upload className="w-6 h-6 text-zinc-400 mb-2 group-hover:text-purple-400 transition-colors" />
                     <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold group-hover:text-zinc-200">Upload Photo Matrix</span>
                  </div>
                )}
              </div>

              {/* Engine Tuning Architecture */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2 ml-1">Base Model Core</label>
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
                    <span>Active LoRAs Chain</span>
                  </label>
                  
                  <div className="space-y-2 mb-3 max-h-[120px] overflow-y-auto custom-scrollbar">
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
                      <div className="text-[10px] font-mono text-zinc-600 italic text-center py-2">No active LoRAs linked</div>
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

          {/* SECTION 4: Behavioral Matrix */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Activity className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Behavioral Logic</h3>
            </div>
            <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                {renderInput('vibe', 'Personality Matrix', 'Nurturing, playful, elegant...', 'textarea')}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Camera className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs uppercase tracking-widest text-zinc-300 font-bold">Imaging Filters (Negative)</h3>
            </div>
            {renderInput('negativePrompt', 'Exclusion Parameters', 'Glasses, hats, structural anomalies...', 'textarea')}
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
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Processing...' : 'Sync Protocols'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default BotCustomizationModal;
