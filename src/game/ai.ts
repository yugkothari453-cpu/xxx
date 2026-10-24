import {
  CellPosition,
  Difficulty,
  GameAction,
  GameState,
  PlayerId,
  Wall,
  WallOrientation,
} from './types';
import {
  BOARD_SIZE,
  getLegalMoves,
  getShortestPath,
  validateWallPlacement,
} from './rules';

export function calculateAiAction(
  state: GameState,
  difficulty: Difficulty
): GameAction {
  const aiId = state.turn;
  const oppId: PlayerId = aiId === 'blue' ? 'crimson' : 'blue';

  const aiPlayer = state.players[aiId];
  const oppPlayer = state.players[oppId];

  const legalMoves = getLegalMoves(aiId, state);

  // Fallback move if somehow no other evaluation is chosen
  let chosenMove: CellPosition = legalMoves[0];

  const currentAiPath = getShortestPath(aiPlayer.position, aiPlayer.goalRow, state.walls);
  const currentOppPath = getShortestPath(oppPlayer.position, oppPlayer.goalRow, state.walls);

  const aiDist = currentAiPath ? currentAiPath.length - 1 : 999;
  const oppDist = currentOppPath ? currentOppPath.length - 1 : 999;

  // Find move that minimizes AI distance to goal
  let bestNextStep: CellPosition | null = null;
  let bestMoveDist = 999;

  for (const move of legalMoves) {
    const p = getShortestPath(move, aiPlayer.goalRow, state.walls);
    if (p) {
      const d = p.length - 1;
      if (d < bestMoveDist) {
        bestMoveDist = d;
        bestNextStep = move;
      }
    }
  }

  if (bestNextStep) {
    chosenMove = bestNextStep;
  }

  // If EASY difficulty
  if (difficulty === 'easy') {
    // 25% chance of making a suboptimal legal move
    if (Math.random() < 0.25 && legalMoves.length > 1) {
      const randomIdx = Math.floor(Math.random() * legalMoves.length);
      return {
        type: 'move',
        player: aiId,
        to: legalMoves[randomIdx],
        timestamp: Date.now(),
      };
    }

    // 15% chance to try a casual wall placement if AI has plenty of walls and opponent is closer
    if (aiPlayer.wallsRemaining > 3 && oppDist < aiDist && Math.random() < 0.2) {
      const candidateWall = findCasualWall(state, aiId, oppPlayer.position);
      if (candidateWall) {
        return {
          type: 'wall',
          player: aiId,
          wall: candidateWall,
          timestamp: Date.now(),
        };
      }
    }

    return {
      type: 'move',
      player: aiId,
      to: chosenMove,
      timestamp: Date.now(),
    };
  }

  // If NORMAL or HARD, evaluate candidate walls
  const candidateWalls: { wall: Wall; score: number }[] = [];

  if (aiPlayer.wallsRemaining > 0 && currentOppPath && currentAiPath) {
    // Candidate walls are generated along the opponent's current shortest path
    const wallsToTest = getTacticalWallCandidates(currentOppPath, aiId, state);

    for (const w of wallsToTest) {
      const val = validateWallPlacement(w, state);
      if (!val.valid) continue;

      const simWalls = [...state.walls, w];
      const newOppPath = getShortestPath(oppPlayer.position, oppPlayer.goalRow, simWalls);
      const newAiPath = getShortestPath(aiPlayer.position, aiPlayer.goalRow, simWalls);

      if (!newOppPath || !newAiPath) continue;

      const newOppDist = newOppPath.length - 1;
      const newAiDist = newAiPath.length - 1;

      const oppDelay = newOppDist - oppDist;
      const aiDelay = newAiDist - aiDist;

      if (difficulty === 'normal') {
        // Normal places a wall if it delays opponent by at least 1 and doesn't hurt AI
        if (oppDelay >= 1 && aiDelay <= 0) {
          candidateWalls.push({
            wall: w,
            score: oppDelay * 2 - aiDelay,
          });
        } else if (oppDelay >= 2 && aiDelay <= 1) {
          candidateWalls.push({
            wall: w,
            score: oppDelay * 2 - aiDelay * 2,
          });
        }
      } else {
        // HARD difficulty: aggressive and deeply evaluates delays
        // Score weighs opponent delay heavily against self hindrance
        const score = oppDelay * 4 - aiDelay * 3;
        if (score > 1) {
          candidateWalls.push({ wall: w, score });
        }
      }
    }
  }

  // Sort candidate walls by score descending
  candidateWalls.sort((a, b) => b.score - a.score);

  if (difficulty === 'normal') {
    // If opponent is closer than AI and a valuable wall exists, place it!
    if (candidateWalls.length > 0 && (oppDist <= aiDist || oppDist <= 3)) {
      // 70% chance to place best wall, 30% to advance
      if (Math.random() < 0.7) {
        return {
          type: 'wall',
          player: aiId,
          wall: candidateWalls[0].wall,
          timestamp: Date.now(),
        };
      }
    }
  } else if (difficulty === 'hard') {
    // HARD: If there is a high-impact wall (delay >= 2 or opponent is at threshold)
    if (candidateWalls.length > 0) {
      const bestWall = candidateWalls[0];
      // If opponent is dangerously close (<= 3 steps), or best wall delivers a big advantage
      if (oppDist <= 3 || bestWall.score >= 4 || (oppDist <= aiDist && bestWall.score >= 2)) {
        return {
          type: 'wall',
          player: aiId,
          wall: bestWall.wall,
          timestamp: Date.now(),
        };
      }
    }
  }

  // Default optimal move
  return {
    type: 'move',
    player: aiId,
    to: chosenMove,
    timestamp: Date.now(),
  };
}

function findCasualWall(
  state: GameState,
  aiId: PlayerId,
  oppPos: CellPosition
): Wall | null {
  const orientations: WallOrientation[] = ['H', 'V'];
  // Look in the neighborhood of opponent
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = oppPos.row + dr;
      const c = oppPos.col + dc;
      if (r >= 0 && r < BOARD_SIZE - 1 && c >= 0 && c < BOARD_SIZE - 1) {
        for (const ori of orientations) {
          const w: Wall = {
            id: `wall_${Date.now()}_${Math.random()}`,
            row: r,
            col: c,
            orientation: ori,
            placedBy: aiId,
          };
          if (validateWallPlacement(w, state).valid) {
            return w;
          }
        }
      }
    }
  }
  return null;
}

function getTacticalWallCandidates(
  oppPath: CellPosition[],
  aiId: PlayerId,
  state: GameState
): Wall[] {
  const candidates: Wall[] = [];
  const seen = new Set<string>();

  // Look along the first 4 steps of opponent's path
  const stepsToConsider = oppPath.slice(0, Math.min(oppPath.length, 5));

  for (let i = 0; i < stepsToConsider.length - 1; i++) {
    const from = stepsToConsider[i];
    const to = stepsToConsider[i + 1];

    // If opponent is moving vertically (between from.row and to.row)
    if (from.col === to.col) {
      const minR = Math.min(from.row, to.row);
      // Horizontal wall at (minR, from.col) or (minR, from.col - 1) blocks this step
      const cols = [from.col, from.col - 1];
      for (const c of cols) {
        if (minR >= 0 && minR < BOARD_SIZE - 1 && c >= 0 && c < BOARD_SIZE - 1) {
          const key = `H_${minR}_${c}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({
              id: `wall_ai_${key}`,
              row: minR,
              col: c,
              orientation: 'H',
              placedBy: aiId,
            });
          }
        }
      }
    } else if (from.row === to.row) {
      // Opponent is moving horizontally (between from.col and to.col)
      const minC = Math.min(from.col, to.col);
      // Vertical wall at (from.row, minC) or (from.row - 1, minC) blocks this step
      const rows = [from.row, from.row - 1];
      for (const r of rows) {
        if (r >= 0 && r < BOARD_SIZE - 1 && minC >= 0 && minC < BOARD_SIZE - 1) {
          const key = `V_${r}_${minC}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({
              id: `wall_ai_${key}`,
              row: r,
              col: minC,
              orientation: 'V',
              placedBy: aiId,
            });
          }
        }
      }
    }
  }

  // Also include a few lateral walls to seal wings
  for (const step of stepsToConsider) {
    for (const ori of ['H', 'V'] as WallOrientation[]) {
      for (const dr of [-1, 0]) {
        for (const dc of [-1, 0]) {
          const r = step.row + dr;
          const c = step.col + dc;
          if (r >= 0 && r < BOARD_SIZE - 1 && c >= 0 && c < BOARD_SIZE - 1) {
            const key = `${ori}_${r}_${c}`;
            if (!seen.has(key)) {
              seen.add(key);
              candidates.push({
                id: `wall_ai_${key}`,
                row: r,
                col: c,
                orientation: ori,
                placedBy: aiId,
              });
            }
          }
        }
      }
    }
  }

  return candidates;
}
