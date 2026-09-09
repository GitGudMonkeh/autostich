/* Münz-Ökonomie (docs/muenz-oekonomie.md §4) — das Münzzeichen und der Betrag, an EINER Stelle.
   Die Währung steht auf vier Bildschirmen (Statusleiste, Skill-, Aufstell-, Architekt-Phase) und an
   jedem Kaufknopf; ohne gemeinsamen Ursprung driften Zeichen, Gold und Ziffernbreite auseinander.

   GEZEICHNET STATT GETIPPT, aus dem Grund, den `modalIcons.jsx` und `optionsBits.jsx` schon
   protokollieren: ein Textglyph hängt am Schriftschnitt und fällt unter einer Ersatzschrift auf etwas
   anderes zurück. Gleiches Raster (16), gleiche Strichstärke (1.4), `currentColor`, `aria-hidden`.

   ⚠ Das Zeichen selbst ist NICHT vom Owner abgenommen — der Plan sagt „Münzsymbol", nicht welches.
   Es liegt deshalb hier allein: ein anderes Zeichen ist ein Pfad, kein Umbau. */

import { fmtNum, t } from "../i18n/index.js";

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
export function CoinAmount({ n = 0, size = 13, minDigits = 0, dim = false, have = null, className = "", style = null }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}
      style={{ color: COIN_GOLD, opacity: dim ? 0.45 : 1, ...style }}>
      <CoinIcon size={size} />
      <span className="ty-num" style={{ fontVariantNumeric: "tabular-nums", textAlign: "right", minWidth: minDigits ? `${minDigits}ch` : undefined }}>
        {fmtNum(n)}
      </span>
      {/* Owner 2026-09-08: neben dem PREIS steht in Klammern, was man hat. Sonst muss man für jede
          Kaufentscheidung nach oben in die Leiste schauen und die Differenz im Kopf bilden — genau der
          Blickwechsel, den ein Preis am Knopf vermeiden soll. Grün, wenn es reicht, rot, wenn nicht.
          `have === null` heißt „ich bin selbst ein Kontostand" — dann gibt es nichts zu vergleichen. */}
      {have != null && (
        <span className="ty-num opacity-80" style={{ fontVariantNumeric: "tabular-nums", color: have >= n ? "#5ab87a" : "#e0605a" }}>
          ({fmtNum(have)})
        </span>
      )}
    </span>
  );
}

/* Eine Gutschrift im Moment ihres Anfallens (§2.3, Anzeige §4): ein „+N", das über dem Kontostand
   aufsteigt und von selbst wieder geht. Ohne sie zählt die Leiste stumm hoch, und niemand lernt, dass
   Ablehnen zahlt — die Zahlung wäre da, die Regel unsichtbar.

   KEIN Zustand und kein Timer: die Animation endet bei Opacity 0 und läuft mit `forwards` aus. Ausgelöst
   wird sie vom React-`key` — und der ist die laufende Nummer `seq`, nicht der Betrag: zweimal +6
   hintereinander sind zwei Ereignisse und sollen zweimal aufblitzen. Absolut positioniert, damit die
   Leiste beim Aufblitzen nicht springt; der Elternteil setzt dafür `position: relative`. */
export function CoinGain({ gain = null }) {
  if (!gain || !(gain.n > 0)) return null;
  return (
    <span key={gain.seq} aria-hidden="true" className="ty-num pointer-events-none"
      style={{ position: "absolute", top: 0, right: 10, opacity: 0, color: "#5ab87a", fontSize: 13, fontWeight: 700,
               fontVariantNumeric: "tabular-nums", animation: "as-coingain 1500ms ease-out forwards" }}>
      +{fmtNum(gain.n)}
    </span>
  );
}

/* Beschriftung des Neuwurf-Knopfs (§3.1) — zwei Zeilen: oben die Handlung, unten was sie kostet.

   Der PREIS steht IMMER da (Owner 2026-09-08). Vorher zeigte der Knopf nur die Anzahl, solange Gratis-
   Neuwürfe übrig waren; mit zwei Gratis-Würfen je Lauf und Pool war die Währung damit auf Tür, Skill-
   und Perk-Angebot die ersten zwei Male gar nicht zu sehen. Wer den Preis nicht sieht, plant nicht mit
   ihm — und die Treppe (jeder weitere teurer) lernt man nur, wenn man sie liest.

   Am Knopf und nicht im Tooltip: auf dem Handy gibt es keine Tooltips, und ein Kauf, dessen Preis man
   erst durch Antippen erfährt, ist ein Fehlkauf. `r` kommt aus `rerollOffer` (coins.js), damit Knopf und
   Reducer dieselbe Rechnung benutzen. Fehlen die Münzen, steht der Preis blass da: den Kauf sieht man,
   auslösen lässt er sich nicht. */
export function RerollLabel({ r, freeKey, buyKey, have = null }) {
  return (
    <span className="inline-flex flex-col items-center leading-tight">
      <span>{t(r.free ? freeKey : buyKey)}</span>
      <span className="text-meta-1 inline-flex items-center gap-1 mt-0.5 opacity-85">
        {r.free
          ? <>{t("reroll.free", { n: r.tokens })}<span className="opacity-50">·</span>{t("reroll.then")}<CoinAmount n={r.nextPrice} size={11} have={have} /></>
          : <CoinAmount n={r.price} size={12} dim={!r.can} have={have} />}
      </span>
    </span>
  );
}
