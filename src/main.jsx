import { createRoot } from "react-dom/client";
import { Autostich } from "./App.jsx";
import { install as installErrorBuffer } from "./ui/errorBuffer.js"; // #396 Fehler-Ring-Puffer für den Melder
import { maybeResetForEpoch, loadOptions } from "./game/storage.js"; // #reset: einmaliger Neustart-Reset (nur Preview/Test-Namensraum)
import { activeTestViewport } from "./ui/testViewport.js"; // #400 Test-Viewport (nur Preview-Build)
import { setLocale, getLocale, setPreviewLocale } from "./i18n/index.js"; // #zh-hans Sprache vor dem Mount
import "./index.css";

// PWA: Das Install-Prompt-Event (`beforeinstallprompt`) kann VOR dem React-Mount feuern → früh einfangen und global
// ablegen, damit der „Installieren"-Button es später auslösen kann. `appinstalled` räumt wieder auf.
if (typeof window !== "undefined") {
  // #396: So FRÜH wie möglich — der Puffer soll auch Fehler fangen, die noch vor dem React-Mount
  // auftreten (Chunk-Ladefehler, Skript-Parse-Probleme). Er ist der Grund, warum ein im Menü
  // geschriebener Report einen Absturz aus dem Lauf überhaupt noch belegen kann.
  installErrorBuffer(window);

  // #reset: EINMALIGER Voll-Reset zum v0.4-Rollout — jetzt in ALLEN deployten Builds (main + test + pixi), aber NICHT
  // im Dev-Server (`import.meta.env.PROD` grenzt das ab). Der Epoch-Stempel wird PRO NAMENSRAUM geführt (main: kein
  // Präfix · test/pixi: `preview_`), sodass jeder Spieler nur genau EINMAL zurückgesetzt wird — bereits zurückgesetzte
  // Test-/Pixi-Spieler bleiben unberührt. Läuft VOR dem React-Mount, damit die App gleich das frische Profil liest.
  maybeResetForEpoch(import.meta.env.PROD);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__installPrompt = e;
    window.dispatchEvent(new Event("pwa-installable"));
  });
  window.addEventListener("appinstalled", () => {
    window.__installPrompt = null;
    window.dispatchEvent(new Event("pwa-installed"));
  });

  // #perf C1: Service Worker registrieren — nur im Production-Build (nicht im Dev-Server, wo Caching stört) und erst
  // NACH `load`, damit weder der erste Paint noch die Desktop-Version negativ beeinflusst wird. Der SW cacht App-Shell +
  // statische Assets (Offline + Instant-Repeat-Load); Ton-Streaming/Bestenliste rührt er bewusst nicht an (siehe sw.js).
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* SW nie kritisch */ });
    });
  }
}

/* #zh-hans S1 — die Sprache steht VOR dem Mount.

   `index.html` kann nur eine feste Sprache behaupten; welche gilt, weiss erst das Profil. Bisher
   stand dort `de`, waehrend DEFAULT_LOCALE `en` ist, und `App.jsx` hat das Attribut erst in einem
   Effekt NACH dem Mount richtiggestellt. Der eine Frame dazwischen behauptete also die falsche
   Sprache — fuer Chinesisch heisst das, dass ein System-Fallback dort japanische Glyphenformen
   zeichnen kann, weil `lang` die Schriftwahl mitentscheidet.

   Hier wird derselbe Weg gegangen wie in der App, nicht ein zweiter: `loadOptions()` und
   `setLocale()`, dieselben Funktionen, keine zweite Lesart des Speichers. */
if (typeof document !== "undefined") {
  setLocale(loadOptions().lang || undefined);
}

/* #zh-hans Vorschau-Sprache — die zweite Boot-Entscheidung, und sie steht aus demselben Grund
   hier ausgeschrieben wie das Viewport-Tor darunter: Vite ersetzt `VITE_PREVIEW` beim Bauen,
   also faltet sich der ganze Block in einem `main`-Build weg.

   `?lang=zh-Hans` pinnt die angemeldete, aber unfertige Fixture-Sprache. Das ist der einzige
   Weg, den CJK-Zweig an den ECHTEN Bildschirmen zu beurteilen statt an einem Musterblatt —
   und der Grund, warum das Pin überhaupt existiert: `setLocale` weist eine unfertige Sprache
   ab, wie es soll, und würde sie beim Mount sofort wieder auf Englisch ziehen.

   VOR dem Mount, damit schon der erste Frame chinesisch ist. Den Rest erledigt die App von
   selbst: ihr Sprach-Effekt schreibt den zurückgegebenen Wert nach `documentElement.lang`,
   womit auch der `:lang(zh-Hans)`-Zweig greift. */
if (import.meta.env.VITE_PREVIEW === "1" && typeof window !== "undefined") {
  const lang = new URLSearchParams(window.location.search).get("lang");
  if (lang) setPreviewLocale(lang);
}

/* Erst jetzt stempeln, damit das Pin der Vorschau gewinnt und nicht ueberschrieben wird. */
if (typeof document !== "undefined") {
  try { document.documentElement.lang = getLocale(); } catch (e) { /* nie kritisch */ }
}

const rootEl = document.getElementById("root");

/* #400 Test viewport — the ONE boot decision of the harness.

   Read AFTER `maybeResetForEpoch` above, so a profile wipe cannot leave a stale size behind.

   The gate is written out here rather than hidden inside `activeTestViewport` on purpose: Vite
   substitutes `import.meta.env.VITE_PREVIEW` at build time, so in a `main` build this ternary folds
   to `null`, the `if` branch below becomes unreachable, and both the harness module and its dynamic
   import leave the graph entirely. A runtime check inside the helper would ship the whole feature and
   merely decline to run it.

   `null` — every production build, and every preview build with the switch off — takes the branch
   this file has always taken, with no wrapper element and no harness CSS anywhere near it. */
const testVp = import.meta.env.VITE_PREVIEW === "1"
  ? activeTestViewport(loadOptions(), window.location.search)
  : null;

if (testVp) {
  // Dynamic import: keeps the harness out of the entry chunk, and out of the module graph completely
  // once the condition above is statically false.
  import("./ui/TestViewportHarness.jsx").then((m) => m.mountTestViewportHarness(rootEl, testVp));
} else {
  createRoot(rootEl).render(<Autostich />);
}
