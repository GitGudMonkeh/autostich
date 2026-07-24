import { useState } from "react";
import { suitColor } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";
import { SEGMENT_SIZE } from "../game/formations.js";
import { formationBorder } from "./formationStyle.js";
import { CardDetail } from "./CardDetail.jsx";

const FORM_LABEL = { wiederholung: "W", farbblock: "F", treppe: "T", wechsel: "Z", anker: "A" };
const fmt = (x) => x.toFixed(2).replace(".", ",");

/* Chronik-Kartenübersicht (§22.11): alle 40 Karten in aktueller Reihenfolge — nur Anzeige,
   mit Formations- und Rollen-Markern. Klick auf eine Karte zeigt unten Rolle & Modifikatoren (#95.5). */
export function ChronikOverview({ state, onClose }) {
  const { deck = [], playerOrder = [], formations = [] } = state;
  const [selPos, setSelPos] = useState(null);
  const rolesByCard = {};
  for (const [pid, ids] of Object.entries(state.roles || {})) for (const id of ids || []) (rolesByCard[id] ||= []).push(pid);
  const cards = playerOrder.map((di) => deck[di]);
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);

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

        <div className="grid gap-2">
          {Array.from({ length: nSeg }, (_, s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="text-[10px] opacity-40 w-9 shrink-0 text-right tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
              <div className="grid grid-cols-5 gap-1.5 flex-1">
                {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
                  const pos = s * SEGMENT_SIZE + k;
                  const pf = formations[pos] || { mult: 1, formations: [] };
                  const inForm = pf.mult > 1;
                  const col = suitColor(c.suit);
                  const labels = [...new Set(pf.formations.map((f) => FORM_LABEL[f.type]))].join("");
                  const cardRoles = rolesByCard[c.id] || [];
                  // #95.4/8: Rahmenfarbe nach Anzahl Formationen, gestrichelt-grün = Mitglied ohne Multiplikator.
                  const fb = formationBorder(pf);
                  const selected = selPos === pos;
                  const borderColor = selected ? "#ffffff" : fb.color || col + "55";
                  const borderStyle = fb.dashed && !selected ? "dashed" : "solid";
                  return (
                    <button key={pos} onClick={() => setSelPos(selected ? null : pos)}
                      className="relative rounded-lg flex flex-col items-center justify-center transition-all"
                      style={{ aspectRatio: "3 / 4", background: "#20202a", border: `2px ${borderStyle} ${borderColor}`,
                               boxShadow: selected ? "0 0 10px #ffffff66" : undefined }}
                      title={[`Wert ${c.value} (ursprünglich ${c.baseRank})`, cardRoles.length ? "Rollen: " + cardRoles.map((p) => PERK_DEFS[p].label).join(", ") : null, inForm ? `Formation ×${fmt(pf.mult)}` : null].filter(Boolean).join(" · ")}>
                      <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
                      {(c.ionStacks || 0) > 0 && <span className="absolute top-0.5 right-1 text-[8px]" style={{ color: "#5ec8f0" }}>⚡{c.ionStacks}</span>}
                      <span className="text-lg font-bold font-pixel-dense" style={{ color: col }}>{c.value}</span>
                      {inForm && <span className="text-[9px] font-bold leading-none" style={{ color: "#5ab87a" }}>×{fmt(pf.mult)}</span>}
                      {labels && <span className="absolute bottom-0.5 right-1 text-[7px] font-bold opacity-70" style={{ color: "#5ab87a" }}>{labels}</span>}
                      {cardRoles.length > 0 && <span className="absolute bottom-0.5 left-1 text-[8px] leading-none" style={{ color: "#d4a63a" }}>●</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detailanzeige der angeklickten Karte (#95.5) */}
        <div className="mt-3">
          <CardDetail card={selPos != null ? cards[selPos] : null} pos={selPos} posForm={selPos != null ? formations[selPos] : null} roles={state.roles} />
        </div>

        <div className="text-[10px] opacity-45 mt-2 flex flex-wrap gap-x-3">
          <span>W Wiederholung</span><span>F Farbblock</span><span>T Treppe</span><span>Z Wechsel</span><span>A Anker</span><span style={{ color: "#d4a63a" }}>● Rolle</span>
          <span>Rahmenfarbe = Anzahl Formationen (<span style={{ color: "#5ab87a" }}>1</span>·<span style={{ color: "#5a8ade" }}>2</span>·<span style={{ color: "#8a7de0" }}>3</span>·<span style={{ color: "#d4a63a" }}>4</span>) · gestrichelt = ohne ×</span>
        </div>
      </div>
    </div>
  );
}
