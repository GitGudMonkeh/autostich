// 🏆 Bestenliste — drei Reiter (#385: „Meine Runs" raus, die eigenen Läufe stehen in der Statistik):
//  · Diese Woche — WOCHEN-Ranked: alle spielen den Seed der Woche; das Board zeigt die aktuelle Woche
//                  (board=meister + seed=Wochen-Seed). Teilnahme frei bei allen Decks + je ≥1 Lauf, ansehen jederzeit.
//  · Challenger  — Hall of Champions: Platz 1 jeder abgelaufenen Woche (1 pro Woche).
//  · Regeln      — Modus-Baseline + voller Modifikator-Katalog + Ausschluss-Paare.
import { useState, useMemo, useEffect } from "react";
import { useEscape } from "./useEscape.js";
import { GlobalLeaderboard } from "./GlobalLeaderboard.jsx";
import { fmtScore } from "./format.js";
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
const CY = "#26c6e6";   // Regeln-Akzent
const AM = "#f2a83a";   // Wochen-Akzent (Diese Woche)
// Reiter mit eigener Akzentfarbe (aktiver Zustand) — folgt dem Logo-Farbsystem des Hubs. #385: „Meine Runs" entfernt
//   (steht in der Statistik) → 3 Reiter, gleich breit. Board-String bleibt intern "meister" (Wochen-Board + Champions).
const TABS = [
  { id: "meister",    label: "Diese Woche",  accent: AM },
  { id: "champions",  label: "🏆 Challenger", accent: GOLD },
  { id: "regeln",     label: "Regeln",       accent: CY },
];
// #385 Regeln-Reiter — jeder Modifikator VOLL AUSGESCHRIEBEN in einem eigenen Rahmen (keine Chips), getrennt nach
//   positiv/negativ; darunter die Ausschluss-Paare.
function ModBox({ m }) {
  const c = m.sign === "pos" ? MOD_POS : MOD_NEG;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "#17161f", border: `1px solid ${c}44` }}>
      <div className="text-[12.5px] font-bold" style={{ color: c }}>{m.name}</div>
      <div className="text-[11.5px] opacity-80 leading-snug mt-0.5">{m.text}</div>
    </div>
  );
}
function RegelnPanel() {
  const catalog = catalogDisplayMods();
  const pos = catalog.filter((m) => m.sign === "pos");
  const neg = catalog.filter((m) => m.sign === "neg");
  const head = "text-[10px] font-bold uppercase tracking-wider";
  return (
    <div className="text-[12px] leading-relaxed">
      <p className="opacity-75 mb-3">Alle spielen wöchentlich denselben Seed unter fairer Baseline — der Upgrade-Baum hat <b>keine</b> Wirkung (2 Rerolls je Phase, Raritäten bis Rar, Legendär ab R29). Jede Woche verändern <b>3–5 zufällige Modifikatoren</b> (≥2 positiv, ≥1 negativ) den Lauf — für alle identisch. Nur abgeschlossene Läufe zählen; am Wochenende wandert Platz 1 ins Challenger-Archiv, das Board startet neu.</p>
      <div className={`${head} mb-1.5`} style={{ color: MOD_POS }}>Positive Modifikatoren</div>
      <div className="grid gap-1.5">{pos.map((m) => <ModBox key={m.id} m={m} />)}</div>
      <div className={`${head} mt-3 mb-1.5`} style={{ color: MOD_NEG }}>Negative Modifikatoren</div>
      <div className="grid gap-1.5">{neg.map((m) => <ModBox key={m.id} m={m} />)}</div>
      <div className={`${head} mt-3 mb-1.5 opacity-60`}>Ausschluss-Paare (nie zusammen)</div>
      <div className="grid gap-1 text-[11.5px] opacity-75">
        {WEEK_MOD_PAIRS.map((p) => (
          <div key={p.key}><b style={{ color: MOD_POS }}>{WEEK_MOD_BY_ID[p.pos].name}</b> ↔ <b style={{ color: MOD_NEG }}>{WEEK_MOD_BY_ID[p.neg].name}</b></div>
        ))}
      </div>
    </div>
  );
}

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

export function LeaderboardScreen({ onClose, mine = null, reloadToken = 0, highscores = [], best = 0, onPlaySeed = null, onPlayRanked = null, profile = null, initialTab = "meister" }) {
  useEscape(onClose);
  // #385 Default-Reiter „Diese Woche" (meister); „Meine Runs" ist entfernt (steht in der Statistik).
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : "meister");
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

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      {/* #385 FESTE Kartenhöhe (nicht nur maxHeight) → das Fenster bleibt beim Tab-Wechsel gleich groß & an gleicher
          Stelle; nur die innere Liste scrollt. */}
      <div className="w-full max-w-lg rounded-2xl overlay-card as-panel flex flex-col overflow-hidden"
        style={{ ...MODAL_CARD, height: "min(88vh, 760px)" }} onClick={(e) => e.stopPropagation()}>
        <ModalHairline />
        <div className="p-5 sm:p-6 flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
            <h2 className="text-lg font-extrabold flex items-center gap-2">🏆 Bestenliste</h2>
            <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>Schließen</ActionButton>
          </div>

          {/* #385 Reiter im Shop-/Upgrades-Stil: gleich breit (flex-1), aktiv = Akzentfarbe auf dunklem Grund. */}
          <div className="flex gap-1.5 mb-4 shrink-0" role="tablist">
            {TABS.map(({ id, label, accent }) => {
              const on = tab === id;
              return (
                <button key={id} role="tab" aria-selected={on} onClick={() => setTab(id)}
                  className="flex-1 text-[13px] font-semibold tracking-wide px-3 py-2 rounded-lg transition-all"
                  style={on
                    ? { color: accent, background: "#131318", border: `1px solid ${accent}55`, boxShadow: `0 0 16px -9px ${accent}` }
                    : { color: "#8a8a95", background: "transparent", border: "1px solid #2a2a33" }}>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl p-4 flex-1 min-h-0 overflow-y-auto" style={{ background: "#141419", border: "1px solid #26262e" }}>
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
      </div>
    </div>
  );
}
