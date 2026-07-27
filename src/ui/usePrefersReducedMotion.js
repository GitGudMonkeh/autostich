import { useState, useEffect } from "react";

/* Respektiert die OS-Einstellung „reduzierte Bewegung" (#15/#19). Geteilte Quelle (#159) — vorher
   wortgleich in Battlefield.jsx und CrtParticles.jsx dupliziert. SSR-sicher (kein window im Init). */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}
