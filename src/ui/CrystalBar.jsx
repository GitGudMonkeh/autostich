// ❄️ Frost (Eis-Archetyp) — Masse-Panel (#210 · #269). Der Eis-Spine hat KEINEN Konsumenten → keine verbrauchbare
// Leiste. Gezeigt wird (#269 macht den Nutzen in Score sichtbar):
//   • „Schichten zahlen ~Z Score/Frost-Sieg" — die HUD-Summe des dreieckigen Schicht→Score-Motors (Σ layerScore je Frostkarte).
//   • Kristalline Masse gesamt (Σ aller Schichten) mit Fortschritt zur nächsten Stufe (je KRISTALLINE_STEP → +1 Wert, gedeckelt).
//   • Überlauf pro Sieg (Schichten ÜBER dem Deckel ICE_LAYER_MAX) — Nahrung der Eis-Legendären (Direkt-Score je Frost-Sieg).
// Der Gegner-Frostbiss (Vergletscherung, −Wert) bleibt eine eigene, getrennte ROTE Zeile.
import { IndicatorPanel, CounterCell } from "./indicators/panelKit.jsx";
import { KRISTALLINE_STEP, KRISTALLINE_MAX_VALUE, ICE_LAYER_MAX } from "../game/constants.js";
import { layerScore, kristallineBonus } from "../game/skills.js";

const ICE = "#5ec8f0";  // eigener Frost / Masse (blau)
const OVER = "#e6f7ff"; // Überlauf-Tiefe / Schwelle erreicht (hell)
const FOE = "#e0605a";  // feindlicher Frostbiss-Debuff (App-Rotton)
const grp = (n) => Math.round(n).toLocaleString("de-DE");

export function CrystalBar({ active, layers = {}, frostbite = {}, hasKristalline = false, yield: yieldScore = 0 }) {
  if (!active) return null;
  const vals = Object.values(layers || {});
  const totalMass = vals.reduce((t, v) => t + (v || 0), 0);
  const overflowTotal = vals.reduce((t, v) => t + Math.max(0, (v || 0) - ICE_LAYER_MAX), 0);
  // #269: der Schicht→Score-Motor — Summe des dreieckigen Direkt-Scores, den ALLE Frostkarten je Frost-Sieg zahlen.
  const scorePerWin = vals.reduce((t, v) => t + layerScore(v || 0), 0);
  // Kristalline Masse (skalierend): aktueller Wertbonus + Fortschritt zur nächsten Stufe.
  const kristBonus = kristallineBonus(totalMass);
  const capped = kristBonus >= KRISTALLINE_MAX_VALUE;
  const pct = capped ? 100 : Math.min(100, ((totalMass % KRISTALLINE_STEP) / KRISTALLINE_STEP) * 100);
  // Gegner-Frostbiss (Vergletscherung): {oppId: −Wert}.
  const foeVals = Object.values(frostbite || {});
  const enemyCount = foeVals.length;
  const enemyDebuff = foeVals.reduce((t, v) => t + (v || 0), 0);

  return (
    <IndicatorPanel>
      {/* #269: HUD-Summe — der Score-Wert der Schichten, prominent. */}
      {scorePerWin > 0 && (
        <div className="flex items-baseline justify-between text-xs mb-2">
          <span className="opacity-60">❄ Schichten zahlen</span>
          <span className="font-bold tabular-nums" style={{ color: OVER, textShadow: `0 0 6px ${ICE}` }}>~{grp(scorePerWin)} Score / Frost-Sieg</span>
        </div>
      )}
      {/* #270: kumulativer Frost-Ertrag — der Eigen-Score, den der Schicht-Motor über den Lauf schon eingespielt hat. */}
      {yieldScore > 0 && (
        <div className="flex items-baseline justify-between text-xs mb-2">
          <span className="opacity-60">❄ Frost-Ertrag</span>
          <span className="tabular-nums" style={{ color: ICE }} title="Eingespielter Frost-Eigen-Score über den ganzen Lauf (Schicht→Score-Motor).">~{grp(yieldScore)}</span>
        </div>
      )}
      <div className="flex items-stretch gap-3">
        {/* Kristalline Masse: Σ aller Schichten + Fortschritt zur nächsten +1-Wert-Stufe. */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between text-xs mb-1 gap-2">
            <span className="opacity-60 shrink-0">❄ Kristalline Masse</span>
            <span className="font-bold tabular-nums shrink-0" style={{ color: kristBonus > 0 ? OVER : ICE }}>Σ {totalMass}</span>
          </div>
          {hasKristalline && kristBonus > 0 && (
            <div className="text-[10px] mb-1 leading-snug" style={{ color: OVER }}>alle Frostkarten +{kristBonus}{capped ? " (max)" : ""}</div>
          )}
          <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}
            title={`Summe aller Schichten. Je ${KRISTALLINE_STEP} erhalten alle Frostkarten +1 Wert (Kristalline Masse, bis +${KRISTALLINE_MAX_VALUE}).`}>
            <div className="absolute inset-y-0 left-0 transition-all"
              style={{ width: `${pct}%`, background: kristBonus > 0 ? `linear-gradient(90deg, ${ICE}, ${OVER})` : ICE,
                       boxShadow: kristBonus > 0 ? `0 0 8px ${ICE}` : undefined }} />
          </div>
          <div className="text-[10px] opacity-45 mt-1">Kein Konsument — Schichten sind permanent.</div>
        </div>

        {/* Überlauf pro Sieg — Direkt-Score der Eis-Legendären (Schichten über dem Deckel). */}
        <div className="flex flex-col justify-center shrink-0">
          <CounterCell
            icon={<span style={{ color: OVER, fontSize: 12, lineHeight: 1, textShadow: `0 0 5px ${ICE}` }}>◆</span>}
            value={overflowTotal} label="Überlauf" color={ICE} glow={overflowTotal > 0} dim={overflowTotal === 0}
            title="Überlauf-Tiefe (Schichten über dem Deckel) — Nahrung der Eis-Legendären: Direkt-Score je Frost-Sieg." />
        </div>
      </div>

      {/* Gegner-Frostbiss (Vergletscherung) — eigene, getrennte ROTE Zeile. */}
      {enemyCount > 0 && (
        <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t" style={{ borderColor: "#e0605a22" }}>
          <span className="opacity-55 shrink-0">Gegner-Frostbiss</span>
          <span className="tabular-nums font-bold shrink-0" style={{ color: FOE }}>{enemyCount}</span>
          <span className="inline-flex flex-wrap gap-0.5 min-w-0">
            {Array.from({ length: Math.min(enemyCount, 12) }, (_, i) => (
              <span key={i} style={{ color: FOE, textShadow: `0 0 4px ${FOE}88`, fontSize: 12, lineHeight: 1 }}>◆</span>
            ))}
          </span>
          {enemyDebuff > 0 && <span className="opacity-55 shrink-0">· −{enemyDebuff} Wert</span>}
        </div>
      )}
    </IndicatorPanel>
  );
}
