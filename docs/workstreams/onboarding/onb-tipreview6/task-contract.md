# Task contract — onb-tipreview6 (tip review round 6: building upgrade scaling)

**Branch:** `task/tip-review-6` (from `dev`) → merged into `dev`.
**Source of scope:** `docs/workstreams/onboarding/tip-review-2026-08-28.md`, section
"Round 6 (owner balance review — building upgrades)" — rows X1–X4, approved by the owner on
2026-08-29 ("go für alles, sammel es so"). Owner request: every non-legendary building must gain
something on every upgrade step; buffs are ok.

## Scope delivered

| Row | Change | Where |
| --- | --- | --- |
| X1 | `tierNum` is strictly monotone: each tier raises the number by at least 1. Only base-1 values change (1/2/2/3 → 1/2/**3**/**4**): Stützbalken, Riegel and Zunftviertel's per-neighbor value. Every base ≥ 2 stays bit-identical. | architect.js |
| X2 | Zunftviertel now scales 1/2/3/4 per neighbor (cap stays 3 → max 3/6/9/12). The legendary Zwinger goes from 2 to 3 per neighbor (max 15) so the legendary stays above a tier-IV Zunftviertel. | architect.js |
| X3 | Formation buildings get a per-tier `tierValue` ladder (flat Stichwert on their cells, carried by the same precompute write path as Grundstein III's ankerValue) plus qualitative kicks at III: **Arkade** II +1 / III becomes a real Farbblock-Joker (new kick flag `farbJoker`: cells join `jokerF`, transparency kept) / IV +2; **Fries** and **Gewölbe** II +1 / III addType farbblock / IV +2; **Klammer** II +1 / III +Wiederholung (unchanged) / IV +2; **Pfeiler** II +1 / III +2 / IV +3; **Kreuzgang** `bindSpanFor` becomes ±1/±2/±3, IV keeps ±3 and adds +2 Stichwert. | architect.js |
| X4 | Consequences: `upgradeInfo` treats inert-kind families with a `tierValue` ladder as normally upgradable to IV; the T2 offer tier-pinning no longer applies to them (the weightedTier rng draw was always consumed, so the random stream is untouched); `buildingEffect` renders the ladder ("dazu +{n} Stichwert auf jeder Zelle") and the Arkade kick, new keys `building.eff.tierValue` + `building.kick.farbJoker` in all four catalogs; gen-db's max-reachable-tier logic follows. | architect.js, buildingText.js, de/en/es/zhHans.js, gen-db.mjs |

## Guard updates

- `test/architect.test.js`: the T2 offer guard's invariant genuinely changed (no family is
  pinned any more) — it now asserts every formerly inert family also appears with tier > 1 and
  no offer exceeds MAX_TIER. The formSpec guard's Kreuzgang span expectation follows the new
  ladder (tier 3 → ±3). New describe "Runde 6: jede Aufwertung trägt (X1–X3)": tierNum monotony
  across all catalog bases (base-1 = 1/2/3/4, bases ≥ 2 unchanged), the tierValue ladder landing
  as flat value on cells (Arkade 0/1/1/2, Pfeiler III = 2, Kreuzgang 0/0/0/2), Arkade III
  joining `jokerF` while staying transparent, Fries/Gewölbe III gaining the farbblock joker,
  `bindSpanFor` = 1/2/3/3, and upgradeInfo can-upgrade to IV with reason "max" at IV.

## Evidence

- Gates on the final tree, in order: `npm test -- --maxWorkers=1` (153 files, 2477 tests green),
  `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`; `npm run loc:export`
  regenerated (two new catalog keys).
- Effect texts spot-checked per tier for all six formation families, Zunftviertel and Zwinger
  via `buildingEffect` (node): ladders, kick previews ("Stufe III: …") and the span row compose
  correctly; no dead tier remains in any rendered progression.

## Deviations / notes

- By design and deliberately NOT changed: legendaries stay tierless; the gamble penalty
  (Losbude/Wetthalle) stays fixed while only the jackpot scales ("echte Wette"); Marktplatz's
  neighbor cap stays 4 (its score scales cleanly).
- Ladder amounts are intentionally small (reference: Stützbalken IV = 4 on 2 cells) so formation
  buildings don't turn into value buildings on the side. No sim sweep was run for this round;
  if the balance feels off in play, `sim/` can measure it.
