export type PlayerId = 'blue' | 'crimson';

export type WallOrientation = 'H' | 'V';

export interface CellPosition {
  row: number;
  col: number;
}

export interface Wall {
  id: string;
  row: number; // 0 to 7
  col: number; // 0 to 7
  orientation: WallOrientation;
  placedBy: PlayerId;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: CellPosition;
  wallsRemaining: number;
  goalRow: number;
}

export interface GameActionMove {
  type: 'move';
  player: PlayerId;
  to: CellPosition;
  timestamp: number;
}

export interface GameActionWall {
  type: 'wall';
  player: PlayerId;
  wall: Wall;
  timestamp: number;
}

export interface GameActionGiveUp {
  type: 'give_up';
  player: PlayerId;
  timestamp: number;
}

export type GameAction = GameActionMove | GameActionWall | GameActionGiveUp;

export interface GameState {
  boardSize: number; // 9
  players: {
    blue: PlayerState;
    crimson: PlayerState;
  };
  turn: PlayerId;
  walls: Wall[];
  winner: PlayerId | null;
  winnerReason?: 'goal_reached' | 'opponent_surrendered';
  moveHistory: GameAction[];
  status: 'waiting' | 'in_progress' | 'completed';
  startedAt: number;
  completedAt?: number;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export type GameMode = 'ai' | 'local' | 'online';

export interface RoomState {
  id: string;
  code: string;
  createdAt: number;
  lastActiveAt: number;
  players: {
    blue: { connected: boolean; name: string; token: string };
    crimson: { connected: boolean; name: string; token: string } | null;
  };
  gameState: GameState;
  rematchRequestedBy?: PlayerId | null;
  isRandomMatch?: boolean;
}
