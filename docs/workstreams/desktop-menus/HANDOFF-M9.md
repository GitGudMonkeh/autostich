# Handoff — M9 · the three small modals

1. **Done.** Both redesigns, all three files migrated. `task/menu-m9-modals`, four commits on
   `a7ecd0b9`: `7d4b623d` re-measurement · `4e73c0fd` the redesigns · `6f04d6c9` the vocabulary ·
   `dbace21e` record and evidence. Four gates green (**143 files / 2287 tests**, 2279 + 8),
   `typo-tokens.test.js` unmodified, `loc:export` regenerated.
2. **THE VOCABULARY HELD, and literally.** Both documents were written against `design-sprache.md`,
   independently of §2c — and their target literals land on existing steps **exactly**:
   `rgba(19,19,26,.9)` = `--ctl-face`, `rgba(32,32,44,.95)` = `--ctl-face-on`, `#3a3a44` =
   `--ctl-edge`, radius 8 = `--rd-md`, radius 14 = `--rd-lg`, the 9/5 % tint = `--sf-deck` /
   `--ed-deck-panel`, 11/13 = `--in-tight` / `--in-snug`. **Nothing was minted and nothing had to
   be.** Two gap families appear, both **old and already filed**: M8-G2 and MENU-38. The ratchet
   turned **down** twice — `#2a2733` and the four separate message boxes are gone.
3. **Machine half: every surface but mine at zero.** 160 cells, 0 unreached, 580 deltas, **all on
   `feedback`**, 58 per cell in all ten. **`privacy` is at 0 deltas and 0 unmatched** — the H-b
   proof that a screen with no approved design was migrated and not otherwise changed.
4. **First start has no cell (H-c), so it got its own harness.** `evidence/M9/measure.mjs`, five
   viewports × two languages against an **empty `localStorage`** — the one state the survey never
   has. Plus captures at 1280×720 and 1920×1080 in both languages, and the reporter's **no-run**
   state. Thirteen PNGs, checked for *being* images (signature, real `IHDR`, closing `IEND`); two
   opened and looked at. What is **not** claimed: hover/focus on the new segmented and the switch.
5. **Tripwires: neither tripped.** No call-site value, no own panel. Every surface, edge, elevation,
   radius and inset in the three files is a step or a counted, named gap.
6. **Guards: twelve seams broken, all twelve red.** Two are worth reading. **M9-F12** — `#ueberzug`
   went red *because the vocabulary was applied*: it counted literals, and migrating one overlay
   dropped the count below its floor. Rewritten to the invariant, it now resolves the step against
   `@theme` and understands the sanctioned re-point, so it sees three roots it previously could not.
   **M9-F13** — the design's locked run row had **no guard at all**; removing the state left the
   suite green. The new one is written as *"contains no X other than Y"*: locked by `disabled` and
   by nothing else, because locked has to mean locked for the keyboard.
7. **Findings M9-F01…F13, M9-G1.** For the planner: **M9-F09 — M8-G2 has passed the threshold.**
   The row ground now sits on **four** independent screens (glossary, reporter, leaderboard, welcome)
   and the rule is "a token on the third". Counted and reported, not minted — that is your call.
8. **Owner decisions, five, at one stop:** type sizes skipped (M9-F10), counter stays below the field
   (M9-F11), the subline's wording taken and `name.hint` shortened, deck tint on the reporter's
   panels, seven drawn characters approved (M9-F06).
9. **The next task inherits** a `--ctl-*` set confirmed by a second, independent derivation; a
   reusable first-start harness; and two icon sets with one convention that should become one
   (M9-F07). Worktree left in place, tree clean. Nothing merged, no PR.

**One surprise worth carrying forward:** the welcome title's glow was three `text-shadow`s in
`currentColor`, invisible while the text was `transparent` and a white halo the moment it took a
colour. `filter` read `none` throughout. **The numbers could not see it; opening the capture could.**
