import * as C from "./constants.js";
import { hasWeekMod } from "./weekMods.js";
import { ARCHETYPE_ORDER, SKILL_OFFER_PER_ARCH_CAP } from "./skills.js";

/* exp: rules per run. A Dev-Run may override, for ONE run, the tuning constants that shape the
   decision loop — skills per archetype in an offer, how many archetypes may mix, held skill slots,
   perks per offer. `state.rules` is null outside a Dev-Run, and every reader then falls back to the
   constants, so Sim, standard and ranked runs stay byte-identical. Pure, no React, node-testable. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Inclusive bounds of each rule — the panel's slider range and the reducer's sanitiser share them.
export const RULE_LIMITS = Object.freeze({
  skillsPerArch: [1, 6],
  maxArchetypes: [1, ARCHETYPE_ORDER.length],
  skillSlots: [1, C.SKILL_SLOT_LIMIT], // exp skill rework: the top value means "unlimited" (the default)
  perksOffered: [1, 6],
});

// The live constants, expressed as rules. SKILLS_OFFERED (12) is 3 per archetype × 4 archetypes; the
// offer builder caps per archetype, so "per archetype" is the knob and the total is derived from it.
export const DEFAULT_RULES = Object.freeze({
  skillsPerArch: clamp(Math.floor(C.SKILLS_OFFERED / Math.max(1, C.MAX_ARCHETYPES)), 1, SKILL_OFFER_PER_ARCH_CAP),
  maxArchetypes: C.MAX_ARCHETYPES,
  skillSlots: C.SKILL_SLOT_LIMIT,
  perksOffered: C.PERKS_OFFERED,
});

// Unknown keys dropped, numbers floored and clamped, junk ignored. null when nothing usable is left.
export function sanitizeRules(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const [key, [lo, hi]] of Object.entries(RULE_LIMITS)) {
    const n = Math.floor(Number(raw[key]));
    if (Number.isFinite(n)) out[key] = clamp(n, lo, hi);
  }
  return Object.keys(out).length ? out : null;
}

// Effective rules of a state: defaults, overlaid by the run's sanitised overrides.
export function runRules(state) {
  return { ...DEFAULT_RULES, ...(sanitizeRules(state && state.rules) || {}) };
}

// Perks per offer. The ranked week mod "scarcePerks" keeps its 1 — it sits above the run rule.
export function perksOfferedFor(state) {
  return hasWeekMod(state && state.weekMods, "scarcePerks") ? 1 : runRules(state).perksOffered;
}

/* Parameters of one skill offer: total `count`, archetype cap, per-archetype cap — and `doorSize`, the
   skills behind one door of the door offer (docs/skill-rework.md §1), which is the "skills per archetype"
   knob read the door way. The ranked week mod "scarceSkills" returns exactly the legacy tuple (count 4
   under the builder's own cap) and one skill per door — the old 1-per-faction ratio; every other run
   derives the total from the two rule knobs. */
export function skillOfferParams(state) {
  const r = runRules(state);
  if (hasWeekMod(state && state.weekMods, "scarceSkills")) return { count: 4, maxArchetypes: r.maxArchetypes, perArchCap: SKILL_OFFER_PER_ARCH_CAP, doorSize: 1 };
  return { count: r.skillsPerArch * r.maxArchetypes, maxArchetypes: r.maxArchetypes, perArchCap: r.skillsPerArch, doorSize: r.skillsPerArch };
}
