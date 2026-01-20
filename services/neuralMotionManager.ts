import { CharacterProfile } from "../types";

/**
 * NEURAL MOTION MANAGER (V5 - Ultimate Orchestration)
 * Logic: Context-aware packet injection for Wan 2.1.
 * Handles Physics, Anatomy, Camera, and Motion Styles with automatic de-duplication.
 */

const PACKETS = {
  // Always active to prevent basic AI artifacts
  CORE_NEG: ["blurry", "low quality", "distorted", "text", "watermark", "flickering", "lowres", "bad anatomy"],

  // --- CAMERA DYNAMICS ---
  ZOOM_IN: {
    pos: ["cinematic zoom in", "dolly zoom", "increasing detail", "narrowing field of view", "3d depth", "focal length transition"],
    neg: ["zooming out", "fisheye distortion", "losing detail", "flat perspective"]
  },
  ZOOM_OUT: {
    pos: ["pull back shot", "zooming out", "expanding environment", "wide angle perspective", "parallax"],
    neg: ["zooming in", "tunnel vision", "blurry edges", "cropping"]
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
    pos: ["highly detailed fingers", "individual toes", "realistic joints", "anatomically correct", "hand articulation", "precise digit movement"],
    neg: ["extra fingers", "fused limbs", "missing digits", "melted hands", "malformed feet"]
  },
  
  CURVES_PHYSICS: { // "Jiggle Physics" Logic
    pos: [
      "soft tissue physics", 
      "natural jiggle physics", 
      "realistic bounce", 
      "momentum-based movement", 
      "skin elasticity", 
      "subsurface scattering",
      "weight and gravity displacement",
      "realistic flesh deformation"
    ],
    neg: [
      "plastic texture", 
      "static body", 
      "stiff movement", 
      "unnatural silhouette", 
      "frozen physics", 
      "stony texture", 
      "rigid breasts"
    ]
  },

  // --- SOCIAL CONTEXT (RESTORED - FIXES THE CRASH) ---
  MULTI_PERSON: {
    pos: ["two distinct people", "separate silhouettes", "interaction detail"],
    neg: ["merged bodies", "fused limbs", "double heads", "deformed people"]
  },

  SOLO_SHOT: {
    pos: ["solo focus", "single subject"],
    neg: ["multiple people", "extra characters", "crowd", "other people"]
  },

  // --- FLUID PACKETS ---
  FLOWING_LIQUID: {
    pos: ["fluid dynamics", "realistic splashes", "flowing water physics", "surface ripples", "caustic light reflections", "hydrodynamic simulation", "liquid spray"],
    neg: ["static water", "frozen waves", "still liquid", "unnatural ripples", "grainy foam"]
  },
  
  VISCOUS_LIQUID: {
    pos: ["transparent fluid", "high-speed fluid simulation", "glistening surface highlights", "thick viscous drips", "slick wet texture", "oozing liquid", "sticky sheen"],
    neg: ["gelatinous movement", "jelly-like water", "viscous", "plastic texture", "defying gravity", "noisy water"]
  },

  MACRO_FOCUS: {
    pos: ["extreme closeup", "macro focus", "tight crop", "filling frame", "faceless", "head out of frame", "anatomical detail focus"],
    neg: ["deformed iris", "multiple rows of teeth", "unnatural tongue", "extra limbs", "bad face", "background details"]
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
  // --- 0. CRITICAL SAFETY ANCHOR ---
  if (!character) {
    console.error("❌ NeuralMotionManager: Character context missing. Aborting sync.");
    return { finalPositive: actionPrompt, finalNegative: "" };
  }

  const combinedContext = `${userPrompt} ${actionPrompt}`.toLowerCase();
  let positiveTokens: string[] = ["(high quality, masterpiece:1.2)"];
  let negativeTokens: string[] = [...PACKETS.CORE_NEG];

  // --- 1. CAMERA MOTION DETECTION ---
  const isZoomIn = /zoom in|zooming in|closer|getting closer|dolly in/i.test(combinedContext);
  const isZoomOut = /zoom out|zooming out|pull back|pulling back|wide angle/i.test(combinedContext);

  if (isZoomIn) {
    positiveTokens.push(...PACKETS.ZOOM_IN.pos);
    negativeTokens.push(...PACKETS.ZOOM_IN.neg);
  } else if (isZoomOut) {
    positiveTokens.push(...PACKETS.ZOOM_OUT.pos);
    negativeTokens.push(...PACKETS.ZOOM_OUT.neg);
  }

  // --- 2. MOVEMENT TYPE DETECTION ---
  const isDynamic = /running|walking|dancing|jumping|riding|bouncing|shaking|grinding|twerk|climax|moving|sliding|fingering|stroking|rubbing|penetration|thrusting|pumping/i.test(combinedContext);
  const isStationary = /sitting|standing|lying|portrait|posing|leaning|sleeping|staring|looking at/i.test(combinedContext);

  if (isDynamic && !isStationary) {
    positiveTokens.push(...PACKETS.DYNAMIC.pos);
    negativeTokens.push(...PACKETS.DYNAMIC.neg);
  } else {
    positiveTokens.push(...PACKETS.STATIONARY.pos);
    negativeTokens.push(...PACKETS.STATIONARY.neg);
  }

  // --- 3. ANATOMY & JIGGLE DETECTION ---
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

  // --- 4. FLUID DETECTION ---
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

  // --- 5. SOCIAL CONTEXT (FIXED - ACCESSIBLE PACKETS) ---
  const isMultiple = /two people|double|couple|with another|group|bukkake|gangbang|multiperson/i.test(combinedContext);
  if (isMultiple) {
    positiveTokens.push(...PACKETS.MULTI_PERSON.pos);
    negativeTokens.push(...PACKETS.MULTI_PERSON.neg);
  } else {
    positiveTokens.push(...PACKETS.SOLO_SHOT.pos);
    negativeTokens.push(...PACKETS.SOLO_SHOT.neg);
  }

  // --- 6. SITUATIONAL TAG FILTERING ---
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

  // --- 7. BODY FRAME / BUILD (RESTORED CATEGORY 7) ---
  const hasBuildTags = /body|figure|shape|frame|petite|curvy|thick|slim|skinny|tall|short|silhouette|build/i.test(combinedContext);
  if (hasBuildTags) {
    const buildTraits = (character?.body || []).filter(t => 
      /petite|curvy|thick|slim|skinny|tall|short|slender|thin|athletic/i.test(t)
    );
    situationalTags.push(...buildTraits);
  }

  // --- 8. FINAL CLEAN & DE-DUPLICATE ---
  const cleanPos = Array.from(new Set([...positiveTokens, ...situationalTags, actionPrompt]))
    .filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

  const charNegatives = character?.negativePrompt ? character.negativePrompt.split(",").map(s => s.trim()) : [];
  const cleanNeg = Array.from(new Set([...negativeTokens, ...charNegatives]))
    .filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

  return { finalPositive: cleanPos, finalNegative: cleanNeg };
};
