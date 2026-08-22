/* #400 Test viewport — the shared definition behind the preview-only viewport harness.

   REACT-FREE and with no DOM access at module scope, for the same reason as previewScale.js and
   mobileTier.js: the guards must RECOMPUTE the frame size, the option choices and the frame URL
   instead of typing them a second time (docs/engineering/testing.md §4). A table that also stands in
   the test only proves that somebody wrote the same number twice.

   Why a harness exists at all: the desktop layout is dimensioned from the REAL browser viewport —
   `@media (min-width: 1280px)`, several `max-height` blocks, and the `100vw`/`100dvh` calc chain
   behind `--rn-w`/`--bf-w` in index.css. None of those can be scoped to a container, so a fixed-size
   box inside a large window would keep evaluating the large window and show a plausible but WRONG
   picture. An iframe content box is a real viewport, so media queries, `vw`/`dvh`, `matchMedia`,
   `document.body` (the portal target) and Pixi's `resizeTo: host` all resolve against the simulated
   size by themselves. The application needs no knowledge of the harness — if it ever did, the design
   would be wrong.

   PREVIEW ONLY. Every read site (main.jsx, OptionsModal.jsx) sits behind
   `import.meta.env.VITE_PREVIEW === "1"`. The gate lives THERE and not in here on purpose: Vite
   substitutes the value at build time, so a `main` build folds those branches away and drops this
   module from the graph. A gate inside this module would still pull the module into the production
   graph and would only decide at runtime what must be decided at build time. */

/* The four approved sizes. This is the one deliberate transcription in the whole feature — the set is
   a product decision (task contract §7) and has to be written down exactly once. Everything derived
   from it below is computed, never re-typed.
   2560×1440 is a VALIDATION size, not a fourth layout tier: it exists to prove the harness behaves
   when the frame is larger than the host window. */
const SIZES = [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440]];

/* `id` is what lands in the saved profile, `label` is what the option row and the harness caption
   show. Both are derived from the numbers, so an id can never drift away from the size it names. */
export const TEST_VIEWPORTS = SIZES.map(([w, h]) => ({ id: `${w}x${h}`, w, h, label: `${w} × ${h}` }));

/* "Off" as a value rather than as a missing key: the segmented control needs something to compare
   against, and an empty string keeps `findTestViewport("")` falsy without a second special case.
   Stored as `null` (see `optionValue` below) so a profile never carries an empty string around. */
export const TEST_VIEWPORT_OFF = "";

/* The recursion break. The harness loads the app into an iframe pointing at the SAME entry point, so
   without a marker the app inside the frame would build another harness, and that one another. The
   flag rides in the query string because it must survive the document boundary and be visible before
   any module runs. */
export const HARNESS_PARAM = "vp";
export const HARNESS_PARAM_OFF = "off";

export function findTestViewport(id) {
  return TEST_VIEWPORTS.find((v) => v.id === id) || null;
}

/* Is this document the one INSIDE the frame? Then it must never build a harness of its own. */
export function harnessSuppressed(search) {
  try {
    return new URLSearchParams(search || "").get(HARNESS_PARAM) === HARNESS_PARAM_OFF;
  } catch {
    return false; // A malformed query string is not a reason to suppress the app.
  }
}

/* The frame URL. The existing query string is CARRIED OVER rather than replaced: `?fxs=` (the field
   resolution override read by the compositor) and friends are exactly the knobs somebody turns while
   looking at a fixed viewport, and silently dropping them would make the harness lie about which
   settings produced the picture. Only the recursion flag is forced. */
export function harnessFrameSrc(baseUrl, search) {
  const q = new URLSearchParams(search || "");
  q.set(HARNESS_PARAM, HARNESS_PARAM_OFF);
  return `${baseUrl || "/"}?${q.toString()}`;
}

/* The single decision function used at boot. Returns the viewport entry or null; null means "mount
   the application the way it has always been mounted". */
export function activeTestViewport(options, search) {
  if (harnessSuppressed(search)) return null;
  return findTestViewport(options && options.testViewport);
}

/* The option row writes `null` for off so the saved profile stays clean — an empty string would be a
   third state that reads as neither set nor unset. */
export function optionValue(id) {
  return findTestViewport(id) ? id : null;
}

/* Switching the size means switching between two different DOCUMENTS, so it cannot happen in place —
   the top-level document either is the harness or is the app.

   `setTimeout`, not an immediate reload, and that is not a taste question: the caller reaches the
   store through a React state updater (`changeOptions` → `saveOptions`), and React runs that updater
   when it flushes at the end of the click handler. A reload fired on the same line would come BEFORE
   the flush and the chosen size would never be written — the switch would look broken exactly once
   per change, which is the hardest kind of bug to see. Yielding to the task queue puts the reload
   after the flush. */
export function reloadAfterViewportChange(win) {
  const w = win || (typeof window === "undefined" ? null : window);
  if (!w) return;

  /* Reload the TOP document, not this one — and that distinction is the whole point.

     The switch is reachable from two places: the options overlay of the normal app (top document),
     and the options overlay of the app running INSIDE the harness frame. In the second case `window`
     is the iframe. Reloading it just reloads `?vp=off`, the app inside comes back at the frame's
     existing size, and the top document never re-reads the option — so the frame keeps whatever size
     it was created with, for ever. Every further size change is silently ignored, "Off" included, so
     there is no way back out either.

     Found by manual review on 21.08.2026, after both the unit guard and the CDP comparison had
     passed: the guard exercised a fake window with no frame around it, and the comparison seeded
     localStorage directly instead of clicking the row. Neither ever switched size from inside the
     frame. test/test-viewport.test.js now covers exactly that. */
  let target = w;
  try { if (w.top && w.top.location) target = w.top; } catch { /* cross-origin: reload what we have */ }
  setTimeout(() => target.location.reload(), 0);
}
