// 🌿 Pflanze (Pflanze-Archetyp) — Feld-Panel (#211). „Der Garten, der sich selbst überwuchert": das Feld wächst
// (Setzling → grün/reif → ausgewachsen), und der GRÜN-ANTEIL ist der zentrale Zustand (Farbblock-Payoff, Schwellen).
// Gezeigt wird:
//   • Grün-Anteil des Feldes (grün + ausgewachsen / Gesamt) als Balken mit zwei Schwellenmarken — Ewiger Frühling
//     (EWIGER_FRUEHLING_FIELD) und Überwucherung (UEBERWUCHERUNG_FIELD, ab hier alle Farbblöcke +Faktor). Werte aus
//     dem Code (der pre-Rework-Issue nannte 33 %/66 % — der Ewiger-Frühling-Wert wurde inzwischen gebufft).
//   • #277 Reifezustand: „Nächste Reife" + Stufen-Histogramm (Setzling/Grün/Ausgewachsen mit Ø-Fortschritt) plus ein
//     einklappbarer „Reifende Karten"-Strip (pro Karte ein Mini-Balken, default zu). Der zweistufige Ring an der Karte (Card.jsx) trägt das Signal am Objekt.
//   • Ausläufer (kolonisierte Gegnerkarten) als eigene, getrennte Zeile — der Griff ins Gegnerdeck (Ernte/Dornenkönig).
// Rein informativ, keine Engine-Kopplung (spiegelt state.deck/growth/colonized).
import { IndicatorPanel, YieldMeter } from "./indicators/panelKit.jsx";
import { PLANT, PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { PLANT_VALUE_CAP, PLANT_GREEN_THRESHOLD, PLANT_GROWTH_SKILL_REF, EWIGER_FRUEHLING_FIELD, UEBERWUCHERUNG_FIELD, TRIM_STEP, TRIM_CAP } from "../game/constants.js";
import { hasUeberwucherung, hasEwigerFruehling, plantSkillCount } from "../game/skills.js";

const SEED = "#9aa4a0"; // grauer Setzling (wachsend, noch nicht reif)
const grp = (n) => Math.round(n).toLocaleString("de-DE");
const fmtG = (g) => String(Math.round((g || 0) * 10) / 10).replace(".", ","); // Wachstum mit einer Nachkommastelle

const BLOOM = "#e58fbf"; // Blüte (rosa) · Wurzel = PLANT (grün) · Ernte = PLANT_RIPE (hell)

export function PlantBar({ active, deck = [], growth = {}, colonized = {}, skills = [], growthTotal = 0,
                          rootScore = 0, bloomScore = 0, harvestScore = 0, trimCount = 0, options = {}, onOption }) {
  if (!active) return null;
  const trimMult = 1 + Math.min((trimCount || 0) * TRIM_STEP, TRIM_CAP); // #288 Trimmen: Wurzel-/Blüten-Multiplikator
  const total = deck.length || 0;
  let setzling = 0, gruen = 0, ausgewachsen = 0;
  // #277: pro-Karte-Reifegrad — Setzling→Grün (growth/Schwelle) bzw. Grün→Ausgewachsen (value/Deckel). „maturing" =
  // alle noch nicht ausgewachsenen, mit Fortschritt, sortiert nach Nähe zur nächsten Stufe (für den Detail-Strip A).
  const maturing = [];
  for (const c of deck) {
    if (c.green) {
      if (c.value >= PLANT_VALUE_CAP) { ausgewachsen += 1; }        // ausgewachsen = reif am Wert-Deckel
      else { gruen += 1; maturing.push({ id: c.id, stage: "green", pct: Math.min(1, c.value / PLANT_VALUE_CAP), label: `Grün · W${c.value}` }); }
    } else if ((growth[c.id] || 0) > 0) {
      setzling += 1;
      maturing.push({ id: c.id, stage: "seed", pct: Math.min(1, (growth[c.id] || 0) / PLANT_GREEN_THRESHOLD), remG: Math.max(0, PLANT_GREEN_THRESHOLD - (growth[c.id] || 0)), label: `Setzling ${fmtG(growth[c.id])}/${PLANT_GREEN_THRESHOLD}` });
    }
  }
  maturing.sort((a, b) => b.pct - a.pct);                 // am nächsten an der nächsten Stufe zuerst
  // Durchschnittlicher Fortschritt je Stufe (Balken im Histogramm C) + „Nächste Reife" (nächster Setzling → grün).
  const seedList = maturing.filter((m) => m.stage === "seed");
  const greenList = maturing.filter((m) => m.stage === "green");
  const avg = (arr) => (arr.length ? arr.reduce((t, m) => t + m.pct, 0) / arr.length : 0);
  const growInc = Math.min(1, PLANT_GROWTH_SKILL_REF > 0 ? plantSkillCount(skills) / PLANT_GROWTH_SKILL_REF : 1);
  const nextRipe = (seedList.length && growInc > 0)
    ? Math.max(1, Math.ceil(Math.min(...seedList.map((m) => m.remG)) / growInc))
    : null;
  // A einklappbar (default zu), Zustand über die Optionen gemerkt (wie StatusRail-Collapsibles).
  const stripCollapsed = options.collapsePlantMaturing ?? true;
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
      {/* #270.2 Eigen-Score auf einen Blick: nach Fantasie (Wurzel/Blüte/Ernte) + Gewachsen (Lauf-Zähler). */}
      <div className="mb-2">
        <YieldMeter title="🌿 Garten-Ertrag" accent={PLANT_RIPE} channels={[
          { label: "Wurzel", value: rootScore, color: PLANT },
          { label: "Blüte", value: bloomScore, color: BLOOM },
          { label: "Ernte", value: harvestScore, color: PLANT_RIPE },
        ]} />
        {growthTotal > 0 && (
          <div className="text-[10px] opacity-55 mt-1">🌱 Gewachsen <b className="tabular-nums" style={{ color: PLANT_RIPE }}>{grp(growthTotal)}</b> <span className="opacity-70">Wachstum gesamt</span></div>
        )}
        {/* #288 Trimmen: ersetzte Wachstums-Skills → Wurzel-/Blüten-Multiplikator. */}
        {trimCount > 0 && (
          <div className="text-[10px] opacity-70 mt-1" title="Trimmen (#288): jeder ersetzte Wachstums-Skill (Aussaat/Flugsamen/Setzlingsbeet/Zäher Halm) hebt dauerhaft den Wurzel- & Blüten-Score.">
            ✂ Getrimmt <b className="tabular-nums" style={{ color: PLANT_RIPE }}>{trimCount}×</b> <span className="opacity-70">· Wurzel/Blüte</span> <b className="tabular-nums" style={{ color: BLOOM }}>×{trimMult.toFixed(2).replace(".", ",")}</b>
          </div>
        )}
      </div>
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

      {/* #277 · C — Reifezustand: „Nächste Reife" + Stufen-Histogramm (Setzling/Grün/Ausgewachsen mit Fortschrittsbalken).
          Ersetzt die alte flache Zählerzeile — gleiche drei Zahlen, jetzt mit Durchschnitts-Fortschritt je Stufe. */}
      <div className="mt-2.5">
        {nextRipe != null && (
          <div className="flex items-baseline justify-between text-xs mb-1.5">
            <span className="opacity-60">🌿 Nächste Reife</span>
            <span className="font-bold tabular-nums" style={{ color: PLANT_RIPE }} title="Grobe Schätzung: nächster Setzling wird grün (aus Wachstumsrate × Restdistanz).">~{nextRipe} {nextRipe === 1 ? "Sieg" : "Siege"}</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: setzling, lab: "Setzling", col: SEED, bar: avg(seedList), title: "Wachsende, noch nicht reife Karten (Balken = Ø Fortschritt zur Reife)." },
            { n: gruen, lab: "Grün", col: PLANT, bar: avg(greenList), title: "Reife grüne Karten, Wert unter dem Deckel (Balken = Ø Fortschritt zum Wert-Deckel)." },
            { n: ausgewachsen, lab: "Ausgewachsen", col: PLANT_FULL, bar: ausgewachsen > 0 ? 1 : 0, title: `Voll ausgewachsen (Wert ${PLANT_VALUE_CAP}).` },
          ].map((s) => (
            <div key={s.lab} className="rounded-lg px-2 py-1.5 text-center" title={s.title}
              style={{ background: `${s.col}12`, border: `1px solid ${s.col}${s.n ? "44" : "22"}`, opacity: s.n ? 1 : 0.5 }}>
              <div className="text-base font-bold tabular-nums leading-none" style={{ color: s.col }}>{s.n}</div>
              <div className="text-[9px] uppercase tracking-wide opacity-55 mt-0.5">{s.lab}</div>
              <div className="rounded-full overflow-hidden mt-1" style={{ height: 4, background: "#26262e" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round(s.bar * 100)}%`, background: s.col }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* #277 · A — einklappbarer Detail-Strip: pro reifender Karte ein Mini-Balken (default zu, Zustand gemerkt). */}
      {maturing.length > 0 && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "#26262e" }}>
          <button type="button" onClick={() => onOption && onOption({ collapsePlantMaturing: !stripCollapsed })} data-sfx="none"
            className="w-full flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-50 hover:opacity-80" style={{ background: "transparent" }} aria-expanded={!stripCollapsed}>
            <span className="inline-block w-2 text-center" aria-hidden="true">{stripCollapsed ? "▸" : "▾"}</span>
            <span>Reifende Karten · {maturing.length}</span>
          </button>
          {!stripCollapsed && (
            <div className="flex flex-col gap-1 mt-1.5">
              {maturing.slice(0, 8).map((m) => {
                const col = m.stage === "seed" ? SEED : PLANT_RIPE;
                return (
                  <div key={m.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "16px 84px 1fr auto" }}>
                    <span className="text-[11px] text-center" style={{ color: col }}>{m.stage === "seed" ? "🌱" : "🌿"}</span>
                    <span className="text-[10px] opacity-60 tabular-nums whitespace-nowrap">{m.label}</span>
                    <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#26262e" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(m.pct * 100)}%`, background: m.stage === "seed" ? SEED : `linear-gradient(90deg, ${PLANT_RIPE}, ${PLANT_FULL})` }} />
                    </div>
                    <span className="text-[10px] tabular-nums" style={{ color: col }}>{Math.round(m.pct * 100)}%</span>
                  </div>
                );
              })}
              {maturing.length > 8 && <div className="text-[9px] opacity-40 mt-0.5">+{maturing.length - 8} weitere</div>}
            </div>
          )}
        </div>
      )}

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
