import { suitColor, suitName, SUIT_ORDER } from "../game/constants.js";
import { PANEL_BG, ActionBar, ActionButton } from "./modalStyle.jsx";
import { allianceGroups } from "../game/families.js";
import { tierMeta, romanOf } from "../game/rarity.js";
import { familyDef, formationName, perkCat, rarityLabel } from "../i18n/labels.js"; // #sprache

import { FORMATION_TYPES, computeFormations } from "../game/formations.js";
import { DeckHistogram } from "./BuildSummary.jsx";
import { CardGrid } from "./CardGrid.jsx";
import { glacierGridProps } from "./glacierBoard.js";
import { architectCoverFor } from "./architectCover.js";

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
  const cat = perkCat(fam.cat) || { name: "", color: "#8a8a95" };
  const tm = tierMeta(ft.tier) || { color: "#8a8a95" };
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
  const architectCover = architectCoverFor(state); // Gebäude-Overlay fürs Deck (informierte Wahl)

  // #201.6 (b): Formations-Stärke-Vorschau bei Farb-/Wert-Perks (nur suits-Modus, A_SUIT_BOOST/DUEL). Trockendurchlauf
  // des REINEN tierDef.onPick auf einer Deck-Kopie → Formationen neu rechnen → „aktuell → nachher (±Δ)". Rein lesend.
  const fmtStr = (x) => x.toFixed(2).replace(".", ",");
  const strengthOf = (fs) => (fs || []).reduce((sum, pf) => sum + ((pf.mult || 1) - 1), 0);
  const previewOn = ft.kind === "suits" && typeof tierDef.onPick === "function";
  const strengthFor = (dk) => strengthOf(computeFormations(order, dk, state.roles || {}, [], state.skills || [], state.shop?.anchors || [], state.familyTiers || {}));
  const curStrength = previewOn ? strengthFor(deck) : 0;
  const projStrength = (previewOn && ready) ? strengthFor(tierDef.onPick(deck, () => 0.5, { suits: sel })) : null;

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={{ background: PANEL_BG, border: `1px solid ${tm.color}55` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: tm.color }}>{cat.name} · {rarityLabel(ft.tier)}</div>
          <h2 className="text-xl font-bold mt-1">{fam.name} {romanOf(ft.tier)}</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{tierDef.desc}</p>
        </div>

        <ActionBar pad={5}>
          <span className="text-xs opacity-60 tabular-nums self-center">{sel.length} / {need} gewählt</span>
          <span className="flex-1" />
          <ActionButton kind="primary" disabled={!ready} onClick={() => ready && onConfirm()}>Bestätigen</ActionButton>
        </ActionBar>

        {isCards ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              Wähle {need} {need === 1 ? "Karte" : "Karten"}{heldIds.size > 0 ? ` (${heldIds.size} bereits als Rolle gebunden)` : ""}
            </div>
            <CardGrid cards={cards} formations={state.formations} roles={state.roles} {...glacierGridProps(state)}
              anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
              architectCover={architectCover} pickedIds={sel} disabledPos={disabledPos} onTilePick={(pos, c) => onCard(c.id)} />
          </div>
        ) : isType ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Wähle einen Formationstyp</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMATION_TYPES.map((t) => {
                const on = ft.formationType === t;
                return (
                  <button key={t} onClick={() => onFormationType(t)}
                    className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{ background: on ? tm.color : "#20202a", color: on ? "#141419" : "#c8c8d0", border: `2px solid ${on ? tm.color : "#3a3a44"}` }}>
                    {formationName(t)}
                  </button>
                );
              })}
            </div>
            {/* #UI: Deck mit aktuellen Formationen + Gebäuden — damit man sieht, welche Formationstypen man hat. */}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Dein Deck · aktuelle Formationen{architectCover ? " & Gebäude" : ""}</div>
              <CardGrid cards={cards} formations={state.formations} roles={state.roles} {...glacierGridProps(state)}
                anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
                architectCover={architectCover} onTilePick={() => {}} quietTiles />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              {ordered ? "Reihenfolge: erste Farbe = Gewinner (+), zweite = Verlierer (−)" : `Wähle ${need === 1 ? "eine Farbe" : `${need} Farben`}`}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            {/* #UI: Deck mit aktuellen Formationen + Gebäuden — für eine informierte Farbwahl. */}
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Dein Deck · aktuelle Formationen{architectCover ? " & Gebäude" : ""}</div>
              <CardGrid cards={cards} formations={state.formations} roles={state.roles} {...glacierGridProps(state)}
                anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
                architectCover={architectCover} onTilePick={() => {}} quietTiles />
            </div>
          </div>
        )}

        {previewOn && (
          <div className="text-center text-[11px] mt-4 opacity-85">
            <span className="opacity-60">Formations-Stärke:</span>{" "}
            <span className="tabular-nums font-pixel-dense">×{fmtStr(1 + curStrength)}</span>
            {projStrength != null && (() => {
              const d = projStrength - curStrength;
              const c = d > 0.001 ? "#5ab87a" : d < -0.001 ? "#e0605a" : "#c8c8d0";
              return (<>{" → "}<span className="tabular-nums font-pixel-dense" style={{ color: c }}>×{fmtStr(1 + projStrength)}</span>{" "}<span style={{ color: c }}>({d >= 0 ? "+" : "−"}{fmtStr(Math.abs(d))})</span></>);
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
