/* ============================================================
   KATALOG DEUTSCH — Ausgangssprache. Jeder Schlüssel MUSS auch in en.js stehen
   (test/i18n-guards.test.js erzwingt das), samt identischer Platzhalter-Menge.

   Konventionen (docs/text-style-guide.md):
   - Schlüssel: <bereich>.<block>.<sache>, klein, Punkt-getrennt. Keine Sätze als Schlüssel.
   - Platzhalter: {name} — NIE Zahlen direkt einbauen, wenn sie zur Laufzeit kommen.
   - Tuning-Zahlen aus den Konstanten interpolieren (Template-Literal), nicht abtippen.
   - Plural: Schlüsselpaare `…_one` / `…_other`, ausgewählt über die Variable `count`.
   ============================================================ */
import { LEG_PHASE_CYCLE, FORMATION_LABELS } from "../game/constants.js";
import { TIER_META } from "../game/rarity.js";
import { SKILL_LIST, ARCHETYPE_META } from "../game/skills.js";
import { PERK_DEFS, CATEGORIES as PERK_CATS } from "../game/perks.js";
import { FAMILY_LIST } from "../game/families.js";
import { ARCHITECT_FAMILIES } from "../game/architect.js";

/* Register-Einträge werden aus dem Register ERZEUGT, nicht abgetippt: die deutschen Namen leben
   weiter genau einmal (in rarity.js bzw. constants.js), und dieser Katalog ist ihre Ansicht.
   Damit kann die deutsche Seite gar nicht vom Register wegdriften — nur die englische muss
   gepflegt werden, und dafür sorgt die Schlüssel-Parität im Guard-Test. */
const fromRegistries = {};
for (const m of Object.values(TIER_META)) fromRegistries[`rarity.tier${m.tier}.label`] = m.label;
// Badge-Kürzel der Formationen: genau EIN Zeichen, paarweise verschieden (harte UI-Schranke).
const ABBR_DE = { wiederholung: "W", farbblock: "F", treppe: "T", wechsel: "Z",
  anker: "A", nachhall: "N", formationskern: "K", grenzbonus: "G" };
for (const [type, label] of Object.entries(FORMATION_LABELS)) {
  fromRegistries[`formation.${type}.label`] = label;
  fromRegistries[`formation.${type}.abbr`] = ABBR_DE[type] || "";
}
for (const sk of SKILL_LIST) {
  fromRegistries[`ability.${sk.id}.name`] = sk.name;
  fromRegistries[`ability.${sk.id}.desc`] = sk.desc;
}
for (const m of Object.values(ARCHETYPE_META)) fromRegistries[`archetype.${m.key}.label`] = m.label;
for (const c of Object.values(PERK_CATS)) {
  fromRegistries[`perkcat.${c.key}.name`] = c.name;
  fromRegistries[`perkcat.${c.key}.desc`] = c.desc;
}
for (const f of FAMILY_LIST) {
  fromRegistries[`family.${f.id}.name`] = f.name;
  for (let tr = 1; tr <= 4; tr++) {
    const d = f.tiers?.[tr]?.desc;
    if (d) fromRegistries[`family.${f.id}.tier${tr}.desc`] = d;
  }
}
// Architekt-Gebäude: NUR die Namen. Die Effekttexte werden erzeugt (src/i18n/buildingText.js).
for (const b of Object.values(ARCHITECT_FAMILIES)) fromRegistries[`building.${b.id}.name`] = b.name;
// Nur anbietbare Perks — `offerable: false` sind Alt-Einträge, die kein Spieler je sieht.
for (const pk of Object.values(PERK_DEFS)) {
  if (pk.offerable === false) continue;
  fromRegistries[`perk.${pk.id}.label`] = pk.label;
  fromRegistries[`perk.${pk.id}.desc`] = pk.desc;
}

export default {
  ...fromRegistries,

  /* ---- Architekt-Gebäude · Satzbausteine (#sprache) ----
     Der Effekttext wird ERZEUGT (src/i18n/buildingText.js), nicht je Gebäude/Stufe gepflegt: 41 Familien
     × bis zu 4 Stufen ergäben sonst über 100 fast gleiche Sätze. Hier stehen nur die Bausteine.
     Vorher lagen die deutschen Fassungen in architect.js — Satzvorlagen sind Anzeigetext und gehören
     in den Katalog; die reinen Zahlen-Helfer (tierNum/tierFactor/bindSpanFor) bleiben im Spiel-Layer. */
  "building.eff.flat.value": "alle Abgedeckten +{n} Stichwert",
  "building.eff.flat.score": "Sieg +{n} Score",
  "building.eff.lowValue": "niedrige Karten +{n} Stichwert",
  "building.eff.color.value": "passende Farbe +{n} Stichwert",
  "building.eff.color.score": "passende Farbe +{n} Score",
  "building.eff.target.highest": "höchste",
  "building.eff.target.lowest": "niedrigste",
  "building.eff.target.value": "{which} Karte +{n} Stichwert",
  "building.eff.target.score": "{which} Karte +{n} Score",
  "building.eff.streak": "Sieg +{n} Score je Serienpunkt (max {cap})",
  "building.eff.crit": "Crit-Sieg +{n} Score",
  "building.eff.milestone": "jeder {every}. Sieg auf diesem Gebäude +{n} Score",
  "building.eff.mult": "Siege hier ×{f} Score",
  "building.eff.neighbor.value": "+{n} Stichwert je Nachbargebäude (max {cap})",
  "building.eff.neighbor.score": "Sieg +{n} Score je Nachbargebäude (max {cap})",
  "building.eff.compound": "Sieg +{n} Score je vollendeter Struktur",
  "building.eff.segment.early": "frühe",
  "building.eff.segment.late": "späte",
  "building.eff.segment.value": "{half} Segmente +{n} Stichwert",
  "building.eff.segment.score": "{half} Segmente +{n} Score",
  "building.eff.relay.both": "strahlt +{n} Score in beide Nachbarfelder",
  "building.eff.relay.right": "reicht +{n} Score ans Feld rechts weiter",
  "building.eff.gamble": "Crit-Sieg +{n} Score · Sieg ohne Crit −{penalty} Score",
  "building.eff.joker": "Formations-Joker ({types})",
  "building.eff.transparentFarb": "Farbblock-Transparenz",
  "building.eff.bind": "Treppen-Bindeglied: Karte darf im Wert um ±{span} abweichen",
  "building.eff.crossSeg": "öffnet die Segmentgrenze",
  "building.eff.anker": "jede Zelle zählt als Anker (×{f})",
  "building.eff.formMult": "Formationen hier ×{f}",
  // Stufen-Kicker: ein QUALITATIVER Zusatz ab einer Stufe — aktiv angehängt oder als Vorschau markiert.
  "building.kick.mult": "zusätzlich ×{f} Score",
  "building.kick.critFlatMult": "bei Crit ×{n} Direkt-Score",
  "building.kick.streakDoubleFrom": "ab Serie {n} doppelt",
  "building.kick.addType": "zweiter Joker-Typ: {type}",
  "building.kick.ankerValue": "+{n} Stichwert je Ankerzelle",
  "building.kick.active": "{base} · {kick}",
  "building.kick.preview": "{base} (Stufe {tier}: {kick})",

  /* ---- Allgemein ---- */
  "common.close": "Schließen",
  // Währungs-Kürzel. Stichpunkte heißen im Englischen „Trick Points" → TP, nicht SP.
  "common.cur.sp": "SP",
  "common.cur.dp": "DP",

  /* ---- Startbildschirm ---- */
  "start.tagline": "Roguelite-Autobattler-Stechspiel · Prototyp",
  "start.logo.alt": "AUTOSTICH",

  "start.progress.onboarding": "🎓 Onboarding",
  "start.progress.bonus": "💠 Bonus-{cur} · nächste +5",
  "start.progress.runs": "{done} / {total} Läufe",
  "start.progress.links": "{done} / {total}",
  "start.progress.next": "Nächste Freischaltung:",

  // Belohnungen der Onboarding-Kette. Die Legendär-Phase nennt den Durchlauf aus dem
  // Entscheidungsplan (constants.js) — kein abgetipptes „R29" mehr.
  "start.onb.reroll": "Reroll +1",
  "start.onb.plant": "Pflanze frei",
  "start.onb.ice": "Eis frei",
  "start.onb.rarity": "Rarität: {tier}",
  "start.onb.legendary": `Legendär ⭐ (Durchlauf ${LEG_PHASE_CYCLE})`,

  "start.resume": "▶ Lauf fortsetzen",
  "start.resume.sub": "Durchlauf {cycle}/{total} · Score {score}",
  "start.normal": "Normaler Lauf",

  "start.seed.placeholder": "Seed einfügen",
  "start.seed.aria": "Seed einfügen und spielen",
  "start.seed.play": "↻ Spielen",
  "start.seed.error": "Kein gültiger Seed — prüf den Code und versuch es erneut.",
  "start.secret.unlock": "🔓 Alles freigeschaltet.",
  "start.secret.onboarding": "⏭️ Onboarding übersprungen · +10 SP · +50 DP",
  "start.secret.reset": "🔄 Profil wird zurückgesetzt …",

  "start.ranked": "Rangliste",
  "start.ranked.badge": "Woche",
  "start.ranked.badge.aria": "Wochen-Challenge",
  "start.ranked.open": "Wochen-Rangliste öffnen",
  "start.ranked.locked": "Wochen-Rangliste ansehen — Spielen wird frei, sobald alle Decks freigeschaltet sind und mit jedem ≥1 Lauf beendet wurde",

  "start.tile.workshop": "Deck-Werkstatt",
  "start.tile.workshop.locked": "Die Deck-Werkstatt wird nach Abschluss des Onboardings frei",
  "start.tile.upgrades": "Upgrades",
  "start.tile.upgrades.title": "Upgrade-Baum",
  "start.tile.upgrades.locked": "Frei nach Abschluss des Onboardings",
  "start.tile.upgrades.buyable": "{n} kaufbar",
  "start.tile.upgrades.complete": "✓ komplett",
  "start.tile.leaderboard": "Bestenliste",
  "start.tile.leaderboard.sub": "Globale Highscores",
  "start.tile.stats": "Statistiken",
  "start.tile.stats.sub": "Läufe & Rekorde",
  "start.tile.lock_one": "🔒 noch {count} Lauf",
  "start.tile.lock_other": "🔒 noch {count} Läufe",

  "start.options": "Optionen",
  "start.name.set": "Namen festlegen für den globalen Highscore",
  "start.name.change": "Name ändern",
  "start.name.signedIn": "Angemeldet als",
  "start.version.title": "Version · Umgebung · Commit",

  /* ---- Namens-Dialog (#14) ---- */
  "name.eyebrow.first": "Willkommen",
  "name.eyebrow.change": "Name ändern",
  "name.title.first": "Wähle deinen Namen",
  "name.title.change": "Dein Name",
  "name.placeholder": "Dein Name",
  "name.hint": "1–{max} Zeichen · erscheint im globalen Highscore. Jederzeit im Menü änderbar.",
  "name.cancel": "Abbrechen",
  "name.save": "Speichern",
  "name.lang.label": "Sprache",
  "name.preview.label": "Vorschau · Bestenliste",
  "name.preview.you": "du",

  /* ---- Optionen ---- */
  "options.eyebrow": "Optionen",
  "options.title": "Einstellungen",
  "options.footer": "Weitere Optionen (Tempo-Default …) folgen hier.",

  "options.language.title": "Sprache",
  "options.language.desc": "Sprache der Spieltexte.",

  "options.mute.title": "Ton stumm",
  "options.mute.desc": "Schaltet alle Klick- und Spiel-Sounds ab.",
  "options.sfx.title": "Effekt-Lautstärke",
  "options.sfx.desc": "Lautstärke der Klick-/Spiel-Sounds (SFX).",
  "options.sfx.aria": "SFX-Lautstärke",
  "options.music.title": "Musik-Lautstärke",
  "options.music.desc": "Lautstärke der Hintergrundmusik.",
  "options.music.aria": "Musik-Lautstärke",

  "options.rfx.title": "Effekte reduziert",
  "options.rfx.aus": "Aus",
  "options.rfx.mobile": "Mobile",
  "options.rfx.an": "An",
  "options.rfx.desc.aus": "Volle Effekte.",
  "options.rfx.desc.mobile": "Ausgewogen: Karten-Flip, Hintergrund, Glow & Finisher bleiben; Screen-Shake, Funken-Fontänen, Blur & Sweeps aus. Schont schwächere Geräte.",
  "options.rfx.desc.an": "Alle Effekte minimal — maximal ruhig, entlastet schwache Geräte stark.",

  "options.haptics.title": "Haptik (Vibration)",
  "options.haptics.desc": "Kurzes Vibrieren bei Bestätigungen. Nur auf Touch-Geräten (Handy) spürbar; System-Einstellung „reduzierte Bewegung“ wird respektiert.",

  "options.perfHud.title": "FPS-Zähler & Report",
  "options.perfHud.desc": "Blendet oben rechts FPS · p95 · Jank ein und zeichnet Perf-Daten auf (⧉ Report → Konsole + Zwischenablage). Nur im Testbranch. Aus = keine Anzeige und keine Messung.",

  "options.float.title": "Floating-Text anzeigen",
  "options.float.desc": "Aufsteigende Zahlen/Texte über dem Feld. Master-Schalter für alle drei unten. Die großen Ansagen (Stark/Brutal/Irre/Gottgleich) bleiben immer sichtbar.",
  "options.float.score.title": "↳ Score",
  "options.float.score.desc": "Aufsteigende Punktzahlen bei gewonnenen Stichen.",
  "options.float.mult.title": "↳ Multiplikator",
  "options.float.mult.desc": "„Kritisch!“- und Formations-Text (Multiplikator-Boni).",
  "options.float.winlose.title": "↳ Sieg / Niederlage",
  "options.float.winlose.desc": "Gewonnen/Verloren-Text am Stich-Ausgang.",
};
