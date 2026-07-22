import { Card, CardBack } from "./Card.jsx";

const BANNER = {
  win:     { text: "GEWONNEN",            color: "#5ab87a" },
  win_tie: { text: "GLEICHSTAND → SIEG",  color: "#8a7de0" },
  loss:    { text: "VERLOREN",            color: "#e0605a" },
  tie:     { text: "GLEICHSTAND",         color: "#8a8a92" },
};

export function Battlefield({ lastTrick }) {
  const t = lastTrick;
  const banner = t ? BANNER[t.result] : null;
  const win = t && (t.result === "win" || t.result === "win_tie");

  // Wert-Boni dieses Stichs (effektiv vs. Kartenbasis) sichtbar machen.
  const pBase = t ? t.pCard.value : null;

  return (
    <div className="rounded-xl p-6 flex flex-col items-center gap-5" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] uppercase tracking-wide opacity-55">Du</div>
          {t ? <Card suit={t.pCard.suit} value={t.pValue} base={pBase} glow={win ? "#5ab87a" : null} />
             : <CardBack />}
        </div>

        <div className="flex flex-col items-center">
          <div className="text-2xl opacity-30">vs</div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] uppercase tracking-wide opacity-55">Gegner</div>
          {t ? <Card suit={t.oCard.suit} value={t.oValue} glow={t.result === "loss" ? "#e0605a" : null} />
             : <CardBack />}
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
  );
}
