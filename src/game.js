/* Battleship game logic. Loaded as a classic script in the browser (so the
 * game also works from file://) and required directly by the Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BattleshipGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const BOARD_SIZE = 10;

  const SHIPS = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 },
  ];

  const EMPTY = 0;
  const MISS = 1;
  const HIT = 2;

  function createBoard() {
    return {
      ships: [],
      grid: Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(null)),
      shots: Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(EMPTY)),
    };
  }

  function shipCells(row, col, size, horizontal) {
    const cells = [];
    for (let i = 0; i < size; i += 1) {
      cells.push(horizontal ? { row, col: col + i } : { row: row + i, col });
    }
    return cells;
  }

  function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function canPlace(board, row, col, size, horizontal) {
    return shipCells(row, col, size, horizontal).every(
      (cell) => inBounds(cell.row, cell.col) && board.grid[cell.row][cell.col] === null,
    );
  }

  function placeShip(board, name, row, col, size, horizontal) {
    if (!canPlace(board, row, col, size, horizontal)) return false;
    const ship = { name, size, horizontal, cells: shipCells(row, col, size, horizontal), hits: 0 };
    board.ships.push(ship);
    ship.cells.forEach((cell) => {
      board.grid[cell.row][cell.col] = ship;
    });
    return true;
  }

  function placeFleetRandomly(board, ships, random) {
    const fleet = ships || SHIPS;
    const rng = random || Math.random;
    fleet.forEach(function (spec) {
      for (;;) {
        const horizontal = rng() < 0.5;
        const row = Math.floor(rng() * BOARD_SIZE);
        const col = Math.floor(rng() * BOARD_SIZE);
        if (placeShip(board, spec.name, row, col, spec.size, horizontal)) return;
      }
    });
    return board;
  }

  function alreadyShot(board, row, col) {
    return board.shots[row][col] !== EMPTY;
  }

  function fireAt(board, row, col) {
    if (!inBounds(row, col) || alreadyShot(board, row, col)) return null;
    const ship = board.grid[row][col];
    if (!ship) {
      board.shots[row][col] = MISS;
      return { hit: false, sunk: null };
    }
    board.shots[row][col] = HIT;
    ship.hits += 1;
    return { hit: true, sunk: ship.hits === ship.size ? ship : null };
  }

  function isFleetDestroyed(board) {
    return board.ships.length > 0 && board.ships.every((ship) => ship.hits === ship.size);
  }

  function remainingShips(board) {
    return board.ships.filter((ship) => ship.hits < ship.size);
  }

  function cellLabel(row, col) {
    return String.fromCharCode(65 + row) + (col + 1);
  }

  return {
    BOARD_SIZE,
    SHIPS,
    EMPTY,
    MISS,
    HIT,
    createBoard,
    shipCells,
    inBounds,
    canPlace,
    placeShip,
    placeFleetRandomly,
    alreadyShot,
    fireAt,
    isFleetDestroyed,
    remainingShips,
    cellLabel,
  };
});
