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
import { NODES, BRANCHES } from "../game/progression.js";
import { WEEK_MODS } from "../game/weekMods.js";
import { GLOSSARY, GLOSSARY_CATEGORIES, GLOSSARY_GROUPS } from "../game/glossary.js";
import { DECK_DEFS, BF_SUFFIX } from "../game/cosmetics.js";
import { GLOBAL_FX } from "../game/themes.js";
import { guideStrings } from "./guideWalk.js";

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
for (const n of NODES) {
  fromRegistries[`node.${n.id}.label`] = n.label;
  if (n.detail) fromRegistries[`node.${n.id}.detail`] = n.detail;
}
for (const b of BRANCHES) {
  fromRegistries[`branch.${b.key}.name`] = b.name;
  fromRegistries[`branch.${b.key}.desc`] = b.desc;
}
/* Wochen-Mods: `desc` ist eine Funktion der Stärke (v). Ruft man sie MIT DEM PLATZHALTER auf,
   liefert sie genau die Vorlage zurück — so wandert der Satz ins Katalog-Format, ohne ihn
   abzutippen und ohne die Funktion zweimal zu pflegen. */
for (const m of WEEK_MODS) {
  fromRegistries[`weekmod.${m.id}.name`] = m.name;
  fromRegistries[`weekmod.${m.id}.desc`] = typeof m.desc === "function" ? m.desc("{v}") : String(m.desc || "");
}
/* Glossar: Label, Text UND die Wortformen für die Auto-Fettung. Die `match`-Liste ist KEIN
   Anzeigetext — sie steuert, welche Wörter in Beschreibungen fett werden. Englisch braucht dafür
   eigene Formen (Plurale, Verbformen), keine Übersetzung der deutschen Flexionen. */
for (const c of GLOSSARY_CATEGORIES) fromRegistries[`glossary.cat.${c.id}`] = c.label;
for (const [k, g] of Object.entries(GLOSSARY_GROUPS)) fromRegistries[`glossary.group.${k}`] = g.label;
for (const [gid, e] of Object.entries(GLOSSARY)) {
  fromRegistries[`glossary.${gid}.label`] = e.label;
  fromRegistries[`glossary.${gid}.text`] = e.text;
  fromRegistries[`glossary.${gid}.match`] = (e.match && e.match.length ? e.match : [e.label]).join("|");
}
/* Kosmetik: EIN Name je Set. Spielfeld- und Paketname leiten sich im Register vom Decknamen ab
   (cosmetics.js/themes.js) — hier steht deshalb nur der Deckname plus das Spielfeld-Suffix. */
for (const d of Object.values(DECK_DEFS)) fromRegistries[`cosmetic.${d.id}.name`] = d.name;
fromRegistries["cosmetic.bf.suffix"] = BF_SUFFIX;
for (const f of GLOBAL_FX) {
  fromRegistries[`fx.${f.key}.name`] = f.name;
  if (f.desc) fromRegistries[`fx.${f.key}.desc`] = f.desc;
}
// Archetyp-Leitfäden: EIN Baum-Durchlauf sammelt alle Anzeigetexte (src/i18n/guideText.js).
Object.assign(fromRegistries, guideStrings());
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

  /* ---- Lauf-Ende (GameOver) ---- */
  "gameover.menu": "Menü",
  "gameover.newRun": "Neuer Lauf",
  "gameover.eyebrow": "Lauf beendet",
  "gameover.perTrick.title": "Durchschnittlicher Score je Stich",
  "gameover.perTrick": "Ø {score}/Stich",
  "gameover.cycles_one": "{count} Durchlauf",
  "gameover.cycles_other": "{count} Durchläufe",
  "gameover.milestones": "💠 Meilensteine {done}/{total}",
  "gameover.milestones.max": "Maximum",
  "gameover.milestones.next": "nächster bei {n} Mio",
  "gameover.sp": "Stichpunkte",
  "gameover.dp": "Deck-Punkte",
  "gameover.unlocked.inline": "✦ Freigeschaltet: {label}",
  "gameover.progress.saved": "Fortschritt gesichert",
  "gameover.progress.done": "Lauf abgeschlossen",
  "gameover.skins.title": "★ Neu freigeschaltet",
  "gameover.skins.hint": "Auswählbar im Menü unter „Deck“.",
  "gameover.unlocked.title": "✦ Freigeschaltet",
  "gameover.nav.workshop": "Zur Werkstatt",
  "gameover.nav.upgrades": "Zu den Upgrades",
  "gameover.nav.leaderboard": "Zur Rangliste",
  "gameover.build": "Build",
  "gameover.engine": "Motor-Kennzahlen",
  "gameover.stats": "Stats & Verlauf",
  "gameover.chart.title": "Score-Verlauf",
  "gameover.chart.run": "Lauf",
  "gameover.chart.record": "Rekord",
  "gameover.chart.first": "erster Lauf",
  "gameover.layout.open": "Finale Aufstellung ansehen",
  "gameover.layout.hint": "Antippen zeigt am Brett, wo es liegt.",
  // Archetyp-Kennzahlen — nur sichtbar, wenn der Archetyp gespielt wurde.
  "gameover.metric.growth": "Gewachsen",
  "gameover.metric.ionizations": "Ionisierungen",
  "gameover.metric.ashBurned": "Asche verbrannt",
  "gameover.metric.brands": "Brände",

  /* ---- Feuer-Leiste (HeatBar) ---- */
  "bar.fire.heat": "Hitze",
  "bar.fire.conflagReady": " · FLÄCHENBRAND BEREIT",
  "bar.fire.whiteGlow": " · WEISSGLUT",
  "bar.fire.state.conflag": "Flächenbrand bereit",
  "bar.fire.state.white": "Weißglut",
  "bar.fire.state.heat": "Hitze {value}/{max}",
  "bar.fire.badge.fireRoll": "Feuerwalze",
  "bar.fire.badge.fireRoll.n": "Feuerwalze +{n}",
  "bar.fire.badge.glow": "Glühende Klinge",
  "bar.fire.badge.glow.n": "Glühende Klinge +{n}",
  "bar.fire.tick.glow": "Glühende Klinge: +Wert ab {n} % Hitze",
  "bar.fire.tick.white": "Weißglut: bei voller Hitze wird jeder Überschuss zu +{n} Score je überlaufendem Hitzepunkt",
  "bar.fire.ash": "Asche",
  "bar.fire.ash.title": "Asche — {text}",
  "bar.fire.forges": "Schmiedungen",
  "bar.fire.forges.title": "Geschmiedeter Kartenwert — Summe der ⚒-Aufwertungen über alle Karten.",
  "bar.fire.yield": "Feuer-Ertrag",
  "bar.fire.overRun": "über den Lauf",
  "bar.fire.ashBurned": "Asche verbrannt",
  "bar.fire.brand": "Brand · Gegner",

  /* ---- Blitz-Leiste (ChargeBar) ---- */
  "bar.lightning.chain": "🔗 Serienkette",
  "bar.lightning.chain.holds": " · hält",
  "bar.lightning.saturation": "🌐 Sturm-Sättigung",
  "bar.lightning.breadth": "Sturmgröße",
  "bar.lightning.breadth.payoff": "+{n} Wert / Karte",
  "bar.lightning.depth": "Sturmintensität",
  "bar.lightning.depth.payoff": "Überschlag: {n} Prozentpunkte → 1 Ladung",
  "bar.lightning.state.full": "Voll geladen",
  "bar.lightning.state.crit": "Crit ×{mult}",
  "bar.lightning.state.charge": "Ladung {charge}/{max}",
  "bar.lightning.fullBadge": " · VOLL GELADEN",
  "bar.lightning.noConsumer": "Voll — ohne Konsument verpufft die Ladung. Wähle {skill}, um sie zu verbrauchen.",
  "bar.lightning.consumes": "Entladungen",
  "bar.lightning.consumes.title": "Volle Ladungsverbräuche diesen Lauf — der Kern-Rhythmus des Sturms.",
  "bar.lightning.storm": "Gewitterfront",
  "bar.lightning.storm.title": "Gewitterfront: Crit-Chance-Momentum je Entladung (bis +{cap} %).",
  "bar.lightning.discharge": "Entladung",
  "bar.lightning.discharge.title": "Entladung: dauerhaftes Crit-Multiplikator-Momentum je Entladung.",
  "bar.lightning.frequency": "Blitzfrequenz",
  "bar.lightning.frequency.over": "Crit voll — die Leiste zeigt jetzt den Crit-Multiplikator.",
  "bar.lightning.frequency.title": "Crit-Chance des nächsten Siegs.",
  "bar.lightning.streakGuard": "Serienschutz: eine Niederlage mit genug Ladung hielt die Serie (½ Ladung verbraucht).",
  "bar.lightning.streak.broken": "gerissen",

  /* ---- Eis-Leiste (GlacierBar) ---- */
  "bar.ice.chip.title": "Gletscher · Masse {mass} · Stufe {tier}",
  "bar.ice.chip.title.burst": "Gletscher · Masse {mass} · Stufe {tier} · BRICHT",
  "bar.ice.bursting": "Bricht",
  "bar.ice.critical": "kritisch",
  "bar.ice.playOrder": "Spielreihenfolge (Position)",
  "bar.ice.cardValue": "Kartenwert",
  "bar.ice.state.ready": "Bruch bereit",
  "bar.ice.state.count": "{n} Gletscher",
  "bar.ice.yield": "Gletscher-Ertrag",
  "bar.ice.cascade": "Kaskade",
  "bar.ice.cascade.unit": "brechen",
  "bar.ice.biggest": "Größtes Cluster",
  "bar.ice.empty": "Noch keine Gletscher — friere in der Aufstellung Karten fest.",
  "bar.ice.firnGround": "Firn-Boden lädt",
  "bar.ice.firnReserve": "Firn-Reserve",
  "bar.ice.frozenOpp": "Gegner eingefroren",
  "bar.ice.duoBuff": "Duo-Buff",
  "bar.ice.avalanche.ready": "Große Lawine · bereit",
  "bar.ice.avalanche.used": "Große Lawine · verbraucht",

  /* ---- Pflanze-Leiste (PlantBar) ---- */
  "bar.plant.yield": "Garten-Ertrag",
  "bar.plant.root": "Wurzel",
  "bar.plant.bloom": "Blüte",
  "bar.plant.harvest": "Ernte",
  "bar.plant.grown": "Gewachsen",
  "bar.plant.grown.unit": "Wachstum gesamt",
  "bar.plant.trimmed": "✂ Getrimmt",
  "bar.plant.trimmed.unit": "· Wurzel/Blüte",
  "bar.plant.trimmed.title": "Trimmen: jeder ersetzte Wachstums-Skill ({skills}) hebt dauerhaft den Wurzel- & Blüten-Score.",
  "bar.plant.tallest": "🌳 Höchster Baum",
  "bar.plant.tallest.value": "Wert {value}",
  "bar.plant.overflow": "· Überlauf",
  "bar.plant.perWin": "Score/Sieg",
  "bar.plant.tallest.title": "Mutterbaum: der tiefste Baum (Überlauf-Wachstum über dem Wert-Deckel) zahlt je grünem Sieg — und verdoppelt seinen Wurzel-Score.",
  "bar.plant.forest": "🌲 Wald",
  "bar.plant.forest.unit": "Überlauf-Wachstum",
  "bar.plant.forest.title": "Weltenbaum: die Summe des Überlauf-Wachstums über alle grünen Karten zahlt je grünem Sieg (der ganze alte Wald).",
  "bar.plant.state.overgrown": "Überwuchert",
  "bar.plant.state.green": "Grün {pct} %",
  "bar.plant.share": "Grün-Anteil des Feldes",
  "bar.plant.share.badge": " · ÜBERWUCHERT",
  "bar.plant.share.value": "{green} / {total} · {pct} %",
  "bar.plant.share.title": "Anteil grüner (reifer + ausgewachsener) Karten am Feld.",
  "bar.plant.mark.spring": "Ew. Frühling",
  "bar.plant.mark.spring.title": "Ewiger Frühling — Überwucherung schon ab {pct} % Feld grün",
  "bar.plant.mark.overgrowth": "Überwucherung",
  "bar.plant.mark.overgrowth.title": "Überwucherung — ab {pct} % alle Farbblöcke +Faktor",
  "bar.plant.nextRipe": "Nächste Reife",
  "bar.plant.nextRipe.title": "Grobe Schätzung: nächster Setzling wird grün (aus Wachstumsrate × Restdistanz).",
  "bar.plant.nextRipe.wins_one": "~{count} Sieg",
  "bar.plant.nextRipe.wins_other": "~{count} Siege",
  "bar.plant.stage.seed": "Setzling",
  "bar.plant.stage.seed.title": "Wachsende, noch nicht reife Karten (Balken = Ø Fortschritt zur Reife).",
  "bar.plant.stage.green": "Grün",
  "bar.plant.stage.green.title": "Reife grüne Karten, Wert unter dem Deckel (Balken = Ø Fortschritt zum Wert-Deckel).",
  "bar.plant.stage.full": "Ausgewachsen",
  "bar.plant.stage.full.title": "Voll ausgewachsen (Wert {cap}).",
  // Zeilen im Reifen-Strip: Setzling nennt Wachstum/Schwelle, Grün den erreichten Kartenwert.
  "bar.plant.strip.seed": "Setzling {growth}/{need}",
  "bar.plant.strip.green": "Grün · W{value}",
  "bar.plant.maturing": "Reifende Karten · {n}",
  "bar.plant.maturing.more": "+{n} weitere",
  "bar.plant.runners": "Ausläufer · Kolonisiert",

  /* ---- Kopfleiste im Stichspiel (StatusBar) ---- */
  "hud.pause": "Pause",
  "hud.resume": "Weiter",
  "hud.speed.x2": "Tempo ×2",
  "hud.speed.x4": "Tempo ×4",
  "hud.speed.max": "Tempo maximal",
  "hud.speed.max.label": "MAX",
  "hud.cards": "Karten",
  "hud.cards.title": "Kartenübersicht öffnen",
  // Kurzform, weil die Zelle schmal ist — „Durchlauf" passt nicht.
  "hud.cycle": "Durchl.",
  "hud.time": "Zeit",
  "hud.score": "Score",
  "hud.record": "⚑ Rekord",
  "hud.streak": "Serie",
  "hud.streak.best": "best {n}",
  "hud.mult": "Mult",

  /* ---- Seitenleiste im Stichspiel (StatusRail) ---- */
  "rail.mults": "Multiplikatoren",
  "rail.formation": "Formation",
  "rail.formation.value": "{n} · +{pct} %",
  "rail.buildings": "Gebäude",
  "rail.pct": "+{pct} %",
  "rail.pct.plain": "{pct} %",
  "rail.critChance": "Crit-Chance",
  "rail.critChance.ion": "+{pct} Ion.",
  "rail.critMult": "Crit-Mult",
  "rail.jackpot": "Jackpot",
  "rail.wins": "Siege",
  "rail.losses": "Verl.",
  "rail.rate": "Quote",
  "rail.tricks": "Stiche",
  "rail.crits": "Crits",
  "rail.analysis": "Analyse",
  "rail.best": "Bester",
  "rail.scoreSource": "Score-Herkunft",
  "rail.scoreTrend": "Score-Verlauf",
  "rail.trend.run": "Lauf",
  "rail.trend.record": "Rekord",
  "rail.trend.first": "erster Lauf",

  /* ---- Spielfeld (Battlefield) ---- */
  "bf.ready": "Bereit — starte den Autobattler",
  "bf.side.you": "Du",
  "bf.side.opponent": "Gegner",
  "bf.banner.win": "Gewonnen",
  "bf.banner.winCrit": "Gewonnen · Kritisch",
  "bf.banner.winTie": "Gleichstand → Sieg",
  "bf.banner.loss": "Verloren",
  "bf.banner.tie": "Gleichstand",
  /* Groß-Ansagen — eingefrorene Eskalationskette (Übersetzerpaket §3.6). Ein eigener Wächter
     prüft die Zuordnung Stark→FIERCE · Brutal→BRUTAL · Irre→INSANE · Gottgleich→GODLIKE ·
     Lawine→AVALANCHE · Gönn dir→LET’S GO!. */
  "bf.big.fierce": "Stark",
  "bf.big.brutal": "Brutal",
  "bf.big.insane": "Irre",
  "bf.big.godlike": "Gottgleich",
  "bf.big.avalanche": "Lawine",
  "bf.big.letsgo": "Gönn dir",

  /* ---- Aufstellungsphase (FormationPhase) ---- */
  "form.eyebrow": "Aufstellung · Durchlauf {cycle}",
  "form.title": "Deck aufstellen",
  "form.bonus": "Formations-Bonus",
  "form.bonus.value": "+{pct} %",
  "form.count": "Formationen",
  "form.undo": "↶ Rückgängig",
  "form.reset": "Zurücksetzen",
  "form.confirm": "Fortfahren",
  "form.confirm.title": "Formations-Differenz seit Durchlaufbeginn · verbleibende Formations-Energie",
  "form.delta": "{sign}{pct} %",
  "form.energyLeft": " · noch {n} Energie",
  // Der Hinweis ist dreigeteilt, weil „innerhalb" fett steht.
  "form.hint.pre": "Tippe zwei Karten zum Tauschen (1 Energie) · Formationen entstehen nur",
  "form.hint.within": "innerhalb",
  "form.hint.post": "der {size}er-Segmente",
  "form.segwork": "Segmentarbeit:",
  "form.segwork.all": "alle Grenzen offen, segmentübergreifend",
  "form.segwork.marked": "die mit ⇕ markierten Grenzen dürfen überschritten werden",
  "form.arch.on": "🏗 Gebäude an",
  "form.arch.off": "🏗 Gebäude aus",
  "form.legend": "Formationen & Rahmenfarben",
  "form.legend.chip": "Legende",
  "form.details.arch": "🏗 Deine Gebäude ({n}) · Perks",
  "form.details.plain": "Perks & Effekte",
  "form.iceEffects": "Eis-Effekte auf Formationen",
  "form.collapse.open": "{label} ausklappen",
  "form.collapse.close": "{label} einklappen",
  "form.collapse.more": "mehr",
  "form.collapse.less": "weniger",

  /* ---- Allgemein ---- */
  "common.close": "Schließen",
  // Kompakte Score-Abkürzung (fmtScoreShort). Im Deutschen mit Abstand und Punkt, im Englischen angehängt.
  "format.short.mega": "{n} Mio.",
  "format.short.giga": "{n} Mrd.",
  "format.short.tera": "{n} Bio.",
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
