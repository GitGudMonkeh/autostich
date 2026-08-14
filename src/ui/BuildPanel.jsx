import { PerkList, SkillList } from "./BuildSummary.jsx";
import { FIRST_SKILL_CYCLE } from "../game/constants.js";
import { DECK_BORDER } from "./modalStyle.jsx"; // #356: deck-getönter neutraler Struktur-Rahmen

/* Build-Übersicht unter dem Battlefield: links die gewählten Perks, rechts die Skills
   (Blitz-Archetyp). Beide anklickbar → Beschreibung. Deck-Histogramm sitzt als eigener
   „Chronik"-Block ganz unten (#28). */
export function BuildPanel({ perks, skills = [], familyTiers = {}, zinsBonus }) {
  const famCount = Object.values(familyTiers).filter((t) => t > 0).length;
  return (
    <div className="rounded-xl p-4 as-panel" style={{ background: "linear-gradient(180deg,#1b1a24,#141019)", border: `1px solid ${DECK_BORDER}` }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
            Perks — {perks.length + famCount}
          </div>
          <PerkList perks={perks} familyTiers={familyTiers} zinsBonus={zinsBonus} empty="Noch keine Perks. In manchen Durchläufen wählst du einen dazu." />
        </div>
        <div className="sm:border-l sm:pl-4" style={{ borderColor: DECK_BORDER }}>
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
            Skills — {skills.length}
          </div>
          <SkillList skills={skills} empty={`Noch keine Skills — ab Durchlauf ${FIRST_SKILL_CYCLE} wählbar.`} />
        </div>
      </div>
    </div>
  );
}
