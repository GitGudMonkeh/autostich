import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};

/* Eine Seite: gespielte Karte MIT Nachziehstapel dahinter. Der Stapel ragt nur nach
   außen (dealFrom-Richtung) hervor; die opake Karte deckt ihn sonst ab. */
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
  const t = lastTrick;
  const banner = t ? BANNER[t.result] : null;
  const win = t && (t.result === "win" || t.result === "win_tie");
  const lost = t && t.result === "loss";
  // Alle Effektdauern an den Flip-Takt koppeln, damit die Logik sie nicht überholt (#3/#15).
  const anim = clamp(flipMs * 0.5, 120, 450);
  const pop = clamp(flipMs * 0.35, 140, 320);

  // Deal-Animation (+ Gewinner-„Pop" nach dem Eintreffen).
  const dealStyle = (dealName, isWinner) => ({
    animation: isWinner ? `${dealName} ${anim}ms ease-out, as-pop ${pop}ms ease-out ${anim}ms` : `${dealName} ${anim}ms ease-out`,
  });

  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative" style={dealStyle("as-deal-left", win)}>
      <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
            stichBonus={t.pValue - t.pCard.value} glow={win ? "#5ab87a" : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={dealStyle("as-deal-right", lost)}>
      <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank}
            glow={lost ? "#e0605a" : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const hasDelta = t && (t.gained > 0 || t.healed > 0 || (lost && t.dmg > 0));

  return (
    <div className="rounded-xl p-6 overflow-hidden" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="relative flex items-center justify-center gap-4 sm:gap-8">
        <Side label="Du" remaining={remaining} dealFrom="left">{playerCard}</Side>
        <div className="text-2xl opacity-30">vs</div>
        <Side label="Gegner" remaining={remaining} dealFrom="right">{oppCard}</Side>

        {/* Impact-Flash + aufsteigende Zahlen (#15), pro Stich neu montiert. */}
        {banner && (
          <div key={`fx${t.trickNo}`} className="pointer-events-none absolute inset-0">
            <div className="absolute rounded-full" style={{
              left: "50%", top: "50%", width: 84, height: 84, borderWidth: 3, borderStyle: "solid", borderColor: banner.color,
              animation: `as-impact ${clamp(flipMs * 0.45, 160, 420)}ms ease-out`,
            }} />
            {hasDelta && (
              <div className="absolute text-sm font-bold whitespace-nowrap" style={{
                left: "50%", top: "30%", animation: `as-float ${clamp(flipMs * 0.7, 320, 700)}ms ease-out`,
              }}>
                {t.gained > 0 && <span style={{ color: "#d4a63a" }}>+{Number(t.gained.toFixed(2))} </span>}
                {t.healed > 0 && <span style={{ color: "#5ab87a" }}>+{t.healed}♥ </span>}
                {lost && t.dmg > 0 && <span style={{ color: "#e0605a" }}>−{t.dmg}♥</span>}
              </div>
            )}
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
