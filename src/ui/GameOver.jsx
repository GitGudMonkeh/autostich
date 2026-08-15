import { useState, useEffect } from "react";
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
import { ARCH_CAT } from "./indicators/vocab.js";
import FormIcon from "./FormIcon.jsx";
import { milestoneBarState } from "../game/progression.js"; // #304 Verdienst-Rollup: Meilensteinbalken
import { GuideOverlay } from "./GuideOverlay.jsx"; // #: Leitfaden direkt auf der Fraktions-Seite eines Archetyp-Unlocks öffnen
import { archFamily } from "../i18n/labels.js"; // #sprache: Gebäudename zur Anzeigezeit

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
export function GameOver({ state, isRecord, timeStr, onRestart, onMenu, currentTraj = [], recordTraj = [], newUnlocks = [], progressUnlocks = [], earn = null, onboarding = null, onCustomize = null, onUpgrades = null, onLeaderboard = null }) {
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
  pushM(arch.includes("plant"), "Gewachsen", Math.round(state.growthTotal || 0), "#69cf59");
  pushM(arch.includes("lightning"), "Ionisierungen", Math.round(state.ionTotal || 0), "#8a7de0");
  pushM(arch.includes("fire"), "Asche verbrannt", Math.round(state.ashBurned || 0), "#ff7a3c");
  pushM(arch.includes("fire"), "Brände", Math.round(state.brandTotal || 0), "#ff7a3c");

  // Architekt-Gebäude in der finalen Aufstellung — ein-/ausblendbar + Liste (Name · Form · Stufe), wie in der Chronik.
  const archBuildings = (state.architectEnabled && state.architect && state.architect.buildings) || [];
  const hasArch = archBuildings.length > 0;
  const architectCover = hasArch ? architectCoverFor(state) : null;
  const [showArch, setShowArch] = useState(true);        // Gebäude-Overlay auf dem Brett an/aus
  const [inspectBid, setInspectBid] = useState(null);    // Liste ↔ Brett: angetipptes Gebäude glüht am Grid

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl px-6 pb-6 max-h-[90dvh] overflow-y-auto overlay-card as-panel" style={MODAL_CARD}>
        {/* #UI: Aktions-Leiste (Menü · Neuer Lauf) nach oben und STICKY → schwebt beim Scrollen mit. Abstand opak im
            Balken (pt/pb), kein negativer Margin/keine transparente Lücke → kein Durchscheinen der Kopfzeile. */}
        <div className="sticky top-0 z-20 -mx-6 px-6 pt-6 pb-6 flex gap-2 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          {onMenu && (
            <button onClick={onMenu} className="py-2.5 px-4 rounded-lg font-bold transition-all"
              style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}>
              Menü
            </button>
          )}
          <button onClick={onRestart} className="flex-1 py-2.5 rounded-lg font-bold transition-all hover:brightness-110"
            style={{ background: "#d4a63a", color: "#141419" }}>
            Neuer Lauf
          </button>
        </div>
        <div className="text-center mt-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#e0605a" }}>Lauf beendet</div>
          {/* #253/Victory-Redesign: kompakt abgekürzt (Mio./Mrd.) gegen Overflow bei großen Scores; voller Wert im Tooltip. */}
          <div className="text-4xl sm:text-5xl font-bold mt-2 tabular-nums leading-tight" title={fmtScore(score)} style={{ color: "#d4a63a" }}>{fmtScoreShort(scoreUp)}</div>
          {/* Rekord-Zeile: neuer Rekord → Stern + Zuwachs; sonst Abstand zum Rekord. */}
          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
            {isRecord ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-0.5 rounded-full" style={{ color: "#8a7de0", background: "#8a7de01f", border: "1px solid #8a7de055" }}>
                ★ Neuer Rekord{deltaPct != null && deltaPct > 0 ? ` · +${deltaPct} %` : ""}
              </span>
            ) : deltaPct != null ? (
              <span className="text-sm px-2.5 py-0.5 rounded-full" style={{ color: "#9a9aa6", background: "#ffffff0d", border: "1px solid #33333e" }}>
                {deltaPct >= 0 ? "+" : ""}{deltaPct} % zum Rekord
              </span>
            ) : null}
          </div>
          {/* #202: Münzen-Zeile entfernt — der Shop ist seit dem Architekt-Umbau dormant, Münzen sind obsolet. */}
          <div className="text-xs opacity-55 mt-2 flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap">
            {timeStr && <span>{timeStr}</span>}
            {perTrick > 0 && <><span className="opacity-30">·</span><span title="Durchschnittlicher Score je Stich">Ø {fmtScoreShort(perTrick)}/Stich</span></>}
            <span className="opacity-30">·</span><span>{cyclesDone} {cyclesDone === 1 ? "Durchlauf" : "Durchläufe"}</span>
          </div>
        </div>

        {/* #304 Verdienst-Rollup (direkt unter dem Score-Hero, wo früher die Münzen-Zeile saß): Meilensteinbalken läuft
            voll, SP (gold) & DP (cyan) zählen hoch; im Challenge zählt DP nach kurzer Pause auf Netto runter (rotes Minus).
            Nur NACH dem Onboarding (davor gibt es keine SP/DP → dann zeigt unten das Onboarding-Banner den Fortschritt). */}
        {!onboarding && earn && (earn.sp > 0 || earn.dpGross > 0 || earn.dpNet > 0 || score > 0) && (
          <div className="mt-4">
            <div className="rounded-xl px-3 py-2.5" style={MENU_PANEL}>
              <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold">
                <span style={{ color: "#9a9aa6" }}>💠 Meilensteine {mb.reached}/{mb.total}</span>
                <span style={{ color: "#8a8896" }}>{mb.atMax ? "Maximum" : `nächster bei ${Math.round(mb.next.at / 1_000_000)} Mio`}</span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#0e0e13" }}>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.round(barFill * 100)}%`, background: "linear-gradient(90deg,#26c6e6,#5fe0f7)" }} />
                {Array.from({ length: mb.total - 1 }, (_, i) => (
                  <i key={i} className="absolute inset-y-0" style={{ left: `${(i + 1) / mb.total * 100}%`, width: 1.5, background: "#0e0e13" }} />
                ))}
              </div>
            </div>
            {earn && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-xl px-3 py-2 flex items-center justify-between" style={{ background: "#1a1608", border: "1px solid #3a2f12" }}>
                  <span className="text-[11px] font-bold" style={{ color: "#d4a63a" }}>Stichpunkte</span>
                  <span className="font-mono text-[18px] font-extrabold tabular-nums" style={{ color: "#f2c14a" }}>+{spUp}</span>
                </div>
                <div className="relative rounded-xl px-3 py-2 flex items-center justify-between overflow-hidden" style={{ background: "#08171b", border: "1px solid #16323a" }}>
                  <span className="text-[11px] font-bold" style={{ color: "#35c6e6" }}>Deck-Punkte</span>
                  <span className="flex items-center gap-1.5">
                    {dpRoll.minus && <span className="text-[10px] font-extrabold px-1 rounded" style={{ background: "#3a1214", color: "#ff9a9a" }}>−{Math.max(0, (earn.dpGross || 0) - (earn.dpNet || 0))}</span>}
                    <span className="font-mono text-[18px] font-extrabold tabular-nums" style={{ color: "#5fe0f7" }}>+{dpRoll.val}</span>
                  </span>
                  {dpRoll.minus && <span aria-hidden className="absolute bottom-0 left-0 h-[3px]" style={{ width: "100%", background: "#e05555" }} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* #: Onboarding-Fortschritt — NACH JEDEM Onboarding-Lauf: golden funkelnder Rahmen mit dem Stand + gerade
            freigeschalteter Belohnung (progressUnlocks) bzw. der nächsten Freischaltung. Nur während des Onboardings. */}
        {onboarding && (
          <div className="as-legendary mt-4 rounded-xl p-3" style={{ background: "#1a1608" }}>
            <div className="text-xs uppercase tracking-widest text-center mb-2" style={{ color: "#f2c14a" }}>
              ✦ Onboarding {onboarding.step}/{onboarding.links}
            </div>
            {progressUnlocks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {progressUnlocks.map((u) => (
                  <div key={u.id} className="flex flex-col items-center gap-2 rounded-lg px-3 py-2 text-center" style={{ background: "#141019", border: "1px solid #3a2f12" }}>
                    <span className="text-[12px] font-bold leading-snug" style={{ color: "#f0d27a" }}>✦ Freigeschaltet: {u.label}</span>
                    {u.guide && (
                      <button type="button" onClick={() => setGuideArch(u.guide)}
                        className="rounded-full px-3 py-1 text-[12px] font-bold transition-all hover:-translate-y-0.5"
                        style={{ background: "#241b34", color: "#e8d9ff", border: "1px solid #6b4fa0" }}>
                        📖 Leitfaden: {u.guideName}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-center font-bold" style={{ color: "#f0d27a" }}>
                {onboarding.advanced ? "Fortschritt gesichert" : "Lauf abgeschlossen"}
                {onboarding.nextLabel ? ` · Nächste Freischaltung bei ${onboarding.nextAt}/${onboarding.links}: ${onboarding.nextLabel}` : ""}
              </div>
            )}
          </div>
        )}
        {/* #: Leitfaden-Overlay — vom „📖 Leitfaden"-Button eines Archetyp-Unlocks geöffnet, direkt auf dessen Fraktions-Seite. */}
        {guideArch && <GuideOverlay initial={guideArch} onClose={() => setGuideArch(null)} />}

        {/* Victory-Redesign: Fraktions-Score-Herkunft direkt unter dem Hero — die für Spieler wichtigste Frage „welche Fraktion trägt den Score?". */}
        <div className="mt-5">
          <ScoreHerkunft state={state} />
        </div>

        {/* #190: in diesem Lauf frisch freigeschaltete Skins — kleine Vorschau + Hinweis aufs Deck-Menü. */}
        {newUnlocks.length > 0 && (
          <div className="mt-4 rounded-xl p-3" style={{ background: "#1b1630", border: "1px solid #8a7de055" }}>
            <div className="text-xs uppercase tracking-widest text-center mb-2" style={{ color: "#8a7de0" }}>★ Neu freigeschaltet</div>
            <div className="flex flex-wrap justify-center gap-3">
              {newUnlocks.map((u) => {
                const img = u.type === "deck" ? deckAssets(u.id).back : (battlefieldAssets(u.id) || {}).desktop;
                return (
                  <div key={u.id} className="flex flex-col items-center gap-1" style={{ width: 74 }}>
                    <div className="rounded-md overflow-hidden w-full" style={{ aspectRatio: u.type === "deck" ? "3 / 4" : "16 / 9", background: "#0c0c10", border: "1px solid #33333e" }}>
                      {img && <img src={img} alt="" loading="lazy" decoding="async" className={`w-full h-full ${u.type === "deck" ? "object-contain" : "object-cover"}`} />}
                    </div>
                    <span className="text-[10px] text-center leading-tight opacity-90">{u.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-center opacity-50 mt-2">Auswählbar im Menü unter „Deck“.</div>
          </div>
        )}

        {/* #299 Meta-Freischaltungen dieses Laufs (Onboarding-Abschluss/Archetyp/Rarität) — funkelnder Gold-Rahmen
            (as-legendary) + kontextpassender Ziel-Button je Freischaltung. Während des Onboardings zeigt das
            Onboarding-Banner oben die Freischaltungen (kein Ziel-Button nötig) → hier nur NACH dem Onboarding. */}
        {!onboarding && progressUnlocks.length > 0 && (
          <div className="as-legendary mt-4 rounded-xl p-3" style={{ background: "#1a1608" }}>
            <div className="text-xs uppercase tracking-widest text-center mb-2" style={{ color: "#f2c14a" }}>✦ Freigeschaltet</div>
            <div className="flex flex-col gap-2">
              {progressUnlocks.map((u) => {
                const nav = u.target === "workshop" ? { fn: onCustomize, label: "Zur Werkstatt" }
                  : u.target === "upgrades" ? { fn: onUpgrades, label: "Zu den Upgrades" }
                  : u.target === "leaderboard" ? { fn: onLeaderboard, label: "Zur Rangliste" } : null;
                return (
                  <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "#141019", border: "1px solid #3a2f12" }}>
                    <span className="text-[12px] font-bold leading-snug" style={{ color: "#f0d27a" }}>✦ {u.label}</span>
                    {nav && nav.fn && (
                      <button onClick={nav.fn} className="shrink-0 text-[11px] font-extrabold px-3 py-1.5 rounded-lg whitespace-nowrap transition-transform hover:-translate-y-0.5"
                        style={{ background: "#d4a63a", color: "#141419" }}>{nav.label} ›</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Victory-Redesign · BUILD-Sektion: Archetyp-Zusammenfassung + Perk-/Skill-Chips, darunter die Motor-Kennzahlen
            je aktiver Fraktion (die „Engine-Story" des Runs, nur Zähler > 0). */}
        {((state.skills && state.skills.length) || (state.perks && state.perks.length) || motor.length > 0) && (
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Build</div>
            <RunBuildChips entry={{ perks: state.perks, skills: state.skills || [] }} />
            {motor.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wide opacity-40 mt-4 mb-2">Motor-Kennzahlen</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {motor.map((m) => (
                    <div key={m.label} className="rounded-lg px-3 py-2 min-w-0" style={{ ...MENU_PANEL, borderLeft: `3px solid ${m.color}` }}>
                      <div className="opacity-50 text-[10px] uppercase tracking-wide truncate" title={m.label}>{m.label}</div>
                      <div className="font-bold tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-[15px] mt-0.5" title={m.value.toLocaleString("de-DE")} style={{ color: m.color }}>{fmtScoreShort(m.value)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Victory-Redesign · STATS & VERLAUF-Sektion: schlanke Kern-Kennzahlen (Score-Anteile stehen bereits in der
            Score-Herkunft → sourceCells={false}) + Score-Verlauf + Durchlauf-Graph. */}
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Stats &amp; Verlauf</div>
          <RunStatCells entry={{
            bestStreak: state.bestStreak, crits: state.crits, wins: state.wins,
            bestTrickScore: state.bestTrickScore, bestGlacierTrickScore: state.bestGlacierTrickScore,
            tricks: state.trickNo,
          }} sourceCells={false} />

          {/* Punkteverlauf: aktueller Lauf vs. (vorheriger) Rekord (#35). recordTraj ist der Snapshot
              VOR dem saveRun-Überschreiben → bei neuem Rekord liegt die Lauf-Linie sichtbar darüber. */}
          {currentTraj.length >= 2 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-50 mb-2">
                <span>Score-Verlauf</span>
                <span className="flex gap-2 normal-case tracking-normal">
                  <span style={{ color: "#d4a63a" }}>Lauf</span>
                  {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>Rekord</span> : <span className="opacity-40">erster Lauf</span>}
                </span>
              </div>
              <Sparkline current={currentTraj} record={recordTraj} height={110} />
            </div>
          )}

          {/* #251/Victory-Redesign: der generische Score-Quellen-Balken ist durch den Fraktions-Breakdown (ScoreHerkunft, oben)
              ersetzt → sourceBar={false}; hier bleibt nur der Durchlauf-Graph (Score je Stich, Sieg/Niederlage). */}
          <RunGraphs state={state} sourceBar={false} />
        </div>

        {/* #201.8 Stufe A: finale Deck-Aufstellung schreibgeschützt — bestehendes CardGrid (rendert Formationsrahmen). Aufklappbar, um den Screen kurz zu halten. */}
        {finalOrder.length > 0 && (
          <details className="mt-5 rounded-xl overflow-hidden" style={MENU_PANEL}>
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-wide opacity-70">Finale Aufstellung ansehen</summary>
            <div className="p-3 pt-0">
              {/* Architekt-Gebäude auf dem Brett ein-/ausblenden (Toggle + Kategorie-Legende) — wie in der Chronik/Aufstellung. */}
              {hasArch && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px]">
                  <button onClick={() => setShowArch((v) => !v)} className="px-2 py-1 rounded-lg font-bold"
                    style={showArch ? { background: `${ARCH_CAT.value.color}22`, border: `1px solid ${ARCH_CAT.value.color}`, color: "#cfe3f5" }
                                    : { background: "#20202a", border: "1px solid #3a3a46", color: "#8a8a92" }}>
                    🏗 Gebäude {showArch ? "an" : "aus"}
                  </button>
                  {showArch && Object.entries(ARCH_CAT).map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-1 opacity-80" style={{ color: "#aab4c4" }}>
                      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: v.color }} />{v.label}
                    </span>
                  ))}
                </div>
              )}
              <CardGrid cards={finalCards} formations={finalForms} roles={state.roles} {...glacierGridProps(state)} anchors={state.shop?.anchors || []}
                pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
                architectCover={hasArch && showArch ? architectCover : null}
                glowBid={hasArch && showArch ? inspectBid : null} quietTiles />

              {/* Gebäude-Liste: welche Gebäude auf welcher Stufe. Antippen lässt den Rahmen am Brett cyan leuchten. */}
              {hasArch && (
                <div className="mt-3 rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #5a8ade" }}>
                  <div className="text-[11px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 Deine Gebäude ({archBuildings.length})</div>
                  <div className="text-[10px] opacity-45 mb-1.5">Antippen zeigt am Brett, wo es liegt.</div>
                  <div className="grid gap-1">
                    {archBuildings.map((b) => {
                      const fam = archFamily(b.familyId); if (!fam) return null;
                      const anchor = Math.min(...b.footprint);
                      const eff = architectCover?.[anchor]?.effects?.join(" · ") || "";
                      const meta = ARCH_CAT?.[fam.category] || {};
                      const on = inspectBid === b.id;
                      return (
                        <button key={b.id} onClick={() => { if (!on) setShowArch(true); setInspectBid(on ? null : b.id); }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-mono leading-snug flex flex-col gap-0.5 transition-all"
                          style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "#2a2a34"}` }}>
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <FormIcon form={fam.form} color={fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92")} title={`${fam.name} · ${fam.form}`} />
                            <b>{fam.name}</b>
                            <span className="opacity-55">{fam.legendary ? "Legendär" : `Stufe ${["", "I", "II", "III", "IV"][b.tier] || b.tier}`}</span>
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
  );
}
