import { useState, useEffect } from "react";

/* #desktop — „Sind wir oberhalb des Desktop-Bruchpunkts?" als React-State.

   Der Desktop-Pass läuft sonst rein über CSS (`@media (min-width: 1400px)` plus die
   `display: contents`-Klammern), und das soll auch so bleiben: Layout gehört ins Stylesheet.
   Dieser Hook ist für die Fälle, in denen der Unterschied NICHT im Layout liegt, sondern in der
   DOM-Struktur selbst — und die kann keine Media Query beantworten:

     · Die Deck-Werkstatt hängt ihr Pack-Detail bis 1399 px als Portal an `document.body` (der
       Shop-Root trägt `backdrop-filter` und wäre sonst der Containing-Block für `position: fixed`);
       ab 1400 px steht es als zweite Spalte im Raster.
     · Der Upgrade-Baum schaltet zwischen Reitern und der Deck-Spalte um — zwei verschiedene
       Navigationen, nicht zwei Anordnungen derselben.

   1400 px ist derselbe Bruchpunkt wie in index.css. Ändert er sich dort, muss er hier mit —
   deshalb steht er als Konstante da und nicht verstreut in den Aufrufern.

   Bauart wie `useIsMobile` in CustomizeScreen.jsx: `matchMedia` + Listener, mit dem alten
   `addListener`-Rückfall für Browser ohne `addEventListener` am MediaQueryList. */
export const DESKTOP_MIN = 1400;

export function useIsWide() {
  const q = `(min-width: ${DESKTOP_MIN}px)`;
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setWide(mq.matches);
    on(); // Falls sich die Breite zwischen erstem Render und Effekt geändert hat.
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, [q]);
  return wide;
}
