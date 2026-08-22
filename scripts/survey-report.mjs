#!/usr/bin/env node
/* #viewport-1280 commit 4 — turn the raw matrix into a readable finding.
   ============================================================================

     node scripts/survey-report.mjs        # reads evidence/survey/matrix.json, writes findings.md

   WHY AGGREGATE. Five sizes by two languages by eight surfaces is 80 cells and roughly 170 numbers.
   Printed raw that is not a finding, it is a haystack (contract §5.4). One row per surface, carrying
   the WORST value and the size and language where it occurred, is what can be acted on.

   WHY EVERY NUMBER IS A DELTA AGAINST 1920. This is the part that decides whether the survey says
   anything at all. Measured on the first trial run: the shop reports 20 overflowing elements and 13
   outside their panel at 1280 — and exactly the same 20 and 13 at 1920. Those are a property of the
   screen, or of this probe's panel heuristic, and they are NOT a consequence of the threshold move.
   Reporting them as findings would bury the four surfaces where the count really does go from 0 at
   1920 to non-zero at 1280.

   So each cell is compared against the same surface in the same language at the reference width, and
   what is reported is what the narrower viewport ADDS. The absolute numbers stay in matrix.json for
   anyone who wants them.

   SORTED BY DAMAGE, largest first, per contract §5.4. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "docs/workstreams/viewport-1280/evidence/survey");
const REFERENCE = "1920x1080";

const m = JSON.parse(readFileSync(join(DIR, "matrix.json"), "utf8"));
const cell = (lang, size, id) => m.cells[`${lang}/${size}/${id}`];
const surfaces = [...new Set(Object.keys(m.cells).map((k) => k.split("/")[2]))];

const maxPx = (list, axis) => list && list.length ? Math.max(...list.map((o) => o[axis])) : 0;

/* Text shrinkage is computed HERE, not at measure time, and that is a correction.

   The runner used to derive it while measuring, which worked only as long as the whole matrix ran in
   one pass. It does not: the full run takes long enough that it is executed one size at a time, and
   a chunk holds no 1920 cell to compare against — so the criterion silently evaluated to nothing.
   Measured: the guide reported 60 shrunk nodes in a single-pass run and zero after chunking, with no
   change to the app in between.

   Deriving it in the report instead means it is computed from the merged matrix, once, against
   whatever reference is on file. The raw cells keep only what was observed. */
function shrunkNodes(cell, ref) {
  if (!cell || !cell.type || !ref || !ref.type) return [];
  const at = new Map(ref.type.map((t) => [t.path, t]));
  const out = [];
  for (const t of cell.type) {
    const r = at.get(t.path);
    if (r && t.size < r.size - 0.01) {
      out.push({ path: t.path, here: t.size, at: r.size, text: t.text });
    }
  }
  return out;
}

const rows = [];
for (const id of surfaces) {
  const worst = { id, scrollX: 0, scrollY: 0, overflow: 0, overflowPx: 0, outside: 0, truncated: 0, shrunk: 0,
    at: {}, unreached: [], refMissing: false, worstElement: null };
  for (const lang of m.langs) {
    const ref = cell(lang, REFERENCE, id);
    if (!ref || !ref.reached) { worst.refMissing = true; continue; }
    for (const size of m.sizes) {
      if (size === REFERENCE) continue;
      const c = cell(lang, size, id);
      if (!c) continue;
      if (!c.reached) { worst.unreached.push(`${lang}/${size}`); continue; }
      const take = (key, value) => {
        if (value > worst[key]) { worst[key] = value; worst.at[key] = `${lang} ${size}`; }
      };
      take("scrollX", Math.max(0, c.pageScroll.x - ref.pageScroll.x));
      take("scrollY", Math.max(0, c.pageScroll.y - ref.pageScroll.y));
      take("overflow", Math.max(0, c.overflows.length - ref.overflows.length));
      take("outside", Math.max(0, c.outside.length - ref.outside.length));
      take("truncated", Math.max(0, c.truncated.length - ref.truncated.length));
      take("shrunk", shrunkNodes(c, ref).length);
      /* The widest single overflow the narrow viewport adds, plus what caused it. */
      const refPaths = new Set(ref.overflows.map((o) => o.path));
      const added = c.overflows.filter((o) => !refPaths.has(o.path));
      const px = Math.max(maxPx(added, "x"), maxPx(added, "y"));
      if (px > worst.overflowPx) {
        worst.overflowPx = Math.round(px * 10) / 10;
        worst.at.overflowPx = `${lang} ${size}`;
        const bad = added.find((o) => Math.max(o.x, o.y) === px);
        worst.worstElement = bad ? `${bad.tag} ${bad.path}` : null;
      }
    }
  }
  rows.push(worst);
}

/* Damage order: pixels of overflow first, then counts. */
const damage = (r) => [r.overflowPx, r.outside, r.overflow, r.truncated, r.shrunk, r.scrollY + r.scrollX];
rows.sort((a, b) => {
  const A = damage(a), B = damage(b);
  for (let i = 0; i < A.length; i++) if (B[i] !== A[i]) return B[i] - A[i];
  return a.id.localeCompare(b.id);
});

const cellTxt = (v, at) => (v ? `**${v}**${at ? ` (${at})` : ""}` : "—");
let md = `| Surface | Worst added overflow | Outside panel | Overflowing elements | Truncated | Shrunk text | Page scroll |\n`;
md += `| --- | --- | --- | --- | --- | --- | --- |\n`;
for (const r of rows) {
  md += `| \`${r.id}\` | ${r.overflowPx ? `**${r.overflowPx} px** (${r.at.overflowPx})` : "—"} `
    + `| ${cellTxt(r.outside, r.at.outside)} | ${cellTxt(r.overflow, r.at.overflow)} `
    + `| ${cellTxt(r.truncated, r.at.truncated)} | ${cellTxt(r.shrunk, r.at.shrunk)} `
    + `| ${r.scrollX || r.scrollY ? `**${r.scrollX}×${r.scrollY} px** (${r.at.scrollY || r.at.scrollX})` : "none"} |\n`;
}

const unreached = rows.flatMap((r) => r.unreached.map((u) => `${r.id} @ ${u}`));
const total = Object.keys(m.cells).length;
const notReached = Object.values(m.cells).filter((c) => !c.reached).length;

md += `\nEvery number is what the narrower viewport **adds** over the same surface, same language, at
${REFERENCE}. Absolute values are in \`matrix.json\`.\n`;
md += `\n${total} cells measured, ${notReached} not reached${unreached.length ? `: ${unreached.join(", ")}` : "."}\n`;

/* The worst offending elements, so a repair task has somewhere to start. */
md += `\n### Worst single elements\n\n`;
for (const r of rows.filter((x) => x.overflowPx > 0)) {
  md += `- \`${r.id}\` — ${r.overflowPx} px at ${r.at.overflowPx}: \`${r.worstElement || "unknown"}\`\n`;
}

writeFileSync(join(DIR, "findings-table.md"), md);
process.stdout.write(md);
process.stdout.write(`\nwritten -> ${join(DIR, "findings-table.md")}\n`);
