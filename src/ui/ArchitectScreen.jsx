import { useState, useMemo, useRef, useEffect } from "react";
import {
  familyDef, shapeRotations, enumeratePlacements, isValidFootprint,
  occupiedCells, precomputeArchitect, architectValueBonus, structureFactorMap,
  rowOf, colOf, posOf, ROWS, COLS, N_POS, MAX_TIER, tierNum, tierFactor,
  HAEUSERZEILE_FACTOR, SPALTE_FACTOR, DIAGONALE_FACTOR,
} from "../game/architect.js";
import { computeFormations, summarizeFormations } from "../game/formations.js";
import { SUIT_ORDER } from "../game/constants.js";
import { ARCH_CAT as CAT } from "./indicators/vocab.js";
import { tierColor } from "../game/rarity.js";
import { formationBorder } from "./formationStyle.js";
import { formationAbbr } from "./formationLabels.js";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { useEscape } from "./useEscape.js";

/* ============================================================
   Der Architekt (#202) — natürlicher Bau-Ablauf (#224.12, „experiment: fühlt sich das besser an?").
   Ablauf je Phase:
     choose   — Fenster mit 3 Bauplänen (perk-artig) + 4. Wahl „Aufrüsten"; darunter das Board (Vorschau).
     place    — nur Board: das gewählte Gebäude liegt als VORSCHAU drauf; ziehen/⟳ drehen; „Bauen" committet.
     upgrade  — nur Board: ein bestehendes Gebäude antippen → +1 Stufe → danach.
     after    — „Verschieben" ODER „Beenden".
     move     — nur Board: Gebäude beliebig oft ziehen; „Bestätigen" → Durchlauf startet.
   Löschen: KEIN Dauerknopf mehr — passt ein gewählter Bauplan nirgends (Deckel/kein Platz), wird angeboten,
   ein bestehendes Gebäude zu entfernen (removeFor), danach wird automatisch platziert.
   Bauen ist bis „Bauen" nur LOKALE Vorschau (pending) — Reducer bleibt unverändert (onBuild erst beim Commit).
   Geometrie/Validierung aus architect.js (SSOT); Aktionen als echte Reducer-Dispatches.
   ============================================================ */

const SUIT_COLOR = { R: "#d9553f", B: "#4f82d6", G: "#3f9d63", Y: "#c79a2e" };
const GOLD = "#c8962f"; // Legendär
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };
const tierLabel = (t) => (t === "legendary" ? "★" : ROMAN[t] || "");
const fmt = (x) => x.toFixed(2).replace(".", ",");
const PENDING_ID = "__pending__"; // synthetische id des noch-nicht-gebauten Vorschau-Gebäudes

// Footprint einer Form bei (anchor, rotIdx) — im Gitter, sonst null.
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

// Mini-Vorschau einer Form (kleines Raster, Kategorie-Farbe) — für Bauplan-Karten.
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
  const committed = architect.buildings || [];
  const offers = architect.offers || [];
  const maxCover = architect.maxCover ?? N_POS;
  const round = (state.cycle || 0) + 1;

  const order = state.playerOrder || [];
  const deck = state.deck || [];
  const cards = order.map((di) => deck[di]).filter(Boolean);

  // Ablauf-Zustand.
  const [phase, setPhase] = useState("choose");            // choose | place | upgrade | after | move
  const [pending, setPending] = useState(null);            // { familyId, tier, legendary, colorChoice, footprint }
  const [selId, setSelId] = useState(null);                // ausgewähltes Gebäude (⟳/Ziehen)
  const [colorPick, setColorPick] = useState(SUIT_ORDER[0]);
  const [removeFor, setRemoveFor] = useState(null);        // Bauplan wartet auf Platz → Gebäude entfernen anbieten
  const dragRef = useRef(null);
  const [dragPrev, setDragPrev] = useState(null);          // { footprint, valid, id } während einer Drag-Geste

  // Effektive Gebäude = committet (+ in „place" das Vorschau-Gebäude). Board/Precompute/Formationen rechnen damit.
  const pendingBuilding = pending
    ? { id: PENDING_ID, familyId: pending.familyId, tier: pending.tier, legendary: pending.legendary, footprint: pending.footprint, colorChoice: pending.colorChoice }
    : null;
  const buildings = (phase === "place" && pendingBuilding) ? [...committed, pendingBuilding] : committed;

  const occ = useMemo(() => occupiedCells(buildings), [buildings]);
  const coverCount = occ.size;
  const committedCover = useMemo(() => occupiedCells(committed).size, [committed]);

  const effArch = useMemo(() => ({ ...architect, buildings }), [architect, buildings]);
  const pre = useMemo(() => (cards.length ? precomputeArchitect(effArch, order, deck) : null), [effArch, order, deck, cards.length]);
  const structF = useMemo(() => structureFactorMap(occ), [occ]);
  // Struktur-Kombi-Bonus als Summe (#UI): Σ der Extra-Faktoren über alle Karten auf fertigen Strukturen
  // (Zeile/Spalte/Diagonale, multiplikativ gestapelt) → Gesamt-Punkte-Bonus in Prozent. Nicht beteiligte Zellen
  // haben Faktor 1 → (f−1)=0, tragen nichts bei.
  const structBonusPct = useMemo(() => Math.round(structF.reduce((t, f) => t + (f - 1), 0) * 100), [structF]);
  const formations = useMemo(() => {
    if (!cards.length) return [];
    return computeFormations(order, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, effArch);
  }, [effArch, order, deck, state.roles, state.perks, state.skills, state.familyTiers]);
  const formCount = useMemo(() => summarizeFormations(formations).count, [formations]);

  const buildingAt = (pos) => buildings.find((b) => b.footprint.includes(pos)) || null;
  const committedAt = (pos) => committed.find((b) => b.footprint.includes(pos)) || null;
  const effValueAt = (pos) => {
    const card = cards[pos];
    if (!card) return 0;
    const bonus = pre ? architectValueBonus(pre, pos, card) : 0;
    return card.value + bonus;
  };
  const sumValue = cards.reduce((t, _c, p) => t + effValueAt(p), 0);
  const houseRows = (() => { let n = 0; for (let r = 0; r < ROWS; r++) { let full = true; for (let c = 0; c < COLS; c++) if (!occ.has(posOf(r, c))) full = false; if (full) n++; } return n; })();

  const catCount = { value: 0, score: 0, formation: 0 };
  for (const b of committed) { const f = familyDef(b.familyId); if (f) catCount[f.category] += 1; }

  const canUpgradeAny = committed.some((b) => { const f = familyDef(b.familyId); return f && !f.legendary && typeof b.tier === "number" && b.tier < MAX_TIER; });

  // ---- Geometrie-Helfer ----
  const anchorOf = (fp) => posOf(Math.min(...fp.map(rowOf)), Math.min(...fp.map(colOf)));
  const currentRotOf = (b) => {
    const form = familyDef(b.familyId).form, rots = shapeRotations(form), anchor = anchorOf(b.footprint), set = new Set(b.footprint);
    for (let r = 0; r < rots.length; r++) { const fp = footprintAt(form, r, anchor); if (fp && fp.length === b.footprint.length && fp.every((p) => set.has(p))) return r; }
    return 0;
  };
  const cellPos = (x, y) => { const el = document.elementFromPoint(x, y), c = el && el.closest ? el.closest("[data-arch-pos]") : null; return c ? Number(c.getAttribute("data-arch-pos")) : null; };

  // ---- Bauplan wählen → Vorschau platzieren (oder „kein Platz" → Gebäude entfernen anbieten) ----
  const fitFor = (o) => {
    const fam = familyDef(o.familyId); if (!fam) return null;
    const size = shapeRotations(fam.form)[0].length;
    if (committedCover + size > maxCover) return null;   // Baufeld-Deckel
    const fits = enumeratePlacements(fam.form, committed);
    return fits.length ? fits[0] : null;
  };
  const chooseOffer = (o) => {
    if (o.used) return;
    const fam = familyDef(o.familyId); if (!fam) return;
    const fp = fitFor(o);
    if (!fp) { setRemoveFor(o); return; }                // kein Platz → entfernen anbieten
    setPending({ familyId: o.familyId, tier: o.tier, legendary: o.legendary, colorChoice: fam.colorLocked ? colorPick : null, footprint: fp });
    setSelId(PENDING_ID);
    setPhase("place");
  };
  // Sobald durch Entfernen Platz frei wird, den wartenden Bauplan automatisch platzieren.
  useEffect(() => {
    if (!removeFor) return;
    const fp = fitFor(removeFor);
    if (fp) {
      const fam = familyDef(removeFor.familyId);
      setPending({ familyId: removeFor.familyId, tier: removeFor.tier, legendary: removeFor.legendary, colorChoice: fam.colorLocked ? colorPick : null, footprint: fp });
      setSelId(PENDING_ID); setPhase("place"); setRemoveFor(null);
    }
  }, [committed, removeFor]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmBuild = () => {
    if (!pending) return;
    onBuild?.({ familyId: pending.familyId, tier: pending.tier, footprint: pending.footprint, colorChoice: pending.colorChoice });
    setPending(null); setSelId(null); setPhase("move"); // direkt ins Fertig-/Verschieben-Panel (ein Panel, ein Bestätigen)
  };
  const cancelPending = () => { setPending(null); setSelId(null); setPhase("choose"); };

  // ---- Tap je Phase ----
  const tapCell = (pos) => {
    if (removeFor) { const cb = committedAt(pos); if (cb) onDemolish?.(cb.id); return; } // entfernen für wartenden Bauplan
    if (phase === "upgrade") { const cb = committedAt(pos); if (cb) { const f = familyDef(cb.familyId); if (f && !f.legendary && cb.tier < MAX_TIER) { onUpgrade?.(cb.id); setPhase("move"); } } return; }
    if (phase === "place") { const b = buildingAt(pos); if (b && b.id === PENDING_ID) setSelId(PENDING_ID); return; }
    if (phase === "move") { const b = buildingAt(pos); if (b) setSelId(b.id); return; }
  };

  // ---- Drag & Drop (Vorschau-Gebäude in „place", bestehende in „move"); Griff überall am Fußabdruck ----
  const startDrag = (pos, b, e) => {
    const form = familyDef(b.familyId).form;
    const a = anchorOf(b.footprint);
    const grabRow = rowOf(pos) - rowOf(a), grabCol = colOf(pos) - colOf(a);
    const rot = currentRotOf(b);
    const others = buildings.filter((x) => x.id !== b.id);
    const g = { id: b.id, x0: e.clientX, y0: e.clientY, active: false };
    dragRef.current = g;
    const fpFor = (target) => { const ar = rowOf(target) - grabRow, ac = colOf(target) - grabCol; return (ar < 0 || ac < 0 || ar >= ROWS || ac >= COLS) ? null : footprintAt(form, rot, posOf(ar, ac)); };
    const commit = (fp) => { if (b.id === PENDING_ID) setPending((p) => (p ? { ...p, footprint: fp } : p)); else onMove?.({ buildingId: b.id, footprint: fp }); };
    const move = (ev) => {
      if (!g.active) { const dx = ev.clientX - g.x0, dy = ev.clientY - g.y0; if (dx * dx + dy * dy < 36) return; g.active = true; setSelId(b.id); }
      ev.preventDefault();
      const target = cellPos(ev.clientX, ev.clientY);
      const fp = target == null ? null : fpFor(target);
      setDragPrev(fp ? { footprint: fp, valid: !!isValidFootprint(form, fp, others), id: b.id } : { footprint: [], valid: false, id: b.id });
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      const wasActive = g.active; dragRef.current = null;
      if (wasActive) { const target = cellPos(ev.clientX, ev.clientY), fp = target == null ? null : fpFor(target); if (fp && isValidFootprint(form, fp, others)) commit(fp); setDragPrev(null); }
      else tapCell(pos);
    };
    window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  };
  const onCellDown = (pos, e) => {
    const b = buildingAt(pos);
    const canDrag = !removeFor && ((phase === "place" && b && b.id === PENDING_ID) || (phase === "move" && b));
    if (canDrag) { startDrag(pos, b, e); return; }
    // Kein Ziehen hier: Tap → tapCell, aber ein Scroll (pointercancel) darf keinen Tap auslösen und keinen Listener hinterlassen.
    const cleanup = () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); };
    const up = () => { cleanup(); tapCell(pos); };
    const cancel = () => { cleanup(); };
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  };
  const rotateSelected = () => {
    const b = buildings.find((x) => x.id === selId); if (!b) return;
    const form = familyDef(b.familyId).form, rots = shapeRotations(form), a = anchorOf(b.footprint), cur = currentRotOf(b), others = buildings.filter((x) => x.id !== b.id);
    for (let k = 1; k <= rots.length; k++) { const fp = footprintAt(form, (cur + k) % rots.length, a); if (fp && isValidFootprint(form, fp, others)) { if (b.id === PENDING_ID) setPending((p) => (p ? { ...p, footprint: fp } : p)); else onMove?.({ buildingId: b.id, footprint: fp }); return; } }
  };

  // Live-Delta beim Ziehen (Vorschau-Position).
  const dragDelta = useMemo(() => {
    if (!dragPrev || !dragPrev.footprint.length) return null;
    const previewBuildings = buildings.map((x) => (x.id === dragPrev.id ? { ...x, footprint: [...dragPrev.footprint].sort((m, n) => m - n) } : x));
    const previewArch = { ...architect, buildings: previewBuildings };
    const p2 = precomputeArchitect(previewArch, order, deck);
    const val2 = cards.reduce((t, c, p) => t + c.value + (architectValueBonus(p2, p, c) || 0), 0);
    const form2 = summarizeFormations(computeFormations(order, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, previewArch)).count;
    return { dVal: val2 - sumValue, dForm: form2 - formCount, valid: dragPrev.valid };
  }, [dragPrev]); // eslint-disable-line react-hooks/exhaustive-deps

  const structLit = (pos) => (structF[pos] || 1) > 1;
  const showRotate = selId != null && buildings.some((x) => x.id === selId) && (phase === "place" || phase === "move");
  const pendingFam = pending ? familyDef(pending.familyId) : null;

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-start sm:items-center justify-center p-2 sm:p-4"
      style={{ background: "#0c1017dd", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-5xl rounded-2xl p-4 sm:p-6 max-h-[96dvh] overflow-y-auto overlay-card"
        style={{ background: "#111c27", border: `1px solid ${CAT.value.color}55`, color: "#e7eef5" }}>

        {/* Kopf: Runde + Baufeld */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono opacity-60" style={{ color: CAT.value.color }}>Architekt · Bauphase</div>
            <h2 className="text-xl font-bold mt-0.5">🏗 Der Architekt</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Runde {round}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-50 mt-0.5">Baufeld frei</div>
            <div className="font-pixel-dense font-bold leading-none" style={{ color: GOLD, fontSize: 22 }}>
              {Math.max(0, maxCover - coverCount)}<span className="text-xs opacity-70 font-mono"> / {maxCover}</span>
            </div>
            <div className="text-[11px] font-mono opacity-55">{coverCount} belegt · {Math.round(coverCount / N_POS * 100)}%</div>
          </div>
        </div>
        {state.lastCycleScore != null && <div className="mb-3"><RoundScoreBadge state={state} /></div>}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] items-start">
          {/* ---- Brett 8×5 — Mobil in der Mitte (order-2): Phase-Panel drüber, Vorschau drunter; Desktop links (md:order-1). ---- */}
          <section className="rounded-xl p-3 order-2 md:order-1" style={{ background: "#0e1822", border: "1px solid #20303d" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-mono uppercase tracking-wide opacity-60">Brett · 8 × 5</div>
              {showRotate && (
                <button onClick={rotateSelected} className="text-xs font-bold rounded-lg px-2.5 py-1"
                  style={{ background: "#1a2a37", border: `1px solid ${CAT.value.color}` }}>⟳ Drehen</button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1" style={{ maxWidth: 300, margin: "0 auto" }}>
              {(() => { const dragCells = dragPrev ? new Set(dragPrev.footprint) : null; const draggingId = dragPrev ? dragPrev.id : null; return cards.map((card, pos) => {
                const b = buildingAt(pos);
                const isPending = b && b.id === PENDING_ID;
                // Nur Zellen mit einem ziehbaren Gebäude fangen die Geste (touchAction:none) — sonst scrollt der Finger die Seite.
                const canDragHere = !removeFor && ((phase === "place" && isPending) || (phase === "move" && !!b));
                const fam = b ? familyDef(b.familyId) : null;
                const cat = fam ? CAT[fam.category] : null;
                // Raritäts-Rahmen: Stufenfarbe (I grau · II grün · III blau · IV lila), Legendär = Gold. Füllung bleibt Kategorie.
                const tierCol = b ? (fam.legendary ? GOLD : tierColor(b.tier)) : null;
                const ev = effValueAt(pos);
                const boost = ev - card.value;
                const anchorCell = b ? Math.min(...b.footprint) : -1;
                const isSel = b && b.id === selId;
                const pf = formations[pos] || { mult: 1, formations: [] };
                const inForm = pf.mult > 1;
                const fb = formationBorder(pf);
                const formLabels = [...new Set((pf.formations || []).map((f) => formationAbbr(f.type)))].join("");
                const sFac = structF[pos] || 1;
                const isRemovable = !!removeFor && !!committedAt(pos);
                const title = b
                  ? `${fam.name} (${tierLabel(b.tier)})${isPending ? " · Vorschau" : ""} — ${famEff(fam, b)}${inForm ? ` · Formation ×${fmt(pf.mult)}` : ""}${sFac > 1 ? ` · Struktur ×${fmt(sFac)}` : ""}`
                  : `Pos ${pos + 1}${inForm ? ` — Formation ×${fmt(pf.mult)}` : ""}${sFac > 1 ? ` · Struktur ×${fmt(sFac)}` : ""}`;
                const inDragPrev = dragCells ? dragCells.has(pos) : false;
                const dragValid = dragPrev && dragPrev.valid;
                const isDragOrig = draggingId != null && b && b.id === draggingId;
                return (
                  <button key={pos} data-arch-pos={pos} onPointerDown={(e) => onCellDown(pos, e)}
                    className="relative rounded-md aspect-square flex items-center justify-center font-mono font-bold transition-all"
                    style={{
                      background: inDragPrev ? (dragValid ? "#1f5a34" : "#5a2020") : (b ? `${cat.color}` : "#16232f"),
                      color: b || inDragPrev ? "#fff" : "#adbecc",
                      border: `1px solid ${inDragPrev ? (dragValid ? "#5fce86" : "#e0705a") : (b ? cat.color : "#20303d")}`,
                      opacity: (isDragOrig && !inDragPrev) ? 0.35 : (isPending && !inDragPrev ? 0.82 : 1),
                      touchAction: canDragHere ? "none" : "pan-y",
                      boxShadow: [
                        inDragPrev ? `inset 0 0 0 2px ${dragValid ? "#5fce86" : "#e0705a"}` : null,        // Drag-Vorschau (oben)
                        isSel && !inDragPrev ? "inset 0 0 0 2px #fff" : null,                              // ausgewählt (weiß)
                        // Raritäts-Rahmen je Gebäude: 2px Stufenfarbe am Rand + 1px dunkle Trennlinie → auch bei ähnlicher Füllfarbe klar lesbar.
                        b ? `inset 0 0 0 2px ${tierCol}, inset 0 0 0 3px #0d1620cc` : null,
                        b && fam.legendary ? `0 0 8px ${GOLD}55` : null,                                   // Legendär → zusätzlicher warmer Glow
                        b && structLit(pos) ? "0 0 10px #f0b42999" : null,                                // Gebäude auf fertiger Struktur → Gold-Glow (außen, konkurriert nicht mit dem Rahmen)
                        !b && structLit(pos) ? "inset 0 0 0 2px #f0b429aa" : null,                        // leere Zelle einer fast-fertigen Struktur → Gold-Hinweis
                      ].filter(Boolean).join(", ") || undefined,
                      outline: isRemovable ? "2px dashed #d1462f" : (isPending ? "2px dashed #ffffffcc" : (inForm && !fb.dashed ? `1.5px solid ${fb.color}` : undefined)),
                      outlineOffset: 1,
                      cursor: "pointer",
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
                    {inForm && (
                      <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[7px] font-bold leading-none whitespace-nowrap" style={{ color: fb.color, textShadow: "0 1px 2px #000a" }}>
                        {formLabels}×{fmt(pf.mult)}
                      </span>
                    )}
                    {b && pos === anchorCell && b.colorChoice && (
                      <span className="absolute bottom-[2px] right-[3px] w-[8px] h-[8px] rounded-full" title={`bufft Farbe ${b.colorChoice}`}
                        style={{ background: SUIT_COLOR[b.colorChoice], boxShadow: "0 0 0 1.5px rgba(255,255,255,0.9)" }} />
                    )}
                  </button>
                );
              }); })()}
            </div>
            {/* Legende */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] font-mono opacity-80">
              {Object.entries(CAT).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5"><span className="w-[11px] h-[11px] rounded-[3px]" style={{ background: v.color }} />{v.label}</span>
              ))}
            </div>
            {/* Raritäts-Rahmen = Stufe des Gebäudes (Füllung = Kategorie). */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[10px] font-mono opacity-70">
              <span className="opacity-70">Rahmen = Stufe:</span>
              {[1, 2, 3, 4].map((t) => (
                <span key={t} className="inline-flex items-center gap-1"><span className="w-[11px] h-[11px] rounded-[3px]" style={{ boxShadow: `inset 0 0 0 2px ${tierColor(t)}` }} />{ROMAN[t]}</span>
              ))}
              <span className="inline-flex items-center gap-1"><span className="w-[11px] h-[11px] rounded-[3px]" style={{ boxShadow: `inset 0 0 0 2px ${GOLD}` }} />★ legendär</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] font-mono opacity-60">
              <span>Ring = aktive Formation (×mult)</span>
              <span><b>W</b> Wiederholung</span><span><b>F</b> Farbblock</span><span><b>T</b> Treppe</span><span><b>Z</b> Wechsel</span><span><b>A</b> Anker</span>
            </div>
          </section>

          {/* ---- Bau-Assistent + Vorschau. Mobil: `contents` löst die Gruppe auf → Phase-Panel (order-1) ÜBER dem Brett (order-2),
                 Vorschau (order-3) DRUNTER. Desktop: wieder eine flex-Spalte rechts (md:flex, md:order-2). ---- */}
          <section className="contents md:flex md:flex-col md:gap-4 md:order-2">
            <div className="rounded-xl p-3 order-1" style={{ background: "#0e1822", border: "1px solid #20303d" }}>

              {/* Struktur-Kombis (oben): welche Gebäude-Kombinationen Boni geben — live am Board umrandet. */}
              <div className="mb-3 rounded-lg px-2.5 py-2 text-[10px] font-mono leading-snug" style={{ background: "#141f29", border: "1px solid #24333f" }}>
                <div className="uppercase tracking-wide opacity-55 mb-1">Struktur-Kombis · ×Punkte je Durchlauf</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>volle <b>Zeile</b> ×{fmt(HAEUSERZEILE_FACTOR)}</span>
                  <span>volle <b>Spalte</b> ×{fmt(SPALTE_FACTOR)}</span>
                  <span><b>Diagonale</b> ×{fmt(DIAGONALE_FACTOR)}</span>
                </div>
                <div className="opacity-60 mt-1">Jede Karte auf einer vollständigen Zeile/Spalte/Diagonale macht bei einem Sieg entsprechend mehr <b>Punkte</b>. Faktoren stapeln multiplikativ.</div>
              </div>

              {/* removeFor: kein Platz → Gebäude entfernen anbieten */}
              {removeFor && (
                <div>
                  <div className="text-sm rounded-r-lg px-3 py-2.5 mb-2" style={{ background: "#3a1518", borderLeft: "3px solid #d1462f" }}>
                    <b>Kein Platz</b> für „{pendingFamName(removeFor)}". Soll ein Gebäude weichen? Tippe eins (rot gestrichelt) zum <b>Zerstören</b> — danach wird der Bauplan automatisch platziert.
                  </div>
                  <button onClick={() => setRemoveFor(null)} className="w-full rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>Abbrechen</button>
                </div>
              )}

              {/* choose: 3 Baupläne + „Aufrüsten" */}
              {!removeFor && phase === "choose" && (
                <div>
                  <div className="text-sm font-semibold mb-2">Was baust du diese Phase?</div>
                  <div className="flex flex-col gap-2">
                    {offers.map((o, idx) => {
                      const fam = familyDef(o.familyId);
                      if (!fam) return null;
                      const cat = CAT[fam.category];
                      const tierCol = o.legendary ? GOLD : tierColor(o.tier); // Rahmen/Badge = Stufe (Rarität): grau/grün/blau/lila/gold
                      const noRoom = !fitFor(o);
                      return (
                        <button key={idx} onClick={() => chooseOffer(o)} disabled={o.used}
                          className="rounded-lg p-2.5 text-left w-full transition-all hover:brightness-110"
                          style={{ background: `linear-gradient(${cat.color}1f, ${cat.color}1f), #16232f`, border: `1px solid ${tierCol}`, opacity: o.used ? 0.4 : 1, cursor: o.used ? "not-allowed" : "pointer" }}>
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
                                style={{ background: `${tierCol}22`, color: tierCol, border: `1px solid ${tierCol}66` }}>
                                {o.legendary ? "Legendär" : `Stufe ${tierLabel(o.tier)}`}
                              </span>
                              {noRoom && !o.used && <span className="text-[9px] font-mono" style={{ color: "#e0705a" }}>kein Platz →</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {/* 4. Wahl: Aufrüsten */}
                    <button onClick={() => { if (canUpgradeAny) setPhase("upgrade"); }} disabled={!canUpgradeAny}
                      className="rounded-lg p-2.5 text-left w-full transition-all hover:brightness-110"
                      style={{ background: "#16232f", border: `1px dashed ${CAT.value.color}66`, opacity: canUpgradeAny ? 1 : 0.4, cursor: canUpgradeAny ? "pointer" : "not-allowed" }}>
                      <div className="text-sm font-bold">⬆ Aufrüsten</div>
                      <div className="text-[11px] font-mono opacity-60 leading-snug mt-0.5">ein Gebäude +1 Stufe{canUpgradeAny ? "" : " · nichts ausbaubar"}</div>
                    </button>
                  </div>
                  <div className="mt-3">
                    <button onClick={() => onDone?.()} className="w-full rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>Nichts bauen · Durchlauf starten →</button>
                  </div>
                </div>
              )}

              {/* place: Vorschau-Gebäude positionieren */}
              {!removeFor && phase === "place" && pending && (
                <div>
                  <div className="text-sm rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.value.color}18`, borderLeft: `3px solid ${CAT.value.color}` }}>
                    <b>Platzieren:</b> zieh das Gebäude (weiß gestrichelt) an die richtige Stelle, <b>⟳ Drehen</b> oben. „Bauen" errichtet es.
                  </div>
                  {pendingFam && pendingFam.colorLocked && (
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] font-mono">
                      <span className="opacity-60">bufft Farbe:</span>
                      {SUIT_ORDER.map((s) => (
                        <button key={s} onClick={() => setPending((p) => (p ? { ...p, colorChoice: s } : p))} className="w-5 h-5 rounded-full"
                          style={{ background: SUIT_COLOR[s], outline: pending.colorChoice === s ? "2px solid #fff" : "none", outlineOffset: 1 }} title={s} />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={cancelPending} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>← Anderer Bauplan</button>
                    <button onClick={confirmBuild} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: CAT.value.color, color: "#fff" }}>Bauen ✓</button>
                  </div>
                </div>
              )}

              {/* upgrade: Gebäude antippen */}
              {!removeFor && phase === "upgrade" && (
                <div>
                  <div className="text-sm rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.value.color}18`, borderLeft: `3px solid ${CAT.value.color}` }}>
                    <b>Aufrüsten:</b> tippe ein Gebäude auf dem Brett → +1 Stufe.
                  </div>
                  <button onClick={() => { setPhase("choose"); }} className="w-full rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>← Zurück</button>
                </div>
              )}

              {/* Fertig: EIN Panel — optional beliebig oft verschieben, dann direkt starten. */}
              {!removeFor && phase === "move" && (
                <div>
                  <div className="text-sm rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.score.color}18`, borderLeft: `3px solid ${CAT.score.color}` }}>
                    ✓ <b>Fertig gebaut.</b> Optional: Gebäude auf dem Brett <b>ziehen</b> zum Verschieben (Griff überall, ⟳ dreht) — beliebig oft. Sonst direkt weiter.
                  </div>
                  <button onClick={() => onDone?.()} className="w-full rounded-lg py-2 text-sm font-bold" style={{ background: CAT.value.color, color: "#fff" }}>Durchlauf starten →</button>
                </div>
              )}
            </div>

            {/* Vorschau & Brett-Status — Mobil UNTER dem Brett (order-3), Desktop unter dem Phase-Panel in der rechten Spalte. */}
            <div className="rounded-xl p-3 order-3" style={{ background: "#0e1822", border: "1px solid #20303d" }}>
              <div className="text-[11px] font-mono uppercase tracking-wide opacity-60 mb-2">Vorschau & Brett-Status</div>
              {dragPrev && (() => {
                const ok = dragPrev.valid && dragPrev.footprint.length > 0;
                return (
                  <div className="mb-2 rounded-lg px-2.5 py-1.5 text-[11px] font-mono flex items-center gap-3 flex-wrap"
                    style={{ background: ok ? "#15351f" : "#3a1518", border: `1px solid ${ok ? "#2f9d55" : "#d1462f"}` }}>
                    <span className="font-bold" style={{ color: ok ? "#5fce86" : "#e0705a" }}>{ok ? "Vorschau" : "passt hier nicht"}</span>
                    {ok && dragDelta && <>
                      <span>Σ Wert <b style={{ color: dragDelta.dVal >= 0 ? "#5fce86" : "#e0705a" }}>{dragDelta.dVal >= 0 ? "+" : ""}{dragDelta.dVal}</b></span>
                      <span>Formationen <b style={{ color: dragDelta.dForm >= 0 ? "#5fce86" : "#e0705a" }}>{dragDelta.dForm >= 0 ? "+" : ""}{dragDelta.dForm}</b></span>
                    </>}
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-2">
                <Stat k="Struktur-Bonus" v={`+${structBonusPct} %`} hero />
                <Stat k="Σ Kartenwert" v={sumValue} hero />
                <Stat k="Abdeckung" v={`${Math.round(coverCount / N_POS * 100)}%`} />
                <Stat k="Häuserzeilen" v={houseRows} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[12px] font-mono opacity-80">
                <span>{committed.length} Gebäude</span>
                {Object.entries(CAT).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5"><span className="w-[9px] h-[9px] rounded-full" style={{ background: v.color }} />{v.label} <b>{catCount[k]}</b></span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Name eines Bauplan-Angebots (für die „kein Platz"-Meldung).
function pendingFamName(o) { const f = familyDef(o.familyId); return f ? f.name : "Bauplan"; }

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
    case "flat":       return fam.category === "value" ? `alle Abgedeckten +${nz(base.value)} Wert` : `Sieg +${nz(base.score)} Punkte`;
    case "lowValue":   return `niedrige Karten +${nz(base.value)} Wert`;
    case "color":      return fam.category === "value" ? `passende Farbe +${nz(base.value)} Wert` : `passende Farbe +${nz(base.score)} Punkte`;
    case "target":     return `${fam.target === "highest" ? "höchste" : "niedrigste"} Karte +${nz(fam.category === "value" ? base.value : base.score)} ${fam.category === "value" ? "Wert" : "Punkte"}`;
    case "streak":     return `Sieg +${nz(base.score)} Punkte × Serie`;
    case "crit":       return `Crit-Sieg +${nz(base.score)} Punkte`;
    case "milestone":  return `jeder ${base.every}. Sieg +${nz(base.score)} Punkte`;
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
