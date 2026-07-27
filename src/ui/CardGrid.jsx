import { suitColor } from "../game/constants.js";
import { PERK_DEFS } from "../game/perks.js";
import { familyDef } from "../game/families.js";
import { SEGMENT_SIZE } from "../game/formations.js";
import { anchorTypeAt, linkedPartnerOf } from "../game/shop.js";
import { formationBorder } from "./formationStyle.js";
import { formationAbbr } from "./formationLabels.js";
import { FrostOverlay } from "./FrostOverlay.jsx";

// Anker-Typ → Kurzlabel (Tooltip); gleiche Bedeutung wie in ChronikOverview (#119).
const ANCHOR_LABEL = { power: "Kraft", score: "Punkte", crit: "Krit", streak: "Serie", formation: "Formation", joker: "Joker" };
const fmt = (x) => x.toFixed(2).replace(".", ",");

/* Eine Kachel der 40-Karten-Übersicht (geteilt von Formationsphase, Chronik, Perk-Zielauswahl & Shop, Issue #101/#112).
   Kompakt auf Desktop: flachere Ratio (sm:aspect-square) + kleinere Zahl. Auf Mobil unverändert (aspect-[3/4], text-lg).
   Zeigt Rahmen-Tier, ×mult, Formations-Kürzel, Rolle-●, Ionisierung, Frost.
   Auswahl-Zustände (#112): `selected` = weiß (Tausch/Detail) · `picked` = gold ✓ (Mehrfach-/Positionsauswahl) ·
   `arrow` = Farbpfeil „→X" (Shop-Farbwechsel) · `disabled` = ausgegraut, nicht klickbar (z. B. belegte Anker). */
function CardTile({ card, pos, posForm, roleIds = [], selected, onClick, anchorType = null, allyColor = null,
                   picked = false, disabled = false, arrow = null, quiet = false, ring = false, ringTitle = null }) {
  const pf = posForm || { mult: 1, formations: [] };
  const inForm = pf.mult > 1;
  const col = suitColor(card.suit);
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
  // F4 Farballianz (#125): diagonaler Zweifarben-Split auch in der Grid-Kachel (obere Hälfte Eigen-, untere Partnerfarbe).
  const tileBg = allyColor
    ? `linear-gradient(135deg, ${col}30 0%, ${col}30 49%, ${allyColor}30 51%, ${allyColor}30 100%), #20202a`
    : "#20202a";
  return (
    <button onClick={onClick} disabled={disabled} data-sfx={quiet ? "none" : undefined}
      title={anchorType ? `⚓ Anker · ${ANCHOR_LABEL[anchorType] || anchorType}` : ring ? (ringTitle || undefined) : undefined}
      className="as-tile relative rounded-lg flex flex-col items-center justify-center transition-all"
      style={{ background: tileBg, border: `2px ${borderStyle} ${borderColor}`,
               opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer",
               ...(anchorRing || {}),
               boxShadow: [picked ? "0 0 10px #d4a63a66" : selected ? "0 0 10px #ffffff66" : fb.color && !fb.dashed ? `0 0 8px ${fb.color}55` : null].filter(Boolean).join(", ") || undefined }}>
      {/* #136 Frostglas: ruhiger Eis-Layer (Tint + Körnung, KEIN Sweep) für eingefrorene Board-Karten. */}
      {card.frozen && <FrostOverlay animated={false} radius="0.5rem" />}
      <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
      {((card.ionStacks || 0) > 0 || card.frozen) && (
        <span className="absolute top-0.5 right-1 flex items-center gap-0.5 text-[8px] leading-none">
          {(card.ionStacks || 0) > 0 && <span style={{ color: "#5ec8f0" }}>⚡{card.ionStacks}</span>}
          {card.frozen && <span style={{ color: "#bfe9f7", textShadow: "0 0 3px #7fd4f0" }} title="Eingefroren">❄</span>}
        </span>
      )}
      <span className="text-lg sm:text-2xl font-bold font-pixel-dense" style={{ color: col }}>{card.value}</span>
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
export function CardGrid({ cards = [], formations = [], roles = {}, anchors = [], pe = {},
                          selectedPos, pickedIds = [], pickedPos, disabledPos = [], arrows = {}, onTilePick, quietTiles = false,
                          highlightPos = [], highlightTitle = null }) {
  const rolesByCard = {};
  for (const [pid, ids] of Object.entries(roles || {})) for (const id of ids || []) (rolesByCard[id] ||= []).push(pid);
  const pickedSet = new Set(pickedIds || []);
  const disabledSet = new Set(disabledPos || []);
  const highlightSet = new Set(highlightPos || []); // #182: Positionen mit Silberring ohne Anker (z. B. Zeitraffer 20 & 40)
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);
  return (
    <div className="grid gap-1.5">
      {Array.from({ length: nSeg }, (_, s) => (
        <div key={s} className="flex items-center gap-2">
          <div className="text-[10px] opacity-40 w-9 shrink-0 text-right tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
          <div className="grid grid-cols-5 gap-1.5 flex-1">
            {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
              const pos = s * SEGMENT_SIZE + k;
              const ally = linkedPartnerOf(pe, c.suit);
              const disabled = disabledSet.has(pos);
              return <CardTile key={pos} card={c} pos={pos} posForm={formations[pos]} roleIds={rolesByCard[c.id] || []}
                anchorType={anchorTypeAt(anchors, pos)} allyColor={ally ? suitColor(ally) : null}
                selected={selectedPos === pos} picked={pickedSet.has(c.id) || pickedPos === pos}
                disabled={disabled} arrow={arrows[c.id] || null} quiet={quietTiles}
                ring={highlightSet.has(pos)} ringTitle={highlightTitle}
                onClick={disabled ? undefined : () => onTilePick(pos, c)} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
