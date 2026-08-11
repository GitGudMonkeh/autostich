/* maintenance/music-overview.mjs — Übersicht des Musik-Pools.
 *
 * Liest den Run-Pool direkt aus src/ui/music.js (Titel, Datei, tier) und die echte
 * Track-Dauer aus den .m4a-Dateien (mvhd-Atom, ohne ffprobe/ffmpeg). Gibt je Stufe
 * Anzahl + Gesamtlaufzeit + Einzeltitel aus, dazu die Score-Grenzen und einen Gesamtwert.
 *
 * Nutzung:
 *   node maintenance/music-overview.mjs
 *   npm run music:overview
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MUSIC_JS = join(ROOT, "src/ui/music.js");
const ASSET_DIR = join(ROOT, "src/assets/music");

const src = readFileSync(MUSIC_JS, "utf8");

// 1) Imports: Variablenname → Dateiname (nur ../assets/music/*).
const imports = new Map();
for (const m of src.matchAll(/import\s+(\w+)\s+from\s+"\.\.\/assets\/music\/([^"]+)"/g)) {
  imports.set(m[1], m[2]);
}

// 2) TIER_ORDER (Reihenfolge der Stufen).
const orderMatch = src.match(/const\s+TIER_ORDER\s*=\s*\[([^\]]*)\]/);
const TIER_ORDER = orderMatch
  ? [...orderMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
  : ["calm", "mid", "hot", "overdrive", "overdrive_plus"];

// 3) TIER_SCORES (Score-Grenzen) → lesbare Bereiche je Stufe.
const scores = {};
const scoreMatch = src.match(/const\s+TIER_SCORES\s*=\s*\{([^}]*)\}/);
if (scoreMatch) {
  for (const m of scoreMatch[1].matchAll(/(\w+)\s*:\s*(\d+)/g)) scores[m[1]] = Number(m[2]);
}
const mio = (n) => `${(n / 1_000_000).toLocaleString("de-DE")} Mio`;
function scoreRange(tier, i) {
  const lower = i === 0 ? 0 : scores[TIER_ORDER[i - 1]];
  const upper = scores[tier];
  if (lower === 0 && upper != null) return `< ${mio(upper)}`;
  if (upper == null) return `${mio(lower)}+`;
  return `${mio(lower)}–${mio(upper)}`;
}

// 4) POOL-Einträge: { title: "...", url: <var>, tier: "..." }.
const pool = [];
for (const m of src.matchAll(/\{\s*title:\s*"([^"]+)"\s*,\s*url:\s*(\w+)\s*,\s*tier:\s*"([^"]+)"\s*\}/g)) {
  pool.push({ title: m[1], file: imports.get(m[2]) || null, tier: m[3] });
}

// M4A/MP4-Dauer aus dem mvhd-Atom (timescale + duration).
function durationSeconds(path) {
  let buf;
  try { buf = readFileSync(path); } catch { return null; }
  const i = buf.indexOf("mvhd");
  if (i < 0) return null;
  let p = i + 4;
  const version = buf[p];
  p += 4; // version (1) + flags (3)
  let timescale, duration;
  if (version === 1) {
    p += 16; // creation + modification (8 + 8)
    timescale = buf.readUInt32BE(p); p += 4;
    duration = Number(buf.readBigUInt64BE(p));
  } else {
    p += 8; // creation + modification (4 + 4)
    timescale = buf.readUInt32BE(p); p += 4;
    duration = buf.readUInt32BE(p);
  }
  return timescale ? duration / timescale : null;
}
function fmt(s) {
  if (s == null) return "  ?  ";
  let m = Math.floor(s / 60);
  let sec = Math.round(s - m * 60);
  if (sec === 60) { m += 1; sec = 0; }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Gruppieren + ausgeben.
const byTier = new Map(TIER_ORDER.map((t) => [t, []]));
for (const e of pool) {
  if (!byTier.has(e.tier)) byTier.set(e.tier, []);
  byTier.get(e.tier).push(e);
}

let grandCount = 0;
let grandSecs = 0;
const summary = [];
console.log("\n🎵 AUTOSTICH — Musik-Pool Übersicht\n");
[...byTier.keys()].forEach((tier, i) => {
  const rows = byTier.get(tier);
  let total = 0;
  for (const r of rows) { const d = r.file ? durationSeconds(join(ASSET_DIR, r.file)) : null; r.dur = d; total += d || 0; }
  grandCount += rows.length;
  grandSecs += total;
  summary.push({ tier, range: scoreRange(tier, i), n: rows.length, total });
  console.log(`═══ ${tier.toUpperCase()}  ·  ${scoreRange(tier, i)}  ·  ${rows.length} Tracks  ·  gesamt ${fmt(total)} ═══`);
  for (const r of rows) console.log(`   ${fmt(r.dur).padStart(6)}  ${r.title}${r.file ? "" : "   (Datei fehlt!)"}`);
  console.log("");
});

console.log("─────────── ZUSAMMENFASSUNG ───────────");
for (const s of summary) {
  console.log(`  ${s.tier.padEnd(15)} ${String(s.n).padStart(2)} Tracks   ${fmt(s.total).padStart(6)}   (${s.range})`);
}
console.log(`  ${"GESAMT".padEnd(15)} ${String(grandCount).padStart(2)} Tracks   ${fmt(grandSecs).padStart(6)}\n`);
