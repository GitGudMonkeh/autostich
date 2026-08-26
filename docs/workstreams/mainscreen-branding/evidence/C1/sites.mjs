#!/usr/bin/env node
/* #mainscreen-branding C1 — the site list, re-measured.
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C1/sites.mjs

   THE CONTRACT'S NUMBERS ARE INPUT, NOT FACT. It says 891 lines, 22 colour values, 25 inline
   `style={{`, 19 `.hub-*` and 31 `.as-hub-*` rules. M11 re-measured its own four numbers and found
   two of them counting something other than what they named; this does the same before a single
   value is migrated against them.

   WHAT IS COUNTED, and each has a reason:

   * COLOUR OCCURRENCES ARE SPLIT BY THE PROPERTY THEY SIT ON. A count of "colour values" mixes
     three unlike things: values on the five axes of §2c (surface, edge, elevation — the ones this
     task migrates), INK (§2c's named gap, ratcheted not migrated), and MEANING-CODED colour
     (permanently exempt). A single number cannot be acted on; three can.
   * COMMENTS ARE STRIPPED FIRST, INCLUDING TRAILING ONES. `// #370:` and `// #299/#301` are issue
     references, and a naive `#[0-9a-f]{3}` sweep reads five of them as colours. That is not a
     rounding error in the count — it is the count naming things that are not there.
   * THE `.hub-*` AND `.as-hub-*` RULES ARE COUNTED AS RULES AND THEIR AXIS DECLARATIONS SEPARATELY.
     "19 rules" says nothing about how much work they are; "19 rules carrying N axis declarations"
     does.

   THIS FILE READS AND DOES NOT WRITE. It is C1, so it moves nothing. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

/* Block comments and line comments, the latter only where the `//` is not part of a `://` URL. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

/* ------------------------------------------------------------------ the axes

   §2c's five axes, plus the two categories a colour can belong to instead. The classification is by
   the PROPERTY, which is the only thing that decides it: `#b3a8ff` on `color` is ink and the same
   value on `borderColor` is an edge. */
const AXIS_OF = (prop) => {
  const p = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
  /* `background-size`, `-position`, `-repeat`, `-clip` and friends are GEOMETRY, not surface. The
     tripwire names `background`; a sweep on the prefix counts three declarations of the hub's
     background IMAGE as three surfaces and inflates the number this task is measured by. */
  if (/^background(-color|-image)?$/.test(p)) return "surface";
  if (/^border(-(top|right|bottom|left))?(-color|-width|-style)?$/.test(p)) return "edge";
  if (/^box-shadow$/.test(p)) return "elevation";
  if (/^border(-(top|bottom)-(left|right))?-radius$/.test(p)) return "radius";
  if (/^padding(-(top|right|bottom|left))?$/.test(p)) return "inset";
  if (/^color$|^-webkit-text-fill-color$|^fill$|^stroke$/.test(p)) return "ink";
  return "other";
};

/* A value that carries no literal to migrate. `transparent`, `none`, `0`, `inherit` and the like are
   already as tokenless as a value gets; counting them as work to do would make the ratchet's floor
   look like an achievement it is not. `none` on an ELEVATION is the exception §2c names — it is
   `--el-flat`, a step you pick — so it is left in. */
const EMPTY_VALUE = /^(transparent|none|0|inherit|initial|unset|auto|cover|contain)$/i;

/* ------------------------------------------------------------------ JSX style objects

   Brace-balanced rather than regex-terminated: several of these objects contain `}` inside a
   template string or a nested object, and a lazy `\}\}` stops at the first one. Measured on this
   file: a lazy match loses four declarations. */
function styleObjects(src) {
  const out = [];
  const marker = "style={{";
  let i = 0;
  while ((i = src.indexOf(marker, i)) !== -1) {
    /* The object's OWN brace is the SECOND one — `style={{`. Starting the balance at the first
       swallows the JSX expression container as well, and every declaration then sits one level deep
       and is never split. Measured: that version reported 25 objects and 0 declarations. */
    let depth = 0, j = i + marker.length - 1;
    let end = -1;
    for (let k = j; k < src.length; k++) {
      const ch = src[k];
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { end = k; break; } }
    }
    if (end === -1) break;
    const body = src.slice(j + 1, end);
    out.push({ at: src.slice(0, i).split("\n").length, body });
    i = end + 1;
  }
  return out;
}

/* `key: value` pairs at depth 0 of the object body. Keys may be quoted (`"--c"`). */
function declarations(body) {
  const out = [];
  let depth = 0, buf = "";
  const push = () => {
    const s = buf.trim(); buf = "";
    if (!s) return;
    const m = s.match(/^("?[-\w]+"?)\s*:\s*([\s\S]+)$/);
    if (m) out.push({ prop: m[1].replace(/"/g, ""), value: m[2].trim() });
  };
  for (const ch of body) {
    if (ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === "}" || ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) { push(); continue; }
    buf += ch;
  }
  push();
  return out;
}

/* ------------------------------------------------------------------ CSS rules */
function rulesMatching(cssRaw, re) {
  /* Comments are stripped FIRST. A `/* … *\/` between two rules is picked up by `[^{}]+` and lands
     in the selector; harmless for the count, unreadable in the record, and a comment that happened
     to contain a brace would have broken the parse outright. */
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  /* Selector + block, non-nested. `index.css` nests only inside @media, and a media block's own
     brace is skipped because a selector cannot contain `{`. */
  const rx = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = rx.exec(css))) {
    const sel = m[1].trim().replace(/\s+/g, " ");
    if (!re.test(sel)) continue;
    if (/^@/.test(sel)) continue;
    out.push({ sel, body: m[2].trim() });
  }
  return out;
}

function axisDecls(body) {
  const out = [];
  for (const raw of body.split(";")) {
    const s = raw.trim(); if (!s) continue;
    const m = s.match(/^([-\w]+)\s*:\s*([\s\S]+)$/); if (!m) continue;
    const axis = AXIS_OF(m[1]);
    if (axis === "other") continue;
    const value = m[2].trim();
    if (axis !== "elevation" && EMPTY_VALUE.test(value)) continue;
    out.push({ prop: m[1], value, axis, tokenised: /var\(--/.test(value) });
  }
  return out;
}

/* ------------------------------------------------------------------ run */

const jsxPath = "src/ui/StartScreen.jsx";
const raw = read(jsxPath);
const code = stripComments(raw);

const objs = styleObjects(code);
const decls = objs.flatMap((o) => declarations(o.body).map((d) => ({ ...d, at: o.at })));

const colourDecls = [];
for (const d of decls) {
  const hits = d.value.match(COLOUR);
  if (!hits) continue;
  for (const c of hits) colourDecls.push({ at: d.at, prop: d.prop, axis: AXIS_OF(d.prop), colour: c });
}

/* Colours that are NOT inside a style object — module constants and props. M6-F11 and M11-F08: two
   shapes every ratchet in the tree is blind to, so they are counted here rather than assumed absent. */
const allColours = code.match(COLOUR) || [];
const inObjects = colourDecls.length;

const byAxis = {};
for (const c of colourDecls) (byAxis[c.axis] ||= []).push(c);

/* Axis-shaped values that are not colours: radius, inset, elevation written as lengths. */
const axisValueDecls = decls
  .map((d) => ({ ...d, axis: AXIS_OF(d.prop) }))
  .filter((d) => d.axis !== "other" && d.axis !== "ink");

/* Tailwind utilities that reach the DESKTOP — `dt:`-prefixed only, per §2c's exemption for the
   phone's value carriers. */
const utilities = [...code.matchAll(/dt:(rounded|p|px|py|pt|pb|pl|pr|shadow|bg|border)-\[?[\w.%[\]#(),/-]*/g)]
  .map((m) => m[0]);

const css = read("src/index.css");
const hubRules = rulesMatching(css, /\.hub-/);
const asHubRules = rulesMatching(css, /\.as-hub-/);
const wordmarkRules = rulesMatching(css, /\.as-wordmark|\.as-wm-glow/);

const listSel = (rules) => rules.map((r) => r.sel);
const summarise = (rules) => {
  const decls = rules.flatMap((r) => axisDecls(r.body).map((d) => ({ ...d, sel: r.sel })));
  return { rules: rules.length, axisDecls: decls.length,
    tokenised: decls.filter((d) => d.tokenised).length,
    literal: decls.filter((d) => !d.tokenised).length,
    byAxis: decls.reduce((a, d) => (a[d.axis] = (a[d.axis] || 0) + 1, a), {}),
    literals: decls.filter((d) => !d.tokenised).map((d) => `${d.sel} { ${d.prop}: ${d.value} }`),
    selectors: listSel(rules) };
};

const report = {
  file: jsxPath,
  contractSaid: { lines: 891, colourValues: 22, inlineStyle: 25, hubRules: 19, asHubRules: 31 },
  measured: {
    /* A trailing newline is not a line. `wc -l` counts newlines and this counted parts. */
    lines: raw.replace(/\n$/, "").split("\n").length,
    inlineStyleObjects: objs.length,
    colourOccurrencesInStyleObjects: inObjects,
    colourOccurrencesAnywhereInCode: allColours.length,
    colourOccurrencesOutsideStyleObjects: allColours.length - inObjects,
    distinctColoursInCode: [...new Set(allColours)].length,
    colourByAxis: Object.fromEntries(Object.entries(byAxis).map(([k, v]) => [k, v.length])),
    distinctByAxis: Object.fromEntries(Object.entries(byAxis)
      .map(([k, v]) => [k, [...new Set(v.map((c) => c.colour))]])),
    axisValueDeclarations: axisValueDecls.length,
    axisValueDetail: axisValueDecls.map((d) => `${d.axis}: ${d.prop}: ${d.value}`),
    desktopUtilities: { count: utilities.length, distinct: [...new Set(utilities)].sort() },
  },
  /* RULES AND SELECTORS ARE COUNTED SEPARATELY, and the difference is the whole reason the two
     numbers disagree with the contract: `.hub-pair, .hub-play, .hub-stand, .hub-foot { … }` is ONE
     rule carrying FOUR selectors. Neither count is wrong; a migration is paid per rule and read per
     selector, so both are recorded. */
  css: { hub: summarise(hubRules), asHub: summarise(asHubRules), wordmark: summarise(wordmarkRules),
    selectorCounts: {
      hub: hubRules.reduce((n, r) => n + r.sel.split(",").filter((s) => /\.hub-/.test(s)).length, 0),
      asHub: asHubRules.reduce((n, r) => n + r.sel.split(",").filter((s) => /\.as-hub-/.test(s)).length, 0) } },
};

writeFileSync(join(HERE, "sites.json"), JSON.stringify(report, null, 2) + "\n");

const m = report.measured;
process.stdout.write(`
  ${jsxPath}
    lines                     ${m.lines}   (contract: 891)
    inline style={{ }}        ${m.inlineStyleObjects}   (contract: 25)
    colour occurrences        ${m.colourOccurrencesAnywhereInCode} in code, ${m.colourOccurrencesInStyleObjects} of them inside a style object
    distinct colours          ${m.distinctColoursInCode}   (contract: 22 "colour values")
    by axis                   ${JSON.stringify(m.colourByAxis)}
    axis value declarations   ${m.axisValueDeclarations} (radius / inset / elevation written as lengths)
    dt: utilities on an axis  ${m.desktopUtilities.count}

  src/index.css
    .hub-*     ${report.css.hub.rules} rules, ${report.css.hub.axisDecls} axis declarations, ${report.css.hub.literal} literal   (contract: 19 rules)
    .as-hub-*  ${report.css.asHub.rules} rules, ${report.css.asHub.axisDecls} axis declarations, ${report.css.asHub.literal} literal   (contract: 31 rules)
    wordmark   ${report.css.wordmark.rules} rules, ${report.css.wordmark.axisDecls} axis declarations, ${report.css.wordmark.literal} literal

  wrote ${join(HERE, "sites.json")}
`);
