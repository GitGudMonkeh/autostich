import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import { drawEdgeGlow } from "./cardFx/edgeGlow.js";
import { drawHolo } from "./cardFx/holo.js";
import { createGlitch } from "./cardFx/glitch.js";

/* CardFxStage (#318) — EINE geteilte Pixi-Overlay-Bühne ÜBER den Karten (z>10) für die stapelbaren
   Karten-Dauer-Layer (Edge-Glow · Holo-Sweep · später Glitch) und die Materialize-Reveal-Transition.
   Zeichnet pro Karten-Rechteck (Spieler- UND Gegnerkarte) an deren Bildschirm-Box, relativ zu `panelRef`
   — Vorbild ist der Blitzrahmen (IonStorm) und die Feuer-Glut (FireBurn), NICHT ein Canvas pro Karte.

   Aufbau pro Karte: ein Container (auf die Kartenbox positioniert) mit einer additiven Graphics je Layer.
   Holo hat zusätzlich eine Rounded-Rect-MASKE (auf die Kartenform), da das Band die Box quer überdeckt.

   Sauberkeit (wie IonStorm):
   - EINE `Application`, additive Blends (`blendMode="add"`), DPR ≤ 2, KEIN shadowBlur / KEIN Custom-Shader
     (Custom-Shader rendern auf dem Mobile-Setup nicht — Holo läuft daher aus additiven Graphics-Streifen).
   - Ticker läuft NUR, wenn mindestens ein Layer aktiv, mindestens eine Karte sichtbar UND der Tab sichtbar ist.
   - Pixi v8 init ist async → `disposed`-Guard; Cleanup zerstört die App (Container/Graphics hängen dran).
   - Gate am Mount-Ort (Preview/Dev) → Produktion lädt kein Pixi (Ziel des Pixi-Umbaus: DOM-Effekte vermeiden).

   Renderreihenfolge pro Karte (unten→oben): Edge-Glow · Holo-Sweep · (Glitch). Materialize (Layer 4, Reveal-
   Transition) dockt später an und reicht seinen Build-Fortschritt nach außen, damit der Blitzrahmen (IonStorm)
   MIT der Karte erscheint statt vor ihr.

   Hinweis Overlay-Grenze: Holo liegt konzeptionell „unter der Zahl" — die Zahl ist DOM (z-2 der Karte), das
   Overlay-Canvas liegt darüber (z-11). Das Band wandert additiv über die (hohle Neon-)Zahl; das ist bewusst so,
   weil ALLE performance-lastigen Layer auf EINE GPU-Bühne sollen. Ebenso ist `tilt.karte` (echter Kartenkipp)
   hier nicht umgesetzt — das bräuchte einen Transform auf dem DOM-Karten-Wrapper. */

// [TUNING] Tier-Multiplikator (Stufen 0–4, aus fxIntensity) — skaliert die Intensität der Dauer-Layer (#318).
const TIER_MUL = [0.55, 0.72, 0.88, 1.0, 1.18];
const CARD_CORNER = 12; // rounded-xl der Karte (Maskenradius, CSS-px)

// "#rrggbb"/"#rgb" → 0xRRGGBB (Fallback bei Unfug).
const colNum = (hex, fb = 0x5a8ade) => {
  const h = String(hex || "").replace("#", "");
  if (!h) return fb;
  const v = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return Number.isFinite(v) ? v : fb;
};

export function CardFxStage({
  panelRef,
  cards = [],                 // [{ ref, active }] — je Karte ein DOM-Ref (Box) + ob sie gerade Effekte tragen soll
  layers = {},                // { edgeGlow?, holo?, glitch? } — welche Layer an sind
  color = "#5a8ade", color2 = null,
  tier = 0, reduced = false, lite = false,
}) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const nodesRef = useRef([]);           // je Karte { grp, edge, holo, holoMask } (Index-gleich zu `cards`)
  const clockRef = useRef({ t: 0 });
  const tiltRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });  // geglätteter Tilt (x,y) + Zielwerte (tx,ty) aus Pointer/Gyro
  const applyRunRef = useRef(null);
  // Live-Props für den Ticker spiegeln (App wird nur EINMAL gebaut).
  const stateRef = useRef(null);
  stateRef.current = {
    panelRef, cards, layers,
    colInt: colNum(color),
    col2Int: color2 != null ? colNum(color2, colNum(color)) : null,
    tierMul: TIER_MUL[Math.max(0, Math.min(TIER_MUL.length - 1, tier | 0))],
    reduced, lite,
    anyLayer: !!(layers && (layers.edgeGlow || layers.holo || layers.glitch)),
    anyActive: (cards || []).some((c) => c && c.active),
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();

    // Layer-Gruppe für Karten-Index i sicherstellen (lazy): Container + additive Graphics je Layer (+ Holo-Maske).
    const ensureNode = (i) => {
      let node = nodesRef.current[i];
      if (!node && appRef.current) {
        const grp = new Container();
        const edge = new Graphics(); edge.blendMode = "add";
        const holo = new Graphics(); holo.blendMode = "add";
        const holoMask = new Graphics();
        grp.addChild(edge, holo, holoMask);
        holo.mask = holoMask;
        appRef.current.stage.addChild(grp);
        node = { grp, edge, holo, holoMask, glitch: null };
        nodesRef.current[i] = node;
      }
      return node;
    };
    // Glitch ist teurer (RenderTexture + Sprite-Pool) → erst bei Bedarf bauen; liegt ÜBER Holo (Reihenfolge).
    const ensureGlitch = (node) => {
      if (!node.glitch && appRef.current) { node.glitch = createGlitch(appRef.current); node.grp.addChild(node.glitch.root); }
      return node.glitch;
    };
    const clearNode = (n) => { if (n) { n.edge.clear(); n.holo.clear(); n.holoMask.clear(); n.glitch?.clear(); } };
    const clearAll = () => { for (const n of nodesRef.current) clearNode(n); };

    const tick = (ticker) => {
      const st = stateRef.current;
      const panel = st.panelRef?.current;
      if (!panel || !st.anyLayer) { clearAll(); return; }
      const pr = panel.getBoundingClientRect();
      const dtMs = ticker.deltaMS;
      clockRef.current.t += dtMs;
      const tSec = clockRef.current.t / 1000;
      // Tilt glätten (Pointer/Gyro-Ziel → geglätteter Wert).
      const tl = tiltRef.current;
      tl.x += (tl.tx - tl.x) * 0.08;
      tl.y += (tl.ty - tl.y) * 0.08;

      const list = st.cards || [];
      for (let i = 0; i < list.length; i++) {
        const node = ensureNode(i);
        if (!node) continue;
        const c = list[i], el = c?.ref?.current;
        if (!el || !c.active) { clearNode(node); continue; }
        // #318 Pro-Karte-Layer (optional): erlaubt z. B. eine Deck-Slot-Karte, die NUR Edge-Glow trägt (Puls-Rahmen
        // auch auf dem liegenden Deck / der Rückseite), während die gespielte Karte Holo/Glitch trägt.
        const cl = c.layers || st.layers;
        const cr = el.getBoundingClientRect();
        const w = cr.width, h = cr.height;
        if (w < 8 || h < 8) { clearNode(node); continue; }
        // Container panel-lokal auf die Kartenbox setzen; Layer zeichnen in lokalen 0..w/0..h-Koordinaten.
        node.grp.position.set(cr.left - pr.left, cr.top - pr.top);
        const sc = h / 360;   // Board-Raum HREF=360 → echte Kartenhöhe (nur px-Maße; relative Maße bleiben unskaliert)
        const p = { color: st.colInt, color2: st.col2Int, tierMul: st.tierMul, reduced: st.reduced, lite: st.lite };

        // Dauer-Layer (unter der Zahl bzw. über der Textur).
        node.edge.clear();
        node.holo.clear(); node.holoMask.clear();
        if (cl.edgeGlow) drawEdgeGlow(node.edge, w, h, sc, p, tSec);
        if (cl.holo) {
          node.holoMask.roundRect(0, 0, w, h, CARD_CORNER).fill(0xffffff);
          drawHolo(node.holo, w, h, sc, p, tSec, tl);
        }
        if (cl.glitch) {
          ensureGlitch(node).update(w, h, sc, p, tSec, { num: c.num, color: c.color });
        } else if (node.glitch) node.glitch.clear();
      }
    };

    app.init({
      canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance",
    }).then(() => {
      if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
      appRef.current = app;
      canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
      host.appendChild(canvas);
      app.ticker.add(tick);
      applyRun();
    }).catch(() => { /* WebGL fehlt → Overlay bleibt leer, Spiel läuft normal weiter */ });

    function applyRun() {
      const a = appRef.current;
      if (!a) return;
      const st = stateRef.current;
      const run = st.anyLayer && st.anyActive && document.visibilityState !== "hidden";
      if (run) a.ticker.start();
      else { a.ticker.stop(); clearAll(); }
    }
    applyRunRef.current = applyRun;

    // Tilt-Eingabe (geteilt für beide Karten): Pointer am Desktop, Gyro am Handy. Nur Ziele setzen — Glättung im Ticker.
    const onPointer = (e) => { const t = tiltRef.current; t.tx = (e.clientX / (window.innerWidth || 1)) * 2 - 1; t.ty = (e.clientY / (window.innerHeight || 1)) * 2 - 1; };
    const onOrient = (e) => { const t = tiltRef.current; if (e.gamma != null) t.tx = Math.max(-1, Math.min(1, e.gamma / 45)); if (e.beta != null) t.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 45)); };
    const onVis = () => applyRun();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onOrient, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrient);
      document.removeEventListener("visibilitychange", onVis);
      for (const n of nodesRef.current) {
        if (n?.glitch) { try { n.glitch.destroy(); } catch { /* ignore */ } }
      }
      const a = appRef.current; appRef.current = null; nodesRef.current = [];
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
    // App EINMAL bauen; Layer/Params/Position kommen über Refs bzw. den Lauf-Effekt.
  }, []);

  // Lauf-Zustand bei Prop-Wechseln spiegeln (idempotent: start/stop nach anyLayer && anyActive && sichtbar).
  useEffect(() => { applyRunRef.current?.(); });

  return (
    <div ref={hostRef} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />
  );
}
