import { saveMemoryToFirestore, loadMemoriesFromFirestore } from "./firebaseService";

/**
 * MEMORY SERVICE (FIREBASE EDITION)
 * Bridges the frontend to the Firestore Database directly.
 * No external API or Vector DB required.
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
