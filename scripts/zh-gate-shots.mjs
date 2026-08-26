#!/usr/bin/env node
/* #zh-hans — Belege fuer das Sichtgate: dieselbe Flaeche zweimal, chinesisch und deutsch.
   ============================================================================

     node scripts/vendor-noto-sc.mjs --check     (Schrift muss liegen)
     npm run dev -- --port 5198 --strictPort     (mit VITE_PREVIEW=1)
     node scripts/zh-gate-shots.mjs

   WARUM PAARWEISE. Ein einzelnes chinesisches Bild beantwortet nicht, ob der Zweig zu weit greift.
   Zwei Bilder derselben Flaeche, nur mit anderem `lang`, beantworten es: was sich auf der deutschen
   Seite bewegt, ist ein Fehler, egal wie gut die chinesische aussieht. Das ist Tripwire 1 als Bild
   statt als Zahl.

   WARUM UEBER DIE KATALOGE GEKLICKT WIRD. Die Knopfbeschriftungen unterscheiden sich je Sprache;
   fest verdrahtete Selektoren waeren in der einen Sprache richtig und in der anderen still falsch.
   Deshalb kommt jedes Klickziel aus `t(key, null, locale)` — dieselbe Quelle, aus der die Oberflaeche
   ihre Beschriftung nimmt. Findet ein Ziel sich nicht, wird das gemeldet und weitergemacht: ein
   fehlendes Bild ist ein Befund, kein Grund, die anderen zu verlieren.

   Kein Playwright, kein neues Paket — scripts/cdp.mjs, wie viewport-proof und phone-proof. */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
  goto, evaluate, screenshot, sleep } from "./cdp.mjs";
import { t } from "../src/i18n/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ZIEL = resolve(HERE, "../docs/workstreams/zh-hans/zh-hans-sample/gate");
const BASIS = process.env.ZH_GATE_URL || "http://localhost:5198";

/* Das Geraet aus den Screenshots des Owners, damit die Bilder vergleichbar sind. */
const VIEWPORT = { width: 411, height: 840, deviceScaleFactor: 2.63 };
const SPRACHEN = ["zh-Hans", "de"];

/* Jede Flaeche: wie sie geoeffnet wird (Katalogschluessel des Knopfes) und wie sie wieder zugeht. */
const FLAECHEN = [
  { id: "1-willkommen", oeffnen: null,                  schliessen: null },
  { id: "2-hub",        oeffnen: null,                  schliessen: null },
  { id: "3-optionen",   oeffnen: "start.options",       schliessen: "escape" },
  { id: "4-werkstatt",  oeffnen: "start.tile.workshop", schliessen: "escape" },
  { id: "5-tutorial",   oeffnen: "start.tutorial",      schliessen: "escape" },
];

/* Klick auf das Element, dessen sichtbarer Text der Beschriftung entspricht. Kleinstes passendes
   Element gewinnt, sonst trifft man den Container statt des Knopfes. */
const KLICK = (label) => `(() => {
  const ziel = ${JSON.stringify(label)};
  const treffer = [...document.querySelectorAll('button, [role="button"], a')]
    .filter((e) => (e.innerText || "").trim().includes(ziel) && e.offsetParent !== null)
    .sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
  if (!treffer.length) return "nicht gefunden";
  treffer[0].click();
  return "ok";
})()`;

const NAME_SETZEN = `(() => {
  const feld = document.querySelector('input[type="text"], input:not([type])');
  if (!feld) return "kein Feld";
  const setzer = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setzer.call(feld, "Gate");
  feld.dispatchEvent(new Event("input", { bubbles: true }));
  return "ok";
})()`;

mkdirSync(ZIEL, { recursive: true });
const c = await launch();
const notiz = [];
try {
  /* Ohne diese beiden Zeilen schickt der Browser keine Page-Events, und `goto` wartet ewig auf
     ein `Page.loadEventFired`, das nie kommt. Jeder andere Aufrufer von cdp.mjs macht das ebenso;
     der Client selbst schaltet die Domains bewusst nicht ein. */
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await setViewport(c, VIEWPORT);
  await reduceMotion(c);
  await seedRandom(c);
  await suppressInstallPrompt(c);

  for (const locale of SPRACHEN) {
    await goto(c, `${BASIS}/?lang=${locale}`, { settleMs: 2000 });
    /* Auf die Schrift warten: ein Bild vor dem Tausch zeigt die Ersatzschrift und beweist nichts. */
    await evaluate(c, "document.fonts.ready.then(() => 1)");
    await sleep(400);

    for (const f of FLAECHEN) {
      if (f.id === "2-hub") {
        await evaluate(c, NAME_SETZEN);
        await sleep(150);
        const gespeichert = await evaluate(c, KLICK(t("name.save", null, locale)));
        notiz.push(`${locale} ${f.id}: Name speichern → ${gespeichert}`);
        await sleep(700);
      } else if (f.oeffnen) {
        const r = await evaluate(c, KLICK(t(f.oeffnen, null, locale)));
        notiz.push(`${locale} ${f.id}: oeffnen → ${r}`);
        await sleep(800);
      }

      const datei = join(ZIEL, `${f.id}-${locale}.webp`);
      const b64 = await screenshot(c, null, { format: "webp", quality: 86 });
      writeFileSync(datei, Buffer.from(b64, "base64"));
      console.log(`  ${f.id}-${locale}.webp`);

      if (f.schliessen === "escape") {
        await evaluate(c, `(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return 1; })()`);
        await sleep(500);
      }
    }

    /* DIE DICHTEN FLAECHEN. Die Menues oben sind die leichte Haelfte; Typografie bricht dort, wo
       viel Text auf wenig Platz trifft — HUD, Status-Leiste, Aufstellung, Kartenuebersicht. Die
       liegen alle IM Lauf.

       Der DEV RUN waere der kurze Weg dorthin, aber er hat keinen Einstieg mehr: `onDevRun` wird
       in App.jsx an StartScreen uebergeben und dort nicht ausgepackt, der Zustand `showDevSetup`
       ist damit unerreichbar. Also ueber einen normalen Lauf. */
    const lauf = await evaluate(c, KLICK(t("start.normal", null, locale)));
    notiz.push(`${locale} lauf: starten → ${lauf}`);
    await sleep(2500);

    const b1 = await screenshot(c, null, { format: "webp", quality: 86 });
    writeFileSync(join(ZIEL, `6-lauf-start-${locale}.webp`), Buffer.from(b1, "base64"));
    console.log(`  6-lauf-start-${locale}.webp`);

    /* Kartenuebersicht: 40 Karten mit ihren Formations-Kuerzeln — der dichteste Text im Spiel und
       die einzige Flaeche, auf der die acht Ein-Zeichen-Kuerzel nebeneinander stehen. */
    const chronik = await evaluate(c, KLICK(t("hud.cards", null, locale)));
    notiz.push(`${locale} lauf: Kartenuebersicht → ${chronik}`);
    await sleep(1200);
    const b2 = await screenshot(c, null, { format: "webp", quality: 86 });
    writeFileSync(join(ZIEL, `7-chronik-${locale}.webp`), Buffer.from(b2, "base64"));
    console.log(`  7-chronik-${locale}.webp`);
    await evaluate(c, `(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return 1; })()`);
    await sleep(600);

    /* Hoechstes Tempo, dann laufen lassen: nach 40 Stichen endet der Durchlauf und die naechste
       Entscheidung steht an — Aufstellung oder eine Wahl. Beides ist Flaeche mit viel Text. */
    await evaluate(c, KLICK(t("hud.speed.max.label", null, locale)));
    await sleep(300);
    await evaluate(c, KLICK(t("bf.ready", null, locale)));
    await sleep(20000);
    const b3 = await screenshot(c, null, { format: "webp", quality: 86 });
    writeFileSync(join(ZIEL, `8-nach-durchlauf-${locale}.webp`), Buffer.from(b3, "base64"));
    console.log(`  8-nach-durchlauf-${locale}.webp`);
  }
} finally {
  await c.close();
}

console.log("");
for (const n of notiz) console.log("  " + n);
console.log(`\nBilder: docs/workstreams/zh-hans/zh-hans-sample/gate/ (${VIEWPORT.width}x${VIEWPORT.height} @${VIEWPORT.deviceScaleFactor})`);
