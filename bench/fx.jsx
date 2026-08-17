/* Isolierter FX-Messstand (#perf). Mountet GENAU EINEN Effekt formatfüllend — ohne Battlefield, ohne Score-Floats,
   ohne Ansagen. Das ist Absicht und zugleich die Grenze der Messung: im echten Spiel laufen mehrere Effekte
   gleichzeitig und das Layout ist permanent schmutzig, hier misst man den Effekt FÜR SICH. Die Zahlen taugen
   deshalb zum VERGLEICHEN (vorher/nachher, Effekt gegen Effekt), nicht als absolute Spielrate.

   Aufruf über maintenance/fx-bench.mjs; direkt im Browser: /bench/fx.html?fx=aurora
   Nicht Teil des Builds — Vite bündelt nur index.html. */
import { createRoot } from "react-dom/client";
/* App-CSS ist PFLICHT, nicht Kosmetik: Aurora und Neon-Brandung positionieren ihre Canvas über Tailwind-Klassen
   (`absolute inset-0 w-full h-full`). Ohne das Stylesheet bleibt die Canvas auf ihren 300×150 Standardmaßen stehen,
   der Effekt malt auf eine Briefmarke — und der Messstand meldet „kostet nichts". Genau so gemessen (erst 0,2 % für
   Aurora, dann per DOM-Probe als 300×150-Canvas entlarvt). Wer hier einen Effekt ergänzt: prüfen, ob seine Canvas
   die erwartete Größe hat, bevor die Zahl geglaubt wird — `maintenance/fx-bench.mjs` tut das jetzt automatisch. */
import "../src/index.css";
import AuroraFieldGL from "../src/ui/fx/AuroraFieldGL.jsx";
import NeonSurfFieldGL from "../src/ui/fx/NeonSurfFieldGL.jsx";
import CubeMatrixField from "../src/ui/fx/CubeMatrixField.jsx";
import { FrostIce } from "../src/ui/fx/FrostIce.jsx";
import { MossGrow } from "../src/ui/fx/MossGrow.jsx";

const A1 = "#35e0ff", A2 = "#ff5db1";

/* BÜHNENGRÖSSE ist Teil der Messung, nicht Deko. Die Kosten dieser Effekte hängen fast nur an „Canvas-Pixeln pro
   Sekunde" (im Prunk-Messstand nachgemessen) — ein Karteneffekt formatfüllend gemountet misst also etwas, das es im
   Spiel nicht gibt. Karte = 104×144 (Card.jsx), Feld = Viewport. Faktor dazwischen: rund 22×.
     field → inset:0 · card → 104×144 mittig */
const CARD = { position: "absolute", left: "50%", top: "50%", width: 104, height: 144, transform: "translate(-50%,-50%)" };

// Jeder Eintrag mountet den Effekt in seinem TYPISCHEN Spielzustand (nicht im Extremfall) — sonst misst man
// eine Situation, die im Lauf kaum vorkommt. `active` bleibt true: gemessen wird ja der laufende Effekt.
const FX = {
  aurora:    { where: "field", el: () => <AuroraFieldGL color={A1} color2={A2} deckColored animate /> },
  neonsurf:  { where: "field", el: () => <NeonSurfFieldGL color={A1} color2={A2} deckColored animate /> },
  /* Würfel-Matrix zieht im Spiel ZWEI formatfüllende Canvas auf (Battlefield.jsx: mode="field" + mode="spots") —
     deshalb beide einzeln messbar. `lite` ist hier keine Kosmetik: die Datei hängt ihre Deckel an die OPTION `lite`,
     nicht an den Gerätetyp, also läuft sie auf einem Handy mit „Effekte voll" im vollen Desktop-Pfad. */
  cubematrix:{ where: "field", el: () => <CubeMatrixField mode="field" color={A1} color2={A2} deckColored /> },
  cubelite:  { where: "field", el: () => <CubeMatrixField mode="field" color={A1} color2={A2} deckColored lite /> },
  cubespots: { where: "field", el: () => <CubeMatrixField mode="spots" color={A1} color2={A2} deckColored /> },
  cubespotsl:{ where: "field", el: () => <CubeMatrixField mode="spots" color={A1} color2={A2} deckColored lite /> },
  frostice:  { where: "card",  el: () => <FrostIce mass={6} deckTint deckColor={A1} deckColor2={A2} /> },
  mossgrow:  { where: "card",  el: () => <MossGrow growth={6} deckTint deckColor={A1} deckColor2={A2} /> },
};

const key = new URLSearchParams(location.search).get("fx") || "aurora";
// „leer" = Nullmessung: React, rAF-Schleife und Messstand selbst, ohne jeden Effekt. Ohne diese Zeile weiß man nicht,
// wie viel der gemeldeten Last überhaupt vom Effekt kommt.
const entry = key === "leer" ? { where: "field", el: () => null } : FX[key];
const root = createRoot(document.getElementById("stage"));
/* BEWUSST OHNE StrictMode. Der Doppel-Mount von StrictMode ruft den Cleanup der WebGL-Felder, und der ruft
   `WEBGL_lose_context.loseContext()`. Ein erneutes `getContext()` auf DERSELBEN Canvas liefert danach einen weiterhin
   verlorenen Kontext (ausführlich im Kopf von AuroraFieldGL.jsx, #313/#342-bugfix) → Aurora und Neon-Brandung blieben
   still auf ihren 300×150 Standardmaßen stehen und der Messstand meldete für beide „kostet nichts". Im Spiel gibt es
   den Doppel-Mount nicht (main.jsx rendert ohne StrictMode), hier wäre er also ein reines Mess-Artefakt. */
root.render(
  entry
    ? <div style={entry.where === "card" ? CARD : { position: "absolute", inset: 0 }}><entry.el /></div>
    : <div style={{ color: "#f66", padding: 16 }}>Unbekannt: {key}</div>,
);

/* Frame-Abstände sammeln. Bewusst rAF-Deltas und nicht performance.measure: gemessen werden soll, ob der Effekt
   den Haupt-Thread so weit belegt, dass Frames sich dehnen — genau das spürt der Spieler als Ruckeln. */
const frames = [];
let prev = 0;
function loop(ts) {
  if (prev) frames.push(ts - prev);
  prev = ts;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__benchReset = () => { frames.length = 0; };
window.__benchRead = () => frames.slice();
window.__benchFx = key;
