import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DESKTOP_AT, DESKTOP_AT_RX, desktopAndRx } from "./desktopBreakpoint.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));   // wie in Battlefield.jsx

/* #buehne / #deckflug / #skillheim — der Spielbildschirm ab 1280 px.
   Das Projekt hat kein Component-Test-Setup, die Nähte hängen deshalb als Quelltext-Ratsche hier.
   Jede Prüfung sichert eine Stelle, an der der Umbau beim Bauen tatsächlich gestolpert ist —
   nicht die Schreibweise einer Regel, sondern die Eigenschaft, die sie tragen muss. */

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
const kit = readFileSync(new URL("../src/ui/indicators/panelKit.jsx", import.meta.url), "utf8");
const build = readFileSync(new URL("../src/ui/BuildPanel.jsx", import.meta.url), "utf8");

// Der Abschnitt dieses Umbaus: erst die Regeln, die auf JEDER Breite gelten (die Handy-Fassung),
// dann die Media Query ab 1280 px. Der Wächter prüft beide Hälften getrennt — eine Desktop-Regel,
// die in die Basis rutscht, wäre genau der Fehler, den er finden soll.
const block = css.slice(css.indexOf("#buehne —"));
const mq = block.indexOf(DESKTOP_AT);
const basis = block.slice(0, mq);
const desktop = block.slice(mq);

describe("#buehne · die Bühne ab 1280 px", () => {
  it("der Umbau steht überhaupt noch in index.css", () => {
    expect(desktop.length, "der #buehne-Block fehlt — dann prüft dieser Wächter nichts").toBeGreaterThan(2000);
    expect(desktop).toMatch(new RegExp(DESKTOP_AT_RX));
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
    expect(css).toMatch(new RegExp(desktopAndRx("max-height: 900px") + " \\{[\\s\\S]*--rn-chrome: 380px[\\s\\S]*height: 210px"));
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
    expect(basis, "die Bank ist unter 1280 px keine Box").toMatch(/\.rn-bank \{ display: contents; \}/);
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
  it("Stapel und Spielfläche liegen unter 1280 px aufeinander", () => {
    expect(basis).toMatch(/\.bf-sidebox > \.bf-deck, \.bf-sidebox > \.bf-play \{ position: absolute; inset: 0; \}/);
  });

  it("ab 1280 px bleiben beide `relative` — NICHT static", () => {
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
    // Die Zahl wird aus der INNEREN Lücke gerechnet, nicht abgetippt: über die fliegt die Karte.
    // Lücke + Kartenbreite (11 %), geteilt
    // durch den Maßstab (11 % / 104 px). Wer die Lücke ändert und die Strecke vergisst, lässt die Karte
    // an ihrer Fläche vorbeifliegen — genau das fängt diese Prüfung.
    const gap = Number(desktop.match(/--bf-deckgap: calc\(var\(--bf-w\) \* ([\d.]+)\)/)[1]);
    const erwartet = Math.round((gap + 0.11) * 104 / 0.11 * 100) / 100;
    const links = Number(desktop.match(/\.bf-side\.is-left\s+\.bf-fly-in \{ --bf-fly-x: -([\d.]+)px; \}/)[1]);
    const rechts = Number(desktop.match(/\.bf-side\.is-right \.bf-fly-in \{ --bf-fly-x: ([\d.]+)px; \}/)[1]);
    expect(links, "Flugstrecke links passt nicht zur Lücke").toBeCloseTo(erwartet, 1);
    expect(rechts, "Flugstrecke rechts passt nicht zur Lücke").toBeCloseTo(erwartet, 1);
  });

  it("#deckpaar · der INNERE Abstand ist der kleinste", () => {
    // Die Reihenfolge IST die Aussage: der Stapel gehoert zu seiner Karte (kleine Luecke), die Mitte
    // ist die Grenze zwischen den zwei Seiten (grosse). Erst war es andersherum (3,25 aussen / 6 Mitte),
    // dann alles gleich — beides hat die Zugehoerigkeit nicht getragen. Der Test RECHNET die zwei
    // Faktoren gegeneinander, statt Zahlen zu vergleichen: ein Zahlendreher saehe sonst „geaendert" aus.
    const seite = Number(desktop.match(/--bf-deckgap: calc\(var\(--bf-w\) \* ([\d.]+)\)/)[1]);
    const mitte = Number(desktop.match(/--bf-gap: calc\(var\(--bf-w\) \* ([\d.]+)\)/)[1]);
    expect(seite, "Stapel und Karte muessen enger stehen als die zwei Seiten zueinander").toBeLessThan(mitte);
    expect(seite, "ganz ohne Naht lesen sich Stapel und Karte als EIN Objekt").toBeGreaterThan(0);
    // Und beide muessen wirklich benutzt werden — sonst ist die Rechnung oben folgenlos.
    expect(desktop, "die Luecke der Seite").toMatch(/column-gap: var\(--bf-deckgap\)/);
    expect(desktop, "die Luecke zwischen den zwei Spielkarten").toMatch(/\.bf-cards \{[^}]*gap: var\(--bf-gap\)/);
    expect(desktop, "kein abgetippter Abstand daneben").not.toMatch(/\.bf-cards \{[^}]*gap: calc\(var\(--bf-w\)/);
  });

  it("bei reduzierter Bewegung fliegt nichts", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.bf-fly-in \{ animation: none; \}/);
  });

  it("das Feuer haengt am Stapel", () => {
    // Entscheidung: der Vorrat glueht, die Karte traegt die Glut in den Stich hinaus.
    expect(bf).toMatch(/<div ref=\{slotRef\} className="bf-deck bf-slot relative">/);
  });
});

describe("#deckzug · erst ziehen BEIDE, dann wird aufgeloest", () => {
  it("der Zug-Takt greift auf ALLEN Breiten (Owner-Entscheidung 2026-08-28), gated nur ueber Bewegung/Turbo", () => {
    // Zuerst war der zweite Takt an `wide` gebunden — am Handy drehte damit weiter nur die
    // Gewinnerkarte um, die Verliererkarte fiel ungedreht weg (Owner-Playtest). Jetzt haengt er
    // ausschliesslich an reduzierter Bewegung und Turbo; eine wieder eingefuehrte Breiten-Bindung
    // waere die Rueckkehr genau dieses Fehlers.
    expect(bf, "zugMs darf nicht mehr an der Breite haengen").toMatch(/const zugMs = !reduced && !!t && flipMs > 170/);
    expect(bf, "keine wide-Bindung am Zug-Takt").not.toMatch(/const zugMs = wide/);
  });

  it("der Zustand haengt an der STICH-NUMMER, nicht an einem Flag", () => {
    // Ein `setState(false)` im Effekt kaeme einen Frame zu spaet — die Aufloesung blitzte fuer ein Bild auf.
    // Runde 2, R17: `hintHold` (offene Ereignis-Hint-Karte) ueberspringt den Zug zusaetzlich — der
    // festgehaltene Stich liegt sofort offen. Die Stich-Nummer bleibt die Identitaet.
    expect(bf).toMatch(/const gezogen = !zugMs \|\| drawnNo === trickNo \|\| hintHold;/);
    expect(bf, "kein setState(false) beim Stichwechsel").not.toMatch(/setDrawnNo\(null\)/);
  });

  it("ALLES, was die Verliererkarte betrifft, haengt am Zug — nicht mehr direkt an sliceOn", () => {
    // Genau diese sieben Zeilen waren der Grund, warum immer nur EINE Seite gezogen hat: sie stehen im
    // ersten Frame des Stichs schon fest, und `flipOn`/`oppFlipOn` schliessen die wegfliegende Seite aus.
    for (const n of ["flyAway", "oppSliced", "oppScorched", "oppHologrid", "oppBlackholed", "oppFlyAway", "playerWinner", "oppWinner"]) {
      const m = bf.match(new RegExp(`const ${n}\\s*=\\s*([^;]+);`));
      expect(m, `${n} nicht gefunden — der Waechter greift ins Leere`).toBeTruthy();
      expect(m[1], `${n} loest noch im Zug-Takt auf`).toContain("aufOn");
    }
    // R17: mit offener Hint-Karte loest NICHTS auf — beide Karten bleiben liegen (kein Wegflug/Finisher).
    expect(bf, "aufOn ist sliceOn NACH dem Zug, gehalten von hintHold").toMatch(/const aufOn = sliceOn && gezogen && !hintHold;/);
  });

  it("die Finisher mit eigenem Trigger warten mit", () => {
    // Klinge-Ghost, Hologrid-Sweep und Loch-Puls haengen am Stichwechsel, nicht an einer Render-Bedingung —
    // ohne eigene Verzoegerung schneiden/saugen sie eine Karte, die noch flippt.
    // Der Ghost-Effekt wird als ABSCHNITT gegriffen — ein `return nachZug(` irgendwo sonst in der Datei
    // (der Hologrid-Zweig steht davor) darf diese Pruefung nicht gruen faerben.
    const ghostEffekt = bf.slice(bf.indexOf("const [slashGhosts"), bf.indexOf("const playerGhosts"));
    expect(ghostEffekt.length, "der Ghost-Effekt ist nicht mehr zu finden").toBeGreaterThan(500);
    expect(ghostEffekt, "Klinge-Ghost").toMatch(/return nachZug\(\(\) => \{/);
    expect(bf, "Hologrid-Sweep").toMatch(/return nachZug\(\(\) => \{\s*setHologridTrigger/);
    expect(bf, "Loch-Puls").toMatch(/pulsZug\(\(\) => \{ setHolePulse/);
  });

  it("nachZug ist STABIL — sonst spawnt ein Turbo-Wechsel einen zweiten Ghost", () => {
    // zugMs als Dependency liesse die gekeyten Effekte mitten im Stich erneut laufen.
    // Bis zur ERSTEN Dependency-Liste nach `const nachZug` schneiden — sonst faende ein lazy `[\s\S]*?`
    // einfach den naechsten leeren Dependency-Array irgendwo weiter unten in der Datei.
    const nz = bf.slice(bf.indexOf("const nachZug = useCallback"));
    const deps = nz.slice(0, nz.indexOf("]);") + 3);
    expect(deps, "nachZug hat Dependencies — dann laeuft der Effekt bei Turbo-Wechsel erneut").toMatch(/\}, \[\]\);$/);
    expect(bf, "zugMs kommt ueber ein Ref herein").toMatch(/const zugRef = useRef\(0\); zugRef\.current = zugMs;/);
  });

  it("#turbo-takt · die Choreografie passt in JEDEN Stich, auch bei MAX", () => {
    // Die festen Untergrenzen (220/320 ms) hielten die Dauer, wenn der Takt schon darunter lag —
    // gemessen ×2 1060 von 880 ms, MAX 540 von 300. Der naechste Stich schnitt sie ab.
    const zug = Number(bf.match(/const ZUG_ANTEIL = ([\d.]+)/)[1]);
    const weg = Number(bf.match(/WEG_ANTEIL = ([\d.]+)/)[1]);
    expect(zug + weg, "kein Atemzug zwischen zwei Stichen").toBeLessThanOrEqual(0.95);
    // Bei 1× duerfen die Anteile NICHT greifen — das Normaltempo bleibt, wie es war.
    const t1 = 1750;
    expect(zug * t1, "der Deckel wuerde den Zug bei 1× verkuerzen").toBeGreaterThan(460);
    expect(weg * t1, "der Deckel wuerde den Wegflug bei 1× verkuerzen").toBeGreaterThan(900);
    // Ab ×2 muessen sie greifen, sonst ist die Aenderung wirkungslos.
    for (const t of [1750 / 2, 1750 / 4, 1750 / 5]) {
      expect(Math.min(clamp(t * 0.55, 220, 460), t * zug) + Math.min(clamp(t * 0.7, 320, 900), t * weg),
        `bei Takt ${Math.round(t)} ms laeuft die Choreografie ueber`).toBeLessThan(t);
    }
    // Die Deckel gelten seit dem Handy-Zug-Takt (2026-08-28) auf allen Breiten.
    expect(bf, "beide Deckel gelten ueberall").toMatch(/const flyDur\s+= Math\.min\(flyDurRoh, flipMs \* WEG_ANTEIL\);/);
    expect(bf, "beide Deckel gelten ueberall").toMatch(/const flipDur\s+= Math\.min\(flipDurRoh, flipMs \* ZUG_ANTEIL\);/);
  });

  it("ohne Zug-Takt (reduzierte Bewegung, sehr hoher Turbo) laeuft alles SOFORT", () => {
    expect(bf).toMatch(/const ms = zugRef\.current;\s*if \(!ms\) \{ fn\(\); return undefined; \}/);
    expect(bf).toMatch(/if \(!zugMs\) \{ fn\(\); return; \}/);   // pulsZug
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
