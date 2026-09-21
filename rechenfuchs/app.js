// Einstieg der App: Screens, Rundenablauf, Ereignisse. Rechnen, Speichern und Belohnen liegen in den Modulen.

import { WEITER_NACH_RICHTIG_MS, MAX_STELLEN } from './regeln.js';
import { KAPITEL, findeUnterkapitel } from './aufgaben/kapitel.js';
import { erzeugeRunde } from './aufgaben/generatoren.js';
import { SYMBOL, hinweisZurAntwort } from './aufgaben/kopfrechnen.js';
import { erzeugeSpeicher, unterkapitelStand, verbucheAntwort, verbucheRunde } from './fortschritt/speicher.js';
import { neueFreischaltungen, schalteFrei, naechsteFreischaltung } from './fortschritt/belohnung.js';
import { TEXTE } from './ui/texte.js';
import { fuchsSvg } from './ui/fuchs.js';
import { erzeugeZiffernblock } from './ui/ziffernblock.js';

const $ = (id) => document.getElementById(id);
const esc = (text) => String(text).replace(/[&<>"']/g, (zeichen) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[zeichen]));

const speicher = erzeugeSpeicher();
const fortschritt = speicher.laden();

let aktiverScreen = null;
let runde = null;        // { unterkapitel, stufe, aufgaben, index, ergebnisse, punkteVorher, wartetAufWeiter }
let weiterTimer = null;  // läuft nach einer richtigen Antwort bis zur nächsten Aufgabe

const ziffernblock = erzeugeZiffernblock($('runde-ziffernblock'), {
  maxStellen: MAX_STELLEN,
  texte: TEXTE.runde,
  beiAenderung: zeigeEingabe,
  beiBestaetigen: pruefeAntwort,
});

function zeigeScreen(name) {
  for (const screen of document.querySelectorAll('.screen')) screen.hidden = screen.id !== `screen-${name}`;
  aktiverScreen = name;
  window.scrollTo(0, 0);
}

function belohnungsText() {
  const naechste = naechsteFreischaltung(fortschritt);
  return naechste ? TEXTE.start.naechsteBelohnung(naechste.fehlend) : TEXTE.start.allesFreigeschaltet;
}

/* ---------- Startseite ---------- */

function zeigeStart() {
  stoppeWeiterTimer();
  runde = null;
  $('start-begruessung').textContent = TEXTE.start.begruessung;
  $('start-fuchs').innerHTML = fuchsSvg(fortschritt.freigeschaltet, { label: TEXTE.fuchsLabel });
  $('start-punkte').textContent = TEXTE.start.punkte(fortschritt.punkte);
  $('start-belohnung').textContent = belohnungsText();
  $('start-kapitel').innerHTML = KAPITEL.map(kapitelHtml).join('');
  zeigeScreen('start');
}

function kapitelHtml(kapitel) {
  const abschnitte = kapitel.abschnitte.map((abschnitt) => `
    <h3 class="abschnitt-titel">${esc(abschnitt.titel)}</h3>
    <div class="unterkapitel-liste">${abschnitt.unterkapitel.map(unterkapitelHtml).join('')}</div>`).join('');
  return `<section class="kapitel">
    <h2 class="kapitel-titel">${esc(kapitel.titel)} <span class="kapitel-untertitel">${esc(kapitel.untertitel)}</span></h2>
    ${abschnitte}
  </section>`;
}

function unterkapitelHtml(unterkapitel) {
  const stand = fortschritt.unterkapitel[unterkapitel.id];
  const standText = stand && stand.letzteRunde
    ? TEXTE.start.letzteRunde(stand.letzteRunde.richtig, stand.letzteRunde.von)
    : TEXTE.start.nochNichtGeuebt;
  return `<button type="button" class="karte unterkapitel" data-unterkapitel="${esc(unterkapitel.id)}">
    <span class="unterkapitel-text">
      <span class="unterkapitel-titel">${esc(unterkapitel.titel)}</span>
      <span class="unterkapitel-beispiel">${esc(TEXTE.start.beispiel(unterkapitel.beispiel))}</span>
      <span class="unterkapitel-stand">${esc(standText)}</span>
    </span>
    <span class="stufe-abzeichen">${esc(TEXTE.start.stufe(stand ? stand.stufe : 1))}</span>
  </button>`;
}

/* ---------- Übungsrunde ---------- */

function starteRunde(unterkapitelId) {
  const unterkapitel = findeUnterkapitel(unterkapitelId);
  if (!unterkapitel) return;
  const stand = unterkapitelStand(fortschritt, unterkapitelId);
  runde = {
    unterkapitel,
    stufe: stand.stufe,
    aufgaben: erzeugeRunde(unterkapitel.generator, { stufe: stand.stufe }),
    index: 0,
    ergebnisse: [],
    punkteVorher: fortschritt.punkte,
    wartetAufWeiter: false,
  };
  $('runde-titel').textContent = unterkapitel.titel;
  zeigeScreen('runde');
  zeigeAufgabe();
}

const aktuelleAufgabe = () => runde.aufgaben[runde.index];

function zeigeAufgabe() {
  const aufgabe = aktuelleAufgabe();
  $('runde-zaehler').textContent = TEXTE.runde.aufgabeVon(runde.index + 1, runde.aufgaben.length);
  $('runde-term-text').textContent = aufgabe.anzeige;
  $('runde-antwort').classList.remove('ist-richtig', 'ist-nicht-richtig');
  const feedback = $('runde-feedback');
  feedback.hidden = true;
  feedback.className = 'karte feedback-karte';
  feedback.innerHTML = '';
  ziffernblock.leeren();
  ziffernblock.setzeAktiv(true);
  zeigeFortschrittspunkte();
}

function zeigeEingabe(wert) {
  $('runde-antwort').textContent = wert === '' ? '?' : wert;
}

function zeigeFortschrittspunkte() {
  $('runde-fortschritt').innerHTML = runde.aufgaben.map((_, i) => {
    const ergebnis = runde.ergebnisse[i];
    const klasse = ergebnis ? (ergebnis.richtig ? 'ist-richtig' : 'ist-nicht-richtig') : (i === runde.index ? 'ist-aktuell' : 'ist-offen');
    return `<li class="punkt ${klasse}" aria-label="${esc(TEXTE.runde.punktLabel(i + 1, ergebnis))}"></li>`;
  }).join('');
}

function pruefeAntwort(antwort) {
  if (!runde || weiterTimer || runde.wartetAufWeiter) return;
  const aufgabe = aktuelleAufgabe();
  const richtig = antwort === aufgabe.loesung;
  runde.ergebnisse.push({ antwort, richtig });
  verbucheAntwort(fortschritt, runde.unterkapitel.id, richtig);
  speicher.speichern(fortschritt);

  ziffernblock.setzeAktiv(false);
  $('runde-antwort').classList.add(richtig ? 'ist-richtig' : 'ist-nicht-richtig');
  zeigeFortschrittspunkte();

  if (richtig) {
    zeigeFeedbackRichtig();
    weiterTimer = setTimeout(naechsteAufgabe, WEITER_NACH_RICHTIG_MS);
  } else {
    zeigeFeedbackNichtRichtig(aufgabe, antwort);
  }
}

function zeigeFeedbackRichtig() {
  const feedback = $('runde-feedback');
  const lob = TEXTE.runde.lob[Math.floor(Math.random() * TEXTE.runde.lob.length)];
  feedback.classList.add('ist-richtig');
  feedback.innerHTML = `<p class="feedback-titel">${esc(lob)}</p><p class="feedback-punkt">${esc(TEXTE.runde.plusPunkt)}</p>`;
  feedback.hidden = false;
}

function zeigeFeedbackNichtRichtig(aufgabe, antwort) {
  const feedback = $('runde-feedback');
  const hinweis = hinweisZurAntwort(aufgabe, antwort);
  const schritte = aufgabe.rechenweg
    .map((schritt) => `<li>${schritt.von} ${SYMBOL[aufgabe.op]} ${schritt.teil} = ${schritt.bis}</li>`)
    .join('');
  feedback.classList.add('ist-nicht-richtig');
  feedback.innerHTML = `
    <p class="feedback-titel">${esc(TEXTE.runde.nichtGanz)}</p>
    <p class="feedback-loesung">${esc(TEXTE.runde.loesungIst(aufgabe.loesung))}</p>
    ${hinweis ? `<p class="feedback-hinweis">${esc(TEXTE.runde.hinweise[hinweis](aufgabe.op))}</p>` : ''}
    <p class="feedback-sogehts">${esc(TEXTE.runde.soGehts)}</p>
    <ol class="rechenweg">${schritte}</ol>
    <button type="button" class="knopf knopf-primaer" id="runde-weiter">${esc(TEXTE.runde.weiter)}</button>`;
  feedback.hidden = false;
  runde.wartetAufWeiter = true;
  $('runde-weiter').addEventListener('click', naechsteAufgabe);
}

function stoppeWeiterTimer() {
  if (weiterTimer) clearTimeout(weiterTimer);
  weiterTimer = null;
}

function naechsteAufgabe() {
  if (!runde) return;
  stoppeWeiterTimer();
  runde.wartetAufWeiter = false;
  runde.index += 1;
  if (runde.index >= runde.aufgaben.length) zeigeErgebnis();
  else zeigeAufgabe();
}

/* ---------- Ergebnis ---------- */

function zeigeErgebnis() {
  const richtig = runde.ergebnisse.filter((ergebnis) => ergebnis.richtig).length;
  const von = runde.aufgaben.length;
  const { aufgestiegen, stufe } = verbucheRunde(fortschritt, runde.unterkapitel.id, { richtig, von });
  const neu = neueFreischaltungen(fortschritt);
  schalteFrei(fortschritt, neu);
  speicher.speichern(fortschritt);

  $('ergebnis-titel').textContent = TEXTE.ergebnis.titel(richtig, von);
  $('ergebnis-nachricht').textContent = TEXTE.ergebnis.nachricht(richtig, von);
  $('ergebnis-punkte').textContent = TEXTE.ergebnis.punkteGesammelt(fortschritt.punkte - runde.punkteVorher, fortschritt.punkte);
  const stufeEl = $('ergebnis-stufe');
  stufeEl.hidden = !aufgestiegen;
  stufeEl.textContent = aufgestiegen ? TEXTE.ergebnis.aufgestiegen(stufe) : '';

  const jubel = neu.length > 0 || richtig >= von * 0.75;
  $('ergebnis-fuchs').innerHTML = fuchsSvg(fortschritt.freigeschaltet, { klasse: jubel ? 'fuchs jubel' : 'fuchs', label: TEXTE.fuchsLabel });
  const neuEl = $('ergebnis-neu');
  neuEl.hidden = neu.length === 0;
  neuEl.textContent = neu.map((id) => TEXTE.ergebnis.neuesAccessoire(TEXTE.accessoires[id])).join(' ');
  $('ergebnis-belohnung').textContent = belohnungsText();
  zeigeScreen('ergebnis');
}

/* ---------- Verdrahtung ---------- */

$('runde-zurueck').textContent = TEXTE.runde.zurueck;
$('runde-fortschritt').setAttribute('aria-label', TEXTE.runde.fortschrittLabel);
$('ergebnis-nochmal').textContent = TEXTE.ergebnis.nochEineRunde;
$('ergebnis-uebersicht').textContent = TEXTE.ergebnis.zurUebersicht;

$('start-kapitel').addEventListener('click', (ev) => {
  const knopf = ev.target.closest('[data-unterkapitel]');
  if (knopf) starteRunde(knopf.dataset.unterkapitel);
});
$('runde-zurueck').addEventListener('click', zeigeStart);
$('ergebnis-nochmal').addEventListener('click', () => starteRunde(runde.unterkapitel.id));
$('ergebnis-uebersicht').addEventListener('click', zeigeStart);

// Hardware-Tastatur (am Rechner): Ziffern, Rücktaste, Enter = OK bzw. Weiter.
document.addEventListener('keydown', (ev) => {
  if (aktiverScreen !== 'runde' || !runde || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (runde.wartetAufWeiter) {
    if (ev.key === 'Enter') { ev.preventDefault(); naechsteAufgabe(); }
    return;
  }
  if (weiterTimer) return;
  if (ziffernblock.tasteVonTastatur(ev.key)) ev.preventDefault();
});

zeigeStart();
