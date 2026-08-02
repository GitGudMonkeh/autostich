import * as C from "./constants.js";
import { FAMILY_LIST } from "./families.js";
import { TIERS, TIER_WEIGHTS, tierWeightsForShift, canOfferFamilyTier, familyTierOf } from "./rarity.js";
import { lightningCritRaw } from "./skills.js";

// Deutsche Zahlformatierung (2.5 → „2,5") — Beschreibungszahlen aus den Konstanten interpolieren (kein Text↔Code-Drift).
const de = (x) => String(x).replace(".", ",");
const pct = (x) => Math.round(x * 100);

/* ============================================================
   PERK-REGISTRY  — datengetrieben (wie clauses.js in TrickLadder).
   Score-/Wert-Hooks (alle optional), ausgewertet in engine.js:
     cardBonus(ctx)       -> Wert-Bonus auf die Spielerkarte DIESES Stichs (Kat. B/C/L)
     scoreFlat(ctx)       -> additiver Score bei Sieg (Kat. D — fließt in die multiplizierte Basis)
     scoreFlatOnCrit(ctx) -> additiver Score NUR bei Crit (Kat. D)
     scoreMult(ctx)       -> multiplikativer Score-Faktor bei Sieg
   Kat.-E/L-Sonderfälle laufen über Marker/Flags am Perk. Legendär-Perks-Rework (#203): critValueGain (L4),
   redistribute/zinseszins/vabanque/henker/echo/sammler/brennpunkt/patt (die 8 neuen) + extraSwap (E10) —
   je an ihrer Definition erklärt, verdrahtet in engine.js/reducer.js (ownsFlag/flagValue-Hooks).
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
  D: { key: "D", name: "Score",  desc: "Score",                   color: "#d4a63a" },
  E: { key: "E", name: "Form",   desc: "Formationswerkzeuge",      color: "#5a8ade" },
};

export const PERK_DEFS = {
  // ---- A: Deck & C: Rollen — vollständig zu Familien migriert (#167, families.js Kategorien A/C). Die früheren
  //      flachen A1–A10 bzw. C1–C10 sind entfernt; das Angebot bietet A/C nur noch als Familien (buildPerkOffer). ----

  // ---- E: Formationswerkzeuge — E1–E9 vollständig zu Familien migriert (#167, families.js Kategorie E). Ihre
  //      Wirkung steckt jetzt in computeFormations (familyTiers-bewusst). E10 „Feinjustierung" bleibt als Perk
  //      DEAKTIVIERT (offerable:false → nie angeboten) und wandert als Shop-Familie (#164); Def bleibt für die
  //      extraSwap-Engine/Bestands-Builds. ----
  E10: { id: "E10", cat: "E", label: "Feinjustierung", extraSwap: 1, offerable: false,
        desc: "Jede Formationsphase erhält einen zusätzlichen kostenlosen beliebigen Tausch." },

  // ---- B: Stich — vollständig zu Familien migriert (#167, families.js Kategorie B). Die früheren flachen
  //      B1–B10 sind entfernt; das Angebot bietet B nur noch als aufwertbare Familien (buildPerkOffer). ----

  // ---- C: Kartenrollen — vollständig zu Familien migriert (#167, families.js Kategorie C, gemischte Upgrade-Typen
  //      ROLE/REPLACEMENT/CUMULATIVE). Die früheren flachen C1–C10 sind entfernt; das Angebot bietet C nur noch als
  //      Familien (buildPerkOffer). Rollen liegen jetzt unter state.roles[familyId]; ctx.isRole(familyId) prüft sie. ----

  // ---- D: Score — vollständig zu Familien migriert (#167, siehe families.js Kategorie D). Die früheren
  //      flachen D1–D19 sind entfernt; das Angebot bietet D nur noch als aufwertbare Familien (buildPerkOffer). ----

  // ---- Legendär (#33): mächtig, aber mit Nachteil. rarity "legendary" → Gewicht 8 & Level-Gate ≥5
  //      (buildOffer). Nutzen bestehende Kategorien (A–E) plus die neuen Legendär-Hooks oben. ----
  // ---- Legendär-Perks-Rework (#203, 2026-07-30): 11 GENERISCHE Legendäre, nach HOOK organisiert (kein Archetyp).
  //      3 behalten (Unaufhaltsam/Raserei/Kritische Masse), 8 neu. „Verstärker, kein Motor" · „harte Bedingung →
  //      großer Payout" · distinct in der Art (lauf-verändernd/permanent/multiplikativ/deck-umformend) vs. Familien.
  //      Der ganze ×-Multiplikator-Raum ist family-free (Brennpunkt/Henker) = klare Legendär-Lane. Skala: Stich ⊂
  //      Segment(5) ⊂ Durchlauf(40) ⊂ Lauf. Engine-Hooks + ENV-Knöpfe je Flag.
  L2: { id: "L2", cat: "B", rarity: "legendary", label: "Unaufhaltsam",
        desc: `Solange du siegst, erhält die nächste Karte +${C.UNAUFHALTSAM_VALUE} Stichwert (bis eine Niederlage eintritt).`,
        cardBonus: (ctx) => (ctx.winStreak > 0 ? C.UNAUFHALTSAM_VALUE : 0) }, // Serie-Hook (Favorit, behalten)
  L6: { id: "L6", cat: "D", rarity: "legendary", label: "Raserei",
        desc: `Jeder Sieg in Folge gibt +${pct(C.RASEREI_CRIT_STEP)} % Crit-Chance. Über 100 % Gesamt-Crit wird der Überschuss zu Crit-Schaden (max +100 %).`,
        critChance: (ctx) => C.RASEREI_CRIT_STEP * (ctx.winStreak || 0),
        critMultBonus: (ctx) => Math.min(Math.max(0, (ctx.rawCrit || 0) - 1), 1) }, // Serie→Crit-Hook (Favorit, behalten)
  L4: { id: "L4", cat: "D", rarity: "legendary", label: "Kritische Masse", critValueGain: C.KRITMASSE_VALUE,
        desc: `Jeder Crit gibt der betreffenden Karte dauerhaft +1 Kartenwert (maximal +${C.KRITMASSE_VALUE}).` }, // Crit-Hook (revived L4)
  // --- 8 neue ---
  L_UMV: { id: "L_UMV", cat: "A", rarity: "legendary", label: "Umverteilung", redistribute: true,
        desc: "Sofort: alle Karten nehmen dauerhaft den durchschnittlichen Kartenwert des Decks an (keine Karte wird entfernt). Stark bei schiefem Deck." },
  L_ZINS: { id: "L_ZINS", cat: "C", rarity: "legendary", label: "Zinseszins", zinseszins: true,
        desc: `Jeder Durchlauf mit positiver Bilanz (mehr Siege als Niederlagen) hebt einen Dauer-Bonus um +${C.ZINSESZINS_STEP} Score; der aufgestapelte Bonus wird am Ende jedes Durchlaufs ausgezahlt (flach, kein Multiplikator).` },
  L_VAB: { id: "L_VAB", cat: "C", rarity: "legendary", label: "Vabanque", vabanque: true,
        desc: `Eröffnungs-Wette: Gewinnst du die ersten ${C.VABANQUE_TRICKS} Stiche eines Durchlaufs in Folge, gibt es +${C.VABANQUE_SCORE} Score (bis zu ${C.VABANQUE_MAX_PAYOUTS} Mal pro Lauf).` },
  L_HENK: { id: "L_HENK", cat: "D", rarity: "legendary", label: "Henker", henker: true,
        desc: `Im letzten Segment (Positionen ${C.HENKER_ZONE_START + 1}–40) zählt jeder Sieg ${de(C.HENKER_MULT)}-fach und ist garantiert ein Crit.` },
  L_ECHO: { id: "L_ECHO", cat: "C", rarity: "legendary", label: "Echo", echo: true,
        desc: `Am Ende jedes Durchlaufs wird dein höchstwertiger Stich dieses Durchlaufs noch einmal ×${de(C.ECHO_FACTOR)} gutgeschrieben.` },
  L_SAMM: { id: "L_SAMM", cat: "E", rarity: "legendary", label: "Sammler", sammler: true,
        desc: `Jede unterschiedliche Formationsart, die in einem Durchlauf gewinnt (höchstens ${C.SAMMLER_MAX}), gibt +${de(C.SAMMLER_STEP)} Formations-Multiplikator für den restlichen Durchlauf.` },
  L_BRENN: { id: "L_BRENN", cat: "E", rarity: "legendary", label: "Brennpunkt", brennpunkt: true,
        desc: `Gewinnt eine Karte in mindestens ${C.BRENNPUNKT_MIN_FORMS} gleichzeitigen Formationen, zählt der Stich ×${de(C.BRENNPUNKT_MULT)}.` },
  L_PATT: { id: "L_PATT", cat: "B", rarity: "legendary", label: "Patt", patt: true,
        desc: `Eine Niederlage um höchstens ${C.PATT_MARGIN} Werte zählt stattdessen als Sieg.` },
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
  // B-Stich, D-Score UND C-Rollen sind zu Familien migriert (#167) — ihre positions-/formations-/segmentbezogenen
  // Familien (u. a. Vorhut/Finisher/Joker/Bindeglied/Überlebensvorteil, Punktebonus/Kritische Ernte) sind in der
  // Aufstellungshilfe noch NICHT berücksichtigt (folgt mit #166 UI, da layoutPerks nur flache `perks` kennt).
  "L_HENK",                               // Henker (#203): letztes Segment (Positionen 36–40) — positionsgebunden
]);
export function isLayoutPerk(id) { return PERK_DEFS[id]?.cat === "E" || LAYOUT_EXTRA.has(id); }
export function layoutPerks(owned) { return (owned || []).filter(isLayoutPerk); }

/* ---- Familien-Umbau (Rarität #167 §2) ---- */

// Migrierte Kategorien: ihre REGULÄREN (nicht legendären) Perks sind jetzt Familien und kommen über FAMILY_DEFS
// ins Angebot statt über PERK_DEFS. Wächst mit jeder migrierten Kategorie (D, B, A, C; später +E).
export const MIGRATED_CATS = new Set(["D", "B", "A", "C", "E"]);

// Ist dieser flache Perk durch eine Familie ersetzt? Nur reguläre Perks migrierter Kategorien — die 11 generischen
// Legendären (#203, alle Kategorien) bleiben flach im Legendär-Pool (Spec §3.1).
export function isMigratedPerk(p) {
  return !!p && MIGRATED_CATS.has(p.cat) && (p.rarity || "common") !== "legendary";
}

/* Vereinheitlichtes Perk-Angebot (Spec §2): mischt die noch flachen Perks (A/B/C/E + Legendäre) mit den FAMILIEN
   der migrierten Kategorien (D). Ein Angebotseintrag ist ENTWEDER ein perkId-String (flach) ODER `{ familyId, tier }`
   (Familie auf einer anbietbaren Zielstufe). Familien-Stufen sind nach TIER_WEIGHTS gewichtet, flache Perks nach
   RARITY_WEIGHTS; der explizite Legendär-Wurf (P5) bleibt wie in buildOffer. Deterministisch über den injizierten
   rng. `owned` = flache Perk-ids; `familyTiers` = aktueller Rang je Familie. */
export function buildPerkOffer(owned = [], familyTiers = {}, rng = Math.random, count = C.PERKS_OFFERED, legendaryChance = 0, rareShift = 0, architectEnabled = false) {
  // #217 Meistergrade: Rarität-Shift (0 = Basis) verschiebt die Familien-Stufengewichte zu Selten/Rar. rareShift 0
  // liefert die Basistabelle → byte-identisch zum bisherigen Verhalten (Grad-0 / Sim / Bestandstests unberührt).
  const tierWeights = tierWeightsForShift(rareShift);
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
    // Gebäude-Perks (fam.needsArchitect) nur anbieten, wenn der Architekt aktiv ist. Sonst wären sie inert
    // (kein Gebäude-Overlay → underBuilding/coverCount stets leer) und würden im Architekt-freien Sim/Bestand
    // tote Angebots-Slots belegen. Default architectEnabled=false → Sim/Tests byte-identisch (kein Gebäude-Perk).
    if (fam.needsArchitect && !architectEnabled) continue;
    const cur = familyTierOf(familyTiers, fam.id);
    // FAMILY_DEFS führt `tiers` als OBJEKT {1:def,…} → anbietbare Stufen direkt über TIERS filtern
    // (nicht offerableTiers aus rarity.js, das ein Array erwartet).
    for (const t of TIERS) {
      if (fam.tiers[t] && canOfferFamilyTier(cur, t)) pool.push({ familyId: fam.id, tier: t, weight: tierWeights[t] || 0 });
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
// #181: Gesamt-Roh-Crit-Chance des NÄCHSTEN Siegs (UNGEKLEMMT) — geteilte Quelle für StatusRail + StatSelect
// (kein Drift). Spiegelt die Engine-Rechnung (engine.js:300): Perk-/Blitz-Basis + Crit-Chance-Stat. Der
// positionsabhängige Kritanker (§4.2) bleibt der Engine vorbehalten; die Live-Anzeige zeigt die Grundchance.
export function totalCritChanceRaw(state = {}) {
  const { perks = [], winStreak = 0, wins = 0, trickNo = 0, pos = 0, lightning, skills = [], statCritChance = 0 } = state;
  return critChanceRawFor(perks, { winValue: 0, winStreak: winStreak + 1, wins: wins + 1, trickNo, posInCycle: pos })
       + lightningCritRaw(lightning, skills) + statCritChance;
}
// Crit-Faktor: Basis (CRIT_BASE_MULT 1,5) + Crit-Mult-Stat (V2 §22.3, baseBonus). V2 trägt kein Perk
// mehr einen Crit-Mult (L5 ist jetzt Flat-Score) → nur Basis + Stat. Signatur (perks, ctx) bleibt für
// die Aufrufer (Engine/StatusRail) stabil. Geteilte Quelle für Engine + Anzeige (kein Drift).
// #115: additiver Perk→Crit-Mult-Kanal via `critMultBonus`-Hook (erwartet `rawCrit` im ctx). L6 „Raserei"
// wandelt Gesamt-Crit-Überschuss über 100 % in Crit-Schaden. Der Aufrufer muss `rawCrit` im ctx mitgeben.
export function critMultiplierFor(perks, ctx = {}, baseBonus = 0) {
  let bonus = 0;
  for (const id of perks) { const f = PERK_DEFS[id].critMultBonus; if (f) bonus += f(ctx); }
  return C.CRIT_BASE_MULT + Math.min(baseBonus || 0, C.STAT_CRIT_MULT_CAP) + bonus;
}
// Hat der Build überhaupt ein Crit-Perk? (steuert die UI-Sichtbarkeit der Crit-Anzeigen)
// V2: Crit-Chance kommt aus Stat/Blitz; D-Perks belohnen Crits über scoreFlatOnCrit; L6 trägt Crit-Chance → alle zählen.
export function hasCritPerk(perks) {
  return perks.some((id) => PERK_DEFS[id].scoreFlatOnCrit || PERK_DEFS[id].critChance);
}
// Produkt der scoreMult-Perks für einen Kontext (für Live-Anzeige des Score-Multiplikators, #23).
function scoreMultFor(perks, ctx) {
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
