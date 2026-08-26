#!/usr/bin/env node
/* The acceptance gate of the #text-voice pass.
   ============================================================================

     npm run loc:export                     # regenerate the inventory first
     node scripts/text-voice-check.mjs [--baseline <git-ref>]

   Compares the exported string inventory against the same file at a baseline
   revision (default `origin/dev`) and asserts three things. Exit 0 or a list of
   what failed and where.

   Why a script and not a test: the gate is a DIFF against a revision, and vitest
   has no business shelling out to git. `npm test` stays a property of the working
   tree alone.

   ------------------------------------------------------------------ 1. dashes
   No em-dash survives in a player string unless its key is listed in
   `docs/localization/text-voice-keep.txt`. "Reads better" is not checkable; this
   is, which is exactly why it is the criterion.

   -------------------------------------------------------------- 2. compounds
   THE tripwire of this pass. 537 German rows carry a hyphen and practically all
   are compounds (Upgrade-Baum, 8-Nachbarschaft, Firn-Reserve). A broken compound
   does not read like a bug, it reads like a typo, which is why it is the one
   failure that would pass silently.

   Measured as the COUNT of `(?<=\w)-(?=\w)` per key and language, not as a list
   of the hyphenated words. The word-list version was tried first and is too
   blunt: it fires on every deliberate word swap that keeps its hyphen -
   `Battlefield-Bild` -> `Spielfeld-Bild` is a §3 fix, not compound damage. It
   reported seven hits where one was real.

   A count change is not forbidden outright, because it cannot be: §3 bans
   anglicisms that are themselves hyphenated (`tilt-reaktiv`, `self-feeding`), so
   enforcing §3 and never touching a hyphen are not simultaneously possible. Such
   a change must instead be booked in the keep file with a reason.

   ------------------------------------------------------------- 3. the numbers
   Per key, the multiset of numbers in the text is unchanged. This is the guard
   against §4 drift: a rewritten line must keep its template literal, and whoever
   bakes the constant into the prose while rephrasing produces exactly the drift
   the rule was written against.
*/
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const CSV = "docs/localization/strings_de_pixi_2026-08-15.csv";
const KEEP = path.join(ROOT, "docs/localization/text-voice-keep.txt");

const argAt = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const BASELINE = argAt("baseline", "origin/dev");

/* Minimal RFC-4180 reader. The inventory quotes every field and escapes a quote
   by doubling it; a split on commas would tear apart every text containing one. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const byId = (rows) => new Map(rows.map((r) => [r.id, r]));

function baselineCsv() {
  try {
    // MSYS_NO_PATHCONV: `rev:path` carries a colon and a slash, which Git Bash on
    // Windows would otherwise rewrite into a drive path (CLAUDE.md - Platform note).
    return execFileSync("git", ["show", `${BASELINE}:${CSV}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28,
        env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
  } catch (e) {
    console.error(`Cannot read ${CSV} at ${BASELINE}: ${e.message}`);
    process.exit(2);
  }
}

/* keep file: `dash <key> <lang> …`, `hyphen <key> <lang> <a>-><b> …`,
   `num <key> <lang> -<a>,-<b> …` — only figures that LEFT the text. */
function readKeep() {
  const dash = new Set(), hyphen = new Set(), num = new Set();
  if (!existsSync(KEEP)) return { dash, hyphen, num };
  for (const line of readFileSync(KEEP, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [kind, key, lang, ...rest] = t.split(/\s+/);
    if (kind === "dash") dash.add(`${key}|${lang}`);
    else if (kind === "hyphen") hyphen.add(`${key}|${lang}|${rest[0]}`);
    else if (kind === "num") num.add(`${key}|${lang}|${rest[0]}`);
  }
  return { dash, hyphen, num };
}

const HY = /(?<=\w)-(?=\w)/g;
const NUM = /\d+(?:[.,]\d+)?/g;
const count = (s, re) => ((s || "").match(re) || []).length;
const nums = (s) => ((s || "").match(NUM) || []).sort();

const old = byId(parseCsv(baselineCsv()));
const now = byId(parseCsv(readFileSync(path.join(ROOT, CSV), "utf8")));
const keep = readKeep();
const fail = { dash: [], hyphen: [], num: [] };

for (const [id, r] of now) {
  const before = old.get(id);
  for (const lang of ["de", "en"]) {
    if ((r[lang] || "").includes("—") && !keep.dash.has(`${id}|${lang}`))
      fail.dash.push(`${id} (${lang})`);
    if (!before) continue;                       // a new key has nothing to drift from
    const a = count(before[lang], HY), b = count(r[lang], HY);
    if (a !== b && !keep.hyphen.has(`${id}|${lang}|${a}->${b}`))
      fail.hyphen.push(`${id} (${lang}): ${a} -> ${b}`);
    const na = nums(before[lang]), nb = nums(r[lang]);
    if (na.join("") !== nb.join("")) {
      /* The token names the DIRECTION of every change, so no booking can hide one.
         `-x` a figure LEFT the text: a rewrite legitimately drops one whose own sentence already
              said it in words ("(5 Stapel)" right after "voll ionisiert").
         `+x` a figure APPEARED. Usually the very thing this check exists to catch, so it is called
              out separately and its booking carries the burden of proof: the only honest reason is
              that the SAME interpolation is now drawn twice, never that a constant was typed out. */
      const pool = [...nb], removed = [];
      for (const n of na) { const i = pool.indexOf(n); if (i >= 0) pool.splice(i, 1); else removed.push(n); }
      const token = [...removed.map((n) => "-" + n), ...pool.map((n) => "+" + n)].join(",");
      if (!keep.num.has(`${id}|${lang}|${token}`))
        fail.num.push(`${id} (${lang})${pool.length ? " [ADDS a number]" : ""}: book \`num ${id} ${lang} ${token}\``);
    }
  }
}

const report = (label, list, hint) => {
  if (!list.length) { console.log(`  ok    ${label}`); return 0; }
  console.log(`  FAIL  ${label} - ${list.length}`);
  for (const l of list.slice(0, 20)) console.log(`          ${l}`);
  if (list.length > 20) console.log(`          … ${list.length - 20} more`);
  console.log(`        ${hint}`);
  return 1;
};

console.log(`\ntext-voice check · baseline ${BASELINE} · ${now.size} strings\n`);
let bad = 0;
bad += report("no unlisted em-dash", fail.dash,
  "Rewrite it, or book it in docs/localization/text-voice-keep.txt with a reason.");
bad += report("compounds intact", fail.hyphen,
  "TRIPWIRE. A broken compound reads as a typo, not as a bug. If the change is a §3 fix, book it.");
bad += report("no number drift", fail.num,
  "A rewritten line keeps its template literal; never bake a constant into the prose.");

const kept = keep.dash.size + keep.hyphen.size + keep.num.size;
console.log(`\n  ${kept} booked exception${kept === 1 ? "" : "s"} in text-voice-keep.txt`);
console.log(bad ? "\nFAILED\n" : "\nPASSED\n");
process.exit(bad ? 1 : 0);
