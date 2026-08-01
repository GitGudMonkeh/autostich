// ❄️ Frost (Eis-Archetyp) — Masse-Panel (#210). Der Eis-Spine („Gletscher: Architektur × Permanenz") hat KEINEN
// Konsumenten → also KEINE verbrauchbare Leiste. Gezeigt wird nur:
//   • Kristalline Masse gesamt (Σ aller Schichten) mit Schwellenmarke (KRISTALLINE_THRESHOLD): ab der Schwelle
//     erhalten alle Frostkarten +Wert (Kristalline Masse).
//   • Überlauf pro Sieg (Summe der Schichten ÜBER dem wirksamen Deckel ICE_LAYER_MAX) — die Überlauf-Tiefe ist die
//     Nahrung der Eis-Legendären (Direkt-Score je Frost-Sieg).
// Der Gegner-Frostbiss (Vergletscherung, −Wert) bleibt eine eigene, getrennte ROTE Zeile — „mein Aufbau" (blau) ist
// klar vom „feindlichen Debuff" (rot) getrennt. Rein informativ, keine Engine-Kopplung.
import { IndicatorPanel, CounterCell } from "./indicators/panelKit.jsx";
import { KRISTALLINE_THRESHOLD, KRISTALLINE_VALUE, ICE_LAYER_MAX } from "../game/constants.js";

const ICE = "#5ec8f0";  // eigener Frost / Masse (blau)
const OVER = "#e6f7ff"; // Überlauf-Tiefe / Schwelle erreicht (hell)
const FOE = "#e0605a";  // feindlicher Frostbiss-Debuff (App-Rotton)

export function CrystalBar({ active, layers = {}, frostbite = {}, hasKristalline = false }) {
  if (!active) return null;
  const vals = Object.values(layers || {});
  const totalMass = vals.reduce((t, v) => t + (v || 0), 0);
  const overflowTotal = vals.reduce((t, v) => t + Math.max(0, (v || 0) - ICE_LAYER_MAX), 0);
  const reached = totalMass >= KRISTALLINE_THRESHOLD;
  const pct = Math.min(100, (totalMass / KRISTALLINE_THRESHOLD) * 100);
  // Gegner-Frostbiss (Vergletscherung): {oppId: −Wert} → Anzahl markierter Gegnerkarten + Summe des Debuffs.
  const foeVals = Object.values(frostbite || {});
  const enemyCount = foeVals.length;
  const enemyDebuff = foeVals.reduce((t, v) => t + (v || 0), 0);

  return (
    <IndicatorPanel>
      <div className="flex items-stretch gap-3">
        {/* Kristalline Masse (Hauptelement): Σ aller Schichten, Balken bis zur Schwelle. */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="opacity-60">❄️ Kristalline Masse
              {reached && <span style={{ color: OVER }}> · SCHWELLE{hasKristalline ? ` · alle Frostkarten +${KRISTALLINE_VALUE}` : ""}</span>}
            </span>
            <span className="font-bold tabular-nums" style={{ color: reached ? OVER : ICE }}>Σ {totalMass} / {KRISTALLINE_THRESHOLD}</span>
          </div>
          <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}
            title={`Summe aller Schichten. Ab ${KRISTALLINE_THRESHOLD} erhalten alle Frostkarten +${KRISTALLINE_VALUE} Wert (Kristalline Masse).`}>
            <div className="absolute inset-y-0 left-0 transition-all"
              style={{ width: `${pct}%`, background: reached ? `linear-gradient(90deg, ${ICE}, ${OVER})` : ICE,
                       boxShadow: reached ? `0 0 8px ${ICE}` : undefined }} />
            {/* Schwellenmarke am rechten Balkenende (= KRISTALLINE_THRESHOLD). */}
            <div className="absolute inset-y-0 right-0" style={{ width: 2, background: "#ffffff66" }} title={`Schwelle ${KRISTALLINE_THRESHOLD}`} />
          </div>
          <div className="text-[10px] opacity-45 mt-1">Kein Konsument — Schichten sind permanent.</div>
        </div>

        {/* Überlauf pro Sieg — Direkt-Score der Eis-Legendären (Schichten über dem Deckel). */}
        <div className="flex flex-col justify-center shrink-0">
          <CounterCell
            icon={<span style={{ color: OVER, fontSize: 12, lineHeight: 1, textShadow: `0 0 5px ${ICE}` }}>◆</span>}
            value={overflowTotal} label="Überlauf" color={ICE} glow={overflowTotal > 0} dim={overflowTotal === 0}
            title="Überlauf-Tiefe (Schichten über dem wirksamen Deckel) — Nahrung der Eis-Legendären: Direkt-Score je Frost-Sieg." />
        </div>
      </div>

      {/* Gegner-Frostbiss (Vergletscherung) — eigene, getrennte ROTE Zeile. Nur wenn aktuell Gegnerkarten markiert sind. */}
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
