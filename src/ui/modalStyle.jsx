// Einheitliche Modal-/Menü-Bildsprache des Hubs (Design-Sweep, Variante C).
// Verlaufs-Hintergrund + weicher Violett-Glow oben + Rahmen; dazu die Gradient-Haarlinie (Cyan→Violett→Amber).
// EINE Quelle → hier justieren, überall wirkt es. Felder/Layout der Screens bleiben unberührt.

/* #menu-rework M1 — THIS FILE HOLDS SHAPES, NOT VALUES.
   ============================================================================
   Every colour, fill, border, shadow, radius and inset below is a var(--token)
   resolved in the panel vocabulary block of src/index.css. Nothing here decides
   what a surface LOOKS like any more; it decides which surface a thing IS.

   WHY THAT MATTERS BEYOND TIDINESS. These constants are set INLINE, and an
   inline literal beats every stylesheet rule — which is why the desktop pass had
   to reach for `!important` to make a flat variant win, and why one such block
   is deleted in the same commit as this conversion. An inline `var()` does not
   have that problem: the rule redefines the PROPERTY on the element and the
   inline declaration picks up the new value, cascade intact. Measured, three
   cases, planning report 2.1.

   THE PARAMETERISATION STAYS. `phaseCard(accent, base, {quiet})` is still a
   function: six accents x two volumes x two bases is 24 static classes for what
   is one call here, and `quiet` is a documented desktop decision (#lv-ruhe), not
   an accident. Flattening it into classes was considered and rejected.

   HOW AN ACCENT REACHES A TOKEN — and the answer is that it cannot, which cost a
   capture run to establish. MEASURED: a custom property that references another
   custom property is substituted on the element that DECLARES it, and the
   resolved string then inherits. A `--sf-cone` declared at :root reading
   `var(--ac-rgb)` therefore freezes the violet fallback, and a phase card setting
   `--ac-rgb` on itself arrives far too late to change it. (Planning report 2.1
   case B is untouched by this: redefining a FLAT property on the element works,
   and .cz-stage still relies on it.)

   So the accent-coloured values decompose. Every LENGTH and every ALPHA is a
   token in index.css; the only thing assembled here is the colour — which is the
   PHASE_ACCENTS exemption below, so nothing new leaks in. `--ac-rgb` is still set
   on the element: it is correct data, and it is what a role class WOULD read if
   one is ever added to the call sites (that is the shape that works — declaring
   the composite on a class the element carries).

   PHASE_ACCENTS IS THE ONE EXEMPTION and it is not laziness. `.c` is handed to
   LevelupWings.jsx, which builds an 8-digit hex by concatenation (`${accent}4d`);
   `var(--ac-red)4d` is not a colour. Two more screens build an accent object from
   game data at runtime (SkillSelect/LegendarySelect pass the faction colour), so
   the field has to stay a plain string either way. The six colours are mirrored
   as --ac-* in index.css for the CSS side; collapsing the two halves needs
   LevelupWings.jsx, which belongs to the battle session. Recorded in
   conventions.md 2c under what is permanently exempt.
   ============================================================================ */

export const MODAL_CARD = {
  background: "var(--sf-cone-modal), var(--sf-raised)",
  border: "1px solid var(--ed-base)",
};

// Neutrales Menü-Panel im neuen Design (Stats/Analyse/Listen-Kacheln etc.): flacher dunkler Grund + weicher
// violett-tendierter Rahmen. KEIN Glow, kein Farb-Tint (wirkte „billig ad-game") — nur der crispe Rahmen macht
// die einheitliche gerahmte Bildsprache. Neutral (keine Akzentfarbe) → überall gleich einsetzbar.
export const MENU_PANEL = {
  background: "var(--sf-sunken)",
  border: "1px solid var(--ed-strong)",
};

// #deckui: Die Modal-Haarlinie zieht jetzt DURCHGEHEND die aktive Deckfarbe (--deck-a1/--deck-a2, an .app-root gesetzt,
//   auch außerhalb eines Laufs). Fallback = der alte Logo-Verlauf (Cyan→Violett), falls kein Deck aktiv ist. Gilt für ALLE
//   Menü-Overlays über ModalHairline/TopHairline (Optionen, Bestenliste, Upgrade, Werkstatt, GameOver, Glossar, Stats …).
//   Die IN-RUN-Phasenleiste (PhaseHairline unten) ist bewusst ENTKOPPELT — dort bleibt der feste Verlauf.
export const HAIRLINE = { background: "var(--hl-deck)", opacity: 0.85 };
// Fester Verlauf NUR für die In-Run-Phasenleiste (Skill/Perk/Legendär/Ziel/Gletscher) — „was während man spielt" behält
//   sein eigenes Farbsystem, nicht die Deckfarbe.
const PHASE_HAIRLINE_BG = "var(--hl-phase)";

// Die 3px-Gradient-Haarlinie als eigenes, nicht-scrollendes Element (als erstes Kind der Karte platzieren).
// `className` ist die Andockstelle für den Desktop-Pass: dort wandert die Linie per `order` unter den
// Kopf (Zeile 2 des Kopf-Rasters, wie `.up-hair` im Upgrade-Baum) — ohne dass die Handy-Fassung, in der
// sie das erste Kind der Karte ist, dafür angefasst werden muss.
export function ModalHairline({ className = "" }) {
  return <div className={`h-[3px] w-full shrink-0 ${className}`} style={HAIRLINE} aria-hidden="true" />;
}

// Variante für scrollende Karten mit STICKY Kopf: die Haarlinie absolut an den oberen Rand des (relative gesetzten,
// voll-breiten -mx) Sticky-Kopfs hängen → bleibt beim Scrollen oben, wird von den runden Kartenecken sauber geklippt.
export function TopHairline() {
  // eigene runde Oberecken (--rd-shell) → passt sich auch bei Karten OHNE overflow-clip sauber der Ecke an.
  return <div className="absolute top-0 left-0 right-0 h-[3px] z-30" style={{ ...HAIRLINE, borderTopLeftRadius: "var(--rd-shell)", borderTopRightRadius: "var(--rd-shell)" }} aria-hidden="true" />;
}

// Sticky-Kopf-Hintergrund = oberster Stopp des Karten-Verlaufs → nahtloser Übergang (kein Panel-Seam).
/* #menu-rework M1: that identity is now machine-true rather than commented — --sf-head IS the
   opening stop of --sf-raised, so the two cannot drift apart in a later edit. */
export const STICKY_HEAD_BG = "var(--sf-head)";

// In-Run-Overlays (Skill-/Perk-/Legendär-Wahl, Formation, Ziel-Auswahl …): NUR die flache Panel-Füllung auf einen
// gemeinsamen Menü-Familien-Ton ziehen. KEIN Rahmen/Haarlinie/Glow, Ränder + Skill-/Perk-/Gebäude-/Kartenfarben bleiben.
export const PANEL_BG = "var(--sf-head)";

/* Gemeinsame In-Run-Panel-Schale: StatusBar · Battlefield · Fraktions-Panels · Analyse · Build teilen dieselbe
   Verlaufsfläche + denselben Rahmen, damit der Spielscreen als EIN System liest (statt flachem #17171c/#14131c-Mix
   wie bisher). Akzent (Fraktionsfarbe) + dynamische Sieg-/Krit-Aura liegen weiterhin oben drauf. */
// #356: deck-getönter Rahmen für die NEUTRALEN Struktur-Panels (StatusBar/StatusRail/Build/Formation/IndicatorPanel).
// Auflösung in index.css (--deck-border = color-mix aus der Deckfarbe --deck-a1, am Run-Container gesetzt, + dunklem
// Grund). Ohne --deck-a1 (Menü/deckloser Fallback) bleibt ein neutraler Grauton. Fraktions-/Zustands-gefärbte Rahmen
// nutzen das bewusst NICHT (die kodieren Bedeutung). Deck-Anteil (45 %) in index.css tunebar. [TUNING]
export const DECK_BORDER = "var(--deck-border)";
export const PANEL_CARD = {
  background: "var(--sf-raised)",
  border: `1px solid ${DECK_BORDER}`,
};

/* ---- Phasen-Schale (In-Run-Overlays an die Hub-Bildsprache angeglichen) ----
   Die Phasen behalten ihre Farb-Identität (Perk rot, Skill violett, Aufstellung/Ziel grün, Gletscher eisblau,
   Legendär gold, Architekt blau); der Skin macht sie zur Familie, ohne sie gleichzuschalten. NUR die Schale
   (Hintergrund/Rahmen/Schein + gemeinsame Tri-Color-Haarlinie) kommt von hier — das Innenleben der Screens
   (Grids, Karten, Buttons, Klappfelder) bleibt unverändert. */
/* #menu-rework M1: literals on purpose — see the head of this file. `.c` is concatenated into
   8-digit hex elsewhere, and two screens build the same shape from game data at runtime. The CSS
   counterpart is --ac-* in index.css. */
export const PHASE_ACCENTS = {
  violet: { c: "#9b82f0", rgb: "155,130,240" },
  green:  { c: "#5ab87a", rgb: "90,184,122" },
  ice:    { c: "#7fdcff", rgb: "127,220,255" },
  gold:   { c: "#d4a63a", rgb: "212,166,58" },
  blue:   { c: "#3b7dbe", rgb: "59,125,190" },
  red:    { c: "#e05555", rgb: "224,85,85" }, // #301 Challenge-Modus
};
// Schalen-Style: Akzent-Glow oben + Verlaufsfläche + Akzent-Rahmen + weicher Außenschein. `base` = Verlaufs-
// Grundtöne (Default = Menü-Familienton; der Architekt reicht seinen blauen Grund durch).
export function phaseCard(accent, base = ["var(--sf-head)", "var(--sf-deep)"], { quiet = false } = {}) {
  /* #lv-ruhe: `quiet` ist die Desktop-Fassung — dieselbe Karte, leiser gestellt. Drei Griffe, alle in
     dieselbe Richtung: der farbige Außenschein fällt ganz weg (der dunkle Schlagschatten bleibt, er trägt
     die Ablösung vom Brett), der Rahmen geht von 42 % auf 18 % Deckkraft, und der Lichtkegel am Kopf von
     14 % auf 6 %. Es ist derselbe Schalter wie `as-ring-quiet` in der Werkstatt (#cz-ruhe): EINE Fassung
     mit einem Schalter statt zweier Karten, die auseinanderlaufen.
     Bewusst ein Parameter und keine CSS-Regel: die Karte setzt ihren Stil INLINE, eine Regel bräuchte
     `!important` an drei Eigenschaften und würde beim nächsten Blick wie ein Notnagel aussehen. */
  /* #menu-rework M1: the three handles are token pairs now (--sf-cone/-quiet, --ed-accent/-quiet,
     and --el-halo, which `quiet` drops entirely). The steps are named in the vocabulary instead of
     being counted out here, so "quieter" is a choice between two named things rather than three
     numbers someone has to keep in step. */
  const rgb = accent.rgb;
  return {
    "--ac-rgb": rgb,   // correct data at the element; see the file header for why nothing reads it yet
    background:
      `radial-gradient(var(--sf-cone-w-phase) var(--sf-cone-h) at 50% 0%,` +
      `rgba(${rgb},${quiet ? "var(--sf-cone-a-quiet)" : "var(--sf-cone-a)"}), transparent var(--sf-cone-stop)),` +
      `linear-gradient(180deg,${base[0]},${base[1]})`,
    border: `1px solid rgba(${rgb},${quiet ? "var(--ed-accent-a-quiet)" : "var(--ed-accent-a)"})`,
    boxShadow: quiet ? "var(--el-modal)"
      : `0 0 var(--el-halo-blur) rgba(${rgb},var(--el-halo-a)), var(--el-float)`,
  };
}
// Inneres Struktur-Panel in der Phasen-Identitätsfarbe rahmen (Gegenstück zu UpgradeScreen.panelStyle, hier
// geteilt): NUR ein crisper farbiger Rahmen auf flachem `base`-Grund — kein Glow, kein Farb-Tint innen (clean).
// NUR für NEUTRALE Struktur-Boxen (Stat-Readouts, Board-/Assistent-Container) gedacht — bedeutungscodierte Ränder
// (Rarität/Fraktion/Eis/Zustand) bleiben unberührt. `accent` = PHASE_ACCENTS-Eintrag; `base` = flacher Grundton
// (Default Menü-Familienton; der Architekt reicht seinen blauen Grund durch).
export function phasePanel(accent, base = "var(--sf-ground)") {
  const rgb = accent.rgb;
  return {
    "--ac-rgb": rgb,
    background: base,
    border: `1px solid rgba(${rgb},var(--ed-accent-a))`,
  };
}

/* Haarlinie bündig an der oberen Kante der Phasen-Karte. ABSOLUT positioniert (außerhalb des Flusses),
   damit sie den Kopfinhalt NICHT nach oben zieht — die Karte behält ihr volles oberes Padding. Die Karte muss
   `relative` sein; die runden Ecken klippen die Linie (overflow-y-auto ⇒ auch x).

   `accent` (ein PHASE_ACCENTS-Eintrag) färbt die Linie in die IDENTITÄTSFARBE der Phase, statt den festen
   Tri-Color-Verlauf zu ziehen: Rahmen, Überschrift und Balken der Karte sagen dann dasselbe. Ohne `accent`
   bleibt der alte Verlauf — die Phasen, die ihn noch tragen, sollen sich beim Umstellen nicht heimlich
   mitverändern. Der Verlauf entsteht aus EINER Farbe (halbtransparent → voll → halbtransparent), damit der
   Balken seine Silhouette behält und nicht zum flachen Strich wird; `rgb` liegt in PHASE_ACCENTS ohnehin
   bereit, es braucht also keine Farbrechnung zur Laufzeit. */
export function PhaseHairline({ className = "", accent = null }) {
  const bg = accent
    ? `linear-gradient(90deg, rgba(${accent.rgb},var(--hl-accent-a)), rgb(${accent.rgb}), rgba(${accent.rgb},var(--hl-accent-a)))`
    : PHASE_HAIRLINE_BG;
  return <div aria-hidden="true" className={`absolute top-0 left-0 right-0 z-20 ${className}`}
    style={{ height: 3, ...(accent ? { "--ac-rgb": accent.rgb } : null), background: bg,
      opacity: 0.9, borderTopLeftRadius: "var(--rd-shell)", borderTopRightRadius: "var(--rd-shell)" }} />;
}

/* #362 — EINHEITLICHE Aktionsleiste (sticky OBEN). EINE Quelle für die Button-Zone aller Panels/Modals: feste
   Position (oben, schwebt beim Scrollen mit), feste Reihenfolge (sekundär/ablehnen LINKS · primär/bestätigen RECHTS),
   einheitliche Farben + Standard-Beschriftungen. Ersetzt die zuvor pro Panel selbstgebaute (teils unten liegende) Zone.

   `ActionBar` = der sticky Container. `pad` muss zum horizontalen Padding der umgebenden Karte passen (Bleed = negatives
   Margin, damit die Leiste über die volle Kartenbreite läuft und durchscrollende Inhalte maskiert). `bg` = Füllung
   (PANEL_BG für Phasen-Overlays, STICKY_HEAD_BG für Modal-Screens). Kinder frei anordnen (mit `flex-1`/Spacer).

   `flex-wrap` ist NICHT kosmetisch: die Buttons tragen `whitespace-nowrap`, ihre Mindestbreite ist also die volle
   Textbreite, und Flex-Kinder schrumpfen per Default nicht unter min-content. Auf einem 412-px-Handy passte
   „↻ Neu würfeln (1)" + „Keinen Legendär — Skill wählen" damit nicht mehr nebeneinander (405 px Inhalt in 378 px
   Karte) — und weil die Karte `overflow-y-auto` hat, wird ihr overflow-x automatisch zu `auto`: der zweite Button
   war am Kartenrand abgeschnitten und die Karte horizontal scrollbar. Mit Umbruch rutscht er auf eine zweite Zeile.
   Passt alles in eine Zeile, ändert `flex-wrap` nichts — Desktop bleibt unberührt. */
const ACTIONBAR_BLEED = {
  3: "-mx-3 px-3", 4: "-mx-4 px-4", 5: "-mx-5 px-5", 6: "-mx-6 px-6",
  "5s6": "-mx-5 sm:-mx-6 px-5 sm:px-6", // Karte mit px-5 sm:px-6
};
export function ActionBar({ pad = 5, bg = PANEL_BG, top = 0, border = true, className = "", children }) {
  return (
    <div className={`sticky z-20 ${ACTIONBAR_BLEED[pad] || ACTIONBAR_BLEED[5]} pt-2.5 pb-2.5 mb-3 flex flex-wrap items-stretch gap-2 ${className}`}
      style={{ top, background: bg, ...(border ? { borderBottom: "1px solid var(--ed-quiet)" } : null) }}>
      {children}
    </div>
  );
}

/* Standard-Aktions-Button. `kind`: primary (bestätigen) · secondary (schließen/abbrechen) · reroll (neu würfeln) ·
   decline (ablehnen) · danger (beenden/löschen). `flex` → nimmt gleichen Raum ein (nebeneinander).

   #kante: Seit 17.08.2026 trägt jede Sorte die Optik „Kante statt Fläche" aus index.css statt eigener
   Inline-Farben — dunkler Grund, EIN Farbsignal als linke Kante. Vorher war `primary` eine gefüllte
   Goldtaste und die übrigen Sorten dünn umrandete Kästen; nebeneinander riefen die alle gleich laut.
   Jetzt entscheidet die Klasse über die Lautstärke:
     primary/reroll → as-edge-strong (Gold)  = das Ziel der Phase, einziger mit Glow
     danger         → as-edge (Rot), leiser  = die Abrissbirne, kein Angebot
     secondary/decline → as-edge-neutral     = Ausweg, ohne Farbsignal
   Deaktiviert bleibt bewusst flach grau: kein Signal, keine Kante, nichts zu holen. */
/* `as-actbtn` ist der stabile Haken der Sorte — ohne ihn ist ein `ActionButton` im Stylesheet nicht
   adressierbar (die übrigen Klassen sind Utilities und stehen genauso an fremden Knöpfen). Gebraucht
   seit #eckig, das den Radius aller Bestätigen-/Schließen-Knöpfe an EINER Stelle setzt. */
/* #menu-rework M1: radius and padding stood in this string as utilities (`rounded-lg px-4 py-2.5`),
   which made them values at the call site. They read --rd-md / --btn-pad-* from index.css now.
   TWO handles, not one, and the split is measured rather than tidy: `as-actbtn` is the #eckig RADIUS
   handle and GameOver.jsx hangs it on three buttons it builds BY HAND, two of which have no
   horizontal padding at all. Padding on the shared handle silently gave those three 16px they never
   had (finding MENU-16), so padding rides on `as-actbtn-pad`, which only this component emits. */
const ACTIONBTN_BASE = "as-actbtn as-actbtn-pad font-bold text-body-lg-5 whitespace-nowrap transition-all";
const ACTIONBTN_KIND = {
  primary: { cls: "as-edge-strong", c: "var(--ac-gold)" },
  reroll:  { cls: "as-edge-strong", c: "var(--ac-gold)" },
  danger:  { cls: "as-edge",        c: "var(--ac-danger)" },
  decline: { cls: "as-edge-neutral" },
};
export function ActionButton({ kind = "secondary", onClick, disabled = false, flex = false, title, className = "", children }) {
  const k = ACTIONBTN_KIND[kind] || { cls: "as-edge-neutral" };
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      className={`${ACTIONBTN_BASE} ${disabled ? "" : k.cls} ${flex ? "flex-1" : ""} ${disabled ? "" : "hover:brightness-110"} ${className}`}
      style={disabled ? { background: "var(--btn-off-bg)", color: "var(--btn-off-fg)", cursor: "not-allowed" }
                      : (k.c ? { "--c": k.c } : undefined)}>
      {children}
    </button>
  );
}
