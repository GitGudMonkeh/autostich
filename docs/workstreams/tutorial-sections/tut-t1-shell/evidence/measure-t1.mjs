/* T1 — the three levels measured in the real production build, 390 x 844, in BOTH languages.
   Reproduces the numbers in ../handoff.md.

     npm run build
     npx vite preview --port 5190 --strictPort --base /autostich/     # the --base is mandatory
     node docs/workstreams/tutorial-sections/tut-t1-shell/evidence/measure-t1.mjs

   IT NEEDS A MOUNT POINT, AND T1 DOES NOT OWN ONE. The hub entry belongs to T9; until it lands, this
   script has nothing to click. The measurements it produced were taken with a temporary scaffold in
   App.jsx (a `secOpen` state and a render of <TutorialSections>) that was DELIBERATELY NOT COMMITTED —
   wiring the hub inside T1 would have been T9's scope. To re-measure before T9 lands, re-add that
   scaffold, run this, and revert it. After T9 lands, the script works as it stands.

   ONE TRAP, PAID FOR ONCE: two `.click()` calls inside a single evaluate() do not let React flush
   between them, so a swap looks like it did nothing. The `-probe` rows in measurements.json report
   `changed: false` for exactly that reason — the Probierfeld itself is fine, and a separate run with
   250 ms between the taps showed 9,9,4,9,4 -> 9,9,9,4,4 and the readout moving x1,88 -> x1,50. */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate, screenshot }
  from "../../../../../scripts/cdp.mjs";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out"); mkdirSync(OUT, { recursive: true });

const MEASURE = `(() => {
  const r = (n) => { const b = n.getBoundingClientRect();
    return { y:+b.y.toFixed(1), w:+b.width.toFixed(1), h:+b.height.toFixed(1), bottom:+b.bottom.toFixed(1) }; };
  const card = document.querySelector("#tut-proto .tut-card") || document.querySelector(".tut-card");
  if (!card) return JSON.stringify({ found:false });
  const head = document.querySelector(".tut-head"), scroll = document.querySelector(".tut-scroll"), foot = document.querySelector(".tut-foot");
  const beats = [...document.querySelectorAll(".tut-beat")].map((n) => {
    const b = n.getBoundingClientRect();
    return { kind: (n.className.match(/tut-(satz|bild|probe|merk)/)||[])[1] || "?", h:+b.height.toFixed(1), bottom:+b.bottom.toFixed(1) };
  });
  const taps = [...card.querySelectorAll("button")].map((n) => { const b = n.getBoundingClientRect();
    return { label:(n.textContent||"").trim().slice(0,16), w:+b.width.toFixed(1), h:+b.height.toFixed(1) }; });
  return JSON.stringify({
    found:true, card:r(card), head:r(head), foot:r(foot), scroll:r(scroll),
    contentH: scroll.scrollHeight, visibleH: scroll.clientHeight,
    overflowPx: Math.max(0, scroll.scrollHeight - scroll.clientHeight),
    hiddenByFoot: beats.filter(b => b.bottom > scroll.getBoundingClientRect().bottom).map(b => b.kind),
    airAbove: +card.getBoundingClientRect().y.toFixed(1),
    airBelow: +(innerHeight - card.getBoundingClientRect().bottom).toFixed(1),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth || scroll.scrollWidth > scroll.clientWidth,
    beats, tapsUnder44: taps.filter(t => t.h < 44 || t.w < 44),
  });
})()`;

const c = await launch({ port: 9401 });
await c.send("Page.enable"); await c.send("Runtime.enable");
await setViewport(c, { width: 390, height: 844, deviceScaleFactor: 2 });
await reduceMotion(c); await seedRandom(c); await suppressInstallPrompt(c);

const results = {};
for (const lang of ["de", "en"]) {
  await goto(c, "http://localhost:5190/autostich/", { settleMs: 2500 });
  const n = await evaluate(c, `document.querySelectorAll("#root *").length`);
  if (n < 50) throw new Error(`App nicht gemountet (${n} Knoten)`);
  await evaluate(c, `(() => { try { const o = JSON.parse(localStorage.getItem("as_options")||"{}"); o.lang="${lang}"; localStorage.setItem("as_options", JSON.stringify(o)); } catch(e){} return 1; })()`);
  await goto(c, "http://localhost:5190/autostich/", { settleMs: 2500 });
  // Tutorial-Chip oeffnen
  const opened = await evaluate(c, `(() => { const b=[...document.querySelectorAll("button")].find(x=>/tutorial/i.test(x.getAttribute("aria-label")||"")); if(b){b.click();return true;} return false; })()`);
  if (!opened) throw new Error("Tutorial-Chip nicht gefunden");
  await new Promise(r => setTimeout(r, 500));
  results[`${lang}-1-themen`] = JSON.parse(await evaluate(c, MEASURE));
  writeFileSync(join(OUT, `${lang}-1-themen.png`), Buffer.from(await screenshot(c), "base64"));
  // Ebene 2: erste Sektion
  await evaluate(c, `document.querySelectorAll(".tut-row")[1].click()`);
  await new Promise(r => setTimeout(r, 350));
  results[`${lang}-2-lektionen`] = JSON.parse(await evaluate(c, MEASURE));
  writeFileSync(join(OUT, `${lang}-2-lektionen.png`), Buffer.from(await screenshot(c), "base64"));
  // Ebene 3: die Lektion mit Probierfeld
  await evaluate(c, `document.querySelectorAll(".tut-row")[0].click()`);
  await new Promise(r => setTimeout(r, 350));
  results[`${lang}-3-lektion`] = JSON.parse(await evaluate(c, MEASURE));
  writeFileSync(join(OUT, `${lang}-3-lektion.png`), Buffer.from(await screenshot(c), "base64"));
  // Probierfeld wirklich bedienen: zwei Zellen tauschen, Ablesung vorher/nachher
  const before = await evaluate(c, `document.querySelector(".tut-probe-out").textContent`);
  await evaluate(c, `(() => { const c=document.querySelectorAll(".tut-cell"); c[2].click(); c[1].click(); return 1; })()`);
  await new Promise(r => setTimeout(r, 300));
  const after = await evaluate(c, `document.querySelector(".tut-probe-out").textContent`);
  results[`${lang}-probe`] = { before, after, changed: before !== after };
  writeFileSync(join(OUT, `${lang}-4-probe.png`), Buffer.from(await screenshot(c), "base64"));
}
writeFileSync(join(OUT, "measurements.json"), JSON.stringify(results, null, 2));
for (const [k, v] of Object.entries(results)) {
  if (v.before !== undefined) { console.log(`${k}: "${v.before}" -> "${v.after}"  geaendert=${v.changed}`); continue; }
  console.log(`${k}: Karte ${v.card.w}x${v.card.h} | Inhalt ${v.contentH}/${v.visibleH} | Ueberhang ${v.overflowPx} | verdeckt ${v.hiddenByFoot.join(",")||"nichts"} | Luft ${v.airAbove}/${v.airBelow} | Querlauf ${v.horizontalOverflow} | Tippziele<44 ${v.tapsUnder44.length}`);
}
await c.close();
