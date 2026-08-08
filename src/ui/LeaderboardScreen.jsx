// 🏆 Bestenliste — vier Reiter:
//  · Meine Runs — lokale Läufe (klickbar → RunDetail).
//  · Standard   — globale ALLZEIT-Highscores (zufällige Seeds, Spaß-Modus). board=standard, ungefiltert.
//  · Meister    — WOCHEN-Challenge: alle spielen den Seed der Woche; das Board zeigt die aktuelle Woche
//                 (board=meister + seed=Wochen-Seed). Teilnahme frei bei 13/13 Upgrades, ansehen jederzeit.
//  · Champions  — Hall of Champions: Platz 1 jeder abgelaufenen Meister-Woche (1 pro Woche).
import { useState, useMemo, useEffect } from "react";
import { useEscape } from "./useEscape.js";
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { fmtScore } from "./format.js";
import { loadRunHistory } from "../game/storage.js";
import { leaderboardConfigured, fetchBoardTop } from "../game/leaderboard.js";
import { currentWeek, pastWeeks, msUntilWeekEnd } from "../game/weeklySeed.js";
import { formatSeed } from "../game/rng.js";
import { treeComplete } from "../game/progression.js";

const TOP_N = 20;
const CHAMP_WEEKS = 10; // so viele abgelaufene Wochen zeigen wir im Champions-Archiv
const TABS = [
  { id: "mine",       label: "Meine Runs" },
  { id: "standard",   label: "Standard" },
  { id: "meister",    label: "Meister" },
  { id: "champions",  label: "🏆 Champions" },
];
const GOLD = "#d4a63a";
const LILA = "#8a7de0";
const CY = "#26c6e6";   // Standard-Akzent (Spaß-Modus)
const AM = "#f2a83a";   // Meister-Akzent (Wochen-Challenge)

const fmtDate = (ts) => {
  if (!ts) return "";
  try { return new Date(ts).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch (e) { return ""; }
};

// Restzeit bis zum Wochen-Reset kompakt: „3t 5h 12m 40s".
function fmtCountdown(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return `${d}t ${h}h ${m}m ${s}s`;
}

// Seed-Code hübsch mit Trenner (4-3): „A7F39K2" → „A7F3-9K2".
const prettySeed = (seed) => { const c = formatSeed(seed); return `${c.slice(0, 4)}-${c.slice(4)}`; };

// Eine Liste lokaler Läufe (bereits sortiert + gedeckelt). Klickbar → RunDetail (nicht anonymisiert, es sind eigene Läufe).
function LocalRunList({ runs, empty, onPick }) {
  if (!runs.length) return <div className="text-sm opacity-40 text-center py-6">{empty}</div>;
  return (
    <div className="grid gap-1">
      {runs.map((r, i) => (
        <button key={r.ts ?? i} onClick={() => onPick({ entry: r, rank: i + 1 })} title="Details anzeigen"
          className="flex items-center gap-2.5 text-sm px-2.5 py-1.5 rounded-lg text-left transition-all hover:brightness-125"
          style={{ background: "#20202a" }}>
          <span className="opacity-50 w-6 shrink-0 tabular-nums">#{i + 1}</span>
          <span className="flex-1 min-w-0 truncate opacity-60 text-xs">{fmtDate(r.ts)}</span>
          <span className="font-bold shrink-0 tabular-nums" style={{ color: GOLD }}>{fmtScore(r.score)}</span>
        </button>
      ))}
    </div>
  );
}

// Hall of Champions — je abgelaufener Woche der Platz 1 des Meister-Wochen-Seeds (client-seitig aus dem Board berechnet).
function ChampionsList({ reloadToken }) {
  const [champs, setChamps] = useState(null); // null = lädt · [] = leer · [...] = Daten

  useEffect(() => {
    if (!leaderboardConfigured) return;
    let alive = true;
    setChamps(null);
    const weeks = pastWeeks(new Date(), CHAMP_WEEKS);
    Promise.all(weeks.map((w) =>
      fetchBoardTop("meister", 1, w.seed)
        .then((rows) => (rows && rows[0] ? { ...w, name: rows[0].name, score: rows[0].score } : null))
        .catch(() => null)
    )).then((res) => { if (alive) setChamps(res.filter(Boolean)); });
    return () => { alive = false; };
  }, [reloadToken]);

  if (!leaderboardConfigured) return <div className="text-sm opacity-40 text-center py-6">Champions sind nicht verfügbar.</div>;
  return (
    <>
      <div className="text-[11px] opacity-55 leading-relaxed mb-3">
        Platz 1 jeder abgelaufenen <b style={{ color: AM }}>Meister</b>-Woche landet hier — <b>eine Person pro Woche</b>.
      </div>
      {champs === null ? (
        <div className="text-xs opacity-40 text-center py-3">Lädt Champions …</div>
      ) : champs.length === 0 ? (
        <div className="text-xs opacity-40 text-center py-6">Noch keine Wochensieger — die erste Meister-Woche muss erst abgeschlossen sein.</div>
      ) : (
        <div className="grid gap-1">
          {champs.map((c) => (
            <div key={`${c.year}-${c.week}`} className="flex items-center gap-2.5 text-sm px-2.5 py-1.5 rounded-lg"
              style={{ background: "#20202a", border: `1px solid ${AM}33` }}>
              <span className="shrink-0 text-[15px]">🏆</span>
              <span className="flex-1 min-w-0 truncate font-semibold">
                {c.name || "—"}<span className="text-[10px] opacity-45 ml-1.5">{c.labelShort}</span>
              </span>
              <span className="font-bold shrink-0 tabular-nums" style={{ color: GOLD }}>{fmtScore(c.score)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function LeaderboardScreen({ onClose, mine = null, reloadToken = 0, highscores = [], best = 0, onPlaySeed = null, onPlayMeister = null, profile = null }) {
  useEscape(onClose);
  const [tab, setTab] = useState("mine");
  const [detail, setDetail] = useState(null); // gewählter lokaler Lauf → RunDetail-Overlay
  const [now, setNow] = useState(() => Date.now()); // Live-Ticker für den Wochen-Countdown

  // Sekundentakt nur, solange der Meister-Reiter offen ist (Countdown live).
  useEffect(() => {
    if (tab !== "meister") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab]);

  const week = useMemo(() => currentWeek(new Date(now)), [now]);
  const canPlayMeister = treeComplete(profile || {}); // Teilnahme frei bei 13/13 Upgrades

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
        <div className="flex gap-1 mb-4 shrink-0 flex-wrap" role="tablist">
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

          {tab === "standard" && (
            leaderboardConfigured ? (
              <>
                <div className="text-[11px] opacity-55 leading-relaxed mb-3">
                  <b style={{ color: CY }}>Standard</b> · Allzeit-Highscores — zufällige Seeds, Upgrades ignoriert, für alle gleich. Just for fun.
                </div>
                <GlobalLeaderboard limit={TOP_N} mine={mine} reloadToken={reloadToken} board="standard" onPlaySeed={onPlaySeed} />
              </>
            ) : <div className="text-sm opacity-40 text-center py-6">Bestenliste ist nicht verfügbar.</div>
          )}

          {tab === "meister" && (
            leaderboardConfigured ? (
              <>
                {/* Kopf: aktuelle Woche + Live-Countdown bis Reset (So 23:59 UTC). */}
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="text-[13px] font-bold" style={{ color: AM }}>{week.label}</span>
                  <span className="text-[11px] opacity-60 tabular-nums">Reset in {fmtCountdown(msUntilWeekEnd(new Date(now)))}</span>
                </div>
                {/* Seed der Woche + Spielen (bzw. gesperrt bis 13/13). */}
                <div className="flex items-center gap-2.5 flex-wrap px-3 py-2.5 rounded-xl mb-3"
                  style={{ background: "#1c1810", border: `1px solid ${AM}44` }}>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider opacity-55">Seed der Woche</span>
                  <span className="font-mono font-bold text-[14px] px-2 py-0.5 rounded" style={{ color: AM, background: "#241d10", border: `1px solid ${AM}55` }}>{prettySeed(week.seed)}</span>
                  {canPlayMeister ? (
                    <button onClick={onPlayMeister || undefined}
                      className="ml-auto border-none rounded-lg font-extrabold text-[13px] px-4 py-2 cursor-pointer transition-transform hover:-translate-y-0.5"
                      style={{ background: AM, color: "#141419" }}>▶ Spielen</button>
                  ) : (
                    <span className="ml-auto text-[11px] font-semibold flex items-center gap-1.5" style={{ color: "#8a8a95" }}>
                      🔒 Teilnahme frei bei 13/13 Upgrades
                    </span>
                  )}
                </div>
                <GlobalLeaderboard limit={TOP_N} mine={mine} reloadToken={reloadToken} board="meister" seed={week.seed} onPlaySeed={onPlaySeed} />
              </>
            ) : <div className="text-sm opacity-40 text-center py-6">Bestenliste ist nicht verfügbar.</div>
          )}

          {tab === "champions" && <ChampionsList reloadToken={reloadToken} />}
        </div>

        {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} onPlaySeed={onPlaySeed} />}
      </div>
    </div>
  );
}
