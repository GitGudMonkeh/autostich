import { TRICKS_PER_CYCLE, MAX_CYCLES } from "../game/constants.js";
import { critChanceRawFor, hasCritPerk, critMultiplierFor } from "../game/perks.js";
import { lightningCritRaw } from "../game/skills.js";
import { Sparkline } from "./Sparkline.jsx";

function Bar({ value, max, color, height = 8 }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: "#26262e", height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-wide opacity-50">{label}</div>
      <div className="text-lg font-bold" style={{ color: tone || "#e8e8ea" }}>{value}</div>
    </div>
  );
}

export function StatusRail({ state, currentTraj = [], recordTraj = [] }) {
  const { wins, losses, ties, cycle, trickNo, winStreak, bestStreak, pos, perks, crits, legendaryCritBonus = 0, lightning, skills = [],
          statCritChance = 0, statCritMult = 0, statFormMult = 0, statStreakMult = 0 } = state;
  const remaining = TRICKS_PER_CYCLE - pos; // Karten bis zum nächsten Mischen (#6)
  const decided = wins + losses;            // Gleichstände zählen nicht als entschieden (§4.4)
  const winPct = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  const fmtMult = (x) => x.toFixed(2).replace(".", ",");
  const ownsD4 = perks.includes("D4");
  const showCrit = hasCritPerk(perks) || (crits || 0) > 0 || !!(lightning && lightning.active) || statCritChance > 0 || statCritMult > 0;
  // Live-Crit-Chance des NÄCHSTEN Siegs: D8 nutzt die resultierende Serie (winStreak+1), analog zum
  // echten Wurf (#19). D7 ist kartenabhängig → hier ausgeblendet (winValue 0), separat als Hinweis.
  // legendaryCritBonus (L4) & L5-Halbierung fließen über denselben Helfer ein → kein Drift (#25/#33).
  // Blitz-Crit-Basis (lightning) + Crit-Chance-Stat fließen additiv ein — dieselbe Rechnung wie die Engine.
  const critRaw = critChanceRawFor(perks, { winValue: 0, winStreak: winStreak + 1, wins: wins + 1, trickNo, posInCycle: pos }, legendaryCritBonus) + lightningCritRaw(lightning, skills) + statCritChance;
  const critPct = Math.round(Math.min(1, Math.max(0, critRaw)) * 100);
  const ownsD7 = perks.includes("D7");
  const l4Pp = Math.round(legendaryCritBonus * 100); // L4-Bonus in Prozentpunkten (Anzeige)
  return (
    <div className="rounded-xl p-4 grid gap-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Serie" tone={winStreak >= 3 ? "#e0605a" : undefined}
          value={<span>{winStreak > 0 ? `${winStreak}×` : "–"}<span className="text-xs opacity-45 ml-1">best {bestStreak}×</span></span>} />
        <Stat label="Stiche" value={trickNo} />
        <Stat label="Durchlauf" value={<span>{Math.min(cycle + 1, MAX_CYCLES)}<span className="text-xs opacity-45"> / {MAX_CYCLES}</span></span>} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
        <div><span className="opacity-50">Siege </span><span style={{ color: "#5ab87a" }}>{wins}</span></div>
        <div><span className="opacity-50">Verl. </span><span style={{ color: "#e0605a" }}>{losses}</span></div>
        <div><span className="opacity-50">Quote </span><span style={{ color: winPct >= 50 ? "#5ab87a" : "#e0605a" }}>{winPct}%</span></div>
      </div>
      {/* Rest-Karten des laufenden Deck-Durchlaufs (#6) */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Deck bis zum Mischen</span>
          <span className="opacity-80">{remaining} / {TRICKS_PER_CYCLE}</span>
        </div>
        <Bar value={remaining} max={TRICKS_PER_CYCLE} color="#8a7de0" height={6} />
      </div>
      {/* Crit (#19/#46). Der Gesamt-Score-Mult steht dauerhaft im Header-Chip (#37). */}
      {(ownsD4 || showCrit) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
          {ownsD4 && <span className="opacity-45">×3 bei Rang ≤3</span>}
          {showCrit && (<>
            <span><span className="opacity-50">Crit-Chance </span><span style={{ color: "#e879f9" }}>{critPct}%</span>{ownsD7 && <span className="opacity-45"> (+35% ≥8)</span>}{l4Pp > 0 && <span style={{ color: "#d4a63a" }}> (L4 +{l4Pp}pp)</span>}</span>
            <span><span className="opacity-50">Crit </span><span style={{ color: perks.includes("L5") ? "#d4a63a" : "#e879f9" }}>×{fmtMult(critMultiplierFor(perks, {}, statCritMult))}</span>{perks.includes("L5") && <span style={{ color: "#d4a63a" }}> Jackpot</span>}</span>
            <span><span className="opacity-50">Crits </span><span style={{ color: "#e879f9" }}>{crits || 0}</span></span>
          </>)}
        </div>
      )}
      {/* Score-Stats (V2 §22.3): Serien-/Formations-Stat, die nicht bereits über die Crit-Zeile sichtbar sind. */}
      {(statStreakMult > 0 || statFormMult > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
          {statStreakMult > 0 && <span title="Serien-Stat: +0,5 % Score je Pick pro aktuellem Serienpunkt"><span className="opacity-50">Serien-Stat </span><span style={{ color: "#5a8ade" }}>+{(statStreakMult * 100).toFixed(1).replace(".", ",")} %/Serie</span></span>}
          {statFormMult > 0 && <span title="Formations-Stat: +5 % Score je Pick bei aktiver Formation (ab Phase mit Formationen wirksam)"><span className="opacity-50">Form-Stat </span><span style={{ color: "#5a8ade" }}>+{Math.round(statFormMult * 100)} %</span></span>}
        </div>
      )}
      {/* Score-Verlauf: aktueller Lauf vs. Rekord/Geist (#30) */}
      <div className="pt-1 border-t" style={{ borderColor: "#26262e" }}>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide opacity-50 mb-1">
          <span>Score-Verlauf</span>
          <span className="flex gap-2 normal-case tracking-normal">
            <span style={{ color: "#d4a63a" }}>Lauf</span>
            {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>Rekord</span> : <span className="opacity-40">erster Lauf</span>}
          </span>
        </div>
        <Sparkline current={currentTraj} record={recordTraj} />
      </div>
    </div>
  );
}
