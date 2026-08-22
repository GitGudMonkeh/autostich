/* ============================================================
   KATALOG DEUTSCH — Ausgangssprache. Jeder Schlüssel MUSS auch in en.js stehen
   (test/i18n-guards.test.js erzwingt das), samt identischer Platzhalter-Menge.

   Konventionen (docs/text-style-guide.md):
   - Schlüssel: <bereich>.<block>.<sache>, klein, Punkt-getrennt. Keine Sätze als Schlüssel.
   - Platzhalter: {name} — NIE Zahlen direkt einbauen, wenn sie zur Laufzeit kommen.
   - Tuning-Zahlen aus den Konstanten interpolieren (Template-Literal), nicht abtippen.
   - Plural: Schlüsselpaare `…_one` / `…_other`, ausgewählt über die Variable `count`.
   ============================================================ */
import { LEG_PHASE_CYCLE, FORMATION_LABELS, SUITS } from "../game/constants.js";
import { TIER_META } from "../game/rarity.js";
import { SKILL_LIST, ARCHETYPE_META } from "../game/skills.js";
import { PERK_DEFS, CATEGORIES as PERK_CATS } from "../game/perks.js";
import { FAMILY_LIST } from "../game/families.js";
import { ARCHITECT_FAMILIES } from "../game/architect.js";
import { NODES, BRANCHES } from "../game/progression.js";
import { WEEK_MODS } from "../game/weekMods.js";
import { GLOSSARY, GLOSSARY_CATEGORIES, GLOSSARY_GROUPS } from "../game/glossary.js";
import { GLACIER_FORM_LABEL } from "../game/glacier.js";
import { DECK_DEFS, BF_SUFFIX } from "../game/cosmetics.js";
import { GLOBAL_FX } from "../game/themes.js";
import { ARCH_CAT } from "../ui/indicators/vocab.js";
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
for (const su of Object.values(SUITS)) fromRegistries[`suit.${su.key}.name`] = su.name;
// Architekt-Kategorien (Rahmenfarbe der Gebäude) — kleines Anzeige-Register in der UI-Schicht.
for (const [k, c] of Object.entries(ARCH_CAT)) fromRegistries[`archcat.${k}.label`] = c.label;
for (const [k, label] of Object.entries(GLACIER_FORM_LABEL)) fromRegistries[`glacierform.${k}.name`] = label;
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
for (const c of GLOSSARY_CATEGORIES) {
  fromRegistries[`glossary.cat.${c.id}`] = c.label;
  fromRegistries[`glossary.cathint.${c.id}`] = c.hint;
}
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
  "gameover.record.new": "Neuer Rekord",
  "gameover.record.from": "zum Rekord",
  "gameover.perTrick.title": "Durchschnittlicher Score je Stich",
  "gameover.perTrick": "Ø {score}/Stich",
  "gameover.cycles_one": "{count} Durchlauf",
  "gameover.cycles_other": "{count} Durchläufe",
  "gameover.milestones": "💠 Meilensteine {done}/{total}",
  "gameover.milestones.max": "Maximum",
  "gameover.milestones.next": "nächster bei {n} Mio",
  "gameover.welcome": "✦ Willkommensbonus",
  "gameover.welcome.hint": "für deinen ersten abgeschlossenen Lauf — steck sie in die Deck-Werkstatt und hol dir ein Pack.",
  "gameover.welcome.value": "+{n} DP",
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
  // #go-ruhe: Kopf-Kennzahlenreihe (nur Desktop) + Bestleistungs-Panel.
  "gameover.kpi.duration": "Dauer",
  "gameover.kpi.tricks": "Stiche",
  "gameover.kpi.cycles": "Durchläufe",
  "gameover.kpi.perTrick": "Je Stich",
  "gameover.best": "Bestleistungen",
  "gameover.best.hint": "persönliche Rekorde",
  "gameover.best.new": "Neu",
  "gameover.best.streak": "Beste Serie",
  "gameover.best.trick": "Bester Stich",
  "gameover.best.crits": "Meiste kritische Treffer",
  "gameover.best.score": "Bisheriger Höchstwert",
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
  "bar.fire.state.over": "Überhitzung +{n} % Feuer-Score",
  "bar.fire.state.heat": "Hitze {value}/{max}",
  "bar.fire.badge.fireRoll": "Feuerwalze",
  "bar.fire.badge.fireRoll.n": "Feuerwalze +{n}",
  "bar.fire.badge.glow": "Glühende Klinge",
  "bar.fire.badge.glow.n": "Glühende Klinge +{n}",
  "bar.fire.badge.glow.title": "Glühende Klinge: +{v1} ab {h1} % Hitze · +{v2} ab {h2} % · +{v3} bei {h3} % Hitze. Die oberen Stufen verlangen je Segment einen Sieg über {m2} bzw. {m3} Kampfwert-Vorsprung — bleibt ein Segment ohne, fällst du zurück.",
  "bar.fire.badge.spark": "Funkenflug",
  "bar.fire.badge.spark.n": "Funkenflug {n}",
  "bar.fire.badge.spark.title": "Funkenflug-Speicher: Siege unter {m} Kampfwert-Vorsprung zahlen ein, ein Sieg ab {m} schüttet ihn aus. Eine Niederlage halbiert ihn.",
  "bar.fire.tick.glow": "Glühende Klinge: +Wert ab {n} % Hitze",
  "bar.fire.tick.full": "100 % Hitze — darüber beginnt die Überhitzung",
  "bar.fire.tick.white": "Weißglut: Hitze über 100 % staut sich als Überhitzung auf (bis {max} %) — je heißer, desto weniger kommt an. Jeder Punkt gibt +{n} % auf den gesamten Feuer-Score und baut sich je Stich wieder ab.",
  "bar.fire.ash": "Asche",
  "bar.fire.ash.title": "Asche — {text}",
  "bar.fire.forges": "Schmiedungen",
  "bar.fire.forges.title": "Geschmiedeter Kartenwert — Summe der ⚒-Aufwertungen über alle Karten.",
  "bar.fire.yield": "Feuer-Ertrag",
  "bar.fire.yield.base": "Feuer-Score",
  "bar.fire.yield.over": "Überlauf",
  "bar.fire.yield.over.hint": "Weißglut (Überhitzung über 100 % Hitze) + Ascheglut (Asche über die Schmiede-Kapazität)",
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
  "bf.trickCount": "Stich {n} / {total}",
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
  /* Stich-Aufschlüsselung (§17) — die Faktorenkette unter dem Feld. Die Labels sind bewusst kurz:
     die Zeile muss auf einem Handy in EINE Zeile passen. Die Langfassung steckt jeweils im `…title`
     (Hover) — dort darf erklärt werden, was hinter dem Glied steckt. */
  "bf.bd.base": "Basis",
  "bf.bd.base.title": "Grundwert des Siegs plus alle flachen Boni (Perks, Crit-Flats, Fraktions-Score).",
  "bf.bd.streak": "Serie",
  "bf.bd.streak.title": "Multiplikator aus der laufenden Siegesserie.",
  "bf.bd.perks": "Perks",
  "bf.bd.perks.title": "Multiplikator aus Perks und Familien, dazu Sonnenzorn und die Score-Gebäude des Architekten.",
  "bf.bd.form": "Form",
  "bf.bd.form.title": "Multiplikator der Formationen an dieser Position, samt Nachhall und Formationskern.",
  "bf.bd.crit": "Crit",
  "bf.bd.crit.title": "Crit-Multiplikator dieses Stichs.",
  "bf.bd.direct": "Direkt",
  "bf.bd.direct.title": "Direkt-Score, der an der Kette vorbeiläuft: Glutdividende, Blitz, Pflanze, Gletscher, Vabanque.",
  "bf.bd.total": "Summe",
  "bf.bd.total.title": "Gesamter Score dieses Stichs.",
  "bf.bd.aria": "Aufschlüsselung des Stich-Scores",

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
  "form.seg.strength": "+{pct} %",
  "form.seg.strength.title": "Formations-Bonus dieses Segments in Prozent — grün: seit Durchlaufbeginn stärker, rot: schwächer",
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
  /* Browser-Tab-Titel. index.html trägt ihn statisch auf Deutsch (er steht im HTML, lange bevor
     React die gewählte Sprache kennt); sobald die App läuft, schreibt App.jsx `document.title`
     aus diesem Schlüssel nach. Der PWA-Name im manifest.webmanifest bleibt einsprachig — ein
     Manifest kennt keine Sprachumschaltung, es wird beim Installieren einmal gelesen. */
  "meta.title": "Autostich — Prototyp",
  "common.close": "Schließen",
  // #update: „Neue Version verfügbar"-Leiste (UpdateBanner)
  "update.available": "Neue Version verfügbar",
  "update.reload": "Neu laden",
  "update.dismiss": "Ausblenden",
  // Kompakte Score-Abkürzung (fmtScoreShort). Im Deutschen mit Abstand und Punkt, im Englischen angehängt.
  "format.short.mega": "{n} Mio.",
  "format.short.giga": "{n} Mrd.",
  "format.short.tera": "{n} Bio.",
  // Währungs-Kürzel. Stichpunkte heißen im Englischen „Trick Points" → TP, nicht SP.
  "common.cur.sp": "SP",
  "common.cur.dp": "DP",

  /* ---- Allgemein (Auswahl-Panels) ---- */
  "common.confirm": "Bestätigen",
  "common.chosen": "{n} / {need} gewählt",

  /* ---- Skill-Auswahl (SkillSelect) ---- */
  "skill.eyebrow": "Skill · Durchlauf {cycle} · {held}/{slots} Slots",
  "skill.title": "Wähle einen Skill",
  "skill.arch.none": "Skill",
  "skill.reroll": "🎲 Neu würfeln · {n}",
  "skill.decline": "Ablehnen → Perk",
  "skill.skipCycle": "Runde überspringen",
  // Meisterhand-Bonus (PICK_PERK): die Skill-Wahl kommt hier NICHT aus dem Rundenplan, sondern aus dem eben
  // genommenen Perk. Deshalb ein eigener Hinweis — und ein eigener Ablehnen-Text: „→ Perk" wäre gelogen,
  // ein Bonus-Angebot tauscht sich nicht gegen ein Perk-Angebot ein.
  "skill.bonus.hint": "Zusatz-Slot aus deinem letzten Perk — wähle sofort einen weiteren Skill.",
  "skill.declinePlain": "Ablehnen",
  "skill.nav.prev": "vorheriger Typ",
  "skill.nav.next": "nächster Typ",
  "skill.guide.title": "Leitfaden: {arch}",
  "skill.guide.aria": "Leitfaden {arch} öffnen",
  "skill.more": "mehr",
  "skill.less": "weniger",
  // Konsumenten (Hitze/Ladung): höchstens einer je Art — der zweite ersetzt den ersten.
  "skill.consumer.heat": "Hitze",
  "skill.consumer.charge": "Ladungs",
  "skill.consumer.pre": "Du hältst bereits den {kind}-Konsumenten",
  "skill.consumer.post": "ersetzt ihn (höchstens 1 {kind}-Konsument). Deine aktuelle Ressource bleibt erhalten.",
  "skill.replace": "Ersetzen",
  "skill.cancel": "Abbrechen",
  "skill.slotsFull": "Slots voll",
  "skill.slotsFull.hint": "Alle {slots} Slots belegt. Wähle einen neuen Skill — ein Fenster fragt dann, welchen du ersetzt.",
  "skill.replace.which": "Welchen Skill ersetzen?",
  "skill.replace.new": "Neu:",
  "skill.replace.tap": "Tippe den Skill, der weichen soll.",
  "skill.replace.this": "↔ diesen ersetzen",
  "skill.badge.consumer": "KONSUMENT",
  "skill.badge.legendary": "★ LEGENDÄR",
  "skill.selected": "✓ ausgewählt",
  "skill.held": "Deine Skills — {held}/{slots} · bereits gehalten",
  "skill.heldBadge": "✓ gehalten",
  // Was verschwindet, wenn der LETZTE Skill einer Fraktion abgelegt wird.
  "skill.lastOfArch": "⚠ Letzter {arch}-Skill: {loss}.",
  "skill.lastOfArch.baked": " Bereits aufgewerteter Kartenwert bleibt.",
  "skill.loss.plant": "alle grünen Karten, das Wachstum und die Kolonisierungen gehen verloren",
  "skill.loss.ice": "alle Gletscher tauen auf; Masse und Firn-Reserve gehen verloren",
  "skill.loss.fire": "Hitze, Asche und der Schmiede-Zähler gehen verloren",
  "skill.loss.lightning": "die Ladung geht verloren",
  "skill.passive.head": "{arch} · Passiv",
  "skill.passive.expand": "{arch}: Passiv ausklappen",
  "skill.passive.collapse": "{arch}: Passiv einklappen",
  // Die Zahlen stehen als Platzhalter: sie kommen zur Anzeigezeit aus constants.js/glacier.js,
  // damit ein Balancing-Dreh nicht am Text vorbeigeht.
  "skill.passive.lightning": "Der erste Blitz-Skill gibt +{first} % Crit-Chance, jeder weitere +{each} %. Dazu +{mult}× Crit-Multiplikator je Blitz-Skill.",
  "skill.passive.fire": "Jeder Sieg mit mindestens {margin} Kampfwert-Vorsprung heizt die Hitze um {heat} % auf und gibt +{score} Feuer-Score — je größer der Vorsprung, desto mehr. Niederlagen kühlen die Hitze um {cool} % ab (plus Wert-Rückstand, bis {coolMax}). Jeder weitere Feuer-Skill gibt +{perSkill} Feuer-Score je Vorsprungspunkt.",
  "skill.passive.ice": "Jeder Eis-Skill friert eine eigene Karte als Gletscher fest — sie wird starr (in keiner künftigen Aufstellung mehr verschiebbar), sammelt dafür aber jeden Durchlauf Masse und bricht schließlich gewaltig über ihre Nachbarn. Jeder Pick friert einen neuen Gletscher (auch ein Tausch bei vollen Slots); ab {declineFrom} gehaltenen Eis-Skills friert selbst das Ablehnen eines Angebots noch einen — so kannst du mehr Gletscher haben als Skill-Slots.",
  "skill.passive.plant": "Jeder Sieg gibt der Karte bis zu +1 Wachstum (volles Tempo ab {ref} Pflanze-Skills). Ab {green} Wachstum wird die Karte grün. Solange du nur Pflanzen-Skills hältst: je {perValue} Wachstum +1 Kartenwert (bis {cap}, danach ist sie voll ausgewachsen), ab {minSkills} Pflanzen-Skills auch bei jeder {everyLoss}. Niederlage.",
  "skill.forms.head": "Deine aktiven Formationen",
  "skill.forms.expand": "Aufstellfeld ausklappen",
  "skill.forms.collapse": "Aufstellfeld einklappen",
  "skill.forms.iceTitle": "Eis biegt die Erkennung",

  /* ---- Perk-Auswahl (PerkSelect) ---- */
  "perk.start": "Start",
  "perk.cycle": "Durchlauf {cycle}",
  "perk.title": "Wähle einen Perk",
  "perk.reroll": "🎲 Neu würfeln · {n}",
  "perk.declineAll": "Alle ablehnen",
  "perk.stat.crit": "Crit",
  "perk.stat.scoreMult": "Score-Mult",
  "perk.upgrade": "⬆ AUFWERTEN · {from}→{to}",
  "perk.onceHint": "Jeder Perk ist pro Lauf nur einmal wählbar.",
  "perk.deckStrength": "Deck-Stärke je Farbe",
  // #lv-fluegel: die zwei Seitenleisten der Level-up-Karte (nur ab 1280 px).
  "lv.wing.deck": "Deck",
  "lv.wing.stats": "Kennzahlen",
  "lv.wing.expand": "{what} einblenden",
  "lv.wing.collapse": "{what} ausblenden",
  "perk.formations": "Formationen",
  "perk.build_one": "Dein Build — {count} Perk",
  "perk.build_other": "Dein Build — {count} Perks",
  "perk.build.empty": "Noch keine Perks gewählt.",
  // #sprache: Build-Übersicht unter dem Brett + die geteilten Listen (BuildPanel/BuildSummary).
  "build.perks.head": "Perks — {count}",
  "build.skills.head": "Skills — {count}",
  "build.perks.empty": "Noch keine Perks.",
  "build.skills.empty": "Noch keine Skills.",
  "build.perks.emptyRun": "Noch keine Perks. In manchen Durchläufen wählst du einen dazu.",
  "build.skills.emptyRun": "Noch keine Skills — ab Durchlauf {cycle} wählbar.",
  // #384 Funkenflug-Bilanz in der Skill-Detailansicht: echter Beitrag (inkl. der Multiplikatoren des Stichs).
  "build.skill.yield.term": "Ertrag",
  "build.skill.spark.yield": "bisher **{score}** Score aus **{n}** Ausschüttungen; **{store}** liegen im Speicher.",
  "build.skill.spark.empty": "noch keine Ausschüttung; **{store}** liegen im Speicher.",
  "build.deck.legend": "Balken = Ø-Wert · violett ◆ = unschlagbar (>{over}, überbietet jede Gegnerkarte).",

  /* ---- Legendär-Wahl (LegendarySelect) ---- */
  "leg.fallbackLabel": "Legendär",
  "leg.eyebrow": "Legendär · einmalige Wahl",
  "leg.title": "★ Legendärer Skill",
  "leg.reroll": "↻ Neu würfeln",
  "leg.decline": "Keinen Legendär — Skill wählen",

  /* ---- Gletscher-Wahl (GlacierPick) ---- */
  "glacierpick.eyebrow": "Gletscher",
  "glacierpick.title": "Wähle eine Karte als Gletscher",
  "glacierpick.intro.a": "Sie friert auf ihrer Zelle fest — ab dann",
  "glacierpick.intro.rigid": "starr",
  "glacierpick.intro.b": "(nicht mehr verschiebbar) und sammelt Masse, bis sie bricht. Entscheide zwischen Position und Wert.",
  "glacierpick.chosen": "{n} / 1 gewählt",

  /* ---- Ziel-Auswahlen (TargetSelect · FamilyTargetSelect) ---- */
  "target.eyebrow": "Rolle · {perk}",
  "target.pickCards_one": "Wähle {count} Karte",
  "target.pickCards_other": "Wähle {count} Karten",
  "famtarget.alreadyBound": " ({n} bereits als Rolle gebunden)",
  "famtarget.pickType": "Wähle einen Formationstyp",
  "famtarget.deck": "Dein Deck · aktuelle Formationen",
  "famtarget.deck.arch": "Dein Deck · aktuelle Formationen & Gebäude",
  "famtarget.ordered": "Reihenfolge: erste Farbe = Gewinner (+), zweite = Verlierer (−)",
  "famtarget.pickSuits_one": "Wähle eine Farbe",
  "famtarget.pickSuits_other": "Wähle {count} Farben",
  "famtarget.deckValues": "Deck-Werte je Farbe",
  "famtarget.strength": "Formations-Stärke:",

  /* ---- Durchlauf-Score-Chip (RoundScoreBadge) ---- */
  "roundscore.label": "Durchlauf-Score",
  "roundscore.diff": "{sign}{pct} %",
  "roundscore.diff.title": "Differenz zur Vorrunde",
  "roundscore.noPrev.title": "keine Vorrunde zum Vergleich",
  "roundscore.firstCycle": "erster Durchlauf",

  /* ---- Formations-Panel (FormationPanel) ---- */
  "formpanel.title": "Deine aktiven Formationen",
  "formpanel.count": "{n} · max ×{max}",
  "formpanel.archToggle": "🏗 Gebäude",
  "formpanel.archToggle.title": "Platzierte Architekt-Gebäude als Rahmen über dem Brett anzeigen",

  /* ---- Gletscher-Formations-Legende (GlacierFormLegend) ---- */
  "glacierlegend.head": "Gletscher-Formationen (2D)",
  "glacierlegend.head.compact": "Gletscher-Formationen (2D):",
  "glacierlegend.block": "2×2-Quadrat (4 Gletscher)",
  "glacierlegend.kreuz": "Zentrum + 4 Nachbarn (5 Gletscher)",
  "glacierlegend.linie": "volle Reihe (5) oder Spalte (8)",
  "glacierlegend.linie.wall": "volle Reihe (5) oder Spalte (8) · Eiswall",
  "glacierlegend.flaeche": "gefülltes 3×3 (9 Gletscher)",
  "glacierlegend.mark.a": "blaues",
  "glacierlegend.mark.compact": "= Karte in aktiver Formation",
  "glacierlegend.mark.pre": "Karten in einer aktiven Formation tragen ein blaues",
  "glacierlegend.mark.post": "· höchster Faktor je Typ zählt.",

  /* ---- Zinseszins-Readout (BuildSummary) ---- */
  "zins.capital": "Kapital:",
  "zins.rate": "· Zinssatz",
  "zins.payout": "Auszahlung bei Erfolg:",
  "zins.wins": "Siege dieser Durchlauf:",
  "zins.cleared": "· Hürde genommen",
  "zins.crash": "· sonst Crash",
  "zins.paid": "Bisher ausgezahlt:",

  /* ---- Karten-Detail (CardDetail) ---- */
  "carddetail.empty": "Karte antippen für Rolle & Modifikatoren …",
  "carddetail.origin": "Ursprung {base} (+{boost} Kartenwert)",
  "carddetail.roles": "Rollen:",
  "carddetail.none": "keine",
  "carddetail.formations": "Formationen:",
  "carddetail.member": " (Mitglied)",
  "carddetail.ion": "Ionisierung:",
  "carddetail.fieldCrit": "+{pct} % Feld-Crit",
  "carddetail.plant": "Pflanze:",
  "carddetail.plant.full": "Ausgewachsen",
  "carddetail.plant.ripe": "Grün (reif)",
  "carddetail.plant.seed": "Setzling",
  "carddetail.growth": "Wachstum {n}",
  "carddetail.cardValue": "Kartenwert {value} / {cap}",
  "carddetail.rootScore": "+{n} Wurzel-Score/Sieg",
  "carddetail.rootScore.tap": " (×2 Form.)",
  "carddetail.overflow": "Überlauf {n}",
  "carddetail.fire": "Feuer:",
  "carddetail.forged": "⚒ Geschmiedet +{n} Kartenwert",
  "carddetail.building": "🏗 Gebäude:",
  "carddetail.building.tier": " · Stufe {tier}",
  "carddetail.building.none": "keine direkte Wirkung an dieser Karte",

  /* ---- Brett-Raster (CardGrid) · Architekt-Panels (ArchPanels) ---- */
  "cardgrid.openBoundary": "⇕ Grenze offen",
  "cardgrid.arch.title": "🏗 {name} · +{boost} Wert",
  "cardgrid.glacier.title": "Teil einer aktiven Gletscher-Formation (2D)",
  "cardgrid.ripe.title": "Grün (reif) — zählt für den Farbblock",
  "arch.buildings": "Gebäude",
  "arch.buildingsN": "Gebäude ({n})",
  "archpanels.tapHint": "Antippen zeigt am Brett, wo es liegt — und umgekehrt.",
  "archpanels.roleLegend": "● Rolle — Ziel eines Perks/einer Familie an dieser Karte",

  /* Formations-Legende (ArchPanels): die Faktoren kommen als Platzhalter aus formations.js und werden je
     Sprache formatiert — hier steht KEINE Tuning-Zahl, sonst liefe die Legende beim Balancing weg. */
  "formlegend.wiederholung": "≥2 gleiche Werte nebeneinander (×{f2} / ×{f3} / ×{f4}, dann +{step} je weitere)",
  "formlegend.farbblock": "≥3 Karten gleicher Farbe (ab ×{base}, +{step} je weitere)",
  "formlegend.treppe": "≥3 streng steigende Werte, Schritt ≤{max} (ab ×{base}, +{step} je weitere)",
  "formlegend.wechsel": "≥3 im Zick-Zack, Nachbardifferenz ≥{diff} (ab ×{base}, +{step} je weitere)",
  "formlegend.anker": "eine einzelne Position zählt als Formation (Faktor je Quelle)",
  "formlegend.nachhall": "der Faktor einer endenden Formation wirkt auf die nächste Karte nach",
  "formlegend.formationskern": "dein gewählter Formationstyp bekommt einen Zusatzfaktor",
  "formlegend.grenzbonus": "eine Formation läuft über eine Segmentgrenze und zahlt zusätzlich ×{f}",
  "formlegend.overlap": "⧉ Überlappung — mehr Formationen = mehr Multiplikator: 2 ×{f2} · 3 ×{f3} · 4 ×{f4}",
  "formlegend.frame": "Rahmenfarbe = Anzahl Formationen",
  "formlegend.frame.hint": "mehr Rahmen = mehr Multi · gestrichelt = ohne Multiplikator",

  /* ---- Architekt (ArchitectScreen) ---- */
  "arch.eyebrow": "Architekt · Bauphase · Durchlauf {cycle}",
  "arch.title": "Der Architekt",
  "arch.boost": "Gebäude-Boost",
  "arch.boost.title": "Score-Boost durch die Gebäude: Struktur-Kombis (volle Zeile/Spalte/Diagonale) + Distrikt (gleiche Kategorie aneinander) + neu gegründete Formationen. Aktualisiert live beim Bauen/Verschieben.",
  "arch.plot": "Baufeld",
  "arch.plot.used": "{n} belegt · {pct}%",
  "arch.cycleScore": "Durchlauf-Score",
  "arch.scoreDiff": "{sign}{pct} %",
  "arch.pct": "+{pct} %",
  "arch.buffSuit": "🎨 Bufft Farbe",
  "arch.buffsSuit": "bufft Farbe {suit}",
  "arch.boostDelta": "Boost {arrow}{pct} %",
  "arch.boostDelta.title": "Änderung des Gebäude-Boosts an dieser Vorschau-Position",
  "arch.boostDelta.phaseTitle": "Änderung des Gebäude-Boosts seit Beginn dieser Bauphase",
  "arch.combos": "Kombis",
  "arch.combos.title": "Gebäude mit Struktur-/Distrikt-Bonus glühen in ihrer Typ-Farbe",
  "arch.forms": "Formationen",
  "arch.forms.title": "Formationsrahmen (Ring + Label) am Brett ein-/ausblenden",
  "arch.legendary": "legendär",
  "arch.legendaryCap": "Legendär",
  "arch.tier": "Stufe {tier}",
  "arch.tierWord": "Stufe",
  "arch.tierArrow": "Stufe {from} → {to}",
  "arch.legend.frame": "Rahmen = Typ:",
  "arch.legend.tier": "Stufe (Ecke):",
  "arch.legend.ring": "Ring = aktive Formation (×mult)",
  // Zell-Tooltip am Bau-Brett, aus Bausteinen zusammengesetzt.
  "arch.cell.building": "{name} ({tier})",
  "arch.cell.preview": " · Vorschau",
  "arch.cell.upgrade": " → Stufe {tier}: {eff}",
  "arch.cell.formation": " · Formation ×{f}",
  "arch.cell.formationOnly": " — Formation ×{f}",
  "arch.cell.struct": " · Struktur ×{f}",
  "arch.cell.pos": "Pos {pos}",
  // #arch-eff: Die Effektzeile unter einem Gebäude (Kartendetail, Aufstellungsphase, Chronik, Endscreen,
  //   Level-up-Flügel). Wortlaut aus dem `building.eff.*`-Block und `arch.cell.struct` übernommen — dieselben
  //   Begriffe, damit derselbe Effekt nicht zweimal verschieden heißt.
  "arch.eff.value": "+{n} Stichwert",
  "arch.eff.score": "+{n} Score",
  "arch.eff.scoreMult": "×{f} Score",
  "arch.eff.streak": "+{n} Score je Serienpunkt",
  "arch.eff.crit": "+{n} Score bei Crit",
  "arch.eff.color": "+{n} Score bei {suit}",
  "arch.eff.milestone": "+{n} Score alle {every} Siege",
  "arch.eff.gamble": "+{crit} Score bei Crit, sonst −{penalty} Score",
  "arch.eff.relay": "+{n} Score (Staffel)",
  "arch.eff.struct": "Struktur ×{f}",
  "arch.firn.title": "Firn-Boden · Reserve {n} (füllt einen Gletscher hier zum Durchlauf-Beginn)",
  "arch.struct.head": "Struktur & Distrikt · ×Score je Durchlauf",
  "arch.struct.row": "volle Zeile ×{f}",
  "arch.struct.col": "volle Spalte ×{f}",
  "arch.struct.diag": "Diagonale ×{f}",
  "arch.struct.district": "Distrikt +{pct} %/Nachbar",
  "arch.struct.note": "Jede Karte auf einer vollständigen Zeile/Spalte/Diagonale macht bei einem Sieg entsprechend mehr Score. Faktoren stapeln multiplikativ.",
  "arch.struct.districtNote": "Distrikt: Gebäude gleicher Farbe (Kategorie) direkt aneinander geben je Nachbar +{pct} % Score auf ihre Felder (bis {cap} Nachbarn). Gleichartig zusammenbauen lohnt sich.",
  "arch.noRoom": "Kein Platz für „{name}“.",
  "arch.noRoom.mark": "Markiere ein Gebäude zum Abriss (am Brett oder unten) — bei einem großen Bauplan evtl. mehrere. Abgerissen wird erst nach Bestätigen.",
  "arch.noRoom.enough_one": "Abriss von {count} Gebäude schafft Platz. Bestätigen zum Bauen.",
  "arch.noRoom.enough_other": "Abriss von {count} Gebäuden schafft Platz. Bestätigen zum Bauen.",
  "arch.noRoom.more": "Abriss reicht noch nicht — markiere ein weiteres Gebäude.",
  "arch.noRoom.replace": "kein Platz → ersetzen",
  "arch.marked": "· markiert ✓",
  "arch.soloEnough": "· reicht allein",
  "arch.demolish": "Abreißen ✓",
  "arch.demolish.n": "Abreißen ({n}) ✓",
  "arch.demolish.warn": "Markierte Gebäude gehen beim Abriss verloren.",
  "arch.back": "← Zurück",
  "arch.choose.head": "Was baust du diese Phase?",
  "arch.noRotate": "⟳ nicht drehbar",
  "arch.noRotate.big": "⟳ Nicht drehbar",
  "arch.noRotate.title": "Diese Form lässt sich nicht drehen (belegt eine ganze Segment-Zeile bzw. ist symmetrisch).",
  "arch.upgrade": "Aufwerten",
  "arch.upgrade.big": "⬆ Aufwerten",
  "arch.upgrade.sub": "ein Gebäude +1 Stufe",
  "arch.upgrade.none": " · nichts aufwertbar",
  "arch.upgrade.confirm": "⬆ Aufwerten bestätigen",
  "arch.upgrade.confirmHint": "Unten bestätigen, dann wird aufgewertet.",
  "arch.upgrade.help": "wähle unten ein Gebäude (oder tippe es am Brett an) — es wird gold markiert, du siehst aktuellen und nächsten Effekt und bestätigst unten. Nicht aufwertbare (Legendär/No-op-Effekt/max) sind ausgegraut.",
  "arch.upgrade.reason.inert": "keine Aufwertung, der Effekt hat keine Stufen",
  "arch.upgrade.reason.legendary": "Legendäre sind nicht aufwertbar",
  "arch.upgrade.reason.max": "bereits auf höchster Stufe",
  "arch.upgrade.reason.acted": "in dieser Bauphase ist die Hauptaktion (Bauen ODER Aufwerten) schon verbraucht",
  "arch.upgrade.reason.generic": "nicht aufwertbar",
  "arch.upgraded": "aufgewertet:",
  "arch.reroll": "🎲 Baupläne neu würfeln · {n} übrig",
  "arch.now": "Jetzt:",
  "arch.after": "Danach:",
  "arch.place.head": "Platzieren & Verschieben",
  "arch.place.help": "zieh Gebäude am Brett an ihren Platz (Griff überall, ⟳ Drehen oben) — beliebig oft. Unten Bestätigen startet den Durchlauf.",
  "arch.rotate": "⟳ Drehen",
  "arch.rotate.noRoom": "Kein Platz zum Drehen — zieh das Gebäude erst an eine freiere Stelle.",
  "arch.undo": "↶ Rückgängig",
  "arch.reset": "Zurücksetzen",
  "arch.otherPlan": "← Anderer Bauplan",
  "arch.rearrange": "↔ Gebäude umstellen",
  "arch.buildNothing": "Nichts bauen · Fortfahren →",
  "arch.cancel": "Abbrechen",
  "arch.confirmStart": "✓ Bestätigen · Durchlauf starten",
  "arch.yourBuildings": "Deine Gebäude ({n})",
  "arch.preview.head": "Vorschau & Brett-Status",
  "arch.preview.ok": "Vorschau",
  "arch.preview.bad": "passt hier nicht",
  "arch.sumValue": "Σ Wert",
  "arch.stat.struct": "Struktur-Bonus",
  "arch.stat.sumValue": "Σ Kartenwert",
  "arch.stat.plotUsed": "Baufeld belegt",
  "arch.stat.rows": "Häuserzeilen",
  "arch.buildingCount": "{n} Gebäude",
  "arch.collapse.more": "▸ mehr",
  "arch.collapse.less": "▾ weniger",
  "arch.planFallback": "Bauplan",
  "arch.buildingFallback": "Gebäude",
  "arch.dev.catalog": "Voll-Katalog (Dev): Kategorie → Familie → Stufe. Ein Bau pro Phase (danach Verschieben/Bestätigen).",

  /* ---- Statistiken (StatsScreen) ---- */
  "stats.title": "Statistiken",
  /* #desktop: Auskunftszeile im Kopf der Statistik (erst ab 1280 px, neben dem Titel). */
  "stats.desk.readout": "Alle Zahlen liegen lokal auf diesem Gerät. Eine Zeile anklicken öffnet den vollständigen Lauf.",
  "stats.empty": "Noch keine Läufe — spiel einen Run, dann erscheinen hier deine Statistiken.",
  "stats.overview": "Übersicht",
  "stats.bestScore": "Bestscore",
  "stats.avgScore": "Ø-Score",
  "stats.playtime": "Spielzeit",
  "stats.games": "Spiele",
  "stats.bestStreak": "Beste Serie",
  "stats.trend": "Score-Verlauf · letzte {n} Läufe",
  "stats.bestBuild": "Bestes Build",
  "stats.bestBuild.hint": "Rekord-Lauf · Details ansehen ›",
  "stats.showDetails": "Details anzeigen",
  "stats.seed": "Seed {code}",
  "stats.coarseOrigin": "Älterer Lauf — grobes Herkunft-Modell (Formation / Crit / Gebäude / Sonstige). Neue Läufe zeigen die feine Fraktions-Aufschlüsselung.",
  "stats.yourRuns": "Deine Läufe",
  "stats.yourRuns.hint": "letzte {n}",
  "stats.record": "Rekord",
  "stats.mostPicked": "Am häufigsten",
  "stats.mostPicked.hint": "über deine Historie",
  "stats.topSkills": "Meistgewählte Skills",
  "stats.noSkills": "Noch keine Skills gespielt.",
  "stats.topPerks": "Meistgewählte Perks",
  "stats.archUse": "Archetyp-Nutzung",
  "stats.archUse.right": "{n}× · Ø {avg}",
  "stats.whatWorks": "Was am besten läuft",
  "stats.whatWorks.hint": "ab {n} Läufen",
  "stats.tooFew": "Zu wenige Läufe für belastbare Aussagen ({have}/{need}). Spiel noch ein paar Runs.",
  "stats.bestArch": "Bester Archetyp",
  "stats.bestArch.detail": " — Ø {avg} über {n} Läufe",
  "stats.skillLift": "Größter Skill-Lift",
  "stats.perkLift": "Größter Perk-Lift",
  "stats.lift.value": "+{v} Ø",
  "stats.played": " · {n}× gespielt",
  "stats.noPatterns": "Noch keine klaren Muster — deine Wahl variiert (noch) zu stark für belastbare Lift-Aussagen.",

  /* ---- Lauf-Kennzahlen (RunStats) ---- */
  "runstats.winrate": "Winrate",
  "runstats.winrate.title": "Anteil gewonnener Stiche",
  "runstats.bestStreak": "Beste Serie",
  "runstats.bestStreak.title": "Längste Siegesserie",
  "runstats.bestTrick": "Bester Stich",
  "runstats.bestTrick.title": "Höchster Score aus einem Stich",
  "runstats.critRate": "Crit-Quote",
  "runstats.critRate.title": "Anteil Stiche mit kritischem Treffer",
  "runstats.bestGlacier": "Bester Gletscherstich",
  "runstats.formations": "Formationen",
  "runstats.formations.title": "Maximal gleichzeitig aktive Formationen",
  "runstats.formScore": "Form.-Score",
  "runstats.formScore.title": "Score-Anteil aus Formations-Multiplikatoren",
  "runstats.buildScore": "Geb.-Score",
  "runstats.buildScore.title": "Score-Anteil aus Architekt-Gebäuden",
  "runstats.critBonus": "Crit-Bonus",
  "runstats.critBonus.title": "Score-Anteil aus kritischen Treffern",
  "runstats.showDesc": "Beschreibung anzeigen",
  /* #rd-verlauf: Kopf-Kennzahlen der Lauf-Details — der Rahmen des Laufs, nicht sein Ergebnis. */
  "runstats.cycles": "Durchläufe",
  "runstats.wins": "Siege",
  "runstats.duration": "Dauer",
  "runstats.avgTricks": "Ø Stiche",
  "runstats.avgTricks.title": "Durchschnittliche Stiche je Durchlauf",
  "runstats.perks": "Perks — {n}",
  "runstats.skills": "Skills",
  "runstats.tree": "Upgrade-Baum",
  "runstats.tree.nodes": "{done} / {total} Knoten",
  "runstats.tree.note": "Der Baum wirkt dauerhaft in jedem Lauf außerhalb der Rangliste — zwei Scores lassen sich erst vergleichen, wenn man weiß, wie viel Meta-Fortschritt dahinterstand.",
  "runstats.hidden": "Perks und Aufstellung bleiben bei fremden Läufen verdeckt: Die sechs Skills zeigen den Stil eines Laufs, nachbauen ließe er sich erst über die Perks.",

  /* ---- Score-Herkunft & Verlauf (RunGraphs) ---- */
  "graphs.src.formation": "Formation",
  "graphs.src.crit": "Crit",
  "graphs.src.building": "Gebäude",
  "graphs.src.serie": "Serie",
  "graphs.src.rest": "Sonstige",
  "graphs.src.glacier": "Gletscher-Ertrag",
  "graphs.src.plant": "Wurzel + Blüte",
  "graphs.src.light": "Blitz-Ertrag",
  "graphs.src.fire": "Feuer-Score",
  "graphs.perTrick.open": "Stich-Score je Durchlauf ansehen",
  "graphs.win": "Sieg",
  "graphs.noWin": "kein Sieg",
  "graphs.trick.title": "Stich {n}: {score} · {result}",
  "graphs.scaleHint": "Höhe = Score je Stich (je Durchlauf eigene Skala)",
  "graphs.cycleAbbr": "D{n}",
  "graphs.cycle.title": "Durchlauf {n}: {score}",
  "sparkline.empty": "Verlauf erscheint nach den ersten Stichen…",
  "sparkline.axis.x": "Stiche",
  "sparkline.axis.y": "Score",

  /* ---- Chronik (ChronikOverview) ---- */
  "chronik.eyebrow": "Chronik",
  "chronik.title": "Kartenübersicht",
  "chronik.anchors": "Anker",
  "chronik.anchor.row": "⚓ Pos {pos} · {type}",
  "chronik.formations": "Aktuelle Formationen",
  "chronik.noFormations": "Keine aktiven Formationen mit Multiplikator.",
  "chronik.archPhase": "🏗 Architektenphase",
  "chronik.archCount": "{n} Gebäude · {used}/{max} Zellen",
  // Anker-Typen (früher doppelt als ANCHOR_LABEL in CardGrid + Chronik).
  "anchor.power.label": "Kraft",
  "anchor.score.label": "Score",
  "anchor.crit.label": "Crit",
  "anchor.streak.label": "Serie",
  "anchor.formation.label": "Formation",
  "anchor.joker.label": "Joker",
  "cardgrid.anchor.title": "⚓ Anker · {type}",

  /* ---- Seed-Chip (SeedChip) ---- */
  "seed.copy": "Seed kopieren",
  "seed.copied": "kopiert",
  "seed.replay": "↻ Nachspielen",
  "seed.replay.title": "Diesen Seed nachspielen",

  /* ---- Bestenliste (LeaderboardScreen · GlobalLeaderboard) ---- */
  "board.title": "Bestenliste",
  "board.tab.global": "Global",
  "board.tab.week": "Diese Woche",
  "board.tab.weekShort": "Woche",
  "board.tab.challenger": "Challenger",
  "board.tab.rules": "Regeln",
  /* #desktop: Zweitzeilen der Navigationsspalte im Ranglisten-Screen (ab 1280 px; darunter sind es Reiter). */
  "board.nav.global.sub": "Allzeit · alle Läufe",
  "board.nav.champions.sub": "Platz 1 jeder abgelaufenen Woche",
  "board.nav.rules.sub": "Baseline und alle Modifikatoren",
  "board.rules.intro": "Alle spielen wöchentlich denselben Seed unter fairer Baseline — der Upgrade-Baum hat keine Wirkung ({rerolls} Rerolls je Phase, alle Raritäten, Legendär-Phase in Durchlauf {legCycle}). Jede Woche verändern 3–5 zufällige Modifikatoren (≥2 positiv, ≥1 negativ) den Lauf — für alle identisch. Nur abgeschlossene Läufe zählen; am Wochenende wandert Platz 1 ins Challenger-Archiv, das Board startet neu.",
  "board.rules.pos": "Positive Modifikatoren",
  "board.rules.neg": "Negative Modifikatoren",
  "board.rules.pairs": "Ausschluss-Paare (nie zusammen)",
  "board.countdown": "{d}t {h}h {m}m {s}s",
  "board.resetIn": "Reset in {time}",
  "board.col.rank": "Rang",
  "board.col.pilot": "Pilot",
  "board.col.score": "Punkte",
  "board.ctx.seed.t": "Gleicher Seed",
  "board.ctx.seed.s": "Alle spielen dieselbe Kartenfolge.",
  "board.ctx.base.t": "Faire Baseline",
  "board.ctx.base.s": "Der Upgrade-Baum hat keine Wirkung.",
  "board.ctx.arch.t": "Platz 1 wandert",
  "board.ctx.arch.s": "Am Wochenende ins Challenger-Archiv.",
  "board.weekSeed": "Seed der Woche",
  "board.weekLabel": "Woche {week} · {year}",
  "board.play": "▶ Spielen",
  /* #370 Freischalt-Bedingung — WORTGENAU an progression.rankedUnlocked + storage.recordRun:
       · alle Deck-Freischalt-Knoten gekauft,
       · und für jeden der vier RANKED_ARCHETYPES ein Lauf mit `completed === true`.
     Zwei Dinge, die die alte Kurzfassung („je ≥1 Lauf beendet") falsch nahelegte: Es braucht KEINEN
     Mono-Lauf je Archetyp — gezählt wird jeder Archetyp, von dem man mindestens EINEN Skill hält
     (App.jsx `archetypesUsed`), alle vier können also in einem einzigen Lauf zusammenkommen. Und
     „beendet" heißt bis zum letzten Durchlauf gespielt (`state.cycle >= totalCycles`); ein Abbruch
     zählt nicht. */
  "board.locked": "🔒 Frei, sobald alle Decks freigeschaltet sind und jeder der vier Archetypen einmal in einem bis zum Ende gespielten Lauf dabei war — ein Skill daraus genügt, und mehrere Archetypen zählen im selben Lauf. Abgebrochene Läufe zählen nicht.",
  "board.weekMods": "Modifikatoren dieser Woche",
  "board.unavailable": "Bestenliste ist nicht verfügbar.",
  "board.loading": "Lädt Bestenliste …",
  "board.empty": "Noch keine Einträge — mach den Anfang.",
  "board.champions.unavailable": "Champions sind nicht verfügbar.",
  "board.champions.intro": "Platz 1 jeder abgelaufenen Wochen-Rangliste landet hier — eine Person pro Woche.",
  "board.champions.loading": "Lädt Champions …",
  "board.champions.empty": "Noch keine Wochensieger — die erste Wochen-Rangliste muss erst abgeschlossen sein.",
  "board.global.head": "Allzeit · Top {n}",
  "board.global.sub": "alle Läufe",
  "board.global.empty": "Noch kein Lauf im Global-Board — mach den Anfang.",
  "board.row.cycle": "Durchlauf {n}",
  "board.tree.title": "{done} von {total} Knoten im Upgrade-Baum freigeschaltet",
  "board.tree.none.title": "Für diesen Lauf ist kein Baumstand gespeichert",
  "board.week.viewOnly": "Die Platzierung dieser Woche. Gespielt wird über den Ranglisten-Knopf im Menü.",
  "weekmods.title": "Wochen-Modifikatoren",
  "weekmods.range": " ({from}–{to})",

  /* ---- Lauf abbrechen / neustarten (App) ---- */
  "app.abort.title": "Lauf pausieren oder beenden?",
  "app.abort.help": "Beenden & speichern merkt sich den Lauf — du kannst ihn später im Menü fortsetzen. Beenden wertet ihn und zeigt den Endscreen.",
  "app.abort.save": "Beenden & speichern",
  "app.keepPlaying": "Weiterspielen",
  "app.end": "Beenden",
  // #run-dialoge: Auf dem Desktop trägt jede Option ihre Folge selbst (statt eines gemeinsamen Absatzes).
  "app.abort.save.sub": "Der Lauf wird gemerkt — du setzt ihn später im Menü fort.",
  "app.abort.end.sub": "Der Lauf wird gewertet und der Endscreen erscheint.",
  "app.keepPlaying.sub": "Zurück ins Spiel, nichts passiert.",
  "app.restart.title": "Wirklich neustarten?",
  "app.restart": "Neustarten",
  "app.restart.help": "Der aktuelle Lauf wird verworfen und ein neuer beginnt sofort. Das lässt sich nicht rückgängig machen.",

  /* ---- Steuerleiste (Controls) ---- */
  "controls.options": "⚙ Optionen",
  "controls.options.aria": "Optionen",
  "controls.restart": "Neustart",
  "controls.quit": "Beenden",

  /* ---- Glossar (Glossary) ---- */
  "glossary.title": "Glossar",
  "glossary.subtitle": "Begriffe & Sonderregeln — keine einzelnen Perks/Skills",
  "glossary.open": "Glossar öffnen",
  "glossary.search": "Suchen … z. B. Nachhall, Schichten, Hitze",
  "glossary.clear": "Suche löschen",
  "glossary.all": "Alle",
  "glossary.noHit.pre": "Kein Begriff zu",
  "glossary.noHit.post": "Andere Schreibweise probieren?",
  /* Desktop-Fassung (#glossar-desktop): die Kategorien stehen als Spalte statt als Chip-Leiste. */
  "glossary.nav.categories": "Kategorien",
  "glossary.nav.note": "Die Suche greift über alle Kategorien — die Zähler zeigen, wo die Treffer liegen.",
  "glossary.allTitle": "Alle Begriffe",
  "glossary.hits": "Treffer für „{q}“",
  "glossary.count_one": "{count} Begriff",
  "glossary.count_other": "{count} Begriffe",

  /* ---- Leitfaden (GuideOverlay) ---- */
  "guide.title": "Leitfaden",
  "guide.open": "Leitfaden öffnen",
  "guide.subtitle": "So spielst du jeden Archetyp — durchklicken",
  "guide.archOf": "Archetyp {n} von {total}",
  "guide.core": "Kernidee",
  "guide.loop": "Der Kreislauf",
  "guide.principles": "Spielprinzip",
  // #desktop: Überschrift und Fußnote der Archetyp-Spalte (ab 1280 px statt der Reiterzeile).
  "guide.nav.archetypes": "Archetypen",
  "guide.nav.note": "Der Leitfaden erklärt das Spielprinzip. Begriffe und Sonderregeln stehen im Glossar.",

  /* ---- Upgrade-Baum (UpgradeScreen) ---- */
  "upgrades.title": "Upgrades",
  "upgrades.respec": "↺ Zurücksetzen",
  "upgrades.nodes": " / {total} Knoten · Ranglisten-Lauf",
  "upgrades.ranked.free": "frei",
  "upgrades.ranked.at": "bei {total}/{total} Knoten",
  "upgrades.tapHint": "Knoten antippen zeigt, was er bewirkt.",
  "upgrades.details": "Details ›",
  "upgrades.legPhase": "Legendär-Phase",
  "upgrades.tab.decks": "Decks",
  "upgrades.tab.gen": "Allgemein",
  "upgrades.lane.cover": "Baufeld",
  "upgrades.lane.energy": "Energie",
  "upgrades.lane.rerolls": "Rerolls",
  "upgrades.lane.rarity": "Rarität",
  "upgrades.lane.drops": "Drop-Raten",
  "upgrades.lane.perk2": "2. Perk-Phase",
  "upgrades.lane.note.afterLeg": "öffnet sich nach dem Legendär-Unlock",
  "upgrades.free": "frei",
  "upgrades.state.soon": "Bald",
  "upgrades.state.owned": "✓ Gekauft",
  "upgrades.state.soonFull": "Bald verfügbar",
  "upgrades.state.buyable": "Kaufbar",
  "upgrades.state.lockSp": "Zu wenig SP — kostet {cost} SP",
  "upgrades.state.after": "Erst nach: {name}",
  "upgrades.state.needPrereq": "Vorgänger nötig",
  "upgrades.state.lockGate": "Braucht eine freigeschaltete Legendär-Stufe",
  "upgrades.state.locked": "Noch gesperrt",
  "upgrades.buy": "Kaufen · {cost} SP",
  // #desktop — senkrechte Baum-Fassung ab 1280 px: kurze Preismarke am Knoten + Auswirkungs-Kasten.
  "upgrades.buy.short": "{cost} SP",
  "upgrades.impact.title": "Was der Baum gerade bewirkt",
  "upgrades.impact.cover": "Baufeld",
  "upgrades.impact.energy": "Formations-Energie",
  "upgrades.impact.rerolls": "Rerolls je Angebot",
  "upgrades.impact.legRerolls": "Legendär-Rerolls",
  "upgrades.impact.of": "von {max}",
  "upgrades.impact.maxed": "Maximiert",
  "upgrades.impact.dropNow": "Perk-Qualität jetzt",
  "upgrades.page.general": "Allgemein",
  "upgrades.page.generalHint": "Gilt für jeden Lauf, unabhängig vom Deck.",
  "upgrades.nav.decks": "Decks",
  // Kachel am Anfang der Kette bei Feuer/Blitz — deren Deck ist von Beginn an spielbar.
  "upgrades.deckLead": "Deck",
  "upgrades.skills.title": "Skills dieser Fraktion",
  "upgrades.skills.legendary": "Legendäre Skills",
  "upgrades.owned": "gekauft",
  "upgrades.buyable": "kaufbar",
  "upgrades.locked": "🔒 gesperrt ·",
  "upgrades.soon": "Bald = Platzhalter",

  /* ---- Deck-Detail (DeckDetail) ---- */
  "deckdetail.back": "‹ Zurück",
  "deckdetail.back.title": "Zurück",
  "deckdetail.deck": "Deck",
  "deckdetail.tab.skills": "Skills",
  "deckdetail.tab.challenges": "Herausforderungen",
  "deckdetail.legendaries": "Legendäre",
  "deckdetail.noUnlocks": "Keine deck-gebundenen Freischaltungen.",
  "deckdetail.consumer": "Konsument",
  "deckdetail.trimmable": "trimmbar",
  "deckdetail.needs": "braucht {name}",

  /* ---- Deck-Werkstatt (CustomizeScreen) ---- */
  "shop.unlock": "🔒 Freischalten: {cond}",
  "shop.title": "Deck-Werkstatt",

  /* ---- Score-Meilenstein-Balken (ScoreMilestoneBar) ---- */
  "milestone.mio": "{n} Mio",
  "milestone.label": "💠 Meilensteine {n}/{total}",
  "milestone.label.sp": "💠 Meilensteine {n}/{total} · +{sp} SP",
  "milestone.max": "Maximum · +{sp} SP",
  "milestone.next": "→ {at} +{sp}",
  "milestone.title.max": "Alle Score-Meilensteine erreicht",
  "milestone.title.next": "Nächster Meilenstein: {at} (+{sp} SP)",
  /* ===================== TUTORIAL (geführter Lauf) =====================
     Ablauf und Anker stehen in src/ui/tutorial/tutorialScript.js, die Sprache hier. Alle Zahlen sind
     Platzhalter und kommen aus constants.js — ein abgetipptes „50 Durchläufe" wäre beim nächsten
     Balancing falsch. Tonfall nach docs/text-style-guide.md: zweite Person, Präsens,
     Bedingung → Wirkung; höchstens drei Sätze je Pop-up, genau einer je Coach-Mark. */
  // Hub-Einstiege: ruhiger Chip (immer) + lautes Erstkontakt-Angebot (nur vor dem ersten beendeten Lauf).
  "start.tutorial": "Tutorial",
  "start.tutorial.offer": "Tutorial starten",
  "start.tutorial.offer.sub": "Ein geführter Lauf erklärt dir alles Schritt für Schritt",

  "tutorial.eyebrow": "Tutorial",
  "tutorial.aria.dialog": "Tutorial-Hinweis",
  "tutorial.btn.next": "Verstanden",
  "tutorial.btn.finish": "Weiterspielen",
  "tutorial.btn.skipStep": "Überspringen",

  "tutorial.intro.title": "Willkommen bei Autostich",
  "tutorial.intro.body": "Autostich ist ein Autobattler: Dein Deck spielt die Stiche von selbst, du triffst die Entscheidungen dazwischen.\n\nEin Lauf hat {cycles} Durchläufe. Jeder Durchlauf ist erst eine Entscheidung — ein Skill, ein Perk, deine Aufstellung oder ein Gebäude — und danach {cards} Stiche gegen ein Gegnerdeck. Dein Ziel ist ein möglichst hoher Score; verlieren kannst du nicht.\n\nDieser geführte Lauf erklärt dir jede Phase einmal, sobald sie zum ersten Mal auftaucht.",

  "tutorial.play.title": "Das Stichspiel",
  "tutorial.play.body": "Beide Decks decken ihre {cards} Karten Stich für Stich auf. Die höhere Karte gewinnt, bei Gleichstand bekommt niemand Punkte.\n\nEin gewonnener Stich bringt {win} Basispunkte. Darauf legen sich Faktoren: deine Siegesserie, Crits, Formationen und deine Gebäude — deshalb wächst dein Score gegen Ende eines Laufs so steil.\n\nBeispiel: Bei Serie {exStreak} steht dein Serien-Faktor auf ×{exStreakMult} — aus {win} Basispunkten werden {exTotal}. Formationen, Crits und Gebäude multiplizieren darauf weiter.",
  "tutorial.play.mark.board": "Hier laufen die Stiche: links deine Karte, rechts die des Gegners. Am Brett siehst du auch das Ergebnis und die Faktoren, die auf den Stich gewirkt haben.",
  "tutorial.play.mark.status": "Die Leiste zeigt Score, Serie und Durchlauf; darüber hältst du den Lauf an oder änderst das Tempo. Das Karten-Symbol öffnet die Chronik — die Übersicht all deiner Karten, Formationen und Gebäude im laufenden Lauf.",
  "tutorial.play.mark.bars": "Sobald ein Archetyp aktiv ist, erscheint hier seine Ressourcenleiste: Ladung bei Blitz, Hitze bei Feuer, Masse bei Eis, Wachstum bei Pflanze. Sie füllt sich während der Stiche und treibt die Effekte deiner Skills an.",
  "tutorial.play.mark.milestone": "Der Meilensteinbalken zeigt, wie weit dein Score bis zur nächsten Stufe ist — jede erreichte Stufe bringt dir Stichpunkte für den Upgrade-Baum.",
  "tutorial.play.mark.rail": "Die Seitenpanels verraten, woher dein Score kommt und was dein Build gerade kann.",

  "tutorial.skill.title": "Skills wählen",
  "tutorial.skill.body": "Vier Archetypen treten an: Blitz, Feuer, Eis und Pflanze. Zu Beginn spielst du Blitz und Feuer; Eis und Pflanze schaltest du im Hauptmenü unter Upgrades frei.\n\nDein erster Skill eines Archetyps macht ihn aktiv und blendet seine Ressourcenleiste ein. Mehr als {slots} Skills hältst du nicht gleichzeitig.",
  "tutorial.skill.mark.offer": "Das Angebot ist nach Archetyp gruppiert — ein Verstärker wirkt erst mit dem Skill, den er verlangt. Das kleine i am Archetyp öffnet seinen Leitfaden.",
  "tutorial.skill.mark.slots": "Hier steht, wie viele deiner {slots} Slots schon belegt sind. Sind alle voll, geht die nächste Wahl nur noch als Tausch — du bestimmst dann, welcher Skill weichen soll.",

  "tutorial.perk.title": "Perks wählen",
  "tutorial.perk.body": "Drei Perks stehen zur Wahl, jeder aus einer Kategorie und mit eigener Rarität. Ein Perk wirkt für den Rest des Laufs. Passt keiner, lehnst du ab — das kostet dich nichts.",
  "tutorial.perk.mark.offer": "Der Farbchip nennt die Kategorie, der Rand die Rarität.",
  "tutorial.perk.mark.build": "Dein Build wächst mit jeder Wahl — hier siehst du, was schon zusammenspielt.",

  "tutorial.formation.title": "Aufstellungsphase",
  "tutorial.formation.body": "Hier legst du die Ziehreihenfolge deiner {cards} Karten neu. Jeder Tausch kostet Formations-Energie, und du hast {energy} je Aufstellungsphase. Karten, die ein Muster bilden, ergeben eine Formation und vervielfachen deinen Score.",
  "tutorial.formation.mark.board": "Das ist deine Ziehreihenfolge: {cards} Positionen in {segments} Segmenten zu je {segment} Karten. Tippe zwei Karten an, um sie zu tauschen. Wichtig: Eine Formation zählt nur innerhalb eines Segments — über eine Segmentgrenze hinweg entsteht keine.",
  "tutorial.formation.mark.energy": "Die Energieanzeige sagt dir, wie viele Tausche dir noch bleiben.",
  "tutorial.formation.mark.legend": "Es gibt {formTypeCount} Formationsarten: {formTypes}. Jede beteiligte Karte trägt unten rechts das Kürzel ihrer Formation und einen farbigen Rahmen, darüber ihren Faktor; links am Segment steht, wie stark das ganze Segment gerade ist.",

  "tutorial.architect.title": "Der Architekt",
  "tutorial.architect.body": "Du legst Gebäude als Polyomino-Formen auf dein Baufeld. Ein Gebäude wirkt, solange es liegt; volle Zeilen, Spalten und Diagonalen geben zusätzlich einen Faktor. Aufwerten, versetzen und abreißen darfst du jederzeit.",
  "tutorial.architect.mark.board": "Jede Zelle des Baufelds gehört zu einer Position deiner Ziehreihenfolge. Wichtig: Ein Gebäude zahlt seinen Score-Bonus nur, wenn die Karte darunter ihren Stich auch gewinnt — Wert-Gebäude heben stattdessen den Kartenwert und helfen so, ihn zu gewinnen.",
  "tutorial.architect.mark.offers": "Baupläne kommen in drei Kategorien: Wert hebt den Kartenwert, Score zahlt Punkte, Formation biegt deine Formationen. Jeder Bauplan ist eine Polyomino-Form — vor dem Setzen darfst du sie drehen.",
  "tutorial.architect.mark.done": "Volle Zeilen, Spalten und Diagonalen schließen eine Struktur und legen einen Faktor auf alle Positionen darin; gleichartige Gebäude nebeneinander bilden zusätzlich einen Distrikt. Bist du zufrieden, schließt du die Bauphase ab und der nächste Durchlauf beginnt.",

  "tutorial.glacier.title": "Gletscher-Wahl",
  "tutorial.glacier.body": "Nach jedem Eis-Skill wählst du genau eine Karte für den Gletscher — dieser Schritt ist Pflicht.",

  "tutorial.target.title": "Ziel-Auswahl",
  "tutorial.target.body": "Manche Perks brauchen Karten: tippe so viele an, wie der Perk verlangt.",

  "tutorial.familyTarget.title": "Familien-Ziel",
  "tutorial.familyTarget.body": "Diese Perk-Familie braucht ein Ziel — wähle die Farbe, Karte oder Formationsart, auf die sie wirken soll.",

  "tutorial.legendary.title": "Legendär-Phase",
  "tutorial.legendary.body": "In Durchlauf {cycle} wählst du einen legendären Skill aus deinen aktiven Archetypen. Er belegt einen eigenen Slot und lässt sich später nicht tauschen.",

  "tutorial.outro.title": "Du hast alles gesehen",
  "tutorial.outro.body": "Ab hier läuft der Lauf ganz normal weiter und zählt für Statistik und Bestenliste.\n\nAm Ende bringt er dir zwei Währungen: Stichpunkte (SP) für den Upgrade-Baum, der jeden künftigen Lauf stärker starten lässt und dir Eis und Pflanze freischaltet, und Deckpunkte (DP) für die Deck-Werkstatt, in der du das Aussehen deines Decks umgestaltest — Kartenbilder, Spielfeld und Effekte.\n\nDas ⓘ oben rechts öffnet jederzeit das Glossar mit allen Begriffen; wie ein Archetyp gespielt wird, steht im Leitfaden.",

  // #tiered Stufen-Decks (I/II/III): {roman} ist die römische Stufenziffer — sie bleibt in beiden Sprachen gleich.
  "shop.tier.active": "Stufe {roman} aktiv ✓",
  "shop.tier.activate": "Stufe {roman} aktivieren",
  /* Auskunft in der Kopfzeile (erst ab 1280 px, wo Platz dafür ist) — dasselbe Muster wie im
     Upgrade-Baum: eine Zeile Bestand, eine Zeile, was ein Antippen bewirkt. */
  "shop.head.packs": "{n} Packs · {own} freigeschaltet",
  "shop.head.challenges": "{n} Herausforderungen · {own} freigeschaltet",
  "shop.head.hint": "Karte antippen zeigt Rücken, Front und Spielfeld.",
  // Untertitel der Pack-Kachel.
  "shop.tile.dblEquip": "Doppelklick rüstet direkt aus",
  "shop.tile.sub.active": "aktiv",
  "shop.tile.sub.details": "tippen → Details",
  "shop.tile.sub.detailsTier": "Stufe {roman} · tippen → Details",
  /* Ab 1280 px steht die Vorschau dauerhaft daneben — „tippen → Details" führt dort zu etwas, das
     bereits im Bild ist. Die Zeile sagt stattdessen den Zustand. */
  "shop.tile.sub.owned": "freigeschaltet",
  "shop.tile.sub.ownedTier": "Stufe {roman} · freigeschaltet",
  "shop.tile.sub.buyable": "kaufbar",
  // #393 Zufalls-Deck je Lauf (Packs-Reiter).
  "shop.randomDeck.title": "Zufalls-Deck je Lauf",
  "shop.randomDeck.desc": "Jeder Lauf startet mit einem zufälligen deiner Decks; alle aktiven Effekte in Deckfarbe.",
  "shop.randomDeck.aria": "Zufalls-Deck je Lauf",
  "shop.noBattlefield": "Kein Battlefield",
  "shop.emptyView": "Nichts in dieser Ansicht.",
  "shop.hint.challenge": "Ein Herausforderungs-Deck wird nicht gekauft, sondern über eine Herausforderung freigeschaltet. Tippe es an → Vorschau + Freischalt-Bedingung; sobald erfüllt, aktivierst du es direkt.",
  "shop.hint.pack": "Ein Pack bündelt Karte (Front + Back) und Battlefield. Tippe ein Pack an → Detail-Ansicht mit Vorschau; Kaufen aktiviert das Pack direkt.",
  "shop.activeCheck": "Aktiv ✓",
  "shop.activate": "Aktivieren",
  "shop.activeChip": "AKTIV",
  "shop.tab.packs": "Packs",
  "shop.tab.challenges": "Herausforderungen",
  "shop.tab.fx": "Effekte",
  "shop.filter.all": "Alle",
  "shop.filter.owned": "Besitz",
  "shop.filter.buyable": "Kaufbar",
  "shop.filter.free": "Frei",
  "shop.filter.locked": "Gesperrt",
  /* #packsort: EIN Knopf neben den Filtern, Beschriftung = was der nächste Klick tut. Auf dem Reiter
     „Herausforderungen" heißt der Gegenpol „Standard" statt „Preis" — cond-Packs haben keinen Preis. */
  "shop.sort.color": "Farbe",
  "shop.sort.price": "Preis",
  "shop.sort.default": "Standard",
  "shop.sort.hint": "Reihenfolge der Kacheln umschalten",
  "shop.fx.hint": "Effekte sind global — einmal gekauft, für alle Packs. Kategorie oben wählen, Effekt tippen → er läuft in der Bühne; dort kaufen bzw. wählen / an-aus. Doppeltippen in der Liste schaltet direkt um.",
  "shop.standardFree": "Standard — immer aktiv, kein Kauf nötig",
  "shop.buy": "Kaufen · {price} DP",
  "shop.tooFewDp": " (zu wenig DP)",
  "shop.selected": "✓ Ausgewählt",
  "shop.chooseFinisher": "Als Finisher wählen",
  "shop.chooseBg": "Als Hintergrund wählen",
  "shop.chooseGott": "Als Prunk wählen",
  "shop.chooseGottStandard": "Als Standard wählen (kein Prunk)",
  "shop.chooseAnim": "Als Animation wählen",
  "shop.on.tapOff": "✓ An — tippen zum Ausschalten",
  "shop.turnOn": "Einschalten",
  "shop.bg.noneActive": "✓ Aktiv — kein Hintergrund",
  "shop.bg.none": "Kein Hintergrund",
  "shop.packSel.back": "Karte hinten",
  "shop.packSel.front": "Karte vorne",
  "shop.packSel.bg": "Hintergrund",
  "shop.anim.noneActive": "✓ Aktiv — keine Animation",
  "shop.anim.none": "Alle Animationen aus",
  "shop.color.standard": "Standard",
  "shop.color.deck": "Deckfarbe",
  "shop.cube.filled": "Gefüllt",
  "shop.cube.wire": "◇ Nur Rahmen",
  "shop.status.active": "aktiv",
  "shop.status.owned": "im Besitz",
  "shop.dblTap.on": "Doppeltippen: auswählen",
  "shop.dblTap.off": "Doppeltippen: abwählen",
  // Effekt-Reiter
  "fxgroup.karten.title": "Karten",
  "fxgroup.karten.hint": "Skill immer an · eine Animation",
  "fxgroup.stich.title": "Stich",
  "fxgroup.stich.hint": "nur einer aktiv",
  "fxgroup.hintergrund.title": "Hintergrund",
  "fxgroup.hintergrund.hint": "einer aktiv · Leuchten frei",
  "fxgroup.score.title": "Score",
  "fxgroup.score.hint": "nur einer aktiv",
  /* Synthetische Effekt-Kacheln — sie stehen NICHT in GLOBAL_FX (themes.js), sondern nur in der
     Werkstatt (Gratis-Standard, Aus-Zustände, Klinge & Co.). Deshalb hier von Hand statt erzeugt. */
  "fxsyn.standard.name": "Standard",
  "fxsyn.standard.desc": "Der schlichte Grund-Finisher (immer verfügbar, Standard-Auswahl): Die geschlagene Gegnerkarte fliegt nach dem Stich einfach zur Seite weg — genau wie deine eigene Karte bei einer Niederlage. Beim Sieg wird der Aufdeck-Sound leicht höher gestimmt. Kein Schnitt, kein Prunk.",
  "fxsyn.klinge.name": "Klinge",
  "fxsyn.klinge.desc": "Eine choreografierte Klinge zerteilt die Gegnerkarte. Grundzug ist ein Schnitt von links; je höher dein Siegesserie-Multiplikator, desto mehr Richtungen fahren nacheinander ein (ab ×1,25 links/rechts im Wechsel, ab ×1,5 zusätzlich von oben, ab ×2,0 alle vier inkl. Z-Schnitt) — und die Klinge schneidet härter. Eine Niederlage setzt die Serie zurück. In kühlem Stahlweiß oder in der Deckfarbe.",
  "fxsyn.scorch.name": "Laser",
  "fxsyn.scorch.desc": "Ein Laser schießt einmalig aus zufälliger Richtung in die Gegnerkarte — dann verglüht sie organisch: eine zerklüftete Brennkante frisst sich mit glühendem Rand über die Karte, während weiche Glut aufsteigt, Asche fällt und Funken sprühen. In Standard-Feuer oder in der Deckfarbe.",
  "fxsyn.hologridSlice.name": "Hologrid-Laser",
  "fxsyn.hologridSlice.desc": "Eine Laserlinie fährt achsen-parallel über die geschlagene Gegnerkarte und deckt dabei ein Nahtraster auf. Danach zerfällt die Karte in ein Kachelgitter: die Stücke fliegen mit Rotation weg und prallen vom Boden ab, während das Kartenbild früh verblasst, sodass nur noch der leuchtende Hologrid-Rahmen bleibt. In Standard-Cyan/Magenta oder in der Deckfarbe.",
  "fxsyn.blackhole.name": "Schwarzes Loch",
  "fxsyn.blackhole.desc": "Ein persistentes Schwarzes Loch mitten im Feld, das über deine Siegesserie wächst: Jeder Sieg zieht die geschlagene Gegnerkarte spiralförmig in den Ereignishorizont und speist die rotierende Akkretionsscheibe, eine Niederlage lässt das Loch schrumpfen. Ist es groß genug gewachsen und kollabiert, zerreißt eine Supernova das Feld. In Standard blau/pink oder in der Deckfarbe.",
  "fxsyn.gottStandard.name": "Standard",
  "fxsyn.gottStandard.desc": "Gottgleicher Sieg OHNE Prunk-Effekt — die Basis zum Vergleichen (Standard-Auswahl, kein Kauf).",
  "fxsyn.spezial.name": "Skill-Effekt",
  "fxsyn.spezial.desc": "Die vier Archetyp-Effekte (Feuer · Blitz · Eis · Pflanze) — immer aktiv. Wähle die Farbe: feste Neon-Standardfarbe oder die Farbe deines aktiven Decks.",
  "fxsyn.fieldNone.name": "Kein Effekt",
  "fxsyn.fieldNone.desc": "Kein Hintergrund-Effekt — nur das Battlefield-Bild (immer verfügbar). Leuchten kann zusätzlich aktiv bleiben.",
  "fxsyn.animNone.name": "Keine Animation",
  "fxsyn.animNone.desc": "Keine Karten-Animation — die Karten bleiben schlicht. Anwählen schaltet alle Karten-Animationen ab (immer verfügbar).",
  // Kurztexte der Effekt-Zeilen (die Langfassung steht in `fx.*.desc` bzw. `fxsyn.*.desc`).
  "fx.short.noAnim": "Alle Karten-Animationen aus.",
  "fx.short.noBg": "Kein Hintergrund-Effekt (Leuchten bleibt möglich).",
  "fx.short.spezial": "Feuer · Blitz · Eis · Pflanze — immer aktiv, nur Farbwahl (Standard/Deckfarbe).",
  "fx.short.standard": "Verliererkarte fliegt einfach zur Seite weg.",
  "fx.short.gottStandard": "Gottgleicher Sieg ohne Prunk-Effekt.",
  "fx.edgeglow.short": "Dauerhafter Neon-Rand in der Deckfarbe.",
  "fx.holo.short": "Prismatisches Lichtband, tilt-reaktiv.",
  "fx.glitch.short": "Cyberpunk-Glitch mit gelegentlichen Bursts.",
  "fx.aurora.short": "Weiche Schleier; je Stich ein Bloom-Puls.",
  "fx.neonsurf.short": "Plasma-See am unteren Rand — starke Ansagen drücken das Wasser mittig ein, es steigt an den Rändern hoch.",
  "fx.cubematrix.short": "Neon-Würfelfeld — reagiert auf die Musik.",
  "fx.starfield.short": "Sternschnuppe je Stich — größer mit dem Score.",
  "fx.klinge.short": "Klingenschnitt — skaliert mit der Siegesserie.",
  "fx.scorch.short": "Laser + organischer Burn; Tempo mit dem Turbo.",
  "fx.blackhole.short": "Schwarzes Loch saugt die Gegnerkarte ein.",
  "fx.sonnenPuls.short": "Outrun-Sonne — feuert beim gottgleichen Sieg.",
  "fx.laserFaecher.short": "Laser fächern auf — gottgleicher Sieg.",
  "fx.prismaKaskade.short": "Prismatische Schockwellen — gottgleicher Sieg.",
  "fx.holoCube.short": "Holowürfel zerspringt — gottgleicher Sieg.",
  "fx.supernova.short": "Kollaps → Detonation → Tunnel — gottgleicher Sieg.",

  /* ---- Musik · PWA · Perf · Ladeanzeige ---- */
  "music.title": "Musik",
  "music.next": "Nächster Track",
  "music.playing": "Läuft: {title} — nächster Track",
  "pwa.install": "Installieren",
  "pwa.title": "Als App zum Startbildschirm hinzufügen",
  "pwa.ios": "Über das Teilen-Symbol → „Zum Home-Bildschirm“.",
  "perf.report": "Report → Konsole + Zwischenablage",
  "perf.reset": "Messung zurücksetzen",
  "runloader.loading": "Lade Deck …",

  /* ---- Dev-Werkzeuge (nur im Dev-Modus sichtbar) ---- */
  "dev.legendary": "★ Legendär",
  "dev.run.title": "DEV RUN",
  "dev.run.sub": "Frei konfigurierbarer Testlauf — nur für Devs.",
  "dev.run.cycles": "Durchläufe",
  "dev.run.offerTypes": "Angebotstypen im Plan",
  "dev.run.distribute": "⇄ Gleichmäßig verteilen",
  "dev.run.plan": "Plan je Durchlauf",
  "dev.run.energy": "Formations-Energie",

  /* ---- Freischalt-Bedingungen (Kosmetik) ----
     Der Satz stand bis zur Übersetzung in cosmetics.js; `unlockProgress` liefert jetzt nur noch
     `kind` + `vars`, den Text setzt src/i18n/unlockText.js daraus zusammen. */
  "unlock.none": "Immer verfügbar",
  "unlock.games": "Spiele {n} Läufe",
  "unlock.streak": "Erreiche eine Serie von {n}",
  "unlock.score": "Erreiche Score {n}",
  "unlock.noRerollRun": "Schließe einen Lauf ab, ohne einen Reroll zu benutzen",
  "unlock.monoArchetypeRun": "Schließe {n} Läufe nur mit {archetype}-Skills ab",
  "unlock.allMonoArchetypes": "Schalte alle vier Element-Decks frei (je {n} Mono-Läufe)",
  "unlock.allArchetypesRun": "Schließe einen Lauf mit allen vier Elementen ab",
  "unlock.gottgleichRun": "Löse zum ersten Mal einen „Gottgleich“-Stich aus",
  "unlock.meisterNoReroll": "Schließe einen Ranglisten-Wochenlauf ohne einen einzigen Reroll ab",
  "unlock.championWeek": "Beende eine Wochen-Rangliste auf Platz 1 (Challenger-Archiv)",
  "unlock.championWeekN": "Beende {n} Wochen-Ranglisten auf Platz 1 (Challenger-Archiv)",
  "unlock.buy": "In der Deck-Werkstatt mit Deckpunkten (DP) kaufen",
  "unlock.onboardingDone": "Schließe das Onboarding ab",

  /* ---- Feedback-Melder (#396) ---- */
  "start.feedback": "Feedback",
  "start.discord": "Discord öffnen",
  "feedback.eyebrow": "Playtest",
  "feedback.title": "Feedback senden",
  /* #desktop: Auskunftszeile im Kopf (ab 1280 px) — sagt, wohin die Meldung geht und was mitgeht. */
  "feedback.desk.readout": "Geht direkt an die Entwicklung. Seed und Durchlauf des letzten Laufs hängen automatisch mit dran.",
  "feedback.kind": "Art",
  "feedback.kind.bug": "Bug",
  "feedback.kind.idea": "Idee",
  "feedback.kind.balance": "Balance",
  "feedback.kind.other": "Sonstiges",
  "feedback.message": "Was ist passiert?",
  "feedback.message.placeholder": "Je genauer, desto besser — was hast du gemacht, was ist passiert, was hättest du erwartet?",
  "feedback.name": "Name",
  "feedback.name.placeholder": "optional",
  "feedback.run.with": "Bezieht sich auf: Lauf Seed {seed}, Durchlauf {cycle}",
  "feedback.run.none": "Kein Lauf zum Anhängen gefunden",
  "feedback.run.hint": "Seed und Durchlauf gehen mit — ohne sie lässt sich ein Bug meist nicht nachstellen.",
  "feedback.send": "Absenden",
  "feedback.sending": "Wird gesendet …",
  "feedback.thanks": "Danke — ist angekommen.",
  "feedback.detailHint": "Je mehr Details, desto schneller können wir helfen.",
  "feedback.tooShort": "Noch mindestens {n} Zeichen.",
  "feedback.draftSent": "Dein zuletzt hängengebliebener Report ist jetzt rausgegangen.",
  "feedback.err.send": "Konnte nicht gesendet werden. Dein Text ist gespeichert (und in der Zwischenablage) und geht beim nächsten Öffnen automatisch raus.",
  "feedback.err.tooSoon": "Kurz warten — noch {s} Sekunden bis zum nächsten Report.",
  "feedback.err.dailyCap": "Für heute ist genug gemeldet. Morgen geht es weiter.",
  "feedback.err.offline": "Der Melder ist in diesem Build nicht konfiguriert — dein Text geht hier gerade nirgendwohin.",

  /* ---- Startbildschirm ---- */
  "start.logo.alt": "AUTOSTICH",

  // Ohne führendes Emoji: das Zeichen steht seit 18.08.2026 als eigenes Element im JSX (unter 1280 px
  // dasselbe Emoji, ab 1280 px ein Vektor im Textton). Im String ließe es sich nicht austauschen.
  "start.progress.onboarding": "Onboarding",
  "start.progress.bonus": "Bonus-{cur} · nächste +5",
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
  "start.normal": "Lauf beginnen",

  "start.seed.placeholder": "Seed einfügen",
  "start.seed.aria": "Seed einfügen und spielen",
  "start.seed.play": "↻ Spielen",
  "start.seed.error": "Kein gültiger Seed — prüf den Code und versuch es erneut.",
  "start.secret.unlock": "🔓 Alles freigeschaltet.",
  "start.secret.onboarding": "⏭️ Onboarding übersprungen · +10 SP · +50 DP",
  "start.secret.reset": "🔄 Profil wird zurückgesetzt …",

  "start.ranked": "Rangliste",
  "start.ranked.badge": "Woche {n}",
  "start.ranked.badge.aria": "Wochen-Herausforderung, Woche {n}",
  /* #370 Wochenbonus: die erste abgeschlossene Ranked-Runde je Woche zahlt ihn aus. Die Anzeige verschwindet,
     sobald er geholt ist — es gibt also nie „1/1" zu sehen, {have} steht immer auf 0. Der Platzhalter bleibt
     trotzdem, damit die Zeile nicht lügt, falls der Bonus später mehrfach vergeben wird. */
  "start.ranked.bonus": "Bonus {have}/{max}",
  "start.ranked.open": "Wochen-Rangliste öffnen",
  "start.ranked.locked": "Wochen-Rangliste ansehen — Spielen wird frei, sobald alle Decks freigeschaltet sind und jeder der vier Archetypen einmal in einem bis zum Ende gespielten Lauf dabei war (ein Skill daraus genügt)",

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

  /* #desktop — Status-Tafel des Startbildschirms. Sie erscheint erst ab 1280 px und zeigt, was der
     Spieler wissen will, BEVOR er startet: welches Deck aktiv ist, wie die Guthaben stehen, was die
     Woche noch hergibt und wie der letzte Lauf lief. Die Untertitel der beiden Währungs-Einträge stehen
     ebenfalls nur dort — auf dem Handy bleibt es beim reinen Titel plus Zahl. */
  "start.board.title": "Dein Stand",
  "start.board.field": "Spielfeld · {name}",
  "start.board.fx": "Effekte · {list}",
  "start.board.sp": "Stichpunkte",
  "start.board.sp.sub": "{done} / {total} Knoten",
  "start.board.dp": "Deck-Punkte",
  "start.board.dp.sub": "Werkstatt-Guthaben",
  "start.board.week": "Woche {n}",
  // Reine Zahlenzeile: die Kennzahl der Wochen-Kachel trägt nur noch das Verhältnis. Das Wort „Bonus"
  // stand vorher IN der großen Zahl und wiederholte, was die Unterzeile darunter ohnehin sagt.
  "start.board.week.val": "{have}/{max}",
  /* #bonus-benennen: Über „Bonus noch offen" steht jetzt, WAS es zu holen gibt. Zwei Fassungen, weil
     der Bonus zwei Gestalten hat: normal +SP und +DP, bei vollem Baum stattdessen der doppelte
     DP-Betrag (SP sind dort nutzlos, s. `recordRun`). Die Zahlen kommen aus storage.js.
     Eigene Zeile, weil beides zusammen gemessen nicht in die 118 px der Kachel passt. */
  "start.board.week.bonus": "+{sp} SP · +{dp} DP",
  "start.board.week.bonus.full": "+{dp} DP",
  "start.board.week.open": "Bonus noch offen",
  "start.board.week.done": "Bonus geholt",
  "start.board.last": "Letzter Lauf",
  "start.board.last.sub": "Durchlauf {cycle}",
  "start.board.last.none": "—",
  "start.board.last.none.sub": "noch kein Lauf",
  "start.tile.upgrades.sub": "Dauerhafte Verbesserungen",
  "start.tile.workshop.sub": "Decks, Spielfelder, Effekte",

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
  /* #174 Der Text nennt bewusst NICHT das getroffene Wort — sonst stünde die Beleidigung
     doch wieder auf dem Bildschirm, und die Meldung würde zur Rateanleitung. */
  "name.err.profanity": "Dieser Name enthält ein gesperrtes Wort. Bitte wähle einen anderen.",
  "name.err.length": "Höchstens {max} Zeichen.",

  /* ---- Optionen ---- */
  /* ---- Optionen: Sektionen (#395). Kopf = klebende Überschrift, Chip = kurze Sprungmarke. ---- */
  "options.sec.general": "Allgemein",
  "options.sec.graphics": "Grafik & Leistung",
  "options.sec.sound": "Ton",
  "options.sec.display": "Anzeige",
  "options.chip.general": "Allgemein",
  "options.chip.graphics": "Grafik",
  "options.chip.sound": "Ton",
  "options.chip.display": "Anzeige",
  "options.eyebrow": "Optionen",
  "options.title": "Einstellungen",
  /* #desktop: Auskunftszeile im Kopf — steht erst ab 1280 px neben dem Titel (dort, wo im Upgrade-Baum
     das Guthaben steht). Sie beantwortet die Frage, die ein Einstellungs-Screen ohne „Übernehmen"-Knopf
     zwangsläufig aufwirft. */
  "options.desk.readout": "Alles sofort wirksam und gespeichert.",

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

  // #394 Zahlengröße: {pct} kommt als fertig formatierter Prozentwert (fmtPct) — das Prozentzeichen sitzt
  // im Deutschen mit schmalem Abstand, im Englischen ohne, deshalb steht es NICHT in der Vorlage.
  "options.numScale.title": "Zahlengröße",
  "options.numScale.desc": "Größe der aufsteigenden Score-Zahlen. {pct}",
  "options.numScale.aria": "Zahlengröße",

  "options.rfx.title": "Effekte reduziert",
  "options.rfx.aus": "Aus",
  "options.rfx.mobile": "Mobile",
  "options.rfx.an": "An",
  "options.rfx.desc.aus": "Volle Effekte.",
  "options.rfx.desc.mobile": "Ausgewogen: Karten-Flip, Hintergrund, Glow & Finisher bleiben; Screen-Shake, Funken-Fontänen, Blur & Sweeps aus. Schont schwächere Geräte.",
  "options.rfx.desc.an": "Alle Effekte minimal — maximal ruhig, entlastet schwache Geräte stark.",

  "options.haptics.title": "Haptik (Vibration)",
  "options.haptics.desc": "Kurzes Vibrieren bei Bestätigungen. Nur auf Touch-Geräten (Handy) spürbar; System-Einstellung „reduzierte Bewegung“ wird respektiert.",
  "options.calm.title": "Ruhiger Modus",
  "options.calm.desc": "Die Musik steigert sich nicht mit dem Punktestand — es laufen nur ruhige und treibende Stücke, keine schnellen oder maximalen.",
  "options.telemetry.title": "Anonyme Spieldaten senden",
  /* #datenschutz: Der Text nannte bis 16.08.2026 nur Score/Perks/Skills/Fortschritt — gesendet wurde
     zusätzlich Gerätekontext (Browserkennung, Kerne, Speicher, Fenstergröße, Pixeldichte). Eine
     Beschreibung, die weniger aufzählt als der Code sendet, ist der eigentliche Fehler. Details stehen
     im verlinkten Hinweis (PrivacyModal), hier nur die ehrliche Kurzfassung. */
  "options.telemetry.desc": "Sendet nach jedem Lauf Score, gewählte Perks und Skills, deinen Fortschritt sowie groben Gerätekontext (Browserkennung, Kerne, Fenstergröße) — ohne Namen und ohne Konto. Hilft uns beim Ausbalancieren des Spiels. Aus = es wird nichts gesendet.",
  "options.telemetry.more": "Was genau gesendet wird",

  "options.perfHud.title": "FPS-Zähler & Report",
  "options.perfHud.desc": "Blendet oben rechts FPS · p95 · Jank ein und zeichnet Perf-Daten auf (⧉ Report → Konsole + Zwischenablage). Nur im Testbranch. Aus = keine Anzeige und keine Messung.",

  "options.testvp.title": "Test-Viewport",
  "options.testvp.desc": "Zeigt das Spiel in einem Rahmen fester Größe — für reproduzierbare Bildschirmfotos und Layout-Prüfungen. Nur im Testbranch. Das Umschalten lädt die Seite neu. Die Pixeldichte des Monitors wird dabei nicht mit simuliert.",
  "options.testvp.off": "Aus",
  "options.testvp.hint": "Zum Beenden hier drinnen in den Optionen wieder auf Aus stellen.",

  "options.float.title": "Floating-Text anzeigen",
  "options.float.desc": "Aufsteigende Zahlen/Texte über dem Feld. Master-Schalter für alle drei unten. Die großen Ansagen (Stark/Brutal/Irre/Gottgleich) bleiben immer sichtbar.",
  "options.float.score.title": "↳ Score",
  "options.float.score.desc": "Aufsteigende Punktzahlen bei gewonnenen Stichen.",
  "options.float.mult.title": "↳ Multiplikator",
  "options.float.mult.desc": "„Kritisch!“- und Formations-Text (Multiplikator-Boni).",
  "options.float.winlose.title": "↳ Sieg / Niederlage",
  "options.float.winlose.desc": "Gewonnen/Verloren-Text am Stich-Ausgang.",
  "options.breakdown.title": "Stich-Aufschlüsselung anzeigen",
  "options.breakdown.desc": "Faktorenkette unter dem Feld: Basis × Serie × Perks × Formation × Crit = Summe des laufenden Stichs. Der Platz bleibt reserviert — die Karten stehen so oder so gleich.",

  /* ---------------------------------------------------------------------------------------------
     DATENSCHUTZ-HINWEIS (#datenschutz, PrivacyModal.jsx)

     Aufbau: erst die beiden Sender (Telemetrie · Bestenliste), dann was NICHT rausgeht, dann Empfänger
     und Kontakt. Die Reihenfolge ist Absicht — wer den Hinweis öffnet, will zuerst wissen, was das Spiel
     verschickt, nicht wer dahintersteht.

     {ua} kommt aus UA_MAX in game/telemetry.js. Die Zahl wird NICHT abgetippt: sie steht an genau einer
     Stelle im Code, und der Hinweis liest sie von dort. Sonst behauptet der Text irgendwann etwas
     anderes, als der Code tut. */
  "privacy.eyebrow": "Playtest",
  "privacy.title": "Was Autostich sendet",
  "privacy.intro": "Autostich läuft im Browser, ohne Konto und ohne Anmeldung. Zwei Dinge verlassen dein Gerät — beide stehen hier vollständig.",

  "privacy.sec.telemetry.title": "Anonyme Spieldaten (abschaltbar)",
  "privacy.sec.telemetry.body": "Nach jedem Lauf: Score, Durchläufe, Stiche, gewählte Perks, Skills und Gebäude, dein Fortschritt im Upgrade-Baum, gekaufte Kosmetik und der Seed. Dazu grober Gerätekontext: Browserkennung (auf {ua} Zeichen gekürzt), Prozessorkerne, Gerätespeicher, Sprache, Fenstergröße, Pixeldichte und ob das Gerät Touch hat. Plus eine zufällig gewürfelte Install-Kennung, damit mehrere Läufe desselben Geräts zusammengehören. Kein Name, keine E-Mail, keine Anmeldung. Abschalten: Optionen → „Anonyme Spieldaten senden“. Aus heißt wirklich aus — auch was noch in der Warteschlange liegt, wird gelöscht.",
  "privacy.sec.board.title": "Bestenliste (nur beim Veröffentlichen)",
  "privacy.sec.board.body": "Wenn du einen Lauf in die Bestenliste stellst: dein selbst gewählter Nickname, Score, Durchläufe, Stiche, Archetypen, Perks, Skills, der Seed, der Ausbaustand deines Upgrade-Baums (wie viele Knoten freigeschaltet waren) und die Kennzahlen des Laufs (beste Serie, Formationen, Crits, Siege, bester Stich, Score-Anteile). Der Nickname ist für alle Spieler sichtbar — wähle also nichts, worüber man dich findet. Ohne Nickname wird nichts veröffentlicht.",
  "privacy.sec.local.title": "Was auf deinem Gerät bleibt",
  "privacy.sec.local.body": "Profil, Lauf-Historie, Optionen und ein angefangener Lauf liegen im Speicher deines Browsers und verlassen das Gerät nicht. Es gibt keine Werbe-Cookies, keine fremden Skripte und keine Verfolgung über andere Seiten hinweg.",
  "privacy.sec.host.title": "Wohin es geht",
  "privacy.sec.host.body": "Beides landet in einer Supabase-Datenbank, getrennt in zwei Tabellen — eine volllaufende Telemetrie kann die Bestenliste also nicht beschädigen. Der Zugriff läuft über einen öffentlichen Schlüssel, der ausschließlich Lesen und Anlegen erlaubt.",
  "privacy.sec.contact.title": "Wer dahintersteht",
  "privacy.sec.contact.body": "Autostich ist ein privates Hobby-Projekt im offenen Playtest. Fragen, Widerspruch oder die Bitte, deine Daten zu löschen, gehen über den Discord des Projekts.",

  "privacy.installId.label": "Deine Install-Kennung",
  "privacy.installId.copy": "Kopieren",
  "privacy.installId.copied": "Kopiert",
  "privacy.installId.hint": "Nenne sie, wenn du eine Löschung deiner gesendeten Daten möchtest — ohne sie lassen sich deine Zeilen nicht finden. Sie steht nur auf diesem Gerät und sagt nichts darüber, wer du bist.",
  "privacy.contact.discord": "Discord öffnen",
  "privacy.updated": "Stand: 2026-08-16 · Beta-Playtest",
  "privacy.link": "Datenschutz",
};
