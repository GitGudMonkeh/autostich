import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};

/* Eine Seite: gespielte Karte MIT Nachziehstapel dahinter. Der Stapel ragt nur nach
   außen (dealFrom-Richtung) hervor; die opake Karte deckt ihn sonst ab — dadurch kein
   „Schatten" und ein Footprint von nur einer Kartenbreite je Seite (passt auch mobil). */
function Side({ label, remaining, dealFrom, children }) {
  const dir = dealFrom === "left" ? -1 : 1;
  const behind = Math.min(3, Math.max(0, remaining - 1)); // Karten im Stapel hinter der gespielten
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
  // Deal-Dauer an den Flip-Takt koppeln, damit die Logik die Animation nicht überholt (#3).
  const anim = clamp(flipMs * 0.5, 120, 450);

  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative" style={{ animation: `as-deal-left ${anim}ms ease-out` }}>
      <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
            stichBonus={t.pValue - t.pCard.value} glow={win ? "#5ab87a" : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={{ animation: `as-deal-right ${anim}ms ease-out` }}>
      <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank}
            glow={t.result === "loss" ? "#e0605a" : null} />
    </div>
  ) : <div className="relative"><CardBack label="" /></div>;

  return (
    <div className="rounded-xl p-6 overflow-hidden" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <Side label="Du" remaining={remaining} dealFrom="left">{playerCard}</Side>
        <div className="text-2xl opacity-30">vs</div>
        <Side label="Gegner" remaining={remaining} dealFrom="right">{oppCard}</Side>
      </div>

      <div className="h-8 mt-4 flex items-center justify-center">
        {banner ? (
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="text-lg font-bold tracking-wide" style={{ color: banner.color }}>{banner.text}</span>
            {t.gained > 0 && <span className="text-sm" style={{ color: "#d4a63a" }}>+{Number(t.gained.toFixed(2))} Score</span>}
            {t.healed > 0 && <span className="text-sm" style={{ color: "#5ab87a" }}>+{t.healed} Leben</span>}
            {t.result === "loss" && <span className="text-sm" style={{ color: "#e0605a" }}>−{t.dmg} Leben</span>}
          </div>
        ) : (
          <span className="opacity-40 text-sm">Bereit — starte den Autobattler</span>
        )}
      </div>
    </div>
  );
}
