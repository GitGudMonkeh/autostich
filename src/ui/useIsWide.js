import { useState, useEffect } from "react";

/* #desktop — „Sind wir oberhalb des Desktop-Bruchpunkts?" als React-State.

   Der Desktop-Pass läuft sonst rein über CSS (`@media (min-width: 1280px)` plus die
   `display: contents`-Klammern), und das soll auch so bleiben: Layout gehört ins Stylesheet.
   Dieser Hook ist für die Fälle, in denen der Unterschied NICHT im Layout liegt, sondern in der
   DOM-Struktur selbst — und die kann keine Media Query beantworten:

     · Die Deck-Werkstatt hängt ihr Pack-Detail bis 1279 px als Portal an `document.body` (der
       Shop-Root trägt `backdrop-filter` und wäre sonst der Containing-Block für `position: fixed`);
       ab 1280 px steht es als zweite Spalte im Raster.
     · Der Upgrade-Baum schaltet zwischen Reitern und der Deck-Spalte um — zwei verschiedene
       Navigationen, nicht zwei Anordnungen derselben.

   1280 px ist derselbe Bruchpunkt wie in index.css. Ändert er sich dort, muss er hier mit —
   deshalb steht er als Konstante da und nicht verstreut in den Aufrufern.

   Bauart wie `useIsMobile` in CustomizeScreen.jsx: `matchMedia` + Listener, mit dem alten
   `addListener`-Rückfall für Browser ohne `addEventListener` am MediaQueryList. */
export const DESKTOP_MIN = 1280;

/* Eine Media Query als React-State. `useIsWide` ist der Sonderfall darauf — andere Aufrufer, die eine
   DOM-Entscheidung an einer Breite treffen müssen (nicht nur eine Anordnung), nehmen diesen hier, statt
   dieselben vier `matchMedia`-Zeilen zu kopieren. */
export function useMediaQuery(q) {
  const [on, setOn] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const upd = () => setOn(mq.matches);
    upd(); // Falls sich die Breite zwischen erstem Render und Effekt geändert hat.
    mq.addEventListener ? mq.addEventListener("change", upd) : mq.addListener(upd);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", upd) : mq.removeListener(upd));
  }, [q]);
  return on;
}

export function useIsWide() {
  return useMediaQuery(`(min-width: ${DESKTOP_MIN}px)`);
}

/* #mobil-emblem — die Telefon-Schwelle, EINMAL, aus demselben Grund wie `DESKTOP_MIN` darüber.

   640 px ist KEINE neue Zahl: es ist Tailwinds eingebautes `sm:`, und auf allen drei Auswahl-
   Bildschirmen ist es bereits der Punkt, an dem aus einer Kachel je Zeile zwei bzw. drei werden
   (`grid sm:grid-cols-2` / `sm:grid-cols-3`). Die Kachel-Embleme hängen an genau diesem Wechsel,
   weil eine einspaltige Kachel Platz in ihrer oberen rechten Ecke hat und eine zwei- oder
   dreispaltige nicht.

   ES IST BEWUSST KEINE NEGATION VON `useIsWide`. `!wide` wäre alles unter 1280 px und würde damit
   auch das Band 640–1279 anschalten, das der Umfang dieser Arbeit ausdrücklich ausnimmt: dort
   ändert sich nichts, und das ist eine Entscheidung, keine Lücke.

   639.98 statt 639: die Media Query muss bei einer fraktionalen Fensterbreite zwischen 639 und 640
   px eindeutig sein. `max-width: 639px` ließe 639.5 px in KEINEN der beiden Zweige fallen — weder
   Telefon noch `sm:` —, und die Kachel stünde dort einspaltig ohne Emblem da. */
export const PHONE_MAX = 639.98;

export function useIsPhone() {
  return useMediaQuery(`(max-width: ${PHONE_MAX}px)`);
}
