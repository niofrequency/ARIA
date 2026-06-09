import { saveMemoryToFirestore, loadMemoriesFromFirestore } from "./firebaseService";
import { BotMood, EmotionalState } from "../types";

/**
 * MEMORY SERVICE (FIREBASE EDITION)
 * Bridges the frontend to the Firestore Database directly.
 * No external API or Vector DB required.
 * 
 * ENHANCED: Now tracks mood states and emotional context
 */

// 1. SAVE A FACT
export const storeMemory = async (text: string, userId: string, botId: string): Promise<boolean> => {
  // Clean the text to ensure we don't save empty spaces
  const cleanText = text?.trim();
  
  if (!cleanText || !userId || !botId) {
    console.warn("⚠️ Memory Service: Ignored save request. Missing text, userId, or botId.");
    return false;
  }
  
  try {
    // Directly save to Firebase
    await saveMemoryToFirestore(userId, botId, cleanText);
    return true;
  } catch (error) {
    console.error("❌ Memory Service: Failed to save memory to Firestore:", error);
    return false;
  }
};

// 2. RECALL FACTS
export const retrieveMemories = async (query: string, userId: string, botId: string): Promise<string[]> => {
  if (!userId || !botId) {
    return [];
  }

  try {
    // Fetch the last 50 memories from Firebase
    // Note: The "query" param is ignored here because we aren't doing vector search.
    // We simply feed the most recent 50 facts to the AI context.
    const memories = await loadMemoriesFromFirestore(userId, botId);
    
    // Filter out any potential empty or corrupted records from the database payload
    return (memories || []).filter(memory => typeof memory === 'string' && memory.trim() !== "");
  } catch (error) {
    console.error("❌ Memory Service: Failed to retrieve memories from Firestore:", error);
    return [];
  }
};

// 3. SAVE MOOD STATE WITH CONTEXT
/**
 * Stores the bot's current mood state as a structured memory entry
 * This allows the mood to persist across conversations and sessions
 */
export const storeMoodMemory = async (
  botMood: BotMood,
  emotionalState: EmotionalState,
  emotionalIntensity: number,
  userId: string,
  botId: string,
  context?: string
): Promise<boolean> => {
  if (!userId || !botId) {
    console.warn("⚠️ Memory Service: Cannot store mood. Missing userId or botId.");
    return false;
  }

  try {
    // Create a structured mood memory entry
    const moodEntry = `[MOOD_STATE|energy:${botMood.energy}|confidence:${botMood.confidence}|horniness:${botMood.horniness}|affection:${botMood.affection}|timeOfDay:${botMood.timeOfDay}|daysSinceSex:${botMood.daysSinceSex}|stressLevel:${botMood.stressLevel}|recentConflict:${botMood.recentConflict}|minutesSinceLastMessage:${botMood.minutesSinceLastMessage}|state:${emotionalState}|intensity:${emotionalIntensity}|timestamp:${Date.now()}${context ? `|context:${context}` : ''}]`;
    
    console.log("💾 Storing mood memory:", moodEntry);
    await saveMemoryToFirestore(userId, botId, moodEntry);
    return true;
  } catch (error) {
    console.error("❌ Memory Service: Failed to save mood memory:", error);
    return false;
  }
};

// 4. RETRIEVE LATEST MOOD STATE
/**
 * Fetches the most recent mood state from memory
 * Returns the latest mood data or null if no mood memory exists
 */
export const retrieveLatestMoodMemory = async (
  userId: string,
  botId: string
): Promise<{ botMood: BotMood; emotionalState: EmotionalState; emotionalIntensity: number; context?: string } | null> => {
  if (!userId || !botId) {
    return null;
  }

  try {
    const memories = await loadMemoriesFromFirestore(userId, botId);
    
    if (!memories || memories.length === 0) {
      return null;
    }

    // Search for the most recent MOOD_STATE entry
    for (let i = memories.length - 1; i >= 0; i--) {
      const memory = memories[i];
      if (typeof memory === 'string' && memory.includes('[MOOD_STATE|')) {
        // Parse the mood state from the memory entry
        const parsed = parseMoodMemory(memory);
        if (parsed) {
          console.log("✅ Retrieved mood memory from storage:", parsed);
          return parsed;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("❌ Memory Service: Failed to retrieve latest mood memory:", error);
    return null;
  }
};

// 5. HELPER: Parse mood memory entry
/**
 * Parses a mood memory string back into structured mood data
 * Format: [MOOD_STATE|energy:75|confidence:65|...etc]
 */
function parseMoodMemory(
  memoryEntry: string
): { botMood: BotMood; emotionalState: EmotionalState; emotionalIntensity: number; context?: string } | null {
  try {
    // Extract the content between brackets
    const match = memoryEntry.match(/\[MOOD_STATE\|(.*?)\]/);
    if (!match) return null;

    const content = match[1];
    const params = new URLSearchParams(content.replace(/\|/g, '&'));

    const botMood: BotMood = {
      energy: parseInt(params.get('energy') || '75'),
      confidence: parseInt(params.get('confidence') || '65'),
      horniness: parseInt(params.get('horniness') || '45'),
      affection: parseInt(params.get('affection') || '80'),
      timeOfDay: (params.get('timeOfDay') || 'evening') as any,
      daysSinceSex: parseInt(params.get('daysSinceSex') || '0'),
      stressLevel: parseInt(params.get('stressLevel') || '20'),
      recentConflict: params.get('recentConflict') === 'true',
      minutesSinceLastMessage: parseInt(params.get('minutesSinceLastMessage') || '0'),
    };

    const emotionalState = (params.get('state') || 'playful') as EmotionalState;
    const emotionalIntensity = parseInt(params.get('intensity') || '6');
    const context = params.get('context') || undefined;

    return { botMood, emotionalState, emotionalIntensity, context };
  } catch (error) {
    console.error("⚠️ Memory Service: Failed to parse mood memory:", error);
    return null;
  }
}

// 6. RETRIEVE ALL MOOD HISTORY
/**
 * Fetches all mood state entries from memory, useful for tracking mood evolution
 */
export const retrieveMoodHistory = async (
  userId: string,
  botId: string,
  limit: number = 10
): Promise<Array<{ botMood: BotMood; emotionalState: EmotionalState; emotionalIntensity: number; timestamp: number }>> => {
  if (!userId || !botId) {
    return [];
  }

  try {
    const memories = await loadMemoriesFromFirestore(userId, botId);
    
    if (!memories || memories.length === 0) {
      return [];
    }

    const moodHistories = [];
    
    // Extract all MOOD_STATE entries
    for (const memory of memories) {
      if (typeof memory === 'string' && memory.includes('[MOOD_STATE|')) {
        const parsed = parseMoodMemory(memory);
        if (parsed) {
          // Extract timestamp if available
          const timestampMatch = memory.match(/timestamp:(\d+)/);
          const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
          
          moodHistories.push({
            botMood: parsed.botMood,
            emotionalState: parsed.emotionalState,
            emotionalIntensity: parsed.emotionalIntensity,
            timestamp,
          });
        }
      }
    }

    // Return the most recent entries (up to limit)
    return moodHistories.slice(-limit);
  } catch (error) {
    console.error("❌ Memory Service: Failed to retrieve mood history:", error);
    return [];
  }
};
