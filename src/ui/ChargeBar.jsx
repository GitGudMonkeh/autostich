import { chargeConsumerOf } from "../game/skills.js";
import { ION_MAX_STACKS, ION_SAT_BREADTH_FRAC, ION_SAT_DEPTH_FRAC, ION_SATURATION_VALUE, CRIT_BASE_MULT,
  STORM_CRIT_CAP, UEBERSCHLAG_DEPTH_PP_PER_CHARGE } from "../game/constants.js";
import { FactionShell, PanelSkills } from "./indicators/panelKit.jsx";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { LIGHTNING, CASCADE_BRIGHT } from "./indicators/vocab.js";
import { t } from "../i18n/index.js"; // #sprache
import { skillDef, archetypeLabel } from "../i18n/labels.js";

// ⚡ Blitz-Motor (Blitz-Archetyp) — eigener Block, nur sichtbar bei aktivem Blitz (lightning.active). v0.5:
//   • Sturm-Sättigung  zwei Stufen (Sturmgröße = Breite, Sturmintensität = Tiefe) je in % gegen die Schwelle;
//                      ⚡-Marker + Payoff, sobald die Stufe zündet (+Wert / doppelte Überschlag-Ausbeute).
//   • Ladung           Segment-Maximum (Donnergott-Turbo löst früher aus).
//   • Entladungen       Kern-Metrik (volle Verbräuche/Runde) + Crit-Momentum (Gewitterfront/Entladung).
// Runde 2, R20 (Owner): Blitzfrequenz-Balken, Serienkette und Serienschutz-Badge sind raus —
// Crit-Mult steht im Multiplikatoren-Panel, die Serie in der Statusleiste. Die Kopfzeile behält
// den „Crit ×N"-Zustand als Überladen-Headline.
// Rein anzeige-seitig: liest state.lightning + skills + Crit-Chance/-Mult, keine Engine-Logik.
/* #sprache: Der Konsumenten-Name kam abgetippt — jetzt aus dem Skill-Register (übersetzt), damit er
   nicht vom echten Skill-Namen wegdriftet. Als Getter, weil sich die Sprache ändern kann. */
const CONSUMER_LABEL = { get ionize() { return skillDef("SK_LIGHTNING_02").name; } };

const mlt = (x) => x.toFixed(2).replace(".", ",");

// Sturm-Sättigung (v0.5): eine Stufe mit Mini-Balken, in % gegen die Schwelle; ⚡ + Payoff, sobald die Stufe zündet.
function SatRow({ label, cur, max, on, payoff }) {
  const pct = max > 0 ? Math.min(100, Math.round((cur / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-meta-3 mb-0.5">
        <span className="opacity-55">{label} <span className="ty-num-sm opacity-80">{pct}%</span></span>
        {on
          ? <span className="font-semibold inline-flex items-center gap-0.5" style={{ color: CASCADE_BRIGHT }}><FactionIcon type="lightning" size={11} /> {payoff}</span>
          : <span className="opacity-35">{payoff}</span>}
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ background: "#26262e", height: 5 }}>
        <div className="h-full rounded-full transition-all" style={{
          width: `${pct}%`,
          background: on ? CASCADE_BRIGHT : LIGHTNING,
          boxShadow: on ? `0 0 6px ${CASCADE_BRIGHT}` : undefined,
        }} />
      </div>
    </div>
  );
}

export function ChargeBar({ lightning, skills = [], critChance = 0, critMult = CRIT_BASE_MULT, deck = [], options = {}, onOption, manyActive = false, showSkills = false }) {
  if (!lightning || !lightning.active) return null;
  const { charge, maxCharge } = lightning;
  // Sturm-Sättigung: Sturmgröße = Karten mit ≥1 Stapel gegen Schwelle · Sturmintensität = volle (5-Stapel-)Karten gegen Schwelle.
  const ionN = deck.reduce((t, c) => t + ((c.ionStacks || 0) > 0 ? 1 : 0), 0);
  const ionFull = deck.reduce((t, c) => t + ((c.ionStacks || 0) >= ION_MAX_STACKS ? 1 : 0), 0);
  const breadthThresh = Math.ceil(deck.length * ION_SAT_BREADTH_FRAC);
  const depthThresh = Math.ceil(deck.length * ION_SAT_DEPTH_FRAC);
  const breadthOn = deck.length > 0 && ionN >= breadthThresh;
  const depthOn = deck.length > 0 && ionFull >= depthThresh;
  // Crit-Momentum + Motor-Zähler (v0.5).
  const stormPp = Math.round((lightning.stormCritBonus || 0) * 100);
  const entMult = lightning.entladungMult || 0;
  const consumeCount = lightning.consumeCount || 0;
  const full = charge >= maxCharge;
  const consumer = CONSUMER_LABEL[chargeConsumerOf(skills)];

  // Überladen (Crit-Chance ≥ 100 %) trägt nur noch die Kopfzeilen-Headline („Crit ×N").
  const overcharge = critChance >= 1;

  // Phase-3-Headline: „gleich knallt's"-Zustand für die einklappbare Fraktions-Zeile.
  const collapsed = options.collapseFacLightning ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacLightning: !collapsed });
  const stateText = full ? t("bar.lightning.state.full") : overcharge ? t("bar.lightning.state.crit", { mult: mlt(critMult) })
    : t("bar.lightning.state.charge", { charge, max: maxCharge });
  const stateOn = full || overcharge;

  // #deckshop: Blitz-Glow wandert vom Battlefield ins eigene Panel — blaue Innen-Aura ab Ladung 2 (voll: violetter
  // Akzent + Puls). Intensität = Ladungsgrad.
  const chargeR = Math.max(0, Math.min(1, charge / (maxCharge || 1)));
  const lit = charge >= 2;
  const ambient = lit
    ? `inset 0 0 ${Math.round(10 + 26 * chargeR)}px ${Math.round(2 + 5 * chargeR)}px rgba(94,200,240,${(0.14 + 0.4 * chargeR).toFixed(2)})${full ? ", inset 0 0 40px 6px rgba(138,125,224,0.4)" : ""}`
    : null;
  const ambientPulse = full ? "as-charge-pulse" : null;

  return (
    <FactionShell className="relative" anchor="faction-lightning" icon={<FactionIcon type="lightning" size={15} />} name={archetypeLabel("lightning")} color={LIGHTNING}
      footer={showSkills ? <PanelSkills skills={skills} arch="lightning" color={LIGHTNING} /> : null}
      stateText={stateText} stateOn={stateOn} collapsed={collapsed} onToggle={onToggle}
      ambient={ambient} ambientPulse={ambientPulse}>
      {/* Blitzfrequenz-Puls (v0.5): violettes Rahmen-Glühen je Entladung (wie der Battlefield-Bloom); remount je consumeCount replayt die Animation. */}
      <div key={consumeCount} className="as-blitz-pulse pointer-events-none absolute inset-0 rounded-xl" aria-hidden="true" />
      {/* Sturm-Sättigung (v0.5): die zwei Stufen + ihre Payoffs live — das Herzstück des Reworks. */}
      {ionN > 0 && (
        <div className="grid gap-1.5">
          <div className="text-body-5 opacity-60">{t("bar.lightning.saturation")}</div>
          <SatRow label={t("bar.lightning.breadth")} cur={ionN} max={breadthThresh} on={breadthOn} payoff={t("bar.lightning.breadth.payoff", { n: ION_SATURATION_VALUE })} />
          <SatRow label={t("bar.lightning.depth")} cur={ionFull} max={depthThresh} on={depthOn} payoff={t("bar.lightning.depth.payoff", { n: UEBERSCHLAG_DEPTH_PP_PER_CHARGE })} />
        </div>
      )}

      {/* Ladung — Segment-Maximum (Cyan), glüht bei VOLL. */}
      <div>
        <div className="flex justify-between text-body-5 mb-1.5">
          <span className="opacity-60">{t("bar.lightning.state.charge", { charge, max: maxCharge })}{full && <span style={{ color: LIGHTNING }}>{t("bar.lightning.fullBadge")}</span>}</span>
          <span className="font-bold tabular-nums" style={{ color: LIGHTNING }}>{charge} / {maxCharge}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxCharge }, (_, i) => {
            const on = i < charge;
            return (
              <div key={i} className="flex-1 rounded-sm transition-all" style={{
                height: 12,
                background: on ? LIGHTNING : "#26262e",
                boxShadow: on && full ? `0 0 7px ${LIGHTNING}` : undefined,
              }} />
            );
          })}
        </div>
      </div>

      {/* Entlade-Motor (v0.5): Entladungen/Runde (Kern-Metrik) + Crit-Momentum (Gewitterfront/Entladung). */}
      {(consumeCount > 0 || stormPp > 0 || entMult > 0) && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-meta-3">
          <span className="opacity-60" title={t("bar.lightning.consumes.title")}>{t("bar.lightning.consumes")} <b className="tabular-nums" style={{ color: LIGHTNING }}>{consumeCount}</b></span>
          {stormPp > 0 && <span className="opacity-60" title={t("bar.lightning.storm.title", { cap: Math.round(STORM_CRIT_CAP * 100) })}>{t("bar.lightning.storm")} <b style={{ color: CASCADE_BRIGHT }}>+{stormPp} %</b><span className="opacity-45"> / {Math.round(STORM_CRIT_CAP * 100)}</span></span>}
          {entMult > 0 && <span className="opacity-60" title={t("bar.lightning.discharge.title")}>{t("bar.lightning.discharge")} <b style={{ color: CASCADE_BRIGHT }}>+{mlt(entMult)}×</b></span>}
        </div>
      )}

      {consumer ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-meta-1 px-1.5 py-0.5 rounded font-semibold"
            style={{ background: `${LIGHTNING}22`, color: LIGHTNING, border: `1px solid ${LIGHTNING}66` }}>
            {t("bar.lightning.consumer", { name: consumer })}
          </span>
        </div>
      ) : full ? (
        <div className="text-meta-3 leading-snug rounded px-2 py-1.5"
          style={{ background: `${LIGHTNING}14`, color: LIGHTNING, border: `1px solid ${LIGHTNING}44` }}>
          {t("bar.lightning.noConsumer", { skill: CONSUMER_LABEL.ionize })}
        </div>
      ) : null}
    </FactionShell>
  );
}
