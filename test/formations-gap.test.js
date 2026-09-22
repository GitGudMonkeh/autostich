import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { computeFormations } from "../src/game/formations.js";
import * as CP from "../src/game/campaign.js";

/* ============================================================================
   LÜCKENSCHLUSS (docs/kampagne.md §9) — der Kampagnen-Reward, der eine fremde Karte in einer
   Formation überbrücken lässt.

   Er erfindet nichts: er hebt `gap` in markRuns, denselben Regler, den die Perk-Familien
   E_PACE (Wiederholung) und E_COLORBRIDGE (Farbblock) schon drehen. Geprüft wird deshalb die
   ERKENNUNG — welche Karten am Ende in einer Formation stehen — und nicht, dass irgendwo ein
   Feld gesetzt wurde.
   ============================================================================ */

const card = ([s, v], i) => ({ id: `${s}${v}_${i}`, suit: s, baseRank: v, value: v });
const idOrder = (n) => Array.from({ length: n }, (_, i) => i);
const forms = (arr, gap = null) =>
  computeFormations(idOrder(arr.length), arr.map(card), {}, [], [], [], {}, null, null, null, gap);
// Positionen, die an einer Formation dieses Typs beteiligt sind.
const memberPos = (arr, type, gap = null) =>
  forms(arr, gap).flatMap((f, i) => (f.formations || []).some((x) => x.type === type) ? [i] : []);

/* Fünf gleiche Werte mit EINER fremden Karte in der Mitte. Ohne Lücke zerfällt die Wiederholung
   in zwei Paare, mit Lücke wird ein Lauf daraus. Die Farben wechseln durch, damit kein Farbblock
   dazwischenfunkt. */
const EINE_LUECKE = [["R", 5], ["B", 5], ["G", 9], ["Y", 5], ["R", 5]];
/* Zwei getrennte Brüche in derselben Phase — der Unterschied zwischen „one" und „all". Die
   Segmentgrenze nach Position 4 trennt die beiden Läufe ohnehin. */
const ZWEI_LUECKEN = [["R", 5], ["B", 5], ["G", 9], ["Y", 5], ["R", 5],
                      ["B", 3], ["G", 3], ["Y", 8], ["R", 3], ["B", 3]];

describe("Lückenschluss · die Erkennung", () => {
  it("ändert ohne Reward gar nichts", () => {
    const ohne = memberPos(EINE_LUECKE, "wiederholung");
    expect(memberPos(EINE_LUECKE, "wiederholung", null)).toEqual(ohne);
    expect(memberPos(EINE_LUECKE, "wiederholung", { n: 0, scope: "all" })).toEqual(ohne);
  });

  it("überbrückt die fremde Karte und macht aus zwei Paaren einen Lauf", () => {
    /* Ohne Lücke: zwei Paare, die fremde Karte an 2 steht in keinem. Mit Lücke: ein Lauf über
       0,1,3,4 — die übersprungene Karte selbst wird NICHT Mitglied, das ist der Punkt. */
    expect(memberPos(EINE_LUECKE, "wiederholung")).toEqual([0, 1, 3, 4]);
    expect(memberPos(EINE_LUECKE, "wiederholung", { n: 1, scope: "all" })).toEqual([0, 1, 3, 4]);
    const ohne = forms(EINE_LUECKE);
    const mit = forms(EINE_LUECKE, { n: 1, scope: "all" });
    // Die Zahl, die zählt: der Multiplikator an der letzten Karte des Laufs.
    expect(ohne[4].mult).toBeCloseTo(1.25, 3);   // zweite Karte eines frischen Paares
    expect(mit[4].mult).toBeGreaterThan(ohne[4].mult);
    expect(mit[4].mult).toBeCloseTo(1.8, 3);     // vierte Karte EINES Laufs
  });

  it("markiert die übersprungene Karte, statt sie einzugemeinden", () => {
    const mit = forms([["R", 5], ["R", 5], ["B", 9], ["R", 5], ["R", 5]], { n: 1, scope: "all" });
    const fb = mit[4].formations.find((f) => f.type === "farbblock");
    expect(fb, "der Farbblock sollte über die fremde Farbe hinweg gehen").toBeTruthy();
    expect(fb.gapped).toEqual([2]);
    expect((mit[2].formations || []).map((f) => f.type)).not.toContain("farbblock");
  });

  it("„all\" hebt jeden Lauf der Phase, „one\" nur den ersten, der die Lücke wirklich nimmt", () => {
    const alle = memberPos(ZWEI_LUECKEN, "wiederholung", { n: 1, scope: "all" });
    const einer = memberPos(ZWEI_LUECKEN, "wiederholung", { n: 1, scope: "one" });
    const ohne = memberPos(ZWEI_LUECKEN, "wiederholung");
    const f = (m) => forms(ZWEI_LUECKEN, m);
    // Beide Läufe überbrückt → beide Endkarten stehen auf dem Vierer-Faktor.
    expect(f({ n: 1, scope: "all" })[4].mult).toBeCloseTo(1.8, 3);
    expect(f({ n: 1, scope: "all" })[9].mult).toBeCloseTo(1.8, 3);
    // Nur der erste → die zweite Endkarte bleibt auf dem Paar-Faktor.
    expect(f({ n: 1, scope: "one" })[4].mult).toBeCloseTo(1.8, 3);
    expect(f({ n: 1, scope: "one" })[9].mult).toBeCloseTo(1.25, 3);
    expect(einer).toEqual(alle);            // Mitglieder-Positionen sind dieselben, die FAKTOREN nicht
    expect(f(null)[4].mult).toBeCloseTo(1.25, 3);
    expect(ohne.length).toBeGreaterThan(0); // der Vergleichsfall existiert überhaupt
  });

  it("Stufe III überbrückt zwei fremde Karten in einem Lauf, Stufe II nur eine", () => {
    /* Alles in EINEM Segment: eine Segmentgrenze beendet den Lauf unabhängig vom Budget, und ein
       Testfall, der über sie hinwegmisst, misst die Grenze statt die Lücke. */
    const zweiFremde = [["R", 5], ["B", 9], ["G", 5], ["Y", 9], ["R", 5]];
    expect(memberPos(zweiFremde, "wiederholung")).toEqual([]);
    expect(memberPos(zweiFremde, "wiederholung", { n: 1, scope: "all" })).toEqual([0, 2]);
    expect(memberPos(zweiFremde, "wiederholung", { n: 2, scope: "all" })).toEqual([0, 2, 4]);
  });
});

describe("Lückenschluss · die Tür zum Kampagnen-Stand", () => {
  const camp = (held) => ({ campaign: { held } });

  it("liefert Zahl UND Bereich der gehaltenen Stufe", () => {
    expect(CP.formationGapOf({})).toBeNull();
    expect(CP.formationGapOf(camp({}))).toBeNull();
    for (const tier of [1, 2, 3]) {
      expect(CP.formationGapOf(camp({ lueckenschluss: tier }))).toEqual({
        n: CP.rewardValue("lueckenschluss", tier),
        scope: CP.rewardScope("lueckenschluss", tier),
      });
    }
  });

  it("hält die Zahl mit formationGapWith zusammen — eine Quelle, nicht zwei", () => {
    for (const tier of [1, 2, 3]) {
      const s = camp({ lueckenschluss: tier });
      expect(CP.formationGapWith(s, 0)).toBe(CP.formationGapOf(s).n);
      expect(CP.formationGapWith(s, 4)).toBe(4 + CP.formationGapOf(s).n);
    }
    expect(CP.formationGapWith({}, 4)).toBe(4);
  });

  it("ist wieder im Angebot, seit er wirkt", () => {
    expect(CP.PENDING_REWARDS).not.toContain("lueckenschluss");
    expect(CP.REWARD_BY_ID.lueckenschluss.pending).toBeUndefined();
    expect(CP.rewardAvailable("lueckenschluss", [])).toBe(true);
  });
});

/* ---- Der Wächter, wegen dem die Umstellung überhaupt sicher ist. -------------------------
   `computeFormations` hat elf Stellen. Eine Aufrufstelle, die zehn übergibt, verliert den
   Lückenschluss STILL — der Spieler sähe dort andere Formationen als anderswo im selben Lauf.
   Genau das ist vor der Umstellung schon passiert: reducer.js gab an einer Stelle neun Argumente
   und schob damit die offenen Grenzen in den `plant`-Platz. Deshalb zählt der Wächter Argumente
   statt Text. */
const srcDir = fileURLToPath(new URL("../src/", import.meta.url));
const files = (dir = srcDir, pre = "") => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(`${dir}${e.name}/`, `${pre}${e.name}/`)
    : /\.(js|jsx)$/.test(e.name) ? [{ name: pre + e.name, src: readFileSync(dir + e.name, "utf8") }] : []);

/* Argumente eines Aufrufs, an Kommas der obersten Ebene getrennt. Reicht hier: die Argumente
   enthalten Klammern und Objektliterale, aber keine Kommas in Zeichenketten. */
function argsOf(src, from) {
  let i = from, d = 1, tiefe = 0, n = 1;
  while (i < src.length && d > 0) {
    const c = src[i];
    if ("([{".includes(c)) { d++; tiefe++; }
    if (")]}".includes(c)) { d--; tiefe--; }
    if (c === "," && tiefe === 0 && d === 1) n++;
    i++;
  }
  return { n, ende: i - 1, text: src.slice(from, i - 1) };
}

const STELLEN = [];
for (const { name, src } of files()) {
  // `function computeFormations(` ist die Definition, kein Aufruf — sonst prüfte der Wächter sie mit.
  for (const m of src.matchAll(/(function\s+)?computeFormations\(/g)) {
    if (m[1]) continue;
    const a = argsOf(src, m.index + m[0].length);
    STELLEN.push({ datei: name, zeile: src.slice(0, m.index).split("\n").length, n: a.n, text: a.text });
  }
}

/* Die eine begründete Ausnahme: der interne Kurzaufruf in formations.js selbst, der nur das
   Formations-Potenzial einer Reihenfolge schätzt und dabei bewusst ohne allen Kontext rechnet. */
const AUSNAHME = (s) => s.datei === "game/formations.js" && s.n === 2;

describe("computeFormations · jede Aufrufstelle reicht den Lückenschluss durch", () => {
  it("findet die Aufrufe überhaupt — sonst wäre der Wächter still grün", () => {
    expect(STELLEN.length).toBeGreaterThan(15);
    expect(new Set(STELLEN.map((s) => s.datei)).size).toBeGreaterThan(4);
  });

  it("übergibt überall elf Argumente", () => {
    const falsch = STELLEN.filter((s) => !AUSNAHME(s) && s.n !== 11)
      .map((s) => `${s.datei}:${s.zeile} (${s.n} statt 11)`);
    expect(falsch, `unvollständige Aufrufe: ${falsch.join(", ")}`).toEqual([]);
  });

  it("und im elften steht der Lückenschluss, nicht irgendetwas", () => {
    const falsch = STELLEN.filter((s) => !AUSNAHME(s) && !/formationGapOf\(/.test(s.text))
      .map((s) => `${s.datei}:${s.zeile}`);
    expect(falsch, `letztes Argument ist nicht formationGapOf(): ${falsch.join(", ")}`).toEqual([]);
  });

  it("hält die Ausnahme ehrlich — es muss sie noch geben", () => {
    expect(STELLEN.filter(AUSNAHME).length, "verwaiste Ausnahme, bitte streichen").toBe(1);
  });
});
