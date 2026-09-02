import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import {
  shapeRotations, enumeratePlacements, isValidFootprint, nextRotationFootprint,
  occupiedCells, precomputeArchitect, architectValueBonus, boardFactorMap, structureFactorMap, districtFactorMap,
  rowOf, colOf, posOf, ROWS, COLS, N_POS, upgradeInfo, footprintAtRot, currentRotationIndex,
  HAEUSERZEILE_FACTOR, SPALTE_FACTOR, DIAGONALE_FACTOR, DISTRICT_BONUS, DISTRICT_CAP,
} from "../game/architect.js";
import { archFamily as familyDef } from "../i18n/labels.js"; // #sprache: Gebäudenamen zur Anzeigezeit (i18n) — archFamily ist der ARCHITEKT-Resolver (labels.familyDef löst Perk-Familien → null für Gebäude → leeres Angebot, #regression 1fa6778)
import { computeFormations, summarizeFormations } from "../game/formations.js";
import { fundamentBonus } from "../game/perks.js"; // v0.3 „Fundament": Strukturfaktor-Bonus des Builds
import { allianceGroups } from "../game/families.js"; // #289: Farballianz für Wert-Boost-Anzeige
import { SUIT_ORDER, PLANT_VALUE_CAP } from "../game/constants.js";
import { ARCH_CAT as CAT, PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { tierColor } from "../game/rarity.js";
import FormIcon from "./FormIcon.jsx";
import { formationBorder } from "./formationStyle.js";
import { formationAbbr, formationLabel } from "./formationLabels.js";
import { archFrameLines } from "./CardGrid.jsx"; // #UI: durchgezogene Gebäude-Kontur wie in der Aufstellungsphase
import { fmtScore } from "./format.js";
import { GlossaryPanel } from "./Glossary.jsx";
import { glacierGridProps } from "./glacierBoard.js"; // Eis: Gletscher-/Firn-Marker auch am Architekt-Brett
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon (Eis ersetzt glacier.webp)
import { useEscape } from "./useEscape.js";
import { phaseCard, phasePanel, PhaseHairline, PHASE_ACCENTS } from "./modalStyle.jsx";
import { buildingEffect } from "../i18n/buildingText.js"; // #sprache: Gebäude-Effekttext zur Anzeigezeit
import { t, fmtNum } from "../i18n/index.js";
import { suitLabel } from "../i18n/labels.js";

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
// Warum ein Gebäude nicht aufwertbar ist → Katalog-Schlüssel (der Reducer liefert nur den Grund-Code).
const UPGRADE_REASON = {
  inert: "arch.upgrade.reason.inert",
  legendary: "arch.upgrade.reason.legendary",
  max: "arch.upgrade.reason.max",
  acted: "arch.upgrade.reason.acted",
};

const GOLD = "#c8962f"; // Legendär
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };
const tierLabel = (t) => (t === "legendary" ? "★" : ROMAN[t] || "");
const fmt = (x) => fmtNum(x.toFixed(2));
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
        <span className="text-meta-1 opacity-60 shrink-0 whitespace-nowrap">{t(open ? "arch.collapse.less" : "arch.collapse.more")}</span>
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  );
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
  const { glacierPos = null, glacierMassByPos = null, firnStackByPos = null } = glacierGridProps(state); // #386 Firn-Boden-Reserve

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
  // v0.3 „Fundament": Strukturfaktor-Bonus des Builds muss in JEDE Anzeige-Quelle, sonst zeigt der Bau-Screen
  // andere Faktoren, als die Engine verrechnet (boardFactorMap ist bewusst die eine gemeinsame Quelle).
  const fundBonus = useMemo(() => fundamentBonus(state.perks), [state.perks]);
  const pre = useMemo(() => (cards.length ? precomputeArchitect(effArch, order, deck, fundBonus) : null), [effArch, order, deck, cards.length, fundBonus]);
  const structF = useMemo(() => boardFactorMap(buildings, fundBonus), [buildings, fundBonus]); // #283: Struktur × Distrikt (gleiche Quelle wie die Engine)
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
  // #UI: Phasen-Δ des Gebäude-Boosts — wie viel diese Bauphase am Boost geändert hat, PERSISTENT sichtbar (nicht nur
  // beim Ziehen), analog zum Aufstellungs-Δ (FormationPhase). Baseline an state.cycle gebunden → beim Rundenwechsel
  // deterministisch neu gesetzt, auch wenn der Screen über die Phasen hinweg NICHT neu mountet. Erster Boost der Runde
  // = Nulllage; committete Bauten/Verschiebungen bewegen das Δ.
  const boostBaseline = useRef({ cycle: null, base: null });
  if (boostBaseline.current.cycle !== state.cycle && cards.length)
    boostBaseline.current = { cycle: state.cycle, base: archBoostPct };
  const phaseBoostDelta = boostBaseline.current.base === null ? 0 : archBoostPct - boostBaseline.current.base;
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
  const scrollerRef = useRef(null);     // #: Scroll-Container (das Architekt-Panel selbst) — Ziel für den Bau-Auto-Scroll
  const boardSectionRef = useRef(null); // #: der ganze Brett-Abschnitt (Farbleiste/Kombis-Toggle + Gitter) — hierhin scrollt der Bau
  const stickyBarRef = useRef(null);    // #: die sticky Aktionsleiste oben — ihre Höhe halten wir beim Scrollen frei
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
    // archSig ist die Signatur der Belegung (pos:bid …) und wechselt genau dann, wenn sich am Rahmen etwas
    // ändert. Die übrigen Werte hängen daran — als Deps brächten sie nur zusätzliche Messläufe.
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
    // flashSig fasst den Bau-Vorgang zusammen; structCells/distBids leiten sich daraus ab. Als Deps würde der
    // Flash bei jedem Neuberechnen erneut zünden statt einmal je Platzierung.
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
  // #health-check M4: eine Quelle statt einer Kopie — currentRotationIndex ist die Engine-Fassung derselben Suche.
  const currentRotOf = (b) => currentRotationIndex(familyDef(b.familyId).form, b.footprint);
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
  }, [removeFor, committed, maxCover]); // eslint-disable-line react-hooks/exhaustive-deps -- fitWithout hängt allein an diesen dreien
  // #281: Reicht die aktuell markierte Abriss-Menge, um Platz zu schaffen? (Fußabdruck-Lage nach dem Abriss oder null.)
  const demolishFit = useMemo(() => (removeFor && demolishIds.length ? fitWithoutSet(removeFor, demolishIds) : null), [removeFor, demolishIds, committed, maxCover]); // eslint-disable-line react-hooks/exhaustive-deps -- fitWithoutSet hängt allein an diesen vieren
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
    // #UI: nach der Bauplan-Wahl automatisch zum Brett scrollen — der OBERE Rand des Brett-Abschnitts (Farbauswahl-
    // Leiste bei colorLocked, sonst die Kombis/Formationen-Zeile) rutscht direkt UNTER die sticky Aktionsleiste, sodass
    // das eben gesetzte Gebäude (oberste Brett-Reihe) voll sichtbar ist statt hinter der Leiste zu verschwinden (#).
    // Deckt beide Fälle mit EINER Logik ab: ohne Farbe → Kombis-Zeile oben; mit Farbe → Farbauswahl-Leiste oben.
    if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => {
      const sec = boardSectionRef.current, scroller = scrollerRef.current;
      if (sec && scroller) {
        const offset = (stickyBarRef.current?.offsetHeight || 0) + 12; // sticky Aktionsleiste freihalten
        const delta = sec.getBoundingClientRect().top - scroller.getBoundingClientRect().top - offset;
        scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + delta), behavior: "smooth" });
      } else {
        (fam.colorLocked ? colorBarRef.current : boardRef.current)?.scrollIntoView({ block: "start", behavior: "smooth" });
      }
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
  }, [committed, removeFor]); // eslint-disable-line react-hooks/exhaustive-deps -- läuft NUR auf Abriss/Ersetzen; die Setter sind stabil
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
  // #361-Folge: „↶ Rückgängig"/„Zurücksetzen" betreffen NUR Verschiebungen (die Gebäude bleiben, actedMain unberührt) →
  // KEIN Phasenwechsel mehr (kein Zurückspringen ins Bauplan-Fenster). Nur die transiente Drag-Vorschau aufräumen.
  const doArchUndo = () => { onUndo?.(); setDragPrev(null); setRotateMsg(null); };
  const doArchReset = () => { onReset?.(); setDragPrev(null); setRotateMsg(null); };
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
      setUpgradeMsg({ name: fam ? fam.name : t("arch.buildingFallback"), reason: architect.actedMain ? "acted" : info.reason });
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
    if (phase === "upgrade") { const cb = committedAt(pos); if (cb) { const fam = familyDef(cb.familyId); const info = upgradeInfo(fam, cb.tier); if (info.can) { setPendingUpgrade(cb.id); setUpgradeMsg(null); } else { setUpgradeMsg({ name: fam ? fam.name : t("arch.buildingFallback"), reason: info.reason }); setPendingUpgrade(null); } } return; } // #237: markieren + Jetzt/Danach zeigen, Aufwertung erst über den Bestätigen-Knopf
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
      return footprintAtRot(form, rot, posOf(ar, ac));
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
    setRotateMsg(t("arch.rotate.noRoom"));
  };

  // Live-Delta beim Ziehen (Vorschau-Position).
  const dragDelta = useMemo(() => {
    if (!dragPrev || !dragPrev.footprint.length) return null;
    const previewBuildings = buildings.map((x) => (x.id === dragPrev.id ? { ...x, footprint: [...dragPrev.footprint].sort((m, n) => m - n) } : x));
    const previewArch = { ...architect, buildings: previewBuildings };
    const p2 = precomputeArchitect(previewArch, order, deck, fundBonus);
    const val2 = cards.reduce((t, c, p) => t + c.value + (architectValueBonus(p2, p, c, alliance) || 0), 0);
    const previewForms = computeFormations(order, deck, state.roles, state.perks, state.skills, state.shop?.anchors || [], state.familyTiers, previewArch);
    const form2 = summarizeFormations(previewForms).count;
    // #UI: Boost-Vorschau — dieselbe Formel wie archBoostPct (Struktur-Kombis Σ(f−1) + neu gegründete Formationen), aber
    // mit den Vorschau-Gebäuden. dBoost = Vorschau − aktuell → Live-Differenz des Gebäude-Boosts im Brett-Kopf.
    const sumStr = (fs) => (fs || []).reduce((s, pf) => s + ((pf.mult || 1) - 1), 0);
    const pStructBonus = boardFactorMap(previewBuildings, fundBonus).reduce((t, f) => t + (f - 1), 0); // #health-check G2: gleiche Quelle wie die Baseline (Zeile ~171), sonst zeigt dBoost ein Phantom-Delta
    const pFormGain = Math.max(0, sumStr(previewForms) - sumStr(formationsNoArch));
    const previewBoost = Math.round((pStructBonus + pFormGain) * 100);
    return { dVal: val2 - sumValue, dForm: form2 - formCount, dBoost: previewBoost - archBoostPct, valid: dragPrev.valid };
  }, [dragPrev]); // eslint-disable-line react-hooks/exhaustive-deps -- die Vorschau IST der Auslöser, alles andere liest sie nur aus

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
  // (Nulllage zuerst — hält die Zeile frei von der Folge „> … <", die der i18n-Textgreifer sonst greift.)
  const scoreDiffColor = scorePctDiff === 0 ? "#8a8a92" : (scorePctDiff > 0 ? "#5ab87a" : "#e0605a");
  const scoreDiffSign = scorePctDiff === 0 ? "±" : (scorePctDiff > 0 ? "+" : "−");
  const scoreDiffStr = t("arch.scoreDiff", { sign: scoreDiffSign, pct: Math.abs(scorePctDiff) });
  // Farbton + Pfeil eines Boost-Δ-Chips (Nulllage zuerst) — gilt für den Live-Wert beim Ziehen UND das persistente
  // Phasen-Δ.
  const boostToneOf = (d) =>
      d === 0 ? { fg: "#8a97a5", bg: "#ffffff0c", br: "#2b3e4d", arrow: "±" }
    : d > 0   ? { fg: "#5fce86", bg: "#155e3126", br: "#2f9d5566", arrow: "▲ +" }
    :           { fg: "#e0705a", bg: "#8a1e1e26", br: "#d1462f66", arrow: "▼ " };
  // Beim Ziehen zeigt der Chip die Vorschau-Differenz der schwebenden Position; ohne Drag persistent das Phasen-Δ
  // (wie viel diese Bauphase am Boost geändert hat) — so bleibt die Änderung „an dieser Stelle" dauerhaft sichtbar.
  const shownBoostDelta = dragDelta ? dragDelta.dBoost : phaseBoostDelta;
  const boostTone = boostToneOf(shownBoostDelta);

  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-20 flex items-start sm:items-center justify-center p-2 sm:p-4"
      style={{ background: "#0c1017dd", backdropFilter: "blur(3px)" }}>
      {/* #kante: Der Architekt behält seine Blau-Petrol-Welt — er ist die Bauphase, ein anderer Ort. Damit
          seine Bausteine trotzdem die Formensprache des Spiels sprechen können, setzt er hier die beiden
          Grund-Variablen der Kanten-Familie (index.css) auf seine eigenen Töne und vererbt sie nach unten.
          Die Klassen `as-edge-*` zeichnen dann Kante und Anlauf auf Petrol statt auf Violett-Schwarz. */}
      <div ref={scrollerRef} className="relative w-full max-w-5xl rounded-2xl p-4 sm:p-6 max-h-[96dvh] overflow-y-auto overlay-card"
        style={{ ...phaseCard(PHASE_ACCENTS.blue, ["#111c27", "#0d1720"]), color: "#e7eef5",
                 "--edge-bg": "#16232f", "--edge-btn-bg": "#101c26" }}>
        <PhaseHairline />

        {/* Kopf (#UI-Redesign): Titel + Glossar; die Kennzahlen wandern in die Hero-Leiste darunter. */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="text-meta-1 uppercase tracking-[0.18em] opacity-60" style={{ color: CAT.value.color }}>{t("arch.eyebrow", { cycle: round })}</div>
            <h2 className="text-title-6 font-bold mt-0.5">{t("arch.title")}</h2>
          </div>
          <div className="ml-auto shrink-0"><GlossaryPanel /></div>
        </div>
        {/* Hero-Stat-Leiste: der Gebäude-Boost ist das, was man beim Bauen maximiert → Hero-Wert (grün). Baufeld & Durchlauf-
            Score als Nebenzellen (ersetzt den verstreuten Kopf-Cluster + das separate Score-Badge). Gleicher Bau wie die
            Hero-Leiste der Aufstellphase. */}
        <div className="flex items-stretch mt-3 rounded-xl overflow-hidden" style={phasePanel(PHASE_ACCENTS.blue, "#0e1a24")}>
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-3.5 py-2.5"
            title={t("arch.boost.title")}>
            <span className="text-meta-1 uppercase tracking-wide font-bold" style={{ color: "#6d7f8e" }}>{t("arch.boost")}</span>
            <span className="ty-num leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 25, color: archBoostPct > 0 ? "#5fce86" : "#8a97a5" }}>+{archBoostPct} %</span>
          </div>
          {/* data-hint-anchor: C5 (kein Bauplan passt mehr) laesst das Baufeld-Panel leuchten. */}
          <div className="flex flex-col justify-center gap-1 px-3.5 py-2.5 text-right border-l" data-hint-anchor="baufeld"
            style={{ borderColor: "rgba(59,125,190,.32)" }}>
            <span className="text-meta-1 uppercase tracking-wide font-bold" style={{ color: "#6d7f8e" }}>{t("arch.plot")}</span>
            <span className="ty-num leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 19, color: GOLD }}>{Math.max(0, maxCover - coverCount)}<span className="text-body-5 opacity-60"> / {maxCover}</span></span>
            <span className="text-micro-3 ty-num-sm opacity-45">{t("arch.plot.used", { n: coverCount, pct: Math.round(coverCount / maxCover * 100) })}</span>
          </div>
          {state.lastCycleScore != null && (
            <div className="flex flex-col justify-center gap-1 px-3.5 py-2.5 text-right border-l" style={{ borderColor: "rgba(59,125,190,.32)" }}>
              <span className="text-meta-1 uppercase tracking-wide font-bold" style={{ color: "#6d7f8e" }}>{t("arch.cycleScore")}</span>
              <span className="ty-num leading-none" style={{ fontVariantNumeric: "tabular-nums", fontSize: 19, color: GOLD }}>{fmtScore(state.lastCycleScore)}</span>
              {scoreHasDiff && <span className="text-meta-1 font-bold" style={{ color: scoreDiffColor }}>{scoreDiffStr}</span>}
            </div>
          )}
        </div>

        <div className="grid gap-4 mt-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] items-start">
          {/* ---- Brett 8×5 — Mobil in der Mitte (order-2): Phase-Panel drüber, Vorschau drunter; Desktop links (md:order-1). ---- */}
          <section ref={boardSectionRef} className="rounded-xl p-3 order-2 md:order-1" style={phasePanel(PHASE_ACCENTS.blue, "#0e1822")}>
            {/* #UI: Farbauswahl (colorLocked-Gebäude: Buntglas/Zunfthaus) sitzt jetzt DIREKT über dem Brett — zwischen der
                Bestätigen-Leiste (mobil darüber) und dem Brett. Eigener Rahmen + Abstand nach unten, damit man beim Tippen
                der Farbe nicht versehentlich Bestätigen trifft (vorher lag sie weit oben im Panel → hochscrollen nötig). */}
            {selBuilding && phase === "move" && familyDef(selBuilding.familyId)?.colorLocked && (
              /* #kante: Die Farbwahl-Leiste ist ein Hinweis mit Aufforderung — Kante in ihrem Orange samt
                 Schein (`is-sel`), statt Vollrahmen plus Außen-Glow. */
              <div ref={colorBarRef} className="as-edge-card is-sel mb-3 rounded-lg px-3 py-2.5 flex items-center gap-3 flex-wrap"
                style={{ "--c": "#d97a3a", scrollMarginTop: "12px" }}>
                <span className="text-meta-3 uppercase tracking-wide font-bold" style={{ color: "#e0894a" }}>{t("arch.buffSuit")}</span>
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
              {/* #UI: „Bau-Brett"-Label entfällt — der (jetzt persistente) Boost-Δ hätte die Zeile sonst umgebrochen und das
                  Brett verrutschen/„zittern" lassen. Der Δ-Chip hat feste Breite (tabular-nums + minWidth), damit er beim
                  Ziehen nicht in der Breite flackert; die Toggles bleiben rechts (ml-auto) unverrückt. */}
              {/* #ui: Persistenter Boost-Δ-Chip — zeigt dauerhaft, wie viel diese Bauphase am Boost geändert hat
                  (analog zum Aufstellungs-Δ). Beim Ziehen wechselt er auf die Live-Vorschau der schwebenden Position. */}
              <span className="text-meta-3 font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center justify-center"
                style={{ fontVariantNumeric: "tabular-nums", minWidth: 92,
                         color: boostTone.fg, background: boostTone.bg,
                         border: `1px solid ${boostTone.br}` }}
                title={dragDelta ? t("arch.boostDelta.title") : t("arch.boostDelta.phaseTitle")}>
                {t("arch.boostDelta", { arrow: boostTone.arrow, pct: shownBoostDelta })}
              </span>
              <div className="flex items-center gap-1.5 ml-auto" data-hint-anchor="archtoggles">
                {/* #kante: Die zwei Anzeige-Schalter — an trägt seine Farbe an der Kante (Kombos gold,
                    Formationen blau), aus bleibt neutral. Farben unverändert, nur die Form folgt der Familie. */}
                <button onClick={toggleCombos}
                  className={`${showCombos ? "as-edge" : "as-edge-neutral"} as-edge-thin text-meta-3 font-bold rounded-lg px-2 py-1 transition-colors`}
                  style={showCombos ? { "--c": "#d4a63a" } : undefined}
                  title={t("arch.combos.title")}>{showCombos ? "◉" : "○"} {t("arch.combos")}</button>
                <button onClick={toggleForms}
                  className={`${showForms ? "as-edge" : "as-edge-neutral"} as-edge-thin text-meta-3 font-bold rounded-lg px-2 py-1 transition-colors`}
                  style={showForms ? { "--c": "#3b7dbe" } : undefined}
                  title={t("arch.forms.title")}>{showForms ? "◉" : "○"} {t("arch.forms")}</button>
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
                const gMass = glacierMassByPos ? Math.round(glacierMassByPos[pos] || 0) : 0;       // Gletscher-Eigenmasse
                const fMass = firnStackByPos ? Math.round(firnStackByPos[pos] || 0) : 0;           // #386 Boden-Reserve (firnStack)
                const isFirn = !isGlacier && fMass >= 1;                                           // Firn-Boden (Reserve, noch kein Gletscher)
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
                // Zell-Tooltip aus Bausteinen: Gebäude (+ Vorschau/Aufwertung) bzw. nur die Position, jeweils
                // ergänzt um Formations- und Struktur-Faktor.
                const formPart = inForm ? t("arch.cell.formation", { f: fmt(pf.mult) }) : "";
                const structPart = sFac > 1 ? t("arch.cell.struct", { f: fmt(sFac) }) : "";
                const title = b
                  ? t("arch.cell.building", { name: fam.name, tier: tierLabel(b.tier) })
                    + (isPending ? t("arch.cell.preview") : "") + " — " + famEff(fam, b)
                    + (upCan ? t("arch.cell.upgrade", { tier: tierLabel(b.tier + 1), eff: famEff(fam, { tier: b.tier + 1 }) }) : "")
                    + formPart + structPart
                  : t("arch.cell.pos", { pos: pos + 1 })
                    + (inForm ? t("arch.cell.formationOnly", { f: fmt(pf.mult) }) : "") + structPart;
                const inDragPrev = dragCells ? dragCells.has(pos) : false;
                const dragValid = dragPrev && dragPrev.valid;
                const isDragOrig = draggingId != null && b && b.id === draggingId;
                return (
                  <button key={pos} data-arch-pos={pos} onPointerDown={(e) => onCellDown(pos, e)}
                    className={`relative rounded-md aspect-square flex items-center justify-center ty-num${dragPrev ? "" : " transition-all"}${showCombos && !dragPrev && b && comboLit(pos) ? " arch-struct-lit" : ""}`}
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
                    {/* #eis-arch: Gletscher und Schnee unterscheiden sich hier bisher NUR am Marker — gleiches Icon,
                        eine Nummer kleiner, etwas blasser. Auf einer Bau-Zelle ist das kein Unterschied, den man sieht.
                        Die Aufstellungsphase trennt beides über die FLÄCHE (CardGrid: Schnee = zarter Blau-Wash,
                        Gletscher zusätzlich Rahmen + Schein), und genau diese Sprache kommt hier her.

                        Der Rahmen ist BEWUSST dünner und halbdurchlässig statt der 2px-Vollfarbe aus dem Aufstellboard:
                        Cyan ist auf diesem Bildschirm schon vergeben — `isInspected` malt das inspizierte Gebäude mit
                        `inset 0 0 0 2px #5ec8f0` plus kräftigem Außenschein. Ein zweiter kräftiger Cyan-Rahmen hieße
                        „inspiziert" und „Gletscher" sähen gleich aus, und der Fehler wäre schlimmer als der behobene.
                        Als eigene Ebene, nicht im `boxShadow`-Stapel der Zelle: der führt schon acht Zustände. */}
                    {(isGlacier || isFirn) && (
                      <span aria-hidden className="absolute inset-0 rounded-md pointer-events-none"
                        style={{ background: isGlacier ? "#5ec8f01f" : "#5ec8f014",
                                 boxShadow: isGlacier ? "inset 0 0 0 1.5px #5ec8f066" : undefined }} />
                    )}
                    {/* #301 C2: dauerhaft gesperrte Bau-Zelle — rote Diagonal-Schraffur (Querbalken) + Rim, KEIN Schloss. */}
                    {chLocked && (
                      <span aria-hidden className="absolute inset-0 rounded-md pointer-events-none" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 3.5px, rgba(224,85,85,0.28) 3.5px, rgba(224,85,85,0.28) 7px)", boxShadow: "inset 0 0 0 1.5px rgba(224,85,85,0.5)" }} />
                    )}
                    {/* #UI: gesperrte Fläche beim Ziehen — Diagonal-Schraffur + Rim, damit „hier nicht ablegbar" klar heraussticht. */}
                    {isBlocked && (
                      <span aria-hidden className="absolute inset-0 rounded-md pointer-events-none" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 3.5px, rgba(8,12,18,0.62) 3.5px, rgba(8,12,18,0.62) 7px)", boxShadow: "inset 0 0 0 1.5px rgba(134,153,168,0.45)" }} />
                    )}
                    {boost > 0 && <span className="absolute top-[1px] left-[3px] text-micro-2 font-extrabold" style={{ color: b ? "#fff" : "#3fb56a" }}>+{boost}</span>}
                    {/* Eis: Gletscher-Marker (Icon + Masse) bzw. Firn-Boden (dezenter ❄ + Masse) oben rechts. */}
                    {isGlacier && (
                      <span className="absolute top-[1px] right-[2px] inline-flex items-center gap-[1px] text-micro-2 ty-num leading-none z-10" style={{ color: "#8be6ff", textShadow: "0 0 3px #5ec8f0" }} title={fMass >= 1 ? t("arch.glacier.reserve", { mass: gMass, firn: fMass }) : t("cardgrid.glacierMass.title", { mass: gMass })}>
                        <FactionIcon type="ice" size={9} />
                        {gMass}
                      </span>
                    )}
                    {isFirn && (
                      <span className="absolute top-[1px] right-[2px] inline-flex items-center gap-[1px] text-micro-2 ty-num leading-none z-10" style={{ color: "#7fbfe0", opacity: 0.85 }} title={t("arch.firn.title", { n: fMass })}><FactionIcon type="ice" size={8} glow={false} />{fMass}</span>
                    )}
                    {/* #UI: keine Suit-Farbpunkte mehr — die Kartennummer selbst trägt die Farbe der Karte. */}
                    <span className="text-body-3 sm:text-body-lg-3 leading-none relative" style={{ color: inDragPrev ? "#fff" : numCol, textShadow: card.green ? `0 0 5px ${numCol}88` : ((b && !isDragOrig) ? "0 1px 2px #000a" : undefined) }}>{ev}</span>
                    {b && !isDragOrig && pos === anchorCell && (
                      <span className="absolute bottom-[1px] left-[3px] text-micro-1 font-bold leading-none" style={{ color: "rgba(255,255,255,0.92)" }}>
                        {fam.name.slice(0, 3).toUpperCase()}
                        {upCan && <span style={{ color: "#f0b429" }}>→{tierLabel(b.tier + 1)}</span>}
                      </span>
                    )}
                    {/* #UI: Stufen-Zahl (I–IV / ★) unten rechts im Gebäude, in der SELTENHEITS-Farbe — der Rahmen zeigt jetzt den Typ. */}
                    {b && !isDragOrig && pos === Math.max(...b.footprint) && (
                      <span className="absolute bottom-[1px] right-[3px] text-micro-3 font-extrabold leading-none"
                        style={{ color: fam.legendary ? GOLD : tierColor(b.tier), textShadow: "0 1px 2px #000a" }}
                        title={fam.legendary ? t("arch.legendary") : t("arch.tier", { tier: ROMAN[b.tier] })}>
                        {fam.legendary ? "★" : ROMAN[b.tier]}
                      </span>
                    )}
                    {showForms && inForm && (
                      <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 text-micro-1 font-bold leading-none whitespace-nowrap" style={{ color: fb.color, textShadow: "0 1px 2px #000a" }}>
                        {formLabels}×{fmt(pf.mult)}
                      </span>
                    )}
                    {b && pos === anchorCell && b.colorChoice && (
                      <span className="absolute bottom-[2px] right-[3px] w-[8px] h-[8px] rounded-full" title={t("arch.buffsSuit", { suit: suitLabel(b.colorChoice) })}
                        style={{ background: SUIT_COLOR[b.colorChoice], boxShadow: "0 0 0 1.5px rgba(255,255,255,0.9)" }} />
                    )}
                  </button>
                );
              }); })()}
            </div>
            {/* Legende */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-meta-3 opacity-80">
              <span className="opacity-70">{t("arch.legend.frame")}</span>
              {Object.entries(CAT).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5"><span className="w-[11px] h-[11px] rounded-[3px]" style={{ boxShadow: `inset 0 0 0 2px ${v.color}` }} />{v.label}</span>
              ))}
            </div>
            {/* Stufe/Rarität = die Zahl (I–IV / ★) in der ECKE des Gebäudes; der Rahmen zeigt den Typ. */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-meta-1 opacity-70">
              <span className="opacity-70">{t("arch.legend.tier")}</span>
              {[1, 2, 3, 4].map((t) => (
                <span key={t} className="inline-flex items-center gap-1"><b className="tabular-nums" style={{ color: tierColor(t) }}>{ROMAN[t]}</b></span>
              ))}
              <span className="inline-flex items-center gap-1"><b style={{ color: GOLD }}>★</b> {t("arch.legendary")}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-meta-1 opacity-60">
              <span>{t("arch.legend.ring")}</span>
              {["wiederholung", "farbblock", "treppe", "wechsel", "anker"].map((ft) => (
                <span key={ft}><b>{formationAbbr(ft)}</b> {formationLabel(ft)}</span>
              ))}
            </div>
          </section>

          {/* ---- Bau-Assistent + Vorschau. Mobil: `contents` löst die Gruppe auf → Phase-Panel (order-1) ÜBER dem Brett (order-2),
                 Vorschau (order-3) DRUNTER. Desktop: wieder eine flex-Spalte rechts (md:flex, md:order-2). ---- */}
          <section className="contents md:flex md:flex-col md:gap-4 md:order-2">
            {/* Bau-Assistent (Referenz + Anleitung + Farbwahl) — scrollt normal. Die Aktions-Buttons stehen in der
                schwebenden Leiste darunter (#UI „nur Buttons"). */}
            <div className="rounded-xl p-3 order-1" style={phasePanel(PHASE_ACCENTS.blue, "#0e1822")}>

              {/* Struktur-Kombis (oben): welche Gebäude-Kombinationen Boni geben — live am Board umrandet. Einklappbar (default zu). */}
              <ArchCollapse className="mb-3 rounded-lg px-2.5 py-2 text-meta-1 leading-snug" style={{ background: "#141f29", border: "1px solid #24333f" }}
                head={<span className="uppercase tracking-wide opacity-55">{t("arch.struct.head")}</span>}>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{t("arch.struct.row", { f: fmt(HAEUSERZEILE_FACTOR) })}</span>
                  <span>{t("arch.struct.col", { f: fmt(SPALTE_FACTOR) })}</span>
                  <span>{t("arch.struct.diag", { f: fmt(DIAGONALE_FACTOR) })}</span>
                  <span>{t("arch.struct.district", { pct: Math.round(DISTRICT_BONUS * 100) })}</span>
                </div>
                <div className="opacity-60 mt-1">{t("arch.struct.note")}</div>
                <div className="opacity-60 mt-1">{t("arch.struct.districtNote", { pct: Math.round(DISTRICT_BONUS * 100), cap: DISTRICT_CAP })}</div>
              </ArchCollapse>

              {/* removeFor: kein Platz → Gebäude entfernen anbieten. #235: zweistufig (erst markieren, dann bestätigen).
                  #281: MEHRFACH-Abriss — reicht ein Abriss nicht (großes Legendär), kann man weitere markieren, bis Platz reicht. */}
              {removeFor && (() => {
                const enough = !!demolishFit;
                const n = demolishIds.length;
                return (
                  <div>
                    <div className="text-body-lg-5 rounded-r-lg px-3 py-2.5 mb-2" style={{ background: "#3a1518", borderLeft: `3px solid ${enough ? "#ff6a4d" : "#d1462f"}` }}>
                      {t("arch.noRoom", { name: pendingFamName(removeFor) })}{" "}
                      {n === 0
                        ? t("arch.noRoom.mark")
                        : enough
                          ? t("arch.noRoom.enough", { count: n })
                          : t("arch.noRoom.more")}
                    </div>
                    {/* #281: alle Gebäude als Umschalter — markieren/entmarkieren; „reicht allein" = ein Abriss würde genügen. */}
                    <div className="flex flex-col gap-1 mb-2">
                      {committed.map((b) => {
                        const bf = familyDef(b.familyId);
                        if (!bf) return null;
                        const marked = demolishIds.includes(b.id);
                        const soloOk = replaceableSet.has(b.id);
                        return (
                          /* #kante: Abriss-Liste — zum Abriss markierte Gebäude tragen die rote Kante samt
                             Schein, die übrigen bleiben neutral. */
                          <button key={b.id} onClick={() => setDemolishIds((cur) => cur.includes(b.id) ? cur.filter((x) => x !== b.id) : [...cur, b.id])}
                            className={`as-edge-card as-edge-thin${marked ? " is-sel" : ""} rounded-lg px-2.5 py-1.5 text-left text-meta-3 leading-snug transition-all hover:brightness-110`}
                            style={{ "--c": marked ? "#d1462f" : "#3a4a58" }}>
                            <span className="inline-flex items-center gap-1.5 align-middle flex-wrap">
                              <FormIcon form={bf.form} color={bf.legendary ? "#d4a63a" : CAT[bf.category].color} title={`${bf.name} · ${bf.form}`} />
                              <b>{bf.name}</b>
                              <span className="opacity-55">{bf.legendary ? t("arch.legendaryCap") : t("arch.tier", { tier: tierLabel(b.tier) })}</span>
                              {marked ? <span style={{ color: "#ff8a6d" }}>{t("arch.marked")}</span> : (soloOk && <span className="opacity-45">{t("arch.soloEnough")}</span>)}
                            </span>
                            <span className="opacity-75"> — {famEff(bf, b)}</span>
                          </button>
                        );
                      })}
                    </div>
                    {n > 0 && <div className="text-meta-1 opacity-55 mb-2">{t("arch.demolish.warn")}</div>}
                    <div className="flex gap-2">
                      {/* #kante: Zurück neutral, Abreißen als roter Kanten-Knopf — destruktiv, aber hier ist es
                          die gewollte Aktion, also volle Kante statt der leisen Fassung. */}
                      <button onClick={() => { setRemoveFor(null); setDemolishIds([]); }}
                        className="as-edge-neutral as-edge-thin flex-1 rounded-lg py-1.5 text-body-5 font-bold">{t("arch.back")}</button>
                      <button onClick={confirmDemolish} disabled={!enough}
                        className={`${enough ? "as-edge-strong" : "as-edge-neutral"} as-edge-thin flex-1 rounded-lg py-1.5 text-body-5 font-bold`}
                        style={{ ...(enough ? { "--c": "#d1462f" } : null), opacity: enough ? 1 : 0.6, cursor: enough ? "pointer" : "not-allowed" }}>
                        {n > 0 ? t("arch.demolish.n", { n }) : t("arch.demolish")}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* #261: Auswahl im Perk-Stil — 3 Baupläne + „Aufwerten" als 4. Karte, alle vier NEBENEINANDER (kompakt).
                  Die Wahl ist verbindlich: chooseOffer baut sofort und geht in die Verschiebe-Phase (kein Zurück).
                  #361-Folge: Sobald die Hauptaktion verbraucht ist (gebaut/aufgewertet), ist das Bauplan-Fenster WEG —
                  es bliebe sonst nur ein totes Auswahlfenster (Bauen/Aufwerten sind dann ohnehin gesperrt). */}
              {!removeFor && phase === "choose" && !architect.actedMain && (
                <div>
                  <div className="text-body-lg-5 font-semibold mb-2">{t("arch.choose.head")}</div>
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
                        /* #kante: Angebotskarte in der Familie — die Stufenfarbe (Rarität) sitzt an der Kante
                           statt als 1,5-px-Vollrahmen mit Glow rundum. Verbrauchte Angebote sind `is-locked`
                           statt eigener opacity. Der Grund bleibt Petrol (--edge-bg am Container). */
                        <button key={idx} onClick={() => chooseOffer(o)} disabled={o.used}
                          className={`as-edge-card as-edge-thin${o.used ? " is-locked" : ""} rounded-lg p-2 text-left flex flex-col gap-1.5 transition-all hover:brightness-110`}
                          style={{ "--c": tierCol, cursor: o.used ? "not-allowed" : "pointer" }}>
                          <div className="flex items-center justify-between gap-1">
                            <div className="p-1 rounded" style={{ background: "#0e1822" }}><MiniShape form={fam.form} color={cat.color} /></div>
                            <span className="text-micro-3 font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{ background: `${tierCol}22`, color: tierCol, border: `1px solid ${tierCol}66` }}>
                              {o.legendary ? "★" : tierLabel(o.tier)}
                            </span>
                          </div>
                          <div className="text-body-3 font-bold flex items-center gap-1 leading-tight">
                            <span className="w-[9px] h-[9px] rounded-full inline-block shrink-0" style={{ background: cat.color }} />{fam.name}
                          </div>
                          <div className="text-meta-1 opacity-60 leading-snug">{famEff(fam, { tier: o.tier })}</div>
                          {!rotatableForm(fam.form) && <span className="self-start text-micro-3 px-1.5 py-0.5 rounded" style={{ color: "#8a97a5", background: "#1a2732", border: "1px solid #2b3e4d" }} title={t("arch.noRotate.title")}>{t("arch.noRotate")}</span>}
                          {noRoom && !o.used && <span className="text-micro-3" style={{ color: "#e0705a" }}>{t("arch.noRoom.replace")}</span>}
                        </button>
                      );
                    })}
                    {/* 4. Karte: Aufwerten */}
                    {/* Runde 2, R14 (Owner): die gestrichelte `is-soon`-Kante las sich als „ausgegraut",
                        obwohl Aufwerten möglich war. Aktiv trägt die Karte jetzt die normale Angebots-
                        Optik; gedimmt (gestrichelt + is-locked) NUR, wenn wirklich nichts aufwertbar ist. */}
                    <button onClick={() => { if (canUpgradeAny) { setUpgradeMsg(null); setPendingUpgrade(null); setPhase("upgrade"); } }} disabled={!canUpgradeAny}
                      className={`as-edge-card as-edge-thin${canUpgradeAny ? "" : " is-soon is-locked"} rounded-lg p-2 text-left flex flex-col gap-1.5 transition-all hover:brightness-110`}
                      style={{ "--c": CAT.value.color, cursor: canUpgradeAny ? "pointer" : "not-allowed" }}>
                      <div className="text-title-5 leading-none">⬆</div>
                      <div className="text-body-3 font-bold leading-tight">{t("arch.upgrade")}</div>
                      <div className="text-meta-1 opacity-60 leading-snug">{t("arch.upgrade.sub")}{canUpgradeAny ? "" : t("arch.upgrade.none")}</div>
                    </button>
                  </div>
                  )}
                  {/* #263: Bauplan-Angebot neu würfeln — eigener Gebäude-Reroll-Pool (rerollsArch). Im Dev-Modus entfällt Reroll (Voll-Katalog). */}
                  {!state.devMode && onReroll && (state.rerollsArch || 0) > 0 && (
                    <button onClick={onReroll} className="w-full mt-2 rounded-lg py-2 text-body-5 font-bold transition-all hover:brightness-110"
                      style={{ background: "#16232f", border: `1px solid ${CAT.value.color}66`, color: CAT.value.color }}>
                      {t("arch.reroll", { n: state.rerollsArch })}
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
                        <div className="text-body-lg-5 font-semibold flex items-center gap-1.5 flex-wrap">
                          <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: CAT[uf.category].color }} />
                          {uf.name}
                          <span className="ty-num-sm" style={{ color: "#f0b429" }}>{t("arch.tierArrow", { from: tierLabel(up.tier), to: tierLabel(up.tier + 1) })}</span>
                        </div>
                        <div className="mt-1.5 grid gap-1 text-meta-3 leading-snug">
                          <div className="rounded px-2 py-1" style={{ background: "#16232f", border: "1px solid #24333f" }}>
                            <span className="opacity-55">{t("arch.now")}</span> {famEff(uf, up)}
                          </div>
                          <div className="rounded px-2 py-1" style={{ background: "#15291a", border: "1px solid #2f6d3a" }}>
                            <span className="opacity-55">{t("arch.after")}</span> <span style={{ color: "#8fe0a0" }}>{famEff(uf, { tier: up.tier + 1 })}</span>
                          </div>
                        </div>
                        <div className="text-meta-3 opacity-60 mt-1.5">{t("arch.upgrade.confirmHint")}</div>
                      </div>
                    ) : (
                      <>
                        <ArchCollapse className="text-body-lg-5 rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.value.color}18`, borderLeft: `3px solid ${CAT.value.color}` }}
                          head={<b>{t("arch.upgrade")}</b>}>
                          <div className="opacity-85 leading-snug">{t("arch.upgrade.help")}</div>
                        </ArchCollapse>
                        {upgradeMsg && (
                          <div className="text-body-5 rounded-r-lg px-3 py-2 mb-1" style={{ background: "#3a2a15", borderLeft: "3px solid #d0902f", color: "#f0d9a8" }}>
                            <b>„{upgradeMsg.name}"</b> — {t(UPGRADE_REASON[upgradeMsg.reason] || "arch.upgrade.reason.generic")}.
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
                                  className="rounded px-2 py-1.5 text-left text-meta-1 leading-snug flex flex-wrap items-baseline gap-x-1.5 transition-all hover:brightness-125"
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
                    <div className="text-body-lg-5 rounded-r-lg px-3 py-2.5 mb-2 flex items-center gap-1.5 flex-wrap" style={{ background: "#15291a", borderLeft: "3px solid #f0b429", color: "#d7f0c8" }}>
                      <span aria-hidden="true">⬆</span> <b>„{upgradeDone.name}"</b> {t("arch.upgraded")}
                      <span className="ty-num-sm" style={{ color: "#f0b429" }}>{t("arch.tierArrow", { from: tierLabel(upgradeDone.from), to: tierLabel(upgradeDone.to) })}</span>
                    </div>
                  )}
                  {/* #UI: Die Farbauswahl (colorLocked-Gebäude) liegt jetzt direkt über dem Brett, nicht mehr hier. */}
                  <ArchCollapse className="text-body-lg-5 rounded-r-lg px-3 py-2.5 mb-2" style={{ background: `${CAT.value.color}18`, borderLeft: `3px solid ${CAT.value.color}` }}
                    head={<b>{t("arch.place.head")}</b>}>
                    <div className="opacity-85 leading-snug">{t("arch.place.help")}</div>
                  </ArchCollapse>
                </div>
              )}
            </div>

            {/* #UI „nur Buttons": schmale, schwebende Aktions-Leiste (mobil oben angeheftet) — nur die Phasen-Buttons,
                damit sie beim Ziehen am Brett erreichbar bleiben. Anleitung/Referenz/Farbwahl bleiben im Panel drüber.
                Desktop: normale Leiste (md:static). */}
            <div ref={stickyBarRef} className="order-1 sticky top-0 z-20 md:static rounded-xl p-2 -mt-2 md:mt-0" style={{ background: "#0e1822", border: "1px solid #20303d", boxShadow: "0 6px 16px #0006" }}>
              {/* #248/#UI: Rotieren in der schwebenden Leiste. In der Verschiebe-Phase steht „Drehen" KOMPAKT neben
                  „Bestätigen" (unten) — kein voll-breiter Balken mehr. Außerhalb (place) bleibt es die eigene Zeile. */}
              {showRotate && phase !== "move" && (selRotatable ? (
                <button onClick={rotateSelected} className="w-full mb-2 rounded-lg py-2 text-body-lg-5 font-bold" style={{ background: "#1a2a37", border: `1px solid ${CAT.value.color}` }}>{t("arch.rotate")}</button>
              ) : (
                <button type="button" disabled aria-disabled="true"
                  title={t("arch.noRotate.title")}
                  className="w-full mb-2 rounded-lg py-2 text-body-lg-5 font-bold cursor-not-allowed"
                  style={{ background: "#141c24", border: "1px solid #2b3e4d", color: "#5a6672", opacity: 0.55 }}>{t("arch.noRotate.big")}</button>
              ))}
              {/* #266: „kein Platz zum Drehen" — ehrliches Feedback statt eines wirkungslosen Buttons am vollen Brettrand. */}
              {showRotate && rotateMsg && (
                <div className="mb-2 rounded-lg px-2.5 py-1.5 text-meta-3 leading-snug" style={{ background: "#3a1518", border: "1px solid #d1462f", color: "#e0705a" }}>
                  ⟳ {rotateMsg}
                </div>
              )}
              {/* #361: „↶ Rückgängig" + „Zurücksetzen" — identische Beschriftung/Look wie die Aufstellungsphase
                  (FormationPhase). Im Haupt-Fluss (choose/move) über den Phasen-Buttons; NICHT mit der bestehenden
                  „← Zurück"-Sub-Navigation (Upgrade/Ersetzen) vermengen. Aktiv, sobald in dieser Phase etwas geschah. */}
              {!removeFor && (phase === "choose" || phase === "move") && (
                <div className="flex gap-2 mb-2">
                  {/* #kante: Diese Leiste trug bis zuletzt das Menü-Grau (#20202a) mitten in der Petrol-Welt —
                      sie sitzt weit weg vom Rest der Datei und war beim ersten Durchgang durchgerutscht.
                      Als Kanten-Knöpfe erben sie den Grund des Architekten automatisch. */}
                  <button onClick={doArchUndo} disabled={!canArchUndo} className="as-edge-neutral as-edge-thin flex-1 px-3 py-2 rounded-lg text-body-lg-5 font-bold whitespace-nowrap"
                    style={{ opacity: canArchUndo ? 1 : 0.4, cursor: canArchUndo ? "pointer" : "default" }}>{t("arch.undo")}</button>
                  <button onClick={doArchReset} disabled={!canArchUndo} className="as-edge-neutral as-edge-thin flex-1 px-3 py-2 rounded-lg text-body-lg-5 whitespace-nowrap"
                    style={{ opacity: canArchUndo ? 1 : 0.4, cursor: canArchUndo ? "pointer" : "default" }}>{t("arch.reset")}</button>
                </div>
              )}
              {removeFor ? (
                <button onClick={() => { setRemoveFor(null); setDemolishIds([]); }} className="as-edge-neutral as-edge-thin w-full rounded-lg py-2 text-body-5 font-bold">{t("arch.otherPlan")}</button>
              ) : phase === "choose" ? (
                // #279: Umstellen muss auch möglich sein, wenn nichts (mehr) baubar ist. Sobald Gebäude stehen,
                // führt „Gebäude umstellen" in die Verschiebe-Phase (dort ziehen/drehen, dann „Bestätigen").
                committed.length > 0 ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setInspectId(null); setSelId(null); setPhase("move"); }} className="flex-1 rounded-lg py-2 text-body-5 font-bold" style={{ background: `${CAT.value.color}22`, border: `1px solid ${CAT.value.color}`, color: "#cfe3f5" }}>{t("arch.rearrange")}</button>
                    <button onClick={() => onDone?.()} className="flex-1 rounded-lg py-2 text-body-5 font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>{t("arch.buildNothing")}</button>
                  </div>
                ) : (
                  <button onClick={() => onDone?.()} className="w-full rounded-lg py-2 text-body-5 font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>{t("arch.buildNothing")}</button>
                )
              ) : phase === "upgrade" && pendingUpgrade != null ? (
                <div className="flex gap-2">
                  <button onClick={() => setPendingUpgrade(null)} className="flex-1 rounded-lg py-2 text-body-5 font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>{t("arch.cancel")}</button>
                  <button onClick={confirmUpgrade} className="flex-1 rounded-lg py-2 text-body-lg-5 font-bold" style={{ background: "#f0b429", color: "#141419" }}>{t("arch.upgrade.confirm")}</button>
                </div>
              ) : phase === "upgrade" ? (
                <button onClick={() => { setUpgradeMsg(null); setPendingUpgrade(null); setPhase("choose"); }} className="w-full rounded-lg py-2 text-body-5 font-bold" style={{ background: "#16232f", border: "1px solid #2b3e4d" }}>{t("arch.back")}</button>
              ) : phase === "move" ? (
                <div className="flex flex-wrap gap-2">
                  {/* Drehen kompakt (nur wenn ein Gebäude gewählt ist); Bestätigen bleibt der prominente Knopf. */}
                  {showRotate && (selRotatable ? (
                    <button onClick={rotateSelected} className="shrink-0 px-3.5 rounded-lg py-2 text-body-lg-5 font-bold" style={{ background: "#1a2a37", border: `1px solid ${CAT.value.color}` }}>{t("arch.rotate")}</button>
                  ) : (
                    <button type="button" disabled aria-disabled="true" title={t("arch.noRotate.title")}
                      className="shrink-0 px-3 rounded-lg py-2 text-body-lg-5 font-bold cursor-not-allowed" style={{ background: "#141c24", border: "1px solid #2b3e4d", color: "#5a6672", opacity: 0.55 }}>{t("arch.noRotate")}</button>
                  ))}
                  <button onClick={() => onDone?.()} className="flex-1 basis-[170px] rounded-lg py-2 text-body-lg-5 font-bold" style={{ background: CAT.value.color, color: "#fff" }}>{t("arch.confirmStart")}</button>
                </div>
              ) : null}
              {/* #UI: Effekt des gerade platzierten (place) bzw. gewählten (move) Gebäudes — floatet mit der Leiste. */}
              {(() => {
                const eb = phase === "place" && pending ? pending : phase === "move" && selId ? buildings.find((x) => x.id === selId) : null;
                const efam = eb ? familyDef(eb.familyId) : null;
                if (!efam) return null;
                return (
                  // #UI: Effekt-Readout mit typ-farbigem Rahmen (Kategorie-Farbe = die Typ-Farbe, die vorher der Gebäude-Hintergrund trug).
                  <div className="mt-2 rounded-lg px-2.5 py-1.5 text-meta-3 leading-snug"
                    style={{ border: `1px solid ${CAT[efam.category].color}`, background: `${CAT[efam.category].color}12` }}>
                    <span className="inline-flex items-center gap-1.5 align-middle">
                      <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: CAT[efam.category].color }} />
                      <b>{efam.name}</b>
                      <span className="opacity-55">{efam.legendary ? t("arch.legendaryCap") : t("arch.tier", { tier: tierLabel(eb.tier) })}</span>
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
                <div className="text-meta-3 uppercase tracking-wide opacity-60 mb-0.5">{t("arch.yourBuildings", { n: committed.length })}</div>
                <div className="text-meta-1 opacity-45 mb-2">{t("archpanels.tapHint")}</div>
                <div className="flex flex-col gap-1">
                  {committed.map((b) => {
                    const f = familyDef(b.familyId); if (!f) return null;
                    const on = inspectId === b.id;
                    return (
                      <button key={b.id} id={`arch-inspect-${b.id}`} onClick={() => setInspectId(on ? null : b.id)}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-meta-3 leading-snug flex flex-col gap-0.5 transition-all"
                        style={{ background: on ? "#12313f" : "#16232f", border: `1px solid ${on ? "#5ec8f0" : "#24333f"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="w-[8px] h-[8px] rounded-full inline-block" style={{ background: f.legendary ? GOLD : CAT[f.category].color }} />
                          <b>{f.name}</b>
                          <span className="opacity-55">{f.legendary ? t("arch.legendaryCap") : t("arch.tier", { tier: tierLabel(b.tier) })}</span>
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
              <div className="text-meta-3 uppercase tracking-wide opacity-60 mb-2">{t("arch.preview.head")}</div>
              {dragPrev && (() => {
                const ok = dragPrev.valid && dragPrev.footprint.length > 0;
                return (
                  <div className="mb-2 rounded-lg px-2.5 py-1.5 text-meta-3 flex items-center gap-3 flex-wrap"
                    style={{ background: ok ? "#15351f" : "#3a1518", border: `1px solid ${ok ? "#2f9d55" : "#d1462f"}` }}>
                    <span className="font-bold" style={{ color: ok ? "#5fce86" : "#e0705a" }}>{t(ok ? "arch.preview.ok" : "arch.preview.bad")}</span>
                    {ok && dragDelta && <>
                      <span>{t("arch.sumValue")} <b style={{ color: dragDelta.dVal >= 0 ? "#5fce86" : "#e0705a" }}>{dragDelta.dVal >= 0 ? "+" : ""}{dragDelta.dVal}</b></span>
                      <span>{t("arch.forms")} <b style={{ color: dragDelta.dForm >= 0 ? "#5fce86" : "#e0705a" }}>{dragDelta.dForm >= 0 ? "+" : ""}{dragDelta.dForm}</b></span>
                    </>}
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-2">
                <Stat k={t("arch.stat.struct")} v={t("arch.pct", { pct: structBonusPct })} hero />
                <Stat k={t("arch.stat.sumValue")} v={sumValue} hero />
                <Stat k={t("arch.stat.plotUsed")} v={`${Math.round(coverCount / maxCover * 100)}%`} />
                <Stat k={t("arch.stat.rows")} v={houseRows} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-body-1 opacity-80">
                <span>{t("arch.buildingCount", { n: committed.length })}</span>
                {Object.entries(CAT).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5"><span className="w-[9px] h-[9px] rounded-full" style={{ background: v.color }} />{v.label} <b>{catCount[k]}</b></span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  ));
}

// Name eines Bauplan-Angebots (für die „kein Platz"-Meldung).
function pendingFamName(o) { const f = familyDef(o.familyId); return f ? f.name : t("arch.planFallback"); }

// Kleine Stat-Kachel.
function Stat({ k, v, hero = false }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: hero ? `${CAT.value.color}12` : "#16232f", border: `1px solid ${hero ? CAT.value.color + "4d" : "#20303d"}` }}>
      <div className="text-meta-1 uppercase tracking-wide opacity-55">{k}</div>
      <div className="text-title-6 ty-num mt-0.5">{v}</div>
    </div>
  );
}

// Spielersicht-Kurzbeschreibung eines Bauplans/Gebäudes. Der Wortlaut liegt seit der Sprachprüfung (A13)
// in src/game/architect.js — dieselbe Quelle bedienen auch die Kartendetail-Anzeige (ui/archEffects.js)
// und der Core-DB-Generator (scripts/gen-db.mjs). Vorher waren es drei auseinandergelaufene Fassungen.
const famEff = (fam, b) => buildingEffect(fam, b?.tier ?? 1);

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
      <div className="text-meta-3 opacity-55">{t("arch.dev.catalog")}</div>
      {ARCH_CAT_ORDER.filter((c) => byCat[c]).map((c) => {
        const meta = CAT[c] || { label: c, color: "#8a97a5" };
        const fids = Object.keys(byCat[c]);
        const open = openCat === c;
        return (
          <div key={c} className="flex flex-col gap-1.5">
            <button onClick={() => setOpenCat(open ? null : c)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-body-lg-5 font-bold"
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
                          <span className="font-semibold text-body-lg-5" style={{ color: meta.color }}>{fam.name}</span>
                          {repDesc && <span className="text-meta-3 opacity-60 leading-snug">{repDesc}</span>}
                        </span>
                        <span className="text-meta-3 opacity-50 shrink-0 mt-0.5 whitespace-nowrap">{fo ? "▲" : "▼"} {t("arch.tierWord")}</span>
                      </button>
                      {fo && (
                        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                          {os.map((o) => {
                            const col = o.legendary ? GOLD : tierColor(o.tier);
                            return (
                              <button key={String(o.tier)} onClick={() => onChoose(o)} disabled={o.used}
                                title={famEff(fam, { tier: o.tier })}
                                className="px-2.5 py-1 rounded text-body-5 font-bold transition-all hover:-translate-y-0.5"
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
        className="self-start mt-1 px-3 py-1.5 rounded-lg text-body-5 font-bold transition-all"
        style={{ background: "#13202b", border: `1px dashed ${CAT.value.color}66`, color: CAT.value.color, opacity: canUpgradeAny ? 1 : 0.4 }}>
        {t("arch.upgrade.big")}{canUpgradeAny ? "" : t("arch.upgrade.none")}
      </button>
    </div>
  );
}
