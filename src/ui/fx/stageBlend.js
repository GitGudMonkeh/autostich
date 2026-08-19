import { clamp01 } from "./fxMath.js";

/* #382 Stufen-Blende für die AKKRETIVEN Karteneffekte (Eis-Frost, Pflanzen-Moos).

   Beide Effekte halten je Stufe EIN gecachtes Bitmap; beim Stufen-Wechsel wurde bisher hart kreuz-geblendet:
   alte Stufe mit `source-over` auf (1−f), neue darüber auf f. Das sieht an genau der Stelle schlecht aus, die
   den Effekt ausmacht — dem BESTEHENDEN Bewuchs. Denn Stufe N+1 enthält Stufe N pixelgleich (Akkretion), und
   `source-over` zweier halbtransparenter Kopien desselben Pixels ergibt in der Mitte der Blende WENIGER Deckung
   als vorher und nachher: der schon gewachsene Frost/Moos sackt kurz weg und kommt zurück. Das ist das „Hakelige".

   Der Ausweg braucht keinen Zwischenpuffer: auf einer FRISCH GELÖSCHTEN Fläche ist `lighter` (additiv auf
   vormultiplizierten Werten) exakt die Linearkombination der Quellbilder. Zeichnet man alle beteiligten Stufen
   mit `lighter` und Gewichten, die sich zu 1 addieren, ist das Ergebnis die echte Interpolation: identische
   Bereiche bleiben Pixel für Pixel konstant, nur der NEUE Zuwachs blendet auf. Genau „transparent ineinander".
   (Bei einer einzelnen Ebene mit Gewicht 1 ist `lighter` auf leerer Fläche identisch zu `source-over` — der
   Ruhezustand bleibt also bitgleich zu vorher.)

   Diese Datei hält nur die Gewichte, nicht das Zeichnen: die Effekte kennen ihre Bitmaps selbst. `stage` ist ein
   beliebiger Zahlen-Schlüssel (Front-Anteil beim Eis, Deckung beim Moos).

   MEHRERE WECHSEL: Kommt eine neue Stufe, während eine Blende läuft, wird sie als weitere Ebene aufgesetzt statt
   die laufende abzuschneiden — im Spiel wächst Moos/Frost auch mal zwei Stufen in einem Stich. Fertige Ebenen
   schmelzen in die Basis, danach zeichnet der Effekt wieder EIN Bitmap (kein Dauer-rAF). */

export const STAGE_FADE_MS = 560;  // Blenddauer je Stufe — lang genug zum Lesen, kurz genug für Stich-Tempo
export const easeStage = (f) => f * f * (3 - 2 * f);  // Smoothstep: sanft an, sanft aus (kein linearer Knick)

export function createStageBlend(fadeMs = STAGE_FADE_MS) {
  let base = null;   // voll sichtbare Stufe
  let pend = [];     // laufende Ebenen [{ stage, t0 }], in Ankunftsreihenfolge

  const api = {
    get base() { return base; },
    get target() { return pend.length ? pend[pend.length - 1].stage : base; },
    get active() { return pend.length > 0; },

    // Sofort auf eine Stufe setzen (Erststart, Resize, reduzierte Bewegung, Farbwechsel) — keine Blende.
    set(stage) { base = stage; pend = []; },

    // Weich auf eine Stufe blenden. Erster Aufruf ohne Basis setzt hart (sonst blendet der Erststart aus dem Nichts auf).
    to(stage, now) {
      if (base === null) { api.set(stage); return; }
      if (stage === api.target) return;
      pend.push({ stage, t0: now });
    },

    /* Zeichen-Gewichte für JETZT, unterste Ebene zuerst; Summe exakt 1 (verschachtelte Lerps). Nebenwirkung:
       abgelaufene Ebenen werden in die Basis eingeschmolzen — deshalb genau einmal pro Frame aufrufen. */
    weights(now) {
      while (pend.length && now - pend[0].t0 >= fadeMs) { base = pend[0].stage; pend.shift(); }
      const out = [];
      let rest = 1;
      for (let i = pend.length - 1; i >= 0; i--) {
        const a = easeStage(clamp01((now - pend[i].t0) / fadeMs));
        out.push({ stage: pend[i].stage, w: rest * a });
        rest *= 1 - a;
      }
      out.push({ stage: base, w: rest });
      return out.reverse();
    },
  };
  return api;
}
