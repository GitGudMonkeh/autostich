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

  it("der Verlauf jeder Stufe trägt wirklich die Deckfarben", () => {
    for (const rank of [1, 2, 3]) {
      const c = deckChrome(A1, A2, rank);
      expect(c, `Stufe ${rank}`).not.toBeNull();
      expect(c.grad, "Hauptfarbe = Deck-Primär").toContain(A1);
      expect(c.grad, "Mittelstopp = Deck-Sekundär").toContain(A2);
      expect(c.glow, "der Glow ebenfalls").toBe(A1);
      expect(c.grad.startsWith("linear-gradient(100deg,#ffffff,")).toBe(true);
      expect(c.grad.endsWith(",#ffffff)")).toBe(true);
    }
  });

  it("die Eskalation liegt jetzt in der SÄTTIGUNG, nicht mehr im Farbton", () => {
    /* Mit einer Deckfarbe gibt es keine drei Farbtöne mehr. Was die Stufen unterscheidet, ist der
       Weiß-Anteil der Zwischenstopps: je höher die Stufe, desto weniger Weiß, desto dominanter.
       Bricht diese Ordnung, sehen Stark und Irre gleich aus — und das fällt im Spiel kaum auf,
       weil beide selten direkt nacheinander stehen. */
    expect(WEISS_JE_RANG[1]).toBeGreaterThan(WEISS_JE_RANG[2]);
    expect(WEISS_JE_RANG[2]).toBeGreaterThan(WEISS_JE_RANG[3]);
    // …und das schlägt auch wirklich bis in den Verlauf durch (hellerer Stopp bei niedrigerer Stufe).
    const hell = (r) => hexInt(deckChrome(A1, A2, r).grad.split(",")[2]);
    expect(hell(1)).toBeGreaterThan(hell(3));   // heller = größerer Zahlenwert bei Aufhellung zu Weiß
  });

  it("die zweite Glow-Lage bleibt den höheren Stufen vorbehalten", () => {
    // Im festen Satz hatten Brutal und Irre eine `aura`, Stark nicht. Diese Grenze bleibt.
    expect(deckChrome(A1, A2, 1).aura, "Stark trägt keine Aura").toBeNull();
    for (let r = AURA_AB_RANG; r <= 3; r++) expect(deckChrome(A1, A2, r).aura, `Stufe ${r}`).toBe(A2);
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
