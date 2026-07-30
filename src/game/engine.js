import * as C from "./constants.js";
import { shuffledOrder } from "./deck.js";
import { PERK_DEFS, buildPerkOffer, critChanceRawFor, critMultiplierFor, streakBaseMult } from "./perks.js";
import { familySumHook, familyProdHook, familyTierParam, activeFamilyEntries, formationEnergyBonus } from "./families.js";
import { skillSum, lightningCritRaw, addCharge, buildSkillOffer, ionScoreFor, ionizeCountFor, consumeCharge, ionizeCards, ionizeCardsWithCatch,
  hasIonize, hasProtect, hasStorm, chargeFloorFor,
  lightningCritMult, hasStaticCharge, hasDischarge, hasBlitzcatcher, hasVoltageArc, // Blitz-Rework (v0)
  hasUeberspannung, hasKurzschluss, hasSpannungsstau, hasUeberschlag, hasBlitzschlag, hasDauerstrom, hasWetterleuchten, // Blitz-Rework (v0): Kaskade/Crit-Maschine/Serie
  hasDoubleDischarge, hasAreaIonize, hasDurchschlag, activeLightningCount, // Blitz-Rework (v0): Legendäre + Bekenntnis-Skalierung
  fireFlag, heatConsumerOf, heatGainFor, heatLossFor, fireScoreFor, activeFireCount, // Feuer-Rework (v0)
  glowingValueFor, whiteHeatScore, forgeCostFor, // Feuer-Rework (v0): Schwellen/Weißglut/Schmiede
  hasStandstill, hasFrostReserve, hasIceBloom, hasIceAnchor, hasPermafrost, iceSkillCount, // Eis-Rework (v0)
  layerValue, totalLayers, hasGletscher, hasEisdruck, hasKristallineMasse, hasBestaendigkeit, hasVerschraenkung, // Eis-Rework (v0): Schicht-Engine
  hasVergletscherung, hasArchitekt, // Eis-Rework (v0): Legendäre
  growthRipe, greenCount, // Pflanze-Fraktion (v0): Reife/Grün
  hasWurzelschlag, hasWurzeltiefe, hasPfahlwurzel, hasJahresringe, hasAussaat, hasFlugsamen, hasZaeherHalm, // Pflanze: Tiefe/Breite
  hasRanken, hasBluete, hasBluetezeit, hasPhotosynthese, hasBlaetterdach, hasUeberwucherung, // Pflanze: Grün/Überwucherung
  hasAuslaeufer, hasRhizom, hasErntedank, hasWeltenbaum, hasMutterbaum, hasDornenkoenig, hasEwigerFruehling, plantSkillCount } from "./skills.js"; // Pflanze: Gegnerdeck/Legendäre + Bekenntnis-Skalierung
import { STAT_IDS, statStreakFactor, statFormFactor } from "./stats.js";
import { computeFormations, positionHasFormation, activeFormationCount, summarizeFormations, baseFormationCount, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { coinsPerCycle, shopIncomeFor, buildShopOffer, withReservedOffer, perkLegendaryChance, skillLegendaryChance, perkFateReroll, skillFateReroll, SHOP_ITEM_DEFS, anchorAt, playSequence } from "./shop.js";
import { SHOP_FAMILY_DEFS, timeSegmentDepth, timeSegmentReduced } from "./shopFamilies.js";

function sumHook(perks, name, ctx) {
  let t = 0;
  for (const id of perks) { const f = PERK_DEFS[id][name]; if (f) t += f(ctx); }
  return t;
}
function prodHook(perks, name, ctx) {
  let t = 1;
  for (const id of perks) { const f = PERK_DEFS[id][name]; if (f) t *= f(ctx); }
  return t;
}
function ownsFlag(perks, flag) {
  return perks.some((id) => PERK_DEFS[id][flag]);
}
// Wert eines Perk-Markers des ERSTEN Trägers (0, wenn keiner) — so bleibt der Marker die einzige Quelle
// (z. B. L4 critValueGain als Kappe), statt die Zahl zusätzlich in der Engine zu duplizieren.
function flagValue(perks, flag) {
  for (const id of perks) { const v = PERK_DEFS[id][flag]; if (v) return v; }
  return 0;
}

// Crit-Wurf (pure, testbar): guaranteed override; sonst rng < gedeckelter Chance.
// Ruft rng() NUR, wenn wirklich gewürfelt wird → minimaler/deterministischer Verbrauch.
export function rollCrit(chance, guaranteed, rng = Math.random) {
  if (guaranteed) return true;
  const c = Math.min(1, Math.max(0, chance));
  if (c <= 0) return false;
  return rng() < c;
}

// Effektiver Kampfwert der Spielerkarte in DIESEM Stich (Basiswert + Kat.-B-Boni).
export function effectivePlayerValue(baseValue, perks, ctx) {
  return baseValue + sumHook(perks, "cardBonus", { ...ctx, pValueBase: baseValue });
}

/* Einen Stich auflösen → neuer State (pure). V2 (§22): KEIN Leben/Schaden/Heilung/Schild/Tempo mehr —
   der Run läuft garantiert über MAX_CYCLES Durchläufe. rng wird nur bei Durchlauf-Ende (Gegner neu
   mischen, Perk-/Skill-Angebot) gebraucht — als Abhängigkeit injiziert, damit die Schicht
   deterministisch/seedbar bleibt (kein Math.random hier drin).
   Spieler-Reihenfolge ist PERSISTENT: nur das Gegnerdeck wird pro Durchlauf neu gemischt. */
export function resolveTrick(state, rng = Math.random) {
  if (state.phase !== "play") return state;

  let {
    deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    score, winStreak, bestStreak, wins, losses, ties,
    scoreAtCycleStart = 0, lastCycleScore = null, prevCycleScore = null, // #131 Rundenscore-Tracking (Zuwachs je Durchlauf + Rollover)
    initiative, lastResult, perks, offer, tieArmed, sinceWin = 0,
    lossStreak = 0, lastWinValue = null, // #71 Rares: Revanche / Präzision
    critFollowArmed = false, weaknessArmed = false, // #71 Crit-Historie: Crit-Folge (D14) / Schwachstellenanalyse (D16)
    weaknessBig = false, // Rarität #167: D_WEAKNESS IV — die rüstende Niederlage hatte großen Abstand (→ +900 statt +600)
    interplayStored = 0, // Rarität #167: D_INTERPLAY IV — in Niederlagen gebankter Score, beim nächsten Sieg als Flat ausgezahlt
    misfireScore = 0, // V2 §22.6 D15: Score-Ladung, +30 je Sieg ohne Crit (max 300), Auszahlung bei Crit
    winSuit = null, winSuitStreak = 0, // #71 Farbserie: gleicher-Farbe-Siegesserie
    recentResults = [], // #71 Volles Haus: die letzten (bis zu 4) Ergebnisse VOR diesem Stich (für secondLastResult, C_GUARD IV)
    segmentWins = 0, // #189 Volles Haus: Siege im AKTUELLEN Segment vor diesem Stich (segment-genau, ersetzt das rollende Fenster)
    statCritChance = 0, statCritMult = 0, statFormMult = 0, statStreakMult = 0, statOffer = null, // Stat-System (V2 §22.3)
    formationEnergy = 0, formationSwaps = [], // Formationsphase (V2 §22.8)
    roles = {}, successorQueue = [], triumphArmed = [], // Kartenrollen (V2 §22.6 C): Rollen-ids / Nachfolger-Boni / Triumph-Armierung
    l4Boost = {}, // Legendär-Perk L4 Kritische Masse: Crit-Wert-Gewinn je Karte (Kappe)
    zinsBonus = 0, cycleWins = 0, cycleLosses = 0, cycleBestTrick = 0, sammlerTypes = [], // Legendär-Perks-Rework (#203): Zinseszins-Dauerdividende / Durchlauf-Bilanz / Echo-Bester-Stich / Sammler distinct Formationsarten
    vabanquePaid = 0, // Vabanque (#203): Zahl der Eröffnungs-Wetten, die dieser Lauf schon ausgezahlt hat (Lauf-Deckel gegen Front-Load-Exploit)
    crits, critBonusScore, bestTrickScore,
    maxFormations = 0, formationScore = 0, // #161 FB-2: Run-Rückblick — Peak gleichzeitig aktiver Formationen + Score-Anteil aus Formationen
    skills = [], skillOffer = null, lightning = null, activeArchetypes = [], // Skill-System / Archetypen (#93)
    iceTemp = {}, frostbitePending = {}, frostbiteActive = {}, // Eis-Rework (v0): temp Wert (Kaltfront) / Vergletscherung-Gegner-Debuff (je oppCard.id → −Wert)
    layers = {}, frostFormPrev = [], // Eis-Rework (v0): Schichten je Frostkarte-id (permanent) / Frostkarten, die im Vordurchlauf in Formation siegten (Beständigkeit)
    ash = 0, brandPending = {}, brandActive = {}, forged = {}, // Feuer-Rework (v0): Asche-Ressource / Brand-Marker (Gegner, je card.id) / geschmiedete Dauerwerte
    growth = {}, colonized = {}, // Pflanze-Fraktion (v0): Wachstum je card.id (nur steigend) / kolonisierte Gegnerkarten (grün = card.green auf der Karte)
    shop = null, economyStatLevel = 0, // Shop-System (Shop-Spec §3): Münzstand + Einkommen-Level
    familyTiers = {}, // Raritätssystem (Epic #167): Familienrang je Familie — Engine löst aktive Stufen-Hooks auf
  } = state;

  // Rarität-Umbau #167 (Schritt 2): engine-gekoppelte D-Stufen liefern ihre Parameter über die GEHALTENE
  // Familien-Stufe (familyTierParam). Ohne Familie greifen die alten flachen D15/D16/D17-Konstanten →
  // Bestandsverhalten unverändert (der Accumulator lädt weiterhin, wird aber nur von einem Hook gelesen).
  const misfireStep   = familyTierParam(familyTiers, "D_MISFIRE", "misfireStep")   ?? 30;   // D15/D_MISFIRE: Ladung je Sieg ohne Crit
  const misfireCap    = familyTierParam(familyTiers, "D_MISFIRE", "misfireCap")    ?? 300;
  const misfireRetain = familyTierParam(familyTiers, "D_MISFIRE", "misfireRetain") ?? 0;     // IV: 25 % der Ladung bleiben nach einem Crit
  const weaknessDeficit    = familyTierParam(familyTiers, "D_WEAKNESS", "weaknessDeficit")    ?? 5; // D16/D_WEAKNESS: Abstand-Schwelle zum Rüsten
  const weaknessBigDeficit = familyTierParam(familyTiers, "D_WEAKNESS", "weaknessBigDeficit");      // nur IV gesetzt → großer Abstand
  const suitHalveOnSwitch  = !!familyTierParam(familyTiers, "D_SUIT_STREAK", "suitHalveOnSwitch");  // IV: Farbwechsel halbiert statt Reset
  const streakGainOnCrit   = familyTierParam(familyTiers, "D_CRIT_MOMENTUM", "streakGainOnCrit") || 0; // IV: Crit erhöht die Serie um 1
  const interplayStoreOnLoss = familyTierParam(familyTiers, "D_INTERPLAY", "storeOnLoss") || 0;     // IV: Niederlage bankt Score
  const critFollowCritBonus  = familyTierParam(familyTiers, "D_CRIT_FOLLOW", "critFollowCritBonus") || 0; // IV: Crit-Folgesieg, der selbst Crit ist
  // #189 Fund B: D_PRECISION-Kette. precisionTol = Toleranz der gehaltenen Stufe (I/II 0, III/IV 1; undefined = nicht
  // gehalten). Nur IV (chain) kettet — I–III verbrauchen nach einer Auszahlung die Referenz (siehe Sieg-Zweig unten).
  const precisionTol    = familyTierParam(familyTiers, "D_PRECISION", "precisionTol");
  const precisionChains = !!familyTierParam(familyTiers, "D_PRECISION", "chain");
  // Kategorie B (Stich): B5 Initiative armiert den Gleichstands-Sieg über tieArmLosses; B8 III armiert die
  // successorQueue der nächsten Karten (revengeTwoCard {losses, bonus, count}). Beide werden im Niederlage-Zweig gelesen.
  const tieArmLosses  = familyTierParam(familyTiers, "B_INITIATIVE", "tieArmLosses");
  const revengeTwoCard = familyTierParam(familyTiers, "B_REVENGE", "revengeTwoCard");

  // Zeitsegment (Shop §8 A-L1): `pos` ist der Stich-Index dieses Durchlaufs, `actualPos` die zugehörige
  // Deckposition. Ohne Zeitsegment sind beide gleich; mit Zeitsegment wird das gewählte Segment direkt nach
  // seinem ersten Spielen wiederholt (45 Stiche) — positionsgebundene Effekte nutzen actualPos („zählt erneut").
  const timeSeg = shop && shop.timeSegmentIndex != null ? shop.timeSegmentIndex : null;
  // Zeitsegment-Stufe (#164): Wiederholungstiefe + Effekt-Tiefe. Ohne Stufe (Altzustand) = volle Wiederholung (Default).
  const timeSegTier = timeSeg != null ? (shop.timeSegmentTier || 4) : 0;
  const timeDepth = timeSeg != null ? timeSegmentDepth(timeSegTier) : 0;
  const seq = playSequence(timeSeg, C.TRICKS_PER_CYCLE, SEGMENT_SIZE, timeDepth);
  const cycleLen = seq.length;
  const actualPos = seq[pos];
  const segEnd = timeSeg != null ? timeSeg * SEGMENT_SIZE + SEGMENT_SIZE : 0;
  const isRepeat = timeSeg != null && pos >= segEnd && pos < segEnd + timeDepth;
  // §10-Näherung Stufe III: die Wiederholung würfelt keine Crits (nur Score/Serie zählen). IV = vollständig.
  const reducedRepeat = isRepeat && timeSegmentReduced(timeSegTier);
  const pCard = deck[playerOrder[actualPos]];
  const oCard = oppDeck[oppOrder[actualPos]];

  // Formationen (V2 §22.7): zu Durchlauf-Beginn (pos 0) aus der persistenten Reihenfolge + Dauerwerten
  // berechnet und für den ganzen Durchlauf stabil gehalten. Greifen bei Sieg der jeweiligen Karte.
  let formations = state.formations || [];
  const anchors = (shop && shop.anchors) || []; // Shop-Positionsanker (§8) — an der Deckposition
  if (pos === 0) formations = computeFormations(playerOrder, deck, roles, perks, skills, anchors, familyTiers);
  // #161 FB-2: Peak gleichzeitig aktiver Formationen über den Run — zu Durchlaufbeginn, sobald das Layout feststeht.
  if (pos === 0) maxFormations = Math.max(maxFormations || 0, summarizeFormations(formations).count);
  const posForm = formations[actualPos] || { mult: 1, formations: [] };
  const formationMult = posForm.mult || 1;
  const hasFormation = positionHasFormation(posForm);
  // Shop-Anker-Familie auf DIESER Position (#164, max 1 je Position) → Kraft/Punkte/Krit/Serie. Stärke = Stufe.
  const anchor = anchorAt(anchors, actualPos);
  const anchorType = anchor ? anchor.type : null;
  const aParam = (key) => (anchor ? anchor[key] : undefined); // Stufen-Parameter liegen auf dem Anker-Eintrag (#164)
  // Dauerwert des zuletzt gespielten Vorgängers (B10 Überzahl); im ersten Stich keiner. Bei Zeitsegment-Wiederholung
  // ist der Vorgänger die zuletzt gespielte Karte (seq[pos-1]), nicht actualPos-1.
  const predValue = pos > 0 ? deck[playerOrder[seq[pos - 1]]].value : null;

  trickNo += 1;
  // #189 Volles Haus: SEGMENT-genaue Sieg-Zählung. Beim ersten Stich eines Segments (actualPos % SEGMENT_SIZE === 0)
  // zurücksetzen; recentWinCount = Siege DIESES Segments VOR diesem Stich. Ersetzt das alte rollende 4er-Fenster
  // (recentResults), das Segment-/Durchlaufgrenzen ignorierte → „X Siege in einem Segment" ist jetzt exakt.
  if (actualPos % SEGMENT_SIZE === 0) segmentWins = 0;
  const recentWinCount = segmentWins;
  // Effektive Serie für Serien-Effekte (Stand VOR dem Stich).
  let serieStreak = winStreak;
  // Kartenrollen (V2 §22.6 C): Rolle der aktuellen Karte, Triumph-Armierung, Segment-Tiefste.
  const isRole = (perkId) => (roles[perkId] || []).includes(pCard.id);
  const triumphActive = triumphArmed.includes(pCard.id);
  let segmentLowRank = -1, segmentIndex = -1;
  // Gate: eine gehaltene segmentLow-Familie (C_SURVIVOR; flache C7 ist zu Familie migriert #167). segmentLowRank/
  // segmentIndex liefern den Rang der Karte im Segment (0=tiefste, 1=zweittiefste).
  if (activeFamilyEntries(familyTiers).some((e) => e.def.segmentLow)) {
    const segStart = Math.floor(actualPos / SEGMENT_SIZE) * SEGMENT_SIZE;
    segmentIndex = Math.floor(actualPos / SEGMENT_SIZE);
    const segPositions = [];
    for (let k = segStart; k < segStart + SEGMENT_SIZE && k < playerOrder.length; k++) segPositions.push(k);
    // Rang nach aktuellem Wert aufsteigend, stabil nach Position bei Gleichwert (Rang 0 = tiefste Karte des Segments).
    const sorted = segPositions.slice().sort((a, b) => deck[playerOrder[a]].value - deck[playerOrder[b]].value || a - b);
    segmentLowRank = sorted.indexOf(actualPos);
  }
  // Henker (#203): im letzten Segment (Pos 36–40 / Index ≥ HENKER_ZONE_START) ist jeder Sieg garantiert ein Crit
  // (der ×-Bonus läuft unten im Score-Stack). Ersetzt die alte L10-Kettenreaktion (chainArmed) als forceCrit-Quelle.
  const forceCrit = ownsFlag(perks, "henker") && actualPos >= C.HENKER_ZONE_START;
  // C2 Triumph: die Armierung dieser Karte wird durch das Spielen verbraucht (Neu-Armierung nur bei Sieg).
  if (triumphActive) triumphArmed = triumphArmed.filter((id) => id !== pCard.id);
  const ctx = {
    posInCycle: actualPos,
    trickNo,
    lastResult,
    lostLastTrick: lastResult === "loss",
    winStreak: serieStreak, // Serien-Effekte (B2 Momentum) sehen die effektive Serie
    sinceWin, // #71 Durchbruch: Stiche ohne Sieg (Stand VOR diesem Stich)
    lossStreak, // #71 Revanche: aufeinanderfolgende Niederlagen (Stand VOR diesem Stich)
    posForm, // V2 §22.6: Formation der gespielten Position (B6 Wiederholung / B9 Treppe)
    predValue, // V2 §22.6: Dauerwert des direkten Vorgängers (B10 Überzahl)
    isRole, triumphActive, // V2 §22.6 C/L: Kartenrollen (C1/C2/C3/C6/C7/L7)
    // Rarität #167 Kat. C: Ergebnis des ZWEITEN Vorgängers (C_GUARD IV), Segment-Rang/-Index (C_SURVIVOR).
    secondLastResult: recentResults.length >= 2 ? recentResults[recentResults.length - 2] : null,
    segmentLowRank, segmentIndex,
  };
  // Nachfolger-Bonus (C4 Staffelläufer / C5 Anführer): der Kopf der Queue gilt für DIESE Karte, dann verbraucht.
  const relayBonus = successorQueue[0] || 0;
  successorQueue = successorQueue.slice(1);
  // ---- Feuer-Rework (v0): Vor-Stich-Effekte (Schmelzpunkt-Drip, Glühende Klinge, Feuerwalze, Rückzündung-Wert).
  let heat = state.heat || null;
  let fireValueBonus = 0;
  let meltScore = 0; // Schmelzpunkt-Drip dieses Stichs — im Sieg-Block als Flat ausgezahlt (Ledger-konsistent, s. u.)
  const suncore = fireFlag(skills, "suncore"); // Sonnenkern: +Score je verbrauchtem Hitzepunkt (Konsum-Verstärker)
  // Phönixfeuer: verbrauchte Hitze (value ≤ 0) entzündet 1×/Durchlauf neu (+40 % zurück). Nach jedem Konsum geprüft.
  const reignite = (h) => (fireFlag(skills, "phoenix") && !h.phoenixUsed && h.value <= 0)
    ? { ...h, value: Math.round(C.PHOENIX_REIGNITE * h.max), phoenixUsed: true } : h;
  if (heat && heat.active) {
    // Schmelzpunkt (Konsument, Drip): vor JEDEM Stich −10 % Hitze; der Score zahlt sich im SIEG-Block aus (+5/Punkt,
    // Sonnenkern +5/Punkt) — so bleibt er im Per-Karte-Ledger attribuiert (kein loser score+= außerhalb von gained).
    if (heatConsumerOf(skills) === "melt" && heat.value >= C.MELT_COST) {
      heat = { ...heat, value: heat.value - C.MELT_COST };
      meltScore = C.MELT_COST * C.MELT_PER_HEAT;
      heat = reignite(heat);
    }
    // Glühende Klinge: +Wert je Hitze-Stufe (+Sonnenzorn). Feuerwalze: aktueller Stapel (nur ab 40 % Hitze aufgebaut).
    fireValueBonus += glowingValueFor(heat.value, skills);
    if (fireFlag(skills, "fireRoll")) fireValueBonus += Math.min(heat.fireRoll || 0, C.FIREROLL_MAX);
  }
  // Rückzündung: nach einer Niederlage bekommt die Karte +2 Wert (hilft, den Konter zu gewinnen).
  if (fireFlag(skills, "rueckzuendung") && lastResult === "loss") fireValueBonus += C.RUECKZUENDUNG_VALUE;
  // ---- Eis (#93 F3): temp. Wertbonus (Kältereserve/Kaltfront/Frostspur, an card.id) + Permafrost +2 (Dauerwert eingefroren).
  // Eis-Rework (v0): Schicht-Dauerwert der Frostkarte (Gletscher superlinear) + Kristalline Masse (Summe ≥ Schwelle).
  const iceGletscher = hasGletscher(skills);
  const iceTotalLayers = totalLayers(layers);
  const iceValueBonus = (iceTemp[pCard.id] || 0)
    + (pCard.frozen ? layerValue(layers[pCard.id] || 0, iceGletscher) : 0)
    + (pCard.frozen && hasKristallineMasse(skills) && iceTotalLayers >= C.KRISTALLINE_THRESHOLD ? C.KRISTALLINE_VALUE : 0);
  const anchorPowerBonus = anchorType === "power" ? (aParam("power") || 0) : 0; // Kraftanker (§4.2, Stärke = Stufe)
  // E_QUICKSHOT IV (Rarität #167 Kat. E, Spec §3.2 E8 IV): jede Anker-Position (jede fünfte) erhält zusätzlich +2 Wert.
  // Der Anker-FAKTOR selbst läuft über computeFormations; hier nur der Stufe-IV-Wertbonus (anchor.value auf Anker-Positionen).
  const eqAnchor = familyTierParam(familyTiers, "E_QUICKSHOT", "anchor");
  const eQuickshotValue = eqAnchor && eqAnchor.value && eqAnchor.at(actualPos) ? eqAnchor.value : 0;
  // Familien-Wertboni (Kategorie B, Rarität #167) laufen ADDITIV neben den flachen Perk-cardBonus-Hooks —
  // gleicher Kontext (inkl. pValueBase = Dauerwert der Karte), nur die aktive Familien-Stufe zählt.
  const familyValueBonus = familySumHook(familyTiers, "cardBonus", { ...ctx, pValueBase: pCard.value });
  // Damaststahl (L, Underdog): geschmiedete Karten kämpfen mit +Wert → die tiefen Schmiede-Karten schlagen über ihrem Gewicht.
  const damascusCombat = (fireFlag(skills, "damascus") && (forged[pCard.id] || 0) > 0) ? C.DAMASCUS_COMBAT : 0;
  const pValue = effectivePlayerValue(pCard.value, perks, ctx) + familyValueBonus + relayBonus + fireValueBonus + iceValueBonus + anchorPowerBonus + eQuickshotValue + damascusCombat;
  // Frostbiss (#93 F3): in DIESEM Durchlauf markierte Gegnerkarten verlieren −3 Wert (nie < 0); sonst neutral (§12).
  const oValue = Math.max(0, oCard.value - (frostbiteActive[oCard.id] || 0) - (brandActive[oCard.id] || 0)); // Vergletscherung (Eis, ∝ Schichten) + Brand (Feuer)
  // Eis: der temporäre Wertbonus dieser Karte ist mit ihrem Auftauchen verbraucht.
  let newIceTemp = { ...iceTemp };
  delete newIceTemp[pCard.id];
  let newFrostbitePending = { ...frostbitePending }; // Vergletscherung: im laufenden Durchlauf markierte Gegnerkarten {oppId: −Wert} (für den nächsten)
  let newFrostbiteActive = frostbiteActive;          // in diesem Durchlauf aktive Marken (am Durchlauf-Ende ausgetauscht)
  let newLayers = layers;                            // Eis-Schichten (permanent; immutabel fortgeschrieben)
  let newFrostFormPrev = frostFormPrev;              // Beständigkeit: Frostkarten, die im Vordurchlauf in Formation siegten
  let newFrostFormCur = [];                          // dieser Durchlauf: Frostkarten, die in Formation siegen (wird am Ende zu prev)
  // Feuer-Rework (v0): Asche-Zuwachs / Brand-Marker für den NÄCHSTEN Durchlauf (brandActive wird am Durchlauf-Ende getauscht).
  let newAsh = ash;
  let newBrandPending = { ...brandPending };
  let newBrandActive = brandActive;
  let newForged = forged;
  // Pflanze-Fraktion (v0): Wachstum (immutabel fortgeschrieben) / kolonisierte Gegnerkarten. Grün = card.green (im deck gebacken).
  let newGrowth = growth;
  let newColonized = { ...colonized };

  let won = false, lost = false, tieConverted = false;
  if (pValue > oValue) won = true;
  else if (pValue < oValue) lost = true;
  // Gleichstand → Sieg nur via B5 „Initiative" (tieArmed).
  else if (tieArmed) { won = true; tieConverted = true; }
  // sonst echter Gleichstand: kein Effekt (§4.1)
  // Patt (#203): eine Niederlage um höchstens PATT_MARGIN Wert zählt stattdessen als Sieg (Winrate-Hebel; harte Bedingung
  // = knapp verloren). Marge = oValue − pValue (≥1 bei Niederlage); der Sieg-Zweig läuft danach normal (Marge dann −PATT..0).
  if (lost && ownsFlag(perks, "patt") && (oValue - pValue) <= C.PATT_MARGIN) { lost = false; won = true; }

  let gained = 0;
  let isCrit = false, critChance = 0, critMultiplier = C.CRIT_BASE_MULT, scoreBeforeCrit = 0, critBonus = 0;
  let breakdown = null; // Ergebnis-Aufschlüsselung eines Siegs (§17): exakt die Faktoren der Score-Formel

  if (won) {
    winStreak += 1; wins += 1; cycleWins += 1; // cycleWins: Durchlauf-Sieg-Bilanz für Zinseszins (#203)
    segmentWins += 1; // #189 Volles Haus: Sieg im aktuellen Segment (recentWinCount trug oben den Stand DAVOR)
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    serieStreak = winStreak; // effektive Serie NACH diesem Sieg
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich.
    // #71 Farbserie: Länge der Serie gewonnener Stiche gleicher Farbe INKL. dieses Siegs. D_SUIT_STREAK IV:
    // ein Farbwechsel HALBIERT die laufende Länge (min 1) statt sie auf 1 zurückzusetzen (suitHalveOnSwitch).
    const suitStreak = pCard.suit === winSuit ? winSuitStreak + 1
                     : (suitHalveOnSwitch ? Math.max(1, Math.floor(winSuitStreak / 2)) : 1);
    // #195: posInCycle = actualPos (Deckposition), NICHT pos (Stich-Index) — muss zum segmentWins-Reset oben
    // (actualPos % SEGMENT_SIZE) passen. Sonst divergieren bei partieller Zeitsegment-Wiederholung Gate (D_FULL_HOUSE
    // liest posInCycle % 5) und Zähler → Volles Haus zahlt am falschen Stich. Einziger scoreFlat-Leser: D_FULL_HOUSE.
    const wctx = { winValue: pValue, margin: pValue - oValue, winStreak: serieStreak, wins, trickNo, posInCycle: actualPos,
                   lastWinValue, // #71: Präzision (Vergleich mit letztem Siegwert)
                   critFollowArmed, weaknessArmed, weaknessBig, // Crit-Historie: Stand VOR diesem Sieg (D14/D16/D_WEAKNESS IV)
                   suitStreak, recentWinCount, // Farbserie / Volles Haus
                   baseValue: pCard.value, // Basiswert der gespielten Karte
                   hasFormation, lastResult, misfireScore }; // V2 §22.6 D: Formation-Sieg / Wechselspiel / Fehlzündungs-Ladung (D15)
    winSuit = pCard.suit; winSuitStreak = suitStreak; // Farbserie fortschreiben
    // ---- Feuer-Rework (v0): Hitzegewinn (+Weißglut-Überlauf), Feuer-Score, Flächenbrand-Burst, Feuerwalze, Funkenflug, Glutstahl, Brand.
    let fireFlat = meltScore; // Schmelzpunkt-Drip (im Vor-Stich verbrauchte Hitze) zahlt sich hier als Flat aus (nur bei Sieg)
    let fireDividendHeat = 0;  // gehaltene Hitze beim Sieg (vor evtl. Flächenbrand-Verbrauch) → Glutdividende (direkter Score, s. u.)
    if (heat && heat.active) {
      const fmargin = pValue - oValue;
      // Hitzegewinn: Marge (Glut) + Zunder + Feuersturm (Serie) + Rückzündung (Rückstand des letzten Verlusts).
      const gain = heatGainFor(fmargin, skills, { winStreak: serieStreak, lostLast: lastResult === "loss", deficit: heat.lastLossDeficit || 0 });
      const raw = heat.value + gain;
      // Weißglut: der über HEAT_MAX hinaus überlaufende Hitzeanteil wird zu Score (Sonnenzorn ×2).
      const overflow = Math.max(0, raw - heat.max);
      if (overflow > 0) fireFlat += whiteHeatScore(overflow, skills, heat.max);
      heat = { ...heat, value: Math.min(heat.max, raw), peak: Math.max(heat.peak || 0, Math.min(heat.max, raw)) }; // peak = Sonnenzorn
      fireDividendHeat = heat.value; // gehaltene Hitze NACH diesem Sieg, VOR evtl. Flächenbrand-Verbrauch → Glutdividende
      // Feuer-Score (Grund-Payoff): (Vorsprung−OFFSET)×Basis, ×Verbrennung (≥8/≥12), ×Sonnenzorn (≥80 %). Basis für Funkenflug.
      const fireBaseFlat = fireScoreFor(fmargin, skills, heat.value);
      fireFlat += fireBaseFlat;
      // Flächenbrand (Konsument, Burst): Sieg ab 80 % Hitze verbrennt die GANZE Hitze → +12 Score/Punkt (Sonnenkern +5/Punkt).
      if (heatConsumerOf(skills) === "conflagration" && heat.value >= C.CONFLAG_MIN_HEAT) {
        const burned = heat.value;
        fireFlat += burned * C.CONFLAG_PER_HEAT;
        heat = reignite({ ...heat, value: 0 }); // Phönixfeuer: verbrauchte Hitze entzündet 1×/Durchlauf neu
      }
      // Feuerwalze: nächste Karte +1 Wert (bis +3) — nur ab 40 % Hitze aufgebaut.
      if (fireFlag(skills, "fireRoll") && heat.value >= C.FIREROLL_MIN_HEAT)
        heat = { ...heat, fireRoll: Math.min((heat.fireRoll || 0) + 1, C.FIREROLL_MAX) };
      // Funkenflug: kleine Siege banken ihren Feuer-Score; ein Sieg ≥8 Vorsprung entlädt den Speicher voll.
      if (fireFlag(skills, "sparkflight")) {
        if (fmargin >= C.SPARKFLIGHT_MIN_MARGIN) { fireFlat += heat.sparkStore || 0; heat = { ...heat, sparkStore: 0 }; }
        else heat = { ...heat, sparkStore: (heat.sparkStore || 0) + fireBaseFlat };
      }
    }
    // Glutstahl: geschmiedete Siegkarte → +20 Score je geschmiedetem Wert (fließt in die multiplizierte Basis).
    if (fireFlag(skills, "glutstahl") && (forged[pCard.id] || 0) > 0) fireFlat += (forged[pCard.id] || 0) * C.GLUTSTAHL_PER_VALUE;
    // Brand (Brandmal): jeder Sieg brandmarkt die geschlagene Gegnerkarte für den NÄCHSTEN Durchlauf (−Wert) + Asche.
    // Lauffeuer: der Brand greift auf einen oppDeck-Nachbarn über. Schmelzofen (≥50 % Hitze): −1 Wert & +1 Asche stärker.
    if (fireFlag(skills, "brandmal")) {
      const hot = !!(heat && heat.active && heat.value >= C.SCHMELZOFEN_MIN_HEAT && fireFlag(skills, "schmelzofen"));
      const brandBonus = hot ? C.SCHMELZOFEN_BRAND_BONUS : 0;
      newBrandPending[oCard.id] = Math.max(newBrandPending[oCard.id] || 0, C.BRAND_VALUE + brandBonus);
      newAsh += C.BRAND_ASH + brandBonus;
      if (fireFlag(skills, "lauffeuer")) {
        const oi = oppOrder[actualPos];                     // Index der Gegnerkarte im oppDeck-Array
        const nb = oi + 1 < oppDeck.length ? oi + 1 : oi - 1; // Deck-Nachbar (kein Wrap; Rand → linker Nachbar)
        if (nb >= 0) {
          newBrandPending[oppDeck[nb].id] = Math.max(newBrandPending[oppDeck[nb].id] || 0, C.BRAND_SPREAD_VALUE + brandBonus);
          newAsh += C.BRAND_ASH + brandBonus;
        }
      }
    }
    // ---- Eis (#93 F3): Stillstand-Flat + Frostbiss-Markierung (Sieg mit einer eingefrorenen Karte).
    // ---- Eis-Rework (v0): Ablage A (Sieg in ≥1 Formation → Schicht), Stillstand, Eisblüte, Verschränkung, Beständigkeit,
    //      Eisanker-Schicht, Eisdruck/Architekt (Formations-Faktor), Vergletscherung (Gegner-Debuff ∝ Schichten).
    let iceFlat = 0;
    let iceDirect = 0;   // Eis-Legendär-Reshape: DIREKTE, post-stack, hart gedeckelte Dividende aus der Überlauf-Tiefe (unten zu `gained`)
    let iceFormMult = 1; // Eisdruck/Architekt: zusätzlicher Formations-Faktor der Frostkarte (unten in formMult)
    if (pCard.frozen) {
      const nForms = baseFormationCount(posForm);
      const inFormation = positionHasFormation(posForm);
      const myLayers = layers[pCard.id] || 0;
      const capLayers = Math.min(myLayers, C.ICE_LAYER_MAX); // Anti-Runaway v0.1: wirksame Schichten für Eisdruck/Vergletscherung gedeckelt
      // Stillstand: Frostkarte siegt in ≥1 Formation → +200 Flat (flacher Früh-Support).
      if (hasStandstill(skills) && inFormation) iceFlat += C.STILLSTAND_SCORE;
      // Eis-Score-Hebel (v0.1): tiefe Schichten zahlen bei JEDEM Frost-Sieg in Score — „tiefe Pfeiler scoren groß".
      // NICHT formations-gebunden: Eis friert niedrige Karten (Frostwahl), die selten in Formation siegen; die Schichten
      // machen sie stark genug zum Siegen, DANN zahlen sie. Alle Eis-Builds profitieren.
      if (capLayers > 0) iceFlat += capLayers * C.ICE_ABLAGE_SCORE_PER_LAYER;
      // Ablage A: Sieg in ≥1 Formation → +1 Schicht (+Permafrost/+Beständigkeit/+Verschränkung). Eisanker garantiert eine auch ohne volle Formation.
      let addLayers = 0;
      if (inFormation) {
        addLayers += C.ICE_ABLAGE_A_LAYER;
        if (hasPermafrost(skills)) addLayers += C.PERMAFROST_LAYER_BONUS;
        if (hasBestaendigkeit(skills) && frostFormPrev.includes(pCard.id)) addLayers += C.BESTAENDIGKEIT_LAYER;
        if (hasVerschraenkung(skills) && nForms >= 3) addLayers += C.VERSCHRAENKUNG_LAYERS;
        newFrostFormCur = [...newFrostFormCur, pCard.id];
      } else if (hasIceAnchor(skills)) {
        addLayers += C.ICE_ABLAGE_A_LAYER + (hasPermafrost(skills) ? C.PERMAFROST_LAYER_BONUS : 0);
      }
      if (addLayers > 0) newLayers = { ...newLayers, [pCard.id]: myLayers + addLayers };
      // Eisblüte: Sieg in ≥2 Formationen → gefrorene Deck-Nachbarn banken eine Schicht.
      if (hasIceBloom(skills) && nForms >= 2) {
        for (const nb of [actualPos - 1, actualPos + 1]) {
          if (nb < 0 || nb >= playerOrder.length) continue;
          const nc = deck[playerOrder[nb]];
          if (nc.frozen) newLayers = { ...newLayers, [nc.id]: (newLayers[nc.id] != null ? newLayers[nc.id] : (layers[nc.id] || 0)) + C.EISBLUETE_LAYER };
        }
      }
      // Eisdruck: Formationsfaktor skaliert mit den Schichten der Frostkarte.
      if (hasEisdruck(skills) && inFormation && capLayers > 0) iceFormMult *= 1 + capLayers * C.EISDRUCK_STEP;
      // Architekt: vertikale Formation — je weitere Frostkarte in derselben Spalte (pos%5) ein zusätzlicher Faktor.
      if (hasArchitekt(skills)) {
        const col = actualPos % SEGMENT_SIZE;
        let colFrost = 0;
        for (let p = 0; p < playerOrder.length; p++) if (p % SEGMENT_SIZE === col && deck[playerOrder[p]].frozen) colFrost += 1;
        if (colFrost >= 2) iceFormMult *= 1 + (colFrost - 1) * C.ARCHITEKT_STEP;
      }
      // Vergletscherung: markiert Gegnerkarten für den NÄCHSTEN Durchlauf, −Wert ∝ Schichten der Siegkarte (min 1).
      if (hasVergletscherung(skills)) {
        const debuff = Math.max(1, capLayers * C.VERGLETSCHERUNG_PER_LAYER);
        const pool = oppDeck.map((c) => c.id).filter((id) => !(id in newFrostbitePending));
        for (let k = 0; k < C.VERGLETSCHERUNG_COUNT && pool.length; k++) {
          const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
          newFrostbitePending[id] = Math.max(newFrostbitePending[id] || 0, debuff);
        }
      }
      // ---- Eis-Legendär-Reshape (2026-07-30): DIREKTE Dividende aus der ÜBERLAUF-Tiefe (Schichten über ICE_LAYER_MAX,
      //      generisch verschwendet). Am Multiplikator-Stack VORBEI (unten zu `gained`), hart gedeckelt (Plateau, kein
      //      Wachstum), bekenntnis-skaliert (cross-health). Nur Legendär-Halter → generisches Eis (Deckel 12) unberührt.
      if (hasGletscher(skills) || hasPermafrost(skills)) {
        const iceCommit = Math.min(1, iceSkillCount(skills) / C.SKILL_SLOTS);
        // EIN Scan über alle Frostkarten: TIEFSTER Pfeiler (Gletscher, Konzentration) + SUMME (Permafrost, Breite).
        // Wichtig: die Überlauf-Tiefe sitzt auf GEBANKTEN Karten (Ablage B bankt ungenutzte Frostkarten) — also gerade
        // die, die NICHT gewinnen → eine Dividende auf die SIEGKARTE zündet kaum. Beide Legendäre lesen daher den
        // BESTAND (nicht die Siegkarte) und zahlen je Frost-Sieg.
        let maxOv = 0, sumOv = 0;
        for (const c of deck) if (c.frozen) {
          const o = (layers[c.id] || 0) - C.ICE_LAYER_MAX;
          if (o > 0) { sumOv += o; if (o > maxOv) maxOv = o; }
        }
        // Gletscher (Konzentration, SUPERLINEAR): der EINE tiefste Pfeiler zahlt je Frost-Sieg — je tiefer, desto mehr
        // JEDE Schicht (dreieckig m(m+1)/2, via Deckel geplateaut). Das ist die „Gletscher wächst"-Fantasie, gebändigt.
        if (hasGletscher(skills) && maxOv > 0) {
          const m = Math.min(maxOv, C.GLETSCHER_OVERFLOW_CAP);
          iceDirect += (m * (m + 1) / 2) * C.GLETSCHER_DIRECT * iceCommit;
        }
        // Permafrost (Breite/Motor): die SUMME der Überlauf-Tiefe über alle Frostkarten zahlt je Frost-Sieg (linear, gedeckelt).
        if (hasPermafrost(skills) && sumOv > 0)
          iceDirect += Math.min(sumOv, C.PERMAFROST_OVERFLOW_CAP) * C.PERMAFROST_DIRECT * iceCommit;
      }
      // Vergletscherung (Reshape): je Frost-Sieg Bonus-Score ∝ GESAMTER aktiver Gegner-Vergletscherung (Σ frostbiteActive,
      // gedeckelt) — je tiefer der Gegner glaziert, desto mehr scort jeder Sieg. Zuverlässig (jeder Frost-Sieg), statt der
      // engen „schlage eine markierte Karte"-Bedingung (die bei starken Builds kaum zündete → 1,0×).
      if (hasVergletscherung(skills)) {
        let totDebuff = 0;
        for (const id in frostbiteActive) totDebuff += frostbiteActive[id];
        if (totDebuff > 0) iceDirect += Math.min(totDebuff, C.VERGLETSCHERUNG_DEBUFF_CAP) * C.VERGLETSCHERUNG_DIRECT * Math.min(1, iceSkillCount(skills) / C.SKILL_SLOTS);
      }
    }
    // ---- Pflanze-Fraktion (v0): Wachstum (Sieg → +1), Reife-Recolor, Wurzeln (Score/Wert), Aussaat/Ranken (Breite/Grün),
    //      Blüte/Photosynthese/Blätterdach (Grün-Payoff), Ausläufer (Kolonisieren/Ernten). Grün = card.green.
    let plantFlat = 0;
    let plantFormMult = 1;
    let plantDirect = 0; // Pflanze-Legendär-Reshape: DIREKTe, post-stack, gedeckelte Dividende aus den Fluten (unten zu `gained`)
    if ((activeArchetypes || []).includes("plant")) {
      const inFormation = positionHasFormation(posForm);
      const inFarbblock = (posForm.formations || []).some((f) => f.type === "farbblock");
      // Wachstum: jeder Sieg der Karte +1 (nur steigend). Reife: Schwelle erreicht → grün backen.
      const g = (newGrowth[pCard.id] || 0) + 1;
      newGrowth = { ...newGrowth, [pCard.id]: g };
      const cardGreen = pCard.green || growthRipe(g);
      if (growthRipe(g) && !pCard.green) deck = deck.map((c) => (c.id === pCard.id ? { ...c, green: true } : c));
      // Ernte: geschlagene Gegnerkarte kolonisiert? → +Wachstum; Erntedank (reif), Rhizom (Nachbar), Dornenkönig (Marker verbraucht).
      if (newColonized[oCard.id]) {
        newGrowth = { ...newGrowth, [pCard.id]: (newGrowth[pCard.id] || 0) + C.AUSLAEUFER_HARVEST };
        if (hasErntedank(skills) && cardGreen) plantFlat += C.ERNTEDANK_SCORE;
        if (hasRhizom(skills)) { const oi = oppOrder[actualPos], nb = oi + 1 < oppDeck.length ? oi + 1 : oi - 1;
          if (nb >= 0 && newColonized[oppDeck[nb].id]) newGrowth = { ...newGrowth, [pCard.id]: (newGrowth[pCard.id] || 0) + C.AUSLAEUFER_HARVEST }; }
        if (hasDornenkoenig(skills)) { const nc = { ...newColonized }; delete nc[oCard.id]; newColonized = nc; }
      }
      if (cardGreen) {
        // Wurzeltiefe: Flat-Score je Sieg (Pfahlwurzel ×2 in Formation) + Jahresringe (je 10 Wachstum). Mutterbaum streut aufs Segment.
        if (hasWurzeltiefe(skills)) {
          let root = C.WURZELTIEFE_SCORE * (hasPfahlwurzel(skills) && inFormation ? C.PFAHLWURZEL_MULT : 1);
          if (hasJahresringe(skills)) root += Math.floor(g / C.JAHRESRINGE_PER_GROWTH) * C.JAHRESRINGE_SCORE;
          plantFlat += root;
          if (hasMutterbaum(skills) && g >= Math.max(1, ...Object.values(newGrowth))) plantFlat += root; // Mutterbaum (v0-Näherung): Segment-Streuung
        }
        // Wurzelschlag: grüne Karte wächst permanenten Wert an (+1 je 3 Wachstum, bis Deckel 11).
        if (hasWurzelschlag(skills) && g % C.WURZELSCHLAG_PER_GROWTH === 0 && pCard.value < C.PLANT_VALUE_CAP)
          deck = deck.map((c) => (c.id === pCard.id ? { ...c, value: Math.min(C.PLANT_VALUE_CAP, c.value + 1) } : c));
        // Aussaat: beide Nachbarn +1 Wachstum (Flugsamen: grüne überspringen, nächste graue säen).
        if (hasAussaat(skills)) {
          for (const dir of [-1, 1]) {
            let nb = actualPos + dir;
            if (hasFlugsamen(skills)) while (nb >= 0 && nb < playerOrder.length && deck[playerOrder[nb]].green) nb += dir;
            if (nb >= 0 && nb < playerOrder.length) { const nid = deck[playerOrder[nb]].id; newGrowth = { ...newGrowth, [nid]: (newGrowth[nid] || 0) + C.AUSSAAT_GROWTH }; }
          }
        }
        // Ranken: einen noch-grauen Nachbarn sofort grün färben.
        if (hasRanken(skills)) {
          for (const dir of [-1, 1]) { const nb = actualPos + dir; if (nb < 0 || nb >= playerOrder.length) continue;
            if (!deck[playerOrder[nb]].green) { const nid = deck[playerOrder[nb]].id; deck = deck.map((c) => (c.id === nid ? { ...c, green: true } : c)); break; } }
        }
        // Blüte: grüne Nachbarn → +Score je grüner Karte im Segment (Blütezeit ×2 in Formation, Überwucherung ×2).
        if (hasBluete(skills)) {
          const nbGreen = [-1, 1].every((dir) => { const nb = actualPos + dir; return nb < 0 || nb >= playerOrder.length || deck[playerOrder[nb]].green; });
          if (nbGreen) {
            const segStart = Math.floor(actualPos / SEGMENT_SIZE) * SEGMENT_SIZE;
            let gs = 0; for (let p = segStart; p < segStart + SEGMENT_SIZE && p < playerOrder.length; p++) if (deck[playerOrder[p]].green) gs += 1;
            let b = C.BLUETE_SCORE * gs * (hasBluetezeit(skills) && inFormation ? C.BLUETEZEIT_MULT : 1);
            if (hasUeberwucherung(skills)) b *= 2;
            plantFlat += b;
          }
        }
        // Photosynthese: grüne Karte in Formation → ×1,15 (Formations-Faktor). Blätterdach: grüner Farbblock ≥4 → +Score/Karte.
        if (hasPhotosynthese(skills) && inFormation) plantFormMult *= C.PHOTOSYNTHESE_MULT;
        if (hasBlaetterdach(skills) && inFarbblock && greenCount(deck) >= C.BLAETTERDACH_MIN) plantFlat += C.BLAETTERDACH_SCORE * Math.min(greenCount(deck), 10);
        // Ausläufer: die niedrigste noch nicht kolonisierte Gegnerkarte kolonisieren.
        if (hasAuslaeufer(skills)) {
          let lowId = null, lowV = Infinity;
          for (const c of oppDeck) if (!newColonized[c.id] && c.value < lowV) { lowV = c.value; lowId = c.id; }
          if (lowId != null) newColonized = { ...newColonized, [lowId]: true };
        }
        // ---- Pflanze-Legendär-Reshape (2026-07-30): DIREKTE Dividende aus den verschwendeten FLUTEN je GRÜNEM Sieg —
        //      am Multiplikator-Stack VORBEI (unten zu `gained`), hart gedeckelt (Plateau, kein Runaway), bekenntnis-
        //      skaliert (plantSkillCount/SKILL_SLOTS = cross-health). Nur Legendär-Halter → generisches Pflanze unberührt.
        if (hasWeltenbaum(skills) || hasMutterbaum(skills) || hasDornenkoenig(skills) || hasEwigerFruehling(skills)) {
          const plantCommit = Math.min(1, plantSkillCount(skills) / C.SKILL_SLOTS);
          // Überlauf-Wachstum = Wachstum ÜBER dem, was Wurzelschlag zum Wert-Deckel braucht (verschwendet, „alter Wald").
          if (hasWeltenbaum(skills) || hasMutterbaum(skills)) {
            let sumOv = 0, maxOv = 0;
            for (const c of deck) if (c.green) {
              const need = Math.max(0, C.PLANT_VALUE_CAP - c.value) * C.WURZELSCHLAG_PER_GROWTH;
              const ov = (newGrowth[c.id] || 0) - need;
              if (ov > 0) { sumOv += ov; if (ov > maxOv) maxOv = ov; }
            }
            // Weltenbaum (BREITE): die SUMME des Überlauf-Wachstums über den ganzen Wald zahlt je grünem Sieg.
            if (hasWeltenbaum(skills)) plantDirect += Math.min(sumOv, C.WELTENBAUM_OVERFLOW_CAP) * C.WELTENBAUM_DIRECT * plantCommit;
            // Mutterbaum (TIEFE): der EINE tiefste Baum (max Überlauf) zahlt je grünem Sieg (Konzentration).
            if (hasMutterbaum(skills)) plantDirect += Math.min(maxOv, C.MUTTERBAUM_OVERFLOW_CAP) * C.MUTTERBAUM_DIRECT * plantCommit;
          }
          // Dornenkönig (KOLONIE): die kolonisierte Gegner-Breite zahlt je grünem Sieg (das Reich unter Kontrolle).
          if (hasDornenkoenig(skills)) plantDirect += Math.min(Object.keys(newColonized).length, C.DORNENKOENIG_COLON_CAP) * C.DORNENKOENIG_DIRECT * plantCommit;
          // Ewiger Frühling (GRÜN-FELD): das ewige grüne Feld zahlt je grünem Sieg ∝ #grüne Karten.
          if (hasEwigerFruehling(skills)) plantDirect += Math.min(greenCount(deck), C.EWIGER_FRUEHLING_FIELD_CAP) * C.EWIGER_FRUEHLING_DIRECT * plantCommit;
        }
      }
    }
    // Crit ZUERST bestimmen — die Blitz-Crit-Flats (scoreFlatOnCrit) müssen in die multiplizierte Basis.
    // Der Crit-Wurf verbraucht rng nur, wenn wirklich gewürfelt wird → rng-Reihenfolge unverändert (kein Drift).
    // Blitz-Crit-Basis (Abschnitt 2a) wird additiv zugerechnet, unabhängig von L5-critChanceMult.
    // Crit-Chance-Stat (V2 §22.3) fließt additiv in die Roh-Chance (mit Perk-/Blitz-Basis); ungeklemmt (Überschusskrit).
    // Roh-Crit-Chance (ungeklemmt): Perk-/Blitz-Basis + Crit-Chance-Stat. D-Crit-Flats sehen rawCrit (critCtx).
    const rawCrit = critChanceRawFor(perks, wctx) + lightningCritRaw(lightning, skills) + statCritChance
                    + (anchorType === "crit" ? (aParam("crit") || 0) : 0); // Kritanker (§4.2, Stärke = Stufe)
    critChance = Math.min(1, Math.max(0, rawCrit));             // Anzeige/normaler Wurf (geklemmt)
    // Crit-Ctx trägt rawCrit — von D-Crit-Flats (D19 Überschusskrit) UND L6 „Raserei" (critMultBonus, #115) gebraucht.
    const critCtx = { ...wctx, rawCrit };
    // Basis 1,5 + Crit-Mult-Stat + L6-Überschuss + Donnergott + Durchschlag (dauerhaft) + Entladung (armierter Crit nach vollem Verbrauch, einmalig).
    critMultiplier = critMultiplierFor(perks, critCtx, statCritMult) + lightningCritMult(skills)
                   + (lightning?.durchschlagMult || 0)
                   + ((lightning && lightning.dischargeArmed) ? C.ENTLADUNG_CRIT_MULT : 0);
    isCrit = rollCrit(critChance, forceCrit, rng) && !reducedRepeat; // forceCrit = L10; reducedRepeat = Zeitsegment III (§10: kein Crit in der Wiederholung)
    // Score (globale Formel): additive Boni — inkl. Crit-only-Flats (Blitzableiter +50) — fließen in die BASIS
    // und werden mitmultipliziert: (SCORE_PER_WIN + Σ scoreFlat [+ Σ scoreFlatOnCrit bei Crit])
    // × Basis-Serien-Mult (#39, immer) × Perk-scoreMult, DANN Crit-Faktor.
    // Ionisierung: Score der gespielten Karte (Stapel VOR dem Zuwachs). Gewitterfront: +100 für die nächsten Siege.
    const stormScore = (lightning && (lightning.stormScoreWinsRemaining || 0) > 0) ? C.STORM_SCORE : 0;
    // (critCtx mit rawCrit ist oben — vor critMultiplier — gebildet; D6/D7/D8/D11/D15/D19 + Blitzableiter nutzen ihn.)
    // Entladung (Rework v0): war der nächste Crit mit +Crit-Mult armiert (aus einem früheren vollen Verbrauch)?
    // Der Crit-Mult-Bonus fließt oben in critMultiplier; hier nur die Armierung merken (unten entwaffnet).
    const dischargeArmedBefore = !!(lightning && lightning.dischargeArmed);
    // Familien-Score-Flats (Rarität-Umbau #167, Kat. D) laufen ADDITIV neben den flachen Perk-Flats: nur die
    // gehaltene Familien-Stufe zählt (activeTierDefs) → kein Doppel-Trigger über Stufen (Spec §2.3/§9).
    const scoreBase = C.SCORE_PER_WIN + sumHook(perks, "scoreFlat", wctx) + familySumHook(familyTiers, "scoreFlat", wctx)
                      + (isCrit ? sumHook(perks, "scoreFlatOnCrit", critCtx) + skillSum(skills, "scoreFlatOnCrit", critCtx)
                                  + familySumHook(familyTiers, "scoreFlatOnCrit", critCtx)
                                  + (critFollowArmed ? critFollowCritBonus : 0) // D_CRIT_FOLLOW IV: Crit-Folgesieg, der selbst Crit ist
                                  + (anchorType === "crit" ? (aParam("critScore") || 0) : 0) : 0) // Kritanker IV: Crit dort +250 Score
                      + ionScoreFor(pCard) + stormScore + fireFlat + iceFlat + plantFlat
                      + (anchorType === "score" ? (aParam("score") || 0) : 0) // Punkteanker (§4.2, Stärke = Stufe)
                      + (anchorType === "power" ? (aParam("winScore") || 0) : 0) // Kraftanker IV: Sieg dort +100 Score
                      + interplayStored; // D_INTERPLAY IV: der in Niederlagen gebankte Score wird mit diesem Sieg als Flat ausgezahlt
    // Score-Stapelung (§15/§22.7): Basis × Serie(#39) × Perk-scoreMult × Serien-Stat × Formations-Multiplikator
    // × Formations-Stat, DANN Crit. Zu benannten Faktoren gruppiert (identisches Produkt) → eine Quelle für
    // Score UND Ergebnis-Aufschlüsselung (§17), kein Drift.
    const flats = scoreBase - C.SCORE_PER_WIN;                                         // additive Boni (Perk-/Crit-Flats, Ion, Storm, L5-Jackpot)
    const streakMult = streakBaseMult(serieStreak) * statStreakFactor(statStreakMult, serieStreak); // Serie (#39 + Serien-Stat)
    // Legendär-Perks-Rework (#203) — der ×-Multiplikator-Raum ist die family-free Legendär-Lane. Henker (Score, Kat. D)
    // faltet in perkMult; Brennpunkt/Sammler (Formation, Kat. E) falten unten in formMult → §17-Breakdown bleibt exakt.
    const henkerMult = (ownsFlag(perks, "henker") && actualPos >= C.HENKER_ZONE_START) ? C.HENKER_MULT : 1; // Segment-Finale ×
    const perkMult = prodHook(perks, "scoreMult", wctx) * familyProdHook(familyTiers, "scoreMult", wctx) * henkerMult; // globale Perk-/Familien-Multiplikatoren + Henker (#203)
    // Formation (§22.7) in drei benannte Faktoren (§13): Basis-Formationen×Formations-Stat, dann die Shop-Meta-Faktoren
    // Nachhall (F6) und Formationskern (F-L1) je eigen. Produkt = formationMult × Stat (unverändert; Aufspaltung ist rein
    // für die Ergebnis-Aufschlüsselung — Multiplikation ist kommutativ).
    const afterglowMult = posForm.afterglowFactor || 1;                                // F6 Nachhall
    const coreMult = posForm.coreFactor || 1;                                          // F-L1 Formationskern
    const formBaseMult = (posForm.baseMult != null ? posForm.baseMult : formationMult); // echte Formationen (inkl. Überlappung)
    const formStatFactor = statFormFactor(statFormMult, activeFormationCount(posForm)); // Formations-Stat × Anzahl AKTIVER Formationen an der Siegposition
    // Eis-Ceiling-Hebel: dichte Formations-Überlappung (formBaseMult) ist der EINZIGE Eis-Ceiling-Treiber. Weicher
    // Deckel NUR für Frostkarten, NUR über der Schwelle → Median-Frost-Siege (formBase < Schwelle) & Nicht-Eis unberührt.
    let formBaseEff = formBaseMult;
    if (pCard.frozen && C.ICE_FORMBASE_SOFTCAP > 0 && formBaseEff > C.ICE_FORMBASE_SOFTCAP)
      formBaseEff = C.ICE_FORMBASE_SOFTCAP + (formBaseEff - C.ICE_FORMBASE_SOFTCAP) * C.ICE_FORMBASE_SLOPE;
    // Brennpunkt (#203, Formations-Tiefe): Sieg in ≥ BRENNPUNKT_MIN_FORMS gleichzeitigen Formationen → ×BRENNPUNKT_MULT.
    const brennpunktMult = (ownsFlag(perks, "brennpunkt") && activeFormationCount(posForm) >= C.BRENNPUNKT_MIN_FORMS) ? C.BRENNPUNKT_MULT : 1;
    // Sammler (#203, Formationsvielfalt): +SAMMLER_STEP je distinct Formationsart, die diesen Durchlauf SCHON gesammelt
    // wurde (Stand VOR diesem Sieg → wächst über den Durchlauf; „für den restlichen Durchlauf"), max SAMMLER_MAX.
    const sammlerMult = ownsFlag(perks, "sammler") ? 1 + C.SAMMLER_STEP * Math.min(sammlerTypes.length, C.SAMMLER_MAX) : 1;
    const formMult = formBaseEff * formStatFactor * iceFormMult * plantFormMult * brennpunktMult * sammlerMult; // + Eisdruck/Architekt (iceFormMult) + Photosynthese (plantFormMult) + Brennpunkt/Sammler (#203)
    // Sonnenzorn (L): dauerhafter Score-Multiplikator ∝ HÖCHSTER je gehaltener Hitze (heat.peak) — auf den GESAMTEN Sieg-Score
    // (nicht nur fireFlat), weil ein Halte-Build über Wert/Formationen gewinnt, nicht über Feuer-Score.
    const sunwrathMult = (fireFlag(skills, "sunwrath") && heat && heat.active) ? (1 + (heat.peak || 0) * C.SUNWRATH_PEAK_STEP) : 1;
    scoreBeforeCrit = scoreBase * streakMult * perkMult * formMult * afterglowMult * coreMult * sunwrathMult;
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    // SIM-Sättigungshebel (Default aus, K=0 → No-op): weicher Deckel auf den Score je Sieg. Greift NACH der
    // Crit-Multiplikation und VOR dem Verbuchen, verbraucht kein rng → Determinismus/rng-Reihenfolge unverändert.
    if (C.WIN_SOFTCAP > 0 && gained > C.WIN_SOFTCAP) gained = C.WIN_SOFTCAP + (gained - C.WIN_SOFTCAP) * C.WIN_SOFTCAP_SLOPE;
    critBonus = gained - scoreBeforeCrit;
    // #161 FB-2: additiver Score-Anteil der Formations-Faktoren (echte Formationen + Formations-Stat + Nachhall + Kern).
    // Auf dem MULTIPLIZIERTEN Score, VOR der Glutdividende (die läuft am Stack vorbei und zählt nicht als Formations-Score).
    const formFactorTotal = formMult * afterglowMult * coreMult;
    if (formFactorTotal > 1) formationScore += gained * (1 - 1 / formFactorTotal);
    // Glutdividende (Feuer-Rework, Floor-Hebel): DIREKTER Score je Feuer-Sieg (∝ gehaltener Hitze, gedeckelt bei
    // FIRE_DIVIDEND_HEAT_CAP), NICHT durch Serie/Crit/Form multipliziert → flach NACH dem Stack. Hebt den Median
    // (kleine Mults) relativ stärker als das Ceiling (große Mults) = Feuers fehlende „Immer-an-Engine". Skaliert mit
    // dem FEUER-BEKENNTNIS (Anteil Feuer-Skills an den Slots), damit ein 2-Skill-Splash die Dividende nicht in
    // High-Winrate-Kombis (Eis/Pflanze) trägt → hält Spezialisieren ≈ Mischen (cross-health).
    const fireCommit = Math.min(1, activeFireCount(skills) / C.SKILL_SLOTS);
    let fireDirect = C.FIRE_HEAT_DIVIDEND > 0 && fireDividendHeat > 0 && fireCommit > 0
      ? Math.min(fireDividendHeat, C.FIRE_DIVIDEND_HEAT_CAP) * C.FIRE_HEAT_DIVIDEND * fireCommit : 0;
    // Damaststahl (L): DIREKTER Score je Sieg ∝ GESAMTEM geschmiedeten Wert im Deck (am Stack vorbei) — eine „Damast-
    // Dividende", die die Schmiede-Investition bei JEDEM Sieg auszahlt (nicht nur wenn die geschmiedete Karte gewinnt).
    if (fireFlag(skills, "damascus")) {
      const totalForged = Object.values(forged).reduce((a, b) => a + b, 0);
      if (totalForged > 0) fireDirect += totalForged * C.DAMASCUS_DIRECT;
    }
    // Blitz-Legendär-Reshape (2026-07-30): DIREKTE Dividende aus dem GESÄTTIGTEN Ionisierungsfeld. Die Ionisierung flutet
    // (blitz-economy.mjs: alle Karten @Deckel 5, ~ganzes Deck ab Cycle 20) → „mehr Ionis."-Legendäre waren tot (1,01×/0,90×).
    // Sie lesen jetzt den BESTAND des Feldes (Stand VOR dem +1 der Siegkarte) und zahlen je IONISIERTEM Sieg DIREKT — am
    // Multiplikator-Stack VORBEI (floor-clean/ceiling-safe), hart gedeckelt (Plateau, kein Runaway), bekenntnis-skaliert
    // (activeLightningCount/SKILL_SLOTS = cross-health). Nur Legendär-Halter → generisches Blitz (ION_SCORE_PER_STACK) unberührt.
    let lightDirect = 0;
    if ((pCard.ionStacks || 0) > 0 && (hasAreaIonize(skills) || hasDoubleDischarge(skills))) {
      const lightCommit = Math.min(1, activeLightningCount(skills) / C.SKILL_SLOTS);
      let nIon = 0, sumIon = 0;                                        // EIN Scan: Breite (# ionisierte Karten) + Energie (Σ Stapel)
      for (const c of deck) { const st = c.ionStacks || 0; if (st > 0) { nIon++; sumIon += st; } }
      // Flächenionisation (Sturmzelle, BREITE): je breiter das ionisierte Feld, desto größer jeder Treffer.
      if (hasAreaIonize(skills)) lightDirect += Math.min(nIon, C.FLAECHENION_FIELD_CAP) * C.FLAECHENION_DIRECT * lightCommit;
      // Doppelentladung (endloser Sturm, ENERGIE): jeder Treffer detoniert die gesamte Ladung des Feldes (Σ Stapel).
      if (hasDoubleDischarge(skills)) lightDirect += Math.min(sumIon, C.DOPPELENT_FIELD_CAP) * C.DOPPELENT_DIRECT * lightCommit;
    }
    // Vabanque (#203, Eröffnungs-Wette): die ersten VABANQUE_TRICKS Stiche eines DURCHLAUFS in Folge gewonnen →
    // +VABANQUE_SCORE DIREKT (post-stack). pos = Stich-Index im Durchlauf (VOR pos+=1); cycleWins zählt die Siege inkl.
    // dieses → am TRICKS-ten Stich (pos = TRICKS−1) sind alle Eröffnungsstiche gewonnen ⟺ cycleWins === TRICKS.
    // LAUF-DECKEL (vabanquePaid < VABANQUE_MAX_PAYOUTS): `playerOrder` ist persistent + in der Formationsphase spieler-
    // arrangierbar → ohne Deckel ließe sich die Eröffnung durch Vorne-Legen der stärksten Karten JEDEN Durchlauf
    // abgreifen (~24–60×/Lauf → Runaway, gemessen +8,4M/Lauf). Der Deckel begrenzt den Exploit auf MAX_PAYOUTS×SCORE;
    // ein Greedy-Spieler trifft die Eröffnung natürlich ~2×/Lauf, ein Front-Loader erreicht nur den Deckel.
    let perkDirect = 0;
    if (ownsFlag(perks, "vabanque") && pos === C.VABANQUE_TRICKS - 1 && cycleWins === C.VABANQUE_TRICKS && vabanquePaid < C.VABANQUE_MAX_PAYOUTS) {
      perkDirect = C.VABANQUE_SCORE; vabanquePaid += 1;
    }
    gained += fireDirect + iceDirect + lightDirect + plantDirect + perkDirect;
    score += gained;
    breakdown = { base: C.SCORE_PER_WIN, flats, streakMult, perkMult, formMult, formBase: formBaseEff, formStat: formStatFactor, iceForm: iceFormMult, afterglowMult, coreMult, critMult: isCrit ? critMultiplier : 1, fireDirect, iceDirect, lightDirect, plantDirect, perkDirect, total: gained };
    // Gewitterfront: der genutzte Score-Stack ist verbraucht (nur Siege verbrauchen).
    if (stormScore > 0) lightning = { ...lightning, stormScoreWinsRemaining: lightning.stormScoreWinsRemaining - 1 };
    // Blitz-Rework (v0): Ladungsgewinn — Blitzableiter (Crit +1) · Statische Aufladung (Nicht-Crit-Sieg +1) ·
    // Kaskade Überspannung (Crit auf/neben Ionis.) · Überschlag (Crit-Chance-Überschuss) · Dauerstrom (Serie).
    const ionizedCard = (pCard.ionStacks || 0) > 0;
    if (lightning && lightning.active) {
      if (isCrit && dischargeArmedBefore) lightning = { ...lightning, dischargeArmed: false }; // Entladung entwaffnen (Crit-Mult oben verrechnet)
      let gainedCharge = 0;
      if (isCrit) {
        gainedCharge += 1 + skillSum(skills, "chargeOnCrit", wctx);
        // #145: Deck-Nachbarn über actualPos (0–39), nicht über den Stich-Zähler pos (0–44 unter Zeitsegment).
        const nbIon = (actualPos > 0 && (deck[playerOrder[actualPos - 1]]?.ionStacks || 0) > 0)
                   || (actualPos < playerOrder.length - 1 && (deck[playerOrder[actualPos + 1]]?.ionStacks || 0) > 0);
        if (hasUeberspannung(skills) && (ionizedCard || nbIon)) gainedCharge += C.UEBERSPANNUNG_CHARGE; // Kaskade (merge 04+09)
      } else if (hasStaticCharge(skills)) {
        gainedCharge += C.STATIC_CHARGE; // Statische Aufladung: Sieg ohne Crit → 1 Ladung
      }
      // Überschlag: Crit-Chance-Überschuss über 100 % → Ladung (jeder Sieg). Dauerstrom: Serie → Ladung (skaliert mit Länge).
      if (hasUeberschlag(skills) && rawCrit > 1) gainedCharge += Math.floor((rawCrit - 1) * C.UEBERSCHLAG_PER);
      if (hasDauerstrom(skills)) gainedCharge += Math.min(Math.floor(serieStreak / C.DAUERSTROM_PER_STREAK), C.DAUERSTROM_MAX);
      if (gainedCharge > 0) {
        lightning = addCharge(lightning, gainedCharge);
        // Volle Ladung → Konsument (max 1, im Reducer erzwungen) auslösen; Reaktoren laufen bei JEDEM Verbrauch.
        // Geladene Serie setzt den Rahmen (nur wenn nicht schon gesetzt), sonst „parkt" die Ladung; Ionisierung ionisiert.
        if (lightning.charge >= lightning.maxCharge) {
          let consumed = false;
          let blitzCatches = 0; // #165 Blitzfänger: Anzahl voller Karten, die statt ionisiert +Ladung erzeugen
          if (hasProtect(skills) && !lightning.armed) {
            lightning = { ...lightning, armed: true };            // Geladene Serie: Serien-Rahmen scharf
            consumed = true;
          } else if (hasIonize(skills)) {
            // #145: unter Zeitsegment ist `pos` der Stich-Zähler (0–44), nicht die Deck-Position — die noch
            // kommenden Karten sind die seq-gemappten Restpositionen (dedupliziert, da ein wiederholtes Segment
            // Deck-Indizes doppelt nennt). Ohne Zeitsegment ist seq die Identität → identisch zu playerOrder.slice.
            const undrawn = [...new Set(seq.slice(pos + 1).map((p) => playerOrder[p]))]; // Deck-Indizes der noch kommenden Karten
            // Doppelentladung (L, v0): der volle Verbrauch feuert den Ionisierungs-Konsumenten zweimal (Anzahl ×2).
            const ionN = ionizeCountFor(skills) * (hasDoubleDischarge(skills) ? C.DOPPELENTLADUNG_FACTOR : 1);
            if (hasBlitzcatcher(skills)) {
              // Blitzfänger: volle Karten (5 Stapel) werden nicht ionisiert → je +2 temp Wert (nächstes Auftauchen) & +1 Ladung.
              const res = ionizeCardsWithCatch(deck, undrawn, ionN, rng);
              deck = res.deck;
              for (const cid of res.catchIds) newIceTemp[cid] = Math.max(newIceTemp[cid] || 0, C.BLITZFAENGER_VALUE);
              blitzCatches = res.catchIds.length;
            } else {
              deck = ionizeCards(deck, undrawn, ionN, rng);
            }
            consumed = true;
          }
          if (consumed) {
            // Ladungsboden: Reststrom (3), sonst 0 (Endloser Sturm wurde im Rework durch Doppelentladung ersetzt).
            const floor = chargeFloorFor(skills);
            lightning = consumeCharge(lightning, floor);
            // #165 Blitzfänger: die Fang-Ladungen entstehen NACH dem Verbrauch (sonst würde consumeCharge sie wieder auf den Boden setzen).
            if (blitzCatches > 0) lightning = addCharge(lightning, blitzCatches);
            if (hasDischarge(skills)) lightning = { ...lightning, dischargeArmed: true }; // Entladung: nächsten Crit armieren
            if (hasStorm(skills)) { // Gewitterfront-Reaktor: erst Crit-Chance (Cap), danach Score für die nächsten Siege
              const cur = lightning.stormCritBonus || 0;
              lightning = cur < C.STORM_CRIT_CAP
                ? { ...lightning, stormCritBonus: Math.min(C.STORM_CRIT_CAP, cur + C.STORM_CRIT_STEP) }
                : { ...lightning, stormScoreWinsRemaining: C.STORM_SCORE_WINS };
            }
          }
        }
      }
    }
    // Ionisierte Siegkarte: normalerweise +1 Stapel. Kurzschluss (v0): eine VOLLE (5) Karte entlädt stattdessen alle
    // Stapel → Ladung-Burst, Karte auf 0 (Zyklus statt Sättigung). Der Ion-Score wurde oben VORHER gewertet.
    if (ionizedCard) {
      const stacks = pCard.ionStacks || 0;
      if (hasKurzschluss(skills) && stacks >= C.ION_MAX_STACKS) {
        deck = deck.map((c) => (c.id === pCard.id ? { ...c, ionStacks: 0 } : c));
        if (lightning && lightning.active) lightning = addCharge(lightning, stacks * C.KURZSCHLUSS_CHARGE_PER_STACK);
      } else {
        deck = deck.map((c) => (c.id === pCard.id ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, stacks + 1) } : c));
      }
    }
    // Blitzschlag (v0, Kaskade): ein Crit ionisiert die gewonnene Karte (+1 Stapel) — schließt die Selbstspeisung.
    if (isCrit && hasBlitzschlag(skills)) {
      deck = deck.map((c) => (c.id === pCard.id ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + C.BLITZSCHLAG_STACKS) } : c));
    }
    // Durchschlag (L, v0): Sieg mit VOLL ionisierter Karte (5, Stand vor dem Stich) + Crit → dauerhaft +Crit-Mult.
    if (isCrit && hasDurchschlag(skills) && (pCard.ionStacks || 0) >= C.ION_MAX_STACKS && lightning && lightning.active) {
      lightning = { ...lightning, durchschlagMult: Math.min(C.DURCHSCHLAG_MULT_CAP, (lightning.durchschlagMult || 0) + C.DURCHSCHLAG_CRIT_MULT) };
    }
    // Spannungsbogen (§5.2): Sieg mit ionisierter Karte → erster ungespielter, nicht-voller Nachfolger +1 Stapel.
    if (ionizedCard && hasVoltageArc(skills)) {
      const played = new Set(seq.slice(0, pos + 1)); // in diesem Durchlauf bereits gespielte Deckpositionen (Zeitsegment-tauglich)
      for (let k = actualPos + 1; k < playerOrder.length; k++) {
        const di = playerOrder[k];
        if (played.has(k) || (deck[di].ionStacks || 0) >= C.ION_MAX_STACKS) continue; // gespielt oder voll → überspringen
        deck = deck.map((c, i) => (i === di ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + 1) } : c));
        break;
      }
    }
    // Flächenionisation (L, v0): Sieg mit ionisierter Karte → ALLE ungespielten Deck-Nachbarn +1 Stapel (statt nur einer).
    if (ionizedCard && hasAreaIonize(skills)) {
      const played = new Set(seq.slice(0, pos + 1));
      for (const k of [actualPos - 1, actualPos + 1]) {
        if (k < 0 || k >= playerOrder.length) continue;
        const di = playerOrder[k];
        if (played.has(k) || (deck[di].ionStacks || 0) >= C.ION_MAX_STACKS) continue;
        deck = deck.map((c, i) => (i === di ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + 1) } : c));
      }
    }
    // Wetterleuchten (v0): Serie erreicht eine Schwelle → ionisiert Karten (Serie zündet Ionisierung).
    if (hasWetterleuchten(skills) && serieStreak > 0 && serieStreak % C.WETTERLEUCHTEN_THRESHOLD === 0) {
      const undrawnW = [...new Set(seq.slice(pos + 1).map((p) => playerOrder[p]))];
      deck = ionizeCards(deck, undrawnW, C.WETTERLEUCHTEN_COUNT, rng);
    }
    // Spannungsstau (v0): Nicht-Crit-Siege rampen die Crit-Chance (bis Cap); ein Crit entlädt & resettet.
    if (hasSpannungsstau(skills) && lightning && lightning.active) {
      lightning = { ...lightning, stauBonus: isCrit ? 0 : Math.min(C.SPANNUNGSSTAU_CAP, (lightning.stauBonus || 0) + C.SPANNUNGSSTAU_STEP) };
    }
    // Crit-Historie: Update NACH dem Wurf (wctx trug den Stand davor).
    critFollowArmed = isCrit;                                        // D14 Crit-Folge: nur ein Crit rüstet den nächsten Sieg
    // D15/D_MISFIRE: Ladung je Sieg ohne Crit (Stufen-Schritt/Cap); ein Crit zahlt oben die volle Ladung aus und
    // behält danach misfireRetain-Anteil (IV: 25 %, sonst 0 → Reset). Default 30/300/0 = flaches D15.
    misfireScore = isCrit ? Math.round((misfireScore || 0) * misfireRetain)
                          : Math.min((misfireScore || 0) + misfireStep, misfireCap);
    weaknessArmed = false; weaknessBig = false;                      // D16/D_WEAKNESS: durch diesen Sieg verbraucht
    interplayStored = 0;                                            // D_INTERPLAY IV: der gebankte Score ist mit diesem Sieg ausgezahlt
    if (isCrit) {
      crits += 1; critBonusScore += critBonus;
      // D_CRIT_MOMENTUM IV: ein Crit erhöht die Siegesserie zusätzlich (wirkt ab dem nächsten Stich, wie der Serienanker).
      if (streakGainOnCrit) { winStreak += streakGainOnCrit; if (winStreak > bestStreak) bestStreak = winStreak; }
      // L4 Kritische Masse: die kritisch getroffene Karte dauerhaft +1 (Kappe = critValueGain der Perk-Def, einzige Quelle).
      const l4Cap = flagValue(perks, "critValueGain");
      if (l4Cap && (l4Boost[pCard.id] || 0) < l4Cap) {
        deck = deck.map((c) => (c.id === pCard.id ? { ...c, value: c.value + 1 } : c));
        l4Boost = { ...l4Boost, [pCard.id]: (l4Boost[pCard.id] || 0) + 1 };
      }
    }
    bestTrickScore = Math.max(bestTrickScore, gained);
    cycleBestTrick = Math.max(cycleBestTrick, gained); // Echo (#203): bester Stich DIESES Durchlaufs (am Durchlauf-Ende nochmal)
    // Sammler (#203): die diesen Stich GEWONNENEN Basis-Formationsarten (factor > 1) in den Durchlauf-Satz aufnehmen —
    // sie heben den formMult erst der FOLGENDEN Siege dieses Durchlaufs (sammlerMult liest den Stand VOR dem Sieg).
    if (ownsFlag(perks, "sammler"))
      for (const f of posForm.formations || []) if ((f.factor || 1) > 1 && FORMATION_TYPES.includes(f.type) && !sammlerTypes.includes(f.type)) sammlerTypes.push(f.type);
    initiative = "player";
    if (tieConverted) tieArmed = false;
    sinceWin = 0; // #71 Durchbruch: Sieg setzt den Zähler zurück
    lossStreak = 0; // #71 Revanche: Sieg beendet die Niederlagenserie
    // #71/#189 Präzision: Siegwert merken (NACH dem Vergleich in wctx). #189 Fund B: hat D_PRECISION mit diesem Sieg
    // ausgezahlt (Toleranz der Stufe + Vorstich war Sieg — dieselbe Bedingung, die der scoreFlat-Hook oben sah), wird
    // die Referenz bei I–III VERBRAUCHT (null) → der nächste Sieg beginnt ein frisches Paar. Nur IV (chain) läuft weiter.
    const precisionPaid = precisionTol != null && lastResult === "win" && lastWinValue != null
                          && Math.abs(pValue - lastWinValue) <= precisionTol;
    lastWinValue = (precisionPaid && !precisionChains) ? null : pValue;
    // C_RELAY/C_LEADER (Familien, Kat. C zu #167 migriert): gewinnt eine Relay-Rolle, bekommen die nächsten `relay`
    // Karten je +relayBonus (Queue nach dem Verbrauch → Index 0 = nächste Karte). relay/relayBonus aus der gehaltenen Stufe.
    for (const { familyId, def } of activeFamilyEntries(familyTiers)) {
      if (def.relay && isRole(familyId)) for (let i = 0; i < def.relay; i++) successorQueue[i] = (successorQueue[i] || 0) + (def.relayBonus || 0);
    }
    // C_TRIUMPH: gewinnt eine Triumph-Rolle, wird sie fürs nächste Auftauchen armiert.
    if (activeFamilyEntries(familyTiers).some((e) => e.def.triumph && isRole(e.familyId)))
      triumphArmed = [...triumphArmed, pCard.id];
    // Serienanker (§8 A4): Sieg auf einer Serienanker-Position gibt +1 Serienpunkt — NACH der Wertung dieses Siegs.
    // Serienanker (§4.2): Sieg dort gibt `streak` ZUSÄTZLICHE Serienpunkte; Stufe I nur bei gerader Siegzahl
    // (§10-Näherung „jeder zweite Sieg" über die globale Siegzahl-Parität — `wins` ist für diesen Sieg schon erhöht).
    if (anchorType === "streak" && !(aParam("everySecond") && wins % 2 !== 0)) {
      winStreak += aParam("streak") || 0; if (winStreak > bestStreak) bestStreak = winStreak;
    }
    lastResult = "win";
  } else if (lost) {
    losses += 1; cycleLosses += 1; // cycleLosses: Durchlauf-Bilanz für Zinseszins (#203)
    // Geladene Serie (Stufe C): gesetzter Serien-Rahmen fängt DIESE Niederlage ab — winStreak
    // bleibt erhalten (Serien-Effekte laufen weiter). Sonst bricht die Serie. Der Rahmen wird danach eingelöst.
    const rahmenRedeemed = !!(lightning && lightning.armed);
    // Serienanker IV (§4.2): eine Niederlage auf dieser Position setzt die Serie NICHT zurück.
    const streakNoReset = anchorType === "streak" && !!aParam("noReset");
    winStreak = (rahmenRedeemed || streakNoReset) ? winStreak : 0;
    initiative = "opp";
    sinceWin += 1; // #71 Durchbruch: kein Sieg → Zähler hoch
    lossStreak += 1; // #71 Revanche: aufeinanderfolgende Niederlagen
    // B5 Initiative (Familie): Gleichstands-Sieg armieren, sobald die Niederlagenserie die Stufen-Schwelle erreicht.
    if (tieArmLosses != null && lossStreak >= tieArmLosses) tieArmed = true;
    // B8 Revanche III (Familie): erreicht die Serie GENAU die Schwelle, die nächsten `count` Karten je +bonus (successorQueue).
    if (revengeTwoCard && lossStreak === revengeTwoCard.losses)
      for (let i = 0; i < revengeTwoCard.count; i++) successorQueue[i] = (successorQueue[i] || 0) + revengeTwoCard.bonus;
    // D16/D_WEAKNESS: Niederlage ab der Stufen-Schwelle rüstet den nächsten Sieg (Default 5 = flaches D16; IV: 0 = jede
    // Niederlage). D_WEAKNESS IV markiert zusätzlich einen großen Abstand (≥ weaknessBigDeficit → nächster Sieg +900).
    if (oValue - pValue >= weaknessDeficit) weaknessArmed = true;
    weaknessBig = weaknessBigDeficit != null && (oValue - pValue) >= weaknessBigDeficit;
    if (interplayStoreOnLoss) interplayStored += interplayStoreOnLoss; // D_INTERPLAY IV: Niederlage bankt Score für den nächsten Sieg
    winSuit = null; winSuitStreak = 0; // #71 Farbserie: Niederlage beendet die Farbserie (auch mit Rahmen)
    serieStreak = 0;
    if (rahmenRedeemed) lightning = { ...lightning, armed: false }; // Rahmen eingelöst → entfernt
    // ---- Feuer-Rework (v0): Hitzeverlust (Glutbett), Feuerwalze zurücksetzen, Funkenflug halbieren, Rückstand merken.
    if (heat && heat.active) {
      const deficit = oValue - pValue;
      // Phönixfeuer (L): Niederlagen GEBEN Hitze (+je Rückstandspunkt) statt sie zu nehmen — Anti-fragil/Konsistenz.
      const phoenixGain = fireFlag(skills, "phoenix") ? deficit * C.PHOENIX_LOSS_HEAT : 0;
      const loss = phoenixGain ? 0 : heatLossFor(deficit, skills, heat.value); // heat.value = Hitze VOR dem Verlust (Glutbett-Schwelle)
      const nv = Math.min(heat.max, Math.max(0, heat.value - loss) + phoenixGain);
      heat = { ...heat, value: nv, peak: Math.max(heat.peak || 0, nv), fireRoll: 0,
               sparkStore: Math.floor((heat.sparkStore || 0) * C.SPARKFLIGHT_LOSS_KEEP), // Funkenflug: Niederlage halbiert
               lastLossDeficit: deficit }; // Rückzündung: Rückstand für den nächsten Sieg merken
    }
    // Kältereserve (v0): Frostkarte verliert → bankt trotzdem +1 Schicht (der Gletscher wächst auch in der Niederlage).
    if (hasFrostReserve(skills) && pCard.frozen)
      newLayers = { ...newLayers, [pCard.id]: (newLayers[pCard.id] != null ? newLayers[pCard.id] : (layers[pCard.id] || 0)) + C.KAELTERESERVE_LAYER };
    // Zäher Halm (Pflanze v0): unreife (graue) Karten wachsen auch bei Niederlage +1 — bis sie grün sind.
    if (hasZaeherHalm(skills) && !pCard.green) {
      const g = (newGrowth[pCard.id] || 0) + C.ZAEHER_HALM_GROWTH;
      newGrowth = { ...newGrowth, [pCard.id]: g };
      if (growthRipe(g)) deck = deck.map((c) => (c.id === pCard.id ? { ...c, green: true } : c)); // reif geworden → grün backen
    }
    lastResult = "loss";
  } else {
    ties += 1;
    sinceWin += 1; // #71 Durchbruch: Gleichstand zählt als „kein Sieg" weiter
    lossStreak = 0; // #71 Revanche: Gleichstand ist keine Niederlage → Serie bricht
    winSuit = null; winSuitStreak = 0; // #71 Farbserie: Gleichstand ist kein Sieg → Serie bricht
    lastResult = "tie";
    // Serie & Initiative unverändert
  }

  // #71 Volles Haus: Ergebnis-Fenster fortschreiben (letzte 4 Ergebnisse für den nächsten Stich).
  recentResults = [...recentResults, lastResult].slice(-4);

  const lastTrick = {
    pCard, oCard, pValue, oValue,
    result: tieConverted ? "win_tie" : won ? "win" : lost ? "loss" : "tie",
    gained, trickNo,
    isCrit, critChance, critMultiplier, scoreBeforeCrit, scoreGain: gained, critBonus,
    // Formations-Multiplikator dieses Stichs (§22.7) + die beteiligten Formationen der Position (Anzeige/Float).
    formationMult: won ? formationMult : 1,
    formations: posForm.formations,
    oFrostbitten: (frostbiteActive[oCard.id] || 0) > 0, // Vergletscherung (Eis): erst JETZT (im Kampf) sichtbar
    pFrozen: !!pCard.frozen,
    isRepeatedSegmentTrick: isRepeat, originalPosition: actualPos, segmentIndex: timeSeg, // Zeitsegment (§8 A-L1 / §13)
    breakdown, // Ergebnis-Aufschlüsselung (§17): { base, flats, streakMult, perkMult, formMult, critMult, total } bei Sieg, sonst null
  };

  // Durchlauf-Ende: Score-Effekte am Durchlauf-Ende, dann NUR das Gegnerdeck NEU MISCHEN (Spieler-Reihenfolge
  // bleibt persistent, §22.1) und eine Auswahl anbieten. Nach MAX_CYCLES Durchläufen endet der Run (§22.1).
  pos += 1;
  let phase = "play";
  let newOffer = offer;
  let newSkillOffer = skillOffer;
  let newStatOffer = statOffer;
  let newFormationEnergy = formationEnergy;
  let newFormationSwaps = formationSwaps;
  let newFreePerkReroll = false, newFreeSkillReroll = false; // P-L1: gratis Reroll gilt nur fürs frisch erzeugte Angebot
  if (pos >= cycleLen) { // Zeitsegment (§8 A-L1): Durchlauf endet nach cycleLen Stichen (40, mit Zeitsegment 45)
    cycle += 1;
    // ---- Legendär-Perks-Rework (#203): Durchlauf-Ende-Payoffs, VOR dem Rundenscore-Tracking (dem beendeten Durchlauf
    //      attribuiert). Zinseszins — positive Durchlauf-Bilanz (mehr Siege als Niederlagen) stapelt eine FLACHE Dauer-
    //      Dividende (kein Mult), die jeden Durchlauf ausgezahlt wird (compoundet über den Lauf). Echo — der beste Stich
    //      dieses Durchlaufs wird ein zweites Mal gutgeschrieben (× ECHO_FACTOR).
    let cycleEndScore = 0;
    if (ownsFlag(perks, "zinseszins")) { if (cycleWins > cycleLosses) zinsBonus += C.ZINSESZINS_STEP; cycleEndScore += zinsBonus; }
    if (ownsFlag(perks, "echo")) cycleEndScore += cycleBestTrick * C.ECHO_FACTOR;
    score += cycleEndScore;
    // Per-Karte-Ledger (Sim S1): die Durchlauf-Ende-Payoffs dem gerade gespielten Schluss-Stich gutschreiben, damit die
    // Score-Summe je Karte weiterhin exakt `score` reproduziert (metrics.observe liest lastTrick.gained). lastTrick ist
    // oben schon gebaut; Mutation einer const-Objekt-Property ist erlaubt.
    if (cycleEndScore) { lastTrick.gained += cycleEndScore; lastTrick.scoreGain += cycleEndScore; }
    cycleWins = 0; cycleLosses = 0; cycleBestTrick = 0; sammlerTypes = []; // Pro-Durchlauf-States zurücksetzen (#203)
    // #131 Rundenscore: Zuwachs dieses gerade beendeten Durchlaufs (score enthält bereits den letzten Stich + #203-Payoffs)
    // + Rollover, damit das nächste Entscheidungs-Panel Rundenscore und %-Differenz zur Vorrunde zeigen kann.
    prevCycleScore = lastCycleScore;
    lastCycleScore = score - scoreAtCycleStart;
    scoreAtCycleStart = score;
    // Shop-Münzökonomie (Shop-Spec §3.2): jeder vollständig abgeschlossene Durchlauf zahlt die konstante Basis
    // (das Einkommen wirkt am Shop, siehe unten). Auch nach dem letzten Durchlauf (→ gameover) vergeben (§3.5).
    shop = { ...(shop || {}), coins: ((shop && shop.coins) || 0) + coinsPerCycle() };
    // #98: temporäre Positions-Boni enden mit dem Durchlauf — sonst würde ein an Position 40 armierter
    // Relay (C4/C5) auf Position 1 des nächsten (persistenten) Durchlaufs durchsickern.
    successorQueue = [];
    // ---- Feuer-Rework (v0): Durchlauf-Ende — Schmieden (Ascheschmiede), Damaststahl-Wachstum, Phönix-Reset.
    if (heat && heat.active) {
      // Ascheschmiede: solange genug Asche, jeweils die aktuell niedrigste Karte dauerhaft +2 Wert (spreizt sich über
      // die tiefen Karten, da nach jedem Schmieden neu die tiefste gesucht wird). Schmelzofen senkt die Kosten ab 50 % Hitze.
      if (fireFlag(skills, "ascheschmiede")) {
        const cost = forgeCostFor(skills, heat.value);
        let guardF = 0;
        while (newAsh >= cost && guardF++ < deck.length) {
          // niedrigste schmiedbare Karte: unter dem Per-Karte-Deckel UND (schon geschmiedet ODER noch Platz unter
          // FORGE_MAX_CARDS). So bleibt Ascheschmiede ein Boden-Heber (wenige tiefe Karten), kein Ganz-Deck-Buff.
          const forgedCount = Object.keys(newForged).length;
          let lowId = null, lowV = Infinity;
          for (const c of deck) {
            if ((newForged[c.id] || 0) >= C.FORGE_MAX_PER_CARD && !fireFlag(skills, "damascus")) continue; // Per-Karte-Deckel (Damaststahl hebt ihn auf)
            if (!(newForged[c.id] > 0) && forgedCount >= C.FORGE_MAX_CARDS) continue;    // keine NEUE Karte über dem Kartendeckel
            if (c.value < lowV) { lowV = c.value; lowId = c.id; }
          }
          if (lowId == null) break; // nichts mehr schmiedbar → Asche bleibt erhalten
          newAsh -= cost;
          deck = deck.map((c) => (c.id === lowId ? { ...c, value: c.value + C.FORGE_VALUE } : c));
          newForged = { ...newForged, [lowId]: (newForged[lowId] || 0) + C.FORGE_VALUE };
        }
      }
      // Damaststahl (L): SELBST-Schmiede (braucht Ascheschmiede/Asche NICHT) — nimmt je Durchlauf die niedrigste noch
      // nicht geschmiedete Karte auf, dann wachsen ALLE geschmiedeten Karten weiter (Asche verfällt ohnehin nie).
      if (fireFlag(skills, "damascus")) {
        let lowId = null, lowV = Infinity;
        if (Object.keys(newForged).length < C.DAMASCUS_MAX_FORGED) // Deckel: nur bis MAX_FORGED neue Karten aufnehmen
          for (const c of deck) if (!(newForged[c.id] > 0) && c.value < lowV) { lowV = c.value; lowId = c.id; }
        if (lowId != null) {
          deck = deck.map((c) => (c.id === lowId ? { ...c, value: c.value + C.FORGE_VALUE } : c));
          newForged = { ...newForged, [lowId]: (newForged[lowId] || 0) + C.FORGE_VALUE };
        }
        if (Object.keys(newForged).length) {
          const grown = { ...newForged };
          deck = deck.map((c) => (grown[c.id] ? { ...c, value: c.value + C.DAMASCUS_FORGE_GROWTH } : c));
          for (const id of Object.keys(grown)) grown[id] += C.DAMASCUS_FORGE_GROWTH;
          newForged = grown;
        }
      }
      // Sonnenkern (L): endet der Durchlauf mit hoher Hitze, brennt sie sich dauerhaft in ALLE Karten UNTER dem Deckel (+Wert) →
      // hebt über den Run den Deck-BODEN bis SONNENKERN_CARD_CAP (selbst-limitierend, kein Auto-Sieg-Runaway) = stetige Win-Condition.
      if (suncore && heat.value >= C.SONNENKERN_MIN_HEAT)
        deck = deck.map((c) => (c.value < C.SONNENKERN_CARD_CAP ? { ...c, value: c.value + C.SONNENKERN_VALUE } : c));
      heat = { ...heat, phoenixUsed: false }; // Phönixfeuer: neuer Durchlauf → wieder verfügbar
    }
    // ---- Pflanze-Fraktion (v0): Weltenbaum — am Durchlauf-Ende wächst der ganze Wald (+1 Wachstum je 10 grüne im Feld); Nachzügler reifen.
    if (hasWeltenbaum(skills)) {
      const per = Math.floor(greenCount(deck) / C.WELTENBAUM_PER_GREEN);
      if (per > 0) {
        const ng = { ...newGrowth };
        for (const c of deck) ng[c.id] = (ng[c.id] || 0) + per;
        newGrowth = ng;
        deck = deck.map((c) => (!c.green && growthRipe(newGrowth[c.id] || 0) ? { ...c, green: true } : c));
      }
    }

    if (cycle >= C.MAX_CYCLES) {
      // Run-Ende nach dem letzten Durchlauf (§22.1): kein Neu-Mischen, keine Auswahl mehr.
      phase = "gameover";
    } else {
      // Neuer Durchlauf: NUR das Gegnerdeck neu mischen; Spieler-Reihenfolge bleibt (persistent). pos zurück.
      oppOrder = shuffledOrder(oppDeck.length, rng);
      pos = 0;
      // Vergletscherung (v0): die im gerade beendeten Durchlauf gesetzten Gegner-Marken {id: −Wert} werden jetzt aktiv.
      newFrostbiteActive = newFrostbitePending;
      newFrostbitePending = {};
      // Beständigkeit (v0): die Frostkarten, die diesen Durchlauf in Formation siegten, sind der Vergleich für den nächsten.
      newFrostFormPrev = [...new Set(newFrostFormCur)];
      newFrostFormCur = [];
      // Feuer-Brand (v0): analog — die im gerade beendeten Durchlauf gesetzten Brandmarken werden jetzt aktiv (−Wert).
      newBrandActive = newBrandPending;
      newBrandPending = {};
      // Entscheidung VOR dem neuen Durchlauf nach dem festen Plan (Shop-Spec §2.2): DECISION_SCHEDULE[cycle]
      // (cycle wurde oben erhöht → Index cycle = Entscheid vor Durchlauf cycle+1). Start-Entscheid via START_RUN.
      const decision = C.DECISION_SCHEDULE[cycle];
      const perkFate = perkFateReroll(shop), skillFate = skillFateReroll(shop); // #164 Schicksalskontrolle/Neuwurf IV: gratis Reroll je Auswahl
      if (decision === "stat") {
        phase = "levelup"; newStatOffer = STAT_IDS; // immer alle Stats (Shop-Spec §4.3: fünf inkl. Einkommen)
      } else if (decision === "skill") {
        const soff = buildSkillOffer(skills, activeArchetypes, rng, C.SKILLS_OFFERED, skillLegendaryChance(shop));
        if (soff.length > 0) { phase = "levelup"; newSkillOffer = soff; newFreeSkillReroll = skillFate; }
        else { const off = buildPerkOffer(perks, familyTiers, rng, C.PERKS_OFFERED, perkLegendaryChance(shop)); if (off.length > 0) { phase = "levelup"; newOffer = off; newFreePerkReroll = perkFate; } } // leerer Skill-Pool → Perk
      } else if (decision === "perk") {
        const off = buildPerkOffer(perks, familyTiers, rng, C.PERKS_OFFERED, perkLegendaryChance(shop));
        if (off.length > 0) { phase = "levelup"; newOffer = off; newFreePerkReroll = perkFate; }
      } else if (decision === "shop") {
        // Shop-Runde (Shop-Spec §2.6): Shop-Phase öffnen, Einkommensbonus gutschreiben (+3 je Einkommen-Level,
        // pro Shop) und ein frisches Angebot ziehen (§5, deterministisch über rng). Danach ein evtl. im letzten
        // Shop reserviertes Item (§10 P4) als zusätzliches Angebot anhängen (Reservierung verfällt damit).
        phase = "shop";
        shop = { ...shop, coins: (shop.coins || 0) + shopIncomeFor(economyStatLevel),
                 offers: buildShopOffer(SHOP_ITEM_DEFS, shop, rng, perks, SHOP_FAMILY_DEFS), purchasedOfferIds: [] };
        shop = withReservedOffer(shop, SHOP_ITEM_DEFS, perks, SHOP_FAMILY_DEFS);
      } else if (decision === "formation") {
        // Formationsphase (§22.8): Deck-Aufstellung öffnen, frische Energie (+ Shop-Feinjustierung), Vorschau berechnen.
        phase = "formation";
        newFormationEnergy = C.FORMATION_ENERGY + perks.reduce((t, id) => t + (PERK_DEFS[id].extraSwap || 0), 0)
          + formationEnergyBonus(familyTiers, cycle); // #179 Feinjustierung (jetzt Perk-Familie E_TUNING): +Energie je Stufe
        newFormationSwaps = [];
        // #137: anchors + familyTiers mitgeben (wie bei pos-0/Tausch/Kauf), sonst zeigt die Formationsphase beim
        // Eintritt einen veralteten Stand (ohne regeländernde Familien-Effekte) — erst der erste Tausch korrigierte.
        formations = computeFormations(playerOrder, deck, roles, perks, skills, anchors, familyTiers);
      }
    }
  }

  return {
    ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    score, winStreak, bestStreak, wins, losses, ties,
    scoreAtCycleStart, lastCycleScore, prevCycleScore, // #131 Rundenscore-Tracking

    crits, critBonusScore, bestTrickScore, maxFormations, formationScore, // #161 FB-2: Run-Rückblick
    initiative, lastResult, perks, offer: newOffer, tieArmed, sinceWin, lossStreak, lastWinValue,
    freePerkReroll: newFreePerkReroll, freeSkillReroll: newFreeSkillReroll, // Planung (§10 P-L1)
    critFollowArmed, weaknessArmed, weaknessBig, interplayStored, misfireScore,
    winSuit, winSuitStreak, recentResults, segmentWins, // #189 Volles Haus: segment-genauer Sieg-Zähler
    formations, // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, zu Durchlauf-Beginn berechnet
    formationEnergy: newFormationEnergy, formationSwaps: newFormationSwaps, // Formationsphase (V2 §22.8)
    successorQueue, triumphArmed, // Kartenrollen (V2 §22.6 C): C4/C5-Nachfolger-Boni / C2-Triumph-Armierung
    l4Boost, // Legendär-Perk L4 Kritische Masse (Crit-Wert-Gewinn je Karte)
    zinsBonus, cycleWins, cycleLosses, cycleBestTrick, sammlerTypes, vabanquePaid, // Legendär-Perks-Rework (#203)
    roles, // (unverändert vom Reducer gesetzt, hier durchgereicht)
    statOffer: newStatOffer, // Stat-System (V2 §22.3)
    skillOffer: newSkillOffer, lightning, // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md)
    heat, // Feuer-Archetyp (#93 F1): Hitze-Substate (null solange kein Feuer-Skill aktiv)
    iceTemp: newIceTemp, frostbitePending: newFrostbitePending, frostbiteActive: newFrostbiteActive, // Eis (Kaltfront temp / Vergletscherung)
    layers: newLayers, frostFormPrev: newFrostFormPrev, // Eis-Rework (v0): Schichten (permanent) + Beständigkeits-Historie
    ash: newAsh, brandPending: newBrandPending, brandActive: newBrandActive, forged: newForged, // Feuer-Rework (v0)
    growth: newGrowth, colonized: newColonized, // Pflanze-Fraktion (v0): Wachstum + Kolonisierung (grün = card.green im deck)
    shop, // Shop-System (Shop-Spec §3): aktualisierter Münzstand (economyStatLevel läuft unverändert über ...state)
    lastTrick, phase,
  };
}
