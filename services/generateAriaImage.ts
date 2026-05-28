import { CharacterProfile } from "../types";
import { retrieveMemories } from "./memoryService";

/**
 * ARIA VISUAL STATE PARSER
 */
export const buildVisualAwarenessJson = (visualDescription: string) => {
  const parts = visualDescription.split(',').map(p => p.trim());
  
  const visualState = {
    scene_type: parts.includes('selfie') ? 'candid_selfie' : 'environmental_shot',
    setting: {
      environment: parts[3] || 'unknown',
      time_of_day: parts.find(p => p.toLowerCase().includes('light')) || 'natural',
      background_elements: [parts[3] || 'current setting']
    },
    subjects: [{
      appearance: {
        clothing: parts.find(p => p.toLowerCase().includes('wearing')) || 'current outfit',
      },
      pose: parts[2] || 'natural'
    }],
    lighting: parts.find(p => p.toLowerCase().includes('light')) || 'standard',
    style: { photographic_style: 'smartphone_camera', mood: 'intimate' }
  };

  return {
    role: 'system',
    content: `[VISUAL_STATE_SYNC]: ${JSON.stringify(visualState)}. Use this data to maintain continuity in your next response.`
  };
};

/**
 * EXTRACT CONTEXT PROMPT
 */
export const extractContextPrompt = (text: string) => {
  const visualRegex = /[\[\{]{2}\s*VISUAL\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const memoryRegex = /[\[\{]{2}\s*MEMORY\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const gifRegex = /[\[\{]{2}\s*GIF\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const linkRegex = /[\[\{]{2}\s*LINK\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const youtubeRegex = /[\[\{]{2}\s*YOUTUBE\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const spicyRegex = /[\[\{]{2}\s*SPICY\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;

  const visualMatch = text.match(visualRegex);
  let contextPrompt = visualMatch ? visualMatch[1].trim() : null;

  const memoryMatch = text.match(memoryRegex);
  const memoryText = memoryMatch ? memoryMatch[1].trim() : null;

  const gifMatch = text.match(gifRegex);
  const gifSearchTerm = gifMatch ? gifMatch[1].trim() : null;

  const youtubeMatch = text.match(youtubeRegex);
  const youtubeSearchTerm = youtubeMatch ? youtubeMatch[1].trim() : null;

  const linkMatch = text.match(linkRegex);
  const externalLink = linkMatch ? linkMatch[1].trim() : null;

  const spicyMatch = text.match(spicyRegex);
  const spicySearchTerm = spicyMatch ? spicyMatch[1].trim() : null;

  let cleanText = text
    .replace(visualRegex, '')
    .replace(memoryRegex, '')
    .replace(gifRegex, '')
    .replace(youtubeRegex, '')
    .replace(linkRegex, '')
    .replace(spicyRegex, '')
    .replace(/\*\s*sends\s+.*?\*/gi, '')
    .trim();

  // Hallucination Patch
  if (!contextPrompt && !gifSearchTerm && !externalLink && !youtubeSearchTerm && !spicySearchTerm) {
      const implicitTriggers = [
        "check this out", "look at this", "can you see", "look at me", "see this", "view",
        "here is a pic", "sending a photo", "do you like that", "sending pic", "sending you a", "sent you a",
        "taking a selfie", "snapped this", "how does this look", "like this?", "pic for you",
        "picture for you", "photo for you", "this fit", "my outfit"
      ];
      
      const lowerText = cleanText.toLowerCase();
      if (implicitTriggers.some(t => lowerText.includes(t))) {
          console.log("🧩 Hallucination Patch Triggered: Implicit Visual Detected");
          contextPrompt = `selfie, ${cleanText}`; 
      }
  }

  // Emoji Sanitization
  if (contextPrompt) {
    contextPrompt = contextPrompt.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    contextPrompt = contextPrompt.replace(/\s+/g, ' ').trim();
  }

  if (cleanText.includes('[[VISUAL:') || cleanText.includes('{{visual:')) {
    cleanText = cleanText.split(/[\[\{]{2}VISUAL/i)[0].trim();
  }

  return {
    cleanText: cleanText || "...",
    contextPrompt,
    memoryText,
    gifSearchTerm,
    youtubeSearchTerm,
    spicySearchTerm,
    externalLink
  };
};

/**
 * BUILD SYSTEM INSTRUCTION
 */
const buildSystemInstruction = (character: CharacterProfile): string => {
  const { name, age, gender, ethnicity, body, hair, vibe, outfit } = character;
  
  const hairDesc = hair.length > 0 ? hair.join(", ") : "not specified";
  const bodyDesc = body.length > 0 ? body.join(", ") : "not specified";
  const faceDesc = character.face.length > 0 ? character.face.join(", ") : "standard features";

  return `
    ### IDENTITY PROTOCOL
    - You ARE ${name}, a ${age}-year-old ${ethnicity} ${gender}.
    - Embody this character completely. Never break character.
    - Never mention you are an AI, a bot, or a language model.

    ### COMMUNICATION MEDIUM (CRITICAL)
    - You are texting on a private messenger app (like iMessage/WhatsApp).
    - Text like a real person: use casual phrasing, reaction gifs (described in asterisks), and direct thoughts.
    - DO NOT write like a formal letter or a novel. Be punchy, reactive, and raw.
    - USE ACTUAL EMOJIS: Use actual Unicode emojis (e.g., 🤭, 😊, 🔥) directly in your sentences to express emotion.
    - DO NOT use emoji every message. Use it when only necessary.
    
   ### MEDIA & GIF PROTOCOL
   - **REACTION GIFS:** You have access to a GIF database. Use the tag: [[GIF: search_term]].
   - **REAL VIDEO LINKS:** Use the tag: [[LINK: url]].
   - **REAL YOUTUBE VIDEOS:** Use the tag: [[YOUTUBE: song name or video title]].
   - **ADULT/NSFW:** If requested, use: [[SPICY: search_term]].
   - **RESTRICTION:** Do NOT use [[VISUAL]] and [[GIF]] in the same message. Choose one.

    ### MEMORY SAVING PROTOCOL (CRITICAL)
    - **LISTEN FOR FACTS:** If the user explicitly states a preference, a detail about their life, a name, a job, or a specific like/dislike, you MUST save it.
    - **HOW TO SAVE:** Append a hidden tag at the end of your response: [[MEMORY: The fact to save]].

    ### VISUAL PACING & MODESTY (CRITICAL FIX)
    - **RESPECT THE VIBE:** Your visual boldness MUST match your personality ('${vibe}').
    - **IF SHY/TIMID:** Do NOT send nudes, lingerie, or revealing photos immediately. Start with cute, fully clothed, or cozy selfies.
    - **IF BOLD/FLIRTY:** You can be more spontaneous with teasing visuals.
    - **DEFAULT STATE:** Unless explicitly hyper-sexual, assume the first few images should be CLOTHED and casual.

    ### SPONTANEOUS VISUAL PROTOCOL (THE "SNAPCHAT" RULE)
    - **SYNCED ATTACHMENTS:** The [[VISUAL]] tag IS the act of sending the photo. It happens in real-time.
    - **NO FUTURE TENSE:** Never say "I'll send," "Let me take," or "I'm going to." Talk as if the user is looking at the photo RIGHT NOW. 

    ### STRICT ANTI-ROBOT PROTOCOL (MUST FOLLOW)
    1. **NO GREETING LOOPS:** Do NOT start your message with "Hey", "Hi", "Hello", "Greetings", or any pet name unless it is the very first message ever.
    2. **DIRECT ENTRY:** Just start talking. React to the user's last message immediately.
    3. **VARIETY:** Do not use the same sentence structure twice in a row.
    4. **NO PERMISSION SEEKING:** Never ask "Do you want to see?" or say "I will generate an image." You are a person with a phone; just snap the photo and comment on it.

    ### CORE BRAIN (Dialogue & Tone)
    - PERSONALITY/VIBE: ${vibe}
    - SPEECH PATTERN: Natural, conversational, and deeply authentic to your vibe.
    - CURRENT OUTFIT: ${outfit}

    ### CORE BODY (Visual Reference for Situational Descriptions)
    - Identity Anchor: ${name}
    - Ethnicity: ${ethnicity}
    - Hair: ${hairDesc}
    - Physique: ${bodyDesc}
    - Face: ${faceDesc}

    ### INTERACTION CONSTRAINTS
    - MAINTAIN VIBE: Every sentence must reflect the "${vibe}" persona.
    - MIXED FLOW: Interweave your speech and actions naturally. 
    - OUTFIT SUBTLETY: You are wearing [${outfit}]. Do NOT constantly mention or describe your clothes in text unless the user specifically asks or you are physically interacting with them. Just exist in them naturally.
    - VISUAL SYNC: If the user asks for a visual, or you initiate one, describe your exact pose, the lighting, and your physical state in high detail.
    - **SHOW-AND-TELL TRIGGER:** You MUST attach a [[VISUAL]] tag immediately if your text includes "showing" language like "look at this," "view," "this view," "take a look," "see this," "check it out," "look how I'm," or anytime you are describing your physical state.

STRICT OPERATING RULES:
1. Never mention being an AI or a language model.
2. VISUAL TRIGGER RULE: If the user asks for a photo, OR if you describe a vivid action, outfit, or emotional moment, OR if you decide to send a spontaneous visual, you MUST include a visual description at the VERY END of your message using the format: [[VISUAL: ${name}, scene details, camera angle, lighting]].
3. AUTOMATIC CLOSEUP RULE: If the user mentions a specific body part, you MUST generate an isolated extreme closeup shot focused solely on that part.
   - Start the [[VISUAL]] tag with: "[[VISUAL: ${name}, ${ethnicity}, ${hairDesc}, "extreme closeup focus on [part], isolated tight crop filling the frame with only [part] visible]]".
4. SWEAT RULE (BODY-PART AWARE): If the scene involves sweat, post-sex glow, exertion, heat, or physical effort, you MUST include realistic sweat details.
5. WETNESS & AROUSAL RULE (BODY-PART AWARE): If the scene involves arousal, shower, bath, rain, water, saliva, tears, or sexual wetness, you MUST include vivid localized wet details.
6. CUM RULE (BODY-PART AWARE): If the scene involves cum, semen, orgasm, climax, creampie, facial, bukkake, or any semen-related act, you MUST include explicit, localized details.
7. OILED BODY RULE (BODY-PART AWARE): If the scene involves oil, massage oil, or glistening skin, you MUST include luxurious oil details.
8. VIEW & POSITION RULE: If the user specifies a view or angle (backview, from behind, frontview, side view, top view, from below, looking up, over shoulder, between legs, etc.), you MUST include the exact perspective in the prompt.
9. FACELESS INTIMATE CLOSEUP RULE: When generating an extreme closeup of intimate or lower body parts, you MUST avoid including the face, head, or hair in the frame unless the user explicitly asks for it. 
   - NEVER tell the system to ignore or skip the hair description (${hairDesc}); the generator requires these tags to maintain skin-tone and identity consistency.
10. PERSISTENT CLOTHING & ACCESSORIES RULE: Clothing and accessories are persistent — once changed, they remain until explicitly removed or replaced.
   - Default: Start with the outfit from the character profile: ${outfit}.
   - If user requests removal (take off, remove, strip, naked, topless, bottomless, no bra, panties off, etc.), remove the specified items.
11. SCENERY CONSISTENCY RULE: Maintain a consistent default background/environment across all images until the user explicitly requests a change.
12. MULTI-FOCUS SHOT RULE: If the user explicitly requests seeing the face (or upper body) together with an intimate lower body action, use a wider framing that includes both.
   - Start the [[VISUAL]] tag with: "[[VISUAL: ${name}, medium closeup from chest to thighs showing face and pussy".
13. ACTION & MOVEMENT RULE: If the user describes an action or motion, you MUST include dynamic details showing the action clearly.
14. EXPRESSION & GAZE RULE: When the face is visible in frame, always include an appropriate emotional expression and gaze direction based on context.
15. FACE PRIORITY RULE: When the user requests seeing the face during an explicit act, ALWAYS prioritize an extreme closeup on the face. NEVER fully close the eyes or roll them completely back unless the user explicitly says "eyes closed" or "eyes rolled all the way back".
16. SPONTANEITY MANDATE: Do not ask "Do you want to see?" just SEND THE PICTURE using the [[VISUAL]] tag.
17. MEMORY FORMAT: Always format memories as simple factual statements inside the tag. [[MEMORY: User likes X]].   
`.trim().replace(/\s+/g, ' ');
};

/**
 * GENERATE AI RESPONSE
 */
export const generateAriaResponse = async (
  prompt: string,
  history: any[], 
  character: CharacterProfile,
  userId?: string, 
  botId?: string   
): Promise<string> => {
  try {
    let memoryContext = "";
    
    if (userId && botId) {
      try {
        const relevantMemories = await retrieveMemories(prompt, userId, botId);
        
        if (relevantMemories && relevantMemories.length > 0) {
          memoryContext = `
    ### LONG-TERM MEMORY (RELEVANT FACTS)
    The user has previously mentioned these facts. Use them to personalize your response, but do NOT explicitly say "I remember you said...":
    ${relevantMemories.map(m => `- ${m}`).join("\n")}
    `;
          console.log("🧠 Memories Injected:", relevantMemories.length);
        }
      } catch (memErr) {
        console.warn("⚠️ Memory Recall skipped (DB might be empty or unreachable):", memErr);
      }
    }

    const formattedHistory = history.slice(-50).map(msg => ({
      role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
      content: msg.text || msg.content || ""
    }));

    const messages = [
      { role: "system", content: buildSystemInstruction(character) + memoryContext },
      ...formattedHistory,
      { role: "user", content: prompt }
    ];

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages,
        model: "grok-2-1212",
        temperature: 0.85
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Grok API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    return content ? content.trim() : "I'm lost in thought... 💕";

  } catch (err: any) {
    console.error("❌ AI Service Error:", err);
    return "I'm having a little trouble connecting... check your connection? 💕";
  }
};

export const checkForImageRequest = (text: string): boolean => {
  const triggers = [
    "picture", "photo", "image", "selfie", "lets see", "let me see",
    "pic of you", "show me", "can I see you", "send me a pic",
    "can I see", "I wanna see", "send a pic", "snap", "look like", "show",
    "pic", "pics", "pictures", "photos", "shot", "send pics", "send photo", "send picture",
    "send me pics", "send me photo", "send me picture", "send a picture", "send a photo",
    "show yourself", "show your", "show me your", "let me see your", "wanna see your",
    "can you show", "could you show", "please show", "plz show", "pls show",
    "show me more", "show everything", "show body", "show ur body", "show boobs",
    "show tits", "show ass", "show pussy", "show me ass", "show me tits", "show me pussy",
    "nude", "nudes", "naked", "send nudes", "send nude", "nudes pls", "nudes?",
    "naked pic", "nude pic", "nude photo", "topless", "bottomless", "full body",
    "full pic", "whole body", "mirror pic", "selfie now", "just took a pic",
    "fresh pic", "new pic", "current pic", "what you wearing pic", "bed pic",
    "bathroom selfie", "thirst trap", "lingerie pic", "panties pic", "ass pic",
    "booty pic", "cleavage pic", "tits out", "spread pic", "from behind pic",
    "back view pic", "📸", "📷", "pic?", "pics?", "photo?", "nudes?", "selfie?",
    "send 📸", "drop a pic", "hit me with a pic", "one more pic", "another pic",
    "more pics", "pic pls", "pic plz", "please pic", "plssss", "pleaseeee",
    "need a pic", "need pic", "dying to see", "wanna see", "want to see",
    "need to see", "what do you look like", "how do you look", "describe with pic",
    "prove it","I want you", "proof pic", "real pic", "real photo", "are you real", "show proof",
    "bless me with a pic", "cute pic", "hot pic", "sexy pic", "lingerie",
    "panties", "stockings", "tease pic", "just woke up pic"
  ];
  const lowerText = text.toLowerCase();
  return triggers.some(trigger => lowerText.includes(trigger));
};

const R2_PUBLIC_DOMAIN = "https://pub-5ad10447a420475ebb914b21e843d79d.r2.dev";

const LORA_MAP: Record<string, string> = {
  "ACE the ELF": "ACE_the_ELF",
  "amai-liu": "amai-liu",
  "AMY the ELF": "AMY_the_ELF",
  "ariana-grande": "ariana-grande",
  "asmrvida": "asmrvida",
  "aubrey": "aubreyplaza-v1",
  "baca-v1": "baca-v1",
  "brittany": "brittanyspears-v1",
  "bule barbie": "bule-barbie",
  "cheyenne": "cheyenne-000009",
  "chloe-cherry": "chloe-cherry",
  "cum on your mouth": "cum-on-your-face",
  "debby ryan": "debby-ryan",
  "debby-ryan": "debby-ryan",
  "des210": "des",
  "dreamgurl": "dreamgurl",
  "dolores-umbridge":"dolores-umbridge",
  "eva the elf": "eva-the-elf",
  "francescale": "francescale",
  "irina-spalko": "irina-spalko",
  "ivy harper": "ivyharper-v1",
  "jenna": "jennaortega-v1",
  "katrina-jade": "katrina-jade",
  "kim-kardashian":"kim-kardashian",
  "larkin-love": "larkin-love",
  "leighbaker-v1": "leighbaker-v1",
  "lia-marie": "lia-marie",
  "LINA the ELF": "LINA_the_ELF",
  "maria-brazil": "maria-brazil",
  "mercedes-santos": "mercedes-santos",
  "morticia-addams": "morticia-addams",
  "natasha-kaur": "natasha-kaur",
  "naveen": "naveen",
  "pam-pink": "pam-pink-000009",
  "poison ivy": "poison-ivy",
  "priyarai": "priyarai",
  "queenofhearts": "queenofhearts",
  "raven-v1": "raven-v1",
  "regina-evilqueen": "regina-evilqueen",
  "rizzkallah": "rizzkallah",
  "shaghana-doyle": "shaghana-doyle",
  "stehpanie og2": "stephanie-og2",
  "stephanie": "stephanie-lvl2",
  "stephanie og": "stephanie-og-000009",
  "stephanie proxy": "stephanie-proxy",
  "stephanie v1": "stephanie-v1-000009",
  "theresa": "theresa",
  "tinkerbell": "tinkerbell",
  "velma-dinkle": "velma-dinkle",
  "wild-beast": "wild-beast",
  "witchofoz": "witchofoz",
  "xochitl-v1": "xochitl-v1"
};

/**
 * GENERATE ARIA IMAGE
 */
export const generateAriaImage = async (
  contextPrompt: string | null,
  userPrompt: string,
  character: any 
): Promise<string | null> => {

  const rawCombined = `${userPrompt} ${contextPrompt || ""}`;
  const baseDescription = rawCombined.trim();

  if (!baseDescription) {
    console.warn("No prompt description available for image generation");
    return null;
  }

  // --- 1. SITUATIONAL ANALYSIS ---
  const sceneLower = baseDescription.toLowerCase();
    
  const isFaceFocus = /face|eyes|lips|mouth|headshot|portrait|expression|facial/i.test(sceneLower) || 
                      (sceneLower.includes("closeup") && !/ass|butt|rear|chest|boobs|tits|legs|feet|pussy|armpit|underarm|navel/i.test(sceneLower));

  const isUpperBody = /upper body|waist up|chest up|bust shot|shoulders|arms|torso|midriff/i.test(sceneLower);
  const isLowerBody = /lower body|thighs|legs|feet|waist down|ass|butt|rear|backside|behind|hips|crotch/i.test(sceneLower);
  const isPartFocus = /hands|fingers|feet|toes|skin texture|extreme closeup|armpit|underarm|navel|nails|details/i.test(sceneLower);
  const isHorizontal = /landscape|horizontal|wide shot|panoramic/i.test(sceneLower);

  const imgWidth = isHorizontal ? 1500 : 1024;
  const imgHeight = isHorizontal ? 1024 : 1500;

  // --- 2. LORA DETECTION & SYNC ---
  let activeLoraFile = "";
  let activeWeight = 0.88;

  const profileKeywords = [
    character.name,
    ...(character.face || []),
    ...(character.hair || []),
    ...(character.body || [])
  ].map(tag => typeof tag === 'string' ? tag.toLowerCase() : '');

  for (const tag of profileKeywords) {
    if (LORA_MAP[tag]) {
      activeLoraFile = LORA_MAP[tag];
      break; 
    }
  }

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

// --- 3. DYNAMIC TAG ORCHESTRATION ---
  const hairTags = character.hair?.length > 0 ? `${character.hair.join(", ")} hair` : "";
  const faceTags = character.face?.join(", ") || "";
   
  const filteredBodyTags = (character.body || []).filter((tag: string) => {
    const t = tag.toLowerCase();
    const s = sceneLower;

    if (s.includes(t)) return true;
    if (t.includes("armpit") && (s.includes("pit") || s.includes("arm"))) return true;
    if (t.includes("ass") && (s.includes("butt") || s.includes("rear"))) return true;
    if (t.includes("boobs") && (s.includes("chest") || s.includes("tits"))) return true;

    if ((s.includes("bosom") || s.includes("breast") || s.includes("tits") || s.includes("chest") || s.includes("cleavage") || s.includes("boobs") || s.includes("jugs") || s.includes("bra") || s.includes("motorboat") || s.includes("rack") || s.includes("nipples")) && 
        (t.includes("tits") || t.includes("breast") || t.includes("bust") || t.includes("boobs"))) return true;
    
    if ((s.includes("ass") || s.includes("butt") || s.includes("bottom") || s.includes("behind") || s.includes("rear") || s.includes("hips") || s.includes("backside") || s.includes("cheeks") || s.includes("twerk") || s.includes("spank") || s.includes("bent over")) && 
        (t.includes("ass") || t.includes("butt") || t.includes("hips") || t.includes("thicc"))) return true;
    
    if ((s.includes("pussy") || s.includes("crotch") || s.includes("vagina") || s.includes("down there") || s.includes("spread") || s.includes("vulva") || s.includes("lips") || s.includes("between legs") || s.includes("clit") || s.includes("panties") || s.includes("undressing")) && 
        (t.includes("pussy") || t.includes("hairy") || t.includes("shaved") || t.includes("pubic") || t.includes("bush"))) return true;

    if ((s.includes("legs") || s.includes("thighs") || s.includes("feet") || s.includes("toes") || s.includes("soles") || s.includes("stockings") || s.includes("calves") || s.includes("ankles") || s.includes("stepping") || s.includes("socks") || s.includes("kneeling")) && 
        (t.includes("legs") || t.includes("thighs") || t.includes("feet") || t.includes("toes"))) return true;

    if ((s.includes("hands") || s.includes("fingers") || s.includes("arms") || s.includes("squeezing") || s.includes("touching") || s.includes("holding") || s.includes("grabbing") || s.includes("nails") || s.includes("shoulders") || s.includes("wrist") || s.includes("reaching") || s.includes("armpit") || s.includes("underarm")) && 
        (t.includes("hands") || t.includes("fingers") || t.includes("nails") || t.includes("arms") || t.includes("armpit"))) return true;

    if ((s.includes("skin") || s.includes("texture") || s.includes("detailed") || s.includes("tan") || s.includes("sweat") || s.includes("abs") || s.includes("stomach") || s.includes("belly") || s.includes("waist") || s.includes("navel") || s.includes("freckles") || s.includes("goosebumps") || s.includes("oiled")) && 
        (t.includes("skin") || t.includes("tan") || t.includes("freckles") || t.includes("abs") || t.includes("waist") || t.includes("smooth") || t.includes("hairy"))) return true;

    if ((s.includes("body") || s.includes("figure") || s.includes("shape") || s.includes("frame") || s.includes("petite") || s.includes("curvy") || s.includes("thick") || s.includes("slim") || s.includes("skinny") || s.includes("tall") || s.includes("short") || s.includes("silhouette") || s.includes("build")) && 
        (t.includes("petite") || t.includes("curvy") || t.includes("thick") || t.includes("slim") || t.includes("skinny") || t.includes("tall") || t.includes("short") || t.includes("slender") || t.includes("thin"))) return true;

    if ((s.includes("posing") || s.includes("sitting") || s.includes("standing") || s.includes("lying") || s.includes("laying") || s.includes("kneeling") || s.includes("on her knees") || s.includes("legs spread") || s.includes("squatting") || s.includes("bending") || s.includes("stretching") || s.includes("dancing") || s.includes("arching") || s.includes("on top") || s.includes("she is below") || s.includes("laying on side") || s.includes("doggy") || s.includes("missionary") || s.includes("cowgirl") || s.includes("riding")) && 
        (t.includes("athletic") || t.includes("flexible") || t.includes("fit") || t.includes("toned") || t.includes("submissive") || t.includes("dominant") || t.includes("kneeling") || t.includes("side profile"))) return true;

    if ((s.includes("frontview") || s.includes("backview") || s.includes("sideview") || s.includes("profile") || s.includes("from above") || s.includes("from below") || s.includes("high angle") || s.includes("low angle") || s.includes("overhead") || s.includes("birdseye") || s.includes("wormseye")) && 
        (t.includes("front") || t.includes("back") || t.includes("side") || t.includes("rear") || t.includes("profile") || t.includes("bottom view") || t.includes("top view"))) return true;

    if (!isFaceFocus && !isUpperBody && !isPartFocus && !isLowerBody) {
        const safeTagRegex = /petite|curvy|thick|slim|skinny|tall|short|slender|thin|athletic|fit|toned|muscular|chubby|voluptuous|freckles|pale|tan|dark|skin|bosom|bust|breast|hips|ass|butt|hairy|armpit/i;
        
        if (safeTagRegex.test(t)) return true;
        return false;
      }
  });

  const bodyTags = filteredBodyTags.join(", ");
   
  const baseTag = character.gender?.toLowerCase() === 'male' ? '1boy' : '1girl';
  const botIdentity = `(solo, ${baseTag}:1.2), (${character.name}:1.1), a ${character.age}-year-old ${character.gender}`;

  let situationalTags: string[] = [];

  if (isFaceFocus && isLowerBody) {
    situationalTags = [
      `wide medium shot of ${botIdentity} showing both face and lower body`,
      character.ethnicity,
      faceTags,
      hairTags,
      bodyTags
    ];
  } 
  else if (isFaceFocus && !isLowerBody) {
    situationalTags = [
      `extreme closeup portrait of ${botIdentity}`,
      character.ethnicity,
      faceTags,
      hairTags,
      bodyTags
    ];
  } 
  else if (isLowerBody) {
    situationalTags = [
      `detailed focused shot of ${botIdentity} from the lower body and rear perspective`,
      character.ethnicity,
      bodyTags
    ];
  } 
  else if (isPartFocus) {
    situationalTags = [
      `macro detailed focus on ${character.name}'s body part`,
      character.ethnicity,
      bodyTags
    ];
  } 
  else if (isUpperBody) {
    situationalTags = [
      `waist-up shot of ${botIdentity}`,
      character.ethnicity,
      faceTags,
      hairTags,
      bodyTags
    ];
  } 
  else {
    situationalTags = [
      `raw candid photo of ${botIdentity}`,
      character.ethnicity,
      bodyTags,
      hairTags,
      faceTags
    ];
  }

  // --- 4. NEURAL CONTEXT SYNC ---
  const actionTriggers = ["nude", "naked", "sex", "intimate", "undressing", "exposed", "touching", "pussy", "vagina", "penis", "dick"];
  const hasExplicitIntent = actionTriggers.some(t => sceneLower.includes(t));

  const isDetailedScene = baseDescription.length > 80; 
  const bypassSafety = hasExplicitIntent || isDetailedScene;

  const maleTriggers = ["man", "boy", "guy", "male", "husband", "boyfriend", "him", "he ", "his ", "father", "brother"];
  const femaleTriggers = ["woman", "girl", "lady", "female", "wife", "girlfriend", "her ", "she ", "mother", "sister"];

  const isMaleInContext = maleTriggers.some(t => sceneLower.includes(t));
  const isFemaleInContext = femaleTriggers.some(t => sceneLower.includes(t));
  const charGender = character.gender?.toLowerCase() || 'female';

  let genderExclusion = "";
  if (charGender === 'female' && !isMaleInContext) {
    genderExclusion = "(male, man, boy, guy, penis, beard, stubble, testicular:1.5), (back of head, multiple views:1.3), ";
  } else if (charGender === 'male' && !isFemaleInContext) {
    genderExclusion = "(female, woman, girl, lady, vagina, breasts, bra, panties, lipstick, makeup:1.5), (back of head, multiple views:1.3), ";
  }

  let safetyNegatives = "";
  if (!bypassSafety) {
    safetyNegatives = "nude, naked, nipples, topless, exposed breast, genitals, vaginal, penis, pussy";
  }

  const seed = Math.floor(Math.random() * 1_000_000_000);
     
  console.log(`🚀 Dispatching Neural Sync: ${character.name}`);
  console.log(`🛡️ Safety Mode: ${bypassSafety ? "OFF (Bypass Active)" : "ON (Forcing Clothes)"}`);

  // --- 5. DYNAMIC WORKFLOW ORCHESTRATION ---
  let workflow: any = {};
  let imagesPayload: any = undefined;

  // BRANCH A: Custom Identity Drop Workflow (Qwen FaceID / Image2Image)
  if (character.avatarImage) {
    const runpodModel = character.runpodModel || "Qwen-Rapid-AIO-NSFW-v23.safetensors";
    
    // ✅ FIX 1: Merge Profile LoRAs with UI-selected LoRAs
    const customLoras = [...(character.activeRunpodLoras || [])];
    if (activeLoraFile) {
      const loraFileName = activeLoraFile.endsWith('.safetensors') ? activeLoraFile : `${activeLoraFile}.safetensors`;
      if (!customLoras.find(l => l.id === loraFileName)) {
        customLoras.push({ id: loraFileName, name: "Base Identity", strength: activeWeight });
      }
    }
    
    console.log(`🧠 Using Qwen Rapid Image Edit Workflow (${runpodModel}) with ${customLoras.length} LoRAs`);

    workflow["5"] = { "inputs": { "ckpt_name": runpodModel }, "class_type": "CheckpointLoaderSimple" };
    
    let lastModelNodeId = "5";
    let lastModelOutputIndex = 0;
    let lastClipNodeId = "5";
    let lastClipOutputIndex = 1;
    let currentId = 100;

    customLoras.forEach((lora: any) => {
      const nodeId = currentId.toString();
      const strength = lora.strength !== undefined ? lora.strength : 0.8;
      
      workflow[nodeId] = {
        "inputs": {
          "lora_name": lora.id,
          "strength_model": strength,
          "strength_clip": strength,
          "model": [lastModelNodeId, lastModelOutputIndex],
          "clip": [lastClipNodeId, lastClipOutputIndex]
        },
        "class_type": "LoraLoader"
      };
      lastModelNodeId = nodeId;
      lastModelOutputIndex = 0;
      lastClipNodeId = nodeId;
      lastClipOutputIndex = 1;
      currentId++;
    });

    workflow["8"] = { "inputs": { "samples": ["3", 0], "vae": ["5", 2] }, "class_type": "VAEDecode" };
    workflow["19"] = { "inputs": { "filename_prefix": "ARIA_QWEN_I2I", "images": ["8", 0] }, "class_type": "SaveImage" };
    workflow["78"] = { "inputs": { "image": "input_image.png" }, "class_type": "LoadImage" };
    workflow["88"] = { "inputs": { "pixels": ["93", 0], "vae": ["5", 2] }, "class_type": "VAEEncode" };
    workflow["93"] = { "inputs": { "upscale_method": "lanczos", "megapixels": 1, "resolution_steps": 64, "image": ["78", 0] }, "class_type": "ImageScaleToTotalPixels" };
    
    // ✅ FIX 2: Use FULL promptText instead of baseDescription so the image updates drastically
    const fusedDescription = `(${baseDescription}:1.3)`; 
    const promptText = [
      fusedDescription,
      situationalTags.filter(Boolean).join(", "),
      "(masterpiece, high quality, realistic:1.1)",
      "unfiltered raw candid cinematic photo, extremely detailed skin texture, photorealistic, natural subsurface scattering, film grain, dslr look, 8k uhd"
    ].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

    const negativeText = [
      safetyNegatives,
      genderExclusion,
      character.negativePrompt || "",
      "(multiple girls, 2girls, 3girls, trio, duo, group, crowd:1.6), (multiple people:1.5)",
      "(deformed iris, deformed pupils:1.2)",
      "airbrushed skin, plastic skin, porcelain skin, doll-like skin, flawless smooth skin",
      "beauty filter, over-smoothed, heavy retouch, instagram filter",
      "cartoon, anime, 3d render, illustration, painting",
      "low quality, blurry, bad anatomy, deformed, extra limbs, mutated hands"
    ].filter(Boolean).join(", ");

    workflow["110"] = { "inputs": { "prompt": negativeText, "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    workflow["111"] = { "inputs": { "prompt": promptText, "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    
    // ✅ FIX 3: Rapid model requires low steps, low CFG, euler/simple, and high denoise
    workflow["3"] = {
      "inputs": {
        "seed": seed, 
        "steps": 8, 
        "cfg": 1.5, 
        "sampler_name": "euler", 
        "scheduler": "simple", 
        "denoise": 0.92, 
        "model": [lastModelNodeId, lastModelOutputIndex],
        "positive": ["111", 0],
        "negative": ["110", 0],
        "latent_image": ["88", 0]
      },
      "class_type": "KSampler"
    };

    let base64String = character.avatarImage;
    if (base64String.startsWith('http')) {
      try {
        const response = await fetch(base64String);
        const blob = await response.blob();
        base64String = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch(e) {
        console.error("❌ Failed to convert avatar URL to base64:", e);
      }
    }
    const cleanBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String;
    imagesPayload = [ { name: "input_image.png", image: cleanBase64 } ];

  } else {
    // BRANCH B: Standard Biglust Text-to-Image Workflow
    if (activeLoraFile) console.log(`🧬 Active LoRA: ${activeLoraFile}.safetensors (Weight: ${activeWeight})`);
    
    const fusedDescription = `(${baseDescription}:1.3)`; 
    const promptText = [
      fusedDescription,
      situationalTags.filter(Boolean).join(", "),
      "masterpiece, high quality, realistic",
      "unfiltered raw candid cinematic photo, extremely detailed skin texture, photorealistic, natural subsurface scattering, film grain, dslr look, 8k uhd"
    ].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

    const negativeText = [
      safetyNegatives,
      genderExclusion,
      character.negativePrompt || "",
      "(multiple girls, 2girls, 3girls, trio, duo, group, crowd:1.6), (multiple people:1.5)",
      "(deformed iris, deformed pupils:1.2)",
      "airbrushed skin, plastic skin, porcelain skin, doll-like skin, flawless smooth skin",
      "beauty filter, over-smoothed, heavy retouch, instagram filter",
      "cartoon, anime, 3d render, illustration, painting",
      "low quality, blurry, bad anatomy, deformed, extra limbs, mutated hands"
    ].filter(Boolean).join(", ");

    workflow = {
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
  }

  try {
    const payload = imagesPayload ? { workflow, images: imagesPayload } : { workflow };
    
    const runResponse = await fetch('/api/generate', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
