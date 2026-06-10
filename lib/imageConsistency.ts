/**
 * ARIA IMAGE CONSISTENCY ENGINE - ULTRA ENHANCED
 * Handles:
 * - Shot type classification (far/full body, medium/half body, closeup) - ENHANCED
 * - Back view prevention (head-facing deformity)
 * - Sexual position parsing (doggy, missionary, etc.) - MORE DETAILED
 * - POV action detection ("my cock in your mouth" → first-person)
 * - Context persistence across chat messages
 * - MOOD & AROUSAL TRACKING (0-10 scale)
 * - CONVERSATION CONTEXT TRACKING (prevents Qwen convergence)
 * - ANGLE-AWARE POSITIONING (more realistic depth perception)
 * - SHOT-SPECIFIC COMPOSITION (framing optimized per shot type)
 */

export type ShotType = 'full_body' | 'medium' | 'closeup';
export type CameraAngle = 'front' | 'back' | 'side' | 'pov_first_person';
export type SexualPosition = 
  | 'doggy' | 'missionary' | 'cowgirl' | 'reverse_cowgirl' 
  | 'spooning' | 'standing' | 'bending' | 'on_knees' 
  | 'on_back' | 'face_sitting' | 'none';

export type MoodIndicator = 'shy' | 'playful' | 'aroused' | 'dominant' | 'vulnerable' | 'teasing' | 'intimate' | 'aggressive';

export interface ImagePromptMetadata {
  shotType: ShotType;
  cameraAngle: CameraAngle;
  sexualPosition: SexualPosition;
  includeOtherPeople: boolean;
  isPOVAction: boolean;
  povActionDescription: string;
  shouldAvoidHeadDeformity: boolean;
  moodIndicator: MoodIndicator;
  arousalLevel: number; // 0-10
  compositionGuide: string; // NEW: Shot-specific framing
  depthCues: string; // NEW: Spatial positioning
  contextMemory: {
    lastShotType: ShotType | null;
    lastAngle: CameraAngle | null;
    lastPosition: SexualPosition | null;
    lastMood: MoodIndicator | null;
    lastArousal: number | null;
    previousVisuals: string[];
  };
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  turnCount: number;
  themes: string[];
  arc: string;
  imageStrengthFactor: number;
}

// ============================================================================
// SHOT COMPOSITION GUIDE - NEW & ENHANCED
// Provides detailed framing instructions per shot type to maximize realism
// ============================================================================

const SHOT_COMPOSITION: Record<ShotType, string> = {
  'full_body': `Full body composition: Head at top third of frame, feet near bottom, arms visible, torso centered, whole figure shows context and surrounding space, generous negative space around body`,
  
  'medium': `Medium shot composition: Waist/hips to head filling frame, shoulders width-appropriate, face clearly visible with room above head, intimate yet shows body language, depth of field slightly softer background`,
  
  'closeup': `Extreme closeup composition: Subject matter (face/lips/breasts/pussy) fills most of frame, tight crop to emphasize detail, minimal background visible, ultra-shallow depth of field (bokeh background), camera very close creating intimacy`
};

// ============================================================================
// DEPTH CUE GENERATION - NEW
// Adds spatial positioning language for better 3D perception
// ============================================================================

function generateDepthCues(shotType: ShotType, cameraAngle: CameraAngle, position: SexualPosition): string {
  const depthMap: Record<ShotType, Record<string, string>> = {
    'full_body': {
      'front': 'subject centered in frame with clear space around body, depth extends from foreground to background, room visible behind subject',
      'back': 'subject positioned in mid-frame facing away, depth receding, background visible behind body, clear spatial separation',
      'side': 'subject in profile with left and right depth, body occupies middle zone, foreground and background separated by depth of field',
      'pov_first_person': 'subject very close at bottom of frame, ground/surface visible below, extreme depth perception downward, immersive perspective'
    },
    'medium': {
      'front': 'subject fills frame but not tight, shallow depth of field, background slightly blurred, subject floating in frame',
      'back': 'subject positioned with space to edges, back detailed, subtle depth gradation, background bokeh blurred',
      'side': 'subject in side profile with profile depth, one side in sharp focus, opposite side fading into depth',
      'pov_first_person': 'subject extremely close almost filling frame, minimal background, ultra-shallow depth, almost overwhelming perspective'
    },
    'closeup': {
      'front': 'hyper-focused on specific feature, paper-thin depth of field, rest of face/body completely blurred, isolated subject',
      'back': 'back/rear area fills frame, skin texture paramount, everything behind blurred to pure bokeh, extreme isolation',
      'side': 'side profile feature dominant, side view emphasizing curves/shape, depth fade very aggressive, almost abstract',
      'pov_first_person': 'literally looking at subject at extreme close range, fills entire view, claustrophobic framing, immersive POV'
    }
  };

  return depthMap[shotType]?.[cameraAngle] || depthMap[shotType]['front'];
}

// ============================================================================
// MOOD DETECTION - NEW
// Analyzes user message for emotional/behavioral cues
// ============================================================================

function detectMoodIndicator(text: string): MoodIndicator {
  const lowerText = text.toLowerCase();

  if (/\b(shy|nervous|bashful|embarrassed|hesitant|reserved|coy|timid)\b/i.test(lowerText)) {
    return 'shy';
  }
  if (/\b(playful|tease|teasing|flirt|flirty|fun|joke|laughing|giggle|playfully)\b/i.test(lowerText)) {
    return 'playful';
  }
  if (/\b(horny|aroused|wet|dripping|needy|desperate|craving|wanting)\b/i.test(lowerText)) {
    return 'aroused';
  }
  if (/\b(dominant|control|commanding|power|take charge|submit|obey|commanding you)\b/i.test(lowerText)) {
    return 'dominant';
  }
  if (/\b(vulnerable|exposed|open|tender|emotional|weak|defenseless|need you)\b/i.test(lowerText)) {
    return 'vulnerable';
  }
  if (/\b(tease|teasing|seductive|seduce|seduce|tempt|tempting|edge)\b/i.test(lowerText)) {
    return 'teasing';
  }
  if (/\b(intimate|tender|gentle|soft|romantic|romantic|love|caring|cuddle)\b/i.test(lowerText)) {
    return 'intimate';
  }
  if (/\b(aggressive|rough|intense|wild|fuck|pound|aggressive|hard|rough|violent)\b/i.test(lowerText)) {
    return 'aggressive';
  }

  return 'playful';
}

// ============================================================================
// AROUSAL LEVEL CALCULATION - NEW
// ============================================================================

function calculateArousalLevel(text: string): number {
  const lowerText = text.toLowerCase();
  let arousal = 3;

  const escalationMap: Record<string, number> = {
    'breath|breathing': 1,
    'moan|moaning|gasp|gasping': 1.5,
    'cum|cumming|orgasm|climax': 2,
    'sweat|sweating|hot|heat': 0.5,
    'wet|dripping|juice|arousal': 1.5,
    'fuck|fucking|pound|pounding': 2,
    'horny|desperate|needy': 1.5,
    'cock|dick|pussy|penetrat': 1.5,
    'rough|aggressive|intense': 1,
  };

  for (const [triggers, increment] of Object.entries(escalationMap)) {
    const regex = new RegExp(`\\b(${triggers})\\b`, 'i');
    if (regex.test(lowerText)) {
      arousal += increment;
    }
  }

  return Math.min(10, arousal);
}

// ============================================================================
// CONTEXT MEMORY MANAGER - TRACKS VISUAL PROGRESSION
// ============================================================================

export class VisualContextMemory {
  private memory: {
    lastShotType: ShotType | null;
    lastAngle: CameraAngle | null;
    lastPosition: SexualPosition | null;
    lastMood: MoodIndicator | null;
    lastArousal: number | null;
    previousVisuals: string[];
    maxHistorySize: number;
  };

  constructor(maxHistorySize: number = 5) {
    this.memory = {
      lastShotType: null,
      lastAngle: null,
      lastPosition: null,
      lastMood: null,
      lastArousal: null,
      previousVisuals: [],
      maxHistorySize
    };
  }

  recordVisual(visual: {
    shotType: ShotType;
    angle: CameraAngle;
    position: SexualPosition;
    mood: MoodIndicator;
    arousal: number;
    description: string;
  }): void {
    this.memory.lastShotType = visual.shotType;
    this.memory.lastAngle = visual.angle;
    this.memory.lastPosition = visual.position;
    this.memory.lastMood = visual.mood;
    this.memory.lastArousal = visual.arousal;
    
    this.memory.previousVisuals.push(visual.description);
    if (this.memory.previousVisuals.length > this.memory.maxHistorySize) {
      this.memory.previousVisuals.shift();
    }
  }

  getMemory() {
    return {
      lastShotType: this.memory.lastShotType,
      lastAngle: this.memory.lastAngle,
      lastPosition: this.memory.lastPosition,
      lastMood: this.memory.lastMood,
      lastArousal: this.memory.lastArousal,
      previousVisuals: this.memory.previousVisuals
    };
  }

  clear(): void {
    this.memory.lastShotType = null;
    this.memory.lastAngle = null;
    this.memory.lastPosition = null;
    this.memory.lastMood = null;
    this.memory.lastArousal = null;
    this.memory.previousVisuals = [];
  }
}

// ============================================================================
// CONVERSATION CONTEXT EXTRACTION - NEW
// ============================================================================

export function extractConversationContext(
  messages: ConversationMessage[],
  turnCount: number
): ConversationContext {
  if (!messages || messages.length === 0) {
    return {
      messages: [],
      turnCount: 0,
      themes: [],
      arc: 'new',
      imageStrengthFactor: 0.7
    };
  }

  const allContent = messages.map(m => m.content.toLowerCase()).join(' ');

  const themeMap: Record<string, RegExp> = {
    'energetic': /energetic|dynamic|fast|rough|wild|aggressive|intense|pounding|fucking/i,
    'sensual': /sensual|gentle|soft|slow|tender|intimate|romantic|passionate|loving|caressing/i,
    'dominant': /dominant|control|power|command|obey|submit|commanding|forcing/i,
    'playful': /playful|tease|laugh|fun|joke|flirt|teasing|seductive/i,
    'emotional': /love|care|trust|vulnerable|emotion|feeling|connection|emotional|need/i,
    'spontaneous': /sudden|spontaneous|surprise|unexpected|quick|instant/i,
    'location_transition': /bathroom|bedroom|kitchen|outdoors|car|hotel|shower|couch|office/i,
    'escalating': /more|harder|deeper|faster|intense|aggressive|rough|wild/i,
    'cooling_down': /slow|soft|gentle|tender|calm|relax|rest|breathing|quiet/i,
  };

  const themes: string[] = [];
  for (const [theme, pattern] of Object.entries(themeMap)) {
    if (pattern.test(allContent)) themes.push(theme);
  }

  let arc = 'new';
  if (turnCount > 2) arc = 'evolving';
  if (turnCount > 4) arc = 'complex';
  if (turnCount > 7) arc = 'sustained_narrative';

  const imageStrengthFactor = Math.max(0.15, 0.8 - (turnCount * 0.2));

  return {
    messages,
    turnCount,
    themes,
    arc,
    imageStrengthFactor
  };
}

// ============================================================================
// ENHANCED SHOT TYPE DETECTION
// ============================================================================

function detectShotType(text: string): ShotType {
  const lowerText = text.toLowerCase();
  
  const positionMap: Record<string, ShotType> = {
    'doggy': 'medium', 'missionary': 'medium', 'cowgirl': 'medium',
    'reverse_cowgirl': 'medium', 'spooning': 'medium', 'standing': 'full_body',
    'bending': 'medium', 'on_knees': 'medium', 'face_sitting': 'closeup',
  };
  
  for (const [position, shotType] of Object.entries(positionMap)) {
    if (new RegExp(`\\b${position}\\b|\\b${position.replace('_', '\\s')}\\b`, 'i').test(lowerText)) {
      return shotType;
    }
  }
  
  if (/\b(full body|full-body|standing|walk|walk around|entire body|whole body|feet|legs visible|from head to toe|show me you|see you|look at you)\b/i.test(lowerText)) {
    return 'full_body';
  }
  
  if (/\b(medium|half body|half-body|waist up|torso|upper body|bust)\b/i.test(lowerText)) {
    return 'medium';
  }
  
  if (/\b(closeup|close-up|close up|zoom in|head shot|extreme close|macro|extreme closeup)\b/i.test(lowerText)) {
    if (!/\b(fuck|suck|lick|ride|penetrat)\b.*\b(you|me)\b/i.test(lowerText)) {
      return 'closeup';
    }
  }
  
  if (/\b(blowjob|bj|suck|sucking|cock in mouth|dick in mouth|face fucking|fuck my face|suck my cock|suck my dick)\b/i.test(lowerText)) {
    return 'closeup';
  }
  
  return 'medium';
}

// ============================================================================
// ENHANCED CAMERA ANGLE DETECTION
// ============================================================================

function detectCameraAngle(text: string): CameraAngle {
  const lowerText = text.toLowerCase();
  
  if (/\b(my cock|my dick|my pussy|my ass|i'm fucking|i'm pounding|i'm pummeling|from my perspective|pov|point of view|first person|my view)\b/i.test(lowerText)) {
    return 'pov_first_person';
  }
  
  if (/\b(back view|from behind|backside|rear view|ass view|back of|behind her|turn around|show your back|flip over|ass first)\b/i.test(lowerText)) {
    return 'back';
  }
  
  if (/\b(side view|side profile|from the side|sideways|profile)\b/i.test(lowerText)) {
    return 'side';
  }
  
  return 'front';
}

// ============================================================================
// ENHANCED SEXUAL POSITION DETECTION
// ============================================================================

function detectSexualPosition(text: string): SexualPosition {
  const lowerText = text.toLowerCase();
  
  const positionMap: Record<string, SexualPosition> = {
    'doggy': /\b(doggy|doggystyle|doggy style|from behind|on all fours|ass up|rear entry)\b/i,
    'missionary': /\b(missionary|on top of me|missionary style|on me|fucking me like that)\b/i,
    'cowgirl': /\b(cowgirl|riding|ride me|on top|bouncing)\b/i,
    'reverse_cowgirl': /\b(reverse cowgirl|reverse|facing away|back to you)\b/i,
    'spooning': /\b(spoon|spooning|from the side|side fucking|side by side)\b/i,
    'standing': /\b(standing|standing up|against wall|wall|standing fuck)\b/i,
    'bending': /\b(bend over|bending|bent over|bend me|bent)\b/i,
    'on_knees': /\b(on knees|kneeling|on her knees|knees)\b/i,
    'on_back': /\b(on her back|on back|lay on back|lying down|on my back)\b/i,
    'face_sitting': /\b(face sit|face sitting|sit on my face|face ride)\b/i,
  };
  
  for (const [position, regex] of Object.entries(positionMap)) {
    if (regex.test(lowerText)) return position as SexualPosition;
  }
  
  return 'none';
}

// ============================================================================
// ENHANCED POV ACTION DETECTION
// ============================================================================

function detectPOVAction(text: string): { isPOVAction: boolean; actionDescription: string } {
  const lowerText = text.toLowerCase();
  
  const povActionPatterns = [
    /my (\w+) (in|inside|at|into) (?:your|her|you)/i,
    /(i'm fucking|i'm pounding|i'm slamming|i'm thrusting|i'm filling|i'm stretching|i'm pummeling) (?:your|her|you)/i,
    /(?:your|her) mouth on my/i,
    /my cock (in your|in her|down your|down her|deep in)/i,
    /my dick (in your|in her|down your|down her)/i,
    /my pussy (on your|on her|against your|against her)/i,
    /(cum|coming|cumming) (in your|in her|on you|on her|deep)/i,
    /fuck (?:your|my|her|me)/i,
    /let me (fuck|pound|slam|thrust) (?:your|you)/i,
  ];
  
  for (const pattern of povActionPatterns) {
    const match = text.match(pattern);
    if (match) {
      const actionDescription = match[0];
      return { isPOVAction: true, actionDescription };
    }
  }
  
  return { isPOVAction: false, actionDescription: '' };
}

// ============================================================================
// ENHANCED GROUP DETECTION
// ============================================================================

function shouldIncludeOtherPeople(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  if (/\b(with|with someone|with a|with him|with her|with multiple|with others|threesome|group|together)\b/i.test(lowerText)) {
    if (/\b(alone|just you|just me|just us|only you|only me)\b/i.test(lowerText)) {
      return false;
    }
    return true;
  }
  
  return false;
}

// ============================================================================
// ENHANCED BACK VIEW SAFETY
// ============================================================================

function getBackViewHeadSafetyPrompt(cameraAngle: CameraAngle, shotType: ShotType): string {
  if (cameraAngle !== 'back') return '';
  
  const safetyInstructions = {
    full_body: 'Subject is facing away from camera, head looking over shoulder SLIGHTLY toward viewer (not full face), entire back and body visible.',
    medium: 'Subject is facing away from camera, head turned slightly so back of head is visible, upper back and shoulders prominent.',
    closeup: 'Extreme closeup of back/rear, subject\'s head is turned away, back of hair/neck visible, NO full face visible.'
  };
  
  return safetyInstructions[shotType];
}

// ============================================================================
// ULTRA-ENHANCED SEXUAL POSITION PROMPT BUILDER
// NOW WITH SHOT-SPECIFIC AND ANGLE-AWARE POSITIONING
// ============================================================================

function buildSexualPositionPrompt(
  position: SexualPosition,
  shotType: ShotType,
  isPOVAction: boolean,
  povActionDescription?: string,
  cameraAngle?: CameraAngle
): string {
  if (position === 'none') return '';
  
  // Ultra-detailed position prompts per shot type AND angle
  const basePrompts: Record<SexualPosition, Record<ShotType, Record<string, string>>> = {
    doggy: {
      full_body: {
        'front': 'On all fours facing camera angle, rear raised prominent, back arched, head looking back with pleasure, full body stretched lengthwise in frame, ass centered, legs straight behind',
        'back': 'On all fours, ass prominent and centered, body stretched away from camera, back muscles tense and visible, head turned looking back, full penetration view',
        'side': 'On all fours in profile, back arched showing full body curve, rear end prominent in side profile, body stretched sideways across frame, head tilted back in pleasure',
        'pov_first_person': 'Looking down at subject on all fours, ass and back filling view, back arched toward camera, camera positioned above looking down at back and rear'
      },
      medium: {
        'front': 'On all fours chest and ass prominent, eyes closed in pleasure, wet glistening skin, back arched, head at top of frame, torso visible, rear end in center',
        'back': 'Back view on all fours, ass front and center, back muscles visible, sweat glistening on skin, body bent with rear highest point',
        'side': 'Side profile on all fours, body curve from back to rear visible, one side in sharp focus, other fading, arched back in profile',
        'pov_first_person': 'Looking nearly straight down at rear area, ass prominent, back and glutes filling most of frame, extremely close perspective'
      },
      closeup: {
        'front': 'Extreme closeup of ass and rear, on knees/fours, penetration clearly visible, muscles tensed, sweat dripping, skin texture detailed',
        'back': 'Closeup of ass from behind, rear cheeks centered, penetration focused, muscle detail, glutes prominent, extreme isolation',
        'side': 'Closeup side profile of rear and body curve, one cheek visible, body arch detail, skin texture in sharp focus',
        'pov_first_person': 'Extreme closeup looking at rear almost filling entire frame, penetration point in focus, overwhelming POV perspective'
      }
    },
    missionary: {
      full_body: {
        'front': 'Lying on back full body exposed, legs spread wide, receiving penetration, full body visible writhing, both torso and legs in frame, face showing ecstasy',
        'back': 'Not applicable for missionary - using front angle',
        'side': 'Side view of missionary, bodies pressed together, body stack visible, both subjects clear in frame, intimate connection',
        'pov_first_person': 'Looking down at subject on back, full body beneath, legs spread around camera position, view from penetration perspective'
      },
      medium: {
        'front': 'Torso visible, chest heaving, breasts bouncing with motion, face showing pleasure expressions, shoulders and torso prominent, intimate framing',
        'back': 'From behind over subject, back of head, shoulders, back muscles visible, receiving position clear',
        'side': 'Bodies intertwined side view, torso stacked, intimate connection visible, side profile of pleasure on faces',
        'pov_first_person': 'Looking down at torso and face, subject's eyes meeting camera, chest bouncing toward view, intimate close framing'
      },
      closeup: {
        'front': 'Face extreme closeup, eyes rolled back, mouth open in ecstasy, sweat visible, facial expressions of deep pleasure, intimate connection',
        'back': 'Closeup of back of head, neck showing tension, hair flowing, shoulders tensing',
        'side': 'Face side profile in closeup, mouth open, expressions of pleasure, profile of pleasure clear',
        'pov_first_person': 'Subject's face extreme closeup looking directly at camera, eyes intense, mouth open, breathing heavy, immersive connection'
      }
    },
    cowgirl: {
      full_body: {
        'front': 'Straddling with full body visible, riding motion captured, full body bouncing, hands on thighs or torso, dynamic movement, face in ecstasy',
        'back': 'Straddling facing away, back visible, rear end prominent, full body motion evident, back muscles tensing',
        'side': 'Side profile of straddling motion, body curve evident, bouncing motion captured in profile, side body angle',
        'pov_first_person': 'Looking up at subject straddling, body above camera, full figure descending and rising, immersive from-below perspective'
      },
      medium: {
        'front': 'Seated on top, torso prominent, breasts bouncing with motion, focused expression, muscles engaged, hands visible gripping or on body',
        'back': 'Back view seated, rear end prominent, back and shoulders visible, motion evident in back muscles',
        'side': 'Side profile seated, body curve in profile, bouncing motion in profile, side body shape evident',
        'pov_first_person': 'Torso bouncing above camera, breasts or chest prominent, upper body motion captured, intimate from-below view'
      },
      closeup: {
        'front': 'Face closeup showing intensity and pleasure, eyes focused and lusty, biting lip, expressions of focused ecstasy',
        'back': 'Closeup of back and shoulder, muscles tensing, sweat glistening, back arch evident',
        'side': 'Face side profile in closeup, pleasure expression in profile, hair flowing',
        'pov_first_person': 'Face extreme closeup looking down intensely, overwhelming perspective, lustful gaze directly at camera'
      }
    },
    reverse_cowgirl: {
      full_body: {
        'front': 'Straddling facing away, back and ass visible prominent, full body motion, hands gripping thighs, body bouncing visible, rear end centered',
        'back': 'Straddling facing away viewed from behind, ass and back prominent central focus, full figure descending and rising away from camera',
        'side': 'Side profile straddling facing away, body curve and bounce captured, rear and back in profile motion',
        'pov_first_person': 'Rear directly above, ass descending toward camera, full rear view bouncing, immersive from-below perspective'
      },
      medium: {
        'front': 'Back and ass prominent, sweat glistening on skin, hands gripping thighs, muscles tensing, motion evident',
        'back': 'Rear end centered, back visible, glutes prominent, tensing with motion',
        'side': 'Back and rear in side profile, body curve evident, bounce motion in profile',
        'pov_first_person': 'Rear and glutes prominent directly above, ass descending, intimate from-below perspective'
      },
      closeup: {
        'front': 'Extreme closeup of ass and penetration, muscles contracting, intense engagement, glutes detailed',
        'back': 'Extreme closeup rear view, ass prominent, penetration clear, muscle detail visible',
        'side': 'Closeup side profile of rear, glute detail, engagement visible',
        'pov_first_person': 'Extreme closeup rear filling frame, almost overwhelming rear view perspective, penetration detail clear'
      }
    },
    spooning: {
      full_body: {
        'front': 'Side view, spooning position, back against front, full bodies visible stacked sideways, intimate embrace, both figures visible',
        'back': 'Viewed from rear, both backs visible, intertwined bodies, side-by-side visible from behind',
        'side': 'Pure side view perfect spoon position, both bodies perfectly aligned sideways, intimate stack clear',
        'pov_first_person': 'Perspective from above the spoon, both bodies visible stacked, intimate positioning clear'
      },
      medium: {
        'front': 'Bodies intertwined, back and side profile visible, intimate close contact, gentle motion evident, faces close together',
        'back': 'Both backs visible intertwined, side-by-side body contact, gentle intimacy',
        'side': 'Perfect side profile spoon, bodies stacked in profile, intimate connection in profile view',
        'pov_first_person': 'Close intimate perspective of spooning pair, above or integrated view'
      },
      closeup: {
        'front': 'Close side shot, faces together, kissing or near-kissing, moaning, deep emotional connection, tender expressions',
        'back': 'Closeup of back contact, skin touching skin, tender intimacy',
        'side': 'Face profiles closeup, emotions visible, kissing or near-kiss, side profile intimacy',
        'pov_first_person': 'Extreme intimacy perspective, faces very close to camera, emotional connection'
      }
    },
    standing: {
      full_body: {
        'front': 'Standing position full body visible, penetration active, wall or furniture support visible, dynamic thrusting motion, full figures visible',
        'back': 'Viewed from behind, back against wall/support, rear end prominent, standing motion',
        'side': 'Standing in profile, both bodies visible side profile, dynamic motion in profile',
        'pov_first_person': 'Looking up at subject standing, subject above camera, full figure descending'
      },
      medium: {
        'front': 'Torso prominent, hands gripping (walls/furniture), legs partially visible, pleasure on face, passionate motion',
        'back': 'Back prominent, muscles visible, hands gripping support, motion evident',
        'side': 'Side profile torso, motion evident, both bodies in profile contact',
        'pov_first_person': 'Torso descending toward camera, hands visible, intimate perspective'
      },
      closeup: {
        'front': 'Face and neck closeup, hair grabbed/flowing, breathing heavy, mouth open, intense energy, eyes intense',
        'back': 'Neck and back closeup, muscles visible, hair motion, tension',
        'side': 'Face side profile closeup, intense expression, profile passion',
        'pov_first_person': 'Face extreme closeup, overwhelming intimacy, eyes locked, breathing heavy'
      }
    },
    bending: {
      full_body: {
        'front': 'Bent over touching ground/furniture, full back visible, receiving penetration, power dynamic evident, rear prominent, body stretch visible',
        'back': 'Viewed from behind bent, rear end highest point, back stretched, power dynamic visible',
        'side': 'Side profile bent position, body curve from back to bend, side angle of stretch',
        'pov_first_person': 'Looking down at bent position, rear prominent, penetration perspective'
      },
      medium: {
        'front': 'Bent at waist, ass and back prominent, arch in back visible, pleasure expression on face, engagement evident',
        'back': 'Rear end centered prominent, back arch, muscles visible',
        'side': 'Side profile bent, body curve, arch evident in profile',
        'pov_first_person': 'Rear prominent from above, penetration view clear'
      },
      closeup: {
        'front': 'Rear closeup, hands gripping furniture/ground, glistening skin, stretched position clear, intensity visible',
        'back': 'Extreme closeup rear, glutes detailed, muscles visible, intensity',
        'side': 'Closeup side profile rear, body arch detail',
        'pov_first_person': 'Extreme closeup rear perspective, penetration detail clear'
      }
    },
    on_knees: {
      full_body: {
        'front': 'On knees full body framed, posture varies (bent, upright), full body visible, vulnerable yet strong, engaging position',
        'back': 'On knees from behind, back visible, posture evident, rear visible depending on bend',
        'side': 'On knees side profile, body curve visible in kneel position',
        'pov_first_person': 'Looking down at kneeling figure, body below camera perspective'
      },
      medium: {
        'front': 'Kneeling, torso visible, pleading expression, hands active, engaged, facial expressions clear',
        'back': 'Kneeling from behind, back visible, posture in kneeling position',
        'side': 'Kneeling in profile, side view of posture',
        'pov_first_person': 'Torso and face from above perspective, kneeling below'
      },
      closeup: {
        'front': 'Face and upper body, focus on pleasure, mouth open, passionate expression, kneeling position evident',
        'back': 'Back and shoulders closeup, kneeling posture',
        'side': 'Face profile, expression in profile, kneeling side view',
        'pov_first_person': 'Face extreme closeup from above, kneeling perspective'
      }
    },
    on_back: {
      full_body: {
        'front': 'Lying flat full body exposed, legs spread, full penetration view, vulnerable position, complete body visible',
        'back': 'Lying back viewed from above, full body beneath, legs spread toward camera',
        'side': 'Lying back side profile, body along horizontal, visible from side',
        'pov_first_person': 'Looking down at body on back, full figure beneath, penetration view'
      },
      medium: {
        'front': 'Chest and pelvis, breasts and genital area visible, pleasure face, responsive body, torso prominent',
        'back': 'Torso visible from above, chest and hips visible from behind',
        'side': 'Side view of lying back position, torso in profile',
        'pov_first_person': 'Torso and face from above, intimate perspective'
      },
      closeup: {
        'front': 'Face extreme closeup, rolling head, ecstasy expression, sweat, pure passion visible in expressions',
        'back': 'Closeup of upper body/chest from behind, pleasure visible',
        'side': 'Face profile closeup, pleasure evident in profile',
        'pov_first_person': 'Face extreme closeup from above, eyes locked, overwhelming intimacy'
      }
    },
    face_sitting: {
      full_body: {
        'front': 'Sitting on face, both bodies visible in full frame, dominant pleasure, receiver beneath, sitter above and prominent',
        'back': 'From behind, sitter's back visible, receiver beneath, dominant rear view',
        'side': 'Side profile face sitting, body positioning visible in profile',
        'pov_first_person': 'Looking up at sitter, face-level perspective from receiver position'
      },
      medium: {
        'front': 'Seated on face, posterior prominent, pleasure and satisfaction visible, dominant positioning, torso visible',
        'back': 'Back and rear prominent, sitter's body dominant, positioning clear',
        'side': 'Side profile seated, body positioning evident',
        'pov_first_person': 'Face-level perspective of sitter, close intimate view'
      },
      closeup: {
        'front': 'Extreme closeup of connection area, ecstasy, dominant pleasure visible in expressions and body contact',
        'back': 'Closeup rear of sitter, dominant positioning, intimate intensity',
        'side': 'Closeup side profile of positioning, intimate detail',
        'pov_first_person': 'Extreme closeup face-level perspective, overwhelming intimacy'
      }
    },
    none: {
      full_body: { 'front': '', 'back': '', 'side': '', 'pov_first_person': '' },
      medium: { 'front': '', 'back': '', 'side': '', 'pov_first_person': '' },
      closeup: { 'front': '', 'back': '', 'side': '', 'pov_first_person': '' }
    }
  };
  
  const angle = cameraAngle || 'front';
  let prompt = basePrompts[position]?.[shotType]?.[angle] || basePrompts[position]?.[shotType]?.['front'] || '';
  
  if (isPOVAction && povActionDescription) {
    prompt += `, ${povActionDescription} visible in scene, dynamic active motion, intense pleasure`;
  }
  
  return prompt;
}

// ============================================================================
// MASTER PROMPT BUILDER - ENHANCED
// ============================================================================

export function buildImageConsistencyPrompt(
  userMessage: string,
  characterName: string,
  visualMemory: VisualContextMemory | null,
  conversationContext?: ConversationContext
): ImagePromptMetadata {
  const shotType = detectShotType(userMessage);
  const cameraAngle = detectCameraAngle(userMessage);
  const sexualPosition = detectSexualPosition(userMessage);
  const { isPOVAction, actionDescription } = detectPOVAction(userMessage);
  const includeOtherPeople = shouldIncludeOtherPeople(userMessage);
  const moodIndicator = detectMoodIndicator(userMessage);
  const arousalLevel = calculateArousalLevel(userMessage);
  
  const contextMemory = visualMemory?.getMemory() || {
    lastShotType: null,
    lastAngle: null,
    lastPosition: null,
    lastMood: null,
    lastArousal: null,
    previousVisuals: []
  };

  // NEW: Generate composition and depth cues
  const compositionGuide = SHOT_COMPOSITION[shotType];
  const depthCues = generateDepthCues(shotType, cameraAngle, sexualPosition);

  return {
    shotType,
    cameraAngle,
    sexualPosition,
    includeOtherPeople,
    isPOVAction,
    povActionDescription: actionDescription,
    shouldAvoidHeadDeformity: cameraAngle === 'back',
    moodIndicator,
    arousalLevel,
    compositionGuide,
    depthCues,
    contextMemory
  };
}

// ============================================================================
// FINAL PROMPT ENRICHMENT - ULTRA ENHANCED
// ============================================================================

export function buildEnrichedImagePrompt(
  metadata: ImagePromptMetadata,
  basePrompt: string,
  characterDescription: string,
  conversationContext?: ConversationContext
): string {
  let enrichedPrompt = basePrompt;

  // 1. Add mood-based expression modifiers
  const moodExpressions: Record<MoodIndicator, string> = {
    'shy': 'bashful expression, eyes downcast, blushing cheeks, shy smile',
    'playful': 'playful expression, grin, teasing gaze, mischievous eyes',
    'aroused': 'lusty expression, half-lidded eyes, mouth slightly open, needy gaze',
    'dominant': 'confident expression, intense eye contact, commanding presence, smirk',
    'vulnerable': 'vulnerable expression, softer eyes, genuine emotion, trusting gaze',
    'teasing': 'seductive expression, smirk, eye contact, provocative gaze',
    'intimate': 'tender expression, soft eyes, genuine affection, romantic connection',
    'aggressive': 'intense expression, fierce eyes, determined jaw, raw passion'
  };
  
  enrichedPrompt += `, ${moodExpressions[metadata.moodIndicator]}`;

  // 2. Add arousal-level descriptors
  let arousalDescriptor = '';
  if (metadata.arousalLevel > 7) {
    arousalDescriptor = 'heavily aroused, flushed skin, rapid breathing, intense pleasure, glistening with fluids';
  } else if (metadata.arousalLevel > 5) {
    arousalDescriptor = 'aroused, flushed cheeks, quickened breathing, visible excitement, slight perspiration';
  } else if (metadata.arousalLevel > 3) {
    arousalDescriptor = 'slightly excited, subtle blush, engaged, attentive, comfortable';
  } else {
    arousalDescriptor = 'calm, composed, relaxed demeanor';
  }
  
  enrichedPrompt += `, ${arousalDescriptor}`;

  // 3. NEW: Add shot-specific composition guidance
  enrichedPrompt += `, ${metadata.compositionGuide}`;

  // 4. NEW: Add depth cues
  enrichedPrompt += `, ${metadata.depthCues}`;

  // 5. Add shot type specification (if no sexual position)
  if (metadata.sexualPosition === 'none') {
    const shotTypeSpecs = {
      full_body: 'Full body shot from head to toe, entire subject visible in frame',
      medium: 'Medium shot from waist up, torso and face prominently featured',
      closeup: 'Extreme closeup, face and upper body fill the frame'
    };
    enrichedPrompt += `, ${shotTypeSpecs[metadata.shotType]}`;
  }

  // 6. Add camera angle specifications
  if (metadata.cameraAngle === 'back') {
    enrichedPrompt += `, ${getBackViewHeadSafetyPrompt(metadata.cameraAngle, metadata.shotType)}`;
  } else if (metadata.cameraAngle === 'side') {
    enrichedPrompt += ', subject in side profile, camera positioned perpendicular to body';
  } else if (metadata.cameraAngle === 'pov_first_person') {
    enrichedPrompt += ', first-person perspective, looking down at subject, user\'s point of view';
  }

  // 7. Add sexual position with angle awareness
  if (metadata.sexualPosition !== 'none') {
    const positionPrompt = buildSexualPositionPrompt(
      metadata.sexualPosition,
      metadata.shotType,
      metadata.isPOVAction,
      metadata.povActionDescription,
      metadata.cameraAngle
    );
    enrichedPrompt += `, ${positionPrompt}`;

    if (!metadata.includeOtherPeople) {
      enrichedPrompt += ', solo, subject alone in frame, no other people visible';
    }
  }

  // 8. Add POV action enhancements
  if (metadata.isPOVAction && metadata.povActionDescription) {
    enrichedPrompt += `, ${metadata.povActionDescription} visible in scene, dynamic active motion, intense pleasure`;
  }

  // 9. Add context consistency markers
  if (metadata.contextMemory.lastShotType && metadata.contextMemory.lastShotType === metadata.shotType) {
    enrichedPrompt += ', maintaining visual consistency with previous image';
  }

  // 10. Add conversation context awareness
  if (conversationContext) {
    if (conversationContext.themes.includes('escalating')) {
      enrichedPrompt += ', progression showing escalation from previous image, more intense';
    }
    if (conversationContext.themes.includes('cooling_down')) {
      enrichedPrompt += ', calming down from previous intensity, more gentle';
    }
    if (conversationContext.themes.includes('location_transition')) {
      enrichedPrompt += ', new environment, fresh perspective';
    }
    
    if (conversationContext.imageStrengthFactor < 0.4) {
      enrichedPrompt += ', IMPORTANT: significantly different from reference image, creative freedom, high variation';
    }
  }

  // 11. Add quality/detail tokens
  enrichedPrompt += ', high quality, photorealistic, detailed, professional lighting, natural skin, accurate anatomy, cinema lighting';

  return enrichedPrompt;
}

// ============================================================================
// DEBUG HELPER
// ============================================================================

export function debugImagePromptAnalysis(
  userMessage: string,
  metadata: ImagePromptMetadata,
  conversationContext?: ConversationContext
): void {
  console.log('🎬 ULTRA-ENHANCED IMAGE CONSISTENCY DEBUG:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📸 Shot Type: ${metadata.shotType}`);
  console.log(`📷 Camera Angle: ${metadata.cameraAngle}`);
  console.log(`🍆 Sexual Position: ${metadata.sexualPosition}`);
  console.log(`😊 Mood: ${metadata.moodIndicator}`);
  console.log(`🔥 Arousal Level: ${metadata.arousalLevel}/10`);
  console.log(`\n🎭 COMPOSITION & DEPTH:`);
  console.log(`   ${metadata.compositionGuide}`);
  console.log(`   ${metadata.depthCues}`);
  console.log(`\n👥 Include Other People: ${metadata.includeOtherPeople}`);
  console.log(`👁️ POV Action: ${metadata.isPOVAction}`);
  console.log(`📝 Action Description: ${metadata.povActionDescription || 'N/A'}`);
  console.log(`⚠️ Avoid Head Deformity: ${metadata.shouldAvoidHeadDeformity}`);
  
  if (conversationContext) {
    console.log(`\n🧠 CONVERSATION CONTEXT:`);
    console.log(`   Turns: ${conversationContext.turnCount}`);
    console.log(`   Themes: ${conversationContext.themes.join(', ')}`);
    console.log(`   Arc: ${conversationContext.arc}`);
    console.log(`   Image Strength Factor: ${conversationContext.imageStrengthFactor}`);
  }
  
  console.log(`🧠 Context Memory:`, metadata.contextMemory);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
