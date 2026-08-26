# Architecture

The current shape of the codebase: what lives where, how the visual effects are rendered, how the
bundle is split, and where the media lives. Present tense, current state only.

Historical measurements and the rejected alternatives that produced these rules are in
`docs/decisions/engineering-log-2026-08.md`; this document links into it rather than repeating it.

**Do not transcribe volatile lists out of this document's sources.** Where a set of keys, tracks, or
migrated files is named below, the code is the source of truth and this document names the file to
read.

---

## 1. Stack

Vite + React 18 + Pixi.js, single-page app. Tailwind v4 through the Vite plugin — there is no
`tailwind.config`. npm only; the lockfile is authoritative. Node `^20 || ^22 || >=24`, CI pins 22.
Vitest reads its configuration from the `test` block in `vite.config.js` and runs in the `node`
environment, because engine and reducer are pure logic.

Deployment is GitHub Pages under `/autostich/`, published through GitHub Actions.

---

## 2. Layout and the game/ui boundary

```
src/game/   domain logic — engine, reducer, registers, storage, telemetry
src/ui/     React components and the visual/effect layers
src/ui/fx/  effect implementations: shaders, Pixi emitters, the compositor, tier logic
src/i18n/   German and English catalogs plus the resolution layer
test/       Vitest
sim/        balance simulation tooling
scripts/    generators and build-time tooling
media/      audio, deliberately outside the module graph — see §6
```

**`src/game/` contains no React.** It is importable from tests, from `sim/`, and from generators
without a DOM. This is what makes the engine testable as pure logic and is the reason the Vitest
environment can stay `node`. Keep it that way: a React import in `src/game/` is a design error, not a
convenience.

The boundary is one-way by intent — UI imports game, not the reverse. One deliberate exception
exists today: `src/game/telemetry.js` imports build-version constants from `src/ui/version.js`. It is
a constants-only import with no React or DOM involvement. Do not use it as a precedent for widening
the direction of dependency.

Pure calculations are extracted into their own React-free modules (`src/ui/fx/previewScale.js`,
`src/ui/fx/mobileTier.js`, `src/ui/packSort.js` and similar) specifically so that guards can import
and **recompute** them instead of transcribing their outputs. That is an architectural decision in
service of the testing doctrine — see `docs/engineering/testing.md` §4.

---

## 3. Render paths for visual effects

There are exactly two, and which one an effect uses is a structural property, not a runtime switch.

**The field compositor** (`src/ui/fx/FieldCompositor.jsx`) renders the full-screen **shader** field
effects. Its registry takes a shader quad.

**The Pixi emitter stage** (`src/ui/fx/PixiStage.jsx`) renders the **emitters** — particles and
scenes. Its factory registry must stay in step with `src/ui/fx/fieldFxKeys.js`, which is deliberately
Pixi-free so that `Battlefield.jsx` (which lives in the main chunk) can import it without pulling
Pixi into the main bundle.

Three rules govern this split:

1. **One implementation per effect, not one per environment.** There are no DOM variants of the
   shader field effects and no preview-versus-production branching for them. Preview renders what
   production renders. The historical `FX_RENDERER` gate and the DOM Aurora are gone.

   The reason is not performance — the two paths measured the same. The reason is that a switch means
   two implementations, and two implementations drift. This project has lost weeks to the same work
   existing several times as different objects. See `#kompositor` in the decision log.

2. **Whether emitters also belong in the compositor is deliberately undecided.** The compositor's
   registry takes a shader quad, not an arbitrary Pixi object, and device measurement gives no
   performance argument for the move. Do not "unify" these on aesthetics alone.

3. **Card animations are the documented exception and run in production.** They are purchasable shop
   effects, so they are not preview-gated. Pixi loads lazily only when the player owns and has
   enabled an animation; otherwise the component returns early, no Pixi import happens, and the
   production bundle is unchanged. Card animations always use the deck colour. See `#318`.

The effect key sets — which effects are background effects, which are background finishers, which are
emitter effects, and their exclusivity semantics — live in `src/game/themes.js` (`GLOBAL_FX`,
`BG_FX_KEYS`, `BG_FIN_KEYS`) and `src/ui/fx/fieldFxKeys.js` (`PIXI_FIELD_KEYS`). Read the code for
the current sets; they change with every ported or retired effect.

---

## 4. Performance tiers and the scaling rules

`src/ui/fx/mobileTier.js` and `src/ui/useReducedFx.js` resolve the device and the user preference
into three levels — `full` / `balanced` / `minimal` — exposed as `data-reduced-fx` on `<html>`. A
coarse pointer resolves to the middle level, not the lowest: rich effects do run on phones, and only
an explicit minimal setting turns them off.

Four scaling rules are durable and repeatedly re-derived. They are the reason the tier module exists
and they should guide any new effect:

- **Cost tracks canvas pixels per second, not image content.** A scene measured with every layer at
  zero alpha already cost most of the total. Optimising what is drawn is usually the wrong lever.
- **Cost is linear in canvas area and quadratic in `resolution`.** Resolution is therefore the first
  dial to turn, and the one most likely to be turned too far.
- **When you cap resolution, compensate line width.** Thin additive lines go stair-stepped as
  resolution drops; the compensation is part of the change, not a follow-up.
- **Frame-rate thresholds must come from the shared tolerance helper, not from literals.** A raw
  threshold sitting on the frame raster silently rounds the effective draw rate down. `hzMinMs` /
  `frameMinMs` exist for this; every `maxFPS` assignment reads the shared constant so the `?hz=`
  override reaches the full-screen stage.

Geometry that does not change during playback is measured **once per playback**, not per frame — each
`getBoundingClientRect()` forces layout, which is expensive in a running battlefield.

The measurements behind all of this stay in the decision log; search the `#perf-*` tags and the
*"Gottgleich-Prunk — Perf-Naht"* section.

---

## 5. Bundling

`vite.config.js` splits the bundle by hand through `manualChunks`. The rationale, which must survive
any future edit:

- **`vendor`** — React and friends. Changes rarely, so it caches well, and the entry imports it
  eagerly anyway.
- **`game`** — everything under `src/game/`. Pure logic, separated from the UI.
- **`pixi`** — Pixi and **its own dependencies**. This chunk must stay purely asynchronous.

Two traps are already baked into the configuration and are easy to reintroduce:

**Pixi's dependencies do not have "pixi" in their path.** Matching on the name alone leaves them in
the eagerly loaded `vendor` chunk, putting a large amount of Pixi's dependency weight on the critical
path of every page load while Pixi itself stays correctly async — the intent half-defeated, and
invisible without inspecting the build. They are therefore listed explicitly in the exported
`PIXI_DEPS` array. **When a Pixi upgrade adds a dependency, it belongs in that list**;
`test/bundle-split.test.js` derives the expected set from `pixi.js/package.json` and goes red
otherwise.

**Vite's preload helper is a virtual module.** It has no `node_modules` in its path, so it falls
through every branch and gets assigned freely — and it landed in the `pixi` chunk, which made the
entry a static importer of the whole Pixi chunk. It is routed explicitly to `vendor`.

Separately, `assetsInlineLimit` is overridden for skill emblems, perk-category art and legendary
art: they are **never** inlined as data URIs. Vite's default threshold is small enough that the leanest emblems fall under it and migrate
into the entry chunk — which inverts the intent, since they are only rendered on wide viewports but
would then be downloaded by every phone on every page load. Everything else keeps the default.

---

## 6. Media lives outside the module graph

Audio lives in **`media/`**, deliberately outside both `src/` and `public/`:

- outside `src/`, so it does not migrate into every deployment slot's build;
- outside `public/`, because Vite copies `public/` into every `dist/` unquestioned — exactly the
  duplication being avoided.

`src/ui/music.js` therefore does not import the files. It builds URLs from `VITE_MEDIA_BASE`: in dev
a middleware in `vite.config.js` mounts the folder at `/media/`; in production the path points at the
centrally published media directory. The folder is published **once**, by its own workflow, and every
deployment slot points at the same path.

Consequences to respect:

- **A changed track needs a NEW filename.** There is no build hash on these files, so there is no
  cache busting without a rename.
- **Adding a track is three steps**: file into `media/music/`, a `track(...)` line in `music.js`, and
  an entry in the pool. `test/music-assets.test.js` checks both directions — no dead references, no
  orphaned files.
- **The dev middleware answers range requests**, because `HTMLAudio` uses them to seek and Safari
  otherwise refuses to play at all. A missing file is answered as a hard 404 rather than falling
  through to the SPA fallback, which would hand the audio element an HTML document with status 200.
- **Deployment `keep_files` handling is asymmetric.** Sub-slots replace their folder wholly; the root
  slot must keep existing files, or it would delete the sub-slots and the media directory.

---

## 7. Telemetry and privacy

Telemetry and the leaderboard are two separate senders, and the leaderboard is the more personal of
the two — the nickname is chosen by the player and is public.

The durable engineering rules:

- **The privacy notice must cover every field that is actually sent.** `test/privacy.test.js` is the
  ratchet: if a field is added to the client info payload that the notice does not describe, the test
  goes red. The same applies to a leaderboard column.
- **Numbers in the notice are not transcribed.** Limits are exported from the telemetry module and
  interpolated into the text. The localization guard checks German against English, never text
  against code — this seam is held solely by the export.
- **The notice is reachable from every point where the decision is made**, not from one buried
  settings row. If a rework removes one of those entry points, the ratchet goes red.

Open policy questions — data residency, retention, and any legal-notice obligation — are recorded in
the decision log under `#datenschutz` and are decisions for the project owner, not implementation
details.

---

## 8. Build-time generation

Several checked-in artifacts are generated and must never be hand-edited. Their guards compare the
committed file against a fresh generation:

| Artifact | Generator |
| --- | --- |
| `docs/username-profanity-guard.sql` | `npm run gen:profanity-sql` |
| `docs/localization/*.csv` | `npm run loc:export` |
| database seed output | `npm run gen:db` |

A build also emits a small version file at the output root carrying the same build stamp as the app,
which a running tab polls to notice that a newer build was deployed. It is deliberately kept out of
the asset directory and out of the service worker's cache filter so that it always comes fresh from
the network.

---

## 9. Provenance

The reasoning, the measurements, and the rejected alternatives behind these rules are preserved in
`docs/decisions/engineering-log-2026-08.md`. Relevant entry points: `#kompositor` and
*"Rendering-Fakten"* for the render paths, the `#perf-*` tags and *"Gottgleich-Prunk — Perf-Naht"*
for the scaling rules, `#F-01` for media and deploy structure, `#318` for the card-animation
exception, and `#datenschutz` for telemetry.

Those records are historical context, not standing instruction, and their "current state" claims are
dated. Where they and this document disagree about what is true now, verify against the code.
