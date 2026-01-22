import { RunPodJobResponse, CharacterProfile } from "../types";
import { orchestrateNeuralPrompt } from "./neuralMotionManager";

// ✅ YOUR PUBLIC R2 DOMAIN (For viewing videos)
const R2_PUBLIC_DOMAIN = "https://pub-5ad10447a420475ebb914b21e843d79d.r2.dev";

/**
 * Video Neural Mapping: Triggers specific .safetensors for Wan 2.1
 */
const LORA_MAP: Record<string, string> = {
  "creampie":                      "creampie.safetensors",
  "cum from your pussy":           "creampie.safetensors",
  "cum dripping from your pussy":  "creampie.safetensors",
  "cum from your vagina":          "creampie.safetensors",
  "cum dripping from your vagina": "creampie.safetensors",
  "cum in mouth":                  "cum-in-mouth.safetensors",
  "cum on your tongue":            "cum-in-mouth.safetensors",
  "cum dripping from your mouth":  "cum-in-mouth.safetensors",
  "drooling cum from your mouth":  "cum-in-mouth.safetensors",
  "cum drooling":                  "cum-in-mouth.safetensors",
  "fingering":                     "fingering.safetensors",
  "twerk":                         "twerk.safetensors",
  "twerking":                      "twerk.safetensors",
  "shaking your ass":              "twerk.safetensors",
  "pussy":                         "vagina.safetensors",
  "cunt":                          "vagina.safetensors",
  "vagina":                        "vagina.safetensors"
};

const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 }); 
    img.src = url;
  });
};

/**
 * INITIATE NEURAL MOTION
 * Delegates prompt logic to the Manager for high-fidelity Wan 2.1 output.
 * FIXED: Now accepts userPrompt to ensure character context is passed in position 3.
 */
export const initiateNeuralMotion = async (
  imageUrl: string, 
  aiDialogue: string, 
  userPrompt: string, // REQUIRED for liquid/motion detection
  character: CharacterProfile, // CRITICAL: Position 4 here, but passed as Position 3 to Manager
  negPrompt: string = ""
): Promise<string> => {
  
  const { width, height } = await getImageDimensions(imageUrl);
  const isLandscape = width > height;

  // 1. Detect LoRA (Scans BOTH user request and AI response)
  let activeLoraFile = "";
  const combinedLower = `${userPrompt} ${aiDialogue}`.toLowerCase();
  const sortedTriggers = Object.keys(LORA_MAP).sort((a, b) => b.length - a.length);
  
  for (const trigger of sortedTriggers) {
    if (combinedLower.includes(trigger)) {
      activeLoraFile = LORA_MAP[trigger];
      break; 
    }
  }

  // 2. Delegate Prompt Engineering to the Manager
  // This is where we pass the 3 arguments the Manager expects
  const { finalPositive, finalNegative } = orchestrateNeuralPrompt(aiDialogue, userPrompt, character);

  // 3. Prepare Dispatch Payload
  const payload = {
    imageUrl: imageUrl,        
    prompt: finalPositive,            
    negativePrompt: `${finalNegative}, ${negPrompt}`.trim(), // Merges Manager negs with UI negs
    isLandscape: isLandscape,
    loraName: activeLoraFile 
  };

  console.log("⚡ Dispatching Orchestrated Motion Request:", payload);

  const res = await fetch('/api/neural-motion/animate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`API Request Failed: ${await res.text()}`);

  const data = await res.json();
  if (!data.id) throw new Error('No Job ID returned.');
  
  return data.id; 
};

/**
 * POLL NEURAL MOTION STATUS
 */
export const pollNeuralMotionStatus = async (
  jobId: string, 
  onSuccess: (videoUrl: string) => void, 
  onError: (error: string) => void,
  attempt: number = 0
): Promise<void> => {
  const delay = 6000;

  setTimeout(async () => {
    try {
      const res = await fetch(`/api/neural-motion/status?id=${jobId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        if (attempt < 10) return pollNeuralMotionStatus(jobId, onSuccess, onError, attempt + 1);
        throw new Error(`Polling failed`);
      }

      const data: RunPodJobResponse = await res.json();

      if (data.status === 'COMPLETED' && data.output) {
        let finalContent: string = "";
        
        // Handle different RunPod output shapes
        if (typeof data.output === 'object' && data.output !== null) {
          const out = data.output as any;
          // 'message' is often used by the rp_upload script we added
          finalContent = out.message || out.video || out.video_url || out.url || "";
        } else {
          finalContent = data.output as string;
        }

        if (finalContent) {
           let videoSrc = finalContent;

           // --- 1. R2 DOMAIN SWAP (Private Upload URL -> Public View URL) ---
           // The worker returns 'r2.cloudflarestorage.com', but the browser needs 'r2.dev'
           if (videoSrc.includes("r2.cloudflarestorage.com")) {
               const filename = videoSrc.split('/').pop(); // Extracts "task_123.mp4"
               videoSrc = `${R2_PUBLIC_DOMAIN}/${filename}`;
           } 
           // --- 2. Base64 Fallback (Safety Net) ---
           // If it's NOT a URL and NOT a Data URI, it must be raw Base64. Wrap it.
           else if (!videoSrc.startsWith('http') && !videoSrc.startsWith('data:')) {
               videoSrc = `data:video/mp4;base64,${videoSrc}`;
           }

           onSuccess(videoSrc);
        } else {
          onError("No video payload found.");
        }
      } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        onError(data.error || 'Worker error');
      } else {
        if (attempt < 150) pollNeuralMotionStatus(jobId, onSuccess, onError, attempt + 1);
        else onError("Timed out.");
      }
    } catch (err: any) {
      if (attempt < 20) pollNeuralMotionStatus(jobId, onSuccess, onError, attempt + 1);
      else onError("Neural link interrupted.");
    }
  }, delay);
};
