import { useState } from "react";
import { PERK_DEFS, CATEGORIES } from "../game/perks.js";
import { SUIT_ORDER, suitColor, suitName } from "../game/constants.js";

/* Zeigt den wachsenden Build: gewählte Perks je Kategorie + die aktuelle
   Deck-Wert-Verteilung (macht Kat.-A-Mods sichtbar — Testfrage §8).
   Klick auf einen Perk blendet seine Beschreibung ein (#1). */
export function BuildPanel({ perks, deck }) {
  const [openPerk, setOpenPerk] = useState(null);
  const byCat = {};
  for (const id of perks) (byCat[PERK_DEFS[id].cat] ||= []).push(id);
  const open = openPerk && perks.includes(openPerk) ? PERK_DEFS[openPerk] : null;

  // Deck-Wert-Histogramm, nach Farben (Suits) aufgeschlüsselt (#13): counts[value][suit].
  const counts = {};
  let maxV = 0;
  for (const c of deck) {
    (counts[c.value] ||= {});
    counts[c.value][c.suit] = (counts[c.value][c.suit] || 0) + 1;
    maxV = Math.max(maxV, c.value);
  }
  const totalAt = (v) => SUIT_ORDER.reduce((s, su) => s + ((counts[v] && counts[v][su]) || 0), 0);
  const values = Array.from({ length: maxV + 1 }, (_, v) => v);
  const maxCount = Math.max(1, ...values.map(totalAt));

  return (
    <div className="rounded-xl p-4 grid gap-4" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div>
        <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
          Build — {perks.length} Perk{perks.length === 1 ? "" : "s"}
        </div>
        {perks.length === 0 ? (
          <div className="text-sm opacity-40">Noch keine Perks. Sammle XP für dein erstes Level-Up.</div>
        ) : (
          <div className="grid gap-2">
            {Object.keys(CATEGORIES).filter((c) => byCat[c]).map((c) => (
              <div key={c} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: `${CATEGORIES[c].color}22`, color: CATEGORIES[c].color }}>
                  {CATEGORIES[c].name}
                </span>
                {byCat[c].map((id) => {
                  const active = openPerk === id;
                  return (
                    <button key={id} onClick={() => setOpenPerk(active ? null : id)}
                      className="text-xs px-2 py-0.5 rounded transition-all"
                      style={{
                        background: active ? `${CATEGORIES[c].color}33` : "#22222b",
                        outline: active ? `1px solid ${CATEGORIES[c].color}` : "none",
                      }}>
                      {PERK_DEFS[id].label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {open && (
          <div className="mt-2 rounded-lg p-3 text-sm" style={{ background: "#1e1e26", border: `1px solid ${CATEGORIES[open.cat].color}55` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: `${CATEGORIES[open.cat].color}22`, color: CATEGORIES[open.cat].color }}>
                {CATEGORIES[open.cat].name}
              </span>
              <span className="font-bold" style={{ color: CATEGORIES[open.cat].color }}>{open.label}</span>
            </div>
            <div className="opacity-80 leading-snug">{open.desc}</div>
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Deck-Werte nach Farbe (52 Karten)</div>
        <div className="flex items-end gap-[3px]" style={{ height: 60 }}>
          {values.map((v) => {
            const total = totalAt(v);
            return (
              <div key={v} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full flex flex-col-reverse rounded-t overflow-hidden"
                  style={{ height: `${(total / maxCount) * 100}%`, minHeight: total ? 2 : 0 }}>
                  {SUIT_ORDER.map((su) => {
                    const n = (counts[v] && counts[v][su]) || 0;
                    if (!n) return null;
                    return <div key={su} style={{ height: `${(n / total) * 100}%`, background: suitColor(su) }}
                      title={`${suitName(su)} ${v}: ${n} Karten`} />;
                  })}
                </div>
                <div className="text-[8px] mt-0.5" style={{ color: v > 12 ? "#8a7de0" : undefined, opacity: v > 12 ? 1 : 0.4 }}>{v}</div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          {SUIT_ORDER.map((su) => (
            <span key={su} className="inline-flex items-center gap-1 text-[10px] opacity-70">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: suitColor(su), display: "inline-block" }} />
              {suitName(su)}
            </span>
          ))}
        </div>
        <div className="text-[10px] opacity-35 mt-1">Werte über 12 (violett markiert) überbieten jede Gegnerkarte.</div>
      </div>
    </div>
  );
}
