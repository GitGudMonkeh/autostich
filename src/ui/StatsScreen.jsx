import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { useIsWide } from "./useIsWide.js"; // #st-fenster: die Lauf-Liste füllt ihre Spalte NUR ab 1280 px
import { MODAL_CARD, MENU_PANEL, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { Sparkline } from "./Sparkline.jsx";
import { RunDetail } from "./RunDetail.jsx";
import { factionShares } from "./RunGraphs.jsx"; // Stats-Redesign: dieselbe Fraktions-Score-Herkunft wie im Victory-Screen
import { loadRunHistory, loadProfile, RUN_HISTORY_CAP } from "../game/storage.js";
import { PERK_DEFS, CATEGORIES } from "../game/perks.js";

import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import {
  MIN_SAMPLE, hasEnoughData, pickRates,
  archetypeUsage, bestArchetype, scoreLift, bestRun,
} from "../game/runStats.js";
import { fmtScore, fmtScoreShort } from "./format.js";
import { fmtDuration } from "../game/deck.js";
import { skillDef, archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { ARCHETYPE_ORDER } from "../game/skills.js"; // #st-plaetze: die vier Archetypen als HÖCHSTFALL der Nutzungsliste
import { t, fmtDayMonth, fmtPct } from "../i18n/index.js";

/* #172 FB-10 — Statistik-Hub (Hauptmenü). Rein lokal aus der Lauf-Historie (storage.loadRunHistory)
   + Profil-Totals (loadProfile), aggregiert über game/runStats.js. Wiederverwendung: Sparkline (Score-Trend),
   RunDetail/RunStats (Klick auf einen Lauf → derselbe Statblock wie im Victory-Screen, #169 FB-8). */

/* #menu-rework M7 — DER ZIELENTWURF, `docs/statistik-redesign.md`.

   Drei Entscheidungen dieses Screens stehen hier, weil sie DOM-Struktur sind und keine Anordnung —
   eine Media Query kann sie nicht beantworten:

   1. **Der Kopf verlässt den Scroller.** Er stand als `sticky` IM Scroller, und das war die Notlösung
      dafür, dass der Screen als einziger des Passes das FENSTER scrollt statt eines Panels: die Karte
      ist an 1280 × 720, 1400 × 700 und 1536 × 791 gemessen dieselben 982,6 px hoch (die Sektionshöhen
      hängen nicht am Fenster, nur die Breiten), also lagen 272,6 px unter der Falz und der Überzug
      lief 1,40× mit. Jetzt klemmt die Karte auf die Fensterhöhe, der Kopf steht fest und `.st-body`
      scrollt — EIN Scroller, nicht drei. Damit verhält sich der Screen wie Baum und Bestenliste.
   2. **Jede Spalte ist ein eigener Stapel** (`.st-col1`), keine Rasterzeile. Vorher streckten sich
      die Zeilen am längsten Nachbarn und zogen die zwei kurzen Panels der ersten Spalte auseinander —
      eine Lücke MITTEN in der Spalte. Restluft sammelt sich am Fuß, nie zwischen zwei Panels
      (design-sprache.md §1).
   3. **Die Lauf-Liste füllt ihre Spalte.** Sie zeigte `slice(0, 10)`, während der Speicher
      `RUN_HISTORY_CAP` = 30 hält; gefüllt wird mit VORHANDENEM Inhalt, nie mit erfundenem.

   Was bewusst NICHT hier steht: Spaltenbreiten, Panel-Flächen, Abstände. Das ist Anordnung und
   gehört ins Stylesheet. Unter 1280 px ist jede Klammer `display: contents` und die Handy-Fassung
   damit unverändert — dieselbe Naht wie `.op-col2` und `.rd-left`. */

const perkLabel = (id) => PERK_DEFS[id]?.label || id;
const skillLabel = (id) => skillDef(id)?.name || id;
const perkColor = (id) => CATEGORIES[PERK_DEFS[id]?.cat]?.color || "#8a8a95";
const skillColor = (id) => (archMeta(skillDef(id)?.archetype) || {}).color || "#8a8a95";
const archLabel = (a) => (archMeta(a) || {}).label || a;
const archColor = (a) => (archMeta(a) || {}).color || "#8a8a95";
const pct = (x) => `${Math.round((x || 0) * 100)}%`;

/* #st-plaetze — die HÖCHSTFÄLLE der vier reservierten Blöcke, aus dem Code abgelesen und nicht
   geschätzt (design-sprache.md §1, „Wenn die Anzahl schwankt": ein ZIEL reserviert Platz nach dem
   Höchstfall, lässt freie Plätze gedämpft stehen und sagt, was fehlt).

     Skills · Perks   `pickRates(...).slice(0, 5)` unten          → 5
     Archetypen       ARCHETYPE_ORDER.length — es gibt genau so viele → 4
     Was am besten    je der ERSTE Eintrag dreier Auswertungen     → 3

   Der Archetyp-Wert wird aus dem Register gerechnet statt getippt: kommt eine fünfte Fraktion dazu,
   wächst der Block mit, statt still eine Zeile zu verlieren. */
const TOP_N = 5;
const ARCH_N = ARCHETYPE_ORDER.length;
const WIN_N = 3;

// #253/Stats-Redesign: nowrap+truncate + optionaler Tooltip → große Score-Werte (fmtScoreShort am Aufrufer) sprengen die Kachel nicht.
// `className` erlaubt Spalten-Spans (mobil bekommen die Score-Kacheln eine ganze halbe Reihe, damit „Mio." nicht abgeschnitten wird).
function Kpi({ label, value, color, title, className = "" }) {
  return (
    <div title={title} className={`st-box rounded-lg px-3 py-2 text-center min-w-0 ${className}`} style={MENU_PANEL}>
      <div className="opacity-50 text-meta-3 truncate">{label}</div>
      <div className="ty-num text-title-5 whitespace-nowrap overflow-hidden text-ellipsis" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

// Gesamt-Spielzeit in Stunden+Minuten (z. B. „6h 57m") — lesbarer als die Roh-MM:SS-Ausgabe von fmtDuration bei langen Spielzeiten.
const fmtHours = (ms) => {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* #desktop: `id` ist der Platzhalter im Spaltenraster (data-sec), `st-sec` die Panel-Klammer und
   `as-ring` + `<i>` der Deckfarben-Rahmen (#perf-ring: Klasse und Band sind ein Paar).
   Unter 1280 px ist beides inert — `.as-ring-run` ist dort `display: none`, `.st-sec` hat keine Regel.
   #st-ruhe: `as-ring-quiet` stellt das wandernde Band still — derselbe Modifikator wie in Werkstatt,
   Baum, Leitfaden und Glossar. Fünf laufende Rahmen um Zahlenblöcke sind Bewegung ohne Aussage. */
function Section({ id, title, hint, children }) {
  return (
    <div className="st-sec as-ring as-ring-quiet mt-5" data-sec={id}>
      <i className="as-ring-run" aria-hidden="true" />
      <div className="st-sech flex items-baseline justify-between mb-2">
        {/* #deckui: generische Sektions-Überschrift zieht die Deckfarbe (Fallback = bisheriges Violett) */}
        <h3 className="text-body-5 uppercase tracking-widest" style={{ color: "var(--deck-a1, #8a7de0)" }}>{title}</h3>
        {hint && <span className="text-meta-3 opacity-40">{hint}</span>}
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
  return (
    <>
      <div className="st-hbar flex h-3 w-full rounded overflow-hidden mt-3">
        {rows.map((r) => (
          <div key={r.key} style={{ width: `${(r.value / score) * 100}%`, background: r.color }} title={`${r.label}: ${fmtScore(r.value)} (${fmtPct(r.value / score)})`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2.5 text-meta-3">
        {rows.map((r) => (
          <span key={r.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
            <span className="opacity-70">{r.label}</span>
            <b className="tabular-nums" style={{ color: r.color }}>{fmtPct(r.value / score)}</b>
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
    <div className="st-bar grid items-center gap-x-2.5" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
      <span className="text-body-5 truncate" style={{ color }} title={label}>{label}</span>
      <span className="text-meta-3 ty-num-sm opacity-60 text-right whitespace-nowrap">{right}</span>
      <div className="st-track col-span-2 h-1.5 rounded overflow-hidden mt-1">
        <div className="h-full rounded" style={{ width: `${Math.max(3, (frac || 0) * 100)}%`, background: color, opacity: 0.85 }} />
      </div>
    </div>
  );
}

/* #st-plaetze — ein RESERVIERTER, noch nicht belegter Platz. Er ist nicht bei null, er ist leer, und
   das ist eine andere Aussage (design-sprache.md §5, „Leere Werte"). Er trägt dieselbe Bauform wie
   eine belegte Zeile, damit der Block über jeden Spielstand hinweg gleich hoch bleibt — genau das,
   wofür der Platz reserviert wird; ein gedämpfter Platzhalter, der ANDERS gebaut ist als die Zeile,
   die er vertritt, hält die Höhe nur zufällig. */
function BarSlot() {
  return (
    <div className="st-bar st-slot grid items-center gap-x-2.5" aria-hidden="true"
      style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
      <span className="text-body-5 truncate">{t("stats.slot.empty")}</span>
      <span className="text-meta-3 ty-num-sm text-right whitespace-nowrap">–</span>
      <div className="st-track col-span-2 h-1.5 rounded overflow-hidden mt-1" />
    </div>
  );
}

/* Die Liste eines ZIEL-Blocks: die vorhandenen Zeilen, dann so viele reservierte Plätze, dass der
   Höchstfall immer ausgefüllt ist. `rows` sind fertige Elemente — welcher Balken darin steht,
   entscheidet der Aufrufer, die Höhe entscheidet diese Funktion. */
function Slots({ rows, max }) {
  const free = Math.max(0, max - rows.length);
  return (
    <div className="st-slots grid gap-2.5">
      {rows}
      {Array.from({ length: free }, (_, i) => <BarSlot key={`slot${i}`} />)}
    </div>
  );
}

// Stats-Redesign: „Was am besten läuft"-Zeile — zweizeilig: Tag oben als Label, darunter Aussage + optionaler Zahlenwert
// rechts. So bleibt es auch auf schmalen Screens sauber lesbar (statt Tag/Text/Wert in einer engen Zeile zu quetschen).
function WinRow({ tag, children, val }) {
  return (
    <div className="st-box rounded-lg px-3 py-2 text-body-5" style={MENU_PANEL}>
      <div className="text-meta-1 font-bold uppercase tracking-wide opacity-45 mb-1">{tag}</div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0">{children}</span>
        {val && <span className="ty-num whitespace-nowrap shrink-0" style={{ color: "#5ab87a" }}>{val}</span>}
      </div>
    </div>
  );
}

/* #st-plaetze: der reservierte Platz der Auswertungs-Sektion — dieselbe Kachel, ohne Aussage. */
function WinSlot() {
  return (
    <div className="st-box st-slot rounded-lg px-3 py-2 text-body-5" style={MENU_PANEL} aria-hidden="true">
      <div className="text-meta-1 font-bold uppercase tracking-wide opacity-45 mb-1">–</div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0">{t("stats.slot.empty")}</span>
      </div>
    </div>
  );
}

/* #st-fenster — WIE VIELE LAUF-ZEILEN PASSEN IN DIE SPALTE.

   Der Entwurf sagt „so viele, wie die Spalte trägt", gedeckelt auf die gespeicherten
   `RUN_HISTORY_CAP` = 30. Die Zahl wird deshalb GEMESSEN und nicht getippt — und zwar an der
   gerenderten Zeile, nicht an einer zweiten Kopie ihrer Maße in JavaScript: die Zeilenhöhe steht im
   Stylesheet (44 px Klickziel, §4), und eine Konstante hier wäre dieselbe Zahl ein zweites Mal.

   KEINE RÜCKKOPPLUNG, und das ist der Grund, warum das überhaupt geht: die Höhe der Spalte hängt am
   RASTER (die Zeile ist `minmax(0, 1fr)`, die Nachbarspalte gibt die Höhe vor), nicht am Inhalt
   dieser Liste. Mehr Zeilen machen den Kasten also nicht höher; sie füllen ihn. Ohne diese
   Bedingung wäre „so viele, wie passen" eine Schleife.

   Unter 1280 px bleibt es bei den zehn von vorher: dort gibt es kein Raster mit fester Zeilenhöhe,
   die Karte scrollt als Ganzes, und dieser Auftrag fasst die schmale Fassung nicht an. */
const RUNS_PHONE = 10;

function useRunCap(wide, total) {
  const boxRef = useRef(null);
  const [cap, setCap] = useState(RUNS_PHONE);
  useLayoutEffect(() => {
    if (!wide) { setCap(RUNS_PHONE); return undefined; }
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => {
      const row = box.firstElementChild;
      if (!row) return;
      const gap = parseFloat(getComputedStyle(box).rowGap) || 0;
      const stride = row.getBoundingClientRect().height + gap;
      if (!(stride > 0)) return;
      const fits = Math.floor((box.clientHeight + gap) / stride);
      setCap((prev) => {
        /* Nach OBEN auf die gespeicherten Läufe gedeckelt — gefüllt wird mit vorhandenem Inhalt, nie
           mit erfundenem. Nach UNTEN auf die zehn von vorher: bei 1280 × 720 trägt die Spalte
           gemessen nur sieben Zeilen, und ein Umbau, der die sichtbare Historie verkürzt, hat den
           Screen schlechter gemacht, egal wie sauber sein Raster ist. Die zehnte Zeile ist dann eine,
           die im Kasten scrollt — und ein Block, der doch länger wird, scrollt in sich
           (design-sprache.md §1). */
        const next = Math.max(RUNS_PHONE, Math.min(RUN_HISTORY_CAP, fits));
        return next === prev ? prev : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [wide, total]);
  return [boxRef, cap];
}

export function StatsScreen({ onClose, onPlaySeed = null }) {
  const wide = useIsWide();
  const [detail, setDetail] = useState(null); // { entry, rank } | null
  /* Escape bei offener Detailansicht: NUR die Detailansicht schliessen. RunDetail hat seinen eigenen
     useEscape am selben window-Listener (Falle wie in UpgradeScreen dokumentiert) — beide Handler
     feuern, beide setzen dann idempotent detail=null, der Screen bleibt stehen. */
  useEscape(detail ? () => setDetail(null) : onClose);

  // Beim Öffnen einmal frisch laden (nach jedem Lauf aktuell).
  const history = useMemo(() => loadRunHistory(), []);
  const profile = useMemo(() => loadProfile(), []);

  const empty = history.length === 0;
  const games = profile.games || 0;
  const avgScore = games > 0 ? profile.totalScore / games : 0;
  const best = bestRun(history);
  const perkRates = useMemo(() => pickRates(history, "perks").slice(0, TOP_N), [history]);
  const skillRates = useMemo(() => pickRates(history, "skills").slice(0, TOP_N), [history]);
  const archUse = useMemo(() => archetypeUsage(history), [history]);
  const enough = hasEnoughData(history);
  const bestArch = useMemo(() => (enough ? bestArchetype(history) : []), [history, enough]);
  const perkLift = useMemo(() => (enough ? scoreLift(history, "perks").filter((x) => x.lift > 0) : []), [history, enough]);
  const skillLift = useMemo(() => (enough ? scoreLift(history, "skills").filter((x) => x.lift > 0) : []), [history, enough]);
  const [runsRef, runCap] = useRunCap(wide, history.length);
  const runs = history.slice(0, runCap);

  const trend = history.slice(0, 10).map((r) => Math.floor(r.score || 0)).reverse(); // ältester → neuester
  // Untertitel der „Bestes Build"-Karte: genutzte Archetypen + (falls vorhanden) der Seed.
  const buildSubtitle = (r) => [
    (r.archetypes || []).map(archLabel).join(" · ") || null,
    r.seedCode ? t("stats.seed", { code: r.seedCode }) : null,
  ].filter(Boolean).join(" · ");
  // Grobes Herkunft-Modell? (Alt-Lauf ohne die neuen Fraktions-Kanäle → factionShares zeigt nur Formation/Crit/Gebäude/Sonstige.)
  const hasFineOrigin = (r) => !!r && (["glacierYield", "lightYield", "plantRoot", "plantBloom", "plantHarvest", "fireBase", "fireHeat", "streakScore"]
    .reduce((a, k) => a + (Number(r[k]) || 0), 0) > 0);

  /* #st-plaetze: die drei Auswertungszeilen sind ein ZIEL mit Höchstfall 3 — je der erste Eintrag
     der drei Auswertungen. Erst sammeln, dann auffüllen: so entscheidet EINE Stelle, wie hoch der
     Block ist, statt drei bedingter Zweige, die sich gegenseitig verschieben. */
  const winRows = [
    bestArch[0] && (
      <WinRow key="arch" tag={t("stats.bestArch")}>
        <b style={{ color: archColor(bestArch[0].arch) }}><FactionIcon type={bestArch[0].arch} size={13} /> {archLabel(bestArch[0].arch)}</b>
        <span className="opacity-70">{t("stats.bestArch.detail", { avg: fmtScoreShort(bestArch[0].avgScore), n: bestArch[0].count })}</span>
      </WinRow>
    ),
    skillLift[0] && (
      <WinRow key="skill" tag={t("stats.skillLift")} val={t("stats.lift.value", { v: fmtScoreShort(skillLift[0].lift) })}>
        <b style={{ color: skillColor(skillLift[0].id) }}>{skillLabel(skillLift[0].id)}</b>
        <span className="opacity-55">{t("stats.played", { n: skillLift[0].count })}</span>
      </WinRow>
    ),
    perkLift[0] && (
      <WinRow key="perk" tag={t("stats.perkLift")} val={t("stats.lift.value", { v: fmtScoreShort(perkLift[0].lift) })}>
        <b style={{ color: perkColor(perkLift[0].id) }}>{perkLabel(perkLift[0].id)}</b>
        <span className="opacity-55">{t("stats.played", { n: perkLift[0].count })}</span>
      </WinRow>
    ),
  ].filter(Boolean);

  return overlayPortal((
    <div className={`st-root fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 ${detail ? "overflow-hidden" : "overflow-y-auto"}`}
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      {/* #deckui: äußerer Modal-Rahmen zieht die Deckfarbe (as-panel-deck) */}
      <div className="st-card w-full max-w-2xl rounded-2xl px-5 pb-5 sm:px-6 sm:pb-6 my-auto overlay-card as-panel as-panel-deck"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* #UI: Kopf mit Schließen-Knopf STICKY → beim Scrollen oben rechts erreichbar (Abstand opak im Header, kein negativer Margin). */}
        {/* #menu-rework M7 — KOPF-KANON (design-sprache.md §2): Eyebrow, Titel, Unterzeile im
            Titelblock; die Aktionszone oben ausgerichtet, Schließen als LETZTES Element und nichts
            rechts davon. Eyebrow und Unterzeile sind AB 1280 px sichtbar (`display: none` in der
            Basis, s. index.css) — die Handy-Fassung bewegt sich dadurch nicht.
            Der Auskunftssatz ist WEG: er stand in der Aktionszone, wo §2 nur Aktionen zulässt, und
            sein Inhalt ist die Unterzeile geworden. `sticky` bleibt für die Handy-Fassung stehen; ab
            1280 px scrollt nichts mehr an diesem Kopf vorbei (s. `.st-body`). */}
        <div className="st-head sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-center justify-between gap-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <span className="st-eyebrow">{t("stats.eyebrow")}</span>
          <h2 className="text-title-5 font-bold flex items-center gap-2">{t("stats.title")}</h2>
          <span className="st-sub">{t("stats.sub")}</span>
          <ActionButton kind="secondary" className="st-close shrink-0" onClick={onClose}>{t("common.close")}</ActionButton>
        </div>

        {empty ? (
          <div className="text-center opacity-50 py-12">{t("stats.empty")}</div>
        ) : (
          /* #st-fenster: der EINE Scroller des Screens. Unter 1280 px ist die Klammer
             `display: contents` — dort scrollt weiter die Karte, und die Handy-Fassung sieht diese
             Ebene gar nicht. */
          <div className="st-body">
            {/* KPI-Band + Score-Verlauf. Score-Kacheln kompakt abgekürzt (fmtScoreShort) + voller Wert im Tooltip → kein Overflow. */}
            {/* KPI-Band: mobil 2 breite Score-Kacheln oben (damit „Mio." reinpasst) + Zeit·Spiele·Beste Serie darunter;
                Desktop alle fünf in einer Reihe. 6-Spalten-Raster mobil (3+3 / 2+2+2), 5 Spalten ab sm. */}
            <Section id="overview" title={t("stats.overview")}>
              <div className="st-kpis grid grid-cols-6 sm:grid-cols-5 gap-2">
                <Kpi className="col-span-3 sm:col-span-1" label={t("stats.bestScore")} value={fmtScoreShort(profile.bestScore)} title={fmtScore(profile.bestScore)} color="#d4a63a" />
                <Kpi className="col-span-3 sm:col-span-1" label={t("stats.avgScore")} value={fmtScoreShort(avgScore)} title={fmtScore(avgScore)} />
                <Kpi className="col-span-2 sm:col-span-1" label={t("stats.playtime")} value={fmtHours(profile.totalDurationMs)} title={fmtDuration(profile.totalDurationMs)} />
                <Kpi className="col-span-2 sm:col-span-1" label={t("stats.games")} value={games} />
                <Kpi className="col-span-2 sm:col-span-1" label={t("stats.bestStreak")} value={`${profile.bestStreak || 0}×`} />
              </div>
              <div className="st-trend st-box mt-3 rounded-lg px-3 py-2" style={MENU_PANEL}>
                <div className="text-meta-3 opacity-50 mb-1">{t("stats.trend", { n: trend.length })}</div>
                {/* #graph-knapp: knappe Beschriftung — waagerechte Marken auf runden Score-Werten, sonst
                    nichts. KEINE x-Achse: die zaehlt hier LAEUFE, nicht Stiche; die ausfuehrliche Fassung
                    wuerde sie mit „Stiche" beschriften und damit etwas Falsches behaupten. */}
                <Sparkline current={trend} record={[]} height={70} axes="knapp" />
              </div>
            </Section>

            {/* #st-fenster: Spalte 1 ist ein STAPEL, keine Rasterzeile — Restluft sammelt sich an
                ihrem Fuß, nie zwischen den zwei Panels (design-sprache.md §1). Unter 1280 px ist die
                Klammer `display: contents` und die zwei Sektionen stehen wie bisher im Fluss. */}
            <div className="st-col1">
              {/* Bestes Build — die EINZIGE Score-Herkunft im Screen (Fraktions-Aufschlüsselung des Rekord-Laufs). */}
              {best && (
                <Section id="best" title={t("stats.bestBuild")} hint={t("stats.bestBuild.hint")}>
                  {/* #kante: Der Rekordlauf ist das einzige Gold auf diesem Schirm. Statistiken haben sonst
                      keine Farbachse — Kategorien, Seltenheit oder Zustände gibt es hier nicht —, deshalb
                      bleibt alles andere neutral und die Farbe behält eine Aussage: „das ist deine Bestmarke". */}
                  <button onClick={() => setDetail({ entry: best, rank: 1 })} title={t("stats.showDetails")}
                    className="as-edge-card w-full text-left rounded-xl px-4 py-4 transition-all hover:brightness-125"
                    style={{ "--c": "#d4a63a" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-display-1 ty-num leading-none" title={fmtScore(best.score)} style={{ color: "#d4a63a" }}>{fmtScoreShort(best.score)}</div>
                        {buildSubtitle(best) && <div className="text-meta-3 opacity-50 mt-1.5 truncate">{buildSubtitle(best)}</div>}
                      </div>
                      <div className="text-head-3 shrink-0 leading-none">{(best.archetypes || []).map((a, i) => <FactionIcon key={i} type={a} size={20} />)}</div>
                    </div>
                    <BuildHerkunft run={best} />
                    {!hasFineOrigin(best) && (
                      <div className="text-meta-1 opacity-40 mt-2.5 leading-relaxed">{t("stats.coarseOrigin")}</div>
                    )}
                  </button>
                </Section>
              )}

              {/* Was am besten läuft — die belastbaren Insights als kompakte Highlight-Zeilen (ersetzt „Optimale Analyse"). */}
              <Section id="works" title={t("stats.whatWorks")} hint={t("stats.whatWorks.hint", { n: MIN_SAMPLE })}>
                {!enough ? (
                  <div className="st-box rounded-lg px-3 py-3 text-body-5 opacity-55" style={MENU_PANEL}>
                    {t("stats.tooFew", { have: history.length, need: MIN_SAMPLE })}
                  </div>
                ) : winRows.length > 0 ? (
                  /* #st-plaetze: drei Plätze, immer. Fehlt eine der drei Auswertungen, steht ihr
                     Platz gedämpft da statt die Sektion um eine Zeile schrumpfen zu lassen. */
                  <div className="st-slots flex flex-col gap-2">
                    {winRows}
                    {Array.from({ length: Math.max(0, WIN_N - winRows.length) }, (_, i) => <WinSlot key={`w${i}`} />)}
                  </div>
                ) : (
                  /* KEINE reservierten Plätze, wenn ALLE drei fehlen — dann ist die Aussage nicht
                     „noch nicht gespielt", sondern „deine Wahl variiert zu stark". Ein Platzhalter,
                     der etwas Falsches sagt, ist schlechter als ein Satz, der das Richtige sagt. */
                  <div className="st-box rounded-lg px-3 py-3 text-body-5 opacity-55" style={MENU_PANEL}>
                    {t("stats.noPatterns")}
                  </div>
                )}
              </Section>
            </div>

            {/* Deine Läufe — overflow-fest: flexibles Grid (auto · 1fr · auto) statt fester Spaltenbreiten, Scores abgekürzt. */}
            {/* #st-fenster: `runCap` ist gemessen, nicht getippt (s. useRunCap). Der Hinweis nennt
                deshalb die WIRKLICH gezeigte Zahl — „letzte 10" über dreizehn Zeilen wäre eine
                Behauptung, die der Screen selbst widerlegt. */}
            <Section id="runs" title={t("stats.yourRuns")} hint={t("stats.yourRuns.hint", { n: runs.length })}>
              <div className="st-runs grid gap-1" ref={runsRef}>
                {runs.map((r, i) => {
                  const delta = Math.floor((r.score || 0) - (profile.bestScore || 0));
                  const critPct = r.wins > 0 ? Math.round(((r.crits || 0) / r.wins) * 100) : null;
                  return (
                    /* #kante: Lauf-Zeilen neutral — bis auf die, die den Rekord hält (delta ≥ 0). Nur dort
                       trägt die Kante Gold, sonst wäre die Farbe bloß Dekoration über einer Zahlenliste. */
                    <button key={r.ts || i} onClick={() => setDetail({ entry: r, rank: null })} title={t("stats.showDetails")}
                      className="as-edge-card as-edge-thin grid items-center gap-2.5 text-body-5 px-2.5 py-1.5 rounded text-left transition-all hover:brightness-125"
                      style={{ "--c": delta >= 0 ? "#d4a63a" : "#3a3a48", gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
                      <span className="opacity-45 ty-num-sm shrink-0">{r.ts ? fmtDayMonth(r.ts) : "—"}</span>
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="ty-num shrink-0" title={fmtScore(r.score)} style={{ color: "#d4a63a" }}>{fmtScoreShort(r.score)}</span>
                        <span className="tabular-nums shrink-0" style={{ color: delta >= 0 ? "#5ab87a" : "#8a8a95" }}>{delta >= 0 ? t("stats.record") : fmtScoreShort(delta)}</span>
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
            <Section id="picked" title={t("stats.mostPicked")} hint={t("stats.mostPicked.hint")}>
              <div className="st-picked2 grid sm:grid-cols-2 gap-3">
                <div className="st-box rounded-lg px-3 py-3" style={MENU_PANEL}>
                  <div className="text-meta-1 uppercase tracking-wide opacity-50 mb-2.5">{t("stats.topSkills")}</div>
                  <Slots max={TOP_N} rows={skillRates.map((s) => (
                    <BarRow key={s.id} label={skillLabel(s.id)} color={skillColor(s.id)} frac={s.rate} right={pct(s.rate)} />
                  ))} />
                </div>
                <div className="st-box rounded-lg px-3 py-3" style={MENU_PANEL}>
                  <div className="text-meta-1 uppercase tracking-wide opacity-50 mb-2.5">{t("stats.topPerks")}</div>
                  <Slots max={TOP_N} rows={perkRates.map((p) => (
                    <BarRow key={p.id} label={perkLabel(p.id)} color={perkColor(p.id)} frac={p.rate} right={pct(p.rate)} />
                  ))} />
                </div>
              </div>
              {/* #st-plaetze: die Archetyp-Nutzung steht IMMER — vier Fraktionen sind ihr Höchstfall,
                  und ein Block, der bei drei gespielten Archetypen ganz verschwindet, verschiebt beim
                  vierten alles darunter. */}
              <div className="st-box rounded-lg px-3 py-3 mt-3" style={MENU_PANEL}>
                <div className="text-meta-1 uppercase tracking-wide opacity-50 mb-2.5">{t("stats.archUse")}</div>
                <Slots max={ARCH_N} rows={archUse.map((a) => (
                  <BarRow key={a.arch} label={archLabel(a.arch)} color={archColor(a.arch)} frac={a.rate}
                    right={t("stats.archUse.right", { n: a.count, avg: fmtScoreShort(a.avgScore) })} />
                ))} />
              </div>
            </Section>
          </div>
        )}
      </div>

      {/* #rd-verlauf: Vergleichslinie = der beste ANDERE Lauf der Historie. Für den Rekordlauf selbst gibt es
          keine — er ist die Bestmarke; eine Kurve gegen sich selbst wäre keine Auskunft. Deckungsgleich mit dem
          Victory-Screen, der ebenfalls gegen den Rekord VOR diesem Lauf zeichnet. */}
      {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} onPlaySeed={onPlaySeed}
        recordTraj={(history.filter((r) => r !== detail.entry && Array.isArray(r.traj) && r.traj.length >= 2)
          .sort((a, b) => (b.score || 0) - (a.score || 0))[0] || {}).traj || []} />}
    </div>
  ));
}
