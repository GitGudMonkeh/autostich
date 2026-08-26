# Planning report — `zh-hans-plan`

Simplified Chinese (`zh-Hans`) as the third language. This round produces a plan, a sample order and
a package. It produces no Chinese text.

Measured on the worktree at `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` unless stated otherwise.
Claims are marked *measured*, *observed*, *inferred* or *proposed* (`AGENTS.md` — *House rules*).

---

## 0. Three premises of the starting brief did not survive measurement

Recorded first, because two of them change what this task has to do.

### H1 is refuted — `lang` already follows the language

The brief states that `<html lang="de">` is hard-wired at `index.html:2` and does not move with the
language setting, and calls that load-bearing for Chinese because `lang` decides which Han glyph
forms the browser picks.

*Measured:* `src/App.jsx:424` sets `document.documentElement.lang = loc` inside a `useEffect` keyed on
`options.lang`. The attribute **does** follow the selected language.

What remains is much smaller and still real: the window before React mounts, during which the
document claims `de`. A returning `zh-Hans` player can get one frame under the wrong `lang`, and a
system fallback font may render Japanese glyph forms in it. The fix is an inline script reading the
stored language before the module graph runs — a few lines, not an architectural change.

**Consequence:** H1 drops out of the hazard list as stated, and re-enters as a much smaller one.

### The font is measured, and it is far cheaper than the estimate

The brief estimates 4–9 MB for a full CJK webfont at three weights and asks for a measurement.

*Measured* against the Google Fonts CSS API for `Noto Sans SC:wght@400;500;600`:

| | |
| --- | --- |
| `@font-face` blocks returned | 303 |
| **unique files across all three weights** | **101** |
| codepoints covered | 16,279 |
| **total bytes, all three weights** | **4,516,508 B = 4.31 MB** |
| slice `.0` (Latin + most common) | 9.8 kB for 102 codepoints |

The 303 blocks resolve to 101 files because weight 400, 500 and 600 list *the same* URLs: this is a
variable face, and **three weights cost exactly what one costs**. The estimate in the brief
overstates by a factor of three if it was meant per weight.

*Derived rate:* 277 bytes per codepoint. *Inferred:* a subset built from a delivered catalogue using
~2,500 unique Hanzi lands in the high hundreds of kB. Not measured — no Chinese text exists yet, and
`fontTools` is not present in this environment.

### There are no soft hyphens in the source

The brief and `design-sprache.md` §7 both treat six deliberate soft hyphens (`U+00AD`) in workshop
deck and challenge names as existing, and H4 notes they become meaningless in Chinese.

*Measured, character-aware:* **zero** occurrences of `U+00AD` anywhere in `src/`. Repository-wide,
exactly two, both in prose — `README.md` and the translator package.

A first, byte-oriented search (`grep -P '\x{00AD}'`) reported eleven hits in six files. That was a
false positive: `grep` matched the byte `0xAD` inside multi-byte UTF-8 sequences — `⏭` is
`E2 8F AD`, and several accented characters in `profanity.js` end the same way. The correction is
recorded because the wrong number was reported once already.

**Consequence:** H4's soft-hyphen clause has no subject. The rest of H4 — CJK line breaking without
spaces — stands untouched.

---

## 1. What else was measured

| Claim in the brief | Measured | Verdict |
| --- | --- | --- |
| 147 `uppercase` sites | 147 (21 CSS rules, 124 utility uses) | confirmed |
| 138 tracking utilities | **142** | off by four |
| 42 letter-spacing rules | 42 | confirmed |
| ~2820 lines of catalogue | **2,639 keys per language**, parity holds; CSV 2,800 data rows | restated in the right unit |
| — | German source text: **112,748 characters** | new |
| — | 152 `tut.*` keys | new |

---

## 2. The finding that shapes the sample: the top of the ladder carries no language

The brief asks the sample to hit every role from `text-micro` to `text-figure`. *Measured* across
`src/**`:

| Role | Call sites | Carrying translatable text |
| --- | --- | --- |
| `text-figure` | 3 | **0** — all `ty-num`: score, SP, DP |
| `text-display-1/-2/-3` | 4 / 2 / 2 | **1** — the `<h1>` at `GuideOverlay.jsx:149`; the rest are `ty-num` and card numbers |
| `text-head` | 8 | 2 — `upgrades.title`, `start.tutorial.offer` |
| `text-title` | — | 8 keys |
| `text-body-lg` | — | 50 keys |
| `text-body` | — | 126 keys |
| `text-meta` | — | 187 keys |
| `text-micro` | — | 13 keys |

Method: every `t("…")` call site in `src/**`, with the role read from the class names in a four-line
window around it. 903 keys appear as literal `t()` calls; 384 of those resolve to a role. The
remaining 1,736 catalogue keys are reached through registries (skills, perks, glossary, tutorial) and
carry no class at their call site — those are the long descriptions, and they are sampled by length
instead.

**So the ladder's top is nearly free.** Chinese cannot break a number. The CJK branch has to work at
`text-micro`, `text-meta`, `text-body`, `text-body-lg`, `text-title` and the two heads — which is
also exactly where H6 says the legibility floor bites.

---

## 3. The sample order

`sample-order.csv` — **115 strings, 10,552 German characters**, in the export schema with a `zh-Hans`
column in place of `en`. Selection is a coverage argument, not a sample of convenience:

| Bucket | n | Why it must be in |
| --- | --- | --- |
| longest catalogue descriptions | 14 | the reflow worst case; `privacy.sec.telemetry.body` alone is 586 characters |
| one contiguous tutorial lesson | 14 | the only running prose in the product, and H11's priority; line breaking without spaces cannot be judged on labels |
| eyebrows drawing hierarchy from `uppercase` | 13 | on Chinese all four of their signals fail at once — `uppercase`, `.14em` tracking, 10 px, and Geist Mono, which has no CJK glyph |
| `text-micro`, all of them | 13 | the whole role is 13 keys; sampling it would be pointless |
| `text-meta` longest and shortest | 20 | the widest role in the product; longest is `shop.fx.hint` at 194 characters *at 11 px* |
| `text-body` longest and shortest | 15 | running text |
| `text-body-lg` longest and shortest | 12 | `arch.upgrade.help` at 200 characters |
| `text-title`, all of them | 8 | the whole role is 8 keys |
| `tracking-*` without `uppercase` | 6 | letter-spacing alone, isolated from the `uppercase` cases |

`upgrades.title` and `start.tutorial.offer` — the only two `text-head` strings — are included through
their buckets.

The `limit` column is deliberately empty: it means a width limit in the export schema, and none is
recorded anywhere in the repository. The German length rides in `note` instead, so it cannot be
mistaken for a constraint.

---

## 4. Font: decision and rejected options

**Decision: self-host Google's 101 pre-sliced `woff2` files with their `unicode-range` declarations**,
next to the existing `latin` / `latin-ext` pair.

It is the only candidate that needs **no new build dependency** — decisive, because `fontTools` is
absent here and adding a subsetter is reserved to the owner (`AGENTS.md` — *House rules*). It also
keeps H5 small: the browser fetches only the slices it touches, so `font-display: swap` never has
4.31 MB behind it.

| Rejected | Why |
| --- | --- |
| One full file per weight | Pointless after the measurement — the face is variable, three weights are one file set. And `swap` over megabytes is H5 itself. |
| Subset from the delivered text | Smallest (*inferred* ≈ 690 kB), but needs a subsetter in the build and must re-run on **every** text change; a key added later renders as a box. Sound as a later optimisation, too sharp as a foundation. |
| Serve from Google | Contradicts the existing self-hosting and puts a third party in the load path. |

---

## 5. How this task stands to `task/spanish-locale`

H2 assumed the Spanish order had not started — *measured at the time, and overtaken by events.*
`task/spanish-locale` now exists with a planning report and a full Tier B contract whose staffing row
records that the owner settled its decision block before implementation. It claims the seam this task
would otherwise build, by name: *"turns every binary `de`/`en` decision in the formatters, the guards
and the export into a rule over N languages"*, with `LOCALES` carrying `ready: false`,
`READY_LOCALE_IDS`, the guards generalised along a forbid/require split, and one CSV per target
language.

**Owner decision, taken during this session: `zh-hans-plan` plans without the seam.** Spanish is a
precondition. This task plans only what is genuinely CJK — the font, the typography branch, the
`lang` attribute, the third case in `fmtDayMonth`, the sample order and the package.

*Measured, and worth carrying into the contract:* the two tasks share a base SHA (`d9763883`), and the
preview-port ledger is per-branch — the Spanish contract's port 5196 is invisible to `grep
docs/workstreams` from any other branch. This task took 5197.

---

## 6. Open — for the contract, not for this report

The judgement sections of the contract are not filled by this report. Three owner decisions are
already settled and belong in *Approved architecture*: the ordering above; `text-micro` → 12 px and
`text-meta` → 13 px under `:lang(zh-Hans)` only, with the reflows reviewed at V3 on the sample; and
the name filter (H9) deliberately left unsolved in round 1, with its consequence named.
