// services/ttsService.ts

/**
 * Strips TTS control tags for clean UI display.
 * Keeps the spoken text intact.
 * Export this and use it in your UI components (e.g., ChatMessage.tsx) to clean the text before rendering.
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

export const playAriaSpeech = async (
  text: string, 
  voiceId: string = 'ara'
): Promise<PlaySpeechResult> => {
  if (!text?.trim()) {
    return { success: false, error: 'Empty text' };
  }

  let audioUrl: string | null = null;

  try {
    // 1. Send the FULL text (WITH tags) to xAI TTS so the voice acting applies
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

    // Convert the binary response to a Blob
    const audioBlob = await response.blob();
    
    // Create a temporary URL for the browser's Audio object
    audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Play the audio
    await audio.play();

    // Clean up the URL from memory after it finishes playing
    audio.onended = () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };

    return { success: true };

  } catch (error: any) {
    console.error("❌ Audio playback failed:", error);
    
    // Ensure memory is cleared even if playback fails after Blob creation
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    
    return { success: false, error: error.message };
  }
};
