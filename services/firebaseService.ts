import { db, storage } from '../lib/firebase';
import { UserData, CharacterProfile, Bot, Conversation, Message } from '../types';
  
const USERS_COLLECTION = 'users';

/**
 * --- MEDIA PERSISTENCE (IMAGES & VIDEOS) ---
 * Handles uploading media and maintaining a 10-item rotation per bot.
 */
export const uploadMediaToStorage = async (
  userId: string, 
  botId: string, 
  mediaUrlOrBase64: string, 
  type: 'image' | 'video' = 'image'
): Promise<string> => {
  try {
    const timestamp = Date.now();
    const extension = type === 'video' ? 'mp4' : 'png';
    const folderPath = `chat_media/${userId}/${botId}`;
    const fileName = `${folderPath}/${timestamp}.${extension}`;
    const storageRef = storage.ref().child(fileName);

    let blob: Blob;

    const response = await fetch(mediaUrlOrBase64);
    blob = await response.blob();
    
    await storageRef.put(blob);
    const permanentUrl = await storageRef.getDownloadURL();

    console.log(`✅ ${type} saved to ${botId} gallery:`, permanentUrl);

    // Manage 10-item limit PER BOT
    try {
        const botFolderRef = storage.ref().child(folderPath);
        const listResult = await botFolderRef.listAll();
        
        if (listResult.items.length > 10) {
          const sortedItems = listResult.items.sort((a, b) => a.name.localeCompare(b.name));
          const itemsToDelete = sortedItems.slice(0, sortedItems.length - 10);
          
          await Promise.all(itemsToDelete.map(item => {
            console.log(`Storage: Rotating out oldest asset: ${item.name}`);
            return item.delete();
          }));
        }
    } catch (cleanupErr) {
        console.warn("Cleanup warning (non-critical):", cleanupErr);
    }

    return permanentUrl;
  } catch (error) {
    console.error(`Error persisting ${type} to storage:`, error);
    throw new Error(`Upload failed: ${error}`);
  }
};

// Compatibility Alias
export const uploadImageToStorage = (userId: string, botId: string, url: string) => 
  uploadMediaToStorage(userId, botId, url, 'image');

/**
 * --- AVATAR/IDENTITY UPLOAD ---
 * Dedicated storage upload for Identity Images (bypasses the 10-item rotation limit)
 */
export const uploadAvatarToStorage = async (
  userId: string, 
  botId: string, 
  base64Data: string
): Promise<string> => {
  try {
    const fileName = `avatars/${userId}/${botId}_avatar.png`;
    const storageRef = storage.ref().child(fileName);

    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    await storageRef.put(blob);
    const permanentUrl = await storageRef.getDownloadURL();

    console.log(`✅ Identity Avatar saved:`, permanentUrl);
    return permanentUrl;
  } catch (error) {
    console.error(`Error persisting avatar to storage:`, error);
    throw error;
  }
};


/**
 * --- DELETE SINGLE MEDIA ---
 */
export const deleteMediaFromStorage = async (mediaUrl: string) => {
  if (!mediaUrl || !mediaUrl.includes('firebasestorage.googleapis.com')) return;

  try {
    const fileRef = storage.refFromURL(mediaUrl);
    await fileRef.delete();
    console.log("🗑️ Asset purged from storage:", mediaUrl);
  } catch (error) {
    console.warn("⚠️ Asset deletion skipped (link may be expired):", error);
  }
};

/**
 * --- HELPER: DELETE STORAGE FOLDER ---
 * Recursively clears all media for a specific bot path.
 */
const deleteStorageFolder = async (path: string) => {
  const ref = storage.ref().child(path);
  try {
    const listResult = await ref.listAll();

    const fileDeletions = listResult.items.map((item) => item.delete());
    const folderDeletions = listResult.prefixes.map((prefix) => 
      deleteStorageFolder(prefix.fullPath)
    );

    await Promise.all([...fileDeletions, ...folderDeletions]);
    console.log(`✅ Storage branch cleared: ${path}`);
  } catch (error) {
    console.warn(`⚠️ Cleanup warning for path ${path}:`, error);
  }
};

/**
 * --- HELPER: DELETE FIRESTORE COLLECTION ---
 * Firestore doesn't delete sub-collections automatically. We must do it manually.
 */
const deleteCollection = async (collectionPath: string) => {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();

  if (snapshot.size === 0) return;

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`🧹 Collection wiped: ${collectionPath}`);
};

/**
 * --- USER DATA HYDRATION ---
 */
export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userDocRef = db.collection(USERS_COLLECTION).doc(userId);
    const docSnap = await userDocRef.get();
    
    if (!docSnap.exists) return null;

    const data = docSnap.data() as UserData;

    // Normalization
    if (data.character) {
      data.character.hair = Array.isArray(data.character.hair) ? data.character.hair : [];
      data.character.face = Array.isArray(data.character.face) ? data.character.face : [];
      data.character.body = Array.isArray(data.character.body) ? data.character.body : [];
      data.character.activeRunpodLoras = Array.isArray(data.character.activeRunpodLoras) ? data.character.activeRunpodLoras : [];
      data.character.favoriteLoras = Array.isArray(data.character.favoriteLoras) ? data.character.favoriteLoras : [];
    }

    return { uid: userId, ...data };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const createUserData = async (userId: string): Promise<UserData> => {
    const newUser: UserData = {
        uid: userId,
        character: null,
        freeImagesUsed: 0,
        subscriptionStatus: 'free',
    };
    await db.collection(USERS_COLLECTION).doc(userId).set(newUser);
    return newUser;
};

/**
 * --- BOT PERSISTENCE ---
 */
export const saveBotToFirestore = async (userId: string, bot: Bot): Promise<void> => {
  try {
    const botToSave = JSON.parse(JSON.stringify(bot));

    // ✅ Upload Avatar safely and catch Storage rule errors
    if (
      botToSave.characterProfile && 
      botToSave.characterProfile.avatarImage && 
      botToSave.characterProfile.avatarImage.startsWith('data:image')
    ) {
      console.log(`Uploading new identity image for bot ${bot.id}...`);
      try {
        const avatarUrl = await uploadAvatarToStorage(userId, bot.id, botToSave.characterProfile.avatarImage);
        botToSave.characterProfile.avatarImage = avatarUrl; // Replace base64 with URL
      } catch (uploadError: any) {
        console.error("❌ Avatar upload blocked by Firebase Rules:", uploadError.message);
        botToSave.characterProfile.avatarImage = null;
      }
    }

    await db.collection(USERS_COLLECTION)
      .doc(userId)
      .collection('bots')
      .doc(bot.id)
      .set(botToSave, { merge: true });
    console.log(`✅ Neural profile ${bot.id} synced`);
  } catch (error) {
    console.error("Error saving bot profile:", error);
  }
};

export const loadBotsFromFirestore = async (userId: string): Promise<Bot[]> => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION)
      .doc(userId)
      .collection('bots')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Bot;
      if (data.characterProfile) {
        data.characterProfile.hair = Array.isArray(data.characterProfile.hair) ? data.characterProfile.hair : [];
        data.characterProfile.face = Array.isArray(data.characterProfile.face) ? data.characterProfile.face : [];
        data.characterProfile.body = Array.isArray(data.characterProfile.body) ? data.characterProfile.body : [];
        // ✅ Ensure arrays load properly so UI maps don't crash
        data.characterProfile.activeRunpodLoras = Array.isArray(data.characterProfile.activeRunpodLoras) ? data.characterProfile.activeRunpodLoras : [];
        data.characterProfile.favoriteLoras = Array.isArray(data.characterProfile.favoriteLoras) ? data.characterProfile.favoriteLoras : [];
      }
      return data;
    });
  } catch (error) {
    console.error("Error loading neural profiles:", error);
    return [];
  }
};

/**
 * --- DELETE BOT (TOTAL WIPEOUT) ---
 */
export const deleteBotFromFirestore = async (userId: string, botId: string): Promise<void> => {
  try {
    console.log(`🗑️ Terminating Bot: ${botId}...`);
    
    const mediaPath = `chat_media/${userId}/${botId}`;
    await deleteStorageFolder(mediaPath);

    try {
      const avatarRef = storage.ref().child(`avatars/${userId}/${botId}_avatar.png`);
      await avatarRef.delete();
      console.log(`🗑️ Identity Avatar purged.`);
    } catch (e) {
      // Silently ignore if avatar doesn't exist
    }

    const botPath = `${USERS_COLLECTION}/${userId}/bots/${botId}`;
    await deleteCollection(`${botPath}/memories`);
    await deleteCollection(`${botPath}/conversations`);

    await db.collection(USERS_COLLECTION)
      .doc(userId)
      .collection('bots')
      .doc(botId)
      .delete();
      
    console.log("✅ Bot, Memories, History, and Media successfully wiped.");
  } catch (error) {
    console.error("❌ Error deleting bot:", error);
    throw error;
  }
};

export const saveConversationToFirestore = async (userId: string, botId: string, conversation: Conversation): Promise<void> => {
  if (!userId || !botId || !conversation.id) {
    console.error("❌ Save aborted: Incomplete identifiers");
    return;
  }

  try {
    const sanitizedMessages = conversation.messages.map((msg: Message) => ({
      id: msg.id,
      role: msg.role,
      text: msg.text || "",
      imageUrl: msg.imageUrl || null,
      videoUrl: msg.videoUrl || null, 
      motionStatus: msg.motionStatus || 'idle', 
      timestamp: msg.timestamp || Date.now()
    }));

    const convDocRef = db.collection(USERS_COLLECTION)
      .doc(userId)
      .collection('bots')
      .doc(botId)
      .collection('conversations')
      .doc(conversation.id);

    await convDocRef.set({
      id: conversation.id,
      botId: botId,
      messages: sanitizedMessages,
      timestamp: conversation.timestamp || Date.now()
    }, { merge: true });
      
    console.log(`✅ Transmission Log Synced for Bot [${botId}]`);
  } catch (error) {
    console.error("❌ Transmission Sync Error:", error);
  }
};

export const loadConversationsFromFirestore = async (userId: string, botId: string): Promise<Conversation[]> => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION)
      .doc(userId)
      .collection('bots')
      .doc(botId)
      .collection('conversations')
      .orderBy('timestamp', 'desc')
      .get();
      
    return snapshot.docs.map(doc => doc.data() as Conversation);
  } catch (error) {
    console.error("❌ History retrieval error:", error);
    return [];
  }
};

export const saveCharacterProfile = async (userId: string, character: CharacterProfile): Promise<void> => {
    const profileToSave = JSON.parse(JSON.stringify(character));
    await db.collection(USERS_COLLECTION).doc(userId).update({ character: profileToSave });
};

export const incrementFreeImageCount = async (userId: string, currentCount: number): Promise<void> => {
    const newCount = (currentCount || 0) + 1;
    await db.collection(USERS_COLLECTION).doc(userId).update({ freeImagesUsed: newCount });
};

// 1. SAVE A MEMORY
export const saveMemoryToFirestore = async (userId: string, botId: string, text: string) => {
  try {
    await db.collection(USERS_COLLECTION)
      .doc(userId)
      .collection('bots')
      .doc(botId)
      .collection('memories')
      .add({
        text: text,
        timestamp: Date.now(),
        type: 'fact'
      });
    console.log("🔥 Firebase: Memory Saved ->", text);
  } catch (error) {
    console.error("Error saving memory:", error);
  }
};

// 2. LOAD MEMORIES
export const loadMemoriesFromFirestore = async (userId: string, botId: string): Promise<string[]> => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION)
      .doc(userId)
      .collection('bots')
      .doc(botId)
      .collection('memories')
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();
    
    return snapshot.docs.map(doc => doc.data().text);
  } catch (error) {
    console.error("Error loading memories:", error);
    return [];
  }
};
