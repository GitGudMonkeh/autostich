import { useState } from "react";
import { CATEGORIES, rarityOf, RARITY_META } from "../game/perks.js";

import { tierMeta, romanOf } from "../game/rarity.js";
import { SKILL_DEFS, archetypeOf } from "../game/skills.js";
import { ArchIcon, GlossaryIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { glossaryKeywords } from "../game/glossary.js";
import { SUIT_ORDER, suitColor } from "../game/constants.js";
import { archMeta, familyDef, perkCat, perkDef, skillDef, suitLabel } from "../i18n/labels.js"; // #sprache: Skills/Archetypen/Farben zur Anzeigezeit
import { t, fmtNum } from "../i18n/index.js";
import { glossaryEntry } from "../i18n/glossaryText.js"; // #sprache: Glossartext zur Anzeigezeit

// Archetyp-Meta eines Skills (Icon/Farbe/Label) — Fallback neutral (#93 F1: Feuer & Blitz gemischt).
const ac = (id) => archMeta(archetypeOf(id)) || { label: t("skill.arch.none"), icon: "•", color: "#8a8a95" };

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
    <div className="mt-2 pt-2 text-body-5 grid gap-1" style={{ borderTop: `1px solid ${color}33` }}>
      <div className="flex items-center gap-1.5">
        <span className="opacity-55">{t("zins.capital")}</span>
        <b className="ty-num-sm" style={{ color }}>{fmtNum(Math.round(zins.capital))}</b>
        <span className="opacity-55">{t("zins.rate")}</span>
        <b className="ty-num-sm" style={{ color }}>{Math.round(zins.rate * 100)} %</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-55">{t("zins.payout")}</span>
        <b className="ty-num-sm" style={{ color }}>+{fmtNum(Math.round(zins.capital * zins.rate))}</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-55">{t("zins.paid")}</span>
        <b className="ty-num-sm" style={{ color }}>{fmtNum(Math.round(zins.paidTotal || 0))}</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-55">{t("zins.wins")}</span>
        <b className="ty-num-sm" style={{ color: genommen ? "#4ade80" : "#e0605a" }}>{zins.wins} / {zins.hurdle}</b>
        <span className="opacity-55">{t(genommen ? "zins.cleared" : "zins.crash")}</span>
      </div>
    </div>
  );
}

// `zins` (optional, nur im laufenden Lauf): Kontostand der Zinseszins-Bank { capital, rate, wins, hurdle } — von
// zinsReadout(state) gebaut, damit Panel und Perk-Auswahl dieselbe Quelle nutzen.
/* `empty` als Default-PARAMETER darf `t()` rufen: Default-Werte werden bei jedem Aufruf ausgewertet,
   nicht beim Laden des Moduls — ein Sprachwechsel schlägt also durch (anders als bei einer Modul-Konstante). */
export function PerkList({ perks, familyTiers = {}, empty = t("build.perks.empty"), zins }) {
  const [open, setOpen] = useState(null); // { kind: "perk"|"family", id }
  const isOpen = (kind, id) => open && open.kind === kind && open.id === id;
  const toggle = (kind, id) => setOpen(isOpen(kind, id) ? null : { kind, id });
  // Kombinierte Einträge je Kategorie: flache Perks + gehaltene Familien (Rang > 0).
  const heldFams = Object.entries(familyTiers).filter(([, t]) => t > 0);
  const byCat = {};
  for (const id of perks) (byCat[perkDef(id).cat] ||= []).push({ kind: "perk", id });
  for (const [fid, tier] of heldFams) { const f = familyDef(fid); if (f) (byCat[f.cat] ||= []).push({ kind: "family", id: fid, tier }); }
  const total = perks.length + heldFams.length;
  if (total === 0) return <div className="text-body-lg-5 opacity-40">{empty}</div>;

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
            <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${perkCat(c).color}22`, color: perkCat(c).color }}>{perkCat(c).name}</span>
            {byCat[c].map((it) => {
              const active = isOpen(it.kind, it.id);
              if (it.kind === "family") {
                // Familie: Stufenfarbe (grau/grün/blau/lila) + „Name II".
                const f = familyDef(it.id); const col = (tierMeta(it.tier) || {}).color || perkCat(c).color;
                return (
                  <button key={`fam:${it.id}`} type="button" onClick={() => toggle("family", it.id)}
                    className="text-body-5 px-2 py-0.5 rounded transition-all"
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
                  className="text-body-5 px-2 py-0.5 rounded transition-all"
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
        <div className="mt-2 rounded-lg p-3 text-body-lg-5" style={{ background: "#1e1e26", border: `1px solid ${detail.c}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold"
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

/* (exp skill rework: die #384-Ertragszeile des Funkenflugs ist mit dem Skill gegangen — kein Feuer-Skill schüttet
   mehr einen abgegrenzten Betrag aus, der sich exakt zurechnen ließe.) */

/* Aktive Skills (Archetypen: Blitz/Feuer/…), anklickbar → Beschreibung. Icon/Farbe je Archetyp (#93 F1).
   (Ein `heat`-Prop der Aufrufer wird ignoriert — die Ertragszeile ist weg.) */
export function SkillList({ skills = [], empty = t("build.skills.empty") }) {
  const [openSkill, setOpenSkill] = useState(null);
  const open = openSkill && skills.includes(openSkill) ? skillDef(openSkill) : null;
  if (skills.length === 0) return <div className="text-body-lg-5 opacity-40">{empty}</div>;
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
              className="text-body-5 px-2 py-0.5 rounded transition-all"
              style={{ background: active ? `${c}33` : "#22222b", color: c,
                       outline: active ? `1px solid ${c}` : `1px solid ${c}66` }}>
              <ArchIcon meta={ac(id)} size={13} /> {s.name}
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-2 rounded-lg p-3 text-body-lg-5" style={{ background: "#1e1e26", border: `1px solid ${om.color}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold" style={{ background: `${om.color}22`, color: om.color }}><ArchIcon meta={om} size={11} /> {om.label.toUpperCase()}</span>
            <span className="font-bold" style={{ color: om.color }}>{open.name}</span>
          </div>
          <div className="opacity-80 leading-snug">{open.desc}</div>
          {/* #201 P1: Schlüsselbegriffe des Skills gleich mit erklärt — im Build jederzeit abrufbar. */}
          {glossaryKeywords([open.id], SKILL_DEFS).map((k) => (
            <div key={k} className="text-body-5 leading-snug mt-1.5">
              <span className="font-bold inline-flex items-center gap-1" style={{ color: glossaryEntry(k).color }}><GlossaryIcon e={glossaryEntry(k)} size={12} /> {glossaryEntry(k).label}</span>
              <span className="opacity-70"> — {glossaryEntry(k).text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* #UI: Kompakte Deck-Stärke je Farbe — ein Balken je Farbe (= Durchschnittswert), violettes End-Segment + ◆-Badge =
   Anzahl unschlagbarer Karten (Wert > 10, überbietet jede Gegnerkarte). Ersetzt das platzintensive 4×11-Histogramm
   in der Perk-Auswahl: zeigt Farb-Stärke und Auto-Siege auf einen Blick. */
const UNBEAT = "#8a7de0";
// „Unschlagbar" = Kartenwert über dieser Schwelle (überbietet jede Gegnerkarte). Stand als 10 zweimal da —
// im Filter und ausgeschrieben in der Legende; die Legende interpoliert sie jetzt, statt sie abzutippen.
const UNBEAT_OVER = 10;
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
          const unbeat = vals.filter((v) => v > UNBEAT_OVER).length;
          const col = suitColor(su);
          const fillPct = Math.min(100, (avg / 11) * 100);       // Ø-Wert auf 1..11-Skala
          const overPct = n ? Math.min(100 - fillPct, (unbeat / n) * 100) : 0; // Anteil unschlagbarer Karten als violettes Ende
          return (
            <div key={su} className="flex items-center gap-2 text-body-5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
              <span className="w-8 shrink-0 font-bold leading-none" style={{ color: col }}>{suitLabel(su)}</span>
              <span className="flex-1 rounded-full overflow-hidden flex" style={{ height: 9, background: "#111119" }}>
                <span style={{ width: `${fillPct}%`, background: col }} />
                {overPct > 0 && <span style={{ width: `${overPct}%`, background: UNBEAT }} />}
              </span>
              <span className="shrink-0 w-9 text-right ty-num-sm opacity-70">⌀{avg.toFixed(1).replace(".", ",")}</span>
              <span className="shrink-0 text-meta-1 font-bold px-1.5 py-0.5 rounded leading-none"
                style={unbeat > 0 ? { background: `${UNBEAT}22`, color: UNBEAT, border: `1px solid ${UNBEAT}55` }
                                  : { background: "#1a1a22", color: "#55555f", border: "1px solid #2a2a33" }}>◆{unbeat}</span>
            </div>
          );
        })}
      </div>
      <div className="text-meta-1 opacity-40 mt-2">{t("build.deck.legend", { over: UNBEAT_OVER })}</div>
    </div>
  );
}
