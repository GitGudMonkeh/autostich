/* #perkart — Embleme der Perk-Wahl (Desktop ab 1400 px).
   -------------------------------------------------------------------------------------------------
   Gebaut nach dem Muster von test/skill-art.test.js, mit EINER Prüfsorte mehr, weil dieser Bildschirm
   eine hat, die es dort nicht gibt:

   1. Die ZUORDNUNG wird nachgerechnet — beide Parser bekommen echte Dateinamen. Die Verbindung
      Bild ↔ Perk hängt allein am Dateinamen.
   2. Die VOLLSTÄNDIGKEIT je Los, in beide Richtungen: jede der 7 Kategorien und jeder der 21
      legendären Perks hat sein Emblem, und keine Datei gehört zu nichts.
   3. Die TRENNUNG DER BEIDEN BEVÖLKERUNGEN. Das ist die neue: auf diesem Bildschirm stehen reguläre
      und legendäre Perks in DERSELBEN Kachelreihe, und ein Rückfall von der einen Karte auf die
      andere wäre im Code unsichtbar und auf dem Schirm sofort falsch. Geprüft wird deshalb nicht nur,
      dass die richtigen Bilder kommen, sondern dass die falschen NICHT kommen — auch dann nicht, wenn
      das einzig verfügbare Bild das der anderen Sorte wäre.
   4. Die VERDRAHTUNG als Quelltext-Ratsche über PerkSelect.jsx + index.css (das Projekt hat kein
      Component-Test-Setup, s. test/fx-panel.test.js).

   Zu 4, ausdrücklich: eine Quelltext-Ratsche prüft die Schreibweise, nicht das Bild. Dass der Streifen
   GUT aussieht, kann diese Datei nicht wissen — das entscheidet der Sicht-Gate V3
   (docs/engineering/task-lifecycle.md §8). Grün hier heißt: die Naht ist da, nicht: sie sitzt schön. */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { perkCatArtIdFromFile, legendaryArtIdFromFile, perkArt, perkCatArt, legendaryPerkArt } from "../src/ui/perkArt.js";
import { CATEGORIES, PERK_DEFS, rarityOf } from "../src/game/perks.js";
import { FAMILY_LIST } from "../src/game/families.js";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const dir = (p) => readdirSync(new URL(`../src/${p}`, import.meta.url));
const jsx = src("ui/PerkSelect.jsx");
const css = src("index.css");

const LEG_IDS = Object.values(PERK_DEFS).filter((p) => p.rarity === "legendary").map((p) => p.id);

describe("#perkart — Zuordnung über den Dateinamen", () => {
  it("liest den Kategorie-Schlüssel aus dem Kategorie-Dateinamen", () => {
    expect(perkCatArtIdFromFile("perkcat_A_deck.webp")).toBe("A");
    expect(perkCatArtIdFromFile("perkcat_P_praezision.webp")).toBe("P");
  });

  it("erfindet aus einem Fremdnamen keinen Kategorie-Schlüssel", () => {
    expect(perkCatArtIdFromFile("README.md")).toBeNull();
    expect(perkCatArtIdFromFile("deck.webp")).toBeNull();
    expect(perkCatArtIdFromFile("perkcat_A.webp")).toBeNull();      // ohne Lesehilfe — Muster nicht erfüllt
    expect(perkCatArtIdFromFile("perkcat_AB_deck.webp")).toBeNull(); // zwei Buchstaben sind kein Schlüssel
    // Der Kategorie-Parser darf KEINE Legendär-Datei annehmen, sonst hinge ein Emblem an beiden Karten.
    expect(perkCatArtIdFromFile("L_ZINS_zinseszins.webp")).toBeNull();
  });

  it("trennt bei den Legendären ID und Lesehilfe an der Schreibweise, nicht an der Position", () => {
    // Kurze IDs ohne Unterstrich UND lange mit — über „drittes Segment" ginge nur eine der beiden Formen.
    expect(legendaryArtIdFromFile("L2_unaufhaltsam.webp")).toBe("L2");
    expect(legendaryArtIdFromFile("L4_kritische-masse.webp")).toBe("L4");
    expect(legendaryArtIdFromFile("L_ZINS_zinseszins.webp")).toBe("L_ZINS");
    expect(legendaryArtIdFromFile("L_BRENN_brennpunkt.webp")).toBe("L_BRENN");
  });

  it("gibt bei den Legendären null zurück, statt eine ID zu erfinden", () => {
    expect(legendaryArtIdFromFile("README.md")).toBeNull();
    expect(legendaryArtIdFromFile("zinseszins.webp")).toBeNull();
    expect(legendaryArtIdFromFile("L_ZINS.webp")).toBeNull(); // ohne Lesehilfe — Muster nicht erfüllt
  });
});

describe("#perkart — Vollständigkeit der Kategorie-Embleme", () => {
  const files = dir("assets/perkcats").filter((f) => f.endsWith(".webp"));
  const have = new Set(files.map(perkCatArtIdFromFile));

  it("kennt überhaupt Kategorien (sonst wäre der Test still grün)", () => {
    expect(Object.keys(CATEGORIES).length).toBe(7);
  });

  it("jede Kategorie hat ein Emblem", () => {
    const fehlt = Object.keys(CATEGORIES).filter((k) => !have.has(k));
    expect(fehlt, `ohne Emblem: ${fehlt.join(", ")}`).toEqual([]);
  });

  it("jedes Kategorie-Emblem gehört zu einer Kategorie — keine Leiche im Ordner", () => {
    const verwaist = [...have].filter((k) => !CATEGORIES[k]);
    expect(verwaist, `ohne Kategorie: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("jeder Dateiname erfüllt das Muster (kein stiller Ausfall über null)", () => {
    expect(files.filter((f) => perkCatArtIdFromFile(f) === null)).toEqual([]);
  });

  it("jede angebotene Familie landet damit auf einem vorhandenen Emblem", () => {
    // Der eigentliche Zweck der sieben Bilder: 73 Familien, 7 Embleme, keine Lücke. Diese Prüfung
    // geht den Weg, den der Bildschirm geht — Familie → Kategorie → Bild — statt nur die Endpunkte.
    expect(FAMILY_LIST.length).toBeGreaterThanOrEqual(73);
    const ohne = FAMILY_LIST.filter((f) => !have.has(f.cat)).map((f) => `${f.id}(${f.cat})`);
    expect(ohne, `Familie ohne Kategorie-Emblem: ${ohne.join(", ")}`).toEqual([]);
  });
});

describe("#perkart — Vollständigkeit der Legendär-Embleme", () => {
  const files = dir("assets/legendaries").filter((f) => f.endsWith(".webp"));
  const have = new Set(files.map(legendaryArtIdFromFile));

  it("kennt überhaupt legendäre Perks (sonst wäre der Test still grün)", () => {
    expect(LEG_IDS.length).toBe(21);
  });

  it("jeder legendäre Perk hat sein eigenes Emblem", () => {
    const fehlt = LEG_IDS.filter((id) => !have.has(id));
    expect(fehlt, `ohne Emblem: ${fehlt.join(", ")}`).toEqual([]);
  });

  it("jedes Legendär-Emblem gehört zu einem legendären Perk — keine Leiche im Ordner", () => {
    const verwaist = [...have].filter((id) => !LEG_IDS.includes(id));
    expect(verwaist, `ohne legendären Perk: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("jeder Dateiname erfüllt das Muster (kein stiller Ausfall über null)", () => {
    expect(files.filter((f) => legendaryArtIdFromFile(f) === null)).toEqual([]);
  });

  it("E10 ist bewusst NICHT dabei — der Ordner ist der Legendär-Satz, nicht der Perk-Satz", () => {
    // Kontrakt-Frage Q3: E10 „Feinjustierung" ist offerable:false und damit nie auf einer Kachel. Es
    // ist auch nicht legendär, fällt also nicht unter die Regel oben. Hier festgehalten, damit ein
    // späterer Leser die Lücke als Entscheidung erkennt und nicht als Vergessen.
    expect(PERK_DEFS.E10.offerable).toBe(false);
    expect(rarityOf("E10")).not.toBe("legendary");
    expect(have.has("E10")).toBe(false);
  });
});

describe("#perkart — die beiden Bevölkerungen fallen NICHT aufeinander zurück", () => {
  /* Die Gefahr, gegen die das geschrieben ist: beide Sorten laufen durch denselben `<button>` in
     derselben Reihe, und ein gemeinsamer Rückfall („kein eigenes Bild? dann eben das der Kategorie")
     wäre eine plausible Zeile Code. Sie wäre für den regulären Perk ein fremdes Motiv und für den
     legendären eine stille Herabstufung — beides sieht man erst auf dem Schirm.

     Gegengeprüft wurde die Naht, indem `perkArt` testweise auf einen gemeinsamen Rückfall umgebaut
     wurde (`LEG[id] || CAT[catKey]`): die beiden Erwartungen unten schlagen dann fehl, die
     Vollständigkeits-Blöcke oben bleiben grün. Der Wächter greift also genau da, wo er soll. */
  const legView = { isFamily: false, leg: true, entry: "L_ZINS", catKey: "C" };
  const famView = { isFamily: true, entry: { familyId: "C_GUARD", tier: 1 }, catKey: "C" };
  const flatView = { isFamily: false, leg: false, entry: "E10", catKey: "E" };

  it("der reguläre Perk bekommt das Emblem SEINER Kategorie", () => {
    expect(perkArt(famView)).toBe(perkCatArt("C"));
    expect(perkArt(flatView)).toBe(perkCatArt("E"));
  });

  it("der legendäre Perk bekommt SEIN eigenes Emblem, nicht das seiner Kategorie", () => {
    expect(perkArt(legView)).toBe(legendaryPerkArt("L_ZINS"));
    expect(perkArt(legView)).not.toBe(perkCatArt("C")); // L_ZINS ist Kategorie C — der Rückfall wäre hier möglich
  });

  it("ein unbekannter legendärer Perk zeigt KEIN Bild statt eines fremden", () => {
    expect(perkArt({ isFamily: false, leg: true, entry: "L_GIBTESNICHT", catKey: "C" })).toBeNull();
  });

  it("ein unbekannter Kategorie-Schlüssel zeigt KEIN Bild statt eines legendären", () => {
    expect(perkArt({ isFamily: true, entry: { familyId: "X", tier: 1 }, catKey: "X" })).toBeNull();
  });

  it("kein Kategorie-Schlüssel ist zugleich eine Legendär-ID (die Trennung ist auch datenseitig echt)", () => {
    const doppelt = Object.keys(CATEGORIES).filter((k) => LEG_IDS.includes(k));
    expect(doppelt, `Schlüssel in beiden Räumen: ${doppelt.join(", ")}`).toEqual([]);
  });
});

describe("#perkart — Verdrahtung", () => {
  it("das Emblem hängt am Breiten-Gate, nicht an CSS", () => {
    // Ohne diese Zeile rendert das <img> auch am Handy — der Browser lädt dann Bilder für eine
    // Ansicht, die sie gar nicht zeigt.
    expect(jsx).toContain("const art = inWings ? perkArt(v) : null;");
    expect(jsx).toContain("const inWings = useIsWide();");
  });

  it("die Kachel ohne Bild behält ihren Baum (Handy bleibt unberührt)", () => {
    expect(jsx).toContain('${art ? " pk-offer-art" : ""}');
    expect(jsx).toContain("{art && <img");
  });

  it("das Emblem bindet am Kategorie-SCHLÜSSEL, nicht am übersetzten Namen", () => {
    // `cat.name` ist „Deck"/„Trick" je nach Sprache. Hinge das Bild daran, verschwände es im
    // englischen Lauf — ein Fehler, den kein deutscher Testlauf je sehen würde.
    expect(jsx).toContain("catKey: fam.cat");
    expect(jsx).toContain("catKey: p.cat");
  });

  it("nur die Legendären hängen mittig — und an derselben Bedingung wie ihr Gold-Rahmen", () => {
    /* Die Kategorie-Embleme sind für die oberen 76 % komponiert, die legendären mittig (Messung an
       der Regel in index.css). Zwei Dinge können hier lautlos brechen: der Anker verschwindet, oder
       er wandert an eine ZWEITE Definition von „legendär" — dann trüge ein Perk irgendwann den
       Gold-Rahmen und den falschen Anker. Deshalb wird die Bedingung selbst festgehalten. */
    expect(jsx).toContain('`pk-strip${(!v.isFamily && v.leg) ? " pk-strip-mid" : ""}`');
    expect(jsx).toContain('(!v.isFamily && v.leg) ? " as-legendary" : ""');
    expect(css).toContain(".pk-strip-mid { object-position: center center; }");
  });

  it("der Streifen trägt die Klasse, die den schwarzen Grund verschwinden lässt", () => {
    expect(jsx).toContain("className={`pk-strip${");
    const regel = css.slice(css.indexOf(".pk-strip {"), css.indexOf(".pk-strip {") + 420);
    expect(regel).toContain("mix-blend-mode: screen");
    expect(regel).toContain("height: 201px");          // 76 % der gemessenen 265-px-Bildbreite
    expect(regel).toContain("object-fit: cover");
    expect(regel).toContain("mask-image: linear-gradient(180deg, #000 62%, transparent)");
  });

  it("der Text steht ÜBER dem Streifen, nicht darunter", () => {
    expect(css).toContain(".pk-offer-art > *:not(img) { position: relative; }");
    const regel = css.slice(css.indexOf(".pk-offer-art {"), css.indexOf(".pk-offer-art {") + 220);
    expect(regel).toContain("overflow: hidden");
    expect(regel).toContain("padding-top: 167px");
  });

  it("das Emblem ist für Screenreader unsichtbar — der Perkname steht daneben", () => {
    expect(jsx).toContain('alt="" aria-hidden="true"');
  });
});

describe("#perkart — der Bloom ist gebacken, nicht gerechnet", () => {
  const build = readFileSync(new URL("../scripts/skill-art-build.py", import.meta.url), "utf8");

  it("die Zone der Perk-Kachel ist GEMESSEN und steht als solche im Backskript", () => {
    /* Der Kern dieser Aufgabe. Der Bloom-Radius ist eine CSS-Länge geteilt durch die Zonenbreite; eine
       abgeschriebene Breite ergibt einen Radius, der maßgeblich und falsch ist. Deshalb steht hier die
       gemessene 265 UND, gleich darunter, die drei Zahlen, die sie NICHT ist. */
    expect(build).toContain("strip_w=265, light=LEGENDARY_LIGHT");
    expect(build).toContain("strip_w=265, light=PERKCAT_LIGHT");
    // 277 = Skill-Backwert, nie an irgendetwas gemessen. 270,66 = gemessene SKILL-Karte.
    // 270 = die Perk-KACHEL — richtig gemessen, aber die falsche Box: das Bild darin ist 265 breit
    // (4 px Raritätskante links, 1 px rechts). Genau dieser Fehler ist hier einmal passiert.
    expect(build).not.toContain("strip_w=277");
    expect(build).not.toContain("strip_w=270.66");
    expect(build).not.toContain("strip_w=270,");
  });

  it("die Zone im Stylesheet und die Zone im Backskript sind dieselbe Zone", () => {
    /* Die eine Naht, die lautlos auseinanderlaufen kann: das Backskript rechnet den Radius durch die
       Zonenbreite, das Stylesheet zeigt das Ergebnis in einer Zone dieser Breite. Fällt die Kachel
       später auf eine andere Breite, ist der gebackene Radius still falsch — sichtbar nur als „das
       Leuchten wirkt irgendwie zu weich". Geprüft wird deshalb die abgeleitete HÖHE gegen die Breite,
       denn die Höhe ist die einzige der beiden, die im Stylesheet überhaupt steht: 76 % Komposition
       auf 265 px Breite sind 201 px, und beide Zahlen müssen aus demselben Wert stammen. */
    const zone = /strip_w=(\d+), light=PERKCAT_LIGHT/.exec(build);
    expect(zone, "keine gemessene Zonenbreite im Backskript gefunden").toBeTruthy();
    const hoehe = /\.pk-strip \{[^}]*height: (\d+)px/.exec(css);
    expect(hoehe, "keine Zonenhöhe in .pk-strip gefunden").toBeTruthy();
    expect(Number(hoehe[1])).toBe(Math.round(0.76 * Number(zone[1])));
  });

  it("die Auslieferung entsteht aus den Mastern über das Skript, mit den gewählten Werten", () => {
    // Wie bei den Skills am Gerät gewählt; ändert sich einer der Werte, muss neu gebacken werden.
    expect(build).toContain("BLOOM_CSS = 16");
    expect(build).toContain("BLOOM_STRENGTH = 0.70");
    expect(build).toContain("BLOOM_SAT = 2.00");
  });

  it("beide Perk-Lose sind lichtangeglichen, und zwar je gegen sich selbst", () => {
    /* Angeglichen wird pro Los (Kontrakt, „Approved architecture" 6). Geprüft wird, dass die Tabellen
       überhaupt vollständig sind — eine halbe Tabelle ließe einzelne Bilder unangeglichen durchgehen,
       und auffallen würde nur das eine Bild, das niemand angeschaut hat. Das Skript selbst verweigert
       diesen Fall beim Backen; hier steht er als Erwartung, damit er nicht erst beim Backen auffällt. */
    const tabelle = (name) => {
      const s = build.indexOf(`${name} = {`);
      return build.slice(s, build.indexOf("}", s));
    };
    const cats = tabelle("PERKCAT_LIGHT");
    for (const key of Object.keys(CATEGORIES)) expect(cats).toContain(`perkcat_${key}_`);
    const legs = tabelle("LEGENDARY_LIGHT");
    for (const id of LEG_IDS) expect(legs, `kein Lichtfaktor für ${id}`).toContain(`"${id}_`);
  });

  it("das Bild bringt sein Leuchten mit — im Stylesheet steht KEIN Filter auf dem Streifen", () => {
    const regel = css.slice(css.indexOf(".pk-strip {"), css.indexOf(".pk-strip {") + 420);
    expect(regel).not.toContain("filter:");
    expect(regel).not.toContain("blur(");
    const wrapper = css.slice(css.indexOf(".pk-offer-art {"), css.indexOf(".pk-offer-art {") + 220);
    expect(wrapper).not.toContain("filter:");
    expect(wrapper).not.toContain("blur(");
  });
});

describe("#perkart — kein Emblem als data-URI im Bundle", () => {
  /* Dieselbe Falle wie bei den Skills, und hier knapper: das kleinste Kategorie-Emblem wiegt gebacken
     4,4 kB gegen Vites 4-kB-Grenze. Es fällt heute nicht hinein und wäre morgen drin. */
  it("die Grenze schaltet auch für Perk-Embleme auf „nie inlinen“", async () => {
    const mod = await import("../vite.config.js");
    const limit = mod.default({ command: "build" }).build.assetsInlineLimit;
    expect(limit("/repo/src/assets/perkcats/perkcat_A_deck.webp")).toBe(false);
    expect(limit("C:\\repo\\src\\assets\\legendaries\\L_ZINS_zinseszins.webp")).toBe(false);
    // Die Skill-Regel bleibt, und alles andere entscheidet Vite weiter selbst.
    expect(limit("/repo/src/assets/skills/lightning/SK_LIGHTNING_01_blitzableiter.webp")).toBe(false);
    expect(limit("/repo/src/assets/cards/decks_player/deck_blitz/front.webp")).toBeUndefined();
  });
});
