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

  // ⚠️ PROTOTYPE WORKAROUND:
  // Since xAI's /sessions endpoint is restricted, we are passing the Master API key 
  // directly to the frontend. Do NOT deploy this publicly without authentication, 
  // or others could steal your xAI API key from the network tab.
  return res.status(200).json({ 
    client_secret: apiKey 
  });
}
