/* #ansage-deck — die Groß-Ansagen tragen die Deckfarbe.
   -------------------------------------------------------------------------------------------------
   Vier von sechs Ansagen ignorierten das aktive Deck: Stark/Brutal/Irre trugen einen fest
   eingetragenen Verlauf, „Gönn dir" ein festes Gold. Nur Gottgleich und Lawine folgten der
   Deckfarbe — und auch die nur bei eingeschaltetem Prunk-Farbmodus.

   `announceChrome.js` ist rein, also wird hier GERECHNET statt Schreibweisen verglichen: dass ein
   Verlauf die Deckfarbe wirklich enthält, sieht man dem Aufrufer nicht an. Nur die Verdrahtung im
   Battlefield bleibt Quelltext-Ratsche (das Projekt hat kein Component-Test-Setup). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  hexInt, intHex, mixHex, deckChrome, epicWordColors, WEISS_JE_RANG, AURA_AB_RANG,
} from "../src/ui/fx/announceChrome.js";
/* `DEFAULT_OPTIONS` ist in storage.js bewusst modul-privat (test/storage.test.js hält deshalb eine eigene
   Kopie als Ratsche). Hier wird über die öffentliche Fläche geprüft: ohne localStorage liefert `loadOptions`
   genau die Defaults zurück — das ist zugleich der Weg, den ein frisches Profil geht. */
import { FX_DECK_KEYS, COSMETIC_OPTION_KEYS, liftFxDeckDefaults, loadOptions } from "../src/game/storage.js";

const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
const A1 = "#ff5a4d", A2 = "#ffab3a";   // echtes Deckpaar aus themes.js (sunset)

describe("#ansage-deck — die Farbrechnung", () => {
  it("liest Hexwerte in beiden Schreibweisen und weist Unsinn ab", () => {
    expect(hexInt("#ff5a4d")).toBe(0xff5a4d);
    expect(hexInt("ff5a4d")).toBe(0xff5a4d);      // ohne #
    expect(hexInt("#f5a")).toBe(0xff55aa);        // Kurzform verdoppelt je Ziffer
    for (const k of [null, undefined, "", "rot", "#12", "#1234567", "rgb(1,2,3)"]) {
      expect(hexInt(k), String(k)).toBeNull();
    }
  });

  it("gibt immer sechsstellige Hexwerte zurück — CSS-Verläufe parsen sonst unzuverlässig", () => {
    expect(intHex(0x000000)).toBe("#000000");
    expect(intHex(0x0a0b0c)).toBe("#0a0b0c");
    expect(mixHex("#000000", "#ffffff", 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("mischt zwischen den Enden und deckelt außerhalb von 0..1", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#000000", "#ffffff", -3), "unter 0 → das untere Ende").toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 9), "über 1 → das obere Ende").toBe("#ffffff");
    expect(mixHex("kaputt", "#ffffff", 0.5)).toBeNull();
  });

  // Die Stopps eines Verlaufs: [weiß, hell, haupt, mitte, haupt, hell, weiß].
  const stopps = (c) => c.grad.replace(/^linear-gradient\(100deg,/, "").replace(/\)$/, "").split(",");

  it("jeder Verlauf ist aus den Deckfarben gebaut und rahmt sich in Weiß", () => {
    for (const rank of [1, 2, 3]) {
      const c = deckChrome(A1, A2, rank);
      expect(c, `Stufe ${rank}`).not.toBeNull();
      const s = stopps(c);
      expect(s).toHaveLength(7);
      expect(s[0]).toBe("#ffffff");
      expect(s[6]).toBe("#ffffff");
      expect(c.glow, "der Glow ist die Hauptfarbe der Stufe").toBe(s[2]);
      expect(s[2], "Hauptfarbe liegt auf der Strecke Primär→Sekundär").not.toBe(s[3]);
      for (const stop of s) expect(hexInt(stop), stop).not.toBeNull();
    }
  });

  it("die TON-Achse wandert über die Stufen von Deck-Primär nach Deck-Sekundär", () => {
    /* #ansage-stufen: die Farbleiter des alten festen Satzes (Cyan→Violett→Magenta) ist zurück — sie zieht
       ihre drei Töne jetzt aus dem Deck. Ohne diese Achse trügen alle drei Stufen exakt denselben Ton und
       unterschieden sich nur noch im Weiß-Anteil. */
    const haupt = (r) => stopps(deckChrome(A1, A2, r))[2];
    expect(haupt(1), "Stark = Deck-Primär").toBe(A1);
    expect(haupt(3), "Irre = Deck-Sekundär").toBe(A2);
    expect(haupt(2), "Brutal liegt dazwischen").not.toBe(haupt(1));
    expect(haupt(2)).not.toBe(haupt(3));
    // …und zwar wirklich DAZWISCHEN, nicht irgendwo (kanalweise geprüft, sonst träfe auch ein Zufallswert).
    for (const kanal of [16, 8, 0]) {
      const wert = (h) => (hexInt(h) >> kanal) & 255;
      const [lo, hi] = [Math.min(wert(A1), wert(A2)), Math.max(wert(A1), wert(A2))];
      expect(wert(haupt(2))).toBeGreaterThanOrEqual(lo);
      expect(wert(haupt(2))).toBeLessThanOrEqual(hi);
    }
  });

  it("der Mittelstopp ist immer der Gegenpol — nie dieselbe Farbe wie die Hauptfarbe", () => {
    /* Die Falle bei der Ton-Achse: setzt man die Mitte fest auf die Sekundärfarbe, fällt sie bei Irre mit
       der Hauptfarbe zusammen und der Verlauf läuft flach — ausgerechnet auf der höchsten Stufe. */
    for (const rank of [1, 2, 3]) {
      const s = stopps(deckChrome(A1, A2, rank));
      expect(s[3], `Stufe ${rank}`).not.toBe(s[2]);
    }
    expect(stopps(deckChrome(A1, A2, 1))[3], "Stark: Gegenpol = Sekundär").toBe(A2);
    expect(stopps(deckChrome(A1, A2, 3))[3], "Irre: Gegenpol = Primär").toBe(A1);
  });

  it("die SÄTTIGUNGS-Achse eskaliert zusätzlich", () => {
    // Zweite Achse neben dem Ton: je höher die Stufe, desto weniger Weiß in den Zwischenstopps.
    expect(WEISS_JE_RANG[1]).toBeGreaterThan(WEISS_JE_RANG[2]);
    expect(WEISS_JE_RANG[2]).toBeGreaterThan(WEISS_JE_RANG[3]);
    /* …und das schlägt bis in den Verlauf durch. Gemessen am ABSTAND des hellen Stopps zu seiner eigenen
       Hauptfarbe — ein Vergleich der Rohwerte träfe hier nicht, weil auch der Ton zwischen den Stufen wechselt. */
    const naeheZuWeiss = (r) => {
      const s = stopps(deckChrome(A1, A2, r));
      const [hell, haupt] = [hexInt(s[1]), hexInt(s[2])];
      return [16, 8, 0].reduce((sum, k) => sum + (((hell >> k) & 255) - ((haupt >> k) & 255)), 0);
    };
    expect(naeheZuWeiss(1), "Stark liegt näher an Weiß als Irre").toBeGreaterThan(naeheZuWeiss(3));
  });

  it("die zweite Glow-Lage bleibt den höheren Stufen vorbehalten", () => {
    // Im festen Satz hatten Brutal und Irre eine `aura`, Stark nicht. Diese Grenze bleibt.
    expect(deckChrome(A1, A2, 1).aura, "Stark trägt keine Aura").toBeNull();
    for (let r = AURA_AB_RANG; r <= 3; r++) {
      const c = deckChrome(A1, A2, r);
      expect(c.aura, `Stufe ${r}: Aura ist der Gegenpol`).toBe(stopps(c)[3]);
    }
  });

  it("ein Deck mit zwei gleichen Farben fällt sauber auf die Sättigungs-Leiter zurück", () => {
    /* Sonst liefe die Ton-Achse über eine Strecke der Länge 0: Haupt- und Gegenfarbe wären identisch und
       der Verlauf in der Mitte flach — und zwar ohne dass man dem Code ansieht, warum. */
    const c = deckChrome(A1, A1, 3);
    const s = stopps(c);
    expect(s[2]).toBe(A1);
    expect(s[3], "Mitte weicht trotzdem ab").not.toBe(A1);
    expect(c.aura, "ohne echte zweite Farbe auch keine Aura").toBeNull();
  });

  it("einfarbige Decks bekommen trotzdem einen Verlauf mit Mitte", () => {
    // Ohne zweite Deckfarbe wäre der Mittelstopp sonst gleich der Hauptfarbe → der Verlauf liefe flach.
    const c = deckChrome(A1, null, 3);
    const stopps = c.grad.replace(/^linear-gradient\(100deg,/, "").replace(/\)$/, "").split(",");
    expect(stopps[3], "Mitte ist nicht die Hauptfarbe").not.toBe(A1);
    expect(hexInt(stopps[3]), "…und ein lesbarer Hexwert").not.toBeNull();
    expect(c.aura, "ohne zweite Farbe auch keine Aura").toBeNull();
  });

  it("ohne lesbares Deck gibt es null — der Aufrufer fällt auf seinen festen Satz zurück", () => {
    expect(deckChrome(null, A2, 2)).toBeNull();
    expect(deckChrome("keine farbe", A2, 2)).toBeNull();
    expect(deckChrome(A1, A2, 4), "epische Stufen haben keinen chrome-Block").toBeNull();
    expect(deckChrome(A1, A2, undefined)).toBeNull();
  });
});

describe("#ansage-deck — welche Ansage welcher Regel folgt", () => {
  it("„Gönn dir“ trägt die Deckfarbe IMMER, auch bei ausgeschaltetem Prunk-Modus", () => {
    const goenn = { epic: true, deckAlways: true };
    expect(epicWordColors(goenn, false, A1, A2)).toEqual([A1, A2]);
    expect(epicWordColors(goenn, true, A1, A2)).toEqual([A1, A2]);
  });

  it("Gottgleich und Lawine bleiben am Prunk-Schalter", () => {
    const gott = { epic: true };
    expect(epicWordColors(gott, true, A1, A2), "Deckfarbe-Modus an").toEqual([A1, A2]);
    expect(epicWordColors(gott, false, A1, A2), "aus → Chrome-Zweiton").toEqual([null, null]);
  });

  it("einfarbiges Deck doppelt die Farbe, statt die zweite auf null zu lassen", () => {
    // GottChromeWord liest `color2 = null` als „einfarbig" — das ist hier gewollt, aber es soll aus
    // der FEHLENDEN zweiten Deckfarbe kommen und nicht aus einem durchgereichten undefined.
    expect(epicWordColors({ deckAlways: true }, false, A1, null)).toEqual([A1, A1]);
  });

  it("ohne Deck fällt alles auf den Chrome-Zweiton zurück", () => {
    expect(epicWordColors({ deckAlways: true }, true, null, null)).toEqual([null, null]);
    expect(epicWordColors({}, true, "unlesbar", A2)).toEqual([null, null]);
  });

  it("eine fest eingetragene tier.color gewinnt weiter — der Ausweg bleibt offen", () => {
    expect(epicWordColors({ color: "#ffd24a" }, true, A1, A2)).toEqual(["#ffd24a", null]);
  });
});

describe("#ansage-deck — die Verdrahtung im Battlefield", () => {
  it("beide Zweige holen ihre Farbe aus announceChrome, statt sie vor Ort zu rechnen", () => {
    expect(bf).toMatch(/import \{ deckChrome, epicWordColors \} from "\.\/fx\/announceChrome\.js"/);
    expect(bf).toMatch(/const \[wordC1, wordC2\] = epicWordColors\(b\.tier, gottDeck, deckA1, deckA2\)/);
    expect(bf).toMatch(/const chrome = deckChrome\(deckA1, deckA2, b\.tier\.rank\) \|\| b\.tier\.chrome/);
  });

  it("die nicht-epische Stufe liest den BERECHNETEN Block, nicht mehr den festen", () => {
    /* Der eigentliche Rückfall, den man dem Bild nicht ansieht: eine der drei Fundstellen wieder auf
       `b.tier.chrome` zu stellen, färbt genau eine Schicht (Basis-Glyphe ODER Verlauf ODER Glow)
       zurück — das Wort trüge dann zwei Farbsysteme gleichzeitig. */
    const zweig = bf.slice(bf.indexOf("#344/#354: Neon-Synthwave-CHROME"));
    const körper = zweig.slice(0, zweig.indexOf("</div>"));
    expect(körper).not.toMatch(/b\.tier\.chrome/);
    expect(körper).toMatch(/chrome\.glow/);
    expect(körper).toMatch(/backgroundImage: chrome\.grad/);
    expect(körper).toMatch(/chromeFilter\(chrome,/);
  });

  it("„Gönn dir“ hat kein festes Gold mehr", () => {
    const zeile = bf.split("\n").find((l) => l.includes("GOENNDIR_TIER = {"));
    expect(zeile, "der Wächter muss die Stufe noch finden").toBeTruthy();
    expect(zeile).toMatch(/deckAlways: true/);
    expect(zeile, "kein fester Farbwert mehr").not.toMatch(/color:/);
  });

  it("die festen chrome-Blöcke bleiben als Rückfall stehen", () => {
    // Sie sind kein toter Code: ohne lesbares Deck (kein Pack aktiv) liefert deckChrome null.
    expect((bf.match(/chrome: \{ grad: "linear-gradient/g) || []).length).toBe(3);
  });
});

/* #fx-deckdefault — Deckfarbe ist die Vorauswahl, für ALLE Effekte und auch direkt nach dem Kauf.
   -------------------------------------------------------------------------------------------------
   Zwei Hälften, und die zweite ist die, die man vergisst: den DEFAULT zu drehen erreicht bestehende
   Stände nicht, weil `loadOptions` die Defaults UNTER den gespeicherten Stand merged. */
describe("#fx-deckdefault — Deckfarbe ist vorausgewählt", () => {
  it("alle Farbmodus-Flags stehen auf Deckfarbe", () => {
    const opt = loadOptions();   // ohne localStorage = frisches Profil
    /* 13 → 14 am 19.08.2026: „Gottgleich · Standard" hat seinen eigenen Farbmodus bekommen
       (`fxGottStandardDeck`, #vorschau-deck). Die Zahl steht hier bewusst als Literal — ein NEUES
       Farbmodus-Flag soll eine bewusste Handlung sein und nicht still durch die Regex rutschen. */
    expect(FX_DECK_KEYS.length, "die vierzehn Effekte mit Farbmodus").toBe(14);
    for (const key of FX_DECK_KEYS) expect(opt[key], key).toBe(true);
  });

  it("die Liste wird abgeleitet, nicht abgetippt", () => {
    // Ein neuer Effekt mit Farbmodus soll automatisch dazugehören — in Anhebung UND Dev-Reset.
    for (const key of FX_DECK_KEYS) expect(COSMETIC_OPTION_KEYS, key).toContain(key);
    expect(FX_DECK_KEYS).toContain("fxSupernovaDeck");
    expect(FX_DECK_KEYS, "der Marker ist kein Farbmodus").not.toContain("fxDeckDefaultLift");
  });

  it("hebt einen bestehenden Stand EINMALIG an", () => {
    const alt = { fxAuroraDeck: false, fxSupernovaDeck: false };
    expect(liftFxDeckDefaults(alt), "erster Aufruf hebt an").toBe(true);
    expect(alt.fxAuroraDeck).toBe(true);
    expect(alt.fxSupernovaDeck).toBe(true);
    expect(alt.fxDeckDefaultLift).toBe(true);
  });

  it("eine spätere bewusste Wahl „Standard“ bleibt erhalten", () => {
    /* DER Punkt des Markers. Ohne ihn liefe die Anhebung bei JEDEM Start und überschriebe die Wahl —
       ein Schalter, der sich nach dem Neuladen von selbst zurückstellt, ist schlimmer als keiner. */
    const gewaehlt = { fxDeckDefaultLift: true, fxAuroraDeck: false };
    expect(liftFxDeckDefaults(gewaehlt), "zweiter Aufruf tut nichts").toBe(false);
    expect(gewaehlt.fxAuroraDeck, "Standard bleibt Standard").toBe(false);
  });

  it("der Marker startet auf false — sonst greift die Anhebung nie", () => {
    /* Die eine Zeile, die das Ganze lautlos wirkungslos macht: stünde der Marker in DEFAULT_OPTIONS auf
       `true`, bekäme ihn jedes Alt-Profil aus dem Merge und die Anhebung liefe kein einziges Mal. */
    expect(loadOptions().fxDeckDefaultLift).toBe(false);
  });

  it("loadOptions schreibt die Anhebung zurück, statt sie bei jedem Start zu wiederholen", () => {
    const st = readFileSync(new URL("../src/game/storage.js", import.meta.url), "utf8");
    expect(st).toMatch(/normalizeFxOptions[\s\S]{0,200}liftFxDeckDefaults\(o\)/);
    expect(st).toMatch(/merged\.reducedFx !== before \|\| !hatteLift/);
  });
});
