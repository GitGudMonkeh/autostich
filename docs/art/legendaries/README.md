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

## Light alignment — measured where the emblems are actually shown

Alignment is per lot: what has to match is the 21 legendaries against each other. A legendary tile
shows its own emblem and a regular tile shows its category's, so the two sets are never the same
picture in different tiles.

**The statistic is light AS SHOWN** — the mean Rec. 709 luma of the delivery file after resize,
bloom, crop to the 265 × 201 zone and the CSS mask, weighed row by row against that mask. Under
`mix-blend-mode: screen` on black, screen(a, b) = a + b − ab, which for the small values that
dominate an emblem is close to addition, so that quantity is the light the tile actually gains.

### Two earlier statistics, and why each was abandoned

**Luminous area**, the procedure `docs/art/perkcats/README.md` used, does not converge on this lot.
Solving for its median area (30.1 %) drove five of the 21 files to the solver's ceiling, and three of
those were still short of target there — Hochseil reached 23.3 % against 30.1 %. Area asks how much
of the *frame* a motif fills, and these motifs genuinely differ in that: Sammler is a full panel at
53.8 %, Vabanque a small lever at 14.5 %. The perk-category set never exposed this because its area
spread is 1.7-fold against this lot's 3.7-fold.

**Total emitted light on the master** converged, and it shipped for a few hours. **Caught in review,
2026-08-22:** it measures the brightness-corrected master, full frame, *before* resize, bloom, crop
and mask, and reported a 1.26-fold residual spread. Measured where the emblems are shown, that same
table spreads **1.78-fold** — because the mask discards the bottom of the frame and these motifs
differ in how much of their light sits down there. Henker was hit hardest: it shipped at 1.48 where
it needs 3.12.

The figure was not wrong about its own intermediate state. It was measuring a state nobody looks at.
An alignment is a claim about what the player sees, so it has to be measured there.

### The shipped factors

Solved by `python3 scripts/skill-art-build.py align --lot legendaries`; the table lives in
`LEGENDARY_LIGHT` in that script. `raw` and `after` are light as shown, `clip` is the share of
pixels the lift flattens to white.

| Emblem | raw | factor | after | clip |
|---|---|---|---|---|
| L6 Raserei | 54.12 | **0.59** | 33.84 | 0.00 % |
| L4 Kritische Masse | 49.66 | **0.65** | 33.76 | 0.00 % |
| L_SAMM Sammler | 49.31 | **0.66** | 33.53 | 0.00 % |
| L_UMV Umverteilung | 43.88 | **0.75** | 33.60 | 0.00 % |
| L_FUND Fundament | 41.04 | **0.80** | 33.69 | 0.00 % |
| L_BRENN Brennpunkt | 39.67 | **0.83** | 33.65 | 0.00 % |
| L2 Unaufhaltsam | 39.15 | **0.84** | 33.52 | 0.00 % |
| L_TAKT Taktschlag | 37.99 | **0.87** | 33.46 | 0.00 % |
| L_ECHO Echo | 37.71 | **0.89** | 33.71 | 0.00 % |
| L_BAUH Bauhütte | 36.49 | **0.93** | 33.46 | 0.00 % |
| L_PATT Patt | 33.60 | **1.00** | 33.60 | 0.02 % |
| L_ZINS Zinseszins | 32.38 | **1.06** | 33.51 | 0.09 % |
| L_MONO Monochrom | 30.90 | **1.13** | 33.62 | 0.00 % |
| L_RICHT Richtfest | 28.09 | **1.27** | 33.57 | 0.17 % |
| L_MEIS Meisterhand | 24.33 | **1.54** | 33.66 | 0.19 % |
| L_OPFER Opfergang | 25.06 | **1.92** | 33.62 | 1.11 % |
| L_SCHM Schmiede | 21.94 | **1.98** | 33.62 | 0.29 % |
| L_HOCH Hochseil | 19.76 | **2.29** | 33.58 | 0.23 % |
| L_BALL Ballast | 17.59 | **3.00** | 33.77 | 0.41 % |
| L_HENK Henker | 16.19 | **3.12** | 33.62 | 0.26 % |
| L_VAB Vabanque | 15.68 | **3.14** | 33.59 | 0.09 % |

**Spread 3.45-fold before, 1.01-fold after**, with no file landing on a solver bound and the worst
clip cost 1.11 % of pixels (Opfergang). Re-running `align` against the shipped table reports a
divergence of zero, which is the check that the table and the solver still agree.

Two patterns sit in the table. The three largest cuts (Raserei, Sammler, Kritische Masse) are the
AREA motifs — a blaze, a full panel, an explosion. The three largest lifts (Vabanque, Henker,
Ballast) are LINE motifs on a lot of black, and Henker additionally loses more to the mask than
anything else in the lot. Line against area, again, now with the mask on top of it.

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
