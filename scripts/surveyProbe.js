/* #viewport-1280 commit 4 — the measurement probe, as source rather than as a string.
   ============================================================================

   REACT-FREE, DOM-FREE AT MODULE SCOPE, and exported as a function that returns its own source. The
   reason is the one testing.md §4 gives: a guard must be able to RECOMPUTE what the probe measures
   instead of restating it. A probe pasted into a template literal inside the runner cannot be unit
   tested, cannot be linted, and its braces cannot be checked by anything but a browser at run time.

   WHAT IT MEASURES is contract §5.3, item for item:

     1. page scrolling, both axes, in pixels;
     2. overflow beyond the panel edge, in pixels, with the offending element;
     3. truncated text — ellipsis with scrollWidth > clientWidth, or an active line-clamp;
     4. elements outside their panel;
     5. text shrinkage — every text node smaller here than the same node at the reference width;
     6. the typography inventory, which is INPUT for a later strand and not a criterion here.

   WHAT A "PANEL" IS, fixed here so every later round measures the same thing (contract §5.3 item 4):
   the nearest ancestor that either carries an `as-panel*` class, or clips with `overflow: hidden`,
   or paints its own background. Fixing it in code rather than in prose is the point — a definition
   that lives in a sentence drifts the first time two people read it.

   NODE IDENTITY ACROSS WIDTHS. Item 5 compares the same node at two viewport widths, so it needs a
   key that survives a re-render. Class names are unusable — commit 2 renamed 135 of them on purpose.
   The key is the structural path from <body>: child index at each level, plus the tag. Two runs of
   the same build produce the same tree, so the same path means the same node. */

export function probeSource() {
  return `(() => {
  const d = document, w = window, el = d.documentElement;
  const r2 = (n) => Math.round(n * 100) / 100;

  /* Structural path from body: "3/1/0:SPAN". Stable across widths, immune to class renames. */
  const pathOf = (node) => {
    const parts = [];
    let n = node;
    while (n && n !== d.body) {
      const p = n.parentElement;
      if (!p) break;
      parts.push(Array.prototype.indexOf.call(p.children, n));
      n = p;
    }
    return parts.reverse().join("/") + ":" + node.tagName;
  };

  /* Contract §5.3 item 4 — the panel definition, in code. */
  const isPanel = (e) => {
    if (!e || e === d.body || e === el) return false;
    if (/(^|\\s)as-panel/.test(e.className && e.className.toString ? e.className.toString() : "")) return true;
    const cs = getComputedStyle(e);
    if (cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowY === "hidden") return true;
    const bg = cs.backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return true;
    if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
    return false;
  };
  const panelOf = (e) => { let p = e.parentElement; while (p && !isPanel(p)) p = p.parentElement; return p || null; };

  /* --- 1. page scrolling, both axes --------------------------------------- */
  const pageScroll = {
    x: Math.max(0, el.scrollWidth - el.clientWidth),
    y: Math.max(0, el.scrollHeight - el.clientHeight),
    clientWidth: el.clientWidth, clientHeight: el.clientHeight,
    scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
  };

  const all = Array.prototype.slice.call(d.body.querySelectorAll("*"));

  /* --- 2 + 4. overflow beyond the panel edge, and elements outside it ------ */
  const overflows = [];
  const outside = [];
  for (const e of all) {
    const p = panelOf(e);
    if (!p) continue;
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const a = e.getBoundingClientRect(), b = p.getBoundingClientRect();
    if (!a.width || !a.height) continue;
    /* A scroller is allowed to hold more than it shows — that is what it is for. Only measure a
       child against a panel edge the panel does not scroll past. */
    const pcs = getComputedStyle(p);
    const scrollsX = pcs.overflowX === "auto" || pcs.overflowX === "scroll";
    const scrollsY = pcs.overflowY === "auto" || pcs.overflowY === "scroll";
    const over = {
      left: b.left - a.left, right: a.right - b.right,
      top: b.top - a.top, bottom: a.bottom - b.bottom,
    };
    const px = Math.max(scrollsX ? 0 : over.left, scrollsX ? 0 : over.right);
    const py = Math.max(scrollsY ? 0 : over.top, scrollsY ? 0 : over.bottom);
    if (px > 1 || py > 1) {
      const rec = { path: pathOf(e), tag: e.tagName, x: r2(px), y: r2(py),
        panel: pathOf(p), box: [r2(a.x), r2(a.y), r2(a.width), r2(a.height)] };
      overflows.push(rec);
      /* "Outside" is the stronger claim: the box does not merely stick out, it starts past the edge. */
      if (a.left >= b.right - 1 || a.right <= b.left + 1 || a.top >= b.bottom - 1 || a.bottom <= b.top + 1) outside.push(rec);
    }
  }

  /* --- 3. truncated text --------------------------------------------------- */
  const truncated = [];
  for (const e of all) {
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
    const ellipsis = cs.textOverflow === "ellipsis" && (cs.overflowX === "hidden" || cs.overflow === "hidden");
    if (!clamp && !ellipsis) continue;
    const cut = ellipsis ? e.scrollWidth > e.clientWidth + 1 : e.scrollHeight > e.clientHeight + 1;
    if (!cut) continue;
    truncated.push({ path: pathOf(e), tag: e.tagName, kind: clamp ? "line-clamp" : "ellipsis",
      shown: r2(ellipsis ? e.clientWidth : e.clientHeight), needed: r2(ellipsis ? e.scrollWidth : e.scrollHeight),
      text: (e.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 60) });
  }

  /* --- 5 + 6. typography: every element that directly carries text --------- */
  const type = [];
  for (const e of all) {
    let hasText = false;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { hasText = true; break; }
    if (!hasText) continue;
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const p = panelOf(e);
    type.push({
      path: pathOf(e), tag: e.tagName,
      size: parseFloat(cs.fontSize), weight: cs.fontWeight, opacity: parseFloat(cs.opacity),
      family: (cs.fontFamily || "").split(",")[0].replace(/["']/g, ""),
      panel: p ? pathOf(p) : null,
      text: (e.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40),
    });
  }

  /* --- targeted: the sites planning-report §1.5 predicted ------------------
     Generic counts say a surface is in trouble; these say WHICH construction is. Each entry is read
     only when present, so a surface that does not carry the selector simply has no row rather than a
     null that later reads as a measurement. */
  const TARGETS = [
    [".hub-pair", ["zoom", "width"]],                     // §1.5 row 9
    [".up-head", ["--as-corner-lane"]],                   // §1.5 row 10
    [".cz-head", ["--as-corner-lane"]],
    [".op-head", ["--as-corner-lane"]],
    [".gd-page", ["--gs", "font-size"]],                  // §1.5 row 2
    [".up-vgrid", ["grid-template-columns"]],             // §1.5 row 6
    [".up-facbody", ["grid-template-columns"]],           // §1.5 row 7
    [".cz-split", ["grid-template-columns"]],             // §1.5 row 3
    [".cz-shotlab", ["grid-template-columns", "width"]],
    [".st-readout", ["grid-template-columns"]],           // §1.5 row 4
    [".lb-page", ["grid-template-columns"]],              // §1.5 row 5
    [".lb-body", ["grid-template-columns"]],
    [".fb-form", ["grid-template-columns"]],              // §1.5 row 7
    [".gd-desk", ["grid-template-columns"]],
    [".gl-desk", ["grid-template-columns"]],
    [".lv-rig", ["grid-template-columns"]],               // §1.5 row 11
  ];
  const targets = {};
  for (const [sel, props] of TARGETS) {
    const e = d.querySelector(sel);
    if (!e) continue;
    const cs = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    const rec = { box: [r2(b.x), r2(b.y), r2(b.width), r2(b.height)] };
    for (const p of props) rec[p] = p.startsWith("--") ? cs.getPropertyValue(p).trim() : cs[p] || cs.getPropertyValue(p);
    targets[sel] = rec;
  }

  return { pageScroll, overflows, outside, truncated, type, targets,
    nodeCount: all.length, zoom: getComputedStyle(d.body).zoom || "1" };
})()`;
}
