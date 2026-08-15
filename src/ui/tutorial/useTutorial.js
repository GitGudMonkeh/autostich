/* TUTORIAL-ZUSTANDSMASCHINE (Plan §7).

   Beobachtet die Reducer-Phase UND die Angebots-Felder — `levelup` allein sagt nicht, ob gerade ein
   Skill oder ein Perk gewählt wird; das steht nur in `state.skillOffer` bzw. `state.offer`. Jeder
   Schritt zeigt sich beim ERSTEN Auftreten seiner Phasenart, danach nie wieder (Plan §2).

   Bewusst UI-Zustand, keine Engine-Logik: src/game/ bleibt pur. Der geführte Lauf ist ein ganz
   normaler Lauf mit festem Seed — hier liegt nur, was der Spieler dazu liest.

   Der Merker `seen` lebt im Lauf (useRef), nicht im Profil: wer das Tutorial erneut startet, soll es
   wieder ganz sehen. Über den Lauf hinaus persistiert einzig „schon mal gesehen"
   (as_tutorial_done, storage.js) — und das auch nur bei Abschluss oder „Tutorial beenden". */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TUTORIAL_STEPS, TUTORIAL_OUTRO, TUTORIAL_MAIN_STEPS, TUTORIAL_TOTAL, stepMatches } from "./tutorialScript.js";

/* Was gerade auf dem Schirm steht. `null` = nichts, der Lauf läuft normal weiter. */
const VIEW_POPUP = "popup";  // Erklär-Pop-up der Phase
const VIEW_MARK  = "mark";   // Spotlight auf ein Panel
const VIEW_OUTRO = "outro";  // einmaliger Abschluss-Hinweis

export function useTutorial({ active, phase, state, runKey = 0, onDone }) {
  const seen = useRef(new Set());
  const [cur, setCur] = useState(null);        // { stepId, view, markIndex }
  const outroPending = useRef(false);
  /* Nummer je Schritt — vergeben in der Reihenfolge des AUFTRETENS, nicht der Skript-Reihenfolge.
     Der Unterschied ist sichtbar: DECISION_SCHEDULE stellt die Skill-Wahl VOR die ersten Stiche, im
     Skript steht „play" aber vor „skill" (weil es der Erklärbogen so will). Vorher las der Spieler
     auf dem zweiten Fenster, das er überhaupt sah, „Schritt 3/6". */
  const stepNos = useRef(new Map());

  /* Ein frisch gestartetes Tutorial fängt wieder bei null an — sonst bliebe der zweite Durchgang stumm.
     `runKey` zählt jeden Start eines geführten Laufs mit: Bei einem NEUSTART bleibt `active` durchgehend
     true, ohne diesen Schlüssel liefe die Wiederholung also ohne ein einziges Pop-up ab. */
  useEffect(() => {
    if (active) {
      seen.current = new Set();
      stepNos.current = new Map();
      outroPending.current = false;
      setCur({ stepId: "intro", view: VIEW_POPUP, markIndex: 0 });
      seen.current.add("intro");
      stepNos.current.set("intro", 1);
    } else {
      setCur(null);
    }
  }, [active, runKey]);

  // Fälligen Schritt suchen: erste Phasenart, die noch nicht dran war. Läuft NICHT, solange schon
  // etwas offen ist — sonst überschriebe eine Phase, die hinter dem Pop-up weiterläuft, den Text.
  useEffect(() => {
    if (!active || cur) return;
    const step = TUTORIAL_STEPS.find((s) => !seen.current.has(s.id) && stepMatches(s, phase, state));
    if (!step) return;
    seen.current.add(step.id);
    // Nummer erst JETZT vergeben — beim ersten Auftreten. Bedingte Phasen (Gletscher, Ziel …) tragen
    // keine: sie kommen unregelmäßig und würden den Nenner unehrlich machen (Plan §13.9d).
    if (TUTORIAL_MAIN_STEPS.some((s) => s.id === step.id) && !stepNos.current.has(step.id)) {
      stepNos.current.set(step.id, stepNos.current.size + 1);
    }
    setCur({ stepId: step.id, view: VIEW_POPUP, markIndex: 0 });
  }, [active, cur, phase, state]);

  const step = useMemo(() => {
    if (!cur) return null;
    if (cur.view === VIEW_OUTRO) return TUTORIAL_OUTRO;
    return TUTORIAL_STEPS.find((s) => s.id === cur.stepId) || null;
  }, [cur]);

  /* Weiter: Pop-up → Coach-Mark 1 → 2 → … → zu. Hat der abschließende Schritt (Architekt) seinen
     letzten Spotlight hinter sich, folgt der Abschluss-Hinweis; der setzt dann „gesehen". */
  const next = useCallback(() => {
    setCur((c) => {
      if (!c) return null;
      if (c.view === VIEW_OUTRO) { onDone && onDone(); return null; }
      const s = TUTORIAL_STEPS.find((x) => x.id === c.stepId);
      if (!s) return null;
      const marks = s.coachmarks || [];
      const nextIdx = c.view === VIEW_POPUP ? 0 : c.markIndex + 1;
      if (nextIdx < marks.length) return { stepId: c.stepId, view: VIEW_MARK, markIndex: nextIdx };
      if (s.closing && !outroPending.current) {
        outroPending.current = true;
        return { stepId: TUTORIAL_OUTRO.id, view: VIEW_OUTRO, markIndex: 0 };
      }
      return null;
    });
  }, [onDone]);

  /* „Überspringen" gilt für den laufenden Schritt — der nächste kommt trotzdem. Beendet der
     übersprungene Schritt den Bogen, wird der Abschluss-Hinweis NICHT verschluckt. */
  const skipStep = useCallback(() => {
    setCur((c) => {
      if (!c || c.view === VIEW_OUTRO) { onDone && onDone(); return null; }
      const s = TUTORIAL_STEPS.find((x) => x.id === c.stepId);
      if (s && s.closing && !outroPending.current) {
        outroPending.current = true;
        return { stepId: TUTORIAL_OUTRO.id, view: VIEW_OUTRO, markIndex: 0 };
      }
      return null;
    });
  }, [onDone]);

  /* „Tutorial beenden" — der Lauf läuft ganz normal weiter, nur ohne Erklärungen. Setzt die Flagge
     (Plan §13.8: nur dieser Weg und der Abschluss zählen als „gesehen", ein Abbruch nicht). */
  const end = useCallback(() => {
    setCur(null);
    onDone && onDone();
  }, [onDone]);

  /* Fortschritt „Schritt n/m": Nenner aus der Skriptlänge (Plan §10), Zähler aus der Reihenfolge des
     Auftretens (oben vergeben). Bedingte Phasen tragen keine Nummer. */
  const mainIndex = useMemo(() => {
    if (!cur || cur.view === VIEW_OUTRO) return 0;
    return stepNos.current.get(cur.stepId) || 0;
  }, [cur]);

  const marks = (step && step.coachmarks) || [];
  return {
    step,
    isOutro: !!cur && cur.view === VIEW_OUTRO,
    mark: cur && cur.view === VIEW_MARK ? marks[cur.markIndex] || null : null,
    // Offenes Tutorial-Fenster = der Lauf friert ein, wie bei jedem anderen Overlay (Plan §10).
    blocking: !!cur,
    stepNo: mainIndex,
    stepTotal: TUTORIAL_TOTAL,
    next, skipStep, end,
  };
}
