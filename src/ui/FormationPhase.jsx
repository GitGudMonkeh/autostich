import { useState, useRef } from "react";
import { summarizeFormations, SEGMENT_SIZE } from "../game/formations.js";
import { SKILL_DEFS } from "../game/skills.js";
import { CardGrid } from "./CardGrid.jsx";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { PanelMascot } from "./PanelMascot.jsx";
import formationMascot from "../assets/mascots/formation.gif";
import { audio } from "./audio.js";

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
  // Gehaltene Eis-Skills, die die Formationserkennung beeinflussen (Keyword „formation") → im Formationsfenster
  // sichtbar machen. Reuse der bestehenden desc-Texte aus SKILL_DEFS (kein Desc↔Code-Drift).
  const iceFormSkills = (state.skills || []).filter((id) => {
    const d = SKILL_DEFS[id];
    return d && d.archetype === "ice" && (d.keywords || []).includes("formation");
  });

  const cards = playerOrder.map((di) => deck[di]);
  // Eis (#93 F3): eingefrorene Karten mit noch freiem Frosttausch machen einen Tausch KOSTENLOS (auch bei 0 Energie).
  const frostSwapsUsed = state.frostSwapsUsed || [];
  const frozenCards = cards.filter((c) => c.frozen);
  const freeFrostLeft = frozenCards.filter((c) => !frostSwapsUsed.includes(c.id)).length;
  const canFree = (a, b) => {
    const ca = cards[a], cb = cards[b];
    return (ca?.frozen && !frostSwapsUsed.includes(ca.id)) || (cb?.frozen && !frostSwapsUsed.includes(cb.id));
  };

  const clickPos = (pos) => {
    if (sel === null) { setSel(pos); return; }  // erste Karte wählen — still (kein Menü-Klick, #132)
    if (sel === pos) { setSel(null); return; }  // Abwählen — still
    // #132: erfolgreicher Tausch klingt wie ein Kartendreh (cardflip), nicht wie ein Button-Klick.
    if (formationEnergy > 0 || canFree(sel, pos)) { onSwap(sel, pos); audio.play("cardflip", { gain: 0.9 }); }
    else audio.play("denied"); // #110: Tausch ohne Energie (und kein Frost-Freitausch) → verwehrt-Sound
    setSel(null);
  };

  const { count, maxMult } = summarizeFormations(formations);
  const hasSwaps = (formationSwaps || []).length > 0;

  // Reaktives Delta (#95.6): Σ Formations-Stärke jetzt vs. Ausgangszustand der Phase, live nach jedem Tausch.
  const curStrength = strengthOf(formations);
  const baseStrength = useRef(null);
  if (baseStrength.current === null && formations.length) baseStrength.current = curStrength;
  const delta = baseStrength.current === null ? 0 : curStrength - baseStrength.current;
  const deltaColor = delta > 0.001 ? "#5ab87a" : delta < -0.001 ? "#e0605a" : "#8a8a92";
  const deltaStr = `${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta))}`;

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center sm:items-start justify-center p-3 sm:pt-28" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      {/* #130: nicht scrollender Wrapper → Alien-Admiral-Maskottchen schaut oben über die Karte hervor (Desktop-Peek);
          Panel oben angedockt (sm:items-start + sm:pt-28) + sm:max-h, damit der Peek nie vom Viewport geklippt wird. */}
      <div className="relative w-full max-w-4xl">
        <PanelMascot src={formationMascot} accent="#5ab87a" peekMaxH={120} overlap={28} />
        <div className="relative z-10 w-full rounded-2xl p-5 max-h-[95dvh] sm:max-h-[calc(100dvh-8rem)] overflow-y-auto overlay-card" style={{ background: "#15151b", border: "1px solid #33333e" }}>
        {/* Kopf */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <PanelMascot src={formationMascot} accent="#5ab87a" variant="avatar" avatarObjectPosition="center top" />
            <div>
              <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>Aufstellung · Runde {(state.cycle || 0) + 1}</div>
              <h2 className="text-xl font-bold">Deck aufstellen</h2>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Energie</div>
            <div className="text-2xl font-bold font-pixel-dense leading-none" style={{ color: formationEnergy > 0 ? "#d4a63a" : "#8a8a92" }}>{formationEnergy}</div>
            {/* #95.6: Formations-Stärke Σ + reaktives Delta direkt unter der Energie → der Einfluss jedes Tauschs
                ist sofort oben sichtbar (vorher nur unten in der Fußzeile). */}
            <div className="mt-1.5 leading-tight">
              <div className="text-[10px] uppercase tracking-wide opacity-50">Formations-Stärke</div>
              <div className="font-pixel-dense text-base">
                <span className="opacity-85">Σ {fmt(curStrength)}</span>
                <span className="font-bold ml-1.5" style={{ color: deltaColor }}>{deltaStr}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Sticky-Aktionsleiste (#161 FB-4): Aktionen bleiben oben erreichbar — bei 8 Segmenten kein Scrollen nötig. */}
        <div className="sticky top-0 z-20 -mx-5 px-5 py-2.5 mb-3 flex items-center justify-between gap-2 flex-wrap"
             style={{ background: "#15151b", borderBottom: "1px solid #2a2a34" }}>
          <div className="flex gap-2">
            <button onClick={onUndo} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm font-bold"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>↶ Rückgängig</button>
            <button onClick={onReset} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>Zurücksetzen</button>
          </div>
          <button onClick={onConfirm} className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: "#5ab87a", color: "#0c0c10" }}>
            Durchlauf starten
            <span className="ml-2 font-normal opacity-80">· {count} Formationen · max ×{fmt(maxMult)}</span>
          </button>
        </div>
        {state.lastCycleScore != null && <div className="mb-2"><RoundScoreBadge state={state} /></div>}
        <p className="text-xs opacity-55 mb-2">
          Tippe zwei Karten, um sie zu tauschen (1 Energie). Formationen entstehen nur <b>innerhalb</b> der {SEGMENT_SIZE}er-Segmente.
        </p>
        {frozenCards.length > 0 && (
          <p className="text-xs mb-3" style={{ color: "#7fd4f0" }}>
            ❄ <b>{freeFrostLeft}</b> von {frozenCards.length} eingefrorenen Karten haben noch einen <b>kostenlosen Frosttausch</b> (ohne Energie).
          </p>
        )}

        <div className="md:flex md:gap-4 md:items-start">
          {/* Karten-Grid (links auf Desktop, kompakt) */}
          <div className="md:w-1/2 md:shrink-0">
            <CardGrid cards={cards} formations={formations} roles={state.roles} anchors={state.shop?.anchors || []} pe={state.shop?.permanentEffects || {}} selectedPos={sel} onTilePick={clickPos} quietTiles />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-3 md:mt-0 grid gap-3 content-start">
            <CardDetail card={sel != null ? cards[sel] : null} pos={sel} posForm={sel != null ? formations[sel] : null} roles={state.roles} />
            <LayoutPerks perks={state.perks} familyTiers={state.familyTiers} />
            {/* Kurz-Erklärung der Formationen mit Kürzel (#95.7). #103: nur Kürzel + Name grün,
                Beschreibung (nach dem „—") in Standard-Textfarbe → bessere Lesbarkeit. */}
            <div className="grid grid-cols-1 gap-y-0.5 text-xs sm:text-[13px] leading-snug font-medium">
              <div><b style={{ color: "#8be0a8" }}>W</b> <span style={{ color: "#6fc48f" }}>Wiederholung</span> — ≥2 gleiche Werte (×1,25 / ×1,50 / ×1,80, dann +0,40 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>F</b> <span style={{ color: "#6fc48f" }}>Farbblock</span> — ≥3 gleiche Farbe (ab ×1,35, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>T</b> <span style={{ color: "#6fc48f" }}>Treppe</span> — ≥3 streng steigend, Schritt ≤3 (ab ×1,35, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>Z</b> <span style={{ color: "#6fc48f" }}>Wechsel</span> — ≥3 Zick-Zack, Diff ≥5 (ab ×1,40, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>A</b> <span style={{ color: "#6fc48f" }}>Anker</span> — Einzelposition ×1,25</div>
              <div style={{ color: "#d4a63a" }}>⧉ Überlappung — mehr Formationen = mehr Multi: 2 ×1,5 · 3 ×2 · 4 ×3</div>
              <div style={{ color: "#9a9aa4" }}>Rahmenfarbe = Anzahl Formationen (<b style={{ color: "#5ab87a" }}>1</b>·<b style={{ color: "#5a8ade" }}>2</b>·<b style={{ color: "#8a7de0" }}>3</b>·<b style={{ color: "#d4a63a" }}>4</b>) — mehr Rahmen = mehr Multi · gestrichelt = ohne Multiplikator</div>
            </div>
            {/* Gehaltene Eis-Effekte auf die Formationserkennung — nur wenn welche gehalten werden (desc aus SKILL_DEFS). */}
            {iceFormSkills.length > 0 && (
              <div className="grid gap-0.5 text-xs sm:text-[13px] leading-snug font-medium pt-2 mt-1 border-t" style={{ borderColor: "#5ec8f022" }}>
                <div className="font-bold" style={{ color: "#7fd4f0" }}>❄ Eis-Effekte auf Formationen</div>
                {iceFormSkills.map((id) => (
                  <div key={id}>
                    <b style={{ color: "#8be0f8" }}>{SKILL_DEFS[id].name}</b>
                    <span> — {SKILL_DEFS[id].desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aktionen liegen jetzt in der Sticky-Leiste oben (#161 FB-4). */}
        </div>
      </div>
    </div>
  );
}
