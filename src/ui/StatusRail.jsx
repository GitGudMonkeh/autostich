import { TRICKS_PER_CYCLE } from "../game/constants.js";
import { critChanceRawFor, hasCritPerk, tempoScoreMultFor, critMultiplierFor } from "../game/perks.js";
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

export function StatusRail({ state, speedPct, lossSurcharge = 0, currentTraj = [], recordTraj = [] }) {
  const { life, maxLife, score, wins, losses, ties, cycle, trickNo, winStreak, bestStreak, pos, lastTrick, perks, crits, shield, legendaryCritBonus = 0, tempTempo = 0, lightning, skills = [] } = state;
  const remaining = TRICKS_PER_CYCLE - pos; // Karten bis zum nächsten Mischen (#6)
  const decided = wins + losses;            // Gleichstände zählen nicht als entschieden (§4.4)
  const winPct = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  // Effektives Tempo = permanentes speedPct + temporäres tempTempo (E9 Hochlauf / E10 Ruhe, #83).
  // Speist Anzeige UND — via denselben Helfer — den Tempo-Score, sodass Anzeige == echter Score (kein Drift).
  const effTempo = (speedPct || 0) + (tempTempo || 0);
  // Gesamt-Score-Mult sitzt dauerhaft im Header-Chip (#37) — hier NICHT doppeln (#46).
  // Nur der Tempo-Score-Anteil (monoton, poppt nicht) bleibt im Panel sichtbar.
  const fmtMult = (x) => x.toFixed(2).replace(".", ",");
  const tempoScoreMult = tempoScoreMultFor(perks, effTempo);
  const ownsD4 = perks.includes("D4");
  const showCrit = hasCritPerk(perks) || (crits || 0) > 0 || !!(lightning && lightning.active);
  // Live-Crit-Chance des NÄCHSTEN Siegs: D8 nutzt die resultierende Serie (winStreak+1), analog zum
  // echten Wurf (#19). D7 ist kartenabhängig → hier ausgeblendet (winValue 0), separat als Hinweis.
  // legendaryCritBonus (L4) & L5-Halbierung fließen über denselben Helfer ein → kein Drift (#25/#33).
  // Blitz-Crit-Basis (lightning) fließt additiv ein — dieselbe Rechnung wie die Engine → kein Drift.
  const critRaw = critChanceRawFor(perks, { winValue: 0, winStreak: winStreak + 1, wins: wins + 1, trickNo, posInCycle: pos, speedPct }, legendaryCritBonus) + lightningCritRaw(lightning, skills);
  const critPct = Math.round(Math.min(1, Math.max(0, critRaw)) * 100);
  const ownsD7 = perks.includes("D7");
  const l4Pp = Math.round(legendaryCritBonus * 100); // L4-Bonus in Prozentpunkten (Anzeige)
  // L3 „Letztes Aufbäumen" aktiv? (nur wenn gehalten und Leben ≤ 25 %)
  const lowLifeRally = perks.includes("L3") && maxLife > 0 && life / maxLife <= 0.25;
  // Leben-Balken bei Schaden/Heilung kurz aufblitzen (#15).
  const lifeFlash = lastTrick ? (lastTrick.result === "loss" && lastTrick.dmg > 0 ? "#e0605a" : lastTrick.healed > 0 ? "#5ab87a" : null) : null;
  // Passiver Indikator des aktuellen Zeit-Aufschlags PRO NIEDERLAGE (#85): grün → gelb → rot je Härte.
  const drainColor = lossSurcharge <= 20 ? "#5ab87a" : lossSurcharge <= 80 ? "#d4a63a" : "#e0605a";
  return (
    <div className="rounded-xl p-4 grid gap-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      {/* Leben */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Leben {shield > 0 && <span style={{ color: "#5a8ade" }}>· 🛡 {shield}</span>}</span>
          <span className="font-bold" style={{ color: "#5ab87a" }}>{life} / {maxLife}</span>
        </div>
        <div className="relative rounded-full">
          <Bar value={life} max={maxLife} color="#5ab87a" height={10} />
          {lifeFlash && <div key={trickNo} className="absolute inset-0 rounded-full pointer-events-none"
            style={{ animation: "as-flash 400ms ease-out", "--flash": lifeFlash }} />}
        </div>
        {/* Zeit-Aufschlag pro Niederlage — passiver Indikator, eskaliert über die Spielzeit (#85). */}
        <div className="flex justify-end mt-1">
          <span className="text-[10px]" style={{ color: drainColor }}
            title="Fortschrittsdruck — je Deck-Durchlauf steigt der Zusatzschaden pro Niederlage: round(0,5·n²) (0, 0, +2, +5, +8, +13 …)">
            Niederlage-Aufschlag +{lossSurcharge}♥
          </span>
        </div>
        {/* L3 „Letztes Aufbäumen" aktiv (#33): deutlicher, aber statischer Status (kein Blinken). */}
        {lowLifeRally && (
          <div className="mt-1.5 rounded px-2 py-1 text-[11px] font-bold text-center"
            style={{ background: "#d4a63a1f", color: "#d4a63a", border: "1px solid #8a7de088" }}>
            ★ LETZTES AUFBÄUMEN — Alle Karten +6
          </div>
        )}
      </div>
      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <Stat label="Serie" tone={winStreak >= 3 ? "#e0605a" : undefined}
          value={<span>{winStreak > 0 ? `${winStreak}×` : "–"}<span className="text-xs opacity-45 ml-1">best {bestStreak}×</span></span>} />
        <Stat label="Stiche" value={trickNo} />
        <Stat label="Durchlauf" value={cycle + 1} />
      </div>
      <div className="grid grid-cols-4 gap-3 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
        <div><span className="opacity-50">Siege </span><span style={{ color: "#5ab87a" }}>{wins}</span></div>
        <div><span className="opacity-50">Verl. </span><span style={{ color: "#e0605a" }}>{losses}</span></div>
        <div><span className="opacity-50">Quote </span><span style={{ color: winPct >= 50 ? "#5ab87a" : "#e0605a" }}>{winPct}%</span></div>
        <div><span className="opacity-50">Tempo </span><span style={{ color: "#5a8ade" }}>+{effTempo}%</span></div>
      </div>
      {/* Rest-Karten des laufenden Deck-Durchlaufs (#6) */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Deck bis zum Mischen</span>
          <span className="opacity-80">{remaining} / {TRICKS_PER_CYCLE}</span>
        </div>
        <Bar value={remaining} max={TRICKS_PER_CYCLE} color="#5a8ade" height={6} />
      </div>
      {/* ⚡ Ladung (Blitz-Archetyp) — nur sichtbar, sobald ein Blitz-Skill aktiv ist (docs/blitz-archetyp.md). */}
      {lightning && lightning.active && (
        <div className="pt-1 border-t" style={{ borderColor: "#26262e" }}>
          <div className="flex justify-between text-xs mb-1">
            <span className="opacity-60">⚡ Ladung{lightning.charge >= lightning.maxCharge && <span style={{ color: "#8a7de0" }}> · VOLL GELADEN</span>}</span>
            <span className="font-bold" style={{ color: "#8a7de0" }}>{lightning.charge} / {lightning.maxCharge}</span>
          </div>
          <Bar value={lightning.charge} max={lightning.maxCharge} color="#8a7de0" height={8} />
        </div>
      )}
      {/* Tempo-Score & Crit (#19/#46). Der Gesamt-Score-Mult steht dauerhaft im Header-Chip (#37);
          hier bewusst nur der Tempo-Score-Anteil — monoton (folgt den Tempo-Perks), poppt nicht. */}
      {(tempoScoreMult > 1.001 || ownsD4 || showCrit) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
          {tempoScoreMult > 1.001 && (
            <span title="Tempo erhöht den Score (Tempo-Perks; L6 verdoppelt den Anteil)"><span className="opacity-50">Tempo-Score </span><span style={{ color: "#5a8ade" }}>×{fmtMult(tempoScoreMult)}</span></span>
          )}
          {ownsD4 && <span className="opacity-45">×3 bei Rang ≤3</span>}
          {showCrit && (<>
            <span><span className="opacity-50">Crit-Chance </span><span style={{ color: "#e879f9" }}>{critPct}%</span>{ownsD7 && <span className="opacity-45"> (+35% ≥8)</span>}{l4Pp > 0 && <span style={{ color: "#d4a63a" }}> (L4 +{l4Pp}pp)</span>}</span>
            <span><span className="opacity-50">Crit </span><span style={{ color: perks.includes("L5") ? "#d4a63a" : "#e879f9" }}>×{fmtMult(critMultiplierFor(perks))}</span>{perks.includes("L5") && <span style={{ color: "#d4a63a" }}> Jackpot</span>}</span>
            <span><span className="opacity-50">Crits </span><span style={{ color: "#e879f9" }}>{crits || 0}</span></span>
          </>)}
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
