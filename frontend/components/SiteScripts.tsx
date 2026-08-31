"use client";

import { useEffect } from "react";

/**
 * Runs the original Webflow page's scripts inside a React app.
 *
 * Two things about the source page make this non-trivial:
 *
 * 1. Its scripts mutate the DOM heavily — GSAP SplitText rewraps every animated
 *    heading in <span>s, the marquee clones its own children. If that happened
 *    before React hydrated, hydration would find a DOM it did not render and
 *    throw the mutations away. So everything here runs from an effect, which
 *    fires only after hydration has finished.
 *
 * 2. Because of that, DOMContentLoaded has long since fired by the time these
 *    scripts load, and ~20 of them register their whole body inside a
 *    DOMContentLoaded listener that would therefore never run. The shim below
 *    queues those callbacks and flushes them once every script has loaded —
 *    which is also the order the browser would have used, rather than firing
 *    each script's callback before the next script has even parsed.
 */

const VENDOR = [
  "/vendor/jquery-3.5.1.min.js",
  "/vendor/webflow.js",
  "/vendor/gsap.min.js",
  "/vendor/ScrollTrigger.min.js",
  "/vendor/SplitText.min.js",
  "/vendor/swiper-bundle.min.js",
  "/vendor/lenis.min.js",
];

// the page's own scripts, in the order they appeared in the document
const SITE = Array.from({ length: 24 }, (_, i) => `/js/${String(i + 1).padStart(2, "0")}.js`);

// three.js hero scene; a module in the original, so it runs after the classic
// scripts have parsed but before DOMContentLoaded handlers fire
const HERO_MODULE = "/vendor/prime-3d.module.js";

// cookie-consent widget; async and independent in the original page
const CONSENT = "/vendor/fs-cc.js";

function loadScript(src: string, type?: string): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement("script");
    el.src = src;
    if (type) el.type = type;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => {
      console.error("[hyperxdb] failed to load", src);
      resolve(); // a missing script must not stall the rest of the page
    };
    document.body.appendChild(el);
  });
}

type Queued = { target: EventTarget; fn: EventListenerOrEventListenerObject };

function installReadyShim() {
  const domReady: Queued[] = [];
  const winLoad: Queued[] = [];

  const docAdd = document.addEventListener.bind(document);
  const winAdd = window.addEventListener.bind(window);

  document.addEventListener = function (
    type: string,
    fn: EventListenerOrEventListenerObject,
    opts?: boolean | AddEventListenerOptions,
  ) {
    if (type === "DOMContentLoaded" && fn) {
      domReady.push({ target: document, fn });
      return;
    }
    return docAdd(type as never, fn, opts);
  } as typeof document.addEventListener;

  window.addEventListener = function (
    type: string,
    fn: EventListenerOrEventListenerObject,
    opts?: boolean | AddEventListenerOptions,
  ) {
    if (type === "load" && fn) {
      winLoad.push({ target: window, fn });
      return;
    }
    return winAdd(type as never, fn, opts);
  } as typeof window.addEventListener;

  const call = (q: Queued, ev: Event) => {
    try {
      if (typeof q.fn === "function") q.fn.call(q.target, ev);
      else q.fn.handleEvent(ev);
    } catch (err) {
      console.error("[hyperxdb] handler threw", err);
    }
  };

  return function flush() {
    document.addEventListener = docAdd;
    window.addEventListener = winAdd;
    const ready = new Event("DOMContentLoaded");
    domReady.forEach((q) => call(q, ready));
    const loaded = new Event("load");
    winLoad.forEach((q) => call(q, loaded));
    // ScrollTrigger measured the page mid-flush; re-measure now that every
    // handler has laid out its own elements.
    const st = (window as { ScrollTrigger?: { refresh: () => void } }).ScrollTrigger;
    if (st) st.refresh();
  };
}

let started = false;

export default function SiteScripts() {
  useEffect(() => {
    if (started) return;
    started = true;

    let cancelled = false;
    (async () => {
      const flush = installReadyShim();
      for (const src of [...VENDOR, ...SITE]) {
        if (cancelled) return;
        await loadScript(src);
      }
      await loadScript(HERO_MODULE, "module");
      if (cancelled) return;
      flush();
      // Lets any section that needs GSAP/ScrollTrigger (already registered
      // against Lenis's scroll proxy by this point) wait for the real thing
      // instead of polling window.gsap and risking a mistimed setup.
      window.__siteScriptsReady = true;
      window.dispatchEvent(new Event("site-scripts-ready"));
      loadScript(CONSENT);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
