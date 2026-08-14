import { useState } from "react";
import { phaseCard, PhaseHairline, PHASE_ACCENTS, ActionBar, ActionButton } from "./modalStyle.jsx";
import { allianceGroups } from "../game/families.js";
import { CardGrid } from "./CardGrid.jsx";
import { architectCoverFor } from "./architectCover.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon

const ICE = "#7fd4f0";

/* Eis-Neudesign (docs §2.1): Gletscher-Wahl nach jedem Eis-Skill-Pick. Genau EINE Karte antippen, dann bestätigen —
   sie friert auf ihrer Zelle fest (starr) und sammelt Masse. Analog zu TargetSelect (Perk-Kartenziel), aber Einzelwahl
   per Brett-Position; bestätigen dispatcht GLACIER_LOCK. Bereits gefrorene Felder sind gesperrt. */
export function GlacierPick({ state, onConfirm }) {
  const { deck = [], playerOrder = [], formations = [], roles = {}, glacierLocked = [], glacierMass = [], challengeBlockForm = [] } = state;
  const [sel, setSel] = useState(null); // gewählte Brett-Position (pos) oder null

  const cards = playerOrder.map((di) => deck[di]);
  const architectCover = architectCoverFor(state);
  const glacierPos = new Set(); glacierLocked.forEach((v, i) => { if (v) glacierPos.add(i); });
  // #301 C3: gesperrte Aufstell-Zellen sind NICHT einfrierbar → wie bereits gefrorene Felder aus der Wahl nehmen.
  const chLock = challengeBlockForm || [];
  const blocked = (pos) => glacierLocked[pos] || chLock.includes(pos);
  const disabledPos = [...new Set([...glacierLocked.map((v, i) => (v ? i : -1)).filter((i) => i >= 0), ...chLock])]; // schon gefroren ODER Challenge-gesperrt → nicht wählbar
  const ready = sel != null && !blocked(sel);
  const pick = (pos) => { if (!blocked(pos)) setSel(pos); };

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="relative w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={phaseCard(PHASE_ACCENTS.ice)}>
        <PhaseHairline />
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest inline-flex items-center gap-1" style={{ color: ICE }}><FactionIcon type="ice" size={12} /> Gletscher</div>
          <h2 className="text-xl font-bold mt-1">Wähle eine Karte als Gletscher</h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">
            Sie friert auf ihrer Zelle fest — ab dann <b>starr</b> (nicht mehr verschiebbar) und sammelt Masse, bis sie bricht.
            Entscheide zwischen Position und Wert.
          </p>
        </div>

        <ActionBar pad={5}>
          <span className="text-xs opacity-60 tabular-nums self-center">{sel != null ? "1" : "0"} / 1 gewählt</span>
          <span className="flex-1" />
          <ActionButton kind="primary" disabled={!ready} onClick={() => ready && onConfirm(sel)}>Bestätigen</ActionButton>
        </ActionBar>

        <div className="mt-4">
          <CardGrid cards={cards} formations={formations} roles={roles}
            anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
            architectCover={architectCover}
            pickedIds={sel != null && cards[sel] ? [cards[sel].id] : []} disabledPos={disabledPos} lockedPos={chLock}
            glacierPos={glacierPos} glacierMassByPos={glacierMass}
            onTilePick={(pos) => pick(pos)} />
        </div>

      </div>
    </div>
  );
}
