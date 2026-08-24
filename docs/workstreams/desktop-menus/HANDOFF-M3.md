# Handoff — M3 · Upgrade tree

**Done.** The approved redesign is built and the screen is on the vocabulary, in seven commits on
`task/menu-m3-upgrades` (base `cf7c3083`): the contract's three — structure · vocabulary · deck
detail — plus four defects its own checks uncovered: a 44 px click target, an English label bug, an
unnecessary `!important`, and a control nested inside a control on the legendary card. Four gates green, `typo-tokens.test.js` unmodified, `@theme`
byte-identical. Full record and every number: `measurements/M3.md`.

**Did the vocabulary hold?** Yes, and this screen is the reason it fits: three of its four biggest
surfaces were already *value-identical* to a step (`--sf-glass`, `--sf-head-fade`,
`--sf-scrim-desk`), which is what "the tree is upstream of the vocabulary" looks like from inside.
Two real gaps found, both **counted, not coined**: **M3-G1** the canon's target-brightness mix
(`#ffffff` as a colour-space partner — no step exists, first sighting) and **M3-G2** the white state
wash on nav rows and impact tiles. Both enumerated with counter-checks.

**Every changed `.up-*` value, classified — no token was changed for anyone.** Every `@theme` value
M1/M2a/M2b shipped is untouched. Six sites are value-preserving (delta 0). The rest are **deliberate
divergences**, each with a reason in the record: inset steps (nav 14/12→13, page 16/20/14→18, tiles
→11), bar and swatch radii onto `--rd-sm`, 14 translucent neutral edges onto `--ed-quiet` (~9/255,
the swap M2a already measured and the owner accepted). **One touches the phone** and is flagged as
such: the root scrim `.933 → .94`, ≤1.8/255, which removes a literal and its `!important`.

**Tripwires.** Neither tripped. No panel of my own; no new value at a call site — the two that had
no step are ratcheted, not invented.

**Guards.** Measured which broke rather than assumed — **`up-ruhe` was not among them for commit 1**.
Five broke overall; each rewritten to the *invariant* and counter-checked by reintroducing the
defect: `desktop-perf` (`.up-chall{max-height}` was the mechanism for a card that no longer exists →
"the grid body contains nothing but the skill list"), `up-ruhe` twice (`.up-navpassive.is-sel` →
"`.up-leg` carries no shadow other than inset"; radii → resolved through `cssTokens.js`), `st-ruhe`
and `go-ruhe` (both read `.up-vnode`'s radius to compare their own). `i18n-guards` was left alone —
it was right, and my code was rewritten instead.

**Findings.** M3-F00 (1400×700 already scrolled 14 px, before and after) · **M3-F01** the design
document's height arithmetic is stale in all three terms; `.up-branch` does not render at ≥1280 px ·
**M3-F02** "the head costs no height" is wrong — the Kopf-Kanon costs **+24.2 px**, and that single
number is why every prediction in its decision block lands short · **M3-F03/04/05** `DeckDetail` is
**unreachable above 1280 px** and `GuideOverlay` does not mount it · M3-F06/07/08 · M3-G1/G2/G3.
Every "before" number the document stated is confirmed, several to the decimal; its *predictions*
are uniformly ~24 px optimistic. Nothing it recommended was wrong in sign.

**Owner:** two stops, both in `measurements/M3.md`. (1) What should happen to `DeckDetail`, now that
it is measurably unreachable on the desktop. (2) Two remaining copy decisions — the challenge row's
exact wording and the locked legendary card's sentence; both are built with existing approved
strings so no unreviewed player copy ships. The eyebrow words were *not* open: `design-sprache.md`
§2 had already decided them.

**M7 inherits** `.up-*` fully migrated (edge ratchet 0 — achieved, not empty; ink 35), `DeckDetail`
measured, ratcheted and unmigrated with the reason, five guards on invariants, and a design document
whose arithmetic is now corrected against a real build. **No merge, no push, no PR; worktree left in
place. No visual result here is approved — the captures are for the owner to look at.**
