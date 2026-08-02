import { useMemo } from "react";
import { cycleLenFor } from "../game/shop.js";
import { summarizeFormations } from "../game/formations.js";
import { precomputeArchitect, architectValueBonus } from "../game/architect.js";
import { hasCritPerk, critMultiplierFor, totalCritChanceRaw } from "../game/perks.js";
import { hasCritFamily } from "../game/families.js";
import { Sparkline } from "./Sparkline.jsx";
import { ScoreSourceBar, sourceShares } from "./RunGraphs.jsx";

// #252: einklappbarer Panel-Abschnitt (Kopf mit ▸/▾ togglet; Inhalt nur bei !collapsed). Der Zustand kommt aus den
// Optionen (über Runs gemerkt) — der Kopf ruft onToggle, das die Option persistiert.
function Collapsible({ title, collapsed, onToggle, children }) {
  return (
    <div className="pt-1 border-t" style={{ borderColor: "#26262e" }}>
      <button type="button" onClick={onToggle} data-sfx="none"
        className="w-full flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-50 hover:opacity-80"
        style={{ background: "transparent" }} aria-expanded={!collapsed}>
        <span className="inline-block w-2 text-center" aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
        <span>{title}</span>
      </button>
      {!collapsed && <div className="mt-1">{children}</div>}
    </div>
  );
}

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

export function StatusRail({ state, currentTraj = [], recordTraj = [], options = {}, onOption }) {
  const { wins, losses, ties, trickNo, winStreak, bestStreak, pos, perks, crits, lightning,
          familyTiers = {}, statCritChance = 0, statCritMult = 0, statFormMult = 0, statStreakMult = 0 } = state;
  const cycleLen = cycleLenFor(state.shop);  // 40, mit Zeitsegment 45 (§8 A-L1)
  // #UI: Stich-Siegesquote — Anteil gewonnener an den ENTSCHIEDENEN Stichen (Gleichstände zählen nicht). Ersetzt die
  // Durchlauf-Zelle (Durchlauf steht bereits im Kopf-Panel). Rot <50 %, grün ≥50 %.
  const decided = wins + losses;
  const winPct = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  const fmtMult = (x) => x.toFixed(2).replace(".", ",");
  const showCrit = hasCritPerk(perks) || hasCritFamily(familyTiers) || (crits || 0) > 0 || !!(lightning && lightning.active) || statCritChance > 0 || statCritMult > 0;
  // Live-Crit-Chance des NÄCHSTEN Siegs: analog zum echten Wurf (#19). V2: Perks tragen keine Crit-Chance
  // mehr bei — die Blitz-Crit-Basis (lightning) + der Crit-Chance-Stat fließen additiv ein, dieselbe Rechnung
  // wie die Engine (kein Drift).
  const critRaw = totalCritChanceRaw(state);
  // #181: Gesamt-Crit-Chance UNGEKLEMMT anzeigen (kann > 100 % sein — der Überschuss speist L6 „Raserei" und
  // Familie D „Überschusskrit"). Nur nach unten bei 0 begrenzen; KEIN Math.min(1, …) mehr (das war nur Anzeige;
  // der echte Wurf bleibt in der Engine bei engine.js:302 geklemmt).
  const critPct = Math.round(Math.max(0, critRaw) * 100);
  // #123/#UI: Formations-Bonus der aktuellen Aufstellung dauerhaft sichtbar (gleiche Quelle wie die
  // Formationsphase → kein Drift). Als SUMME aller Positionen in % (Σ(mult−1)·100) — nicht mehr max/aktuelle Position.
  const { count: formCount } = summarizeFormations(state.formations || []);
  const formBonusPct = Math.round((state.formations || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0) * 100);
  // #UI: Gebäude-Bonus — Summe über ALLE Gebäude in % (nicht nur die aktuelle Position). Kombiniert die beiden
  // %-fähigen Effektarten: (a) Wert-Boosts der value-Gebäude („+N") relativ zum Basis-Kartenwert der gebufften Karten
  // + (b) multiplikative Boni (Struktur-Zeile/Spalte/Diagonale × Schatzkammer-Mult) als Σ(mult−1). Rein flache/bedingte
  // Score-Gebäude (Punktebonus/Serie/Crit) lassen sich nicht als stabiler %-Wert ausdrücken → hier nicht enthalten.
  const buildBonusPct = useMemo(() => {
    const architect = state.architect;
    if (!(state.architectEnabled && architect && (architect.buildings || []).length)) return 0;
    const order = state.playerOrder || [], deck = state.deck || [];
    const pre = precomputeArchitect(architect, order, deck);
    let boost = 0, base = 0, multSum = 0;
    for (let p = 0; p < order.length; p++) {
      const card = deck[order[p]];
      if (card) { const b = architectValueBonus(pre, p, card); if (b > 0) { boost += b; base += card.value; } }
      const sc = pre.score[p];
      const m = (pre.segFactor[p] || 1) * (sc && sc.kind === "mult" ? sc.factor : 1);
      if (m > 1) multSum += m - 1;
    }
    const valueFrac = base > 0 ? boost / base : 0;
    return Math.round((valueFrac + multSum) * 100);
  }, [state.architect, state.architectEnabled, state.playerOrder, state.deck]);
  return (
    <div className="rounded-xl p-4 grid gap-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Serie" tone={winStreak >= 3 ? "#e0605a" : undefined}
          value={<span>{winStreak > 0 ? `${winStreak}×` : "–"}<span className="text-xs opacity-45 ml-1">best {bestStreak}×</span></span>} />
        <Stat label="Stiche" value={trickNo} />
        <Stat label="Siegquote" tone={decided === 0 ? undefined : (winPct >= 50 ? "#5ab87a" : "#e0605a")} value={decided > 0 ? `${winPct}%` : "–"} />
      </div>
      {/* #225.2: „Quote"-Zeile entfernt — nur Siege/Verluste bleiben (Grid auf 2 Spalten angepasst). */}
      <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
        <div><span className="opacity-50">Siege </span><span style={{ color: "#5ab87a" }}>{wins}</span></div>
        <div><span className="opacity-50">Verl. </span><span style={{ color: "#e0605a" }}>{losses}</span></div>
      </div>
      {/* Deck-Position im laufenden Durchlauf (#193): Balken FÜLLT sich (0 → voll) und die Zahl
          zählt HOCH — gleiche Richtung wie die Deck-Zahl unter dem Deck im Battlefield (#6). */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">Deck-Position</span>
          <span className="opacity-80">{pos} / {cycleLen}</span>
        </div>
        <Bar value={pos} max={cycleLen} color="#8a7de0" height={6} />
      </div>
      {/* Formations-/Gebäude-Bonus als SUMME in % (#123/#UI) — dauerhaft sichtbar, nicht nur transient im Battlefield. */}
      {(formCount > 0 || buildBonusPct > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
          {formCount > 0 && <span><span className="opacity-50">Formation </span><span style={{ color: "#5ab87a" }}>{formCount} · +{formBonusPct} %</span></span>}
          {buildBonusPct > 0 && <span title="Summe aller Gebäude-Boni in %: Wert-Boosts (relativ zum Kartenwert) + Struktur-/Schatzkammer-Multiplikatoren"><span className="opacity-50">Gebäude </span><span style={{ color: "#d4a63a" }}>+{buildBonusPct} %</span></span>}
        </div>
      )}
      {/* Crit (#19/#46). Der Gesamt-Score-Mult steht dauerhaft im Header-Chip (#37).
          Frühere D4/D7-Hinweise sind mit der Score-Familien-Migration (#167) entfernt; familienspezifische
          Crit-/Score-Hinweise folgen mit #166 UI. */}
      {showCrit && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
          <span><span className="opacity-50">Crit-Chance </span><span style={{ color: "#e879f9" }}>{critPct}%</span></span>
          <span><span className="opacity-50">Crit </span><span style={{ color: perks.includes("L5") ? "#d4a63a" : "#e879f9" }}>×{fmtMult(critMultiplierFor(perks, { rawCrit: critRaw }, statCritMult))}</span>{perks.includes("L5") && <span style={{ color: "#d4a63a" }}> Jackpot</span>}</span>
          <span><span className="opacity-50">Crits </span><span style={{ color: "#e879f9" }}>{crits || 0}</span></span>
        </div>
      )}
      {/* Score-Stats (V2 §22.3): Serien-/Formations-Stat, die nicht bereits über die Crit-Zeile sichtbar sind. */}
      {(statStreakMult > 0 || statFormMult > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1 border-t" style={{ borderColor: "#26262e" }}>
          {statStreakMult > 0 && <span title="Serien-Stat: +0,5 % Score je Pick pro aktuellem Serienpunkt"><span className="opacity-50">Serien-Stat </span><span style={{ color: "#5a8ade" }}>+{(statStreakMult * 100).toFixed(1).replace(".", ",")} %/Serie</span></span>}
          {statFormMult > 0 && <span title="Formations-Stat: +5 % Score je Pick bei aktiver Formation (ab Phase mit Formationen wirksam)"><span className="opacity-50">Form-Stat </span><span style={{ color: "#5a8ade" }}>+{Math.round(statFormMult * 100)} %</span></span>}
        </div>
      )}
      {/* #252: Score-Quellen-Balken LIVE (geteilte Komponente mit dem Victory-Screen) — einklappbar, default eingeklappt,
          Zustand über Runs gemerkt. Nur zeigen, wenn schon Score da ist. */}
      {sourceShares(state).score > 0 && (
        <Collapsible title="Woraus kommt der Score"
          collapsed={options.collapseScoreSource ?? true}
          onToggle={() => onOption && onOption({ collapseScoreSource: !(options.collapseScoreSource ?? true) })}>
          <ScoreSourceBar state={state} showTitle={false} />
        </Collapsible>
      )}
      {/* Score-Verlauf: aktueller Lauf vs. Rekord/Geist (#30) — einklappbar, default eingeklappt (#252). */}
      <Collapsible title="Score-Verlauf"
        collapsed={options.collapseScoreTrend ?? true}
        onToggle={() => onOption && onOption({ collapseScoreTrend: !(options.collapseScoreTrend ?? true) })}>
        <div className="flex items-center justify-end text-[10px] normal-case tracking-normal opacity-60 mb-1">
          <span className="flex gap-2">
            <span style={{ color: "#d4a63a" }}>Lauf</span>
            {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>Rekord</span> : <span className="opacity-40">erster Lauf</span>}
          </span>
        </div>
        <Sparkline current={currentTraj} record={recordTraj} />
      </Collapsible>
    </div>
  );
}
