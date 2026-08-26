/* M6 — the site list, measured with the guard's own expressions before anything is touched.
   Read-only. Prints the axis literals of every `.gl-*` / `.gloss-*` rule and of Glossary.jsx. */
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../../../../../${p}`, import.meta.url), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const withoutFallbacks = (b) => b.replace(/var\(\s*--[a-zA-Z0-9-]+\s*,[^()]*\)/g, "var(--x)");

const AXES = [
  ["surface", /(?:^|[;{\s])background(?:-color|-image)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g],
  ["edge",    /(?:^|[;{\s])border(?:-top|-right|-bottom|-left)?(?:-color)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g],
  ["elev",    /(?:^|[;{\s])box-shadow\s*:(?!\s*(?:var\(|none|inset\b))[^;}]*\d/g],
  ["radius",  /(?:^|[;{\s])border-radius\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g],
  ["inset",   /(?:^|[;{\s])padding(?:-top|-right|-bottom|-left)?\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g],
];
const INK = /(?:^|[;{\s])color\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g;

function rules(css) {
  const out = [];
  for (const m of strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().split("\n").pop().trim();
    if (sel) out.push([sel, m[2]]);
  }
  return out;
}
const css = read("src/index.css");
const all = rules(css);
/* MINE = a rule whose selector names .gl- or .gloss-. SHARED = it also names another screen's
   prefix, so its values belong to whoever wrote them, not to this task. */
const OTHER = /\.up-|\.gd-|\.cz-|\.st-|\.lb-|\.go-|\.op-|\.un-|\.fb-|\.rd-/;
const isGl = (sel) => /\.gl-|\.gloss-/.test(sel);
const mine = all.filter(([s]) => isGl(s) && !OTHER.test(s));
const shared = all.filter(([s]) => isGl(s) && OTHER.test(s));

console.log(`rules naming .gl-/.gloss- : ${all.filter(([s]) => isGl(s)).length}`);
console.log(`  mine (no other prefix)  : ${mine.length}`);
console.log(`  shared with a migrated screen: ${shared.length}`);
for (const [s] of shared) console.log(`    SHARED  ${s}`);
const gl = all.filter(([s]) => /\.gl-/.test(s)).length;
const gloss = all.filter(([s]) => /\.gloss-/.test(s)).length;
console.log(`  .gl-* rules ${gl} · .gloss-* rules ${gloss}`);

console.log("\n--- CSS axis literals in MY rules ---");
let n = 0;
for (const [axis, re] of AXES) {
  for (const [sel, body] of mine) {
    for (const hit of withoutFallbacks(body).matchAll(new RegExp(re.source, "g"))) {
      console.log(`${axis.padEnd(8)} ${sel}  ->  ${hit[0].trim().slice(0, 90)}`);
      n++;
    }
  }
}
console.log(`axis literals in .gl-/.gloss- rules: ${n}`);
let ink = 0;
for (const [sel, body] of mine) {
  for (const hit of withoutFallbacks(body).matchAll(new RegExp(INK.source, "g"))) {
    console.log(`INK      ${sel}  ->  ${hit[0].trim().slice(0, 70)}`); ink++;
  }
}
console.log(`ink literals in .gl-/.gloss- rules: ${ink}`);
