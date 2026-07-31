// Meisterrang — Fortschrittsbalken „oben am Battlefield" (#217), NUR in Meister-Läufen sichtbar. Füllt sich mit dem
// AKTUELLEN Lauf-Score bis zur Schwelle des NÄCHSTEN Rangs. Bewusst GROB: nur Füllung + Rang-Label, KEINE harte Zahl
// (Balatro-Geist). Bei Höchstrang (V) auf „Höchster Rang" (Großmeister-Aufsatz #226 setzt hier später sein Ziel).
// Rein informativ — liest Score + Max-Rang, keine Engine-Kopplung.
import { masteryProgress, masteryGradeLabel, MASTERY_MAX_GRADE, MASTERY_ROMAN } from "../game/mastery.js";

const ACCENT = "#8a7de0"; // Master-Lila (konsistent mit dem Stats-Hub-Master-Reiter)
const ACCENT_HI = "#b3a8f5";

export function MasteryBar({ grade = 0, score = 0 }) {
  const g = Math.max(0, Math.min(MASTERY_MAX_GRADE, grade | 0));
  const atMax = g >= MASTERY_MAX_GRADE;
  const pct = Math.round(masteryProgress(g, score) * 100);
  const nextLabel = atMax ? null : `Rang ${MASTERY_ROMAN[g + 1]}`;

  return (
    <div className="rounded-xl px-3 py-2 as-panel" style={{ background: "#17171c", border: `1px solid ${ACCENT}44` }}
      title={atMax ? "Höchster Rang erreicht" : `Fortschritt zum nächsten Rang (${nextLabel})`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-pixel tracking-wide" style={{ color: ACCENT_HI }}>
          {masteryGradeLabel(g)}
        </span>
        <span className="text-[10px] font-semibold" style={{ color: atMax ? ACCENT_HI : "#9a9aa6" }}>
          {atMax ? "Höchster Rang" : `→ ${nextLabel}`}
        </span>
      </div>
      {/* Balken — grob: Fill-Level ohne Zahlen. Bei Höchstrang voll & ruhig. */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#0e0e13" }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{
            width: `${atMax ? 100 : pct}%`,
            background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_HI})`,
            boxShadow: atMax || pct > 92 ? `0 0 8px ${ACCENT}aa` : "none",
          }} />
      </div>
    </div>
  );
}
