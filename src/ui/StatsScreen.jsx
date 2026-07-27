import { useMemo, useState } from "react";
import { useEscape } from "./useEscape.js";
import { Sparkline } from "./Sparkline.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { loadRunHistory, loadProfile } from "../game/storage.js";
import { PERK_DEFS, CATEGORIES } from "../game/perks.js";
import { SKILL_DEFS, ARCHETYPE_META } from "../game/skills.js";
import {
  MIN_SAMPLE, hasEnoughData, avgScoreOrigin, scoreOrigin, pickRates,
  archetypeUsage, bestArchetype, scoreLift, topRunsOrigin, bestRun, achievements,
} from "../game/runStats.js";
import { fmtScore } from "./format.js";
import { fmtDuration } from "../game/deck.js";

/* #172 FB-10 — Statistik-Hub (Hauptmenü). Rein lokal aus der Lauf-Historie (storage.loadRunHistory)
   + Profil-Totals (loadProfile), aggregiert über game/runStats.js. Wiederverwendung: Sparkline (Score-Trend),
   RunDetail/RunStats (Klick auf einen Lauf → derselbe Statblock wie im Victory-Screen, #169 FB-8). */

const ORIGIN_META = {
  formations: { label: "Formationen", color: "#5ab87a" },
  crits: { label: "Crits", color: "#e879f9" },
  rest: { label: "Übrige", color: "#8a8a95" },
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

export function StatsScreen({ onClose }) {
  useEscape(onClose);
  const [detail, setDetail] = useState(null); // { entry, rank } | null

  // Beim Öffnen einmal frisch laden (nach jedem Lauf aktuell).
  const history = useMemo(() => loadRunHistory(), []);
  const profile = useMemo(() => loadProfile(), []);

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
  const achv = useMemo(() => achievements(history, profile), [history, profile]);

  const trend = history.slice(0, 10).map((r) => Math.floor(r.score || 0)).reverse(); // ältester → neuester
  const originSegs = (o) => [
    { key: "formations", label: ORIGIN_META.formations.label, color: ORIGIN_META.formations.color, value: o.formations },
    { key: "crits", label: ORIGIN_META.crits.label, color: ORIGIN_META.crits.color, value: o.crits },
    { key: "rest", label: ORIGIN_META.rest.label, color: ORIGIN_META.rest.color, value: o.rest },
  ];

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6 my-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">📊 Statistiken</h2>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>

        {empty ? (
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
                      <span style={{ color: ORIGIN_META.formations.color }}>{pct(topOrigin.shares.formations)} Formationen</span>
                      <span className="opacity-40"> · </span>
                      <span style={{ color: ORIGIN_META.crits.color }}>{pct(topOrigin.shares.crits)} Crits</span>
                      <span className="opacity-40"> · </span>
                      <span style={{ color: ORIGIN_META.rest.color }}>{pct(topOrigin.shares.rest)} übrig</span>.
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Achievements / Meilensteine */}
            <Section title="Meilensteine" hint={`${achv.filter((a) => a.done).length}/${achv.length}`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {achv.map((a) => (
                  <div key={a.id} title={a.done ? a.desc : `${a.desc} (${fmtScore(a.cur)}/${fmtScore(a.target)})`}
                    className="rounded-lg px-2.5 py-2 text-center transition-opacity"
                    style={{ background: "#141419", border: `1px solid ${a.done ? "#d4a63a55" : "#26262e"}`, opacity: a.done ? 1 : 0.5 }}>
                    <div className="text-xl" style={{ filter: a.done ? "none" : "grayscale(1)" }}>{a.icon}</div>
                    <div className="text-[11px] font-semibold mt-0.5" style={{ color: a.done ? "#d4a63a" : "#c8c8ce" }}>{a.label}</div>
                    {!a.done && <div className="text-[10px] opacity-60 tabular-nums">{fmtScore(a.cur)}/{fmtScore(a.target)}</div>}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>

      {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} />}
    </div>
  );
}
