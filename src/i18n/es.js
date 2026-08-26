/* ============================================================
   KATALOG SPANISCH — angemeldet, noch nicht gefüllt (#es-locale).

   Warum eine leere Datei überhaupt im Baum steht: `es` ist im Code ANGEMELDET (LOCALES in
   index.js), damit Formatierer, Wächter und Export von Anfang an drei Sprachen kennen statt
   zwei. Sichtbar wird die Sprache erst mit `ready: true`, und das darf erst passieren, wenn
   dieser Katalog vollständig ist — der Guard-Test hält beide Enden: er verlangt von einer
   `ready: false`-Sprache keine Vollständigkeit, macht die Suite aber rot, sobald sie vollständig
   IST („setz ready: true"). Die Ausnahme kann also nicht liegen bleiben.

   ------------------------------------------------------------
   ÜBERSETZT WIRD AUS DEM DEUTSCHEN, nicht aus dem Englischen. Sonst wird durch zwei Sprachen
   hindurch weitergereicht, was in der zweiten schon ungenau war. Die englische Spalte steht in
   der Lieferung nur als REFERENZ daneben (docs/localization/strings_es.csv, Spalte `en_ref`).

   WIE DIESE DATEI SPÄTER AUSSIEHT: wie `en.js`, nicht wie `de.js`. Der Unterschied ist wichtig.
   `de.js` ist eine ERZEUGTE Ansicht der Spiel-Register (`de.js:29`) — die deutschen Namen leben
   in `src/game/*` und werden hier nur eingesammelt. `en.js` ist handgepflegt und bündelt acht
   Teilkataloge. Spanisch ist der englische Fall:

     esSkills · esPerks · esFamilies · esMeta · esGlossary · esCosmetics · esGuides · esTerms

   Die acht Dateien entstehen, wenn es Text für sie gibt. Acht leere Module heute wären Rauschen,
   das wie Fortschritt aussieht.

   ZWEI FALLEN FÜR DEN, DER SIE FÜLLT:

   1. ZAHLEN. Die zurückkommende CSV trägt AUFGELÖSTE Zahlen („+15 Score je Serienpunkt"). Im
      Katalog müssen daraus wieder Template-Literale auf die echten Konstanten werden — `en.js`
      und seine Teilkataloge haben rund 164 davon. Wer eine Zahl abtippt, merkt es nicht sofort:
      der Zahlen-Wächter fällt erst beim nächsten Balance-Pass um, wenn Deutsch weiterläuft und
      Spanisch stehen bleibt.

   2. GLOSSAR-WORTFORMEN (`glossary.*.match`). Kein Anzeigetext, sondern die Steuerung der
      Auto-Fettung. Sie werden für Spanisch NEU GESCHRIEBEN, nicht übersetzt, und zwar zuletzt,
      aus dem fertigen spanischen Textkorpus.
   ============================================================ */

export default {};
