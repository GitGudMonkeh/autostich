import { describe, it, expect } from "vitest";
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
