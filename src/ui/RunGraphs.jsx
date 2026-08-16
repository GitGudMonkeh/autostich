import { fmtScore, fmtScoreShort } from "./format.js";
import { t as tr, fmtPct } from "../i18n/index.js"; // #sprache (tr = Alias: `t` ist hier lokal der Stich)

/* #251: Zwei Lauf-Auswertungen aus dem Live-state (nur der aktuelle Lauf — kein Storage nötig):
   (1) Verhältnis-Balken „woraus kommt der Score" — Formation / Gebäude / Serie / Crit / Sonstige.
   (2) Durchlauf-Graph — Score je Stich, je Durchlauf EIGENE Reihe + EIGENE Skala („Reset je Durchlauf"),
       Siege grün, Nicht-Siege rot. Datenquelle: state.trickLog[cycle] = [{gained, won}, …] + die Score-Anteil-
       Summen (formationScore/buildingScore/streakScore/critBonusScore) aus der Engine.
   Hinweis: die Score-Quellen greifen multiplikativ ineinander → die Aufteilung ist eine Näherung (sequentiell
   geklemmt, Rest = „Sonstige"), konsistent mit der bestehenden Score-Herkunft (runStats.js). */

// Reihenfolge = Attributions-Priorität (wie runStats: Formation → Crit → Gebäude) + Serie, dann Rest.
const SRC = [
  { key: "formation", labelKey: "graphs.src.formation", color: "#5a8ade", src: "formationScore" },
  { key: "crit",      labelKey: "graphs.src.crit",      color: "#8a7de0", src: "critBonusScore" },
  { key: "building",  labelKey: "graphs.src.building",   color: "#d1652f", src: "buildingScore" },
  { key: "serie",     labelKey: "graphs.src.serie",     color: "#5ab87a", src: "streakScore" },
  { key: "rest",      labelKey: "graphs.src.rest",  color: "#6b6b76", src: null },
];

const WIN = "#5ab87a", LOSS = "#c0504a";

/* Victory-Redesign: FRAKTIONS-Score-Herkunft. Priorität: erst die Eigen-Score-Kanäle je Fraktion (was die Engine
   direkt der Fraktion gutschreibt), dann die generischen Multiplikator-Quellen (Formation/Crit/Serie/Gebäude), Rest
   = Sonstige. Wie sourceShares sequentiell gegen den Gesamtscore geklemmt (die Kanäle greifen multiplikativ ineinander
   → die Aufteilung ist bewusst eine Näherung, priorisiert aber die für Spieler wichtigste Frage: „welche Fraktion?"). */
const FACTION_SRC = [
  { key: "glacier",   labelKey: "graphs.src.glacier", color: "#5ec8f0", srcs: ["glacierYield"] },
  { key: "plant",     labelKey: "graphs.src.plant",   color: "#69cf59", srcs: ["plantRoot", "plantBloom", "plantHarvest"] },
  { key: "light",     labelKey: "graphs.src.light",     color: "#8a7de0", srcs: ["lightYield"] },
  { key: "fire",      labelKey: "graphs.src.fire",      color: "#ff7a3c", srcs: ["fireBase", "fireWhite"] },
  { key: "formation", labelKey: "graphs.src.formation",        color: "#5a8ade", srcs: ["formationScore"] },
  { key: "crit",      labelKey: "graphs.src.crit",       color: "#b47cff", srcs: ["critBonusScore"] },
  { key: "serie",     labelKey: "graphs.src.serie",            color: "#e0b34a", srcs: ["streakScore"] },
  { key: "building",  labelKey: "graphs.src.building",          color: "#8f93a6", srcs: ["buildingScore"] },
  { key: "rest",      labelKey: "graphs.src.rest",         color: "#6b6b76", srcs: null },
];
export function factionShares(state) {
  const score = Math.max(0, Math.floor(state.score || 0));
  const c0 = (x) => Math.max(0, Math.round(x || 0));
  let rem = score;
  const rows = [];
  for (const s of FACTION_SRC) {
    let v;
    if (s.srcs == null) { v = Math.max(0, rem); rem = 0; }
    else { const raw = s.srcs.reduce((a, k) => a + c0(state[k]), 0); v = Math.min(rem, raw); rem -= v; }
    // Label erst hier auflösen — so bekommen ALLE Aufrufer (Victory, Stats) den übersetzten Namen.
    if (v > 0) rows.push({ ...s, label: tr(s.labelKey), value: v });
  }
  rows.sort((a, b) => b.value - a.value);
  return { score, rows };
}

/* Victory-Redesign: „Score-Herkunft" nach Fraktion — gestapelter Balken + Rangliste (absolute Werte + %). */
export function ScoreHerkunft({ state }) {
  const { score, rows } = factionShares(state);
  if (!score || !rows.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide opacity-50">{tr("rail.scoreSource")}</span>
        <span className="text-[11px] font-mono opacity-40" title={fmtScore(score)}>Σ {fmtScoreShort(score)}</span>
      </div>
      <div className="flex w-full h-[13px] rounded overflow-hidden" style={{ background: "#0c0d14", border: "1px solid #2a2a34" }}>
        {rows.map((r) => (
          <div key={r.key} title={`${r.label}: ${fmtScore(r.value)} (${fmtPct(r.value / score)})`} style={{ width: `${(r.value / score) * 100}%`, background: r.color }} />
        ))}
      </div>
      <div className="flex flex-col gap-0.5 mt-3">
        {rows.map((r) => (
          <div key={r.key} className="grid items-center gap-2.5 px-2 py-1.5 rounded-lg" style={{ gridTemplateColumns: "11px 1fr auto" }}>
            <span className="w-[9px] h-[9px] rounded-[3px]" style={{ background: r.color }} />
            <span className="text-[13px] font-medium truncate">{r.label}</span>
            <span className="text-right whitespace-nowrap" title={fmtScore(r.value)}>
              <b className="font-mono tabular-nums text-[13px]" style={{ color: r.color }}>{fmtScoreShort(r.value)}</b>
              <span className="font-mono text-[11px] opacity-40 ml-1.5">{fmtPct(r.value / score)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function sourceShares(state) {
  const score = Math.max(0, Math.floor(state.score || 0));
  const c0 = (x) => Math.max(0, Math.round(x || 0));
  let rem = score;
  const out = {};
  for (const s of SRC) {
    if (s.src == null) { out[s.key] = Math.max(0, rem); rem = 0; break; }
    const t = Math.min(rem, c0(state[s.src]));
    out[s.key] = t; rem -= t;
  }
  return { score, ...out };
}

/* #252: Reiner Verhältnis-Balken + %-Legende — GETEILT zwischen Victory-Screen (RunGraphs) und der Live-StatusRail.
   `showTitle` blendet die „Woraus kommt der Score"-Überschrift ein (Victory: an; StatusRail: aus, dort liefert der
   einklappbare Panel-Kopf den Titel). Gibt null zurück, solange noch kein Score da ist. */
export function ScoreSourceBar({ state, showTitle = true }) {
  const sh = sourceShares(state);
  if (!sh.score) return null;
  const total = sh.score || 1;
  return (
    <div>
      {showTitle && <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">{tr("rail.scoreSource")}</div>}
      <div className="flex w-full h-4 rounded overflow-hidden" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
        {SRC.map((s) => { const v = sh[s.key]; if (!v) return null;
          return <div key={s.key} title={`${tr(s.labelKey)}: ${fmtScore(v)} (${fmtPct(v / total)})`} style={{ width: `${(v / total) * 100}%`, background: s.color }} />; })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-mono">
        {SRC.map((s) => { const v = sh[s.key]; if (!v) return null;
          return (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="w-[9px] h-[9px] rounded-[2px]" style={{ background: s.color }} />{tr(s.labelKey)} <b>{fmtPct(v / total)}</b>
            </span>
          ); })}
      </div>
    </div>
  );
}

export function RunGraphs({ state, sourceBar = true }) {
  const sh = sourceShares(state);
  const log = Array.isArray(state.trickLog) ? state.trickLog : [];
  const hasGraph = log.some((c) => c && c.length);
  if ((!sourceBar || !sh.score) && !hasGraph) return null;

  return (
    <div className="mt-5">
      {/* (1) Verhältnis-Balken: woraus kommt der Score (geteilte Komponente, auch live in der StatusRail #252).
             Im Victory-Redesign ersetzt der Fraktions-Breakdown (ScoreHerkunft) diesen generischen Balken → sourceBar={false}. */}
      {sourceBar && <ScoreSourceBar state={state} showTitle />}

      {/* (2) Durchlauf-Graph: Score je Stich, je Durchlauf getrennt (eigene Skala = „Reset je Durchlauf"). */}
      {hasGraph && (
        <details className="mt-4 rounded-xl overflow-hidden" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
          <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-wide opacity-70">{tr("graphs.perTrick.open")}</summary>
          <div className="p-3 pt-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-3 text-[10px] font-mono opacity-55 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px]" style={{ background: WIN }} />{tr("graphs.win")}</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px]" style={{ background: LOSS }} />{tr("graphs.noWin")}</span>
              <span className="opacity-70">{tr("graphs.scaleHint")}</span>
            </div>
            {log.map((tricks, ci) => {
              if (!tricks || !tricks.length) return null;
              const cmax = Math.max(1, ...tricks.map((t) => t.gained || 0));
              const cycleScore = tricks.reduce((a, t) => a + (t.gained || 0), 0);
              return (
                <div key={ci} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono opacity-45 w-7 shrink-0 text-right">{tr("graphs.cycleAbbr", { n: ci + 1 })}</span>
                  <div className="flex items-end gap-[1px] h-7 flex-1 min-w-0" title={tr("graphs.cycle.title", { n: ci + 1, score: fmtScore(cycleScore) })}>
                    {tricks.map((t, i) => {
                      const h = Math.max(6, Math.round(((t.gained || 0) / cmax) * 100));
                      return (
                        <div key={i} title={tr("graphs.trick.title", { n: i + 1, score: fmtScore(t.gained || 0), result: tr(t.won ? "graphs.win" : "graphs.noWin") })}
                          className="flex-1 rounded-t-[1px]" style={{ height: `${h}%`, minWidth: 1, background: t.won ? WIN : LOSS, opacity: t.won ? 1 : 0.55 }} />
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-mono opacity-45 w-14 shrink-0 text-right tabular-nums truncate" title={fmtScore(cycleScore)}>{fmtScoreShort(cycleScore)}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
