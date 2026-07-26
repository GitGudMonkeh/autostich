import * as C from "./constants.js";
import { FAMILY_LIST } from "./families.js";
import { TIERS, TIER_WEIGHTS, canOfferFamilyTier, familyTierOf } from "./rarity.js";

/* ============================================================
   PERK-REGISTRY  — datengetrieben (wie clauses.js in TrickLadder).
   Score-/Wert-Hooks (alle optional), ausgewertet in engine.js:
     cardBonus(ctx)       -> Wert-Bonus auf die Spielerkarte DIESES Stichs (Kat. B/C/L)
     scoreFlat(ctx)       -> additiver Score bei Sieg (Kat. D — fließt in die multiplizierte Basis)
     scoreFlatOnCrit(ctx) -> additiver Score NUR bei Crit (Kat. D)
     scoreMult(ctx)       -> multiplikativer Score-Faktor bei Sieg
   Kat.-C/E/L-Sonderfälle laufen über Marker/Flags am Perk (needsTarget, relay, triumph, permMod,
   sacrificeMod, jokerRole/bridgeRole, segmentLow/segmentHigh, critValueGain, successorCrit,
   swapExtremes, repeatPos, randomTarget, extraSwap) — je an ihrer Definition erklärt.
   Crit-Chance/-Mult kommen NICHT aus den Perks, sondern aus Stat + Blitz-Skills (Engine).
   rarity: "legendary" markiert Legendaries (Default "common") — Gewicht in buildOffer.

   ctx-Felder je Stich: { posInCycle, trickNo, lastResult, lostLastTrick, winStreak, sinceWin,
     lossStreak, posForm, predValue, pValueBase, isRole, triumphActive, isSegmentLow, isSegmentHigh }
   ctx-Felder je Sieg: { winValue, margin, winStreak, wins, baseValue, hasFormation, lastResult,
     suitStreak, recentWinCount, lastWinValue, critFollowArmed, weaknessArmed, misfireScore, rawCrit }
   ============================================================ */

// Basis-Siegesserie (#39): IMMER aktiver, gedeckelter Serien-Multiplikator — jede Serie hebt den
// Score-Mult leicht. Geteilte Quelle für Engine-Score UND Anzeige (baseScoreMultFor → Header-Chip
// #37 / StatusRail #23) → kein Drift, analog zum Muster von scoreMultFor/critChanceFor (#23/#25).
export const streakBaseMult = (winStreak) => 1 + Math.min(winStreak * C.STREAK_BASE_STEP, C.STREAK_BASE_CAP);

export const CATEGORIES = {
  A: { key: "A", name: "Deck",   desc: "Dauerhafte Kartenwerte",   color: "#8a7de0" },
  B: { key: "B", name: "Stich",  desc: "Stich-Effekte",            color: "#e0605a" },
  C: { key: "C", name: "Rolle",  desc: "Kartenrollen",             color: "#5ab87a" },
  D: { key: "D", name: "Score",  desc: "Punkte",                   color: "#d4a63a" },
  E: { key: "E", name: "Form",   desc: "Formationswerkzeuge",      color: "#5a8ade" },
};

export const PERK_DEFS = {
  // ---- A: Deck — vollständig zu Familien migriert (#167, families.js Kategorie A, KUMULATIV). Die früheren
  //      flachen A1–A10 sind entfernt; das Angebot bietet A nur noch als aufwertbare Familien (buildPerkOffer). ----
  C6: { id: "C6", cat: "C", label: "Finisher", needsTarget: 2,
        desc: "Wähle zwei Karten. Auf der letzten Position eines Segments erhalten sie +5 Wert.",
        cardBonus: (ctx) => (ctx.isRole && ctx.isRole("C6") && ctx.posInCycle % 5 === 4 ? 5 : 0) },

  // ---- E-Formationsmarker (V2 §22.6) — reine Marker; Wirkung in computeFormations(perks). ----
  E6: { id: "E6", cat: "E", label: "Drehzahl",
        desc: "Eine einzelne Karte darf gleichzeitig zu zwei unterschiedlichen Treppen gehören." },
  E7: { id: "E7", cat: "E", label: "Kontrollverlust",
        desc: "Die Positionen 10, 20, 30 und 40 sind Anker (siegreicher Anker ×1,25)." },
  E8: { id: "E8", cat: "E", label: "Schnellschuss",
        desc: "Die Positionen 5, 15, 25 und 35 sind Anker (siegreicher Anker ×1,25)." },

  // ---- C-Rollen mit Formations-/Segment-Bezug (V2 §22.6) ----
  C7: { id: "C7", cat: "C", label: "Überlebensvorteil", segmentLow: true,
        desc: "Die niedrigste Karte jedes Segments erhält +3 Wert.",
        cardBonus: (ctx) => (ctx.isSegmentLow ? 3 : 0) }, // Engine markiert die Segment-Tiefsten je Durchlauf
  C8: { id: "C8", cat: "C", label: "Joker", needsTarget: 2, jokerRole: true,
        desc: "Wähle zwei Karten. Für einen Farbblock zählen sie als Farbe ihres direkten Vorgängers." },
  C9: { id: "C9", cat: "C", label: "Opfergabe", needsTarget: 1, sacrificeMod: true,
        desc: "Wähle eine Karte. Sie verliert dauerhaft 3 Wert; ihr direkter Nachfolger erhält dauerhaft +5 Wert." },
  C10: { id: "C10", cat: "C", label: "Bindeglied", needsTarget: 2, bridgeRole: true,
        desc: "Wähle zwei Karten. Für eine Treppe dürfen sie als 1 Wert höher oder niedriger gelten." },

  // ---- Seltene Perks (#71, Phase 2e) — Serien-/Tempo-/Crit-Mechanik (Engine-Flags + State) ----
  E9: { id: "E9", cat: "E", label: "Segmentarbeit",
        desc: "Formationen dürfen über Segmentgrenzen hinweg fortgesetzt werden." },
  // Rarität-Umbau (#162, Spec §3.3): E10 ist als Perk DEAKTIVIERT (offerable:false → nie angeboten) und wandert
  // als Shop-Familie „Feinjustierung" (#164). Definition bleibt vorerst für die extraSwap-Engine/Bestands-Builds.
  E10: { id: "E10", cat: "E", label: "Feinjustierung", extraSwap: 1, offerable: false,
        desc: "Jede Formationsphase erhält einen zusätzlichen kostenlosen beliebigen Tausch." },

  // ---- B: Stich — vollständig zu Familien migriert (#167, families.js Kategorie B). Die früheren flachen
  //      B1–B10 sind entfernt; das Angebot bietet B nur noch als aufwertbare Familien (buildPerkOffer). ----

  // ---- C: Kartenrollen (V2 §22.6) — meist mit manueller Kartenauswahl (needsTarget) ----
  //      Rollen liegen als Karten-ids in state.roles[perkId]; ctx.isRole(perkId) prüft die aktuelle Karte.
  C1: { id: "C1", cat: "C", label: "Vorhut", needsTarget: 3,
        desc: "Wähle drei Karten. Auf Position 1–5 erhalten sie +3 Wert.",
        cardBonus: (ctx) => (ctx.isRole && ctx.isRole("C1") && ctx.posInCycle <= 4 ? 3 : 0) },
  C2: { id: "C2", cat: "C", label: "Triumph", needsTarget: 3, triumph: true,
        desc: "Wähle drei Karten. Nach einem Sieg erhalten sie beim nächsten Auftauchen +2 Wert.",
        cardBonus: (ctx) => (ctx.triumphActive ? 2 : 0) }, // Engine armiert die Karte nach ihrem Sieg
  C3: { id: "C3", cat: "C", label: "Leibwache", needsTarget: 2,
        desc: "Wähle zwei Karten. Verliert ihr Vorgänger, erhalten sie +5 Wert.",
        cardBonus: (ctx) => (ctx.isRole && ctx.isRole("C3") && ctx.lastResult === "loss" ? 5 : 0) },
  C4: { id: "C4", cat: "C", label: "Staffelläufer", needsTarget: 3, relay: 1,
        desc: "Wähle drei Karten. Nach ihrem Sieg erhält der direkte Nachfolger +2 Wert." },
  C5: { id: "C5", cat: "C", label: "Anführer", needsTarget: 1, relay: 2,
        desc: "Wähle eine Karte. Nach ihrem Sieg erhalten die nächsten zwei Karten +2 Wert." },

  // ---- D: Score — vollständig zu Familien migriert (#167, siehe families.js Kategorie D). Die früheren
  //      flachen D1–D19 sind entfernt; das Angebot bietet D nur noch als aufwertbare Familien (buildPerkOffer). ----

  // ---- E: Formationswerkzeuge (V2 §22.6) — reine Marker; die Wirkung steckt in computeFormations(perks). ----
  E1: { id: "E1", cat: "E", label: "Schrittmacher",
        desc: "Eine Wiederholung darf genau eine fremde Karte zwischen zwei gleichen Werten enthalten." },
  E2: { id: "E2", cat: "E", label: "Farbbrücke",
        desc: "Eine einzelne andersfarbige Karte unterbricht einen Farbblock nicht (sie zählt nicht zur Formation)." },
  E3: { id: "E3", cat: "E", label: "Sanfter Anstieg",
        desc: "Eine Treppe darf einmal zwei gleiche Werte hintereinander enthalten." },
  E4: { id: "E4", cat: "E", label: "Großer Schritt",
        desc: "Eine Treppe darf einmal einen Rückschritt enthalten." },
  E5: { id: "E5", cat: "E", label: "Pendelwerk",
        desc: "Ein Wechsel löst bereits ab zwei Karten aus (Differenz weiterhin ≥4)." },

  // ---- Legendär (#33): mächtig, aber mit Nachteil. rarity "legendary" → Gewicht 8 & Level-Gate ≥5
  //      (buildOffer). Nutzen bestehende Kategorien (A–E) plus die neuen Legendär-Hooks oben. ----
  L1: { id: "L1", cat: "A", rarity: "legendary", label: "Überladung", needsTarget: 5,
        desc: "Wähle fünf Karten. Sie erhalten dauerhaft +6 Wert.",
        permMod: (deck, order, ids) => deck.map((c) => (ids.includes(c.id) ? { ...c, value: c.value + 6 } : c)) },
  L2: { id: "L2", cat: "B", rarity: "legendary", label: "Unaufhaltsam",
        desc: "Solange du siegst, erhält die nächste Karte +4 Wert (bis eine Niederlage eintritt).",
        cardBonus: (ctx) => (ctx.winStreak > 0 ? 4 : 0) }, // #115: flach & gedeckelt (kein Wert-Snowball mehr)
  L3: { id: "L3", cat: "A", rarity: "legendary", label: "Letztes Aufbäumen",
        desc: "Alle Karten auf den Positionen 36–40 erhalten +5 Wert.",
        cardBonus: (ctx) => (ctx.posInCycle >= 35 ? 5 : 0) },
  L4: { id: "L4", cat: "D", rarity: "legendary", label: "Kritische Masse", critValueGain: 4,
        desc: "Jeder Crit gibt der betreffenden Karte dauerhaft +1 Wert (maximal +4)." },
  L5: { id: "L5", cat: "D", rarity: "legendary", label: "Jackpot", randomTarget: 4, jackpotScore: 1000,
        desc: "Vier zufällige Karten geben bei ihrem ersten Crit pro Durchlauf +1.000 Score." },
  L6: { id: "L6", cat: "D", rarity: "legendary", label: "Raserei",
        desc: "Jeder Sieg in Folge gibt +5 % Crit-Chance. Über 100 % Gesamt-Crit wird der Überschuss zu Crit-Schaden (max +100 %).",
        // #115: neue DNA (Crit statt Wert). critChance fließt in die Gesamt-rawCrit; der Überschuss über 100 %
        // wird additiv zum Crit-Faktor (harmoniert mit D19 „Überschusskrit"). Kein Wert-Snowball → entsnowballt.
        critChance: (ctx) => 0.05 * (ctx.winStreak || 0),
        critMultBonus: (ctx) => Math.min(Math.max(0, (ctx.rawCrit || 0) - 1), 1) },
  // L7 „Königsmacher" ersatzlos entfernt (Rarität-Umbau #162, Spec §3.3/§7/§9 — nicht mehr im Pool/Angebot).
  L8: { id: "L8", cat: "A", rarity: "legendary", label: "Schicksalsmaschine", swapExtremes: true,
        desc: "Nach jedem Durchlauf tauschen die erfolgreichste und die erfolgloseste Karte ihre Werte." },
  L9: { id: "L9", cat: "A", rarity: "legendary", label: "Blutvertrag", needsTarget: 4,
        desc: "Wähle vier Karten. Sie verlieren dauerhaft 2 Wert; ihre direkten Nachfolger erhalten dauerhaft +6 Wert.",
        permMod: (deck, order, ids) => {
          const succ = new Set(ids.map((id) => {
            const idx = order.findIndex((di) => deck[di].id === id);
            return idx >= 0 && idx + 1 < order.length ? deck[order[idx + 1]].id : null;
          }).filter(Boolean));
          return deck.map((c) => { let v = c.value; if (ids.includes(c.id)) v -= 2; if (succ.has(c.id)) v += 6; return { ...c, value: Math.max(0, v) }; });
        } },
  L10: { id: "L10", cat: "D", rarity: "legendary", label: "Kettenreaktion", successorCrit: true,
        desc: "Nach einem Crit ist der direkte Nachfolger garantiert kritisch, falls er gewinnt." },
  L11: { id: "L11", cat: "A", rarity: "legendary", label: "Zeitraffer", repeatPos: true,
        desc: "Position 40 wiederholt die temporären Kartenwert-Effekte, die zuvor auf Position 20 ausgelöst wurden." },
};

export const PERK_LIST = Object.values(PERK_DEFS);

export const rarityOf    = (id) => PERK_DEFS[id]?.rarity || "common";
export const isLegendary = (id) => rarityOf(id) === "legendary";

// UI-Metadaten je Seltenheit (#71): grau / grün / gold — geteilte Quelle für PerkSelect,
// BuildSummary und GameOver (analog zu CATEGORIES.color). `badge` leer = keine Marke (Normal).
export const RARITY_META = {
  common:    { key: "common",    label: "Normal",   badge: "",           mark: "",   color: "#8a8a95" }, // grau
  rare:      { key: "rare",      label: "Selten",   badge: "◆ SELTEN",   mark: "◆",  color: "#4ade80" }, // grün
  legendary: { key: "legendary", label: "Legendär", badge: "★ LEGENDÄR", mark: "★",  color: "#d4a63a" }, // gold
};
export const rarityMeta = (id) => RARITY_META[rarityOf(id)];

// Perks, deren Wirkung von Position/Reihenfolge oder Formations-Zugehörigkeit abhängt — für die
// Aufstellungshilfe in Formationsphase & Kartenübersicht (Issue #95). Alle E-Werkzeuge (Kat. E)
// plus kuratierte B/C/D/L, deren Effekt an Position, direkter Nachbarschaft oder Formation hängt.
const LAYOUT_EXTRA = new Set([
  // B-Stich ist zu Familien migriert (#167) — die positions-/formationsbezogenen B-Familien folgen in der Layout-Hilfe mit #166.
  "C1", "C3", "C4", "C5", "C6", "C7", "C8", "C10", // Positions-/Nachbarschafts-/Segment-Rollen · Joker/Bindeglied (Formation)
  // D-Score ist zu Familien migriert (#167) — die formationsbezogenen D-Familien (Punktebonus/Kritische Ernte)
  // sind noch nicht in der Layout-Hilfe berücksichtigt (folgt mit #166 UI).
  "L3", "L11",                            // Positionen 36–40 · Position 20→40 (L7 „Königsmacher" entfernt, #162)
]);
export function isLayoutPerk(id) { return PERK_DEFS[id]?.cat === "E" || LAYOUT_EXTRA.has(id); }
export function layoutPerks(owned) { return (owned || []).filter(isLayoutPerk); }

/* ---- Familien-Umbau (Rarität #167 §2) ---- */

// Migrierte Kategorien: ihre REGULÄREN (nicht legendären) Perks sind jetzt Familien und kommen über FAMILY_DEFS
// ins Angebot statt über PERK_DEFS. Wächst mit jeder migrierten Kategorie (D, B, A; später +C/E).
export const MIGRATED_CATS = new Set(["D", "B", "A"]);

// Ist dieser flache Perk durch eine Familie ersetzt? Nur reguläre Perks migrierter Kategorien — die legendären
// D-Perks (L4/L5/L6/L10) bleiben flach im Legendär-Pool (Spec §3.1).
export function isMigratedPerk(p) {
  return !!p && MIGRATED_CATS.has(p.cat) && (p.rarity || "common") !== "legendary";
}

/* Vereinheitlichtes Perk-Angebot (Spec §2): mischt die noch flachen Perks (A/B/C/E + Legendäre) mit den FAMILIEN
   der migrierten Kategorien (D). Ein Angebotseintrag ist ENTWEDER ein perkId-String (flach) ODER `{ familyId, tier }`
   (Familie auf einer anbietbaren Zielstufe). Familien-Stufen sind nach TIER_WEIGHTS gewichtet, flache Perks nach
   RARITY_WEIGHTS; der explizite Legendär-Wurf (P5) bleibt wie in buildOffer. Deterministisch über den injizierten
   rng. `owned` = flache Perk-ids; `familyTiers` = aktueller Rang je Familie. */
export function buildPerkOffer(owned = [], familyTiers = {}, rng = Math.random, count = C.PERKS_OFFERED, legendaryChance = 0) {
  // Flacher Legacy-Pool: nicht besessen, offerable, NICHT migriert (reguläre D-Perks raus; Legendäre bleiben).
  let flat = PERK_LIST.filter((p) => !owned.includes(p.id) && p.offerable !== false && !isMigratedPerk(p));
  const chosen = [];
  let legendaries = 0;
  // Expliziter Legendär-Wurf (Shop-Spec §10 P5) — identisch zu buildOffer: nur bei übergebener Chance, dann genau
  // eines aus dem gewichteten Zug ausgeschlossen. Ohne Chance bleibt das Gewichtsmodell (Legendäre gewichtet im Pool).
  if (legendaryChance > 0) {
    const legs = flat.filter((p) => p.rarity === "legendary");
    flat = flat.filter((p) => p.rarity !== "legendary");
    if (legs.length && count > 0 && rng() < legendaryChance) {
      chosen.push(legs[Math.floor(rng() * legs.length)].id);
      legendaries = 1;
    }
  }
  // Kandidatenpool: flache Perks (Gewicht = RARITY_WEIGHTS) + Familien-Stufen (Gewicht = TIER_WEIGHTS[tier]).
  let pool = flat.map((p) => ({ perk: p.id, weight: C.RARITY_WEIGHTS[p.rarity || "common"], leg: (p.rarity || "common") === "legendary" }));
  for (const fam of FAMILY_LIST) {
    if (fam.enabled === false) continue;
    // Nur Familien MIGRIERTER Kategorien anbieten. Eine neu angelegte, aber noch nicht migrierte Familie
    // (z. B. Kategorie A) läuft sonst PARALLEL zu ihrem noch existierenden flachen Perk ins Angebot (Doppelung).
    if (!MIGRATED_CATS.has(fam.cat)) continue;
    const cur = familyTierOf(familyTiers, fam.id);
    // FAMILY_DEFS führt `tiers` als OBJEKT {1:def,…} → anbietbare Stufen direkt über TIERS filtern
    // (nicht offerableTiers aus rarity.js, das ein Array erwartet).
    for (const t of TIERS) {
      if (fam.tiers[t] && canOfferFamilyTier(cur, t)) pool.push({ familyId: fam.id, tier: t, weight: TIER_WEIGHTS[t] || 0 });
    }
  }
  // count VERSCHIEDENE Einheiten ziehen (eine Familie bzw. ein Perk höchstens einmal je Angebot, Spec §15).
  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((a, x) => a + x.weight, 0);
    if (total <= 0) break;
    let r = rng() * total, i = 0;
    while (i < pool.length - 1 && r >= pool[i].weight) { r -= pool[i].weight; i += 1; }
    const pick = pool[i];
    if (pick.familyId) {
      chosen.push({ familyId: pick.familyId, tier: pick.tier });
      pool = pool.filter((x) => x.familyId !== pick.familyId); // alle Stufen dieser Familie raus
    } else {
      chosen.push(pick.perk);
      if (pick.leg) legendaries += 1;
      pool = pool.filter((x) => x.perk !== pick.perk
        && !(legendaries >= C.MAX_LEGENDARIES_PER_OFFER && x.leg)); // Legendär-Limit je Angebot
    }
  }
  return chosen;
}

// Perk-Beitrag zur Roh-Crit-Chance (Σ critChance-Perks). V2: kein Perk trägt Crit-Chance → aktuell
// stets 0; Crit-Chance kommt aus Stat + Blitz (in der Engine addiert). Bleibt als Aggregations-/
// Anzeige-Quelle (#25): Engine (rawCrit) und PerkSelect/StatusRail summieren darauf. UNGEKLEMMT (>1 möglich).
export function critChanceRawFor(perks, ctx) {
  let raw = 0;
  for (const id of perks) { const f = PERK_DEFS[id].critChance; if (f) raw += f(ctx); }
  return raw;
}
export function critChanceFor(perks, ctx) {
  return Math.min(1, Math.max(0, critChanceRawFor(perks, ctx)));
}
// Crit-Faktor: Basis (CRIT_BASE_MULT 1,5) + Crit-Mult-Stat (V2 §22.3, baseBonus). V2 trägt kein Perk
// mehr einen Crit-Mult (L5 ist jetzt Flat-Score) → nur Basis + Stat. Signatur (perks, ctx) bleibt für
// die Aufrufer (Engine/StatusRail) stabil. Geteilte Quelle für Engine + Anzeige (kein Drift).
// #115: additiver Perk→Crit-Mult-Kanal via `critMultBonus`-Hook (erwartet `rawCrit` im ctx). L6 „Raserei"
// wandelt Gesamt-Crit-Überschuss über 100 % in Crit-Schaden. Der Aufrufer muss `rawCrit` im ctx mitgeben.
export function critMultiplierFor(perks, ctx = {}, baseBonus = 0) {
  let bonus = 0;
  for (const id of perks) { const f = PERK_DEFS[id].critMultBonus; if (f) bonus += f(ctx); }
  return C.CRIT_BASE_MULT + (baseBonus || 0) + bonus;
}
// Hat der Build überhaupt ein Crit-Perk? (steuert die UI-Sichtbarkeit der Crit-Anzeigen)
// V2: Crit-Chance kommt aus Stat/Blitz; D-Perks belohnen Crits über scoreFlatOnCrit; L6 trägt Crit-Chance → alle zählen.
export function hasCritPerk(perks) {
  return perks.some((id) => PERK_DEFS[id].scoreFlatOnCrit || PERK_DEFS[id].critChance);
}
// Produkt der scoreMult-Perks für einen Kontext (für Live-Anzeige des Score-Multiplikators, #23).
export function scoreMultFor(perks, ctx) {
  let m = 1;
  for (const id of perks) { const f = PERK_DEFS[id].scoreMult; if (f) m *= f(ctx); }
  return m;
}
// Anzeige-Score-Multiplikator (#23/#37): immer aktive Faktoren — Basis-Serie (#39) × Perk-scoreMult.
// winValue hoch → das bedingte D4 (×3 bei ≤3) bleibt ausgeblendet. EINE Quelle für Header-Chip (#37)
// UND StatusRail-Detail (#23) → kein Drift.
export function baseScoreMultFor(perks, { winStreak = 0, wins = 0, trickNo = 0, pos = 0 } = {}) {
  // AKTUELLE Serie (kein +1): Serie 0 → ×1,00, wächst während die Serie läuft (#39). winValue hoch →
  // bedingtes D4 (×3 bei ≤3) bleibt ausgeblendet. Reine Anzeige — das Scoring nutzt die resultierende Serie.
  const ctx = { winStreak, winValue: 99, wins, trickNo, posInCycle: pos };
  return streakBaseMult(winStreak) * scoreMultFor(perks, ctx);
}
