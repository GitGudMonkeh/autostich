import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import {
  familyDef, shapeRotations, enumeratePlacements, isValidFootprint, nextRotationFootprint,
  occupiedCells, precomputeArchitect, architectValueBonus, boardFactorMap, structureFactorMap, districtFactorMap,
  rowOf, colOf, posOf, ROWS, COLS, N_POS, tierNum, tierFactor, upgradeInfo, bindSpanFor,
  HAEUSERZEILE_FACTOR, SPALTE_FACTOR, DIAGONALE_FACTOR, DISTRICT_BONUS, DISTRICT_CAP,
} from "../game/architect.js";
import { computeFormations, summarizeFormations } from "../game/formations.js";
import { allianceGroups } from "../game/families.js"; // #289: Farballianz für Wert-Boost-Anzeige
import { SUIT_ORDER, PLANT_VALUE_CAP } from "../game/constants.js";
import { ARCH_CAT as CAT, PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { tierColor } from "../game/rarity.js";
import FormIcon from "./FormIcon.jsx";
import { formationBorder } from "./formationStyle.js";
import { formationAbbr } from "./formationLabels.js";
import { archFrameLines } from "./CardGrid.jsx"; // #UI: durchgezogene Gebäude-Kontur wie in der Aufstellungsphase
import { fmtScore } from "./format.js";
import { GlossaryPanel } from "./Glossary.jsx";
import { glacierGridProps } from "./glacierBoard.js"; // Eis: Gletscher-/Firn-Marker auch am Architekt-Brett
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon (Eis ersetzt glacier.webp)
import { useEscape } from "./useEscape.js";
import { phaseCard, PhaseHairline, PHASE_ACCENTS } from "./modalStyle.jsx";

/* ============================================================
   Der Architekt (#202) — Präsentations-Rework (#261): perk-artige Auswahl + EIN durchgehender Verschiebe-Flow.
   Ablauf je Phase:
     choose   — Auswahlfenster im Perk-Stil: 3 Baupläne + „Aufwerten" als 4. Karte, alle vier NEBENEINANDER;
                darunter das Board. Die Wahl ist VERBINDLICH.
     upgrade  — Board: ein bestehendes Gebäude wählen → Jetzt/Danach → „Aufwerten bestätigen" → move.
     move     — EINE kombinierte Platzier-/Verschiebe-Phase: ALLE Gebäude (inkl. des eben gewählten) frei
                ziehen/⟳ drehen; colorLocked-Buff-Farbe hier anpassen (onRecolor); EIN „Bestätigen" startet den Durchlauf.
   Kein „Bauen"-Button mehr: die Wahl baut SOFORT (chooseOffer → onBuild, commit-on-choose) und landet direkt in move.
   Ersetzen (#261): passt ein Bauplan nirgends (Deckel/kein Platz), erscheint ein Skill-artiges Ersetzen-Menü
   (Liste der Gebäude, removeFor) — die Auswahl wird am Board hervorgehoben, dann abgerissen und automatisch gebaut.
   Geometrie/Validierung aus architect.js (SSOT); Aktionen als echte Reducer-Dispatches.
   ============================================================ */

const SUIT_COLOR = { R: "#d9553f", B: "#4f82d6", G: "#3f9d63", Y: "#c79a2e" };
const GOLD = "#c8962f"; // Legendär
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };
const tierLabel = (t) => (t === "legendary" ? "★" : ROMAN[t] || "");
const fmt = (x) => x.toFixed(2).replace(".", ",");
const PENDING_ID = "__pending__"; // synthetische id des noch-nicht-gebauten Vorschau-Gebäudes

// #UI: einklappbarer Hinweis/Info-Block im Architekten — Kopf (immer sichtbar, klickbar) + „mehr/weniger"-Affordanz;
// der Inhalt (Details/Anleitung) klappt auf/zu. Default eingeklappt, damit die langen Erklärungen keinen Platz fressen.
function ArchCollapse({ head, children, defaultOpen = false, className = "", style }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className} style={style}>
      <button type="button" onClick={() => setOpen((o) => !o)} data-sfx="none" aria-expanded={open}
        className="w-full flex items-center gap-2 text-left">
        <span className="min-w-0">{head}</span>
        <span className="flex-1" />
        <span className="text-[10px] opacity-60 shrink-0 whitespace-nowrap">{open ? "▾ weniger" : "▸ mehr"}</span>
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

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

export function ArchitectScreen({ state = {}, options = {}, onOption, onBuild, onUpgrade, onMove, onMoveMulti, onDemolish, onRecolor, onReroll, onDone, onUndo, onReset }) {
  useEscape(onDone);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Perf-Hinweis (Dep-Ausdruck je Render neu), kein Stale-Closure — #292 geprüft
  const architect = state.architect || { buildings: [], offers: [] };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Perf-Hinweis (Dep-Ausdruck je Render neu), kein Stale-Closure — #292 geprüft
  const committed = architect.buildings || [];
  const offers = architect.offers || [];
  const maxCover = architect.maxCover ?? N_POS;
  // #361: „↶ Rückgängig"/„Zurücksetzen" — aktiv, sobald in DIESER Phase etwas geschah (Undo-Stapel nicht leer),
  // analog `hasSwaps` in der Aufstellungsphase. Gleiche Beschriftung/Look wie dort.
  const canArchUndo = (architect.phaseHistory || []).length > 0;
  const round = (state.cycle || 0) + 1;
  // #301 C2: gesperrte Bau-Zellen (Challenge) — als „belegt" für alle Platzierungs-Enumerationen und interaktions-/render-seitig geblockt.
  const chLockArch = state.challengeBlockArch || [];
  const chLockSet = new Set(chLockArch);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Perf-Hinweis (Dep-Ausdruck je Render neu), kein Stale-Closure — #292 geprüft
  const order = state.playerOrder || [];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Perf-Hinweis (Dep-Ausdruck je Render neu), kein Stale-Closure — #292 geprüft
  const deck = state.deck || [];
  const cards = order.map((di) => deck[di]).filter(Boolean);
  // Eis: Gletscher-/Firn-Marker (gleicher Positionsraum wie das Brett) — nur befüllt, wenn Eis aktiv ist.
  const { glacierPos = null, glacierMassByPos = null } = glacierGridProps(state);

  // Ablauf-Zustand.
  const [phase, setPhase] = useState("choose");            // choose | place | upgrade | after | move
  const [pending, setPending] = useState(null);            // { familyId, tier, legendary, colorChoice, footprint }
  const [selId, setSelId] = useState(null);                // ausgewähltes Gebäude (⟳/Ziehen)
  const [colorPick] = useState(SUIT_ORDER[0]);
  const [removeFor, setRemoveFor] = useState(null);        // Bauplan wartet auf Platz → Gebäude entfernen anbieten
  const dragRef = useRef(null);
  const [dragPrev, setDragPrev] = useState(null);          // { footprint, valid, id } — GESNAPPTES Drop-Ziel (nur bei Zellwechsel neu → dragDelta bleibt billig)
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });          // roher Pixel-Versatz des Drags — REF statt State: kein Re-Render je Maus-Move (Maus feuert viel öfter als Touch → sonst „schwammig")
  const dragGhostRef = useRef(null);                       // DOM-Ref des Ghost-Rahmens; sein transform wird je pointermove DIREKT gesetzt (flüssig)
  const [upgradeMsg, setUpgradeMsg] = useState(null);      // { name, reason } — Meldung beim Antippen eines nicht-aufwertbaren Gebäudes (Aufrüsten-Phase)
  const [rotateMsg, setRotateMsg] = useState(null);        // #266: Hinweis „kein Platz zum Drehen" (statt still nichts zu tun), wenn keine andere Lage brettweit passt
  const [demolishIds, setDemolishIds] = useState([]);      // #235/#281: markierte Abriss-Ziele (MEHRFACH) — erst mit „Abreißen" wirklich entfernt (zweistufig). Ein großes Legendär braucht evtl. >1 Abriss.
  const [pendingUpgrade, setPendingUpgrade] = useState(null);   // #237: markiertes Aufrüst-Ziel (buildingId) — zeigt Jetzt/Danach-Effekt, aufgewertet erst mit „Aufwerten bestätigen" (kein Sofort-Upgrade)
  const [upgradeDone, setUpgradeDone] = useState(null);         // Erfolgs-Feedback: { name, from, to } — hervorgehobene Zeile im Platzieren-Screen, dass das Aufwerten wirklich griff (mobil sonst leicht übersehen).
  const [inspectId, setInspectId] = useState(null);             // choose-Phase: welches bereits gebaute Gebäude gerade „inspiziert" wird (Liste ↔ Brett verlinkt, gegenseitiges Leuchten).
  // #243: Toggle-Stellung aus den Optionen (überlebt Runden + Sessions); onOption persistiert die Wahl.
  const [showCombos, setShowCombos] = useState(options.archShowCombos !== false); // #UI: Gebäude mit Struktur-/Distrikt-Bonus in ihrer Typ-Farbe glühen lassen
  const [showForms, setShowForms] = useState(options.archShowForms !== false);    // #UI: Formationsrahmen (Ring + Label) am Brett ein-/ausblenden
  const toggleCombos = () => { const v = !showCombos; setShowCombos(v); onOption?.({ archShowCombos: v }); };
  const toggleForms  = () => { const v = !showForms;  setShowForms(v);  onOption?.({ archShowForms: v }); };

  // Effektive Gebäude = committet (+ in „place" das Vorschau-Gebäude). Board/Precompute/Formationen rechnen damit.
  const pendingBuilding = pending
    ? { id: PENDING_ID, familyId: pending.familyId, tier: pending.tier, legendary: pending.legendary, footprint: pending.footprint, colorChoice: pending.colorChoice }
    : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Perf-Hinweis (Dep-Ausdruck je Render neu), kein Stale-Closure — #292 geprüft
  const buildings = (phase === "place" && pendingBuilding) ? [...committed, pendingBuilding] : committed;

  const occ = useMemo(() => occupiedCells(buildings), [buildings]);
  const coverCount = occ.size;
  const committedCover = useMemo(() => occupiedCells(committed).size, [committed]);

  const effArch = useMemo(() => ({ ...architect, buildings }), [architect, buildings]);
  const pre = useMemo(() => (cards.length ? precomputeArchitect(effArch, order, deck) : null), [effArch, order, deck, cards.length]);
  const structF = useMemo(() => boardFactorMap(buildings), [buildings]); // #283: Struktur × Distrikt (gleiche Quelle wie die Engine)
  // #UI: Kombi-Anzeige getrennt — Struktur (volle Zeile/Spalte/Diagonale) → rote Fläche · Distrikt (gleiche Kategorie
  // aneinander) → Typ-Farb-Glow. Gleiche Quellen wie die Engine, nur einzeln statt kombiniert.
  const comboF    = useMemo(() => structureFactorMap(occupiedCells(buildings)), [buildings]);
  const districtF = useMemo(() => districtFactorMap(buildings), [buildings]);
  const alliance = useMemo(() => allianceGroups(state.familyTiers, state.roles), [state.familyTiers, state.roles]); // #289: Farb-Match grün-/allianz-bewusst
  // Struktur-Kombi-Bonus als Summe (#UI): Σ der Extra-Faktoren über alle Karten auf fertigen Strukturen
  // (Zeile/Spalte/Diagonale, multiplikativ gestapelt) → Gesamt-Punkte-Bonus in Prozent. Nicht beteiligte Zellen
  // haben Faktor 1 → (f−1)=0, tragen nichts bei.
  const structBonusPct = useMemo(() => Math.round(structF.reduce((t, f) => t + (f - 1), 0) * 100), [structF]);
  const formations = useMemo(() => {
    if (!cards.length) return [];
    return computeFormations(order, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, effArch);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [effArch, order, deck, state.roles, state.perks, state.skills, state.familyTiers]);
  const formCount = useMemo(() => summarizeFormations(formations).count, [formations]);
  // #UI: Formationen OHNE Architekt — Referenz, um die NEU durch Gebäude gegründeten Formationen zu isolieren.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  const formationsNoArch = useMemo(() => (cards.length ? computeFormations(order, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, null) : []), [order, deck, state.roles, state.perks, state.skills, state.familyTiers]);
  // #UI: Gebäude-Score-Boost in % — was die Platzierung dem Score bringt: Struktur-Kombis (Σ structF−1) PLUS die neu
  // durch Gebäude gegründeten Formationen (Formations-Stärke mit − ohne Architekt). Live beim Bauen/Verschieben.
  const archBoostPct = useMemo(() => {
    const sum = (fs) => (fs || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0);
    const structBonus = structF.reduce((t, f) => t + (f - 1), 0);
    const formGain = Math.max(0, sum(formations) - sum(formationsNoArch));
    return Math.round((structBonus + formGain) * 100);
  }, [structF, formations, formationsNoArch]);
  // #UI: In der Aufwerten-Phase behalten ALLE Gebäude ihre durchgezogene TYP-Kontur (kein Stufen-Farb-Rahmen mehr —
  // die Stufe zeigt das Ecken-Symbol + das Infopanel). Nur die Kontur der NICHT-aufwertbaren Gebäude wird gedimmt
  // (Spotlight auf das Aufwertbare), statt die ganze Kontur zu dimmen und je Zelle einen Rahmen zu ziehen (der rechts riss).
  const upgradeableBids = useMemo(() => {
    const s = new Set();
    if (phase !== "upgrade") return s;
    for (const b of buildings) { const f = familyDef(b.familyId); if (f && upgradeInfo(f, b.tier).can) s.add(b.id); }
    return s;
  }, [phase, buildings]);

  // #UI: Gebäude-Kontur als durchgezogene SVG-Linie (wie in der Aufstellungsphase, archFrameLines) statt eines
  // Rahmens JE ZELLE → ein mehrzelliges Gebäude liest sich als EINE Form. Farbe = TYP-Farbe (Wert/Score/Formation); die Rarität zeigt die Stufen-Zahl in der Ecke.
  const archCover = useMemo(() => {
    const cover = {};
    for (const b of buildings) {
      const fam = familyDef(b.familyId);
      if (!fam) continue;
      const color = CAT[fam.category]?.color || tierColor(b.tier); // #UI: Rahmen = TYP-Farbe (nach Bonus-Typ bauen); Rarität zeigt die Stufen-Zahl
      for (const p of b.footprint) cover[p] = { bid: b.id, color, legendary: !!fam.legendary };
    }
    return cover;
  }, [buildings]);
  const boardRef = useRef(null);
  const colorBarRef = useRef(null); // #: Farbauswahl-Leiste (colorLocked-Gebäude) — Ziel des Auto-Scrolls, damit sie sichtbar bleibt
  const [archFrame, setArchFrame] = useState(null);
  const archSig = Object.keys(archCover).map((p) => `${p}:${archCover[p].bid}:${archCover[p].color}`).join(",");
  useLayoutEffect(() => {
    const wrap = boardRef.current;
    if (!wrap) { setArchFrame(null); return; }
    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      const cells = {};
      wrap.querySelectorAll("[data-arch-pos]").forEach((el) => {
        const p = Number(el.getAttribute("data-arch-pos"));
        const r = el.getBoundingClientRect();
        cells[p] = { left: r.left - wr.left, top: r.top - wr.top, right: r.right - wr.left, bottom: r.bottom - wr.top };
      });
      let exH = 2, exV = 2; // halbe Raster-Lücke aus Nachbarzellen; sonst feste Fallbacks
      if (cells[0] && cells[1]) exH = Math.max(0, (cells[1].left - cells[0].right) / 2);
      if (cells[0] && cells[COLS]) exV = Math.max(0, (cells[COLS].top - cells[0].bottom) / 2);
      setArchFrame({ w: wr.width, h: wr.height, cells, lines: archFrameLines(archCover, cells, N_POS, exH, exV) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archSig]);

  /* #358 Platzier-Flash: löst ein neu gesetzter Bau einen Bonus aus, blitzt er kurz auf — der Struktur-Rotfläche bei
     vollen Zeilen/Spalten/Diagonalen, dem Außenrahmen BEIDER Gebäude bei einem Distrikt. Reine Optik (kein Score-Change).
     Vorher/Nachher-Diff der Faktor-Maps (comboF/districtF) beim Commit → nur die durch DIESE Platzierung neu/erweiterten
     Boni. Am `key` gekeyt → jede Platzierung startet die Animation neu. Reduced-Motion: gar nicht erst setzen (die
     persistenten Glows/Rotflächen bleiben ohnehin bestehen). */
  const [placeFlash, setPlaceFlash] = useState(null); // { key, structCells:Set<pos>, distBids:Set<id> }
  const flashPrevRef = useRef(null);                  // { sig, comboF, districtF } der letzten Auswertung
  const flashTimerRef = useRef(null);
  const flashSig = useMemo(() => buildings.map((b) => `${b.id}@${b.footprint.join(".")}`).join("|"), [buildings]);
  useEffect(() => {
    const prev = flashPrevRef.current;
    if (!prev) { flashPrevRef.current = { sig: flashSig, comboF, districtF }; return; } // Erst-Mount → nur merken
    if (prev.sig === flashSig) return;
    const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const structCells = new Set(), distBids = new Set();
    for (let p = 0; p < N_POS; p++) {
      const cNow = comboF[p] || 1, cWas = prev.comboF[p] || 1;
      if (cNow > 1 && cNow > cWas) structCells.add(p);                              // Struktur (Zeile/Spalte/Diagonale) neu vervollständigt
      const dNow = districtF[p] || 1, dWas = prev.districtF[p] || 1;
      if (dNow > 1 && dNow > dWas) { const bb = buildings.find((x) => x.footprint.includes(p)); if (bb) distBids.add(bb.id); } // Distrikt neu/erweitert → beteiligte Gebäude
    }
    flashPrevRef.current = { sig: flashSig, comboF, districtF };
    if (prefersReduced || (!structCells.size && !distBids.size)) return;            // Abriss/Undo/kein Bonus → kein Flash
    setPlaceFlash((pf) => ({ key: (pf?.key || 0) + 1, structCells, distBids }));
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setPlaceFlash(null), 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashSig]);
  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  // #UI: Drag-Ghost — beim Verschieben folgt NUR der (leicht transparente) Gebäude-Rahmen dem Finger; die Karten
  // darunter bleiben liegen (kein Mitziehen, keine Lücke). Rechtecke aus den gemessenen Zellen; der Versatz kommt
  // ref-getrieben (dragOffsetRef) → das transform wird im pointermove direkt am DOM gesetzt, nicht über einen State.
  const dragGhost = (() => {
    if (!dragPrev || !(archFrame && archFrame.cells)) return null;
    const b = buildings.find((x) => x.id === dragPrev.id);
    if (!b) return null;
    const fam = familyDef(b.familyId);
    const color = fam ? (CAT[fam.category]?.color || tierColor(b.tier)) : "#8a97a5"; // #UI: Ghost-Rahmen = Typ-Farbe (wie der Gebäude-Rahmen)
    return { footprint: b.footprint, color };
  })();

  const buildingAt = (pos) => buildings.find((b) => b.footprint.includes(pos)) || null;
  const committedAt = (pos) => committed.find((b) => b.footprint.includes(pos)) || null;
  const effValueAt = (pos) => {
    const card = cards[pos];
    if (!card) return 0;
    const bonus = pre ? architectValueBonus(pre, pos, card, alliance) : 0;
    return card.value + bonus;
  };
  const sumValue = cards.reduce((t, _c, p) => t + effValueAt(p), 0);
  const houseRows = (() => { let n = 0; for (let r = 0; r < ROWS; r++) { let full = true; for (let c = 0; c < COLS; c++) if (!occ.has(posOf(r, c))) full = false; if (full) n++; } return n; })();

  const catCount = { value: 0, score: 0, formation: 0 };
  for (const b of committed) { const f = familyDef(b.familyId); if (f) catCount[f.category] += 1; }

  const canUpgradeAny = committed.some((b) => upgradeInfo(familyDef(b.familyId), b.tier).can);

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
    const fits = enumeratePlacements(fam.form, committed, chLockArch);
    return fits.length ? fits[0] : null;
  };
  // Würde das Entfernen GENAU dieses Gebäudes Platz für `o` schaffen? Nur dann ist Ersetzen sinnvoll — sonst stünde der
  // Spieler nach dem Abriss OHNE Platz da (müsste ein weiteres zerstören). Solche Gebäude bieten wir NICHT als Ziel an.
  // #281: Würde das Entfernen dieser Gebäude-MENGE dem Bauplan `o` Platz schaffen? Deckel UND Geometrie prüfen.
  const fitWithoutSet = (o, removeIds) => {
    const fam = familyDef(o.familyId); if (!fam) return null;
    const rest = committed.filter((x) => !removeIds.includes(x.id));
    const size = shapeRotations(fam.form)[0].length;
    if (occupiedCells(rest).size + size > maxCover) return null;   // Baufeld-Deckel auch nach dem Abriss prüfen
    const fits = enumeratePlacements(fam.form, rest, chLockArch);
    return fits.length ? fits[0] : null;
  };
  const fitWithout = (o, removeId) => fitWithoutSet(o, [removeId]);
  // Ids der Gebäude, deren Abriss dem wartenden Bauplan (removeFor) ALLEIN einen gültigen Platz schafft → sanfter „reicht
  // allein"-Hinweis. #281: Ist die Menge leer (großes Legendär), heißt das NICHT mehr „unmöglich" — man markiert mehrere.
  const replaceableSet = useMemo(() => {
    const s = new Set();
    if (!removeFor) return s;
    for (const b of committed) if (fitWithout(removeFor, b.id)) s.add(b.id);
    return s;
  }, [removeFor, committed, maxCover]); // eslint-disable-line react-hooks/exhaustive-deps
  // #281: Reicht die aktuell markierte Abriss-Menge, um Platz zu schaffen? (Fußabdruck-Lage nach dem Abriss oder null.)
  const demolishFit = useMemo(() => (removeFor && demolishIds.length ? fitWithoutSet(removeFor, demolishIds) : null), [removeFor, demolishIds, committed, maxCover]); // eslint-disable-line react-hooks/exhaustive-deps
  // #261: Bauplan wählen = VERBINDLICH → das Gebäude wird SOFORT committet (kein „Bauen"-Button, kein Zurück ins
  // Auswahlfenster) und ist direkt Teil der einen kombinierten Platzier-/Verschiebe-Phase ("move"). Ein einziges
  // „Bestätigen" am Ende schließt ab. Kein Platz → Ersetzen-Menü (Skill-Stil, s. removeFor).
  const chooseOffer = (o) => {
    if (o.used) return;
    const fam = familyDef(o.familyId); if (!fam) return;
    const fp = fitFor(o);
    if (!fp) { setRemoveFor(o); return; }                // kein Platz → Ersetzen-Menü
    const newId = architect.nextId;                      // Reducer vergibt genau diese id an das neue Gebäude
    onBuild?.({ familyId: o.familyId, tier: o.tier, footprint: fp, colorChoice: fam.colorLocked ? colorPick : null });
    setSelId(newId); setPhase("move");
    // #UI: nach der Bauplan-Wahl automatisch zum Brett scrollen — das eben platzierte Gebäude ist sofort sichtbar und
    // greifbar (auf Mobil liegt das Brett unter der Steuerung, sonst müsste man erst manuell runterscrollen).
    // Bei colorLocked-Gebäuden (Buntglas/Zunfthaus) NUR so weit, dass die Farbauswahl-Leiste (über dem Brett) ganz
    // sichtbar bleibt — statt das Brett zu zentrieren (was die Leiste nach oben aus dem Bild schöbe).
    if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => {
      if (fam.colorLocked && colorBarRef.current) colorBarRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
      else boardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };
  // Sobald durch Entfernen Platz frei wird, den wartenden Bauplan automatisch bauen (und in die Verschiebe-Phase).
  useEffect(() => {
    if (!removeFor) return;
    const fp = fitFor(removeFor);
    if (fp) {
      const fam = familyDef(removeFor.familyId);
      const newId = architect.nextId;
      onBuild?.({ familyId: removeFor.familyId, tier: removeFor.tier, footprint: fp, colorChoice: fam.colorLocked ? colorPick : null });
      setSelId(newId); setPhase("move"); setRemoveFor(null); setDemolishIds([]);
    }
  }, [committed, removeFor]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDemolishIds([]); }, [removeFor]); // #281: neuer/geschlossener Ersetzen-Vorgang → Markierungen zurücksetzen
  // #235: markiertes Gebäude wirklich abreißen (danach platziert der removeFor-Effekt den wartenden Bauplan automatisch).
  // #266: Der Dreh-Hinweis verfällt, sobald ein anderes Gebäude gewählt oder die Phase gewechselt wird (er gilt genau
  // für die zuletzt versuchte Rotation an der aktuellen Lage).
  useEffect(() => { setRotateMsg(null); }, [selId, phase]);
  useEffect(() => { setInspectId(null); }, [phase]); // Inspektion ist choose-only → beim Phasenwechsel zurücksetzen
  // Brett-Tap → zugehörige Beschreibung in die Sicht scrollen (damit man das Leuchten sieht, auch bei langer Liste).
  useEffect(() => {
    if (inspectId == null) return;
    const el = typeof document !== "undefined" && document.getElementById(`arch-inspect-${inspectId}`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [inspectId]);
  // #281: alle markierten Gebäude abreißen (nur wenn die Menge wirklich Platz schafft); der removeFor-Effekt baut danach automatisch.
  const confirmDemolish = () => { if (!demolishIds.length || !demolishFit) return; demolishIds.forEach((id) => onDemolish?.(id)); setDemolishIds([]); };
  // #361: nach „↶ Rückgängig"/„Zurücksetzen" zurück in den Haupt-Fluss (interne phase:"choose") und alle Sub-Auswahl-
  // Zustände lösen — sonst zeigte die UI evtl. auf ein soeben entferntes/zurückgesetztes Gebäude (Issue: „danach zurück auf choose").
  const resetArchUi = () => { setPhase("choose"); setSelId(null); setInspectId(null); setPending(null); setPendingUpgrade(null); setRemoveFor(null); setDemolishIds([]); setUpgradeMsg(null); setDragPrev(null); };
  const doArchUndo = () => { onUndo?.(); resetArchUi(); };
  const doArchReset = () => { onReset?.(); resetArchUi(); };
  // #237: markiertes Gebäude wirklich aufwerten (erst nach „Aufwerten bestätigen" — nie durch einen Fehltipp).
  // Härtung: NUR weiterschalten, wenn das Upgrade wirklich anwendbar ist. Ist die Hauptaktion der Bauphase schon
  // verbraucht (actedMain) oder das Gebäude nicht (mehr) aufwertbar (Stufe IV/legendär/inert), lehnt der Reducer
  // still ab — dann darf die UI NICHT kommentarlos in den Platzieren-Screen springen, sondern zeigt die Meldung.
  const confirmUpgrade = () => {
    if (pendingUpgrade == null) return;
    const b = committed.find((x) => x.id === pendingUpgrade);
    const fam = b ? familyDef(b.familyId) : null;
    const info = upgradeInfo(fam, b?.tier);
    if (!b || !fam || !info.can || architect.actedMain) {                       // No-op-Bedingungen des Reducers spiegeln → kein Scheinerfolg
      setUpgradeMsg({ name: fam ? fam.name : "Gebäude", reason: architect.actedMain ? "acted" : info.reason });
      setPendingUpgrade(null);
      return;
    }
    onUpgrade?.(pendingUpgrade);
    setUpgradeDone({ name: fam.name, from: b.tier, to: b.tier + 1 });           // sichtbares Erfolgs-Feedback für den Platzieren-Screen
    setPendingUpgrade(null); setUpgradeMsg(null); setPhase("move");
  };

  // ---- Tap je Phase ----
  const tapCell = (pos) => {
    if (chLockSet.has(pos)) return; // #301 C2: gesperrte Zelle — keine Interaktion
    if (removeFor) { const cb = committedAt(pos); if (cb) setDemolishIds((cur) => cur.includes(cb.id) ? cur.filter((x) => x !== cb.id) : [...cur, cb.id]); return; } // #235/#281: markieren statt sofort abreißen; beliebiges Gebäude (de)markieren — Mehrfach-Abriss für große Legendäre
    if (phase === "upgrade") { const cb = committedAt(pos); if (cb) { const fam = familyDef(cb.familyId); const info = upgradeInfo(fam, cb.tier); if (info.can) { setPendingUpgrade(cb.id); setUpgradeMsg(null); } else { setUpgradeMsg({ name: fam ? fam.name : "Gebäude", reason: info.reason }); setPendingUpgrade(null); } } return; } // #237: markieren + Jetzt/Danach zeigen, Aufwertung erst über den Bestätigen-Knopf
    if (phase === "place") { const b = buildingAt(pos); if (b && b.id === PENDING_ID) setSelId(PENDING_ID); return; }
    if (phase === "move") { const b = buildingAt(pos); if (b) setSelId(b.id); return; }
    if (phase === "choose") { const cb = committedAt(pos); if (cb) setInspectId((cur) => (cur === cb.id ? null : cb.id)); return; } // Brett-Tap → Beschreibung leuchtet (Liste ↔ Brett)
  };

  // Drop über andere Gebäude: die getroffenen ausweichen lassen, wenn Platz ist (sauberer Swap in den alten Fußabdruck,
  // wenn die Form passt; sonst nächstgelegener freier Platz). Board rechnet mit b bereits an fp → die Weichenden meiden fp.
  // Gibt die Ausweich-Moves der GETROFFENEN zurück (b selbst nicht), oder null wenn kein Platz für alle da ist.
  const relocationsForDrop = (b, fp, others) => {
    const fpSet = new Set(fp);
    const hit = others.filter((o) => o.footprint.some((p) => fpSet.has(p)));
    if (!hit.length) return null;
    const staying = others.filter((o) => !hit.includes(o));
    const cen = (arr) => { let r = 0, c = 0; for (const p of arr) { r += rowOf(p); c += colOf(p); } return [r / arr.length, c / arr.length]; };
    let board = [...staying, { ...b, footprint: fp }];
    const moves = [];
    for (const h of hit) {
      const fam = familyDef(h.familyId); if (!fam) return null;
      let spot;
      if (hit.length === 1 && isValidFootprint(fam.form, b.footprint, board, chLockArch)) {
        spot = [...b.footprint].sort((x, y) => x - y);                       // sauberer Swap in b's alten Platz
      } else {
        const fits = enumeratePlacements(fam.form, board, chLockArch);
        if (!fits.length) return null;                                       // kein freier Platz → gesamter Swap scheitert
        const [hr, hc] = cen(h.footprint);
        spot = fits.reduce((best, f) => { const [fr, fc] = cen(f); const d = (fr - hr) ** 2 + (fc - hc) ** 2; return d < best.d ? { f, d } : best; }, { f: null, d: Infinity }).f;
      }
      moves.push({ buildingId: h.id, footprint: spot });
      board = [...board, { ...h, footprint: spot }];
    }
    return moves;
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
    // Fußabdruck-Ausdehnung der aktuellen Rotation → den Anker so KLEMMEN, dass das GANZE Gebäude im Brett bleibt.
    // Ohne das ließe sich ein Gebäude, das man NICHT an seiner Ankerzelle (oben-links) gegriffen hat, nicht an den
    // linken/oberen Rand schieben (die Zielrechnung liefe aus dem Gitter → null → nicht platzierbar).
    const rotCells = (() => { const rs = shapeRotations(form); return rs[((rot % rs.length) + rs.length) % rs.length] || []; })();
    let sMinR = 0, sMinC = 0, sMaxR = 0, sMaxC = 0;
    for (const [dr, dc] of rotCells) { sMinR = Math.min(sMinR, dr); sMinC = Math.min(sMinC, dc); sMaxR = Math.max(sMaxR, dr); sMaxC = Math.max(sMaxC, dc); }
    const fpFor = (target) => {
      let ar = rowOf(target) - grabRow, ac = colOf(target) - grabCol;
      ar = Math.max(-sMinR, Math.min(ar, ROWS - 1 - sMaxR));
      ac = Math.max(-sMinC, Math.min(ac, COLS - 1 - sMaxC));
      return footprintAt(form, rot, posOf(ar, ac));
    };
    const commit = (fp) => { if (b.id === PENDING_ID) setPending((p) => (p ? { ...p, footprint: fp } : p)); else onMove?.({ buildingId: b.id, footprint: fp }); };
    let lastKey = "∅"; // [#224.11] letzter gesnappter Fußabdruck → Re-Render/Delta nur bei Zielzellen-Wechsel
    let rafId = null, lastXY = null; // Snap-Berechnung (cellPos → elementFromPoint ERZWINGT Layout) auf 1×/Frame drosseln
    const snapStep = () => {
      rafId = null;
      if (!lastXY) return;
      const target = cellPos(lastXY.x, lastXY.y);
      const fp = target == null ? null : fpFor(target);
      const key = fp ? fp.join(",") : "∅";
      if (key === lastKey) return; // Snap-Ziel unverändert → dragPrev (+ dragDelta/computeFormations) NICHT neu setzen
      lastKey = key;
      // valid = freier Platz ODER die getroffenen Gebäude können ausweichen (Swap/Verschieben) → grüne Vorschau statt rot.
      const okDirect = !!fp && isValidFootprint(form, fp, others, chLockArch);
      const okSwap = !!fp && !okDirect && !!relocationsForDrop(b, fp, others);
      setDragPrev(fp ? { footprint: fp, valid: okDirect || okSwap, swap: okSwap, id: b.id } : { footprint: [], valid: false, id: b.id });
    };
    const move = (ev) => {
      const dx = ev.clientX - g.x0, dy = ev.clientY - g.y0;
      if (!g.active) { if (dx * dx + dy * dy < 36) return; g.active = true; setSelId(b.id); setRotateMsg(null); } // #266: beim Ziehen den „kein Platz"-Hinweis aufheben (Lage ändert sich gleich)
      ev.preventDefault();
      dragOffsetRef.current = { dx, dy };                                     // freies, pixelgenaues Folgen — OHNE setState
      if (dragGhostRef.current) dragGhostRef.current.style.transform = `translate(${dx}px, ${dy}px)`; // direkt am DOM → kein Re-Render, keine Latenz
      lastXY = { x: ev.clientX, y: ev.clientY };
      if (rafId == null) rafId = requestAnimationFrame(snapStep);             // Layout-erzwingendes elementFromPoint höchstens 1×/Frame (kein Thrash je Move)
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } // ausstehenden Snap-Frame verwerfen
      const wasActive = g.active; dragRef.current = null;
      dragOffsetRef.current = { dx: 0, dy: 0 }; // Ghost loslassen → das Gebäude snappt auf die (gesnappte) Zielzelle
      if (wasActive) {
        const target = cellPos(ev.clientX, ev.clientY), fp = target == null ? null : fpFor(target);
        if (fp && isValidFootprint(form, fp, others, chLockArch)) {
          commit(fp);                                                        // freier Platz → normal ablegen
        } else if (fp) {
          // Über ein anderes Gebäude gedroppt: getroffene Gebäude ausweichen lassen, wenn Platz ist (Verschieben/Swap).
          const relo = relocationsForDrop(b, fp, others);
          if (relo) {
            const fpS = [...fp].sort((x, y) => x - y);
            if (b.id === PENDING_ID) { onMoveMulti?.(relo); commit(fpS); }    // Vorschau-Gebäude: nur Committete atomar schieben, Pending separat setzen
            else onMoveMulti?.([{ buildingId: b.id, footprint: fpS }, ...relo]); // committetes Gebäude: alles in EINEM atomaren Move
          }
        }
        setDragPrev(null);
      }
      else tapCell(pos);
    };
    window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  };
  const onCellDown = (pos, e) => {
    if (chLockSet.has(pos)) return; // #301 C2: gesperrte Zelle — kein Bauen/Ziehen/Tap
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
    setRotateMsg(null);
    const b = buildings.find((x) => x.id === selId); if (!b) return;
    const form = familyDef(b.familyId).form, others = buildings.filter((x) => x.id !== b.id);
    // #239/#266: In-place bevorzugt, sonst nächstgelegener gültiger Platz brettweit — NUR echte andere Lagen (nie ein
    // No-Op). Geometrie/Suche als SSOT in architect.js (nextRotationFootprint), damit sie testbar ist. `null` = keine
    // andere Lage passt irgendwo → dem Spieler sagen, statt still nichts zu tun.
    const best = nextRotationFootprint(form, b.footprint, others);
    if (best) {
      if (b.id === PENDING_ID) setPending((p) => (p ? { ...p, footprint: best } : p));
      else onMove?.({ buildingId: b.id, footprint: best });
      return;
    }
    setRotateMsg("Kein Platz zum Drehen — zieh das Gebäude erst an eine freiere Stelle.");
  };

  // Live-Delta beim Ziehen (Vorschau-Position).
  const dragDelta = useMemo(() => {
    if (!dragPrev || !dragPrev.footprint.length) return null;
    const previewBuildings = buildings.map((x) => (x.id === dragPrev.id ? { ...x, footprint: [...dragPrev.footprint].sort((m, n) => m - n) } : x));
    const previewArch = { ...architect, buildings: previewBuildings };
    const p2 = precomputeArchitect(previewArch, order, deck);
    const val2 = cards.reduce((t, c, p) => t + c.value + (architectValueBonus(p2, p, c, alliance) || 0), 0);
    const previewForms = computeFormations(order, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, previewArch);
    const form2 = summarizeFormations(previewForms).count;
    // #UI: Boost-Vorschau — dieselbe Formel wie archBoostPct (Struktur-Kombis Σ(f−1) + neu gegründete Formationen), aber
    // mit den Vorschau-Gebäuden. dBoost = Vorschau − aktuell → Live-Differenz des Gebäude-Boosts im Brett-Kopf.
    const sumStr = (fs) => (fs || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0);
    const pStructBonus = boardFactorMap(previewBuildings).reduce((t, f) => t + (f - 1), 0);
    const pFormGain = Math.max(0, sumStr(previewForms) - sumStr(formationsNoArch));
    const previewBoost = Math.round((pStructBonus + pFormGain) * 100);
    return { dVal: val2 - sumValue, dForm: form2 - formCount, dBoost: previewBoost - archBoostPct, valid: dragPrev.valid };
  }, [dragPrev]); // eslint-disable-line react-hooks/exhaustive-deps

  const comboLit  = (pos) => (comboF[pos] || 1) > 1;    // #UI: Struktur-Kombi (Zeile/Spalte/Diagonale) → rote Fläche
  const distrLit  = (pos) => (districtF[pos] || 1) > 1; // #UI: Distrikt (gleiche Kategorie aneinander) → Typ-Farb-Glow
  // #262: Eine Form ist nur drehbar, wenn sie mehr als eine distinkte Lage hat. `zeile` (Legendäre) sowie `single`/`block2x2`
  // stehen in NO_ROTATE (architect.js) → shapeRotations liefert genau eine Lage → „⟳ Drehen" wäre wirkungslos.
  const rotatableForm = (form) => shapeRotations(form).length > 1;
  const showRotate = selId != null && buildings.some((x) => x.id === selId) && (phase === "place" || phase === "move");
  const selBuilding = buildings.find((x) => x.id === selId);
  const selRotatable = !!selBuilding && rotatableForm(familyDef(selBuilding.familyId).form);

  // #UI-Redesign: Durchlauf-Score + %-Differenz zur Vorrunde für die Hero-Leiste (dieselbe Logik wie RoundScoreBadge).
  const scoreHasDiff = state.prevCycleScore != null && state.prevCycleScore !== 0;
  const scorePctDiff = scoreHasDiff ? Math.round(((state.lastCycleScore - state.prevCycleScore) / state.prevCycleScore) * 100) : 0;
  const scoreDiffColor = scorePctDiff > 0 ? "#5ab87a" : scorePctDiff < 0 ? "#e0605a" : "#8a8a92";
  const scoreDiffStr = `${scorePctDiff > 0 ? "+" : scorePctDiff < 0 ? "−" : "±"}${Math.abs(scorePctDiff)} %`;

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-start sm:items-center justify-center p-2 sm:p-4"
      style={{ background: "#0c1017dd", backdropFilter: "blur(3px)" }}>
      <div className="relative w-full max-w-5xl rounded-2xl p-4 sm:p-6 max-h-[96dvh] overflow-y-auto overlay-card as-panel-arch"
        style={{ ...phaseCard(PHASE_ACCENTS.blue, ["#111c27", "#0d1720"]), color: "#e7eef5" }}>
        <PhaseHairline />

        {/* Kopf (#UI-Redesign): Titel + Glossar; die Kennzahlen wandern in die Hero-Leiste darunter. */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono opacity-60" style={{ color: CAT.value.color }}>Architekt · Bauphase · Durchlauf {round}</div>
            <h2 className="text-xl font-bold mt-0.5">Der Architekt</h2>
          </div>
          <div className="ml-auto shrink-0"><GlossaryPanel /></div>
        </div>
        {/* Hero-Stat-Leiste: der Gebäude-Boost ist das, was man beim Bauen maximiert → Hero-Wert (grün). Baufeld & Durchlauf-
            Score als Nebenzellen (ersetzt den verstreuten Kopf-Cluster + das separate Score-Badge). Gleicher Bau wie die
            Hero-Leiste der Aufstellphase. */}
        <div className="flex items-stretch mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #20303d", background: "#0e1a24" }}>
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-3.5 py-2.5"
            title="Score-Boost durch die Gebäude: Struktur-Kombis (volle Zeile/Spalte/Diagonale) + Distrikt (gleiche Kategorie aneinander) + neu gegründete Formationen. Aktualisiert live beim Bauen/Verschieben.">
            <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7f8e" }}>Gebäude-Boost</span>
            <span className="font-pixel-dense leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 25, color: archBoostPct > 0 ? "#5fce86" : "#8a97a5" }}>+{archBoostPct} %</span>
          </div>
          <div className="flex flex-col justify-center gap-1 px-3.5 py-2.5 text-right border-l" style={{ borderColor: "#20303d" }}>
            <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7f8e" }}>Baufeld</span>
            <span className="font-pixel-dense leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 19, color: GOLD }}>{Math.max(0, maxCover - coverCount)}<span className="text-xs opacity-60"> / {maxCover}</span></span>
            <span className="text-[9px] font-mono opacity-45">{coverCount} belegt · {Math.round(coverCount / maxCover * 100)}%</span>
          </div>
          {state.lastCycleScore != null && (
            <div className="flex flex-col justify-center gap-1 px-3.5 py-2.5 text-right border-l" style={{ borderColor: "#20303d" }}>
              <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#6d7f8e" }}>Durchlauf-Score</span>
              <span className="font-pixel-dense leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 19, color: GOLD }}>{fmtScore(state.lastCycleScore)}</span>
              {scoreHasDiff && <span className="text-[10px] font-bold" style={{ color: scoreDiffColor }}>{scoreDiffStr}</span>}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] items-start">
          {/* ---- Brett 8×5 — Mobil in der Mitte (order-2): Phase-Panel drüber, Vorschau drunter; Desktop links (md:order-1). ---- */}
          <section className="rounded-xl p-3 order-2 md:order-1" style={{ background: "#0e1822", border: "1px solid #20303d" }}>
            {/* #UI: Farbauswahl (colorLocked-Gebäude: Buntglas/Zunfthaus) sitzt jetzt DIREKT über dem Brett — zwischen der
                Bestätigen-Leiste (mobil darüber) und dem Brett. Eigener Rahmen + Abstand nach unten, damit man beim Tippen
                der Farbe nicht versehentlich Bestätigen trifft (vorher lag sie weit oben im Panel → hochscrollen nötig). */}
            {selBuilding && phase === "move" && familyDef(selBuilding.familyId)?.colorLocked && (
              <div ref={colorBarRef} className="mb-3 rounded-lg px-3 py-2.5 flex items-center gap-3 flex-wrap" style={{ background: "#141f29", border: "1px solid #d97a3a66", boxShadow: "0 0 10px #d97a3a1f", scrollMarginTop: "12px" }}>
                <span className="text-[11px] font-mono uppercase tracking-wide font-bold" style={{ color: "#e0894a" }}>🎨 Bufft Farbe</span>
                <div className="flex gap-2.5">
                  {SUIT_ORDER.map((s) => (
                    <button key={s} onClick={() => onRecolor?.({ buildingId: selBuilding.id, colorChoice: s })}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110" title={s}
                      style={{ background: SUIT_COLOR[s], outline: selBuilding.colorChoice === s ? "2px solid #fff" : "none", outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              {/* #UI: „Bau-Brett"-Label entfällt — der Boost-Δ (beim Verschieben) hätte die Zeile sonst umgebrochen und das
                  Brett verrutschen/„zittern" lassen. Der Δ-Chip hat feste Breite (tabular-nums + minWidth), damit er beim
                  Ziehen nicht in der Breite flackert; die Toggles bleiben rechts (ml-auto) unverrückt. */}
              {dragDelta && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center justify-center"
                  style={{ fontVariantNumeric: "tabular-nums", minWidth: 92,
                           color: dragDelta.dBoost > 0 ? "#5fce86" : dragDelta.dBoost < 0 ? "#e0705a" : "#8a97a5",
                           background: dragDelta.dBoost > 0 ? "#155e3126" : dragDelta.dBoost < 0 ? "#8a1e1e26" : "#ffffff0c",
                           border: `1px solid ${dragDelta.dBoost > 0 ? "#2f9d5566" : dragDelta.dBoost < 0 ? "#d1462f66" : "#2b3e4d"}` }}
                  title="Änderung des Gebäude-Boosts an dieser Vorschau-Position">
                  Boost {dragDelta.dBoost > 0 ? "▲ +" : dragDelta.dBoost < 0 ? "▼ " : "±"}{dragDelta.dBoost} %
                </span>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <button onClick={toggleCombos} className="text-[11px] font-bold rounded-lg px-2 py-1 transition-colors"
                  style={{ background: showCombos ? "#2a2416" : "#16232f", border: `1px solid ${showCombos ? "#d4a63a" : "#2b3e4d"}`, color: showCombos ? "#e0c060" : "#7d8a97" }}
                  title="Gebäude mit Struktur-/Distrikt-Bonus glühen in ihrer Typ-Farbe">{showCombos ? "◉" : "○"} Kombis</button>
                <button onClick={toggleForms} className="text-[11px] font-bold rounded-lg px-2 py-1 transition-colors"
                  style={{ background: showForms ? "#16283a" : "#16232f", border: `1px solid ${showForms ? "#3b7dbe" : "#2b3e4d"}`, color: showForms ? "#7db4e6" : "#7d8a97" }}
                  title="Formationsrahmen (Ring + Label) am Brett ein-/ausblenden">{showForms ? "◉" : "○"} Formationen</button>
                {/* #248: „⟳ Drehen" wandert in die schwebende Aktionsleiste (unten) — dort beim Ziehen ohne Scrollen erreichbar. */}
              </div>
            </div>
            <div ref={boardRef} className="relative grid grid-cols-5 gap-1" style={{ maxWidth: 300, margin: "0 auto" }}>
              {/* #UI: durchgezogene Gebäude-Kontur (SVG) über dem Brett — eine Linie je Gebäude in seiner Form (wie Aufstellung).
                  Während eines Drags ausgeblendet (das Gebäude schwebt frei) → snappt beim Loslassen wieder an seine neue Form. */}
              {archFrame && archFrame.lines.length > 0 && !dragPrev && (
                <svg className="absolute left-0 top-0 pointer-events-none" width={archFrame.w} height={archFrame.h} style={{ overflow: "visible", zIndex: 5 }} aria-hidden="true">
                  {archFrame.lines.map((l, i) => (
                    // Aufwerten-Phase: Kontur der nicht-aufwertbaren Gebäude dimmen (Spotlight) — die aufwertbaren bleiben hell.
                    // Typ-Farbe (l.color) bleibt in ALLEN Phasen erhalten und die Linie durchgängig.
                    <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="2.5" strokeLinecap="square"
                      opacity={phase === "upgrade" && !upgradeableBids.has(l.bid) ? 0.28 : 1} />
                  ))}
                  {/* #358 Distrikt-Platzier-Flash: der Außenrahmen der am neuen Distrikt beteiligten Gebäude blitzt kurz
                      hell auf (dickere, glühende Linie über der Kontur), danach zurück auf den persistenten Distrikt-Glow. */}
                  {showCombos && placeFlash && archFrame.lines.filter((l) => placeFlash.distBids.has(l.bid)).map((l, i) => (
                    <line key={`df${placeFlash.key}-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="4.5" strokeLinecap="square"
                      className="arch-district-flash" style={{ filter: `drop-shadow(0 0 5px ${l.color}) drop-shadow(0 0 10px ${l.color})` }} />
                  ))}
                </svg>
              )}
              {/* #UI: Drag-Ghost — NUR der leicht transparente Gebäude-Rahmen folgt dem Finger (Karten bleiben liegen). */}
              {dragGhost && (
                <div ref={dragGhostRef} className="absolute left-0 top-0 pointer-events-none" style={{ transform: `translate(${dragOffsetRef.current.dx}px, ${dragOffsetRef.current.dy}px)`, zIndex: 30, willChange: "transform" }}>
                  {dragGhost.footprint.map((p) => { const r = archFrame.cells[p]; if (!r) return null;
                    return <div key={p} className="absolute rounded-md" style={{ left: r.left, top: r.top, width: r.right - r.left, height: r.bottom - r.top, background: `${dragGhost.color}33`, border: `2px solid ${dragGhost.color}cc`, boxShadow: "0 4px 12px #00000066" }} />; })}
                </div>
              )}
              {(() => { const dragCells = dragPrev ? new Set(dragPrev.footprint) : null; const draggingId = dragPrev ? dragPrev.id : null;
                // #UI: beim Ziehen die Felder ANDERER Gebäude ausgrauen — dort ist kein Ablegen möglich.
                const blocked = dragPrev ? (() => { const s = new Set(); for (const x of buildings) if (x.id !== dragPrev.id) for (const p of x.footprint) s.add(p); return s; })() : null;
                return cards.map((card, pos) => {
                const b = buildingAt(pos);
                const isPending = b && b.id === PENDING_ID;
                // Nur Zellen mit einem ziehbaren Gebäude fangen die Geste (touchAction:none) — sonst scrollt der Finger die Seite.
                const canDragHere = !removeFor && ((phase === "place" && isPending) || (phase === "move" && !!b));
                const fam = b ? familyDef(b.familyId) : null;
                // Raritäts-Rahmen: Stufenfarbe (I grau · II grün · III blau · IV lila), Legendär = Gold. Füllung ist einheitlich (Typ-Farbe raus, #UI).
                const tierCol = b ? (fam.legendary ? GOLD : tierColor(b.tier)) : null;
                const ev = effValueAt(pos);
                const boost = ev - card.value;
                // Pflanze (#211): reife (grüne) Karte → Zahl leuchtet grün (voll ausgewachsen am hellsten), wie am Aufstellungs-Brett.
                const numCol = card.green ? (card.value >= PLANT_VALUE_CAP ? PLANT_FULL : PLANT_RIPE) : SUIT_COLOR[card.suit];
                const isGlacier = glacierPos ? glacierPos.has(pos) : false;                       // festgefrorener Gletscher
                const gMass = glacierMassByPos ? Math.round(glacierMassByPos[pos] || 0) : 0;       // angesammelte Masse
                const isFirn = !isGlacier && gMass >= 1;                                           // Firn-Boden (Masse, noch kein Gletscher)
                const anchorCell = b ? Math.min(...b.footprint) : -1;
                const isSel = b && b.id === selId;
                const pf = formations[pos] || { mult: 1, formations: [] };
                const inForm = pf.mult > 1;
                const fb = formationBorder(pf);
                const formLabels = [...new Set((pf.formations || []).map((f) => formationAbbr(f.type)))].join("");
                const sFac = structF[pos] || 1;
                const cbHere = removeFor ? committedAt(pos) : null;
                const isRemovable = !!removeFor && !!cbHere && replaceableSet.has(cbHere.id); // nur Gebäude, deren Abriss Platz schafft
                const isMarkedDemolish = !!removeFor && !!cbHere && demolishIds.includes(cbHere.id); // #235/#281: markiertes Abriss-Ziel (Mehrfach)
                // #237/#UI: Aufrüst-Phase = Spotlight — ALLES ausgegraut außer aufwertbaren Gebäuden (die werden hervorgehoben).
                const upCan = phase === "upgrade" && b && !isPending && upgradeInfo(fam, b.tier).can; // aufwertbar → hervorheben (Ziel-Stufe am Gebäude, #232)
                const isMarkedUpgrade = phase === "upgrade" && pendingUpgrade != null && b && b.id === pendingUpgrade; // #237: markiertes Aufrüst-Ziel (gold)
                const isInspected = phase === "choose" && inspectId != null && b && b.id === inspectId; // choose: aus der Liste inspiziertes Gebäude → leuchtet (cyan), zeigt wo es liegt
                const upgradeDim = phase === "upgrade" && !upCan && !isMarkedUpgrade; // nicht-aufwertbar (inkl. leere Zellen) → ausgrauen
                // #UI: beim Ziehen belegte Fremdfläche → ausgrauen (kein Ablegen möglich), außer sie ist gerade Drag-Vorschau.
                const isBlocked = !!blocked && blocked.has(pos) && !(dragCells && dragCells.has(pos));
                const chLocked = chLockSet.has(pos); // #301 C2: dauerhaft gesperrte Bau-Zelle (rot/ausgegraut)
                const title = b
                  ? `${fam.name} (${tierLabel(b.tier)})${isPending ? " · Vorschau" : ""} — ${famEff(fam, b)}${upCan ? ` → Stufe ${tierLabel(b.tier + 1)}: ${famEff(fam, { tier: b.tier + 1 })}` : ""}${inForm ? ` · Formation ×${fmt(pf.mult)}` : ""}${sFac > 1 ? ` · Struktur ×${fmt(sFac)}` : ""}`
                  : `Pos ${pos + 1}${inForm ? ` — Formation ×${fmt(pf.mult)}` : ""}${sFac > 1 ? ` · Struktur ×${fmt(sFac)}` : ""}`;
                const inDragPrev = dragCells ? dragCells.has(pos) : false;
                const dragValid = dragPrev && dragPrev.valid;
                const isDragOrig = draggingId != null && b && b.id === draggingId;
                return (
                  <button key={pos} data-arch-pos={pos} onPointerDown={(e) => onCellDown(pos, e)}
                    className={`relative rounded-md aspect-square flex items-center justify-center font-mono font-bold${dragPrev ? "" : " transition-all"}${showCombos && !dragPrev && b && comboLit(pos) ? " arch-struct-lit" : ""}`}
                    style={{
                      // #UI: Gebäude-Füllung/-Rand einheitlich (Typ-Farbe raus); die Stufe/Rarität zeigt der Ring (boxShadow) unten.
                      // #UI: Origin-Zellen des gezogenen Gebäudes zeigen sich als LEERES Feld (Gebäude „aufgehoben"); die
                      // Karte darunter bleibt sichtbar. KEIN Transform → kein Mitziehen der Karte, keine Lücke. Der Rahmen wandert als Ghost.
                      background: chLocked ? "#2a1214" : inDragPrev ? (dragValid ? "#1f5a34" : "#5a2020") : (b && !isDragOrig ? "#233140" : "#16232f"),
                      color: (b && !isDragOrig) || inDragPrev ? "#fff" : "#adbecc",
                      border: `1px solid ${chLocked ? "#e0555588" : inDragPrev ? (dragValid ? "#5fce86" : "#e0705a") : (b && !isDragOrig ? "#2a3a46" : "#20303d")}`,
                      opacity: chLocked ? 0.6 : (upgradeDim ? 0.28 : (isBlocked ? 0.5 : (isPending && !inDragPrev ? 0.82 : 1))),
                      filter: chLocked ? "grayscale(0.5)" : (upgradeDim ? "grayscale(0.75)" : (isBlocked ? "grayscale(0.55)" : undefined)),
                      touchAction: canDragHere ? "none" : "pan-y",
                      boxShadow: [
                        isMarkedDemolish ? "inset 0 0 0 2px #ff6a4d, inset 0 0 16px #ff3b1e66" : null,     // #235: markiertes Abriss-Ziel rot hervorheben
                        isMarkedUpgrade ? "inset 0 0 0 2px #f0b429, inset 0 0 16px #f0b42966" : null,      // #237: markiertes Aufrüst-Ziel gold hervorheben
                        isInspected ? "inset 0 0 0 2px #5ec8f0, 0 0 14px #5ec8f0aa, inset 0 0 16px #5ec8f055" : null, // choose: inspiziertes Gebäude cyan leuchten lassen (wo liegt es?)
                        // #UI: aufwertbares Gebäude dezent glühen lassen — in der TYP-Farbe (nicht Stufenfarbe). Der Rahmen
                        // ist jetzt die durchgezogene Typ-Kontur (oben, ungedimmt für Aufwertbare); der Stufen-Farb-Zellrahmen entfällt.
                        upCan && !isMarkedUpgrade ? `0 0 10px ${CAT[fam?.category]?.color || tierCol}55` : null,
                        inDragPrev ? `inset 0 0 0 2px ${dragValid ? "#5fce86" : "#e0705a"}` : null,        // Drag-Vorschau (oben)
                        isSel && !inDragPrev ? "inset 0 0 0 2px #fff" : null,                              // ausgewählt (weiß)
                        // #UI: Raritäts-Rahmen JE ZELLE entfällt — die durchgezogene SVG-Kontur (oben) zeichnet ihn jetzt
                        // in Stufenfarbe als EINE Gebäude-Form (wie in der Aufstellungsphase).
                        b && !isDragOrig && fam.legendary ? `0 0 8px ${GOLD}55` : null,                     // Legendär → zusätzlicher warmer Glow (nicht am aufgehobenen Origin)
                      ].filter(Boolean).join(", ") || undefined,
                      outline: isMarkedDemolish ? "2px solid #ff6a4d" : isMarkedUpgrade ? "2px solid #f0b429" : (isRemovable ? "2px dashed #d1462f" : (isPending ? "2px dashed #ffffffcc" : (showForms && inForm && !fb.dashed ? `1.5px solid ${fb.color}` : undefined))),
                      outlineOffset: 1,
                      cursor: "pointer",
                    }}
                    title={title}>
                    {/* #UI: Struktur-Kombi (volle Zeile/Spalte/Diagonale) → rote Fläche via `arch-struct-lit` (Klasse oben,
                        identisch zum Aufstellboard). Distrikt-Bonus (gleiche Kategorie aneinander) → Rahmen glüht in Typ-Farbe. */}
                    {showCombos && !dragPrev && distrLit(pos) && b && (() => {
                      const glow = CAT[fam?.category]?.color || "#5a8ade"; // Distrikt → Typ-Farb-Glow (etwas kräftiger)
                      return <span aria-hidden className="absolute inset-0 rounded-md pointer-events-none" style={{ boxShadow: `0 0 16px 2px ${glow}cc, inset 0 0 9px ${glow}66, inset 0 0 0 1px ${glow}` }} />;
                    })()}
                    {/* #358 Struktur-Platzier-Flash: die neu vervollständigte Zeile/Spalte/Diagonale blitzt kurz heller
                        rot auf (über der persistenten Vollflächen-Rotfläche). Am key gekeyt → jede Platzierung neu. */}
                    {showCombos && !dragPrev && b && placeFlash && placeFlash.structCells.has(pos) && (
                      <span key={placeFlash.key} aria-hidden className="arch-struct-flash rounded-md" />
                    )}
                    {/* #301 C2: dauerhaft gesperrte Bau-Zelle — rote Diagonal-Schraffur (Querbalken) + Rim, KEIN Schloss. */}
                    {chLocked && (
                      <span aria-hidden className="absolute inset-0 rounded-md pointer-events-none" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 3.5px, rgba(224,85,85,0.28) 3.5px, rgba(224,85,85,0.28) 7px)", boxShadow: "inset 0 0 0 1.5px rgba(224,85,85,0.5)" }} />
                    )}
                    {/* #UI: gesperrte Fläche beim Ziehen — Diagonal-Schraffur + Rim, damit „hier nicht ablegbar" klar heraussticht. */}
                    {isBlocked && (
                      <span aria-hidden className="absolute inset-0 rounded-md pointer-events-none" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 3.5px, rgba(8,12,18,0.62) 3.5px, rgba(8,12,18,0.62) 7px)", boxShadow: "inset 0 0 0 1.5px rgba(134,153,168,0.45)" }} />
                    )}
                    {boost > 0 && <span className="absolute top-[1px] left-[3px] text-[8px] font-extrabold" style={{ color: b ? "#fff" : "#3fb56a" }}>+{boost}</span>}
                    {/* Eis: Gletscher-Marker (Icon + Masse) bzw. Firn-Boden (dezenter ❄ + Masse) oben rechts. */}
                    {isGlacier && (
                      <span className="absolute top-[1px] right-[2px] inline-flex items-center gap-[1px] text-[8px] font-bold leading-none tabular-nums z-10" style={{ color: "#8be6ff", textShadow: "0 0 3px #5ec8f0" }} title={`Gletscher · Masse ${gMass}`}>
                        <FactionIcon type="ice" size={9} />
                        {gMass}
                      </span>
                    )}
                    {isFirn && (
                      <span className="absolute top-[1px] right-[2px] inline-flex items-center gap-[1px] text-[8px] font-bold leading-none tabular-nums z-10" style={{ color: "#7fbfe0", opacity: 0.85 }} title={`Firn-Boden · gespeicherte Masse ${gMass}`}><FactionIcon type="ice" size={8} glow={false} />{gMass}</span>
                    )}
                    {/* #UI: keine Suit-Farbpunkte mehr — die Kartennummer selbst trägt die Farbe der Karte. */}
                    <span className="text-[13px] sm:text-[15px] leading-none relative" style={{ color: inDragPrev ? "#fff" : numCol, textShadow: card.green ? `0 0 5px ${numCol}88` : ((b && !isDragOrig) ? "0 1px 2px #000a" : undefined) }}>{ev}</span>
                    {b && !isDragOrig && pos === anchorCell && (
                      <span className="absolute bottom-[1px] left-[3px] text-[7px] font-bold leading-none" style={{ color: "rgba(255,255,255,0.92)" }}>
                        {fam.name.slice(0, 3).toUpperCase()}
                        {upCan && <span style={{ color: "#f0b429" }}>→{tierLabel(b.tier + 1)}</span>}
                      </span>
                    )}
                    {/* #UI: Stufen-Zahl (I–IV / ★) unten rechts im Gebäude, in der SELTENHEITS-Farbe — der Rahmen zeigt jetzt den Typ. */}
                    {b && !isDragOrig && pos === Math.max(...b.footprint) && (
                      <span className="absolute bottom-[1px] right-[3px] text-[9px] font-extrabold leading-none"
                        style={{ color: fam.legendary ? GOLD : tierColor(b.tier), textShadow: "0 1px 2px #000a" }}
                        title={fam.legendary ? "legendär" : `Stufe ${ROMAN[b.tier]}`}>
                        {fam.legendary ? "★" : ROMAN[b.tier]}
                      </span>
                    )}
                    {showForms && inForm && (
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] font-mono opacity-80">
              <span className="opacity-70">Rahmen = Typ:</span>
              {Object.entries(CAT).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5"><span className="w-[11px] h-[11px] rounded-[3px]" style={{ boxShadow: `inset 0 0 0 2px ${v.color}` }} />{v.label}</span>
              ))}
            </div>
            {/* Stufe/Rarität = die Zahl (I–IV / ★) in der ECKE des Gebäudes; der Rahmen zeigt den Typ. */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[10px] font-mono opacity-70">
              <span className="opacity-70">Stufe (Ecke):</span>
              {[1, 2, 3, 4].map((t) => (
                <span key={t} className="inline-flex items-center gap-1"><b className="tabular-nums" style={{ color: tierColor(t) }}>{ROMAN[t]}</b></span>
              ))}
              <span className="inline-flex items-center gap-1"><b style={{ color: GOLD }}>★</b> legendär</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] font-mono opacity-60">
              <span>Ring = aktive Formation (×mult)</span>
              <span><b>W</b> Wiederholung</span><span><b>F</b> Farbblock</span><span><b>T</b> Treppe</span><span><b>Z</b> Wechsel</span><span><b>A</b> Anker</span>
            </div>
          </section>

          {/* ---- Bau-Assistent + Vorschau. Mobil: `contents` löst die Gruppe auf → Phase-Panel (order-1) ÜBER dem Brett (order-2),
                 Vorschau (order-3) DRUNTER. Desktop: wieder eine flex-Spalte rechts (md:flex, md:order-2). ---- */}
          <section className="contents md:flex md:flex-col md:gap-4 md:order-2">
            {/* Bau-Assistent (Referenz + Anleitung + Farbwahl) — scrollt normal. Die Aktions-Buttons stehen in der
                schwebenden Leiste darunter (#UI „nur Buttons"). */}
            <div className="rounded-xl p-3 order-1" style={{ background: "#0e1822", border: "1px solid #20303d" }}>

              {/* Struktur-Kombis (oben): welche Gebäude-Kombinationen Boni geben — live am Board umrandet. Einklappbar (default zu). */}
              <ArchCollapse className="mb-3 rounded-lg px-2.5 py-2 text-[10px] font-mono leading-snug" style={{ background: "#141f29", border: "1px solid #24333f" }}
                head={<span className="uppercase tracking-wide opacity-55">Struktur & Distrikt · ×Score je Durchlauf</span>}>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>volle <b>Zeile</b> ×{fmt(HAEUSERZEILE_FACTOR)}</span>
                  <span>volle <b>Spalte</b> ×{fmt(SPALTE_FACTOR)}</span>
                  <span><b>Diagonale</b> ×{fmt(DIAGONALE_FACTOR)}</span>
                  <span><b>Distrikt</b> +{Math.round(DISTRICT_BONUS * 100)} %/Nachbar</span>
                </div>
                <div className="opacity-60 mt-1">Jede Karte auf einer vollständigen Zeile/Spalte/Diagonale macht bei einem Sieg entsprechend mehr <b>Score</b>. Faktoren stapeln multiplikativ.</div>
                <div className="opacity-60 mt-1"><b>Distrikt:</b> Gebäude <b>gleicher Farbe</b> (Kategorie) direkt aneinander geben je Nachbar +{Math.round(DISTRICT_BONUS * 100)} % Score auf ihre Felder (bis {DISTRICT_CAP} Nachbarn). Gleichartig zusammenbauen lohnt sich.</div>
              </ArchCollapse>

              {/* removeFor: kein Platz → Gebäude entfernen anbieten. #235: zweistufig (erst markieren, dann bestätigen).
                  #281: MEHRFACH-Abriss — reicht ein Abriss nicht (großes Legendär), kann man weitere markieren, bis Platz reicht. */}
              {removeFor && (() => {
                const enough = !!demolishFit;
                const n = demolishIds.length;
                return (
                  <div>
                    <div className="text-sm rounded-r-lg px-3 py-2.5 mb-2" style={{ background: "#3a1518", borderLeft: `3px solid ${enough ? "#ff6a4d" : "#d1462f"}` }}>
                      <b>Kein Platz</b> für „{pendingFamName(removeFor)}“.{" "}
                      {n === 0
                        ? "Markiere ein Gebäude zum Abriss (am Brett oder unten) — bei einem großen Bauplan evtl. mehrere. Abgerissen wird erst nach Bestätigen."
                        : enough
                          ? `Abriss von ${n} Gebäude${n > 1 ? "n" : ""} schafft Platz. Bestätigen zum Bauen.`
                          : "Abriss reicht noch nicht — markiere ein weiteres Gebäude."}
                    </div>
                    {/* #281: alle Gebäude als Umschalter — markieren/entmarkieren; „reicht allein" = ein Abriss würde genügen. */}
                    <div className="flex flex-col gap-1 mb-2">
                      {committed.map((b) => {
                        const bf = familyDef(b.familyId);
                        if (!bf) return null;
                        const marked = demolishIds.includes(b.id);
                        const soloOk = replaceableSet.has(b.id);
                        return (
                          <button key={b.id} onClick={() => setDemolishIds((cur) => cur.includes(b.id) ? cur.filter((x) => x !== b.id) : [...cur, b.id])}
                            className="rounded-lg px-2.5 py-1.5 text-left text-[11px] font-mono leading-snug transition-all hover:brightness-110"
                            style={{ background: marked ? "#2a1416" : "#16232f", border: `1px solid ${marked ? "#d1462f" : "#2b3e4d"}` }}>
                            <span className="inline-flex items-center gap-1.5 align-middle flex-wrap">
                              <FormIcon form={bf.form} color={bf.legendary ? "#d4a63a" : CAT[bf.category].color} title={`${bf.name} · ${bf.form}`} />
                              <b>{bf.name}</b>
                              <span className="opacity-55">{bf.legendary ? "Legendär" : `Stufe ${tierLabel(b.tier)}`}</span>
                              {marked ? <span style={{ color: "#ff8a6d" }}>· markiert ✓</span> : (soloOk && <span className="opacity-45">· reicht allein</span>)}
                            </span>
                            <span className="opacity-75"> — {famEff(bf, b)}</span>
                          </button>
                        );
                      })}
                    </div>
                    {n > 0 && <div className="text-[10px] opacity-55 mb-2">Markierte Gebäude gehen beim Abriss verloren.</div>}
                    <div className="flex gap-2">
                      <button onClick={() => { setRemoveFor(null); setDemolishIds([]); }} className="flex-1 rounded-lg py-1.5 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>← Zurück</button>
                      <button onClick={confirmDemolish} disabled={!enough}
                        className="flex-1 rounded-lg py-1.5 text-xs font-bold"
                        style={{ background: enough ? "#d1462f" : "#2a1c1c", color: enough ? "#fff" : "#7a5a55", opacity: enough ? 1 : 0.6, cursor: enough ? "pointer" : "not-allowed" }}>
                        Abreißen{n > 0 ? ` (${n})` : ""} ✓
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* #261: Auswahl im Perk-Stil — 3 Baupläne + „Aufwerten" als 4. Karte, alle vier NEBENEINANDER (kompakt).
                  Die Wahl ist verbindlich: chooseOffer baut sofort und geht in die Verschiebe-Phase (kein Zurück). */}
              {!removeFor && phase === "choose" && (
                <div>
                  <div className="text-sm font-semibold mb-2">Was baust du diese Phase?</div>
                  {state.devMode ? (
                    <DevArchCatalog offers={offers} onChoose={chooseOffer} canUpgradeAny={canUpgradeAny}
                      onUpgrade={() => { if (canUpgradeAny) { setUpgradeMsg(null); setPendingUpgrade(null); setPhase("upgrade"); } }} />
                  ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {offers.map((o, idx) => {
                      const fam = familyDef(o.familyId);
                      if (!fam) return null;
                      const cat = CAT[fam.category];
                      const tierCol = o.legendary ? GOLD : tierColor(o.tier); // Rahmen/Badge = Stufe (Rarität): grau/grün/blau/lila/gold
                      const noRoom = !fitFor(o);
                      return (
                        <button key={idx} onClick={() => chooseOffer(o)} disabled={o.used}
                          className="rounded-lg p-2 text-left flex flex-col gap-1.5 transition-all hover:brightness-110"
                          style={{ background: "#16232f", border: `1.5px solid ${tierCol}`, boxShadow: o.used ? undefined : `0 0 8px ${tierCol}40`, opacity: o.used ? 0.4 : 1, cursor: o.used ? "not-allowed" : "pointer" }}>
                          <div className="flex items-center justify-between gap-1">
                            <div className="p-1 rounded" style={{ background: "#0e1822" }}><MiniShape form={fam.form} color={cat.color} /></div>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{ background: `${tierCol}22`, color: tierCol, border: `1px solid ${tierCol}66` }}>
                              {o.legendary ? "★" : tierLabel(o.tier)}
                            </span>
                          </div>
                          <div className="text-[13px] font-bold flex items-center gap-1 leading-tight">
                            <span className="w-[9px] h-[9px] rounded-full inline-block shrink-0" style={{ background: cat.color }} />{fam.name}
                          </div>
                          <div className="text-[10px] font-mono opacity-60 leading-snug">{famEff(fam, { tier: o.tier })}</div>
                          {!rotatableForm(fam.form) && <span className="self-start text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: "#8a97a5", background: "#1a2732", border: "1px solid #2b3e4d" }} title="Diese Form lässt sich nicht drehen (belegt eine ganze Segment-Zeile bzw. ist symmetrisch).">⟳ nicht drehbar</span>}
                          {noRoom && !o.used && <span className="text-[9px] font-mono" style={{ color: "#e0705a" }}>kein Platz → ersetzen</span>}
                        </button>
                      );
                    })}
                    {/* 4. Karte: Aufwerten */}
                    <button onClick={() => { if (canUpgradeAny) { setUpgradeMsg(null); setPendingUpgrade(null); setPhase("upgrade"); } }} disabled={!canUpgradeAny}
                      className="rounded-lg p-2 text-left flex flex-col gap-1.5 transition-all hover:brightness-110"
                      style={{ background: "#16232f", border: `1px dashed ${CAT.value.color}66`, opacity: canUpgradeAny ? 1 : 0.4, cursor: canUpgradeAny ? "pointer" : "not-allowed" }}>
                      <div className="text-lg leading-none">⬆</div>
                      <div className="text-[13px] font-bold leading-tight">Aufwerten</div>
                      <div className="text-[10px] font-mono opacity-60 leading-snug">ein Gebäude +1 Stufe{canUpgradeAny ? "" : " · nichts aufwertbar"}</div>
                    </button>
                  </div>
                  )}
                  {/* #263: Bauplan-Angebot neu würfeln — eigener Gebäude-Reroll-Pool (rerollsArch). Im Dev-Modus entfällt Reroll (Voll-Katalog). */}
                  {!state.devMode && onReroll && (state.rerollsArch || 0) > 0 && (
                    <button onClick={onReroll} className="w-full mt-2 rounded-lg py-2 text-xs font-bold transition-all hover:brightness-110"
                      style={{ background: "#16232f", border: `1px solid ${CAT.value.color}66`, color: CAT.value.color }}>
                      🎲 Baupläne neu würfeln · {state.rerollsArch} übrig
                    </button>
                  )}
                </div>
              )}

              {/* upgrade: Gebäude auswählen → Jetzt/Danach sehen → mit „Aufwerten bestätigen" committen (#237: kein Sofort-Upgrade). */}
              {!removeFor && phase === "upgrade" && (() => {
                const up = pendingUpgrade != null ? committed.find((x) => x.id === pendingUpgrade) : null;
                const uf = up ? familyDef(up.familyId) : null;
                return (
                  <div>
                    {up && uf ? (
                      // Ausgewähltes Gebäude: aktueller UND nächster Effekt (beide sichtbar), bestätigt wird über den Knopf unten.
                      <div className="rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.value.color}18`, borderLeft: "3px solid #f0b429" }}>
                        <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                          <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: CAT[uf.category].color }} />
                          {uf.name}
                          <span className="font-mono" style={{ color: "#f0b429" }}>Stufe {tierLabel(up.tier)} → {tierLabel(up.tier + 1)}</span>
                        </div>
                        <div className="mt-1.5 grid gap-1 text-[11px] font-mono leading-snug">
                          <div className="rounded px-2 py-1" style={{ background: "#16232f", border: "1px solid #24333f" }}>
                            <span className="opacity-55">Jetzt:</span> {famEff(uf, up)}
                          </div>
                          <div className="rounded px-2 py-1" style={{ background: "#15291a", border: "1px solid #2f6d3a" }}>
                            <span className="opacity-55">Danach:</span> <span style={{ color: "#8fe0a0" }}>{famEff(uf, { tier: up.tier + 1 })}</span>
                          </div>
                        </div>
                        <div className="text-[11px] opacity-60 mt-1.5">Unten bestätigen, dann wird aufgewertet.</div>
                      </div>
                    ) : (
                      <>
                        <ArchCollapse className="text-sm rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.value.color}18`, borderLeft: `3px solid ${CAT.value.color}` }}
                          head={<b>Aufwerten</b>}>
                          <div className="opacity-85 leading-snug">wähle unten ein Gebäude (oder tippe es am Brett an) — es wird gold markiert, du siehst aktuellen und nächsten Effekt und bestätigst unten. Nicht aufwertbare (Legendär/No-op-Effekt/max) sind ausgegraut.</div>
                        </ArchCollapse>
                        {upgradeMsg && (
                          <div className="text-xs rounded-r-lg px-3 py-2 mb-1" style={{ background: "#3a2a15", borderLeft: "3px solid #d0902f", color: "#f0d9a8" }}>
                            <b>„{upgradeMsg.name}"</b> — {upgradeMsg.reason === "inert" ? "keine Aufwertung, der Effekt hat keine Stufen" : upgradeMsg.reason === "legendary" ? "Legendäre sind nicht aufwertbar" : upgradeMsg.reason === "max" ? "bereits auf höchster Stufe" : upgradeMsg.reason === "acted" ? "in dieser Bauphase ist die Hauptaktion (Bauen ODER Aufwerten) schon verbraucht" : "nicht aufwertbar"}.
                          </div>
                        )}
                        {/* #232/#261: Liste ALLER aufwertbaren Gebäude — KLICKBAR (wie Skill-/Ersetzen-Menü). Ein Klick
                            markiert das Gebäude (setPendingUpgrade) → es leuchtet gold am Brett und Jetzt/Danach erscheint;
                            aufgewertet wird erst mit „Aufwerten bestätigen". Alternativ weiterhin per Tap aufs Brett. */}
                        {committed.some((b) => upgradeInfo(familyDef(b.familyId), b.tier).can) && (
                          <div className="flex flex-col gap-1 mt-1">
                            {committed.filter((b) => upgradeInfo(familyDef(b.familyId), b.tier).can).map((b) => {
                              const f = familyDef(b.familyId);
                              return (
                                <button key={b.id} onClick={() => { setPendingUpgrade(b.id); setUpgradeMsg(null); }}
                                  className="rounded px-2 py-1.5 text-left text-[10px] font-mono leading-snug flex flex-wrap items-baseline gap-x-1.5 transition-all hover:brightness-125"
                                  style={{ background: "#16232f", border: "1px solid #2f4150" }}>
                                  <span className="inline-flex items-center gap-1"><span className="w-[8px] h-[8px] rounded-full inline-block" style={{ background: CAT[f.category].color }} /><b>{f.name}</b></span>
                                  <span style={{ color: "#f0b429" }}>{tierLabel(b.tier)}→{tierLabel(b.tier + 1)}</span>
                                  {/* #UI: schon in der Liste zeigen, was die Aufwertung bringt (jetzt → danach), ohne erst klicken zu müssen. */}
                                  <span className="opacity-55">{famEff(f, b)}</span>
                                  <span style={{ color: "#8fe0a0" }}>→ {famEff(f, { tier: b.tier + 1 })}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* #261: EINE kombinierte Platzier-/Verschiebe-Phase — alle Gebäude (inkl. des eben gewählten) sind frei
                  ziehbar/drehbar; ein einziges „Bestätigen" unten schließt ab. */}
              {!removeFor && phase === "move" && (
                <div>
                  {/* Erfolgs-Feedback: hervorgehobene Zeile, dass das Aufwerten wirklich griff (mobil sonst leicht übersehen — die Ziffer am Gebäude ist winzig). */}
                  {upgradeDone && (
                    <div className="text-sm rounded-r-lg px-3 py-2.5 mb-2 flex items-center gap-1.5 flex-wrap" style={{ background: "#15291a", borderLeft: "3px solid #f0b429", color: "#d7f0c8" }}>
                      <span aria-hidden="true">⬆</span> <b>„{upgradeDone.name}"</b> aufgewertet:
                      <span className="font-mono" style={{ color: "#f0b429" }}>Stufe {tierLabel(upgradeDone.from)} → {tierLabel(upgradeDone.to)}</span>
                    </div>
                  )}
                  {/* #UI: Die Farbauswahl (colorLocked-Gebäude) liegt jetzt direkt über dem Brett, nicht mehr hier. */}
                  <ArchCollapse className="text-sm rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.value.color}18`, borderLeft: `3px solid ${CAT.value.color}` }}
                    head={<b>Platzieren & Verschieben</b>}>
                    <div className="opacity-85 leading-snug">zieh Gebäude am Brett an ihren Platz (Griff überall, <b>⟳ Drehen</b> oben) — beliebig oft. Unten <b>Bestätigen</b> startet den Durchlauf.</div>
                  </ArchCollapse>
                </div>
              )}
            </div>

            {/* #UI „nur Buttons": schmale, schwebende Aktions-Leiste (mobil oben angeheftet) — nur die Phasen-Buttons,
                damit sie beim Ziehen am Brett erreichbar bleiben. Anleitung/Referenz/Farbwahl bleiben im Panel drüber.
                Desktop: normale Leiste (md:static). */}
            <div className="order-1 sticky top-0 z-20 md:static rounded-xl p-2 -mt-2 md:mt-0" style={{ background: "#0e1822", border: "1px solid #20303d", boxShadow: "0 6px 16px #0006" }}>
              {/* #248/#UI: Rotieren in der schwebenden Leiste. In der Verschiebe-Phase steht „Drehen" KOMPAKT neben
                  „Bestätigen" (unten) — kein voll-breiter Balken mehr. Außerhalb (place) bleibt es die eigene Zeile. */}
              {showRotate && phase !== "move" && (selRotatable ? (
                <button onClick={rotateSelected} className="w-full mb-2 rounded-lg py-2 text-sm font-bold" style={{ background: "#1a2a37", border: `1px solid ${CAT.value.color}` }}>⟳ Drehen</button>
              ) : (
                <button type="button" disabled aria-disabled="true"
                  title="Diese Form lässt sich nicht drehen (belegt eine ganze Segment-Zeile bzw. ist symmetrisch)."
                  className="w-full mb-2 rounded-lg py-2 text-sm font-bold cursor-not-allowed"
                  style={{ background: "#141c24", border: "1px solid #2b3e4d", color: "#5a6672", opacity: 0.55 }}>⟳ Nicht drehbar</button>
              ))}
              {/* #266: „kein Platz zum Drehen" — ehrliches Feedback statt eines wirkungslosen Buttons am vollen Brettrand. */}
              {showRotate && rotateMsg && (
                <div className="mb-2 rounded-lg px-2.5 py-1.5 text-[11px] font-mono leading-snug" style={{ background: "#3a1518", border: "1px solid #d1462f", color: "#e0705a" }}>
                  ⟳ {rotateMsg}
                </div>
              )}
              {/* #361: „↶ Rückgängig" + „Zurücksetzen" — identische Beschriftung/Look wie die Aufstellungsphase
                  (FormationPhase). Im Haupt-Fluss (choose/move) über den Phasen-Buttons; NICHT mit der bestehenden
                  „← Zurück"-Sub-Navigation (Upgrade/Ersetzen) vermengen. Aktiv, sobald in dieser Phase etwas geschah. */}
              {!removeFor && (phase === "choose" || phase === "move") && (
                <div className="flex gap-2 mb-2">
                  <button onClick={doArchUndo} disabled={!canArchUndo} className="flex-1 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
                    style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: canArchUndo ? 1 : 0.4, cursor: canArchUndo ? "pointer" : "default" }}>↶ Rückgängig</button>
                  <button onClick={doArchReset} disabled={!canArchUndo} className="flex-1 px-3 py-2 rounded-lg text-sm whitespace-nowrap"
                    style={{ background: "#20202a", border: "1px solid #3a3a46", opacity: canArchUndo ? 1 : 0.4, cursor: canArchUndo ? "pointer" : "default" }}>Zurücksetzen</button>
                </div>
              )}
              {removeFor ? (
                <button onClick={() => { setRemoveFor(null); setDemolishIds([]); }} className="w-full rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>← Anderer Bauplan</button>
              ) : phase === "choose" ? (
                // #279: Umstellen muss auch möglich sein, wenn nichts (mehr) baubar ist. Sobald Gebäude stehen,
                // führt „Gebäude umstellen" in die Verschiebe-Phase (dort ziehen/drehen, dann „Bestätigen").
                committed.length > 0 ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setInspectId(null); setSelId(null); setPhase("move"); }} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: `${CAT.value.color}22`, border: `1px solid ${CAT.value.color}`, color: "#cfe3f5" }}>↔ Gebäude umstellen</button>
                    <button onClick={() => onDone?.()} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>Nichts bauen · Fortfahren →</button>
                  </div>
                ) : (
                  <button onClick={() => onDone?.()} className="w-full rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>Nichts bauen · Fortfahren →</button>
                )
              ) : phase === "upgrade" && pendingUpgrade != null ? (
                <div className="flex gap-2">
                  <button onClick={() => setPendingUpgrade(null)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>Abbrechen</button>
                  <button onClick={confirmUpgrade} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: "#f0b429", color: "#141419" }}>⬆ Aufwerten bestätigen</button>
                </div>
              ) : phase === "upgrade" ? (
                <button onClick={() => { setUpgradeMsg(null); setPendingUpgrade(null); setPhase("choose"); }} className="w-full rounded-lg py-2 text-xs font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>← Zurück</button>
              ) : phase === "move" ? (
                <div className="flex flex-wrap gap-2">
                  {/* Drehen kompakt (nur wenn ein Gebäude gewählt ist); Bestätigen bleibt der prominente Knopf. */}
                  {showRotate && (selRotatable ? (
                    <button onClick={rotateSelected} className="shrink-0 px-3.5 rounded-lg py-2 text-sm font-bold" style={{ background: "#1a2a37", border: `1px solid ${CAT.value.color}` }}>⟳ Drehen</button>
                  ) : (
                    <button type="button" disabled aria-disabled="true" title="Diese Form lässt sich nicht drehen (belegt eine ganze Segment-Zeile bzw. ist symmetrisch)."
                      className="shrink-0 px-3 rounded-lg py-2 text-sm font-bold cursor-not-allowed" style={{ background: "#141c24", border: "1px solid #2b3e4d", color: "#5a6672", opacity: 0.55 }}>⟳ nicht drehbar</button>
                  ))}
                  <button onClick={() => onDone?.()} className="flex-1 basis-[170px] rounded-lg py-2 text-sm font-bold" style={{ background: CAT.value.color, color: "#fff" }}>✓ Bestätigen · Durchlauf starten</button>
                </div>
              ) : null}
              {/* #UI: Effekt des gerade platzierten (place) bzw. gewählten (move) Gebäudes — floatet mit der Leiste. */}
              {(() => {
                const eb = phase === "place" && pending ? pending : phase === "move" && selId ? buildings.find((x) => x.id === selId) : null;
                const efam = eb ? familyDef(eb.familyId) : null;
                if (!efam) return null;
                return (
                  // #UI: Effekt-Readout mit typ-farbigem Rahmen (Kategorie-Farbe = die Typ-Farbe, die vorher der Gebäude-Hintergrund trug).
                  <div className="mt-2 rounded-lg px-2.5 py-1.5 text-[11px] font-mono leading-snug"
                    style={{ border: `1px solid ${CAT[efam.category].color}`, background: `${CAT[efam.category].color}12` }}>
                    <span className="inline-flex items-center gap-1.5 align-middle">
                      <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: CAT[efam.category].color }} />
                      <b>{efam.name}</b>
                      <span className="opacity-55">{efam.legendary ? "Legendär" : `Stufe ${tierLabel(eb.tier)}`}</span>
                    </span>
                    <span className="opacity-80"> — {famEff(efam, eb)}</span>
                  </div>
                );
              })()}
            </div>

            {/* choose: „Was habe ich schon?" — alle gebauten Gebäude mit Beschreibung, verlinkt mit dem Brett.
                Antippen (Liste ODER Brett) lässt Gebäude + Beschreibung gemeinsam cyan leuchten. Steht direkt unter „Nichts bauen". */}
            {!removeFor && phase === "choose" && committed.length > 0 && (
              <div className="order-1 rounded-xl p-3" style={{ background: "#0e1822", border: "1px solid #20303d" }}>
                <div className="text-[11px] font-mono uppercase tracking-wide opacity-60 mb-0.5">Deine Gebäude ({committed.length})</div>
                <div className="text-[10px] opacity-45 mb-2">Antippen zeigt am Brett, wo es liegt — und umgekehrt.</div>
                <div className="flex flex-col gap-1">
                  {committed.map((b) => {
                    const f = familyDef(b.familyId); if (!f) return null;
                    const on = inspectId === b.id;
                    return (
                      <button key={b.id} id={`arch-inspect-${b.id}`} onClick={() => setInspectId(on ? null : b.id)}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-mono leading-snug flex flex-col gap-0.5 transition-all"
                        style={{ background: on ? "#12313f" : "#16232f", border: `1px solid ${on ? "#5ec8f0" : "#24333f"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="w-[8px] h-[8px] rounded-full inline-block" style={{ background: f.legendary ? GOLD : CAT[f.category].color }} />
                          <b>{f.name}</b>
                          <span className="opacity-55">{f.legendary ? "Legendär" : `Stufe ${tierLabel(b.tier)}`}</span>
                        </span>
                        <span className="opacity-75">{famEff(f, b)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                <Stat k="Baufeld belegt" v={`${Math.round(coverCount / maxCover * 100)}%`} />
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
  let s;
  switch (base.kind) {
    case "flat":       s = fam.category === "value" ? `alle Abgedeckten +${nz(base.value)} Stichwert` : `Sieg +${nz(base.score)} Score`; break;
    case "lowValue":   s = `niedrige Karten +${nz(base.value)} Stichwert`; break;
    case "color":      s = fam.category === "value" ? `passende Farbe +${nz(base.value)} Stichwert` : `passende Farbe +${nz(base.score)} Score`; break;
    case "target":     s = `${fam.target === "highest" ? "höchste" : "niedrigste"} Karte +${nz(fam.category === "value" ? base.value : base.score)} ${fam.category === "value" ? "Stichwert" : "Score"}`; break;
    case "streak":     s = `Sieg +${nz(base.score)} Score × Serie`; break;
    case "crit":       s = `Crit-Sieg +${nz(base.score)} Score`; break;
    case "milestone": { const every = (base.kind === "milestone" && fam.tierKick && fam.tierKick.every && t >= fam.tierKick.at) ? fam.tierKick.every : base.every; s = `jeder ${every}. Sieg auf diesem Gebäude +${nz(base.score)} Score`; break; }
    case "mult":       s = `Siege hier ×${base.factor}`; break;
    // #Pool: Distrikt-Effekte — hängen vom Brett ab (Nachbarschaft / vollendete Strukturen).
    case "neighbor":   s = fam.category === "value" ? `+${nz(base.value)} Stichwert je Nachbargebäude (max ${base.cap})` : `Sieg +${nz(base.score)} Score je Nachbargebäude (max ${base.cap})`; break;
    case "compound":   s = `Sieg +${nz(base.score)} Score je vollendeter Struktur`; break;
    // #Pool Batch 3: Lage/Staffel — hängen von der Position ab.
    case "segment":    s = `${base.half === "early" ? "frühe" : "späte"} Segmente ${fam.category === "value" ? `+${nz(base.value)} Stichwert` : `+${nz(base.score)} Score`}`; break;
    case "relay":      s = base.both ? `strahlt +${nz(base.score)} Score in beide Nachbarfelder` : `reicht +${nz(base.score)} Score ans Feld rechts weiter`; break;
    // #Pool Batch 4: Risiko — Crit-Wette.
    case "gamble":     s = `Crit-Sieg +${nz(base.score)} Score · Sieg ohne Crit −${base.penalty} Score`; break;
    case "joker":      s = `Formations-Joker (${base.types.join("/")})`; break;
    case "transparentFarb": s = "Farbblock-Transparenz"; break;
    case "bind":       s = `Treppen-Bindeglied: Karte darf im Wert um ±${bindSpanFor(t)} abweichen`; break;
    case "crossSeg":   s = "öffnet die Segmentgrenze"; break;
    case "anker":      s = `jede Zelle = Anker ×${tierFactor(base.factor, t).toFixed(2)}`; break;
    case "formMult":   s = `Formationen hier ×${base.factor}`; break;
    default:           s = ""; break;
  }
  // #Pool tierKick: qualitativer Zusatz ab Stufe `at` sichtbar machen (aktiv ab dieser Stufe, sonst als Vorschau markiert).
  if (fam.tierKick && s) {
    const k = fam.tierKick, on = t >= k.at;
    let kickTxt = "";
    if (k.mult) kickTxt = `zusätzlich ×${k.mult} Score`;
    else if (k.critFlatMult) kickTxt = `bei Crit ×${k.critFlatMult} Direkt-Score`;
    else if (k.streakDoubleFrom) kickTxt = `ab Serie ${k.streakDoubleFrom} doppelt`;
    else if (k.addType) kickTxt = `zweiter Joker-Typ: ${k.addType}`;
    else if (k.ankerValue) kickTxt = `+${k.ankerValue} Stichwert je Ankerzelle`;
    if (kickTxt) s += on ? ` · ${kickTxt}` : ` (Stufe ${k.at}: ${kickTxt})`;
  }
  return s;
}

/* Dev-Run-Bauplan-Katalog (nur Preview): statt der 3er-Auswahl ALLE Baupläne, nach Kategorie (Wert/Score/
   Formation) aufklappbar → Familie (mit Effekt-Beschreibung) → Stufe. Klick auf eine Stufe baut sofort (chooseOffer,
   wie sonst). `offers` ist der Voll-Katalog (devCatalog.fullArchitectOffer). Ein Bau pro Phase bleibt. */
const ARCH_CAT_ORDER = ["value", "score", "formation"];
function DevArchCatalog({ offers, onChoose, canUpgradeAny, onUpgrade }) {
  const [openCat, setOpenCat] = useState("value");
  const [openFam, setOpenFam] = useState(null);
  const byCat = {};
  for (const o of offers) {
    const fam = familyDef(o.familyId); if (!fam) continue;
    (byCat[fam.category] ||= {});
    (byCat[fam.category][o.familyId] ||= []).push(o);
  }
  const tval = (t) => (t === "legendary" ? 99 : t);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] opacity-55">Voll-Katalog (Dev): Kategorie → Familie → Stufe. Ein Bau pro Phase (danach Verschieben/Bestätigen).</div>
      {ARCH_CAT_ORDER.filter((c) => byCat[c]).map((c) => {
        const meta = CAT[c] || { label: c, color: "#8a97a5" };
        const fids = Object.keys(byCat[c]);
        const open = openCat === c;
        return (
          <div key={c} className="flex flex-col gap-1.5">
            <button onClick={() => setOpenCat(open ? null : c)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold"
              style={{ background: open ? `${meta.color}1f` : "#13202b", border: `1px solid ${open ? meta.color : "#26323d"}`, color: open ? meta.color : "#c8d2da" }}>
              <span>{meta.label} <span className="opacity-55 font-normal">· {fids.length}</span></span>
              <span className="opacity-70">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div className="flex flex-col gap-1.5 pl-1">
                {fids.map((fid) => {
                  const fam = familyDef(fid);
                  const os = byCat[c][fid].slice().sort((a, b) => tval(a.tier) - tval(b.tier));
                  const fo = openFam === fid;
                  // Effekt schon auf der Familien-Ebene (repräsentativ: Stufe 1) — erst beim Aufklappen die Stufen.
                  const repDesc = famEff(fam, { tier: os[0]?.tier ?? 1 });
                  return (
                    <div key={fid} className="rounded-lg" style={{ background: "#13202b", border: "1px solid #26323d" }}>
                      <button onClick={() => setOpenFam(fo ? null : fid)} className="w-full flex items-start justify-between gap-2 px-3 py-2 text-left">
                        <span className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-sm" style={{ color: meta.color }}>{fam.name}</span>
                          {repDesc && <span className="text-[11px] font-mono opacity-60 leading-snug">{repDesc}</span>}
                        </span>
                        <span className="text-[11px] opacity-50 shrink-0 mt-0.5 whitespace-nowrap">{fo ? "▲ Stufe" : "▼ Stufe"}</span>
                      </button>
                      {fo && (
                        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                          {os.map((o) => {
                            const col = o.legendary ? GOLD : tierColor(o.tier);
                            return (
                              <button key={String(o.tier)} onClick={() => onChoose(o)} disabled={o.used}
                                title={famEff(fam, { tier: o.tier })}
                                className="px-2.5 py-1 rounded text-xs font-bold transition-all hover:-translate-y-0.5"
                                style={{ background: `${col}1f`, color: col, border: `1px solid ${col}88`, opacity: o.used ? 0.4 : 1 }}>
                                {tierLabel(o.tier)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={onUpgrade} disabled={!canUpgradeAny}
        className="self-start mt-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
        style={{ background: "#13202b", border: `1px dashed ${CAT.value.color}66`, color: CAT.value.color, opacity: canUpgradeAny ? 1 : 0.4 }}>
        ⬆ Aufwerten{canUpgradeAny ? "" : " · nichts aufwertbar"}
      </button>
    </div>
  );
}
