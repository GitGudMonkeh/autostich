import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DESKTOP_MIN, PHONE_MAX, DT_NAME, DT } from "./desktopBreakpoint.js";

/* #viewport-1280 — the completeness guard for the threshold move (22.08.2026).
   ============================================================================

   WHAT THIS IS FOR. Moving the desktop threshold touched twelve media queries, one `@theme` token,
   one JS constant and roughly 250 comments. The failure mode of a change that shape is not a loud
   one: it is ONE forgotten site that keeps the old number and quietly shows the wrong branch on a
   band of window widths nobody opens. No other guard in this suite would notice — they all slice the
   stylesheet with an anchor that is itself derived from the threshold, so they follow it wherever it
   goes. That is exactly right for them and exactly why the completeness question needs its own guard.

   IT COMPUTES, IT DOES NOT COMPARE SPELLINGS. Nothing below asserts "the number is 1280". Every
   assertion states a RELATIONSHIP and derives both sides:

     · the counter-edge equals the token minus 0.02 — computed, not typed;
     · every wide `min-width` equals the token or is a named exception — compared against the token;
     · `DESKTOP_MIN` equals the `@theme` token — two sources, one comparison.

   Change the threshold again and this file needs no edit. Type it in one place only and it fails.

   THE ONE THING THAT IS NOT DERIVED is the OLD value, 1400, in assertion 1. It cannot be: nothing in
   the current tree knows what the previous threshold was. It is a migration guard, and its exception
   list is the record of which surviving occurrences were examined and deliberately kept.

   1399 is folded into the same scan. The counter-edge moved with the threshold, and a forgotten
   `1399` is the same defect wearing the other hat. The contract asks only for 1400; this is strictly
   stronger and currently costs nothing — there are no surviving 1399s in `src/`.

   COUNTER-CHECKED. Not "written and green". A media query was reinstated at the old value, this
   guard was watched failing on assertions 1 and 2, and the change was reverted. The record is in
   docs/workstreams/viewport-1280/evidence-T1.md. A guard nobody has seen fail is not evidence —
   that is how the i18n key guard stayed vacuous for months (evidence-T1.md §3). */

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

/* Binary assets are skipped by extension. A DENY list rather than an allow list, deliberately: a new
   text format added to `src/` must be scanned by default. An allow list would let it through in
   silence, and silence is the failure mode this whole file exists to prevent. */
const BINARY = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp3", "wav", "ogg", "woff", "woff2", "ttf", "otf", "ico", "mp4", "webm", "avif"]);

/* RECURSIVE. The i18n key guard read only the top level of four directories and therefore never saw
   `src/ui/tutorial/`, `src/ui/fx/` or `src/ui/indicators/` — it reported "0 unused" because it was
   structurally unable to report anything else (evidence-T1.md §3). The reach of this walk is asserted
   below rather than assumed. */
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (!BINARY.has(e.name.split(".").pop().toLowerCase())) out.push(p);
  }
  return out;
};
const FILES = walk(SRC).map((p) => ({ path: p, rel: p.slice(SRC.length).replace(/\\/g, "/") }));
const text = new Map(FILES.map((f) => [f.rel, readFileSync(f.path, "utf8")]));

/* Every occurrence of a bare `1400` / `1399` in `src/`, with its location and its line. */
const STALE = /(?<!\d)1(?:400|399)(?!\d)/;
const hits = [];
for (const { rel } of FILES) {
  text.get(rel).split("\n").forEach((line, i) => {
    if (STALE.test(line)) hits.push({ rel, line: i + 1, text: line.trim() });
  });
}

/* ---------------------------------------------------------------- the exception list

   Each entry names a surviving occurrence and says why it is not the threshold. Two kinds only:

     · a TIMING constant that happens to be the same integer, in milliseconds;
     · a MEASUREMENT or observation recorded at a named window size.

   A measurement taken at 1400 px stays true when the threshold moves — rewriting the number to 1280
   would not carry prose forward, it would falsify a record. The one prose entry is the superseded
   rationale, which names the old value BECAUSE naming what was overturned is the point of it.

   `needle` must still be found. A stale exception fails just as loudly as a missed site — otherwise
   the list rots into a permanent hole in the guard. */
const KEPT = [
  { rel: "ui/fx/FireHead.jsx", needle: "s.life = 1400 *",
    why: "particle lifetime in milliseconds" },
  { rel: "ui/SeedChip.jsx", needle: "setCopied(false), 1400",
    why: "copy-confirmation timeout in milliseconds" },
  { rel: "ui/shopScale.js", needle: "(1400 x 700)",
    why: "measured shop-preview factor at a named window size" },
  { rel: "index.css", needle: "Gegenbegründung: 1400 statt des",
    why: "the superseded rationale, naming the value it superseded" },
  { rel: "index.css", needle: "hat innen 117 px (bei 1400)",
    why: "measured inner width of the KPI tile at a named width" },
  { rel: "index.css", needle: "1400 px → 713 / 690 / 699 / 715",
    why: "measured guide heights at a named width" },
  { rel: "index.css", needle: "Messpunkte: 1400 px → 715",
    why: "anchor point of the guide's linear interpolation" },
  { rel: "index.css", needle: "1400 x  950   Platz 762 px",
    why: "row of the guide's measurement table" },
  { rel: "index.css", needle: "Auf 1400+ px stehen sechs Kacheln",
    why: "measured tile count per row at a named width" },
  { rel: "index.css", needle: "auf einem 1400-px-Laptop überlappen",
    why: "observed overlap on a laptop of that width" },
  { rel: "index.css", needle: "1400 x 950 ohne Scrollen",
    why: "window sizes verified to fit without scrolling" },
];

describe("#viewport-1280 — the threshold moved completely", () => {
  it("the file walk reaches nested directories — otherwise everything below is vacuous", () => {
    expect(FILES.length, "the walk found almost nothing; it is not reaching src/").toBeGreaterThan(150);
    /* `ui/tutorial` stood here until the guided run was retired and the directory ceased to exist.
       It was one of five SAMPLES of "the walk descends"; the property it sampled is still covered —
       `ui/fx/cardFx` proves three levels, `ui/indicators` two. When `src/ui/tutorial-sections/`
       lands, add it here: a fifth sample costs nothing and this list is the only thing standing
       between a flat walk and a file of vacuous assertions. */
    for (const deep of ["ui/fx/cardFx", "ui/indicators", "i18n", "game"]) {
      expect(FILES.some((f) => f.rel.startsWith(deep + "/")), `the walk never reached src/${deep}/`).toBe(true);
    }
  });

  it("1. no site in src/ still carries the old threshold, apart from the named exceptions", () => {
    const matched = new Set();
    const leftovers = hits.filter((h) => {
      const k = KEPT.findIndex((e) => h.rel === e.rel && h.text.includes(e.needle));
      if (k < 0) return true;
      matched.add(k);
      return false;
    });
    expect(leftovers.map((h) => `src/${h.rel}:${h.line}  ${h.text.slice(0, 90)}`).join("\n"),
      "a site still carries the old threshold. Decide per site: carry the prose forward, or add it to "
      + "KEPT with a reason why it is not the threshold.").toBe("");

    /* The other direction: an exception that no longer matches anything is a hole in the scan above. */
    const stale = KEPT.filter((_, i) => !matched.has(i)).map((e) => `${e.rel}  «${e.needle}»`);
    expect(stale.join("\n"),
      "an exception no longer matches anything. The site was edited or removed — drop the entry.").toBe("");
  });

  it("2. every wide min-width in index.css is the token's value or a named exception", () => {
    /* 1750 is the guide's large step — a genuine second width band, not a copy of the threshold.
       Nothing else above 1000 px may exist: that is what a forgotten media query looks like. */
    const NAMED = new Map([[1750, "the guide's large step"]]);
    const wide = [...css.matchAll(/min-width:\s*([\d.]+)px/g)].map((m) => Number(m[1])).filter((n) => n > 1000);

    expect(wide.filter((n) => n === DESKTOP_MIN).length,
      "not one wide min-width equals the token — the desktop block is gone or the parse is broken, "
      + "and this assertion would pass on an empty list").toBeGreaterThan(0);
    expect([...new Set(wide.filter((n) => n !== DESKTOP_MIN && !NAMED.has(n)))].join(", "),
      `a min-width above 1000 px is neither --breakpoint-${DT_NAME} (${DESKTOP_MIN}px) nor a named band`).toBe("");
  });

  it("3. every counter-edge is derived from a threshold, never hand-typed", () => {
    /* A counter-edge is identified by SHAPE: a fractional max-width is the "just below the
       breakpoint" idiom, and this stylesheet uses one per threshold it has to sit under. Deriving the
       expected number is the whole point — a hand-typed 1279.98 beside a token that says something
       else is precisely the drift this guards against.

       There were two thresholds from `mobile-tile-build` (2026-08-23) onward, and the assertion moved
       from "exactly one edge" to "every edge is derived" rather than being relaxed: the count was
       never the invariant, the derivation was. The set is closed — an edge that matches neither
       threshold still fails, which is what keeps a stray media query from hiding here.

         · DESKTOP_MIN − 0.02  — just below the desktop block. Required: without it the desktop
           counter-edge is gone and this assertion would pass on an empty list.
         · PHONE_MAX           — the phone branch, just below Tailwind's built-in `sm:` (640px).
           Tailwind ships that breakpoint, so it has no `--breakpoint-*` token to read; the number
           lives in src/ui/useIsWide.js and this is where the CSS copy is checked against it. */
    const edges = [...css.matchAll(/max-width:\s*(\d+\.\d+)px/g)].map((m) => Number(m[1]));
    const near = (a, b) => b != null && Math.abs(a - b) < 1e-5;

    expect(edges.filter((e) => near(e, DESKTOP_MIN - 0.02)).length,
      `no fractional max-width equals --breakpoint-${DT_NAME} minus 0.02 — the desktop counter-edge `
      + "is gone, and without this check the assertion below would pass on an empty list").toBeGreaterThan(0);

    const strays = edges.filter((e) => !near(e, DESKTOP_MIN - 0.02) && !near(e, PHONE_MAX));
    expect([...new Set(strays)].join(", "),
      `a fractional max-width is neither --breakpoint-${DT_NAME} minus 0.02 (${DESKTOP_MIN - 0.02}) nor `
      + `PHONE_MAX (${PHONE_MAX}) from src/ui/useIsWide.js. Counter-edges are derived from a threshold, `
      + "never typed by hand.").toBe("");
  });

  it("4. the named variant is the only route — no arbitrary min-[Npx]: survives in src/", () => {
    const arbitrary = [];
    for (const { rel } of FILES) {
      text.get(rel).split("\n").forEach((line, i) => {
        const m = line.match(/min-\[\d+px\]:/);
        if (m) arbitrary.push(`src/${rel}:${i + 1}  ${m[0]}`);
      });
    }
    /* Vacuity check first: if the named variant were absent too, the assertion below would pass on a
       codebase that had simply lost its desktop utilities. */
    const named = FILES.filter(({ rel }) => text.get(rel).includes(DT)).length;
    expect(named, `no file uses the '${DT}' variant — the scan is reading nothing useful`).toBeGreaterThan(5);
    expect(arbitrary.join("\n"),
      `an arbitrary width variant is back. The threshold has a name (--breakpoint-${DT_NAME}); spelling `
      + "it out again is how it drifts.").toBe("");
  });

  it("5. the @theme block defines exactly one breakpoint, and DESKTOP_MIN equals it", () => {
    /* Stated here as an assertion although test/desktopBreakpoint.js already refuses to load when
       either half is violated. The throw is correct — every anchor in the suite is wrong the moment
       the two drift, and one sentence beats twenty confusing failures — but a rule that lives only
       inside a thrown Error is a rule no reader finds. It is written out once, here. */
    const at = css.indexOf("@theme");
    const theme = at < 0 ? "" : css.slice(at, css.indexOf("\n}", at));
    const tokens = [...theme.matchAll(/--breakpoint-([a-z0-9-]+):\s*(\d+)px/g)];

    expect(tokens.map((t) => t[1]).join(", "),
      "exactly one project breakpoint is expected — a second one means a third layout tier").toBe(DT_NAME);
    expect(Number(tokens[0][2]),
      `--breakpoint-${DT_NAME} in src/index.css and DESKTOP_MIN in src/ui/useIsWide.js describe the same `
      + "threshold. A media query cannot read a custom property, so the copy exists by necessity — "
      + "this is the one place it is checked.").toBe(DESKTOP_MIN);
  });
});
