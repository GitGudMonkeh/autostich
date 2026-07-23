import { PERK_DEFS, CATEGORIES, rarityOf, RARITY_META, critChanceFor, hasCritPerk, tempoScoreMultFor, baseScoreMultFor } from "../game/perks.js";
import { PerkList, DeckHistogram } from "./BuildSummary.jsx";

// Legendär-Akzent: durchgehend gold (Rahmen, Ring, Badge, Titel) — Teil des Grau/Grün/Gold-Schemas (#71).
const LEG_GOLD = "#d4a63a";
const fmtMult = (x) => x.toFixed(2).replace(".", ",");

/* Level-Up-Auswahl (§7.8): pausiert das Spiel, bietet PERKS_OFFERED Optionen.
   Zeigt zusätzlich den Build-Kontext (aktive Perks + Deck-Histogramm, #22) und die Kern-Stats (#40). */
export function PerkSelect({ offer, level, onPick, perks = [], deck = [], state = {} }) {
  // Kern-Stats — dieselben Helfer/Kontexte wie die StatusRail → kein Drift (#40).
  const { life, maxLife, shield = 0, winStreak = 0, wins = 0, trickNo = 0, pos = 0, speedPct = 0, tempTempo = 0, legendaryCritBonus = 0, crits = 0 } = state;
  // Effektives Tempo inkl. temporärem Tempo (E9/E10, #83) für Tempo-Score & Score-Mult; Crit bleibt permanent (E6).
  const effTempo = speedPct + tempTempo;
  const critPct = Math.round(critChanceFor(perks, { winValue: 0, winStreak: winStreak + 1, wins: wins + 1, trickNo, posInCycle: pos, speedPct }, legendaryCritBonus) * 100);
  const tempoScoreMult = tempoScoreMultFor(perks, effTempo);
  const scoreMult = baseScoreMultFor(perks, { winStreak, wins, trickNo, pos, speedPct: effTempo });
  const showCrit = hasCritPerk(perks) || crits > 0;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Level {level} erreicht</div>
          <h2 className="text-xl font-bold mt-1">Wähle einen Perk</h2>
        </div>

        {/* Kern-Stats (#40): dezent, damit die Perk-Auswahl die primäre Aktion bleibt. */}
        {maxLife != null && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mt-3">
            <span><span className="opacity-50">Leben </span><span style={{ color: "#5ab87a" }}>{life} / {maxLife}</span>{shield > 0 && <span style={{ color: "#5a8ade" }}> · 🛡 {shield}</span>}</span>
            {showCrit && <span><span className="opacity-50">Crit </span><span style={{ color: "#e879f9" }}>{critPct}%</span></span>}
            <span><span className="opacity-50">Tempo </span><span style={{ color: "#5a8ade" }}>+{effTempo}%</span></span>
            <span><span className="opacity-50">Tempo-Score </span><span style={{ color: "#d4a63a" }}>×{fmtMult(tempoScoreMult)}</span></span>
            <span><span className="opacity-50">Score-Mult </span><span style={{ color: "#d4a63a" }}>×{fmtMult(scoreMult)}</span></span>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          {offer.map((id) => {
            const p = PERK_DEFS[id];
            const cat = CATEGORIES[p.cat];
            const rar = rarityOf(id);
            const rm = RARITY_META[rar];
            const leg = rar === "legendary";
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className="text-left rounded-xl p-4 h-full flex flex-col gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: "#20202a",
                         // Rahmen = Seltenheit: grau (normal) / grün (selten) / gold (legendär).
                         border: `1px solid ${rm.color}${rar === "common" ? "55" : ""}`,
                         boxShadow: leg ? `0 0 0 1px ${LEG_GOLD}66, 0 0 16px ${LEG_GOLD}33`
                                  : rar === "rare" ? `0 0 12px ${rm.color}22` : undefined }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: `${cat.color}22`, color: cat.color }}>
                    {cat.name}
                  </span>
                  {rm.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                      style={{ background: `${rm.color}1f`, color: rm.color, border: `1px solid ${rm.color}88` }}>
                      {rm.badge}
                    </span>
                  )}
                </div>
                <div className="font-bold" style={{ color: leg ? LEG_GOLD : cat.color }}>{p.label}</div>
                <div className="text-sm opacity-75 leading-snug">{p.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-xs opacity-40 mt-3">
          Jeder Perk ist pro Lauf nur einmal wählbar.
        </div>

        {/* Build-Kontext (#22) — sekundär, hilft bei der gezielten Wahl (Synergien, Lücken). */}
        <div className="mt-5 pt-4 border-t grid sm:grid-cols-2 gap-4" style={{ borderColor: "#2a2a33" }}>
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              Dein Build — {perks.length} Perk{perks.length === 1 ? "" : "s"}
            </div>
            <PerkList perks={perks} empty="Noch keine Perks gewählt." />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Deck-Werte je Farbe</div>
            <DeckHistogram deck={deck} />
          </div>
        </div>
      </div>
    </div>
  );
}
