import { lerpCol, clamp01 } from "./fxMath.js"; // #fx-helfer: geteilte Mathe-Helfer statt eigener Mischung

/* #ansage-deck — welche Farbe eine Groß-Ansage trägt.
   =============================================================================================
   Bis hierher lag die Antwort an drei Stellen und lautete dreimal anders:
     • Stark/Brutal/Irre trugen je einen FEST eingetragenen `chrome`-Block (7-Stopp-Verlauf +
       Glow + optionale Aura) — die Leiter eskalierte farblich Cyan → Violett → Magenta.
     • „Gönn dir" trug ein festes Gold (`#ffd24a`).
     • Nur Gottgleich und Lawine folgten der Deckfarbe, und auch die nur, wenn der
       Prunk-Farbmodus (`gottDeck`) an war.
   Vier von sechs Ansagen ignorierten das aktive Deck also vollständig. Jetzt tragen
   Stark/Brutal/Irre und „Gönn dir" IMMER die Deckfarbe; Gottgleich und Lawine behalten
   bewusst ihren Prunk-Schalter (dort ist die Farbe an den gekauften Effekt gekoppelt).

   DER PREIS, offen benannt: die drei unteren Stufen können sich nicht mehr über den FARBTON
   unterscheiden — bei einer Deckfarbe gibt es nur einen. Die Eskalation wandert deshalb auf die
   Achsen, die übrig bleiben und ohnehin schon tragen: Größe (68 / 78 / 90 px), das Wort selbst,
   die SÄTTIGUNG des Verlaufs (weniger Weiß je höher) und die zweite Glow-Lage (`aura`), die es
   im Original ebenfalls erst ab Brutal gab. Wer die Farbleiter zurückwill, braucht dafür drei
   Farben — und die widerspricht dann dem Deckbezug, nicht dieser Datei.

   Reines Modul (kein React, kein Canvas): der Wächter rechnet die Verläufe nach, statt
   Schreibweisen zu vergleichen. Dieselbe Bauart wie previewScale.js und packSort.js. */

const WEISS = "#ffffff";
const HEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Hex-String → gepackte 24-Bit-Zahl. `null`, wenn es kein lesbarer Hexwert ist (Kurzform erlaubt). */
export function hexInt(h) {
  const m = HEX.exec(String(h ?? "").trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
  return parseInt(s, 16);
}

/** Gepackte Zahl → `#rrggbb` (immer sechsstellig, damit CSS-Verläufe verlässlich parsen). */
export const intHex = (n) => `#${(n & 0xffffff).toString(16).padStart(6, "0")}`;

/** Zwei Hexwerte mischen. `null`, sobald einer nicht lesbar ist — der Aufrufer fällt dann zurück. */
export function mixHex(a, b, t) {
  const ai = hexInt(a), bi = hexInt(b);
  return ai === null || bi === null ? null : intHex(lerpCol(ai, bi, clamp01(t)));
}

/* Weiß-Anteil der beiden Zwischenstopps je Stufe — DIE Eskalations-Achse, seit die Farbe fest ist.
   Höhere Stufe = weniger Weiß = satter und dominanter. Die Werte sind an den alten festen Verläufen
   abgelesen: Stark war fast durchgehend Silber mit einem Hauch Cyan, Irre trug kräftiges Magenta. */
export const WEISS_JE_RANG = { 1: 0.78, 2: 0.70, 3: 0.62 };

/* Ab dieser Stufe bekommt die Ansage die zweite, weite Glow-Lage (`aura`). Im festen Satz hatten
   Brutal und Irre sie, Stark nicht — diese Grenze bleibt genau so stehen. */
export const AURA_AB_RANG = 2;

/** Der `chrome`-Block einer nicht-epischen Stufe aus den Deckfarben. `null` = Aufrufer nimmt seinen festen Satz. */
export function deckChrome(a1, a2, rank) {
  const weiss = WEISS_JE_RANG[rank];
  if (weiss == null || hexInt(a1) === null) return null;   // unbekannte Stufe / kein Deck → Rückfall
  const haupt = intHex(hexInt(a1));                        // normalisiert (Kurzform, fehlendes #)
  const zweit = hexInt(a2) === null ? null : intHex(hexInt(a2));
  const hell = mixHex(haupt, WEISS, weiss);
  /* Der Mittelstopp ist die ZWEITE Deckfarbe — derselbe Zweiton-Gedanke, den die epische Wortmarke
     schon hat. Fehlt sie (einfarbiges Deck), tritt ein helleres Eigen-Grau an ihre Stelle, damit
     der Verlauf in der Mitte nicht flach wird. */
  const mitte = zweit || mixHex(haupt, WEISS, weiss * 0.55);
  return {
    grad: `linear-gradient(100deg,${WEISS},${hell},${haupt},${mitte},${haupt},${hell},${WEISS})`,
    glow: haupt,
    aura: rank >= AURA_AB_RANG ? zweit : null,
  };
}

/* Das Farbpaar der EPISCHEN Wortmarke (GottChromeWord). Reihenfolge der drei Fälle ist die Regel:
     1. `deckAlways` („Gönn dir") — immer Deckfarbe, unabhängig vom Prunk-Schalter.
     2. feste `tier.color` — gewinnt, wo eine Stufe bewusst eine eigene Farbe trägt.
     3. sonst (Gottgleich, Lawine) — folgt dem Prunk-Farbmodus, sonst Chrome-Zweiton (`[null, null]`).
   `null` heißt für GottChromeWord ausdrücklich „nimm den Chrome-Zweiton", ist also ein gültiger
   Rückfall und kein Fehlerfall. */
export function epicWordColors(tier, gottDeck, a1, a2) {
  const paar = hexInt(a1) === null ? null : [a1, hexInt(a2) === null ? a1 : a2];
  if (tier?.deckAlways && paar) return paar;
  if (tier?.color) return [tier.color, null];
  return gottDeck && paar ? paar : [null, null];
}
