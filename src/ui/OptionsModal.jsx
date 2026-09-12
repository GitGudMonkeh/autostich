import { useEffect, useRef, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { OptIcon, Toggle, Segmented, Dropdown, Slider, ResetAction } from "./optionsBits.jsx";
import { defaultScreenOptions } from "../game/storage.js";
import { READY_LOCALES, fmtPct } from "../i18n/index.js";
import { useT, useLocale } from "../i18n/useLocale.js"; // #sprache: alle Texte über t()
// #400 Test-Viewport — nur im Preview-Build gelesen (Gate an der Zeile unten in der Dev-Sektion).
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
   drei Spalten gesucht statt gelesen wird. */

/* #optionen-redesign (24.08.2026) — der freigegebene Zielentwurf, docs/optionen-redesign.md.
   ============================================================================
   Vier Dinge ändern sich: die Spalten werden nach INHALT geteilt statt nach Zeilenzahl, der Kopf
   trägt seine Auskunft als Unterzeile statt hinter einem Trennstrich, ein Fuß kommt dazu, und die
   Dev-Zeilen verlassen den Spieler-Screen.

   ZWEI DINGE, DIE DER ENTWURF NICHT WUSSTE, und beide sind nachgemessen:

   1. Die Dev-Zeilen waren SCHON preview-gated. Der Entwurf nennt als Ausgangsproblem, sie nähmen ein
      Drittel der mittleren Spalte; in einem `main`-Build stand dort nie etwas. Gemessen enden die
      Spalten bei 619 / 614 / 710 px statt der angenommenen 680 / 1010 / 790, die tote Fläche unten
      links ist ~91 px statt ~350, und die längste Spalte ist die DRITTE. Der Umbau bleibt richtig, er
      verschiebt aber eine Spalte um 76 px statt ein Drittel Bildschirm (Befund MENU-08/09).

   2. „Ton stumm" → „Ton" dreht NUR DIE ANZEIGE um. Der gespeicherte Schlüssel bleibt `muted` mit
      `true` = stumm. Wer den Wert selbst invertiert, setzt jedes bestehende Spielerprofil auf stumm —
      und zwar auch die Stummtaste am Hub, in der Eckleiste und in den Lauf-Controls, die alle
      denselben Schlüssel lesen (MuteButton.jsx). Deshalb: `!options.muted` anzeigen, `muted`
      schreiben. `test/optionen-redesign.test.js` wacht darüber.

   REIHENFOLGE ÜBER `order`, NICHT ÜBER DAS DOM. „Ton" steht ab 1280 px über „Grafik & Leistung"; im
   DOM bleibt die alte Folge, damit die schmale Fassung Zeile für Zeile die bleibt, die abgenommen
   wurde. Dieselbe Bauart wie `.op-hair` weiter unten.

   COMMIT 2a: die STRUKTUR, mit den heutigen Flächenwerten. Die Tokens kommen in 2b. */

/* Eine Options-Zeile: Titel + Beschreibung links, Steuerung rechts. `stack` (#363) → Text OBEN, Steuerung darunter
   (voll-breit) — für Zeilen mit breiter Steuerung + langem Text (z. B. „Effekte reduziert"), damit auf schmalen
   Breiten weder Text noch die Knöpfe gequetscht werden. */
/* #kante: Kanten-Zeile mit schmaler Kante. Ob sie grün wird, entscheidet index.css anhand des Schalters
   in `children` (`.as-opt-row:has(…)`) — die Zeile selbst muss den Zustand gar nicht kennen. */
/* #optionen-redesign: `icon` ist jetzt ein NAME statt einer Glyphe (s. optionsBits.jsx). `off` dämpft
   die Zeile, wenn ihr Schalter von einem anderen abhängt — sichtbar, nicht nur wirkungslos. */
function Row({ icon, title, desc, children, stack = false, off = false }) {
  return (
    <div className={`as-edge-card as-edge-thin as-opt-row rounded-lg p-3${off ? " is-off" : ""} ${stack ? "as-opt-stack flex flex-col gap-2.5" : "flex items-center gap-3"}`}>
      {icon && <span className="as-deskonly op-rowicon" aria-hidden="true"><OptIcon name={icon} /></span>}
      <div className="op-rowtext flex-1">
        <div className="op-rowtitle font-bold text-body-lg-5">{title}</div>
        {desc && <div className="op-rowdesc text-body-lg-5 opacity-70 leading-snug">{desc}</div>}
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
      <h3 className="sticky top-0 z-10 -mx-6 px-6 py-2 text-body-5 font-bold uppercase tracking-widest"
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
      className={"as-chip flex-none whitespace-nowrap text-meta-3 tracking-wide px-2.5 py-1 rounded-md" + (active ? " as-chip-on" : "")}>
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

  /* #optionen-redesign: „Ton an" IST „nicht stumm". Nur die Anzeige dreht sich; geschrieben wird
     weiter `muted`, sonst stünde nach dem Update jedes bestehende Profil auf stumm. */
  const soundOn = !options.muted;
  const floatOn = !(options.hideFloatScore && options.hideFloatMult && options.hideFloatWinLose);

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
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={t("options.title")} className="op-root fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "var(--sf-scrim)", backdropFilter: "blur(3px)" }}>
      {/* #deckui: äußere Karte zieht den deck-getönten Rahmen-Verlauf (as-panel-deck). */}
      <div onClick={(e) => e.stopPropagation()} className="op-card w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-hidden overlay-card as-panel as-panel-deck flex flex-col" style={MODAL_CARD}>
        {/* #desktop: ab 1280 px wandert die Linie per `order` UNTER den Kopf (Zeile 2 des Kopf-Rasters). */}
        <ModalHairline className="op-hair" />

        {/* FIXER KOPF (#395): Titel · Schließen · Sprung-Chips — scrollt NICHT mit, damit die
            Sektions-Überschriften darunter bei top:0 kleben können. */}
        <div className="op-head flex-none px-6 pt-5 pb-3" style={{ background: STICKY_HEAD_BG, borderBottom: "1px solid var(--ed-quiet)" }}>
          <div className="op-headrow flex items-start gap-3">
            <div className="op-title min-w-0">
              {/* #deckui: Eyebrow deck-getönt. */}
              <div className="text-body-5 uppercase tracking-widest" style={{ color: "var(--deck-a1, #8a7de0)" }}>{t("options.eyebrow")}</div>
              <h2 className="text-title-6 font-bold mt-1">{t("options.title")}</h2>
              {/* #optionen-redesign: Die Auskunft steht als UNTERZEILE am Titel statt rechts daneben
                  hinter einem Trennstrich — eine Kontur weniger, und die Ansage gehört zum Titel. */}
              <div className="op-readout hidden dt:block">{t("options.desk.readout")}</div>
            </div>
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
              („Deutsch"/„English") — wer die aktuelle Sprache nicht lesen kann, findet die eigene trotzdem.
              #optionen-redesign: Dropdown statt Segmented — die Liste WÄCHST, und drei Reiter nebeneinander
              wären bei der vierten Sprache eine Reiterzeile, die niemand mehr überblickt.
              #es-locale: READY_LOCALES, nicht LOCALES — angemeldet ist nicht dasselbe wie übersetzt. */}
          {/* exp: the row exists only while there is a choice — one active language, no selector. */}
          {READY_LOCALES.length > 1 && (
            <Row icon="language" title={t("options.language.title")} desc={t("options.language.desc")}>
              <Dropdown value={locale} label={t("options.language.title")}
                options={READY_LOCALES.map((l) => ({ v: l.id, label: l.label, lang: l.id }))}
                onChange={(v) => { setLocaleId(v); onChange({ lang: v }); }} />
            </Row>
          )}
          {/* #207: Haptik — kurzes Vibrations-Feedback bei Bestätigungen. Wirkt nur auf Touch-Geräten (Handy); System-„reduzierte Bewegung“ schaltet sie ohnehin ab. */}
          <Row icon="haptics" title={t("options.haptics.title")} desc={t("options.haptics.desc")}>
            <Toggle on={options.haptics !== false} label={t("options.haptics.title")}
              onClick={() => onChange({ haptics: options.haptics === false })} />
          </Row>
          {/* Ruhiger Modus: kappt die score-abhängige Musik-Eskalation bei „mid" — nur calm/mid-Tracks (Default aus). */}
          <Row icon="calm" title={t("options.calm.title")} desc={t("options.calm.desc")}>
            <Toggle on={!!options.calmMusic} label={t("options.calm.title")}
              onClick={() => onChange({ calmMusic: !options.calmMusic })} />
          </Row>
          {/* #telemetrie: anonyme Lauf-Daten (Beta-Playtest) — Default an, hier abschaltbar. Bewusst mit klarer
              Ansage, WAS gesendet wird und was nicht, statt einer nichtssagenden „Diagnosedaten"-Formel.
              #datenschutz: Der Kurztext kann die vollständige Liste nicht tragen (Gerätekontext, Install-Kennung,
              Bestenliste) — deshalb der Link zum Hinweis direkt HIER. Das ist der Punkt, an dem entschieden wird;
              ein Hinweis, den man erst im Menü suchen muss, kommt für diese Entscheidung zu spät.
              Der Entwurf zeigt diesen Text gekürzt, damit die Spalte ins Bild passt — er bleibt UNGEKÜRZT. */}
          <Row icon="telemetry" title={t("options.telemetry.title")}
            desc={<>
              {t("options.telemetry.desc")}
              {onPrivacy && (
                <button type="button" onClick={onPrivacy}
                  className="underline underline-offset-2 ml-1 font-semibold transition-opacity hover:opacity-100"
                  /* #deckui: Mehr-Link deck-getönt. */
                  style={{ color: "var(--deck-a1, #8a7de0)" }}>{t("options.telemetry.more")}</button>
              )}
            </>}>
            <Toggle on={options.telemetry !== false} label={t("options.telemetry.title")}
              onClick={() => onChange({ telemetry: options.telemetry === false })} />
          </Row>
          </Section>
          {/* #desktop — Klammer für die MITTLERE Spalte: „Ton" und „Grafik & Leistung" teilen sich dort eine
              Spalte und müssen als EIN Rasterfeld stehen. Ohne die Klammer säßen sie in zwei Rasterzeilen,
              deren Höhe die längste Spalte daneben bestimmt — zwischen den beiden klaffte dann deren
              Restluft. Unter 1280 px ist sie `display: contents`, ändert dort also nichts.
              #optionen-redesign: die REIHENFOLGE der beiden (Ton oben) macht `order` im 1280er Block, nicht
              das DOM — die schmale Fassung bleibt Zeile für Zeile die abgenommene. */}
          <div className="op-col2">
          <Section id="graphics" title={t("options.sec.graphics")}
            innerRef={(el) => { secRefs.current.graphics = el; }}>
          {/* #optionen-redesign: Hier steht KEINE Zeile „Auflösung", und das ist eine Entscheidung, keine
              Auslassung. Der Entwurf macht daraus eine Spieler-Option mit festen Bildgrößen; Owner und
              Planner haben inzwischen hergeleitet, dass feste Fenstergrößen NICHT das Modell sein sollen —
              das Spiel skaliert auf den verfügbaren Viewport mit 16:9-Sicherzone, und Renderqualität und
              UI-Skalierung wären getrennte Optionen. Der Platz bleibt frei, bis das entschieden ist.
              Der Haken dafür steht bereits: --ui-scale in index.css. */}
          {/* #363: Effekte reduziert — 3 Zustände (Aus/Mobile/An). Text OBEN, Segmented darunter (stack) → kein Quetschen
              auf schmalen Breiten. Beschreibung wechselt mit dem gewählten Zustand. Handy-Default „Mobile", Desktop „Aus". */}
          <Row stack icon="rfx" title={t("options.rfx.title")} desc={t(`options.rfx.desc.${rfx}`)}>
            <Segmented value={rfx} label={t("options.rfx.title")}
              options={RFX_VALUES.map((v) => ({ v, label: t(`options.rfx.${v}`) }))}
              onChange={(v) => onChange({ reducedFx: v })} />
          </Row>
          </Section>
          <Section id="sound" title={t("options.sec.sound")}
            innerRef={(el) => { secRefs.current.sound = el; }}>
          {/* Retro-Skin (CRT) ist jetzt der feste Look des Spiels — immer an, kein Toggle mehr. */}
          {/* #110 Sound + #optionen-redesign: die Zeile heißt „Ton" und AN heißt Ton an. Grün ist im Spiel
              „an"; ein grüner Schalter, der den Ton ABschaltet, sagt das Gegenteil. Gespeichert wird
              unverändert `muted` (true = stumm) — s. der Block am Kopf dieser Datei. */}
          <Row icon={soundOn ? "sound" : "soundOff"} title={t("options.mute.title")} desc={t("options.mute.desc")}>
            <Toggle on={soundOn} label={t("options.mute.title")}
              onClick={() => onChange({ muted: soundOn })} />
          </Row>
          {/* #optionen-redesign: Die zwei Regler hängen sichtbar am Ton — gedämpft, ohne Eingabe, und der
              Wert sagt „stumm" statt einer Zahl, die nichts bewirkt. */}
          <Row icon="sfx" title={t("options.sfx.title")} desc={t("options.sfx.desc")}>
            <Slider value={options.sfxVol ?? 0.4} min={0} max={1} step={0.05} disabled={!soundOn}
              label={t("options.sfx.aria")} mutedLabel={t("options.slider.muted")}
              format={(v) => fmtPct(v)} onChange={(v) => onChange({ sfxVol: v })} />
          </Row>
          {/* #111 Musik: eigener Lautstärke-Regler (Default 0,2). */}
          <Row icon="music" title={t("options.music.title")} desc={t("options.music.desc")}>
            <Slider value={options.musicVol ?? 0.2} min={0} max={1} step={0.05} disabled={!soundOn}
              label={t("options.music.aria")} mutedLabel={t("options.slider.muted")}
              format={(v) => fmtPct(v)} onChange={(v) => onChange({ musicVol: v })} />
          </Row>
          </Section>
          </div>
          <Section id="display" title={t("options.sec.display")}
            innerRef={(el) => { secRefs.current.display = el; }}>
          {/* #389 Floating-Text: Master-Schalter + drei Einzel-Schalter (Score · Multiplier · Win/Lose). „An" = sichtbar
              (Flag false). Master spiegelt „alle sichtbar" und setzt beim Umschalten alle drei zugleich. Score/Werte
              zählen unabhängig weiter — nur die aufsteigenden Popups verschwinden. Die großen Ansagen (Stark/Brutal/
              Irre/Gottgleich) sind bewusst NICHT ausblendbar und bleiben immer sichtbar.
              #optionen-redesign: Master und Untergruppe stehen in EINEM umschlossenen Block — vorher trug die
              Abhängigkeit allein eine dünne Einrück-Kante, und der Master las sich wie jede andere Zeile.
              BEKANNTER NEBENEFFEKT, bewusst nicht gelöst: schaltet man den letzten aktiven Unterschalter
              einzeln aus, kippt der Master auf „aus" und der Weg zurück schaltet alle drei ein. Das ist das
              heutige Verhalten; die Antwort wäre ein Mixed-State und ist eine eigene Entscheidung. */}
          <div className="op-floatgroup">
          <Row icon="float" title={t("options.float.title")} desc={t("options.float.desc")}>
            <Toggle on={floatOn} label={t("options.float.title")}
              onClick={() => {
                const hide = floatOn; // etwas sichtbar → alles ausblenden; sonst alles einblenden
                onChange({ hideFloatScore: hide, hideFloatMult: hide, hideFloatWinLose: hide });
              }} />
          </Row>
          {/* #deckui: Einrück-Kante der Float-Unterschalter deck-getönt. */}
          <div className={`op-floatsubs flex flex-col gap-2.5 pl-3 ml-1${floatOn ? "" : " is-off"}`}>
            <Row icon="score" title={t("options.float.score.title")} desc={t("options.float.score.desc")}>
              <Toggle on={!options.hideFloatScore} disabled={!floatOn} label={t("options.float.score.title")}
                onClick={() => onChange({ hideFloatScore: !options.hideFloatScore })} />
            </Row>
            <Row icon="mult" title={t("options.float.mult.title")} desc={t("options.float.mult.desc")}>
              <Toggle on={!options.hideFloatMult} disabled={!floatOn} label={t("options.float.mult.title")}
                onClick={() => onChange({ hideFloatMult: !options.hideFloatMult })} />
            </Row>
            <Row icon="winlose" title={t("options.float.winlose.title")} desc={t("options.float.winlose.desc")}>
              <Toggle on={!options.hideFloatWinLose} disabled={!floatOn} label={t("options.float.winlose.title")}
                onClick={() => onChange({ hideFloatWinLose: !options.hideFloatWinLose })} />
            </Row>
          </div>
          </div>
          {/* Stich-Aufschlüsselung (§17): die Faktorenkette unter dem Feld (Basis × Serie × Perks × Form × Crit
              (+ Direkt) = Summe). Eigener Schalter, NICHT unter dem Floating-Text-Master — die Zeile steht fest
              im Layout statt aufzusteigen. „An" = sichtbar (Flag false); der Platz bleibt so oder so reserviert. */}
          <Row icon="breakdown" title={t("options.breakdown.title")} desc={t("options.breakdown.desc")}>
            <Toggle on={!options.hideBreakdown} label={t("options.breakdown.title")}
              onClick={() => onChange({ hideBreakdown: !options.hideBreakdown })} />
          </Row>
          {/* Zahlengröße — skaliert Kartenzahlen + aufsteigende Score-Zahlen (Orbitron) gemeinsam.
              #optionen-redesign: der Prozentwert steht am REGLER statt in der Beschreibung. Der gespeicherte
              Standard ist 0,75 (die kleinste Stufe, s. storage.js) — nicht 1, wie hier früher stand. */}
          <Row icon="numScale" title={t("options.numScale.title")} desc={t("options.numScale.desc")}>
            <Slider value={options.numScale ?? 0.75} min={0.75} max={1.25} step={0.05}
              label={t("options.numScale.aria")} format={(v) => fmtPct(v)}
              onChange={(v) => onChange({ numScale: v })} />
          </Row>
          </Section>

          {/* #400 / #optionen-redesign — die MESSWERKZEUGE des Testbranch, gesammelt und ganz unten.
              Sie standen gleichrangig zwischen Spieler-Optionen; dass sie den Spieler-Screen verlassen, ist
              entschieden, WOHIN sie wandern war offen. Bis das entschieden ist: preview-gated wie bisher,
              aber als eigene Sektion am Ende statt mitten in „Grafik & Leistung". Ein Gate für beide Zeilen,
              nicht eines je Zeile — eine zweite Kopie der Bedingung ist eine zweite Stelle zum Vergessen. */}
          {import.meta.env.VITE_PREVIEW === "1" && (
            <section data-sec="dev" className="op-sec op-sec-dev as-ring as-ring-quiet pb-1">
              <i className="as-ring-run" aria-hidden="true" />
              <h3 className="sticky top-0 z-10 -mx-6 px-6 py-2 text-body-5 font-bold uppercase tracking-widest"
                style={{ color: "var(--deck-a1, #8a7de0)", background: STICKY_HEAD_BG }}>{t("options.sec.dev")}</h3>
              <div className="grid gap-2.5 pt-2.5">
                <Row icon="dev" title={t("options.perfHud.title")} desc={t("options.perfHud.desc")}>
                  <Toggle on={!!options.perfHud} label={t("options.perfHud.title")}
                    onClick={() => onChange({ perfHud: !options.perfHud })} />
                </Row>
                {/* Choosing a size swaps the top-level document, so the page reloads —
                    `reloadAfterViewportChange` explains why that reload cannot happen on this line. */}
                <Row stack icon="dev" title={t("options.testvp.title")} desc={t("options.testvp.desc")}>
                  <Segmented value={options.testViewport || TEST_VIEWPORT_OFF} label={t("options.testvp.title")}
                    options={[
                      { v: TEST_VIEWPORT_OFF, label: t("options.testvp.off") },
                      ...TEST_VIEWPORTS.map((v) => ({ v: v.id, label: v.label })),
                    ]}
                    onChange={(v) => { onChange({ testViewport: optionValue(v) }); reloadAfterViewportChange(); }} />
                </Row>
              </div>
            </section>
          )}
        </div>

        {/* #optionen-redesign — FUSS über die volle Breite, an der Unterkante der Karte. Links das
            Zurücksetzen als ruhiger Textknopf (kein Signalknopf: es ist kein Angebot), rechts die
            Ansage, dass alles sofort wirkt. Der Knopf fragt nach, bevor er schreibt — er überschreibt
            jede Einstellung dieses Screens, und der Entwurf hatte dafür keine Rückfrage vorgesehen. */}
        </div>

        {/* #optionen-redesign — FUSS über die volle Breite, an der UNTERKANTE der Karte. Er ist
            GESCHWISTER des Scroll-Rumpfs, nicht sein letztes Kind: im Rumpf wäre er unter den Spalten
            mitgescrollt, und auf 1280 x 720 lag er damit 170 px unterhalb der Kartenkante — das
            Zurücksetzen wäre nur nach Scrollen erreichbar gewesen (nachgemessen, bevor diese Zeile
            stand). `order: 4` im 1280er Block, weil Kopf, Haarlinie und Rumpf dort ihre Plätze
            ebenfalls über `order` bekommen und ein Kind ohne Angabe sonst nach vorn rutscht.
            Links das Zurücksetzen als ruhiger Textknopf (kein Signalknopf: es ist kein Angebot),
            rechts die Ansage, dass alles sofort wirkt. Der Knopf fragt nach, bevor er schreibt. */}
        <div className="op-foot flex-none">
          <ResetAction onReset={() => onChange(defaultScreenOptions())} />
          <span className="op-foot-hint">{t("options.foot.hint")}</span>
        </div>
      </div>
    </div>
  ));
}
