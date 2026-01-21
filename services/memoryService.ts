import { saveMemoryToFirestore, loadMemoriesFromFirestore } from "./firebaseService";

/**
 * MEMORY SERVICE (FIREBASE EDITION)
 * Bridges the frontend to the Firestore Database directly.
 * No external API or Vector DB required.
 */

// 1. SAVE A FACT
export const storeMemory = async (text: string, userId: string, botId: string) => {
  if (!text || !userId || !botId) return;
  
  // Directly save to Firebase
  await saveMemoryToFirestore(userId, botId, text);
};

// 2. RECALL FACTS
export const retrieveMemories = async (query: string, userId: string, botId: string): Promise<string[]> => {
  if (!userId || !botId) return [];

  // Fetch the last 50 memories from Firebase
  // Note: The "query" param is ignored here because we aren't doing vector search.
  // We simply feed the most recent 50 facts to the AI context.
  return await loadMemoriesFromFirestore(userId, botId);
};
