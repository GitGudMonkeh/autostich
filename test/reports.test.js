import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { toRow } from "../src/game/reports.js";
import { pushError, errorLog, clearErrors, install } from "../src/ui/errorBuffer.js";
import { loadFeedbackDraft, saveFeedbackDraft, clearFeedbackDraft,
  feedbackRateCheck, noteFeedbackSent, FEEDBACK_MIN_GAP_MS, FEEDBACK_MAX_PER_DAY,
  RESET_KEYS, wipeProfileStorage } from "../src/game/storage.js";

/* #396 Feedback-Melder. Geprüft wird das, was ohne Netz und ohne Browser prüfbar ist:
   die Zeilenform für PostgREST, der Fehler-Ring-Puffer und die clientseitige Bremse.
   Der eigentliche Insert ist ein `fetch` — der wird beim Einrichten einmal von Hand belegt. */

const mockLS = () => {
  const m = new Map();
  return {
    getItem: (kk) => (m.has(kk) ? m.get(kk) : null),
    setItem: (kk, v) => m.set(kk, String(v)),
    removeItem: (kk) => m.delete(kk),
    clear: () => m.clear(),
  };
};

describe("reports — Zeilenform für PostgREST", () => {
  it("nimmt nur bekannte Spalten auf (ein Fremdfeld beantwortet PostgREST mit 400)", () => {
    const row = toRow({ kind: "bug", message: "kaputt", nonsense: "weg", id: 5, created_at: "x" });
    expect(row).toEqual({ kind: "bug", message: "kaputt" });
  });

  it("rundet die Zahl-Spalten — ein Float-Insert wäre ein 400 (wie #241 im Leaderboard)", () => {
    const row = toRow({ kind: "bug", message: "x", seed: 12345.7, cycle: 3.2, score: 999.99 });
    expect(row.seed).toBe(12346);
    expect(row.cycle).toBe(3);
    expect(row.score).toBe(1000);
  });

  it("lässt leere und fehlende Felder ganz weg (leere Zelle liest sich besser als \"\")", () => {
    const row = toRow({ kind: "idea", message: "hi", name: "   ", deck: null, ua: undefined });
    expect(row).toEqual({ kind: "idea", message: "hi" });
  });

  it("verwirft unbrauchbare Zahlen, statt NaN zu senden", () => {
    const row = toRow({ kind: "bug", message: "x", seed: "keine Zahl" });
    expect(row.seed).toBeUndefined();
  });
});

describe("errorBuffer — der Ring überbrückt Lauf → Menü", () => {
  beforeEach(() => clearErrors());

  it("hält die letzten fünf Fehler, ältere fallen raus", () => {
    for (let i = 1; i <= 7; i++) pushError(`Fehler ${i}`);
    const lines = errorLog().split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe("Fehler 3");   // 1 und 2 sind rausgefallen
    expect(lines[4]).toBe("Fehler 7");
  });

  it("entprellt denselben Fehler — eine Render-Schleife würde den Ring sonst zumüllen", () => {
    pushError("immer derselbe");
    pushError("immer derselbe");
    pushError("immer derselbe");
    expect(errorLog().split("\n")).toHaveLength(1);
  });

  it("ignoriert Leeres und kappt sehr lange Meldungen", () => {
    pushError("");
    pushError("   ");
    expect(errorLog()).toBe("");
    pushError("x".repeat(900));
    expect(errorLog().length).toBeLessThanOrEqual(300);
  });

  it("install() hängt sich an beide Kanäle (error + unhandledrejection)", () => {
    const handlers = {};
    const fakeWin = { addEventListener: (ev, fn) => { handlers[ev] = fn; } };
    install(fakeWin);
    expect(typeof handlers.error).toBe("function");
    expect(typeof handlers.unhandledrejection).toBe("function");
    handlers.error({ message: "Bumm", filename: "https://x/assets/index-a1b2.js", lineno: 42, colno: 7 });
    expect(errorLog()).toContain("Bumm");
    expect(errorLog()).toContain("index-a1b2.js:42:7");   // nur der Dateiname, nicht die volle URL
    handlers.unhandledrejection({ reason: new Error("Netz weg") });
    expect(errorLog()).toContain("unhandled: Netz weg");
  });
});

describe("Feedback — Entwurf parken & Bremse", () => {
  beforeEach(() => { global.localStorage = mockLS(); });
  afterEach(() => { delete global.localStorage; });

  it("ein Entwurf überlebt und lässt sich wieder wegräumen", () => {
    expect(loadFeedbackDraft()).toBe(null);
    saveFeedbackDraft({ kind: "bug", message: "kein Netz beim Senden" });
    expect(loadFeedbackDraft().message).toBe("kein Netz beim Senden");
    clearFeedbackDraft();
    expect(loadFeedbackDraft()).toBe(null);
  });

  it("zweiter Report binnen 30 s wird abgelehnt — MIT Restzeit für den sichtbaren Hinweis", () => {
    const t0 = 1_000_000;
    noteFeedbackSent(t0);
    const soon = feedbackRateCheck(t0 + 5_000);
    expect(soon.ok).toBe(false);
    expect(soon.reason).toBe("tooSoon");
    expect(soon.waitMs).toBe(FEEDBACK_MIN_GAP_MS - 5_000);
    // Nach Ablauf der Sperre geht es weiter.
    expect(feedbackRateCheck(t0 + FEEDBACK_MIN_GAP_MS + 1).ok).toBe(true);
  });

  it("Tagesdeckel greift, und ein Tag später ist wieder frei", () => {
    const t0 = 5_000_000;
    for (let i = 0; i < FEEDBACK_MAX_PER_DAY; i++) noteFeedbackSent(t0 + i * 60_000);
    const capped = feedbackRateCheck(t0 + FEEDBACK_MAX_PER_DAY * 60_000 + 60_000);
    expect(capped.ok).toBe(false);
    expect(capped.reason).toBe("dailyCap");
    // 24 h nach dem ersten Report fallen die alten Stempel aus dem Fenster.
    expect(feedbackRateCheck(t0 + 25 * 60 * 60 * 1000).ok).toBe(true);
  });

  it("beide Schlüssel hängen am Reset — sonst überlebte ein Entwurf den Profil-Wipe", () => {
    expect(RESET_KEYS).toContain("as_feedback_draft");
    expect(RESET_KEYS).toContain("as_feedback_sent");
    saveFeedbackDraft({ kind: "bug", message: "x" });
    noteFeedbackSent(1);
    wipeProfileStorage();
    expect(loadFeedbackDraft()).toBe(null);
    expect(feedbackRateCheck(2).ok).toBe(true);
  });
});
