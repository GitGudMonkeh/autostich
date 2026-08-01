import { Fragment, useMemo, useState, useEffect } from "react";
import { useEscape } from "./useEscape.js";
import { Sparkline } from "./Sparkline.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { SeedChip } from "./SeedChip.jsx"; // #205 Challenger Mode: kopierbarer Seed + Nachspielen
import { fetchSeedTop, leaderboardConfigured } from "../game/leaderboard.js"; // #205 Schicht B: globaler Top-3-pro-Seed
import { loadRunHistory, loadProfile } from "../game/storage.js";
import { PERK_DEFS, CATEGORIES } from "../game/perks.js";
import { SKILL_DEFS, ARCHETYPE_META } from "../game/skills.js";
import {
  MIN_SAMPLE, hasEnoughData, avgScoreOrigin, scoreOrigin, pickRates,
  archetypeUsage, bestArchetype, scoreLift, topRunsOrigin, bestRun,
} from "../game/runStats.js";
import { fmtScore } from "./format.js";
import { fmtDuration } from "../game/deck.js";
import { MASTERY_THRESHOLDS, MASTERY_REWARD_LABELS, MASTERY_MAX_GRADE, MASTERY_MEISTER_MAX, isGrandmaster, rankRoman, masteryGradeLabel } from "../game/mastery.js"; // #217/#226 Meister- & Großmeisterränge
import { DECK_DEFS } from "../game/cosmetics.js"; // #217: Grad-Deck-Namen

/* #172 FB-10 — Statistik-Hub (Hauptmenü). Rein lokal aus der Lauf-Historie (storage.loadRunHistory)
   + Profil-Totals (loadProfile), aggregiert über game/runStats.js. Wiederverwendung: Sparkline (Score-Trend),
   RunDetail/RunStats (Klick auf einen Lauf → derselbe Statblock wie im Victory-Screen, #169 FB-8). */

// Score-Herkunft-Segmente. v0.3: die Engine trennt nur Formationen + Crit-Bonus heraus — Basis, Serie und ALLE
// Fraktions-Mechaniken (Feuer/Eis/Blitz/Pflanze) fallen zusammen in „Elementar & Basis" (ehrliches Sammel-Label
// statt „Übrige"; eine echte Fraktions-Zerlegung bräuchte Engine-Akkumulatoren, bewusst später).
const ORIGIN_META = {
  formations: { label: "Formationen", color: "#5ab87a" },
  crits: { label: "Crit-Bonus", color: "#e879f9" },       // v0.3: Crit ist kein universeller Bonus mehr (Blitz + Krit-Stat)
  buildings: { label: "Gebäude", color: "#5a8ade" },      // #UI: Architekt-Score-Bauten (Struktur/Schatzkammer/Handelsbauten)
  rest: { label: "Elementar & Basis", color: "#8a8a95" }, // v0.3: Basis/Serie + alle Fraktions-Mechaniken (noch nicht einzeln getrennt)
};
const perkLabel = (id) => PERK_DEFS[id]?.label || id;
const skillLabel = (id) => SKILL_DEFS[id]?.name || id;
const perkColor = (id) => CATEGORIES[PERK_DEFS[id]?.cat]?.color || "#8a8a95";
const skillColor = (id) => (ARCHETYPE_META[SKILL_DEFS[id]?.archetype] || {}).color || "#8a8a95";
const archIcon = (a) => (ARCHETYPE_META[a] || {}).icon || "";
const archLabel = (a) => (ARCHETYPE_META[a] || {}).label || a;
const archColor = (a) => (ARCHETYPE_META[a] || {}).color || "#8a8a95";
const pct = (x) => `${Math.round((x || 0) * 100)}%`;

function Kpi({ label, value, color }) {
  return (
    <div className="rounded-lg px-3 py-2 text-center" style={{ background: "#141419", border: "1px solid #26262e" }}>
      <div className="opacity-50 text-[11px]">{label}</div>
      <div className="font-bold text-lg" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>{title}</h3>
        {hint && <span className="text-[11px] opacity-40">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// Gestapelter Anteils-Balken (Score-Herkunft).
function StackedBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <>
      <div className="flex h-3 w-full rounded overflow-hidden" style={{ background: "#141419" }}>
        {segments.map((s) => (
          <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${fmtScore(s.value)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="opacity-70">{s.label}</span>
            <span className="font-bold" style={{ color: s.color }}>{pct(s.value / total)}</span>
          </span>
        ))}
      </div>
    </>
  );
}

// Horizontaler Balken für eine Liste (Pick-Raten / Archetyp-Nutzung).
function BarRow({ label, color, frac, right }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 truncate" style={{ color }} title={label}>{label}</span>
      <div className="flex-1 h-2 rounded overflow-hidden" style={{ background: "#141419" }}>
        <div className="h-full rounded" style={{ width: `${Math.max(3, (frac || 0) * 100)}%`, background: color, opacity: 0.8 }} />
      </div>
      <span className="w-16 shrink-0 text-right opacity-60 tabular-nums">{right}</span>
    </div>
  );
}

// #205: Lauf-Historie nach Seed gruppieren (nur Läufe MIT Seed). Je Seed: bester lokaler Score, Anzahl Läufe,
// jüngste Aktivität. Sortiert nach jüngster Aktivität (Challenge-Reiter „was du zuletzt herausgefordert hast").
function challengeSeeds(history) {
  const by = new Map();
  for (const r of history) {
    const code = r.seedCode;
    if (!code) continue;
    const g = by.get(code) || { code, seed: r.seed, best: 0, plays: 0, lastTs: 0 };
    g.best = Math.max(g.best, Math.floor(r.score || 0));
    g.plays += 1;
    g.lastTs = Math.max(g.lastTs, r.ts || 0);
    by.set(code, g);
  }
  return [...by.values()].sort((a, b) => b.lastTs - a.lastTs);
}

// #205 Schicht B: globaler Top-3 auf GENAU diesem Seed (lazy — fetcht erst beim Aufklappen, nicht für alle Seeds auf
// einmal). Degradiert lautlos (Board nicht verfügbar / kein Eintrag). Score-Herkunft = dieselbe Tabelle wie das Board.
function SeedGlobalTop3({ seed }) {
  const [rows, setRows] = useState(null); // null = lädt · [] = leer · [...] = Daten
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setError(false); setRows(null);
    fetchSeedTop(seed, 3)
      .then((d) => { if (alive) setRows(Array.isArray(d) ? d : []); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [seed]);
  if (error) return <div className="text-[11px] opacity-40 px-1 py-1.5">Global nicht verfügbar.</div>;
  if (rows === null) return <div className="text-[11px] opacity-40 px-1 py-1.5">Lädt globale Top 3 …</div>;
  if (rows.length === 0) return <div className="text-[11px] opacity-40 px-1 py-1.5">Noch keine globalen Läufe auf diesem Seed.</div>;
  return (
    <div className="grid gap-0.5 px-1 py-1.5">
      {rows.map((r, i) => (
        <div key={r.id ?? i} className="flex items-center gap-2 text-xs">
          <span className="opacity-50 w-4 shrink-0 tabular-nums">#{i + 1}</span>
          <span className="flex-1 truncate opacity-85">{r.name || "—"}</span>
          <span className="font-bold tabular-nums shrink-0" style={{ color: "#d4a63a" }}>{fmtScore(r.score)}</span>
        </div>
      ))}
    </div>
  );
}

// #205 Challenges-Reiter: eigene Seeds mit bestem LOKALEM Score + „↻ Nachspielen" / „⧉ kopieren"; je Seed aufklappbar
// der globale Top-3-Vergleich (Schicht B, aus derselben Board-Tabelle).
function ChallengesPanel({ seeds, onPlaySeed }) {
  if (!seeds || seeds.length === 0) {
    return (
      <div className="text-center opacity-55 py-10 text-sm leading-relaxed">
        Noch keine Seeds. Jeder Lauf bekommt jetzt einen teilbaren Seed — spiel einen Run,
        oder füg auf der Startseite einen fremden Seed ein und nimm die Challenge an.
      </div>
    );
  }
  return (
    <Section title="Deine Seeds" hint="zuletzt gespielt zuerst">
      <div className="grid gap-1.5">
        {seeds.map((g) => (
          <div key={g.code} className="rounded-lg overflow-hidden" style={{ background: "#141419", border: "1px solid #26262e" }}>
            <div className="flex items-center gap-2 flex-wrap px-3 py-2">
              <SeedChip code={g.code} onReplay={onPlaySeed ? () => onPlaySeed(g.seed) : null} />
              <span className="ml-auto text-xs opacity-55 tabular-nums">{g.plays}× gespielt</span>
              <span className="font-bold tabular-nums" style={{ color: "#d4a63a" }}>{fmtScore(g.best)}</span>
            </div>
            {/* #205 Schicht B: globaler Top-3 auf diesem Seed — lazy erst beim Aufklappen. */}
            {leaderboardConfigured && (
              <details style={{ borderTop: "1px solid #26262e" }}>
                <summary className="cursor-pointer select-none text-[11px] uppercase tracking-wide opacity-60 px-3 py-1.5">🌐 Top 3 global</summary>
                <div className="px-2 pb-1"><SeedGlobalTop3 seed={g.seed} /></div>
              </details>
            )}
          </div>
        ))}
      </div>
      <div className="text-[11px] opacity-40 mt-3 leading-relaxed">
        Bestwert = dein bester lokaler Lauf auf diesem Seed. „Top 3 global“ vergleicht mit den besten Läufen anderer auf demselben Seed.
      </div>
    </Section>
  );
}

// #217/#226 Meister- & Großmeisterränge — Master-Reiter: 10 Ränge als Balatro-Decks-Reihe. Bedingung = Score-Schwelle,
// Reward nur GROB (Kurzlabels, keine Prozente). Der aktuelle Rang ist hervorgehoben, der nächste als Ziel markiert.
// Sequentiell: ein Lauf schaltet höchstens den nächsten frei. Meister I–V (violett) geben Rewards; Großmeister I–V (gold)
// steigern nur die Schwierigkeit (Ramp), Ziel bleibt 50 M. Deck-Namen aus der Kosmetik-Registry (deck_rank_* / deck_gm_*).
const RANK_DECK_ID = {
  1: "deck_rank_bronze", 2: "deck_rank_silber", 3: "deck_rank_gold", 4: "deck_rank_platin", 5: "deck_rank_diamond",
  6: "deck_gm_rot", 7: "deck_gm_blau", 8: "deck_gm_gruen", 9: "deck_gm_lila", 10: "deck_gm_marco", // #226 Großmeister-Decks
};
const MASTER_ACCENT = "#8a7de0";
const GM_ACCENT = "#d4a63a"; // Gold — Großmeister-Tier abgesetzt vom Meister-Violett

function MasterPanel({ profile, best }) {
  const grade = profile.masteryGrade || 0;
  const pbScore = Math.max(profile.bestScore || 0, best ? Math.floor(best.score || 0) : 0);
  const next = grade < MASTERY_MAX_GRADE ? grade + 1 : null;
  const gmActive = isGrandmaster(grade);
  return (
    <>
      <Section title="Meisterränge" hint="experimentell">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <Kpi label="Aktueller Rang" value={grade >= 1 ? masteryGradeLabel(grade) : "Kein Rang"} color={grade >= 1 ? (gmActive ? GM_ACCENT : MASTER_ACCENT) : undefined} />
          <Kpi label="Bester Score" value={fmtScore(pbScore)} color="#d4a63a" />
        </div>
        <div className="text-[11px] opacity-45 leading-relaxed mb-1">
          Nur <b>Meister-Läufe</b> schalten Ränge frei — einer pro Lauf, der Reihe nach. Meister I–V geben dauerhafte Vorteile (nur grob gezeigt); ab <b style={{ color: GM_ACCENT }}>Großmeister</b> wächst nur der Gegner mit, das Ziel bleibt 50 M. Je Rang ein Deck.
        </div>
      </Section>
      <div className="grid gap-1.5 mt-2">
        {MASTERY_THRESHOLDS.map((thr, i) => {
          const n = i + 1;
          const gm = isGrandmaster(n);                 // Großmeister-Tier (Ränge 6–10)?
          const acc = gm ? GM_ACCENT : MASTER_ACCENT;
          const unlocked = grade >= n;
          const isNext = n === next;
          const roman = rankRoman(n);                  // I..V je Tier (Meister ODER Großmeister)
          const deckName = DECK_DEFS[RANK_DECK_ID[n]]?.name || "";
          const rewards = gm ? [] : (MASTERY_REWARD_LABELS[n] || []); // Großmeister bringt keine neuen Rewards
          return (
            <Fragment key={n}>
              {/* Trenner + Tier-Label vor dem ersten Großmeister-Rang. */}
              {n === MASTERY_MEISTER_MAX + 1 && (
                <div className="flex items-center gap-2 mt-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: GM_ACCENT }}>Großmeister</span>
                  <span className="flex-1 h-px" style={{ background: `${GM_ACCENT}44` }} />
                  <span className="text-[10px] opacity-45">nur die Schwierigkeit steigt · Ziel bleibt {fmtScore(thr)}</span>
                </div>
              )}
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{
                  background: isNext ? "#1c1a26" : "#141419",
                  border: `1px solid ${unlocked ? `${acc}66` : isNext ? `${acc}44` : "#26262e"}`,
                  opacity: unlocked || isNext ? 1 : 0.6,
                }}>
                {/* Rang-Ziffer */}
                <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-pixel text-sm"
                  style={{ background: unlocked ? acc : "#20202a", color: unlocked ? "#141419" : "#7a7a88", border: unlocked ? "none" : "1px solid #33333e" }}>
                  {roman}
                </div>
                {/* Reward (Meister) bzw. Schwierigkeits-Hinweis (Großmeister) + Deck */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {gm ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${GM_ACCENT}22`, color: "#e6c766", border: `1px solid ${GM_ACCENT}55` }}>härterer Gegner</span>
                    ) : rewards.map((r) => (
                      <span key={r} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#20202a", color: "#c8c8d0" }}>{r}</span>
                    ))}
                  </div>
                  <div className="text-[11px] opacity-45 mt-0.5">Deck: {deckName}</div>
                </div>
                {/* Bedingung / Status */}
                <div className="shrink-0 text-right">
                  <div className="text-xs font-bold tabular-nums" style={{ color: unlocked ? acc : "#c8c8d0" }}>{fmtScore(thr)}</div>
                  <div className="text-[10px] font-semibold" style={{ color: unlocked ? acc : isNext ? "#b3a8f5" : "#7a7a88" }}>
                    {unlocked ? "✓ frei" : isNext ? "nächstes Ziel" : "gesperrt"}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="text-[11px] opacity-40 mt-3 leading-relaxed">
        Experimentell. Ab <b style={{ color: GM_ACCENT }}>Großmeister</b> (über Rang V) wächst nur der Gegner mit — das Ziel bleibt 50 M, neue Belohnungen gibt es nicht.
      </div>
    </>
  );
}

export function StatsScreen({ onClose, onPlaySeed = null }) {
  useEscape(onClose);
  const [detail, setDetail] = useState(null); // { entry, rank } | null
  const [tab, setTab] = useState("overview"); // #205: „overview" (bestehende Statistik) | „challenges"

  // Beim Öffnen einmal frisch laden (nach jedem Lauf aktuell).
  const history = useMemo(() => loadRunHistory(), []);
  const profile = useMemo(() => loadProfile(), []);
  const seeds = useMemo(() => challengeSeeds(history), [history]);

  const empty = history.length === 0;
  const games = profile.games || 0;
  const avgScore = games > 0 ? profile.totalScore / games : 0;
  const best = bestRun(history);
  const origin = useMemo(() => avgScoreOrigin(history), [history]);
  const perkRates = useMemo(() => pickRates(history, "perks").slice(0, 6), [history]);
  const skillRates = useMemo(() => pickRates(history, "skills").slice(0, 6), [history]);
  const archUse = useMemo(() => archetypeUsage(history), [history]);
  const enough = hasEnoughData(history);
  const bestArch = useMemo(() => (enough ? bestArchetype(history) : []), [history, enough]);
  const perkLift = useMemo(() => (enough ? scoreLift(history, "perks").filter((x) => x.lift > 0).slice(0, 3) : []), [history, enough]);
  const skillLift = useMemo(() => (enough ? scoreLift(history, "skills").filter((x) => x.lift > 0).slice(0, 3) : []), [history, enough]);
  const topOrigin = useMemo(() => topRunsOrigin(history, 3), [history]);

  const trend = history.slice(0, 10).map((r) => Math.floor(r.score || 0)).reverse(); // ältester → neuester
  const originSegs = (o) => [
    { key: "formations", label: ORIGIN_META.formations.label, color: ORIGIN_META.formations.color, value: o.formations },
    { key: "crits", label: ORIGIN_META.crits.label, color: ORIGIN_META.crits.color, value: o.crits },
    { key: "buildings", label: ORIGIN_META.buildings.label, color: ORIGIN_META.buildings.color, value: o.buildings },
    { key: "rest", label: ORIGIN_META.rest.label, color: ORIGIN_META.rest.color, value: o.rest },
  ];

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6 my-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">Statistiken</h2>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>

        {/* #205/#217: Reiter — Übersicht · Master (Meistergrade) · Challenges (Seeds nachspielen). */}
        <div className="flex gap-1 mt-4" role="tablist">
          {[["overview", "Übersicht"], ["master", "Master"], ["challenges", "Challenges"]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className="relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={tab === id ? { background: "#8a7de0", color: "#141419" } : { background: "#20202a", color: "#c8c8d0", border: "1px solid #30303a" }}>
              {label}
              {/* #217: „Experimentell"-Marker am Master-Reiter — Stil wie der TESTBRANCH-Marker (Gold-Pill, font-pixel), am Button verankert. */}
              {id === "master" && (
                <span className="absolute -top-1.5 -right-1.5 px-1 rounded text-[8px] font-bold font-pixel leading-tight"
                  style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 6px rgba(212,166,58,.6)" }} aria-label="experimentell">
                  exp
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "master" ? (
          <MasterPanel profile={profile} best={best} />
        ) : tab === "challenges" ? (
          <ChallengesPanel seeds={seeds} onPlaySeed={onPlaySeed} />
        ) : empty ? (
          <div className="text-center opacity-50 py-12">Noch keine Läufe — spiel einen Run, dann erscheinen hier deine Statistiken.</div>
        ) : (
          <>
            {/* Übersicht / Profil */}
            <Section title="Übersicht">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <Kpi label="Spiele" value={games} />
                <Kpi label="Bestscore" value={fmtScore(profile.bestScore)} color="#d4a63a" />
                <Kpi label="Ø-Score" value={fmtScore(avgScore)} />
                <Kpi label="Spielzeit" value={fmtDuration(profile.totalDurationMs)} />
                <Kpi label="Beste Serie" value={`${profile.bestStreak || 0}×`} />
              </div>
              <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "#141419", border: "1px solid #26262e" }}>
                <div className="text-[11px] opacity-50 mb-1">Score-Verlauf (letzte {trend.length})</div>
                <Sparkline current={trend} record={[]} height={70} />
              </div>
            </Section>

            {/* Bestes Build */}
            {best && (
              <Section title="Bestes Build">
                <button onClick={() => setDetail({ entry: best, rank: 1 })} title="Details anzeigen"
                  className="w-full text-left rounded-xl px-4 py-3 transition-all hover:brightness-125"
                  style={{ background: "#141419", border: "1px solid #2a2a34" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold" style={{ color: "#d4a63a" }}>{fmtScore(best.score)}</div>
                      <div className="text-[11px] opacity-50">Rekord-Lauf · Details ansehen ›</div>
                    </div>
                    <div className="text-2xl">{(best.archetypes || []).map((a, i) => <span key={i}>{archIcon(a)}</span>)}</div>
                  </div>
                  <div className="mt-2"><StackedBar segments={originSegs(scoreOrigin(best))} /></div>
                </button>
              </Section>
            )}

            {/* Läufe (History) */}
            <Section title="Läufe" hint={`letzte ${Math.min(history.length, 10)}`}>
              <div className="grid gap-1">
                {history.slice(0, 10).map((r, i) => {
                  const delta = Math.floor((r.score || 0) - (profile.bestScore || 0));
                  const critPct = r.wins > 0 ? Math.round(((r.crits || 0) / r.wins) * 100) : null;
                  return (
                    <button key={r.ts || i} onClick={() => setDetail({ entry: r, rank: null })} title="Details anzeigen"
                      className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded text-left transition-all hover:brightness-125"
                      style={{ background: "#20202a" }}>
                      <span className="opacity-45 w-16 shrink-0">{r.ts ? new Date(r.ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "—"}</span>
                      <span className="font-bold w-20 shrink-0" style={{ color: "#d4a63a" }}>{fmtScore(r.score)}</span>
                      <span className="w-16 shrink-0 tabular-nums" style={{ color: delta >= 0 ? "#5ab87a" : "#8a8a95" }}>
                        {delta >= 0 ? "Rekord" : fmtScore(delta)}
                      </span>
                      <span className="hidden sm:inline opacity-55 w-12 shrink-0">{(r.bestStreak || 0)}×</span>
                      <span className="hidden sm:inline opacity-55 w-12 shrink-0">{critPct == null ? "–" : `${critPct}%`}</span>
                      <span className="flex-1 truncate">{(r.archetypes || []).map((a, k) => <span key={k}>{archIcon(a)}</span>)}</span>
                      <span className="opacity-45 shrink-0 tabular-nums">{fmtDuration(r.durationMs || 0)}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Analyse */}
            <Section title="Analyse" hint="Ø über die Historie">
              <div className="rounded-lg px-3 py-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                <div className="text-[11px] opacity-50 mb-2">Score-Herkunft</div>
                <StackedBar segments={originSegs(origin)} />
                <div className="text-[11px] opacity-40 mt-2.5 leading-relaxed">
                  <b style={{ color: ORIGIN_META.rest.color }}>Elementar &amp; Basis</b> bündelt Basissiege, Serie und alle Archetyp-Mechaniken (Feuer/Eis/Blitz/Pflanze) — noch nicht einzeln aufgeschlüsselt. <b style={{ color: ORIGIN_META.crits.color }}>Crit-Bonus</b> stammt seit v0.3 nur aus Blitz&nbsp;+ dem Crit-Stat, nicht mehr universell.
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg px-3 py-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  <div className="text-[11px] opacity-50 mb-2">Meistgewählte Perks</div>
                  <div className="grid gap-1.5">
                    {perkRates.length === 0 ? <span className="text-xs opacity-40">–</span> :
                      perkRates.map((p) => <BarRow key={p.id} label={perkLabel(p.id)} color={perkColor(p.id)} frac={p.rate} right={pct(p.rate)} />)}
                  </div>
                </div>
                <div className="rounded-lg px-3 py-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  <div className="text-[11px] opacity-50 mb-2">Meistgewählte Skills</div>
                  <div className="grid gap-1.5">
                    {skillRates.length === 0 ? <span className="text-xs opacity-40">Noch keine Skills gespielt.</span> :
                      skillRates.map((s) => <BarRow key={s.id} label={skillLabel(s.id)} color={skillColor(s.id)} frac={s.rate} right={pct(s.rate)} />)}
                  </div>
                </div>
              </div>
              {archUse.length > 0 && (
                <div className="rounded-lg px-3 py-3 mt-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  <div className="text-[11px] opacity-50 mb-2">Archetyp-Nutzung</div>
                  <div className="grid gap-1.5">
                    {archUse.map((a) => (
                      <BarRow key={a.arch} label={`${archIcon(a.arch)} ${archLabel(a.arch)}`} color={archColor(a.arch)} frac={a.rate}
                        right={`${a.count}× · Ø ${fmtScore(a.avgScore)}`} />
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Optimale Analyse */}
            <Section title="Optimale Analyse" hint="was bei dir am besten läuft">
              {!enough ? (
                <div className="rounded-lg px-3 py-3 text-xs opacity-55" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  Zu wenige Läufe für belastbare Aussagen ({history.length}/{MIN_SAMPLE}). Spiel noch ein paar Runs.
                </div>
              ) : (
                <div className="grid gap-2 text-xs">
                  {bestArch[0] && (
                    <div className="rounded-lg px-3 py-2.5" style={{ background: "#141419", border: "1px solid #26262e" }}>
                      <span className="opacity-55">Bester Archetyp: </span>
                      <span className="font-bold" style={{ color: archColor(bestArch[0].arch) }}>{archIcon(bestArch[0].arch)} {archLabel(bestArch[0].arch)}</span>
                      <span className="opacity-70"> — Ø {fmtScore(bestArch[0].avgScore)} über {bestArch[0].count} Läufe.</span>
                    </div>
                  )}
                  {perkLift.length > 0 && (
                    <div className="rounded-lg px-3 py-2.5" style={{ background: "#141419", border: "1px solid #26262e" }}>
                      <div className="opacity-55 mb-1">Perks mit dem größten Score-Lift</div>
                      {perkLift.map((p) => (
                        <div key={p.id} className="flex justify-between"><span style={{ color: perkColor(p.id) }}>{perkLabel(p.id)}</span>
                          <span className="opacity-70 tabular-nums">+{fmtScore(p.lift)} Ø · {p.count}×</span></div>
                      ))}
                    </div>
                  )}
                  {skillLift.length > 0 && (
                    <div className="rounded-lg px-3 py-2.5" style={{ background: "#141419", border: "1px solid #26262e" }}>
                      <div className="opacity-55 mb-1">Skills mit dem größten Score-Lift</div>
                      {skillLift.map((s) => (
                        <div key={s.id} className="flex justify-between"><span style={{ color: skillColor(s.id) }}>{skillLabel(s.id)}</span>
                          <span className="opacity-70 tabular-nums">+{fmtScore(s.lift)} Ø · {s.count}×</span></div>
                      ))}
                    </div>
                  )}
                  {topOrigin.runs > 0 && topOrigin.total > 0 && (
                    <div className="rounded-lg px-3 py-2.5" style={{ background: "#141419", border: "1px solid #26262e" }}>
                      <span className="opacity-55">Score-Herkunft deiner Top-{topOrigin.runs}: </span>
                      <span style={{ color: ORIGIN_META.formations.color }}>{pct(topOrigin.shares.formations)} {ORIGIN_META.formations.label}</span>
                      <span className="opacity-40"> · </span>
                      <span style={{ color: ORIGIN_META.crits.color }}>{pct(topOrigin.shares.crits)} {ORIGIN_META.crits.label}</span>
                      <span className="opacity-40"> · </span>
                      <span style={{ color: ORIGIN_META.rest.color }}>{pct(topOrigin.shares.rest)} {ORIGIN_META.rest.label}</span>.
                    </div>
                  )}
                </div>
              )}
            </Section>
          </>
        )}
      </div>

      {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} onPlaySeed={onPlaySeed} />}
    </div>
  );
}
