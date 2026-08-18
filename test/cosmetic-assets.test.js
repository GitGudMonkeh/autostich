import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DECK_DEFS, BATTLEFIELD_DEFS } from "../src/game/cosmetics.js";

/* Wächter für die Kosmetik-ASSETS — die eine Naht beim Anlegen eines Decks, die still bricht.

   Ein neues Pack berührt vier Dateien: cosmetics.js (Deck + Battlefield), themes.js (Pack), enCosmetics.js
   (englischer Name) und cosmeticAssets.js (Bilder). Drei davon melden sich, wenn man sie vergisst — ein Pack ohne
   Deck fliegt beim Kauf auf, ein fehlender EN-Name reißt die i18n-Parität. Nur cosmeticAssets.js schweigt: die
   Leser sind `deckAssets(id) || DECK_ASSETS.default`, das vergessene Deck zeigt also brav die Standard-Karte und
   niemand merkt es, bis ein Spieler dafür DP ausgegeben hat.

   Geprüft wird über das DATEISYSTEM statt über einen Import: `cosmeticAssets.js` importiert 172 Bilddateien, die
   in node nichts bedeuten. Dieselbe Bauart wie test/music-assets.test.js, und wie dort in BEIDE Richtungen —
   keine toten Verweise, keine verwaisten Ordner. Ein Ordner, den niemand einbindet, ist genauso ein Fehler wie ein
   Verweis ohne Datei: er liegt im Repo, wandert aber nie ins Spiel.

   Die Maßprüfung ist keine Kosmetik: die Kartenkunst ist randlos gerahmt, ein um wenige Prozent abweichendes
   Seitenverhältnis staucht den Zierrahmen sichtbar. Beim Anlegen der #deck-material-Packs kamen die Vorlagen
   in 0,714 statt 0,723 herein — auffällt so etwas erst am Gerät, hier fällt es in Millisekunden auf. */

const root = (p) => fileURLToPath(new URL("../" + p, import.meta.url));
const CARD = [560, 775];      // src/assets/cards/decks_player/<id>/{front,back}.webp
const BF_DESKTOP = [1600, 640];
const BF_MOBILE = [1080, 810];

// Maße aus dem Dateikopf lesen — kein Bildpaket im Testlauf, und es sollen ohnehin nur zwei Zahlen geprüft werden.
function webpSize(buf) {
  expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buf.toString("ascii", 8, 12)).toBe("WEBP");
  // Nur der verlustbehaftete Fall („VP8 ") kommt hier vor. Andere Varianten (VP8L/VP8X) legen die Maße woanders
  // ab — nicht raten, sondern durchfallen lassen, sonst prüft der Test unbemerkt Unsinn.
  expect(buf.toString("ascii", 12, 16)).toBe("VP8 ");
  return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
}
function jpegSize(buf) {
  expect(buf.readUInt16BE(0)).toBe(0xffd8);
  for (let p = 2; p < buf.length - 9;) {
    if (buf[p] !== 0xff) { p++; continue; }
    const marker = buf[p + 1];
    // SOF0..SOF15 tragen die Maße; DHT (C4), JPG (C8) und DAC (CC) liegen dazwischen und sind KEINE SOF.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return [buf.readUInt16BE(p + 7), buf.readUInt16BE(p + 5)];
    }
    p += 2 + buf.readUInt16BE(p + 2);
  }
  throw new Error("kein SOF-Marker gefunden");
}

const assetSrc = readFileSync(root("src/ui/cosmeticAssets.js"), "utf8");
// Decks/Battlefields, die im Register stehen. `default` trägt die eingebauten Standard-Karten (kein eigener Ordner).
const deckIds = Object.keys(DECK_DEFS).filter((id) => id !== "default");
const bfIds = Object.keys(BATTLEFIELD_DEFS).filter((id) => id !== "default");

describe("Kosmetik-Assets · jedes Deck bringt seine Bilder mit", () => {
  it.each(deckIds)("%s: front.webp + back.webp liegen in 560×775", (id) => {
    for (const side of ["front", "back"]) {
      const p = root(`src/assets/cards/decks_player/${id}/${side}.webp`);
      expect(existsSync(p), `${id}/${side}.webp fehlt`).toBe(true);
      expect(webpSize(readFileSync(p)), `${id}/${side}.webp hat das falsche Maß`).toEqual(CARD);
    }
  });

  it.each(bfIds)("%s: desktop.jpg (1600×640) + mobile.jpg (1080×810) liegen bereit", (id) => {
    for (const [file, size] of [["desktop.jpg", BF_DESKTOP], ["mobile.jpg", BF_MOBILE]]) {
      const p = root(`src/assets/battlefields/${id}/${file}`);
      expect(existsSync(p), `${id}/${file} fehlt`).toBe(true);
      expect(jpegSize(readFileSync(p)), `${id}/${file} hat das falsche Maß`).toEqual(size);
    }
  });
});

describe("Kosmetik-Assets · cosmeticAssets.js ist vollständig verdrahtet", () => {
  it("bindet JEDES registrierte Deck ein — sonst zeigt es stumm die Standard-Karte", () => {
    const fehlt = deckIds.filter((id) => !new RegExp(`\\b${id}:\\s*\\{\\s*front:`).test(assetSrc));
    expect(fehlt, `nicht in DECK_ASSETS: ${fehlt.join(", ")}`).toEqual([]);
  });

  it("bindet JEDES registrierte Battlefield ein", () => {
    const fehlt = bfIds.filter((id) => !new RegExp(`\\b${id}:\\s*\\{\\s*desktop:`).test(assetSrc));
    expect(fehlt, `nicht in BATTLEFIELD_ASSETS: ${fehlt.join(", ")}`).toEqual([]);
  });
});

describe("Kosmetik-Assets · keine verwaisten Ordner", () => {
  /* Die Gegenrichtung. Ein Ordner ohne Register-Eintrag ist kein harmloser Rest: er liegt im Repo, wird nie
     importiert und fällt daher auch nicht als toter Verweis auf — er wandert nur nie ins Spiel. Die alten
     Progressions-Decks (deck_p1–p4, #299) sind bewusst ausgenommen: die Registry-Einträge sind entfernt, die
     Bilder liegen für einen möglichen Rückgriff noch da. Wer aufräumt, streicht sie hier UND im Ordner. */
  const ALTLASTEN = new Set(["deck_p1", "deck_p2", "deck_p3", "deck_p4", "deck_kaiju", "deck_aura", "deck_mecha"]);

  it("jeder Deck-Ordner gehört zu einem registrierten Deck", () => {
    const ordner = readdirSync(root("src/assets/cards/decks_player")).filter((d) => !ALTLASTEN.has(d));
    expect(ordner.filter((d) => !deckIds.includes(d))).toEqual([]);
  });

  it("jeder Battlefield-Ordner gehört zu einem registrierten Battlefield", () => {
    const ordner = readdirSync(root("src/assets/battlefields"));
    expect(ordner.filter((d) => !bfIds.includes(d))).toEqual([]);
  });
});
