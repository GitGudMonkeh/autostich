/* #menu-rework M1 — the SURFACE probe, the instrument the zero-delta gate needs.
   ============================================================================

   WHY A SECOND PROBE. `surveyProbe.js` measures geometry and typography: page scrolling, overflow,
   truncation, and the size/weight of every text node. That is the right instrument for the two
   strands that built it (#viewport-1280, #typo-system), and it is BLIND to exactly the four axes
   this round converts — background, border, radius, elevation. Running the existing survey before
   and after a fill changes from `#1b1a24` to `var(--sf-head)` would report zero deltas whether the
   token resolved correctly or not at all.

   A gate that cannot fail is not a gate. M1's acceptance criterion is "zero computed deltas", and
   this file is what makes that claim falsifiable.

   ADDITIVE, NOT A REWRITE. `surveyProbe.js` is shared with #viewport-1280 and its output shape is
   committed evidence in that workstream. This probe writes to its own key (`surface`) in the same
   cell, so an older matrix.json simply has no such key and nothing that reads the old shape moves.

   NODE IDENTITY is the same structural path `surveyProbe.js` uses, and for the same reason: class
   names are the thing under change, so they cannot be the key.

   ONLY INTERESTING ELEMENTS. Recording twelve properties for every node in the tree would produce
   evidence measured in hundreds of megabytes and drown the signal. An element is interesting when it
   paints something on one of the four axes — a fill, a visible border, a radius, a shadow — or when
   it carries padding. Everything else has no surface to move. The filter is deliberately generous:
   a false positive costs a line of JSON, a false negative costs the gate.

   NO BACKTICKS BELOW THIS LINE inside the returned source. The probe is a template literal; a
   backtick in a comment inside it ends the literal and the file stops parsing. Learned once. */

export function surfaceProbeSource() {
  return `(() => {
  const d = document;
  const r2 = (n) => Math.round(n * 100) / 100;

  /* Structural path from body: "3/1/0:SPAN". Same key surveyProbe.js uses. */
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

  const SIDES = ["Top", "Right", "Bottom", "Left"];
  const four = (cs, pre, post) => SIDES.map((s) => cs[pre + s + (post || "")]).join(" ");

  /* The four axes, plus the box that carries them, plus opacity and colour. Outline is in because
     the focus ring is drawn with it, and a token pass can move one without touching a border. */
  const read = (e) => {
    const cs = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    return {
      p: pathOf(e),
      bg: cs.backgroundColor,
      bi: cs.backgroundImage,
      bo: cs.backgroundOrigin + "|" + cs.backgroundClip + "|" + cs.backgroundSize,
      bc: four(cs, "border", "Color"),
      bw: four(cs, "border", "Width"),
      bs: four(cs, "border", "Style"),
      rd: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(" "),
      sh: cs.boxShadow,
      pd: four(cs, "padding"),
      ol: cs.outlineWidth + " " + cs.outlineStyle + " " + cs.outlineColor,
      op: cs.opacity,
      cl: cs.color,
      box: [r2(b.x), r2(b.y), r2(b.width), r2(b.height)],
    };
  };

  const paints = (r) =>
    (r.bg && r.bg !== "rgba(0, 0, 0, 0)" && r.bg !== "transparent")
    || (r.bi && r.bi !== "none")
    || (r.sh && r.sh !== "none")
    || r.bw !== "0px 0px 0px 0px"
    || r.rd !== "0px 0px 0px 0px"
    || r.pd !== "0px 0px 0px 0px"
    || (r.ol && r.ol.indexOf("none") === -1);

  const out = [];
  const all = Array.prototype.slice.call(d.body.querySelectorAll("*"));
  for (const e of all) {
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = read(e);
    if (paints(r)) out.push(r);
  }

  /* The vocabulary itself, read off :root. If a token silently fails to reach the stylesheet — the
     Tailwind theme block prunes it, a typo, the wrong block — every consumer falls back, and the
     cell says so in one line instead of as a hundred scattered deltas. */
  const TOKENS = ["--sf-sunken", "--sf-base", "--sf-head", "--sf-deep", "--sf-raised", "--sf-glass",
    "--sf-ground", "--sf-head-fade", "--sf-scrim", "--sf-scrim-desk", "--sf-deck", "--sf-cone-modal",
    "--ed-deck-panel", "--ctl-off", "--ctl-off-alt", "--ctl-edge", "--ctl-knob", "--ctl-face",
    "--ctl-face-on", "--ctl-chip", "--ctl-danger", "--ctl-danger-wash",
    "--sf-cone-w", "--sf-cone-w-phase", "--sf-cone-h", "--sf-cone-stop", "--sf-cone-a", "--sf-cone-a-quiet",
    "--ed-quiet", "--ed-base", "--ed-strong", "--ed-deck", "--ed-accent-a", "--ed-accent-a-quiet",
    "--el-flat", "--el-rest", "--el-float", "--el-modal", "--el-glow", "--el-halo-blur", "--el-halo-a",
    "--rd-sm", "--rd-md", "--rd-lg", "--rd-shell",
    "--in-tight", "--in-snug", "--in-base", "--btn-pad-y", "--btn-pad-x",
    "--hl-deck", "--hl-phase", "--hl-accent-a", "--ui-scale"];
  const rootCs = getComputedStyle(d.documentElement);
  const tokens = {};
  for (const t of TOKENS) {
    const v = rootCs.getPropertyValue(t).trim();
    if (v) tokens[t] = v;
  }

  return { surface: out, tokens };
})()`;
}
