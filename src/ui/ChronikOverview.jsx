import { useState } from "react";
import { CardGrid } from "./CardGrid.jsx";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";
import { activeShopUpgrades, SHOP_ITEM_DEFS } from "../game/shop.js";
import { allianceGroups } from "../game/families.js";
import { SHOP_FAMILY_DEFS } from "../game/shopFamilies.js";
import { TIER_META, romanOf } from "../game/rarity.js";
import { suitName, SHOP_CATEGORY_LABELS } from "../game/constants.js";
import { FORMATION_TYPE_LABELS, openSegmentInfo, summarizeFormations } from "../game/formations.js";
import { useEscape } from "./useEscape.js";
// #218: Elementar-Zustände je Karte (wie FormationPhase) + globale Zusatz-Sektionen (Verteilung/Formationen/Architekt).
import { hasGletscher, plantRootScore, hasPfahlwurzel } from "../game/skills.js";
import { DeckHistogram } from "./BuildSummary.jsx";
import { occupiedCells as archOccupied, familyDef as archFamily, precomputeArchitect, architectValueBonus } from "../game/architect.js";
import { ARCH_CAT } from "./indicators/vocab.js";

const fmtX = (x) => x.toFixed(2).replace(".", ","); // ×-Multiplikator-Format (1,50)

/* Chronik-Kartenübersicht (§22.11): alle 40 Karten in aktueller Reihenfolge — nur Anzeige,
   mit Formations- und Rollen-Markern. Klick auf eine Karte zeigt Rolle & Modifikatoren (#95.5).
   Desktop (#101): zweispaltig — Karten-Grid links, Info-Panel rechts; Mobil gestapelt. */
const ANCHOR_LABEL = { power: "Kraft", score: "Punkte", crit: "Krit", streak: "Serie", formation: "Formation", joker: "Joker" };
// #127: Preisstufen-Label/Farbe (wie ShopScreen) für die Kauf-Übersicht.
const TIER_LABEL = { cheap: { l: "Günstig", c: "#8a8a95" }, strong: { l: "Stark", c: "#5a8ade" }, premium: { l: "Premium", c: "#8a7de0" }, legendary: { l: "Legendär", c: "#d4a63a" } };
// #127: kompakte Ziel-Beschriftung eines Kauf-Log-Eintrags (Position/Segment/Farbpaar/Grenze/Typ/Kategorie/Karten).
function targetLabel(t, deck) {
  if (!t) return null;
  if (t.position != null) return `Pos ${t.position + 1}`;
  if (t.segment != null) return `Segment ${t.segment + 1}`;
  if ((t.colorPair || []).length === 2) return t.colorPair.map(suitName).join(" + ");
  if (t.boundary != null) return `Grenze ${t.boundary + 1}|${t.boundary + 2}`;
  if (t.formationType) return FORMATION_TYPE_LABELS[t.formationType] || t.formationType;
  if (t.category) return SHOP_CATEGORY_LABELS[t.category] || t.category;
  if ((t.cardIds || []).length) return t.cardIds.map((id) => { const c = (deck || []).find((x) => x.id === id); if (!c) return "?"; const nc = t.colors?.[id]; return `${c.value}${c.suit}${nc ? `→${nc}` : ""}`; }).join(", ");
  if (t.offerId) return "reserviert";
  return null;
}

export function ChronikOverview({ state, onClose }) {
  const { deck = [], playerOrder = [], formations = [] } = state;
  const [selPos, setSelPos] = useState(null);
  const [showArch, setShowArch] = useState(true); // #218: Architekt-Gebäude-Overlay auf dem Grid ein-/ausblenden (wie in der Aufstellung)
  const cards = playerOrder.map((di) => deck[di]);
  const selCard = selPos != null ? cards[selPos] : null; // #218: aktuell angetippte Karte (für die Elementar-Readouts)
  const anchors = [...(state.shop?.anchors || [])].sort((a, b) => a.position - b.position); // Shop-Positionsanker (§8)
  // #182: Zeitraffer (L11) koppelt Position 20 & 40 — dort denselben Silberring wie ein Anker zeigen (reine Anzeige).
  const highlightPos = (state.perks || []).includes("L11") ? [19, 39].filter((p) => p < cards.length) : [];
  const upgrades = activeShopUpgrades(state.shop || {}); // aktive dauerhafte Shop-Verbesserungen (§9/§10)
  const purchaseLog = state.shop?.purchaseLog || []; // #127: alle Käufe des Runs (chronologisch)
  useEscape(onClose); // #159: Escape schließt die (rein lesende) Übersicht — wie die übrigen abweisbaren Overlays (#58)

  // #218: kompakte Formations-Zusammenfassung — aktive Typen mit ihrem Höchst-Multiplikator (ohne zweites Karten-Grid).
  const { count: formCount, maxMult: formMaxMult } = summarizeFormations(formations);
  const formByType = {};
  for (const pf of formations) for (const f of ((pf && pf.formations) || [])) if (f.factor > 1) formByType[f.type] = Math.max(formByType[f.type] || 0, f.factor);
  // #218: Architekt-Zusammenfassung — nur wenn der Architekt aktiv ist UND Gebäude stehen (#202). Zahl · Abdeckung · Kategorien.
  const archBuildings = (state.architectEnabled && state.architect && state.architect.buildings) ? state.architect.buildings : [];
  const archOcc = archOccupied(archBuildings).size;
  const archMax = (state.architect && state.architect.maxCover) || 0;
  const archByCat = {};
  for (const b of archBuildings) { const cat = archFamily(b.familyId)?.category; if (cat) archByCat[cat] = (archByCat[cat] || 0) + 1; }
  // #218: Gebäude-Abdeckung je Position { cat, color, icon, boost, legendary, name } — 1:1 wie in der Aufstellung
  // (precomputeArchitect + architectValueBonus, echte Engine-Werte). Auf dem Grid ein-/ausblendbar (showArch).
  const hasArch = archBuildings.length > 0;
  const architectCover = (() => {
    if (!hasArch) return null;
    const pre = precomputeArchitect(state.architect, playerOrder, deck);
    const cover = {};
    for (const b of archBuildings) {
      const fam = archFamily(b.familyId);
      if (!fam) continue;
      const cat = ARCH_CAT[fam.category];
      for (const pos of b.footprint) {
        const card = deck[playerOrder[pos]];
        const boost = fam.category === "value" && card ? architectValueBonus(pre, pos, card) : 0;
        cover[pos] = { cat: fam.category, color: cat.color, icon: cat.icon, boost, legendary: !!fam.legendary, name: fam.name, bid: b.id };
      }
    }
    return cover;
  })();

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}
      onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={{ background: "#15151b", border: "1px solid #33333e" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Chronik</div>
            <h2 className="text-xl font-bold">Kartenübersicht</h2>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
        </div>

        <div className="md:flex md:gap-4 md:items-start">
          {/* Karten-Grid (links auf Desktop, kompakt) */}
          <div className="md:w-1/2 md:shrink-0">
            {/* #218: Architekt-Gebäude auf dem Grid ein-/ausblenden (Toggle + Kategorie-Legende) — wie in der Aufstellung. */}
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
            <CardGrid cards={cards} formations={formations} roles={state.roles} anchors={anchors} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
              highlightPos={highlightPos} highlightTitle="⏱ Zeitraffer · gekoppelte Position (20 & 40)"
              openSegments={openSegmentInfo(state.familyTiers)}
              architectCover={hasArch && showArch ? architectCover : null}
              selectedPos={selPos} onTilePick={(pos) => setSelPos(selPos === pos ? null : pos)} />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-3 md:mt-0 grid gap-3 content-start">
            {/* #218: Kartendetail zeigt jetzt auch die Elementar-Zustände (Frost/Schichten · Pflanze/Wachstum · Feuer/geschmiedet),
                genau wie in der Aufstellung (FormationPhase). selCard = die aktuell angetippte Karte. */}
            <CardDetail card={selCard} pos={selPos} posForm={selPos != null ? formations[selPos] : null} roles={state.roles} familyTiers={state.familyTiers}
              frostReadout frostLayers={selCard ? (state.layers?.[selCard.id] || 0) : 0} frostGletscher={hasGletscher(state.skills || [])}
              plantReadout plantGrowth={selCard ? (state.growth?.[selCard.id] || 0) : 0}
              plantRoots={selCard ? plantRootScore(state.skills || [], state.growth?.[selCard.id] || 0) : 0}
              plantPfahl={hasPfahlwurzel(state.skills || [])}
              forgedValue={selCard ? (state.forged?.[selCard.id] || 0) : 0} />
            <LayoutPerks perks={state.perks} familyTiers={state.familyTiers} />
            {anchors.length > 0 && (
              <div className="text-[11px] rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #26262e" }}>
                <div className="uppercase tracking-wide opacity-50 mb-1">Anker</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {anchors.map((a, i) => (
                    <span key={i} style={{ color: "#5a8ade" }}>⚓ Pos {a.position + 1} · {ANCHOR_LABEL[a.type] || a.type}</span>
                  ))}
                </div>
              </div>
            )}
            {upgrades.length > 0 && (
              <div className="text-[11px] rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #26262e" }}>
                <div className="uppercase tracking-wide opacity-50 mb-1">Shop-Verbesserungen</div>
                <div className="flex flex-wrap gap-1.5">
                  {upgrades.map((u, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded" style={{ background: "#d4a63a1a", color: "#d4a63a", border: "1px solid #d4a63a44" }}>{u}</span>
                  ))}
                </div>
              </div>
            )}
            {/* #127: Kauf-Übersicht — welche Items im Run gekauft wurden + statische Wirkung (Beschreibung + Ziel). */}
            {purchaseLog.length > 0 && (
              <div className="text-[11px] rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #26262e" }}>
                <div className="uppercase tracking-wide opacity-50 mb-1.5">Käufe · {purchaseLog.length}</div>
                <div className="grid gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {purchaseLog.map((e, i) => {
                    // Shop-Familie (#164): Name „Familie III" + Stufenfarbe/-label aus TIER_META; sonst flaches Item.
                    const fam = e.family ? SHOP_FAMILY_DEFS[e.itemId] : null;
                    const d = fam ? { name: `${fam.name} ${romanOf(e.tier)}`, description: fam.tiers[e.tier]?.desc } : (SHOP_ITEM_DEFS[e.itemId] || {});
                    const tl = fam ? { l: TIER_META[e.tier]?.label || "", c: TIER_META[e.tier]?.color || "#8a8a95" } : (TIER_LABEL[e.tier] || { l: e.tier, c: "#8a8a95" });
                    const tgt = targetLabel(e.target, deck);
                    return (
                      <div key={i} className="leading-snug">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold">{d.name || e.itemId}{tgt && <span className="opacity-70 font-normal"> → {tgt}</span>}</span>
                          <span className="shrink-0 flex items-center gap-2 whitespace-nowrap">
                            <span style={{ color: tl.c }}>{tl.l}</span>
                            <span style={{ color: "#d4a63a" }}>🪙 {e.price}</span>
                          </span>
                        </div>
                        {d.description && <div className="opacity-55">{d.description}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 font-medium">
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>W</b> Wiederholung</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>F</b> Farbblock</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>T</b> Treppe</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>Z</b> Wechsel</span>
              <span style={{ color: "#6fc48f" }}><b style={{ color: "#8be0a8" }}>A</b> Anker</span>
              <span style={{ color: "#d4a63a" }}>● Rolle</span>
              <span style={{ color: "#9a9aa4" }}>Rahmenfarbe = Anzahl Formationen (<b style={{ color: "#5ab87a" }}>1</b>·<b style={{ color: "#5a8ade" }}>2</b>·<b style={{ color: "#8a7de0" }}>3</b>·<b style={{ color: "#d4a63a" }}>4</b>) — mehr = mehr Multi (Überlappung ×1,5/×2/×3) · gestrichelt = ohne ×</span>
            </div>
          </div>
        </div>

        {/* #218: globale Zusatz-Infos unter Karten-Grid & Detail — Verteilung, aktive Formationen, Architektenphase. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Verteilung — das frühere Live-Histogramm, jetzt als Kurzstatistik hier. */}
          <div className="rounded-lg p-3" style={{ background: "#17171c", border: "1px solid #26262e" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Verteilung · Deck-Werte je Farbe</div>
            <DeckHistogram deck={deck} />
          </div>

          {/* Aktuelle Formationen — kompakt (aktive Typen + Höchst-Multiplikator), ohne zweites Karten-Grid. */}
          <div className="rounded-lg p-3" style={{ background: "#17171c", border: "1px solid #26262e" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide opacity-50">Aktuelle Formationen</span>
              <span className="text-[11px] font-bold" style={{ color: "#5ab87a" }}>{formCount} · max ×{fmtX(formMaxMult)}</span>
            </div>
            {Object.keys(formByType).length ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(formByType).sort((a, b) => b[1] - a[1]).map(([type, fac]) => (
                  <span key={type} className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: "#5ab87a22", color: "#8be0a8" }}>
                    {FORMATION_TYPE_LABELS[type] || type} ×{fmtX(fac)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] opacity-40">Keine aktiven Formationen mit Multiplikator.</div>
            )}
          </div>

          {/* Architektenphase-Bonus — nur wenn der Architekt aktiv ist und Gebäude stehen (#202/#218). */}
          {archBuildings.length > 0 && (
            <div className="rounded-lg p-3 sm:col-span-2" style={{ background: "#17171c", border: "1px solid #26262e" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide opacity-50">🏗 Architektenphase</span>
                <span className="text-[11px] font-bold" style={{ color: ARCH_CAT?.value?.color || "#8a7de0" }}>
                  {archBuildings.length} Gebäude · {archOcc}/{archMax} Zellen
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(archByCat).map(([cat, n]) => {
                  const meta = ARCH_CAT?.[cat] || {};
                  return (
                    <span key={cat} className="px-1.5 py-0.5 rounded text-[11px]"
                      style={{ background: (meta.color || "#8a8a92") + "22", color: meta.color || "#c8c8ce" }}>
                      {meta.icon ? meta.icon + " " : ""}{meta.label || cat} · {n}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
