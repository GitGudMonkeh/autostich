import { useState } from "react";
import { PERK_DEFS } from "../game/perks.js";
import { allianceGroups } from "../game/families.js";
import { CardGrid } from "./CardGrid.jsx";

const GOLD = "#d4a63a"; // #201.2: einheitliche Bestätigen-/Aktionsfarbe

/* Kartenrollen-Zielauswahl (V2 §22.6 C / §22.5): öffnet nach dem Pick eines Ziel-Perks.
   Genau needsTarget Karten antippen, dann bestätigen. Danach ist die Rolle fixiert.
   #112: nutzt das geteilte CardGrid → Desktop-Kompakt-Styling + Formations-/Rollen-Kontext wie in der Aufstellung. */
export function TargetSelect({ state, onConfirm }) {
  const { targetPerk, deck = [], playerOrder = [], formations = [], roles = {} } = state;
  const def = PERK_DEFS[targetPerk] || {};
  const need = def.needsTarget || 0;
  const [sel, setSel] = useState([]); // gewählte Karten-ids

  const toggle = (id) => setSel((cur) =>
    cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < need ? [...cur, id] : cur);

  const cards = playerOrder.map((di) => deck[di]);
  const ready = sel.length === need;

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={{ background: "#15151b", border: "1px solid #33333e" }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>Rolle · {def.label}</div>
          <h2 className="text-xl font-bold mt-1">Wähle {need} {need === 1 ? "Karte" : "Karten"}</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{def.desc}</p>
        </div>

        <div className="mt-4">
          <CardGrid cards={cards} formations={formations} roles={roles}
            anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
            pickedIds={sel} onTilePick={(pos, c) => toggle(c.id)} />
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs opacity-60 tabular-nums">{sel.length} / {need} gewählt</span>
          <button onClick={() => ready && onConfirm(sel)} disabled={!ready}
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: ready ? GOLD : "#2a2a33", color: ready ? "#141419" : "#8a8a92", cursor: ready ? "pointer" : "default" }}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
