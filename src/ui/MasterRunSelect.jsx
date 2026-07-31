// 🎖 Meister-Lauf — Rang-Auswahl (#217). Eigener Modus: hier wählt der Spieler den Rang, auf dem er spielen will.
// Nur freigeschaltete Ränge (≤ eigener Max-Rang) sind spielbar, höhere sind ausgegraut (mit Schwelle). Man startet
// RANGLOS: ein ranglos-Lauf (ohne Rewards) ist immer möglich und schaltet mit ≥ Rang-I-Schwelle den ersten Rang frei.
// NUR Meister-Läufe zählen für die Rang-Leiter (Fortschritt), normale Läufe nicht.
import { useEscape } from "./useEscape.js";
import {
  MASTERY_THRESHOLDS, MASTERY_ROMAN, MASTERY_REWARD_LABELS, MASTERY_MAX_GRADE, thresholdForGrade,
} from "../game/mastery.js";
import { DECK_DEFS } from "../game/cosmetics.js";
import { fmtScore } from "./format.js";

const RANK_DECK_ID = { 1: "deck_rank_bronze", 2: "deck_rank_silber", 3: "deck_rank_gold", 4: "deck_rank_platin", 5: "deck_rank_diamond" };
const ACCENT = "#8a7de0";
const ACCENT_HI = "#b3a8f5";

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
            const unlocked = maxRank >= n;
            const deckName = DECK_DEFS[RANK_DECK_ID[n]]?.name || "";
            const rewards = MASTERY_REWARD_LABELS[n] || [];
            return (
              <div key={n} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: unlocked ? "#141419" : "#111116", border: `1px solid ${unlocked ? `${ACCENT}55` : "#26262e"}`, opacity: unlocked ? 1 : 0.5 }}>
                <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-pixel text-sm"
                  style={{ background: unlocked ? ACCENT : "#20202a", color: unlocked ? "#141419" : "#7a7a88", border: unlocked ? "none" : "1px solid #33333e" }}>
                  {MASTERY_ROMAN[n]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] font-bold" style={{ color: unlocked ? ACCENT_HI : "#8a8a95" }}>Rang {MASTERY_ROMAN[n]}</span>
                    {rewards.map((r) => (
                      <span key={r} className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: "#20202a", color: "#c8c8d0" }}>{r}</span>
                    ))}
                  </div>
                  <div className="text-[11px] opacity-45 mt-0.5">Deck: {deckName}</div>
                </div>
                <div className="shrink-0">
                  {unlocked ? (
                    <button onClick={() => onPlay(n)} className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5"
                      style={{ background: ACCENT, color: "#141419" }}>▶ Spielen</button>
                  ) : (
                    <div className="text-right">
                      <div className="text-[11px] font-bold tabular-nums" style={{ color: "#c8c8d0" }}>{fmtScore(thr)}</div>
                      <div className="text-[10px] opacity-55">gesperrt</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] opacity-40 mt-3 leading-relaxed">
          Belohnungen sind kumulativ (ein höherer Rang enthält alle darunter). Experimentell · über Rang V öffnet sich später das Großmeister-System.
        </div>
      </div>
    </div>
  );
}
