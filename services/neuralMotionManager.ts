import { CharacterProfile } from "../types";

/**
 * NEURAL MOTION MANAGER (V7 - Refined Lighting & Emotions)
 */

const PACKETS = {
  // Always active to prevent basic AI artifacts
  CORE_NEG: ["blurry", "low quality", "distorted", "text", "watermark", "flickering", "lowres", "bad anatomy", "overexposed", "underexposed"],

  // ... [Previous Camera/Motion/Anatomy Packets remain the same] ...
  
  // --- CAMERA DYNAMICS ---
  ZOOM_IN: {
    pos: ["cinematic zoom in", "dolly zoom", "increasing detail", "narrowing field of view", "3d depth"],
    neg: ["zooming out", "fisheye distortion", "flat perspective"]
  },
  ZOOM_OUT: {
    pos: ["pull back shot", "zooming out", "expanding environment", "wide angle perspective"],
    neg: ["zooming in", "tunnel vision", "cropping"]
  },

  // --- MOTION STYLES ---
  STATIONARY: {
    pos: ["subtle cinematic motion", "living portrait", "natural breathing", "soft eye blinks", "gentle hair sway"],
    neg: ["static image", "frozen atmosphere", "completely still", "camera shake"]
  },
  DYNAMIC: {
    pos: ["dynamic action", "motion blur", "high kinetic energy", "fluid physical transition", "momentum", "realistic velocity"],
    neg: ["stiff movement", "robotic motion", "frame skipping", "linear movement"]
  },

  // --- ANATOMICAL PACKETS ---
  HANDS_FEET: {
    pos: ["highly detailed fingers", "individual toes", "realistic joints", "anatomically correct", "hand articulation"],
    neg: ["extra fingers", "fused limbs", "missing digits", "melted hands"]
  },
  
  CURVES_PHYSICS: {
    pos: ["soft tissue physics", "natural jiggle physics", "realistic bounce", "momentum-based movement", "skin elasticity", "subsurface scattering"],
    neg: ["plastic texture", "static body", "stiff movement", "frozen physics", "stony texture", "rigid breasts"]
  },

  // --- SOCIAL ---
  MULTI_PERSON: {
    pos: ["two distinct people", "separate silhouettes", "interaction detail"],
    neg: ["merged bodies", "fused limbs", "double heads"]
  },
  SOLO_SHOT: {
    pos: ["solo focus", "single subject"],
    neg: ["multiple people", "extra characters", "crowd"]
  },

  // --- FLUIDS ---
  FLOWING_LIQUID: {
    pos: ["fluid dynamics", "realistic splashes", "flowing water physics", "surface ripples", "hydrodynamic simulation"],
    neg: ["static water", "frozen waves", "still liquid", "grainy foam"]
  },
  VISCOUS_LIQUID: {
    pos: ["transparent fluid", "high-speed fluid simulation", "glistening surface highlights", "thick viscous drips", "slick wet texture"],
    neg: ["gelatinous movement", "jelly-like water", "plastic texture", "noisy water"]
  },
  MACRO_FOCUS: {
    pos: ["extreme closeup", "macro focus", "tight crop", "filling frame", "anatomical detail focus"],
    neg: ["deformed iris", "bad face", "background details"]
  },

  // --- ATMOSPHERE & LIGHTING (UPDATED) ---
  NEON_NOIR: {
    pos: ["cyberpunk neon lighting", "volumetric fog", "purple and blue rim lights", "rainy street reflections", "high contrast", "moody atmosphere"],
    neg: ["daylight", "bright sun", "flat lighting", "washed out", "warm tones"]
  },
  GOLDEN_HOUR: {
    pos: ["warm sunlight", "lens flare", "sun rays", "dust motes", "soft cinematic lighting", "backlit hair", "romantic atmosphere"],
    neg: ["cold colors", "fluorescent light", "studio lighting", "night time", "dark"]
  },
  STUDIO_GLAM: {
    pos: ["studio softbox lighting", "perfect skin tone", "professional photography", "rim lighting", "sharp focus", "clean background"],
    neg: ["shadows", "grain", "darkness", "messy lighting", "amateur"]
  },
  // NEW PACKET: For "Dim / Dark / Room" requests
  DIM_LIGHT: {
    pos: ["dim lighting", "low key lighting", "shadows", "silhouette", "intimate atmosphere", "soft candlelight glow", "dark room", "mysterious", "noir", "deep blacks"],
    neg: ["bright lights", "sunlight", "flash photography", "overexposed", "daytime", "fluorescent"]
  },

  // --- MICRO-EXPRESSIONS (UPDATED) ---
  FLIRTY_EYES: {
    pos: ["subtle biting lip", "looking up through lashes", "playful smirk", "eyes shifting", "subtle eyebrow raise", "alluring gaze"],
    neg: ["dead eyes", "blank stare", "frozen face", "scary expression", "angry"]
  },
  EMOTIONAL_VULNERABILITY: {
    pos: ["glassy eyes", "subtle trembling lip", "looking down shyly", "soft breathing", "emotional gaze", "vulnerable expression"],
    neg: ["confident", "laughing", "smiling", "hard expression"]
  },
  // NEW PACKET: For "Happy / Laughing" requests
  JOYFUL_EXPRESSION: {
    pos: ["genuine smile", "laughing", "eyes crinkling", "happy expression", "radiant", "glowing", "joyful"],
    neg: ["sad", "crying", "serious", "neutral face", "dead eyes"]
  },

  // --- TEMPORAL DYNAMICS ---
  SLOW_MOTION: {
    pos: ["slow motion", "high frame rate", "slowed down", "graceful movement", "suspended in time", "120fps", "dreamy motion"],
    neg: ["fast motion", "jittery", "sped up", "timelapse", "hyperlapse"]
  },
  TIMELAPSE: { 
    pos: ["timelapse", "fast moving clouds", "shadows moving", "time passing", "hyperlapse"],
    neg: ["slow motion", "still image", "frozen"]
  }
};

/**
 * Generates an optimized "Physics & Context" package.
 */
export const orchestrateNeuralPrompt = (
  actionPrompt: string = "", 
  userPrompt: string = "", 
  character: CharacterProfile
) => {
  if (!character) {
    console.error("❌ NeuralMotionManager: Character context missing. Aborting sync.");
    return { finalPositive: actionPrompt, finalNegative: "" };
  }

  const combinedContext = `${userPrompt} ${actionPrompt}`.toLowerCase();
  let positiveTokens: string[] = ["(high quality, masterpiece:1.2)"];
  let negativeTokens: string[] = [...PACKETS.CORE_NEG];

  // --- 1. CAMERA MOTION ---
  const isZoomIn = /zoom in|zooming in|closer|getting closer|dolly in/i.test(combinedContext);
  const isZoomOut = /zoom out|zooming out|pull back|pulling back|wide angle/i.test(combinedContext);

  if (isZoomIn) {
    positiveTokens.push(...PACKETS.ZOOM_IN.pos);
    negativeTokens.push(...PACKETS.ZOOM_IN.neg);
  } else if (isZoomOut) {
    positiveTokens.push(...PACKETS.ZOOM_OUT.pos);
    negativeTokens.push(...PACKETS.ZOOM_OUT.neg);
  }

  // --- 2. MOVEMENT TYPE ---
  const isDynamic = /running|walking|dancing|jumping|riding|bouncing|shaking|grinding|twerk|climax|moving|sliding|fingering|stroking|rubbing|penetration|thrusting|pumping/i.test(combinedContext);
  const isStationary = /sitting|standing|lying|portrait|posing|leaning|sleeping|staring|looking at/i.test(combinedContext);

  if (isDynamic && !isStationary) {
    positiveTokens.push(...PACKETS.DYNAMIC.pos);
    negativeTokens.push(...PACKETS.DYNAMIC.neg);
  } else {
    positiveTokens.push(...PACKETS.STATIONARY.pos);
    negativeTokens.push(...PACKETS.STATIONARY.neg);
  }

  // --- 3. ANATOMY & JIGGLE ---
  const hasHandsFeet = /hand|finger|feet|toe|palm|wrist|ankle|heel|grabbing|touching|fingering/i.test(combinedContext);
  const hasCurves = /ass|butt|tit|breast|chest|thigh|hip|nips|clit|pussy|vagina|curves/i.test(combinedContext);
  const isMacro = /closeup|macro|tight crop|focus on|isolated|filling the frame/i.test(combinedContext);

  if (hasHandsFeet) {
    positiveTokens.push(...PACKETS.HANDS_FEET.pos);
    negativeTokens.push(...PACKETS.HANDS_FEET.neg);
  }
  if (hasCurves || (isDynamic && !isZoomOut)) {
    positiveTokens.push(...PACKETS.CURVES_PHYSICS.pos);
    negativeTokens.push(...PACKETS.CURVES_PHYSICS.neg);
  }
  if (isMacro) {
    positiveTokens.push(...PACKETS.MACRO_FOCUS.pos);
    negativeTokens.push(...PACKETS.MACRO_FOCUS.neg);
  }

  // --- 4. FLUIDS ---
  const isFlowing = /water|pool|ocean|sea|river|lake|rain|splash|shower|bath|fountain|waves|ripples|piss/i.test(combinedContext);
  const isViscous = /oil|sweat|liquid|wet|fluid|cum|semen|jizz|bukkake|cumshot|creampie|milk|spit|saliva|tears|dripping|juicy|wetness|drooling|creamy|slick|sticky|leaking|messy/i.test(combinedContext);

  if (isFlowing) {
    positiveTokens.push(...PACKETS.FLOWING_LIQUID.pos);
    negativeTokens.push(...PACKETS.FLOWING_LIQUID.neg);
  }
  if (isViscous) {
    positiveTokens.push(...PACKETS.VISCOUS_LIQUID.pos);
    negativeTokens.push(...PACKETS.VISCOUS_LIQUID.neg);
  }

  // --- 5. SOCIAL ---
  const isMultiple = /two people|double|couple|with another|group|bukkake|gangbang|multiperson/i.test(combinedContext);
  if (isMultiple) {
    positiveTokens.push(...PACKETS.MULTI_PERSON.pos);
    negativeTokens.push(...PACKETS.MULTI_PERSON.neg);
  } else {
    positiveTokens.push(...PACKETS.SOLO_SHOT.pos);
    negativeTokens.push(...PACKETS.SOLO_SHOT.neg);
  }

  // --- 6. SITUATIONAL TAGS (Router Logic) ---
  const isFaceFocus = /face|eyes|lips|mouth|portrait|expression|facial|headshot|tongue/i.test(combinedContext);
  const isBodyFocus = /body|physique|thighs|legs|ass|chest|abs|waist|hips/i.test(combinedContext);

  let situationalTags: string[] = [character?.ethnicity || ""];
  
  if (isFaceFocus && !isBodyFocus && !isMacro) {
    situationalTags.push(...(character?.face || []), ...(character?.hair || []));
  } else if (isBodyFocus && !isFaceFocus) {
    situationalTags.push(...(character?.body || []), character?.outfit || "");
  } else {
    situationalTags.push(
      ...(character?.body || []), 
      ...(character?.hair || []), 
      ...(character?.face || []), 
      character?.outfit || ""
    );
  }

  // --- 7. BODY BUILD ---
  const hasBuildTags = /body|figure|shape|frame|petite|curvy|thick|slim|skinny|tall|short|silhouette|build/i.test(combinedContext);
  if (hasBuildTags) {
    const buildTraits = (character?.body || []).filter(t => 
      /petite|curvy|thick|slim|skinny|tall|short|slender|thin|athletic/i.test(t)
    );
    situationalTags.push(...buildTraits);
  }

  // --- 9. ATMOSPHERE & LIGHTING ---
  const isNeon = /neon|cyberpunk|city lights|purple|blue|club|party/i.test(combinedContext);
  const isGolden = /sunset|sunrise|golden hour|morning|sunlight|warm|glow/i.test(combinedContext);
  const isStudio = /studio|photoshoot|professional|clean|white background|fashion/i.test(combinedContext);
  
  // NEW TRIGGER LOGIC FOR DIM LIGHTING
  const isDim = /dim|dark|low light|shadow|night|candle|moonlight|bedroom|evening|dusk|silhouette/i.test(combinedContext);

  if (isNeon) {
    positiveTokens.push(...PACKETS.NEON_NOIR.pos);
    negativeTokens.push(...PACKETS.NEON_NOIR.neg);
  } else if (isGolden) {
    positiveTokens.push(...PACKETS.GOLDEN_HOUR.pos);
    negativeTokens.push(...PACKETS.GOLDEN_HOUR.neg);
  } else if (isStudio) {
    positiveTokens.push(...PACKETS.STUDIO_GLAM.pos);
    negativeTokens.push(...PACKETS.STUDIO_GLAM.neg);
  } else if (isDim) { 
    // This handles your specific request for "in room, low lighting"
    positiveTokens.push(...PACKETS.DIM_LIGHT.pos);
    negativeTokens.push(...PACKETS.DIM_LIGHT.neg);
  }

  // --- 10. MICRO-EXPRESSIONS ---
  const isFlirty = /flirty|tease|teasing|smirk|looking at me|bedroom eyes|seductive|winking/i.test(combinedContext);
  const isVulnerable = /sad|crying|shy|blushing|nervous|timid|emotional|tears/i.test(combinedContext);
  const isJoyful = /happy|laughing|smiling|joy|excited|glad/i.test(combinedContext);

  if (isFlirty) {
    positiveTokens.push(...PACKETS.FLIRTY_EYES.pos);
    negativeTokens.push(...PACKETS.FLIRTY_EYES.neg);
  } else if (isVulnerable) {
    positiveTokens.push(...PACKETS.EMOTIONAL_VULNERABILITY.pos);
    negativeTokens.push(...PACKETS.EMOTIONAL_VULNERABILITY.neg);
  } else if (isJoyful) {
    positiveTokens.push(...PACKETS.JOYFUL_EXPRESSION.pos);
    negativeTokens.push(...PACKETS.JOYFUL_EXPRESSION.neg);
  }

  // --- 11. TEMPORAL DYNAMICS (SLOW MO) ---
  // Expanded triggers for slow motion to include romantic/sensual contexts
  const isSlowMo = /slow motion|slowmo|slowed|graceful|cinematic|dreamy|romantic|passionate|sensual/i.test(combinedContext);
  const isTimelapse = /timelapse|fast forward|time passing|hyperlapse|clouds moving|shadows moving/i.test(combinedContext);

  if (isSlowMo) {
    positiveTokens.push(...PACKETS.SLOW_MOTION.pos);
    negativeTokens.push(...PACKETS.SLOW_MOTION.neg);
  } else if (isTimelapse) {
    positiveTokens.push(...PACKETS.TIMELAPSE.pos);
    negativeTokens.push(...PACKETS.TIMELAPSE.neg);
  }

  // --- 12. FINAL ASSEMBLY ---
  const cleanPos = Array.from(new Set([...positiveTokens, ...situationalTags, actionPrompt]))
    .filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

  const charNegatives = character?.negativePrompt ? character.negativePrompt.split(",").map(s => s.trim()) : [];
  const cleanNeg = Array.from(new Set([...negativeTokens, ...charNegatives]))
    .filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

  return { finalPositive: cleanPos, finalNegative: cleanNeg };
};
