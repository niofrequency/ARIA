// services/realtimeVoiceService.ts

export class RealtimeVoiceSession {
  private ws: WebSocket | null = null;
  private isIntentionallyClosed: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  async startSession() {
    this.isIntentionallyClosed = false;
    this.connect();
  }

  private connect() {
    try {
      // 1. Dynamically build the proxy URL based on current environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/realtime-proxy`;

      console.log("🔄 Connecting to Aria Voice Proxy...", wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("🟢 Realtime Neural Link Established");
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        
        // 2. Initialize session parameters
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
        this.ws = null;

        // 3. Auto-Reconnect Logic (Protects against Vercel timeouts)
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`🔄 Reconnecting in ${timeout / 1000} seconds... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), timeout);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error("❌ Max reconnect attempts reached. Please start a new call.");
        }
      };

    } catch (error) {
      console.error("❌ Failed to start Realtime Session:", error);
    }
  }

  private handleSocketMessage(event: any) {
    switch (event.type) {
      case 'response.output_audio.delta':
        // Base64 PCM audio data
        // TODO: Pass this to your Audio Context player
        break;
      
      case 'response.output_audio_transcript.delta':
        console.log("🗣️ Aria:", event.delta);
        break;

      case 'input_audio_buffer.speech_started':
        console.log("🎤 You started speaking...");
        break;
        
      case 'error':
        console.error('❌ xAI Stream Error:', event.error?.message || event);
        break;
    }
  }

  stopSession() {
    this.isIntentionallyClosed = true; // Prevents auto-reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
