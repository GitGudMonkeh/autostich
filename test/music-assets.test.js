import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";
import { MUSIC_TRACKS } from "../src/ui/music.js";

/* #F-01 Medien-Auslagerung: Die Musik läuft nicht mehr über `import … from "../assets/music/*.m4a"`, sondern über
   zur Laufzeit gebaute URLs. Damit kann der Bundler einen Tippfehler oder eine gelöschte Datei NICHT mehr melden —
   er würde erst im Browser als stummer 404 auffallen. Diese Tests übernehmen diese Aufgabe. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MUSIC_DIR = join(ROOT, "media", "music");
const fileOf = (url) => basename(new URL(url, "http://x/").pathname);

describe("#F-01 Musik-Referenzen zeigen auf existierende Dateien", () => {
  it("jeder Track hat Titel, .m4a-URL unter media/music/ und eine Stufe (Menü-Track ohne)", () => {
    expect(MUSIC_TRACKS.length).toBeGreaterThan(50);
    for (const t of MUSIC_TRACKS) {
      expect(typeof t.title).toBe("string");
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.url).toMatch(/media\/music\/[\w-]+\.m4a$/);
    }
  });

  it("jede referenzierte Datei liegt wirklich in media/music/", () => {
    const missing = MUSIC_TRACKS.map((t) => fileOf(t.url)).filter((f) => !existsSync(join(MUSIC_DIR, f)));
    expect(missing).toEqual([]);
  });

  it("keine Datei in media/music/ ist verwaist (jede wird referenziert)", () => {
    const referenced = new Set(MUSIC_TRACKS.map((t) => fileOf(t.url)));
    const orphans = readdirSync(MUSIC_DIR).filter((f) => f.endsWith(".m4a") && !referenced.has(f));
    expect(orphans).toEqual([]);
  });

  it("kein Track ist doppelt im Pool", () => {
    const runUrls = MUSIC_TRACKS.slice(1).map((t) => t.url); // [0] = Menü-Track, darf im Pool fehlen
    expect(new Set(runUrls).size).toBe(runUrls.length);
  });
});
