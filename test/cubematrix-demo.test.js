/* #shop-demo — die Würfel-Matrix muss auch bei stummer Musik zeigen, wie sie aussieht.
   -------------------------------------------------------------------------------------------------
   Zwei Sorten Prüfung, wie bei fx-panel: das SIGNAL wird nachgerechnet (die drei Funktionen sind rein),
   die VERDRAHTUNG als Quelltext-Ratsche. Das Signal ist der Teil, der lautlos kaputtgehen kann — ein
   konstanter Wert sähe im Code völlig harmlos aus und ergäbe ein stehendes Feld, also genau den Zustand,
   gegen den der Schalter gebaut wurde. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { demoKick, demoRaw, DEMO_BPM, DEMO_SILENCE_S, DEMO_PEAK_MIN, glaettung, AMBIENT_HZ } from "../src/ui/fx/CubeMatrixField.jsx";
import { hzMinMs } from "../src/ui/fx/mobileTier.js";

const src = (p) => readFileSync(new URL(`../src/ui/${p}`, import.meta.url), "utf8");
const TC = 52;    // 13 Spalten × 4 Reihen — der Desktop-Fall (#fx-dichte, vorher 18 × 6 = 108)

describe("#shop-demo — das Ersatzsignal", () => {
  it("bleibt in [0,1] — driveCube rechnet mit einem normierten Rohwert", () => {
    for (let t = 0; t < 12; t += 0.017) {
      for (const i of [0, 1, 7, 40, TC - 2, TC - 1]) {
        const v = demoRaw(i, TC, t);
        expect(Number.isFinite(v), `i=${i} t=${t.toFixed(3)}`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("bewegt sich wirklich — ein konstantes Signal wäre ein stehendes Feld", () => {
    // Über zwei Takte je Band die Spannweite messen. Ein toter Kanal (Spannweite ~0) hieße: dieser
    // Würfel steht still, und niemand sieht es dem Code an.
    let bewegteBaender = 0;
    for (let i = 0; i < TC; i++) {
      let min = Infinity, max = -Infinity;
      for (let t = 0; t < 4.3; t += 0.02) { const v = demoRaw(i, TC, t); if (v < min) min = v; if (v > max) max = v; }
      if (max - min > 0.02) bewegteBaender++;
    }
    expect(bewegteBaender, "praktisch alle Bänder müssen atmen").toBeGreaterThan(TC * 0.9);
  });

  it("hat einen Takt: die 1 ist der stärkste Schlag, die 3 der zweitstärkste", () => {
    const schlag = 60 / DEMO_BPM;
    // Kurz NACH dem Anschlag messen (bei exakt 0 ist die Hüllkurve auf ihrem Maximum).
    const w = [0, 1, 2, 3].map((k) => demoKick(k * schlag + 1e-4));
    expect(w[0]).toBeGreaterThan(w[2]);          // 1 > 3
    expect(w[2]).toBeGreaterThan(w[1]);          // 3 > 2
    expect(w[2]).toBeGreaterThan(w[3]);          // 3 > 4
    // …und der Takt wiederholt sich, statt davonzulaufen.
    expect(demoKick(4 * schlag + 1e-4)).toBeCloseTo(w[0], 6);
  });

  it("verteilt die Energie wie ein Spektrum: Bass unten, nicht überall gleich", () => {
    // Der Kick darf nur die untersten Bänder treiben — sonst hüpft das ganze Feld im Gleichtakt
    // und sieht aus wie ein Balken, nicht wie ein Spektrum.
    const t = 1e-4;                               // exakt auf der „1"
    expect(demoRaw(0, TC, t)).toBeGreaterThan(0.5);
    expect(demoRaw(TC - 1, TC, t)).toBeLessThan(0.5);
  });

  it("Randfälle kippen nicht", () => {
    expect(demoRaw(0, 1, 0)).toBeGreaterThanOrEqual(0);   // TC = 1 → keine Division durch 0
    expect(Number.isFinite(demoKick(0))).toBe(true);
  });
});

describe("#shop-demo — die Verdrahtung", () => {
  const fx = src("fx/CubeMatrixField.jsx");
  const cz = src("CustomizeScreen.jsx");

  it("umgeschaltet wird über einen PEGEL, nicht über ein Mute-Flag", () => {
    // Der Analyser existiert auch bei stummgeschalteter Wiedergabe und liefert dann konstant 0.
    // Ein Fenster über den Spitzenpegel trifft zusätzlich „pausiert" und „Lautstärke 0".
    expect(fx).toMatch(/stilleS\s*=\s*peak\s*<=\s*DEMO_PEAK_MIN\s*\?\s*stilleS\s*\+\s*dt\s*:\s*0/);
    expect(fx).toMatch(/demoOn\s*=\s*!!p\.demo\s*&&\s*!p\.reduced\s*&&\s*stilleS\s*>=\s*DEMO_SILENCE_S/);
    expect(DEMO_PEAK_MIN).toBeGreaterThan(0);
    expect(DEMO_SILENCE_S).toBeGreaterThan(0);
  });

  it("echte Musik gewinnt: der Demo-Zweig steht VOR dem Audio-Zweig", () => {
    // Andersherum fütterte der Audio-Zweig bei stummer Wiedergabe Nullen und senkte die Türme ab,
    // bevor das Ersatzsignal überhaupt drankäme.
    const cubes = fx.slice(fx.indexOf("function computeCubes"));
    expect(cubes.indexOf("if (demoOn)")).toBeLessThan(cubes.indexOf("else if (hasAudio)"));
  });

  it("das Ersatzsignal läuft durch DIESELBE Pipeline wie echte Musik", () => {
    // Kein zweiter Zeichenpfad — nur eine andere Quelle für driveCube. Sonst driftet die Vorschau
    // vom Spiel weg, und genau das ist die Regel dieses Projekts (#kompositor).
    expect(fx).toMatch(/if \(demoOn\) \{\s*\n\s*for \(let i = 0; i < TC; i\+\+\) driveCube\(/);
  });

  it("im Spiel ist der Schalter aus", () => {
    const bf = readFileSync(new URL("../src/ui/Battlefield.jsx", import.meta.url), "utf8");
    for (const zeile of bf.split("\n").filter((l) => l.includes("<CubeMatrixField"))) {
      expect(zeile, "das Brett darf bei stiller Musik still bleiben").not.toMatch(/\bdemo\b/);
    }
  });

  // Das Element steht über zwei Zeilen — als GANZES lesen, sonst prüft der Wächter die halbe Wahrheit.
  const aufruf = cz.slice(cz.indexOf("<CubeMatrixField")).split("/>")[0];

  it("die Werkstatt-Vorschau schaltet ihn an und benutzt den gemeinsamen Boden", () => {
    expect(aufruf).toContain("<CubeMatrixField");
    expect(aufruf).toMatch(/\bdemo\b/);
    expect(aufruf).toMatch(/floorEffectPlacement\(\)/);
  });

  it("die alten Shop-Sonderwerte sind weg — sie galten für eine Box mit anderem Format", () => {
    // riseBase/riseScale/yBias/depthScale waren „in shop-großer Box abgestimmt" (1,62:1). Seit die
    // Vorschau das Brettformat trägt, hielten sie das Feld über dem Horizont des Bildes schweben.
    for (const tot of ["riseBase", "riseScale", "yBias", "depthScale"]) {
      expect(aufruf, `${tot} gehört nicht mehr in die Vorschau`).not.toContain(tot);
    }
  });
});

/* ============================================================
   #cube-deckfarbe + #cube-flimmern (18.08.2026) — zwei Nähte am Würfel-Feld, beide still zerbrechlich.
   ============================================================ */
describe("Würfel-Matrix · Bodenraster und Rückflanke", () => {
  const src = readFileSync(new URL("../src/ui/fx/CubeMatrixField.jsx", import.meta.url), "utf8");

  it("der Bodenraster folgt der Deckfarbe, statt fest auf GRID_COL zu stehen", () => {
    /* Er war das EINZIGE Element, das im Deckfarbe-Modus stehen blieb — Türme und Punkte färbten längst um.
       Der Fehler sieht man nur mit eingeschaltetem Deckfarbe-Modus UND hellem Boden; der Wächter sieht ihn immer.
       Gemessen nach dem Fix (Demo-Signal, Deck orange/grün): Standard rgb(83,49,85) violett gegen
       Deckfarbe rgb(66,59,51) — also die Mischung der beiden Deckfarben. */
    const fn = src.slice(src.indexOf("function drawFloor"), src.indexOf("function box3d"));
    expect(fn, "drawFloor liest die Deckfarbe nicht mehr").toMatch(/deckColored\s*\?/);
    expect(fn, "GRID_COL darf nur noch der STANDARD-Fall sein").toMatch(/:\s*rgb\(GRID_COL\)/);
  });

  it("die Rückflanke ist langsamer als die Anstiegsflanke (sonst flackert es)", () => {
    /* Ein Hüllkurvenfolger will schnell rauf, langsam runter. Die Ungleichung stammt aus #cube-flimmern und
       gilt unverändert — sie steht seit #cube-takt nur in ZEITKONSTANTEN statt in Schrittanteilen, und dreht
       sich damit um: langsamer heißt jetzt GRÖSSER, nicht kleiner. Wer die Bewegung insgesamt dämpfen will,
       dreht an GAIN/CONTRAST und nicht hieran. */
    const auf = Number(src.match(/TAU_UP:\s*([\d.]+)/)[1]);
    const ab = Number(src.match(/TAU_DN:\s*([\d.]+)/)[1]);
    expect(ab, `TAU_DN ${ab} s muss ÜBER TAU_UP ${auf} s liegen`).toBeGreaterThan(auf);
  });
});

/* ============================================================
   #cube-takt (18.08.2026) — die Hüllkurve rechnet in Zeit, nicht in Frames.
   ------------------------------------------------------------
   Der Fehler war unsichtbar: `v += (ziel − v) · 0.16` sieht wie eine Geschwindigkeit aus, ist aber eine
   Geschwindigkeit geteilt durch die Zeichenrate. Auf dem Handy (effektiv 20 Zeichnungen/s) wurden daraus
   Zeitkonstanten von 0,31 s / 0,56 s — die Türme hinkten der Musik um eine Zählzeit hinterher und kamen
   zwischen zwei Schlägen nicht mehr herunter. Der Quelltext sah dabei völlig gesund aus.
   Deshalb wird hier GERECHNET statt nach Schreibweisen gesucht: `glaettung` ist rein, der Wächter kann die
   Bildratenfreiheit als Eigenschaft nachweisen. Nur die Verdrahtung bleibt Ratsche.
   ============================================================ */
describe("#cube-takt — die Hüllkurve ist bildratenfrei", () => {
  const src = readFileSync(new URL("../src/ui/fx/CubeMatrixField.jsx", import.meta.url), "utf8");

  it("zwei halbe Schritte kommen genauso weit wie ein ganzer", () => {
    /* DIE Eigenschaft, um die es geht. Gilt sie, ist der Stand des Turms eine Funktion der WANDUHRZEIT und
       nicht der Frame-Anzahl — ein fps-Einbruch macht die Bewegung dann gröber, aber nicht langsamer. */
    const schritt = (v, dt, tau) => v + (1 - v) * glaettung(dt, tau);
    for (const tau of [0.05, 0.1, 0.3, 1.5]) {
      const ganz = schritt(0, 0.05, tau);
      const halb = schritt(schritt(0, 0.025, tau), 0.025, tau);
      expect(halb, `τ=${tau}`).toBeCloseTo(ganz, 12);
    }
  });

  it("überschießt nie — auch nicht bei einem Frame-Aussetzer", () => {
    // Die lineare Näherung dt/τ liefe bei dt > τ über 1 und katapultierte den Turm über sein Ziel hinaus.
    for (const dt of [0, 0.016, 0.05, 0.25, 2, 60]) {
      const k = glaettung(dt, 0.1);
      expect(k, `dt=${dt}`).toBeGreaterThanOrEqual(0);
      expect(k, `dt=${dt}`).toBeLessThanOrEqual(1);
    }
    expect(glaettung(0, 0.1), "ohne vergangene Zeit ändert sich nichts").toBe(0);
  });

  it("die Zeitkonstanten treffen den musikalischen Takt", () => {
    /* Der Sinn der Zahlen, nicht die Zahlen selbst: Bei einem Schlagabstand von ~0,5 s muss ein Kick-Transient
       den größten Teil seiner Zielhöhe erreichen (sonst „kaum Ausschlag") UND der Turm bis zum nächsten Schlag
       weitgehend zurückfallen (sonst steht er auf einem Plateau und der Ausschlag verschwindet darin). */
    const auf = Number(src.match(/TAU_UP:\s*([\d.]+)/)[1]);
    const ab = Number(src.match(/TAU_DN:\s*([\d.]+)/)[1]);
    expect(glaettung(0.15, auf), "150-ms-Kick muss über 70 % der Zielhöhe kommen").toBeGreaterThan(0.7);
    expect(Math.exp(-0.5 / ab), "nach einem Schlagabstand darf höchstens ein Viertel stehen bleiben").toBeLessThan(0.25);
    // …aber nicht so schnell, dass es wieder flackert (das war #cube-flimmern).
    expect(Math.exp(-0.5 / ab), "ganz auf null fallen soll er auch nicht").toBeGreaterThan(0.02);
  });

  it("keine Schrittanteile je Frame mehr im Quelltext", () => {
    /* Gegenprobe zur Umstellung: die alten Konstanten sind weg, und die drei Nachführungen lesen ihre
       Schrittanteile aus `glaettung`. Ein einzelner zurückgedrehter Wert wäre am Bild kaum zu sehen — er
       würde nur genau EINE der Größen wieder von der Bildrate abhängig machen. */
    /* Gegen den KOMMENTARFREIEN Quelltext prüfen: die Begründung im Kopf der Datei nennt die alten Namen
       wörtlich (das ist ihr Zweck), und eine Ratsche, die das mitliest, schlägt beim Dokumentieren an. */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bATTACK:/);
    expect(code).not.toMatch(/\bRELEASE:/);
    expect(code).not.toMatch(/\bSLOW:/);                     // hieß der Koeffizienten-Faktor, jetzt TAU_SLOW
    expect(code, "der Wächter muss die TUNE-Tabelle überhaupt noch sehen").toMatch(/TAU_UP:/);
    expect(src).toMatch(/baseB\[i\] \+= \(raw - baseB\[i\]\) \* liveBase/);
    expect(src).toMatch(/spotBassBase \+= \(raw - spotBassBase\) \* liveBase/);
    expect(src).toMatch(/songAct \+= .*\* glaettung\(dt, TUNE\.TAU_ACT\)/);
    expect(src).toMatch(/liveBase = glaettung\(dt, TUNE\.TAU_BASE\)/);
  });

  it("die Zeichenrate kommt aus der geteilten Toleranz-Formel, nicht aus einem Literal", () => {
    /* Die alte Schwelle (`liteOn() ? 40 : 24`) lag ohne die halbe Frame-Toleranz auf dem 60-Hz-Frame-Raster:
       der Frame bei 33,3 ms fiel durch die 40er-Schwelle → 20 Zeichnungen/s statt der im Kommentar
       versprochenen 25. Genau die Falle, die mobileTier.js für die WebGL-Felder schon beschrieben hat. */
    /* Nur den CODE ansehen, nicht die Begründung darüber: die nennt die alte Schwelle wörtlich, und eine
       Ratsche, die ihren eigenen Kommentar liest, schlägt beim Dokumentieren an statt beim Rückfall. */
    const fn = src.slice(src.indexOf("function frame(now)"));
    expect(fn).not.toMatch(/\? 40 : 24/);
    expect(fn).toMatch(/FRAME_MS = hzMinMs\(/);
    expect(fn).toMatch(/Math\.min\(AMBIENT_HZ, DRAW_HZ_COARSE\)/);   // `?hz=` muss nach unten durchgreifen
  });

  it("die Zielrate ergibt auf einem 60-Hz-Schirm einen GLEICHMÄSSIGEN Abstand", () => {
    // Der eigentliche Zweck der Toleranz. Ohne sie schwankt der Abstand (33/50/33/50) und der Effekt ruckelt,
    // obwohl der FPS-Zähler 60 zeigt — er zählt rAF-Frames, nicht Zeichnungen.
    const schwelle = hzMinMs(AMBIENT_HZ);
    const abstaende = [];
    let last = 0;
    for (let i = 1; i <= 120; i++) {
      const now = (i * 1000) / 60;
      if (now - last < schwelle) continue;
      abstaende.push(now - last); last = now;
    }
    const gezeichnet = abstaende.slice(1);   // der erste Abstand startet bei t = 0
    expect(Math.max(...gezeichnet) - Math.min(...gezeichnet), "alle Abstände gleich").toBeLessThan(0.01);
    expect(1000 / gezeichnet[0], "…und die Zielrate wird auch getroffen").toBeCloseTo(AMBIENT_HZ, 6);
  });

  it("das Ersatzsignal liefert auch seine Aktivität — sonst driftet die Vorschau vom Spiel weg", () => {
    /* Ohne diese Zeile misst der Spektral-Fluss die STILLE, hinter der das Ersatzsignal steht: `songAct` fiele
       auf 0, die Werkstatt liefe dauerhaft auf den trägen Zeitkonstanten (×TAU_SLOW), das Spiel auf den
       knackigen. Zwei Tempi für dasselbe Feld — genau die Drift, gegen die #kompositor argumentiert. */
    expect(src).toMatch(/if \(demoOn\) songAct = TUNE\.SPEED_HI/);
    // …und dafür muss demoOn VOR dem AUFRUF von computeSpeed feststehen (nicht vor dessen Definition —
    // die steht weiter oben in der Datei und wäre die falsche Fundstelle).
    expect(src.indexOf("const demoOn =")).toBeLessThan(src.indexOf("&& computeSpeed(dt, demoOn)"));
  });
});
