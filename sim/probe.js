/* ============================================================
   PROBE-CLI — die interaktive „Testumgebung" für neue/bestehende Perks, Familien, Skills, Shop-Items.
   Jagt einen beliebigen Registry-Eintrag durch isolierte Szenarien und druckt seine TATSÄCHLICHE Wirkung:
     · Hook-Familien (scoreFlat/scoreFlatOnCrit/cardBonus): Auswertung über benannte Sieg-/Stich-Szenarien je Stufe.
     · Deck-Familien (onPick, Kat. A / Shop-Karten / C_SACRIFICE): auf ein Demo-Deck angewandt → Wert-Diffs.
     · Planungs-Shop (onBuy): auf einen leeren Shop-State angewandt → Patch.
     · Marker (E-Werkzeuge, Anker, Skill-Flags): rohe Werte + Hinweis „von der Engine gelesen".

   Nutzung:
     node sim/probe.js <id>[:stufe]      npm run probe -- <id>[:stufe]
   Beispiele:
     npm run probe -- D_HIGH             (alle 4 Stufen)      npm run probe -- D_HIGH:2   (nur Stufe II)
     npm run probe -- L4                 (Legendär-Perk)      npm run probe -- SK_FIRE_08 (Skill)
     npm run probe -- SF_A_SCORE         (Shop-Anker)         npm run probe -- list       (alle IDs auflisten)
   ============================================================ */
import { PERK_DEFS } from "../src/game/perks.js";
import { FAMILY_DEFS } from "../src/game/families.js";
import { SKILL_DEFS } from "../src/game/skills.js";
import { buildDeck, makeRng, shuffledOrder } from "../src/game/deck.js";
import { SUIT_ORDER } from "../src/game/constants.js";

const HOOK_KEYS = ["scoreFlat", "scoreFlatOnCrit", "cardBonus", "scoreMult", "critChance", "critMultBonus"];
const STRUCTURAL = new Set(["id", "cat", "name", "desc", "tiers", "upgradeType", "rarity", "label", "legacyIds", "keywords", "archetype", "repeatable", "enabled", "offerable", "legendary", "anchorType"]);

// Benannte ctx-Szenarien — decken die von den Hooks gelesenen Felder ab. isRole/triumphActive true, damit Rollen-Hooks feuern.
const base = (o) => ({
  winValue: 5, margin: 5, winStreak: 1, wins: 1, hasFormation: false, lastResult: "win", lostLastTrick: false,
  suitStreak: 1, recentWinCount: 0, lastWinValue: 5, critFollowArmed: false, weaknessArmed: false, weaknessBig: false,
  misfireScore: 0, rawCrit: 1, posInCycle: 2, sinceWin: 0, lossStreak: 0, predValue: 4, pValueBase: 6,
  posForm: { mult: 1, formations: [] }, isRole: () => true, triumphActive: true, secondLastResult: "win",
  segmentLowRank: 0, segmentIndex: 0, trickNo: 3, ...o,
});
const SCENARIOS = {
  "Basissieg (W5,Vor5)":       base({}),
  "Hoher Sieg (W10,Vor12,S5,Form,Crit)": base({ winValue: 10, margin: 12, winStreak: 5, wins: 10, hasFormation: true, suitStreak: 4, recentWinCount: 4, lastWinValue: 10, rawCrit: 1.3, posInCycle: 4, posForm: { mult: 1.25, formations: [{ type: "wiederholung" }, { type: "treppe", ordinal: 3 }] } }),
  "Außenseiter (W2,Vor2)":     base({ winValue: 2, margin: 2, lastWinValue: 2, pValueBase: 2 }),
  "Nach Niederlage (Verl.2)":  base({ lastResult: "loss", lostLastTrick: true, lossStreak: 2, sinceWin: 4, winStreak: 0, wins: 0, secondLastResult: "loss" }),
  "Crit+Form+geladen":         base({ hasFormation: true, rawCrit: 1.25, critFollowArmed: true, weaknessArmed: true, weaknessBig: true, misfireScore: 400, posForm: { mult: 1.25, formations: [{ type: "wiederholung" }] } }),
  "Segment-Ende (Pos5,4 Vor.)": base({ posInCycle: 4, recentWinCount: 4, winStreak: 3, wins: 8 }),
};

const num = (v) => (typeof v === "number" ? (Math.round(v * 1000) / 1000).toString() : JSON.stringify(v));

function probeTier(label, def) {
  console.log(`\n  ── ${label} ──`);
  if (def.desc) console.log(`  „${def.desc}"`);
  const effectKeys = Object.keys(def).filter((k) => !STRUCTURAL.has(k));
  if (!effectKeys.length) { console.log("  (keine Effekt-Felder)"); return; }

  // 1) Hook-Funktionen über die Szenarien auswerten.
  const hooks = effectKeys.filter((k) => HOOK_KEYS.includes(k) && typeof def[k] === "function");
  for (const k of hooks) {
    const cells = Object.entries(SCENARIOS).map(([name, ctx]) => { let v; try { v = def[k](ctx); } catch (e) { v = "ERR"; } return `${name}=${num(v)}`; });
    console.log(`  ${k.padEnd(16)} → ${cells.join("  ")}`);
  }

  // 2) onPick (Deck-Paket) auf ein Demo-Deck anwenden → Wert-Diffs.
  if (typeof def.onPick === "function") {
    const rng = makeRng(7);
    const deck = buildDeck();
    const order = shuffledOrder(deck.length, makeRng(3));
    const t = demoTarget(def.pickTarget, deck, order);
    let after; try { after = def.onPick(deck, rng, t); } catch (e) { after = null; console.log(`  onPick             → FEHLER: ${e.message}`); }
    if (after) {
      const diffs = after.map((c, i) => (c.value !== deck[i].value ? `${c.id} ${deck[i].value}→${c.value}` : null)).filter(Boolean);
      const recol = after.map((c, i) => (c.suit !== deck[i].suit ? `${c.id} ${deck[i].suit}→${c.suit}` : null)).filter(Boolean);
      console.log(`  onPick (Demo-Deck) → ${diffs.length ? diffs.join(", ") : "keine Wertänderung"}${recol.length ? "  |  Farbe: " + recol.join(", ") : ""}`);
      if (def.pickTarget) console.log(`  Ziel               → ${JSON.stringify(def.pickTarget)} (Demo: ${JSON.stringify({ cardIds: t?.cardIds, suits: t?.suits, segment: t?.segment })})`);
    }
  }

  // 3) onBuy (Planungs-Shop) auf leeren Shop-State anwenden → Patch.
  if (typeof def.onBuy === "function") {
    let patch; try { patch = def.onBuy({}); } catch (e) { patch = { FEHLER: e.message }; }
    console.log(`  onBuy (Shop-Patch) → ${JSON.stringify(patch)}`);
  }

  // 3b) permMod (Legendär-Deck-Umbau, L1/L9) auf ein Demo-Deck mit den ersten needsTarget/randomTarget Karten.
  if (typeof def.permMod === "function") {
    const deck = buildDeck();
    const order = shuffledOrder(deck.length, makeRng(3));
    const n = def.needsTarget || def.randomTarget || 4;
    const ids = deck.slice(0, n).map((c) => c.id);
    let after; try { after = def.permMod(deck, order, ids); } catch (e) { after = null; console.log(`  permMod            → FEHLER: ${e.message}`); }
    if (after) {
      const diffs = after.map((c, i) => (c.value !== deck[i].value ? `${c.id} ${deck[i].value}→${c.value}` : null)).filter(Boolean);
      console.log(`  permMod (Ziel ${ids.join(",")}) → ${diffs.join(", ") || "keine Änderung"}`);
    }
  }

  // 4) Rest: Marker (Zahlen/Bools/Objekte) — von Engine/Formationen gelesen. Objekt-Marker mit Funktions-Feldern
  //    (z. B. anchor.at) über die Positionen 1..40 zeigen; Top-Level-Funktionen NICHT aufrufen (kein Positions-Prädikat).
  const markers = effectKeys.filter((k) => !hooks.includes(k) && k !== "onPick" && k !== "onBuy" && k !== "permMod");
  for (const k of markers) {
    const v = def[k];
    if (typeof v === "function") { console.log(`  ${k.padEnd(16)} → [Funktion — von der Engine gelesen]`); continue; }
    if (v && typeof v === "object") {
      const parts = Object.entries(v).map(([sk, sv]) => (typeof sv === "function"
        ? `${sk}=Pos[${Array.from({ length: 41 }, (_, p) => (sv(p) ? p + 1 : null)).filter((x) => x !== null).join(",")}]`
        : `${sk}=${JSON.stringify(sv)}`));
      console.log(`  ${k.padEnd(16)} → {${parts.join(", ")}}${k === "pickTarget" ? "" : "  [Engine-Marker]"}`);
      continue;
    }
    console.log(`  ${k.padEnd(16)} → ${JSON.stringify(v)}${k === "pickTarget" ? "" : "  [Engine-Marker]"}`);
  }
}

// Plausibles Ziel aus pickTarget bauen, damit onPick im Demo etwas tut. Deckt beide Ziel-Konventionen ab
// (families.js: target.cards/order · shopFamilies.js: target.cardIds/colors/segment).
function demoTarget(pickTarget, deck, order) {
  if (!pickTarget) return null;
  const t = {};
  if (pickTarget.cards) { const ids = deck.slice(0, pickTarget.cards).map((c) => c.id); t.cards = ids; t.cardIds = ids; t.order = order; }
  if (pickTarget.suits) t.suits = SUIT_ORDER.slice(0, pickTarget.suits);
  if (pickTarget.color) { t.cardIds = t.cardIds || [deck[0].id]; t.colors = Object.fromEntries(t.cardIds.map((id, i) => [id, SUIT_ORDER[(i + 1) % SUIT_ORDER.length]])); }
  if (pickTarget.segment) { t.segment = 0; t.order = order; }
  if (pickTarget.position != null) t.position = 0;
  if (pickTarget.formationType) t.formationType = "wiederholung";
  return t;
}

/* ---- Auflösung id → Registry ---- */
function resolve(rawId) {
  const [id, tierStr] = rawId.split(":");
  const tier = tierStr ? Number(tierStr) : null;
  if (PERK_DEFS[id]) return { kind: "Perk (Legendär/flach)", id, def: PERK_DEFS[id], single: true };
  if (SKILL_DEFS[id]) return { kind: `Skill (${SKILL_DEFS[id].archetype})`, id, def: SKILL_DEFS[id], single: true };
  if (FAMILY_DEFS[id]) return { kind: `Perk-Familie (Kat. ${FAMILY_DEFS[id].cat}, ${FAMILY_DEFS[id].upgradeType})`, id, fam: FAMILY_DEFS[id], tier };
  return null;
}

function listAll() {
  const line = (title, ids) => console.log(`\n${title} (${ids.length}):\n  ${ids.join("  ")}`);
  line("Perks", Object.keys(PERK_DEFS));
  line("Perk-Familien", Object.keys(FAMILY_DEFS));
  line("Skills", Object.keys(SKILL_DEFS));
}

const arg = process.argv[2];
if (!arg || arg === "list") {
  if (arg === "list") listAll();
  else console.log("Nutzung: node sim/probe.js <id>[:stufe]   (oder 'list' für alle IDs)\nBeispiele: D_HIGH · D_HIGH:2 · L4 · SK_FIRE_08 · SF_A_SCORE");
  process.exit(0);
}

const r = resolve(arg);
if (!r) { console.error(`Unbekannte ID: „${arg}". 'node sim/probe.js list' zeigt alle IDs.`); process.exit(1); }

console.log(`\n═══ ${r.kind}: ${r.id}${r.def?.name || r.fam?.name ? " — " + (r.def?.name || r.fam?.name) : ""} ═══`);
if (r.single) {
  probeTier(r.def.label || r.def.name || r.id, r.def);
} else {
  const tiers = r.tier ? [r.tier] : [1, 2, 3, 4];
  for (const t of tiers) { const def = r.fam.tiers[t]; if (def) probeTier(`Stufe ${t}`, def); }
}
console.log("");
