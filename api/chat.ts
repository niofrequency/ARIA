import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ARIA BRAIN PROXY (xAI Grok-3)
 * Logic:
 * 1. Secures the XAI_API_KEY on the server side.
 * 2. Proxies the "Brain" dialogue and visual extraction instructions to Grok-3.
 * 3. Handles CORS for the ARIA frontend.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS CONFIGURATION
  // Essential for allowing the Vite frontend to communicate with the Vercel Proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. ENVIRONMENT VALIDATION
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("❌ Backend Error: XAI_API_KEY is not defined in environment variables.");
    return res.status(500).json({ 
      error: 'Server configuration error: Missing Neural Link credentials (API Key).' 
    });
  }

  try {
    const { messages, model, temperature } = req.body;

    // Validate payload
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid message protocol. Expected array.' });
    }

    console.log(`🧠 Proxying request to xAI: ${model || "grok-3"}`);

    // 3. EXECUTE NEURAL REQUEST
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages,
        model: model || "grok-3", // Defaults to Grok-3 for high-fidelity reasoning
        temperature: temperature || 0.85, // Optimized for creative but consistent dialogue
        max_tokens: 800, // Increased slightly to ensure full [[VISUAL]] tags aren't cut off
        stream: false 
      })
    });

    // 4. ERROR HANDLING
    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ xAI API Rejected Request: ${response.status}`, errText);
      return res.status(response.status).json({ 
        error: `Neural Link Error: ${response.status}`,
        details: errText 
      });
    }

    const data = await response.json();

    // 5. RETURN NEURAL DATA
    return res.status(200).json(data);

  } catch (error: any) {
    console.error("❌ Vercel Proxy Critical Failure:", error);
    return res.status(500).json({ 
      error: 'Internal Neural Link failure.',
      message: error.message 
    });
  }
}