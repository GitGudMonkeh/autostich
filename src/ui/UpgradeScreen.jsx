import { useState } from "react";
import { useEscape } from "./useEscape.js";

/* Upgrade-Screen — VORSCHAU (Progression-Doc docs/progression-decisions.md).
   Zeigt den festgezurrten Baum (13 Knoten, 4 Äste) mit Kosten, Sequenz-Sperren, Meister-Gates und
   Respec. Backend (SP-Ernte, Persistenz) ist noch NICHT gebaut → lokaler State, Kauf/Respec wirken nur
   in dieser Sitzung. Farben aus dem Logo/Hub: Baufeld Cyan · Auftakt Blau · Rarität Violett · Meister Gold. */

const CY = "#26c6e6", BLUE = "#5a8ade", VI = "#9b82f0", AM = "#f2a83a";

const BR = [
  { key: "bau", name: "Baufeld", desc: "Bau-Ökonomie", color: CY, nodes: [
    { id: "B1", rom: "I",   eff: "+1 Zelle",   det: "24 → 25", cost: 2 },
    { id: "B2", rom: "II",  eff: "+1 Zelle",   det: "25 → 26", cost: 5 },
    { id: "B3", rom: "III", eff: "+2 Zellen",  det: "26 → 28", cost: 9 },
  ]},
  { key: "auf", name: "Auftakt", desc: "Rerolls", color: BLUE, nodes: [
    { id: "A1", rom: "I",  eff: "Reroll II",  det: "+1 / Phase", cost: 6 },
    { id: "A2", rom: "II", eff: "Reroll III", det: "+1 / Phase", cost: 12 },
  ]},
  { key: "rar", name: "Rarität", desc: "Angebots-Qualität", color: VI, nodes: [
    { id: "R1", rom: "I",   eff: "Seltenheit", det: "bessere Chancen", cost: 6 },
    { id: "R2", rom: "II",  eff: "Seltenheit", det: "bessere Chancen", cost: 10 },
    { id: "R3", rom: "III", eff: "Seltenheit", det: "bessere Chancen", cost: 18 },
  ]},
  { key: "mei", name: "Meister", desc: "Legendäre / Prestige", color: AM, nodes: [
    { id: "M1", rom: "I",   eff: "Reroll f. Leg.-Slot", det: "Runde 29",        cost: 4,  gate: { type: "onb" } },
    { id: "M2", rom: "II",  eff: "2 Leg. je Archetyp",  det: "Skill-Slot",      cost: 9,  gate: { type: "pct", need: 17 } },
    { id: "M3", rom: "III", eff: "Leg.-Perk-Drop ×2",   det: "Perks & Gebäude", cost: 13, gate: { type: "pct", need: 34 } },
    { id: "M4", rom: "IV",  eff: "Garant. Leg.-Perk",   det: "2. Perk-Phase",   cost: 18, gate: { type: "pct", need: 51 } },
    { id: "M5", rom: "V",   eff: "Wahl aus 3 Leg.",     det: "2. Perk-Phase",   cost: 22, gate: { type: "all" } },
  ]},
];
const NONMEI = ["B1", "B2", "B3", "A1", "A2", "R1", "R2", "R3"];
const COST = {}; BR.forEach((b) => b.nodes.forEach((n) => { COST[n.id] = n.cost; }));
const TOTAL = BR.reduce((s, b) => s + b.nodes.length, 0);

export function UpgradeScreen({ onClose }) {
  useEscape(onClose);
  const [owned, setOwned] = useState(() => new Set(["B1", "A1", "R1", "M1"]));
  const [sp, setSp] = useState(14);

  const nonMeiSpent = () => NONMEI.filter((id) => owned.has(id)).reduce((s, id) => s + COST[id], 0);
  const gateMet = (n) => {
    if (!n.gate) return true;
    if (n.gate.type === "onb") return true; // Onboarding als erfüllt angenommen (Vorschau)
    if (n.gate.type === "pct") return nonMeiSpent() >= n.gate.need;
    if (n.gate.type === "all") return NONMEI.every((id) => owned.has(id)) && ["M1", "M2", "M3", "M4"].every((id) => owned.has(id));
    return true;
  };
  const stateOf = (b, i) => {
    const n = b.nodes[i];
    if (owned.has(n.id)) return "owned";
    if (i > 0 && !owned.has(b.nodes[i - 1].id)) return "lock-prev";
    if (!gateMet(n)) return "lock-gate";
    if (sp < n.cost) return "lock-sp";
    return "buy";
  };
  const reqText = (b, i) => {
    const n = b.nodes[i], st = stateOf(b, i);
    if (st === "lock-prev") return `braucht ${b.nodes[i - 1].rom}`;
    if (st === "lock-gate") {
      if (n.gate.type === "pct") return `${nonMeiSpent()} / ${n.gate.need} SP in andere Äste`;
      if (n.gate.type === "all") return "alle anderen Upgrades";
    }
    if (st === "lock-sp") return "zu wenig SP";
    return "";
  };
  const buy = (n) => { setOwned((o) => { const s = new Set(o); s.add(n.id); return s; }); setSp((s) => s - n.cost); };
  const respec = () => { const spent = [...owned].reduce((s, id) => s + COST[id], 0); setSp((s) => s + spent); setOwned(new Set()); };

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-6 sm:px-6 overlay-card as-panel"
        style={{ background: "#161620", border: "1px solid #2c2a3a" }} onClick={(e) => e.stopPropagation()}>

        {/* Sticky-Kopf: Titel + SP-Guthaben + Respec + Schließen. */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex items-center justify-between gap-3" style={{ background: "#161620" }}>
          <h2 className="text-lg font-bold">Upgrades <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded align-middle" style={{ background: "#26262e", color: "#a6a6b0" }}>Vorschau</span></h2>
          <div className="flex items-center gap-2.5">
            <span className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold tabular-nums" style={{ color: AM, textShadow: "0 0 12px rgba(242,168,58,.4)" }}>{sp}</span>
              <span className="text-[10px] font-bold tracking-wider" style={{ color: AM, opacity: .8 }}>SP</span>
            </span>
            <button onClick={respec} className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#c8c8d0" }}>↺ Respec</button>
            <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
          </div>
        </div>

        {/* Fortschritt + Logo-Verlaufslinie. */}
        <div className="h-[3px] w-full rounded-full mt-1" style={{ background: `linear-gradient(90deg, ${CY}, ${BLUE}, ${VI}, ${AM})`, opacity: .8 }} />
        <div className="text-xs mt-1.5 tabular-nums" style={{ color: "#a6a6b0" }}><b className="text-[#e8e8ea]">{owned.size}</b> / {TOTAL} Knoten · Meister-Liga bei {TOTAL}/{TOTAL}</div>

        {/* Äste als Zeilen. */}
        {BR.map((b) => {
          const nOwned = b.nodes.filter((n) => owned.has(n.id)).length;
          return (
            <div key={b.key} className="mt-5">
              <div className="flex items-baseline gap-2 mb-2.5">
                <span className="text-[15px] font-extrabold" style={{ color: b.color }}>{b.name}</span>
                <span className="text-[11.5px]" style={{ color: "#a6a6b0" }}>{b.desc}</span>
                <span className="ml-auto text-[11px] tabular-nums" style={{ color: "#a6a6b0" }}>{nOwned}/{b.nodes.length}</span>
              </div>
              <div className="flex items-stretch overflow-x-auto pb-2" style={{ color: b.color }}>
                {b.nodes.map((n, i) => {
                  const st = stateOf(b, i);
                  const isOwned = st === "owned", isBuy = st === "buy";
                  const right = isOwned ? "✓" : (isBuy || st === "lock-sp" ? `${n.cost} SP` : "🔒");
                  const req = reqText(b, i);
                  const nodeStyle = isOwned
                    ? { border: `1px solid ${b.color}`, background: `${b.color}1f` }
                    : isBuy
                      ? { border: `1px solid ${AM}`, boxShadow: "0 0 0 1px rgba(242,168,58,.25), 0 0 12px rgba(242,168,58,.15)", cursor: "pointer" }
                      : { border: "1px solid #26262e", opacity: .5 };
                  return (
                    <div key={n.id} className="flex items-stretch">
                      {i > 0 && <div className="self-center w-4 h-0.5" style={{ background: owned.has(b.nodes[i - 1].id) ? b.color : "#30303a", opacity: owned.has(b.nodes[i - 1].id) ? .6 : 1 }} />}
                      <div className="flex-none w-[120px] rounded-xl p-2.5 flex flex-col gap-1 transition-transform hover:-translate-y-0.5"
                        style={nodeStyle} onClick={isBuy ? () => buy(n) : undefined}>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-extrabold tracking-wide" style={{ color: isOwned ? b.color : "#c8c8d0", opacity: isOwned ? 1 : .8 }}>{n.rom}</span>
                          <span className="text-[11px] font-extrabold tabular-nums" style={{ color: isOwned ? b.color : (isBuy || st === "lock-sp") ? AM : "#a6a6b0" }}>{right}</span>
                        </div>
                        <div className="text-[11.5px] font-semibold leading-tight">{n.eff}</div>
                        <div className="text-[10px] leading-tight" style={{ color: "#a6a6b0" }}>{n.det}</div>
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
        <div className="text-center text-[10.5px] mt-3" style={{ color: "#a6a6b0", opacity: .5 }}>Vorschau · Kauf/Respec wirken nur in dieser Sitzung (Backend folgt)</div>
      </div>
    </div>
  );
}
