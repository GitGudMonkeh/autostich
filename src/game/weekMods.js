/* ============================================================
   WOCHEN-MODIFIKATOREN (#370 Ranked-Rework, Phase 2) — die „Roulette"-Regeln der Wochen-Rangliste.

   PUR & node-testbar (wie challenges.js/progression.js): NUR die Modifikator-Defs (data-driven) + die
   seed-deterministische Wochen-Auswahl. KEIN UI-/Asset-Import, KEIN localStorage, KEIN Date. rngAt(seed,…) ist
   seed-rein (kein globaler Zustand) → für alle Spieler identisch, bei Neustart reproduzierbar.

   Phase 2 liefert NUR Auswahl + Anzeige-Modell. Die WIRKUNG der 19 Modifikatoren (Engine-/Reducer-Nähte) kommt
   in Phase 3; `effect` ist der spätere Naht-Schlüssel, `mag` der (hier bereits gerollte) Magnitude-Wert.

   Regeln (Issue #370 §5):
   • 3–5 Modifikatoren pro Woche, ≥2 positiv und ≥1 negativ.
   • Deterministisch aus dem Wochen-Seed gewürfelt (eigener Adress-Strom rngAt(seed,"weekmods")).
   • Ausschluss-Paare (je 1 pos + 1 neg): beide Hälften nie zusammen — der POSITIVE gewinnt, der negative wird
     „neu gerollt". Alle übrigen dürfen koexistieren.
   ============================================================ */
import { rngAt } from "./rng.js";

// sign: "pos"|"neg". pair: Ausschluss-Paar-Key (pos & neg desselben pair schließen sich aus). range: [min,max]
//   → Magnitude wird seed-deterministisch gerollt. effect = späterer Reducer-/Engine-Naht-Schlüssel (Phase 3).
//   desc(mag) baut den Anzeigetext (mag ist der gerollte Wert bzw. undefined ohne range).
export const WEEK_MODS = [
  // ---- Negativ-Pool (10) ----
  { id: "blockForm",    sign: "neg",                 effect: "blockForm",    range: [10, 15], name: "Gesperrte Aufstell-Felder", desc: (v) => `${v} Aufstell-Felder blockiert` },
  { id: "blockArch",    sign: "neg",                 effect: "blockArch",    range: [10, 15], name: "Gesperrte Bau-Felder",      desc: (v) => `${v} Bau-Felder blockiert` },
  { id: "strongEnemies", sign: "neg", pair: "cards",  effect: "enemyValue",   range: [1, 3],   name: "Stärkere Gegner",          desc: (v) => `Gegnerkarten +${v} Wert` },
  { id: "deckShuffle",  sign: "neg",                 effect: "deckShuffle",                   name: "Deck-Shuffle",             desc: () => "Deck wird vor jeder Aufstellphase neu gemischt" },
  { id: "energyEbb",    sign: "neg", pair: "energy", effect: "energyEbb",                     name: "Energie-Ebbe",             desc: () => "Start mit 0 Aufstell-Energie" },
  { id: "tightBuild",   sign: "neg", pair: "build",  effect: "tightBuild",                    name: "Enge Aufstellung",         desc: () => "Nur 12 Bauplätze" },
  { id: "scarceSkills", sign: "neg",                 effect: "scarceSkills",                  name: "Skill-Verknappung",        desc: () => "Nur 1 Skill je Fraktion" },
  { id: "scarcePerks",  sign: "neg",                 effect: "scarcePerks",                   name: "Perk-Verknappung",         desc: () => "Nur 1 Perk je Auswahl" },
  { id: "noReroll",     sign: "neg",                 effect: "noReroll",                      name: "Kein Reroll",              desc: () => "0 Rerolls (alle Pools)" },
  { id: "perkCap",      sign: "neg", pair: "perk",   effect: "perkCap",                       name: "Perk-Deckel",              desc: () => "Keine sehr seltenen/raren Perks" },
  // ---- Positiv-Pool (9) ----
  { id: "strongCards",  sign: "pos", pair: "cards",  effect: "cardValue",    range: [1, 3],   name: "Starke Karten",            desc: (v) => `Spielerkarten +${v} Wert` },
  { id: "legTakt",      sign: "pos",                 effect: "legTakt",      range: [3, 5],   name: "Legendär-Takt",            desc: (v) => `Jede ${v}. Runde = Legendär-Perk-Phase` },
  { id: "skillFull",    sign: "pos",                 effect: "skillSlots",   range: [1, 3],   name: "Skill-Fülle",              desc: (v) => `+${v} Skillslots` },
  { id: "doubleLeg",    sign: "pos",                 effect: "doubleLeg",                     name: "Doppel-Legendär",          desc: () => "2 legendäre Slots — in der Legendär-Phase 2 wählbar" },
  { id: "noBuildLimit", sign: "pos", pair: "build",  effect: "noBuildLimit",                  name: "Kein Gebäudelimit",        desc: () => "Unbegrenzt bauen" },
  { id: "perkBlessing", sign: "pos", pair: "perk",   effect: "perkBlessing",                  name: "Perk-Segen",               desc: () => "Perks droppen nur sehr selten/rar" },
  { id: "energyFlood",  sign: "pos", pair: "energy", effect: "energyFlood",                   name: "Energie-Flut",             desc: () => "Doppelte Aufstell-Energie" },
  { id: "buildBoost",   sign: "pos",                 effect: "buildBoost",                    name: "Bau-Boost",                desc: () => "Gebäude-Boni ×2" },
  { id: "formBoost",    sign: "pos",                 effect: "formBoost",                     name: "Formations-Boost",         desc: () => "Formations-Boni ×2" },
];

export const WEEK_MOD_BY_ID = Object.fromEntries(WEEK_MODS.map((m) => [m.id, m]));
// Die vier Ausschluss-Paare (je 1 pos + 1 neg) — für Doku/Anzeige (Regeln-Reiter). Die Auswahl nutzt m.pair direkt.
export const WEEK_MOD_PAIRS = [
  { key: "cards",  pos: "strongCards",  neg: "strongEnemies" },
  { key: "perk",   pos: "perkBlessing", neg: "perkCap" },
  { key: "energy", pos: "energyFlood",  neg: "energyEbb" },
  { key: "build",  pos: "noBuildLimit", neg: "tightBuild" },
];

// Fisher-Yates mit dem seed-Rng → deterministische Reihenfolge.
function shuffled(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* Wochen-Auswahl (§5): 3–5 Modifikatoren, ≥2 positiv, ≥1 negativ, seed-deterministisch (für alle gleich, reproduzierbar).
   Konfliktregel „positive gewinnt": Positive werden in JEDER Phase zuerst betrachtet und belegen ihr Paar; der
   garantierte Negativ-Slot ist ein UNGEPAARTER Negativer → er blockiert nie einen Positiven, und beide Hälften eines
   Paars landen nie zusammen (eligible-Check). Rückgabe: Array {id, sign, name, effect, pair, mag, text}. */
export function pickWeekMods(seed) {
  const r = rngAt(seed, "weekmods");
  const count = 3 + Math.floor(r() * 3); // 3, 4 oder 5
  const POS = WEEK_MODS.filter((m) => m.sign === "pos");
  const NEG = WEEK_MODS.filter((m) => m.sign === "neg");
  const NEG_FREE = NEG.filter((m) => !m.pair); // ungepaarte Negative (immer ≥1 → Neg-Quote ohne Pair-Konflikt)
  const chosen = [];
  const claimed = new Set();
  const eligible = (m) => !chosen.includes(m) && !(m.pair && claimed.has(m.pair));
  const add = (m) => { chosen.push(m); if (m.pair) claimed.add(m.pair); };
  // 1) zwei Positive (Quote)
  for (const m of shuffled(POS, r)) { if (chosen.length >= 2) break; if (eligible(m)) add(m); }
  // 2) ein UNGEPAARTER Negativer (Quote, ohne ein Paar zu belegen → alle Paare gehen später an den Positiven)
  for (const m of shuffled(NEG_FREE, r)) { if (chosen.some((x) => x.sign === "neg")) break; if (eligible(m)) add(m); }
  // 3) auffüllen bis count: erst Positive (Pair-Priorität → pos gewinnt), dann Negative
  for (const m of [...shuffled(POS, r), ...shuffled(NEG, r)]) { if (chosen.length >= count) break; if (eligible(m)) add(m); }
  // Magnitude je Mod deterministisch rollen (nach der Auswahl → stabile Reihenfolge) + Anzeigetext bauen.
  return chosen.map((m) => {
    const mag = m.range ? m.range[0] + Math.floor(r() * (m.range[1] - m.range[0] + 1)) : null;
    return { id: m.id, sign: m.sign, name: m.name, effect: m.effect, pair: m.pair || null, mag, text: m.desc(mag) };
  });
}
