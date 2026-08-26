/* ============================================================
   es-translate — WORKING VIEW.

   Prints, per key: the German source value (the thing being translated) next to the RAW English
   source expression (the thing whose shape must be mirrored).

   The raw expression is the point. `en.js` resolves to "+15 score per streak point", but its
   source reads `+${ARCH_STREAK} score per streak point` — and F1 of this task's contract is
   exactly that the Spanish catalog must carry the CONSTANT again, at the same site, rather than
   a typed-out number that silently stops tracking the next balance pass. A view built on the
   evaluated catalog would hide the one thing worth seeing.

   Usage:
     node docs/workstreams/es-translate/dump.mjs enSkills          # one English sub-catalog file
     node docs/workstreams/es-translate/dump.mjs en.js suit.       # a file, filtered by key prefix
     node docs/workstreams/es-translate/dump.mjs --rest            # keys defined directly in en.js
   ============================================================ */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import de from "../../../src/i18n/de.js";

const I18N = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src/i18n");

/* Scan a catalog source file for `"key": <expression>,` and return the raw expression text.
   Hand-rolled rather than regex: the values include template literals with `${}` interpolation,
   nested quotes and real newlines, none of which a regex terminates correctly. */
function rawEntries(file) {
  const src = readFileSync(resolve(I18N, file), "utf8");
  const out = new Map();
  const keyRe = /(?:^|[\s{,])"([\w.]+)"\s*:\s*/gm;
  let m;
  while ((m = keyRe.exec(src))) {
    let i = keyRe.lastIndex, depth = 0, quote = null, expr = "";
    while (i < src.length) {
      const c = src[i], prev = src[i - 1];
      if (quote) {
        expr += c;
        if (c === quote && prev !== "\\") quote = null;
        else if (quote === "`" && c === "{" && prev === "$") depth++;
      } else if (c === '"' || c === "'" || c === "`") { quote = c; expr += c; }
      else if (c === "(" || c === "[" || c === "{") { depth++; expr += c; }
      else if (c === ")" || c === "]" || c === "}") { depth--; expr += c; }
      else if (c === "," && depth === 0) break;
      else if (c === "\n" && depth === 0 && quote === null && expr.trim() && !expr.trim().endsWith("+")) break;
      else expr += c;
      i++;
    }
    out.set(m[1], expr.trim());
  }
  return out;
}

const SUBS = ["enSkills", "enPerks", "enFamilies", "enMeta", "enGlossary", "enCosmetics", "enGuides"];
const arg = process.argv[2] || "--rest";
const prefix = process.argv[3] || "";

let entries;
if (arg === "--rest") {
  const sub = new Set();
  for (const s of SUBS) for (const k of rawEntries(`${s}.js`).keys()) sub.add(k);
  entries = [...rawEntries("en.js")].filter(([k]) => !sub.has(k));
} else {
  entries = [...rawEntries(arg.endsWith(".js") ? arg : `${arg}.js`)];
}
entries = entries.filter(([k]) => k.startsWith(prefix) && k in de);

console.log(`# ${arg}${prefix ? ` · prefix "${prefix}"` : ""} — ${entries.length} keys\n`);
for (const [k, expr] of entries) {
  console.log(`${k}`);
  console.log(`  DE  ${JSON.stringify(de[k])}`);
  console.log(`  EN  ${expr.replace(/\n/g, "\\n")}`);
  console.log("");
}
