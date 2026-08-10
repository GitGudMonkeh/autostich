/* maintenance/normalize-music.mjs — Musik-Aufbereitung für den Run-/Menü-Pool.
 *
 * Normalisiert Audiodateien auf −14 LUFS (EBU R128, Zwei-Pass-loudnorm) und encodiert
 * sie zu AAC 128 kb/s · 48 kHz · Stereo (.m4a) — exakt passend zum Bestand in
 * src/assets/music/*.m4a (#171 Normalisierung, #276 AAC-Kompression). Eingebettete
 * Cover-/Video-Streams (z. B. aus Suno-Exports) werden entfernt (-map 0:a:0).
 *
 * Nutzung:
 *   node maintenance/normalize-music.mjs --out <ordner> <input1.mp3> [input2 ...]
 *   node maintenance/normalize-music.mjs --out <ordner> --verify <input...>
 *
 * Ausgabe: <ordner>/<basisname>.m4a  (Basisname der Eingabe ohne Erweiterung).
 * Voraussetzung: ffmpeg + ffprobe im PATH.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const TARGET = { I: -14, TP: -1.5, LRA: 11 }; // EBU R128: Integrated −14 LUFS, True Peak −1.5 dBTP, LRA 11
const ENCODE = ["-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"];

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

// Pass 2: gemessene Werte anwenden (linear), Cover raus, AAC/.m4a schreiben.
function encode(input, out, meas) {
  const af =
    `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}` +
    `:measured_I=${meas.I}:measured_TP=${meas.TP}:measured_LRA=${meas.LRA}` +
    `:measured_thresh=${meas.thresh}:offset=${meas.offset}:linear=true`;
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-y", "-i", input, "-map", "0:a:0", "-af", af, ...ENCODE, out]);
  if (r.status !== 0) throw new Error(`Encode fehlgeschlagen für ${input}\n${(r.stderr || "").slice(-400)}`);
}

// Optional: Ergebnis-Lautheit gegenprüfen (voller Decode) → sollte ~ −14.0 LUFS sein.
function verifyLufs(file) {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"]);
  const m = (r.stderr || "").match(/Integrated loudness[\s\S]*?I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
  return m ? Number(m[1]) : NaN;
}

function main() {
  const argv = process.argv.slice(2);
  let out = null, verify = false;
  const inputs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--verify") verify = true;
    else inputs.push(argv[i]);
  }
  if (!out || inputs.length === 0) {
    console.error("Nutzung: node maintenance/normalize-music.mjs --out <ordner> [--verify] <input...>");
    process.exit(2);
  }
  if (!existsSync(out)) mkdirSync(out, { recursive: true });

  let ok = 0;
  for (const input of inputs) {
    if (!existsSync(input)) { console.error(`⚠ übersprungen (fehlt): ${input}`); continue; }
    const dst = join(out, basename(input, extname(input)) + ".m4a");
    const meas = measure(input);
    encode(input, dst, meas);
    let tail = "";
    if (verify) { const l = verifyLufs(dst); tail = `  → ${l.toFixed(1)} LUFS`; }
    console.log(`✓ ${basename(input)}  (${Number(meas.I).toFixed(1)} → ${TARGET.I} LUFS)${tail}`);
    ok++;
  }
  console.log(`\nFertig: ${ok}/${inputs.length} → ${out}`);
}

main();
