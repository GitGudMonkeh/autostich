/* DECK-WERKSTATT — Theme-Registry & Kauf-Ökonomie (#deckshop).

   PUR & node-testbar (wie cosmetics.js): hält NUR Metadaten + Logik, importiert KEINE Bild-Assets
   (die liegen UI-seitig in cosmeticAssets.js, gekeyed über die deck-/bf-id). Ein „Theme" bündelt ein
   Deck (Karte front+back), ein Battlefield und drei Animationen (Frame Glow · Holo Swipe · Hologrid).

   Jedes Element ist EINZELN erwerbbar. Es gibt zwei Erwerbsarten, pro Element aufgelöst:
     • Kauf (kind:"buy")  — kostet COST_PER_ELEMENT SP; Besitz in profile.ownedCosmetics["theme:element"].
     • Bedingung          — über einen Lauf/Challenge freigeschaltet (games/streak/score/…); kein SP.
   Deck-/BF-Elemente leihen ihre Bedingung aus DECK_DEFS/BATTLEFIELD_DEFS (eine Quelle der Wahrheit);
   Animationen sind ausschließlich Kauf-Elemente der drei Starter-Themes.

   Die UI (CustomizeScreen) rendert rein aus diesen Ableitungen — dieselbe Wahrheit für Tests & Screen. */

import { DECK_DEFS, BATTLEFIELD_DEFS, isUnlocked, unlockProgress } from "./cosmetics.js";

export const COST_PER_ELEMENT = 1; // SP je Element

// Element-Katalog (Reihenfolge = Anzeige im Kauffenster). fx = CSS-Effekt-Kennung für die Vorschau/den Screen.
export const ELEMENT_DEFS = [
  { key: "deck",      icon: "🎴", name: "Karte (Front + Back)", desc: "Das Kartenmotiv des Themes.",     fx: "deck" },
  { key: "bf",        icon: "🏙️", name: "Battlefield",           desc: "Der Neon-Hintergrund des Themes.", fx: "bf" },
  { key: "frameGlow", icon: "✦",  name: "Frame Glow",            desc: "Pulsierender Karten-Rahmen.",      fx: "frameGlow" },
  { key: "holoSwipe", icon: "🌫️", name: "Holo Swipe",            desc: "Holografischer Schimmer.",         fx: "holoSwipe" },
  { key: "hologrid",  icon: "▧",  name: "Hologrid",              desc: "Bewegtes Gitter im Battlefield.",  fx: "hologrid" },
];
export const ELEMENT_BY_KEY = Object.fromEntries(ELEMENT_DEFS.map((e) => [e.key, e]));
export const FX_KEYS = ["frameGlow", "holoSwipe", "hologrid"]; // die drei Animationen (reine Kauf-Elemente)

// Welche Options-Flagge steuert die In-Run-Animation (global an/aus).
export const FX_OPTION_KEY = { frameGlow: "fxFrameGlow", holoSwipe: "fxHoloSwipe", hologrid: "fxHologrid" };

/* THEME-Registry. kind:
     "buy"  → alle fünf Elemente einzeln mit SP kaufbar (Starter-Themes).
     "cond" → Deck (+ ggf. Battlefield) über die bestehende Bedingung freigeschaltet; keine Animationen, kein SP.
   a1 = Hauptfarbe (u. a. Hologrid-Gitterlinien), a2 = Sekundärfarbe (Akzente/Beams). */
export const THEME_DEFS = {
  // ---- Kaufbare Starter-Themes (je Element 1 SP) ----
  sunset: { id: "sunset", name: "Sunset Rider", emblem: "🏍️", kind: "buy", a1: "#ff5a4d", a2: "#ffab3a",
    deckId: "deck_sunset", bfId: "bf_sunset", els: ["deck", "bf", "frameGlow", "holoSwipe", "hologrid"] },
  lofi:   { id: "lofi",   name: "Lofi Nights",  emblem: "🎧", kind: "buy", a1: "#9b6cff", a2: "#ff7ab0",
    deckId: "deck_lofi",  bfId: "bf_lofi",  els: ["deck", "bf", "frameGlow", "holoSwipe", "hologrid"] },
  kaiju:  { id: "kaiju",  name: "Neon Kaiju",   emblem: "🦖", kind: "buy", a1: "#3a7bff", a2: "#ff4dcb",
    deckId: "deck_kaiju", bfId: "bf_kaiju", els: ["deck", "bf", "frameGlow", "holoSwipe", "hologrid"] },

  // ---- Progressions-Themes (Deck + Battlefield, je über „Läufe" freigeschaltet) ----
  neon: { id: "neon", name: "Neonstadt", emblem: "🌆", kind: "cond", a1: "#26c6e6", a2: "#9b82f0",
    deckId: "deck_p1", bfId: "bf_1", els: ["deck", "bf"] },
  tank: { id: "tank", name: "Tankstopp", emblem: "⛽", kind: "cond", a1: "#ff9d3a", a2: "#ff5a4d",
    deckId: "deck_p2", bfId: "bf_2", els: ["deck", "bf"] },
  mega: { id: "mega", name: "Megacity",  emblem: "🏙️", kind: "cond", a1: "#3a7bff", a2: "#26c6e6",
    deckId: "deck_p3", bfId: "bf_3", els: ["deck", "bf"] },
  mond: { id: "mond", name: "Mondpagode", emblem: "🌙", kind: "cond", a1: "#9b82f0", a2: "#26c6e6",
    deckId: "deck_p4", bfId: "bf_4", els: ["deck", "bf"] },

  // ---- Challenge-Themes (nur Deck; alles auf einmal über die Challenge freigeschaltet) ----
  endlos:  { id: "endlos",  name: "Endloskette",  emblem: "♾️", kind: "cond", a1: "#f2c14a", a2: "#ff9d3a", deckId: "deck_c1", els: ["deck"] },
  rekord:  { id: "rekord",  name: "Rekordhalter", emblem: "🏆", kind: "cond", a1: "#f2c14a", a2: "#f2a83a", deckId: "deck_c2", els: ["deck"] },
  spar:    { id: "spar",    name: "Sparfuchs",    emblem: "🦊", kind: "cond", a1: "#54e08a", a2: "#26c6e6", deckId: "deck_c3", els: ["deck"] },
  feuer:   { id: "feuer",   name: "Reines Feuer", emblem: "🔥", kind: "cond", a1: "#ff6a3a", a2: "#ffb03a", deckId: "deck_c5", els: ["deck"] },
  blitz:   { id: "blitz",   name: "Reiner Blitz", emblem: "⚡", kind: "cond", a1: "#ffe14d", a2: "#3a7bff", deckId: "deck_c6", els: ["deck"] },
  eis:     { id: "eis",     name: "Reines Eis",   emblem: "❄️", kind: "cond", a1: "#7fdcff", a2: "#26c6e6", deckId: "deck_c7", els: ["deck"] },
  pflanze: { id: "pflanze", name: "Reine Pflanze", emblem: "🌿", kind: "cond", a1: "#54e08a", a2: "#9be15e", deckId: "deck_c8", els: ["deck"] },
  bund:    { id: "bund",    name: "Element-Bund", emblem: "🧬", kind: "cond", a1: "#9b82f0", a2: "#ff4dcb", deckId: "deck_c9", els: ["deck"] },
};

export const THEMES = Object.values(THEME_DEFS);

// SP-Guthaben robust lesen (spiegelt progression.points).
const sp = (profile) => Math.max(0, Math.floor(Number(profile && profile.stichPoints) || 0));

// Besitz-Schlüssel eines Elements ("theme:element"). Für Deck/BF von Kauf-Themes deckungsgleich mit dem
// ownKey in DECK_DEFS/BATTLEFIELD_DEFS → EINE Besitz-Wahrheit für Screen, Kauf und resolveSkinId.
export const ownKey = (themeId, el) => `${themeId}:${el}`;

// Die Freischalt-/Kauf-Bedingung eines Elements. Deck/BF leihen sie aus den Cosmetics-Defs; Animationen
// sind reine Kauf-Elemente (kind:"buy" mit ownKey).
export function elementCond(theme, el) {
  if (el === "deck") return (DECK_DEFS[theme.deckId] || {}).unlock || null;
  if (el === "bf")   return (BATTLEFIELD_DEFS[theme.bfId] || {}).unlock || null;
  return { kind: "buy", ownKey: ownKey(theme.id, el) }; // frameGlow/holoSwipe/hologrid
}

const isBuyCond = (cond) => !!cond && cond.kind === "buy";

// Element im Besitz? (gekauft ODER über Bedingung frei). Nutzt dieselbe isUnlocked-Wahrheit wie die Auswahl.
export function elementOwned(profile, theme, el) {
  return isUnlocked({ unlock: elementCond(theme, el) }, profile);
}

// Feiner Element-Zustand: "own" | "buy" (SP-kaufbar, noch nicht im Besitz) | "lock" (Bedingung offen).
export function elementState(profile, theme, el) {
  const cond = elementCond(theme, el);
  if (elementOwned(profile, theme, el)) return "own";
  return isBuyCond(cond) ? "buy" : "lock";
}

// Preis eines Elements in SP (nur Kauf-Elemente; sonst null).
export const elementPrice = (theme, el) => (isBuyCond(elementCond(theme, el)) ? COST_PER_ELEMENT : null);

// Klartext-Freischaltung eines (bedingungs-)Elements — Label + Fortschritt (für Vorschau/Sperr-Anzeige).
export const elementUnlock = (profile, theme, el) => unlockProgress({ unlock: elementCond(theme, el) }, profile);

// Aggregierter Theme-Zustand fürs Kachel-Badge:
//   "own"  = alle angebotenen Elemente im Besitz
//   "mix"  = einige im Besitz
//   "buy"  = nichts im Besitz, aber (mind. ein Element) SP-kaufbar
//   "lock" = nichts im Besitz und nichts kaufbar (reines Challenge-/Progressions-Theme)
export function themeState(profile, theme) {
  const states = theme.els.map((el) => elementState(profile, theme, el));
  if (states.every((s) => s === "own")) return "own";
  if (states.some((s) => s === "own")) return "mix";
  return states.some((s) => s === "buy") ? "buy" : "lock";
}

// Ist das Theme (mind. ein Element) SP-kaufbar? (→ Kauf-Themes.)
export const isBuyTheme = (theme) => theme.kind === "buy";

// „Alles kaufen": noch nicht besessene KAUF-Elemente (je COST). Anzahl + Gesamtkosten + wie viele schon da.
export function buyAllInfo(profile, theme) {
  const buyEls = theme.els.filter((el) => isBuyCond(elementCond(theme, el)));
  const remaining = buyEls.filter((el) => !elementOwned(profile, theme, el));
  return { total: buyEls.length, remainingCount: remaining.length, cost: remaining.length * COST_PER_ELEMENT,
    ownedCount: buyEls.length - remaining.length, remaining };
}

// Für Challenge-Themes: eine gemeinsame Freischalt-Beschreibung, WENN alle angebotenen Elemente dieselbe
// (nicht-Kauf-) Bedingung teilen (z. B. Challenge-Deck: nur „deck"). Sonst null (→ per-Element-Labels).
export function sharedUnlock(profile, theme) {
  const conds = theme.els.map((el) => elementCond(theme, el)).filter(Boolean);
  if (!conds.length || conds.some((c) => isBuyCond(c))) return null;
  const first = JSON.stringify(conds[0]);
  if (!conds.every((c) => JSON.stringify(c) === first)) return null; // uneinheitlich (z. B. Progressions-Deck+BF)
  return elementUnlock(profile, theme, theme.els[0]);
}

/* ---- Kauf-Aktionen (rein, liefern ein NEUES Profil; No-op bei nicht kaufbar/zu wenig SP) ---- */

// Kann dieses Element gekauft werden? (Kauf-Element, noch nicht im Besitz, genug SP.)
export function canBuyElement(profile, theme, el) {
  const cond = elementCond(theme, el);
  if (!isBuyCond(cond)) return false;
  if (elementOwned(profile, theme, el)) return false;
  return sp(profile) >= COST_PER_ELEMENT;
}

// Ein Element kaufen → neues Profil (1 SP abziehen, in stichSpent buchen, Besitz setzen).
export function buyElement(profile, theme, el) {
  if (!canBuyElement(profile, theme, el)) return profile;
  const key = elementCond(theme, el).ownKey;
  return {
    ...profile,
    stichPoints: sp(profile) - COST_PER_ELEMENT,
    stichSpent: Math.max(0, Math.floor(Number(profile && profile.stichSpent) || 0)) + COST_PER_ELEMENT,
    ownedCosmetics: { ...(profile && profile.ownedCosmetics), [key]: true },
  };
}

// „Alles kaufen" für ein Theme → neues Profil (alle noch offenen Kauf-Elemente auf einmal). No-op, wenn das
// Guthaben nicht für ALLE reicht (Alles-oder-nichts, passend zum ausgewiesenen Gesamtpreis).
export function buyAllForTheme(profile, theme) {
  const { remaining, cost } = buyAllInfo(profile, theme);
  if (!remaining.length || sp(profile) < cost) return profile;
  let next = profile;
  for (const el of remaining) next = buyElement(next, theme, el);
  return next;
}
