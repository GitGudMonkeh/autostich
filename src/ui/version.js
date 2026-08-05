// Versions-/Build-Stempel (#250). Zweck: nach jedem Push sofort sehen, OB er gelandet ist, und in WELCHER Umgebung.
// Major.Minor = Meilenstein (per Hand je Milestone gepflegt). Build-Nummer + kurze SHA + Umgebung werden zur BUILD-ZEIT
// aus dem CI injiziert (VITE_BUILD_NUM = git rev-list --count HEAD, VITE_BUILD_SHA = git rev-parse --short HEAD,
// VITE_ENV = test|main). Im Dev-Build sind sie leer → Fallback „dev". Vite exponiert VITE_*-Env automatisch (wie VITE_PREVIEW).
export const APP_VERSION = "0.4";

const rawNum = import.meta.env.VITE_BUILD_NUM;
// Build-Nummer 3-stellig gepolstert (7 → „007"), analog zum gewünschten „0.3.001"-Stil.
export const BUILD_NUM = rawNum ? String(rawNum).padStart(3, "0") : null;
export const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || null;
export const BUILD_ENV =
  import.meta.env.VITE_ENV ||
  (import.meta.env.VITE_PREVIEW === "1" ? "test" : import.meta.env.DEV ? "dev" : "main");

// „v0.3.007" sobald gebaut (CI), sonst „v0.3·dev".
export const VERSION_LABEL = BUILD_NUM ? `v${APP_VERSION}.${BUILD_NUM}` : `v${APP_VERSION}·dev`;
// Volle Zeile für den Footer: „v0.3.007 · test · a1b2c3d".
export const VERSION_FULL = [VERSION_LABEL, BUILD_ENV, BUILD_SHA].filter(Boolean).join(" · ");
