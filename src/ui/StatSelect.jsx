import { STAT_DEFS, STAT_IDS } from "../game/stats.js";
import { CRIT_BASE_MULT } from "../game/constants.js";
import { totalCritChanceRaw } from "../game/perks.js";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";

const ACCENT = "#5a8ade"; // Stat-Akzent (blau) — abgesetzt von Perk (violett) / Skill (blitzblau)

// Aktueller akkumulierter Stand eines Stats — lesbar formatiert.
function currentLabel(id, state) {
  const v = state[STAT_DEFS[id].field] || 0;
  switch (id) {
    // #181: GESAMT-Crit-Chance (Stat + Blitz + Perk), nicht nur der Stat-Anteil — dieselbe ungeklemmte Quelle
    // wie StatusRail, damit die 100-%-Schwelle (L6 / Familie D „Überschusskrit") an der Entscheidung sichtbar ist.
    case "critChance": return `${Math.round(Math.max(0, totalCritChanceRaw(state)) * 100)} % Crit-Chance (gesamt)`;
    case "critMult":   return `×${(CRIT_BASE_MULT + v).toFixed(2).replace(".", ",")} Crit-Faktor`;
    case "formMult":   return `+${Math.round(v * 100)} % bei aktiver Formation`;
    case "streakMult": return `+${(v * 100).toFixed(1).replace(".", ",")} % je Serienpunkt`;
    default: return "";
  }
}

/* Stat-Auswahl (V2 §22.2/§22.3): pausiert den Run, bietet die vier Kern-Stats (das Einkommen ist seit dem
   Architekt-Umbau #202 nicht mehr im Angebot); genau einer wird gewählt. Additiv, stapelbar, ohne Obergrenze. */
export function StatSelect({ offer = STAT_IDS, onPick, state = {} }) {
  const isStart = (state.trickNo || 0) === 0;
  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl">
        <div className="relative w-full rounded-2xl p-6 max-h-[92dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
          <GlossaryPanel className="absolute top-3 right-3 z-10" />
          <div className="text-center mb-1">
            <div className="text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
              {isStart ? "Start" : `Durchlauf ${(state.cycle || 0) + 1}`}
            </div>
            <h2 className="text-xl font-bold mt-1">Wähle einen Stat</h2>
            <p className="text-xs opacity-45 mt-1">Dauerhaft · stapelbar · ohne Obergrenze</p>
            {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} /></div>}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            {offer.map((id) => {
              const d = STAT_DEFS[id];
              return (
                <button
                  key={id}
                  onClick={() => onPick(id)}
                  className="text-left rounded-xl p-4 h-full flex flex-col gap-2 transition-all hover:-translate-y-0.5"
                  style={{ background: "#20202a", border: `1px solid ${ACCENT}55` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{d.label}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap"
                      style={{ background: `${ACCENT}22`, color: ACCENT }}>{d.blurb}</span>
                  </div>
                  <p className="text-xs opacity-70 leading-snug"><GlossaryText text={d.desc} /></p>
                  <div className="text-[11px] opacity-50 mt-auto pt-1">Aktuell: {currentLabel(id, state)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
