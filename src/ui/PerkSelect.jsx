import { PERK_DEFS, CATEGORIES, isLegendary } from "../game/perks.js";
import { PerkList, DeckHistogram } from "./BuildSummary.jsx";

// Legendär-Akzent: gold + violett, deutlich vom Kategorie-Look abgesetzt (#33).
const LEG_GOLD = "#d4a63a";
const LEG_VIOLET = "#8a7de0";

/* Level-Up-Auswahl (§7.8): pausiert das Spiel, bietet PERKS_OFFERED Optionen.
   Zeigt zusätzlich den Build-Kontext (aktive Perks + Deck-Histogramm) für gezielte Wahl (#22). */
export function PerkSelect({ offer, level, onPick, perks = [], deck = [] }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Level {level} erreicht</div>
          <h2 className="text-xl font-bold mt-1">Wähle einen Perk</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          {offer.map((id) => {
            const p = PERK_DEFS[id];
            const cat = CATEGORIES[p.cat];
            const leg = isLegendary(id);
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className="text-left rounded-xl p-4 h-full flex flex-col gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: "#20202a",
                         border: leg ? `1px solid ${LEG_GOLD}` : `1px solid ${cat.color}55`,
                         boxShadow: leg ? `0 0 0 1px ${LEG_VIOLET}66, 0 0 16px ${LEG_GOLD}33` : undefined }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: `${cat.color}22`, color: cat.color }}>
                    {cat.name}
                  </span>
                  {leg && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                      style={{ background: `${LEG_GOLD}1f`, color: LEG_GOLD, border: `1px solid ${LEG_VIOLET}88` }}>
                      ★ LEGENDÄR
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
