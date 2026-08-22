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
    python3 scripts/skill-art-build.py align --lot legendaries

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
width, so a lot whose zone has not been decided carries `strip_w=None`, which makes its sigma
uncomputable rather than merely unflagged: `ingest` and `measure` work, `bake` refuses instead of
silently reusing the skill-card numbers.

PERK ZONE MEASURED (icons-perks, 22.08.2026). `perkcats` and `legendaries` were two of the three lots
held back that way. Their zone now exists and was MEASURED in the running application at 265 css-px —
the tile is 270 and the image inside it is 5 px narrower, which is a distinction the first pass here
got wrong. The full derivation, and why the neighbouring 277 and 270.66 are traps rather than
shortcuts, sits at the lot table below. `corners` is still uncalibrated and still refuses; its zone
belongs to `icons-corners`, which has not run.

`align` is the fourth mode, added with those two lots. It solves the per-file brightness factors of
the LIGHT ALIGNMENT against the lot's own median TOTAL EMITTED LIGHT — the procedure the art READMEs
describe in prose and had been carrying out by hand, with the statistic changed for a measured reason
recorded at `cmd_align`. Alignment stays per lot: two lots never have to match each other, only
themselves.

**Delivery size and bloom are per-lot, not global** (fixed after review round 1, 2026-08-22). The
first version of this generalization read the module-level `SIZE`/`STRIP_W` inside the bake loop and
resized every lot to `SIZE x SIZE`. For the four skill lots that is correct and is what shipped, but
it made the lot table a promise the code did not keep — and `corners` masters are 3:2, so activating
that lot would have squashed 1536x1024 into 384x384. `Lot.size` now names the LONG edge and
`Lot.delivery_px` derives the short one from the master's aspect.
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

# The bloom radius on a skill delivery file, in pixels. The CSS radius is authored against the render
# zone's WIDTH, so converting it needs that width — which is what makes the zone a build input rather
# than a display detail.
BLOOM_SIGMA = BLOOM_CSS * SIZE / STRIP_W
# `Lot.sigma` below is the generalized form of exactly that expression. The two are reconciled at
# import time rather than left to resemble each other: this constant is what the ratchet in
# test/skill-art.test.js reads, and if the per-lot formula ever drifted away from it the guard would
# still be green while the shipped skill radius had changed. Checked here, once, for the four skill
# lots — the perk lots have their own zone and are deliberately NOT expected to match it.


class Lot:
    """One set of icons that is judged, aligned and shipped as a unit.

    Every value the bake depends on is per-lot, because none of them generalize:

    - `size` is the LONG edge of a delivery file. `delivery_px` derives the other edge from the
      master's aspect, so a non-square lot is never squashed into a square.
    - `strip_w` is the CSS width of the zone the icon is shown in. It converts the bloom radius from
      a CSS length into a pixel radius on the file, so a lot shown in a different-width zone needs a
      different sigma for the same authored radius.
    - `bloom_css` / `bloom_strength` / `bloom_sat` are the authored bloom, chosen at the device.
    - `light` is the per-file brightness correction of the LIGHT ALIGNMENT, keyed by delivery
      filename stem. Alignment is per lot by decision, not per repository: the art READMEs align a
      set against ITSELF, because two lots never share a screen. A lot without the key ships at 1.0,
      which is exactly what the four skill lots do.

    **`strip_w=None` means the render zone is not settled, and then no radius exists.** That is why
    `calibrated` is derived rather than passed: an uncalibrated lot is not one somebody forgot to
    flag, it is one whose sigma is literally uncomputable. `bake` refuses it; `ingest` and `measure`
    do not need a zone and work.
    """

    def __init__(self, key, master, delivery, master_px, square=True, expect=None,
                 size=SIZE, strip_w=STRIP_W, bloom_css=BLOOM_CSS,
                 bloom_strength=BLOOM_STRENGTH, bloom_sat=BLOOM_SAT, light=None):
        self.key = key
        self.master = Path(master)
        self.delivery = Path(delivery)
        self.master_px = master_px          # (w, h) of a master, long edge included
        self.square = square
        self.expect = expect                # masters needed before the lot may ship; None = no rule
        self.size = size                    # long edge of a delivery file
        self.strip_w = strip_w              # CSS width of the render zone; None = not settled
        self.bloom_css = bloom_css
        self.bloom_strength = bloom_strength
        self.bloom_sat = bloom_sat
        self.light = light or {}            # filename stem -> brightness factor; missing = 1.0

    @property
    def calibrated(self):
        return self.strip_w is not None

    def light_of(self, master_path):
        """Brightness correction for one file of this lot. 1.0 when the lot is not aligned."""
        return self.light.get(master_path.stem, 1.0)

    @property
    def sigma(self):
        """Blur radius in file pixels. Raises when the lot has no settled render zone."""
        if not self.calibrated:
            raise ValueError(f"lot {self.key!r} has no render-zone width, so no bloom radius exists")
        return self.bloom_css * self.size / self.strip_w

    @property
    def delivery_px(self):
        """Delivery size, aspect taken from the master. `size` is the long edge, never both edges."""
        mw, mh = self.master_px
        if mw >= mh:
            return (self.size, max(1, round(self.size * mh / mw)))
        return (max(1, round(self.size * mw / mh)), self.size)


ARCHETYPES = ("lightning", "fire", "ice", "plant")
ARCHETYPE_SIZE = 21   # 17 regular + 4 legendary, the same for all four factions

# A lot ships whole or not at all. `docs/art/skills/README.md` states the reason for the alignment
# step ("Angeglichen wird ERST, wenn alle 21 vorliegen"), and the same holds for shipping: a faction
# tab showing art on 6 of 21 offer cards reads as breakage, not as progress. So `expect` is a gate,
# not a statistic — an incomplete lot is skipped by `bake` and says so.
LOTS = {a: Lot(a, SRC / a, OUT / a, (1024, 1024), expect=ARCHETYPE_SIZE) for a in ARCHETYPES}
# ---------------------------------------------------------------------------------------------
# PERK RENDER ZONE — MEASURED, NOT ASSUMED (icons-perks, 22.08.2026)
#
# `strip_w=265` below is the width THE IMAGE IS ACTUALLY DRAWN AT in the running application, not a
# number carried over from the skill card. The probe, its output and the method are
#
#     docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs
#     docs/workstreams/desktop-icons/icons-perks/visual/V2-measurements.json
#
# and the measurement is the same at every desktop viewport the images render at:
#
#     1600x900   tile 270.00 css-px   ->  <img class="pk-strip"> measures 265 x 205
#     1920x1080  tile 270.00 css-px   ->  <img class="pk-strip"> measures 265 x 205
#     2560x1440  tile 270.00 css-px   ->  <img class="pk-strip"> measures 265 x 205
#     1280x720   tile 230 css-px, BELOW the 1400 px gate — no image is rendered there at all
#
# The tile is 270 because the level-up overlay card is width-capped at 880 css-px, so the 3-column
# grid is 830 px wide and each column is (830 - 2*10 gap)/3. The IMAGE is 5 px narrower than that:
# the strip is `position:absolute; left:0; right:0`, which resolves against the button's PADDING box,
# and `.as-edge-card` carries `border-left: 4px` (the rarity edge) plus a 1 px border on the other
# three sides. 270 - 4 - 1 = 265.
#
# That 5 px is not a rounding detail, it is the whole shape of this task's tripwire in miniature. The
# first pass here read the tile width off the grid, wrote 270, and would have shipped a bloom radius
# of 22.76 px where the correct one is 23.18 — authoritative and wrong, reached by measuring the
# right screen and then the wrong box. What the radius has to be divided by is the width the emblem
# is RENDERED at, because that is what the authored CSS radius is authored against.
#
# Two neighbouring numbers are traps for the same reason: 277, which the skill lots are baked against
# and which was never measured on anything, and 270.66, which is the SKILL card (see ICONS-VIS-01 in
# docs/workstreams/desktop-icons/icons-asset-audit/visual-review.md). Change the overlay's width cap,
# the column count, or the card's border widths and this number has to be re-measured by re-running
# the probe — it is not derivable from the stylesheet, because it is a layout outcome rather than a
# declared length.
#
# ONE value covers both perk lots. Regular and legendary perks render through the same <button> in
# the same grid in `src/ui/PerkSelect.jsx`; a legendary differs only by the `as-legendary` gold frame
# and the name colour. Confirmed in the measurement above, where the legendary tile (Vabanque) and
# the two regular tiles all come out at the same 265.
# ---------------------------------------------------------------------------------------------

# Light alignment of the 7 category emblems. NOT derived here — these are the factors
# `docs/art/perkcats/README.md` already solved numerically against the lot's own median of 23.5 %
# luminous area, and re-deriving them against a fresh median would silently move a set the owner has
# already seen. `align` below is the tool that produced this shape; for perkcats it is a reader, not
# an author.
PERKCAT_LIGHT = {
    "perkcat_P_praezision": 1.33,   # Fadenkreuz — linienbetont, trägt von Haus aus wenig Licht
    "perkcat_D_score":      1.22,   # Treppe — dito
    "perkcat_B_stich":      1.05,
    "perkcat_A_deck":       1.02,   # der Median-Träger des Satzes
    "perkcat_C_rolle":      0.78,   # die drei "gebauten" Motive landen alle bei ~0,75:
    "perkcat_E_form":       0.73,   #   grosse beleuchtete Flaechen statt Linien
    "perkcat_S_ausbau":     0.72,
}

# Light alignment of the 21 legendary emblems, solved by `align --lot legendaries` against THIS lot's
# own median emitted light (21.65). Per the workstream's approved architecture the two perk lots are
# aligned separately — a legendary tile shows its own icon and a regular tile its category's, so what
# has to match is each set against itself. Derivation, the reason the statistic is emitted light
# rather than luminous area, and the residual spread are in `docs/art/legendaries/README.md`.
#
# Raw spread 4.2-fold, the widest of any lot in the repository; after alignment 1.26-fold. The three
# largest lifts (Vabanque, Hochseil, Ballast) do not reach the median even at their factor, because
# clipping eats part of the lift — they are the honest residual, not a solver failure.
LEGENDARY_LIGHT = {
    "L_VAB_vabanque":     2.72,   # the dimmest of the set — a small lever on a lot of black
    "L_HOCH_hochseil":    2.24,
    "L_BALL_ballast":     2.22,
    "L_MEIS_meisterhand": 1.76,
    "L_SCHM_schmiede":    1.59,
    "L_HENK_henker":      1.48,
    "L_MONO_monochrom":   1.21,
    "L_OPFER_opfergang":  1.17,
    "L_RICHT_richtfest":  1.08,
    "L_PATT_patt":        1.05,
    "L_ECHO_echo":        1.00,   # the median carrier
    "L_TAKT_taktschlag":  0.97,
    "L_ZINS_zinseszins":  0.95,
    "L_FUND_fundament":   0.93,
    "L2_unaufhaltsam":    0.92,
    "L_BAUH_bauhuette":   0.90,
    "L_BRENN_brennpunkt": 0.90,
    "L_UMV_umverteilung": 0.86,
    "L4_kritische-masse": 0.71,
    "L_SAMM_sammler":     0.70,
    "L6_raserei":         0.65,   # the blaze — the brightest, and the one that would shout
}

# The three Phase-2 lots. Master sizes are the ones the existing files/READMEs already use.
# `corners` still carries `strip_w=None`: the corner panel's render zone belongs to `icons-corners`,
# which has not run yet, so its sigma stays uncomputable and `bake` still refuses it.
# Note `corners` is 3:2, not square — with a single hardcoded delivery edge it would ship distorted,
# which is the reason `size` names the long edge and `delivery_px` derives the short one.
LOTS["legendaries"] = Lot("legendaries", "docs/art/legendaries", "src/assets/legendaries",
                          (1024, 1024), expect=21, strip_w=265, light=LEGENDARY_LIGHT)
LOTS["perkcats"] = Lot("perkcats", "docs/art/perkcats", "src/assets/perkcats",
                       (1024, 1024), expect=7, strip_w=265, light=PERKCAT_LIGHT)
LOTS["corners"] = Lot("corners", "docs/art/corners", "src/assets/corners",
                      (1536, 1024), square=False, expect=5, strip_w=None)

# See the note at BLOOM_SIGMA: the generalized per-lot formula has to still BE the documented one.
for _a in ARCHETYPES:
    assert abs(LOTS[_a].sigma - BLOOM_SIGMA) < 1e-9, \
        f"lot {_a} no longer bakes at the documented skill radius {BLOOM_SIGMA:.4f}"


def bake(im, lot, light=1.0):
    """Scharfes Bild + unscharfe, gesättigte Kopie, additiv überlagert (wie `mix-blend-mode: screen`).

    `light` is the lot's per-file alignment factor and is applied FIRST, to the sharp image, so the
    bloom is computed from the picture that will actually be seen. Applying it afterwards would leave
    the glow at the unaligned brightness and undo half the alignment — the glow is the larger, softer
    half of the light a small emblem throws.
    """
    if light != 1.0:
        im = ImageEnhance.Brightness(im).enhance(light)
    sigma = lot.sigma
    glow = im.filter(ImageFilter.GaussianBlur(sigma))
    glow = ImageEnhance.Color(glow).enhance(lot.bloom_sat)
    glow = ImageEnhance.Brightness(glow).enhance(lot.bloom_strength)
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
        # An alignment table that has drifted away from the lot is worse than none: a renamed or added
        # master would silently ship at 1.0 while the rest of the set is corrected, and the set would
        # be misaligned by exactly the file nobody looked at. Both directions, and it refuses.
        if lot.light:
            stems = {m.stem for m in masters}
            missing = sorted(stems - set(lot.light))
            extra = sorted(set(lot.light) - stems)
            if missing or extra:
                print(f"skip {key}: light table does not match the lot"
                      + (f" - no factor for: {', '.join(missing)}" if missing else "")
                      + (f" - factor without master: {', '.join(extra)}" if extra else ""))
                continue
        w, h = lot.delivery_px
        for master in masters:
            out = lot.delivery / master.name
            out.parent.mkdir(parents=True, exist_ok=True)
            im = Image.open(master).convert("RGB").resize((w, h), Image.LANCZOS)
            bake(im, lot, lot.light_of(master)).save(out, "WEBP", quality=DELIVERY_Q, method=6)
            n += 1
            total += out.stat().st_size
        aligned = f", light {min(lot.light.values()):.2f}-{max(lot.light.values()):.2f}" if lot.light else ""
        print(f"  {key}: {len(masters)} at {w}x{h}, radius {lot.sigma:.1f} px "
              f"(zone {lot.strip_w} css-px){aligned}")
    print(f"{n} Embleme, {total/1024:.0f} kB")


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


def emitted_light(im, factor=1.0):
    """Mean Rec. 709 luma over the WHOLE frame — the total light this emblem adds to its tile.

    Under `mix-blend-mode: screen` on a near-black ground, screen(a, b) = a + b - ab, and for the
    small values that dominate an emblem on black that is very close to plain addition. So the sum of
    the pixel values IS, to first order, the light the tile gains. That is the quantity two emblems
    have to share if neither is to shout over the other.
    """
    if factor != 1.0:
        im = ImageEnhance.Brightness(im).enhance(factor)
    lum, _ = luma(im)
    return sum(lum) / len(lum)


def area_at(im, factor=1.0):
    """Luminous area (share of pixels above luma 10) after scaling brightness by `factor`."""
    if factor != 1.0:
        im = ImageEnhance.Brightness(im).enhance(factor)
    lum, _ = luma(im)
    return 100.0 * sum(1 for v in lum if v > 10) / len(lum)


def cmd_align(args):
    """Solve the per-file brightness factor that puts every icon of a lot on the lot's own median.

    The procedure `docs/art/perkcats/README.md` describes in words — "die Faktoren sind numerisch
    gesucht (die Helligkeit wird je Bild verstellt, bis die gemessene Fläche den Median trifft),
    nicht geschätzt" — written down as code, so a new lot is not aligned by hand.

    THE STATISTIC IS TOTAL EMITTED LIGHT, NOT LUMINOUS AREA, and the change is deliberate. Measured
    on the 21 legendary masters (icons-perks, 22.08.2026), area-matching does not merely give
    different numbers — it does not converge:

        five of 21 files hit the solver's 5.0 ceiling, and three of those five were STILL short of
        the target area at 5.0 (Hochseil reached 23.3 % against a target of 30.1 %)

    because luminous area asks how much of the FRAME a motif fills, and this lot's motifs genuinely
    differ in that: Sammler is a full panel at 53.8 %, Vabanque a small lever at 14.5 %, a 3.7-fold
    spread. Equalising it means inflating a small emblem's halo until it covers as much frame as a
    large one, which is not the same thing as making the two read equally bright. Total light is,
    and it is also linear in the factor, so it has a closed form and cannot silently saturate at a
    solver bound the way the bisection did.

    The perkcats lot never exposed this: its area spread is 1.7-fold, small enough that the two
    statistics broadly agree (both put P highest at ~1.33 and C at ~0.79). Its seven factors are the
    ones already recorded in its README and stay as they are — `align --lot perkcats` therefore
    REPORTS a divergence rather than proposing a change, which is the useful thing for it to do.

    Prints a table that can be pasted into the lot's `light=` dict. It deliberately does not write
    the table itself: which factors ship is a decision that belongs in a reviewed diff.
    """
    keys = [args.lot] if args.lot else list(LOTS)
    for key in keys:
        lot = LOTS[key]
        files = sorted(lot.master.glob("*.webp"))
        if not files:
            continue
        if lot.expect is not None and len(files) != lot.expect:
            print(f"\n== {key}: {len(files)} of {lot.expect} masters — the median is not settled yet, "
                  f"so these factors would age out. Not solving.")
            continue
        rows = [(f, Image.open(f).convert("RGB")) for f in files]
        rows = [(f, im, emitted_light(im), area_at(im)) for f, im in rows]
        target = sorted(e for _, _, e, _ in rows)[len(rows) // 2]
        print(f"\n== {key} ({len(files)} files) — target = own median emitted light {target:.2f}")
        print(f"{'file':32s} {'light':>7} {'area':>7} {'factor':>7} {'after':>7} {'clip%':>7}"
              + ("  ships" if lot.light else ""))
        out = {}
        for f, im, e, a in sorted(rows, key=lambda r: -r[2]):
            factor = round(target / e, 2) if e else 1.0
            out[f.stem] = factor
            # What the correction costs at the top end: a lift large enough to flatten a visible share
            # of the emblem's core into flat white is a reason to look at the picture, not a number to
            # accept quietly. Reported so the reviewer sees the cost next to the benefit.
            lum, _ = luma(ImageEnhance.Brightness(im).enhance(factor) if factor != 1.0 else im)
            clip = 100.0 * sum(1 for v in lum if v >= 254) / len(lum)
            ships = f"  {lot.light.get(f.stem, 1.0):.2f}" if lot.light else ""
            print(f"{f.stem:32s} {e:7.2f} {a:6.1f}% {factor:7.2f} {emitted_light(im, factor):7.2f} "
                  f"{clip:6.2f}%{ships}")
        before = [e for _, _, e, _ in rows]
        after = [emitted_light(im, out[f.stem]) for f, im, _, _ in rows]
        print(f"  emitted light {min(before):.2f}-{max(before):.2f} "
              f"(factor {max(before)/max(min(before), .01):.1f}) -> {min(after):.2f}-{max(after):.2f} "
              f"(factor {max(after)/max(min(after), .01):.2f})")
        if lot.light:
            worst = max(out, key=lambda s: abs(out[s] - lot.light.get(s, 1.0)))
            print(f"  this lot already ships a light table; largest divergence {worst}: "
                  f"solver {out[worst]:.2f} vs shipped {lot.light.get(worst, 1.0):.2f}. "
                  f"Reported, not applied.")
            continue
        print("  paste into the lot's light= dict:")
        for stem in sorted(out, key=lambda s: -out[s]):
            print(f'    "{stem}": {out[stem]:.2f},')


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
    a = sub.add_parser("align", help="solve the per-file brightness factors against the lot's own median")
    a.add_argument("--lot")
    args = ap.parse_args()
    if args.cmd == "ingest":
        cmd_ingest(args)
    elif args.cmd == "measure":
        cmd_measure(args)
    elif args.cmd == "align":
        cmd_align(args)
    else:
        if args.cmd is None:
            args = ap.parse_args(["bake"])
        cmd_bake(args)


if __name__ == "__main__":
    main()
