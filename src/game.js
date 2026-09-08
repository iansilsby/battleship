export const BOARD_SIZE = 10;

export const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

export const EMPTY = 0;
export const MISS = 1;
export const HIT = 2;

export function createBoard() {
  return {
    ships: [],
    grid: Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(null)),
    shots: Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(EMPTY)),
  };
}

export function shipCells(row, col, size, horizontal) {
  const cells = [];
  for (let i = 0; i < size; i += 1) {
    cells.push(horizontal ? { row, col: col + i } : { row: row + i, col });
  }
  return cells;
}

export function canPlace(board, row, col, size, horizontal) {
  return shipCells(row, col, size, horizontal).every(
    (cell) =>
      cell.row >= 0 &&
      cell.row < BOARD_SIZE &&
      cell.col >= 0 &&
      cell.col < BOARD_SIZE &&
      board.grid[cell.row][cell.col] === null,
  );
}

export function placeShip(board, name, row, col, size, horizontal) {
  if (!canPlace(board, row, col, size, horizontal)) return false;
  const ship = { name, size, horizontal, cells: shipCells(row, col, size, horizontal), hits: 0 };
  board.ships.push(ship);
  ship.cells.forEach((cell) => {
    board.grid[cell.row][cell.col] = ship;
  });
  return true;
}

export function placeFleetRandomly(board, ships = SHIPS, random = Math.random) {
  ships.forEach(({ name, size }) => {
    for (;;) {
      const horizontal = random() < 0.5;
      const row = Math.floor(random() * BOARD_SIZE);
      const col = Math.floor(random() * BOARD_SIZE);
      if (placeShip(board, name, row, col, size, horizontal)) return;
    }
  });
  return board;
}

export function alreadyShot(board, row, col) {
  return board.shots[row][col] !== EMPTY;
}

export function fireAt(board, row, col) {
  if (alreadyShot(board, row, col)) return null;
  const ship = board.grid[row][col];
  if (!ship) {
    board.shots[row][col] = MISS;
    return { hit: false, sunk: null };
  }
  board.shots[row][col] = HIT;
  ship.hits += 1;
  return { hit: true, sunk: ship.hits === ship.size ? ship : null };
}

export function isFleetDestroyed(board) {
  return board.ships.length > 0 && board.ships.every((ship) => ship.hits === ship.size);
}

export function remainingShips(board) {
  return board.ships.filter((ship) => ship.hits < ship.size);
}
