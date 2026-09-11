/* DOM rendering, screens and turn flow. All game rules live in game.js / ai.js / factions.js. */
(function (game, ai, factions) {
  const {
    BOARD_SIZE,
    HIT,
    MISS,
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
  const { FACTIONS, opposing, unitFor } = factions;

  const CELL = 32;
  const GAP = 2;
  const AI_DELAY = 650;

  const $ = (id) => document.getElementById(id);
  const screens = {
    splash: $('screen-splash'),
    faction: $('screen-faction'),
    setup: $('screen-setup'),
    battle: $('screen-battle'),
  };
  const statusEl = $('status');
  const turnEl = $('turn');
  const setupBoardEl = $('player-board');
  const playerBoardEl = $('player-board-battle');
  const enemyBoardEl = $('enemy-board');
  const shipListEl = $('ship-list');
  const howtoUnitsEl = $('howto-units');
  const rotateBtn = $('rotate-btn');
  const randomBtn = $('random-btn');
  const clearBtn = $('clear-btn');
  const startBtn = $('start-btn');
  const backBtn = $('back-btn');
  const switchBtn = $('switch-btn');
  const restartBtn = $('restart-btn');
  const enterBtn = $('enter-btn');
  const logEl = $('log');
  const difficultyChips = Array.from(document.querySelectorAll('[data-difficulty]'));

  const state = {
    screen: 'splash',
    phase: 'setup',
    faction: FACTIONS.autobots,
    enemyFaction: FACTIONS.decepticons,
    difficulty: 'hard',
    horizontal: true,
    selectedShip: 0,
    placed: [],
    player: createBoard(),
    enemy: createBoard(),
    opponent: null,
    busy: false,
    stats: { player: { shots: 0, hits: 0, sunk: 0 }, enemy: { shots: 0, hits: 0, sunk: 0 } },
    aiTimer: null,
    hovered: null,
  };

  /* ---------- screens ---------- */

  function showScreen(name) {
    state.screen = name;
    Object.entries(screens).forEach(([id, el]) => {
      el.hidden = id !== name;
    });
    window.scrollTo(0, 0);
  }

  function setFaction(id) {
    state.faction = FACTIONS[id];
    state.enemyFaction = opposing(id);
    document.body.className = `faction-${id}`;
    const you = state.faction;
    const foe = state.enemyFaction;
    $('setup-title').textContent = you.name;
    $('rack-title').textContent = you.fleetLabel;
    $('setup-board-title').textContent = `${singular(you)} territory`;
    $('player-board-title').textContent = `${singular(you)} territory`;
    $('enemy-board-title').textContent = `${singular(foe)} territory`;
    $('player-score-title').textContent = you.name;
    $('enemy-score-title').textContent = foe.name;
    howtoUnitsEl.replaceChildren(
      ...you.fleet.map((unit) => {
        const li = document.createElement('li');
        li.textContent = `${unit.name} — ${unit.vehicle} (${unit.size} cells)`;
        return li;
      }),
    );
  }

  function singular(faction) {
    return faction.name.replace(/s$/, '');
  }

  /* ---------- grid rendering ---------- */

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
    const overlays = document.createElement('div');
    overlays.className = 'overlays';
    container.appendChild(overlays);
  }

  function cellAt(container, row, col) {
    return container.children[row * BOARD_SIZE + col];
  }

  function vehicleOverlay(ship, faction) {
    const unit = unitFor(faction, ship.name);
    const first = ship.cells[0];
    const length = ship.size * (CELL + GAP) - GAP;
    const wrap = document.createElement('div');
    wrap.className = `vehicle${ship.horizontal ? '' : ' vehicle--vertical'}${
      ship.hits === ship.size ? ' vehicle--destroyed' : ''
    }`;
    wrap.style.left = `${GAP + first.col * (CELL + GAP)}px`;
    wrap.style.top = `${GAP + first.row * (CELL + GAP)}px`;
    wrap.style.width = `${ship.horizontal ? length : CELL}px`;
    wrap.style.height = `${ship.horizontal ? CELL : length}px`;
    const img = document.createElement('img');
    img.src = unit ? unit.image : '';
    img.alt = `${ship.name} (${unit ? unit.vehicle : ship.size + ' cells'})`;
    img.width = length;
    img.height = CELL;
    wrap.appendChild(img);
    return wrap;
  }

  /** revealMode: 'all' (own board), 'sunk' (enemy during battle) or 'none'. */
  function renderBoard(container, board, faction, revealMode) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const el = cellAt(container, row, col);
        const ship = board.grid[row][col];
        const shot = board.shots[row][col];
        el.className = 'cell';
        if (shot === MISS) el.classList.add('cell--miss');
        if (shot === HIT) {
          el.classList.add(ship && ship.hits === ship.size ? 'cell--sunk' : 'cell--hit');
        }
      }
    }
    const overlays = container.querySelector('.overlays');
    overlays.replaceChildren(
      ...board.ships
        .filter((ship) => revealMode === 'all' || (revealMode === 'sunk' && ship.hits === ship.size))
        .map((ship) => vehicleOverlay(ship, faction)),
    );
  }

  function fleetSummary(board, faction) {
    if (board.ships.length === 0) return 'No units deployed';
    const alive = remainingShips(board);
    if (alive.length === 0) return `${faction.name} eliminated`;
    return alive.map((ship) => `${ship.name} (${ship.size - ship.hits}/${ship.size})`).join(' · ');
  }

  function renderShipList() {
    shipListEl.replaceChildren();
    state.faction.fleet.forEach((unit, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rack-unit';
      button.disabled = state.placed.includes(index);
      button.setAttribute('aria-pressed', String(state.selectedShip === index));
      const img = document.createElement('img');
      img.src = unit.image;
      img.alt = '';
      img.width = unit.size * 20;
      img.height = 20;
      const label = document.createElement('span');
      label.innerHTML = `<strong>${unit.name}</strong><small>${unit.vehicle} · ${unit.size}</small>`;
      button.append(img, label);
      button.addEventListener('click', () => {
        state.selectedShip = index;
        render();
      });
      item.appendChild(button);
      shipListEl.appendChild(item);
    });
  }

  function renderStats() {
    ['player', 'enemy'].forEach((side) => {
      $(`${side}-shots`).textContent = String(state.stats[side].shots);
      $(`${side}-hits`).textContent = String(state.stats[side].hits);
      $(`${side}-sunk`).textContent = String(state.stats[side].sunk);
    });
    $('difficulty-display').textContent = capitalize(state.difficulty);
    difficultyChips.forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.difficulty === state.difficulty));
    });
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function render() {
    renderBoard(setupBoardEl, state.player, state.faction, 'all');
    renderBoard(playerBoardEl, state.player, state.faction, 'all');
    renderBoard(enemyBoardEl, state.enemy, state.enemyFaction, state.phase === 'over' ? 'all' : 'sunk');
    $('player-fleet').textContent = fleetSummary(state.player, state.faction);
    $('enemy-fleet').textContent = fleetSummary(state.enemy, state.enemyFaction);
    renderShipList();
    renderStats();
    startBtn.disabled = state.placed.length !== state.faction.fleet.length;
    rotateBtn.textContent = state.horizontal ? '↔ Horizontal' : '↕ Vertical';
  }

  function log(message, kind) {
    const item = document.createElement('li');
    item.textContent = message;
    if (kind) item.className = `log--${kind}`;
    logEl.prepend(item);
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function setTurn(message) {
    turnEl.textContent = message;
  }

  /* ---------- placement ---------- */

  function nextUnplacedShip() {
    return state.faction.fleet.findIndex((_, index) => !state.placed.includes(index));
  }

  function previewPlacement(row, col) {
    if (state.phase !== 'setup') return;
    state.hovered = { row, col };
    const index = state.selectedShip;
    if (index < 0 || state.placed.includes(index)) return;
    const { size } = state.faction.fleet[index];
    const valid = canPlace(state.player, row, col, size, state.horizontal);
    shipCells(row, col, size, state.horizontal).forEach((cell) => {
      if (cell.row >= BOARD_SIZE || cell.col >= BOARD_SIZE) return;
      cellAt(setupBoardEl, cell.row, cell.col).classList.add(valid ? 'cell--preview' : 'cell--invalid');
    });
  }

  function clearPreview() {
    if (state.phase !== 'setup') return;
    state.hovered = null;
    renderBoard(setupBoardEl, state.player, state.faction, 'all');
  }

  function repaintPreview() {
    if (state.phase !== 'setup' || !state.hovered) return;
    renderBoard(setupBoardEl, state.player, state.faction, 'all');
    previewPlacement(state.hovered.row, state.hovered.col);
  }

  function handlePlacement(row, col) {
    if (state.phase !== 'setup') return;
    const index = state.selectedShip;
    if (index < 0 || state.placed.includes(index)) return;
    const unit = state.faction.fleet[index];
    if (!placeShip(state.player, unit.name, row, col, unit.size, state.horizontal)) {
      setStatus(`${unit.name} does not fit there.`);
      return;
    }
    state.placed.push(index);
    const next = nextUnplacedShip();
    state.selectedShip = next;
    setStatus(
      next === -1 ? `All units deployed. ${state.faction.rally}` : `Deploy ${state.faction.fleet[next].name}.`,
    );
    render();
  }

  function randomPlacement() {
    if (state.phase !== 'setup') return;
    state.player = createBoard();
    placeFleetRandomly(state.player, state.faction.fleet);
    state.placed = state.faction.fleet.map((_, index) => index);
    state.selectedShip = -1;
    setStatus(`All units deployed. ${state.faction.rally}`);
    render();
  }

  function clearPlacement() {
    if (state.phase !== 'setup') return;
    state.player = createBoard();
    state.placed = [];
    state.selectedShip = 0;
    setStatus('Position your units, Commander.');
    render();
  }

  function toggleRotation() {
    state.horizontal = !state.horizontal;
    rotateBtn.textContent = state.horizontal ? '↔ Horizontal' : '↕ Vertical';
    repaintPreview();
  }

  /* ---------- battle ---------- */

  function startBattle() {
    if (state.placed.length !== state.faction.fleet.length) return;
    state.phase = 'battle';
    state.opponent = ai.createAI({ difficulty: state.difficulty, fleet: state.enemyFaction.fleet });
    state.enemy = createBoard();
    placeFleetRandomly(state.enemy, state.enemyFaction.fleet);
    logEl.replaceChildren();
    log(`The forces are assembled. ${state.faction.name} strike first!`);
    setTurn(`Your turn — fire on ${singular(state.enemyFaction)} territory`);
    showScreen('battle');
    render();
  }

  function playerTurn(row, col) {
    if (state.phase !== 'battle' || state.busy) return;
    if (alreadyShot(state.enemy, row, col)) {
      setTurn('You already fired there — pick another cell.');
      return;
    }
    const result = fireAt(state.enemy, row, col);
    const label = cellLabel(row, col);
    const me = state.stats.player;
    me.shots += 1;
    if (result.hit) me.hits += 1;
    if (result.sunk) {
      me.sunk += 1;
      log(`${result.sunk.name} destroyed! ${state.faction.name} take down the ${state.enemyFaction.name}' ${unitFor(state.enemyFaction, result.sunk.name).vehicle} at ${label}.`, 'sunk');
    } else {
      log(`${state.faction.name} fire at ${label}: ${result.hit ? 'HIT' : 'miss'}.`, result.hit ? 'hit' : 'miss');
    }
    render();

    if (isFleetDestroyed(state.enemy)) {
      endGame(`Victory! The ${state.enemyFaction.name} are defeated in ${me.shots} shots. ${state.faction.rally}`);
      return;
    }

    state.busy = true;
    setTurn(`${state.enemyFaction.name}' turn…`);
    state.aiTimer = setTimeout(aiTurn, AI_DELAY);
  }

  function aiTurn() {
    state.aiTimer = null;
    if (state.phase !== 'battle') return;
    const { row, col } = state.opponent.nextShot(state.player.shots);
    const result = fireAt(state.player, row, col);
    state.opponent.recordResult(row, col, result);
    const label = cellLabel(row, col);
    const foe = state.stats.enemy;
    foe.shots += 1;
    if (result.hit) foe.hits += 1;
    if (result.sunk) {
      foe.sunk += 1;
      log(`${result.sunk.name} destroyed! The ${state.enemyFaction.name} take out your ${unitFor(state.faction, result.sunk.name).vehicle} at ${label}.`, 'sunk');
    } else {
      log(`${state.enemyFaction.name} fire at ${label}: ${result.hit ? 'HIT' : 'miss'}.`, result.hit ? 'hit' : 'miss');
    }
    render();

    if (isFleetDestroyed(state.player)) {
      endGame(`Defeat — the ${state.enemyFaction.name} crushed your forces in ${foe.shots} shots.`);
      return;
    }
    state.busy = false;
    setTurn(`Your turn — fire on ${singular(state.enemyFaction)} territory`);
  }

  function endGame(message) {
    state.phase = 'over';
    state.busy = false;
    setTurn(message);
    log(message, 'end');
    render();
  }

  /* ---------- resets ---------- */

  function resetBoards() {
    if (state.aiTimer !== null) {
      clearTimeout(state.aiTimer);
      state.aiTimer = null;
    }
    state.phase = 'setup';
    state.horizontal = true;
    state.selectedShip = 0;
    state.placed = [];
    state.player = createBoard();
    state.enemy = createBoard();
    state.opponent = null;
    state.busy = false;
    state.stats = { player: { shots: 0, hits: 0, sunk: 0 }, enemy: { shots: 0, hits: 0, sunk: 0 } };
    state.hovered = null;
    logEl.replaceChildren();
    setStatus('Position your units, Commander.');
    render();
  }

  function newBattle() {
    resetBoards();
    showScreen('setup');
  }

  function chooseSide() {
    resetBoards();
    showScreen('faction');
  }

  /* ---------- wiring ---------- */

  buildGrid(setupBoardEl, handlePlacement, previewPlacement, clearPreview);
  buildGrid(playerBoardEl);
  buildGrid(enemyBoardEl, playerTurn);

  enterBtn.addEventListener('click', () => showScreen('faction'));
  document.querySelectorAll('[data-faction]').forEach((card) => {
    card.addEventListener('click', () => {
      setFaction(card.dataset.faction);
      newBattle();
    });
  });
  difficultyChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.difficulty = chip.dataset.difficulty;
      renderStats();
    });
  });
  rotateBtn.addEventListener('click', toggleRotation);
  randomBtn.addEventListener('click', randomPlacement);
  clearBtn.addEventListener('click', clearPlacement);
  startBtn.addEventListener('click', startBattle);
  backBtn.addEventListener('click', chooseSide);
  switchBtn.addEventListener('click', chooseSide);
  restartBtn.addEventListener('click', newBattle);
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r' && state.screen === 'setup') toggleRotation();
  });

  setFaction('autobots');
  resetBoards();
  showScreen('splash');
})(window.BattleshipGame, window.BattleshipAI, window.BattleshipFactions);
