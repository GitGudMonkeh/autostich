/* #viewport-1280 — the desktop breakpoint, for guards that need to name it.

   NOT a test file — the name carries no `.test.js` suffix, so vitest's `include` pattern in
   vite.config.js does not pick it up. (The pattern is not written out here: it contains the
   two characters that end a block comment, and an earlier draft of this file terminated its own
   header mid-sentence exactly that way. The same trap is documented for backticks in
   scripts/viewport-proof.mjs.)

   WHY THIS EXISTS. Roughly thirty guards slice `src/index.css` into a phone half and a desktop half,
   and every one of them used to do it by typing the media query out:

     css.indexOf("@media (min-width: 1280px) {")

   That string is a STRUCTURAL TOOL — the guards are about `display: contents` brackets, about panels
   keeping their modifier, about the stage layout. None of them is an assertion that the threshold is
   1280. But written that way, changing the threshold turns thirty structural guards red at once, and
   a red guard that only means "the number moved" is indistinguishable from one that means "the
   layout broke". That is the expensive kind of noise: it arrives exactly when you most need the
   suite to be trustworthy.

   So everything here is COMPUTED from the two places the threshold actually lives. A guard that
   recomputes the rule cannot drift from it; a guard that spells the rule out a second time only
   proves somebody typed the same number twice (docs/engineering/testing.md §4).

   WHAT IS DELIBERATELY *NOT* HERE. No `deskBlock()` helper, although a dozen files carry the same
   brace-counting IIFE. Deduplicating that is a refactor, this is a threshold change, and mixing the
   two would make the diff unreviewable. The IIFEs stay where they are; only their anchor moves. */

import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ---------------------------------------------------------------- the JS side

   READ as text, not IMPORTED — and that is a measurement, not a preference.

   `useIsWide.js` is a React hook module: importing it pulls React into every guard that needs the
   number. Twenty-three guards do, and vitest isolates per file, so React would be evaluated
   twenty-three times that it never was before. Reading the file costs one `readFileSync`.

   The regex is itself a guard. `DESKTOP_MIN` is a plain integer literal; if it is ever renamed,
   computed, or moved, this throws with a sentence saying so, instead of quietly exporting `undefined`
   and letting every anchor below degrade into a string that matches nothing. */
const HOOK = "../src/ui/useIsWide.js";
const hookHit = read(HOOK).match(/^export const DESKTOP_MIN = (\d+);$/m);
if (!hookHit) {
  throw new Error(`${HOOK}: no 'export const DESKTOP_MIN = <integer>;' found. The desktop breakpoint `
    + `moved or changed shape — update test/desktopBreakpoint.js to follow it, do not hard-code the number here.`);
}
export const DESKTOP_MIN = Number(hookHit[1]);

/* The PHONE side of the same file, read the same way and for the same reasons.

   `PHONE_MAX` is a fractional literal, not an integer: it is the „just below" counter-edge of
   Tailwind's built-in `sm:` (640px), which — unlike the desktop threshold — has no `--breakpoint-*`
   token in `@theme`, because Tailwind ships it. There is therefore nothing in the CSS to compare it
   against except the media query that spells it, which is exactly what
   `viewport-1280.test.js` test 3 does.

   Absence is NOT an error here. The phone branch was added by `mobile-tile-build`; a checkout without
   it is a valid checkout, and a guard that threw on its absence would fail on every commit before it. */
const phoneHit = read(HOOK).match(/^export const PHONE_MAX = (\d+\.\d+);$/m);
export const PHONE_MAX = phoneHit ? Number(phoneHit[1]) : null;

/* ---------------------------------------------------------------- the CSS side

   The Tailwind variant prefix is NOT derived from the number — it is read out of the `@theme` block,
   token name and all. `--breakpoint-dt: 1280px` is what makes `dt:` exist; deriving the prefix from
   anything else would be guessing at Tailwind's behaviour rather than reading the declaration that
   causes it. Rename the token and every guard below follows on the next run.

   Exactly one project-defined breakpoint is expected. Tailwind's built-in sm/md/lg/xl/2xl are not in
   this block, so a second entry here would mean somebody added a layout tier — which this codebase
   does not have, and which would silently change what "the desktop block" refers to. */
const CSS = read("../src/index.css");
const themeAt = CSS.indexOf("@theme");
const theme = themeAt < 0 ? "" : CSS.slice(themeAt, CSS.indexOf("\n}", themeAt));
const tokens = [...theme.matchAll(/--breakpoint-([a-z0-9-]+):\s*(\d+)px/g)];
if (tokens.length !== 1) {
  throw new Error(`src/index.css @theme: expected exactly one --breakpoint-* token, found ${tokens.length}`
    + `${tokens.length ? ` (${tokens.map((t) => t[1]).join(", ")})` : ""}. `
    + `A second one would mean a third layout tier, which this project does not have.`);
}

/* The two sides must agree, and nothing in the build enforces that: a CSS media query cannot read a
   custom property, so `useIsWide.js` carries its own copy of the number by necessity. This is the
   one place where the copy is checked. Thrown rather than asserted in a single test, because every
   anchor below is wrong the moment the two drift — a clear sentence beats twenty confusing failures. */
const tokenPx = Number(tokens[0][2]);
if (tokenPx !== DESKTOP_MIN) {
  throw new Error(`Desktop breakpoint drift: --breakpoint-${tokens[0][1]} is ${tokenPx}px in `
    + `src/index.css, but DESKTOP_MIN is ${DESKTOP_MIN} in src/ui/useIsWide.js. Both describe the same `
    + `threshold and must be changed together.`);
}

/* The Tailwind variant prefix, e.g. `dt:`. */
export const DT_NAME = tokens[0][1];
export const DT = `${DT_NAME}:`;

/* ---------------------------------------------------------------- derived forms */

/* The media query as it appears in index.css, character for character. Anything that indexes into
   the stylesheet uses this. */
export const DESKTOP_AT = `@media (min-width: ${DESKTOP_MIN}px)`;

/* The block opener. Several guards anchor on the trailing brace on purpose: `@media (min-width: X)`
   also prefixes the compound queries (`... and (max-height: 950px)`), and a guard that wants THE
   desktop block rather than the first compound one must say so. Both forms are exported so the
   distinction stays visible at the call site instead of hiding in a stray " {". */
export const DESKTOP_BLOCK_AT = `${DESKTOP_AT} {`;

/* Regex-safe forms. The media query contains `(` and `)`; a variant prefix may contain `-`.
   Building a RegExp from an unescaped constant would silently produce something other than a
   literal, and the guard would pass against text it never meant to match. */
export const rxEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const DESKTOP_AT_RX = rxEscape(DESKTOP_AT);
export const DT_RX = rxEscape(DT);

/* A compound desktop query, e.g. `desktopAnd("max-height: 950px")`. The height and width bands are
   written as `(min-width: X) and (max-…: Y)` throughout index.css; this keeps the left half derived
   while the right half stays literal, because the right half is what those guards are actually
   about. */
export const desktopAnd = (cond) => `${DESKTOP_AT} and (${cond})`;
export const desktopAndRx = (cond) => rxEscape(desktopAnd(cond));
