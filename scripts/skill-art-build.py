#!/usr/bin/env python3
"""#skillart — Auslieferungsfassung der Skill-Embleme aus den Mastern erzeugen.

    python3 scripts/skill-art-build.py

Liest `docs/art/skills/<archetyp>/*.webp` (die 1024er Master, unverändert) und schreibt
`src/assets/skills/<archetyp>/*.webp` mit derselben Namensgebung.

ZWEI Schritte, beide mit Begründung:

1. Verkleinern auf 384 px. Gezeigt wird das Emblem als Kopfstreifen der Angebotskarte: die Karte ist
   ~277 CSS-px BREIT und der Streifen zeigt das Bild `cover` — die Breite entscheidet also, nicht die
   Zonenhöhe. Bei DPR-Deckel 2 (mobileTier.js) wären 554 px exakt; 384 bleibt eine 1,4-fache
   Vergrößerung, was weiche Verläufe verzeihen. Gemessen kostet der Satz damit 405 kB gegen 655 kB
   bei exakten 512.

   ACHTUNG, das war der Fehler der ersten Fassung: dort standen 192 px, begründet mit „gezeigt wird
   ein 64-px-Emblem". Mit dem Kopfstreifen ist das Bild 277 statt 64 px breit — dieselbe Datei wurde
   damit fast dreifach hochskaliert. Wer die Platzierung ändert, rechnet diese Zahl NEU.

2. Bloom EINBACKEN statt im Browser rechnen. Am Gerät entschieden (19.08.2026) über einen Regler:
   Radius 15 CSS-px, Stärke 60 %, Sättigung 260 %. Als CSS-Filter wäre das Rasterarbeit auf genau
   dem Screen, der ohnehin am Mount klemmt (271–417 ms in `phase:levelup`, s.
   docs/decisions/engineering-log-2026-08.md) — gebacken kostet es null Laufzeit.

   Der Radius wird UMGERECHNET, nicht übernommen: 15 px gelten für die Anzeige mit 277 px Breite,
   die Datei hat 192 → 15 × 192/277 = 10,4 px. Wer die Zonenbreite ändert, muss diese Zahl mitziehen.

   Die Rechnung ist die des Browsers: eine unscharfe, gesättigte Kopie mit 60 % Deckkraft additiv
   (screen) unter das scharfe Bild. Auf schwarzem Grund ist `screen` genau die Addition, die die
   Karte im Spiel auch macht — deshalb sieht das gebackene Bild aus wie die Vorschau.

-------------------------------------------------------------------------------------------------
GENERALIZED (icons-asset-audit, 22.08.2026). The script above only ever baked one lot: the lightning
skill masters that already sat in the repository as WebP. The desktop-icons workstream adds 96 more
icons that arrive as PNG and have to become masters first, so the script now has three modes and a
lot table instead of two hardcoded paths. The bake stage is byte-for-byte the same computation it
was; nothing about the lightning result changes.

    python3 scripts/skill-art-build.py                          # bake every calibrated lot (default, as before)
    python3 scripts/skill-art-build.py bake --lot ice
    python3 scripts/skill-art-build.py ingest --lot ice --from "C:/Users/Monkeh/Pictures/Icons"
    python3 scripts/skill-art-build.py measure --lot ice

`ingest` is the PNG -> master step. It is deliberately a LOCAL, one-off operation: the source PNGs
are not in the repository and never will be (122 MB), they live in the artist's folder. It reads the
audited filename mapping from docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.tsv,
because three of the 98 source filenames cannot be derived from the registry by normalization
(`gletscherzturz` -> SK_ICE_14, `Lawine` -> SK_ICE_L03, `zinsezins` -> L_ZINS). Those are data, not
code, so they live in a table rather than in an `if`.

`measure` reports the per-lot light figures the art READMEs use, so that a lot can be judged against
ITSELF. Per the workstream's approved architecture, light alignment is decided per lot — never by
copying Blitz's measured number onto another faction.

Not every lot can be baked. The bloom radius is a CSS length converted through the render zone's
width, and perk-category tiles, corner panels and legendary-perk tiles have no settled render zone
yet (their wiring is Phase 2). Those lots are therefore marked uncalibrated: `ingest` and `measure`
work, `bake` refuses with a message instead of silently reusing the skill-card numbers.
"""
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
from pathlib import Path
import argparse
import csv
import math
import sys

SIZE = 384            # Kantenlänge der Auslieferung
STRIP_W = 277         # CSS-Breite der Zone (Angebotskarte auf 880 px Karte)
BLOOM_CSS = 16        # Radius in CSS-px, am Gerät gewählt
BLOOM_STRENGTH = 0.70 # Deckkraft der unscharfen Kopie
BLOOM_SAT = 2.00      # Sättigung der unscharfen Kopie

SRC = Path("docs/art/skills")
OUT = Path("src/assets/skills")

MASTER_Q = 92         # quality of a master, matching the sets already in docs/art/
DELIVERY_Q = 86       # quality of a delivery copy, unchanged from the first version
MAP = Path("docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.tsv")


class Lot:
    """One set of icons that is judged, aligned and shipped as a unit.

    `strip_w` is the CSS width of the zone the icon is shown in; it is what converts the bloom radius
    from a CSS length into a pixel radius on the file. A lot without a settled render zone carries
    calibrated=False and cannot be baked — see the module docstring.
    """

    def __init__(self, key, master, delivery, master_px, square=True, calibrated=True, expect=None):
        self.key = key
        self.master = Path(master)
        self.delivery = Path(delivery)
        self.master_px = master_px          # (w, h) of a master, long edge included
        self.square = square
        self.calibrated = calibrated
        self.expect = expect                # masters needed before the lot may ship; None = no rule


ARCHETYPES = ("lightning", "fire", "ice", "plant")
ARCHETYPE_SIZE = 21   # 17 regular + 4 legendary, the same for all four factions

# A lot ships whole or not at all. `docs/art/skills/README.md` states the reason for the alignment
# step ("Angeglichen wird ERST, wenn alle 21 vorliegen"), and the same holds for shipping: a faction
# tab showing art on 6 of 21 offer cards reads as breakage, not as progress. So `expect` is a gate,
# not a statistic — an incomplete lot is skipped by `bake` and says so.
LOTS = {a: Lot(a, SRC / a, OUT / a, (1024, 1024), expect=ARCHETYPE_SIZE) for a in ARCHETYPES}
# The three Phase-2 lots. Sizes are the ones the existing masters/READMEs already use.
LOTS["legendaries"] = Lot("legendaries", "docs/art/legendaries", "src/assets/legendaries",
                          (1024, 1024), calibrated=False, expect=21)
LOTS["perkcats"] = Lot("perkcats", "docs/art/perkcats", "src/assets/perkcats",
                       (1024, 1024), calibrated=False, expect=7)
LOTS["corners"] = Lot("corners", "docs/art/corners", "src/assets/corners",
                      (1536, 1024), square=False, calibrated=False, expect=5)


def bake(im):
    """Scharfes Bild + unscharfe, gesättigte Kopie, additiv überlagert (wie `mix-blend-mode: screen`)."""
    sigma = BLOOM_CSS * SIZE / STRIP_W
    glow = im.filter(ImageFilter.GaussianBlur(sigma))
    glow = ImageEnhance.Color(glow).enhance(BLOOM_SAT)
    glow = ImageEnhance.Brightness(glow).enhance(BLOOM_STRENGTH)
    return ImageChops.screen(im, glow)


def square_pad(im):
    """Non-square sources are padded on black, never cropped.

    The rule is `docs/art/skills/README.md`: under `mix-blend-mode: screen` a black border is
    invisible, while cropping would cost exactly the arc and band ends that carry the silhouette.
    Verified against the repository: SK_FIRE_03's 1122x1402 source reproduces the committed 1024
    master to a mean absolute difference of 0.60/255 when padded, 4.98 when squashed.
    """
    w, h = im.size
    if w == h:
        return im
    s = max(w, h)
    out = Image.new("RGB", (s, s), (0, 0, 0))
    out.paste(im, ((s - w) // 2, (s - h) // 2))
    return out


def read_map(lot_key=None):
    """The audited source-filename -> repo-filename table. Returns rows for one lot, or all."""
    if not MAP.exists():
        sys.exit(f"mapping table missing: {MAP}")
    with MAP.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh, delimiter="\t"))
    return [r for r in rows if lot_key is None or r["lot"] == lot_key]


def cmd_ingest(args):
    """PNG source -> WebP master, renamed to the registry ID."""
    root = Path(args.source)
    if not root.is_dir():
        sys.exit(f"source root not found: {root}")
    lots = [args.lot] if args.lot else sorted({r["lot"] for r in read_map()})
    for key in lots:
        lot = LOTS[key]
        rows = read_map(key)
        lot.master.mkdir(parents=True, exist_ok=True)
        n = 0
        for r in rows:
            src = root / r["source"]
            if not src.exists():
                print(f"  MISSING {src}")
                continue
            im = Image.open(src).convert("RGB")
            if lot.square:
                im = square_pad(im)
            im = im.resize(lot.master_px, Image.LANCZOS)
            dst = Path(r["master"])
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst, "WEBP", quality=MASTER_Q, method=6)
            n += 1
        print(f"ingest {key}: {n} master(s) -> {lot.master}")


def cmd_bake(args):
    """Master -> delivery copy. Default mode, and the one the guard in test/skill-art.test.js covers."""
    keys = [args.lot] if args.lot else list(ARCHETYPES)
    n = 0
    total = 0
    for key in keys:
        lot = LOTS[key]
        if not lot.calibrated:
            print(f"skip {key}: no settled render zone yet, so the bloom radius cannot be converted "
                  f"(see the module docstring); ingest/measure work, bake does not")
            continue
        masters = sorted(lot.master.glob("*.webp"))
        if lot.expect is not None and len(masters) != lot.expect:
            print(f"skip {key}: {len(masters)} of {lot.expect} masters - a lot ships whole or not at all")
            continue
        for master in masters:
            out = lot.delivery / master.name
            out.parent.mkdir(parents=True, exist_ok=True)
            im = Image.open(master).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
            bake(im).save(out, "WEBP", quality=DELIVERY_Q, method=6)
            n += 1
            total += out.stat().st_size
    print(f"{n} Embleme, {total/1024:.0f} kB (Radius {BLOOM_CSS * SIZE / STRIP_W:.1f} px auf {SIZE} px)")


def luma(im):
    """Rec. 709 luma as a flat list of floats — the same weighting the CSS/FX stack assumes."""
    raw = im.convert("RGB").resize((256, 256), Image.LANCZOS).tobytes()
    px = [(raw[i], raw[i + 1], raw[i + 2]) for i in range(0, len(raw), 3)]
    return [0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in px], px


def measure_one(path):
    """The figures the art READMEs report, so a new lot can be judged the same way as the old ones.

    `Farbton` is a CIRCULAR mean. That is not pedantry: the corners README records a run that reported
    236 deg (blue-violet) for a red image, because the arithmetic mean of 358 and 2 is 180.
    """
    im = Image.open(path)
    lum, px = luma(im)
    n = len(lum)
    bands = {t: 100.0 * sum(1 for v in lum if v > t) / n for t in (10, 40, 90, 180)}
    lit = [v for v in lum if v > 10]
    mean = sum(lit) / len(lit) if lit else 0.0
    var = sum((v - mean) ** 2 for v in lit) / len(lit) if lit else 0.0
    # Coefficient of variation over the lit pixels. NOT the "Streuung" column of the art READMEs:
    # that formula is not recorded anywhere in the repository, and this one does not reproduce it
    # (it disagrees on the ordering, not just the scale). Comparable WITHIN a run, never against a
    # number quoted in docs/art/*/README.md. The band shares and the hue above do reproduce those
    # tables — measured against docs/art/perkcats/README.md, all seven within ~1 point.
    cv = (var ** 0.5 / mean) if mean else 0.0
    sx = sy = 0.0
    for (r, g, b), v in zip(px, lum):
        if v <= 10:
            continue
        mx, mn = max(r, g, b), min(r, g, b)
        if mx == mn:
            continue
        if mx == r:
            h = (60 * ((g - b) / (mx - mn)) + 360) % 360
        elif mx == g:
            h = 60 * ((b - r) / (mx - mn)) + 120
        else:
            h = 60 * ((r - g) / (mx - mn)) + 240
        sx += math.cos(math.radians(h))
        sy += math.sin(math.radians(h))
    hue = math.degrees(math.atan2(sy, sx)) % 360
    p99 = sorted(lum)[int(n * 0.99)]
    return {"area": bands[10], "b40": bands[40], "b90": bands[90], "b180": bands[180],
            "cv": cv, "hue": hue, "light": bands[10] * p99 / 100}


def cmd_measure(args):
    keys = [args.lot] if args.lot else list(LOTS)
    for key in keys:
        lot = LOTS[key]
        files = sorted(lot.master.glob("*.webp"))
        if not files:
            continue
        print(f"\n== {key} ({len(files)} files)")
        print(f"{'file':44s} {'>10':>7} {'>40':>7} {'>90':>7} {'>180':>7} {'cv':>7} {'hue':>6} {'light':>7}")
        vals = []
        for f in files:
            m = measure_one(f)
            vals.append(m)
            print(f"{f.name:44s} {m['area']:6.1f}% {m['b40']:6.1f}% {m['b90']:6.1f}% "
                  f"{m['b180']:6.2f}% {m['cv']:7.2f} {m['hue']:5.0f}° {m['light']:7.1f}")
        areas = sorted(v["area"] for v in vals)
        med = areas[len(areas) // 2]
        lights = sorted(v["light"] for v in vals)
        print(f"  median area {med:.1f}%   area span {areas[0]:.1f}-{areas[-1]:.1f}% "
              f"(factor {areas[-1]/areas[0]:.1f})")
        print(f"  median light {lights[len(lights)//2]:.1f}   light span {lights[0]:.1f}-{lights[-1]:.1f} "
              f"(factor {lights[-1]/max(lights[0], 0.01):.1f})")


def main():
    ap = argparse.ArgumentParser(description="Build skill/perk/corner art masters and delivery copies.")
    sub = ap.add_subparsers(dest="cmd")
    b = sub.add_parser("bake", help="master -> delivery copy (default)")
    b.add_argument("--lot")
    i = sub.add_parser("ingest", help="PNG source -> WebP master, renamed to the registry ID")
    i.add_argument("--lot")
    i.add_argument("--from", dest="source", required=True)
    m = sub.add_parser("measure", help="per-lot light figures")
    m.add_argument("--lot")
    args = ap.parse_args()
    if args.cmd == "ingest":
        cmd_ingest(args)
    elif args.cmd == "measure":
        cmd_measure(args)
    else:
        if args.cmd is None:
            args = ap.parse_args(["bake"])
        cmd_bake(args)


if __name__ == "__main__":
    main()
