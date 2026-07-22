import { useEffect } from "react";

/* #58: Escape schließt ein abweisbares Overlay — gemeinsam genutzt, damit Username/Optionen/
   Anleitung einheitlich per Backdrop-Klick UND Escape schließen. (GameOver/PerkSelect/
   PredictionSelect nutzen ihn bewusst NICHT — dort ist eine Auswahl erforderlich.) */
export function useEscape(onClose) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}
