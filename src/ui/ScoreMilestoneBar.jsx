// Score-Meilenstein-Balken — „oben am Battlefield" (docs §6), im NORMALEN Lauf NACH dem Onboarding sichtbar (dann
// zählen die SP-Meilensteine, isSpRun). Füllt sich mit dem AKTUELLEN Lauf-Score über vier gleich breite Segmente
// (25/50/75/100 Mio) und WECHSELT AN JEDEM MEILENSTEIN DIE FARBE (kühl → warm/gold). Nicht-lineare Skalierung:
// jeder Meilenstein = ein Viertel der Leiste. Bewusst grob (Balatro-Geist) — rein informativ, keine Engine-Kopplung.
import { milestoneBarState } from "../game/progression.js";
import { DECK_BORDER } from "./modalStyle.jsx"; // #: deck-getönter Rahmen wie die übrigen Panels (BuildPanel/MusicBar)

// Aufsteigende Neon-Palette (Logo-Verlauf): Farbe je erreichter Stufe 0..4 — Cyan → Grün → Blau → Violett → Gold.
const TIER = ["#26c6e6", "#4ade80", "#5a8ade", "#9b82f0", "#f2a83a"];
const TIER_HI = ["#5fe0f7", "#86efac", "#93b4f2", "#b3a8f5", "#f5c76a"];
const mio = (n) => `${Math.round(n / 1_000_000)} Mio`;

export function ScoreMilestoneBar({ score = 0 }) {
  const { reached, total, fill, atMax, spSoFar, next } = milestoneBarState(score);
  const acc = TIER[Math.min(reached, TIER.length - 1)];
  const accHi = TIER_HI[Math.min(reached, TIER_HI.length - 1)];
  const pct = Math.round(fill * 100);

  // Panel-Rahmen: deck-getönt wie die übrigen Panels (as-panel-deck + DECK_BORDER) — konsistente Optik.
  //   Der Stufen-Farbverlauf (acc/accHi, Cyan→Grün→Blau→Violett→Gold) bleibt für Balken & Label (Fortschritts-Akzent).
  const frame = {
    background: "linear-gradient(180deg,#1b1a24,#141019)",
    border: `1px solid ${DECK_BORDER}`,
  };

  return (
    <div className="rounded-xl px-3 py-1.5 as-panel as-panel-deck" style={frame}
      title={atMax ? "Alle Score-Meilensteine erreicht" : `Nächster Meilenstein: ${mio(next.at)} (+${next.sp} SP)`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: accHi }}>
          💠 Meilensteine {reached}/{total}{spSoFar > 0 ? ` · +${spSoFar} SP` : ""}
        </span>
        <span className="text-[10px] font-semibold" style={{ color: atMax ? accHi : "#9a9aa6" }}>
          {atMax ? "Maximum · +5 SP" : `→ ${mio(next.at)} +${next.sp}`}
        </span>
      </div>
      {/* Balken — grob: Fill-Level ohne harte Score-Zahl; Farbe = erreichte Stufe. Meilenstein-Marken an den Vierteln. */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#0e0e13" }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${acc}, ${accHi})`, boxShadow: pct > 92 ? `0 0 8px ${acc}aa` : "none" }} />
        {/* Segmentgrenzen (25/50/75 %) als dünne dunkle Marken — visualisieren die vier Meilenstein-Viertel. */}
        {Array.from({ length: total - 1 }, (_, i) => (
          <i key={i} className="absolute inset-y-0" style={{ left: `${(i + 1) / total * 100}%`, width: 1.5, background: "#0e0e13" }} />
        ))}
      </div>
    </div>
  );
}
