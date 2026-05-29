import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ARIA VISION PROXY (xAI Grok Vision)
 * Logic:
 * 1. Takes a base64 image from the frontend.
 * 2. Uses Grok-2-Vision to analyze the image.
 * 3. Returns a concise text description to feed into Biglust/RunPod.
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
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided in payload.' });
    }

    console.log(`👁️ Proxying vision request to xAI: grok-2-vision-1212`);

    // Extract base64 data and mime type if formatted as a data URL
    const isDataUrl = image.includes('data:image');
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (isDataUrl) {
      mimeType = image.substring(5, image.indexOf(';'));
      base64Data = image.split(',')[1];
    }

    // 3. EXECUTE VISION REQUEST
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-2-vision-1212", 
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and write a highly detailed visual description for an AI image generation prompt. Focus strictly on physical features (hair style and color, facial structure, skin tone), body type, exact clothing, and the current pose. Do not describe the background. Keep it to one concise, comma-separated paragraph."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.2
      })
    });

    // 4. ERROR HANDLING
    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ xAI Vision API Rejected Request: ${response.status}`, errText);
      return res.status(response.status).json({ 
        error: `Vision Link Error: ${response.status}`,
        details: errText 
      });
    }

    const data = await response.json();
    const caption = data.choices[0]?.message?.content || "";

    // 5. RETURN CAPTION
    return res.status(200).json({
      caption: caption.trim()
    });

  } catch (error: any) {
    console.error("❌ Vercel Vision Proxy Critical Failure:", error);
    return res.status(500).json({ 
      error: 'Internal Vision Link failure.',
      message: error.message 
    });
  }
}
