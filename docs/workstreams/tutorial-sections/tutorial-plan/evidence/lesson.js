/* v5 — "kurz und knackig" turned into a measurable form (owner decision, this session).
   A lesson is now three beats: one Satz, one Probierfeld or Bild, one Merksatz. The Satz obeys
   text-style-guide.md §3 literally — one to two sentences, not three.

   Two shells are measured against each other, because a short card changes the question:
     · "top"    — items-start, as the Glossary does on the phone
     · "mitte"  — items-center
   A 638 px card top-aligned looks intentional; a 500 px one leaves a third of the screen black
   below it, and that is what has to be decided by measurement rather than by taste. */
(() => {
  const MODAL_CARD = {
    background:
      "radial-gradient(340px 150px at 50% 0%, rgba(155,130,240,.14), transparent 70%)," +
      "linear-gradient(180deg,#1b1a24,#141019)",
    border: "1px solid #2c2a3a",
  };
  const HEAD_BG = "#1b1a24";
  const HAIRLINE = "linear-gradient(90deg, var(--deck-a1,#26c6e6), var(--deck-a2,#9b82f0), var(--deck-a1,#26c6e6))";
  const ROW_BG = "rgba(15,15,21,.72)";
  const ROW_BORDER = "1px solid rgba(150,150,170,.12)";
  const HAIR = "1px solid rgba(150,150,170,.14)";
  const BTN_PAD = { padding: "11.5px 14px", whiteSpace: "nowrap" };

  const el = (tag, cls, style, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (style) Object.assign(n.style, style);
    if (txt != null) n.textContent = txt;
    return n;
  };

  const satz = (s) => el("p", "tut-beat tut-satz text-body-lg-5",
    { color: "#c8c8d0", lineHeight: "1.5", margin: "0 0 14px" }, s);

  const merksatz = (s) => {
    const w = el("div", "tut-beat tut-merk", { borderTop: HAIR, marginTop: "16px", paddingTop: "12px" });
    w.append(
      el("div", "text-meta-1", { textTransform: "uppercase", letterSpacing: ".18em", fontWeight: "600",
        color: "var(--deck-a1, #8a7de0)", marginBottom: "5px" }, "Merksatz"),
      el("p", "text-body-lg-5", { color: "#e8e8ea", margin: "0", lineHeight: "1.45", fontWeight: "600" }, s),
    );
    return w;
  };

  const probierfeld = (title, hint, readout) => {
    const wrap = el("div", "tut-beat tut-probe", {
      margin: "0 0 14px", padding: "12px 12px 11px", borderRadius: "8px",
      background: ROW_BG, border: ROW_BORDER,
    });
    const row = el("div", "tut-probe-row", { display: "flex", gap: "6px" });
    const vals = [9, 9, 4, 11, 4];
    const cols = ["#c0433f", "#c0433f", "#3f6cc0", "#c0433f", "#3f6cc0"];
    for (let i = 0; i < 5; i++) {
      row.append(el("button", "tut-cell text-body-lg-6", {
        flex: "1 1 0", minWidth: "0", aspectRatio: "0.7", borderRadius: "6px",
        background: "linear-gradient(180deg,#242433,#1a1a26)", border: `1px solid ${cols[i]}`,
        color: "#e8e8ea", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center",
      }, String(vals[i])));
    }
    const out = el("div", "tut-probe-out", {
      marginTop: "10px", paddingTop: "9px", borderTop: HAIR, display: "flex", alignItems: "baseline", gap: "8px",
    });
    out.append(
      el("span", "text-meta-1", { textTransform: "uppercase", letterSpacing: ".14em", color: "#5c5c68" }, "Erkannt"),
      el("span", "text-body-lg-5", { color: "#e8e8ea", fontWeight: "700" }, "Wiederholung (3)"),
      el("span", "text-body-lg-5 ty-num-sm", { color: "#e8e8ea", fontWeight: "700" }, readout),
    );
    wrap.append(
      el("div", "text-meta-1", { textTransform: "uppercase", letterSpacing: ".14em", color: "#5c5c68", marginBottom: "8px" }, title),
      row, out,
      el("div", "text-meta-1", { color: "#71717c", marginTop: "7px", lineHeight: "1.4" }, hint),
    );
    return wrap;
  };

  /* Three beats. The Satz is one sentence of setup; the Probierfeld does the teaching; the Merksatz
     is what you keep. Everything that used to be a fourth and fifth Satz is either cut or is its
     own lesson. */
  const KNACKIG = () => [
    satz("Eine Formation ist ein Muster in deiner Kartenreihenfolge. Erkennt das Spiel eins, multipliziert es den Score."),
    probierfeld("Probierfeld · ein Segment", "Tippe zwei Karten an, um sie zu tauschen.", "×1,50"),
    merksatz("Der Multiplikator zählt nur, wenn du den Stich auch gewinnst."),
  ];

  function build(view) {
    document.getElementById("tut-proto")?.remove();
    const root = el("div", "fixed inset-0 overlay-root", { zIndex: "70" });
    root.id = "tut-proto";
    root.append(el("div", "", { position: "absolute", inset: "0", background: "rgba(6,6,10,.66)", backdropFilter: "blur(2px)" }));
    const frame = el("div", "overlay-safe", {
      position: "absolute", inset: "0", display: "flex",
      alignItems: view === "mitte" ? "center" : "flex-start",
      justifyContent: "center", padding: "12px",
    });
    const card = el("div", "tut-card overlay-card as-panel as-panel-deck", {
      width: "100%", maxWidth: "42rem", display: "flex", flexDirection: "column",
      borderRadius: "16px", overflow: "hidden", position: "relative", maxHeight: "92dvh",
      ...MODAL_CARD, boxShadow: "0 30px 80px -30px #000",
    });
    card.append(el("div", "", {
      position: "absolute", top: "0", left: "0", right: "0", height: "3px", zIndex: "30",
      background: HAIRLINE, opacity: ".85", borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem",
    }));

    const head = el("div", "tut-head", { padding: "14px 16px 10px", flex: "none", borderBottom: "1px solid #2c2a3a", background: HEAD_BG });
    const hrow = el("div", "", { display: "flex", alignItems: "flex-start", gap: "10px" });
    const hcol = el("div", "", { minWidth: "0", flex: "1 1 auto" });
    hcol.append(
      el("div", "text-meta-1", { textTransform: "uppercase", letterSpacing: ".18em", fontWeight: "600",
        color: "var(--deck-a1, #8a7de0)", marginBottom: "3px" }, "Aufstellung"),
      el("h2", "text-title-2", { color: "#e8e8ea", fontWeight: "700", margin: "0", lineHeight: "1.2" }, "Was sind Formationen"),
    );
    hrow.append(hcol, el("button", "as-actbtn as-edge-neutral rounded-lg font-bold text-body-lg-5", { ...BTN_PAD, flex: "none" }, "Schließen"));
    head.append(hrow);

    const scroll = el("div", "tut-scroll overlay-card", {
      flex: "1 1 auto", overflowY: "auto", padding: "14px 16px 16px", overscrollBehavior: "contain",
    });
    for (const b of KNACKIG()) scroll.append(b);

    const foot = el("div", "tut-foot", {
      flex: "none", display: "flex", alignItems: "center", gap: "8px",
      padding: "10px 16px", borderTop: "1px solid #2c2a3a", background: HEAD_BG,
    });
    const next = el("button", "as-actbtn as-edge-strong rounded-lg font-bold text-body-lg-5", BTN_PAD, "Weiter");
    next.style.setProperty("--c", "#d4a63a");
    foot.append(
      el("button", "as-actbtn as-edge-neutral rounded-lg font-bold text-body-lg-5", BTN_PAD, "Zurück"),
      el("div", "text-meta-1 ty-num-sm", { color: "#71717c", flex: "1 1 auto", textAlign: "center" }, "3 / 7"),
      next,
    );

    card.append(head, scroll, foot);
    frame.append(card);
    root.append(frame);
    document.body.append(root);
    return root;
  }

  window.__proto = build;
  window.__measure = () => {
    const r = (n) => { const b = n.getBoundingClientRect(); return { y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
    const q = (s) => document.querySelector("#tut-proto " + s);
    const card = q(".tut-card"), head = q(".tut-head"), scroll = q(".tut-scroll"), foot = q(".tut-foot");
    const cr = card.getBoundingClientRect();
    const beats = [...document.querySelectorAll("#tut-proto .tut-beat")].map((n) => {
      const cs = getComputedStyle(n); const b = n.getBoundingClientRect();
      return { kind: n.className.match(/tut-(satz|bild|probe|merk)/)?.[1] || "?",
        chars: (n.textContent || "").length,
        withMargins: +(b.height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)).toFixed(1),
        bottom: +b.bottom.toFixed(1) };
    });
    return {
      card: r(card), head: r(head), foot: r(foot), scroll: r(scroll),
      contentH: scroll.scrollHeight, visibleH: scroll.clientHeight,
      overflowPx: Math.max(0, scroll.scrollHeight - scroll.clientHeight),
      airAbove: +cr.y.toFixed(1),
      airBelow: +(innerHeight - cr.bottom).toFixed(1),
      airTotal: +(innerHeight - cr.height).toFixed(1),
      cardShareOfScreen: +(cr.height / innerHeight * 100).toFixed(1),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth || scroll.scrollWidth > scroll.clientWidth,
      beats,
      beatsHiddenByFoot: beats.filter((b) => b.bottom > scroll.getBoundingClientRect().bottom).map((b) => b.kind),
      tapsUnder44: [...document.querySelectorAll("#tut-proto button")].map((n) => {
        const b = n.getBoundingClientRect();
        return { label: (n.textContent || "").trim().slice(0, 14), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
      }).filter((t) => t.h < 44 || t.w < 44),
    };
  };
})();
