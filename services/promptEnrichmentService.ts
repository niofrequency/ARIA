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
    .join(', ')
    .substring(0, 150); // ✅ Limit to 150 chars

  // 2. Clean the recent context
  const cleanedContext = recentContext
    .replace(/[[\]{}<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 3. Extract stylistic continuity (limit 2 previous prompts)
  const styleContinuity = previousImagePrompts && previousImagePrompts.length > 0
    ? previousImagePrompts.slice(-2)
        .map(p => p.substring(0, 80))  // ✅ Limit each to 80 chars
        .join(', ')
    : '';

  // 4. Build enriched prompt with length control
  const enrichedTags = [
    visualDescription.substring(0, 200),  // ✅ Limit visual description
    cleanedContext ? `intent: ${cleanedContext}` : null,
    `vibe: ${ariaPersonality}`.substring(0, 100),  // ✅ Limit vibe
    styleContinuity ? `continuity: ${styleContinuity}` : null
  ]
    .filter(Boolean)
    .join(', ')
    .substring(0, 500); // ✅ Final limit: 500 chars max

  return enrichedTags;
}
