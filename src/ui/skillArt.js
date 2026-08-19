/* #skillart — Embleme für die Skill-Wahl auf dem Desktop (ab 1400 px).
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
   nicht die Bilddaten. Die Bytes holt der Browser erst, wenn ein <img> wirklich rendert — und das tut
   es nur ab 1400 px (Gate in SkillSelect.jsx). Am Handy wird also kein einziges Emblem geladen. */

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
for (const path of Object.keys(FILES)) {
  const id = artIdFromFile(path.slice(path.lastIndexOf("/") + 1));
  if (id) ART[id] = FILES[path];
}

/** URL des Emblems eines Skills — `null`, solange keins vorliegt (Feuer/Eis/Pflanze folgen). */
export const skillArt = (id) => ART[id] || null;
