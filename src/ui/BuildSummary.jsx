import { useState } from "react";
import { PERK_DEFS, CATEGORIES, rarityOf, RARITY_META } from "../game/perks.js";
import { SKILL_DEFS } from "../game/skills.js";
import { SUIT_ORDER, suitColor, suitName } from "../game/constants.js";

// Blitz-/Skill-Akzent (wie im Skill-Auswahl-Overlay).
const SKILL_ACCENT = "#8a7de0";

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
              const rar = rarityOf(id);
              const rm = RARITY_META[rar];
              const special = rar !== "common"; // selten/legendär: Raritäts-Farbe + Marke
              return (
                <button key={id} type="button" onClick={() => setOpenPerk(active ? null : id)}
                  className="text-xs px-2 py-0.5 rounded transition-all"
                  style={{ background: active ? `${CATEGORIES[c].color}33` : "#22222b",
                           color: special ? rm.color : undefined,
                           outline: active ? `1px solid ${CATEGORIES[c].color}` : (special ? `1px solid ${rm.color}88` : "none") }}>
                  {rm.mark ? `${rm.mark} ` : ""}{PERK_DEFS[id].label}
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

/* Aktive Skills (Blitz-Archetyp), anklickbar → Beschreibung. Analog zu PerkList (#1). */
export function SkillList({ skills = [], empty = "Noch keine Skills." }) {
  const [openSkill, setOpenSkill] = useState(null);
  const open = openSkill && skills.includes(openSkill) ? SKILL_DEFS[openSkill] : null;
  if (skills.length === 0) return <div className="text-sm opacity-40">{empty}</div>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {skills.map((id) => {
          const s = SKILL_DEFS[id];
          if (!s) return null;
          const active = openSkill === id;
          return (
            <button key={id} type="button" onClick={() => setOpenSkill(active ? null : id)}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{ background: active ? `${SKILL_ACCENT}33` : "#22222b", color: SKILL_ACCENT,
                       outline: active ? `1px solid ${SKILL_ACCENT}` : `1px solid ${SKILL_ACCENT}66` }}>
              ⚡ {s.name}
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-2 rounded-lg p-3 text-sm" style={{ background: "#1e1e26", border: `1px solid ${SKILL_ACCENT}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${SKILL_ACCENT}22`, color: SKILL_ACCENT }}>⚡ BLITZ</span>
            <span className="font-bold" style={{ color: SKILL_ACCENT }}>{open.name}</span>
          </div>
          <div className="opacity-80 leading-snug">{open.desc}</div>
        </div>
      )}
    </div>
  );
}

/* Deck-Werte je Farbe: 4 Zeilen (eine je Farbe), Werte auf der x-Achse, Anzahl als Säulenhöhe.
   Gemeinsame x-Achse (unter der letzten Zeile) + gemeinsame Höhen-Skala über alle Zeilen (#24). */
const ROW_H = 22; // px Säulenhöhe je Farb-Zeile
export function DeckHistogram({ deck }) {
  const counts = {};
  let maxV = 0, maxCount = 1;
  for (const c of deck) {
    (counts[c.value] ||= {});
    const n = (counts[c.value][c.suit] = (counts[c.value][c.suit] || 0) + 1);
    if (n > maxCount) maxCount = n;
    if (c.value > maxV) maxV = c.value;
  }
  const values = Array.from({ length: maxV }, (_, v) => v + 1); // Werte 1..maxV (#34: keine leere 0-Spalte)
  return (
    <div>
      <div className="grid gap-1">
        {SUIT_ORDER.map((su) => (
          <div key={su} className="flex items-end gap-1">
            <div className="w-8 shrink-0 text-[10px] font-bold leading-none pb-0.5" style={{ color: suitColor(su) }}>{suitName(su)}</div>
            <div className="flex-1 flex items-end gap-[2px]" style={{ height: ROW_H }}>
              {values.map((v) => {
                const n = (counts[v] && counts[v][su]) || 0;
                return <div key={v} className="flex-1 rounded-t" title={`${suitName(su)} ${v}: ${n} Karten`}
                  style={{ height: (n / maxCount) * ROW_H, minHeight: n ? 1 : 0, background: suitColor(su) }} />;
              })}
            </div>
          </div>
        ))}
        {/* Gemeinsame x-Achse (Wertebeschriftung), an den Säulen ausgerichtet. */}
        <div className="flex gap-1">
          <div className="w-8 shrink-0" />
          <div className="flex-1 flex gap-[2px]">
            {values.map((v) => (
              <div key={v} className="flex-1 text-center text-[7px] leading-none tabular-nums"
                style={{ color: v > 10 ? "#8a7de0" : undefined, opacity: v > 10 ? 1 : 0.4 }}>{v}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-[10px] opacity-35 mt-1.5">Werte über 10 (violett) überbieten jede Gegnerkarte.</div>
    </div>
  );
}
