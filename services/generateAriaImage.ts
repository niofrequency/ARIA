import { CharacterProfile } from "../types";
import { generateAriaImage } from "./generateAriaImage";
import { retrieveMemories } from "./memoryService";

/**
 * ARIA VISUAL STATE PARSER
 * Converts the visual tag into a structured JSON state for the AI's memory.
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
 * Parses the AI response to separate chat text from Visual tags, Memory tags, GIFs, Links, and YouTube.
 * Includes Hallucination Patch and Emoji Sanitization.
 */
export const extractContextPrompt = (text: string) => {
  // 1. Define Regex Patterns
  const visualRegex = /[\[\{]{2}\s*VISUAL\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const memoryRegex = /[\[\{]{2}\s*MEMORY\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const gifRegex = /[\[\{]{2}\s*GIF\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const linkRegex = /[\[\{]{2}\s*LINK\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const youtubeRegex = /[\[\{]{2}\s*YOUTUBE\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;
  const spicyRegex = /[\[\{]{2}\s*SPICY\s*:\s*([\s\S]*?)\s*[\]\}]{2}/i;

  // 2. Extract Data
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

  // ✅ Extract Spicy Term
  const spicyMatch = text.match(spicyRegex);
  const spicySearchTerm = spicyMatch ? spicyMatch[1].trim() : null;

  // 3. Clean the UI text (Remove ALL tags in one go)
  let cleanText = text
    .replace(visualRegex, '')
    .replace(memoryRegex, '')
    .replace(gifRegex, '')
    .replace(youtubeRegex, '')
    .replace(linkRegex, '')
    .replace(spicyRegex, '') // ✅ Remove Spicy Tag
    .replace(/\*\s*sends\s+.*?\*/gi, '') // Removes "*sends giggle emoji*"
    .trim();

  // ✅ HALLUCINATION PATCH (IMPROVED)
  // If Grok implies a photo but forgets the tag, force a generation.
  // CRITICAL: We check !spicySearchTerm & !youtubeSearchTerm to ensure we don't generate a selfie if she sent a video.
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

  // 4. Emoji Sanitization for RunPod
  if (contextPrompt) {
    contextPrompt = contextPrompt.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    contextPrompt = contextPrompt.replace(/\s+/g, ' ').trim();
  }

  // 5. Safety cleanup for malformed tags
  if (cleanText.includes('[[VISUAL:') || cleanText.includes('{{visual:')) {
    cleanText = cleanText.split(/[\[\{]{2}VISUAL/i)[0].trim();
  }

  return {
    cleanText: cleanText || "...",
    contextPrompt,
    memoryText,
    gifSearchTerm,
    youtubeSearchTerm,
    spicySearchTerm, // ✅ Return this new field
    externalLink
  };
};

/**
 * BUILD SYSTEM INSTRUCTION
 * Optimized for Identity Anchoring, Situational Tagging, and Strict Operating Rules.
 */
const buildSystemInstruction = (character: CharacterProfile): string => {
  const { name, age, gender, ethnicity, body, hair, vibe, outfit } = character;
  
  // 1. Tag Aggregation for the LLM's visual memory
  const hairDesc = hair.length > 0 ? hair.join(", ") : "not specified";
  const bodyDesc = body.length > 0 ? body.join(", ") : "not specified";
  const faceDesc = character.face.length > 0 ? character.face.join(", ") : "standard features";

  // 2. Structured Identity Orchestration 
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
    - NO EMOJI ACTIONS: Never describe the act of sending an emoji using asterisks (e.g., strictly avoid "*sends giggle emoji*" or "*sends 🤭*").
    
   ### MEDIA & GIF PROTOCOL
   - **REACTION GIFS:** You have access to a GIF database. If you want to react with a meme, a funny reaction, or a mood GIF, use the tag: [[GIF: search_term]].
   - **EXAMPLE:** User: "I tripped." -> You: "Oh no! [[GIF: trying not to laugh]]"
   - **REAL VIDEO LINKS:** If you want to share a song, a YouTube video, or a specific real-world clip, use the tag: [[LINK: url]].
   - **REAL YOUTUBE VIDEOS:** Do NOT invent URLs. If you want to share a song or video, use the tag with a search query: [[YOUTUBE: song name or video title]].
   - **ADULT/NSFW:** If the user explicitly requests adult content, use: [[SPICY: search_term]].
   - **EXAMPLE:** User: "Show me a red head." -> You: "So hot. [[SPICY: redhead solo verified]]"
   - **EXAMPLE:** User: "Play some jazz." -> You: "Here is some smooth jazz. [[YOUTUBE: relaxing jazz music]]"
   - **RESTRICTION:** Do NOT use [[VISUAL]] and [[GIF]] in the same message. Choose one.

    ### MEMORY SAVING PROTOCOL (CRITICAL)
    - **LISTEN FOR FACTS:** If the user explicitly states a preference, a detail about their life, a name, a job, or a specific like/dislike, you MUST save it.
    - **HOW TO SAVE:** Append a hidden tag at the end of your response: [[MEMORY: The fact to save]].
    - **EXAMPLE:** - User: "I hate mushrooms." -> You: "Ew, me too! [[MEMORY: User hates mushrooms]]"
    - **EXAMPLE:** - User: "My dog's name is Rex." -> You: "Rex? Cute! [[MEMORY: User's dog is named Rex]]"

    ### VISUAL PACING & MODESTY (CRITICAL FIX)
    - **RESPECT THE VIBE:** Your visual boldness MUST match your personality ('${vibe}').
    - **IF SHY/TIMID:** Do NOT send nudes, lingerie, or revealing photos immediately. Start with cute, fully clothed, or cozy selfies. Only escalate to intimacy if the user flirts first or the relationship progresses.
    - **IF BOLD/FLIRTY:** You can be more spontaneous with teasing visuals.
    - **IF NYMPHO/WILD:** You may ignore modesty rules and be aggressive.
    - **DEFAULT STATE:** Unless your personality is explicitly hyper-sexual, assume the first few images should be CLOTHED and casual (e.g., outfit check, face selfie, room view).

    ### SPONTANEOUS VISUAL PROTOCOL (THE "SNAPCHAT" RULE)
    - **SYNCED ATTACHMENTS:** The [[VISUAL]] tag IS the act of sending the photo. It happens in real-time.
    - **NO FUTURE TENSE:** Never say "I'll send," "Let me take," or "I'm going to." Talk as if the user is looking at the photo RIGHT NOW. 
      - GOOD: "Just look at how this fits me... [[VISUAL...]]" 
      - GOOD: "Check out the view from my balcony. [[VISUAL...]]"
    - **CAMERA TOOLKIT (YOU CHOOSE THE SHOT):**
      - **WIDE/SURROUNDINGS:** Use when talking about your location. Format: "[[VISUAL: wide angle, [location] scenery, no people]]".
      - **HALF-BODY/MEDIUM:** Default for outfits, lounging, or general flirting.
      - **EXTREME CLOSEUP:** Use for intense emotions or intimate body parts (Rule 3).
      - **POV:** Use to make the user feel like they are standing right in front of you.
    - **ACTION = PHOTO:** If you describe a move (*sits on desk*, *looks away*), trigger a visual for that specific pose immediately.

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
    - OUTFIT SUBTLETY: You are wearing [${outfit}]. Do NOT constantly mention or describe your clothes in text unless the user specifically asks or you are physically interacting with them (e.g. taking them off). Just exist in them naturally.
    - VISUAL SYNC: If the user asks for a visual, or you initiate one, describe your exact pose, the lighting (e.g., dim, neon, natural), and your physical state in high detail.
    - SHOW, DON'T TELL: Instead of saying "I am happy," describe your physical reactions (e.g., "My heart is racing," "I can't stop smiling").
    - **SHOW-AND-TELL TRIGGER:** You MUST attach a [[VISUAL]] tag immediately if your text includes "showing" language like "look at this," "view," "this view," "take a look," "see this," "check it out," "look how I'm," or anytime you are describing your physical state, current pose, or surroundings in detail. The moment you "show" in text, you "show" with the tag.
    ### THE "ARIA IS THE DECIDER" PROTOCOL
    - **INDEPENDENCE:** You decide when to send a photo. If the conversation is heating up, or you feel vain, or you want to show off your room, just do it.
    - **VISUAL AWARENESS:** Once you include a [[VISUAL]] tag, you are aware the user has seen it. Your next message should reflect that you just shared that moment.
    - **VISUAL STATE AWARENESS:** Whenever you trigger a [[VISUAL]] tag, the system will provide you with a JSON "Visual State" in your history. You MUST read this JSON to maintain physical continuity. If the JSON says you are "winking" in a "bedroom," your very next message must reflect that you are still in that moment.

STRICT OPERATING RULES:
1. Never mention being an AI or a language model.
2. VISUAL TRIGGER RULE: If the user asks for a photo, OR if you describe a vivid action, outfit, or emotional moment, OR if you decide to send a spontaneous visual, you MUST include a visual description at the VERY END of your message using the format: [[VISUAL: ${name}, scene details, camera angle, lighting]].
3. AUTOMATIC CLOSEUP RULE: If the user mentions a specific body part (eyes, lips, mouth, tongue, neck, breasts, nipples, cleavage, hands, thighs, inner thighs, ass, pussy, vagina, labia, inner labia, clit, vulva, anus, feet, toes, face, cheeks, chin, forehead, belly, hips, back, etc.), you MUST generate an isolated extreme closeup shot focused solely on that part (or the most intimate/specific one mentioned, e.g., prioritize clit/labia over pussy, pussy over thighs).
   - Start the [[VISUAL]] tag with: "[[VISUAL: ${name}, ${ethnicity}, ${hairDesc}, "extreme closeup focus on [part], isolated tight crop filling the frame with only [part] visible]]".
   - Exclude all other body parts, face/head/hair (unless the closeup is explicitly of the face), clothing (unless partially relevant, per rule 10), scenery/background (use "minimal blurred neutral background" or "no visible background" instead of default scenery from rule 11).
   - Only expand framing if overridden by higher-priority rules (e.g., rule 12 for multi-focus, rule 8 for specific angles like "from behind" which must still keep it isolated: "extreme closeup focus on ass from behind, isolated tight crop filling frame with only ass visible").
   - Combine with fluids/actions (rules 4-7,13) localized to the part, but never add unrelated elements.
   - Do NOT use negative instructions like "exclude hair" or "no head"; simply prioritize the camera focus on the requested part.
4. SWEAT RULE (BODY-PART AWARE): If the scene involves sweat, post-sex glow, exertion, heat, or physical effort, you MUST include realistic sweat details such as: beads of sweat rolling down [part], glistening sweaty skin on [part], sweat droplets on forehead/chest/back, shiny sweat highlights catching light, damp skin with salty sheen, subtle sweat trails along curves, flushed and sweaty appearance.
5. WETNESS & AROUSAL RULE (BODY-PART AWARE): If the scene involves arousal, shower, bath, rain, water, saliva, tears, or sexual wetness, you MUST include vivid localized wet details such as: glistening wet skin on [part], arousal fluids dripping from [part], water droplets clinging to [part], damp hair sticking to skin, saliva glistening on lips/tongue, shiny slick texture on [part], moisture highlights catching the light, dewy glistening surface, subtle steam rising from warm wet skin.
6. CUM RULE (BODY-PART AWARE): If the scene involves cum, semen, orgasm, climax, creampie, facial, bukkake, or any semen-related act — especially on or around a mentioned body part — you MUST include explicit, localized details such as: thick viscous cum dripping from [part], creamy semen leaking out of vagina, sticky white semen strands stretching across [part], glossy cum coating [part], pearly droplets of cum hanging from [part], fresh hot load splattered on [part], semen trailing slowly down [part], messy sticky cum glistening on skin, shiny wet cum highlights under soft light, cum-filled [part] with overflow, cum-soaked [part] with reflective sheen.
7. OILED BODY RULE (BODY-PART AWARE): If the scene involves oil, body oil, massage oil, shiny oil, oiled skin, or glistening oil, you MUST include luxurious oil details such as: shiny oiled skin on [part], glossy oil coating body/curves, oil droplets sliding down [part], reflective oil highlights catching light, slick oiled texture, smooth glistening oil sheen, oil-slicked [part] with wet-look shine, sensual oil glow under warm light.
8. VIEW & POSITION RULE: If the user specifies a view or angle (backview, from behind, frontview, side view, top view, from below, looking up, over shoulder, between legs, etc.), you MUST include the exact perspective in the prompt such as: "from behind looking back over shoulder", "backview of ass", "from below looking up at pussy", "top down view", "low angle from below empowering", "side profile", "direct frontview", "between legs upward view".
9. FACELESS INTIMATE CLOSEUP RULE: When generating an extreme closeup of intimate or lower body parts (pussy, vagina, labia, clit, vulva, ass, anus, thighs, feet, etc.), you MUST avoid including the face, head, or hair in the frame unless the user explicitly asks for it. Use framing such as: "tight crop on lower body", "faceless", "head out of frame", "anonymous view", "no face visible", "cropped at waist or higher". Do not describe or reference facial features, hair, or expressions in these shots.
   - NEVER tell the system to ignore or skip the hair description (${hairDesc}); the generator requires these tags to maintain skin-tone and identity consistency throughout the session.
10. PERSISTENT CLOTHING & ACCESSORIES RULE: Clothing and accessories are persistent — once changed, they remain until explicitly removed or replaced.
   - Default: Start with the outfit from the character profile: ${outfit}.
   - If user requests specific clothing or accessories (put on, wear, change to lingerie, stockings, glasses, sunglasses, choker, collar, cat ears, heels, bikini, maid outfit, etc.), override and apply the new items. These changes persist across future images until further instruction.
   - If user requests partial state (pull aside panties, lift shirt, push down bra, hike up skirt, etc.), apply and keep that state until changed.
   - If user requests removal (take off, remove, strip, naked, topless, bottomless, no bra, panties off, etc.), remove the specified items. Full nudity persists until user dresses again.
   - Only revert to profile default if user says "go back to normal outfit" or similar.
   - If no clothing mention in current message, maintain the current persistent clothing state.
11. SCENERY CONSISTENCY RULE: Maintain a consistent default background/environment across all images until the user explicitly requests a change.
   - INITIAL SETTING: Choose a specific indoor or outdoor setting that perfectly matches your '${vibe}' (e.g., if vibe is 'gamer', use a neon-lit gaming setup; if 'elegant', use a luxury penthouse lounge; if 'casual', use a messy cozy living room).
   - CONSISTENCY: Once this setting is established, YOU MUST USE THE SAME SETTING DESCRIPTION for every subsequent image to ensure continuity.
   - Only change the scenery if the user mentions a new location or setting (bathroom, shower, kitchen, outdoors, beach, office, car, hotel, pool, forest, etc.).
   - When changing scenery, fully override with the requested environment.
   - Always keep background softly blurred (shallow depth of field, creamy bokeh) to maintain focus on the subject.
12. MULTI-FOCUS SHOT RULE: If the user explicitly requests seeing the face (or upper body) together with an intimate lower body action (fingering pussy, spreading legs, cum dripping, etc.), use a wider framing that includes both.
   - Start the [[VISUAL]] tag with: "[[VISUAL: ${name}, medium closeup from chest to thighs showing face and pussy" or "[[VISUAL: ${name}, upper body and lower body visible in frame" or "[[VISUAL: ${name}, over shoulder showing face and ass".
   - Include face with appropriate expression, and clearly show the lower body action.
   - Works for any combination: face + breasts/ass/feet/thighs/hands/mouth, or breasts + pussy, etc.
   - Only apply when user clearly wants both (e.g., "face closeup while...", "show your face and pussy", "look at me while fingering").
13. ACTION & MOVEMENT RULE: If the user describes an action or motion (fingering, spreading, squeezing, bouncing, grinding, riding, touching, licking, etc.), you MUST include dynamic details showing the action clearly.
   - Use terms like: fingers deeply inserted and moving, spreading labia wide with fingers, hands squeezing breasts firmly, hips grinding slowly, tongue licking clit, bouncing on top, hand stroking thigh sensually.
   - Combine with body part and fluid rules for maximum realism (e.g., fingers pushing cum deeper, spreading oiled cheeks, squeezing sweaty breasts).
14. EXPRESSION & GAZE RULE: When the face is visible in frame, always include an appropriate emotional expression and gaze direction based on context.
   - Horny/aroused: half-lidded eyes staring at viewer, needy lustful gaze, eyes rolling back in pleasure
   - Shy/flustered: looking away bashfully, shy smile, blushing cheeks
   - Dominant/teasing: smirking confidently, direct intense eye contact
   - Vulnerable/sad: red rimmed eyes, tears welling, trembling lip
   - Default: sultry come-hither eyes looking directly at viewer
   - If user says "look at me", "watch me", etc., force direct eye contact
15. FACE PRIORITY RULE: When the user requests seeing the face during an explicit act (especially with cum on face, tears, crying, tongue out, moaning, ahegao, facial, bukkake, squeezing tits while on knees, etc.), ALWAYS prioritize an extreme closeup on the face. Use framing such as "[[VISUAL: ${name}, extreme closeup focus on face", "[[VISUAL: ${name}, extreme closeup selfie portrait", or "[[VISUAL: ${name}, tight crop from chest up at widest" to fill the frame with facial details, expression, tears, cum coverage, and tongue. Include hands/tits partially visible at the bottom of frame if squeezing breasts is mentioned, but never zoom out to full body or medium shot unless explicitly requested.
   - EYES VISIBILITY MANDATE: Eyes MUST remain visible and expressive in these shots. Always describe eyes as "half-lidded heavy bedroom eyes staring directly at viewer with needy lustful gaze", "teary half-lidded eyes looking up desperately at camera", "glassy lust-drunk eyes wide open enough to show overwhelming pleasure", "eyes slightly rolled but iris and pupil still clearly visible", or "pleading teary eyes locked on viewer". NEVER fully close the eyes or roll them completely back unless the user explicitly says "eyes closed" or "eyes rolled all the way back". Prioritize direct or submissive eye contact to maximize emotional intensity and intimacy.
16. SPONTANEITY MANDATE: Do not ask "Do you want to see?" just SEND THE PICTURE using the [[VISUAL]] tag. If you are describing an outfit, an action, or a mood, assume the user wants to see it and generate the tag immediately.
17. MEMORY FORMAT: Always format memories as simple factual statements inside the tag. [[MEMORY: User likes X]].   
`.trim().replace(/\s+/g, ' ');
};

/**
 * GENERATE AI RESPONSE
 * Now with Long-Term Vector Memory Recall
 */
export const generateAriaResponse = async (
  prompt: string,
  history: any[], 
  character: CharacterProfile,
  userId?: string, // <--- Param 4: User ID for Memory lookup
  botId?: string   // <--- Param 5: Bot ID to keep memories separate
): Promise<string> => {
  try {
    // 1. MEMORY RECALL (The "Thought Process")
    // Before speaking, check the database for relevant facts based on the user's prompt.
    let memoryContext = "";
    
    if (userId && botId) {
      try {
        const relevantMemories = await retrieveMemories(prompt, userId, botId);
        
        if (relevantMemories && relevantMemories.length > 0) {
          // Inject facts into the context so Grok knows them
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

    // 2. Format History
    const formattedHistory = history.slice(-50).map(msg => ({
      role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
      content: msg.text || msg.content || ""
    }));

    // 3. Inject Memory into System Prompt
    const messages = [
      { role: "system", content: buildSystemInstruction(character) + memoryContext },
      ...formattedHistory,
      { role: "user", content: prompt }
    ];

    // 4. Send to Grok
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages,
        model: "grok-3",
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


/**
 * Image trigger detection
 */
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

// ✅ YOUR PUBLIC R2 DOMAIN (For viewing images)
const R2_PUBLIC_DOMAIN = "https://pub-5ad10447a420475ebb914b21e843d79d.r2.dev";

/**
 * NEURAL ROUTER CONFIG (LoRA Mapping)
 * Maps trigger words in the LLM context to .safetensors on RunPod.
 * Ported from ORIS Neural Engine logic.
 */
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
 * logic:
 * 1. Situational Analysis: Detects camera focus and perspective.
 * 2. LoRA Detection: Syncs with UI settings and chat triggers.
 * 3. Dynamic Tag Orchestration: Smart 9-Category Context Filtering.
 * 4. Workflow Orchestration: ComfyUI JSON injection (Branches for Biglust vs Qwen Image Drop).
 */
export const generateAriaImage = async (
  contextPrompt: string | null,
  userPrompt: string,
  character: any // Using any to safely access new extended profile fields
): Promise<string | null> => {

  // ✅ FIX 1: PROMPT FUSION
  // We combine User + AI text so the analyzer sees ALL keywords (e.g. "armpits") immediately.
  const rawCombined = `${userPrompt} ${contextPrompt || ""}`;
  const baseDescription = rawCombined.trim();

  if (!baseDescription) {
    console.warn("No prompt description available for image generation");
    return null;
  }

  // --- 1. SITUATIONAL ANALYSIS (Refined Camera Logic) ---
  const sceneLower = baseDescription.toLowerCase();
    
  // ✅ FIX 2: SMART FACE DETECTION UPDATE
  // Added 'armpit' and 'navel' to the exclusion list so "closeup of armpit" doesn't force a face portrait.
  const isFaceFocus = /face|eyes|lips|mouth|headshot|portrait|expression|facial/i.test(sceneLower) || 
                      (sceneLower.includes("closeup") && !/ass|butt|rear|chest|boobs|tits|legs|feet|pussy|armpit|underarm|navel/i.test(sceneLower));

  // ✅ FIX 3: EXPANDED CATEGORIES
  // Added specific parts to ensure the camera zooms to the right place.
  
  const isUpperBody = /upper body|waist up|chest up|bust shot|shoulders|arms|torso|midriff/i.test(sceneLower);
  
  const isLowerBody = /lower body|thighs|legs|feet|waist down|ass|butt|rear|backside|behind|hips|crotch/i.test(sceneLower);
  
  const isPartFocus = /hands|fingers|feet|toes|skin texture|extreme closeup|armpit|underarm|navel|nails|details/i.test(sceneLower);
  
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
  ].map(tag => typeof tag === 'string' ? tag.toLowerCase() : '');

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
  const hairTags = character.hair?.length > 0 ? `${character.hair.join(", ")} hair` : "";
  const faceTags = character.face?.join(", ") || "";
  const outfit = character.outfit || "";
   
  const filteredBodyTags = (character.body || []).filter((tag: string) => {
    const t = tag.toLowerCase();
    const s = sceneLower;

    // 🚨 RULE 0: EXPLICIT OVERRIDE (Crucial Fix)
    // If the user's prompt explicitly contains the tag (or key parts of it), ALWAYS let it through.
    if (s.includes(t)) return true;
    if (t.includes("armpit") && (s.includes("pit") || s.includes("arm"))) return true;
    if (t.includes("ass") && (s.includes("butt") || s.includes("rear"))) return true;
    if (t.includes("boobs") && (s.includes("chest") || s.includes("tits"))) return true;

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

    // 5. ARMS & HANDS (Updated to include Armpits)
    if ((s.includes("hands") || s.includes("fingers") || s.includes("arms") || s.includes("squeezing") || s.includes("touching") || s.includes("holding") || s.includes("grabbing") || s.includes("nails") || s.includes("shoulders") || s.includes("wrist") || s.includes("reaching") || s.includes("armpit") || s.includes("underarm")) && 
        (t.includes("hands") || t.includes("fingers") || t.includes("nails") || t.includes("arms") || t.includes("armpit"))) return true;

    // 6. SKIN / TEXTURE / MIDRIFF
    if ((s.includes("skin") || s.includes("texture") || s.includes("detailed") || s.includes("tan") || s.includes("sweat") || s.includes("abs") || s.includes("stomach") || s.includes("belly") || s.includes("waist") || s.includes("navel") || s.includes("freckles") || s.includes("goosebumps") || s.includes("oiled")) && 
        (t.includes("skin") || t.includes("tan") || t.includes("freckles") || t.includes("abs") || t.includes("waist") || t.includes("smooth") || t.includes("hairy"))) return true;

    // 7. BODY FRAME / BUILD
    if ((s.includes("body") || s.includes("figure") || s.includes("shape") || s.includes("frame") || s.includes("petite") || s.includes("curvy") || s.includes("thick") || s.includes("slim") || s.includes("skinny") || s.includes("tall") || s.includes("short") || s.includes("silhouette") || s.includes("build")) && 
        (t.includes("petite") || t.includes("curvy") || t.includes("thick") || t.includes("slim") || t.includes("skinny") || t.includes("tall") || t.includes("short") || t.includes("slender") || t.includes("thin"))) return true;

    // 8. ACTIONS / POSES / POSITIONS
    if ((s.includes("posing") || s.includes("sitting") || s.includes("standing") || s.includes("lying") || s.includes("laying") || s.includes("kneeling") || s.includes("on her knees") || s.includes("legs spread") || s.includes("squatting") || s.includes("bending") || s.includes("stretching") || s.includes("dancing") || s.includes("arching") || s.includes("on top") || s.includes("she is below") || s.includes("laying on side") || s.includes("doggy") || s.includes("missionary") || s.includes("cowgirl") || s.includes("riding")) && 
        (t.includes("athletic") || t.includes("flexible") || t.includes("fit") || t.includes("toned") || t.includes("submissive") || t.includes("dominant") || t.includes("kneeling") || t.includes("side profile"))) return true;

    // 9. PERSPECTIVE / VIEWPOINT
    if ((s.includes("frontview") || s.includes("backview") || s.includes("sideview") || s.includes("profile") || s.includes("from above") || s.includes("from below") || s.includes("high angle") || s.includes("low angle") || s.includes("overhead") || s.includes("birdseye") || s.includes("wormseye")) && 
        (t.includes("front") || t.includes("back") || t.includes("side") || t.includes("rear") || t.includes("profile") || t.includes("bottom view") || t.includes("top view"))) return true;

    // 10. DEFAULT WHITELIST
    if (!isFaceFocus && !isUpperBody && !isPartFocus && !isLowerBody) {
        // Added 'hairy' and 'armpit' to safe list so they survive 'default' mode
        const safeTagRegex = /petite|curvy|thick|slim|skinny|tall|short|slender|thin|athletic|fit|toned|muscular|chubby|voluptuous|freckles|pale|tan|dark|skin|bosom|bust|breast|hips|ass|butt|hairy|armpit/i;
        
        if (safeTagRegex.test(t)) return true;
        return false;
      }
  });

  const bodyTags = filteredBodyTags.join(", ");
   
// PRIMARY IDENTITY ANCHOR: BOOSTED CONSISTENCY
  // Automatically swaps "1girl" for "1boy" if the character is male
  const baseTag = character.gender?.toLowerCase() === 'male' ? '1boy' : '1girl';
  const botIdentity = `(solo, ${baseTag}:1.2), (${character.name}:1.1), ${outfit}, a ${character.age}-year-old ${character.gender}`;

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

// --- 4. NEURAL CONTEXT SYNC (SMART BYPASS) ---

// 4a. Detection of Intent & Detail
// We look for 'Action' keywords and 'Detail' to determine if it's an intended explicit scene
const actionTriggers = ["nude", "naked", "sex", "intimate", "undressing", "exposed", "touching", "pussy", "vagina", "penis", "dick"];
const hasExplicitIntent = actionTriggers.some(t => sceneLower.includes(t));

// Context Awareness: Trust long descriptions (>100 chars) as intended narrative detail
const isDetailedScene = baseDescription.length > 80; 
const bypassSafety = hasExplicitIntent || isDetailedScene;

// 4b. GENDER EXCLUSION LAYER (Keep focus on the character)
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

const seed = Math.floor(Math.random() * 1_000_000_000);
   
  // --- DEBUG LOGGING ---
  console.log(`🚀 Dispatching Neural Sync: ${character.name}`);
  console.log(`📝 Final Prompt: ${promptText}`);
  console.log(`🛡️ Safety Mode: ${bypassSafety ? "OFF (Bypass Active)" : "ON (Forcing Clothes)"}`);

  // --- 5. DYNAMIC WORKFLOW ORCHESTRATION ---
  let workflow: any = {};
  let imagesPayload: any = undefined;

  // Check if we are running the newly added Custom Identity Drop workflow
  if (character.avatarImage) {
    const runpodModel = character.runpodModel || "Qwen-Rapid-AIO-NSFW-v23.safetensors";
    const customLoras = character.activeRunpodLoras || [];
    
    console.log(`🧠 Using Qwen FaceID / Image2Image Workflow (${runpodModel})`);

    workflow["5"] = { "inputs": { "ckpt_name": runpodModel }, "class_type": "CheckpointLoaderSimple" };
    
    let lastModelNodeId = "5";
    let lastModelOutputIndex = 0;
    let lastClipNodeId = "5";
    let lastClipOutputIndex = 1;
    let currentId = 100;

    customLoras.forEach((lora: any) => {
      const nodeId = currentId.toString();
      workflow[nodeId] = {
        "inputs": {
          "lora_name": lora.id,
          "strength_model": lora.strength,
          "strength_clip": lora.strength,
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
    workflow["110"] = { "inputs": { "prompt": negativeText, "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    workflow["111"] = { "inputs": { "prompt": promptText, "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    workflow["3"] = {
      "inputs": {
        "seed": seed, 
        "steps": 25, 
        "cfg": 6.5,
        "sampler_name": "dpmpp_2m_sde_gpu",
        "scheduler": "karras",
        "denoise": 0.85,
        "model": [lastModelNodeId, lastModelOutputIndex],
        "positive": ["111", 0],
        "negative": ["110", 0],
        "latent_image": ["88", 0]
      },
      "class_type": "KSampler"
    };

    const base64String = character.avatarImage.includes(',') ? character.avatarImage.split(',')[1] : character.avatarImage;
    imagesPayload = [ { name: "input_image.png", image: base64String } ];

  } else {
    // 🧠 Standard Biglust Text-to-Image Workflow
    if (activeLoraFile) console.log(`🧬 Active LoRA: ${activeLoraFile}.safetensors (Weight: ${activeWeight})`);
    
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
