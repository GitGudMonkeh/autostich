import { Fragment, useMemo, useState, useEffect } from "react";
import { useEscape } from "./useEscape.js";
import { Sparkline } from "./Sparkline.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { SeedChip } from "./SeedChip.jsx"; // #205 Challenger Mode: kopierbarer Seed + Nachspielen
import { factionShares } from "./RunGraphs.jsx"; // Stats-Redesign: dieselbe Fraktions-Score-Herkunft wie im Victory-Screen
import { fetchSeedTop, leaderboardConfigured } from "../game/leaderboard.js"; // #205 Schicht B: globaler Top-3-pro-Seed
import { loadRunHistory, loadProfile } from "../game/storage.js";
import { PERK_DEFS, CATEGORIES } from "../game/perks.js";
import { SKILL_DEFS, ARCHETYPE_META } from "../game/skills.js";
import {
  MIN_SAMPLE, hasEnoughData, pickRates,
  archetypeUsage, bestArchetype, scoreLift, bestRun,
} from "../game/runStats.js";
import { fmtScore, fmtScoreShort } from "./format.js";
import { fmtDuration } from "../game/deck.js";
import { MASTERY_THRESHOLDS, MASTERY_REWARD_LABELS, MASTERY_MAX_GRADE, MASTERY_MEISTER_MAX, isGrandmaster, rankRoman, masteryGradeLabel } from "../game/mastery.js"; // #217/#226 Meister- & Großmeisterränge
import { DECK_DEFS } from "../game/cosmetics.js"; // #217: Grad-Deck-Namen

/* #172 FB-10 — Statistik-Hub (Hauptmenü). Rein lokal aus der Lauf-Historie (storage.loadRunHistory)
   + Profil-Totals (loadProfile), aggregiert über game/runStats.js. Wiederverwendung: Sparkline (Score-Trend),
   RunDetail/RunStats (Klick auf einen Lauf → derselbe Statblock wie im Victory-Screen, #169 FB-8). */

const perkLabel = (id) => PERK_DEFS[id]?.label || id;
const skillLabel = (id) => SKILL_DEFS[id]?.name || id;
const perkColor = (id) => CATEGORIES[PERK_DEFS[id]?.cat]?.color || "#8a8a95";
const skillColor = (id) => (ARCHETYPE_META[SKILL_DEFS[id]?.archetype] || {}).color || "#8a8a95";
const archIcon = (a) => (ARCHETYPE_META[a] || {}).icon || "";
const archLabel = (a) => (ARCHETYPE_META[a] || {}).label || a;
const archColor = (a) => (ARCHETYPE_META[a] || {}).color || "#8a8a95";
const pct = (x) => `${Math.round((x || 0) * 100)}%`;

// #253/Stats-Redesign: nowrap+truncate + optionaler Tooltip → große Score-Werte (fmtScoreShort am Aufrufer) sprengen die Kachel nicht.
function Kpi({ label, value, color, title }) {
  return (
    <div title={title} className="rounded-lg px-3 py-2 text-center min-w-0" style={{ background: "#141419", border: "1px solid #26262e" }}>
      <div className="opacity-50 text-[11px] truncate">{label}</div>
      <div className="font-bold text-lg tabular-nums whitespace-nowrap overflow-hidden text-ellipsis" style={color ? { color } : undefined}>{value}</div>
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

/* Stats-Redesign: Fraktions-Score-Herkunft EINES Laufs — gestapelter Balken + Inline-Legende mit %. Nutzt dieselbe
   factionShares-Zerlegung wie der Victory-Screen. Neue Läufe (mit gespeicherten Fraktions-Kanälen) zeigen die feine
   Aufschlüsselung (Gletscher/Pflanze/Blitz/Feuer + Formation/Crit/Serie/Gebäude); ältere Läufe ohne die Kanäle
   klemmen automatisch aufs grobe Modell (Formation/Crit/Gebäude/Sonstige). */
function BuildHerkunft({ run }) {
  const { score, rows } = factionShares(run);
  if (!score || !rows.length) return null;
  const p = (v) => Math.round((v / score) * 100);
  return (
    <>
      <div className="flex h-3 w-full rounded overflow-hidden mt-3" style={{ background: "#0c0d14", border: "1px solid #26262e" }}>
        {rows.map((r) => (
          <div key={r.key} style={{ width: `${(r.value / score) * 100}%`, background: r.color }} title={`${r.label}: ${fmtScore(r.value)} (${p(r.value)} %)`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2.5 text-[11px]">
        {rows.map((r) => (
          <span key={r.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
            <span className="opacity-70">{r.label}</span>
            <b className="tabular-nums" style={{ color: r.color }}>{p(r.value)} %</b>
          </span>
        ))}
      </div>
    </>
  );
}

// Horizontaler Balken für eine Liste (Pick-Raten / Archetyp-Nutzung) — Label + Wert oben, Track darunter (flexibel,
// kein festes Label-w mehr → truncatet sauber statt zu kollidieren).
function BarRow({ label, color, frac, right }) {
  return (
    <div className="grid items-center gap-x-2.5" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
      <span className="text-xs truncate" style={{ color }} title={label}>{label}</span>
      <span className="text-[11px] tabular-nums opacity-60 text-right whitespace-nowrap">{right}</span>
      <div className="col-span-2 h-1.5 rounded overflow-hidden mt-1" style={{ background: "#0c0d14" }}>
        <div className="h-full rounded" style={{ width: `${Math.max(3, (frac || 0) * 100)}%`, background: color, opacity: 0.85 }} />
      </div>
    </div>
  );
}

// Stats-Redesign: kompakte „Was am besten läuft"-Zeile — Tag links, Aussage, optional ein Zahlenwert rechts.
function WinRow({ tag, children, val }) {
  return (
    <div className="rounded-lg px-3 py-2.5 flex items-center gap-3 text-xs" style={{ background: "#141419", border: "1px solid #26262e" }}>
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-45 shrink-0">{tag}</span>
      <span className="flex-1 min-w-0">{children}</span>
      {val && <span className="tabular-nums font-bold whitespace-nowrap shrink-0" style={{ color: "#5ab87a" }}>{val}</span>}
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
  const perkRates = useMemo(() => pickRates(history, "perks").slice(0, 5), [history]);
  const skillRates = useMemo(() => pickRates(history, "skills").slice(0, 5), [history]);
  const archUse = useMemo(() => archetypeUsage(history), [history]);
  const enough = hasEnoughData(history);
  const bestArch = useMemo(() => (enough ? bestArchetype(history) : []), [history, enough]);
  const perkLift = useMemo(() => (enough ? scoreLift(history, "perks").filter((x) => x.lift > 0) : []), [history, enough]);
  const skillLift = useMemo(() => (enough ? scoreLift(history, "skills").filter((x) => x.lift > 0) : []), [history, enough]);

  const trend = history.slice(0, 10).map((r) => Math.floor(r.score || 0)).reverse(); // ältester → neuester
  // Untertitel der „Bestes Build"-Karte: genutzte Archetypen + (falls vorhanden) der Seed.
  const buildSubtitle = (r) => [
    (r.archetypes || []).map(archLabel).join(" · ") || null,
    r.seedCode ? `Seed ${r.seedCode}` : null,
  ].filter(Boolean).join(" · ");
  // Grobes Herkunft-Modell? (Alt-Lauf ohne die neuen Fraktions-Kanäle → factionShares zeigt nur Formation/Crit/Gebäude/Sonstige.)
  const hasFineOrigin = (r) => !!r && (["glacierYield", "lightYield", "plantRoot", "plantBloom", "plantHarvest", "fireBase", "fireWhite", "streakScore"]
    .reduce((a, k) => a + (Number(r[k]) || 0), 0) > 0);

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
            {/* KPI-Band + Score-Verlauf. Score-Kacheln kompakt abgekürzt (fmtScoreShort) + voller Wert im Tooltip → kein Overflow. */}
            <Section title="Übersicht">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <Kpi label="Spiele" value={games} />
                <Kpi label="Bestscore" value={fmtScoreShort(profile.bestScore)} title={fmtScore(profile.bestScore)} color="#d4a63a" />
                <Kpi label="Ø-Score" value={fmtScoreShort(avgScore)} title={fmtScore(avgScore)} />
                <Kpi label="Spielzeit" value={fmtDuration(profile.totalDurationMs)} />
                <Kpi label="Beste Serie" value={`${profile.bestStreak || 0}×`} />
              </div>
              <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "#141419", border: "1px solid #26262e" }}>
                <div className="text-[11px] opacity-50 mb-1">Score-Verlauf · letzte {trend.length} Läufe</div>
                <Sparkline current={trend} record={[]} height={70} />
              </div>
            </Section>

            {/* Bestes Build — die EINZIGE Score-Herkunft im Screen (Fraktions-Aufschlüsselung des Rekord-Laufs). */}
            {best && (
              <Section title="Bestes Build" hint="Rekord-Lauf · Details ansehen ›">
                <button onClick={() => setDetail({ entry: best, rank: 1 })} title="Details anzeigen"
                  className="w-full text-left rounded-xl px-4 py-4 transition-all hover:brightness-125"
                  style={{ background: "#141419", border: "1px solid #2a2a34" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-3xl font-bold tabular-nums leading-none" title={fmtScore(best.score)} style={{ color: "#d4a63a" }}>{fmtScoreShort(best.score)}</div>
                      {buildSubtitle(best) && <div className="text-[11px] opacity-50 mt-1.5 truncate">{buildSubtitle(best)}</div>}
                    </div>
                    <div className="text-2xl shrink-0 leading-none">{(best.archetypes || []).map((a, i) => <span key={i}>{archIcon(a)}</span>)}</div>
                  </div>
                  <BuildHerkunft run={best} />
                  {!hasFineOrigin(best) && (
                    <div className="text-[10px] opacity-40 mt-2.5 leading-relaxed">Älterer Lauf — grobes Herkunft-Modell (Formation / Crit / Gebäude / Sonstige). Neue Läufe zeigen die feine Fraktions-Aufschlüsselung.</div>
                  )}
                </button>
              </Section>
            )}

            {/* Deine Läufe — overflow-fest: flexibles Grid (auto · 1fr · auto) statt fester Spaltenbreiten, Scores abgekürzt. */}
            <Section title="Deine Läufe" hint={`letzte ${Math.min(history.length, 10)}`}>
              <div className="grid gap-1">
                {history.slice(0, 10).map((r, i) => {
                  const delta = Math.floor((r.score || 0) - (profile.bestScore || 0));
                  const critPct = r.wins > 0 ? Math.round(((r.crits || 0) / r.wins) * 100) : null;
                  return (
                    <button key={r.ts || i} onClick={() => setDetail({ entry: r, rank: null })} title="Details anzeigen"
                      className="grid items-center gap-2.5 text-xs px-2.5 py-1.5 rounded text-left transition-all hover:brightness-125"
                      style={{ background: "#20202a", gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
                      <span className="opacity-45 tabular-nums shrink-0">{r.ts ? new Date(r.ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "—"}</span>
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="font-bold tabular-nums shrink-0" title={fmtScore(r.score)} style={{ color: "#d4a63a" }}>{fmtScoreShort(r.score)}</span>
                        <span className="tabular-nums shrink-0" style={{ color: delta >= 0 ? "#5ab87a" : "#8a8a95" }}>{delta >= 0 ? "Rekord" : fmtScoreShort(delta)}</span>
                        <span className="hidden sm:inline opacity-55 shrink-0">{(r.bestStreak || 0)}×</span>
                        <span className="hidden sm:inline opacity-55 shrink-0">{critPct == null ? "–" : `${critPct}%`}</span>
                      </span>
                      <span className="flex items-center gap-2.5 shrink-0">
                        <span className="whitespace-nowrap">{(r.archetypes || []).map((a, k) => <span key={k}>{archIcon(a)}</span>)}</span>
                        <span className="opacity-45 tabular-nums">{fmtDuration(r.durationMs || 0)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Am häufigsten — was du wählst: Skills + Perks nebeneinander, darunter Archetyp-Nutzung (ersetzt „Analyse"). */}
            <Section title="Am häufigsten" hint="über deine Historie">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg px-3 py-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  <div className="text-[10px] uppercase tracking-wide opacity-50 mb-2.5">Meistgewählte Skills</div>
                  <div className="grid gap-2.5">
                    {skillRates.length === 0 ? <span className="text-xs opacity-40">Noch keine Skills gespielt.</span> :
                      skillRates.map((s) => <BarRow key={s.id} label={skillLabel(s.id)} color={skillColor(s.id)} frac={s.rate} right={pct(s.rate)} />)}
                  </div>
                </div>
                <div className="rounded-lg px-3 py-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  <div className="text-[10px] uppercase tracking-wide opacity-50 mb-2.5">Meistgewählte Perks</div>
                  <div className="grid gap-2.5">
                    {perkRates.length === 0 ? <span className="text-xs opacity-40">–</span> :
                      perkRates.map((p) => <BarRow key={p.id} label={perkLabel(p.id)} color={perkColor(p.id)} frac={p.rate} right={pct(p.rate)} />)}
                  </div>
                </div>
              </div>
              {archUse.length > 0 && (
                <div className="rounded-lg px-3 py-3 mt-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  <div className="text-[10px] uppercase tracking-wide opacity-50 mb-2.5">Archetyp-Nutzung</div>
                  <div className="grid gap-2.5">
                    {archUse.map((a) => (
                      <BarRow key={a.arch} label={`${archIcon(a.arch)} ${archLabel(a.arch)}`} color={archColor(a.arch)} frac={a.rate}
                        right={`${a.count}× · Ø ${fmtScoreShort(a.avgScore)}`} />
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Was am besten läuft — die belastbaren Insights als kompakte Highlight-Zeilen (ersetzt „Optimale Analyse"). */}
            <Section title="Was am besten läuft" hint={`ab ${MIN_SAMPLE} Läufen`}>
              {!enough ? (
                <div className="rounded-lg px-3 py-3 text-xs opacity-55" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  Zu wenige Läufe für belastbare Aussagen ({history.length}/{MIN_SAMPLE}). Spiel noch ein paar Runs.
                </div>
              ) : (bestArch[0] || skillLift[0] || perkLift[0]) ? (
                <div className="flex flex-col gap-2">
                  {bestArch[0] && (
                    <WinRow tag="Bester Archetyp">
                      <b style={{ color: archColor(bestArch[0].arch) }}>{archIcon(bestArch[0].arch)} {archLabel(bestArch[0].arch)}</b>
                      <span className="opacity-70"> — Ø {fmtScoreShort(bestArch[0].avgScore)} über {bestArch[0].count} Läufe</span>
                    </WinRow>
                  )}
                  {skillLift[0] && (
                    <WinRow tag="Größter Skill-Lift" val={`+${fmtScoreShort(skillLift[0].lift)} Ø`}>
                      <b style={{ color: skillColor(skillLift[0].id) }}>{skillLabel(skillLift[0].id)}</b>
                      <span className="opacity-55"> · {skillLift[0].count}× gespielt</span>
                    </WinRow>
                  )}
                  {perkLift[0] && (
                    <WinRow tag="Größter Perk-Lift" val={`+${fmtScoreShort(perkLift[0].lift)} Ø`}>
                      <b style={{ color: perkColor(perkLift[0].id) }}>{perkLabel(perkLift[0].id)}</b>
                      <span className="opacity-55"> · {perkLift[0].count}× gespielt</span>
                    </WinRow>
                  )}
                </div>
              ) : (
                <div className="rounded-lg px-3 py-3 text-xs opacity-55" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  Noch keine klaren Muster — deine Wahl variiert (noch) zu stark für belastbare Lift-Aussagen.
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
