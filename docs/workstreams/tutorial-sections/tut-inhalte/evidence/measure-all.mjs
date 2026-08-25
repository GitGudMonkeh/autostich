/* Jede Lektion, beide Sprachen, 390 x 844 — im Produktionsbuild.
   Der Wächter rechnet ein MODELL; das hier ist die Messung, die es belegt oder widerlegt.

   STUMPF UND VERLÄSSLICH: je Lektion ein frischer Start mit geleertem localStorage. Der erste
   Anlauf navigierte sparsamer und lief in eine echte Falle — sobald eine Lektion als gelesen gilt,
   schiebt die Weitermachen-Zeile alle Sektionszeilen um eins nach unten, und der Index zeigte auf
   die falsche Zeile. Ein Reload je Lektion kostet Minuten und keine Zweifel. */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate, screenshot }
  from "../../../../../scripts/cdp.mjs";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "out"); mkdirSync(OUT, { recursive: true });
const URL_ = "http://localhost:5193/autostich/";

const M = `(()=>{const card=document.querySelector(".tut-card");if(!card)return JSON.stringify({found:false});
 const s=document.querySelector(".tut-scroll");const cr=card.getBoundingClientRect();
 const taps=[...card.querySelectorAll("button")].map(n=>{const b=n.getBoundingClientRect();return{t:(n.textContent||"").trim().slice(0,14),w:+b.width.toFixed(1),h:+b.height.toFixed(1)};});
 const beats=[...document.querySelectorAll(".tut-beat")].map(n=>({k:(n.className.match(/tut-(satz|bild|probe|tip)/)||[])[1],bottom:+n.getBoundingClientRect().bottom.toFixed(1)}));
 return JSON.stringify({found:true,title:(document.querySelector(".tut-head h2")||{}).textContent||"",
  cardH:+cr.height.toFixed(1),content:s.scrollHeight,visible:s.clientHeight,
  overflow:Math.max(0,s.scrollHeight-s.clientHeight),
  hidden:beats.filter(b=>b.bottom>s.getBoundingClientRect().bottom).map(b=>b.k),
  xoverflow:document.documentElement.scrollWidth>innerWidth||s.scrollWidth>s.clientWidth,
  under44:taps.filter(t=>t.h<44||t.w<44).map(t=>t.t)});})()`;

const SHOTS = { "de-0-0": "de-s1-l1.png", "de-4-4": "de-architekt-boni.png",
                "de-3-0": "de-archetyp-feuer.png", "en-0-6": "en-score.png",
                "de-0-4": "de-serie.png", "de-0-6": "de-score.png" };

const c = await launch({ port: 9421 });
await c.send("Page.enable"); await c.send("Runtime.enable");
await setViewport(c, { width: 390, height: 844, deviceScaleFactor: 2 });
await reduceMotion(c); await seedRandom(c); await suppressInstallPrompt(c);

const openTut = async (lang) => {
  await goto(c, URL_, { settleMs: 1800 });
  await evaluate(c, `(()=>{localStorage.clear();localStorage.setItem("as_options",JSON.stringify({lang:"${lang}"}));return 1})()`);
  await goto(c, URL_, { settleMs: 2200 });
  const n = await evaluate(c, `document.querySelectorAll("#root *").length`);
  if (n < 50) throw new Error(`nicht gemountet (${n})`);
  await evaluate(c, `[...document.querySelectorAll("button")].find(x=>/tutorial/i.test(x.getAttribute("aria-label")||"")).click()`);
  await new Promise(r => setTimeout(r, 450));
};

const rows = []; const bad = [];
for (const lang of ["de", "en"]) {
  await openTut(lang);
  const nSec = await evaluate(c, `document.querySelectorAll(".tut-row").length`);
  for (let si = 0; si < nSec; si++) {
    await openTut(lang);
    await evaluate(c, `document.querySelectorAll(".tut-row")[${si}].click()`);
    await new Promise(r => setTimeout(r, 300));
    const nLes = await evaluate(c, `document.querySelectorAll(".tut-row").length`);
    for (let li = 0; li < nLes; li++) {
      await openTut(lang);                                   // frisch: keine Weitermachen-Zeile
      await evaluate(c, `document.querySelectorAll(".tut-row")[${si}].click()`);
      await new Promise(r => setTimeout(r, 280));
      await evaluate(c, `document.querySelectorAll(".tut-row")[${li}].click()`);
      await new Promise(r => setTimeout(r, 380));
      const m = JSON.parse(await evaluate(c, M));
      rows.push({ lang, si, li, ...m });
      if (m.overflow > 0 || m.hidden.length || m.xoverflow || m.under44.length) bad.push({ lang, si, li, ...m });
      const shot = SHOTS[`${lang}-${si}-${li}`];
      if (shot) writeFileSync(join(OUT, shot), Buffer.from(await screenshot(c), "base64"));
    }
  }
}
writeFileSync(join(OUT, "all.json"), JSON.stringify({ rows, bad }, null, 2));
const sorted = rows.slice().sort((a, b) => b.content - a.content);
console.log(`gemessen: ${rows.length} Lektionsansichten (${rows.filter(r => r.lang === "de").length} de / ${rows.filter(r => r.lang === "en").length} en)`);
console.log(`Ueberhang: ${rows.filter(r => r.overflow > 0).length} · verdeckt: ${rows.filter(r => r.hidden.length).length} · Querlauf: ${rows.filter(r => r.xoverflow).length} · Tippziel<44: ${rows.filter(r => r.under44.length).length}`);
console.log(`groesster Inhalt: ${sorted[0].content} px ("${sorted[0].title}", ${sorted[0].lang})`);
console.log("Top 5:", sorted.slice(0, 5).map(r => `${r.lang} "${r.title}" ${r.content}`).join(" | "));
if (bad.length) { console.log("VERLETZUNGEN:"); for (const b of bad.slice(0, 12)) console.log(` ${b.lang} s${b.si}/l${b.li} "${b.title}" content=${b.content} overflow=${b.overflow} hidden=${b.hidden} x=${b.xoverflow} taps=${b.under44}`); }
else console.log("keine Verletzung");
await c.close();
