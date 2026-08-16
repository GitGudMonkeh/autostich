import { useState, useEffect } from "react";

/* #200/#363 Teil B — löst die Option „Effekte reduziert" (reducedFx: "aus" | "mobile" | "an") in EINEN `reduced`-Boolean
   auf, den Battlefield für alle teuren Layer nutzt (Schnitt-/Explosions-Ghosts, Krit-Flash/Vignette, Screen-Shake, Puls-
   Glows, drop-shadow). Ersetzt das reine usePrefersReducedMotion in Battlefield — dieselbe Semantik, nur zusätzlich
   per Option auslösbar.

   - „an"     → immer reduziert (manueller Override, max. ruhig).
   - „mobile" → reduziert (ausgewogen; teure Dauer-/Schwarm-Layer weg).
   - „aus"    → nur reduziert, wenn das System „reduzierte Bewegung" verlangt (Barrierefreiheit bleibt IMMER gewahrt).

   #363: Der frühere dynamische „auto"-Zustand entfällt — die Geräteabhängigkeit steckt jetzt im gespeicherten Default
   (Handy → „mobile", Desktop → „aus", gesetzt in storage.loadOptions). prefers-reduced-motion greift weiterhin in JEDEM
   Modus → nie ein Rückschritt. SSR-sicher (kein window im Init). */
const mq = (q) => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q) : null);

function useMediaMatch(query) {
  const [match, setMatch] = useState(() => mq(query)?.matches ?? false);
  useEffect(() => {
    const m = mq(query);
    if (!m) return;
    const on = () => setMatch(m.matches);
    on(); // Erst-Sync (falls sich der Match zwischen Init und Mount geändert hat)
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, [query]);
  return match;
}

export function useReducedFx(option = "aus") {
  const prefersReduced = useMediaMatch("(prefers-reduced-motion: reduce)");
  if (option === "an" || option === "mobile") return true; // beide schneiden die teuren Layer weg
  return prefersReduced;                                    // „aus" (Default): nur OS-Bewegungswunsch bindet
}

/* Dreistufige Auflösung — der Mittelweg zwischen „voll" und „tot". Trennt zwei Dinge, die vorher in EINEN
   Boolean geworfen wurden und deshalb zusammen abgeschaltet wurden:
     • „full"     → alles an.
     • „balanced" → der BILLIGE Feel-Good-Layer bleibt an (3D-Kartenflip, Ambient-Hintergrund, Glows, Slice,
                    Finisher), nur die TEUREN Dauer-/Schwarm-Layer fallen weg (Screen-Shake, Partikel-Fontänen,
                    Overlay-Blur, Rahmen-/Titel-Sweep). Fühlt sich lebendig an, ruckelt aber nicht.
     • „minimal"  → wie der alte reduced=true: auch der Feel-Good-Layer aus (max. Entlastung / Barrierefreiheit).
   #363 Zustände: „an"→minimal, „mobile"→balanced, „aus"→full (OS-Wunsch bleibt bindend). Kein dynamischer „auto"-
   Zweig mehr — die Geräteabhängigkeit liegt jetzt im gespeicherten Default (storage.loadOptions). prefers-reduced-
   motion erzwingt IMMER minimal (nie ein Rückschritt für Barrierefreiheit). */
export function useFxLevel(option = "aus") {
  const prefersReduced = useMediaMatch("(prefers-reduced-motion: reduce)");
  if (prefersReduced) return "minimal";                  // Barrierefreiheit hat immer Vorrang
  if (option === "an")     return "minimal";
  if (option === "mobile") return "balanced";
  return "full";                                         // „aus" (Default): volle Effekte
}
