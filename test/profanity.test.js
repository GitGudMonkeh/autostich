import { describe, it, expect } from "vitest";
import { isAllowedUsername, normalizeName, denseName, patternFor, MAX_USERNAME, PATTERNS } from "../src/game/profanity.js";
import { BANNED_SUBSTRING, BANNED_WORD, ALLOW } from "../src/game/profanityWords.js";

/* ============================================================
   #174 — Usernamen-Filter.

   Der Filter hat zwei Fehlerarten, und beide kosten etwas:
     - Durchrutscher → eine Beleidigung steht im GLOBALEN Board, für alle sichtbar.
     - Fehltreffer   → ein harmloser Spieler kann seinen Namen nicht speichern und
                       versteht nicht warum.
   Deshalb prüft diese Suite beide Richtungen gleich gründlich. Die „darf durch"-Fälle
   sind keine Beiwerk-Tests: sie sind die Ratsche, die verhindert, dass jemand später
   einen Begriff in die Sperrliste kippt, der halb Deutschland aussperrt.
   ============================================================ */

const blocked = (n) => expect(isAllowedUsername(n), `„${n}" sollte GESPERRT sein`).toEqual({ ok: false, reason: "profanity" });
const passes  = (n) => expect(isAllowedUsername(n), `„${n}" sollte ERLAUBT sein`).toEqual({ ok: true });

describe("profanity · Grundfälle", () => {
  it("lässt gewöhnliche Namen durch", () => {
    for (const n of ["Dani", "PixelPirat", "Stichmeister", "xX_Bob_Xx", "Anna-Lena", "Spieler 1"]) passes(n);
  });

  it("sperrt die Klartext-Treffer in beiden Sprachen", () => {
    for (const n of ["Arschloch", "Hurensohn", "Wichser", "Schlampe", "Fotze"]) blocked(n);
    for (const n of ["fuck", "Bitch", "asshole", "Motherfucker", "Cunt"]) blocked(n);
  });

  it("ist unabhängig von Groß-/Kleinschreibung und Randzeichen", () => {
    for (const n of ["ARSCHLOCH", "ArScHlOcH", "  arschloch  ", "_arschloch_", "★fuck★"]) blocked(n);
  });

  it("findet den Begriff auch mitten im Kompositum (deutsche Zusammenschreibung)", () => {
    for (const n of ["MegaArschloch", "DerWichserVonNebenan", "SuperFuckBoi"]) blocked(n);
  });
});

describe("profanity · Umgehungsversuche", () => {
  it("Leetspeak", () => {
    for (const n of ["4rschl0ch", "Sh1t", "5hit", "@rschloch", "ni99er", "F0tze", "h1tler", "$hit"]) blocked(n);
  });

  it("Zeichen dazwischen (Punkte, Leerzeichen, Unterstriche)", () => {
    for (const n of ["f.u.c.k", "f u c k", "a-r-s-c-h", "s_h_i_t"]) blocked(n);
  });

  it("gedehnte Buchstaben", () => {
    for (const n of ["fuuuuck", "ffuck", "aaarschloch", "shiiiit", "Niggger"]) blocked(n);
  });

  it("Umlaute und diakritische Verkleidung", () => {
    for (const n of ["Fötze", "Ärschloch", "Miststück", "Scheiße", "Schëisse", "fück"]) blocked(n);
  });

  it("Unicode-Homoglyphen (kyrillische Buchstaben, die lateinisch aussehen)", () => {
    blocked("Ѕhit");        // kyrillisches Ѕ (U+0405)
    blocked("аrschloch");   // kyrillisches а (U+0430)
    blocked("fuсk");        // kyrillisches с (U+0441)
  });

  it("Kombination aus allem", () => {
    blocked("4 R $ C H L 0 C H");
  });
});

describe("profanity · Whitelist gegen False Positives (Scunthorpe)", () => {
  it("der Lehrbuchfall selbst", () => {
    passes("Scunthorpe");       // enthält „cunt"
    blocked("Cunt");            // der Begriff allein bleibt gesperrt
    blocked("Scunt");           // Whitelist greift nur beim vollständigen Wort
  });

  it("deutsche Wörter mit „arsch“ darin", () => {
    for (const n of ["Marsch", "Marschall", "Barsch", "Warschau", "Marschieren", "harsch"]) passes(n);
    blocked("Arsch");
    blocked("Arschgeige");
  });

  it("Ländernamen kollidieren nicht mit dem Slur", () => {
    passes("Nigeria");
    passes("Niger");
    blocked("Nigger");
    blocked("Nigga");
  });

  it("weitere Fehltreffer-Kandidaten", () => {
    for (const n of ["Mongolei", "Mongole", "Shiitake"]) passes(n);
    blocked("Mongo");
  });

  it("die Whitelist entschärft nur sich selbst, nicht den Rest des Namens", () => {
    blocked("ScunthorpeArschloch");
  });
});

describe("profanity · Wortgrenze statt Substring bei mehrdeutigen Begriffen", () => {
  it("„hure“ trifft nur als eigenes Wort", () => {
    passes("Schuhregal");       // enthält „huregal" → „hure"
    passes("Hurrikan");
    blocked("Hure");
    blocked("Huren Sohn");      // Trennzeichen fallen weg → „hurensohn"
  });

  it("„schwanz“ trifft nicht im Kompositum", () => {
    passes("Pferdeschwanz");
    passes("Schwanzflosse");
    blocked("Schwanz");
  });

  it("„cum“ zerlegt nicht jedes zweite englische Wort", () => {
    for (const n of ["document", "Documents", "accumulate", "Cucumber"]) passes(n);
    blocked("cum");
  });

  it("weitere Token-Fälle", () => {
    passes("Fagott");   passes("Marseille");   passes("Cocktail");   passes("Grapefruit");
    blocked("Fag");     blocked("Arse");       blocked("Cock");      blocked("Rape");
  });

  it("Ziffern trennen ein Token ab", () => {
    blocked("Hure2000");
  });
});

describe("profanity · bewusst NICHT gesperrt", () => {
  /* Diese Wörter sind der Preis, den ein zu eifriger Filter kostet. Wer sie sperrt,
     sperrt Alltagssprache — die Begründungen stehen im Kopf von profanityWords.js. */
  it("deutsche Alltagswörter", () => {
    for (const n of ["Dicker", "DickerMann", "Ass", "Assi", "Analyse", "Kanal", "Sauerstoff",
                     "sauber", "Bescheid", "Titan", "Minuten", "Aktivitäten", "Mose"]) passes(n);
  });

  it("englische Alltagswörter", () => {
    for (const n of ["Classic", "Assassin", "Password", "Absolutely", "Viscount", "Wankel",
                     "Peninsula", "Therapist", "Grape"]) passes(n);
  });

  it("Beleidigungen ohne Vulgärgehalt bleiben erlaubt (kein Höflichkeits-Filter)", () => {
    for (const n of ["Idiot", "Depp", "Trottel", "Noob"]) passes(n);
  });
});

describe("profanity · Länge und Leerstring", () => {
  it("leer, nur Leerraum, null/undefined → empty", () => {
    for (const n of ["", "   ", "\t\n", null, undefined]) {
      expect(isAllowedUsername(n)).toEqual({ ok: false, reason: "empty" });
    }
  });

  it("genau MAX_USERNAME Zeichen sind noch erlaubt, eins mehr nicht", () => {
    expect(MAX_USERNAME).toBe(20);
    passes("a".repeat(MAX_USERNAME));
    expect(isAllowedUsername("a".repeat(MAX_USERNAME + 1))).toEqual({ ok: false, reason: "too_long" });
  });

  it("die Länge zählt Zeichen, nicht UTF-16-Einheiten (Emoji sind ein Zeichen)", () => {
    passes("🐙".repeat(MAX_USERNAME));
  });

  it("Profanität schlägt Länge nicht — zu lang wird zuerst gemeldet", () => {
    expect(isAllowedUsername(`Arschloch${"x".repeat(20)}`).reason).toBe("too_long");
  });

  it("ein Name nur aus Sonderzeichen ist erlaubt (nichts zu prüfen)", () => {
    passes("★☆★");
  });
});

describe("profanity · normalizeName", () => {
  it("faltet, entleetet, strippt und zieht Wiederholungen zusammen", () => {
    expect(normalizeName("  Dani  ")).toBe("dani");
    expect(normalizeName("S-h_1.t")).toBe("shit");
    expect(normalizeName("sh!t")).toBe("shit");       // „!" ist eine Leetspeak-Form von i …
    expect(normalizeName("Shit!")).toBe("shiti");     // … und zählt deshalb auch am Wortende mit
    expect(normalizeName("aaaa")).toBe("a");
    expect(normalizeName("Fötze")).toBe("fotze");
    expect(normalizeName("Straße")).toBe("strase");   // ß → ss → zusammengezogen
    expect(normalizeName("★☆★")).toBe("");
  });

  it("ist idempotent — die kanonische Form normalisiert auf sich selbst", () => {
    for (const n of ["Dani", "S-h_1.t", "Fötze", "Marschall", "xX_Bob_Xx"]) {
      expect(normalizeName(normalizeName(n))).toBe(normalizeName(n));
    }
  });

  it("ist rein — gleiche Eingabe, gleiche Ausgabe, keine versteckte Zustandsänderung", () => {
    const runs = Array.from({ length: 5 }, () => normalizeName("4rschl0ch"));
    expect(new Set(runs).size).toBe(1);
  });
});

describe("profanity · Muster-Erzeugung (Grundlage des SQL-Guards)", () => {
  it("baut wiederholungstolerante Muster", () => {
    expect(patternFor("shit")).toBe("s+h+i+t+");
    expect(patternFor("nigger")).toBe("n+i+g+g+e+r+");  // zwei g bleiben gefordert
  });

  it("normalisiert den Listeneintrag mit (Umlaute, ß)", () => {
    expect(patternFor("miststück")).toBe("m+i+s+t+s+t+u+c+k+");
  });

  it("verwirft leere Einträge", () => {
    expect(patternFor("")).toBe(null);
    expect(patternFor("★")).toBe(null);
  });
});

describe("profanity · Listen-Hygiene", () => {
  it("kein Eintrag ist leer oder normalisiert sich weg", () => {
    for (const w of [...BANNED_SUBSTRING, ...BANNED_WORD, ...ALLOW]) {
      expect(patternFor(w), `Eintrag „${w}" normalisiert zu nichts`).not.toBe(null);
    }
  });

  /* Verglichen wird die DICHTE Form, nicht die kollabierte: gesucht wird auf der dichten.
     „shiitake" und „shitake" sind dort zwei verschiedene Einträge — und beide werden
     gebraucht, weil die Whitelist wörtlich arbeitet. */
  it("keine Dubletten innerhalb einer Liste", () => {
    for (const [name, list] of [["BANNED_SUBSTRING", BANNED_SUBSTRING], ["BANNED_WORD", BANNED_WORD], ["ALLOW", ALLOW]]) {
      const norm = list.map(denseName);
      const dupes = norm.filter((v, i) => norm.indexOf(v) !== i);
      expect(dupes, `Dubletten in ${name}: ${dupes.join(", ")}`).toEqual([]);
    }
  });

  it("kein Begriff steht gleichzeitig auf Sperr- und Whitelist", () => {
    const allowed = new Set(ALLOW.map(denseName));
    const clash = [...BANNED_SUBSTRING, ...BANNED_WORD].map(denseName).filter((w) => allowed.has(w));
    expect(clash, `Begriff sperrt und erlaubt sich selbst: ${clash.join(", ")}`).toEqual([]);
  });

  /* Ein ALLOW-Eintrag, den ohnehin keine Sperre trifft, ist toter Ballast: er suggeriert
     ein Problem, das es nicht gibt, und maskiert im Zweifel etwas weg. */
  it("jeder Whitelist-Eintrag entschärft tatsächlich einen Treffer", () => {
    const useless = ALLOW.filter((w) => {
      const d = denseName(w);
      return !PATTERNS.substring.some((p) => new RegExp(p).test(d))
          && !PATTERNS.word.some((p) => new RegExp(`^${p}$`).test(d));
    });
    expect(useless, `ALLOW-Einträge ohne Wirkung — bitte entfernen: ${useless.join(", ")}`).toEqual([]);
  });

  it("jeder Whitelist-Eintrag kommt auch wirklich durch", () => {
    for (const w of ALLOW) passes(w);
  });

  it("jeder Sperrlisten-Eintrag wird von seiner eigenen Liste gefangen", () => {
    for (const w of [...BANNED_SUBSTRING, ...BANNED_WORD]) blocked(w);
  });

  it("PATTERNS ist die vollständige, wohlgeformte Quelle für den SQL-Guard", () => {
    const wellFormed = /^(?:[a-z0-9]\+)+$/;
    for (const p of [...PATTERNS.substring, ...PATTERNS.word]) expect(p).toMatch(wellFormed);
    for (const w of BANNED_SUBSTRING) expect(PATTERNS.substring).toContain(patternFor(w));
    for (const w of BANNED_WORD) expect(PATTERNS.word).toContain(patternFor(w));
    for (const w of ALLOW) expect(PATTERNS.allow).toContain(denseName(w)); // wörtlich, kein Muster
    expect(PATTERNS.mask).not.toMatch(/[a-z0-9]/);  // der Platzhalter darf kein Muster fortsetzen
  });
});
