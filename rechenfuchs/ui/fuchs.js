// Platzhalter-Fuchs als SVG. Accessoires sind eigene Gruppen und werden nur gezeichnet, wenn sie freigeschaltet sind.

const FARBEN = { fell: '#e8863a', ohr: '#f7c9a3', hell: '#fff7ee', dunkel: '#2b2b2b' };

const ACCESSOIRE_TEILE = {
  // sitzt auf dem Kopf, wird vor den Ohren gezeichnet, damit die Ohren herausschauen
  muetze: `<g class="accessoire accessoire-muetze">
    <path d="M 40 84 Q 100 -8 160 84 Z" fill="#3b6fd4"/>
    <path d="M 34 78 Q 100 60 166 78 L 166 92 Q 100 74 34 92 Z" fill="#2e56a8"/>
    <circle cx="100" cy="36" r="10" fill="#fff"/>
  </g>`,
  brille: `<g class="accessoire accessoire-brille" fill="rgba(255,255,255,0.35)" stroke="${FARBEN.dunkel}" stroke-width="3.5">
    <circle cx="78" cy="106" r="15"/>
    <circle cx="122" cy="106" r="15"/>
    <path d="M 93 106 L 107 106 M 63 104 L 46 100 M 137 104 L 154 100" fill="none" stroke-linecap="round"/>
  </g>`,
  halstuch: `<g class="accessoire accessoire-halstuch">
    <path d="M 48 152 Q 100 180 152 152 L 152 164 Q 100 192 48 164 Z" fill="#c23a2e"/>
    <path d="M 74 168 Q 100 184 126 168 L 100 198 Z" fill="#d9483b"/>
  </g>`,
  blume: `<g class="accessoire accessoire-blume">
    ${[0, 72, 144, 216, 288].map((winkel) => {
      const rad = (winkel * Math.PI) / 180;
      return `<circle cx="${(146 + 9 * Math.cos(rad)).toFixed(1)}" cy="${(64 + 9 * Math.sin(rad)).toFixed(1)}" r="7" fill="#f28cb1"/>`;
    }).join('')}
    <circle cx="146" cy="64" r="5.5" fill="#f5c542"/>
  </g>`,
};

// Inneres des SVG (ohne <svg>-Hülle), damit dieselbe Zeichnung auch fürs Icon taugt.
export function fuchsInhalt(accessoires = []) {
  const hat = (id) => accessoires.includes(id);
  return `
    <ellipse cx="100" cy="112" rx="64" ry="56" fill="${FARBEN.fell}"/>
    ${hat('muetze') ? ACCESSOIRE_TEILE.muetze : ''}
    <polygon points="48,78 70,14 100,70" fill="${FARBEN.fell}"/>
    <polygon points="152,78 130,14 100,70" fill="${FARBEN.fell}"/>
    <polygon points="60,72 71,32 88,66" fill="${FARBEN.ohr}"/>
    <polygon points="140,72 129,32 112,66" fill="${FARBEN.ohr}"/>
    <ellipse cx="76" cy="134" rx="26" ry="22" fill="${FARBEN.hell}"/>
    <ellipse cx="124" cy="134" rx="26" ry="22" fill="${FARBEN.hell}"/>
    <ellipse cx="100" cy="146" rx="34" ry="22" fill="${FARBEN.hell}"/>
    <circle cx="78" cy="106" r="7" fill="${FARBEN.dunkel}"/>
    <circle cx="122" cy="106" r="7" fill="${FARBEN.dunkel}"/>
    <circle cx="80.5" cy="103.5" r="2.2" fill="#fff"/>
    <circle cx="124.5" cy="103.5" r="2.2" fill="#fff"/>
    <ellipse cx="100" cy="132" rx="9" ry="6.5" fill="${FARBEN.dunkel}"/>
    <path d="M 100 138 Q 100 149 89 151 M 100 138 Q 100 149 111 151" stroke="${FARBEN.dunkel}" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${hat('brille') ? ACCESSOIRE_TEILE.brille : ''}
    ${hat('halstuch') ? ACCESSOIRE_TEILE.halstuch : ''}
    ${hat('blume') ? ACCESSOIRE_TEILE.blume : ''}
  `;
}

export function fuchsSvg(accessoires = [], { klasse = 'fuchs', label = 'Dein Fuchs' } = {}) {
  return `<svg class="${klasse}" viewBox="0 0 200 200" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${fuchsInhalt(accessoires)}</svg>`;
}
