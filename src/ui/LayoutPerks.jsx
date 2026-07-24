import { PERK_DEFS, layoutPerks, rarityMeta } from "../game/perks.js";

/* Aufstellungshilfe (Issue #95): listet die gehaltenen Perks, deren Wirkung von Position/Reihenfolge
   oder Formations-Zugehörigkeit abhängt — damit man beim Aufstellen weiß, worauf es ankommt.
   Genutzt in Formationsphase UND Chronik-Kartenübersicht. */
export function LayoutPerks({ perks }) {
  const ids = layoutPerks(perks);
  if (!ids.length) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "#1b1b22", border: "1px solid #2c2c36" }}>
      <div className="text-[10px] uppercase tracking-wide opacity-50 mb-1">Positions- &amp; Formations-Perks</div>
      <div className="grid gap-0.5">
        {ids.map((id) => (
          <div key={id} className="text-[11px] leading-snug">
            <span className="font-bold" style={{ color: rarityMeta(id).color }}>{PERK_DEFS[id].label}</span>
            <span className="opacity-55"> — {PERK_DEFS[id].desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
