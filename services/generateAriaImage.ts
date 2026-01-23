import { CharacterProfile } from "../types";

// ✅ YOUR PUBLIC R2 DOMAIN
const R2_PUBLIC_DOMAIN = "https://pub-5ad10447a420475ebb914b21e843d79d.r2.dev";

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

export const generateAriaImage = async (
  contextPrompt: string | null,
  userPrompt: string,
  character: CharacterProfile
): Promise<string | null> => {
  let baseDescription = (contextPrompt || userPrompt || "").trim();

  if (!baseDescription) {
    console.warn("No prompt description available for image generation");
    return null;
  }

  // 🧹 DIALOGUE CLEANER (Fixes the "Bad Quality" issue)
  // Strips text between quotes or common chat artifacts from the visual prompt
  baseDescription = baseDescription.replace(/["“][^"”]*["”]/g, '').replace(/\b(hehe|haha|lol|hey|hello)\b/gi, '').trim();

  const sceneLower = baseDescription.toLowerCase();
  
  // --- 1. SITUATIONAL ANALYSIS ---
  const isFaceFocus = /face|eyes|lips|mouth|headshot|portrait|expression|facial/i.test(sceneLower) || 
                      (sceneLower.includes("closeup") && !/ass|butt|rear|chest|boobs|tits|legs|feet|pussy/i.test(sceneLower));

  const isUpperBody = /upper body|waist up|chest up|bust shot/i.test(sceneLower);
  const isLowerBody = /lower body|thighs|legs|feet|waist down|ass|butt|rear|backside|behind/i.test(sceneLower);
  const isPartFocus = /hands|fingers|feet|toes|skin texture|extreme closeup/i.test(sceneLower);
  const isHorizontal = /landscape|horizontal|wide shot|panoramic/i.test(sceneLower);

  const imgWidth = isHorizontal ? 1500 : 1024;
  const imgHeight = isHorizontal ? 1024 : 1500;

  // --- 2. LORA DETECTION (New Safety Logic) ---
  let activeLoraFile = "";
  let activeWeight = 0.90; 
  let loraTriggerWord = ""; 

  // Priority 1: Check Name Match First
  const nameKey = character.name.toLowerCase();
  if (LORA_MAP[nameKey]) {
      activeLoraFile = LORA_MAP[nameKey];
      loraTriggerWord = nameKey;
  } 
  else {
      // Priority 2: Chat Trigger Override
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
        // Priority 3: Word Boundary Regex (Prevents "modest" triggering "des")
        const sortedTriggers = Object.keys(LORA_MAP).sort((a, b) => b.length - a.length);
        for (const trigger of sortedTriggers) {
          const triggerRegex = new RegExp(`\\b${trigger}\\b`, 'i');
          if (triggerRegex.test(sceneLower)) {
            activeLoraFile = LORA_MAP[trigger];
            loraTriggerWord = trigger;
            break;
          }
        }
        
        // Final Fallback: Generic Body Tags
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

  // --- 3. DYNAMIC TAG ORCHESTRATION & LOCKS ---
  
  // 🔐 CONSISTENCY LOCK 1: FACE ANCHOR
  const faceTags = character.face.join(", ");
  const hairTags = character.hair.length > 0 ? `${character.hair.join(", ")} hair` : "";
  // We don't build "faceAnchor" separately here; we put it directly into botIdentity like the old code.

  // 🔐 CONSISTENCY LOCK 2: PHYSIQUE INJECTION (Fixes "Curvy" being ignored)
  // Extracts shape tags so they are NEVER filtered out by situational logic.
  const shapeKeywords = /curvy|thick|petite|voluptuous|chubby|slim|skinny|large|big|huge|massive|small|flat|heavy|muscular|toned|fit|athletic|busty|thicc|plump|waist|bosom/i;
  const physiqueTags = (character.body || []).filter(t => shapeKeywords.test(t)).join(", ");

  // 🔐 CONSISTENCY LOCK 3: OUTFIT INJECTION
  const clothingKeywords = ["wearing", "dressed in", "outfit", "bikini", "lingerie", "shirt", "dress", "pants", "naked", "nude", "topless", "bra", "panties"];
  const hasClothingMention = clothingKeywords.some(kw => sceneLower.includes(kw));
  const outfitLock = hasClothingMention ? "" : `(${character.outfit}:1.3)`;

  // Filter Situational Body Tags (Removes "Legs" if we are looking at "Face")
  const filteredBodyTags = (character.body || []).filter(tag => {
    const t = tag.toLowerCase();
    const s = sceneLower;
    
    // Skip shape tags here because we handled them in Lock 2
    if (shapeKeywords.test(t)) return false; 

    if ((s.includes("chest") || s.includes("cleavage") || s.includes("boobs")) && (t.includes("tits") || t.includes("breast") || t.includes("bust"))) return true;
    if ((s.includes("ass") || s.includes("butt") || s.includes("rear")) && (t.includes("ass") || t.includes("butt") || t.includes("hips"))) return true;
    if ((s.includes("pussy") || s.includes("vagina")) && (t.includes("pussy") || t.includes("hairy") || t.includes("shaved"))) return true;
    if ((s.includes("legs") || s.includes("feet")) && (t.includes("legs") || t.includes("thighs") || t.includes("feet"))) return true;
    
    return false;
  });

  const bodyTags = filteredBodyTags.join(", ");
  
  // 📸 IDENTITY BLOCK (Restored to Old Code Structure)
  // Logic: Trigger + Name + Face + Shape + Outfit
  const botIdentity = `(solo, 1girl:1.2), (${loraTriggerWord}, ${character.name}:1.2), (${faceTags}, ${hairTags}, ${character.ethnicity}:1.1), (${physiqueTags}:1.3), ${outfitLock}, a ${character.age}-year-old ${character.gender}`;

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

  // --- 4. PROMPT ASSEMBLY (RESTORED "OLD CODE" ORDERING) ---
  // Critical Fix: Identity tags (physicalIdentity) are placed BEFORE the Description.
  // This ensures the AI draws the correct face/body first, then applies the scene.
  
  const physicalIdentity = situationalTags.filter(Boolean).join(", ");
  const fusedDescription = `(${baseDescription}:1.2)`; // Reduced from 1.3 to 1.2 to fix quality "burn"

  const promptText = [
    "(masterpiece, high quality, realistic:1.2)", // Quality First
    physicalIdentity,                             // WHO (Identity - High Priority)
    fusedDescription,                             // WHAT (Action/Scene)
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

  // Consistency Negatives: Prevents the AI from making your "curvy" character skinny
  const consistencyNegatives = "(changing clothes, changing hair color, changing hairstyle, asian, chinese, flat chest, skinny, anorexic, small tits:1.5)"; 

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
