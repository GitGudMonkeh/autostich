import { suitColor, suitName, SUIT_ORDER } from "../game/constants.js";
import { familyDef } from "../game/families.js";
import { tierMeta, romanOf } from "../game/rarity.js";
import { CATEGORIES } from "../game/perks.js";
import { DeckHistogram } from "./BuildSummary.jsx";

/* Familien-Ziel-Auswahl (Rarität #167, Spec §2.3/§2.4) — öffnet nach dem Pick einer Stufe mit `pickTarget`
   (Kat. A: A_SUIT_BOOST III/IV = 1 Farbe, A_SUIT_DUEL III/IV = 1 bzw. 2 Farben, Reihenfolge Gewinner→Verlierer).
   Wähle die geforderten Farben, dann bestätigen; erst dann wendet der Reducer applyFamilyPick mit dem Ziel an.
   Kein Abbrechen (wie die Rollen-Zielauswahl TargetSelect) — die Familie ist mit dem Pick bereits gewählt.
   Bewusst generisch (Farb-Ziele); Kategorie C nutzt denselben Fluss später für Karten-Ziele. */
export function FamilyTargetSelect({ state, onSuit, onConfirm }) {
  const ft = state.familyTarget || {};
  const fam = familyDef(ft.familyId) || {};
  const tierDef = (fam.tiers && fam.tiers[ft.tier]) || {};
  const spec = tierDef.pickTarget || {};
  const need = spec.suits || 0;
  const suits = ft.suits || [];
  const cat = CATEGORIES[fam.cat] || { name: "", color: "#8a8a95" };
  const tm = tierMeta(ft.tier) || { color: "#8a8a95", label: "" };
  const ordered = need > 1; // Reihenfolge relevant (erste = Gewinner, zweite = Verlierer)
  const ready = need > 0 && suits.length === need;

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-2xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={{ background: "#15151b", border: `1px solid ${tm.color}55` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: tm.color }}>{cat.name} · {tm.label}</div>
          <h2 className="text-xl font-bold mt-1">{fam.name} {romanOf(ft.tier)}</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{tierDef.desc}</p>
        </div>

        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
            {ordered ? "Reihenfolge: erste Farbe = Gewinner (+), zweite = Verlierer (−)" : `Wähle ${need === 1 ? "eine Farbe" : `${need} Farben`}`}
          </div>
          <div className="flex gap-2 flex-wrap">
            {SUIT_ORDER.map((su) => {
              const idx = suits.indexOf(su);
              const on = idx >= 0;
              return (
                <button key={su} onClick={() => onSuit(su)}
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: on ? suitColor(su) : `${suitColor(su)}22`, color: on ? "#141419" : suitColor(su), border: `2px solid ${suitColor(su)}` }}>
                  {ordered && on && <span className="mr-1 opacity-80">{idx + 1}.</span>}
                  {suitName(su)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deck-Kontext: aktuelle Werte je Farbe — hilft, die stärkste bzw. schwächste Farbe zu wählen. */}
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Deck-Werte je Farbe</div>
          <DeckHistogram deck={state.deck} />
        </div>

        <div className="flex items-center justify-between mt-5">
          <span className="text-xs opacity-60 tabular-nums">{suits.length} / {need} gewählt</span>
          <button onClick={() => ready && onConfirm()} disabled={!ready}
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: ready ? tm.color : "#2a2a33", color: ready ? "#141419" : "#8a8a92", cursor: ready ? "pointer" : "default" }}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
