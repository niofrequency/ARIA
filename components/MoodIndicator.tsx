import React from 'react';
import { BotMood, EmotionalState } from '../types';
import { Heart, Zap, Brain, Flame, AlertCircle } from 'lucide-react';

interface MoodIndicatorProps {
  botMood?: BotMood;
  emotionalState?: EmotionalState;
  emotionalIntensity?: number; // 0-10
  compact?: boolean; // For header display
}

const MoodIndicator: React.FC<MoodIndicatorProps> = ({ 
  botMood, 
  emotionalState, 
  emotionalIntensity = 5,
  compact = false 
}) => {
  if (!botMood && !emotionalState) return null;

  // --- EMOTIONAL STATE STYLING ---
  const emotionalStateConfig: Record<EmotionalState, { color: string; emoji: string; label: string }> = {
    curious: { color: 'from-blue-500 to-cyan-400', emoji: '🤔', label: 'Curious' },
    playful: { color: 'from-pink-500 to-purple-400', emoji: '😊', label: 'Playful' },
    seductive: { color: 'from-red-500 to-pink-400', emoji: '😏', label: 'Seductive' },
    desperate: { color: 'from-orange-500 to-red-400', emoji: '😰', label: 'Desperate' },
    satisfied: { color: 'from-green-500 to-emerald-400', emoji: '😌', label: 'Satisfied' },
    vulnerable: { color: 'from-purple-500 to-pink-400', emoji: '🥺', label: 'Vulnerable' },
    conflicted: { color: 'from-yellow-500 to-orange-400', emoji: '😕', label: 'Conflicted' },
  };

  const emotionalConfig = emotionalState ? emotionalStateConfig[emotionalState] : null;

  // --- MOOD METRICS ---
  const getMoodColor = (value: number) => {
    if (value < 25) return 'text-blue-400';
    if (value < 50) return 'text-cyan-400';
    if (value < 75) return 'text-purple-400';
    return 'text-red-400';
  };

  const getMoodIntensityBar = (value: number) => {
    return `${(value / 100) * 100}%`;
  };

  // Compact mode - for header
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {emotionalConfig && (
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r text-white text-[10px] font-bold"
            style={{
              backgroundImage: `linear-gradient(to right, rgb(${emotionalConfig.color.split(' ')[0]}), rgb(${emotionalConfig.color.split(' ')[1]}))`
            }}
          >
            <span>{emotionalConfig.emoji}</span>
            <span>{emotionalConfig.label}</span>
            {emotionalIntensity && <span className="ml-1 opacity-70">({emotionalIntensity}/10)</span>}
          </div>
        )}
      </div>
    );
  }

  // Full mode - detailed mood panel
  return (
    <div className="mt-3 px-1 w-full max-w-[280px] md:max-w-[360px]">
      <div className="bg-zinc-900/60 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-md">
        
        {/* Header with Emotional State */}
        {emotionalConfig && (
          <div className="mb-4 pb-3 border-b border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{emotionalConfig.emoji}</span>
              <span className="text-sm font-bold text-white">{emotionalConfig.label}</span>
              {emotionalIntensity && (
                <span className={`text-xs font-bold ml-auto ${emotionalIntensity > 7 ? 'text-red-400' : emotionalIntensity > 4 ? 'text-yellow-400' : 'text-green-400'}`}>
                  Intensity: {emotionalIntensity}/10
                </span>
              )}
            </div>
            {emotionalIntensity && (
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${(emotionalIntensity / 10) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Mood Metrics */}
        {botMood && (
          <div className="space-y-3">
            
            {/* Energy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Energy
                </span>
                <span className={`text-[10px] font-bold ${getMoodColor(botMood.energy)}`}>
                  {botMood.energy}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                  style={{ width: getMoodIntensityBar(botMood.energy) }}
                />
              </div>
            </div>

            {/* Confidence */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Confidence
                </span>
                <span className={`text-[10px] font-bold ${getMoodColor(botMood.confidence)}`}>
                  {botMood.confidence}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: getMoodIntensityBar(botMood.confidence) }}
                />
              </div>
            </div>

            {/* Affection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Affection
                </span>
                <span className={`text-[10px] font-bold ${getMoodColor(botMood.affection)}`}>
                  {botMood.affection}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-red-500 transition-all duration-500"
                  style={{ width: getMoodIntensityBar(botMood.affection) }}
                />
              </div>
            </div>

            {/* Horniness */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Horniness
                </span>
                <span className={`text-[10px] font-bold ${getMoodColor(botMood.horniness)}`}>
                  {botMood.horniness}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                  style={{ width: getMoodIntensityBar(botMood.horniness) }}
                />
              </div>
            </div>

            {/* Stress Level */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Stress
                </span>
                <span className={`text-[10px] font-bold ${getMoodColor(botMood.stressLevel)}`}>
                  {botMood.stressLevel}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500"
                  style={{ width: getMoodIntensityBar(botMood.stressLevel) }}
                />
              </div>
            </div>

            {/* Status Flags */}
            <div className="mt-3 pt-3 border-t border-purple-500/20 flex flex-wrap gap-2">
              {botMood.recentConflict && (
                <div className="text-[9px] px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-bold">
                  ⚠️ Recent Conflict
                </div>
              )}
              <div className="text-[9px] px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold">
                {botMood.timeOfDay.charAt(0).toUpperCase() + botMood.timeOfDay.slice(1)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodIndicator;
