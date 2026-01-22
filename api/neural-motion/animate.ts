import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ARIA NEURAL MOTION DISPATCHER (Wan 2.1 i2v)
 * Logic:
 * 1. Acts as a pure delivery driver for RunPod.
 * 2. Receives pre-orchestrated prompts from neuralMotionManager.
 * 3. Dispatches high-speed inference (8 steps) to the 80GB worker.
 */

// 1. ENVIRONMENT CONFIGURATION
const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_VIDEO_ENDPOINT_ID || "hlifnpqc8c1gqb";
const BASE_URL = process.env.RUNPOD_VIDEO_BASEURL || 'https://api.runpod.ai/v2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 2. CORS HEADERS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. SECURITY VALIDATION
  if (!API_KEY) {
    console.error("❌ Server Config Error: Missing RUNPOD_API_KEY");
    return res.status(500).json({ error: 'Server Config Error.' });
  }

  try {
    // 4. DATA EXTRACTION
    // 'prompt' and 'negativePrompt' are already cleaned by the Manager before arriving here.
    const { imageUrl, prompt, negativePrompt, isLandscape, loraName } = req.body;

    if (!imageUrl || !prompt) {
      return res.status(400).json({ error: 'Incomplete payload.' });
    }

    // 5. RESOLUTION CALIBRATION
    const videoWidth = isLandscape ? 832 : 480;
    const videoHeight = isLandscape ? 480 : 832;

    // 6. LORA MAPPING
    const loraPairs = loraName ? [
      {
        path: loraName,
        model_weight: 0.85,
        clip_weight: 0.85
      }
    ] : [];

    // 7. PAYLOAD CONSTRUCTION
    const payload = {
      input: {
        prompt: prompt,
        negative_prompt: negativePrompt, 
        image_url: imageUrl, 
        seed: Math.floor(Math.random() * 2147483647),
        cfg: 2.0,
        width: videoWidth,
        height: videoHeight,
        length: 41,
        steps: 8,
        context_overlap: 4,
        lora_pairs: loraPairs 
      }
    };

    console.log(`🚀 Dispatching Orchestrated Job | LoRA: ${loraName || 'None'}`);

    // 8. DISPATCH TO RUNPOD
    const runpodUrl = `${BASE_URL}/${ENDPOINT_ID}/run`;
    
    const response = await fetch(runpodUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ RunPod Rejected:", errorText);
      return res.status(response.status).json({ error: 'Neural Engine Rejected Request' });
    }

    const data = await response.json();
    return res.status(200).json({ id: data.id });

  } catch (error: any) {
    console.error("❌ Critical API Failure:", error);
    return res.status(500).json({ error: 'Internal Neural Link Error' });
  }

}
