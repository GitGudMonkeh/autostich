import { LIGHTNING_MAX_CHARGE, CRIT_BASE_MULT } from "../game/constants.js";
import { FactionShell, PanelSkills } from "./indicators/panelKit.jsx";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { LIGHTNING, CASCADE_BRIGHT } from "./indicators/vocab.js";
import { t } from "../i18n/index.js"; // #sprache
import { archetypeLabel } from "../i18n/labels.js";

/* ⚡ Blitz-Leiste (exp skill rework, docs/skill-rework.md §3.2) — eigener Block, nur sichtbar bei aktivem Blitz.
   Zeigt die Ladung gegen die Leiste (10 Crits, Donnergott 7), die vollen Leisten des Laufs (jede ionisiert die nächste
   Karte) und die offenen Rampen (Gewitterfront: Crit-Chance · Entladung: Crit-Multiplikator). Sturm-Sättigung und
   Konsumenten-Badge sind mit dem Rework gegangen. Rein anzeige-seitig: liest state.lightning + Crit-Chance/-Mult,
   keine Engine-Logik. Texte und Anzeige nimmt Phase 4 mit dem Owner ab. */
const mlt = (x) => x.toFixed(2).replace(".", ",");

export function ChargeBar({ lightning, skills = [], critChance = 0, critMult = CRIT_BASE_MULT, options = {}, onOption, manyActive = false, showSkills = false }) {
  if (!lightning || !lightning.active) return null;
  const maxCharge = lightning.maxCharge || LIGHTNING_MAX_CHARGE;
  // Ladung über der Leiste (Blitzableiter Episch behält den Überschuss) zündet beim nächsten Stich — die Pips zeigen die Leiste.
  const charge = Math.min(lightning.charge || 0, maxCharge);
  const stormPp = Math.round((lightning.stormCritBonus || 0) * 1000) / 10;
  const entMult = lightning.entladungMult || 0;
  const bars = lightning.bars || 0;
  const full = charge >= maxCharge;

  // Überladen (Crit-Chance ≥ 100 %) trägt die Kopfzeilen-Headline („Crit ×N").
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
      {/* Blitzfrequenz-Puls: violettes Rahmen-Glühen je voller Leiste (wie der Battlefield-Bloom); remount je bars replayt die Animation. */}
      <div key={bars} className="as-blitz-pulse pointer-events-none absolute inset-0 rounded-xl" aria-hidden="true" />

      {/* Ladung — Leiste (Cyan), glüht bei VOLL. */}
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

      {/* Volle Leisten des Laufs (Kern-Metrik) + die offenen Rampen (Gewitterfront/Entladung). */}
      {(bars > 0 || stormPp > 0 || entMult > 0) && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-meta-3">
          <span className="opacity-60" title={t("bar.lightning.consumes.title")}>{t("bar.lightning.consumes")} <b className="tabular-nums" style={{ color: LIGHTNING }}>{bars}</b></span>
          {stormPp > 0 && <span className="opacity-60" title={t("bar.lightning.storm.title")}>{t("bar.lightning.storm")} <b style={{ color: CASCADE_BRIGHT }}>+{String(stormPp).replace(".", ",")} %</b></span>}
          {entMult > 0 && <span className="opacity-60" title={t("bar.lightning.discharge.title")}>{t("bar.lightning.discharge")} <b style={{ color: CASCADE_BRIGHT }}>+{mlt(entMult)}×</b></span>}
        </div>
      )}
    </FactionShell>
  );
}
