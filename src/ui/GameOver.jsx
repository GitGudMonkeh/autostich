import { Sparkline } from "./Sparkline.jsx";
import { RunStatCells, RunBuildChips } from "./RunStats.jsx"; // Victory-Redesign: Kennzahlen (Stats-Sektion) + Build-Chips (Build-Sektion) getrennt platziert
import { RunGraphs, ScoreHerkunft } from "./RunGraphs.jsx"; // #251/Victory-Redesign: Fraktions-Herkunft + Durchlauf-Graph
import { CardGrid } from "./CardGrid.jsx";
import { glacierGridProps } from "./glacierBoard.js";
import { fmtScore, fmtScoreShort } from "./format.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js"; // #190: Freischalt-Vorschau
import { computeFormations } from "../game/formations.js"; // #201.8: finale Aufstellung + Rahmen
import { allianceGroups } from "../game/families.js";
import { architectCoverFor } from "./architectCover.js"; // #UI: Gebäude-Rahmen auch im Victory-Screen (wie Chronik)

// Highscore-Listen (lokal + global) bewusst NICHT hier — sie stehen auf dem Startbildschirm und
// machten dieses (nicht scrollbare) Overlay zu lang. Der GameOver-Screen zeigt nur den Lauf.
// #169 FB-8: der Statblock (Serie/Perks/Formationen/Crits + Perk-/Skill-Chips) steckt jetzt in der
// geteilten RunStats-Komponente — dieselbe Anzeige nutzt die Leaderboard-Detailansicht (RunDetail).
export function GameOver({ state, isRecord, timeStr, onRestart, onMenu, currentTraj = [], recordTraj = [], newUnlocks = [] }) {
  const score = Math.floor(state.score); // Zahlenwert für Record-Vergleich; Anzeige über fmtScore
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

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#e0605a" }}>Lauf beendet</div>
          {/* #253/Victory-Redesign: kompakt abgekürzt (Mio./Mrd.) gegen Overflow bei großen Scores; voller Wert im Tooltip. */}
          <div className="text-4xl sm:text-5xl font-bold mt-2 tabular-nums leading-tight" title={fmtScore(score)} style={{ color: "#d4a63a" }}>{fmtScoreShort(score)}</div>
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
                      {img && <img src={img} alt="" className={`w-full h-full ${u.type === "deck" ? "object-contain" : "object-cover"}`} />}
                    </div>
                    <span className="text-[10px] text-center leading-tight opacity-90">{u.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-center opacity-50 mt-2">Auswählbar im Menü unter „Deck“.</div>
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
                    <div key={m.label} className="rounded-lg px-3 py-2 min-w-0" style={{ background: "#141419", border: `1px solid #2a2a34`, borderLeft: `3px solid ${m.color}` }}>
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
            bestTrickScore: state.bestTrickScore, tricks: state.trickNo,
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
          <details className="mt-5 rounded-xl overflow-hidden" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-wide opacity-70">Finale Aufstellung ansehen</summary>
            <div className="p-3 pt-0">
              <CardGrid cards={finalCards} formations={finalForms} roles={state.roles} {...glacierGridProps(state)} anchors={state.shop?.anchors || []}
                pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }} architectCover={architectCoverFor(state)} quietTiles />
            </div>
          </details>
        )}

        <div className="flex gap-2 mt-6">
          {onMenu && (
            <button
              onClick={onMenu}
              className="py-2.5 px-4 rounded-lg font-bold transition-all"
              style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
            >
              Menü
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex-1 py-2.5 rounded-lg font-bold transition-all"
            style={{ background: "#5ab87a", color: "#141419" }}
          >
            Neuer Lauf
          </button>
        </div>
      </div>
    </div>
  );
}
