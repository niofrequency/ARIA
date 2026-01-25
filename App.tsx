import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Header } from './components/Header';
import { MessageBubble } from './components/MessageBubble';
import { InputArea } from './components/InputArea';
import { Sidebar } from './components/Sidebar';
import { Message, Attachment, SendingStatus, StoredChat } from './types';
import { sendMessageToGemini, initializeChat } from './services/geminiService';
import { AlertCircle, Wrench, BookOpen, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'reefer_guru_chats_v1';
const THEME_KEY = 'reefer_guru_theme';

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'model',
  text: "Welcome back, Technician. I'm Reefer Guru. \n\nI specialize exclusively in **Carrier Transicold** units (PrimeLINE, EliteLINE, ThinLINE, MicroLink 2i/3/5). \n\nWhat's the trouble today? Give me a Carrier alarm code, or upload a photo of the controller.",
  timestamp: new Date()
};

const App: React.FC = () => {
  // State
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SendingStatus>(SendingStatus.IDLE);
   
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
   
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize sidebar state based on screen width
  useEffect(() => {
    const handleResize = () => {
      // If mobile, default to closed
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
  }, []);

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    
    // Default to light mode if not explicitly set to dark
    if (savedTheme === 'dark') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
        const newMode = !prev;
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem(THEME_KEY, 'light');
        }
        return newMode;
    });
  };

  // Load chats from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StoredChat[] = JSON.parse(saved);
        // Hydrate dates (JSON.parse leaves them as strings)
        const hydrated = parsed.map(chat => ({
          ...chat,
          messages: chat.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        
        // Sort by date desc
        hydrated.sort((a, b) => b.updatedAt - a.updatedAt);
        
        setChats(hydrated);
        
        if (hydrated.length > 0) {
          setActiveChatId(hydrated[0].id);
          setMessages(hydrated[0].messages);
          // Restore context for latest chat
          // We wrap this in a try/catch to prevent app crash if API is down on load
          initializeChat(hydrated[0].messages).catch(console.warn); 
        } else {
          startNewChat();
        }
      } catch (e) {
        console.error("Failed to parse history", e);
        startNewChat();
      }
    } else {
      startNewChat();
    }
  }, []);

  // Save chats whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }
  }, [chats]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  // --- Actions ---

  const startNewChat = async () => {
    const newId = uuidv4();
    const newChat: StoredChat = {
      id: newId,
      title: 'New Session',
      messages: [INITIAL_MESSAGE],
      updatedAt: Date.now()
    };
    
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newId);
    setMessages([INITIAL_MESSAGE]);
    setStatus(SendingStatus.IDLE);
    
    // Reset AI session
    await initializeChat([]);
  };

  const handleSelectChat = async (id: string) => {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;

    setActiveChatId(id);
    setMessages(chat.messages);
    setStatus(SendingStatus.IDLE);
    
    // Restore AI context
    await initializeChat(chat.messages);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newChats = chats.filter(c => c.id !== id);
    setChats(newChats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newChats));

    if (activeChatId === id) {
      if (newChats.length > 0) {
        handleSelectChat(newChats[0].id);
      } else {
        startNewChat();
      }
    }
  };

  const updateActiveChat = (newMessages: Message[], isFirstUserMessage: boolean = false) => {
    if (!activeChatId) return;

    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === activeChatId) {
          let title = chat.title;
          // If it's the first real user message, set the title
          if (isFirstUserMessage) {
            const userText = newMessages.find(m => m.role === 'user')?.text || "Conversation";
            title = userText.length > 25 ? userText.substring(0, 25) + '...' : userText;
          }

          return {
            ...chat,
            messages: newMessages,
            title: title,
            updatedAt: Date.now()
          };
        }
        return chat;
      }).sort((a, b) => b.updatedAt - a.updatedAt); // Keep sorted by recent
    });
  };

  const handleSendMessage = async (text: string, attachment?: Attachment) => {
    // 1. Prepare User Message
    const isFirstUserMessage = messages.length === 1 && messages[0].id === 'init-1';

    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      text: text,
      timestamp: new Date(),
      // Store full data URI to persist image across reloads
      imageUrl: attachment ? `data:${attachment.mimeType};base64,${attachment.base64}` : undefined
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    updateActiveChat(updatedMessages, isFirstUserMessage);
    
    // 2. Set Status
    setStatus(SendingStatus.SENDING);

    try {
      // Simulate brief network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatus(SendingStatus.THINKING);

      // 3. Call Backend Service
      const responseText = await sendMessageToGemini(
        text, 
        attachment?.base64, 
        attachment?.mimeType
      );

      // 4. Handle Success Response
      const botMessage: Message = {
        id: uuidv4(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);
      updateActiveChat(finalMessages);
      setStatus(SendingStatus.IDLE);

    } catch (error) {
      console.error("Error sending message:", error);
      
      // 5. Handle Error Response
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'model',
        text: "I'm having trouble connecting to the server. Please check your internet connection or try again in a moment.",
        timestamp: new Date(),
        isError: true
      };
      
      const errorMessages = [...updatedMessages, errorMessage];
      setMessages(errorMessages);
      updateActiveChat(errorMessages);
      setStatus(SendingStatus.ERROR);
    }
  };

  return (
    // FIX 1: Use h-[100dvh] for dynamic viewport height (crucial for iOS)
    <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300">
      
      {/* Sidebar - Persistent on desktop, drawer on mobile */}
      <Sidebar 
        chats={chats}
        currentChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={startNewChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          status={status} 
        />
        
        {/* Chat Area */}
        {/* FIX 2: Added 'pb-36' or 'pb-40'. This ensures the text scrolls BEHIND the input area */}
        <main className="flex-1 overflow-y-auto px-2 md:px-4 pt-4 pb-36 scroll-smooth">
          <div className="max-w-4xl mx-auto flex flex-col min-h-full">
            
            {/* Empty State / Suggestions */}
            {messages.length <= 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-4 px-2">
                <button 
                  onClick={() => handleSendMessage("What does Carrier Alarm 18 mean?")}
                  className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-reefer-blue dark:hover:border-reefer-blue transition-all text-left flex flex-col items-start group"
                >
                  <div className="bg-blue-50 dark:bg-blue-900/30 text-reefer-blue p-2 rounded-lg mb-2 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
                    <AlertCircle size={20} />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Check Alarm Code</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">e.g., "AL18 Low Voltage"</span>
                </button>

                <button 
                  onClick={() => handleSendMessage("How do I initiate a manual defrost on a MicroLink 3?")}
                  className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-reefer-green dark:hover:border-reefer-green transition-all text-left flex flex-col items-start group"
                >
                  <div className="bg-green-50 dark:bg-green-900/30 text-reefer-green p-2 rounded-lg mb-2 group-hover:bg-green-100 dark:group-hover:bg-green-900/50">
                    <Wrench size={20} />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Run Manual Defrost</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keypad procedure</span>
                </button>

                <button 
                  onClick={() => handleSendMessage("What is the torque for the 06DR compressor bolts?")}
                  className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-amber-500 dark:hover:border-amber-500 transition-all text-left flex flex-col items-start group"
                >
                  <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-500 p-2 rounded-lg mb-2 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50">
                    <BookOpen size={20} />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Torque Values</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">T-363 / T-318 Specs</span>
                </button>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator */}
            {(status === SendingStatus.THINKING || status === SendingStatus.SENDING) && (
               <div className="flex justify-start mb-6 animate-in fade-in duration-300">
                   <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-reefer-blue/10 dark:bg-reefer-blue/20 rounded-full flex items-center justify-center">
                            <Loader2 size={16} className="text-reefer-blue animate-spin" />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Analyzing...</span>
                   </div>
               </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* FIX 3: Input Area is now ABSOLUTE POSITIONED (Overlay) */}
        {/* This removes the "border/seam" because it floats on top of the content */}
        <div className="absolute bottom-0 left-0 w-full z-20">
            <InputArea onSendMessage={handleSendMessage} status={status} />
        </div>
      </div>
    </div>
  );
};

export default App;
