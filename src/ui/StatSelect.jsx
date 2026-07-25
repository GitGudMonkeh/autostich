import { STAT_DEFS, STAT_IDS } from "../game/stats.js";
import { CRIT_BASE_MULT, SHOP_INCOME_PER_LEVEL } from "../game/constants.js";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { PanelMascot } from "./PanelMascot.jsx";
import statMascot from "../assets/mascots/stat.gif";

const ACCENT = "#5a8ade"; // Stat-Akzent (blau) — abgesetzt von Perk (violett) / Skill (blitzblau)

// Aktueller akkumulierter Stand eines Stats — lesbar formatiert.
function currentLabel(id, state) {
  const v = state[STAT_DEFS[id].field] || 0;
  switch (id) {
    case "critChance": return `${Math.round(v * 100)} % Crit-Chance`;
    case "critMult":   return `×${(CRIT_BASE_MULT + v).toFixed(2).replace(".", ",")} Crit-Faktor`;
    case "formMult":   return `+${Math.round(v * 100)} % bei aktiver Formation`;
    case "streakMult": return `+${(v * 100).toFixed(1).replace(".", ",")} % je Serienpunkt`;
    case "economy":    return `+${v * SHOP_INCOME_PER_LEVEL} Münzen pro Shop`;
    default: return "";
  }
}

/* Stat-Auswahl (V2 §22.2/§22.3): pausiert den Run, bietet IMMER alle Stats (Shop-Spec §4.3: fünf inkl.
   Einkommen); genau einer wird gewählt. Additiv, stapelbar, ohne Obergrenze.
   #130: Muskeltyp-Maskottchen (Desktop-Peek über der Karte, Mobil-Avatar an der Überschrift). */
export function StatSelect({ offer = STAT_IDS, onPick, state = {} }) {
  const isStart = (state.trickNo || 0) === 0;
  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center sm:items-start justify-center p-4 sm:pt-28" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      {/* #130: nicht scrollender Wrapper → das Maskottchen schaut oben über die Karte hervor (Desktop-Peek). Panel
          ist auf Desktop oben angedockt (sm:items-start + sm:pt-28), damit der Peek nie vom Viewport geklippt wird;
          die Karte bekommt entsprechend sm:max-h, sodass sie inkl. Peek-Kopfraum in den Viewport passt. */}
      <div className="relative w-full max-w-3xl">
        <PanelMascot src={statMascot} accent={ACCENT} peekMaxH={120} overlap={28} />
        <div className="relative z-10 w-full rounded-2xl p-6 max-h-[92dvh] sm:max-h-[calc(100dvh-8rem)] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
          <div className="text-center mb-1">
            <div className="text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
              {isStart ? "Start" : `Runde ${(state.cycle || 0) + 1}`}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <PanelMascot src={statMascot} accent={ACCENT} variant="avatar" avatarObjectPosition="center top" />
              <h2 className="text-xl font-bold">Wähle einen Stat</h2>
            </div>
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
                  <p className="text-xs opacity-70 leading-snug">{d.desc}</p>
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
