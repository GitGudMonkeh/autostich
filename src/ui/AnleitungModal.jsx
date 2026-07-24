import { useEscape } from "./useEscape.js";

/* Schnellstart-Anleitung (#12): erklärt den grundsätzlichen Spielablauf.
   Erreichbar über den Startbildschirm; beim allerersten Start einmal automatisch. */
const ITEMS = [
  ["🃏", "Automatisches Stechspiel", "Beide Seiten decken je eine Karte auf — die höhere Karte gewinnt den Stich. Du spielst keine Karte selbst."],
  ["🏆", "Ziel: maximaler Score", "Ein Lauf geht über genau 40 Deck-Durchläufe. Sammle so viel Score wie möglich; Bestscore und Geist laufen über den Score."],
  ["⚔️", "Sieg · Niederlage · Gleichstand", "Sieg → +Score (× deine Multiplikatoren). Niederlage → kein Score, und die Siegesserie reißt. Gleichstand → nichts passiert."],
  ["✨", "Entscheidung vor jedem Durchlauf", "Reihum wählst du einen Stat, einen Perk, die Deck-Aufstellung oder einen Skill — dein Build wird dauerhaft stärker."],
  ["🧩", "Formationen & Aufstellung", "In der Formationsphase ordnest du dein Deck an: benachbarte Karten bilden Formationen (Wiederholung/Farbblock/Treppe/Wechsel) und geben bei Sieg Score-Multiplikatoren."],
  ["🔁", "Deck-Durchlauf", "Ein Durchlauf = alle 40 Karten. Danach mischt nur der Gegner neu — deine Reihenfolge und deine dauerhaften Kartenwerte bleiben erhalten."],
  ["⏯️", "Steuerung", "Auto-Play läuft von allein. Mit Pause hältst du an; das Ablauf-Tempo stellst du mit 2×/4×/6× ein (rein Anzeige, kein Score-Effekt)."],
];

export function AnleitungModal({ onClose }) {
  useEscape(onClose); // #58: Escape schließt (Backdrop unten)
  return (
    <div onClick={onClose} className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Anleitung</div>
          <h2 className="text-xl font-bold mt-1">So funktioniert Autostich</h2>
        </div>

        <div className="grid gap-2.5">
          {ITEMS.map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3 rounded-lg p-3" style={{ background: "#20202a" }}>
              <div className="text-xl leading-none">{icon}</div>
              <div>
                <div className="font-bold text-sm">{title}</div>
                <div className="text-sm opacity-75 leading-snug">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg p-3 mt-3 text-sm text-center leading-snug" style={{ background: "#8a7de022", color: "#c9c0f0" }}>
          Kernidee: Aus einem neutralen Karten-Autobattler baust du mit vielen kleinen Entscheidungen (Stats, Perks, Aufstellung, Skills) eine immer stärkere Score-Maschine.
        </div>

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg font-bold transition-all" style={{ background: "#5ab87a", color: "#141419" }}>
          Verstanden
        </button>
      </div>
    </div>
  );
}
