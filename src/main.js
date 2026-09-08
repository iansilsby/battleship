/* DOM rendering and turn flow. All game rules live in game.js / ai.js. */
(function (game, ai) {
  const {
    BOARD_SIZE,
    HIT,
    MISS,
    SHIPS,
    alreadyShot,
    canPlace,
    cellLabel,
    createBoard,
    fireAt,
    isFleetDestroyed,
    placeFleetRandomly,
    placeShip,
    remainingShips,
    shipCells,
  } = game;

  const statusEl = document.getElementById('status');
  const playerBoardEl = document.getElementById('player-board');
  const enemyBoardEl = document.getElementById('enemy-board');
  const playerFleetEl = document.getElementById('player-fleet');
  const enemyFleetEl = document.getElementById('enemy-fleet');
  const shipListEl = document.getElementById('ship-list');
  const rotateBtn = document.getElementById('rotate-btn');
  const randomBtn = document.getElementById('random-btn');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const logEl = document.getElementById('log');
  const setupPanel = document.getElementById('setup-panel');
  const playerShotsEl = document.getElementById('player-shots');
  const enemyShotsEl = document.getElementById('enemy-shots');

  const state = {
    phase: 'setup',
    horizontal: true,
    selectedShip: 0,
    placed: [],
    player: createBoard(),
    enemy: createBoard(),
    opponent: ai.createAI(),
    busy: false,
    playerShots: 0,
    enemyShots: 0,
  };

  function buildGrid(container, onClick, onHover, onLeave) {
    container.replaceChildren();
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute('aria-label', cellLabel(row, col));
        if (onClick) cell.addEventListener('click', () => onClick(row, col));
        if (onHover) cell.addEventListener('mouseenter', () => onHover(row, col));
        if (onLeave) cell.addEventListener('mouseleave', onLeave);
        container.appendChild(cell);
      }
    }
  }

  function cellAt(container, row, col) {
    return container.children[row * BOARD_SIZE + col];
  }

  function renderBoard(container, board, revealShips) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const el = cellAt(container, row, col);
        const ship = board.grid[row][col];
        const shot = board.shots[row][col];
        el.className = 'cell';
        if (revealShips && ship) el.classList.add('cell--ship');
        if (shot === MISS) el.classList.add('cell--miss');
        if (shot === HIT) {
          el.classList.add(ship && ship.hits === ship.size ? 'cell--sunk' : 'cell--hit');
        }
      }
    }
  }

  function fleetSummary(board) {
    const alive = remainingShips(board);
    if (alive.length === 0) return 'Fleet destroyed';
    return alive.map((ship) => `${ship.name} (${ship.size - ship.hits}/${ship.size})`).join(' · ');
  }

  function renderShipList() {
    shipListEl.replaceChildren();
    SHIPS.forEach((ship, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${ship.name} (${ship.size})`;
      button.disabled = state.placed.includes(index);
      button.setAttribute('aria-pressed', String(state.selectedShip === index));
      button.addEventListener('click', () => {
        state.selectedShip = index;
        render();
      });
      item.appendChild(button);
      shipListEl.appendChild(item);
    });
  }

  function render() {
    renderBoard(playerBoardEl, state.player, true);
    renderBoard(enemyBoardEl, state.enemy, state.phase === 'over');
    playerFleetEl.textContent = fleetSummary(state.player);
    enemyFleetEl.textContent = state.phase === 'setup' ? '' : fleetSummary(state.enemy);
    playerShotsEl.textContent = String(state.playerShots);
    enemyShotsEl.textContent = String(state.enemyShots);
    renderShipList();
    startBtn.disabled = state.placed.length !== SHIPS.length;
    setupPanel.hidden = state.phase !== 'setup';
  }

  function log(message) {
    const item = document.createElement('li');
    item.textContent = message;
    logEl.prepend(item);
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function nextUnplacedShip() {
    return SHIPS.findIndex((_, index) => !state.placed.includes(index));
  }

  function previewPlacement(row, col) {
    if (state.phase !== 'setup') return;
    const index = state.selectedShip;
    if (index < 0 || state.placed.includes(index)) return;
    const { size } = SHIPS[index];
    const valid = canPlace(state.player, row, col, size, state.horizontal);
    shipCells(row, col, size, state.horizontal).forEach((cell) => {
      if (cell.row >= BOARD_SIZE || cell.col >= BOARD_SIZE) return;
      cellAt(playerBoardEl, cell.row, cell.col).classList.add(
        valid ? 'cell--preview' : 'cell--invalid',
      );
    });
  }

  function clearPreview() {
    if (state.phase !== 'setup') return;
    renderBoard(playerBoardEl, state.player, true);
  }

  function handlePlacement(row, col) {
    if (state.phase !== 'setup') return;
    const index = state.selectedShip;
    if (index < 0 || state.placed.includes(index)) return;
    const ship = SHIPS[index];
    if (!placeShip(state.player, ship.name, row, col, ship.size, state.horizontal)) {
      setStatus(`${ship.name} does not fit there.`);
      return;
    }
    state.placed.push(index);
    const next = nextUnplacedShip();
    state.selectedShip = next;
    setStatus(next === -1 ? 'Fleet ready. Start the battle!' : `Place your ${SHIPS[next].name}.`);
    render();
  }

  function playerTurn(row, col) {
    if (state.phase !== 'battle' || state.busy) return;
    if (alreadyShot(state.enemy, row, col)) {
      setStatus('You already fired there — pick another cell.');
      return;
    }
    const result = fireAt(state.enemy, row, col);
    state.playerShots += 1;
    const label = cellLabel(row, col);
    if (result.sunk) log(`You sank the enemy ${result.sunk.name} at ${label}!`);
    else log(`You fired at ${label}: ${result.hit ? 'hit' : 'miss'}.`);
    render();

    if (isFleetDestroyed(state.enemy)) {
      endGame(`You win! Enemy fleet destroyed in ${state.playerShots} shots.`);
      return;
    }

    state.busy = true;
    setStatus('Enemy is taking aim…');
    setTimeout(aiTurn, 550);
  }

  function aiTurn() {
    const { row, col } = state.opponent.nextShot(state.player.shots);
    const result = fireAt(state.player, row, col);
    state.opponent.recordResult(row, col, result);
    state.enemyShots += 1;
    const label = cellLabel(row, col);
    if (result.sunk) log(`Enemy sank your ${result.sunk.name} at ${label}!`);
    else log(`Enemy fired at ${label}: ${result.hit ? 'hit' : 'miss'}.`);
    render();

    if (isFleetDestroyed(state.player)) {
      endGame(`You lose — your fleet was destroyed in ${state.enemyShots} enemy shots.`);
      return;
    }
    state.busy = false;
    setStatus('Your turn — fire at enemy waters.');
  }

  function endGame(message) {
    state.phase = 'over';
    state.busy = false;
    setStatus(message);
    log(message);
    render();
  }

  function startBattle() {
    if (state.placed.length !== SHIPS.length) return;
    state.phase = 'battle';
    state.opponent = ai.createAI();
    placeFleetRandomly(state.enemy);
    setStatus('Your turn — fire at enemy waters.');
    log('Battle started.');
    render();
  }

  function randomPlacement() {
    if (state.phase !== 'setup') return;
    state.player = createBoard();
    placeFleetRandomly(state.player);
    state.placed = SHIPS.map((_, index) => index);
    state.selectedShip = -1;
    setStatus('Fleet ready. Start the battle!');
    render();
  }

  function newGame() {
    state.phase = 'setup';
    state.horizontal = true;
    state.selectedShip = 0;
    state.placed = [];
    state.player = createBoard();
    state.enemy = createBoard();
    state.opponent = ai.createAI();
    state.busy = false;
    state.playerShots = 0;
    state.enemyShots = 0;
    logEl.replaceChildren();
    rotateBtn.textContent = 'Rotate: Horizontal';
    setStatus('Place your fleet to begin.');
    render();
  }

  function toggleRotation() {
    state.horizontal = !state.horizontal;
    rotateBtn.textContent = `Rotate: ${state.horizontal ? 'Horizontal' : 'Vertical'}`;
  }

  buildGrid(playerBoardEl, handlePlacement, previewPlacement, clearPreview);
  buildGrid(enemyBoardEl, playerTurn);

  rotateBtn.addEventListener('click', toggleRotation);
  randomBtn.addEventListener('click', randomPlacement);
  startBtn.addEventListener('click', startBattle);
  restartBtn.addEventListener('click', newGame);
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r' && state.phase === 'setup') toggleRotation();
  });

  newGame();
})(window.BattleshipGame, window.BattleshipAI);
