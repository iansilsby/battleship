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
