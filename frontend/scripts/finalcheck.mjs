import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:1600}, deviceScaleFactor:2 }).then(c=>c.newPage());

await p.goto("http://localhost:3000/fleet/overview",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(6000);
await p.screenshot({ path: ".compare/overview-final.png", fullPage: true });

await p.goto("http://localhost:3000/fleet/approve",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(6000);
await p.screenshot({ path: ".compare/approve-final.png", fullPage: true });

await b.close();
console.log("done");
