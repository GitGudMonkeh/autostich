// Schreibt icon/fuchs.svg aus derselben Zeichnung, die die App benutzt (Favicon, Quelle fürs Home-Bildschirm-Icon).
// Das PNG (icon/apple-touch-icon.png, 180×180) wird daraus einmalig mit einem Browser gerendert und eingecheckt.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fuchsInhalt } from '../ui/fuchs.js';

const ziel = fileURLToPath(new URL('../icon/fuchs.svg', import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 220 220">
  <rect x="-10" y="-10" width="220" height="220" fill="#fff6e9"/>
  ${fuchsInhalt([])}
</svg>
`;
await writeFile(ziel, svg, 'utf8');
console.log(`geschrieben: ${ziel}`);
