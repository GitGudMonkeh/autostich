import { useState, useRef } from "react";
import { suitColor } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";
import { summarizeFormations, SEGMENT_SIZE } from "../game/formations.js";
import { formationBorder } from "./formationStyle.js";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";

// Kurzkürzel der Formationstypen für die Karten-Badges.
const FORM_LABEL = { wiederholung: "W", farbblock: "F", treppe: "T", wechsel: "Z", anker: "A" };
const fmt = (x) => x.toFixed(2).replace(".", ",");
// Summe aller Formations-Stärken (Σ mult−1 über alle Positionen) — Basis für das reaktive Delta (#95.6).
const strengthOf = (fs) => (fs || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0);

/* Formationsphase (V2 §22.8): pausiert den Run und öffnet die Deck-Aufstellung.
   Zwei Karten antippen = Tausch (1 Energie). Formationen werden nach jedem Tausch live neu berechnet
   (kommt aus state.formations, vom Reducer gefüllt). Undo/Zurücksetzen erstatten Energie. */
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
  // Kartenrollen je Karte (§22.11): Karten-id → Liste der Rollen-Perks.
  const rolesByCard = {};
  for (const [pid, ids] of Object.entries(state.roles || {})) for (const id of ids || []) (rolesByCard[id] ||= []).push(pid);
  const cards = playerOrder.map((di) => deck[di]);
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);
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

        {/* Segmente à 5 Karten */}
        <div className="grid gap-2">
          {Array.from({ length: nSeg }, (_, s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="text-[10px] opacity-40 w-9 shrink-0 text-right tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
              <div className="grid grid-cols-5 gap-1.5 flex-1">
                {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
                  const pos = s * SEGMENT_SIZE + k;
                  const pf = formations[pos] || { mult: 1, formations: [] };
                  const inForm = pf.mult > 1;
                  const selected = sel === pos;
                  const col = suitColor(c.suit);
                  const labels = [...new Set(pf.formations.map((f) => FORM_LABEL[f.type]))].join("");
                  const cardRoles = rolesByCard[c.id] || [];
                  // #95.4/8: Rahmenfarbe nach Anzahl Formationen (1 grün·2 blau·3 lila·4 gold),
                  // gestrichelt-grün = Mitglied ohne Multiplikator.
                  const fb = formationBorder(pf);
                  const borderColor = selected ? "#ffffff" : fb.color || col + "55";
                  const borderStyle = fb.dashed && !selected ? "dashed" : "solid";
                  return (
                    <button key={pos} onClick={() => clickPos(pos)}
                      className="relative rounded-lg flex flex-col items-center justify-center transition-all"
                      style={{ aspectRatio: "3 / 4", background: "#20202a",
                               border: `2px ${borderStyle} ${borderColor}`,
                               boxShadow: selected ? "0 0 10px #ffffff66" : fb.color && !fb.dashed ? `0 0 8px ${fb.color}55` : undefined }}>
                      <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
                      {(c.ionStacks || 0) > 0 && <span className="absolute top-0.5 right-1 text-[8px]" style={{ color: "#5ec8f0" }}>⚡{c.ionStacks}</span>}
                      <span className="text-lg sm:text-3xl font-bold font-pixel-dense" style={{ color: col }}>{c.value}</span>
                      {inForm && <span className="text-[9px] sm:text-sm font-bold leading-none" style={{ color: fb.color || "#5ab87a" }}>×{fmt(pf.mult)}</span>}
                      {labels && <span className="absolute bottom-0.5 right-1 text-[8px] sm:text-xs font-bold opacity-80" style={{ color: fb.color || "#5ab87a" }}>{labels}</span>}
                      {cardRoles.length > 0 && <span className="absolute bottom-0.5 left-1 text-[8px] leading-none" style={{ color: "#d4a63a" }}
                        title={cardRoles.map((p) => PERK_DEFS[p].label).join(", ")}>●</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detailanzeige der angetippten Karte (#95.5) */}
        <div className="mt-3">
          <CardDetail card={sel != null ? cards[sel] : null} pos={sel} posForm={sel != null ? formations[sel] : null} roles={state.roles} />
        </div>

        {/* Positions- & Formations-Perks (#95): worauf es beim Aufstellen ankommt */}
        <div className="mt-3">
          <LayoutPerks perks={state.perks} />
        </div>

        {/* Kurz-Erklärung der Formationen mit Kürzel (#95.7) — grün & gut lesbar */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:text-[13px] leading-snug font-medium" style={{ color: "#6fc48f" }}>
          <div><b style={{ color: "#8be0a8" }}>W</b> Wiederholung — ≥2 gleiche Werte (×1,30 / ×1,60 / ×2,00, dann +0,50 je weitere)</div>
          <div><b style={{ color: "#8be0a8" }}>F</b> Farbblock — ≥3 gleiche Farbe (ab ×1,30, +0,20 je weitere)</div>
          <div><b style={{ color: "#8be0a8" }}>T</b> Treppe — ≥3 steigend, Schritt ≥4 (ab ×1,25, +0,20 je weitere)</div>
          <div><b style={{ color: "#8be0a8" }}>Z</b> Wechsel — ≥3 Zick-Zack, Diff ≥6 (ab ×1,25, +0,20 je weitere)</div>
          <div><b style={{ color: "#8be0a8" }}>A</b> Anker — Einzelposition ×1,25</div>
          <div style={{ color: "#d4a63a" }}>⧉ Überlappung — mehr Formationen = mehr Multi: 2 ×1,5 · 3 ×2 · 4 ×3</div>
        </div>
        <div className="mt-1 text-[11px] sm:text-xs" style={{ color: "#9a9aa4" }}>
          Rahmenfarbe = Anzahl Formationen (<b style={{ color: "#5ab87a" }}>1</b>·<b style={{ color: "#5a8ade" }}>2</b>·<b style={{ color: "#8a7de0" }}>3</b>·<b style={{ color: "#d4a63a" }}>4</b>) — mehr Rahmen = mehr Multi · gestrichelt = ohne Multiplikator
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
