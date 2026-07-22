import { useState } from "react";
import { PERK_DEFS, CATEGORIES } from "../game/perks.js";
import { SUIT_ORDER, suitColor, suitName } from "../game/constants.js";

/* Gemeinsame Build-Kontext-Bausteine (#22): geteilt von BuildPanel und PerkSelect. */

/* Aktive Perks je Kategorie, anklickbar → Beschreibung (#1). Klick löst keine Auswahl aus. */
export function PerkList({ perks, empty = "Noch keine Perks." }) {
  const [openPerk, setOpenPerk] = useState(null);
  const byCat = {};
  for (const id of perks) (byCat[PERK_DEFS[id].cat] ||= []).push(id);
  const open = openPerk && perks.includes(openPerk) ? PERK_DEFS[openPerk] : null;
  if (perks.length === 0) return <div className="text-sm opacity-40">{empty}</div>;
  return (
    <div>
      <div className="grid gap-2">
        {Object.keys(CATEGORIES).filter((c) => byCat[c]).map((c) => (
          <div key={c} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${CATEGORIES[c].color}22`, color: CATEGORIES[c].color }}>{CATEGORIES[c].name}</span>
            {byCat[c].map((id) => {
              const active = openPerk === id;
              return (
                <button key={id} type="button" onClick={() => setOpenPerk(active ? null : id)}
                  className="text-xs px-2 py-0.5 rounded transition-all"
                  style={{ background: active ? `${CATEGORIES[c].color}33` : "#22222b", outline: active ? `1px solid ${CATEGORIES[c].color}` : "none" }}>
                  {PERK_DEFS[id].label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {open && (
        <div className="mt-2 rounded-lg p-3 text-sm" style={{ background: "#1e1e26", border: `1px solid ${CATEGORIES[open.cat].color}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${CATEGORIES[open.cat].color}22`, color: CATEGORIES[open.cat].color }}>{CATEGORIES[open.cat].name}</span>
            <span className="font-bold" style={{ color: CATEGORIES[open.cat].color }}>{open.label}</span>
          </div>
          <div className="opacity-80 leading-snug">{open.desc}</div>
        </div>
      )}
    </div>
  );
}

/* Deck-Werte je Farbe: 4 Spalten, je eigenes Histogramm (Zeilen 0..max, gemeinsame Skala, #17). */
export function DeckHistogram({ deck }) {
  const counts = {};
  let maxV = 0, cellMax = 1;
  for (const c of deck) {
    (counts[c.value] ||= {});
    const n = (counts[c.value][c.suit] = (counts[c.value][c.suit] || 0) + 1);
    if (n > cellMax) cellMax = n;
    if (c.value > maxV) maxV = c.value;
  }
  const values = Array.from({ length: maxV + 1 }, (_, v) => v);
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {SUIT_ORDER.map((su) => (
          <div key={su} className="flex flex-col gap-[2px]">
            <div className="text-[10px] font-bold text-center leading-none mb-0.5" style={{ color: suitColor(su) }}>{suitName(su)}</div>
            {values.map((v) => {
              const n = (counts[v] && counts[v][su]) || 0;
              return (
                <div key={v} className="flex items-center gap-1" title={`${suitName(su)} ${v}: ${n} Karten`}>
                  <span className="text-[7px] w-3 text-right leading-none tabular-nums"
                    style={{ color: v > 12 ? "#8a7de0" : undefined, opacity: v > 12 ? 1 : 0.4 }}>{v}</span>
                  <div className="flex-1 rounded-sm overflow-hidden" style={{ height: 6, background: "#20202a" }}>
                    {n > 0 && <div className="h-full rounded-sm" style={{ width: `${(n / cellMax) * 100}%`, background: suitColor(su) }} />}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-[10px] opacity-35 mt-1.5">Werte über 12 (violett) überbieten jede Gegnerkarte.</div>
    </div>
  );
}
