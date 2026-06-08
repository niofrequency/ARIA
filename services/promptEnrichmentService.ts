// services/promptEnrichmentService.ts

export async function enrichImagePrompt(
  visualDescription: string,
  conversationHistory: Array<{ role: string; content?: string; text?: string }>,
  ariaPersonality: string,
  previousImagePrompts?: string[]
): Promise<string> {
  // 1. Get recent user intent (last 5 messages, looking for user role)
  const recentUserMessages = conversationHistory
    .slice(-5)
    .filter(msg => msg.role === 'user')
    .map(msg => (msg.content || msg.text || "").trim())
    .filter(Boolean);

  // Join with a separator to keep intents distinct within the context string
  const recentContext = recentUserMessages.join(" | ").substring(0, 180);

  // 2. Clean context but PRESERVE important keywords
  let cleanedContext = recentContext
    .replace(/[[\]{}<>]/g, '') // Remove structural characters that might break parsers
    .replace(/\s+/g, ' ')
    .trim();

  // 3. Extract & protect critical framing/position keywords
  // This ensures that even if context is trimmed later, essential shot details remain.
  const importantKeywords = [
    // Shot Types
    "full body", "far shot", "wide shot", "medium shot", "half-body", 
    "closeup", "extreme closeup", 
    // Positions / Angles
    "doggystyle", "missionary", "cowgirl", "doggy", 
    "from behind", "backview", "rear view",
    // Contextual Instructions
    "pov", "point of view", 
    "solo", "alone", "no other", 
    "my cock", "your mouth"
  ];

  const protectedTerms: string[] = [];
  const lowerCleanedContext = cleanedContext.toLowerCase();

  for (const kw of importantKeywords) {
    if (lowerCleanedContext.includes(kw.toLowerCase())) {
      protectedTerms.push(kw);
    }
  }

  // 4. Style continuity from previous prompts (very limited to prevent drift)
  const styleContinuity = previousImagePrompts && previousImagePrompts.length > 0
    ? previousImagePrompts.slice(-2)
        .map(p => p.substring(0, 70)) // Cap previous prompt snippets
        .join(', ')
    : '';

  // 5. Build enriched prompt — prioritize original visual + protected framing terms
  const enrichedParts = [
    visualDescription.substring(0, 220),           // 1. Main visual description takes priority
    protectedTerms.length > 0 ? protectedTerms.join(', ') : null, // 2. Critical framing keywords
    cleanedContext ? `context: ${cleanedContext}` : null,          // 3. Raw conversational context
    `personality: ${ariaPersonality}`.substring(0, 90),           // 4. Character vibe
    styleContinuity ? `previous style: ${styleContinuity}` : null // 5. Minimal style linkage
  ].filter(Boolean);

  let finalEnriched = enrichedParts.join(', ');

  // Hard cap to prevent token bloat for the API call
  if (finalEnriched.length > 520) {
    finalEnriched = finalEnriched.substring(0, 520);
  }

  return finalEnriched;
}
