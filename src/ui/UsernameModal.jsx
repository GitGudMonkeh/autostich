import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx"; // #362 einheitliche Aktionsleiste oben
import { LOCALES, fmtNum } from "../i18n/index.js";
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
const CY = "#26c6e6", VI = "#9b82f0", AM = "#f2a83a"; // Logo-Verlauf (links→mitte→rechts)
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

  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={MODAL_CARD}>
        <ModalHairline />
        <div className="p-6">
        {/* #362 Aktionsleiste OBEN — Abbrechen links, Speichern rechts. */}
        <ActionBar pad={6} bg={STICKY_HEAD_BG}>
          {!firstTime && <ActionButton kind="secondary" onClick={onClose}>{t("name.cancel")}</ActionButton>}
          <span className="flex-1" />
          <ActionButton kind="primary" disabled={!canSave} onClick={submit}>{t("name.save")}</ActionButton>
        </ActionBar>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: CY }}>
            {t(firstTime ? "name.eyebrow.first" : "name.eyebrow.change")}
          </div>
          {/* Gradient-Wortmarke (Logo-Verlauf) mit weichem Glühschimmer statt schlichter Textzeile. */}
          <h2 className="text-xl font-bold mt-1 font-pixel"
            style={{ backgroundImage: `linear-gradient(90deg, ${CY}, ${VI}, ${AM})`,
                     WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                     filter: "drop-shadow(0 0 10px rgba(155,130,240,0.35))" }}>
            {t(firstTime ? "name.title.first" : "name.title.change")}
          </h2>
        </div>

        {/* Eingabefeld im pulsierenden Cyan-Glührahmen (wie der „Lauf fortsetzen"-Rahmen). */}
        <div className="as-guide-glow rounded-lg">
          <input autoFocus value={name} maxLength={MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={t("name.placeholder")}
            aria-invalid={!!errKey}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-center font-semibold tracking-wide"
            style={{ background: errKey ? "#221114" : "#0e1b22", border: `1px solid ${errKey ? ER : CY}`,
                     color: errKey ? "#f0bdb8" : "#a8ecf7" }} />
        </div>
        <div className="text-[11px] opacity-45 mt-2 leading-snug">
          {t("name.hint", { max: MAX })}
          {/* #datenschutz: Genau HIER wird der Name gewählt, der später an den globalen Highscore-Einträgen
              hängt — für alle sichtbar. Der Hinweis gehört deshalb an diese Zeile und nicht nur ins Menü:
              die Entscheidung „welchen Namen gebe ich mir" fällt in diesem Moment, nicht später. */}
          {onPrivacy && (
            <button type="button" onClick={onPrivacy}
              className="underline underline-offset-2 ml-1 font-semibold opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: VI }}>{t("privacy.link")}</button>
          )}
        </div>
        {/* #174 Begründung zum toten Speichern-Knopf. role=alert, damit Screenreader sie
            beim Tippen ansagen — sonst bleibt der Knopf für sie grundlos unbenutzbar. */}
        {errKey && (
          <div role="alert" className="text-[11px] mt-1.5 leading-snug font-semibold" style={{ color: ER }}>
            {t(errKey, { max: MAX })}
          </div>
        )}

        {/* #sprache — nur beim Erststart. Zwei gleich breite Knöpfe, damit keine der beiden Sprachen
            wie die „richtige" aussieht. Die Umschaltung wirkt SOFORT (der Dialog selbst wechselt mit),
            damit man das Ergebnis seiner Wahl sieht, bevor man weiterklickt. */}
        {firstTime && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1.5">{t("name.lang.label")}</div>
            <div className="grid grid-cols-2 gap-2">
              {LOCALES.map((l) => {
                const on = locale === l.id;
                return (
                  <button key={l.id} type="button" role="radio" aria-checked={on}
                    onClick={() => { setLocaleId(l.id); if (onLang) onLang(l.id); }}
                    className="px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={on
                      ? { background: VI, color: "#141419", boxShadow: `0 0 12px ${VI}66` }
                      : { background: "#20202a", color: "#c8c8d0", border: "1px solid #30303a" }}>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live-Vorschau: so steht der Name später in der Rangliste (eigene Zeile, grün hervorgehoben). */}
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">{t("name.preview.label")}</div>
          <div className="flex items-center gap-2 text-sm px-2 py-1.5 rounded"
            style={{ background: "#5ab87a22", border: "1px solid #5ab87a66" }}>
            <span className="w-6 shrink-0 text-center" style={{ fontSize: "14px" }}>🥇</span>
            <span className="flex-1 truncate font-semibold" style={{ color: trimmed ? "#5ab87a" : "#5f6b62" }}>
              {trimmed || t("name.placeholder")}<span className="opacity-60 text-xs"> · {t("name.preview.you")}</span>
            </span>
            <span className="shrink-0 tabular-nums opacity-70" style={{ color: "#cfeede" }}>{fmtNum(1337000)}</span>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
