// 🏆 Bestenliste (#217/#227) — eigener Screen mit drei Reitern: „Meine Runs" (lokal, klickbar → RunDetail),
// „Global" (Supabase) und „Master" (nur Meister-Läufe). Jeder Reiter zeigt die besten 20.
import { useState, useMemo } from "react";
import { useEscape } from "./useEscape.js";
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { fmtScore } from "./format.js";
import { loadRunHistory } from "../game/storage.js";
import { leaderboardConfigured } from "../game/leaderboard.js";
import { masteryGradeLabel, rankRoman, MASTERY_MEISTER_MAX } from "../game/mastery.js";

const TOP_N = 20;
// #217 Master-Board: getrennte Boards je Rang. Ranglos (0) + Meister I..V. Großmeister (6..10) werden bereits
// erfasst (mastery_grade), aber vorerst NICHT als eigene Board-Reiter gezeigt (extrem selten; später erweiterbar).
const MASTER_GRADES = Array.from({ length: MASTERY_MEISTER_MAX + 1 }, (_, g) => g); // [0,1,2,3,4,5]
const TABS = [
  { id: "mine",   label: "Meine Runs" },
  { id: "global", label: "Global" },
  { id: "master", label: "Master" },
];
const GOLD = "#d4a63a";
const LILA = "#8a7de0";

const fmtDate = (ts) => {
  if (!ts) return "";
  try { return new Date(ts).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch (e) { return ""; }
};

// Eine Liste lokaler Läufe (bereits sortiert + gedeckelt). Klickbar → RunDetail (nicht anonymisiert, es sind eigene Läufe).
function LocalRunList({ runs, empty, onPick, showRank = false }) {
  if (!runs.length) return <div className="text-sm opacity-40 text-center py-6">{empty}</div>;
  return (
    <div className="grid gap-1">
      {runs.map((r, i) => {
        const rankLabel = r.masterRun ? masteryGradeLabel(r.masteryGrade || 0) : null;
        return (
          <button key={r.ts ?? i} onClick={() => onPick({ entry: r, rank: i + 1 })} title="Details anzeigen"
            className="flex items-center gap-2.5 text-sm px-2.5 py-1.5 rounded-lg text-left transition-all hover:brightness-125"
            style={{ background: "#20202a" }}>
            <span className="opacity-50 w-6 shrink-0 tabular-nums">#{i + 1}</span>
            <span className="flex-1 min-w-0 truncate opacity-60 text-xs">{fmtDate(r.ts)}</span>
            {showRank && rankLabel && rankLabel !== "Kein Rang" ? (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${LILA}22`, color: "#b3a8ff", border: `1px solid ${LILA}55` }}>{rankLabel}</span>
            ) : (!showRank && r.masterRun && (
              <span className="shrink-0 text-[11px]" title="Meister-Lauf" style={{ color: LILA }}>★</span>
            ))}
            <span className="font-bold shrink-0 tabular-nums" style={{ color: GOLD }}>{fmtScore(r.score)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function LeaderboardScreen({ onClose, mine = null, reloadToken = 0, highscores = [], best = 0, onPlaySeed = null, masteryGrade = 0 }) {
  useEscape(onClose);
  const [tab, setTab] = useState("mine");
  const [detail, setDetail] = useState(null); // gewählter lokaler Lauf → RunDetail-Overlay
  // #217 Master-Board: aktuell gewählter Rang-Reiter — Default = eigener Rang (auf Meister I..V geklemmt), sonst Ranglos.
  const [masterGrade, setMasterGrade] = useState(() => Math.max(0, Math.min(MASTERY_MEISTER_MAX, masteryGrade | 0)));

  // Alle eigenen Läufe: Run-Historie (bis 30, mit Deck-Snapshot) + Top-5-Highscores, per Zeitstempel dedupliziert
  // (Historie zuerst → die reichere Version gewinnt), nach Score sortiert.
  const allRuns = useMemo(() => {
    const seen = new Set();
    const merged = [];
    for (const r of [...loadRunHistory(), ...(highscores || [])]) {
      const key = r.ts ?? `${r.score}:${r.tricks}:${r.cycles}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
    return merged.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.ts || 0) - (a.ts || 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [highscores, reloadToken]);

  const myTop = useMemo(() => allRuns.slice(0, TOP_N), [allRuns]);
  const masterTop = useMemo(() => allRuns.filter((r) => r.masterRun).slice(0, TOP_N), [allRuns]);

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      {/* Feste Kartenhöhe → das Fenster bleibt beim Tab-Wechsel gleich groß & an gleicher Stelle; nur die Liste scrollt intern. */}
      <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6 overlay-card as-panel flex flex-col"
        style={{ background: "#181820", border: "1px solid #33333e", height: "min(85vh, 720px)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">🏆 Bestenliste</h2>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>

        {/* Reiter */}
        <div className="flex gap-1 mb-4 shrink-0" role="tablist">
          {TABS.map(({ id, label }) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={tab === id ? { background: LILA, color: "#141419" } : { background: "#20202a", color: "#c8c8d0", border: "1px solid #30303a" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-xl p-4 as-panel flex-1 min-h-0 overflow-y-auto" style={{ background: "#17171c", border: "1px solid #26262e" }}>
          {tab === "mine" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide opacity-50">Meine Runs — Top {TOP_N}</span>
                <span className="text-sm font-bold" style={{ color: GOLD }}>Rekord {fmtScore(best)}</span>
              </div>
              <LocalRunList runs={myTop} empty="Noch keine Läufe — leg los." onPick={setDetail} />
            </>
          )}

          {tab === "master" && (
            leaderboardConfigured ? (
              <>
                {/* #217: getrennte Boards je Rang — Rang-Picker (Ranglos + Meister I..V). */}
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1" role="tablist" aria-label="Rang">
                  {MASTER_GRADES.map((g) => (
                    <button key={g} role="tab" aria-selected={masterGrade === g} onClick={() => setMasterGrade(g)}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={masterGrade === g
                        ? { background: LILA, color: "#141419" }
                        : { background: "#20202a", color: "#b3a8ff", border: "1px solid #30303a" }}>
                      {g === 0 ? "Ranglos" : rankRoman(g)}
                    </button>
                  ))}
                </div>
                <GlobalLeaderboard limit={TOP_N} mine={mine} reloadToken={reloadToken} masterGrade={masterGrade} onPlaySeed={onPlaySeed} />
              </>
            ) : (
              // Kein Board konfiguriert (offline/Preview ohne Config): lokale Meister-Läufe als Fallback.
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wide opacity-50">Master (lokal) — Top {TOP_N}</span>
                  <span className="text-sm font-bold" style={{ color: "#b3a8ff" }}>{masterTop.length} Meister-Läufe</span>
                </div>
                <LocalRunList runs={masterTop} empty="Noch keine Meister-Läufe — starte einen im Meister-Modus." onPick={setDetail} showRank />
              </>
            )
          )}

          {tab === "global" && (
            leaderboardConfigured
              ? <GlobalLeaderboard limit={TOP_N} mine={mine} reloadToken={reloadToken} onPlaySeed={onPlaySeed} />
              : <div className="text-sm opacity-40 text-center py-6">Globale Bestenliste ist nicht verfügbar.</div>
          )}
        </div>

        {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} onPlaySeed={onPlaySeed} />}
      </div>
    </div>
  );
}
