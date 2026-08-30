import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 }).then(c=>c.newPage());
await p.goto("http://localhost:3000/fleet/overview", { waitUntil:"domcontentloaded", timeout:60000 });
await p.waitForTimeout(6000);
const f = await p.evaluate(() => {
  const g = s => { const e=document.querySelector(s); return e ? getComputedStyle(e).fontFamily.split(",")[0] : "(absent)"; };
  return { h1:g(".pageTitle,h1"), brand:g('[class*="brandMark"]'), kicker:g('[class*="pageKicker"]'),
           lede:g('[class*="pageLede"]'), tile:g('[class*="statTile"]'), card:g('[class*="cardTitle"]') };
});
console.log("resolved fonts:");
for (const [k,v] of Object.entries(f)) console.log(`  ${k.padEnd(8)} ${v}`);
await p.screenshot({ path: ".compare/fonts.png" });
await b.close();
