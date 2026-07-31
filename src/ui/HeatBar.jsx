import { fireFlag, heatConsumerOf } from "../game/skills.js";
import { IndicatorPanel, CounterCell } from "./indicators/panelKit.jsx";
import { FIRE, FIRE_HOT, ASH, FORGE, WHITE_HEAT } from "./indicators/vocab.js";

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

export function HeatBar({ heat, skills = [], ash = 0, forged = {} }) {
  if (!heat || !heat.active) return null;
  const { value, max } = heat;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const hot = value >= 50;                         // Glühende-Klinge-Schwelle
  const consumer = heatConsumerOf(skills);         // "conflagration" | "melt" | null
  const conflagReady = consumer === "conflagration" && value >= 100;
  // Schwellenmarke bei 50 % nur, wenn Glühende Klinge gehalten wird.
  const glowMark = fireFlag(skills, "glowingBlade") ? (50 / max) * 100 : null;
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
    badges.push({ k: "fw", t: fr > 0 ? `Feuerwalze +${fr}` : "Feuerwalze", c: HOT, dim: fr === 0 });
  }

  return (
    <IndicatorPanel>
      <div className="flex items-stretch gap-3">
        {/* Hitzeleiste (Hauptelement) */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="opacity-60">🔥 Hitze
              {conflagReady && <span style={{ color: HOT }}> · FLÄCHENBRAND BEREIT</span>}
              {whiteGlow && <span style={{ color: WHITE_HEAT }}> · WEISSGLUT</span>}
            </span>
            <span className="font-bold" style={{ color: whiteGlow ? WHITE_HEAT : hot ? HOT : FIRE }}>{Math.round(value)} / {max}</span>
          </div>
          <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}>
            <div className="absolute inset-y-0 left-0 transition-all"
              style={{ width: `${pct}%`,
                       background: hot ? `linear-gradient(90deg, ${FIRE}, ${HOT})` : FIRE,
                       boxShadow: conflagReady ? `0 0 8px ${HOT}` : hot ? `0 0 6px ${FIRE}88` : undefined }} />
            {glowMark != null && (
              <div className="absolute inset-y-0" style={{ left: `${glowMark}%`, width: 2, background: "#ffffff55" }} title="Glühende Klinge ab 50 %" />
            )}
            {/* Weißglut-Kappe am heißen Ende — „brennt weiß aus" bei voller Hitze (kein Zähler, s. o.). */}
            {whiteHeat && (
              <div className="absolute inset-y-0 right-0 transition-all"
                style={{ width: atMax ? 7 : 5,
                         background: `linear-gradient(90deg, transparent, ${WHITE_HEAT})`,
                         opacity: atMax ? 1 : 0.45,
                         boxShadow: atMax ? `0 0 9px ${WHITE_HEAT}, 0 0 4px #ffffff` : undefined }}
                title="Weißglut: bei voller Hitze wird jeder Überschuss zu +10 Score je überlaufendem Hitzepunkt" />
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
              <CounterCell icon={<AshIcon />} value={ash} label="Asche" color={ASH} dim={ash === 0}
                title="Asche — Brandmarken sammeln sie; die Ascheschmiede wandelt sie in dauerhaften Kartenwert." />
            )}
            {showForge && (
              <CounterCell icon={<AnvilIcon />} value={`+${totalForged}`} label="Schmiede" color={FORGE}
                glow={totalForged > 0} dim={totalForged === 0}
                title="Geschmiedeter Dauerwert — Summe der ⚒-Aufwertungen über alle Karten." />
            )}
          </div>
        )}
      </div>
    </IndicatorPanel>
  );
}
