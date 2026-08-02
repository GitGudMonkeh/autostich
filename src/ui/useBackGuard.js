import { useEffect, useRef } from "react";

/* #254: Zentrale Behandlung der Browser-/Hardware-/Swipe-Zurück-Geste als IN-APP-„Zurück" (mobil).
   Ohne diesen Guard verlässt der Zurück-Swipe die SPA. Wir legen EINEN Sentinel-History-Eintrag an;
   jede Zurück-Geste konsumiert ihn und löst `onBack()` aus:
     - gibt onBack `true` zurück (Geste „verbraucht" — Overlay geschlossen / Rückfrage geöffnet),
       legen wir den Sentinel neu an, damit die NÄCHSTE Zurück-Geste ebenfalls abgefangen wird.
     - gibt onBack `false` zurück (nichts abzufangen — z. B. Menü), lassen wir die Navigation laufen.
   onBack wird per Ref gelesen → der Listener + Sentinel werden nur EINMAL beim Mount gesetzt (kein
   Sentinel-Spam bei jedem Render / State-Wechsel). */
export function useBackGuard(onBack) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (typeof window === "undefined" || !window.history || !window.history.pushState) return;
    window.history.pushState({ asBackTrap: true }, "");
    const handler = () => {
      const handled = ref.current ? ref.current() : false;
      if (handled) window.history.pushState({ asBackTrap: true }, "");
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
}
