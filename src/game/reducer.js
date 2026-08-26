import { buildDeck, shuffledOrder } from "./deck.js";
import { rngAt } from "./rng.js"; // #205 Challenger Mode: adressierte Sub-Ströme (build-unabhängige Slots)
import { PERK_DEFS, buildPerkOffer } from "./perks.js";
import { familyDef, applyFamilyPick } from "./families.js"; // formationEnergyBonus läuft jetzt über engine.formationEnergyFor
import { UPGRADE_TYPES } from "./rarity.js";
import { archetypeOf, initLightning, initHeat, heatMaxFor, maxChargeFor, chargeConsumerCount,
  hasSetzlingsbeet, buildSkillOffer, buildLegendaryOffer, glacierRolesOf } from "./skills.js"; // Pflanze (v0): Aktivierungs-Effekte · Eis-Neudesign: glacierRolesOf · M1: R29-Reroll
// (#267: import aus stats.js entfernt — die Stat-Phase ist weg.)
import { computeFormations, formationPotential, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { initialShop, perkLegendaryChance, skillLegendaryChance } from "./shop.js";
import { resolveTrick, formationEnergyFor } from "./engine.js"; // formationEnergyFor: eine Quelle für Phasen-Eintritt + RESET_FORMATION
import { PERKS_OFFERED } from "./constants.js";
import * as C from "./constants.js";
import { isLegendarySkill, isTrimmableSkill } from "./skills.js"; // #217: Garantie-Erkennung (Legendär im Skill-Reroll-Angebot) · #288 Trimmen
import { DECLINE_MIN_SKILLS as G_DECLINE_MIN_SKILLS } from "./glacier.js"; // Eis-Neudesign: Ablehn-Gletscher-Schwelle (gehaltene Eis-Skills)
import { nodeEffects, legPerk2Force, rerollBase, COVER_FLOOR, ENERGY_FLOOR } from "./progression.js"; // #369 Progression-Baum: Cover/Energie-Floor + Rarität + Archetyp-/Legendär-Gatung + Reroll-Pools (alles aus dem Baum, treeEff-Felder)
import { pickWeekMods, hasWeekMod, weekModMag, TIGHT_BUILD_COVER } from "./weekMods.js"; // #370 Ranked-Rework Phase 3: Wochen-Modifikatoren (seed-deterministisch)

import { initialArchitect, familyDef as archFamily, isValidFootprint, occupiedCells as archOccupied, buildArchitectOffer, MAX_TIER as ARCH_MAX_TIER, MAX_COVER as ARCH_MAX_COVER, N_POS } from "./architect.js";
import { fullPerkOffer, fullSkillOffer, fullArchitectOffer } from "./devCatalog.js"; // Dev-Run (nur Preview): Voll-Katalog-Angebote

/* Reiner Reducer — Determinismus-Invariante: kein Math.random / Date hier drin.
   Zufall kommt als Action-Payload (rng), siehe App.jsx. Phasen:
   play → levelup → play … → gameover. */
// Architekt (#202, Shop-Ersatz): an computeFormations weitergereicht, damit Formations-Vorschauen (Aufstellungsphase)
// die Gebäude-Effekte sehen. null, solange das Flag aus ist (A/B-neutral).
const archOf = (s) => (s && s.architectEnabled ? s.architect : null);
/* #361 (+ Folge) Architekt-Undo/Reset — NUR Verschiebungen (Moves) sind umkehrbar. Ein einmal GEBAUTES Gebäude ist
   verbindlich (commit-on-choose) und bleibt auf dem Brett liegen; „↶ Rückgängig" reißt es NICHT wieder ab. Deshalb
   speichern wir ausschließlich Fußabdruck-Stände (id → footprint):
     • `phaseHistory` = Stapel {id→footprint} VOR jeder Verschiebung → UNDO nimmt genau die letzte Verschiebung zurück
       (verändert nur Fußabdrücke, nie die Gebäude-Menge).
     • `phaseAnchor`  = {id→footprint} bei Phasen-Beginn UND beim Bauen gesetzt → RESET stellt alle Verschiebungen dieser
       Phase auf die Ausgangslage zurück (die Gebäude selbst bleiben). */
const archFpMap = (a) => Object.fromEntries((a.buildings || []).map((b) => [b.id, [...(b.footprint || [])]]));
// Fußabdruck-Stand VOR einer Verschiebung auf den Stapel legen → neues phaseHistory-Array.
const archPushMove = (a) => [...(a.phaseHistory || []), archFpMap(a)];
// #205 Challenger Mode: adressierte rng-Ableitung. Bei gesetztem seed ein FRISCHER, build-unabhängig
// adressierter Sub-Strom `(seed, ...parts)`; sonst der als Action-Payload injizierte rng (Sim/Alt-Verhalten
// byte-identisch). Adressen nutzen state.cycle + eine feste Kennung, damit jeder Zieh-Punkt seinen eigenen Strom hat.
const rngFor = (state, action, ...parts) => (state.seed != null ? rngAt(state.seed, ...parts) : action.rng);
// Start-playerOrder mit Formations-Potential im Ziel-Band (#Pass6): neu mischen, bis Σ(mult−1) in
// [FORMATION_START_MIN, MAX] liegt, sonst nach TRIES die potential-nächste Anordnung (Fallback → terminiert
// immer). Rein deterministisch (rng injiziert); begrenzt die Start-Varianz des Formations-Potentials.
function startOrderInBand(deck, rng) {
  const distToBand = (p) => (p < C.FORMATION_START_MIN ? C.FORMATION_START_MIN - p
                           : p > C.FORMATION_START_MAX ? p - C.FORMATION_START_MAX : 0);
  let best = shuffledOrder(deck.length, rng);
  let bestD = distToBand(formationPotential(best, deck));
  for (let t = 1; t < C.FORMATION_START_TRIES && bestD > 0; t++) {
    const order = shuffledOrder(deck.length, rng);
    const d = distToBand(formationPotential(order, deck));
    if (d < bestD) { best = order; bestD = d; }
  }
  return best;
}

// Dev-Run (nur Preview): Erst-Angebot/-Phase eines Laufs für die Start-Entscheidung schedule[0] (frischer Build →
// perks/skills/familyTiers leer). Spiegelt die Angebots-Erzeugung der Engine; im devMode kommt der Voll-Katalog.
// Wird NUR vom Dev-Run genutzt — der normale Lauf startet unverändert über den Stat-Pfad in START_RUN.
function startDecisionSetup(decision, s, seed, actionRng, architectEnabled, devEnergy, devMode = false) {
  const mRareShift = s.treeRareShift || 0;              // Baum-RareShift (Normal-Lauf; Standard/Sim = 0)
  const legMultPerk = s.treeLegMult ?? 1;               // #369: Perk-Legendär — 0 ohne Legendär-Schicht (?? bewahrt die 0)
  const legChanceMult = s.treeLegMult ?? 1;             // #369: Gebäude-Legendär ebenfalls hinter dem „Legendär"-Knoten (0 ohne Schicht)
  const rngAtOr = (...parts) => (seed != null ? rngAt(seed, 0, ...parts) : actionRng);
  // (#267: „stat"-Zweig entfernt — es gibt keine Stat-Phase mehr.)
  const rareCap = s.rareCap || 4; // (Schritt 4c) Onboarding-Rarität-Deckel (4 = kein Deckel)
  const rareFloor = s.rareFloor || 1; // #370 Perk-Segen: Rarität-Boden (1 = kein Boden)
  // #370 Wochen-Mods (nur Ranked): Perk-/Skill-Verknappung verkleinern das Erst-Angebot (Perks 3→1, Skills 12→4 = 1/Fraktion).
  const perksOffered = hasWeekMod(s.weekMods, "scarcePerks") ? 1 : PERKS_OFFERED;
  const skillsOffered = hasWeekMod(s.weekMods, "scarceSkills") ? 4 : C.SKILLS_OFFERED;
  if (decision === "perk") {
    const off = devMode ? fullPerkOffer(architectEnabled) : buildPerkOffer([], {}, rngAtOr("perk", 0), perksOffered, perkLegendaryChance(s.shop) * legMultPerk, mRareShift, architectEnabled, 0, rareCap, rareFloor);
    return off.length ? { phase: "levelup", offer: off } : { phase: "play" };
  }
  if (decision === "shop") {
    if (!architectEnabled) return { phase: "play" };
    const offers = devMode ? fullArchitectOffer() : buildArchitectOffer(s.architect, rngAtOr("arch"), mRareShift, legChanceMult, rareCap);
    // #361: Anker-Fußabdrücke für „Zurücksetzen" (Ausgangslage der Verschiebungen) + leerer Verschiebe-Undo-Stapel.
    const archAtEntry = { ...s.architect, offers, actedMain: false, moved: false };
    return { phase: "architect", architect: { ...archAtEntry, phaseAnchor: archFpMap(archAtEntry), phaseHistory: [] } };
  }
  if (decision === "formation") {
    const formations = computeFormations(s.playerOrder, s.deck, s.roles, [], [], s.shop?.anchors || [], s.familyTiers, architectEnabled ? s.architect : null);
    return { phase: "formation", formationEnergy: (devEnergy ?? s.formationEnergyBase ?? C.FORMATION_ENERGY), formationSwaps: [], formations };
  }
  // "skill" (Default): Skill-Angebot; leerer Skill-Pool → Perk-Fallback (Runde nicht verschwenden).
  const soff = devMode ? fullSkillOffer() : buildSkillOffer([], [], rngAtOr("skill", 0), skillsOffered, skillLegendaryChance(s.shop), false, s.unlockedArchetypes); // §4b: Archetyp-Gatung
  if (soff.length) return { phase: "levelup", skillOffer: soff };
  const off = buildPerkOffer([], {}, rngAtOr("perk", 0), perksOffered, perkLegendaryChance(s.shop) * legMultPerk, mRareShift, architectEnabled, 0, rareCap, rareFloor);
  return off.length ? { phase: "levelup", offer: off } : { phase: "play" };
}

export function initialState(rng = Math.random, seed = null) {
  const deck = buildDeck();
  const oppDeck = buildDeck();
  // #205 Seedbare Runs: bei gesetztem seed leiten sich Start-Deal + Gegner-Deal aus GETRENNTEN
  // adressierten Sub-Strömen ab (build-unabhängig, reproduzierbar); sonst der injizierte rng
  // (Sim/Alt-Verhalten byte-identisch — seed == null → exakt der bisherige Pfad).
  const dealRng = seed != null ? rngAt(seed, 0, "deal") : rng;
  const oppDealRng = seed != null ? rngAt(seed, 0, "oppdeal") : rng;
  return {
    phase: "play",
    seed,                                             // #205: Lauf-Seed (32-bit uint; null = unseeded, z. B. Sim)
    deck, oppDeck,                                    // deck = Spieler (perk-modifizierbar)
    playerOrder: startOrderInBand(deck, dealRng),     // Ziehreihenfolge, Formations-Potential im Band (#Pass6)
    oppOrder: shuffledOrder(oppDeck.length, oppDealRng),
    pos: 0, cycle: 0, trickNo: 0,
    score: 0,
    // #131 Rundenscore: Score-Zuwachs je Durchlauf + die letzten zwei abgeschlossenen Rundenscores, damit die
    // Entscheidungs-Panels „Rundenscore" und die %-Differenz zur Vorrunde zeigen können (reines State-Tracking,
    // kein Math.random/Date → Determinismus bleibt). null = noch kein (Vor-)Rundenscore vorhanden.
    scoreAtCycleStart: 0, lastCycleScore: null, prevCycleScore: null,
    winStreak: 0, bestStreak: 0, wins: 0, losses: 0, ties: 0,
    crits: 0, critBonusScore: 0, bestTrickScore: 0, bestGlacierTrickScore: 0,
    maxFormations: 0, formationScore: 0, buildingScore: 0, streakScore: 0, // #161 FB-2 + #251: Score-Anteile (Formation / Gebäude / Serie)
    trickLog: [], // #251: Score je Stich (+ Sieg/Niederlage), akkumuliert über den Lauf (mit cycle) → Durchlauf-Graph
    initiative: "player",
    lastResult: null,
    sinceWin: 0, // #71 Durchbruch: aufeinanderfolgende Stiche ohne Sieg
    lossStreak: 0, lastWinValue: null, // #71 Rares: Revanche / Präzision
    critFollowArmed: false, weaknessArmed: false, // #71 Crit-Historie: Crit-Folge (D14) / Schwachstellenanalyse (D16)
    weaknessBig: false, // Rarität #167: D_WEAKNESS IV — rüstende Niederlage mit großem Abstand (→ +900 statt +600)
    interplayStored: 0, // Rarität #167: D_INTERPLAY IV — in Niederlagen gebankter Score, beim nächsten Sieg als Flat ausgezahlt
    misfireScore: 0, // V2 §22.6 D15: Score-Ladung (Fehlzündung)
    winSuit: null, winSuitStreak: 0, recentResults: [], // #71 Historie: Farbserie / Volles Haus (recentResults → secondLastResult)
    segmentWins: 0, // #189 Volles Haus: segment-genauer Sieg-Zähler (ersetzt das rollende Fenster)
    // (#267: Stat-System entfernt — keine statCrit*/statForm*/statStreak*/statOffer/statPicks mehr.)
    formations: [], // Formations-Engine (V2 §22.7): pro-Position-Multiplikatoren, von der Engine je Durchlauf gefüllt
    formationEnergy: 0, formationSwaps: [], // Formationsphase (V2 §22.8): Energie + Undo-Historie der aktuellen Phase
    roles: {}, targetPerk: null, successorQueue: [], triumphArmed: [], // Kartenrollen (V2 §22.6 C): Rollen-ids, aktive Zielauswahl, Nachfolger-/Triumph-State
    l4Boost: {}, // Legendär-Perk L4 Kritische Masse (Crit-Wert-Gewinn je Karte)
    zinsCapital: 0, zinsRate: C.ZINS_RATE_START, zinsPaidTotal: 0, cycleWins: 0, cycleLosses: 0, cycleBestTrick: 0, sammlerTypes: [], vabanquePaid: 0, cycleOpenScore: 0, cycleScoreSum: 0, // Legendär-Perks-Rework (#203) + Zinseszins-Bank
    perks: [], offer: null,
    // Raritätssystem (Epic #167, Spec §2.1): Familienrang je Familie { [familyId]: 1|2|3|4 }. Läuft ADDITIV
    // neben `perks` (flache Legendäre) — die Engine löst aktive Familien-Stufen über activeTierDefs auf.
    familyTiers: {},
    // Familien-Ziel-Auswahl (Rarität #167, Kat. A ab #163): aktive Farb-/Ziel-Auswahl beim Pick einer Stufe mit
    // `pickTarget` (z. B. A_SUIT_BOOST III/IV, A_SUIT_DUEL III/IV). null = keine offene Auswahl. Kategorie C nutzt
    // denselben Fluss später für Karten-Ziele (Rollen).
    familyTarget: null,
    // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md). Inert, solange kein Skill gewählt ist.
    skills: [], skillOffer: null, skillOfferBonus: false, legendaryOffer: null, activeArchetypes: [], lightning: initLightning(), // #272: legendaryOffer = Angebot der Legendär-Phase (Runde 29) · skillOfferBonus: das Angebot stammt aus Meisterhand (PICK_PERK), nicht aus dem Rundenplan
    heat: null, // Feuer-Archetyp (#93 F1): erst beim ersten Feuer-Skill via initHeat() aktiviert
    iceTemp: {}, // temporärer Wertbonus je card.id (Blitzfänger — Blitz-Archetyp, in engine.js gelesen)
    growth: {}, colonized: {}, plantLoss: {}, // Pflanze-Fraktion (v0): Wachstum je card.id (nur steigend) / kolonisierte Gegnerkarten (grün = card.green) / Niederlagen-Zähler (Wurzelschlag-Buff v0.4)
    ash: 0, brandPending: {}, brandActive: {}, forged: {}, // Feuer-Rework (v0): Asche-Ressource / Brand-Marker (Gegner, je card.id) / geschmiedete Dauerwerte
    // #270 Fraktions-Panels: kumulative Lauf-Kennzahlen (nur Anzeige) — Direkt-Ertrag (Σ post-stack Direkt-Score) + Motor-Zähler.
    lightYield: 0, plantRoot: 0, plantBloom: 0, plantHarvest: 0, fireBase: 0, fireWhite: 0, // #270 Eigen-Score-Kanäle
    ionTotal: 0, growthTotal: 0, ashBurned: 0, brandTotal: 0, // #270 Motor-Zähler
    trimCount: 0, // #288 Trimmen: Anzahl ersetzter Wachstums-Skills → Wurzel-/Blüten-Multiplikator
    tieArmed: false,
    shop: initialShop(), // hält nur noch die (inerten) Positionsanker — der Shop ist entfernt (#229)
    architectEnabled: false,       // Architekt (#202): Flag — bei true öffnet sich die Architekt-Phase (im Spiel via START_RUN true; false = Sim-Baseline ohne Architekt)
    architect: { ...initialArchitect(), maxCover: ARCH_MAX_COVER }, // Gebäude-Overlay (8×5) + Angebot + Meilenstein-Zähler; maxCover als #217-Seam (Rang-Bonus: base + Grad×N) run-geseedet
    architectPre: null,            // Precompute je Durchlauf (von der Engine gefüllt)
    glacierMass: new Array(C.BOARD_POSITIONS).fill(0), firnStack: new Array(C.BOARD_POSITIONS).fill(0), glacierLocked: new Array(C.BOARD_POSITIONS).fill(false), glacierPre: null, glacierYield: 0, glacierRoles: [], // Eis-Neudesign (glacier.js): Gletscher-Eigenmasse / #386 Firn-Boden-Reserve / Gletscher-Lock / Durchlauf-Snapshot / Eigen-Score / aktive Rollen
    frozenOppPending: {}, frozenOppActive: {}, // Eis-Neudesign (Einfrieren): Gegner-Marken (Gegnerkarte verliert nächsten Stich)
    glacierBuffPending: {}, glacierBuffActive: {}, // Eis-Neudesign (Frostbund): Wert-Buff auf Nicht-Eis-Nachbarkarten
    grosseLawineFired: false, // Eis-Neudesign (Große Lawine): One-Shot-Finisher-Flag
    pendingPerkOffer: null, // Eis-Neudesign: geparktes Perk-Angebot, wenn das Ablehnen bei vollen Eis-Slots zuerst eine Gletscher-Wahl öffnet
    // Dev-Run (nur Preview): pro-Lauf-Overrides. null/false → Bestandsverhalten (globaler Plan, C.MAX_CYCLES,
    // C.FORMATION_ENERGY, Zufallsangebote). Von START_RUN mit action.dev gesetzt; die Engine liest sie im Übergang.
    devSchedule: null, maxCycles: null, devEnergy: null, devMode: false,
    // #263: DREI getrennte Reroll-Pools je Lauf (Perks · Gebäude · Skills), je BASE_REROLLS (2), nicht untereinander
    // teilbar, kein Nachschub. Ersetzt den einen geteilten Pool; Gebäude/Architekt hat jetzt auch einen Reroll.
    rerollsPerk: C.BASE_REROLLS, rerollsArch: C.BASE_REROLLS, rerollsSkill: C.BASE_REROLLS,
    rerollsUsed: 0,                // #214/#263: Zähler benutzter Rerolls über ALLE Kategorien → Sparfuchs-Challenge (deck_c3 „noRerollRun")
    offerRerolls: 0,               // #205: Reroll-Index des AKTUELLEN Angebots (Original = 0) → adressiert `(seed,cycle,kind,offerRerolls)`; von der Engine bei jedem frischen Angebot auf 0 gesetzt
    // #382 Gesperrte Felder (Positionen 0..39) — nur noch aus den Ranked-Wochen-Mods (blockForm/blockArch) gespeist;
    // der Challenge-Modus ist entfernt. Leer außerhalb Ranked. Als Arrays gehalten (serialisierbar für RESTORE_RUN).
    challengeBlockArch: [], challengeBlockForm: [],
    lastTrick: null,
  };
}
/* Eis-Neudesign: Gibt es überhaupt noch eine Zelle, die GLACIER_LOCK annehmen würde? Die Phase „glacier-target"
   ist Pflicht und hat keinen Ausgang (GlacierPick kennt nur Bestätigen) — wer sie ohne gültiges Ziel betritt,
   sitzt fest, weil GLACIER_LOCK jede Eingabe zurückweist. Die Prüfung muss deshalb DIESELBEN Bedingungen
   spiegeln wie GLACIER_LOCK: weder bereits gefroren NOCH über challengeBlockForm gesperrt. (Vorher prüfte nur
   DECLINE_SKILL, und dort auch nur auf `glacierLocked` — der Eis-Pick in PICK_SKILL prüfte gar nicht.) */
function hasFreeGlacierField(locked, blockForm, n) {
  for (let i = 0; i < n; i++) {
    if (locked && locked[i]) continue;
    if (blockForm && blockForm.includes(i)) continue;
    return true;
  }
  return false;
}

// #301 K verschiedene Positionen aus [0..n) deterministisch ziehen (Fisher-Yates mit einem rng-Strom).
function pickCells(rng, n, k) {
  const idx = Array.from({ length: n }, (_, i) => i);
  const m = Math.min(k, n);
  for (let i = 0; i < m; i++) {
    const j = i + Math.floor(rng() * (n - i));
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  return idx.slice(0, m).sort((a, b) => a - b);
}

// Menü-/Startbildschirm (#4) — kein laufendes Spiel; App rendert hier nur den StartScreen.
export function menuState() {
  return { phase: "menu" };
}

export function reducer(state, action) {
  switch (action.type) {
    case "START_RUN":   // frischer Lauf aus dem Menü / Neustart
    case "RESET": {
      // Start-Entscheidung vor Durchlauf 0 = Stat (DECISION_CYCLE[0], §22.2). Immer alle vier Stats.
      // #205: action.seed (Challenge/frischer Lauf) macht den Lauf seedbar; null (Sim) → Alt-Verhalten via action.rng.
      const seed = action.seed != null ? (action.seed >>> 0) : null;
      const s = initialState(action.rng, seed);
      // Architekt-Flag (#202): das Spiel startet mit architect:true (Shop-Ersatz); der Sim übersteuert per Action (A/B),
      // sonst greift der Modul-Default (env ARCHITECT). shopDisabled = Sim-Null-Baseline „ohne".
      const architectEnabled = action.architect != null ? !!action.architect : !!C.ARCHITECT_ENABLED; // #229: false = Sim-Baseline (kein Architekt, direkt in den Durchlauf)
      // Dev-Run (nur Preview): action.dev = { rounds, schedule, cover, energy } konfiguriert einen frei einstellbaren Lauf.
      // Nur dieser Zweig weicht ab; ohne action.dev bleibt der normale Lauf-Start UNVERÄNDERT (Start = Stat).
      const dev = action.dev && typeof action.dev === "object" ? action.dev : null;
      // #370 EIN Ranglisten-Modus („ranked") über den `ranked`-Flag: tree-UNABHÄNGIGE, faire Baseline (kein Baum →
      //   fix 2 Rerolls, alle Archetypen, rareCap 4, R29 an) — für alle gleich, unabhängig vom echten Upgrade-Tree.
      //   Ersetzt den alten Standard/Meister-Split. Sonst (Normal-/Seed-Lauf) zählt das echte Profil (action.profile).
      //   effProfile null → treeEff null (Baseline/Sim/profil-los). Die Wochen-Modifikatoren kommen in Phase 2/3 obendrauf.
      const ranked = action.ranked || null;
      const effProfile = ranked ? null : action.profile;
      const treeEff = (!dev && effProfile) ? nodeEffects(effProfile) : null;
      const treeCover = treeEff ? treeEff.treeCoverBonus : 0;      // +Baufeld-Zellen (0..4)
      const treeEnergyBonus = treeEff ? treeEff.treeEnergyBonus : 0; // +Formations-Energie (0..2)
      const treeRareShift = treeEff ? treeEff.treeRareShift : 0;   // Drop-Raten-Stufe (0..4)
      // #369 §4: Legendär-PERK-Chance — 0 ohne Legendär-Schicht (kein Legendär-Perk vor dem „Legendär"-Knoten),
      // sonst ×(1 + Drop·Schritt) bis ~×3.3. Sim/Standard/Dev → 1 (byte-identisch). Die Perk-Nähte lesen ?? 1,
      // die Gebäude-Nähte || 1 (0 → Basis-Chance), s. u.
      const treeLegMult = treeEff ? treeEff.legMult : 1;
      const treeLegForce2 = legPerk2Force(treeEff); // #369 §5b: 2. Perk-Phase → generelle Legendär-Phase (voller Satz)
      const treeLegSlotReroll = treeEff ? treeEff.rerollDeckLeg : 0; // Deck-Reroll: +1 in der Archetyp-Legendär-Phase
      const rerollPerk2 = treeEff ? treeEff.rerollPerk2 : 0;         // +1 in der generellen Legendär-Phase (2. Perk-Phase)
      const legCountMap = treeEff ? treeEff.legCountByArch : null;   // #369 §5a: Zähl-Map je Archetyp (Pool = alle freigeschalteten)
      // (#369 §6) Reroll-Basis je Pool: Normal-/Meister-Lauf mit Profil → fest 1; profil-los (Sim/Standard) → C.BASE_REROLLS.
      const normalRerolls = treeEff ? rerollBase(effProfile) : C.BASE_REROLLS;
      // Archetyp-Allowlist + Rarität-Deckel + Archetyp-Legendär-Phase — alles aus dem BAUM (#369, früher Onboarding).
      // Nur mit Profil (treeEff≠null); sonst neutral (null / 4 / an) für Sim/Standard/Dev = byte-identisch.
      const unlockedArch = treeEff ? treeEff.unlockedArchetypes : null;
      const rareCap = treeEff ? treeEff.maxTier : 4;
      const legPhaseEnabled = treeEff ? treeEff.archLegPhaseOn : true;
      // Formations-Energie-Basis (#369 §1): Normal-Lauf-Boden 3 + Baum (→ max 5); Sim/Standard/Dev = C.FORMATION_ENERGY.
      const formationEnergyBase = treeEff ? ENERGY_FLOOR + treeEnergyBonus : C.FORMATION_ENERGY;
      if (dev) {
        const devRounds = Math.max(1, Math.min(200, Math.floor(Number(dev.rounds) || 0)));
        const devSchedule = Array.from({ length: devRounds }, (_, i) => (Array.isArray(dev.schedule) && dev.schedule[i]) || C.DECISION_SCHEDULE[i] || "perk");
        const devCover = Math.max(0, Math.min(N_POS, Math.floor(Number(dev.cover) || 0)));
        const devEnergy = Math.max(0, Math.min(N_POS, Math.floor(Number(dev.energy) || 0)));
        const sBase = { ...s, architect: { ...s.architect, maxCover: devCover } };
        const patch = startDecisionSetup(devSchedule[0], sBase, seed, action.rng, true, devEnergy, true);
        return { ...sBase, architectEnabled: true,
          devSchedule, maxCycles: devRounds, devEnergy, devMode: true,
          difficulty: null,
          rerollsPerk: C.BASE_REROLLS, rerollsArch: C.BASE_REROLLS, rerollsSkill: C.BASE_REROLLS,
          skillOffer: null, offer: null, ...patch };
      }
      // #267: Erste Entscheidung (Runde 1) folgt dem Plan = DECISION_SCHEDULE[0] = "skill" (Blind-Commit, gewollt) —
      // NICHT mehr die entfernte Stat-Phase. startDecisionSetup baut das Erst-Angebot (Skill-Offer) deterministisch.
      // Baufeld (#369 §1): Normal-Lauf setzt auf dem Boden 20 auf (+0..4 aus dem Baum → max 24); Sim/Standard nutzen
      // die Engine-Basis ARCH_MAX_COVER (byte-identisch). Der Dev-Zweig setzt maxCover separat (devCover).
      const coverBase = treeEff ? COVER_FLOOR : s.architect.maxCover;
      const architectStart = { ...s.architect, maxCover: coverBase + treeCover };
      // #370 Wochen-Modifikatoren (nur Ranked, seed-deterministisch) — Reducer-native Nähte: Rerolls, Feld-Sperren,
      //   Bauplätze, Aufstell-Energie, Perk-Rarität-Deckel. Die Engine-Nähte (Karten-Wert/Boni/Angebote/Deck-Shuffle)
      //   lesen dieselbe state.weekMods-Liste. Eigene rngAt-Adress-Ströme (kein Deal-Störer). #382: Challenge-Modus
      //   entfernt — die Feld-Sperren (challengeBlockForm/Arch) speisen sich jetzt AUSSCHLIESSLICH aus weekMods.
      const wmActive = (ranked && seed != null) ? pickWeekMods(seed) : [];
      const wm = Object.fromEntries(wmActive.map((m) => [m.effect, m]));
      const noReroll = !!wm.noReroll;
      const effReroll = noReroll ? 0 : normalRerolls;
      const wmBlockForm = wm.blockForm ? pickCells(rngAt(seed, "weekmods", "blockForm"), N_POS, wm.blockForm.mag) : [];
      const wmBlockArch = wm.blockArch ? pickCells(rngAt(seed, "weekmods", "blockArch"), N_POS, wm.blockArch.mag) : [];
      const effRareCap = wm.perkCap ? 2 : rareCap;                                   // Perk-Deckel → max Selten (kein Sehr selten/Rar)
      const effRareFloor = wm.perkBlessing ? 3 : 1;                                  // Perk-Segen → Boden Sehr selten (nur Stufe III/IV)
      const effSkillSlots = C.SKILL_SLOTS + (wm.skillSlots?.mag || 0);               // Skill-Fülle → +mag Skillslots (Halten mehr Skills)
      const effEnergy = wm.energyEbb ? 0 : wm.energyFlood ? formationEnergyBase * 2 : formationEnergyBase;
      const effCover = wm.tightBuild ? TIGHT_BUILD_COVER : wm.noBuildLimit ? N_POS : (coverBase + treeCover); // Enge Aufstellung / Kein Gebäudelimit
      const weekModsState = wmActive.map((m) => ({ id: m.id, effect: m.effect, sign: m.sign, mag: m.mag, name: m.name, text: m.text }));
      const sBase = { ...s, architect: { ...architectStart, maxCover: effCover }, architectEnabled, treeRareShift, treeLegMult, treeLegForce2,
        rerollsLeg: noReroll ? 0 : treeLegSlotReroll, rerollsPerk2: noReroll ? 0 : rerollPerk2,
        legCountByArch: legCountMap, formationEnergyBase: effEnergy, unlockedArchetypes: unlockedArch, rareCap: effRareCap, rareFloor: effRareFloor, skillSlots: effSkillSlots, legPhaseEnabled, ranked,
        weekMods: weekModsState,
        challengeBlockArch: [...new Set(wmBlockArch)],
        challengeBlockForm: [...new Set(wmBlockForm)] };
      const startPatch = startDecisionSetup(C.DECISION_SCHEDULE[0] || "skill", sBase, seed, action.rng, architectEnabled, undefined, false);
      return { ...sBase, architectEnabled,
        difficulty: null,
        // #263: drei getrennte Reroll-Pools. (Schritt 4) Normal-/Meister-Lauf MIT Profil: Basis 1 aus Onboarding-Glied 1
        // + A1/A2 (rerollBase, Cap 3) — erster Lauf = 0. OHNE Profil (Sim/Standard) bleibt es C.BASE_REROLLS (2/2/2).
        // #301 C1 (Keine Rerolls) / #370 Wochen-Mod „Kein Reroll" nullen alle drei Pools (noReroll → effReroll).
        rerollsPerk: effReroll,
        rerollsArch: effReroll,
        rerollsSkill: effReroll,
        ...startPatch };
    }

    case "TO_MENU":     // laufenden Run verlassen (#5)
      return menuState();

    case "RESTORE_RUN": // Resume: einen gespeicherten laufenden Run laden — der komplette Reducer-State wird durch
      // den Snapshot ersetzt. Guard gegen Unfug (kein Deck / Menü-/Gameover-Snapshot → ignorieren, kein Sprung).
      return (action.state && action.state.deck && action.state.phase !== "menu" && action.state.phase !== "gameover")
        ? action.state : state;

    case "END_RUN":     // Lauf freiwillig beenden → Endscreen (GameOver) statt direkt ins Menü.
      // Highscore/Geist sichert der gameover-Effekt in App.jsx (saveRun). Menü/Gameover ignorieren.
      return (state.phase === "menu" || state.phase === "gameover") ? state : { ...state, phase: "gameover" };


    /* ---- Architekt (#202, Shop-Ersatz): Bau-Aktionen. Hauptaktion (errichten ODER ausbauen) ist EXKLUSIV je Phase;
           versetzen genau 1×; abreißen unbegrenzt; fertig → Durchlauf startet. Alle Platzierungen rein validiert. ---- */
    case "ARCHITECT_BUILD": { // errichten: Bauplan (Familie+Stufe aus dem Angebot) an gültiger Position/Rotation
      if (state.phase !== "architect") return state;
      const a = state.architect;
      if (a.actedMain) return state;                                   // Hauptaktion bereits verbraucht
      const off = (a.offers || []).find((o) => o.familyId === action.familyId && o.tier === action.tier && !o.used);
      if (!off) return state;                                          // Bauplan nicht (mehr) im Angebot
      const fam = archFamily(action.familyId);
      if (!fam) return state;
      if (!isValidFootprint(fam.form, action.footprint, a.buildings, state.challengeBlockArch)) return state; // Form/Gitter/Overlap (+ #301 gesperrte Zellen)
      if (archOccupied(a.buildings).size + action.footprint.length > (a.maxCover ?? ARCH_MAX_COVER)) return state; // Baufeld-Deckel: keine neue Fläche über maxCover
      if (fam.colorLocked && !C.SUIT_ORDER.includes(action.colorChoice)) return state; // Buntglas/Zunfthaus brauchen eine Farbe
      const footprint = [...action.footprint].sort((x, y) => x - y);
      const building = { id: a.nextId, familyId: fam.id, tier: off.tier, footprint, colorChoice: fam.colorLocked ? action.colorChoice : null };
      const offers = a.offers.map((o) => (o === off ? { ...o, used: true } : o));
      // #361-Folge: Bau ist verbindlich → KEIN Undo-Schritt; nur den Anker-Fußabdruck des neuen Gebäudes für „Zurücksetzen" merken.
      return { ...state, architect: { ...a, buildings: [...a.buildings, building], nextId: a.nextId + 1, actedMain: true, offers, phaseAnchor: { ...(a.phaseAnchor || {}), [building.id]: [...footprint] } } };
    }
    case "ARCHITECT_UPGRADE": { // ausbauen: bestehendes Gebäude +1 Stufe (max 4; Legendäre haben keine Stufen)
      if (state.phase !== "architect") return state;
      const a = state.architect;
      if (a.actedMain) return state;
      const b = a.buildings.find((x) => x.id === action.buildingId);
      if (!b) return state;
      const fam = archFamily(b.familyId);
      if (!fam || fam.legendary || b.tier >= ARCH_MAX_TIER) return state; // legendär/Maximalstufe → nicht ausbaubar
      const buildings = a.buildings.map((x) => (x.id === b.id ? { ...x, tier: x.tier + 1 } : x));
      // #361-Folge: Aufwerten ist verbindlich (Hauptaktion) → KEIN Undo-Schritt.
      return { ...state, architect: { ...a, buildings, actedMain: true } };
    }
    case "ARCHITECT_MOVE": { // versetzen: BELIEBIG OFT bis zum Bestätigen (#224.10), an neue gültige Position (ohne Overlap mit den ANDEREN)
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const b = a.buildings.find((x) => x.id === action.buildingId);
      if (!b) return state;
      const fam = archFamily(b.familyId);
      const others = a.buildings.filter((x) => x.id !== b.id);
      if (!fam || !isValidFootprint(fam.form, action.footprint, others, state.challengeBlockArch)) return state;
      const footprint = [...action.footprint].sort((x, y) => x - y);
      const buildings = a.buildings.map((x) => (x.id === b.id ? { ...x, footprint } : x));
      return { ...state, architect: { ...a, buildings, moved: true, phaseHistory: archPushMove(a) } }; // #361-Folge: Verschiebung → Undo-Schritt
    }
    case "ARCHITECT_MOVE_MULTI": { // atomarer Mehrfach-Move (Drop über ein Gebäude → getroffene weichen aus / Swap). Prüft die END-Lage.
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const moves = action.moves || []; // [{ buildingId, footprint }]
      if (!moves.length) return state;
      const newFp = {};
      for (const m of moves) {
        const b = a.buildings.find((x) => x.id === m.buildingId);
        if (!b || !archFamily(b.familyId)) return state;
        newFp[m.buildingId] = [...m.footprint].sort((x, y) => x - y);
      }
      const finalBuildings = a.buildings.map((x) => (newFp[x.id] ? { ...x, footprint: newFp[x.id] } : x));
      // Jede verschobene Karte: gültige Formlage UND kein Overlap mit den übrigen END-Lagen (deckt Overlap/Gitter/Form ab).
      for (const m of moves) {
        const b = a.buildings.find((x) => x.id === m.buildingId), fam = archFamily(b.familyId);
        const others = finalBuildings.filter((x) => x.id !== b.id);
        if (!isValidFootprint(fam.form, newFp[b.id], others, state.challengeBlockArch)) return state;
      }
      return { ...state, architect: { ...a, buildings: finalBuildings, moved: true, phaseHistory: archPushMove(a) } }; // #361-Folge: (Mehrfach-)Verschiebung → Undo-Schritt
    }
    case "ARCHITECT_RECOLOR": { // #261: Buff-Farbe eines colorLocked-Gebäudes anpassen — freie Anpassung bis zum Bestätigen (wie MOVE, kein actedMain)
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const b = a.buildings.find((x) => x.id === action.buildingId);
      if (!b) return state;
      const fam = archFamily(b.familyId);
      if (!fam || !fam.colorLocked || !C.SUIT_ORDER.includes(action.colorChoice)) return state;
      const buildings = a.buildings.map((x) => (x.id === b.id ? { ...x, colorChoice: action.colorChoice } : x));
      return { ...state, architect: { ...a, buildings } }; // #361-Folge: Umfärben ist keine Verschiebung → kein Undo-Schritt
    }
    case "ARCHITECT_DEMOLISH": { // abreißen: jederzeit, unbegrenzt, ohne Gegenwert (nur Platz frei)
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const buildings = a.buildings.filter((x) => x.id !== action.buildingId);
      if (buildings.length === a.buildings.length) return state;       // nichts entfernt → kein Fortschritt
      const winCounters = { ...a.winCounters }; delete winCounters[action.buildingId];
      return { ...state, architect: { ...a, buildings, winCounters } }; // #361-Folge: Abriss ist keine Verschiebung → kein Undo-Schritt
    }
    case "REROLL_ARCHITECT": { // #263: Architekt-Bauplan-Angebot neu würfeln — eigener Gebäude-Reroll-Pool (rerollsArch).
      if (state.phase !== "architect") return state;
      const a = state.architect;
      if (a.actedMain) return state;                                  // schon gebaut/aufgewertet → Angebot verbraucht
      const tokens = state.rerollsArch || 0;
      if (tokens <= 0) return state;
      const idx = (state.offerRerolls || 0) + 1;                      // #205: frischer adressierter Strom (seed,cycle,"arch",idx)
      const offers = buildArchitectOffer(a, rngFor(state, action, state.cycle, "arch", idx), state.treeRareShift || 0, state.treeLegMult ?? 1, state.rareCap || 4);
      return { ...state, architect: { ...a, offers }, offerRerolls: idx, rerollsArch: tokens - 1, rerollsUsed: (state.rerollsUsed || 0) + 1 };
    }
    // #361 (+ Folge) „↶ Rückgängig" — NUR die letzte Verschiebung zurücknehmen (Fußabdrücke vom Stapel). Gebaute
    // Gebäude bleiben unberührt (verbindlich) — es werden ausschließlich Fußabdrücke bestehender Gebäude restauriert.
    case "ARCHITECT_UNDO": {
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const hist = a.phaseHistory || [];
      if (!hist.length) return state;                                  // keine Verschiebung → nichts rückgängig
      const prevFp = hist[hist.length - 1];                            // {id→footprint} VOR der letzten Verschiebung
      const buildings = a.buildings.map((b) => (prevFp[b.id] ? { ...b, footprint: [...prevFp[b.id]] } : b));
      return { ...state, architect: { ...a, buildings, phaseHistory: hist.slice(0, -1) } };
    }
    // #361 (+ Folge) „Zurücksetzen" — ALLE Verschiebungen dieser Phase auf die Ausgangslage (phaseAnchor) zurück. Die
    // Gebäude selbst (auch die diese Phase gebauten) BLEIBEN — nur ihre Fußabdrücke gehen auf den Anker-Stand.
    case "ARCHITECT_RESET": {
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const anchor = a.phaseAnchor || {};
      const buildings = a.buildings.map((b) => (anchor[b.id] ? { ...b, footprint: [...anchor[b.id]] } : b));
      return { ...state, architect: { ...a, buildings, moved: false, phaseHistory: [] } };
    }
    case "ARCHITECT_DONE": { // Architekt-Phase verlassen → zugehöriger Durchlauf startet (Angebot leeren).
      if (state.phase !== "architect") return state;
      // #361 transiente Undo-Daten mit der Phase verwerfen (nicht in den gespeicherten Lauf mitschleppen).
      return { ...state, phase: "play", architect: { ...state.architect, offers: null, phaseHistory: [], phaseAnchor: null } };
    }

    case "RESOLVE_TRICK":
      return resolveTrick(state, action.rng);

    case "PICK_PERK": {
      if (state.phase !== "levelup") return state;
      const { perkId } = action;
      if (!state.offer || !state.offer.includes(perkId)) return state;
      const def = PERK_DEFS[perkId];
      if (!def) return state; // Sicherheitsnetz (v. a. Dev-Voll-Katalog): unbekannte perkId → No-Op statt Crash
      const perks = [...state.perks, perkId];
      // Kat. A (Deck-Mods beim Pick) ist zu Familien migriert (#167) → flache Perks verändern das Deck nicht mehr.
      let deck = state.deck;
      // Umverteilung (L_UMV, #203): alle Karten nehmen sofort DAUERHAFT den (gerundeten) Deck-Durchschnittswert an
      // (KEINE Karte wird entfernt) → glättet ein schiefes Deck und macht es uniform (→ Wiederholungs-Formationen).
      // round statt floor: floor senkt jede Karte um ~0,5 → drückt die Winrate; round bleibt neutral um den Ø.
      if (def.redistribute) {
        const avg = Math.round(state.deck.reduce((s, c) => s + c.value, 0) / Math.max(1, state.deck.length));
        deck = state.deck.map((c) => ({ ...c, value: avg }));
      }
      // Opfergang (L_OPFER, v0.3, NACHTEIL): alle Karten verlieren sofort dauerhaft OPFERGANG_VALUE Kartenwert;
      // die Gegenleistung (OPFERGANG_MULT) hängt als scoreMult am Perk und läuft automatisch über prodHook.
      // KLEMMUNG bei 1: #34 hat die schwache 0 bewusst aus RANKS entfernt, also darf hier keine 0/negativ entstehen.
      // Nebenwirkung der Klemmung (bewusst): in schwachen Decks sitzen viele Karten schon auf 1 → der Nachteil ist
      // dort milder, in Hochwert-Decks voll wirksam. Der effektive Preis schwankt damit stark mit dem Build.
      if (def.opfergang) deck = deck.map((c) => ({ ...c, value: Math.max(1, c.value - def.opfergang) }));
      // Meisterhand (L_MEIS, v0.3): hebt den Skill-Slot-Deckel dauerhaft — dieselbe Naht wie die Wochen-Mod
      // „Skill-Fülle" (#370). PICK_SKILL (unten) und SkillSelect lesen beide state.skillSlots || C.SKILL_SLOTS.
      // commitScale behält bewusst C.SKILL_SLOTS als Nenner (#370-Entscheidung) → der Extra-Slot verwässert das
      // Fraktions-Bekenntnis nicht.
      const skillSlots = def.skillSlotBonus
        ? (state.skillSlots || C.SKILL_SLOTS) + def.skillSlotBonus
        : state.skillSlots;
      // Bauhütte (L_BAUH, Gebäude-Legendäres): hebt sofort dauerhaft den Baufeld-Deckel (maxCover) → mehr Bauplatz.
      const architect = def.bauhuette && state.architect
        ? { ...state.architect, maxCover: (state.architect.maxCover ?? ARCH_MAX_COVER) + C.BAUHUETTE_COVER }
        : state.architect;
      // Perks mit manueller Kartenauswahl öffnen die Zielauswahl (§22.5); sonst weiter.
      const goTarget = !!def.needsTarget;
      // Meisterhand: der gewonnene Slot wird SOFORT gefüllt — der Pick öffnet direkt eine Skill-Wahl.
      // Ohne das war der Perk in der Praxis wirkungslos: Skill-Phasen liegen fest im DECISION_SCHEDULE, und
      // die Legendär-Phase (Runde 29) ist die LETZTE davon. Wer Meisterhand danach zieht — der übliche Fall,
      // legendäre Perks häufen sich in der 2. Perk-Phase —, bekam einen Slot, für den nie wieder ein Angebot
      // kam. Der Slot blieb leer bis zum Lauf-Ende. Dieselbe Naht wie DECLINE_LEGENDARY (dort: Legendär
      // abgelehnt → normale Skill-Wahl), nur andersherum ausgelöst.
      // Eigener Adress-Strom "meisterhand" statt "skill": in einer PERK-Phase ist der Skill-Strom dieses
      // Durchlaufs zwar frei, aber ein eigener Name kann per Konstruktion nie mit einem kollidieren.
      // Legendär-Chance 0 — der legendäre SKILL hat seine eigene Phase und seinen eigenen Slot (#272);
      // ein Perk soll keinen zweiten nachliefern.
      const bonusSkillOffer = (def.skillSlotBonus && !goTarget)
        ? buildSkillOffer(state.skills, state.activeArchetypes || [], rngFor(state, action, state.cycle, "meisterhand", 0),
            hasWeekMod(state.weekMods, "scarceSkills") ? 4 : C.SKILLS_OFFERED, 0, false, state.unlockedArchetypes)
        : null;
      const formations = (def.redistribute || def.opfergang)
        ? computeFormations(state.playerOrder, deck, state.roles, perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state))
        : state.formations;
      return { ...state, perks, deck, architect, skillSlots, offer: null, formations,
               // Leeres Angebot (Skill-Pool erschöpft) → normal weiterspielen; der Slot bleibt, die nächste
               // reguläre Skill-Phase füllt ihn dann (`normalCount < skillSlots` → hinzufügen statt ersetzen).
               ...(bonusSkillOffer && bonusSkillOffer.length
                 ? { skillOffer: bonusSkillOffer, skillOfferBonus: true, offerRerolls: 0 }
                 : {}),
               phase: goTarget ? "target" : (bonusSkillOffer && bonusSkillOffer.length ? "levelup" : "play"),
               targetPerk: goTarget ? perkId : null };
    }

    // Familien-Pick (Rarität-Umbau #167, Spec §2.4): eine Familie auf eine Zielstufe (I–IV) heben/erwerben.
    // Läuft ADDITIV neben PICK_PERK; applyFamilyPick liefert das Patch (familyTiers, deck, roles) — bei
    // REPLACEMENT (Kat. D) nur der Rang, CUMULATIVE führt ihr Deck-Paket aus. Die Angebotsvalidierung
    // (Familie+Stufe im Angebot, Ziel-Flow bei ROLE) folgt mit buildFamilyOffer (#163 Schritt 3).
    case "PICK_FAMILY": {
      if (state.phase !== "levelup") return state;
      const { familyId, tier } = action;
      const fam = familyDef(familyId);
      if (!fam || !tier) return state;
      // Angebotsvalidierung (Spec §2.4): die Familie+Zielstufe muss im aktuellen Angebot stehen (analog PICK_PERK).
      if (!state.offer || !state.offer.some((e) => e && e.familyId === familyId && e.tier === tier)) return state;
      const applyNow = () => {
        const { familyTiers, deck, roles } = applyFamilyPick(
          familyId, tier, { familyTiers: state.familyTiers, deck: state.deck, roles: state.roles }, rngFor(state, action, state.cycle, "pick"));
        // [#229 N3] Formationen sofort neu berechnen (analog CONFIRM_TARGET) — sonst bis zum nächsten RESOLVE_TRICK stale.
        return { ...state, familyTiers, deck, roles,
          formations: computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], familyTiers, archOf(state)),
          offer: null, phase: "play" };
      };
      const pt = fam.tiers[tier] && fam.tiers[tier].pickTarget;
      if (!pt) return applyNow();                                                          // kein Ziel → direkt anwenden
      // Farb-Ziel (A_SUIT_BOOST/A_SUIT_DUEL; #179 auch Farballianz E_COLOR_ALLIANCE): immer die volle Anzahl frisch wählen.
      if (pt.suits) {
        // Comfort: müssen ALLE Farben gewählt werden (Farballianz III/IV, suits:4 — einzige suits≥voll-Familie), ist die
        // Auswahl erzwungen und die Reihenfolge irrelevant (die Allianz macht alle vier zu EINER Farbe, keine Paare) →
        // Picker überspringen und direkt mit allen Farben anwenden (kein „4 von 4 antippen"-Leerlauf).
        if (pt.suits >= C.SUIT_ORDER.length) {
          const target = { suits: C.SUIT_ORDER.slice(), cards: [], formationType: null, order: state.playerOrder };
          const { familyTiers, deck, roles } = applyFamilyPick(
            familyId, tier, { familyTiers: state.familyTiers, deck: state.deck, roles: state.roles, target }, rngFor(state, action, state.cycle, "target"));
          return { ...state, familyTiers, deck, roles,
            formations: computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], familyTiers, archOf(state)),
            offer: null, phase: "play" };
        }
        return { ...state, offer: null, phase: "family-target", familyTarget: { familyId, tier, kind: "suits", need: pt.suits, suits: [], cards: [], formationType: null } };
      }
      // Formationstyp-Ziel (#179, Formationskern E_CORE): genau einen der vier Basistypen wählen.
      if (pt.formationType) return { ...state, offer: null, phase: "family-target", familyTarget: { familyId, tier, kind: "formationType", need: 1, suits: [], cards: [], formationType: null } };
      // Karten-Ziel: ROLE wählt nur die ZUSÄTZLICHEN Ziele (Stufe-Ziel − bereits gehaltene, Spec §2.3);
      // CUMULATIVE (C_SACRIFICE) wählt die volle Anzahl. need 0 (Upgrade ohne neue Ziele) → direkt anwenden.
      const held = fam.upgradeType === UPGRADE_TYPES.ROLE ? ((state.roles || {})[familyId] || []).length : 0;
      const need = Math.max(0, pt.cards - held);
      if (need === 0) return applyNow();
      return { ...state, offer: null, phase: "family-target", familyTarget: { familyId, tier, kind: "cards", need, suits: [], cards: [] } };
    }

    // ---- Familien-Ziel-Auswahl (Rarität #167, Spec §2.3/§2.4) — Farb- ODER Karten-Ziel für pickTarget-Stufen.
    //      `familyTarget = { familyId, tier, kind:"suits"|"cards", need, suits, cards }`. Kategorie C nutzt den
    //      Karten-Modus für Rollen-Ziele; A den Farb-Modus. ----
    case "FAMILY_TARGET_SUIT": {
      if (state.phase !== "family-target" || !state.familyTarget || state.familyTarget.kind !== "suits") return state;
      const ft = state.familyTarget;
      if (!C.SUIT_ORDER.includes(action.suit)) return state;
      let suits = ft.suits.slice();
      if (suits.includes(action.suit)) suits = suits.filter((s) => s !== action.suit);   // abwählen
      else if (suits.length < ft.need) suits.push(action.suit);                           // hinzufügen (Reihenfolge = Gewinner→Verlierer)
      else if (ft.need === 1) suits = [action.suit];                                      // Einzelwahl: umschalten
      else return state;                                                                  // Limit erreicht → ignorieren
      return { ...state, familyTarget: { ...ft, suits } };
    }
    case "FAMILY_TARGET_CARD": {
      if (state.phase !== "family-target" || !state.familyTarget || state.familyTarget.kind !== "cards") return state;
      const ft = state.familyTarget;
      if (!state.deck.some((c) => c.id === action.cardId)) return state;                  // Karte muss existieren
      // Bereits als Rolle DIESER Familie gehaltene Karten sind kein gültiges Zusatz-Ziel (Rollen-Upgrade).
      if (((state.roles || {})[ft.familyId] || []).includes(action.cardId)) return state;
      let cards = ft.cards.slice();
      if (cards.includes(action.cardId)) cards = cards.filter((id) => id !== action.cardId); // abwählen
      else if (cards.length < ft.need) cards.push(action.cardId);                            // hinzufügen
      else return state;                                                                     // Limit erreicht
      return { ...state, familyTarget: { ...ft, cards } };
    }
    case "FAMILY_TARGET_FORMATION_TYPE": {
      if (state.phase !== "family-target" || !state.familyTarget || state.familyTarget.kind !== "formationType") return state;
      if (!FORMATION_TYPES.includes(action.formationType)) return state;
      const cur = state.familyTarget.formationType === action.formationType ? null : action.formationType; // Antippen schaltet um/ab
      return { ...state, familyTarget: { ...state.familyTarget, formationType: cur } };
    }
    case "FAMILY_TARGET_CONFIRM": {
      if (state.phase !== "family-target" || !state.familyTarget) return state;
      const ft = state.familyTarget;
      const sel = ft.kind === "cards" ? ft.cards : ft.kind === "suits" ? ft.suits : (ft.formationType ? [ft.formationType] : []);
      if (sel.length !== ft.need) return state;                                            // genau `need` Ziele nötig
      const target = { suits: ft.suits, cards: ft.cards, formationType: ft.formationType, order: state.playerOrder };
      const { familyTiers, deck, roles } = applyFamilyPick(
        ft.familyId, ft.tier, { familyTiers: state.familyTiers, deck: state.deck, roles: state.roles, target }, rngFor(state, action, state.cycle, "target"));
      // Rollen/Deck können die Formationserkennung ändern (C_JOKER/C_BRIDGE, C_SACRIFICE-Deckmod) → neu berechnen (wie CONFIRM_TARGET).
      const formations = computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], familyTiers, archOf(state)); // #health-check G1: archOf ergänzt — diese Stelle war älter als der Architekt (#202) und liess Gebäude-Effekte bis zur nächsten Engine-Neuberechnung fallen
      return { ...state, familyTiers, deck, roles, formations, phase: "play", familyTarget: null };
    }

    // Zielauswahl bestätigen (V2 §22.6): genau needsTarget Karten → Rolle setzen bzw. dauerhafte Wertmod (L1/L9).
    // C-Rollen (inkl. C9 Opfergabe) sind zu Familien migriert (#167) → laufen über den Familien-Ziel-Fluss, nicht hier.
    case "CONFIRM_TARGET": {
      if (state.phase !== "target" || !state.targetPerk) return state;
      const def = PERK_DEFS[state.targetPerk];
      const need = def.needsTarget || 0;
      const ids = (action.cardIds || []).slice(0, need);
      if (ids.length !== need || new Set(ids).size !== need) return state; // genau N unterschiedliche Karten
      let deck = state.deck;
      if (def.permMod) { // L1 Überladung / L9 Blutvertrag: dauerhafte Wertmods der gewählten Karten.
        deck = def.permMod(state.deck, state.playerOrder, ids);
      }
      const roles = { ...(state.roles || {}), [state.targetPerk]: ids };
      return { ...state, deck, roles, formations: computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state)), phase: "play", targetPerk: null };
    }

    // (#267: PICK_STAT entfernt — es gibt keine Stat-Phase mehr.)

    // Skill-Auswahl (zu festen Zeitpunkten laut DECISION_SCHEDULE). Hinzufügen oder — bei vollen Slots — ersetzen.
    // Der erste Skill eines Archetyps schaltet dessen System frei (lightning.active).
    case "PICK_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const { skillId, replaceId } = action;
      if (!state.skillOffer.includes(skillId) || state.skills.includes(skillId)) return state;
      // Archetyp-Deckel (#93 F0 → v0.3: MAX_ARCHETYPES=4, alle Fraktionen mischbar): ein Skill eines weiteren, noch nicht aktiven Archetyps ist nicht wählbar, sobald das Limit erreicht ist. [#230 N13]
      const arch = archetypeOf(skillId);
      const active0 = state.activeArchetypes || [];
      if (arch && !active0.includes(arch) && active0.length >= C.MAX_ARCHETYPES) return state;
      let skills;
      let trimmed = false; // #288: wurde ein wachstums-stützender Skill ersetzt? → Trimmung
      // #272: Der Legendär im 7. Slot zählt NICHT gegen SKILL_SLOTS und wird nie durch einen normalen Pick ersetzt.
      const normalCount = state.skills.filter((id) => !isLegendarySkill(id)).length;
      if (replaceId && state.skills.includes(replaceId) && !isLegendarySkill(replaceId)) {
        // Gezieltes Ersetzen (volle Slots ODER Konsumenten-Ersatzdialog #93): tauscht genau diesen (normalen) Slot.
        skills = state.skills.map((id) => (id === replaceId ? skillId : id));
        if (isTrimmableSkill(replaceId)) trimmed = true; // #288 Trimmen: Wachstums-Skill rausgetauscht
      } else if (normalCount < (state.skillSlots || C.SKILL_SLOTS)) { // #370 Skill-Fülle hebt das Slot-Limit (sonst Basis)
        skills = [...state.skills, skillId];                       // freier Slot → hinzufügen
      } else {
        return state;                                              // volle Slots ohne gültiges Ersetzungsziel
      }
      // Konsumenten-Exklusivität (#234): nur noch Blitz hält höchstens EINEN Ladungs-Konsumenten (ein zweiter ersetzt ihn).
      // Feuer darf mehrere Hitze-Konsumenten kombinieren (Flächenbrand ≠ Schmelzpunkt) — die Engine wendet jeden einzeln an.
      if (chargeConsumerCount(skills) > 1) return state;
      let activeArchetypes = state.activeArchetypes || [];
      let lightning = state.lightning;
      let heat = state.heat;
      let deck = state.deck;
      // Feuer-Rework (v0): Asche / Brand-Marker / geschmiedete Werte (beim Deaktivieren des Feuer-Archetyps zurückgesetzt).
      let ash = state.ash || 0, brandPending = state.brandPending || {}, brandActive = state.brandActive || {}, forged = state.forged || {};
      // Blitzfänger-Temp (iceTemp, Blitz-Archetyp) — beim Eis-Deaktivieren aus Alt-Verhalten geleert (#140).
      let iceTemp = state.iceTemp;
      let growth = state.growth || {}, colonized = state.colonized || {}; // Pflanze-Fraktion (v0): Wachstum / Kolonisierung
      if (arch === "lightning") lightning = { ...lightning, active: true, maxCharge: maxChargeFor(skills) }; // Donnergott → 15 (#93 F2)
      if (arch === "fire" && !(heat && heat.active)) heat = { ...initHeat(), active: true, max: heatMaxFor(skills) };
      // Eis-Neudesign: der neue Eis-Archetyp friert KEINE Karten mehr ein — die Mechanik läuft über Masse/Gletscher
      // (glacier.js), getrieben von state.glacierRoles (unten aus den Skill-`role`s).
      // Pflanze (v0): erster Pflanze-Skill → Alter Anker (1 Karte reif: grün, Wert 11) + Setzlingsbeet/Dornenkönig.
      if (arch === "plant" && !(state.activeArchetypes || []).includes("plant")) {
        deck = deck.map((c, i) => (i === 0 ? { ...c, green: true, value: C.PLANT_ANCHOR_VALUE } : c)); // Alter Anker (Zündfunke ab Durchlauf 1)
        if (hasSetzlingsbeet(skills)) { // niedrigste Karte je Segment +3 Wachstum
          const g = { ...growth };
          for (let seg = 0; seg * SEGMENT_SIZE < state.playerOrder.length; seg++) {
            let lowId = null, lowV = Infinity;
            for (let p = seg * SEGMENT_SIZE; p < (seg + 1) * SEGMENT_SIZE && p < state.playerOrder.length; p++) {
              const c = deck[state.playerOrder[p]];
              if (c.value < lowV) { lowV = c.value; lowId = c.id; }
            }
            if (lowId != null) g[lowId] = (g[lowId] || 0) + C.SETZLINGSBEET_GROWTH;
          }
          growth = g;
        }
      }
      if (arch && !activeArchetypes.includes(arch)) activeArchetypes = [...activeArchetypes, arch];
      // #140: Verliert man durch Ersetzen den LETZTEN Skill eines Archetyps (0 Skills übrig), wird er deaktiviert
      // und seine Ressourcen/Marker verschwinden — sonst bleiben „Geister"-Leisten/eingefrorene Karten ohne Skill.
      const stillActive = new Set(skills.map(archetypeOf).filter(Boolean));
      activeArchetypes = activeArchetypes.filter((a) => stillActive.has(a));
      if (!stillActive.has("lightning")) lightning = initLightning();               // Ladungsleiste weg
      if (!stillActive.has("fire")) { heat = null; ash = 0; brandPending = {}; brandActive = {}; forged = {}; } // Hitze/Asche/Brand/Schmiede weg (geschmiedete Dauerwerte bleiben gebacken)
      if (!stillActive.has("ice")) iceTemp = {};                                     // Blitzfänger-Temp beim Eis-Deaktivieren leeren (Alt-Verhalten)
      let plantLoss = state.plantLoss || {}; // Wurzelschlag-Buff (v0.4): Niederlagen-Zähler je card.id
      if (!stillActive.has("plant")) { deck = deck.map((c) => (c.green ? { ...c, green: false } : c)); growth = {}; colonized = {}; plantLoss = {}; } // Pflanze weg (Anker-Wert bleibt gebacken)
      // Eis-Neudesign: aktive Gletscher-Rollen aus den gehaltenen Skill-`role`s; bei Deaktivierung Gletscher-State leeren.
      let glacierRoles = glacierRolesOf(skills);
      let glacierMass = state.glacierMass, firnStack = state.firnStack, glacierLocked = state.glacierLocked, glacierYield = state.glacierYield,
        frozenOppPending = state.frozenOppPending, frozenOppActive = state.frozenOppActive,
        glacierBuffPending = state.glacierBuffPending, glacierBuffActive = state.glacierBuffActive, grosseLawineFired = state.grosseLawineFired;
      if (!stillActive.has("ice")) {
        glacierRoles = []; glacierMass = new Array(C.BOARD_POSITIONS).fill(0); firnStack = new Array(C.BOARD_POSITIONS).fill(0); glacierLocked = new Array(C.BOARD_POSITIONS).fill(false); glacierYield = 0; // #386 Firn-Reserve mit leeren
        frozenOppPending = {}; frozenOppActive = {}; glacierBuffPending = {}; glacierBuffActive = {}; grosseLawineFired = false;
      }
      // Formationen neu berechnen (Anker/Familien/Architekt beeinflussen die Erkennung).
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, skills, state.shop?.anchors || [], state.familyTiers, archOf(state));
      return { ...state, skills, activeArchetypes, lightning, heat, deck, iceTemp, growth, colonized, plantLoss, ash, brandPending, brandActive, forged, formations,
               glacierRoles, glacierMass, firnStack, glacierLocked, glacierYield, frozenOppPending, frozenOppActive, glacierBuffPending, glacierBuffActive, grosseLawineFired, // Eis-Neudesign (#386 Firn-Reserve mitgeführt)
               trimCount: (state.trimCount || 0) + (trimmed ? 1 : 0), // #288 Trimmen
               // Eis-Neudesign: jeder Eis-Skill-Pick öffnet SOFORT die Gletscher-Wahl (genau 1 Karte festfrieren, Pflicht) —
               // analog zum Perk-Ziel-Flow. Andere Archetypen gehen direkt weiter. Ist KEIN gültiges Ziel mehr frei
               // (alles gefroren bzw. gesperrt), wird die Phase übersprungen statt betreten — sonst Soft-Lock, s. o.
               phase: (arch === "ice" && hasFreeGlacierField(glacierLocked, state.challengeBlockForm, (state.playerOrder || []).length))
                 ? "glacier-target" : "play", skillOffer: null, skillOfferBonus: false };
    }

    // Skill-Angebot ablehnen → stattdessen ein Perk-Angebot für diese Runde (nie „verschwendet").
    case "DECLINE_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      // Meisterhand-Bonus (s. PICK_PERK): das Angebot ist ein GESCHENK des eben genommenen Perks, kein
      // Rundenplatz. Die „nie verschwendet"-Regel darunter (Skill abgelehnt → stattdessen ein Perk) darf
      // hier deshalb nicht greifen — sie machte aus einem Perk zwei. Ablehnen heißt: Slot bleibt vorerst
      // leer, die nächste reguläre Skill-Phase füllt ihn. Steht VOR dem Dev-Zweig, weil der Bonus auch im
      // Dev-Run ein Bonus ist. Der Eis-Ablehn-Gletscher unten entfällt aus demselben Grund.
      if (state.skillOfferBonus) return { ...state, skillOffer: null, skillOfferBonus: false, phase: "play" };
      if (state.devMode) return { ...state, skillOffer: null, phase: "play" }; // Dev-Run: „Runde überspringen" → direkt weiter, KEIN Perk-Ersatz
      const off = buildPerkOffer(state.perks, state.familyTiers, rngFor(state, action, state.cycle, "perk", 0), PERKS_OFFERED, perkLegendaryChance(state.shop) * (state.treeLegMult ?? 1), state.treeRareShift || 0, state.architectEnabled, C.perkPhaseAt(state.devSchedule || C.DECISION_SCHEDULE, state.cycle) === C.LEG_PERK2_PHASE ? (state.treeLegForce2 || 0) : 0, state.rareCap || 4, state.rareFloor || 1); // M4/M5: 2. Perk-Phase (Reroll behält Garantie) · §4c Rarität-Deckel · #370 Rarität-Boden
      // Eis-Neudesign: bei VOLLEN Eis-Slots (SKILL_SLOTS Eis-Skills) friert das Ablehnen trotzdem einen Gletscher fest —
      // Ausgleich dafür, dass kein weiterer Eis-Skill mehr in die Slots passt (analog: ein Tausch bei vollen Slots gibt
      // ebenfalls einen). Der Perk bleibt: das Perk-Angebot wird geparkt (pendingPerkOffer) und nach der Gletscher-Wahl
      // (GLACIER_LOCK) wieder aufgemacht. Nur, wenn überhaupt ein freies Feld zum Einfrieren da ist.
      const iceSkillCount = state.skills.filter((id) => archetypeOf(id) === "ice" && !isLegendarySkill(id)).length;
      const hasFreeField = hasFreeGlacierField(state.glacierLocked, state.challengeBlockForm, (state.playerOrder || []).length);
      if ((state.activeArchetypes || []).includes("ice") && iceSkillCount >= G_DECLINE_MIN_SKILLS && hasFreeField) {
        return { ...state, skillOffer: null, phase: "glacier-target", pendingPerkOffer: off.length > 0 ? off : null };
      }
      return off.length > 0
        ? { ...state, skillOffer: null, offer: off, offerRerolls: 0 } // → Perk-Auswahl (#205: frisches Angebot → Reroll-Index 0)
        : { ...state, skillOffer: null, phase: "play" };             // Perk-Pool leer → weiterspielen
    }

    // #272 Legendär-Phase (Runde 29): EINEN der 2 angebotenen Legendäre in den fixen 7. Slot (kein Ersetzen, zählt
    // nicht gegen SKILL_SLOTS). Der Archetyp ist bereits aktiv (Angebot nur aus aktiven Fraktionen) → seine Ressourcen
    // bestehen; wir rechnen nur die legendär-abhängigen Aktivierungen nach (Donnergott: maxCharge, Eis: Frost-Ziel).
    case "PICK_LEGENDARY": {
      if (state.phase !== "legendary" || !state.legendaryOffer) return state;
      const { legendaryId } = action;
      if (!state.legendaryOffer.includes(legendaryId) || state.skills.includes(legendaryId) || !isLegendarySkill(legendaryId)) return state;
      const arch = archetypeOf(legendaryId);
      const skills = [...state.skills, legendaryId]; // 7. Slot — kein Cap-Check
      let lightning = state.lightning, heat = state.heat, deck = state.deck;
      if (arch === "lightning") lightning = { ...lightning, active: true, maxCharge: maxChargeFor(skills) }; // Donnergott → 15
      if (arch === "fire" && !(heat && heat.active)) heat = { ...initHeat(), active: true, max: heatMaxFor(skills) };
      // Eis-Neudesign: der legendäre Eis-Skill fügt nur seine Rolle hinzu (kein Einfrieren) → glacierRoles nachziehen.
      const activeArchetypes = (state.activeArchetypes || []).includes(arch) ? state.activeArchetypes : [...(state.activeArchetypes || []), arch];
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, skills, state.shop?.anchors || [], state.familyTiers, archOf(state));
      const common = { ...state, skills, activeArchetypes, lightning, heat, deck, formations, glacierRoles: glacierRolesOf(skills) };
      // #370 Doppel-Legendär (nur Ranked): 2 Legendäre je Phase wählbar. Nach der 1. Wahl in der Phase bleiben (Angebot
      // ohne die genommene Karte), sofern noch etwas übrig ist — sonst normal weiterspielen. legPicksMade zählt in der Phase.
      const picksAllowed = hasWeekMod(state.weekMods, "doubleLeg") ? 2 : 1;
      const picksMade = (state.legPicksMade || 0) + 1;
      const remainingOffer = state.legendaryOffer.filter((id) => id !== legendaryId && !skills.includes(id));
      if (picksMade < picksAllowed && remainingOffer.length > 0)
        return { ...common, phase: "legendary", legendaryOffer: remainingOffer, legPicksMade: picksMade };
      return { ...common, phase: "play", legendaryOffer: null, legPicksMade: 0 };
    }

    // #272 Legendär ablehnen → stattdessen normale Skill-Wahl (Nutzer-Wunsch), nie „verschwendet".
    case "DECLINE_LEGENDARY": {
      if (state.phase !== "legendary" || !state.legendaryOffer) return state;
      const off = buildSkillOffer(state.skills, state.activeArchetypes, rngFor(state, action, state.cycle, "skill", 0), C.SKILLS_OFFERED, 0, false, state.unlockedArchetypes); // §4b: Archetyp-Gatung
      return off.length > 0
        ? { ...state, legendaryOffer: null, skillOffer: off, phase: "levelup", offerRerolls: 0, legPicksMade: 0 } // → normale Skill-Auswahl
        : { ...state, legendaryOffer: null, phase: "play", legPicksMade: 0 };                                     // Skill-Pool leer → weiterspielen
    }

    // M1 (legSlotReroll): das R29-Legendär-Angebot einmal neu würfeln — dedizierter Token (rerollsLeg), getrennt
    // von den Perk/Gebäude/Skill-Pools. Adressierter Strom (seed,cycle,"legendary",idx). Leeres Neu-Angebot →
    // Token NICHT verbrauchen (Angebot bleibt). Nur im Normal-Lauf mit gekauftem M1 überhaupt > 0.
    case "REROLL_LEGENDARY": {
      if (state.phase !== "legendary" || !state.legendaryOffer) return state;
      const tokens = state.rerollsLeg || 0;
      if (tokens <= 0) return state;
      const idx = (state.offerRerolls || 0) + 1;
      // #369 §5a: Pool = alle im Baum freigeschalteten Archetypen (Zähl-Map), unabhängig vom Build. Sim/Standard → null = Bestand.
      const legOff = buildLegendaryOffer(state.activeArchetypes || [], state.skills || [], rngFor(state, action, state.cycle, "legendary", idx), null, 0, state.legCountByArch || null);
      if (!legOff.length) return state;
      return { ...state, legendaryOffer: legOff, offerRerolls: idx, rerollsLeg: tokens - 1, rerollsUsed: (state.rerollsUsed || 0) + 1 };
    }

    // Perk-Angebot komplett ablehnen (#138): Angebot verworfen, weiter im Spiel — so ist eine Perk-Runde nie
    // „verschwendet". Keine Belohnung mehr: mit dem Architekten (#202/#225.1) gibt es keine Münzökonomie.
    case "DECLINE_PERK": {
      if (state.phase !== "levelup" || !state.offer) return state;
      return { ...state, offer: null, phase: "play" };
    }

    // #263: Perk-Angebot neu würfeln — eigener Perk-Reroll-Pool (rerollsPerk), kein Free-Reroll mehr.
    // Komplett neues Angebot (Seltenheitsregeln in buildOffer), rng deterministisch adressiert.
    case "REROLL_PERK": {
      if (state.phase !== "levelup" || !state.offer) return state;
      // #369 §6: In der generellen Legendär-Phase (2. Perk-Phase) zieht zuerst der phasenspezifische Token (rerollsPerk2,
      // aus dem „Reroll · 2. Perk-Phase"-Knoten), erst danach der normale Perk-Pool — so bleibt der Zusatz-Reroll auf diese Phase begrenzt.
      const inLegPerkPhase = C.perkPhaseAt(state.devSchedule || C.DECISION_SCHEDULE, state.cycle) === C.LEG_PERK2_PHASE;
      const perk2 = state.rerollsPerk2 || 0;
      // Legendär-Perk-Phase zieht AUSSCHLIESSLICH ihren dedizierten Token (rerollsPerk2, aus dem
      // „Reroll · 2. Perk-Phase"-Knoten) — KEIN Rückgriff auf den allgemeinen Perk-Pool. Ohne Upgrade
      // gibt es dort also 0 Rerolls, mit Upgrade genau 1 (statt fälschlich bis zu 3 aus rerollsPerk).
      const usePerk2 = inLegPerkPhase;
      const tokens = usePerk2 ? perk2 : (state.rerollsPerk || 0);     // #263: eigener Perk-Pool (+ #369 Phasen-Token)
      if (tokens <= 0) return state;                                 // keine Ressource → wirkungslos
      const idx = (state.offerRerolls || 0) + 1;                     // #205: Reroll-Index → frischer adressierter Strom (Original-Angebot = 0)
      // #381 Legendär-Takt: ist diese Perk-Phase eine Takt-Phase (jede mag-te), behält der Reroll die 3-Legendär-Garantie.
      const legTaktMag = weekModMag(state.weekMods, "legTakt");
      const legTaktPP = C.perkPhaseAt(state.devSchedule || C.DECISION_SCHEDULE, state.cycle);
      const onLegTakt = legTaktMag > 0 && legTaktPP > 0 && legTaktPP % legTaktMag === 0;
      const legForce = onLegTakt ? PERKS_OFFERED : (inLegPerkPhase ? (state.treeLegForce2 || 0) : 0);
      const offer = buildPerkOffer(state.perks, state.familyTiers, rngFor(state, action, state.cycle, "perk", idx), PERKS_OFFERED, perkLegendaryChance(state.shop) * (state.treeLegMult ?? 1), state.treeRareShift || 0, state.architectEnabled, legForce, state.rareCap || 4, state.rareFloor || 1); // #369: 2. Perk-Phase = generelle Legendär-Phase (Reroll behält den Legendär-Satz) · Rarität-Deckel · #370 Rarität-Boden · Legendär-Takt
      return { ...state, offer, offerRerolls: idx, ...(usePerk2 ? { rerollsPerk2: perk2 - 1 } : { rerollsPerk: tokens - 1 }), rerollsUsed: (state.rerollsUsed || 0) + 1 };
    }

    // #263: Skill-Angebot neu würfeln — eigener Skill-Reroll-Pool (rerollsSkill). Erfüllt weiterhin Archetyp-/Konsumenten-
    // regeln (buildSkillOffer). Leeres neues Angebot (keine Archetypen verfügbar) → Ressource nicht verbrauchen.
    case "REROLL_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const tokens = state.rerollsSkill || 0;                        // #263: eigener Skill-Pool
      if (tokens <= 0) return state;
      const idx = (state.offerRerolls || 0) + 1;                     // #205: Reroll-Index → frischer adressierter Strom (Original-Angebot = 0)
      const offer = buildSkillOffer(state.skills, state.activeArchetypes, rngFor(state, action, state.cycle, "skill", idx), C.SKILLS_OFFERED, skillLegendaryChance(state.shop), false, state.unlockedArchetypes); // §4b: Archetyp-Gatung
      if (offer.length === 0) return state;                         // nichts Neues verfügbar → Ressource behalten
      return { ...state, skillOffer: offer, offerRerolls: idx, rerollsSkill: tokens - 1, rerollsUsed: (state.rerollsUsed || 0) + 1 };
    }

    // Formationsphase (V2 §22.8): beliebigen Tausch zweier Karten anwenden (1 Energie), Vorschau neu berechnen.
    case "SWAP_CARDS": {
      if (state.phase !== "formation") return state;
      const { i, j } = action;
      if (i === j) return state;
      if (i < 0 || j < 0 || i >= state.playerOrder.length || j >= state.playerOrder.length) return state;
      // Eis-Neudesign (docs §2.1): ein gefrorener Gletscher ist STARR — seine Brett-Position darf nicht getauscht werden.
      if (state.glacierLocked && (state.glacierLocked[i] || state.glacierLocked[j])) return state;
      // #301 C3: gesperrte Aufstell-Zellen sind fixiert — weder weg- noch hin-tauschbar (beide Endpunkte prüfen).
      if (state.challengeBlockForm && (state.challengeBlockForm.includes(i) || state.challengeBlockForm.includes(j))) return state;
      if ((state.formationEnergy || 0) <= 0) return state; // Tausch braucht Energie
      const cardA = state.deck[state.playerOrder[i]], cardB = state.deck[state.playerOrder[j]];
      const order = state.playerOrder.slice();
      [order[i], order[j]] = [order[j], order[i]];
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state)),
               formationEnergy: state.formationEnergy - 1,
               formationSwaps: [...(state.formationSwaps || []), { i, j, idA: cardA.id, idB: cardB.id }] };
    }
    // Eis-Neudesign (docs §2.1): Gletscher-Wahl BESTÄTIGEN — die gewählte Karte friert auf IHRER aktuellen Brett-Zelle fest
    // und ist ab dann STARR (unverschiebbar in künftigen Aufstellungen). Kern-Entscheidung Position vs. Wert; permanent
    // (kein Unlock). Läuft im „glacier-target"-Schritt nach jedem Eis-Skill-Pick (Pflicht, genau 1) → danach weiter zu „play".
    case "GLACIER_LOCK": {
      if (state.phase !== "glacier-target") return state;
      if (!(state.activeArchetypes || []).includes("ice")) return state;
      const p = action.pos;
      if (p == null || p < 0 || p >= state.playerOrder.length) return state;
      if (state.glacierLocked && state.glacierLocked[p]) return state; // schon gefroren → ungültige Wahl
      if (state.challengeBlockForm && state.challengeBlockForm.includes(p)) return state; // #301 C3: gesperrte Zelle nicht einfrierbar
      const glacierLocked = (state.glacierLocked || new Array(state.playerOrder.length).fill(false)).slice();
      glacierLocked[p] = true;
      // #386 Firn-Boden-Reserve: der neu gefrorene Gletscher startet LEER (Masse 0) — der auf diesem Feld angesammelte Firn
      // liegt bereits als Boden-Reserve in firnStack[p] und füllt den Gletscher ab dem nächsten Rundenstart auf 12 nach.
      // (Auf offenem Boden war glacierMass[p] ohnehin 0 — hier explizit gesetzt, firnStack unverändert durchgereicht.)
      const glacierMass = (state.glacierMass || new Array(state.playerOrder.length).fill(0)).slice();
      glacierMass[p] = 0;
      // Kam die Gletscher-Wahl aus dem Ablehnen bei vollen Eis-Slots, wartet noch ein geparktes Perk-Angebot → jetzt
      // aufmachen (Perk bleibt erhalten). Sonst wie gehabt zurück ins Spiel.
      if (state.pendingPerkOffer && state.pendingPerkOffer.length > 0)
        return { ...state, glacierLocked, glacierMass, phase: "levelup", offer: state.pendingPerkOffer, offerRerolls: 0, pendingPerkOffer: null };
      return { ...state, glacierLocked, glacierMass, phase: "play", pendingPerkOffer: null }; // Pick bestätigt → zurück ins Spiel
    }
    // Letzten Tausch rückgängig machen → Energie erstatten.
    case "UNDO_SWAP": {
      if (state.phase !== "formation" || !(state.formationSwaps || []).length) return state;
      const swaps = state.formationSwaps.slice();
      const last = swaps.pop();
      const order = state.playerOrder.slice();
      [order[last.i], order[last.j]] = [order[last.j], order[last.i]];
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state)),
               formationEnergy: state.formationEnergy + 1, formationSwaps: swaps };
    }
    // Alle Tausche der Phase zurücknehmen → Ausgangsreihenfolge + volle Energie.
    case "RESET_FORMATION": {
      if (state.phase !== "formation") return state;
      const order = state.playerOrder.slice();
      const swaps = state.formationSwaps || [];
      for (let k = swaps.length - 1; k >= 0; k--) { const { i, j } = swaps[k]; [order[i], order[j]] = [order[j], order[i]]; }
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state)),
               // Gemeinsamer Helfer mit dem Phasen-Eintritt in der Engine (#179 E_TUNING · #369 Energie-Boden aus dem
               // Baum · Dev-Run-Energie) — vorher stand die Formel hier dupliziert und ohne `devEnergy`.
               formationEnergy: formationEnergyFor(state),
               formationSwaps: [] };
    }
    // Bestätigen → Reihenfolge bleibt persistent, Übergang in die Kampfphase.
    case "CONFIRM_FORMATION": {
      if (state.phase !== "formation") return state;
      return { ...state, phase: "play", formationEnergy: 0, formationSwaps: [] };
    }

    default:
      return state;
  }
}
