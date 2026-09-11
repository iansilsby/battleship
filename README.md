# Battleship: Autobots vs Decepticons

Transformers-themed browser Battleship against a hunt-and-target AI with four difficulty levels, in vanilla HTML, CSS and JavaScript.

## Play live

**https://iansilsby.github.io/battleship/**

## Features

- Landing page, side selection (Autobots or Decepticons) and a UI that recolours to your faction; the AI takes the other side.
- Manual deployment with hover preview and `R` / button rotation, plus Random and Clear placement.
- Four AI difficulty levels, from purely random to a probability-density hunter.
- Units are drawn as hand-made SVG vehicle illustrations on the grid; destroyed enemy vehicles are revealed as they fall and everything is revealed at game over.
- Scoreboard with shots / hits / destroyed for both sides, a bulleted battle log, in-game "How to play" panel, New battle and Switch side.
- No frameworks, no build step, no backend, no npm dependencies. Works from `file://`.

## Fleets

Both factions map onto the standard five ship sizes on a 10×10 grid.

| Cells | Autobot | Vehicle | Decepticon | Vehicle |
| --- | --- | --- | --- | --- |
| 5 | Optimus Prime | Semi truck | Megatron | Fusion tank |
| 4 | Ironhide | Armoured pickup | Starscream | Fighter jet |
| 3 | Ratchet | Rescue truck | Blackout | Attack helicopter |
| 3 | Jazz | Sports car | Barricade | Police cruiser |
| 2 | Bumblebee | Compact car | Frenzy | Scout buggy |

## AI difficulty levels

- **Easy** — fires at uniformly random untried cells and never follows up on a hit.
- **Medium** — hunts randomly, then targets the cells adjacent to any unresolved hit.
- **Hard** — hunts on a checkerboard parity, targets adjacent cells after a hit, and once two collinear hits exist follows the line from both ends.
- **Expert** — like Hard, but hunts by picking the cell where the most remaining ship placements can still fit (a probability-density map) instead of plain parity.

At every level the AI only ever chooses cells it has not fired at.

## File structure

```
battleship/
├── index.html          # Screens and markup; loads the scripts in dependency order
├── styles.css          # Layout, faction theming, board and marker styling
├── package.json        # npm start / npm test scripts (no dependencies)
├── src/
│   ├── game.js         # Board, ship placement, shot resolution, win detection (no DOM)
│   ├── ai.js           # Difficulty-aware hunt-and-target opponent (no DOM)
│   ├── factions.js     # Autobot / Decepticon units, vehicles, mottos, image paths (no DOM)
│   └── main.js         # Screens, rendering, input, turn flow
├── img/                # SVG vehicle illustrations and faction emblems
├── test/
│   └── game.test.js    # Node test suite
├── BUGS.md             # Bug log, in the order found
└── README.md
```

`src/game.js`, `src/ai.js` and `src/factions.js` are classic scripts with a UMD-style wrapper: they export via `module.exports` under Node and attach to `window` in the browser, so the same files are unit tested and run directly from disk.

## Run locally

Open `index.html` in a browser. There is no build step. Optionally serve the repo root instead:

```bash
python3 -m http.server 8000   # or: npm start
```

## Run the tests

Node 18+ with the built-in test runner; nothing to install:

```bash
npm test
```

## Built with Devin

This game was built, tested and debugged entirely through [Devin](https://devin.ai) sessions: the original game, the AI, the themed reskins, the test suite and the fixes logged in [BUGS.md](BUGS.md) all came from Devin's own test games, unit tests and manual play.
