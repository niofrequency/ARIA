import React from 'react';
import { Bot, Conversation } from '../types';
import { Plus, LogOut, X, Trash, Cpu, ShieldCheck, PanelLeftClose } from 'lucide-react';

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
  isDesktopSidebarOpen: boolean;
  onToggleDesktopSidebar: () => void; // New prop required
}

const Sidebar: React.FC<SidebarProps> = ({
  bots,
  selectedBotId,
  onSelectBot,
  onNewBot,
  onDeleteBot,
  onSignOut,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
  isDesktopSidebarOpen,
  onToggleDesktopSidebar,
}) => {
  return (
    <>
      {/* Overlay for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobileSidebar}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-[280px] bg-zinc-950 border-r border-white/5 flex flex-col z-50 overflow-hidden
          transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDesktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
        `}
      >
        {/* Tech Background for Sidebar */}
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
            {/* Desktop Fold Button */}
            <button 
              onClick={onToggleDesktopSidebar} 
              className="hidden lg:flex p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Fold Sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>

            {/* Mobile Close Button */}
            <button onClick={onCloseMobileSidebar} className="lg:hidden p-2 text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New Interface Button */}
        <div className="relative z-10 p-4">
          <button
            onClick={onNewBot}
            className="group w-full flex items-center justify-center gap-2 bg-white/[0.03] border border-white/10 text-white font-bold py-3.5 px-5 rounded-2xl
              hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 active:scale-95 shadow-xl"
          >
            <Plus className="w-4 h-4 text-purple-500" />
            <span className="uppercase tracking-[0.2em] text-[10px]">New Interface</span>
          </button>
        </div>

        {/* My Companions Section */}
        <section className="relative z-10 flex-1 px-4 overflow-hidden flex flex-col mt-2">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold flex items-center gap-2">
               <Cpu className="w-3 h-3" /> Neural Profiles
            </h3>
          </div>

          <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {bots.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-white/5 rounded-2xl">
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-medium">No links established</p>
              </div>
            ) : (
              bots.map((bot, index) => (
                <div key={`${bot.id}-${index}`} className="group relative">
                  <button
                    onClick={() => { onSelectBot(bot.id); onCloseMobileSidebar(); }}
                    className={`flex items-center w-full gap-3 p-3 rounded-2xl text-left transition-all duration-300
                      ${selectedBotId === bot.id 
                        ? 'bg-purple-600/10 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]' 
                        : 'bg-white/[0.02] border border-transparent hover:border-white/10 hover:bg-white/5'
                      }
                    `}
                  >
                    <div className={`w-10 h-10 rounded-xl ${bot.avatarColor || 'bg-zinc-800'} flex items-center justify-center text-sm font-bold text-white shadow-inner flex-shrink-0 border border-white/5`}>
                      {bot.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className={`text-sm tracking-wide transition-colors ${selectedBotId === bot.id ? 'text-white font-bold' : 'text-zinc-300'}`}>
                        {bot.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1 h-1 rounded-full ${selectedBotId === bot.id ? 'bg-purple-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium truncate">{bot.personality}</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Terminate connection with ${bot.name}?`)) {
                            onDeleteBot(bot.id);
                          }
                      }}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                      <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Bottom Actions Area */}
        <div className="relative z-10 p-4 mt-auto space-y-2 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl">
          {/* Logout Button */}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/5 text-zinc-500 hover:text-red-400 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent group-hover:bg-red-500/10 transition-all">
               <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Terminate Session</span>
          </button>

          {/* Secure Branding */}
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
