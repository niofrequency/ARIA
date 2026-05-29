import React, { useState, useCallback, useMemo } from 'react';
import { Bot, Conversation } from '../types';
import { LogOut, X, Trash, Cpu, ShieldCheck, PanelLeftClose, Search, Compass, MessageSquare, Sparkles } from 'lucide-react';

export type ViewState = 'discover' | 'create' | 'chat';

// ==========================================
// PERFORMANCE UPGRADE: Memoized Bot Item
// ==========================================
interface BotItemProps {
  bot: Bot;
  isSelected: boolean;
  onSelect: (botId: string) => void;
  onDelete: (botId: string, botName: string) => void;
}

const MemoizedBotItem = React.memo(({ bot, isSelected, onSelect, onDelete }: BotItemProps) => {
  return (
    <div className="group relative">
      <button
        onClick={() => onSelect(bot.id)}
        className={`flex items-center w-full gap-3 p-3 rounded-2xl text-left transition-all duration-300
          ${isSelected 
            ? 'bg-purple-600/10 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]' 
            : 'bg-white/[0.02] border border-transparent hover:border-white/10 hover:bg-white/5'
          }
        `}
      >
        <div className={`w-10 h-10 rounded-xl ${bot.avatarColor || 'bg-zinc-800'} flex items-center justify-center text-sm font-bold text-white shadow-inner flex-shrink-0 border border-white/5`}>
          {bot.name.charAt(0).toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <h4 className={`text-sm tracking-wide transition-colors ${isSelected ? 'text-white font-bold' : 'text-zinc-300'}`}>
            {bot.name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-purple-500 animate-pulse' : 'bg-zinc-700'}`}></div>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium truncate">{bot.personality}</p>
          </div>
        </div>
      </button>
      
      <button
          onClick={(e) => {
              e.stopPropagation();
              onDelete(bot.id, bot.name);
          }}
          className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
      >
          <Trash className="w-4 h-4" />
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected && prevProps.bot === nextProps.bot;
});


interface SidebarProps {
  bots: Bot[];
  selectedBotId: string | null;
  onSelectBot: (botId: string) => void;
  onNewBot: () => void;
  conversations: Conversation[]; 
  onSelectConversation: (conversationId: string) => void; 
  onDeleteConversation: (botId: string, conversationId: string) => void;
  onDeleteBot: (botId: string) => void; 
  onSignOut: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isMobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
  onToggleMobileSidebar?: () => void; // Kept in interface to prevent ChatDashboard type errors
  isDesktopSidebarOpen: boolean;
  onToggleDesktopSidebar: () => void;
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  bots,
  selectedBotId,
  onSelectBot,
  onDeleteBot,
  onSignOut,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
  isDesktopSidebarOpen,
  onToggleDesktopSidebar,
  activeView,
  setActiveView
}) => {
  
  const [searchQuery, setSearchQuery] = useState('');

  const handleMobileAction = useCallback((action: () => void) => {
    action();
    if (window.innerWidth < 1024) {
      onCloseMobileSidebar();
    }
  }, [onCloseMobileSidebar]);

  const handleSelectInteraction = useCallback((botId: string) => {
    handleMobileAction(() => {
      onSelectBot(botId);
      setActiveView('chat');
    });
  }, [handleMobileAction, onSelectBot, setActiveView]);

  const handleDeleteInteraction = useCallback((botId: string, botName: string) => {
    if (window.confirm(`Terminate connection with ${botName}?`)) {
      if (window.innerWidth < 1024) onCloseMobileSidebar();
      onDeleteBot(botId);
    }
  }, [onCloseMobileSidebar, onDeleteBot]);

  const filteredBots = useMemo(() => {
    if (!searchQuery.trim()) return bots;
    return bots.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [bots, searchQuery]);

return (
    <>
      {/* Desktop Layout Spacer (Pushes main content naturally) */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'w-[280px]' : 'w-0'}`} />

      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] lg:hidden transition-opacity duration-300 ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobileSidebar}
        aria-hidden="true"
      />

      {/* Actual Sidebar Content */}
      <aside
        className={`fixed inset-y-0 left-0 w-[280px] bg-zinc-950 border-r border-white/5 flex flex-col z-[100] overflow-hidden  
          transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDesktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
        `}
      >
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>

        {/* Brand Header */}
        <div className="relative z-10 p-6 flex items-center justify-between border-b border-white/5 bg-zinc-900/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-purple-600/30 rounded-full blur-sm animate-pulse"></div>
              <img src="/img/ARIA-LOGO.PNG" alt="Logo" className="relative w-10 h-10 object-contain" />
            </div>
            <div>
              <span className="text-xl font-light text-white tracking-widest uppercase">Aria <span className="text-purple-500 font-bold">AI</span></span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleDesktopSidebar(); }} 
              className="hidden lg:flex p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <PanelLeftClose className={`w-5 h-5 transition-transform duration-300 ${!isDesktopSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* MAIN NAVIGATION */}
        <nav className="relative z-10 flex flex-col gap-1.5 p-4 border-b border-white/5">
          <button 
            onClick={() => handleMobileAction(() => setActiveView('discover'))}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeView === 'discover' ? 'bg-white/10 text-white font-bold shadow-inner' : 'text-zinc-400 hover:bg-white/5 hover:text-white font-medium'}`}
          >
            <Compass className={`w-5 h-5 ${activeView === 'discover' ? 'text-purple-400' : ''}`} />
            <span className="text-sm tracking-wide">Discover</span>
          </button>

          <button 
            onClick={() => handleMobileAction(() => setActiveView('chat'))}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${activeView === 'chat' ? 'bg-white/10 text-white font-bold shadow-inner' : 'text-zinc-400 hover:bg-white/5 hover:text-white font-medium'}`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className={`w-5 h-5 ${activeView === 'chat' ? 'text-purple-400' : ''}`} />
              <span className="text-sm tracking-wide">Chat</span>
            </div>
          </button>

          <button 
            onClick={() => handleMobileAction(() => setActiveView('create'))}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeView === 'create' ? 'bg-white/10 text-white font-bold shadow-inner' : 'text-zinc-400 hover:bg-white/5 hover:text-white font-medium'}`}
          >
            <Sparkles className={`w-5 h-5 ${activeView === 'create' ? 'text-purple-400' : ''}`} />
            <span className="text-sm tracking-wide">Create Character</span>
          </button>
        </nav>

        {/* NEURAL PROFILES (Only visible when actively chatting) */}
        {activeView === 'chat' ? (
          <section className="relative z-10 flex-1 px-4 overflow-hidden flex flex-col mt-4">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold flex items-center gap-2">
                 <Cpu className="w-3 h-3" /> My AI
              </h3>
            </div>

            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-4">
              {filteredBots.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-medium">No Links Established</p>
                </div>
              ) : (
                filteredBots.map((bot) => (
                  <MemoizedBotItem 
                    key={bot.id} 
                    bot={bot} 
                    isSelected={activeView === 'chat' && selectedBotId === bot.id}
                    onSelect={handleSelectInteraction}
                    onDelete={handleDeleteInteraction}
                  />
                ))
              )}
            </div>
          </section>
        ) : (
          <div className="flex-1" /> // Maintains spacing when history is hidden
        )}

        {/* Bottom Actions Area */}
        <div className="relative z-10 p-4 mt-auto border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl">
          <button
            onClick={() => handleMobileAction(onSignOut)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/5 text-zinc-500 hover:text-red-400 transition-all group"
          >
            <LogOut className="w-4 h-4 ml-2" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Terminate Session</span>
          </button>

          <div className="pt-2 flex items-center justify-center gap-2 opacity-30">
             <ShieldCheck className="w-3 h-3 text-purple-500" />
             <span className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">Secure Protocol v2.5</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
