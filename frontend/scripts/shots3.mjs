import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:1400}, deviceScaleFactor:2 }).then(c=>c.newPage());

// Agents page: click into a specific pod so the kv panel + reasoning trail render.
await p.goto("http://localhost:3000/fleet/agents",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(6000);
await p.screenshot({ path: ".compare/agents.png" });

await p.goto("http://localhost:3000/fleet/approve",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(6000);
await p.screenshot({ path: ".compare/approve.png", fullPage: true });

await p.goto("http://localhost:3000/fleet/demo",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(6000);
await p.screenshot({ path: ".compare/demo.png" });

await p.goto("http://localhost:3000/fleet/how-it-works",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(4000);
await p.evaluate(() => window.scrollTo(0, 400));
await p.waitForTimeout(300);
await p.screenshot({ path: ".compare/hiw.png" });

await b.close();
console.log("done");
