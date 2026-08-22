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

/* #update: Beim Build eine kleine `version.json` an den Ausgabe-Wurzelpfad (→ `<base>/version.json`) legen.
   Sie trägt DENSELBEN Build-Stempel wie die App (version.js, aus VITE_BUILD_* im CI). Der laufende Tab pollt
   sie und meldet, wenn ein NEUERER Build deployt wurde (UpdateBanner). Bewusst NICHT unter /assets/ und keine
   .json-Endung im SW-Cache-Filter → der Service Worker fasst sie nicht an, sie kommt immer frisch vom Netz. */
const emitVersionJson = () => ({
  name: "emit-version-json",
  apply: "build",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({
        build: process.env.VITE_BUILD_NUM || null,
        sha: process.env.VITE_BUILD_SHA || null,
        env: process.env.VITE_ENV || null,
      }),
    });
  },
});

/* Pixis eigene Abhängigkeiten (aus pixi.js/package.json). Sie tragen „pixi" nicht im Pfad und müssen darum
   namentlich in den Pixi-Chunk geleitet werden — sonst landen sie im eager geladenen `vendor` (siehe die
   ausführliche Begründung an `manualChunks` unten). Ohne @types/* und @webgpu/types: reine Typpakete, die
   im Bundle nie auftauchen. */
export const PIXI_DEPS = [
  "@pixi/colord", "@xmldom/xmldom", "earcut", "eventemitter3",
  "gifuct-js", "ismobilejs", "parse-svg-path", "tiny-lru",
];

// Vite + React (JSX vorab kompiliert). Tailwind v4 als Vite-Plugin (kein Config-File).
// Vitest liest den `test`-Block aus dieser Config.
export default defineConfig(({ command }) => ({
  // Build läuft unter dem GitHub-Pages-Projektpfad /autostich/. Dev-Server bleibt auf "/"
  // (sonst läuft localhost unter dem Unterpfad). Der Testbranch-Deploy überschreibt die
  // Base per DEPLOY_BASE (→ /autostich/test/), damit die Preview-Page als Unterpfad läuft.
  base: command === "build" ? (process.env.DEPLOY_BASE || "/autostich/") : "/",
  plugins: [react(), tailwindcss(), serveMediaInDev(), emitVersionJson()],
  build: {
    /* #skillart/#perkart: Embleme NIE als data-URI ins JS inlinen. Vites Standardgrenze sind 4 kB, und fünf
       der 21 Blitz-Embleme liegen darunter (schlanke Motive komprimieren besser) — gemessen wanderten sie
       damit in den Entry-Chunk. Das kehrt genau die Absicht um: gerendert werden sie erst ab 1400 px, inline
       lädt sie aber JEDES Handy mit, bei jedem Seitenaufruf. Alles andere behält die Standardgrenze
       (`undefined` heißt „wie bisher entscheiden"). Wächter: test/skill-art.test.js, test/perk-art.test.js.

       #perkart (22.08.2026): `perkcats` und `legendaries` kamen dazu, und zwar BEVOR die Grenze sie fängt —
       das kleinste Kategorie-Emblem wiegt gebacken 4,4 kB und liegt damit rund 400 Byte über der Schwelle.
       Es hier nicht einzutragen hieße, sich darauf zu verlassen, dass kein künftiges Emblem schlanker
       komprimiert als die sieben von heute; genau diese Wette hat der Blitz-Satz verloren. */
    assetsInlineLimit: (filePath) =>
      (/[/\\]assets[/\\](skills|perkcats|legendaries)[/\\]/.test(filePath) ? false : undefined),
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
            //
            // ACHTUNG, das war die Lücke: `id.includes("pixi")` fängt nur Pixis EIGENE Dateien. Seine
            // Abhängigkeiten heißen nicht „pixi" und fielen deshalb in den Zweig darunter — also in den EAGER
            // geladenen `vendor`-Chunk. Damit lagen ~210 KB roh (@xmldom/xmldom allein ~150 KB, dazu earcut,
            // tiny-lru, eventemitter3, ismobilejs, parse-svg-path) auf dem kritischen Pfad JEDES Seitenaufrufs,
            // obwohl Pixi selbst sauber async blieb — die Absicht oben war damit zur Hälfte ausgehebelt.
            // Alle Namen unten sind laut `npm ls` ausschließlich über pixi.js erreichbar; sie gehören in
            // denselben async Chunk. Kommt eine Pixi-Version mit neuer Abhängigkeit, gehört sie hierher —
            // `test/bundle-split.test.js` zieht die Liste aus pixi/package.json und wird sonst rot.
            if (id.includes("pixi") || PIXI_DEPS.some((d) => id.includes("node_modules/" + d + "/"))) return "pixi";
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
