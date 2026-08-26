/* ============================================================
   es-translate — SELF-CHECK, run while translating.

   Why this exists at all. The real guards in test/i18n-guards.test.js already check everything
   below, and they stay the authority. But the DEMANDING half of them only arms with
   `ready: true`, and setting that flag before key parity holds is Tripwire 2 of this task's
   contract. So the choice during the work is: translate blind until the very end, or run the
   same rules early against `es` regardless of its ready state. This file is the second option.

   It is a WORKING TOOL, not a guard. It proves nothing on its own and is not a substitute for
   `npm test`. Where it and the guard file disagree, the guard file wins — the extraction helpers
   here (`placeholders`, `numbersOf`, the quote pairs) are deliberate copies of
   test/i18n-guards.test.js and must be re-synced if that file changes.

   Usage:
     node docs/workstreams/es-translate/selfcheck.mjs            # everything
     node docs/workstreams/es-translate/selfcheck.mjs skill.     # only keys with that prefix
   ============================================================ */
import de from "../../../src/i18n/de.js";
import es from "../../../src/i18n/es.js";
import { numberFormat } from "../../../src/i18n/index.js";

const prefix = process.argv[2] || "";
const SRC = de, TGT = es;
const keysSrc = Object.keys(SRC).filter((k) => k.startsWith(prefix));
const keysTgt = Object.keys(TGT).filter((k) => k.startsWith(prefix));

/* ---- helpers, copied from test/i18n-guards.test.js ---- */
const PLACEHOLDER = /\{(\w+)\}/g;
const placeholders = (s) => new Set([...String(s).matchAll(PLACEHOLDER)].map((m) => m[1]));

const numbersOf = (text, loc) => {
  const f = numberFormat(loc);
  const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const grouped = new RegExp(`(\\d)${esc(f.grp)}(\\d{3})(?!\\d)`, "g");
  let s = String(text);
  for (let i = 0; i < 3; i++) s = s.replace(grouped, "$1$2");
  if (f.dec !== ".") s = s.replace(new RegExp(`(\\d)${esc(f.dec)}(\\d)`, "g"), "$1.$2");
  return (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).sort((a, b) => a - b);
};

const QUOTES = { de: { open: "„", close: "“" }, en: { open: "“", close: "”" }, es: { open: "“", close: "”" } };
const ALL_QUOTES = [...new Set(Object.values(QUOTES).flatMap((q) => [q.open, q.close]))];
const foreignQuote = new RegExp(`[${ALL_QUOTES.filter((q) => !["“", "”"].includes(q)).join("")}]`);

const wrongDecimal = (loc) => {
  const f = numberFormat(loc);
  const foreign = f.dec === "," ? "\\." : ",";
  return new RegExp(`\\d${foreign}(\\d{1,2}(?!\\d)|\\d{4,})`);
};

/* ---- the checks ---- */
const findings = [];
const report = (label, rows) => { if (rows.length) findings.push([label, rows]); };

report("missing — key exists in de, not in es", keysSrc.filter((k) => !(k in TGT)));
report("orphan — key exists in es, not in de", keysTgt.filter((k) => !(k in SRC)));
report("empty — es value is blank", keysTgt.filter((k) => !String(TGT[k] ?? "").trim()));

report("placeholder break", keysSrc.filter((k) => {
  if (!(k in TGT)) return false;
  const a = placeholders(SRC[k]), b = placeholders(TGT[k]);
  return [...a].some((p) => !b.has(p)) || [...b].some((p) => !a.has(p));
}).map((k) => `${k}\n     de: {${[...placeholders(SRC[k])].join("},{")}}\n     es: {${[...placeholders(TGT[k])].join("},{")}}`));

report("numbers diverge", keysSrc.filter((k) => {
  if (!(k in TGT)) return false;
  const a = numbersOf(SRC[k], "de"), b = numbersOf(TGT[k], "es");
  return a.length !== b.length || a.some((n, i) => n !== b[i]);
}).map((k) => `${k}\n     de: [${numbersOf(SRC[k], "de").join(", ")}]\n     es: [${numbersOf(TGT[k], "es").join(", ")}]`));

report("foreign quote mark", keysTgt.filter((k) => foreignQuote.test(String(TGT[k]))));
report("foreign decimal separator", keysTgt.filter((k) => wrongDecimal("es").test(String(TGT[k]))));

/* Same-as-source is a HINT here, not a verdict: proper nouns, abbreviations and symbol-only rows
   legitimately match, and the guard has SAME_OK for exactly that. Listed so each one gets looked
   at once, rather than discovered in bulk at the end. */
report("identical to German — check, then either translate or add to SAME_OK.es",
  keysSrc.filter((k) => k in TGT && SRC[k] === TGT[k]));

/* Plural pairs must be complete on the target side too. */
const halfPairs = keysTgt.filter((k) => {
  if (k.endsWith("_one")) return !(k.replace(/_one$/, "_other") in TGT);
  if (k.endsWith("_other")) return !(k.replace(/_other$/, "_one") in TGT);
  return false;
});
report("half plural pair", halfPairs);

/* Characters the package forbids (§5.3): guillemets and ordinal indicators. */
report("forbidden character (« » º ª — package §5.3)", keysTgt.filter((k) => /[«»ºª]/.test(String(TGT[k]))));

/* ---- output ---- */
const done = keysSrc.filter((k) => k in TGT && String(TGT[k] ?? "").trim()).length;
const pct = keysSrc.length ? ((done / keysSrc.length) * 100).toFixed(1) : "0.0";
console.log(`\nes-translate self-check${prefix ? ` — prefix "${prefix}"` : ""}`);
console.log(`  progress: ${done}/${keysSrc.length} keys filled (${pct} %)`);

if (!findings.length) {
  console.log("  findings: none\n");
  process.exit(0);
}
for (const [label, rows] of findings) {
  console.log(`\n  ${label} — ${rows.length}`);
  for (const r of rows.slice(0, 40)) console.log(`    ${r}`);
  if (rows.length > 40) console.log(`    … and ${rows.length - 40} more`);
}
console.log("");
process.exit(1);
