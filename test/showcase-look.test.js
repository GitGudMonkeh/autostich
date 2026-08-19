import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { showcaseLook, THEME_DEFS } from "../src/game/themes.js";
import { LOOK_REFS } from "../src/ui/CustomizeScreen.jsx";

/* #327 Showcase-Look = kohärente Pack-Einheit: Hintergrund (bfId) + Deckfarben (a1/a2) aus dem Pack ableiten.
   Optionaler Per-Effekt-Override (a1/a2/bf). Unbekanntes Pack → sicherer Genesis-Fallback (kein Crash). */
describe("#327 showcaseLook — Deckfarbe automatisch aus dem Pack", () => {
  it("leitet bf + a1/a2 aus dem Pack ab (wale)", () => {
    expect(showcaseLook("wale")).toEqual({ bf: "bf_wale", a1: "#35d0ff", a2: "#7fdcff" });
  });

  it("Override übersteuert die Pack-Farben, bf bleibt Pack-bfId (sonne)", () => {
    const look = showcaseLook("sonne", { a1: "#cbd3ff", a2: "#cbd3ff" });
    expect(look).toEqual({ bf: THEME_DEFS.sonne.bfId, a1: "#cbd3ff", a2: "#cbd3ff" });
  });

  it("bf-Override übersteuert den Pack-Hintergrund", () => {
    expect(showcaseLook("wale", { bf: "bf_kosmos" }).bf).toBe("bf_kosmos");
  });

  it("a2 fällt auf a1 zurück, wenn das Pack kein a2 hätte (Override nur a1)", () => {
    expect(showcaseLook("__none__", { a1: "#123456" })).toEqual({ bf: "bf_onboarding", a1: "#123456", a2: "#123456" });
  });

  it("unbekanntes Pack → sicherer Genesis-Fallback (kein Crash)", () => {
    expect(showcaseLook("gibtsnicht")).toEqual({ bf: "bf_onboarding", a1: "#8a7de0", a2: "#8a7de0" });
  });

  it("Genesis ist der Default-Standard-BG (SHOWCASE_BF-Quelle)", () => {
    expect(THEME_DEFS.genesis.bfId).toBe("bf_onboarding");
  });
});

/* Drift-Guard: jeder LOOK_REFS-Eintrag OHNE a1/a2-Override muss exakt die Pack-Farben + den Pack-Hintergrund liefern.
   Verhindert, dass künftige Effekte wieder still eine handgepflegte Fremdfarbe einführen (Kernziel von #327). */
describe("#327 Drift-Guard — abgeleitete Farbe = Pack-Farbe (kein Hand-a1/a2 ohne Override)", () => {
  it("alle referenzierten Packs existieren in THEME_DEFS", () => {
    for (const [key, ref] of Object.entries(LOOK_REFS)) {
      expect(THEME_DEFS[ref.pack], `Pack für Effekt „${key}" fehlt: ${ref.pack}`).toBeTruthy();
    }
  });

  it("ohne a1/a2-Override folgen bf + a1 + a2 exakt dem Pack", () => {
    for (const [key, ref] of Object.entries(LOOK_REFS)) {
      const look = showcaseLook(ref.pack, ref);
      const t = THEME_DEFS[ref.pack];
      // bf: entweder expliziter bf-Override oder Pack-bfId.
      expect(look.bf, `bf-Drift bei „${key}"`).toBe(ref.bf || t.bfId);
      if (!ref.a1) expect(look.a1, `a1-Drift bei „${key}"`).toBe(t.a1);
      if (!ref.a2 && !ref.a1) expect(look.a2, `a2-Drift bei „${key}"`).toBe(t.a2);
    }
  });
});

/* ============================================================
   #vorschau-deck (19.08.2026) — im Deckfarbe-Modus zeigt die Bühne DEIN Deck, nicht mehr das je Effekt
   handverlesene Pack. Der Standard-Modus bleibt Genesis als Basislinie — genau daran hängt der Umschalter:
   fiele auch er auf das aktive Deck, gäbe es keinen neutralen Bezug mehr, gegen den man vergleicht.
   ============================================================ */
describe("#vorschau-deck — activeLook liefert Farben UND Spielfeld des ausgerüsteten Decks", () => {
  it("ein normales Pack: bf + a1 + a2 kommen aus dem Pack der deckId", async () => {
    const { activeLook, THEMES } = await import("../src/game/themes.js");
    const pack = THEMES.find((t) => t.deckId && t.a1 && !t.tiers);
    expect(activeLook(pack.deckId)).toEqual({ bf: pack.bfId, a1: pack.a1, a2: pack.a2 || pack.a1 });
  });

  it("STUFEN-Decks lösen auf ihre eigene Stufenfarbe auf, nicht auf die des Packs", async () => {
    /* Das ist der Grund, warum `resolvePackByDeckId` benutzt wird statt einer eigenen Suche über `deckId`:
       Stufe II eines Packs hat andere a1/a2 als Stufe I, und das Spiel selbst löst genau so auf. */
    const { activeLook, THEMES, isTieredPack } = await import("../src/game/themes.js");
    const tiered = THEMES.find((t) => isTieredPack(t) && t.tiers.length > 1);
    if (!tiered) return;
    for (const ti of tiered.tiers) {
      const look = activeLook(ti.deckId);
      expect(look.a1, `Stufe ${ti.roman} zieht nicht ihre eigene Farbe`).toBe(ti.a1);
    }
  });

  it("unbekannte/Standard-deckId fällt auf Genesis zurück, nicht auf null", async () => {
    /* `null` müsste jede der dreizehn Lesestellen einzeln abfangen — der Rückfall gehört in die Quelle. */
    const { activeLook, THEME_DEFS } = await import("../src/game/themes.js");
    const g = THEME_DEFS.genesis;
    expect(activeLook("default")).toEqual({ bf: g.bfId, a1: g.a1, a2: g.a2 || g.a1 });
    expect(activeLook("gibtsnicht").bf).toBe(g.bfId);
  });
});

describe("#vorschau-deck — die Verdrahtung in der Werkstatt", () => {
  const src = readFileSync(new URL("../src/ui/CustomizeScreen.jsx", import.meta.url), "utf8");

  it("es gibt EINEN Provider und keine Lesestelle mehr auf der festen Tabelle im Deckfarbe-Modus", () => {
    expect(src).toMatch(/export const DeckLookCtx = createContext\(null\)/);
    expect(src).toMatch(/<DeckLookCtx\.Provider value=\{deckLook\}>/);
    expect(src).toMatch(/const deckLook = useMemo\(\(\) => activeLook\(deckId\), \[deckId\]\)/);
    /* Kein `look={PREVIEW_LOOK.x}` mehr in der Szenen-Kette: alle neun laufen über den Wähler `look(key)`,
       der den Modus berücksichtigt. Bleibt eine Stelle direkt an der Tabelle hängen, zeigt genau EIN Effekt
       weiter ein fremdes Deck — und das fällt im Betrieb kaum auf. */
    expect(src).not.toMatch(/look=\{PREVIEW_LOOK\./);
    expect((src.match(/look=\{look\("/g) || []).length).toBe(9);
  });

  it("die vier Szenen mit eigenem Look lesen den Kontext, nicht die Tabelle", () => {
    // Bühne + Schwarzes Loch + Würfel-Matrix + Feld-Effekte + Karten-Animation
    expect((src.match(/useContext\(DeckLookCtx\)/g) || []).length).toBe(5);
    for (const k of ["blackhole", "cubematrix"])
      expect(src, `${k} hängt noch fest an der Tabelle`).toMatch(new RegExp(`\\(deckTint && deckLook\\) \\|\\| PREVIEW_LOOK\\.${k}`));
  });

  it("Karten-Animationen nehmen das aktive Deck OHNE Modus-Gate", () => {
    /* Sie haben im Spiel keinen Standard/Deckfarbe-Schalter — sie laufen immer in der Deckfarbe (#318).
       Ein `deckTint`-Gate wäre hier also eine Bedingung, die nie umschaltet. */
    expect(src).toMatch(/const look = deckLook \|\| PREVIEW_LOOK\[anim\]/);
  });

  it("der Standard-Modus bleibt Genesis — sonst gibt es keine Basislinie mehr", () => {
    expect(src).toMatch(/const SHOWCASE_BF = THEME_DEFS\.genesis\.bfId/);
    expect(src).toMatch(/deckTint \? look\.bf : SHOWCASE_BF/);
  });

  it("„Gottgleich · Standard“ hat jetzt einen eigenen Farbmodus — im Shop UND im Spiel", () => {
    /* Ein Schalter, der nur die Vorschau umfärbt, wäre eine Lüge. Beide Enden müssen dasselbe Flag lesen. */
    expect(src).toMatch(/fx\.key === "gottStandard" \? "fxGottStandardDeck"/);
    expect(src).toMatch(/fx\.preview === "gottStandard"\) return <GottScene Fx=\{null\} deckTint=\{deckTint\}/);
    const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
    expect(app, "die Ansage im Spiel kennt das Flag nicht").toMatch(/gottStandard: "fxGottStandardDeck"/);
    expect(readFileSync(new URL("../src/game/storage.js", import.meta.url), "utf8"))
      .toMatch(/fxGottStandardDeck: true/);
  });
});
