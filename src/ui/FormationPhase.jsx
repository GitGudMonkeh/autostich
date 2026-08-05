import { useState, useRef, useMemo } from "react";
import { summarizeFormations, SEGMENT_SIZE, openSegmentInfo } from "../game/formations.js";
import { allianceGroups } from "../game/families.js";
import { SKILL_DEFS, hasGletscher, hasArchitekt, hasPfahlwurzel, plantRootScore, plantSkillCount } from "../game/skills.js";
import { precomputeArchitect, architectValueBonus, familyDef as archFamilyDef, occupiedCells, structureFactorMap } from "../game/architect.js";
import { architectEffectStrings } from "./archEffects.js";
import { ARCH_CAT } from "./indicators/vocab.js";
import { CardGrid } from "./CardGrid.jsx";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { audio } from "./audio.js";
import { haptics } from "./haptics.js";

const GOLD = "#d4a63a"; // #201.2: einheitliche Bestätigen-/Aktionsfarbe
// Summe aller Formations-Stärken (Σ mult−1 über alle Positionen) — Basis für das reaktive Delta (#95.6).
const strengthOf = (fs) => (fs || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0);
// #UI: Formations-Stärke als Bonus in % (statt Σ-Summe) — Σ(mult−1)·100.
const pctOf = (x) => Math.round(x * 100);

/* Formationsphase (V2 §22.8): pausiert den Run und öffnet die Deck-Aufstellung.
   Zwei Karten antippen = Tausch (1 Energie). Formationen werden nach jedem Tausch live neu berechnet
   (kommt aus state.formations, vom Reducer gefüllt). Undo/Zurücksetzen erstatten Energie.
   Desktop (#101): zweispaltig — Karten-Grid links, Info-Panel rechts; Mobil gestapelt. */
export function FormationPhase({ state, onSwap, onUndo, onReset, onConfirm, options = {}, onOption }) {
  const { playerOrder = [], deck = [], formations = [], formationEnergy = 0, formationSwaps = [] } = state;
  const [sel, setSel] = useState(null);
  // Architekt-Gebäude-Overlay (#202): zeigt in der Aufstellung, welche Positionen von welchem Gebäude gebufft werden —
  // die andere Seite der „platzieren (Architekt) → routen (Aufstellung)"-Schleife. Toggle-bar, Default an. Der Wert-Boost
  // je Zelle kommt aus der ECHTEN Engine (precomputeArchitect + architectValueBonus), spiegelt also die Sieg-Rechnung.
  // #278: Zustand über die Optionen gemerkt (wie showForms/collapse*) — „aus" bleibt aus, statt jedes Mal auf „an" zu springen.
  const [showArch, setShowArchState] = useState(options.archShowBuildings !== false);
  const setShowArch = (v) => { const nv = typeof v === "function" ? v(showArch) : v; setShowArchState(nv); onOption?.({ archShowBuildings: nv }); };
  const [inspectBid, setInspectBid] = useState(null); // inspiziertes Gebäude: Liste ↔ Brett (Rahmen glüht), gesetzt per Karten-Auswahl ODER Listen-Klick — wie in der Chronik
  const architect = state.architect;
  const archBuildings = (state.architectEnabled && architect && architect.buildings) || [];
  const hasArch = archBuildings.length > 0;
  // Gehaltene Eis-Skills, die die Formationserkennung beeinflussen (Keyword „formation") → im Formationsfenster
  // sichtbar machen. Reuse der bestehenden desc-Texte aus SKILL_DEFS (kein Desc↔Code-Drift).
  const iceFormSkills = (state.skills || []).filter((id) => {
    const d = SKILL_DEFS[id];
    return d && d.archetype === "ice" && (d.keywords || []).includes("formation");
  });

  const cards = playerOrder.map((di) => deck[di]);
  // Architekt-Abdeckung je Position: { cat, color, icon, boost, legendary, name }. boost = echter Wert-Bonus der Karte,
  // die dort im Stich steht (nur value-Gebäude; konditional wie in der Engine). Neu berechnet je Aufstellung (folgt Tauschen).
  const architectCover = useMemo(() => { // [#229 T7] nur neu berechnen, wenn Aufstellung/Architekt sich ändern (nicht bei jeder Kachel-Auswahl)
    if (!hasArch) return null;
    const pre = precomputeArchitect(architect, playerOrder, deck);
    const alliance = allianceGroups(state.familyTiers, state.roles); // #289: Badge grün-/allianz-bewusst
    const cover = {};
    for (const b of architect.buildings) {
      const fam = archFamilyDef(b.familyId);
      if (!fam) continue;
      const cat = ARCH_CAT[fam.category];
      for (const pos of b.footprint) {
        const card = deck[playerOrder[pos]];
        const boost = fam.category === "value" && card ? architectValueBonus(pre, pos, card, alliance) : 0;
        // #UI: badgeSuit = die Karten-Farbe, für die das Gebäude den Wert-Bonus gibt (colorLocked → colorChoice),
        // sonst null → grau. Speist die „+N"-Badge-Farbe im CardGrid.
        const badgeSuit = fam.colorLocked ? (b.colorChoice || null) : null;
        cover[pos] = { cat: fam.category, color: cat.color, icon: cat.icon, boost, legendary: !!fam.legendary, name: fam.name, tier: b.tier, badgeSuit, bid: b.id, effects: architectEffectStrings(pre, pos, card, fam, b.tier, alliance) };
      }
    }
    return cover;
  }, [hasArch, architect, playerOrder, deck]);
  // #UI: erfüllte Struktur-Kombis (Zeile/Spalte/Diagonale) — dieselben Positionen wie im Architekt-Screen bekommen
  // den roten Kombi-Wash (arch-struct-lit, wie im Architekt-Screen). Nur Geometrie (Gebäude-Abdeckung), unabhängig von Karten/Tauschen.
  const structLitPos = useMemo(() => {
    if (!hasArch) return null;
    const set = new Set();
    structureFactorMap(occupiedCells(archBuildings)).forEach((f, pos) => { if (f > 1) set.add(pos); });
    return set;
  }, [hasArch, archBuildings]);
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
    if (sel === null) { setSel(pos); setInspectBid(architectCover ? (architectCover[pos]?.bid ?? null) : null); return; }  // erste Karte wählen — Gebäude-Rahmen leuchtet
    if (sel === pos) { setSel(null); setInspectBid(null); return; }  // Abwählen — still
    // #132: erfolgreicher Tausch klingt wie ein Kartendreh (cardflip), nicht wie ein Button-Klick.
    if (formationEnergy > 0 || canFree(sel, pos)) { onSwap(sel, pos); audio.play("cardflip", { gain: 0.9 }); }
    else { audio.play("denied"); haptics.denied(); } // #110/#207: Tausch ohne Energie (und kein Frost-Freitausch) → verwehrt-Sound + distinkte Haptik
    setSel(null); setInspectBid(null);
  };

  const { count } = summarizeFormations(formations);
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
  const deltaStr = `${delta >= 0 ? "+" : "−"}${pctOf(Math.abs(delta))} %`;

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
            <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>Aufstellung · Durchlauf {(state.cycle || 0) + 1}</div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Deck aufstellen</h2>
              <GlossaryPanel />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Energie</div>
            <div className="text-2xl font-bold font-pixel-dense leading-none" style={{ color: formationEnergy > 0 ? "#d4a63a" : "#8a8a92" }}>{formationEnergy}</div>
            {/* #95.6/#193: Im Kopf steht nur noch die Gesamtsumme Σ. Das reaktive Delta wandert neben
                „Zurücksetzen" in die Sticky-Leiste (es gehört inhaltlich zur Reset-Aktion). */}
            <div className="mt-1.5 leading-tight">
              <div className="text-[10px] uppercase tracking-wide opacity-50">Formations-Bonus</div>
              <div className="font-pixel-dense text-base">
                <span className="opacity-85">+{pctOf(curStrength)} %</span>
              </div>
            </div>
          </div>
        </div>
        {/* Sticky-Aktionsleiste (#161 FB-4): Aktionen bleiben oben erreichbar — bei 8 Segmenten kein Scrollen nötig. */}
        <div className="sticky top-0 z-20 -mx-5 px-5 py-2.5 mb-3 flex items-center justify-center gap-2 flex-wrap"
             style={{ background: "#15151b", borderBottom: "1px solid #2a2a34" }}>
          <div className="flex gap-2 items-center">
            <button onClick={onUndo} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm font-bold"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>↶ Rückgängig</button>
            <button onClick={onReset} disabled={!hasSwaps} className="px-3 py-2 rounded-lg text-sm"
              style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: hasSwaps ? 1 : 0.4, cursor: hasSwaps ? "pointer" : "default" }}>Zurücksetzen</button>
            {/* #193: Differenz neben „Zurücksetzen" — zeigt, was ein Reset rückgängig machen würde
                (bestehende Farbcodierung grün/rot/grau; Σ bleibt oben im Kopf). */}
            <span className="font-pixel-dense text-sm whitespace-nowrap ml-0.5" title="Formations-Differenz seit Durchlaufbeginn (was ein Zurücksetzen rückgängig macht)">
              <span className="opacity-45 mr-0.5">Δ</span>
              <span className="font-bold" style={{ color: deltaColor }}>{deltaStr}</span>
            </span>
          </div>
          <button onClick={onConfirm} className="px-5 py-2.5 rounded-lg text-sm transition-all hover:brightness-110 flex flex-col items-center leading-tight"
            style={{ background: GOLD, color: "#141419" }}>
            <span className="font-bold">Fortfahren</span>
            {/* #UI: „max ×…" raus — stattdessen die restliche Energie (formationEnergy) + Formationszahl,
                zweizeilig unter „Fortfahren", einzeilig & zentriert. Der Energie-Wert steht zusätzlich oben im Kopf. */}
            <span className="font-normal opacity-80 whitespace-nowrap">{count} Formationen · noch {formationEnergy} Energie</span>
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
            {/* Architekt-Overlay-Steuerung (#202): welche Karten liegen unter welchem Gebäude? Toggle + Kategorie-Legende. */}
            {hasArch && (
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px]">
                <button onClick={() => setShowArch((v) => !v)} className="px-2 py-1 rounded-lg font-bold"
                  style={showArch ? { background: `${ARCH_CAT.value.color}22`, border: `1px solid ${ARCH_CAT.value.color}`, color: "#cfe3f5" }
                                  : { background: "#20202a", border: "1px solid #3a3a46", color: "#8a8a92" }}>
                  🏗 Gebäude {showArch ? "an" : "aus"}
                </button>
                {showArch && Object.entries(ARCH_CAT).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 opacity-80" style={{ color: "#aab4c4" }}>
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: v.color }} />{v.label}
                  </span>
                ))}
              </div>
            )}
            <CardGrid cards={cards} formations={formations} roles={state.roles} anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }} selectedPos={sel} onTilePick={clickPos} quietTiles openSegments={segInfo} frostPillarPos={frostPillar.positions} swappedIds={swappedIds} segStrength={segStrength} segDelta={segDelta} architectCover={hasArch && showArch ? architectCover : null} structPos={hasArch && showArch ? structLitPos : null} glowBid={hasArch && showArch ? inspectBid : null} />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-5 md:mt-0 grid gap-3 content-start">
            <CardDetail card={sel != null ? cards[sel] : null} pos={sel} posForm={sel != null ? formations[sel] : null} roles={state.roles} familyTiers={state.familyTiers}
              arch={sel != null && architectCover ? architectCover[sel] : null}
              frostReadout frostLayers={sel != null && cards[sel] ? (state.layers?.[cards[sel].id] || 0) : 0} frostGletscher={hasGletscher(state.skills || [])}
              plantReadout={plantHeld}
              plantGrowth={sel != null && cards[sel] ? (state.growth?.[cards[sel].id] || 0) : 0}
              plantRoots={sel != null && cards[sel] ? plantRootScore(state.skills || [], state.growth?.[cards[sel].id] || 0) : 0}
              plantPfahl={hasPfahlwurzel(state.skills || [])} />
            {/* Gebäude-Liste (wie in der Chronik): antippen lässt den Gebäude-Rahmen am Brett cyan leuchten — und
                umgekehrt markiert das Antippen einer Karte im Gebäude hier den Eintrag. Nur bei aktivem Overlay sichtbar-verlinkt. */}
            {hasArch && (
              <div className="rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #5a8ade" }}>
                <div className="text-[11px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 Deine Gebäude ({archBuildings.length})</div>
                <div className="text-[10px] opacity-45 mb-1.5">Antippen zeigt am Brett, wo es liegt — und umgekehrt.</div>
                <div className="grid gap-1">
                  {archBuildings.map((b) => {
                    const fam = archFamilyDef(b.familyId); if (!fam) return null;
                    const anchor = Math.min(...b.footprint);
                    const eff = architectCover?.[anchor]?.effects?.join(" · ") || "";
                    const meta = ARCH_CAT[fam.category] || {};
                    const on = inspectBid === b.id;
                    return (
                      <button key={b.id} id={`form-bld-${b.id}`} onClick={() => { if (!on) setShowArch(true); setInspectBid(on ? null : b.id); }}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-mono leading-snug flex flex-col gap-0.5 transition-all"
                        style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "#2a2a34"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="w-[8px] h-[8px] rounded-[2px] inline-block" style={{ background: fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92") }} />
                          <b>{fam.name}</b>
                          <span className="opacity-55">{fam.legendary ? "Legendär" : `Stufe ${["", "I", "II", "III", "IV"][b.tier] || b.tier}`}</span>
                        </span>
                        {eff && <span className="opacity-75">{eff}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                    <span> — <GlossaryText text={SKILL_DEFS[id].desc} /></span>
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
