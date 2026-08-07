#!/usr/bin/env node
/* Musik-Kompression (#276) — re-encodet die Musik-Assets mp3 → AAC/.m4a @ 128 kb/s.
   Nutzt ffmpeg-static (kein System-ffmpeg nötig). Reproduzierbar: nach neuen Tracks erneut laufen lassen.
   AAC/.m4a ist universell abspielbar (inkl. iOS-Safari im <audio>); Opus wäre kleiner, aber iOS-riskant.
   -movflags +faststart: moov-Atom nach vorn → progressives Streaming/schneller Start (wir streamen je Track).
   Aufruf: node scripts/compress-music.mjs   (Alias: npm run compress:music) */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const MUSIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "music");
const BITRATE = process.env.MUSIC_BITRATE || "128k";
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

const files = readdirSync(MUSIC_DIR).filter((f) => f.endsWith(".mp3"));
if (!files.length) { console.log("Keine .mp3 in", MUSIC_DIR); process.exit(0); }

let before = 0, after = 0;
for (const f of files) {
  const src = join(MUSIC_DIR, f);
  const out = join(MUSIC_DIR, f.replace(/\.mp3$/, ".m4a"));
  const inSize = statSync(src).size;
  // -vn: kein Cover/Video · -map_metadata -1: Tags strippen · -c:a aac -b:a: AAC-CBR · +faststart: streambar.
  execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", src, "-vn", "-map_metadata", "-1",
    "-c:a", "aac", "-b:a", BITRATE, "-movflags", "+faststart", out,
  ]);
  const outSize = statSync(out).size;
  before += inSize; after += outSize;
  console.log(`${f.padEnd(34)} ${mb(inSize).padStart(5)} MB → ${mb(outSize).padStart(5)} MB  (${Math.round((1 - outSize / inSize) * 100)} % kleiner)`);
}
console.log(`\nGesamt: ${mb(before)} MB → ${mb(after)} MB  (${Math.round((1 - after / before) * 100)} % kleiner, ${files.length} Tracks @ ${BITRATE})`);
console.log("Nächste Schritte: alte .mp3 entfernen + music.js-Imports auf .m4a umziehen.");
