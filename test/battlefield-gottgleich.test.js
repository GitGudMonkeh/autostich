/* GOTTGLEICH — Ansage und Prunk-Effekt müssen dieselbe Schwelle haben.

   Playtest-Befund: „gottgleich hat in meinem Run keine animation gespielt". Die Ansage kam, der
   Effekt nie. Ursache waren ZWEI Literale 500000 in Battlefield.jsx, die mit VERSCHIEDENEN Werten
   gefüttert wurden — die Ansage mit dem Stich-Score nach dem Krit (`t.gained`), das Effekt-Gatter mit
   dem Wert davor (`scoreBeforeCrit`). Ein Sieg, der die Schwelle erst durch den Krit-Multiplikator
   reißt, zeigte deshalb das Wort ohne jeden Effekt.

   Der Test nagelt die Gleichheit über den ganzen Wertebereich fest, statt nur die eine Zahl zu
   prüfen: eine künftige Änderung an EINER der beiden Stellen fliegt hier auf. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { bigScoreTier, GOTT_FX_MIN } from "../src/ui/Battlefield.jsx";

const SRC = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");

describe("Gottgleich · Ansage und Effekt", () => {
  it("die Schwelle steht nur EINMAL als Zahl im Code", () => {
    // Ein zweites Literal wäre wieder der Nährboden für genau diesen Drift. Kommentare zählen nicht
    // mit — dort DARF die Zahl stehen, sie erklärt ja gerade, warum es nur eine geben soll.
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    const treffer = code.match(/\b500000\b/g) || [];
    expect(treffer, `500000 steht ${treffer.length}× im Code — GOTT_FX_MIN benutzen`).toHaveLength(1);
  });

  it("Ansage GOTTGLEICH und Effekt-Gatter antworten über den ganzen Bereich gleich", () => {
    // Das Effekt-Gatter, wie es in Battlefield.jsx steht (ohne Cooldown/Kosmetik/reduced).
    const effektFeuert = (gained) => gained > GOTT_FX_MIN;
    const ansageZeigt = (gained) => bigScoreTier(gained)?.key === "bf.big.godlike";
    for (const g of [0, 1, 9999, 10001, 499999, GOTT_FX_MIN, GOTT_FX_MIN + 1, 750000, 5_000_000]) {
      expect(effektFeuert(g), `bei ${g} laufen Ansage und Effekt auseinander`).toBe(ansageZeigt(g));
    }
  });

  it("das Effekt-Gatter liest den Score NACH dem Krit — sonst bleibt es hinter der Ansage zurück", () => {
    // Genau der Playtest-Fall: 250k Grundwert, Krit ×2,4 → 600k ausgezahlt.
    const scoreBeforeCrit = 250_000, critMultiplier = 2.4;
    const gained = scoreBeforeCrit * critMultiplier;
    expect(bigScoreTier(gained)?.key).toBe("bf.big.godlike");   // die Ansage kommt …
    expect(gained > GOTT_FX_MIN).toBe(true);                    // … und der Effekt jetzt auch
    expect(scoreBeforeCrit > GOTT_FX_MIN).toBe(false);          // mit dem alten Wert wäre er ausgeblieben
    // Die Naht selbst: im Code darf kein Vor-Krit-Wert mehr am Gatter hängen.
    expect(SRC).not.toMatch(/gottBase\s*=\s*isCrit/);
  });
});
