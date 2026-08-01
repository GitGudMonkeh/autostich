import { useEscape } from "./useEscape.js";

/* Patchnotes (Startbildschirm-Button): kurze, spielernahe Übersicht der letzten Neuerungen.
   Bewusst knapp — gleiche Inhaltsquelle wie die geteilte Patchnotes-Seite (Artifact). */
const ITEMS = [
  ["📖", "Neues Glossar", "Das ⓘ auf jedem Auswahlbildschirm öffnet ein durchsuchbares Glossar — alle Begriffe (Hitze, Ladung, Formationen, Struktur-Kombis …) an einem Ort erklärt."],
  ["🏗", "Architekt: flüssiger bauen", "Gebäude ziehst du jetzt frei mit Maus oder Finger — der Rahmen folgt weich und rastet beim Loslassen ein. Egal welche Zelle du greifst, du kannst bis an jeden Rand platzieren."],
  ["🖼", "Architekt: klarere Anzeige", "Jedes Gebäude hat eine durchgehende Kontur. Erfüllte Struktur-Kombis (volle Zeile, Spalte oder Diagonale) schimmern golden — jetzt auch in der Aufstellung und der Chronik."],
  ["🔎", "Mehr Durchblick am Deck", "Tippe eine Karte an und sieh ihre Elementar-Zustände, das Wachstum und das wirkende Gebäude samt Stufe. Am Rundenende lässt sich die finale Aufstellung mit allen Rahmen ansehen."],
  ["🌿", "Pflanze-Balance korrigiert", "Überwucherung und Blätterdach wirken jetzt genau wie beschrieben (Grün-Anteil des Feldes bzw. Größe des Farbblocks)."],
  ["✨", "Viele kleine Verbesserungen", "„Nachhall“ und die Feuer-Asche werden erklärt, die Glühende Klinge zeigt ihren aktuellen Bonus, in der Aufstellung zählt die Richtung des Tauschs (Δ), Legendäre funkeln, Bestätigen-Buttons sind einheitlich und schon getauschte Karten werden ausgegraut. Dazu dezentes Haptik-Feedback auf Handys und Effekt-Optionen für einen ruhigeren Ablauf."],
];

export function PatchNotesModal({ onClose }) {
  useEscape(onClose); // Escape schließt (Backdrop-Klick unten)
  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#d4a63a" }}>Patchnotes</div>
          <h2 className="text-xl font-bold mt-1">Feinschliff &amp; Glossar</h2>
          <p className="text-xs opacity-45 mt-1">Neuerungen seit dem Elementar-Rework</p>
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
