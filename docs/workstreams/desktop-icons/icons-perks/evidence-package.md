# Evidence package — icons-perks

What was actually run, what it produced, and what it does **not** cover. Per
`docs/engineering/task-lifecycle.md` §7. Every claim below is either a command that was run or a
figure that was measured; where something was reasoned rather than measured it says so.

| | |
| --- | --- |
| Task | `icons-perks` (Tier C) |
| Branch | `task/icons-perks` |
| Base | `origin/feature/desktop-icons` @ `3013881f723080753b8829feea4b051356f0cae0` |
| Worktree | `C:/Code/Autostich-worktrees/icons-perks` |
| Platform | Windows 11, Node 24.18.0, Python 3.12.10 with Pillow 12.3.0 |
| Date | 2026-08-22 |

---

## 1. The acceptance gate

> Every offer tile on the perk-selection screen renders an icon in the running application — the
> category icon for a regular perk, its own icon for a legendary one — and the render zone that the
> bloom radius was computed from is the zone that was measured live in that same screen.

**Met, and measured rather than asserted.** In the running application at 1600 × 900, 1920 × 1080 and
2560 × 1440, the three tiles of seed 33's first perk offer resolve to:

| Tile | Population | `<img src>` |
| --- | --- | --- |
| Vabanque | legendary | `L_VAB_vabanque.webp` — its own |
| Starker Auftakt II | family, category B | `perkcat_B_stich.webp` — its category's |
| Leibwache I | family, category C | `perkcat_C_rolle.webp` — its category's |

Both populations appear in one capture. The zone the bloom was computed from — **265 CSS px** — is
the `<img>` box read out of that same DOM, not a value taken from the stylesheet or from the skill
card. `visual/V2-measurements.json`, and the second half of §3 below.

---

## 2. Gates

Run in the worktree, bare, with no pipes (`AGENTS.md` — *Important shell rule*).

| Gate | Result |
| --- | --- |
| `npm test` | **135 of 136 files green, 2079 of 2080 tests.** The one failure is a pre-existing timeout, measured at `HEAD` as well — see §5 |
| `npm run lint -- --max-warnings=0` | green |
| `npm run build` | green |
| `VITE_PREVIEW=1 npm run build` | green |
| `npm run gen:db` | green — 219 entries |
| `npm run loc:export` | run; **produced no diff.** No player-visible text changed: the emblem is `alt=""` and `aria-hidden="true"`, so it contributes no string |

Build output was checked rather than assumed: 28 emblems are emitted as separate asset files and the
entry chunk contains **zero** `data:image/webp` occurrences.

---

## 3. The render zone — the measurement this task exists for

`scripts/skill-art-build.py` refused `perkcats` and `legendaries` because the bloom radius is a CSS
length divided by the zone width and no zone existed. The refusal was removed by producing a
measurement, not by setting a flag.

**How.** `docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs` (committed) launches
headless Chrome through the repository's existing `scripts/cdp.mjs`, seeds a deterministic profile
and run seed, plays the run to its first perk decision and reads the geometry out of the live DOM.

**Result, identical at every desktop viewport the emblems render at:**

| Viewport | Tile | `<img class="pk-strip">` |
| --- | --- | --- |
| 1600 × 900 | 270.00 | **265 × 201** |
| 1920 × 1080 | 270.00 | **265 × 201** |
| 2560 × 1440 | 270.00 | **265 × 201** |
| 1280 × 720 | 230.00 | none — below the 1400 px gate |

**The 5 px between 270 and 265 is the point, and this task got it wrong once.** The first pass read
the tile width off the grid — the right screen, the wrong box — and baked both lots against 270,
which is a radius of 22.76 px where the correct one is 23.18. The strip is `left: 0; right: 0`, which
resolves against the button's *padding* box, and `.as-edge-card` carries a 4 px rarity edge plus 1 px
on the other three sides. Corrected, re-baked, and the guard now rejects 270 alongside 277 and 270.66.
Filed as `ICONS-PERK-VIS-07`. It is worth a reviewer's attention because the contract's tripwire warns
against a *borrowed* constant and this was a *measured* one — same failure, different origin.

The zone height, 201 px, is derived: 76 % of 265, the composition window the perk masters were built
for. A guard recomputes it from the width, so the two cannot drift apart silently.

**Q1 confirmed live.** The legendary tile measures the same as the regular ones at every size, so one
`strip_w` covers both lots — which is what the contract closed from the code.

---

## 4. What was built

| Part | State |
| --- | --- |
| Legendary lot | 21 masters (1024², 3232 kB) + 21 delivery (384², 350 kB). Both directories new |
| Perk-category lot | 7 delivery (384², 42 kB). Masters untouched |
| Light alignment | perkcats: the README's 7 existing factors applied unchanged. legendaries: 21 factors solved by the new `align` mode against the lot's own median |
| Wiring | `src/ui/perkArt.js` (new), `PerkSelect.jsx`, `.pk-offer-art` / `.pk-strip` / `.pk-strip-mid` in `src/index.css` |
| Guards | `test/perk-art.test.js`, 32 assertions |
| Inline limit | `vite.config.js` extended to the two new asset directories |

**The skill lots are byte-identical after the change.** `python3 scripts/skill-art-build.py` was
re-run with no `--lot` and `git status src/assets/skills` is clean — so generalising the script did
not disturb what already shipped.

**The bake refusal still works for the lot that still needs it.** `bake --lot corners` prints
`skip corners: no settled render zone yet`.

### Light alignment, and one method change

The perk-category factors are the README's, applied and not re-derived, per the contract.

The legendary factors are new and were solved against **total emitted light** rather than luminous
area. That is a change of statistic and it was measured, not preferred: solving for area drove five
of 21 files to the solver's 5.0 ceiling and three of those were still short of target there
(Hochseil 23.3 % against 30.1 %). Full derivation in `docs/art/legendaries/README.md`. Raw spread
4.2-fold, aligned 1.26-fold, clipping ≤ 0.55 % of pixels.

Running `align --lot perkcats` under the new statistic reports a divergence from the shipped factors —
largest at E Form, 1.06 solved against 0.73 shipped — and deliberately does not act on it
(`ICONS-PERK-VIS-05`).

### Guards, each counter-checked

Every guard was verified by breaking the seam it protects and confirming it goes red. Eleven
mutations, all caught, tree restored and baseline green afterwards:

```text
desktop gate removed                                          caught
population fallback introduced                                caught
zone width borrowed from the skill lot (strip_w 265 -> 277)    caught
css zone height drifts from the measured width                caught
runtime filter added to the strip                             caught
a legendary light factor dropped                              caught
vite inline exclusion narrowed back                           caught
emblem bound to the translated name instead of the key        caught
legendary anchor dropped                                      caught
legendary anchor hung on a second definition of legendary     caught
a legendary delivery file deleted                             caught
```

---

## 5. Known state the reviewer will hit

**`test/i18n-guards.test.js` › "jeder Katalog-Schlüssel wird auch irgendwo benutzt" fails in the full
suite on this machine.** It is a **timeout, not an assertion failure**, and it is **pre-existing**.

Measured across repeated runs rather than characterised from one, because the first attempt at
explaining it was wrong: it was blamed on a Vite dev server running alongside, and that turned out to
be a coincidence — it fails with the dev server stopped too.

| Tree | Full-suite runs | Guard duration |
| --- | --- | --- |
| This task | 5 runs, **5 failed** | 5121 · 5139 · 5158 · 5166 · 5232 ms |
| `HEAD`, this task's changes removed | 3 runs, **2 failed, 1 passed** | 5017 · 5154 ms (the passing run reported none) |
| The same test, run alone | 3 runs, **3 passed** | 2050 ms |

The budget is **5000 ms**. The guard sits a few percent over it under full-suite parallel load and a
comfortable 2.4× under it alone, so what fails is the timeout, not the check.

**It fails at `HEAD` too**, which is the part that matters: this task did not introduce it. What this
task cannot honestly claim is *zero* influence at a margin that tight. The guard concatenates every
`src/**` JS/JSX file into one string and runs roughly 10 000 substring scans over it;
`src/ui/perkArt.js` adds about 5 kB to a corpus of roughly 1.5 MB, so ~0.3 % more work — well inside
the 100+ ms run-to-run spread above, but not nothing when the headroom is 150 ms.

**Not fixed here, deliberately.** Raising the budget would mean editing a guard this task does not
own, for a condition it did not create; the contract's file surface allows new guards, "never a
weakening". Reported instead. CI runs on Linux on different hardware, where this has evidently not
been hitting; if it starts to, the fix belongs to a task that owns that file.

The working tree was restored after the `HEAD` experiment and verified byte-identical with
`git hash-object`.

---

## 6. Hazards from the contract

| # | Hazard | Status |
| --- | --- | --- |
| H1 | Bloom constants calibrated for a 277 px skill strip do not transfer | **Measured and closed.** 265 px, read from the live DOM at three viewports; both lots baked against it. Guarded and counter-checked. The near-miss at 270 is filed as `ICONS-PERK-VIS-07` |
| H2 | `legendaries/` is a new directory; Windows/Linux case sensitivity | **Mitigated, partly verified.** All 42 filenames are lowercase ASCII apart from the uppercase registry ID, which is generated from `PERK_DEFS` rather than typed. Both builds pass on Windows; **the Linux half is CI's to confirm and has not run here** |
| H3 | A regular perk must never fall back to a legendary icon or vice versa | **Closed with a guard, not just correct code.** Two separate maps with no path between them; four assertions including the adversarial case (L_ZINS is category C, so a fallback would be *possible*). Counter-checked by introducing the fallback and watching the guard go red |
| H4 | Source-text ratchets can go red on new JSX/CSS without a behaviour change | **Did not occur.** 135 of 136 files green, and the one failure is the pre-existing timeout in §5. No existing guard was touched, weakened or deleted |
| H5 | The mapping's weak `zinsezins.png` → `L_ZINS` row | **Verified, two ways.** The image is a growing stack of gold coins, the only economic motif in the set; and the other 20 rows are label-exact, so elimination and motif agree. Visible bottom-left in `visual/V2-legendaries-in-strip-geometry.png` |
| H6 | A runtime CSS filter would regress the measured 271–417 ms mount | **Avoided and guarded.** Bloom is baked; `filter: none` read from the live DOM; guards assert no `filter:`/`blur(` on either new rule, counter-checked |

---

## 7. What this package does NOT cover

- **V3 is open.** No human has looked at the result. Nothing here is a visual approval.
- **25 of the 28 emblems were never seen on the screen.** One legendary and two category emblems
  rendered in the application; the other 25 were verified as files, as bindings and in the exact
  strip geometry offline. That is a lot-level check, not a screen-level one (`DR-2`).
- **V1 is base-commit-derived, not an untouched first capture.** It was taken correctly, then
  overwritten by operator error and regenerated deterministically from the immutable base. The
  regeneration reproduces the original figures, but the property that a baseline cannot be influenced
  by knowledge of the change is gone (`DR-1`).
- **Linux was not exercised.** Case sensitivity and line endings for the new directory are CI's.
- **No performance measurement was taken.** The mount cost was *avoided by construction* (no runtime
  filter) rather than measured before and after. The 271–417 ms figure is quoted from the engineering
  log, not re-measured here.
- **Only German was rendered.** The emblem binds to the category KEY rather than to the translated
  name, and there is a guard for it, but no English capture was taken.
- **DPR 1 only.** No high-DPI capture; the 384 px delivery size is inherited from the skill lots'
  reasoning rather than re-derived for this zone.
