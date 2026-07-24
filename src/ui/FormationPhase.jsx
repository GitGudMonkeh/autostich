import { useState, useRef } from "react";
import { summarizeFormations, SEGMENT_SIZE } from "../game/formations.js";
import { CardGrid } from "./CardGrid.jsx";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";

const fmt = (x) => x.toFixed(2).replace(".", ",");
// Summe aller Formations-Stärken (Σ mult−1 über alle Positionen) — Basis für das reaktive Delta (#95.6).
const strengthOf = (fs) => (fs || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0);

/* Formationsphase (V2 §22.8): pausiert den Run und öffnet die Deck-Aufstellung.
   Zwei Karten antippen = Tausch (1 Energie). Formationen werden nach jedem Tausch live neu berechnet
   (kommt aus state.formations, vom Reducer gefüllt). Undo/Zurücksetzen erstatten Energie.
   Desktop (#101): zweispaltig — Karten-Grid links, Info-Panel rechts; Mobil gestapelt. */
export function FormationPhase({ state, onSwap, onUndo, onReset, onConfirm }) {
  const { playerOrder = [], deck = [], formations = [], formationEnergy = 0, formationSwaps = [] } = state;
  const [sel, setSel] = useState(null);

  const clickPos = (pos) => {
    if (sel === null) { setSel(pos); return; }
    if (sel === pos) { setSel(null); return; }
    if (formationEnergy > 0) onSwap(sel, pos);
    setSel(null);
  };

  const { count, maxMult } = summarizeFormations(formations);
  const cards = playerOrder.map((di) => deck[di]);
  const hasSwaps = (formationSwaps || []).length > 0;

  // Reaktives Delta (#95.6): Σ Formations-Stärke jetzt vs. Ausgangszustand der Phase, live nach jedem Tausch.
  const curStrength = strengthOf(formations);
  const baseStrength = useRef(null);
  if (baseStrength.current === null && formations.length) baseStrength.current = curStrength;
  const delta = baseStrength.current === null ? 0 : curStrength - baseStrength.current;
  const deltaColor = delta > 0.001 ? "#5ab87a" : delta < -0.001 ? "#e0605a" : "#8a8a92";
  const deltaStr = `${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta))}`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95vh] overflow-y-auto" style={{ background: "#15151b", border: "1px solid #33333e" }}>
        {/* Kopf */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>Aufstellung · Runde {(state.cycle || 0) + 1}</div>
            <h2 className="text-xl font-bold">Deck aufstellen</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Energie</div>
            <div className="text-2xl font-bold font-pixel-dense" style={{ color: formationEnergy > 0 ? "#d4a63a" : "#8a8a92" }}>{formationEnergy}</div>
          </div>
        </div>
        <p className="text-xs opacity-55 mb-3">
          Tippe zwei Karten, um sie zu tauschen (1 Energie). Formationen entstehen nur <b>innerhalb</b> der {SEGMENT_SIZE}er-Segmente.
        </p>

        <div className="md:flex md:gap-4 md:items-start">
          {/* Karten-Grid (links auf Desktop, kompakt) */}
          <div className="md:w-1/2 md:shrink-0">
            <CardGrid cards={cards} formations={formations} roles={state.roles} selectedPos={sel} onTilePick={clickPos} />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-3 md:mt-0 grid gap-3 content-start">
            <CardDetail card={sel != null ? cards[sel] : null} pos={sel} posForm={sel != null ? formations[sel] : null} roles={state.roles} />
            <LayoutPerks perks={state.perks} />
            {/* Kurz-Erklärung der Formationen mit Kürzel (#95.7) — grün & gut lesbar */}
            <div className="grid grid-cols-1 gap-y-0.5 text-xs sm:text-[13px] leading-snug font-medium" style={{ color: "#6fc48f" }}>
              <div><b style={{ color: "#8be0a8" }}>W</b> Wiederholung — ≥2 gleiche Werte (×1,30 / ×1,60 / ×2,00, dann +0,50 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>F</b> Farbblock — ≥3 gleiche Farbe (ab ×1,30, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>T</b> Treppe — ≥3 streng steigend (ab ×1,25, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>Z</b> Wechsel — ≥3 Zick-Zack, Diff ≥4 (ab ×1,25, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>A</b> Anker — Einzelposition ×1,25</div>
              <div style={{ color: "#d4a63a" }}>⧉ Überlappung — mehr Formationen = mehr Multi: 2 ×1,5 · 3 ×2 · 4 ×3</div>
              <div style={{ color: "#9a9aa4" }}>Rahmenfarbe = Anzahl Formationen (<b style={{ color: "#5ab87a" }}>1</b>·<b style={{ color: "#5a8ade" }}>2</b>·<b style={{ color: "#8a7de0" }}>3</b>·<b style={{ color: "#d4a63a" }}>4</b>) — mehr Rahmen = mehr Multi · gestrichelt = ohne Multiplikator</div>
            </div>
          </div>
        </div>

        {/* Fußzeile */}
        <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
          <div className="flex gap-2">
            <button onClick={onUndo} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm font-bold"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>↶ Rückgängig</button>
            <button onClick={onReset} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>Zurücksetzen</button>
          </div>
          <div className="flex items-center gap-3">
            {/* Reaktives Formations-Delta (#95.6) — größer & fetter für bessere Lesbarkeit */}
            <div className="text-right leading-tight">
              <div className="opacity-55 text-[10px] uppercase tracking-wide">Formations-Stärke</div>
              <div className="font-pixel-dense text-lg">
                <span className="opacity-85">Σ {fmt(curStrength)}</span>
                <span className="font-bold ml-1.5" style={{ color: deltaColor }}>{deltaStr}</span>
              </div>
            </div>
            <button onClick={onConfirm} className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
              style={{ background: "#5ab87a", color: "#0c0c10" }}>
              Durchlauf starten
              <span className="ml-2 font-normal opacity-80">· {count} Formationen · max ×{fmt(maxMult)}</span>
            </button>
          </div>
        </div>
        {formationEnergy > 0 && <div className="text-[10px] mt-1.5 text-right" style={{ color: "#d4a63a99" }}>Du hast noch {formationEnergy} Energie übrig.</div>}
      </div>
    </div>
  );
}
