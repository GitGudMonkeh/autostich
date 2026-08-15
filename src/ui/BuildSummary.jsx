import { useState } from "react";
import { CATEGORIES, rarityOf, RARITY_META } from "../game/perks.js";

import { tierMeta, romanOf } from "../game/rarity.js";
import { SKILL_DEFS, archetypeOf } from "../game/skills.js";
import { FactionIcon, ArchIcon, FACTION_ICON_SRC } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { glossaryKeywords } from "../game/glossary.js";
import { SUIT_ORDER, suitColor, suitName } from "../game/constants.js";
import { archMeta, familyDef, perkCat, perkDef, skillDef } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { glossaryEntry } from "../i18n/glossaryText.js"; // #sprache: Glossartext zur Anzeigezeit

// Archetyp-Meta eines Skills (Icon/Farbe/Label) — Fallback neutral (#93 F1: Feuer & Blitz gemischt).
const ac = (id) => archMeta(archetypeOf(id)) || { label: "Skill", icon: "•", color: "#8a8a95" };

/* Gemeinsame Build-Kontext-Bausteine (#22): geteilt von BuildPanel und PerkSelect. */

/* Aktive Perks & Familien je Kategorie, anklickbar → Beschreibung (#1). Klick löst keine Auswahl aus.
   Rarität #167: `familyTiers` mischt gehaltene Familien (Name + römische Stufe, Stufenfarbe) unter die flachen Perks. */
/* #240: Zinseszins-Bank — Kontostand im laufenden Lauf (nur mit Perk im Build; außerhalb eines Laufs `zins` = null).
   Zeigt die drei Größen, die die Entscheidung tragen: was auf dem Konto liegt, zu welchem Satz es arbeitet und wie
   weit der laufende Durchlauf von der Hürde entfernt ist (darunter = Crash). Eigene Komponente, damit der Readout
   ohne Klick-Interaktion des Detail-Panels renderbar/prüfbar ist. */
export function ZinsReadout({ zins, color = "#5ab87a" }) {
  if (!zins) return null;
  const genommen = zins.wins >= zins.hurdle;
  return (
    <div className="mt-2 pt-2 text-xs font-mono grid gap-1" style={{ borderTop: `1px solid ${color}33` }}>
      <div className="flex items-center gap-1.5">
        <span className="opacity-55">Kapital:</span>
        <b style={{ color }}>{Math.round(zins.capital).toLocaleString("de-DE")}</b>
        <span className="opacity-55">· Zinssatz</span>
        <b style={{ color }}>{Math.round(zins.rate * 100)} %</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-55">Auszahlung bei Erfolg:</span>
        <b style={{ color }}>+{Math.round(zins.capital * zins.rate).toLocaleString("de-DE")}</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-55">Siege dieser Durchlauf:</span>
        <b style={{ color: genommen ? "#4ade80" : "#e0605a" }}>{zins.wins} / {zins.hurdle}</b>
        <span className="opacity-55">{genommen ? "· Hürde genommen" : "· sonst Crash"}</span>
      </div>
    </div>
  );
}

// `zins` (optional, nur im laufenden Lauf): Kontostand der Zinseszins-Bank { capital, rate, wins, hurdle } — von
// zinsReadout(state) gebaut, damit Panel und Perk-Auswahl dieselbe Quelle nutzen.
export function PerkList({ perks, familyTiers = {}, empty = "Noch keine Perks.", zins }) {
  const [open, setOpen] = useState(null); // { kind: "perk"|"family", id }
  const isOpen = (kind, id) => open && open.kind === kind && open.id === id;
  const toggle = (kind, id) => setOpen(isOpen(kind, id) ? null : { kind, id });
  // Kombinierte Einträge je Kategorie: flache Perks + gehaltene Familien (Rang > 0).
  const heldFams = Object.entries(familyTiers).filter(([, t]) => t > 0);
  const byCat = {};
  for (const id of perks) (byCat[perkDef(id).cat] ||= []).push({ kind: "perk", id });
  for (const [fid, tier] of heldFams) { const f = familyDef(fid); if (f) (byCat[f.cat] ||= []).push({ kind: "family", id: fid, tier }); }
  const total = perks.length + heldFams.length;
  if (total === 0) return <div className="text-sm opacity-40">{empty}</div>;

  // Detail-Panel des aufgeklappten Eintrags (Perk oder Familien-Stufe).
  let detail = null;
  if (open && open.kind === "perk" && perks.includes(open.id)) {
    const p = perkDef(open.id); const c = perkCat(p.cat).color;
    detail = { c, cat: perkCat(p.cat).name, name: p.label, desc: p.desc };
  } else if (open && open.kind === "family") {
    const f = familyDef(open.id); const tier = familyTiers[open.id];
    if (f && tier) { const c = (tierMeta(tier) || {}).color || perkCat(f.cat).color;
      detail = { c, cat: perkCat(f.cat).name, name: `${f.name} ${romanOf(tier)}`, desc: (f.tiers[tier] || {}).desc || "" }; }
  }

  return (
    <div>
      <div className="grid gap-2">
        {Object.keys(CATEGORIES).filter((c) => byCat[c]).map((c) => (
          <div key={c} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${perkCat(c).color}22`, color: perkCat(c).color }}>{perkCat(c).name}</span>
            {byCat[c].map((it) => {
              const active = isOpen(it.kind, it.id);
              if (it.kind === "family") {
                // Familie: Stufenfarbe (grau/grün/blau/lila) + „Name II".
                const f = familyDef(it.id); const col = (tierMeta(it.tier) || {}).color || perkCat(c).color;
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
                  style={{ background: active ? `${perkCat(c).color}33` : "#22222b",
                           color: special ? rm.color : undefined,
                           outline: active ? `1px solid ${perkCat(c).color}` : (special ? `1px solid ${rm.color}88` : "none") }}>
                  {rm.mark ? `${rm.mark} ` : ""}{perkDef(it.id).label}
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
          {open && open.kind === "perk" && perkDef(open.id)?.zinseszins && <ZinsReadout zins={zins} color={detail.c} />}
        </div>
      )}
    </div>
  );
}

/* Aktive Skills (Archetypen: Blitz/Feuer/…), anklickbar → Beschreibung. Icon/Farbe je Archetyp (#93 F1). */
export function SkillList({ skills = [], empty = "Noch keine Skills." }) {
  const [openSkill, setOpenSkill] = useState(null);
  const open = openSkill && skills.includes(openSkill) ? skillDef(openSkill) : null;
  if (skills.length === 0) return <div className="text-sm opacity-40">{empty}</div>;
  const om = open ? ac(open.id) : null; // Archetyp-Meta des aufgeklappten Skills
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {skills.map((id) => {
          const s = skillDef(id);
          if (!s) return null;
          const active = openSkill === id;
          const c = ac(id).color;
          return (
            <button key={id} type="button" onClick={() => setOpenSkill(active ? null : id)}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{ background: active ? `${c}33` : "#22222b", color: c,
                       outline: active ? `1px solid ${c}` : `1px solid ${c}66` }}>
              <ArchIcon meta={ac(id)} size={13} /> {s.name}
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-2 rounded-lg p-3 text-sm" style={{ background: "#1e1e26", border: `1px solid ${om.color}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${om.color}22`, color: om.color }}><ArchIcon meta={om} size={11} /> {om.label.toUpperCase()}</span>
            <span className="font-bold" style={{ color: om.color }}>{open.name}</span>
          </div>
          <div className="opacity-80 leading-snug">{open.desc}</div>
          {/* #201 P1: Schlüsselbegriffe des Skills gleich mit erklärt — im Build jederzeit abrufbar. */}
          {glossaryKeywords([open.id], SKILL_DEFS).map((k) => (
            <div key={k} className="text-xs leading-snug mt-1.5">
              <span className="font-bold inline-flex items-center gap-1" style={{ color: glossaryEntry(k).color }}>{FACTION_ICON_SRC[glossaryEntry(k).group] ? <FactionIcon type={glossaryEntry(k).group} size={12} /> : glossaryEntry(k).icon} {glossaryEntry(k).label}</span>
              <span className="opacity-70"> — {glossaryEntry(k).text}</span>
            </div>
          ))}
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

/* #UI: Kompakte Deck-Stärke je Farbe — ein Balken je Farbe (= Durchschnittswert), violettes End-Segment + ◆-Badge =
   Anzahl unschlagbarer Karten (Wert > 10, überbietet jede Gegnerkarte). Ersetzt das platzintensive 4×11-Histogramm
   in der Perk-Auswahl: zeigt Farb-Stärke und Auto-Siege auf einen Blick. */
const UNBEAT = "#8a7de0";
export function DeckStrength({ deck = [] }) {
  const bySuit = {};
  for (const c of deck) (bySuit[c.suit] ||= []).push(c.value);
  return (
    <div>
      <div className="grid gap-2">
        {SUIT_ORDER.map((su) => {
          const vals = bySuit[su] || [];
          const n = vals.length;
          const avg = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
          const unbeat = vals.filter((v) => v > 10).length;
          const col = suitColor(su);
          const fillPct = Math.min(100, (avg / 11) * 100);       // Ø-Wert auf 1..11-Skala
          const overPct = n ? Math.min(100 - fillPct, (unbeat / n) * 100) : 0; // Anteil unschlagbarer Karten als violettes Ende
          return (
            <div key={su} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
              <span className="w-8 shrink-0 font-bold leading-none" style={{ color: col }}>{suitName(su)}</span>
              <span className="flex-1 rounded-full overflow-hidden flex" style={{ height: 9, background: "#111119" }}>
                <span style={{ width: `${fillPct}%`, background: col }} />
                {overPct > 0 && <span style={{ width: `${overPct}%`, background: UNBEAT }} />}
              </span>
              <span className="shrink-0 w-9 text-right tabular-nums opacity-70">⌀{avg.toFixed(1).replace(".", ",")}</span>
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none"
                style={unbeat > 0 ? { background: `${UNBEAT}22`, color: UNBEAT, border: `1px solid ${UNBEAT}55` }
                                  : { background: "#1a1a22", color: "#55555f", border: "1px solid #2a2a33" }}>◆{unbeat}</span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] opacity-40 mt-2">Balken = Ø-Wert · violett ◆ = unschlagbar (&gt;10, überbietet jede Gegnerkarte).</div>
    </div>
  );
}
