import { useState, useEffect, useRef } from "react";
import { useIsWide } from "./useIsWide.js"; // #desktop: ab 1280 px steht die finale Aufstellung offen
import { useEscape } from "./useEscape.js";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { Sparkline } from "./Sparkline.jsx";
import { RunStatCells, RunBuildChips } from "./RunStats.jsx"; // Victory-Redesign: Kennzahlen (Stats-Sektion) + Build-Chips (Build-Sektion) getrennt platziert
import { RunGraphs, ScoreHerkunft } from "./RunGraphs.jsx"; // #251/Victory-Redesign: Fraktions-Herkunft + Durchlauf-Graph
import { CardGrid } from "./CardGrid.jsx";
import { MODAL_CARD, MENU_PANEL, TopHairline, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { glacierGridProps } from "./glacierBoard.js";
import { fmtScore, fmtScoreShort } from "./format.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js"; // #190: Freischalt-Vorschau
import { computeFormations } from "../game/formations.js"; // #201.8: finale Aufstellung + Rahmen
import { allianceGroups } from "../game/families.js";
import { architectCoverFor } from "./architectCover.js"; // #UI: Gebäude-Rahmen auch im Victory-Screen (wie Chronik)
import FormIcon from "./FormIcon.jsx";
import { ArchToggle } from "./ArchPanels.jsx"; // #398: geteilter Gebäude-Umschalter (eine Quelle für alle vier Bildschirme)
import { milestoneBarState } from "../game/progression.js"; // #304 Verdienst-Rollup: Meilensteinbalken
import { GuideOverlay } from "./GuideOverlay.jsx"; // #: Leitfaden direkt auf der Fraktions-Seite eines Archetyp-Unlocks öffnen
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
// DP-Rollup mit Challenge-Countdown: erst auf Brutto (bzw. direkt Netto, wenn kein Abzug) hoch; bei Abzug (raw<0) nach
// kurzer Pause runter auf Netto (bei 0 gedeckelt) + rotes „Minus". Rückgabe { val, minus }.
function useDpRollup({ gross = 0, net = 0, raw = 0 }) {
  const [val, setVal] = useState(0);
  const [minus, setMinus] = useState(false);
  useEffect(() => {
    const g = Math.max(0, Math.round(gross)), n = Math.max(0, Math.round(net));
    if (prefersReduced()) { setVal(n); setMinus(raw < 0); return undefined; }
    const peak = raw < 0 ? g : n;
    const UP = 1100, PAUSE = 1300, DOWN = 800;
    let raf = 0, start = null;
    const step = (ts) => {
      if (start == null) start = ts;
      const el = ts - start;
      if (el < UP) { setVal(Math.round(peak * easeOutCubic(el / UP))); raf = requestAnimationFrame(step); return; }
      setVal(peak);
      if (raw < 0) {
        if (el < UP + PAUSE) { raf = requestAnimationFrame(step); return; }
        setMinus(true);
        const dp = Math.min(1, (el - UP - PAUSE) / DOWN);
        setVal(Math.round(peak + (n - peak) * easeOutCubic(dp)));
        if (dp < 1) raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gross, net, raw]);
  return { val, minus };
}

// Highscore-Listen (lokal + global) bewusst NICHT hier — sie stehen auf dem Startbildschirm und
// machten dieses (nicht scrollbare) Overlay zu lang. Der GameOver-Screen zeigt nur den Lauf.
// #169 FB-8: der Statblock (Serie/Perks/Formationen/Crits + Perk-/Skill-Chips) steckt jetzt in der
// geteilten RunStats-Komponente — dieselbe Anzeige nutzt die Leaderboard-Detailansicht (RunDetail).
/* #unlock-fenster (18.08.2026): Frisch freigeschaltete Skins bekommen auf dem DESKTOP ein eigenes Fenster
   statt einer Bahn im Screen. Grund ist das Format: die Bahn läuft über die volle Breite (1720 px) und trägt
   darin zwei 74-px-Kacheln — am Handy ist das eine gefüllte Karte, auf dem Desktop ein leeres Band mit einem
   Fleck in der Mitte. Als Fenster ist die Freischaltung das, was sie ist: eine Nachricht, die man einmal
   ansieht und wegklickt. Der goldene Funkel-Rahmen ist derselbe wie an den Meta-Freischaltungen (as-legendary).
   Das Bild steht groß — es ist der einzige Grund, warum jemand hinsieht. */
function UnlockModal({ unlocks, onConfirm }) {
  useEscape(onConfirm);
  /* Groß steht das DECK-COVER — es ist das Bild, wegen dem man hinsieht. Ein Deck-Skin schaltet meist sein
     Spielfeld gleich mit frei; das ist dieselbe Nachricht in klein und stünde als zweite große Kachel neben
     dem Cover nur im Weg. Es wird deshalb NAMENTLICH genannt statt abgebildet — verschwiegen wird nichts.
     Gibt es ausnahmsweise gar kein Deck (nur ein Spielfeld), zeigt das Fenster eben das. */
  const covers = unlocks.filter((u) => u.type === "deck");
  const shown = covers.length ? covers : unlocks;
  const alsoNames = covers.length ? unlocks.filter((u) => u.type !== "deck").map((u) => u.name) : [];
  return overlayPortal((
    <div className="ul-root fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(8, 8, 12, .82)" }} onClick={onConfirm}>
      {/* Die Maße sind auf beiden Seiten dieselbe Idee, nur andere Zahlen: das Bild so groß, wie der Schirm
          es hergibt, drumherum nur so viel Rahmen wie nötig. Am Handy heißt das ein Cover über die halbe
          Fensterbreite und knapperes Polster; auf dem Desktop ein gedeckeltes Fenster. */}
      <div className="ul-card as-legendary rounded-2xl px-5 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6 text-center"
        style={{ background: "linear-gradient(180deg, #1c1708, #14110c)", maxWidth: "min(92vw, 760px)", maxHeight: "90dvh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="text-body-5 sm:text-body-lg-5 uppercase tracking-[.2em] sm:tracking-[.28em] font-semibold" style={{ color: "#f2c14a" }}>
          {t("gameover.skins.title")}
        </div>
        <div className="flex flex-wrap justify-center items-end gap-5 sm:gap-7 mt-5 sm:mt-6">
          {shown.map((u) => {
            const img = u.type === "deck" ? deckAssets(u.id).back : (battlefieldAssets(u.id) || {}).desktop;
            return (
              <div key={`${u.type}:${u.id}`} className="ul-item flex flex-col items-center gap-2.5"
                style={{ width: u.type === "deck" ? "min(240px, 64vw)" : "min(380px, 82vw)" }}>
                {/* Ohne Bild KEINE leere Kachel — der Name allein sagt mehr als ein leerer Rahmen. */}
                {img && (
                  <div className="ul-img rounded-xl overflow-hidden w-full"
                    style={{ aspectRatio: u.type === "deck" ? "3 / 4" : "16 / 9", background: "#0c0c10", border: "1px solid #d4a63a55" }}>
                    <img src={img} alt="" decoding="async" className={`w-full h-full ${u.type === "deck" ? "object-contain" : "object-cover"}`} />
                  </div>
                )}
                <span className="text-body-lg-3 font-semibold leading-tight">{u.name}</span>
              </div>
            );
          })}
        </div>
        {alsoNames.length > 0 && (
          <div className="text-body-3 opacity-70 mt-4">+ {alsoNames.join(" · ")}</div>
        )}
        <div className="text-body-5 opacity-55 mt-5">{t("gameover.skins.hint")}</div>
        <button onClick={onConfirm} autoFocus
          className="as-actbtn as-edge-strong mt-5 sm:mt-6 w-full py-3 rounded-lg font-bold transition-all hover:brightness-110"
          style={{ "--c": "#d4a63a" }}>
          {t("common.confirm")}
        </button>
      </div>
    </div>
  ));
}

export function GameOver({ state, isRecord, timeStr, onRestart, onMenu, currentTraj = [], recordTraj = [], newUnlocks = [], progressUnlocks = [], earn = null, onboarding = null, prevBests = null, onCustomize = null, onUpgrades = null, onLeaderboard = null }) {
  const score = Math.floor(state.score); // Zahlenwert für Record-Vergleich; Anzeige über fmtScore
  const [guideArch, setGuideArch] = useState(null); // #: Leitfaden-Overlay aus einem Archetyp-Freischalt-Button (Onboarding)
  // #304 Verdienst-Rollup: Score/Meilensteinbalken/SP/DP animiert hochzählen (Challenge: Countdown Brutto→Netto).
  const mb = milestoneBarState(score);
  const scoreUp = useCountUp(score, 1100);
  const barFill = useCountUp(Math.round((mb.fill || 0) * 1000), 850, 300) / 1000; // 0..1 (×1000 für ganzzahliges Count-up)
  const spUp = useCountUp(earn ? earn.sp : 0, 1100, 200);
  const dpRoll = useDpRollup({ gross: earn ? earn.dpGross : 0, net: earn ? earn.dpNet : 0 });
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
  const [unlockSeen, setUnlockSeen] = useState(false);   // #unlock-fenster: einmal bestätigen, dann weg
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
        {/* #304 Verdienst-Rollup (direkt unter dem Score-Hero, wo früher die Münzen-Zeile saß): Meilensteinbalken läuft
            voll, SP (gold) & DP (cyan) zählen hoch; im Challenge zählt DP nach kurzer Pause auf Netto runter (rotes Minus).
            Nur NACH dem Onboarding (davor gibt es keine SP/DP → dann zeigt unten das Onboarding-Banner den Fortschritt). */}
        {/* Auch bei 0 SP / 0 DP: der Block bleibt stehen und zeigt die Nullen. Ein Lauf, den man sofort beendet,
            soll denselben Screen sehen wie ein langer — nur mit anderen Zahlen. */}
        {!onboarding && earn && (
          <div className="go-earn as-ring as-ring-quiet mt-4">
            <i className="as-ring-run" aria-hidden="true" />
            <div className="go-box rounded-xl px-3 py-2.5" style={MENU_PANEL}>
              <div className="flex items-center justify-between mb-1.5 text-meta-3 font-bold">
                <span style={{ color: "#9a9aa6" }}>{t("gameover.milestones", { done: mb.reached, total: mb.total })}</span>
                <span style={{ color: "#8a8896" }}>{mb.atMax ? t("gameover.milestones.max") : t("gameover.milestones.next", { n: Math.round(mb.next.at / 1_000_000) })}</span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#0e0e13" }}>
                {/* #deckui: Meilenstein-Fortschrittsbalken zieht die Deckfarbe statt fixem Cyan. */}
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.round(barFill * 100)}%`, background: "linear-gradient(90deg, var(--deck-a1, #26c6e6), var(--deck-a2, #5fe0f7))" }} />
                {Array.from({ length: mb.total - 1 }, (_, i) => (
                  <i key={i} className="absolute inset-y-0" style={{ left: `${(i + 1) / mb.total * 100}%`, width: 1.5, background: "#0e0e13" }} />
                ))}
              </div>
            </div>
            {earn && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* #kante: Die beiden Währungs-Zeilen waren getönte Flächen (Braungold / Dunkelcyan). Als
                    Kanten auf gleichem Grund lesen sie sich als ein Paar statt als zwei verschiedene Kästen;
                    die Farbe steckt weiter in Kante und Zahl. */}
                <div className="as-edge-card rounded-xl px-3 py-2 flex items-center justify-between" style={{ "--c": "#d4a63a" }}>
                  <span className="text-meta-3 font-bold" style={{ color: "#d4a63a" }}>{t("gameover.sp")}</span>
                  <span className="ty-num text-title-2" style={{ color: "#f2c14a" }}>+{spUp}</span>
                </div>
                <div className="as-edge-card relative rounded-xl px-3 py-2 flex items-center justify-between overflow-hidden" style={{ "--c": "#35c6e6" }}>
                  <span className="text-meta-3 font-bold" style={{ color: "#35c6e6" }}>{t("gameover.dp")}</span>
                  <span className="flex items-center gap-1.5">
                    {dpRoll.minus && <span className="text-meta-1 font-extrabold px-1 rounded" style={{ background: "#3a1214", color: "#ff9a9a" }}>−{Math.max(0, (earn.dpGross || 0) - (earn.dpNet || 0))}</span>}
                    <span className="ty-num text-title-2" style={{ color: "#5fe0f7" }}>+{dpRoll.val}</span>
                  </span>
                  {dpRoll.minus && <span aria-hidden className="absolute bottom-0 left-0 h-[3px]" style={{ width: "100%", background: "#e05555" }} />}
                </div>
              </div>
            )}
            {/* Willkommensbonus: einmalig nach dem ersten abgeschlossenen Lauf. Bewusst als EIGENE Zeile
                statt in die SP-Kachel addiert — sonst stünde da nur eine große Zahl und der Spieler
                wüsste nicht, wofür. Der goldene Rahmen (as-legendary) markiert das Einmalige. */}
            {earn && earn.welcomeDp > 0 && (
              <div className="as-legendary mt-2 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
                style={{ background: "#1a1608" }}>
                <span className="min-w-0">
                  <span className="text-body-1 font-extrabold block" style={{ color: "#f2c14a" }}>{t("gameover.welcome")}</span>
                  <span className="text-meta-2 leading-snug block" style={{ color: "#c8bb8a" }}>{t("gameover.welcome.hint")}</span>
                </span>
                <span className="ty-num text-title-2 shrink-0" style={{ color: "#f2c14a" }}>
                  {t("gameover.welcome.value", { n: earn.welcomeDp })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* #: Onboarding-Fortschritt — NACH JEDEM Onboarding-Lauf: golden funkelnder Rahmen mit dem Stand + gerade
            freigeschalteter Belohnung (progressUnlocks) bzw. der nächsten Freischaltung. Nur während des Onboardings. */}
        {onboarding && (
          <div className="go-onb as-legendary mt-4 rounded-xl p-3" style={{ background: "#1a1608" }}>
            <div className="text-body-5 uppercase tracking-widest text-center mb-2" style={{ color: "#f2c14a" }}>
              ✦ Onboarding {onboarding.step}/{onboarding.links}
            </div>
            {progressUnlocks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {progressUnlocks.map((u) => (
                  <div key={u.id} className="flex flex-col items-center gap-2 rounded-lg px-3 py-2 text-center" style={{ background: "#141019", border: "1px solid #3a2f12" }}>
                    <span className="text-body-1 font-bold leading-snug" style={{ color: "#f0d27a" }}>{t("gameover.unlocked.inline", { label: u.label })}</span>
                    {u.guide && (
                      <button type="button" onClick={() => setGuideArch(u.guide)}
                        className="rounded-full px-3 py-1 text-body-1 font-bold transition-all hover:-translate-y-0.5"
                        style={{ background: "#241b34", color: "#e8d9ff", border: "1px solid #6b4fa0" }}>
                        📖 {t("skill.guide.title", { arch: u.guideName })}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-body-1 text-center font-bold" style={{ color: "#f0d27a" }}>
                {t(onboarding.advanced ? "gameover.progress.saved" : "gameover.progress.done")}
                {onboarding.nextLabel ? ` · ${t("gameover.progress.next", { at: onboarding.nextAt, total: onboarding.links, label: onboarding.nextLabel })}` : ""}
              </div>
            )}
          </div>
        )}
        {/* #: Leitfaden-Overlay — vom „📖 Leitfaden"-Button eines Archetyp-Unlocks geöffnet, direkt auf dessen Fraktions-Seite. */}
        {guideArch && <GuideOverlay initial={guideArch} onClose={() => setGuideArch(null)} />}

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

        {/* #unlock-fenster: EIN Fenster in jeder Breite (seit 18.08.2026 auch am Handy). Die Bahn im Screen
            gibt es nicht mehr — sie war auf dem Desktop ein leeres Band und am Handy eine Karte, die man
            beim Scrollen überliest. Als Fenster ist die Freischaltung das, was sie ist: eine Nachricht. */}
        {newUnlocks.length > 0 && !unlockSeen && (
          <UnlockModal unlocks={newUnlocks} onConfirm={() => setUnlockSeen(true)} />
        )}

        {/* #299 Meta-Freischaltungen dieses Laufs (Onboarding-Abschluss/Archetyp/Rarität) — funkelnder Gold-Rahmen
            (as-legendary) + kontextpassender Ziel-Button je Freischaltung. Während des Onboardings zeigt das
            Onboarding-Banner oben die Freischaltungen (kein Ziel-Button nötig) → hier nur NACH dem Onboarding. */}
        {!onboarding && progressUnlocks.length > 0 && (
          <div className="go-unlocks as-legendary mt-4 rounded-xl p-3" style={{ background: "#1a1608" }}>
            <div className="text-body-5 uppercase tracking-widest text-center mb-2" style={{ color: "#f2c14a" }}>{t("gameover.unlocked.title")}</div>
            <div className="flex flex-col gap-2">
              {progressUnlocks.map((u) => {
                const nav = u.target === "workshop" ? { fn: onCustomize, label: t("gameover.nav.workshop") }
                  : u.target === "upgrades" ? { fn: onUpgrades, label: t("gameover.nav.upgrades") }
                  : u.target === "leaderboard" ? { fn: onLeaderboard, label: t("gameover.nav.leaderboard") } : null;
                return (
                  <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "#141019", border: "1px solid #3a2f12" }}>
                    <span className="text-body-1 font-bold leading-snug" style={{ color: "#f0d27a" }}>✦ {u.label}</span>
                    {nav && nav.fn && (
                      /* #kante: Weiterleitung in der Freischaltungs-Zeile — starker Kanten-Knopf statt
                         gefüllter Goldtaste. Die Zeile drumherum behält bewusst ihre Fläche. */
                      <button onClick={nav.fn} className="as-edge-strong as-edge-thin shrink-0 text-meta-3 font-extrabold px-3 py-1.5 rounded-lg whitespace-nowrap transition-transform hover:-translate-y-0.5"
                        style={{ "--c": "#d4a63a" }}>{nav.label} ›</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


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
