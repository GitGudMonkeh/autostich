import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG } from "./modalStyle.jsx";
import {
  NODES, BRANCHES, NODE_BY_ID, TOTAL_NODES,
  emptyProfile, nodeState, buyNode, respec, ownedCount, treeComplete,
  nonMeisterSpent, gateNeed,
} from "../game/progression.js";

/* Upgrade-Screen — hängt am ECHTEN Profil (progression.js + storage). Zeigt den festgezurrten Baum
   (13 Knoten, 4 Äste) mit Kosten, Sequenz-Sperren, Meister-Gates und Respec. Kauf/Respec liefern ein
   neues Profil an onProfileChange (App speichert via storage.saveProfile) → persistent.

   Hinweis: Die WIRKUNG der Upgrades im Lauf (maxCover/Reroll/RareShift/Legendär) kommt mit den Reducer-
   Nähten (Schritt 3). Bis dahin: SP verdienen, kaufen, speichern, respeccen — alles echt. */

const CY = "#26c6e6", BLUE = "#5a8ade", VI = "#9b82f0", AM = "#f2a83a";
const BR_COLOR = { bau: CY, auf: BLUE, rar: VI, mei: AM };
// Äste mit ihren Knoten (aus progression.js gruppiert — Source of Truth).
const GROUPS = BRANCHES.map((b) => ({ ...b, color: BR_COLOR[b.key], nodes: NODES.filter((n) => n.branch === b.key) }));

export function UpgradeScreen({ onClose, profile, onProfileChange }) {
  useEscape(onClose);
  const p = profile || emptyProfile();
  const sp = Math.max(0, Math.floor(Number(p.stichPoints) || 0));
  const owned = ownedCount(p);

  const reqText = (n, st) => {
    if (st === "lock-prev") return `braucht ${NODE_BY_ID[n.prereq]?.roman || ""}`;
    if (st === "lock-gate") {
      if (n.gate?.type === "pct") return `${nonMeisterSpent(p)} / ${gateNeed(n)} SP in andere Äste`;
      if (n.gate?.type === "all") return "alle anderen Upgrades";
      if (n.gate?.type === "onb") return "Onboarding nötig";
    }
    if (st === "lock-sp") return "zu wenig SP";
    return "";
  };
  const buy = (id) => onProfileChange && onProfileChange(buyNode(p, id));
  const doRespec = () => onProfileChange && onProfileChange(respec(p));

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-6 sm:px-6 overlay-card as-panel"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>

        {/* Sticky-Kopf: Titel + SP-Guthaben + Respec + Schließen. */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex items-center justify-between gap-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <h2 className="text-lg font-bold">Upgrades</h2>
          <div className="flex items-center gap-2.5">
            <span className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold tabular-nums" style={{ color: AM, textShadow: "0 0 12px rgba(242,168,58,.4)" }}>{sp}</span>
              <span className="text-[10px] font-bold tracking-wider" style={{ color: AM, opacity: .8 }}>SP</span>
            </span>
            <button onClick={doRespec} disabled={owned === 0}
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
              style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#c8c8d0" }}>↺ Respec</button>
            <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
          </div>
        </div>

        {/* Fortschritt + Logo-Verlaufslinie. */}
        <div className="h-[3px] w-full rounded-full mt-1" style={{ background: `linear-gradient(90deg, ${CY}, ${BLUE}, ${VI}, ${AM})`, opacity: .8 }} />
        <div className="text-xs mt-1.5 tabular-nums" style={{ color: "#a6a6b0" }}>
          <b className="text-[#e8e8ea]">{owned}</b> / {TOTAL_NODES} Knoten · Meister-Liga {treeComplete(p) ? <b style={{ color: AM }}>frei</b> : `bei ${TOTAL_NODES}/${TOTAL_NODES}`}
        </div>

        {/* Äste als Zeilen. */}
        {GROUPS.map((b) => {
          const nOwned = b.nodes.filter((n) => nodeState(p, n.id) === "owned").length;
          return (
            <div key={b.key} className="mt-5">
              <div className="flex items-baseline gap-2 mb-2.5">
                <span className="text-[15px] font-extrabold" style={{ color: b.color }}>{b.name}</span>
                <span className="text-[11.5px]" style={{ color: "#a6a6b0" }}>{b.desc}</span>
                <span className="ml-auto text-[11px] tabular-nums" style={{ color: "#a6a6b0" }}>{nOwned}/{b.nodes.length}</span>
              </div>
              <div className="flex items-stretch overflow-x-auto pb-2" style={{ color: b.color }}>
                {b.nodes.map((n, i) => {
                  const st = nodeState(p, n.id);
                  const isOwned = st === "owned", isBuy = st === "buy";
                  const right = isOwned ? "✓" : (isBuy || st === "lock-sp" ? `${n.cost} SP` : "🔒");
                  const req = reqText(n, st);
                  const nodeStyle = isOwned
                    ? { border: `1px solid ${b.color}`, background: `${b.color}1f` }
                    : isBuy
                      ? { border: `1px solid ${AM}`, boxShadow: "0 0 0 1px rgba(242,168,58,.25), 0 0 12px rgba(242,168,58,.15)", cursor: "pointer" }
                      : { border: "1px solid #26262e", opacity: .5 };
                  return (
                    <div key={n.id} className="flex items-stretch">
                      {i > 0 && <div className="self-center w-4 h-0.5" style={{ background: nodeState(p, b.nodes[i - 1].id) === "owned" ? b.color : "#30303a", opacity: nodeState(p, b.nodes[i - 1].id) === "owned" ? .6 : 1 }} />}
                      <div className="flex-none w-[120px] rounded-xl p-2.5 flex flex-col gap-1 transition-transform hover:-translate-y-0.5"
                        style={nodeStyle} onClick={isBuy ? () => buy(n.id) : undefined}>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-extrabold tracking-wide" style={{ color: isOwned ? b.color : "#c8c8d0", opacity: isOwned ? 1 : .8 }}>{n.roman}</span>
                          <span className="text-[11px] font-extrabold tabular-nums" style={{ color: isOwned ? b.color : (isBuy || st === "lock-sp") ? AM : "#a6a6b0" }}>{right}</span>
                        </div>
                        <div className="text-[11.5px] font-semibold leading-tight">{n.label}</div>
                        <div className="text-[10px] leading-tight" style={{ color: "#a6a6b0" }}>{n.detail}</div>
                        {req && <div className="text-[9.5px] leading-tight" style={{ color: "#a6a6b0" }}>{req}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Legende. */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-6 text-[11px]" style={{ color: "#a6a6b0" }}>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CY }} /> gekauft</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "transparent", border: `1px solid ${AM}`, boxShadow: `0 0 6px ${AM}88` }} /> kaufbar</span>
          <span>🔒 gesperrt (Vorgänger / Gate)</span>
        </div>
        <div className="text-center text-[10.5px] mt-3" style={{ color: "#a6a6b0", opacity: .5 }}>Käufe werden gespeichert · Wirkung im Lauf folgt (Schritt 3)</div>
      </div>
    </div>
  );
}
