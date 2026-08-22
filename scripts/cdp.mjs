/* #400 T2 — a minimal Chrome DevTools Protocol client.

   Dependency-free on purpose. Playwright would have been the obvious reach, but it means a new
   devDependency plus a browser download of a few hundred megabytes in every worktree and every CI
   run, to drive a browser this machine already has. Node 22+ ships a WebSocket client in core and
   CDP is a JSON protocol, so the whole thing is the file you are reading.

   It also keeps the evidence honest in a way a wrapper would not: `Emulation.setDeviceMetricsOverride`
   IS the "real browser viewport" that the acceptance gate compares against. There is no abstraction
   in between deciding what a viewport means.

   Scope: launch, attach to the one page target, navigate, evaluate, screenshot. Nothing else. */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = process.platform === "win32"
  ? [
    `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["ProgramFiles(x86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env["ProgramFiles(x86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ]
  : [
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
    "/usr/bin/chromium-browser", "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

export function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const p of CANDIDATES) if (p && existsSync(p)) return p;
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Deliberately NOT passing `--hide-scrollbars`, `--force-device-scale-factor` or any font flag.
   Both halves of the comparison run in this same browser with these same flags, and a scrollbar is
   part of the layout under test: at 1280 CSS px a scrolling page leaves 1272 px of client width, and
   the harness must reproduce exactly that, not a scrollbar-free fiction. */
const FLAGS = [
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--mute-audio",
];

export async function launch({ port = 9331 } = {}) {
  const bin = findBrowser();
  if (!bin) throw new Error("No Chrome/Edge/Chromium found. Set CHROME_PATH to a browser binary.");
  const profile = mkdtempSync(join(tmpdir(), "autostich-cdp-"));
  const proc = spawn(bin, [...FLAGS, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], {
    stdio: "ignore",
  });

  // Poll the DevTools HTTP endpoint rather than parsing stderr — stable across Chrome versions.
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    } catch { /* not up yet */ }
    if (!target) await sleep(100);
  }
  if (!target) {
    proc.kill();
    rmSync(profile, { recursive: true, force: true });
    throw new Error(`Browser did not expose a debugging target on port ${port}`);
  }

  const client = await attach(target.webSocketDebuggerUrl);
  client.browserPath = bin;
  client.close = async () => {
    try { client.ws.close(); } catch { /* already gone */ }
    proc.kill();
    await sleep(200);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Windows may still hold it */ }
  };
  return client;
}

function attach(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const listeners = new Map();

    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined) {
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        msg.error ? p.reject(new Error(`${msg.error.message} (${JSON.stringify(msg.params ?? {})})`)) : p.resolve(msg.result);
      } else if (listeners.has(msg.method)) {
        for (const fn of listeners.get(msg.method)) fn(msg.params);
      }
    });
    ws.addEventListener("error", () => reject(new Error("CDP websocket error")));
    ws.addEventListener("open", () => {
      const send = (method, params = {}) => new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
      const on = (method, fn) => {
        if (!listeners.has(method)) listeners.set(method, new Set());
        listeners.get(method).add(fn);
        return () => listeners.get(method).delete(fn);
      };
      const once = (method) => new Promise((res) => {
        const off = on(method, (p) => { off(); res(p); });
      });
      resolve({ ws, send, on, once });
    });
  });
}

/* ---- the handful of operations the proof actually needs ---- */

export async function setViewport(c, { width, height, deviceScaleFactor }) {
  await c.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor, mobile: false, screenWidth: width, screenHeight: height,
  });
}

/* Motion is the main source of pixel noise on this app's menu (ambient particles, the wordmark glow,
   the panel ring sweep). The app already honours the OS preference everywhere, so asking the browser
   to report it is both the cleanest freeze and a state the app genuinely supports — no test-only
   branch is introduced anywhere in src/. */
export async function reduceMotion(c) {
  await c.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

/* Seeded PRNG installed before ANY application script runs, in every frame of the page — including
   the harness iframe. Without it the menu picks a random music track and a random ambient seed, and
   two captures of "the same state" would legitimately differ for reasons that have nothing to do
   with the viewport. */
export async function seedRandom(c, seed = 0x9e3779b9) {
  await c.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { let s = ${seed} >>> 0;
      Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    })();`,
  });
}

/* Chrome fires `beforeinstallprompt` only in a TOP-LEVEL browsing context, never inside an iframe.
   Left alone, the real-viewport capture therefore shows the PWA install link and the harness capture
   does not — a genuine three-node structural difference that has nothing to do with the viewport.

   Suppressing the event in BOTH halves controls the variable instead of masking the result: the same
   code runs in every frame, so neither side is privileged, and the comparison is then about layout
   rather than about which browsing context is allowed to offer an install. The difference itself is
   real and is reported separately as a property of the harness — see the T2 report. */
export async function suppressInstallPrompt(c) {
  const { identifier } = await c.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); e.stopImmediatePropagation(); }, true);`,
  });
  // Returned so the proof can lift the suppression again and MEASURE the difference it was hiding,
  // rather than only asserting in prose that it exists.
  return identifier;
}

export async function removeInitScript(c, identifier) {
  await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
}

export async function goto(c, url, { settleMs = 1200 } = {}) {
  const load = c.once("Page.loadEventFired");
  await c.send("Page.navigate", { url });
  await load;
  await sleep(settleMs); // let React mount, fonts settle, lazy chunks arrive
}

export async function evaluate(c, expression) {
  const r = await c.send("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (r.exceptionDetails) {
    throw new Error("page evaluate failed: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  }
  return r.result.value;
}

/* `opts` added 2026-08-23 (#typo-system S0) and DEFAULTS TO THE OLD BEHAVIOUR — png, no quality —
   so every existing caller is byte-identical. It exists because a full V1 baseline is 150 cells at
   two device scale factors: as png that is ~180 MB of evidence, which is not something to put in the
   repository. Lossy webp is the right trade for screenshots a PERSON compares; it is the wrong trade
   for anything a machine diffs, so pixel-diff.mjs and phone-proof.mjs keep the png default. */
export async function screenshot(c, clip = null, opts = {}) {
  const params = { format: opts.format || "png", captureBeyondViewport: false };
  if (opts.quality != null && params.format !== "png") params.quality = opts.quality;
  if (clip) params.clip = { ...clip, scale: 1 };
  const { data } = await c.send("Page.captureScreenshot", params);
  return data; // base64
}

export { sleep };
