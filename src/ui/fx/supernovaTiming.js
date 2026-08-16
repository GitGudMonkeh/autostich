/* SUPERNOVA — Zeitachse des Effekts, getrennt vom Effekt selbst.

   Warum eine eigene Datei und nicht einfach eine Konstante in SupernovaPixi.jsx: die Aufrufer
   brauchen die ZEITEN, nicht den Effekt. Ein statischer Import aus SupernovaPixi zöge Pixi in den
   Haupt-Bundle — genau das vermeidet Battlefield.jsx dort mit dem lazy Import. Diese Datei ist
   Pixi-frei; SupernovaPixi baut sein TUNE aus denselben Werten.

   WOFÜR: Der Swell (fx_supernova) soll seinen großen Impuls GENAU auf den Detonationsblitz legen.
   Das ging bisher schief, weil Showcase und Spiel den Ton völlig verschieden auslösten:

     Showcase   onFire beim Effekt-Start, Tempo 0,18 (gestreckt, damit der 11-s-Swell hineinpasst)
                → Blitz erst nach ~1,7 s, Ton startete aber bei 0 → Impuls VIEL zu früh.
     In-Game    an der epischen Ansage mit einem von Hand getunten Vorlauf, Tempo 1
                → Blitz nach 0,30 s; der Vorlauf war auf 2,85 s hochgedreht, also lange NACH dem
                  Effekt-Ende (2,05 s) — nachgetunt wurde faktisch ins Leere.

   Deshalb rechnet jetzt beides aus derselben Formel: Blitzzeitpunkt (tempoabhängig) minus der Stelle,
   an der der Impuls IM TON sitzt. Nur die zweite Zahl ist Gehörsache. */

export const SUPERNOVA_LIFE = 1.9;      // Spieldauer des Effekts (s, bei Tempo 1)
export const SUPERNOVA_CHARGE = 0.16;   // Anteil davon, den der Kollaps VOR der Detonation braucht
export const SUPERNOVA_TAIL = 0.15;     // Nachlauf nach LIFE, bevor der Effekt endet/loopt

/* Wo im Swell sitzt sein großer Impuls? DIE EINE nach Gehör getunte Zahl — sie verschiebt Showcase
   und Spiel gemeinsam. 0 = der Impuls sitzt am Anfang der Datei; ein größerer Wert zieht den Ton
   FRÜHER los (weil sein Impuls später kommt), ein negativer Wert spielt ihn entsprechend später.

   Stand: 0,5 (Freigabe im Showcase — dort ist der gestreckte Effekt die verlässliche Referenz).
   ACHTUNG beim weiteren Nachdrehen: in-game bleiben zwischen Effekt-Start und Blitz nur ~0,3 s. Ab
   einem Impuls-Offset von 0,3 steht der Vorlauf dort auf 0 (der Ton startet sofort) und weiteres
   Erhöhen wirkt NUR noch im Showcase. Wer den Ton in-game dann noch früher braucht, muss ihn vor der
   Ansage auslösen — das wäre eine echte Umstellung, kein Zahlendreh. */
export const SUPERNOVA_IMPACT_S = 0.5;

// Wann blitzt die Detonation, gerechnet ab Effekt-Start? Tempo < 1 streckt den Effekt (Showcase).
export const supernovaDetonationS = (speed = 1) =>
  (SUPERNOVA_LIFE * SUPERNOVA_CHARGE) / Math.max(0.01, Number(speed) || 1);

// Vorlauf für audio.play({ delay }), damit der Impuls auf dem Blitz sitzt. Nie negativ — in die
// Vergangenheit lässt sich nichts planen; dann startet der Ton eben sofort.
export const supernovaSwellDelay = (speed = 1) =>
  Math.max(0, supernovaDetonationS(speed) - SUPERNOVA_IMPACT_S);
