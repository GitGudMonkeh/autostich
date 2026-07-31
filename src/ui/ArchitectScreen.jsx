import { useState, useMemo } from "react";
import {
  ARCHITECT_FAMILIES, familyDef, shapeRotations, enumeratePlacements, isValidFootprint,
  occupiedCells, precomputeArchitect, architectValueBonus, structureFactorMap,
  rowOf, colOf, posOf, ROWS, COLS, N_POS, MAX_TIER, tierNum, tierFactor,
} from "../game/architect.js";
import { computeFormations, summarizeFormations } from "../game/formations.js";
import { SUIT_ORDER } from "../game/constants.js";
import { ARCH_CAT as CAT } from "./indicators/vocab.js";
import { formationBorder } from "./formationStyle.js";
import { formationAbbr } from "./formationLabels.js";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { useEscape } from "./useEscape.js";

/* ============================================================
   Der Architekt (#202, Shop-Ersatz) — Bau-Assistent je Phase. Der Spieler legt geometrische Gebäude (Polyominoes)
   als Overlay aufs 8×5-Kartenbrett (pos = row*5 + col, row = Segment). Geführter Ablauf (freigegebenes Mockup
   d4ada534): Schritt 1 Hauptaktion (Bauen XOR Ausbauen) → Schritt 2 Verschieben (1×) → Schritt 3 Bestätigen.
   Alle Geometrie/Validierung aus architect.js (Single Source of Truth), Aktionen als echte Reducer-Dispatches.
   Interaktion touch-sicher: Tippen→Setzen + Tippen→Verschieben (kein Drag), Drehen per Knopf (Mockup-Fallback).
   ============================================================ */

// Kategorie-Rahmen/Icon (CAT) kommt aus dem geteilten Vokabular (indicators/vocab.js → ARCH_CAT) — NICHT Füllfarbe
// (sonst Kollision mit den Karten-Suits R/B/G/Y). Geteilt mit dem Aufstellungs-Overlay (FormationPhase).
const SUIT_COLOR = { R: "#d9553f", B: "#4f82d6", G: "#3f9d63", Y: "#c79a2e" };
const GOLD = "#c8962f"; // Legendär
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };
const tierLabel = (t) => (t === "legendary" ? "★" : ROMAN[t] || "");
const fmt = (x) => x.toFixed(2).replace(".", ",");

// Footprint einer Form bei (anchor, rotIdx) — im Gitter, sonst null. Nutzt die Rotationslagen aus architect.js.
function footprintAt(form, rotIdx, anchor) {
  const rots = shapeRotations(form);
  if (!rots.length) return null;
  const cells = rots[((rotIdx % rots.length) + rots.length) % rots.length];
  const ar = rowOf(anchor), ac = colOf(anchor);
  const fp = [];
  for (const [dr, dc] of cells) {
    const r = ar + dr, c = ac + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    fp.push(posOf(r, c));
  }
  return fp.sort((a, b) => a - b);
}

// Mini-Vorschau einer Form (kleines Raster, Kategorie-Farbe) — für Bauplan-Karten & Legende.
function MiniShape({ form, color, rotIdx = 0 }) {
  const rots = shapeRotations(form);
  const cells = rots[rotIdx % rots.length] || [];
  let maxR = 0, maxC = 0;
  for (const [r, c] of cells) { maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
  const set = new Set(cells.map(([r, c]) => `${r},${c}`));
  const grid = [];
  for (let r = 0; r <= maxR; r++) for (let c = 0; c <= maxC; c++) grid.push(set.has(`${r},${c}`));
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${maxC + 1}, 1fr)` }}>
      {grid.map((on, i) => (
        <span key={i} className="w-[11px] h-[11px] rounded-[2px]" style={{ background: on ? color : "transparent" }} />
      ))}
    </div>
  );
}

export function ArchitectScreen({ state = {}, onBuild, onUpgrade, onMove, onDemolish, onDone }) {
  useEscape(onDone);
  const architect = state.architect || { buildings: [], offers: [] };
  const buildings = architect.buildings || [];
  const offers = architect.offers || [];
  const maxCover = architect.maxCover ?? N_POS;
  const round = (state.cycle || 0) + 1;

  const order = state.playerOrder || [];
  const deck = state.deck || [];
  const cards = order.map((di) => deck[di]).filter(Boolean);

  // UI-Zustand: Schritt · Hauptaktions-Modus · Abreißen · Reposition-Auswahl (Verschieben) · Rotation · Farbwahl · Rückfrage.
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState("build");       // "build" | "upgrade" | null — #224.3: „Bauen" vorausgewählt → Angebot sofort da, direkt platzierbar
  const [deleteActive, setDeleteActive] = useState(false);
  const [selId, setSelId] = useState(null);         // zum Verschieben ausgewähltes Gebäude
  const [rotIdx, setRotIdx] = useState(0);          // Rotation für das Verschieben
  const [colorPick, setColorPick] = useState(SUIT_ORDER[0]); // #224.9: Farbe für colorLocked vorbelegt → Bauplan sofort errichtbar (nicht rätselhaft gesperrt)

  const acted = !!architect.actedMain;
  const occ = useMemo(() => occupiedCells(buildings), [buildings]);
  const coverCount = occ.size;

  // Precompute (echte Engine): value-/score-Effekte + Struktur-Faktor je Position. Für Kartenwert-Vorschau + Struktur-Highlight.
  const pre = useMemo(
    () => (cards.length ? precomputeArchitect(architect, order, deck) : null),
    [architect, order, deck, cards.length],
  );
  const structF = useMemo(() => structureFactorMap(occ), [occ]);

  // Formationen je Position (echte Engine, inkl. Architekt-formation-Gebäude) — #224.1: direkt aufs Board (×mult + Typ).
  const formations = useMemo(() => {
    if (!cards.length) return [];
    return computeFormations(order, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, architect);
  }, [architect, order, deck, state.roles, state.perks, state.skills, state.familyTiers]);
  const formCount = useMemo(() => summarizeFormations(formations).count, [formations]);

  // Effektiver Kartenwert je Position (Basiswert + Architekt-value-Bonus, konditional wie in der Engine).
  const buildingAt = (pos) => buildings.find((b) => b.footprint.includes(pos)) || null;
  const effValueAt = (pos) => {
    const card = cards[pos];
    if (!card) return 0;
    const bonus = pre ? architectValueBonus(pre, pos, card) : 0;
    return card.value + bonus;
  };
  const sumValue = cards.reduce((t, _c, p) => t + effValueAt(p), 0);
  const houseRows = (() => { let n = 0; for (let r = 0; r < ROWS; r++) { let full = true; for (let c = 0; c < COLS; c++) if (!occ.has(posOf(r, c))) full = false; if (full) n++; } return n; })();

  const catCount = { value: 0, score: 0, formation: 0 };
  for (const b of buildings) { const f = familyDef(b.familyId); if (f) catCount[f.category] += 1; }

  // ---- Aktionen ----
  const placeOffer = (o) => {
    if (acted) return;
    const fam = familyDef(o.familyId);
    if (!fam) return;
    if (fam.colorLocked && !colorPick) return; // erst Farbe wählen (Buntglas/Zunfthaus)
    const size = shapeRotations(fam.form)[0].length;
    if (coverCount + size > maxCover) return;   // Baufeld-Deckel
    const fits = enumeratePlacements(fam.form, buildings);
    if (!fits.length) return;                    // kein Platz
    onBuild?.({ familyId: o.familyId, tier: o.tier, footprint: fits[0], colorChoice: fam.colorLocked ? colorPick : null });
    setColorPick(SUIT_ORDER[0]); // #224.9: wieder vorbelegen (nicht auf null → nächster colorLocked bleibt errichtbar)
  };
  const tapCell = (pos) => {
    const b = buildingAt(pos);
    if (deleteActive) { if (b) onDemolish?.(b.id); return; }
    // Verschieben: ausgewähltes Gebäude an eine (leere) Zielposition setzen.
    if (selId != null) {
      const b2 = buildings.find((x) => x.id === selId);
      if (!b2) { setSelId(null); return; }
      const fam = familyDef(b2.familyId);
      const fp = footprintAt(fam.form, rotIdx, pos);
      const others = buildings.filter((x) => x.id !== selId);
      if (fp && isValidFootprint(fam.form, fp, others)) { onMove?.({ buildingId: selId, footprint: fp }); setSelId(null); }
      return;
    }
    // Ausbauen (Schritt 1, Modus upgrade): Gebäude antippen → +1 Stufe.
    if (step === 0 && mode === "upgrade" && !acted) { if (b) onUpgrade?.(b.id); return; }
    // sonst: Gebäude antippen → zum Verschieben auswählen (#224.10: jederzeit, beliebig oft bis zum Bestätigen).
    if (b) { setSelId(b.id); setRotIdx(0); }
  };

  const goStep = (n) => { setStep(n); if (n > 0) { setDeleteActive(false); setMode(null); } };

  // Struktur-Highlights fürs Brett (volle Zeile/Spalte/Diagonale → Faktor > 1 an der Position).
  const structLit = (pos) => (structF[pos] || 1) > 1;

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-start sm:items-center justify-center p-2 sm:p-4"
      style={{ background: "#0c1017dd", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-5xl rounded-2xl p-4 sm:p-6 max-h-[96dvh] overflow-y-auto overlay-card"
        style={{ background: "#111c27", border: `1px solid ${CAT.value.color}55`, color: "#e7eef5" }}>

        {/* Kopf: Runde + Phasen-Kontext */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono opacity-60" style={{ color: CAT.value.color }}>Architekt · Bauphase</div>
            <h2 className="text-xl font-bold mt-0.5">🏗 Der Architekt</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Runde {round}</div>
            {/* #224.8: Baufeld (knappe Kernressource) klar sichtbar — kräftiges Gold + explizit die freien Baupunkte. */}
            <div className="text-[10px] uppercase tracking-wide opacity-50 mt-0.5">Baufeld frei</div>
            <div className="font-pixel-dense font-bold leading-none" style={{ color: GOLD, fontSize: 22 }}>
              {Math.max(0, maxCover - coverCount)}<span className="text-xs opacity-70 font-mono"> / {maxCover}</span>
            </div>
            <div className="text-[11px] font-mono opacity-55">{coverCount} belegt · {Math.round(coverCount / N_POS * 100)}%</div>
          </div>
        </div>
        {state.lastCycleScore != null && <div className="mb-3"><RoundScoreBadge state={state} /></div>}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] items-start">
          {/* ---- Brett 8×5 ---- */}
          <section className="rounded-xl p-3" style={{ background: "#0e1822", border: "1px solid #20303d" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-mono uppercase tracking-wide opacity-60">Brett · 8 × 5</div>
              {selId != null && (
                <button onClick={() => setRotIdx((r) => r + 1)} className="text-xs font-bold rounded-lg px-2.5 py-1"
                  style={{ background: "#1a2a37", border: `1px solid ${CAT.value.color}` }}>⟳ Drehen</button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1" style={{ maxWidth: 360, margin: "0 auto" }}>
              {cards.map((card, pos) => {
                const b = buildingAt(pos);
                const fam = b ? familyDef(b.familyId) : null;
                const cat = fam ? CAT[fam.category] : null;
                const ev = effValueAt(pos);
                const boost = ev - card.value;
                const anchorCell = b ? Math.min(...b.footprint) : -1;
                const isSel = b && b.id === selId;
                // #224.1: aktive Formation an dieser Position (echte Engine) — ×mult + Typ-Kürzel + Formationsfarbe.
                const pf = formations[pos] || { mult: 1, formations: [] };
                const inForm = pf.mult > 1;
                const fb = formationBorder(pf);
                const formLabels = [...new Set((pf.formations || []).map((f) => formationAbbr(f.type)))].join("");
                const sFac = structF[pos] || 1; // Struktur-Faktor (volle Zeile/Spalte/Diagonale)
                const title = b
                  ? `${fam.name} (${tierLabel(b.tier)}) — ${famEff(fam, b)}${inForm ? ` · Formation ×${fmt(pf.mult)}` : ""}${sFac > 1 ? ` · Struktur ×${fmt(sFac)}` : ""}`
                  : `Pos ${pos + 1}${inForm ? ` — Formation ×${fmt(pf.mult)}` : ""}${sFac > 1 ? ` · Struktur ×${fmt(sFac)}` : ""}`;
                return (
                  <button key={pos} onClick={() => tapCell(pos)}
                    className="relative rounded-md aspect-square flex items-center justify-center font-mono font-bold transition-all"
                    style={{
                      background: b ? `${cat.color}` : "#16232f",
                      color: b ? "#fff" : "#adbecc",
                      border: `1px solid ${b ? cat.color : "#20303d"}`,
                      boxShadow: [
                        b && fam.legendary ? `inset 0 0 0 2px ${GOLD}` : null,
                        isSel ? "inset 0 0 0 2px #fff" : null,
                        !b && structLit(pos) ? `inset 0 0 0 2px ${CAT.value.color}88` : null,
                        b && structLit(pos) ? `0 0 8px ${cat.color}` : null,
                      ].filter(Boolean).join(", ") || undefined,
                      // #224.1: Formations-Ring (Rahmenfarbe nach Formations-Anzahl) als AUSSEN-Outline → gruppiert die
                      // Formation, getrennt vom Kategorie-Rahmen. Im Abreißen-Modus weicht er dem roten Lösch-Ring.
                      outline: deleteActive && b ? "2px solid #d1462f" : (inForm && !fb.dashed ? `1.5px solid ${fb.color}` : undefined),
                      outlineOffset: 1,
                      cursor: deleteActive && !b ? "default" : "pointer",
                    }}
                    title={title}>
                    <span className="absolute top-[3px] right-[3px] w-[7px] h-[7px] rounded-full" style={{ background: SUIT_COLOR[card.suit] }} />
                    {boost > 0 && <span className="absolute top-[1px] left-[3px] text-[8px] font-extrabold" style={{ color: b ? "#fff" : "#3fb56a" }}>+{boost}</span>}
                    <span className="text-[13px] sm:text-[15px] leading-none">{ev}</span>
                    {b && pos === anchorCell && (
                      <span className="absolute bottom-[1px] left-[3px] text-[7px] font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
                        {fam.name.slice(0, 3).toUpperCase()}{tierLabel(b.tier)}
                      </span>
                    )}
                    {/* #224.1: Formation an dieser Position — ×mult + Typ (W/F/T/Z) mittig unten, in der Formationsfarbe. */}
                    {inForm && (
                      <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[7px] font-bold leading-none whitespace-nowrap" style={{ color: fb.color, textShadow: "0 1px 2px #000a" }}>
                        {formLabels}×{fmt(pf.mult)}
                      </span>
                    )}
                    {/* #224.9: Ziel-Farbe des colorLocked-Gebäudes (Buntglas/Zunfthaus) — weiß umrandeter Punkt, klar getrennt von der Karten-Suit oben. */}
                    {b && pos === anchorCell && b.colorChoice && (
                      <span className="absolute bottom-[2px] right-[3px] w-[8px] h-[8px] rounded-full" title={`bufft Farbe ${b.colorChoice}`}
                        style={{ background: SUIT_COLOR[b.colorChoice], boxShadow: "0 0 0 1.5px rgba(255,255,255,0.9)" }} />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Legende (Rahmen/Icon, nicht Füllfarbe wegen Suit-Kollision) */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] font-mono opacity-80">
              {Object.entries(CAT).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5"><span className="w-[11px] h-[11px] rounded-[3px]" style={{ background: v.color }} />{v.label}</span>
              ))}
              <span className="inline-flex items-center gap-1.5"><span className="w-[11px] h-[11px] rounded-[3px]" style={{ boxShadow: `inset 0 0 0 2px ${GOLD}` }} />legendär</span>
            </div>
            {/* #224.1: Formations-Legende — Ring + „×mult" markiert aktive Formationen; W/F/T/Z = Typ. */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] font-mono opacity-60">
              <span>Ring = aktive Formation (×mult)</span>
              <span><b>W</b> Wiederholung</span><span><b>F</b> Farbblock</span><span><b>T</b> Treppe</span><span><b>Z</b> Wechsel</span><span><b>A</b> Anker</span>
            </div>
          </section>

          {/* ---- Bau-Assistent + Vorschau ---- */}
          <section className="flex flex-col gap-4">
            <div className="rounded-xl p-3" style={{ background: "#0e1822", border: "1px solid #20303d" }}>
              {/* Schrittleiste — #224.5: Nummer und Label immer als getrennte Zeilen (kein umbruchs-abhängiges Layout). */}
              <div className="flex gap-1.5 mb-3 text-[11px] font-mono">
                {[["1 ·", "Hauptaktion"], ["2 ·", "Verschieben"], ["3 ·", "Bestätigen"]].map(([n, w], i) => (
                  <span key={i} className="flex-1 text-center rounded-md py-1.5 px-1 leading-tight"
                    style={{ background: i === step ? `${CAT.value.color}22` : "#16232f", border: `1px solid ${i === step ? CAT.value.color : "#20303d"}`,
                             color: i === step ? "#e7eef5" : (i < step ? CAT.value.color : "#7f93a4"), fontWeight: i === step ? 700 : 500 }}>
                    <span className="block">{n}</span><span className="block">{w}</span>
                  </span>
                ))}
              </div>

              {/* Schritt-Körper */}
              {step === 0 && !acted && (
                <div>
                  <div className="text-sm font-semibold mb-2">Wie willst du diese Phase bauen?</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => setMode("build")} className="rounded-lg py-3 px-2 text-sm font-bold flex flex-col items-center gap-0.5"
                      style={{ background: mode === "build" ? `${CAT.value.color}22` : "#16232f", border: `1.5px solid ${mode === "build" ? CAT.value.color : "#2b3e4d"}` }}>
                      Bauen<span className="text-[10px] font-mono font-normal opacity-60">Bauplan setzen</span>
                    </button>
                    <button onClick={() => setMode("upgrade")} className="rounded-lg py-3 px-2 text-sm font-bold flex flex-col items-center gap-0.5"
                      style={{ background: mode === "upgrade" ? `${CAT.value.color}22` : "#16232f", border: `1.5px solid ${mode === "upgrade" ? CAT.value.color : "#2b3e4d"}` }}>
                      Ausbauen<span className="text-[10px] font-mono font-normal opacity-60">Gebäude +1 Stufe</span>
                    </button>
                  </div>

                  {mode === "build" && (
                    <div className="flex flex-col gap-2">
                      {offers.map((o, idx) => {
                        const fam = familyDef(o.familyId);
                        if (!fam) return null;
                        const cat = CAT[fam.category];
                        const size = shapeRotations(fam.form)[0].length;
                        const noRoom = !enumeratePlacements(fam.form, buildings).length || coverCount + size > maxCover;
                        const needColor = fam.colorLocked && !colorPick;
                        const disabled = o.used || noRoom || needColor;
                        return (
                          <div key={idx} className="rounded-lg p-2.5" style={{ background: "#16232f", border: `1px solid ${o.legendary ? GOLD + "88" : cat.color + "66"}`, opacity: o.used ? 0.4 : 1 }}>
                            <div className="grid grid-cols-[auto_1fr_auto] gap-2.5 items-center">
                              <div className="p-1 rounded" style={{ background: "#0e1822" }}><MiniShape form={fam.form} color={cat.color} /></div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold flex items-center gap-1.5">
                                  <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: cat.color }} />{fam.name}
                                </div>
                                <div className="text-[11px] font-mono opacity-60 leading-snug">{famEff(fam, { tier: o.tier })}</div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: o.legendary ? `${GOLD}22` : "#0e1822", color: o.legendary ? GOLD : "#adbecc" }}>
                                  {o.legendary ? "Legendär" : `Stufe ${tierLabel(o.tier)}`}
                                </span>
                                <button onClick={() => placeOffer(o)} disabled={disabled}
                                  className="text-xs font-bold rounded-md px-2.5 py-1"
                                  style={disabled ? { background: "#1a2632", color: "#5a6b78", cursor: "not-allowed" } : { background: cat.color, color: "#fff" }}>
                                  {o.used ? "Gebaut" : noRoom ? "Kein Platz" : "Errichten"}
                                </button>
                              </div>
                            </div>
                            {fam.colorLocked && !o.used && (
                              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono">
                                <span className="opacity-60">bufft Farbe:</span>{/* #224.9: die Ziel-Farbe ist wählbar & sichtbar (der Effekt gilt nur ihr) */}
                                {SUIT_ORDER.map((s) => (
                                  <button key={s} onClick={() => setColorPick(s)} className="w-5 h-5 rounded-full"
                                    style={{ background: SUIT_COLOR[s], outline: colorPick === s ? "2px solid #fff" : "none", outlineOffset: 1 }} title={s} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="text-[11px] font-mono opacity-50">↳ Bauplan „Errichten" → wird an die erste freie Stelle gesetzt. Danach auf dem Brett antippen → an eine andere Position tippen (⟳ dreht).</div>
                    </div>
                  )}
                  {mode === "upgrade" && (
                    <div className="text-[11px] font-mono opacity-60">↳ Tippe ein Gebäude auf dem Brett, um es +1 Stufe auszubauen.</div>
                  )}
                  <div className="mt-3">
                    <button onClick={() => goStep(1)} className="w-full rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>Überspringen →</button>
                  </div>
                </div>
              )}

              {step === 0 && acted && (
                <div>
                  <div className="text-sm rounded-r-lg px-3 py-2.5 mb-1" style={{ background: `${CAT.score.color}18`, borderLeft: `3px solid ${CAT.score.color}` }}>
                    ✓ Hauptaktion gesetzt. Tippe ein Gebäude auf dem Brett an und dann eine freie Zelle, um es zu verschieben — beliebig oft bis zum Bestätigen (⟳ dreht).
                  </div>
                  <button onClick={() => goStep(1)} className="w-full rounded-lg py-2 text-sm font-bold mt-2" style={{ background: CAT.value.color, color: "#fff" }}>Weiter → Verschieben</button>
                </div>
              )}

              {step === 1 && (
                <div>
                  <div className="text-sm rounded-r-lg px-3 py-2.5" style={{ background: `${CAT.score.color}14`, borderLeft: `3px solid ${CAT.score.color}` }}>
                    Verschieben (optional, beliebig oft): Gebäude antippen → freie Zelle antippen. ⟳ dreht das ausgewählte Gebäude. Übernommen wird nur der bestätigte Stand.
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => goStep(0)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>← Zurück</button>
                    <button onClick={() => goStep(2)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: CAT.value.color, color: "#fff" }}>Weiter → Bestätigen</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="text-sm rounded-r-lg px-3 py-2.5" style={{ background: `${CAT.score.color}14`, borderLeft: `3px solid ${CAT.score.color}` }}>
                    Bestätigen: der Bau dieser Phase wird übernommen — danach startet Durchlauf {round}.
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => goStep(1)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>← Zurück</button>
                    {/* #224.6: „Bau bestätigen" schließt direkt ab (kein zusätzliches Modal mehr) — nur eine Rückfrage. */}
                    <button onClick={() => onDone?.()} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: CAT.value.color, color: "#fff" }}>Bau bestätigen →</button>
                  </div>
                </div>
              )}

              {/* Werkzeuge */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #20303d" }}>
                <button onClick={() => { setDeleteActive((v) => !v); setSelId(null); }} className="rounded-lg py-2 text-xs font-bold"
                  style={deleteActive ? { background: "#d1462f", color: "#fff" } : { background: "#16232f", border: "1px solid #2b3e4d" }}>🗑 Abreißen</button>
                <button onClick={() => setSelId(null)} className="rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d", opacity: selId != null ? 1 : 0.5 }}>Auswahl lösen</button>
              </div>
            </div>

            {/* Vorschau & Brett-Status */}
            <div className="rounded-xl p-3" style={{ background: "#0e1822", border: "1px solid #20303d" }}>
              <div className="text-[11px] font-mono uppercase tracking-wide opacity-60 mb-2">Vorschau & Brett-Status</div>
              <div className="grid grid-cols-2 gap-2">
                <Stat k="Formationen" v={formCount} hero />
                <Stat k="Σ Kartenwert" v={sumValue} hero />
                <Stat k="Abdeckung" v={`${Math.round(coverCount / N_POS * 100)}%`} />
                <Stat k="Häuserzeilen" v={houseRows} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[12px] font-mono opacity-80">
                <span>{buildings.length} Gebäude</span>
                {Object.entries(CAT).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5"><span className="w-[9px] h-[9px] rounded-full" style={{ background: v.color }} />{v.label} <b>{catCount[k]}</b></span>
                ))}
              </div>
            </div>
          </section>
        </div>
        {/* #224.6: Bestätigungs-Modal entfernt — der Bestätigen-Schritt ist die einzige Rückfrage. */}
      </div>
    </div>
  );
}

// Kleine Stat-Kachel.
function Stat({ k, v, hero = false }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: hero ? `${CAT.value.color}12` : "#16232f", border: `1px solid ${hero ? CAT.value.color + "4d" : "#20303d"}` }}>
      <div className="text-[10px] font-mono uppercase tracking-wide opacity-55">{k}</div>
      <div className="text-xl font-extrabold tabular-nums mt-0.5">{v}</div>
    </div>
  );
}

// Spielersicht-Kurzbeschreibung eines Bauplans/Gebäudes (stufen-aufgelöst, driftsicher aus architect.js).
function famEff(fam, b) {
  const t = b?.tier ?? 1;
  const base = fam.base;
  const nz = (v) => tierNum(v, t);
  switch (base.kind) {
    case "flat":       return fam.category === "value" ? `alle Abgedeckten +${nz(base.value)} Wert` : `Sieg → +${nz(base.score)} Punkte`;
    case "lowValue":   return `niedrige Karten +${nz(base.value)} Wert`;
    case "color":      return fam.category === "value" ? `passende Farbe +${nz(base.value)} Wert` : `passende Farbe → +${nz(base.score)} Punkte`;
    case "target":     return `${fam.target === "highest" ? "höchste" : "niedrigste"} Karte ${fam.category === "value" ? `+${nz(base.value)} Wert` : `→ +${nz(base.score)} Punkte`}`;
    case "streak":     return `Sieg → +${nz(base.score)} Punkte × Serie`;
    case "crit":       return `Crit-Sieg → +${nz(base.score)} Punkte`;
    case "milestone":  return `jeder ${base.every}. Sieg → +${nz(base.score)} Punkte`;
    case "mult":       return `Siege hier ×${base.factor}`;
    case "joker":      return `Formations-Joker (${base.types.join("/")})`;
    case "transparentFarb": return "Farbblock-Transparenz";
    case "bind":       return "Treppen-Bindeglied (±Span)";
    case "crossSeg":   return "öffnet die Segmentgrenze";
    case "anker":      return `jede Zelle = Anker ×${tierFactor(base.factor, t).toFixed(2)}`;
    case "formMult":   return `Formationen hier ×${base.factor}`;
    default:           return "";
  }
}
