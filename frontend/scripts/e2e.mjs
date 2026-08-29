import { chromium } from "@playwright/test";

const PAGES = [
  ["/fleet/overview",     "01"],
  ["/fleet/agents",       "02"],
  ["/fleet/approve",      "03"],
  ["/fleet/demo",         "04"],
  ["/fleet/how-it-works", "05"],
];

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1440, height: 1100 } }).then(c => c.newPage());

let failures = 0;
for (const [path, kicker] of PAGES) {
  const errs = [];
  page.removeAllListeners("pageerror");
  page.removeAllListeners("console");
  page.on("pageerror", e => errs.push("pageerror: " + String(e).slice(0, 140)));
  page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 140)); });

  await page.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000); // client fetch + a polling window of SSE

  const r = await page.evaluate(() => {
    const txt = document.body.innerText;
    const pick = sel => [...document.querySelectorAll(sel)]
      .map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean);
    return {
      h1: document.querySelector("h1")?.innerText ?? "(none)",
      err: /Cannot reach the Autophagy backend|Backend unreachable|Could not complete/i.test(txt),
      empty: /Nothing flagged yet|No pods in the namespace|Not enough samples/i.test(txt),
      tiles: pick('[class*="statTile"]').slice(0, 6),
      rows: document.querySelectorAll('[class*="rowTable"] tbody tr').length,
      selectOpts: document.querySelectorAll("select option").length,
      buttons: pick("button").slice(0, 3),
      chars: txt.length,
    };
  });

  const bad = r.err || !r.h1 || r.chars < 400;
  if (bad) failures++;
  console.log(`\n${bad ? "FAIL" : "ok  "} ${path}`);
  console.log(`      h1: ${r.h1}`);
  console.log(`      backend-error banner: ${r.err ? "YES" : "no"}   empty-state: ${r.empty ? "yes" : "no"}   text: ${r.chars}`);
  if (r.tiles.length)      console.log(`      tiles: ${r.tiles.join(" | ")}`);
  if (r.rows)              console.log(`      table rows: ${r.rows}`);
  if (r.selectOpts)        console.log(`      agent options: ${r.selectOpts}`);
  if (r.buttons.length)    console.log(`      buttons: ${r.buttons.join(" | ")}`);
  if (errs.length)         { console.log(`      JS ERRORS: ${[...new Set(errs)].slice(0, 3).join("  ;;  ")}`); failures++; }
}

console.log(`\n${failures === 0 ? "ALL PAGES OK" : failures + " problem(s) found"}`);
await browser.close();
process.exit(failures ? 1 : 0);
