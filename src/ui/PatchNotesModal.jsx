import { useEscape } from "./useEscape.js";

/* Patchnotes (Startbildschirm-Button): die komplette Version 0.3 („Elementar-Rework"), granular —
   neue Systeme/Reworks im Detail PLUS die lange QoL-/Fix-Liste, damit der Umfang sichtbar wird.
   Gleiche Inhaltsquelle wie die geteilte Patchnotes-Seite (Artifact). */
const SYSTEMS = [
  ["🔥", "Vier Elementar-Fraktionen", "Feuer, Blitz, Eis und die neue Fraktion Pflanze — je ein eigenes System (Hitze & Schmieden, Ladung & Crits, Eisschichten & Einfrieren, Wachstum & Farbblöcke). Alle vier frei mischbar, je rund 20 Skills, mit Live-Markern direkt auf den Karten."],
  ["🏗", "Der Architekt statt Shop", "Baubrett statt Ladentheke: Gebäude in drei Kategorien (Wert, Punkte, Formation) auf einem 8×5-Raster platzieren. Volle Zeilen, Spalten oder Diagonalen bilden Struktur-Kombis mit goldenem Bonus — alles per Drag & Drop, mit Vorschau in der Aufstellung."],
  ["🏅", "Meisterränge", "Laufübergreifende Progression: eigene „Meister-Läufe“ schalten nacheinander fünf Ränge frei — dauerhafte Belohnungen wie mehr Neuwürfe, mehr Baufeld, bessere Raritäten und garantierte Legendäre, dazu neue Decks."],
  ["🎯", "Challenger-Modus", "Jeder Lauf hat jetzt einen Seed. Kopier und teil ihn, spiel denselben Ausgangs-Lauf mit einem anderen Build — und vergleicht eure Scores."],
  ["📖", "Glossar & Chronik", "Ein durchsuchbares Glossar (ⓘ auf jedem Auswahlbildschirm) erklärt alle Begriffe. Die Chronik zeigt Deck, Formationen und Architekt-Übersicht; ein Karten-Tipp verrät Elementar-Zustände, Wachstum und das wirkende Gebäude samt Stufe."],
  ["🎴", "Neue Decks & Kosmetik", "Viele freischaltbare Deck-Designs — für Läufe mit nur einer Fraktion, für alle vier zusammen, für Meisterränge und gemeisterte Herausforderungen."],
  ["🌿", "Balance & Korrektheit", "Alle vier Fraktionen wurden aufeinander abgestimmt. Zwei Pflanze-Effekte sind korrigiert: Überwucherung wirkt erst ab genug grünem Feld, Blätterdach zählt die echte Größe des Farbblocks."],
];

const QOL = [
  "Architekt: Gebäude frei per Drag & Drop verschieben — nur der Rahmen zieht mit, snappt beim Loslassen, an jeden Rand platzierbar",
  "Architekt: durchgehende Gebäude-Kontur statt einzelner Kästchen",
  "Architekt: erfüllte Struktur-Kombis schimmern golden — jetzt auch in Aufstellung & Chronik",
  "Architekt: Live-Anzeige „Gebäude-Boost %“ + freies Baufeld im Kopf",
  "Aufstellung: schon getauschte Karten werden ausgegraut",
  "Aufstellung: Stärke pro Segment + Hervorhebung, wo ein Tausch hilft",
  "Aufstellung: klareres Feedback — grünes/rotes Δ statt einer verwirrenden „max ד-Zahl",
  "Legendäre funkeln jetzt einheitlich auf allen Angebots-Screens",
  "Bestätigen-Buttons überall in derselben Farbe (nicht mehr in Raritätsfarbe)",
  "Passiv-Mechaniken jederzeit per Klick/Tooltip nachschlagbar; Skill-Auswahl entschlackt",
  "Feuer: „Asche“ & „Glühende Klinge“ mit klarem Readout, „Ascheschmiede“ erklärt",
  "„Nachhall“ wird beim ersten Auftauchen erklärt; Eis-„Dauerwert“ klargestellt",
  "Karten-Detail zeigt Elementar-Zustände, Wachstum (1 Nachkommastelle) & Gebäude-Stufe",
  "Karten-Marker auf dem Spielfeld größer & kräftiger",
  "Finale Aufstellung mit Rahmen ansehen — im Victory-Screen, in der Historie und im Bestenlisten-Detail",
  "Gesperrte Deck-Motive scheinen als Teaser durch",
  "Mobil: dezentes Vibrations-Feedback",
  "Performance: Effekte lassen sich reduzieren (Auto/An/Aus), Rücksicht auf „reduzierte Bewegung“",
  "Aufgeräumter Startbildschirm; viele Text- & Zahlen-Klarstellungen; ruckelfreies Ziehen auf dem Desktop",
];

const SectionLabel = ({ children }) => (
  <div className="text-[11px] uppercase tracking-widest font-bold mt-5 mb-2" style={{ color: "#d4a63a" }}>{children}</div>
);

export function PatchNotesModal({ onClose }) {
  useEscape(onClose); // Escape schließt (Backdrop-Klick unten)
  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#d4a63a" }}>Patchnotes · Version 0.3</div>
          <h2 className="text-xl font-bold mt-1">Das Elementar-Rework</h2>
          <p className="text-xs opacity-45 mt-1">Neue Systeme, komplette Reworks und dutzende Verbesserungen</p>
        </div>

        <SectionLabel>Neue Systeme &amp; große Reworks</SectionLabel>
        <div className="grid grid-cols-1 gap-2.5">
          {SYSTEMS.map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3 rounded-lg p-3 min-w-0" style={{ background: "#20202a" }}>
              <div className="text-xl leading-none shrink-0">{icon}</div>
              <div className="min-w-0">
                <div className="font-bold text-sm break-words">{title}</div>
                <div className="text-sm opacity-75 leading-snug break-words">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionLabel>Quality of Life &amp; Fixes</SectionLabel>
        <ul className="rounded-lg p-3 grid grid-cols-1 gap-1.5" style={{ background: "#20202a" }}>
          {QOL.map((t) => (
            <li key={t} className="flex gap-2 text-sm leading-snug">
              <span className="shrink-0" style={{ color: "#5ab87a" }}>✓</span>
              <span className="opacity-80 break-words">{t}</span>
            </li>
          ))}
        </ul>

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg font-bold transition-all" style={{ background: "#5ab87a", color: "#141419" }}>
          Schließen
        </button>
      </div>
    </div>
  );
}
