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
import { FactionShell, PanelSkills, YieldMeter } from "./indicators/panelKit.jsx";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { PLANT, PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { PLANT_VALUE_CAP, PLANT_GREEN_THRESHOLD, PLANT_GROWTH_SKILL_REF, EWIGER_FRUEHLING_FIELD, UEBERWUCHERUNG_FIELD, TRIM_STEP, TRIM_CAP,
         WURZELSCHLAG_PER_GROWTH, SKILL_SLOTS, MUTTERBAUM_DIRECT, MUTTERBAUM_OVERFLOW_CAP, WELTENBAUM_DIRECT, WELTENBAUM_OVERFLOW_CAP } from "../game/constants.js";
import { hasUeberwucherung, hasEwigerFruehling, hasMutterbaum, hasWeltenbaum, plantSkillCount } from "../game/skills.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache
import { archetypeLabel, trimmableNames } from "../i18n/labels.js";

const SEED = "#9aa4a0"; // grauer Setzling (wachsend, noch nicht reif)
// #sprache: Trennzeichen aus dem Katalog (de „1.234,5" · en „1,234.5"), kein festes de-DE mehr.
const grp = (n) => fmtNum(Math.round(n));
const fmtG = (g) => fmtNum(Math.round((g || 0) * 10) / 10); // Wachstum mit einer Nachkommastelle

const BLOOM = "#e58fbf"; // Blüte (rosa) · Wurzel = PLANT (grün) · Ernte = PLANT_RIPE (hell)

export function PlantBar({ active, deck = [], growth = {}, colonized = {}, skills = [], growthTotal = 0, showSkills = false,
                          rootScore = 0, bloomScore = 0, harvestScore = 0, trimCount = 0, options = {}, onOption, manyActive = false }) {
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
      else { gruen += 1; maturing.push({ id: c.id, stage: "green", pct: Math.min(1, c.value / PLANT_VALUE_CAP), label: t("bar.plant.strip.green", { value: c.value }) }); }
    } else if ((growth[c.id] || 0) > 0) {
      setzling += 1;
      maturing.push({ id: c.id, stage: "seed", pct: Math.min(1, (growth[c.id] || 0) / PLANT_GREEN_THRESHOLD), remG: Math.max(0, PLANT_GREEN_THRESHOLD - (growth[c.id] || 0)), label: t("bar.plant.strip.seed", { growth: fmtG(growth[c.id]), need: PLANT_GREEN_THRESHOLD }) });
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
  // Legendär-Live-Anzeigen (Mutterbaum/Weltenbaum): Überlauf-Wachstum = Wachstum ÜBER dem, was Wurzelschlag zum Wert-Deckel
  // braucht (= „alter Wald"). Höchster/tiefster Baum + Wald-Summe, jeweils mit dem Score je grünem Sieg — wie die Engine.
  const hasMb = hasMutterbaum(skills), hasWb = hasWeltenbaum(skills);
  let sumOv = 0, maxOv = 0, deepTree = null, tallTree = null;
  if (hasMb || hasWb) {
    for (const c of deck) if (c.green) {
      if (!tallTree || c.value > tallTree.value || (c.value === tallTree.value && (growth[c.id] || 0) > (growth[tallTree.id] || 0))) tallTree = c;
      const need = Math.max(0, PLANT_VALUE_CAP - c.value) * WURZELSCHLAG_PER_GROWTH;
      const ov = (growth[c.id] || 0) - need;
      if (ov > 0) { sumOv += ov; if (ov > maxOv) { maxOv = ov; deepTree = c; } }
    }
  }
  const plantCommit = Math.min(1, SKILL_SLOTS > 0 ? plantSkillCount(skills) / SKILL_SLOTS : 1);
  const mbCard = deepTree || tallTree;
  const mbScore = Math.round(Math.min(maxOv, MUTTERBAUM_OVERFLOW_CAP) * MUTTERBAUM_DIRECT * plantCommit);
  const wbScore = Math.round(Math.min(sumOv, WELTENBAUM_OVERFLOW_CAP) * WELTENBAUM_DIRECT * plantCommit);

  const Mark = ({ atPct, label }) => (
    <div className="absolute inset-y-0" style={{ left: `${atPct}%`, width: 2, background: "#ffffff66" }} title={label} />
  );

  // Phase-3-Headline: „gleich knallt's"-Zustand für die einklappbare Fraktions-Zeile.
  const collapsed = options.collapseFacPlant ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacPlant: !collapsed });
  const stateText = overgrown ? t("bar.plant.state.overgrown") : t("bar.plant.state.green", { pct: Math.round(pct) });

  return (
    <FactionShell icon={<FactionIcon type="plant" size={15} />} name={archetypeLabel("plant")} color={PLANT} stateText={stateText} stateOn={overgrown} collapsed={collapsed} onToggle={onToggle}
      footer={showSkills ? <PanelSkills skills={skills} arch="plant" color={PLANT} /> : null}>
      {/* #270.2 Eigen-Score auf einen Blick: nach Fantasie (Wurzel/Blüte/Ernte) + Gewachsen (Lauf-Zähler). */}
      <div className="mb-2">
        <YieldMeter title={t("bar.plant.yield")} accent={PLANT_RIPE} channels={[
          { label: t("bar.plant.root"), value: rootScore, color: PLANT },
          { label: t("bar.plant.bloom"), value: bloomScore, color: BLOOM },
          { label: t("bar.plant.harvest"), value: harvestScore, color: PLANT_RIPE },
        ]} />
        {growthTotal > 0 && (
          <div className="text-meta-1 opacity-55 mt-1">{t("bar.plant.grown")} <b className="tabular-nums" style={{ color: PLANT_RIPE }}>{grp(growthTotal)}</b> <span className="opacity-70">{t("bar.plant.grown.unit")}</span></div>
        )}
        {/* #288 Trimmen: ersetzte Wachstums-Skills → Wurzel-/Blüten-Multiplikator. */}
        {trimCount > 0 && (
          <div className="text-meta-1 opacity-70 mt-1" title={t("bar.plant.trimmed.title", { skills: trimmableNames(" / ") })}>
            {t("bar.plant.trimmed")} <b className="tabular-nums" style={{ color: PLANT_RIPE }}>{trimCount}×</b> <span className="opacity-70">{t("bar.plant.trimmed.unit")}</span> <b className="tabular-nums" style={{ color: BLOOM }}>×{fmtNum(trimMult.toFixed(2))}</b>
          </div>
        )}
        {/* Mutterbaum (Legendär): der höchste Baum + was er je grünem Sieg an Direkt-Score zahlt (Überlauf-Wachstum × DIRECT). */}
        {hasMb && mbCard && (
          <div className="text-meta-1 opacity-70 mt-1" title={t("bar.plant.tallest.title")}>
            {t("bar.plant.tallest")} <b style={{ color: PLANT_FULL }}>{t("bar.plant.tallest.value", { value: mbCard.value })}</b> <span className="opacity-70">{t("bar.plant.overflow")}</span> <b className="tabular-nums" style={{ color: PLANT_RIPE }}>{fmtG(maxOv)}</b> → <b className="tabular-nums" style={{ color: PLANT_RIPE }}>+{grp(mbScore)}</b> <span className="opacity-70">{t("bar.plant.perWin")}</span>
          </div>
        )}
        {/* Weltenbaum (Legendär): das gesamte Überlauf-Wachstum des Waldes + der Direkt-Score je grünem Sieg. */}
        {hasWb && (
          <div className="text-meta-1 opacity-70 mt-1" title={t("bar.plant.forest.title")}>
            {t("bar.plant.forest")} <b className="tabular-nums" style={{ color: PLANT_RIPE }}>{fmtG(sumOv)}</b> <span className="opacity-70">{t("bar.plant.forest.unit")}</span> → <b className="tabular-nums" style={{ color: PLANT_RIPE }}>+{grp(wbScore)}</b> <span className="opacity-70">{t("bar.plant.perWin")}</span>
          </div>
        )}
      </div>
      {/* Grün-Anteil (Hauptelement): Balken bis 100 %, zwei Schwellenmarken. */}
      <div className="flex justify-between text-body-5 mb-1.5">
        <span className="opacity-60">{t("bar.plant.share")}
          {overgrown && <span style={{ color: PLANT_FULL }}>{t("bar.plant.share.badge")}</span>}
        </span>
        <span className="font-bold tabular-nums" style={{ color: overgrown ? PLANT_FULL : PLANT_RIPE }}>{t("bar.plant.share.value", { green: greenN, total, pct: Math.round(pct) })}</span>
      </div>
      <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}
        title={t("bar.plant.share.title")}>
        <div className="absolute inset-y-0 left-0 transition-all"
          style={{ width: `${pct}%`, background: overgrown ? `linear-gradient(90deg, ${PLANT}, ${PLANT_FULL})` : PLANT,
                   boxShadow: overgrown ? `0 0 8px ${PLANT}` : undefined }} />
        {hasEfr && <Mark atPct={efrPct} label={t("bar.plant.mark.spring.title", { pct: Math.round(efrPct) })} />}
        {hasUeb && <Mark atPct={uebPct} label={t("bar.plant.mark.overgrowth.title", { pct: Math.round(uebPct) })} />}
      </div>
      {(hasEfr || hasUeb) && (
        <div className="relative h-3 text-meta-1 opacity-45 mt-1">
          {hasEfr && <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${efrPct}%` }}>{t("bar.plant.mark.spring")}</span>}
          {hasUeb && <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${uebPct}%` }}>{t("bar.plant.mark.overgrowth")}</span>}
        </div>
      )}

      {/* #277 · C — Reifezustand: „Nächste Reife" + Stufen-Histogramm (Setzling/Grün/Ausgewachsen mit Fortschrittsbalken).
          Ersetzt die alte flache Zählerzeile — gleiche drei Zahlen, jetzt mit Durchschnitts-Fortschritt je Stufe. */}
      <div className="mt-2.5">
        {nextRipe != null && (
          <div className="flex items-baseline justify-between text-body-5 mb-1.5">
            <span className="opacity-60">{t("bar.plant.nextRipe")}</span>
            <span className="font-bold tabular-nums" style={{ color: PLANT_RIPE }} title={t("bar.plant.nextRipe.title")}>{t("bar.plant.nextRipe.wins", { count: nextRipe })}</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "seed", n: setzling, lab: t("bar.plant.stage.seed"), col: SEED, bar: avg(seedList), title: t("bar.plant.stage.seed.title") },
            { k: "green", n: gruen, lab: t("bar.plant.stage.green"), col: PLANT, bar: avg(greenList), title: t("bar.plant.stage.green.title") },
            { k: "full", n: ausgewachsen, lab: t("bar.plant.stage.full"), col: PLANT_FULL, bar: ausgewachsen > 0 ? 1 : 0, title: t("bar.plant.stage.full.title", { cap: PLANT_VALUE_CAP }) },
          ].map((s) => (
            <div key={s.k} className="rounded-lg px-2 py-1.5 text-center" title={s.title}
              style={{ background: `${s.col}12`, border: `1px solid ${s.col}${s.n ? "44" : "22"}`, opacity: s.n ? 1 : 0.5 }}>
              <div className="text-body-lg-6 ty-num leading-none" style={{ color: s.col }}>{s.n}</div>
              <div className="text-micro-3 uppercase tracking-wide opacity-55 mt-0.5">{s.lab}</div>
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
            className="w-full flex items-center gap-1 text-meta-1 uppercase tracking-wide opacity-50 hover:opacity-80" style={{ background: "transparent" }} aria-expanded={!stripCollapsed}>
            <span className="inline-block w-2 text-center" aria-hidden="true">{stripCollapsed ? "▸" : "▾"}</span>
            <span>{t("bar.plant.maturing", { n: maturing.length })}</span>
          </button>
          {!stripCollapsed && (
            <div className="flex flex-col gap-1 mt-1.5">
              {maturing.slice(0, 8).map((m) => {
                const col = m.stage === "seed" ? SEED : PLANT_RIPE;
                return (
                  <div key={m.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "16px 84px 1fr auto" }}>
                    <span className="text-center inline-flex justify-center"><FactionIcon type="plant" size={11} /></span>
                    <span className="text-meta-1 opacity-60 tabular-nums whitespace-nowrap">{m.label}</span>
                    <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#26262e" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(m.pct * 100)}%`, background: m.stage === "seed" ? SEED : `linear-gradient(90deg, ${PLANT_RIPE}, ${PLANT_FULL})` }} />
                    </div>
                    <span className="text-meta-1 tabular-nums" style={{ color: col }}>{Math.round(m.pct * 100)}%</span>
                  </div>
                );
              })}
              {maturing.length > 8 && <div className="text-micro-3 opacity-40 mt-0.5">{t("bar.plant.maturing.more", { n: maturing.length - 8 })}</div>}
            </div>
          )}
        </div>
      )}

      {/* Ausläufer (kolonisierte Gegnerkarten) — eigene, getrennte Zeile: der Griff ins Gegnerdeck (Ernte/Dornenkönig). */}
      {colonizedN > 0 && (
        <div className="flex items-center gap-2 text-body-5 mt-2 pt-2 border-t" style={{ borderColor: `${PLANT}22` }}>
          <span className="opacity-55 shrink-0">{t("bar.plant.runners")}</span>
          <span className="ty-num shrink-0" style={{ color: PLANT_RIPE }}>{colonizedN}</span>
          <span className="inline-flex flex-wrap gap-0.5 min-w-0">
            {Array.from({ length: Math.min(colonizedN, 12) }, (_, i) => (
              <FactionIcon key={i} type="plant" size={11} />
            ))}
          </span>
        </div>
      )}
    </FactionShell>
  );
}
