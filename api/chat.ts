import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ARIA BRAIN PROXY (xAI Grok)
 * Logic:
 * 1. Secures the XAI_API_KEY on the server side.
 * 2. Proxies the "Brain" dialogue to Grok.
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

    // ✅ CRITICAL FIX: Sanitize the messages array
    // xAI will throw a 400 Bad Request if ANY message has an empty string ("") for content.
    const sanitizedMessages = messages
      .filter(msg => msg && typeof msg.content === 'string' && msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role,
        content: msg.content.trim()
      }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({ error: 'Message payload is empty after sanitization.' });
    }

    const targetModel = model || "grok-4.3"; // Note: Ensure your API tier supports the literal string "grok-3"
    console.log(`🧠 Proxying request to xAI: ${targetModel}`);
    
    // 3. EXECUTE NEURAL REQUEST
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: sanitizedMessages, // Send the cleaned array
        model: targetModel, 
        temperature: temperature || 0.85, 
        max_tokens: 1000,       
        stream: false,
        frequency_penalty: 1.1, 
        presence_penalty: 0.6
      })
    });

    // 4. ERROR HANDLING
    if (!response.ok) {
      // ✅ We capture the EXACT error xAI returns so you can see it in Vercel
      const errText = await response.text();
      console.error(`❌ xAI API Rejected Request: ${response.status}`, errText);
      console.error("📦 Payload that failed:", JSON.stringify(sanitizedMessages, null, 2));
      
      return res.status(response.status).json({ 
        error: `Neural Link Error: ${response.status}`,
        details: errText 
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    // 5. SMART AWARENESS DETECTION
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
