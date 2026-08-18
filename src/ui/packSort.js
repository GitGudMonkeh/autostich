/* Sortierung der Pack-Kacheln in der Werkstatt (Reiter „Packs" und „Herausforderungen").

   Zwei Modi, umgeschaltet über EINEN Knopf neben den Filtern:
   - `default` — die gewachsene Reihenfolge: Packs nach DP-Preis aufsteigend (billig oben), Herausforderungen
     in Register-Reihenfolge; das ausgerüstete Pack steht dabei vorn (`orderPacks` im Aufrufer).
   - `farbe`   — nach Farbton der Pack-Akzentfarbe (`a1`), also Rot → Gelb → Grün → Blau → Violett. Damit
     findet man ein Deck über die EINE Eigenschaft, die man beim Durchblättern wirklich sieht.

   Reines Modul ohne React: der Wächter (test/pack-sort.test.js) rechnet die Reihenfolge nach, statt eine
   Komponente rendern zu müssen — dasselbe Muster wie previewScale.js.

   Bewusst KEINE Sättigungs-/Helligkeits-Sortierung als zweite Achse in der Anzeige: das Auge gruppiert nach
   Farbton. Sättigung und Helligkeit dienen hier nur dazu, die unbunten Töne (Grau/Weiß/Schwarz) ans ENDE zu
   stellen — sie haben keinen sinnvollen Platz im Farbkreis und stünden sonst zufällig mitten im Regenbogen. */

export const SORT_DEFAULT = "default";
export const SORT_COLOR = "farbe";

// Unbunt ab hier: alles mit weniger Sättigung wandert ans Ende (Wert abgemessen an den Pack-Farben —
// die blasseste bunte Akzentfarbe liegt deutlich darüber, die Graustufen deutlich darunter).
export const NEUTRAL_S = 0.12;

/* #rgb: Kurz- (#abc) und Langform (#aabbcc). Unbekanntes/fehlendes → null, der Aufrufer behandelt das
   wie „unbunt" und stellt es hinten an, statt die ganze Sortierung mit NaN zu zerlegen. */
export function hexRgb(hex) {
  const s = String(hex || "").trim().replace(/^#/, "");
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* Farbton in Grad (0–360), Sättigung und Helligkeit 0–1 — HSL, wie CSS sie rechnet.
   Rückgabe `null` für alles, was kein lesbarer Hexwert ist. */
export function hexHsl(hex) {
  const rgb = hexRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = h * 60;
  return { h: h < 0 ? h + 360 : h, s, l };
}

/* Sortierschlüssel eines Packs: [unbunt?, Farbton, Helligkeit].
   Der Rot-Anfang ist bewusst 0° — ein Regenbogen fängt für die meisten mit Rot an, nicht mit Magenta. */
export function colorKey(pack) {
  const hsl = hexHsl(pack && pack.a1);
  if (!hsl || hsl.s < NEUTRAL_S) return [1, 0, hsl ? hsl.l : 0];
  return [0, hsl.h, hsl.l];
}

/* Nach Farbton sortieren. `Array.prototype.sort` ist seit ES2019 stabil → gleichfarbige Packs behalten
   ihre Ausgangsreihenfolge (bei den Packs also den Preis), es braucht keinen künstlichen Tiebreak. */
export function sortByColor(list) {
  return list.slice().sort((a, b) => {
    const ka = colorKey(a), kb = colorKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });
}

/* Der eine Einstieg für den Aufrufer: `base` ist die schon gewachsene Reihenfolge (inkl. „aktives Pack
   nach vorn"). Nur im Farbmodus wird umsortiert — und dort bewusst OHNE das Vorziehen, sonst risse das
   ausgerüstete Deck ein Loch in den Farbverlauf. */
export function sortPacks(base, mode) {
  return mode === SORT_COLOR ? sortByColor(base) : base;
}

/* Beschriftung des Knopfs = was der NÄCHSTE Klick tut (nicht der aktuelle Zustand). Auf dem Reiter
   „Herausforderungen" heißt der Gegenpol NICHT „Preis": cond-Packs haben keinen (`packPrice` → null),
   dort führt der Klick zurück in die Standard-Reihenfolge. */
export function sortLabelKey(mode, challenge) {
  if (mode === SORT_COLOR) return challenge ? "shop.sort.default" : "shop.sort.price";
  return "shop.sort.color";
}

export const nextSort = (mode) => (mode === SORT_COLOR ? SORT_DEFAULT : SORT_COLOR);
