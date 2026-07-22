import { PerkList } from "./BuildSummary.jsx";

/* Linke Spalte / gestapelt: gewählte Perks (klickbar → Beschreibung).
   Das Deck-Histogramm ist als eigener „Chronik"-Block ganz nach unten gewandert (#28). */
export function BuildPanel({ perks }) {
  return (
    <div className="rounded-xl p-4 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
        Build — {perks.length} Perk{perks.length === 1 ? "" : "s"}
      </div>
      <PerkList perks={perks} empty="Noch keine Perks. Sammle XP für dein erstes Level-Up." />
    </div>
  );
}
