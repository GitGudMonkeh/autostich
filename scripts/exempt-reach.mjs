/* How far does one exemption reach?
   ============================================================================
   #menu-rework MH4. An exemption in `test/panel-tokens.test.js` names a SELECTOR, and a selector
   stands in both halves of the stylesheet. The entry written for a phone rule silently took the
   desktop rule of the same class out with it — measured at C4/CC1 and CC2, which stayed GREEN with
   `#141419` and `#2a2a33` back at the call site.

   This tool counts which entries reach across the threshold. It JUDGES NOTHING: where both halves
   share the reason — a screen margin is layout at any width — the reach is harmless, and that is the
   majority. It is a defect only where the reasons differ, and only whoever knows the screen can say.

   Written as task evidence (`docs/workstreams/mainscreen-branding/evidence/C4/`) and promoted here,
   the way M8's stub and MR1's probes were before it — and moved from "sits inside the 1280 block" to
   "which widths does the rule admit", so the nested height blocks count correctly.

   Run:  node scripts/exempt-reach.mjs
   ============================================================================ */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const wurzel = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, wurzel), "utf8");

/* Comments out first. A rationale that names a selector must count neither as a rule nor as an
   exemption entry — the same trap MH3 fell into. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* The threshold is READ from the sheet, never transcribed. */
export function schwelle(css) {
  const m = css.match(/--breakpoint-dt:\s*([\d.]+)px/);
  return m ? parseFloat(m[1]) : null;
}

export function mediaBloecke(css) {
  const out = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    let tiefe = 0, ende = css.length;
    for (let j = m.index + m[0].length - 1; j < css.length; j++) {
      if (css[j] === "{") tiefe++;
      else if (css[j] === "}" && --tiefe === 0) { ende = j; break; }
    }
    out.push({ kopf: m[1].trim(), start: m.index, ende });
  }
  return out;
}

/* Which half a rule REACHES — not which block it sits in. A rule without a width condition reaches
   both, and that is the normal case. `min-width: 641px` reaches both as well, because 641 is below
   the threshold: the question is never "does it have a media query" but "which widths does it
   admit". */
export function haelften(medien, dt) {
  let handy = true, desktop = true;
  for (const kopf of medien) {
    for (const b of kopf.matchAll(/\(\s*(min|max)-width\s*:\s*([\d.]+)px\s*\)/g)) {
      const wert = parseFloat(b[2]);
      if (b[1] === "min") { if (wert >= dt) handy = false; }
      else if (wert < dt) desktop = false;
    }
  }
  return { phone: handy, desktop };
}

/* Every rule of the sheet with the halves it reaches. */
export function regeln(cssRoh) {
  const css = strip(cssRoh);
  const dt = schwelle(cssRoh);
  const bloecke = mediaBloecke(css);
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().split("\n").pop().trim();
    if (!sel || sel.startsWith("@")) continue;
    const medien = bloecke.filter((b) => m.index >= b.start && m.index < b.ende).map((b) => b.kopf);
    out.push({ sel, medien, ...haelften(medien, dt) });
  }
  return out;
}

/* The exemption entries, read from the guard's SOURCE TEXT rather than imported: lists that do not
   exist yet are picked up too, and nobody has to maintain a registry that can be forgotten.
   Qualified entries — `nurHandy(/…/)` — carry their half in the call. */
export function eintraege(guardRoh) {
  const guard = strip(guardRoh);
  const out = [];
  for (const [, name, rumpf] of guard.matchAll(/const (\w*EXEMPT)\s*=\s*\[([\s\S]*?)\n\];/g)) {
    for (const m of rumpf.matchAll(/(nurHandy\(|nurDesktop\()?\/(\^?[^/\n]+?)\/[gimsuy]*\s*[,)]/g)) {
      let re;
      try { re = new RegExp(m[2]); } catch { continue; }
      const haelfte = m[1] ? (m[1].startsWith("nurHandy") ? "phone" : "desktop") : null;
      out.push({ liste: name, quelle: `/${m[2]}/`, re, haelfte });
    }
  }
  return out;
}

/* The measurement: which entry covers rules in BOTH halves. A qualified entry only covers its own,
   so it stops appearing here — which is the point. */
export function reichweite(cssRoh = lies("src/index.css"), guardRoh = lies("test/panel-tokens.test.js")) {
  const alle = regeln(cssRoh);
  const treffer = [], beide = [], nurOben = [];
  for (const e of eintraege(guardRoh)) {
    const hit = alle.filter((r) => e.re.test(r.sel)
      && (!e.haelfte || (e.haelfte === "phone" ? r.phone : r.desktop)));
    if (!hit.length) continue;
    treffer.push(e);
    /* TWO SEPARATE RULES AT TWO SITES — that is the shape of the defect. A rule that does not reach
       the phone range sits above the threshold; every other rule carries values that apply below it,
       and that includes the base rules: they are the narrow version's value carrier, which is how the
       exemption lists describe them themselves. An entry covering something from both groups takes
       two rules out under one reason. */
    const d = hit.filter((r) => !r.phone).length;
    const p = hit.length - d;
    if (d && p) beide.push({ ...e, phone: p, desktop: d });
    /* THE SECOND GROUP, and it is why the original probe counted sixteen where five reach across the
       threshold: an entry covers several rules that ALL sit above it, but in different blocks — a
       width block and a height variant of it (`… and (max-height: 950px)`) for the flat desktop
       window. The original knew only the first block and treated every rule outside it as a phone
       rule. They are listed apart, because a double grip WITHIN one half is not the kind of reach
       MH4 is looking for. */
    else if (d > 1 && !p) nurOben.push({ ...e, desktop: d });
  }
  return { treffer, beide, nurOben };
}

/* Print only on a direct run — silent as a module, so the guard can use this implementation instead
   of a copy of it. */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { treffer, beide, nurOben } = reichweite();
  console.log(`exemption entries that match at least one rule: ${treffer.length}`);
  console.log(`entries that reach BOTH halves, across the ${schwelle(lies("src/index.css"))}px threshold: ${beide.length}`);
  for (const e of beide) {
    console.log(`   ${e.liste}  ${e.quelle}  -> ${e.phone} phone rule(s) + ${e.desktop} desktop rule(s)`);
  }
  console.log(`entries covering several rules that ALL sit above the threshold: ${nurOben.length}`);
  console.log("   (a width block and a height variant of it — not a reach across the threshold)");
  for (const e of nurOben) {
    console.log(`   ${e.liste}  ${e.quelle}  -> ${e.desktop} desktop rule(s)`);
  }
}
