import { useState, useEffect } from "react";
import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";
import { TRICKS_PER_CYCLE } from "../game/constants.js";
import swordicon from "../assets/icons/swordicon.png"; // (#42) Vite bundelt & hasht -> subpfad-sicher

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};
const CRIT_COLOR = "#e879f9";
const JACKPOT_COLOR = "#d4a63a"; // L5 „Jackpot" (#33): Gold statt Crit-Violett

// Respektiert die OS-Einstellung „reduzierte Bewegung" (#15/#19).
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/* Eine Seite: gespielte Karte MIT Nachziehstapel dahinter (ragt nur nach außen). */
function Side({ label, remaining, dealFrom, children }) {
  const dir = dealFrom === "left" ? -1 : 1;
  const behind = Math.min(3, Math.max(0, remaining - 1));
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="text-[11px] uppercase tracking-wide opacity-55">{label}</div>
      <div className="relative" style={{ width: 104, height: 144 }}>
        {Array.from({ length: behind }, (_, i) => (
          <div key={i} className="absolute top-0" style={{ left: dir * (i + 1) * 3 }}>
            <CardBack label="" />
          </div>
        ))}
        {children}
      </div>
      <div className="text-[11px] opacity-55">Deck: {remaining}</div>
    </div>
  );
}

export function Battlefield({ lastTrick, remaining = TRICKS_PER_CYCLE, flipMs = 1000, lossNotice = null }) {
  const reduced = usePrefersReducedMotion();
  const t = lastTrick;
  const win = t && (t.result === "win" || t.result === "win_tie");
  const lost = t && t.result === "loss";
  const isCrit = !!(t && t.isCrit);
  const jackpot = !!(t && t.jackpot); // L5: Crit ×4 (#33)
  const critColor = jackpot ? JACKPOT_COLOR : CRIT_COLOR;
  const banner = t
    ? (jackpot ? { text: "GEWONNEN · JACKPOT ×4", color: JACKPOT_COLOR }
       : isCrit ? { text: "GEWONNEN · KRITISCH", color: CRIT_COLOR }
       : BANNER[t.result])
    : null;

  // Effektdauern an den Flip-Takt koppeln; unter reduzierter Bewegung Animationen weglassen
  // (Element bleibt statisch sichtbar statt zu Ende-Opacity 0 zu springen).
  const anim = clamp(flipMs * 0.5, 120, 450);
  const fx = (a) => (reduced ? undefined : a);

  // Karten „dealen" nur noch rein — der zusätzliche Pop-Bounce der Gewinnerkarte ist
  // raus (Wunsch: ruhiger). Der Score-/Schaden-Float über der Karte bleibt erhalten.
  const dealStyle = (dealName) => ({ animation: `${dealName} ${anim}ms ease-out` });

  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative" style={dealStyle("as-deal-left")}>
      <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
            stichBonus={t.pValue - t.pCard.value} glow={win ? (isCrit ? critColor : "#5ab87a") : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={dealStyle("as-deal-right")}>
      <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank} glow={lost ? "#e0605a" : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const critMultStr = t ? (Number.isInteger(t.critMultiplier) ? t.critMultiplier : Math.round(t.critMultiplier * 100) / 100) : 2;

  // D2-Kombo (#31): ab ×1,5 (Serie ≥5) bei jedem Sieg den eskalierenden Wert einblenden.
  // Quelle ist der in der Engine berechnete t.comboMult → identisch zum tatsächlichen D2-Faktor (kein Drift).
  const showCombo = win && t && t.comboMult >= 1.5;
  const comboStr = t ? t.comboMult.toFixed(1).replace(".", ",") : "";

  return (
    <div className="rounded-xl p-6 overflow-hidden as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="relative flex items-center justify-center gap-4 sm:gap-8">
        {/* KRITISCH-/JACKPOT-Text (#33) — bei reduzierter Bewegung statisch „… ×N". */}
        {isCrit && (
          <div key={`krit${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: "50%", top: 0, fontSize: 26, color: critColor, textShadow: `0 0 12px ${critColor}aa`,
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx(`as-krit ${clamp(flipMs * 0.8, 400, 900)}ms ease-out`) }}>
            {jackpot ? "JACKPOT" : "KRITISCH"}{reduced ? ` ×${critMultStr}` : "!"}
          </div>
        )}

        {/* Anti-Infinity (#32): einmaliger Hinweis beim Stufenwechsel der Niederlagenkosten —
            non-blocking, selbst-verschwindend; reduced-motion → statisch (App räumt nach 2 s ab). */}
        {lossNotice && (
          <div key={`lossnotice-${lossNotice.tier}`} className="pointer-events-none absolute left-1/2 top-0 font-bold whitespace-nowrap z-20"
            style={{ fontSize: 14, color: "#e0605a", textShadow: "0 0 10px #e0605a99",
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx("as-notice 2000ms ease-out forwards") }}>
            ⚠ Niederlagen kosten jetzt {lossNotice.cost}♥
          </div>
        )}

        <Side label="Du" remaining={remaining} dealFrom="left">{playerCard}</Side>

        <img src={swordicon} alt="vs" width={46} height={46} draggable="false"
             className="crt-vs-icon shrink-0 select-none" style={{ imageRendering: "pixelated" }} />

        <Side label="Gegner" remaining={remaining} dealFrom="right">{oppCard}</Side>

        {/* Aufsteigende Zahlen: Gewinn links, Schaden rechts. Bei Crit zeigt der Score-Float
            direkt den vollen verdoppelten Score (keine zwei Zahlen). */}
        {win && (t.gained > 0 || t.healed > 0) && (
          <div key={`gain${t.trickNo}`} className="pointer-events-none absolute text-3xl font-bold whitespace-nowrap"
            style={{ left: 2, top: "40%", animation: fx(`as-float ${clamp(flipMs * 0.7, 320, 700)}ms ease-out`) }}>
            {t.gained > 0 && <span style={{ color: isCrit ? critColor : "#d4a63a" }}>+{Math.round(t.gained * 10) / 10}</span>}
            {t.healed > 0 && <span style={{ color: "#5ab87a" }}> +{t.healed}♥</span>}
          </div>
        )}
        {lost && t.dmg > 0 && (
          <div key={`dmg${t.trickNo}`} className="pointer-events-none absolute text-3xl font-bold whitespace-nowrap"
            style={{ right: 2, top: "40%", color: "#e0605a", animation: fx(`as-float ${clamp(flipMs * 0.7, 320, 700)}ms ease-out`) }}>
            −{t.dmg}♥
          </div>
        )}
        {/* Eskalierende Kombo-Anzeige (#31): eigene Bahn unten links, kollidiert nicht mit dem
            Gewinn-Float (40 %). Unter reduzierter Bewegung statisch (kein Float), wie beim Crit. */}
        {showCombo && (
          <div key={`combo${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: 2, top: "62%", fontSize: 20, color: "#e0605a", textShadow: "0 0 10px #e0605a88",
                     animation: fx(`as-combo ${clamp(flipMs * 0.85, 360, 820)}ms ease-out`) }}>
            KOMBO ×{comboStr}
          </div>
        )}
      </div>

      <div className="h-8 mt-4 flex items-center justify-center">
        {banner ? (
          <span className="text-lg font-bold tracking-wide font-pixel as-banner" style={{ color: banner.color }}>{banner.text}</span>
        ) : (
          <span className="opacity-40 text-sm">Bereit — starte den Autobattler</span>
        )}
      </div>
    </div>
  );
}
