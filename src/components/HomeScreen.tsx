import React, { useState } from 'react';
import {
  Crown,
  Bot,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Flame,
  ChevronLeft,
  Zap,
  Sun,
  Compass,
} from 'lucide-react';
import { Difficulty, GameMode } from '../game/types';
import { sound } from '../game/audio';

interface HomeScreenProps {
  onStartGame: (mode: GameMode, difficulty: Difficulty) => void;
  onOpenOnlineLobby: (initialMode?: 'menu' | 'random') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onOpenOnlineLobby,
}) => {
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');

  const handleSelectMode = (mode: GameMode | 'random_online') => {
    sound.playClick();
    if (mode === 'ai') {
      setShowAiModal(true);
    } else if (mode === 'local') {
      onStartGame('local', 'normal');
    } else if (mode === 'random_online') {
      onOpenOnlineLobby('random');
    } else if (mode === 'online') {
      onOpenOnlineLobby('menu');
    }
  };

  const handleConfirmAiStart = () => {
    sound.playClick();
    onStartGame('ai', selectedDifficulty);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-6 sm:py-8 overflow-hidden">
      {/* Royal Palace Diya Embers & Ambient Atmosphere */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-amber-400/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className="relative z-10 text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        {/* Floating Imperial Maharaja Mukut Emblem */}
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-rose-500/30 rounded-full blur-xl animate-pulse-glow" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#121929] via-[#090e18] to-[#1a120b] border-2 border-amber-400/60 p-4 shadow-2xl shadow-amber-500/30 flex items-center justify-center animate-float">
            <Crown className="w-14 h-14 text-amber-300 filter drop-shadow-[0_4px_16px_rgba(251,191,36,0.7)]" />
            <Sparkles className="w-4 h-4 text-amber-200 absolute -top-1 -right-1 animate-ping" />
          </div>
        </div>

        {/* Title & Tagline in Royal Indian Tone */}
        <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3 shadow-sm">
          Darbar-e-Khaas · Imperial Edition
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-widest uppercase mb-2 font-royal">
          <span className="shimmer-text">ROYAL GAMBIT</span>
        </h1>
        <p className="text-base sm:text-xl font-medium text-amber-300/90 tracking-widest uppercase mb-2 font-royal">
          "Outwit your rival. Claim the Swarna Singhasan."
        </p>
        <p className="text-xs sm:text-sm text-amber-100/70 max-w-xl mx-auto font-normal leading-relaxed">
          Race across the sacred 9×9 palace Chaupar. Erect fortified Shahi Kot barriers to outsmart your rival commander.
        </p>
      </div>

      {/* Game Mode Cards */}
      {!showAiModal ? (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl mx-auto">
          {/* Card 1: Ran-Dangal (Play with Random Player) */}
          <div
            onClick={() => handleSelectMode('random_online')}
            className="group relative cursor-pointer rounded-2xl p-5 sm:p-6 border-2 border-amber-500/50 hover:border-amber-400 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/25 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-amber-500/15 via-[#0e1628]/80 to-[#070b14]"
            role="button"
            tabIndex={0}
            aria-label="Ran-Dangal: Play with Random Player online"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSelectMode('random_online');
            }}
          >
            <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-bl-lg shadow-sm flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 fill-slate-950" />
              <span>Quick Match</span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/30 to-rose-500/20 border border-amber-400/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-amber-300 shadow-md">
                <Zap className="w-6 h-6" />
              </div>

              <div className="text-[10px] uppercase font-bold text-amber-400/90 tracking-widest mb-1">
                Ran-Dangal · Arena
              </div>
              <h2 className="text-xl font-bold text-white mb-2 font-royal group-hover:text-amber-300 transition-colors">
                Play Random Player
              </h2>
              <p className="text-xs text-amber-100/70 leading-relaxed">
                Instant matchmaking with another commander waiting across the realm.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-400/25 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:text-amber-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Find Match Now
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Ran-Neeti (Play vs Computer) */}
          <div
            onClick={() => handleSelectMode('ai')}
            className="group relative cursor-pointer rounded-2xl glass-panel p-5 sm:p-6 border-amber-500/30 hover:border-amber-400/70 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/20 flex flex-col justify-between overflow-hidden"
            role="button"
            tabIndex={0}
            data-start="true"
            aria-label="Ran-Neeti: Challenge the Royal Strategist"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSelectMode('ai');
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-emerald-300">
                <Bot className="w-6 h-6" />
              </div>

              <div className="text-[10px] uppercase font-bold text-emerald-400/90 tracking-widest mb-1">
                Ran-Neeti · Singleplayer
              </div>
              <h2 className="text-xl font-bold text-white mb-2 font-royal group-hover:text-amber-300 transition-colors">
                Play vs Computer
              </h2>
              <p className="text-xs text-amber-100/70 leading-relaxed">
                Duel the Imperial Court Wazir with Nav-Sikhia, Wazir, or Chanakya tactics.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
              <span>Select Tactics</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Shahi Chaupar (Local 2-Player) */}
          <div
            onClick={() => handleSelectMode('local')}
            className="group relative cursor-pointer rounded-2xl glass-panel p-5 sm:p-6 border-amber-500/30 hover:border-sky-400/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-sky-500/20 flex flex-col justify-between overflow-hidden"
            role="button"
            tabIndex={0}
            aria-label="Shahi Chaupar: Local 2-Player Duel"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSelectMode('local');
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-400/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-sky-400">
                <Users className="w-6 h-6" />
              </div>

              <div className="text-[10px] uppercase font-bold text-sky-400/90 tracking-widest mb-1">
                Shahi Chaupar · Same Court
              </div>
              <h2 className="text-xl font-bold text-white mb-2 font-royal group-hover:text-sky-300 transition-colors">
                Local Multiplayer
              </h2>
              <p className="text-xs text-amber-100/70 leading-relaxed">
                Face your rival commander face-to-face. Pass & play Mayura vs Suryavanshi.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:text-sky-300">
              <span>Start Court Duel</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Niji Mahal (Private Chamber) */}
          <div
            onClick={() => handleSelectMode('online')}
            className="group relative cursor-pointer rounded-2xl glass-panel p-5 sm:p-6 border-amber-500/30 hover:border-purple-400/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-purple-500/20 flex flex-col justify-between overflow-hidden"
            role="button"
            tabIndex={0}
            aria-label="Niji Mahal: Private Chamber with Friend"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSelectMode('online');
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-purple-400/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-purple-300">
                <Globe className="w-6 h-6" />
              </div>

              <div className="text-[10px] uppercase font-bold text-purple-400/90 tracking-widest mb-1">
                Niji Mahal · Custom Room
              </div>
              <h2 className="text-xl font-bold text-white mb-2 font-royal group-hover:text-purple-300 transition-colors">
                Private Chamber
              </h2>
              <p className="text-xs text-amber-100/70 leading-relaxed">
                Host a private court or enter with a 6-character Shahi Farman code.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
              <span>Host / Join Code</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      ) : (
        /* Royal Indian AI Difficulty Selection Panel */
        <div className="relative z-10 w-full max-w-xl mx-auto glass-panel rounded-2xl p-6 sm:p-8 animate-fadeIn border-amber-500/40 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                sound.playClick();
                setShowAiModal(false);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Modes</span>
            </button>
            <div className="text-xs font-bold tracking-widest uppercase text-amber-300 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              Imperial Strategist
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 text-center font-royal">
            Choose Court Intellect
          </h2>
          <p className="text-xs text-amber-100/70 text-center mb-6">
            Select the tactical acumen and rampart defense of the Royal Strategist.
          </p>

          <div className="space-y-3 mb-6">
            {/* Easy: Nav-Sikhia */}
            <div
              onClick={() => {
                sound.playClick();
                setSelectedDifficulty('easy');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedDifficulty === 'easy'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/15'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedDifficulty === 'easy'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-royal">NAV-SIKHIA</h3>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Easy
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    A gentle courtier. Makes relaxed moves and rarely deploys rampart walls.
                  </p>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedDifficulty === 'easy'
                    ? 'border-emerald-400 bg-emerald-400'
                    : 'border-slate-600'
                }`}
              />
            </div>

            {/* Normal: Wazir-e-Khas */}
            <div
              onClick={() => {
                sound.playClick();
                setSelectedDifficulty('normal');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedDifficulty === 'normal'
                  ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/15'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedDifficulty === 'normal'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-royal">WAZIR-E-KHAS</h3>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Normal
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Balanced court strategist. Calculates shortest routes and places tactical walls.
                  </p>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedDifficulty === 'normal'
                    ? 'border-amber-400 bg-amber-400'
                    : 'border-slate-600'
                }`}
              />
            </div>

            {/* Hard: Chanakya */}
            <div
              onClick={() => {
                sound.playClick();
                setSelectedDifficulty('hard');
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedDifficulty === 'hard'
                  ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-500/15'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedDifficulty === 'hard'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Flame className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-royal">CHANAKYA</h3>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Master
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Master of royal strategy. Pinpoints corridor chokepoints, delays rivals, and executes flawless paths.
                  </p>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedDifficulty === 'hard'
                    ? 'border-rose-400 bg-rose-400'
                    : 'border-slate-600'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                setShowAiModal(false);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleConfirmAiStart}
              data-start="true"
              className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              Commence Match
            </button>
          </div>
        </div>
      )}

      {/* Royal Darbar Footer Note */}
      <div className="mt-10 sm:mt-12 text-center text-xs text-amber-200/50 tracking-widest font-royal">
        9×9 Sacred Chaupar Arena · Fortified Rajput Kot Barriers · Swarna Singhasan
      </div>
    </div>
  );
};
