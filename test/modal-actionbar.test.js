import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* Ratsche für die gemeinsame Aktionsleiste (src/ui/modalStyle.jsx).

   Die Buttons tragen `whitespace-nowrap`, ihre Mindestbreite ist also die volle Textbreite — und Flex-Kinder
   schrumpfen per Default nicht unter min-content. Ohne `flex-wrap` passten „↻ Neu würfeln (1)" und
   „Keinen Legendär — Skill wählen" auf einem 412-px-Handy nicht mehr nebeneinander (gemessen: 405 px Inhalt
   in einer 378 px breiten Karte). Weil die Panel-Karten `overflow-y-auto` haben, wird ihr overflow-x nach
   CSS-Regel automatisch zu `auto`: der zweite Button war am Kartenrand ABGESCHNITTEN und die Karte plötzlich
   horizontal scrollbar. Auf Desktop bleibt alles in einer Zeile — `flex-wrap` ist dort ein No-op.

   Das ist die Art Klasse, die beim Aufräumen still wieder verschwindet („zwei Buttons, das passt doch"),
   und der Schaden zeigt sich nur auf schmalen Geräten. Deshalb hier festgenagelt.

   Es gibt keine DOM-Testumgebung (vitest läuft `environment: "node"`), also prüft das den Quelltext. */

const src = readFileSync(new URL("../src/ui/modalStyle.jsx", import.meta.url), "utf8");

describe("ActionBar · Aktionsleiste bricht auf schmalen Geräten um", () => {
  it("die Leiste ist ein umbrechender Flex-Container", () => {
    const bar = src.match(/export function ActionBar[\s\S]*?<div className=\{`([^`]+)`\}/);
    expect(bar, "ActionBar-Container nicht gefunden — Test an den Umbau anpassen").toBeTruthy();
    expect(bar[1], "ohne flex-wrap wird der zweite Button auf dem Handy abgeschnitten").toMatch(/\bflex-wrap\b/);
  });

  it("die Buttons behalten ihre einzeilige Beschriftung", () => {
    // Gegenprobe: der Umbruch ersetzt das Umbrechen INNERHALB eines Buttons, nicht umgekehrt.
    expect(src).toMatch(/ACTIONBTN_BASE = "[^"]*whitespace-nowrap/);
  });
});

/* ============================================================================
   #menu-rework M9 — DER SPERR-ZUSTAND DES LAUF-BEZUGS, und warum er einen eigenen Waechter braucht.

   `feedback-redesign.md` §Zustaende macht aus einem Sonderfall einen ZUSTAND: fehlt der letzte Lauf,
   geht die Zeile auf 42 %, die Zeichenkachel wird stumm, und der Schalter ist gesperrt. Der Satz, der
   diesen Waechter noetig macht, steht direkt daneben:

       „Wichtig: GESPERRT HEISST AUCH PER TASTATUR GESPERRT, nicht nur optisch."

   Vorher war das Kaestchen `disabled` und die Zeile sah aus wie jede andere — man las erst am Text,
   dass hier nichts geht. Jetzt ist es der Sperr-Zustand des Optionen-Kanons, und der haengt an einer
   Eigenschaft, die man beim Aufraeumen nicht sieht: `Toggle` sperrt ueber das `disabled`-ATTRIBUT des
   Knopfes, nicht ueber `pointer-events: none`. Der Unterschied ist unsichtbar, solange man mit der
   Maus prueft, und er ist der ganze Punkt: ein Element, das unbedienbar AUSSIEHT und trotzdem auf die
   Leertaste antwortet, ist schlimmer als eines, das bedienbar aussieht.

   ALS „ENTHAELT KEIN X AUSSER Y" GESCHRIEBEN (H-e), nicht als „ist das erwartete da". Ein Waechter,
   der nur fragt, ob `disabled` VORKOMMT, besteht auch dann, wenn jemand zusaetzlich
   `pointer-events: none` einbaut und `disabled` still fallen laesst.

   Gegengeprueft 2026-08-25 durch Wiedereinbau des Defekts — die Naht war vorher UNBEWACHT: der
   Sperr-Zustand liess sich entfernen, ohne dass ein Test rot wurde. Genau dafuer ist die Gegenprobe da.
   ============================================================================ */
describe("#menu-rework M9 — „kein Lauf\" ist ein Zustand, und gesperrt gilt auch fuer die Tastatur", () => {
  /* OHNE KOMMENTARE gelesen, und das ist keine Feinheit: die Begruendung dieser Naht NENNT
     `pointer-events`, um zu sagen, warum es sie nicht gibt. Ein Waechter, der den Rohtext prueft,
     faellt also ueber die Erklaerung seiner selbst — die Falle, die AGENTS.md unter den
     Quelltext-Ratschen ausdruecklich auffuehrt. Gemessen: genau so ist er beim ersten Lauf rot
     geworden. */
  const NL = String.fromCharCode(10);
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "")
    .split(NL).map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join(NL);
  const fb = strip(readFileSync(new URL("../src/ui/FeedbackModal.jsx", import.meta.url), "utf8"));
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

  it("der Schalter wird ueber `disabled` gesperrt — und NICHT ueber pointer-events", () => {
    /* Die eine Schreibweise, die auch die Tastatur erreicht. */
    expect(fb, "der Lauf-Schalter muss `disabled` tragen, wenn kein Lauf da ist")
      .toMatch(/<Toggle[^>]*disabled=\{!run\}/s);
    /* Und die Gegenrichtung: keine zweite, weichere Sperre daneben. `pointer-events` sperrt die Maus
       und laesst die Leertaste durch — genau der Fehler, den `optionsBits.jsx` fuer den Schalter
       ausdruecklich vermeidet. */
    expect(fb, "pointer-events sperrt die Maus, nicht die Tastatur").not.toMatch(/pointer-events/);
    /* Das alte Kaestchen darf nicht zurueckkommen: es war `disabled` UND sah aus wie jede andere Zeile. */
    expect(fb, "der Lauf-Bezug ist eine Options-Zeile mit Schalter, keine Checkbox")
      .not.toMatch(/type="checkbox"/);
  });

  it("die Zeile traegt den Sperr-Zustand sichtbar — gedaempft und mit stummer Kachel", () => {
    const off = css.match(/\.fb-run\[data-off="1"\]\s*\{([^}]*)\}/);
    expect(off, "kein Sperr-Zustand fuer `.fb-run` — der Zustand ist wieder ein Sonderfall").not.toBeNull();
    const op = Number((off[1].match(/opacity:\s*([\d.]+)/) || [])[1]);
    expect(op, "gedaempft heisst gedaempft: unter voller Deckkraft").toBeLessThan(1);
    expect(op, "und nicht so weit, dass die Zeile unlesbar wird").toBeGreaterThan(0.2);
    expect(css, "die Zeichenkachel muss im Sperr-Zustand stumm werden")
      .toMatch(/\.fb-run\[data-off="1"\]\s+\.fb-runicon\s*\{[^}]*color:/);
  });

  it("das JSX setzt den Haken, an dem der Zustand haengt", () => {
    /* Ohne `data-off` greift keine der beiden Regeln oben — der Waechter pruefte dann eine Regel,
       die nie zutrifft. Beide Haelften, oder keine. */
    expect(fb).toMatch(/data-off=\{run \? undefined : "1"\}/);
  });
});
