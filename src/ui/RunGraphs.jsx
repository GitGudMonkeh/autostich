import { fmtScore } from "./format.js";

/* #251: Zwei Lauf-Auswertungen aus dem Live-state (nur der aktuelle Lauf — kein Storage nötig):
   (1) Verhältnis-Balken „woraus kommt der Score" — Formation / Gebäude / Serie / Crit / Sonstige.
   (2) Durchlauf-Graph — Score je Stich, je Durchlauf EIGENE Reihe + EIGENE Skala („Reset je Durchlauf"),
       Siege grün, Nicht-Siege rot. Datenquelle: state.trickLog[cycle] = [{gained, won}, …] + die Score-Anteil-
       Summen (formationScore/buildingScore/streakScore/critBonusScore) aus der Engine.
   Hinweis: die Score-Quellen greifen multiplikativ ineinander → die Aufteilung ist eine Näherung (sequentiell
   geklemmt, Rest = „Sonstige"), konsistent mit der bestehenden Score-Herkunft (runStats.js). */

// Reihenfolge = Attributions-Priorität (wie runStats: Formation → Crit → Gebäude) + Serie, dann Rest.
const SRC = [
  { key: "formation", label: "Formation", color: "#5a8ade", src: "formationScore" },
  { key: "crit",      label: "Crit",      color: "#8a7de0", src: "critBonusScore" },
  { key: "building",  label: "Gebäude",   color: "#d1652f", src: "buildingScore" },
  { key: "serie",     label: "Serie",     color: "#5ab87a", src: "streakScore" },
  { key: "rest",      label: "Sonstige",  color: "#6b6b76", src: null },
];

const WIN = "#5ab87a", LOSS = "#c0504a";

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

export function RunGraphs({ state }) {
  const sh = sourceShares(state);
  const total = sh.score || 1;
  const log = Array.isArray(state.trickLog) ? state.trickLog : [];
  const hasGraph = log.some((c) => c && c.length);
  if (!sh.score && !hasGraph) return null;
  const pct = (v) => Math.round((v / total) * 100);

  return (
    <div className="mt-5">
      {/* (1) Verhältnis-Balken: woraus kommt der Score */}
      <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Woraus kommt der Score</div>
      <div className="flex w-full h-4 rounded overflow-hidden" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
        {SRC.map((s) => { const v = sh[s.key]; if (!v) return null;
          return <div key={s.key} title={`${s.label}: ${fmtScore(v)} (${pct(v)} %)`} style={{ width: `${(v / total) * 100}%`, background: s.color }} />; })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-mono">
        {SRC.map((s) => { const v = sh[s.key]; if (!v) return null;
          return (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="w-[9px] h-[9px] rounded-[2px]" style={{ background: s.color }} />{s.label} <b>{pct(v)} %</b>
            </span>
          ); })}
      </div>

      {/* (2) Durchlauf-Graph: Score je Stich, je Durchlauf getrennt (eigene Skala = „Reset je Durchlauf"). */}
      {hasGraph && (
        <details className="mt-4 rounded-xl overflow-hidden" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
          <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-wide opacity-70">Stich-Score je Durchlauf ansehen</summary>
          <div className="p-3 pt-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-3 text-[10px] font-mono opacity-55 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px]" style={{ background: WIN }} />Sieg</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px]" style={{ background: LOSS }} />kein Sieg</span>
              <span className="opacity-70">Höhe = Score je Stich (je Durchlauf eigene Skala)</span>
            </div>
            {log.map((tricks, ci) => {
              if (!tricks || !tricks.length) return null;
              const cmax = Math.max(1, ...tricks.map((t) => t.gained || 0));
              const cycleScore = tricks.reduce((a, t) => a + (t.gained || 0), 0);
              return (
                <div key={ci} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono opacity-45 w-7 shrink-0 text-right">D{ci + 1}</span>
                  <div className="flex items-end gap-[1px] h-7 flex-1 min-w-0" title={`Durchlauf ${ci + 1}: ${fmtScore(cycleScore)}`}>
                    {tricks.map((t, i) => {
                      const h = Math.max(6, Math.round(((t.gained || 0) / cmax) * 100));
                      return (
                        <div key={i} title={`Stich ${i + 1}: ${fmtScore(t.gained || 0)}${t.won ? " · Sieg" : " · kein Sieg"}`}
                          className="flex-1 rounded-t-[1px]" style={{ height: `${h}%`, minWidth: 1, background: t.won ? WIN : LOSS, opacity: t.won ? 1 : 0.55 }} />
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-mono opacity-45 w-14 shrink-0 text-right tabular-nums">{fmtScore(cycleScore)}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
