import { useState, useEffect } from "react";
import { fmtDuration } from "../game/deck.js";

/* #perf A1: Der Lauf-Timer tickte früher über einen `setClock`-State an der App-Wurzel (setInterval 250 ms) — das
   re-renderte bei JEDEM Tick den GESAMTEN App-Baum inkl. Battlefield (4×/s), nur um die Zeit-Anzeige zu aktualisieren.
   Jetzt hält diese kleine Leaf-Komponente ihr eigenes Intervall + State: nur DIESER Textknoten rendert alle 250 ms neu,
   der Rest des Baums bleibt ruhig. Identisches Verhalten/Optik (Desktop unverändert), nur ohne die globale Tick-Last.

   `getElapsed` liest die (stabilen) Timer-Refs der App live aus; `ticking` spiegelt „Lauf aktiv UND Tab sichtbar"
   (im Hintergrund/Pause kein Tick → Akku/Hitze). Bei `!ticking` wird der zuletzt berechnete Wert eingefroren gezeigt. */
export function RunTimer({ getElapsed, ticking = false, paused = false }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!ticking) return undefined;
    const id = setInterval(() => force((n) => (n + 1) % 1e9), 250);
    return () => clearInterval(id);
  }, [ticking]);
  return <span>{fmtDuration(getElapsed())}{paused ? " ⏸" : ""}</span>;
}
