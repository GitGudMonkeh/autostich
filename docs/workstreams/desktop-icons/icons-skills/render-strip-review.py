#!/usr/bin/env python3
"""Render skill deliveries in the measured offer-card header geometry."""

from argparse import ArgumentParser
from math import ceil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


CARD_W = 271
CARD_H = 210
FADE_START = 0.62
COLS = 7
GAP = 8
MARGIN = 8
TITLE_H = 28
LABEL_H = 22
SHEET_BG = (23, 24, 29)
CARD_BG = (8, 10, 15)
LABEL_BG = (18, 19, 24)
TEXT = (185, 188, 198)


def render_header(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGB")
    scale = max(CARD_W / source.width, CARD_H / source.height)
    resized = source.resize(
        (round(source.width * scale), round(source.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - CARD_W) // 2
    crop = resized.crop((left, 0, left + CARD_W, CARD_H))

    background = Image.new("RGB", (CARD_W, CARD_H), CARD_BG)
    screened = ImageChops.screen(background, crop)
    fade_y = round(CARD_H * FADE_START)
    mask = Image.new("L", (CARD_W, CARD_H))
    mask.putdata(
        [
            255 if y <= fade_y else round(255 * (CARD_H - 1 - y) / (CARD_H - 1 - fade_y))
            for y in range(CARD_H)
            for _ in range(CARD_W)
        ]
    )
    return Image.composite(screened, background, mask)


def render_lot(lot: str, output: Path) -> None:
    files = sorted(Path("src/assets/skills", lot).glob("*.webp"))
    if len(files) != 21:
        raise SystemExit(f"{lot}: expected 21 delivery files, found {len(files)}")

    rows = ceil(len(files) / COLS)
    tile_w = CARD_W
    tile_h = CARD_H + LABEL_H
    width = MARGIN * 2 + COLS * tile_w + (COLS - 1) * GAP
    height = TITLE_H + MARGIN + rows * tile_h + (rows - 1) * GAP + MARGIN
    sheet = Image.new("RGB", (width, height), SHEET_BG)
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=11)
    title_font = ImageFont.load_default(size=12)
    draw.text(
        (MARGIN, 7),
        f"V2 - {lot.upper()}, all 21 delivery files in measured header geometry "
        f"({CARD_W} x {CARD_H}, cover, center top, screen blend, 62% mask fade)",
        fill=TEXT,
        font=title_font,
    )

    for index, path in enumerate(files):
        row, col = divmod(index, COLS)
        x = MARGIN + col * (tile_w + GAP)
        y = TITLE_H + MARGIN + row * (tile_h + GAP)
        sheet.paste(render_header(path), (x, y))
        draw.rectangle((x, y + CARD_H, x + tile_w - 1, y + tile_h - 1), fill=LABEL_BG)
        draw.text((x + 3, y + CARD_H + 4), path.stem, fill=TEXT, font=font)

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "PNG", optimize=True)
    print(f"{lot}: {len(files)} headers -> {output} ({width}x{height})")


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--lot", choices=("fire", "plant"), required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    render_lot(args.lot, args.output)


if __name__ == "__main__":
    main()
