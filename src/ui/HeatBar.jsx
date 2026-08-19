import { fireFlag, hasHeatConsumer, glowingValueFor, glowMarginFor } from "../game/skills.js";
import { GLOWING_T1_HEAT, GLOWING_T2_HEAT, GLOWING_T3_HEAT, GLOWING_T1_VALUE, GLOWING_T2_VALUE, GLOWING_T3_VALUE,
  GLOWING_T2_MARGIN, GLOWING_T3_MARGIN, OVERHEAT_MAX, OVERHEAT_SCORE_STEP, SPARKFLIGHT_MIN_MARGIN } from "../game/constants.js";
import { glossaryEntry } from "../i18n/glossaryText.js"; // #sprache: Glossartext zur Anzeigezeit
import { FactionShell, PanelSkills, CounterCell, YieldMeter } from "./indicators/panelKit.jsx";
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

export function HeatBar({ heat, skills = [], ash = 0, forged = {}, ashBurned = 0, brandTotal = 0, fireBase = 0, fireWhite = 0, options = {}, onOption, manyActive = false, showSkills = false }) {
  if (!heat || !heat.active) return null;
  const { value, max } = heat;
  // Weißglut (#fire-balance): die Hitze über 100 % staut sich als ÜBERHITZUNG in `heat.over` (eigener Sub-Akku, s.
  // constants.js). Die Leiste wächst deshalb auf 0–150 %, sobald der Skill gehalten wird — mit heller Marke bei 100.
  const whiteHeat = fireFlag(skills, "whiteHeat");
  const over = whiteHeat ? Math.max(0, heat.over || 0) : 0;
  const scale = whiteHeat ? max + OVERHEAT_MAX : max;   // Bezugsgröße ALLER Leisten-Geometrie (Füllung, Schwellenstriche)
  const pct = Math.max(0, Math.min(100, (value / scale) * 100));
  const overPct = Math.max(0, Math.min(100, (over / scale) * 100));
  const hot = value >= 50;                         // Glühende-Klinge-Schwelle
  // #234: Feuer darf mehrere Hitze-Konsumenten halten → je Typ prüfen (nicht nur den ersten).
  const conflagReady = hasHeatConsumer(skills, "conflagration") && value >= 100;
  // #219.5: Glühende Klinge markiert die ECHTEN Schwellen (40/70/100; 100 = volle Hitze) statt fälschlich 50 %.
  const glow = fireFlag(skills, "glowingBlade");
  const atMax = value >= max;
  const whiteGlow = whiteHeat && (atMax || over > 0);
  const overBonus = Math.round(over * OVERHEAT_SCORE_STEP * 100); // % Feuer-Score aus der Überhitzung (Ablesung)

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
    // #fire-balance: die oberen Stufen hängen zusätzlich am Segment-Fenster (glowMarginFor) — das Abzeichen muss es
    // mitlesen, sonst zeigte es +3, wo im Stich nur +1 wirkt.
    const gv = glowingValueFor(value, skills, glowMarginFor(heat));
    badges.push({ k: "gk", t: gv > 0 ? t("bar.fire.badge.glow.n", { n: gv }) : t("bar.fire.badge.glow"), c: HOT, dim: gv === 0,
      title: t("bar.fire.badge.glow.title", { v1: GLOWING_T1_VALUE, h1: GLOWING_T1_HEAT, v2: GLOWING_T2_VALUE, h2: GLOWING_T2_HEAT,
                                              m2: GLOWING_T2_MARGIN, v3: GLOWING_T3_VALUE, h3: GLOWING_T3_HEAT, m3: GLOWING_T3_MARGIN }) });
  }
  // #fire-balance: Funkenflug war die einzige Feuer-Mechanik ohne jede Anzeige — man sah nie, wie viel im Speicher
  // liegt und wann er ausschüttet. Dasselbe feste Readout wie Feuerwalze/Glühende Klinge.
  if (fireFlag(skills, "sparkflight")) {
    const st = Math.round(heat.sparkStore || 0);
    badges.push({ k: "ff", t: st > 0 ? t("bar.fire.badge.spark.n", { n: grp(st) }) : t("bar.fire.badge.spark"), c: WHITE_HEAT, dim: st === 0,
      title: t("bar.fire.badge.spark.title", { m: SPARKFLIGHT_MIN_MARGIN }) });
  }

  // Phase-3-Headline: „gleich knallt's"-Zustand für die einklappbare Fraktions-Zeile.
  const collapsed = options.collapseFacFire ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacFire: !collapsed });
  const stateText = conflagReady ? t("bar.fire.state.conflag")
    : over > 0 ? t("bar.fire.state.over", { n: overBonus })
    : whiteGlow ? t("bar.fire.state.white")
    : t("bar.fire.state.heat", { value: Math.round(value), max });
  const stateOn = conflagReady || whiteGlow || hot;

  // #deckshop: Feuer-Glut wandert vom Battlefield ins eigene Panel — warme Innen-Aura, Deckkraft = Hitze; Puls nahe voll.
  const heatRatio = Math.max(0, Math.min(1, (value + over) / max));
  const ambient = heatRatio > 0.02
    ? `inset 0 -22px 48px -14px rgba(224,113,74,${(0.55 * heatRatio).toFixed(2)}), inset 0 0 34px rgba(240,168,58,${(0.14 * heatRatio).toFixed(2)})`
    : null;
  const ambientPulse = heatRatio >= 0.9 ? "as-heat-pulse" : null;

  return (
    <FactionShell icon={<FactionIcon type="fire" size={15} />} name={archetypeLabel("fire")} color={FIRE} stateText={stateText} stateOn={stateOn} collapsed={collapsed} onToggle={onToggle}
      footer={showSkills ? <PanelSkills skills={skills} arch="fire" color={FIRE} /> : null}
      ambient={ambient} ambientPulse={ambientPulse}>
      {/* #270.2 Eigen-Score auf einen Blick: nach Fantasie (Feuer-Grund / Überlauf) + verbrannte Asche (Lauf-Zähler).
          Der Überlauf-Kanal summiert BEIDE Überlauf-Pfade — Weißglut (Hitze über 100 %) und Ascheglut (Asche über die
          Schmiede-Kapazität); deshalb heißt er neutral „Überlauf" und nicht nach einem der beiden (Sprachprüfung B1). */}
      <div className="mb-2">
        <YieldMeter title={t("bar.fire.yield")} accent={HOT} channels={[
          { label: t("bar.fire.yield.base"), value: fireBase, color: FIRE_HOT },
          { label: t("bar.fire.yield.over"), value: fireWhite, color: WHITE_HEAT, hint: t("bar.fire.yield.over.hint") },
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
            <span className="font-bold" style={{ color: whiteGlow ? WHITE_HEAT : hot ? HOT : FIRE }}>{Math.round(value + over)} / {scale}</span>
          </div>
          <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}>
            <div className="absolute inset-y-0 left-0 transition-all"
              style={{ width: `${pct}%`,
                       background: hot ? `linear-gradient(90deg, ${FIRE}, ${HOT})` : FIRE,
                       boxShadow: conflagReady ? `0 0 8px ${HOT}` : hot ? `0 0 6px ${FIRE}88` : undefined }} />
            {glow && [GLOWING_T1_HEAT, GLOWING_T2_HEAT].map((t) => (
              <div key={t} className="absolute inset-y-0" style={{ left: `${(t / scale) * 100}%`, width: 2, background: "#ffffff55" }}
                title={tr("bar.fire.tick.glow", { n: t })} />
            ))}
            {/* #fire-balance: Überhitzungszone — eigenes Segment RECHTS der 100-%-Marke, damit sichtbar bleibt, dass
                sie ein zweiter Akku ist und nicht mehr Hitze (alles unter 100 % liest weiter `value`, s. constants.js).
                Die Marke steht auch bei leerer Zone, sonst wüsste man nicht, wo die normale Leiste endet. */}
            {whiteHeat && (<>
              <div className="absolute inset-y-0 transition-all"
                style={{ left: `${(max / scale) * 100}%`, width: `${overPct}%`,
                         background: `linear-gradient(90deg, ${HOT}, ${WHITE_HEAT})`,
                         boxShadow: over > 0 ? `0 0 9px ${WHITE_HEAT}, 0 0 4px #ffffff` : undefined }}
                title={t("bar.fire.tick.white", { n: Math.round(OVERHEAT_SCORE_STEP * 100), max: max + OVERHEAT_MAX })} />
              <div className="absolute inset-y-0" style={{ left: `${(max / scale) * 100}%`, width: 2, background: `${WHITE_HEAT}99` }}
                title={tr("bar.fire.tick.full")} />
            </>)}
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((b) => (
                <span key={b.k} className="text-[10px] px-1.5 py-0.5 rounded font-semibold" title={b.title}
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
