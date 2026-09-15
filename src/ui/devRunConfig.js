import { MAX_CYCLES, FORMATION_ENERGY, buildSchedule } from "../game/constants.js";
import { N_POS, MAX_COVER } from "../game/architect.js";
import { DEFAULT_RULES, sanitizeRules } from "../game/rules.js";

/* exp: the Dev-Run configuration as pure data — defaults, sanitising, plan helpers and the START_RUN
   payload. DevRunSetup.jsx is only the view on this. Presets and the "last used" record store the
   same object, so a stale or hand-edited record is normalised here instead of crashing the panel.
   No React, node-testable. */

// exp skill rework: the legendary phase is gone (legendaries roll inside the skill offer), so every token is a plan type.
export const DECISION_TOKENS = ["skill", "perk", "formation", "shop"];
export const PLAN_TOKENS = DECISION_TOKENS;
export const MIN_ROUNDS = 5;
export const MAX_ROUNDS = 100;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const int = (v, def) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : def; };

// Round-robin over the enabled plan types (evenly interleaved, no clusters). Nothing enabled → all perk.
export function distribute(n, enabled) {
  const pool = PLAN_TOKENS.filter((tk) => enabled.includes(tk));
  if (!pool.length) return Array.from({ length: n }, () => "perk");
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}

// The real game as a Dev-Run: its length, its plan, its constants as rules.
export function defaultConfig() {
  return { rounds: MAX_CYCLES, enabled: [...DECISION_TOKENS], schedule: buildSchedule(MAX_CYCLES), cover: MAX_COVER,
    energy: FORMATION_ENERGY, fullCatalog: false, rules: { ...DEFAULT_RULES } };
}

/* Any object → a valid config. Rounds clamped, unknown plan tokens and tokens of a disabled type replaced
   (standard plan first, round-robin where the standard type is disabled too), the plan cut or extended to
   the round count, rules clamped through the reducer's own sanitiser. Also the single place that grows or
   shrinks the plan when the round count changes. */
export function normalizeConfig(raw) {
  const d = defaultConfig();
  if (!raw || typeof raw !== "object") return d;
  const rounds = clamp(int(raw.rounds, d.rounds), MIN_ROUNDS, MAX_ROUNDS);
  let enabled = Array.isArray(raw.enabled) ? DECISION_TOKENS.filter((tk) => raw.enabled.includes(tk)) : [...DECISION_TOKENS];
  if (!PLAN_TOKENS.some((tk) => enabled.includes(tk))) enabled = [...DECISION_TOKENS];
  const std = buildSchedule(rounds);
  const rr = distribute(rounds, enabled);
  const src = Array.isArray(raw.schedule) ? raw.schedule : [];
  const schedule = Array.from({ length: rounds }, (_, i) => {
    const tk = src[i];
    if (DECISION_TOKENS.includes(tk) && enabled.includes(tk)) return tk;
    return enabled.includes(std[i]) ? std[i] : rr[i];
  });
  return {
    rounds, enabled, schedule,
    cover: clamp(int(raw.cover, d.cover), 0, N_POS),
    energy: clamp(int(raw.energy, d.energy), 0, N_POS),
    fullCatalog: !!raw.fullCatalog,
    rules: { ...DEFAULT_RULES, ...(sanitizeRules(raw.rules) || {}) },
  };
}

// The START_RUN payload (`action.dev`): only what the reducer reads — `enabled` is panel state.
export function toDevAction(cfg) {
  const c = normalizeConfig(cfg);
  return { rounds: c.rounds, schedule: c.schedule.slice(0, c.rounds), cover: c.cover, energy: c.energy,
    fullCatalog: c.fullCatalog, rules: { ...c.rules } };
}
