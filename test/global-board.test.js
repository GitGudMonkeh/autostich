import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ============================================================
   #global — GLOBALE BESTENLISTE

   Die Kachel „Bestenliste" verlinkte bis hierher denselben Bildschirm wie der große Ranglisten-Knopf,
   obwohl ihr Untertitel „Globale Highscores" verspricht: `fetchGlobalTop` existierte, wurde von der UI
   aber nirgends aufgerufen. Jetzt trennen sich die beiden Einstiege:

     Kachel „Bestenliste" (+ GameOver) → mode="board"  · Global · Woche · Challenger — nur nachschlagen.
     Ranglisten-Knopf                  → mode="ranked" · unverändert: Woche mit Seed, Modifikatoren,
                                          Spielen-Knopf und Regeln.

   Dazu zwei neue Angaben je Zeile: welche Skills gespielt wurden (bisher bei fremden Läufen verdeckt)
   und der Baumstand (x von TOTAL_NODES) — die Größe, ohne die sich zwei Scores nicht einordnen lassen.

   Diese Datei ist eine QUELLTEXT-RATSCHE (das Projekt hat kein Component-Test-Setup). Sie prüft die
   Verdrahtung, nicht die Optik: Ob die Pille schön aussieht, entscheidet das Gerät — ob sie überhaupt
   noch an den richtigen Bildschirm gehängt ist, entscheidet dieser Test.
   ============================================================ */

/* Zeilenenden beim Lesen vereinheitlichen (Gürtel und Hosenträger): Seit .gitattributes (`* text=auto eol=lf`)
   liegt der Quelltext auch auf Windows mit LF in der Arbeitskopie. Eine Arbeitskopie, die davor ausgecheckt
   wurde, hat aber noch CRLF — und die Ratschen unten greifen teils ÜBER einen Zeilenumbruch
   (`boardMode && \(\n\s*<div …`), finden dann nichts und melden einen Umbau, den es nie gab.
   Gleiche Naht wie in shop-scale.test.js. */
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const app = read("src/App.jsx");
const screen = read("src/ui/LeaderboardScreen.jsx");
const stats = read("src/ui/RunStats.jsx");
const detail = read("src/ui/RunDetail.jsx");

describe("#global · die zwei Hub-Einstiege landen in verschiedenen Rollen", () => {
  it("der Ranglisten-Knopf öffnet den Spiel-Einstieg, Kachel und GameOver das Nachschlagen", () => {
    expect(app).toMatch(/onRankedBoard=\{\(\) => setShowLeaderboard\("ranked"\)\}/);
    // Ein Aufrufer für die Nachschlage-Rolle: die Hub-Kachel. exp: der Bestenlisten-Knopf im GameOver stand in der
    // Freischaltungs-Liste und ist mit der Meta-Progression gegangen.
    expect((app.match(/onLeaderboard=\{\(\) => setShowLeaderboard\("board"\)\}/g) || []).length).toBe(1);
  });

  it("der Zustand wird als `mode` durchgereicht — sonst sähen beide Einstiege gleich aus", () => {
    expect(app).toMatch(/mode=\{showLeaderboard === "ranked" \? "ranked" : "board"\}/);
    expect(app).toMatch(/initialTab=\{showLeaderboard === "ranked" \? "meister" : "global"\}/);
    expect(screen).toMatch(/mode = "ranked"/);          // Default = die alte Rolle, nicht die neue
    expect(screen).toMatch(/const boardMode = mode === "board"/);
  });
});

describe("#global · Reitersätze", () => {
  const tabIds = (constName) => {
    const block = new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\n\\];`).exec(screen);
    expect(block, `${constName} nicht gefunden`).toBeTruthy();
    return [...block[1].matchAll(/id:\s*"(\w+)"/g)].map((m) => m[1]);
  };

  it("Nachschlagen zeigt Global · Woche · Challenger — und KEINE Regeln", () => {
    // Die Regeln beschreiben, wie man Ranglisten-Läufe spielt. Sie gehören dorthin, wo man sie startet.
    expect(tabIds("TABS_BOARD")).toEqual(["global", "meister", "champions"]);
  });

  it("der Spiel-Einstieg behält seine drei Reiter inklusive Regeln", () => {
    expect(tabIds("TABS_RANKED")).toEqual(["meister", "champions", "regeln"]);
  });

  it("der Wochen-Reiter heißt in beiden Sätzen `meister`", () => {
    /* Die id ist nicht nur ein Reitername: sie ist zugleich der Board-String der Datenbank und der Wert,
       den App.jsx als `initialTab` hereinreicht. Ein Umbenennen hier bräche beides still. */
    expect(tabIds("TABS_BOARD")).toContain("meister");
    expect(tabIds("TABS_RANKED")).toContain("meister");
  });
});

describe("#global · im Nachschlage-Modus wird nicht gespielt", () => {
  it("Seed-Kasten, Spielen-Knopf und Modifikator-Chips hängen an `!boardMode`", () => {
    // Ein Weg zum Spielen, nicht zwei — sonst steht der Ranglisten-Knopf im Hub für nichts Eigenes mehr.
    /* Seit dem Desktop-Pass steckt ALLES zum Spielen in EINER Klammer (`lb-cockpit` — ab 1280 px die eigene
       Spalte neben der Liste). Geprüft wird deshalb die Klammer und ihr Inhalt, nicht mehr jede Zeile
       einzeln: Seed, Spielen-Knopf und BEIDE Darstellungen der Modifikatoren (Chips am Handy, ausgeschrieben
       auf dem Desktop) müssen darin liegen — sonst tauchte eine davon im Nachschlage-Modus wieder auf. */
    expect(screen).toMatch(/\{!boardMode && \(<div className="lb-cockpit">/);
    const cockpit = /\{!boardMode && \(<div className="lb-cockpit">([\s\S]*?)<\/div>\)\}/.exec(screen);
    expect(cockpit, "lb-cockpit-Klammer nicht gefunden").toBeTruthy();
    for (const teil of [/board\.weekSeed/, /board\.play/, /<WeekModChips/, /lb-modlist/])
      expect(cockpit[1], `gehört ins Cockpit: ${teil}`).toMatch(teil);
    // …und stattdessen ein Satz, der sagt, wo es langgeht.
    expect(screen).toMatch(/boardMode && \(\n\s*<div className="text-meta-3 opacity-45 leading-snug mb-3">\{tr\("board\.week\.viewOnly"\)\}/);
  });

  it("der Global-Reiter fährt fetchGlobalTop (kein `board`-Prop) und schaltet die Baum-Pille an", () => {
    const tab = /\{tab === "global" && \(([\s\S]*?)\n\s*\)\}/.exec(screen);
    expect(tab, "Global-Reiter nicht gefunden").toBeTruthy();
    expect(tab[1], "ein `board`-Prop würde auf fetchBoardTop umschalten").not.toMatch(/\bboard=/);
  });
});

describe("#global · Anti-Copy (#205) neu gezogen", () => {
  it("Skills sind bei fremden Läufen sichtbar, Perks nicht", () => {
    /* Der Kern der Änderung: Sechs Skills sind die Identität eines Laufs — ohne sie ist eine Bestenliste
       eine Namensliste mit Zahlen. Nachbauen lässt sich ein Lauf daran nicht; das hängt an den Perks und
       der Kartenreihenfolge, und genau die bleiben verdeckt. */
    /* `showPerks` deckt seit dem Victory-Screen-Nachzug auch die FAMILIEN-Perks ab (#167 — sie sind der
       größere Teil dessen, was ein Lauf wählt). Entscheidend für die Anti-Copy-Regel bleibt, dass BEIDE
       Sorten hinter `!anonymized` hängen: hier steht deshalb der Anfang der Zeile, nicht mehr ihr Wortlaut. */
    expect(stats).toMatch(/const showPerks = !anonymized && \(\(perks !== null && perks\.length > 0\) \|\| families\.length > 0\);/);
    expect(stats).toMatch(/const showSkills = skills !== null && skills\.length > 0;/);
    expect(stats).not.toMatch(/!anonymized && skills/);
  });

  it("die finale Aufstellung bleibt verdeckt", () => {
    expect(detail).toMatch(/!anonymized && entry\.deckSnapshot\?\.cards\?\.length > 0/);
  });

  it("dass etwas fehlt, wird gesagt — aber nur, wenn wirklich etwas verdeckt wird", () => {
    // Bei einem Alt-Eintrag ohne Perk-Spalte (perks === null) gibt es nichts zu verbergen; der Hinweis
    // wäre dort eine Lüge.
    expect(stats).toMatch(/const showHidden = anonymized && perks !== null && perks\.length > 0;/);
    expect(stats).toMatch(/t\("runstats\.hidden"\)/);
  });
});
