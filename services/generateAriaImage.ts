import { CharacterProfile } from "../types";

// ✅ YOUR PUBLIC R2 DOMAIN (For viewing images)
const R2_PUBLIC_DOMAIN = "https://pub-5ad10447a420475ebb914b21e843d79d.r2.dev";

/**
 * NEURAL ROUTER CONFIG (LoRA Mapping)
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
 */
export const generateAriaImage = async (
  contextPrompt: string | null,
  userPrompt: string,
  character: CharacterProfile
): Promise<string | null> => {
  // 🧹 DIALOGUE CLEANER (Fixes quality issues)
  let baseDescription = (contextPrompt || userPrompt || "")
    .replace(/["“][^"”]*["”]/g, '') 
    .replace(/\b(hehe|haha|lol|hey|hello|ah|oh|wow|hmm)\b/gi, '')
    .trim();

  if (!baseDescription) {
    console.warn("No prompt description available for image generation");
    return null;
  }

  // --- 1. SITUATIONAL ANALYSIS ---
  const sceneLower = baseDescription.toLowerCase();
  
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
  let loraTriggerWord = ""; // <--- THIS WAS MISSING, CAUSING YOUR ERROR

  // Step 2.1: Dynamic Profile Sync (Name Priority)
  const nameKey = character.name.toLowerCase();
  if (LORA_MAP[nameKey]) {
      activeLoraFile = LORA_MAP[nameKey];
      loraTriggerWord = nameKey;
  } else {
      // Step 2.2: Chat Trigger Override
      const weightRegex = /\(([^:]+):([0-9.]+)\)/i;
      const weightMatch = baseDescription.match(weightRegex);

      if (weightMatch) {
        const trigger = weightMatch[1].toLowerCase();
        if (LORA_MAP[trigger]) {
          activeLoraFile = LORA_MAP[trigger];
          activeWeight = parseFloat(weightMatch[2]);
          loraTriggerWord = trigger;
        }
      } else {
        // Step 2.3: Generic Trigger Search
        const sortedTriggers = Object.keys(LORA_MAP).sort((a, b) => b.length - a.length);
        for (const trigger of sortedTriggers) {
          const triggerRegex = new RegExp(`\\b${trigger}\\b`, 'i');
          if (triggerRegex.test(sceneLower)) {
            activeLoraFile = LORA_MAP[trigger];
            loraTriggerWord = trigger;
            break;
          }
        }
        
        // Final Fallback: Profile Keywords
        if (!activeLoraFile) {
           const profileKeywords = [
             ...(character.face || []),
             ...(character.hair || []),
             ...(character.body || [])
           ].map(tag => tag.toLowerCase());

           for (const tag of profileKeywords) {
             if (LORA_MAP[tag]) {
               activeLoraFile = LORA_MAP[tag];
               loraTriggerWord = tag; 
               break; 
             }
           }
        }
      }
  }

  // --- 3. DYNAMIC TAG ORCHESTRATION & CONSISTENCY LOCKS ---
  const faceTags = character.face.join(", ");
  const hairTags = character.hair.length > 0 ? `${character.hair.join(", ")} hair` : "";
  const outfit = character.outfit || "";

  // 🔐 CONSISTENCY LOCK 1: PHYSIQUE AMPLIFIER
  const shapeKeywords = /curvy|thick|petite|voluptuous|chubby|slim|skinny|large|big|huge|massive|small|flat|heavy|muscular|toned|fit|athletic|busty|thicc|plump|waist|bosom/i;
  let physiqueTags = (character.body || []).filter(t => shapeKeywords.test(t)).join(", ");
  
  if (physiqueTags.toLowerCase().includes("curvy") || physiqueTags.toLowerCase().includes("thick")) {
      physiqueTags += ", (voluptuous figure, wide hips, thick thighs, round curves:1.2)";
  }

  // 🔐 CONSISTENCY LOCK 2: SMART OUTFIT INJECTION
  const clothingKeywords = ["wearing", "dressed in", "outfit", "bikini", "lingerie", "shirt", "dress", "pants", "naked", "nude", "topless", "bra", "panties"];
  const hasClothingMention = clothingKeywords.some(kw => sceneLower.includes(kw));
  const outfitLock = hasClothingMention ? "" : `(${character.outfit}:1.3)`;

  // --- 3.2 SITUATIONAL FILTER (FULL 9-CATEGORY) ---
  const filteredBodyTags = (character.body || []).filter(tag => {
    const t = tag.toLowerCase();
    const s = sceneLower;

    if (shapeKeywords.test(t)) return false; // Already locked in physiqueTags

    // Categories 1-9
    if ((s.includes("bosom") || s.includes("breast") || s.includes("tits") || s.includes("chest") || s.includes("cleavage") || s.includes("boobs") || s.includes("nipples")) && (t.includes("tits") || t.includes("breast") || t.includes("bust") || t.includes("boobs"))) return true;
    if ((s.includes("ass") || s.includes("butt") || s.includes("bottom") || s.includes("behind") || s.includes("rear") || s.includes("hips") || s.includes("backside") || s.includes("bent over")) && (t.includes("ass") || t.includes("butt") || t.includes("hips"))) return true;
    if ((s.includes("pussy") || s.includes("crotch") || s.includes("vagina") || s.includes("spread") || s.includes("vulva") || s.includes("lips") || s.includes("clit") || s.includes("panties") || s.includes("undressing")) && (t.includes("pussy") || t.includes("hairy") || t.includes("shaved") || t.includes("pubic") || t.includes("bush"))) return true;
    if ((s.includes("legs") || s.includes("thighs") || s.includes("feet") || s.includes("toes") || s.includes("soles") || s.includes("stockings") || s.includes("calves") || s.includes("ankles") || s.includes("stepping") || s.includes("socks") || s.includes("kneeling")) && (t.includes("legs") || t.includes("thighs") || t.includes("feet") || t.includes("toes"))) return true;
    if ((s.includes("hands") || s.includes("fingers") || s.includes("arms") || s.includes("touching") || s.includes("holding") || s.includes("grabbing") || s.includes("nails") || s.includes("shoulders") || s.includes("wrist") || s.includes("reaching")) && (t.includes("hands") || t.includes("fingers") || t.includes("nails") || t.includes("arms"))) return true;
    if ((s.includes("skin") || s.includes("texture") || s.includes("detailed") || s.includes("tan") || s.includes("sweat") || s.includes("abs") || s.includes("stomach") || s.includes("belly") || s.includes("waist") || s.includes("navel") || s.includes("freckles") || s.includes("goosebumps") || s.includes("oiled")) && (t.includes("skin") || t.includes("tan") || t.includes("freckles") || t.includes("abs") || t.includes("waist") || t.includes("smooth"))) return true;
    if ((s.includes("body") || s.includes("figure") || s.includes("shape") || s.includes("frame") || s.includes("silhouette") || s.includes("build")) && (t.includes("slender") || t.includes("thin") || t.includes("athletic") || t.includes("fit"))) return true;
    if ((s.includes("posing") || s.includes("sitting") || s.includes("standing") || s.includes("lying") || s.includes("kneeling") || s.includes("on her knees") || s.includes("legs spread") || s.includes("on top") || s.includes("doggy") || s.includes("missionary") || s.includes("cowgirl") || s.includes("riding")) && (t.includes("athletic") || t.includes("flexible") || t.includes("toned") || t.includes("submissive") || t.includes("dominant") || t.includes("kneeling") || t.includes("side profile"))) return true;
    if ((s.includes("frontview") || s.includes("backview") || s.includes("sideview") || s.includes("profile") || s.includes("from above") || s.includes("from below") || s.includes("high angle") || s.includes("low angle") || s.includes("overhead") || s.includes("birdseye") || s.includes("wormseye")) && (t.includes("front") || t.includes("back") || t.includes("side") || t.includes("rear") || t.includes("profile") || t.includes("bottom view") || t.includes("top view"))) return true;

    // Strict Whitelist Mode for wide shots
    if (!isFaceFocus && !isUpperBody && !isPartFocus && !isLowerBody) {
       const safeTagRegex = /petite|curvy|thick|slim|skinny|tall|short|slender|thin|athletic|fit|toned|muscular|chubby|voluptuous|freckles|pale|tan|dark|skin/i;
       if (safeTagRegex.test(t)) return true;
    }
    return false;
  });

  const bodyTags = filteredBodyTags.join(", ");
  
  // 🔐 CONSISTENCY LOCK 3: IDENTITY BLOCK
  const baseTag = character.gender.toLowerCase() === 'male' ? '1boy' : '1girl';
  const botIdentity = `(solo, ${baseTag}:1.2), (${loraTriggerWord}, ${character.name}:1.2), (${faceTags}, ${hairTags}, ${character.ethnicity}:1.1), (${physiqueTags}:1.5), ${outfitLock}, a ${character.age}-year-old ${character.gender}`;

  // --- UPDATED SITUATIONAL TAGS ---
  let situationalTags: string[] = [];

  if (isFaceFocus && isLowerBody) {
    situationalTags = [`wide medium shot of ${botIdentity} showing both face and lower body`, character.ethnicity, faceTags, hairTags, bodyTags, outfit];
  } else if (isFaceFocus && !isLowerBody) {
    situationalTags = [`extreme closeup portrait of ${botIdentity}`, character.ethnicity, faceTags, hairTags, bodyTags];
  } else if (isLowerBody) {
    situationalTags = [`detailed focused shot of ${botIdentity} from the lower body and rear perspective`, character.ethnicity, bodyTags, outfit];
  } else if (isPartFocus) {
    situationalTags = [`macro detailed focus on ${character.name}'s body part`, character.ethnicity, bodyTags];
  } else if (isUpperBody) {
    situationalTags = [`waist-up shot of ${botIdentity}`, character.ethnicity, faceTags, hairTags, outfit, bodyTags];
  } else {
    situationalTags = [`raw candid photo of ${botIdentity}`, character.ethnicity, bodyTags, hairTags, faceTags, outfit];
  }

  // --- 4. FINAL PROMPT ASSEMBLY ---
  const physicalIdentity = situationalTags.filter(Boolean).join(", ");
  const fusedDescription = `(${baseDescription}:1.1)`;

  const promptText = [
    "(masterpiece, high quality, realistic:1.2)", 
    physicalIdentity,                             
    fusedDescription,                             
    "unfiltered raw candid cinematic photo, extremely detailed skin texture, photorealistic, natural subsurface scattering, film grain, dslr look, 8k uhd"
  ].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

  // --- 5. SAFETY & NEGATIVES ---
  const actionTriggers = ["nude", "naked", "sex", "intimate", "undressing", "exposed", "touching", "pussy", "vagina", "penis", "dick", "cum", "cock", "orgasm"];
  const hasExplicitIntent = actionTriggers.some(t => sceneLower.includes(t));
  const isDetailedScene = baseDescription.length > 80; 
  const bypassSafety = hasExplicitIntent || isDetailedScene;

  const maleTriggers = ["man", "boy", "guy", "male", "husband", "boyfriend", "him", "he ", "his "];
  const isMaleInContext = maleTriggers.some(t => sceneLower.includes(t));
  const charGender = character.gender.toLowerCase();

  let genderExclusion = "";
  if (charGender === 'female' && !isMaleInContext) {
    genderExclusion = "(male, man, boy, guy, penis, beard, stubble, testicular:1.5), (back of head, multiple views:1.3), ";
  } else if (charGender === 'male') {
    genderExclusion = "(female, woman, girl, lady, vagina, breasts, bra, panties:1.5), (back of head, multiple views:1.3), ";
  }

  let safetyNegatives = "";
  if (!bypassSafety) {
    safetyNegatives = "nude, naked, nipples, topless, exposed breast, genitals, vaginal, penis, pussy";
  }

  const consistencyNegatives = "(changing clothes, changing hair color, changing hairstyle, asian, chinese, flat chest, skinny, anorexic, slender, narrow hips, small tits:1.5)"; 

  const negativeText = [
    safetyNegatives,
    genderExclusion,
    consistencyNegatives, 
    character.negativePrompt || "",
    "(multiple girls, 2girls, 3girls, trio, duo, group:1.6), (multiple people:1.5), cartoon, anime, 3d render, illustration, painting, low quality, blurry, bad anatomy"
  ].filter(Boolean).join(", ");

  const seed = Math.floor(Math.random() * 1_000_000_000);

  // --- DEBUG LOGGING ---
  console.log(`🚀 Dispatching Neural Sync: ${character.name}`);
  console.log(`📝 Final Prompt: ${promptText}`);
  if (activeLoraFile) console.log(`🧬 Active LoRA: ${activeLoraFile}.safetensors (Weight: ${activeWeight})`);

  // --- 6. COMFYUI WORKFLOW INJECTION ---
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
        const rawImage = output?.message || output?.["19"]?.images?.[0] || output?.images?.[0] || output;
        
        if (!rawImage) throw new Error("Job completed but no image found");

        let finalUrl = typeof rawImage === 'string' ? rawImage : (rawImage.data || rawImage.url);

        if (finalUrl.includes("r2.cloudflarestorage.com")) {
            const filename = finalUrl.split('/').pop(); 
            finalUrl = `${R2_PUBLIC_DOMAIN}/${filename}`;
        }
        
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
