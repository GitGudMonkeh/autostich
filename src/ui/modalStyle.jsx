// Einheitliche Modal-/Menü-Bildsprache des Hubs (Design-Sweep, Variante C).
// Verlaufs-Hintergrund + weicher Violett-Glow oben + Rahmen; dazu die Gradient-Haarlinie (Cyan→Violett→Amber).
// EINE Quelle → hier justieren, überall wirkt es. Felder/Layout der Screens bleiben unberührt.

export const MODAL_CARD = {
  background:
    "radial-gradient(340px 150px at 50% 0%, rgba(155,130,240,.14), transparent 70%)," +
    "linear-gradient(180deg,#1b1a24,#141019)",
  border: "1px solid #2c2a3a",
};

// Neutrales Menü-Panel im neuen Design (Stats/Analyse/Listen-Kacheln etc.): flacher dunkler Grund + weicher
// violett-tendierter Rahmen. KEIN Glow, kein Farb-Tint (wirkte „billig ad-game") — nur der crispe Rahmen macht
// die einheitliche gerahmte Bildsprache. Neutral (keine Akzentfarbe) → überall gleich einsetzbar.
export const MENU_PANEL = {
  background: "#141320",
  border: "1px solid #302d40",
};

// #deckui: Die Modal-Haarlinie zieht jetzt DURCHGEHEND die aktive Deckfarbe (--deck-a1/--deck-a2, an .app-root gesetzt,
//   auch außerhalb eines Laufs). Fallback = der alte Logo-Verlauf (Cyan→Violett), falls kein Deck aktiv ist. Gilt für ALLE
//   Menü-Overlays über ModalHairline/TopHairline (Optionen, Bestenliste, Upgrade, Werkstatt, GameOver, Glossar, Stats …).
//   Die IN-RUN-Phasenleiste (PhaseHairline unten) ist bewusst ENTKOPPELT — dort bleibt der feste Verlauf.
export const HAIRLINE = { background: "linear-gradient(90deg, var(--deck-a1,#26c6e6), var(--deck-a2,#9b82f0), var(--deck-a1,#26c6e6))", opacity: 0.85 };
// Fester Verlauf NUR für die In-Run-Phasenleiste (Skill/Perk/Legendär/Ziel/Gletscher) — „was während man spielt" behält
//   sein eigenes Farbsystem, nicht die Deckfarbe.
const PHASE_HAIRLINE_BG = "linear-gradient(90deg,#26c6e6,#9b82f0,#f2a83a)";

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
  // eigene runde Oberecken (rounded-2xl ≈ 16px) → passt sich auch bei Karten OHNE overflow-clip sauber der Ecke an.
  return <div className="absolute top-0 left-0 right-0 h-[3px] z-30" style={{ ...HAIRLINE, borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }} aria-hidden="true" />;
}

// Sticky-Kopf-Hintergrund = oberster Stopp des Karten-Verlaufs → nahtloser Übergang (kein Panel-Seam).
export const STICKY_HEAD_BG = "#1b1a24";

// In-Run-Overlays (Skill-/Perk-/Legendär-Wahl, Formation, Ziel-Auswahl …): NUR die flache Panel-Füllung auf einen
// gemeinsamen Menü-Familien-Ton ziehen. KEIN Rahmen/Haarlinie/Glow, Ränder + Skill-/Perk-/Gebäude-/Kartenfarben bleiben.
export const PANEL_BG = "#1b1a24";

/* Gemeinsame In-Run-Panel-Schale: StatusBar · Battlefield · Fraktions-Panels · Analyse · Build teilen dieselbe
   Verlaufsfläche + denselben Rahmen, damit der Spielscreen als EIN System liest (statt flachem #17171c/#14131c-Mix
   wie bisher). Akzent (Fraktionsfarbe) + dynamische Sieg-/Krit-Aura liegen weiterhin oben drauf. */
// #356: deck-getönter Rahmen für die NEUTRALEN Struktur-Panels (StatusBar/StatusRail/Build/Formation/IndicatorPanel).
// Auflösung in index.css (--deck-border = color-mix aus der Deckfarbe --deck-a1, am Run-Container gesetzt, + dunklem
// Grund). Ohne --deck-a1 (Menü/deckloser Fallback) bleibt ein neutraler Grauton. Fraktions-/Zustands-gefärbte Rahmen
// nutzen das bewusst NICHT (die kodieren Bedeutung). Deck-Anteil (45 %) in index.css tunebar. [TUNING]
export const DECK_BORDER = "var(--deck-border)";
export const PANEL_CARD = {
  background: "linear-gradient(180deg,#1b1a24,#141019)",
  border: `1px solid ${DECK_BORDER}`,
};

/* ---- Phasen-Schale (In-Run-Overlays an die Hub-Bildsprache angeglichen) ----
   Die Phasen behalten ihre Farb-Identität (Perk rot, Skill violett, Aufstellung/Ziel grün, Gletscher eisblau,
   Legendär gold, Architekt blau); der Skin macht sie zur Familie, ohne sie gleichzuschalten. NUR die Schale
   (Hintergrund/Rahmen/Schein + gemeinsame Tri-Color-Haarlinie) kommt von hier — das Innenleben der Screens
   (Grids, Karten, Buttons, Klappfelder) bleibt unverändert. */
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
export function phaseCard(accent, base = ["#1b1a24", "#141019"], { quiet = false } = {}) {
  const rgb = accent.rgb;
  /* #lv-ruhe: `quiet` ist die Desktop-Fassung — dieselbe Karte, leiser gestellt. Drei Griffe, alle in
     dieselbe Richtung: der farbige Außenschein fällt ganz weg (der dunkle Schlagschatten bleibt, er trägt
     die Ablösung vom Brett), der Rahmen geht von 42 % auf 18 % Deckkraft, und der Lichtkegel am Kopf von
     14 % auf 6 %. Es ist derselbe Schalter wie `as-ring-quiet` in der Werkstatt (#cz-ruhe): EINE Fassung
     mit einem Schalter statt zweier Karten, die auseinanderlaufen.
     Bewusst ein Parameter und keine CSS-Regel: die Karte setzt ihren Stil INLINE, eine Regel bräuchte
     `!important` an drei Eigenschaften und würde beim nächsten Blick wie ein Notnagel aussehen. */
  return {
    background:
      `radial-gradient(360px 150px at 50% 0%, rgba(${rgb},${quiet ? ".06" : ".14"}), transparent 70%),` +
      `linear-gradient(180deg,${base[0]},${base[1]})`,
    border: `1px solid rgba(${rgb},${quiet ? ".18" : ".42"})`,
    boxShadow: quiet ? "0 18px 48px rgba(0,0,0,.5)" : `0 0 26px rgba(${rgb},.12), 0 14px 44px rgba(0,0,0,.42)`,
  };
}
// Inneres Struktur-Panel in der Phasen-Identitätsfarbe rahmen (Gegenstück zu UpgradeScreen.panelStyle, hier
// geteilt): NUR ein crisper farbiger Rahmen auf flachem `base`-Grund — kein Glow, kein Farb-Tint innen (clean).
// NUR für NEUTRALE Struktur-Boxen (Stat-Readouts, Board-/Assistent-Container) gedacht — bedeutungscodierte Ränder
// (Rarität/Fraktion/Eis/Zustand) bleiben unberührt. `accent` = PHASE_ACCENTS-Eintrag; `base` = flacher Grundton
// (Default Menü-Familienton; der Architekt reicht seinen blauen Grund durch).
export function phasePanel(accent, base = "#141419") {
  const { rgb } = accent;
  return {
    background: base,
    border: `1px solid rgba(${rgb},.42)`,
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
    ? `linear-gradient(90deg, rgba(${accent.rgb},.5), rgb(${accent.rgb}), rgba(${accent.rgb},.5))`
    : PHASE_HAIRLINE_BG;
  return <div aria-hidden="true" className={`absolute top-0 left-0 right-0 z-20 ${className}`}
    style={{ height: 3, background: bg, opacity: 0.9, borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }} />;
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
      style={{ top, background: bg, ...(border ? { borderBottom: "1px solid #2a2a34" } : null) }}>
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
const ACTIONBTN_BASE = "as-actbtn rounded-lg font-bold text-body-lg-5 px-4 py-2.5 whitespace-nowrap transition-all";
const ACTIONBTN_KIND = {
  primary: { cls: "as-edge-strong", c: "#d4a63a" },
  reroll:  { cls: "as-edge-strong", c: "#d4a63a" },
  danger:  { cls: "as-edge",        c: "#e0605a" },
  decline: { cls: "as-edge-neutral" },
};
export function ActionButton({ kind = "secondary", onClick, disabled = false, flex = false, title, className = "", children }) {
  const k = ACTIONBTN_KIND[kind] || { cls: "as-edge-neutral" };
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      className={`${ACTIONBTN_BASE} ${disabled ? "" : k.cls} ${flex ? "flex-1" : ""} ${disabled ? "" : "hover:brightness-110"} ${className}`}
      style={disabled ? { background: "#2a2a33", color: "#8a8a92", cursor: "not-allowed" }
                      : (k.c ? { "--c": k.c } : undefined)}>
      {children}
    </button>
  );
}
