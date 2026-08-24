#!/usr/bin/env python3
"""Unify the generated card images into a single visual treatment.

Why this tool exists
--------------------
The card images come from individual generation runs. What marks a set as
"generated" is not the single image but the fact that every image was rendered
independently: luminous mass and black point drift far apart across the set.
A shared post-treatment does not replace illustration, but it takes the
assembled-from-scratch look off the collection.

No prompt, no regeneration. The existing files go in and come back out.
Run the tool without flags to print the current spread for this repository.

Toolchain
---------
Python with Pillow/numpy, invoked as a subprocess, for the same reason given in
`scripts/bf-helligkeit.mjs`: for a job needed a few times a year the project does
not take `sharp`/`jimp` into its dependencies (native binaries per platform).

Two image classes, two recipes
------------------------------
`front` is a frame with a near-black centre whose light sits in a thin edge band.
`src/ui/Card.jsx` lays it down as a `background-image`, so its black *is* the card
surface and the rank plus every marker render on top of it. Therefore:

  * NO vignette - it would darken the corner ornaments, which are design,
  * NO grain - noise on a mostly black surface is noise on nothing,
  * alignment is multiplicative, because neon is additive light on black and
    scales linearly rather than through a gamma curve,
  * and the interior must NOT get brighter, or the rank loses contrast against
    it. `--check` measures exactly that and names any offender.

`back` is a full-bleed artwork. It gets the opposite recipe: gamma curve,
vignette, and grain in the midtones.

Targets come from the set, not from constants
---------------------------------------------
Both recipes align on the MEDIAN of their own class. There is no guessed target
brightness, and a new deck moves the target only insofar as it moves the median.

Measurement and correction use the SAME quantity - the luminance-weighted
saturation. Correcting one statistic while measuring another means steering
blind: an earlier revision aligned the 85th percentile over a saturation mask
and measured the mean over a brightness mask, which pushed convergence down
from 20% to 8%.

What this tool does NOT invalidate, and what it would
-----------------------------------------------------
The deck accents `a1`/`a2` in `src/game/themes.js` are derived from the
BATTLEFIELD images, not from the cards - the Genesis comment there reasons about
`bf_onboarding`, and `npm run bf:helligkeit` reads `battlefields/*/mobile.jpg`.
Treating cards therefore leaves that derivation untouched.

It would matter if this tool were ever extended to the battlefields. Do not do
that without reading the veil first: those images already carry a measured
per-deck runtime correction (`BATTLEFIELD_VEIL` in `src/ui/cosmeticAssets.js`),
which converges the set harder than any bake here does, and whose factors were
measured against the CURRENT image brightness. Baking underneath it would darken
everything twice and silently invalidate every one of those numbers.

Usage
-----
    python scripts/normalize-art.py                    # measure only, writes nothing
    python scripts/normalize-art.py --sheet out.png    # before/after contact sheet
    python scripts/normalize-art.py --check            # frame interior contrast
    python scripts/normalize-art.py --apply            # write; originals go to _raw/
"""

import argparse
import shutil
import sys
from pathlib import Path

try:
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Missing dependency: pip install pillow numpy")

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CARDS = ROOT / "src/assets/cards/decks_player"
RAW = ROOT / "src/assets/cards/_raw/decks_player"

FLOOR = 0.020          # below this it is card surface, not neon line
WEBP_Q = 88            # grain at this strength costs only ~2% file size

# How hard each image is pulled toward the set median. Do not set this to 1.0:
# with deck-driven identity, a deck that is more vivid than the others is a
# feature rather than a defect.
STRENGTH_LUM = 0.60
STRENGTH_SAT = 0.55

# The three dials that decide how far the artwork treatment goes. They are tuned
# TOGETHER, because LUM_BIAS on its own barely moves the result: at 0.95 against
# 0.88 the mean brightness differs by ~1.5%, since the gamma clamp binds first.
# Most of the darkening actually comes from the vignette and the white-point damp.
#
# These values are the "gentle" step, chosen against real screenshots of the
# workshop grid rather than against numbers: nearly all of the convergence gain
# sits in the first step away from untreated, and anything stronger costs neon
# brightness that is part of what the game is selling. For the record, measured
# over the grid as the app renders it - untreated 0.1459, gentle 0.1349,
# medium 0.1327, strong 0.1302.
#
# Hard rule regardless of tuning: never brighter than the original on average.
# `--check` asserts it.
LUM_BIAS = 0.98        # darkening bias on the luminous-mass target
VIGNETTE = 0.10        # corner falloff on the artwork
WHITE_POINT = 0.92     # white point the artwork is damped down to (never up)

# Frames chosen for the contact sheet: a spread of hue, subject and density.
# Missing entries are skipped, so renaming a deck cannot break the tool.
SHEET_DECKS = ["deck_onboarding", "deck_cat", "deck_nimbus", "deck_kosmos",
               "deck_oni", "deck_beach", "deck_geometrie", "deck_paradox"]


# ------------------------------------------------------------------ primitives

def luma(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def to_lin(a):
    return np.clip(a, 0, 1) ** 2.2


def to_srgb(a):
    return np.clip(a, 0, 1) ** (1 / 2.2)


def sat_weighted(a, mask=None):
    """Luminance-weighted saturation: every pixel counts by its own brightness.

    Independent of HOW MUCH black an image carries - it measures how colourful
    the lit part is. Under a plain mean, an image that is 80% black would always
    score low no matter how vivid its subject.
    """
    L = luma(a)
    s = np.abs(a - L[..., None]).max(axis=2)
    if mask is not None:
        L, s = L[mask], s[mask]
    return float((s * L).sum() / max(L.sum(), 1e-6))


def load(p):
    return np.asarray(Image.open(p).convert("RGB"), np.float32) / 255.0


def save(a, p):
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(
        p, "WEBP", quality=WEBP_Q, method=6)


# ---------------------------------------------------------------------- frames

def probe_frame(a):
    """Peak brightness and saturation of the LINE; the surface does not count."""
    L = luma(a)
    m = L > FLOOR
    if m.sum() < 200:
        m = L > np.percentile(L, 99)
    return float(np.percentile(L[m], 99.0)), sat_weighted(a, m)


def treat_frame(a, tgt_lum, tgt_sat):
    lum, _ = probe_frame(a)
    # 1. Align line brightness. Multiplicative rather than gamma: neon is
    #    additive light on a black ground and scales linearly.
    k = 1.0 + (tgt_lum / max(lum, 1e-4) - 1.0) * STRENGTH_LUM
    a = np.clip(a * np.clip(k, 0.70, 1.45), 0, 1)

    # 2. Align line saturation; hue stays untouched.
    ks = 1.0 + (tgt_sat / max(probe_frame(a)[1], 1e-3) - 1.0) * STRENGTH_SAT
    g = luma(a)[..., None]
    a = np.clip(g + (a - g) * np.clip(ks, 0.65, 1.45), 0, 1)

    # 3. Roll the card surface cleanly down to black. The frame is the card
    #    ground; a lifted floor turns every card in play grey.
    L = luma(a)[..., None]
    return np.clip(np.where(L < FLOOR, a * np.clip(L / FLOOR, 0, 1), a), 0, 1)


def inner_luma(a):
    """Brightness of the interior - the area the card rank is drawn over."""
    h, w = a.shape[:2]
    return float(luma(a[int(h * .22):int(h * .78), int(w * .22):int(w * .78)]).mean())


# --------------------------------------------------------------------- artwork

def probe_art(a):
    return float(np.percentile(luma(a), 85)), sat_weighted(a)


def treat_art(a, tgt_lum, tgt_sat, rng):
    lin = to_lin(a)

    # 1. Set the black point; only ever damp the white point. Dividing by the
    #    99.8th percentile would otherwise brighten neon-on-black about twofold.
    lin = np.clip(lin - np.percentile(luma(lin), 0.5), 0, 1)
    lin *= min(1.0, WHITE_POINT / max(float(np.percentile(luma(lin), 99.8)), 1e-4))

    # 2. Align luminous mass, asymmetrically: free to darken, barely able to
    #    brighten. Measured and solved in sRGB because `tgt_lum` comes from
    #    `probe_art` in sRGB. Setting an sRGB target against a linear-space
    #    measurement is a silent colour-space error - the curve then pulls the
    #    wrong way.
    a = to_srgb(lin)
    cur = max(float(np.percentile(luma(a), 85)), 1e-4)
    goal = max(tgt_lum * LUM_BIAS, 1e-4)
    gamma = 1.0 + (np.log(goal) / np.log(cur) - 1.0) * STRENGTH_LUM
    a = np.clip(a, 0, 1) ** np.clip(gamma, 0.95, 1.80)

    # 3. Shadow tint, luminance-neutral: red down, blue up, sum about zero.
    #    Simply adding blue lifts the black point and makes everything hazy.
    sh = np.clip(1.0 - luma(a)[..., None] * 3.0, 0, 1)
    a = np.clip(a + sh * np.array([-0.016, -0.004, 0.020], np.float32), 0, 1)

    # 4. Vignette.
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx / w - .5) / .5) ** 2 + ((yy / h - .5) / .5) ** 2) / 1.414
    a = a * (1.0 - VIGNETTE * np.clip(r, 0, 1) ** 2.2)[..., None]

    # 5. Grain in the MIDTONES, zero at black and white. Symmetric noise on
    #    black gets clipped at 0, leaving only the positive half - which raises
    #    the black point.
    Lg = luma(a)[..., None]
    a = np.clip(a + rng.normal(0, 1, (h, w, 1)).astype(np.float32)
                * 0.020 * (4.0 * Lg * (1.0 - Lg)), 0, 1)

    # 6. Saturation LAST - after vignette and grain, so the value that gets set
    #    is the value that gets measured.
    ks = 1.0 + (tgt_sat / max(sat_weighted(a), 1e-3) - 1.0) * STRENGTH_SAT
    g = luma(a)[..., None]
    a = np.clip(g + (a - g) * np.clip(ks, 0.60, 1.55), 0, 1)

    # 7. Re-anchor black.
    return np.clip((a - 0.012) / 0.988, 0, 1)


# --------------------------------------------------------------------- classes

CLASSES = {
    "frames": dict(file="front.webp", probe=probe_frame, treat=treat_frame,
                   metrics=("line peak brightness", "line saturation")),
    "art": dict(file="back.webp", probe=probe_art, treat=treat_art,
                metrics=("luminous mass (P85)", "saturation (weighted)")),
}


def run_class(name, rng):
    c = CLASSES[name]
    files = sorted(CARDS.glob(f"*/{c['file']}"))
    if not files:
        sys.exit(f"No files for class '{name}' under {CARDS}")
    src = [load(p) for p in files]
    before = np.array([c["probe"](a) for a in src])
    tgt = (float(np.median(before[:, 0])), float(np.median(before[:, 1])))
    if name == "art":
        out = [c["treat"](a, tgt[0], tgt[1], rng) for a in src]
    else:
        out = [c["treat"](a, tgt[0], tgt[1]) for a in src]
    return files, src, out, before, np.array([c["probe"](a) for a in out]), tgt


def report(name, files, before, after, tgt, c):
    print(f"\n{name.upper()}  --  {len(files)} files")
    print(f"  target from set median: {tgt[0]:.3f} / {tgt[1]:.3f}")
    print(f"  {'metric':26s}{'spread before':>15s}{'after':>10s}{'convergence':>13s}")
    for i, m in enumerate(c["metrics"]):
        sb, sa = before[:, i].std(), after[:, i].std()
        conv = f"{(1 - sa / sb) * 100:11.0f}%" if sb > 1e-9 else "          -"
        print(f"  {m:26s}{sb:15.4f}{sa:10.4f}{conv:>13s}")


def contact_sheet(path, pairs, title):
    def strip(imgs, cw=250):
        ims = [Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8)) for x in imgs]
        ims = [i.resize((cw, int(cw * i.height / i.width)), Image.LANCZOS) for i in ims]
        ch, pad = max(i.height for i in ims), 10
        o = Image.new("RGB", (len(ims) * (cw + pad) + pad, ch + 2 * pad), (11, 13, 17))
        for i, im in enumerate(ims):
            o.paste(im, (pad + i * (cw + pad), pad))
        return o

    a, b = strip([p[0] for p in pairs]), strip([p[1] for p in pairs])
    lab, gap = 34, 4
    c = Image.new("RGB", (a.width, a.height * 2 + gap + lab * 2), (11, 13, 17))
    c.paste(a, (0, lab))
    c.paste(b, (0, lab * 2 + a.height + gap))
    d = ImageDraw.Draw(c)
    d.text((14, 12), f"{title} -- BEFORE", fill=(150, 158, 170))
    d.text((14, lab + a.height + gap + 12), f"{title} -- AFTER", fill=(150, 158, 170))
    c.save(path)
    print(f"  contact sheet written: {path}")


def check_contrast(name, files, src, out):
    """Frames: prove no interior gets brighter, or the rank loses contrast."""
    d = np.array([inner_luma(t) - inner_luma(o) for o, t in zip(src, out)])
    print(f"  interior (rank contrast): mean {d.mean():+.4f}, "
          f"worst case {d.max():+.4f}")
    bad = [(files[i].parent.name, d[i]) for i in np.argsort(-d)[:5] if d[i] > 0.005]
    if bad:
        print("  WARNING - interior brightened:")
        for n, v in bad:
            print(f"    {n:24s}{v:+.4f}")
        return False
    print("  no frame brightens inside - rank contrast preserved.")
    return True


def check_not_brighter(name, src, out):
    """Both classes: enforce the 'never brighter on average' rule."""
    b = np.mean([luma(a).mean() for a in src])
    t = np.mean([luma(a).mean() for a in out])
    ok = t <= b
    print(f"  overall brightness: {b:.4f} -> {t:.4f} "
          f"({'ok, not brighter' if ok else 'WARNING - brighter than source'})")
    return ok


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--class", dest="klass", choices=[*CLASSES, "all"], default="all")
    ap.add_argument("--sheet", metavar="PATH", help="write a before/after contact sheet")
    ap.add_argument("--check", action="store_true",
                    help="assert interior contrast and the not-brighter rule")
    ap.add_argument("--apply", action="store_true",
                    help="write the files; originals are preserved under _raw/")
    args = ap.parse_args()

    names = [*CLASSES] if args.klass == "all" else [args.klass]
    rng = np.random.default_rng(7)   # fixed: same input, same output
    ok = True

    for name in names:
        files, src, out, before, after, tgt = run_class(name, rng)
        report(name, files, before, after, tgt, CLASSES[name])

        if args.check:
            ok &= check_not_brighter(name, src, out)
            if name == "frames":
                ok &= check_contrast(name, files, src, out)

        if args.sheet:
            have = [p.parent.name for p in files]
            idx = [have.index(d) for d in SHEET_DECKS if d in have]
            path = Path(args.sheet)
            if len(names) > 1:
                path = path.with_name(f"{path.stem}-{name}{path.suffix}")
            contact_sheet(path, [(src[i], out[i]) for i in idx], name.capitalize())

        if args.apply:
            for p, t in zip(files, out):
                raw = RAW / p.parent.name / p.name
                raw.parent.mkdir(parents=True, exist_ok=True)
                if not raw.exists():
                    shutil.copy2(p, raw)     # preserve the original once only
                save(t, p)
            print(f"  {len(files)} files written, originals under "
                  f"{RAW.relative_to(ROOT).as_posix()}")

    if args.apply:
        print("\nOriginals are kept locally and are gitignored; the durable rollback is "
              "the commit before the bake.")

    if args.check and not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
