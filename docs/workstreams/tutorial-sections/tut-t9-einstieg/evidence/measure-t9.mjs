/* T9 — der echte Weg: Hub → Chip → Themenliste → Lektion → zurück, plus Fortschritt über einen Reload. */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate, screenshot }
  from "../../../../../scripts/cdp.mjs";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "out"); mkdirSync(OUT, { recursive: true });
const URL_ = "http://localhost:5192/autostich/";
const M = `(()=>{const card=document.querySelector(".tut-card");if(!card)return JSON.stringify({found:false});
 const s=document.querySelector(".tut-scroll");const r=n=>{const b=n.getBoundingClientRect();return{h:+b.height.toFixed(1),bottom:+b.bottom.toFixed(1)};};
 const taps=[...card.querySelectorAll("button")].map(n=>{const b=n.getBoundingClientRect();return{t:(n.textContent||"").trim().slice(0,18),w:+b.width.toFixed(1),h:+b.height.toFixed(1)};});
 const beats=[...document.querySelectorAll(".tut-beat")].map(n=>({k:(n.className.match(/tut-(satz|bild|probe|merk)/)||[])[1],bottom:+n.getBoundingClientRect().bottom.toFixed(1)}));
 return JSON.stringify({found:true,card:{w:+card.getBoundingClientRect().width.toFixed(1),...r(card)},
  content:s.scrollHeight,visible:s.clientHeight,overflow:Math.max(0,s.scrollHeight-s.clientHeight),
  hidden:beats.filter(b=>b.bottom>s.getBoundingClientRect().bottom).map(b=>b.k),
  airAbove:+card.getBoundingClientRect().y.toFixed(1),airBelow:+(innerHeight-card.getBoundingClientRect().bottom).toFixed(1),
  xoverflow:document.documentElement.scrollWidth>innerWidth||s.scrollWidth>s.clientWidth,
  under44:taps.filter(t=>t.h<44||t.w<44)});})()`;
const c = await launch({ port: 9410 });
await c.send("Page.enable"); await c.send("Runtime.enable");
await setViewport(c, { width: 390, height: 844, deviceScaleFactor: 2 });
await reduceMotion(c); await seedRandom(c); await suppressInstallPrompt(c);
const res = {};
for (const lang of ["de", "en"]) {
  await goto(c, URL_, { settleMs: 2500 });
  await evaluate(c, `(()=>{localStorage.clear();const o=JSON.parse(localStorage.getItem("as_options")||"{}");o.lang="${lang}";localStorage.setItem("as_options",JSON.stringify(o));return 1})()`);
  await goto(c, URL_, { settleMs: 2500 });
  if (await evaluate(c, `document.querySelectorAll("#root *").length`) < 50) throw new Error("nicht gemountet");
  res[`${lang}-lautesAngebot`] = await evaluate(c, `!!document.querySelector("button[class*='as-hub']") && document.body.innerText.includes(${JSON.stringify(lang==="de"?"Tutorial starten":"Start the tutorial")})`);
  await evaluate(c, `[...document.querySelectorAll("button")].find(x=>/tutorial/i.test(x.getAttribute("aria-label")||"")).click()`);
  await new Promise(r=>setTimeout(r,500));
  res[`${lang}-1-themen`] = JSON.parse(await evaluate(c, M));
  writeFileSync(join(OUT, `${lang}-1-themen.png`), Buffer.from(await screenshot(c), "base64"));
  await evaluate(c, `document.querySelectorAll(".tut-row")[1].click()`); await new Promise(r=>setTimeout(r,300));
  await evaluate(c, `document.querySelectorAll(".tut-row")[0].click()`); await new Promise(r=>setTimeout(r,400));
  res[`${lang}-2-lektion`] = JSON.parse(await evaluate(c, M));
  writeFileSync(join(OUT, `${lang}-2-lektion.png`), Buffer.from(await screenshot(c), "base64"));
  res[`${lang}-gespeichert`] = JSON.parse(await evaluate(c, `localStorage.getItem("as_tut_progress")`));
  // Reload: ueberlebt der Fortschritt?
  await goto(c, URL_, { settleMs: 2500 });
  res[`${lang}-lautesAngebotDanach`] = await evaluate(c, `document.body.innerText.includes(${JSON.stringify(lang==="de"?"Tutorial starten":"Start the tutorial")})`);
  await evaluate(c, `[...document.querySelectorAll("button")].find(x=>/tutorial/i.test(x.getAttribute("aria-label")||"")).click()`);
  await new Promise(r=>setTimeout(r,500));
  res[`${lang}-3-nachReload`] = JSON.parse(await evaluate(c, M));
  res[`${lang}-weitermachen`] = await evaluate(c, `(document.querySelector(".tut-row")||{}).textContent||""`);
  writeFileSync(join(OUT, `${lang}-3-nachReload.png`), Buffer.from(await screenshot(c), "base64"));
}
writeFileSync(join(OUT, "measurements.json"), JSON.stringify(res, null, 2));
for (const [k,v] of Object.entries(res)) {
  if (v && v.found) console.log(`${k}: ${v.card.w}x${v.card.h} | Inhalt ${v.content}/${v.visible} | Ueberhang ${v.overflow} | verdeckt ${v.hidden.join(",")||"nichts"} | Luft ${v.airAbove}/${v.airBelow} | Querlauf ${v.xoverflow} | <44px ${v.under44.length}`);
  else console.log(`${k}:`, JSON.stringify(v));
}
await c.close();
