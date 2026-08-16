import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createReadStream, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = join(ROOT, "media");
const MEDIA_MIME = { ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg" };

/* #F-01 Medien-Ordner im DEV-Server ausliefern. `media/` liegt bewusst AUSSERHALB von src/ und public/:
   - außerhalb src/, damit die 148 MB Musik nicht mehr in jeden Slot-Build wandern (s. src/ui/music.js),
   - außerhalb public/, weil Vite public/ ungefragt in jedes dist/ kopiert — genau die Duplizierung, die weg soll.
   Damit `npm run dev` trotzdem Musik hat, mountet dieses Plugin den Ordner unter /media/. Es greift NUR im
   Dev-Server (apply: "serve") und hat auf den Build keinerlei Wirkung. In Produktion liefert GitHub Pages
   denselben Pfad aus dem zentral veröffentlichten media/-Verzeichnis (Workflow deploy-media.yml).
   Bewusst ohne neue Abhängigkeit (kein sirv o. Ä.) — 30 Zeilen node:fs reichen. Range-Requests werden beantwortet,
   weil HTMLAudio sie zum Springen nutzt und Safari sonst gar nicht erst abspielt. */
const serveMediaInDev = () => ({
  name: "autostich-media-dev",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/media", (req, res) => {
      // Pfad-Traversal ausschließen: erst normalisieren, dann prüfen, dass wir MEDIA_DIR nicht verlassen.
      const rel = normalize(decodeURIComponent((req.url || "").split("?")[0]));
      const file = join(MEDIA_DIR, rel);
      if (!file.startsWith(MEDIA_DIR)) { res.statusCode = 403; return res.end("Forbidden"); }
      // Fehlende Datei hier hart als 404 beantworten statt an Vite weiterzureichen: der SPA-Fallback lieferte sonst
      // index.html mit Status 200, und das <audio>-Element bekäme HTML statt Ton — ein Tippfehler im Trackname wäre
      // im Dev praktisch unsichtbar. (Der Test test/music-assets.test.js fängt ihn zusätzlich vor dem Commit ab.)
      let stat;
      try { stat = statSync(file); } catch { res.statusCode = 404; return res.end("Not found: " + rel); }
      if (!stat.isFile()) { res.statusCode = 404; return res.end("Not found: " + rel); }
      const type = MEDIA_MIME[extname(file).toLowerCase()] || "application/octet-stream";
      res.setHeader("Content-Type", type);
      res.setHeader("Accept-Ranges", "bytes");
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
        if (!(start <= end && start < stat.size)) {
          res.statusCode = 416;
          res.setHeader("Content-Range", `bytes */${stat.size}`);
          return res.end();
        }
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
        res.setHeader("Content-Length", end - start + 1);
        return createReadStream(file, { start, end }).pipe(res);
      }
      res.setHeader("Content-Length", stat.size);
      return createReadStream(file).pipe(res);
    });
  },
});

// Vite + React (JSX vorab kompiliert). Tailwind v4 als Vite-Plugin (kein Config-File).
// Vitest liest den `test`-Block aus dieser Config.
export default defineConfig(({ command }) => ({
  // Build läuft unter dem GitHub-Pages-Projektpfad /autostich/. Dev-Server bleibt auf "/"
  // (sonst läuft localhost unter dem Unterpfad). Der Testbranch-Deploy überschreibt die
  // Base per DEPLOY_BASE (→ /autostich/test/), damit die Preview-Page als Unterpfad läuft.
  base: command === "build" ? (process.env.DEPLOY_BASE || "/autostich/") : "/",
  plugins: [react(), tailwindcss(), serveMediaInDev()],
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
