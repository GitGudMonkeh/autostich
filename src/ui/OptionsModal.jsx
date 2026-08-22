import { useEffect, useRef, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { LOCALES, fmtPct } from "../i18n/index.js";
import { useT, useLocale } from "../i18n/useLocale.js"; // #sprache: alle Texte über t()
// #400 Test-Viewport — nur im Preview-Build gelesen (Gate an der Zeile unten in der Grafik-Sektion).
import { TEST_VIEWPORTS, TEST_VIEWPORT_OFF, optionValue, reloadAfterViewportChange } from "./testViewport.js";

/* Optionen-Overlay (#41): erreichbar aus dem Menü UND im laufenden Run (dort pausiert
   der Lauf, solange offen).

   #395 Gliederung: Die Liste war über die Zeit flach und lang geworden. Jetzt EIN Scroll, aber in vier
   Sektionen mit KLEBENDER Überschrift — man sieht jederzeit, in welchem Bereich man liest. Darüber ein
   FIXER Kopf (Titel · Schließen · Sprung-Chips), der nicht mitscrollt: nur so kann die Sektions-
   Überschrift sauber bei `top: 0` des Scroll-Bodys kleben. Vorher lag die Aktionsleiste selbst sticky IM
   Scroll-Fluss — zwei sticky-Ebenen im selben Container hätten sich gegenseitig überlagert.

   #optionen-ton (19.08.2026): Die schmale Fassung bleibt bewusst reiner Text. Ab 1280 px stehen drei
   Panels nebeneinander, und dort trägt jede Zeile ein Zeichen — nicht als Schmuck, sondern weil in
   drei Spalten gesucht statt gelesen wird. Es sind einfarbige Text-Glyphen wie im Glossar, keine
   Emoji, und sie führen den Zustand der Zeile (grün = an) weiter, den auf dem Handy die Kante trägt. */

/* Ein/Aus-Schalter im Stil der übrigen UI. */
function Toggle({ on, onClick }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="relative rounded-full transition-all shrink-0"
      /* #kante: „an" ist im Spiel grün (wie die Aktiv-Marken in der Werkstatt), nicht gold — Gold gehört
         der Währung und dem Ziel einer Phase. Die Zeile darum färbt sich in derselben Farbe. */
      style={{
        width: 46, height: 26,
        background: on ? "#5ab87a" : "#30303a",
        border: `1px solid ${on ? "#5ab87a" : "#3a3a44"}`,
      }}
    >
      <span
        className="absolute top-1/2 rounded-full transition-all"
        style={{
          width: 20, height: 20, background: "#f2f2f4",
          transform: "translateY(-50%)",
          left: on ? 22 : 2,
        }}
      />
    </button>
  );
}

/* 3-Wege-Auswahl (z. B. Auto/An/Aus) im Stil der übrigen UI.
   `self-start`: In der gestapelten Zeile („Effekte reduziert") ist der Elternteil eine Spalte, und deren
   Kinder werden quer GESTRECKT — der Rahmen lief dann über die ganze Zeilenbreite, während die drei Knöpfe
   im linken Drittel standen. Die Auswahl bemisst sich an ihrem Inhalt, nicht am Kasten. Gilt für BEIDE
   Fassungen: die schmale hatte denselben Fehler. */
function Segmented({ value, options, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden shrink-0 self-start" style={{ border: "1px solid #3a3a44" }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} role="radio" aria-checked={on} onClick={() => onChange(o.v)}
            className="px-3 py-1.5 text-xs font-bold transition-all"
            style={{ background: on ? "#d4a63a" : "#25252e", color: on ? "#141419" : "#c8c8d0" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Eine Options-Zeile: Titel + Beschreibung links, Steuerung rechts. `stack` (#363) → Text OBEN, Steuerung darunter
   (voll-breit) — für Zeilen mit breiter Steuerung + langem Text (z. B. „Effekte reduziert"), damit auf schmalen
   Breiten weder Text noch die Knöpfe gequetscht werden. */
/* #kante: Kanten-Zeile mit schmaler Kante. Ob sie grün wird, entscheidet index.css anhand des Schalters
   in `children` (`.as-opt-row:has(…)`) — die Zeile selbst muss den Zustand gar nicht kennen. */
/* #optionen-ton (19.08.2026): `icon` ist ein reines DESKTOP-Zeichen. Ab 1280 px trägt es den Zustand
   der Zeile (`--c`, dieselbe Variable, die auf dem Handy die linke Kante färbt) und macht die Spalte
   scanbar — man findet eine Einstellung am Zeichen, bevor man die Zeile liest. Unter 1280 px ist es
   `display: none`: dort ist die Liste schmal, und ein Zeichen je Zeile nähme dem Text die Breite. */
function Row({ icon, title, desc, children, stack = false }) {
  return (
    <div className={`as-edge-card as-edge-thin as-opt-row rounded-lg p-3 ${stack ? "as-opt-stack flex flex-col gap-2.5" : "flex items-center gap-3"}`}>
      {icon && <span className="as-deskonly op-rowicon" aria-hidden="true">{icon}</span>}
      <div className="op-rowtext flex-1">
        <div className="op-rowtitle font-bold text-sm">{title}</div>
        {desc && <div className="op-rowdesc text-sm opacity-70 leading-snug">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

/* #363 „Effekte reduziert" — 3 Zustände mit je eigener, kurzer Beschreibung (statt eines überladenen Satzes).
   Wird dynamisch die Beschreibung des GEWÄHLTEN Zustands gezeigt. Die Zustands-IDs bleiben deutsch
   („aus"/„mobile"/„an") — sie stehen so im gespeicherten Profil; übersetzt wird nur das Label. */
const RFX_VALUES = ["aus", "mobile", "an"];

/* Die vier Sektionen (#395, Reihenfolge festgelegt). `id` ist zugleich Sprungziel und Chip-Schlüssel;
   `title` steht in der klebenden Überschrift, `chip` kurz in der Sprungleiste („Grafik" statt
   „Grafik & Leistung", damit die Reihe auf schmalen Geräten nicht ausfranst). */
const SECTIONS = [
  { id: "general",  titleKey: "options.sec.general",  chipKey: "options.chip.general" },
  { id: "graphics", titleKey: "options.sec.graphics", chipKey: "options.chip.graphics" },
  { id: "sound",    titleKey: "options.sec.sound",    chipKey: "options.chip.sound" },
  { id: "display",  titleKey: "options.sec.display",  chipKey: "options.chip.display" },
];

/* Ein Abschnitt mit klebender Überschrift. Die negative Marge + gleich großes Padding ziehen den
   Kopf über die volle Kartenbreite — sonst schöben sich die Zeilen an seinen Rändern vorbei, statt
   sauber darunter zu verschwinden. */
function Section({ id, title, innerRef, children }) {
  return (
    <section ref={innerRef} data-sec={id} className="op-sec as-ring as-ring-quiet pb-1">
      {/* #desktop: Ab 1280 px ist die Sektion das Panel des Screens und trägt den laufenden
          Deckfarben-Ring. Das `<i>` ist die stehende Maske der kompositierten Fassung (#perf-ring) —
          ohne dieses Kind fehlt der Rahmen. Unter 1280 px ist beides inert (`.as-ring-run` ist dort
          `display: none`, `.as-ring` selbst greift erst im Desktop-Block). */}
      <i className="as-ring-run" aria-hidden="true" />
      <h3 className="sticky top-0 z-10 -mx-6 px-6 py-2 text-xs font-bold uppercase tracking-widest"
        /* #deckui: Sektions-Überschrift zieht die Deckfarbe (Chrome-Akzent). */
        style={{ color: "var(--deck-a1, #8a7de0)", background: STICKY_HEAD_BG }}>{title}</h3>
      <div className="grid gap-2.5 pt-2.5">{children}</div>
    </section>
  );
}

// Sprung-Chip — teilt sich den Stil mit der Glossar-Chipreihe (.as-chip in index.css).
function JumpChip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      /* #kante: eckig statt Pille — an einer runden Form würde die linke Kante zur Sichel. */
      className={"as-chip flex-none whitespace-nowrap text-[11px] tracking-wide px-2.5 py-1 rounded-md" + (active ? " as-chip-on" : "")}>
      {label}
    </button>
  );
}

export function OptionsModal({ options, onChange, onClose, onPrivacy = null }) {
  useEscape(onClose); // #58: Escape schließt (Backdrop unten)
  const t = useT();
  const [locale, setLocaleId] = useLocale();
  const rfx = RFX_VALUES.includes(options.reducedFx) ? options.reducedFx : "aus";
  const bodyRef = useRef(null);
  const secRefs = useRef({});
  const [active, setActive] = useState(SECTIONS[0].id);

  /* Aktiver Chip folgt dem Scrollen: beobachtet werden die Sektionen, gezählt wird aber nur das obere
     Band des Scroll-Bodys (rootMargin schneidet die unteren 65 % weg) — sonst gälte beim Scrollen immer
     die längste sichtbare Sektion als aktiv statt der, die gerade oben klebt. Bei mehreren Treffern
     gewinnt die in SECTIONS-Reihenfolge erste. */
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    const visible = new Set();
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.dataset.sec);
        else visible.delete(e.target.dataset.sec);
      }
      const first = SECTIONS.find((sec) => visible.has(sec.id));
      if (first) setActive(first.id);
    }, { root, rootMargin: "0px 0px -65% 0px", threshold: 0 });
    for (const sec of SECTIONS) { const el = secRefs.current[sec.id]; if (el) obs.observe(el); }
    return () => obs.disconnect();
  }, []);

  const jump = (id) => {
    setActive(id); // sofort setzen: das sanfte Scrollen meldet der Observer erst mit Verzögerung
    const el = secRefs.current[id];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: "smooth" });
    else if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  return overlayPortal((
    <div onClick={onClose} className="op-root fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      {/* #deckui: äußere Karte zieht den deck-getönten Rahmen-Verlauf (as-panel-deck). */}
      <div onClick={(e) => e.stopPropagation()} className="op-card w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-hidden overlay-card as-panel as-panel-deck flex flex-col" style={MODAL_CARD}>
        {/* #desktop: ab 1280 px wandert die Linie per `order` UNTER den Kopf (Zeile 2 des Kopf-Rasters). */}
        <ModalHairline className="op-hair" />

        {/* FIXER KOPF (#395): Titel · Schließen · Sprung-Chips — scrollt NICHT mit, damit die
            Sektions-Überschriften darunter bei top:0 kleben können. */}
        <div className="op-head flex-none px-6 pt-5 pb-3" style={{ background: STICKY_HEAD_BG, borderBottom: "1px solid #2a2a34" }}>
          <div className="op-headrow flex items-start gap-3">
            <div className="op-title min-w-0">
              {/* #deckui: Eyebrow deck-getönt. */}
              <div className="text-xs uppercase tracking-widest" style={{ color: "var(--deck-a1, #8a7de0)" }}>{t("options.eyebrow")}</div>
              <h2 className="text-xl font-bold mt-1">{t("options.title")}</h2>
            </div>
            {/* #desktop: Auskunftszeile neben dem Titel — dieselbe Stelle wie das Guthaben im Upgrade-Baum
                (Spalte 3, durch einen senkrechten Strich abgesetzt). Unter 1280 px gibt es sie nicht: dort ist
                der Kopf zweizeilig und trägt bereits die Sprungleiste. */}
            <div className="op-readout hidden dt:block">{t("options.desk.readout")}</div>
            <ActionButton kind="secondary" className="op-close ml-auto shrink-0" onClick={onClose}>
              <span className="as-deskonly op-closeicon" aria-hidden="true">✕</span>{t("common.close")}
            </ActionButton>
          </div>
          {/* #desktop: Die Sprungleiste ist ab 1280 px gegenstandslos (nichts scrollt mehr) und wird ausgeblendet. */}
          <div className="op-chips flex flex-nowrap sm:flex-wrap gap-1.5 mt-3 overflow-x-auto sm:overflow-x-visible as-chiprow">
            {SECTIONS.map((sec) => (
              <JumpChip key={sec.id} label={t(sec.chipKey)} active={active === sec.id} onClick={() => jump(sec.id)} />
            ))}
          </div>
        </div>

        {/* SCROLL-BODY: nur die Sektionen scrollen. */}
        <div ref={bodyRef} className="op-body flex-1 overflow-y-auto px-6 pt-1 pb-6" style={{ overscrollBehavior: "contain" }}>
        <div className="op-cols grid gap-1">
          <Section id="general" title={t("options.sec.general")}
            innerRef={(el) => { secRefs.current.general = el; }}>
          {/* #sprache: Sprachwahl ganz oben. Die Labels der Sprachen stehen bewusst in ihrer EIGENEN Sprache
              („Deutsch"/„English") — wer die aktuelle Sprache nicht lesen kann, findet die eigene trotzdem. */}
          <Row icon="⊕" title={t("options.language.title")} desc={t("options.language.desc")}>
            <Segmented value={locale}
              options={LOCALES.map((l) => ({ v: l.id, label: l.label }))}
              onChange={(v) => { setLocaleId(v); onChange({ lang: v }); }} />
          </Row>
          {/* #207: Haptik — kurzes Vibrations-Feedback bei Bestätigungen. Wirkt nur auf Touch-Geräten (Handy); System-„reduzierte Bewegung“ schaltet sie ohnehin ab. */}
          <Row icon="≋" title={t("options.haptics.title")} desc={t("options.haptics.desc")}>
            <Toggle on={options.haptics !== false} onClick={() => onChange({ haptics: options.haptics === false })} />
          </Row>
          {/* Ruhiger Modus: kappt die score-abhängige Musik-Eskalation bei „mid" — nur calm/mid-Tracks (Default aus). */}
          <Row icon="☾" title={t("options.calm.title")} desc={t("options.calm.desc")}>
            <Toggle on={!!options.calmMusic} onClick={() => onChange({ calmMusic: !options.calmMusic })} />
          </Row>
          {/* #telemetrie: anonyme Lauf-Daten (Beta-Playtest) — Default an, hier abschaltbar. Bewusst mit klarer
              Ansage, WAS gesendet wird und was nicht, statt einer nichtssagenden „Diagnosedaten"-Formel.
              #datenschutz: Der Kurztext kann die vollständige Liste nicht tragen (Gerätekontext, Install-Kennung,
              Bestenliste) — deshalb der Link zum Hinweis direkt HIER. Das ist der Punkt, an dem entschieden wird;
              ein Hinweis, den man erst im Menü suchen muss, kommt für diese Entscheidung zu spät. */}
          <Row icon="⇢" title={t("options.telemetry.title")}
            desc={<>
              {t("options.telemetry.desc")}
              {onPrivacy && (
                <button type="button" onClick={onPrivacy}
                  className="underline underline-offset-2 ml-1 font-semibold transition-opacity hover:opacity-100"
                  /* #deckui: Mehr-Link deck-getönt. */
                  style={{ color: "var(--deck-a1, #8a7de0)" }}>{t("options.telemetry.more")}</button>
              )}
            </>}>
            <Toggle on={options.telemetry !== false} onClick={() => onChange({ telemetry: options.telemetry === false })} />
          </Row>
          </Section>
          {/* #desktop — Klammer für die MITTLERE Spalte: „Grafik & Leistung" und „Ton" teilen sich dort eine
              Spalte und müssen als EIN Rasterfeld stehen. Ohne die Klammer säßen sie in zwei Rasterzeilen,
              deren Höhe die längste Spalte daneben bestimmt — zwischen den beiden klaffte dann deren
              Restluft. Unter 1280 px ist sie `display: contents`, ändert dort also nichts. */}
          <div className="op-col2">
          <Section id="graphics" title={t("options.sec.graphics")}
            innerRef={(el) => { secRefs.current.graphics = el; }}>
          {/* #363: Effekte reduziert — 3 Zustände (Aus/Mobile/An). Text OBEN, Segmented darunter (stack) → kein Quetschen
              auf schmalen Breiten. Beschreibung wechselt mit dem gewählten Zustand. Handy-Default „Mobile", Desktop „Aus". */}
          <Row stack icon="✶" title={t("options.rfx.title")} desc={t(`options.rfx.desc.${rfx}`)}>
            <Segmented value={rfx}
              options={RFX_VALUES.map((v) => ({ v, label: t(`options.rfx.${v}`) }))}
              onChange={(v) => onChange({ reducedFx: v })} />
          </Row>
          {/* Perf-HUD — NUR im Preview-/Testbranch-Build sichtbar (in „main“ ausgeblendet). Steuert das
              FPS/Report-Overlay: aus = kein Overlay UND keine Aufzeichnung (Recorder mountet erst bei „an“). */}
          {/* #400: ONE gate for both preview-only measurement rows, not one gate each — a second copy of the
              condition is a second place to forget it. Both rows carry the same glyph on purpose: they are
              measurement tools of the test branch, not player settings. */}
          {import.meta.env.VITE_PREVIEW === "1" && (<>
            <Row icon="▥" title={t("options.perfHud.title")} desc={t("options.perfHud.desc")}>
              <Toggle on={!!options.perfHud} onClick={() => onChange({ perfHud: !options.perfHud })} />
            </Row>
            {/* #400 Test viewport — renders the game inside a fixed-size frame so screenshots and layout
                checks stop depending on the current browser window. `stack` like the reduced-effects row
                above: five choices do not fit next to the text on narrow widths. Choosing a size swaps the
                top-level document, so the page reloads — `reloadAfterViewportChange` explains why that
                reload cannot happen on this line. */}
            <Row stack icon="▥" title={t("options.testvp.title")} desc={t("options.testvp.desc")}>
              <Segmented
                value={options.testViewport || TEST_VIEWPORT_OFF}
                options={[
                  { v: TEST_VIEWPORT_OFF, label: t("options.testvp.off") },
                  ...TEST_VIEWPORTS.map((v) => ({ v: v.id, label: v.label })),
                ]}
                onChange={(v) => { onChange({ testViewport: optionValue(v) }); reloadAfterViewportChange(); }} />
            </Row>
          </>)}
          </Section>
          <Section id="sound" title={t("options.sec.sound")}
            innerRef={(el) => { secRefs.current.sound = el; }}>
          {/* Retro-Skin (CRT) ist jetzt der feste Look des Spiels — immer an, kein Toggle mehr. */}
          {/* #110 Sound: Mute-Toggle + Lautstärke-Slider (persistiert über die Optionen). */}
          <Row icon="⊘" title={t("options.mute.title")} desc={t("options.mute.desc")}>
            <Toggle on={!!options.muted} onClick={() => onChange({ muted: !options.muted })} />
          </Row>
          <Row icon="✧" title={t("options.sfx.title")} desc={t("options.sfx.desc")}>
            <input type="range" min="0" max="1" step="0.05" value={options.sfxVol ?? 0.4}
              disabled={!!options.muted}
              onChange={(e) => onChange({ sfxVol: Number(e.target.value) })}
              aria-label={t("options.sfx.aria")}
              style={{ width: 120, accentColor: "#5ab87a", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          {/* #111 Musik: eigener Lautstärke-Slider (Default 0,2). */}
          <Row icon="♪" title={t("options.music.title")} desc={t("options.music.desc")}>
            <input type="range" min="0" max="1" step="0.05" value={options.musicVol ?? 0.2}
              disabled={!!options.muted}
              onChange={(e) => onChange({ musicVol: Number(e.target.value) })}
              aria-label={t("options.music.aria")}
              /* #deckui: generischer Violett-Akzent des Musik-Reglers → Deckfarbe (SFX bleibt grün, Zahlengröße gold — die tragen Bedeutung). */
              style={{ width: 120, accentColor: "var(--deck-a1, #8a7de0)", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          </Section>
          </div>
          <Section id="display" title={t("options.sec.display")}
            innerRef={(el) => { secRefs.current.display = el; }}>
          {/* #389 Floating-Text: Master-Schalter + drei Einzel-Schalter (Score · Multiplier · Win/Lose). „An" = sichtbar
              (Flag false). Master spiegelt „alle sichtbar" und setzt beim Umschalten alle drei zugleich. Score/Werte
              zählen unabhängig weiter — nur die aufsteigenden Popups verschwinden. Die großen Ansagen (Stark/Brutal/
              Irre/Gottgleich) sind bewusst NICHT ausblendbar und bleiben immer sichtbar. */}
          <Row icon="⇡" title={t("options.float.title")} desc={t("options.float.desc")}>
            <Toggle
              on={!(options.hideFloatScore && options.hideFloatMult && options.hideFloatWinLose)}
              onClick={() => {
                const anyVisible = !(options.hideFloatScore && options.hideFloatMult && options.hideFloatWinLose);
                const hide = anyVisible; // etwas sichtbar → alles ausblenden; sonst alles einblenden
                onChange({ hideFloatScore: hide, hideFloatMult: hide, hideFloatWinLose: hide });
              }} />
          </Row>
          {/* #deckui: Einrück-Kante der Float-Unterschalter deck-getönt (~27 % Alpha). */}
          <div className="flex flex-col gap-2.5 pl-3 ml-1" style={{ borderLeft: "2px solid color-mix(in srgb, var(--deck-a1, #8a7de0) 27%, transparent)" }}>
            <Row icon="◆" title={t("options.float.score.title")} desc={t("options.float.score.desc")}>
              <Toggle on={!options.hideFloatScore} onClick={() => onChange({ hideFloatScore: !options.hideFloatScore })} />
            </Row>
            <Row icon="✕" title={t("options.float.mult.title")} desc={t("options.float.mult.desc")}>
              <Toggle on={!options.hideFloatMult} onClick={() => onChange({ hideFloatMult: !options.hideFloatMult })} />
            </Row>
            <Row icon="⚔" title={t("options.float.winlose.title")} desc={t("options.float.winlose.desc")}>
              <Toggle on={!options.hideFloatWinLose} onClick={() => onChange({ hideFloatWinLose: !options.hideFloatWinLose })} />
            </Row>
          </div>
          {/* Stich-Aufschlüsselung (§17): die Faktorenkette unter dem Feld (Basis × Serie × Perks × Form × Crit
              (+ Direkt) = Summe). Eigener Schalter, NICHT unter dem Floating-Text-Master — die Zeile steht fest
              im Layout statt aufzusteigen. „An" = sichtbar (Flag false); der Platz bleibt so oder so reserviert. */}
          <Row icon="▤" title={t("options.breakdown.title")} desc={t("options.breakdown.desc")}>
            <Toggle on={!options.hideBreakdown} onClick={() => onChange({ hideBreakdown: !options.hideBreakdown })} />
          </Row>
          {/* Zahlengröße — skaliert Kartenzahlen + aufsteigende Score-Zahlen (Orbitron) gemeinsam. 1 = Standard. */}
          <Row icon="⌗" title={t("options.numScale.title")} desc={t("options.numScale.desc", { pct: fmtPct(Number(options.numScale) || 1) })}>
            <input type="range" min="0.75" max="1.25" step="0.05" value={options.numScale ?? 1}
              onChange={(e) => onChange({ numScale: Number(e.target.value) })}
              aria-label={t("options.numScale.aria")}
              style={{ width: 120, accentColor: "#d4a63a", cursor: "pointer" }} />
          </Row>
          </Section>
        </div>

        {/* Hier stand die Fußzeile „Weitere Optionen (Tempo-Default …) folgen hier." — ein Aushang an den
            Spieler, der eigentlich eine Notiz an die Entwicklung war. Die Optionen sind inzwischen gefüllt;
            ein Platzhalter, der auf nichts Bestimmtes zeigt, kostet nur Zeile und Aufmerksamkeit. Raus auf
            beiden Breiten, mitsamt Text (`options.footer`) und Klasse (`.op-foot`). */}
        </div>
      </div>
    </div>
  ));
}
