import * as C from "./constants.js";

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
};

export const SKILL_LIST = Object.values(SKILL_DEFS);
export const archetypeOf = (id) => SKILL_DEFS[id]?.archetype || null;

// Summe eines Skill-Hooks über die gehaltenen Skills (gleiche Shape wie Perk-Hooks).
export function skillSum(skills, name, ctx) {
  let t = 0;
  for (const id of skills || []) { const f = SKILL_DEFS[id]?.[name]; if (f) t += f(ctx); }
  return t;
}

// Frischer Blitz-Substate — inaktiv. Wird beim ersten Blitz-Skill aktiviert (Reducer).
// armed = Serien-Rahmen (Geladene Serie); storm* = Gewitterfront (Stufe C).
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0 };
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

// Angebot: bis zu `count` noch nicht gehaltene Skills, deterministisch über den injizierten rng.
// Stufe A: einheitlicher Pool (nur Blitz). Leerer Pool → [] (Reducer/Engine fällt auf Perk-Angebot zurück).
export function buildSkillOffer(owned, rng, count) {
  let pool = SKILL_LIST.filter((s) => !(owned || []).includes(s.id));
  const chosen = [];
  while (chosen.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool[idx].id);
    pool = pool.filter((_, i) => i !== idx);
  }
  return chosen;
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
