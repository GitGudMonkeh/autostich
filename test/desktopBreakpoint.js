/* #viewport-1280 — the desktop breakpoint, for guards that need to name it.

   NOT a test file — the name carries no `.test.js` suffix, so vitest's `include` pattern in
   vite.config.js does not pick it up. (The pattern is not written out here: it contains the
   two characters that end a block comment, and an earlier draft of this file terminated its own
   header mid-sentence exactly that way. The same trap is documented for backticks in
   scripts/viewport-proof.mjs.)

   WHY THIS EXISTS. Roughly thirty guards slice `src/index.css` into a phone half and a desktop half,
   and every one of them used to do it by typing the media query out:

     css.indexOf("@media (min-width: 1400px) {")

   That string is a STRUCTURAL TOOL — the guards are about `display: contents` brackets, about panels
   keeping their modifier, about the stage layout. None of them is an assertion that the threshold is
   1400. But written that way, changing the threshold turns thirty structural guards red at once, and
   a red guard that only means "the number moved" is indistinguishable from one that means "the
   layout broke". That is the expensive kind of noise: it arrives exactly when you most need the
   suite to be trustworthy.

   So everything here is COMPUTED from `DESKTOP_MIN`, the constant the application itself reads
   (`src/ui/useIsWide.js`). A guard that recomputes the rule cannot drift from it; a guard that spells
   the rule out a second time only proves somebody typed the same number twice
   (docs/engineering/testing.md §4).

   WHAT IS DELIBERATELY *NOT* HERE. No `deskBlock()` helper, although a dozen files carry the same
   brace-counting IIFE. Deduplicating that is a refactor, this is a threshold change, and mixing the
   two would make the diff unreviewable. The IIFEs stay where they are; only their anchor moves. */

/* READ as text, not IMPORTED — and that is a measurement, not a preference.

   `useIsWide.js` is a React hook module: importing it pulls React into every guard that needs the
   number. Twenty-three guards do. Vitest isolates per file, so React would be evaluated twenty-three
   times that it never was before. Measured on this suite: cumulative test time went 58.97s → 72.2s
   (+23 %), and `test/i18n-guards.test.js` — a CPU-bound scan that needs 2.1s on its own against a 5s
   timeout — began failing under the extra contention. Reading the file costs one `readFileSync`.

   The regex is itself a guard. `DESKTOP_MIN` is a plain integer literal; if it is ever renamed,
   computed, or moved, this throws with a sentence saying so, instead of quietly exporting `undefined`
   and letting every anchor below degrade into a string that matches nothing. */
import { readFileSync } from "node:fs";

const HOOK = "../src/ui/useIsWide.js";
const hookSrc = readFileSync(new URL(HOOK, import.meta.url), "utf8");
const hit = hookSrc.match(/^export const DESKTOP_MIN = (\d+);$/m);
if (!hit) {
  throw new Error(`${HOOK}: no 'export const DESKTOP_MIN = <integer>;' found. The desktop breakpoint `
    + `moved or changed shape — update test/desktopBreakpoint.js to follow it, do not hard-code the number here.`);
}

export const DESKTOP_MIN = Number(hit[1]);

/* The media query as it appears in index.css, character for character. Anything that indexes into
   the stylesheet uses this. */
export const DESKTOP_AT = `@media (min-width: ${DESKTOP_MIN}px)`;

/* The block opener. Several guards anchor on the trailing brace on purpose: `@media (min-width: X)`
   also prefixes the compound queries (`... and (max-height: 950px)`), and a guard that wants THE
   desktop block rather than the first compound one must say so. Both forms are exported so the
   distinction stays visible at the call site instead of hiding in a stray " {". */
export const DESKTOP_BLOCK_AT = `${DESKTOP_AT} {`;

/* The Tailwind variant prefix used in the JSX. Computed, not transcribed — the arbitrary variant
   carries the same number as the media query, and that is precisely the coupling under test. */
export const DT = `min-[${DESKTOP_MIN}px]:`;

/* Regex-safe forms. The variant contains `[`, `]` and `-`; the media query contains `(` and `)`.
   Building a RegExp from an unescaped constant would silently produce a character class instead of
   a literal, and the guard would pass against text it never meant to match. */
export const rxEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const DESKTOP_AT_RX = rxEscape(DESKTOP_AT);
export const DT_RX = rxEscape(DT);

/* A compound desktop query, e.g. `desktopAnd("max-height: 950px")`. The height and width bands are
   written as `(min-width: X) and (max-…: Y)` throughout index.css; this keeps the left half derived
   while the right half stays literal, because the right half is what those guards are actually
   about. */
export const desktopAnd = (cond) => `${DESKTOP_AT} and (${cond})`;
export const desktopAndRx = (cond) => rxEscape(desktopAnd(cond));
