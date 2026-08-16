import { useState } from "react";

/* #UI: Einheitliches ein-/ausklappbares Feld (Kopf mit Titel + optionaler Meta-Anzeige rechts + Chevron, Body
   ein-/ausklappbar). Geteilt von Perk-Auswahl & Chronik, damit die sekundären Infos überall gleich aussehen. */
export function CollapsibleField({ title, meta = null, defaultOpen = true, className = "mt-3", children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ border: "1px solid #2a2a33" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left" style={{ background: "#161620" }}>
        <span className="text-[11px] uppercase tracking-wide font-bold opacity-60">{title}</span>
        <span className="flex items-center gap-2 shrink-0">{meta}
          <span className="text-[10px] opacity-50 transition-transform" style={{ display: "inline-block", transform: open ? "none" : "rotate(-90deg)" }}>▾</span>
        </span>
      </button>
      {open && <div className="px-3 py-3" style={{ borderTop: "1px solid #2a2a33" }}>{children}</div>}
    </div>
  );
}
