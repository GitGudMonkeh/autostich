# Legendary perk emblems — lot record

One emblem per **legendary perk** — the 21 entries in `PERK_DEFS` (`src/game/perks.js`) carrying
`rarity: "legendary"`. Unlike the regular perks, which share the emblem of their category
(`docs/art/perkcats/`), each legendary gets its own.

Ingested and shipped by `icons-perks`, 2026-08-22. Written in English per `AGENTS.md` — *Language
policy*; the older art READMEs beside it stay German as written.

| | |
| --- | --- |
| Masters | 21 × 1024 × 1024 WebP, `docs/art/legendaries/`, 3232 kB |
| Delivery | 21 × 384 × 384 WebP, `src/assets/legendaries/`, 350 kB |
| Built by | `python3 scripts/skill-art-build.py ingest --lot legendaries --from <artist folder>` then `bake --lot legendaries` |
| Sources | PNG, not in the repository (they live in the artist's folder); filename mapping in `docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.tsv` |
| Shown as | header strip of the perk offer tile, `.pk-strip.pk-strip-mid` in `src/index.css`, desktop only (from 1400 px) |
| Render zone | **265 × 201 CSS px**, measured — see below |

## The render zone is measured, not assumed

The bloom is baked into the file, and its radius is a CSS length divided by the width of the zone the
image is shown in (`BLOOM_CSS * SIZE / STRIP_W`). A borrowed width therefore produces a bloom that is
authoritative and wrong, which is why `scripts/skill-art-build.py` refused this lot until a real
number existed.

The number was read out of the running application by
`docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs`, and the emblem is drawn **265 CSS px**
wide at every desktop viewport it renders at (1600 × 900, 1920 × 1080, 2560 × 1440).

The tile is 270: the overlay card is width-capped at 880 px, so the three-column grid is 830 px and
each column is (830 − 2 × 10) / 3. The IMAGE is 5 px narrower, because `left: 0; right: 0` resolves
against the button's padding box and `.as-edge-card` carries a 4 px rarity edge on the left plus 1 px
on the other three sides. **The divisor is the width the emblem is rendered at, not the width of the
box around it** — the first pass here used 270 and would have baked a radius of 22.76 px where the
correct one is 23.18.

Three neighbouring numbers are traps rather than shortcuts: `STRIP_W = 277`, which the skill lots are
baked against and which was never measured on anything; 270.66, which is the *skill* card
(`ICONS-VIS-01` in the asset audit's visual review); and 270, which is this screen's tile — measured
on the right screen, but on the wrong box.

The zone HEIGHT, 201 px, is derived rather than chosen: 76 % of the measured 265, the composition
window `docs/art/perkcats/README.md` states. Change the tile width **or either border width** and both
numbers move; `test/perk-art.test.js` recomputes the height from the width so they cannot drift apart.

## Light alignment — against this lot, not against any other

Alignment is per lot: what has to match is the 21 legendaries against each other. A legendary tile
shows its own emblem and a regular tile shows its category's, so the two sets are never the same
picture in different tiles.

**The statistic is total emitted light** (mean Rec. 709 luma over the frame), not the luminous area
the perk-category set was aligned on, and the change is measured rather than preferred. Under
`mix-blend-mode: screen` on black, screen(a, b) = a + b − ab, which for the small values that dominate
an emblem is close to addition — the sum of the pixel values is, to first order, the light the tile
gains.

Area-matching does not merely give different numbers on this lot; **it does not converge.** Solving
for the lot's median area (30.1 %) drove five of the 21 files to the solver's 5.0 ceiling, and three
of those five were still short of the target there — Hochseil reached 23.3 % against a target of
30.1 %. The reason is that luminous area asks how much of the *frame* a motif fills, and these motifs
genuinely differ in that: Sammler is a full panel at 53.8 %, Vabanque a small lever at 14.5 %. The
perk-category set never exposed this because its area spread is 1.7-fold against this lot's 3.7-fold.

Solved by `python3 scripts/skill-art-build.py align --lot legendaries`; the factors ship in
`LEGENDARY_LIGHT` in that script.

| Emblem | emitted light | area > 10 | factor | after |
|---|---|---|---|---|
| L6 Raserei | 33.38 | 38.3 % | **0.65** | 21.4 |
| L_SAMM Sammler | 30.82 | 53.8 % | **0.70** | 21.3 |
| L4 Kritische Masse | 30.37 | 46.2 % | **0.71** | 21.3 |
| L_UMV Umverteilung | 25.15 | 38.3 % | **0.86** | 21.4 |
| L_BAUH Bauhütte | 24.18 | 43.7 % | **0.90** | 21.4 |
| L_BRENN Brennpunkt | 24.13 | 32.8 % | **0.90** | 21.4 |
| L2 Unaufhaltsam | 23.51 | 30.1 % | **0.92** | 21.4 |
| L_FUND Fundament | 23.30 | 32.4 % | **0.93** | 21.4 |
| L_ZINS Zinseszins | 22.70 | 27.6 % | **0.95** | 21.4 |
| L_TAKT Taktschlag | 22.41 | 28.9 % | **0.97** | 21.4 |
| L_ECHO Echo | 21.65 | 37.7 % | **1.00** | 21.7 |
| L_PATT Patt | 20.55 | 31.1 % | **1.05** | 21.3 |
| L_RICHT Richtfest | 20.01 | 32.2 % | **1.08** | 21.3 |
| L_OPFER Opfergang | 18.51 | 20.3 % | **1.17** | 20.7 |
| L_MONO Monochrom | 17.86 | 24.6 % | **1.21** | 20.9 |
| L_HENK Henker | 14.64 | 23.1 % | **1.48** | 19.9 |
| L_SCHM Schmiede | 13.62 | 25.2 % | **1.59** | 19.4 |
| L_MEIS Meisterhand | 12.28 | 20.9 % | **1.76** | 19.2 |
| L_BALL Ballast | 9.76 | 15.0 % | **2.22** | 17.2 |
| L_HOCH Hochseil | 9.68 | 15.5 % | **2.24** | 17.2 |
| L_VAB Vabanque | 7.97 | 14.5 % | **2.72** | 17.1 |

Spread 4.2-fold before, 1.26-fold after. **The residual is honest, not a rounding artefact:** the
three largest lifts (Vabanque, Hochseil, Ballast) do not reach the median even at their factor,
because clipping eats part of the lift. Pushing them further would flatten their cores into white to
buy a number. Clipped share stays at or below 0.55 % of pixels for the whole lot.

Two patterns sit in the table, and they are the same two the perk-category set found. The three
largest cuts (Raserei, Sammler, Kritische Masse) are the AREA motifs — a blaze, a full panel, an
explosion. The three largest lifts are LINE motifs on a lot of black. Line against area, again.

## The composition does not follow the perk-category rule — and the strip is anchored for it

`docs/art/perkcats/README.md` requires the motif in the upper two thirds with the lower third near
black, because the header strip shows the top 76 % of the square. **The seven category masters were
built for that. These 21 were not** — they never lived in this repository and were never composed
against that rule.

Measured as the vertical centroid of the light, 0 = top:

| Lot | median centroid |
| --- | --- |
| Perk categories | **0.42** — upper two thirds, as documented |
| Legendaries | **0.48** — centred |

Anchoring them at the top therefore cuts the subject, not the ground. Share of each emblem's light
surviving crop *and* mask:

| Anchor | median | worst case |
| --- | --- | --- |
| `center top` | 71.4 % | **Henker 34.7 %** — the axe head sits under the edge; you see the shaft |
| `center center` | 86.5 % | Henker 56.7 % |

So the legendary strip carries `object-position: center center` (`.pk-strip-mid`). That is the same
rule applied to a lot whose premise differs, not a second design: `center top` exists because "the
motifs have their statement at the top", and here they measurably do not. The **zone is unchanged**,
so both perk lots keep the same baked bloom radius.

Comparison of both anchors over all 21:
`docs/workstreams/desktop-icons/icons-perks/visual/V2-legendaries-anchor-comparison.png`.

## Filename mapping

20 of the 21 sources were matched by exact label. The one exception is recorded by the asset audit as
weak and was **verified for this task**: `legendäre/zinsezins.png` → `L_ZINS` "Zinseszins", matched
`by-elimination`. The file shows a growing stack of gold coins, it is the only economic motif in the
set, and the other 20 rows are label-exact — so the elimination and the motif agree.

## Adding a legendary perk

The emblem binds by filename. A new legendary needs `<ID>_<lowercase-name>.webp` in both directories;
the ID part is the `PERK_DEFS` id and the lowercase part is a reading aid only. `test/perk-art.test.js`
fails in both directions if a perk has no emblem or an emblem has no perk. The light table in
`scripts/skill-art-build.py` must gain the file too — `bake` refuses a lot whose table has drifted —
and the target median moves, so re-run `align` for the whole lot rather than solving one file.
