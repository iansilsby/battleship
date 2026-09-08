import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOARD_SIZE,
  SHIPS,
  canPlace,
  createBoard,
  fireAt,
  isFleetDestroyed,
  placeFleetRandomly,
  placeShip,
} from '../src/game.js';
import { createAI } from '../src/ai.js';

test('ships cannot overlap or hang off the board', () => {
  const board = createBoard();
  assert.ok(placeShip(board, 'Destroyer', 0, 0, 2, true));
  assert.equal(canPlace(board, 0, 1, 2, true), false);
  assert.equal(canPlace(board, 0, 9, 2, true), false);
  assert.equal(placeShip(board, 'Cruiser', 9, 8, 3, false), false);
});

test('firing reports hits, misses and sinking', () => {
  const board = createBoard();
  placeShip(board, 'Destroyer', 3, 3, 2, true);
  assert.equal(fireAt(board, 0, 0).hit, false);
  assert.equal(fireAt(board, 3, 3).hit, true);
  assert.equal(fireAt(board, 3, 3), null);
  const sunk = fireAt(board, 3, 4).sunk;
  assert.equal(sunk.name, 'Destroyer');
  assert.ok(isFleetDestroyed(board));
});

test('random fleet placement fills exactly the expected cells', () => {
  const board = placeFleetRandomly(createBoard());
  const occupied = board.grid.flat().filter(Boolean).length;
  assert.equal(occupied, SHIPS.reduce((sum, ship) => sum + ship.size, 0));
});

for (const difficulty of ['easy', 'medium', 'hard']) {
  test(`${difficulty} AI sinks a full fleet without repeating shots`, () => {
    const board = placeFleetRandomly(createBoard());
    const ai = createAI({ difficulty });
    let shots = 0;
    while (!isFleetDestroyed(board) && shots < BOARD_SIZE * BOARD_SIZE) {
      const { row, col } = ai.nextShot(board.shots);
      const result = fireAt(board, row, col);
      assert.notEqual(result, null, 'AI fired at the same cell twice');
      ai.recordResult(board.shots, row, col, result);
      shots += 1;
    }
    assert.ok(isFleetDestroyed(board));
  });
}

test('hard AI is meaningfully better than random fire', () => {
  const average = (difficulty) => {
    let total = 0;
    for (let game = 0; game < 20; game += 1) {
      const board = placeFleetRandomly(createBoard());
      const ai = createAI({ difficulty });
      let shots = 0;
      while (!isFleetDestroyed(board)) {
        const { row, col } = ai.nextShot(board.shots);
        const result = fireAt(board, row, col);
        ai.recordResult(board.shots, row, col, result);
        shots += 1;
      }
      total += shots;
    }
    return total / 20;
  };
  assert.ok(average('hard') < average('easy') - 10);
});
