export interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text?: string;
  speechText?: string; // ✅ ADDED: Holds the hidden TTS tags for audio generation
  imageUrl?: string;
  videoUrl?: string; // Final normalized video path from storage
  isImageLoading?: boolean;
  isVideoLoading?: boolean; // UI placeholder state during generation
  motionStatus?: 'idle' | 'synthesizing' | 'completed' | 'failed'; // State machine for video jobs
  timestamp: number;
}

/**
 * CHARACTER PROFILE - TAGGING SYSTEM UPDATE
 * Attributes like hair, face, and body are now arrays to support 
 * multi-tag morphological consistency and prevent "vibe bleed".
 */
export interface CharacterProfile {
  name: string;
  age: string;
  gender: string; 
  hair: string[];      // Changed to array for multi-tagging (e.g., ["long", "wavy", "blonde"])
  face: string[];      // Changed to array (e.g., ["amber eyes", "freckles", "heavy eyeliner"])
  body: string[];      // Changed to array (e.g., ["athletic", "tall", "tanned"])
  vibe: string;        // Personality matrix (Chat only)
  outfit: string;      // Persistent clothing state (String/TextArea as it's dynamic)
  ethnicity: string;   // Single select base morphology
  negativePrompt: string;
  
  // ✅ NEW FIELDS FOR IDENTITY DROPS & LORAS
  avatarImage?: string | null;
  runpodModel?: string;
  activeRunpodLoras?: { id: string; name: string; strength: number }[];
  favoriteLoras?: string[];
  voiceId?: string;    // ✅ TTS Voice Selection
}

export interface UserData {
  uid: string; 
  character: CharacterProfile | null;
  freeImagesUsed: number;
  subscriptionStatus: 'free' | 'active' | 'inactive';
}

export interface Bot {
  id: string;
  name: string;
  personality: string; 
  avatarColor: string; 
  characterProfile: CharacterProfile; 
  lastMessagePreview?: string; 
  lastActivity?: number; 
}

// ✅ NEW: Visual memory object to prevent context drift
export interface VisualState {
  lastVisualDescription: string;
  clothing: string;
  location: string;
  pose: string;
  fluids: string[]; // e.g., "sweaty", "tears", etc.
  arousalLevel: number; // 0-10
  timestamp: number;
}

export interface Conversation {
  id: string;
  botId?: string; 
  title: string;
  messages: Message[];
  timestamp: number; 
  visualState?: VisualState; // ✅ Attached to conversation to maintain persistent session state
}

/**
 * RunPod Async Orchestration
 * Used for polling the status of video synthesis jobs.
 */
export interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: any; // Supports both string (b64) and object (JSON) responses
  error?: string;
}
