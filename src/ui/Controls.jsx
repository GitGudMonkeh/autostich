import { MuteButton } from "./MuteButton.jsx";
import { t } from "../i18n/index.js"; // #sprache

/* #kante: Sekundär-Knöpfe des Laufs in der Kanten-Familie. `tone` färbt nur den aktiven Zustand — im Lauf
   sind diese drei durchweg inaktiv und damit neutral, was sie auch sein sollen: Auswege, keine Angebote. */
function Btn({ active, onClick, disabled, children, tone = "#5a8ade" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${active ? "as-edge" : "as-edge-neutral"} as-edge-thin px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
      style={active ? { "--c": tone } : undefined}
    >
      {children}
    </button>
  );
}

/* Sekundär-Steuerung (Gameplay-Neu-Aufbau): Pause & Tempo sind in die schwebende StatusBar gewandert; hier bleiben
   die selteneren Aktionen als eigene Reihe: Optionen · Neustart · Beenden · Ton. LINKSBÜNDIG (nicht über die
   Breite verteilt) — sonst rissen die kürzeren englischen Labels (Options/Restart/End) große Lücken. */
export function Controls({ onRestart, onAbort, onOptions, muted, onToggleMute }) {
  return (
    <div className="flex items-center justify-start gap-2 flex-wrap">
      {onOptions && <Btn onClick={onOptions} tone="#8a7de0" aria-label={t("controls.options.aria")}>{t("controls.options")}</Btn>}
      <Btn onClick={onRestart} tone="#8a7de0">{t("controls.restart")}</Btn>
      {onAbort && <Btn onClick={onAbort} tone="#8a7de0">{t("controls.quit")}</Btn>}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} />}
    </div>
  );
}
