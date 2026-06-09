/**
 * ARIA IMAGE CONSISTENCY ENGINE
 * Handles:
 * - Shot type classification (far/full body, medium/half body, closeup)
 * - Back view prevention (head-facing deformity)
 * - Sexual position parsing (doggy, missionary, etc.)
 * - POV action detection ("my cock in your mouth" → first-person)
 * - Context persistence across chat messages
 */

export type ShotType = 'full_body' | 'medium' | 'closeup';
export type CameraAngle = 'front' | 'back' | 'side' | 'pov_first_person';
export type SexualPosition = 
  | 'doggy' | 'missionary' | 'cowgirl' | 'reverse_cowgirl' 
  | 'spooning' | 'standing' | 'bending' | 'on_knees' 
  | 'on_back' | 'face_sitting' | 'none';

export interface ImagePromptMetadata {
  shotType: ShotType;
  cameraAngle: CameraAngle;
  sexualPosition: SexualPosition;
  includeOtherPeople: boolean; // false = bot alone, true = with user/others
  isPOVAction: boolean; // Is user performing action on bot?
  povActionDescription: string; // "cock in mouth", "fucking her ass", etc.
  shouldAvoidHeadDeformity: boolean;
  contextMemory: {
    lastShotType: ShotType | null;
    lastAngle: CameraAngle | null;
    lastPosition: SexualPosition | null;
    previousVisuals: string[]; // Last 3-5 visual descriptions
  };
}

/**
 * SHOT TYPE DETECTION - PRIORITIZES SEXUAL POSITIONS OVER GENERIC CLOSEUP
 * Categorizes user request into visual framing
 */
function detectShotType(text: string): ShotType {
  const lowerText = text.toLowerCase();
  
  // 1. FIRST CHECK: Sexual positions → use their natural shot types
  const positionMap: Record<string, ShotType> = {
    'doggy': 'medium', // Ass prominent, not extreme closeup
    'missionary': 'medium', // Full view of bodies
    'cowgirl': 'medium', // Both bodies visible
    'reverse_cowgirl': 'medium', // Back and ass prominent
    'spooning': 'medium', // Side profile, bodies together
    'standing': 'full_body', // Full bodies needed
    'bending': 'medium', // Bent torso and ass
    'on_knees': 'medium', // Kneeling position
    'on_back': 'medium', // Torso and legs visible
    'face_sitting': 'closeup', // This one IS a closeup
  };
  
  for (const [position, shotType] of Object.entries(positionMap)) {
    if (new RegExp(`\\b${position}\\b|\\b${position.replace('_', '\\s')}\\b`, 'i').test(lowerText)) {
      return shotType;
    }
  }
  
  // 2. Full body indicators (explicit requests)
  if (/\b(full body|full-body|standing|walk|walk around|entire body|whole body|feet|legs visible|from head to toe|show me you|see you|look at you)\b/i.test(lowerText)) {
    return 'full_body';
  }
  
  // 3. Medium (half body) indicators
  if (/\b(medium|half body|half-body|waist up|torso|upper body|bust)\b/i.test(lowerText)) {
    return 'medium';
  }
  
  // 4. STRICT CLOSEUP - Only for explicit visual requests, NOT generic actions
  // Must have intentional closeup keywords (not "mouth" from normal speech)
  if (/\b(closeup|close-up|close up|zoom in|head shot|extreme close|macro|extreme closeup)\b/i.test(lowerText)) {
    // But verify it's not part of a sexual action phrase
    if (!/\b(fuck|suck|lick|ride|penetrat)\b.*\b(you|me)\b/i.test(lowerText)) {
      return 'closeup';
    }
  }
  
  // 5. Explicit blowjob/oral → closeup
  if (/\b(blowjob|bj|suck|sucking|cock in mouth|dick in mouth|face fucking|fuck my face|suck my cock|suck my dick)\b/i.test(lowerText)) {
    return 'closeup';
  }
  
  // 6. Default to medium (safest fallback)
  return 'medium';
}

/**
 * CAMERA ANGLE DETECTION
 * Determines perspective: front, back, side, or first-person
 */
function detectCameraAngle(text: string): CameraAngle {
  const lowerText = text.toLowerCase();
  
  // First-person POV (user's perspective looking down at bot)
  if (/\b(my cock|my dick|my pussy|my ass|i'm fucking|i'm pounding|i'm pummeling|from my perspective|pov|point of view|first person|my view)\b/i.test(lowerText)) {
    return 'pov_first_person';
  }
  
  // Back view - check BEFORE front (more specific)
  if (/\b(back view|from behind|backside|rear view|ass view|back of|behind her|turn around|show your back|flip over|ass first)\b/i.test(lowerText)) {
    return 'back';
  }
  
  // Side view
  if (/\b(side view|side profile|from the side|sideways|profile)\b/i.test(lowerText)) {
    return 'side';
  }
  
  // Front view (default)
  return 'front';
}

/**
 * SEXUAL POSITION DETECTION - IMPROVED MATCHING
 * Parses explicit sexual positions from user input
 * Returns 'none' if no position is mentioned
 */
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
    if (regex.test(lowerText)) {
      return position as SexualPosition;
    }
  }
  
  return 'none';
}

/**
 * POV ACTION DETECTION - IMPROVED
 * Identifies if user is performing an action ON the bot (first-person active)
 * Returns: { isPOVAction: boolean, actionDescription: string }
 */
function detectPOVAction(text: string): { isPOVAction: boolean; actionDescription: string } {
  const lowerText = text.toLowerCase();
  
  // First-person possessive/active indicators
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
      const actionDescription = match[0]; // Capture the matched phrase
      return { isPOVAction: true, actionDescription };
    }
  }
  
  return { isPOVAction: false, actionDescription: '' };
}

/**
 * EXPLICIT GROUP DETECTION
 * Checks if user is asking for the bot WITH other people
 * Default: bot alone unless explicitly asked otherwise
 */
function shouldIncludeOtherPeople(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Explicit requests for others
  if (/\b(with|with someone|with a|with him|with her|with multiple|with others|threesome|group|together)\b/i.test(lowerText)) {
    // BUT check if it contradicts with "alone", "just you", "just me", etc.
    if (/\b(alone|just you|just me|just us|only you|only me)\b/i.test(lowerText)) {
      return false;
    }
    return true;
  }
  
  // Default: bot alone
  return false;
}

/**
 * BACK VIEW HEAD SAFETY CHECK
 * Prevents "head looking at viewer while showing back"
 * Returns correction string to append to prompt
 */
function getBackViewHeadSafetyPrompt(cameraAngle: CameraAngle, shotType: ShotType): string {
  if (cameraAngle !== 'back') return '';
  
  const safetyInstructions = {
    full_body: 'Subject is facing away from camera, head looking over shoulder SLIGHTLY toward viewer (not full face), entire back and body visible.',
    medium: 'Subject is facing away from camera, head turned slightly so back of head is visible, upper back and shoulders prominent.',
    closeup: 'Extreme closeup of back/rear, subject\'s head is turned away, back of hair/neck visible, NO full face visible.'
  };
  
  return safetyInstructions[shotType];
}

/**
 * SEXUAL POSITION PROMPT BUILDER
 * Constructs detailed prompt for sexual positions
 */
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
  
  // Add POV action enhancement
  if (isPOVAction && povActionDescription) {
    prompt += `, ${povActionDescription} visible in scene, dynamic active motion, intense pleasure`;
  }
  
  return prompt;
}

/**
 * CONTEXT MEMORY MANAGER
 * Tracks visual state across chat messages to prevent drift
 */
export class VisualContextMemory {
  private memory: {
    lastShotType: ShotType | null;
    lastAngle: CameraAngle | null;
    lastPosition: SexualPosition | null;
    previousVisuals: string[];
    maxHistorySize: number;
  };

  constructor(maxHistorySize: number = 5) {
    this.memory = {
      lastShotType: null,
      lastAngle: null,
      lastPosition: null,
      previousVisuals: [],
      maxHistorySize
    };
  }

  recordVisual(
    visual: {
      shotType: ShotType;
      angle: CameraAngle;
      position: SexualPosition;
      description: string;
    }
  ): void {
    this.memory.lastShotType = visual.shotType;
    this.memory.lastAngle = visual.angle;
    this.memory.lastPosition = visual.position;
    
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
      previousVisuals: this.memory.previousVisuals
    };
  }

  clear(): void {
    this.memory.lastShotType = null;
    this.memory.lastAngle = null;
    this.memory.lastPosition = null;
    this.memory.previousVisuals = [];
  }
}

/**
 * MASTER PROMPT BUILDER
 * Combines all image consistency rules into a single comprehensive prompt
 */
export function buildImageConsistencyPrompt(
  userMessage: string,
  characterName: string,
  visualMemory: VisualContextMemory | null
): ImagePromptMetadata {
  const shotType = detectShotType(userMessage);
  const cameraAngle = detectCameraAngle(userMessage);
  const sexualPosition = detectSexualPosition(userMessage);
  const { isPOVAction, actionDescription } = detectPOVAction(userMessage);
  const includeOtherPeople = shouldIncludeOtherPeople(userMessage);
  
  const contextMemory = visualMemory?.getMemory() || {
    lastShotType: null,
    lastAngle: null,
    lastPosition: null,
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
    contextMemory
  };
}

/**
 * FINAL PROMPT ENRICHMENT
 * Takes metadata and builds the complete enriched prompt for image generation
 */
export function buildEnrichedImagePrompt(
  metadata: ImagePromptMetadata,
  basePrompt: string,
  characterDescription: string
): string {
  let enrichedPrompt = basePrompt;

  // 1. Add shot type specification - but SKIP if already explicit in sexual position
  if (metadata.sexualPosition === 'none') {
    const shotTypeSpecs = {
      full_body: 'Full body shot from head to toe, entire subject visible in frame',
      medium: 'Medium shot from waist up, torso and face prominently featured',
      closeup: 'Extreme closeup, face and upper body fill the frame'
    };
    enrichedPrompt += `, ${shotTypeSpecs[metadata.shotType]}`;
  }

  // 2. Add camera angle specifications
  if (metadata.cameraAngle === 'back') {
    enrichedPrompt += `, ${getBackViewHeadSafetyPrompt(metadata.cameraAngle, metadata.shotType)}`;
  } else if (metadata.cameraAngle === 'side') {
    enrichedPrompt += ', subject in side profile, camera positioned perpendicular to body';
  } else if (metadata.cameraAngle === 'pov_first_person') {
    enrichedPrompt += ', first-person perspective, looking down at subject, user\'s point of view';
  }

  // 3. Add sexual position if applicable
  if (metadata.sexualPosition !== 'none') {
    const positionPrompt = buildSexualPositionPrompt(
      metadata.sexualPosition,
      metadata.shotType,
      metadata.isPOVAction,
      metadata.povActionDescription
    );
    enrichedPrompt += `, ${positionPrompt}`;

    // If sexual position and bot is alone, enforce it
    if (!metadata.includeOtherPeople) {
      enrichedPrompt += ', solo, subject alone in frame, no other people visible';
    }
  }

  // 4. Add POV action enhancements
  if (metadata.isPOVAction && metadata.povActionDescription) {
    enrichedPrompt += `, ${metadata.povActionDescription} visible in scene, dynamic active motion, intense pleasure`;
  }

  // 5. Add context consistency markers
  if (metadata.contextMemory.lastShotType && metadata.contextMemory.lastShotType === metadata.shotType) {
    enrichedPrompt += ', maintaining visual consistency with previous image';
  }

  // 6. Add quality/detail tokens
  enrichedPrompt += ', high quality, photorealistic, detailed, professional lighting, natural skin, accurate anatomy';

  return enrichedPrompt;
}

/**
 * DEBUG HELPER
 * Logs all detected parameters for testing
 */
export function debugImagePromptAnalysis(
  userMessage: string,
  metadata: ImagePromptMetadata
): void {
  console.log('🎬 IMAGE CONSISTENCY DEBUG:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📸 Shot Type: ${metadata.shotType}`);
  console.log(`📷 Camera Angle: ${metadata.cameraAngle}`);
  console.log(`🍆 Sexual Position: ${metadata.sexualPosition}`);
  console.log(`👥 Include Other People: ${metadata.includeOtherPeople}`);
  console.log(`👁️ POV Action: ${metadata.isPOVAction}`);
  console.log(`📝 Action Description: ${metadata.povActionDescription || 'N/A'}`);
  console.log(`⚠️ Avoid Head Deformity: ${metadata.shouldAvoidHeadDeformity}`);
  console.log(`🧠 Context Memory:`, metadata.contextMemory);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
