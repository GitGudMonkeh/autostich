import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { phaseCard, PhaseHairline, PHASE_ACCENTS, ActionBar, ActionButton } from "./modalStyle.jsx";
import { allianceGroups } from "../game/families.js";
import { CardGrid } from "./CardGrid.jsx";
import { glacierGridProps } from "./glacierBoard.js";
import { architectCoverFor } from "./architectCover.js";
import { t } from "../i18n/index.js"; // #sprache
import { perkDef } from "../i18n/labels.js";


/* Kartenrollen-Zielauswahl (V2 §22.6 C / §22.5): öffnet nach dem Pick eines Ziel-Perks.
   Genau needsTarget Karten antippen, dann bestätigen. Danach ist die Rolle fixiert.
   #112: nutzt das geteilte CardGrid → Desktop-Kompakt-Styling + Formations-/Rollen-Kontext wie in der Aufstellung. */
export function TargetSelect({ state, onConfirm }) {
  const { targetPerk, deck = [], playerOrder = [], formations = [], roles = {} } = state;
  const def = perkDef(targetPerk) || {};
  const need = def.needsTarget || 0;
  const [sel, setSel] = useState([]); // gewählte Karten-ids

  const toggle = (id) => setSel((cur) =>
    cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < need ? [...cur, id] : cur);

  const cards = playerOrder.map((di) => deck[di]);
  const ready = sel.length === need;
  const architectCover = architectCoverFor(state); // Gebäude-Overlay fürs Deck (informierte Wahl)

  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="relative w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={phaseCard(PHASE_ACCENTS.green)}>
        <PhaseHairline />
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#5ab87a" }}>{t("target.eyebrow", { perk: def.label })}</div>
          <h2 className="text-xl font-bold mt-1">{t("target.pickCards", { count: need })}</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{def.desc}</p>
        </div>

        <ActionBar pad={5}>
          <span className="text-xs opacity-60 tabular-nums self-center">{t("common.chosen", { n: sel.length, need })}</span>
          <span className="flex-1" />
          <ActionButton kind="primary" disabled={!ready} onClick={() => ready && onConfirm(sel)}>{t("common.confirm")}</ActionButton>
        </ActionBar>

        <div className="mt-4">
          <CardGrid cards={cards} formations={formations} roles={roles} {...glacierGridProps(state)}
            anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
            architectCover={architectCover} pickedIds={sel} onTilePick={(pos, c) => toggle(c.id)} />
        </div>

      </div>
    </div>
  ));
}
