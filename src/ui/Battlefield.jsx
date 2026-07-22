import { useState, useEffect } from "react";
import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};
const CRIT_COLOR = "#e879f9";

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

export function Battlefield({ lastTrick, remaining = 52, flipMs = 1000 }) {
  const reduced = usePrefersReducedMotion();
  const t = lastTrick;
  const win = t && (t.result === "win" || t.result === "win_tie");
  const lost = t && t.result === "loss";
  const isCrit = !!(t && t.isCrit);
  const banner = t ? (isCrit ? { text: "GEWONNEN · KRITISCH", color: CRIT_COLOR } : BANNER[t.result]) : null;

  // Effektdauern an den Flip-Takt koppeln; unter reduzierter Bewegung Animationen weglassen
  // (Element bleibt statisch sichtbar statt zu Ende-Opacity 0 zu springen).
  const anim = clamp(flipMs * 0.5, 120, 450);
  const pop = clamp(flipMs * 0.35, 140, 320);
  const fx = (a) => (reduced ? undefined : a);

  const dealStyle = (dealName, isWinner) => ({
    animation: isWinner
      ? `${dealName} ${anim}ms ease-out, ${isCrit ? "as-pop-crit" : "as-pop"} ${pop}ms ease-out ${anim}ms`
      : `${dealName} ${anim}ms ease-out`,
  });

  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative" style={dealStyle("as-deal-left", win)}>
      <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
            stichBonus={t.pValue - t.pCard.value} glow={win ? (isCrit ? CRIT_COLOR : "#5ab87a") : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={dealStyle("as-deal-right", lost)}>
      <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank} glow={lost ? "#e0605a" : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const critMultStr = t ? (Number.isInteger(t.critMultiplier) ? t.critMultiplier : Math.round(t.critMultiplier * 100) / 100) : 2;

  return (
    <div className="rounded-xl p-6 overflow-hidden" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="relative flex items-center justify-center gap-4 sm:gap-8">
        {/* KRITISCH-Text — bei reduzierter Bewegung statisch „KRITISCH ×2". */}
        {isCrit && (
          <div key={`krit${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: "50%", top: 0, fontSize: 26, color: CRIT_COLOR, textShadow: `0 0 12px ${CRIT_COLOR}aa`,
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx(`as-krit ${clamp(flipMs * 0.8, 400, 900)}ms ease-out`) }}>
            KRITISCH{reduced ? ` ×${critMultStr}` : "!"}
          </div>
        )}

        <Side label="Du" remaining={remaining} dealFrom="left">{playerCard}</Side>

        <div className="relative">
          <div className="text-2xl opacity-30">vs</div>
          {banner && (
            <div key={`ring${t.trickNo}`} className="absolute rounded-full pointer-events-none" style={{
              left: "50%", top: "50%", width: 40, height: 40, borderWidth: 2, borderStyle: "solid", borderColor: banner.color,
              animation: fx(`as-impact ${clamp(flipMs * 0.45, 160, 420)}ms ease-out`),
            }} />
          )}
          {isCrit && (
            <div key={`ring2${t.trickNo}`} className="absolute rounded-full pointer-events-none" style={{
              left: "50%", top: "50%", width: 58, height: 58, borderWidth: 2, borderStyle: "solid", borderColor: CRIT_COLOR,
              animation: fx(`as-impact ${clamp(flipMs * 0.5, 200, 480)}ms ease-out`),
            }} />
          )}
        </div>

        <Side label="Gegner" remaining={remaining} dealFrom="right">{oppCard}</Side>

        {/* Aufsteigende Zahlen: Gewinn links, Schaden rechts. Bei Crit zeigt der Score-Float
            direkt den vollen verdoppelten Score (keine zwei Zahlen). */}
        {win && (t.gained > 0 || t.healed > 0) && (
          <div key={`gain${t.trickNo}`} className="pointer-events-none absolute text-3xl font-bold whitespace-nowrap"
            style={{ left: 2, top: "40%", animation: fx(`as-float ${clamp(flipMs * 0.7, 320, 700)}ms ease-out`) }}>
            {t.gained > 0 && <span style={{ color: isCrit ? CRIT_COLOR : "#d4a63a" }}>+{Math.round(t.gained * 10) / 10}</span>}
            {t.healed > 0 && <span style={{ color: "#5ab87a" }}> +{t.healed}♥</span>}
          </div>
        )}
        {lost && t.dmg > 0 && (
          <div key={`dmg${t.trickNo}`} className="pointer-events-none absolute text-3xl font-bold whitespace-nowrap"
            style={{ right: 2, top: "40%", color: "#e0605a", animation: fx(`as-float ${clamp(flipMs * 0.7, 320, 700)}ms ease-out`) }}>
            −{t.dmg}♥
          </div>
        )}
      </div>

      <div className="h-8 mt-4 flex items-center justify-center">
        {banner ? (
          <span className="text-lg font-bold tracking-wide" style={{ color: banner.color }}>{banner.text}</span>
        ) : (
          <span className="opacity-40 text-sm">Bereit — starte den Autobattler</span>
        )}
      </div>
    </div>
  );
}
