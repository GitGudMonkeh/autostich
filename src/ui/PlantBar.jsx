// 🌿 Pflanze (Pflanze-Archetyp) — Feld-Panel. „Welche Karten sind grün, und wie stehen sie?" (docs/skill-rework.md §6):
// das Feld wächst je Karte (grau → grün → blühend), und der GRÜN-ANTEIL ist der zentrale Zustand. Gezeigt wird:
//   • Basis-Score der Fraktion (Blüte + die Score-Skills) und das gewachsene Wachstum des Laufs,
//   • der Grün-Anteil des Feldes als Balken,
//   • das Zustands-Histogramm (grau/grün/blühend mit Ø-Fortschritt zur nächsten Schwelle) plus ein einklappbarer
//     Strip mit den wachsenden Karten (pro Karte ein Mini-Balken, default zu).
// Rein informativ, keine Engine-Kopplung (spiegelt state.deck/growth).
import { FactionShell, PanelSkills, YieldMeter } from "./indicators/panelKit.jsx";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { PLANT, PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { PLANT_GREEN_THRESHOLD, PLANT_BLOOM_THRESHOLD } from "../game/constants.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache
import { archetypeLabel } from "../i18n/labels.js";

const GREY = "#9aa4a0"; // graue Karte (wächst, noch nicht grün)
// #sprache: Trennzeichen aus dem Katalog (de „1.234,5" · en „1,234.5"), kein festes de-DE mehr.
const grp = (n) => fmtNum(Math.round(n));
const fmtG = (g) => fmtNum(Math.round((g || 0) * 10) / 10); // Wachstum mit einer Nachkommastelle

export function PlantBar({ active, deck = [], growth = {}, skills = [], growthTotal = 0, showSkills = false,
                          baseScore = 0, options = {}, onOption, manyActive = false }) {
  if (!active) return null;
  const total = deck.length || 0;
  let grau = 0, gruen = 0, bluehend = 0;
  // Fortschritt je Karte zur NÄCHSTEN Schwelle — grau → grün (Wachstum/Grün-Schwelle), grün → blühend.
  // „growing" = alle noch nicht blühenden Karten mit Fortschritt, sortiert nach Nähe zur nächsten Stufe.
  const growing = [];
  for (const c of deck) {
    const g = growth[c.id] || 0;
    if (c.bloom) { bluehend += 1; continue; }
    if (c.green) {
      gruen += 1;
      growing.push({ id: c.id, stage: "green", pct: Math.min(1, g / PLANT_BLOOM_THRESHOLD), rem: Math.max(0, PLANT_BLOOM_THRESHOLD - g), label: t("bar.plant.strip.green", { growth: fmtG(g), need: PLANT_BLOOM_THRESHOLD }) });
    } else {
      grau += 1;
      if (g > 0) growing.push({ id: c.id, stage: "grey", pct: Math.min(1, g / PLANT_GREEN_THRESHOLD), rem: Math.max(0, PLANT_GREEN_THRESHOLD - g), label: t("bar.plant.strip.grey", { growth: fmtG(g), need: PLANT_GREEN_THRESHOLD }) });
    }
  }
  growing.sort((a, b) => b.pct - a.pct);                 // am nächsten an der nächsten Stufe zuerst
  const greyList = growing.filter((m) => m.stage === "grey");
  const greenList = growing.filter((m) => m.stage === "green");
  const avg = (arr) => (arr.length ? arr.reduce((s, m) => s + m.pct, 0) / arr.length : 0);
  // A einklappbar (default zu), Zustand über die Optionen gemerkt (wie StatusRail-Collapsibles).
  const stripCollapsed = options.collapsePlantMaturing ?? true;
  const greenN = gruen + bluehend;                       // „grün" zählt blühende Karten mit (sie sind grün)
  const pct = total ? (greenN / total) * 100 : 0;
  const fullGreen = total > 0 && greenN === total;       // das Zielbild eines gezielten Builds (§6.1)

  // Phase-3-Headline: „gleich knallt's"-Zustand für die einklappbare Fraktions-Zeile.
  const collapsed = options.collapseFacPlant ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacPlant: !collapsed });
  const stateText = fullGreen ? t("bar.plant.state.full") : t("bar.plant.state.green", { pct: Math.round(pct) });

  return (
    <FactionShell anchor="faction-plant" icon={<FactionIcon type="plant" size={15} />} name={archetypeLabel("plant")} color={PLANT} stateText={stateText} stateOn={fullGreen} collapsed={collapsed} onToggle={onToggle}
      footer={showSkills ? <PanelSkills skills={skills} arch="plant" color={PLANT} /> : null}>
      {/* Eigen-Score auf einen Blick: EIN Kanal (Basis-Score aus Blüte und den Score-Skills) + Gewachsen (Lauf-Zähler). */}
      <div className="mb-2">
        <YieldMeter title={t("bar.plant.yield")} accent={PLANT_RIPE} channels={[
          { label: t("bar.plant.base"), value: baseScore, color: PLANT },
        ]} />
        {growthTotal > 0 && (
          <div className="text-meta-1 opacity-55 mt-1">{t("bar.plant.grown")} <b className="tabular-nums" style={{ color: PLANT_RIPE }}>{grp(growthTotal)}</b> <span className="opacity-70">{t("bar.plant.grown.unit")}</span></div>
        )}
      </div>
      {/* Grün-Anteil (Hauptelement): Balken bis 100 %. */}
      <div className="flex justify-between text-body-5 mb-1.5">
        <span className="opacity-60">{t("bar.plant.share")}
          {fullGreen && <span style={{ color: PLANT_FULL }}>{t("bar.plant.share.badge")}</span>}
        </span>
        <span className="font-bold tabular-nums" style={{ color: fullGreen ? PLANT_FULL : PLANT_RIPE }}>{t("bar.plant.share.value", { green: greenN, total, pct: Math.round(pct) })}</span>
      </div>
      <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}
        title={t("bar.plant.share.title")}>
        <div className="absolute inset-y-0 left-0 transition-all"
          style={{ width: `${pct}%`, background: fullGreen ? `linear-gradient(90deg, ${PLANT}, ${PLANT_FULL})` : PLANT,
                   boxShadow: fullGreen ? `0 0 8px ${PLANT}` : undefined }} />
      </div>

      {/* Zustands-Histogramm: grau/grün/blühend mit dem Ø-Fortschritt zur nächsten Schwelle. */}
      <div className="mt-2.5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "grey", n: grau, lab: t("bar.plant.stage.grey"), col: GREY, bar: avg(greyList), title: t("bar.plant.stage.grey.title", { need: PLANT_GREEN_THRESHOLD }) },
            { k: "green", n: gruen, lab: t("bar.plant.stage.green"), col: PLANT, bar: avg(greenList), title: t("bar.plant.stage.green.title", { need: PLANT_BLOOM_THRESHOLD }) },
            { k: "bloom", n: bluehend, lab: t("bar.plant.stage.bloom"), col: PLANT_FULL, bar: bluehend > 0 ? 1 : 0, title: t("bar.plant.stage.bloom.title") },
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

      {/* Einklappbarer Detail-Strip: pro wachsender Karte ein Mini-Balken (default zu, Zustand gemerkt). */}
      {growing.length > 0 && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "#26262e" }}>
          <button type="button" onClick={() => onOption && onOption({ collapsePlantMaturing: !stripCollapsed })} data-sfx="none"
            className="w-full flex items-center gap-1 text-meta-1 uppercase tracking-wide opacity-50 hover:opacity-80" style={{ background: "transparent" }} aria-expanded={!stripCollapsed}>
            <span className="inline-block w-2 text-center" aria-hidden="true">{stripCollapsed ? "▸" : "▾"}</span>
            <span>{t("bar.plant.maturing", { n: growing.length })}</span>
          </button>
          {!stripCollapsed && (
            <div className="flex flex-col gap-1 mt-1.5">
              {growing.slice(0, 8).map((m) => {
                const col = m.stage === "grey" ? GREY : PLANT_RIPE;
                return (
                  <div key={m.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "16px 84px 1fr auto" }}>
                    <span className="text-center inline-flex justify-center"><FactionIcon type="plant" size={11} /></span>
                    <span className="text-meta-1 opacity-60 tabular-nums whitespace-nowrap">{m.label}</span>
                    <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#26262e" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round(m.pct * 100)}%`, background: m.stage === "grey" ? GREY : `linear-gradient(90deg, ${PLANT_RIPE}, ${PLANT_FULL})` }} />
                    </div>
                    <span className="text-meta-1 tabular-nums" style={{ color: col }}>{Math.round(m.pct * 100)}%</span>
                  </div>
                );
              })}
              {growing.length > 8 && <div className="text-micro-3 opacity-40 mt-0.5">{t("bar.plant.maturing.more", { n: growing.length - 8 })}</div>}
            </div>
          )}
        </div>
      )}
    </FactionShell>
  );
}
