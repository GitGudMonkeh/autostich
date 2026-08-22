import { memo, useRef, useState, useLayoutEffect } from "react";
import { suitColor, PLANT_VALUE_CAP } from "../game/constants.js";

import { SEGMENT_SIZE } from "../game/formations.js";
import { anchorTypeAt, linkedPartnerOf } from "../game/shop.js";
import { formationBorder } from "./formationStyle.js";
import { formationAbbr } from "./formationLabels.js";
import { PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";
import { glacierFormations } from "../game/glacier.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon (Eis ersetzt glacier.webp)
import { familyDef, perkDef, anchorLabel } from "../i18n/labels.js"; // #sprache: Perks/Anker zur Anzeigezeit
import { t } from "../i18n/index.js";

// #350: stabile Leer-Referenz für rollenlose Karten (Normalfall) — `|| []` erzeugte je Render ein neues Array und
//   ließ den React.memo-Vergleich von CardTile für fast alle Kacheln fehlschlagen (Memo praktisch wirkungslos).
const EMPTY_ROLES = [];

// Anker-Typ → Kurzlabel (Tooltip); gleiche Bedeutung wie in ChronikOverview (#119).
const fmt = (x) => x.toFixed(2).replace(".", ",");

// #UI: Architekt-Overlay als EIN durchgezogener Rahmen in GEBÄUDE-FORM (statt Kästen um jede Karte). Aus den gemessenen
// Zell-Rechtecken (`cells`: pos → {left,top,right,bottom} relativ zum Grid) werden je Gebäude nur die PERIMETER-Kanten
// als Liniensegmente erzeugt: eine Kante gehört zur Kontur, wenn der Nachbar dahinter NICHT zum selben Gebäude (bid)
// gehört. Die Rechtecke werden um exH/exV (halbe Raster-Lücke) geweitet → die Kanten benachbarter Gebäudezellen
// treffen sich EXAKT in der Lückenmitte und die Kontur läuft über die Lücken hinweg durch. Rein & unit-testbar.
// exVOut: separater AUSSEN-Outset oben/unten (Default = exV). Kleiner gewählt zieht die waagerechten Außenbanden
// näher an die Karten, damit sie nicht auf den „Grenze offen"-Text in der Zeilenmitte fallen. Innere Nähte bleiben
// bei der halben gemessenen Lücke (halfV) → Kontur schließt weiter lückenlos über die Segmentgrenze.
export function archFrameLines(cover, cells, total, exH, exV, exVOut = exV) {
  const lines = [];
  if (!cover || !cells) return lines;
  for (const key of Object.keys(cover)) {
    const pos = Number(key);
    const a = cover[pos];
    const rect = cells[pos];
    if (!a || !rect) continue;
    const col = pos % SEGMENT_SIZE;
    const same = (p, exists) => exists && cover[p] && cover[p].bid != null && cover[p].bid === a.bid;
    const color = a.legendary ? "#c8962f" : a.color;
    const up = pos - SEGMENT_SIZE, down = pos + SEGMENT_SIZE, lft = pos - 1, rgt = pos + 1;
    const sameUp = same(up, up >= 0), sameDown = same(down, down < total);
    const sameLeft = same(lft, col > 0), sameRight = same(rgt, col < SEGMENT_SIZE - 1);
    // #255: Kanten-Ausdehnung PRO NAHT. An einer INNEREN Naht (Nachbarzelle = dasselbe Gebäude) bis zur halben
    // TATSÄCHLICH gemessenen Lücke ausdehnen — so schließt die Kontur auch über eine geöffnete, durch die
    // SegmentBridge VERBREITERTE Segmentgrenze lückenlos. An Außenkanten die halbe Nominal-Lücke (exH/exV).
    const halfV = (p) => { const r = cells[p]; return r ? Math.max(0, (p < pos ? rect.top - r.bottom : r.top - rect.bottom) / 2) : exV; };
    const halfH = (p) => { const r = cells[p]; return r ? Math.max(0, (p < pos ? rect.left - r.right : r.left - rect.right) / 2) : exH; };
    // #UI: An einer REENTRANTEN Ecke (ein Diagonal-Nachbar ist dasselbe Gebäude, der direkte H/V-Nachbar aber nicht —
    // z. B. die Innenkerbe eines L/T/S/Plus) muss die AUSSEN-Kante bis zur Nahtmitte (halfV) reichen, damit ihr Ende
    // die bis zur Nahtmitte laufende Seitenkante der Diagonalzelle trifft. Sonst blieb dort eine 2px-Lücke (Ecke „offen").
    // Ohne Reentranz weiter das enge exVOut, damit die waagerechten Außenbanden nicht in den „Grenze offen"-Text reichen.
    const reentUp   = !sameUp   && (same(up - 1,   up >= 0 && col > 0) || same(up + 1,   up >= 0 && col < SEGMENT_SIZE - 1));
    const reentDown = !sameDown && (same(down - 1, down < total && col > 0) || same(down + 1, down < total && col < SEGMENT_SIZE - 1));
    const exUp = sameUp ? halfV(up) : (reentUp ? halfV(up) : exVOut), exDown = sameDown ? halfV(down) : (reentDown ? halfV(down) : exVOut);
    const exLeft = sameLeft ? halfH(lft) : exH, exRight = sameRight ? halfH(rgt) : exH;
    const L = rect.left - exLeft, R = rect.right + exRight, T = rect.top - exUp, B = rect.bottom + exDown;
    if (!sameUp)    lines.push({ x1: L, y1: T, x2: R, y2: T, color, bid: a.bid }); // oben
    if (!sameDown)  lines.push({ x1: L, y1: B, x2: R, y2: B, color, bid: a.bid }); // unten
    if (!sameLeft)  lines.push({ x1: L, y1: T, x2: L, y2: B, color, bid: a.bid }); // links
    if (!sameRight) lines.push({ x1: R, y1: T, x2: R, y2: B, color, bid: a.bid }); // rechts
  }
  return lines;
}

/* Eine Kachel der 40-Karten-Übersicht (geteilt von Formationsphase, Chronik, Perk-Zielauswahl & Shop, Issue #101/#112).
   Kompakt auf Desktop: flachere Ratio (sm:aspect-square) + kleinere Zahl. Auf Mobil unverändert (aspect-[3/4], text-lg).
   Zeigt Rahmen-Tier, ×mult, Formations-Kürzel, Rolle-●, Ionisierung, Frost.
   Auswahl-Zustände (#112): `selected` = weiß (Tausch/Detail) · `picked` = gold ✓ (Mehrfach-/Positionsauswahl) ·
   `arrow` = Farbpfeil „→X" (Shop-Farbwechsel) · `disabled` = ausgegraut, nicht klickbar (z. B. belegte Anker). */
// #259: eine von bis zu 40 Grid-Kacheln → React.memo überspringt Re-Render bei unveränderten Props (bes. in
// read-only Grids wie Chronik/Vorschau, wo onClick fehlt und posForm stabil bleibt).
const CardTile = memo(function CardTile({ card, pos, posForm, roleIds = [], selected, onClick, anchorType = null, allyColor = null,
                   picked = false, disabled = false, arrow = null, quiet = false, ring = false, ringTitle = null, dimmed = false, arch = null, structLit = false, distrLit = false, formFlash = false,
                   quietFrames = false,
                   glacier = false, glacierMass = 0, firnMass = 0, glacierForm = false, locked = false }) {
  const pf = posForm || { mult: 1, formations: [] };
  const inForm = pf.mult > 1;
  const col = suitColor(card.suit);
  // Pflanze (#211): reife (grüne) Karte → Zahl leuchtet grün (voll ausgewachsen am hellsten). Wichtig als
  // Farbblock-Planungssignal in der Aufstellung; heller als die Grün-Suit (#5ab87a) + 🌿 im Status-Cluster
  // machen eine reife Grün-Karte trotz gleicher Grundfarbe erkennbar.
  const ripe = !!card.green;
  const numCol = ripe ? (card.value >= PLANT_VALUE_CAP ? PLANT_FULL : PLANT_RIPE) : col;
  const labels = [...new Set((pf.formations || []).map((f) => formationAbbr(f.type)))].join("");
  const fb = formationBorder(pf);
  // Eis-Neudesign: Firn-Boden = ungefrorenes Feld mit angesammelter Boden-Reserve (#386 firnStack, noch kein Gletscher).
  // Dezent (nur leichter Blau-Schimmer + ❄-Marker), klar abgesetzt vom echten Gletscher (Cyan-Rahmen/Glow/Icon).
  const firn = !glacier && firnMass >= 0.5;
  // #112: „picked" (gold) hat Vorrang vor „selected" (weiß) vor Gletscher-Cyan vor Formations-/Farbrand.
  const borderColor = picked ? "#d4a63a" : selected ? "#ffffff" : glacier ? "#5ec8f0" : fb.color || col + "55";
  const borderStyle = fb.dashed && !selected && !picked ? "dashed" : "solid";
  // Rollen-Label: flacher Perk (PERK_DEFS) ODER Familie (FAMILY_DEFS, Rarität #167 Kat. C) → sonst die rohe id.
  const roleTitle = roleIds.length ? roleIds.map((p) => perkDef(p)?.label || familyDef(p)?.name || p).join(", ") : undefined;
  // #119: belegte Position (Shop-Anker) → dicker silberner AUSSENring via Outline+Offset — separat vom
  // inneren Auswahl-/Formationsrahmen und dessen Glow, damit beide gleichzeitig lesbar bleiben.
  // #182: `ring` markiert Positionen ohne Anker mit demselben Silberring (z. B. die von Zeitraffer/L11 gekoppelten 20 & 40).
  const anchorRing = (anchorType || ring) ? { outline: "2.5px solid #cdd6e0", outlineOffset: "2px" } : null;
  // Architekt-Gebäude-Overlay (#202/#UI): der RAHMEN in Gebäude-Form wird jetzt als durchgezogene SVG-Kontur ÜBER dem
  // Grid gezeichnet (CardGrid, archFrameLines) — nicht mehr als Kasten je Karte. Die Kachel selbst bekommt nur noch
  // einen sehr dezenten Kategorie-Farbwash, damit man abgedeckte Zellen auch als Fläche erkennt (Legendär = Gold).
  const archShadow = arch ? `inset 0 0 0 9999px ${(arch.legendary ? "#c8962f" : arch.color)}1f` : null;
  // #UI: Distrikt-Bonus (gleiche Kategorie aneinander) → Kachel glüht in ihrer Typ-Farbe (etwas kräftig), analog zum
  // Architekt-Screen. Der rote Struktur-Kombi-Wash (arch-struct-lit) bleibt davon getrennt.
  const distrShadow = distrLit && arch ? `0 0 16px 2px ${arch.color}cc, inset 0 0 9px ${arch.color}66, inset 0 0 0 1px ${arch.color}` : null;
  // F4 Farballianz (#125): diagonaler Zweifarben-Split auch in der Grid-Kachel (obere Hälfte Eigen-, untere Partnerfarbe).
  const tileBg = allyColor
    ? `linear-gradient(135deg, ${col}30 0%, ${col}30 49%, ${allyColor}30 51%, ${allyColor}30 100%), #20202a`
    : "#20202a";
  return (
    <button onClick={onClick} disabled={disabled} data-sfx={quiet ? "none" : undefined} data-pos={arch ? pos : undefined}
      title={anchorType ? t("cardgrid.anchor.title", { type: anchorLabel(anchorType) }) : ring ? (ringTitle || undefined) : undefined}
      className={`as-tile relative rounded-lg flex flex-col items-center justify-center transition-all${structLit ? " arch-struct-lit" : ""}`}
      /* #wing-ruhe: `quietFrames` ist die Fassung für den linken Flügel der Level-up-Karte. Dort stehen
         40 Kacheln auf 356 px Breite; 2-px-Rahmen plus ein Formations-Schein je Kachel sind dann keine
         Auszeichnung mehr, sondern eine Flimmerfläche. Der Rahmen wird dünner UND der FORMATIONS-Schein
         fällt weg — die ZUSTANDS-Scheine (gewählt · getippt · Gletscher · Gebäude) bleiben, sie sind
         selten und genau das, was man dort sucht. Auf dem Brett ändert sich nichts (Default false). */
      style={{ background: tileBg, border: `${quietFrames ? 1 : 2}px ${borderStyle} ${borderColor}`,
               // #201.4: getauschte Karte dezent ausgrauen (rein kosmetisch, bleibt klickbar). Eis-Neudesign: Gletscher
               // ebenso ausgrauen → Signal „starr, nicht tauschbar". picked(gold)/selected(weiß) haben Vorrang; disabled (0,45) sticht durch.
               opacity: disabled ? 0.45 : ((dimmed || glacier) && !selected && !picked ? 0.55 : 1), cursor: !onClick ? "default" : (disabled ? "not-allowed" : "pointer"),
               ...(anchorRing || {}),
               boxShadow: [picked ? "0 0 10px #d4a63a66" : selected ? "0 0 10px #ffffff66" : glacier ? "0 0 8px #5ec8f066" : (fb.color && !fb.dashed && !quietFrames) ? `0 0 8px ${fb.color}55` : null, firn ? "inset 0 0 0 9999px #5ec8f014" : null, distrShadow, archShadow].filter(Boolean).join(", ") || undefined }}>
      <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
      {/* #301 C3: fixierte Aufstell-Zelle — rote Diagonal-Schraffur (Querbalken) + Rim, KEIN Schloss (wie beim Architekten). */}
      {locked && (
        <span aria-hidden className="absolute inset-0 rounded-lg pointer-events-none z-10" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 3.5px, rgba(224,85,85,0.26) 3.5px, rgba(224,85,85,0.26) 7px)", boxShadow: "inset 0 0 0 1.5px rgba(224,85,85,0.5)" }} />
      )}
      {/* Architekt-Gebäude-Badge (#202/#224.7): nur der echte Wert-Boost „+X" mittig an der oberen Kante (kein Icon mehr —
          die Kategorie liest man am Rahmen/Ring + Tooltip). Nur bei value-Gebäuden (boost > 0); score/formation zeigt nur den Ring.
          #UI: Badge-Farbe = die Karten-Farbe, für die das Gebäude den Wert-Bonus gibt (arch.badgeSuit); farblos → grau (#888). */}
      {arch && arch.boost > 0 && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold leading-none px-1 rounded-b-[3px] z-10"
          style={{ background: suitColor(arch.badgeSuit), color: "#fff" }}
          title={t("cardgrid.arch.title", { name: arch.name, boost: arch.boost })}>
          +{arch.boost}
        </span>
      )}
      {((card.ionStacks || 0) > 0 || ripe || glacierForm) && (
        <span className="absolute top-0.5 right-1 flex items-center gap-0.5 text-[8px] leading-none">
          {glacierForm && <span className="font-bold" style={{ color: "#5ec8f0", textShadow: "0 0 3px #5ec8f0" }} title={t("cardgrid.glacier.title")}>❄</span>}
          {(card.ionStacks || 0) > 0 && <span className="inline-flex items-center gap-0.5" style={{ color: "#5ec8f0" }}><FactionIcon type="lightning" size={9} />{card.ionStacks}</span>}
          {ripe && <span title={t("cardgrid.ripe.title")}><FactionIcon type="plant" size={9} /></span>}
        </span>
      )}
      {/* #201.6a: Wert lesbarer — am Handy größer (text-xl statt -lg) + Kontrast-Schatten für JEDE Suit (nicht nur reife),
          damit die Zahl auf der dunklen Kachel unabhängig von der Farbe klar liest. Reife behält ihren grünen Glow. */}
      <span className="cg-val text-xl sm:text-2xl font-bold" style={{ fontFamily: '"Orbitron", ui-monospace, monospace', color: numCol, textShadow: ripe ? `0 0 6px ${numCol}99, 0 1px 2px #000a` : "0 1px 2px #000a, 0 0 3px #0006" }}>{card.value}</span>
      {inForm && <span className="cg-mult text-[9px] sm:text-xs font-bold leading-none" style={{ color: fb.color || "#5ab87a" }}>×{fmt(pf.mult)}</span>}
      {/* #112: Auswahl-Marker — Farbpfeil „→X" (Shop-Farbwechsel) bzw. ✓ (gold) für gewählte Karten/Position. */}
      {(arrow || picked) && (
        <span className="text-[9px] sm:text-[11px] font-bold leading-none" style={{ color: arrow ? suitColor(arrow) : "#d4a63a" }}>
          {arrow ? `→${arrow}` : "✓"}
        </span>
      )}
      {/* Formations-Gewinn-Blitz: EIN Overlay je Karte in ihrer Formationsfarbe (kein Sammelrahmen um
          die Gruppe). `key` am Flash-Zähler → derselbe Keyframe startet auch beim zweiten Mal neu. */}
      {formFlash && <span key={formFlash} className="form-gain-flash" style={{ "--form-flash": fb.color || "#5ab87a" }} />}
      {labels && <span className="cg-lab absolute bottom-0.5 right-1 text-[8px] sm:text-[11px] font-bold opacity-80" style={{ color: fb.color || "#5ab87a" }}>{labels}</span>}
      {/* Eis-Neudesign: Gletscher-Marker (starr festgefroren) + aktuelle Masse. */}
      {glacier && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] font-bold leading-none tabular-nums" style={{ color: "#8be6ff", textShadow: "0 0 4px #5ec8f0" }} title={`Gletscher · Masse ${Math.round(glacierMass)}${firnMass >= 0.5 ? ` · Reserve ${Math.round(firnMass)} (füllt zum Durchlauf-Beginn auf 12)` : ""}`}>
          <FactionIcon type="ice" size={11} />
          {Math.round(glacierMass)}
        </span>
      )}
      {/* #386 Firn-Boden-Marker: dezenter ❄ + Boden-Reserve (kein Icon/Glow), klar abgesetzt vom Gletscher-Marker. */}
      {firn && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold leading-none tabular-nums" style={{ color: "#7fbfe0", opacity: 0.85 }} title={`Firn-Boden · Reserve ${Math.round(firnMass)} (füllt einen Gletscher hier zum Durchlauf-Beginn)`}>
          <FactionIcon type="ice" size={8} glow={false} />{Math.round(firnMass)}
        </span>
      )}
      {roleIds.length > 0 && <span className="absolute bottom-0.5 left-1 text-[8px] sm:text-xs leading-none" style={{ color: "#d4a63a" }} title={roleTitle}>●</span>}
    </button>
  );
});

/* Segment-Grid: je Segment eine Zeile [Bereichs-Label][5 Kacheln]. `roles` = state.roles.
   onTilePick(pos, card) meldet Klicks. Auswahl-Props (#112):
   - `selectedPos`   — einzelne Kachel weiß hervorheben (Tausch/Detail: Formationsphase, Chronik)
   - `pickedIds`     — Karten-ids gold ✓ (Mehrfachauswahl: Perk-Ziel, Shop-Karten)
   - `pickedPos`     — eine Position gold ✓ (Shop-Positionsanker)
   - `disabledPos`   — nicht klickbare Positionen (belegte Anker)
   - `arrows`        — { cardId: suit } → „→X"-Badge (Shop-Farbwechsel) */
// `quietTiles` (#132): unterdrückt den generischen Button-Klick-Sound der Kacheln (data-sfx="none"), damit die
// aufrufende Ansicht einen eigenen Kachel-Sound spielen kann (Formationsphase → cardflip beim Tausch). Scoped:
// die geteilten Nutzungen (Chronik/Shop-/Perk-Zielauswahl) lassen den Klick-Sound per Default unangetastet.
// #FB Segmentarbeit: Verbinder ZWISCHEN zwei Segment-Zeilen — signalisiert, dass Formationen diese Grenze
// überschreiten dürfen (welche Segmente ist durch die Lage zwischen ihren Bereichs-Labels ersichtlich).
function SegmentBridge({ segA, segB }) {
  const line = { background: "linear-gradient(90deg, #5ab87a00, #5ab87a99, #5ab87a00)" };
  return (
    <div className="flex items-center gap-2" title={`Segmentarbeit: Formationen dürfen die Grenze zwischen Segment ${segA} und ${segB} überschreiten`}>
      <div className="w-9 shrink-0" />
      <div className="flex-1 flex items-center gap-1.5">
        <div className="h-px flex-1" style={line} />
        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide px-1.5 py-[1px] rounded-full whitespace-nowrap"
          style={{ color: "#8be0a8", background: "#5ab87a1f", border: "1px solid #5ab87a55" }}>{t("cardgrid.openBoundary")}</span>
        <div className="h-px flex-1" style={line} />
      </div>
    </div>
  );
}

export function CardGrid({ cards = [], formations = [], roles = {}, anchors = [], pe = {},
                          selectedPos, pickedIds = [], pickedPos, disabledPos = [], arrows = {}, onTilePick, quietTiles = false,
                          highlightPos = [], highlightTitle = null, openSegments = null, swappedIds = new Set(),
                          segStrength = [], segDelta = [], flashPos = null, flashKey = 0, architectCover = null, structPos = null, distrPos = null, glowBid = null,
                          glacierPos = null, glacierMassByPos = null, firnStackByPos = null, lockedPos = [], quietFrames = false }) {
  const rolesByCard = {};
  for (const [pid, ids] of Object.entries(roles || {})) for (const id of ids || []) (rolesByCard[id] ||= []).push(pid);
  // Eis-Neudesign: Positionen, die Teil einer aktiven 2D-Gletscher-Formation sind (Block/Kreuz/Linie/Fläche) → blaues „G" auf der Karte.
  const glacierFormPos = glacierPos ? glacierFormations(glacierPos).formPos : null;
  const pickedSet = new Set(pickedIds || []);
  const disabledSet = new Set(disabledPos || []);
  const lockedSet = new Set(lockedPos || []); // #301 C3: fixierte Aufstell-Zellen (rote Querbalken)
  const highlightSet = new Set(highlightPos || []); // #182: Positionen mit Silberring ohne Anker (z. B. Zeitraffer 20 & 40)
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);
  // #FB: offene Segmentgrenzen (E_SEGMENT). Grenze g liegt zwischen Zeile g und g+1; nur zeichnen, wenn Werkzeug aktiv.
  const segOpen = openSegments && openSegments.active ? openSegments : null;
  // #UI: Gebäude-Rahmen als durchgezogene SVG-Kontur ÜBER dem Grid (statt Kasten je Karte). Nach dem Layout werden die
  // Zell-Rechtecke (data-pos) relativ zum Grid gemessen und je Gebäude in Perimeter-Linien übersetzt (archFrameLines);
  // ein ResizeObserver hält es bei Größenänderung aktuell. archSig (pos:bid …) hält die Effekt-Deps stabil → keine
  // Render-Schleife, obwohl architectCover je Render neu erzeugt wird. Nur aktiv, wenn architectCover gesetzt ist.
  const wrapRef = useRef(null);
  const [archFrame, setArchFrame] = useState(null);
  const archSig = architectCover ? Object.keys(architectCover).map((p) => `${p}:${architectCover[p].bid}`).join(",") : "";
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !architectCover) { setArchFrame(null); return; }
    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      const cells = {};
      wrap.querySelectorAll("[data-pos]").forEach((el) => {
        const p = Number(el.getAttribute("data-pos"));
        const r = el.getBoundingClientRect();
        cells[p] = { left: r.left - wr.left, top: r.top - wr.top, right: r.right - wr.left, bottom: r.bottom - wr.top };
      });
      let exH = 3, exV = 5; // halbe Raster-Lücken aus Nachbarzellen messen, sonst feste Fallbacks
      if (cells[0] && cells[1]) exH = Math.max(0, (cells[1].left - cells[0].right) / 2);
      // #255: exV = halbe MINIMALE vertikale Lücke über alle Zeilenübergänge — eine geöffnete Grenze
      // (SegmentBridge) verbreitert EINEN Übergang; das Minimum bleibt die normale Zeilenlücke, sodass
      // der Außenrand nicht aufgebläht wird (innere Nähte dehnen sich in archFrameLines eh pro Lücke).
      let minGapV = Infinity;
      for (let p = 0; p + SEGMENT_SIZE < cards.length; p++) {
        const a = cells[p], b = cells[p + SEGMENT_SIZE];
        if (a && b && b.top > a.bottom) minGapV = Math.min(minGapV, b.top - a.bottom);
      }
      if (Number.isFinite(minGapV)) exV = Math.max(0, minGapV / 2);
      // Außen-Outset oben/unten kleiner als die halbe Zeilenlücke: die waagerechten Außenbanden sollen die Karten
      // umschließen, aber nicht bis in die Zeilenmitte reichen, wo der „Grenze offen"-Verbinder-Text sitzt. Auf den
      // waagerechten Zellabstand (exH) gedeckelt → gleichmäßiger, enger Rahmen; innere Nähte bleiben bei halber Lücke.
      const exVOut = Math.min(exV, exH);
      setArchFrame({ w: wr.width, h: wr.height, lines: archFrameLines(architectCover, cells, cards.length, exH, exV, exVOut) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    /* Nachmessen, sobald die Schriften da sind. Der ResizeObserver sieht nur die Größe des RASTERS; laden
       Orbitron/Geist nach, ändern sich die Zellen INNEN (Zeilenhöhe, Kartenzahl-Breite), ohne dass das Raster
       seine Außenmaße ändern muss — der Gebäude-Rahmen bliebe dann auf der Ersatzschrift stehen und säße
       sichtbar versetzt. Dieselbe Falle wie bei der Gottgleich-Wortmarke (#ios-word, Punkt 2), nur an einer
       anderen Stelle. Fällt im Spiel selten auf (Schrift steht längst), im schmalen Flügel der Level-up-Karte
       dagegen sofort: dort ist die Zelle halb so breit, ein Versatz von 4 px also ein Achtel der Kachel. */
    let alive = true;
    document.fonts?.ready?.then(() => { if (alive) measure(); });
    return () => { alive = false; ro.disconnect(); };
    // archSig (s. o.) hält die Deps stabil: es wechselt genau dann, wenn sich die Gebäude-Belegung ändert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archSig, cards.length]);
  return (
    // #201.6a: etwas mehr Abstand ZWISCHEN den Segment-Zeilen (gap-2.5 statt -1.5) als innerhalb einer Zeile (gap-1.5)
    // → die Segmente lesen sich als eigene Bänder, die Grenzen sind klarer.
    /* `cg-root`: Andockstelle für Aufrufer, die das Brett kleiner brauchen (Victory-Screen und Lauf-Details
       zeigen es ab 1280 px in einer Spalte — dort deckelt index.css die Breite, damit alle Karten als
       Übersicht ins Panel passen). Unter 1280 px hat die Klasse keine Regel. */
    <div ref={wrapRef} className="cg-root relative grid gap-2.5">
      {/* #UI: Gebäude-Kontur (SVG) über dem Grid — eine durchgezogene Linie je Gebäude in seiner Form. */}
      {archFrame && archFrame.lines.length > 0 && (
        <svg className="absolute left-0 top-0 pointer-events-none" width={archFrame.w} height={archFrame.h}
             style={{ overflow: "visible", zIndex: 5 }} aria-hidden="true">
          {/* Inspiziertes Gebäude (glowBid) zuletzt zeichnen → seine Rahmenlinien liegen oben und glühen cyan. */}
          {[...archFrame.lines].sort((a, b) => (glowBid != null && a.bid === glowBid ? 1 : 0) - (glowBid != null && b.bid === glowBid ? 1 : 0)).map((l, i) => {
            const glow = glowBid != null && l.bid === glowBid;
            // Rahmen glühen in ihrer Gebäude-Typfarbe (Wert/Score/Formation), sobald das Overlay an ist — dezenter,
            // einzelner Schein. Das inspizierte Gebäude bleibt kräftig cyan (stärkerer Doppel-Schein) → klar abgesetzt.
            return <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={glow ? "#5ec8f0" : l.color} strokeWidth={glow ? 4 : 2.5} strokeLinecap="square"
              style={{ filter: glow ? "drop-shadow(0 0 4px #5ec8f0) drop-shadow(0 0 2px #5ec8f0)" : `drop-shadow(0 0 2px ${l.color})` }} />;
          })}
        </svg>
      )}
      {Array.from({ length: nSeg }).flatMap((_, s) => {
        // #201.5: Pro-Segment-Stärke am Bereichs-Label + Verbesserungs-Highlight. Statischer Tint (kein Puls →
        // reduced-motion automatisch erfüllt): stärker seit Phasenbeginn → grün, schwächer → dezent rot, sonst gedämpft.
        const segS = segStrength[s];
        const segD = segDelta[s] ?? 0;
        // (Nulllage zuerst — hält die Zeile frei von der Folge „> … <", die der i18n-Textgreifer sonst greift.)
        const segTint = Math.abs(segD) <= 0.001 ? "#8a8a92" : (segD > 0.001 ? "#5ab87a" : "#e0605a");
        const row = (
          <div key={`seg${s}`} className="flex items-center gap-2">
            {/* Segment-Spalte (Bereich + Stärke). Etwas größer als früher (w-9 / 10px / 9px): auf dem
                Handy war die Prozentzahl kaum lesbar. Die Breite wächst erst ab `sm` mit — auf
                schmalen Geräten kostet jeder Pixel hier direkt Kartenbreite (die Karten teilen sich
                den Rest über flex-1). */}
            <div className="w-10 sm:w-12 shrink-0 text-right leading-tight">
              <div className="text-[11px] opacity-45 tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
              {segS != null && (
                <div className="text-[10px] sm:text-[11px] font-bold ty-num tabular-nums" style={{ color: segTint }}
                  title={t("form.seg.strength.title")}>{t("form.seg.strength", { pct: Math.round(segS * 100) })}</div>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
                const pos = s * SEGMENT_SIZE + k;
                const ally = linkedPartnerOf(pe, c.suit);
                const disabled = disabledSet.has(pos);
                return <CardTile key={pos} card={c} pos={pos} posForm={formations[pos]} roleIds={rolesByCard[c.id] || EMPTY_ROLES}
                  anchorType={anchorTypeAt(anchors, pos)} allyColor={ally ? suitColor(ally) : null}
                  selected={selectedPos === pos} picked={pickedSet.has(c.id) || pickedPos === pos}
                  disabled={disabled} arrow={arrows[c.id] || null} quiet={quietTiles} quietFrames={quietFrames}
                  ring={highlightSet.has(pos)} ringTitle={highlightTitle}
                  dimmed={swappedIds.has(c.id)} arch={architectCover ? architectCover[pos] : null}
                  structLit={structPos ? structPos.has(pos) : false} distrLit={distrPos ? distrPos.has(pos) : false}
                  formFlash={flashPos && flashPos.has(pos) ? flashKey : false}
                  glacier={glacierPos ? glacierPos.has(pos) : false} glacierMass={glacierMassByPos ? (glacierMassByPos[pos] || 0) : 0}
                  firnMass={firnStackByPos ? (firnStackByPos[pos] || 0) : 0}
                  glacierForm={glacierFormPos ? glacierFormPos.has(pos) : false}
                  locked={lockedSet.has(pos)}
                  onClick={disabled || !onTilePick ? undefined : () => onTilePick(pos, c)} />;
              })}
            </div>
          </div>
        );
        // Grenze NACH Segment s offen (und es folgt eine weitere Zeile) → Verbinder einschieben.
        return segOpen && s < nSeg - 1 && segOpen.isOpen(s)
          ? [row, <SegmentBridge key={`bridge${s}`} segA={s + 1} segB={s + 2} />]
          : [row];
      })}
    </div>
  );
}
