import { fireFlag, hasHeatConsumer, glowingValueFor } from "../game/skills.js";
import { GLOWING_T1_HEAT, GLOWING_T2_HEAT, WHITEHEAT_PER_POINT } from "../game/constants.js";
import { glossaryEntry } from "../i18n/glossaryText.js"; // #sprache: Glossartext zur Anzeigezeit
import { FactionShell, CounterCell, YieldMeter } from "./indicators/panelKit.jsx";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { FIRE, FIRE_HOT, ASH, FORGE, WHITE_HEAT } from "./indicators/vocab.js";
import { t, t as tr, fmtNum } from "../i18n/index.js"; // #sprache (tr = Alias, wo `t` lokal die Schwelle ist)
import { archetypeLabel } from "../i18n/labels.js"; // Fraktionsname aus dem Archetyp-Register

const BRAND = "#e0605a"; // Brandmal am Gegner (Debuff, App-Rotton)

// 🔥 Hitze (Feuer-Archetyp, #93 F1) — eigener Block zwischen Battlefield und Build-Panel, analog zur ⚡ Ladung.
// Kontinuierliche Leiste 0–100. Nur sichtbar, sobald ein Feuer-Skill aktiv ist.
// #206 (AP3): rechts neben der Leiste die Sekundär-Akkus Asche + Schmieden (Entscheidung A);
//   Weißglut-Überlauf als Schwellenzustand IN der Leiste (weiße Kappe am heißen Ende) — der
//   Überlauf ist im Code keine gespeicherte Menge (heat wird bei max gedeckelt, Überschuss →
//   sofort Score), daher Kappe OHNE Zähler, nicht Band-mit-Zahl.
const HOT = FIRE_HOT; // heißes Ende des Verlaufs (ab ~50 %)

// Aschehügel (entsättigtes Warmgrau + zwei Ember-Punkte) — SVG-Platzhalter (#206 Offen C: später Pixel-Art).
function AshIcon() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" aria-hidden="true">
      <path d="M1.5 11 Q7.5 1 13.5 11 Z" fill={ASH} />
      <circle cx="6" cy="8.4" r="0.85" fill={HOT} />
      <circle cx="9.4" cy="9" r="0.85" fill={FIRE} />
    </svg>
  );
}

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

export function HeatBar({ heat, skills = [], ash = 0, forged = {}, ashBurned = 0, brandTotal = 0, fireBase = 0, fireWhite = 0, options = {}, onOption, manyActive = false }) {
  if (!heat || !heat.active) return null;
  const { value, max } = heat;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const hot = value >= 50;                         // Glühende-Klinge-Schwelle
  // #234: Feuer darf mehrere Hitze-Konsumenten halten → je Typ prüfen (nicht nur den ersten).
  const conflagReady = hasHeatConsumer(skills, "conflagration") && value >= 100;
  // #219.5: Glühende Klinge markiert die ECHTEN Schwellen (40/70/100; 100 = Leisten-Ende) statt fälschlich 50 %.
  const glow = fireFlag(skills, "glowingBlade");
  // Weißglut (#206 §3): bei voller Hitze läuft der Überschuss als Score über (heat bei max gedeckelt) →
  // Schwellenzustand. Weiße Kappe am heißen Ende, sobald der Skill gehalten wird; „ausbrennend" bei max.
  const whiteHeat = fireFlag(skills, "whiteHeat");
  const atMax = value >= max;
  const whiteGlow = whiteHeat && atMax;

  // Asche / Schmieden (#206 §1/§2): Sekundär-Akkus rechts neben der Leiste (Entscheidung A).
  const totalForged = Object.values(forged).reduce((a, b) => a + b, 0);
  const showAsh = fireFlag(skills, "brandmal") || fireFlag(skills, "ascheschmiede");
  const showForge = fireFlag(skills, "ascheschmiede") || fireFlag(skills, "damascus") || totalForged > 0;

  const badges = [];
  // Feuerwalze DAUERHAFT anzeigen, sobald der Skill gehalten wird; die +N nur, wenn die Walze wirklich aktiv ist (>0).
  if (fireFlag(skills, "fireRoll")) {
    const fr = heat.fireRoll || 0;
    badges.push({ k: "fw", t: fr > 0 ? t("bar.fire.badge.fireRoll.n", { n: fr }) : t("bar.fire.badge.fireRoll"), c: HOT, dim: fr === 0 });
  }
  // #219.5: Glühende Klinge als fixes, immer sichtbares Readout (Bonus 0/+1/+2/+3 je nach Hitze) — wie Feuerwalze.
  if (glow) {
    const gv = glowingValueFor(value, skills);
    badges.push({ k: "gk", t: gv > 0 ? t("bar.fire.badge.glow.n", { n: gv }) : t("bar.fire.badge.glow"), c: HOT, dim: gv === 0 });
  }

  // Phase-3-Headline: „gleich knallt's"-Zustand für die einklappbare Fraktions-Zeile.
  const collapsed = options.collapseFacFire ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacFire: !collapsed });
  const stateText = conflagReady ? t("bar.fire.state.conflag") : whiteGlow ? t("bar.fire.state.white")
    : t("bar.fire.state.heat", { value: Math.round(value), max });
  const stateOn = conflagReady || whiteGlow || hot;

  // #deckshop: Feuer-Glut wandert vom Battlefield ins eigene Panel — warme Innen-Aura, Deckkraft = Hitze; Puls nahe voll.
  const heatRatio = Math.max(0, Math.min(1, value / max));
  const ambient = heatRatio > 0.02
    ? `inset 0 -22px 48px -14px rgba(224,113,74,${(0.55 * heatRatio).toFixed(2)}), inset 0 0 34px rgba(240,168,58,${(0.14 * heatRatio).toFixed(2)})`
    : null;
  const ambientPulse = heatRatio >= 0.9 ? "as-heat-pulse" : null;

  return (
    <FactionShell icon={<FactionIcon type="fire" size={15} />} name={archetypeLabel("fire")} color={FIRE} stateText={stateText} stateOn={stateOn} collapsed={collapsed} onToggle={onToggle}
      ambient={ambient} ambientPulse={ambientPulse}>
      {/* #270.2 Eigen-Score auf einen Blick: nach Fantasie (Feuer-Grund / Überlauf) + verbrannte Asche (Lauf-Zähler).
          Der Überlauf-Kanal summiert BEIDE Überlauf-Pfade — Weißglut (Hitze über 100 %) und Ascheglut (Asche über die
          Schmiede-Kapazität); deshalb heißt er neutral „Überlauf" und nicht nach einem der beiden (Sprachprüfung B1). */}
      <div className="mb-2">
        <YieldMeter title={t("bar.fire.yield")} accent={HOT} channels={[
          { label: "Feuer-Score", value: fireBase, color: FIRE_HOT },
          { label: "Überlauf", value: fireWhite, color: WHITE_HEAT, hint: "Weißglut (Hitze über 100 %) + Ascheglut (Asche über die Schmiede-Kapazität)" },
        ]} />
        {ashBurned > 0 && (
          <div className="text-[10px] opacity-55 mt-1">{t("bar.fire.ashBurned")} <b className="tabular-nums" style={{ color: ASH }}>{grp(ashBurned)}</b> <span className="opacity-70">{t("bar.fire.overRun")}</span></div>
        )}
      </div>
      <div className="flex items-stretch gap-3">
        {/* Hitzeleiste (Hauptelement) */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="opacity-60">{t("bar.fire.heat")}
              {conflagReady && <span style={{ color: HOT }}>{t("bar.fire.conflagReady")}</span>}
              {whiteGlow && <span style={{ color: WHITE_HEAT }}>{t("bar.fire.whiteGlow")}</span>}
            </span>
            <span className="font-bold" style={{ color: whiteGlow ? WHITE_HEAT : hot ? HOT : FIRE }}>{Math.round(value)} / {max}</span>
          </div>
          <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}>
            <div className="absolute inset-y-0 left-0 transition-all"
              style={{ width: `${pct}%`,
                       background: hot ? `linear-gradient(90deg, ${FIRE}, ${HOT})` : FIRE,
                       boxShadow: conflagReady ? `0 0 8px ${HOT}` : hot ? `0 0 6px ${FIRE}88` : undefined }} />
            {glow && [GLOWING_T1_HEAT, GLOWING_T2_HEAT].map((t) => (
              <div key={t} className="absolute inset-y-0" style={{ left: `${(t / max) * 100}%`, width: 2, background: "#ffffff55" }}
                title={tr("bar.fire.tick.glow", { n: t })} />
            ))}
            {/* Weißglut-Kappe am heißen Ende — „brennt weiß aus" bei voller Hitze (kein Zähler, s. o.). */}
            {whiteHeat && (
              <div className="absolute inset-y-0 right-0 transition-all"
                style={{ width: atMax ? 7 : 5,
                         background: `linear-gradient(90deg, transparent, ${WHITE_HEAT})`,
                         opacity: atMax ? 1 : 0.45,
                         boxShadow: atMax ? `0 0 9px ${WHITE_HEAT}, 0 0 4px #ffffff` : undefined }}
                title={t("bar.fire.tick.white", { n: WHITEHEAT_PER_POINT })} />
            )}
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((b) => (
                <span key={b.k} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: `${b.c}${b.dim ? "14" : "22"}`, color: b.c,
                           border: `1px solid ${b.c}${b.dim ? "3a" : "66"}`, opacity: b.dim ? 0.55 : 1 }}>{b.t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Asche + Schmieden — Sekundär-Akkus rechts neben der Leiste (#206 §1/§2, Entscheidung A). */}
        {(showAsh || showForge) && (
          <div className="flex flex-col justify-center gap-1.5 shrink-0">
            {showAsh && (
              <CounterCell icon={<AshIcon />} value={ash} label={t("bar.fire.ash")} color={ASH} dim={ash === 0}
                title={t("bar.fire.ash.title", { text: glossaryEntry("ash").text })} />
            )}
            {showForge && (
              <CounterCell icon={<AnvilIcon />} value={`+${totalForged}`} label={t("bar.fire.forges")} color={FORGE}
                glow={totalForged > 0} dim={totalForged === 0}
                title={t("bar.fire.forges.title")} />
            )}
          </div>
        )}
      </div>

      {/* #270.2 Brand — gebrandmarkte Gegnerkarten über den Lauf (Feuers Gegner-Debuff, analog Eis-Frostbiss). Eigene rote
          Zeile. #UI: nur wenige 🔥 als Akzent (nicht je Brand eins → sonst umbricht die Leiste); die echte Zahl steht daneben. */}
      {brandTotal > 0 && (
        <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t" style={{ borderColor: `${BRAND}22` }}>
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
