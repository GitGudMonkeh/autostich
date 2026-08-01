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
