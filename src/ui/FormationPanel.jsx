import { useState } from "react";
import { CardGrid } from "./CardGrid.jsx";
import { summarizeFormations } from "../game/formations.js";
import { allianceGroups } from "../game/families.js";
import { architectBuildings, architectCoverFor, structLitPosOf, distrLitPosOf } from "./architectCover.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache

const fmt = (x) => fmtNum(x.toFixed(2));

/* #161 FB-1: Gemeinsames, kompaktes Read-only-Panel der aktiven Formationen des Spieler-Layouts.
   Überall gleich einsetzbar (Shop-Ziel-, Perk- und Eis-Skill-Auswahl) → der Spieler sieht seine
   Formationen direkt beim Entscheiden, statt nur in Formationsphase/Chronik. Rein anzeige-orientiert:
   nutzt das geteilte CardGrid mit state.formations (vom Reducer/Engine gehalten, kein Neuberechnen hier).
   Optional `pickedIds`/`pickedPos`, um eine laufende Auswahl im Kontext der Formationen zu markieren.
   #UI: `collapsible` macht die Kopfzeile zum Ein-/Ausklapp-Trigger. Der 🏗 Gebäude-Toggle blendet — wie in der
   Aufstellungsphase — die platzierten Architekt-Bauten als Rahmen über dem Brett ein (nur wenn Bauten vorhanden). */
export function FormationPanel({ state = {}, title = null, pickedIds = [], pickedPos, className = "", collapsible = false, defaultOpen = true, glowBid = null, quietFrames = false }) {
  const deck = state.deck || [];
  const order = state.playerOrder || [];
  const formations = state.formations || [];
  const cards = order.map((di) => deck[di]);
  const hasArch = architectBuildings(state).length > 0;
  const [open, setOpen] = useState(defaultOpen);
  const [showArch, setShowArch] = useState(true);
  if (cards.length === 0) return null;
  const { count, maxMult } = summarizeFormations(formations);
  // Eis-Neudesign: Gletscher/Firn-Boden auch im Referenz-Panel zeigen (z. B. Skill-Auswahl), damit man beim Entscheiden
  // die eigene Eis-Lage sieht.
  const iceActive = (state.activeArchetypes || []).includes("ice");
  const glacierPos = iceActive && state.glacierLocked
    ? new Set(state.glacierLocked.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)) : null;
  // #UI: Architekt-Bauten als Rahmen einblenden (Gebäude-Toggle), wie in der Aufstellungsphase.
  /* Ein gesetztes `glowBid` blendet die Bauten MIT ein, auch wenn der 🏗-Schalter aus ist: der Zeiger kommt
     aus einer Gebäude-Liste (#lv-gebaeude), und ein Antippen, das sichtbar nichts tut, ist schlimmer als kein
     Antippen. Dieselbe Regel, die der Kommentar an `ArchBuildingList` vom Aufrufer verlangt. */
  const archOn = hasArch && (showArch || !!glowBid);
  const cover = archOn ? architectCoverFor(state) : null;
  const structPos = archOn ? structLitPosOf(state) : null;
  const distrPos = archOn ? distrLitPosOf(state) : null;
  const bodyOpen = collapsible ? open : true;
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <button type="button" onClick={collapsible ? () => setOpen((o) => !o) : undefined}
          aria-expanded={collapsible ? open : undefined}
          className="flex items-center gap-1.5 min-w-0" style={{ cursor: collapsible ? "pointer" : "default" }}>
          {collapsible && <span className="text-meta-1 opacity-50 transition-transform" style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>▸</span>}
          <span className="text-meta-3 uppercase tracking-wide opacity-50 truncate">{title ?? t("formpanel.title")}</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-meta-3 font-bold" style={{ color: "#5ab87a" }}>{t("formpanel.count", { n: count, max: fmt(maxMult) })}</span>
          {hasArch && (
            <button type="button" onClick={(e) => { e.stopPropagation(); setShowArch((v) => !v); }}
              className="text-meta-1 font-bold px-2 py-0.5 rounded-md transition-all hover:brightness-110"
              style={showArch ? { background: "#16283a", color: "#7db4e6", border: "1px solid #3b7dbe" } : { background: "#16232f", color: "#7d8a97", border: "1px solid #2b3e4d" }}
              title={t("formpanel.archToggle.title")}>{t("formpanel.archToggle")}</button>
          )}
        </div>
      </div>
      {bodyOpen && (
        <CardGrid cards={cards} formations={formations} roles={state.roles || {}}
          anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
          lockedPos={state.challengeBlockForm || []}
          glacierPos={glacierPos} glacierMassByPos={iceActive ? (state.glacierMass || []) : null} firnStackByPos={iceActive ? (state.firnStack || []) : null}
          architectCover={cover} structPos={structPos} distrPos={distrPos} glowBid={archOn ? glowBid : null}
          pickedIds={pickedIds} pickedPos={pickedPos} onTilePick={() => {}} quietTiles quietFrames={quietFrames} />
      )}
    </div>
  );
}
