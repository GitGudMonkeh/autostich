import { suitColor } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";
import { SEGMENT_SIZE } from "../game/formations.js";
import { formationBorder } from "./formationStyle.js";

// Kurzkürzel der Formationstypen für die Karten-Badges.
const FORM_LABEL = { wiederholung: "W", farbblock: "F", treppe: "T", wechsel: "Z", anker: "A" };
const fmt = (x) => x.toFixed(2).replace(".", ",");

/* Eine Kachel der 40-Karten-Übersicht (geteilt von Formationsphase & Chronik, Issue #101).
   Kompakt auf Desktop: flachere Ratio (sm:aspect-square) + kleinere Zahl, damit weniger gescrollt wird.
   Auf Mobil unverändert (aspect-[3/4], text-lg). Zeigt Rahmen-Tier, ×mult, Formations-Kürzel, Rolle-●, Ionisierung. */
function CardTile({ card, pos, posForm, roleIds = [], selected, onClick }) {
  const pf = posForm || { mult: 1, formations: [] };
  const inForm = pf.mult > 1;
  const col = suitColor(card.suit);
  const labels = [...new Set((pf.formations || []).map((f) => FORM_LABEL[f.type]))].join("");
  const fb = formationBorder(pf);
  const borderColor = selected ? "#ffffff" : fb.color || col + "55";
  const borderStyle = fb.dashed && !selected ? "dashed" : "solid";
  const roleTitle = roleIds.length ? roleIds.map((p) => PERK_DEFS[p]?.label || p).join(", ") : undefined;
  return (
    <button onClick={onClick}
      className="as-tile relative rounded-lg flex flex-col items-center justify-center transition-all"
      style={{ background: "#20202a", border: `2px ${borderStyle} ${borderColor}`,
               boxShadow: selected ? "0 0 10px #ffffff66" : fb.color && !fb.dashed ? `0 0 8px ${fb.color}55` : undefined }}>
      <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
      {(card.ionStacks || 0) > 0 && <span className="absolute top-0.5 right-1 text-[8px]" style={{ color: "#5ec8f0" }}>⚡{card.ionStacks}</span>}
      <span className="text-lg sm:text-2xl font-bold font-pixel-dense" style={{ color: col }}>{card.value}</span>
      {inForm && <span className="text-[9px] sm:text-xs font-bold leading-none" style={{ color: fb.color || "#5ab87a" }}>×{fmt(pf.mult)}</span>}
      {labels && <span className="absolute bottom-0.5 right-1 text-[8px] sm:text-[11px] font-bold opacity-80" style={{ color: fb.color || "#5ab87a" }}>{labels}</span>}
      {roleIds.length > 0 && <span className="absolute bottom-0.5 left-1 text-[8px] sm:text-xs leading-none" style={{ color: "#d4a63a" }} title={roleTitle}>●</span>}
    </button>
  );
}

/* Segment-Grid: je Segment eine Zeile [Bereichs-Label][5 Kacheln]. `roles` = state.roles.
   onTilePick(pos) meldet Klicks; `selectedPos` hebt die aktive Kachel hervor (weißer Rahmen). */
export function CardGrid({ cards = [], formations = [], roles = {}, selectedPos, onTilePick }) {
  const rolesByCard = {};
  for (const [pid, ids] of Object.entries(roles || {})) for (const id of ids || []) (rolesByCard[id] ||= []).push(pid);
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);
  return (
    <div className="grid gap-1.5">
      {Array.from({ length: nSeg }, (_, s) => (
        <div key={s} className="flex items-center gap-2">
          <div className="text-[10px] opacity-40 w-9 shrink-0 text-right tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
          <div className="grid grid-cols-5 gap-1.5 flex-1">
            {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
              const pos = s * SEGMENT_SIZE + k;
              return <CardTile key={pos} card={c} pos={pos} posForm={formations[pos]} roleIds={rolesByCard[c.id] || []}
                selected={selectedPos === pos} onClick={() => onTilePick(pos)} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
