import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, PlayerId, Wall, WallOrientation } from './types';
import { validateWallPlacement } from './rules';
import { sound } from './audio';

export type DragOrientation = 'H' | 'V' | 'AUTO';

export interface DraggedWallPreview {
  row: number;
  col: number;
  orientation: WallOrientation;
  isValid: boolean;
  reason?: string;
}

export interface ActiveDragState {
  isDragging: boolean;
  player: PlayerId;
  orientationChoice: DragOrientation;
  resolvedOrientation: WallOrientation;
  screenX: number;
  screenY: number;
  isOverBoard: boolean;
  boardRow: number;
  boardCol: number;
  isValid: boolean;
  reason?: string;
}

interface UseWallDragProps {
  gameState: GameState;
  myPlayerRole: PlayerId | null;
  disabled?: boolean;
  onPlaceWall: (wall: Wall) => void;
  onInvalidAction: (message: string) => void;
}

export function useWallDrag({
  gameState,
  myPlayerRole,
  disabled = false,
  onPlaceWall,
  onInvalidAction,
}: UseWallDragProps) {
  const [orientationChoice, setOrientationChoice] = useState<DragOrientation>('H');
  const [dragState, setDragState] = useState<ActiveDragState | null>(null);

  // Keep latest state in ref to avoid stale closure in window event listeners
  const latestPropsRef = useRef({
    gameState,
    myPlayerRole,
    disabled,
    orientationChoice,
    onPlaceWall,
    onInvalidAction,
  });

  useEffect(() => {
    latestPropsRef.current = {
      gameState,
      myPlayerRole,
      disabled,
      orientationChoice,
      onPlaceWall,
      onInvalidAction,
    };
  });

  const dragStateRef = useRef<ActiveDragState | null>(null);
  dragStateRef.current = dragState;

  // Convert clientX, clientY to board grid snap position
  const computeBoardPlacement = useCallback(
    (
      clientX: number,
      clientY: number,
      chosenOrientation: DragOrientation,
      player: PlayerId,
      currentState: GameState
    ) => {
      const svgElem = document.getElementById('game-board-svg');
      if (!svgElem) {
        return { isOverBoard: false, row: 0, col: 0, resolvedOrientation: 'H' as WallOrientation, isValid: false };
      }

      const rect = svgElem.getBoundingClientRect();
      const padding = 24; // Generous hit area around the board
      const isWithinRect =
        clientX >= rect.left - padding &&
        clientX <= rect.right + padding &&
        clientY >= rect.top - padding &&
        clientY <= rect.bottom + padding;

      if (!isWithinRect) {
        return { isOverBoard: false, row: 0, col: 0, resolvedOrientation: 'H' as WallOrientation, isValid: false };
      }

      // Project onto SVG 540x540 coordinates
      const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
      const clampedY = Math.max(rect.top, Math.min(rect.bottom, clientY));
      const svgX = ((clampedX - rect.left) / rect.width) * 540;
      const svgY = ((clampedY - rect.top) / rect.height) * 540;

      // Determine orientation
      let resolvedOrientation: WallOrientation = 'H';
      if (chosenOrientation === 'H') {
        resolvedOrientation = 'H';
      } else if (chosenOrientation === 'V') {
        resolvedOrientation = 'V';
      } else {
        // AUTO: compare proximity to nearest horizontal vs vertical corridor
        const nearestHCorridorY = 60 + Math.round((svgY - 60) / 60) * 60;
        const nearestVCorridorX = 60 + Math.round((svgX - 60) / 60) * 60;
        const distToH = Math.abs(svgY - nearestHCorridorY);
        const distToV = Math.abs(svgX - nearestVCorridorX);
        resolvedOrientation = distToH <= distToV ? 'H' : 'V';
      }

      // Snap to closest wall grid index (0 to 7)
      const row = Math.max(0, Math.min(7, Math.round((svgY - 60) / 60)));
      const col = Math.max(0, Math.min(7, Math.round((svgX - 60) / 60)));

      const candidateWall: Wall = {
        id: 'drag_preview',
        row,
        col,
        orientation: resolvedOrientation,
        placedBy: player,
      };

      const validation = validateWallPlacement(candidateWall, currentState);

      return {
        isOverBoard: true,
        row,
        col,
        resolvedOrientation,
        isValid: validation.valid,
        reason: validation.reason,
      };
    },
    []
  );

  const startDrag = useCallback(
    (
      e: React.PointerEvent | React.TouchEvent,
      player: PlayerId,
      overrideOrientation?: DragOrientation
    ) => {
      const { gameState: state, myPlayerRole: role, disabled: isDis } = latestPropsRef.current;

      if (isDis) return;

      // Ensure it is this player's turn
      if (state.turn !== player) {
        sound.playInvalid();
        latestPropsRef.current.onInvalidAction("Wait for your imperial turn before deploying ramparts.");
        return;
      }

      // In online / local mode, check role
      if (role !== null && role !== player) {
        sound.playInvalid();
        latestPropsRef.current.onInvalidAction("You can only command your own dynasty's ramparts.");
        return;
      }

      const playerInfo = state.players[player];
      if (!playerInfo || playerInfo.wallsRemaining <= 0) {
        sound.playInvalid();
        latestPropsRef.current.onInvalidAction("Your supply of Shahi Ramparts (Kot) is depleted.");
        return;
      }

      let clientX = 0;
      let clientY = 0;

      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const activeChoice = overrideOrientation || latestPropsRef.current.orientationChoice;
      const initialPlacement = computeBoardPlacement(clientX, clientY, activeChoice, player, state);

      sound.playClick();

      setDragState({
        isDragging: true,
        player,
        orientationChoice: activeChoice,
        resolvedOrientation: initialPlacement.resolvedOrientation,
        screenX: clientX,
        screenY: clientY,
        isOverBoard: initialPlacement.isOverBoard,
        boardRow: initialPlacement.row,
        boardCol: initialPlacement.col,
        isValid: initialPlacement.isValid,
        reason: initialPlacement.reason,
      });
    },
    [computeBoardPlacement]
  );

  // Global window listeners for pointer/touch movements and release
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const currentDrag = dragStateRef.current;
      if (!currentDrag) return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      // Auto-scroll viewport if user drags near top or bottom edge on mobile
      if (clientY < 70) {
        window.scrollBy({ top: -8, behavior: 'auto' });
      } else if (clientY > window.innerHeight - 70) {
        window.scrollBy({ top: 8, behavior: 'auto' });
      }

      const placement = computeBoardPlacement(
        clientX,
        clientY,
        currentDrag.orientationChoice,
        currentDrag.player,
        latestPropsRef.current.gameState
      );

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              screenX: clientX,
              screenY: clientY,
              isOverBoard: placement.isOverBoard,
              boardRow: placement.row,
              boardCol: placement.col,
              resolvedOrientation: placement.resolvedOrientation,
              isValid: placement.isValid,
              reason: placement.reason,
            }
          : null
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const clientX = touch.clientX;
      const clientY = touch.clientY;

      // Prevent native viewport pull-to-refresh while actively dragging
      if (e.cancelable) {
        e.preventDefault();
      }

      if (clientY < 70) {
        window.scrollBy({ top: -8, behavior: 'auto' });
      } else if (clientY > window.innerHeight - 70) {
        window.scrollBy({ top: 8, behavior: 'auto' });
      }

      const currentDrag = dragStateRef.current;
      if (!currentDrag) return;

      const placement = computeBoardPlacement(
        clientX,
        clientY,
        currentDrag.orientationChoice,
        currentDrag.player,
        latestPropsRef.current.gameState
      );

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              screenX: clientX,
              screenY: clientY,
              isOverBoard: placement.isOverBoard,
              boardRow: placement.row,
              boardCol: placement.col,
              resolvedOrientation: placement.resolvedOrientation,
              isValid: placement.isValid,
              reason: placement.reason,
            }
          : null
      );
    };

    const handleEnd = () => {
      const currentDrag = dragStateRef.current;
      if (!currentDrag) return;

      if (currentDrag.isOverBoard) {
        if (currentDrag.isValid) {
          const newWall: Wall = {
            id: `kot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            row: currentDrag.boardRow,
            col: currentDrag.boardCol,
            orientation: currentDrag.resolvedOrientation,
            placedBy: currentDrag.player,
          };
          latestPropsRef.current.onPlaceWall(newWall);
        } else {
          sound.playInvalid();
          latestPropsRef.current.onInvalidAction(
            currentDrag.reason || 'Invalid Shahi Rampart placement.'
          );
        }
      }

      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [dragState !== null, computeBoardPlacement]);

  // Derived board preview for GameBoard
  const draggedBoardPreview: DraggedWallPreview | null =
    dragState && dragState.isOverBoard
      ? {
          row: dragState.boardRow,
          col: dragState.boardCol,
          orientation: dragState.resolvedOrientation,
          isValid: dragState.isValid,
          reason: dragState.reason,
        }
      : null;

  return {
    orientationChoice,
    setOrientationChoice,
    dragState,
    startDrag,
    draggedBoardPreview,
  };
}
