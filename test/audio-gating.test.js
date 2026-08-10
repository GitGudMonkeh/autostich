import { describe, it, expect, beforeEach, vi } from "vitest";

/* #264 — Musik-Lazy-Gating: stumm gestartet lädt KEINEN Track (0 Bytes); erst „hörbar" (nicht stumm,
   Volume > 0, nicht pausiert) wird der aktuelle Track lazy geladen und gespielt; Re-Mute pausiert den
   Stream (kein Reload). Verifiziert über ein Fake-<audio>, das src-Zuweisungen und play/pause aufzeichnet. */

class FakeAudio {
  constructor() {
    this._src = ""; this.loop = false; this.preload = ""; this.volume = 1;
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
});
