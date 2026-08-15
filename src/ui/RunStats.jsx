import { useState } from "react";
import { PERK_DEFS, CATEGORIES, rarityOf, RARITY_META } from "../game/perks.js";

import { ArchIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { fmtScore, fmtScoreShort } from "./format.js";
import { skillDef, archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit

/* #169 FB-8: wiederverwendbarer Run-Statblock — dieselben Kennzahlen wie im GameOver-/Victory-Screen plus die
   Perk-/Skill-Chips mit klickbarer Beschreibung. Genutzt vom End-Screen (GameOver) UND der Leaderboard-
   Detailansicht (RunDetail), damit beide denselben Satz zeigen — eine Quelle statt Duplikat (#161 FB-2 → FB-8).

   Victory-Redesign: der Block ist in zwei separat platzierbare Teile zerlegt, damit der Victory-Screen dem
   Mockup folgen kann (Kennzahlen in die „Stats"-Sektion, Build-Chips in die „Build"-Sektion):
     • RunStatCells  — die Kennzahl-Kacheln (Winrate/Serie/Bester Stich/Crit-Quote; + Score-Anteile für RunDetail).
     • RunBuildChips — Archetyp-Zusammenfassung + Perk-/Skill-Chips mit klickbarer Beschreibung.
   `RunStats` bleibt der kombinierte Wrapper (Kennzahlen dann Chips) — unveränderte API für RunDetail.

   Graceful degradation: `entry`-Felder sind alle optional. Fehlt eine Zahl (Alt-Eintrag / pre-Migration), zeigt
   die Kachel „–"; leere Perk-/Skill-Listen blenden ihren Block aus. `perks`/`skills` sind ID-Arrays. */
// #241: bigint-Spalten (score/formation_score/crit_bonus_score/best_trick_score/seed) kommen aus der Supabase-REST-API
// als JSON-STRINGS (PostgREST bewahrt so die Präzision) → als Zahl parsen, sonst „–". Lokale Läufe liefern bereits
// echte Zahlen → No-op. Ohne das zeigten fremde/globale Läufe bei den bigint-Kennzahlen leer (und der Crit-Block,
// dessen Sichtbarkeit an bestTrickScore>0 hängt, verschwand ganz).
const num = (v) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
};

/* Kennzahl-Kachel im Karten-Stil (Victory-Redesign) — Rahmen + Label + Wert, nowrap+truncate gegen Overflow. */
function StatCard({ label, value, title, color }) {
  return (
    <div title={title} className="rounded-lg px-3 py-2 min-w-0" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
      <div className="opacity-50 text-[11px] uppercase tracking-wide truncate">{label}</div>
      <div className="font-bold tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-[15px] mt-0.5" style={color ? { color } : undefined}>{value == null ? "–" : value}</div>
    </div>
  );
}

// #205 Anti-Copy: `anonymized` (fremder Board-Eintrag) blendet die konkreten Perk-/Skill-Chips aus — die
// Archetyp-Zusammenfassung (nur Icons/Zahlen) bleibt, aber NICHT die einzelnen Perks/Skills (kein 1:1-Nachbau).

/* Victory-Redesign: die reinen Kennzahl-Kacheln. `sourceCells` blendet die Score-Anteil-Kacheln
   (Form.-Score/Geb.-Score/Crit-Bonus) ein — im Victory-Screen aus (die Score-Herkunft deckt sie oben ab),
   in der Leaderboard-Detailansicht (RunDetail) an (dort gibt es keinen Herkunft-Balken). */
export function RunStatCells({ entry = {}, sourceCells = true }) {
  const bestStreak = num(entry.bestStreak);
  const maxFormations = num(entry.maxFormations);
  const formationScore = num(entry.formationScore);
  const buildingScore = num(entry.buildingScore); // #UI: Score-Anteil aus Architekt-Gebäuden
  const crits = num(entry.crits);
  const wins = num(entry.wins);
  const critBonusScore = num(entry.critBonusScore);
  const bestTrickScore = num(entry.bestTrickScore);
  const bestGlacierTrickScore = num(entry.bestGlacierTrickScore); // bester Gletscher-Stich (Bruch) — nur bei Eis-Läufen > 0
  const tricks = num(entry.tricks); // Gesamtzahl gespielter Stiche → Winrate-Nenner (auch im gespeicherten Eintrag vorhanden)

  const winrate = wins != null && tricks != null && tricks > 0 ? `${Math.round((wins / tricks) * 100)} %` : null;
  const critQuote = crits != null && wins != null && wins > 0 ? `${Math.round((crits / wins) * 100)} %` : (crits != null ? "0 %" : null);
  const shortOrNull = (v) => (v == null ? null : fmtScoreShort(v));
  const fullTitle = (desc, v) => (v == null ? desc : desc ? `${desc} · ${fmtScore(v)}` : fmtScore(v));

  return (
    <>
      {/* Kern-Kennzahlen (schlank, wie Mockup A): Winrate · Beste Serie · Bester Stich · Crit-Quote. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Winrate" value={winrate} title="Anteil gewonnener Stiche" color="#5cc88a" />
        <StatCard label="Beste Serie" value={bestStreak == null ? null : `${bestStreak}×`} title="Längste Siegesserie" />
        <StatCard label="Bester Stich" value={shortOrNull(bestTrickScore)} title={fullTitle("Höchster Score aus einem Stich", bestTrickScore)} color="#d4a63a" />
        <StatCard label="Crit-Quote" value={critQuote} title="Anteil Stiche mit kritischem Treffer" color="#e879f9" />
      </div>

      {/* #UI: Gletscher-Stich hat seine EIGENE Bestmarke (der Bruch-Score fließt nicht in „Bester Stich"). Nur zeigen,
          wenn im Lauf überhaupt ein Gletscher brach (> 0) → bei Nicht-Eis-Läufen bleibt die Kachel aus. */}
      {bestGlacierTrickScore != null && bestGlacierTrickScore > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <StatCard label="Bester Gletscherstich" value={shortOrNull(bestGlacierTrickScore)}
            title={fullTitle("Höchster Score aus einem Gletscher-Stich (Bruch)", bestGlacierTrickScore)} color="#5ec8f0" />
        </div>
      )}

      {/* Score-Anteil-Kacheln — nur in der Detailansicht (im Victory-Screen deckt die Score-Herkunft das ab). */}
      {sourceCells && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          <StatCard label="Formationen" value={maxFormations} title="Maximal gleichzeitig aktive Formationen" color="#5ab87a" />
          <StatCard label="Form.-Score" value={shortOrNull(formationScore)} title={fullTitle("Score-Anteil aus Formations-Multiplikatoren", formationScore)} color="#5ab87a" />
          <StatCard label="Geb.-Score" value={shortOrNull(buildingScore)} title={fullTitle("Score-Anteil aus Architekt-Gebäuden", buildingScore)} color="#5a8ade" />
          <StatCard label="Crit-Bonus" value={shortOrNull(critBonusScore)} title={fullTitle("Score-Anteil aus kritischen Treffern", critBonusScore)} color="#e879f9" />
        </div>
      )}
    </>
  );
}

/* Victory-Redesign: die Build-Chips — Archetyp-Zusammenfassung (aus den Skills abgeleitet) + Perk-/Skill-Chips
   mit klickbarer Beschreibung. `anonymized` (fremder Board-Eintrag) zeigt nur die Archetyp-Zusammenfassung. */
export function RunBuildChips({ entry = {}, anonymized = false }) {
  // null = unbekannt (Alt-Eintrag ohne die Spalte) → nicht rendern; [] = bekannt leer.
  const perks = Array.isArray(entry.perks) ? entry.perks : null;
  const skills = Array.isArray(entry.skills) ? entry.skills : null;

  // Archetyp-Zusammenfassung: Skills nach Archetyp gruppieren + zählen (z. B. Eis ×4 · Pflanze ×3).
  const archCounts = [];
  if (skills && skills.length) {
    const by = {};
    for (const id of skills) { const a = skillDef(id)?.archetype; if (a) by[a] = (by[a] || 0) + 1; }
    for (const a of Object.keys(by)) { const m = archMeta(a); if (m) archCounts.push({ ...m, n: by[a] }); }
    archCounts.sort((x, y) => y.n - x.n);
  }

  const [sel, setSel] = useState(null); // { kind, id } | null
  const toggle = (kind, id) => setSel((s) => (s && s.kind === kind && s.id === id ? null : { kind, id }));
  const selDetail = !sel ? null
    : sel.kind === "perk"
      ? (PERK_DEFS[sel.id] ? { title: PERK_DEFS[sel.id].label, desc: PERK_DEFS[sel.id].desc, color: RARITY_META[rarityOf(sel.id)].color } : null)
      : (skillDef(sel.id) ? { title: skillDef(sel.id).name, desc: skillDef(sel.id).desc, color: (archMeta(skillDef(sel.id).archetype) || {}).color || "#8a8a95" } : null);

  const hasChips = (perks && perks.length > 0) || (skills && skills.length > 0);
  if (!archCounts.length && !(!anonymized && hasChips)) return null;

  return (
    <div>
      {/* Archetyp-Zusammenfassung — auch bei anonymized sichtbar (nur Icons/Zahlen, kein 1:1-Nachbau). */}
      {archCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {archCounts.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: `${a.color}1f`, color: a.color, border: `1px solid ${a.color}55` }}>
              <ArchIcon meta={a} size={13} /> {a.label} ×{a.n}
            </span>
          ))}
        </div>
      )}

      {!anonymized && hasChips && (
        <div className="mt-3">
          {perks && perks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {perks.map((id) => {
                const def = PERK_DEFS[id];
                if (!def) return null;
                const cc = CATEGORIES[def.cat]?.color || "#8a8a95";
                const rar = rarityOf(id);
                const rm = RARITY_META[rar];
                const on = sel && sel.kind === "perk" && sel.id === id;
                return (
                  <button key={id} onClick={() => toggle("perk", id)} title="Beschreibung anzeigen"
                    className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background: `${cc}22`, color: cc, border: `1px solid ${on ? cc : rar !== "common" ? rm.color : "transparent"}` }}>
                    {rm.mark ? `${rm.mark} ` : ""}{def.label}
                  </button>
                );
              })}
            </div>
          )}
          {skills && skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-1.5">
              {skills.map((id) => {
                const d = skillDef(id);
                if (!d) return null;
                const am = archMeta(d.archetype) || { color: "#8a8a95", icon: "" };
                const on = sel && sel.kind === "skill" && sel.id === id;
                return (
                  <button key={id} onClick={() => toggle("skill", id)} title="Beschreibung anzeigen"
                    className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background: `${am.color}22`, color: am.color, border: `1px solid ${on ? am.color : d.legendary ? "#d4a63a" : "transparent"}` }}>
                    <ArchIcon meta={am} size={13} /> {d.legendary ? "★ " : ""}{d.name}
                  </button>
                );
              })}
            </div>
          )}
          {selDetail && (
            <div className="mt-2 rounded-lg px-3 py-2 text-xs leading-snug" style={{ background: "#0e0e13", border: `1px solid ${selDetail.color}55` }}>
              <span className="font-bold" style={{ color: selDetail.color }}>{selDetail.title}</span>
              <span className="opacity-80"> — {selDetail.desc}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Kombinierter Wrapper — Kennzahlen dann Build-Chips. Genutzt von der Leaderboard-Detailansicht (RunDetail);
   der Victory-Screen platziert RunStatCells und RunBuildChips separat (Stats- vs. Build-Sektion). */
export function RunStats({ entry = {}, anonymized = false }) {
  return (
    <>
      <RunStatCells entry={entry} sourceCells />
      <div className="mt-4"><RunBuildChips entry={entry} anonymized={anonymized} /></div>
    </>
  );
}
