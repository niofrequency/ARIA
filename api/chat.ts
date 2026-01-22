import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ARIA BRAIN PROXY (xAI Grok-3)
 * Logic:
 * 1. Secures the XAI_API_KEY on the server side.
 * 2. Proxies the "Brain" dialogue to Grok-3.
 * 3. INTELLIGENT PARSING: Detects [[VISUAL]] tags server-side to flag the frontend.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS CONFIGURATION
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 2. ENVIRONMENT VALIDATION
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("❌ Backend Error: XAI_API_KEY is not defined.");
    return res.status(500).json({ 
      error: 'Server configuration error: Missing Neural Link credentials.' 
    });
  }

  try {
    const { messages, model, temperature } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid message protocol. Expected array.' });
    }

    // ... inside api/chat.ts

    console.log(`🧠 Proxying request to xAI: ${model || "grok-3"}`);
    
    // ADD THIS LINE TO SEE THE FULL CONVERSATION IN YOUR VERCEL LOGS:
    console.log("📤 Payload sent to Grok:", JSON.stringify(messages, null, 2)); 

    // 3. EXECUTE NEURAL REQUEST
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages,
        model: model || "grok-3", 
        temperature: temperature || 0.85, 
        max_tokens: 1000,       // Increased to ensure Visual Tags fit
        stream: false,
        frequency_penalty: 1.1, // Adjusted for slightly more natural flow
        presence_penalty: 0.6
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
    const content = data.choices[0]?.message?.content || "";

    // 5. SMART AWARENESS DETECTION
    // We scan the text here to see if Aria generated a visual tag.
    // This allows the frontend to instantly trigger the awareness loop.
    const visualRegex = /\[\[VISUAL:\s*(.*?)\s*\]\]/i;
    const visualMatch = content.match(visualRegex);

    // 6. RETURN ENHANCED RESPONSE
    return res.status(200).json({
      ...data,
      aria_meta: {
        has_visual: !!visualMatch,
        visual_description: visualMatch ? visualMatch[1].trim() : null
      }
    });

  } catch (error: any) {
    console.error("❌ Vercel Proxy Critical Failure:", error);
    return res.status(500).json({ 
      error: 'Internal Neural Link failure.',
      message: error.message 
    });
  }
}
