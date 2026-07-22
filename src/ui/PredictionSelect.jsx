import { useState } from "react";
import { PREDICTION_MIN, PREDICTION_MAX } from "../game/constants.js";

/* Ansage-Overlay (#36): pausiert das Spiel vor jedem neuen Deck-Durchlauf. Zeigt das Ergebnis des
   zuletzt abgeschlossenen Durchlaufs (falls vorhanden) + Eingabe [−] Zahl [+] / Slider. */
const clampPred = (n) => Math.max(PREDICTION_MIN, Math.min(PREDICTION_MAX, Math.round(n)));
const fmt = (n) => n.toLocaleString("de-DE");

export function PredictionSelect({ state = {}, onSubmit }) {
  const { cycleWins = 0, lastPrediction = null, lastPredictionResult: r = null } = state;
  const [value, setValue] = useState(() => clampPred(cycleWins)); // Default = Siege des letzten Durchlaufs

  const bannerText = r && (r.tier === "exact" ? "EXAKT!" : r.difference === 1 ? "SEHR KNAPP!" : r.difference === 2 ? "KNAPP!" : "VERFEHLT");
  const bannerColor = r && (r.tier === "exact" ? "#5ab87a" : r.tier === "near" ? "#d4a63a" : "#8a8a92");

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#181820", border: "1px solid #33333e" }}>
        {/* Ergebnis des zuletzt abgeschlossenen Durchlaufs (ab dem 2. Durchlauf). */}
        {r && (
          <div className="rounded-lg p-3 mb-4 text-center" style={{ background: `${bannerColor}1f`, border: `1px solid ${bannerColor}66` }}>
            <div className="text-xl font-extrabold tracking-wide" style={{ color: bannerColor }}>{bannerText}</div>
            <div className="text-xs opacity-75 mt-1">
              Ansage {r.prediction} / Gewonnen {r.actualWins} · Rundenscore ×{r.multiplier.toFixed(2).replace(".", ",")}
            </div>
            <div className="text-sm font-bold mt-0.5" style={{ color: r.bonusScore > 0 ? "#d4a63a" : "#8a8a92" }}>
              {r.bonusScore > 0 ? `+${fmt(r.bonusScore)} Bonus` : "Kein Bonus"}
            </div>
          </div>
        )}

        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Deine Ansage</div>
          <h2 className="text-lg font-bold mt-1 leading-snug">Wie viele der nächsten {PREDICTION_MAX} Stiche gewinnst du?</h2>
        </div>

        {/* Eingabe: [−] große Zahl [+] + nativer Range-Slider. */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setValue((v) => clampPred(v - 1))} aria-label="weniger"
            className="w-12 h-12 rounded-lg text-2xl font-bold transition-all hover:-translate-y-0.5"
            style={{ background: "#20202a", border: "1px solid #30303a" }}>−</button>
          <div className="text-6xl font-bold tabular-nums w-24 text-center" style={{ color: "#d4a63a" }}>{value}</div>
          <button onClick={() => setValue((v) => clampPred(v + 1))} aria-label="mehr"
            className="w-12 h-12 rounded-lg text-2xl font-bold transition-all hover:-translate-y-0.5"
            style={{ background: "#20202a", border: "1px solid #30303a" }}>+</button>
        </div>
        <input type="range" min={PREDICTION_MIN} max={PREDICTION_MAX} value={value}
          onChange={(e) => setValue(clampPred(+e.target.value))} className="w-full mt-4" style={{ accentColor: "#8a7de0" }} />

        {/* Referenz aus dem letzten Durchlauf. */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mt-3 opacity-70">
          <span>Letzter Durchlauf: <b style={{ color: "#5ab87a" }}>{cycleWins}</b> Siege</span>
          {lastPrediction != null && <span>Letzte Ansage: <b>{lastPrediction}</b></span>}
        </div>

        <button onClick={() => onSubmit(clampPred(value))}
          className="w-full mt-5 py-2.5 rounded-lg font-bold transition-all"
          style={{ background: "#5ab87a", color: "#141419" }}>
          Ansage abgeben
        </button>
      </div>
    </div>
  );
}
