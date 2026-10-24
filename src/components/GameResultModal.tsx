import React, { useEffect } from 'react';
import { Crown, Trophy, RotateCcw, Home, Skull, Sparkles } from 'lucide-react';
import { GameMode, GameState, PlayerId } from '../game/types';
import { sound } from '../game/audio';

interface GameResultModalProps {
  gameState: GameState;
  gameMode: GameMode;
  myPlayerRole: PlayerId | null;
  onReturnHome: () => void;
  onPlayAgain?: () => void;
  rematchRequestedBy?: PlayerId | null;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  gameState,
  gameMode,
  myPlayerRole,
  onReturnHome,
  onPlayAgain,
  rematchRequestedBy,
}) => {
  const winner = gameState.winner;

  useEffect(() => {
    if (winner) {
      if (myPlayerRole === null || winner === myPlayerRole) {
        sound.playVictory();
      } else {
        sound.playDefeat();
      }
    }
  }, [winner, myPlayerRole]);

  if (!winner) return null;

  const totalMoves = gameState.moveHistory.length;
  const wallsPlaced = gameState.walls.length;

  const winnerName = gameState.players[winner].name;
  const loserId: PlayerId = winner === 'blue' ? 'crimson' : 'blue';
  const loserName = gameState.players[loserId].name;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative glass-panel max-w-md w-full rounded-2xl p-6 sm:p-8 text-center animate-fadeIn border-2 border-amber-400/50 shadow-2xl shadow-black">
        {/* Glow halo */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
            winner === 'blue' ? 'bg-sky-500/25' : 'bg-rose-500/25'
          }`}
        />

        {/* Crown / Golden Singhasan Trophy Emblem */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-2xl shadow-amber-500/30 animate-float">
            <div className="w-full h-full bg-[#0a0e1c] rounded-[14px] flex items-center justify-center">
              <Trophy className="w-9 h-9 text-amber-300 filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]" />
            </div>
          </div>
        </div>

        {/* Royal Title */}
        <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-widest mb-2 font-royal">
          Darbar-e-Khaas Verdict
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 font-royal">
          Swarna Singhasan Claimed!
        </h2>

        {/* Winner & Loser Badges */}
        <div className="flex items-center justify-center gap-2.5 my-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>SOVEREIGN: {winnerName}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>CONCEDED: {loserName}</span>
          </div>
        </div>

        {/* Result Explanation */}
        <p className="text-xs sm:text-sm text-amber-100/80 mb-6 font-medium leading-relaxed">
          {gameState.winnerReason === 'opponent_surrendered'
            ? `${loserName} conceded the royal court. ${winnerName} is crowned undisputed Maharaja of the realm!`
            : `${winnerName} has breached the fortified palace gates and ascends the Golden Swarna Singhasan in triumphant glory!`}
        </p>

        {/* Match Statistics */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-950/70 p-3.5 rounded-xl border border-amber-500/25">
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400/80 tracking-widest font-royal">
              Total Turns Taken
            </div>
            <div className="text-lg font-bold text-white font-royal tabular-nums mt-0.5">
              {totalMoves}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400/80 tracking-widest font-royal">
              Shahi Kot Deployed
            </div>
            <div className="text-lg font-bold text-amber-400 font-royal tabular-nums mt-0.5">
              {wallsPlaced}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onReturnHome();
            }}
            data-start="true"
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-200 border border-amber-500/30 font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>Return to Court</span>
          </button>

          {onPlayAgain && (
            <button
              onClick={() => {
                sound.playClick();
                onPlayAgain();
              }}
              disabled={gameMode === 'online' && rematchRequestedBy === myPlayerRole}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                gameMode === 'online' && rematchRequestedBy === myPlayerRole
                  ? 'bg-amber-600/50 text-slate-300 opacity-80 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 shadow-amber-500/25'
              }`}
            >
              <RotateCcw className={`w-4 h-4 ${gameMode === 'online' && rematchRequestedBy === myPlayerRole ? 'animate-spin' : ''}`} />
              <span>
                {gameMode === 'online'
                  ? rematchRequestedBy === myPlayerRole
                    ? 'Awaiting Rival...'
                    : rematchRequestedBy
                    ? 'Accept Rematch!'
                    : 'Request Rematch'
                  : 'Rematch'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
