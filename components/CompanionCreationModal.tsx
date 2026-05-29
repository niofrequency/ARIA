import React, { useState, useEffect } from 'react';
import { CharacterProfile } from '../types';
import { generateAriaImage } from '../services/ariaService';
import { Sparkles, Cpu, Fingerprint, Activity, Loader2, Plus, Box, Camera, Upload, Server, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface CompanionCreationModalProps {
  onSave: (newCharacter: CharacterProfile) => void;
  onClose: () => void;
  isMandatory?: boolean;
}

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

const TOTAL_STEPS = 10;

const CompanionCreationModal: React.FC<CompanionCreationModalProps> = ({ onSave, onClose, isMandatory = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CharacterProfile>>({
    name: '',
    age: '24',
    gender: '',
    ethnicity: '',
    hair: [],
    face: [],
    body: [],
    outfit: '',
    runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
    activeRunpodLoras: [],
    avatarImage: null,
    vibe: '',
    negativePrompt: 'glasses, hat, extra fingers, low quality, distorted anatomy, text, watermark'
  });
  
  const [ageError, setAgeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isForging, setIsForging] = useState(false);
  const [forgeError, setForgeError] = useState<string | null>(null);
  const [tagInputs, setTagInputs] = useState({ hair: '', face: '', body: '' });

  // Escape key always goes back/cancels. (Removed body scroll lock as it's a full page now)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'age') {
      const ageNum = parseInt(value, 10);
      if (!isNaN(ageNum) && ageNum >= 18) setAgeError(null);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = (field: 'hair' | 'face' | 'body') => {
    const value = tagInputs[field].trim().toLowerCase();
    if (!value) return;

    const currentTags = formData[field] as string[] || [];
    if (!currentTags.includes(value)) {
      setFormData(prev => ({ ...prev, [field]: [...currentTags, value] }));
    }
    setTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  const handleRemoveTag = (field: 'hair' | 'face' | 'body', tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[] || []).filter(tag => tag !== tagToRemove)
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

  const triggerIdentityGenerator = async () => {
    setIsForging(true);
    setForgeError(null);
    try {
      const hairStr = formData.hair && formData.hair.length > 0 ? formData.hair.join(', ') : 'natural hair';
      const faceStr = formData.face && formData.face.length > 0 ? formData.face.join(', ') : 'beautiful face';
      const bodyStr = formData.body && formData.body.length > 0 ? formData.body.join(', ') : 'slim body';
      
      const identityPrompt = `Cinematic portrait of a ${formData.age || '24'} year old ${formData.ethnicity || 'person'} ${formData.gender || ''}, ${hairStr}, ${faceStr}, ${bodyStr}, outfit: ${formData.outfit || 'minimalist clothing'}, looking directly at camera, medium portrait studio shot, realistic lighting, 8k, highly detailed`;
      
      const generatedUrl = await generateAriaImage(null, identityPrompt, { ...formData, avatarImage: null } as CharacterProfile);
      
      if (generatedUrl) {
        setFormData(prev => ({ ...prev, avatarImage: generatedUrl }));
      } else {
        setForgeError("Neural matrix generation timed out. Please retry.");
      }
    } catch (err: any) {
      console.error(err);
      setForgeError("Error synthesizing avatar: " + err.message);
    } finally {
      setIsForging(false);
    }
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
      activeRunpodLoras: (prev.activeRunpodLoras || []).map(l => l.id === id ? { ...l, strength } : l)
    }));
  };

  const removeRunpodLora = (id: string) => {
    setFormData(prev => ({
      ...prev,
      activeRunpodLoras: (prev.activeRunpodLoras || []).filter(l => l.id !== id)
    }));
  };

  const handleNext = () => {
    if (currentStep === 3) {
      const ageNum = parseInt(formData.age as string, 10);
      if (isNaN(ageNum) || ageNum < 18) {
        setAgeError('Protocol requires age 18 or older.');
        return;
      }
    }
    if (currentStep < TOTAL_STEPS) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (isSaving || isForging) return;

    if (!formData.name?.trim()) {
      alert("Designation ID parameter required to initialize construct.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      await onSave(formData as CharacterProfile);
    } catch (err) {
      console.error("Failed to manifest companion core:", err);
      setIsSaving(false);
    }
  };

  const renderTagField = (field: 'hair' | 'face' | 'body', title: string, subtitle: string, placeholder: string) => (
    <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-lg mx-auto">
      <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
        <Box className="w-8 h-8 text-purple-400" />
      </div>
      <h2 className="text-3xl font-light text-white tracking-tight mb-3">{title}</h2>
      <p className="text-base text-zinc-400 mb-10 max-w-sm">{subtitle}</p>

      <div className="w-full space-y-4 text-left">
        <div className="flex flex-wrap gap-2 p-5 bg-white/[0.02] border border-white/10 rounded-3xl min-h-[120px] focus-within:border-purple-500/50 transition-all shadow-inner">
          {(formData[field] as string[] || []).map((tag, idx) => (
            <div key={`${field}-${idx}`} className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-sm font-bold rounded-xl animate-in zoom-in duration-200">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(field, tag)} className="hover:text-white transition-colors ml-1">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
          ))}
          <input
            type="text"
            value={tagInputs[field]}
            onChange={(e) => setTagInputs(prev => ({ ...prev, [field]: e.target.value }))}
            onKeyDown={(e) => handleTagKeyDown(e, field)}
            placeholder={(formData[field] as string[] || []).length === 0 ? placeholder : "Type and press Enter..."}
            className="flex-1 min-w-[200px] bg-transparent text-base text-white placeholder-zinc-600 focus:outline-none py-2"
          />
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
              <Fingerprint className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight mb-3">Biological Blueprint</h2>
            <p className="text-base text-zinc-400 mb-10 max-w-md">Determine the core gender presentation of your synthetic companion.</p>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-8">
              {['Female', 'Male', 'Non-Binary', 'Transgender'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, gender: opt.toLowerCase() })); setTimeout(handleNext, 300); }}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-center justify-center font-bold tracking-widest text-sm uppercase
                    ${formData.gender === opt.toLowerCase() 
                      ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/20'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="w-full max-w-lg space-y-2 text-left">
              <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Custom Input</label>
              <input
                type="text"
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
                placeholder="Or type a specific protocol..."
                className="w-full bg-white/[0.02] border border-white/10 focus:border-purple-500/50 rounded-2xl px-5 py-4 text-base text-white placeholder-zinc-600 outline-none transition-all"
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
              <Fingerprint className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight mb-3">Define Ethnic Origin</h2>
            <p className="text-base text-zinc-400 mb-10 max-w-md">Set the foundational ethnic background for generating physical traits.</p>
            
            <div className="flex flex-wrap justify-center gap-3 w-full max-w-xl mb-8">
              {['Asian', 'Latina', 'Caucasian', 'Black', 'Mixed', 'Middle Eastern'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, ethnicity: opt })); setTimeout(handleNext, 300); }}
                  className={`px-6 py-3 rounded-2xl border transition-all duration-300 font-bold tracking-widest text-sm uppercase
                    ${formData.ethnicity === opt
                      ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="w-full max-w-xl space-y-2 text-left">
              <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Custom Input</label>
              <input
                type="text"
                name="ethnicity"
                value={formData.ethnicity || ''}
                onChange={handleChange}
                placeholder="Or specify exactly..."
                className="w-full bg-white/[0.02] border border-white/10 focus:border-purple-500/50 rounded-2xl px-5 py-4 text-base text-white placeholder-zinc-600 outline-none transition-all"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight mb-3">Chronological Age</h2>
            <p className="text-base text-zinc-400 mb-10 max-w-sm">Enter the construct's operational age parameter. (Minimum 18)</p>
            
            <div className="w-full max-w-xs relative">
              <input
                type="number"
                name="age"
                value={formData.age || ''}
                onChange={handleChange}
                placeholder="24"
                className="w-full bg-black/40 border border-white/10 focus:border-purple-500 rounded-3xl px-8 py-8 text-5xl text-center text-white placeholder-zinc-700 outline-none transition-all font-light shadow-inner"
              />
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-500 font-mono tracking-widest text-sm uppercase">Years</span>
            </div>
            {ageError && <p className="text-red-400 text-sm uppercase tracking-widest mt-6 font-bold animate-pulse">{ageError}</p>}
          </div>
        );

      case 4:
        return renderTagField('hair', 'Hair Presentation', 'Describe style, length, color, and texture.', 'e.g., long wavy raven hair, curtain bangs...');
      
      case 5:
        return renderTagField('face', 'Facial Configuration', 'Detail eye color, shape, makeup, or distinguishing marks.', 'e.g., piercing blue eyes, freckles, soft jawline...');
      
      case 6:
        return renderTagField('body', 'Physique Architecture', 'Set the physical build and proportions.', 'e.g., petite, athletic core, hourglass...');

      case 7:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-xl mx-auto">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
              <Camera className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight mb-3">Apparel Initialization</h2>
            <p className="text-base text-zinc-400 mb-10 max-w-md">What is their default clothing protocol?</p>
            
            <textarea
              name="outfit"
              value={formData.outfit || ''}
              onChange={handleChange}
              placeholder="e.g., Minimalist black turtleneck, techwear jacket, silver necklace..."
              rows={4}
              className="w-full bg-white/[0.02] border border-white/10 focus:border-purple-500/50 rounded-3xl px-6 py-5 text-base text-white placeholder-zinc-600 outline-none transition-all resize-none shadow-inner custom-scrollbar"
            />
          </div>
        );

      case 8:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-xl mx-auto">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]">
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight mb-3">Cognitive Persona Matrix</h2>
            <p className="text-base text-zinc-400 mb-10 max-w-md">Describe their personality, tone, quirks, and how they should interact with you.</p>
            
            <textarea
              name="vibe"
              value={formData.vibe || ''}
              onChange={handleChange}
              placeholder="e.g., Highly intelligent, deeply sarcastic but caring, uses dry humor..."
              rows={5}
              className="w-full bg-purple-900/5 border border-purple-500/20 focus:border-purple-500/60 rounded-3xl px-6 py-5 text-base text-purple-100 placeholder-purple-900/40 outline-none transition-all resize-none shadow-inner custom-scrollbar"
            />
          </div>
        );

      case 9:
        return (
          <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-5xl mx-auto h-full">
            <div className="flex items-center gap-5 mb-10">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)] shrink-0">
                <Server className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-3xl font-light text-white tracking-tight mb-1">Synthesize Identity Anchor</h2>
                <p className="text-base text-zinc-400">Generate the visual matrix using your previous parameters, or inject a custom photo.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Image Matrix */}
              <div className="flex flex-col gap-4">
                <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500">Visual Core Preview</label>
                
                {formData.avatarImage ? (
                  <div className="relative w-full aspect-[3/4] md:aspect-square lg:aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-purple-500/30 group bg-black/50">
                    <img src={formData.avatarImage} alt="Construct Avatar" className="h-full w-full object-cover animate-fade-in" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-4">
                      <span className="text-purple-400 text-sm font-bold uppercase tracking-widest bg-zinc-900/80 px-6 py-3 rounded-full border border-purple-900/50 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Matrix Stable
                      </span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, avatarImage: null }))} className="text-red-400 text-sm font-bold uppercase tracking-widest bg-zinc-900/80 border border-zinc-700 px-8 py-3 rounded-full hover:bg-red-500/20 transition-colors">
                        Wipe & Re-Forge
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 aspect-[3/4] md:aspect-square lg:aspect-[3/4]">
                    <button 
                      type="button"
                      onClick={triggerIdentityGenerator}
                      disabled={isForging}
                      className="group border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 rounded-3xl p-8 transition-all flex flex-col items-center justify-center text-center disabled:opacity-50 h-full shadow-[inset_0_0_20px_rgba(147,51,234,0.05)] hover:shadow-[inset_0_0_40px_rgba(147,51,234,0.1)]"
                    >
                      {isForging ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-12 h-12 text-purple-400 mb-5 animate-spin" />
                          <span className="text-sm uppercase tracking-widest text-purple-400 font-bold animate-pulse mb-2">Running Neural Synthesis...</span>
                          <span className="text-xs text-purple-400/60 max-w-[250px]">Processing morphological and apparel parameters into visual matrix.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Sparkles className="w-12 h-12 text-purple-400 mb-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                          <span className="text-sm uppercase tracking-widest text-purple-400 font-bold mb-2">Auto-Forge AI Identity</span>
                          <span className="text-xs text-zinc-500">Uses all previous selections to generate.</span>
                        </div>
                      )}
                    </button>

                    <div className="relative group cursor-pointer border border-white/10 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/30 rounded-3xl p-5 transition-all flex flex-col items-center justify-center text-center h-28 shrink-0">
                       <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleImageProcess(f); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" />
                       <Upload className="w-6 h-6 text-zinc-500 mb-2 group-hover:text-white transition-colors" />
                       <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold group-hover:text-zinc-300">Manual Photo Override</span>
                    </div>
                  </div>
                )}
                {forgeError && <p className="text-red-400 text-xs uppercase mt-2 font-bold text-center">{forgeError}</p>}
              </div>

              {/* Models & LoRAs */}
              <div className="space-y-8 flex flex-col justify-center">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Base Generation Architecture</label>
                  <select
                    name="runpodModel"
                    value={formData.runpodModel}
                    onChange={handleChange}
                    className="w-full p-5 bg-white/[0.02] border border-white/10 rounded-2xl text-base text-zinc-300 outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
                  >
                    {RUNPOD_MODELS.map(m => (
                      <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-widest font-bold text-zinc-500 mb-3">Active LoRAs Chain</label>
                  
                  <div className="space-y-3 mb-5 max-h-[200px] overflow-y-auto custom-scrollbar pr-3">
                    {(formData.activeRunpodLoras || []).map(lora => (
                      <div key={lora.id} className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
                        <span className="text-xs font-mono text-zinc-300 flex-1 truncate">{lora.name}</span>
                        <input 
                          type="range" min="0" max="2" step="0.1" 
                          value={lora.strength} 
                          onChange={(e) => updateRunpodLoraStrength(lora.id, Number(e.target.value))}
                          className="w-24 accent-purple-500 h-1.5" 
                        />
                        <span className="text-xs font-mono text-zinc-500 w-8 text-right">{lora.strength.toFixed(1)}</span>
                        <button type="button" onClick={() => removeRunpodLora(lora.id)} className="text-zinc-600 hover:text-red-400 p-1.5 transition-colors">
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    ))}
                    {(formData.activeRunpodLoras || []).length === 0 && (
                      <div className="text-xs font-mono text-zinc-600 italic text-center py-6 border border-dashed border-white/5 rounded-2xl">No Matrix Injectors Linked</div>
                    )}
                  </div>

                  <select 
                    onChange={addRunpodLora}
                    value="none"
                    className="w-full p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl text-xs uppercase tracking-widest outline-none focus:border-purple-500/50 text-purple-300 shadow-inner cursor-pointer"
                  >
                    <option value="none" className="bg-zinc-900">+ Inject Sub-Matrix (LoRA)...</option>
                    {LORA_OPTIONS.filter(opt => !(formData.activeRunpodLoras || []).find(l => l.id === opt.id)).map(opt => (
                      <option key={opt.id} value={opt.id} className="bg-zinc-900">{opt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 10:
        return (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-lg mx-auto">
            <div className="relative mb-10">
               <div className="absolute -inset-6 bg-purple-600/20 rounded-full blur-2xl animate-pulse"></div>
               {formData.avatarImage ? (
                  <img src={formData.avatarImage} alt="Core Matrix" className="relative w-36 h-36 object-cover rounded-full border-[5px] border-purple-500 shadow-[0_0_40px_rgba(147,51,234,0.5)]" />
               ) : (
                  <div className="relative w-36 h-36 bg-purple-900 rounded-full border-[5px] border-purple-500 shadow-[0_0_40px_rgba(147,51,234,0.5)] flex items-center justify-center">
                    <Cpu className="w-14 h-14 text-white" />
                  </div>
               )}
            </div>
            
            <h2 className="text-4xl font-light text-white tracking-tight mb-3">Assign Designation ID</h2>
            <p className="text-base text-zinc-400 mb-10 max-w-sm">Give your newly forged construct a name to finalize the neural link.</p>
            
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Enter Name..."
              className="w-full bg-black/40 border border-purple-500/30 focus:border-purple-500 rounded-3xl px-8 py-6 text-3xl text-center text-white placeholder-zinc-700 outline-none transition-all font-semibold shadow-[inset_0_0_20px_rgba(147,51,234,0.1)]"
            />
          </div>
        );
      
      default: return null;
    }
  };

  const progressPercentage = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="relative w-full h-full bg-zinc-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
        
        {/* Full Page Cinematic Backgrounds */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px] z-0 pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] z-0 pointer-events-none" />

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col h-full">
            
            {/* Progress Matrix Header */}
            <div className="flex flex-col pt-10 px-8 shrink-0">
              <div className="flex items-center gap-3 mb-8">
                  <Cpu className="w-6 h-6 text-purple-400 animate-pulse" />
                  <span className="text-xs uppercase tracking-[0.4em] text-purple-400 font-bold">Synthesis Laboratory</span>
              </div>
              
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-700 to-purple-400 transition-all duration-500 ease-out relative"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 blur-sm"></div>
                </div>
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Phase {currentStep}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{Math.round(progressPercentage)}% Complete</span>
              </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar flex flex-col justify-center">
              {renderStep()}
            </div>

            {/* Footer Navigation */}
            <div className="flex flex-col-reverse sm:flex-row justify-between items-center p-8 shrink-0 border-t border-white/5 gap-4 sm:gap-0 mt-auto">
                
                {/* Abort/Cancel Button */}
                <button 
                  type="button" 
                  onClick={onClose} 
                  disabled={isSaving || isForging}
                  className="w-full sm:w-auto px-8 py-4 text-zinc-500 text-sm uppercase tracking-widest font-bold hover:text-zinc-300 hover:bg-white/5 rounded-2xl transition-all disabled:opacity-30 text-center"
                >
                  Cancel Creation
                </button>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  {currentStep > 1 && (
                    <button 
                      type="button" 
                      onClick={handleBack}
                      disabled={isSaving || isForging}
                      className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm uppercase tracking-widest font-bold transition-all disabled:opacity-30 flex items-center gap-2"
                    >
                      <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                  )}

                  {currentStep < TOTAL_STEPS ? (
                    <button 
                      type="button" 
                      onClick={handleNext}
                      className="px-10 py-4 rounded-2xl bg-white text-black text-sm uppercase tracking-widest font-bold hover:bg-zinc-200 transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center"
                    >
                      Next Phase <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      onClick={handleSubmit}
                      type="button" 
                      disabled={isSaving || isForging || !formData.name?.trim()}
                      className="px-10 py-4 bg-purple-600 text-white text-sm uppercase tracking-[0.2em] font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:bg-purple-500 transition-all active:scale-95 disabled:opacity-40 flex-1 sm:flex-none"
                    >
                      {isSaving ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Initializing Core...</>
                      ) : (
                        <><Sparkles className="w-5 h-5" /> Awaken Construct</>
                      )}
                    </button>
                  )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CompanionCreationModal;
