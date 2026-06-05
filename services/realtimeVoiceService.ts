// services/realtimeVoiceService.ts

export class RealtimeVoiceSession {
  private ws: WebSocket | null = null;

  async startSession() {
    try {
      // 1. Fetch the master key (disguised as the client secret) from your backend
      const tokenResponse = await fetch('/api/realtime-token', { method: 'POST' });
      const { client_secret } = await tokenResponse.json();

      if (!client_secret) throw new Error("Failed to retrieve connection key");

      // 2. Browser WebSocket Authentication Workaround
      // We pass the Token inside the standard protocols array. 
      // Most modern AI WebSocket servers parse this if standard headers are missing.
      this.ws = new WebSocket(
        'wss://api.x.ai/v1/realtime?model=grok-voice-latest', 
        [
          "realtime", 
          `bearer-${client_secret}` // Smuggling the auth token via subprotocol
        ]
      );

      this.ws.onopen = () => {
        console.log("🟢 Realtime Neural Link Established");
        
        // Initialize session parameters immediately upon connection
        this.ws?.send(JSON.stringify({
          type: 'session.update',
          session: {
            voice: 'ara',
            turn_detection: { type: 'server_vad' }, // Voice Activity Detection
            input_audio_transcription: { model: 'grok-2-audio' },
          },
        }));
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleSocketMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error("❌ Realtime WebSocket Error:", error);
      };

      this.ws.onclose = () => {
        console.log("🔴 Realtime Neural Link Disconnected");
      };

    } catch (error) {
      console.error("❌ Failed to start Realtime Session:", error);
    }
  }

  private handleSocketMessage(event: any) {
    switch (event.type) {
      case 'response.output_audio.delta':
        // Handle incoming audio from Grok (Base64 PCM)
        // You will need a PCM player here to hear the audio
        break;
      
      case 'response.output_audio_transcript.delta':
        // Handle live transcript text (like subtitles)
        console.log("Grok:", event.delta);
        break;
        
      case 'error':
        console.error('❌ xAI Stream Error:', event.error?.message || event);
        break;
    }
  }

  stopSession() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
