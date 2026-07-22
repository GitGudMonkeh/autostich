import { PerkList, DeckHistogram } from "./BuildSummary.jsx";

/* Rechte Seitenleiste: gewählte Perks (klickbar → Beschreibung) + Deck-Wert-Verteilung.
   Anzeige-Bausteine sind mit dem Level-Up-Overlay geteilt (BuildSummary, #22). */
export function BuildPanel({ perks, deck }) {
  return (
    <div className="rounded-xl p-4 grid gap-4" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div>
        <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
          Build — {perks.length} Perk{perks.length === 1 ? "" : "s"}
        </div>
        <PerkList perks={perks} empty="Noch keine Perks. Sammle XP für dein erstes Level-Up." />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Deck-Werte je Farbe (52 Karten)</div>
        <DeckHistogram deck={deck} />
      </div>
    </div>
  );
}
