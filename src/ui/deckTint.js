/* #gegnerdeck-farbe — die Gegner-Phasendecks in der Deckfarbe, EINMAL gebacken statt je Frame gefiltert.

   WAS: Die fünf Gegner-Rückseiten/Rahmen (Skill · Perk · Aufstellung · Architekt · Legendär) sind Neon-
   Linien auf fast reinem Schwarz. Ein `color`-Blend über so ein Motiv behält die HELLIGKEIT und tauscht
   nur Ton und Sättigung: Schwarz bleibt Schwarz, die Linien nehmen die Deckfarbe an. Zweifarbig, weil
   jedes Deck ein Farb-PAAR führt (a1/a2, themes.js) — der Verlauf nutzt beide.

   WARUM GEBACKEN, NICHT GEFILTERT (die eigentliche Entscheidung):
   Die Rückseite wird an ZWEI Wegen gezeichnet — als DOM-Bild (CardBack) und als Pixi-Textur im
   Deckflug/Schwarzen Loch (`backSrc`). Ein CSS-`mix-blend-mode` erreicht die Textur nicht; ein
   Pixi-Filter erreicht das DOM nicht. Beides einzeln zu bauen hieße: zwei Fassungen desselben Effekts,
   die auseinanderlaufen, sobald jemand eine anfasst. Deshalb entsteht hier EIN Bild, und beide Wege
   bekommen dieselbe URL. Kosten: je Motiv ein Canvas-Durchgang, einmal pro Lauf — danach ein Map-Treffer.

   VERWORFEN: die Varianten als Assets vorbacken. Fünf Motive × zwei Bilder × jede Deckfarbe ist eine
   Zahl, die mit jedem neuen Deck wächst, und das Repo hat mit ausgelagerten Medien schon einmal genau
   dieses Problem gelöst (music.js, #F-01). Zur Laufzeit ist es ein Canvas-Aufruf und null Bytes mehr.

   `globalCompositeOperation = "color"` ist dieselbe Rechnung wie `mix-blend-mode: color` in CSS — die
   Vorschau, an der die Optik abgenommen wurde, und dieses Modul kommen also nicht auseinander. */

// Cache: `src|a1|a2` → Object-URL. Gedeckelt, weil in der Werkstatt viele Decks nacheinander
// angesehen werden können; die ältesten Einträge werden freigegeben (revoke), sonst hält die Seite
// beliebig viele Blobs fest.
const MAX_CACHED = 24;
const cache = new Map();
const inFlight = new Map();

export const tintKey = (src, a1, a2) => `${src}|${a1}|${a2}`;

function remember(key, url) {
  cache.set(key, url);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    const dead = cache.get(oldest);
    cache.delete(oldest);
    try { URL.revokeObjectURL(dead); } catch (e) { /* egal */ }
  }
}

/** Fertige Fassung, falls sie schon gebacken ist — sonst `null` (Aufrufer zeigt so lange das Original). */
export function tintedUrl(src, a1, a2) {
  if (!src || !a1) return null;
  return cache.get(tintKey(src, a1, a2)) || null;
}

/* Ein Motiv einfärben. Liefert IMMER eine URL: klappt etwas nicht (kein Canvas, Bild kaputt, Blob
   verweigert), kommt das Original zurück — ein Farbmodus darf nie dazu führen, dass gar keine Karte
   mehr da ist. Mehrfachaufrufe auf denselben Schlüssel teilen sich einen Durchgang (inFlight). */
export function tintImage(src, a1, a2) {
  if (!src || !a1) return Promise.resolve(src);
  const key = tintKey(src, a1, a2);
  const done = cache.get(key);
  if (done) return Promise.resolve(done);
  const running = inFlight.get(key);
  if (running) return running;
  if (typeof document === "undefined" || typeof Image === "undefined") return Promise.resolve(src);

  const job = new Promise((resolve) => {
    const img = new Image();
    const fail = () => resolve(src);
    img.onerror = fail;
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext("2d");
        if (!ctx || !c.width || !c.height) { fail(); return; }
        ctx.drawImage(img, 0, 0);
        // Der Verlauf läuft über die Diagonale — dieselbe Richtung wie in der abgenommenen Vorschau.
        const g = ctx.createLinearGradient(0, 0, c.width, c.height);
        g.addColorStop(0, a1);
        g.addColorStop(1, a2 || a1);
        ctx.globalCompositeOperation = "color";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.globalCompositeOperation = "source-over";
        if (typeof c.toBlob !== "function") { fail(); return; }
        c.toBlob((blob) => {
          if (!blob) { fail(); return; }
          const url = URL.createObjectURL(blob);
          remember(key, url);
          resolve(url);
        }, "image/webp");
      } catch (e) { fail(); }
    };
    img.src = src;
  }).finally(() => inFlight.delete(key));

  inFlight.set(key, job);
  return job;
}

