import { MuteButton } from "./MuteButton.jsx";
import { t } from "../i18n/index.js"; // #sprache

/* #kante: Sekundär-Knöpfe des Laufs in der Kanten-Familie. #deckui: Ist ein `tone` gesetzt, trägt die Kante
   diese Farbe (die drei Lauf-Controls ziehen so die DECKFARBE des laufenden Laufs — var(--deck-a1)); ohne
   `tone` bleibt der Knopf neutral-grau. */
function Btn({ onClick, disabled, children, tone = null }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${tone ? "as-edge" : "as-edge-neutral"} as-edge-thin px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
      style={tone ? { "--c": tone } : undefined}
    >
      {children}
    </button>
  );
}

/* Sekundär-Steuerung (Gameplay-Neu-Aufbau): Pause & Tempo sind in die schwebende StatusBar gewandert; hier bleiben
   die selteneren Aktionen als eigene Reihe: Optionen · Neustart · Beenden · Ton. LINKSBÜNDIG (nicht über die
   Breite verteilt) — sonst rissen die kürzeren englischen Labels (Options/Restart/End) große Lücken. */
export function Controls({ onRestart, onAbort, onOptions, muted, onToggleMute, className = "" }) {
  return (
    /* #buehne: `className` ist die Andockstelle des Desktop-Passes — ab 1280 px setzt der Lauf die Reihe
       neben die Wortmarke, statt sie darunter zu stapeln. Ohne Prop bleibt alles wie gehabt. */
    <div className={`flex items-center justify-start gap-2 flex-wrap ${className}`}>
      {/* #deckui: die drei Lauf-Controls tragen die Deckfarbe des LAUFENDEN Laufs (var(--deck-a1) am .app-root =
          im Lauf das Run-Deck). Fallback = bisheriges Violett, wenn kein Deck aktiv. */}
      {onOptions && <Btn onClick={onOptions} tone="var(--deck-a1, #8a7de0)" aria-label={t("controls.options.aria")}>{t("controls.options")}</Btn>}
      <Btn onClick={onRestart} tone="var(--deck-a1, #8a7de0)">{t("controls.restart")}</Btn>
      {onAbort && <Btn onClick={onAbort} tone="var(--deck-a1, #8a7de0)">{t("controls.quit")}</Btn>}
      {onToggleMute && <MuteButton muted={muted} onToggle={onToggleMute} />}
    </div>
  );
}
