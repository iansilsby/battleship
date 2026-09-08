const assert = require('node:assert/strict');
const test = require('node:test');
const {
  BOARD_SIZE,
  SHIPS,
  HIT,
  MISS,
  canPlace,
  cellLabel,
  createBoard,
  fireAt,
  isFleetDestroyed,
  placeFleetRandomly,
  placeShip,
  remainingShips,
} = require('../src/game.js');
const { createAI, lineEnds } = require('../src/ai.js');

test('placement rejects overlaps and ships hanging off the board', () => {
  const board = createBoard();
  assert.ok(placeShip(board, 'Destroyer', 0, 0, 2, true));
  assert.equal(canPlace(board, 0, 1, 2, true), false, 'overlap allowed');
  assert.equal(canPlace(board, 0, 9, 2, true), false, 'ran off the right edge');
  assert.equal(placeShip(board, 'Cruiser', 8, 4, 3, false), false, 'ran off the bottom edge');
  assert.equal(board.ships.length, 1);
});

test('placement accepts a legal fleet and marks every cell', () => {
  const board = createBoard();
  SHIPS.forEach((ship, index) => {
    assert.ok(placeShip(board, ship.name, index * 2, 0, ship.size, true));
  });
  const occupied = board.grid.flat().filter(Boolean).length;
  assert.equal(occupied, SHIPS.reduce((sum, ship) => sum + ship.size, 0));
});

test('random placement produces a legal, non-overlapping fleet', () => {
  for (let trial = 0; trial < 50; trial += 1) {
    const board = placeFleetRandomly(createBoard());
    assert.equal(board.ships.length, SHIPS.length);
    const occupied = board.grid.flat().filter(Boolean).length;
    assert.equal(occupied, SHIPS.reduce((sum, ship) => sum + ship.size, 0));
    board.ships.forEach((ship) => {
      ship.cells.forEach((cell) => {
        assert.ok(cell.row >= 0 && cell.row < BOARD_SIZE && cell.col >= 0 && cell.col < BOARD_SIZE);
      });
    });
  }
});

test('shots resolve as hit, miss, sunk, and repeats are rejected', () => {
  const board = createBoard();
  placeShip(board, 'Destroyer', 3, 3, 2, true);

  const miss = fireAt(board, 0, 0);
  assert.deepEqual({ hit: miss.hit, sunk: miss.sunk }, { hit: false, sunk: null });
  assert.equal(board.shots[0][0], MISS);

  const hit = fireAt(board, 3, 3);
  assert.equal(hit.hit, true);
  assert.equal(hit.sunk, null, 'ship sunk before all cells were hit');
  assert.equal(board.shots[3][3], HIT);

  assert.equal(fireAt(board, 3, 3), null, 'repeat shot was accepted');
  assert.equal(fireAt(board, 0, 0), null, 'repeat shot was accepted');

  const sunk = fireAt(board, 3, 4).sunk;
  assert.equal(sunk.name, 'Destroyer');
});

test('win is detected only once every ship is sunk', () => {
  const board = createBoard();
  placeShip(board, 'Destroyer', 0, 0, 2, true);
  placeShip(board, 'Cruiser', 2, 0, 3, true);
  assert.equal(isFleetDestroyed(createBoard()), false, 'empty board counted as a win');

  fireAt(board, 0, 0);
  fireAt(board, 0, 1);
  assert.equal(isFleetDestroyed(board), false);
  assert.equal(remainingShips(board).length, 1);

  fireAt(board, 2, 0);
  fireAt(board, 2, 1);
  fireAt(board, 2, 2);
  assert.ok(isFleetDestroyed(board));
  assert.equal(remainingShips(board).length, 0);
});

test('cell labels are letter-row + 1-based column', () => {
  assert.equal(cellLabel(0, 0), 'A1');
  assert.equal(cellLabel(9, 9), 'J10');
});

test('AI never fires at the same cell twice and always finishes the fleet', () => {
  for (let gameIndex = 0; gameIndex < 30; gameIndex += 1) {
    const board = placeFleetRandomly(createBoard());
    const ai = createAI();
    const fired = new Set();
    let shots = 0;
    while (!isFleetDestroyed(board)) {
      const { row, col } = ai.nextShot(board.shots);
      const key = `${row},${col}`;
      assert.equal(fired.has(key), false, `AI repeated a shot at ${key}`);
      fired.add(key);
      const result = fireAt(board, row, col);
      assert.notEqual(result, null, 'AI fired at an already-shot cell');
      ai.recordResult(row, col, result);
      shots += 1;
      assert.ok(shots <= BOARD_SIZE * BOARD_SIZE, 'AI failed to finish within 100 shots');
    }
  }
});

test('AI hunts on the checkerboard, then targets, then follows the line', () => {
  const board = createBoard();
  placeShip(board, 'Cruiser', 4, 2, 3, true);
  const ai = createAI();

  const hunt = ai.nextShot(board.shots);
  assert.equal((hunt.row + hunt.col) % 2, 0, 'hunting shot was off-parity');
  assert.equal(ai.mode, 'hunt');

  ai.recordResult(4, 2, fireAt(board, 4, 2));
  assert.equal(ai.mode, 'target');
  const target = ai.nextShot(board.shots);
  assert.equal(
    Math.abs(target.row - 4) + Math.abs(target.col - 2),
    1,
    'targeting shot was not adjacent to the hit',
  );

  ai.recordResult(4, 3, fireAt(board, 4, 3));
  assert.equal(ai.mode, 'line');
  const along = ai.nextShot(board.shots);
  assert.equal(along.row, 4, 'line shot left the row of consecutive hits');
  assert.ok(along.col === 1 || along.col === 4);
});

test('AI returns to hunting after sinking a ship', () => {
  const board = createBoard();
  placeShip(board, 'Destroyer', 5, 5, 2, false);
  const ai = createAI();
  ai.recordResult(5, 5, fireAt(board, 5, 5));
  ai.recordResult(6, 5, fireAt(board, 6, 5));
  assert.equal(ai.mode, 'hunt');
  const next = ai.nextShot(board.shots);
  assert.equal((next.row + next.col) % 2, 0);
});

test('lineEnds extends both directions for either orientation', () => {
  assert.deepEqual(lineEnds([{ row: 2, col: 3 }, { row: 2, col: 4 }]), [
    { row: 2, col: 2 },
    { row: 2, col: 5 },
  ]);
  assert.deepEqual(lineEnds([{ row: 5, col: 1 }, { row: 4, col: 1 }]), [
    { row: 3, col: 1 },
    { row: 6, col: 1 },
  ]);
});
