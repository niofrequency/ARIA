// api/tts.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing XAI_API_KEY' });
  }

  try {
    const { text, voice_id = 'ara' } = req.body; // 'ara' is a warm voice, 'eve' is energetic

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voice_id,
        language: "en"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ TTS API Error:", errText);
      return res.status(response.status).json({ error: errText });
    }

    // Convert the response to a Buffer and send it back as an audio file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);

  } catch (error: any) {
    console.error("❌ TTS Proxy Failure:", error);
    return res.status(500).json({ error: error.message });
  }
}
