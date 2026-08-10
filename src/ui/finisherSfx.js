/* #298 Finisher-SFX-Hüllkurven (React-Hooks über den SFX-Manager audio.js). Bewusst getrennt von Battlefield/Customize,
   damit In-Game und Shop-Vorschau EXAKT dieselbe Ton-Logik teilen (kein Drift — analog „Vorschau = In-Game"). */
import { useEffect, useRef } from "react";
import { audio } from "./audio.js";

// „Schwarzes Loch": leise starten, mit jedem Sieg (Wachstum) etwas lauter, gedeckelt; beim Kollaps schnell ausklingen.
const HOLE_GAIN_BASE = 0.22; // Startpegel beim ersten Sieg (bewusst leise)
const HOLE_GAIN_STEP = 0.06; // Zuwachs je weiterem Sieg
const HOLE_GAIN_MAX  = 0.70; // Deckel (erreicht ~ ab dem 8. Sieg — passt zur visuellen Wachstums-Sättigung)

/* Persistentes „Schwarzes Loch"-Ton-Bett, an das Loch-Wachstum gekoppelt:
   - startet erst beim ERSTEN Sieg (Loch sichtbar & wächst) — vorher still,
   - schwillt mit jeder weiteren Sieg-Meldung an (bis HOLE_GAIN_MAX),
   - beim Kollaps (loss) schnell abnehmend aus,
   - beim Verschwinden (active=false, z. B. Rundenende / Vorschau zu) sanft aus.
   `active`  = Loch im Kampf aktiv (Battlefield: holeActive) bzw. Vorschau gemountet.
   `pulse`   = { id, kind: "win"|"loss" } — In-Game holePulse bzw. der synthetische Vorschau-Puls. */
export function useBlackholeSfx(active, pulse) {
  const loopRef = useRef(null);
  const growth = useRef(0);      // Anzahl aufeinanderfolgender Sieg-Pulse (= Wachstumsstufe)
  const lastId = useRef(null);   // zuletzt verarbeitete Puls-id → jeder Puls zählt genau einmal
  useEffect(() => {
    if (!active) { // Loch weg → Bett stoppen, Wachstum zurücksetzen
      if (loopRef.current) { audio.stopLoop(loopRef.current, { fade: 0.3 }); loopRef.current = null; }
      growth.current = 0; lastId.current = null;
      return;
    }
    if (!pulse || pulse.id === lastId.current) return; // nur echte, neue Pulse verarbeiten
    lastId.current = pulse.id;
    if (pulse.kind === "win") {
      growth.current += 1;
      const target = Math.min(HOLE_GAIN_MAX, HOLE_GAIN_BASE + HOLE_GAIN_STEP * growth.current);
      if (!loopRef.current) loopRef.current = audio.loop("fx_blackhole", { gain: HOLE_GAIN_BASE, bass: 5, loopStart: 2.5, loopEnd: 13.5 });
      audio.setLoopGain(loopRef.current, target); // sanft anschwellen
    } else if (pulse.kind === "loss") { // Kollaps → schnell abnehmend leiser
      // #: Der Kollaps eines GEWACHSENEN Lochs schlägt hörbar mit einem tiefen Bass-Impact ein — aber nur, wenn das Loch
      // überhaupt entzündet war (mind. 1 Sieg lief; growth > 0). So teilt sich der Kollaps-Bass zwischen In-Game und
      // Shop-Vorschau (kein Drift) und feuert NICHT bei aufeinanderfolgenden Niederlagen ohne laufende Serie.
      if (growth.current > 0) audio.play("fx_bass", { gain: 1.0, bass: 4 }); // #: deutlich leiser (war 1.9/7 — war viel zu laut vs. den anderen Sounds)
      if (loopRef.current) { audio.stopLoop(loopRef.current, { fade: 0.22 }); loopRef.current = null; }
      growth.current = 0;
    }
  }, [active, pulse]);
  // Unmount → Bett sicher stoppen (kein weiterlaufender Loop nach Verlassen von Battlefield/Vorschau).
  useEffect(() => () => { if (loopRef.current) { audio.stopLoop(loopRef.current, { fade: 0.05 }); loopRef.current = null; } }, []);
}
