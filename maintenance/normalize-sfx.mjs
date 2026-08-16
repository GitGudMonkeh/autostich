/* maintenance/normalize-sfx.mjs — SFX-Aufbereitung für src/assets/sounds/.
 *
 * Normalisiert Klangeffekte auf −16 LUFS (EBU R128, Zwei-Pass-loudnorm) und encodiert
 * sie zu MP3 192 kb/s (libmp3lame) — passend zum Swell-Bestand in src/assets/sounds/*.mp3
 * (Referenz fx_supernova ≈ −16 LUFS). Anders als die Musik (−14 LUFS, AAC/.m4a, media/):
 * SFX liegen als .mp3 im Vite-Graph (import in src/ui/audio.js) und werden mitgebaut.
 * Eingebettete Cover-/Video-Streams werden entfernt (-map 0:a:0); Samplerate/Kanäle der
 * Quelle bleiben erhalten (kein Zwangs-Stereo → Mono-SFX bleiben schlank).
 *
 * Nutzung:
 *   node maintenance/normalize-sfx.mjs --out <ordner> <input1.mp3> [input2 ...]
 *   node maintenance/normalize-sfx.mjs --out <ordner> --verify <input...>
 *   # In-Place (überschreibt die Quelle NACH erfolgreicher Aufbereitung):
 *   node maintenance/normalize-sfx.mjs --inplace src/assets/sounds/fx_neu.mp3
 *
 * Ausgabe: <ordner>/<basisname>.mp3  (Basisname der Eingabe ohne Erweiterung).
 * Voraussetzung: ffmpeg + ffprobe im PATH.
 *
 * HINWEIS zu kurzen/spitzen SFX: loudnorm arbeitet linear (reine Verstärkung, keine
 * Dynamikänderung). Ein kurzer Transient mit fast 0 dBTP kann so nicht gleichzeitig auf
 * −16 LUFS UND unter die −1,5-dBTP-Decke — dann gewinnt die Peak-Decke und die Lautheit
 * landet etwas unter dem Ziel (physikalisch korrekt, ohne Kompression nicht lösbar).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { basename, extname, join, dirname } from "node:path";

const TARGET = { I: -16, TP: -1.5, LRA: 11 }; // EBU R128: Integrated −16 LUFS (SFX-Swell-Bestand), True Peak −1.5 dBTP, LRA 11
const ENCODE = ["-c:a", "libmp3lame", "-b:a", "192k"]; // .mp3, Samplerate/Kanäle der Quelle beibehalten

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.error) throw new Error(`${cmd} nicht ausführbar: ${r.error.message}`);
  return r;
}

// Pass 1: loudnorm im Analyse-Modus; ffmpeg schreibt den Mess-JSON nach stderr.
function measure(input) {
  const af = `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`;
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", af, "-f", "null", "-"]);
  const err = r.stderr || "";
  const m = err.match(/\{[^{}]*"input_i"[\s\S]*?\}/);
  if (!m) throw new Error(`loudnorm-Messung fehlgeschlagen für ${input}\n${err.slice(-400)}`);
  const j = JSON.parse(m[0]);
  return {
    I: j.input_i, TP: j.input_tp, LRA: j.input_lra, thresh: j.input_thresh,
    offset: j.target_offset ?? j.offset ?? "0.0",
  };
}

// Pass 2: gemessene Werte anwenden (linear), Cover raus, MP3 schreiben.
function encode(input, out, meas) {
  const af =
    `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}` +
    `:measured_I=${meas.I}:measured_TP=${meas.TP}:measured_LRA=${meas.LRA}` +
    `:measured_thresh=${meas.thresh}:offset=${meas.offset}:linear=true`;
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-y", "-i", input, "-map", "0:a:0", "-af", af, ...ENCODE, out]);
  if (r.status !== 0) throw new Error(`Encode fehlgeschlagen für ${input}\n${(r.stderr || "").slice(-400)}`);
}

// Optional: Ergebnis-Lautheit gegenprüfen (voller Decode) → sollte ~ −16.0 LUFS sein.
function verifyLufs(file) {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"]);
  const m = (r.stderr || "").match(/Integrated loudness[\s\S]*?I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
  return m ? Number(m[1]) : NaN;
}

function main() {
  const argv = process.argv.slice(2);
  let out = null, verify = false, inplace = false;
  const inputs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--verify") verify = true;
    else if (argv[i] === "--inplace") inplace = true;
    else inputs.push(argv[i]);
  }
  if ((!out && !inplace) || inputs.length === 0) {
    console.error("Nutzung: node maintenance/normalize-sfx.mjs (--out <ordner> | --inplace) [--verify] <input...>");
    process.exit(2);
  }
  if (out && !existsSync(out)) mkdirSync(out, { recursive: true });

  let ok = 0;
  for (const input of inputs) {
    if (!existsSync(input)) { console.error(`⚠ übersprungen (fehlt): ${input}`); continue; }
    // In-Place: erst in eine Temp-Datei neben der Quelle schreiben, dann atomar ersetzen (nie eine halbe Datei hinterlassen).
    const dst = inplace
      ? join(dirname(input), basename(input, extname(input)) + ".norm.tmp.mp3")
      : join(out, basename(input, extname(input)) + ".mp3");
    const meas = measure(input);
    encode(input, dst, meas);
    if (inplace) renameSync(dst, input);
    const final = inplace ? input : dst;
    let tail = "";
    if (verify) { const l = verifyLufs(final); tail = `  → ${l.toFixed(1)} LUFS`; }
    console.log(`✓ ${basename(input)}  (${Number(meas.I).toFixed(1)} → ${TARGET.I} LUFS)${tail}`);
    ok++;
  }
  console.log(`\nFertig: ${ok}/${inputs.length}${inplace ? " (in-place)" : ` → ${out}`}`);
}

main();
