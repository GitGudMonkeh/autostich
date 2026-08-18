import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import de from "../src/i18n/de.js";
import en from "../src/i18n/en.js";
import { UA_MAX } from "../src/game/telemetry.js";

/* ============================================================
   DATENSCHUTZ-NAHT (#datenschutz)

   Der Anlass: Der Options-Text sagte „Score, Perks, Skills, Fortschritt" — gesendet wurde zusätzlich
   Gerätekontext (Browserkennung, Kerne, Speicher, Fenstergröße, Pixeldichte) und eine dauerhafte
   Install-Kennung. Niemand hatte das absichtlich verschwiegen; das Feld kam später dazu, und den Text
   hat dabei keiner mehr angefasst. Genau diese Drift fängt hier ein Test ab statt eines Vorsatzes.

   Geprüft wird die Richtung, die weh tut: WENN der Code ein Feld sendet, MUSS der Hinweis es kennen.
   Die Liste unten ist deshalb kein Duplikat des Codes, sondern die Gegenprobe — kommt in clientInfo()
   ein Feld dazu, wird dieser Test rot und zwingt zur Entscheidung: entweder in den Hinweis aufnehmen
   oder das Feld wieder rausnehmen. Beides ist in Ordnung, stilles Weiterlaufen nicht.
   ============================================================ */

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

describe("#datenschutz · der Hinweis kennt, was der Code sendet", () => {
  /* Die Gerätekontext-Felder, die im Hinweis (privacy.sec.telemetry.body) aufgezählt sind.
     Reihenfolge egal, Vollständigkeit nicht. `fx` ist die Effekt-Stufe aus den Optionen — sie steckt
     im Hinweis unter „Fortschritt/Einstellungen" nicht drin, sondern ist bewusst Teil der Lauf-Daten. */
  const DOKUMENTIERT = new Set(["fx", "ua", "cpu", "mem", "lang", "w", "h", "dpr", "touch"]);

  it("clientInfo() sendet kein Feld, das der Hinweis nicht kennt", () => {
    const src = read("src/game/telemetry.js");
    // Nur den Rumpf von clientInfo() betrachten — sonst fischt die Regex Zuweisungen aus buildRunPayload mit.
    const body = /function clientInfo\([\s\S]*?\n}/.exec(src);
    expect(body, "clientInfo() nicht gefunden — wurde sie umbenannt?").toBeTruthy();
    const felder = [...body[0].matchAll(/\binfo\.(\w+)\s*=/g)].map((m) => m[1]);
    expect(felder.length, "clientInfo() setzt gar keine Felder mehr?").toBeGreaterThan(0);
    const neu = felder.filter((f) => !DOKUMENTIERT.has(f));
    expect(neu, `Neues Telemetrie-Feld ohne Eintrag im Datenschutz-Hinweis: ${neu.join(", ")}\n`
      + "→ entweder in privacy.sec.telemetry.body (de.js UND en.js) aufnehmen und hier eintragen,\n"
      + "  oder das Feld wieder entfernen. Ein Hinweis, der weniger nennt als gesendet wird, ist der Fehler.").toEqual([]);
  });

  it("die Install-Kennung wird als dauerhaft und pseudonym benannt", () => {
    // Sie ist der einzige Wiedererkennungsanker über Läufe hinweg — und die einzige Handhabe für eine
    // Löschbitte. Beide Kataloge müssen sie erwähnen, sonst ist der Abschnitt „Löschung" wertlos.
    expect(de["privacy.sec.telemetry.body"]).toMatch(/Install-Kennung/);
    expect(en["privacy.sec.telemetry.body"]).toMatch(/install ID/i);
    expect(de["privacy.installId.hint"]).toBeTruthy();
    expect(en["privacy.installId.hint"]).toBeTruthy();
  });

  it("der Hinweis nennt die UA-Kappung als Platzhalter, nicht als abgetippte Zahl", () => {
    // Dieselbe Regel wie bei den Registertexten: Zahlen, die der Code bestimmt, werden interpoliert.
    // Stünde „180" im Katalog, liefe es beim nächsten Anfassen von UA_MAX still auseinander.
    for (const cat of [de, en]) {
      expect(cat["privacy.sec.telemetry.body"]).toContain("{ua}");
      expect(cat["privacy.sec.telemetry.body"]).not.toContain(String(UA_MAX));
    }
  });

  it("der Hinweis deckt AUCH die Bestenliste ab, nicht nur die Telemetrie", () => {
    // Der zweite Sender — und der personenbezogenere: der Nickname ist selbst gewählt und öffentlich.
    // Eine Datenschutz-Seite, die nur die anonyme Telemetrie erklärt, verschweigt die lautere Hälfte.
    expect(de["privacy.sec.board.body"]).toMatch(/Nickname/);
    expect(en["privacy.sec.board.body"]).toMatch(/nickname/i);
  });

  /* Dieselbe Gegenprobe wie für clientInfo(), nur für den zweiten Sender: Die oberste Stufe der
     Spalten-Kaskade IST die Liste dessen, was das Board je Lauf speichert. Kommt dort eine Spalte dazu
     (so wie `tree_nodes` für das Global-Board), wird dieser Test rot und erzwingt die Entscheidung —
     in den Hinweis aufnehmen oder die Spalte wieder rausnehmen.

     Der Anlass war real: bis zu dieser Runde nannte der Hinweis „Score, Durchläufe, Stiche, Archetypen,
     Perks, Skills, Seed" — gespeichert wurden aber zusätzlich beste Serie, Formationen, Crits, Siege,
     bester Stich und die Score-Anteile. Niemand hatte das verschwiegen, die Spalten kamen später dazu. */
  const BOARD_DOKUMENTIERT = new Set([
    // Im Hinweistext einzeln benannt:
    "name", "score", "cycles", "tricks", "archetypes", "perks", "skills", "seed", "tree_nodes",
    // …und als Gruppe „Kennzahlen des Laufs":
    "best_streak", "max_formations", "formation_score", "crits", "wins", "crit_bonus_score", "best_trick_score",
    /* Technische Spalten, kein Spielerdatum: `id` = Zeilenschlüssel · `created_at` = Zeitstempel der Zeile ·
       `board` = auf welchem Board die Zeile hängt · `level` = Alt-Duplikat von `cycles` (bleibt befüllt,
       damit die bestehende Tabelle kein Schema-Update braucht). */
    "id", "created_at", "board", "level",
  ]);

  it("der Bestenlisten-Hinweis kennt jede Spalte, die das Board speichert", async () => {
    // leaderboard.js liest BASE/KEY beim Modul-Laden aus import.meta.env → für den Import stubben.
    vi.stubEnv("VITE_SUPABASE_URL", "https://db.test");
    vi.stubEnv("VITE_SUPABASE_KEY", "anon-key");
    const { COL_STAGES } = await import("../src/game/leaderboard.js");
    const spalten = COL_STAGES[0].split(",").map((c) => c.trim()).filter(Boolean);
    expect(spalten.length, "oberste Kaskadenstufe ist leer?").toBeGreaterThan(0);
    const neu = spalten.filter((c) => !BOARD_DOKUMENTIERT.has(c));
    expect(neu, `Neue Board-Spalte ohne Eintrag im Datenschutz-Hinweis: ${neu.join(", ")}\n`
      + "→ entweder in privacy.sec.board.body (de.js UND en.js) aufnehmen und hier eintragen,\n"
      + "  oder die Spalte wieder entfernen.").toEqual([]);
    vi.unstubAllEnvs();
  });
});

describe("#datenschutz · der Hinweis ist von überall erreichbar", () => {
  /* Drei Einstiege, bewusst an unterschiedlichen Stellen der Reise:
       Optionen        — wo der Telemetrie-Schalter steht (der Moment der Entscheidung),
       Startbildschirm — wo man ihn SUCHT (der dauerhafte Einstieg),
       Namens-Dialog   — wo der öffentlich sichtbare Nickname gewählt wird.
     Fällt einer davon bei einem Umbau raus, ist der Hinweis zwar noch da, aber nicht mehr auffindbar —
     und genau das merkt niemand, weil nichts kaputtgeht. */
  const EINSTIEGE = ["src/ui/OptionsModal.jsx", "src/ui/StartScreen.jsx", "src/ui/UsernameModal.jsx"];

  it.each(EINSTIEGE)("%s bietet den Hinweis an", (datei) => {
    expect(read(datei)).toMatch(/onPrivacy/);
  });

  it("App.jsx verdrahtet das Overlay und reicht es an alle drei Einstiege durch", () => {
    const app = read("src/App.jsx");
    expect(app).toMatch(/PrivacyModal/);
    // Drei Übergabestellen — eine je Einstieg.
    expect((app.match(/onPrivacy=\{/g) || []).length).toBe(EINSTIEGE.length);
    // Die Zurück-Geste muss ihn zuerst schließen: er liegt auf z-50 über allem anderen.
    const back = /const handleBack = \(\) => \{[\s\S]*?\n {2}\};/.exec(app);
    expect(back, "handleBack nicht gefunden").toBeTruthy();
    expect(back[0].indexOf("showPrivacy"), "showPrivacy muss die ERSTE Prüfung in handleBack sein")
      .toBeLessThan(back[0].indexOf("showUsername"));
  });

  it("jeder Abschnitt des Hinweises hat Titel und Text in beiden Sprachen", () => {
    // Die Abschnittsliste lebt in der Komponente; hier wird sie ausgelesen statt abgetippt, damit ein
    // neuer Abschnitt ohne Übersetzung sofort auffällt (der i18n-Wächter sähe ihn nicht — er prüft nur,
    // dass vorhandene Schlüssel auf beiden Seiten stehen, nicht dass ein gebrauchter Schlüssel existiert).
    const src = read("src/ui/PrivacyModal.jsx");
    const list = /const SECTIONS = \[([^\]]+)\]/.exec(src);
    expect(list, "SECTIONS nicht gefunden").toBeTruthy();
    const secs = [...list[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
    expect(secs.length).toBeGreaterThan(0);
    for (const s of secs) {
      for (const [name, cat] of [["de", de], ["en", en]]) {
        expect(cat[`privacy.sec.${s}.title`], `${name}: privacy.sec.${s}.title fehlt`).toBeTruthy();
        expect(cat[`privacy.sec.${s}.body`], `${name}: privacy.sec.${s}.body fehlt`).toBeTruthy();
      }
    }
  });
});
