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
import { noOfferPlaceable } from "../../game/architect.js";
import { familyDef } from "../../game/families.js";
import { loadHintProgress, saveHintProgress } from "../../game/storage.js";
import { hintForScreen, screenOf, eventForPlay, resolveTarget, HINT_DEFS } from "./hintScript.js";
import { resolveHint } from "./HintCard.jsx";

// Besuchszähler: die vier Entscheidungsscreens plus die Stichphase selbst (U-Hints takten über
// den play-Ordinal — Papier §5.3: „play start, cycle 2/6/9" ist der Besuchs-Ordinal, keine feste Nummer).
const COUNTED = new Set(["formation", "architect", "perk", "skill", "play"]);

export function useHints({ state, profile, onMore = null, breakdownOn = true, guided = false }) {
  const [prog, setProg] = useState(loadHintProgress);
  const seen = useMemo(() => new Set(prog.seen), [prog.seen]);
  // Ref-Spiegel des aktuellen Phasen-Kontexts für markSeen (das Callback bleibt dep-frei):
  // `seenAt` merkt sich, in WELCHER Phase ein Hint gesehen wurde — C6 wartet auf „C5 war früher".
  const ctxKeyRef = useRef(null);
  const markSeen = useCallback((id) => setProg((p) => {
    if (!id || p.seen.includes(id)) return p;
    // Q15: C7b („Eis und Pflanze verfügbar") deckt beide Einzel-Hinweise mit ab.
    const ids = id === "C7b" ? ["C7b", "C7", "C8"] : [id];
    const add = ids.filter((x) => !p.seen.includes(x));
    if (!add.length) return p;
    const at = Object.fromEntries(add.map((x) => [x, ctxKeyRef.current]));
    const next = { ...p, seen: [...p.seen, ...add], seenAt: { ...p.seenAt, ...at } };
    saveHintProgress(next);
    return next;
  }), []);
  /* Runde 3 (Owner): „Alle Tutorial-Tipps überspringen" auf der H1-Karte — JEDER Hint gilt als
     gesehen (auch die späten Eis-/Pflanze-/Legendär-Tipps), es kommt nie wieder einer. */
  const skipAll = useCallback(() => setProg((p) => {
    const next = { ...p, seen: [...new Set([...p.seen, ...Object.keys(HINT_DEFS)])] };
    saveHintProgress(next);
    return next;
  }), []);
  /* „Tutorial-Lauf": kompletter Reset — Tipps, Besuchszähler und Kontexte, damit der nächste Lauf
     wieder von vorn führt (U1/U2/U3 takten über die Besuchszähler). */
  const resetAll = useCallback(() => {
    const next = { seen: [], visits: {}, last: {}, seenAt: {} };
    saveHintProgress(next);
    setProg(next);
  }, []);

  const screen = screenOf(state);
  // The visit identity: same run (seed) + same cycle + same screen = one visit, however often
  // React re-renders or the tab reloads mid-phase. `play` zählt als eigener Kontext mit.
  const countKey = screen || (state?.phase === "play" ? "play" : null);
  const ctxKey = countKey ? `${countKey}:${state?.seed ?? "x"}:${state?.cycle ?? 0}` : null;
  ctxKeyRef.current = ctxKey;
  const isNewVisit = !!(countKey && COUNTED.has(countKey) && prog.last?.[countKey] !== ctxKey);
  // Effective counters for THIS render — the commit below persists the same values, so the
  // banner does not arrive one frame late.
  const visits = useMemo(() => {
    const v = { ...prog.visits };
    if (isNewVisit) v[countKey] = (v[countKey] || 0) + 1;
    return v;
  }, [prog.visits, isNewVisit, countKey]);
  useEffect(() => {
    if (!isNewVisit) return;
    setProg((p) => {
      if (p.last?.[countKey] === ctxKey) return p;
      const next = { ...p, visits: { ...p.visits, [countKey]: (p.visits?.[countKey] || 0) + 1 },
        last: { ...p.last, [countKey]: ctxKey } };
      saveHintProgress(next);
      return next;
    });
  }, [isNewVisit, countKey, ctxKey]);

  // ---- selection context for the skill screen
  const offer = state?.skillOffer || null;
  const archs = useMemo(() => {
    const s = new Set();
    for (const id of offer || []) { const a = SKILL_DEFS[id]?.archetype; if (a) s.add(a); }
    return s;
  }, [offer]);
  // `guided` (Runde 3, Tutorial-Lauf): der Lauf führt wie ein Erstlauf, auch auf Veteranen-Profilen.
  const firstRun = (!!profile && profile.hadCompletedRun === false) || guided;
  const slots = state?.skillSlots ?? C.SKILL_SLOTS;
  /* C5: „kein Bauplan passt mehr" — nur auf dem Architekt-Screen gerechnet (die Prüfung zählt
     Platzierungen auf dem 5×8-Brett) und am Angebots-/Gebäude-Objekt memoisiert. */
  const architectStuck = useMemo(() => (
    screen === "architect" ? noOfferPlaceable(state?.architect, state?.challengeBlockArch || []) : false
  ), [screen, state?.architect, state?.challengeBlockArch]);
  /* Q8: enthält das Perk-Angebot einen Anker-Perk? (Familien-Einträge {familyId,tier} mit anchor-Feld.) */
  const offerHasAnker = useMemo(() => (state?.offer || []).some((o) => {
    if (!o || typeof o !== "object" || !o.familyId) return false;
    return !!familyDef(o.familyId)?.tiers?.[o.tier || 1]?.anchor;
  }), [state?.offer]);
  const ctx = {
    seen, visits, state, firstRun,
    blitzOnly: archs.size === 1 && archs.has("lightning"),
    multiArch: archs.size >= 2,
    // Q15: neu freigeschaltete Archetypen, sobald sie im Skill-Angebot auftauchen.
    iceAvail: archs.has("ice"),
    plantAvail: archs.has("plant"),
    offerHasAnker,
    slotsFull: (state?.skills?.length || 0) >= slots,
    slots, architectStuck,
    /* Runde 2, R19: C6 (Kombis/Formationen-Toggles) kommt in der Architekt-Phase NACH der,
       in der C5 weggeklickt wurde — „C5 gesehen, aber nicht in dieser Phase". */
    c5Done: seen.has("C5") && prog.seenAt?.C5 !== ctxKey,
  };
  const bannerId = screen ? hintForScreen(screen, ctx) : null;

  // ---- dismissal by deciding: leaving the context marks the banner that was on it as seen.
  const shownRef = useRef(null);
  useEffect(() => {
    const prev = shownRef.current;
    /* Q10 (Runde 3, Owner): C5 zeigt sich wie jeder Banner genau einmal — die R18-Ausnahme
       (sticky bis ✕) ist zurückgenommen; seit R18 feuert er zuverlässig, einmal reicht. */
    if (prev && prev.key !== ctxKey) { shownRef.current = null; markSeen(prev.id); }
    if (ctxKey && bannerId) shownRef.current = { key: ctxKey, id: bannerId };
  }, [ctxKey, bannerId, markSeen]);

  // ---- Blockende Karten: H1 (Erstlauf-Begrüßung) plus die Phasen-Intros HF/HA (Q4/Q5) —
  //      einmal je Profil beim ERSTEN Betreten der Aufstellungs- bzw. Bauphase.
  const inRun = state && state.phase !== "menu" && state.phase !== "gameover";
  const cardId = inRun && firstRun && !seen.has("H1") ? "H1"
    : screen === "formation" && !seen.has("HF") ? "HF"
    : screen === "architect" && !seen.has("HA") ? "HA" : null;

  /* ---- Ereignis-/UI-Hints im Stichspiel (T-O2, Papier §5.3/§5.4). Die Auswahl ist pur
     (eventForPlay); hier leben nur die Quoten und der offene Karten-Zustand:
     · höchstens 2 Karten je Stichphase (Zähler je play-Kontext),
     · höchstens 1 je Stich (globale trickNo als Identität),
     · aufgeschoben statt eingereiht — jede Bedingung kehrt von selbst wieder. */
  const [activeEvent, setActiveEvent] = useState(null);
  const phaseQuota = useRef({ key: null, count: 0 });
  const lastEventTrick = useRef(null);
  // Ref-Spiegel des States (Haus-Muster aus test/hook-deps-budget): der Effekt taktet über die
  // SIGNATUR (playKey · trickNo · pos), liest den vollen State aber aus dem Spiegel — so bleibt
  // die Dep-Liste ehrlich, ohne bei jedem Reducer-Tick neu zu feuern.
  const stateRef = useRef(state);
  stateRef.current = state;
  const playKey = state?.phase === "play" ? `play:${state?.seed ?? "x"}:${state?.cycle ?? 0}` : null;
  const trickNo = state?.trickNo ?? 0;
  const atPhaseStart = (state?.pos || 0) === 0;
  const playVisit = visits.play || 0;
  const formationVisit = visits.formation || 0;   // E6 wartet auf die erste Aufstellphase
  if (playKey && phaseQuota.current.key !== playKey) phaseQuota.current = { key: playKey, count: 0 };
  useEffect(() => {
    // Kontextwechsel raus aus dem Stichspiel räumt eine offene Karte ab (Lauf beendet/abgebrochen).
    if (!playKey) { setActiveEvent((ev) => (ev ? null : ev)); return; }
    if (activeEvent || cardId) return;
    const st = stateRef.current;
    const id = eventForPlay({
      seen, state: st, atPhaseStart, playVisit, breakdownOn,
      formationVisit,
      shownThisPhase: phaseQuota.current.count,
      sameTrickAsLast: lastEventTrick.current != null && lastEventTrick.current === trickNo,
    });
    if (id) setActiveEvent({ id, key: playKey, trick: trickNo });
  }, [playKey, trickNo, atPhaseStart, playVisit, breakdownOn, formationVisit, activeEvent, cardId, seen]);
  const dismissEvent = () => {
    if (!activeEvent) return;
    phaseQuota.current = { key: playKey, count: phaseQuota.current.count + 1 };
    lastEventTrick.current = activeEvent.trick;
    markSeen(activeEvent.id);
    setActiveEvent(null);
  };

  // Plain function on purpose: the slots re-render with the provider anyway, and a useCallback
  // here would need the whole ctx in its deps — an exhaustive-deps exception for zero gain.
  const bannerFor = (slotScreen) =>
    (slotScreen === screen && bannerId ? resolveHint(bannerId, ctx) : null);

  return {
    card: cardId ? resolveHint(cardId, ctx) : null,
    dismissCard: () => markSeen(cardId),
    eventCard: activeEvent ? resolveHint(activeEvent.id, ctx) : null,
    dismissEvent,
    bannerFor,
    dismiss: markSeen,
    skipAll, resetAll,
    // App adds this to the play-freeze condition chain like any overlay: H1 UND jede offene
    // Ereignis-Karte halten den Lauf an, solange der Spieler liest.
    freeze: !!cardId || !!activeEvent,
    /* T-O4: „Mehr dazu" — oeffnet die Probierfeld-Runde des Hints. Nur vorhanden, wenn App einen
       Handler gibt; ohne ihn rendert kein toter Knopf (Contract onb-hints). */
    onMore: onMore ? (hint) => { const tgt = resolveTarget(HINT_DEFS[hint.id], ctx); if (tgt) onMore(tgt); } : null,
  };
}
