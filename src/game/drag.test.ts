import { test } from 'node:test';
import assert from 'node:assert';
import { createInitialGameState, validateWallPlacement } from './rules';
import { Wall } from './types';

// Standalone verification of the grid projection and snap mathematics used in useWallDrag
function snapSvgCoordinatesToGrid(svgX: number, svgY: number, chosenOrientation: 'H' | 'V' | 'AUTO') {
  let resolvedOrientation: 'H' | 'V' = 'H';
  if (chosenOrientation === 'H') {
    resolvedOrientation = 'H';
  } else if (chosenOrientation === 'V') {
    resolvedOrientation = 'V';
  } else {
    const nearestHCorridorY = 60 + Math.round((svgY - 60) / 60) * 60;
    const nearestVCorridorX = 60 + Math.round((svgX - 60) / 60) * 60;
    const distToH = Math.abs(svgY - nearestHCorridorY);
    const distToV = Math.abs(svgX - nearestVCorridorX);
    resolvedOrientation = distToH <= distToV ? 'H' : 'V';
  }

  const row = Math.max(0, Math.min(7, Math.round((svgY - 60) / 60)));
  const col = Math.max(0, Math.min(7, Math.round((svgX - 60) / 60)));

  return { row, col, orientation: resolvedOrientation };
}

test('Drag Snap: Horizontal corridor snapping', () => {
  // Center of horizontal corridor 0 (between row 0 and 1) is Y=60.
  // Col 4 center is X = 60 + 4 * 60 = 300.
  const snap = snapSvgCoordinatesToGrid(305, 58, 'H');
  assert.strictEqual(snap.row, 0);
  assert.strictEqual(snap.col, 4);
  assert.strictEqual(snap.orientation, 'H');
});

test('Drag Snap: Vertical corridor snapping', () => {
  // Center of vertical corridor 3 is X=60 + 3*60 = 240.
  // Row 2 center is Y = 60 + 2 * 60 = 180.
  const snap = snapSvgCoordinatesToGrid(242, 178, 'V');
  assert.strictEqual(snap.row, 2);
  assert.strictEqual(snap.col, 3);
  assert.strictEqual(snap.orientation, 'V');
});

test('Drag Snap: Boundary clamping', () => {
  // Dragged far off-grid
  const snapMin = snapSvgCoordinatesToGrid(-100, -100, 'H');
  assert.strictEqual(snapMin.row, 0);
  assert.strictEqual(snapMin.col, 0);

  const snapMax = snapSvgCoordinatesToGrid(1000, 1000, 'V');
  assert.strictEqual(snapMax.row, 7);
  assert.strictEqual(snapMax.col, 7);
});

test('Drag Snap: Auto-orientation detects nearest corridor', () => {
  // Near a horizontal corridor (Y = 60), but far from vertical corridors
  const snapH = snapSvgCoordinatesToGrid(150, 62, 'AUTO');
  assert.strictEqual(snapH.orientation, 'H');

  // Near a vertical corridor (X = 60), but far from horizontal corridors
  const snapV = snapSvgCoordinatesToGrid(61, 150, 'AUTO');
  assert.strictEqual(snapV.orientation, 'V');
});

test('Drag Snap: Legal and illegal placement validation', () => {
  const state = createInitialGameState();

  const legalWall: Wall = {
    id: 'test_1',
    row: 0,
    col: 0,
    orientation: 'H',
    placedBy: 'blue',
  };
  const valLegal = validateWallPlacement(legalWall, state);
  assert.strictEqual(valLegal.valid, true);

  // Placed wall collision
  state.walls.push(legalWall);
  const collidingWall: Wall = {
    id: 'test_2',
    row: 0,
    col: 0,
    orientation: 'H',
    placedBy: 'crimson',
  };
  const valCol = validateWallPlacement(collidingWall, state);
  assert.strictEqual(valCol.valid, false);
});
