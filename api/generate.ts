import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * ARIA NEURAL IMAGE PROXY (RunPod Serverless)
 * Logic:
 * 1. GET: Polls the status of a specific Job ID from RunPod.
 * 2. POST: Dispatches a ComfyUI workflow (BigLust.safetensors) to the worker.
 * 3. Environment: Handles both local (VITE_) and production (standard) keys.
 */

// Configuration: Checking local dev and production keys
const API_KEY = process.env.RUNPOD_API_KEY || process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "4to1a6ym21ucum";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS CONFIGURATION
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. ENVIRONMENT VALIDATION
  if (!API_KEY) {
    console.error("❌ Neural Backend Error: Missing RUNPOD_API_KEY");
    return res.status(500).json({ 
      error: 'Server configuration error: Missing Imaging Protocol credentials.' 
    });
  }

  // --- GET: POLL NEURAL STATUS ---
  if (req.method === 'GET') {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Job ID required for status sync.' });
    }

    try {
      console.log(`🛰️ Polling Neural Status for Job: ${id}`);
      
      const response = await fetch(`https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${id}`, {
        headers: { 
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ RunPod Status Error (${response.status}):`, errText);
        return res.status(response.status).json({ 
          error: `RunPod Status Sync Failed: ${response.status}`,
          details: errText 
        });
      }

      const data = await response.json();
      return res.status(200).json(data);

    } catch (error: any) {
      console.error("❌ Neural Status Proxy Critical Failure:", error);
      return res.status(500).json({ 
        error: 'Neural Link Interruption (Status)',
        message: error.message 
      });
    }
  }

  // --- POST: DISPATCH IMAGE JOB ---
  if (req.method === 'POST') {
    try {
      const { workflow } = req.body;
      
      if (!workflow) {
        return res.status(400).json({ error: 'Neural Workflow (ComfyUI) is required.' });
      }

      console.log(`🎨 Dispatching Imaging Workflow to Endpoint: ${ENDPOINT_ID}`);

      // ✅ ADD THESE LOGS HERE
      // Node "6" is the standard Positive Prompt node in your ComfyUI workflow
      const positivePrompt = workflow["6"]?.inputs?.text;
      console.log("\n🔍 --- FINAL PROMPT SENT TO RUNPOD ---");
      console.log(positivePrompt); 
      console.log("----------------------------------------\n");

      const response = await fetch(`https://api.runpod.ai/v2/${ENDPOINT_ID}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ 
          input: { 
            workflow 
          } 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ RunPod Dispatch Error (${response.status}):`, errorText);
        return res.status(response.status).json({ 
          error: `RunPod Initialization Failed: ${response.status}`,
          details: errorText 
        });
      }

      const data = await response.json();
      console.log("✅ Imaging Job Successfully Dispatched. ID:", data.id);
      
      return res.status(200).json(data);

    } catch (error: any) {
      console.error("❌ Neural Generation Proxy Critical Failure:", error);
      return res.status(500).json({ 
        error: 'Neural Link Interruption (Generation)',
        message: error.message 
      });
    }
  }

  // Fallback for unsupported methods
  return res.status(405).json({ error: 'Neural Method Not Allowed' });
}
