import { GameAction, PlayerId, RoomState } from './types';

export interface RoomConnection {
  room: RoomState;
  playerRole: PlayerId;
  playerToken: string;
}

export interface MatchmakingResult {
  matched: boolean;
  connection: RoomConnection;
}

export class OnlineClient {
  private eventSource: EventSource | null = null;
  private pollInterval: number | null = null;
  private onRoomUpdateCallback: ((room: RoomState) => void) | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;
  private roomId: string | null = null;

  public async findRandomMatch(playerName?: string): Promise<MatchmakingResult> {
    const res = await fetch('/api/matchmaking/random', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Matchmaking failed' }));
      throw new Error(err.error || 'Matchmaking failed');
    }

    const data = await res.json();
    return {
      matched: data.matched,
      connection: {
        room: data.room,
        playerRole: data.playerRole,
        playerToken: data.playerToken,
      },
    };
  }

  public async cancelMatchmaking(roomId: string, token: string): Promise<void> {
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
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create room' }));
      throw new Error(err.error || 'Failed to create room');
    }

    const data = await res.json();
    return {
      room: data.room,
      playerRole: data.playerRole,
      playerToken: data.playerToken,
    };
  }

  public async joinRoom(roomCode: string, token?: string, playerName?: string): Promise<RoomConnection> {
    const id = roomCode.trim().toLowerCase();
    const res = await fetch(`/api/rooms/${id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, playerName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to join room' }));
      throw new Error(err.error || 'Failed to join room');
    }

    const data = await res.json();
    return {
      room: data.room,
      playerRole: data.playerRole,
      playerToken: data.playerToken,
    };
  }

  public async fetchRoomState(roomId: string): Promise<RoomState> {
    const res = await fetch(`/api/rooms/${roomId.toLowerCase()}`);
    if (!res.ok) {
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
    const res = await fetch(`/api/rooms/${roomId.toLowerCase()}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Action failed' }));
      throw new Error(err.error || 'Action failed');
    }
  }

  public async requestRematch(roomId: string, token: string): Promise<void> {
    const res = await fetch(`/api/rooms/${roomId.toLowerCase()}/rematch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Rematch request failed' }));
      throw new Error(err.error || 'Rematch request failed');
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
        // Fallback to active polling if SSE disconnects
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
    this.onRoomUpdateCallback = null;
    this.onErrorCallback = null;
    this.roomId = null;
  }
}

export const onlineClient = new OnlineClient();
