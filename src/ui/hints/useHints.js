/* ONBOARDING HINTS — the state machine (docs/tutorial-onboarding-design.md §5.1, §5.2, §5.4).

   Watches the reducer phase plus the levelup offer fields (levelup carries two selection kinds),
   counts phase visits per profile, and answers two questions: which banner does the current
   decision screen show, and is the H1 welcome card open. Everything shown at most once per
   profile life; dismissal is deciding (leaving the screen) or the ✕ — both mark seen.

   Far smaller than the removed guided-run engine on purpose: no seed, no spotlight, no anchor
   system, no progress counter (paper §9). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as C from "../../game/constants.js";
import { SKILL_DEFS } from "../../game/skills.js";
import { loadHintProgress, saveHintProgress } from "../../game/storage.js";
import { hintForScreen, screenOf } from "./hintScript.js";
import { resolveHint } from "./HintCard.jsx";

const COUNTED = new Set(["formation", "architect", "perk", "skill"]);

export function useHints({ state, profile }) {
  const [prog, setProg] = useState(loadHintProgress);
  const seen = useMemo(() => new Set(prog.seen), [prog.seen]);
  const markSeen = useCallback((id) => setProg((p) => {
    if (!id || p.seen.includes(id)) return p;
    const next = { ...p, seen: [...p.seen, id] };
    saveHintProgress(next);
    return next;
  }), []);

  const screen = screenOf(state);
  // The visit identity: same run (seed) + same cycle + same screen = one visit, however often
  // React re-renders or the tab reloads mid-phase.
  const ctxKey = screen ? `${screen}:${state?.seed ?? "x"}:${state?.cycle ?? 0}` : null;
  const isNewVisit = !!(screen && COUNTED.has(screen) && prog.last?.[screen] !== ctxKey);
  // Effective counters for THIS render — the commit below persists the same values, so the
  // banner does not arrive one frame late.
  const visits = useMemo(() => {
    const v = { ...prog.visits };
    if (isNewVisit) v[screen] = (v[screen] || 0) + 1;
    return v;
  }, [prog.visits, isNewVisit, screen]);
  useEffect(() => {
    if (!isNewVisit) return;
    setProg((p) => {
      if (p.last?.[screen] === ctxKey) return p;
      const next = { ...p, visits: { ...p.visits, [screen]: (p.visits?.[screen] || 0) + 1 },
        last: { ...p.last, [screen]: ctxKey } };
      saveHintProgress(next);
      return next;
    });
  }, [isNewVisit, screen, ctxKey]);

  // ---- selection context for the skill screen
  const offer = state?.skillOffer || null;
  const archs = useMemo(() => {
    const s = new Set();
    for (const id of offer || []) { const a = SKILL_DEFS[id]?.archetype; if (a) s.add(a); }
    return s;
  }, [offer]);
  const firstRun = !!profile && profile.hadCompletedRun === false;
  const slots = state?.skillSlots ?? C.SKILL_SLOTS;
  const ctx = {
    seen, visits, state, firstRun,
    blitzOnly: archs.size === 1 && archs.has("lightning"),
    multiArch: archs.size >= 2,
    slotsFull: (state?.skills?.length || 0) >= slots,
    slots,
  };
  const bannerId = screen ? hintForScreen(screen, ctx) : null;

  // ---- dismissal by deciding: leaving the context marks the banner that was on it as seen.
  const shownRef = useRef(null);
  useEffect(() => {
    const prev = shownRef.current;
    if (prev && prev.key !== ctxKey) { shownRef.current = null; markSeen(prev.id); }
    if (ctxKey && bannerId) shownRef.current = { key: ctxKey, id: bannerId };
  }, [ctxKey, bannerId, markSeen]);

  // ---- H1: the one blocking card. First-ever run, before anything else; freezes play beneath.
  const inRun = state && state.phase !== "menu" && state.phase !== "gameover";
  const cardId = inRun && firstRun && !seen.has("H1") ? "H1" : null;

  // Plain function on purpose: the slots re-render with the provider anyway, and a useCallback
  // here would need the whole ctx in its deps — an exhaustive-deps exception for zero gain.
  const bannerFor = (slotScreen) =>
    (slotScreen === screen && bannerId ? resolveHint(bannerId, ctx) : null);

  return {
    card: cardId ? resolveHint(cardId, ctx) : null,
    dismissCard: () => markSeen("H1"),
    bannerFor,
    dismiss: markSeen,
    freeze: !!cardId,     // App adds this to the play-freeze condition chain like any overlay
    onMore: null,         // T-O4 wires the Probierfeld deep link; until then no link renders
  };
}
