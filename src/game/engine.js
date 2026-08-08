import * as C from "./constants.js";
import { shuffledOrder } from "./deck.js";
import { rngAt } from "./rng.js"; // #205 Challenger Mode: adressierte Sub-Ströme (build-unabhängige Slots)
import { PERK_DEFS, buildPerkOffer, critChanceRawFor, critMultiplierFor, streakBaseMult } from "./perks.js";
import { familySumHook, familyProdHook, familyTierParam, activeFamilyEntries, formationEnergyBonus, familyCritChanceRaw, familyCritMult, allianceGroups } from "./families.js";
import { colorsAllied } from "./color.js"; // #289: Farb-Serie/Architekt/Farbfokus respektieren Farballianz
import { skillSum, lightningCritRaw, addCharge, buildSkillOffer, buildLegendaryOffer, ionScoreFor, ionCritChance, ionizeCountFor, consumeCharge, ionizeCards, ionizeCardsWithCatch,
  hasIonize, hasStorm, chargeFloorFor, fieldBreadthSaturated, fieldDepthSaturated, ionSpeedBonus, // Blitz-Rework v0.5: 2-Stufen-Sättigung + Speed
  lightningCritMult, hasStaticCharge, hasDischarge, hasBlitzcatcher, hasVoltageArc, // Blitz-Rework (v0)
  hasUeberspannung, hasKurzschluss, hasSpannungsstau, hasUeberschlag, hasBlitzschlag, hasDauerstrom, hasBlitzableiter, // Blitz-Rework (v0): Kaskade/Crit-Maschine/Serie
  hasDoubleDischarge, hasAreaIonize, hasDurchschlag, activeLightningCount, hasThunderGod, hasSerienschutz, // Blitz-Rework (v0/v0.5): Legendäre + Serienschutz
  fireFlag, hasHeatConsumer, heatGainFor, heatLossFor, fireScoreFor, activeFireCount, // Feuer-Rework (v0); #234: hasHeatConsumer statt heatConsumerOf (mehrere Hitze-Konsumenten je einzeln)
  glowingValueFor, whiteHeatScore, forgeCostFor, // Feuer-Rework (v0): Schwellen/Weißglut/Schmiede
  growthRipe, greenCount, // Pflanze-Fraktion (v0): Reife/Grün
  plantPassiveActive, hasKernholz, hasWurzeltiefe, hasPfahlwurzel, hasJahresringe, hasAussaat, hasFlugsamen, hasZaeherHalm, // Pflanze: Fraktions-Passive (Mono/Schwellen-Knick) / Kernholz / Tiefe / Breite
  hasRanken, hasBluete, hasBluetezeit, hasPhotosynthese, hasBlaetterdach, hasUeberwucherung, // Pflanze: Grün/Überwucherung
  hasAuslaeufer, hasRhizom, hasErntedank, hasWeltenbaum, hasMutterbaum, hasBaumreihe, hasEwigerFruehling, plantSkillCount } from "./skills.js"; // Pflanze: Gegnerdeck/Legendäre + Bekenntnis-Skalierung
// (#267: import aus stats.js entfernt — die Stat-Phase/Faktoren sind weg.)
import { computeFormations, positionHasFormation, activeFormationCount, summarizeFormations, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { perkLegendaryChance, skillLegendaryChance, anchorAt } from "./shop.js";
import { precomputeArchitect, architectValueBonus, architectScore, buildArchitectOffer } from "./architect.js";
import { precomputeGlacier, ewigerFrostTick, dauerfrostTick, glacierOpts, driftTarget as glacierDriftTarget,
  neighbors4 as glacierNeighbors4, glacierNeighborFn, verschmelzenPool, uebergletscherPool, packeisTick, verzahnungTick, eiszeitTick, glacierGeometry,
  ROLES as GLACIER_ROLES, WIN_MASS as GLACIER_WIN_MASS, ANFRIEREN_WIN as GLACIER_ANFRIEREN_WIN,
  ANFRIEREN_FORM as GLACIER_ANFRIEREN_FORM, SCHNEETREIBEN_SEED as GLACIER_SCHNEETREIBEN_SEED,
  EISPANZER_MASS as GLACIER_EISPANZER_MASS, FROSTBUND_BUFF as GLACIER_FROSTBUND_BUFF,
  VERDICHTUNG_RATE as GLACIER_VERDICHTUNG_RATE, ERSTARRUNG_FRAC as GLACIER_ERSTARRUNG_FRAC } from "./glacier.js"; // Eis-Neudesign (isoliert, activeArchetypes "glacier")
import { isLegendarySkill } from "./skills.js"; // #217: Garantie-Erkennung (Legendär im Skill-Angebot)
import { fullPerkOffer, fullSkillOffer, fullArchitectOffer } from "./devCatalog.js"; // Dev-Run: Voll-Katalog statt Zufallsangebot (nur state.devMode)
import { masteryLegendMult, masteryRareShift, masteryLegendGuaranteed } from "./mastery.js"; // #217 Meistergrade: Reward-Ableitungen

// ERKUNDUNG Hebel 7: Commitment-Scaler mit Konvexitäts-Exponent. commitScale(count) = min(1, count/SKILL_SLOTS)^COMMIT_EXP.
// COMMIT_EXP=1 (Default) → linear = bisheriges Verhalten (neutral). >1 → konvex (Verdünnung kostet superlinear).
const commitScale = (count) => Math.pow(Math.min(1, count / C.SKILL_SLOTS), C.COMMIT_EXP);

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

// #229 N8: Determinismus-Invariante HART absichern — statt still auf Math.random zu defaulten, wirft eine
// vergessene rng-Injektion laut. (Der Zufall wird primär aus state.seed abgeleitet; rng ist der explizite
// Fallback, wenn kein Seed vorliegt — und muss dann ebenfalls bewusst übergeben werden, nie stilles Math.random.)
function requireRng(rng, where) {
  if (typeof rng !== "function") throw new Error(`${where}: rng muss injiziert werden (Determinismus-Invariante #229 N8) — kein stiller Math.random-Fallback.`);
  return rng;
}

// Crit-Wurf (pure, testbar): guaranteed override; sonst rng < gedeckelter Chance.
// Ruft rng() NUR, wenn wirklich gewürfelt wird → minimaler/deterministischer Verbrauch.
export function rollCrit(chance, guaranteed, rng) {
  requireRng(rng, "rollCrit"); // #229 N8: rng ist Pflicht (kein Math.random-Default mehr)
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
export function resolveTrick(state, rng) {
  if (state.phase !== "play") return state; // Nicht-Play → No-op, braucht keine rng
  requireRng(rng, "resolveTrick"); // #229 N8: rng ist Pflicht (kein Math.random-Default mehr); Zufall kommt primär aus state.seed via rngAtOr

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
    // (#267: Stat-System entfernt — statCrit*/statForm*/statStreak*/statOffer sind weg; Crit kommt aus Präzision-Familien + Blitz.)
    formationEnergy = 0, formationSwaps = [], // Formationsphase (V2 §22.8)
    roles = {}, successorQueue = [], triumphArmed = [], // Kartenrollen (V2 §22.6 C): Rollen-ids / Nachfolger-Boni / Triumph-Armierung
    l4Boost = {}, // Legendär-Perk L4 Kritische Masse: Crit-Wert-Gewinn je Karte (Kappe)
    zinsBonus = 0, cycleWins = 0, cycleLosses = 0, cycleBestTrick = 0, sammlerTypes = [], // Legendär-Perks-Rework (#203): Zinseszins-Dauerdividende / Durchlauf-Bilanz / Echo-Bester-Stich / Sammler distinct Formationsarten
    richtfestBonus = 0, // Gebäude-Legendäres Richtfest: aufgestapelte Struktur-Dauerdividende (Auszahlung je Durchlauf-Ende)
    vabanquePaid = 0, // Vabanque (#203): Zahl der Eröffnungs-Wetten, die dieser Lauf schon ausgezahlt hat (Lauf-Deckel gegen Front-Load-Exploit)
    crits, critBonusScore, bestTrickScore, bestGlacierTrickScore = 0, // bester Stich + bester Gletscher-Stich (Bruch getrennt geführt)
    maxFormations = 0, formationScore = 0, buildingScore = 0, streakScore = 0, // #161 FB-2 + #251: Score-Anteile (Formation / Architekt-Gebäude / Serie)
    // #270 Fraktions-Panels: kumulative Fantasie-Kennzahlen je Fraktion (nur Anzeige). Ertrag = ROHER Eigen-Score, den die
    // Fraktions-Mechanik erzeugt hat: ihre Flats (VOR dem geteilten Multiplikator-Stack) + ihre post-stack Direkt-Dividenden.
    // Bewusst der Roh-Beitrag (nicht mit Formation/Serie/Crit multipliziert) → ehrliche, nicht aufgeblähte Zahl je Fraktion.
    // Getrennte Sub-Kanäle je namentlicher Fantasie (#270.2): Pflanze Wurzel/Blüte/Ernte · Feuer Grund/Weißglut. Eis/Blitz
    // bleiben je EIN kohärenter Kanal (Eis = „Schichten zahlen", Blitz = Ionisierung; Blitz-Crit steht global in der Rail).
    lightYield = 0, // Blitz-Eigen-Score (Kanal)
    plantRoot = 0, plantBloom = 0, plantHarvest = 0, // Pflanze: Wurzel- / Blüten- / Ernte-Score
    fireBase = 0, fireWhite = 0, // Feuer: Grund-Score / Weißglut-Score
    ionTotal = 0, growthTotal = 0, ashBurned = 0, brandTotal = 0, // Motor-Zähler: ionisierte Karten / Wachstum / verbrannte Asche / gebrandmarkte Gegnerkarten
    trimCount = 0, // #288 Trimmen: ersetzte Wachstums-Skills → Wurzel-/Blüten-Multiplikator
    skills = [], skillOffer = null, lightning = null, activeArchetypes = [], // Skill-System / Archetypen (#93)
    iceTemp = {}, // temporärer Wertbonus je card.id (Blitzfänger — an gefangenen Karten; #93)
    ash = 0, brandPending = {}, brandActive = {}, forged = {}, // Feuer-Rework (v0): Asche-Ressource / Brand-Marker (Gegner, je card.id) / geschmiedete Dauerwerte
    growth = {}, colonized = {}, // Pflanze-Fraktion (v0): Wachstum je card.id (nur steigend) / kolonisierte Gegnerkarten (grün = card.green auf der Karte)
    plantLoss = {}, // Wurzelschlag-Buff (v0.4): Niederlagen-Zähler je card.id — je WURZELSCHLAG_LOSS_EVERY wächst die Karte trotzdem

    shop = null, // hält nur noch die (inerten) Positionsanker []; der Shop selbst ist entfernt (#229)
    familyTiers = {}, // Raritätssystem (Epic #167): Familienrang je Familie — Engine löst aktive Stufen-Hooks auf
    architect = null, architectEnabled = false, architectPre = null, // Architekt (#202, Shop-Ersatz): Gebäude-Overlay (8×5) + Durchlauf-Precompute
    glacierMass = [], glacierLocked = [], glacierPre = null, glacierYield = 0, glacierRoles = [], // Eis-Neudesign (glacier.js): Firn-Boden-Masse / Lock / Snapshot / Eigen-Score / aktive Rollen (Fundament-Modifikatoren)
    grosseLawineFired = false, // Eis-Neudesign (Große Lawine): One-Shot-Finisher — feuert genau einmal, danach inert
    frozenOppPending = {}, frozenOppActive = {}, // Eis-Neudesign (Einfrieren): Gegnerkarten, die im nächsten Durchlauf ihren Stich garantiert verlieren (je oppCard.id)
    glacierBuffPending = {}, glacierBuffActive = {}, // Eis-Neudesign (Frostbund): Wert-Buff auf eigene Nicht-Eis-Nachbarkarten (je card.id, nächster Durchlauf)
    seed = null, // #205 Challenger Mode: Lauf-Seed (null = unseeded/Sim) + Reroll-Index des akt. Angebots
    difficulty = null, // #226 Großmeister: { oppRampEvery } — mitwachsender Gegner. null (Meister/Basis) = No-op, byte-identisch.
  } = state;

  // #205: adressierte rng-Ableitung im Durchlauf. Bei gesetztem seed ein FRISCHER, build-unabhängig adressierter
  // Sub-Strom `(seed, ...parts)` je Zieh-Punkt (Crit/Ionisierung/Neumischung/Angebotsbau); sonst der injizierte rng
  // (Sim/Alt-Verhalten byte-identisch). Weil DECISION_SCHEDULE je Durchlauf genau eine Entscheidung liefert, ist
  // `(seed, cycle, kind[, pos/index])` eindeutig — die interne Draw-Zahl einer Stelle bleibt lokal (kein Cross-Bleed).
  const rngAtOr = (...parts) => (seed != null ? rngAt(seed, ...parts) : rng);

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

  // #229: Zeitsegment (eine Shop-Funktion) entfernt — jeder Durchlauf ist genau TRICKS_PER_CYCLE Stiche, der
  // Stich-Index IST die Deckposition (seq = Identität), keine Wiederholung. `seq`/`timeSeg` bleiben als Identität/null
  // erhalten, damit die Downstream-Nutzer (predValue, undrawn-Slices, lastTrick-Marker) unverändert laufen.
  const timeSeg = null;
  const seq = playerOrder.map((_, i) => i);
  const cycleLen = C.TRICKS_PER_CYCLE;
  const actualPos = pos;
  const isRepeat = false;
  const reducedRepeat = false;
  const pCard = deck[playerOrder[actualPos]];
  const oCard = oppDeck[oppOrder[actualPos]];

  // Formationen (V2 §22.7): zu Durchlauf-Beginn (pos 0) aus der persistenten Reihenfolge + Dauerwerten
  // berechnet und für den ganzen Durchlauf stabil gehalten. Greifen bei Sieg der jeweiligen Karte.
  let formations = state.formations || [];
  const anchors = (shop && shop.anchors) || []; // Shop-Positionsanker (§8) — an der Deckposition
  const archState = architectEnabled ? architect : null; // Architekt nur aktiv, wenn das Flag gesetzt ist (im Spiel default an)
  // Architekt-Precompute je Durchlauf (stabil): value-/score-Effekte + Struktur-Faktor je Position (target einmal bestimmt).
  let archPreNow = architectPre;
  if (pos === 0) {
    formations = computeFormations(playerOrder, deck, roles, perks, skills, anchors, familyTiers, archState);
    archPreNow = archState ? precomputeArchitect(archState, playerOrder, deck) : null;
  }
  // Eis-Neudesign (docs §2.4): Snapshot am Durchlauf-Start — der ganze Bruch wird auf dem statischen Brett vorab gerechnet
  // (analog precomputeArchitect), pro Stich ausgezahlt. Der Teil-Reset (−1 Stufe) greift SOFORT auf die Arbeits-Masse;
  // Siege dieses Durchlaufs addieren darauf, Ewiger Frost am Durchlauf-Ende. Isoliert über activeArchetypes "glacier".
  const glacierActive = activeArchetypes.includes("ice"); // Eis-Neudesign: der Eis-Archetyp IST der Gletscher
  const glacierNF = glacierActive ? glacierNeighborFn(glacierRoles) : null; // Eisbrücke → 8-Nachbarschaft, sonst 4
  let glacierPreNow = glacierPre;
  let newGlacierMass = Array.isArray(glacierMass) ? glacierMass.slice() : [];
  let newGlacierLocked = glacierLocked; // wird nur von Eiszeit (Auto-Lock) verändert; sonst durchgereicht
  let newGrosseLawineFired = grosseLawineFired; // Große Lawine: nach dem ersten aktiven Durchlauf verbraucht
  if (glacierActive && pos === 0) {
    // Pooling vor dem Bruch: Ewiges Schild (Legendär) poolt das GANZE Feld, sonst Verschmelzen den Cluster (nie fallend).
    const snapMass = glacierRoles.includes(GLACIER_ROLES.L_SCHILD) ? uebergletscherPool(glacierMass, glacierLocked)
      : glacierRoles.includes(GLACIER_ROLES.VERSCHMELZEN) ? verschmelzenPool(glacierMass, glacierLocked, glacierNF)
      : glacierMass;
    // 2D-Geometrie-Formationen (unique Deck-Passiv, docs §2.7/§9): Block/Kreuz/Linie/Fläche → Burst-Faktor je Feld; Eiswall hebt die Linie.
    const glacierGeo = glacierGeometry(glacierLocked, { eiswall: glacierRoles.includes(GLACIER_ROLES.EISWALL) });
    const glacierO = glacierOpts(glacierRoles);
    // Große Lawine (Legendär): einmaliger Finisher — feuert erst im LETZTEN Durchlauf (Masse maximal angesammelt, kein
    // vorzeitiges Abkalben). Bricht dann alles auf voller Stufe, ungedeckelt & ×GROSSE_LAWINE_MULT (glacier.js).
    const effMaxCycles = state.maxCycles || (difficulty && difficulty.maxCycles) || C.MAX_CYCLES;
    if (glacierRoles.includes(GLACIER_ROLES.L_LAWINE) && !grosseLawineFired && cycle >= effMaxCycles - 1) {
      glacierO.grosseLawine = true; newGrosseLawineFired = true;
    }
    glacierPreNow = precomputeGlacier(snapMass, glacierLocked, { ...glacierO, formFactor: glacierGeo });
    // Anzeige-Basis dieses Durchlaufs ist snapMass — das POOLING (Verschmelzen → Cluster-Ø, Ewiges Schild → Feld-Max
    // +Bonus) ist ein Durchlauf-BEGINN-Buff und soll SOFORT sichtbar sein (alle Gletscher gleich hochgezogen), nicht
    // erst Stich für Stich. Nur der Bruch-ABFALL wird pro Stich verbraucht: `burn` = snapMass − resetMass (immer ≥ 0),
    // je Feld genau EINMAL abgezogen (consumed-Guard). Der Netto-Akkumulator/Score bleibt identisch — nur das Timing/HUD ändert sich.
    newGlacierMass = snapMass.slice();
    const burn = glacierPreNow.resetMass.map((rm, p) => glacierLocked[p] ? ((snapMass[p] || 0) - (rm || 0)) : 0);
    glacierPreNow = { ...glacierPreNow, burn, consumed: {} };
  }
  // Verbrauch für das Feld DIESES Stichs: genau einmal je Feld/Durchlauf den Bruch-Abfall abziehen (Rest-Gewinne bleiben).
  if (glacierActive && glacierPreNow && glacierPreNow.burn && glacierLocked[actualPos] && !(glacierPreNow.consumed && glacierPreNow.consumed[actualPos])) {
    newGlacierMass[actualPos] = Math.max(0, (newGlacierMass[actualPos] || 0) - (glacierPreNow.burn[actualPos] || 0));
    glacierPreNow = { ...glacierPreNow, consumed: { ...(glacierPreNow.consumed || {}), [actualPos]: true } };
  }
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
    // Gebäude-Perks (Architekt): liegt die Position unter einem Gebäude (C_ECKSTEIN) bzw. unter einer
    // vollendeten Struktur (Zeile/Spalte/Diagonale, segFactor>1 → C_ECKSTEIN IV). Ohne Architekt false.
    underBuilding: archPreNow ? !!(archPreNow.cover && archPreNow.cover[actualPos]) : false,
    underStructure: archPreNow ? ((archPreNow.segFactor[actualPos] || 1) > 1) : false,
  };
  // Nachfolger-Bonus (C4 Staffelläufer / C5 Anführer): der Kopf der Queue gilt für DIESE Karte, dann verbraucht.
  const relayBonus = successorQueue[0] || 0;
  successorQueue = successorQueue.slice(1);
  // ---- Feuer-Rework (v0): Vor-Stich-Effekte (Schmelzpunkt-Drip, Glühende Klinge, Feuerwalze, Rückzündung-Wert).
  let heat = state.heat || null;
  let fireValueBonus = 0;
  let meltScore = 0; // Schmelzpunkt-Drip dieses Stichs — im Sieg-Block als Flat ausgezahlt (Ledger-konsistent, s. u.)
  const suncore = fireFlag(skills, "suncore"); // Sonnenkern (L): Win-Condition — brennt am Durchlauf-Ende hohe Hitze dauerhaft in den Deck-Boden (s. u., ~Z.1020); KEIN Konsum-Verstärker mehr [#230 N11]
  // Phönixfeuer: verbrauchte Hitze (value ≤ 0) entzündet 1×/Durchlauf neu (+40 % zurück). Nach jedem Konsum geprüft.
  const reignite = (h) => (fireFlag(skills, "phoenix") && !h.phoenixUsed && h.value <= 0)
    ? { ...h, value: Math.round(C.PHOENIX_REIGNITE * h.max), phoenixUsed: true } : h;
  if (heat && heat.active) {
    // Schmelzpunkt (Konsument, Drip): vor JEDEM Stich −10 % Hitze; der Score zahlt sich im SIEG-Block aus (MELT_PER_HEAT
    // je Punkt) — so bleibt er im Per-Karte-Ledger attribuiert (kein loser score+= außerhalb von gained). [#230 N11: Sonnenkern-Bonus hier entfernt]
    if (hasHeatConsumer(skills, "melt") && heat.value >= C.MELT_COST) {
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
  // Temporärer Wertbonus an card.id (Blitzfänger #93): eine per Ionisierung „gefangene" Karte trägt bis zu ihrem
  // Auftauchen einen temp. Wert. Mit dem Auftauchen verbraucht (unten aus newIceTemp gelöscht).
  const iceValueBonus = (iceTemp[pCard.id] || 0);
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
  // #289: Farballianz-Gruppen einmal je Stich — an ALLE Farb-Verbraucher (Architekt/Farbserie/Farbfokus) gereicht.
  const alliance = allianceGroups(familyTiers, roles);
  // Architekt value-Gebäude (#202, Tragwerk): +temp Wert VOR dem Vergleich (an dieser Position, Bedingung je Familie).
  const architectValue = archPreNow ? architectValueBonus(archPreNow, actualPos, pCard, alliance) : 0;
  // Sturm-Sättigung (Blitz-Rework v0.5, global, nur bei aktivem Blitz; Stand VOR diesem Stich):
  //   Breite → alle Karten +ION_SATURATION_VALUE Wert (bedingt). Tiefe → Überschlag-Graduierung (unten).
  const lightBreadth = !!(lightning && lightning.active && fieldBreadthSaturated(deck));
  const lightDepth   = !!(lightning && lightning.active && fieldDepthSaturated(deck));
  const satValueBonus = lightBreadth ? C.ION_SATURATION_VALUE : 0;
  const glacierBuff = glacierActive ? (glacierBuffActive[pCard.id] || 0) : 0; // Frostbund: Wert-Buff auf gebuffte Nicht-Eis-Nachbarkarte
  // Verdichtung (docs §4 Firn): auf einem Gletscher wird der Gebäude-Wertbonus NICHT ausgespielt, sondern in Masse getankt
  // (unten im Auszahlungs-Block). Hier: im Kampf unterdrücken, damit er nicht doppelt (Wert + Masse) zählt.
  const verdichtung = glacierActive && glacierRoles.includes(GLACIER_ROLES.VERDICHTUNG) && !!glacierLocked[actualPos];
  const architectValueEff = verdichtung ? 0 : architectValue;
  const pValue = effectivePlayerValue(pCard.value, perks, ctx) + familyValueBonus + relayBonus + fireValueBonus + iceValueBonus + anchorPowerBonus + eQuickshotValue + architectValueEff + damascusCombat + satValueBonus + glacierBuff;
  // #226 Großmeister: Gegner-Aufschlag = flacher oppValue + mitwachsender Ramp (+1 Wert alle oppRampEvery Durchläufe),
  // additiv VOR den Debuffs (Frostbiss/Brand kontern ihn → gewollt). Meister/Basis (difficulty=null) → 0, byte-identisch.
  const rampMod = (difficulty && difficulty.oppRampEvery) ? Math.floor(cycle / difficulty.oppRampEvery) : 0;
  const oppValueMod = difficulty ? (difficulty.oppValue || 0) + rampMod : 0;
  // Brand (#93 F3): in DIESEM Durchlauf markierte Gegnerkarten verlieren −Wert (nie < 0); sonst neutral (§12).
  const oValue = Math.max(0, oCard.value + oppValueMod - (brandActive[oCard.id] || 0)); // Brand (Feuer)
  // Der temporäre Wertbonus dieser Karte ist mit ihrem Auftauchen verbraucht (Blitzfänger).
  let newIceTemp = { ...iceTemp };
  delete newIceTemp[pCard.id];
  let newFrozenOppPending = { ...frozenOppPending };  // Einfrieren: in diesem Durchlauf gesetzte Gegner-Marken (für den nächsten)
  let newFrozenOppActive = frozenOppActive;           // Einfrieren: in diesem Durchlauf aktive Marken (Gegnerkarte verliert)
  let newGlacierBuffPending = { ...glacierBuffPending }; // Frostbund: in diesem Durchlauf gebufften Nachbarkarten (für den nächsten)
  let newGlacierBuffActive = glacierBuffActive;         // Frostbund: in diesem Durchlauf aktive Wert-Buffs
  // Feuer-Rework (v0): Asche-Zuwachs / Brand-Marker für den NÄCHSTEN Durchlauf (brandActive wird am Durchlauf-Ende getauscht).
  let newAsh = ash;
  let newBrandPending = { ...brandPending };
  let newBrandActive = brandActive;
  let newForged = forged;
  // Pflanze-Fraktion (v0): Wachstum (immutabel fortgeschrieben) / kolonisierte Gegnerkarten. Grün = card.green (im deck gebacken).
  let newGrowth = growth;
  let newColonized = { ...colonized };
  let newPlantLoss = plantLoss; // Wurzelschlag-Buff (v0.4): Niederlagen-Zähler je card.id (immutabel fortgeschrieben)
  let architectBump = null; // Architekt Meilenstein (#202): Gebäude-id, dessen Sieg-Zähler nach diesem Stich hochzählt

  let won = false, lost = false, tieConverted = false;
  // Eis-Neudesign (Einfrieren): eine eingefrorene Gegnerkarte verliert diesen Stich garantiert (unabhängig vom Wert).
  const oppFrozen = glacierActive && !!frozenOppActive[oCard.id];
  if (oppFrozen) won = true;
  else if (pValue > oValue) won = true;
  else if (pValue < oValue) lost = true;
  // Gleichstand → Sieg nur via B5 „Initiative" (tieArmed).
  else if (tieArmed) { won = true; tieConverted = true; }
  // sonst echter Gleichstand: kein Effekt (§4.1)
  // Patt (#203): eine Niederlage um höchstens PATT_MARGIN Wert zählt stattdessen als Sieg (Winrate-Hebel; harte Bedingung
  // = knapp verloren). Marge = oValue − pValue (≥1 bei Niederlage); der Sieg-Zweig läuft danach normal (Marge dann −PATT..0).
  if (lost && ownsFlag(perks, "patt") && (oValue - pValue) <= C.PATT_MARGIN) { lost = false; won = true; }

  let gained = 0;
  let isCrit = false, critChance = 0, critMultiplier = C.CRIT_BASE_MULT, scoreBeforeCrit = 0, critBonus = 0;
  // Eis-Neudesign: der Gletscher-Bruch profitiert vom VOLLEN Sieg-Stack, WENN die Gletscher-Karte ihren Stich gewinnt
  // (Serie × Perk/Familie × Formation × Nachhall × Kern × Sonnenzorn × Architekt × Crit). Bei Niederlage bleibt es ×1
  // (Basis-Burst). So hat der Rest des Spiels Hebel auf den Gletscher-Score, statt dass nur Gletscher-Skills zählen.
  let glacierWinMult = 1;
  let breakdown = null; // Ergebnis-Aufschlüsselung eines Siegs (§17): exakt die Faktoren der Score-Formel

  if (won) {
    winStreak += 1; wins += 1; cycleWins += 1; // cycleWins: Durchlauf-Sieg-Bilanz für Zinseszins (#203)
    segmentWins += 1; // #189 Volles Haus: Sieg im aktuellen Segment (recentWinCount trug oben den Stand DAVOR)
    if (winStreak > bestStreak) bestStreak = winStreak; // längste Serie des Runs (#8)
    serieStreak = winStreak; // effektive Serie NACH diesem Sieg
    // Eis-Neudesign (docs §2.2 / §4 Firn): Sieg eines Gletschers → +Masse auf seinem Feld (Baseline + Rollen).
    if (glacierActive && glacierLocked[actualPos]) {
      const preMass = newGlacierMass[actualPos] || 0;   // Masse VOR dem Sieg (Schneetreibens 0-Sonderfall)
      let add = GLACIER_WIN_MASS;
      // Anfrieren: Sieg extra, Formations-Sieg zusätzlich obendrauf.
      if (glacierRoles.includes(GLACIER_ROLES.ANFRIEREN)) add += GLACIER_ANFRIEREN_WIN + (hasFormation ? GLACIER_ANFRIEREN_FORM : 0);
      newGlacierMass[actualPos] = preMass + add;
      // Schneetreiben (Verwehung): ADDITIV +SEED aufs Nachbarfeld (der Gletscher behält seine volle Sieg-Masse). Hatte er
      // vor dem Sieg 0 Masse, gibt er stattdessen seine Sieg-Masse ab (Transfer). Deterministisch, bevorzugt offenen Boden, 4-Nb.
      if (glacierRoles.includes(GLACIER_ROLES.SCHNEETREIBEN)) {
        const tgt = glacierDriftTarget(actualPos, glacierLocked);
        if (tgt != null) {
          if (preMass > 0) {
            newGlacierMass[tgt] = (newGlacierMass[tgt] || 0) + GLACIER_SCHNEETREIBEN_SEED;
          } else {
            const give = Math.min(GLACIER_WIN_MASS, newGlacierMass[actualPos] || 0);
            newGlacierMass[actualPos] -= give; newGlacierMass[tgt] = (newGlacierMass[tgt] || 0) + give;
          }
        }
      }
    }
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich.
    // #71 Farbserie: Länge der Serie gewonnener Stiche gleicher Farbe INKL. dieses Siegs. D_SUIT_STREAK IV:
    // ein Farbwechsel HALBIERT die laufende Länge (min 1) statt sie auf 1 zurückzusetzen (suitHalveOnSwitch).
    // Effektive Farbe: pflanzen-grüne Karten (card.green) zählen als „Grün" („G") — auf dem Board grün angezeigt, also
    // auch für die Farbserie dieselbe Farbe (konsistent zu Farbverstärkung). Ein Lauf grüner Karten hält so die Serie.
    const eSuit = pCard.green ? "G" : pCard.suit;
    // #289: verbündete Farben (Farballianz) zählen als dieselbe Farbe → sie SETZEN die Farbserie fort statt sie zu brechen.
    const suitStreak = colorsAllied(eSuit, winSuit, alliance) ? winSuitStreak + 1
                     : (suitHalveOnSwitch ? Math.max(1, Math.floor(winSuitStreak / 2)) : 1);
    // #195: posInCycle = actualPos (Deckposition), NICHT pos (Stich-Index) — muss zum segmentWins-Reset oben
    // (actualPos % SEGMENT_SIZE) passen. Sonst divergieren bei partieller Zeitsegment-Wiederholung Gate (D_FULL_HOUSE
    // liest posInCycle % 5) und Zähler → Volles Haus zahlt am falschen Stich. Einziger scoreFlat-Leser: D_FULL_HOUSE.
    const wctx = { winValue: pValue, margin: pValue - oValue, winStreak: serieStreak, wins, trickNo, posInCycle: actualPos,
                   lastWinValue, // #71: Präzision (Vergleich mit letztem Siegwert)
                   critFollowArmed, weaknessArmed, weaknessBig, // Crit-Historie: Stand VOR diesem Sieg (D14/D16/D_WEAKNESS IV)
                   suitStreak, recentWinCount, // Farbserie / Volles Haus
                   baseValue: pCard.value, // Basiswert der gespielten Karte
                   coverCount: archPreNow ? (archPreNow.coverCount || 0) : 0, // Gebäude-Perk Dichte Bebauung (D_BEBAUUNG): abgedeckte Positionen
                   hasFormation, lastResult, misfireScore }; // V2 §22.6 D: Formation-Sieg / Wechselspiel / Fehlzündungs-Ladung (D15)
    winSuit = eSuit; winSuitStreak = suitStreak; // Farbserie fortschreiben (effektive Farbe: grün = „G")
    // ---- Feuer-Rework (v0): Hitzegewinn (+Weißglut-Überlauf), Feuer-Score, Flächenbrand-Burst, Feuerwalze, Funkenflug, Glutstahl, Brand.
    let fireFlat = meltScore; // Schmelzpunkt-Drip (im Vor-Stich verbrauchte Hitze) zahlt sich hier als Flat aus (nur bei Sieg)
    let fireWhiteWin = 0;     // #270.2: Weißglut-Anteil DIESES Siegs (Rest von fireFlat = Feuer-Grund-Score)
    let fireDividendHeat = 0;  // gehaltene Hitze beim Sieg (vor evtl. Flächenbrand-Verbrauch) → Glutdividende (direkter Score, s. u.)
    if (heat && heat.active) {
      const fmargin = pValue - oValue;
      // Hitzegewinn: Marge (Glut) + Zunder + Feuersturm (Serie) + Rückzündung (Rückstand des letzten Verlusts).
      const gain = heatGainFor(fmargin, skills, { winStreak: serieStreak, lostLast: lastResult === "loss", deficit: heat.lastLossDeficit || 0 });
      const raw = heat.value + gain;
      // Weißglut: der über HEAT_MAX hinaus überlaufende Hitzeanteil wird zu Score (Sonnenzorn ×2).
      const overflow = Math.max(0, raw - heat.max);
      if (overflow > 0) { const wh = whiteHeatScore(overflow, skills, heat.max); fireFlat += wh; fireWhiteWin += wh; } // #270.2: Weißglut-Kanal
      heat = { ...heat, value: Math.min(heat.max, raw), peak: Math.max(heat.peak || 0, Math.min(heat.max, raw)) }; // peak = Sonnenzorn
      fireDividendHeat = heat.value; // gehaltene Hitze NACH diesem Sieg, VOR evtl. Flächenbrand-Verbrauch → Glutdividende
      // Feuer-Score (Grund-Payoff): (Vorsprung−OFFSET)×Basis, ×Verbrennung (≥8/≥12), ×Sonnenzorn (≥80 %). Basis für Funkenflug.
      const fireBaseFlat = fireScoreFor(fmargin, skills, heat.value);
      fireFlat += fireBaseFlat;
      // Flächenbrand (Konsument, Burst): Sieg ab 80 % Hitze verbrennt die GANZE Hitze → +CONFLAG_PER_HEAT Score/Punkt. [#230 N11: Sonnenkern-Bonus hier entfernt]
      if (hasHeatConsumer(skills, "conflagration") && heat.value >= C.CONFLAG_MIN_HEAT) {
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
    // Glutstahl: geschmiedete Siegkarte → +GLUTSTAHL_PER_VALUE Score je geschmiedetem Wert (fließt in die multiplizierte Basis). [#230 N10: war „+20", ist 12]
    if (fireFlag(skills, "glutstahl") && (forged[pCard.id] || 0) > 0) fireFlat += (forged[pCard.id] || 0) * C.GLUTSTAHL_PER_VALUE;
    // Brand (Brandmal): jeder Sieg brandmarkt die geschlagene Gegnerkarte für den NÄCHSTEN Durchlauf (−Wert) + Asche.
    // Lauffeuer: der Brand greift auf einen oppDeck-Nachbarn über. Schmelzofen (≥50 % Hitze): −1 Wert & +1 Asche stärker.
    if (fireFlag(skills, "brandmal")) {
      const hot = !!(heat && heat.active && heat.value >= C.SCHMELZOFEN_MIN_HEAT && fireFlag(skills, "schmelzofen"));
      const brandBonus = hot ? C.SCHMELZOFEN_BRAND_BONUS : 0;
      newBrandPending[oCard.id] = Math.max(newBrandPending[oCard.id] || 0, C.BRAND_VALUE + brandBonus);
      newAsh += C.BRAND_ASH + brandBonus; brandTotal += 1; // #270.2: Motor-Zähler „gebrandmarkte Gegnerkarten"
      if (fireFlag(skills, "lauffeuer")) {
        const oi = oppOrder[actualPos];                     // Index der Gegnerkarte im oppDeck-Array
        const nb = oi + 1 < oppDeck.length ? oi + 1 : oi - 1; // Deck-Nachbar (kein Wrap; Rand → linker Nachbar)
        if (nb >= 0) {
          newBrandPending[oppDeck[nb].id] = Math.max(newBrandPending[oppDeck[nb].id] || 0, C.BRAND_SPREAD_VALUE + brandBonus);
          newAsh += C.BRAND_ASH + brandBonus; brandTotal += 1; // #270.2: Lauffeuer-Übergriff zählt mit
        }
      }
    }
    // ---- Pflanze-Fraktion (v0): Wachstum (Sieg → +1), Reife-Recolor, Wurzeln (Score/Wert), Aussaat/Ranken (Breite/Grün),
    //      Blüte/Photosynthese/Blätterdach (Grün-Payoff), Ausläufer (Kolonisieren/Ernten). Grün = card.green.
    let plantFlat = 0;
    let plantFormMult = 1;
    let plantDirect = 0; // Pflanze-Legendär-Reshape: DIREKTe, post-stack, gedeckelte Dividende aus den Fluten (unten zu `gained`)
    if ((activeArchetypes || []).includes("plant")) {
      const inFormation = positionHasFormation(posForm);
      const plantCommit = commitScale(plantSkillCount(skills)); // Bekenntnis-Skalierung (cross-health) für die post-stack Direkt-Dividenden (#270.2 + #Ceiling)
      // #288 „Trimmen": dauerhafter Multiplikator auf Wurzel- & Blüten-Score, je ersetztem Wachstums-Skill höher (gedeckelt).
      const trimMult = 1 + Math.min((trimCount || 0) * C.TRIM_STEP, C.TRIM_CAP);
      // Wachstum: je Sieg +Zuwachs, GEGATET an die Pflanzen-Skill-Anzahl (Anti-Splash, v0.3): min(1, PflanzenSkills / SKILL_REF).
      // 1 Splash-Skill = 1/3 Speed, volle +1/Sieg erst ab SKILL_REF Skills → hohes Wachstum verlangt echtes Deck-Commitment.
      const prevG = newGrowth[pCard.id] || 0;
      const growInc = Math.min(1, C.PLANT_GROWTH_SKILL_REF > 0 ? plantSkillCount(skills) / C.PLANT_GROWTH_SKILL_REF : 1);
      const g = prevG + growInc;
      newGrowth = { ...newGrowth, [pCard.id]: g };
      growthTotal += growInc; // #270: Motor-Zähler „Gewachsen" — Lauf-Summe des zugewachsenen Wachstums
      const cardGreen = pCard.green || growthRipe(g);
      if (growthRipe(g) && !pCard.green) deck = deck.map((c) => (c.id === pCard.id ? { ...c, green: true } : c));
      // Ernte: geschlagene Gegnerkarte kolonisiert? → +Wachstum; Erntedank (reif), Rhizom (Nachbar).
      if (newColonized[oCard.id]) {
        newGrowth = { ...newGrowth, [pCard.id]: (newGrowth[pCard.id] || 0) + C.AUSLAEUFER_HARVEST }; growthTotal += C.AUSLAEUFER_HARVEST; // #270
        if (hasErntedank(skills) && cardGreen) { plantFlat += C.ERNTEDANK_SCORE; plantHarvest += C.ERNTEDANK_SCORE; } // #270.2: Ernte-Score-Kanal
        if (hasRhizom(skills)) { const oi = oppOrder[actualPos], nb = oi + 1 < oppDeck.length ? oi + 1 : oi - 1;
          if (nb >= 0 && newColonized[oppDeck[nb].id]) { newGrowth = { ...newGrowth, [pCard.id]: (newGrowth[pCard.id] || 0) + C.AUSLAEUFER_HARVEST }; growthTotal += C.AUSLAEUFER_HARVEST; } } // #270
      }
      if (cardGreen) {
        // Wurzeltiefe: Flat-Score je Sieg (Pfahlwurzel ×2 in Formation) + Jahresringe (je 10 Wachstum). Mutterbaum streut aufs Segment.
        if (hasWurzeltiefe(skills)) {
          let root = C.WURZELTIEFE_SCORE * (hasPfahlwurzel(skills) && inFormation ? C.PFAHLWURZEL_MULT : 1);
          if (hasJahresringe(skills)) root += Math.floor(g / C.JAHRESRINGE_PER_GROWTH) * C.JAHRESRINGE_SCORE;
          // Feldtiefe (Buff): Bonus je grünem Sieg ∝ √(GESAMTWACHSTUM des Feldes) — abnehmender Ertrag + Deckel gegen Runaway.
          let fieldGrowth = 0; for (const gid in newGrowth) fieldGrowth += newGrowth[gid];
          if (fieldGrowth > 0) root += Math.min(C.WURZELTIEFE_FIELD_CAP, Math.round(C.WURZELTIEFE_FIELD_K * Math.sqrt(fieldGrowth)));
          root = Math.round(root * trimMult); // #288 Trimmen: Wurzel-Score-Multiplikator
          plantFlat += root; plantRoot += root; // #270.2: Wurzel-Score-Kanal
          // #Ceiling Wurzel/TIEFE: superlinear (dreieckig) in der Wachstums-Tiefe der Siegkarte ÜBER dem Wert-Deckel —
          // post-stack (plantDirect), gedeckelt, bekenntnis-skaliert (+ Trimm-Multiplikator #288). Zündet nur bei tiefen Bäumen → reines Ceiling.
          const needRoot = Math.max(0, C.PLANT_VALUE_CAP - pCard.value) * C.WURZELSCHLAG_PER_GROWTH;
          const depth = Math.min(Math.floor(g - needRoot), C.PLANT_ROOT_DEEP_CAP);
          if (depth > 0) { const d = (depth * (depth + 1) / 2) * C.PLANT_ROOT_DEEP_K * plantCommit * trimMult; plantDirect += d; plantRoot += d; }
          if (hasMutterbaum(skills) && g >= Math.max(1, ...Object.values(newGrowth))) { plantFlat += root; plantRoot += root; } // Mutterbaum (v0-Näherung): Segment-Streuung
        }
        // Fraktions-Passive (Mono): grüne Karte leitet permanenten Wert aus Wachstum ab (+1 je N Wachstum, bis Deckel).
        // Wachstum wird NICHT verbraucht (speist parallel Jahresringe/Feldtiefe/Legendäre). Nur solange Mono-Pflanze.
        if (plantPassiveActive(skills) && Math.floor(g / C.WURZELSCHLAG_PER_GROWTH) > Math.floor(prevG / C.WURZELSCHLAG_PER_GROWTH) && pCard.value < C.PLANT_VALUE_CAP)
          deck = deck.map((c) => (c.id === pCard.id ? { ...c, value: Math.min(C.PLANT_VALUE_CAP, c.value + 1) } : c));
        // Kernholz (L4): erntet den aufgebauten Wert — +Score je Kartenwert-Punkt über dem Startwert (baseRank). Nur grün.
        if (hasKernholz(skills) && cardGreen) {
          const over = Math.max(0, pCard.value - (pCard.baseRank || 0));
          if (over > 0) { const kh = over * C.KERNHOLZ_SCORE_PER_VALUE; plantFlat += kh; plantRoot += kh; }
        }
        // Aussaat: beide Nachbarn +1 Wachstum (Flugsamen: grüne überspringen, nächste graue säen).
        if (hasAussaat(skills)) {
          for (const dir of [-1, 1]) {
            let nb = actualPos + dir;
            if (hasFlugsamen(skills)) while (nb >= 0 && nb < playerOrder.length && deck[playerOrder[nb]].green) nb += dir;
            if (nb >= 0 && nb < playerOrder.length) { const nid = deck[playerOrder[nb]].id; newGrowth = { ...newGrowth, [nid]: (newGrowth[nid] || 0) + C.AUSSAAT_GROWTH }; growthTotal += C.AUSSAAT_GROWTH; } // #270
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
            // Überwucherung verdoppelt die Blüte NUR, wenn das Feld genug grün ist (≥66 %, mit Ewiger Frühling ≥25 %) —
            // gleich gegatet wie der Farbblock-+0,20-Teil in formations.js (Text/Glossar SK_PLANT_14). [#228 C1]
            const greenFieldRatio = deck.length > 0 ? greenCount(deck) / deck.length : 0;
            const uebThresh = hasEwigerFruehling(skills) ? C.EWIGER_FRUEHLING_FIELD : C.UEBERWUCHERUNG_FIELD;
            if (hasUeberwucherung(skills) && greenFieldRatio >= uebThresh) b *= 2;
            b = Math.round(b * trimMult); // #288 Trimmen: Blüten-Score-Multiplikator
            plantFlat += b; plantBloom += b; // #270.2: Blüten-Score-Kanal
          }
        }
        // #Ceiling Blüte/BREITE: superlinear (dreieckig) im VOLLEN grünen Feld — nur wenn das Feld überwuchert ist (≥ Schwelle
        // grün; Ewiger Frühling senkt sie). Post-stack (plantDirect), gedeckelt, bekenntnis-skaliert → reines Ceiling für das
        // committed all-green Board, Floor unberührt.
        if (hasBluete(skills) && deck.length > 0) {
          const thr = hasEwigerFruehling(skills) ? C.EWIGER_FRUEHLING_FIELD : C.UEBERWUCHERUNG_FIELD;
          const gc = greenCount(deck);
          if (gc / deck.length >= thr) {
            const m = Math.min(gc, C.PLANT_BLOOM_FIELD_CAP);
            const d = (m * (m + 1) / 2) * C.PLANT_BLOOM_FIELD_K * plantCommit * trimMult; plantDirect += d; plantBloom += d;
          }
        }
        // Photosynthese: grüne Karte in Formation → ×PHOTOSYNTHESE_MULT (Formations-Faktor). [#230 N9: war „×1,15", ist 1,08]
        if (hasPhotosynthese(skills) && inFormation) plantFormMult *= C.PHOTOSYNTHESE_MULT;
        // Baumreihe (Legendär): voll ausgewachsene grüne Karten (Wert ≥ Deckel) zählen POSITIONSFREI als EINE gemeinsame
        // Wiederholung — je solcher Karte auf dem Brett ein Faktor auf die Stiche DIESER Karte (gedeckelt; Position egal).
        if (hasBaumreihe(skills) && pCard.green && pCard.value >= C.PLANT_VALUE_CAP) {
          let n = 0; for (const c of deck) if (c.green && c.value >= C.PLANT_VALUE_CAP) n++;
          if (n >= 2) plantFormMult *= Math.min(C.BAUMREIHE_CAP, C.BAUMREIHE_BASE + (n - 2) * C.BAUMREIHE_STEP);
        }
        // Blätterdach: grüner Farbblock ab BLAETTERDACH_MIN Karten → +Score je Karte IM BLOCK (echte Lauflänge des
        // Farbblocks an der Siegposition, nicht die deckweite Grünzahl). Grün = eine gemeinsame Farbe „G" → der Lauf an
        // einer grünen Position besteht aus grünen Karten. Analog zur Blüte, die nur das Segment zählt. [#228 C2]
        const fbEntry = (posForm.formations || []).find((f) => f.type === "farbblock");
        const fbLen = fbEntry ? (fbEntry.len || 0) : 0;
        if (hasBlaetterdach(skills) && fbLen >= C.BLAETTERDACH_MIN) { const bd = Math.round(C.BLAETTERDACH_SCORE * Math.min(fbLen, C.BLAETTERDACH_CARD_CAP) * trimMult); plantFlat += bd; plantRoot += bd; } // #270.2: Blätterdach → Wurzel-Kanal (Feld-Score) · #288 Trimm-Mult
        // Ausläufer: die niedrigste noch nicht kolonisierte Gegnerkarte kolonisieren.
        if (hasAuslaeufer(skills)) {
          let lowId = null, lowV = Infinity;
          for (const c of oppDeck) if (!newColonized[c.id] && c.value < lowV) { lowV = c.value; lowId = c.id; }
          if (lowId != null) newColonized = { ...newColonized, [lowId]: true };
        }
        // ---- Pflanze-Legendär-Reshape (2026-07-30): DIREKTE Dividende aus den verschwendeten FLUTEN je GRÜNEM Sieg —
        //      am Multiplikator-Stack VORBEI (unten zu `gained`), hart gedeckelt (Plateau, kein Runaway), bekenntnis-
        //      skaliert (plantSkillCount/SKILL_SLOTS = cross-health). Nur Legendär-Halter → generisches Pflanze unberührt.
        if (hasWeltenbaum(skills) || hasMutterbaum(skills) || hasEwigerFruehling(skills)) {
          // plantCommit ist oben (Plant-Section-Start) gehoben.
          // Überlauf-Wachstum = Wachstum ÜBER dem, was Wurzelschlag zum Wert-Deckel braucht (verschwendet, „alter Wald").
          if (hasWeltenbaum(skills) || hasMutterbaum(skills)) {
            let sumOv = 0, maxOv = 0;
            for (const c of deck) if (c.green) {
              const need = Math.max(0, C.PLANT_VALUE_CAP - c.value) * C.WURZELSCHLAG_PER_GROWTH;
              const ov = (newGrowth[c.id] || 0) - need;
              if (ov > 0) { sumOv += ov; if (ov > maxOv) maxOv = ov; }
            }
            // Weltenbaum (BREITE): die SUMME des Überlauf-Wachstums über den ganzen Wald zahlt je grünem Sieg.
            if (hasWeltenbaum(skills)) { const d = Math.min(sumOv, C.WELTENBAUM_OVERFLOW_CAP) * C.WELTENBAUM_DIRECT * plantCommit; plantDirect += d; plantRoot += d; } // #270.2: alter Wald → Wurzel-Kanal
            // Mutterbaum (TIEFE): der EINE tiefste Baum (max Überlauf) zahlt je grünem Sieg (Konzentration).
            if (hasMutterbaum(skills)) { const d = Math.min(maxOv, C.MUTTERBAUM_OVERFLOW_CAP) * C.MUTTERBAUM_DIRECT * plantCommit; plantDirect += d; plantRoot += d; } // #270.2: Wurzel-Kanal
          }
          // Ewiger Frühling (GRÜN-FELD): das ewige grüne Feld zahlt je grünem Sieg ∝ #grüne Karten; bei VOLL grünem Feld doppelt.
          if (hasEwigerFruehling(skills)) {
            const gc = greenCount(deck);
            const fullMult = (deck.length > 0 && gc === deck.length) ? C.EWIGER_FRUEHLING_FULLGREEN_MULT : 1;
            const d = Math.min(gc, C.EWIGER_FRUEHLING_FIELD_CAP) * C.EWIGER_FRUEHLING_DIRECT * fullMult * plantCommit; plantDirect += d; plantRoot += d; // #270.2: Grün-Feld → Wurzel-Kanal
          }
        }
      }
    }
    // Crit ZUERST bestimmen — die Blitz-Crit-Flats (scoreFlatOnCrit) müssen in die multiplizierte Basis.
    // Der Crit-Wurf verbraucht rng nur, wenn wirklich gewürfelt wird → rng-Reihenfolge unverändert (kein Drift).
    // Blitz-Crit-Basis (Abschnitt 2a) wird additiv zugerechnet, unabhängig von L5-critChanceMult.
    // #267: die Crit-Chance kommt jetzt aus der Perk-FAMILIE „Präzision" (RNG-gegatet, Stat-Ersatz) statt aus dem Stat.
    // Karten-Kontext für die konditionalen Generatoren: Kartenwert / Kartenfarbe / #aktive Formationen der Siegposition /
    // gewählte Farben (Farbfokus, aus roles). Roh-Crit-Chance (ungeklemmt): Perk-Basis + Präzision + Blitz + Kritanker.
    const critFamCtx = { winValue: pValue, suit: pCard.green ? "G" : pCard.suit, formCount: activeFormationCount(posForm), focusSuits: (roles && roles.P_COLORFOCUS) || [], alliance }; // #289: grün-bewusste Suit + Farballianz für Farbfokus
    const rawCrit = critChanceRawFor(perks, wctx) + familyCritChanceRaw(familyTiers, critFamCtx) + lightningCritRaw(lightning, skills, serieStreak)
                    + (lightning?.active ? ionCritChance(deck) : 0) // #271: feldweiter Ionisierungs-Crit (Breite); Überschuss >100 % → Überschlag→Ladung
                    + (anchorType === "crit" ? (aParam("crit") || 0) : 0); // Kritanker (§4.2, Stärke = Stufe)
    critChance = Math.min(1, Math.max(0, rawCrit));             // Anzeige/normaler Wurf (geklemmt)
    // Crit-Ctx trägt rawCrit — von D-Crit-Flats (D19 Überschusskrit) UND L6 „Raserei" (critMultBonus, #115) gebraucht.
    const critCtx = { ...wctx, rawCrit };
    // Basis 1,5 + Präzision „Wucht" (familyCritMult) + L6-Überschuss + Blitz + Donnergott + Durchschlag (dauerhaft)
    // + Entladung (Crit-Mult-Momentum je Verbrauch, dauerhaft, v0.5). #267: der Crit-Mult-Stat ist weg.
    critMultiplier = critMultiplierFor(perks, critCtx) + familyCritMult(familyTiers) + lightningCritMult(skills)
                   + (lightning?.durchschlagMult || 0)
                   + (lightning?.entladungMult || 0);
    // Überschlag-Graduierung (v0.5): bei Voll-TIEFE geht der Crit-Überschuss (>100 %) in Crit-Multiplikator statt in Ladung.
    if (hasUeberschlag(skills) && lightDepth && rawCrit > 1) critMultiplier += (rawCrit - 1) * C.UEBERSCHLAG_EXCESS_TO_MULT;
    isCrit = rollCrit(critChance, forceCrit, rngAtOr(cycle, "crit", pos)) && !reducedRepeat; // #205 Glückslandschaft: fester Wurf je (cycle,pos); forceCrit = L10; reducedRepeat = Zeitsegment III
    // Score (globale Formel): additive Boni — inkl. Crit-only-Flats (Blitzableiter +50) — fließen in die BASIS
    // und werden mitmultipliziert: (SCORE_PER_WIN + Σ scoreFlat [+ Σ scoreFlatOnCrit bei Crit])
    // × Basis-Serien-Mult (#39, immer) × Perk-scoreMult, DANN Crit-Faktor.
    // Ionisierung: Score der gespielten Karte (Stapel VOR dem Zuwachs).
    // (critCtx mit rawCrit ist oben — vor critMultiplier — gebildet; D6/D7/D8/D11/D15/D19 + Blitzableiter nutzen ihn.)
    // Entladung (v0.5): dauerhaftes Crit-Mult-Momentum (lightning.entladungMult, oben in critMultiplier) — kein Armieren mehr.
    // Architekt score-Gebäude (#202, Handelsbauten): Flat in die multiplizierte Basis; Mult (Schatzkammer/Struktur) als
    // eigener Faktor. Meilenstein-Zähler (bump) wird nach dem Stich fortgeschrieben. Bedingungen: Crit/Farbe/Serie/Ziel.
    const architectScoreRes = archPreNow
      ? architectScore(archPreNow, actualPos, { isCrit, serieStreak, suit: pCard.green ? "G" : pCard.suit }, (architect && architect.winCounters) || {}, alliance) // #289: grün → „G" + Farballianz (Zunfthaus)
      : { flat: 0, mult: 1, bump: null };
    architectBump = architectScoreRes.bump;
    const architectMult = architectScoreRes.mult;
    // Serien-Flat (Reihenhaus): läuft am globalen Serien-Mult VORBEI (kein Doppel-Dip — die Serie skaliert diesen Flat
    // bereits im Gebäude selbst). Formation/Perk/Crit gelten weiter (unten in den Stack addiert, nicht in scoreBase).
    const architectStreakFlat = architectScoreRes.streakFlat || 0;
    // Familien-Score-Flats (Rarität-Umbau #167, Kat. D) laufen ADDITIV neben den flachen Perk-Flats: nur die
    // gehaltene Familien-Stufe zählt (activeTierDefs) → kein Doppel-Trigger über Stufen (Spec §2.3/§9).
    const scoreBase = C.SCORE_PER_WIN + sumHook(perks, "scoreFlat", wctx) + familySumHook(familyTiers, "scoreFlat", wctx)
                      + (isCrit ? sumHook(perks, "scoreFlatOnCrit", critCtx) + skillSum(skills, "scoreFlatOnCrit", critCtx)
                                  + familySumHook(familyTiers, "scoreFlatOnCrit", critCtx)
                                  + (critFollowArmed ? critFollowCritBonus : 0) // D_CRIT_FOLLOW IV: Crit-Folgesieg, der selbst Crit ist
                                  + (anchorType === "crit" ? (aParam("critScore") || 0) : 0) : 0) // Kritanker IV: Crit dort +250 Score
                      + ionScoreFor(pCard) + fireFlat + plantFlat
                      + (anchorType === "score" ? (aParam("score") || 0) : 0) // Punkteanker (§4.2, Stärke = Stufe)
                      + (anchorType === "power" ? (aParam("winScore") || 0) : 0) // Kraftanker IV: Sieg dort +100 Score
                      + architectScoreRes.flat // Architekt Handelsbauten (#202): Flat-Score, s. o.
                      + interplayStored; // D_INTERPLAY IV: der in Niederlagen gebankte Score wird mit diesem Sieg als Flat ausgezahlt
    // #270: Fraktions-Flat-Anteile zum Ertrag (Roh-Score VOR dem Multiplikator-Stack). Blitz EIN Kanal; Feuer in
    // Grund/Weißglut gespalten (Pflanze-Kanäle Wurzel/Blüte/Ernte wurden schon an ihren Quellen oben akkumuliert).
    lightYield += ionScoreFor(pCard);
    fireWhite += fireWhiteWin; fireBase += fireFlat - fireWhiteWin;
    // Score-Stapelung (§15/§22.7): Basis × Serie(#39) × Perk-scoreMult × Serien-Stat × Formations-Multiplikator
    // × Formations-Stat, DANN Crit. Zu benannten Faktoren gruppiert (identisches Produkt) → eine Quelle für
    // Score UND Ergebnis-Aufschlüsselung (§17), kein Drift.
    const flats = scoreBase - C.SCORE_PER_WIN;                                         // additive Boni (Perk-/Crit-Flats, Ion, L5-Jackpot)
    const streakMult = streakBaseMult(serieStreak); // Serie (#39). #267: der Serien-Stat-Booster ist weg — nur noch das Basis-System.
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
    // (#267: der Formations-Stat-Booster obendrauf ist weg — Formations-Builds skalieren über Perks/Familien statt Stat.)
    // Eis-Ceiling-Hebel: dichte Formations-Überlappung (formBaseMult) ist der EINZIGE Eis-Ceiling-Treiber. Weicher
    // Deckel NUR für Frostkarten, NUR über der Schwelle → Median-Frost-Siege (formBase < Schwelle) & Nicht-Eis unberührt.
    const formBaseEff = formBaseMult;
    // Brennpunkt (#203, Formations-Tiefe): Sieg in ≥ BRENNPUNKT_MIN_FORMS gleichzeitigen Formationen → ×BRENNPUNKT_MULT.
    const brennpunktMult = (ownsFlag(perks, "brennpunkt") && activeFormationCount(posForm) >= C.BRENNPUNKT_MIN_FORMS) ? C.BRENNPUNKT_MULT : 1;
    // Sammler (#203, Formationsvielfalt): +SAMMLER_STEP je distinct Formationsart, die diesen Durchlauf SCHON gesammelt
    // wurde (Stand VOR diesem Sieg → wächst über den Durchlauf; „für den restlichen Durchlauf"), max SAMMLER_MAX.
    const sammlerMult = ownsFlag(perks, "sammler") ? 1 + C.SAMMLER_STEP * Math.min(sammlerTypes.length, C.SAMMLER_MAX) : 1;
    const formMult = formBaseEff * plantFormMult * brennpunktMult * sammlerMult; // + Photosynthese (plantFormMult) + Brennpunkt/Sammler (#203)
    // Sonnenzorn (L): dauerhafter Score-Multiplikator ∝ HÖCHSTER je gehaltener Hitze (heat.peak) — auf den GESAMTEN Sieg-Score
    // (nicht nur fireFlat), weil ein Halte-Build über Wert/Formationen gewinnt, nicht über Feuer-Score.
    const sunwrathMult = (fireFlag(skills, "sunwrath") && heat && heat.active) ? (1 + (heat.peak || 0) * C.SUNWRATH_PEAK_STEP) : 1;
    // architectMult (#202, Architekt-Score-Gebäude: Struktur/Schatzkammer) läuft als eigener Faktor am Ende des Stacks.
    // #Pool Batch 4 (gamble/Risiko): Boden — der Architekt-Abzug (negativer Flat) darf den Stich höchstens auf 0 drücken,
    // nie ins Minus (sonst kippen die nachgelagerten Multiplikatoren). Bei Basis 400 praktisch immer ein No-op.
    // Serien-Flat (Reihenhaus) wird NEBEN der serien-multiplizierten Basis addiert → er bekommt Perk/Formation/Crit,
    // aber NICHT den globalen Serien-Mult (kein Doppel-Dip). Rest des Stacks unverändert.
    const streakMuldBase = Math.max(0, scoreBase) * streakMult;
    scoreBeforeCrit = (streakMuldBase + architectStreakFlat) * perkMult * formMult * afterglowMult * coreMult * sunwrathMult * architectMult;
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    // Eis: derselbe multiplikative Stack (ohne additive Flats) skaliert auch den Gletscher-Bruch dieses Stichs (unten).
    glacierWinMult = streakMult * perkMult * formMult * afterglowMult * coreMult * sunwrathMult * architectMult * (isCrit ? critMultiplier : 1);
    // SIM-Sättigungshebel (Default aus, K=0 → No-op): weicher Deckel auf den Score je Sieg. Greift NACH der
    // Crit-Multiplikation und VOR dem Verbuchen, verbraucht kein rng → Determinismus/rng-Reihenfolge unverändert.
    // [#229 T5] WIN_SOFTCAP ist ein Sim-Hook (Default 0). Ist er aktiv, wird `gained` geklemmt, die Einzelfaktoren im
    // breakdown (unten) bleiben aber ungekappt → base×Faktoren ≠ total, und critBonus kann negativ werden. Reine Sim-Diagnose.
    if (C.WIN_SOFTCAP > 0 && gained > C.WIN_SOFTCAP) gained = C.WIN_SOFTCAP + (gained - C.WIN_SOFTCAP) * C.WIN_SOFTCAP_SLOPE;
    critBonus = gained - scoreBeforeCrit;
    // #161 FB-2: additiver Score-Anteil der Formations-Faktoren (echte Formationen + Formations-Stat + Nachhall + Kern).
    // Auf dem MULTIPLIZIERTEN Score, VOR der Glutdividende (die läuft am Stack vorbei und zählt nicht als Formations-Score).
    // [#229 T4] Bekannte Attributions-Ungenauigkeit (nur Anzeige, kein Gameplay): formMult bündelt auch
    // plantFormMult/brennpunktMult/sammlerMult → dieser Anteil wird hier der Formation zugeschlagen statt seinen echten Quellen.
    const formFactorTotal = formMult * afterglowMult * coreMult;
    if (formFactorTotal > 1) formationScore += gained * (1 - 1 / formFactorTotal);
    // #251: Serien-Anteil — der Serien-Multiplikator als Faktor-Anteil an `gained` (analog formationScore; Näherung, da die Faktoren multiplikativ ineinandergreifen).
    // Nur der serien-multiplizierte Teil zählt: der Reihenhaus-streakFlat läuft am Serien-Mult vorbei (kein Doppel-Dip) → sein Anteil bleibt hier ausgeklammert.
    const streakStackTotal = streakMuldBase + architectStreakFlat;
    if (streakMult > 1 && streakStackTotal > 0) streakScore += gained * (streakMuldBase / streakStackTotal) * (1 - 1 / streakMult);
    // #UI: Gebäude-Score-Anteil — analog zu formationScore. Architekt-Score-Mult (Struktur/Schatzkammer) als
    // Faktor-Anteil an `gained`, plus der Handelsbauten-Flat mit seinem Beitrag OHNE den (separat gezählten)
    // architectMult → kein Doppelzählen. Nur Architekt-Score-Bauten; der Wert-Bonus (Basis) bleibt unattribuiert.
    if (architectMult > 1) buildingScore += gained * (1 - 1 / architectMult);
    if (architectScoreRes.flat > 0 && scoreBase > 0) buildingScore += (gained / architectMult) * (architectScoreRes.flat / scoreBase);
    // Serien-Flat (Reihenhaus) läuft am Serien-Mult vorbei → sein gained-Anteil = streakFlat / (serien-mult. Basis + streakFlat), analog zum flachen Handelsbau-Flat (architectMult separat gezählt).
    if (architectStreakFlat > 0 && streakStackTotal > 0) buildingScore += (gained / architectMult) * (architectStreakFlat / streakStackTotal);
    // Glutdividende (Feuer-Rework, Floor-Hebel): DIREKTER Score je Feuer-Sieg (∝ gehaltener Hitze, gedeckelt bei
    // FIRE_DIVIDEND_HEAT_CAP), NICHT durch Serie/Crit/Form multipliziert → flach NACH dem Stack. Hebt den Median
    // (kleine Mults) relativ stärker als das Ceiling (große Mults) = Feuers fehlende „Immer-an-Engine". Skaliert mit
    // dem FEUER-BEKENNTNIS (Anteil Feuer-Skills an den Slots), damit ein 2-Skill-Splash die Dividende nicht in
    // High-Winrate-Kombis (Eis/Pflanze) trägt → hält Spezialisieren ≈ Mischen (cross-health).
    const fireCommit = commitScale(activeFireCount(skills));
    let fireDirect = C.FIRE_HEAT_DIVIDEND > 0 && fireDividendHeat > 0 && fireCommit > 0
      ? Math.min(fireDividendHeat, C.FIRE_DIVIDEND_HEAT_CAP) * C.FIRE_HEAT_DIVIDEND * fireCommit : 0;
    // Damaststahl (L): DIREKTER Score je Sieg ∝ GESAMTEM geschmiedeten Wert im Deck (am Stack vorbei) — eine „Damast-
    // Dividende", die die Schmiede-Investition bei JEDEM Sieg auszahlt (nicht nur wenn die geschmiedete Karte gewinnt).
    if (fireFlag(skills, "damascus")) {
      const totalForged = Object.values(forged).reduce((a, b) => a + b, 0);
      if (totalForged > 0) fireDirect += totalForged * C.DAMASCUS_DIRECT;
    }
    // (#268: die per-Sieg-Asche-Dividende ist entfernt — ungenutzte Asche wird jetzt am Durchlauf-Ende über den
    //  Weißglut-Überlauf vollständig in Score verbrannt, statt als kleiner Dauer-Drip je Sieg zu tropfen.)
    // Blitz-Legendär-Reshape (2026-07-30): DIREKTE Dividende aus dem GESÄTTIGTEN Ionisierungsfeld. Die Ionisierung flutet
    // (blitz-economy.mjs: alle Karten @Deckel 5, ~ganzes Deck ab Cycle 20) → „mehr Ionis."-Legendäre waren tot (1,01×/0,90×).
    // Sie lesen jetzt den BESTAND des Feldes (Stand VOR dem +1 der Siegkarte) und zahlen je IONISIERTEM Sieg DIREKT — am
    // Multiplikator-Stack VORBEI (floor-clean/ceiling-safe), hart gedeckelt (Plateau, kein Runaway), bekenntnis-skaliert
    // (activeLightningCount/SKILL_SLOTS = cross-health). Nur Legendär-Halter → generisches Blitz (ION_SCORE_PER_STACK) unberührt.
    let lightDirect = 0;
    if ((pCard.ionStacks || 0) > 0 && (hasAreaIonize(skills) || hasDoubleDischarge(skills))) {
      const lightCommit = commitScale(activeLightningCount(skills));
      let nIon = 0, sumIon = 0;                                        // EIN Scan: Breite (# ionisierte Karten) + Energie (Σ Stapel)
      for (const c of deck) { const st = c.ionStacks || 0; if (st > 0) { nIon++; sumIon += st; } }
      // Flächenionisation (Sturmzelle, BREITE): je breiter das ionisierte Feld, desto größer jeder Treffer.
      if (hasAreaIonize(skills)) lightDirect += Math.min(nIon, C.FLAECHENION_FIELD_CAP) * C.FLAECHENION_DIRECT * lightCommit;
      // Doppelentladung (endloser Sturm, ENERGIE): jeder Treffer detoniert die gesamte Ladung des Feldes (Σ Stapel).
      if (hasDoubleDischarge(skills)) lightDirect += Math.min(sumIon, C.DOPPELENT_FIELD_CAP) * C.DOPPELENT_DIRECT * lightCommit;
    }
    // Kurzschluss (Rework): eine VOLLE (5) Siegkarte „kurzschließt" bei JEDEM Sieg → Direkt-Score-Burst (post-stack),
    // OHNE die Stapel zu opfern. Wiederkehrender Payoff fürs Maxen (Stapel bleiben → weiter Flat-Score + Feld-Crit #271).
    if (hasKurzschluss(skills) && (pCard.ionStacks || 0) >= C.ION_MAX_STACKS) lightDirect += C.KURZSCHLUSS_SCORE;
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
    // Feuer-Ziel-Hebel (#202): die Architekt-STRUKTUR (volle Zeile/Spalte/Diagonale) multipliziert AUCH die Glutdividende.
    // Ohne das umgeht Feuers bewusst mult-freier Floor die Architekt-Geometrie → Strukturen heben Feuer kaum. Nur der reine
    // Struktur-Faktor (segFactor), NICHT Schatzkammer/Score-Bauten.
    const archStructMult = archPreNow ? (archPreNow.segFactor[actualPos] || 1) : 1;
    const fireStructMult = 1 + (archStructMult - 1) * C.FIRE_STRUCT_DIVIDEND_AMP; // Struktur-Hebel auf die Dividende verstärkt (Feuer-isoliert)
    const fireDirectApplied = fireDirect * fireStructMult;
    gained += fireDirectApplied + lightDirect + plantDirect + perkDirect;
    score += gained;
    // #270: post-stack Direkt-Dividenden zum Fraktions-Ertrag (die Flat-Anteile kamen bei scoreBase oben dazu). Statischer
    // Ladungs-Konsum-Score (unten, +CONSUME_SCORE) und der Weißglut-Überlauf-Burst (Durchlauf-Ende) kommen dort dazu.
    // Feuer-Glutdividende → Grund-Kanal; Pflanze-Legendär-Direkt wurde schon oben in Wurzel/Ernte gebucht.
    fireBase += fireDirectApplied; lightYield += lightDirect;
    breakdown = { base: C.SCORE_PER_WIN, flats, streakMult, perkMult, formMult, formBase: formBaseEff, afterglowMult, coreMult, architectMult, critMult: isCrit ? critMultiplier : 1, fireDirect, lightDirect, plantDirect, perkDirect, total: gained };
    // Blitz-Rework (v0): Ladungsgewinn — Blitzableiter (Crit +1) · Statische Aufladung (Nicht-Crit-Sieg +1) ·
    // Kaskade Überspannung (Crit auf/neben Ionis.) · Überschlag (Crit-Chance-Überschuss) · Dauerstrom (Serie).
    const ionizedCard = (pCard.ionStacks || 0) > 0;
    if (lightning && lightning.active) {
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
      if (hasUeberschlag(skills) && rawCrit > 1 && !lightDepth) gainedCharge += Math.floor((rawCrit - 1) * C.UEBERSCHLAG_PER); // vor Tiefe → Ladung; ab Tiefe → Crit-Mult (Graduierung v0.5)
      if (hasDauerstrom(skills)) gainedCharge += Math.min(Math.floor(serieStreak / C.DAUERSTROM_PER_STREAK), C.DAUERSTROM_MAX);
      if (gainedCharge > 0) {
        lightning = addCharge(lightning, gainedCharge);
        // Volle Ladung → Konsument (Ionisierung; max 1, im Reducer erzwungen) auslösen; Reaktoren laufen bei JEDEM Verbrauch.
        // Donnergott-Turbo (v0.5): löst schon bei DONNERGOTT_THRESHOLD_FRAC der Ladung aus (öfter entladen).
        const consumeAt = hasThunderGod(skills) ? Math.ceil(lightning.maxCharge * C.DONNERGOTT_THRESHOLD_FRAC) : lightning.maxCharge;
        if (lightning.charge >= consumeAt) {
          let consumed = false;
          let blitzCatches = 0; // #165 Blitzfänger: Anzahl voller Karten, die statt ionisiert +Ladung erzeugen
          if (hasIonize(skills)) {
            // #145: unter Zeitsegment ist `pos` der Stich-Zähler (0–44), nicht die Deck-Position — die noch
            // kommenden Karten sind die seq-gemappten Restpositionen (dedupliziert, da ein wiederholtes Segment
            // Deck-Indizes doppelt nennt). Ohne Zeitsegment ist seq die Identität → identisch zu playerOrder.slice.
            const undrawn = [...new Set(seq.slice(pos + 1).map((p) => playerOrder[p]))]; // Deck-Indizes der noch kommenden Karten
            // Doppelentladung (L, v0): der volle Verbrauch feuert den Ionisierungs-Konsumenten zweimal (Anzahl ×2).
            // Ionisierungs-Speed (v0.5): +Breite je Blitz-Skill über der Schwelle → Mono sättigt in weit weniger Verbräuchen.
            const ionN = (ionizeCountFor(skills) + ionSpeedBonus(skills)) * (hasDoubleDischarge(skills) ? C.DOPPELENTLADUNG_FACTOR : 1);
            const ionBefore = deck.reduce((t, c) => t + (c.ionStacks || 0), 0); // #270: Motor-Zähler (tatsächlich neu ionisierte Stapel = Diff)
            if (hasBlitzcatcher(skills)) {
              // Blitzfänger: volle Karten (5 Stapel) werden nicht ionisiert → je +2 temp Wert (nächstes Auftauchen) & +1 Ladung.
              const res = ionizeCardsWithCatch(deck, undrawn, ionN, rngAtOr(cycle, "ion", pos));
              deck = res.deck;
              for (const cid of res.catchIds) newIceTemp[cid] = Math.max(newIceTemp[cid] || 0, C.BLITZFAENGER_VALUE);
              blitzCatches = res.catchIds.length;
            } else {
              deck = ionizeCards(deck, undrawn, ionN, rngAtOr(cycle, "ion", pos));
            }
            ionTotal += Math.max(0, deck.reduce((t, c) => t + (c.ionStacks || 0), 0) - ionBefore); // #270: durch den Konsumenten ionisierte Karten
            consumed = true;
          }
          if (consumed) {
            // Ladungsboden: Reststrom (3), sonst 0 (Endloser Sturm wurde im Rework durch Doppelentladung ersetzt).
            const floor = chargeFloorFor(skills);
            lightning = consumeCharge(lightning, floor);
            lightning = { ...lightning, consumeCount: (lightning.consumeCount || 0) + 1 }; // v0.5-UI: Entladungen/Runde-Zähler
            // #165 Blitzfänger: die Fang-Ladungen entstehen NACH dem Verbrauch (sonst würde consumeCharge sie wieder auf den Boden setzen).
            if (blitzCatches > 0) lightning = addCharge(lightning, blitzCatches);
            // Entladung (v0.5): +Crit-Mult-Momentum je Verbrauch, dauerhaft, weicher Cap (kein Ventil für Multi).
            if (hasDischarge(skills)) lightning = { ...lightning, entladungMult: Math.min(C.ENTLADUNG_MULT_CAP, (lightning.entladungMult || 0) + C.ENTLADUNG_MULT_STEP) };
            // On-Consume-Passives (Rework v0) — kleiner Payoff bei JEDEM vollen Verbrauch, hält die Kettenfantasie am Laufen:
            if (hasBlitzableiter(skills)) lightning = addCharge(lightning, C.BLITZABLEITER_CONSUME_CHARGE); // Blitzableiter: Ladung zurück
            if (hasDauerstrom(skills)) // Dauerstrom (v0.5): dauerhafte Crit-Chance-Rampe je Verbrauch — UNCAPPED (3. Momentum-Zugang)
              lightning = { ...lightning, dauerstromCritBonus: (lightning.dauerstromCritBonus || 0) + C.DAUERSTROM_CONSUME_CRIT };
            if (hasStaticCharge(skills)) { // Statische Aufladung: +Flat-Score bei jedem Verbrauch (Direkt-Score, nicht multipliziert)
              score += C.CONSUME_SCORE; gained += C.CONSUME_SCORE; lightYield += C.CONSUME_SCORE;
              breakdown.lightDirect = (breakdown.lightDirect || 0) + C.CONSUME_SCORE; breakdown.total = (breakdown.total || 0) + C.CONSUME_SCORE;
            }
            // Gewitterfront (v0.5): Crit-Chance-Momentum je Verbrauch — UNCAPPED (Überschlag ist das Ventil; „ab Cap → Score" entfällt).
            if (hasStorm(skills)) lightning = { ...lightning, stormCritBonus: (lightning.stormCritBonus || 0) + C.STORM_CRIT_STEP };
          }
        }
      }
    }
    // Ionisierte Siegkarte: +1 Stapel (voll bleibt voll — kein Reset mehr). Kurzschluss (Rework): eine VOLLE Karte gibt
    // zusätzlich einen Ladungs-Burst je Sieg — Stapel bleiben (Payoff statt Sättigung entladen; der Score-Burst läuft
    // oben über lightDirect).
    if (ionizedCard) {
      const stacks = pCard.ionStacks || 0;
      deck = deck.map((c) => (c.id === pCard.id ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, stacks + 1) } : c));
      if (hasKurzschluss(skills) && stacks >= C.ION_MAX_STACKS && lightning && lightning.active)
        lightning = addCharge(lightning, C.KURZSCHLUSS_CHARGE);
    }
    // Blitzschlag (v0, Kaskade): ein Crit ionisiert die gewonnene Karte (+1 Stapel) — schließt die Selbstspeisung.
    if (isCrit && hasBlitzschlag(skills)) {
      deck = deck.map((c) => (c.id === pCard.id ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + C.BLITZSCHLAG_STACKS) } : c));
    }
    // Durchschlag (L, v0): Sieg mit VOLL ionisierter Karte (5, Stand vor dem Stich) + Crit → dauerhaft +Crit-Mult.
    if (isCrit && hasDurchschlag(skills) && (pCard.ionStacks || 0) >= C.ION_MAX_STACKS && lightning && lightning.active) {
      lightning = { ...lightning, durchschlagMult: Math.min(C.DURCHSCHLAG_MULT_CAP, (lightning.durchschlagMult || 0) + C.DURCHSCHLAG_CRIT_MULT) };
    }
    // Breitenbeschleuniger (v0.5, ex-Spannungsbogen): Sieg mit ionisierter Karte → +1 Stapel, BEVORZUGT auf eine noch
    // nicht ionisierte (0-Stapel) Karte (treibt die Breite); gibt es keine, auf den nächsten nicht-vollen Nachfolger.
    if (ionizedCard && hasVoltageArc(skills)) {
      const played = new Set(seq.slice(0, pos + 1)); // bereits gespielte Deckpositionen (Zeitsegment-tauglich)
      const pick = (pred) => { for (let k = actualPos + 1; k < playerOrder.length; k++) { const di = playerOrder[k]; if (played.has(k)) continue; if (pred(deck[di])) return di; } return -1; };
      let di = pick((c) => (c.ionStacks || 0) === 0);                        // 1. Wahl: 0-Stapel-Karte → Breite +1
      if (di < 0) di = pick((c) => (c.ionStacks || 0) < C.ION_MAX_STACKS);   // sonst: nächste nicht-volle
      if (di >= 0) deck = deck.map((c, i) => (i === di ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + 1) } : c));
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
    // (Wetterleuchten v0.5 → Serienschutz, im Niederlagen-Zweig.)
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
      // [#229 C4] nicht in-place mutieren (Bruch der Pure-Invariante) — neu binden, damit ein früher Snapshot unberührt bleibt.
      for (const f of posForm.formations || []) if ((f.factor || 1) > 1 && FORMATION_TYPES.includes(f.type) && !sammlerTypes.includes(f.type)) sammlerTypes = [...sammlerTypes, f.type];
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
    // Serienanker IV (§4.2): eine Niederlage auf dieser Position setzt die Serie NICHT zurück.
    const anchorNoReset = anchorType === "streak" && !!aParam("noReset");
    // Serienschutz (v0.5, ex-Wetterleuchten): Niederlage mit ≥ halber Max-Ladung → Serie hält, die Ladung wird verbraucht.
    let serienschutzHeld = false;
    if (!anchorNoReset && hasSerienschutz(skills) && lightning && lightning.active) {
      const cost = Math.ceil(lightning.maxCharge * C.SERIENSCHUTZ_COST_FRAC);
      if (lightning.charge >= cost) { lightning = { ...lightning, charge: lightning.charge - cost, serienschutzCount: (lightning.serienschutzCount || 0) + 1 }; serienschutzHeld = true; } // v0.5-UI: Zähler abgefangener Serienbrüche
    }
    // Eis-Neudesign (docs §4 Frostgriff — Eispanzer): eine Niederlage NEBEN einem Gletscher ist folgenlos (Serie hält)
    // UND füttert Masse in die angrenzenden Gletscher — der Gletscher frisst, was an ihm zerbricht. Prinzip heil: die Karte
    // verliert weiter (kostet den Stich), nur die Folgen (Serienbruch) sind abgeschirmt.
    const glacierShield = glacierActive && glacierRoles.includes(GLACIER_ROLES.EISPANZER)
      && glacierNeighbors4(actualPos).some((p) => glacierLocked[p]);
    if (glacierShield) for (const nb of glacierNeighbors4(actualPos)) if (glacierLocked[nb]) newGlacierMass[nb] = (newGlacierMass[nb] || 0) + GLACIER_EISPANZER_MASS;
    const streakNoReset = anchorNoReset || serienschutzHeld || glacierShield;
    winStreak = streakNoReset ? winStreak : 0;
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
    winSuit = null; winSuitStreak = 0; // #71 Farbserie: Niederlage beendet die Farbserie
    serieStreak = streakNoReset ? winStreak : 0; // Serienschutz/Serienanker: effektive Serie hält
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
    // Zäher Halm (Pflanze v0): unreife (graue) Karten wachsen auch bei Niederlage +1 — bis sie grün sind.
    if (hasZaeherHalm(skills) && !pCard.green) {
      const g = (newGrowth[pCard.id] || 0) + C.ZAEHER_HALM_GROWTH;
      newGrowth = { ...newGrowth, [pCard.id]: g }; growthTotal += C.ZAEHER_HALM_GROWTH; // #270
      if (growthRipe(g)) deck = deck.map((c) => (c.id === pCard.id ? { ...c, green: true } : c)); // reif geworden → grün backen
    }
    // Fraktions-Passive — Niederlage-Klausel: nur Mono-Pflanze UND ab N Pflanzen-Skills wächst eine Karte auch nach je M
    // Niederlagen trotzdem. Zähler je card.id; bei Erreichen der Schwelle → +Zuwachs (gleiche Skill-Gate-Rate wie ein Sieg)
    // und Zähler zurück. Grün backen + Wert-Schwelle wie im Sieg.
    if (plantPassiveActive(skills) && plantSkillCount(skills) >= C.WURZELSCHLAG_LOSS_MIN_SKILLS) {
      const losses = (newPlantLoss[pCard.id] || 0) + 1;
      if (losses >= C.WURZELSCHLAG_LOSS_EVERY) {
        newPlantLoss = { ...newPlantLoss, [pCard.id]: 0 };
        const growInc = Math.min(1, C.PLANT_GROWTH_SKILL_REF > 0 ? plantSkillCount(skills) / C.PLANT_GROWTH_SKILL_REF : 1);
        const prevG = newGrowth[pCard.id] || 0, g = prevG + growInc;
        newGrowth = { ...newGrowth, [pCard.id]: g }; growthTotal += growInc; // #270 Motor-Zähler
        const nowGreen = pCard.green || growthRipe(g); // grau creept Richtung Grün; grün klettert im Wert
        if (growthRipe(g) && !pCard.green) deck = deck.map((c) => (c.id === pCard.id ? { ...c, green: true } : c)); // reif → grün
        if (nowGreen && Math.floor(g / C.WURZELSCHLAG_PER_GROWTH) > Math.floor(prevG / C.WURZELSCHLAG_PER_GROWTH) && pCard.value < C.PLANT_VALUE_CAP)
          deck = deck.map((c) => (c.id === pCard.id ? { ...c, value: Math.min(C.PLANT_VALUE_CAP, c.value + 1) } : c)); // Wurzelschlag-Wert (nur grün, wie im Sieg)
      } else {
        newPlantLoss = { ...newPlantLoss, [pCard.id]: losses };
      }
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

  // Eis-Neudesign (docs §2.4, Phase B): Bruch-Auszahlung dieses Stichs — pro Position genau einmal je Durchlauf, UNABHÄNGIG
  // von Sieg/Niederlage (Bruch hängt an der Masse-Schwelle, nicht am Stich-Ausgang). Der Basis-Burst kommt aus der
  // Precompute (inkl. Gletscher-Geometrie/Kaskade/Kollision + Soft-Cap); GEWINNT die Gletscher-Karte ihren Stich, skaliert
  // zusätzlich der volle Sieg-Stack (glacierWinMult: Serie/Perk/Formation/Crit/Architekt/…) → der Rest des Spiels hebelt mit.
  const glacierDirect = (glacierPreNow ? (glacierPreNow.payout[actualPos] || 0) : 0) * glacierWinMult;
  if (glacierDirect) {
    score += glacierDirect; gained += glacierDirect; glacierYield += glacierDirect;
    if (breakdown) { breakdown.glacierDirect = glacierDirect; breakdown.total += glacierDirect; }
  }
  // Einfrieren (docs §4 Frostgriff): bricht dieser Gletscher, verliert die hier getroffene Gegnerkarte ihren NÄCHSTEN Stich.
  if (glacierActive && glacierRoles.includes(GLACIER_ROLES.EINFRIEREN) && glacierPreNow && glacierPreNow.breaks.some((b) => b.pos === actualPos))
    newFrozenOppPending[oCard.id] = true;
  // Erstarrung (Legendär): jeder brechende Gletscher friert die getroffene Gegnerkarte ein — plus Reichweite +1 ins Gegnerfeld.
  // Dazu ein Bonus-Score je Bruch = ANTEIL des Burst-Scores dieses Bruchs (glacierDirect, bereits × Sieg-Stack). Skaliert so
  // automatisch mit Masse/Geometrie/Kaskade und der Build-Qualität und erbt den Burst-Soft-Cap — Erstarrung ist damit der
  // „heimliche Best-Pick" (etwas über den anderen Legendären), ohne am Burst vorbei auszureißen. Kern bleibt die Duo-Kontrolle.
  if (glacierActive && glacierRoles.includes(GLACIER_ROLES.L_ERSTARRUNG) && glacierPreNow && glacierPreNow.breaks.some((b) => b.pos === actualPos)) {
    newFrozenOppPending[oCard.id] = true;
    for (const nb of glacierNeighbors4(actualPos)) newFrozenOppPending[oppDeck[oppOrder[nb]].id] = true;
    const erstarrungScore = glacierDirect * GLACIER_ERSTARRUNG_FRAC;
    score += erstarrungScore; gained += erstarrungScore; glacierYield += erstarrungScore;
    if (breakdown) { breakdown.glacierDirect = (breakdown.glacierDirect || 0) + erstarrungScore; breakdown.total += erstarrungScore; }
  }
  // Frostbund (docs §4 Frostgriff): bricht dieser Gletscher, bufft er seine NICHT-Gletscher-Nachbarn (2. Archetyp) → +Stichwert.
  if (glacierActive && glacierRoles.includes(GLACIER_ROLES.FROSTBUND) && glacierNF && glacierPreNow && glacierPreNow.breaks.some((b) => b.pos === actualPos))
    for (const nb of glacierNF(actualPos)) if (!glacierLocked[nb]) {
      const id = deck[playerOrder[nb]].id;
      newGlacierBuffPending[id] = Math.max(newGlacierBuffPending[id] || 0, GLACIER_FROSTBUND_BUFF);
    }
  // Verdichtung (docs §4 Firn): der auf diesem Gletscher unterdrückte Gebäude-Wertbonus wird in Masse getankt.
  if (verdichtung && architectValue > 0) newGlacierMass[actualPos] = (newGlacierMass[actualPos] || 0) + architectValue * GLACIER_VERDICHTUNG_RATE;

  // #UI: bester GLETSCHER-Stich separat erfassen — der volle Stich-Score (inkl. Bruch/Erstarrung), sobald dieser Stich
  // einen Gletscher-Bruch trug. `bestTrickScore` (oben) wird VOR dem Bruch-Score gebucht und zeigt ihn daher nicht; der
  // Gletscher-Stich braucht darum seine eigene Bestmarke — hier, wo `gained` bereits den Bruch enthält.
  if (glacierDirect > 0) bestGlacierTrickScore = Math.max(bestGlacierTrickScore, gained);

  // #71 Volles Haus: Ergebnis-Fenster fortschreiben (letzte 4 Ergebnisse für den nächsten Stich).
  recentResults = [...recentResults, lastResult].slice(-4);

  // Archetyp-„Treffer-Identitäten" dieses Siegs (nur Anzeige, für Score-Float-Farbe/-Icons in der Battlefield). Ein
  // einzelner Sieg kann MEHRERE zugleich tragen (bis zu alle vier) → als Liste geführt, die UI zeigt alle Icons und
  // wählt die Score-Farbe nach Priorität (Krit-Lila zuerst). Bedingungen:
  //   fire      = Sieg bei voller Hitze (Hitzeleiste 100 %)
  //   plant     = Sieg mit einer voll ausgewachsenen grünen Karte (Wert am Deckel)
  //   lightning = Sieg mit einer voll ionisierten Karte (ION_MAX_STACKS Stapel) — Krit trägt weiterhin das Lila der Farbe
  //   ice       = Sieg eines Gletschers (Siegkarte steht auf einem festgefrorenen Gletscher-Feld)
  const heatFull = !!(state.heat && state.heat.active && (state.heat.value || 0) >= C.HEAT_MAX);
  const hitTypes = won
    ? [
        heatFull && "fire",
        (pCard.green && pCard.value >= C.PLANT_VALUE_CAP) && "plant",
        ((pCard.ionStacks || 0) >= C.ION_MAX_STACKS) && "lightning",
        (glacierActive && !!glacierLocked[actualPos]) && "ice",
      ].filter(Boolean)
    : [];
  const lastTrick = {
    pCard, oCard, pValue, oValue,
    result: tieConverted ? "win_tie" : won ? "win" : lost ? "loss" : "tie",
    gained, trickNo, hitTypes,
    isCrit, critChance, critMultiplier, scoreBeforeCrit, scoreGain: gained, critBonus,
    // Formations-Multiplikator dieses Stichs (§22.7) + die beteiligten Formationen der Position (Anzeige/Float).
    formationMult: won ? formationMult : 1,
    formations: posForm.formations,
    // Große Lawine: brach dieser Gletscher als Teil des Finishers? → HUD zeigt „Lawine" statt der Score-Stufe („Gottgleich").
    grosseLawine: !!(glacierPreNow && glacierPreNow.grosseLawine && glacierPreNow.breaks.some((b) => b.pos === actualPos)),
    winStreak, // aktuelle Siegesserie NACH diesem Stich (0 bei Niederlage) — Battlefield feiert Meilensteine (Serie 200 → „Gönn dir")
    isRepeatedSegmentTrick: isRepeat, originalPosition: actualPos, segmentIndex: timeSeg, // Zeitsegment (§8 A-L1 / §13)
    breakdown, // Ergebnis-Aufschlüsselung (§17): { base, flats, streakMult, perkMult, formMult, critMult, total } bei Sieg, sonst null
  };

  // Durchlauf-Ende: Score-Effekte am Durchlauf-Ende, dann NUR das Gegnerdeck NEU MISCHEN (Spieler-Reihenfolge
  // bleibt persistent, §22.1) und eine Auswahl anbieten. Nach MAX_CYCLES Durchläufen endet der Run (§22.1).
  pos += 1;
  let phase = "play";
  let newOffer = offer;
  let newSkillOffer = skillOffer;
  let newLegendaryOffer = state.legendaryOffer || null; // #272 Legendär-Phase (Runde 29): 2 Legendäre aus aktiven Fraktionen
  let newFormationEnergy = formationEnergy;
  let newFormationSwaps = formationSwaps;
  let newMasteryLegGranted = state.masteryLegGranted || false; // #217 Grad V: 1×/Lauf garantierter Legendär — eingelöst-Flag
  // Architekt (#202): Meilenstein-Zähler nach diesem Stich fortschreiben (bump = Gebäude-id eines Siegs auf seiner Abdeckung).
  let newArchitect = architect;
  if (architectEnabled && architect && architectBump != null)
    newArchitect = { ...architect, winCounters: { ...architect.winCounters, [architectBump]: (architect.winCounters[architectBump] || 0) + 1 } };
  const newArchitectPre = archPreNow;
  if (pos >= cycleLen) { // Zeitsegment (§8 A-L1): Durchlauf endet nach cycleLen Stichen (40, mit Zeitsegment 45)
    cycle += 1;
    // Eis-Neudesign (docs §2.6): Ewiger Frost — bedingungsloser Masse-Tick je Durchlauf auf jeden Gletscher (nach Auszahlung).
    if (glacierActive) newGlacierMass = ewigerFrostTick(newGlacierMass, glacierLocked);
    // Dauerfrost (docs §4 Firn): offener Boden friert am tiefsten — passiver Masse-Frost auf ungefrorene Felder.
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.DAUERFROST)) newGlacierMass = dauerfrostTick(newGlacierMass, glacierLocked);
    // Packeis / Verzahnung (docs §4 Eisschild): Dichte-Bonus je Gletscher-Nachbar / Cluster-Größe (Eisbrücke-adjazenz-aware).
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.PACKEIS)) newGlacierMass = packeisTick(newGlacierMass, glacierLocked, glacierNF);
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.VERZAHNUNG)) newGlacierMass = verzahnungTick(newGlacierMass, glacierLocked, glacierNF);
    // Eiszeit (Legendär): brettweite Flut + das höchste ungefrorene Feld friert zum Gletscher ein (Karten frieren nach und nach).
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.L_EISZEIT)) {
      const ez = eiszeitTick(newGlacierMass, newGlacierLocked);
      newGlacierMass = ez.mass; newGlacierLocked = ez.locked;
    }
    // ---- Legendär-Perks-Rework (#203): Durchlauf-Ende-Payoffs, VOR dem Rundenscore-Tracking (dem beendeten Durchlauf
    //      attribuiert). Zinseszins — positive Durchlauf-Bilanz (mehr Siege als Niederlagen) stapelt eine FLACHE Dauer-
    //      Dividende (kein Mult), die jeden Durchlauf ausgezahlt wird (compoundet über den Lauf). Echo — der beste Stich
    //      dieses Durchlaufs wird ein zweites Mal gutgeschrieben (× ECHO_FACTOR).
    let cycleEndScore = 0;
    if (ownsFlag(perks, "zinseszins")) { if (cycleWins > cycleLosses) zinsBonus += C.ZINSESZINS_STEP; cycleEndScore += zinsBonus; }
    if (ownsFlag(perks, "echo")) cycleEndScore += cycleBestTrick * C.ECHO_FACTOR;
    // Richtfest (Gebäude-Legendäres): je vollendeter Struktur diesen Durchlauf +Schritt auf den Dauer-Bonus, dann auszahlen.
    if (ownsFlag(perks, "richtfest") && archPreNow) { richtfestBonus += C.RICHTFEST_STEP * (archPreNow.structureCount || 0); cycleEndScore += richtfestBonus; }
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
    // #98: temporäre Positions-Boni enden mit dem Durchlauf — sonst würde ein an Position 40 armierter
    // Relay (C4/C5) auf Position 1 des nächsten (persistenten) Durchlaufs durchsickern.
    successorQueue = [];
    // ---- Feuer-Rework (v0): Durchlauf-Ende — Schmieden (Ascheschmiede), Damaststahl-Wachstum, Phönix-Reset.
    if (heat && heat.active) {
      // Ascheschmiede: solange genug Asche, jeweils die aktuell niedrigste Karte dauerhaft +2 Wert (spreizt sich über
      // die tiefen Karten, da nach jedem Schmieden neu die tiefste gesucht wird). Schmelzofen senkt die Kosten ab 50 % Hitze.
      if (fireFlag(skills, "ascheschmiede")) {
        const cost = forgeCostFor(skills, heat.value);
        // Stufe 1 (permanent, gedeckelt): solange Asche & eine schmiedbare Karte da ist, die aktuell niedrigste Karte
        // dauerhaft +FORGE_VALUE. Boden-Heber (wenige tiefe Karten), kein Ganz-Deck-Buff.
        let guardF = 0;
        while (newAsh >= cost && guardF++ < deck.length) {
          // niedrigste schmiedbare Karte: unter dem Per-Karte-Deckel UND (schon geschmiedet ODER noch Platz unter FORGE_MAX_CARDS).
          const forgedCount = Object.keys(newForged).length;
          let lowId = null, lowV = Infinity;
          for (const c of deck) {
            if ((newForged[c.id] || 0) >= C.FORGE_MAX_PER_CARD && !fireFlag(skills, "damascus")) continue; // Per-Karte-Deckel (Damaststahl hebt ihn auf)
            if (!(newForged[c.id] > 0) && forgedCount >= C.FORGE_MAX_CARDS) continue;    // keine NEUE Karte über dem Kartendeckel
            if (c.value < lowV) { lowV = c.value; lowId = c.id; }
          }
          if (lowId == null) break; // Kapazität voll → raus aus Stufe 1 (Rest-Asche geht in den Weißglut-Überlauf)
          newAsh -= cost; ashBurned += cost; // #270: Motor-Zähler „Asche verbrannt"
          deck = deck.map((c) => (c.id === lowId ? { ...c, value: c.value + C.FORGE_VALUE } : c));
          newForged = { ...newForged, [lowId]: (newForged[lowId] || 0) + C.FORGE_VALUE };
        }
        // Stufe 2 — Weißglut-Überlauf (#268): ist die Kapazität voll und liegt noch Asche ≥ Kosten, „glüht die Schmiede
        // weiß" → je FORGE_COST-Portion +FORGE_OVERFLOW_SCORE (sichtbarer Score-Burst). Asche wird so auf < Kosten
        // heruntergefahren (vollständig ausgegeben). Post-stack-Flat (am Sieg-Multiplikator vorbei), dem Schluss-Stich gutgeschrieben.
        if (C.FORGE_OVERFLOW_SCORE > 0 && newAsh >= cost) {
          const portions = Math.floor(newAsh / cost);
          const burst = portions * C.FORGE_OVERFLOW_SCORE;
          newAsh -= portions * cost; ashBurned += portions * cost; // #270: verbrannte Asche (Weißglut-Überlauf)
          score += burst; fireWhite += burst; // #270.2: Weißglut-Überlauf-Burst → Weißglut-Kanal
          if (lastTrick) { lastTrick.gained += burst; lastTrick.scoreGain += burst; } // Per-Karte-Ledger konsistent halten
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

    // #226 Großmeister: kürzerer Lauf als Schwierigkeits-Hebel (maxCycles override, sonst C.MAX_CYCLES → byte-identisch).
    // Dev-Run (Test-Layout): state.maxCycles setzt die Rundenzahl eines einzelnen Laufs frei (20..100); null → Bestand.
    if (cycle >= (state.maxCycles || (difficulty && difficulty.maxCycles) || C.MAX_CYCLES)) {
      // Run-Ende nach dem letzten Durchlauf (§22.1): kein Neu-Mischen, keine Auswahl mehr.
      phase = "gameover";
    } else {
      // Neuer Durchlauf: NUR das Gegnerdeck neu mischen; Spieler-Reihenfolge bleibt (persistent). pos zurück.
      oppOrder = shuffledOrder(oppDeck.length, rngAtOr(cycle, "oppdeal")); // #205: Gegner-Neumischung adressiert je (neuem) cycle
      pos = 0;
      // Einfrieren (v0): die diesen Durchlauf gesetzten Gegner-Marken werden jetzt aktiv (verlieren ihren nächsten Stich).
      newFrozenOppActive = newFrozenOppPending;
      newFrozenOppPending = {};
      // Frostbund (v0): die diesen Durchlauf gesetzten Nachbar-Buffs werden jetzt aktiv (+Stichwert im nächsten Durchlauf).
      newGlacierBuffActive = newGlacierBuffPending;
      newGlacierBuffPending = {};
      // Feuer-Brand (v0): analog — die im gerade beendeten Durchlauf gesetzten Brandmarken werden jetzt aktiv (−Wert).
      newBrandActive = newBrandPending;
      newBrandPending = {};
      // Entscheidung VOR dem neuen Durchlauf nach dem Plan (Shop-Spec §2.2): schedule[cycle]
      // (cycle wurde oben erhöht → Index cycle = Entscheid vor Durchlauf cycle+1). Start-Entscheid via START_RUN.
      // Dev-Run (Test-Layout): state.devSchedule überschreibt den globalen Plan pro Lauf; null → Bestand.
      const decision = (state.devSchedule || C.DECISION_SCHEDULE)[cycle];
      // #217 Meistergrade — Reward-Ableitungen (Grad 0 = No-op: Mult ×1, Shift 0, keine Garantie → byte-identisch).
      const mGrade = state.masteryGrade || 0;
      const mLegMult = masteryLegendMult(mGrade), mRareShift = Math.max(masteryRareShift(mGrade), state.treeRareShift || 0); // Rang (Meister) ∪ Baum (Normal-Lauf)
      if (decision === "skill") {
        // Grad V: solange dieser Lauf noch kein garantiertes Legendär bekam, mind. EINEN forcieren (#247: als eigener
        // guaranteeOne-Parameter — NICHT mehr Chance 1, das würde bei der Per-Archetyp-Ziehung in JEDEM Archetyp einen setzen).
        const guarantee = masteryLegendGuaranteed(mGrade) && !newMasteryLegGranted;
        const skillLeg = skillLegendaryChance(shop) * mLegMult; // #247: Per-Archetyp-Chance (Basis × Meisterrang-Mult)
        const soff = state.devMode ? fullSkillOffer() : buildSkillOffer(skills, activeArchetypes, rngAtOr(cycle, "skill", 0), C.SKILLS_OFFERED, skillLeg, guarantee);
        if (soff.length > 0) {
          phase = "levelup"; newSkillOffer = soff;
          if (guarantee && soff.some(isLegendarySkill)) newMasteryLegGranted = true; // Garantie eingelöst, sobald ein Legendär tatsächlich im Angebot ist
        } else { const off = buildPerkOffer(perks, familyTiers, rngAtOr(cycle, "perk", 0), C.PERKS_OFFERED, perkLegendaryChance(shop) * mLegMult, mRareShift, architectEnabled); if (off.length > 0) { phase = "levelup"; newOffer = off; } } // leerer Skill-Pool → Perk
      } else if (decision === "perk") {
        const off = state.devMode ? fullPerkOffer(architectEnabled) : buildPerkOffer(perks, familyTiers, rngAtOr(cycle, "perk", 0), C.PERKS_OFFERED, perkLegendaryChance(shop) * mLegMult, mRareShift, architectEnabled);
        if (off.length > 0) { phase = "levelup"; newOffer = off; }
      } else if (decision === "shop" && architectEnabled) {
        // Architekt-Phase (#202, ersetzt den Shop): frisches Bauplan-Angebot ziehen (deterministisch über rng) und die
        // Pro-Phase-Flags (Hauptaktion/versetzen) zurücksetzen. #217: rareShift durchreichen. Dev-Run → voller Katalog.
        phase = "architect";
        const archOffers = state.devMode ? fullArchitectOffer() : buildArchitectOffer(newArchitect || architect, rngAtOr(cycle, "arch"), mRareShift);
        newArchitect = { ...(newArchitect || architect), offers: archOffers, actedMain: false, moved: false };
      } else if (decision === "shop") {
        // #229: Shop entfernt — ohne aktiven Architekten (Sim-Baseline / architect:false) ist die 'shop'-Entscheidung
        // ein No-Op; der Durchlauf startet direkt (kein rng-Verbrauch).
        phase = "play";
      } else if (decision === "formation") {
        // Formationsphase (§22.8): Deck-Aufstellung öffnen, frische Energie (+ Shop-Feinjustierung), Vorschau berechnen.
        phase = "formation";
        // Dev-Run (Test-Layout): state.devEnergy setzt die Formations-Energie-Basis pro Lauf frei; null → C.FORMATION_ENERGY.
        newFormationEnergy = (state.devEnergy ?? C.FORMATION_ENERGY) + perks.reduce((t, id) => t + (PERK_DEFS[id].extraSwap || 0), 0)
          + formationEnergyBonus(familyTiers, cycle); // #179 Feinjustierung (jetzt Perk-Familie E_TUNING): +Energie je Stufe
        newFormationSwaps = [];
        // #137: anchors + familyTiers mitgeben (wie bei pos-0/Tausch/Kauf), sonst zeigt die Formationsphase beim
        // Eintritt einen veralteten Stand (ohne regeländernde Familien-Effekte) — erst der erste Tausch korrigierte.
        formations = computeFormations(playerOrder, deck, roles, perks, skills, anchors, familyTiers, archState);
      } else if (decision === "legendary") {
        // #272 Legendär-Phase (Runde 29, build-defining): Legendäre NUR aus aktiven Fraktionen → fixer 7. Slot.
        // Angebotsgröße skaliert mit der Build-Breite (Mono 3 · Duo 2/Fraktion=4 · Trio 2/Fraktion=6).
        // Kein Legendär verfügbar (keine aktive Fraktion / alle der aktiven Fraktionen bereits gehalten) → wie ein
        // leerer Skill-Pool auf die normale Skill-Wahl ausweichen (Runde nicht verschwenden).
        const legOff = buildLegendaryOffer(activeArchetypes, skills, rngAtOr(cycle, "legendary", 0));
        if (legOff.length > 0) { phase = "legendary"; newLegendaryOffer = legOff; }
        else {
          const soff = buildSkillOffer(skills, activeArchetypes, rngAtOr(cycle, "skill", 0), C.SKILLS_OFFERED, 0, false);
          if (soff.length > 0) { phase = "levelup"; newSkillOffer = soff; }
        }
      }
    }
  }

  // #251: Score je Stich in den Durchlauf-Puffer (nested `trickLog[cycle] = [{gained,won},…]`) — pro Stich nur die
  // Außenliste + den aktuellen Durchlauf-Bucket kopieren (O(n) über den Lauf) statt die ganze flache Liste (O(n²) →
  // Sim-Bremse). `state.cycle` = der Durchlauf, IN dem dieser Stich gespielt wurde (VOR evtl. Inkrement am Durchlauf-Ende).
  // Nur bauen, wenn ein Puffer existiert (das Spiel initialisiert `trickLog: []`); der Sim setzt ihn auf `null` → kein
  // Aufbau (die Sim braucht den Graph nicht; spart die Array-Kopien über Tausende Läufe).
  let nextTrickLog = state.trickLog;
  if (Array.isArray(nextTrickLog)) {
    nextTrickLog = nextTrickLog.slice();
    nextTrickLog[state.cycle] = [...(nextTrickLog[state.cycle] || []), { gained, won: !!won }];
  }

  return {
    ...state, deck, oppDeck, playerOrder, oppOrder, pos, cycle, trickNo,
    offerRerolls: 0, // #205: neues (Zyklus-Ende-)Angebot → Reroll-Index zurück auf 0 (Rerolls im Reducer zählen hoch)
    score, winStreak, bestStreak, wins, losses, ties,
    scoreAtCycleStart, lastCycleScore, prevCycleScore, // #131 Rundenscore-Tracking

    crits, critBonusScore, bestTrickScore, bestGlacierTrickScore, maxFormations, formationScore, buildingScore, streakScore, // #161 FB-2 / #UI / #251: Run-Rückblick (+ bester Gletscher-Stich / Gebäude-/Serien-Score)
    lightYield, plantRoot, plantBloom, plantHarvest, fireBase, fireWhite, // #270: Fraktions-Eigen-Score (Kanäle je Fantasie)
    ionTotal, growthTotal, ashBurned, brandTotal, // #270: Motor-Zähler
    trickLog: nextTrickLog, // #251: Score je Stich (+ Sieg/Niederlage), nach Durchlauf gebucket → Durchlauf-Graph
    initiative, lastResult, perks, offer: newOffer, tieArmed, sinceWin, lossStreak, lastWinValue,
    masteryLegGranted: newMasteryLegGranted, // #217 Grad V: garantierter Legendär je Lauf eingelöst? (masteryGrade selbst läuft über ...state)
    critFollowArmed, weaknessArmed, weaknessBig, interplayStored, misfireScore,
    winSuit, winSuitStreak, recentResults, segmentWins, // #189 Volles Haus: segment-genauer Sieg-Zähler
    formations, // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, zu Durchlauf-Beginn berechnet
    architect: newArchitect, architectEnabled, architectPre: newArchitectPre, // Architekt (#202, ersetzt den Shop)
    glacierMass: newGlacierMass, glacierLocked: newGlacierLocked, glacierPre: glacierPreNow, glacierYield, glacierRoles, grosseLawineFired: newGrosseLawineFired, // Eis-Neudesign (glacier.js): Firn-Boden-Masse / Lock / Snapshot / Eigen-Score / Rollen / Große-Lawine-One-Shot
    frozenOppPending: newFrozenOppPending, frozenOppActive: newFrozenOppActive, // Eis-Neudesign (Einfrieren): Gegner-Marken (verlieren nächsten Stich)
    glacierBuffPending: newGlacierBuffPending, glacierBuffActive: newGlacierBuffActive, // Eis-Neudesign (Frostbund): Nachbar-Wert-Buffs


    formationEnergy: newFormationEnergy, formationSwaps: newFormationSwaps, // Formationsphase (V2 §22.8)
    successorQueue, triumphArmed, // Kartenrollen (V2 §22.6 C): C4/C5-Nachfolger-Boni / C2-Triumph-Armierung
    l4Boost, // Legendär-Perk L4 Kritische Masse (Crit-Wert-Gewinn je Karte)
    zinsBonus, cycleWins, cycleLosses, cycleBestTrick, sammlerTypes, vabanquePaid, // Legendär-Perks-Rework (#203)
    richtfestBonus, // Gebäude-Legendäres Richtfest (Struktur-Dauerdividende)
    roles, // (unverändert vom Reducer gesetzt, hier durchgereicht)
    skillOffer: newSkillOffer, legendaryOffer: newLegendaryOffer, lightning, // Skill-System / Blitz-Archetyp · #272 Legendär-Phase
    heat, // Feuer-Archetyp (#93 F1): Hitze-Substate (null solange kein Feuer-Skill aktiv)
    iceTemp: newIceTemp, // temporärer Wertbonus je card.id (Blitzfänger)
    ash: newAsh, brandPending: newBrandPending, brandActive: newBrandActive, forged: newForged, // Feuer-Rework (v0)
    growth: newGrowth, colonized: newColonized, plantLoss: newPlantLoss, // Pflanze-Fraktion (v0): Wachstum + Kolonisierung + Niederlagen-Zähler (Wurzelschlag-Buff v0.4)
    shop, // hält nur noch die (inerten) Positionsanker (#229: Shop entfernt)
    lastTrick, phase,
  };
}
