/* ============================================================
   CATALOG ENGLISH. Mirrors de.js key for key — the guard test fails the build
   if a key or a placeholder is missing on either side.

   Terminology follows docs/localization/uebersetzerpaket_pixi_2026-08-15.md §3
   (cycle · trick · streak · Trick Points/TP · deck workshop …). Do not invent
   synonyms: one German term maps to exactly one English term, everywhere.
   ============================================================ */
import { LEG_PHASE_CYCLE } from "../game/constants.js";

export default {
  /* ---- Common ---- */
  "common.close": "Close",
  "common.cur.sp": "TP",
  "common.cur.dp": "DP",

  /* ---- Start screen ---- */
  "start.tagline": "Roguelite autobattler trick-taking game · prototype",
  "start.logo.alt": "AUTOSTICH",

  "start.progress.onboarding": "🎓 Onboarding",
  "start.progress.bonus": "💠 Bonus {cur} · next +5",
  "start.progress.runs": "{done} / {total} runs",
  "start.progress.links": "{done} / {total}",
  "start.progress.next": "Next unlock:",

  "start.onb.reroll": "Reroll +1",
  "start.onb.plant": "Plant unlocked",
  "start.onb.ice": "Ice unlocked",
  "start.onb.rarity": "Rarity: {tier}",
  "start.onb.legendary": `Legendary ⭐ (cycle ${LEG_PHASE_CYCLE})`,

  "start.resume": "▶ Resume run",
  "start.resume.sub": "Cycle {cycle}/{total} · Score {score}",
  "start.normal": "Normal run",

  "start.seed.placeholder": "Paste seed",
  "start.seed.aria": "Paste a seed and play",
  "start.seed.play": "↻ Play",
  "start.seed.error": "Not a valid seed — check the code and try again.",
  "start.secret.unlock": "🔓 Everything unlocked.",
  "start.secret.onboarding": "⏭️ Onboarding skipped · +10 TP · +50 DP",
  "start.secret.reset": "🔄 Resetting profile …",

  "start.ranked": "Ranked",
  "start.ranked.badge": "Week",
  "start.ranked.badge.aria": "Weekly challenge",
  "start.ranked.open": "Open the weekly ranking",
  "start.ranked.locked": "View the weekly ranking — playing unlocks once every deck is unlocked and you have finished at least one run with each",

  "start.tile.workshop": "Deck workshop",
  "start.tile.workshop.locked": "The deck workshop unlocks when onboarding is complete",
  "start.tile.upgrades": "Upgrades",
  "start.tile.upgrades.title": "Upgrade tree",
  "start.tile.upgrades.locked": "Unlocks when onboarding is complete",
  "start.tile.upgrades.buyable": "{n} available",
  "start.tile.upgrades.complete": "✓ complete",
  "start.tile.leaderboard": "Leaderboard",
  "start.tile.leaderboard.sub": "Global high scores",
  "start.tile.stats": "Statistics",
  "start.tile.stats.sub": "Runs & records",
  "start.tile.lock_one": "🔒 {count} more run",
  "start.tile.lock_other": "🔒 {count} more runs",

  "start.options": "Options",
  "start.name.set": "Set a name for the global high score",
  "start.name.change": "change name",
  "start.name.signedIn": "Signed in as",
  "start.version.title": "Version · environment · commit",

  /* ---- Options ---- */
  "options.eyebrow": "Options",
  "options.title": "Settings",
  "options.footer": "More options (default speed …) will appear here.",

  "options.language.title": "Language",
  "options.language.desc": "Language of the in-game texts.",

  "options.mute.title": "Mute",
  "options.mute.desc": "Turns off all click and game sounds.",
  "options.sfx.title": "Effect volume",
  "options.sfx.desc": "Volume of the click and game sounds (SFX).",
  "options.sfx.aria": "SFX volume",
  "options.music.title": "Music volume",
  "options.music.desc": "Volume of the background music.",
  "options.music.aria": "Music volume",

  "options.rfx.title": "Reduced effects",
  "options.rfx.aus": "Off",
  "options.rfx.mobile": "Mobile",
  "options.rfx.an": "On",
  "options.rfx.desc.aus": "Full effects.",
  "options.rfx.desc.mobile": "Balanced: card flip, background, glow and finishers stay; screen shake, spark fountains, blur and sweeps are off. Easier on weaker devices.",
  "options.rfx.desc.an": "All effects minimal — as calm as possible, takes a lot of load off weak devices.",

  "options.haptics.title": "Haptics (vibration)",
  "options.haptics.desc": "A short vibration on confirmations. Only noticeable on touch devices (phones); the system setting “reduce motion” is respected.",

  "options.perfHud.title": "FPS counter & report",
  "options.perfHud.desc": "Shows FPS · p95 · jank in the top right and records performance data (⧉ report → console + clipboard). Test branch only. Off = no display and no measurement.",

  "options.float.title": "Show floating text",
  "options.float.desc": "Numbers and text rising over the field. Master switch for all three below. The big announcements (FIERCE/BRUTAL/INSANE/GODLIKE) always stay visible.",
  "options.float.score.title": "↳ Score",
  "options.float.score.desc": "Rising score numbers on tricks you win.",
  "options.float.mult.title": "↳ Multiplier",
  "options.float.mult.desc": "“CRITICAL!” and formation text (multiplier bonuses).",
  "options.float.winlose.title": "↳ Win / loss",
  "options.float.winlose.desc": "Won/lost text at the end of a trick.",
};
