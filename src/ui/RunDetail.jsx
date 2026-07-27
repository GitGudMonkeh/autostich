import { useEscape } from "./useEscape.js";
import { RunStats } from "./RunStats.jsx";
import { fmtScore } from "./format.js";

/* #169 FB-8: Detailansicht eines Bestenlisten-Eintrags (lokal ODER global) — Overlay über der Liste, zeigt
   denselben Statblock wie der eigene Victory-Screen (RunStats). Escape/Klick-außen schließt. `entry` ist bereits
   normalisiert (perks/skills als ID-Arrays; global-Strings dekodieren die Aufrufer). Alt-/pre-Migration-Einträge
   liefern nur einen Teil der Felder → RunStats zeigt „–" bzw. blendet leere Blöcke aus. */
export function RunDetail({ entry, rank = null, onClose }) {
  useEscape(onClose);
  if (!entry) return null;
  const name = entry.name;
  const score = typeof entry.score === "number" ? entry.score : 0;
  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10dd", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Lauf-Details{rank != null ? ` · #${rank}` : ""}</div>
            {name && <div className="text-lg font-bold mt-0.5 truncate">{name}</div>}
          </div>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>
        <div className="text-center my-3">
          <div className="text-4xl font-bold" style={{ color: "#d4a63a" }}>{fmtScore(score)}</div>
          <div className="text-xs opacity-50 mt-0.5">Score</div>
        </div>
        <RunStats entry={entry} />
      </div>
    </div>
  );
}
