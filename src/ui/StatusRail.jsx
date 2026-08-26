import { useMemo } from "react";
import { summarizeFormations } from "../game/formations.js";
import { precomputeArchitect, architectValueBonus } from "../game/architect.js";
import { hasCritPerk, totalCritChanceRaw, totalCritMult, fundamentBonus } from "../game/perks.js";
import { hasCritFamily, allianceGroups } from "../game/families.js";
import { ionCritChance } from "../game/skills.js";
import { Sparkline } from "./Sparkline.jsx";
import { ScoreSourceBar, sourceShares } from "./RunGraphs.jsx";
import { fmtScore, fmtScoreShort } from "./format.js"; // Gameplay-Neu-Aufbau: „Bester Score" in der Analyse-Ecke
import { DECK_BORDER } from "./modalStyle.jsx"; // #356: deck-getönter neutraler Struktur-Rahmen
import { t, fmtNum } from "../i18n/index.js"; // #sprache

// #252: einklappbarer Panel-Abschnitt (Kopf mit ▸/▾ togglet; Inhalt nur bei !collapsed). Der Zustand kommt aus den
// Optionen (über Runs gemerkt) — der Kopf ruft onToggle, das die Option persistiert.
function Collapsible({ title, collapsed, onToggle, children }) {
  return (
    <div className="pt-1 border-t" style={{ borderColor: DECK_BORDER }}>
      <button type="button" onClick={onToggle} data-sfx="none"
        className="w-full flex items-center gap-1 text-meta-1 uppercase tracking-wide opacity-50 hover:opacity-80"
        style={{ background: "transparent" }} aria-expanded={!collapsed}>
        <span className="inline-block w-2 text-center" aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
        <span>{title}</span>
      </button>
      {!collapsed && <div className="mt-1">{children}</div>}
    </div>
  );
}

// Gameplay-Neu-Aufbau: Kennzahl-Kachel im Karten-Stil für den Multiplikator-Cluster (Formation/Gebäude/Crit).
function MCell({ label, value, tone, sub }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5 min-w-0" style={{ background: "#141419", border: `1px solid ${DECK_BORDER}` }}>
      <div className="text-micro-3 uppercase tracking-wide opacity-50 truncate">{label}</div>
      <div className="font-bold text-body-lg-5 leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: tone || "#e8e8ea" }}>
        {value}{sub && <span className="text-meta-1 opacity-45 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export function StatusRail({ state, currentTraj = [], recordTraj = [], options = {}, onOption, best = 0 }) {
  // Gameplay-Neu-Aufbau: Serie/Siegquote/Deck-Position/Stiche stehen jetzt in der StatusBar. Die Sidebar zeigt die
  // stehenden Multiplikatoren (Formation/Gebäude/Crit), eine kleine Bilanz und die (einklappbare) Analyse.
  const { wins, losses, trickNo, perks, crits, lightning, familyTiers = {} } = state;
  const decided = wins + losses;
  const winPct = decided > 0 ? Math.round((wins / decided) * 100) : null; // Siegquote wandert aus der StatusBar hierher
  const fmtMult = (x) => fmtNum(x.toFixed(2));
  const showCrit = hasCritPerk(perks) || hasCritFamily(familyTiers) || (crits || 0) > 0 || !!(lightning && lightning.active);
  // Live-Crit-Chance des NÄCHSTEN Siegs: analog zum echten Wurf (#19). #267: die Crit-Chance kommt aus der Blitz-Basis
  // (lightning) + den Präzision-Familien (unkonditionale Schärfe im Live-Preview), dieselbe Rechnung wie die Engine.
  const critRaw = totalCritChanceRaw(state);
  // #181: Gesamt-Crit-Chance UNGEKLEMMT anzeigen (kann > 100 % sein — der Überschuss speist L6 „Raserei" und
  // Familie D „Überschusskrit"). Nur nach unten bei 0 begrenzen; KEIN Math.min(1, …) mehr (das war nur Anzeige;
  // der echte Wurf bleibt in der Engine bei engine.js:302 geklemmt).
  const critPct = Math.round(Math.max(0, critRaw) * 100);
  // #271: der feldweite Ionisierungs-Anteil an der Crit-Chance (im critPct oben enthalten) — separat ausgewiesen.
  const ionCritPct = lightning && lightning.active ? Math.round(ionCritChance(state.deck || []) * 100) : 0;
  // Crit-Mult VOLLSTÄNDIG (geteilter Helfer): Perk-Basis + Familien-Wucht + Blitz (inkl. Donnergott) + Durchschlag
  // + Entladung-Momentum (v0.5) — der STAND des Crit-Multiplikators inkl. der neuen Blitz-Motoren.
  const critMultTotal = totalCritMult(state);
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
    const pre = precomputeArchitect(architect, order, deck, fundamentBonus(state.perks));
    const alliance = allianceGroups(state.familyTiers, state.roles); // #289
    let boost = 0, base = 0, multSum = 0;
    for (let p = 0; p < order.length; p++) {
      const card = deck[order[p]];
      if (card) { const b = architectValueBonus(pre, p, card, alliance); if (b > 0) { boost += b; base += card.value; } }
      const sc = pre.score[p];
      const m = (pre.segFactor[p] || 1) * (sc && sc.kind === "mult" ? sc.factor : 1);
      if (m > 1) multSum += m - 1;
    }
    const valueFrac = base > 0 ? boost / base : 0;
    return Math.round((valueFrac + multSum) * 100);
    // state.roles/familyTiers gehören dazu: allianceGroups liest roles.E_COLOR_ALLIANCE → ein Farballianz-Pick ändert
    // den Gebäude-Wert-Bonus, ohne die anderen Deps zu berühren (sonst zeigte der HUD-Prozentwert veraltet).
    // state.perks gehört ebenfalls dazu: „Fundament" (v0.3) hebt die Strukturfaktoren → Gebäude-Bonus ändert sich.
  }, [state.architect, state.architectEnabled, state.playerOrder, state.deck, state.roles, state.familyTiers, state.perks]);
  return (
    <div className="rounded-xl p-4 grid gap-3 as-panel as-panel-deck" style={{ background: "linear-gradient(180deg,#1b1a24,#141019)", border: `1px solid ${DECK_BORDER}` }}>
      {/* Multiplikatoren — die stehenden Score-Treiber (Formation/Gebäude/Crit) dauerhaft sichtbar. */}
      <div>
        <div className="text-meta-1 uppercase tracking-wide opacity-50 mb-2">{t("rail.mults")}</div>
        <div className="grid grid-cols-2 gap-2">
          <MCell label={t("rail.formation")} tone="#5ab87a" value={formCount > 0 ? t("rail.formation.value", { n: formCount, pct: formBonusPct }) : "–"} />
          <MCell label={t("rail.buildings")} tone="#d4a63a" value={buildBonusPct > 0 ? t("rail.pct", { pct: buildBonusPct }) : "–"} />
          {showCrit && <MCell label={t("rail.critChance")} tone="#e879f9" value={t("rail.pct.plain", { pct: critPct })} sub={ionCritPct > 0 ? t("rail.critChance.ion", { pct: ionCritPct }) : null} />}
          {showCrit && <MCell label={t("rail.critMult")} tone={perks.includes("L5") ? "#d4a63a" : "#e879f9"} value={`×${fmtMult(critMultTotal)}`} sub={perks.includes("L5") ? t("rail.jackpot") : null} />}
        </div>
      </div>

      {/* Bilanz — Siege/Verluste/Siegquote/Stiche (+ Crits, wenn relevant). Siegquote steht seit dem StatusBar-Umbau hier. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-body-5 pt-2 border-t" style={{ borderColor: DECK_BORDER }}>
        <span><span className="opacity-50">{t("rail.wins")} </span><b style={{ color: "#5ab87a" }}>{wins}</b></span>
        <span><span className="opacity-50">{t("rail.losses")} </span><b style={{ color: "#e0605a" }}>{losses}</b></span>
        <span><span className="opacity-50">{t("rail.rate")} </span><b style={{ color: winPct == null ? "#e8e8ea" : winPct >= 50 ? "#5ab87a" : "#e0605a" }}>{winPct == null ? "–" : `${winPct}%`}</b></span>
        <span><span className="opacity-50">{t("rail.tricks")} </span><b>{trickNo}</b></span>
        {showCrit && <span><span className="opacity-50">{t("rail.crits")} </span><b style={{ color: "#e879f9" }}>{crits || 0}</b></span>}
      </div>

      {/* Analyse — Bester Score + einklappbare Score-Herkunft/Verlauf (default eingeklappt, Zustand über Runs gemerkt). */}
      <div className="pt-2 border-t grid gap-1" style={{ borderColor: DECK_BORDER }}>
        <div className="flex items-center justify-between">
          <span className="text-meta-1 uppercase tracking-wide opacity-50">{t("rail.analysis")}</span>
          <span className="text-body-5" title={fmtScore(best)}><span className="opacity-50">{t("rail.best")} </span><b style={{ color: "#d4a63a" }}>{fmtScoreShort(best)}</b></span>
        </div>
        {sourceShares(state).score > 0 && (
          <Collapsible title={t("rail.scoreSource")}
            collapsed={options.collapseScoreSource ?? true}
            onToggle={() => onOption && onOption({ collapseScoreSource: !(options.collapseScoreSource ?? true) })}>
            <ScoreSourceBar state={state} showTitle={false} />
          </Collapsible>
        )}
        <Collapsible title={t("rail.scoreTrend")}
          collapsed={options.collapseScoreTrend ?? true}
          onToggle={() => onOption && onOption({ collapseScoreTrend: !(options.collapseScoreTrend ?? true) })}>
          <div className="flex items-center justify-end text-meta-1 normal-case tracking-normal opacity-60 mb-1">
            <span className="flex gap-2">
              <span style={{ color: "#d4a63a" }}>{t("rail.trend.run")}</span>
              {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>{t("rail.trend.record")}</span> : <span className="opacity-40">{t("rail.trend.first")}</span>}
            </span>
          </div>
          <Sparkline current={currentTraj} record={recordTraj} />
        </Collapsible>
      </div>
    </div>
  );
}
