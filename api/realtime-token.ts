// api/realtime-token.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS CONFIGURATION
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("❌ Backend Error: XAI_API_KEY is not defined.");
    return res.status(500).json({ error: 'Missing Neural Link credentials.' });
  }

  try {
    // Note: If xAI follows the exact OpenAI Realtime API spec, the endpoint is /v1/realtime/sessions
    // Double check xAI's documentation for the exact URL if it differs slightly.
    const response = await fetch("https://api.x.ai/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-voice-latest",
        voice: "ara" 
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ xAI Realtime Token Error: ${response.status}`, errText);
      return res.status(response.status).json({ error: `Neural Link Error: ${response.status}` });
    }

    const data = await response.json();
    
    // Return the ephemeral token to the frontend
    return res.status(200).json({ 
      client_secret: data.client_secret.value 
    });

  } catch (error: any) {
    console.error("❌ Vercel Proxy Critical Failure:", error);
    return res.status(500).json({ error: 'Internal failure.', message: error.message });
  }
}
