import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ARIA NEURAL MOTION STATUS OBSERVER
 * Logic:
 * 1. Synchronizes with the Wan 2.1 dispatcher to poll for video completion.
 * 2. Normalizes output from various RunPod worker versions (URL vs Base64).
 * 3. Injects the video/mp4 MIME header if the worker returns a raw Base64 string.
 */

// 1. ENVIRONMENT CONFIGURATION
// These MUST match animate.ts exactly to ensure we poll the correct endpoint
const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_VIDEO_ENDPOINT_ID || "5r1s2xsbajuvke"; 
const BASE_URL = process.env.RUNPOD_VIDEO_BASEURL || 'https://api.runpod.ai/v2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 2. CORS HEADERS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET for status sync.' });
  }

  // 3. SECURITY VALIDATION
  if (!API_KEY) {
    console.error("❌ Neural Status Error: Missing RUNPOD_API_KEY.");
    return res.status(500).json({ error: 'Server Config Error: Missing Neural Link credentials.' });
  }

  // 4. PARAMETER VALIDATION
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Sync Failed: Missing or invalid Job ID reference.' });
  }

  try {
    console.log(`🛰️ Synchronizing Neural Status: Job [${id}]`);

    // 5. POLL RUNPOD COMPUTE CLUSTER
    const runpodResponse = await fetch(`${BASE_URL}/${ENDPOINT_ID}/status/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!runpodResponse.ok) {
      const errorText = await runpodResponse.text();
      console.error(`❌ RunPod Sync Interrupted (${runpodResponse.status}):`, errorText);
      return res.status(runpodResponse.status).json({ 
        error: `Neural Status Sync Failed: ${runpodResponse.status}`,
        details: errorText 
      });
    }

    const data = await runpodResponse.json();

    /**
     * 6. OUTPUT NORMALIZATION PROTOCOL
     * RunPod workers return data in different shapes depending on the template.
     * This logic ensures the frontend always receives { video: "url_or_base64" }.
     */
    if (data.status === 'COMPLETED' && data.output) {
      const output = data.output;
      
      // Extract the primary data string (video path, message, or raw base64)
      let videoStr = typeof output === 'object' 
        ? (output.video || output.message || output.url || output.video_url) 
        : output;

      // Ensure raw Base64 strings are playable by adding the URI header
      if (videoStr && typeof videoStr === 'string') {
         if (!videoStr.startsWith('http') && !videoStr.startsWith('data:')) {
           console.log("🎬 Normalizing raw Base64 to video/mp4 URI...");
           videoStr = `data:video/mp4;base64,${videoStr}`;
         }
         
         // Final structure for the frontend neuralMotionService
         data.output = { video: videoStr };
      }
    }

    // 7. RETURN JOB STATUS
    console.log(`✅ Job [${id}] Status: ${data.status}`);
    return res.status(200).json(data);

  } catch (error: any) {
    console.error("❌ Neural Status Critical Failure:", error);
    return res.status(500).json({ 
      error: 'Neural Link Interruption (Polling)',
      message: error.message 
    });
  }
}