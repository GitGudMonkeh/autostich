import { useState } from "react";
import { CardGrid } from "./CardGrid.jsx";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";

/* Chronik-Kartenübersicht (§22.11): alle 40 Karten in aktueller Reihenfolge — nur Anzeige,
   mit Formations- und Rollen-Markern. Klick auf eine Karte zeigt Rolle & Modifikatoren (#95.5).
   Desktop (#101): zweispaltig — Karten-Grid links, Info-Panel rechts; Mobil gestapelt. */
export function ChronikOverview({ state, onClose }) {
  const { deck = [], playerOrder = [], formations = [] } = state;
  const [selPos, setSelPos] = useState(null);
  const cards = playerOrder.map((di) => deck[di]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}
      onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95vh] overflow-y-auto" style={{ background: "#15151b", border: "1px solid #33333e" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Chronik</div>
            <h2 className="text-xl font-bold">Kartenübersicht</h2>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>

        <div className="md:flex md:gap-4 md:items-start">
          {/* Karten-Grid (links auf Desktop, kompakt) */}
          <div className="md:w-1/2 md:shrink-0">
            <CardGrid cards={cards} formations={formations} roles={state.roles}
              selectedPos={selPos} onTilePick={(pos) => setSelPos(selPos === pos ? null : pos)} />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-3 md:mt-0 grid gap-3 content-start">
            <CardDetail card={selPos != null ? cards[selPos] : null} pos={selPos} posForm={selPos != null ? formations[selPos] : null} roles={state.roles} />
            <LayoutPerks perks={state.perks} />
            <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 font-medium">
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>W</b> Wiederholung</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>F</b> Farbblock</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>T</b> Treppe</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>Z</b> Wechsel</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>A</b> Anker</span>
              <span style={{ color: "#d4a63a" }}>● Rolle</span>
              <span style={{ color: "#9a9aa4" }}>Rahmenfarbe = Anzahl Formationen (<b style={{ color: "#5ab87a" }}>1</b>·<b style={{ color: "#5a8ade" }}>2</b>·<b style={{ color: "#8a7de0" }}>3</b>·<b style={{ color: "#d4a63a" }}>4</b>) — mehr = mehr Multi (Überlappung ×1,5/×2/×3) · gestrichelt = ohne ×</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
