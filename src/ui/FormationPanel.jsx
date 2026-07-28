import { CardGrid } from "./CardGrid.jsx";
import { summarizeFormations } from "../game/formations.js";
import { allianceGroups } from "../game/families.js";

const fmt = (x) => x.toFixed(2).replace(".", ",");

/* #161 FB-1: Gemeinsames, kompaktes Read-only-Panel der aktiven Formationen des Spieler-Layouts.
   Überall gleich einsetzbar (Shop-Ziel-, Perk- und Eis-Skill-Auswahl) → der Spieler sieht seine
   Formationen direkt beim Entscheiden, statt nur in Formationsphase/Chronik. Rein anzeige-orientiert:
   nutzt das geteilte CardGrid mit state.formations (vom Reducer/Engine gehalten, kein Neuberechnen hier).
   Optional `pickedIds`/`pickedPos`, um eine laufende Auswahl im Kontext der Formationen zu markieren. */
export function FormationPanel({ state = {}, title = "Deine aktiven Formationen", pickedIds = [], pickedPos, className = "" }) {
  const deck = state.deck || [];
  const order = state.playerOrder || [];
  const formations = state.formations || [];
  const cards = order.map((di) => deck[di]);
  if (cards.length === 0) return null;
  const { count, maxMult } = summarizeFormations(formations);
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide opacity-50">{title}</span>
        <span className="text-[11px] font-bold" style={{ color: "#5ab87a" }}>{count} Formationen · max ×{fmt(maxMult)}</span>
      </div>
      <CardGrid cards={cards} formations={formations} roles={state.roles || {}}
        anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
        pickedIds={pickedIds} pickedPos={pickedPos} onTilePick={() => {}} quietTiles />
    </div>
  );
}
