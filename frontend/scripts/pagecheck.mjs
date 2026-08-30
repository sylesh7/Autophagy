import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:900} }).then(c=>c.newPage());
const PAGES = ["/fleet/overview","/fleet/agents","/fleet/approve","/fleet/demo","/fleet/how-it-works"];
for (const path of PAGES) {
  await p.goto("http://localhost:3000"+path,{waitUntil:"domcontentloaded",timeout:60000});
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => {
    const body = document.body;
    const bodyOver = body.scrollWidth - body.clientWidth;
    const offenders = [];
    document.querySelectorAll("*").forEach(el => {
      if (el.scrollWidth - el.clientWidth > 8) {
        const cls = (el.className||"").toString().split(" ")[0];
        offenders.push(`${el.tagName.toLowerCase()}.${cls} +${el.scrollWidth-el.clientWidth}px (client=${el.clientWidth})`);
      }
    });
    return { bodyOver, offenders: offenders.slice(0,8) };
  });
  console.log(`\n${path}  body-overflow=${r.bodyOver}px`);
  r.offenders.forEach(o => console.log("    "+o));
}
await b.close();
