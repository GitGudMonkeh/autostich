/* Münz-Ökonomie (docs/muenz-oekonomie.md §4) — das Münzzeichen und der Betrag, an EINER Stelle.
   Die Währung steht auf vier Bildschirmen (Statusleiste, Skill-, Aufstell-, Architekt-Phase) und an
   jedem Kaufknopf; ohne gemeinsamen Ursprung driften Zeichen, Gold und Ziffernbreite auseinander.

   GEZEICHNET STATT GETIPPT, aus dem Grund, den `modalIcons.jsx` und `optionsBits.jsx` schon
   protokollieren: ein Textglyph hängt am Schriftschnitt und fällt unter einer Ersatzschrift auf etwas
   anderes zurück. Gleiches Raster (16), gleiche Strichstärke (1.4), `currentColor`, `aria-hidden`.

   ⚠ Das Zeichen selbst ist NICHT vom Owner abgenommen — der Plan sagt „Münzsymbol", nicht welches.
   Es liegt deshalb hier allein: ein anderes Zeichen ist ein Pfad, kein Umbau. */

import { fmtNum } from "../i18n/index.js";

export const COIN_GOLD = "#d4a63a"; // dasselbe Gold wie Score und Neuwurf — die Währung führt keine neue Farbe ein

// Zwei Kreise: Rand und Prägung. Bewusst anders als das `info`/`block`-Rund der Modal-Icons, die den
// Innenraum leer lassen — nebeneinander sollen die drei nicht verwechselbar sein.
const COIN_PATH = "M8 1.9a6.1 6.1 0 100 12.2 6.1 6.1 0 000-12.2M8 5.1a2.9 2.9 0 100 5.8 2.9 2.9 0 000-5.8";

export function CoinIcon({ size = 13, className = "" }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "-0.12em", flex: "none" }}>
      <path d={COIN_PATH} />
    </svg>
  );
}

/* Betrag = Zeichen + Zahl. `minDigits` hält die Breite fest, damit eine Leiste oder ein Knopf beim
   Hochzählen nicht springt (§4: der Kontostand kann dreistellig werden). `ch` ist hier das richtige
   Maß, weil `tabular-nums` alle Ziffern gleich breit macht. */
export function CoinAmount({ n = 0, size = 13, minDigits = 0, dim = false, className = "", style = null }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}
      style={{ color: COIN_GOLD, opacity: dim ? 0.45 : 1, ...style }}>
      <CoinIcon size={size} />
      <span className="ty-num" style={{ fontVariantNumeric: "tabular-nums", textAlign: "right", minWidth: minDigits ? `${minDigits}ch` : undefined }}>
        {fmtNum(n)}
      </span>
    </span>
  );
}
