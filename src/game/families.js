import { UPGRADE_TYPES, withFamilyTier } from "./rarity.js";

/* ============================================================
   FAMILIEN-REGISTRY (Rarität-Umbau #163, Spec docs/rarity-system.md §3.2).
   Reguläre Perks als aufwertbare FAMILIEN mit vier Stufen (I–IV). Legendäre (L1–L11) bleiben
   im flachen PERK_DEFS und außerhalb dieses Systems.

   Schema:
     FAMILY_DEFS[familyId] = {
       id, cat ∈ A/B/C/D/E, name, upgradeType ∈ UPGRADE_TYPES,
       tiers: { 1: TierDef, 2: TierDef, 3: TierDef, 4: TierDef },
     }
   TierDef trägt `desc` + je nach Effektart Hooks/Marker (gleiche Shape wie die Perk-Hooks):
     - replacement: nur der Hook der HÖCHSTEN gehaltenen Stufe ist aktiv (resolveActiveTier).
       Score-Hooks: scoreFlat(ctx) / scoreFlatOnCrit(ctx) / scoreMult(ctx); Wert-Hook: cardBonus(ctx).
       Engine-gekoppelte Stufen führen zusätzlich Daten-Parameter (z. B. misfireStep/misfireCap), die die
       Engine bei der Umstellung liest — der Hook liefert den Primäreffekt.
     - cumulative / role: folgen mit den A-/C-Familien (#163 Fortsetzung).

   Diese Datei ist ADDITIV: sie wird von der Engine erst mit der schrittweisen Umstellung konsumiert
   (Resolver unten). Reine Logik — kein Math.random / Date.
   ============================================================ */

const { REPLACEMENT } = UPGRADE_TYPES;

// ---- D · Score (Spec §3.2 D) — allesamt Regelersetzung (nur die höchste Stufe ist aktiv). ----
// Kontextfelder je Sieg (aus der Engine): winValue, margin, winStreak, wins, hasFormation, lastResult,
// suitStreak, recentWinCount, lastWinValue, critFollowArmed, weaknessArmed, misfireScore, rawCrit.
const D_FAMILIES = {
  D_FORMATION_BONUS: {
    id: "D_FORMATION_BONUS", cat: "D", name: "Punktebonus", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Sieg mit mindestens einer aktiven Formation gibt +50 Score.",  scoreFlat: (c) => (c.hasFormation ? 50 : 0) },
      2: { desc: "Ein Sieg mit mindestens einer aktiven Formation gibt +100 Score.", scoreFlat: (c) => (c.hasFormation ? 100 : 0) },
      3: { desc: "Ein Sieg mit mindestens einer aktiven Formation gibt +175 Score.", scoreFlat: (c) => (c.hasFormation ? 175 : 0) },
      4: { desc: "Ein Sieg mit mindestens einer aktiven Formation gibt +300 Score.", scoreFlat: (c) => (c.hasFormation ? 300 : 0) },
    },
  },
  D_STREAK: {
    id: "D_STREAK", cat: "D", name: "Siegesserie", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Jeder Sieg gibt +15 Score je Serienpunkt, maximal +150.", scoreFlat: (c) => Math.min(15 * (c.winStreak || 0), 150) },
      2: { desc: "Jeder Sieg gibt +25 Score je Serienpunkt, maximal +250.", scoreFlat: (c) => Math.min(25 * (c.winStreak || 0), 250) },
      3: { desc: "Jeder Sieg gibt +35 Score je Serienpunkt, maximal +420.", scoreFlat: (c) => Math.min(35 * (c.winStreak || 0), 420) },
      4: { desc: "Jeder Sieg gibt +50 Score je Serienpunkt, maximal +750.", scoreFlat: (c) => Math.min(50 * (c.winStreak || 0), 750) },
    },
  },
  D_HIGH: {
    id: "D_HIGH", cat: "D", name: "Hohe Karten, hohe Belohnung", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Sieg mit Kartenwert 9 oder höher gibt +100 Score.", scoreFlat: (c) => (c.winValue >= 9 ? 100 : 0) },
      2: { desc: "Ein Sieg mit Kartenwert 8 oder höher gibt +150 Score.", scoreFlat: (c) => (c.winValue >= 8 ? 150 : 0) },
      3: { desc: "Ein Sieg mit Kartenwert 7 oder höher gibt +225 Score.", scoreFlat: (c) => (c.winValue >= 7 ? 225 : 0) },
      4: { desc: "Ein Sieg mit Kartenwert 6 oder höher gibt +350 Score.", scoreFlat: (c) => (c.winValue >= 6 ? 350 : 0) },
    },
  },
  D_UNDERDOG: {
    id: "D_UNDERDOG", cat: "D", name: "Außenseitersieg", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Sieg mit Kartenwert 2 oder niedriger gibt +250 Score.", scoreFlat: (c) => (c.winValue <= 2 ? 250 : 0) },
      2: { desc: "Ein Sieg mit Kartenwert 3 oder niedriger gibt +350 Score.", scoreFlat: (c) => (c.winValue <= 3 ? 350 : 0) },
      3: { desc: "Ein Sieg mit Kartenwert 4 oder niedriger gibt +500 Score.", scoreFlat: (c) => (c.winValue <= 4 ? 500 : 0) },
      4: { desc: "Ein Sieg mit Kartenwert 5 oder niedriger gibt +750 Score.", scoreFlat: (c) => (c.winValue <= 5 ? 750 : 0) },
    },
  },
  D_TENTH_WIN: {
    id: "D_TENTH_WIN", cat: "D", name: "Zehnter Sieg", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Jeder 12. gewonnene Stich gibt +600 Score.",  scoreFlat: (c) => (c.wins % 12 === 0 ? 600 : 0) },
      2: { desc: "Jeder 10. gewonnene Stich gibt +800 Score.",  scoreFlat: (c) => (c.wins % 10 === 0 ? 800 : 0) },
      3: { desc: "Jeder 8. gewonnene Stich gibt +900 Score.",   scoreFlat: (c) => (c.wins % 8 === 0 ? 900 : 0) },
      4: { desc: "Jeder 5. gewonnene Stich gibt +1.000 Score.", scoreFlat: (c) => (c.wins % 5 === 0 ? 1000 : 0) },
    },
  },
  D_CRIT_SCORE: {
    id: "D_CRIT_SCORE", cat: "D", name: "Kritische Chance", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Jeder Crit gibt +100 Score.", scoreFlatOnCrit: () => 100 },
      2: { desc: "Jeder Crit gibt +175 Score.", scoreFlatOnCrit: () => 175 },
      3: { desc: "Jeder Crit gibt +275 Score.", scoreFlatOnCrit: () => 275 },
      4: { desc: "Jeder Crit gibt +450 Score.", scoreFlatOnCrit: () => 450 },
    },
  },
  D_SHARP_EYE: {
    id: "D_SHARP_EYE", cat: "D", name: "Geschärfter Blick", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Crit mit Kartenwert 9 oder höher gibt +225 Score.", scoreFlatOnCrit: (c) => (c.winValue >= 9 ? 225 : 0) },
      2: { desc: "Ein Crit mit Kartenwert 8 oder höher gibt +350 Score.", scoreFlatOnCrit: (c) => (c.winValue >= 8 ? 350 : 0) },
      3: { desc: "Ein Crit mit Kartenwert 7 oder höher gibt +500 Score.", scoreFlatOnCrit: (c) => (c.winValue >= 7 ? 500 : 0) },
      4: { desc: "Ein Crit mit Kartenwert 6 oder höher gibt +750 Score.", scoreFlatOnCrit: (c) => (c.winValue >= 6 ? 750 : 0) },
    },
  },
  D_CRIT_MOMENTUM: {
    id: "D_CRIT_MOMENTUM", cat: "D", name: "Kritisches Momentum", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Jeder Crit in einer Serie ab 3 gibt +150 Score.",       scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 3 ? 150 : 0) },
      2: { desc: "Jeder Crit in einer Serie ab 2 gibt +250 Score.",       scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 2 ? 250 : 0) },
      3: { desc: "Jeder Crit innerhalb einer Serie gibt +350 Score.",     scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 1 ? 350 : 0) },
      // IV: zusätzlich steigt die Serie um 1 (Engine-Extra, liest streakGainOnCrit bei der Umstellung).
      4: { desc: "Jeder Crit innerhalb einer Serie gibt +500 Score; die Serie steigt zusätzlich um 1.", scoreFlatOnCrit: (c) => ((c.winStreak || 0) >= 1 ? 500 : 0), streakGainOnCrit: 1 },
    },
  },
  D_RHYTHM: {
    id: "D_RHYTHM", cat: "D", name: "Perfekter Rhythmus", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Jeder 7. gewonnene Stich gibt +250 Score.", scoreFlat: (c) => (c.wins % 7 === 0 ? 250 : 0) },
      2: { desc: "Jeder 5. gewonnene Stich gibt +350 Score.", scoreFlat: (c) => (c.wins % 5 === 0 ? 350 : 0) },
      3: { desc: "Jeder 4. gewonnene Stich gibt +450 Score.", scoreFlat: (c) => (c.wins % 4 === 0 ? 450 : 0) },
      4: { desc: "Jeder 3. gewonnene Stich gibt +600 Score.", scoreFlat: (c) => (c.wins % 3 === 0 ? 600 : 0) },
    },
  },
  D_OVERPOWER: {
    id: "D_OVERPOWER", cat: "D", name: "Übermacht", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Sieg mit mindestens 10 Wertpunkten Vorsprung gibt +300 Score.", scoreFlat: (c) => (c.margin >= 10 ? 300 : 0) },
      2: { desc: "Ein Sieg mit mindestens 8 Wertpunkten Vorsprung gibt +400 Score.",  scoreFlat: (c) => (c.margin >= 8 ? 400 : 0) },
      3: { desc: "Ein Sieg mit mindestens 6 Wertpunkten Vorsprung gibt +550 Score.",  scoreFlat: (c) => (c.margin >= 6 ? 550 : 0) },
      4: { desc: "Ein Sieg mit mindestens 4 Wertpunkten Vorsprung gibt +750 Score.",  scoreFlat: (c) => (c.margin >= 4 ? 750 : 0) },
    },
  },
  D_CRIT_HARVEST: {
    id: "D_CRIT_HARVEST", cat: "D", name: "Kritische Ernte", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Crit mit einer Karte in mindestens einer aktiven Formation gibt +175 Score.", scoreFlatOnCrit: (c) => (c.hasFormation ? 175 : 0) },
      2: { desc: "Ein Crit mit einer Karte in mindestens einer aktiven Formation gibt +300 Score.", scoreFlatOnCrit: (c) => (c.hasFormation ? 300 : 0) },
      3: { desc: "Ein Crit mit einer Karte in mindestens einer aktiven Formation gibt +475 Score.", scoreFlatOnCrit: (c) => (c.hasFormation ? 475 : 0) },
      4: { desc: "Ein Crit mit einer Karte in mindestens einer aktiven Formation gibt +750 Score.", scoreFlatOnCrit: (c) => (c.hasFormation ? 750 : 0) },
    },
  },
  D_PRECISION: {
    id: "D_PRECISION", cat: "D", name: "Präzision", upgradeType: REPLACEMENT,
    // I/II: exakt gleicher Wert wie der letzte Sieg. III/IV: gleicher oder ±1 Wert. (IV-Kette: Engine-Extra.)
    tiers: {
      1: { desc: "Zwei aufeinanderfolgende Siege mit demselben Kartenwert geben dem zweiten +250 Score.",        scoreFlat: (c) => (c.lastWinValue != null && c.winValue === c.lastWinValue ? 250 : 0) },
      2: { desc: "Zwei aufeinanderfolgende Siege mit demselben Kartenwert geben dem zweiten +450 Score.",        scoreFlat: (c) => (c.lastWinValue != null && c.winValue === c.lastWinValue ? 450 : 0) },
      3: { desc: "Zwei aufeinanderfolgende Siege mit gleichem oder um 1 abweichendem Wert geben +550 Score.",    scoreFlat: (c) => (c.lastWinValue != null && Math.abs(c.winValue - c.lastWinValue) <= 1 ? 550 : 0) },
      4: { desc: "Zwei aufeinanderfolgende Siege mit gleichem oder um 1 abweichendem Wert geben +800 Score; die Kette kann weiterlaufen.", scoreFlat: (c) => (c.lastWinValue != null && Math.abs(c.winValue - c.lastWinValue) <= 1 ? 800 : 0), chain: true },
    },
  },
  D_INTERPLAY: {
    id: "D_INTERPLAY", cat: "D", name: "Wechselspiel", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Sieg direkt nach einer Niederlage gibt +150 Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 150 : 0) },
      2: { desc: "Ein Sieg direkt nach einer Niederlage gibt +275 Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 275 : 0) },
      3: { desc: "Ein Sieg direkt nach einer Niederlage gibt +450 Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 450 : 0) },
      // IV: zusätzlich gibt die nächste Niederlage +200 gespeicherten Score (Engine-Extra storeOnLoss).
      4: { desc: "Ein Sieg direkt nach einer Niederlage gibt +700 Score; die nächste Niederlage gibt +200 gespeicherten Score.", scoreFlat: (c) => (c.lastResult === "loss" ? 700 : 0), storeOnLoss: 200 },
    },
  },
  D_CRIT_FOLLOW: {
    id: "D_CRIT_FOLLOW", cat: "D", name: "Crit-Folge", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Sieg direkt nach einem Crit gibt +150 Score.", scoreFlat: (c) => (c.critFollowArmed ? 150 : 0) },
      2: { desc: "Ein Sieg direkt nach einem Crit gibt +275 Score.", scoreFlat: (c) => (c.critFollowArmed ? 275 : 0) },
      3: { desc: "Ein Sieg direkt nach einem Crit gibt +450 Score.", scoreFlat: (c) => (c.critFollowArmed ? 450 : 0) },
      // IV: ist der Folgesieg selbst ein Crit, zusätzlich +300 (Engine-Extra critFollowCritBonus).
      4: { desc: "Ein Sieg direkt nach einem Crit gibt +700 Score; ist der Folgesieg ebenfalls ein Crit, zusätzlich +300.", scoreFlat: (c) => (c.critFollowArmed ? 700 : 0), critFollowCritBonus: 300 },
    },
  },
  D_MISFIRE: {
    id: "D_MISFIRE", cat: "D", name: "Fehlzündung", upgradeType: REPLACEMENT,
    // Ladung wird in der Engine geführt (misfireScore); Stufe legt Schritt & Cap fest (Engine liest misfireStep/misfireCap).
    tiers: {
      1: { desc: "Jeder Sieg ohne Crit lädt +20 Score für den nächsten Crit auf (max +200).", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 20, misfireCap: 200 },
      2: { desc: "Jeder Sieg ohne Crit lädt +35 Score für den nächsten Crit auf (max +350).", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 35, misfireCap: 350 },
      3: { desc: "Jeder Sieg ohne Crit lädt +50 Score für den nächsten Crit auf (max +500).", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 50, misfireCap: 500 },
      4: { desc: "Jeder Sieg ohne Crit lädt +75 Score auf (max +750); nach einem Crit bleiben 25 % der Ladung erhalten.", scoreFlatOnCrit: (c) => (c.misfireScore || 0), misfireStep: 75, misfireCap: 750, misfireRetain: 0.25 },
    },
  },
  D_WEAKNESS: {
    id: "D_WEAKNESS", cat: "D", name: "Schwachstellenanalyse", upgradeType: REPLACEMENT,
    // Armierung läuft in der Engine (weaknessArmed) über die Abstand-Schwelle (Engine liest weaknessDeficit).
    tiers: {
      1: { desc: "Nach einer Niederlage mit mindestens 7 Wertpunkten Abstand gibt der nächste Sieg +250 Score.", scoreFlat: (c) => (c.weaknessArmed ? 250 : 0), weaknessDeficit: 7 },
      2: { desc: "Nach einer Niederlage mit mindestens 5 Wertpunkten Abstand gibt der nächste Sieg +350 Score.", scoreFlat: (c) => (c.weaknessArmed ? 350 : 0), weaknessDeficit: 5 },
      3: { desc: "Nach einer Niederlage mit mindestens 4 Wertpunkten Abstand gibt der nächste Sieg +500 Score.", scoreFlat: (c) => (c.weaknessArmed ? 500 : 0), weaknessDeficit: 4 },
      4: { desc: "Nach jeder Niederlage gibt der nächste Sieg +600 Score; bei mindestens 5 Wertpunkten Abstand +900.", scoreFlat: (c) => (c.weaknessArmed ? (c.weaknessBig ? 900 : 600) : 0), weaknessDeficit: 0, weaknessBigDeficit: 5 },
    },
  },
  D_SUIT_STREAK: {
    id: "D_SUIT_STREAK", cat: "D", name: "Farbserie", upgradeType: REPLACEMENT,
    // suitStreak wird in der Engine geführt; Stufe legt Schritt & Cap fest (Engine liest suitStep/suitCap/suitHalveOnSwitch).
    tiers: {
      1: { desc: "Aufeinanderfolgende Siege derselben Farbe geben je +75 mehr Score, maximal +300.",  scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 75), 300),  suitStep: 75, suitCap: 300 },
      2: { desc: "Aufeinanderfolgende Siege derselben Farbe geben je +100 mehr Score, maximal +500.", scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 100), 500), suitStep: 100, suitCap: 500 },
      3: { desc: "Aufeinanderfolgende Siege derselben Farbe geben je +150 mehr Score, maximal +750.", scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 150), 750), suitStep: 150, suitCap: 750 },
      4: { desc: "Aufeinanderfolgende Siege derselben Farbe geben je +200 mehr Score, maximal +1.200; ein Farbwechsel halbiert die Stufe statt sie zurückzusetzen.", scoreFlat: (c) => Math.min(Math.max(0, ((c.suitStreak || 0) - 1) * 200), 1200), suitStep: 200, suitCap: 1200, suitHalveOnSwitch: true },
    },
  },
  D_FULL_HOUSE: {
    id: "D_FULL_HOUSE", cat: "D", name: "Volles Haus", upgradeType: REPLACEMENT,
    // Zählt die letzte Position eines Segments (posInCycle%5===4) + recentWinCount der Siege davor.
    tiers: {
      1: { desc: "Fünf Siege innerhalb desselben Segments geben dem fünften Sieg +500 Score.",  scoreFlat: (c) => (c.posInCycle % 5 === 4 && (c.recentWinCount || 0) >= 4 ? 500 : 0) },
      2: { desc: "Vier Siege innerhalb desselben Segments geben dem vierten Sieg +650 Score.",  scoreFlat: (c) => (c.posInCycle % 5 === 3 && (c.recentWinCount || 0) >= 3 ? 650 : 0) },
      3: { desc: "Vier Siege innerhalb desselben Segments geben dem vierten Sieg +900 Score.",  scoreFlat: (c) => (c.posInCycle % 5 === 3 && (c.recentWinCount || 0) >= 3 ? 900 : 0) },
      4: { desc: "Drei Siege im Segment geben dem dritten +1.000 Score; der fünfte Sieg zusätzlich +1.000.", scoreFlat: (c) => ((c.posInCycle % 5 === 2 && (c.recentWinCount || 0) >= 2 ? 1000 : 0) + (c.posInCycle % 5 === 4 && (c.recentWinCount || 0) >= 4 ? 1000 : 0)) },
    },
  },
  D_OVERCRIT: {
    id: "D_OVERCRIT", cat: "D", name: "Überschusskrit", upgradeType: REPLACEMENT,
    tiers: {
      1: { desc: "Ein Crit über 110 % effektiver Crit-Chance gibt +200 Score.", scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1.1 ? 200 : 0) },
      2: { desc: "Ein Crit über 100 % effektiver Crit-Chance gibt +300 Score.", scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1 ? 300 : 0) },
      3: { desc: "Jeder Überschuss-Crit (über 100 %) gibt +500 Score.",         scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1 ? 500 : 0) },
      4: { desc: "Jeder Überschuss-Crit gibt +500 Score plus 5 Score je Prozentpunkt über 100 %.", scoreFlatOnCrit: (c) => ((c.rawCrit || 0) > 1 ? 500 + Math.round(((c.rawCrit || 0) - 1) * 100) * 5 : 0) },
    },
  },
};

export const FAMILY_DEFS = {
  ...D_FAMILIES,
};

export const FAMILY_LIST = Object.values(FAMILY_DEFS);
export const familyDef = (id) => FAMILY_DEFS[id] || null;
export const familyCategory = (id) => FAMILY_DEFS[id]?.cat || null;

/* ---- Resolver (Engine-Brücke) ---- */

// Aktive Stufen-Definition einer gehaltenen Familie. Bei `replacement` ist NUR die höchste gehaltene
// Stufe aktiv (Spec §2.3). `familyTiers` = { [familyId]: currentTier }. Null, wenn nicht gehalten.
export function activeTierDef(familyId, tier) {
  const fam = FAMILY_DEFS[familyId];
  if (!fam || !tier) return null;
  return fam.tiers[tier] || null;
}

// Alle aktiven Stufen-Defs (eine je gehaltener Familie) — die Liste, über die die Engine ihre Hooks summiert.
export function activeTierDefs(familyTiers = {}) {
  const out = [];
  for (const [id, tier] of Object.entries(familyTiers)) {
    const def = activeTierDef(id, tier);
    if (def) out.push(def);
  }
  return out;
}

// Summe eines additiven Hooks (cardBonus/scoreFlat/scoreFlatOnCrit) über die aktiven Stufen-Defs.
export function familySumHook(familyTiers, name, ctx) {
  let t = 0;
  for (const def of activeTierDefs(familyTiers)) { const f = def[name]; if (f) t += f(ctx); }
  return t;
}

// Produkt eines multiplikativen Hooks (scoreMult) über die aktiven Stufen-Defs.
export function familyProdHook(familyTiers, name, ctx) {
  let m = 1;
  for (const def of activeTierDefs(familyTiers)) { const f = def[name]; if (f) m *= f(ctx); }
  return m;
}

/* Familien-Pick anwenden (Spec §2.4 applyFamilyPick). Reine Funktion: nimmt den relevanten Run-State-
   Ausschnitt und liefert das Patch { familyTiers, deck, roles }.
   - REPLACEMENT (Kat. B/C-Regel/D/E): NUR der Familienrang ändert sich; die aktive Regel löst die Engine
     live über activeTierDefs auf — kein separates „install/removeRuntimeRule" nötig (Spec §2.3).
   - CUMULATIVE (Kat. A / Shop-Karten, #163/#164): jede gewählte Stufe führt ihr Paket EINMALIG aus
     (tierDef.onPick auf dem Deck); frühere Deckänderungen bleiben. Deterministisch über injizierten rng.
   - ROLE (Kat. C-Rollen, #163): Rollenziele/-regel steigen; der Ziel-Flow folgt mit den C-Familien.
   Der aufrufende Reducer bleibt frei von Registry-Wissen. */
export function applyFamilyPick(familyId, targetTier, ctx = {}, rng = Math.random) {
  const { familyTiers = {}, deck = null, roles = null } = ctx;
  const fam = FAMILY_DEFS[familyId];
  if (!fam || !targetTier) return { familyTiers, deck, roles }; // ungültige Familie/Stufe → No-Op
  const tierDef = fam.tiers[targetTier] || null;
  let nextDeck = deck, nextRoles = roles;
  if (fam.upgradeType === UPGRADE_TYPES.CUMULATIVE && tierDef && tierDef.onPick && deck) {
    nextDeck = tierDef.onPick(deck, rng); // Stufen-Paket einmalig aufs Deck (A-/Shop-Karten-Familien)
  }
  // ROLE-Zielauswahl folgt mit Kategorie C (#163) — hier noch reine Rangaktualisierung.
  return { familyTiers: withFamilyTier(familyTiers, familyId, targetTier), deck: nextDeck, roles: nextRoles };
}
