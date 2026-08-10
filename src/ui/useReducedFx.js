import { useState, useEffect } from "react";

/* #200 Teil B — löst die Option „Effekte reduziert" (reducedFx: "auto" | "an" | "aus") in EINEN `reduced`-Boolean auf,
   den Battlefield für alle teuren Layer nutzt (Schnitt-/Explosions-Ghosts, Krit-Flash/Vignette, Screen-Shake, Puls-
   Glows, drop-shadow). Ersetzt das reine usePrefersReducedMotion in Battlefield — dieselbe Semantik, nur zusätzlich
   per Option + Mobile auslösbar.

   - „an"   → immer reduziert (manueller Override).
   - „aus"  → nur reduziert, wenn das System „reduzierte Bewegung" verlangt (Barrierefreiheit bleibt IMMER gewahrt).
   - „auto" → reduziert auf Mobile (grober Zeiger, `pointer: coarse`) ODER bei System-reduzierter-Bewegung. (Default)

   prefers-reduced-motion greift damit in JEDEM Modus → nie ein Rückschritt gegenüber dem alten Verhalten. SSR-sicher
   (kein window im Init). Eine optionale FPS-Messung als weiterer Auto-Trigger ist bewusst später (#200 nennt sie „optional"). */
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

export function useReducedFx(option = "auto") {
  const prefersReduced = useMediaMatch("(prefers-reduced-motion: reduce)");
  const coarsePointer  = useMediaMatch("(pointer: coarse)");
  if (option === "an")  return true;
  if (option === "aus") return prefersReduced;          // Override — OS-Bewegungswunsch bleibt trotzdem bindend
  return prefersReduced || coarsePointer;                // „auto": Mobile ODER reduzierte Bewegung
}

/* Dreistufige Auflösung — der Mittelweg zwischen „voll" und „tot". Trennt zwei Dinge, die vorher in EINEN
   Boolean geworfen wurden und deshalb zusammen abgeschaltet wurden:
     • „full"     → alles an.
     • „balanced" → der BILLIGE Feel-Good-Layer bleibt an (3D-Kartenflip, Ambient-Hintergrund, Glows, Slice,
                    Finisher), nur die TEUREN Dauer-/Schwarm-Layer fallen weg (Screen-Shake, Partikel-Fontänen,
                    Overlay-Blur, Rahmen-/Titel-Sweep). Fühlt sich lebendig an, ruckelt aber nicht.
     • „minimal"  → wie der alte reduced=true: auch der Feel-Good-Layer aus (max. Entlastung / Barrierefreiheit).
   Optionen: „an"→minimal, „aus"→full (OS-Wunsch bleibt bindend), „ausgewogen"→balanced, „auto"→Mobile:balanced,
   Desktop:full. prefers-reduced-motion erzwingt IMMER minimal (nie ein Rückschritt für Barrierefreiheit). */
export function useFxLevel(option = "auto") {
  const prefersReduced = useMediaMatch("(prefers-reduced-motion: reduce)");
  const coarsePointer  = useMediaMatch("(pointer: coarse)");
  if (prefersReduced) return "minimal";                  // Barrierefreiheit hat immer Vorrang
  if (option === "an")         return "minimal";
  if (option === "ausgewogen") return "balanced";
  if (option === "aus")        return "full";            // Override: volle Effekte auch auf Mobile
  return coarsePointer ? "balanced" : "full";            // „auto": Handy → ausgewogen, Desktop → voll
}
