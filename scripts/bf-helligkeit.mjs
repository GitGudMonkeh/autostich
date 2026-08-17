#!/usr/bin/env node
/* Helligkeit der Spielfeld-Hintergründe im HANDY-Ausschnitt messen (#deck-mobil).
 *
 * Warum es dieses Skript gibt: Der Hub zeigt am Handy nur einen Ausschnitt des 4:3-Bildes
 * (`cover` auf ~390×820 → 35,7 % der Bildbreite, `background-position: 20%`). Ob ein Deck
 * „zu hell" ist, entscheidet also nicht das Bild, sondern dieser Streifen — und das lässt
 * sich rechnen statt schätzen. Kommt ein Deck dazu, ist die Frage ein Befehl:
 *
 *     npm run bf:helligkeit
 *
 * Ausgegeben wird je Spielfeld die mittlere Luma NACH dem Schleier und, falls es über dem
 * Deckel liegt, der Faktor für `BATTLEFIELD_VEIL` in src/ui/cosmeticAssets.js.
 *
 * Bewusst OHNE npm-Bild-Bibliothek: Node kann von sich aus kein JPEG dekodieren, und für eine
 * Messung, die man ein paarmal im Jahr braucht, soll das Projekt kein `sharp`/`jimp` in die
 * Abhängigkeiten nehmen (sharp bringt native Binaries je Plattform mit). Stattdessen ruft das
 * Skript python3 mit Pillow — dieselbe Kette, mit der die Erstmessung lief. Fehlt Pillow, sagt
 * es das und bricht sauber ab; es ist ein Werkzeug, kein Teil des Builds.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BF_DIR = path.join(HERE, "..", "src", "assets", "battlefields");

// Muss mit index.css (.as-hub-bg-img / .as-hub-bg-veil) und StartScreen.jsx übereinstimmen.
const CFG = {
  bfDir: BF_DIR,
  visL: 0.129, visR: 0.486,               // sichtbare Bildspalte bei background-position: 20%
  veil: [[0, 0.55], [0.30, 0.50], [0.62, 0.62], [1, 0.78]],
  veilRgb: [19, 19, 23],
  cap: Number(process.argv[2] ?? 24),     // Ziel-/Deckelhelligkeit, überschreibbar
};

const PY = `
import json, sys, pathlib
try:
    from PIL import Image
    import numpy as np
except ImportError:
    print(json.dumps({"error": "Pillow/numpy fehlen — 'pip install pillow numpy'"})); sys.exit(0)

C = json.loads(sys.argv[1])
def veil_alpha(y):
    v = C["veil"]
    for (y0, a0), (y1, a1) in zip(v, v[1:]):
        if y0 <= y <= y1:
            t = 0 if y1 == y0 else (y - y0) / (y1 - y0)
            return a0 + (a1 - a0) * t
    return v[-1][1]

out = []
for d in sorted(pathlib.Path(C["bfDir"]).iterdir()):
    f = d / "mobile.jpg"
    if not f.exists():
        continue
    im = Image.open(f).convert("RGB"); w, h = im.size
    a = np.asarray(im.crop((int(w * C["visL"]), 0, int(w * C["visR"]), h)).resize((195, 410)), dtype=float)
    al = np.array([veil_alpha((i + .5) / 410) for i in range(410)])[:, None, None]
    def mean_at(k):
        alk = np.clip(al * k, 0, 1)
        v = a * (1 - alk) + np.array(C["veilRgb"]) * alk
        return float((.2126 * v[..., 0] + .7152 * v[..., 1] + .0722 * v[..., 2]).mean())
    base = mean_at(1.0); k = 1.0
    if base > C["cap"]:
        lo, hi = 1.0, 3.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if mean_at(mid) > C["cap"]: lo = mid
            else: hi = mid
        k = round(hi, 2)
    out.append({"id": d.name, "lum": round(base, 1), "k": k})
print(json.dumps(out))
`;

let res;
try {
  res = JSON.parse(execFileSync("python3", ["-c", PY, JSON.stringify(CFG)], { encoding: "utf8" }));
} catch (e) {
  console.error("Messung fehlgeschlagen — ist python3 installiert?\n", e.message);
  process.exit(1);
}
if (res.error) { console.error(res.error); process.exit(1); }

res.sort((a, b) => b.lum - a.lum);
const lums = res.map((r) => r.lum);
const med = lums.slice().sort((a, b) => a - b)[Math.floor(lums.length / 2)];
const over = res.filter((r) => r.k > 1);

console.log(`\nHelligkeit im Handy-Ausschnitt · ${res.length} Spielfelder · Deckel ${CFG.cap}\n`);
for (const r of res) {
  const bar = "█".repeat(Math.round(r.lum / 2)).padEnd(19);
  console.log(`  ${r.id.padEnd(16)} ${String(r.lum).padStart(5)}  ${bar}${r.k > 1 ? `  → Schleier ×${r.k}` : ""}`);
}
console.log(`\n  Median ${med} · Spanne ${Math.min(...lums)}–${Math.max(...lums)} (Faktor ${(Math.max(...lums) / Math.min(...lums)).toFixed(2)})`);

if (over.length) {
  console.log(`\n  Über dem Deckel — Eintrag für BATTLEFIELD_VEIL (src/ui/cosmeticAssets.js):\n`);
  for (const r of over) console.log(`    ${r.id}: ${r.k},`);
  console.log(`\n  Achtung: ein Eintrag ist eine AUSNAHME. Wenige Prozent über dem Deckel sind Rauschen —`);
  console.log(`  eintragen, was man SIEHT, nicht was die Zahl knapp überschreitet.`);
} else {
  console.log(`\n  Kein Spielfeld über dem Deckel.`);
}
console.log();
