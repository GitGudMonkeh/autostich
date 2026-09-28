import { useEffect } from "react";
import { perfMark } from "./perfRecorder.js";

/* Perf-Recorder: Spiel-Events markieren, damit Frame-Ruckler dem zugeordnet werden, WAS gerade passiert
   (perfMark ist außerhalb des Preview-Builds ein billiger No-op). Deck-Wechsel, laufender Stich-Takt,
   Overlays (Blur-Verdacht), Phasen/Durchläufe. Moved out of AutostichGame on 2026-09-28, effects verbatim. */
export function usePerfMarks({ phase, trickNo, cycle, deckFront, deckBack, showOptions, showChronik, glossaryOpen }) {
  useEffect(() => { perfMark("phase:" + phase, { phase }); }, [phase]);
  useEffect(() => { if (trickNo) perfMark("trick", { trick: trickNo }); }, [trickNo]);
  useEffect(() => { perfMark("cycle", { cycle }); }, [cycle]);
  useEffect(() => { perfMark("deck-switch"); }, [deckFront, deckBack]);
  useEffect(() => { if (showOptions) perfMark("overlay:options"); }, [showOptions]);
  useEffect(() => { if (showChronik) perfMark("overlay:chronik"); }, [showChronik]);
  useEffect(() => { if (glossaryOpen) perfMark("overlay:glossar"); }, [glossaryOpen]);
}
