/* Haptik-Manager (#207) — kurzes Vibrations-Feedback bei Button-Bestätigungen, analog zum SFX-Manager
   (audio.js): ein reiner UI-Seiteneffekt, KEIN game/-Bezug (wie Math.random/Date). Feature-Detektion über
   navigator.vibrate; nur aktiv auf grobem Zeiger (pointer: coarse = Touch/Handy) und solange das System KEINE
   „reduzierte Bewegung" verlangt (Barrierefreiheit bleibt IMMER gewahrt — dieselbe Leitlinie wie useReducedFx).
   Auf Desktop wäre navigator.vibrate ohnehin ein no-op, das coarse-Gate spart den Aufruf ganz.

   Kein Autoplay-artiges „unlock" wie bei Audio nötig: die Aufrufe feuern aus dem delegierten Klick-Listener
   (App.jsx) bzw. aus Klick-Folgeeffekten heraus, also stets innerhalb einer User-Geste. Muster bewusst dezent:
   ein kurzer Tick bei Bestätigung, ein distinktes Stottern bei „verwehrt". */
const mq = (q) => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q) : null);

let enabled = true;

function canBuzz() {
  if (!enabled) return false;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  const coarse = mq("(pointer: coarse)");
  if (coarse && !coarse.matches) return false;              // Desktop/Maus → keine Haptik
  const reduced = mq("(prefers-reduced-motion: reduce)");
  if (reduced && reduced.matches) return false;             // OS-Bewegungswunsch respektieren
  return true;
}

function fire(pattern) {
  if (!canBuzz()) return;
  try { navigator.vibrate(pattern); } catch (e) { /* Haptik nie den Spielfluss stören */ }
}

export const haptics = {
  setEnabled(v) { enabled = !!v; },
  tick() { fire(12); },               // kurzer Bestätigungs-Tick
  denied() { fire([16, 40, 24]); },   // distinktes „verwehrt"-Stottern (buzz–pause–buzz)
};
