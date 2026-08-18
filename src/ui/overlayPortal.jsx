import { createPortal } from "react-dom";

/* EINE Regel für alle Vollbild-Overlays: sie hängen an `document.body`, nie im Baum ihres Aufrufers.

   Der Grund ist eine CSS-Eigenheit, die dieses Projekt schon dreimal getroffen hat und die JEDES MAL still war:
   `backdrop-filter` (und ebenso `filter`, `transform`, `perspective`, `contain`, `will-change` darauf) macht ein
   Element zum CONTAINING BLOCK für `position: fixed`-Nachfahren. Ein Overlay in so einem Vorfahren ist damit
   nicht mehr viewport-fest, sondern hängt am Kasten des Vorfahren. Ist der zugleich ein Scroll-Container — bei
   den Vollbild-Bildschirmen hier der Normalfall — erscheint das Overlay exakt `scrollTop` Pixel zu hoch und
   bleibt dort stehen. Am Gerät gemessen: scrollTop 600 → `top` = −600 px; mit Portal → 0 px.

   Warum das nie jemand bemerkt: das Symptom braucht eine Scroll-Position. Wer ein neues Overlay einbaut und
   prüft, sieht es korrekt — der Spieler, der vorher nach unten gewischt hat, nicht. Und der Auslöser steht nicht
   im Overlay selbst, sondern in einem VORFAHREN: es reicht, dass irgendwann jemand einem Bildschirm einen Blur
   oder ein `transform` gibt, und ein Overlay drei Ebenen tiefer bricht. Deshalb gilt die Regel ausnahmslos und
   nicht nur dort, wo heute ein Vorfahre blurrt — sie ist die Versicherung gegen die nächste Anpassung.

   Farbsicher: `--deck-a1/a2` werden für genau diesen Fall zusätzlich auf `:root` gespiegelt (App.jsx), Overlays
   außerhalb von `.app-root` erben sie also weiterhin. `[data-skin]`/`[data-reduced-fx]` hängen ohnehin am `<html>`.
   React-Events blubbern durch den REACT-Baum, nicht den DOM-Baum → Escape, Klick-außen und das Schließen über
   den Aufrufer verhalten sich unverändert.

   OHNE DOM wird der Knoten unverändert zurückgegeben. Das ist kein Notnagel, sondern Pflicht: React kann Portale
   im Server-Renderer gar nicht darstellen, und `test/options-sections.test.js` rendert das Optionen-Overlay mit
   `renderToStaticMarkup`, um Sektions-Reihenfolge und Zuordnung zu prüfen. Ohne diesen Zweig hätte der Helfer
   diesen Test (und jeden künftigen statischen Render) zerlegt. Im Browser ändert der Zweig nichts — dort gibt es
   `document` immer. Dieselbe SSR-Vorsicht steht aus demselben Grund in mobileTier.js.

   Aufruf am Wurzelelement des Overlays:  `return overlayPortal(<div className="fixed inset-0 …">…</div>);`
   Wächter: test/overlay-nesting.test.js verlangt es für JEDES `fixed inset-0`-Element im Projekt. */
export const overlayPortal = (node) =>
  (typeof document === "undefined" ? node : createPortal(node, document.body));
