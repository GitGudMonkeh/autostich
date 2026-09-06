import { F, fireParam, heatMult, heatMaxFor } from "../game/factions/fire.js";
import { HEAT_MAX, HEAT_MULT_PER_10, SONNENZORN_MULT_PER_10, FORGE_VALUE } from "../game/constants.js";
import { FactionShell, PanelSkills, CounterCell, YieldMeter } from "./indicators/panelKit.jsx";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { FIRE, FIRE_HOT, FORGE, WHITE_HEAT } from "./indicators/vocab.js";
import { t, fmtNum } from "../i18n/index.js";
import { archetypeLabel } from "../i18n/labels.js"; // Fraktionsname aus dem Archetyp-Register

const BRAND = "#e0605a"; // Brandmal am Gegner (Debuff, App-Rotton)

/* 🔥 Hitze (Feuer-Archetyp) — eigener Block zwischen Battlefield und Build-Panel, analog zur ⚡ Ladung.
   exp skill rework (docs/skill-rework.md §4, Anzeige vorläufig bis Phase 4): Leiste 0–100, mit Weißglut 0–200; daneben
   der Hitze-Multiplikator des Passivs (je 10 % Hitze +2 % Score, Sonnenzorn: Spitze und doppelt), die Schwellen-Skills
   als Abzeichen (Glühende Klinge, Feuerwalze, Verbrennung, Schmiede) und der Schmiede-Zähler. Asche, Funkenflug und
   Überhitzung gibt es nicht mehr. Nur sichtbar, sobald ein Feuer-Skill aktiv ist. */
const HOT = FIRE_HOT; // heißes Ende des Verlaufs (ab ~50 %)

// Amboss (Forge-Gold) — SVG-Platzhalter.
function AnvilIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
      <path d="M2 2.6 H13 V4.4 C10.4 4.4 10.6 5.6 12.4 5.6 H9 L8.3 8.4 H5.4 L4.7 5.6 H3.4 V4.2 L2 3.9 Z" fill={FORGE} />
      <rect x="5" y="8.6" width="4" height="1.9" rx="0.5" fill={FORGE} />
    </svg>
  );
}

const grp = (n) => fmtNum(Math.round(n));

export function HeatBar({ heat, skills = [], skillTiers = {}, forged = {}, lastResult = null, brandTotal = 0, fireBase = 0, fireHeat = 0, options = {}, onOption, manyActive = false, showSkills = false }) {
  if (!heat || !heat.active) return null;
  const value = heat.value || 0;
  const scale = heat.max || heatMaxFor(skills);   // Bezugsgröße ALLER Leisten-Geometrie (Füllung, Schwellenstriche): 100, mit Weißglut 200
  const pct = Math.max(0, Math.min(100, (value / scale) * 100));
  const hot = value >= 50;
  const white = scale > HEAT_MAX;
  const overFull = white && value > HEAT_MAX;      // über der 100er-Marke (nur mit Weißglut)
  const param = (id, key) => fireParam(skills, skillTiers, id, key);
  const zorn = skills.includes(F.SONNENZORN);
  // Hitze-Multiplikator des Passivs, wie ihn der nächste Sieg (vor seinem Gewinn) trüge — dieselbe Quelle wie die Engine.
  const mult = heatMult(skills, skillTiers, value, heat.peak || 0);
  const multPct = Math.round((mult - 1) * 100);
  // §7.13: die Konsumenten zünden nur bei voller Leiste — Flächenbrand brennt mit dem nächsten Sieg, sobald sie voll steht.
  const full = value >= scale;
  const conflagReady = param(F.FLAECHENBRAND, "keep") != null && full;
  // Schmiede (§7.14): Schwelle der Stufe, ohne Preis — die Schmiedung fällt am Rundenende, sobald die Hitze anliegt;
  // Zähler = Summe der Schmiedewerte im Deck.
  const forgeMin = param(F.SCHMIEDE, "minHeat");
  const totalForged = Object.values(forged).reduce((a, b) => a + b, 0);
  const showForge = forgeMin != null || skills.includes(F.DAMASTSTAHL) || totalForged > 0;

  const badges = [];
  // Glühende Klinge: fixes Readout (+n nach Hitze), dazu die Schrittweite der Stufe im Tooltip.
  const step = param(F.KLINGE, "perHeat");
  if (step) {
    const gv = Math.floor(value / step + 1e-9) * (param(F.KLINGE, "value") || 1);
    badges.push({ k: "gk", t: gv > 0 ? t("bar.fire.badge.glow.n", { n: gv }) : t("bar.fire.badge.glow"), c: HOT, dim: gv === 0,
      title: t("bar.fire.badge.glow.title", { step }) });
  }
  // Feuerwalze: dauerhaft sichtbar, sobald gehalten; die +n nur, wenn die nächste Karte den Bonus wirklich trägt.
  const fwMin = param(F.FEUERWALZE, "minHeat");
  if (fwMin != null) {
    const on = value >= fwMin && (lastResult === "win" || (param(F.FEUERWALZE, "afterLoss") && lastResult === "loss"));
    const fv = param(F.FEUERWALZE, "value") || 0;
    badges.push({ k: "fw", t: on ? t("bar.fire.badge.fireRoll.n", { n: fv }) : t("bar.fire.badge.fireRoll"), c: HOT, dim: !on,
      title: t("bar.fire.badge.fireRoll.title", { n: fwMin, v: fv }) });
  }
  // Verbrennung: die Vorsprungs-Schwelle der Stufe (Zustand des Builds, kein Hitze-Tor).
  const vbMin = param(F.VERBRENNUNG, "minMargin");
  if (vbMin != null) {
    badges.push({ k: "vb", t: t("bar.fire.badge.verbrennung", { n: vbMin }), c: WHITE_HEAT, dim: false,
      title: t("bar.fire.badge.verbrennung.title", { n: vbMin, m: fmtNum(param(F.VERBRENNUNG, "mult") || 1) }) });
  }
  // Schmiede: Schwelle der Stufe; hell, sobald die Hitze sie hergibt (die Schmiedung fällt am Rundenende).
  if (forgeMin != null) {
    badges.push({ k: "sm", t: t("bar.fire.badge.schmiede", { n: forgeMin }), c: FORGE, dim: value < forgeMin,
      title: t("bar.fire.badge.schmiede.title", { n: forgeMin, v: FORGE_VALUE }) });
  }
  // Sonnenzorn: die Spitze, mit der der Multiplikator rechnet.
  if (zorn) {
    badges.push({ k: "sz", t: t("bar.fire.badge.peak", { n: Math.round(heat.peak || 0) }), c: WHITE_HEAT, dim: false,
      title: t("bar.fire.badge.peak.title") });
  }

  // Phase-3-Headline: „gleich knallt's"-Zustand für die einklappbare Fraktions-Zeile.
  const collapsed = options.collapseFacFire ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacFire: !collapsed });
  const stateText = conflagReady ? t("bar.fire.state.conflag")
    : t("bar.fire.state.mult", { value: Math.round(value), max: scale, mult: multPct });
  const stateOn = conflagReady || overFull || hot;

  // #deckshop: Feuer-Glut wandert vom Battlefield ins eigene Panel — warme Innen-Aura, Deckkraft = Hitze; Puls nahe voll.
  const heatRatio = Math.max(0, Math.min(1, value / HEAT_MAX));
  const ambient = heatRatio > 0.02
    ? `inset 0 -22px 48px -14px rgba(224,113,74,${(0.55 * heatRatio).toFixed(2)}), inset 0 0 34px rgba(240,168,58,${(0.14 * heatRatio).toFixed(2)})`
    : null;
  const ambientPulse = heatRatio >= 0.9 ? "as-heat-pulse" : null;

  // Schwellenstriche: die Klingen-Schritte (bis zur Leiste) und, mit Weißglut, die 100er-Marke.
  const ticks = [];
  if (step) for (let h = step; h < scale; h += step) ticks.push(h);

  return (
    <FactionShell anchor="faction-fire" icon={<FactionIcon type="fire" size={15} />} name={archetypeLabel("fire")} color={FIRE} stateText={stateText} stateOn={stateOn} collapsed={collapsed} onToggle={onToggle}
      footer={showSkills ? <PanelSkills skills={skills} arch="fire" color={FIRE} /> : null}
      ambient={ambient} ambientPulse={ambientPulse}>
      {/* #270.2 Eigen-Score auf einen Blick: Feuer-Score (Konsumenten, Glutstahl, Sonnenkern — die Flats in der Basis) und der
          Anteil des Hitze-Multiplikators samt Verbrennung am Score (Näherung wie der Formations-Anteil). */}
      <div className="mb-2">
        <YieldMeter title={t("bar.fire.yield")} accent={HOT} channels={[
          { label: t("bar.fire.yield.base"), value: fireBase, color: FIRE_HOT },
          { label: t("bar.fire.yield.mult"), value: fireHeat, color: WHITE_HEAT, hint: t("bar.fire.yield.mult.hint") },
        ]} />
      </div>
      <div className="flex items-stretch gap-3">
        {/* Hitzeleiste (Hauptelement) */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-body-5 mb-1.5">
            <span className="opacity-60">{t("bar.fire.heat")}
              {conflagReady && <span style={{ color: HOT }}>{t("bar.fire.conflagReady")}</span>}
            </span>
            <span className="font-bold" style={{ color: overFull ? WHITE_HEAT : hot ? HOT : FIRE }}
              title={t("bar.fire.mult.title", { per: Math.round(HEAT_MULT_PER_10 * 100), zorn: Math.round(SONNENZORN_MULT_PER_10 * 100) })}>
              {Math.round(value)} / {scale} · ×{fmtNum(Math.round(mult * 100) / 100)}
            </span>
          </div>
          <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}>
            <div className="absolute inset-y-0 left-0 transition-all"
              style={{ width: `${pct}%`,
                       background: overFull ? `linear-gradient(90deg, ${FIRE}, ${HOT}, ${WHITE_HEAT})` : hot ? `linear-gradient(90deg, ${FIRE}, ${HOT})` : FIRE,
                       boxShadow: conflagReady ? `0 0 8px ${HOT}` : hot ? `0 0 6px ${FIRE}88` : undefined }} />
            {ticks.map((h) => (
              <div key={h} className="absolute inset-y-0" style={{ left: `${(h / scale) * 100}%`, width: 2, background: "#ffffff55" }}
                title={t("bar.fire.tick.glow", { n: h })} />
            ))}
            {white && (
              <div className="absolute inset-y-0" style={{ left: `${(HEAT_MAX / scale) * 100}%`, width: 2, background: `${WHITE_HEAT}99` }}
                title={t("bar.fire.tick.full")} />
            )}
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((b) => (
                <span key={b.k} className="text-meta-1 px-1.5 py-0.5 rounded font-semibold" title={b.title}
                  style={{ background: `${b.c}${b.dim ? "14" : "22"}`, color: b.c,
                           border: `1px solid ${b.c}${b.dim ? "3a" : "66"}`, opacity: b.dim ? 0.55 : 1 }}>{b.t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Schmieden — Sekundär-Akku rechts neben der Leiste (Summe der Schmiedewerte im Deck). */}
        {showForge && (
          <div className="flex flex-col justify-center gap-1.5 shrink-0">
            <CounterCell icon={<AnvilIcon />} value={`+${totalForged}`} label={t("bar.fire.forges")} color={FORGE}
              glow={totalForged > 0} dim={totalForged === 0}
              title={t("bar.fire.forges.title")} />
          </div>
        )}
      </div>

      {/* #270.2 Brand — gebrandmarkte Gegnerkarten über den Lauf (Feuers Gegner-Debuff, analog Eis-Frostbiss). Eigene rote
          Zeile. #UI: nur wenige 🔥 als Akzent (nicht je Brand eins → sonst umbricht die Leiste); die echte Zahl steht daneben. */}
      {brandTotal > 0 && (
        <div className="flex items-center gap-2 text-body-5 mt-2 pt-2 border-t" style={{ borderColor: `${BRAND}22` }}>
          <span className="opacity-55 shrink-0">{t("bar.fire.brand")}</span>
          <span className="ty-num shrink-0" style={{ color: BRAND }}>{grp(brandTotal)}</span>
          <span className="inline-flex gap-0.5 shrink-0 overflow-hidden">
            {Array.from({ length: Math.min(brandTotal, 6) }, (_, i) => (
              <FactionIcon key={i} type="fire" size={11} />
            ))}
          </span>
        </div>
      )}
    </FactionShell>
  );
}
