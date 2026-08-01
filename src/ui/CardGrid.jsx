import { useRef, useState, useLayoutEffect } from "react";
import { suitColor, PLANT_VALUE_CAP } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";
import { familyDef } from "../game/families.js";
import { SEGMENT_SIZE } from "../game/formations.js";
import { anchorTypeAt, linkedPartnerOf } from "../game/shop.js";
import { formationBorder } from "./formationStyle.js";
import { formationAbbr } from "./formationLabels.js";
import { FrostOverlay } from "./FrostOverlay.jsx";
import { PLANT_RIPE, PLANT_FULL } from "./indicators/vocab.js";

// Anker-Typ → Kurzlabel (Tooltip); gleiche Bedeutung wie in ChronikOverview (#119).
const ANCHOR_LABEL = { power: "Kraft", score: "Score", crit: "Crit", streak: "Serie", formation: "Formation", joker: "Joker" };
const fmt = (x) => x.toFixed(2).replace(".", ",");

// #UI: Architekt-Overlay als EIN durchgezogener Rahmen in GEBÄUDE-FORM (statt Kästen um jede Karte). Aus den gemessenen
// Zell-Rechtecken (`cells`: pos → {left,top,right,bottom} relativ zum Grid) werden je Gebäude nur die PERIMETER-Kanten
// als Liniensegmente erzeugt: eine Kante gehört zur Kontur, wenn der Nachbar dahinter NICHT zum selben Gebäude (bid)
// gehört. Die Rechtecke werden um exH/exV (halbe Raster-Lücke) geweitet → die Kanten benachbarter Gebäudezellen
// treffen sich EXAKT in der Lückenmitte und die Kontur läuft über die Lücken hinweg durch. Rein & unit-testbar.
export function archFrameLines(cover, cells, total, exH, exV) {
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
    const L = rect.left - exH, R = rect.right + exH, T = rect.top - exV, B = rect.bottom + exV;
    if (!same(pos - SEGMENT_SIZE, pos - SEGMENT_SIZE >= 0)) lines.push({ x1: L, y1: T, x2: R, y2: T, color }); // oben
    if (!same(pos + SEGMENT_SIZE, pos + SEGMENT_SIZE < total)) lines.push({ x1: L, y1: B, x2: R, y2: B, color }); // unten
    if (!same(pos - 1, col > 0)) lines.push({ x1: L, y1: T, x2: L, y2: B, color }); // links
    if (!same(pos + 1, col < SEGMENT_SIZE - 1)) lines.push({ x1: R, y1: T, x2: R, y2: B, color }); // rechts
  }
  return lines;
}

/* Eine Kachel der 40-Karten-Übersicht (geteilt von Formationsphase, Chronik, Perk-Zielauswahl & Shop, Issue #101/#112).
   Kompakt auf Desktop: flachere Ratio (sm:aspect-square) + kleinere Zahl. Auf Mobil unverändert (aspect-[3/4], text-lg).
   Zeigt Rahmen-Tier, ×mult, Formations-Kürzel, Rolle-●, Ionisierung, Frost.
   Auswahl-Zustände (#112): `selected` = weiß (Tausch/Detail) · `picked` = gold ✓ (Mehrfach-/Positionsauswahl) ·
   `arrow` = Farbpfeil „→X" (Shop-Farbwechsel) · `disabled` = ausgegraut, nicht klickbar (z. B. belegte Anker). */
function CardTile({ card, pos, posForm, roleIds = [], selected, onClick, anchorType = null, allyColor = null,
                   picked = false, disabled = false, arrow = null, quiet = false, ring = false, ringTitle = null, pillar = false, dimmed = false, arch = null, structLit = false }) {
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
  // #112: „picked" (gold) hat Vorrang vor „selected" (weiß) vor Formations-/Farbrand.
  const borderColor = picked ? "#d4a63a" : selected ? "#ffffff" : fb.color || col + "55";
  const borderStyle = fb.dashed && !selected && !picked ? "dashed" : "solid";
  // Rollen-Label: flacher Perk (PERK_DEFS) ODER Familie (FAMILY_DEFS, Rarität #167 Kat. C) → sonst die rohe id.
  const roleTitle = roleIds.length ? roleIds.map((p) => PERK_DEFS[p]?.label || familyDef(p)?.name || p).join(", ") : undefined;
  // #119: belegte Position (Shop-Anker) → dicker silberner AUSSENring via Outline+Offset — separat vom
  // inneren Auswahl-/Formationsrahmen und dessen Glow, damit beide gleichzeitig lesbar bleiben.
  // #182: `ring` markiert Positionen ohne Anker mit demselben Silberring (z. B. die von Zeitraffer/L11 gekoppelten 20 & 40).
  const anchorRing = (anchorType || ring) ? { outline: "2.5px solid #cdd6e0", outlineOffset: "2px" } : null;
  // Eis-Architekt (#210): eine hervorgehobene Frost-Spalte (senkrechte Formation) → eisiger Inset-Rim + Cyan-Glow.
  // Stapelt sich unter dem Auswahl-/Formations-Glow, damit beide lesbar bleiben (Pfeiler quer über die Segment-Zeilen).
  const pillarShadow = pillar ? "inset 0 0 0 1.5px rgba(191,233,247,0.60), 0 0 12px rgba(94,200,240,0.50)" : null;
  // Architekt-Gebäude-Overlay (#202/#UI): der RAHMEN in Gebäude-Form wird jetzt als durchgezogene SVG-Kontur ÜBER dem
  // Grid gezeichnet (CardGrid, archFrameLines) — nicht mehr als Kasten je Karte. Die Kachel selbst bekommt nur noch
  // einen sehr dezenten Kategorie-Farbwash, damit man abgedeckte Zellen auch als Fläche erkennt (Legendär = Gold).
  const archShadow = arch ? `inset 0 0 0 9999px ${(arch.legendary ? "#c8962f" : arch.color)}1f` : null;
  // F4 Farballianz (#125): diagonaler Zweifarben-Split auch in der Grid-Kachel (obere Hälfte Eigen-, untere Partnerfarbe).
  const tileBg = allyColor
    ? `linear-gradient(135deg, ${col}30 0%, ${col}30 49%, ${allyColor}30 51%, ${allyColor}30 100%), #20202a`
    : "#20202a";
  return (
    <button onClick={onClick} disabled={disabled} data-sfx={quiet ? "none" : undefined} data-pos={arch ? pos : undefined}
      title={anchorType ? `⚓ Anker · ${ANCHOR_LABEL[anchorType] || anchorType}` : ring ? (ringTitle || undefined) : undefined}
      className={`as-tile relative rounded-lg flex flex-col items-center justify-center transition-all${structLit ? " arch-struct-lit" : ""}`}
      style={{ background: tileBg, border: `2px ${borderStyle} ${borderColor}`,
               // #201.4: schon getauschte Karte dezent ausgrauen (rein kosmetisch, bleibt klickbar). picked(gold)/
               // selected(weiß) haben Vorrang und bleiben voll sichtbar; disabled (0,45) sticht durch.
               opacity: disabled ? 0.45 : (dimmed && !selected && !picked ? 0.55 : 1), cursor: !onClick ? "default" : (disabled ? "not-allowed" : "pointer"),
               ...(anchorRing || {}),
               boxShadow: [picked ? "0 0 10px #d4a63a66" : selected ? "0 0 10px #ffffff66" : fb.color && !fb.dashed ? `0 0 8px ${fb.color}55` : null, pillarShadow, archShadow].filter(Boolean).join(", ") || undefined }}>
      {/* #136 Frostglas: ruhiger Eis-Layer (Tint + Körnung, KEIN Sweep) für eingefrorene Board-Karten. */}
      {card.frozen && <FrostOverlay animated={false} radius="0.5rem" />}
      <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
      {/* Architekt-Gebäude-Badge (#202/#224.7): nur der echte Wert-Boost „+X" mittig an der oberen Kante (kein Icon mehr —
          die Kategorie liest man am Rahmen/Ring + Tooltip). Nur bei value-Gebäuden (boost > 0); score/formation zeigt nur den Ring.
          #UI: Badge-Farbe = die Karten-Farbe, für die das Gebäude den Wert-Bonus gibt (arch.badgeSuit); farblos → grau (#888). */}
      {arch && arch.boost > 0 && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold leading-none px-1 rounded-b-[3px] z-10"
          style={{ background: suitColor(arch.badgeSuit), color: "#fff" }}
          title={`🏗 ${arch.name} · +${arch.boost} Wert`}>
          +{arch.boost}
        </span>
      )}
      {((card.ionStacks || 0) > 0 || card.frozen || ripe) && (
        <span className="absolute top-0.5 right-1 flex items-center gap-0.5 text-[8px] leading-none">
          {(card.ionStacks || 0) > 0 && <span style={{ color: "#5ec8f0" }}>⚡{card.ionStacks}</span>}
          {card.frozen && <span style={{ color: "#bfe9f7", textShadow: "0 0 3px #7fd4f0" }} title="Eingefroren">❄</span>}
          {ripe && <span style={{ textShadow: "0 0 3px #5ab87a" }} title="Grün (reif) — zählt fürs Farbblock">🌿</span>}
        </span>
      )}
      {/* #201.6a: Wert lesbarer — am Handy größer (text-xl statt -lg) + Kontrast-Schatten für JEDE Suit (nicht nur reife),
          damit die Zahl auf der dunklen Kachel unabhängig von der Farbe klar liest. Reife behält ihren grünen Glow. */}
      <span className="text-xl sm:text-2xl font-bold font-pixel-dense" style={{ color: numCol, textShadow: ripe ? `0 0 6px ${numCol}99, 0 1px 2px #000a` : "0 1px 2px #000a, 0 0 3px #0006" }}>{card.value}</span>
      {inForm && <span className="text-[9px] sm:text-xs font-bold leading-none" style={{ color: fb.color || "#5ab87a" }}>×{fmt(pf.mult)}</span>}
      {/* #112: Auswahl-Marker — Farbpfeil „→X" (Shop-Farbwechsel) bzw. ✓ (gold) für gewählte Karten/Position. */}
      {(arrow || picked) && (
        <span className="text-[9px] sm:text-[11px] font-bold leading-none" style={{ color: arrow ? suitColor(arrow) : "#d4a63a" }}>
          {arrow ? `→${arrow}` : "✓"}
        </span>
      )}
      {labels && <span className="absolute bottom-0.5 right-1 text-[8px] sm:text-[11px] font-bold opacity-80" style={{ color: fb.color || "#5ab87a" }}>{labels}</span>}
      {roleIds.length > 0 && <span className="absolute bottom-0.5 left-1 text-[8px] sm:text-xs leading-none" style={{ color: "#d4a63a" }} title={roleTitle}>●</span>}
    </button>
  );
}

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
          style={{ color: "#8be0a8", background: "#5ab87a1f", border: "1px solid #5ab87a55" }}>⇕ Grenze offen</span>
        <div className="h-px flex-1" style={line} />
      </div>
    </div>
  );
}

export function CardGrid({ cards = [], formations = [], roles = {}, anchors = [], pe = {},
                          selectedPos, pickedIds = [], pickedPos, disabledPos = [], arrows = {}, onTilePick, quietTiles = false,
                          highlightPos = [], highlightTitle = null, openSegments = null, frostPillarPos = [], swappedIds = new Set(),
                          segStrength = [], segDelta = [], architectCover = null, structPos = null }) {
  const rolesByCard = {};
  for (const [pid, ids] of Object.entries(roles || {})) for (const id of ids || []) (rolesByCard[id] ||= []).push(pid);
  const pickedSet = new Set(pickedIds || []);
  const disabledSet = new Set(disabledPos || []);
  const highlightSet = new Set(highlightPos || []); // #182: Positionen mit Silberring ohne Anker (z. B. Zeitraffer 20 & 40)
  const pillarSet = new Set(frostPillarPos || []);  // #210 Eis-Architekt: Positionen der hervorgehobenen Frost-Spalte (Pfeiler)
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
      if (cells[0] && cells[SEGMENT_SIZE]) exV = Math.max(0, (cells[SEGMENT_SIZE].top - cells[0].bottom) / 2);
      setArchFrame({ w: wr.width, h: wr.height, lines: archFrameLines(architectCover, cells, cards.length, exH, exV) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archSig, cards.length]);
  return (
    // #201.6a: etwas mehr Abstand ZWISCHEN den Segment-Zeilen (gap-2.5 statt -1.5) als innerhalb einer Zeile (gap-1.5)
    // → die Segmente lesen sich als eigene Bänder, die Grenzen sind klarer.
    <div ref={wrapRef} className="relative grid gap-2.5">
      {/* #UI: Gebäude-Kontur (SVG) über dem Grid — eine durchgezogene Linie je Gebäude in seiner Form. */}
      {archFrame && archFrame.lines.length > 0 && (
        <svg className="absolute left-0 top-0 pointer-events-none" width={archFrame.w} height={archFrame.h}
             style={{ overflow: "visible", zIndex: 5 }} aria-hidden="true">
          {archFrame.lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="2.5" strokeLinecap="square" />
          ))}
        </svg>
      )}
      {Array.from({ length: nSeg }).flatMap((_, s) => {
        // #201.5: Pro-Segment-Stärke am Bereichs-Label + Verbesserungs-Highlight. Statischer Tint (kein Puls →
        // reduced-motion automatisch erfüllt): stärker seit Phasenbeginn → grün, schwächer → dezent rot, sonst gedämpft.
        const segS = segStrength[s];
        const segD = segDelta[s] ?? 0;
        const segTint = segD > 0.001 ? "#5ab87a" : segD < -0.001 ? "#e0605a" : "#8a8a92";
        const row = (
          <div key={`seg${s}`} className="flex items-center gap-2">
            <div className="w-9 shrink-0 text-right leading-tight">
              <div className="text-[10px] opacity-40 tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
              {segS != null && (
                <div className="text-[9px] font-bold font-pixel-dense tabular-nums" style={{ color: segTint }}
                  title="Formations-Bonus dieses Segments in % (grün = seit Durchlaufbeginn stärker, rot = schwächer)">+{Math.round(segS * 100)} %</div>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
                const pos = s * SEGMENT_SIZE + k;
                const ally = linkedPartnerOf(pe, c.suit);
                const disabled = disabledSet.has(pos);
                return <CardTile key={pos} card={c} pos={pos} posForm={formations[pos]} roleIds={rolesByCard[c.id] || []}
                  anchorType={anchorTypeAt(anchors, pos)} allyColor={ally ? suitColor(ally) : null}
                  selected={selectedPos === pos} picked={pickedSet.has(c.id) || pickedPos === pos}
                  disabled={disabled} arrow={arrows[c.id] || null} quiet={quietTiles}
                  ring={highlightSet.has(pos)} ringTitle={highlightTitle} pillar={pillarSet.has(pos)}
                  dimmed={swappedIds.has(c.id)} arch={architectCover ? architectCover[pos] : null}
                  structLit={structPos ? structPos.has(pos) : false}
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
