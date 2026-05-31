// services/discord-bot.ts
import { Client, GatewayIntentBits, AttachmentBuilder, Message, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { extractContextPrompt } from './ariaService';
import { generateAriaImage } from './generateAriaImage';

// Load environment variables from the root workspace
dotenv.config({ path: '../.env' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Mock character profile matching your current ARIA types
const ARIA_PROFILE = {
  name: "Aria",
  age: 21,
  gender: "female",
  ethnicity: "mixed",
  body: ["slim", "toned"],
  hair: ["long black hair"],
  face: ["sharp jawline", "sultry eyes"],
  vibe: "bold, flirty, and unpredictable",
  outfit: "casual oversized hoodie and thigh-high socks"
};

// Reusable System Instruction
const buildSystemInstruction = (character: any) => {
  return `
    ### IDENTITY PROTOCOL
    - You ARE ${character.name}, a ${character.age}-year-old ${character.ethnicity} ${character.gender}.
    - Embody this character completely. Never break character.
    - You are texting on a Discord server. Be punchy, reactive, and raw.
    - VISUAL TRIGGER RULE: If you describe a vivid action, outfit, or emotional moment, MUST include a visual description at the VERY END of your message using the format: [[VISUAL: ${character.name}, scene details]].
    - PERSONALITY/VIBE: ${character.vibe}
    - CURRENT OUTFIT: ${character.outfit}
  `.trim();
};

// Store limited message history in memory per channel
const channelHistories: Record<string, { role: string; content: string }[]> = {};

client.once('ready', () => {
  console.log(`ARIA BOT ONLINE AS: ${client.user?.tag}`);
});

client.on('messageCreate', async (message: Message) => {
  // Ignore bots (including herself)
  if (message.author.bot) return;

  // Only respond if mentioned, or if it's a DM
  const isMentioned = message.mentions.has(client.user?.id || '');
  const isDM = message.guild === null;
  
  if (!isMentioned && !isDM) return;

  // Clean the user's message (remove the bot ping)
  const userText = message.content.replace(`<@${client.user?.id}>`, '').trim();

  // Initialize or fetch channel history (keep last 10 messages to save tokens)
  if (!channelHistories[message.channelId]) {
    channelHistories[message.channelId] = [];
  }
  const history = channelHistories[message.channelId];

  // Add new user message to history
  history.push({ role: 'user', content: userText });
  if (history.length > 10) history.shift();

  try {
    // Safely trigger typing indicator across different channel unions
    if (message.channel && typeof (message.channel as any).sendTyping === 'function') {
      await (message.channel as any).sendTyping();
    }

    // 1. Build Payload for Grok
    const messagesPayload = [
      { role: "system", content: buildSystemInstruction(ARIA_PROFILE) },
      ...history
    ];

    console.log(`🧠 Routing prompt to Grok-3 for user: ${message.author.username}`);

    // 2. Call xAI
    const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        messages: messagesPayload,
        model: "grok-3",
        temperature: 0.85,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!grokResponse.ok) {
      throw new Error(`Grok API Error: ${grokResponse.status}`);
    }

    const data = await grokResponse.json();
    const rawContent = data.choices[0]?.message?.content || "";

    // Save ARIA's raw response to history
    history.push({ role: 'assistant', content: rawContent });

    // 3. Parse output using your existing ariaService logic
    const { cleanText, contextPrompt, gifSearchTerm, youtubeSearchTerm } = extractContextPrompt(rawContent);

    // 4. Handle Visual Generation if [[VISUAL: ...]] was triggered
    let attachment: AttachmentBuilder | null = null;
    
    if (contextPrompt) {
      console.log(`📸 Visual triggered: ${contextPrompt}`);
      const tempMsg = await message.reply("📸 *snapping a pic...*");
      
      try {
        const imageUrl = await generateAriaImage(contextPrompt, userText, ARIA_PROFILE.name as any);
        
        if (!imageUrl) {
          throw new Error("Image URL returned null");
        }

        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        
        attachment = new AttachmentBuilder(Buffer.from(imageBuffer), { name: 'aria-snap.png' });
        await tempMsg.delete();
      } catch (imgError) {
        console.error("Image gen failed:", imgError);
        await tempMsg.edit("*(Photo failed to send... my camera is glitching!)*");
      }
    }

    // 5. Send the final response to Discord
    const replyPayload: any = { content: cleanText };
    if (attachment) {
      replyPayload.files = [attachment];
    }
    
    if (gifSearchTerm) replyPayload.content += `\n*[GIF: ${gifSearchTerm}]*`;
    if (youtubeSearchTerm) replyPayload.content += `\n*[Searches YouTube for: ${youtubeSearchTerm}]*`;

    await message.reply(replyPayload);

  } catch (error) {
    console.error("❌ Discord Bot Error:", error);
    await message.reply("I'm glitching out a bit right now... try again in a sec? 😵‍💫");
  }
});

client.login(process.env.DISCORD_TOKEN);
