import { buildDeck, shuffledOrder } from "./deck.js";
import { rngAt } from "./rng.js"; // #205 Challenger Mode: adressierte Sub-Ströme (build-unabhängige Slots)
import { PERK_DEFS, buildPerkOffer } from "./perks.js";
import { familyDef, applyFamilyPick, formationEnergyBonus } from "./families.js";
import { UPGRADE_TYPES } from "./rarity.js";
import { archetypeOf, initLightning, initHeat, heatMaxFor, maxChargeFor, chargeConsumerCount,
  frozenTargetFor, frozenCount, freezeCards, unfreezeAll, hasFrostwahl, hasKaltfront, hasGlacierPush, hasVerzahnung, hasGleitfrost, hasVerdichtung,
  hasSetzlingsbeet, hasDornenkoenig, buildSkillOffer } from "./skills.js"; // Pflanze (v0): Aktivierungs-Effekte
// (#267: import aus stats.js entfernt — die Stat-Phase ist weg.)
import { computeFormations, formationPotential, segmentGainedFormation, baseFormationCount, SEGMENT_SIZE, FORMATION_TYPES } from "./formations.js";
import { initialShop, perkLegendaryChance, skillLegendaryChance } from "./shop.js";
import { resolveTrick } from "./engine.js";
import { PERKS_OFFERED } from "./constants.js";
import * as C from "./constants.js";
import { isLegendarySkill } from "./skills.js"; // #217: Garantie-Erkennung (Legendär im Skill-Reroll-Angebot)
import { masteryRerollBonus, masteryCoverBonus, masteryLegendMult, masteryRareShift, masteryLegendGuaranteed, difficultyForGrade, MASTERY_MAX_GRADE } from "./mastery.js"; // #217 Meistergrade / #226 Großmeister
import { initialArchitect, familyDef as archFamily, isValidFootprint, occupiedCells as archOccupied, buildArchitectOffer, MAX_TIER as ARCH_MAX_TIER, MAX_COVER as ARCH_MAX_COVER, N_POS } from "./architect.js";
import { fullPerkOffer, fullSkillOffer, fullArchitectOffer } from "./devCatalog.js"; // Dev-Run (nur Preview): Voll-Katalog-Angebote

/* Reiner Reducer — Determinismus-Invariante: kein Math.random / Date hier drin.
   Zufall kommt als Action-Payload (rng), siehe App.jsx. Phasen:
   play → levelup → play … → gameover. */
// Architekt (#202, Shop-Ersatz): an computeFormations weitergereicht, damit Formations-Vorschauen (Aufstellungsphase)
// die Gebäude-Effekte sehen. null, solange das Flag aus ist (A/B-neutral).
const archOf = (s) => (s && s.architectEnabled ? s.architect : null);
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
function startDecisionSetup(decision, s, seed, actionRng, grade, architectEnabled, devEnergy, devMode = false) {
  const mLegMult = masteryLegendMult(grade), mRareShift = masteryRareShift(grade);
  const rngAtOr = (...parts) => (seed != null ? rngAt(seed, 0, ...parts) : actionRng);
  // (#267: „stat"-Zweig entfernt — es gibt keine Stat-Phase mehr.)
  if (decision === "perk") {
    const off = devMode ? fullPerkOffer(architectEnabled) : buildPerkOffer([], {}, rngAtOr("perk", 0), PERKS_OFFERED, perkLegendaryChance(s.shop) * mLegMult, mRareShift, architectEnabled);
    return off.length ? { phase: "levelup", offer: off } : { phase: "play" };
  }
  if (decision === "shop") {
    if (!architectEnabled) return { phase: "play" };
    const offers = devMode ? fullArchitectOffer() : buildArchitectOffer(s.architect, rngAtOr("arch"), mRareShift);
    return { phase: "architect", architect: { ...s.architect, offers, actedMain: false, moved: false } };
  }
  if (decision === "formation") {
    const formations = computeFormations(s.playerOrder, s.deck, s.roles, [], [], s.shop?.anchors || [], s.familyTiers, architectEnabled ? s.architect : null);
    return { phase: "formation", formationEnergy: (devEnergy ?? C.FORMATION_ENERGY), formationSwaps: [], formations };
  }
  // "skill" (Default): Skill-Angebot; leerer Skill-Pool → Perk-Fallback (Runde nicht verschwenden).
  const guarantee = masteryLegendGuaranteed(grade);
  const soff = devMode ? fullSkillOffer() : buildSkillOffer([], [], rngAtOr("skill", 0), C.SKILLS_OFFERED, skillLegendaryChance(s.shop) * mLegMult, guarantee);
  if (soff.length) return { phase: "levelup", skillOffer: soff, masteryLegGranted: guarantee && !devMode && soff.some(isLegendarySkill) };
  const off = buildPerkOffer([], {}, rngAtOr("perk", 0), PERKS_OFFERED, perkLegendaryChance(s.shop) * mLegMult, mRareShift, architectEnabled);
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
    crits: 0, critBonusScore: 0, bestTrickScore: 0,
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
    zinsBonus: 0, cycleWins: 0, cycleLosses: 0, cycleBestTrick: 0, sammlerTypes: [], vabanquePaid: 0, // Legendär-Perks-Rework (#203)
    perks: [], offer: null,
    // Raritätssystem (Epic #167, Spec §2.1): Familienrang je Familie { [familyId]: 1|2|3|4 }. Läuft ADDITIV
    // neben `perks` (flache Legendäre) — die Engine löst aktive Familien-Stufen über activeTierDefs auf.
    familyTiers: {},
    // Familien-Ziel-Auswahl (Rarität #167, Kat. A ab #163): aktive Farb-/Ziel-Auswahl beim Pick einer Stufe mit
    // `pickTarget` (z. B. A_SUIT_BOOST III/IV, A_SUIT_DUEL III/IV). null = keine offene Auswahl. Kategorie C nutzt
    // denselben Fluss später für Karten-Ziele (Rollen).
    familyTarget: null,
    // Skill-System / Blitz-Archetyp (docs/blitz-archetyp.md). Inert, solange kein Skill gewählt ist.
    skills: [], skillOffer: null, activeArchetypes: [], lightning: initLightning(),
    heat: null, // Feuer-Archetyp (#93 F1): erst beim ersten Feuer-Skill via initHeat() aktiviert
    iceTemp: {}, frostbitePending: {}, frostbiteActive: {}, frostSwapsUsed: [], // Eis-Rework (v0): temp Wert (Kaltfront) / Vergletscherung-Gegner-Debuff / genutzte Frosttausche
    layers: {}, frostFormPrev: [], // Eis-Rework (v0): Schichten je Frostkarte (permanent) / Beständigkeits-Historie
    frostSelect: null, // Frostwahl (#265): offene Kartenwahl beim Einfrieren { need, chosen } — null = keine offene Wahl
    growth: {}, colonized: {}, // Pflanze-Fraktion (v0): Wachstum je card.id (nur steigend) / kolonisierte Gegnerkarten (grün = card.green)
    ash: 0, brandPending: {}, brandActive: {}, forged: {}, // Feuer-Rework (v0): Asche-Ressource / Brand-Marker (Gegner, je card.id) / geschmiedete Dauerwerte
    // #270 Fraktions-Panels: kumulative Lauf-Kennzahlen (nur Anzeige) — Direkt-Ertrag (Σ post-stack Direkt-Score) + Motor-Zähler.
    fireYield: 0, iceYield: 0, lightYield: 0, plantYield: 0, ionTotal: 0, growthTotal: 0, ashBurned: 0,
    tieArmed: false,
    shop: initialShop(), // hält nur noch die (inerten) Positionsanker — der Shop ist entfernt (#229)
    architectEnabled: false,       // Architekt (#202): Flag — bei true öffnet sich die Architekt-Phase (im Spiel via START_RUN true; false = Sim-Baseline ohne Architekt)
    architect: { ...initialArchitect(), maxCover: ARCH_MAX_COVER }, // Gebäude-Overlay (8×5) + Angebot + Meilenstein-Zähler; maxCover als #217-Seam (Rang-Bonus: base + Grad×N) run-geseedet
    architectPre: null,            // Precompute je Durchlauf (von der Engine gefüllt)
    // Dev-Run (nur Preview): pro-Lauf-Overrides. null/false → Bestandsverhalten (globaler Plan, C.MAX_CYCLES,
    // C.FORMATION_ENERGY, Zufallsangebote). Von START_RUN mit action.dev gesetzt; die Engine liest sie im Übergang.
    devSchedule: null, maxCycles: null, devEnergy: null, devMode: false,
    // #263: DREI getrennte Reroll-Pools je Lauf (Perks · Gebäude · Skills), je BASE_REROLLS (2), nicht untereinander
    // teilbar, kein Nachschub. Ersetzt den einen geteilten Pool; Gebäude/Architekt hat jetzt auch einen Reroll.
    rerollsPerk: C.BASE_REROLLS, rerollsArch: C.BASE_REROLLS, rerollsSkill: C.BASE_REROLLS,
    rerollsUsed: 0,                // #214/#263: Zähler benutzter Rerolls über ALLE Kategorien → Sparfuchs-Challenge (deck_c3 „noRerollRun")
    offerRerolls: 0,               // #205: Reroll-Index des AKTUELLEN Angebots (Original = 0) → adressiert `(seed,cycle,kind,offerRerolls)`; von der Engine bei jedem frischen Angebot auf 0 gesetzt
    masteryGrade: 0,               // #217: gewählter Rang dieses Laufs (0..5) — von START_RUN gesetzt; 0 = Basiswerte (No-op)
    masterRun: false,              // #217: ist dies ein Meister-Lauf? Nur dann Rang-Balken + Rang-Leiter (normaler Lauf = false)
    masteryLegGranted: false,      // #217 Rang V: wurde der garantierte Legendär in diesem Lauf schon angeboten? (1×/Lauf)
    lastTrick: null,
  };
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
      // #217 Meistergrade: den run-übergreifenden Grad (aus dem Profil, via App) in die Lauf-Rewards übersetzen.
      // Grad 0 (frischer Spieler / Sim ohne masteryGrade) = Basiswerte → alles byte-identisch zum bisherigen Start.
      const grade = Math.max(0, Math.min(MASTERY_MAX_GRADE, Math.floor(Number(action.masteryGrade) || 0)));
      const masterRun = !!action.masterRun; // #217: Meister-Lauf? Steuert die Rang-Leiter — UND den Neuwurf-Pool.
      // Dev-Run (nur Preview): action.dev = { rounds, schedule, cover, energy } konfiguriert einen frei einstellbaren Lauf.
      // Nur dieser Zweig weicht ab; ohne action.dev bleibt der normale Lauf-Start UNVERÄNDERT (Start = Stat).
      const dev = action.dev && typeof action.dev === "object" ? action.dev : null;
      if (dev) {
        const devRounds = Math.max(1, Math.min(200, Math.floor(Number(dev.rounds) || 0)));
        const devSchedule = Array.from({ length: devRounds }, (_, i) => (Array.isArray(dev.schedule) && dev.schedule[i]) || C.DECISION_SCHEDULE[i] || "perk");
        const devCover = Math.max(0, Math.min(N_POS, Math.floor(Number(dev.cover) ?? 0)));
        const devEnergy = Math.max(0, Math.min(N_POS, Math.floor(Number(dev.energy) ?? 0)));
        const sBase = { ...s, architect: { ...s.architect, maxCover: devCover } };
        const patch = startDecisionSetup(devSchedule[0], sBase, seed, action.rng, grade, true, devEnergy, true);
        return { ...sBase, architectEnabled: true, masteryGrade: grade, masterRun,
          devSchedule, maxCycles: devRounds, devEnergy, devMode: true,
          difficulty: difficultyForGrade(grade),
          rerollsPerk: C.BASE_REROLLS, rerollsArch: C.BASE_REROLLS, rerollsSkill: C.BASE_REROLLS,
          skillOffer: null, offer: null, masteryLegGranted: false, ...patch };
      }
      // #267: Erste Entscheidung (Runde 1) folgt dem Plan = DECISION_SCHEDULE[0] = "skill" (Blind-Commit, gewollt) —
      // NICHT mehr die entfernte Stat-Phase. startDecisionSetup baut das Erst-Angebot (Skill-Offer) deterministisch.
      const architectStart = { ...s.architect, maxCover: s.architect.maxCover + masteryCoverBonus(grade) }; // Baufeld +2/Grad ab II
      const sBase = { ...s, architect: architectStart, architectEnabled };
      const startPatch = startDecisionSetup(C.DECISION_SCHEDULE[0] || "skill", sBase, seed, action.rng, grade, architectEnabled, undefined, false);
      return { ...sBase, architectEnabled,
        masteryGrade: grade, masterRun,
        difficulty: difficultyForGrade(grade), // #226 Großmeister: Ramp je Rang (Meister → null = No-op)
        // #263: drei getrennte Reroll-Pools. Normal-Lauf je BASE_REROLLS (2/2/2). Meister-Lauf zieht je Pool weiter
        // ALLEIN aus dem Rang (masteryRerollBonus 0/1/2/3/3/3) — der Reroll-Vorrat kommt beim Meister aus der Rang-Leiter.
        rerollsPerk: masterRun ? masteryRerollBonus(grade) : C.BASE_REROLLS,
        rerollsArch: masterRun ? masteryRerollBonus(grade) : C.BASE_REROLLS,
        rerollsSkill: masterRun ? masteryRerollBonus(grade) : C.BASE_REROLLS,
        masteryLegGranted: false, ...startPatch };
    }

    case "TO_MENU":     // laufenden Run verlassen (#5)
      return menuState();

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
      if (!isValidFootprint(fam.form, action.footprint, a.buildings)) return state; // Form/Gitter/Overlap
      if (archOccupied(a.buildings).size + action.footprint.length > (a.maxCover ?? ARCH_MAX_COVER)) return state; // Baufeld-Deckel: keine neue Fläche über maxCover
      if (fam.colorLocked && !C.SUIT_ORDER.includes(action.colorChoice)) return state; // Buntglas/Zunfthaus brauchen eine Farbe
      const footprint = [...action.footprint].sort((x, y) => x - y);
      const building = { id: a.nextId, familyId: fam.id, tier: off.tier, footprint, colorChoice: fam.colorLocked ? action.colorChoice : null };
      const offers = a.offers.map((o) => (o === off ? { ...o, used: true } : o));
      return { ...state, architect: { ...a, buildings: [...a.buildings, building], nextId: a.nextId + 1, actedMain: true, offers } };
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
      return { ...state, architect: { ...a, buildings, actedMain: true } };
    }
    case "ARCHITECT_MOVE": { // versetzen: BELIEBIG OFT bis zum Bestätigen (#224.10), an neue gültige Position (ohne Overlap mit den ANDEREN)
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const b = a.buildings.find((x) => x.id === action.buildingId);
      if (!b) return state;
      const fam = archFamily(b.familyId);
      const others = a.buildings.filter((x) => x.id !== b.id);
      if (!fam || !isValidFootprint(fam.form, action.footprint, others)) return state;
      const footprint = [...action.footprint].sort((x, y) => x - y);
      const buildings = a.buildings.map((x) => (x.id === b.id ? { ...x, footprint } : x));
      return { ...state, architect: { ...a, buildings, moved: true } }; // moved-Flag bleibt (Telemetrie), deckelt aber nicht mehr
    }
    case "ARCHITECT_RECOLOR": { // #261: Buff-Farbe eines colorLocked-Gebäudes anpassen — freie Anpassung bis zum Bestätigen (wie MOVE, kein actedMain)
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const b = a.buildings.find((x) => x.id === action.buildingId);
      if (!b) return state;
      const fam = archFamily(b.familyId);
      if (!fam || !fam.colorLocked || !C.SUIT_ORDER.includes(action.colorChoice)) return state;
      const buildings = a.buildings.map((x) => (x.id === b.id ? { ...x, colorChoice: action.colorChoice } : x));
      return { ...state, architect: { ...a, buildings } };
    }
    case "ARCHITECT_DEMOLISH": { // abreißen: jederzeit, unbegrenzt, ohne Gegenwert (nur Platz frei)
      if (state.phase !== "architect") return state;
      const a = state.architect;
      const buildings = a.buildings.filter((x) => x.id !== action.buildingId);
      if (buildings.length === a.buildings.length) return state;       // nichts entfernt → kein Fortschritt
      const winCounters = { ...a.winCounters }; delete winCounters[action.buildingId];
      return { ...state, architect: { ...a, buildings, winCounters } };
    }
    case "REROLL_ARCHITECT": { // #263: Architekt-Bauplan-Angebot neu würfeln — eigener Gebäude-Reroll-Pool (rerollsArch).
      if (state.phase !== "architect") return state;
      const a = state.architect;
      if (a.actedMain) return state;                                  // schon gebaut/aufgewertet → Angebot verbraucht
      const tokens = state.rerollsArch || 0;
      if (tokens <= 0) return state;
      const idx = (state.offerRerolls || 0) + 1;                      // #205: frischer adressierter Strom (seed,cycle,"arch",idx)
      const offers = buildArchitectOffer(a, rngFor(state, action, state.cycle, "arch", idx), masteryRareShift(state.masteryGrade));
      return { ...state, architect: { ...a, offers }, offerRerolls: idx, rerollsArch: tokens - 1, rerollsUsed: (state.rerollsUsed || 0) + 1 };
    }
    case "ARCHITECT_DONE": { // Architekt-Phase verlassen → zugehöriger Durchlauf startet (Angebot leeren).
      if (state.phase !== "architect") return state;
      return { ...state, phase: "play", architect: { ...state.architect, offers: null } };
    }

    case "RESOLVE_TRICK":
      return resolveTrick(state, action.rng);

    case "PICK_PERK": {
      if (state.phase !== "levelup") return state;
      const { perkId, rng } = action;
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
      // Bauhütte (L_BAUH, Gebäude-Legendäres): hebt sofort dauerhaft den Baufeld-Deckel (maxCover) → mehr Bauplatz.
      const architect = def.bauhuette && state.architect
        ? { ...state.architect, maxCover: (state.architect.maxCover ?? ARCH_MAX_COVER) + C.BAUHUETTE_COVER }
        : state.architect;
      // Perks mit manueller Kartenauswahl öffnen die Zielauswahl (§22.5); sonst weiter.
      const goTarget = !!def.needsTarget;
      const formations = def.redistribute
        ? computeFormations(state.playerOrder, deck, state.roles, perks, state.skills, state.shop?.anchors || [], state.familyTiers)
        : state.formations;
      return { ...state, perks, deck, architect, offer: null, formations,
               phase: goTarget ? "target" : "play",
               targetPerk: goTarget ? perkId : null };
    }

    // Familien-Pick (Rarität-Umbau #167, Spec §2.4): eine Familie auf eine Zielstufe (I–IV) heben/erwerben.
    // Läuft ADDITIV neben PICK_PERK; applyFamilyPick liefert das Patch (familyTiers, deck, roles) — bei
    // REPLACEMENT (Kat. D) nur der Rang, CUMULATIVE führt ihr Deck-Paket aus. Die Angebotsvalidierung
    // (Familie+Stufe im Angebot, Ziel-Flow bei ROLE) folgt mit buildFamilyOffer (#163 Schritt 3).
    case "PICK_FAMILY": {
      if (state.phase !== "levelup") return state;
      const { familyId, tier, rng } = action;
      const fam = familyDef(familyId);
      if (!fam || !tier) return state;
      // Angebotsvalidierung (Spec §2.4): die Familie+Zielstufe muss im aktuellen Angebot stehen (analog PICK_PERK).
      if (!state.offer || !state.offer.some((e) => e && e.familyId === familyId && e.tier === tier)) return state;
      const applyNow = () => {
        const { familyTiers, deck, roles } = applyFamilyPick(
          familyId, tier, { familyTiers: state.familyTiers, deck: state.deck, roles: state.roles }, rngFor(state, action, state.cycle, "pick"));
        // [#229 N3] Formationen sofort neu berechnen (analog CONFIRM_TARGET) — sonst bis zum nächsten RESOLVE_TRICK stale.
        return { ...state, familyTiers, deck, roles,
          formations: computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], familyTiers),
          offer: null, phase: "play" };
      };
      const pt = fam.tiers[tier] && fam.tiers[tier].pickTarget;
      if (!pt) return applyNow();                                                          // kein Ziel → direkt anwenden
      // Farb-Ziel (A_SUIT_BOOST/A_SUIT_DUEL; #179 auch Farballianz E_COLOR_ALLIANCE): immer die volle Anzahl frisch wählen.
      if (pt.suits) return { ...state, offer: null, phase: "family-target", familyTarget: { familyId, tier, kind: "suits", need: pt.suits, suits: [], cards: [], formationType: null } };
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
      const formations = computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], familyTiers);
      return { ...state, familyTiers, deck, roles, formations, phase: "play", familyTarget: null };
    }

    // Frostwahl (#265): der Spieler wählt selbst, welche eigenen Karten einfrieren. TOGGLE wählt/entwählt (bis `need`),
    // CONFIRM friert die gewählten ein und geht in play. Nur nicht-gefrorene eigene Karten sind wählbar.
    case "FROST_SELECT_TOGGLE": {
      if (state.phase !== "frost-select" || !state.frostSelect) return state;
      const fs = state.frostSelect;
      const card = state.deck.find((c) => c.id === action.cardId);
      if (!card || card.frozen) return state;                                    // nur nicht-gefrorene eigene Karten
      let chosen = fs.chosen.slice();
      if (chosen.includes(action.cardId)) chosen = chosen.filter((x) => x !== action.cardId); // abwählen
      else if (chosen.length < fs.need) chosen.push(action.cardId);                            // hinzufügen (bis need)
      return { ...state, frostSelect: { ...fs, chosen } };
    }
    case "FROST_SELECT_CONFIRM": {
      if (state.phase !== "frost-select" || !state.frostSelect) return state;
      const fs = state.frostSelect;
      if (!fs.chosen.length) return state;                                       // mindestens eine Karte wählen
      const ids = new Set(fs.chosen);
      const deck = state.deck.map((c) => (ids.has(c.id) ? { ...c, frozen: true } : c));
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state));
      return { ...state, deck, formations, phase: "play", frostSelect: null };
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
      return { ...state, deck, roles, formations: computeFormations(state.playerOrder, deck, roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers), phase: "play", targetPerk: null };
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
      if (replaceId && state.skills.includes(replaceId)) {
        // Gezieltes Ersetzen (volle Slots ODER Konsumenten-Ersatzdialog #93): tauscht genau diesen Slot.
        skills = state.skills.map((id) => (id === replaceId ? skillId : id));
      } else if (state.skills.length < C.SKILL_SLOTS) {
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
      // Eis-Zustand (wird beim Deaktivieren des Eis-Archetyps zurückgesetzt, #140).
      let iceTemp = state.iceTemp, frostSwapsUsed = state.frostSwapsUsed;
      let frostbitePending = state.frostbitePending, frostbiteActive = state.frostbiteActive;
      let layers = state.layers || {}, frostFormPrev = state.frostFormPrev || []; // Eis-Rework (v0): Schichten + Beständigkeits-Historie
      let growth = state.growth || {}, colonized = state.colonized || {}; // Pflanze-Fraktion (v0): Wachstum / Kolonisierung
      if (arch === "lightning") lightning = { ...lightning, active: true, maxCharge: maxChargeFor(skills) }; // Donnergott → 15 (#93 F2)
      if (arch === "fire" && !(heat && heat.active)) heat = { ...initHeat(), active: true, max: heatMaxFor(skills) };
      // Eis (#93 F3): dieser Pick friert so viele NEUE eigene Karten ein, dass das Ziel (frozenTargetFor) erreicht ist.
      // #265 Frostwahl-Fix: MIT Frostwahl wählt der Spieler die Karten SELBST (frost-select-Phase, unten), statt Auto-
      // Einfrieren. OHNE Frostwahl frieren wie bisher zufällige Karten ein.
      let pendingFrostSelect = null;
      if (arch === "ice") {
        const toFreeze = Math.max(0, frozenTargetFor(skills) - frozenCount(deck));
        if (toFreeze > 0) {
          if (hasFrostwahl(skills)) pendingFrostSelect = { need: toFreeze, chosen: [] };
          else deck = freezeCards(deck, toFreeze, rngFor(state, action, state.cycle, "freeze"), false);
        }
      }
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
        if (hasDornenkoenig(skills)) colonized = Object.fromEntries(state.oppDeck.map((c) => [c.id, true])); // Dornenkönig: ganzes Gegnerdeck kolonisiert
      }
      if (arch && !activeArchetypes.includes(arch)) activeArchetypes = [...activeArchetypes, arch];
      // #140: Verliert man durch Ersetzen den LETZTEN Skill eines Archetyps (0 Skills übrig), wird er deaktiviert
      // und seine Ressourcen/Marker verschwinden — sonst bleiben „Geister"-Leisten/eingefrorene Karten ohne Skill.
      const stillActive = new Set(skills.map(archetypeOf).filter(Boolean));
      activeArchetypes = activeArchetypes.filter((a) => stillActive.has(a));
      if (!stillActive.has("lightning")) lightning = initLightning();               // Ladungsleiste weg
      if (!stillActive.has("fire")) { heat = null; ash = 0; brandPending = {}; brandActive = {}; forged = {}; } // Hitze/Asche/Brand/Schmiede weg (geschmiedete Dauerwerte bleiben gebacken)
      if (!stillActive.has("ice")) {                                                 // Frostkarten auftauen + Schichten/Vergletscherung löschen
        deck = unfreezeAll(deck);
        iceTemp = {}; frostSwapsUsed = [];
        frostbitePending = {}; frostbiteActive = {}; layers = {}; frostFormPrev = [];
      }
      if (!stillActive.has("plant")) { deck = deck.map((c) => (c.green ? { ...c, green: false } : c)); growth = {}; colonized = {}; } // Pflanze weg (Anker-Wert bleibt gebacken)
      // Formationen neu berechnen: eingefrorene Karten + Eis-Skills beeinflussen die Erkennung (Wildcards/Anker).
      const formations = computeFormations(state.playerOrder, deck, state.roles, state.perks, skills, state.shop?.anchors || [], state.familyTiers, archOf(state));
      // #265: bei offener Frostwahl in die frost-select-Phase (Spieler wählt die einzufrierenden Karten), sonst direkt weiter.
      return { ...state, skills, activeArchetypes, lightning, heat, deck, iceTemp, frostSwapsUsed, frostbitePending, frostbiteActive, layers, frostFormPrev, growth, colonized, ash, brandPending, brandActive, forged, formations,
               phase: pendingFrostSelect ? "frost-select" : "play", frostSelect: pendingFrostSelect, skillOffer: null };
    }

    // Skill-Angebot ablehnen → stattdessen ein Perk-Angebot für diese Runde (nie „verschwendet").
    case "DECLINE_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      if (state.devMode) return { ...state, skillOffer: null, phase: "play" }; // Dev-Run: „Runde überspringen" → direkt weiter, KEIN Perk-Ersatz
      const off = buildPerkOffer(state.perks, state.familyTiers, rngFor(state, action, state.cycle, "perk", 0), PERKS_OFFERED, perkLegendaryChance(state.shop) * masteryLegendMult(state.masteryGrade), masteryRareShift(state.masteryGrade), state.architectEnabled); // #217: Grad-Rewards
      return off.length > 0
        ? { ...state, skillOffer: null, offer: off, offerRerolls: 0 } // → Perk-Auswahl (#205: frisches Angebot → Reroll-Index 0)
        : { ...state, skillOffer: null, phase: "play" };             // Perk-Pool leer → weiterspielen
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
      const tokens = state.rerollsPerk || 0;                         // #263: eigener Perk-Pool
      if (tokens <= 0) return state;                                 // keine Ressource → wirkungslos
      const idx = (state.offerRerolls || 0) + 1;                     // #205: Reroll-Index → frischer adressierter Strom (Original-Angebot = 0)
      const offer = buildPerkOffer(state.perks, state.familyTiers, rngFor(state, action, state.cycle, "perk", idx), PERKS_OFFERED, perkLegendaryChance(state.shop) * masteryLegendMult(state.masteryGrade), masteryRareShift(state.masteryGrade), state.architectEnabled); // #217: Grad-Rewards
      return { ...state, offer, offerRerolls: idx, rerollsPerk: tokens - 1, rerollsUsed: (state.rerollsUsed || 0) + 1 };
    }

    // #263: Skill-Angebot neu würfeln — eigener Skill-Reroll-Pool (rerollsSkill). Erfüllt weiterhin Archetyp-/Konsumenten-
    // regeln (buildSkillOffer). Leeres neues Angebot (keine Archetypen verfügbar) → Ressource nicht verbrauchen.
    case "REROLL_SKILL": {
      if (state.phase !== "levelup" || !state.skillOffer) return state;
      const tokens = state.rerollsSkill || 0;                        // #263: eigener Skill-Pool
      if (tokens <= 0) return state;
      const idx = (state.offerRerolls || 0) + 1;                     // #205: Reroll-Index → frischer adressierter Strom (Original-Angebot = 0)
      // #217/#247: Grad-V-Garantie greift auch beim Neuwurf (mind. EINER via guaranteeOne), solange noch kein Legendär
      // angeboten wurde; sonst Per-Archetyp-Chance × Meisterrang-Mult (nicht mehr Chance 1 = „in jedem Archetyp").
      const guarantee = masteryLegendGuaranteed(state.masteryGrade) && !state.masteryLegGranted;
      const skillLeg = skillLegendaryChance(state.shop) * masteryLegendMult(state.masteryGrade);
      const offer = buildSkillOffer(state.skills, state.activeArchetypes, rngFor(state, action, state.cycle, "skill", idx), C.SKILLS_OFFERED, skillLeg, guarantee);
      if (offer.length === 0) return state;                         // nichts Neues verfügbar → Ressource behalten
      const masteryLegGranted = state.masteryLegGranted || (guarantee && offer.some(isLegendarySkill)); // Garantie eingelöst
      return { ...state, skillOffer: offer, offerRerolls: idx, rerollsSkill: tokens - 1, rerollsUsed: (state.rerollsUsed || 0) + 1, masteryLegGranted };
    }

    // Formationsphase (V2 §22.8): beliebigen Tausch zweier Karten anwenden (1 Energie), Vorschau neu berechnen.
    // Tausch. Eis (#93 F3): ist eine eingefrorene Karte mit noch freiem Frosttausch beteiligt, ist der Tausch
    // KOSTENLOS (keine Energie) und verbraucht deren Frosttausch; sonst kostet er wie gehabt 1 Energie.
    case "SWAP_CARDS": {
      if (state.phase !== "formation") return state;
      const { i, j } = action;
      if (i === j) return state;
      if (i < 0 || j < 0 || i >= state.playerOrder.length || j >= state.playerOrder.length) return state;
      const cardA = state.deck[state.playerOrder[i]], cardB = state.deck[state.playerOrder[j]];
      const used = state.frostSwapsUsed || [];
      let freeFrozenId = null;
      if (cardA.frozen && !used.includes(cardA.id)) freeFrozenId = cardA.id;
      else if (cardB.frozen && !used.includes(cardB.id)) freeFrozenId = cardB.id;
      const isFree = freeFrozenId !== null;
      if (!isFree && (state.formationEnergy || 0) <= 0) return state; // bezahlter Tausch braucht Energie
      const order = state.playerOrder.slice();
      [order[i], order[j]] = [order[j], order[i]];
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state)),
               formationEnergy: isFree ? state.formationEnergy : state.formationEnergy - 1,
               formationSwaps: [...(state.formationSwaps || []), { i, j, free: isFree, frozenId: freeFrozenId, idA: cardA.id, idB: cardB.id }],
               frostSwapsUsed: isFree ? [...used, freeFrozenId] : used };
    }
    // Letzten Tausch rückgängig machen → bezahlter Tausch erstattet Energie, freier Frosttausch wird zurückgegeben.
    case "UNDO_SWAP": {
      if (state.phase !== "formation" || !(state.formationSwaps || []).length) return state;
      const swaps = state.formationSwaps.slice();
      const last = swaps.pop();
      const order = state.playerOrder.slice();
      [order[last.i], order[last.j]] = [order[last.j], order[last.i]];
      const frostSwapsUsed = last.free ? (state.frostSwapsUsed || []).filter((id) => id !== last.frozenId) : (state.frostSwapsUsed || []);
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state)),
               formationEnergy: last.free ? state.formationEnergy : state.formationEnergy + 1, formationSwaps: swaps, frostSwapsUsed };
    }
    // Alle Tausche der Phase zurücknehmen → Ausgangsreihenfolge + volle Energie + freie Frosttausche zurück.
    case "RESET_FORMATION": {
      if (state.phase !== "formation") return state;
      const order = state.playerOrder.slice();
      const swaps = state.formationSwaps || [];
      for (let k = swaps.length - 1; k >= 0; k--) { const { i, j } = swaps[k]; [order[i], order[j]] = [order[j], order[i]]; }
      return { ...state, playerOrder: order, formations: computeFormations(order, state.deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, archOf(state)),
               formationEnergy: C.FORMATION_ENERGY + (state.perks || []).reduce((t, id) => t + (PERK_DEFS[id].extraSwap || 0), 0)
                 + formationEnergyBonus(state.familyTiers, state.cycle), // #179 Feinjustierung (Perk-Familie E_TUNING)
               formationSwaps: [], frostSwapsUsed: [] };
    }
    // Bestätigen → Reihenfolge bleibt persistent. Eis-Rework: Gletscherschub/Verzahnung (Frosttausch schafft/überlappt
    // Formation → Schicht), Ablage B (ungenutzte Tausche banken). (#269: Kaltfront ist zu „Kälteleitung" umgebaut — live
    // in der Engine aus playerOrder berechnet, kein Swap-Zeit-Temp-Wert mehr.)
    case "CONFIRM_FORMATION": {
      if (state.phase !== "formation") return state;
      let iceTemp = state.iceTemp || {};
      let layers = state.layers || {};
      const skills = state.skills, usedFrost = state.frostSwapsUsed || [];
      const anchors = state.shop?.anchors || [];
      const posOfFrost = (fid) => state.playerOrder.findIndex((di) => state.deck[di].id === fid);
      // Gletscherschub / Verzahnung: ein Frosttausch, der eine NEUE (bzw. zweite überlappende) Formation schafft, bankt eine Schicht.
      if (usedFrost.length && (hasGlacierPush(skills) || hasVerzahnung(skills))) {
        const finalForms = state.formations || computeFormations(state.playerOrder, state.deck, state.roles, state.perks, skills, anchors, state.familyTiers, archOf(state));
        const origOrder = state.playerOrder.slice(); // Ausgangsreihenfolge = finale ohne alle Tausche dieser Phase
        const swaps = state.formationSwaps || [];
        for (let k = swaps.length - 1; k >= 0; k--) { const { i, j } = swaps[k]; [origOrder[i], origOrder[j]] = [origOrder[j], origOrder[i]]; }
        const baseForms = computeFormations(origOrder, state.deck, state.roles, state.perks, skills, anchors, state.familyTiers, archOf(state));
        layers = { ...layers };
        for (const fid of usedFrost) {
          const pos = posOfFrost(fid);
          if (pos < 0) continue;
          const segStart = Math.floor(pos / SEGMENT_SIZE) * SEGMENT_SIZE;
          let add = 0;
          if (hasGlacierPush(skills) && segmentGainedFormation(baseForms, finalForms, segStart)) add += C.GLACIER_PUSH_LAYER;
          if (hasVerzahnung(skills) && baseFormationCount(finalForms[pos] || {}) >= 2) add += C.VERZAHNUNG_LAYER; // Überlappung
          if (add > 0) layers[fid] = (layers[fid] || 0) + add;
        }
      }
      // Ablage B: jede Frostkarte, die ihren freien Frosttausch NICHT genutzt hat, bankt Schicht-Fortschritt
      // (Gleitfrost: mehr; Verdichtung: ×2). Grundmechanik — ein ungenutzter Tausch ist kein verlorener Zug.
      {
        const used = new Set(usedFrost);
        const bankPer = (C.ICE_UNUSED_SWAP_LAYER + (hasGleitfrost(skills) ? C.GLEITFROST_EXTRA_SWAP * C.ICE_UNUSED_SWAP_LAYER : 0))
                        * (hasVerdichtung(skills) ? C.VERDICHTUNG_FACTOR : 1);
        const frozenUnused = state.deck.filter((c) => c.frozen && !used.has(c.id));
        if (bankPer > 0 && frozenUnused.length) {
          const nl = { ...layers };
          for (const c of frozenUnused) nl[c.id] = (nl[c.id] || 0) + bankPer;
          layers = nl;
        }
      }
      return { ...state, phase: "play", formationEnergy: 0, formationSwaps: [], frostSwapsUsed: [], iceTemp, layers };
    }

    default:
      return state;
  }
}
