import React, { useState, useEffect, useCallback } from 'react';
import { Bot, CharacterProfile, Conversation, Message, UserData } from '../types';
import Sidebar from './Sidebar';
import MainChatArea from './MainChatArea';
import BotCustomizationModal from './BotCustomizationModal';
import CompanionCreationModal from './CompanionCreationModal';
import LoadingScreen from './LoadingScreen';
import { 
  saveBotToFirestore, 
  loadBotsFromFirestore, 
  saveConversationToFirestore,  
  loadConversationsFromFirestore,
  deleteBotFromFirestore,
  uploadImageToStorage 
} from '../services/firebaseService';

interface ChatDashboardProps {
  userData: UserData;
  onSignOut: () => void;
  onImageGenerated: () => void;
  onVideoSynthesized: (botId: string, base64: string) => Promise<string>;
}

/**
 * DEFAULT NEW BOT TEMPLATE
 * Fallback used for edge cases.
 */
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
  
  // Modal States
  const [showCustomizationModalForBotId, setShowCustomizationModalForBotId] = useState<string | null>(null);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // --- HYDRATE HISTORY & RESTORE LAST ACTIVE BOT ---
  useEffect(() => {
    const hydrateHistory = async () => {
      if (!userData?.uid) return;
      try {
        const loadedBots = await loadBotsFromFirestore(userData.uid);
        const loadedConvsMap = new Map<string, Conversation[]>();
        
        // Ensure legacy bots with string specs are normalized to arrays to prevent crashes
        const normalizedBots = loadedBots.map(bot => ({
          ...bot,
          characterProfile: {
            ...bot.characterProfile,
            hair: Array.isArray(bot.characterProfile.hair) ? bot.characterProfile.hair : [],
            face: Array.isArray(bot.characterProfile.face) ? bot.characterProfile.face : [],
            body: Array.isArray(bot.characterProfile.body) ? bot.characterProfile.body : [],
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
        }
      } catch (err) {
        console.error("Dashboard: History load error:", err);
      } finally {
        setIsInitialLoadComplete(true);
      }
    };
    hydrateHistory();
  }, [userData?.uid]);

  // AUTO-CREATE INITIAL BOT IF NONE EXIST
  useEffect(() => {
    if (isInitialLoadComplete && bots.length === 0 && !showCustomizationModalForBotId && !isCreationModalOpen) {
      setIsCreationModalOpen(true);
    }
  }, [isInitialLoadComplete, bots.length, showCustomizationModalForBotId, isCreationModalOpen]);

  /**
   * HANDLE SEND MESSAGE
   */
  const handleSendMessage = useCallback(async (newMessage: Message) => {
    if (!selectedBotId || !currentConversationId || !userData?.uid) return;

    if (newMessage.role === 'user') {
        setIsLoadingResponse(true);
    } else {
        setIsLoadingResponse(false);
    }

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

  /**
   * HANDLE UPDATE MESSAGE
   */
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
      handleNewConversation(botId, true);
    }
    setIsMobileSidebarOpen(false);
  };

  const handleNewBot = () => {
    setIsCreationModalOpen(true);
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

    await saveBotToFirestore(userData.uid, newBot);
    setBots(prev => [...prev, newBot]);
    setSelectedBotId(newBotId);
    localStorage.setItem('aria_last_active_bot', newBotId);
    setConversations(prev => new Map(prev).set(newBotId, []));
    
    setIsCreationModalOpen(false);
    handleNewConversation(newBotId, true);
  };

  const handleNewConversation = async (botId: string, skipInitialMessage = false) => {
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
  };

  const handleDeleteBot = async (botId: string) => {
    if (!userData?.uid) return;
    try {
      await deleteBotFromFirestore(userData.uid, botId);
      setBots(prev => prev.filter(b => b.id !== botId));
      setConversations(prev => {
        const next = new Map(prev);
        next.delete(botId);
        return next;
      });
      if (selectedBotId === botId) {
        setSelectedBotId('');
        setCurrentConversationId(null);
        localStorage.removeItem('aria_last_active_bot');
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSaveBotCustomization = async (botId: string, updated: CharacterProfile) => {
    if (!userData?.uid) return;
    const selected = bots.find(b => b.id === botId);
    if (!selected) return;
    
    const updatedBot = { ...selected, name: updated.name, personality: updated.vibe, characterProfile: updated };
    await saveBotToFirestore(userData.uid, updatedBot);
    setBots(prev => prev.map(b => b.id === botId ? updatedBot : b));
    setShowCustomizationModalForBotId(null);
  };

  const selectedBot = bots.find(bot => bot.id === selectedBotId);
  const currentBotConversations = conversations.get(selectedBotId) || [];
  const currentMessages = currentBotConversations.find(c => c.id === currentConversationId)?.messages || [];

  return (
    <div className={`flex h-[100dvh] ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} text-zinc-100 overflow-hidden`}>
      <Sidebar
        bots={bots}
        selectedBotId={selectedBotId}
        onSelectBot={handleSelectBot}
        onNewBot={handleNewBot}
        conversations={currentBotConversations}
        onSelectConversation={setCurrentConversationId}
        onDeleteConversation={() => {}} // Implementation for conv delete can be added
        onDeleteBot={handleDeleteBot}
        onSignOut={onSignOut}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
        onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(prev => !prev)}
      />
      
      {selectedBot && (
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

      {/* NEW COMPANION MODAL */}
      {isCreationModalOpen && (
        <CompanionCreationModal
          isMandatory={bots.length === 0}
          onSave={handleCreateNewCompanion}
          onClose={() => setIsCreationModalOpen(false)}
        />
      )}

      {/* EXISTING BOT SETTINGS MODAL */}
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
