import { useState } from "react";
import { useIsWide } from "./useIsWide.js"; // #desktop: ab 1400 px derselbe gerahmte Screen wie nach einem Lauf
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { RunStatCells, RunBuildChips, RunTreeBlock } from "./RunStats.jsx";
import { Sparkline } from "./Sparkline.jsx";   // #rd-verlauf: derselbe Graph wie im Victory-Screen
import { RunGraphs } from "./RunGraphs.jsx";   // #rd-verlauf: Stich-Score je Durchlauf
import { fmtDuration } from "../game/deck.js";
import { CardGrid } from "./CardGrid.jsx"; // #201.8 Stufe B: finale Aufstellung aus dem Snapshot (schreibgeschützt)
import { SeedChip } from "./SeedChip.jsx"; // #205 Challenger Mode: Seed kopieren / nachspielen
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { fmtScore } from "./format.js";
import FormIcon from "./FormIcon.jsx";
import { ArchToggle } from "./ArchPanels.jsx"; // #398: geteilter Gebäude-Umschalter (eine Quelle für alle vier Bildschirme)
import { archFamily, archCatDef } from "../i18n/labels.js"; // #sprache: Gebäudename zur Anzeigezeit
import { t, fmtNum } from "../i18n/index.js";

/* #169 FB-8: Detailansicht eines Bestenlisten-Eintrags (lokal ODER global) — Overlay über der Liste, zeigt
   denselben Statblock wie der eigene Victory-Screen (RunStats). Escape/Klick-außen schließt. `entry` ist bereits
   normalisiert (perks/skills als ID-Arrays; global-Strings dekodieren die Aufrufer). Alt-/pre-Migration-Einträge
   liefern nur einen Teil der Felder → RunStats zeigt „–" bzw. blendet leere Blöcke aus. */
/* #205: `anonymized` (fremder Board-Eintrag) blendet Build-Blöcke aus — Perk-/Skill-Chips (via RunStats) UND
   die finale Aufstellung — sodass fremde Runs nicht 1:1 nachbaubar sind (nur Kennzahlen/Icons/Score/Seed).
   Eigene/lokale Läufe bleiben voll. `onPlaySeed` (optional) macht den Seed-Chip nachspielbar. */
/* #rd-verlauf: eine Kennzahl der Kopfzeile — Wert groß, Beschriftung klein darunter. Bewusst KEINE Kachel
   (RunStatCells): das hier ist der Rahmen des Laufs (wie lang, wie weit), nicht sein Ergebnis. */
function HeadStat({ label, value, title }) {
  return (
    <div className="rd-kpi-i min-w-0" title={title}>
      <div className="ty-num text-[15px] leading-none whitespace-nowrap">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-45 mt-1 truncate">{label}</div>
    </div>
  );
}

export function RunDetail({ entry, rank = null, onClose, anonymized = false, onPlaySeed = null, recordTraj = [] }) {
  useEscape(onClose);
  const wide = useIsWide();                          // #desktop: drei Spalten statt schmaler Karte
  const [showArch, setShowArch] = useState(true);     // Gebäude-Overlay auf dem Brett an/aus (wie im Victory-Screen)
  const [inspectBid, setInspectBid] = useState(null); // Liste ↔ Brett: angetipptes Gebäude glüht am Grid
  if (!entry) return null;
  const name = entry.name;
  const score = typeof entry.score === "number" ? entry.score : 0;
  /* Kopf-Kennzahlen: der RAHMEN des Laufs. Board-Einträge liefern Zahlen teils als Strings (PostgREST bewahrt so
     die bigint-Präzision) → wie in RunStats parsen; fehlende Werte lassen ihre Kachel ganz weg statt „–" zu zeigen
     (in einer Kopfzeile ohne Spalten gibt es nichts zu vergleichen, ein Platzhalter wäre nur Rauschen). */
  const numOf = (v) => { const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v; return typeof n === "number" && !Number.isNaN(n) ? n : null; };
  const cycles = numOf(entry.cycles ?? entry.level);
  const tricks = numOf(entry.tricks);
  const wins = numOf(entry.wins);
  const durationMs = numOf(entry.durationMs);
  const avgTricks = cycles != null && tricks != null && cycles > 0 ? tricks / cycles : null;
  /* #rd-verlauf: Score-Verlauf + Stich-Score je Durchlauf — dieselben zwei Auswertungen wie im Victory-Screen,
     jetzt auch für einen GESPEICHERTEN Lauf. Beide Reihen wandern seit diesem Schritt in die Lauf-Historie;
     Alt-Läufe (und fremde Board-Einträge, die es nie geben wird) haben sie nicht → der Block bleibt ganz weg. */
  const traj = Array.isArray(entry.traj) ? entry.traj : [];
  const trickLog = Array.isArray(entry.trickLog) ? entry.trickLog : [];
  const hasTraj = traj.length >= 2;
  const hasLog = trickLog.some((c) => c && c.length);
  // Architekt-Gebäude aus dem Snapshot (nur neue Läufe haben sie mitgespeichert → sonst kein Gebäude-Block).
  const snap = entry.deckSnapshot || null;
  const archCover = snap && snap.architectCover ? snap.architectCover : null;
  const archBuildings = snap && Array.isArray(snap.buildings) ? snap.buildings : [];
  const hasArch = archBuildings.length > 0 && !!archCover;
  /* #overlay-portal: an document.body statt in den Aufrufer-Baum. Der Statistik-Bildschirm ist der einzige
     Aufrufer, dessen WURZEL zugleich Blur-Ebene (`backdrop-filter`) UND Scroll-Container (`overflow-y-auto`) ist.
     `backdrop-filter` macht ein Element zum Containing Block für `position: fixed`-Nachfahren — dieses Overlay
     hing damit nicht am Viewport, sondern am Scroll-Ursprung der Liste und erschien exakt `scrollTop` Pixel zu
     hoch (gemessen: scrollTop 600 → top −600 px), wo es dann stehenblieb. Der Kopf mit dem Score war abgeschnitten.
     Das Umschalten des Aufrufers auf `overflow-hidden` half nicht: `scrollTop` bleibt dabei erhalten.
     Dieselbe Ursache und dieselbe Lösung stehen schon am Kauffenster der Deck-Werkstatt (CustomizeScreen).
     `document.body` ist farbsicher: `--deck-a1/a2` werden für genau diesen Fall zusätzlich auf `:root`
     gespiegelt (App.jsx). React-Events blubbern weiter durch den REACT-Baum, Escape/Klick-außen bleiben also
     unverändert — auch das Schließen über den Aufrufer. */
  return overlayPortal((
    <div className="rd-root fixed inset-0 overlay-root z-50 flex items-center justify-center p-4"
      style={{ background: "#0c0c10", backdropFilter: "blur(3px)" }} onClick={onClose}>
      {/* #deckui: äußerer Modal-Rahmen zieht die Deckfarbe (as-panel-deck) */}
      {/* #desktop: Ab 1400 px ist das kein Fenster mehr, sondern derselbe gerahmte Screen wie nach einem Lauf —
          gleiche Kopfzeile (Score links, Schließen rechts) und dieselben drei Spalten. Ein gespeicherter Lauf
          trägt weniger als ein laufender (kein Verlauf, kein Verdienst), die Panels sind deshalb die Schnittmenge:
          Kennzahlen · Build · finale Aufstellung. */}
      <div className="rd-card w-full max-w-md rounded-2xl px-6 pb-6 max-h-[90dvh] overflow-y-auto overlay-card as-panel as-panel-deck"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* #UI: Kopf mit Schließen-Knopf STICKY → bleibt beim Scrollen oben rechts erreichbar (Abstand opak im Header, kein negativer Margin). */}
        <div className="rd-head sticky top-0 z-20 -mx-6 px-6 pt-6 pb-4 flex items-start justify-between gap-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="rd-title min-w-0">
            {/* #deckui: generisches Sektions-Label zieht die Deckfarbe (Fallback = bisheriges Violett) */}
            <div className="text-xs uppercase tracking-widest" style={{ color: "var(--deck-a1, #8a7de0)" }}>Lauf-Details{rank != null ? ` · #${rank}` : ""}</div>
            {name && <div className="text-lg font-bold mt-0.5 truncate">{name}</div>}
          </div>
          <ActionButton kind="secondary" className="rd-close shrink-0" onClick={onClose}>{t("common.close")}</ActionButton>
        </div>
        <div className="rd-score text-center my-3">
          <div className="rd-num text-4xl font-bold" style={{ color: "#d4a63a" }}>{fmtScore(score)}</div>
          <div className="text-xs opacity-50 mt-0.5">{t("hud.score")}</div>
          {/* #205: Seed dieses Laufs — kopieren & (optional) nachspielen. Alt-Läufe ohne Seed zeigen nichts. */}
          {entry.seedCode && (
            <div className="flex justify-center mt-2">
              <SeedChip code={entry.seedCode} onReplay={onPlaySeed ? () => onPlaySeed(entry.seed) : null} />
            </div>
          )}
        </div>
        {/* #rd-verlauf: der Rahmen des Laufs neben der Zahl — wie weit kam er (Durchläufe), wie viel wurde
            gespielt (Stiche, Ø je Durchlauf, Siege) und wie lange dauerte er. Auf dem Desktop füllt diese Reihe
            die Kopfzeile rechts der Score-Zahl, auf dem Handy steht sie als eine Zeile darunter. */}
        {(cycles != null || tricks != null) && (
          <div className="rd-kpi flex flex-wrap justify-center gap-x-6 gap-y-2 mb-3">
            {cycles != null && <HeadStat label={t("runstats.cycles")} value={cycles} />}
            {tricks != null && <HeadStat label={t("rail.tricks")} value={tricks} />}
            {avgTricks != null && <HeadStat label={t("runstats.avgTricks")} value={fmtNum(avgTricks.toFixed(1))} title={t("runstats.avgTricks.title")} />}
            {wins != null && <HeadStat label={t("runstats.wins")} value={wins} />}
            {durationMs != null && durationMs > 0 && <HeadStat label={t("runstats.duration")} value={fmtDuration(durationMs)} />}
          </div>
        )}
        {/* #rd-verlauf: die drei linken Panels liegen in einem eigenen Raster. Ohne diese Klammer müsste die
            Aufstellung rechts zwei Rasterzeilen überspannen — und ein überspannendes Element verteilt seine
            Mehrhöhe auf ALLE Zeilen, die es kreuzt (auch auf `min-content`-Zeilen, das ist keine feste Größe).
            Zwischen Kennzahlen/Build und dem Verlauf klaffte dadurch eine Lücke von gut 100 px. Unterhalb
            1400 px ist die Klammer `display: contents` → die Handy-Fassung bleibt unverändert. */}
        <div className="rd-left">
        {/* #global: Baumstand VOR den Kennzahlen — er ist die Vorbedingung des Scores, nicht eine seiner
            Kennzahlen. Fehlt der Wert (lokaler Lauf, Alt-Eintrag), rendert der Block gar nichts. */}
        <div className="rd-c1">
          <div className="rd-ph hidden min-[1400px]:block">{t("gameover.stats")}</div>
          <RunTreeBlock treeNodes={entry.treeNodes} />
          <RunStatCells entry={entry} sourceCells />
        </div>
        <div className="rd-c2">
          <div className="rd-ph hidden min-[1400px]:block">{t("gameover.build")}</div>
          <div className="mt-4"><RunBuildChips entry={entry} anonymized={anonymized} /></div>
        </div>
        {/* #rd-verlauf: Verlauf des Laufs — Score-Kurve gegen den besten Lauf der Historie und der Stich-Score
            je Durchlauf. Auf dem Desktop füllt dieses Panel die untere linke Hälfte (Spalte 1+2), die bis hierher
            leer blieb, weil die Aufstellung rechts doppelt so hoch baut wie Kennzahlen und Build zusammen. */}
        {(hasTraj || hasLog) && (
          <div className="rd-c4">
            <div className="rd-ph hidden min-[1400px]:block">{t("gameover.chart.title")}</div>
            {hasTraj && (
              <div className="rd-spark mt-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-50 mb-2">
                  <span className="min-[1400px]:hidden">{t("gameover.chart.title")}</span>
                  <span className="hidden min-[1400px]:inline" />
                  <span className="flex gap-3 normal-case tracking-normal">
                    <span style={{ color: "#d4a63a" }}>{t("gameover.chart.run")}</span>
                    {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>{t("gameover.chart.record")}</span> : <span className="opacity-40">{t("gameover.chart.first")}</span>}
                  </span>
                </div>
                <Sparkline current={traj} record={recordTraj} height={110} />
              </div>
            )}
            {hasLog && <RunGraphs state={entry} sourceBar={false} open={wide} />}
          </div>
        )}
        </div>
        {/* #201.8 Stufe B: finale Deck-Aufstellung, sofern der Lauf einen Snapshot hat (nur eigene/lokale Läufe;
            alte Einträge & globale Fremd-Läufe haben keinen → Abschnitt wird ausgeblendet). #205: bei anonymized aus. */}
        {!anonymized && entry.deckSnapshot?.cards?.length > 0 && (
          <details className="rd-c3 mt-4 rounded-xl overflow-hidden" open={wide} style={{ background: "#141419", border: "1px solid #2a2a34" }}>
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-wide opacity-70">{t("gameover.layout.open")}</summary>
            <div className="p-3 pt-0">
              {/* Architekt-Gebäude auf dem Brett ein-/ausblenden (Toggle + Kategorie-Legende) — wie im Victory-Screen. */}
              {hasArch && <ArchToggle on={showArch} onToggle={() => setShowArch((v) => !v)} />}
              <CardGrid cards={entry.deckSnapshot.cards} formations={entry.deckSnapshot.formations || []}
                architectCover={hasArch && showArch ? archCover : null} lockedPos={entry.deckSnapshot.challengeBlockForm || []}
                glowBid={hasArch && showArch ? inspectBid : null} quietTiles />

              {/* Gebäude-Liste: welche Gebäude auf welcher Stufe. Antippen lässt den Rahmen am Brett cyan leuchten. */}
              {hasArch && (
                <div className="mt-3 rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #5a8ade" }}>
                  <div className="text-[11px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 {t("arch.buildingsN", { n: archBuildings.length })}</div>
                  <div className="text-[10px] opacity-45 mb-1.5">{t("gameover.layout.hint")}</div>
                  <div className="grid gap-1">
                    {archBuildings.map((b) => {
                      const fam = archFamily(b.familyId); if (!fam) return null;
                      const anchor = Math.min(...b.footprint);
                      const eff = archCover?.[anchor]?.effects?.join(" · ") || "";
                      const meta = archCatDef(fam.category) || {};
                      const on = inspectBid === b.id;
                      return (
                        <button key={b.id} onClick={() => { if (!on) setShowArch(true); setInspectBid(on ? null : b.id); }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] leading-snug flex flex-col gap-0.5 transition-all"
                          style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "#2a2a34"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
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
            </div>
          </details>
        )}
      </div>
    </div>
  ));
}
