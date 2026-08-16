/* FEHLER-RING-PUFFER (#396).

   Warum es das braucht: Der Melder sitzt im Hauptmenü, der Absturz passiert aber IM Lauf. Zwischen
   beidem liegt „zurück ins Menü" — ohne Puffer wäre der Fehler bis zur Meldung längst weg. Der
   Puffer überbrückt genau diese Lücke und ist damit der Grund, warum die Menü-Variante trotzdem
   brauchbare Reports liefert.

   Bewusst winzig und ohne Abhängigkeiten: ein Array fester Länge im Modul-Scope. Kein
   localStorage — ein Reload ist ein neuer Kontext, und alte Fehler eines vorigen Besuchs würden
   den Report eher verwirren als helfen.

   Rein genug für Tests: `install()` ist der einzige Teil, der `window` anfasst. */

const MAX = 5;          // die letzten fünf Fehler — mehr liest im Dashboard ohnehin niemand
const MAX_LEN = 300;    // je Eintrag, damit ein Endlos-Stacktrace den Report nicht sprengt

let ring = [];
let installed = false;

// Eine Zeile je Fehler: „Message @ datei:zeile". Der volle Stacktrace bringt in einem
// minifizierten Prod-Bundle ohne Sourcemaps nichts — Ort + Wortlaut reichen zum Wiederfinden.
function line(msg, src, lineNo, colNo) {
  const where = src ? ` @ ${String(src).split("/").pop()}${lineNo ? `:${lineNo}${colNo ? `:${colNo}` : ""}` : ""}` : "";
  return `${String(msg == null ? "?" : msg)}${where}`.slice(0, MAX_LEN);
}

// Einen Eintrag aufnehmen. Direkt aufrufbar (Tests) — der Ring bleibt bei MAX Einträgen stehen.
export function pushError(text) {
  const s = String(text == null ? "" : text).trim().slice(0, MAX_LEN);
  if (!s) return;
  // Denselben Fehler nicht zwanzigmal: eine Render-Schleife würde den Ring sonst mit einer
  // einzigen Meldung füllen und die vorherigen (oft aufschlussreicheren) verdrängen.
  if (ring.length && ring[ring.length - 1] === s) return;
  ring.push(s);
  if (ring.length > MAX) ring = ring.slice(-MAX);
}

// Die gesammelten Fehler als eine Textspalte (neueste zuletzt) bzw. "" wenn nichts anlag.
export const errorLog = () => ring.join("\n");

export const clearErrors = () => { ring = []; };

/* Einmal in main.jsx installieren. Beide Kanäle: `onerror` fängt synchrone Fehler,
   `unhandledrejection` die abgelehnten Promises (in dieser Codebase der häufigere Fall — fetch,
   dynamische Imports, Audio-Dekodierung). */
export function install(win = typeof window !== "undefined" ? window : null) {
  if (!win || installed) return;
  installed = true;
  win.addEventListener("error", (e) => {
    pushError(line(e && (e.message || e.type), e && e.filename, e && e.lineno, e && e.colno));
  });
  win.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    pushError(`unhandled: ${(r && (r.message || r)) || "?"}`);
  });
}
