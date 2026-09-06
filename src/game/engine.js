import * as C from "./constants.js";
import { shuffledOrder, shuffleFreePositions } from "./deck.js"; // #370 Deck-Shuffle: fixierte Positionen bleiben stehen
import { rngAt } from "./rng.js"; // #205 Challenger Mode: adressierte Sub-Ströme (build-unabhängige Slots)
import { weekModMag, hasWeekMod, BOOST_FACTOR } from "./weekMods.js"; // #370 Wochen-Modifikatoren (nur Ranked)
import { PERK_DEFS, buildPerkOffer, critChanceRawFor, critMultiplierFor, streakBaseMult, zinsHurdle } from "./perks.js";
import { familySumHook, familyProdHook, familyTierParam, activeFamilyEntries, formationEnergyBonus, familyCritChanceRaw, familyCritMult, allianceGroups } from "./families.js";
import { colorsAllied } from "./color.js"; // #289: Farb-Serie/Architekt/Farbfokus respektieren Farballianz
import { skillSum, buildSkillDoors, // exp skill rework: Türen-Angebot (Stufen mit der Tür gewürfelt)
  growthRipe, greenCount, // Pflanze-Fraktion (v0): Reife/Grün
  plantPassiveActive, hasKernholz, hasWurzeltiefe, hasPfahlwurzel, hasJahresringe, hasAussaat, hasFlugsamen, hasZaeherHalm, // Pflanze: Fraktions-Passive (Mono/Schwellen-Knick) / Kernholz / Tiefe / Breite
  hasRanken, hasBluete, hasBluetezeit, hasPhotosynthese, hasBlaetterdach, hasUeberwucherung, // Pflanze: Grün/Überwucherung
  hasAuslaeufer, hasRhizom, hasErntedank, hasWeltenbaum, hasMutterbaum, hasBaumreihe, hasEwigerFruehling, plantSkillCount } from "./skills.js"; // Pflanze: Gegnerdeck/Legendäre + Bekenntnis-Skalierung
// exp skill rework: die Blitz-Mechanik (Passiv, 15 Skills, 4 Legendäre) lebt im Fraktionsmodul; die Engine ruft nur
// ihre reinen Übergänge (Crit-Beiträge, Ladungsgewinn, volle Leiste, Niederlage, Rundenende).
import { lightningCritChance, lightningCritMult, overcritMult, blitzfaengerValue, ionenfeldValue, fieldTick, ionScoreFor as lightIonScore, ionCritMultFor as lightIonCritMult, chargeGainOnWin,
  critFillsBar, blitzschlagStacks, stauAfterWin, lightningOnLoss, fillBar as lightFillBar, lightningCycleEnd, maxChargeFor,
  lightParam, L as LIGHT, hasDoppelentladung, hasDurchschlag } from "./factions/lightning.js";
// exp skill rework: die Feuer-Mechanik (Passiv, 15 Skills, 4 Legendäre) lebt ebenso im Fraktionsmodul — die Engine
// ruft ihre Übergänge (Kampfwert-Bonus, Sieg, Niederlage, Hitze-Multiplikator, Rundenende, Brand-Wechsel).
import { syncHeatMax, fireValueBonus, damascusCombat, fireOnWin, fireOnLoss, heatMult, verbrennungMult, feuersturmMult,
  fireCycleEnd, nextBrandActive } from "./factions/fire.js";
// (#267: import aus stats.js entfernt — die Stat-Phase/Faktoren sind weg.)
import { computeFormations, positionHasFormation, activeFormationCount, summarizeFormations, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { perkLegendaryChance, anchorAt } from "./shop.js";
import { precomputeArchitect, architectValueBonus, architectScore, buildArchitectOffer } from "./architect.js";
import { precomputeGlacier, ewigerFrostTick, dauerfrostTick, glacierOpts, driftTarget as glacierDriftTarget,
  neighbors4 as glacierNeighbors4, glacierNeighborFn, verschmelzenPool, uebergletscherPool, packeisTick, verzahnungTick, eiszeitTick, glacierGeometry,
  ROLES as GLACIER_ROLES, WIN_MASS as GLACIER_WIN_MASS, ANFRIEREN_WIN as GLACIER_ANFRIEREN_WIN,
  ANFRIEREN_FORM as GLACIER_ANFRIEREN_FORM, SCHNEETREIBEN_SEED as GLACIER_SCHNEETREIBEN_SEED,
  EISPANZER_MASS as GLACIER_EISPANZER_MASS, FROSTBUND_BUFF as GLACIER_FROSTBUND_BUFF,
  VERDICHTUNG_RATE as GLACIER_VERDICHTUNG_RATE, ERSTARRUNG_FRAC as GLACIER_ERSTARRUNG_FRAC,
  FIRN_REFILL_TARGET as GLACIER_FIRN_REFILL_TARGET } from "./glacier.js"; // Eis-Neudesign (isoliert, activeArchetypes "ice") · #386 Firn-Reserve-Nachschub
import { fullPerkOffer, devSkillOffer, fullArchitectOffer } from "./devCatalog.js"; // Dev-Run: Voll-Katalog statt Zufallsangebot (nur state.devMode)
import { runRules, perksOfferedFor, skillOfferParams } from "./rules.js"; // exp: Regeln je Lauf (state.rules; null → Konstanten, byte-identisch)

/* Energie-Budget einer Formationsphase — EINE Quelle für den Phasen-Eintritt (unten, Durchlauf-Ende) UND für
   RESET_FORMATION im Reducer. Die Formel stand vorher zweimal da, und die Reducer-Kopie hatte `state.devEnergy`
   vergessen: im Dev-Run setzt START_RUN nur devEnergy und lässt formationEnergyBase undefiniert, sodass
   „Zurücksetzen" auf C.FORMATION_ENERGY durchfiel statt auf den eingestellten Wert. Die Duplikation war die
   eigentliche Ursache — deshalb der gemeinsame Helfer statt eines zweiten Patches an derselben Formel. */
export function formationEnergyFor(state) {
  const base = state.devEnergy ?? state.formationEnergyBase ?? C.FORMATION_ENERGY;
  const perkSwaps = (state.perks || []).reduce((t, id) => t + ((PERK_DEFS[id] && PERK_DEFS[id].extraSwap) || 0), 0);
  return base + perkSwaps + formationEnergyBonus(state.familyTiers, state.cycle); // #179 E_TUNING „Feinjustierung"
}

// ERKUNDUNG Hebel 7: Commitment-Scaler mit Konvexitäts-Exponent. commitScale(count) = min(1, count/SKILL_SLOTS)^COMMIT_EXP.
// COMMIT_EXP=1 (Default) → linear = bisheriges Verhalten (neutral). >1 → konvex (Verdünnung kostet superlinear).
// exp: `slots` = the run's BASE slot count (rules.skillSlots). Bonus slots (Meisterhand, week mod) still do not
// dilute the commitment (#370 decision) — only the base the run was configured with moves the denominator.
const commitScale = (count, slots = C.SKILL_SLOTS) => Math.pow(Math.min(1, count / slots), C.COMMIT_EXP);

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
/* #370 Bau-Boost als EXPORTIERTE reine Funktion (#health-check G4): test/qa-fixes.test.js prüfte
   vorher eine handkopierte Fassung dieser Zeilen — genau die "Wächter testet eine Kopie"-Falle
   (testing.md §4/§5). Jetzt importiert der Test die echte Naht. Nur der Gewinn-Anteil skaliert:
   negative Flats (gamble-Strafe) bleiben unberührt, der Mult verdoppelt nur den Überschuss über 1. */
export function applyBuildBoost(res, factor) {
  if (res.flat > 0) res.flat *= factor;
  const sf = res.streakFlat || 0;
  res.streakFlat = sf > 0 ? sf * factor : sf;
  res.mult = 1 + ((res.mult || 1) - 1) * factor;
  return res;
}

export function resolveTrick(state, rng) {
  if (state.phase !== "play") return state; // Nicht-Play → No-op, braucht keine rng
  requireRng(rng, "resolveTrick"); // #229 N8: rng ist Pflicht (kein Math.random-Default mehr); Zufall kommt primär aus state.seed via rngAtOr
  // exp: base slot count of THIS run for the commitment scalers below. Read once per trick, and only when a run
  // carries rules at all — the Sim's millions of tricks never touch the rules path.
  // exp skill rework: the default slot rule is "unlimited" (SKILL_SLOT_LIMIT); the scalers keep SKILL_SLOTS as
  // their reference denominator and only follow a rule that actually limits below it.
  const commitSlots = state.rules ? Math.min(runRules(state).skillSlots, C.SKILL_SLOTS) : C.SKILL_SLOTS;

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
    zinsCapital = 0, zinsRate = C.ZINS_RATE_START, zinsPaidTotal = 0, cycleWins = 0, cycleLosses = 0, cycleBestTrick = 0, sammlerTypes = [], // Zinseszins-Bank (Kapital/Zinssatz/kumulierte Auszahlung) / Durchlauf-Bilanz / Echo-Bester-Stich / Sammler distinct Formationsarten
    cycleOpenScore = 0, // Vabanque: Score der Eröffnungsstiche DIESES Durchlaufs (Bezugsgröße der selbstskalierenden Wette)
    richtfestBonus = 0, // Gebäude-Legendäres Richtfest: Auszahlung des letzten Durchlaufs (reine Telemetrie, kein Stapel mehr)
    cycleScoreSum = 0,  // Summe der Stich-Erträge DIESES Durchlaufs — Bezugsgröße der Richtfest-Dividende
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
    fireBase = 0, fireHeat = 0, // Feuer: Feuer-Score (Konsumenten, Glutstahl, Sonnenkern) / Anteil des Hitze-Multiplikators und der Verbrennung
    ionTotal = 0, growthTotal = 0, brandTotal = 0, // Motor-Zähler: ionisierte Karten / Wachstum / gebrandmarkte Gegnerkarten
    trimCount = 0, // #288 Trimmen: ersetzte Wachstums-Skills → Wurzel-/Blüten-Multiplikator
    skills = [], skillOffer = null, lightning = null, activeArchetypes = [], // Skill-System / Archetypen (#93)
    skillTiers = {}, // exp skill rework: Stufe je gehaltenem Skill (0 Normal … 3 Episch) — die Fraktionsmodule lesen ihre Tabellen damit
    iceTemp = {}, // (exp: ehemals Blitzfänger-Temp; wird nur noch durchgereicht)
    brandPending = {}, brandActive = {}, forged = {}, // Feuer: Brand-Marker (Gegner, je card.id, Wertabzug nächste Runde) / geschmiedete Dauerwerte
    growth = {}, colonized = {}, // Pflanze-Fraktion (v0): Wachstum je card.id (nur steigend) / kolonisierte Gegnerkarten (grün = card.green auf der Karte)
    plantLoss = {}, // Wurzelschlag-Buff (v0.4): Niederlagen-Zähler je card.id — je WURZELSCHLAG_LOSS_EVERY wächst die Karte trotzdem

    shop = null, // hält nur noch die (inerten) Positionsanker []; der Shop selbst ist entfernt (#229)
    familyTiers = {}, // Raritätssystem (Epic #167): Familienrang je Familie — Engine löst aktive Stufen-Hooks auf
    architect = null, architectEnabled = false, architectPre = null, // Architekt (#202, Shop-Ersatz): Gebäude-Overlay (8×5) + Durchlauf-Precompute
    glacierMass = [], glacierLocked = [], glacierPre = null, glacierYield = 0, glacierRoles = [], // Eis-Neudesign (glacier.js): Gletscher-Eigenmasse / Lock / Snapshot / Eigen-Score / aktive Rollen (Fundament-Modifikatoren)
    firnStack = [], // #386 Firn-Boden-Reserve: pro Feld die Boden-Reserve (getrennt von glacierMass) — füllt Gletscher zum Rundenstart auf 12 nach

    challengeBlockForm = [], // #301 C3: gesperrte Aufstell-Zellen (nie als Gletscher einfrierbar, auch nicht per Eiszeit-Auto-Freeze)
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
    // Fundament (L_FUND, v0.3): additiver Bonus auf JEDEN Strukturfaktor. Wird in den Precompute gereicht, damit
    // Engine UND UI-Anzeige dieselbe Quelle behalten (boardFactorMap-Kommentar: gezeigte und verrechnete Faktoren
    // dürfen nicht driften). Default 0 ⇒ alle Bestands-Aufrufer/Tests byte-identisch.
    archPreNow = archState ? precomputeArchitect(archState, playerOrder, deck, flagValue(perks, "fundament")) : null;
  }
  // Eis-Neudesign (docs §2.4): Snapshot am Durchlauf-Start — der ganze Bruch wird auf dem statischen Brett vorab gerechnet
  // (analog precomputeArchitect), pro Stich ausgezahlt. Der Teil-Reset (−1 Stufe) greift SOFORT auf die Arbeits-Masse;
  // Siege dieses Durchlaufs addieren darauf, Ewiger Frost am Durchlauf-Ende. Isoliert über activeArchetypes "ice".
  const glacierActive = activeArchetypes.includes("ice"); // Eis-Neudesign: der Eis-Archetyp IST der Gletscher
  const glacierNF = glacierActive ? glacierNeighborFn(glacierRoles) : null; // Eisbrücke → 8-Nachbarschaft, sonst 4
  let glacierPreNow = glacierPre;
  let newGlacierMass = Array.isArray(glacierMass) ? glacierMass.slice() : [];
  let newFirnStack = Array.isArray(firnStack) ? firnStack.slice() : []; // #386 Firn-Boden-Reserve: Arbeitskopie (nur ice-gegated beschrieben → Nicht-Eis-Läufe byte-identisch)
  let newGlacierLocked = glacierLocked; // wird nur von Eiszeit (Auto-Lock) verändert; sonst durchgereicht
  let newGrosseLawineFired = grosseLawineFired; // Große Lawine: nach dem ersten aktiven Durchlauf verbraucht
  if (glacierActive && pos === 0) {
    // #386 Firn-Boden-Reserve: Runden-Start-Nachschub — VOR dem Bruch-Snapshot zieht jeder gefrorene Gletscher aus seiner
    // Boden-Reserve (firnStack) wieder auf die volle Masse (FIRN_REFILL_TARGET=12) auf. Selbst-erzeugte Masse aus der Vorrunde
    // senkt (12−Masse) automatisch → nur die Differenz wird gezogen; nie über 12 (Clamp); die Reserve leert sich Runde für Runde.
    // Die nachgefüllte Masse ist das, was im Snapshot birst → deshalb VOR precomputeGlacier.
    for (let p = 0; p < newGlacierMass.length; p++) {
      if (!glacierLocked[p]) continue;
      const draw = Math.max(0, Math.min(GLACIER_FIRN_REFILL_TARGET - (newGlacierMass[p] || 0), newFirnStack[p] || 0));
      if (draw > 0) { newGlacierMass[p] = (newGlacierMass[p] || 0) + draw; newFirnStack[p] = (newFirnStack[p] || 0) - draw; }
    }
    // Pooling vor dem Bruch: Ewiges Schild (Legendär) poolt das GANZE Feld, sonst Verschmelzen den Cluster (nie fallend).
    // Basis ist die BEREITS nachgefüllte Masse (newGlacierMass), nicht das rohe glacierMass.
    const refilledMass = newGlacierMass;
    const snapMass = glacierRoles.includes(GLACIER_ROLES.L_SCHILD) ? uebergletscherPool(refilledMass, glacierLocked)
      : glacierRoles.includes(GLACIER_ROLES.VERSCHMELZEN) ? verschmelzenPool(refilledMass, glacierLocked, glacierNF)
      : refilledMass;
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
  // ---- Feuer (exp skill rework, §4): Leiste an den Build angleichen (Weißglut 200), dann der Zustands-Bonus der
  //      gespielten Karte — Glühende Klinge (je Hitze-Schritt), Feuerwalze (ab der Schwelle nach einem Sieg, Episch auch
  //      nach einer Niederlage), Rückzündung Episch (nach einer Niederlage). Alles im Modul.
  let heat = syncHeatMax(state.heat || null, skills);
  const fireValue = fireValueBonus(heat, skills, skillTiers, { lastResult });
  // Blitzfänger (exp skill rework): ionisierte Karten kämpfen mit +Wert; Ionenfeld (§7.18): solange das Feld trägt, alle
  // Karten. Beides Zustand vor dem Stich, kein Ereignis.
  const blitzValueBonus = blitzfaengerValue(skills, skillTiers, pCard) + ionenfeldValue(state.lightning, skills, skillTiers);
  const anchorPowerBonus = anchorType === "power" ? (aParam("power") || 0) : 0; // Kraftanker (§4.2, Stärke = Stufe)
  // E_QUICKSHOT IV (Rarität #167 Kat. E, Spec §3.2 E8 IV): jede Anker-Position (jede fünfte) erhält zusätzlich +2 Wert.
  // Der Anker-FAKTOR selbst läuft über computeFormations; hier nur der Stufe-IV-Wertbonus (anchor.value auf Anker-Positionen).
  const eqAnchor = familyTierParam(familyTiers, "E_QUICKSHOT", "anchor");
  const eQuickshotValue = eqAnchor && eqAnchor.value && eqAnchor.at(actualPos) ? eqAnchor.value : 0;
  // Familien-Wertboni (Kategorie B, Rarität #167) laufen ADDITIV neben den flachen Perk-cardBonus-Hooks —
  // gleicher Kontext (inkl. pValueBase = Dauerwert der Karte), nur die aktive Familien-Stufe zählt.
  const familyValueBonus = familySumHook(familyTiers, "cardBonus", { ...ctx, pValueBase: pCard.value });
  // Damaststahl (Feuer-Legendär): geschmiedete Karten kämpfen mit doppeltem Schmiedewert (nur der Vergleich, nicht die Basis).
  const damascusValue = damascusCombat(skills, forged, pCard);
  // #289: Farballianz-Gruppen einmal je Stich — an ALLE Farb-Verbraucher (Architekt/Farbserie/Farbfokus) gereicht.
  const alliance = allianceGroups(familyTiers, roles);
  // Architekt value-Gebäude (#202, Tragwerk): +temp Wert VOR dem Vergleich (an dieser Position, Bedingung je Familie).
  const architectValue = archPreNow ? architectValueBonus(archPreNow, actualPos, pCard, alliance) : 0;
  const glacierBuff = glacierActive ? (glacierBuffActive[pCard.id] || 0) : 0; // Frostbund: Wert-Buff auf gebuffte Nicht-Eis-Nachbarkarte
  // Verdichtung (docs §4 Firn): auf einem Gletscher wird der Gebäude-Wertbonus NICHT ausgespielt, sondern in Masse getankt
  // (unten im Auszahlungs-Block). Hier: im Kampf unterdrücken, damit er nicht doppelt (Wert + Masse) zählt.
  const verdichtung = glacierActive && glacierRoles.includes(GLACIER_ROLES.VERDICHTUNG) && !!glacierLocked[actualPos];
  const architectValueEff = verdichtung ? 0 : architectValue;
  // #370 Wochen-Mods (nur Ranked): „Starke Karten" hebt jede Spielerkarte, „Stärkere Gegner" jede Gegnerkarte um +mag.
  const wmCardBonus = weekModMag(state.weekMods, "cardValue");
  const wmEnemyBonus = weekModMag(state.weekMods, "enemyValue");
  const pValue = effectivePlayerValue(pCard.value, perks, ctx) + familyValueBonus + relayBonus + fireValue + blitzValueBonus + anchorPowerBonus + eQuickshotValue + architectValueEff + damascusValue + glacierBuff + wmCardBonus;
  // #226 Großmeister: Gegner-Aufschlag = flacher oppValue + mitwachsender Ramp (+1 Wert alle oppRampEvery Durchläufe),
  // additiv VOR den Debuffs (Frostbiss/Brand kontern ihn → gewollt). Meister/Basis (difficulty=null) → 0, byte-identisch.
  const rampMod = (difficulty && difficulty.oppRampEvery) ? Math.floor(cycle / difficulty.oppRampEvery) : 0;
  const oppValueMod = (difficulty ? (difficulty.oppValue || 0) + rampMod : 0) + wmEnemyBonus;
  // Brand (Feuer, §4.5/§4.7): in dieser Runde gebrandmarkte Gegnerkarten verlieren ihre Brandpunkte an Wert (nie < 0);
  // Brände verschiedener Quellen addieren sich, ohne Deckel — mit Sonnenkern stapeln sie sich über die Runden.
  const brandOnOpp = brandActive[oCard.id] || 0;
  const oValue = Math.max(0, oCard.value + oppValueMod - brandOnOpp);
  const newIceTemp = iceTemp; // (exp: nur durchgereicht, kein Leser mehr)
  let newFrozenOppPending = { ...frozenOppPending };  // Einfrieren: in diesem Durchlauf gesetzte Gegner-Marken (für den nächsten)
  let newFrozenOppActive = frozenOppActive;           // Einfrieren: in diesem Durchlauf aktive Marken (Gegnerkarte verliert)
  let newGlacierBuffPending = { ...glacierBuffPending }; // Frostbund: in diesem Durchlauf gebufften Nachbarkarten (für den nächsten)
  let newGlacierBuffActive = glacierBuffActive;         // Frostbund: in diesem Durchlauf aktive Wert-Buffs
  // Feuer: Brand-Marker für die NÄCHSTE Runde (brandActive wird am Rundenende getauscht; Quellen summieren sich je Karte).
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

  // Sieg-Kontext VOR der Verzweigung — mit den Werten, die ein Sieg hätte (Serie +1, Siege +1). Der Sieg-Zweig
  // übernimmt ihn unverändert; Durchschlag (unten) braucht ihn schon für den Crit-Wurf auf einer Niederlage.
  // #71 Farbserie: Länge der Serie gewonnener Stiche gleicher Farbe INKL. eines Siegs hier. D_SUIT_STREAK IV:
  // ein Farbwechsel HALBIERT die laufende Länge (min 1) statt sie auf 1 zurückzusetzen (suitHalveOnSwitch).
  // Effektive Farbe: pflanzen-grüne Karten (card.green) zählen als „Grün" („G"). #289: verbündete Farben zählen als
  // dieselbe Farbe → sie SETZEN die Farbserie fort statt sie zu brechen.
  const eSuit = pCard.green ? "G" : pCard.suit;
  const suitStreak = colorsAllied(eSuit, winSuit, alliance) ? winSuitStreak + 1
                   : (suitHalveOnSwitch ? Math.max(1, Math.floor(winSuitStreak / 2)) : 1);
  // #195: posInCycle = actualPos (Deckposition), NICHT pos (Stich-Index) — muss zum segmentWins-Reset oben
  // (actualPos % SEGMENT_SIZE) passen. Einziger scoreFlat-Leser: D_FULL_HOUSE.
  const wctx = { winValue: pValue, margin: pValue - oValue, winStreak: winStreak + 1, wins: wins + 1, trickNo, posInCycle: actualPos,
                 lastWinValue, // #71: Präzision (Vergleich mit letztem Siegwert)
                 critFollowArmed, weaknessArmed, weaknessBig, // Crit-Historie: Stand VOR diesem Sieg (D14/D16/D_WEAKNESS IV)
                 suitStreak, recentWinCount, // Farbserie / Volles Haus
                 baseValue: pCard.value, // Basiswert der gespielten Karte
                 coverCount: archPreNow ? (archPreNow.coverCount || 0) : 0, // Gebäude-Perk Dichte Bebauung (D_BEBAUUNG): abgedeckte Positionen
                 hasFormation, lastResult, misfireScore }; // V2 §22.6 D: Formation-Sieg / Wechselspiel / Fehlzündungs-Ladung (D15)
  // Roh-Crit-Chance (ungeklemmt) eines Siegs mit dieser Karte: Perk-Basis + Präzision-Familien + Blitz + Kritanker.
  // Karten-Kontext für die konditionalen Generatoren: Kartenwert / Kartenfarbe / #aktive Formationen / Farbfokus (roles).
  const critFamCtx = { winValue: pValue, suit: eSuit, formCount: activeFormationCount(posForm), focusSuits: (roles && roles.P_COLORFOCUS) || [], alliance }; // #289: grün-bewusste Suit + Farballianz für Farbfokus
  const rawCrit = critChanceRawFor(perks, wctx) + familyCritChanceRaw(familyTiers, critFamCtx)
                  + lightningCritChance(lightning, skills, skillTiers, winStreak + 1) // exp: Passiv je Blitz-Skill + Rampen + Ladungsserie
                  + (anchorType === "crit" ? (aParam("crit") || 0) : 0); // Kritanker (§4.2, Stärke = Stufe)
  // Durchschlag (Blitz-Legendär, §3.7): auch eine Niederlage würfelt den Crit (eigener Zufallsstrom); ein Treffer gewinnt
  // den Stich — der Sieg-Zweig läuft dann als garantierter Crit-Sieg (Crit-Mult, Ladung, Serie, Blitzschlag, alles).
  let durchschlag = false;
  if (lost && lightning && lightning.active && hasDurchschlag(skills)
      && rollCrit(Math.min(1, Math.max(0, rawCrit)), false, rngAtOr(cycle, "durchschlag", pos))) {
    lost = false; won = true; durchschlag = true;
  }

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
      // Schneetreiben (Verwehung): ADDITIV +SEED in die Boden-RESERVE (firnStack) des Nachbarfelds (der Gletscher behält
      // seine volle Sieg-Masse). Hatte er vor dem Sieg 0 Masse, gibt er stattdessen seine Sieg-Masse in die Reserve ab
      // (Transfer). Deterministisch, offener Boden, 4-Nb. #386: Firn nur auf offenen Boden säen, NIE unter einen Gletscher
      // (driftTarget liefert nur offene Felder; zusätzlich `!glacierLocked[tgt]`-Guard).
      if (glacierRoles.includes(GLACIER_ROLES.SCHNEETREIBEN)) {
        const tgt = glacierDriftTarget(actualPos, glacierLocked);
        if (tgt != null && !glacierLocked[tgt]) {
          if (preMass > 0) {
            newFirnStack[tgt] = (newFirnStack[tgt] || 0) + GLACIER_SCHNEETREIBEN_SEED;
          } else {
            const give = Math.min(GLACIER_WIN_MASS, newGlacierMass[actualPos] || 0);
            newGlacierMass[actualPos] -= give; newFirnStack[tgt] = (newFirnStack[tgt] || 0) + give;
          }
        }
      }
    }
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich — genau die Werte, mit denen wctx oben gebaut ist.
    winSuit = eSuit; winSuitStreak = suitStreak; // Farbserie fortschreiben (effektive Farbe: grün = „G")
    // ---- Feuer (exp skill rework, §4): Hitzegewinn (Passiv, Glut, Zunder, Rückzündung), Schmelzpunkt (Überlauf-Wandler)
    //      (Schmelzpunkt, Flächenbrand), Phönix, Glutstahl, Sonnenkern-Score und die Brände für die nächste Runde —
    //      alles im Modul. `fireHeld` = Hitze nach dem Gewinn, vor dem Verbrauch: daran hängt der Hitze-Multiplikator
    //      dieses Siegs (unten im Stack). Feuer-Flats gehen in die multiplizierte Basis; Direkt-Score gibt es nicht.
    let fireFlat = 0;
    let fireHeld = 0;
    if (heat && heat.active) {
      const r = fireOnWin(heat, skills, skillTiers, {
        margin: pValue - oValue, streak: serieStreak, lastResult, card: pCard, forged, brandOnOpp,
        valueOver: pValue - damascusValue - (pCard.baseRank ?? pCard.value), // Glutstahl: Kampfwert über dem Grundwert, ohne den Damast-Kampfbonus
        oppId: oCard.id, oppIndex: oppOrder[actualPos], oppDeck,
      });
      heat = r.heat; fireFlat = r.flat; fireHeld = r.held;
      for (const b of r.brands) { newBrandPending[b.id] = (newBrandPending[b.id] || 0) + b.value; brandTotal += 1; } // #270.2: Motor-Zähler „Brände"
    }
    // ---- Pflanze-Fraktion (v0): Wachstum (Sieg → +1), Reife-Recolor, Wurzeln (Score/Wert), Aussaat/Ranken (Breite/Grün),
    //      Blüte/Photosynthese/Blätterdach (Grün-Payoff), Ausläufer (Kolonisieren/Ernten). Grün = card.green.
    let plantFlat = 0;
    let plantFormMult = 1;
    let plantDirect = 0; // Pflanze-Legendär-Reshape: DIREKTe, post-stack, gedeckelte Dividende aus den Fluten (unten zu `gained`)
    if ((activeArchetypes || []).includes("plant")) {
      const inFormation = positionHasFormation(posForm);
      const plantCommit = commitScale(plantSkillCount(skills), commitSlots); // Bekenntnis-Skalierung (cross-health) für die post-stack Direkt-Dividenden (#270.2 + #Ceiling)
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
    // Crit ZUERST bestimmen — die Crit-Flats (scoreFlatOnCrit) müssen in die multiplizierte Basis. Der Crit-Wurf
    // verbraucht rng nur, wenn wirklich gewürfelt wird → rng-Reihenfolge unverändert (kein Drift). rawCrit steht oben
    // (vor der Verzweigung, für Durchschlag) — Perk-Basis + Präzision + Blitz-Passiv/Rampen + Kritanker, ungeklemmt.
    critChance = Math.min(1, Math.max(0, rawCrit));             // Anzeige/normaler Wurf (geklemmt)
    // Crit-Ctx trägt rawCrit — von D-Crit-Flats (D19 Überschusskrit) UND L6 „Raserei" (critMultBonus, #115) gebraucht.
    const critCtx = { ...wctx, rawCrit };
    // Basis 2,25 + Präzision „Wucht" (familyCritMult) + L6-Überschuss + Blitz (Entladung-Rampe, Donnergott, Spannungsstau,
    // Vorentladung) + Stapel der Siegkarte (§7.12: +ION_CRIT_MULT_PER_STACK je wirksamem Stapel) + Systemregel (§1: Überschuss
    // über 100 % → sehr kleiner Crit-Mult-Bonus, alle Fraktionen).
    critMultiplier = critMultiplierFor(perks, critCtx) + familyCritMult(familyTiers)
                   + lightningCritMult(lightning, skills, skillTiers, serieStreak) + lightIonCritMult(pCard, skills, skillTiers) + overcritMult(rawCrit);
    // Entladung Episch: der Crit, der die Leiste füllt, zählt mit doppeltem Crit-Multiplikator. Vorschau auf denselben
    // Ladungsgewinn, den ein Crit unten wirklich bringt — der Multiplikator wird nur bei einem Crit gelesen.
    if (lightning && lightning.active && lightParam(skills, skillTiers, LIGHT.ENTLADUNG, "fillDouble")
        && critFillsBar(lightning, skills, skillTiers, { streak: serieStreak })) critMultiplier *= 2;
    // BACKSTOP (Crit-Bändigung): der fertige Crit-Multiplikator wird hart gedeckelt — bewusst NACH allen Additionen,
    // damit keine Quelle (auch keine offene Rampe) ihn umgehen kann. Der Owner hält den Deckel (docs/skill-rework.md §1).
    critMultiplier = Math.min(critMultiplier, C.CRIT_MULT_CAP);
    isCrit = rollCrit(critChance, forceCrit || durchschlag, rngAtOr(cycle, "crit", pos)) && !reducedRepeat; // #205 Glückslandschaft: fester Wurf je (cycle,pos); forceCrit = Henker; durchschlag = gewonnene Niederlage (Blitz-L); reducedRepeat = Zeitsegment III
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
    // #370 Bau-Boost (Wochen-Mod, nur Ranked): Architekt-Gebäude-Boni verdoppeln — Flat + Serien-Flat additiv, der
    // Mult-Überschuss über 1 verdoppelt (neutrale Gebäude ohne Wirkung bleiben unberührt).
    // [FIX] Nur den GEWINN-Anteil skalieren. Das gamble-Gebäude (Crit-Wette) schreibt bei ausbleibendem Crit einen
    //   NEGATIVEN Flat (`flat += ctx.isCrit ? e.crit : -e.penalty`, architect.js) — pauschales ×2 verdoppelte damit
    //   ausgerechnet die Strafe, ein positiver Mod verschlechterte also gezielt Risiko-Bauten. Die Behandlung ist
    //   jetzt symmetrisch zum Multiplikator, der schon immer nur den Überschuss über 1 verdoppelt hat.
    if (hasWeekMod(state.weekMods, "buildBoost")) applyBuildBoost(architectScoreRes, BOOST_FACTOR);
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
                      + lightIonScore(pCard, skills, skillTiers) + fireFlat + plantFlat // exp: Stapel-Score der Siegkarte (Kurzschluss zählt ab Schwelle doppelt)
                      + (anchorType === "score" ? (aParam("score") || 0) : 0) // Punkteanker (§4.2, Stärke = Stufe)
                      + (anchorType === "power" ? (aParam("winScore") || 0) : 0) // Kraftanker IV: Sieg dort +100 Score
                      + architectScoreRes.flat // Architekt Handelsbauten (#202): Flat-Score, s. o.
                      + interplayStored; // D_INTERPLAY IV: der in Niederlagen gebankte Score wird mit diesem Sieg als Flat ausgezahlt
    // #270: Fraktions-Flat-Anteile zum Ertrag (Roh-Score VOR dem Multiplikator-Stack). Blitz EIN Kanal; Feuer in
    // Grund/Weißglut gespalten (Pflanze-Kanäle Wurzel/Blüte/Ernte wurden schon an ihren Quellen oben akkumuliert).
    lightYield += lightIonScore(pCard, skills, skillTiers);
    fireBase += fireFlat;
    // Score-Stapelung (§15/§22.7): Basis × Serie(#39) × Perk-scoreMult × Serien-Stat × Formations-Multiplikator
    // × Formations-Stat, DANN Crit. Zu benannten Faktoren gruppiert (identisches Produkt) → eine Quelle für
    // Score UND Ergebnis-Aufschlüsselung (§17), kein Drift.
    const flats = scoreBase - C.SCORE_PER_WIN;                                         // additive Boni (Perk-/Crit-Flats, Ion, L5-Jackpot)
    const streakMult = streakBaseMult(serieStreak); // Serie (#39). #267: der Serien-Stat-Booster ist weg — nur noch das Basis-System.
    // Legendär-Perks-Rework (#203) — der ×-Multiplikator-Raum ist die family-free Legendär-Lane. Henker (Score, Kat. D)
    // faltet in perkMult; Brennpunkt/Sammler (Formation, Kat. E) falten unten in formMult → §17-Breakdown bleibt exakt.
    const henkerMult = (ownsFlag(perks, "henker") && actualPos >= C.HENKER_ZONE_START) ? C.HENKER_MULT : 1; // Segment-Finale ×
    // Hochseil (L_HOCH, v0.3): × solange der laufende Durchlauf OHNE Niederlage ist. cycleLosses zählt die Niederlagen
    // DIESES Durchlaufs (Reset am Durchlauf-Ende) — bei einer Niederlage ist der Perk bis zum nächsten Durchlauf aus.
    // Das ist bewusst ein SPÄTSPIEL-Perk: gemessen sind 0 % der Durchläufe 1–10 niederlagenfrei, aber 70 % der
    // Durchläufe 41–50. Er greift also genau dort, wo der Score exponentiell läuft → MULT niedrig halten.
    const hochseilMult = (ownsFlag(perks, "hochseil") && cycleLosses === 0) ? C.HOCHSEIL_MULT : 1;
    // Taktschlag (L_TAKT, v0.3): der ABSCHLIESSENDE Stich eines komplett gewonnenen Segments zählt ×. segmentWins
    // enthält diesen Sieg bereits (Zähler oben, vor dem Scoring) ⇒ volles Segment ⟺ segmentWins === SEGMENT_SIZE.
    const taktschlagMult = (ownsFlag(perks, "taktschlag") && actualPos % SEGMENT_SIZE === SEGMENT_SIZE - 1
      && segmentWins === SEGMENT_SIZE) ? C.TAKTSCHLAG_MULT : 1;
    const perkMult = prodHook(perks, "scoreMult", wctx) * familyProdHook(familyTiers, "scoreMult", wctx)
      * henkerMult * hochseilMult * taktschlagMult; // globale Perk-/Familien-Multiplikatoren + Henker (#203) + Hochseil/Taktschlag (v0.3)
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
    // Ballast (L_BALL, v0.3, NACHTEIL): × auf den Formations-Multiplikator; der Preis (BALLAST_ENERGY weniger
    // Formationsenergie je Aufstellphase) hängt als negativer extraSwap am Perk und läuft über die bestehende
    // Energie-Summe (reducer.js CONFIRM_FORMATION / engine.js Aufstell-Phase) — kein eigener Hook nötig.
    const ballastMult = ownsFlag(perks, "ballast") ? C.BALLAST_FORM_MULT : 1;
    let formMult = formBaseEff * plantFormMult * brennpunktMult * sammlerMult * ballastMult; // + Photosynthese (plantFormMult) + Brennpunkt/Sammler (#203) + Ballast (v0.3)
    // #370 Formations-Boost (Wochen-Mod, nur Ranked): den Formations-BONUS (Überschuss über 1) verdoppeln — neutraler
    // Sieg (formMult==1) bleibt unberührt, Formations-Builds skalieren stärker. Wirkt auch auf glacierWinMult (nutzt formMult).
    if (hasWeekMod(state.weekMods, "formBoost")) formMult = 1 + (formMult - 1) * BOOST_FACTOR;
    // Feuer (§4.2/§4.5): der Hitze-Multiplikator (je 10 % gehaltener Hitze; Sonnenzorn: Spitze, doppelt; Weißglut über
    // 100) und Verbrennung (Sieg ab dem Vorsprung der Stufe ×1,5) sind EIN eigener Faktor auf den ganzen Sieg-Score —
    // ein Halte-Build gewinnt über Wert und Formationen, nicht über Feuer-Flats. Gelesen wird die Hitze nach dem
    // Gewinn dieses Siegs und vor dem Verbrauch (fireHeld).
    const fireMult = (heat && heat.active)
      ? heatMult(skills, skillTiers, fireHeld, heat.peak) * verbrennungMult(skills, skillTiers, pValue - oValue)
        * feuersturmMult(skills, skillTiers, fireHeld, heat.max || C.HEAT_MAX, serieStreak) : 1; // §7.17: Feuersturm, Serie zu Score bei voller Leiste
    // architectMult (#202, Architekt-Score-Gebäude: Struktur/Schatzkammer) läuft als eigener Faktor am Ende des Stacks.
    // #Pool Batch 4 (gamble/Risiko): Boden — der Architekt-Abzug (negativer Flat) darf den Stich höchstens auf 0 drücken,
    // nie ins Minus (sonst kippen die nachgelagerten Multiplikatoren). Bei Basis 400 praktisch immer ein No-op.
    // Serien-Flat (Reihenhaus) wird NEBEN der serien-multiplizierten Basis addiert → er bekommt Perk/Formation/Crit,
    // aber NICHT den globalen Serien-Mult (kein Doppel-Dip). Rest des Stacks unverändert.
    const streakMuldBase = Math.max(0, scoreBase) * streakMult;
    scoreBeforeCrit = (streakMuldBase + architectStreakFlat) * perkMult * formMult * afterglowMult * coreMult * fireMult * architectMult;
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    // Doppelentladung (Blitz-Legendär, §3.7): Crit mit einer ionisierten Karte — der Blitz schlägt zweimal ein, der ganze
    // gewertete Stich (Basis mal Multiplikatoren) zählt DOPPELENTLADUNG_STRIKE-fach. Kein Kreislauf: speist keine Leiste.
    const strikeMult = (isCrit && (pCard.ionStacks || 0) > 0 && hasDoppelentladung(skills)) ? C.DOPPELENTLADUNG_STRIKE : 1;
    gained *= strikeMult;
    // Eis: derselbe multiplikative Stack (ohne additive Flats) skaliert auch den Gletscher-Bruch dieses Stichs (unten).
    glacierWinMult = streakMult * perkMult * formMult * afterglowMult * coreMult * fireMult * architectMult * (isCrit ? critMultiplier : 1);
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
    // Feuer-Anteil (#270, nur Anzeige): der Hitze-Multiplikator und die Verbrennung als Faktor-Anteil an `gained` —
    // dieselbe Näherung wie formationScore. Die Feuer-Flats kamen oben bei scoreBase in den Feuer-Score-Kanal.
    if (fireMult > 1) fireHeat += gained * (1 - 1 / fireMult);
    // exp skill rework: Blitz und Feuer haben keinen Direkt-Score mehr (§1) — Stapel-Score und Feuer-Flats stehen in
    // der Basis, die Legendären wirken über Leiste, Stapel, Stufe, Hitze und Stich (die Breakdown-Felder bleiben auf 0).
    const lightDirect = 0;
    const fireDirectApplied = 0;
    // Voller Stich-Ertrag OHNE die Vabanque-Auszahlung — Bezugsgröße der Wette (s. u.) und Basis für `gained`.
    const gainedPreBet = gained + fireDirectApplied + lightDirect + plantDirect;
    // Vabanque (#203, Eröffnungs-Wette): die ersten VABANQUE_TRICKS Stiche eines DURCHLAUFS in Folge gewonnen →
    // Auszahlung DIREKT (post-stack). pos = Stich-Index im Durchlauf (VOR pos+=1); cycleWins zählt die Siege inkl.
    // dieses → am TRICKS-ten Stich (pos = TRICKS−1) sind alle Eröffnungsstiche gewonnen ⟺ cycleWins === TRICKS.
    //
    // SELBSTSKALIEREND (Ablösung des flachen VABANQUE_SCORE): die Wette zahlt VABANQUE_MULT × den Score der
    // EIGENEN Eröffnung (Summe der VABANQUE_TRICKS Eröffnungsstiche dieses Durchlaufs, `cycleOpenScore`), nicht
    // mehr einen festen Betrag. Grund: perkDirect läuft post-stack an allen Multiplikatoren vorbei, ein fester
    // Betrag verliert also mit jedem Score-Inflationsschritt an Wirkung — gemessen (sim/perk-impact.mjs) war der
    // flache Wert auf 1,03× abgesunken, praktisch wirkungslos, genau wie die anderen Flat-Perks (Zinseszins/
    // Richtfest). Ein Vielfaches der eigenen Eröffnung wächst mit der Ökonomie mit und bleibt „Verstärker, kein
    // Motor": ein starker Build bekommt mehr, aber verhältnismäßig dasselbe.
    //
    // KEIN LAUF-DECKEL (mehr): die Wette zahlt JEDE gefegte Eröffnung. Der frühere VABANQUE_MAX_PAYOUTS-Deckel (3)
    // stammt aus #203 und stützte sich auf die Annahme, ein Greedy-Spieler treffe die Eröffnung nur ~2×/Lauf, ein
    // Front-Loader dagegen 24–60×. Nachgemessen (sim, 2026-08-15) stimmt beides nicht mehr: normal werden median
    // 16 von 50 Eröffnungen gefegt, der Deckel band also in 90 % der Läufe — der Spieler sah 13 erfüllte
    // Bedingungen ohne Wirkung. Und weil die Sweeps SPÄT liegen (Durchlauf 31–50: 686 von 940 beobachteten),
    // griffen die 3 Auszahlungen ausgerechnet die frühesten und kleinsten ab: der Perk starb, bevor er etwas wert war.
    //
    // Der Front-Load-Missbrauch trägt sich im heutigen Build selbst nicht mehr: mit dem Front-Load-Gegner
    // (sim/formation.js frontLoadFormationStep) steigen die Sweeps zwar auf 38/50, der Median-Score FÄLLT dabei
    // aber von 38,2M auf 25,2M — das Sortieren der Eröffnung nach Kartenwert zerlegt die Formationen im ersten
    // Segment. Wer die Eröffnung erzwingt, zahlt mehr, als die Wette einbringt. Deshalb braucht es keinen Deckel;
    // die Selbstskalierung (× Eröffnungs-Score) hält den Beitrag ohnehin proportional.
    if (pos < C.VABANQUE_TRICKS) cycleOpenScore += gainedPreBet; // Eröffnungs-Score dieses Durchlaufs (ohne die Wette selbst)
    let perkDirect = 0;
    if (ownsFlag(perks, "vabanque") && pos === C.VABANQUE_TRICKS - 1 && cycleWins === C.VABANQUE_TRICKS) {
      perkDirect = cycleOpenScore * C.VABANQUE_MULT; vabanquePaid += 1; // vabanquePaid nur noch Telemetrie (kein Gate)
    }
    gained = gainedPreBet + perkDirect;
    score += gained;
    // #270: post-stack Direkt-Dividenden zum Fraktions-Ertrag (die Flat-Anteile kamen bei scoreBase oben dazu).
    // Pflanze-Legendär-Direkt wurde schon oben in Wurzel/Ernte gebucht; Blitz und Feuer haben keinen Direkt-Anteil.
    lightYield += lightDirect;
    // streakFlat/fireMult stehen mit im Breakdown, damit die Stich-Aufschlüsselung (UI) die Kette EXAKT
    // nachrechnen kann: (Basis×Serie + streakFlat) × (Perks×Feuer×Architekt) × (Form×Nachhall×Kern) × Crit
    // + Direkt-Anteile = total. Ohne diese beiden blieb ein unerklärter Rest stehen. Reine Anzeige-Daten.
    breakdown = { base: C.SCORE_PER_WIN, flats, streakFlat: architectStreakFlat, streakMult, perkMult, fireMult, formMult, formBase: formBaseEff, afterglowMult, coreMult, architectMult, critMult: isCrit ? critMultiplier : 1, strikeMult, fireDirect: fireDirectApplied, lightDirect, plantDirect, perkDirect, total: gained };
    // Blitz (exp skill rework, §3): Ladungsgewinn dieses Siegs — Passiv (+1 je Crit), Blitzableiter (§7.18: auch je Sieg
    // ohne Crit auf Episch), Überspannung, Ladungsserie Episch — mit fortgeschriebenen Zählern; Blitzschlag (jeder N. Crit
    // ionisiert die Siegkarte); Spannungsstau. Die volle Leiste zündet NACH der Verzweigung (unten), einmal je Stich.
    // Kein Selbstwachstum ionisierter Siegkarten mehr (Lesart A).
    if (lightning && lightning.active) {
      const { gain, next } = chargeGainOnWin(lightning, skills, skillTiers, { isCrit, streak: serieStreak, card: pCard });
      lightning = { ...next, charge: (next.charge || 0) + gain };
      if (isCrit) {
        const bs = blitzschlagStacks(lightning, skills, skillTiers);
        if (bs > 0) { deck = deck.map((c) => (c.id === pCard.id ? { ...c, ionStacks: (c.ionStacks || 0) + bs } : c)); ionTotal += bs; }
      }
      lightning = stauAfterWin(lightning, skills, skillTiers, isCrit);
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
    cycleScoreSum += gained;                          // Richtfest: Ertrag DIESES Durchlaufs (Bezugsgröße der Struktur-Dividende)
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
    // ---- Feuer (exp skill rework, §4): Kühlung (Passiv, Glutbett-Boden, Phönixfeuer heizt), Rückstand für Rückzündung
    //      merken, Brandmal Episch brandmarkt die Gegnerkarte, die gewonnen hat — alles im Modul. Phönixfeuer (§7.19):
    //      bei voller Leiste hält die erste Niederlage jeder Runde die Serie — deshalb VOR dem Serienschutz, der dann
    //      keine Ladung ausgibt.
    let phoenixHeld = false;
    if (heat && heat.active) {
      const r = fireOnLoss(heat, skills, skillTiers, { deficit: oValue - pValue, oppId: oCard.id });
      heat = r.heat; phoenixHeld = !!r.streakHeld;
      for (const b of r.brands) { newBrandPending[b.id] = (newBrandPending[b.id] || 0) + b.value; brandTotal += 1; }
    }
    // Blitz (exp skill rework): Serienschutz (Ladung ab dem Anteil der Stufe hält die Serie und wird verbraucht; Episch
    // einmal je Runde gratis) — im Modul.
    let serienschutzHeld = false;
    if (lightning && lightning.active) {
      const r = lightningOnLoss(lightning, skills, skillTiers, { alreadyHeld: anchorNoReset || phoenixHeld });
      lightning = r.lightning; serienschutzHeld = r.streakHeld;
    }
    // Eis-Neudesign (docs §4 Frostgriff — Eispanzer): eine Niederlage NEBEN einem Gletscher ist folgenlos (Serie hält)
    // UND füttert Masse in die angrenzenden Gletscher — der Gletscher frisst, was an ihm zerbricht. Prinzip heil: die Karte
    // verliert weiter (kostet den Stich), nur die Folgen (Serienbruch) sind abgeschirmt.
    const glacierShield = glacierActive && glacierRoles.includes(GLACIER_ROLES.EISPANZER)
      && glacierNeighbors4(actualPos).some((p) => glacierLocked[p]);
    if (glacierShield) for (const nb of glacierNeighbors4(actualPos)) if (glacierLocked[nb]) newGlacierMass[nb] = (newGlacierMass[nb] || 0) + GLACIER_EISPANZER_MASS;
    const streakNoReset = anchorNoReset || serienschutzHeld || glacierShield || phoenixHeld;
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

  // Blitz (exp skill rework, §3.2): volle Leiste → +1 Leiste, die NÄCHSTE Karte in der Reihenfolge wird ionisiert
  // (Kettenblitz §7.18: die tiefste Karte dazu), Gewitterfront/Entladung rampen, Ionenfeld lädt das Feld, die Ladung fällt
  // auf den Reststrom-Boden. Höchstens einmal je Stich, nach Sieg UND Niederlage (Ladung über der Leiste, die ein Stich
  // hinterlässt, zündet beim nächsten). `maxCharge` folgt dem Build (Donnergott 7). Das Ionenfeld zählt VOR der Leiste
  // herunter: der Stich, der es lädt, zählt nicht mit — die nächsten n Stiche tragen es.
  let barFilled = false, barStacks = 0;
  if (lightning && lightning.active) {
    const lMax = maxChargeFor(skills);
    if (lightning.maxCharge !== lMax) lightning = { ...lightning, maxCharge: lMax };
    lightning = fieldTick(lightning);
    const f = lightFillBar(lightning, skills, skillTiers, deck, playerOrder, actualPos);
    if (f.filled) { lightning = f.lightning; deck = f.deck; ionTotal += f.stacks; barFilled = true; barStacks = f.stacks; }
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

  // Zinseszins-Bank: EINLAGE. Jeder gewonnene Stich legt einen Anteil seines Scores aufs Kapital. Bewusst HIER, ganz
  // am Ende der Stich-Wertung — `gained` trägt an dieser Stelle alle Nachträge (Konsum, Gletscher-Bruch/Erstarrung).
  // Das Kapital ist KEIN Score; es zahlt erst am Durchlauf-Ende über den Zinssatz aus (s. u.).
  if (won && ownsFlag(perks, "zinseszins")) zinsCapital += gained * C.ZINS_DEPOSIT;

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
    durchschlag, barFilled, barStacks, // exp Blitz: gewonnene Niederlage (Durchschlag) · volle Leiste in diesem Stich + ionisierte Stapel (Anzeige)
    isRepeatedSegmentTrick: isRepeat, originalPosition: actualPos, segmentIndex: timeSeg, // Zeitsegment (§8 A-L1 / §13)
    breakdown, // Ergebnis-Aufschlüsselung (§17): { base, flats, streakMult, perkMult, formMult, critMult, total } bei Sieg, sonst null
    // #eis PER-KARTE: Frost-Anzeige gehört NUR auf die tatsächlich gefrorene Gletscher-Karte dieses Stichs (NICHT als
    //   globaler Basis-Frost auf jede gespielte Karte). pGlacier = die gespielte Karte sitzt auf einem gefrorenen
    //   Gletscher-Feld; pGlacierMass = dessen aktuelle Firn-Masse (0..12). Battlefield frostet damit exakt diese Karte.
    pGlacier: !!(glacierActive && glacierLocked[actualPos]),
    pGlacierMass: (glacierActive && glacierLocked[actualPos]) ? (newGlacierMass[actualPos] || 0) : 0,
  };

  // Durchlauf-Ende: Score-Effekte am Durchlauf-Ende, dann NUR das Gegnerdeck NEU MISCHEN (Spieler-Reihenfolge
  // bleibt persistent, §22.1) und eine Auswahl anbieten. Nach MAX_CYCLES Durchläufen endet der Run (§22.1).
  pos += 1;
  let phase = "play";
  let newOffer = offer;
  let newSkillOffer = skillOffer;
  let newSkillOfferTiers = state.skillOfferTiers || null; // exp skill rework: tier per offered skill (rollSkillOfferTiers)
  let newSkillDoors = state.skillDoors || null; // exp skill rework: the two doors of a skill phase (buildSkillDoors)
  let newFormationEnergy = formationEnergy;
  let newFormationSwaps = formationSwaps;
  // Architekt (#202): Meilenstein-Zähler nach diesem Stich fortschreiben (bump = Gebäude-id eines Siegs auf seiner Abdeckung).
  let newArchitect = architect;
  if (architectEnabled && architect && architectBump != null)
    newArchitect = { ...architect, winCounters: { ...architect.winCounters, [architectBump]: (architect.winCounters[architectBump] || 0) + 1 } };
  const newArchitectPre = archPreNow;
  if (pos >= cycleLen) { // Zeitsegment (§8 A-L1): Durchlauf endet nach cycleLen Stichen (40, mit Zeitsegment 45)
    cycle += 1;
    lightning = lightningCycleEnd(lightning); // exp Blitz: Gratis-Serienschutz (Episch) je Runde wieder frei
    // Eis-Neudesign (docs §2.6): Ewiger Frost — bedingungsloser Masse-Tick je Durchlauf auf jeden Gletscher (nach Auszahlung).
    if (glacierActive) newGlacierMass = ewigerFrostTick(newGlacierMass, glacierLocked);
    // Dauerfrost (docs §4 Firn): offener Boden friert am tiefsten — passiver Frost in die Boden-Reserve (#386 firnStack).
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.DAUERFROST)) newFirnStack = dauerfrostTick(newFirnStack, glacierLocked);
    // Packeis / Verzahnung (docs §4 Eisschild): Dichte-Bonus je Gletscher-Nachbar / Cluster-Größe (Eisbrücke-adjazenz-aware).
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.PACKEIS)) newGlacierMass = packeisTick(newGlacierMass, glacierLocked, glacierNF);
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.VERZAHNUNG)) newGlacierMass = verzahnungTick(newGlacierMass, glacierLocked, glacierNF);
    // Eiszeit (Legendär): brettweite Flut in die Boden-RESERVE (#386 firnStack) + das höchste ungefrorene Feld (nach Reserve)
    // friert zum Gletscher ein (Karten frieren nach und nach). Der neu gefrorene Gletscher startet mit Masse 0 (glacierMass
    // bleibt unberührt) und zieht ab dem nächsten Rundenstart aus seiner Reserve auf.
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.L_EISZEIT)) {
      const ez = eiszeitTick(newFirnStack, newGlacierLocked, undefined, undefined, challengeBlockForm);
      newFirnStack = ez.mass; newGlacierLocked = ez.locked;
    }
    // ---- Legendär-Perks-Rework (#203): Durchlauf-Ende-Payoffs, VOR dem Rundenscore-Tracking (dem beendeten Durchlauf
    //      attribuiert). Zinseszins — ABRECHNUNG der Bank (s. u.). Echo — der beste Stich dieses Durchlaufs wird ein
    //      zweites Mal gutgeschrieben (× ECHO_FACTOR).
    let cycleEndScore = 0;
    // Zinseszins-Bank: ABRECHNUNG. Hürde genommen (Sieg-Anteil ≥ ZINS_HURDLE_RATE der Durchlauf-Länge) → die Bank zahlt
    // Kapital × Zinssatz aus und der Satz steigt eine Stufe (Deckel ZINS_RATE_MAX); das Kapital bleibt liegen und
    // wächst weiter mit dem Score. Verfehlt → CRASH: ein Teil des Kapitals ist weg, der Satz fällt zurück.
    // Die Auszahlung selbst zahlt NICHT wieder ein (sie läuft nicht über die Einlage oben) → kein Selbst-Compounding.
    if (ownsFlag(perks, "zinseszins")) {
      const hurdle = zinsHurdle(cycleLen);
      if (cycleWins >= hurdle) {
        const zinsPayout = zinsCapital * zinsRate;
        cycleEndScore += zinsPayout;
        zinsPaidTotal += zinsPayout;                 // #zins: kumulierte Auszahlung über den Lauf (nur Anzeige, fließt nicht ins Scoring zurück)
        zinsRate = Math.min(zinsRate + C.ZINS_RATE_STEP, C.ZINS_RATE_MAX);
      } else {
        zinsCapital *= C.ZINS_CRASH_KEEP;
        zinsRate = Math.max(C.ZINS_RATE_START, zinsRate - C.ZINS_CRASH_STEPS * C.ZINS_RATE_STEP);
      }
    }
    if (ownsFlag(perks, "echo")) cycleEndScore += cycleBestTrick * C.ECHO_FACTOR;
    // Richtfest (Gebäude-Legendäres): je vollendeter Struktur eine Dividende auf den Ertrag DIESES Durchlaufs.
    // SELBSTSKALIEREND wie Vabanque (v0.2): der frühere flache Schritt (250 Score je Struktur, aufgestapelt) war gegen
    // die heutige Score-Höhe bedeutungslos — gemessen 1,08× auch mit korrekt bauendem Architekten (median 10 Strukturen).
    // Bezugsgröße ist die Summe der STICH-Erträge des Durchlaufs (cycleScoreSum), NICHT cycleEndScore: sonst würden
    // Zinseszins/Echo/Richtfest übereinander multiplizieren (die Vabanque×Echo-Lehre — Perk-auf-Perk-Kaskaden reißen
    // den Schwanz auf). Der „stapelnde" Charakter bleibt: structureCount wächst über den Lauf, während gebaut wird.
    if (ownsFlag(perks, "richtfest") && archPreNow) {
      richtfestBonus = cycleScoreSum * C.RICHTFEST_STEP * (archPreNow.structureCount || 0); // Telemetrie: Auszahlung dieses Durchlaufs
      cycleEndScore += richtfestBonus;
    }
    // Schmiede (L_SCHM, v0.3): die schwächste Deckkarte wird dauerhaft aufgewertet. Deterministisch: bei Gleichstand
    // die Karte mit der kleinsten id, sonst hinge das Ergebnis an der Deck-Reihenfolge (Determinismus-Invariante §9).
    // BEWUSST OHNE DECKEL (Entscheidung 2026-08-15): über 50 Durchläufe bis zu +50 auf ein Deck mit Gesamtwert ~220.
    const schmiedeStep = flagValue(perks, "schmiede");
    if (schmiedeStep) {
      let weakest = null;
      for (const c of deck) if (!weakest || c.value < weakest.value || (c.value === weakest.value && c.id < weakest.id)) weakest = c;
      if (weakest) deck = deck.map((c) => (c.id === weakest.id ? { ...c, value: c.value + schmiedeStep } : c));
    }
    score += cycleEndScore;
    // Per-Karte-Ledger (Sim S1): die Durchlauf-Ende-Payoffs dem gerade gespielten Schluss-Stich gutschreiben, damit die
    // Score-Summe je Karte weiterhin exakt `score` reproduziert (metrics.observe liest lastTrick.gained). lastTrick ist
    // oben schon gebaut; Mutation einer const-Objekt-Property ist erlaubt.
    if (cycleEndScore) { lastTrick.gained += cycleEndScore; lastTrick.scoreGain += cycleEndScore; }
    cycleWins = 0; cycleLosses = 0; cycleBestTrick = 0; sammlerTypes = []; cycleOpenScore = 0; cycleScoreSum = 0; // Pro-Durchlauf-States zurücksetzen (#203)
    // #131 Rundenscore: Zuwachs dieses gerade beendeten Durchlaufs (score enthält bereits den letzten Stich + #203-Payoffs)
    // + Rollover, damit das nächste Entscheidungs-Panel Rundenscore und %-Differenz zur Vorrunde zeigen kann.
    prevCycleScore = lastCycleScore;
    lastCycleScore = score - scoreAtCycleStart;
    scoreAtCycleStart = score;
    // #98: temporäre Positions-Boni enden mit dem Durchlauf — sonst würde ein an Position 40 armierter
    // Relay (C4/C5) auf Position 1 des nächsten (persistenten) Durchlaufs durchsickern.
    successorQueue = [];
    // ---- Feuer (exp skill rework, §4.5/§4.7): Rundenende — Schmiede (kostet Hitze, niedrigste Karte +3 dauerhaft,
    //      Episch zwei Karten), Damaststahl (niedrigste Karte ohne Preis), Phönix-Neuzündung. Alles im Modul; die
    //      Schmiedewerte bleiben in den Karten gebacken.
    if (heat && heat.active) {
      const r = fireCycleEnd(heat, skills, skillTiers, deck, newForged);
      heat = r.heat; deck = r.deck; newForged = r.forged;
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
      // Feuer-Brand: die in der beendeten Runde gesetzten Brände werden jetzt aktiv (−Wert). Normal ersetzen sie die
      // alten; mit Sonnenkern (§4.7) stapeln sie sich darauf, über die Runden, ohne Deckel (der Wert fällt nie unter 0).
      newBrandActive = nextBrandActive(skills, newBrandActive, newBrandPending);
      newBrandPending = {};
      // Entscheidung VOR dem neuen Durchlauf nach dem Plan (Shop-Spec §2.2): schedule[cycle]
      // (cycle wurde oben erhöht → Index cycle = Entscheid vor Durchlauf cycle+1). Start-Entscheid via START_RUN.
      // Dev-Run (Test-Layout): state.devSchedule überschreibt den globalen Plan pro Lauf; null → Bestand.
      const decision = (state.devSchedule || C.DECISION_SCHEDULE)[cycle];
      // #370/#381 Legendär-Takt (nur Ranked): jede mag-te PERK-PHASE (nicht jede Runde) bietet 3 legendäre statt normale
      // Perks. Ordnungszahl der Perk-Phase über perkPhaseAt (0 = keine Perk-Phase) → betrifft NUR bestehende Perk-Phasen,
      // wandelt keine Nicht-Perk-Runde um. mag 0 (Nicht-Ranked) → No-op (byte-identisch).
      const legTaktMag = weekModMag(state.weekMods, "legTakt");
      const legTaktPP = C.perkPhaseAt(state.devSchedule || C.DECISION_SCHEDULE, cycle);
      const onLegTakt = legTaktMag > 0 && legTaktPP > 0 && legTaktPP % legTaktMag === 0;
      // Reward-Ableitungen aus dem Progressions-Baum (Normal-/Meister-Lauf; Standard/Sim = neutral: Shift 0, Mult ×1).
      const rareShift = state.treeRareShift || 0;
      // #369 §4: Legendär-Chance (Perks UND Gebäude) — 0 ohne „Legendär"-Knoten (?? bewahrt die 0), sonst ×(1 + Drop·Schritt).
      // Sim/Standard/Dev → 1 (byte-identisch). Die Tier-I..IV-Deckelung der Gebäude läuft separat über rareCapEff.
      const legMultPerk = state.treeLegMult ?? 1;
      const legMultArch = state.treeLegMult ?? 1;
      const rareCapEff = state.rareCap || 4;    // Rarität-Deckel aus dem Baum (4 = kein Deckel)
      const rareFloorEff = state.rareFloor || 1; // #370 Perk-Segen: Rarität-Boden (1 = kein Boden)
      // #370 Wochen-Mods (nur Ranked): Perk-Verknappung → nur 1 Perk je Auswahl · Skill-Verknappung → 1 Skill je Fraktion
      //   (Default 12 = 3/Fraktion → 4 = 1/Fraktion). Sonst die Konstanten (Normal-/Sim-Lauf byte-identisch).
      // exp: beide über rules.js — ohne state.rules exakt die alten Werte (Wochen-Mod vor Konstante).
      const perksOffered = perksOfferedFor(state);
      const skillP = skillOfferParams(state);
      if (decision === "skill") {
        // exp skill rework: a Dev-Run shows the flat full catalog; every other run gets the two doors (docs/skill-rework.md
        // §1) with the tiers (and the legendary chance per slot) rolled from the addressed streams (seed, cycle, "skill", 0)
        // and (…, "tiers") — revealed only after CHOOSE_DOOR.
        if (state.devMode) {
          const rolled = devSkillOffer();
          phase = "levelup"; newSkillOffer = rolled.offer; newSkillOfferTiers = rolled.tiers;
        } else {
          const doors = buildSkillDoors(skills, activeArchetypes, rngAtOr(cycle, "skill", 0), rngAtOr(cycle, "skill", 0, "tiers"),
            { unlockedArchetypes: state.unlockedArchetypes, maxArchetypes: skillP.maxArchetypes, size: skillP.doorSize }); // §4b: Archetyp-Gatung
          if (doors.length > 0) { phase = "levelup"; newSkillDoors = doors; }
          else { const off = buildPerkOffer(perks, familyTiers, rngAtOr(cycle, "perk", 0), perksOffered, perkLegendaryChance(shop) * legMultPerk, rareShift, architectEnabled, 0, rareCapEff, rareFloorEff); if (off.length > 0) { phase = "levelup"; newOffer = off; } } // leerer Skill-Pool → Perk · Rarität-Deckel
        }
      } else if (decision === "perk") {
        // M4/M5: In der 2. Perk-Phase garantierte Legendäre erzwingen (1 = M4, 3 = M5); sonst 0 = normaler Pfad.
        const legForce2Base = C.perkPhaseAt(state.devSchedule || C.DECISION_SCHEDULE, cycle) === C.LEG_PERK2_PHASE ? (state.treeLegForce2 || 0) : 0;
        const legForce2 = onLegTakt ? runRules(state).perksOffered : legForce2Base; // #381 Legendär-Takt: alle 3 Angebots-Slots legendär
        const off = state.devMode ? fullPerkOffer(architectEnabled) : buildPerkOffer(perks, familyTiers, rngAtOr(cycle, "perk", 0), perksOffered, perkLegendaryChance(shop) * legMultPerk, rareShift, architectEnabled, legForce2, rareCapEff, rareFloorEff); // #369: Perk-Legendär (Schicht+Drop) · 2. Perk-Phase · Rarität-Deckel
        if (off.length > 0) { phase = "levelup"; newOffer = off; }
      } else if (decision === "shop" && architectEnabled) {
        // Architekt-Phase (#202, ersetzt den Shop): frisches Bauplan-Angebot ziehen (deterministisch über rng) und die
        // Pro-Phase-Flags (Hauptaktion/versetzen) zurücksetzen. #217: rareShift durchreichen. Dev-Run → voller Katalog.
        phase = "architect";
        const archOffers = state.devMode ? fullArchitectOffer() : buildArchitectOffer(newArchitect || architect, rngAtOr(cycle, "arch"), rareShift, legMultArch, rareCapEff); // Gebäude-Legendär (Drop-skaliert) · Rarität-Deckel
        newArchitect = { ...(newArchitect || architect), offers: archOffers, actedMain: false, moved: false };
      } else if (decision === "shop") {
        // #229: Shop entfernt — ohne aktiven Architekten (Sim-Baseline / architect:false) ist die 'shop'-Entscheidung
        // ein No-Op; der Durchlauf startet direkt (kein rng-Verbrauch).
        phase = "play";
      } else if (decision === "formation") {
        // Formationsphase (§22.8): Deck-Aufstellung öffnen, frische Energie (+ Shop-Feinjustierung), Vorschau berechnen.
        phase = "formation";
        // #370 Deck-Shuffle (nur Ranked): vor der Aufstellphase die Karten-Anordnung frisch mischen → die letzte
        // Aufstellung ist zunichte und muss neu gebaut werden. Deterministisch je Durchlauf; sonst playerOrder unverändert.
        // [FIX] Nur die FREIEN Positionen mischen. glacierLocked und challengeBlockForm sind POSITIONS-indiziert:
        //   eine Vollmischung ließ sie an ihrer Zelle stehen und schob eine beliebige andere Karte darunter — und weil
        //   genau diese Zellen in SWAP_CARDS tauschgesperrt sind, konnte der Spieler das nicht korrigieren. Damit war
        //   die Eis-Kernentscheidung („Position gegen Wert", docs §2.1) unter diesem Mod ausgehebelt statt erschwert.
        if (hasWeekMod(state.weekMods, "deckShuffle")) {
          const lockedNow = newGlacierLocked || [];
          const blockedNow = challengeBlockForm || [];
          const pinned = (i) => !!lockedNow[i] || blockedNow.includes(i);
          playerOrder = shuffleFreePositions(playerOrder, pinned, rngAtOr(cycle, "deckShuffle"));
        }
        // Dev-Run (Test-Layout): state.devEnergy setzt die Formations-Energie-Basis pro Lauf frei; null → C.FORMATION_ENERGY.
        // `cycle` ist hier bereits erhöht (neuer Durchlauf) → explizit durchreichen, nicht state.cycle nehmen.
        newFormationEnergy = formationEnergyFor({ ...state, perks, familyTiers, cycle });
        newFormationSwaps = [];
        // #137: anchors + familyTiers mitgeben (wie bei pos-0/Tausch/Kauf), sonst zeigt die Formationsphase beim
        // Eintritt einen veralteten Stand (ohne regeländernde Familien-Effekte) — erst der erste Tausch korrigierte.
        formations = computeFormations(playerOrder, deck, roles, perks, skills, anchors, familyTiers, archState);
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
    lightYield, plantRoot, plantBloom, plantHarvest, fireBase, fireHeat, // #270: Fraktions-Eigen-Score (Kanäle je Fantasie)
    ionTotal, growthTotal, brandTotal, // #270: Motor-Zähler
    trickLog: nextTrickLog, // #251: Score je Stich (+ Sieg/Niederlage), nach Durchlauf gebucket → Durchlauf-Graph
    initiative, lastResult, perks, offer: newOffer, tieArmed, sinceWin, lossStreak, lastWinValue,
    critFollowArmed, weaknessArmed, weaknessBig, interplayStored, misfireScore,
    winSuit, winSuitStreak, recentResults, segmentWins, // #189 Volles Haus: segment-genauer Sieg-Zähler
    formations, // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, zu Durchlauf-Beginn berechnet
    architect: newArchitect, architectEnabled, architectPre: newArchitectPre, // Architekt (#202, ersetzt den Shop)
    glacierMass: newGlacierMass, firnStack: newFirnStack, glacierLocked: newGlacierLocked, glacierPre: glacierPreNow, glacierYield, glacierRoles, grosseLawineFired: newGrosseLawineFired, // Eis-Neudesign (glacier.js): Gletscher-Eigenmasse / #386 Firn-Boden-Reserve / Lock / Snapshot / Eigen-Score / Rollen / Große-Lawine-One-Shot
    frozenOppPending: newFrozenOppPending, frozenOppActive: newFrozenOppActive, // Eis-Neudesign (Einfrieren): Gegner-Marken (verlieren nächsten Stich)
    glacierBuffPending: newGlacierBuffPending, glacierBuffActive: newGlacierBuffActive, // Eis-Neudesign (Frostbund): Nachbar-Wert-Buffs


    formationEnergy: newFormationEnergy, formationSwaps: newFormationSwaps, // Formationsphase (V2 §22.8)
    successorQueue, triumphArmed, // Kartenrollen (V2 §22.6 C): C4/C5-Nachfolger-Boni / C2-Triumph-Armierung
    l4Boost, // Legendär-Perk L4 Kritische Masse (Crit-Wert-Gewinn je Karte)
    zinsCapital, zinsRate, zinsPaidTotal, cycleWins, cycleLosses, cycleBestTrick, sammlerTypes, vabanquePaid, cycleOpenScore, // Legendär-Perks-Rework (#203) + Zinseszins-Bank
    richtfestBonus, cycleScoreSum, // Gebäude-Legendäres Richtfest (Struktur-Dividende auf den Durchlauf-Ertrag)
    roles, // (unverändert vom Reducer gesetzt, hier durchgereicht)
    skillOffer: newSkillOffer, skillOfferTiers: newSkillOfferTiers, skillDoors: newSkillDoors, lightning, // Skill-System / Blitz-Archetyp · exp: Stufe je angebotenem Skill · Türen
    heat, // Feuer-Archetyp (#93 F1): Hitze-Substate (null solange kein Feuer-Skill aktiv)
    iceTemp: newIceTemp, // temporärer Wertbonus je card.id (Blitzfänger)
    brandPending: newBrandPending, brandActive: newBrandActive, forged: newForged, // Feuer: Brände (nächste/aktive Runde) + Schmiedewerte
    growth: newGrowth, colonized: newColonized, plantLoss: newPlantLoss, // Pflanze-Fraktion (v0): Wachstum + Kolonisierung + Niederlagen-Zähler (Wurzelschlag-Buff v0.4)
    shop, // hält nur noch die (inerten) Positionsanker (#229: Shop entfernt)
    lastTrick, phase,
  };
}
