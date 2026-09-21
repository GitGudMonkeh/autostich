// Kleiner statischer Server für die lokale Entwicklung – ES-Module laufen nicht über file://.
// Keine Abhängigkeiten. Start: `npm start` oder `node scripts/lokal-server.js [port]`.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8000);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let pfad = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pfad.endsWith('/')) pfad += 'index.html';
    const datei = normalize(join(WURZEL, pfad));
    if (datei !== WURZEL && !datei.startsWith(WURZEL + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Verboten');
    }
    const info = await stat(datei);
    if (info.isDirectory()) {
      res.writeHead(301, { Location: `${pfad}/` });
      return res.end();
    }
    const inhalt = await readFile(datei);
    res.writeHead(200, { 'Content-Type': MIME[extname(datei).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    return res.end(inhalt);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Nicht gefunden');
  }
}).listen(PORT, () => {
  console.log(`Rechenfuchs läuft: http://localhost:${PORT}/`);
});
