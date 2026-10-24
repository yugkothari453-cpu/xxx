import {
  CellPosition,
  GameAction,
  GameState,
  PlayerId,
  Wall,
  WallOrientation,
} from './types';

export const BOARD_SIZE = 9;
export const MAX_WALLS = 10;

export function createInitialGameState(): GameState {
  return {
    boardSize: BOARD_SIZE,
    players: {
      blue: {
        id: 'blue',
        name: 'Mayura Dynasty (Blue Kingdom)',
        position: { row: 0, col: 4 },
        wallsRemaining: MAX_WALLS,
        goalRow: BOARD_SIZE - 1, // Row 8
      },
      crimson: {
        id: 'crimson',
        name: 'Suryavanshi Empire (Crimson Kingdom)',
        position: { row: BOARD_SIZE - 1, col: 4 }, // Row 8, Col 4
        wallsRemaining: MAX_WALLS,
        goalRow: 0, // Row 0
      },
    },
    turn: 'blue',
    walls: [],
    winner: null,
    moveHistory: [],
    status: 'in_progress',
    startedAt: Date.now(),
  };
}

export function isWithinBoard(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE
  );
}

export function isWithinWallGrid(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < BOARD_SIZE - 1 &&
    col >= 0 &&
    col < BOARD_SIZE - 1
  );
}

export function isEdgeBlocked(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  walls: Wall[]
): boolean {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);

  // Must be strictly adjacent orthogonal cells
  if (dr + dc !== 1) {
    return true;
  }

  if (r1 === r2) {
    // Horizontal step between adjacent columns (c1 and c2)
    const minC = Math.min(c1, c2);
    // Vertical wall at col === minC and row === r1 or row === r1 - 1 blocks this
    for (const w of walls) {
      if (w.orientation === 'V' && w.col === minC && (w.row === r1 || w.row === r1 - 1)) {
        return true;
      }
    }
    return false;
  }

  if (c1 === c2) {
    // Vertical step between adjacent rows (r1 and r2)
    const minR = Math.min(r1, r2);
    // Horizontal wall at row === minR and col === c1 or col === c1 - 1 blocks this
    for (const w of walls) {
      if (w.orientation === 'H' && w.row === minR && (w.col === c1 || w.col === c1 - 1)) {
        return true;
      }
    }
    return false;
  }

  return true;
}

export function canMoveBetween(
  from: CellPosition,
  to: CellPosition,
  walls: Wall[]
): boolean {
  if (!isWithinBoard(from.row, from.col) || !isWithinBoard(to.row, to.col)) {
    return false;
  }
  const dr = Math.abs(from.row - to.row);
  const dc = Math.abs(from.col - to.col);
  if (dr + dc !== 1) {
    return false;
  }
  return !isEdgeBlocked(from.row, from.col, to.row, to.col, walls);
}

export function isWallCollision(wall: Wall, existingWalls: Wall[]): boolean {
  for (const ew of existingWalls) {
    // 1. Exact match (same position and orientation)
    if (ew.row === wall.row && ew.col === wall.col && ew.orientation === wall.orientation) {
      return true;
    }

    // 2. Collinear partial overlap along the same line
    if (wall.orientation === 'H' && ew.orientation === 'H') {
      if (ew.row === wall.row && (ew.col === wall.col - 1 || ew.col === wall.col + 1)) {
        return true;
      }
    }

    if (wall.orientation === 'V' && ew.orientation === 'V') {
      if (ew.col === wall.col && (ew.row === wall.row - 1 || ew.row === wall.row + 1)) {
        return true;
      }
    }

    // 3. Crossing intersection at the same (row, col)
    if (ew.row === wall.row && ew.col === wall.col && ew.orientation !== wall.orientation) {
      return true;
    }
  }

  return false;
}

export function getLegalMoves(player: PlayerId, state: GameState): CellPosition[] {
  const current = state.players[player].position;
  const opponentId: PlayerId = player === 'blue' ? 'crimson' : 'blue';
  const opponent = state.players[opponentId].position;
  const legal: CellPosition[] = [];

  const directions = [
    { dr: -1, dc: 0 }, // Up
    { dr: 1, dc: 0 },  // Down
    { dr: 0, dc: -1 }, // Left
    { dr: 0, dc: 1 },  // Right
  ];

  for (const dir of directions) {
    const nextRow = current.row + dir.dr;
    const nextCol = current.col + dir.dc;

    if (!isWithinBoard(nextRow, nextCol)) {
      continue;
    }

    if (isEdgeBlocked(current.row, current.col, nextRow, nextCol, state.walls)) {
      continue;
    }

    // Is opponent occupying next cell?
    if (nextRow === opponent.row && nextCol === opponent.col) {
      // Try straight jump
      const straightRow = nextRow + dir.dr;
      const straightCol = nextCol + dir.dc;

      const straightInBounds = isWithinBoard(straightRow, straightCol);
      const straightBlocked = straightInBounds && isEdgeBlocked(nextRow, nextCol, straightRow, straightCol, state.walls);

      if (straightInBounds && !straightBlocked) {
        // Can jump straight over opponent!
        legal.push({ row: straightRow, col: straightCol });
      } else {
        // Straight jump is blocked by wall or board edge -> diagonal jumps allowed
        let perpDirs: { dr: number; dc: number }[] = [];
        if (dir.dr !== 0) {
          perpDirs = [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        } else {
          perpDirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }];
        }

        for (const perp of perpDirs) {
          const diagRow = nextRow + perp.dr;
          const diagCol = nextCol + perp.dc;

          if (
            isWithinBoard(diagRow, diagCol) &&
            !isEdgeBlocked(nextRow, nextCol, diagRow, diagCol, state.walls)
          ) {
            legal.push({ row: diagRow, col: diagCol });
          }
        }
      }
    } else {
      legal.push({ row: nextRow, col: nextCol });
    }
  }

  // Deduplicate moves by coordinate
  const seen = new Set<string>();
  const uniqueMoves: CellPosition[] = [];
  for (const m of legal) {
    const key = `${m.row},${m.col}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMoves.push(m);
    }
  }

  return uniqueMoves;
}

export function getShortestPath(
  start: CellPosition,
  goalRow: number,
  walls: Wall[]
): CellPosition[] | null {
  if (
    !start ||
    typeof start !== 'object' ||
    !isWithinBoard(start.row, start.col) ||
    !Number.isInteger(goalRow) ||
    goalRow < 0 ||
    goalRow >= BOARD_SIZE
  ) {
    return null;
  }

  const queue: { pos: CellPosition; path: CellPosition[] }[] = [];
  const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));

  queue.push({ pos: start, path: [start] });
  visited[start.row][start.col] = true;

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;

    if (pos.row === goalRow) {
      return path;
    }

    for (const dir of directions) {
      const nr = pos.row + dir.dr;
      const nc = pos.col + dir.dc;

      if (isWithinBoard(nr, nc) && !visited[nr][nc]) {
        if (!isEdgeBlocked(pos.row, pos.col, nr, nc, walls)) {
          visited[nr][nc] = true;
          queue.push({
            pos: { row: nr, col: nc },
            path: [...path, { row: nr, col: nc }],
          });
        }
      }
    }
  }

  return null;
}

export function validateWallPlacement(
  wall: Wall,
  state: GameState
): { valid: boolean; reason?: string } {
  if (!wall || typeof wall !== 'object') {
    return { valid: false, reason: 'Invalid rampart data.' };
  }

  if (wall.orientation !== 'H' && wall.orientation !== 'V') {
    return { valid: false, reason: 'Invalid rampart orientation: must be Horizontal or Vertical.' };
  }

  if (!isWithinWallGrid(wall.row, wall.col)) {
    return { valid: false, reason: 'Rampart position is outside the royal board limits.' };
  }

  const player = state.players[wall.placedBy];
  if (!player) {
    return { valid: false, reason: 'Invalid player for rampart placement.' };
  }

  if (player.wallsRemaining <= 0) {
    return { valid: false, reason: 'You have exhausted your supply of royal ramparts.' };
  }

  if (isWallCollision(wall, state.walls)) {
    return { valid: false, reason: 'Cannot place rampart overlapping or crossing existing walls.' };
  }

  // Check if wall cuts off any player's route to victory
  const simulatedWalls = [...state.walls, wall];

  const bluePath = getShortestPath(
    state.players.blue.position,
    state.players.blue.goalRow,
    simulatedWalls
  );

  if (!bluePath) {
    return { valid: false, reason: 'Illegal placement: completely seals off Blue Kingdom from the throne gate.' };
  }

  const crimsonPath = getShortestPath(
    state.players.crimson.position,
    state.players.crimson.goalRow,
    simulatedWalls
  );

  if (!crimsonPath) {
    return { valid: false, reason: 'Illegal placement: completely seals off Crimson Kingdom from the throne gate.' };
  }

  return { valid: true };
}

export function applyAction(
  state: GameState,
  action: GameAction
): { state: GameState; valid: boolean; reason?: string } {
  if (!state || typeof state !== 'object') {
    return { state, valid: false, reason: 'Invalid game state.' };
  }

  if (!action || typeof action !== 'object' || !action.type) {
    return { state, valid: false, reason: 'Invalid action payload.' };
  }

  if (state.winner || state.status === 'completed') {
    return { state, valid: false, reason: 'Match is already concluded.' };
  }

  if (state.status === 'waiting') {
    return { state, valid: false, reason: 'Match is waiting for both players to enter.' };
  }

  // A player can surrender at any time during an active match (even on opponent's turn)
  if (action.type === 'give_up') {
    if (action.player !== 'blue' && action.player !== 'crimson') {
      return { state, valid: false, reason: 'Invalid player for surrender.' };
    }
    const opponentId: PlayerId = action.player === 'blue' ? 'crimson' : 'blue';
    return {
      valid: true,
      state: {
        ...state,
        winner: opponentId,
        winnerReason: 'opponent_surrendered',
        status: 'completed',
        completedAt: Date.now(),
        moveHistory: [...state.moveHistory, action],
      },
    };
  }

  if (action.player !== state.turn) {
    return { state, valid: false, reason: 'Not your turn.' };
  }

  if (action.type === 'move') {
    if (!action.to || typeof action.to !== 'object' || !isWithinBoard(action.to.row, action.to.col)) {
      return { state, valid: false, reason: 'Destination square is outside the board.' };
    }

    const legalMoves = getLegalMoves(action.player, state);
    const isLegal = legalMoves.some((m) => m.row === action.to.row && m.col === action.to.col);

    if (!isLegal) {
      return { state, valid: false, reason: 'Illegal pawn move.' };
    }

    const nextPlayers = {
      ...state.players,
      [action.player]: {
        ...state.players[action.player],
        position: action.to,
      },
    };

    // Check victory
    let winner: PlayerId | null = null;
    let winnerReason: 'goal_reached' | 'opponent_surrendered' | undefined;
    let status: GameState['status'] = state.status;

    if (action.to.row === state.players[action.player].goalRow) {
      winner = action.player;
      winnerReason = 'goal_reached';
      status = 'completed';
    }

    const nextTurn: PlayerId = action.player === 'blue' ? 'crimson' : 'blue';

    return {
      valid: true,
      state: {
        ...state,
        players: nextPlayers,
        turn: winner ? state.turn : nextTurn,
        winner,
        winnerReason,
        status,
        completedAt: winner ? Date.now() : undefined,
        moveHistory: [...state.moveHistory, action],
      },
    };
  }

  if (action.type === 'wall') {
    if (!action.wall || typeof action.wall !== 'object') {
      return { state, valid: false, reason: 'Missing rampart data.' };
    }

    if (action.wall.placedBy !== action.player) {
      return { state, valid: false, reason: 'Rampart placedBy does not match active player.' };
    }

    const validation = validateWallPlacement(action.wall, state);
    if (!validation.valid) {
      return { state, valid: false, reason: validation.reason };
    }

    const nextPlayers = {
      ...state.players,
      [action.player]: {
        ...state.players[action.player],
        wallsRemaining: state.players[action.player].wallsRemaining - 1,
      },
    };

    const nextTurn: PlayerId = action.player === 'blue' ? 'crimson' : 'blue';

    return {
      valid: true,
      state: {
        ...state,
        players: nextPlayers,
        walls: [...state.walls, action.wall],
        turn: nextTurn,
        moveHistory: [...state.moveHistory, action],
      },
    };
  }

  return { state, valid: false, reason: 'Unknown action type.' };
}
