import { createRoot } from "react-dom/client";
import { Autostich } from "./App.jsx";
import { install as installErrorBuffer } from "./ui/errorBuffer.js"; // #396 Fehler-Ring-Puffer für den Melder
import { maybeResetForEpoch } from "./game/storage.js"; // #reset: einmaliger Neustart-Reset (nur Preview/Test-Namensraum)
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

createRoot(document.getElementById("root")).render(<Autostich />);
