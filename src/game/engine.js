import * as C from "./constants.js";
import { shuffledOrder, shuffleFreePositions } from "./deck.js"; // #370 Deck-Shuffle: fixierte Positionen bleiben stehen
import { rngAt } from "./rng.js"; // #205 Challenger Mode: adressierte Sub-Ströme (build-unabhängige Slots)
import { weekModMag, hasWeekMod, BOOST_FACTOR } from "./weekMods.js"; // #370 Wochen-Modifikatoren (nur Ranked)
import { PERK_DEFS, buildPerkOffer, critChanceRawFor, critMultiplierFor, streakBaseMult, zinsHurdle } from "./perks.js";
import { familySumHook, familyProdHook, familyTierParam, activeFamilyEntries, formationEnergyBonus, familyCritChanceRaw, familyCritMult, allianceGroups } from "./families.js";
import { colorsAllied } from "./color.js"; // #289: Farb-Serie/Architekt/Farbfokus respektieren Farballianz
import { skillSum, buildSkillDoors } from "./skills.js"; // exp skill rework: Türen-Angebot (Stufen mit der Tür gewürfelt)
// exp skill rework: die Blitz-Mechanik (Passiv, 15 Skills, 4 Legendäre) lebt im Fraktionsmodul; die Engine ruft nur
// ihre reinen Übergänge (Crit-Beiträge, Ladungsgewinn, volle Leiste, Niederlage, Rundenende).
import { lightningCritChance, lightningCritMult, overcritMult, blitzfaengerValue, ionenfeldValue, fieldTick, ionScoreFor as lightIonScore, ionCritMultFor as lightIonCritMult, chargeGainOnWin,
  critFillsBar, blitzschlagStacks, stauAfterWin, lightningOnLoss, fillBar as lightFillBar, lightningCycleEnd, maxChargeFor,
  lightParam, L as LIGHT, hasDoppelentladung, hasResonanz, resonantStacks } from "./factions/lightning.js";
// exp skill rework: die Feuer-Mechanik (Passiv, 15 Skills, 4 Legendäre) lebt ebenso im Fraktionsmodul — die Engine
// ruft ihre Übergänge (Kampfwert-Bonus, Sieg, Niederlage, Hitze-Multiplikator, Rundenende, Brand-Wechsel).
import { syncHeatMax, fireValueBonus, fireOnWin, fireOnLoss, heatMult, verbrennungMult, feuersturmMult,
  rueckzuendungMult, schneiseMult, fireCycleEnd, nextBrandActive } from "./factions/fire.js";
// exp skill rework: die Pflanze-Mechanik (Passiv „Wachstum", 15 Skills, 4 Legendäre) lebt im Fraktionsmodul; die
// Engine ruft ihre Übergänge (Sieg, Niederlage, Durchlaufende) und reicht das Bündel { skillTiers, growth } an die
// Formations-Engine weiter, deren Erkennung vier Pflanze-Hebel und zwei Legendäre ändern.
import { plantOnWin, plantOnLoss, plantOnGap, plantParam, plantValueBonus, plantFormMult, P as PLANT } from "./factions/plant.js";
// (#267: import aus stats.js entfernt — die Stat-Phase/Faktoren sind weg.)
import { computeFormations, positionHasFormation, activeFormationCount, summarizeFormations, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { perkLegendaryChance, anchorAt } from "./shop.js";
import { precomputeArchitect, architectValueBonus, architectScore, buildArchitectOffer } from "./architect.js";
import { precomputeGlacier, ewigerFrostTick, dauerfrostTick, driftTargets as glacierDriftTargets,
  neighbors4 as glacierNeighbors4, uebergletscherPool, packeisTick, verzahnungTick, eiszeitTick, glacierGeometry,
  ROLES as GLACIER_ROLES, WIN_MASS as GLACIER_WIN_MASS, GROSSE_LAWINE_EVERY as GLACIER_LAWINE_EVERY, GLACIER_MAX,
  FIRN_REFILL_TARGET as GLACIER_FIRN_REFILL_TARGET } from "./glacier.js"; // Eis-Neudesign (isoliert, activeArchetypes "ice") · #386 Firn-Reserve-Nachschub
import { iceTuning, iceSnapshotOpts, iceNeighborFn } from "./factions/ice.js"; // §5.3: die Zahlen der Eis-Skills kommen aus ihrer Stufe
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

// (§6.1: der Bekenntnis-Skalierer commitScale war der letzte Leser des Pflanze-Direkt-Scores und ist mit ihm
//  gegangen — keine Fraktion skaliert ihren Ertrag mehr an der Zahl gehaltener Skills.)

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
    plantBase = 0, // Pflanze: Basis-Score aus Blüte und den Score-Skills (§6: ein Kanal, kein Direkt-Score)
    fireBase = 0, fireHeat = 0, // Feuer: Feuer-Score (Konsumenten, Glutstahl, Sonnenkern) / Anteil des Hitze-Multiplikators und der Verbrennung
    ionTotal = 0, growthTotal = 0, brandTotal = 0, // Motor-Zähler: ionisierte Karten / Wachstum / gebrandmarkte Gegnerkarten
    skills = [], skillOffer = null, lightning = null, activeArchetypes = [], // Skill-System / Archetypen (#93)
    skillTiers = {}, // exp skill rework: Stufe je gehaltenem Skill (0 Normal … 3 Episch) — die Fraktionsmodule lesen ihre Tabellen damit
    iceTemp = {}, // (exp: ehemals Blitzfänger-Temp; wird nur noch durchgereicht)
    brandPending = {}, brandActive = {}, forged = {}, // Feuer: Brand-Marker (Gegner, je card.id, Wertabzug nächste Runde) / geschmiedete Dauerwerte
    growth = {}, // Pflanze (§6.2): Wachstum je card.id (nur steigend) — grün und blühend liegen als Flag auf der Karte

    shop = null, // hält nur noch die (inerten) Positionsanker []; der Shop selbst ist entfernt (#229)
    familyTiers = {}, // Raritätssystem (Epic #167): Familienrang je Familie — Engine löst aktive Stufen-Hooks auf
    architect = null, architectEnabled = false, architectPre = null, // Architekt (#202, Shop-Ersatz): Gebäude-Overlay (8×5) + Durchlauf-Precompute
    glacierMass = [], glacierLocked = [], glacierPre = null, glacierYield = 0, glacierRoles = [], glacierRoleTiers = {}, // Eis-Neudesign (glacier.js): Gletscher-Eigenmasse / Lock / Snapshot / Eigen-Score / aktive Rollen (Fundament-Modifikatoren)
    firnStack = [], // #386 Firn-Boden-Reserve: pro Feld die Boden-Reserve (getrennt von glacierMass) — füllt Gletscher zum Rundenstart auf 12 nach

    challengeBlockForm = [], // #301 C3: gesperrte Aufstell-Zellen (nie als Gletscher einfrierbar, auch nicht per Eiszeit-Auto-Freeze)
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
    formations = computeFormations(playerOrder, deck, roles, perks, skills, anchors, familyTiers, archState, { skillTiers, growth });
    // Fundament (L_FUND, v0.3): additiver Bonus auf JEDEN Strukturfaktor. Wird in den Precompute gereicht, damit
    // Engine UND UI-Anzeige dieselbe Quelle behalten (boardFactorMap-Kommentar: gezeigte und verrechnete Faktoren
    // dürfen nicht driften). Default 0 ⇒ alle Bestands-Aufrufer/Tests byte-identisch.
    archPreNow = archState ? precomputeArchitect(archState, playerOrder, deck, flagValue(perks, "fundament")) : null;
  }
  // Eis-Neudesign (docs §2.4): Snapshot am Durchlauf-Start — der ganze Bruch wird auf dem statischen Brett vorab gerechnet
  // (analog precomputeArchitect), pro Stich ausgezahlt. Der Teil-Reset (−1 Stufe) greift SOFORT auf die Arbeits-Masse;
  // Siege dieses Durchlaufs addieren darauf, Ewiger Frost am Durchlauf-Ende. Isoliert über activeArchetypes "ice".
  const glacierActive = activeArchetypes.includes("ice"); // Eis-Neudesign: der Eis-Archetyp IST der Gletscher
  const glacierNF = glacierActive ? iceNeighborFn(glacierRoles) : null; // Eisbrücke → 8-Nachbarschaft, sonst 4
  // §5.3: alle Zahlen der gehaltenen Eis-Skills, einmal je Stich aus ihrer Stufe gelesen (factions/ice.js).
  const ice = glacierActive ? iceTuning(glacierRoles, glacierRoleTiers) : null;
  let glacierPreNow = glacierPre;
  let newGlacierMass = Array.isArray(glacierMass) ? glacierMass.slice() : [];
  let newFirnStack = Array.isArray(firnStack) ? firnStack.slice() : []; // #386 Firn-Boden-Reserve: Arbeitskopie (nur ice-gegated beschrieben → Nicht-Eis-Läufe byte-identisch)
  let newGlacierLocked = glacierLocked; // wird nur von Eiszeit (Auto-Lock) verändert; sonst durchgereicht
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
    // Pooling vor dem Bruch: Ewiges Schild (Legendär) hebt das GANZE Feld aufs Maximum (nie fallend).
    // Basis ist die BEREITS nachgefüllte Masse (newGlacierMass), nicht das rohe glacierMass.
    const refilledMass = newGlacierMass;
    const snapMass = glacierRoles.includes(GLACIER_ROLES.L_SCHILD) ? uebergletscherPool(refilledMass, glacierLocked)
      : refilledMass;
    // 2D-Geometrie-Formationen (unique Deck-Passiv, docs §2.7/§9): Block/Kreuz/Linie/Fläche → Burst-Faktor je Feld; Eiswall hebt die Linie.
    const glacierGeo = glacierGeometry(glacierLocked, { eiswallLinie: glacierRoles.includes(GLACIER_ROLES.EISWALL) ? ice.eiswallLinie : 0 });
    // Ewiges Schild (§5.8): das ganze Feld IST ein Gletscher — also erbt jeder Gletscher die stärkste Form des Bretts.
    // Das ersetzt den alten additiven Masse-Bonus, der am Masse-Deckel verfiel.
    if (glacierRoles.includes(GLACIER_ROLES.L_SCHILD)) {
      let best = 1;
      for (let p = 0; p < glacierGeo.length; p++) if (glacierLocked[p] && glacierGeo[p] > best) best = glacierGeo[p];
      if (best > 1) for (let p = 0; p < glacierGeo.length; p++) if (glacierLocked[p]) glacierGeo[p] = best;
    }
    const glacierO = iceSnapshotOpts(glacierRoles, ice);
    // Große Lawine (Legendär, §5.8): im TAKT statt einmal am Laufende — jeden GLACIER_LAWINE_EVERY-ten Durchlauf bricht
    // das ganze Feld auf einen Schlag, jeder Gletscher auf voller Stufe und ×GROSSE_LAWINE_MULT (glacier.js). Sie ist
    // damit den ganzen Lauf über sichtbar und synchronisiert das Feld (Kaskade/Kollision/Sturz greifen gleichzeitig).
    if (glacierRoles.includes(GLACIER_ROLES.L_LAWINE) && (cycle + 1) % GLACIER_LAWINE_EVERY === 0) glacierO.grosseLawine = true;
    glacierPreNow = precomputeGlacier(snapMass, glacierLocked, { ...glacierO, formFactor: glacierGeo });
    // Anzeige-Basis dieses Durchlaufs ist snapMass — das POOLING (Ewiges Schild → Feld-Max
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
  // Resonanz (Blitz-Legendär, §7.25): die Karten einer Formation teilen ihre Stapel — die gespielte Karte kämpft mit der
  // Summe. `pCardR` ist die Lesesicht dafür (Blitzfänger, Stapel-Score, Crit-Multiplikator je Stapel, Kurzschluss,
  // Doppelentladung, Anzeige); Stapel-ÄNDERUNGEN (Blitzschlag) gehen weiter an die echte Karte `pCard`.
  const pCardR = (state.lightning && state.lightning.active && hasResonanz(skills))
    ? { ...pCard, ionStacks: resonantStacks(pCard, posForm, actualPos, (k) => deck[playerOrder[k]]) } : pCard;
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
  //      gespielten Karte — Glühende Klinge (je Hitze-Schritt) und Rückzündung Episch (die zündende Karte). Alles im
  //      Modul. (Feuerwalze ist seit §7.27 gestrichen, ihr Platz trägt die Brandschneise.)
  let heat = syncHeatMax(state.heat || null, skills);
  const fireValue = fireValueBonus(heat, skills, skillTiers, { winStreak }); // §7.24: Rückzündung Episch liest die Serie (die zündende Karte)
  // Blitzfänger (exp skill rework): ionisierte Karten kämpfen mit +Wert; Ionenfeld (§7.18): solange das Feld trägt, alle
  // Karten. Beides Zustand vor dem Stich, kein Ereignis.
  const blitzValueBonus = blitzfaengerValue(skills, skillTiers, pCardR) + ionenfeldValue(state.lightning, skills, skillTiers);
  const anchorPowerBonus = anchorType === "power" ? (aParam("power") || 0) : 0; // Kraftanker (§4.2, Stärke = Stufe)
  // E_QUICKSHOT IV (Rarität #167 Kat. E, Spec §3.2 E8 IV): jede Anker-Position (jede fünfte) erhält zusätzlich +2 Wert.
  // Der Anker-FAKTOR selbst läuft über computeFormations; hier nur der Stufe-IV-Wertbonus (anchor.value auf Anker-Positionen).
  const eqAnchor = familyTierParam(familyTiers, "E_QUICKSHOT", "anchor");
  const eQuickshotValue = eqAnchor && eqAnchor.value && eqAnchor.at(actualPos) ? eqAnchor.value : 0;
  // Familien-Wertboni (Kategorie B, Rarität #167) laufen ADDITIV neben den flachen Perk-cardBonus-Hooks —
  // gleicher Kontext (inkl. pValueBase = Dauerwert der Karte), nur die aktive Familien-Stufe zählt.
  const familyValueBonus = familySumHook(familyTiers, "cardBonus", { ...ctx, pValueBase: pCard.value });
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
  // Pflanze (§6.13, Ewiger Frühling): blühende Karten kämpfen stärker — der einzige Wert-Hebel der Fraktion.
  const plantValue = plantValueBonus(skills, pCard);
  const wmEnemyBonus = weekModMag(state.weekMods, "enemyValue");
  const pValue = effectivePlayerValue(pCard.value, perks, ctx) + familyValueBonus + relayBonus + fireValue + blitzValueBonus + anchorPowerBonus + eQuickshotValue + architectValueEff + glacierBuff + wmCardBonus + plantValue;
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
  // Pflanze (§6.2): Wachstum je Karte, immutabel fortgeschrieben. Die Zustände grün/blühend liegen als Flag auf der
  // Karte (card.green / card.bloom) und werden vom Modul mitgezogen.
  let newGrowth = growth;
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
  // übernimmt ihn unverändert.
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
                  + lightningCritChance(lightning, skills, skillTiers, winStreak + 1, pCardR) // exp: Passiv je Blitz-Skill + Rampen + Ladungsserie + Lichtbogen (§7.28: je Stapel der gespielten Karte, pCardR = mit Resonanz-Summe)
                  + (anchorType === "crit" ? (aParam("crit") || 0) : 0); // Kritanker (§4.2, Stärke = Stufe)
  // (§7.25: Durchschlag — der Crit auf einer Niederlage — ist gestrichen; auf dem Platz steht Resonanz, oben bei pCardR.)

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
      let add = GLACIER_WIN_MASS;
      // Anfrieren: Sieg extra, Formations-Sieg zusätzlich obendrauf.
      if (glacierRoles.includes(GLACIER_ROLES.ANFRIEREN)) add += ice.anfrierenMass + (hasFormation ? ice.anfrierenForm : 0);
      newGlacierMass[actualPos] = (newGlacierMass[actualPos] || 0) + add;
      // Schneetreiben (Verwehung): ADDITIV +Schnee in die Boden-RESERVE (firnStack) der Nachbarfelder — der Gletscher
      // behält seine volle Sieg-Masse. Deterministisch, offener Boden, 4-Nb; Episch sät in zwei Felder. #386: Schnee
      // kommt nie unter einen Gletscher (driftTargets liefert nur offene Felder). (§5.3: der frühere 0-Masse-Sonderfall
      // — Transfer statt Zugabe — ist mit der Stufenleiter gefallen: eine Regel, die im Text nicht vorkam.)
      if (glacierRoles.includes(GLACIER_ROLES.SCHNEETREIBEN)) {
        for (const tgt of glacierDriftTargets(actualPos, glacierLocked, ice.schneetreibenFields)) {
          newFirnStack[tgt] = (newFirnStack[tgt] || 0) + ice.schneetreibenSeed;
        }
      }
    }
    // winStreak/wins enthalten hier bereits den gerade gewonnenen Stich — genau die Werte, mit denen wctx oben gebaut ist.
    winSuit = eSuit; winSuitStreak = suitStreak; // Farbserie fortschreiben (effektive Farbe: grün = „G")
    // ---- Feuer (exp skill rework, §4): Hitzegewinn (Passiv, Zunder), Schmelzpunkt (Überlauf-Wandler), Glutstahl,
    //      Sonnenkern-Score, Feuerlinie (§7.23: Faktor je Punkt Kampfwert im Formations-Sieg, verbrennt Hitze) und die
    //      Brände für die nächste Runde — alles im Modul. `fireHeld` = Hitze nach dem Gewinn, vor dem Verbrauch: daran
    //      hängt der Hitze-Multiplikator dieses Siegs (unten im Stack). Feuer-Flats gehen in die multiplizierte Basis;
    //      Direkt-Score gibt es nicht.
    let fireFlat = 0;
    let fireHeld = 0;
    let fireLineMult = 1;
    if (heat && heat.active) {
      const r = fireOnWin(heat, skills, skillTiers, {
        margin: pValue - oValue, streak: serieStreak, card: pCard, forged, brandOnOpp,
        valueOver: pValue - (pCard.baseRank ?? pCard.value), // Glutstahl: Kampfwert der Siegkarte über ihrem Grundwert
        value: pValue, formCount: activeFormationCount(posForm), // Feuerlinie: ganzer Kampfwert, aktive Formationen an der Siegposition
        pos: actualPos, // Brandschneise (§7.27): der Sieg wird mit seinem Vorsprung gemerkt, der Schnitt fällt am Durchlaufende
        oppId: oCard.id, oppIndex: oppOrder[actualPos], oppDeck,
      });
      heat = r.heat; fireFlat = r.flat; fireHeld = r.held; fireLineMult = r.lineMult || 1;
      for (const b of r.brands) { newBrandPending[b.id] = (newBrandPending[b.id] || 0) + b.value; brandTotal += 1; } // #270.2: Motor-Zähler „Brände"
    }
    // ---- Pflanze (exp skill rework, §6): Wachstum (Passiv + Aussaat/Ranken/Blütenlese), die Zustandswechsel
    //      grau → grün → blühend und der Basis-Score (blühende Siegkarte, die vier Formations-Skills, Jahresringe) —
    //      alles im Modul. Kein Direkt-Score, kein eigener Multiplikator: `plantFlat` geht in die multiplizierte Basis.
    let plantFlat = 0;
    if ((activeArchetypes || []).includes("plant")) {
      const r = plantOnWin(newGrowth, deck, skills, skillTiers, { pos: actualPos, order: playerOrder, posForm, cardId: pCard.id });
      newGrowth = r.growth; deck = r.deck; plantFlat = r.flat; growthTotal += r.grown; // #270 Motor-Zähler „Gewachsen"
      plantBase += r.flat;
      // Lücke Episch (§6.8): die vom grünen Lauf übersprungenen Karten wachsen mit. Die Positionen liegen auf dem
      // Farbblock-Eintrag der Siegposition (`gapped`, formations.js).
      const gapGrowth = plantParam(skills, skillTiers, PLANT.LUECKE, "growth");
      if (gapGrowth) {
        const gapped = (posForm.formations || []).find((f) => f.type === "farbblock" && f.gapped)?.gapped || [];
        if (gapped.length) {
          const g2 = plantOnGap(newGrowth, deck, skills, gapped.map((p) => deck[playerOrder[p]].id), gapGrowth);
          newGrowth = g2.growth; deck = g2.deck; growthTotal += g2.grown;
        }
      }
    }
    // Crit ZUERST bestimmen — die Crit-Flats (scoreFlatOnCrit) müssen in die multiplizierte Basis. Der Crit-Wurf
    // verbraucht rng nur, wenn wirklich gewürfelt wird → rng-Reihenfolge unverändert (kein Drift). rawCrit steht oben
    // (vor der Verzweigung) — Perk-Basis + Präzision + Blitz-Passiv/Rampen + Kritanker, ungeklemmt.
    critChance = Math.min(1, Math.max(0, rawCrit));             // Anzeige/normaler Wurf (geklemmt)
    // Crit-Ctx trägt rawCrit — von D-Crit-Flats (D19 Überschusskrit) UND L6 „Raserei" (critMultBonus, #115) gebraucht.
    const critCtx = { ...wctx, rawCrit };
    // Basis 2,25 + Präzision „Wucht" (familyCritMult) + L6-Überschuss + Blitz (Entladung-Rampe, Spannungsstau,
    // Vorentladung) + Stapel der Siegkarte (§7.12: +ION_CRIT_MULT_PER_STACK je wirksamem Stapel) + Systemregel (§1: Überschuss
    // über 100 % → sehr kleiner Crit-Mult-Bonus, alle Fraktionen).
    critMultiplier = critMultiplierFor(perks, critCtx) + familyCritMult(familyTiers)
                   + lightningCritMult(lightning, skills, skillTiers, serieStreak) + lightIonCritMult(pCardR, skills, skillTiers) + overcritMult(rawCrit); // pCardR: Resonanz-Stapel (§7.25)
    // Entladung Episch: der Crit, der die Leiste füllt, zählt mit doppeltem Crit-Multiplikator. Vorschau auf denselben
    // Ladungsgewinn, den ein Crit unten wirklich bringt — der Multiplikator wird nur bei einem Crit gelesen.
    if (lightning && lightning.active && lightParam(skills, skillTiers, LIGHT.ENTLADUNG, "fillDouble")
        && critFillsBar(lightning, skills, skillTiers, { streak: serieStreak })) critMultiplier *= 2;
    // BACKSTOP (Crit-Bändigung): der fertige Crit-Multiplikator wird hart gedeckelt — bewusst NACH allen Additionen,
    // damit keine Quelle (auch keine offene Rampe) ihn umgehen kann. Der Owner hält den Deckel (docs/skill-rework.md §1).
    // (§7.28: den ungedeckelten Wert liest niemand mehr — Überspannung, die den Überschuss über dem Deckel in Ladung
    // wandelte, ist gestrichen; was über dem Deckel liegt, verfällt wieder.)
    critMultiplier = Math.min(critMultiplier, C.CRIT_MULT_CAP);
    isCrit = rollCrit(critChance, forceCrit, rngAtOr(cycle, "crit", pos)) && !reducedRepeat; // #205 Glückslandschaft: fester Wurf je (cycle,pos); forceCrit = Henker; reducedRepeat = Zeitsegment III
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
                      + lightIonScore(pCardR, skills, skillTiers) + ((lightning && lightning.stackBank) || 0) + fireFlat + plantFlat // exp: Stapel-Score der Siegkarte (Kurzschluss zählt ab Schwelle doppelt; §7.22 Episch: dazu der vorgemerkte Stapel-Score verlorener Karten; §7.25 Resonanz: pCardR trägt die Stapel der Formation)
                      + (anchorType === "score" ? (aParam("score") || 0) : 0) // Punkteanker (§4.2, Stärke = Stufe)
                      + (anchorType === "power" ? (aParam("winScore") || 0) : 0) // Kraftanker IV: Sieg dort +100 Score
                      + architectScoreRes.flat // Architekt Handelsbauten (#202): Flat-Score, s. o.
                      + interplayStored; // D_INTERPLAY IV: der in Niederlagen gebankte Score wird mit diesem Sieg als Flat ausgezahlt
    // #270: Fraktions-Flat-Anteile zum Ertrag (Roh-Score VOR dem Multiplikator-Stack). Blitz EIN Kanal; Feuer in
    // Grund/Weißglut gespalten (Pflanze-Kanäle Wurzel/Blüte/Ernte wurden schon an ihren Quellen oben akkumuliert).
    lightYield += lightIonScore(pCardR, skills, skillTiers) + ((lightning && lightning.stackBank) || 0);
    if (lightning && lightning.stackBank) lightning = { ...lightning, stackBank: 0 }; // §7.22: die Vormerkung ist mit diesem Sieg bezahlt
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
    let formMult = formBaseEff * brennpunktMult * sammlerMult * ballastMult; // + Brennpunkt/Sammler (#203) + Ballast (v0.3) — die Pflanze hat keinen eigenen Multiplikator mehr (§6.1)
    // #370 Formations-Boost (Wochen-Mod, nur Ranked): den Formations-BONUS (Überschuss über 1) verdoppeln — neutraler
    // Sieg (formMult==1) bleibt unberührt, Formations-Builds skalieren stärker. Wirkt auch auf glacierWinMult (nutzt formMult).
    if (hasWeekMod(state.weekMods, "formBoost")) formMult = 1 + (formMult - 1) * BOOST_FACTOR;
    // Feuer (§4.2/§4.5): der Hitze-Multiplikator (je 10 % gehaltener Hitze; Sonnenzorn: Spitze, doppelt; Weißglut über
    // 100) und Verbrennung (Sieg ab dem Vorsprung der Stufe ×1,5) sind EIN eigener Faktor auf den ganzen Sieg-Score —
    // ein Halte-Build gewinnt über Wert und Formationen, nicht über Feuer-Flats. Gelesen wird die Hitze nach dem
    // Gewinn dieses Siegs und vor dem Verbrauch (fireHeld).
    const fireMult = (heat && heat.active)
      ? heatMult(skills, skillTiers, fireHeld, heat.peak, heat.emberMult) * verbrennungMult(skills, skillTiers, pValue - oValue)
        * feuersturmMult(skills, skillTiers, fireHeld, heat.max || C.HEAT_MAX, serieStreak) // §7.17: Feuersturm, Serie zu Score bei voller Leiste
        * rueckzuendungMult(skills, skillTiers, serieStreak) // §7.24: Rückzündung, der Takt — jeder N. Sieg in Folge (Serie nach dem Sieg)
        * schneiseMult(skills, skillTiers, heat, actualPos) // §7.27: Brandschneise, ein Sieg auf dem Schnitt des letzten Durchlaufs (die Schnitte liegen im Hitze-Substate)
        * fireLineMult : 1; // §7.23: Feuerlinie, je Punkt Kampfwert im Formations-Sieg (fireOnWin oben, samt Hitzekosten)
    // Pflanze (§6.15, Ewiger Frühling): gewinnt eine blühende Karte, zählt der Stich +Satz je aktiver Formation an
    // ihrer Position — der einzige Multiplikator der Fraktion, ein eigener Faktor wie der Feuer-Stack.
    const plantMult = plantFormMult(skills, pCard, posForm);
    // architectMult (#202, Architekt-Score-Gebäude: Struktur/Schatzkammer) läuft als eigener Faktor am Ende des Stacks.
    // #Pool Batch 4 (gamble/Risiko): Boden — der Architekt-Abzug (negativer Flat) darf den Stich höchstens auf 0 drücken,
    // nie ins Minus (sonst kippen die nachgelagerten Multiplikatoren). Bei Basis 400 praktisch immer ein No-op.
    // Serien-Flat (Reihenhaus) wird NEBEN der serien-multiplizierten Basis addiert → er bekommt Perk/Formation/Crit,
    // aber NICHT den globalen Serien-Mult (kein Doppel-Dip). Rest des Stacks unverändert.
    const streakMuldBase = Math.max(0, scoreBase) * streakMult;
    scoreBeforeCrit = (streakMuldBase + architectStreakFlat) * perkMult * formMult * afterglowMult * coreMult * fireMult * plantMult * architectMult;
    gained = scoreBeforeCrit * (isCrit ? critMultiplier : 1);
    // Doppelentladung (Blitz-Legendär, §3.7): Crit mit einer ionisierten Karte — der Blitz schlägt zweimal ein, der ganze
    // gewertete Stich (Basis mal Multiplikatoren) zählt DOPPELENTLADUNG_STRIKE-fach. Kein Kreislauf: speist keine Leiste.
    const strikeMult = (isCrit && (pCardR.ionStacks || 0) > 0 && hasDoppelentladung(skills)) ? C.DOPPELENTLADUNG_STRIKE : 1; // pCardR: mit Resonanz zählt die Formation (§7.25)
    gained *= strikeMult;
    // Eis: derselbe multiplikative Stack (ohne additive Flats) skaliert auch den Gletscher-Bruch dieses Stichs (unten).
    glacierWinMult = streakMult * perkMult * formMult * afterglowMult * coreMult * fireMult * plantMult * architectMult * (isCrit ? critMultiplier : 1);
    // SIM-Sättigungshebel (Default aus, K=0 → No-op): weicher Deckel auf den Score je Sieg. Greift NACH der
    // Crit-Multiplikation und VOR dem Verbuchen, verbraucht kein rng → Determinismus/rng-Reihenfolge unverändert.
    // [#229 T5] WIN_SOFTCAP ist ein Sim-Hook (Default 0). Ist er aktiv, wird `gained` geklemmt, die Einzelfaktoren im
    // breakdown (unten) bleiben aber ungekappt → base×Faktoren ≠ total, und critBonus kann negativ werden. Reine Sim-Diagnose.
    if (C.WIN_SOFTCAP > 0 && gained > C.WIN_SOFTCAP) gained = C.WIN_SOFTCAP + (gained - C.WIN_SOFTCAP) * C.WIN_SOFTCAP_SLOPE;
    critBonus = gained - scoreBeforeCrit;
    // #161 FB-2: additiver Score-Anteil der Formations-Faktoren (echte Formationen + Formations-Stat + Nachhall + Kern).
    // Auf dem MULTIPLIZIERTEN Score, VOR der Glutdividende (die läuft am Stack vorbei und zählt nicht als Formations-Score).
    // [#229 T4] Bekannte Attributions-Ungenauigkeit (nur Anzeige, kein Gameplay): formMult bündelt auch
    // brennpunktMult/sammlerMult → dieser Anteil wird hier der Formation zugeschlagen statt seinen echten Quellen.
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
    const gainedPreBet = gained + fireDirectApplied + lightDirect;
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
    breakdown = { base: C.SCORE_PER_WIN, flats, streakFlat: architectStreakFlat, streakMult, perkMult, fireMult, plantMult, formMult, formBase: formBaseEff, afterglowMult, coreMult, architectMult, critMult: isCrit ? critMultiplier : 1, strikeMult, fireDirect: fireDirectApplied, lightDirect, perkDirect, total: gained };
    // Blitz (exp skill rework, §3): Ladungsgewinn dieses Siegs — Passiv (+1 je Crit), Blitzableiter (§7.18: auch je Sieg
    // ohne Crit auf Episch), Überspannung (§7.24: der Überschuss über dem Crit-Deckel und über 100 % Chance), Ladungsserie
    // Episch — mit fortgeschriebenen Zählern; Blitzschlag (jeder N. Crit ionisiert die Siegkarte); Spannungsstau. Die volle
    // Leiste zündet NACH der Verzweigung (unten), einmal je Stich. Kein Selbstwachstum ionisierter Siegkarten mehr (Lesart A).
    if (lightning && lightning.active) {
      const { gain, next } = chargeGainOnWin(lightning, skills, skillTiers, { isCrit, streak: serieStreak });
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
    // ---- Feuer (exp skill rework, §4): Kühlung (Passiv, Glutbett-Boden, Ewige Glut hält den Anteil der Spitze), Rückstand
    //      für Rückzündung merken, Brandmal Episch brandmarkt die Gegnerkarte, die gewonnen hat — alles im Modul.
    if (heat && heat.active) {
      const r = fireOnLoss(heat, skills, skillTiers, { deficit: oValue - pValue, oppId: oCard.id });
      heat = r.heat;
      for (const b of r.brands) { newBrandPending[b.id] = (newBrandPending[b.id] || 0) + b.value; brandTotal += 1; }
    }
    // Blitz (exp skill rework): Serienschutz (Ladung ab dem Anteil der Stufe hält die Serie und wird verbraucht; Episch
    // einmal je Runde gratis) — im Modul.
    let serienschutzHeld = false;
    if (lightning && lightning.active) {
      const r = lightningOnLoss(lightning, skills, skillTiers, { alreadyHeld: anchorNoReset, card: pCardR }); // §7.22: Kurzschluss Episch merkt den Stapel-Score der verlorenen Karte vor (pCardR: Resonanz-Stapel)
      lightning = r.lightning; serienschutzHeld = r.streakHeld;
    }
    // Eis-Neudesign (docs §4 Frostgriff — Eispanzer): eine Niederlage NEBEN einem Gletscher ist folgenlos (Serie hält)
    // UND füttert Masse in die angrenzenden Gletscher — der Gletscher frisst, was an ihm zerbricht. Prinzip heil: die Karte
    // verliert weiter (kostet den Stich), nur die Folgen (Serienbruch) sind abgeschirmt.
    const glacierShield = glacierActive && glacierRoles.includes(GLACIER_ROLES.EISPANZER)
      && glacierNeighbors4(actualPos).some((p) => glacierLocked[p]);
    if (glacierShield) for (const nb of glacierNeighbors4(actualPos)) if (glacierLocked[nb]) newGlacierMass[nb] = (newGlacierMass[nb] || 0) + ice.eispanzerMass;
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
    // Pflanze (§6.8): eine Niederlage gibt nichts — außer mit Zähem Halm, der graue (Episch auch grüne) Karten
    // trotzdem wachsen lässt. Alles im Modul.
    if ((activeArchetypes || []).includes("plant")) {
      const r = plantOnLoss(newGrowth, deck, skills, skillTiers, { cardId: pCard.id });
      newGrowth = r.growth; deck = r.deck; growthTotal += r.grown;
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
  // hinterlässt, zündet beim nächsten). `maxCharge` folgt dem Build (Reststrom Episch 9). Das Ionenfeld zählt VOR der Leiste
  // herunter: der Stich, der es lädt, zählt nicht mit — die nächsten n Stiche tragen es.
  let barFilled = false, barStacks = 0;
  if (lightning && lightning.active) {
    const lMax = maxChargeFor(skills, skillTiers);
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
  // Einfrieren (docs §4 Frostgriff): bricht dieser Gletscher, verliert die hier getroffene Gegnerkarte ihren NÄCHSTEN
  // Stich. Die Stufe entscheidet, wie weit der Griff reicht (§5.2): die getroffene Karte plus so viele ihrer Nachbarn
  // im Gegnerfeld, bis `einfrierenCards` voll ist.
  if (glacierActive && glacierRoles.includes(GLACIER_ROLES.EINFRIEREN) && glacierPreNow && glacierPreNow.breaks.some((b) => b.pos === actualPos)) {
    newFrozenOppPending[oCard.id] = true;
    for (const nb of glacierNeighbors4(actualPos).slice(0, Math.max(0, ice.einfrierenCards - 1)))
      newFrozenOppPending[oppDeck[oppOrder[nb]].id] = true;
  }
  // (§5.2: Erstarrung ist gestrichen — die Kontrolle liegt bei Einfrieren, dessen Reichweite mit der Stufe steigt.)
  // Frostbund (docs §4 Frostgriff): bricht dieser Gletscher, bufft er seine NICHT-Gletscher-Nachbarn (2. Archetyp) → +Stichwert.
  if (glacierActive && glacierRoles.includes(GLACIER_ROLES.FROSTBUND) && glacierNF && glacierPreNow && glacierPreNow.breaks.some((b) => b.pos === actualPos))
    for (const nb of glacierNF(actualPos)) if (!glacierLocked[nb]) {
      const id = deck[playerOrder[nb]].id;
      newGlacierBuffPending[id] = Math.max(newGlacierBuffPending[id] || 0, ice.frostbundBuff);
    }
  // Verdichtung (docs §4 Firn): der auf diesem Gletscher unterdrückte Gebäude-Wertbonus wird in Masse getankt.
  if (verdichtung && architectValue > 0) newGlacierMass[actualPos] = (newGlacierMass[actualPos] || 0) + architectValue * ice.verdichtungRate;

  // #UI: bester GLETSCHER-Stich separat erfassen — der volle Stich-Score (inkl. Bruch), sobald dieser Stich
  // einen Gletscher-Bruch trug. `bestTrickScore` (oben) wird VOR dem Bruch-Score gebucht und zeigt ihn daher nicht; der
  // Gletscher-Stich braucht darum seine eigene Bestmarke — hier, wo `gained` bereits den Bruch enthält.
  if (glacierDirect > 0) bestGlacierTrickScore = Math.max(bestGlacierTrickScore, gained);

  // Zinseszins-Bank: EINLAGE. Jeder gewonnene Stich legt einen Anteil seines Scores aufs Kapital. Bewusst HIER, ganz
  // am Ende der Stich-Wertung — `gained` trägt an dieser Stelle alle Nachträge (Konsum, Gletscher-Bruch).
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
        (deck.find((c) => c.id === pCard.id)?.bloom) && "plant", // §6.2: Sieg mit einer blühenden Karte (Stand nach dem Wachstum dieses Stichs)
        ((pCardR.ionStacks || 0) >= C.ION_MAX_STACKS) && "lightning",
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
    barFilled, barStacks, // exp Blitz: volle Leiste in diesem Stich + ionisierte Stapel (Anzeige)
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
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.DAUERFROST)) newFirnStack = dauerfrostTick(newFirnStack, glacierLocked, ice.dauerfrostNear, ice.dauerfrostFar);
    // Packeis / Verzahnung (docs §4 Eisschild): Dichte-Bonus je Gletscher-Nachbar / Cluster-Größe (Eisbrücke-adjazenz-aware).
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.PACKEIS)) newGlacierMass = packeisTick(newGlacierMass, glacierLocked, glacierNF, ice.packeisPer);
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.VERZAHNUNG)) newGlacierMass = verzahnungTick(newGlacierMass, glacierLocked, glacierNF, ice.verzahnungPer);
    // Eiszeit (Legendär): brettweite Flut in die Boden-RESERVE (#386 firnStack) + das höchste ungefrorene Feld (nach Reserve)
    // friert zum Gletscher ein (Karten frieren nach und nach). Der neu gefrorene Gletscher startet mit Masse 0 (glacierMass
    // bleibt unberührt) und zieht ab dem nächsten Rundenstart aus seiner Reserve auf.
    if (glacierActive && glacierRoles.includes(GLACIER_ROLES.L_EISZEIT)) {
      // §5.11: der Brett-Deckel gilt für JEDE Gletscher-Quelle, auch für die Eiszeit. Bis §5.10 fror sie ohne Grenze
      // ein, während die eigenen Picks bei GLACIER_MAX standen — sie allein füllte das Brett und stand deshalb bei
      // +281 %, doppelt so hoch wie das nächstbeste Legendäre.
      const ez = eiszeitTick(newFirnStack, newGlacierLocked, undefined, GLACIER_MAX > 0 ? GLACIER_MAX : Infinity, challengeBlockForm);
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
    //      Episch zwei Karten) und Ewige Glut (Rampe, §7.21). Alles im Modul; die
    //      Schmiedewerte bleiben in den Karten gebacken.
    if (heat && heat.active) {
      const r = fireCycleEnd(heat, skills, skillTiers, deck, newForged);
      heat = r.heat; deck = r.deck; newForged = r.forged;
    }
    // (§6.11: die Pflanze hat am Durchlaufende nichts mehr zu tun — der Weltenbaum ist mit den Legendären auf drei
    //  gestrichen; ihr Zustand wandert ausschließlich über Siege.)

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
        formations = computeFormations(playerOrder, deck, roles, perks, skills, anchors, familyTiers, archState, { skillTiers, growth: newGrowth });
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
    lightYield, plantBase, fireBase, fireHeat, // #270: Fraktions-Eigen-Score (Kanäle je Fantasie)
    ionTotal, growthTotal, brandTotal, // #270: Motor-Zähler
    trickLog: nextTrickLog, // #251: Score je Stich (+ Sieg/Niederlage), nach Durchlauf gebucket → Durchlauf-Graph
    initiative, lastResult, perks, offer: newOffer, tieArmed, sinceWin, lossStreak, lastWinValue,
    critFollowArmed, weaknessArmed, weaknessBig, interplayStored, misfireScore,
    winSuit, winSuitStreak, recentResults, segmentWins, // #189 Volles Haus: segment-genauer Sieg-Zähler
    formations, // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, zu Durchlauf-Beginn berechnet
    architect: newArchitect, architectEnabled, architectPre: newArchitectPre, // Architekt (#202, ersetzt den Shop)
    glacierMass: newGlacierMass, firnStack: newFirnStack, glacierLocked: newGlacierLocked, glacierPre: glacierPreNow, glacierYield, glacierRoles, glacierRoleTiers, // Eis-Neudesign (glacier.js): Gletscher-Eigenmasse / #386 Firn-Boden-Reserve / Lock / Snapshot / Eigen-Score / Rollen
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
    growth: newGrowth, // Pflanze (§6.2): Wachstum je Karte (grün/blühend liegen als Flag auf der Karte)
    shop, // hält nur noch die (inerten) Positionsanker (#229: Shop entfernt)
    lastTrick, phase,
  };
}
