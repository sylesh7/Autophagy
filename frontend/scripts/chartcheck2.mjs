import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:1400}, deviceScaleFactor:2 }).then(c=>c.newPage());
await p.goto("http://localhost:3000/fleet/agents", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(5000);
await p.selectOption("select#agent-select", "healthy-agent-7f47fc4cfd-xxr6j");
await p.waitForTimeout(2000);

const svg = await p.$('[class*="graphSvg"]');
const box = await svg.boundingBox();
console.log("svg bounding box:", box);
await svg.screenshot({ path: ".compare/chart-full.png" });
await b.close();
