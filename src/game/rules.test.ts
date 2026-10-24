import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  applyAction,
  getLegalMoves,
  validateWallPlacement,
  getShortestPath,
  isWallCollision,
  isEdgeBlocked,
  canMoveBetween,
  isWithinBoard,
  isWithinWallGrid,
  BOARD_SIZE,
  MAX_WALLS,
} from './rules';
import { GameAction, GameState, Wall } from './types';

// ==========================================
// 1. BOARD INITIALIZATION & BOUNDS
// ==========================================
test('Initial board setup has correct player positions, wall counts, and starting turn', () => {
  const state = createInitialGameState();
  assert.equal(state.boardSize, 9);
  assert.equal(state.status, 'in_progress');
  assert.equal(state.turn, 'blue');
  assert.equal(state.walls.length, 0);
  assert.equal(state.winner, null);

  // Blue starts at (0, 4) aiming for row 8
  assert.equal(state.players.blue.position.row, 0);
  assert.equal(state.players.blue.position.col, 4);
  assert.equal(state.players.blue.wallsRemaining, MAX_WALLS);
  assert.equal(state.players.blue.goalRow, 8);

  // Crimson starts at (8, 4) aiming for row 0
  assert.equal(state.players.crimson.position.row, 8);
  assert.equal(state.players.crimson.position.col, 4);
  assert.equal(state.players.crimson.wallsRemaining, MAX_WALLS);
  assert.equal(state.players.crimson.goalRow, 0);
});

test('Boundary checks strictly validate cell and wall coordinates', () => {
  // Cell bounds
  assert.ok(isWithinBoard(0, 0));
  assert.ok(isWithinBoard(8, 8));
  assert.ok(isWithinBoard(4, 4));
  assert.equal(isWithinBoard(-1, 0), false);
  assert.equal(isWithinBoard(0, -1), false);
  assert.equal(isWithinBoard(9, 0), false);
  assert.equal(isWithinBoard(0, 9), false);
  assert.equal(isWithinBoard(2.5, 3), false);

  // Wall grid bounds (0..7, 0..7)
  assert.ok(isWithinWallGrid(0, 0));
  assert.ok(isWithinWallGrid(7, 7));
  assert.equal(isWithinWallGrid(-1, 0), false);
  assert.equal(isWithinWallGrid(8, 0), false);
  assert.equal(isWithinWallGrid(0, 8), false);
  assert.equal(isWithinWallGrid(3.14, 2), false);
});

// ==========================================
// 2. ORTHOGONAL PAWN MOVEMENT & WALL BLOCKING
// ==========================================
test('Pawn can only move orthogonally into adjacent in-bound cells', () => {
  const state = createInitialGameState();
  const moves = getLegalMoves('blue', state);

  // From (0, 4), can move Down (1, 4), Left (0, 3), Right (0, 5). Up (-1, 4) is blocked by boundary.
  assert.equal(moves.length, 3);
  assert.ok(moves.some((m) => m.row === 1 && m.col === 4));
  assert.ok(moves.some((m) => m.row === 0 && m.col === 3));
  assert.ok(moves.some((m) => m.row === 0 && m.col === 5));

  // Crimson at (8, 4): can move Up (7, 4), Left (8, 3), Right (8, 5). Down (9, 4) is blocked by boundary.
  const crimsonMoves = getLegalMoves('crimson', state);
  assert.equal(crimsonMoves.length, 3);
  assert.ok(crimsonMoves.some((m) => m.row === 7 && m.col === 4));
  assert.ok(crimsonMoves.some((m) => m.row === 8 && m.col === 3));
  assert.ok(crimsonMoves.some((m) => m.row === 8 && m.col === 5));
});

test('Horizontal wall correctly blocks vertical movement across its 2 columns', () => {
  // Horizontal wall at row 2, col 3 spans columns 3 and 4 along the row 2 <-> row 3 boundary
  const walls: Wall[] = [
    { id: 'w1', row: 2, col: 3, orientation: 'H', placedBy: 'blue' },
  ];

  // Column 3: (2, 3) <-> (3, 3) should be blocked
  assert.ok(isEdgeBlocked(2, 3, 3, 3, walls));
  assert.ok(isEdgeBlocked(3, 3, 2, 3, walls));
  assert.equal(canMoveBetween({ row: 2, col: 3 }, { row: 3, col: 3 }, walls), false);

  // Column 4: (2, 4) <-> (3, 4) should be blocked
  assert.ok(isEdgeBlocked(2, 4, 3, 4, walls));
  assert.ok(isEdgeBlocked(3, 4, 2, 4, walls));
  assert.equal(canMoveBetween({ row: 2, col: 4 }, { row: 3, col: 4 }, walls), false);

  // Column 2: (2, 2) <-> (3, 2) is NOT blocked
  assert.equal(isEdgeBlocked(2, 2, 3, 2, walls), false);
  assert.ok(canMoveBetween({ row: 2, col: 2 }, { row: 3, col: 2 }, walls));

  // Column 5: (2, 5) <-> (3, 5) is NOT blocked
  assert.equal(isEdgeBlocked(2, 5, 3, 5, walls), false);
  assert.ok(canMoveBetween({ row: 2, col: 5 }, { row: 3, col: 5 }, walls));

  // Horizontal moves along row 2 or row 3 are NOT blocked by a horizontal wall
  assert.equal(isEdgeBlocked(2, 3, 2, 4, walls), false);
  assert.equal(isEdgeBlocked(3, 3, 3, 4, walls), false);
});

test('Vertical wall correctly blocks horizontal movement across its 2 rows', () => {
  // Vertical wall at row 3, col 4 spans rows 3 and 4 along the col 4 <-> col 5 boundary
  const walls: Wall[] = [
    { id: 'wv', row: 3, col: 4, orientation: 'V', placedBy: 'crimson' },
  ];

  // Row 3: (3, 4) <-> (3, 5) should be blocked
  assert.ok(isEdgeBlocked(3, 4, 3, 5, walls));
  assert.ok(isEdgeBlocked(3, 5, 3, 4, walls));
  assert.equal(canMoveBetween({ row: 3, col: 4 }, { row: 3, col: 5 }, walls), false);

  // Row 4: (4, 4) <-> (4, 5) should be blocked
  assert.ok(isEdgeBlocked(4, 4, 4, 5, walls));
  assert.ok(isEdgeBlocked(4, 5, 4, 4, walls));
  assert.equal(canMoveBetween({ row: 4, col: 4 }, { row: 4, col: 5 }, walls), false);

  // Row 2: (2, 4) <-> (2, 5) is NOT blocked
  assert.equal(isEdgeBlocked(2, 4, 2, 5, walls), false);
  assert.ok(canMoveBetween({ row: 2, col: 4 }, { row: 2, col: 5 }, walls));

  // Row 5: (5, 4) <-> (5, 5) is NOT blocked
  assert.equal(isEdgeBlocked(5, 4, 5, 5, walls), false);
  assert.ok(canMoveBetween({ row: 5, col: 4 }, { row: 5, col: 5 }, walls));

  // Vertical moves along col 4 or col 5 are NOT blocked by a vertical wall
  assert.equal(isEdgeBlocked(3, 4, 4, 4, walls), false);
  assert.equal(isEdgeBlocked(3, 5, 4, 5, walls), false);
});

test('isEdgeBlocked rejects non-adjacent cells', () => {
  // Diagonal or multi-step coords must always return true (blocked)
  assert.ok(isEdgeBlocked(0, 0, 1, 1, []));
  assert.ok(isEdgeBlocked(0, 0, 0, 2, []));
  assert.ok(isEdgeBlocked(0, 0, 2, 0, []));
});

// ==========================================
// 3. PAWN JUMPING RULES (OFFICIAL QUORIDOR)
// ==========================================
test('Straight jump over adjacent opponent when path is clear', () => {
  let state = createInitialGameState();
  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 4, col: 4 } },
      crimson: { ...state.players.crimson, position: { row: 5, col: 4 } },
    },
    turn: 'blue',
  };

  const moves = getLegalMoves('blue', state);

  // Must include straight jump to (6, 4)
  assert.ok(moves.some((m) => m.row === 6 && m.col === 4), 'Straight jump should be legal');

  // Must NOT offer diagonal jumps to (5, 3) or (5, 5) when straight jump is available
  assert.equal(moves.some((m) => m.row === 5 && m.col === 3), false, 'Diagonal jump forbidden when straight jump open');
  assert.equal(moves.some((m) => m.row === 5 && m.col === 5), false, 'Diagonal jump forbidden when straight jump open');

  // Normal orthogonal moves away from opponent must still be legal
  assert.ok(moves.some((m) => m.row === 3 && m.col === 4), 'Up move should be legal');
  assert.ok(moves.some((m) => m.row === 4 && m.col === 3), 'Left move should be legal');
  assert.ok(moves.some((m) => m.row === 4 && m.col === 5), 'Right move should be legal');
});

test('Diagonal jumps enabled when straight jump is blocked by a wall behind opponent', () => {
  let state = createInitialGameState();
  const wallBehind: Wall = {
    id: 'block',
    row: 5,
    col: 4,
    orientation: 'H',
    placedBy: 'crimson',
  };

  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 4, col: 4 } },
      crimson: { ...state.players.crimson, position: { row: 5, col: 4 } },
    },
    walls: [wallBehind],
    turn: 'blue',
  };

  const moves = getLegalMoves('blue', state);

  // Straight jump to (6, 4) is blocked
  assert.equal(moves.some((m) => m.row === 6 && m.col === 4), false, 'Straight jump blocked by wall');

  // Both diagonal jump options (5, 3) and (5, 5) are legal
  assert.ok(moves.some((m) => m.row === 5 && m.col === 3), 'Diagonal left jump legal');
  assert.ok(moves.some((m) => m.row === 5 && m.col === 5), 'Diagonal right jump legal');
});

test('Diagonal jumps enabled when straight jump is blocked by board boundary', () => {
  let state = createInitialGameState();
  // Blue at (7, 4), Crimson at (8, 4) - bottom row of board!
  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 7, col: 4 } },
      crimson: { ...state.players.crimson, position: { row: 8, col: 4 } },
    },
    turn: 'blue',
  };

  const moves = getLegalMoves('blue', state);

  // Straight jump to (9, 4) would be off board
  assert.equal(moves.some((m) => m.row === 9 && m.col === 4), false);

  // Diagonal jumps on row 8 to (8, 3) and (8, 5) must be legal!
  assert.ok(moves.some((m) => m.row === 8 && m.col === 3), 'Diagonal left on edge should be legal');
  assert.ok(moves.some((m) => m.row === 8 && m.col === 5), 'Diagonal right on edge should be legal');
});

test('No jump allowed if wall is between player and opponent', () => {
  let state = createInitialGameState();
  // Wall between (4, 4) and (5, 4)
  const wallBetween: Wall = {
    id: 'between',
    row: 4,
    col: 4,
    orientation: 'H',
    placedBy: 'crimson',
  };

  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 4, col: 4 } },
      crimson: { ...state.players.crimson, position: { row: 5, col: 4 } },
    },
    walls: [wallBetween],
    turn: 'blue',
  };

  const moves = getLegalMoves('blue', state);

  // Blue cannot jump over Crimson at all (neither straight nor diagonal)
  assert.equal(moves.some((m) => m.row === 6 && m.col === 4), false);
  assert.equal(moves.some((m) => m.row === 5 && m.col === 3), false);
  assert.equal(moves.some((m) => m.row === 5 && m.col === 5), false);
  assert.equal(moves.some((m) => m.row === 5 && m.col === 4), false);
});

test('Diagonal jump blocked if wall is between opponent and diagonal target cell', () => {
  let state = createInitialGameState();
  // Horizontal wall behind crimson blocks straight jump
  // Vertical wall between crimson (5, 4) and (5, 5) blocks right diagonal jump
  const wallBehind: Wall = { id: 'wb', row: 5, col: 4, orientation: 'H', placedBy: 'crimson' };
  const wallRight: Wall = { id: 'wr', row: 5, col: 4, orientation: 'V', placedBy: 'crimson' };

  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 4, col: 4 } },
      crimson: { ...state.players.crimson, position: { row: 5, col: 4 } },
    },
    walls: [wallBehind, wallRight],
    turn: 'blue',
  };

  const moves = getLegalMoves('blue', state);

  // Left diagonal (5, 3) is open!
  assert.ok(moves.some((m) => m.row === 5 && m.col === 3), 'Left diagonal should be legal');
  // Right diagonal (5, 5) is blocked by wall!
  assert.equal(moves.some((m) => m.row === 5 && m.col === 5), false, 'Right diagonal blocked by wall');
});

// ==========================================
// 4. WALL PLACEMENT, OVERLAPS & CROSSINGS
// ==========================================
test('Wall collision detection rejects identical, partial collinear, and crossing walls', () => {
  const existing: Wall[] = [
    { id: 'w1', row: 2, col: 2, orientation: 'H', placedBy: 'blue' },
  ];

  // Identical duplicate
  assert.ok(isWallCollision({ id: 't1', row: 2, col: 2, orientation: 'H', placedBy: 'crimson' }, existing));

  // Partial collinear overlap left (row 2, col 1 shares col 2)
  assert.ok(isWallCollision({ id: 't2', row: 2, col: 1, orientation: 'H', placedBy: 'crimson' }, existing));

  // Partial collinear overlap right (row 2, col 3 shares col 3)
  assert.ok(isWallCollision({ id: 't3', row: 2, col: 3, orientation: 'H', placedBy: 'crimson' }, existing));

  // Crossing intersection at the same center vertex (row 2, col 2)
  assert.ok(isWallCollision({ id: 't4', row: 2, col: 2, orientation: 'V', placedBy: 'crimson' }, existing));

  // Vertical wall collinear overlaps
  const existingV: Wall[] = [
    { id: 'v1', row: 3, col: 3, orientation: 'V', placedBy: 'crimson' },
  ];
  assert.ok(isWallCollision({ id: 't5', row: 2, col: 3, orientation: 'V', placedBy: 'blue' }, existingV));
  assert.ok(isWallCollision({ id: 't6', row: 4, col: 3, orientation: 'V', placedBy: 'blue' }, existingV));
  assert.ok(isWallCollision({ id: 't7', row: 3, col: 3, orientation: 'H', placedBy: 'blue' }, existingV));
});

test('Wall collision detection permits legal touching (T-junctions, L-junctions, and end-to-end collinear walls)', () => {
  const existingH: Wall[] = [
    { id: 'h1', row: 2, col: 2, orientation: 'H', placedBy: 'blue' },
  ];

  // End-to-end collinear: horizontal wall at row 2, col 4 touches tip at col 4
  assert.equal(isWallCollision({ id: 'c1', row: 2, col: 4, orientation: 'H', placedBy: 'crimson' }, existingH), false);

  // End-to-end collinear: horizontal wall at row 2, col 0 touches tip at col 2
  assert.equal(isWallCollision({ id: 'c2', row: 2, col: 0, orientation: 'H', placedBy: 'crimson' }, existingH), false);

  // L-junction: vertical wall starting at the tip of the horizontal wall (row 2, col 3)
  assert.equal(isWallCollision({ id: 'c3', row: 2, col: 3, orientation: 'V', placedBy: 'crimson' }, existingH), false);

  // T-junction: vertical wall meeting horizontal wall at (row 1, col 2)
  assert.equal(isWallCollision({ id: 'c4', row: 1, col: 2, orientation: 'V', placedBy: 'crimson' }, existingH), false);

  // Parallel adjacent wall: horizontal wall on the row immediately below (row 3, col 2)
  assert.equal(isWallCollision({ id: 'c5', row: 3, col: 2, orientation: 'H', placedBy: 'crimson' }, existingH), false);
});

test('Wall placement out of board limits is rejected', () => {
  const state = createInitialGameState();
  const invalidWall: Wall = {
    id: 'out',
    row: 8, // max valid wall row is 7
    col: 4,
    orientation: 'H',
    placedBy: 'blue',
  };

  const res = validateWallPlacement(invalidWall, state);
  assert.equal(res.valid, false);
  assert.match(res.reason!, /outside the royal board limits/i);
});

// ==========================================
// 5. PATH PRESERVATION & BFS INTEGRITY
// ==========================================
test('getShortestPath returns correct shortest unweighted path', () => {
  const start = { row: 0, col: 4 };
  const goalRow = 8;
  const path = getShortestPath(start, goalRow, []);

  assert.ok(path !== null);
  // Straight path on open board: 0->1->2->3->4->5->6->7->8 (9 cells, 8 steps)
  assert.equal(path.length, 9);
  assert.equal(path[0].row, 0);
  assert.equal(path[8].row, 8);
});

test('Wall placement that completely blocks Blue from reaching row 8 is rejected', () => {
  let state = createInitialGameState();
  // Build a wall barricade spanning cols 0 to 7 across row 1
  const barricade: Wall[] = [
    { id: 'b0', row: 1, col: 0, orientation: 'H', placedBy: 'crimson' },
    { id: 'b2', row: 1, col: 2, orientation: 'H', placedBy: 'crimson' },
    { id: 'b4', row: 1, col: 4, orientation: 'H', placedBy: 'crimson' },
    { id: 'b6', row: 1, col: 6, orientation: 'H', placedBy: 'crimson' },
  ];

  state = { ...state, walls: barricade };

  // Vertical wall at row 0, col 7 blocks (0,7)<->(0,8) and (1,7)<->(1,8), sealing Blue's only way around row 1
  const sealingWall: Wall = {
    id: 'seal',
    row: 0,
    col: 7,
    orientation: 'V',
    placedBy: 'crimson',
  };

  const result = validateWallPlacement(sealingWall, state);
  assert.equal(result.valid, false);
  assert.match(result.reason!, /Blue Kingdom/i);
});

test('Wall placement that completely blocks Crimson from reaching row 0 is rejected', () => {
  let state = createInitialGameState();
  const barricade: Wall[] = [
    { id: 'c0', row: 6, col: 0, orientation: 'H', placedBy: 'blue' },
    { id: 'c2', row: 6, col: 2, orientation: 'H', placedBy: 'blue' },
    { id: 'c4', row: 6, col: 4, orientation: 'H', placedBy: 'blue' },
    { id: 'c6', row: 6, col: 6, orientation: 'H', placedBy: 'blue' },
  ];

  state = { ...state, walls: barricade };

  // Vertical wall at row 7, col 7 blocks (7,7)<->(7,8) and (8,7)<->(8,8), sealing Crimson's only way around row 7
  const sealingWall: Wall = {
    id: 'sealCrimson',
    row: 7,
    col: 7,
    orientation: 'V',
    placedBy: 'blue',
  };

  const result = validateWallPlacement(sealingWall, state);
  assert.equal(result.valid, false);
  assert.match(result.reason!, /Crimson Kingdom/i);
});

// ==========================================
// 6. TURN SWITCHING & WALL INVENTORY
// ==========================================
test('Turn switching between Blue and Crimson on move and wall actions', () => {
  let state = createInitialGameState();
  assert.equal(state.turn, 'blue');

  // Blue pawn moves down
  const move1: GameAction = {
    type: 'move',
    player: 'blue',
    to: { row: 1, col: 4 },
    timestamp: Date.now(),
  };
  const res1 = applyAction(state, move1);
  assert.ok(res1.valid);
  assert.equal(res1.state.turn, 'crimson');

  // Attempting to move as Blue out of turn is rejected
  const illegalTurnAction: GameAction = {
    type: 'move',
    player: 'blue',
    to: { row: 2, col: 4 },
    timestamp: Date.now(),
  };
  const errTurn = applyAction(res1.state, illegalTurnAction);
  assert.equal(errTurn.valid, false);
  assert.equal(errTurn.reason, 'Not your turn.');

  // Crimson places a wall
  const wallAction: GameAction = {
    type: 'wall',
    player: 'crimson',
    wall: { id: 'w_test', row: 4, col: 4, orientation: 'H', placedBy: 'crimson' },
    timestamp: Date.now(),
  };
  const res2 = applyAction(res1.state, wallAction);
  assert.ok(res2.valid);
  assert.equal(res2.state.turn, 'blue');
  assert.equal(res2.state.players.crimson.wallsRemaining, 9);
  assert.equal(res2.state.players.blue.wallsRemaining, 10);
});

test('Wall placement rejected when player has 0 walls remaining', () => {
  let state = createInitialGameState();
  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, wallsRemaining: 0 },
    },
    turn: 'blue',
  };

  const wallAction: GameAction = {
    type: 'wall',
    player: 'blue',
    wall: { id: 'w_empty', row: 3, col: 3, orientation: 'H', placedBy: 'blue' },
    timestamp: Date.now(),
  };

  const res = applyAction(state, wallAction);
  assert.equal(res.valid, false);
  assert.match(res.reason!, /exhausted/i);
});

test('Wall action rejected if wall.placedBy does not match active player', () => {
  const state = createInitialGameState();
  const wallAction: GameAction = {
    type: 'wall',
    player: 'blue',
    wall: { id: 'w_cheat', row: 3, col: 3, orientation: 'H', placedBy: 'crimson' },
    timestamp: Date.now(),
  };

  const res = applyAction(state, wallAction);
  assert.equal(res.valid, false);
  assert.match(res.reason!, /placedBy does not match/i);
});

// ==========================================
// 7. VICTORY CONDITIONS & FORFEIT
// ==========================================
test('Blue wins upon reaching row 8, ending match and locking further moves', () => {
  let state = createInitialGameState();
  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 7, col: 4 } },
      crimson: { ...state.players.crimson, position: { row: 8, col: 0 } },
    },
    turn: 'blue',
  };

  const winMove: GameAction = {
    type: 'move',
    player: 'blue',
    to: { row: 8, col: 4 },
    timestamp: Date.now(),
  };

  const res = applyAction(state, winMove);
  assert.ok(res.valid);
  assert.equal(res.state.winner, 'blue');
  assert.equal(res.state.status, 'completed');
  assert.equal(res.state.winnerReason, 'goal_reached');
  assert.ok(res.state.completedAt);

  // Subsequent actions on completed match must be rejected
  const afterMove: GameAction = {
    type: 'move',
    player: 'crimson',
    to: { row: 7, col: 4 },
    timestamp: Date.now(),
  };
  const afterRes = applyAction(res.state, afterMove);
  assert.equal(afterRes.valid, false);
  assert.match(afterRes.reason!, /already concluded/i);
});

test('Crimson wins upon reaching row 0', () => {
  let state = createInitialGameState();
  state = {
    ...state,
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 0, col: 0 } },
      crimson: { ...state.players.crimson, position: { row: 1, col: 4 } },
    },
    turn: 'crimson',
  };

  const winMove: GameAction = {
    type: 'move',
    player: 'crimson',
    to: { row: 0, col: 4 },
    timestamp: Date.now(),
  };

  const res = applyAction(state, winMove);
  assert.ok(res.valid);
  assert.equal(res.state.winner, 'crimson');
  assert.equal(res.state.status, 'completed');
  assert.equal(res.state.winnerReason, 'goal_reached');
});

test('Surrender awards victory to opponent at any time during active match', () => {
  const state = createInitialGameState();
  assert.equal(state.turn, 'blue');

  // Crimson surrenders even though it is Blue's turn
  const surrenderAction: GameAction = {
    type: 'give_up',
    player: 'crimson',
    timestamp: Date.now(),
  };

  const res = applyAction(state, surrenderAction);
  assert.ok(res.valid);
  assert.equal(res.state.winner, 'blue');
  assert.equal(res.state.status, 'completed');
  assert.equal(res.state.winnerReason, 'opponent_surrendered');
});

test('applyAction rejects moves when game state is in waiting status', () => {
  let state = createInitialGameState();
  state = { ...state, status: 'waiting' };

  const action: GameAction = {
    type: 'move',
    player: 'blue',
    to: { row: 1, col: 4 },
    timestamp: Date.now(),
  };

  const res = applyAction(state, action);
  assert.equal(res.valid, false);
  assert.match(res.reason!, /waiting for both players/i);
});
