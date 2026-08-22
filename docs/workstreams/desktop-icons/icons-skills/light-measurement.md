# Per-lot light measurement — icons-skills

Measured on 2026-08-22 with:

```powershell
py -3 scripts/skill-art-build.py measure --lot fire
py -3 scripts/skill-art-build.py measure --lot plant
```

The script measures the 1024 px masters. `area` is the share of pixels above Rec. 709 luma 10;
`light` is that area multiplied by the image's p99 luma. The comparison is strictly within each
lot, as required by the task contract. Values from Lightning or Ice are context only and are not
targets.

## Summary

| Lot | Median area | Area span | Median light | Light span | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| Fire | 17.7% | 1.4–30.1% | 25.4 | 0.2–62.8 | Ship as generated; no cap |
| Plant | 17.2% | 5.5–71.7% | 28.2 | 5.2–181.4 | Ship as generated; no cap |

No numeric cap factor exists because no cap was applied. The owner reviewed the V2 contact sheets
with these measurements called out and passed V3 with the verdict **“Bestanden, kein Cap.”**

## Fire

| Master | Area >10 | Light |
| --- | ---: | ---: |
| `SK_FIRE_01_glut.webp` | 28.6% | 26.6 |
| `SK_FIRE_02_zunder.webp` | 19.0% | 25.4 |
| `SK_FIRE_03_feuersturm.webp` | 17.7% | 32.4 |
| `SK_FIRE_04_glutbett.webp` | 21.0% | 21.1 |
| `SK_FIRE_05_rueckzuendung.webp` | 10.3% | 14.0 |
| `SK_FIRE_06_gluehende-klinge.webp` | 25.3% | 55.6 |
| `SK_FIRE_07_weissglut.webp` | 13.5% | 20.3 |
| `SK_FIRE_08_feuerwalze.webp` | 26.4% | 59.3 |
| `SK_FIRE_09_verbrennung.webp` | 9.6% | 8.1 |
| `SK_FIRE_10_funkenflug.webp` | 13.7% | 14.7 |
| `SK_FIRE_11_flaechenbrand.webp` | 21.3% | 46.8 |
| `SK_FIRE_12_schmelzpunkt.webp` | 1.4% | 0.2 |
| `SK_FIRE_13_brandmal.webp` | 18.4% | 16.9 |
| `SK_FIRE_14_lauffeuer.webp` | 17.5% | 13.4 |
| `SK_FIRE_15_ascheschmiede.webp` | 11.0% | 12.6 |
| `SK_FIRE_16_glutstahl.webp` | 8.2% | 7.8 |
| `SK_FIRE_17_schmelzofen.webp` | 13.9% | 33.9 |
| `SK_FIRE_L01_sonnenkern.webp` | 16.6% | 34.3 |
| `SK_FIRE_L02_phoenixfeuer.webp` | 21.6% | 42.2 |
| `SK_FIRE_L03_sonnenzorn.webp` | 18.4% | 28.9 |
| `SK_FIRE_L04_damaststahl.webp` | 30.1% | 62.8 |

`SK_FIRE_12` is the measured low outlier. In the actual header crop it remains legible as a small
molten drop over its reflection. The contract's allowed cap only pulls bright files down; it cannot
and must not invent missing lit area by lifting a sparse image. V3 accepted the resulting contrast.

## Plant

| Master | Area >10 | Light |
| --- | ---: | ---: |
| `SK_PLANT_02_wurzeltiefe.webp` | 10.6% | 14.1 |
| `SK_PLANT_03_pfahlwurzel.webp` | 13.0% | 23.4 |
| `SK_PLANT_04_jahresringe.webp` | 71.7% | 181.4 |
| `SK_PLANT_05_aussaat.webp` | 15.2% | 27.4 |
| `SK_PLANT_06_flugsamen.webp` | 7.5% | 7.3 |
| `SK_PLANT_07_setzlingsbeet.webp` | 5.5% | 5.2 |
| `SK_PLANT_08_zaeher-halm.webp` | 15.4% | 31.9 |
| `SK_PLANT_09_ranken.webp` | 12.7% | 11.8 |
| `SK_PLANT_10_bluete.webp` | 18.5% | 38.1 |
| `SK_PLANT_11_bluetezeit.webp` | 10.7% | 16.9 |
| `SK_PLANT_12_photosynthese.webp` | 24.5% | 50.8 |
| `SK_PLANT_13_blaetterdach.webp` | 26.5% | 45.5 |
| `SK_PLANT_14_ueberwucherung.webp` | 21.3% | 27.5 |
| `SK_PLANT_15_auslaeufer.webp` | 26.8% | 50.7 |
| `SK_PLANT_16_rhizom.webp` | 16.6% | 28.2 |
| `SK_PLANT_17_erntedank.webp` | 11.6% | 23.6 |
| `SK_PLANT_18_kernholz.webp` | 18.9% | 32.4 |
| `SK_PLANT_L01_weltenbaum.webp` | 30.3% | 61.4 |
| `SK_PLANT_L02_mutterbaum.webp` | 36.8% | 67.6 |
| `SK_PLANT_L03_baumreihe.webp` | 17.2% | 23.9 |
| `SK_PLANT_L04_ewiger-fruehling.webp` | 43.9% | 93.7 |

`SK_PLANT_04` is the measured high outlier at roughly 6.4 times the plant median; `SK_PLANT_L04` is
the next-highest at roughly 3.3 times the median. Both were explicitly named in the V3 prompt. The
owner chose the no-cap path, so the final masters and deliveries remain the audited source artwork
plus the ordinary lot bake.
