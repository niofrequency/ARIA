// services/promptEnrichmentService.ts

export async function enrichImagePrompt(
  visualDescription: string,
  conversationHistory: Array<{ role: string; content?: string; text?: string }>,
  ariaPersonality: string,
  previousImagePrompts?: string[]
): Promise<string> {
  // 1. Extract intent from last 4 user messages
  const recentContext = conversationHistory
    .slice(-4)
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content || msg.text || "")
    .filter(Boolean)
    .join(', ');

  // 2. Clean the recent context so it behaves as safe visual tags 
  // (removes complex punctuation that confuses Stable Diffusion)
  const cleanedContext = recentContext.replace(/[^\w\s,]/g, '').trim();

  // 3. Extract stylistic continuity
  const styleContinuity = previousImagePrompts && previousImagePrompts.length > 0
    ? previousImagePrompts.slice(-2).join(', ')
    : '';

  // 4. Build the enriched prompt as a comma-separated string for RunPod/BigLust
  const enrichedTags = [
    visualDescription,
    cleanedContext ? `intent: ${cleanedContext}` : null,
    `vibe: ${ariaPersonality}`,
    styleContinuity ? `continuity: ${styleContinuity}` : null
  ].filter(Boolean).join(', ');

  return enrichedTags;
}
