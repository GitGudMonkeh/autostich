/* How far does one exemption reach? For each named exemption in panel-tokens.test.js, count the
   rules it matches and split them by whether they sit inside the desktop media block. An exemption
   that names a selector reaches BOTH halves; if a class has a phone rule and a desktop rule, one
   entry silences both — which is the hole C4/CC1 found in the mainscreen's own list. */
import { readFileSync } from "node:fs";
const css = readFileSync("src/index.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const guard = readFileSync("test/panel-tokens.test.js", "utf8");
const at = css.indexOf("@media (min-width: 1280px) {");
let depth = 0, end = css.length;
for (let j = css.indexOf("{", at); j < css.length; j++) {
  if (css[j] === "{") depth++;
  else if (css[j] === "}" && --depth === 0) { end = j + 1; break; }
}
const rules = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim().split("\n").pop().trim();
  if (!sel || sel.startsWith("@")) continue;
  rules.push({ sel, body: m[2], desktop: m.index >= at && m.index < end });
}
/* Every regex literal that appears inside an *_EXEMPT list. */
const lists = [...guard.matchAll(/const (\w*EXEMPT)\s*=\s*\[([\s\S]*?)\n\];/g)];
let both = 0, total = 0;
const rows = [];
for (const [, name, body] of lists) {
  for (const rx of body.matchAll(/\/(\^?[^/\n]+?)\/[gimsuy]*\s*,/g)) {
    let re; try { re = new RegExp(rx[1]); } catch { continue; }
    const hit = rules.filter((r) => re.test(r.sel));
    if (!hit.length) continue;
    total++;
    const d = hit.filter((r) => r.desktop).length, p = hit.length - d;
    if (d && p) { both++; rows.push(`${name}  ${rx[1]}  -> ${p} phone rule(s) + ${d} desktop rule(s)`); }
  }
}
console.log(`exemption entries that match at least one rule: ${total}`);
console.log(`entries that reach BOTH the phone and the desktop half: ${both}`);
for (const r of rows) console.log("   ", r);
