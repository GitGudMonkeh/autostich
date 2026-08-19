#!/usr/bin/env python3
"""#skillart — Auslieferungsfassung der Skill-Embleme aus den Mastern erzeugen.

    python3 scripts/skill-art-build.py

Liest `docs/art/skills/<archetyp>/*.webp` (die 1024er Master, unverändert) und schreibt
`src/assets/skills/<archetyp>/*.webp` mit derselben Namensgebung.

ZWEI Schritte, beide mit Begründung:

1. Verkleinern auf 192 px. Gezeigt wird das Emblem als Kopfstreifen der Angebotskarte: die Karte ist
   ~277 CSS-px breit, der Streifen zeigt das Bild `cover`. Bei DPR-Deckel 2 (mobileTier.js) wären
   554 px exakt — die Zone ist aber nur 130 px hoch, es ist also ohnehin ein Ausschnitt, und 192
   reicht für die gezeigte Fläche. Alle 21 Blitz-Embleme zusammen: ~120 kB.

2. Bloom EINBACKEN statt im Browser rechnen. Am Gerät entschieden (19.08.2026) über einen Regler:
   Radius 15 CSS-px, Stärke 60 %, Sättigung 260 %. Als CSS-Filter wäre das Rasterarbeit auf genau
   dem Screen, der ohnehin am Mount klemmt (271–417 ms in `phase:levelup`, s. CLAUDE.md) — gebacken
   kostet es null Laufzeit.

   Der Radius wird UMGERECHNET, nicht übernommen: 15 px gelten für die Anzeige mit 277 px Breite,
   die Datei hat 192 → 15 × 192/277 = 10,4 px. Wer die Zonenbreite ändert, muss diese Zahl mitziehen.

   Die Rechnung ist die des Browsers: eine unscharfe, gesättigte Kopie mit 60 % Deckkraft additiv
   (screen) unter das scharfe Bild. Auf schwarzem Grund ist `screen` genau die Addition, die die
   Karte im Spiel auch macht — deshalb sieht das gebackene Bild aus wie die Vorschau.
"""
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
from pathlib import Path

SIZE = 192            # Kantenlänge der Auslieferung
STRIP_W = 277         # CSS-Breite der Zone (Angebotskarte auf 880 px Karte)
BLOOM_CSS = 15        # Radius in CSS-px, am Gerät gewählt
BLOOM_STRENGTH = 0.60 # Deckkraft der unscharfen Kopie
BLOOM_SAT = 2.60      # Sättigung der unscharfen Kopie

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
