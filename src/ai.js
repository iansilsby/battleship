/* Hunt-and-target AI opponent. Classic script in the browser, CommonJS in Node. */
(function (root, factory) {
  const game =
    typeof module === 'object' && module.exports ? require('./game.js') : root.BattleshipGame;
  const api = factory(game);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BattleshipAI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (game) {
  const { BOARD_SIZE, EMPTY, inBounds } = game;

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

  function createAI(options) {
    const random = (options && options.random) || Math.random;
    let hits = [];

    function pick(cells) {
      return cells[Math.floor(random() * cells.length)];
    }

    function untried(shots, cells) {
      return cells.filter((cell) => inBounds(cell.row, cell.col) && shots[cell.row][cell.col] === EMPTY);
    }

    return {
      /** Current strategy, exposed for tests and the UI status line. */
      get mode() {
        if (hits.length === 0) return 'hunt';
        return hits.length === 1 ? 'target' : 'line';
      },

      nextShot(shots) {
        if (hits.length >= 2 && isCollinear(hits)) {
          const ends = untried(shots, lineEnds(hits));
          if (ends.length > 0) return pick(ends);
        }
        if (hits.length > 0) {
          const adjacent = untried(shots, hits.reduce((all, hit) => all.concat(neighbours(hit)), []));
          if (adjacent.length > 0) return pick(adjacent);
          hits = [];
        }
        const parity = openCells(shots, (row, col) => (row + col) % 2 === 0);
        return pick(parity.length > 0 ? parity : openCells(shots));
      },

      recordResult(row, col, result) {
        if (!result) return;
        if (result.hit) hits.push({ row, col });
        if (result.sunk) {
          const sunkKeys = new Set(result.sunk.cells.map(key));
          hits = hits.filter((hit) => !sunkKeys.has(key(hit)));
        }
      },
    };
  }

  return { createAI, lineEnds, isCollinear };
});
