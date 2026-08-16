import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/* #264 — Musik-Lazy-Gating: stumm gestartet lädt KEINEN Track (0 Bytes); erst „hörbar" (nicht stumm,
   Volume > 0, nicht pausiert) wird der aktuelle Track lazy geladen und gespielt; Re-Mute pausiert den
   Stream (kein Reload). Verifiziert über ein Fake-<audio>, das src-Zuweisungen und play/pause aufzeichnet. */

class FakeAudio {
  constructor() {
    this._src = ""; this.loop = false; this.preload = ""; this.volume = 1; this.currentTime = 0;
    this.paused = true; this.playCalls = 0; this.pauseCalls = 0; this.srcSets = [];
  }
  set src(v) { this._src = v; this.srcSets.push(v); }
  get src() { return this._src; }
  play() { this.paused = false; this.playCalls++; return Promise.resolve(); }
  pause() { this.paused = true; this.pauseCalls++; }
  addEventListener(type, fn) { this.handlers = this.handlers || {}; this.handlers[type] = fn; } // music.js hängt „ended" an (Tier-Weiterschaltung)
}

let created = [];
beforeEach(() => {
  created = [];
  globalThis.Audio = class extends FakeAudio { constructor() { super(); created.push(this); } };
});

describe("Musik Lazy-Gating (#264)", () => {
  it("stumm gestartet lädt nichts; Unmute lädt lazy; Re-Mute pausiert ohne Reload", async () => {
    vi.resetModules();
    const { music } = await import("../src/ui/music.js");

    // Stumm gestartet: Track wählen (Titel), aber es darf NICHTS geladen werden.
    music.setMuted(true);
    music.setVolume(0.2);
    music.menu();    // wählt Menü-Track
    music.unlock();  // erste User-Geste — weiterhin stumm
    const el = created[0];
    expect(el, "Audio-Element angelegt").toBeTruthy();
    expect(el.srcSets.length, "kein .src → 0 Bytes geladen").toBe(0);
    expect(el.playCalls, "spielt nicht, solange stumm").toBe(0);

    // Unmute → hörbar → Track wird JETZT lazy geladen und gespielt.
    music.setMuted(false);
    expect(el.srcSets.length, "genau ein Ladevorgang beim Unmute").toBe(1);
    expect(el.src, "eine echte Track-URL liegt an").toBeTruthy();
    expect(el.playCalls, "spielt nach Unmute").toBeGreaterThan(0);

    const loads = el.srcSets.length;
    // Re-Mute → Stream stoppt (pause), aber kein erneutes Laden.
    music.setMuted(true);
    expect(el.pauseCalls, "Stream angehalten").toBeGreaterThan(0);
    expect(el.srcSets.length, "kein Reload beim Stummschalten").toBe(loads);

    // Wieder hörbar → derselbe Track wird fortgesetzt (kein neuer .src).
    music.setMuted(false);
    expect(el.srcSets.length, "Resume ohne Reload (loadedUrl unverändert)").toBe(loads);
  });

  it("Volume 0 stoppt den Stream wie Mute", async () => {
    vi.resetModules();
    const { music } = await import("../src/ui/music.js");
    music.setVolume(0.2);
    music.menu();
    music.unlock();
    const el = created[0];
    expect(el.srcSets.length, "hörbar gestartet → geladen").toBe(1);
    expect(el.paused).toBe(false);

    music.setVolume(0); // wie stumm
    expect(el.paused, "Volume 0 pausiert den Stream").toBe(true);
    expect(el.pauseCalls).toBeGreaterThan(0);
  });

  it("Stufenwechsel: frischer Song wird NICHT angeschnitten; ab SWITCH_MIN_PLAY weicher Fade-Wechsel", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    try {
      const { music } = await import("../src/ui/music.js");
      music.setVolume(0.5);
      music.enterRun();               // Run-Start → calm-Track (Score 0)
      const el = created[0];
      const base = el.srcSets.length; // 1 (erster Track geladen)
      expect(base).toBe(1);

      // Frischer Song (5 s gelaufen) + Schwelle nach mid überschritten → NICHT anschneiden (kein neuer .src).
      el.currentTime = 5;
      music.setProgress(2000000);     // 2 Mio → mid
      expect(el.srcSets.length, "frischer Song bleibt ungeschnitten").toBe(base);

      // Song lief inzwischen lange → nächster Stufenwechsel blendet weich auf einen neuen Track (genau ein Reload).
      el.currentTime = 60;
      music.setProgress(10000000);    // 10 Mio → mid (TIER_MIN.mid = 3 Mio); Stufenwechsel bei lang laufendem Song
      vi.advanceTimersByTime(1200);   // Fade-Übergang durchlaufen (Swap am Ende der ersten Halbwelle)
      expect(el.srcSets.length, "nach dem Fade genau ein neuer Track").toBe(base + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  // #334: Am Songende reiht der `ended`-Listener den nächsten Track der Stufe — er wird EINGEBLENDET (Volume rampt von
  // ~0 auf den Zielpegel), NICHT hart auf Vollpegel gesetzt. Das behebt den harten Schnitt beim aufgeschobenen
  // Schwellenwechsel und macht auch das normale Weiterreihen sauberer.
  it("Weiterreihen am Songende blendet den neuen Track ein (kein Hart-Start auf Vollpegel)", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    try {
      const { music } = await import("../src/ui/music.js");
      music.setVolume(0.5);
      music.enterRun();                 // Run-Start → calm-Track, Vollpegel
      const el = created[0];
      const base = el.srcSets.length;   // 1
      expect(el.volume, "erster Track auf Zielpegel").toBeCloseTo(0.5, 5);

      // Songende simulieren → nächster Track wird geladen UND eingeblendet (startet leise).
      el.handlers.ended();
      expect(el.srcSets.length, "neuer Track geladen").toBe(base + 1);
      expect(el.volume, "startet leise (Fade-in), nicht auf Vollpegel").toBeLessThan(0.5);

      // Fade-in auslaufen lassen → Zielpegel erreicht.
      vi.advanceTimersByTime(1200);
      expect(el.volume, "auf Zielpegel eingeblendet").toBeCloseTo(0.5, 5);
    } finally {
      vi.useRealTimers();
    }
  });

  // #333: In den Auswahlphasen läuft die Musik ~40 % leiser (effVol = volume × duck), sanft gefadet; setDuck(1) zurück
  // auf voll. Nutzer-Lautstärke bleibt unberührt (Duck ist kein Mute).
  it("Auswahlphasen-Ducking senkt den effektiven Pegel sanft (Faktor 0,6) und wieder zurück", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    try {
      const { music } = await import("../src/ui/music.js");
      music.setVolume(0.5);
      music.enterRun();
      const el = created[0];
      expect(el.volume, "Start auf voller Lautstärke").toBeCloseTo(0.5, 5);

      // In Auswahlphase → 40 % leiser (0,5 × 0,6 = 0,3), sanft (300 ms Ramp).
      music.setDuck(0.6);
      vi.advanceTimersByTime(400);
      expect(el.volume, "geduckt auf volume×0,6").toBeCloseTo(0.3, 5);

      // Zurück ins Stichspiel → wieder voll.
      music.setDuck(1);
      vi.advanceTimersByTime(400);
      expect(el.volume, "zurück auf voll").toBeCloseTo(0.5, 5);
    } finally {
      vi.useRealTimers();
    }
  });

  // #339: Fortgesetzter Lauf startet auf der zum gespeicherten Score passenden Stufe (nicht immer „calm").
  it("enterRun(score) wählt die zum Score passende Stufe; enterRun(0) bleibt calm", async () => {
    vi.resetModules();
    const rnd = vi.spyOn(Math, "random").mockReturnValue(0); // deterministisch: immer der ERSTE Track der Stufe
    try {
      const { music } = await import("../src/ui/music.js");
      let title = null;
      music.subscribe((tt) => { title = tt; });
      music.setVolume(0.5);
      music.enterRun(0);                 // Score 0 → calm → erster calm-Track
      expect(title).toBe("Formation Shuffle");
      music.enterRun(95000000);          // 95 Mio → overdrive_plus → erster Track dieser Stufe
      expect(title).toBe("Redline");
    } finally {
      rnd.mockRestore();
    }
  });
});

/* #329 — Effektsound-Gating: außerhalb von aktivem Spiel/Werkstatt (Victory/Gameover, Pause, Overlays) sind One-Shot-
   Effektsounds (fx_*) stumm; UI-Sounds (button/cardflip/buy/denied) klingen weiter; laufende fx-Stimmen werden beim
   Aktivieren sofort ausgeblendet. Minimaler Web-Audio-Stub (node-Env hat kein window/AudioContext). */
describe("Effektsound-Gating (#329)", () => {
  let started, origFetch;
  beforeEach(() => {
    started = [];
    class Param { constructor(v) { this.value = v; } setValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
    class Node {
      constructor() { for (const k of ["gain", "playbackRate", "frequency", "Q", "threshold", "knee", "ratio", "attack", "release"]) this[k] = new Param(1); }
      connect(n) { return n || this; } disconnect() {}
    }
    class Source extends Node { constructor() { super(); this.buffer = null; this.loop = false; this.stopped = false; this.onended = null; } start() { started.push(this); } stop() { this.stopped = true; } }
    class Ctx {
      constructor() { this._t = 0; this.state = "running"; this.destination = {}; }
      get currentTime() { this._t += 0.5; return this._t; } // pro Lesevorgang leicht vorrücken → Cooldowns greifen nicht fälschlich
      createDynamicsCompressor() { return new Node(); }
      createGain() { return new Node(); }
      createBiquadFilter() { return new Node(); }
      createBufferSource() { return new Source(); }
      decodeAudioData() { return Promise.resolve({ duration: 1 }); }
      resume() { this.state = "running"; return Promise.resolve(); }
      suspend() { this.state = "suspended"; return Promise.resolve(); }
    }
    globalThis.window = { AudioContext: Ctx };
    origFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  });
  afterEach(() => { delete globalThis.window; globalThis.fetch = origFetch; });

  it("fxSuspended sperrt fx_*-One-Shots (UI-Sounds bleiben); laufende fx-Stimme wird gestoppt; Freigabe erlaubt wieder", async () => {
    vi.resetModules();
    const { audio } = await import("../src/ui/audio.js");
    audio.setVolume(0.6);
    audio.unlock();                              // Context anlegen + Puffer lazy laden
    await new Promise((r) => setTimeout(r, 0));  // fetch→decode-Ketten durchlaufen
    await new Promise((r) => setTimeout(r, 0));

    // Baseline (Spiel aktiv, fxSuspended=false): fx + UI starten je eine Quelle.
    audio.play("fx_blade");
    audio.play("button");
    expect(started.length, "fx + UI starten je eine Quelle").toBe(2);

    // Übergang in Victory/Overlay: fxSuspended aktiv → laufende fx-Stimme sofort ausblenden.
    audio.setFxSuspended(true);
    expect(started[0].stopped, "laufende fx_-Stimme (fx_blade) wird gestoppt").toBe(true);
    expect(started[1].stopped, "UI-Stimme (button) bleibt").toBe(false);

    const n = started.length;
    audio.play("fx_blade");   // blockiert
    expect(started.length, "fx_ blockiert, solange fxSuspended").toBe(n);
    audio.play("button");     // UI weiter
    expect(started.length, "UI-Sound spielt weiter").toBe(n + 1);

    // Zurück ins Spiel/Werkstatt: Freigabe → fx wieder erlaubt.
    audio.setFxSuspended(false);
    audio.play("fx_blade");
    expect(started.length, "fx_ nach Freigabe wieder erlaubt").toBe(n + 2);
  });
});
