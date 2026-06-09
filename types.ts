import { ShotType, CameraAngle, SexualPosition } from './lib/imageConsistency';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text?: string;
  speechText?: string;
  imageUrl?: string;
  videoUrl?: string;
  isImageLoading?: boolean;
  isVideoLoading?: boolean;
  motionStatus?: 'idle' | 'synthesizing' | 'completed' | 'failed';
  timestamp: number;
  
  // ✅ NEW: Emotional state attached to each bot message
  botMood?: BotMood;
  emotionalState?: EmotionalState;
  emotionalIntensity?: number; // 0-10
}

/**
 * CHARACTER PROFILE - TAGGING SYSTEM UPDATE
 */
export interface CharacterProfile {
  name: string;
  age: string;
  gender: string;
  hair: string[];
  face: string[];
  body: string[];
  vibe: string;
  outfit: string;
  ethnicity: string;
  negativePrompt: string;

  avatarImage?: string | null;
  runpodModel?: string;
  activeRunpodLoras?: { id: string; name: string; strength: number }[];
  favoriteLoras?: string[];
  voiceId?: string;
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

/**
 * EMOTIONAL STATE MACHINE
 * Tracks the bot's emotional progression
 */
export type EmotionalState = 'curious' | 'playful' | 'seductive' | 'desperate' | 'satisfied' | 'vulnerable' | 'conflicted';

export interface CharacterMemory {
  // Short-term (this session)
  recentEvents: Array<{
    action: string;
    timestamp: number;
    userReaction: 'positive' | 'neutral' | 'negative';
  }>;

  // Medium-term (discovered preferences)
  thingsUserLikes: string[]; // e.g., "loves when I wear stockings"
  thingsUserDislikes: string[];
  userKinks: string[]; // Discovered from behavior
  userFavoritePositions: string[];

  // Long-term (relationship milestones)
  relationshipMilestones: {
    firstMeeting: number;
    firstKiss?: number;
    firstTime?: number;
  };

  // Bot's learned preferences
  botPreferences: {
    favoriteThingsAboutUser: string[]; // "I love how possessive you are"
    dominanceStyle: 'submissive' | 'switch' | 'dominant';
    communicationStyle: 'dirty' | 'romantic' | 'playful' | 'mix';
    initiateLikelihood: number; // 0-100, how often bot starts actions
  };
}

/**
 * BOT MOOD SYSTEM
 * Represents current mood/energy levels
 */
export interface BotMood {
  energy: number; // 0-100 (tired to energetic)
  confidence: number; // 0-100 (insecure to cocky)
  horniness: number; // 0-100 (separate from arousal during sex)
  affection: number; // 0-100 (cold to needy)

  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  daysSinceSex: number;
  stressLevel: number; // 0-100
  recentConflict: boolean;
  minutesSinceLastMessage: number;
}

/**
 * ENHANCED VISUAL STATE
 * All emotional, memory, and autonomy tracking
 */
export interface VisualState {
  lastVisualDescription: string;
  clothing: string;
  location: string;
  pose: string;
  fluids: string[];
  arousalLevel: number; // 0-10
  timestamp: number;

  // ✅ IMAGE CONSISTENCY FIELDS
  shotType?: ShotType;
  cameraAngle?: CameraAngle;
  sexualPosition?: SexualPosition;

  // ✅ EMOTIONAL LAYER
  emotionalState: EmotionalState;
  emotionalIntensity: number; // 0-10
  emotionalHistory: Array<{
    state: EmotionalState;
    timestamp: number;
    duration: number;
  }>;

  // ✅ RELATIONSHIP LAYER
  intimacyLevel: number; // 0-100
  trustLevel: number; // 0-100
  dominanceBalance: number; // 0-100 (0=user dominant, 50=equal, 100=bot dominant)
  daysSinceSex: number;
  relationshipDuration: number; // milliseconds since first message

  // ✅ MEMORY LAYER
  characterMemory: CharacterMemory;

  // ✅ MOOD LAYER
  botMood: BotMood;

  // ✅ AUTONOMY LAYER
  shouldBotInitiate: boolean; // True if bot can start next message
  initiateReason?: string; // Why bot wants to message (e.g., "missed you", "desperate", "has secret")
  lastUserMessageTime: number;
  messageCount: number; // Total messages in session
}

export interface Conversation {
  id: string;
  botId?: string;
  title: string;
  messages: Message[];
  timestamp: number;
  visualState?: VisualState;
}

/**
 * RunPod Async Orchestration
 */
export interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: any;
  error?: string;
}
