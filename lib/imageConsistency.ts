/**
 * ARIA IMAGE CONSISTENCY ENGINE - ENHANCED WITH CONTEXT TRACKING
 * Handles:
 * - Shot type classification (far/full body, medium/half body, closeup)
 * - Back view prevention (head-facing deformity)
 * - Sexual position parsing (doggy, missionary, etc.)
 * - POV action detection ("my cock in your mouth" → first-person)
 * - Context persistence across chat messages
 * - MOOD & AROUSAL TRACKING (0-10 scale)
 * - CONVERSATION CONTEXT TRACKING (prevents Qwen convergence)
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

/**
 * MOOD DETECTION - NEW
 * Analyzes user message for emotional/behavioral cues
 */
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

  return 'playful'; // default mood
}

/**
 * AROUSAL LEVEL CALCULATION - NEW
 * Estimates arousal from language cues (0-10 scale)
 */
function calculateArousalLevel(text: string): number {
  const lowerText = text.toLowerCase();
  let arousal = 3; // Base level

  // Arousal escalation triggers
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

/**
 * CONTEXT MEMORY MANAGER - TRACKS VISUAL PROGRESSION
 * Prevents image convergence by tracking what's been generated
 */
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

/**
 * CONVERSATION CONTEXT EXTRACTION - NEW
 * Analyzes full conversation to prevent Qwen image convergence
 */
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

  // Extract semantic themes
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

  // Determine conversation arc
  let arc = 'new';
  if (turnCount > 2) arc = 'evolving';
  if (turnCount > 4) arc = 'complex';
  if (turnCount > 7) arc = 'sustained_narrative';

  // Calculate image strength factor (prevents convergence)
  // After 3 turns, reduce image strength significantly
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
// EXISTING SHOT TYPE DETECTION (PRESERVED)
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
// EXISTING CAMERA ANGLE DETECTION (PRESERVED)
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
// EXISTING SEXUAL POSITION DETECTION (PRESERVED)
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
// EXISTING POV ACTION DETECTION (PRESERVED)
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
// EXISTING GROUP DETECTION (PRESERVED)
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
// EXISTING BACK VIEW SAFETY (PRESERVED)
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
// EXISTING SEXUAL POSITION PROMPT BUILDER (PRESERVED)
// ============================================================================

function buildSexualPositionPrompt(
  position: SexualPosition,
  shotType: ShotType,
  isPOVAction: boolean,
  povActionDescription?: string
): string {
  if (position === 'none') return '';
  
  const basePrompts: Record<SexualPosition, Record<ShotType, string>> = {
    doggy: {
      full_body: 'On all fours, rear facing camera, body stretched out, penetration visible, full body in frame',
      medium: 'On all fours, chest and ass prominent, eyes closed in pleasure, wet glistening skin, back arched',
      closeup: 'Close shot of ass, on knees, penetration focused, muscles tensed, sweat dripping'
    },
    missionary: {
      full_body: 'Lying on back, legs spread, receiving penetration, full body writhing, both bodies visible',
      medium: 'Torso visible, chest heaving, breasts bouncing, pleasure on face, intimate close contact',
      closeup: 'Face extremely close, eyes rolled back, mouth open in ecstasy, sweat visible, deep passion'
    },
    cowgirl: {
      full_body: 'Straddling, riding motion captured, full body bouncing, hands on thighs, dynamic movement',
      medium: 'Seated on top, torso prominent, breasts bouncing, focused expression, muscles engaged',
      closeup: 'Face close, biting lip, eyes intense, sweat dripping, expressions of pleasure'
    },
    reverse_cowgirl: {
      full_body: 'Straddling facing away, back and ass visible, full body motion, muscles flexing',
      medium: 'Back and ass prominent, sweat glistening, hands gripping, muscles tensing',
      closeup: 'Close shot of ass and penetration, muscles contracting, intense engagement'
    },
    spooning: {
      full_body: 'Side view, spooning position, back against front, full bodies visible, intimate embrace',
      medium: 'Bodies intertwined, back and side profile visible, intimate close contact, gentle motion',
      closeup: 'Close side shot, kissing, moaning, deep emotional connection, tender moment'
    },
    standing: {
      full_body: 'Standing position, full body visible, penetration active, wall or furniture support, dynamic',
      medium: 'Torso prominent, hands gripping, legs partially visible, pleasure on face, passionate',
      closeup: 'Face and neck, hair grabbed, breathing heavy, mouth open, intense energy'
    },
    bending: {
      full_body: 'Bent over, touching ground/furniture, full back visible, receiving penetration, power dynamic',
      medium: 'Bent at waist, ass and back prominent, arch in back, pleasure expression, engaged',
      closeup: 'Rear closeup, hands gripping furniture, glistening skin, stretched position, intensity'
    },
    on_knees: {
      full_body: 'On knees, posture varies (bent, upright), full body framed, vulnerable yet strong',
      medium: 'Kneeling, torso visible, pleading expression, hands active, engaged',
      closeup: 'Face and upper body, focus on pleasure, mouth open, passionate expression'
    },
    on_back: {
      full_body: 'Lying flat, full body exposed, legs spread, full penetration view, vulnerable position',
      medium: 'Chest and pelvis, breasts and pubic area visible, pleasure face, responsive',
      closeup: 'Face extreme closeup, rolling head, ecstasy expression, sweat, pure passion'
    },
    face_sitting: {
      full_body: 'Sitting on face, both bodies visible in full frame, dominant pleasure',
      medium: 'Seated on face, posterior prominent, pleasure and satisfaction visible, dominant',
      closeup: 'Extreme closeup of connection, ecstasy, dominant pleasure, intimate intensity'
    },
    none: ''
  };
  
  let prompt = basePrompts[position][shotType] || '';
  
  if (isPOVAction && povActionDescription) {
    prompt += `, ${povActionDescription} visible in scene, dynamic active motion, intense pleasure`;
  }
  
  return prompt;
}

// ============================================================================
// MASTER PROMPT BUILDER - ENHANCED WITH MOOD & AROUSAL & CONTEXT
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
    contextMemory
  };
}

// ============================================================================
// FINAL PROMPT ENRICHMENT - ENHANCED WITH MOOD & AROUSAL & CONTEXT
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
    arousalDescriptor = 'heavily aroused, flushed skin, rapid breathing, intense pleasure';
  } else if (metadata.arousalLevel > 5) {
    arousalDescriptor = 'aroused, flushed cheeks, quickened breathing, visible excitement';
  } else if (metadata.arousalLevel > 3) {
    arousalDescriptor = 'slightly excited, subtle blush, engaged, attentive';
  } else {
    arousalDescriptor = 'calm, composed, relaxed demeanor';
  }
  
  enrichedPrompt += `, ${arousalDescriptor}`;

  // 3. Add shot type specification
  if (metadata.sexualPosition === 'none') {
    const shotTypeSpecs = {
      full_body: 'Full body shot from head to toe, entire subject visible in frame',
      medium: 'Medium shot from waist up, torso and face prominently featured',
      closeup: 'Extreme closeup, face and upper body fill the frame'
    };
    enrichedPrompt += `, ${shotTypeSpecs[metadata.shotType]}`;
  }

  // 4. Add camera angle specifications
  if (metadata.cameraAngle === 'back') {
    enrichedPrompt += `, ${getBackViewHeadSafetyPrompt(metadata.cameraAngle, metadata.shotType)}`;
  } else if (metadata.cameraAngle === 'side') {
    enrichedPrompt += ', subject in side profile, camera positioned perpendicular to body';
  } else if (metadata.cameraAngle === 'pov_first_person') {
    enrichedPrompt += ', first-person perspective, looking down at subject, user\'s point of view';
  }

  // 5. Add sexual position if applicable
  if (metadata.sexualPosition !== 'none') {
    const positionPrompt = buildSexualPositionPrompt(
      metadata.sexualPosition,
      metadata.shotType,
      metadata.isPOVAction,
      metadata.povActionDescription
    );
    enrichedPrompt += `, ${positionPrompt}`;

    if (!metadata.includeOtherPeople) {
      enrichedPrompt += ', solo, subject alone in frame, no other people visible';
    }
  }

  // 6. Add POV action enhancements
  if (metadata.isPOVAction && metadata.povActionDescription) {
    enrichedPrompt += `, ${metadata.povActionDescription} visible in scene, dynamic active motion, intense pleasure`;
  }

  // 7. Add context consistency markers
  if (metadata.contextMemory.lastShotType && metadata.contextMemory.lastShotType === metadata.shotType) {
    enrichedPrompt += ', maintaining visual consistency with previous image';
  }

  // 8. Add conversation context awareness (prevents convergence)
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
    
    // Add image strength factor metadata (for RunPod to use)
    if (conversationContext.imageStrengthFactor < 0.4) {
      enrichedPrompt += ', IMPORTANT: significantly different from reference image, creative freedom, high variation';
    }
  }

  // 9. Add quality/detail tokens
  enrichedPrompt += ', high quality, photorealistic, detailed, professional lighting, natural skin, accurate anatomy';

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
  console.log('🎬 IMAGE CONSISTENCY DEBUG:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📸 Shot Type: ${metadata.shotType}`);
  console.log(`📷 Camera Angle: ${metadata.cameraAngle}`);
  console.log(`🍆 Sexual Position: ${metadata.sexualPosition}`);
  console.log(`😊 Mood: ${metadata.moodIndicator}`);
  console.log(`🔥 Arousal Level: ${metadata.arousalLevel}/10`);
  console.log(`👥 Include Other People: ${metadata.includeOtherPeople}`);
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
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
