import React, { useState, useEffect, useCallback } from 'react';
import { Bot, CharacterProfile, Conversation, Message, UserData } from '../types';
import Sidebar from './Sidebar';
import MainChatArea from './MainChatArea';
import BotCustomizationModal from './BotCustomizationModal';
import CompanionCreationModal from './CompanionCreationModal';
import DefaultCompanionsModal from './DefaultCompanionsModal';
import LoadingScreen from './LoadingScreen';
import { 
  saveBotToFirestore, 
  loadBotsFromFirestore, 
  saveConversationToFirestore,  
  loadConversationsFromFirestore,
  deleteBotFromFirestore,
  uploadImageToStorage 
} from '../services/firebaseService';
import { generateAriaResponse, extractContextPrompt } from '../services/ariaService';

export type ViewState = 'discover' | 'create' | 'chat';

interface ChatDashboardProps {
  userData: UserData;
  onSignOut: () => void;
  onImageGenerated: () => void;
  onVideoSynthesized: (botId: string, base64: string) => Promise<string>;
}

const defaultNewBotCharacter: CharacterProfile = {
  name: 'New Companion',
  gender: 'female', 
  age: '24',
  hair: [], 
  face: [], 
  body: [], 
  vibe: 'A friendly and curious AI companion.',
  outfit: 'Casual modern attire',
  ethnicity: 'Latina', 
  negativePrompt: 'blurry, lowres, extra limbs, bad anatomy, watermark, text.',
  favoriteLoras: [],
  runpodModel: 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
  activeRunpodLoras: [],
  avatarImage: null
};

const ChatDashboard: React.FC<ChatDashboardProps> = ({ 
  userData, 
  onSignOut, 
  onImageGenerated,
  onVideoSynthesized 
}) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [conversations, setConversations] = useState<Map<string, Conversation[]>>(new Map());
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [autonomyEnabled, setAutonomyEnabled] = useState(true);
  
  // View & Routing States
  const [activeView, setActiveView] = useState<ViewState>('discover');
  const [showCustomizationModalForBotId, setShowCustomizationModalForBotId] = useState<string | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // --- HYDRATE HISTORY & RESTORE LAST ACTIVE BOT ---
  useEffect(() => {
    const hydrateHistory = async () => {
      if (!userData?.uid) return;
      try {
        const loadedBots = await loadBotsFromFirestore(userData.uid);
        const loadedConvsMap = new Map<string, Conversation[]>();
        
        // Normalize loaded bots to ensure array properties and new fields exist
        const normalizedBots = loadedBots.map(bot => ({
          ...bot,
          characterProfile: {
            ...bot.characterProfile,
            hair: Array.isArray(bot.characterProfile.hair) ? bot.characterProfile.hair : [],
            face: Array.isArray(bot.characterProfile.face) ? bot.characterProfile.face : [],
            body: Array.isArray(bot.characterProfile.body) ? bot.characterProfile.body : [],
            favoriteLoras: Array.isArray(bot.characterProfile.favoriteLoras) ? bot.characterProfile.favoriteLoras : [],
            activeRunpodLoras: Array.isArray(bot.characterProfile.activeRunpodLoras) ? bot.characterProfile.activeRunpodLoras : [],
            runpodModel: bot.characterProfile.runpodModel || 'Qwen-Rapid-AIO-NSFW-v23.safetensors',
          }
        }));

        for (const bot of normalizedBots) {
          const botConvs = await loadConversationsFromFirestore(userData.uid, bot.id);
          loadedConvsMap.set(bot.id, botConvs);
        }
        
        setBots(normalizedBots);
        setConversations(loadedConvsMap);
        
        if (normalizedBots.length > 0) {
          const savedLastBotId = localStorage.getItem('aria_last_active_bot');
          let targetBotId = (savedLastBotId && normalizedBots.some(b => b.id === savedLastBotId))
            ? savedLastBotId
            : normalizedBots[0].id;

          setSelectedBotId(targetBotId);
          localStorage.setItem('aria_last_active_bot', targetBotId);

          const targetBotConvs = loadedConvsMap.get(targetBotId);
          if (targetBotConvs && targetBotConvs.length > 0) {
            setCurrentConversationId(targetBotConvs[0].id);
          }
          
          setActiveView('chat'); // Go straight to chat if they have history
        } else {
          setActiveView('discover'); // Force discover page if new user
        }
      } catch (err) {
        console.error("Dashboard: History load error:", err);
      } finally {
        setIsInitialLoadComplete(true);
      }
    };
    hydrateHistory();
  }, [userData?.uid]);

  const handleSendMessage = useCallback(async (newMessage: Message) => {
    if (!selectedBotId || !currentConversationId || !userData?.uid) return;

    setIsLoadingResponse(newMessage.role === 'user');

    setConversations(prev => {
      const next = new Map(prev);
      const botConvs = [...(next.get(selectedBotId) || [])];
      
      const updatedConvs = botConvs.map(conv => {
        if (conv.id === currentConversationId) {
          const updatedConv = { 
            ...conv, 
            messages: [...conv.messages, newMessage], 
            timestamp: Date.now() 
          };
          saveConversationToFirestore(userData.uid!, selectedBotId, updatedConv);
          return updatedConv;
        }
        return conv;
      });

      return next.set(selectedBotId, updatedConvs);
    });
  }, [selectedBotId, currentConversationId, userData?.uid]);

  const handleUpdateMessage = useCallback(async (messageId: string, updates: Partial<Message>) => {
    if (!messageId || !selectedBotId || !currentConversationId || !userData?.uid) {
      setIsLoadingResponse(false);
      return;
    }

    try {
      let finalUpdates = { ...updates };

      if (updates.imageUrl && (updates.imageUrl.startsWith('data:') || updates.imageUrl.startsWith('blob:'))) {
        try {
            const permanentUrl = await uploadImageToStorage(userData.uid, selectedBotId, updates.imageUrl);
            finalUpdates.imageUrl = permanentUrl;
            onImageGenerated(); 
        } catch (uploadError) {
            console.error("❌ Critical: Image Upload Failed", uploadError);
        }
      }

      if (updates.videoUrl && (updates.videoUrl.startsWith('data:') || updates.videoUrl.startsWith('blob:'))) {
        const permanentVideoUrl = await onVideoSynthesized(selectedBotId, updates.videoUrl);
        finalUpdates.videoUrl = permanentVideoUrl;
        finalUpdates.isVideoLoading = false;
        finalUpdates.motionStatus = 'completed';
      }

      setConversations(prev => {
        const next = new Map(prev);
        const botConvs = [...(next.get(selectedBotId) || [])];
        const updatedConvs = botConvs.map(conv => {
          if (conv.id === currentConversationId) {
            const updatedMsgs = conv.messages.map(m => 
              m.id === messageId ? { ...m, ...finalUpdates } : m
            );
            const updatedConv = { ...conv, messages: updatedMsgs, timestamp: Date.now() };
            saveConversationToFirestore(userData.uid!, selectedBotId, updatedConv);
            return updatedConv;
          }
          return conv;
        });
        return next.set(selectedBotId, updatedConvs);
      });
    } catch (err) {
      console.error("❌ Dashboard: Update persistence error:", err);
    } finally {
      if (updates.text || updates.imageUrl || updates.videoUrl) {
        setIsLoadingResponse(false);
      }
    }
  }, [selectedBotId, currentConversationId, userData?.uid, onImageGenerated, onVideoSynthesized]);

  const handleSelectBot = (botId: string) => {
    setSelectedBotId(botId);
    localStorage.setItem('aria_last_active_bot', botId);
    const botConvs = conversations.get(botId) || [];
    if (botConvs.length > 0) {
      setCurrentConversationId(botConvs[0].id);
    } else {
      handleNewConversation(botId, true, autonomyEnabled);
    }
    setActiveView('chat');
    setIsMobileSidebarOpen(false);
  };

  const handleCreateNewCompanion = async (newCharacter: CharacterProfile) => {
    if (!userData?.uid) return;
    
    const newBotId = generateUniqueId('bot');
    const newBotName = newCharacter.name || `Companion ${bots.length + 1}`;
    
    const newBot: Bot = {
      id: newBotId,
      name: newBotName,
      personality: newCharacter.vibe || 'A friendly companion.',
      avatarColor: 'bg-purple-600',
      characterProfile: newCharacter,
      lastMessagePreview: 'Initialize Link...',
      lastActivity: Date.now(),
    };

    setBots(prev => [...prev, newBot]);
    setSelectedBotId(newBotId);
    localStorage.setItem('aria_last_active_bot', newBotId);
    setConversations(prev => new Map(prev).set(newBotId, []));
    
    saveBotToFirestore(userData.uid, newBot).catch(err => console.error("Save failed:", err));
    
    // ✅ ENABLE AUTONOMOUS GREETING ON CREATION
    await handleNewConversation(newBotId, true, autonomyEnabled);
    setActiveView('chat');
  };

  const handleNewConversation = async (botId: string, skipInitialMessage = false, generateGreeting = false) => {
    if (!userData?.uid) return;
    const bot = bots.find(b => b.id === botId);
    const newConvId = generateUniqueId('conv');
    
    const messages: Message[] = skipInitialMessage ? [] : [{ 
      id: generateUniqueId('msg'), role: 'model', 
      text: `Link established. I am ${bot?.name || 'Aria'}. Ready for input.`, timestamp: Date.now() 
    }];
    
    const newConversation: Conversation = { 
        id: newConvId, 
        title: `Session ${new Date().toLocaleDateString()}`, 
        messages, 
        timestamp: Date.now() 
    };
    
    setConversations(prev => {
        const next = new Map(prev);
        const list = next.get(botId) || [];
        return next.set(botId, [newConversation, ...list]);
    });
    
    await saveConversationToFirestore(userData.uid, botId, newConversation);
    setCurrentConversationId(newConvId);
    
    // ✅ TRIGGER AUTONOMOUS GREETING IF ENABLED
    if (generateGreeting && bot) {
      console.log("🤖 Triggering autonomous greeting for:", bot.name);
      triggerAutonomousGreeting(botId, newConvId, bot);
    }
  };

  // ✅ NEW: Autonomous greeting function
  const triggerAutonomousGreeting = async (botId: string, conversationId: string, bot: Bot) => {
    try {
      setIsLoadingResponse(true);
      
      // Generate a proactive opening line based on bot personality
      const greetingPrompt = `You are ${bot.name}. Your personality: ${bot.characterProfile.vibe}. Generate a brief, warm, and engaging opening line to start the conversation. Be authentic and inviting. Keep it under 80 characters.`;
      
      // Call your AI service with the greeting prompt
      const greeting = await generateAriaResponse(greetingPrompt, [], bot.characterProfile, userData?.uid, botId);
      
      const { cleanText } = extractContextPrompt(greeting);
      
      console.log("✅ Autonomous greeting generated:", cleanText);
      
      // Add the autonomous message to the conversation
      const autonomousMessage: Message = {
        id: generateUniqueId('msg'),
        role: 'model',
        text: cleanText || `Hey, I'm ${bot.name}! What would you like to talk about?`,
        timestamp: Date.now()
      };
      
      // Update conversation with autonomous greeting
      setConversations(prev => {
        const next = new Map(prev);
        const botConvs = [...(next.get(botId) || [])];
        
        const updatedConvs = botConvs.map(conv => {
          if (conv.id === conversationId) {
            const updatedConv = {
              ...conv,
              messages: [...conv.messages, autonomousMessage],
              timestamp: Date.now()
            };
            
            // Persist to Firebase
            saveConversationToFirestore(userData.uid!, botId, updatedConv);
            return updatedConv;
          }
          return conv;
        });
        
        return next.set(botId, updatedConvs);
      });
      
    } catch (err) {
      console.error("❌ Autonomous Greeting Failed:", err);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!userData?.uid) return;
    try {
      await deleteBotFromFirestore(userData.uid, botId);
      
      const remainingBots = bots.filter(b => b.id !== botId);
      setBots(remainingBots);
      
      setConversations(prev => {
        const next = new Map(prev);
        next.delete(botId);
        return next;
      });

      // Handle the case where the currently active bot is the one being deleted
      if (selectedBotId === botId) {
        if (remainingBots.length > 0) {
          const nextBot = remainingBots[0];
          setSelectedBotId(nextBot.id);
          localStorage.setItem('aria_last_active_bot', nextBot.id);
          
          const botConvs = conversations.get(nextBot.id) || [];
          if (botConvs.length > 0) {
            setCurrentConversationId(botConvs[0].id);
          } else {
            // Initiate a blank conversation instance for the newly selected bot
            const newConvId = generateUniqueId('conv');
            const newConversation: Conversation = { 
                id: newConvId, 
                title: `Session ${new Date().toLocaleDateString()}`, 
                messages: [], 
                timestamp: Date.now() 
            };
            setConversations(prev => {
                const next = new Map(prev);
                next.set(nextBot.id, [newConversation]);
                return next;
            });
            saveConversationToFirestore(userData.uid, nextBot.id, newConversation);
            setCurrentConversationId(newConvId);
          }
          setActiveView('chat');
        } else {
          // No bots left, return to discover state
          setSelectedBotId('');
          setCurrentConversationId(null);
          localStorage.removeItem('aria_last_active_bot');
          setActiveView('discover');
        }
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSaveBotCustomization = async (botId: string, updated: CharacterProfile) => {
    if (!userData?.uid) return;
    const selected = bots.find(b => b.id === botId);
    if (!selected) return;
    
    // Explicitly merge updated traits to ensure nested arrays and LoRAs are saved correctly
    const updatedBot = { 
      ...selected, 
      name: updated.name, 
      personality: updated.vibe, 
      characterProfile: {
        ...updated,
        hair: updated.hair || [],
        face: updated.face || [],
        body: updated.body || [],
        activeRunpodLoras: updated.activeRunpodLoras || [],
        favoriteLoras: updated.favoriteLoras || [],
        runpodModel: updated.runpodModel || 'Qwen-Rapid-AIO-NSFW-v23.safetensors'
      } 
    };

    await saveBotToFirestore(userData.uid, updatedBot);
    setBots(prev => prev.map(b => b.id === botId ? updatedBot : b));
    setShowCustomizationModalForBotId(null);
  };

  const selectedBot = bots.find(bot => bot.id === selectedBotId);
  const currentBotConversations = conversations.get(selectedBotId) || [];
  const currentMessages = currentBotConversations.find(c => c.id === currentConversationId)?.messages || [];

  if (!isInitialLoadComplete) {
    return <LoadingScreen />;
  }

  return (
    <div className={`flex h-[100dvh] w-full ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} text-zinc-100 overflow-hidden`}>
      {/* Sidebar now manages the top-level navigation */}
      <Sidebar
        bots={bots}
        selectedBotId={selectedBotId}
        onSelectBot={handleSelectBot}
        onNewBot={() => setActiveView('discover')} 
        conversations={currentBotConversations}
        onSelectConversation={setCurrentConversationId}
        onDeleteConversation={() => {}} 
        onDeleteBot={handleDeleteBot}
        onSignOut={onSignOut}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
        onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(prev => !prev)}
        activeView={activeView as any}
        setActiveView={setActiveView as any} 
      />
      
      {/* Main View Area Router */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* 1. DISCOVER VIEW */}
        {activeView === 'discover' && (
          <div className="absolute inset-0 z-10 bg-zinc-950">
            <DefaultCompanionsModal
              isMandatory={bots.length === 0}
              onSelectPreset={(preset) => handleCreateNewCompanion(preset)}
              onSelectCustom={() => setActiveView('create')}
              onClose={() => setActiveView('chat')}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(prev => !prev)}
              isDesktopSidebarOpen={isDesktopSidebarOpen}
            />
          </div>
        )}

        {/* 2. CREATE COMPANION VIEW */}
        {activeView === 'create' && (
          <div className="absolute inset-0 z-10 bg-zinc-950">
            <CompanionCreationModal
              isMandatory={bots.length === 0}
              onSave={handleCreateNewCompanion}
              onClose={() => setActiveView(bots.length > 0 ? 'chat' : 'discover')}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(prev => !prev)}
              isDesktopSidebarOpen={isDesktopSidebarOpen}
            />
          </div>
        )}

        {/* 3. CHAT VIEW */}
        {activeView === 'chat' && selectedBot && (
          <MainChatArea
            character={selectedBot.characterProfile}
            botId={selectedBot.id}
            messages={currentMessages}
            userData={userData}
            onImageGenerated={onImageGenerated}
            onSendMessage={handleSendMessage}
            onUpdateMessage={handleUpdateMessage}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
            isDesktopSidebarOpen={isDesktopSidebarOpen}
            isLoadingResponse={isLoadingResponse}
            onOpenBotCustomization={setShowCustomizationModalForBotId}
            setIsLoading={setIsLoadingResponse}
          />
        )}
        
        {/* DEBUG: Autonomy Status Indicator */}
        <div className="absolute bottom-2 right-2 text-xs text-purple-400 font-mono z-20 bg-black/50 px-2 py-1 rounded">
          {isLoadingResponse && '🔄 Bot generating...'}
          {!isLoadingResponse && autonomyEnabled && currentMessages.length > 0 && '✅ Autonomy: ON'}
          {!autonomyEnabled && '⏸️ Autonomy: OFF'}
        </div>
      </main>

      {/* Settings Modal stays as an overlay */}
      {showCustomizationModalForBotId && (
        <BotCustomizationModal
          character={bots.find(b => b.id === showCustomizationModalForBotId)?.characterProfile || defaultNewBotCharacter}
          onSave={(u) => handleSaveBotCustomization(showCustomizationModalForBotId, u as CharacterProfile)}
          onClose={() => setShowCustomizationModalForBotId(null)}
        />
      )}
    </div>
  );
};

export default ChatDashboard;
