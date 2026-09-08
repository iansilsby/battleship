# battleship

Browser Battleship vs an AI opponent. Built with Devin.

Plain HTML/CSS/ES modules — no build step and no dependencies.

## Play

```bash
python3 -m http.server 8000   # or: npm start
```

Then open http://localhost:8000. Place your five ships (click a cell, press `R` to rotate, or use
"Random placement"), start the battle, and take alternating shots at enemy waters.

## AI opponent

- **Easy** — fires at random untried cells.
- **Medium** — classic hunt & target: parity search until a hit, then works the adjacent cells.
- **Hard** — probability density search: for each remaining ship it counts every legal placement
  covering each untried cell, weighting placements that overlap unresolved hits, and fires at the
  highest-scoring cell.

## Tests

```bash
npm test
```

Covers placement rules, firing/sinking, and full self-play games for each difficulty (including a
check that hard beats random by a wide margin).
