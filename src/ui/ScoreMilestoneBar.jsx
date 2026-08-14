// Score-Meilenstein-Balken — „oben am Battlefield" (docs §6), im NORMALEN Lauf NACH dem Onboarding sichtbar (dann
// zählen die SP-Meilensteine, isSpRun). Füllt sich mit dem AKTUELLEN Lauf-Score über vier gleich breite Segmente
// (25/50/75/100 Mio) und WECHSELT AN JEDEM MEILENSTEIN DIE FARBE (kühl → warm/gold). Nicht-lineare Skalierung:
// jeder Meilenstein = ein Viertel der Leiste. Bewusst grob (Balatro-Geist) — rein informativ, keine Engine-Kopplung.
import { milestoneBarState } from "../game/progression.js";
import { normalizeActive } from "../game/challenges.js"; // #301: Challenge-Ziel-Fortschritt (zweite Leiste)

// Aufsteigende Neon-Palette (Logo-Verlauf): Farbe je erreichter Stufe 0..4 — Cyan → Grün → Blau → Violett → Gold.
const TIER = ["#26c6e6", "#4ade80", "#5a8ade", "#9b82f0", "#f2a83a"];
const TIER_HI = ["#5fe0f7", "#86efac", "#93b4f2", "#b3a8f5", "#f5c76a"];
const mio = (n) => `${Math.round(n / 1_000_000)} Mio`;

/* #301 Zweite Leiste (nur im Challenge-Lauf): Fortschritt zum höchsten aktiven Ziel-Limit. Die Leiste läuft von ROT über
   GELB nach GRÜN (Farbe am Füll-Rand = Fortschritt); Marken sitzen an den Zwischenzielen (50/75 Mio). Voll & grün = alle
   Ziele erreicht. Rein informativ. */
function ChallengeTargetBar({ score, challengeMods }) {
  const list = normalizeActive(challengeMods);
  if (!list.length) return null;
  const targets = list.map((c) => c.target);
  const maxT = Math.max(...targets);
  const prog = Math.max(0, Math.min(1, score / maxT));
  const pct = Math.round(prog * 100);
  const reached = targets.filter((t) => score > t).length;
  const allDone = reached >= targets.length;
  return (
    <div className="mt-2 pt-2" style={{ borderTop: "1px solid #2a1a1c" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: "#ff9a9a" }}>
          ⚔ Challenge-Ziel {reached}/{targets.length}
        </span>
        <span className="text-[10px] font-semibold" style={{ color: allDone ? "#86efac" : "#9a9aa6" }}>
          {allDone ? "alle Ziele erreicht" : `${pct}% · Ziel ${mio(maxT)}`}
        </span>
      </div>
      {/* Voller Rot→Gelb→Grün-Verlauf; die noch nicht erreichte Strecke wird rechts abgedeckt → sichtbare Farbe = Fortschritt. */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#0e0e13" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,#e05555 0%,#f2c14a 55%,#4ade80 100%)" }} />
        <div className="absolute inset-y-0 transition-[left] duration-500" style={{ left: `${pct}%`, right: 0, background: "#0e0e13" }} />
        {targets.map((t, i) => (t < maxT ? (
          <i key={i} className="absolute inset-y-0" style={{ left: `${(t / maxT) * 100}%`, width: 1.5, background: "#0e0e13" }} />
        ) : null))}
        {allDone && <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 8px #4ade80aa" }} />}
      </div>
    </div>
  );
}

export function ScoreMilestoneBar({ score = 0, challengeMods = [] }) {
  const { reached, total, fill, atMax, spSoFar, next } = milestoneBarState(score);
  const acc = TIER[Math.min(reached, TIER.length - 1)];
  const accHi = TIER_HI[Math.min(reached, TIER_HI.length - 1)];
  const pct = Math.round(fill * 100);

  // Panel-Rahmen: NUR ein crisper Rahmen in der STUFENFARBE (acc) auf flachem Grund — kein Glow, kein Tint (clean).
  // Wächst mit dem Fortschritt mit (Cyan→Grün→Blau→Violett→Gold, wie Balken & Zahl); Farbwechsel sanft überblendet.
  const frame = {
    background: "#141019",
    border: `1px solid ${acc}66`,
    transition: "border-color .5s ease",
  };

  return (
    <div className="rounded-xl px-3 py-2" style={frame}
      title={atMax ? "Alle Score-Meilensteine erreicht" : `Nächster Meilenstein: ${mio(next.at)} (+${next.sp} SP)`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: accHi }}>
          💠 Meilensteine {reached}/{total}{spSoFar > 0 ? ` · +${spSoFar} SP` : ""}
        </span>
        <span className="text-[10px] font-semibold" style={{ color: atMax ? accHi : "#9a9aa6" }}>
          {atMax ? "Maximum · +5 SP" : `→ ${mio(next.at)} +${next.sp}`}
        </span>
      </div>
      {/* Balken — grob: Fill-Level ohne harte Score-Zahl; Farbe = erreichte Stufe. Meilenstein-Marken an den Vierteln. */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#0e0e13" }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${acc}, ${accHi})`, boxShadow: pct > 92 ? `0 0 8px ${acc}aa` : "none" }} />
        {/* Segmentgrenzen (25/50/75 %) als dünne dunkle Marken — visualisieren die vier Meilenstein-Viertel. */}
        {Array.from({ length: total - 1 }, (_, i) => (
          <i key={i} className="absolute inset-y-0" style={{ left: `${(i + 1) / total * 100}%`, width: 1.5, background: "#0e0e13" }} />
        ))}
      </div>
      {/* #301 Challenge-Lauf: zweite Leiste — Fortschritt zum Ziel-Limit (rot → gelb → grün). */}
      <ChallengeTargetBar score={score} challengeMods={challengeMods} />
    </div>
  );
}
