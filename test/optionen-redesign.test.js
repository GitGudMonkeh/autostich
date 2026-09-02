import { describe, it, expect, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OptionsModal } from "../src/ui/OptionsModal.jsx";
import { defaultScreenOptions } from "../src/game/storage.js";
import { setLocale, SOURCE_LOCALE, READY_LOCALE_IDS } from "../src/i18n/index.js";
// exp: English is inactive on the playground (LOCALES in index.js) — the English render-checks sleep until it is ready again.
const EN_OFF = !READY_LOCALE_IDS.includes("en");

/* ============================================================================
   #optionen-redesign — die Nähte des Umbaus, die still reißen.

   Der Screen sieht nach jeder einzelnen dieser Regressionen weiter richtig aus. Das ist der Grund
   für eine Ratsche und nicht für ein Sichtprüfung.
   ============================================================================ */

const render = (opts) => renderToStaticMarkup(
  createElement(OptionsModal, { options: { ...defaultScreenOptions(), ...opts }, onChange: () => {}, onClose: () => {} }),
);

/* Die Sprache wird je Test gesetzt, nicht angenommen: `setLocale` ist Modulzustand und ueberlebt die
   Dateigrenze, ein Test haengt sonst davon ab, wer vor ihm lief. Dieselbe Vorsichtsmassnahme wie in
   options-sections.test.js. */
beforeEach(() => setLocale(SOURCE_LOCALE));

describe("#optionen-redesign — die Ton-Zeile dreht die ANZEIGE, nicht den gespeicherten Wert", () => {
  /* DIE TEUERSTE NAHT DES GANZEN UMBAUS. Der gespeicherte Schlüssel heißt `muted` und `true` heißt
     stumm; die Zeile heißt jetzt „Ton" und `an` heißt Ton an. Wer beim Umbenennen den WERT dreht
     statt der Anzeige, schaltet jedes bestehende Spielerprofil auf stumm — und zwar nicht nur hier,
     sondern auch an der Stummtaste am Hub, in der Eckleiste und in den Lauf-Controls, die alle
     denselben Schlüssel über MuteButton.jsx lesen.

     Nachgemessen wird der gerenderte Schalter gegen den Wert, aus dem er entsteht: `muted: false`
     (der Standard) MUSS „an" zeigen. */
  it("muted: false zeigt den Schalter als AN", () => {
    expect(render({ muted: false })).toMatch(/role="switch" aria-checked="true"[^>]*aria-label="Ton"/);
  });

  it("muted: true zeigt den Schalter als AUS", () => {
    expect(render({ muted: true })).toMatch(/role="switch" aria-checked="false"[^>]*aria-label="Ton"/);
  });

  it("die Quelle liest !options.muted und schreibt weiter muted", async () => {
    const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/ui/OptionsModal.jsx", import.meta.url), "utf8"));
    expect(src, "die Anzeige haengt nicht mehr an !options.muted").toMatch(/const soundOn = !options\.muted/);
    /* Die Gegenprobe zur Umkehr: irgendwo muss `muted` GESCHRIEBEN werden, und zwar aus soundOn —
       `onChange({ muted: soundOn })` ist genau „an -> ab jetzt stumm". Stuende dort `!soundOn`, waere
       der Schalter wirkungslos; stuende dort ein invertierter Speicherwert, waere es die Falle. */
    expect(src, "der gespeicherte Schluessel wird nicht mehr aus soundOn geschrieben").toMatch(/onChange\(\{ muted: soundOn \}\)/);
  });
});

describe("#optionen-redesign — Abhängigkeiten sind sichtbar, nicht nur wirksam", () => {
  it("ist der Ton aus, zeigen beide Regler ein Wort statt einer Zahl", () => {
    const s = render({ muted: true });
    expect((s.match(/stumm<\/span>/g) || []).length, "beide Lautstaerke-Regler muessen es sagen").toBe(2);
  });

  it("ist der Ton an, zeigen sie ihren Prozentwert", () => {
    const s = render({ muted: false });
    expect(s).not.toContain("stumm</span>");
  });

  it("ist der Float-Master aus, nimmt die Untergruppe keine Eingabe an", () => {
    const s = render({ hideFloatScore: true, hideFloatMult: true, hideFloatWinLose: true });
    expect(s, "die Untergruppe ist nicht gedaempft").toMatch(/op-floatsubs[^"]*is-off/);
    /* `disabled` am Knopf, nicht nur pointer-events in der CSS: ein Schalter, der unbedienbar
       aussieht und trotzdem auf die Leertaste antwortet, ist schlimmer als einer, der bedienbar
       aussieht. Drei Unterschalter, also drei. */
    expect((s.match(/role="switch"[^>]*disabled/g) || []).length).toBe(3);
  });

  it("ist er an, sind alle drei bedienbar", () => {
    const s = render({ hideFloatScore: false, hideFloatMult: false, hideFloatWinLose: false });
    expect((s.match(/role="switch"[^>]*disabled/g) || []).length).toBe(0);
  });
});

describe("#optionen-redesign — das Zurücksetzen fragt, bevor es schreibt", () => {
  /* Der Entwurf hat den Knopf ohne Rückfrage gezeichnet. Er überschreibt jede Einstellung dieses
     Screens; einen Klick davon entfernt auszuliefern war eine Owner-Frage und die Antwort war ja
     (MENU-12). Die Ratsche haelt fest, dass die zweite Stufe existiert. */
  it("der Fuß trägt das Zurücksetzen und die Ansage", () => {
    const s = render({});
    expect(s).toContain("op-foot");
    expect(s).toContain("op-reset");
  });

  it("der erste Klick schreibt nichts — die Bestätigung ist eine eigene Stufe", async () => {
    const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/ui/optionsBits.jsx", import.meta.url), "utf8"));
    /* `onReset` darf NUR aus dem bestätigten Zweig aufgerufen werden. Stuende es am ersten Knopf,
       waere die zweite Stufe Zierde. */
    const armed = src.slice(src.indexOf("op-reset-armed"));
    expect(armed, "die Bestaetigung ruft das Zuruecksetzen nicht auf").toMatch(/onReset\(\)/);
    const before = src.slice(src.indexOf("export function ResetAction"), src.indexOf("op-reset-armed"));
    expect(before, "der erste Klick setzt schon zurueck").not.toMatch(/onReset\(\)/);
  });

  it("das Zurücksetzen fasst nur die Schlüssel dieses Screens an", () => {
    const d = defaultScreenOptions();
    /* Was der Screen bedient, MUSS drin sein … */
    for (const k of ["muted", "sfxVol", "musicVol", "haptics", "calmMusic", "telemetry",
      "reducedFx", "hideFloatScore", "hideFloatMult", "hideFloatWinLose", "hideBreakdown", "numScale"]) {
      expect(d, `${k} fehlt im Zuruecksetzen`).toHaveProperty(k);
    }
    /* … und was er NICHT bedient, darf nicht mitgehen. Ein „Einstellungen zuruecksetzen", das das
       gewaehlte Deck oder das Spielfeld verwirft, waere ein anderer Knopf als sein Etikett verspricht.
       `lang` fehlt mit Absicht: der Spieler hat sie gerade benutzt, um das Etikett zu lesen. */
    for (const k of ["lang", "deckId", "battlefieldId", "finisher", "archColor", "skin"]) {
      expect(d, `${k} gehoert nicht ins Zuruecksetzen dieses Screens`).not.toHaveProperty(k);
    }
    /* Die Zahlengroesse steht auf der KLEINSTEN Stufe, nicht auf 1 — der Kommentar am Regler behauptete
       jahrelang das Gegenteil. */
    expect(d.numScale).toBe(0.75);
  });
});

describe("#optionen-redesign — die Zeichen sind gezeichnet, nicht getippt", () => {
  it("keine Unicode-Glyphe mehr als Zeilen-Zeichen", async () => {
    const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/ui/OptionsModal.jsx", import.meta.url), "utf8"));
    /* Die alten Zeichen hingen am Schriftschnitt: das Mond-Zeichen des Ruhigen Modus las sich je nach
       Fallback als „C". Kommen sie zurueck, faellt das erst auf einem fremden Geraet auf. */
    for (const glyph of ["⊕", "≋", "☾", "⇢", "✶", "⊘", "✧", "♪", "⇡", "◆", "⚔", "▤", "⌗", "▥"]) {
      expect(src, `die Glyphe ${glyph} steht wieder im Screen`).not.toContain(`icon="${glyph}"`);
    }
    expect(src).toMatch(/icon="language"/);
  });

  it("jedes Zeichen im Screen hat auch einen Pfad", async () => {
    const fs = await import("node:fs");
    const screen = fs.readFileSync(new URL("../src/ui/OptionsModal.jsx", import.meta.url), "utf8");
    const bits = fs.readFileSync(new URL("../src/ui/optionsBits.jsx", import.meta.url), "utf8");
    const used = [...screen.matchAll(/icon=\{?"([a-zA-Z]+)"/g)].map((m) => m[1]);
    expect(used.length, "der Screen traegt gar keine Zeichen mehr").toBeGreaterThan(10);
    for (const name of new Set(used)) {
      expect(bits, `kein Pfad fuer das Zeichen ${name} — es rendert als Nichts`).toMatch(new RegExp(`\\n  ${name}:`));
    }
  });
});

describe.skipIf(EN_OFF)("#optionen-redesign — englisch trägt dieselbe Struktur", () => {
  it("die Umbenennungen stehen in beiden Katalogen", () => {
    setLocale("en");
    const s = render({ muted: false });
    expect(s).toContain("HUD &amp; Text");
    expect(s).toMatch(/aria-label="Sound"/);
    setLocale(SOURCE_LOCALE);
  });
});
