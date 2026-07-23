import { useState } from "react";
import { PERK_DEFS } from "../game/perks.js";
import { suitColor } from "../game/constants.js";
import { SEGMENT_SIZE } from "../game/formations.js";

/* Kartenrollen-Zielauswahl (V2 §22.6 C / §22.5): öffnet nach dem Pick eines Ziel-Perks.
   Genau needsTarget Karten antippen, dann bestätigen. Danach ist die Rolle fixiert. */
export function TargetSelect({ state, onConfirm }) {
  const { targetPerk, deck = [], playerOrder = [] } = state;
  const def = PERK_DEFS[targetPerk] || {};
  const need = def.needsTarget || 0;
  const [sel, setSel] = useState([]); // gewählte Karten-ids

  const toggle = (id) => setSel((cur) =>
    cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < need ? [...cur, id] : cur);

  const cards = playerOrder.map((di) => deck[di]);
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);
  const ready = sel.length === need;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95vh] overflow-y-auto" style={{ background: "#15151b", border: "1px solid #33333e" }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>Rolle · {def.label}</div>
          <h2 className="text-xl font-bold mt-1">Wähle {need} {need === 1 ? "Karte" : "Karten"}</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{def.desc}</p>
        </div>

        <div className="grid gap-2 mt-4">
          {Array.from({ length: nSeg }, (_, s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="text-[10px] opacity-40 w-9 shrink-0 text-right tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
              <div className="grid grid-cols-5 gap-1.5 flex-1">
                {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
                  const pos = s * SEGMENT_SIZE + k;
                  const selected = sel.includes(c.id);
                  const col = suitColor(c.suit);
                  return (
                    <button key={pos} onClick={() => toggle(c.id)}
                      className="relative rounded-lg flex flex-col items-center justify-center transition-all"
                      style={{ aspectRatio: "3 / 4", background: selected ? "#5ab87a22" : "#20202a",
                               border: `2px solid ${selected ? "#5ab87a" : col + "55"}`,
                               boxShadow: selected ? "0 0 10px #5ab87a66" : undefined }}>
                      <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
                      {(c.ionStacks || 0) > 0 && <span className="absolute top-0.5 right-1 text-[8px]" style={{ color: "#5ec8f0" }}>⚡{c.ionStacks}</span>}
                      <span className="text-lg font-bold font-pixel-dense" style={{ color: col }}>{c.value}</span>
                      {selected && <span className="text-[10px] font-bold leading-none" style={{ color: "#5ab87a" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs opacity-60 tabular-nums">{sel.length} / {need} gewählt</span>
          <button onClick={() => ready && onConfirm(sel)} disabled={!ready}
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: ready ? "#5ab87a" : "#2a2a33", color: ready ? "#0c0c10" : "#8a8a92", cursor: ready ? "pointer" : "default" }}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
