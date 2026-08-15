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
import { rankedUnlocked } from "../game/progression.js";
import { WEEK_MOD_BY_ID, WEEK_MOD_PAIRS, pickWeekMods } from "../game/weekMods.js"; // #370 Wochen-Modifikatoren
import { WeekModChips, catalogDisplayMods, MOD_POS, MOD_NEG } from "./WeekMods.jsx"; // #381 gemeinsame Chip-Anzeige
import { MODAL_CARD, ModalHairline, ActionButton } from "./modalStyle.jsx";

const TOP_N = 20;
const CHAMP_WEEKS = 10; // so viele abgelaufene Wochen zeigen wir im Champions-Archiv
const GOLD = "#d4a63a";
const LILA = "#8a7de0";
const CY = "#26c6e6";   // Standard-Akzent (Spaß-Modus)
const AM = "#f2a83a";   // Meister-Akzent (Wochen-Challenge)
// Reiter mit eigener Akzentfarbe (aktiver Zustand) — folgt dem Logo-Farbsystem des Hubs.
// #370: EIN Wochen-Ranked-Board (ersetzt Standard/Meister). Board-String bleibt intern "meister" (Wochen-Board +
//   Champions unverändert), Reiter heißen nach dem neuen Modell. „Regeln"-Reiter folgt mit den Wochen-Mods (Phase 2).
const TABS = [
  { id: "mine",       label: "Meine Runs",   accent: LILA },
  { id: "meister",    label: "Diese Woche",  accent: AM },
  { id: "champions",  label: "🏆 Challenger", accent: GOLD },
  { id: "regeln",     label: "Regeln",       accent: CY },
];
// #381 Regeln-Reiter — Modus-Baseline + voller Modifikator-Katalog (als Chips) + Ausschluss-Paare.
function RegelnPanel() {
  const catalog = catalogDisplayMods();
  const pos = catalog.filter((m) => m.sign === "pos");
  const neg = catalog.filter((m) => m.sign === "neg");
  return (
    <div className="text-[12px] leading-relaxed">
      <p className="opacity-75 mb-3">Alle spielen wöchentlich denselben Seed unter fairer Baseline — der Upgrade-Baum hat <b>keine</b> Wirkung (2 Rerolls je Phase, Raritäten bis Rar, Legendär ab R29). Jede Woche verändern <b>3–5 zufällige Modifikatoren</b> (≥2 positiv, ≥1 negativ) den Lauf — für alle identisch. Nur abgeschlossene Läufe zählen; am Wochenende wandert Platz 1 ins Challenger-Archiv, das Board startet neu.</p>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: MOD_POS }}>Positive Modifikatoren</div>
      <WeekModChips mods={pos} size="sm" />
      <div className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1.5" style={{ color: MOD_NEG }}>Negative Modifikatoren</div>
      <WeekModChips mods={neg} size="sm" />
      <div className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1.5 opacity-60">Ausschluss-Paare (nie zusammen)</div>
      <div className="grid gap-1 text-[11.5px] opacity-75">
        {WEEK_MOD_PAIRS.map((p) => (
          <div key={p.key}><b style={{ color: MOD_POS }}>{WEEK_MOD_BY_ID[p.pos].name}</b> ↔ <b style={{ color: MOD_NEG }}>{WEEK_MOD_BY_ID[p.neg].name}</b></div>
        ))}
      </div>
    </div>
  );
}

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

export function LeaderboardScreen({ onClose, mine = null, reloadToken = 0, highscores = [], best = 0, onPlaySeed = null, onPlayRanked = null, profile = null, initialTab = "mine" }) {
  useEscape(onClose);
  // #370 Einstieg über „Rangliste" (Hub) öffnet direkt „Diese Woche"; „Bestenliste"-Kachel öffnet „Meine Runs".
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : "mine");
  const [detail, setDetail] = useState(null); // gewählter lokaler Lauf → RunDetail-Overlay
  const [now, setNow] = useState(() => Date.now()); // Live-Ticker für den Wochen-Countdown

  // Sekundentakt nur, solange der Meister-Reiter offen ist (Countdown live).
  useEffect(() => {
    if (tab !== "meister") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab]);

  const week = useMemo(() => currentWeek(new Date(now)), [now]);
  const weekMods = useMemo(() => pickWeekMods(week.seed), [week.seed]); // #370 Wochen-Modifikatoren (seed-deterministisch)
  const canPlayRanked = rankedUnlocked(profile || {}); // #370: frei bei allen Decks + je ≥1 abgeschlossenem Lauf

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
      <div className="w-full max-w-lg rounded-2xl overlay-card as-panel flex flex-col overflow-hidden"
        style={{ ...MODAL_CARD, maxHeight: "min(88vh, 760px)" }} onClick={(e) => e.stopPropagation()}>
        <ModalHairline />
        <div className="p-5 sm:p-6 flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
            <h2 className="text-lg font-extrabold flex items-center gap-2">🏆 Bestenliste</h2>
            <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>Schließen</ActionButton>
          </div>

          {/* Reiter — eine Zeile (bei Bedarf horizontal scrollbar), aktiver Reiter in seiner Akzentfarbe. */}
          <div className="flex gap-1.5 mb-4 shrink-0 overflow-x-auto -mx-1 px-1" role="tablist" style={{ scrollbarWidth: "none" }}>
            {TABS.map(({ id, label, accent }) => {
              const on = tab === id;
              return (
                <button key={id} role="tab" aria-selected={on} onClick={() => setTab(id)}
                  className="shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all"
                  style={on
                    ? { background: accent, color: "#141419", boxShadow: `0 0 12px ${accent}44` }
                    : { background: "#1c1c23", color: "#c8c8d0", border: "1px solid #2c2c36" }}>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl p-4 flex-1 min-h-0 overflow-y-auto" style={{ background: "#141419", border: "1px solid #26262e" }}>
            {tab === "mine" && (
              <>
                <div className="flex items-baseline justify-between gap-2 mb-3">
                  <span className="text-[13px] font-extrabold" style={{ color: LILA }}>Meine Runs</span>
                  <span className="text-[12px] opacity-70">Rekord <b style={{ color: GOLD }}>{fmtScore(best)}</b></span>
                </div>
                <LocalRunList runs={myTop} empty="Noch keine Läufe — leg los." onPick={setDetail} />
              </>
            )}

            {tab === "meister" && (
              leaderboardConfigured ? (
                <>
                  {/* Kopf: aktuelle Woche + Live-Countdown bis Reset (So 23:59 UTC). */}
                  <div className="flex items-baseline justify-between gap-2 mb-2.5">
                    <span className="text-[14px] font-extrabold" style={{ color: AM }}>{week.label}</span>
                    <span className="text-[11px] opacity-60 tabular-nums">Reset in {fmtCountdown(msUntilWeekEnd(new Date(now)))}</span>
                  </div>
                  {/* Seed der Woche + Spielen (bzw. gesperrt bis 13/13). */}
                  <div className="rounded-xl px-3.5 py-3 mb-3" style={{ background: "linear-gradient(180deg,#221b0f,#1b1610)", border: `1px solid ${AM}44` }}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider opacity-55">Seed der Woche</span>
                      <span className="font-mono font-bold text-[15px] px-2.5 py-0.5 rounded tracking-wider" style={{ color: AM, background: "#2a2110", border: `1px solid ${AM}66` }}>{prettySeed(week.seed)}</span>
                    </div>
                    {canPlayRanked && (
                      <button onClick={onPlayRanked || undefined}
                        className="w-full mt-3 border-none rounded-lg font-extrabold text-[13px] px-4 py-2.5 cursor-pointer transition-transform hover:-translate-y-0.5"
                        style={{ background: AM, color: "#141419", boxShadow: `0 0 14px ${AM}44` }}>▶ Spielen</button>
                    )}
                    {!canPlayRanked && (
                      <div className="text-[11px] font-semibold mt-2 flex items-center gap-1.5" style={{ color: "#c9b98a" }}>
                        🔒 Frei, sobald alle Decks freigeschaltet sind + je ≥1 Lauf beendet · ansehen jederzeit
                      </div>
                    )}
                  </div>
                  {/* #370/#381 Aktive Wochen-Modifikatoren (für alle gleich, seed-deterministisch) — als anklickbare Chips. */}
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1.5">Modifikatoren dieser Woche</div>
                  <div className="mb-3"><WeekModChips mods={weekMods} /></div>
                  <GlobalLeaderboard limit={TOP_N} mine={mine} reloadToken={reloadToken} board="meister" seed={week.seed} onPlaySeed={onPlaySeed} hideHeader />
                </>
              ) : <div className="text-sm opacity-40 text-center py-8">Bestenliste ist nicht verfügbar.</div>
            )}

            {tab === "champions" && <ChampionsList reloadToken={reloadToken} />}

            {tab === "regeln" && <RegelnPanel />}
          </div>
        </div>

        {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} onPlaySeed={onPlaySeed} />}
      </div>
    </div>
  );
}
