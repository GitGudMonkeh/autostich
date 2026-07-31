// 🌿 Pflanze (Pflanze-Archetyp) — Feld-Panel (#211). „Der Garten, der sich selbst überwuchert": das Feld wächst
// (Setzling → grün/reif → ausgewachsen), und der GRÜN-ANTEIL ist der zentrale Zustand (Farbblock-Payoff, Schwellen).
// Gezeigt wird:
//   • Grün-Anteil des Feldes (grün + ausgewachsen / Gesamt) als Balken mit zwei Schwellenmarken — Ewiger Frühling
//     (EWIGER_FRUEHLING_FIELD) und Überwucherung (UEBERWUCHERUNG_FIELD, ab hier alle Farbblöcke +Faktor). Werte aus
//     dem Code (der pre-Rework-Issue nannte 33 %/66 % — der Ewiger-Frühling-Wert wurde inzwischen gebufft).
//   • Setzling (wachsend, noch nicht reif) · Grün (reif, Wert < Deckel) · Ausgewachsen (Wert = Deckel) als Zähler.
//   • Ausläufer (kolonisierte Gegnerkarten) als eigene, getrennte Zeile — der Griff ins Gegnerdeck (Ernte/Dornenkönig).
// Rein informativ, keine Engine-Kopplung (spiegelt state.deck/growth/colonized).
import { IndicatorPanel, CounterCell } from "./indicators/panelKit.jsx";
import { PLANT, PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { PLANT_VALUE_CAP, EWIGER_FRUEHLING_FIELD, UEBERWUCHERUNG_FIELD } from "../game/constants.js";
import { hasUeberwucherung, hasEwigerFruehling } from "../game/skills.js";

const SEED = "#9aa4a0"; // grauer Setzling (wachsend, noch nicht reif)

export function PlantBar({ active, deck = [], growth = {}, colonized = {}, skills = [] }) {
  if (!active) return null;
  const total = deck.length || 0;
  let setzling = 0, gruen = 0, ausgewachsen = 0;
  for (const c of deck) {
    if (c.green) {
      if (c.value >= PLANT_VALUE_CAP) ausgewachsen += 1; // ausgewachsen = reif am Wert-Deckel
      else gruen += 1;                                    // grün/reif, Wert wächst noch
    } else if ((growth[c.id] || 0) > 0) {
      setzling += 1;                                      // grauer Setzling (wächst, < Reife-Schwelle)
    }
  }
  const greenN = gruen + ausgewachsen;                    // Grün-Anteil zählt reif + ausgewachsen
  const pct = total ? (greenN / total) * 100 : 0;
  // #UI: Schwellen-Marken nur zeigen, wenn der zugehörige Skill gehalten wird — ohne Überwucherung greift der
  // Feld-Schwellen-Bonus gar nicht, ohne Ewiger Frühling gibt es die abgesenkte Schwelle nicht.
  const hasUeb = hasUeberwucherung(skills);               // SK_PLANT_14: Farbblöcke +Faktor ab Feld-Schwelle
  const hasEfr = hasEwigerFruehling(skills);              // SK_PLANT_L04 (Legendär): senkt die Schwelle auf 25 %
  // Schwellen aus dem Code (Anteil 0..1 → Prozent-Position im Balken).
  const efrPct = EWIGER_FRUEHLING_FIELD * 100;            // Ewiger Frühling: Überwucherung ab diesem Feld-Anteil
  const uebPct = UEBERWUCHERUNG_FIELD * 100;              // Überwucherung: Basis-Schwelle (Farbblöcke +Faktor)
  // Effektive Schwelle wie in der Engine (formations.js): Ewiger Frühling senkt sie auf 25 %. „Überwuchert" nur,
  // wenn die Mechanik (Überwucherung) auch gehalten wird.
  const overgrown = hasUeb && pct >= (hasEfr ? efrPct : uebPct) - 0.001;
  const colonizedN = Object.keys(colonized || {}).length;

  const Mark = ({ atPct, label }) => (
    <div className="absolute inset-y-0" style={{ left: `${atPct}%`, width: 2, background: "#ffffff66" }} title={label} />
  );

  return (
    <IndicatorPanel>
      {/* Grün-Anteil (Hauptelement): Balken bis 100 %, zwei Schwellenmarken. */}
      <div className="flex justify-between text-xs mb-1.5">
        <span className="opacity-60">🌿 Grün-Anteil des Feldes
          {overgrown && <span style={{ color: PLANT_FULL }}> · ÜBERWUCHERT</span>}
        </span>
        <span className="font-bold tabular-nums" style={{ color: overgrown ? PLANT_FULL : PLANT_RIPE }}>{greenN} / {total} · {Math.round(pct)} %</span>
      </div>
      <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}
        title="Anteil grüner (reifer + ausgewachsener) Karten am Feld.">
        <div className="absolute inset-y-0 left-0 transition-all"
          style={{ width: `${pct}%`, background: overgrown ? `linear-gradient(90deg, ${PLANT}, ${PLANT_FULL})` : PLANT,
                   boxShadow: overgrown ? `0 0 8px ${PLANT}` : undefined }} />
        {hasEfr && <Mark atPct={efrPct} label={`Ewiger Frühling — Überwucherung schon ab ${Math.round(efrPct)} % Feld grün`} />}
        {hasUeb && <Mark atPct={uebPct} label={`Überwucherung — ab ${Math.round(uebPct)} % alle Farbblöcke +Faktor`} />}
      </div>
      {(hasEfr || hasUeb) && (
        <div className="relative h-3 text-[10px] opacity-45 mt-1">
          {hasEfr && <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${efrPct}%` }}>Ew. Frühling</span>}
          {hasUeb && <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${uebPct}%` }}>Überwucherung</span>}
        </div>
      )}

      {/* Setzling · Grün · Ausgewachsen — der Reifezustand des Feldes. */}
      <div className="flex items-stretch gap-2 mt-2.5">
        <CounterCell icon={<span style={{ color: SEED, fontSize: 13, lineHeight: 1 }}>🌱</span>}
          value={setzling} label="Setzling" color={SEED} dim={setzling === 0}
          title="Wachsende, noch nicht reife Karten (grau, unter der Reife-Schwelle)." />
        <CounterCell icon={<span style={{ color: PLANT, fontSize: 13, lineHeight: 1, textShadow: `0 0 4px ${PLANT}` }}>🌿</span>}
          value={gruen} label="Grün" color={PLANT} glow={gruen > 0} dim={gruen === 0}
          title="Reife (grüne) Karten, Wert noch unter dem Deckel — zählen fürs Farbblock." />
        <CounterCell icon={<span style={{ color: PLANT_RIPE, fontSize: 13, lineHeight: 1, textShadow: `0 0 5px ${PLANT}` }}>🌳</span>}
          value={ausgewachsen} label="Ausgewachsen" color={PLANT_RIPE} glow={ausgewachsen > 0} dim={ausgewachsen === 0}
          title={`Voll ausgewachsen (Wert ${PLANT_VALUE_CAP}, Auto-Sieg; weiteres Wachstum zahlt als Überlauf-Score).`} />
      </div>

      {/* Ausläufer (kolonisierte Gegnerkarten) — eigene, getrennte Zeile: der Griff ins Gegnerdeck (Ernte/Dornenkönig). */}
      {colonizedN > 0 && (
        <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t" style={{ borderColor: `${PLANT}22` }}>
          <span className="opacity-55 shrink-0">Ausläufer · Kolonisiert</span>
          <span className="tabular-nums font-bold shrink-0" style={{ color: PLANT_RIPE }}>{colonizedN}</span>
          <span className="inline-flex flex-wrap gap-0.5 min-w-0">
            {Array.from({ length: Math.min(colonizedN, 12) }, (_, i) => (
              <span key={i} style={{ color: PLANT_RIPE, textShadow: `0 0 4px ${PLANT}88`, fontSize: 11, lineHeight: 1 }}>🌿</span>
            ))}
          </span>
        </div>
      )}
    </IndicatorPanel>
  );
}
