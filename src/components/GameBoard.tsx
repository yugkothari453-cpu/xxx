import React, { useState, useRef, useCallback } from 'react';
import { CellPosition, GameState, PlayerId, Wall, WallOrientation } from '../game/types';
import { getLegalMoves, validateWallPlacement } from '../game/rules';
import { sound } from '../game/audio';
import { DraggedWallPreview } from '../game/useWallDrag';

interface GameBoardProps {
  gameState: GameState;
  myPlayerRole: PlayerId | null; // null for local 2-player or spectator
  onMovePawn: (to: CellPosition) => void;
  onPlaceWall: (wall: Wall) => void;
  onInvalidAction: (message: string) => void;
  disabled?: boolean;
  draggedWallPreview?: DraggedWallPreview | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  myPlayerRole,
  onMovePawn,
  onPlaceWall,
  onInvalidAction,
  disabled = false,
  draggedWallPreview = null,
}) => {
  const [hoveredWall, setHoveredWall] = useState<{
    row: number;
    col: number;
    orientation: WallOrientation;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const isMyTurn = !disabled && (myPlayerRole === null || gameState.turn === myPlayerRole);
  const currentPlayer = gameState.players[gameState.turn];
  const hasWallsRemaining = currentPlayer.wallsRemaining > 0;

  // Pawn legal moves are ALWAYS active when it is the player's turn
  const legalMoves = isMyTurn ? getLegalMoves(gameState.turn, gameState) : [];

  const cellSize = 46;
  const gap = 14;
  const margin = 7;
  const step = cellSize + gap; // 60px

  // Convert mouse event coordinates to SVG 540x540 coordinates
  const getSvgCoordinates = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const svgX = ((clientX - rect.left) / rect.width) * 540;
    const svgY = ((clientY - rect.top) / rect.height) * 540;
    return { svgX, svgY };
  }, []);

  // Compute auto-detected wall orientation & position from mouse position
  const computeWallFromPosition = useCallback(
    (svgX: number, svgY: number): { row: number; col: number; orientation: WallOrientation } | null => {
      const relX = svgX - margin;
      const relY = svgY - margin;

      // Check bounds
      if (relX < 0 || relY < 0 || relX >= 9 * step - gap || relY >= 9 * step - gap) {
        return null;
      }

      const cellCol = Math.floor(relX / step);
      const cellRow = Math.floor(relY / step);
      const inTileX = relX % step;
      const inTileY = relY % step;

      // Inside a square tile (46x46): Pawn movement zone, not a wall
      if (inTileX < cellSize && inTileY < cellSize) {
        return null;
      }

      // In a horizontal corridor between rows: unequivocally HORIZONTAL
      if (inTileY >= cellSize && inTileX < cellSize) {
        const wallRow = Math.min(cellRow, 7);
        let wallCol = cellCol;
        if (inTileX < 20 && cellCol > 0) {
          wallCol = cellCol - 1;
        }
        wallCol = Math.max(0, Math.min(wallCol, 7));
        return { row: wallRow, col: wallCol, orientation: 'H' };
      }

      // In a vertical corridor between columns: unequivocally VERTICAL
      if (inTileX >= cellSize && inTileY < cellSize) {
        const wallCol = Math.min(cellCol, 7);
        let wallRow = cellRow;
        if (inTileY < 20 && cellRow > 0) {
          wallRow = cellRow - 1;
        }
        wallRow = Math.max(0, Math.min(wallRow, 7));
        return { row: wallRow, col: wallCol, orientation: 'V' };
      }

      // At the intersection junction: choose based on proximity to axis
      if (inTileX >= cellSize && inTileY >= cellSize) {
        const wallRow = Math.min(cellRow, 7);
        const wallCol = Math.min(cellCol, 7);
        const junctionCenterX = cellSize + gap / 2;
        const junctionCenterY = cellSize + gap / 2;
        const dx = inTileX - junctionCenterX;
        const dy = inTileY - junctionCenterY;

        if (Math.abs(dx) >= Math.abs(dy)) {
          return { row: wallRow, col: wallCol, orientation: 'H' };
        } else {
          return { row: wallRow, col: wallCol, orientation: 'V' };
        }
      }

      return null;
    },
    [cellSize, gap, margin, step]
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMyTurn || !hasWallsRemaining) {
      if (hoveredWall) setHoveredWall(null);
      return;
    }

    const coords = getSvgCoordinates(e);
    if (!coords) return;

    const detected = computeWallFromPosition(coords.svgX, coords.svgY);
    if (!detected) {
      if (hoveredWall) setHoveredWall(null);
      return;
    }

    if (
      !hoveredWall ||
      hoveredWall.row !== detected.row ||
      hoveredWall.col !== detected.col ||
      hoveredWall.orientation !== detected.orientation
    ) {
      setHoveredWall(detected);
    }
  };

  const handleMouseLeave = () => {
    if (hoveredWall) {
      setHoveredWall(null);
    }
  };

  const handleBoardClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMyTurn) return;

    const coords = getSvgCoordinates(e);
    if (!coords) return;

    const relX = coords.svgX - margin;
    const relY = coords.svgY - margin;

    // 1. Check if clicking on a cell for pawn movement
    if (relX >= 0 && relY >= 0 && relX < 9 * step && relY < 9 * step) {
      const inTileX = relX % step;
      const inTileY = relY % step;

      if (inTileX < cellSize && inTileY < cellSize) {
        const cellCol = Math.floor(relX / step);
        const cellRow = Math.floor(relY / step);

        const isLegal = legalMoves.some((m) => m.row === cellRow && m.col === cellCol);
        if (isLegal) {
          onMovePawn({ row: cellRow, col: cellCol });
          setHoveredWall(null);
          return;
        }

        const myPos = gameState.players[gameState.turn].position;
        if (cellRow === myPos.row && cellCol === myPos.col) {
          return;
        }

        onInvalidAction('Illegal move. Choose a glowing royal gemstone marker.');
        sound.playInvalid();
        return;
      }
    }

    // 2. Check if clicking on corridor/junction for wall placement
    if (!hasWallsRemaining) {
      onInvalidAction('Your royal store of Shahi Ramparts (Kot) is depleted.');
      sound.playInvalid();
      return;
    }

    const detected = computeWallFromPosition(coords.svgX, coords.svgY);
    if (!detected) return;

    const newWall: Wall = {
      id: `kot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      row: detected.row,
      col: detected.col,
      orientation: detected.orientation,
      placedBy: gameState.turn,
    };

    const validation = validateWallPlacement(newWall, gameState);
    if (validation.valid) {
      onPlaceWall(newWall);
      setHoveredWall(null);
    } else {
      sound.playInvalid();
      onInvalidAction(validation.reason || 'Invalid Shahi Rampart placement.');
    }
  };

  // Check validity of hovered preview wall
  let isHoveredWallValid = false;
  if (hoveredWall && isMyTurn && hasWallsRemaining) {
    const previewWall: Wall = {
      id: 'preview',
      row: hoveredWall.row,
      col: hoveredWall.col,
      orientation: hoveredWall.orientation,
      placedBy: gameState.turn,
    };
    isHoveredWallValid = validateWallPlacement(previewWall, gameState).valid;
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-[540px]">
      {/* Auto-Orientation Guidance Banner */}
      <div className="w-full flex items-center justify-between px-2 mb-2 text-xs">
        <div className="text-[11px] text-amber-200/90 flex items-center gap-2">
          {myPlayerRole !== null ? (
            isMyTurn ? (
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#34d399] animate-pulse" />
                <span>Your Turn ({myPlayerRole === 'blue' ? 'Mayura' : 'Suryavanshi'}) — Click any gold gemstone to march</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-400/50 inline-block" />
                <span>Awaiting rival's move ({gameState.turn === 'blue' ? 'Mayura' : 'Suryavanshi'})...</span>
              </span>
            )
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_#f59e0b]" />
              <span>Click gold gemstone to march pawn</span>
              <span className="text-amber-500/40">·</span>
              <span>Hover corridors for <strong>Shahi Kot</strong></span>
            </span>
          )}
        </div>
        <div className="text-[10px] font-bold tracking-wider uppercase text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 rounded-full shadow-xs shrink-0">
          Auto H / V
        </div>
      </div>

      {/* Royal Indian Chaupar / Shatranj Board */}
      <div
        className="relative w-full aspect-square max-w-[540px] p-2"
        onContextMenu={handleContextMenu}
      >
        <svg
          id="game-board-svg"
          ref={svgRef}
          data-testid="game-board-svg"
          viewBox="0 0 540 540"
          className="w-full h-full drop-shadow-[0_16px_36px_rgba(0,0,0,0.8)] cursor-default"
          style={{ overflow: 'visible' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleBoardClick}
        >
          <defs>
            {/* Mayura (Peacock Azure) Royal Pawn Gradient */}
            <radialGradient id="mayuraPawnGlow" cx="45%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="40%" stopColor="#0284c7" />
              <stop offset="85%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#082f49" />
            </radialGradient>

            {/* Suryavanshi (Imperial Crimson & Saffron) Royal Pawn Gradient */}
            <radialGradient id="suryaPawnGlow" cx="45%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="35%" stopColor="#e11d48" />
              <stop offset="80%" stopColor="#9f1239" />
              <stop offset="100%" stopColor="#4c0519" />
            </radialGradient>

            {/* Antique Kundan Gold Foil Gradient */}
            <linearGradient id="kundanGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Mayura Dynasty Kot (Peacock Azure Stone & Gold) */}
            <linearGradient id="mayuraWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#0284c7" />
              <stop offset="80%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>

            {/* Suryavanshi Empire Kot (Imperial Crimson Sandstone & Gold) */}
            <linearGradient id="suryaWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="40%" stopColor="#be123c" />
              <stop offset="80%" stopColor="#9f1239" />
              <stop offset="100%" stopColor="#4c0519" />
            </linearGradient>

            {/* Marble Cell Texture Filter */}
            <filter id="tileBevel" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.6" />
            </filter>

            {/* Royal Gold Glow Filter */}
            <filter id="kundanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Central Delicate Gold Pietra Dura Mandala Pattern (Subtle Indian Palace Inlay) */}
          <g opacity={0.12} className="pointer-events-none">
            <circle cx={270} cy={270} r={180} fill="none" stroke="url(#kundanGold)" strokeWidth={1} strokeDasharray="4 4" />
            <circle cx={270} cy={270} r={120} fill="none" stroke="url(#kundanGold)" strokeWidth={1.5} />
            <circle cx={270} cy={270} r={60} fill="none" stroke="url(#kundanGold)" strokeWidth={1} />
            {/* 8-pointed Lotus Petals */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i * 45 * Math.PI) / 180;
              const px = 270 + Math.cos(angle) * 90;
              const py = 270 + Math.sin(angle) * 90;
              return (
                <circle key={`lotus_petal_${i}`} cx={px} cy={py} r={28} fill="none" stroke="url(#kundanGold)" strokeWidth={0.8} />
              );
            })}
          </g>

          {/* 9x9 Royal Palace Stone Cells */}
          {Array.from({ length: 9 }).map((_, r) =>
            Array.from({ length: 9 }).map((_, c) => {
              const x = margin + c * step;
              const y = margin + r * step;
              const isGoalForBlue = r === 8; // Mayura Goal Row (South Singhasan)
              const isGoalForCrimson = r === 0; // Suryavanshi Goal Row (North Singhasan)

              const isLegal = legalMoves.some((m) => m.row === r && m.col === c);

              let cellFill = '#0d1322'; // Deep Haveli Obsidian-Indigo
              let cellBorder = 'rgba(217, 119, 6, 0.22)'; // Kundan Gold hairline

              if (isGoalForBlue) {
                cellFill = '#0a1a2f';
                cellBorder = 'rgba(14, 165, 233, 0.45)'; // Mayur Peacock gate
              } else if (isGoalForCrimson) {
                cellFill = '#1a0d18';
                cellBorder = 'rgba(225, 29, 72, 0.45)'; // Surya Sun gate
              }

              return (
                <g
                  key={`cell_${r}_${c}`}
                  className={isLegal && isMyTurn ? 'cursor-pointer' : undefined}
                  role={isLegal && isMyTurn ? 'button' : undefined}
                  aria-label={isLegal && isMyTurn ? `March to row ${r + 1}, column ${c + 1}` : undefined}
                  onClick={(e) => {
                    if (!isMyTurn) return;
                    e.stopPropagation();
                    if (isLegal) {
                      onMovePawn({ row: r, col: c });
                      setHoveredWall(null);
                    } else {
                      const myPos = gameState.players[gameState.turn].position;
                      if (r !== myPos.row || c !== myPos.col) {
                        onInvalidAction('Illegal move. Choose a glowing royal gemstone marker.');
                        sound.playInvalid();
                      }
                    }
                  }}
                >
                  {/* Marble Tile */}
                  <rect
                    data-cell-row={r}
                    data-cell-col={c}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx={8}
                    fill={cellFill}
                    stroke={cellBorder}
                    strokeWidth={1.5}
                    filter="url(#tileBevel)"
                    className={`transition-colors duration-200 ${
                      isLegal && isMyTurn ? 'hover:stroke-amber-300 hover:fill-[#17223b] cursor-pointer' : ''
                    }`}
                  />

                  {/* Corner Gold Inlay Accents on every cell */}
                  <circle cx={x + 5} cy={y + 5} r={1} fill="#f59e0b" opacity={0.3} />
                  <circle cx={x + cellSize - 5} cy={y + 5} r={1} fill="#f59e0b" opacity={0.3} />
                  <circle cx={x + 5} cy={y + cellSize - 5} r={1} fill="#f59e0b" opacity={0.3} />
                  <circle cx={x + cellSize - 5} cy={y + cellSize - 5} r={1} fill="#f59e0b" opacity={0.3} />

                  {/* Throne Gate Goal Row Subtle Indian Crests */}
                  {isGoalForCrimson && (
                    <g opacity={0.75} className="pointer-events-none">
                      {/* Sunburst motif for Surya gate */}
                      <circle cx={x + cellSize / 2} cy={y + 8} r={2.5} fill="#fb7185" />
                      <line x1={x + cellSize / 2} y1={y + 3} x2={x + cellSize / 2} y2={y + 5} stroke="#f59e0b" strokeWidth={1} />
                      <line x1={x + cellSize / 2 - 4} y1={y + 8} x2={x + cellSize / 2 - 2} y2={y + 8} stroke="#f59e0b" strokeWidth={1} />
                      <line x1={x + cellSize / 2 + 2} y1={y + 8} x2={x + cellSize / 2 + 4} y2={y + 8} stroke="#f59e0b" strokeWidth={1} />
                    </g>
                  )}

                  {isGoalForBlue && (
                    <g opacity={0.75} className="pointer-events-none">
                      {/* Peacock feather arch motif for Mayura gate */}
                      <circle cx={x + cellSize / 2} cy={y + cellSize - 8} r={2.5} fill="#38bdf8" />
                      <path
                        d={`M ${x + cellSize / 2 - 5} ${y + cellSize - 6} Q ${x + cellSize / 2} ${y + cellSize - 12} ${x + cellSize / 2 + 5} ${y + cellSize - 6}`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={1}
                      />
                    </g>
                  )}

                  {/* Legal Move Indicator: Glowing Kundan Gemstone */}
                  {isLegal && (
                    <g className="cursor-pointer animate-pulse pointer-events-none">
                      <circle
                        cx={x + cellSize / 2}
                        cy={y + cellSize / 2}
                        r={12}
                        fill={gameState.turn === 'blue' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(251, 113, 133, 0.25)'}
                        stroke="#fde047"
                        strokeWidth={1.5}
                        strokeDasharray="3 2"
                      />
                      <circle
                        cx={x + cellSize / 2}
                        cy={y + cellSize / 2}
                        r={5}
                        fill={gameState.turn === 'blue' ? '#38bdf8' : '#fb7185'}
                        stroke="#fef08a"
                        strokeWidth={1.5}
                        filter="url(#kundanGlow)"
                      />
                    </g>
                  )}
                </g>
              );
            })
          )}

          {/* Guide Stars at Intersections (Brass Jali Rivets) */}
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => {
              const gx = margin + c * step + cellSize + gap / 2;
              const gy = margin + r * step + cellSize + gap / 2;
              return (
                <g key={`guide_${r}_${c}`} className="pointer-events-none opacity-40">
                  <circle cx={gx} cy={gy} r={2} fill="#f59e0b" />
                  <line x1={gx - 3} y1={gy} x2={gx + 3} y2={gy} stroke="#f59e0b" strokeWidth={0.5} />
                  <line x1={gx} y1={gy - 3} x2={gx} y2={gy + 3} stroke="#f59e0b" strokeWidth={0.5} />
                </g>
              );
            })
          )}

          {/* Placed Shahi Ramparts (Kot) */}
          {gameState.walls.map((w) => {
            const isHorizontal = w.orientation === 'H';
            const wallWidth = isHorizontal ? cellSize * 2 + gap : gap;
            const wallHeight = isHorizontal ? gap : cellSize * 2 + gap;

            const wx = isHorizontal ? margin + w.col * step : margin + w.col * step + cellSize;
            const wy = isHorizontal ? margin + w.row * step + cellSize : margin + w.row * step;

            const gradId = w.placedBy === 'blue' ? 'url(#mayuraWallGrad)' : 'url(#suryaWallGrad)';
            const borderCol = w.placedBy === 'blue' ? '#7dd3fc' : '#fda4af';
            const shadowColor = w.placedBy === 'blue' ? 'rgba(14, 165, 233, 0.6)' : 'rgba(225, 29, 72, 0.6)';

            return (
              <g key={w.id} className="pointer-events-none">
                {/* Fortified Rampart Wall Body */}
                <rect
                  x={wx}
                  y={wy}
                  width={wallWidth}
                  height={wallHeight}
                  rx={5}
                  fill={gradId}
                  stroke={borderCol}
                  strokeWidth={1.5}
                  style={{ filter: `drop-shadow(0 2px 8px ${shadowColor})` }}
                />

                {/* Golden Brass Cap Filigree (Kangura / Battlement style) */}
                <rect
                  x={wx + 2}
                  y={wy + 2}
                  width={Math.max(2, wallWidth - 4)}
                  height={Math.max(2, wallHeight - 4)}
                  rx={3}
                  fill="none"
                  stroke="url(#kundanGold)"
                  strokeWidth={0.75}
                  opacity={0.7}
                />

                {/* Central Kundan Gemstone Jewel */}
                <circle
                  cx={wx + wallWidth / 2}
                  cy={wy + wallHeight / 2}
                  r={3.5}
                  fill="#fef08a"
                  stroke="#b45309"
                  strokeWidth={1}
                />
                <circle
                  cx={wx + wallWidth / 2}
                  cy={wy + wallHeight / 2}
                  r={1.5}
                  fill={w.placedBy === 'blue' ? '#0284c7' : '#e11d48'}
                />
              </g>
            );
          })}

          {/* Dragged Wall Preview Ghost from Touch/Pointer Drag */}
          {draggedWallPreview && (() => {
            const isHorizontal = draggedWallPreview.orientation === 'H';
            const wallWidth = isHorizontal ? cellSize * 2 + gap : gap;
            const wallHeight = isHorizontal ? gap : cellSize * 2 + gap;

            const wx = isHorizontal
              ? margin + draggedWallPreview.col * step
              : margin + draggedWallPreview.col * step + cellSize;
            const wy = isHorizontal
              ? margin + draggedWallPreview.row * step + cellSize
              : margin + draggedWallPreview.row * step;

            const isValid = draggedWallPreview.isValid;
            const previewFill = isValid
              ? gameState.turn === 'blue'
                ? 'rgba(14, 165, 233, 0.9)'
                : 'rgba(225, 29, 72, 0.9)'
              : 'rgba(239, 68, 68, 0.8)';

            const previewStroke = isValid ? '#fde047' : '#f87171';

            return (
              <g
                className="pointer-events-none transition-all"
                style={{
                  filter: isValid
                    ? gameState.turn === 'blue'
                      ? 'drop-shadow(0 0 16px rgba(56, 189, 248, 1))'
                      : 'drop-shadow(0 0 16px rgba(251, 113, 133, 1))'
                    : 'drop-shadow(0 0 12px rgba(239, 68, 68, 1))',
                }}
              >
                <rect
                  x={wx}
                  y={wy}
                  width={wallWidth}
                  height={wallHeight}
                  rx={5}
                  fill={previewFill}
                  stroke={previewStroke}
                  strokeWidth={2.5}
                  strokeDasharray={isValid ? undefined : '5 3'}
                  className="animate-pulse"
                />
                {isValid ? (
                  <g>
                    <circle
                      cx={wx + wallWidth / 2}
                      cy={wy + wallHeight / 2}
                      r={4.5}
                      fill="#fef08a"
                      stroke="#92400e"
                      strokeWidth={1}
                    />
                    <circle
                      cx={wx + wallWidth / 2}
                      cy={wy + wallHeight / 2}
                      r={2}
                      fill={gameState.turn === 'blue' ? '#0284c7' : '#e11d48'}
                    />
                  </g>
                ) : (
                  <line
                    x1={wx + 6}
                    y1={wy + 6}
                    x2={wx + wallWidth - 6}
                    y2={wy + wallHeight - 6}
                    stroke="#fca5a5"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })()}

          {/* Auto Hover Preview Ghost Shahi Rampart */}
          {!draggedWallPreview && hoveredWall && isMyTurn && hasWallsRemaining && (() => {
            const isHorizontal = hoveredWall.orientation === 'H';
            const wallWidth = isHorizontal ? cellSize * 2 + gap : gap;
            const wallHeight = isHorizontal ? gap : cellSize * 2 + gap;

            const wx = isHorizontal
              ? margin + hoveredWall.col * step
              : margin + hoveredWall.col * step + cellSize;
            const wy = isHorizontal
              ? margin + hoveredWall.row * step + cellSize
              : margin + hoveredWall.row * step;

            const previewFill = isHoveredWallValid
              ? gameState.turn === 'blue'
                ? 'rgba(14, 165, 233, 0.8)'
                : 'rgba(225, 29, 72, 0.8)'
              : 'rgba(239, 68, 68, 0.7)';

            const previewStroke = isHoveredWallValid ? '#fef08a' : '#f87171';

            return (
              <g
                className="pointer-events-none transition-all"
                style={{
                  filter: isHoveredWallValid
                    ? gameState.turn === 'blue'
                      ? 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))'
                      : 'drop-shadow(0 0 10px rgba(251, 113, 133, 0.9))'
                    : 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.9))',
                }}
              >
                <rect
                  x={wx}
                  y={wy}
                  width={wallWidth}
                  height={wallHeight}
                  rx={5}
                  fill={previewFill}
                  stroke={previewStroke}
                  strokeWidth={2}
                  strokeDasharray={isHoveredWallValid ? undefined : '5 3'}
                />
                {isHoveredWallValid && (
                  <circle
                    cx={wx + wallWidth / 2}
                    cy={wy + wallHeight / 2}
                    r={3.5}
                    fill="#fef08a"
                    stroke="#92400e"
                    strokeWidth={0.5}
                  />
                )}
              </g>
            );
          })()}

          {/* Royal Indian Pawns */}
          {/* 1. Mayura Dynasty (North Sovereign / Blue) */}
          {(() => {
            const pos = gameState.players.blue.position;
            const cx = margin + pos.col * step + cellSize / 2;
            const cy = margin + pos.row * step + cellSize / 2;
            const isBlueTurn = gameState.turn === 'blue';

            return (
              <g
                key="pawn_blue"
                className="transition-all duration-300 pointer-events-none"
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                {/* Active Royal Aura */}
                {isBlueTurn && (
                  <g>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={24}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      opacity={0.65}
                      className="animate-ping"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={21}
                      fill="none"
                      stroke="#fde047"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                    />
                  </g>
                )}

                {/* Outer Medallion: Lapis & Kundan Gold Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={18}
                  fill="url(#mayuraPawnGlow)"
                  stroke="url(#kundanGold)"
                  strokeWidth={2.5}
                  filter="url(#tileBevel)"
                />

                {/* Royal Indian Maharaja Mukut (Crown with Kalgi Plume) */}
                {/* Kalgi Peacock Plume feather on top */}
                <path
                  d={`M ${cx} ${cy - 7} Q ${cx + 3} ${cy - 12} ${cx + 1} ${cy - 15} Q ${cx - 2} ${cy - 11} ${cx} ${cy - 7}`}
                  fill="#fef08a"
                  stroke="#0284c7"
                  strokeWidth={0.5}
                />
                <circle cx={cx + 1} cy={cy - 14} r={1.5} fill="#10b981" />

                {/* Imperial Indian Crown Base */}
                <path
                  d={`M ${cx - 7} ${cy + 5} L ${cx + 7} ${cy + 5} L ${cx + 9} ${cy - 2} L ${cx + 4} ${cy + 1} L ${cx} ${cy - 6} L ${cx - 4} ${cy + 1} L ${cx - 9} ${cy - 2} Z`}
                  fill="url(#kundanGold)"
                  stroke="#78350f"
                  strokeWidth={0.6}
                />

                {/* Center Kundan Gem Bindu */}
                <circle cx={cx} cy={cy + 1} r={2} fill="#e11d48" stroke="#fef08a" strokeWidth={0.5} />
              </g>
            );
          })()}

          {/* 2. Suryavanshi Empire (South Sovereign / Crimson) */}
          {(() => {
            const pos = gameState.players.crimson.position;
            const cx = margin + pos.col * step + cellSize / 2;
            const cy = margin + pos.row * step + cellSize / 2;
            const isCrimsonTurn = gameState.turn === 'crimson';

            return (
              <g
                key="pawn_crimson"
                className="transition-all duration-300 pointer-events-none"
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              >
                {/* Active Royal Aura */}
                {isCrimsonTurn && (
                  <g>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={24}
                      fill="none"
                      stroke="#fb7185"
                      strokeWidth={2}
                      opacity={0.65}
                      className="animate-ping"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={21}
                      fill="none"
                      stroke="#fde047"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                    />
                  </g>
                )}

                {/* Outer Medallion: Imperial Ruby & Kundan Gold Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={18}
                  fill="url(#suryaPawnGlow)"
                  stroke="url(#kundanGold)"
                  strokeWidth={2.5}
                  filter="url(#tileBevel)"
                />

                {/* Royal Rajput Surya Chakra Mukut (Sun-Crown with Radiating Rays) */}
                <circle cx={cx} cy={cy} r={8.5} fill="none" stroke="url(#kundanGold)" strokeWidth={1} strokeDasharray="3 1.5" />

                {/* Surya Crown Peak */}
                <path
                  d={`M ${cx - 8} ${cy + 4} L ${cx + 8} ${cy + 4} L ${cx + 9} ${cy - 2} L ${cx + 5} ${cy + 1} L ${cx} ${cy - 7} L ${cx - 5} ${cy + 1} L ${cx - 9} ${cy - 2} Z`}
                  fill="url(#kundanGold)"
                  stroke="#78350f"
                  strokeWidth={0.6}
                />

                {/* Surya Sun Center Bindu */}
                <circle cx={cx} cy={cy} r={2.5} fill="#fef08a" stroke="#b45309" strokeWidth={0.5} />
                <circle cx={cx} cy={cy} r={1.2} fill="#e11d48" />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Board Base Plinth: Carved Jaisalmer Sandstone & Zari Trim Accent */}
      <div className="w-full max-w-[520px] mt-1 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300/70">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Darbar 9×9 Chaupar Arena
        </span>
        <span className="font-royal text-amber-400/90 tracking-wider">Swarna Singhasan Duel</span>
      </div>
    </div>
  );
};
