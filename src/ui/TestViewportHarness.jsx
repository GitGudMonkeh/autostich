import { createRoot } from "react-dom/client";
import { harnessFrameSrc } from "./testViewport.js";
import { setLocale, t } from "../i18n/index.js";
import { loadOptions } from "../game/storage.js";

/* #400 Test viewport — the outer shell of the preview harness. PREVIEW ONLY; reached exclusively
   through the gated dynamic import in main.jsx.

   This file is CHROME AND NOTHING ELSE. The application is not rendered here, it is rendered inside
   the frame, in its own document. That separation is the whole point:

     · The iframe content box is a real viewport, so every viewport-scoped mechanism in the app —
       media queries including the `max-height` blocks, `100vw`/`100dvh`, `matchMedia`/`useIsWide`,
       `env(safe-area-inset-*)`, `ResizeObserver`, Pixi's `resizeTo: host` — resolves against the
       simulated size without the app knowing anything about the harness.
     · The `document.body` the overlays portal into is the frame's own body. It is never wrapped,
       transformed or filtered, so the #overlay-portal rule keeps holding by construction rather than
       by discipline. This file therefore carries NO `transform`, `filter`, `backdrop-filter`, `zoom`,
       `perspective`, `contain` or `will-change`, and no element in it is a full-screen overlay.

       That last sentence deliberately does not spell the utility-class pair out: the guard in
       test/overlay-nesting.test.js matches RAW text, comments included, over every `.jsx` in the
       tree. Writing the class names here — even to say the file does not use them — makes that guard
       report this file as an unportalled overlay. It cost one red suite to find out.

   Two layout details that are load-bearing, not decoration:

     1. `boxSizing: "content-box"` on the frame. index.css sets `* { box-sizing: border-box }`
        globally, and this document loads index.css like any other. Under border-box a 1 px frame
        border would come OUT of the declared size and the simulated viewport would silently be
        1278 px wide instead of 1280 — a harness that is wrong by two pixels is still a harness that
        is wrong. The visible hairline is therefore an `outline`, which takes no layout space at all.
     2. `width: max-content` with `minWidth: "100%"` on the shell. The 2560 px frame does not fit on a
        1920 px monitor, and a centred child inside a 100 %-wide flex box gets its overflow CLIPPED on
        the left with no way to scroll to it. Sized to its content, the document scrolls instead. The
        frame is deliberately NOT scaled down to fit: a scaled frame yields resampled screenshots and
        stops being pixel-exact, which is the one thing this tool exists to provide. */

const SHELL = {
  minHeight: "100dvh",
  width: "max-content",
  minWidth: "100%",
  boxSizing: "border-box",
  padding: 16,
  background: "#0c0c10",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const BAR = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".04em",
  color: "#c8c8d0",
};

const FRAME = {
  display: "block",
  flex: "none",
  border: 0,
  boxSizing: "content-box",
  outline: "1px solid #33333e",
  background: "#141419",
};

/* The host device pixel ratio, rounded like the perf readout does — browser zoom otherwise produces
   numbers such as 1.2000000476837158.

   It is shown because the harness explicitly does NOT simulate it (task contract §5.6): the frame
   fixes CSS pixels, device pixels keep following the monitor and the OS scaling. Two screenshots at
   1280×720 taken at different DPR are different images, and without this number nothing on the
   picture would say so. It sits in the outer chrome rather than relying on the perf HUD because that
   HUD only exists while its own toggle is on. */
function hostDpr(win) {
  return Math.round(((win && win.devicePixelRatio) || 1) * 100) / 100;
}

export function TestViewportHarness({ vp }) {
  const src = harnessFrameSrc(import.meta.env.BASE_URL, window.location.search);
  return (
    <div style={SHELL}>
      <div style={BAR}>
        <span style={{ color: "#d4a63a" }}>{t("options.testvp.title")}</span>
        <span>{vp.label}</span>
        <span style={{ opacity: 0.7 }}>· DPR {hostDpr(window)}</span>
        <span style={{ opacity: 0.7 }}>· {t("options.testvp.hint")}</span>
      </div>
      <iframe
        title={t("options.testvp.title")}
        src={src}
        width={vp.w}
        height={vp.h}
        style={{ ...FRAME, width: vp.w, height: vp.h }}
      />
    </div>
  );
}

/* Mounted from main.jsx through a dynamic import so that a production build never reaches this
   module at all — the import sits inside a branch that folds to `false` when VITE_PREVIEW is unset.
   The React root is created HERE rather than being handed in, so main.jsx keeps no static reference
   to the harness.

   The locale is applied first: nothing in this document ever mounts the app, so the caption would
   otherwise fall back to the shipping default while the game inside the frame runs in the player's
   chosen language. Same source as App.jsx uses. */
export function mountTestViewportHarness(rootEl, vp) {
  try { setLocale(loadOptions().lang || undefined); } catch { /* caption language is never critical */ }
  createRoot(rootEl).render(<TestViewportHarness vp={vp} />);
}
