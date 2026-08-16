/* Externe Links des Projekts an EINER Stelle.

   Warum eine eigene Datei: der Discord-Invite stand als Konstante im StartScreen und wird seit dem
   Datenschutz-Hinweis an einer zweiten Stelle gebraucht (er ist dort der einzige Kontaktweg). Eine URL
   zweimal im Code heißt: beim nächsten Wechsel des Invite-Links wird eine der beiden Stellen vergessen —
   genau das ist mit dem alten Link schon einmal passiert (s. Commit „Discord-Einladung im Menü auf neuen
   Invite-Link aktualisiert").

   Bewusst KEIN i18n: das sind keine Anzeigetexte, sondern Adressen. Die Beschriftungen daneben stehen
   wie üblich in de.js/en.js. */

// Community-Discord — zugleich der Kontaktweg für Datenschutz-Anfragen (s. PrivacyModal.jsx).
export const DISCORD_URL = "https://discord.gg/xMJtFPrbWg";
export const DISCORD_BLURPLE = "#5865F2"; // Discord-Markenfarbe fürs Icon
