# 🤖 ARIA ✨ 
### A Multi-Modal AI Platform for Living Customized Digital Characters

![ARIA Logo](<img/ARIA-BANNER.png>)

ARIA is a next-generation **multi-modal AI companion platform** that fuses advanced conversational intelligence with real-time cinematic image generation. Designed with a sleek **Cyber-Noir** aesthetic, ARIA creates immersive digital characters that don’t just respond — they *exist visually*, consistently, and persistently across conversations.

Built for experimentation, storytelling, and next-level AI companions, ARIA bridges text, memory, and vision into a single coherent system.

---

## 🚀 Core Features

- **Multi-Modal Intelligence**  
  Powered by **Grok-3**, ARIA maintains deep personality consistency, emotional tone, and situational awareness across conversations.

- **Real-Time Visual Synthesis**  
  A custom **RunPod + ComfyUI** pipeline generates photorealistic, cinematic images dynamically from conversation context.

- **Persistent Character Identity**  
  Physical traits (age, skin tone, hair, vibe, style) are stored in Firebase and injected into both text and image prompts for exact character continuity.

- **Director’s Notes System**  
  The AI appends structured visual instructions that seamlessly bridge language and vision without polluting the user-facing dialogue.

- **Smart Memory Engine**  
  Rolling context windows combined with Firebase-backed message history for long-term conversational coherence.

- **Image Archive Management**  
  Automatic rotation of generated images with a per-character **“Recent 10”** gallery to control storage usage.

- **Neural Link UI**  
  High-performance React interface with a futuristic grid aesthetic, fully responsive and iOS safe-area aware.

---

## 🎬 Visual-First AI Architecture (“Director’s Notes”)

ARIA uses a purpose-built bridge between language and vision.

The system prompt instructs the LLM to append **Director’s Notes** in a structured format:



Application logic then:
1. Extracts the visual directive for the image pipeline  
2. Cleans the response text for the user interface  
3. Merges the directive with persistent character traits  
4. Generates a consistent image using a dual-sampling refiner workflow  

This ensures **cinematic consistency without breaking immersion**.

---

## 🖼️ ARIA Interface Preview

Visual examples of ARIA in action:

![ARIA Dashboard](<img/ARIA-DASHBOARD.png>)

---

## 🛠 Technology Stack

- **Frontend**: React 19, TypeScript, Vite  
- **Styling**: Tailwind CSS  
- **AI Engine**: Grok-3 (via x.ai API)  
- **Image Generation**: Stable Diffusion / ComfyUI (RunPod Serverless)  
- **Backend / BaaS**: Firebase (Auth, Firestore, Storage)  
- **UI Components**: Radix UI, Lucide React  

---

## 📦 Project Structure
```text

├── components/        # UI components (Auth, Sidebar, ChatArea)
│   └── ui/            # Base Radix / Shadcn components
├── lib/               # Core configuration (Firebase, utilities)
├── services/          # AI logic (ARIA brain, image generation, memory)
├── types.ts           # Global TypeScript interfaces
└── main.tsx           # Application entry point

```
---

## ⚠️ Usage Disclaimer

---

ARIA is an experimental AI companion platform.  
All generated content (text and images) is produced by machine learning models and should be interpreted as **fictional or creative output**.

Users are responsible for:
- Ensuring compliance with local laws and platform policies  
- Managing API usage costs (x.ai, RunPod, Firebase)  
- Avoiding misuse of generated content  

---

## 🛠 Installation

---

### 1. Clone the repository

```text
```bash
git clone https://github.com/your-username/ARIA-main.git
cd ARIA-main
```

### 2. Install dependencies:

```text
npm install
```

### 3. Create a .env.local file:

```text
VITE_XAI_API_KEY=your_grok_key
VITE_RUNPOD_API_KEY=your_runpod_key
VITE_FIREBASE_API_KEY=your_firebase_key
```

### 4. Start the development server:

```text
npm run dev
```
---

*Developed by Mark Antonio Pigome*

---
