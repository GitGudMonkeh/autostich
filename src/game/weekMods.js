/* ============================================================
   WOCHEN-MODIFIKATOREN (#370 Ranked-Rework, Phase 2) — die „Roulette"-Regeln der Wochen-Rangliste.

   PUR & node-testbar (wie progression.js): NUR die Modifikator-Defs (data-driven) + die
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
import { TIER_META } from "./rarity.js"; // Raritäts-Namen: EINE Quelle (vorher „sehr selten/rar" abgetippt)

// sign: "pos"|"neg". pair: Ausschluss-Paar-Key (pos & neg desselben pair schließen sich aus). range: [min,max]
//   → Magnitude wird seed-deterministisch gerollt. effect = späterer Reducer-/Engine-Naht-Schlüssel (Phase 3).
//   desc(mag) baut den Anzeigetext (mag ist der gerollte Wert bzw. undefined ohne range).
/* Feste Stärken, die NICHT gewürfelt werden. Sie standen bisher doppelt: als Literal in der Wirkung
   (reducer.js/engine.js) UND abgetippt im Beschreibungstext — genau die Drift-Form, die die
   Sprachprüfung überall sonst beseitigt hat. Jetzt eine Quelle, die beide Seiten speist. */
export const TIGHT_BUILD_COVER = 12;  // „Enge Aufstellung": fester Baufeld-Deckel
export const BOOST_FACTOR = 2;        // „Bau-Boost"/„Formations-Boost": Bonus-Überschuss ×N

export const WEEK_MODS = [
  // ---- Negativ-Pool (10) ----
  { id: "blockForm",    sign: "neg",                 effect: "blockForm",    range: [10, 15], name: "Gesperrte Aufstell-Felder", desc: (v) => `${v} Positionen der Aufstellung blockiert` },
  { id: "blockArch",    sign: "neg",                 effect: "blockArch",    range: [10, 15], name: "Gesperrte Baufeld-Zellen",  desc: (v) => `${v} Baufeld-Zellen blockiert` },
  { id: "strongEnemies", sign: "neg", pair: "cards",  effect: "enemyValue",   range: [1, 3],   name: "Stärkere Gegner",          desc: (v) => `Gegnerkarten +${v} Wert` },
  { id: "deckShuffle",  sign: "neg",                 effect: "deckShuffle",                   name: "Deck-Shuffle",             desc: () => "Deck wird vor jeder Aufstellungsphase neu gemischt" },
  { id: "energyEbb",    sign: "neg", pair: "energy", effect: "energyEbb",                     name: "Energie-Ebbe",             desc: () => "Start mit 0 Formations-Energie" },
  { id: "tightBuild",   sign: "neg", pair: "build",  effect: "tightBuild",                    name: "Enge Aufstellung",         desc: () => `Nur ${TIGHT_BUILD_COVER} Baufeld-Zellen` },
  { id: "scarceSkills", sign: "neg",                 effect: "scarceSkills",                  name: "Skill-Verknappung",        desc: () => "Nur 1 Skill je Archetyp" },
  { id: "scarcePerks",  sign: "neg",                 effect: "scarcePerks",                   name: "Perk-Verknappung",         desc: () => "Nur 1 Perk je Auswahl" },
  { id: "noReroll",     sign: "neg",                 effect: "noReroll",                      name: "Kein Reroll",              desc: () => "0 Rerolls (alle Pools)" },
  { id: "perkCap",      sign: "neg", pair: "perk",   effect: "perkCap",                       name: "Perk-Deckel",              desc: () => `Keine ${TIER_META[3].label.toLowerCase()}en/${TIER_META[4].label.toLowerCase()}en Perks` },
  // ---- Positiv-Pool (9) ----
  { id: "strongCards",  sign: "pos", pair: "cards",  effect: "cardValue",    range: [1, 3],   name: "Starke Karten",            desc: (v) => `Spielerkarten +${v} Wert` },
  { id: "legTakt",      sign: "pos",                 effect: "legTakt",      range: [3, 5],   name: "Legendär-Takt",            desc: (v) => `Jede ${v}. Perk-Phase: 3 Legendär-Perks` },
  { id: "skillFull",    sign: "pos",                 effect: "skillSlots",   range: [1, 3],   name: "Skill-Fülle",              desc: (v) => `+${v} Skillslots` },
  { id: "doubleLeg",    sign: "pos",                 effect: "doubleLeg",                     name: "Doppel-Legendär",          desc: () => "2 legendäre Slots: in der Legendär-Phase 2 wählbar" },
  { id: "noBuildLimit", sign: "pos", pair: "build",  effect: "noBuildLimit",                  name: "Kein Gebäudelimit",        desc: () => "Unbegrenzt bauen" },
  { id: "perkBlessing", sign: "pos", pair: "perk",   effect: "perkBlessing",                  name: "Perk-Segen",               desc: () => `Perks droppen nur ${TIER_META[3].label.toLowerCase()}/${TIER_META[4].label.toLowerCase()}` },
  { id: "energyFlood",  sign: "pos", pair: "energy", effect: "energyFlood",                   name: "Energie-Flut",             desc: () => "Doppelte Formations-Energie" },
  { id: "buildBoost",   sign: "pos",                 effect: "buildBoost",                    name: "Bau-Boost",                desc: () => `Gebäude-Boni ×${BOOST_FACTOR}` },
  { id: "formBoost",    sign: "pos",                 effect: "formBoost",                     name: "Formations-Boost",         desc: () => `Formations-Boni ×${BOOST_FACTOR}` },
];

export const WEEK_MOD_BY_ID = Object.fromEntries(WEEK_MODS.map((m) => [m.id, m]));
// Die vier Ausschluss-Paare (je 1 pos + 1 neg) — für Doku/Anzeige (Regeln-Reiter). Die Auswahl nutzt m.pair direkt.
export const WEEK_MOD_PAIRS = [
  { key: "cards",  pos: "strongCards",  neg: "strongEnemies" },
  { key: "perk",   pos: "perkBlessing", neg: "perkCap" },
  { key: "energy", pos: "energyFlood",  neg: "energyEbb" },
  { key: "build",  pos: "noBuildLimit", neg: "tightBuild" },
];

// Ist ein Wochen-Mod (nach effect) in der Liste aktiv? Für Flag-Mods ohne Magnitude (z. B. scarcePerks).
export function hasWeekMod(weekMods, effect) {
  return Array.isArray(weekMods) && weekMods.some((m) => m.effect === effect);
}
// Magnitude eines Wochen-Mods lesen (0 wenn nicht aktiv / kein mag). state.weekMods = [{ effect, mag, … }] (nur Ranked).
export function weekModMag(weekMods, effect) {
  if (!Array.isArray(weekMods)) return 0;
  const m = weekMods.find((x) => x.effect === effect);
  return m ? (Number(m.mag) || 0) : 0;
}

// Fisher-Yates mit dem seed-Rng → deterministische Reihenfolge.
function shuffled(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* Wochen-Auswahl (§5): 3–5 Modifikatoren, ≥2 positiv, ≥1 negativ, seed-deterministisch (für alle gleich, reproduzierbar).

   Die Negativ-QUOTE wird zuerst gewürfelt (1 .. count−2), damit beide Quoten-Untergrenzen (≥2 pos, ≥1 neg) per
   Konstruktion halten und die Mischung trotzdem variiert. Danach:
     1) `posWanted` Positive ziehen — sie belegen ihr Ausschluss-Paar zuerst („positiv gewinnt", §5).
     2) `negWanted` Negative auffüllen; wessen Paar oben belegt wurde, wird übersprungen — das IST das im
        Spec gemeinte „der negative wird neu gerollt".
   [FIX] Die Vorgängerfassung füllte in einer gemeinsamen Schleife `[...POS, ...NEG]` auf. Weil nach der
   Positiv-Quote immer genug eligible Positive übrig waren, kam die Negativ-Hälfte der Liste nie an die Reihe:
   jede Woche hatte GENAU einen Negativen (den ungepaarten Quoten-Slot), und die vier GEPAARTEN Negativen
   (strongEnemies / energyEbb / tightBuild / perkCap) waren über 200k Seeds nachweislich unerreichbar — 21 % des
   Katalogs tot, und die Ausschluss-Paar-Regel lief leer, weil ihre negative Hälfte nie im Rennen war.

   Rückgabe: Array {id, sign, name, effect, pair, mag, text}. */
export function pickWeekMods(seed) {
  const r = rngAt(seed, "weekmods");
  const count = 3 + Math.floor(r() * 3); // 3, 4 oder 5
  // Negativ-Quote: mindestens 1, und es müssen ≥2 Positive übrig bleiben → 1 .. count−2.
  const negWanted = 1 + Math.floor(r() * (count - 2));
  const posWanted = count - negWanted;
  const POS = WEEK_MODS.filter((m) => m.sign === "pos");
  const NEG = WEEK_MODS.filter((m) => m.sign === "neg");
  const chosen = [];
  const claimed = new Set();
  const eligible = (m) => !chosen.includes(m) && !(m.pair && claimed.has(m.pair));
  const add = (m) => { chosen.push(m); if (m.pair) claimed.add(m.pair); };
  // 1) Positive (Quote) — belegen ihre Paare, bevor die Negativen ziehen.
  for (const m of shuffled(POS, r)) { if (chosen.length >= posWanted) break; if (eligible(m)) add(m); }
  // 2) Negative (Quote) — ein Negativer mit belegtem Paar fällt raus („neu gerollt").
  for (const m of shuffled(NEG, r)) { if (chosen.length >= count) break; if (eligible(m)) add(m); }
  // 3) Sicherheitsnetz: blieben zu wenige eligible Negative, mit Positiven auf count auffüllen. Beim aktuellen
  //    Katalog unerreichbar (6 der 10 Negativen sind ungepaart) — nur rng verbrauchen, wenn wirklich nötig.
  if (chosen.length < count) {
    for (const m of shuffled(POS, r)) { if (chosen.length >= count) break; if (eligible(m)) add(m); }
  }
  // Magnitude je Mod deterministisch rollen (nach der Auswahl → stabile Reihenfolge) + Anzeigetext bauen.
  return chosen.map((m) => {
    const mag = m.range ? m.range[0] + Math.floor(r() * (m.range[1] - m.range[0] + 1)) : null;
    return { id: m.id, sign: m.sign, name: m.name, effect: m.effect, pair: m.pair || null, mag, text: m.desc(mag) };
  });
}
