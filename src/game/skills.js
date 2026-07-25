import * as C from "./constants.js";
import { shuffle } from "./deck.js";

/* ============================================================
   SKILL-REGISTRY — seltene, regelverändernde Build-Motoren NEBEN den Perks
   (Spezifikation: docs/blitz-archetyp.md). Gleiche Hook-Shape wie Perks
   (alle optional), aggregiert in engine.js. Reine Logik — kein Math.random/Date.

   Blitz-Hooks (Stufe A — vertikaler Slice):
     critChance()      -> Crit-Basis je Blitz-Skill (Abschnitt 2a)
     chargeOnCrit(ctx) -> ZUSÄTZLICHE Ladung je Crit (Basis +1 läuft über den lightning-State)
     scoreFlatOnCrit() -> additiver Score NUR bei Crit (fließt in die multiplizierte Basis)
   Ein Skill mit archetype:"lightning" aktiviert beim ersten Pick den Blitz-Archetyp
   (lightning.active) — davor sind Ladung/Crit-Basis unsichtbar & inaktiv (Abschnitt 1).
   ============================================================ */
export const SKILL_DEFS = {
  SK_LIGHTNING_01: {
    id: "SK_LIGHTNING_01", name: "Blitzableiter", archetype: "lightning",
    keywords: ["charge", "crit"],
    desc: "Jeder Crit erzeugt 1 zusätzliche Ladung und gibt +50 Score.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, // +5 pp je gehaltenem Blitz-Skill (Abschnitt 2a)
    chargeOnCrit: () => 1,
    scoreFlatOnCrit: () => 50,
  },
  SK_LIGHTNING_02: {
    id: "SK_LIGHTNING_02", name: "Ionisierung", archetype: "lightning",
    keywords: ["charge", "ionize"],
    desc: "Bei voller Ladung werden zwei zufällige noch nicht gespielte Karten ionisiert; danach wird die Ladung verbraucht.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    onFullCharge: "ionize",                // Verbraucher: löst bei voller Ladung aus
    ionizeCount: () => C.ION_BASE_COUNT,   // 2 Karten je Auslösung
  },
  SK_LIGHTNING_03: {
    id: "SK_LIGHTNING_03", name: "Kettenblitz", archetype: "lightning",
    keywords: ["ionize"],
    desc: "Wenn Karten ionisiert werden, werden zwei zusätzliche Karten ionisiert.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    ionizeCount: () => C.KETTENBLITZ_COUNT, // +2 (nur wirksam zusammen mit Ionisierung)
  },
  SK_LIGHTNING_04: {
    id: "SK_LIGHTNING_04", name: "Überspannung", archetype: "lightning",
    keywords: ["charge", "ionize", "crit"],
    desc: "Crits mit einer ionisierten Karte erzeugen 3 zusätzliche Ladungen.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    chargeOnIonizedCrit: () => C.UEBERSPANNUNG_CHARGE, // +3 Ladung bei Crit mit ionisierter Karte
  },
  SK_LIGHTNING_05: {
    id: "SK_LIGHTNING_05", name: "Reststrom", archetype: "lightning",
    keywords: ["charge"],
    desc: "Nach jedem Verbrauch voller Ladung bleiben 3 Ladungen erhalten.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    chargeFloor: () => C.REST_CHARGE_FLOOR, // Reaktor: Ladungsboden nach Verbrauch
  },
  SK_LIGHTNING_06: {
    id: "SK_LIGHTNING_06", name: "Gewitterfront", archetype: "lightning",
    keywords: ["charge", "crit"],
    desc: "Jeder Ladungsverbrauch gibt dauerhaft +2 % Crit-Chance (max +20 %); danach +100 Score für die nächsten drei Siege.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    storm: true, // Reaktor: reagiert auf jeden Verbrauch (Engine führt stormCritBonus/stormScoreWinsRemaining)
  },
  SK_LIGHTNING_07: {
    id: "SK_LIGHTNING_07", name: "Geladene Serie", archetype: "lightning",
    keywords: ["charge", "streak"],
    desc: "Bei voller Ladung wird deine Siegesserie geschützt (blauer Rahmen); die nächste Niederlage setzt sie nicht zurück. Die Ladung wird sofort verbraucht.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    onFullCharge: "protectStreak", // Verbraucher: setzt den Serien-Rahmen
  },
  // ---- Blitz-Rework (#93 F2): neue normale Skills (08–10) + Legendäre (L01/L02). Flags in engine.js gelesen. ----
  SK_LIGHTNING_08: {
    id: "SK_LIGHTNING_08", name: "Statische Aufladung", archetype: "lightning",
    keywords: ["charge"],
    desc: "Jeder Sieg ohne Crit erzeugt 1 Ladung.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    staticCharge: true,
  },
  SK_LIGHTNING_09: {
    id: "SK_LIGHTNING_09", name: "Leitfähigkeit", archetype: "lightning",
    keywords: ["charge", "ionize", "crit"],
    desc: "Ein Crit mit einer Karte direkt neben einer ionisierten Karte erzeugt 2 zusätzliche Ladungen.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    conductivity: true,
  },
  SK_LIGHTNING_10: {
    id: "SK_LIGHTNING_10", name: "Entladung", archetype: "lightning",
    keywords: ["charge", "crit"],
    desc: "Nach einem vollständigen Ladungsverbrauch gibt der nächste Crit +500 Score.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    discharge: true,
  },
  SK_LIGHTNING_L01: {
    id: "SK_LIGHTNING_L01", name: "Donnergott", archetype: "lightning", legendary: true,
    keywords: ["charge", "crit"],
    desc: "Maximale Ladung 10 → 15, dafür dauerhaft +1,0× Crit-Multiplikator. Konsumenten lösen erst bei 15 aus.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    thunderGod: true,
  },
  SK_LIGHTNING_L02: {
    id: "SK_LIGHTNING_L02", name: "Endloser Sturm", archetype: "lightning", legendary: true,
    keywords: ["charge"],
    desc: "Nach vollständigem Verbrauch springt die Ladung sofort auf 50 % des Maximums (mit Reststrom gilt der höhere Wert).",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL,
    endlessStorm: true,
  },

  // ---- Feuer-Archetyp (#93 F1) — Hitze belohnt totale Überlegenheit. Flags werden in engine.js gelesen. ----
  SK_FIRE_01: { id: "SK_FIRE_01", name: "Glut", archetype: "fire", keywords: ["heat"],
    desc: "Siege erzeugen +50 % Hitze (Hitzegewinn ×1,5).", emberBoost: true },
  SK_FIRE_02: { id: "SK_FIRE_02", name: "Brennstoff", archetype: "fire", keywords: ["heat"],
    desc: "Gewinnt eine Karte mit Dauerwert ≥8, gibt es +5 % Hitze zusätzlich.", heatFuel: true },
  SK_FIRE_03: { id: "SK_FIRE_03", name: "Brandbeschleuniger", archetype: "fire", keywords: ["heat"],
    desc: "Ein Sieg mit ≥10 Wertvorsprung gibt +10 % Hitze zusätzlich.", heatAccel: true },
  SK_FIRE_04: { id: "SK_FIRE_04", name: "Hitzeschild", archetype: "fire", keywords: ["heat"],
    desc: "Niederlagen halbieren den Hitzeverlust (zugunsten des Spielers abgerundet).", heatShield: true },
  SK_FIRE_05: { id: "SK_FIRE_05", name: "Nachglut", archetype: "fire", keywords: ["heat"],
    desc: "Nach einem Sieg verursacht die nächste Niederlage 0 % Hitzeverlust (Siege erneuern, stapeln nicht).", afterglow: true },
  SK_FIRE_06: { id: "SK_FIRE_06", name: "Glühende Klinge", archetype: "fire", keywords: ["heat"],
    desc: "Bei ≥50 % Hitze erhalten alle eigenen Karten +2 temporären Wert (endet sofort unter 50 %).", glowingBlade: true },
  SK_FIRE_07: { id: "SK_FIRE_07", name: "Verbrennung", archetype: "fire", keywords: ["heat"],
    desc: "Feuer-Flat-Score pro Punkt +10 (erhöht die Hitzegewinnrate nicht).", burnBonus: true },
  SK_FIRE_08: { id: "SK_FIRE_08", name: "Feuerwalze", archetype: "fire", keywords: ["heat"],
    desc: "Jeder Sieg gibt der nächsten Karte +1 temporären Wert, steigend bis +5; eine Niederlage setzt zurück.", fireRoll: true },
  SK_FIRE_09: { id: "SK_FIRE_09", name: "Flächenbrand", archetype: "fire", keywords: ["heat", "consume"],
    desc: "Hitze-Konsument: bei voller Hitze gibt der nächste Sieg +1.000 Score; danach werden 100 Hitze verbraucht.", heatConsumer: "conflagration" },
  SK_FIRE_10: { id: "SK_FIRE_10", name: "Schmelzpunkt", archetype: "fire", keywords: ["heat", "consume"],
    desc: "Hitze-Konsument: vor jedem Stich −10 % Hitze, dafür eigene Karte +3 temporären Wert (nur ab 10 % Hitze).", heatConsumer: "melt" },
  SK_FIRE_11: { id: "SK_FIRE_11", name: "Sonnenkern", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: "Maximale Hitze steigt auf 150 % — der Überschuss über 100 % bleibt erhalten.", heatMax150: true },
  SK_FIRE_12: { id: "SK_FIRE_12", name: "Phönixfeuer", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: "Nachdem ein Hitze-Konsument ausgelöst hat, erhält die nächste eigene Karte +10 temporären Wert (stapelt nicht).", phoenix: true },

  // ---- Eis-Archetyp (#93 F3) — Kontrolle/Aufstellung mit eingefrorenen Karten. Kein Konsument, keine Ressource. ----
  // Grundmechanik (erster Eis-Skill): friert eigene Karten ein (blau, an card.id). Formations-Flags in formations.js gelesen.
  SK_ICE_01: { id: "SK_ICE_01", name: "Frostgriff", archetype: "ice", keywords: ["freeze"],
    desc: "Friere 2 zusätzliche zufällige eigene Karten ein (oben auf die Eis-Grundzahl).", frostGrip: true },
  SK_ICE_02: { id: "SK_ICE_02", name: "Kalte Präzision", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Eingefrorene Karten dürfen für Wiederholung als Wert ihres direkten Vorgängers zählen (echter Wert unverändert).", wildWiederholungPred: true },
  SK_ICE_03: { id: "SK_ICE_03", name: "Eisschritt", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Eingefrorene Karten dürfen für Treppen als 1 höher oder niedriger zählen.", wildTreppeStep: true },
  SK_ICE_04: { id: "SK_ICE_04", name: "Frostbrücke", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Eine eingefrorene Karte unterbricht keinen Farbblock (zählt selbst nicht dazu).", wildFarbblockSkip: true },
  SK_ICE_05: { id: "SK_ICE_05", name: "Kältereserve", archetype: "ice", keywords: ["freeze"],
    desc: "Verlierst du mit einer eingefrorenen Karte, erhält sie beim nächsten Auftauchen +4 temporären Wert.", frostReserve: true },
  SK_ICE_06: { id: "SK_ICE_06", name: "Kaltfront", archetype: "ice", keywords: ["freeze"],
    desc: "Nach einem kostenlosen Frosttausch: die eingefrorene Karte erhält im nächsten Durchlauf +3 temporären Wert (stapelt nicht).", coldFront: true },
  SK_ICE_07: { id: "SK_ICE_07", name: "Eisanker", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Eingefrorene Karten zählen auf ihrer Position als Anker → bei Sieg ×1,25 Score (zählt als Formation).", iceAnchor: true },
  SK_ICE_08: { id: "SK_ICE_08", name: "Frostspur", archetype: "ice", keywords: ["freeze"],
    desc: "Nach einem kostenlosen Frosttausch: der neue direkte Nachfolger erhält im nächsten Durchlauf +2 temporären Wert.", frostTrail: true },
  SK_ICE_09: { id: "SK_ICE_09", name: "Stillstand", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Gewinnt eine eingefrorene Karte als Teil von mindestens einer aktiven Formation → +200 Score.", standstill: true },
  SK_ICE_10: { id: "SK_ICE_10", name: "Kristallform", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Eingefrorene Karten dürfen für Wiederholung/Treppe/Wechsel als Wert −1, unverändert oder +1 zählen (günstigste Variante; echter Wert unverändert).", wildCrystal: true },
  SK_ICE_L01: { id: "SK_ICE_L01", name: "Frostbiss", archetype: "ice", legendary: true, keywords: ["freeze"],
    desc: "Gewinnt eine eingefrorene Karte, erhalten 2 zufällige Gegnerkarten des nächsten Durchlaufs −3 temporären Wert (nur nächster Durchlauf; erst im Kampf sichtbar).", frostbite: true },
  SK_ICE_L02: { id: "SK_ICE_L02", name: "Permafrost", archetype: "ice", legendary: true, keywords: ["freeze", "formation"],
    desc: "Eingefrorene Karten erhalten +2 Dauerwert und zählen gleichzeitig als Joker für Wiederholung/Treppe/Farbblock.", permafrost: true },
};

export const SKILL_LIST = Object.values(SKILL_DEFS);
export const archetypeOf = (id) => SKILL_DEFS[id]?.archetype || null;

/* Skill-Archetypen (#93). Metadaten (Theming/Label) — geteilte Quelle für SkillSelect & HUD.
   F0: nur „lightning" hat Skills; fire/ice folgen in F1/F3, die Metadaten stehen bereit. */
export const ARCHETYPE_META = {
  lightning: { key: "lightning", label: "Blitz",  icon: "⚡", color: "#8a7de0" }, // violett/elektrisch
  fire:      { key: "fire",      label: "Feuer",  icon: "🔥", color: "#e0714a" }, // warm/orange-rot
  ice:       { key: "ice",       label: "Eis",    icon: "❄️", color: "#5ec8f0" }, // eis-blau
};
export const ARCHETYPE_ORDER = ["lightning", "fire", "ice"];

// Archetypen, die aktuell noch anbietbare (nicht gehaltene) Skills haben.
export function archetypesWithSkills(owned = []) {
  const have = new Set();
  for (const s of SKILL_LIST) if (!(owned || []).includes(s.id)) have.add(s.archetype);
  return ARCHETYPE_ORDER.filter((a) => have.has(a));
}

/* Aus welchen Archetypen wird das nächste Skill-Angebot gezogen (max C.MAX_ARCHETYPES)? Rein & testbar.
   - 0 aktiv → bis zu 2 zufällige verfügbare Archetypen (Erstangebot).
   - 1 aktiv → der aktive + 1 zufälliger noch nicht aktiver verfügbarer.
   - 2 aktiv → nur die beiden aktiven. */
export function offerArchetypes(activeArchetypes = [], available = [], rng = Math.random) {
  const active = (activeArchetypes || []).filter((a) => available.includes(a));
  if (active.length >= C.MAX_ARCHETYPES) return active.slice(0, C.MAX_ARCHETYPES);
  const picks = [...active];
  const pool = shuffle(available.filter((a) => !active.includes(a)), rng);
  while (picks.length < C.MAX_ARCHETYPES && pool.length) picks.push(pool.shift());
  return picks;
}

// Summe eines Skill-Hooks über die gehaltenen Skills (gleiche Shape wie Perk-Hooks).
export function skillSum(skills, name, ctx) {
  let t = 0;
  for (const id of skills || []) { const f = SKILL_DEFS[id]?.[name]; if (f) t += f(ctx); }
  return t;
}

// Frischer Blitz-Substate — inaktiv. Wird beim ersten Blitz-Skill aktiviert (Reducer).
// armed = Serien-Rahmen (Geladene Serie); storm* = Gewitterfront (Stufe C).
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0,
    dischargeArmed: false }; // #93 F2 Entladung: nächster Crit +500 nach vollem Verbrauch
}

/* ---- Feuer-Archetyp (#93 F1) — Hitze-Substate + reine Helfer (testbar; Engine-Nutzung in resolveTrick) ---- */

// Frischer Hitze-Substate — inaktiv. Wird beim ersten Feuer-Skill aktiviert (Reducer).
// afterglowArmed = Nachglut · fireRoll = Feuerwalze-Stapel · phoenixArmed = Phönixfeuer · conflagArmed = Flächenbrand.
export function initHeat() {
  return { active: false, value: 0, max: C.HEAT_MAX, afterglowArmed: false, fireRoll: 0, phoenixArmed: false, conflagArmed: false };
}

// Anzahl gehaltener Feuer-Skills (Grundmechanik zählt nicht) & ob ein Feuer-Flag gehalten wird.
export const activeFireCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "fire").length;
export const fireFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
// Hitze-Maximum je Build (Sonnenkern → 150).
export const heatMaxFor = (skills) => (fireFlag(skills, "heatMax150") ? C.HEAT_MAX_SUN : C.HEAT_MAX);
// Gehaltener Hitze-Konsument („conflagration"/„melt") oder null (max 1, im Reducer erzwungen).
export function heatConsumerOf(skills) {
  for (const id of skills || []) { const c = SKILL_DEFS[id]?.heatConsumer; if (c) return c; }
  return null;
}
// Anzahl gehaltener Hitze-Konsumenten (der Reducer blockt > 1).
export const heatConsumerCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.heatConsumer).length;

// Hitzegewinn bei Sieg (%): Basis (min(Vorsprung, HEAT_MARGIN_CAP)−2)×HEAT_PER_POINT, Glut ×1,5 (kaufm. gerundet),
// +Brennstoff/+Brandbeschleuniger. #121: effektiver Vorsprung gedeckelt (Late-Game-Runaway raus), Rate 2→1.
export function heatGainFor(margin, skills, cardValue) {
  if (margin < C.HEAT_MIN_MARGIN) return 0;
  let g = (Math.min(margin, C.HEAT_MARGIN_CAP) - 2) * C.HEAT_PER_POINT;
  if (fireFlag(skills, "emberBoost")) g = Math.round(g * C.EMBER_MULT);
  if (fireFlag(skills, "heatFuel") && cardValue >= C.FUEL_MIN_VALUE) g += C.FUEL_BONUS;
  if (fireFlag(skills, "heatAccel") && margin >= C.ACCEL_MIN_MARGIN) g += C.ACCEL_BONUS;
  return g;
}
// Hitzeverlust bei Niederlage (%): min(Rückstand,10); Nachglut → 0; Hitzeschild → halbiert (abgerundet).
export function heatLossFor(deficit, skills, afterglowArmed) {
  if (afterglowArmed) return 0;
  let l = Math.min(deficit, C.HEAT_LOSS_MAX);
  if (fireFlag(skills, "heatShield")) l = Math.floor(l / 2);
  return l;
}
// Feuer-Flat-Score bei Sieg: (Vorsprung−2) × (25 + 5×(FeuerSkills−1) + Verbrennung?10:0). 0 ohne Feuer-Skill.
export function fireScoreFor(margin, skills) {
  const n = activeFireCount(skills);
  if (n === 0 || margin < C.HEAT_MIN_MARGIN) return 0;
  const per = C.FIRE_SCORE_BASE + C.FIRE_SCORE_PER_SKILL * (n - 1) + (fireFlag(skills, "burnBonus") ? C.BURN_BONUS : 0);
  return (margin - 2) * per;
}

/* ---- Eis-Archetyp (#93 F3) — eingefrorene Karten (blau, an card.id) + reine Helfer ---- */

export const isFrozen = (card) => !!card?.frozen;
export const frozenCount = (deck) => (deck || []).filter((c) => c.frozen).length;
// Ein Eis-Flag/Prädikat + Anzahl gehaltener Eis-Skills (Grundmechanik zählt nicht).
export const iceFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
export const iceSkillCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "ice").length;
// Formations-Wildcard-Prädikate (in formations.js gelesen) + Engine-Prädikate.
export const hasFrostGrip     = (skills) => iceFlag(skills, "frostGrip");
export const hasIceAnchor     = (skills) => iceFlag(skills, "iceAnchor");
export const hasStandstill    = (skills) => iceFlag(skills, "standstill");
export const hasFrostReserve  = (skills) => iceFlag(skills, "frostReserve");
export const hasColdFront     = (skills) => iceFlag(skills, "coldFront");
export const hasFrostTrail    = (skills) => iceFlag(skills, "frostTrail");
export const hasFrostbite     = (skills) => iceFlag(skills, "frostbite");
export const hasPermafrost    = (skills) => iceFlag(skills, "permafrost");
// Zielanzahl eingefrorener Karten: erster Eis-Skill = ICE_BASE_FREEZE, je weiterer +1, Frostgriff +2. 0 ohne Eis-Skill.
export function frozenTargetFor(skills) {
  const n = iceSkillCount(skills);
  if (n === 0) return 0;
  return C.ICE_BASE_FREEZE + (n - 1) + (hasFrostGrip(skills) ? C.FROST_GRIP_BONUS : 0);
}
// `count` noch nicht eingefrorene eigene Karten einfrieren (immutabel, deterministisch über rng).
export function freezeCards(deck, count, rng) {
  const pool = (deck || []).map((_, i) => i).filter((i) => !deck[i].frozen);
  const chosen = new Set();
  let remaining = count;
  while (remaining > 0 && pool.length > 0) {
    const j = Math.floor(rng() * pool.length);
    chosen.add(pool.splice(j, 1)[0]);
    remaining -= 1;
  }
  return (deck || []).map((c, i) => (chosen.has(i) ? { ...c, frozen: true } : c));
}

// Roh-Crit-Beitrag des Blitz-Archetyps (Abschnitt 2a): Aktivierungs-Sockel + Σ Skill-critChance
// + Gewitterfront-Bonus (dauerhaft, Stufe C). Fließt additiv in die Gesamt-Crit-Chance. 0, solange inaktiv.
export function lightningCritRaw(lightning, skills) {
  if (!lightning || !lightning.active) return 0;
  return C.LIGHTNING_CRIT_BASE + skillSum(skills, "critChance", {}) + (lightning.stormCritBonus || 0);
}

// Ladung erhöhen (immutabel), gedeckelt auf maxCharge. No-op, solange der Archetyp inaktiv ist.
export function addCharge(lightning, gained) {
  if (!lightning || !lightning.active) return lightning;
  return { ...lightning, charge: Math.min(lightning.maxCharge, lightning.charge + gained) };
}

// Angebot (#93 F0): bis zu `count` noch nicht gehaltene Skills, nach Archetyp gruppiert (2+2),
// aus max C.MAX_ARCHETYPES Archetypen (offerArchetypes). Deterministisch über den injizierten rng.
// Leerer Pool → [] (Reducer/Engine fällt auf Perk-Angebot zurück). F0: nur Blitz → 4 Blitz-Skills.
export function buildSkillOffer(owned, activeArchetypes, rng, count, legendaryChance = 0) {
  const available = archetypesWithSkills(owned);
  const chosen = offerArchetypes(activeArchetypes || [], available, rng);
  if (!chosen.length) return [];
  // Expliziter Legendär-Roll (Shop-Spec §10 P6): NUR wenn eine Legendär-Chance übergeben ist. Legendäre Skills
  // werden dann aus dem normalen Zug ausgeschlossen und kommen ausschließlich über diesen Wurf (bei Erfolg genau
  // einer). Ohne Chance (0) bleibt das alte Verhalten exakt erhalten (kein rng-Drift für Bestandstests).
  const legHit = legendaryChance > 0 && rng() < legendaryChance;
  const gateLeg = legendaryChance > 0;
  const isLeg = (id) => !!SKILL_DEFS[id]?.legendary;
  const perArch = Math.max(1, Math.floor(count / chosen.length)); // 2 bei 2 Archetypen, count bei 1
  const offer = [];
  const rest = [];
  const legPool = [];
  for (const arch of chosen) {
    let pool = shuffle(SKILL_LIST.filter((s) => s.archetype === arch && !(owned || []).includes(s.id)).map((s) => s.id), rng);
    if (gateLeg) { legPool.push(...pool.filter(isLeg)); pool = pool.filter((id) => !isLeg(id)); } // Legendäre nur über den Roll
    for (let i = 0; i < perArch && pool.length; i++) offer.push(pool.shift());
    rest.push(...pool); // Reste des Archetyps für die Auffüllung
  }
  const fill = shuffle(rest, rng); // auffüllen bis count, falls ein Archetyp zu wenige Skills hatte
  while (offer.length < count && fill.length) offer.push(fill.shift());
  // Bei erfolgreichem Roll genau einen legendären Skill einsetzen. Balance (2+2+2) wahren: einen normalen Skill
  // DESSELBEN Archetyps ersetzen — NICHT blind den letzten Slot, sonst verliert ein anderer Archetyp einen Platz
  // und der Legendär-Archetyp bekommt einen zu viel (#129). Fallback: letzter Slot bzw. auffüllen.
  if (legHit && legPool.length) {
    const leg = shuffle(legPool, rng)[0];
    if (!offer.includes(leg)) {
      if (offer.length >= count) {
        const legArch = archetypeOf(leg);
        let idx = -1;
        for (let i = offer.length - 1; i >= 0; i--) if (archetypeOf(offer[i]) === legArch) { idx = i; break; }
        offer[idx >= 0 ? idx : offer.length - 1] = leg;
      } else offer.push(leg);
    }
  }
  return offer;
}

/* ---- Ionisierung (Stufe B, docs/blitz-archetyp.md Abschnitt 5/6) ---- */

// Score-Bonus einer gespielten Karte: +ION_SCORE_PER_STACK je Stapel (Stand VOR dem Zuwachs).
export function ionScoreFor(card) {
  return (card?.ionStacks || 0) * C.ION_SCORE_PER_STACK;
}

// Voll-Ladungs-Verbraucher (Abschnitt 6): Ionisierung (ionize) und Geladene Serie (protectStreak).
export function hasIonize(skills)  { return (skills || []).some((id) => SKILL_DEFS[id]?.onFullCharge === "ionize"); }
export function hasProtect(skills) { return (skills || []).some((id) => SKILL_DEFS[id]?.onFullCharge === "protectStreak"); }
// Prädikat „hat der Build einen Verbraucher?" — Test-/Anzeige-API; die Engine prüft hasIonize/hasProtect direkt.
export function consumesCharge(skills) { return hasIonize(skills) || hasProtect(skills); }

// Reaktoren (laufen bei JEDEM Verbrauch): Reststrom (Ladungsboden), Gewitterfront (Crit/Score).
export function chargeFloorFor(skills) {
  let floor = 0;
  for (const id of skills || []) { const f = SKILL_DEFS[id]?.chargeFloor; if (f) floor = Math.max(floor, f()); }
  return floor;
}
export function hasStorm(skills) { return (skills || []).some((id) => SKILL_DEFS[id]?.storm); }

// ---- Blitz-Rework (#93 F2): Flag-Prädikate + abgeleitete Werte ----
const lightFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
export const hasThunderGod   = (skills) => lightFlag(skills, "thunderGod");
export const hasStaticCharge = (skills) => lightFlag(skills, "staticCharge");
export const hasConductivity = (skills) => lightFlag(skills, "conductivity");
export const hasEndlessStorm = (skills) => lightFlag(skills, "endlessStorm");
export const hasDischarge    = (skills) => lightFlag(skills, "discharge");
// Ladungsmaximum je Build (Donnergott → 15) & dessen dauerhafter Crit-Multiplikator-Bonus.
export const maxChargeFor      = (skills) => (hasThunderGod(skills) ? C.LIGHTNING_MAX_CHARGE_THUNDER : C.LIGHTNING_MAX_CHARGE);
export const lightningCritMult = (skills) => (hasThunderGod(skills) ? C.THUNDER_CRIT_MULT : 0);
// Anzahl gehaltener Ladungs-Konsumenten (Ionisierung/Geladene Serie); der Reducer blockt > 1.
export const chargeConsumerCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.onFullCharge).length;
// Aktiver Ladungs-Konsument (für HUD/Badge): "ionize" | "protectStreak" | null.
export const chargeConsumerOf = (skills) => {
  for (const id of skills || []) { const c = SKILL_DEFS[id]?.onFullCharge; if (c) return c; }
  return null;
};

// Anzahl je Auslösung ionisierter Karten: Ionisierung (2) + Kettenblitz (+2), sofern gehalten.
export function ionizeCountFor(skills) {
  return skillSum(skills, "ionizeCount", {});
}

// Ladung verbrauchen → auf den Boden (Stufe C: Reststrom hebt ihn; Default 0).
export function consumeCharge(lightning, floor = 0) {
  if (!lightning || !lightning.active) return lightning;
  return { ...lightning, charge: Math.max(0, floor) };
}

// `count` Karten ionisieren (immutabel, deterministisch). Gültige Ziele = ungespielte Karten
// (Deck-Indizes in `undrawn`); je +1 Stapel (max ION_MAX_STACKS). Reichen die ungespielten Karten
// nicht (Kettenblitz-Fall), gehen die Rest-Stapel an bereits ionisierte Karten (Abschnitt 8.4).
export function ionizeCards(deck, undrawn, count, rng) {
  const bumps = {}; // Deck-Index -> zusätzliche Stapel
  const pool = [...(undrawn || [])];
  let remaining = count;
  while (remaining > 0 && pool.length > 0) {
    const j = Math.floor(rng() * pool.length);
    const idx = pool.splice(j, 1)[0];
    bumps[idx] = (bumps[idx] || 0) + 1;
    remaining -= 1;
  }
  if (remaining > 0) {
    // Fallback: nicht genug ungespielte Karten → Rest auf bereits ionisierte Karten (deckweit).
    let ionized = deck.map((_, i) => i).filter((i) => (deck[i].ionStacks || 0) > 0 || bumps[i]);
    while (remaining > 0 && ionized.length > 0) {
      const j = Math.floor(rng() * ionized.length);
      const idx = ionized.splice(j, 1)[0];
      bumps[idx] = (bumps[idx] || 0) + 1;
      remaining -= 1;
    }
  }
  return deck.map((c, i) => (bumps[i] ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + bumps[i]) } : c));
}
