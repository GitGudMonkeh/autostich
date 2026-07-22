/* Schnellstart-Anleitung (#12): erklärt den grundsätzlichen Spielablauf.
   Erreichbar über den Startbildschirm; beim allerersten Start einmal automatisch. */
const ITEMS = [
  ["🃏", "Automatisches Stechspiel", "Beide Seiten decken je eine Karte auf — die höhere Karte gewinnt den Stich. Du spielst keine Karte selbst."],
  ["⚔️", "Sieg · Niederlage · Gleichstand", "Sieg → +Score & +XP. Niederlage → −Leben. Gleichstand → nichts passiert."],
  ["❤️", "Leben ist dein Timer", "Du startest mit 2000 Leben. Fällt es auf 0, endet der Lauf. Ziel ist ein möglichst hoher Score."],
  ["✨", "Perks bei Level-Up", "Siege geben XP. Bei jedem Level-Up pausiert das Spiel und du wählst einen Perk — dein Deck wird dauerhaft stärker."],
  ["🔁", "Deck-Durchlauf", "Nach 40 Stichen wird neu gemischt. Deine dauerhaften Kartenwert-Änderungen bleiben erhalten."],
  ["⏯️", "Steuerung", "Auto-Play läuft von allein — oder Manuell Stich für Stich. Mit Pause hältst du an; das Tempo steigt über Tempo-Perks."],
];

export function AnleitungModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#181820", border: "1px solid #33333e" }}>
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
          Kernidee: Aus einem neutralen Karten-Autobattler baust du mit vielen kleinen Perk-Entscheidungen eine immer stärkere Maschine.
        </div>

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg font-bold transition-all" style={{ background: "#5ab87a", color: "#141419" }}>
          Verstanden
        </button>
      </div>
    </div>
  );
}
