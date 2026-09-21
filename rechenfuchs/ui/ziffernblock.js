// Ziffernblock mit großen Tasten statt iPad-Tastatur. Hält nur den Eingabetext und meldet
// Änderungen und Bestätigung nach außen. Hardware-Tastatur wird über tasteVonTastatur() angebunden.

const TASTEN = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'loeschen', '0', 'ok'];

export function erzeugeZiffernblock(container, { maxStellen = 4, texte, beiAenderung, beiBestaetigen }) {
  let wert = '';
  let aktiv = true;

  container.classList.add('ziffernblock');
  container.innerHTML = TASTEN.map((taste) => {
    if (taste === 'loeschen') return `<button type="button" class="taste taste-loeschen" data-taste="loeschen" aria-label="${texte.loeschen}">⌫</button>`;
    if (taste === 'ok') return `<button type="button" class="taste taste-ok" data-taste="ok" aria-label="${texte.antwortPruefenLabel}">${texte.antwortPruefen}</button>`;
    return `<button type="button" class="taste taste-ziffer" data-taste="${taste}">${taste}</button>`;
  }).join('');
  const okTaste = container.querySelector('[data-taste="ok"]');

  function melde() {
    okTaste.disabled = !aktiv || wert === '';
    beiAenderung(wert);
  }

  function tippe(taste) {
    if (!aktiv) return false;
    if (taste === 'loeschen') {
      wert = wert.slice(0, -1);
    } else if (taste === 'ok') {
      if (wert === '') return false;
      beiBestaetigen(Number(wert));
      return true;
    } else if (/^[0-9]$/.test(taste)) {
      if (wert.length >= maxStellen) return false;
      wert = wert === '0' ? taste : wert + taste;
    } else {
      return false;
    }
    melde();
    return true;
  }

  container.addEventListener('click', (ev) => {
    const knopf = ev.target.closest('[data-taste]');
    if (knopf) tippe(knopf.dataset.taste);
  });

  melde();

  return {
    tippe,
    tasteVonTastatur(key) {
      if (key === 'Backspace') return tippe('loeschen');
      if (key === 'Enter') return tippe('ok');
      if (/^[0-9]$/.test(key)) return tippe(key);
      return false;
    },
    leeren() {
      wert = '';
      melde();
    },
    setzeAktiv(neu) {
      aktiv = neu;
      container.classList.toggle('ist-inaktiv', !aktiv);
      for (const taste of container.querySelectorAll('.taste')) taste.disabled = !aktiv;
      okTaste.disabled = !aktiv || wert === '';
    },
    get wert() {
      return wert;
    },
  };
}
