import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite + React (JSX vorab kompiliert). Tailwind v4 als Vite-Plugin (kein Config-File).
// Vitest liest den `test`-Block aus dieser Config.
export default defineConfig(({ command }) => ({
  // Build läuft unter dem GitHub-Pages-Projektpfad /autostich/. Dev-Server bleibt auf "/"
  // (sonst läuft localhost unter dem Unterpfad). Der Testbranch-Deploy überschreibt die
  // Base per DEPLOY_BASE (→ /autostich/test/), damit die Preview-Page als Unterpfad läuft.
  base: command === "build" ? (process.env.DEPLOY_BASE || "/autostich/") : "/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // #292 §3: Bundle-Splitting — statt eines ~644-KB-Chunks eigene Chunks. `vendor` (React & Co.) ändert sich
        // selten → besser cachebar; die reine Spiel-Logik (game/) getrennt von der UI. Reduziert den größten Chunk
        // unter die Vite-Warnschwelle, ohne Lazy-Loading (kein Suspense-Flackern beim Overlay-Öffnen).
        manualChunks(id) {
          // Vites `__vitePreload`-Helfer ist ein VIRTUELLES Modul (`\0vite/preload-helper`) — ohne `node_modules`
          // im Pfad fiel er durch alle Zweige hier und wurde von Rollup frei zugeteilt: er landete im `pixi`-Chunk.
          // Weil der Entry den Helfer für JEDEN seiner ~25 dynamischen Imports braucht, hing damit der komplette
          // 517-KB-Pixi-Chunk als STATISCHER Import am Entry — Pixi wurde also auf jedem Seitenaufruf geladen,
          // geparst und ausgeführt (Top-Level-Extension-Registrierungen), entgegen der Absicht unten.
          // Explizit nach `vendor` (importiert der Entry ohnehin eager) → `pixi` bleibt rein asynchron.
          if (id.includes("preload-helper")) return "vendor";
          if (id.includes("node_modules")) {
            // Pixi (~570 KB) in einen EIGENEN Chunk. Er wird nur über den dynamischen Import der PixiStage erreicht
            // (env-gegatet auf Preview/Dev) → bleibt async und lädt NIE auf main. `vendor` (React & Co.) bleibt schlank
            // und eager cachebar. Sobald ein Pixi-Effekt bewusst live geht, wird der Chunk regulär mitgeladen.
            if (id.includes("pixi")) return "pixi";
            return "vendor";
          }
          if (id.includes("/src/game/")) return "game";
        },
      },
    },
  },
  test: {
    // Engine/Reducer sind reine Logik → schnelle Node-Umgebung reicht.
    environment: "node",
    include: ["test/**/*.test.js"],
  },
}));
