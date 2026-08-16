/* ============================================================
   #174 — KURATIERTE WORTLISTE für den Usernamen-Filter (DE + EN).

   Bewusst eine EIGENE Datei: sie ist die einzige Quelle, aus der sowohl der Client
   (src/game/profanity.js) als auch der Supabase-Guard (docs/username-profanity-guard.sql,
   erzeugt via `npm run gen:profanity-sql`) ihre Begriffe ziehen. Wer hier etwas einträgt,
   ändert beide Seiten — genau das verlangt Abnahmekriterium 4 des Issues.

   Die Einträge stehen in Klarschrift. Sie laufen beim Laden durch dieselbe Normalisierung
   wie die Eingabe, deshalb sind Groß-/Kleinschreibung, Umlaute und Doppelbuchstaben egal.

   ------------------------------------------------------------
   ZWEI LISTEN, weil Substring-Matching zwei gegenläufige Fehler hat:

   BANNED_SUBSTRING — trifft ÜBERALL im Namen, auch mitten in einem Kompositum.
     Nötig, weil Deutsch zusammenschreibt („MegaArschloch" ist ein einziges Token).
     Nur für Begriffe, die kein harmloses Wort enthält — sonst Scunthorpe (siehe ALLOW).

   BANNED_WORD — trifft nur als GANZES Token („Hure", nicht „Schuhregal").
     Für kurze/mehrdeutige Begriffe, die als Wortbestandteil massenhaft harmlos vorkommen.
     Lehrbeispiel: „cum" steckt in „document" — als Substring wäre es unbrauchbar.

   ALLOW — harmlose Wörter, die einen gesperrten Begriff enthalten. Sie werden VOR der
     Prüfung aus dem Namen ausmaskiert (längenerhaltend), damit „Scunthorpe" durchgeht,
     „Cunt" aber nicht. Diese Liste ist die Notbremse gegen False Positives — sie wächst
     mit jedem gemeldeten Fehltreffer, statt dass ein Begriff aus der Sperrliste fliegt.
   ------------------------------------------------------------

   Bewusst NICHT gesperrt (dokumentierte Entscheidungen, damit sie niemand „nachpflegt"):
     - „dick"  — im Deutschen ein Alltagswort (dick/Dicker). Als Sperre reiner Schaden.
     - „ass"   — im Deutschen „Ass" (Spielkarte). Abgedeckt über „asshole"/„arsch".
     - „anal"  — steckt in Analyse, Kanal, analog, banal. Ertrag/Schaden stimmt nicht.
     - „möse"  — entschärft zu „mose" und träfe damit den Namen „Mose".
     - Reine Beleidigungen ohne Vulgärgehalt (Idiot, Depp, Trottel) — das ist ein
       Profanity-Filter, keine Höflichkeitspolizei.
   ============================================================ */

/* Trifft an jeder Stelle des Namens. */
export const BANNED_SUBSTRING = [
  // --- Deutsch ---------------------------------------------------------
  "arsch",            // Marsch/Barsch/harsch/Warschau stehen in ALLOW
  "arschloch",
  "wichser", "wichsen",
  "hurensohn", "hurentochter",
  "fotze", "votze",
  "fick", "ficken", "ficker", "fickt", "gefickt", "verfickt", // kein harmloses Wort enthält „fick";
                      // der Preis ist der seltene Nachname Fick — bewusst in Kauf genommen
  "schlampe",
  "scheiss",          // deckt Scheiße/Scheißkerl/bescheißen ab (ß → ss)
  "kacke", "kacken",
  "miststück", "mistgeburt",
  "drecksau", "dreckschwein",
  "hodensack",
  "schwanzlutscher",
  "muschi",
  "pimmel",
  "titten",
  "sperma",
  "schwuchtel",
  "kanake",
  "neger",
  "spast", "spasti",
  "mongo",            // Mongolei/Mongole stehen in ALLOW
  "pisser",
  "nutten",           // „Minuten" bleibt frei: das Muster verlangt zwei t, dort steht nur eins

  // --- Englisch --------------------------------------------------------
  "fuck", "fucker", "fucking", "motherfucker",
  "shit", "bullshit", // Shiitake steht in ALLOW
  "bitch",
  "asshole", "arsehole",
  "cunt",             // Scunthorpe steht in ALLOW — der Lehrbuchfall
  "pussy",
  "whore",
  "slut",
  "faggot",
  "retard",
  "nigger", "nigga",  // „Nigeria"/„Niger" brauchen KEINE Whitelist: die Muster verlangen
                      // zwei g, die Ländernamen haben eins — siehe Kopf von profanity.js
  "wanker",
  "blowjob", "handjob", "cumshot",
  "dildo",
  "porno",
  "penis", "vagina",
  "orgasm",

  // --- Extremismus / Symbolik -----------------------------------------
  "hitler", "siegheil", "hakenkreuz", "nazi",
];

/* Trifft NUR als vollständiges Token — kurze oder mehrdeutige Begriffe. */
export const BANNED_WORD = [
  // --- Deutsch ---
  "hure", "huren",    // als Substring säße es in „Schuhregal"
  "nutte",
  "schwanz",          // „Pferdeschwanz" bleibt erlaubt, weil nur das ganze Token zählt
  "sau",              // „sauber", „Sauerstoff" bleiben erlaubt
  "pisse", "piss",
  // --- Englisch ---
  "arse",
  "cock",             // „Cocktail", „Cockpit"
  "fag",              // „Fagott"
  "tit", "tits",
  "twat",
  "wank",
  "rape",             // „Grape", „Grapefruit"
  "cum",              // „document", „accumulate"
];

/* Harmlose Wörter, die einen gesperrten Begriff enthalten — werden vor der Prüfung
   ausmaskiert. Jeder Eintrag nennt im Kommentar den Begriff, den er entschärft.
   Anders als die Sperrliste wird die Whitelist WÖRTLICH gesucht (Begründung in
   profanity.js bei ALLOW_DENSE) — hier steht also genau die Schreibweise, die durchsoll. */
export const ALLOW = [
  "scunthorpe",                                             // cunt
  "marsch", "marschall", "marschieren", "barsch", "harsch", // arsch
  "warschau",                                               // arsch
  "mongolei", "mongolisch", "mongole", "mongolia",          // mongo
  "shiitake", "shitake",                                    // shit
];
