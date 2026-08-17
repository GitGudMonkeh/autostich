import { useState, useEffect } from "react";

/* #perf-scroll — „ist dieses Element gerade im Bild?"

   Anlass: die Spielseite ist auf dem Handy deutlich höher als der Viewport (unter dem Brett liegen die
   Fraktions-Panels, die Aufschlüsselung, die Leisten). Wer nach unten scrollt, schiebt das Battlefield aus dem
   Bild — und bis hierher lief jede Effektschleife dort mit voller Rate weiter, für ein Bild, das niemand sieht.
   Es gab im ganzen Projekt keine einzige Stelle, die auf Scrollen reagiert hat.

   Das ist derselbe Hebel, der beim Overlay-Gate (#perf-overlay) den größten Einzelgewinn gebracht hat — nur die
   andere Achse: dort verdeckte ein Vollbild-Overlay das Brett, hier scrollt es aus dem Bild.

   Bewusst `IntersectionObserver` und KEIN Scroll-Listener: der Beobachter meldet sich nur bei einer Änderung und
   rechnet außerhalb des Hauptthread-Layouts. Ein `scroll`-Handler, der `getBoundingClientRect()` aufruft, würde
   pro Scroll-Frame ein synchrones Layout erzwingen — also genau die Kosten verursachen, die er sparen soll.

   `rootMargin` startet die Effekte ein Stück VOR dem Einscrollen wieder. Ohne den Vorlauf sieht man beim
   Hochscrollen das Anlaufen (erste Frames einer Schleife, Aufbau des Standbilds). Kein Observer verfügbar
   (sehr alte Browser, Testumgebung) → `true`, also das bisherige Verhalten. */
export function useOnScreen(ref, rootMargin = "200px") {
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const obs = new IntersectionObserver(
      (entries) => { for (const e of entries) setOnScreen(e.isIntersecting); },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin]);

  return onScreen;
}
