import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 }).then(c=>c.newPage());

// Find which pod actually has a data point near the "requested" line, so the
// screenshot reproduces the exact overlap condition from the bug report
// rather than just checking an arbitrary pod where it wouldn't show up.
await p.goto("http://localhost:3000/fleet/agents", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(5000);

const options = await p.evaluate(() => [...document.querySelectorAll("select#agent-select option")].map(o => o.value));
console.log("agents available:", options);

for (const name of options) {
  await p.selectOption("select#agent-select", name);
  await p.waitForTimeout(1500);
  const svg = await p.$('[class*="graphSvg"]');
  if (!svg) continue;
  const overlap = await p.evaluate(() => {
    const svgEl = document.querySelector('[class*="graphSvg"]');
    const path = svgEl?.querySelector("path");
    const rect = svgEl?.querySelector("rect");
    if (!path || !rect) return null;
    const rx = parseFloat(rect.getAttribute("x"));
    const ry = parseFloat(rect.getAttribute("y"));
    const rw = parseFloat(rect.getAttribute("width"));
    const rh = parseFloat(rect.getAttribute("height"));
    // sample the path's rendered points within the rect's x-range and see if any fall inside its y-range
    const len = path.getTotalLength();
    let hits = 0;
    for (let t = 0; t <= len; t += 2) {
      const pt = path.getPointAtLength(t);
      if (pt.x >= rx && pt.x <= rx + rw && pt.y >= ry && pt.y <= ry + rh) hits++;
    }
    return { hits, rect: {rx,ry,rw,rh} };
  });
  console.log(`  ${name}: path crosses label zone ${overlap ? overlap.hits + " sample points" : "n/a"}`);
  if (overlap && overlap.hits > 0) {
    await p.screenshot({ path: `.compare/chart-${name}.png`, clip: { x: 320, y: 260, width: 900, height: 260 } });
    console.log(`    -> screenshot saved: .compare/chart-${name}.png`);
  }
}
await b.close();
