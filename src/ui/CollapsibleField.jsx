import { useState } from "react";

/* #UI: Einheitliches ein-/ausklappbares Feld (Kopf mit Titel + optionaler Meta-Anzeige rechts + Chevron, Body
   ein-/ausklappbar). Geteilt von Perk-Auswahl & Chronik, damit die sekundären Infos überall gleich aussehen.

   #held-merken: Das Feld kann GESTEUERT werden (`open` + `onToggle`) statt seinen Zustand selbst zu halten.
   Gebraucht wird das von Aufrufern, die ihn ÜBERLEBEN lassen müssen: die Level-up-Karte wird je Phase neu
   gemountet, ein interner `useState` stünde also bei jeder Wahl wieder auf Default (dieselbe Begründung wie
   bei `lvPassive`). Es ist bewusst ein SCHALTER an derselben Komponente und keine zweite Fassung — ohne die
   zwei Props bleibt alles, wie es war (Chronik, „Deck-Stärke", „Dein Build"). */
export function CollapsibleField({ title, meta = null, defaultOpen = true, open: openProp = null, onToggle = null, className = "mt-3", children }) {
  const [innen, setInnen] = useState(defaultOpen);
  const gesteuert = openProp != null && !!onToggle;
  const open = gesteuert ? !!openProp : innen;
  const um = () => (gesteuert ? onToggle(!open) : setInnen((o) => !o));
  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ border: "1px solid #2a2a33" }}>
      <button type="button" onClick={um} aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left" style={{ background: "#161620" }}>
        <span className="text-meta-3 uppercase tracking-wide font-bold opacity-60">{title}</span>
        <span className="flex items-center gap-2 shrink-0">{meta}
          <span className="text-meta-1 opacity-50 transition-transform" style={{ display: "inline-block", transform: open ? "none" : "rotate(-90deg)" }}>▾</span>
        </span>
      </button>
      {open && <div className="px-3 py-3" style={{ borderTop: "1px solid #2a2a33" }}>{children}</div>}
    </div>
  );
}
