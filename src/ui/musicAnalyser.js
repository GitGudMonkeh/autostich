/* #317 Musik-Analyser — zapft das Musik-`<audio>` (music.js) EINMALIG mit einem AnalyserNode an, damit die
   Cube-Matrix pro Frame das Frequenzspektrum der LAUFENDEN Musik lesen kann. Reiner Lese-Abgriff:

     src = ctx.createMediaElementSource(el)   // geht nur EINMAL pro Element
     analyser = ctx.createAnalyser(); src.connect(analyser); analyser.connect(ctx.destination)

   Wichtig:
   - Der bestehende AudioContext aus audio.js wird WIEDERVERWENDET (kein zweiter Context).
   - Nach dem Anzapfen läuft die Musik NUR noch über den WebAudio-Graph → analyser MUSS auf destination
     verbunden bleiben, sonst verstummt die Musik. Der Graph bleibt daher dauerhaft bestehen (transparent);
     ein „Teardown" trennt nur die rAF-Lesung des Effekts, nicht die Kette src→analyser→destination.
   - Same-Origin-Assets (gebündelte .m4a) → kein CORS-Taint → echte FFT-Werte.
   - Idempotent: mehrfacher Aufruf gibt denselben Analyser zurück; ein einmaliger Fehlversuch bleibt „null". */
import { audio } from "./audio.js";
import { music } from "./music.js";

let analyser = null;      // AnalyserNode (oder null, wenn nicht verfügbar)
let freqData = null;      // Uint8Array(frequencyBinCount) — der Effekt liest hier rein
let srcNode = null;       // MediaElementAudioSourceNode (nur EINMAL erzeugbar)
let tried = false;        // Anzapf-Versuch (Erfolg ODER Fehlschlag) → nicht erneut probieren

/* Liefert { analyser, freqData, ctx } oder null. Beim ersten Aufruf wird das Musik-Element angezapft.
   Nur aufrufen, wenn der Cube-Matrix-Effekt wirklich aktiv ist (sonst bleibt die Audio-Pipeline unberührt). */
export function getMusicAnalyser() {
  if (tried) return analyser ? { analyser, freqData, ctx: audio.context() } : null;
  tried = true;
  try {
    const ctx = audio.context();
    const el = music.element();
    if (!ctx || !el) { analyser = null; return null; }
    srcNode = ctx.createMediaElementSource(el);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    analyser.maxDecibels = -6;   // Headroom → lauter Master-Bass klippt nicht am 255-Anschlag
    analyser.minDecibels = -78;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    srcNode.connect(analyser);
    analyser.connect(ctx.destination); // WICHTIG: sonst verstummt die Musik
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return { analyser, freqData, ctx };
  } catch {
    // z. B. „HTMLMediaElement already connected" oder fehlendes WebAudio → Effekt läuft dann im Ruhe-/Idle-Zustand
    analyser = null;
    return null;
  }
}
