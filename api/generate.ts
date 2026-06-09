import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildImageConsistencyPrompt, buildEnrichedImagePrompt, VisualContextMemory } from '../lib/imageConsistency.js';

/**
 * ARIA NEURAL IMAGE PROXY (RunPod Serverless)
 * Logic:
 * 1. GET: Polls the status of a specific Job ID from RunPod.
 * 2. POST: Dispatches a ComfyUI workflow (supports Identity Images & Text-to-Image).
 * 3. IMAGE CONSISTENCY: Applies shot type, angle, position, and POV detection to prompts.
 */

const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "4to1a6ym21ucum";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS CONFIGURATION
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. ENVIRONMENT VALIDATION
  if (!API_KEY) {
    console.error("❌ Neural Backend Error: Missing RUNPOD_API_KEY");
    return res.status(500).json({ error: 'Server configuration error.' });
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
      // 1. Extract workflow, images, and enrichment context from the request body
      const { 
        workflow, 
        images,
        visualDescription,
        conversationHistory,
        userMessage,
        characterName,
        characterDescription,
        ariaPersonality,
        previousPrompts,
        userId
      } = req.body;
      
      if (!workflow) {
        return res.status(400).json({ error: 'Neural Workflow (ComfyUI) is required.' });
      }

      console.log(`🎨 Dispatching Imaging Workflow to Endpoint: ${ENDPOINT_ID}`);

      // 🔥 IMAGE CONSISTENCY ENRICHMENT PIPELINE 🔥
      let enrichedContextTags = "";

      if (visualDescription && userMessage) {
        console.log("🧠 Applying IMAGE CONSISTENCY Enrichment...");
        
        // Create a temporary visual memory for this generation
        const visualMemory = new VisualContextMemory();
        
        // Build image consistency metadata from user message
        const metadata = buildImageConsistencyPrompt(
          userMessage,
          characterName || "ARIA",
          visualMemory
        );

        console.log("📸 Shot Type:", metadata.shotType);
        console.log("📷 Camera Angle:", metadata.cameraAngle);
        console.log("🍆 Sexual Position:", metadata.sexualPosition);
        console.log("👁️ POV Action:", metadata.isPOVAction);
        
        // Build enriched prompt with all consistency rules
        enrichedContextTags = buildEnrichedImagePrompt(
          metadata,
          visualDescription,
          characterDescription || ariaPersonality || "casual"
        );

        console.log("✨ Enriched Tags:", enrichedContextTags);
      } else if (conversationHistory && conversationHistory.length > 0) {
        // Fallback: Use old enrichment method if image consistency isn't available
        console.log("🧠 Applying Server-Side Prompt Enrichment (legacy)...");
        enrichedContextTags = visualDescription || "";
      }

      // 2. Prepare the payload for RunPod
      const runpodInput: any = { workflow };

      // ✅ FIX: Keep the images array intact so the RunPod worker writes it to disk!
      if (images && Array.isArray(images)) {
        runpodInput.images = images;
        console.log("📸 Image array successfully attached to workflow payload.");
      }

      // 3. Inject enriched context into workflow
      if (enrichedContextTags) {
        // Locate and prepend to the appropriate prompt node
        if (workflow["6"]?.inputs?.text !== undefined) {
          workflow["6"].inputs.text = `${enrichedContextTags}, ${workflow["6"].inputs.text}`;
        } else if (workflow["111"]?.inputs?.prompt !== undefined) {
          workflow["111"].inputs.prompt = `${enrichedContextTags}, ${workflow["111"].inputs.prompt}`;
        }
      }

      // ✅ LOGS FOR PROMPT DEBUGGING
      const positivePrompt = workflow["6"]?.inputs?.text || workflow["111"]?.inputs?.prompt;
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
          input: runpodInput 
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
