/* #133: Schneller Mute-/Unmute-Button — geteilt von Startseite (StartScreen) und laufender Ansicht (Controls),
   damit beide Stellen identisch aussehen/verhalten. Togglet ausschließlich das bestehende options.muted
   (SFX + Musik, siehe App.jsx-Effekte + OptionsModal) → kein zweiter, paralleler Zustand; Schnell-Button und
   Options-Toggle bleiben automatisch synchron und die Options-Persistenz greift weiter.
   Größe/Rand matchen die übrigen Steuer-Buttons (Controls.Btn: rounded-lg px-3 py-1.5 text-sm). */
export function MuteButton({ muted, onToggle, className = "" }) {
  const label = muted ? "Ton einschalten" : "Ton stummschalten";
  return (
    <button
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={label}
      title={label}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold leading-none transition-all ${className}`}
      // Stumm = deutlich abgesetzt (gedämpftes Rot), damit der Zustand auf einen Blick erkennbar ist.
      style={{
        background: muted ? "#e0605a22" : "#20202a",
        color: muted ? "#e0605a" : "#e8e8ea",
        border: `1px solid ${muted ? "#e0605a66" : "#30303a"}`,
      }}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
