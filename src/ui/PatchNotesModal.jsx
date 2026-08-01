import { useEscape } from "./useEscape.js";

/* Patchnotes (Startbildschirm-Button): spielernahe Übersicht der Version 0.3 („Elementar-Rework").
   Bewusst knapp gehalten — gleiche Inhaltsquelle wie die geteilte Patchnotes-Seite (Artifact). */
const ITEMS = [
  ["🔥", "Vier Elementar-Fraktionen", "Feuer, Blitz, Eis und die neue Fraktion Pflanze — jede mit eigenem System (Hitze & Schmieden, Ladung & Crits, Eisschichten & Einfrieren, Wachstum & Farbblöcke). Alle vier frei mischbar, mit Live-Markern direkt auf den Karten."],
  ["🏗", "Der Architekt statt Shop", "Zwischen den Durchläufen baust du auf einem 8×5-Raster Gebäude (Wert, Punkte oder Formation). Volle Zeilen, Spalten oder Diagonalen bilden Struktur-Kombis mit Gold-Bonus. Alles per Drag & Drop, mit Vorschau in der Aufstellung."],
  ["🏅", "Meisterränge", "Laufübergreifende Progression: „Meister-Läufe“ schalten nacheinander Ränge frei — dauerhafte Belohnungen wie mehr Neuwürfe, mehr Baufeld, bessere Raritäten und garantierte Legendäre."],
  ["🎯", "Challenger-Modus", "Jeder Lauf hat jetzt einen Seed. Kopier und teil ihn, spiel denselben Ausgangs-Lauf mit einem anderen Build — und vergleicht eure Scores."],
  ["📖", "Glossar & Chronik", "Ein durchsuchbares Glossar (ⓘ auf jedem Auswahlbildschirm) erklärt alle Begriffe. Die Chronik zeigt Deck, Formationen und Architekt-Übersicht; ein Karten-Tipp verrät Elementar-Zustände, Wachstum und das wirkende Gebäude samt Stufe."],
  ["🌿", "Balance & Korrektheit", "Alle vier Fraktionen wurden aufeinander abgestimmt. Pflanze-Effekte (Überwucherung, Blätterdach) wirken jetzt genau wie beschrieben."],
  ["✨", "Decks, Bedienung & Feinschliff", "Neue freischaltbare Deck-Designs; aufgeräumter Startbildschirm; einheitliche Bestätigen-Buttons; funkelnde Legendäre; ausgegraute getauschte Karten; klareres Aufstellungs-Feedback (Δ); Vibration auf Handys; Effekt-Optionen und viele Text-Klarstellungen."],
];

export function PatchNotesModal({ onClose }) {
  useEscape(onClose); // Escape schließt (Backdrop-Klick unten)
  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#d4a63a" }}>Patchnotes · Version 0.3</div>
          <h2 className="text-xl font-bold mt-1">Das Elementar-Rework</h2>
          <p className="text-xs opacity-45 mt-1">Der große 0.3-Umbau — alles Neue auf einen Blick</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {ITEMS.map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3 rounded-lg p-3 min-w-0" style={{ background: "#20202a" }}>
              <div className="text-xl leading-none shrink-0">{icon}</div>
              <div className="min-w-0">
                <div className="font-bold text-sm break-words">{title}</div>
                <div className="text-sm opacity-75 leading-snug break-words">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg font-bold transition-all" style={{ background: "#5ab87a", color: "#141419" }}>
          Schließen
        </button>
      </div>
    </div>
  );
}
