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
"""
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
from pathlib import Path

SIZE = 384            # Kantenlänge der Auslieferung
STRIP_W = 277         # CSS-Breite der Zone (Angebotskarte auf 880 px Karte)
BLOOM_CSS = 16        # Radius in CSS-px, am Gerät gewählt
BLOOM_STRENGTH = 0.70 # Deckkraft der unscharfen Kopie
BLOOM_SAT = 2.00      # Sättigung der unscharfen Kopie

SRC = Path("docs/art/skills")
OUT = Path("src/assets/skills")

def bake(im):
    """Scharfes Bild + unscharfe, gesättigte Kopie, additiv überlagert (wie `mix-blend-mode: screen`)."""
    sigma = BLOOM_CSS * SIZE / STRIP_W
    glow = im.filter(ImageFilter.GaussianBlur(sigma))
    glow = ImageEnhance.Color(glow).enhance(BLOOM_SAT)
    glow = ImageEnhance.Brightness(glow).enhance(BLOOM_STRENGTH)
    return ImageChops.screen(im, glow)

def main():
    n = 0
    total = 0
    for master in sorted(SRC.glob("*/*.webp")):
        out = OUT / master.parent.name / master.name
        out.parent.mkdir(parents=True, exist_ok=True)
        im = Image.open(master).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        bake(im).save(out, "WEBP", quality=86, method=6)
        n += 1
        total += out.stat().st_size
    print(f"{n} Embleme, {total/1024:.0f} kB (Radius {BLOOM_CSS*SIZE/STRIP_W:.1f} px auf {SIZE} px)")

if __name__ == "__main__":
    main()
