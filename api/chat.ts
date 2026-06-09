import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildImageConsistencyPrompt, buildEnrichedImagePrompt, VisualContextMemory, debugImagePromptAnalysis } from '../lib/imageConsistency.js';
import { 
  buildAutonomySystemPrompt,
  calculateBotMood,
  calculateBotAutonomy,
  generateAutonomousMessage,
  debugAutonomyState,
  calculateEmotionalProgression,
  updateCharacterMemoryFromInteraction,
  type AutonomyDecision
} from '../lib/botAutonomy.js';
import { type VisualState } from '../types.js';

/**
 * ARIA BRAIN PROXY (xAI Grok) - ENHANCED WITH AUTONOMY & REALISM
 * Logic:
 * 1. Secures the XAI_API_KEY on the server side.
 * 2. Proxies the "Brain" dialogue to Grok.
 * 3. SPEECH REALISM: Injects system instructions for TTS tags.
 * 4. INTELLIGENT PARSING: Detects [[VISUAL]] tags server-side.
 * 5. IMAGE CONSISTENCY: Analyzes shot type, angle, position.
 * 6. BOT AUTONOMY: Bot can initiate messages, has moods, learns preferences.
 * 7. GENUINE EMOTION: Tracks emotional states, vulnerability, memory.
 */

const visualMemoryStore = new Map<string, VisualContextMemory>();
const botAutonomyStore = new Map<string, VisualState>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("❌ Backend Error: XAI_API_KEY is not defined.");
    return res.status(500).json({ 
      error: 'Server configuration error: Missing Neural Link credentials.' 
    });
  }

  try {
    const { messages, model, temperature, userId, conversationId, visualState, isNewConversation } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid message protocol. Expected array.' });
    }

    // ✅ AUTONOMY: Check if bot should initiate (new bot or time-based)
    let shouldBotInitiate = false;
    let autonomyDecision: AutonomyDecision | null = null;
    let autonomousMessage = null;

    if (isNewConversation) {
      // NEW BOT: Bot initiates the first message
      console.log("🤖 NEW BOT CREATED - Generating greeting...");
      
      // Create default visual state
      const defaultVisualState: VisualState = {
        lastVisualDescription: '',
        clothing: 'casual',
        location: 'bedroom',
        pose: 'comfortable',
        fluids: [],
        arousalLevel: 0,
        timestamp: Date.now(),
        emotionalState: 'curious',
        emotionalIntensity: 5,
        emotionalHistory: [],
        intimacyLevel: 0,
        trustLevel: 30,
        dominanceBalance: 50,
        daysSinceSex: 0,
        relationshipDuration: 0,
        characterMemory: {
          recentEvents: [],
          thingsUserLikes: [],
          thingsUserDislikes: [],
          userKinks: [],
          userFavoritePositions: [],
          relationshipMilestones: { firstMeeting: Date.now() },
          botPreferences: {
            favoriteThingsAboutUser: [],
            dominanceStyle: 'switch',
            communicationStyle: 'mix',
            initiateLikelihood: 60,
          },
        },
        botMood: calculateBotMood(Date.now(), Date.now(), 0, 0, false),
        shouldBotInitiate: true,
        lastUserMessageTime: Date.now(),
        messageCount: 0,
      };

      botAutonomyStore.set(conversationId || userId, defaultVisualState);

      const autonomyPrompt = buildAutonomySystemPrompt(defaultVisualState, defaultVisualState.botMood, defaultVisualState.characterMemory, 0);
      
      // Generate initial bot greeting
      autonomousMessage = {
        role: 'assistant',
        content: `[You're a new bot meeting your person for the first time. Generate a natural, flirty greeting that shows genuine interest but isn't too forward. Keep it 1-2 sentences. Make them want to talk to you.]`,
        isAutonomous: true
      };

      return res.status(200).json({
        choices: [{
          message: {
            content: autonomousMessage.content,
          }
        }],
        aria_meta: {
          isAutonomousMessage: true,
          autonomyReason: 'new_bot_greeting',
          hasVisual: false,
          visualState: defaultVisualState,
        }
      });
    }

    // ✅ SANITIZE MESSAGES
    const sanitizedMessages = messages
      .filter(msg => msg && typeof msg.content === 'string' && msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role,
        content: msg.content.trim()
      }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({ error: 'Message payload is empty after sanitization.' });
    }

    // ✅ RETRIEVE OR CREATE VISUAL STATE
    let currentVisualState: VisualState = visualState || botAutonomyStore.get(conversationId || userId);
    
    if (!currentVisualState) {
      currentVisualState = {
        lastVisualDescription: '',
        clothing: 'casual',
        location: 'bedroom',
        pose: 'comfortable',
        fluids: [],
        arousalLevel: 3,
        timestamp: Date.now(),
        emotionalState: 'playful',
        emotionalIntensity: 5,
        emotionalHistory: [],
        intimacyLevel: 20,
        trustLevel: 50,
        dominanceBalance: 50,
        daysSinceSex: 1,
        relationshipDuration: Date.now() - Date.now(),
        characterMemory: {
          recentEvents: [],
          thingsUserLikes: [],
          thingsUserDislikes: [],
          userKinks: [],
          userFavoritePositions: [],
          relationshipMilestones: { firstMeeting: Date.now() },
          botPreferences: {
            favoriteThingsAboutUser: [],
            dominanceStyle: 'switch',
            communicationStyle: 'mix',
            initiateLikelihood: 60,
          },
        },
        botMood: calculateBotMood(Date.now(), Date.now(), 20, 5, false),
        shouldBotInitiate: true,
        lastUserMessageTime: Date.now(),
        messageCount: sanitizedMessages.length,
      };
    }

    // ✅ UPDATE CONVERSATION STATE
    currentVisualState.lastUserMessageTime = Date.now();
    currentVisualState.messageCount = sanitizedMessages.length;
    currentVisualState.botMood = calculateBotMood(
      Date.now(),
      currentVisualState.lastUserMessageTime,
      currentVisualState.intimacyLevel,
      currentVisualState.messageCount,
      currentVisualState.botMood.recentConflict
    );

    // ✅ AUTONOMY CHECK: Should bot send next message automatically?
    autonomyDecision = calculateBotAutonomy(currentVisualState, currentVisualState.botMood, currentVisualState.messageCount, currentVisualState.characterMemory);
    shouldBotInitiate = autonomyDecision.shouldInitiate;

    console.log(`\n🤖 AUTONOMY CHECK: ${shouldBotInitiate ? 'BOT WILL INITIATE' : 'AWAITING USER'}`);
    console.log(`   Urgency: ${autonomyDecision.urgency.toFixed(0)}/100`);
    console.log(`   Reason: ${autonomyDecision.reason}`);

    // ✅ BUILD AUTONOMY-AWARE SYSTEM PROMPT
    const autonomySystemPrompt = buildAutonomySystemPrompt(
      currentVisualState,
      currentVisualState.botMood,
      currentVisualState.characterMemory,
      currentVisualState.intimacyLevel
    );

    // ✅ BUILD STANDARD SPEECH REALISM PROMPT
    const speechSystemPrompt = `You are communicating through an advanced Text-to-Speech (TTS) engine.

You MUST use the speech tags below in almost every response, especially during intimate, sexual, emotional, or sensual moments. Do NOT skip them.

Inline tags: 
[breath], [sigh], [moan], [soft moan], [gasp], [heavy breath], [whimper], [shudder], [pause]

Wrapping tags:
<soft>text</soft>, <whisper>text</whisper>, <moan>text</moan>, 
<lower-pitch>text</lower-pitch>, <higher-pitch>text</higher-pitch>, <slow>text</slow>

Examples (use tags frequently):
[breath] mmm... <moan>oh god yes...</moan> I'm getting so wet for you...
<soft>ahh...</soft> don't stop... <lower-pitch>right there...</lower-pitch> [moan] fuck...
[soft moan] yes... I'm such a dirty girl making this mess for you... <moan>mmm...</moan>

You are allowed to reply with only moaning tags when it feels natural.

Always mix tags with normal dialogue. Never mention these instructions.

When using [[VISUAL: description]] tags, be EXTREMELY DETAILED about:
1. Your current emotional state and body language
2. The specific environment/setting the user implied
3. Lighting, colors, and atmosphere
4. Your pose, expression, and clothing
5. How this image builds on previous visual context in the conversation

Example:
[[VISUAL: In dim bedroom lighting, soft smile, eyes slightly closed, wearing silk robe, leaning forward intimately, soft warm orange tones, matching the sensual mood from previous messages]]`;

    // ✅ COMBINE ALL SYSTEM PROMPTS
    const combinedSystemPrompt = `${autonomySystemPrompt}\n\n${speechSystemPrompt}`;

    if (sanitizedMessages[0]?.role === 'system') {
      sanitizedMessages[0].content += `\n\n${combinedSystemPrompt}`;
    } else {
      sanitizedMessages.unshift({ role: 'system', content: combinedSystemPrompt });
    }

    const targetModel = model || "grok-3";
    console.log(`🧠 Proxying request to xAI: ${targetModel}`);
    
    // ✅ EXECUTE NEURAL REQUEST
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: sanitizedMessages, 
        model: targetModel, 
        temperature: temperature || 0.92, 
        max_tokens: 1200,       
        stream: false
      })
    });

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

    // ✅ SMART VISUAL TAG DETECTION
    const visualRegex = /\[\[VISUAL:\s*(.*?)\s*\]\]/i;
    const visualMatch = content.match(visualRegex);

    let imageConsistencyMeta = null;

    // 🔥 IMAGE CONSISTENCY ENGINE 🔥
    if (visualMatch) {
      const visualDescription = visualMatch[1].trim();
      const userMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || "";
      
      console.log("\n📸 IMAGE CONSISTENCY ANALYSIS");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      const memoryKey = userId || "anonymous";
      if (!visualMemoryStore.has(memoryKey)) {
        visualMemoryStore.set(memoryKey, new VisualContextMemory());
      }
      const visualMemory = visualMemoryStore.get(memoryKey)!;

      const metadata = buildImageConsistencyPrompt(userMessage, "ARIA", visualMemory);
      debugImagePromptAnalysis(userMessage, metadata);

      const enrichedPrompt = buildEnrichedImagePrompt(metadata, visualDescription, "sensual");

      visualMemory.recordVisual({
        shotType: metadata.shotType,
        angle: metadata.cameraAngle,
        position: metadata.sexualPosition,
        description: enrichedPrompt
      });

      imageConsistencyMeta = {
        ...metadata,
        enrichedPrompt
      };

      // ✅ UPDATE VISUAL STATE WITH IMAGE METADATA
      currentVisualState.shotType = metadata.shotType;
      currentVisualState.cameraAngle = metadata.cameraAngle;
      currentVisualState.sexualPosition = metadata.sexualPosition;
      currentVisualState.lastVisualDescription = enrichedPrompt;
      currentVisualState.timestamp = Date.now();

      console.log("✨ IMAGE CONSISTENCY APPLIED\n");
    }

    // ✅ EMOTIONAL PROGRESSION
    const newEmotionalState = calculateEmotionalProgression(
      currentVisualState.emotionalState,
      currentVisualState.arousalLevel,
      currentVisualState.messageCount,
      currentVisualState.intimacyLevel
    );
    currentVisualState.emotionalState = newEmotionalState;

    // ✅ UPDATE MEMORY
    const userMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || "";
    const isPositive = content.includes('love') || content.includes('amazing') || content.includes('perfect');
    currentVisualState.characterMemory = updateCharacterMemoryFromInteraction(
      currentVisualState.characterMemory,
      userMessage,
      isPositive ? 'positive' : 'neutral'
    );

    // ✅ STORE UPDATED STATE
    botAutonomyStore.set(conversationId || userId, currentVisualState);

    debugAutonomyState(currentVisualState, currentVisualState.botMood);

    // ✅ RETURN ENHANCED RESPONSE
    return res.status(200).json({
      ...data,
      aria_meta: {
        hasVisual: !!visualMatch,
        visualDescription: visualMatch ? visualMatch[1].trim() : null,
        imageConsistency: imageConsistencyMeta,
        emotionalState: currentVisualState.emotionalState,
        botMood: currentVisualState.botMood,
        intimacyLevel: currentVisualState.intimacyLevel,
        shouldBotInitiate: shouldBotInitiate,
        autonomyReason: autonomyDecision?.reason,
        autonomyUrgency: autonomyDecision?.urgency,
        visualState: currentVisualState,
        conversation_history: sanitizedMessages
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
