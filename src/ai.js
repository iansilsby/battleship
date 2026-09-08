import { BOARD_SIZE, EMPTY, HIT, MISS, SHIPS } from './game.js';

const HIT_WEIGHT = 40;

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function unresolvedHits(shots, sunkCells) {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (shots[row][col] === HIT && !sunkCells.has(`${row},${col}`)) cells.push({ row, col });
    }
  }
  return cells;
}

/**
 * Probability density map: for every remaining ship, count how many legal
 * placements cover each untried cell, weighting placements that overlap
 * unresolved hits so the AI finishes off a damaged ship before hunting again.
 */
export function buildProbabilityMap(shots, remainingSizes, sunkCells) {
  const map = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(0));
  const pending = new Set(unresolvedHits(shots, sunkCells).map((c) => `${c.row},${c.col}`));

  remainingSizes.forEach((size) => {
    [true, false].forEach((horizontal) => {
      const maxRow = horizontal ? BOARD_SIZE : BOARD_SIZE - size + 1;
      const maxCol = horizontal ? BOARD_SIZE - size + 1 : BOARD_SIZE;
      for (let row = 0; row < maxRow; row += 1) {
        for (let col = 0; col < maxCol; col += 1) {
          const cells = [];
          let legal = true;
          let overlaps = 0;
          for (let i = 0; i < size; i += 1) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;
            if (shots[r][c] === MISS || sunkCells.has(`${r},${c}`)) {
              legal = false;
              break;
            }
            if (pending.has(`${r},${c}`)) overlaps += 1;
            cells.push({ row: r, col: c });
          }
          if (!legal) continue;
          const weight = 1 + overlaps * HIT_WEIGHT;
          cells.forEach((cell) => {
            if (shots[cell.row][cell.col] === EMPTY) map[cell.row][cell.col] += weight;
          });
        }
      }
    });
  });

  return map;
}

function pickBest(map, shots, random) {
  let best = 0;
  let candidates = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (shots[row][col] !== EMPTY) continue;
      const score = map[row][col];
      if (score > best) {
        best = score;
        candidates = [{ row, col }];
      } else if (score === best && score > 0) {
        candidates.push({ row, col });
      }
    }
  }
  if (candidates.length === 0) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (shots[row][col] === EMPTY) candidates.push({ row, col });
      }
    }
  }
  return candidates[Math.floor(random() * candidates.length)];
}

export function createAI({ difficulty = 'hard', random = Math.random } = {}) {
  const sunkCells = new Set();
  const targetQueue = [];
  let remainingSizes = SHIPS.map((ship) => ship.size);

  function pushTargets(shots, row, col) {
    [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ].forEach((cell) => {
      if (inBounds(cell.row, cell.col) && shots[cell.row][cell.col] === EMPTY) {
        targetQueue.push(cell);
      }
    });
  }

  function randomShot(shots) {
    const open = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (shots[row][col] === EMPTY) open.push({ row, col });
      }
    }
    return open[Math.floor(random() * open.length)];
  }

  function parityShot(shots) {
    const smallest = Math.min(...remainingSizes, 2);
    const open = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (shots[row][col] === EMPTY && (row + col) % smallest === 0) open.push({ row, col });
      }
    }
    if (open.length === 0) return randomShot(shots);
    return open[Math.floor(random() * open.length)];
  }

  return {
    nextShot(shots) {
      if (difficulty === 'easy') return randomShot(shots);
      if (difficulty === 'medium') {
        while (targetQueue.length > 0) {
          const cell = targetQueue.pop();
          if (shots[cell.row][cell.col] === EMPTY) return cell;
        }
        return parityShot(shots);
      }
      return pickBest(buildProbabilityMap(shots, remainingSizes, sunkCells), shots, random);
    },

    recordResult(shots, row, col, result) {
      if (!result) return;
      if (result.hit) pushTargets(shots, row, col);
      if (result.sunk) {
        result.sunk.cells.forEach((cell) => sunkCells.add(`${cell.row},${cell.col}`));
        const index = remainingSizes.indexOf(result.sunk.size);
        if (index !== -1) remainingSizes = remainingSizes.filter((_, i) => i !== index);
        targetQueue.length = 0;
      }
    },
  };
}
