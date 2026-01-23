import { CharacterProfile } from "../types"; 

// ✅ YOUR PUBLIC R2 DOMAIN (For viewing images)
const R2_PUBLIC_DOMAIN = "https://pub-5ad10447a420475ebb914b21e843d79d.r2.dev";

/**
 * NEURAL ROUTER CONFIG (LoRA Mapping)
 * Maps trigger words in the LLM context to .safetensors on RunPod.
 * Ported from ORIS Neural Engine logic.
 */
const LORA_MAP: Record<string, string> = {
  "brittany": "brittanyspears-v1",
  "asmrvida": "asmrvida",
  "stephanie": "stephanie-lvl2",
  "stephanie og": "stephanie-og-000009",
  "stephanie v1": "stephanie-v1-000009",
  "stephanie proxy" : "stephanie-proxy",
  "stehpanie og2" : "stephanie-og2",
  "poison ivy": "poison-ivy",
  "ivy harper": "ivyharper-v1",
  "debby ryan": "debby-ryan",
  "debby-ryan": "debby-ryan",
  "witchofoz": "witchofoz",
  "priyarai": "priyarai",
  "francescale": "francescale",
  "xochitl-v1": "xochitl-v1",
  "baca-v1": "baca-v1",
  "rizzkallah": "rizzkallah",
  "des": "des",
  "leighbaker-v1": "leighbaker-v1",
  "aubrey": "aubreyplaza-v1",
  "jenna": "jennaortega-v1",
  "theresa": "theresa",
  "bule barbie" : "bule-barbie",
  "eva the elf" : "eva-the-elf",
  "cum on your mouth": "cum-on-your-face"
};

/**
 * GENERATE ARIA IMAGE
 * logic:
 * 1. Situational Analysis: Detects camera focus and perspective.
 * 2. LoRA Detection: Syncs with UI settings and chat triggers.
 * 3. Dynamic Tag Orchestration: Smart 9-Category Context Filtering.
 * 4. Workflow Orchestration: ComfyUI JSON injection.
 */
export const generateAriaImage = async (
  contextPrompt: string | null,
  userPrompt: string,
  character: CharacterProfile
): Promise<string | null> => {
  const baseDescription = (contextPrompt || userPrompt || "").trim();

  if (!baseDescription) {
    console.warn("No prompt description available for image generation");
    return null;
  }

// --- 1. SITUATIONAL ANALYSIS (REFINED PERSPECTIVE) ---
  const sceneLower = baseDescription.toLowerCase();
  
  // Smart Face Detection: Prevents 'Portrait Hijack' on body-part closeups
  const isFaceFocus = /face|eyes|lips|mouth|headshot|portrait|expression|facial/i.test(sceneLower) || 
                      (sceneLower.includes("closeup") && !/ass|butt|rear|chest|boobs|tits|legs|feet|pussy/i.test(sceneLower));

  const isUpperBody = /upper body|waist up|chest up|bust shot/i.test(sceneLower);
  const isLowerBody = /lower body|thighs|legs|feet|waist down|ass|butt|rear|backside|behind/i.test(sceneLower);
  const isPartFocus = /hands|fingers|feet|toes|skin texture|extreme closeup/i.test(sceneLower);
  const isHorizontal = /landscape|horizontal|wide shot|panoramic/i.test(sceneLower);

  const imgWidth = isHorizontal ? 1500 : 1024;
  const imgHeight = isHorizontal ? 1024 : 1500;

  // --- 2. LORA DETECTION & SYNC ---
  let activeLoraFile = "";
  let activeWeight = 0.90; // Slightly bumped for better likeness
  let loraTriggerWord = ""; // <--- CAPTURES THE TRIGGER FOR FACE ANCHORING

  // 🛡️ FIX 1: Prioritize Name Match First (Prevents Body Tag Leak)
  const nameKey = character.name.toLowerCase();
  if (LORA_MAP[nameKey]) {
      activeLoraFile = LORA_MAP[nameKey];
      loraTriggerWord = nameKey;
  } 
  else {
      // Step 2.2: Chat Trigger Override (Manual Weights)
      const weightRegex = /\(([^:]+):([0-9.]+)\)/i;
      const weightMatch = baseDescription.match(weightRegex);

      if (weightMatch) {
        const trigger = weightMatch[1].toLowerCase();
        if (LORA_MAP[trigger]) {
          activeLoraFile = LORA_MAP[trigger];
          activeWeight = parseFloat(weightMatch[2]);
          loraTriggerWord = trigger;
        }
      } 
      else {
        // Fallback: Check for triggers using Word Boundaries
        const sortedTriggers = Object.keys(LORA_MAP).sort((a, b) => b.length - a.length);
        for (const trigger of sortedTriggers) {
          // 🛡️ FIX 2: Word Boundary Regex (Stops "modest" triggering "des")
          const triggerRegex = new RegExp(`\\b${trigger}\\b`, 'i');
          
          if (triggerRegex.test(sceneLower)) {
            activeLoraFile = LORA_MAP[trigger];
            loraTriggerWord = trigger;
            break;
          }
        }
        
        // Final Fallback: If no trigger found yet, check generic body tags (Low Priority)
        if (!activeLoraFile) {
           const profileKeywords = [
             ...(character.face || []),
             ...(character.hair || []),
             ...(character.body || [])
           ].map(tag => tag.toLowerCase());

           for (const tag of profileKeywords) {
             if (LORA_MAP[tag]) {
               activeLoraFile = LORA_MAP[tag];
               loraTriggerWord = tag; // Capture generic tag if used
               break; 
             }
           }
        }
      }
  }

 // --- 3. DYNAMIC TAG ORCHESTRATION & CONSISTENCY LOCKS ---
  
  // 🔐 CONSISTENCY LOCK 1: HARD FACE ANCHOR
  const faceTags = character.face.join(", ");
  const hairTags = character.hair.length > 0 ? `${character.hair.join(", ")} hair` : "";
  const faceAnchor = `(${loraTriggerWord}, ${faceTags}, ${hairTags}, ${character.ethnicity}:1.2)`;

  // 🔐 CONSISTENCY LOCK 2: SMART OUTFIT INJECTION
  const clothingKeywords = ["wearing", "dressed in", "outfit", "bikini", "lingerie", "shirt", "dress", "pants", "naked", "nude", "topless", "bra", "panties"];
  const hasClothingMention = clothingKeywords.some(kw => sceneLower.includes(kw));
  const outfitLock = hasClothingMention ? "" : `(${character.outfit}:1.3)`;

  // 🔐 CONSISTENCY LOCK 3: PHYSIQUE INJECTION (The Fix for "Curvy")
  // We extract shape-related tags separately so they are NEVER filtered out.
  const shapeKeywords = /curvy|thick|petite|voluptuous|chubby|slim|skinny|large|big|huge|massive|small|flat|heavy|muscular|toned|fit|athletic|busty|thicc|plump|waist|bosom/i;
  const physiqueTags = (character.body || []).filter(t => shapeKeywords.test(t)).join(", ");

  // Filter Situational Body Parts (Only show "legs" if looking at legs)
  const filteredBodyTags = (character.body || []).filter(tag => {
    const t = tag.toLowerCase();
    const s = sceneLower;

    // Skip shape tags here because we handled them in Lock 3 above
    if (shapeKeywords.test(t)) return false; 

    // 1. CHEST / BUST (Explicit parts)
    if ((s.includes("chest") || s.includes("cleavage") || s.includes("boobs") || s.includes("nipples")) && 
        (t.includes("tits") || t.includes("breast") || t.includes("nipples"))) return true;
    
    // 2. REAR / ASS
    if ((s.includes("ass") || s.includes("butt") || s.includes("bottom") || s.includes("behind") || s.includes("rear") || s.includes("hips") || s.includes("backside") || s.includes("bent over")) && 
        (t.includes("ass") || t.includes("butt") || t.includes("hips"))) return true;
    
    // 3. GENITALS
    if ((s.includes("pussy") || s.includes("crotch") || s.includes("vagina") || s.includes("spread") || s.includes("lips") || s.includes("panties")) && 
        (t.includes("pussy") || t.includes("hairy") || t.includes("shaved") || t.includes("pubic"))) return true;

    // 4. LEGS
    if ((s.includes("legs") || s.includes("thighs") || s.includes("feet") || s.includes("stockings")) && 
        (t.includes("legs") || t.includes("thighs") || t.includes("feet"))) return true;

    // 5. SKIN
    if ((s.includes("skin") || s.includes("sweat") || s.includes("oil") || s.includes("wet")) && 
        (t.includes("skin") || t.includes("pale") || t.includes("tan") || t.includes("dark"))) return true;

    // 6. HANDS
    if ((s.includes("hand") || s.includes("finger") || s.includes("touch")) && 
        (t.includes("hand") || t.includes("finger") || t.includes("nail"))) return true;

    return false; 
  });

  const bodyTags = filteredBodyTags.join(", ");
  
  // 🔐 UPDATED IDENTITY BLOCK (Added Physique Tags)
  const baseTag = character.gender.toLowerCase() === 'male' ? '1boy' : '1girl';
  // We explicitly add (physiqueTags:1.3) to force the body shape
  const botIdentity = `(solo, ${baseTag}:1.2), ${faceAnchor}, (${physiqueTags}:1.3), ${outfitLock}, a ${character.age}-year-old ${character.gender}`;

  // --- UPDATED SITUATIONAL TAGS ---
  let situationalTags: string[] = [];

  if (isFaceFocus && isLowerBody) {
    situationalTags = [`wide medium shot of ${botIdentity} showing both face and lower body`, bodyTags];
  } else if (isFaceFocus && !isLowerBody) {
    situationalTags = [`extreme closeup portrait of ${botIdentity}`, bodyTags];
  } else if (isLowerBody) {
    situationalTags = [`detailed focused shot of ${botIdentity} from the lower body and rear perspective`, bodyTags];
  } else if (isPartFocus) {
    situationalTags = [`macro detailed focus on ${character.name}'s body part`, bodyTags];
  } else if (isUpperBody) {
    situationalTags = [`waist-up shot of ${botIdentity}`, bodyTags];
  } else {
    situationalTags = [`raw candid photo of ${botIdentity}`, bodyTags];
  }



// --- 4. NEURAL CONTEXT SYNC (SMART BYPASS) ---

  // 4a. Detection of Intent & Detail
  // We look for 'Action' keywords and 'Detail' to determine if it's an intended explicit scene
  const actionTriggers = ["nude", "naked", "sex", "intimate", "undressing", "exposed", "touching", "pussy", "vagina", "penis", "dick", "cum", "cock", "orgasm"];
  const hasExplicitIntent = actionTriggers.some(t => sceneLower.includes(t));

  // Context Awareness: Trust long descriptions (>80 chars) as intended narrative detail
  const isDetailedScene = baseDescription.length > 80; 
  const bypassSafety = hasExplicitIntent || isDetailedScene;

  // 4b. GENDER EXCLUSION LAYER (Keep focus on the character)
  const maleTriggers = ["man", "boy", "guy", "male", "husband", "boyfriend", "him", "he ", "his ", "father", "brother"];
  const femaleTriggers = ["woman", "girl", "lady", "female", "wife", "girlfriend", "her ", "she ", "mother", "sister"];

  const isMaleInContext = maleTriggers.some(t => sceneLower.includes(t));
  const isFemaleInContext = femaleTriggers.some(t => sceneLower.includes(t));
  const charGender = character.gender.toLowerCase();

  let genderExclusion = "";
  if (charGender === 'female' && !isMaleInContext) {
    genderExclusion = "(male, man, boy, guy, penis, beard, stubble, testicular:1.5), (back of head, multiple views:1.3), ";
  } else if (charGender === 'male' && !isFemaleInContext) {
    genderExclusion = "(female, woman, girl, lady, vagina, breasts, bra, panties, lipstick, makeup:1.5), (back of head, multiple views:1.3), ";
  }

  // 4c. SAFETY NEGATIVES (Dynamic Application)
  let safetyNegatives = "";
  if (!bypassSafety) {
    // Only apply strict clothing filters if the context is short or generic
    safetyNegatives = "nude, naked, nipples, topless, exposed breast, genitals, vaginal, penis, pussy";
  }

  // 🚀 PROMPT FUSION: Narrative focus first
  const fusedDescription = `(${baseDescription}:1.3)`; // Bumped weight to 1.3 for better adherence

  const promptText = [
    fusedDescription,
    situationalTags.filter(Boolean).join(", "),
    "(masterpiece, high quality, realistic:1.1)",
    "unfiltered raw candid cinematic photo, extremely detailed skin texture, photorealistic, natural subsurface scattering, film grain, dslr look, 8k uhd"
  ].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

  // 🛡️ CONSISTENCY NEGATIVES (The "Anti-Skinny" Fix)
  // This explicitly prevents the AI from defaulting to thin models if your tags imply curves.
  const consistencyNegatives = "(changing clothes, changing hair color, changing hairstyle, asian, chinese, flat chest, skinny, anorexic, small tits:1.5)"; 

  const negativeText = [
    safetyNegatives,
    genderExclusion,
    consistencyNegatives, 
    character.negativePrompt || "",
    "(multiple girls, 2girls, 3girls, trio, duo, group, crowd:1.6), (multiple people:1.5)",
    "(deformed iris, deformed pupils:1.2)",
    "airbrushed skin, plastic skin, porcelain skin, doll-like skin, flawless smooth skin",
    "beauty filter, over-smoothed, heavy retouch, instagram filter",
    "cartoon, anime, 3d render, illustration, painting",
    "low quality, blurry, bad anatomy, deformed, extra limbs, mutated hands"
  ].filter(Boolean).join(", ");

  const seed = Math.floor(Math.random() * 1_000_000_000);
  
  // --- DEBUG LOGGING ---
  console.log(`🚀 Dispatching Neural Sync: ${character.name}`);
  console.log(`📝 Final Prompt: ${promptText}`);
  console.log(`🛡️ Safety Mode: ${bypassSafety ? "OFF (Bypass Active)" : "ON (Forcing Clothes)"}`);
  if (activeLoraFile) console.log(`🧬 Active LoRA: ${activeLoraFile}.safetensors (Weight: ${activeWeight})`);

  // --- 5. COMFYUI WORKFLOW INJECTION ---
  const workflow: any = {
    "4": { "inputs": { "ckpt_name": "biglust.safetensors" }, "class_type": "CheckpointLoaderSimple" },
    "5": { "inputs": { "width": imgWidth, "height": imgHeight, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "17": { "inputs": { "samples": ["11", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" },
    "19": { "inputs": { "filename_prefix": "ARIA_GENERATION", "images": ["17", 0] }, "class_type": "SaveImage" }
  };

  const modelSource = activeLoraFile ? ["20", 0] : ["4", 0];
  const clipSource = activeLoraFile ? ["20", 1] : ["4", 1];

  if (activeLoraFile) {
    workflow["20"] = {
      "inputs": {
        "lora_name": activeLoraFile + ".safetensors", 
        "strength_model": activeWeight,
        "strength_clip": 0.77,
        "model": ["4", 0],
        "clip": ["4", 1]
      },
      "class_type": "LoraLoader"
    };
  }

  workflow["6"] = { "inputs": { "text": promptText, "clip": clipSource }, "class_type": "CLIPTextEncode" };
  workflow["7"] = { "inputs": { "text": negativeText, "clip": clipSource }, "class_type": "CLIPTextEncode" };

  workflow["10"] = {
    "inputs": {
      "steps": 25, "cfg": 7.5, "sampler_name": "dpmpp_2m_sde_gpu", "scheduler": "karras",
      "add_noise": "enable", "noise_seed": seed, "start_at_step": 0, "end_at_step": 20,
      "return_with_leftover_noise": "enable",
      "model": modelSource, "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]
    },
    "class_type": "KSamplerAdvanced"
  };

  workflow["11"] = {
    "inputs": {
      "steps": 25, "cfg": 6.5, "sampler_name": "dpmpp_2m_sde_gpu", "scheduler": "karras",
      "add_noise": "disable", "noise_seed": seed, "start_at_step": 20, "end_at_step": 10000,
      "return_with_leftover_noise": "disable",
      "model": modelSource, "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["10", 0]
    },
    "class_type": "KSamplerAdvanced"
  };

  try {
    const runResponse = await fetch('/api/generate', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow })
    });

    if (!runResponse.ok) {
      const errText = await runResponse.text().catch(() => runResponse.statusText);
      throw new Error(`Proxy rejected request: ${runResponse.status} - ${errText}`);
    }
    
    const runData = await runResponse.json();
    const jobId = runData.id;

    if (!jobId) throw new Error("No Job ID returned from Proxy");

    let attempts = 0;
    while (attempts < 60) {
      const statusResponse = await fetch(`/api/generate?id=${jobId}`, { method: "GET" });
      if (!statusResponse.ok) throw new Error("Status check failed");
      const statusData = await statusResponse.json();

      if (statusData.status === "COMPLETED") {
        const output = statusData.output;
        
        // ADDED: output?.message (where URL lives for S3 uploads)
        const rawImage = output?.message || output?.["19"]?.images?.[0] || output?.images?.[0] || output;
        
        if (!rawImage) throw new Error("Job completed but no image found");

        let finalUrl = typeof rawImage === 'string' ? rawImage : (rawImage.data || rawImage.url);

        // --- R2 / S3 BANDWIDTH FIX ---
        // 1. Swap Private Cloudflare URL for Public R2 Domain
        if (finalUrl.includes("r2.cloudflarestorage.com")) {
            const filename = finalUrl.split('/').pop(); 
            finalUrl = `${R2_PUBLIC_DOMAIN}/${filename}`;
        }
        
        // 2. Return URL if HTTP, otherwise wrap Base64
        return finalUrl.startsWith('http') || finalUrl.startsWith('data:') 
            ? finalUrl 
            : `data:image/png;base64,${finalUrl}`;
      }

      if (statusData.status === "FAILED") throw new Error(statusData.error || "Generation failed");
      await new Promise(r => setTimeout(r, 3000));
      attempts++;
    }

    throw new Error("Image generation timed out");

  } catch (err: any) {
    console.error("❌ Neural Generation Service Error:", err.message);
    return null;
  }
};
