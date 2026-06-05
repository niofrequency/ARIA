// api/realtime-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WebSocketServer, WebSocket } from 'ws';

const XAI_WS_URL = 'wss://api.x.ai/v1/realtime?model=grok-voice-latest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  // Only allow WebSocket upgrade
  if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
    return res.status(400).json({ error: 'Expected WebSocket connection' });
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Proxy Error: Missing XAI_API_KEY');
    return res.status(500).json({ error: 'Missing API Key' });
  }

  // @ts-ignore - Vercel provides the underlying socket
  const { socket } = req;
  const wss = new WebSocketServer({ noServer: true });

  // Upgrade the incoming HTTP request to a WebSocket
  wss.handleUpgrade(req as any, socket as any, Buffer.alloc(0), (clientWs) => {
    console.log('🟢 Browser connected to Vercel Proxy');

    // 1. Open the secure connection to xAI (Headers work here!)
    const xaiWs = new WebSocket(XAI_WS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // 2. Relay: Browser → xAI
    clientWs.on('message', (data) => {
      if (xaiWs.readyState === WebSocket.OPEN) {
        xaiWs.send(data);
      }
    });

    // 3. Relay: xAI → Browser
    xaiWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    // 4. Handle Disconnects Gracefully
    clientWs.on('close', () => {
      console.log('⚪ Browser disconnected from proxy');
      if (xaiWs.readyState === WebSocket.OPEN) xaiWs.close();
    });

    xaiWs.on('close', (code, reason) => {
      console.log(`🔴 xAI disconnected. Code: ${code}, Reason: ${reason}`);
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code, reason);
    });

    // 5. Handle Errors
    clientWs.on('error', (err) => console.error('❌ Browser WS Error:', err));
    xaiWs.on('error', (err) => console.error('❌ xAI WS Error:', err));
  });
}
