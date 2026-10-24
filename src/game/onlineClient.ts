import { GameAction, PlayerId, RoomState } from './types';
import { applyAction, createInitialGameState } from './rules';

export interface RoomConnection {
  room: RoomState;
  playerRole: PlayerId;
  playerToken: string;
}

export interface MatchmakingResult {
  matched: boolean;
  connection: RoomConnection;
}

// Client-Side Cross-Tab Sync Engine for static Netlify deploys or when server is unreachable
class ClientSyncEngine {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(room: RoomState) => void>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('royal_gambit_net');
        this.channel.onmessage = (event) => {
          const { type, room } = event.data || {};
          if (type === 'ROOM_UPDATE' && room) {
            this.notify(room);
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('rg_room_') && e.newValue) {
          try {
            const room: RoomState = JSON.parse(e.newValue);
            this.notify(room);
          } catch {
            // ignore
          }
        }
      });
    }
  }

  private getStorageKey(id: string): string {
    return `rg_room_${id.toLowerCase()}`;
  }

  public getRoom(id: string): RoomState | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(id));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public saveRoom(room: RoomState): void {
    try {
      localStorage.setItem(this.getStorageKey(room.id), JSON.stringify(room));
      this.channel?.postMessage({ type: 'ROOM_UPDATE', room });
      this.notify(room);
    } catch {
      // ignore
    }
  }

  public removeRoom(id: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(id));
    } catch {
      // ignore
    }
  }

  public subscribe(roomId: string, cb: (room: RoomState) => void): () => void {
    const id = roomId.toLowerCase();
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(cb);
    return () => {
      this.listeners.get(id)?.delete(cb);
    };
  }

  private notify(room: RoomState): void {
    const set = this.listeners.get(room.id.toLowerCase());
    if (set) {
      set.forEach((cb) => {
        try {
          cb(room);
        } catch {
          // ignore
        }
      });
    }
  }

  public findRandomMatch(playerName?: string): MatchmakingResult {
    const now = Date.now();
    let waitingRoomId: string | null = null;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rg_room_')) {
          const room = this.getRoom(key.replace('rg_room_', ''));
          if (
            room &&
            room.isRandomMatch &&
            room.gameState.status === 'waiting' &&
            !room.players.crimson &&
            now - room.createdAt < 120000
          ) {
            waitingRoomId = room.id;
            break;
          }
        }
      }
    } catch {
      // ignore
    }

    if (waitingRoomId) {
      const room = this.getRoom(waitingRoomId);
      if (room && !room.players.crimson) {
        const crimsonToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        room.players.crimson = {
          connected: true,
          name: playerName || 'Suryavanshi Empire',
          token: crimsonToken,
        };
        room.gameState.status = 'in_progress';
        room.lastActiveAt = Date.now();
        this.saveRoom(room);

        return {
          matched: true,
          connection: {
            room,
            playerRole: 'crimson',
            playerToken: crimsonToken,
          },
        };
      }
    }

    // Create waiting room
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const roomId = code.toLowerCase();
    const blueToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const newRoom: RoomState = {
      id: roomId,
      code,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      isRandomMatch: true,
      players: {
        blue: { connected: true, name: playerName || 'Mayura Dynasty', token: blueToken },
        crimson: null,
      },
      gameState: {
        ...createInitialGameState(),
        status: 'waiting',
      },
    };

    this.saveRoom(newRoom);

    return {
      matched: false,
      connection: {
        room: newRoom,
        playerRole: 'blue',
        playerToken: blueToken,
      },
    };
  }

  public createRoom(playerName?: string): RoomConnection {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const roomId = code.toLowerCase();
    const blueToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const newRoom: RoomState = {
      id: roomId,
      code,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      isRandomMatch: false,
      players: {
        blue: { connected: true, name: playerName || 'Mayura Dynasty', token: blueToken },
        crimson: null,
      },
      gameState: {
        ...createInitialGameState(),
        status: 'waiting',
      },
    };

    this.saveRoom(newRoom);

    return {
      room: newRoom,
      playerRole: 'blue',
      playerToken: blueToken,
    };
  }

  public joinRoom(roomCode: string, token?: string, playerName?: string): RoomConnection {
    const id = roomCode.trim().toLowerCase();
    const room = this.getRoom(id);
    if (!room) {
      throw new Error('Chamber not found. Please verify the room code.');
    }

    if (token && room.players.blue.token === token) {
      return { room, playerRole: 'blue', playerToken: token };
    }
    if (token && room.players.crimson?.token === token) {
      return { room, playerRole: 'crimson', playerToken: token };
    }

    if (room.players.crimson && room.players.crimson.connected) {
      throw new Error('Chamber already has two active commanders.');
    }

    const crimsonToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    room.players.crimson = {
      connected: true,
      name: playerName || 'Suryavanshi Empire',
      token: crimsonToken,
    };
    if (room.gameState.status === 'waiting') {
      room.gameState.status = 'in_progress';
    }
    room.lastActiveAt = Date.now();
    this.saveRoom(room);

    return {
      room,
      playerRole: 'crimson',
      playerToken: crimsonToken,
    };
  }
}

export class OnlineClient {
  private eventSource: EventSource | null = null;
  private pollInterval: number | null = null;
  private onRoomUpdateCallback: ((room: RoomState) => void) | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;
  private roomId: string | null = null;
  private fallbackSync = new ClientSyncEngine();
  private usingFallback = false;
  private fallbackUnsub: (() => void) | null = null;

  public async findRandomMatch(playerName?: string): Promise<MatchmakingResult> {
    try {
      const res = await fetch('/api/matchmaking/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });

      if (res.ok) {
        const data = await res.json();
        this.usingFallback = false;
        return {
          matched: data.matched,
          connection: {
            room: data.room,
            playerRole: data.playerRole,
            playerToken: data.playerToken,
          },
        };
      }
    } catch {
      // network/static fallback
    }

    // Seamless Fallback
    this.usingFallback = true;
    return this.fallbackSync.findRandomMatch(playerName);
  }

  public async cancelMatchmaking(roomId: string, token: string): Promise<void> {
    if (this.usingFallback) {
      const room = this.fallbackSync.getRoom(roomId);
      if (room && room.players.blue.token === token) {
        this.fallbackSync.removeRoom(roomId);
      }
      return;
    }

    try {
      await fetch('/api/matchmaking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, token }),
      });
    } catch {
      // ignore
    }
  }

  public async createRoom(playerName?: string): Promise<RoomConnection> {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });

      if (res.ok) {
        const data = await res.json();
        this.usingFallback = false;
        return {
          room: data.room,
          playerRole: data.playerRole,
          playerToken: data.playerToken,
        };
      }
    } catch {
      // network/static fallback
    }

    this.usingFallback = true;
    return this.fallbackSync.createRoom(playerName);
  }

  public async joinRoom(roomCode: string, token?: string, playerName?: string): Promise<RoomConnection> {
    try {
      const id = roomCode.trim().toLowerCase();
      const res = await fetch(`/api/rooms/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, playerName }),
      });

      if (res.ok) {
        const data = await res.json();
        this.usingFallback = false;
        return {
          room: data.room,
          playerRole: data.playerRole,
          playerToken: data.playerToken,
        };
      }
    } catch {
      // network/static fallback
    }

    this.usingFallback = true;
    return this.fallbackSync.joinRoom(roomCode, token, playerName);
  }

  public async fetchRoomState(roomId: string): Promise<RoomState> {
    if (this.usingFallback) {
      const room = this.fallbackSync.getRoom(roomId);
      if (!room) throw new Error('Room not found');
      return room;
    }

    const res = await fetch(`/api/rooms/${roomId.toLowerCase()}`);
    if (!res.ok) {
      const fallbackRoom = this.fallbackSync.getRoom(roomId);
      if (fallbackRoom) return fallbackRoom;
      throw new Error('Room not found');
    }
    const data = await res.json();
    return data.room;
  }

  public async sendAction(
    roomId: string,
    token: string,
    action: GameAction
  ): Promise<void> {
    if (this.usingFallback) {
      const room = this.fallbackSync.getRoom(roomId);
      if (!room) throw new Error('Chamber not found');

      const result = applyAction(room.gameState, action);
      if (!result.valid) {
        throw new Error(result.reason || 'Illegal action');
      }

      room.gameState = result.state;
      room.lastActiveAt = Date.now();
      this.fallbackSync.saveRoom(room);
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${roomId.toLowerCase()}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Action failed' }));
        throw new Error(err.error || 'Action failed');
      }
    } catch (e) {
      // If server unreachable, check fallback
      const room = this.fallbackSync.getRoom(roomId);
      if (room) {
        this.usingFallback = true;
        const result = applyAction(room.gameState, action);
        if (result.valid) {
          room.gameState = result.state;
          room.lastActiveAt = Date.now();
          this.fallbackSync.saveRoom(room);
          return;
        }
      }
      throw e;
    }
  }

  public async requestRematch(roomId: string, token: string): Promise<void> {
    if (this.usingFallback) {
      const room = this.fallbackSync.getRoom(roomId);
      if (!room) return;

      let role: PlayerId | null = null;
      if (room.players.blue.token === token) role = 'blue';
      else if (room.players.crimson?.token === token) role = 'crimson';

      if (!role) return;

      if (!room.rematchRequestedBy) {
        room.rematchRequestedBy = role;
      } else if (room.rematchRequestedBy !== role) {
        room.gameState = createInitialGameState();
        room.rematchRequestedBy = null;
      }

      room.lastActiveAt = Date.now();
      this.fallbackSync.saveRoom(room);
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${roomId.toLowerCase()}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Rematch request failed' }));
        throw new Error(err.error || 'Rematch request failed');
      }
    } catch {
      // ignore
    }
  }

  public subscribe(
    roomId: string,
    onUpdate: (room: RoomState) => void,
    onError?: (err: string) => void
  ): () => void {
    this.unsubscribe();
    this.roomId = roomId.toLowerCase();
    this.onRoomUpdateCallback = onUpdate;
    this.onErrorCallback = onError || null;

    // Listen to local cross-tab fallback updates in parallel
    this.fallbackUnsub = this.fallbackSync.subscribe(this.roomId, (updated) => {
      this.onRoomUpdateCallback?.(updated);
    });

    if (this.usingFallback) {
      const current = this.fallbackSync.getRoom(this.roomId);
      if (current) this.onRoomUpdateCallback?.(current);
      return () => this.unsubscribe();
    }

    try {
      this.eventSource = new EventSource(`/api/rooms/${this.roomId}/events`);

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ROOM_UPDATE' && payload.room) {
            this.onRoomUpdateCallback?.(payload.room);
          }
        } catch {
          // parse error
        }
      };

      this.eventSource.onerror = () => {
        // Fallback to active polling if SSE disconnects (e.g. serverless timeout)
        if (!this.pollInterval) {
          this.pollInterval = window.setInterval(async () => {
            if (!this.roomId) return;
            try {
              const fresh = await this.fetchRoomState(this.roomId);
              this.onRoomUpdateCallback?.(fresh);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Connection error';
              this.onErrorCallback?.(msg);
            }
          }, 1500);
        }
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to connect stream';
      this.onErrorCallback?.(msg);
    }

    return () => this.unsubscribe();
  }

  public unsubscribe(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.fallbackUnsub) {
      this.fallbackUnsub();
      this.fallbackUnsub = null;
    }
    this.onRoomUpdateCallback = null;
    this.onErrorCallback = null;
    this.roomId = null;
  }
}

export const onlineClient = new OnlineClient();
