import { Sparkline } from "./Sparkline.jsx";
import { RunStats } from "./RunStats.jsx";
import { CardGrid } from "./CardGrid.jsx";
import { fmtScore } from "./format.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js"; // #190: Freischalt-Vorschau
import { computeFormations } from "../game/formations.js"; // #201.8: finale Aufstellung + Rahmen
import { allianceGroups } from "../game/families.js";

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
  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#e0605a" }}>Lauf beendet</div>
          <div className="text-5xl font-bold mt-2" style={{ color: "#d4a63a" }}>{fmtScore(score)}</div>
          <div className="text-sm opacity-60 mt-1">Score{timeStr ? ` · ${timeStr}` : ""}</div>
          {state.shop && <div className="mt-1 text-xs font-bold" style={{ color: "#d4a63a" }}>🪙 {state.shop.coins ?? 0} Münzen übrig</div>}
          {isRecord && <div className="mt-2 text-sm font-bold" style={{ color: "#8a7de0" }}>★ Neuer Rekord!</div>}
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
            <div className="text-[10px] text-center opacity-50 mt-2">Auswählbar im Menü unter „Deck".</div>
          </div>
        )}

        <div className="mt-5">
          <RunStats entry={{
            bestStreak: state.bestStreak, perks: state.perks, skills: state.skills || [],
            maxFormations: state.maxFormations, formationScore: state.formationScore, buildingScore: state.buildingScore,
            crits: state.crits, wins: state.wins, critBonusScore: state.critBonusScore, bestTrickScore: state.bestTrickScore,
          }} />
        </div>

        {/* Punkteverlauf: aktueller Lauf vs. (vorheriger) Rekord (#35). recordTraj ist der Snapshot
            VOR dem saveRun-Überschreiben → bei neuem Rekord liegt die Lauf-Linie sichtbar darüber. */}
        {currentTraj.length >= 2 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-50 mb-2">
              <span>Punkteverlauf</span>
              <span className="flex gap-2 normal-case tracking-normal">
                <span style={{ color: "#d4a63a" }}>Lauf</span>
                {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>Rekord</span> : <span className="opacity-40">erster Lauf</span>}
              </span>
            </div>
            <Sparkline current={currentTraj} record={recordTraj} height={110} />
          </div>
        )}

        {/* #201.8 Stufe A: finale Deck-Aufstellung schreibgeschützt — bestehendes CardGrid (rendert Formationsrahmen). Aufklappbar, um den Screen kurz zu halten. */}
        {finalOrder.length > 0 && (
          <details className="mt-5 rounded-xl overflow-hidden" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] uppercase tracking-wide opacity-70">Finale Aufstellung ansehen</summary>
            <div className="p-3 pt-0">
              <CardGrid cards={finalCards} formations={finalForms} roles={state.roles} anchors={state.shop?.anchors || []}
                pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }} quietTiles />
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
