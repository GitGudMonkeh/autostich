import { PerkList, SkillList } from "./BuildSummary.jsx";

/* Build-Übersicht unter dem Battlefield: links die gewählten Perks, rechts die Skills
   (Blitz-Archetyp). Beide anklickbar → Beschreibung. Deck-Histogramm sitzt als eigener
   „Chronik"-Block ganz unten (#28). */
export function BuildPanel({ perks, skills = [] }) {
  return (
    <div className="rounded-xl p-4 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
            Perks — {perks.length}
          </div>
          <PerkList perks={perks} empty="Noch keine Perks. Nach jeder Runde wählst du einen dazu." />
        </div>
        <div className="sm:border-l sm:pl-4" style={{ borderColor: "#26262e" }}>
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
            Skills — {skills.length}
          </div>
          <SkillList skills={skills} empty="Noch keine Skills — ab Runde 3 wählbar." />
        </div>
      </div>
    </div>
  );
}
