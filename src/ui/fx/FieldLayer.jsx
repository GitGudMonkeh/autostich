import { lazy, Suspense } from "react";
import { FxBoundary } from "./FxBoundary.jsx";

/* #kompositor A/B — EIN Umschalter für alle Feld-Ebenen.

   `?fx2=1` schaltet die Feld-Ebene vom heutigen Ein-Canvas-Pfad (je Effekt eine eigene raw-WebGL-Canvas) auf den
   Kompositor um (eine Bühne, Auflösung je Ebene). Default AUS — der alte Pfad bleibt der ausgelieferte, solange
   der Umbau nicht durchgemessen ist. Hinter demselben Preview/Dev-Gate wie FX_RENDERER, damit Prod nichts davon
   sieht und der Minifier den Leser wegfaltet. Absicht des Schalters: derselbe Build, dasselbe Gerät, EIN
   Unterschied — nur so ist der Kompositor-Gewinn belegbar statt behauptet.

   Bewusst ein ENTWEDER/ODER: liefen alte und neue Fassung gleichzeitig, wäre die Fläche doppelt bezahlt und jede
   Messung wertlos. Die alte Fassung ist gleichzeitig der Rückfall — scheitert der Kompositor (Chunk, WebGL,
   Shader), sieht der Spieler den bisherigen Effekt statt eines schwarzen Bildschirms. Ohne diese Grenze riss ein
   fehlgeschlagener lazy-Chunk den ganzen React-Baum ab; die App hat sonst keine Error-Boundary.

   Warum als eigene Datei und nicht inline im Battlefield: die Umschaltung ist je Ebene identisch und stand nach
   der zweiten Ebene wortgleich zweimal da. */
const FieldCompositor = lazy(() => import("./FieldCompositor.jsx"));

export const FIELD_COMPOSITOR = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV)
  && (() => { try { return new URLSearchParams(window.location.search).get("fx2") === "1"; } catch { return false; } })();

/* `fallback` ist die bisherige Fassung dieser Ebene — sie rendert ohne `?fx2=1` UND als Rückfall im Fehlerfall.
   Alle weiteren Props gehen unverändert an den Kompositor. */
export default function FieldLayer({ layer, fallback, ...props }) {
  if (!FIELD_COMPOSITOR) return fallback;
  return (
    <FxBoundary name={`Feld-Kompositor (${layer})`} fallback={fallback}>
      <Suspense fallback={null}>
        <FieldCompositor layer={layer} {...props} />
      </Suspense>
    </FxBoundary>
  );
}
