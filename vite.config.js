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
  test: {
    // Engine/Reducer sind reine Logik → schnelle Node-Umgebung reicht.
    environment: "node",
    include: ["test/**/*.test.js"],
  },
}));
