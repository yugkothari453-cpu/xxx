import React from 'react';
import { Volume2, VolumeX, Crown, Home, Sparkles } from 'lucide-react';
import { sound } from '../game/audio';

interface HeaderProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onReturnHome?: () => void;
  showHomeButton?: boolean;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isMuted,
  onToggleMute,
  onReturnHome,
  showHomeButton = false,
  subtitle,
}) => {
  return (
    <header className="w-full max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between z-20">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => {
          if (showHomeButton && onReturnHome) {
            sound.playClick();
            onReturnHome();
          }
        }}
        title="Royal Gambit: Darbar-e-Khaas"
      >
        {/* Ornate Indian Royal Chhatra / Mukut Seal */}
        <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-xl shadow-amber-500/25 group-hover:scale-105 transition-transform shrink-0">
          <div className="w-full h-full bg-[#0a0e1a] rounded-[10px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-amber-500/20 to-transparent pointer-events-none" />
            <Crown className="w-6 h-6 text-amber-300 group-hover:text-amber-200 transition-colors filter drop-shadow-[0_2px_6px_rgba(245,158,11,0.5)]" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-widest bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent font-royal">
              ROYAL GAMBIT
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/40 text-amber-300 shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Darbar-e-Khaas
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-amber-200/70 font-medium tracking-wide">
            {subtitle || 'The Imperial Crown Race · Claim the Swarna Singhasan'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showHomeButton && onReturnHome && (
          <button
            onClick={() => {
              sound.playClick();
              onReturnHome();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-200/90 hover:text-white border border-amber-500/30 hover:border-amber-400/60 transition-all cursor-pointer shadow-md"
            aria-label="Return to Darbar"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Darbar Home</span>
          </button>
        )}

        <button
          onClick={onToggleMute}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400/60 transition-all cursor-pointer shadow-md"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
};
