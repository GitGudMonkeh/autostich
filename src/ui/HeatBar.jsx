import { fireFlag, heatConsumerOf } from "../game/skills.js";

// 🔥 Hitze (Feuer-Archetyp, #93 F1) — eigener Block zwischen Battlefield und Build-Panel, analog zur ⚡ Ladung.
// Kontinuierliche Leiste 0–100 (Sonnenkern 150). Nur sichtbar, sobald ein Feuer-Skill aktiv ist.
const FIRE = "#e0714a";
const HOT = "#f0a83a"; // heißes Ende des Verlaufs (ab ~50 %)

export function HeatBar({ heat, skills = [] }) {
  if (!heat || !heat.active) return null;
  const { value, max } = heat;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const hot = value >= 50;                         // Glühende-Klinge-Schwelle
  const consumer = heatConsumerOf(skills);         // "conflagration" | "melt" | null
  const conflagReady = consumer === "conflagration" && value >= 100;
  // 100er-Marke nur bei Sonnenkern (max 150) sinnvoll — zeigt, wo die volle Standard-Hitze liegt.
  const hundredMark = max > 100 ? (100 / max) * 100 : null;
  // Schwellenmarke bei 50 % nur, wenn Glühende Klinge gehalten wird.
  const glowMark = fireFlag(skills, "glowingBlade") ? (50 / max) * 100 : null;

  const badges = [];
  if (heat.afterglowArmed) badges.push({ k: "ng", t: "Nachglut bereit", c: "#f0c05a" });
  if ((heat.fireRoll || 0) > 0) badges.push({ k: "fw", t: `Feuerwalze +${heat.fireRoll}`, c: HOT });
  if (heat.phoenixArmed) badges.push({ k: "px", t: "Phönix +10", c: "#f07a5a" });

  return (
    <div className="rounded-xl p-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="opacity-60">🔥 Hitze{conflagReady && <span style={{ color: HOT }}> · FLÄCHENBRAND BEREIT</span>}</span>
        <span className="font-bold" style={{ color: hot ? HOT : FIRE }}>{Math.round(value)} / {max}</span>
      </div>
      <div className="relative rounded-sm overflow-hidden" style={{ height: 12, background: "#26262e" }}>
        <div className="absolute inset-y-0 left-0 transition-all"
          style={{ width: `${pct}%`,
                   background: hot ? `linear-gradient(90deg, ${FIRE}, ${HOT})` : FIRE,
                   boxShadow: conflagReady ? `0 0 8px ${HOT}` : hot ? `0 0 6px ${FIRE}88` : undefined }} />
        {glowMark != null && (
          <div className="absolute inset-y-0" style={{ left: `${glowMark}%`, width: 2, background: "#ffffff55" }} title="Glühende Klinge ab 50 %" />
        )}
        {hundredMark != null && (
          <div className="absolute inset-y-0" style={{ left: `${hundredMark}%`, width: 2, background: "#ffffff88" }} title="100 % (Standard-Maximum)" />
        )}
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {badges.map((b) => (
            <span key={b.k} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: `${b.c}22`, color: b.c, border: `1px solid ${b.c}66` }}>{b.t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
