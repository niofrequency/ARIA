// services/ttsService.ts

export const playAriaSpeech = async (text: string, voiceId: string = 'ara') => {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice_id: voiceId }),
    });

    if (!response.ok) {
      throw new Error(`TTS Failed: ${response.statusText}`);
    }

    // Convert the binary response to a Blob
    const audioBlob = await response.blob();
    
    // Create a temporary URL for the browser's Audio object
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Play the audio
    await audio.play();

    // Clean up the URL from memory after it finishes playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

  } catch (error) {
    console.error("❌ Audio playback failed:", error);
  }
};
