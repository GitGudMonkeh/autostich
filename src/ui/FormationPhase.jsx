import { useState, useRef } from "react";
import { summarizeFormations, SEGMENT_SIZE, openSegmentInfo } from "../game/formations.js";
import { allianceGroups } from "../game/families.js";
import { SKILL_DEFS, hasGletscher, hasArchitekt, hasPfahlwurzel, plantRootScore, plantSkillCount } from "../game/skills.js";
import { CardGrid } from "./CardGrid.jsx";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { audio } from "./audio.js";
import { haptics } from "./haptics.js";

const GOLD = "#d4a63a"; // #201.2: einheitliche Bestätigen-/Aktionsfarbe
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
  // Eis-Architekt (#210, Legendär): bei aktivem Architekt vereist der Aufstellungsrahmen und die TRAGENDE Spalte
  // (Position % SEGMENT_SIZE) aus Frostkarten wird als senkrechte Formation (Pfeiler) hervorgehoben. Gewählt wird die
  // Spalte mit den meisten Frostkarten (≥2 — die Engine gibt den Architekt-Faktor erst ab 2 in derselben Spalte); bei
  // Gleichstand die linkere. Rein anzeige-seitig, spiegelt die Engine-Spaltenlogik (engine.js: p % SEGMENT_SIZE).
  const architektOn = hasArchitekt(state.skills || []);
  // Pflanze (#211): Klick-Detail-Readout nur, wenn ein Pflanzen-Skill gehalten wird (sonst irrelevant).
  const plantHeld = plantSkillCount(state.skills || []) > 0;
  const frostPillar = (() => {
    if (!architektOn) return { col: -1, positions: [] };
    const byCol = Array.from({ length: SEGMENT_SIZE }, () => []);
    cards.forEach((c, pos) => { if (c.frozen) byCol[pos % SEGMENT_SIZE].push(pos); });
    let best = -1;
    for (let col = 0; col < SEGMENT_SIZE; col++)
      if (byCol[col].length >= 2 && (best < 0 || byCol[col].length > byCol[best].length)) best = col;
    return { col: best, positions: best >= 0 ? byCol[best] : [] };
  })();
  const canFree = (a, b) => {
    const ca = cards[a], cb = cards[b];
    return (ca?.frozen && !frostSwapsUsed.includes(ca.id)) || (cb?.frozen && !frostSwapsUsed.includes(cb.id));
  };

  const clickPos = (pos) => {
    if (sel === null) { setSel(pos); return; }  // erste Karte wählen — still (kein Menü-Klick, #132)
    if (sel === pos) { setSel(null); return; }  // Abwählen — still
    // #132: erfolgreicher Tausch klingt wie ein Kartendreh (cardflip), nicht wie ein Button-Klick.
    if (formationEnergy > 0 || canFree(sel, pos)) { onSwap(sel, pos); audio.play("cardflip", { gain: 0.9 }); }
    else { audio.play("denied"); haptics.denied(); } // #110/#207: Tausch ohne Energie (und kein Frost-Freitausch) → verwehrt-Sound + distinkte Haptik
    setSel(null);
  };

  const { count, maxMult } = summarizeFormations(formations);
  const hasSwaps = (formationSwaps || []).length > 0;
  // #201.4: Karten, die in einem Tausch dieser Phase beteiligt waren, dezent ausgrauen (folgt der KARTE via id,
  // nicht dem Slot → übersteht Weg-und-zurück-Tausch; Undo/Reset ziehen die ids automatisch mit).
  const swappedIds = new Set((state.formationSwaps || []).flatMap((s) => [s.idA, s.idB]).filter(Boolean));
  // #FB Segmentarbeit (E_SEGMENT): welche Segmentgrenzen sind offen? Speist den Verbinder im CardGrid + den Intro-Text.
  const segInfo = openSegmentInfo(state.familyTiers);

  // Reaktives Delta (#95.6): Σ Formations-Stärke jetzt vs. Ausgangszustand der Phase, live nach jedem Tausch.
  const curStrength = strengthOf(formations);
  // #159: Baseline an die Phasen-/Rundenidentität (state.cycle) binden statt an den Overlay-Remount. So wird sie
  // beim Rundenwechsel deterministisch neu gesetzt — auch wenn die Komponente über Phasen hinweg NICHT neu mountet.
  const baseStrength = useRef({ cycle: null, base: null });
  if (baseStrength.current.cycle !== state.cycle && formations.length)
    baseStrength.current = { cycle: state.cycle, base: curStrength };
  const base = baseStrength.current.base;
  const delta = base === null ? 0 : curStrength - base;
  const deltaColor = delta > 0.001 ? "#5ab87a" : delta < -0.001 ? "#e0605a" : "#8a8a92";
  const deltaStr = `${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta))}`;

  // #201.5: Pro-Segment-Stärke + Verbesserungs-Highlight. Analog zur Gesamt-Baseline oben, aber je 5er-Segment:
  // jedes Segment zeigt seine eigene Formations-Stärke am Bereichs-Label; ein seit Phasenbeginn stärker gewordenes
  // Segment wird grün, ein schwächeres dezent rot getönt. Rein anzeige-seitig (CardGrid rendert das Tönen).
  const segCount = Math.ceil((formations.length || 0) / SEGMENT_SIZE);
  const segStrength = Array.from({ length: segCount }, (_, s) => strengthOf(formations.slice(s * SEGMENT_SIZE, (s + 1) * SEGMENT_SIZE)));
  const segBaseline = useRef({ cycle: null, base: [] });
  if (segBaseline.current.cycle !== state.cycle && formations.length)
    segBaseline.current = { cycle: state.cycle, base: segStrength.slice() };
  const segDelta = segStrength.map((v, s) => v - (segBaseline.current.base[s] ?? v));

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl">
        {/* Eis-Architekt (#210): der Aufstellungsrahmen vereist — icy Border + Inset-Rim + äußerer Frost-Glow (liegt auf
            der Border-Box, scrollt also nicht mit dem Inhalt). Nur bei gehaltenem Architekt (legendär). */}
        <div className="w-full rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card"
          style={{ background: "#15151b",
                   border: architektOn ? "1px solid #5ec8f077" : "1px solid #33333e",
                   boxShadow: architektOn ? "inset 0 0 0 1px rgba(191,233,247,0.22), inset 0 0 26px rgba(94,200,240,0.12), 0 0 30px rgba(94,200,240,0.16)" : undefined }}>
        {/* Kopf */}
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>Aufstellung · Runde {(state.cycle || 0) + 1}</div>
            <h2 className="text-xl font-bold">Deck aufstellen</h2>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Energie</div>
            <div className="text-2xl font-bold font-pixel-dense leading-none" style={{ color: formationEnergy > 0 ? "#d4a63a" : "#8a8a92" }}>{formationEnergy}</div>
            {/* #95.6/#193: Im Kopf steht nur noch die Gesamtsumme Σ. Das reaktive Delta wandert neben
                „Zurücksetzen" in die Sticky-Leiste (es gehört inhaltlich zur Reset-Aktion). */}
            <div className="mt-1.5 leading-tight">
              <div className="text-[10px] uppercase tracking-wide opacity-50">Formations-Stärke</div>
              <div className="font-pixel-dense text-base">
                <span className="opacity-85">Σ {fmt(curStrength)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Sticky-Aktionsleiste (#161 FB-4): Aktionen bleiben oben erreichbar — bei 8 Segmenten kein Scrollen nötig. */}
        <div className="sticky top-0 z-20 -mx-5 px-5 py-2.5 mb-3 flex items-center justify-between gap-2 flex-wrap"
             style={{ background: "#15151b", borderBottom: "1px solid #2a2a34" }}>
          <div className="flex gap-2 items-center">
            <button onClick={onUndo} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm font-bold"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>↶ Rückgängig</button>
            <button onClick={onReset} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>Zurücksetzen</button>
            {/* #193: Differenz neben „Zurücksetzen" — zeigt, was ein Reset rückgängig machen würde
                (bestehende Farbcodierung grün/rot/grau; Σ bleibt oben im Kopf). */}
            <span className="font-pixel-dense text-sm whitespace-nowrap ml-0.5" title="Formations-Differenz seit Rundenbeginn (was ein Zurücksetzen rückgängig macht)">
              <span className="opacity-45 mr-0.5">Δ</span>
              <span className="font-bold" style={{ color: deltaColor }}>{deltaStr}</span>
            </span>
          </div>
          <button onClick={onConfirm} className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: GOLD, color: "#141419" }}>
            Durchlauf starten
            <span className="ml-2 font-normal opacity-80">· {count} Formationen · max ×{fmt(maxMult)}</span>
          </button>
        </div>
        {state.lastCycleScore != null && <div className="mb-2"><RoundScoreBadge state={state} /></div>}
        <p className="text-xs opacity-55 mb-2">
          Tippe zwei Karten, um sie zu tauschen (1 Energie). Formationen entstehen nur <b>innerhalb</b> der {SEGMENT_SIZE}er-Segmente
          {segInfo.active && (segInfo.all
            ? <> — <span style={{ color: "#8be0a8" }}><b>Segmentarbeit:</b> alle Grenzen offen, Formationen laufen segmentübergreifend</span></>
            : <> — <span style={{ color: "#8be0a8" }}><b>Segmentarbeit:</b> die mit <b>⇕</b> markierten Grenzen dürfen überschritten werden</span></>)}.
        </p>
        {frozenCards.length > 0 && (
          <p className="text-xs mb-3" style={{ color: "#7fd4f0" }}>
            ❄ <b>{freeFrostLeft}</b> von {frozenCards.length} eingefrorenen Karten haben noch einen <b>kostenlosen Frosttausch</b> (ohne Energie).
          </p>
        )}
        {/* Eis-Architekt (#210): Hinweis auf die vereiste, hervorgehobene Spalte (senkrechte Formation). Nur wenn aktiv. */}
        {architektOn && (
          <p className="text-xs mb-3" style={{ color: "#bfe9f7" }}>
            ❄ <b>Architekt</b> — {frostPillar.col >= 0
              ? <>Spalte <b>{frostPillar.col + 1}</b> aus <b>{frostPillar.positions.length}</b> Frostkarten bildet eine <b>senkrechte Formation</b> (Pfeiler, je weitere Frostkarte in der Spalte mehr Multiplikator).</>
              : <>stelle <b>≥2 Frostkarten</b> in dieselbe Spalte (gleiche Position je Segment), um eine <b>senkrechte Formation</b> zu meißeln.</>}
          </p>
        )}

        <div className="md:flex md:gap-4 md:items-start">
          {/* Karten-Grid (links auf Desktop, kompakt) */}
          <div className="md:w-1/2 md:shrink-0">
            <CardGrid cards={cards} formations={formations} roles={state.roles} anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }} selectedPos={sel} onTilePick={clickPos} quietTiles openSegments={segInfo} frostPillarPos={frostPillar.positions} swappedIds={swappedIds} segStrength={segStrength} segDelta={segDelta} />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-3 md:mt-0 grid gap-3 content-start">
            <CardDetail card={sel != null ? cards[sel] : null} pos={sel} posForm={sel != null ? formations[sel] : null} roles={state.roles} familyTiers={state.familyTiers}
              frostReadout frostLayers={sel != null && cards[sel] ? (state.layers?.[cards[sel].id] || 0) : 0} frostGletscher={hasGletscher(state.skills || [])}
              plantReadout={plantHeld}
              plantGrowth={sel != null && cards[sel] ? (state.growth?.[cards[sel].id] || 0) : 0}
              plantRoots={sel != null && cards[sel] ? plantRootScore(state.skills || [], state.growth?.[cards[sel].id] || 0) : 0}
              plantPfahl={hasPfahlwurzel(state.skills || [])} />
            <LayoutPerks perks={state.perks} familyTiers={state.familyTiers} />
            {/* Kurz-Erklärung der Formationen mit Kürzel (#95.7). #103: nur Kürzel + Name grün,
                Beschreibung (nach dem „—") in Standard-Textfarbe → bessere Lesbarkeit. */}
            <div className="grid grid-cols-1 gap-y-0.5 text-xs sm:text-[13px] leading-snug font-medium">
              <div><b style={{ color: "#8be0a8" }}>W</b> <span style={{ color: "#6fc48f" }}>Wiederholung</span> — ≥2 gleiche Werte (×1,25 / ×1,50 / ×1,80, dann +0,40 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>F</b> <span style={{ color: "#6fc48f" }}>Farbblock</span> — ≥3 gleiche Farbe (ab ×1,35, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>T</b> <span style={{ color: "#6fc48f" }}>Treppe</span> — ≥3 streng steigend, Schritt ≤4 (ab ×1,35, +0,20 je weitere)</div>
              <div><b style={{ color: "#8be0a8" }}>Z</b> <span style={{ color: "#6fc48f" }}>Wechsel</span> — ≥3 Zick-Zack, Diff ≥4 (ab ×1,40, +0,20 je weitere)</div>
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
