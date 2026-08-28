/* ONBOARDING HINTS — the script as DATA, no display text.

   Same discipline as the removed guided run's tutorialScript.js and the sections' catalog.js
   (docs/tutorial-onboarding-design.md §5, §9): this module holds ids, triggers, sequence rules and
   "Mehr dazu" targets; every sentence lives as a key in the i18n catalogs. A German sentence here
   would be a one-language tutorial.

   Deliberately pure — no React, no `t`, no state. `formationName` is imported but only CALLED at
   render time (inside vars()), so the language is resolved when the hint shows, not when the
   module loads.

   HINT SCHEMA
     kind      "card" (centered, blocks like an overlay — only H1 in this task) or "banner"
               (one quiet strip on a decision screen).
     eyebrow   "tutorial" (default) or "suggest" — the suggestion sequences carry their own label.
     bodyKey   the sentence; titleKey only on cards.
     vars      optional (ctx) => interpolations. Never typed numbers — constants and registries
               only, so the next balance pass cannot make a hint lie.
     target    "section/lesson" in the tutorial-sections catalog — the "Mehr dazu" deep link
               (wired in T-O4; until then the link is not rendered). A guard test asserts every
               target exists, so a catalog cut cannot silently orphan a hint. */
import * as C from "../../game/constants.js";
import { formationName, archetypeLabel } from "../../i18n/labels.js";
import { fmtNum } from "../../i18n/index.js";
import { SKILL_DEFS } from "../../game/skills.js";
import { streakBaseMult } from "../../game/perks.js";
import { milestoneBarState } from "../../game/progression.js";
import { occupiedCells, completedStructures, districtFactorMap } from "../../game/architect.js";

/* §6.2 "Guter Start": the rule-derived recommendation for the first-run first skill offer — the
   consumer of the offered archetype (heat consumer or charge consumer), which the offer builder
   guarantees to be present (#191/#223). Rule, not curated id: a balance pass that reworks the
   consumers moves the badge with them. Null when no consumer is offered — then no badge shows,
   and the guard test tells us the guarantee changed. */
export const recommendedStarter = (offer) =>
  (offer || []).find((id) => { const d = SKILL_DEFS[id]; return !!(d && (d.heatConsumer || d.onFullCharge)); }) || null;

export const HINT_DEFS = {
  H1:    { kind: "card", titleKey: "hint.h1.title", bodyKey: "hint.h1.body",
           vars: () => ({ cards: C.TRICKS_PER_CYCLE }), target: "grundlagen/stich" },
  H2:    { kind: "banner", bodyKey: "hint.h2.body", target: "blitz/karte" },
  H2b:   { kind: "banner", bodyKey: "hint.h2b.body", target: "wahl/kategorien" },
  H3:    { kind: "banner", bodyKey: "hint.h3.body", target: "wahl/kategorien" },
  H3b:   { kind: "banner", bodyKey: "hint.h3b.body", target: "wahl/raritaet" },
  // Spec deviation, recorded in the task contract: the paper's H5 row says wahl/perks, but that
  // lesson is deleted by T-O4's cut — kategorien is the surviving neighbour.
  H5:    { kind: "banner", bodyKey: "hint.h5.body",
           vars: (ctx) => ({ slots: ctx?.slots ?? C.SKILL_SLOTS }), target: "wahl/kategorien" },
  "S-F1": { kind: "banner", eyebrow: "suggest", bodyKey: "hint.sf1.body",
            vars: () => ({ farbblock: formationName("farbblock") }), target: "aufstellung/formationen" },
  "S-F2": { kind: "banner", eyebrow: "suggest", bodyKey: "hint.sf2.body", target: "aufstellung/formationen" },
  "S-F3": { kind: "banner", eyebrow: "suggest", bodyKey: "hint.sf3.body", target: "aufstellung/stapeln" },
  "S-A1": { kind: "banner", eyebrow: "suggest", bodyKey: "hint.sa1.body", target: "architekt/wasist" },
  "S-A2": { kind: "banner", eyebrow: "suggest", bodyKey: "hint.sa2.body", target: "architekt/wohin" },
  "S-A3": { kind: "banner", eyebrow: "suggest", bodyKey: "hint.sa3.body", target: "architekt/wohin" },
  "S-A4": { kind: "banner", eyebrow: "suggest", bodyKey: "hint.sa4.body", target: "architekt/aufwerten" },
  C1:    { kind: "banner", bodyKey: "hint.c1.body", target: "eis/feld" },
  C2:    { kind: "banner", bodyKey: "hint.c2.body", target: "wahl/kategorien" },
  C3:    { kind: "banner", bodyKey: "hint.c3.body", target: "wahl/kategorien" },
  C4:    { kind: "banner", bodyKey: "hint.c4.body", target: "wahl/legendaer" },
  /* ---- Ereignis-Hints (T-O2, Papier §5.3): Pause-Karten im Stichspiel, erste Begegnung je
     Profil. Die vars lesen den ECHTEN Lauf — das verworfene Rechenbeispiel des geführten Laufs
     wird echte Mathematik mit Referent auf dem Schirm. */
  E1: { kind: "event", bodyKey: "hint.e1.body",
        vars: () => ({ win: fmtNum(C.SCORE_PER_WIN) }), target: "grundlagen/score" },
  E2: { kind: "event", bodyKey: "hint.e2.body", target: "grundlagen/stich" },
  E3: { kind: "event", bodyKey: "hint.e3.body",
        vars: (ctx) => { const n = ctx?.state?.lastTrick?.winStreak ?? ctx?.state?.winStreak ?? 0;
          return { n, mult: fmtNum(streakBaseMult(n)) }; }, target: "grundlagen/serie" },
  E4: { kind: "event", bodyKey: "hint.e4.body",
        vars: (ctx) => ({ critMult: fmtNum(ctx?.state?.lastTrick?.critMultiplier ?? 1) }), target: "blitz/karte" },
  E5: { kind: "event", bodyKey: "hint.e5.body",
        vars: (ctx) => ({ arch: archetypeLabel((ctx?.state?.activeArchetypes || [])[0]) || "" }),
        target: "blitz/karte" },
  E6: { kind: "event", bodyKey: "hint.e6.body",
        vars: (ctx) => { const lt = ctx?.state?.lastTrick; const f = (lt?.formations || [])[0];
          return { name: f ? formationName(f.type) : "", mult: fmtNum(lt?.formationMult ?? 1) }; },
        target: "aufstellung/formationen" },
  E7: { kind: "event", bodyKey: "hint.e7.body", target: "danach/punkte" },
  E8: { kind: "banner", bodyKey: "hint.e8.body", target: "danach/endscreen" },
  E9: { kind: "event", bodyKey: "hint.e9.body",
        vars: (ctx) => { const lt = ctx?.state?.lastTrick;
          return { kampfwert: fmtNum(lt?.pValue ?? 0), kartenwert: fmtNum(lt?.pCard?.value ?? 0) }; },
        target: "grundlagen/werte" },
  /* UI-Hints (Papier §5.3): ruhige Phasenstarts lehren den Lauf-Schirm selbst. */
  U1: { kind: "event", bodyKey: "hint.u1.body", target: "grundlagen/anzeigen" },
  U2: { kind: "event", bodyKey: "hint.u2.body", target: "grundlagen/herkunft" },
  U3: { kind: "event", bodyKey: "hint.u3.body", target: "grundlagen/anzeigen" },
};

/* ---- Done-predicates over run state, via the exported pure game functions (paper §5.2 rule 2).
   They read the same data the UI reads; a predicate that reimplemented a rule would be the
   second truth the whole design avoids. All are defensive against absent state (menu, tests). */
const perPos = (state) => (Array.isArray(state?.formations) ? state.formations : []);
export const hasFormationType = (state, type) =>
  perPos(state).some((p) => (p?.formations || []).some((f) => f?.type === type));
export const activeTypeCount = (state) => {
  const s = new Set();
  for (const p of perPos(state)) for (const f of (p?.formations || [])) s.add(f?.type);
  return s.size;
};
export const hasOverlap = (state) => perPos(state).some((p) => (p?.formations || []).length >= 2);
const blds = (state) => state?.architect?.buildings || [];
export const hasBuilding = (state) => blds(state).length > 0;
// Both maps are per-position factor arrays initialised to 1 — "achieved" means any factor moved.
export const hasDistrict = (state) => districtFactorMap(blds(state)).some((f) => f > 1);
export const hasStructure = (state) => completedStructures(occupiedCells(blds(state))) > 0;

/* ---- The suggestion sequences (paper §5.2): one task per phase visit, in order; a step whose
   goal is already met is skipped FOR GOOD (it counts as seen), a step whose visit has not come
   yet waits. minVisit keeps the cadence the curriculum names even when earlier steps were
   skipped. */
export const SEQUENCES = {
  formation: [
    { id: "S-F1", minVisit: 1, done: (st) => hasFormationType(st, "farbblock") },
    { id: "S-F2", minVisit: 2, done: (st) => activeTypeCount(st) >= 2 },
    { id: "S-F3", minVisit: 3, done: (st) => hasOverlap(st) },
  ],
  architect: [
    { id: "S-A1", minVisit: 1, done: (st) => hasBuilding(st) },
    { id: "S-A2", minVisit: 2, done: (st) => hasDistrict(st) },
    { id: "S-A3", minVisit: 3, done: (st) => hasStructure(st) },
    { id: "S-A4", minVisit: 4, done: null }, // informational — nothing to detect
  ],
};

/* Which hint screen is the run on? Pure over the reducer state — `levelup` alone does not
   identify a screen, the offer field does (same lesson the guided run's hook learned). */
export function screenOf(state) {
  const phase = state?.phase;
  if (phase === "levelup" && state.skillOffer) return "skill";
  if (phase === "levelup" && state.offer) return "perk";
  if (phase === "formation") return "formation";
  if (phase === "architect") return "architect";
  if (phase === "glacier-target") return "glacier";
  if (phase === "target") return "target";
  if (phase === "family-target") return "family";
  if (phase === "legendary") return "legendary";
  if (phase === "gameover") return "gameover";
  return null;
}

/* Which hint does a decision screen show right now? Pure over a context object so the whole
   selection is node-testable without React:
     seen       Set of hint ids already shown or skipped
     visits     { formation, architect, perk, skill } — 1-based visit counters
     state      the run state (for done-predicates)
     firstRun   profile exists and has never completed a run (H2's condition; T-O3 gates the
                offer itself on the same flag)
     blitzOnly  the current skill offer holds lightning skills only — H2's text asserts exactly
                that, so it never shows over an offer that contradicts it (T-O1 can land before
                T-O3; until the gate exists a fresh profile gets the generic H2b instead)
     multiArch  the current skill offer spans ≥ 2 archetypes (H2b's condition)
     slotsFull  held skills ≥ slots (H5's condition)
   Returns a hint id or null. markSkipped (optional) is called for sequence steps whose goal is
   already met, so the skip persists instead of re-evaluating forever. */
export function hintForScreen(screen, ctx, markSkipped) {
  const seen = ctx?.seen || new Set();
  const un = (id) => !seen.has(id);
  if (screen === "skill") {
    if (ctx.firstRun && ctx.blitzOnly && un("H2")) return "H2";
    if (ctx.multiArch && un("H2b")) return "H2b";
    if (ctx.slotsFull && un("H5")) return "H5";
    return null;
  }
  if (screen === "perk") {
    if (un("H3")) return "H3";
    if ((ctx.visits?.perk || 0) >= 2 && un("H3b")) return "H3b";
    return null;
  }
  if (screen === "formation" || screen === "architect") {
    const v = ctx.visits?.[screen] || 0;
    for (const step of SEQUENCES[screen]) {
      if (seen.has(step.id)) continue;
      if (v < step.minVisit) return null;
      if (step.done && step.done(ctx.state)) { if (markSkipped) markSkipped(step.id); continue; }
      return step.id;
    }
    return null;
  }
  if (screen === "gameover") return un("E8") ? "E8" : null;
  const conditional = { glacier: "C1", target: "C2", family: "C3", legendary: "C4" };
  const id = conditional[screen];
  return id && un(id) ? id : null;
}

/* Which event/UI hint is due in the play phase? Pure over a context object (node-testable):
     seen            Set of hint ids
     state           reducer state (lastTrick, activeArchetypes, score, …)
     atPhaseStart    no trick of this cycle resolved yet (state.pos === 0) — the free slot the
                     UI hints use (Papier §5.3): pausing there costs nothing
     playVisit       1-based counter of play phases entered (per profile)
     shownThisPhase  event cards already shown this play phase (cap 2 — §5.4 rule 1)
     sameTrickAsLast the current trick already carried a card (max 1 per trick)
   Deferred, never queued: every condition below recurs naturally, so a hint that loses its slot
   simply waits for the next occurrence. E5 outranks (§5.4 rule 2) and may also use the phase
   start — the bar it names is a persistent referent. */
export function eventForPlay(ctx) {
  const seen = ctx?.seen || new Set();
  const un = (id) => !seen.has(id);
  const state = ctx?.state;
  if ((ctx?.shownThisPhase || 0) >= 2) return null;
  if (!ctx?.atPhaseStart && ctx?.sameTrickAsLast) return null;
  if (un("E5") && (state?.activeArchetypes || []).length > 0) return "E5";
  if (ctx?.atPhaseStart) {
    const v = ctx?.playVisit || 0;
    if (un("U1") && v >= 2) return "U1";
    if (un("U2") && v >= 6) return "U2";
    if (un("U3") && v >= 9) return "U3";
    return null;
  }
  const lt = state?.lastTrick;
  if (!lt) return null;
  if (un("E1") && (lt.result === "win" || lt.result === "win_tie")) return "E1";
  if (un("E2") && lt.result === "tie") return "E2";
  if (un("E3") && (lt.winStreak || 0) >= 3) return "E3";
  if (un("E4") && lt.isCrit) return "E4";
  if (un("E6") && (lt.formationMult || 1) > 1) return "E6";
  if (un("E9") && lt.pCard && lt.pValue !== lt.pCard.value) return "E9";
  if (un("E7") && milestoneBarState(state?.score || 0).reached > 0) return "E7";
  return null;
}
