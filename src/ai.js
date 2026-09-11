/* Hunt-and-target AI opponent. Classic script in the browser, CommonJS in Node. */
(function (root, factory) {
  const game =
    typeof module === 'object' && module.exports ? require('./game.js') : root.BattleshipGame;
  const api = factory(game);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BattleshipAI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (game) {
  const { BOARD_SIZE, EMPTY, MISS, SHIPS, inBounds, shipCells } = game;

  /**
   * easy   – random shots, no follow-up on hits.
   * medium – random hunting, then targets cells adjacent to hits.
   * hard   – checkerboard parity hunting, adjacent targeting, then follows the line of hits.
   * expert – like hard, but hunts with a probability-density map of where the remaining
   *          ships can still fit instead of plain parity.
   */
  const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

  function key(cell) {
    return cell.row + ',' + cell.col;
  }

  function openCells(shots, predicate) {
    const cells = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (shots[row][col] === EMPTY && (!predicate || predicate(row, col))) cells.push({ row, col });
      }
    }
    return cells;
  }

  function neighbours(cell) {
    return [
      { row: cell.row - 1, col: cell.col },
      { row: cell.row + 1, col: cell.col },
      { row: cell.row, col: cell.col - 1 },
      { row: cell.row, col: cell.col + 1 },
    ];
  }

  function isCollinear(hits) {
    return (
      hits.every((hit) => hit.row === hits[0].row) || hits.every((hit) => hit.col === hits[0].col)
    );
  }

  /** Ends of the line through the current run of collinear hits, both directions. */
  function lineEnds(hits) {
    const horizontal = hits.every((hit) => hit.row === hits[0].row);
    const sorted = hits
      .slice()
      .sort((a, b) => (horizontal ? a.col - b.col : a.row - b.row));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return horizontal
      ? [
          { row: first.row, col: first.col - 1 },
          { row: last.row, col: last.col + 1 },
        ]
      : [
          { row: first.row - 1, col: first.col },
          { row: last.row + 1, col: last.col },
        ];
  }

  /** Cells where the most remaining ships could still be placed, given misses and sunk cells. */
  function densestCells(shots, sizes, sunkKeys) {
    const density = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(0));
    const blocked = (cell) =>
      !inBounds(cell.row, cell.col) ||
      shots[cell.row][cell.col] === MISS ||
      sunkKeys.has(key(cell));
    sizes.forEach((size) => {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
          [true, false].forEach((horizontal) => {
            const cells = shipCells(row, col, size, horizontal);
            if (cells.some(blocked)) return;
            cells.forEach((cell) => {
              if (shots[cell.row][cell.col] === EMPTY) density[cell.row][cell.col] += 1;
            });
          });
        }
      }
    });
    let best = -1;
    let cells = [];
    openCells(shots).forEach((cell) => {
      const score = density[cell.row][cell.col];
      if (score > best) {
        best = score;
        cells = [cell];
      } else if (score === best) cells.push(cell);
    });
    return cells;
  }

  function createAI(options) {
    const opts = options || {};
    const random = opts.random || Math.random;
    const difficulty = DIFFICULTIES.includes(opts.difficulty) ? opts.difficulty : 'hard';
    const fleet = opts.fleet || SHIPS;
    let hits = [];
    const remainingSizes = fleet.map((ship) => ship.size);
    const sunkKeys = new Set();

    function pick(cells) {
      return cells[Math.floor(random() * cells.length)];
    }

    function untried(shots, cells) {
      return cells.filter((cell) => inBounds(cell.row, cell.col) && shots[cell.row][cell.col] === EMPTY);
    }

    function hunt(shots) {
      const open = openCells(shots);
      if (difficulty === 'easy' || difficulty === 'medium') return pick(open);
      if (difficulty === 'expert') {
        const dense = densestCells(shots, remainingSizes, sunkKeys);
        if (dense.length > 0) return pick(dense);
      }
      const parity = openCells(shots, (row, col) => (row + col) % 2 === 0);
      return pick(parity.length > 0 ? parity : open);
    }

    return {
      difficulty,

      /** Current strategy, exposed for tests and the UI status line. */
      get mode() {
        if (hits.length === 0) return 'hunt';
        return hits.length === 1 ? 'target' : 'line';
      },

      nextShot(shots) {
        if (difficulty === 'easy') return hunt(shots);
        if (difficulty !== 'medium' && hits.length >= 2 && isCollinear(hits)) {
          const ends = untried(shots, lineEnds(hits));
          if (ends.length > 0) return pick(ends);
        }
        if (hits.length > 0) {
          const adjacent = untried(shots, hits.reduce((all, hit) => all.concat(neighbours(hit)), []));
          if (adjacent.length > 0) return pick(adjacent);
          hits = [];
        }
        return hunt(shots);
      },

      recordResult(row, col, result) {
        if (!result) return;
        if (result.hit) hits.push({ row, col });
        if (result.sunk) {
          result.sunk.cells.forEach((cell) => sunkKeys.add(key(cell)));
          hits = hits.filter((hit) => !sunkKeys.has(key(hit)));
          const index = remainingSizes.indexOf(result.sunk.size);
          if (index !== -1) remainingSizes.splice(index, 1);
        }
      },
    };
  }

  return { DIFFICULTIES, createAI, lineEnds, isCollinear, densestCells };
});
