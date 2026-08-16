/* ============================================================
   #174 — USERNAMEN-FILTER (Client-Validator).

   Warum das hier in src/game/ liegt und nicht in src/ui/: das Modul ist PUR — keine
   Uhr, kein Zufall, kein React, kein DOM. Gleiche Eingabe → gleiche Ausgabe, damit es
   testbar ist UND damit der Supabase-Guard (docs/username-profanity-guard.sql) aus
   derselben Quelle erzeugt werden kann (`npm run gen:profanity-sql`).

   ------------------------------------------------------------
   WARUM ÜBERHAUPT? Der Name hängt an den globalen Highscore-Einträgen
   (leaderboard.js → publishRun) und ist damit für ALLE Spieler sichtbar.

   WARUM REICHT DAS NICHT? Das Board schreibt mit dem öffentlichen Anon-Key; wer will,
   POSTet direkt gegen die REST-API und umgeht jeden Client-Check. Dieser Validator ist
   die Höflichkeitsschicht (klare Fehlermeldung, sofortiges Feedback) — die Durchsetzung
   macht der Trigger in der Datenbank. Beide ziehen ihre Wörter aus profanityWords.js.
   ------------------------------------------------------------

   NORMALISIERUNG — vier Stufen, jede gegen eine konkrete Umgehung:
     1. Kleinschreibung + Unicode-Faltung  gegen „FoTzE", „Fötze", „Ѕhit" (kyrillisches Ѕ).
     2. Leetspeak-Abbildung                gegen „Sh1t", „4rsch", „ni99er".
     3. Nicht-Alphanumerik strippen        gegen „f.u.c.k", „a r s c h", „_shit_".
     4. Wiederholungs-TOLERANZ beim Match  gegen „fuuuck", „ffuck".

   Zu Stufe 4 — bewusst anders als in der Issue-Skizze: dort sollten Wiederholungen im
   NAMEN zusammengezogen werden („aaaa" → „a"). Das ist verlockend, zerstört aber
   Information, die man noch braucht: „nigger" wird dabei zu „niger" — und damit von
   „Nigeria" nicht mehr unterscheidbar. Entweder man lässt das Land sperren oder man
   lässt den Slur durch; beides ist falsch.

   Deshalb bleibt der Name unangetastet und die SUCHMUSTER werden wiederholungstolerant:
   „nigger" sucht als /n+i+g+g+e+r+/ und verlangt damit weiterhin zwei g — „Nigeria" hat
   nur eins und geht durch, „Niggger" wird gefangen. Das ist strikt stärker als das
   Zusammenziehen und löst die Kollision, statt sie zu verwalten.
   `normalizeName()` liefert die zusammengezogene Form trotzdem — sie ist die
   kanonische Vergleichsform (Tests, Diagnose) und im Issue so beschrieben.
   ============================================================ */
import { BANNED_SUBSTRING, BANNED_WORD, ALLOW } from "./profanityWords.js";

/* Muss zu MAX in src/ui/UsernameModal.jsx und zum slice(0,20) vor publishRun passen. */
export const MAX_USERNAME = 20;

/* Platzhalter für ausmaskierte Whitelist-Treffer. Ein Nicht-Alphanumerikum genügt:
   es unterbricht jedes Suchmuster, weil die Muster nur aus [a-z0-9] bestehen. */
const MASK = "-";

/* Einzelzeichen-Faltung. In JS erledigt NFKD den Großteil (é → e) schon vorher — diese
   Tabelle ist trotzdem die maßgebliche Quelle, weil der SQL-Guard kein NFKD hat und sein
   translate() hieraus erzeugt wird. Dazu die üblichen Homoglyphen aus Kyrillisch/Griechisch.
   Umlaute fallen bewusst auf den BASISBUCHSTABEN (ä → a), nicht auf die deutsche
   Umschrift (ä → ae): gefangen werden soll „Fötze", und das ist optisch ein o. */
export const FOLD = {
  "à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","ā":"a","ă":"a","ą":"a",
  "è":"e","é":"e","ê":"e","ë":"e","ē":"e","ĕ":"e","ė":"e","ę":"e","ě":"e",
  "ì":"i","í":"i","î":"i","ï":"i","ĩ":"i","ī":"i","ĭ":"i","į":"i","ı":"i",
  "ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ō":"o","ŏ":"o","ő":"o","ø":"o",
  "ù":"u","ú":"u","û":"u","ü":"u","ũ":"u","ū":"u","ŭ":"u","ů":"u","ű":"u",
  "ý":"y","ÿ":"y","ŷ":"y",
  "ñ":"n","ń":"n","ň":"n",
  "ç":"c","ć":"c","č":"c",
  "š":"s","ś":"s","ş":"s",
  "ž":"z","ź":"z","ż":"z",
  "ď":"d","đ":"d","ð":"d",
  "ł":"l","ĺ":"l",
  "ŕ":"r","ř":"r",
  "ť":"t",
  "ğ":"g","ģ":"g",
  // Homoglyphen — kyrillisch
  "а":"a","в":"b","е":"e","і":"i","ј":"j","к":"k","м":"m","о":"o","р":"p",
  "с":"c","т":"t","у":"y","х":"x","ѕ":"s","ԁ":"d","н":"h",
  // Homoglyphen — griechisch
  "α":"a","β":"b","γ":"y","ε":"e","η":"n","ι":"i","κ":"k","μ":"u","ν":"v",
  "ο":"o","ρ":"p","σ":"s","τ":"t","υ":"u","χ":"x",
};

/* Faltungen, die ein Zeichen auf MEHRERE abbilden — translate() kann das nicht,
   der SQL-Guard erzeugt daraus replace()-Aufrufe. */
export const FOLD_MULTI = { "ß":"ss", "æ":"ae", "œ":"oe", "þ":"th", "ĳ":"ij" };

/* Leetspeak. Wird NACH der Faltung angewandt, damit auch „Ä" → „a" noch greift.
   „1" → „i" und nicht „l": „1" steht in Namen fast immer für ein i (h1tler, sh1t). */
export const LEET = {
  "0":"o", "1":"i", "3":"e", "4":"a", "5":"s", "7":"t", "8":"b", "9":"g",
  "@":"a", "$":"s", "!":"i", "|":"i", "¡":"i", "+":"t", "(":"c", "€":"e", "£":"l",
};

/* Faltung + Leetspeak, OHNE die Trennzeichen wegzuwerfen — daraus entstehen unten
   sowohl die dichte Form (Substring-Suche) als auch die Token (Wortgrenzen-Suche). */
function foldChars(raw) {
  // NFKD zerlegt zusammengesetzte Zeichen (é → e + ́ ); die kombinierenden Akzente fallen weg.
  // Der Client ist damit etwas strenger als der SQL-Guard, der nur die FOLD-Tabelle kennt.
  const s = String(raw ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  let out = "";
  for (const ch of s) {
    if (FOLD_MULTI[ch] !== undefined) { out += FOLD_MULTI[ch]; continue; }
    const folded = FOLD[ch] ?? ch;
    out += LEET[folded] ?? folded;
  }
  return out;
}

/* Dichte Form: gefaltet, geleetet, alles Nicht-Alphanumerische entfernt.
   „S h 1 t !" → „shit". Das ist die Form, auf der gesucht wird — exportiert, weil der
   SQL-Guard genau sie nachbaut (norm_username) und die Tests dagegen prüfen. */
export function denseName(raw) { return foldChars(raw).replace(/[^a-z0-9]/g, ""); }
const dense = denseName;

/* Token für die Wortgrenzen-Prüfung. Getrennt wird an Nicht-Alphanumerik UND am
   Übergang Buchstabe↔Ziffer, damit „arsch2000" als Token „arsch" hergibt. */
function tokensOf(raw) {
  return foldChars(raw).split(/[^a-z0-9]+/).flatMap((p) => p.match(/[a-z]+|[0-9]+/g) || []);
}

/* Kanonische Vergleichsform: dichte Form mit zusammengezogenen Wiederholungen.
   Für Tests, Diagnose und Vergleiche gedacht — die Trefferlogik nutzt sie bewusst
   NICHT (siehe Kopfkommentar, Stichwort nigger/Nigeria). */
export function normalizeName(raw) { return dense(raw).replace(/(.)\1+/g, "$1"); }

/* Ein Begriff wird zum wiederholungstoleranten Muster: „shit" → /s+h+i+t+/.
   Doppelbuchstaben bleiben als Mindestanzahl erhalten („nigger" verlangt zwei g). */
export function patternFor(word) {
  const d = dense(word);
  if (!d) return null;
  return [...d].map((c) => `${c}+`).join("");
}

const compile = (list) => [...new Set(list.map(patternFor).filter(Boolean))];

/* Die Whitelist arbeitet WÖRTLICH, die Sperrliste wiederholungstolerant — die Asymmetrie
   ist der Kern der Sache und keine Nachlässigkeit:

   Ein wiederholungstolerantes „niger" würde als /n+i+g+e+r+/ auch auf „nigger" passen
   (das g+ frisst beide g) und den Treffer wegmaskieren — die Whitelist würde den Slur
   freischalten, den sie nie gemeint hat. Genau umgekehrt herum ist es richtig:
   die Sperrliste darf großzügig sein, die Ausnahmeliste muss eng sein.

   Nach Länge sortiert, damit „marschall" vor „marsch" maskiert wird und kein Rest bleibt. */
const ALLOW_DENSE = [...new Set(ALLOW.map(dense).filter(Boolean))].sort((a, b) => b.length - a.length);
const SUB_RX  = compile(BANNED_SUBSTRING).map((p) => new RegExp(p));
const WORD_RX = compile(BANNED_WORD).map((p) => new RegExp(`^${p}$`));

/* Whitelist-Treffer ausmaskieren: „Scunthorpe" wird zu „-", darin steckt kein „cunt" mehr.
   Der Platzhalter ersetzt den ganzen Treffer — ein „-" mittendrin unterbricht jedes
   Suchmuster zuverlässig, weil die Muster nur aus [a-z0-9] bestehen. */
function maskAllowed(s) {
  let out = s;
  for (const w of ALLOW_DENSE) out = out.split(w).join(MASK);
  return out;
}

/* true, sobald ein gesperrter Begriff durchkommt. Zwei Durchgänge:
   Substring auf der dichten Form, Wortgrenze auf den Token. */
function hasProfanity(raw) {
  const d = dense(raw);
  if (!d) return false;
  const masked = maskAllowed(d);
  if (SUB_RX.some((rx) => rx.test(masked))) return true;
  for (const tok of tokensOf(raw)) {
    if (ALLOW_DENSE.includes(tok)) continue;
    if (WORD_RX.some((rx) => rx.test(tok))) return true;
  }
  return false;
}

/* Der eine Einstiegspunkt für die UI.
   → { ok: true } oder { ok: false, reason: "empty" | "too_long" | "profanity" }

   `reason` ist bewusst ein CODE und kein fertiger Satz: der Anzeigetext gehört in die
   i18n-Kataloge (de.js/en.js), sonst wäre dieses reine Modul zweisprachig.
   Der getroffene Begriff wird bewusst NICHT zurückgegeben — er würde sonst früher oder
   später in einer Fehlermeldung landen und stünde damit doch wieder auf dem Bildschirm. */
export function isAllowedUsername(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, reason: "empty" };
  if ([...s].length > MAX_USERNAME) return { ok: false, reason: "too_long" };
  if (hasProfanity(s)) return { ok: false, reason: "profanity" };
  return { ok: true };
}

/* Für den SQL-Generator (scripts/gen-profanity-sql.mjs): dieselben Muster, die der
   Client benutzt — damit der Server-Guard keine zweite, driftende Wahrheit wird. */
export const PATTERNS = {
  substring: compile(BANNED_SUBSTRING),
  word: compile(BANNED_WORD),
  allow: ALLOW_DENSE, // wörtlich, nicht als Muster — siehe Kommentar bei ALLOW_DENSE
  mask: MASK,
};
