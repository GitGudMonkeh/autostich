# Asset mapping — desktop-icons

The 98-item filename mapping produced by `icons-asset-audit`. This is the artefact `icons-skills`,
`icons-perks` and `icons-corners` consume: it says, for every icon the owner delivered, which game
entity it belongs to and what it is called in the repository.

The machine-readable twin is **`asset-mapping.tsv`** in this directory. `scripts/skill-art-build.py
ingest` reads that file; this document is the human-readable rendering of the same rows. Change one,
regenerate the other.

---

## How each mapping was verified

The acceptance gate of the task contract is explicit that a mapping asserted from visual similarity
alone fails **even when it happens to be correct** — the standard is the cross-check, not the
outcome. So no row here was decided by looking at a picture. Five methods were used:

| Method | Count | What it means |
| --- | --- | --- |
| `name` exact | 63 | The source filename, normalized, equals the `name` field of a `SKILL_DEFS` entry. |
| `label` exact | 20 | Same, against the `label` field of a `PERK_DEFS` entry. |
| owner, pre-resolved | 2 | `gletscherzturz.png` → `SK_ICE_14`, `Lawine.png` → `SK_ICE_L03`. Decided by the owner in planning, carried through unchanged. |
| by elimination | 1 | `zinsezins.png` → `L_ZINS`. See below. |
| pixel diff | 12 | The perk-category and corner files, which are already in the repository as WebP. Matched by decoded-pixel comparison, not by name. |

**Normalization** is the transliteration the repository already uses, read off the existing
filenames (`ueberspannung`, `blitzfaenger`, `gluehende-klinge`, `flaechenionisation`): lowercase,
`ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`, spaces to hyphens.

**The one elimination.** After the 20 exact `label` matches, exactly one source file
(`zinsezins.png`) and exactly one legendary perk (`L_ZINS`, label "Zinseszins") were left unpaired.
The source filename is the registry label with one `s` dropped. That is a registry-based deduction
over a closed set, not a visual guess — but it is the weakest row in the table and is marked as such.

**Integrity checks that passed.** No ID is claimed by two source files. Every one of the 98 source
files has exactly one row. Every generated filename round-trips through the live parse rule in
`src/ui/skillArt.js` (`artIdFromFile`) back to the ID it claims — checked mechanically for all 86
skill/legendary rows, not assumed.

---

## Reconciliation: local source vs. artwork already in the repository

Contract scope item 1. Method: decode both files to raw RGB at a common resolution, compare
per-pixel, report mean absolute difference (MAD, 0–255) and the share of pixels differing by more
than 32. Lossy WebP re-encoding of *the same* artwork lands near zero; different artwork does not.

**Counter-check first**, so the threshold is not self-serving: deliberately mismatched pairs from
the same lots score **11.1 – 19.3**. Every pair below scores under 1.3. The two verdicts are an order
of magnitude apart, not a judgement call.

| Lot | Files | MAD range | Verdict |
| --- | --- | --- | --- |
| `perks/` vs `docs/art/perkcats/perkcat_*.webp` | 7 | 0.70 – 1.21 | **Identical artwork.** The local PNGs are the pre-conversion source of the WebP masters already committed. No update needed. |
| `rahmen/` vs `docs/art/corners/corner_*.webp` | 5 | 0.52 – 0.90 | **Identical artwork.** Same conclusion. |
| `Fire/` (6 of 21) vs `docs/art/skills/fire/*.webp` | 6 | 0.60 – 1.65 | **Identical artwork.** The other 15 fire sources have no master yet. |
| `Blitz/` vs `docs/art/skills/lightning/*.webp` | 2 | **36.50 / 46.55** | **Updated artwork — the local PNG supersedes.** Confirms the owner's framing of these two as replacements. |

`Fire/feuersturm.png` needed a second pass. Squashed into a square it scored 4.98 and read as
"near"; **black-padded** to square first, as `docs/art/skills/README.md` requires for non-square
sources, it scores **0.60**. That is not just a mapping result — it independently confirms the
padding rule, because only padding reproduces the committed master.

---

## Naming conventions

**Skills** keep the established convention, unchanged: `SK_<ARCH>_<NN>_<slug>.webp`.

Note that **plant skill numbers run 02–18, not 01–17** — there is no `SK_PLANT_01` in the registry.
The mapping table below reflects the registry, not a renumbering.

**Legendary perks** get `<PERK_DEFS key>_<slug>.webp` — `L_BALL_ballast.webp`, `L4_kritische-masse.webp`.

The contract proposed a `PERK_` prefix. Owner decision (2026-08-22) chose the unprefixed form,
because the parse rule in `src/ui/skillArt.js` reads the leading uppercase run as the ID:

```js
/^([A-Z][A-Z0-9_]*[A-Z0-9])_[a-z][a-z0-9-]*\.webp$/
```

For skills that run *is* the `SKILL_DEFS` key. Unprefixed, it is likewise exactly the `PERK_DEFS`
key, so a future `perkArt.js` can reuse the rule verbatim instead of stripping a prefix — one rule
in the codebase rather than two. The reading-aid slug must start with a lowercase letter, which is
why the transliteration above is mandatory and not cosmetic.

**Perk categories** and **corners** keep their existing committed names; nothing is renamed.

---

## Mapping tables
<!-- Generated from asset-mapping.tsv. Do not hand-edit; regenerate instead. -->
### Ice — `Eis/` → `docs/art/skills/ice/` + `src/assets/skills/ice/`

21 files. Cross-checked against `SKILL_DEFS`.

| Source file | ID | Registry name | Repo filename | Verified via |
|---|---|---|---|---|
| `Lawine.png` | `SK_ICE_L03` | Große Lawine | `SK_ICE_L03_grosse-lawine.webp` | owner, pre-resolved |
| `abbruchkante.png` | `SK_ICE_10` | Abbruchkante | `SK_ICE_10_abbruchkante.webp` | `name` exact |
| `anfrieren.png` | `SK_ICE_01` | Anfrieren | `SK_ICE_01_anfrieren.webp` | `name` exact |
| `dauerfrost.png` | `SK_ICE_03` | Dauerfrost | `SK_ICE_03_dauerfrost.webp` | `name` exact |
| `einfrieren.png` | `SK_ICE_15` | Einfrieren | `SK_ICE_15_einfrieren.webp` | `name` exact |
| `eisbruecke.png` | `SK_ICE_07` | Eisbrücke | `SK_ICE_07_eisbruecke.webp` | `name` exact |
| `eispanzer.png` | `SK_ICE_17` | Eispanzer | `SK_ICE_17_eispanzer.webp` | `name` exact |
| `eiswall.png` | `SK_ICE_08` | Eiswall | `SK_ICE_08_eiswall.webp` | `name` exact |
| `eiszeit.png` | `SK_ICE_L01` | Eiszeit | `SK_ICE_L01_eiszeit.webp` | `name` exact |
| `erstarrung.png` | `SK_ICE_L04` | Erstarrung | `SK_ICE_L04_erstarrung.webp` | `name` exact |
| `ewiges schild.png` | `SK_ICE_L02` | Ewiges Schild | `SK_ICE_L02_ewiges-schild.webp` | `name` exact |
| `frostbund.png` | `SK_ICE_16` | Frostbund | `SK_ICE_16_frostbund.webp` | `name` exact |
| `gletscherzturz.png` | `SK_ICE_14` | Gletschersturz | `SK_ICE_14_gletschersturz.webp` | owner, pre-resolved |
| `kettenbruch.png` | `SK_ICE_11` | Kettenbruch | `SK_ICE_11_kettenbruch.webp` | `name` exact |
| `packeis.png` | `SK_ICE_06` | Packeis | `SK_ICE_06_packeis.webp` | `name` exact |
| `rissbildung.png` | `SK_ICE_13` | Rissbildung | `SK_ICE_13_rissbildung.webp` | `name` exact |
| `schneetreiben.png` | `SK_ICE_02` | Schneetreiben | `SK_ICE_02_schneetreiben.webp` | `name` exact |
| `verdichtung.png` | `SK_ICE_04` | Verdichtung | `SK_ICE_04_verdichtung.webp` | `name` exact |
| `verschmelzen.png` | `SK_ICE_05` | Verschmelzen | `SK_ICE_05_verschmelzen.webp` | `name` exact |
| `verzahnung.png` | `SK_ICE_09` | Verzahnung | `SK_ICE_09_verzahnung.webp` | `name` exact |
| `zermalmen.png` | `SK_ICE_12` | Zermalmen | `SK_ICE_12_zermalmen.webp` | `name` exact |

### Fire — `Fire/` → `docs/art/skills/fire/` + `src/assets/skills/fire/`

21 files. Cross-checked against `SKILL_DEFS`.

| Source file | ID | Registry name | Repo filename | Verified via |
|---|---|---|---|---|
| `ascheschmiede.png` | `SK_FIRE_15` | Ascheschmiede | `SK_FIRE_15_ascheschmiede.webp` | `name` exact |
| `brandmal.png` | `SK_FIRE_13` | Brandmal | `SK_FIRE_13_brandmal.webp` | `name` exact |
| `damaststahl.png` | `SK_FIRE_L04` | Damaststahl | `SK_FIRE_L04_damaststahl.webp` | `name` exact |
| `feuersturm.png` | `SK_FIRE_03` | Feuersturm | `SK_FIRE_03_feuersturm.webp` | `name` exact |
| `feuerwalze.png` | `SK_FIRE_08` | Feuerwalze | `SK_FIRE_08_feuerwalze.webp` | `name` exact |
| `flaechenbrand.png` | `SK_FIRE_11` | Flächenbrand | `SK_FIRE_11_flaechenbrand.webp` | `name` exact |
| `funkenflug.png` | `SK_FIRE_10` | Funkenflug | `SK_FIRE_10_funkenflug.webp` | `name` exact |
| `gluehende klinge.png` | `SK_FIRE_06` | Glühende Klinge | `SK_FIRE_06_gluehende-klinge.webp` | `name` exact |
| `glut.png` | `SK_FIRE_01` | Glut | `SK_FIRE_01_glut.webp` | `name` exact |
| `glutbett.png` | `SK_FIRE_04` | Glutbett | `SK_FIRE_04_glutbett.webp` | `name` exact |
| `glutstahl.png` | `SK_FIRE_16` | Glutstahl | `SK_FIRE_16_glutstahl.webp` | `name` exact |
| `lauffeuer.png` | `SK_FIRE_14` | Lauffeuer | `SK_FIRE_14_lauffeuer.webp` | `name` exact |
| `phoenixfeuer.png` | `SK_FIRE_L02` | Phönixfeuer | `SK_FIRE_L02_phoenixfeuer.webp` | `name` exact |
| `rueckzuendung.png` | `SK_FIRE_05` | Rückzündung | `SK_FIRE_05_rueckzuendung.webp` | `name` exact |
| `schmelzofen.png` | `SK_FIRE_17` | Schmelzofen | `SK_FIRE_17_schmelzofen.webp` | `name` exact |
| `schmelzpunkt.png` | `SK_FIRE_12` | Schmelzpunkt | `SK_FIRE_12_schmelzpunkt.webp` | `name` exact |
| `sonnenkern.png` | `SK_FIRE_L01` | Sonnenkern | `SK_FIRE_L01_sonnenkern.webp` | `name` exact |
| `sonnenzorn.png` | `SK_FIRE_L03` | Sonnenzorn | `SK_FIRE_L03_sonnenzorn.webp` | `name` exact |
| `verbrennung.png` | `SK_FIRE_09` | Verbrennung | `SK_FIRE_09_verbrennung.webp` | `name` exact |
| `weissglut.png` | `SK_FIRE_07` | Weißglut | `SK_FIRE_07_weissglut.webp` | `name` exact |
| `zunder.png` | `SK_FIRE_02` | Zunder | `SK_FIRE_02_zunder.webp` | `name` exact |

### Plant — `Pflanze/` → `docs/art/skills/plant/` + `src/assets/skills/plant/`

21 files. Cross-checked against `SKILL_DEFS`.

| Source file | ID | Registry name | Repo filename | Verified via |
|---|---|---|---|---|
| `Aussaat.png` | `SK_PLANT_05` | Aussaat | `SK_PLANT_05_aussaat.webp` | `name` exact |
| `Bluetezeit.png` | `SK_PLANT_11` | Blütezeit | `SK_PLANT_11_bluetezeit.webp` | `name` exact |
| `Flugsamen.png` | `SK_PLANT_06` | Flugsamen | `SK_PLANT_06_flugsamen.webp` | `name` exact |
| `Pfahlwurzel.png` | `SK_PLANT_03` | Pfahlwurzel | `SK_PLANT_03_pfahlwurzel.webp` | `name` exact |
| `Ranken.png` | `SK_PLANT_09` | Ranken | `SK_PLANT_09_ranken.webp` | `name` exact |
| `Setzlingsbeet.png` | `SK_PLANT_07` | Setzlingsbeet | `SK_PLANT_07_setzlingsbeet.webp` | `name` exact |
| `Wurzeltiefe.png` | `SK_PLANT_02` | Wurzeltiefe | `SK_PLANT_02_wurzeltiefe.webp` | `name` exact |
| `auslaeufer.png` | `SK_PLANT_15` | Ausläufer | `SK_PLANT_15_auslaeufer.webp` | `name` exact |
| `baumreihe.png` | `SK_PLANT_L03` | Baumreihe | `SK_PLANT_L03_baumreihe.webp` | `name` exact |
| `blaetterdach.png` | `SK_PLANT_13` | Blätterdach | `SK_PLANT_13_blaetterdach.webp` | `name` exact |
| `bluete.png` | `SK_PLANT_10` | Blüte | `SK_PLANT_10_bluete.webp` | `name` exact |
| `erntedank.png` | `SK_PLANT_17` | Erntedank | `SK_PLANT_17_erntedank.webp` | `name` exact |
| `ewiger fruehling.png` | `SK_PLANT_L04` | Ewiger Frühling | `SK_PLANT_L04_ewiger-fruehling.webp` | `name` exact |
| `jahresringe.png` | `SK_PLANT_04` | Jahresringe | `SK_PLANT_04_jahresringe.webp` | `name` exact |
| `kernholz.png` | `SK_PLANT_18` | Kernholz | `SK_PLANT_18_kernholz.webp` | `name` exact |
| `mutterbaum.png` | `SK_PLANT_L02` | Mutterbaum | `SK_PLANT_L02_mutterbaum.webp` | `name` exact |
| `photosynthese.png` | `SK_PLANT_12` | Photosynthese | `SK_PLANT_12_photosynthese.webp` | `name` exact |
| `rhizom.png` | `SK_PLANT_16` | Rhizom | `SK_PLANT_16_rhizom.webp` | `name` exact |
| `ueberwucherung.png` | `SK_PLANT_14` | Überwucherung | `SK_PLANT_14_ueberwucherung.webp` | `name` exact |
| `weltenbaum.png` | `SK_PLANT_L01` | Weltenbaum | `SK_PLANT_L01_weltenbaum.webp` | `name` exact |
| `zaeher halm.png` | `SK_PLANT_08` | Zäher Halm | `SK_PLANT_08_zaeher-halm.webp` | `name` exact |

### Lightning — `Blitz/` → `docs/art/skills/lightning/` + `src/assets/skills/lightning/`

2 files. Cross-checked against `SKILL_DEFS`.

| Source file | ID | Registry name | Repo filename | Verified via |
|---|---|---|---|---|
| `Blitzableiter_.png` | `SK_LIGHTNING_01` | Blitzableiter | `SK_LIGHTNING_01_blitzableiter.webp` | `name` exact |
| `donnergott_.png` | `SK_LIGHTNING_L01` | Donnergott | `SK_LIGHTNING_L01_donnergott.webp` | `name` exact |

### Legendary perks — `legendäre/` → `docs/art/legendaries/` + `src/assets/legendaries/`

21 files. Cross-checked against `PERK_DEFS`.

| Source file | ID | Registry name | Repo filename | Verified via |
|---|---|---|---|---|
| `ballast.png` | `L_BALL` | Ballast | `L_BALL_ballast.webp` | `label` exact |
| `bauhuette.png` | `L_BAUH` | Bauhütte | `L_BAUH_bauhuette.webp` | `label` exact |
| `brennpunkt.png` | `L_BRENN` | Brennpunkt | `L_BRENN_brennpunkt.webp` | `label` exact |
| `echo.png` | `L_ECHO` | Echo | `L_ECHO_echo.webp` | `label` exact |
| `fundament.png` | `L_FUND` | Fundament | `L_FUND_fundament.webp` | `label` exact |
| `henker.png` | `L_HENK` | Henker | `L_HENK_henker.webp` | `label` exact |
| `hochseil.png` | `L_HOCH` | Hochseil | `L_HOCH_hochseil.webp` | `label` exact |
| `kritische masse.png` | `L4` | Kritische Masse | `L4_kritische-masse.webp` | `label` exact |
| `meisterhand.png` | `L_MEIS` | Meisterhand | `L_MEIS_meisterhand.webp` | `label` exact |
| `monochrom.png` | `L_MONO` | Monochrom | `L_MONO_monochrom.webp` | `label` exact |
| `opfergang.png` | `L_OPFER` | Opfergang | `L_OPFER_opfergang.webp` | `label` exact |
| `patt.png` | `L_PATT` | Patt | `L_PATT_patt.webp` | `label` exact |
| `raserei.png` | `L6` | Raserei | `L6_raserei.webp` | `label` exact |
| `richtfest.png` | `L_RICHT` | Richtfest | `L_RICHT_richtfest.webp` | `label` exact |
| `sammler.png` | `L_SAMM` | Sammler | `L_SAMM_sammler.webp` | `label` exact |
| `schmiede.png` | `L_SCHM` | Schmiede | `L_SCHM_schmiede.webp` | `label` exact |
| `taktschlag.png` | `L_TAKT` | Taktschlag | `L_TAKT_taktschlag.webp` | `label` exact |
| `umverteilung.png` | `L_UMV` | Umverteilung | `L_UMV_umverteilung.webp` | `label` exact |
| `unaufhaltsam.png` | `L2` | Unaufhaltsam | `L2_unaufhaltsam.webp` | `label` exact |
| `vabanque.png` | `L_VAB` | Vabanque | `L_VAB_vabanque.webp` | `label` exact |
| `zinsezins.png` | `L_ZINS` | Zinseszins | `L_ZINS_zinseszins.webp` | by elimination |

### Perk categories — `perks/` → `docs/art/perkcats/` (already in repo)

7 files. Cross-checked against `CATEGORIES`.

| Source file | ID | Registry name | Repo filename | Verified via |
|---|---|---|---|---|
| `deck.png` | `A` | Kategorie A | `perkcat_A_deck.webp` | pixel diff |
| `stich.png` | `B` | Kategorie B | `perkcat_B_stich.webp` | pixel diff |
| `rolle.png` | `C` | Kategorie C | `perkcat_C_rolle.webp` | pixel diff |
| `score.png` | `D` | Kategorie D | `perkcat_D_score.webp` | pixel diff |
| `form.png` | `E` | Kategorie E | `perkcat_E_form.webp` | pixel diff |
| `praezision.png` | `P` | Kategorie P | `perkcat_P_praezision.webp` | pixel diff |
| `ausbau.png` | `S` | Kategorie S | `perkcat_S_ausbau.webp` | pixel diff |

### Corner ornaments — `rahmen/` → `docs/art/corners/` (already in repo)

5 files. Cross-checked against `archetype`.

| Source file | ID | Registry name | Repo filename | Verified via |
|---|---|---|---|---|
| `blitz.png` | `lightning` | lightning | `corner_lightning.webp` | pixel diff |
| `feuer.png` | `fire` | fire | `corner_fire.webp` | pixel diff |
| `eis.png` | `ice` | ice | `corner_ice.webp` | pixel diff |
| `pflanze.png` | `plant` | plant | `corner_plant.webp` | pixel diff |
| `perks.png` | `perk` | perk | `corner_perk.webp` | pixel diff |

