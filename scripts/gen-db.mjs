#!/usr/bin/env node
/* #256: Core Game Database — Generator. Liest die reinen Spiel-Definitionen aus src/game/* (die EINZIGE Quelle
   der Wahrheit) und schreibt eine self-contained, durchsuchbare statische Seite nach dist/db/index.html.
   Läuft nach `npm run build` (lokal `npm run gen:db`); im CI vor dem Pages-Publish → immer code-aktuell, keine Drift.
   Rein lesend, keine Abhängigkeiten außer dem game/-Layer. */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { SKILL_LIST, ARCHETYPE_META } from "../src/game/skills.js";
import { PERK_DEFS, CATEGORIES, RARITY_META, rarityOf } from "../src/game/perks.js";
import { FAMILY_LIST } from "../src/game/families.js";
import { ARCHITECT_FAMILIES } from "../src/game/architect.js";
import { tierNum, tierFactor, bindSpanFor, TIER_INERT_KINDS } from "../src/game/architect.js";
import { STAT_DEFS } from "../src/game/stats.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.DB_OUT_DIR || resolve(__dir, "../dist/db");

const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };

// Identische aufeinanderfolgende Stufen zu Bereichen zusammenfassen (z. B. „I–IV" statt 4× derselbe Text).
// Zeigt echte Stufen-Unterschiede und verschweigt Schein-Stufen bei nicht skalierenden Effekten
// (joker/transparentFarb/crossSeg ohne tierKick sind im Spiel nicht aufwertbar).
function tierRanges(textFor, maxTier = 4) {
  const g = [];
  for (let t = 1; t <= maxTier; t++) {
    const text = textFor(t), last = g[g.length - 1];
    if (last && last.text === text) last.to = t;
    else g.push({ from: t, to: t, text });
  }
  return g.filter((x) => x.text).map((x) => ({
    label: x.from === x.to ? `Stufe ${ROMAN[x.from]}` : `Stufe ${ROMAN[x.from]}–${ROMAN[x.to]}`,
    text: x.text,
  }));
}

// Architekt-Effekt je Stufe — 1:1 gespiegelt aus ArchitectScreen.famEff (inkl. neuer Distrikt-/Lage-/Risiko-Kinds
// und dem qualitativen tierKick-Zusatz), driftsicher über die architect.js-Stufen-Helfer.
function archEff(fam, tier) {
  const base = fam.base, t = tier, nz = (v) => tierNum(v, t);
  let s;
  switch (base.kind) {
    case "flat":       s = fam.category === "value" ? `alle Abgedeckten +${nz(base.value)} Stichwert` : `Sieg +${nz(base.score)} Score`; break;
    case "lowValue":   s = `niedrige Karten +${nz(base.value)} Stichwert`; break;
    case "color":      s = fam.category === "value" ? `passende Farbe +${nz(base.value)} Stichwert` : `passende Farbe +${nz(base.score)} Score`; break;
    case "target":     s = `${fam.target === "highest" ? "höchste" : "niedrigste"} Karte +${nz(fam.category === "value" ? base.value : base.score)} ${fam.category === "value" ? "Stichwert" : "Punkte"}`; break;
    case "streak":     s = `Sieg +${nz(base.score)} Score × Serie`; break;
    case "crit":       s = `Crit-Sieg +${nz(base.score)} Score`; break;
    case "milestone":  s = `jeder ${base.every}. Sieg +${nz(base.score)} Score`; break;
    case "mult":       s = `Siege hier ×${base.factor}`; break;
    case "neighbor":   s = fam.category === "value" ? `+${nz(base.value)} Stichwert je Nachbargebäude (max ${base.cap})` : `Sieg +${nz(base.score)} Score je Nachbargebäude (max ${base.cap})`; break;
    case "compound":   s = `Sieg +${nz(base.score)} Score je vollendeter Struktur`; break;
    case "segment":    s = `${base.half === "early" ? "frühe" : "späte"} Segmente ${fam.category === "value" ? `+${nz(base.value)} Stichwert` : `+${nz(base.score)} Score`}`; break;
    case "relay":      s = base.both ? `strahlt +${nz(base.score)} Score in beide Nachbarfelder` : `reicht +${nz(base.score)} Score ans Feld rechts weiter`; break;
    case "gamble":     s = `Crit-Sieg +${nz(base.score)} Score · Sieg ohne Crit −${base.penalty}`; break;
    case "joker":      s = `Formations-Joker (${base.types.join("/")})`; break;
    case "transparentFarb": s = "Farbblock-Transparenz"; break;
    case "bind":       s = `Treppen-Bindeglied: Wert darf um ±${bindSpanFor(t)} abweichen`; break;
    case "crossSeg":   s = "öffnet die Segmentgrenze"; break;
    case "anker":      s = `jede Zelle = Anker ×${tierFactor(base.factor, t).toFixed(2)}`; break;
    case "formMult":   s = `Formationen hier ×${base.factor}`; break;
    default:           s = ""; break;
  }
  // tierKick: ab Stufe `at` zündet ein QUALITATIVER Zusatz (nicht nur die skalierte Zahl) → sonst als Vorschau markiert.
  if (fam.tierKick && s) {
    const k = fam.tierKick, on = typeof t === "number" && t >= k.at;
    let kick = "";
    if (k.mult) kick = `zusätzlich ×${k.mult} Score`;
    else if (k.critFlatMult) kick = `bei Crit ×${k.critFlatMult} Flat`;
    else if (k.streakDoubleFrom) kick = `ab Serie ${k.streakDoubleFrom} doppelt`;
    else if (k.every) kick = `jeder ${k.every}. statt ${base.every}. Sieg`;
    else if (k.addType) kick = `+Joker ${k.addType}`;
    else if (k.ankerValue) kick = `+${k.ankerValue} Stichwert je Zelle`;
    if (kick) s += on ? ` · ${kick}` : ` (Stufe ${k.at}: ${kick})`;
  }
  return s;
}

const entries = [];

// ---- Skills (Archetypen inkl. Legendäre) ----
for (const s of SKILL_LIST) {
  const meta = ARCHETYPE_META[s.archetype] || { label: s.archetype, color: "#8a8a95", icon: "" };
  entries.push({
    kind: "Skill", id: s.id, name: s.name,
    group: meta.label, groupColor: meta.color, icon: meta.icon || "",
    rarity: s.legendary ? "Legendär" : "Skill",
    tags: [meta.label, s.legendary ? "Legendär" : "Skill", ...(s.keywords || [])],
    lines: [{ label: s.legendary ? "★ Legendär" : "Effekt", text: s.desc || "" }],
  });
}

// ---- Perks: flache Legendäre (PERK_DEFS) ----
for (const p of Object.values(PERK_DEFS)) {
  if (p.offerable === false) continue;
  const cat = CATEGORIES[p.cat] || { label: p.cat, color: "#8a8a95" };
  const rar = rarityOf(p.id);
  const rm = RARITY_META[rar] || { label: rar, color: "#8a8a95" };
  entries.push({
    kind: "Perk", id: p.id, name: p.label,
    group: cat.label, groupColor: cat.color, icon: rm.mark || "",
    rarity: rm.label || rar,
    tags: ["Perk", cat.label, rm.label || rar],
    lines: [{ label: "Effekt", text: p.desc || "" }],
  });
}

// ---- Perk-Familien (Rarität, 4 Stufen I–IV) ----
for (const f of FAMILY_LIST) {
  const cat = CATEGORIES[f.cat] || { label: f.cat, color: "#8a8a95" };
  const lines = tierRanges((t) => (f.tiers?.[t]?.desc) || "");
  entries.push({
    kind: "Perk-Familie", id: f.id, name: f.name,
    group: cat.label, groupColor: cat.color, icon: "",
    rarity: "Familie I–IV",
    tags: ["Perk-Familie", cat.label],
    lines,
  });
}

// ---- Architekt-Gebäude (ARCHITECT_FAMILIES) ----
const ARCH_CAT_LABEL = { value: "Wert", score: "Score", formation: "Formation" };
const ARCH_CAT_COLOR = { value: "#4f82d6", score: "#c79a2e", formation: "#3f9d63" };
const ROMANV = { 1: "I", 2: "II", 3: "III", 4: "IV" };
for (const fam of Object.values(ARCHITECT_FAMILIES)) {
  const catLabel = ARCH_CAT_LABEL[fam.category] || fam.category;
  // Maximal ERREICHBARE Stufe: stufen-inerte Formen (joker/transparentFarb/crossSeg) werden im Spiel auf Stufe 1
  // gepinnt (nicht aufwertbar) — mit tierKick bis zur Kick-Stufe `at`; alle anderen bis IV. So zeigt der Katalog
  // nur real existierende Stufen.
  const inert = TIER_INERT_KINDS.has(fam.base && fam.base.kind);
  const maxTier = inert ? (fam.tierKick ? fam.tierKick.at : 1) : 4;
  const lines = fam.legendary
    ? [{ label: "★ Legendär", text: archEff(fam, "legendary") }]
    : tierRanges((t) => archEff(fam, t), maxTier);
  const rarity = fam.legendary ? "Legendär" : (maxTier === 1 ? "fix · Stufe I (nicht aufwertbar)" : `Familie I–${ROMANV[maxTier]}`);
  entries.push({
    kind: "Gebäude", id: fam.id, name: fam.name,
    group: catLabel, groupColor: ARCH_CAT_COLOR[fam.category] || "#8a8a95", icon: "🏗",
    rarity,
    tags: ["Gebäude", catLabel, fam.form, fam.legendary ? "Legendär" : "Familie"],
    lines,
  });
}

// ---- Stats ----
for (const id of Object.keys(STAT_DEFS)) {
  const st = STAT_DEFS[id];
  entries.push({
    kind: "Stat", id, name: st.label || id,
    group: "Stat", groupColor: "#8a7de0", icon: "",
    rarity: "Stat",
    tags: ["Stat"],
    lines: [{ label: "Effekt", text: st.desc || st.help || "" }],
  });
}

// Suchtext je Eintrag vorberechnen (Name + id + tags + alle Effekt-Zeilen), lowercase.
for (const e of entries) {
  e.q = [e.name, e.id, e.kind, e.group, e.rarity, ...(e.tags || []), ...e.lines.map((l) => l.text)].join(" ").toLowerCase();
}

const KINDS = [...new Set(entries.map((e) => e.kind))];
const GROUPS = [...new Set(entries.map((e) => e.group))];
const stamp = process.env.VITE_BUILD_SHA || process.env.GITHUB_SHA || "lokal";

const html = `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Autostich — Core Game Database</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0c0c10; color: #e7eef5; font: 15px/1.5 system-ui, sans-serif; }
  header { padding: 18px 16px 10px; border-bottom: 1px solid #23232c; position: sticky; top: 0; background: #0c0c10ee; backdrop-filter: blur(4px); z-index: 5; }
  h1 { margin: 0 0 2px; font-size: 20px; }
  .sub { opacity: .55; font-size: 12px; }
  .controls { max-width: 1000px; margin: 10px auto 0; }
  #q { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #2b2b36; background: #16161c; color: #e7eef5; font-size: 15px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid #2b2b36; background: #16161c; color: #aab4c0; cursor: pointer; user-select: none; }
  .chip.on { background: #23304a; border-color: #3b7dbe; color: #cfe3ff; }
  main { max-width: 1000px; margin: 14px auto 60px; padding: 0 16px; }
  .count { opacity: .5; font-size: 12px; margin: 4px 2px 10px; }
  .card { border: 1px solid #23232c; border-left-width: 3px; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; background: #131318; }
  .card h3 { margin: 0; font-size: 15px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; text-transform: uppercase; letter-spacing: .04em; }
  .id { opacity: .35; font-size: 11px; font-family: ui-monospace, monospace; margin-left: auto; }
  .lines { margin: 6px 0 0; display: grid; gap: 3px; }
  .line { font-size: 13px; }
  .line b { color: #8fb7e6; font-weight: 600; margin-right: 6px; font-variant-numeric: tabular-nums; }
  .empty { opacity: .5; text-align: center; padding: 40px; }
  a.back { color: #8fb7e6; font-size: 12px; text-decoration: none; }
</style>
</head><body>
<header>
  <h1>🃏 Autostich — Core Game Database</h1>
  <div class="sub">Automatisch aus <code>src/game/*</code> generiert (Quelle der Wahrheit = Code). Stand: ${stamp} · <a class="back" href="../">← zum Spiel</a></div>
  <div class="controls">
    <input id="q" type="search" placeholder="Suchen — Name, Effekt, id …" autocomplete="off" autofocus>
    <div class="chips" id="kindChips"></div>
    <div class="chips" id="groupChips"></div>
  </div>
</header>
<main>
  <div class="count" id="count"></div>
  <div id="list"></div>
</main>
<script id="data" type="application/json">${JSON.stringify({ entries, kinds: KINDS, groups: GROUPS }).replace(/</g, "\\u003c")}</script>
<script>
  const DATA = JSON.parse(document.getElementById("data").textContent);
  const state = { q: "", kind: null, group: null };
  const el = (id) => document.getElementById(id);
  function chip(label, active, onClick) {
    const b = document.createElement("span");
    b.className = "chip" + (active ? " on" : ""); b.textContent = label; b.onclick = onClick; return b;
  }
  function renderChips() {
    const kc = el("kindChips"); kc.innerHTML = "";
    kc.appendChild(chip("Alle", state.kind === null, () => { state.kind = null; update(); }));
    for (const k of DATA.kinds) kc.appendChild(chip(k, state.kind === k, () => { state.kind = state.kind === k ? null : k; update(); }));
    const gc = el("groupChips"); gc.innerHTML = "";
    gc.appendChild(chip("Alle Kategorien", state.group === null, () => { state.group = null; update(); }));
    for (const g of DATA.groups) gc.appendChild(chip(g, state.group === g, () => { state.group = state.group === g ? null : g; update(); }));
  }
  function matches(e) {
    if (state.kind && e.kind !== state.kind) return false;
    if (state.group && e.group !== state.group) return false;
    if (state.q) { for (const term of state.q.split(/\\s+/).filter(Boolean)) if (!e.q.includes(term)) return false; }
    return true;
  }
  function render() {
    const list = el("list"); const found = DATA.entries.filter(matches);
    el("count").textContent = found.length + " von " + DATA.entries.length + " Einträgen";
    if (!found.length) { list.innerHTML = '<div class="empty">Nichts gefunden.</div>'; return; }
    list.innerHTML = found.map((e) => {
      const lines = e.lines.map((l) => '<div class="line"><b>' + esc(l.label) + '</b>' + esc(l.text) + '</div>').join("");
      return '<div class="card" style="border-left-color:' + e.groupColor + '">' +
        '<h3>' + (e.icon ? esc(e.icon) + ' ' : '') + esc(e.name) +
        '<span class="badge" style="background:' + e.groupColor + '22;color:' + e.groupColor + '">' + esc(e.kind) + ' · ' + esc(e.group) + '</span>' +
        '<span class="badge" style="background:#ffffff10;color:#aab4c0">' + esc(e.rarity) + '</span>' +
        '<span class="id">' + esc(e.id) + '</span></h3>' +
        '<div class="lines">' + lines + '</div></div>';
    }).join("");
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function update() { renderChips(); render(); }
  el("q").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });
  update();
</script>
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, "index.html"), html);
console.log(`[gen-db] ${entries.length} Einträge → ${resolve(OUT_DIR, "index.html")} (Kinds: ${KINDS.join(", ")})`);
