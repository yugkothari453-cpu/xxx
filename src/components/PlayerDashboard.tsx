import React, { useState } from 'react';
import {
  Crown,
  Shield,
  Move,
  Flag,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Volume2,
  VolumeX,
  Sparkles,
  Sun,
  Flame,
  GripHorizontal,
} from 'lucide-react';
import { GameMode, GameState, PlayerId, RoomState } from '../game/types';
import { sound } from '../game/audio';
import { DragOrientation } from '../game/useWallDrag';

interface PlayerDashboardProps {
  gameState: GameState;
  gameMode: GameMode;
  myPlayerRole: PlayerId | null;
  room?: RoomState | null;
  onGiveUp: () => void;
  onReturnHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  statusMessage?: string;
  orientationChoice: DragOrientation;
  onSelectOrientation: (o: DragOrientation) => void;
  onStartDrag: (e: React.PointerEvent | React.TouchEvent, player: PlayerId) => void;
  isDragging?: boolean;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  gameState,
  gameMode,
  myPlayerRole,
  room,
  onGiveUp,
  onReturnHome,
  isMuted,
  onToggleMute,
  statusMessage,
  orientationChoice,
  onSelectOrientation,
  onStartDrag,
  isDragging = false,
}) => {
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  const isBlueTurn = gameState.turn === 'blue';
  const isCrimsonTurn = gameState.turn === 'crimson';

  const opponentRole: PlayerId | null =
    myPlayerRole === 'blue' ? 'crimson' : myPlayerRole === 'crimson' ? 'blue' : null;
  const opponentData = opponentRole && room?.players[opponentRole];
  const isOpponentDisconnected = Boolean(
    gameMode === 'online' && opponentData && !opponentData.connected
  );

  return (
    <div className="w-full flex flex-col gap-3.5 max-w-md">
      {/* Active Royal Darbar Turn Banner */}
      <div className="glass-panel rounded-2xl p-3 sm:p-3.5 flex items-center justify-between border-amber-500/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full animate-ping ${
              isBlueTurn ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
            }`}
          />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold">
              Darbar Command
            </div>
            <div
              className={`text-sm sm:text-base font-bold font-royal flex items-center gap-1.5 ${
                isBlueTurn ? 'text-sky-300' : 'text-rose-300'
              }`}
            >
              <span>{isBlueTurn ? 'Mayura Dynasty' : 'Suryavanshi Empire'}</span>
              <span className="text-xs text-amber-200/60 font-normal">
                {isBlueTurn ? '(Blue)' : '(Crimson)'}
              </span>
              {myPlayerRole !== null && (
                <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-semibold">
                  {gameState.turn === myPlayerRole ? 'You' : 'Rival'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
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
      </div>

      {/* Opponent Disconnected Banner */}
      {isOpponentDisconnected && (
        <div
          data-testid="opponent-disconnected-banner"
          className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs flex items-center gap-2.5 animate-pulse"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Rival Disconnected:</strong> {opponentData?.name || 'Rival Commander'} has lost court connection. Awaiting reconnection...
          </span>
        </div>
      )}

      {/* Status Warning / Tip if any */}
      {statusMessage && (
        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-400/50 text-amber-200 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Royal Dynasty Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mayura Dynasty (Blue Kingdom) */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isBlueTurn
              ? 'glass-panel-blue ring-2 ring-sky-400/50 shadow-xl shadow-sky-500/20'
              : 'glass-panel opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400/30 to-emerald-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 shrink-0 shadow-xs">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-royal flex items-center gap-1">
                  <span>Mayura Dynasty</span>
                </h3>
                <span className="text-[10px] text-sky-300/80 font-medium">Mayur Neel Sovereign</span>
              </div>
            </div>
            {isBlueTurn && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/40">
                Turn
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mb-2.5">
            <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Target: South Swarna Singhasan</span>
          </div>

          {/* Shahi Rampart (Kot) Inventory Rack */}
          <div className="mt-2 pt-2 border-t border-sky-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 font-medium">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-sky-400" />
                <span>Shahi Kot (Walls)</span>
              </span>
              <span className="font-bold text-sky-300 tabular-nums">
                {gameState.players.blue.wallsRemaining} / 10
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`b_wall_${i}`}
                  className={`h-2.5 rounded-xs transition-colors ${
                    i < gameState.players.blue.wallsRemaining
                      ? 'bg-gradient-to-t from-sky-500 to-sky-300 shadow-[0_0_5px_#38bdf8]'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                  title={`Shahi Kot slot ${i + 1}`}
                />
              ))}
            </div>

            {/* Draggable Shahi Rampart Deployer (Active on Blue Turn) */}
            {isBlueTurn && gameState.players.blue.wallsRemaining > 0 && (
              <div className="mt-2.5 pt-2 border-t border-sky-800/40 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1">
                    <GripHorizontal className="w-3 h-3 text-amber-400" />
                    <span>Deploy Rampart</span>
                  </span>
                  {/* Orientation Switcher */}
                  <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-amber-500/30">
                    <button
                      type="button"
                      onClick={() => onSelectOrientation('H')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        orientationChoice === 'H'
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Horizontal [—]"
                    >
                      ━ H
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectOrientation('V')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        orientationChoice === 'V'
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Vertical [|]"
                    >
                      ┃ V
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectOrientation('AUTO')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        orientationChoice === 'AUTO'
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Auto Detect Corridor"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                {/* Draggable Rampart Handle */}
                <div
                  data-testid="drag-wall-blue"
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => onStartDrag(e, 'blue')}
                  onTouchStart={(e) => onStartDrag(e, 'blue')}
                  style={{ touchAction: 'none' }}
                  className={`w-full py-2 px-2.5 rounded-xl border border-sky-400/50 bg-gradient-to-r from-sky-900/60 via-slate-900/90 to-sky-950/70 hover:from-sky-800/60 hover:to-sky-900/60 cursor-grab active:cursor-grabbing transition-all select-none shadow-md flex items-center justify-between ${
                    isDragging ? 'ring-2 ring-amber-400 shadow-[0_0_12px_#38bdf8]' : 'hover:border-amber-400/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-sky-500/30 border border-sky-400/50 flex items-center justify-center text-amber-300 shrink-0">
                      <Shield className="w-3 h-3" />
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] font-bold text-sky-200 font-royal flex items-center gap-1">
                        <span>Drag Kot to Board</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-semibold">
                          {orientationChoice === 'H' ? '━ Horiz' : orientationChoice === 'V' ? '┃ Vert' : 'Auto'}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400">Touch & drag onto arena corridors</div>
                    </div>
                  </div>
                  <GripHorizontal className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suryavanshi Empire (Crimson Kingdom) */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isCrimsonTurn
              ? 'glass-panel-crimson ring-2 ring-rose-400/50 shadow-xl shadow-rose-500/20'
              : 'glass-panel opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400/30 to-amber-500/20 border border-rose-400/50 flex items-center justify-center text-rose-300 shrink-0 shadow-xs">
                <Sun className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-royal flex items-center gap-1">
                  <span>Suryavanshi</span>
                </h3>
                <span className="text-[10px] text-rose-300/80 font-medium">Surya Saffron Empire</span>
              </div>
            </div>
            {isCrimsonTurn && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/40">
                Turn
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mb-2.5">
            <ArrowUp className="w-3.5 h-3.5 text-rose-400" />
            <span>Target: North Swarna Singhasan</span>
          </div>

          {/* Shahi Rampart (Kot) Inventory Rack */}
          <div className="mt-2 pt-2 border-t border-rose-900/40">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 font-medium">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-rose-400" />
                <span>Shahi Kot (Walls)</span>
              </span>
              <span className="font-bold text-rose-300 tabular-nums">
                {gameState.players.crimson.wallsRemaining} / 10
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`c_wall_${i}`}
                  className={`h-2.5 rounded-xs transition-colors ${
                    i < gameState.players.crimson.wallsRemaining
                      ? 'bg-gradient-to-t from-rose-500 to-amber-300 shadow-[0_0_5px_#fb7185]'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                  title={`Shahi Kot slot ${i + 1}`}
                />
              ))}
            </div>

            {/* Draggable Shahi Rampart Deployer (Active on Crimson Turn) */}
            {isCrimsonTurn && gameState.players.crimson.wallsRemaining > 0 && (
              <div className="mt-2.5 pt-2 border-t border-rose-800/40 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1">
                    <GripHorizontal className="w-3 h-3 text-amber-400" />
                    <span>Deploy Rampart</span>
                  </span>
                  {/* Orientation Switcher */}
                  <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-amber-500/30">
                    <button
                      type="button"
                      onClick={() => onSelectOrientation('H')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        orientationChoice === 'H'
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Horizontal [—]"
                    >
                      ━ H
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectOrientation('V')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        orientationChoice === 'V'
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Vertical [|]"
                    >
                      ┃ V
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectOrientation('AUTO')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        orientationChoice === 'AUTO'
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Auto Detect Corridor"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                {/* Draggable Rampart Handle */}
                <div
                  data-testid="drag-wall-crimson"
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => onStartDrag(e, 'crimson')}
                  onTouchStart={(e) => onStartDrag(e, 'crimson')}
                  style={{ touchAction: 'none' }}
                  className={`w-full py-2 px-2.5 rounded-xl border border-rose-400/50 bg-gradient-to-r from-rose-900/60 via-slate-900/90 to-rose-950/70 hover:from-rose-800/60 hover:to-rose-900/60 cursor-grab active:cursor-grabbing transition-all select-none shadow-md flex items-center justify-between ${
                    isDragging ? 'ring-2 ring-amber-400 shadow-[0_0_12px_#fb7185]' : 'hover:border-amber-400/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-rose-500/30 border border-rose-400/50 flex items-center justify-center text-amber-300 shrink-0">
                      <Shield className="w-3 h-3" />
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] font-bold text-rose-200 font-royal flex items-center gap-1">
                        <span>Drag Kot to Board</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-semibold">
                          {orientationChoice === 'H' ? '━ Horiz' : orientationChoice === 'V' ? '┃ Vert' : 'Auto'}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400">Touch & drag onto arena corridors</div>
                    </div>
                  </div>
                  <GripHorizontal className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shahi Tactics Guidance Panel */}
      <div className="glass-panel rounded-2xl p-3.5 space-y-2.5 border-amber-500/25">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase font-bold text-amber-300/90 tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Darbar Controls</span>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Auto Ramparts Active
          </div>
        </div>

        <div className="bg-slate-950/70 rounded-xl p-3 border border-amber-500/20 text-xs text-slate-300 space-y-2 leading-relaxed">
          <div className="flex items-start gap-2">
            <Move className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span><strong>March Pawn:</strong> Click any highlighted golden gemstone ring on legal adjacent squares.</span>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <span><strong>Mobile Drag & Drop:</strong> Touch & drag the <strong>Shahi Kot</strong> rampart from the side menu directly onto the board corridors to place your wall!</span>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span><strong>Desktop Quick Fortify:</strong> Hover over corridors between tiles for <strong>Horizontal [—]</strong> or <strong>Vertical [|]</strong> and click.</span>
          </div>
        </div>
      </div>

      {/* Darbar Concession & Leave */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => {
            sound.playClick();
            setShowSurrenderConfirm(true);
          }}
          className="flex-1 py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
        >
          <Flag className="w-3.5 h-3.5 text-rose-400" />
          <span>Concede Throne</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onReturnHome();
          }}
          className="py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-200/90 hover:text-white border border-amber-500/30 text-xs font-semibold tracking-wider transition-colors cursor-pointer shadow-md"
        >
          Leave Darbar
        </button>
      </div>

      {/* Concede Confirmation Modal */}
      {showSurrenderConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel-crimson rounded-2xl max-w-sm w-full p-6 text-center animate-fadeIn border-rose-500/50 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-300 mx-auto flex items-center justify-center mb-4 border border-rose-400/40">
              <Flag className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 font-royal">
              Concede the Imperial Duel?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Surrendering will immediately crown your rival as sovereign of the Swarna Singhasan. Do you accept this defeat?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSurrenderConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fight On
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSurrenderConfirm(false);
                  onGiveUp();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Yes, Concede
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
