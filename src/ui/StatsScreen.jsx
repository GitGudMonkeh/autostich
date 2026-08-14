import { useMemo, useState } from "react";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { Sparkline } from "./Sparkline.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { factionShares } from "./RunGraphs.jsx"; // Stats-Redesign: dieselbe Fraktions-Score-Herkunft wie im Victory-Screen
import { loadRunHistory, loadProfile } from "../game/storage.js";
import { PERK_DEFS, CATEGORIES } from "../game/perks.js";
import { SKILL_DEFS, ARCHETYPE_META } from "../game/skills.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import {
  MIN_SAMPLE, hasEnoughData, pickRates,
  archetypeUsage, bestArchetype, scoreLift, bestRun,
} from "../game/runStats.js";
import { fmtScore, fmtScoreShort } from "./format.js";
import { fmtDuration } from "../game/deck.js";

/* #172 FB-10 — Statistik-Hub (Hauptmenü). Rein lokal aus der Lauf-Historie (storage.loadRunHistory)
   + Profil-Totals (loadProfile), aggregiert über game/runStats.js. Wiederverwendung: Sparkline (Score-Trend),
   RunDetail/RunStats (Klick auf einen Lauf → derselbe Statblock wie im Victory-Screen, #169 FB-8). */

const perkLabel = (id) => PERK_DEFS[id]?.label || id;
const skillLabel = (id) => SKILL_DEFS[id]?.name || id;
const perkColor = (id) => CATEGORIES[PERK_DEFS[id]?.cat]?.color || "#8a8a95";
const skillColor = (id) => (ARCHETYPE_META[SKILL_DEFS[id]?.archetype] || {}).color || "#8a8a95";
const archLabel = (a) => (ARCHETYPE_META[a] || {}).label || a;
const archColor = (a) => (ARCHETYPE_META[a] || {}).color || "#8a8a95";
const pct = (x) => `${Math.round((x || 0) * 100)}%`;

// #253/Stats-Redesign: nowrap+truncate + optionaler Tooltip → große Score-Werte (fmtScoreShort am Aufrufer) sprengen die Kachel nicht.
// `className` erlaubt Spalten-Spans (mobil bekommen die Score-Kacheln eine ganze halbe Reihe, damit „Mio." nicht abgeschnitten wird).
function Kpi({ label, value, color, title, className = "" }) {
  return (
    <div title={title} className={`rounded-lg px-3 py-2 text-center min-w-0 ${className}`} style={{ background: "#141419", border: "1px solid #26262e" }}>
      <div className="opacity-50 text-[11px] truncate">{label}</div>
      <div className="font-bold text-lg tabular-nums whitespace-nowrap overflow-hidden text-ellipsis" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

// Gesamt-Spielzeit in Stunden+Minuten (z. B. „6h 57m") — lesbarer als die Roh-MM:SS-Ausgabe von fmtDuration bei langen Spielzeiten.
const fmtHours = (ms) => {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

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

// Stats-Redesign: „Was am besten läuft"-Zeile — zweizeilig: Tag oben als Label, darunter Aussage + optionaler Zahlenwert
// rechts. So bleibt es auch auf schmalen Screens sauber lesbar (statt Tag/Text/Wert in einer engen Zeile zu quetschen).
function WinRow({ tag, children, val }) {
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#141419", border: "1px solid #26262e" }}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-45 mb-1">{tag}</div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0">{children}</span>
        {val && <span className="tabular-nums font-bold whitespace-nowrap shrink-0" style={{ color: "#5ab87a" }}>{val}</span>}
      </div>
    </div>
  );
}

export function StatsScreen({ onClose, onPlaySeed = null }) {
  useEscape(onClose);
  const [detail, setDetail] = useState(null); // { entry, rank } | null

  // Beim Öffnen einmal frisch laden (nach jedem Lauf aktuell).
  const history = useMemo(() => loadRunHistory(), []);
  const profile = useMemo(() => loadProfile(), []);

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
    <div className={`fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 ${detail ? "overflow-hidden" : "overflow-y-auto"}`}
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl px-5 pb-5 sm:px-6 sm:pb-6 my-auto overlay-card as-panel"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* #UI: Kopf mit Schließen-Knopf STICKY → beim Scrollen oben rechts erreichbar (Abstand opak im Header, kein negativer Margin). */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-center justify-between gap-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <h2 className="text-lg font-bold flex items-center gap-2">Statistiken</h2>
          <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>Schließen</ActionButton>
        </div>

        {empty ? (
          <div className="text-center opacity-50 py-12">Noch keine Läufe — spiel einen Run, dann erscheinen hier deine Statistiken.</div>
        ) : (
          <>
            {/* KPI-Band + Score-Verlauf. Score-Kacheln kompakt abgekürzt (fmtScoreShort) + voller Wert im Tooltip → kein Overflow. */}
            {/* KPI-Band: mobil 2 breite Score-Kacheln oben (damit „Mio." reinpasst) + Zeit·Spiele·Beste Serie darunter;
                Desktop alle fünf in einer Reihe. 6-Spalten-Raster mobil (3+3 / 2+2+2), 5 Spalten ab sm. */}
            <Section title="Übersicht">
              <div className="grid grid-cols-6 sm:grid-cols-5 gap-2">
                <Kpi className="col-span-3 sm:col-span-1" label="Bestscore" value={fmtScoreShort(profile.bestScore)} title={fmtScore(profile.bestScore)} color="#d4a63a" />
                <Kpi className="col-span-3 sm:col-span-1" label="Ø-Score" value={fmtScoreShort(avgScore)} title={fmtScore(avgScore)} />
                <Kpi className="col-span-2 sm:col-span-1" label="Spielzeit" value={fmtHours(profile.totalDurationMs)} title={fmtDuration(profile.totalDurationMs)} />
                <Kpi className="col-span-2 sm:col-span-1" label="Spiele" value={games} />
                <Kpi className="col-span-2 sm:col-span-1" label="Beste Serie" value={`${profile.bestStreak || 0}×`} />
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
                    <div className="text-2xl shrink-0 leading-none">{(best.archetypes || []).map((a, i) => <FactionIcon key={i} type={a} size={20} />)}</div>
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
                        <span className="whitespace-nowrap">{(r.archetypes || []).map((a, k) => <FactionIcon key={k} type={a} size={13} />)}</span>
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
                      <BarRow key={a.arch} label={archLabel(a.arch)} color={archColor(a.arch)} frac={a.rate}
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
                      <b style={{ color: archColor(bestArch[0].arch) }}><FactionIcon type={bestArch[0].arch} size={13} /> {archLabel(bestArch[0].arch)}</b>
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
