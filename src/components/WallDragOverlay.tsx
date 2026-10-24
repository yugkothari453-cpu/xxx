import React from 'react';
import { ActiveDragState } from '../game/useWallDrag';
import { Shield, Check, X, Sparkles } from 'lucide-react';

interface WallDragOverlayProps {
  dragState: ActiveDragState | null;
}

export const WallDragOverlay: React.FC<WallDragOverlayProps> = ({ dragState }) => {
  if (!dragState) return null;

  const isBlue = dragState.player === 'blue';
  const isHorizontal = dragState.resolvedOrientation === 'H';

  return (
    <div
      className="fixed z-50 pointer-events-none select-none transition-transform duration-75 ease-out"
      style={{
        left: dragState.screenX,
        top: dragState.screenY - 50,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="flex flex-col items-center gap-1.5">
        {/* Status pill indicating placement validity */}
        {dragState.isOverBoard ? (
          dragState.isValid ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[11px] font-bold shadow-lg shadow-emerald-900/50 animate-bounce">
              <Check className="w-3.5 h-3.5" />
              <span>Release to Fortify</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/90 border border-rose-400 text-rose-300 text-[10px] font-bold shadow-lg shadow-rose-900/50">
              <X className="w-3.5 h-3.5" />
              <span>{dragState.reason ? 'Blocked / Illegal' : 'Invalid Position'}</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/90 border border-amber-400/60 text-amber-300 text-[10px] font-medium shadow-md">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Drag into arena grid</span>
          </div>
        )}

        {/* Floating Royal Kot Rampart preview */}
        <div
          className={`flex items-center justify-center rounded-lg border-2 shadow-2xl transition-all ${
            isHorizontal ? 'w-24 h-7' : 'w-7 h-24'
          } ${
            isBlue
              ? 'bg-gradient-to-r from-sky-600 via-sky-500 to-emerald-600 border-amber-300 shadow-sky-500/50'
              : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 border-amber-300 shadow-rose-500/50'
          } ${dragState.isOverBoard && !dragState.isValid ? 'opacity-60 ring-2 ring-rose-500' : 'ring-2 ring-amber-400/80 animate-pulse'}`}
        >
          {/* Internal filigree & jewel motif */}
          <div className="flex items-center justify-center gap-1 text-white">
            <Shield className="w-3.5 h-3.5 text-amber-200" />
            <div className="w-2 h-2 rounded-full bg-amber-200 shadow-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};
