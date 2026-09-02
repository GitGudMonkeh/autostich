import { useState, useEffect, useRef } from "react";
import { useIsWide } from "./useIsWide.js"; // #desktop: ab 1280 px steht die finale Aufstellung offen
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { Sparkline } from "./Sparkline.jsx";
import { RunStatCells, RunBuildChips } from "./RunStats.jsx"; // Victory-Redesign: Kennzahlen (Stats-Sektion) + Build-Chips (Build-Sektion) getrennt platziert
import { RunGraphs, ScoreHerkunft } from "./RunGraphs.jsx"; // #251/Victory-Redesign: Fraktions-Herkunft + Durchlauf-Graph
import { CardGrid } from "./CardGrid.jsx";
import { MODAL_CARD, MENU_PANEL, TopHairline, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { glacierGridProps } from "./glacierBoard.js";
import { fmtScore, fmtScoreShort } from "./format.js";
import { computeFormations } from "../game/formations.js"; // #201.8: finale Aufstellung + Rahmen
import { allianceGroups } from "../game/families.js";
import { architectCoverFor } from "./architectCover.js"; // #UI: Gebäude-Rahmen auch im Victory-Screen (wie Chronik)
import FormIcon from "./FormIcon.jsx";
import { ArchToggle } from "./ArchPanels.jsx"; // #398: geteilter Gebäude-Umschalter (eine Quelle für alle vier Bildschirme)
import { archFamily, archCatDef } from "../i18n/labels.js"; // #sprache: Gebäudename zur Anzeigezeit
import { t, fmtNum } from "../i18n/index.js"; // #sprache

/* #menu-rework M4 — THREE INLINE LITERALS ON THIS SCREEN ARE STEPS OF THE VOCABULARY, and they are
   the only three. Migrating them is value-preserving by construction, so all three are provable at
   zero delta; everything else this file writes stays a counted literal, enumerated in
   `test/panel-tokens.test.js` and reasoned in measurements/M4.md.

     .go-root       `#0c0c10cc` IS `--sf-scrim` — rgba(12, 12, 16, .8), character for character. It is
                    the NARROW version's wash: above 1280 px index.css re-points the element to
                    `--sf-scrim-desk`, so the inline value still carries the phone, only no longer as a
                    literal. Same shape as .st-root and .lb-root, which M7 and M8 left as literals
                    because THEIR value (#0c0c10ee) is not a step — this one is.
     .go-blist      `#17171c` IS `--sf-base`. The blue frame beside it stays a literal: it is the
                    architect's signal (#go-ruhe, "was ausdruecklich NICHT angefasst ist"), meaning
                    rather than chrome.
     building row   the RESTING edge was `#2a2a34`, and that IS `--ed-quiet` — the same conversion M7
                    made on the same row form in RunDetail.jsx. The tapped edge (#5ec8f0) and both
                    fills stay: cyan is the architect's signal, and the ladder has no step for a state
                    pair (MENU-46/47/48). Counted, not coined.

   WHAT IS DELIBERATELY NOT TOUCHED, because it is meaning and not chrome: the gold of `as-legendary`
   and of the unlock window, the red of the DP deduction, the violet of the guide chip, the architect
   blue — and the DP price colour, which sits inside an OPEN canon question (design-sprache.md §9,
   open point 1). A worker resolving that inside a migration is the mistake the contract names. */

/* #graph-fuellt (19.08.2026) — die freie Höhe eines Kastens als viewBox-Höhe.

   Der Score-Verlauf skaliert mit `width: 100%` und festem Seitenverhältnis (620 : 250). In einem Panel,
   das höher ist als das, was die Breite hergibt, blieb darunter Luft stehen — im Spiel gemessen über
   200 px. Reine CSS-Mittel helfen dabei nicht: `preserveAspectRatio` kann den Graphen unten verankern
   oder verzerren, aber nicht wachsen lassen; wachsen kann er nur, wenn die viewBox höher wird, und die
   steht im Markup.

   Also messen. Zurück kommt die viewBox-Höhe, bei der die gerenderte Höhe genau den freien Platz füllt:
   die Breite skaliert 620 → `w`, dieselbe Skala auf `h` angewandt ergibt `620 * h / w`.

   Kein Rückkopplungs-Ringelreihen: der gemessene Kasten ist `flex: 1; min-height: 0`, seine Höhe kommt
   also vom Panel und nicht vom Inhalt — ein höherer Graph macht ihn nicht höher. Der 2-px-Filter unten
   fängt trotzdem das Zittern ab, das Sub-Pixel-Breiten sonst erzeugen. */
function useFuellHoehe(ref, aktiv) {
  const [vh, setVh] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !aktiv || typeof ResizeObserver === "undefined") { setVh(0); return undefined; }
    const messen = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w < 40 || h < 40) return;
      const next = Math.round((620 * h) / w);
      setVh((prev) => (Math.abs(prev - next) > 2 ? next : prev));
    };
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    messen();
    return () => ro.disconnect();
  }, [ref, aktiv]);
  return vh;
}

// #304 Count-up-/Rollup-Helfer (requestAnimationFrame, easeOutCubic; respektiert prefers-reduced-motion → Endwert sofort).
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const prefersReduced = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function useCountUp(target, dur = 1100, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const to = Math.max(0, Math.round(Number(target) || 0));
    if (prefersReduced() || to === 0) { setVal(to); return undefined; }
    let raf = 0, start = null;
    const step = (ts) => {
      if (start == null) start = ts;
      const el = ts - start - delay;
      if (el < 0) { raf = requestAnimationFrame(step); return; }
      const p = Math.min(1, el / dur);
      setVal(Math.round(to * easeOutCubic(p)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, delay]);
  return val;
}
// Highscore-Listen (lokal + global) bewusst NICHT hier — sie stehen auf dem Startbildschirm und
// machten dieses (nicht scrollbare) Overlay zu lang. Der GameOver-Screen zeigt nur den Lauf.
// #169 FB-8: der Statblock (Serie/Perks/Formationen/Crits + Perk-/Skill-Chips) steckt jetzt in der
// geteilten RunStats-Komponente — dieselbe Anzeige nutzt die Leaderboard-Detailansicht (RunDetail).
/* exp: the earn rollup (SP/DP, milestone bar, welcome bonus), the onboarding banner, the meta-unlock
   list and the skin-unlock window left with the meta-progression. The screen shows the run. */

export function GameOver({ state, isRecord, timeStr, onRestart, onMenu, currentTraj = [], recordTraj = [], prevBests = null }) {
  const score = Math.floor(state.score); // Zahlenwert für Record-Vergleich; Anzeige über fmtScore
  const scoreUp = useCountUp(score, 1100);
  // #201.8 Stufe A: finale Aufstellung aus dem Live-state; Formationen frisch berechnet (rein, matcht das Enddeck).
  const finalOrder = state.playerOrder || [];
  const finalCards = finalOrder.map((di) => state.deck[di]);
  const finalForms = finalOrder.length
    ? computeFormations(finalOrder, state.deck || [], state.roles || {}, [], state.skills || [], state.shop?.anchors || [], state.familyTiers || {})
    : [];

  // Delta zum vorherigen Rekord — recordTraj ist der Ghost VOR dem saveRun-Überschreiben (letzter Wert ≈ alter Rekord).
  const prevBest = recordTraj.length >= 2 ? Math.floor(recordTraj[recordTraj.length - 1] || 0) : 0;
  const deltaPct = prevBest > 0 ? Math.round(((score - prevBest) / prevBest) * 100) : null;
  const cyclesDone = (state.cycle || 0) + 1;
  const perTrick = state.trickNo ? Math.round(score / state.trickNo) : 0;

  // Motor-Kennzahlen je aktiver Fraktion (nur Zähler > 0 werden gezeigt) — die „Engine-Story" des Runs.
  const arch = state.activeArchetypes || [];
  const motor = [];
  const pushM = (cond, label, value, color) => { if (cond && value > 0) motor.push({ label, value, color }); };
  pushM(arch.includes("plant"), t("gameover.metric.growth"), Math.round(state.growthTotal || 0), "#69cf59");
  pushM(arch.includes("lightning"), t("gameover.metric.ionizations"), Math.round(state.ionTotal || 0), "#8a7de0");
  pushM(arch.includes("fire"), t("gameover.metric.ashBurned"), Math.round(state.ashBurned || 0), "#ff7a3c");
  pushM(arch.includes("fire"), t("gameover.metric.brands"), Math.round(state.brandTotal || 0), "#ff7a3c");

  // Architekt-Gebäude in der finalen Aufstellung — ein-/ausblendbar + Liste (Name · Form · Stufe), wie in der Chronik.
  const archBuildings = (state.architectEnabled && state.architect && state.architect.buildings) || [];
  const hasArch = archBuildings.length > 0;
  // #go-stiche: gibt es überhaupt einen Durchlauf-Graph? (RunGraphs gäbe sonst null zurück und die Klammer bliebe leer)
  const hasTicks = Array.isArray(state.trickLog) && state.trickLog.some((c) => c && c.length);
  const architectCover = hasArch ? architectCoverFor(state) : null;
  const wide = useIsWide();   // #desktop: eigene Spalte für die Aufstellung → sie startet aufgeklappt
  // #graph-fuellt: der Score-Verlauf fuellt die freie Hoehe seiner Spalte (nur ab 1280 px gemessen).
  const chartRef = useRef(null);
  const chartVh = useFuellHoehe(chartRef, wide);
  const [showArch, setShowArch] = useState(true);        // Gebäude-Overlay auf dem Brett an/aus
  const [inspectBid, setInspectBid] = useState(null);    // Liste ↔ Brett: angetipptes Gebäude glüht am Grid

  return overlayPortal((
    <div className="go-root fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "var(--sf-scrim)", backdropFilter: "blur(3px)" }}>
      {/* #deckui: äußere Karte zieht den deck-getönten Rahmen-Verlauf (as-panel-deck). */}
      <div className="go-card w-full max-w-lg rounded-2xl px-6 pb-6 max-h-[90dvh] overflow-y-auto overlay-card as-panel as-panel-deck" style={MODAL_CARD}>
        {/* #UI: Aktions-Leiste (Menü · Neuer Lauf) nach oben und STICKY → schwebt beim Scrollen mit. Abstand opak im
            Balken (pt/pb), kein negativer Margin/keine transparente Lücke → kein Durchscheinen der Kopfzeile. */}
        <div className="go-actions sticky top-0 z-20 -mx-6 px-6 pt-6 pb-6 flex gap-2 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          {/* #kante: „Menü" ist der Ausweg (neutral), „Neuer Lauf" das Ziel — starker Kanten-Knopf in Gold
              statt gefüllter Goldtaste. Er bleibt der lauteste Knopf des Screens, weil er als einziger
              Glow trägt. */}
          {/* #deckui: Aktions-Buttons ziehen die Deckfarbe (hier = Mainscreen-Deck, s. GameOver-Kontext). */}
          {onMenu && (
            <button onClick={onMenu} className="as-actbtn as-edge as-edge-thin py-2.5 px-4 rounded-lg font-bold transition-all"
              style={{ "--c": "var(--deck-a1, #8a7de0)" }}>
              {t("gameover.menu")}
            </button>
          )}
          <button onClick={onRestart} className="as-actbtn as-edge-strong flex-1 py-2.5 rounded-lg font-bold transition-all hover:brightness-110"
            style={{ "--c": "var(--deck-a1, #d4a63a)" }}>
            {t("gameover.newRun")}
          </button>
        </div>
        {/* #go-kopf (19.08.2026) — der Kopf trägt nur noch Augenbraue, Kennzahlen und Aktionen.
            Die SCORE-ZAHL steht ab 1280 px UNTER der Haarlinie, als Kopf der linken Spalte über dem
            Verdienst (s. `.go-heroblock` weiter unten). Oben stand sie in einer Zeile mit vier
            Kennzahlen und zwei Knöpfen und ging darin unter — sie ist aber die Aussage des Screens.
            Unter der Linie beginnt der INHALT mit ihr, und das ist ihr Platz.

            Am HANDY ändert sich nichts: `go-hero` bleibt der zentrierte Block, `go-col1` ist dort
            `display: contents`, und die Reihenfolge im DOM ist unverändert Augenbraue → Zahl →
            Rekord-Chip → Kleinschrift-Zeile. */}
        {/* Onboarding-E8 (T-O2): einmaliger Abschluss-Hinweis — als Banner IM Endscreen, nicht als
            blockierende Karte davor (der Victory-Schirm ist selbst der Payoff, den nichts verdecken
            soll; Abweichung vom Papier §5.3 „pause card", im Task-Contract festgehalten). */}
        <div className="go-hero text-center mt-4">
          <div className="go-eyebrow text-body-5 uppercase tracking-widest" style={{ color: "#e0605a" }}>{t("gameover.eyebrow")}</div>
          {/* #go-ruhe: Auf dem DESKTOP wird aus der Kleinschrift-Zeile unter dem Score die Kennzahlenreihe
              im Kopf (Bauform `.rd-kpi` aus den Lauf-Details): die Zahl sagt das Ergebnis, die Reihe den
              Rahmen — wie lange, wie viele Stiche, wie viele Durchläufe. Am HANDY bleibt die kompakte
              Zeile, dort steht sie unter dem Score (s. `go-heroblock`): neben einer 40-px-Zahl ist für
              vier beschriftete Werte kein Platz. Zwei Fassungen, dieselben Inhalte, verschiedene FORM —
              deshalb stehen sie auch an verschiedenen Stellen im DOM. */}
          {wide && (
            <div className="go-kpi">
              {timeStr && <div><span>{t("gameover.kpi.duration")}</span><b className="ty-num">{timeStr}</b></div>}
              <div><span>{t("gameover.kpi.tricks")}</span><b className="ty-num">{state.trickNo}</b></div>
              <div><span>{t("gameover.kpi.cycles")}</span><b className="ty-num">{cyclesDone}</b></div>
              {perTrick > 0 && (
                <div title={t("gameover.perTrick.title")}>
                  <span>{t("gameover.kpi.perTrick")}</span><b className="ty-num">{fmtScoreShort(perTrick)}</b>
                </div>
              )}
            </div>
          )}
        </div>

        {/* #desktop — Klammer um die LINKE Spalte (Verdienst · Score-Herkunft). Sie ist der Grund, warum beim
            Aufklappen einer Perk-/Skill-Beschreibung im Build nichts mehr springt: Ohne die Klammer liegen
            Verdienst und Herkunft in ZWEI Rasterzeilen, und die zweite teilt sich ihre Höhe mit dem Build der
            dritten Spalte — wächst dort die Beschreibung, rutscht hier die Herkunft mit nach unten. Als EINE
            Zelle ist die Spalte von der Nachbarspalte entkoppelt; wachsen darf dann nur, was UNTER dem Build
            steht (die finale Aufstellung). Unter 1280 px ist die Klammer `display: contents`. */}
        <div className="go-col1">
        {/* #go-kopf: Score-Zahl, Rekord-Chip und (am Handy) die Kleinschrift-Zeile. Sie liegen in der
            linken KLAMMER, nicht als eigene Rasterzeile — Rasterzeilen gelten über alle drei Spalten,
            eine Zeile für den Score allein hätte in Spalte 2 und 3 dieselbe Höhe leer gelassen und die
            Panels dort um die Höhe der Zahl nach unten geschoben. In der Klammer gehört sie zur Spalte
            und schiebt nur, was darunter in DIESER Spalte steht.
            `text-center` ist die Handy-Fassung (der Block sass bis hierher im zentrierten `go-hero`);
            ab 1280 px stellt `.go-heroblock` auf linksbündig. */}
        {/* #go-score-panel: Ab 1280 px ist der Score ein Panel wie die daneben — mit denselben Ring-Klassen
            und derselben Maske wie die übrigen Panels dieses Bildschirms. Unter 1280 px tragen sie keine
            Darstellung, die schmale Fassung bleibt unberührt. `is-record` schaltet den Rahmen auf Gold und
            lässt ihn pulsen (Legendär-Geste), sonst steht dort die Deckfarbe der Nachbarn. */}
        <div className={`go-heroblock as-ring as-ring-quiet text-center${isRecord ? " is-record" : ""}`}>
          <i className="as-ring-run" aria-hidden="true" />
          {/* #253/Victory-Redesign: kompakt abgekürzt (Mio./Mrd.) gegen Overflow bei großen Scores; voller Wert im Tooltip. */}
          <div className="go-score text-display-2 sm:text-display-3 ty-num mt-2 leading-tight" title={fmtScore(score)} style={{ color: "#d4a63a" }}>{fmtScoreShort(scoreUp)}</div>
          {/* Rekord-Zeile: neuer Rekord → Stern + Zuwachs; sonst Abstand zum Rekord. */}
          <div className="go-rec mt-2 flex items-center justify-center gap-2 flex-wrap">
            {isRecord ? (
              /* #deckui: „neuer Rekord"-Chip zieht die Deckfarbe (generischer Violett-Akzent, kein Gold-Rekordwert). */
              <span className="inline-flex items-center gap-1.5 text-body-lg-5 font-bold px-2.5 py-0.5 rounded-full" style={{ color: "var(--deck-a1, #8a7de0)", background: "color-mix(in srgb, var(--deck-a1, #8a7de0) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--deck-a1, #8a7de0) 33%, transparent)" }}>
                ★ {t("gameover.record.new")}{deltaPct != null && deltaPct > 0 ? ` · +${deltaPct} %` : ""}
              </span>
            ) : deltaPct != null ? (
              <span className="text-body-lg-5 px-2.5 py-0.5 rounded-full" style={{ color: "#9a9aa6", background: "#ffffff0d", border: "1px solid #33333e" }}>
                {deltaPct >= 0 ? "+" : ""}{deltaPct} % {t("gameover.record.from")}
              </span>
            ) : null}
          </div>
          {/* #202: Münzen-Zeile entfernt — der Shop ist seit dem Architekt-Umbau dormant, Münzen sind obsolet. */}
          {!wide && (
            <div className="text-body-5 opacity-55 mt-2 flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap">
              {timeStr && <span>{timeStr}</span>}
              {perTrick > 0 && <><span className="opacity-30">·</span><span title={t("gameover.perTrick.title")}>{t("gameover.perTrick", { score: fmtScoreShort(perTrick) })}</span></>}
              <span className="opacity-30">·</span><span>{t("gameover.cycles", { count: cyclesDone })}</span>
            </div>
          )}
        </div>
        {/* #go-ruhe: BESTLEISTUNGEN — welche persönlichen Bestmarken sind in DIESEM Lauf gefallen.
            Der Rekord-Chip im Kopf sagt bisher nur „neuer Rekord, +55 %" und meint dabei allein den Score;
            dass nebenbei die längste Serie oder der beste Einzelstich gefallen ist, stand nirgends — obwohl
            das Profil es weiß. Verglichen wird gegen `prevBests` (Schnappschuss aus App.jsx, VOR recordRun);
            ohne den Schnappschuss ist das Profil beim Rendern längst überschrieben und jede Zeile hieße „neu".

            NUR ab 1280 px (`wide`): am Handy ist der Screen ohnehin eine lange Kolonne, und ein viertes Panel
            zwischen Verdienst und Herkunft macht sie länger, ohne etwas zu lösen. Der Platz, den das Panel hier
            füllt, ist ein DESKTOP-Platz. Es steht in Spalte 1 unter dem Verdienst — beide beantworten dieselbe
            Frage („was hat der Lauf gebracht"), und die Klammer `go-col1` hält die Spalte von der Nachbarspalte
            entkoppelt (s. oben). Im Entwurf stand es in Spalte 2; das hätte die drei gewachsenen Spalten neu
            aufgeteilt und damit genau die Sprung-Entkopplung aufgelöst, für die `go-col1` gebaut wurde. */}
        {wide && prevBests && (() => {
          const rows = [
            { key: "streak", label: t("gameover.best.streak"), now: state.bestStreak || 0, was: prevBests.streak || 0, fmt: (v) => v },
            { key: "trick",  label: t("gameover.best.trick"),  now: state.bestTrickScore || 0, was: prevBests.trick || 0, fmt: fmtScoreShort },
            { key: "crits",  label: t("gameover.best.crits"),  now: state.crits || 0, was: prevBests.crits || 0, fmt: (v) => v },
          ].filter((r) => r.now > 0 || r.was > 0);
          // Ohne jede Bestmarke (allererster Lauf, alles 0) hat das Panel nichts zu sagen → es kommt gar nicht.
          if (!rows.length && !(prevBests.score > 0)) return null;
          return (
            <div className="go-best as-ring as-ring-quiet mt-5">
              <i className="as-ring-run" aria-hidden="true" />
              <div className="text-meta-3 uppercase tracking-wide opacity-50 mb-2">{t("gameover.best")}</div>
              {rows.map((r) => {
                const isNew = r.now > r.was;
                return (
                  <div key={r.key} className="go-bestrow">
                    <b>{r.label}</b>
                    <span className="go-bestval ty-num">{r.fmt(Math.max(r.now, r.was))}</span>
                    {isNew && <span className="go-bestnew">{t("gameover.best.new")}</span>}
                  </div>
                );
              })}
              {/* Der bisherige Höchstwert ist der VERGLEICHSWERT, nicht das Ergebnis — deshalb leiser und
                  ohne Marker. Bei einem neuen Rekord steht die neue Zahl schon groß im Kopf. */}
              {prevBests.score > 0 && (
                <div className="go-bestrow is-prev">
                  <b>{t("gameover.best.score")}</b>
                  <span className="go-bestval ty-num">{fmtScoreShort(prevBests.score)}</span>
                </div>
              )}
            </div>
          );
        })()}

        </div>

        {/* Victory-Redesign: Fraktions-Score-Herkunft — die für Spieler wichtigste Frage „welche Fraktion
            trägt den Score?".

            #go-spalten (19.08.2026): Sie steht ab 1280 px in Spalte 3 UNTER dem Build, nicht mehr in der
            linken Klammer. Zwei Gründe, ein Effekt:
            · Inhaltlich sind Build und Herkunft zwei Hälften derselben Frage — der Build sagt, was gewählt
              wurde (Feuer ×3, drei Feuer-Skills), die Herkunft, was dabei herauskam (Feuer 27 %). Sie standen
              auf gegenüberliegenden Spalten, also 1 100 px auseinander.
            · Höhenmäßig ist der Build das EINZIGE Panel des Screens, das mit der Lauflänge wirklich wächst
              (Perks, Skills, Fraktionsstufen, Motor). Die Herkunft hat feste vier bis fünf Zeilen. Ein
              wachsendes Panel mit einem festen zu paaren hält die Spalte berechenbar; die linke Klammer trug
              nach dem Bestleistungs-Panel drei Panels und bestimmte damit die Zeilenhöhe für alle — gemessen
              740 px, wovon in Spalte 3 rund 555 leer blieben.

            Sie liegt DESHALB hier im DOM und nicht unten beim Build: die Platzierung macht allein das Raster
            (`grid-column: 3`), die Reihenfolge bleibt die der Handy-Fassung. Ein Umhängen im JSX hätte am
            Handy die Lesereihenfolge geändert — und das Handy ist in diesem Durchgang unangetastet. Aus der
            Klammer `go-col1` MUSS sie raus, weil ein Rasterkind ein direktes Kind des Rasters sein muss. */}
        <div className="go-origin as-ring as-ring-quiet mt-5">
            <i className="as-ring-run" aria-hidden="true" />
          <ScoreHerkunft state={state} />
        </div>

        {/* Victory-Redesign · BUILD-Sektion: Archetyp-Zusammenfassung + Perk-/Skill-Chips, darunter die Motor-Kennzahlen
            je aktiver Fraktion (die „Engine-Story" des Runs, nur Zähler > 0). */}
        {((state.skills && state.skills.length) || (state.perks && state.perks.length)
          || Object.values(state.familyTiers || {}).some((tier) => tier > 0) || motor.length > 0) && (
          <div className="go-build as-ring as-ring-quiet mt-5">
              <i className="as-ring-run" aria-hidden="true" />
            <div className="text-meta-3 uppercase tracking-wide opacity-50 mb-2">{t("gameover.build")}</div>
            {/* `families` = die Familien-Stufen des Laufs (#167). Ohne sie zeigte der Endscreen nur die flachen
                Perks und die Legendären — also einen Bruchteil dessen, was im Lauf gewählt wurde. Der Endscreen
                hat den vollen State und kann sie liefern; die Bestenlisten-Detailansicht kann es nicht (die
                Datenbank speichert `perks`/`skills`, keine Familien) und bleibt deshalb unverändert. */}
            <RunBuildChips entry={{ perks: state.perks, skills: state.skills || [], families: state.familyTiers || {} }} />
            {motor.length > 0 && (
              <>
                <div className="text-meta-1 uppercase tracking-wide opacity-40 mt-4 mb-2">{t("gameover.engine")}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {motor.map((m) => (
                    /* #go-ruhe: `--gob` trägt den Kantenton für die Desktop-Kachelform; die INLINE gesetzte
                       borderLeft bleibt stehen und ist weiter die Handy-Fassung. */
                    <div key={m.label} className="go-box go-box-c rounded-lg px-3 py-2 min-w-0" style={{ ...MENU_PANEL, borderLeft: `3px solid ${m.color}`, "--gob": m.color }}>
                      <div className="opacity-50 text-meta-1 uppercase tracking-wide truncate" title={m.label}>{m.label}</div>
                      <div className="ty-num leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-body-lg-3 mt-0.5" title={fmtNum(m.value)} style={{ color: m.color }}>{fmtScoreShort(m.value)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Victory-Redesign · STATS & VERLAUF-Sektion: schlanke Kern-Kennzahlen (Score-Anteile stehen bereits in der
            Score-Herkunft → sourceCells={false}) + Score-Verlauf + Durchlauf-Graph. */}
        <div className="go-stats as-ring as-ring-quiet mt-5">
            <i className="as-ring-run" aria-hidden="true" />
          <div className="text-meta-3 uppercase tracking-wide opacity-50 mb-2">{t("gameover.stats")}</div>
          <RunStatCells entry={{
            bestStreak: state.bestStreak, crits: state.crits, wins: state.wins,
            bestTrickScore: state.bestTrickScore, bestGlacierTrickScore: state.bestGlacierTrickScore,
            tricks: state.trickNo,
          }} sourceCells={false} />

          {/* Punkteverlauf: aktueller Lauf vs. (vorheriger) Rekord (#35). recordTraj ist der Snapshot
              VOR dem saveRun-Überschreiben → bei neuem Rekord liegt die Lauf-Linie sichtbar darüber. */}
          {currentTraj.length >= 2 && (
            <div className="go-chart mt-4">
              <div className="flex items-center justify-between text-meta-3 uppercase tracking-wide opacity-50 mb-2">
                <span>{t("gameover.chart.title")}</span>
                <span className="flex gap-2 normal-case tracking-normal">
                  <span style={{ color: "#d4a63a" }}>{t("gameover.chart.run")}</span>
                  {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>{t("gameover.chart.record")}</span> : <span className="opacity-40">{t("gameover.chart.first")}</span>}
                </span>
              </div>
              {/* #graph-achsen: Auf dem Desktop ist Platz für die ausführliche Fassung — beschriftete Achsen
                  (Score links, Stiche unten) statt einer nackten Linie. Am Handy bleibt die kompakte Linie:
                  dort wäre die Beschriftung breiter als der Graph.
                  #graph-fuellt: `vh` ist die gemessene freie Höhe dieser Spalte, umgerechnet in die
                  viewBox (s. `useFuellHoehe`). Ohne Messung (Handy, erster Frame) bleibt es bei 250. */}
              <div ref={chartRef} className="go-chartbox">
                <Sparkline current={currentTraj} record={recordTraj} height={110} axes={wide} vh={chartVh} />
              </div>
            </div>
          )}

          {/* #251/Victory-Redesign: der generische Score-Quellen-Balken ist durch den Fraktions-Breakdown (ScoreHerkunft, oben)
              ersetzt → sourceBar={false}; hier bleibt nur der Durchlauf-Graph (Score je Stich, Sieg/Niederlage). */}
          {/* #go-stiche: auf dem Desktop steht der Durchlauf-Graph unten neben den Gebäuden (s. dort) — die
              Aufstellung hat dort Platz frei, und als zugeklappter Balken über die halbe Screenbreite sagte er
              hier nichts. Gerendert wird IMMER nur einer der beiden Orte. */}
          {!wide && <RunGraphs state={state} sourceBar={false} />}
        </div>

        {/* #201.8 Stufe A: finale Deck-Aufstellung schreibgeschützt — bestehendes CardGrid (rendert Formationsrahmen). Aufklappbar, um den Screen kurz zu halten. */}
        {finalOrder.length > 0 && (
          <details className="go-layout as-ring as-ring-quiet mt-5 rounded-xl overflow-hidden" open={wide} style={MENU_PANEL}>
            {/* `summary` MUSS das erste Kind bleiben (sonst ist es nicht der Aufklapp-Griff); das Ringband
                kommt deshalb danach. */}
            <summary className="cursor-pointer select-none px-3 py-2 text-meta-3 uppercase tracking-wide opacity-70">{t("gameover.layout.open")}</summary>
            <i className="as-ring-run" aria-hidden="true" />
            <div className="p-3 pt-0">
              {/* #go-breit: Brett und Gebäudeliste stehen ab 1280 px NEBENEINANDER (das Panel läuft dort über
                  alle drei Spalten). Die zwei Klammern sind dafür da; unterhalb 1280 px sind sie schlichte
                  Blöcke im Fluss und ändern nichts. */}
              <div className="go-board">
                {/* Architekt-Gebäude auf dem Brett ein-/ausblenden (Toggle + Kategorie-Legende) — wie in der Chronik/Aufstellung. */}
                {hasArch && <ArchToggle on={showArch} onToggle={() => setShowArch((v) => !v)} />}
                <CardGrid cards={finalCards} formations={finalForms} roles={state.roles} {...glacierGridProps(state)} anchors={state.shop?.anchors || []}
                  pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
                  architectCover={hasArch && showArch ? architectCover : null}
                  glowBid={hasArch && showArch ? inspectBid : null} quietTiles />
              </div>

              {/* #go-stiche: Gebäudeliste und Durchlauf-Graph sind EIN Rasterfeld neben dem Brett. Als zwei
                  getrennte Felder müsste das Brett zwei Zeilen überspannen — und ein überspannendes Element
                  verteilt seine Mehrhöhe auf beide, was zwischen Liste und Graph eine Lücke von 119 px riss
                  (gemessen). Unterhalb 1280 px ist die Klammer ein schlichter Block im Fluss. */}
              <div className="go-side">
              {/* Gebäude-Liste: welche Gebäude auf welcher Stufe. Antippen lässt den Rahmen am Brett cyan leuchten. */}
              {hasArch && (
                /* #rahmen-huelle: Die Spaltenzahl kommt aus der ANZAHL (max 3), nicht aus der verfügbaren
                   Breite — sonst legt `auto-fill` leere Spuren an und der Rahmen steht 1220 px breit um EIN
                   Gebäude. `auto-fit` allein reicht nicht: zusammen mit `width: fit-content` klappt es auch
                   bei sieben Gebäuden auf eine Spalte zusammen (gemessen). */
                <div className="go-blist mt-3 rounded-lg p-2.5"
                  style={{ background: "var(--sf-base)", border: "1px solid #5a8ade", "--gob-cols": Math.min(3, archBuildings.length) }}>
                  <div className="text-meta-3 uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 {t("arch.yourBuildings", { n: archBuildings.length })}</div>
                  <div className="text-meta-1 opacity-45 mb-1.5">{t("gameover.layout.hint")}</div>
                  <div className="grid gap-1">
                    {archBuildings.map((b) => {
                      const fam = archFamily(b.familyId); if (!fam) return null;
                      const anchor = Math.min(...b.footprint);
                      const eff = architectCover?.[anchor]?.effects?.join(" · ") || "";
                      const meta = archCatDef(fam.category) || {};
                      const on = inspectBid === b.id;
                      return (
                        <button key={b.id} onClick={() => { if (!on) setShowArch(true); setInspectBid(on ? null : b.id); }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-meta-3 leading-snug flex flex-col gap-0.5 transition-all"
                          style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "var(--ed-quiet)"}` }}>
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <FormIcon form={fam.form} color={fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92")} title={`${fam.name} · ${fam.form}`} />
                            <b>{fam.name}</b>
                            <span className="opacity-55">{fam.legendary ? t("arch.legendaryCap") : t("arch.tier", { tier: ["", "I", "II", "III", "IV"][b.tier] || b.tier })}</span>
                          </span>
                          {eff && <span className="opacity-75">{eff}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* #go-stiche: Stich-Score je Durchlauf — hier unten ist der Platz. Rechts neben dem Brett stand
                  unter der Gebäudeliste eine leere Fläche (bei einem Gebäude über 400 px hoch), und der Graph
                  war oben ein zugeklappter Balken über die halbe Screenbreite.

                  #stiche-zu (19.08.2026): ZUGEKLAPPT als Voreinstellung — `open` fällt weg. Die Annahme
                  davor war, der Graph verlängere „in einer eigenen Spalte nicht mehr den Screen". Am
                  echten Lauf gemessen stimmt sie nicht: eine Zeile je Durchlauf, und ein langer Lauf hat
                  zwölf und mehr — mit 40 px Zeilenhöhe (#graph-gold) sind das über 600 px, die den ganzen
                  Screen nach unten ziehen. Wer den Verlauf sehen will, klappt ihn auf; das ist genau die
                  Rolle, für die `details` da ist, und am Handy war er ohnehin nie offen. */}
              {wide && hasTicks && (
                <div className="go-ticks">
                  <RunGraphs state={state} sourceBar={false} />
                </div>
              )}
              </div>
            </div>
          </details>
        )}

      </div>
    </div>
  ));
}
