import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* #buehne / #deckflug / #skillheim — der Spielbildschirm ab 1400 px.
   Das Projekt hat kein Component-Test-Setup, die Nähte hängen deshalb als Quelltext-Ratsche hier.
   Jede Prüfung sichert eine Stelle, an der der Umbau beim Bauen tatsächlich gestolpert ist —
   nicht die Schreibweise einer Regel, sondern die Eigenschaft, die sie tragen muss. */

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
const kit = readFileSync(new URL("../src/ui/indicators/panelKit.jsx", import.meta.url), "utf8");
const build = readFileSync(new URL("../src/ui/BuildPanel.jsx", import.meta.url), "utf8");

// Der Abschnitt dieses Umbaus: erst die Regeln, die auf JEDER Breite gelten (die Handy-Fassung),
// dann die Media Query ab 1400 px. Der Wächter prüft beide Hälften getrennt — eine Desktop-Regel,
// die in die Basis rutscht, wäre genau der Fehler, den er finden soll.
const block = css.slice(css.indexOf("#buehne — der Spielbildschirm ab 1400 px"));
const mq = block.indexOf("@media (min-width: 1400px)");
const basis = block.slice(0, mq);
const desktop = block.slice(mq);

describe("#buehne · die Bühne ab 1400 px", () => {
  it("der Umbau steht überhaupt noch in index.css", () => {
    expect(desktop.length, "der #buehne-Block fehlt — dann prüft dieser Wächter nichts").toBeGreaterThan(2000);
    expect(desktop).toMatch(/@media \(min-width: 1400px\)/);
  });

  it("die Bühnenbreite hat DREI Deckel — der dritte ist die Höhe", () => {
    // Zwei davon stecken in --rn-w (native Bildbreite, Fensterbreite), der dritte kommt hier dazu.
    const w = desktop.match(/--rn-w:\s*min\(([^;]+)\);/);
    expect(w, "--rn-w fehlt").toBeTruthy();
    expect(w[1], "native Bildbreite als Deckel").toMatch(/1600px/);
    expect(w[1], "Fensterbreite abzüglich der Ränder").toMatch(/100vw/);
    const m = desktop.match(/--bf-w:\s*min\(([^;]+)\);/);
    expect(m, "--bf-w fehlt").toBeTruthy();
    const regel = m[1];
    expect(regel, "die Buehne erbt beide Deckel").toMatch(/var\(--rn-w\)/);
    // Ohne den Höhen-Deckel läuft die Bühne auf flachen Fenstern (1536x791) aus dem Bild.
    expect(regel, "was die HÖHE übrig lässt, mal 2,5").toMatch(/100dvh[\s\S]*\* 2\.5/);
    expect(desktop, "die Höhe folgt aus der Breite, 2,5:1 wie die Bildquelle").toMatch(/--bf-h:\s*calc\(var\(--bf-w\) \/ 2\.5\)/);
  });

  it("Instrumente nehmen die Fensterbreite, nur die Bühne ist am Format gedeckelt", () => {
    // Beide an --bf-w zu klemmen war der erste Wurf: auf 1536 x 791 quetschte das die vier Spuren
    // der Bank auf je 100 px, weil die Bühne dort schon durch die HÖHE begrenzt ist.
    expect(desktop).toMatch(/--rn-w: min\(1600px, calc\(100vw - 80px\)\)/);
    expect(desktop).toMatch(/\.rn-bar, \.rn-milestone, \.rn-bank, \.rn-music \{[^}]*width: var\(--rn-w\)/);
    expect(desktop).toMatch(/\.bf-panel \{[^}]*width: var\(--bf-w\)/);
  });

  it("die Kopfzeile bleibt einzeilig (max-content, nicht auto)", () => {
    // Mit `auto` bekamen die zwei rechten Spuren neben einem spannenden Element fester Breite zu wenig ab;
    // die Knopfreihe brach in vier Zeilen um und schob die Bank aus dem Bild.
    expect(desktop).toMatch(/grid-template-columns: minmax\(0, 1fr\) max-content max-content/);
  });

  it("flache Fenster bekommen ihre eigene Stufe", () => {
    // Dort ist die Höhe der Engpass: jede gesparte Zeile zahlt 2,5-fach in Bühnenbreite aus.
    expect(css).toMatch(/@media \(min-width: 1400px\) and \(max-height: 900px\) \{[\s\S]*--rn-chrome: 380px[\s\S]*height: 210px/);
  });

  it("der Kartenmaßstab ist einheitenlos (sonst fällt die Regel still aus)", () => {
    // scale() nimmt eine ZAHL. --bf-w ist eine Länge — ohne die Division durch 1px ist die
    // Deklaration ungültig, und die Karten bleiben unbemerkt auf 104 x 144 stehen.
    expect(desktop).toMatch(/--card-s:\s*calc\(var\(--bf-w\) \* 0\.11 \/ 104 \/ 1px\)/);
    expect(desktop, "der Slot wächst, sein Inhalt wird skaliert").toMatch(/\.bf-slot > \*\s*\{[^}]*transform:\s*scale\(var\(--card-s\)\)/);
  });

  it("die Karte behält ihre sieben 104x144-Fundstellen (Maßstab statt zweitem Maß)", () => {
    // Der ganze Sinn des Maßstabs: Klingenschnitt, Laser-Stücke und Card.jsx rechnen weiter in 104/144.
    expect(basis, "Basismaß der Karte gehört in die Basis, nicht in den Desktop-Block")
      .toMatch(/\.bf-slot, \.bf-cardbox \{ width: 104px; height: 144px; \}/);
    expect(bf, "der Slot trägt sein Maß als Klasse, nicht inline").not.toMatch(/slotRef\} className="[^"]*" style=\{\{ width: 104/);
  });

  it("Klammern reichen nur durch — die Handy-Fassung bleibt DOM-gleich", () => {
    expect(desktop).toMatch(/\.rn-head, \.rn-body, \.rn-main, \.rn-bars \{ display: contents; \}/);
    expect(basis, "die Bank ist unter 1400 px keine Box").toMatch(/\.rn-bank \{ display: contents; \}/);
    for (const k of ["rn-shell", "rn-body", "rn-main", "rn-bank", "rn-bars", "rn-rail", "rn-build"]) {
      expect(app, `Klammer ${k} fehlt im JSX`).toContain(k);
    }
  });

  it("die Bank hat eine FESTE Höhe und verteilt die Spuren über Flex", () => {
    // Wüchse sie mit ihrem Inhalt, schöbe der vierte Archetyp die Bühne aus dem Bild.
    expect(desktop).toMatch(/\.rn-bank \{[^}]*display: flex[^}]*height: \d+px/);
    // Die Fraktions-Leisten sind ENKEL (rn-bars ist contents) — ohne die zweite Zeile stünde die Bank halb leer.
    expect(desktop).toMatch(/\.rn-bank > \*, \.rn-bars > \* \{[^}]*flex: 1 1 0/);
    expect(desktop, "Analyse und Build behalten ihre feste Spur").toMatch(/\.rn-bank > \.rn-rail\s*\{[^}]*flex: 0 0/);
  });
});

describe("#deckflug · Stapel am Rand, Karte fliegt", () => {
  it("Stapel und Spielfläche liegen unter 1400 px aufeinander", () => {
    expect(basis).toMatch(/\.bf-sidebox > \.bf-deck, \.bf-sidebox > \.bf-play \{ position: absolute; inset: 0; \}/);
  });

  it("ab 1400 px bleiben beide `relative` — NICHT static", () => {
    // `static` nahm dem Deck seinen Bezugspunkt: die absolut liegenden Stapelkarten hingen danach an
    // der Seite und sassen auf der Gegnerseite mitten auf der Karte. Genau das ist beim Bauen passiert.
    expect(desktop).toMatch(/\.bf-side \.bf-deck, \.bf-side \.bf-play \{ position: relative; inset: auto; \}/);
    expect(desktop).not.toMatch(/\.bf-(deck|play)[^{]*\{[^}]*position: static/);
  });

  it("die Gegnerseite ist die Spiegelung", () => {
    expect(desktop).toMatch(/\.bf-side\.is-right \.bf-deck\s*\{ grid-column: 2; \}/);
    expect(desktop).toMatch(/\.bf-side\.is-right \.bf-play\s*\{ grid-column: 1; \}/);
    expect(bf, "die Seite kennt ihre Richtung").toMatch(/dealFrom === "right" \? "is-right" : "is-left"/);
  });

  it("Bewegung, Drehung und Maßstab liegen auf DREI Ebenen", () => {
    // Alles auf einem Knoten überschreibt sich und kippt die Perspektive mit (#ios-word).
    expect(bf, "Flug am gekeyten Karten-Wrapper").toMatch(/className=\{`relative\$\{useFlip \? " bf-fly-in" : ""\}`\}/);
    expect(bf, "Maßstab eine Ebene darüber").toMatch(/className="bf-scale bf-cardbox"/);
    expect(bf, "Drehung eine Ebene darunter").toMatch(/as-flip3d bf-cardbox/);
    expect(css, "die Flugbewegung ist eine reine Translation").toMatch(/@keyframes bf-fly-in \{[\s\S]*translateX\(var\(--bf-fly-x, 0\)\)/);
  });

  it("die Flugstrecke ist im Kartenmaßstab konstant", () => {
    // Lücke (9,25 % der Bühne) + Kartenbreite (11 %) geteilt durch den Maßstab (11 % / 104 px)
    // ergibt IMMER 191,45 px — die Animation läuft innerhalb des skalierten Wrappers.
    const erwartet = (0.0925 + 0.11) * 104 / 0.11;
    expect(erwartet).toBeCloseTo(191.45, 1);
    expect(desktop).toMatch(/\.bf-side\.is-left\s+\.bf-fly-in \{ --bf-fly-x: -191\.45px; \}/);
    expect(desktop).toMatch(/\.bf-side\.is-right \.bf-fly-in \{ --bf-fly-x: 191\.45px; \}/);
    // Die Lücke im Raster muss zu dieser Zahl passen, sonst fliegt die Karte an der Fläche vorbei.
    expect(desktop).toMatch(/column-gap: calc\(var\(--bf-w\) \* 0\.0925\)/);
  });

  it("bei reduzierter Bewegung fliegt nichts", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.bf-fly-in \{ animation: none; \}/);
  });

  it("das Feuer haengt am Stapel", () => {
    // Entscheidung: der Vorrat glueht, die Karte traegt die Glut in den Stich hinaus.
    expect(bf).toMatch(/<div ref=\{slotRef\} className="bf-deck bf-slot relative">/);
  });
});

describe("#skillheim · Skills bei ihrem Archetyp", () => {
  it("die Zuordnung kommt aus dem Register, nicht aus einer Liste im UI", () => {
    expect(kit).toMatch(/import \{ archetypeOf \} from "\.\.\/\.\.\/game\/skills\.js"/);
    expect(kit).toMatch(/\.filter\(\(id\) => archetypeOf\(id\) === arch\)/);
  });

  it("alle vier Fraktions-Leisten haengen am selben Fuss", () => {
    for (const f of ["ChargeBar", "HeatBar", "PlantBar", "GlacierBar"]) {
      const src = readFileSync(new URL(`../src/ui/${f}.jsx`, import.meta.url), "utf8");
      expect(src, `${f} zeigt seine Skills nicht`).toMatch(/footer=\{showSkills \? <PanelSkills/);
    }
  });

  it("das Build-Panel zeigt nur die heimatlosen Skills", () => {
    // Ein Skill, dessen Panel gerade nicht steht, darf nicht verschwinden.
    expect(build).toMatch(/hideSkillArchs\.includes\(archetypeOf\(id\)\)/);
    expect(app, "die Liste wird EINMAL abgeleitet").toMatch(/const shownSkillArchs = \[/);
    expect(app, "und speist auch die Panel-Dichte").toMatch(/const manyFac = shownSkillArchs\.length > 1/);
  });

  it("der Auto-Kollaps ist eine Handy-Regel", () => {
    // Auf der Bank ist der Platz da; eingeklappte Spuren waeren dort verschenkt.
    expect(app).toMatch(/manyActive=\{wide \? false : manyFac\}/);
  });

  it("gescrollt wird nur das Detail — Kopf und Skill-Fuss stehen", () => {
    expect(desktop).toMatch(/\.rn-bars > \.as-panel-fac \{[^}]*display: flex[^}]*overflow: hidden/);
    expect(desktop).toMatch(/\.rn-bars > \.as-panel-fac > \.fac-body \{[^}]*overflow-y: auto/);
    expect(kit, "das Detail traegt die Klasse dafuer").toMatch(/className="fac-body grid gap-3 mt-2\.5"/);
  });
});
