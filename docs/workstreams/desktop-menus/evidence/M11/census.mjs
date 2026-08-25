#!/usr/bin/env node
/* #menu-rework M11 — the site list, read with the guard's own expressions before anything is touched.
   Read-only. Prints every axis and ink literal the four dialog files and their rules carry, so the
   contract's counts are checked rather than trusted. */
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../../../../../${p}`, import.meta.url), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const withoutFallbacks = (b) => b.replace(/var\(\s*--[a-zA-Z0-9-]+\s*,[^()]*\)/g, "var(--x)");

const CSS_AXES = [
  ["surface", /(?:^|[;{\s])background(?:-color|-image)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g],
  ["edge", /(?:^|[;{\s])border(?:-top|-right|-bottom|-left)?(?:-color)?\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g],
  ["elev", /(?:^|[;{\s])box-shadow\s*:(?!\s*(?:var\(|none|inset\b))[^;}]*\d/g],
  ["radius", /(?:^|[;{\s])border-radius\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g],
  ["inset", /(?:^|[;{\s])padding(?:-top|-right|-bottom|-left)?\s*:(?!\s*(?:var\(|0\s*[;}]))[^;}]*[1-9]/g],
];
const INK_CSS = /(?:^|[;{\s])color\s*:[^;}]*(#[0-9a-fA-F]{3,8}|\brgba?\()/g;

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
const MINE = [/\.rc-/, /\.up-banner/];
const mine = all.filter(([s]) => MINE.some((r) => r.test(s)));
console.log(`rules the M11 entry covers: ${mine.length}`);
for (const [sel] of mine) console.log("   ", sel);

console.log("\n--- CSS axis literals ---");
for (const [axis, re] of CSS_AXES) {
  for (const [sel, body] of mine) {
    for (const hit of withoutFallbacks(body).matchAll(new RegExp(re.source, "g"))) {
      console.log(`${axis.padEnd(8)} ${sel}  ->  ${hit[0].trim().slice(0, 80)}`);
    }
  }
}
let ink = 0;
for (const [sel, body] of mine) {
  for (const hit of withoutFallbacks(body).matchAll(new RegExp(INK_CSS.source, "g"))) { ink++; console.log(`INK      ${sel}  ->  ${hit[0].trim()}`); }
}
console.log(`ink in the rules: ${ink}`);

/* ---- the JSX side, with the guard's own readers ---- */
const styleValue = (body, prop) => {
  const m = body.match(new RegExp(`\\b${prop}[A-Za-z]*\\s*:`));
  if (!m) return null;
  let i = m.index + m[0].length, depth = 0, out = "";
  while (i < body.length) {
    const ch = body[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") { if (depth === 0) break; depth--; }
    else if (ch === "," && depth === 0) break;
    out += ch; i++;
  }
  return out.trim().replace(/^[`"']|[`"']$/g, "");
};
function tags(src) {
  const out = [];
  for (const m of src.matchAll(/<[A-Za-z][A-Za-z0-9.]*/g)) {
    let i = m.index + m[0].length, depth = 0, q = null;
    while (i < src.length) {
      const ch = src[i];
      if (q) { if (ch === q) q = null; }
      else if (ch === '"' || ch === "'" || ch === "`") q = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
      i++;
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}
function styleObject(tag) {
  const at = tag.indexOf("style={{");
  if (at < 0) return undefined;
  let i = at + "style={".length, depth = 0;
  const start = i;
  do { if (tag[i] === "{") depth++; else if (tag[i] === "}") depth--; i++; } while (i < tag.length && depth > 0);
  return tag.slice(start + 1, i - 1);
}
const literalsIn = (val) =>
  [...withoutFallbacks(val).matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^()]*\)/g)].map((m) => m[0]);

const FILES = ["src/ui/RunConfirm.jsx", "src/ui/RunLoader.jsx", "src/ui/UpdateBanner.jsx", "src/ui/PwaInstall.jsx"];
for (const f of FILES) {
  const raw = read(f);
  const s = strip(raw);
  const bodies = tags(s).map(styleObject).filter((b) => b !== undefined);
  const colours = [...s.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^()]*\)/g)].map((m) => m[0]);
  const bare = [...withoutFallbacks(s).matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^()]*\)/g)].map((m) => m[0]);
  console.log(`\n=== ${f} — ${raw.split("\n").length - 1} lines · ${colours.length} colour values (${new Set(colours).size} distinct, ${bare.length} outside a var() fallback)`);
  console.log("    all:", colours.join(" "));
  let axis = 0;
  for (const body of bodies) {
    for (const prop of ["background", "border", "boxShadow", "borderRadius", "padding"]) {
      const v = styleValue(body, prop);
      if (v === null) continue;
      const lit = literalsIn(v);
      if (lit.length) { axis++; console.log(`    AXIS ${prop} -> ${v.slice(0, 70)}   [${lit.join(" ")}]`); }
    }
  }
  let n = 0;
  for (const body of bodies) {
    const v = styleValue(body, "color");
    if (v !== null && literalsIn(v).length > 0) { n++; console.log(`    INK  color -> ${v}`); }
  }
  n += [...s.matchAll(/\b(?:dt:)?text-\[#[0-9a-fA-F]{3,8}\]/g)].length;
  const util = [...s.matchAll(/\b(?:dt:)?(rounded|p|px|py|pt|pb|pl|pr|shadow|bg)-\[[^\]]+\]/g)].map((m) => m[0]);
  const named = [...s.matchAll(/\bdt:(rounded|shadow|p|px|py|pt|pb|pl|pr|bg)-[a-z0-9]+/g)].map((m) => m[0]);
  console.log(`    -> axis hits in style objects: ${axis} · ink: ${n} · arbitrary utilities: ${util.join(" ") || "none"} · dt: named scale: ${named.join(" ") || "none"}`);
}
