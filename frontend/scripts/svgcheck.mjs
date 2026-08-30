import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:900} }).then(c=>c.newPage());
await p.goto("http://localhost:3000/fleet/agents",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(5000);
const r = await p.evaluate(() => {
  const svg = document.querySelector('[class*="graphSvg"]');
  if (!svg) return "no svg found";
  const text = svg.querySelector("text");
  const svgRect = svg.getBoundingClientRect();
  const textRect = text ? text.getBoundingBox ? text.getBoundingBox() : text.getBBox() : null;
  return {
    svg_rendered: `${Math.round(svgRect.width)}x${Math.round(svgRect.height)}`,
    text_bbox_in_viewbox_units: textRect ? `${textRect.x.toFixed(1)},${textRect.y.toFixed(1)} ${textRect.width.toFixed(1)}x${textRect.height.toFixed(1)}` : "n/a",
    viewBox: svg.getAttribute("viewBox"),
    text_extends_past_viewbox: textRect ? (textRect.x + textRect.width > 640) : null,
  };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
