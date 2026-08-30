import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newContext({ viewport:{width:1440,height:900} }).then(c=>c.newPage());
await p.goto("http://localhost:3000/fleet/overview",{waitUntil:"domcontentloaded",timeout:60000});
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const out = [];
  const check = (label, el) => {
    if (!el) return out.push(`${label}: absent`);
    const over = el.scrollWidth - el.clientWidth;
    out.push(`${label.padEnd(26)} client=${el.clientWidth} scroll=${el.scrollWidth} overflow=${over > 0 ? "+"+over : "0"}`);
  };
  check("main", document.querySelector('[class*="main"]'));
  check("twoPanel", document.querySelector('[class*="twoPanel"]'));
  const cards = [...document.querySelectorAll('[class*="card"]')];
  cards.slice(0,2).forEach((c,i)=>check(`card[${i}]`, c));
  check("rowTable", document.querySelector('[class*="rowTable"]'));
  const t = document.querySelector('[class*="rowTable"]');
  if (t) {
    const ths = [...t.querySelectorAll("th")].map(h=>`${h.innerText.trim()}=${Math.round(h.getBoundingClientRect().width)}`);
    out.push("columns: " + ths.join("  "));
    const card = t.closest('[class*="card"]');
    out.push(`table right=${Math.round(t.getBoundingClientRect().right)}  card right=${Math.round(card.getBoundingClientRect().right)}`);
  }
  const chip = document.querySelector('[class*="chip"]');
  if (chip) { const cs=getComputedStyle(chip); const rc=chip.getBoundingClientRect();
    out.push(`chip: display=${cs.display} pad=${cs.padding} size=${Math.round(rc.width)}x${Math.round(rc.height)} font=${cs.fontSize}`); }
  return out;
});
r.forEach(l=>console.log("  "+l));
await b.close();
