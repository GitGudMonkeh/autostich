// Score-Meilenstein-Balken — „oben am Battlefield" (docs §6), im NORMALEN Lauf NACH dem Onboarding sichtbar (dann
// zählen die SP-Meilensteine, isSpRun). Runde 2, R21 (Owner): jeder Meilenstein hat seine EIGENE Leiste —
// sie füllt sich 0 → 100 % bis zur aktuellen Schwelle, fällt beim Erreichen auf 0 zurück und läuft in der
// Farbe der nächsten Stufe (kühl → warm/gold) neu hoch. Bewusst grob (Balatro-Geist) — rein informativ.
import { milestoneBarState } from "../game/progression.js";
import { DECK_BORDER } from "./modalStyle.jsx"; // #: deck-getönter Rahmen wie die übrigen Panels (BuildPanel/MusicBar)
import { t } from "../i18n/index.js";

// Aufsteigende Neon-Palette (Logo-Verlauf): Farbe je erreichter Stufe 0..4 — Cyan → Grün → Blau → Violett → Gold.
const TIER = ["#26c6e6", "#4ade80", "#5a8ade", "#9b82f0", "#f2a83a"];
const TIER_HI = ["#5fe0f7", "#86efac", "#93b4f2", "#b3a8f5", "#f5c76a"];
// „10 Mio" / „10M" — die Einheit gehört in den Katalog, die Rundung hierher.
const mio = (n) => t("milestone.mio", { n: Math.round(n / 1_000_000) });

export function ScoreMilestoneBar({ score = 0 }) {
  const { reached, total, segFill, atMax, spSoFar, next } = milestoneBarState(score);
  const acc = TIER[Math.min(reached, TIER.length - 1)];
  const accHi = TIER_HI[Math.min(reached, TIER_HI.length - 1)];
  /* Runde 2, R21 (Owner): JEDER Meilenstein hat seine eigene Leiste — sie läuft 0 → 100 % bis
     zur aktuellen Schwelle, beim Erreichen tickt der Zähler (1/5), die Leiste fällt auf 0 und
     füllt sich in der Farbe der nächsten Stufe neu. Keine Viertel-Marken mehr. */
  const pct = Math.round(segFill * 100);

  // Panel-Rahmen: deck-getönt wie die übrigen Panels (as-panel-deck + DECK_BORDER) — konsistente Optik.
  //   Der Stufen-Farbverlauf (acc/accHi, Cyan→Grün→Blau→Violett→Gold) bleibt für Balken & Label (Fortschritts-Akzent).
  const frame = {
    background: "linear-gradient(180deg,#1b1a24,#141019)",
    border: `1px solid ${DECK_BORDER}`,
  };

  return (
    <div className="rounded-xl px-3 py-1.5 as-panel as-panel-deck" style={frame} data-hint-anchor="milestone"
      title={atMax ? t("milestone.title.max") : t("milestone.title.next", { at: mio(next.at), sp: next.sp })}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-meta-3 font-semibold tracking-wide" style={{ color: accHi }}>
          {spSoFar > 0 ? t("milestone.label.sp", { n: reached, total, sp: spSoFar })
                       : t("milestone.label", { n: reached, total })}
        </span>
        <span className="text-meta-1 font-semibold" style={{ color: atMax ? accHi : "#9a9aa6" }}>
          {/* Am Maximum stand hier fest verdrahtet „+5 SP" — die Meilensteintabelle summiert sich
              aber auf spSoFar (heute 6). Jetzt die echte Summe: eine Balancing-Änderung an
              SP_MILESTONES kann die Anzeige nicht mehr überholen. */}
          {atMax ? t("milestone.max", { sp: spSoFar }) : t("milestone.next", { at: mio(next.at), sp: next.sp })}
        </span>
      </div>
      {/* Balken — grob: Fill-Level ohne harte Score-Zahl; Farbe = erreichte Stufe. Die volle Breite
          gehört dem AKTUELLEN Meilenstein (R21) — Segmentmarken entfallen. */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#0e0e13" }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${acc}, ${accHi})`, boxShadow: pct > 92 ? `0 0 8px ${acc}aa` : "none" }} />
      </div>
    </div>
  );
}
