// services/ttsService.ts

/**
 * Plays text-to-speech audio for Aria, preserving all expressive special characters,
 * punctuation markers, and custom formatting cues passed into the text payload.
 * * @param text The expressive text string containing punctuation or special cues.
 * @param voiceId The identifier for the voice model target (defaults to 'ara').
 */
export const playAriaSpeech = async (text: string, voiceId: string = 'ara'): Promise<void> => {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text, // Retains full Unicode characters, punctuation, and expressive symbols
        voice_id: voiceId 
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS Failed: ${response.statusText}`);
    }

    // Convert the binary response to an audio Blob
    const audioBlob = await response.blob();
    
    // Create a temporary object URL for the browser's native Audio playback
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Play the audio and return a promise tracking completion or failure
    await audio.play();

    return new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onerror = (err) => {
        console.error("❌ Audio element encountered an error during playback:", err);
        URL.revokeObjectURL(audioUrl);
        resolve(); // Resolve to prevent hanging up upstream call stacks
      };
    });

  } catch (error) {
    console.error("❌ Audio playback failed:", error);
    throw error;
  }
};
