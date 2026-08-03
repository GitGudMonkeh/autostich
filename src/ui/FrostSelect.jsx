import { allianceGroups } from "../game/families.js";
import { CardGrid } from "./CardGrid.jsx";
import { architectCoverFor } from "./architectCover.js";

const ICE = "#5ec8f0";

/* Frostwahl (#265) — der Spieler wählt SELBST, welche eigenen Karten einfrieren (statt Auto-Einfrieren der niedrigsten).
   Öffnet nach einem Eis-Skill-Pick, wenn Frostwahl gehalten wird. `need` nicht-gefrorene Karten wählen (bereits gefrorene
   sind gesperrt), dann bestätigen. Kein Abbrechen — der Skill ist bereits gewählt. */
export function FrostSelect({ state, onToggle, onConfirm }) {
  const fs = state.frostSelect || { need: 0, chosen: [] };
  const deck = state.deck || [];
  const order = state.playerOrder || [];
  const cards = order.map((di) => deck[di]);
  const frozenPos = order.map((di, pos) => (deck[di].frozen ? pos : -1)).filter((p) => p >= 0);
  const available = cards.filter((c) => !c.frozen).length;
  const need = Math.min(fs.need, available);
  const ready = fs.chosen.length === need && need > 0;
  const architectCover = architectCoverFor(state);

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={{ background: "#15151b", border: `1px solid ${ICE}55` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: ICE }}>❄ Frostwahl</div>
          <h2 className="text-xl font-bold mt-1">Karten einfrieren</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">
            Wähle {need} {need === 1 ? "Karte" : "Karten"}, die einfrieren. Frostkarten bauen bei jedem Sieg Schichten auf — der Eis-Payoff-Motor.
          </p>
        </div>
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Dein Deck — {available} freie {available === 1 ? "Karte" : "Karten"}</div>
          <CardGrid cards={cards} formations={state.formations} roles={state.roles}
            anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
            architectCover={architectCover} pickedIds={fs.chosen} disabledPos={frozenPos} onTilePick={(pos, c) => onToggle(c.id)} />
        </div>
        <div className="flex items-center justify-between mt-5">
          <span className="text-xs opacity-60 tabular-nums">{fs.chosen.length} / {need} gewählt</span>
          <button onClick={() => ready && onConfirm()} disabled={!ready}
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: ready ? ICE : "#2a2a33", color: ready ? "#141419" : "#8a8a92", cursor: ready ? "pointer" : "default" }}>
            Einfrieren
          </button>
        </div>
      </div>
    </div>
  );
}
