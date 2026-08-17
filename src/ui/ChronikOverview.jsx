import { useState, useMemo } from "react";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { CardGrid } from "./CardGrid.jsx";
import { glacierGridProps } from "./glacierBoard.js";
import { CardDetail } from "./CardDetail.jsx";
import { LayoutPerks } from "./LayoutPerks.jsx";
import { allianceGroups } from "../game/families.js";
import { openSegmentInfo, summarizeFormations } from "../game/formations.js";
import { archFamily, formationName, archCatList, archCatDef, anchorLabel } from "../i18n/labels.js"; // #sprache: Formations-/Ankername zur Anzeigezeit
import { t } from "../i18n/index.js";
import { useEscape } from "./useEscape.js";
// #218: Elementar-Zustände je Karte (wie FormationPhase) + globale Zusatz-Sektionen (Verteilung/Formationen/Architekt).
import { plantRootScore, hasPfahlwurzel } from "../game/skills.js";
import { DeckStrength, PerkList } from "./BuildSummary.jsx";
import { zinsReadout } from "../game/perks.js"; // Zinseszins-Readout für die Perk-Liste (wie im Build-Panel)
import { occupiedCells as archOccupied } from "../game/architect.js";
import { ARCH_CAT } from "./indicators/vocab.js";
// #UI: geteilte Architekt-/Formations-Bausteine (eine Quelle mit der Aufstellphase → keine getrennte Pflege).
import { architectCoverFor, structLitPosOf, distrLitPosOf } from "./architectCover.js";
import { ArchBuildingList, FormationLegend } from "./ArchPanels.jsx";
import { CollapsibleField } from "./CollapsibleField.jsx"; // #UI: geteiltes klappbares Feld (wie Perk-Auswahl)

const fmtX = (x) => x.toFixed(2).replace(".", ","); // ×-Multiplikator-Format (1,50)

/* Chronik-Kartenübersicht (§22.11): alle 40 Karten in aktueller Reihenfolge — nur Anzeige,
   mit Formations- und Rollen-Markern. Klick auf eine Karte zeigt Rolle & Modifikatoren (#95.5).
   Desktop (#101): zweispaltig — Karten-Grid links, Info-Panel rechts; Mobil gestapelt. */
// #127: Preisstufen-Label/Farbe (wie ShopScreen) für die Kauf-Übersicht.
// #127: kompakte Ziel-Beschriftung eines Kauf-Log-Eintrags (Position/Segment/Farbpaar/Grenze/Typ/Kategorie/Karten).

export function ChronikOverview({ state, onClose, options = {}, onOption }) {
  const { deck = [], playerOrder = [], formations = [] } = state;
  const [selPos, setSelPos] = useState(null);
  // #218/#278: Architekt-Gebäude-Overlay ein-/ausblenden — Zustand über die Optionen gemerkt (geteilt mit der Aufstellung), damit „aus" aus bleibt.
  const [showArch, setShowArchState] = useState(options.archShowBuildings !== false);
  const setShowArch = (v) => { const nv = typeof v === "function" ? v(showArch) : v; setShowArchState(nv); onOption?.({ archShowBuildings: nv }); };
  const [inspectBid, setInspectBid] = useState(null); // inspiziertes Gebäude: Liste ↔ Brett (Rahmen glüht), gesetzt per Karten-Tap ODER Listen-Klick
  const cards = playerOrder.map((di) => deck[di]);
  const selCard = selPos != null ? cards[selPos] : null; // #218: aktuell angetippte Karte (für die Elementar-Readouts)
  const anchors = [...(state.shop?.anchors || [])].sort((a, b) => a.position - b.position); // Shop-Positionsanker (§8)
  // #182: Zeitraffer (L11) koppelt Position 20 & 40 — dort denselben Silberring wie ein Anker zeigen (reine Anzeige).
  const highlightPos = (state.perks || []).includes("L11") ? [19, 39].filter((p) => p < cards.length) : [];
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
  const hasArch = archBuildings.length > 0;
  // #UI: Gebäude-Overlay + Struktur-/Distrikt-Positionen aus der geteilten Quelle (architectCover.js, identisch zur
  // Aufstellphase). [#229 T8] weiter memoisiert, damit die Berechnung nicht bei jeder Render (auch showArch=false) läuft.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  const architectCover = useMemo(() => (hasArch ? architectCoverFor(state) : null), [hasArch, state.architect, playerOrder, deck, archBuildings]);
  const structLitPos = useMemo(() => structLitPosOf(state), [hasArch, archBuildings]); // eslint-disable-line react-hooks/exhaustive-deps
  const distrLitPos = useMemo(() => distrLitPosOf(state), [hasArch, archBuildings]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}
      onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl px-5 pb-5 max-h-[95dvh] overflow-y-auto overlay-card as-panel" style={MODAL_CARD}
        onClick={(e) => e.stopPropagation()}>
        {/* #UI: Kopf mit Schließen-Knopf STICKY → beim Scrollen der Übersicht oben rechts erreichbar. Der Abstand liegt im
            Header (pt/pb, opak), NICHT als negativer Margin → keine Überlappung der ersten Kartenreihe. */}
        <div className="sticky top-0 z-20 -mx-5 px-5 pt-5 pb-4 flex items-center justify-between relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>{t("chronik.eyebrow")}</div>
            <h2 className="text-xl font-bold">{t("chronik.title")}</h2>
          </div>
          <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>{t("common.close")}</ActionButton>
        </div>

        <div className="md:flex md:gap-4 md:items-start">
          {/* Karten-Grid (links auf Desktop, kompakt) */}
          <div className="md:w-1/2 md:shrink-0">
            {/* #218: Architekt-Gebäude auf dem Grid ein-/ausblenden (Toggle + Kategorie-Legende) — wie in der Aufstellung. */}
            {hasArch && (
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2 text-[11px]">
                <button onClick={() => setShowArch((v) => !v)}
                  className={`${showArch ? "as-edge" : "as-edge-neutral"} as-edge-thin px-2 py-1 rounded-lg font-bold`}
                  style={showArch ? { "--c": ARCH_CAT.value.color } : undefined}>
                  🏗 Gebäude {showArch ? "an" : "aus"}
                </button>
                {showArch && archCatList().map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 opacity-80" style={{ color: "#aab4c4" }}>
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: v.color }} />{v.label}
                  </span>
                ))}
              </div>
            )}
            <CardGrid cards={cards} formations={formations} roles={state.roles} {...glacierGridProps(state)} anchors={anchors} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
              highlightPos={highlightPos} highlightTitle="⏱ Zeitraffer · gekoppelte Position (20 & 40)"
              openSegments={openSegmentInfo(state.familyTiers)}
              architectCover={hasArch && showArch ? architectCover : null}
              structPos={hasArch && showArch ? structLitPos : null}
              distrPos={hasArch && showArch ? distrLitPos : null}
              glowBid={hasArch && showArch ? inspectBid : null}
              selectedPos={selPos} onTilePick={(pos) => { const ns = selPos === pos ? null : pos; setSelPos(ns); setInspectBid(ns != null && architectCover ? (architectCover[ns]?.bid ?? null) : null); }} />
          </div>

          {/* Info-Panel (rechts auf Desktop, sonst darunter) */}
          <div className="md:flex-1 md:min-w-0 mt-5 md:mt-0 grid gap-3 content-start">
            {/* #218: Kartendetail zeigt jetzt auch die Elementar-Zustände (Frost/Schichten · Pflanze/Wachstum · Feuer/geschmiedet),
                genau wie in der Aufstellung (FormationPhase). selCard = die aktuell angetippte Karte. */}
            <CardDetail card={selCard} pos={selPos} posForm={selPos != null ? formations[selPos] : null} roles={state.roles} familyTiers={state.familyTiers}
              arch={selPos != null && architectCover ? architectCover[selPos] : null}
              plantReadout plantGrowth={selCard ? (state.growth?.[selCard.id] || 0) : 0}
              plantRoots={selCard ? plantRootScore(state.skills || [], state.growth?.[selCard.id] || 0) : 0}
              plantPfahl={hasPfahlwurzel(state.skills || [])}
              forgedValue={selCard ? (state.forged?.[selCard.id] || 0) : 0} />
            {/* #UI: geteilte Gebäude-Liste (ArchPanels) — identisch in Aufstellphase & Chronik. */}
            {hasArch && (
              <ArchBuildingList buildings={archBuildings} cover={architectCover} inspectBid={inspectBid}
                onInspect={(nb) => { if (nb != null) setShowArch(true); setInspectBid(nb); }} />
            )}
            <LayoutPerks perks={state.perks} familyTiers={state.familyTiers} />
            {anchors.length > 0 && (
              <div className="text-[11px] rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #26262e" }}>
                <div className="uppercase tracking-wide opacity-50 mb-1">{t("chronik.anchors")}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {anchors.map((a, i) => (
                    <span key={i} style={{ color: "#5a8ade" }}>{t("chronik.anchor.row", { pos: a.position + 1, type: anchorLabel(a.type) })}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Legende wandert ganz nach unten (eigenes klappbares Feld). */}
          </div>
        </div>

        {/* #UI: Deck-Stärke „hoch" — eigenes klappbares Feld über der Formations-/Architekt-Übersicht (wie Perk-Auswahl). */}
        <CollapsibleField title={t("perk.deckStrength")} className="mt-4">
          <DeckStrength deck={deck} />
        </CollapsibleField>

        {/* #218: globale Zusatz-Infos — aktive Formationen, Architektenphase. */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Aktuelle Formationen — kompakt (aktive Typen + Höchst-Multiplikator), ohne zweites Karten-Grid. */}
          <div className="rounded-lg p-3" style={{ background: "#17171c", border: "1px solid #26262e" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide opacity-50">{t("chronik.formations")}</span>
              <span className="text-[11px] font-bold" style={{ color: "#5ab87a" }}>{t("formpanel.count", { n: formCount, max: fmtX(formMaxMult) })}</span>
            </div>
            {Object.keys(formByType).length ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(formByType).sort((a, b) => b[1] - a[1]).map(([type, fac]) => (
                  <span key={type} className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: "#5ab87a22", color: "#8be0a8" }}>
                    {formationName(type)} ×{fmtX(fac)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] opacity-40">{t("chronik.noFormations")}</div>
            )}
          </div>

          {/* Architektenphase-Bonus — nur wenn der Architekt aktiv ist und Gebäude stehen (#202/#218). */}
          {archBuildings.length > 0 && (
            <div className="rounded-lg p-3 sm:col-span-2" style={{ background: "#17171c", border: "1px solid #26262e" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide opacity-50">{t("chronik.archPhase")}</span>
                <span className="text-[11px] font-bold" style={{ color: ARCH_CAT?.value?.color || "#8a7de0" }}>
                  {t("chronik.archCount", { n: archBuildings.length, used: archOcc, max: archMax })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(archByCat).map(([cat, n]) => {
                  const meta = archCatDef(cat) || {};
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

        {/* Aktuelle Perks (flache Perks + gehaltene Familien) — klappbares Feld unten, default offen, damit der
            aktuelle Build in der Chronik sofort sichtbar ist (wie im In-Game-Build-Panel). */}
        <CollapsibleField title={t("perk.build", { count: (state.perks || []).length })} defaultOpen className="mt-4">
          <PerkList perks={state.perks || []} familyTiers={state.familyTiers || {}} zins={zinsReadout(state)} empty={t("perk.build.empty")} />
        </CollapsibleField>

        {/* #UI: Referenz-Legende ganz nach unten, als klappbares Feld (default zu) — verstellt die Übersicht nicht mehr. */}
        <CollapsibleField title={t("form.legend")} defaultOpen={false} className="mt-3">
          <FormationLegend state={state} />
        </CollapsibleField>
      </div>
    </div>
  );
}
