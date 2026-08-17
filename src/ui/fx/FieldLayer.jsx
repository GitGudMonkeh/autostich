import { lazy, Suspense } from "react";
import { FxBoundary } from "./FxBoundary.jsx";

/* Feld-Ebene(n) — der EINZIGE Renderpfad für die Shader-Feldeffekte (Aurora, Neon-Brandung, Leuchten).

   Es gab hier lange einen A/B-Umschalter (`?fx2=1`): links der alte Pfad mit je einer eigenen WebGL-Canvas pro
   Effekt, rechts der Kompositor. Der ist entfallen, und zwar bewusst OHNE dass der Kompositor sich als schneller
   erwiesen hätte — am Gerät gemessen war er weder schneller noch langsamer. Der Grund ist ein anderer: ein Schalter
   heißt zwei Implementierungen, und zwei Implementierungen driften. Genau daran hat dieses Projekt schon einmal
   Wochen verloren (dieselbe Arbeit lag mehrfach als verschiedene Objekte vor, s. CLAUDE.md). Der Kompositor gewinnt
   also nicht über Zahlen, sondern weil eine Fassung besser ist als zwei gleich schnelle.

   Entweder EINE Ebene (`layer` + flache Props) oder mehrere in EINER Bühne (`stack={[{ key, props }]}`, von unten
   nach oben). Der Stapel spart den zweiten WebGL-Kontext und das zweite Composite des Browsers.

   `FxBoundary` bleibt Pflicht: der Kompositor hängt an `React.lazy`, und scheitert der Chunk, WIRFT `lazy` beim
   Rendern. Die App hat keine andere Error-Boundary — ohne diese hier riss ein fehlgeschlagener Chunk den ganzen
   Baum ab (schwarzer Bildschirm, live passiert). Der Rückfall ist jetzt „kein Effekt" statt „alter Effekt": ein
   Effekt ist Schmuck und darf das Spiel nicht mitnehmen, aber eine zweite Fassung nur als Notnagel vorzuhalten
   wäre genau die Doppelung, die hier gerade verschwunden ist. */
const FieldCompositor = lazy(() => import("./FieldCompositor.jsx"));

export default function FieldLayer({ layer, stack = null, ...props }) {
  const name = stack ? stack.map((e) => e.key).join("+") : layer;
  return (
    <FxBoundary name={`Feld-Kompositor (${name})`} fallback={null}>
      <Suspense fallback={null}>
        <FieldCompositor layer={layer} stack={stack} {...props} />
      </Suspense>
    </FxBoundary>
  );
}
