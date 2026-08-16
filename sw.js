/* Autostich Service Worker (#perf C1) — handgeschrieben, ohne Build-Plugin, damit es keine versteckten Nebenwirkungen
   auf den Desktop-Build gibt. Ziele: (1) Offline-Fähigkeit + Instant-Repeat-Load der App-Shell; (2) content-gehashte
   Assets (JS/CSS/Bilder/Fonts) dauerhaft cachen → keine Re-Downloads bei Folgebesuchen.

   BEWUSST SICHER (keine Regression, v. a. Ton/Bestenliste):
   - Cross-Origin-Requests (z. B. Supabase-Bestenliste) werden NIE angefasst → immer frische Netzdaten.
   - Range-/Media-Requests (die <audio> für die Musik stellt) werden NICHT abgefangen → kein Eingriff ins Streaming/
     Seeking, kein 206-Caching. Musik läuft exakt wie bisher.
   - Nur GET + nur Status-200 werden gecacht. Navigationen laufen Network-First (neue Deploys sofort sichtbar),
     Offline-Fallback ist die vorgecachte Shell. */
const VERSION = "v1";
const CACHE = `autostich-${VERSION}`;
// Basis-Pfad = Verzeichnis, in dem der SW liegt (Prod: /autostich/…). Die App-Shell wird hierunter gecacht.
const BASE = self.location.pathname.replace(/sw\.js$/, "");

self.addEventListener("install", (e) => {
  self.skipWaiting();
  // App-Shell vorcachen (Offline-Fallback für Navigationen). Fehlschlag ist unkritisch (Runtime-Cache fängt es später).
  e.waitUntil(caches.open(CACHE).then((c) => c.add(BASE)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("autostich-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // nur GET
  if (req.headers.has("range")) return;                   // Media/Range direkt ans Netz — SW mischt sich NICHT ein
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Fremdhosts (Supabase & Co.) nie cachen → immer frisch

  // Navigationen: Network-First mit Offline-Fallback auf die vorgecachte Shell.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try { return await fetch(req); }
      catch (err) { return (await caches.match(BASE)) || Response.error(); }
    })());
    return;
  }

  // Content-gehashte statische Assets: Cache-First (unveränderlich) + im Hintergrund ablegen. Spart Re-Downloads
  // bei Folgebesuchen und ermöglicht Offline. Audio bleibt via Range-Bypass (oben) außen vor.
  if (url.pathname.includes("/assets/") || /\.(?:webp|png|jpe?g|svg|woff2?|ttf|css|js|webmanifest)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        if (net && net.status === 200) {                  // NUR vollständige 200-Antworten cachen
          const clone = net.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return net;
      } catch (err) {
        return (await caches.match(req)) || Response.error();
      }
    })());
  }
});
