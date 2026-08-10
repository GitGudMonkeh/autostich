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
