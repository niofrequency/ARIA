import { CharacterProfile } from "../types";

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
  let activeWeight = 0.88;

  // Step 2.1: Dynamic Profile Sync (UI Tags)
  const profileKeywords = [
    character.name,
    ...(character.face || []),
    ...(character.hair || []),
    ...(character.body || [])
  ].map(tag => tag.toLowerCase());

  for (const tag of profileKeywords) {
    if (LORA_MAP[tag]) {
      activeLoraFile = LORA_MAP[tag];
      break; 
    }
  }

  // Step 2.2: Chat Trigger Override
  const weightRegex = /\(([^:]+):([0-9.]+)\)/i;
  const weightMatch = baseDescription.match(weightRegex);

  if (weightMatch) {
    const trigger = weightMatch[1].toLowerCase();
    if (LORA_MAP[trigger]) {
      activeLoraFile = LORA_MAP[trigger];
      activeWeight = parseFloat(weightMatch[2]);
    }
  } else if (!activeLoraFile) {
    const sortedTriggers = Object.keys(LORA_MAP).sort((a, b) => b.length - a.length);
    for (const trigger of sortedTriggers) {
      if (sceneLower.includes(trigger)) {
        activeLoraFile = LORA_MAP[trigger];
        break;
      }
    }
  }

  // --- 3. DYNAMIC TAG ORCHESTRATION (9-CATEGORY SMART FILTER) ---
  const hairTags = character.hair.length > 0 ? `${character.hair.join(", ")} hair` : "";
  const faceTags = character.face.join(", ");
  const outfit = character.outfit || "";
  
  const filteredBodyTags = (character.body || []).filter(tag => {
    const t = tag.toLowerCase();
    const s = sceneLower;

    // 1. CHEST / BUST / BOOBS
    if ((s.includes("bosom") || s.includes("breast") || s.includes("tits") || s.includes("chest") || s.includes("cleavage") || s.includes("boobs") || s.includes("jugs") || s.includes("bra") || s.includes("motorboat") || s.includes("rack") || s.includes("nipples")) && 
        (t.includes("tits") || t.includes("breast") || t.includes("bust") || t.includes("boobs"))) return true;
    
    // 2. REAR / ASS / HIPS
    if ((s.includes("ass") || s.includes("butt") || s.includes("bottom") || s.includes("behind") || s.includes("rear") || s.includes("hips") || s.includes("backside") || s.includes("cheeks") || s.includes("twerk") || s.includes("spank") || s.includes("bent over")) && 
        (t.includes("ass") || t.includes("butt") || t.includes("hips") || t.includes("thicc"))) return true;
    
    // 3. GENITALS / PUBIC AREA
    if ((s.includes("pussy") || s.includes("crotch") || s.includes("vagina") || s.includes("down there") || s.includes("spread") || s.includes("vulva") || s.includes("lips") || s.includes("between legs") || s.includes("clit") || s.includes("panties") || s.includes("undressing")) && 
        (t.includes("pussy") || t.includes("hairy") || t.includes("shaved") || t.includes("pubic") || t.includes("bush"))) return true;

    // 4. LEGS & FEET
    if ((s.includes("legs") || s.includes("thighs") || s.includes("feet") || s.includes("toes") || s.includes("soles") || s.includes("stockings") || s.includes("calves") || s.includes("ankles") || s.includes("stepping") || s.includes("socks") || s.includes("kneeling")) && 
        (t.includes("legs") || t.includes("thighs") || t.includes("feet") || t.includes("toes"))) return true;

    // 5. ARMS & HANDS
    if ((s.includes("hands") || s.includes("fingers") || s.includes("arms") || s.includes("squeezing") || s.includes("touching") || s.includes("holding") || s.includes("grabbing") || s.includes("nails") || s.includes("shoulders") || s.includes("wrist") || s.includes("reaching")) && 
        (t.includes("hands") || t.includes("fingers") || t.includes("nails") || t.includes("arms"))) return true;

    // 6. SKIN / TEXTURE / MIDRIFF
    if ((s.includes("skin") || s.includes("texture") || s.includes("detailed") || s.includes("tan") || s.includes("sweat") || s.includes("abs") || s.includes("stomach") || s.includes("belly") || s.includes("waist") || s.includes("navel") || s.includes("freckles") || s.includes("goosebumps") || s.includes("oiled")) && 
        (t.includes("skin") || t.includes("tan") || t.includes("freckles") || t.includes("abs") || t.includes("waist") || t.includes("smooth"))) return true;

    // 7. BODY FRAME / BUILD
    if ((s.includes("body") || s.includes("figure") || s.includes("shape") || s.includes("frame") || s.includes("petite") || s.includes("curvy") || s.includes("thick") || s.includes("slim") || s.includes("skinny") || s.includes("tall") || s.includes("short") || s.includes("silhouette") || s.includes("build")) && 
        (t.includes("petite") || t.includes("curvy") || t.includes("thick") || t.includes("slim") || t.includes("skinny") || t.includes("tall") || t.includes("short") || t.includes("slender") || t.includes("thin"))) return true;

    // 8. ACTIONS / POSES / POSITIONS
    if ((s.includes("posing") || s.includes("sitting") || s.includes("standing") || s.includes("lying") || s.includes("laying") || s.includes("kneeling") || s.includes("on her knees") || s.includes("legs spread") || s.includes("squatting") || s.includes("bending") || s.includes("stretching") || s.includes("dancing") || s.includes("arching") || s.includes("on top") || s.includes("she is below") || s.includes("laying on side") || s.includes("doggy") || s.includes("missionary") || s.includes("cowgirl") || s.includes("riding")) && 
        (t.includes("athletic") || t.includes("flexible") || t.includes("fit") || t.includes("toned") || t.includes("submissive") || t.includes("dominant") || t.includes("kneeling") || t.includes("side profile"))) return true;

    // 9. PERSPECTIVE / VIEWPOINT
    if ((s.includes("frontview") || s.includes("backview") || s.includes("sideview") || s.includes("profile") || s.includes("from above") || s.includes("from below") || s.includes("high angle") || s.includes("low angle") || s.includes("overhead") || s.includes("birdseye") || s.includes("wormseye")) && 
        (t.includes("front") || t.includes("back") || t.includes("side") || t.includes("rear") || t.includes("profile") || t.includes("bottom view") || t.includes("top view"))) return true;

// DEFAULT: Wide shot includes everything (STRICT WHITELIST MODE)
    if (!isFaceFocus && !isUpperBody && !isPartFocus && !isLowerBody) {
       // Only allow tags that describe general build, height, or skin tone.
       // This AUTOMATICALLY blocks "bosom", "armpit", "feet", "ass" because they are not on this list.
       const safeTagRegex = /petite|curvy|thick|slim|skinny|tall|short|slender|thin|athletic|fit|toned|muscular|chubby|voluptuous|freckles|pale|tan|dark|skin/i;
       
       if (safeTagRegex.test(t)) return true;
       
       // Exclude everything else
       return false;
    }

  const bodyTags = filteredBodyTags.join(", ");
  
// PRIMARY IDENTITY ANCHOR: Added solo/1girl for subject isolation
  const botIdentity = `solo, 1girl, ${character.name}, a ${character.age}-year-old ${character.gender}`;

  // --- UPDATED SITUATIONAL TAGS (Fully Synced with ariaService Rule 12) ---
  let situationalTags: string[] = [];

  // 1. MULTI-FOCUS: If user asks for Face + Lower Body (Rule 12 support)
  if (isFaceFocus && isLowerBody) {
    situationalTags = [
      `wide medium shot of ${botIdentity} showing both face and lower body`,
      character.ethnicity,
      faceTags,
      hairTags,
      bodyTags, 
      outfit
    ];
  } 
  // 2. FACE FOCUS: Only if NOT asking for lower body
  else if (isFaceFocus && !isLowerBody) {
    situationalTags = [
      `extreme closeup portrait of ${botIdentity}`,
      character.ethnicity,
      faceTags,
      hairTags,
      bodyTags
    ];
  } 
  // 3. LOWER BODY: Now correctly uses the rear perspective for ass shots
  else if (isLowerBody) {
    situationalTags = [
      `detailed focused shot of ${botIdentity} from the lower body and rear perspective`,
      character.ethnicity,
      bodyTags,
      outfit
    ];
  } 
  // 4. PART FOCUS: For hands, feet, or skin texture
  else if (isPartFocus) {
    situationalTags = [
      `macro detailed focus on ${character.name}'s body part`,
      character.ethnicity,
      bodyTags
    ];
  } 
  // 5. UPPER BODY: Waist-up shots
  else if (isUpperBody) {
    situationalTags = [
      `waist-up shot of ${botIdentity}`,
      character.ethnicity,
      faceTags,
      hairTags,
      outfit,
      bodyTags
    ];
  } 
  // 6. DEFAULT: Full body candid
  else {
    situationalTags = [
      `raw candid photo of ${botIdentity}`,
      character.ethnicity,
      bodyTags,
      hairTags,
      faceTags,
      outfit
    ];
  }

// --- 4. SAFETY & NEGATIVE PROMPT LAYER (NEW) ---
  // Detect if the user/AI explicitly requested nudity
  const explicitTriggers = ["nude", "naked", "topless", "nipples", "areola", "pussy", "vagina", "sex", "cum", "penis", "dick", "cock", "threesome", "orgasm", "clit", "strip", "undress", "no clothes", "bottomless", "exposed"];
  const isExplicitRequest = explicitTriggers.some(t => sceneLower.includes(t));

  // If NO nudity requested, force clothing in negative prompt
  let safetyNegatives = "";
  if (!isExplicitRequest) {
    safetyNegatives = "nude, naked, nipples, topless, exposed breast, genitals, vaginal, penis, pussy";
  }

  const promptText = [
    "(masterpiece, high quality, realistic:1.2)",
    situationalTags.filter(Boolean).join(", "),
    baseDescription, 
    "unfiltered raw candid cinematic photo, extremely detailed skin texture, photorealistic, natural subsurface scattering, film grain, dslr look, 8k uhd"
  ].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

  const negativeText = [
    safetyNegatives, // <--- Forces clothes if nudity wasn't asked for
    character.negativePrompt || "",
    "(multiple girls, 2girls, 3girls, trio, duo, group, crowd:1.6)", 
    "(multiple people:1.5), (male, man, boy:1.3)",
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
  console.log(`🛡️ Safety Mode: ${isExplicitRequest ? "OFF (Nudity Allowed)" : "ON (Forcing Clothes)"}`);
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
        const rawImage = output?.["19"]?.images?.[0] || output?.images?.[0] || output;
        
        if (!rawImage) throw new Error("Job completed but no image found");

        let finalUrl = typeof rawImage === 'string' ? rawImage : (rawImage.data || rawImage.url);
        return finalUrl.startsWith('http') ? finalUrl : `data:image/png;base64,${finalUrl}`;
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
