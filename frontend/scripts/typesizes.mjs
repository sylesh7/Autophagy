import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:900} }).then(c=>c.newPage());
await p.goto("http://localhost:3000/fleet/how-it-works",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(4000);
const r = await p.evaluate(() => {
  const sels = ["p","td","th","li","[class*=contextText]","[class*=pageLede]","[class*=stageBody]","[class*=warningItem]","body"];
  const out = {};
  sels.forEach(s => { const e=document.querySelector(s); if(e) out[s]=getComputedStyle(e).fontSize; });
  return out;
});
console.log(r);
await b.close();
