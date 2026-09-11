# battleship

Transformers-themed browser Battleship — **Autobots vs Decepticons** — against an AI opponent with
four difficulty levels. Vanilla HTML, CSS and JavaScript: no frameworks, no build step, no backend.

**Play it live: https://iansilsby.github.io/battleship/**

You can also just open `index.html` directly from disk (`file://`), or serve the repo root:

```bash
python3 -m http.server 8000   # or: npm start
```

## How to play

1. **Enter the war** from the landing page and **choose your side** — Autobots or Decepticons. The
   whole UI recolours to your faction and the AI takes the other one.
2. **Deploy your forces.** Pick a difficulty (Easy / Medium / Hard / Expert), open *How to play* if
   you need a refresher, then select a unit from your rack and click a cell on your grid to deploy it.
   Press `R` or the rotate button to switch orientation, or use **Random**. Units may not overlap or
   leave the board; an invalid preview shows in red. Deployed units are drawn as their vehicle form
   on the grid.
3. **Begin the battle**, then click the enemy grid to fire. Shots alternate: you, then the AI.
   Hits, misses and destroyed units are shown on both grids, every destroyed unit is announced by
   name in the bulleted battle log, and the scoreboard tracks shots / hits / destroyed for each side.
   Destroyed enemy vehicles are revealed on the enemy grid; everything is revealed at game over.
   **New battle** resets the boards, **Switch side** goes back to faction selection.

| Size | Autobot (vehicle) | Decepticon (vehicle) |
| --- | --- | --- |
| 5 | Optimus Prime — semi truck | Megatron — fusion tank |
| 4 | Ironhide — armoured pickup | Starscream — fighter jet |
| 3 | Ratchet — rescue truck | Blackout — attack helicopter |
| 3 | Jazz — sports car | Barricade — police cruiser |
| 2 | Bumblebee — compact car | Frenzy — scout buggy |

Standard 10×10 grid with the classic Carrier/Battleship/Cruiser/Submarine/Destroyer sizes.

## AI opponent

`src/ai.js` implements hunt-and-target with a difficulty dial:

| Level | Behaviour | ~shots to win |
| --- | --- | --- |
| Easy | Uniformly random shots; ignores hits | 95 |
| Medium | Random hunt; after a hit, fires at adjacent cells | 57 |
| Hard | Checkerboard-parity hunt → adjacent target → follow the line of hits from both ends | 51 |
| Expert | Hard, plus hunting picks the parity cell where the most remaining ship placements fit | 46 |

(Averages over 50 self-played games.) At every level the AI only ever chooses untried cells.

## Layout

| File | Role |
| --- | --- |
| `src/game.js` | Board, ship placement, shot resolution, win detection — no DOM |
| `src/ai.js` | Difficulty-aware hunt-and-target opponent — no DOM |
| `src/factions.js` | Autobot / Decepticon unit names, vehicles, mottos and image paths — no DOM |
| `src/main.js` | Screens, rendering, input, turn flow |
| `img/*.svg` | Hand-drawn vehicle illustrations and faction emblems |
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
progression, every difficulty finishing games without repeating a shot, the Expert density search,
and that both factions map onto the standard five sizes with existing image files.

## Bugs

Bugs found while building and play-testing this are logged in [BUGS.md](BUGS.md).
