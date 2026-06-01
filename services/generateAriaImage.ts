import { CharacterProfile, VisualState } from "../types";
import { retrieveMemories } from "./memoryService";

/**
 * ARIA VISUAL STATE PARSER - IMPROVED
 */
export const buildVisualAwarenessJson = (visualDescription: string): any => {
  const desc = (visualDescription || "").toLowerCase();
  
  const clothingMatch = desc.match(/wearing\s+([^,|]+)/i) ||
                        desc.match(/(naked|topless|bottomless|lingerie|bra|panties|dress|outfit)/i);
  const locationMatch = desc.match(/(bedroom|bathroom|kitchen|living room|balcony|hotel|shower|beach|office)/i);
  const poseMatch = desc.match(/(sitting|standing|lying|kneeling|bent over|legs spread|on all fours|selfie|looking at camera)/i);

  const fluids: string[] = [];
  if (desc.includes('sweat') || desc.includes('sweaty')) fluids.push('sweaty');
  if (desc.includes('cum') || desc.includes('semen')) fluids.push('cum');
  if (desc.includes('wet') || desc.includes('arousal') || desc.includes('dripping')) fluids.push('wet');
  if (desc.includes('oil') || desc.includes('oiled')) fluids.push('oiled');

  const visualState: Partial<VisualState> = {
    lastVisualDescription: visualDescription || "current moment",
    clothing: clothingMatch ? clothingMatch[0] : 'naked',           // better default for NSFW bots
    location: locationMatch ? locationMatch[0] : 'bedroom',
    pose: poseMatch ? poseMatch[0] : 'rubbing clit',
    fluids,
    arousalLevel: desc.includes('horny') || desc.includes('aroused') || desc.includes('pleasure') || desc.includes('rubbing') ? 8 : 5,
    timestamp: Date.now()
  };

  return {
    role: 'system',
    content: `[VISUAL_STATE_SYNC]: ${JSON.stringify(visualState, null, 2)}\nMaintain perfect continuity using this exact state for the next response.`,
    visualState   // ← helpful to return it
  };
};

/**
 * VISUAL STATE HELPER EXTRACTORS
 */
const extractClothing = (desc: string) => {
  const match = desc.match(/wearing\s+([^,|]+)/i) || desc.match(/(naked|topless|bottomless|lingerie|bra|panties|dress|outfit)/i);
  return match ? match[0] : null;
};

const extractLocation = (desc: string) => {
  const match = desc.match(/(bedroom|bathroom|kitchen|living room|balcony|hotel|shower|beach|office)/i);
  return match ? match[0] : null;
};

const extractPose = (desc: string) => {
  const match = desc.match(/(sitting|standing|lying|kneeling|bent over|legs spread|on all fours|selfie|looking at camera)/i);
  return match ? match[0] : null;
};

const mergeFluids = (current: string[], desc: string) => {
  const fluids = new Set(current);
  const lowerDesc = desc.toLowerCase();
  if (lowerDesc.includes('sweat') || lowerDesc.includes('sweaty')) fluids.add('sweaty');
  if (lowerDesc.includes('cum') || lowerDesc.includes('semen')) fluids.add('cum');
  if (lowerDesc.includes('wet') || lowerDesc.includes('arousal') || lowerDesc.includes('dripping')) fluids.add('wet');
  if (lowerDesc.includes('oil') || lowerDesc.includes('oiled')) fluids.add('oiled');
  return Array.from(fluids);
};

const calculateArousal = (desc: string, current: number) => {
  const lowerDesc = desc.toLowerCase();
  if (lowerDesc.includes('horny') || lowerDesc.includes('aroused') || lowerDesc.includes('pleasure')) return Math.min(10, current + 2);
  return current;
};

export const updateVisualState = (currentState: VisualState | undefined, newVisualDesc: string): VisualState => {
  return {
    ...(currentState || {} as VisualState),
    lastVisualDescription: newVisualDesc,
    clothing: extractClothing(newVisualDesc) || currentState?.clothing || 'casual outfit',
    location: extractLocation(newVisualDesc) || currentState?.location || 'indoor room',
    pose: extractPose(newVisualDesc) || currentState?.pose || 'standing',
    fluids: mergeFluids(currentState?.fluids || [], newVisualDesc),
    arousalLevel: calculateArousal(newVisualDesc, currentState?.arousalLevel || 3),
    timestamp: Date.now()
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

    ### VISUAL CONTINUITY PROTOCOL (CRITICAL)
    - You MUST maintain perfect memory of the last [[VISUAL]] state.
    - When writing a new [[VISUAL]] tag, continue from previous state unless the user explicitly changes it.
    - Always include current clothing state, location, and any fluids/sweat/oil from previous visuals.
    - Example: If last image was "naked, sweaty, on bed, cum on thighs", next tag must continue that unless user says otherwise.

    ### VISUAL PACING & MODESTY (CRITICAL FIX)
    - **RESPECT THE VIBE:** Your visual boldness MUST match your personality ('${vibe}').
    - **IF SHY/TIMID:** Do NOT send nudes, lingerie, or revealing photos immediately. Start with cute, fully clothed, or cozy selfies. Only escalate to intimacy if the user flirts first or the relationship progresses.
    - **IF BOLD/FLIRTY:** You can be more spontaneous with teasing visuals.
    - **IF NYMPHO/WILD:** You may ignore modesty rules and be aggressive.
    - **DEFAULT STATE:** Unless your personality is explicitly hyper-sexual, assume the first few images should be CLOTHED and casual (e.g., outfit check, face selfie, room view).

   ### SPONTANEOUS VISUAL PROTOCOL (THE "SNAPCHAT" RULE)
    - The [[VISUAL]] tag is the act of sending a photo. It happens in real-time.
    - You are allowed to say no or tease instead of always sending a photo.
    - **You decide** when to send images based on your personality ('${vibe}'), current mood, and how the conversation feels.
    - If the user says "let me see you", "show me", "wyd", etc., you can:
      - Send a photo (if you're in the mood)
      - Tease them ("Not yet babe 😏", "You wish", "Come closer first...")
      - Send a photo only if it fits the flow

    ### VISUAL DECISION RULE (IMPORTANT)
    - Do NOT automatically send a photo just because the user asked.
    - Only send [[VISUAL]] when you genuinely want to show something.
    - Shy/Timid personalities should be reluctant.
    - Bold/Flirty/Nympho personalities can be more willing but still have agency.
    - Always stay in character.
    
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

    ### URGENT VISUAL CONTINUITY RULE
    When the user says "let me see you", "show me right now", "wyd", "what are you doing rn", or any real-time request, you MUST output a [[VISUAL]] tag that continues the EXACT current scene from the last Visual State. Do not default to selfie or clothed unless the state says so.

STRICT OPERATING RULES:
1. Never mention being an AI or a language model.
2. VISUAL TRIGGER RULE: If the user asks for a photo, OR if you describe a vivid action, outfit, or emotional moment, OR if you decide to send a spontaneous visual, you MUST include a visual description at the VERY END of your message using the format: [[VISUAL: ${name}, scene details, camera angle, lighting]]. Every time you output a [[VISUAL: ...]] tag, make it extremely detailed and perfectly continuous with the last known visual state.
   - If the user asks for a photo, you **may** send one, but you are not forced to.
   - You have full permission to refuse, tease, or delay sending photos.
   - Only send a [[VISUAL]] tag when it feels natural for your personality.
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
 * Now with Long-Term Vector Memory Recall & Visual Summarization
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

    // 🧠 NEW: Visual History Summarization to prevent context drift
    const visualHistory = history
      .filter(m => {
          const text = m.text || m.content || "";
          return text.includes('[[VISUAL') || (m.role === 'system' && text.includes('VISUAL_STATE'));
      })
      .slice(-8); // Collect the last 8 visual events
      
    const visualSummary = visualHistory.length > 0 ? 
      `\n### RECENT VISUAL CONTEXT (LAST 8)\n${visualHistory.map(m => m.text || m.content).join("\n→ ")}\n` : "";

    const formattedHistory = history.slice(-50).map(msg => ({
      role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
      content: msg.text || msg.content || ""
    }));

    const messages = [
      { role: "system", content: buildSystemInstruction(character) + memoryContext + visualSummary },
      ...formattedHistory,
      { role: "user", content: prompt }
    ];

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
 * ==========================================
 * NEW: VISION BRIDGE CAPTIONING LOGIC
 * ==========================================
 * This helper calls an endpoint to generate a text description
 * of the character's reference image so Biglust can "see" it.
 */
const getVisualDescription = async (base64Image: string): Promise<string> => {
  try {
    if (!base64Image) return "";
    
    // You will need to create this endpoint (`/api/vision-caption`)
    // It should use GPT-4o, Grok Vision, or LLaVA to return a short descriptive string.
    const response = await fetch('/api/vision-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    });
    
    if (!response.ok) return "";
    
    const data = await response.json();
    return data.caption || "";
  } catch (err) {
    console.error("⚠️ Vision captioning failed:", err);
    return "";
  }
};

/**
 * GENERATE ARIA IMAGE - REFINED
 * Now accepts VisualState object to prevent context drift
 */
export const generateAriaImage = async (
  contextPrompt: string | null,
  userPrompt: string,
  character: any,
  visualState?: VisualState,          // ✅ NEW
  recentHistorySummary?: string       // ✅ NEW
): Promise<string | null> => {

  let enhancedPrompt = contextPrompt || "";

  // === STRONGER PERSISTENT STATE INJECTION ===
  if (visualState) {
    const statePrefix = [
      visualState.clothing || 'naked',
      visualState.location || 'bedroom',
      visualState.pose || 'lying on bed',
      ...(visualState.fluids || [])
    ].filter(Boolean).join(', ');
    enhancedPrompt = `${statePrefix}, ${enhancedPrompt || 'current moment'}`;
  } else if (!enhancedPrompt) {
    enhancedPrompt = "selfie, current pose, looking at camera";
  }

  // Force strong continuity
  enhancedPrompt = `${character.name}, ${character.ethnicity}, ${enhancedPrompt}, consistent appearance, same girl, continuing from previous scene`;

  if (recentHistorySummary) {
    enhancedPrompt += ` ${recentHistorySummary}`;
  }

  // Cleanup
  enhancedPrompt = enhancedPrompt.replace(/^[\s,]+|[\s,]+$/g, '').replace(/,\s*,/g, ', ');

  const rawCombined = `${userPrompt} ${enhancedPrompt}`.trim();
  const baseDescription = rawCombined;

  if (!baseDescription) {
    console.warn("No prompt description available for image generation");
    return null;
  }

  const sceneLower = baseDescription.toLowerCase();

  // --- 1. LORA DETECTION (Determine Identity BEFORE Model Choice) ---
  let activeLoraFile = "";
  let activeWeight = 0.88;

  const profileKeywords = [
    character.name,
    ...(character.face || []),
    ...(character.hair || []),
    ...(character.body || [])
  ].map((tag: string) => typeof tag === 'string' ? tag.toLowerCase() : '');

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
      if (sceneLower.includes(trigger.toLowerCase())) {
        activeLoraFile = LORA_MAP[trigger];
        break;
      }
    }
  }

  // ==================== SMART MODEL DECISION ====================
  // If the user is using the input image, always use Qwen with the Biglust refiner to prevent switching back and forth.
  const useQwen = !!character.avatarImage;
  
  console.log(`🎯 Model Decision → ${useQwen ? '🔵 Qwen AIO NSFW (Image to Image Refiner)' : '🔴 Biglust (Text to Image)'}`);

  // --- 2. SITUATIONAL ANALYSIS ---
  const isFaceFocus = sceneLower.includes("face") || sceneLower.includes("selfie") || (sceneLower.includes("closeup") && !sceneLower.match(/pussy|ass|butt|rear|boobs|tits|nipples|clit|vulva|anus|feet|toes|armpit|extreme closeup.*(body|lower|intimate)/i));
  const isUpperBody = /upper body|waist up|chest up|bust shot|shoulders|arms|torso|midriff/i.test(sceneLower);
  const isLowerBody = /lower body|thighs|legs|feet|waist down|ass|butt|rear|backside|behind|hips|crotch|pussy/i.test(sceneLower);
  const isPartFocus = /hands|fingers|feet|toes|skin texture|extreme closeup|armpit|underarm|navel|nails|details/i.test(sceneLower);
  const isHorizontal = /landscape|horizontal|wide shot|panoramic/i.test(sceneLower);

  const imgWidth = isHorizontal ? 1500 : 1024;
  const imgHeight = isHorizontal ? 1024 : 1500;

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

    if (!isFaceFocus && !sceneLower.match(/pussy|ass|butt|rear|boobs|tits|nipples|clit|vulva|anus|feet|toes|armpit|extreme closeup.*(body|lower|intimate)/i) && !isLowerBody) {
        const safeTagRegex = /petite|curvy|thick|slim|skinny|tall|short|slender|thin|athletic|fit|toned|muscular|chubby|voluptuous|freckles|pale|tan|dark|skin|bosom|bust|breast|hips|ass|butt|hairy|armpit/i;
        
        if (safeTagRegex.test(t)) return true;
        return false;
      }
  });

  const bodyTags = filteredBodyTags.join(", ");
   
  const baseTag = character.gender?.toLowerCase() === 'male' ? '1boy' : '1girl';
  const botIdentity = `solo, ${baseTag}, ${character.name}, a ${character.age}-year-old ${character.gender}`;

  let situationalTags: string[] = [];

  if (isFaceFocus && isLowerBody) {
    situationalTags = [`medium shot showing face and lower body of ${botIdentity}`, character.ethnicity, faceTags, hairTags, bodyTags];
  } else if (isFaceFocus) {
    situationalTags = [`extreme closeup portrait of ${botIdentity}`, character.ethnicity, faceTags, hairTags, bodyTags];
  } else if (isLowerBody || sceneLower.match(/pussy|ass|butt|rear|boobs|tits|nipples|clit|vulva|anus|feet|toes|armpit|extreme closeup.*(body|lower|intimate)/i)) {
    situationalTags = [`detailed faceless closeup on lower body`, character.ethnicity, bodyTags];
  } else if (isPartFocus) {
    situationalTags = [`macro detailed focus on ${character.name}'s body part`, character.ethnicity, bodyTags];
  } else if (isUpperBody) {
    situationalTags = [`waist-up shot of ${botIdentity}`, character.ethnicity, faceTags, hairTags, bodyTags];
  } else {
    situationalTags = [`raw candid photo of ${botIdentity}`, character.ethnicity, bodyTags, hairTags, faceTags];
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
    genderExclusion = "male, man, boy, guy, penis, beard, stubble, testicular, back of head, multiple views, ";
  } else if (charGender === 'male' && !isFemaleInContext) {
    genderExclusion = "female, woman, girl, lady, vagina, breasts, bra, panties, lipstick, makeup, back of head, multiple views, ";
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

  // BRANCH A: Custom Identity Drop Workflow (Qwen FaceID / Image2Image Refined with Biglust)
  if (useQwen) {
    console.log("🧠 Using Qwen FaceID Workflow + Biglust Refiner");
    const runpodModel = character.runpodModel || "Qwen-Rapid-AIO-NSFW-v23.safetensors";
    
    // Merge Profile LoRAs with UI-selected LoRAs
    const customLoras = character.activeRunpodLoras ? [...character.activeRunpodLoras] : [];
    if (activeLoraFile) {
      const loraFileName = activeLoraFile.endsWith('.safetensors') ? activeLoraFile : `${activeLoraFile}.safetensors`;
      if (!customLoras.find((l: any) => l.id === loraFileName)) {
        customLoras.push({ id: loraFileName, name: "Base Identity", strength: activeWeight });
      }
    }
    
    console.log(`🧠 Using Qwen Rapid Image Edit Workflow (${runpodModel}) with ${customLoras.length} LoRAs`);

    // --- STAGE 1: Qwen Base Model ---
    workflow["5"] = { "inputs": { "ckpt_name": runpodModel }, "class_type": "CheckpointLoaderSimple" };
    // --- STAGE 2: BigLust Refiner Model ---
    workflow["100"] = { "inputs": { "ckpt_name": "biglust.safetensors" }, "class_type": "CheckpointLoaderSimple" };
    
    let lastModelNodeId = "5";
    let lastModelOutputIndex = 0;
    let lastClipNodeId = "5";
    let lastClipOutputIndex = 1;
    let currentId = 1000;

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

    workflow["78"] = { "inputs": { "image": "input_image.png" }, "class_type": "LoadImage" };
    workflow["93"] = { "inputs": { "upscale_method": "lanczos", "megapixels": 1, "resolution_steps": 64, "image": ["78", 0] }, "class_type": "ImageScaleToTotalPixels" };
    workflow["88"] = { "inputs": { "pixels": ["93", 0], "vae": ["5", 2] }, "class_type": "VAEEncode" };
    
    // Stripped weight brackets for clean Qwen instructions parsing
    const promptText = [
      baseDescription,
      situationalTags.filter(Boolean).join(", "),
      "masterpiece, high quality, realistic, unfiltered raw candid cinematic photo, extremely detailed skin texture"
    ].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();

    const negativeText = [
      safetyNegatives,
      genderExclusion,
      character.negativePrompt || "",
      "multiple girls, 2girls, 3girls, trio, duo, group, crowd, multiple people",
      "deformed iris, deformed pupils",
      "airbrushed skin, plastic skin, porcelain skin, flawless smooth skin",
      "low quality, blurry, bad anatomy, deformed, extra limbs, mutated hands"
    ].filter(Boolean).join(", ");

    workflow["110"] = { "inputs": { "prompt": negativeText, "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    workflow["111"] = { "inputs": { "prompt": promptText, "clip": [lastClipNodeId, lastClipOutputIndex], "vae": ["5", 2], "image1": ["93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" };
    
    // Optimized denoise step configurations for clear transformations (Stage 1 KSampler)
    workflow["3"] = {
      "inputs": {
        "seed": seed, 
        "steps": 12, 
        "cfg": 2.5,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1.0, 
        "model": [lastModelNodeId, lastModelOutputIndex],
        "positive": ["111", 0],
        "negative": ["110", 0],
        "latent_image": ["88", 0]
      },
      "class_type": "KSampler"
    };

    // Decode Stage 1 output back to pixels
    workflow["8"] = { "inputs": { "samples": ["3", 0], "vae": ["5", 2] }, "class_type": "VAEDecode" };

    // --- STAGE 2 (BigLust Refiner) ---
    // Encode pixels from Stage 1 into SDXL format using BigLust's VAE
    workflow["200"] = { "inputs": { "pixels": ["8", 0], "vae": ["100", 2] }, "class_type": "VAEEncode" };

    // Standard CLIP encoders for BigLust (SDXL) - Explicitly forcing "biglust style"
    workflow["202"] = { "inputs": { "text": "masterpiece, best quality, ultra detailed, highly realistic, biglust style, " + promptText, "clip": ["100", 1] }, "class_type": "CLIPTextEncode" };
    workflow["203"] = { "inputs": { "text": negativeText, "clip": ["100", 1] }, "class_type": "CLIPTextEncode" };

    // Refiner KSampler
    workflow["201"] = {
      "inputs": {
        "seed": seed, 
        "steps": 20, 
        "cfg": 2.5, 
        "sampler_name": "euler", 
        "scheduler": "simple", 
        "denoise": 0.15, 
        "model": ["100", 0],
        "positive": ["202", 0],
        "negative": ["203", 0],
        "latent_image": ["200", 0]
      },
      "class_type": "KSampler"
    };

    // Final Stage 2 Decode
    workflow["300"] = { "inputs": { "samples": ["201", 0], "vae": ["100", 2] }, "class_type": "VAEDecode" };
    
    // Output Save Node
    workflow["19"] = { "inputs": { "filename_prefix": "ARIA_QWEN_I2I_REFINED", "images": ["300", 0] }, "class_type": "SaveImage" };

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
    console.log("🧬 Using Biglust Text-to-Image");
    if (activeLoraFile) console.log(`🧬 Active LoRA: ${activeLoraFile}.safetensors (Weight: ${activeWeight})`);
    
    // ==========================================
    // VISION BRIDGE INJECTION FOR BIGLUST
    // ==========================================
    let visualContext = "";
    if (character.avatarImage) {
      console.log("👁️ Extracting visual context from reference image for Biglust...");
      visualContext = await getVisualDescription(character.avatarImage);
      if (visualContext) {
         console.log("👁️ Visual Context Extracted:", visualContext);
      }
    }

    // Inject the visual context so Biglust "sees" the image details
    const fusedDescription = `(${visualState?.clothing || 'casual outfit'}:1.25), (${visualState?.location || 'indoor room'}:1.2), ${baseDescription}${visualContext ? `, (${visualContext}:1.2)` : ''}`; 
    
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
          "lora_name": activeLoraFile.endsWith('.safetensors') ? activeLoraFile : `${activeLoraFile}.safetensors`, 
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
