import { suitColor, suitName, SUIT_ORDER } from "../game/constants.js";
import { familyDef, allianceGroups } from "../game/families.js";
import { tierMeta, romanOf } from "../game/rarity.js";
import { CATEGORIES } from "../game/perks.js";
import { FORMATION_TYPES, FORMATION_TYPE_LABELS } from "../game/formations.js";
import { DeckHistogram } from "./BuildSummary.jsx";
import { CardGrid } from "./CardGrid.jsx";

const GOLD = "#d4a63a"; // #201.2: einheitliche Bestätigen-/Aktionsfarbe (raritätsunabhängig)

/* Familien-Ziel-Auswahl (Rarität #167, Spec §2.3/§2.4) — öffnet nach dem Pick einer Stufe mit `pickTarget`.
   Zwei Modi (state.familyTarget.kind):
   - "suits" (Kat. A: A_SUIT_BOOST III/IV = 1 Farbe, A_SUIT_DUEL III/IV = 1 bzw. 2 Farben, Reihenfolge Gewinner→Verlierer)
   - "cards" (Kat. C: Rollen-Ziele bzw. C_SACRIFICE — `need` Karten im geteilten CardGrid wählen). Beim ROLLEN-Upgrade
     werden nur die ZUSÄTZLICHEN Ziele gewählt; bereits gehaltene Rollenkarten sind ausgegraut (Spec §2.3).
   Kein Abbrechen (wie die Rollen-Zielauswahl TargetSelect) — die Familie ist mit dem Pick bereits gewählt. */
export function FamilyTargetSelect({ state, onSuit, onCard, onFormationType, onConfirm }) {
  const ft = state.familyTarget || {};
  const fam = familyDef(ft.familyId) || {};
  const tierDef = (fam.tiers && fam.tiers[ft.tier]) || {};
  const cat = CATEGORIES[fam.cat] || { name: "", color: "#8a8a95" };
  const tm = tierMeta(ft.tier) || { color: "#8a8a95", label: "" };
  const need = ft.need || 0;
  const isCards = ft.kind === "cards";
  const isType = ft.kind === "formationType"; // #179 Formationskern (E_CORE): einen der vier Basistypen wählen
  const ordered = ft.kind === "suits" && need > 1; // Reihenfolge relevant (erste = Gewinner, zweite = Verlierer)
  const sel = isCards ? (ft.cards || []) : isType ? (ft.formationType ? [ft.formationType] : []) : (ft.suits || []);
  const ready = need > 0 && sel.length === need;

  const deck = state.deck || [];
  const order = state.playerOrder || [];
  const cards = order.map((di) => deck[di]);
  const heldIds = new Set((state.roles && state.roles[ft.familyId]) || []); // bereits gehaltene Rollenkarten (Upgrade)
  const disabledPos = order.map((di, pos) => (heldIds.has(deck[di].id) ? pos : -1)).filter((p) => p >= 0);

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={{ background: "#15151b", border: `1px solid ${tm.color}55` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: tm.color }}>{cat.name} · {tm.label}</div>
          <h2 className="text-xl font-bold mt-1">{fam.name} {romanOf(ft.tier)}</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{tierDef.desc}</p>
        </div>

        {isCards ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              Wähle {need} {need === 1 ? "Karte" : "Karten"}{heldIds.size > 0 ? ` (${heldIds.size} bereits als Rolle gebunden)` : ""}
            </div>
            <CardGrid cards={cards} formations={state.formations} roles={state.roles}
              anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
              pickedIds={sel} disabledPos={disabledPos} onTilePick={(pos, c) => onCard(c.id)} />
          </div>
        ) : isType ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Wähle einen Formationstyp</div>
            <div className="flex gap-2 flex-wrap">
              {FORMATION_TYPES.map((t) => {
                const on = ft.formationType === t;
                return (
                  <button key={t} onClick={() => onFormationType(t)}
                    className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{ background: on ? tm.color : "#20202a", color: on ? "#141419" : "#c8c8d0", border: `2px solid ${on ? tm.color : "#3a3a44"}` }}>
                    {FORMATION_TYPE_LABELS[t] || t}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              {ordered ? "Reihenfolge: erste Farbe = Gewinner (+), zweite = Verlierer (−)" : `Wähle ${need === 1 ? "eine Farbe" : `${need} Farben`}`}
            </div>
            <div className="flex gap-2 flex-wrap">
              {SUIT_ORDER.map((su) => {
                const idx = sel.indexOf(su);
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
            {/* Deck-Kontext (nur Farb-Modus): aktuelle Werte je Farbe — hilft, die stärkste bzw. schwächste Farbe zu wählen. */}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Deck-Werte je Farbe</div>
              <DeckHistogram deck={state.deck} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-5">
          <span className="text-xs opacity-60 tabular-nums">{sel.length} / {need} gewählt</span>
          <button onClick={() => ready && onConfirm()} disabled={!ready}
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: ready ? GOLD : "#2a2a33", color: ready ? "#141419" : "#8a8a92", cursor: ready ? "pointer" : "default" }}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
