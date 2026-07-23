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
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE };
}

// Roh-Crit-Beitrag des Blitz-Archetyps (Abschnitt 2a): Aktivierungs-Sockel + Σ Skill-critChance.
// Fließt additiv in die Gesamt-Crit-Chance (wie ein Crit-Perk). 0, solange nicht aktiv.
export function lightningCritRaw(lightning, skills) {
  if (!lightning || !lightning.active) return 0;
  return C.LIGHTNING_CRIT_BASE + skillSum(skills, "critChance", {});
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
