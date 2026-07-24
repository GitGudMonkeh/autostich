import { coinsPerCycle } from "../game/shop.js";
import { useEscape } from "./useEscape.js";

const GOLD = "#d4a63a"; // Shop-/Münz-Akzent (wie der Score-Gold-Ton)

/* Shop-Screen (Shop-Spec §12.1). Phase S0: Rhythmus + Münzökonomie stehen, das Angebot (2 Items je
   Kategorie) folgt in S1. Zeigt daher prominent den Münzstand + Einkommen und einen Platzhalter für
   die vier Kategorien; „Shop verlassen" bestätigt die Runde und startet den zugehörigen Durchlauf. */
export function ShopScreen({ state = {}, onLeave }) {
  useEscape(onLeave);
  const coins = state.shop?.coins ?? 0;
  const income = coinsPerCycle(state.economyStatLevel);
  const round = (state.cycle || 0) + 1;
  const CATEGORIES = [
    { code: "cards", label: "Karten" },
    { code: "anchors", label: "Anker" },
    { code: "formations", label: "Formationen" },
    { code: "planning", label: "Planung" },
  ];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto" style={{ background: "#181820", border: `1px solid ${GOLD}55` }}>
        {/* Kopf: Runde + Münzstand prominent */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>Runde {round}</div>
            <h2 className="text-xl font-bold mt-1">Shop</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Münzen</div>
            <div className="text-2xl font-bold font-pixel-dense" style={{ color: GOLD }}>🪙 {coins}</div>
            <div className="text-[11px] opacity-50">Einkommen: +{income} / Durchlauf</div>
          </div>
        </div>

        {/* Kategorien-Platzhalter (S0) — Angebot folgt in S1 */}
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          {CATEGORIES.map((c) => (
            <div key={c.code} className="rounded-xl p-4" style={{ background: "#20202a", border: "1px solid #33333e" }}>
              <div className="text-sm font-bold mb-2">{c.label}</div>
              <div className="text-xs opacity-40 italic">Angebot folgt (Phase S1)</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onLeave}
            className="rounded-xl px-5 py-2.5 font-bold transition-all hover:brightness-110"
            style={{ background: GOLD, color: "#141419" }}
          >
            Shop verlassen
          </button>
        </div>
      </div>
    </div>
  );
}
