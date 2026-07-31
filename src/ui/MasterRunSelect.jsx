// 🎖 Meister-Lauf — Rang-Auswahl (#217). Eigener Modus: hier wählt der Spieler den Rang, auf dem er spielen will.
// Nur freigeschaltete Ränge (≤ eigener Max-Rang) sind spielbar, höhere sind ausgegraut (mit Schwelle). Man startet
// RANGLOS: ein ranglos-Lauf (ohne Rewards) ist immer möglich und schaltet mit ≥ Rang-I-Schwelle den ersten Rang frei.
// NUR Meister-Läufe zählen für die Rang-Leiter (Fortschritt), normale Läufe nicht.
import { Fragment } from "react";
import { useEscape } from "./useEscape.js";
import {
  MASTERY_THRESHOLDS, MASTERY_ROMAN, MASTERY_REWARD_LABELS, MASTERY_MAX_GRADE, MASTERY_MEISTER_MAX,
  thresholdForGrade, isGrandmaster, rankRoman,
} from "../game/mastery.js";
import { DECK_DEFS } from "../game/cosmetics.js";
import { fmtScore } from "./format.js";

const RANK_DECK_ID = { 1: "deck_rank_bronze", 2: "deck_rank_silber", 3: "deck_rank_gold", 4: "deck_rank_platin", 5: "deck_rank_diamond" };
// #226 Großmeister-Deck-Anzeigenamen (Assets liegen als deck_gm_* bereit; die Kosmetik-Registry-Verdrahtung folgt separat).
const GM_DECK_NAME = { 6: "Rot", 7: "Blau", 8: "Grün", 9: "Lila", 10: "Marco stinkt" };
const ACCENT = "#8a7de0";
const ACCENT_HI = "#b3a8f5";
const GM_ACCENT = "#d4a63a"; // Gold — Großmeister-Tier abgesetzt vom Meister-Violett

export function MasterRunSelect({ profile, onPlay, onClose }) {
  useEscape(onClose);
  const maxRank = profile.masteryGrade || 0;
  const rankless = maxRank === 0;

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6 my-auto overlay-card"
        style={{ background: "#181820", border: "1px solid #33333e" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            Meister-Lauf
            <span className="px-1 rounded text-[9px] font-bold font-pixel leading-tight"
              style={{ background: "#d4a63a", color: "#141419", boxShadow: "0 0 6px rgba(212,166,58,.6)" }}>exp</span>
          </h2>
          <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>
        <p className="text-[13px] opacity-55 leading-relaxed mt-2">
          Wähle den Rang, auf dem du spielen willst. Nur <b>Meister-Läufe</b> schalten den nächsten Rang frei — normale Läufe nicht.
        </p>

        {/* Ranglos-Einstieg — nur solange noch kein Rang erreicht ist (sonst spielt man ab Rang I). */}
        {rankless && (
          <div className="mt-4 flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl"
            style={{ background: "#1c1a26", border: `1px solid ${ACCENT}55` }}>
            <div className="min-w-0 flex-1">
              <div className="font-bold" style={{ color: ACCENT_HI }}>Kein Rang — Einstieg</div>
              <div className="text-[12px] opacity-55 mt-0.5">Erreiche {fmtScore(thresholdForGrade(1))} in einem Meister-Lauf → Rang&nbsp;I.</div>
            </div>
            <button onClick={() => onPlay(0)} className="shrink-0 px-5 py-2.5 rounded-lg font-bold transition-all hover:-translate-y-0.5"
              style={{ background: ACCENT, color: "#141419" }}>
              ▶ Ranglos spielen
            </button>
          </div>
        )}

        {/* Die fünf Ränge — freigeschaltete spielbar, gesperrte ausgegraut mit Schwelle. */}
        <div className="grid gap-1.5 mt-3">
          {MASTERY_THRESHOLDS.map((thr, i) => {
            const n = i + 1;
            const gm = isGrandmaster(n);                     // Großmeister-Tier (Grade 6–10)?
            const acc = gm ? GM_ACCENT : ACCENT;
            const accHi = gm ? "#e6c766" : ACCENT_HI;
            const unlocked = maxRank >= n;
            const roman = rankRoman(n);
            const tierLabel = gm ? `Großmeister ${roman}` : `Rang ${roman}`;
            const deckName = gm ? (GM_DECK_NAME[n] || "") : (DECK_DEFS[RANK_DECK_ID[n]]?.name || "");
            // Kumulativ: bisherige (grau) + neue (farbig). Meister bringt Rewards; Großmeister nur Schwierigkeit + Deck.
            const prevRewards = gm ? [] : [...new Set(Array.from({ length: n - 1 }, (_, k) => MASTERY_REWARD_LABELS[k + 1] || []).flat())];
            const newRewards = MASTERY_REWARD_LABELS[n] || [];
            return (
              <Fragment key={n}>
                {n === MASTERY_MEISTER_MAX + 1 && (
                  <div className="flex items-center gap-2 mt-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: GM_ACCENT }}>Großmeister</span>
                    <span className="flex-1 h-px" style={{ background: `${GM_ACCENT}44` }} />
                    <span className="text-[10px] opacity-45">nur die Schwierigkeit steigt · Ziel bleibt {fmtScore(thr)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: unlocked ? "#141419" : "#111116", border: `1px solid ${unlocked ? `${acc}55` : "#26262e"}`, opacity: unlocked ? 1 : 0.5 }}>
                  <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-pixel text-sm"
                    style={{ background: unlocked ? acc : "#20202a", color: unlocked ? "#141419" : "#7a7a88", border: unlocked ? "none" : "1px solid #33333e" }}>
                    {roman}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-bold" style={{ color: unlocked ? accHi : "#8a8a95" }}>{tierLabel}</span>
                      {prevRewards.map((r) => (
                        <span key={`p${r}`} className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: "#17171c", color: "#7a7a88" }}>{r}</span>
                      ))}
                      {prevRewards.length > 0 && <span className="text-[12px] font-bold px-0.5" style={{ color: ACCENT }}>+</span>}
                      {newRewards.map((r) => (
                        <span key={`n${r}`} className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${ACCENT}22`, color: ACCENT_HI, border: `1px solid ${ACCENT}55` }}>{r}</span>
                      ))}
                      {gm && (
                        <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${GM_ACCENT}22`, color: "#e6c766", border: `1px solid ${GM_ACCENT}55` }}>härterer Gegner</span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-45 mt-0.5">Deck: {deckName}</div>
                  </div>
                  <div className="shrink-0">
                    {unlocked ? (
                      <button onClick={() => onPlay(n)} className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5"
                        style={{ background: acc, color: "#141419" }}>▶ Spielen</button>
                    ) : (
                      <div className="text-right">
                        <div className="text-[11px] font-bold tabular-nums" style={{ color: "#c8c8d0" }}>{fmtScore(thr)}</div>
                        <div className="text-[10px] opacity-55">gesperrt</div>
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="text-[11px] opacity-40 mt-3 leading-relaxed">
          Belohnungen sind kumulativ — <span style={{ color: "#7a7a88" }}>graue</span> Chips gibt's schon ab niedrigeren Rängen, <span style={{ color: ACCENT_HI }}>farbige</span> kommen bei diesem Rang neu dazu. Ab <b style={{ color: GM_ACCENT }}>Großmeister</b> steigen keine Rewards mehr — nur der Gegner wächst mit (Ramp), das Ziel bleibt 50 M. Experimentell.
        </div>
      </div>
    </div>
  );
}
