import { useState } from "react";
import { CHALLENGES, challengeStakes } from "../game/challenges.js";
import { phaseCard, PhaseHairline, PHASE_ACCENTS, ActionBar, ActionButton } from "./modalStyle.jsx"; // #362 einheitliche Aktionsleiste oben
import { useEscape } from "./useEscape.js"; // #350: Esc/Zurück schließt (Konsistenz mit den anderen Overlays)

/* #301 Challenge-Auswahl-Fenster (vor Run-Start). Die drei Modifikatoren werden KUMULATIV & nacheinander zugeschaltet
   (erst C1, dann C1+C2, dann C1+C2+C3 — ein späterer setzt die früheren voraus). Immer sichtbar: die laufende Summe des
   maximal möglichen Gewinns (alle Ziele erfüllt) und des maximal möglichen Verlusts (alle verfehlt). „Starten" beginnt
   den Lauf mit den aktiven Modifikatoren. Gate (treeComplete) sitzt am aufrufenden Button (StartScreen). */
const A = PHASE_ACCENTS.red;
const mio = (n) => `${Math.round(n / 1_000_000)} Mio`;

export function ChallengeModal({ onConfirm, onClose }) {
  useEscape(onClose); // #350: Escape schließt das Fenster
  const [level, setLevel] = useState(0); // 0..3 = „C1..CN aktiv"
  const stakes = challengeStakes(level);
  const start = () => onConfirm(CHALLENGES.slice(0, level).map((c) => c.id));

  return (
    <div className="fixed inset-0 z-[60] overlay-root flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(6,5,10,.72)" }}
      onClick={onClose} role="dialog" aria-modal="true" aria-label="Challenges">
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={phaseCard(A)} onClick={(e) => e.stopPropagation()}>
        <PhaseHairline />
        <div className="p-5">
          <div className="flex items-center mb-1">
            <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: A.c }}>
              <span aria-hidden="true">⚔</span> Challenges
            </h2>
          </div>
          {/* #362 Aktionsleiste OBEN — Abbrechen (ersetzt das ✕) links, Starten rechts. */}
          <ActionBar pad={5}>
            <ActionButton kind="secondary" flex onClick={onClose}>Abbrechen</ActionButton>
            <ActionButton kind="primary" flex disabled={level === 0} onClick={start}>⚔ Starten</ActionButton>
          </ActionBar>
          <p className="text-[12px] mb-3 leading-snug" style={{ color: "#9a97ab" }}>
            Schalte Modifikatoren nacheinander zu. Jeder hat ein <b style={{ color: "#cfccda" }}>Score-Ziel</b> (50 / 75 / 100 Mio):
            <b style={{ color: "#8fe0a8" }}> erreichst du es, gewinnst du Deck-Punkte</b> — <b style={{ color: "#e79a9a" }}>verfehlst du es, verlierst du Deck-Punkte</b>.
            Die normalen Lauf-Deck-Punkte kommen zusätzlich; das Lauf-Netto fällt nie unter 0.
          </p>

          <div className="flex flex-col gap-2">
            {CHALLENGES.map((c, i) => {
              const order = i + 1;
              const active = level >= order;
              const isNext = order === level + 1;      // als nächstes zuschaltbar
              const isTop = order === level;            // oberster aktiver → Klick schaltet ab
              const clickable = isNext || isTop;
              const toggle = () => { if (isTop) setLevel(order - 1); else if (isNext) setLevel(order); };
              return (
                <button key={c.id} onClick={toggle} disabled={!clickable} aria-pressed={active}
                  className="text-left rounded-lg px-3 py-2.5 transition-all disabled:cursor-not-allowed"
                  style={{
                    background: active ? "rgba(224,85,85,.10)" : "#141019",
                    border: `1px solid ${active ? "rgba(224,85,85,.55)" : "#2a2836"}`,
                    opacity: clickable || active ? 1 : 0.45,
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[14px] flex items-center gap-2" style={{ color: active ? "#ff9a9a" : "#cfccda" }}>
                      <span className="inline-grid place-items-center w-4 h-4 rounded-sm text-[10px] font-black"
                        style={{ background: active ? A.c : "#2a2836", color: active ? "#180a0a" : "#6d6a80" }}>{active ? "✓" : order}</span>
                      C{order} · {c.name}
                    </span>
                    <span className="font-mono text-[12px] font-bold whitespace-nowrap" style={{ color: active ? "#ffd0d0" : "#6d6a80" }}>
                      Ziel &gt; {mio(c.target)}
                    </span>
                  </div>
                  {/* #: Beschreibung UND Belohnung NICHT mehr in einer Zeile (die whitespace-nowrap-Belohnung quetschte
                      den Text auf dem Handy in eine 2–3-Wort-Spalte). Jetzt untereinander: Beschreibung volle Breite,
                      Belohnung eigene Zeile rechts. */}
                  <p className="mt-1 text-[11px] leading-snug" style={{ color: "#8b8898" }}>{c.desc}</p>
                  <div className="mt-1.5 font-mono text-[11px] font-bold text-right">
                    <span style={{ color: "#5ab87a" }}>erreicht +{c.gain}</span>
                    <span style={{ color: "#6d6a80" }}> · </span>
                    <span style={{ color: "#e07a7a" }}>verfehlt −{c.loss}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Laufende Summe: max. Gewinn / max. Verlust der aktiven Modifikatoren. */}
          <div className="mt-3 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-[12px] font-bold"
            style={{ background: "#141019", border: "1px solid #2a2836" }}>
            <span style={{ color: "#9a97ab" }}>Einsatz ({level}/3)</span>
            <span className="font-mono text-right leading-tight">
              <span style={{ color: "#5ab87a" }}>max. Gewinn +{stakes.maxGain}</span>
              <span style={{ color: "#6d6a80" }}> · </span>
              <span style={{ color: "#e07a7a" }}>max. Verlust −{stakes.maxLoss}</span>
              <span style={{ color: "#9a97ab" }}> Deck-Punkte</span>
            </span>
          </div>

          {level === 0 && <p className="mt-3 text-center text-[11px]" style={{ color: "#6d6a80" }}>Mindestens C1 zuschalten, um zu starten.</p>}
        </div>
      </div>
    </div>
  );
}
