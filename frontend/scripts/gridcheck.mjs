import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:900} }).then(c=>c.newPage());
await p.goto("http://localhost:3000/fleet/approve",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(4000);
const r = await p.evaluate(() => {
  const t = document.querySelector('[class*="kvTable"]');
  if (!t) return "no kvTable found";
  const tbody = t.querySelector("tbody");
  return {
    table_display: getComputedStyle(t).display,
    table_gridTemplateColumns: getComputedStyle(t).gridTemplateColumns,
    direct_children_of_table: [...t.children].map(c=>c.tagName),
    tbody_computed_width: tbody ? tbody.getBoundingClientRect().width : null,
  };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
