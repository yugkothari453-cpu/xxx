import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runMultiplayerTest() {
  console.log('--- STARTING REAL MULTIPLAYER INTEGRATION TEST ---');

  // 1. Blue creates room
  console.log('1. Creating room for Player 1 (Blue Kingdom)...');
  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'Blue King' }),
  });
  assert.strictEqual(createRes.status, 200, 'Room creation failed');
  const createData = await createRes.json();
  const roomId = createData.room.id;
  const roomCode = createData.room.code;
  const blueToken = createData.playerToken;

  assert.ok(roomId, 'roomId should be defined');
  assert.strictEqual(createData.room.gameState.status, 'waiting', 'New room should have status waiting');
  assert.strictEqual(createData.playerRole, 'blue');
  assert.strictEqual(createData.room.players.blue.name, 'Blue King');
  assert.strictEqual(createData.room.players.crimson, null);
  console.log(`✓ Room created successfully: ID=${roomId}, Code=${roomCode}`);

  // 2. Connect Blue to SSE stream
  console.log('2. Connecting Player 1 (Blue) to SSE stream...');
  const blueEvents: any[] = [];
  const blueAbortController = new AbortController();
  const blueStreamPromise = (async () => {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/events?token=${blueToken}`, {
      signal: blueAbortController.signal,
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const block of lines) {
        if (block.startsWith('data: ')) {
          try {
            const data = JSON.parse(block.replace('data: ', '').trim());
            blueEvents.push(data);
          } catch {}
        }
      }
    }
  })().catch(() => {});

  // Wait brief moment for initial SSE event
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(blueEvents.length >= 1, 'Blue should receive initial room state via SSE');
  console.log('✓ Player 1 connected to SSE stream');

  // 3. Player 2 (Crimson) joins room
  console.log('3. Player 2 (Crimson Knight) joining room...');
  const joinRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'Crimson Knight' }),
  });
  assert.strictEqual(joinRes.status, 200, 'Player 2 join failed');
  const joinData = await joinRes.json();
  const crimsonToken = joinData.playerToken;
  assert.strictEqual(joinData.playerRole, 'crimson');
  assert.strictEqual(joinData.room.players.crimson.name, 'Crimson Knight');
  assert.strictEqual(joinData.room.gameState.status, 'in_progress', 'Room status should be in_progress after join');
  console.log('✓ Player 2 joined successfully');

  // 4. Connect Crimson to SSE stream
  console.log('4. Connecting Player 2 (Crimson) to SSE stream...');
  const crimsonEvents: any[] = [];
  const crimsonAbortController = new AbortController();
  const crimsonStreamPromise = (async () => {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/events?token=${crimsonToken}`, {
      signal: crimsonAbortController.signal,
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const block of lines) {
        if (block.startsWith('data: ')) {
          try {
            const data = JSON.parse(block.replace('data: ', '').trim());
            crimsonEvents.push(data);
          } catch {}
        }
      }
    }
  })().catch(() => {});

  await new Promise((r) => setTimeout(r, 200));
  assert.ok(crimsonEvents.length >= 1, 'Crimson should receive initial room state via SSE');
  console.log('✓ Player 2 connected to SSE stream');

  // 5. Test turn validation: Crimson attempts move on Blue turn
  console.log('5. Testing turn validation: Crimson attempts illegal out-of-turn move...');
  const outOfTurnRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: crimsonToken,
      action: {
        type: 'move',
        player: 'crimson',
        to: { row: 7, col: 4 },
        timestamp: Date.now(),
      },
    }),
  });
  assert.strictEqual(outOfTurnRes.status, 400, 'Server must reject out-of-turn move');
  const outOfTurnData = await outOfTurnRes.json();
  assert.strictEqual(outOfTurnData.error, 'Not your turn.');
  console.log('✓ Server correctly rejected out-of-turn move: "Not your turn."');

  // 6. Test credential validation: Impersonating role with wrong token
  console.log('6. Testing credential validation: Crimson attempts to send action as Blue...');
  const forgedRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: crimsonToken,
      action: {
        type: 'move',
        player: 'blue',
        to: { row: 1, col: 4 },
        timestamp: Date.now(),
      },
    }),
  });
  assert.strictEqual(forgedRes.status, 403, 'Server must reject forged credentials');
  console.log('✓ Server correctly rejected forged action with HTTP 403');

  // 7. Legal Blue Pawn move
  console.log('7. Blue executes legal pawn move (0, 4) -> (1, 4)...');
  const blueMoveRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: blueToken,
      action: {
        type: 'move',
        player: 'blue',
        to: { row: 1, col: 4 },
        timestamp: Date.now(),
      },
    }),
  });
  assert.strictEqual(blueMoveRes.status, 200, 'Blue move should succeed');
  const blueMoveData = await blueMoveRes.json();
  assert.deepStrictEqual(blueMoveData.gameState.players.blue.position, { row: 1, col: 4 });
  assert.strictEqual(blueMoveData.gameState.turn, 'crimson', 'Turn should switch to crimson');
  console.log('✓ Blue move accepted; turn switched to Crimson');

  // 8. Verify real-time board synchronization via SSE for both sessions
  await new Promise((r) => setTimeout(r, 200));
  const latestCrimsonEvent = crimsonEvents[crimsonEvents.length - 1];
  assert.strictEqual(latestCrimsonEvent.room.gameState.turn, 'crimson');
  assert.deepStrictEqual(latestCrimsonEvent.room.gameState.players.blue.position, { row: 1, col: 4 });
  console.log('✓ Real-time board sync: Crimson session received Blue pawn move instantly via SSE');

  // 9. Crimson places wall
  console.log('9. Crimson places horizontal wall at (3, 3)...');
  const crimsonWallRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: crimsonToken,
      action: {
        type: 'wall',
        player: 'crimson',
        wall: {
          id: 'test_wall_1',
          row: 3,
          col: 3,
          orientation: 'H',
          placedBy: 'crimson',
        },
        timestamp: Date.now(),
      },
    }),
  });
  assert.strictEqual(crimsonWallRes.status, 200, 'Crimson wall placement should succeed');
  const crimsonWallData = await crimsonWallRes.json();
  assert.strictEqual(crimsonWallData.gameState.walls.length, 1);
  assert.strictEqual(crimsonWallData.gameState.players.crimson.wallsRemaining, 9);
  assert.strictEqual(crimsonWallData.gameState.turn, 'blue');
  console.log('✓ Crimson wall placed; remaining ramparts decremented to 9; turn switched to Blue');

  // 10. Verify Blue sees the wall placement via SSE
  await new Promise((r) => setTimeout(r, 200));
  const latestBlueEvent = blueEvents[blueEvents.length - 1];
  assert.strictEqual(latestBlueEvent.room.gameState.walls.length, 1);
  assert.strictEqual(latestBlueEvent.room.gameState.turn, 'blue');
  console.log('✓ Real-time board sync: Blue session received Crimson wall placement via SSE');

  // 11. Overlapping wall rejection
  console.log('11. Testing overlapping wall placement rejection...');
  const overlapRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: blueToken,
      action: {
        type: 'wall',
        player: 'blue',
        wall: {
          id: 'overlap_wall',
          row: 3,
          col: 3,
          orientation: 'H',
          placedBy: 'blue',
        },
        timestamp: Date.now(),
      },
    }),
  });
  assert.strictEqual(overlapRes.status, 400, 'Overlapping wall must be rejected');
  const overlapData = await overlapRes.json();
  assert.ok(overlapData.error.includes('overlapping or crossing'), 'Rejection error message should mention collision');
  console.log(`✓ Server correctly rejected overlapping wall: "${overlapData.error}"`);

  // 12. Disconnect handling
  console.log('12. Testing disconnect handling: Crimson disconnects...');
  const leaveRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: crimsonToken }),
  });
  assert.strictEqual(leaveRes.status, 200);

  // Blue should receive SSE update with crimson.connected === false
  await new Promise((r) => setTimeout(r, 200));
  const disconnectEvent = blueEvents[blueEvents.length - 1];
  assert.strictEqual(disconnectEvent.room.players.crimson.connected, false, 'Opponent should show connected: false');
  console.log('✓ Blue session informed of Crimson disconnection via SSE');

  // Crimson reconnects with existing token
  console.log('13. Crimson reconnects with existing token...');
  const reconnectRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: crimsonToken }),
  });
  assert.strictEqual(reconnectRes.status, 200);
  const reconnectData = await reconnectRes.json();
  assert.strictEqual(reconnectData.room.players.crimson.connected, true);

  await new Promise((r) => setTimeout(r, 200));
  const reconnectEvent = blueEvents[blueEvents.length - 1];
  assert.strictEqual(reconnectEvent.room.players.crimson.connected, true, 'Opponent should show connected: true after reconnect');
  console.log('✓ Crimson reconnected; Blue session notified via SSE');

  // 14. Match end synchronization via surrender
  console.log('14. Testing match-end synchronization: Crimson surrenders...');
  const surrenderRes = await fetch(`${BASE_URL}/api/rooms/${roomId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: crimsonToken,
      action: {
        type: 'give_up',
        player: 'crimson',
        timestamp: Date.now(),
      },
    }),
  });
  assert.strictEqual(surrenderRes.status, 200);
  const surrenderData = await surrenderRes.json();
  assert.strictEqual(surrenderData.gameState.winner, 'blue');
  assert.strictEqual(surrenderData.gameState.winnerReason, 'opponent_surrendered');
  assert.strictEqual(surrenderData.gameState.status, 'completed');

  await new Promise((r) => setTimeout(r, 200));
  const matchEndBlueEvent = blueEvents[blueEvents.length - 1];
  assert.strictEqual(matchEndBlueEvent.room.gameState.winner, 'blue');
  assert.strictEqual(matchEndBlueEvent.room.gameState.status, 'completed');
  console.log('✓ Match-end synchronized across sessions via SSE: Winner is Blue');

  // 15. Rematch synchronization
  console.log('15. Testing Rematch synchronization...');
  // Blue requests rematch
  const rematchReq1 = await fetch(`${BASE_URL}/api/rooms/${roomId}/rematch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: blueToken }),
  });
  assert.strictEqual(rematchReq1.status, 200);
  const rematchData1 = await rematchReq1.json();
  assert.strictEqual(rematchData1.room.rematchRequestedBy, 'blue');

  await new Promise((r) => setTimeout(r, 200));
  assert.strictEqual(crimsonEvents[crimsonEvents.length - 1].room.rematchRequestedBy, 'blue');
  console.log('✓ Rematch requested by Blue; Crimson session notified');

  // Crimson accepts rematch
  const rematchReq2 = await fetch(`${BASE_URL}/api/rooms/${roomId}/rematch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: crimsonToken }),
  });
  assert.strictEqual(rematchReq2.status, 200);
  const rematchData2 = await rematchReq2.json();
  assert.strictEqual(rematchData2.room.gameState.winner, null);
  assert.strictEqual(rematchData2.room.gameState.walls.length, 0);
  assert.strictEqual(rematchData2.room.gameState.players.blue.wallsRemaining, 10);
  assert.strictEqual(rematchData2.room.gameState.players.crimson.wallsRemaining, 10);
  assert.strictEqual(rematchData2.room.gameState.players.blue.name, 'Blue King');
  assert.strictEqual(rematchData2.room.gameState.players.crimson.name, 'Crimson Knight');
  assert.strictEqual(rematchData2.room.rematchRequestedBy, null);
  console.log('✓ Both players accepted rematch; new game state reset and synchronized!');

  // Cleanup SSE streams
  blueAbortController.abort();
  crimsonAbortController.abort();

  console.log('--- ALL MULTIPLAYER VERIFICATION CHECKS PASSED (15/15) ---');
}

runMultiplayerTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
