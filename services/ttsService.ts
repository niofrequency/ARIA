// services/ttsService.ts

/**
 * CACHE MEMORY
 * Stores generated audio URLs. Key: voiceId + text, Value: Blob URL
 */
const audioCache = new Map<string, string>();

// Track the currently playing audio so we can stop it if the user toggles it off
export let currentAudio: HTMLAudioElement | null = null;

/**
 * Strips TTS control tags for clean UI display.
 * Keeps the spoken text intact.
 */
export function stripTTSTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')           // remove <soft>, </lower-pitch>, etc.
    .replace(/\[[^\]]+\]/g, '')        // remove [breath], [pause], etc.
    .replace(/\s+/g, ' ')              // clean up double spaces left behind
    .trim();
}

export interface PlaySpeechResult {
  success: boolean;
  error?: string;
}

/**
 * Plays the audio. If it's already been generated, it instantly replays the cached file.
 */
export const playAriaSpeech = async (
  text: string, 
  voiceId: string = 'ara'
): Promise<PlaySpeechResult> => {
  if (!text?.trim()) {
    return { success: false, error: 'Empty text' };
  }

  // 1. Stop any currently playing audio before starting a new one
  stopAriaSpeech();

  // 2. Create a unique cache key based on the voice and the text
  const cacheKey = `${voiceId}-${text}`;

  try {
    // Check if we already have this audio generated in memory
    let audioUrl = audioCache.get(cacheKey);

    // 3. If we haven't generated this audio yet, fetch it from the API
    if (!audioUrl) {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice_id: voiceId }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      audioUrl = URL.createObjectURL(audioBlob);
      
      // Save it to our memory cache so we never fetch this exact text again
      audioCache.set(cacheKey, audioUrl);
    }

    // 4. Play the audio (either fresh or from the cache)
    currentAudio = new Audio(audioUrl);
    await currentAudio.play();

    // ⚠️ CRITICAL CHANGE: Do NOT use URL.revokeObjectURL(audioUrl) here anymore.
    // If we revoke it, the cached URL will be permanently broken the next time the user clicks play!
    currentAudio.onended = () => {
      currentAudio = null;
    };

    return { success: true };

  } catch (error: any) {
    console.error("❌ Audio playback failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Instantly stops any currently playing TTS audio.
 * You can call this from MainChatArea.tsx when a user clicks the "Stop Playing" button.
 */
export const stopAriaSpeech = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};
