import { useState } from "react";
import { PERK_DEFS, CATEGORIES, rarityOf, RARITY_META } from "../game/perks.js";
import { SKILL_DEFS, ARCHETYPE_META } from "../game/skills.js";
import { fmtScore } from "./format.js";

/* #169 FB-8: wiederverwendbarer Run-Statblock — dieselben Kennzahlen wie im GameOver-/Victory-Screen
   (Beste Serie · Perks · Formationen · Form.-Score · Crits/Quote/Bonus · Bester Stich) plus die Perk-/Skill-
   Chips mit klickbarer Beschreibung. Genutzt vom End-Screen (GameOver) UND der Leaderboard-Detailansicht
   (RunDetail), damit beide denselben Satz zeigen — eine Quelle statt Duplikat (#161 FB-2 → FB-8).

   Graceful degradation: `entry`-Felder sind alle optional. Fehlt eine Zahl (Alt-Eintrag / pre-Migration), zeigt
   die Kachel „–"; leere Perk-/Skill-Listen blenden ihren Block aus. `perks`/`skills` sind ID-Arrays. */
const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : null);
// #205 Anti-Copy: `anonymized` (fremder Board-Eintrag) blendet die Perk-/Skill-Chips aus — man sieht Kennzahlen
// + Archetyp-Icons + Score/Seed, aber NICHT die konkreten Perks/Skills (kein 1:1-Nachbauen fremder Runs).
// Eigene/lokale Läufe (anonymized=false, Default) bleiben voll aufgeschlüsselt (Selbst-Review).
export function RunStats({ entry = {}, anonymized = false }) {
  // null = unbekannt (Alt-Eintrag ohne die Spalte) → „–"; [] = bekannt leer → „0".
  const perks = Array.isArray(entry.perks) ? entry.perks : null;
  const skills = Array.isArray(entry.skills) ? entry.skills : null;
  const bestStreak = num(entry.bestStreak);
  const maxFormations = num(entry.maxFormations);
  const formationScore = num(entry.formationScore);
  const crits = num(entry.crits);
  const wins = num(entry.wins);
  const critBonusScore = num(entry.critBonusScore);
  const bestTrickScore = num(entry.bestTrickScore);

  const [sel, setSel] = useState(null); // { kind, id } | null
  const toggle = (kind, id) => setSel((s) => (s && s.kind === kind && s.id === id ? null : { kind, id }));
  const selDetail = !sel ? null
    : sel.kind === "perk"
      ? (PERK_DEFS[sel.id] ? { title: PERK_DEFS[sel.id].label, desc: PERK_DEFS[sel.id].desc, color: RARITY_META[rarityOf(sel.id)].color } : null)
      : (SKILL_DEFS[sel.id] ? { title: SKILL_DEFS[sel.id].name, desc: SKILL_DEFS[sel.id].desc, color: (ARCHETYPE_META[SKILL_DEFS[sel.id].archetype] || {}).color || "#8a8a95" } : null);

  const cell = (label, value, title, color) => (
    <div title={title}><div className="opacity-50 text-xs">{label}</div>
      <div className="font-bold" style={color ? { color } : undefined}>{value == null ? "–" : value}</div></div>
  );
  const critQuote = crits != null && wins != null && wins > 0 ? `${Math.round((crits / wins) * 100)}%` : (crits != null ? "0%" : null);

  return (
    <>
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        {cell("Beste Serie", bestStreak == null ? null : `${bestStreak}×`)}
        {cell("Perks", perks == null ? null : perks.length)}
        {cell("Formationen", maxFormations, "Maximal gleichzeitig aktive Formationen im Run", "#5ab87a")}
        {cell("Form.-Score", formationScore == null ? null : fmtScore(formationScore), "Score-Anteil aus Formations-Multiplikatoren", "#5ab87a")}
      </div>

      {bestTrickScore != null && bestTrickScore > 0 && (
        <div className="grid grid-cols-4 gap-2 text-center mt-3 text-sm">
          {cell("Crits", crits, undefined, "#e879f9")}
          {cell("Crit-Quote", critQuote, undefined, "#e879f9")}
          {cell("Crit-Bonus", critBonusScore == null ? null : fmtScore(critBonusScore), undefined, "#e879f9")}
          {cell("Bester Stich", bestTrickScore == null ? null : fmtScore(bestTrickScore), undefined, "#d4a63a")}
        </div>
      )}

      {!anonymized && ((perks && perks.length > 0) || (skills && skills.length > 0)) && (
        <div className="mt-4">
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
                const d = SKILL_DEFS[id];
                if (!d) return null;
                const am = ARCHETYPE_META[d.archetype] || { color: "#8a8a95", icon: "" };
                const on = sel && sel.kind === "skill" && sel.id === id;
                return (
                  <button key={id} onClick={() => toggle("skill", id)} title="Beschreibung anzeigen"
                    className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background: `${am.color}22`, color: am.color, border: `1px solid ${on ? am.color : d.legendary ? "#d4a63a" : "transparent"}` }}>
                    {am.icon} {d.legendary ? "★ " : ""}{d.name}
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
    </>
  );
}
