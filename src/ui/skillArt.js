/* #skillart — Embleme für die Skill-Wahl auf dem Desktop (ab 1280 px).
   -------------------------------------------------------------------------------------------------
   EIN Bild je Skill, benannt nach der Skill-ID aus `src/game/skills.js`. Die ID ist der Fügepunkt, der
   Name dahinter nur Lesehilfe — deshalb steht hier KEINE abgetippte Liste: die Zuordnung entsteht aus
   dem Dateinamen. Ein neuer Skill bekommt sein Emblem also allein dadurch, dass die Datei richtig heißt.

   Sammelstand + Erzeugung (Stil-Anker, Silhouetten-Regel, verworfene Fassungen): `docs/art/skills/`.
   Dort liegen auch die 1024er Master; hier in `src/assets/skills/` liegt die AUSLIEFERUNG mit 192 px.
   Gerechnet: gezeigt werden sie mit 64 CSS-px, der Desktop-Deckel ist DPR 2 (mobileTier.js) → 128 px
   wären exakt, 192 gibt eine Stufe Reserve für eine spätere größere Platzierung. Alle 21 Blitz-Embleme
   zusammen wiegen damit 121 kB statt 196 kB (256 px) — und geladen wird ohnehin nur, was gerendert wird.

   Der Grund ist SCHWARZ, nicht transparent: gezeigt werden die Embleme mit `mix-blend-mode: screen`
   (`.sk-em` in index.css). Schwarz verschwindet dabei von selbst, das Leuchten liegt additiv auf der
   Karte wie der restliche FX-Stack, und es braucht keinen Alphakanal.

   Kosten: `import.meta.glob` mit `?url` + `eager` liefert nur die URL-Strings (ein paar hundert Byte),
   nicht die Bilddaten. Die Bytes holt der Browser erst, wenn ein <img> wirklich rendert.

   CORRECTED 2026-08-23 (playtest-fixes) — two claims in this header had gone stale:

     1. "Am Handy wird also kein einziges Emblem geladen" was true only while there was no fassung
        below 1280 px. Since `#mobil-emblem` there are TWO, one gate each (SkillSelect.jsx): the head
        strip from 1280 px up, the corner emblem below 640 px. The band 640-1279 px is the only width
        that renders no <img> at all.
     2. The delivery is heavier than the 192 px calculation above predicted. Measured 2026-08-23:
        lightning 422 kB across its 21 files (~20 kB each), ice 365 kB, plant 268 kB, fire 224 kB —
        1.28 MB for all 84, not 121 kB per lot. That number is why `skillArtUrls` below hands out one
        archetype at a time instead of everything at once. */

const FILES = import.meta.glob("../assets/skills/*/*.webp", { eager: true, query: "?url", import: "default" });

// „SK_LIGHTNING_L01_donnergott.webp" → „SK_LIGHTNING_L01". Der Großbuchstaben-Teil ist die ID, der
// Rest der Kleinbuchstaben-Name. Beides ist im Dateinamen durch die Schreibweise getrennt, nicht durch
// die Position — sonst bräche jede ID mit Buchstaben-Suffix (L01…L04).
// Die Lesehilfe muss mit einem KLEINBUCHSTABEN anfangen — sonst schluckt sie eine Ziffer: aus
// „SK_LIGHTNING_01.webp" (Datei ohne Lesehilfe) würde sonst still die ID „SK_LIGHTNING", und das
// Emblem hinge an einem Skill, den es nicht gibt. Der Wächter hält genau diesen Fall fest.
export function artIdFromFile(name) {
  const m = /^([A-Z][A-Z0-9_]*[A-Z0-9])_[a-z][a-z0-9-]*\.webp$/.exec(name);
  return m ? m[1] : null;
}

const ART = {};
/* Emblem-URLs je Archetyp. Der ORDNERNAME unter `src/assets/skills/` ist die Archetyp-ID — dieselbe
   Fügepunkt-Regel wie beim Dateinamen oben, also auch hier keine abgetippte Liste. Ein neuer
   Archetyp bekommt seinen Eintrag allein dadurch, dass sein Ordner richtig heißt. */
const BY_ARCH = {};
for (const path of Object.keys(FILES)) {
  const id = artIdFromFile(path.slice(path.lastIndexOf("/") + 1));
  if (id) ART[id] = FILES[path];
  const arch = /\/skills\/([^/]+)\/[^/]+$/.exec(path);
  if (id && arch) (BY_ARCH[arch[1]] ||= []).push(FILES[path]);
}

/** URL des Emblems eines Skills — `null`, solange keins vorliegt (Feuer/Eis/Pflanze folgen). */
export const skillArt = (id) => ART[id] || null;

/* Emblem-URLs der genannten Archetypen, in stabiler Reihenfolge. Für den Idle-Vorlader in App.jsx:
   der braucht die Bilder eines Archetyps, ohne die Skill-Registry zu kennen, und er darf NICHT
   einfach alles nehmen — die vier Lose zusammen wiegen 1,28 MB (s. Kopf). Unbekannte Archetypen
   werden still übersprungen; ein Vorlader ist nie kritisch. */
export const skillArtUrls = (archetypes) =>
  (archetypes || []).flatMap((a) => BY_ARCH[a] || []);
