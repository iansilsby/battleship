# Bug log

Bugs found while building and play-testing the game, in the order they were found.

## 1. Game was blank when `index.html` was opened from disk

- **Symptom:** double-clicking `index.html` (a `file://` URL) rendered the header but no boards, and
  the console showed `Access to script ... has been blocked by CORS policy` / `Failed to load
  module script`. Served over HTTP it worked fine.
- **Root cause:** the logic was written as ES modules (`<script type="module">` + `import`). Module
  scripts are fetched with CORS, and `file://` requests have an opaque `null` origin, so the browser
  refuses to load them.
- **Fix:** dropped ES modules. `src/game.js` and `src/ai.js` are now classic scripts wrapped in a
  UMD-style IIFE that assigns to `module.exports` when `module` exists (Node tests) and to
  `window.BattleshipGame` / `window.BattleshipAI` otherwise (browser), and `index.html` loads them
  with plain `<script src>` tags in dependency order.

## 2. Page background rendered flat dark blue instead of the radial gradient

- **Symptom:** the intended vignette behind the boards never appeared.
- **Root cause:** a malformed colour literal in the `background` shorthand of `body`; one invalid
  value makes the browser discard the entire declaration.
- **Fix:** split it into `background-color` + `background-image` with valid hex colours.

## 3. AI could aim at a diagonal "line" when two ships were hit back to back

- **Symptom:** rarely, after hitting one ship and then a neighbouring one, the AI fired far away
  from either hit instead of continuing to work the damaged ships.
- **Root cause:** the line-following step assumed every unresolved hit belonged to the same ship and
  called `lineEnds()` on them; with an L-shaped hit set (two ships touching), `lineEnds()` sorted
  along the wrong axis and produced ends unrelated to the hits.
- **Fix:** `isCollinear()` guards the line step — non-collinear hit sets fall back to adjacency
  targeting, which resolves both ships correctly. Covered by the AI-mode tests in
  `test/game.test.js`.

## 4. Rotating with `R` during battle changed placement orientation

- **Symptom:** pressing `R` mid-battle flipped the rotate button's label even though the setup panel
  was hidden, leaving a stale orientation for the next game.
- **Root cause:** the `keydown` handler was registered unconditionally and did not check the phase.
- **Fix:** the handler now ignores `R` unless `state.phase === 'setup'`; `Randomize` is likewise
  guarded so it cannot rebuild the player's board once the battle has started.

The rest were found while play-testing two full games in the browser (one from `file://`, one served
over HTTP).

## 5. New Game during the AI's delay let a stale enemy shot land on the fresh board

- **Symptom:** firing a shot and then clicking **New Game** within the AI's 550 ms thinking delay
  (measured at 327 ms) produced a brand-new setup screen that already showed "Enemy shots fired: 1",
  a miss marker on the player's empty board, a log line, and the status "Your turn — fire at enemy
  waters." while the player had no fleet placed.
- **Root cause:** `playerTurn()` scheduled `aiTurn` with `setTimeout` and nothing cancelled it;
  `newGame()` replaced the boards, then the pending callback fired against the new state.
- **Fix:** the timer handle is kept in `state.aiTimer`, `newGame()` clears it, and `aiTurn()` returns
  immediately unless `state.phase === 'battle'` (belt and braces for any other pending callback).

## 6. Pressing `R` did not repaint an existing hover preview

- **Symptom:** while hovering a cell during placement, pressing `R` (or clicking Rotate) flipped the
  button label but the highlighted preview kept the old orientation until the pointer left the cell
  and came back.
- **Root cause:** the preview was painted only from `mouseenter`, so rotating never triggered a
  repaint of the cell already under the cursor.
- **Fix:** the hovered cell is tracked in `state.hovered`, and `toggleRotation()` repaints the
  preview for it.

## 7. Boards jumped around as ships were sunk

- **Symptom:** the two boards started stacked vertically and snapped side by side (shifting the
  enemy board horizontally) partway through a game.
- **Root cause:** each board column was sized by its content, and the fleet-status line under the
  board shrinks as ships sink, so the flex row's total width changed and it stopped wrapping.
- **Fix:** `.board-wrap` has a fixed width matching the grid and `.fleet-status` reserves enough
  height for the longest summary, so the layout no longer depends on how many ships are afloat.

## 8. A fleet that had not been placed yet reported "Fleet destroyed"

- **Symptom:** on a fresh game, before placing any ship, the player's fleet status read "Fleet
  destroyed".
- **Root cause:** `fleetSummary()` printed that message whenever no ship was still afloat, which is
  vacuously true for an empty board (`isFleetDestroyed()` guards against this, but the summary did
  not).
- **Fix:** an empty board now reads "No ships placed yet".

## 9. Hovering a wrecked (sunk) rival cell hid its wreck styling

- **Symptom:** moving the pointer over a sunk cell on the rival board swapped its dark-red wreck
  colour for the plain hover colour until the pointer left.
- **Root cause:** the hover rule excluded `.cell--hit` and `.cell--miss`, but sunk cells carry
  `.cell--sunk` *instead of* `.cell--hit`, so they still matched the hover selector.
- **Fix:** the enemy-board hover rules also exclude `.cell--sunk`.

## 10. Randomize still said "Fleet ready. Start the battle!" after the Hot Wheels reskin

- **Symptom:** every other status line used the garage/race wording, but Randomize did not.
- **Root cause:** `randomPlacement()` had its own copy of the ready message that was missed during
  the reskin.
- **Fix:** it now shares the same "Garage full. Start the race!" wording as manual placement.
