# battleship

Hot Wheels–themed browser Battleship against a hunt-and-target AI opponent: park your cars in the garage and wreck the rival's track. Vanilla HTML, CSS and JavaScript — no
frameworks, no build step, no backend.

**Play it live: https://iansilsby.github.io/battleship/**

You can also just open `index.html` directly from disk (`file://`), or serve the repo root:

```bash
python3 -m http.server 8000   # or: npm start
```

## How to play

1. Pick a car, click a cell in **Your garage** to park it — press `R` or the rotate button to
   switch between horizontal and vertical, or hit **Randomize** to park the whole garage.
   Cars may not overlap or hang off the board; an invalid preview shows in red.
2. **Start the race**, then click the **Rival track** to launch. Shots alternate: you, then the AI.
3. Hits, misses and wrecked cars are shown on both boards, each wrecked car is announced by name in the
   log, and the shot counters under each board track how many shots each side has fired.
   **New Race** resets everything.

Garage: Car Hauler 5, Monster Truck 4, Muscle Car 3, Dragster 3, Go-Kart 2 on a 10×10 grid
(the classic Carrier/Battleship/Cruiser/Submarine/Destroyer sizes).

## AI opponent

`src/ai.js` implements the classic hunt-and-target strategy:

- **Hunt** — random shots restricted to the checkerboard parity (`(row + col) % 2 === 0`), since
  every ship spans at least two cells and therefore covers at least one parity cell.
- **Target** — after a hit, fire at the untried cells orthogonally adjacent to it.
- **Line** — once two hits line up, extend the run from both ends until the ship sinks.
- Back to hunting when the ship goes down. The AI only ever chooses untried cells.

## Layout

| File | Role |
| --- | --- |
| `src/game.js` | Board, ship placement, shot resolution, win detection — no DOM |
| `src/ai.js` | Hunt-and-target opponent — no DOM |
| `src/main.js` | Rendering, input, turn flow |
| `test/game.test.js` | Node test suite |

The logic modules are plain scripts that export via `module.exports` under Node and attach to
`window` in the browser, so the same files are unit tested and run from `file://` (ES modules are
blocked by CORS when opened directly from disk).

## Tests

Plain Node, no dependencies to install (Node 18+):

```bash
node --test "test/*.test.js"   # or: npm test
```

Covers placement validation, hit/miss/sunk resolution, win detection, the AI's hunt → target → line
progression, and that the AI never repeats a shot across 30 self-played games.

## Bugs

Bugs found while building and play-testing this are logged in [BUGS.md](BUGS.md).
