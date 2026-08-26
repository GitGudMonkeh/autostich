import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx"; // #362 einheitliche Aktionsleiste oben
import { READY_LOCALES, fmtNum } from "../i18n/index.js";
import { useT, useLocale } from "../i18n/useLocale.js"; // #sprache: Erstwahl der Sprache lebt hier
import { isAllowedUsername } from "../game/profanity.js"; // #174 Profanity-Filter (rein, testbar)

/* Lokaler Nickname (#14): dient der Ersteinrichtung (beim ersten Start) und dem
   späteren Ändern. Validiert Trim + Länge 1–20 und seit #174 zusätzlich gegen die
   kuratierte Wortliste — der Name erscheint an den GLOBALEN Highscore-Einträgen und
   ist damit für alle Spieler sichtbar. Durchgesetzt wird der Filter in der Datenbank
   (docs/username-profanity-guard.sql); hier geht es um sofortiges, klares Feedback.
   Optik an den aktuellen Hub-Stil angeglichen: Gradient-Wortmarke im Kopf (Logo-Verlauf
   Cyan→Violett→Amber), Cyan-Glührahmen ums Eingabefeld (wie „Lauf fortsetzen") und eine
   Live-Vorschau der eigenen Highscore-Zeile.

   #sprache: Beim ERSTEN Start steht unter dem Namensfeld zusätzlich die Sprachwahl. Das ist der
   einzige Moment, in dem ein Spieler garantiert vorbeikommt — und der Standard ist Englisch, also
   muss ein deutscher Spieler die Umschaltung finden, ohne erst die Optionen zu suchen. Danach ist
   die Sprache nur noch dort änderbar (Optionen → Sprache/Language). Die Sprachnamen stehen bewusst
   in ihrer EIGENEN Sprache („Deutsch"/„English") — wer die aktuelle nicht lesen kann, findet seine. */
const MAX = 20;
// #deckui: CY/VI dienen jetzt nur noch als FALLBACK in var(--deck-a1/a2, …) — die Chrome zieht die aktive
//   Deckfarbe (Default = Genesis-Cyan/Violett, also unverändertes Erstbild). ER = Fehlerfarbe (bleibt).
const CY = "#26c6e6", VI = "#9b82f0";
const ER = "#e2685f"; // #174 Fehlerfarbe — der Glührahmen wechselt mit, nicht nur der Text

export function UsernameModal({ initial = "", firstTime = false, onLang = null, onPrivacy = null, onSave, onClose }) {
  const [name, setName] = useState(initial);
  const t = useT();
  const [locale, setLocaleId] = useLocale();
  const trimmed = name.trim();
  /* #174 Live geprüft, nicht erst beim Klick: der Speichern-Knopf geht aus UND darunter
     steht warum. Ein Knopf, der ohne Begründung tot ist, liest sich wie ein Bug. */
  const check = isAllowedUsername(trimmed.slice(0, MAX));
  const canSave = check.ok;
  const errKey = check.ok || check.reason === "empty" ? null // leer = noch nichts getippt, keine Meldung
    : check.reason === "profanity" ? "name.err.profanity" : "name.err.length";
  const submit = () => { if (canSave) onSave(trimmed.slice(0, MAX)); };
  useEscape(onClose); // #58: Escape schließt (Backdrop existiert bereits)

  return overlayPortal((
    <div onClick={onClose} className="un-root fixed inset-0 overlay-root z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      {/* #desktop: `un-first` schaltet ab 1280 px die zweispaltige Fassung frei — und NUR beim Erststart.
          „Name ändern" bleibt der schmale Dialog: das ist ein Umbenennen, kein Auftritt. */}
      <div onClick={(e) => e.stopPropagation()} className={`un-card w-full max-w-xs rounded-2xl overflow-hidden as-panel as-panel-deck ${firstTime ? "un-first" : ""}`}
        style={MODAL_CARD}>
        <ModalHairline />
        <div className="un-body p-6">
        {/* #362 Aktionsleiste OBEN — Abbrechen links, Speichern rechts. */}
        <ActionBar pad={6} bg={STICKY_HEAD_BG} className="un-bar">
          {!firstTime && <ActionButton kind="secondary" onClick={onClose}>{t("name.cancel")}</ActionButton>}
          <span className="flex-1" />
          {/* #willkommen: das Diskettenzeichen trägt nur die breite Fassung (unter 1280 px `display: none`) —
              im 320-px-Dialog nimmt es dem kurzen Wort mehr Platz weg, als es an Klarheit bringt. */}
          <ActionButton kind="primary" className="un-save" disabled={!canSave} onClick={submit}>
            <span className="as-deskonly un-btnicon" aria-hidden="true">🖫</span>{t("name.save")}
          </ActionButton>
        </ActionBar>
        <div className="un-head text-center mb-4">
          <div className="un-eyebrow text-body-5 uppercase tracking-widest" style={{ color: `var(--deck-a1, ${CY})` }}>
            {t(firstTime ? "name.eyebrow.first" : "name.eyebrow.change")}
          </div>
          {/* #desktop: In der breiten Fassung trägt die linke Spalte die MARKE — derselbe Text-Schlüssel und
              dieselbe Klasse wie im Hub (`.as-wordmark`), also EINE Quelle für Verlauf, Schrift und Deckfarbe.
              Unter 1280 px gibt es sie hier nicht: dort ist der Dialog 320 px breit und die Marke stand
              zwei Sekunden vorher schon auf dem Startbildschirm. */}
          <div className="un-wm as-wordmark select-none hidden">{t("start.logo.alt")}</div>
          {/* #deckui: Gradient-Wortmarke zieht die Deckfarbe (a1→a2→a1); Fallback = Genesis-Cyan/Violett. */}
          <h2 className="un-title text-title-6 font-bold mt-1 ty-display"
            style={{ backgroundImage: `linear-gradient(90deg, var(--deck-a1,${CY}), var(--deck-a2,${VI}), var(--deck-a1,${CY}))`,
                     WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                     filter: "drop-shadow(0 0 10px rgba(155,130,240,0.35))" }}>
            {t(firstTime ? "name.title.first" : "name.title.change")}
          </h2>
        </div>

        {/* #desktop — Klammer um die rechte Spalte (Feld · Hinweis · Sprache · Vorschau). Unter 1280 px ist
            sie `display: contents`, die Handy-Reihenfolge bleibt damit unangetastet. */}
        <div className="un-form">
        {/* #willkommen: In der breiten Fassung steht die Marke links und der Titel „Wähle deinen Namen"
            gehört zur Ansprache — das Feld rechts braucht deshalb eine eigene Beschriftung. Auf dem Handy
            steht der Titel direkt darüber, dort wäre sie doppelt (`display: none`). Kein neuer Textschlüssel:
            `name.title.change` IST „Dein Name". */}
        <div className="as-deskonly un-flabel un-slabel text-meta-1 uppercase tracking-widest opacity-40 mb-1">{t("name.title.change")}</div>
        {/* Eingabefeld im pulsierenden Cyan-Glührahmen (wie der „Lauf fortsetzen"-Rahmen). */}
        <div className="as-guide-glow rounded-lg">
          <input autoFocus value={name} maxLength={MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={t("name.placeholder")}
            aria-invalid={!!errKey}
            className="w-full px-3 py-2.5 rounded-lg text-body-lg-5 outline-none text-center font-semibold tracking-wide"
            style={{ background: errKey ? "#221114" : "#0e1b22", border: `1px solid ${errKey ? ER : `var(--deck-a1, ${CY})`}`,
                     color: errKey ? "#f0bdb8" : "#a8ecf7" }} />
        </div>
        <div className="text-meta-3 opacity-45 mt-2 leading-snug">
          {t("name.hint", { max: MAX })}
          {/* #datenschutz: Genau HIER wird der Name gewählt, der später an den globalen Highscore-Einträgen
              hängt — für alle sichtbar. Der Hinweis gehört deshalb an diese Zeile und nicht nur ins Menü:
              die Entscheidung „welchen Namen gebe ich mir" fällt in diesem Moment, nicht später. */}
          {onPrivacy && (
            <button type="button" onClick={onPrivacy}
              className="underline underline-offset-2 ml-1 font-semibold opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: `var(--deck-a1, ${VI})` }}>{t("privacy.link")}</button>
          )}
        </div>
        {/* #174 Begründung zum toten Speichern-Knopf. role=alert, damit Screenreader sie
            beim Tippen ansagen — sonst bleibt der Knopf für sie grundlos unbenutzbar. */}
        {errKey && (
          <div role="alert" className="text-meta-3 mt-1.5 leading-snug font-semibold" style={{ color: ER }}>
            {t(errKey, { max: MAX })}
          </div>
        )}

        {/* #sprache — nur beim Erststart. Gleich breite Knöpfe, damit keine der Sprachen wie die
            „richtige" aussieht. Die Umschaltung wirkt SOFORT (der Dialog selbst wechselt mit),
            damit man das Ergebnis seiner Wahl sieht, bevor man weiterklickt.

            #es-locale: die Spaltenzahl kommt aus der Anzahl der fertigen Sprachen, nicht mehr aus
            einem festen `grid-cols-2`. Als Inline-Style und nicht als Tailwind-Klasse, weil eine
            zur Laufzeit zusammengesetzte Klasse (`grid-cols-${n}`) vom Tailwind-Scanner nicht
            gefunden und deshalb gar nicht erst gebaut würde. */}
        {firstTime && (
          <div className="un-block mt-4">
            <div className="un-slabel text-meta-1 uppercase tracking-widest opacity-40 mb-1.5">{t("name.lang.label")}</div>
            <div className="un-lang grid gap-2"
              style={{ gridTemplateColumns: `repeat(${READY_LOCALES.length}, minmax(0, 1fr))` }}>
              {READY_LOCALES.map((l) => {
                const on = locale === l.id;
                return (
                  /* #kante: gewählte Sprache mit violetter Kante und Schein statt gefüllter Fläche. */
                  <button key={l.id} type="button" role="radio" aria-checked={on}
                    onClick={() => { setLocaleId(l.id); if (onLang) onLang(l.id); }}
                    className={`${on ? "as-edge-strong" : "as-edge-neutral"} as-edge-thin px-3 py-2 rounded-lg text-body-lg-5 font-semibold transition-all`}
                    style={on ? { "--c": `var(--deck-a1, ${VI})` } : undefined}>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live-Vorschau: so steht der Name später in der Rangliste (eigene Zeile, grün hervorgehoben). */}
        <div className="un-block mt-3">
          <div className="un-slabel text-meta-1 uppercase tracking-widest opacity-40 mb-1">{t("name.preview.label")}</div>
          {/* #zeichensatz: ♔ statt 🥇 — dasselbe Zeichen, das im Glossar für Bestenliste und Ranglisten-Lauf
              steht, und einfarbig wie der Rest. In der breiten Fassung sitzt es in einem runden Chip. */}
          <div className="un-prev flex items-center gap-2 text-body-lg-5 px-2 py-1.5 rounded"
            style={{ background: "#5ab87a22", border: "1px solid #5ab87a66" }}>
            <span className="un-prevchip w-6 shrink-0 text-center" style={{ fontSize: "14px", color: "#d8b25e" }}>♔</span>
            <span className="un-prevname flex-1 truncate font-semibold" style={{ color: trimmed ? "#5ab87a" : "#5f6b62" }}>
              {trimmed || t("name.placeholder")}<span className="opacity-60 text-body-5"> · {t("name.preview.you")}</span>
            </span>
            <span className="un-prevscore shrink-0 ty-num-sm opacity-70" style={{ color: "#cfeede" }}>{fmtNum(1337000)}</span>
          </div>
        </div>
        </div>

        </div>
      </div>
    </div>
  ));
}
