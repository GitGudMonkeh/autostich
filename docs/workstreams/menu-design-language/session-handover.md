# Menu Design Language — Session Handover

**Status:** design only. No code changed, no branch created, no commit, no push.
**Written:** 2026-08-24, at the end of a long design session, so the next session can resume without
re-deriving anything.
**Scope:** desktop (≥ 1280 px) only. The narrow layout was explicitly declared good enough by the
owner and is out of scope.

Claims are marked where it matters: *measured* (read out of the tree), *proposed* (a design
suggestion awaiting implementation).

> **Related, read it:** `docs/workstreams/mainscreen-branding/planning-report.md` already plans the
> mainscreen brand work — same tagline, a grid logo element, more weight for the deck panel. This
> session produced the visual decisions for it. Where the two disagree, the newer decisions in
> `docs/design-sprache.md` win, but the planning report holds context this handover does not repeat.

---

## 1. What exists now

### Documents in the tree (all German, all design-only)

| File | What it is | State |
| --- | --- | --- |
| `docs/design-sprache.md` | **The living design language.** Foundation, head canon, colour roles, components, states, typography, text rules, changelog. Everything else defers to it. | uncommitted |
| `docs/optionen-redesign.md` | Options overlay rebuild | **committed** on `task/optionen-redesign-doc` |
| `docs/mainscreen-marke.md` | Main screen and brand mark | uncommitted |
| `docs/feedback-redesign.md` | Feedback modal | uncommitted |

`docs/README.md` carries an index row for each; that file is modified and uncommitted too.

### Published mockups

| Canvas | URL |
| --- | --- |
| **Autostich Einstellungen** — options screen + component sheet | https://claude.ai/code/artifact/c8328e42-db0b-411f-b26e-ec72a60a17ec |
| **Autostich Marke** — brand, mainscreen, feedback, upgrade tree, comparison | https://claude.ai/code/artifact/2e09b642-9197-42b1-81c5-dd41618c5ad8 |

Both carry a `deck` switch. **Both default to deck "Serie" (`#ff2d9b` / `#ff6ac0`)** so the two
canvases can be compared directly — do not change that default without a reason.

### Artboard inventory — Autostich Marke

| Artboard | Purpose |
| --- | --- |
| Das Zeichen — 5 × 8 | Why the grid is the board (`COLS 5`, `ROWS 8`, `N_POS 40`) |
| Feste Varianten I–IV | The road to the chosen mark; record, not instruction |
| Richtung 01/02/03 (Anhänger · Lockup · Monolith) | **Rejected** logo directions, kept so nobody proposes them again |
| Mainscreen — Lockup / Siegel | **Rejected** mainscreen variants |
| Deck-Probe | Both rejected directions across four real decks |
| Marke — das Zeichen ist ein Buchstabe | **Chosen** direction |
| Mainscreen — Buchstabe | **Chosen** mainscreen |
| Feedback — im Optionen-Schnitt | Chosen feedback modal |
| Kopf-Kanon — alle Overlays | The head rule for every overlay |
| Baum 1/4 — Kopf & Legende | Tree step 1, done |
| Baum 2/4 — Allgemein-Seite | Tree step 2, done |
| Baum 2/4 — Farbentscheidung (B) & Balken | Colour decision record + impact box |
| Abgleich — Optionen neben Baum | Both screens side by side, same scale, same deck |

---

## 2. Decisions taken

These are settled. Do not re-open them without a reason.

1. **Panel tint: 5 % top / 1 % bottom**, border 26 %. Arrived at over three rounds (13/7 from
   `.as-hub-tile` → 9/5 → 5/1). The **border** carries belonging, not the surface.
2. **No panel inside a panel.** Nested areas get a top divider, never a second frame.
3. **One structural colour, and it is the deck colour.** Fixed foreign hues (cyan `#26c6e6`,
   violet `#9b82f0`) are out for structure. Cyan belongs to the hub as the action colour (`#ruhe`).
4. **Colour roles:** deck = structure · gold = buyable/currency · green `#5ab87a` = on/owned ·
   grey = locked · rarity and faction colours only where the colour *is* the content.
5. **Head canon:** eyebrow · title · subline on the left, action zone **top-aligned**
   (`align-items: start`), close always last, one build at 44 px.
6. **Everything interactive is 44 px tall.** No exceptions.
7. **Drawn SVG icons only.** No emoji, no text glyphs.
8. **The wordmark's `I` becomes a column of eight cells** — the eight segments. Both `AUTOSTICH` and
   `AUTOTRICK` are nine characters with the `I` in seventh place (*measured*).
9. **The standalone mark is the full 5 × 8 in "Fünferschritt"** (`p % 3 === 0`, corners `0` and `39`
   lit) for icon, favicon, avatar, loading screen.
10. **Tagline:** „Legen. Stechen. Eskalieren." / „Order. Trick. Escalate" — new, needs both catalogs.

---

## 3. Upgrade tree — where we stopped

Working through it **tab by tab, desktop only**. Steps 1 and 2 are designed; 3 and 4 are not started.

| Step | State |
| --- | --- |
| 1 — Head & legend | designed |
| 2 — Allgemein page | designed, including colour and impact box |
| **3 — Faction page** | **next** |
| 4 — Legendary phase | not started |

### Facts already established about the tree (*measured*)

- Two separate render paths: `wide ? desktop : branch` at `UpgradeScreen.jsx:484`. Improving one does
  not improve the other.
- The tree is the reference the whole desktop pass was measured against — Werkstatt, Leitfaden,
  Glossar, Statistik and Optionen all say their values are taken *„1:1 von `.up-*`"*. Separate
  tree-local from shared values before changing anything.
- Height is already at its limit: `.up-root` computes head 172 + branch 808 + legend 42 on 1080 px;
  the faction page once overflowed by 44 px; 14 of 21 skill descriptions were truncated on 1536 × 791.
  **Check against 1280 × 720 and 1536 × 791, not 1920.**
- Desktop page area is 1198 px wide (1520 card − 300 nav − 22 gap), so a lane column is 182 px — and
  131 px in a 1280 px window.
- The detail row with the buy button is the **last child of the panel**, below the impact box
  (`UpgradeScreen.jsx:576`) — roughly 600 px from the node you clicked.
- The same node renders in two colours: lane accent in the grid, `nodeAccent(selDeskNode, VI)` in its
  own detail row.
- `wirkungOf()` replaces the description of nodes with `shift` by four raw tier weights; the readable
  sentence only survives in the `title` attribute.
- `upgrades.lane.note.afterLeg` is never rendered on desktop — `VLane` takes no note argument.
- Eleven of sixteen general nodes repeat their own lane heading.
- **Gating, verified:** `cover1`, `energy1`, `reroll1` **and `tier3`** all start at `prereq: null`.
  Only `drop1` and `perk2Leg` are gated, both by `prereq: "legLayer"`, and `legLayer` is the third
  node *inside* the Rarität lane. There is no group gate — there is one key node.
- `node.*` catalog keys exist **only in `enMeta.js`**. The German node text is the hardcoded fallback
  in `progression.js`.

### Faction page — what to look at first (not yet analysed in depth)

`UpgradeScreen.jsx` around lines 536–572: chain across the top (`up-chain-row`), then `up-facbody`
with `SkillGrid` and `ChallengeBox`. Known trouble spots recorded in `index.css`: the challenge card
with the big deck image pulled the whole grid row out of the panel on flat windows, and the skill
list needed a column flow because the grid clamped descriptions.

---

## 4. Working files and how to recover them

The mockup sources live in this session's scratchpad, which is **session-scoped and not durable**:

```
<scratchpad>/marke/   → 19 .dc.html + canvas.json + autostich-marke.html
<scratchpad>/mock/    → 2 .dc.html + canvas.json + autostich-einstellungen.html
```

**If they are gone, recover them from the published artifacts** — this is the supported path, not a
workaround: `WebFetch` the artifact URL, then run the design skill's helper with `--extract` into a
fresh empty directory. It writes every artboard, `canvas.json` and images back out as working files.
Edit those, re-seed, republish to the same URL.

---

## 5. Repository state — read before committing anything

Current branch: **`task/optionen-redesign-doc`**. `docs/optionen-redesign.md` is committed there.

Three further documents sit uncommitted on that same branch:
`docs/design-sprache.md`, `docs/mainscreen-marke.md`, `docs/feedback-redesign.md`, plus the modified
`docs/README.md`.

That is **three foreign tasks on one branch** and violates the one-task-one-branch rule. The owner has
to run `/create-task` (owner-invoked; a session cannot run it for itself). Suggested split:

1. `docs/design-sprache.md` **first and alone** — it belongs to no single task and the others point at it.
2. `docs/mainscreen-marke.md`
3. `docs/feedback-redesign.md`

---

## 6. Working agreement carried forward

- **Do not propose design changes on top of mechanics you have not read.** One grouping of the tree
  lanes was inferred from the colour distribution instead of the `prereq` chains and was wrong. State
  the source file and line for any mechanical claim.
- Honest opinions over agreement; say when a recommendation has shifted and why.
- Every proposal names its cost — height, width, a lost affordance.
- Check every layout against 1280 × 720 as well as full size.
- German for player-visible text and design documents; English for handovers and task contracts.
