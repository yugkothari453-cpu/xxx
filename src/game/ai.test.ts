import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState, applyAction } from './rules';
import { calculateAiAction } from './ai';

test('AI generates valid legal action on initial turn', () => {
  const state = createInitialGameState();
  // Set Crimson turn
  const testState = { ...state, turn: 'crimson' as const };

  const action = calculateAiAction(testState, 'normal');
  assert.equal(action.player, 'crimson');

  // Verify that the action is accepted by the rules engine
  const res = applyAction(testState, action);
  assert.ok(res.valid, `AI generated action must be valid, but got: ${res.reason}`);
});

test('Hard AI chooses shortest forward route towards goal when no walls are in place', () => {
  const state = createInitialGameState();
  const testState = { ...state, turn: 'crimson' as const };

  const action = calculateAiAction(testState, 'hard');
  assert.equal(action.type, 'move');
  if (action.type === 'move') {
    // Crimson should step towards row 0 (from row 8 to row 7)
    assert.equal(action.to.row, 7);
    assert.equal(action.to.col, 4);
  }
});

test('AI never attempts to place an illegal or trapping wall', () => {
  let state = createInitialGameState();
  state = {
    ...state,
    turn: 'crimson',
    players: {
      ...state.players,
      blue: { ...state.players.blue, position: { row: 6, col: 4 } },
      crimson: { ...state.players.crimson, position: { row: 3, col: 4 } },
    },
  };

  for (let i = 0; i < 5; i++) {
    const action = calculateAiAction(state, 'hard');
    const res = applyAction(state, action);
    assert.ok(res.valid, `AI action #${i} must be valid`);
  }
});
