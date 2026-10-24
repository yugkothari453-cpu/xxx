import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { applyAction, createInitialGameState } from './src/game/rules.js';
import { GameAction, PlayerId, RoomState } from './src/game/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory room store & matchmaking queue
const rooms = new Map<string, RoomState>();
const sseClients = new Map<string, Set<Response>>();
const randomMatchmakingQueue: string[] = [];

function cleanMatchmakingQueue() {
  const now = Date.now();
  for (let i = randomMatchmakingQueue.length - 1; i >= 0; i--) {
    const id = randomMatchmakingQueue[i];
    const room = rooms.get(id);
    if (!room || room.players.crimson || !room.players.blue.connected || now - room.createdAt > 120000) {
      randomMatchmakingQueue.splice(i, 1);
    }
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function broadcastRoom(roomId: string) {
  const room = rooms.get(roomId);
  const clients = sseClients.get(roomId);
  if (!room || !clients || clients.size === 0) return;

  const data = JSON.stringify({
    type: 'ROOM_UPDATE',
    room: sanitizeRoomForClient(room),
  });

  clients.forEach((client) => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      // client connection dead
    }
  });
}

function sanitizeRoomForClient(room: RoomState) {
  return {
    id: room.id,
    code: room.code,
    createdAt: room.createdAt,
    lastActiveAt: room.lastActiveAt,
    isRandomMatch: room.isRandomMatch,
    players: {
      blue: {
        connected: room.players.blue.connected,
        name: room.players.blue.name,
      },
      crimson: room.players.crimson
        ? {
            connected: room.players.crimson.connected,
            name: room.players.crimson.name,
          }
        : null,
    },
    gameState: room.gameState,
    rematchRequestedBy: room.rematchRequestedBy,
  };
}

// REST Endpoints
app.post('/api/matchmaking/random', (req: Request, res: Response) => {
  cleanMatchmakingQueue();
  const playerName = req.body?.playerName?.trim() || 'Royal Challenger';

  // Look for an available room waiting in queue
  while (randomMatchmakingQueue.length > 0) {
    const candidateId = randomMatchmakingQueue.shift()!;
    const room = rooms.get(candidateId);
    if (room && !room.players.crimson && room.players.blue.connected) {
      // Match found! Join as Crimson
      const crimsonToken = generateToken();
      room.players.crimson = {
        connected: true,
        name: playerName,
        token: crimsonToken,
      };
      room.gameState.status = 'in_progress';
      room.lastActiveAt = Date.now();
      broadcastRoom(room.id);

      res.json({
        matched: true,
        room: sanitizeRoomForClient(room),
        playerRole: 'crimson' as PlayerId,
        playerToken: crimsonToken,
      });
      return;
    }
  }

  // No room waiting -> create a new chamber as Blue and enter the queue
  const code = generateRoomCode();
  const roomId = code.toLowerCase();
  const blueToken = generateToken();

  const newRoom: RoomState = {
    id: roomId,
    code,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    isRandomMatch: true,
    players: {
      blue: { connected: true, name: playerName, token: blueToken },
      crimson: null,
    },
    gameState: {
      ...createInitialGameState(),
      status: 'waiting',
    },
  };

  rooms.set(roomId, newRoom);
  randomMatchmakingQueue.push(roomId);

  res.json({
    matched: false,
    room: sanitizeRoomForClient(newRoom),
    playerRole: 'blue' as PlayerId,
    playerToken: blueToken,
  });
});

app.post('/api/matchmaking/cancel', (req: Request, res: Response) => {
  const { roomId, token } = req.body || {};
  if (roomId) {
    const id = roomId.toLowerCase();
    const idx = randomMatchmakingQueue.indexOf(id);
    if (idx !== -1) {
      randomMatchmakingQueue.splice(idx, 1);
    }
    const room = rooms.get(id);
    if (room && room.players.blue.token === token && !room.players.crimson) {
      rooms.delete(id);
    }
  }
  res.json({ success: true });
});

app.post('/api/rooms', (req: Request, res: Response) => {
  const code = generateRoomCode();
  const roomId = code.toLowerCase();
  const blueToken = generateToken();

  const newRoom: RoomState = {
    id: roomId,
    code,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    isRandomMatch: false,
    players: {
      blue: { connected: true, name: req.body?.playerName || 'Blue Kingdom', token: blueToken },
      crimson: null,
    },
    gameState: {
      ...createInitialGameState(),
      status: 'waiting',
    },
  };

  rooms.set(roomId, newRoom);

  res.json({
    room: sanitizeRoomForClient(newRoom),
    playerToken: blueToken,
    playerRole: 'blue' as PlayerId,
  });
});

app.post('/api/rooms/:id/join', (req: Request, res: Response) => {
  const roomId = req.params.id.toLowerCase();
  const room = rooms.get(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found. Check the room code.' });
    return;
  }

  const { token, playerName } = req.body || {};

  // Re-joining with existing token
  if (token && room.players.blue.token === token) {
    room.players.blue.connected = true;
    room.lastActiveAt = Date.now();
    broadcastRoom(roomId);
    res.json({
      room: sanitizeRoomForClient(room),
      playerToken: token,
      playerRole: 'blue' as PlayerId,
    });
    return;
  }

  if (token && room.players.crimson && room.players.crimson.token === token) {
    room.players.crimson.connected = true;
    room.lastActiveAt = Date.now();
    broadcastRoom(roomId);
    res.json({
      room: sanitizeRoomForClient(room),
      playerToken: token,
      playerRole: 'crimson' as PlayerId,
    });
    return;
  }

  if (room.players.crimson && room.players.crimson.connected) {
    res.status(400).json({ error: 'Room already has two active commanders.' });
    return;
  }

  const crimsonToken = generateToken();
  room.players.crimson = {
    connected: true,
    name: playerName || 'Crimson Kingdom',
    token: crimsonToken,
  };
  if (room.gameState.status === 'waiting') {
    room.gameState.status = 'in_progress';
  }
  room.lastActiveAt = Date.now();

  broadcastRoom(roomId);

  res.json({
    room: sanitizeRoomForClient(room),
    playerToken: crimsonToken,
    playerRole: 'crimson' as PlayerId,
  });
});

app.get('/api/rooms/:id', (req: Request, res: Response) => {
  const roomId = req.params.id.toLowerCase();
  const room = rooms.get(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  res.json({
    room: sanitizeRoomForClient(room),
  });
});

app.get('/api/rooms/:id/events', (req: Request, res: Response) => {
  const roomId = req.params.id.toLowerCase();
  const room = rooms.get(roomId);

  if (!room) {
    res.status(404).end('Room not found');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(roomId)) {
    sseClients.set(roomId, new Set());
  }
  const clientSet = sseClients.get(roomId)!;
  clientSet.add(res);

  // Send current state immediately
  res.write(`data: ${JSON.stringify({ type: 'ROOM_UPDATE', room: sanitizeRoomForClient(room) })}\n\n`);

  // Heartbeat ping every 15s to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clientSet.delete(res);
  });
});

app.post('/api/rooms/:id/action', (req: Request, res: Response) => {
  const roomId = req.params.id.toLowerCase();
  const room = rooms.get(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const { token, action } = req.body as { token: string; action: GameAction };
  if (!token || !action) {
    res.status(400).json({ error: 'Missing token or action payload.' });
    return;
  }

  // Validate token identity
  let role: PlayerId | null = null;
  if (room.players.blue.token === token) role = 'blue';
  else if (room.players.crimson?.token === token) role = 'crimson';

  if (!role || action.player !== role) {
    res.status(403).json({ error: 'Forbidden: action player does not match credentials.' });
    return;
  }

  const result = applyAction(room.gameState, action);
  if (!result.valid) {
    res.status(400).json({ error: result.reason || 'Illegal action.' });
    return;
  }

  room.gameState = result.state;
  room.lastActiveAt = Date.now();

  broadcastRoom(roomId);

  res.json({
    success: true,
    gameState: room.gameState,
  });
});

app.post('/api/rooms/:id/rematch', (req: Request, res: Response) => {
  const roomId = req.params.id.toLowerCase();
  const room = rooms.get(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const { token } = req.body as { token: string };
  let role: PlayerId | null = null;
  if (room.players.blue.token === token) role = 'blue';
  else if (room.players.crimson?.token === token) role = 'crimson';

  if (!role) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }

  if (!room.rematchRequestedBy) {
    room.rematchRequestedBy = role;
  } else if (room.rematchRequestedBy !== role) {
    // Both agreed -> reset game state!
    room.gameState = createInitialGameState();
    room.rematchRequestedBy = null;
  }

  room.lastActiveAt = Date.now();
  broadcastRoom(roomId);

  res.json({
    success: true,
    room: sanitizeRoomForClient(room),
  });
});

// Vite Dev Server or Production Static Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Royal Gambit server listening on port ${PORT}`);
  });
}

startServer();
