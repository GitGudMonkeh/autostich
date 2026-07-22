import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};

/* Verdeckter Deck-Stapel (beide Seiten sichtbar, #3) + Rest-Zähler. */
function DeckStack({ remaining, label }) {
  const layers = Math.min(3, Math.max(1, remaining));
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative" style={{ width: 104, height: 144 }}>
        {Array.from({ length: layers }, (_, i) => (
          <div key={i} className="absolute" style={{ left: i * 3, top: i * 3 }}>
            <CardBack label="" />
          </div>
        ))}
      </div>
      <div className="text-[11px] opacity-55">{label}: {remaining}</div>
    </div>
  );
}

export function Battlefield({ lastTrick, remaining = 52, flipMs = 1000 }) {
  const t = lastTrick;
  const banner = t ? BANNER[t.result] : null;
  const win = t && (t.result === "win" || t.result === "win_tie");
  // Deal-Dauer an den Flip-Takt koppeln, damit die Logik die Animation nicht überholt (#3).
  const anim = clamp(flipMs * 0.5, 120, 450);

  return (
    <div className="rounded-xl p-6 overflow-hidden" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex items-center justify-between gap-3">
        <DeckStack remaining={remaining} label="Du" />

        <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="text-[11px] uppercase tracking-wide opacity-55">Du</div>
              {t ? (
                <div key={`p${t.trickNo}`} style={{ animation: `as-deal-left ${anim}ms ease-out` }}>
                  <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
                        stichBonus={t.pValue - t.pCard.value} glow={win ? "#5ab87a" : null} />
                </div>
              ) : <CardBack label="" />}
            </div>

            <div className="text-2xl opacity-30">vs</div>

            <div className="flex flex-col items-center gap-2">
              <div className="text-[11px] uppercase tracking-wide opacity-55">Gegner</div>
              {t ? (
                <div key={`o${t.trickNo}`} style={{ animation: `as-deal-right ${anim}ms ease-out` }}>
                  <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank}
                        glow={t.result === "loss" ? "#e0605a" : null} />
                </div>
              ) : <CardBack label="" />}
            </div>
          </div>

          <div className="h-8 flex items-center">
            {banner ? (
              <div className="flex items-center gap-3">
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

        <DeckStack remaining={remaining} label="Gegner" />
      </div>
    </div>
  );
}
