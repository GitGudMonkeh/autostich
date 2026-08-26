import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import { t, fmtNum, fmtPct, fmtDayMonth, LOCALE_IDS, READY_LOCALE_IDS, setLocale, getLocale,
  interpolate, SOURCE_LOCALE, DEFAULT_LOCALE, catalog, numberFormat } from "../src/i18n/index.js";
import { tokenizeGlossary } from "../src/i18n/glossaryText.js";

/* ============================================================
   I18N-GUARDS — dieselbe Idee wie registry-guards.test.js: Meta-Tests, die AUTOMATISCH
   über den Katalog laufen und mit jedem neuen Schlüssel mitwachsen, statt eine Handliste
   zu pflegen. Sie fangen die Fehlerklassen ab, die ein zweisprachiges Spiel still einführt:

     1. Schlüssel-Parität   — ein Text existiert nur auf Deutsch → englische Spieler sehen Deutsch.
     2. Platzhalter-Parität — {score} fehlt in der Übersetzung → die Zahl verschwindet spurlos.
     3. Vergessene Übersetzung — der englische Eintrag ist Wort für Wort der deutsche.
     4. Zahlformat          — deutsche Dezimal-Kommas im englischen Katalog (und umgekehrt).
     5. Plural-Paare        — `…_one` ohne `…_other` (oder umgekehrt) → falsche Form.
     6. Terminologie        — eine deutsche Vokabel muss auf GENAU eine englische abbilden
                              (docs/localization/uebersetzerpaket_pixi_2026-08-15.md §3).
     7. Ratsche             — in schon migrierten Dateien darf kein neuer deutscher Inline-Text
                              in der JSX auftauchen. Die Liste der migrierten Dateien wächst;
                              sie schrumpft nie.

   Wichtig für zukünftige Zugänge: neue Anzeigetexte gehören IMMER in ALLE fertigen Kataloge.
   Ein einsprachiger Zugang macht die Suite (und damit den Deploy) rot.

   ------------------------------------------------------------
   N SPRACHEN STATT ZWEI (#es-locale, 26.08.2026).

   Bis hierher stand in dieser Datei überall `de` gegen `en`. Mit einer dritten Sprache zerfallen
   diese Prüfungen in ZWEI ARTEN, die sich verschieden verallgemeinern — und diese Unterscheidung
   ist der ganze Trick:

     VERBIETENDE Prüfungen laufen über ALLE angemeldeten Sprachen, auch über eine unfertige.
       „Kein verwaister Schlüssel", „keine kaputten Platzhalter", „kein leerer Text", „kein fremdes
       Dezimalzeichen", „keine halbe Plural-Paarung". Ein leerer Katalog verletzt keine davon.

     VERLANGENDE Prüfungen laufen über die FERTIGEN Sprachen (READY_LOCALE_IDS).
       „Jeder Schlüssel existiert", „die Kürzel sind je ein Zeichen", „die Raritätsleiter stimmt".
       Von einem Katalog, der noch übersetzt wird, kann man Vollständigkeit nicht verlangen.

   Das ist KEINE Aufweichung, solange die Ausnahme nicht liegen bleiben kann — dafür sorgt die
   Ratsche „unfertige Sprache ist vollständig → ready: true setzen" ganz unten. Und
   sprachpaarige Tabellen (SAME_OK, TERMS, Anführungszeichen, Marke) werden NICHT geteilt,
   sondern je Sprache geführt: „Deck" ist auf Englisch dasselbe Wort und auf Spanisch „mazo" —
   eine gemeinsame Liste würde genau die vergessene Übersetzung verstecken, die sie fangen soll.
   ============================================================ */

const CATS = Object.fromEntries(LOCALE_IDS.map((id) => [id, catalog(id)]));
const KEYS = Object.fromEntries(LOCALE_IDS.map((id) => [id, Object.keys(CATS[id])]));
const SRC = CATS[SOURCE_LOCALE];
const KEYS_SRC = KEYS[SOURCE_LOCALE];
// Alle Zielsprachen (verbietende Prüfungen) bzw. nur die fertigen (verlangende).
const TARGETS = LOCALE_IDS.filter((id) => id !== SOURCE_LOCALE);
const READY_TARGETS = READY_LOCALE_IDS.filter((id) => id !== SOURCE_LOCALE);

// Alt-Name, weiterbenutzt wo die Prüfung wirklich von der QUELLSPRACHE ausgeht (Score-Ansagen, tote Schlüssel).
const KEYS_DE = KEYS_SRC;
const PLACEHOLDER = /\{(\w+)\}/g;
const placeholders = (s) => new Set([...String(s).matchAll(PLACEHOLDER)].map((m) => m[1]));

describe("i18n · Katalog-Parität", () => {
  // VERLANGEND: nur von den fertigen Sprachen. Ein Katalog in Arbeit darf lückenhaft sein.
  it("jede fertige Sprache kennt exakt dieselben Schlüssel wie die Quellsprache", () => {
    for (const loc of READY_TARGETS) {
      const fehlt = KEYS_SRC.filter((k) => !(k in CATS[loc]));
      expect(fehlt, `Nur in ${SOURCE_LOCALE}.js — ${loc}-Spieler sehen die Quellsprache:\n  ${fehlt.join("\n  ")}`).toEqual([]);
    }
  });

  /* VERBIETEND: über ALLE Sprachen, auch die unfertige. Ein Schlüssel, den die Quellsprache nicht
     kennt, ist in JEDEM Katalog eine verwaiste Zeile — ob der Katalog sonst vollständig ist oder
     nicht, ändert daran nichts. Genau diese Prüfung fängt einen Tippfehler im spanischen Katalog,
     bevor Spanisch überhaupt sichtbar ist. */
  it("keine Sprache führt Schlüssel, die die Quellsprache nicht kennt", () => {
    for (const loc of TARGETS) {
      const verwaist = KEYS[loc].filter((k) => !(k in SRC));
      expect(verwaist, `Verwaiste Übersetzung in ${loc}.js:\n  ${verwaist.join("\n  ")}`).toEqual([]);
    }
  });

  // VERBIETEND: wo ein Text existiert, muss er dieselben Platzhalter tragen wie die Quelle.
  it("jeder vorhandene Schlüssel trägt dieselben Platzhalter wie die Quellsprache", () => {
    const bad = [];
    for (const loc of TARGETS) {
      for (const k of KEYS_SRC) {
        if (!(k in CATS[loc])) continue;
        const a = placeholders(SRC[k]), b = placeholders(CATS[loc][k]);
        const missing = [...a].filter((p) => !b.has(p));
        const extra = [...b].filter((p) => !a.has(p));
        if (missing.length || extra.length) {
          bad.push(`${k} (${loc}): fehlt {${missing.join("},{")}}${extra.length ? ` · zusätzlich {${extra.join("},{")}}` : ""}`);
        }
      }
    }
    expect(bad, `Platzhalter-Bruch — die Variable würde im Text fehlen:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  // VERBIETEND: über alle Sprachen.
  it("kein Katalogtext ist leer", () => {
    const empty = [];
    for (const loc of LOCALE_IDS) {
      for (const k of KEYS[loc]) if (!String(CATS[loc][k] ?? "").trim()) empty.push(`${k} (${loc})`);
    }
    expect(empty).toEqual([]);
  });

  /* Wörter, die in dieser Zielsprache identisch mit der Quellsprache sind (Eigennamen, Kürzel,
     Marken, reine Symbolzeilen). Nur DIESE dürfen unübersetzt bleiben — alles andere ist eine
     vergessene Übersetzung.

     JE SPRACHE, nicht geteilt. „Deck", „Perks", „Score" sind im Englischen dieselben Wörter wie im
     Deutschen; im Spanischen heißen sie „mazo", „ventajas", „puntuación". Eine gemeinsame Liste
     würde die vergessene spanische Übersetzung genau dort durchlassen, wo sie am wahrscheinlichsten
     ist — bei den Wörtern, die aus dem Englischen schon vertraut aussehen. */
  const SAME_OK_EN = new Set([
    "board.col.pilot",       // Spaltenkopf „Pilot" — in beiden Sprachen dasselbe Wort
    "start.onb.reroll",      // „Reroll" ist im Deutschen bereits das englische Wort
    "options.rfx.mobile",    // Zustandsname, in beiden Sprachen „Mobile"
    "options.float.score.title", // „Score" — Score bleibt Score (Begriffstabelle §3.1)
    "options.sec.display",   // „HUD & Text" — HUD ist auch im Deutschen das englische Kürzel
    "options.chip.display",  // dito, die Kurzform der Sprungleiste
    "start.progress.onboarding", // „Onboarding" ist im Deutschen der etablierte Begriff (§3.5)
    "start.progress.links",  // reine Zahlenzeile „{done} / {total}"
    "start.board.week.val",  // dito „{have}/{max}" — nur Ziffern und ein Schrägstrich
    "start.board.week.bonus.full", // „+{dp} DP" — nur Zahl und Währungskürzel, DP heißt in beiden Sprachen DP
    "common.cur.dp",         // DP = Deckpunkte / Deck Points
    "lv.wing.deck",          // „Deck" ist in beiden Sprachen dasselbe Wort (Begriffstabelle §3.1)
    "sparkline.axis.y",      // Achsenbeschriftung „Score" — Score bleibt Score (§3.1)
    "build.perks.head",      // „Perks — {count}" — Perk bleibt Perk (Begriffstabelle §3.1)
    "build.skills.head",     // dito für Skill
    "start.tile.upgrades",   // „Upgrades" ist im Deutschen der etablierte Begriff (§3.5)
    "start.board.last.none", // Gedankenstrich als Platzhalter „noch kein Lauf" — Zeichen, kein Wort
    "start.tutorial",        // „Tutorial" ebenso — dasselbe Wort in beiden Sprachen
    "tut.eyebrow",           // dito — die Kopfzeile der Tutorial-Sektionen
    "tut.progress",          // „{n} / {total}" — nur Zahlen und ein Schrägstrich
    "tut.f.crit",            // „Crit" bleibt Crit (Begriffstabelle §3.1)
    "tut.f.form",            // „Formation" ist in beiden Sprachen dasselbe Wort
    "tut.wahl.perks.title",  // „Perks" — im Deutschen der etablierte Begriff (§3.5)
    "tut.wahl.skills.title", // dito für Skills
    "upgrades.tab.decks",    // „Decks" — dasselbe Wort in beiden Sprachen
    "upgrades.nav.decks",    // dito — Überschrift der Deck-Spalte in der Desktop-Fassung
    "upgrades.deckLead",     // „Deck" — dasselbe Wort in beiden Sprachen
    "upgrades.lane.rerolls", // „Rerolls" — im Deutschen bereits das englische Wort
    "shop.tab.packs",        // „Packs" — dasselbe Wort in beiden Sprachen
    "formation.wechsel.abbr", // Wechsel/Zigzag → beide Z
    "formation.anker.abbr",   // Anker/Anchor  → beide A
    "perkcat.A.name",         // „Deck" ist in beiden Sprachen dasselbe Wort
    "perkcat.D.name",         // „Score" bleibt Score (§3.1)
    "perkcat.D.desc",         // dito
    "perkcat.E.name",         // „Form" — Chip-Kurzform, in beiden Sprachen identisch
    "bf.bd.perks",            // Stich-Aufschlüsselung: „Perks" ist im Deutschen der etablierte Begriff (§3.5)
    "bf.bd.form",             // dito „Form" — dieselbe Chip-Kurzform wie perkcat.E.name
    "bf.bd.crit",             // dito „Crit" — steht so auch in rail.critChance/rail.critMult
    "perk.L_ECHO.label",      // „Echo" ist in beiden Sprachen dasselbe Wort
    "perk.L_BALL.label",      // „Ballast" ebenso — dasselbe Wort, dieselbe Bedeutung
    // Familiennamen, die als Fremdwort schon englisch sind:
    "family.B_MOMENTUM.name",   // Momentum
    "family.B_INITIATIVE.name", // Initiative
    "family.C_TRIUMPH.name",    // Triumph
    "family.C_FINISHER.name",   // Finisher
    "building.kick.active",     // reine Struktur: „{base} · {kick}" — kein übersetzbarer Text
    "branch.deck.name",         // „Decks" ist in beiden Sprachen dasselbe Wort
    // Glossar-Begriffe, die im Englischen genauso heißen (Fremdwort oder Fachbegriff):
    "glossary.crit.label", "glossary.deck.label", "glossary.position.label",
    "glossary.segment.label", "glossary.formation.label", "glossary.cluster.label",
    "glossary.perk.label",
    // Leitfaden-Schlagwörter, die als Fremdwort schon englisch sind:
    "guide.lightning.pillars.0.name", "guide.lightning.loop.nodes.0",  // Crit
    "guide.lightning.principle.0.tag", "guide.fire.principle.1.tag",   // Mono · Payoff
    "guide.ice.principle.1.tag", "guide.plant.principle.1.tag",        // Position · Mono
    "gameover.milestones.max", "gameover.build",   // „Maximum" · „Build" — beide Sprachen gleich
    "bar.lightning.state.crit",  // „Crit ×{mult}" — Crit bleibt Crit (§3.1)
    // Stichspiel-HUD: Fremdwörter, Kürzel und reine Zahlenzeilen, die in beiden Sprachen gleich lauten.
    "hud.pause",              // „Pause" ist im Deutschen das englische Wort
    "hud.speed.max.label",    // „MAX" — Knopfbeschriftung
    "hud.score",              // Score bleibt Score (§3.1)
    "hud.streak.best",        // „best {n}" — Kurzform, in beiden Sprachen gleich
    "hud.mult",               // „Mult" — Kürzel des Multiplikators
    "rail.formation",         // „Formation" ist in beiden Sprachen dasselbe Wort
    "rail.jackpot",           // „Jackpot" — Fremdwort im Deutschen
    "rail.crits",             // „Crits" (§3.1)
    // Entscheidungs-Panels: dieselbe Lage — Fremdwort, Eigenname oder reine Zahlenzeile.
    "glacierform.block.name", // „Block" ist in beiden Sprachen dasselbe Wort
    "skill.arch.none",        // „Skill" (§3.1)
    "perk.start",             // „Start" — in beiden Sprachen gleich
    "perk.stat.crit",         // „Crit" (§3.1)
    "formpanel.count",        // reine Zahlenzeile „{n} · max ×{max}"
    // Menü-/Werkstatt-Bildschirme: Fremdwörter und Eigennamen, die im Englischen genauso lauten.
    "upgrades.title",         // „Upgrades" ist im Deutschen der etablierte Begriff (§3.5)
    "upgrades.eyebrow",       // dito — der Eyebrow trägt genau dieses Wort (design-sprache.md §2)
    "upgrades.readout.nodes.val", // reine Zahlenzeile „{owned} / {total}" (wie start.progress.links)
    "upgrades.details",       // „Details ›"
    "deckdetail.deck",        // „Deck" ist in beiden Sprachen dasselbe Wort
    "deckdetail.tab.skills",  // „Skills" (§3.1)
    "shop.color.standard",    // „Standard"
    "fxgroup.score.title",    // Score bleibt Score (§3.1)
    "fxsyn.standard.name", "fxsyn.gottStandard.name", // „Standard"
    "fxsyn.scorch.name",      // „Laser"
    "dev.run.title",          // „DEV RUN" — Entwickler-Kennzeichnung, bewusst englisch
    // Feedback-Melder (#396): Fremdwörter, die im Deutschen genauso benutzt werden.
    "start.feedback",         // „🐞 Feedback" — im Deutschen das etablierte Wort (§3.5)
    "feedback.eyebrow",       // „Playtest"
    "privacy.eyebrow",        // dito — Kopfzeile des Datenschutz-Hinweises
    "feedback.kind.bug",      // „Bug"
    "feedback.kind.balance",  // „Balance"
    "feedback.name",          // „Name"
    "feedback.name.placeholder", // „optional"
    // Architekt: Kategorienamen und reine Struktur-Zeilen.
    "archcat.score.label",    // Score bleibt Score (§3.1)
    "archcat.formation.label", // „Formation" — beide Sprachen gleich
    "arch.cell.building",     // reine Struktur: „{name} ({tier})"
    "arch.cell.pos",          // „Pos {pos}" — Kürzel, in beiden Sprachen gleich
    // Meta-Bildschirme: Fachwörter, Eigennamen und reine Zahlen-/Strukturzeilen.
    "stats.seed",             // „Seed {code}" — Seed bleibt Seed (§3.1)
    "graphs.src.formation",   // „Formation"
    "graphs.src.crit",        // „Crit" (§3.1)
    "chronik.anchor.row",     // reine Struktur: „⚓ Pos {pos} · {type}"
    "anchor.score.label",     // Score bleibt Score (§3.1)
    "anchor.crit.label",      // „Crit" (§3.1)
    "anchor.formation.label", // „Formation"
    "start.ranked.bonus",     // „Bonus {have}/{max}" — „Bonus" ist in beiden Sprachen dasselbe Wort
    "board.tab.challenger",   // „Challenger" ist der Name des Modus
    "board.tab.global",       // „Global" — dasselbe Wort in beiden Sprachen
    "runstats.skills",        // „Skills" (§3.1, wie deckdetail.tab.skills)
    "runstats.perks",         // „Perks — {n}" — „Perk" ist in beiden Sprachen der etablierte Begriff (§3.5)
    "board.resetIn",          // „Reset in {time}" — „Reset" ist im Deutschen das englische Wort
    "weekmods.range",         // reine Zahlenspanne „ ({from}–{to})"
    "milestone.next",         // reine Struktur: „→ {at} +{sp}" — kein übersetzbarer Text
    "node.reroll1.label",     // „Reroll" ist im Deutschen bereits das englische Wort (wie start.onb.reroll)
    "node.reroll2.label",     // dito
    "gameover.welcome.value", // „+{n} DP" — Kürzel, in beiden Sprachen gleich (wie common.cur.dp)
  ]);

  /* Eine Liste je Zielsprache, aus dem SPANISCHEN Katalog heraus gefüllt (#es-translate,
     26.08.2026). Von `en` erben wäre der bequeme Fehler gewesen: die Hälfte der englischen
     Einträge („Deck", „Score", „Perks") sind Wörter, die auf Spanisch sehr wohl übersetzt
     gehören — und sie sind hier auch übersetzt (mazo, puntuación, ventajas).

     Die Liste zerfällt in drei Gruppen, und jede ist ein anderer Grund:

     1. REINE STRUKTUR — Zeichenketten ohne übersetzbares Wort, nur Platzhalter, Zahlen und
        Trenner. Sie MÜSSEN gleich bleiben; eine Abweichung wäre ein Fehler, keine Übersetzung.
     2. LEHNWÖRTER, die das Spanische genauso benutzt wie das Deutsche (Build, Bug, Balance,
        Tutorial, Playtest, Packs, Mono, Motor). Der Anglizismus ist hier die spanische Norm,
        nicht eine vergessene Zeile.
     3. ZWEI KÜRZEL, die zufällig zusammenfallen: Wechsel/Zigzag → Z und Anker/Ancla → A. Die
        anderen sechs Formations-Kürzel unterscheiden sich. */
  const SAME_OK_ES = new Set([
    // 1 · reine Struktur: Platzhalter, Zahlen, Trennzeichen — kein übersetzbares Wort
    "building.kick.active",      // „{base} · {kick}"
    "bar.plant.share.value",     // „{green} / {total} · {pct} %"
    "rail.formation.value",      // „{n} · +{pct} %"
    "rail.pct", "rail.pct.plain",
    "form.bonus.value", "form.delta", "form.seg.strength",
    "roundscore.diff",
    "arch.scoreDiff", "arch.pct",
    "arch.cell.building",        // „{name} ({tier})"
    "arch.cell.pos",             // „Pos {pos}" — Kürzel, in beiden Sprachen gleich
    "chronik.anchor.row",        // „⚓ Pos {pos} · {type}"
    "stats.archUse.right",       // „{n}× · Ø {avg}"
    "stats.lift.value",          // „+{v} Ø"
    "weekmods.range",            // reine Zahlenspanne
    "milestone.next",            // „→ {at} +{sp}"
    "tut.progress",              // „{n} / {total}"
    "start.progress.links",      // dito
    "start.board.week.val",      // „{have}/{max}"
    "upgrades.readout.nodes.val", // „{owned} / {total}"
    "start.board.last.none",     // „—"
    // 2 · Lehnwörter, die das Spanische ebenso benutzt
    "gameover.build",            // „Build" ist auch im Spanischen der Roguelite-Begriff
    "hud.mult",                  // „Mult" — Kurzform von multiplicador, gleiche Schreibung
    "shop.tab.packs",            // „Packs" — dito, und das Deutsche borgt es aus demselben Grund
    "tut.eyebrow", "start.tutorial",  // „Tutorial"
    "feedback.eyebrow", "privacy.eyebrow",  // „Playtest"
    "feedback.kind.bug",         // „Bug"
    "feedback.kind.balance",     // „Balance"
    "board.tab.global",          // „Global" — dasselbe Wort
    "options.chip.display",      // „HUD" — Akronym, in beiden Sprachen gleich
    "board.tab.challenger",      // Name des Modus
    "dev.run.title",             // „DEV RUN" — Dev-Oberfläche, Eigenname
    "guide.lightning.principle.0.tag", "guide.plant.principle.1.tag",  // „Mono"
    "guide.lightning.principle.1.tag",                                  // „Motor"
    "building.A_PRISMA.name",    // „Prisma" — im Spanischen dasselbe Wort
    // 3 · Kürzel, die zufällig zusammenfallen
    "formation.wechsel.abbr",    // Wechsel/Zigzag → beide Z
    "formation.anker.abbr",      // Anker/Ancla    → beide A
  ]);

  const SAME_OK = { en: SAME_OK_EN, es: SAME_OK_ES };

  /* Eigennamen-KLASSEN statt 18 Einzeleinträge: Kosmetik-Set-Namen und Effekt-Namen sind
     überwiegend Eigennamen (Kitsune, Ronin, Seraph, Aurora, Supernova) und lauten in beiden
     Sprachen gleich. Der Preis dieser Ausnahme: eine vergessene Kosmetik-Übersetzung fällt hier
     nicht auf. Deshalb prüft der Test darunter positiv nach, dass die beschreibenden Namen
     (allen voran die vier Archetyp-Decks) tatsächlich übersetzt sind. */
  const SAME_OK_CLASS = /^(cosmetic\..+\.name|cosmetic\.bf\.suffix|fx\..+\.name)$/;

  it("übersetzte Texte unterscheiden sich vom Original der Quellsprache", () => {
    for (const loc of READY_TARGETS) {
      const ok = SAME_OK[loc] || new Set();
      const same = KEYS_SRC.filter((k) => k in CATS[loc] && SRC[k] === CATS[loc][k]
        && !ok.has(k) && !SAME_OK_CLASS.test(k));
      expect(same, `Unübersetzt in ${loc} (oder in SAME_OK.${loc} eintragen, wenn das Wort wirklich identisch ist):\n  ${same.join("\n  ")}`).toEqual([]);
    }
  });

  /* Gegenprobe zur Tabelle selbst: eine fertige Sprache OHNE eigene SAME_OK-Liste würde diese
     Prüfung stillschweigend mit einer leeren Ausnahmeliste bestehen oder an Eigennamen scheitern.
     Beides ist falsch — die Liste ist eine bewusste Aussage und muss existieren. */
  it("jede fertige Zielsprache hat eine eigene SAME_OK-Liste", () => {
    for (const loc of READY_TARGETS) {
      expect(SAME_OK[loc], `${loc}: keine SAME_OK-Liste — neue Sprache ohne eigene Ausnahmetabelle`).toBeInstanceOf(Set);
    }
  });

  /* Gegenprobe zur Eigennamen-Klasse: Kosmetik-Namen, die etwas BESCHREIBEN statt zu benennen,
     müssen übersetzt sein. Die vier Archetyp-Decks tragen zusätzlich exakt die Archetyp-Namen —
     sie SIND diese Decks, ein Auseinanderlaufen wäre für Spieler direkt verwirrend. */
  it("beschreibende Kosmetik-Namen sind übersetzt, Archetyp-Decks tragen ihre Archetyp-Namen", () => {
    for (const [arch, deckId] of [["lightning", "deck_blitz"], ["fire", "deck_feuer"],
      ["ice", "deck_eis"], ["plant", "deck_pflanze"]]) {
      expect(en[`cosmetic.${deckId}.name`], `${deckId} muss wie der Archetyp heißen`)
        .toBe(en[`archetype.${arch}.label`]);
    }
    for (const k of ["cosmetic.deck_kosmos.name", "cosmetic.deck_oni.name", "cosmetic.deck_drache.name",
      "cosmetic.deck_serie1500.name", "cosmetic.deck_sparfuchs.name", "cosmetic.deck_sonne.name"]) {
      expect(en[k], `${k} beschreibt etwas und muss übersetzt sein`).not.toBe(de[k]);
    }
  });

  /* VERBIETEND, über alle Sprachen: eine halbe Paarung ist auch in einem unfertigen Katalog
     falsch. Deutsch, Englisch und Spanisch haben alle drei genau `one`/`other` mit derselben
     Grenze (CLDR), deshalb reicht dieselbe Prüfung für alle. */
  it("Plural-Schlüssel treten immer als _one/_other-Paar auf", () => {
    for (const name of LOCALE_IDS) {
      const keys = KEYS[name];
      const lonely = keys.filter((k) => {
        if (k.endsWith("_one")) return !keys.includes(k.slice(0, -4) + "_other");
        if (k.endsWith("_other")) return !keys.includes(k.slice(0, -6) + "_one");
        return false;
      });
      expect(lonely, `${name}: unvollständiges Plural-Paar → ${lonely.join(", ")}`).toEqual([]);
    }
  });
});

describe("i18n · Zahl- und Satzformate", () => {
  /* Deutsch schreibt 1.234,5 — Englisch 1,234.5. Beide Sprachen benutzen BEIDE Zeichen, nur in
     vertauschten Rollen; ein nacktes /\d,\d/ träfe deshalb auch den englischen Tausendertrenner
     („12,000"). Unterscheidungsmerkmal: ein Tausenderblock hat GENAU drei Ziffern. Alles andere
     hinter dem Trennzeichen ist ein Dezimalteil — und damit in der falschen Sprache. */
  /* Das Trennzeichen kommt aus derselben Tabelle, die auch die Formatierer benutzen
     (`numberFormat`) — bis 26.08.2026 stand die Regel hier ein zweites Mal, hart als `de` gegen
     `en` getippt. Ein Wächter, der seine eigene Fassung der Regel führt, kann dem Formatierer
     widersprechen; dieser hier kann es nicht mehr.

     VERBIETEND, über alle Sprachen: das FREMDE Dezimalzeichen darf nirgends als Dezimaltrenner
     stehen. Deutsch und Spanisch teilen sich das Format, für sie ist die Prüfung dieselbe. */
  const wrongDecimal = (loc) => {
    const f = numberFormat(loc);
    const foreign = f.dec === "," ? "\\." : ",";
    return new RegExp(`\\d${foreign}(\\d{1,2}(?!\\d)|\\d{4,})`);
  };

  it("kein Text benutzt das Dezimalzeichen einer anderen Sprache", () => {
    for (const loc of LOCALE_IDS) {
      const re = wrongDecimal(loc);
      const bad = KEYS[loc].filter((k) => re.test(CATS[loc][k]));
      expect(bad, `Fremdes Dezimalzeichen in ${loc}.js (erwartet „${numberFormat(loc).dec}"):\n  ${bad.join("\n  ")}`).toEqual([]);
    }
  });

  /* DER wichtigste Wächter für die Registertexte: beide Sprachen müssen DIESELBEN Zahlen nennen.
     Die englischen Skill-Texte interpolieren zwar dieselben Konstanten wie die deutschen, aber
     nichts erzwingt das — jemand könnte eine Zahl abtippen, und beim nächsten Balancing liefe sie
     still weg. Hier fliegt genau das auf: Zahlmengen extrahieren, Trennzeichen normalisieren,
     vergleichen. Schlägt fehl, sobald eine Zahl in einer Sprache fehlt, zu viel ist oder abweicht. */
  const numbersOf = (text, loc) => {
    const f = numberFormat(loc);                                   // dieselbe Tabelle wie die Formatierer
    const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const grouped = new RegExp(`(\\d)${esc(f.grp)}(\\d{3})(?!\\d)`, "g");
    let s = String(text);
    for (let i = 0; i < 3; i++) s = s.replace(grouped, "$1$2");    // 1.234.567 → mehrfach zusammenziehen
    if (f.dec !== ".") s = s.replace(new RegExp(`(\\d)${esc(f.dec)}(\\d)`, "g"), "$1.$2");
    return (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).sort((a, b) => a - b);
  };

  /* Ausnahmen: NUR wo eine Zahl im Englischen ausgeschrieben besser ist als als Ziffer.
     Jeder Eintrag braucht eine Begründung — die Liste soll klein bleiben, sonst entwertet sie
     den Wächter. Ein „das passt schon" ist keine Begründung. */
  const NUM_OK = new Map([
    ["ability.SK_FIRE_L02.desc", "de „1×/Durchlauf“ → en „once per cycle“; „1× per cycle“ wäre steifes Englisch"],
    ["glossary.rankedrun.text", "de „Platz 1“ → en „first place“; „place 1“ liest sich im Englischen falsch"],
    // Dieselbe Stelle noch zweimal im Ranglisten-Bildschirm — gleiche Begründung.
    ["board.rules.intro", "de „Platz 1“ → en „first place“ (wie glossary.rankedrun.text)"],
    ["board.champions.intro", "de „Platz 1“ → en „first place“ (wie glossary.rankedrun.text)"],
    ["unlock.championWeek", "de „Platz 1“ → en „first place“ (wie glossary.rankedrun.text)"],
    ["unlock.championWeekN", "de „Platz 1“ → en „first place“ (wie glossary.rankedrun.text)"],
  ]);

  // VERBIETEND, über alle Zielsprachen: wo ein Text existiert, muss er dieselben Zahlen nennen.
  it("alle Sprachen nennen dieselben Zahlen", () => {
    const bad = [];
    for (const loc of TARGETS) {
      for (const k of KEYS_SRC) {
        if (!(k in CATS[loc]) || NUM_OK.has(k)) continue;
        const a = numbersOf(SRC[k], SOURCE_LOCALE), b = numbersOf(CATS[loc][k], loc);
        if (a.length !== b.length || a.some((n, i) => n !== b[i])) {
          bad.push(`${k}\n     ${SOURCE_LOCALE}: [${a.join(", ")}]\n     ${loc}: [${b.join(", ")}]`);
        }
      }
    }
    expect(bad, `Zahlen laufen zwischen den Sprachen auseinander:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  /* Anführungszeichen als PAAR je Sprache, nicht als einzelnes Zeichen. Der erste Anlauf prüfte
     nur das öffnende Zeichen und ließ ein deutsches „…“ im spanischen Katalog durch — aufgeflogen
     in der Gegenprobe, nicht im Kopf. Der Grund ist eine Zweideutigkeit, die man leicht übersieht:

       U+201C ist im DEUTSCHEN das SCHLIESSENDE und im Englischen/Spanischen das ÖFFNENDE Zeichen.
       Es ist damit kein Erkennungsmerkmal, und jede Prüfung, die es als solches benutzt, muss
       entweder deutsche Zitate fälschlich anmahnen oder fremde durchlassen.

     Deshalb die Paar-Regel: ein Text darf nur Zeichen aus dem Paar SEINER Sprache tragen. Gemessen
     am 26.08.2026: de benutzt U+201E (10 Zeilen) und U+201C (9), nie U+201D; en benutzt U+201C (10)
     und U+201D (10), nie U+201E. Spanisch bekommt das englische Paar — neutrales Spanisch, also
     NICHT die spanientypischen Guillemets, die ohnehin im Orbitron-Subset fehlen. */
  const QUOTES = {
    de: { open: "„", close: "“" },
    en: { open: "“", close: "”" },
    es: { open: "“", close: "”" },
    // #zh-hans: Chinesisch setzt Vollbreiten-Ecken. Sie kommen damit auch in ALL_QUOTES und
    // sind ab jetzt fuer de/en/es fremde Zeichen — die Paar-Regel wird schaerfer, nicht milder.
    "zh-Hans": { open: "「", close: "」" },
  };
  const ALL_QUOTES = [...new Set(Object.values(QUOTES).flatMap((q) => [q.open, q.close]))];

  it("jede Sprache benutzt ihr eigenes Anführungszeichen-Paar", () => {
    for (const loc of LOCALE_IDS) {
      const own = [QUOTES[loc].open, QUOTES[loc].close];
      const foreign = ALL_QUOTES.filter((q) => !own.includes(q));
      if (!foreign.length) continue;
      const re = new RegExp(`[${foreign.join("")}]`);
      const bad = KEYS[loc].filter((k) => re.test(CATS[loc][k]));
      expect(bad, `${loc}.js benutzt ein Zeichen außerhalb seines Paars ${own.join("…")}:\n  ${bad.join("\n  ")}`).toEqual([]);
    }
  });

  /* Zusätzlich die ursprüngliche Regel für die Quellsprache, dem Sinn nach übernommen. Die
     Paar-Regel oben kann sie nicht ersetzen: ein deutscher Text mit NUR dem schließenden Zeichen
     trägt ausschließlich Zeichen aus dem deutschen Paar und käme dort durch, obwohl das öffnende
     fehlt. Weniger zu prüfen als vorher wäre eine Abschwächung, auch wenn die neue Regel
     allgemeiner ist. */
  it("die Quellsprache setzt kein schließendes Zeichen ohne ihr öffnendes", () => {
    const q = QUOTES[SOURCE_LOCALE];
    const bad = KEYS_SRC.filter((k) => SRC[k].includes(q.close) && !SRC[k].includes(q.open));
    expect(bad, `${SOURCE_LOCALE}.js: schließendes Zeichen ohne öffnendes:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("jede angemeldete Sprache hat ein eingetragenes Anführungszeichen-Paar", () => {
    for (const loc of LOCALE_IDS) {
      expect(QUOTES[loc]?.open, `${loc}: kein öffnendes Zeichen in QUOTES`).toBeTruthy();
      expect(QUOTES[loc]?.close, `${loc}: kein schließendes Zeichen in QUOTES`).toBeTruthy();
    }
  });

  /* Die Formatierer gegen die Tabelle, alle drei Sprachen, alle drei Formate. Spanisch ist der
     Fall, für den es die Tabelle überhaupt braucht: Trennzeichen wie Deutsch, Prozent wie Deutsch,
     Datum wie KEINE der beiden anderen. */
  it("fmtNum/fmtPct/fmtDayMonth formatieren je Sprache korrekt", () => {
    const ts = new Date(2026, 11, 24).getTime();
    expect(fmtNum(1234567, "de")).toBe("1.234.567");
    expect(fmtNum(1234567, "en")).toBe("1,234,567");
    expect(fmtNum(1234567, "es")).toBe("1.234.567");
    expect(fmtNum(2.25, "de")).toBe("2,25");
    expect(fmtNum(2.25, "en")).toBe("2.25");
    expect(fmtNum(2.25, "es")).toBe("2,25");
    expect(fmtNum(-1234.5, "de")).toBe("-1.234,5");
    expect(fmtPct(0.07, "de")).toBe("7 %");
    expect(fmtPct(0.07, "en")).toBe("7%");
    expect(fmtPct(0.07, "es")).toBe("7 %");
    expect(fmtDayMonth(ts, "de")).toBe("24.12.");
    expect(fmtDayMonth(ts, "en")).toBe("12/24");
    expect(fmtDayMonth(ts, "es")).toBe("24/12");
  });

  it("jede angemeldete Sprache hat eine vollständige Zeile in der Formattabelle", () => {
    for (const loc of LOCALE_IDS) {
      const f = numberFormat(loc);
      for (const feld of ["dec", "grp", "pct", "day"]) {
        expect(f[feld], `${loc}: Feld „${feld}" fehlt in der Formattabelle`).toBeTruthy();
      }
      expect(f.pct, `${loc}: pct muss {n} enthalten`).toContain("{n}");
      expect(f.day, `${loc}: day muss {dd} und {mm} enthalten`).toMatch(/\{dd\}[\s\S]*\{mm\}|\{mm\}[\s\S]*\{dd\}/);
    }
  });

  /* Quelltext-Ratsche auf die vierte Sprachweiche. `buildingText.js` fragte bis 26.08.2026
     `getLocale() === SOURCE_LOCALE` und hätte Spanisch damit in den englischen Zweig fallen lassen
     (×1.10 statt ×1,10). Kein Paritätswächter konnte das sehen: die Gebäude-Effekttexte werden
     ERZEUGT, sie stehen nicht im Katalog. Deshalb hier, an der Quelle. */
  it("buildingText.js entscheidet Zahlformate nicht mehr über einen Sprachvergleich", () => {
    const src = readFileSync(new URL("../src/i18n/buildingText.js", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    expect(src, "Sprachvergleich in buildingText.js — gehört in die Formattabelle").not.toMatch(/getLocale\(\)\s*===/);
    expect(src, "hart gesetztes Dezimalkomma in buildingText.js").not.toMatch(/replace\(\s*"\."\s*,\s*","\s*\)/);
    expect(src, "der Faktor muss über fmtNum laufen").toMatch(/fmtNum\(/);
  });
});

describe("i18n · Terminologie", () => {
  /* Begriffstabelle aus dem Übersetzerpaket §3: EINE deutsche Vokabel → GENAU EINE englische.
     Geprüft wird die Richtung, die im Spiel weh tut: taucht das deutsche Wort in einem
     Schlüssel auf, muss der englische Text die kanonische Entsprechung benutzen — und nie
     ein verbotenes Synonym. */
  const TERMS_EN = [
    { de: /\bDurchlauf\b/i,   ok: /\bcycle/i,        never: /\bround\b/i,            name: "Durchlauf → cycle (nie „round“)" },
    { de: /\bStich(e|en)?\b/, ok: /\btrick/i,        never: /\bround\b/i,            name: "Stich → trick (nie „round“)" },
    { de: /\bLäufe?\b/,       ok: /\bruns?\b/i,      never: null,                     name: "Lauf → run" },
    { de: /\bSeed\b/i,        ok: /\bseed\b/i,       never: null,                     name: "Seed → seed" },
    { de: /\bRarität\b/i,     ok: /\brarity\b/i,     never: null,                     name: "Rarität → rarity" },
    { de: /\bRangliste\b/i,   ok: /rank(ed|ing)\b/i, never: null,                     name: "Rangliste → ranked/ranking" },
    { de: /\bBestenliste\b/i, ok: /\bleaderboard\b/i, never: null,                    name: "Bestenliste → leaderboard" },
    { de: /\bWerkstatt\b/i,   ok: /\bworkshop\b/i,   never: null,                     name: "Werkstatt → workshop" },
    // „Formationsphase"/„Formations-Energie" bilden auf „order phase"/„order energy" ab (Freigabe §3.2)
    // und dürfen deshalb NICHT „formation" verlangen — die eigenen Regeln dafür stehen darüber.
    { de: /\bFormation(?!sphase|s-Energie|senergie)/i, ok: /\bformation/i, never: null,      name: "Formation → formation" },
    { de: /\bMultiplikator\b/i, ok: /\bmultiplier\b/i, never: null,                   name: "Multiplikator → multiplier" },
    // Freigabe 15.08.2026: die drei entschiedenen Klangfragen + die deutsche Umbenennung.
    { de: /Aufstellungsphase/i, ok: /\border phase\b/i, never: /\blayout\b/i,          name: "Aufstellungsphase → order phase (nie „layout“)" },
    { de: /Formations-Energie/i, ok: /\border energy\b/i, never: /\blayout\b/i,        name: "Formations-Energie → order energy" },
    { de: /\bZiehreihenfolge\b/i, ok: /\bdraw order\b/i, never: null,                  name: "Ziehreihenfolge → draw order" },
    { de: /\bEpisch\b/,        ok: /\bepic\b/i,       never: /\blegendary\b/i,        name: "Episch → Epic (nie „legendary“ — das ist eine eigene Achse)" },
    { de: /Deck-Werkstatt/i,   ok: /deck workshop/i,  never: null,                     name: "Deck-Werkstatt → deck workshop" },
    // 18.08.2026: „Challenges" heißt im Deutschen jetzt „Herausforderungen" (Entscheidung des Users);
    // englisch bleibt es „challenge". Der Wächter hält beide Richtungen: die Vokabel bildet auf genau
    // ein Wort ab, und der englische Katalog darf das deutsche Wort nirgends übernehmen.
    { de: /Herausforderung/i,  ok: /\bchallenge/i,   never: null,                     name: "Herausforderung → challenge" },
    { de: /Stichpunkte?\b/i,   ok: /\bTrick Points?\b|\bTP\b/,  never: /\bSP\b/,        name: "Stichpunkte → Trick Points (TP, nie SP)" },
    // Der SPIELTITEL ist ab 18.08.2026 ebenfalls eine Vokabel der Tabelle: „Autostich" trägt „Stich"
    // sichtbar, englisch liest sich dasselbe Wort als Nähbegriff (stitch). Die Marke folgt deshalb
    // derselben Abbildung wie das Wort darin (Stich → trick).
    { de: /\bAutostich\b/i,   ok: /\bAutotrick\b/i,  never: /\bAutostich\b/i,  name: "Autostich → Autotrick (Spieltitel)" },
  ];

  /* Begriffstabelle SPANISCH — eingefroren am 26.08.2026 (#es-translate) aus
     docs/localization/uebersetzerpaket_es_2026-08-26.md §3. Ab hier ist sie Prüfregel, nicht
     Diskussionsgrundlage, genau wie die englische seit dem 15.08.2026.

     JEDE Regel wurde vor dem Einfrieren gegen den fertigen Katalog gefahren; eine, die nur
     „vernünftig aussieht", steht hier nicht drin. Die Übung hat sich sofort bezahlt gemacht:
     `glossary.skillrunde` hieß „Ronda de habilidad", obwohl das deutsche Wort „Skill-DURCHLAUF"
     ist und §3.1 `ciclo` als das einzige Wort dafür festlegt. Ohne die Probe wäre der Bruch
     eingefroren worden statt aufzufallen.

     ZWEI SPANISCHE EIGENHEITEN, an denen die englische Tabelle vorbeikommt:

     - `\b` ist in JS ASCII-basiert und greift NICHT vor „Épica" oder „área". Ein `\bépica\b`
       trifft nie. Die Regeln hier setzen die Grenze deshalb nur dort, wo links und rechts ASCII
       steht.
     - „Kampfwert-Vorsprung" bildet auf `margen` ab, nicht auf `valor de combate`, genau wie es
       englisch auf „margin" abbildet. Die Kampfwert-Regel klammert die Zusammensetzung deshalb
       aus, und der Vorsprung bekommt eine eigene Zeile — mit `ventaja` als VERBOTENEM Synonym,
       weil `ventaja` das eingefrorene Wort für Perk ist (§3.5) und ein Wort nicht zwei Begriffe
       tragen darf. */
  const TERMS_ES = [
    { de: /\bDurchlauf\b/i,   ok: /\bciclo/i,          never: /\bronda\b/i,     name: "Durchlauf → ciclo (nie „ronda“)" },
    { de: /\bStich(e|en)?\b/, ok: /\bbaza/i,           never: /\bronda\b/i,     name: "Stich → baza (nie „ronda“)" },
    { de: /\bLäufe?\b/,       ok: /\bpartidas?\b/i,    never: null,             name: "Lauf → partida" },
    { de: /\bSeed\b/i,        ok: /\bsemillas?\b/i,    never: null,             name: "Seed → semilla" },
    { de: /\bRarität\b/i,     ok: /\brareza/i,         never: null,             name: "Rarität → rareza" },
    { de: /\bRangliste\b/i,   ok: /clasificaci|clasificatori/i, never: null,    name: "Rangliste → clasificación/clasificatoria" },
    { de: /\bBestenliste\b/i, ok: /clasificación/i,    never: null,             name: "Bestenliste → clasificación" },
    { de: /\bWerkstatt\b/i,   ok: /\btaller\b/i,       never: null,             name: "Werkstatt → taller" },
    { de: /\bFormation(?!sphase|s-Energie|senergie)/i, ok: /formaci/i, never: null, name: "Formation → formación" },
    { de: /\bMultiplikator\b/i, ok: /\bmultiplicador\b/i, never: null,          name: "Multiplikator → multiplicador" },
    { de: /Aufstellungsphase/i, ok: /\bfase de orden\b/i, never: null,          name: "Aufstellungsphase → fase de orden" },
    { de: /Formations-Energie/i, ok: /energía de orden/i, never: null,          name: "Formations-Energie → energía de orden" },
    { de: /\bZiehreihenfolge\b/i, ok: /\borden de robo\b/i, never: null,        name: "Ziehreihenfolge → orden de robo" },
    { de: /\bEpisch\b/,       ok: /pica\b/i,           never: /legendaria/i,    name: "Episch → Épica (nie „legendaria“ — eigene Achse)" },
    { de: /Deck-Werkstatt/i,  ok: /taller de mazos/i,  never: null,             name: "Deck-Werkstatt → taller de mazos" },
    { de: /Herausforderung/i, ok: /desafío/i,          never: null,             name: "Herausforderung → desafío" },
    { de: /Stichpunkte?\b/i,  ok: /\bPuntos? de baza\b|\bPB\b/, never: /\bSP\b/, name: "Stichpunkte → Puntos de baza (PB, nie SP)" },
    { de: /\bAutostich\b/i,   ok: /\bAutobaza\b/i,     never: /\bAutostich\b/i, name: "Autostich → Autobaza (Spieltitel)" },
    { de: /\bKartenwert\b/i,  ok: /\bvalor de carta\b/i, never: null,           name: "Kartenwert → valor de carta" },
    { de: /\bStichwert\b/i,   ok: /\bvalor de baza\b/i, never: null,            name: "Stichwert → valor de baza" },
    { de: /\bKampfwert\b(?!-Vorsprung)/i, ok: /\bvalor de combate\b/i, never: null, name: "Kampfwert → valor de combate" },
    { de: /Kampfwert-Vorsprung/i, ok: /\bmargen\b/i,   never: /\bventaja\b/i,   name: "Kampfwert-Vorsprung → margen (nie „ventaja“ — das ist Perk)" },
    { de: /\bSerienpunkt(e|en)?\b/i, ok: /\bpuntos? de racha\b/i, never: null,  name: "Serienpunkt → punto de racha" },
    { de: /\bGletscher\b/i,   ok: /glaciar/i,          never: null,             name: "Gletscher → glaciar" },
    { de: /\bLadung(en)?\b/i, ok: /\bcargas?\b/i,      never: null,             name: "Ladung → carga" },
    { de: /\bHitze\b/i,       ok: /\bcalor\b/i,        never: null,             name: "Hitze → calor" },
    { de: /\bAsche\b/i,       ok: /ceniza/i,           never: null,             name: "Asche → ceniza" },
    { de: /\bWachstum\b/i,    ok: /\bcrecimiento\b/i,  never: null,             name: "Wachstum → crecimiento" },
    { de: /\bPerks?\b/i,      ok: /\bventajas?\b/i,    never: null,             name: "Perk → ventaja" },
    { de: /\bSkills?\b/i,     ok: /habilidad(es)?\b/i, never: null,             name: "Skill → habilidad" },
    { de: /\bGebäude\b/i,     ok: /\bedificios?\b/i,   never: null,             name: "Gebäude → edificio" },
    { de: /\bSegment(e|s|en)?\b/i, ok: /\bsegmentos?\b/i, never: null,          name: "Segment → segmento" },
    { de: /\bFarbblock\b/i,   ok: /\bbloque de palo\b/i, never: null,           name: "Farbblock → bloque de palo" },
    { de: /\bJoker\b/i,       ok: /comodín/i,          never: null,             name: "Joker → comodín" },
    { de: /\bDecks?\b/i,      ok: /\bmazos?\b/i,       never: null,             name: "Deck → mazo" },
    { de: /\bGegner(karte|karten)?\b/i, ok: /\brival(es)?\b/i, never: null,     name: "Gegner → rival" },
    { de: /\bNeuwurf\b|\bReroll(s)?\b/i, ok: /relanza/i, never: null,           name: "Neuwurf/Reroll → relanzamiento" },
  ];

  /* EINE Begriffstabelle je Zielsprache. Vererben geht nicht: die Tabelle bildet DEUTSCH auf die
     Zielsprache ab, nicht Englisch auf Spanisch. */
  const TERMS = { en: TERMS_EN, es: TERMS_ES };

  /* ZWEI Schlüsselklassen, die diese Prüfung NICHT bewerten darf (#es-translate). Beide fielen
     erst beim Aufbau der spanischen Tabelle auf, weil sie im Englischen zufällig nicht auffielen:

     1. PLATZHALTERNAMEN. `target.eyebrow` heißt deutsch „Rolle · {perk}". Das Wort „perk" steht
        dort als VARIABLENNAME, nicht als Text — die Regel „Perk → ventaja" schlug daran an und
        verlangte eine Übersetzung des Platzhalters. Im Englischen fiel das nie auf, weil dort
        zufällig dasselbe Wort auch die Übersetzung ist.

     2. `glossary.*.match`. Diese Listen sind kein Anzeigetext, sondern die Wortformen der
        Auto-Fettung, und sie werden je Sprache NEU GESCHRIEBEN statt übersetzt (Paket §7). Eine
        spanische Liste muss die spanischen Flexionen enthalten und darf die deutschen gerade
        nicht spiegeln. Englisch kam durch, weil „Deck-Durchlauf" dort als „deck cycle" auftaucht.

     Beides ist eine Verengung auf das, was die Regel je gemeint hat, keine Abschwächung: an
     ANZEIGETEXT ändert sich nichts, und die Gegenprobe unten bricht die Naht weiterhin auf. */
  const stripVars = (s) => String(s).replace(/\{\w+\}/g, " ");
  const isMatchList = (k) => /^glossary\..+\.match$/.test(k);

  it("kanonische Begriffe werden durchgängig verwendet", () => {
    const bad = [];
    for (const loc of READY_TARGETS) {
      for (const term of TERMS[loc] || []) {
        for (const k of KEYS_SRC) {
          if (!(k in CATS[loc]) || isMatchList(k) || !term.de.test(stripVars(SRC[k]))) continue;
          const ziel = CATS[loc][k];
          if (!term.ok.test(ziel)) bad.push(`${k} (${loc}) — ${term.name}\n     ${SOURCE_LOCALE}: ${SRC[k]}\n     ${loc}: ${ziel}`);
          else if (term.never && term.never.test(ziel)) bad.push(`${k} (${loc}) — verbotenes Synonym (${term.name})\n     ${loc}: ${ziel}`);
        }
      }
    }
    expect(bad, `Begriffsbruch gegen das Übersetzerpaket §3:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  /* Ohne diese Gegenprobe könnte eine vierte Sprache ohne eigene Begriffstabelle ankommen und der
     Wächter darüber liefe grün, weil er über eine leere Liste iteriert. Eine fertige Sprache OHNE
     Tabelle ist keine geprüfte Sprache. Eine noch unfertige darf eine leere haben — sie hat ja
     auch noch keinen Text. */
  it("jede fertige Zielsprache hat eine eigene Begriffstabelle, und sie ist nicht leer", () => {
    for (const loc of READY_TARGETS) {
      expect(Array.isArray(TERMS[loc]), `${loc}: keine Begriffstabelle`).toBe(true);
      expect(TERMS[loc].length, `${loc}: leere Begriffstabelle bei fertiger Sprache`).toBeGreaterThan(0);
    }
  });

  /* Gegenprobe zur Marken-Zeile oben: die Tabelle prüft nur Schlüssel, in denen SCHON das deutsche
     Wort steht. Ein neuer englischer Text darf den deutschen Titel aber auch dann nicht tragen, wenn
     die deutsche Seite ihn gar nicht nennt (und umgekehrt) — deshalb hier über den ganzen Katalog. */
  /* Die Marke wechselt MIT der Sprache. Entschieden am 18.08.2026 für Englisch (der deutsche Titel
     trägt „Stich" sichtbar, das Spiel sagt seinen eigenen Mechanismus im Namen; englisch liest sich
     „Autostich" als Nähbegriff). Am 26.08.2026 auf Spanisch angewandt statt neu verhandelt: der
     spanische Stich ist die „baza", also Autobaza. Die Marke folgt damit in jeder Sprache derselben
     Abbildung wie das Wort in ihr (Stich → trick → baza). */
  /* #zh-hans, 26.08.2026: dieselbe Abbildung ein drittes Mal angewandt statt neu verhandelt.
     Der chinesische Stich ist die 墩, also 自动墩 — „automatischer Stich", die Konstruktion von
     Autostich und Autobaza. Die Order zum Muster sagte noch „Autostich nicht übersetzen"; das
     war vor dieser Regel geschrieben und ist damit überholt, denn zwei Sprachen mit derselben
     Marke entwerten die Kreuzprüfung unten. */
  const BRAND = { de: "Autostich", en: "Autotrick", es: "Autobaza", "zh-Hans": "自动墩" };

  it("die Marke trägt je Sprache ihren eigenen Namen — nie über Kreuz", () => {
    for (const loc of LOCALE_IDS) {
      const foreign = LOCALE_IDS.filter((o) => o !== loc).map((o) => BRAND[o]);
      const re = new RegExp(foreign.join("|"), "i");
      const bad = KEYS[loc].filter((k) => re.test(CATS[loc][k]));
      expect(bad, `Fremder Spieltitel im Katalog ${loc} (eigener: ${BRAND[loc]}):\n  ${bad.join("\n  ")}`).toEqual([]);
    }
    // Die Wortmarke auf dem Startbildschirm ist der sichtbarste Träger — sie steht hier namentlich,
    // damit ein Umbau des Hubs sie nicht still auf einen Schlüssel ohne Marke umhängt.
    for (const loc of READY_LOCALE_IDS) {
      expect(CATS[loc]["start.logo.alt"], `${loc}: Wortmarke`).toBe(BRAND[loc].toUpperCase());
    }
  });

  it("jede angemeldete Sprache hat einen eingetragenen Markennamen", () => {
    for (const loc of LOCALE_IDS) {
      expect(BRAND[loc], `${loc}: kein Markenname in BRAND`).toBeTruthy();
    }
    // Zwei Sprachen mit derselben Marke würden die Kreuzprüfung oben stillschweigend entwerten.
    expect(new Set(Object.values(BRAND)).size, "zwei Sprachen tragen denselben Markennamen").toBe(LOCALE_IDS.length);
  });

  it("Stichpunkte heißen im Englischen TP (Trick Points), nicht SP", () => {
    expect(de["common.cur.sp"]).toBe("SP");
    expect(en["common.cur.sp"]).toBe("TP");
  });

  /* Die Score-Ansagen sind eingefroren (Übersetzerpaket §3.6, Freigabe 15.08.2026). Sie stehen
     heute noch als BIG_SCORE_TIERS in Battlefield.jsx und wandern bei deren Migration in den
     Katalog — dieser Test hält die Zuordnung fest, damit sie den Umzug unverändert übersteht.
     „STRONG" ist bewusst NICHT die unterste Stufe: die Kette muss hörbar steigern.

     AMENDED 2026-08-23 (playtest-fixes). The owner renamed the lowest English step FIERCE -> NICE.
     The pair below was pulled FORWARD to the new value, not relaxed: the guard still fails the
     moment a German announcement and its English counterpart stop matching, and it still holds
     „Stark" as the German side. The two prose strings that name the ladder — `options.float.desc`
     and `fx.starfield.desc` — were carried along in the same change; the first of them is what
     this guard catches when it is forgotten. */
  it("die Score-Ansagen halten die freigegebene Eskalationskette", () => {
    const CHAIN = [["Stark", "NICE"], ["Brutal", "BRUTAL"], ["Irre", "INSANE"], ["Gottgleich", "GODLIKE"],
      ["Lawine", "AVALANCHE"], ["Gönn dir", "LET’S GO!"]];
    /* FIRST the announcements THEMSELVES, by key. Counter-checked 2026-08-23 while renaming the
       lowest step: setting `bf.big.fierce` back to "FIERCE" left the loop below GREEN, because
       `isAbout` only looks at strings that already name a step — a value that drifts OFF the chain
       names none of them and was skipped. The loop guarded the prose about the ladder and never the
       ladder itself. This block closes that hole: every `bf.big.*` key must carry a released pair,
       and there must be exactly as many of them as the chain has steps. */
    const bigKeys = KEYS_DE.filter((k) => k.startsWith("bf.big."));
    expect(bigKeys.length, `bf.big.*-Schlüssel: ${bigKeys.join(", ")}`).toBe(CHAIN.length);
    for (const k of bigKeys) {
      const pair = CHAIN.find(([deWord]) => deWord === de[k]);
      expect(pair, `${k}: „${de[k]}" steht nicht in der freigegebenen Kette`).toBeTruthy();
      expect(en[k], `${k}: „${de[k]}" → muss „${pair[1]}" sein`).toBe(pair[1]);
    }

    // Dann die Texte, die ÜBER die Ansagen reden — erkennbar daran, dass sie mindestens
    // eine Stufe in Versalien nennen. Ohne diese Einschränkung schlüge das Adverb „stark" in
    // beliebigen Sätzen an („entlastet schwache Geräte stark").
    const isAbout = (s) => CHAIN.some(([, enWord]) => s.includes(enWord.replace("!", "")));
    const bad = [];
    for (const k of KEYS_DE) {
      if (!(k in en) || !isAbout(en[k])) continue;
      for (const [deWord, enWord] of CHAIN) {
        if (!new RegExp(`\\b${deWord}\\b`).test(de[k])) continue;   // case-sensitiv: die Ansage ist ein Name
        if (!en[k].includes(enWord)) bad.push(`${k}: „${deWord}" → muss „${enWord}" sein\n     en: ${en[k]}`);
      }
    }
    expect(bad, `Score-Ansage weicht von der Freigabe ab:\n  ${bad.join("\n  ")}`).toEqual([]);
    expect(CHAIN.map((c) => c[1])).not.toContain("STRONG");
  });
});

describe("i18n · Längenschranken", () => {
  /* Die Formations-Badges sitzen als EIN Zeichen auf der Karte. Zwei Zeichen sprengen das Layout,
     zwei gleiche Zeichen machen zwei Formationen ununterscheidbar. Gilt in JEDER Sprache. */
  // VERLANGEND: über die fertigen Sprachen. Ein Katalog in Arbeit hat noch gar keine Kürzel.
  it("Formations-Kürzel sind je genau ein Zeichen und paarweise verschieden", () => {
    for (const name of READY_LOCALE_IDS) {
      const cat = CATS[name];
      const abbrs = Object.entries(cat).filter(([k]) => /^formation\..+\.abbr$/.test(k));
      expect(abbrs.length, `${name}: keine Kürzel im Katalog`).toBeGreaterThan(0);
      const bad = abbrs.filter(([, v]) => [...v].length !== 1);
      expect(bad, `${name}: Kürzel mit ≠1 Zeichen → ${bad.map(([k, v]) => `${k}="${v}"`).join(", ")}`).toEqual([]);
      const vals = abbrs.map(([, v]) => v);
      expect(new Set(vals).size, `${name}: Kürzel kollidieren → ${vals.join(" ")}`).toBe(vals.length);
    }
  });

  /* Die Raritätsleiter darf im Englischen NICHT auf „Legendary" enden: legendär ist bei uns eine
     eigene Achse (Übersetzerpaket §3.5, genre-terminologie.md §3). */
  it("die englische Raritätsleiter endet auf Epic, nicht Legendary", () => {
    expect([1, 2, 3, 4].map((n) => en[`rarity.tier${n}.label`]))
      .toEqual(["Common", "Uncommon", "Rare", "Epic"]);
  });

  /* enMeta.js hält „Rare"/„Epic" als eigene Konstanten (en.js importiert die Datei → kein Zugriff
     auf die Leiter). Dieser Test ist die Naht: benennt jemand die Leiter um, fliegt es hier auf. */
  it("Texte, die Raritätsnamen einsetzen, benutzen dieselben Wörter wie die Leiter", () => {
    for (const k of ["weekmod.perkCap.desc", "weekmod.perkBlessing.desc", "node.tier3.detail", "node.tier4.detail"]) {
      const tier = /tier3/.test(k) ? 3 : /tier4/.test(k) ? 4 : null;
      const need = tier ? [en[`rarity.tier${tier}.label`]] : [en["rarity.tier3.label"], en["rarity.tier4.label"]];
      for (const w of need) expect(en[k], `${k} muss „${w}" nennen`).toContain(w);
    }
  });
});

describe("i18n · Glossar-Wortformen", () => {
  /* Die `match`-Listen sind KEIN Anzeigetext — sie steuern die Auto-Fettung in jeder Beschreibung.
     Für Englisch wurden sie neu geschrieben (Plurale, Verbformen), nicht übersetzt. Zwei Dinge
     müssen stimmen, sonst fettet das Spiel still falsch oder gar nicht. */
  const forms = (cat) => Object.entries(cat)
    .filter(([k]) => /^glossary\..+\.match$/.test(k))
    .map(([k, v]) => [k, String(v).split("|").filter(Boolean)]);

  it("jeder Eintrag hat mindestens eine Wortform, keine leer, keine doppelt", () => {
    for (const name of READY_LOCALE_IDS) {
      const all = forms(CATS[name]);
      expect(all.length, `${name}: keine Wortformen im Katalog`).toBeGreaterThan(0);
      const bad = all.filter(([, list]) => !list.length || list.some((f) => f !== f.trim() || !f));
      expect(bad.map(([k]) => k), `${name}: leere/ungetrimmte Wortform`).toEqual([]);
      const dupes = all.filter(([, list]) => new Set(list).size !== list.length);
      expect(dupes.map(([k]) => k), `${name}: Wortform doppelt im selben Eintrag`).toEqual([]);
    }
  });

  it("die Auto-Fettung ist in jeder fertigen Sprache verlustfrei", () => {
    const before = getLocale();
    for (const name of READY_LOCALE_IDS) {
      setLocale(name);
      const texts = Object.entries(CATS[name])
        .filter(([k]) => /^(ability|family|perk)\..*\.(desc|text)$/.test(k))
        .map(([, v]) => v);
      let hits = 0;
      for (const text of texts) {
        const parts = tokenizeGlossary(text);
        expect(parts.map((p) => p.text).join(""), `${name}: Tokenizer verändert den Text`).toBe(text);
        hits += parts.filter((p) => p.bold).length;
      }
      // Greift die Fettung überhaupt? Ohne diese Schranke könnte eine kaputte EN-Wortformliste
      // unbemerkt NULL Treffer liefern — der Roundtrip allein würde das nicht merken.
      expect(hits, `${name}: die Auto-Fettung greift praktisch nicht`).toBeGreaterThan(texts.length / 2);
    }
    setLocale(before);
  });
});

describe("i18n · Auflösung", () => {
  it("t() interpoliert, respektiert die Sprache und fällt nie auf „undefined“ zurück", () => {
    expect(t("start.resume.sub", { cycle: 3, total: 50, score: "1.000" }, "de")).toBe("Durchlauf 3/50 · Score 1.000");
    expect(t("start.resume.sub", { cycle: 3, total: 50, score: "1,000" }, "en")).toBe("Cycle 3/50 · Score 1,000");
    expect(t("gibt.es.nicht")).toBe("gibt.es.nicht");                 // Schlüssel statt „undefined"
    expect(interpolate("a {x} b", {})).toBe("a {x} b");               // fehlende Variable bleibt sichtbar
  });

  it("t() wählt die Plural-Form über `count`", () => {
    expect(t("start.tile.lock", { count: 1 }, "de")).toBe("🔒 noch 1 Lauf");
    expect(t("start.tile.lock", { count: 3 }, "de")).toBe("🔒 noch 3 Läufe");
    expect(t("start.tile.lock", { count: 1 }, "en")).toBe("🔒 1 more run");
    expect(t("start.tile.lock", { count: 3 }, "en")).toBe("🔒 3 more runs");
  });

  it("setLocale akzeptiert nur FERTIGE Sprachen", () => {
    const before = getLocale();
    expect(setLocale("de")).toBe("de");
    expect(setLocale("klingonisch")).toBe(DEFAULT_LOCALE);   // Rückfall statt kaputter UI
    /* Eine angemeldete, aber unfertige Sprache wird genauso abgewiesen wie eine unbekannte.
       Das ist der Punkt, an dem „angemeldet" und „ausgeliefert" auseinandergehen: ein altes
       `options.lang: "es"` aus dem localStorage darf keine halb übersetzte UI aufmachen. */
    const unfertig = LOCALE_IDS.filter((id) => !READY_LOCALE_IDS.includes(id));
    for (const loc of unfertig) {
      expect(setLocale(loc), `${loc} ist nicht ready und darf nicht wählbar sein`).toBe(DEFAULT_LOCALE);
    }
    setLocale(before);
    expect(LOCALE_IDS).toEqual(["de", "en", "es", "zh-Hans"]);
    /* Zwischen dem 26.08.2026 und der Anmeldung von zh-Hans war JEDE angemeldete Sprache auch
       ausgeliefert, und die Schleife darüber lief über eine leere Menge. Damals wurde das hier
       ausgesprochen statt verschwiegen, mit der Ansage, sie schärfe sich wieder, sobald eine
       vierte Sprache angemeldet wird.

       Genau das ist jetzt eingetreten (#zh-hans): der Katalog ist ein Fixture aus der
       Muster-Übersetzung und bewusst unvollständig. Die Schleife misst damit wieder etwas —
       nämlich dass `setLocale` eine angemeldete, aber unfertige Sprache abweist. */
    expect(unfertig, "angemeldet, aber nicht ausgeliefert").toEqual(["zh-Hans"]);
    expect(READY_LOCALE_IDS).toEqual(["de", "en", "es"]);
  });

  /* Die Rückfallkette, und zwar an der Stelle, die einen Spieler betrifft. Ohne sie fiele ein
     fehlender spanischer Schlüssel auf SOURCE_LOCALE zurück — ein spanischer Spieler bekäme
     DEUTSCH zu sehen, nicht Englisch.

     DIE SONDE IST BEWUSST KÜNSTLICH (#es-translate). Bis hierher prüfte dieser Test die Kette an
     `common.close` und verließ sich darauf, dass der spanische Katalog LEER ist. Das war eine
     Sonde mit Verfallsdatum: sobald Spanisch den Schlüssel selbst führt, löst `t()` ihn direkt
     auf, die Kette wird gar nicht mehr betreten — und der Test wäre grün geblieben, ohne noch
     irgendetwas zu prüfen. Genau dieser stille Ausgang ist schlimmer als ein roter Test.

     Ein Schlüssel, der zur Laufzeit aus dem ZIELKATALOG genommen und danach zurückgelegt wird,
     erzwingt den Rückfall bei JEDEM Füllstand — auch bei voller Parität. `catalog()` liefert das
     lebende Objekt, das `t()` selbst benutzt; deshalb wirkt das Entfernen, und deshalb muss das
     Zurücklegen in `finally` stehen. */
  it("eine Sprache mit `via` fällt erst dorthin zurück, nicht sofort auf die Quellsprache", () => {
    const esCat = catalog("es");
    const probe = "common.close";
    const had = Object.prototype.hasOwnProperty.call(esCat, probe);
    const saved = esCat[probe];
    // Vorbedingung der Sonde: die beiden Rückfallstufen müssen sich unterscheiden, sonst wiese
    // die Prüfung darunter nichts nach.
    expect(en[probe]).not.toBe(de[probe]);
    try {
      delete esCat[probe];
      expect(t(probe, null, "es")).toBe(en[probe]);
      expect(t(probe, null, "es")).not.toBe(de[probe]);
    } finally {
      if (had) esCat[probe] = saved;
    }
    expect(t("gibt.es.nicht", null, "es")).toBe("gibt.es.nicht");   // Kette erschöpft → Schlüssel
  });

  /* DIE RATSCHE, die aus dem `ready`-Schalter etwas anderes macht als eine Ausnahme.

     `ready: false` nimmt eine Sprache aus den VERLANGENDEN Prüfungen heraus. Das ist nur so lange
     ehrlich, wie es vorübergehend ist. Ohne diesen Test wäre der stille Ausgang offen: jemand füllt
     den spanischen Katalog fertig, niemand denkt an das Flag, und die Sprache ist vollständig
     übersetzt, aber unerreichbar — während die Paritätsprüfung sie weiterhin überspringt und damit
     ab da wirklich abgeschwächt WÄRE.

     Hier fliegt genau das auf: sobald ein unfertiger Katalog Schlüssel-Parität erreicht, wird die
     Suite rot und verlangt das Flag. Das Flag kann nicht verrotten. */
  it("eine unfertige Sprache, die vollständig ist, verlangt `ready: true`", () => {
    for (const loc of LOCALE_IDS.filter((id) => !READY_LOCALE_IDS.includes(id))) {
      const fehlt = KEYS_SRC.filter((k) => !(k in CATS[loc]));
      expect(fehlt.length,
        `${loc} ist vollständig übersetzt (${KEYS_SRC.length} Schlüssel) — setz \`ready: true\` in LOCALES, `
        + "sonst überspringen die verlangenden Wächter einen fertigen Katalog").toBeGreaterThan(0);
    }
  });

  /* Zwei Standards, die gern verwechselt werden — der Test hält sie auseinander:
     Geschrieben wird auf Deutsch (Quellsprache, immer vollständig → Rückfall bei fehlendem
     Schlüssel), ausgeliefert wird an neue Spieler auf Englisch (Produktentscheidung). */
  it("Quellsprache ist Deutsch, Auslieferungs-Standard ist Englisch", () => {
    expect(SOURCE_LOCALE).toBe("de");
    expect(DEFAULT_LOCALE).toBe("en");
    // Ein Schlüssel, den es nur auf Deutsch gäbe, fiele auf Deutsch zurück — nie auf den Schlüssel.
    expect(t("common.close", null, "de")).toBe("Schließen");
    expect(t("common.close", null, "en")).toBe("Close");
  });
});

describe("i18n · Ratsche gegen neue deutsche Inline-Texte", () => {
  /* Migrierte Dateien holen ihre Texte AUSSCHLIESSLICH über t(). Diese Liste wächst mit jeder
     migrierten Datei und schrumpft nie — so kann eine schon zweisprachige Ansicht nicht durch
     einen schnellen Zugang wieder einsprachig werden. Neue Dateien hier eintragen, sobald sie
     migriert sind. */
  const MIGRATED = ["src/ui/OptionsModal.jsx", "src/ui/StartScreen.jsx", "src/ui/UsernameModal.jsx",
    "src/ui/GameOver.jsx",
    // Die vier Fraktions-Leisten — sie laufen im Stichspiel dauerhaft mit.
    "src/ui/HeatBar.jsx", "src/ui/ChargeBar.jsx", "src/ui/GlacierBar.jsx", "src/ui/PlantBar.jsx",
    // Die Spielschleife selbst: Kopfleiste, Seitenleiste, Brett, Aufstellungsphase.
    "src/ui/StatusBar.jsx", "src/ui/StatusRail.jsx", "src/ui/Battlefield.jsx", "src/ui/FormationPhase.jsx",
    // Die Entscheidungen eines Durchlaufs — Angebote, Ziel-Auswahlen und die Panels, die sie begleiten.
    "src/ui/SkillSelect.jsx", "src/ui/PerkSelect.jsx", "src/ui/LegendarySelect.jsx", "src/ui/GlacierPick.jsx",
    "src/ui/TargetSelect.jsx", "src/ui/FamilyTargetSelect.jsx", "src/ui/RoundScoreBadge.jsx",
    "src/ui/TrickBreakdown.jsx",
    "src/ui/FormationPanel.jsx", "src/ui/GlacierFormLegend.jsx", "src/ui/CardDetail.jsx",
    "src/ui/CardGrid.jsx", "src/ui/ArchPanels.jsx",
    // #arch-eff: die Effektzeile unter jedem Gebäude. Baute ihre Sätze bis 19.08.2026 aus deutschen
    // Vorlagen zusammen — im englischen Build stand damit Deutsch in Aufstellungsphase, Chronik,
    // Endscreen und Level-up-Flügel. Die Ratsche konnte es nicht sehen (Template-Literale in einer
    // Hilfsdatei, kein JSX-Text); ab hier hält sie es fest.
    "src/ui/archEffects.js",
    // Der Architekt — der größte Einzelbildschirm des Spiels.
    "src/ui/ArchitectScreen.jsx",
    // Nach dem Lauf: Statistik, Chronik, Bestenliste und ihre Bausteine.
    "src/ui/StatsScreen.jsx", "src/ui/RunStats.jsx", "src/ui/RunDetail.jsx", "src/ui/RunGraphs.jsx",
    "src/ui/ChronikOverview.jsx", "src/ui/LeaderboardScreen.jsx", "src/ui/GlobalLeaderboard.jsx",
    "src/ui/SeedChip.jsx", "src/ui/Sparkline.jsx", "src/ui/WeekMods.jsx",
    // Menü, Werkstatt und die restlichen Bausteine — damit ist die UI vollständig migriert.
    "src/App.jsx", "src/ui/CustomizeScreen.jsx", "src/ui/UpgradeScreen.jsx", "src/ui/DeckDetail.jsx",
    "src/ui/Glossary.jsx", "src/ui/GuideOverlay.jsx", "src/ui/Controls.jsx", "src/ui/PwaInstall.jsx",
    "src/ui/PerfOverlay.jsx", "src/ui/MusicBar.jsx", "src/ui/RunLoader.jsx",
    "src/ui/DevPerkCatalog.jsx", "src/ui/DevRunSetup.jsx",
    /* Hier stand `src/ui/tutorial/TutorialOverlay.jsx`, bis der geführte Lauf zurückgebaut wurde.
       Der Eintrag ist MIT der Datei gegangen, und das ist keine Aufweichung der Ratsche: der Wächter
       darunter heißt „zeigt nur auf existierende, i18n-nutzende Dateien" und liest jede Zeile mit
       readFileSync — ein Eintrag ohne Datei WIRFT, er wird nicht rot. Die Invariante der Liste ist
       „in einer migrierten Datei steht kein Text als Literal"; eine Datei, die es nicht mehr gibt,
       kann keinen halten. Kein anderer Eintrag wurde angefasst. */
    // Der Meilenstein-Balken lief bis zuletzt einsprachig mit — im Stichspiel dauerhaft sichtbar.
    "src/ui/ScoreMilestoneBar.jsx",
    // Build-Übersicht unter dem Brett und die zwei Listen, die sie teilt (#sprache-Nachzügler).
    "src/ui/BuildPanel.jsx", "src/ui/BuildSummary.jsx",
    // #lv-fluegel: die zwei Seitenleisten der Level-up-Karte.
    "src/ui/LevelupWings.jsx",
    // Datenschutz-Hinweis (#datenschutz) — von der ersten Zeile an zweisprachig gebaut.
    "src/ui/PrivacyModal.jsx",
    // Tutorial-Sektionen (#tutorial-sections) — von der ersten Zeile an zweisprachig gebaut.
    "src/ui/tutorial-sections/TutorialSections.jsx", "src/ui/tutorial-sections/beats.jsx"];

  /* In einer migrierten Datei steht KEIN Wort mehr als Literal — egal welcher Sprache. Deshalb
     wird nicht auf „deutsch aussehend" geprüft (das ließe „Normaler Lauf" durch, kein Umlaut),
     sondern auf „enthält überhaupt ein Wort". Symbole, Pfeile, Ziffern und einzelne Buchstaben
     (das „v" vor der Versionsnummer) bleiben erlaubt. */
  const HAS_WORD = /[A-Za-zÄÖÜäöüß]{3,}/;
  // Der Greifer >…< fischt zwangsläufig auch Code auf (das „>" eines Pfeils bis zum nächsten „<").
  // Alles mit Code-Zeichen fliegt raus — echter Anzeigetext enthält keine Klammern/Semikola/Gleichheitszeichen.
  const CODEISH = /[;=(){}[\]]|=>/;

  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  it("migrierte Dateien enthalten keinen fest verdrahteten Anzeigetext mehr", () => {
    const bad = [];
    for (const file of MIGRATED) {
      const src = stripComments(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
      // JSX-Textknoten: >…< sowie deutsche String-Literale in Text-Props (title/placeholder/aria-label/alt).
      const found = new Set();
      for (const m of src.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)) found.add(m[1]);
      for (const m of src.matchAll(/(?:title|placeholder|aria-label|alt|label)=\{?"([^"]+)"/g)) found.add(m[1]);
      for (const s of found) {
        if (HAS_WORD.test(s) && !CODEISH.test(s)) bad.push(`${file}: „${s.trim()}“`);
      }
    }
    expect(bad, `Fest verdrahteter Text in migrierter Datei — gehört in de.js/en.js:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("die Ratschen-Liste zeigt nur auf existierende, i18n-nutzende Dateien", () => {
    for (const file of MIGRATED) {
      const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      // App.jsx liegt eine Ebene höher (./i18n/), alles unter src/ui/ zwei (../i18n/).
      // Beliebige Tiefe: `./i18n/`, `../i18n/` — und `../../i18n/`, seit das Tutorial in src/ui/tutorial/ liegt.
      expect(src, `${file} steht in MIGRATED, importiert aber kein i18n`).toMatch(/from "(?:\.\.\/)*\.{1,2}\/i18n\//);
    }
  });
});

describe("i18n · Abdeckung wächst mit", () => {
  it("jeder Katalog-Schlüssel wird auch irgendwo benutzt", () => {
    /* Quelltext einmal einlesen (App + alle UI-Dateien + i18n-Konsumenten in src/game).
       src/i18n gehört dazu: labels.js baut die Register-Schlüssel dynamisch zusammen.

       TWO CORRECTIONS, 22.08.2026 — until then this guard could not fail at all, and the two reasons
       hid each other. Found by counter-check: a key added to both catalogues and used nowhere was
       still reported as used.

       1. THE WALK WAS FLAT. `readdirSync` on "src", "src/ui", "src/game", "src/i18n" reads the top
          level of each and nothing below it. `src/ui/tutorial/`, `src/ui/fx/`, `src/ui/fx/cardFx/`
          and `src/ui/indicators/` were therefore invisible — 42 `tutorial.*` keys are used in
          src/ui/tutorial/ and the guard never looked there. 194 files are scanned now; the flat walk
          saw about 130.

       2. THE CATALOGUES SCANNED THEMSELVES. de.js and en.js live in src/i18n, so every key matched
          its own definition — `"gameover.best.hint"` is in de.js, therefore "used". That is why
          defect 1 never surfaced: everything matched, always, for the wrong reason.

       Excluding the catalogues is what gives the guard teeth; walking recursively is what stops it
       from biting the innocent. Both are needed, and either one alone would be worse than neither. */
    /* Aus LOCALE_IDS gebaut, nicht als `(de|en)` getippt: ein neuer Katalog, der hier
       durchrutscht, würde seine eigenen Schlüssel als „benutzt" ausweisen und den Wächter genau
       so entwaffnen, wie es am 22.08.2026 schon einmal passiert ist (Defekt 2 im Block darüber). */
    const isCatalogue = (u) => new RegExp(`/i18n/(${LOCALE_IDS.join("|")})\\.js$`).test(u.pathname);
    const walk = (url, out = []) => {
      for (const f of readdirSync(url, { withFileTypes: true })) {
        if (f.isDirectory()) walk(new URL(`${f.name}/`, url), out);
        else if (/\.(js|jsx)$/.test(f.name)) out.push(new URL(f.name, url));
      }
      return out;
    };
    const files = walk(new URL("../src/", import.meta.url)).filter((u) => !isCatalogue(u));
    const src = files.map((u) => readFileSync(u, "utf8")).join("\n");
    /* One pass to build the lookup sets, then O(1) per key.

       The previous version asked `src.includes(...)` once or more per key: 2526 keys against 2.56 MB,
       up to nine probes each. Measured at 1992 ms — against vitest's 5 s default, with 135 files
       competing for cores. It passed on an idle machine and timed out on a busy one, which is the
       worst way for a guard to behave: the red then says nothing about the code. Measured after the
       change: 1.2 ms, and the same verdict for every one of the 2526 keys.

       The sets answer EXACTLY the question the substring scan asked, INCLUDING where it was loose.
       `"X"` occurs in the source precisely when X is one of the segments between two quotes, so
       splitting on the quote and dropping the outer two segments is that set — the head has no quote
       before it, the tail none after it. Reproducing the looseness is the point: `a` and
       `options.rfx.zzzz` count as used here, exactly as they did before. Tightening this guard is a
       separate decision, not something a speed fix may smuggle in. */
    const between = (q) => new Set(src.split(q).slice(1, -1));
    const dq = between('"');
    const sq = between("'");
    /* Every `prefix. that follows a backtick. The window is the longest key plus its dot: nothing
       longer can ever be asked for, so a wider slice would only cost memory. */
    const win = Math.max(...KEYS_DE.map((k) => k.length)) + 1;
    const tpl = new Set();
    for (let i = src.indexOf("`"); i !== -1; i = src.indexOf("`", i + 1)) {
      const tail = src.slice(i + 1, i + 1 + win);
      for (let d = tail.indexOf("."); d !== -1; d = tail.indexOf(".", d + 1)) tpl.add(tail.slice(0, d + 1));
    }

    /* NO EXCEPTION LIST, and that is the decision rather than an omission.

       The corrected walk found exactly one genuinely dead key on 22.08.2026, `gameover.best.hint`.
       It was carried here as a named exception for one commit and then deleted instead, because an
       exception asserts "the guard is wrong here" and the guard was right: the key was dead. Using
       the list to mean "maybe later" overloads the mechanism, and the next dead key joins it the same
       way until the list is the actual state rather than a rare, argued departure from it.

       So a dead key has two honest answers — wire it up or delete it — and no third one. If a case
       ever genuinely needs an exception, add the list back WITH the argument, and with the assertion
       that every entry is still dead; an exception that has quietly become stale would hide the next
       dead key that happens to share its name. */
    const unused = KEYS_DE.filter((k) => {
      const base = k.replace(/_(one|other)$/, "");
      if (dq.has(base) || sq.has(base)) return false;
      /* Dynamisch zusammengesetzte Schlüssel erkennen. Die Einsetzstelle kann auf JEDER Ebene
         liegen: `options.rfx.${v}` (hinten) genauso wie `formation.${type}.label` (in der Mitte).
         Deshalb jedes Präfix von links prüfen, nicht nur das längste. */
      const parts = base.split(".");
      for (let i = 1; i <= parts.length; i++) {
        if (tpl.has(parts.slice(0, i).join(".") + ".")) return false;
      }
      return true;
    });
    expect(unused, `Toter Katalog-Eintrag (nirgends per t() gerufen):\n  ${unused.join("\n  ")}`).toEqual([]);
  });
});
