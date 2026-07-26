import { useState } from "react";
import { PERK_DEFS, CATEGORIES, rarityOf, RARITY_META } from "../game/perks.js";
import { familyDef } from "../game/families.js";
import { tierMeta, romanOf } from "../game/rarity.js";
import { SKILL_DEFS, ARCHETYPE_META, archetypeOf } from "../game/skills.js";
import { SUIT_ORDER, suitColor, suitName } from "../game/constants.js";

// Archetyp-Meta eines Skills (Icon/Farbe/Label) — Fallback neutral (#93 F1: Feuer & Blitz gemischt).
const ac = (id) => ARCHETYPE_META[archetypeOf(id)] || { label: "Skill", icon: "•", color: "#8a8a95" };

/* Gemeinsame Build-Kontext-Bausteine (#22): geteilt von BuildPanel und PerkSelect. */

/* Aktive Perks & Familien je Kategorie, anklickbar → Beschreibung (#1). Klick löst keine Auswahl aus.
   Rarität #167: `familyTiers` mischt gehaltene Familien (Name + römische Stufe, Stufenfarbe) unter die flachen Perks. */
export function PerkList({ perks, familyTiers = {}, empty = "Noch keine Perks." }) {
  const [open, setOpen] = useState(null); // { kind: "perk"|"family", id }
  const isOpen = (kind, id) => open && open.kind === kind && open.id === id;
  const toggle = (kind, id) => setOpen(isOpen(kind, id) ? null : { kind, id });
  // Kombinierte Einträge je Kategorie: flache Perks + gehaltene Familien (Rang > 0).
  const heldFams = Object.entries(familyTiers).filter(([, t]) => t > 0);
  const byCat = {};
  for (const id of perks) (byCat[PERK_DEFS[id].cat] ||= []).push({ kind: "perk", id });
  for (const [fid, tier] of heldFams) { const f = familyDef(fid); if (f) (byCat[f.cat] ||= []).push({ kind: "family", id: fid, tier }); }
  const total = perks.length + heldFams.length;
  if (total === 0) return <div className="text-sm opacity-40">{empty}</div>;

  // Detail-Panel des aufgeklappten Eintrags (Perk oder Familien-Stufe).
  let detail = null;
  if (open && open.kind === "perk" && perks.includes(open.id)) {
    const p = PERK_DEFS[open.id]; const c = CATEGORIES[p.cat].color;
    detail = { c, cat: CATEGORIES[p.cat].name, name: p.label, desc: p.desc };
  } else if (open && open.kind === "family") {
    const f = familyDef(open.id); const tier = familyTiers[open.id];
    if (f && tier) { const c = (tierMeta(tier) || {}).color || CATEGORIES[f.cat].color;
      detail = { c, cat: CATEGORIES[f.cat].name, name: `${f.name} ${romanOf(tier)}`, desc: (f.tiers[tier] || {}).desc || "" }; }
  }

  return (
    <div>
      <div className="grid gap-2">
        {Object.keys(CATEGORIES).filter((c) => byCat[c]).map((c) => (
          <div key={c} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${CATEGORIES[c].color}22`, color: CATEGORIES[c].color }}>{CATEGORIES[c].name}</span>
            {byCat[c].map((it) => {
              const active = isOpen(it.kind, it.id);
              if (it.kind === "family") {
                // Familie: Stufenfarbe (grau/grün/blau/lila) + „Name II".
                const f = familyDef(it.id); const col = (tierMeta(it.tier) || {}).color || CATEGORIES[c].color;
                return (
                  <button key={`fam:${it.id}`} type="button" onClick={() => toggle("family", it.id)}
                    className="text-xs px-2 py-0.5 rounded transition-all"
                    style={{ background: active ? `${col}33` : "#22222b", color: col,
                             outline: active ? `1px solid ${col}` : `1px solid ${col}88` }}>
                    {f.name} {romanOf(it.tier)}
                  </button>
                );
              }
              const rar = rarityOf(it.id);
              const rm = RARITY_META[rar];
              const special = rar !== "common"; // selten/legendär: Raritäts-Farbe + Marke
              return (
                <button key={`perk:${it.id}`} type="button" onClick={() => toggle("perk", it.id)}
                  className="text-xs px-2 py-0.5 rounded transition-all"
                  style={{ background: active ? `${CATEGORIES[c].color}33` : "#22222b",
                           color: special ? rm.color : undefined,
                           outline: active ? `1px solid ${CATEGORIES[c].color}` : (special ? `1px solid ${rm.color}88` : "none") }}>
                  {rm.mark ? `${rm.mark} ` : ""}{PERK_DEFS[it.id].label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {detail && (
        <div className="mt-2 rounded-lg p-3 text-sm" style={{ background: "#1e1e26", border: `1px solid ${detail.c}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${detail.c}22`, color: detail.c }}>{detail.cat}</span>
            <span className="font-bold" style={{ color: detail.c }}>{detail.name}</span>
          </div>
          <div className="opacity-80 leading-snug">{detail.desc}</div>
        </div>
      )}
    </div>
  );
}

/* Aktive Skills (Archetypen: Blitz/Feuer/…), anklickbar → Beschreibung. Icon/Farbe je Archetyp (#93 F1). */
export function SkillList({ skills = [], empty = "Noch keine Skills." }) {
  const [openSkill, setOpenSkill] = useState(null);
  const open = openSkill && skills.includes(openSkill) ? SKILL_DEFS[openSkill] : null;
  if (skills.length === 0) return <div className="text-sm opacity-40">{empty}</div>;
  const om = open ? ac(open.id) : null; // Archetyp-Meta des aufgeklappten Skills
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {skills.map((id) => {
          const s = SKILL_DEFS[id];
          if (!s) return null;
          const active = openSkill === id;
          const c = ac(id).color;
          return (
            <button key={id} type="button" onClick={() => setOpenSkill(active ? null : id)}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{ background: active ? `${c}33` : "#22222b", color: c,
                       outline: active ? `1px solid ${c}` : `1px solid ${c}66` }}>
              {ac(id).icon} {s.name}
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-2 rounded-lg p-3 text-sm" style={{ background: "#1e1e26", border: `1px solid ${om.color}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${om.color}22`, color: om.color }}>{om.icon} {om.label.toUpperCase()}</span>
            <span className="font-bold" style={{ color: om.color }}>{open.name}</span>
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
