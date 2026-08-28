"use client";

/**
 * Client-side behaviour layer for the SharpLink homepage clone.
 *
 * The original site drives everything through Nuxt + Lenis + GSAP ScrollTrigger.
 * Only one JS chunk survived the scrape, so the scroll choreography here is
 * reconstructed from the CSS (pin classes, section heights), the reference
 * screenshots and the live site — timings are approximated, not exact.
 *
 * Responsibilities:
 *   - Lenis smooth scroll wired into the GSAP ticker + ScrollTrigger
 *   - text-reveal: per-letter stagger as each heading enters the viewport
 *   - generic entrance fades for cards / list items / dashed rules
 *   - the hero → productivity-chart "shrink into the card" morph (desktop)
 *   - FAQ accordion, mobile menu, cookie banner, back-to-top
 *   - dotLottie player for the Propositions stack animation
 */

import { useEffect } from "react";

export default function SiteScripts() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];
    let disposed = false;

    (async () => {
      const [{ default: Lenis }, gsapMod, stMod] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed) return;
      const gsap = gsapMod.gsap ?? gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;
      gsap.registerPlugin(ScrollTrigger);

      document.documentElement.classList.add("js-anim");

      /* ---------------------------------------------------------------- *
       * Lenis smooth scroll
       * ---------------------------------------------------------------- */
      const lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: !reduced,
      });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      });

      /* ---------------------------------------------------------------- *
       * text-reveal — per-letter stagger
       * ---------------------------------------------------------------- */
      document.querySelectorAll<HTMLElement>(".text-reveal").forEach((block) => {
        const letters = block.querySelectorAll<HTMLElement>(".letter");
        gsap.set(block, { opacity: 1 });
        // headings inside the pinned/fixed hero can't be scroll-triggered reliably
        const inHero = !!block.closest(".home-hero");
        if (inHero) {
          if (letters.length) {
            gsap.set(letters, { opacity: reduced ? 1 : 0, yPercent: reduced ? 0 : 40 });
            gsap.to(letters, {
              opacity: 1,
              yPercent: 0,
              duration: 0.6,
              ease: "power3.out",
              stagger: reduced ? 0 : 0.02,
              delay: 0.15,
            });
          }
          return;
        }
        if (!letters.length) {
          gsap.fromTo(
            block,
            { opacity: 0, y: reduced ? 0 : 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: { trigger: block, start: "top 85%" },
            },
          );
          return;
        }
        gsap.set(letters, { opacity: reduced ? 1 : 0, yPercent: reduced ? 0 : 40 });
        gsap.to(letters, {
          opacity: 1,
          yPercent: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: reduced ? 0 : 0.018,
          scrollTrigger: { trigger: block, start: "top 82%" },
        });
      });

      /* ---------------------------------------------------------------- *
       * generic entrance fades
       * ---------------------------------------------------------------- */
      const entrance = [
        ".hero-footer .eyebrow",
        ".hero-footer .blurb",
        ".hero-footer .latest-press",
        ".card-productivity",
        ".proposition-item",
        ".card-opportunity",
        ".opportunity-header .eyebrow",
        ".home-opportunity .opportunity-body .content",
        ".section-news .latest-articles li",
        ".section-news .carousel",
        ".faq-item",
        ".footer-newsletter",
        ".banner__content .ctas",
      ];
      if (!reduced) {
        entrance.forEach((sel) => {
          document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            gsap.fromTo(
              el,
              { opacity: 0, y: 28 },
              {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: { trigger: el, start: "top 88%" },
              },
            );
          });
        });
        gsap.utils.toArray<HTMLElement>(".svg-dashed-line").forEach((line) => {
          const horizontal = line.classList.contains("horizontal");
          gsap.fromTo(
            line,
            { scaleX: horizontal ? 0 : 1, scaleY: horizontal ? 1 : 0, transformOrigin: horizontal ? "left center" : "center top" },
            {
              scaleX: 1,
              scaleY: 1,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: { trigger: line, start: "top 92%" },
            },
          );
        });
      }

      /* ---------------------------------------------------------------- *
       * parallax on the dark gradient washes
       * ---------------------------------------------------------------- */
      if (!reduced) {
        gsap.utils.toArray<HTMLElement>(".gradient-bg-dark .image, .gradient-bg-light .image").forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -8 },
            {
              yPercent: 8,
              ease: "none",
              scrollTrigger: { trigger: img.parentElement as HTMLElement, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        });
      }

      /* ---------------------------------------------------------------- *
       * background videos: muted autoplay, pause when off-screen
       * ---------------------------------------------------------------- */
      document.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
        v.muted = true;
        v.playsInline = true;
        v.loop = true;
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) v.play().catch(() => {});
              else v.pause();
            });
          },
          { threshold: 0.01 },
        );
        io.observe(v);
        cleanups.push(() => io.disconnect());
      });

      /* ---------------------------------------------------------------- *
       * opportunity: the fixed alpha video only shows over its own section
       * ---------------------------------------------------------------- */
      const oppWrap = document.querySelector<HTMLElement>(".opportunity-wrapper");
      const oppVideo = oppWrap?.querySelector<HTMLElement>(".video-container") ?? null;
      if (oppWrap && oppVideo) {
        gsap.set(oppVideo, { autoAlpha: 0 });
        const oppEnd =
          oppWrap.querySelector<HTMLElement>(".opportunity-list-items") ?? oppWrap;
        ScrollTrigger.create({
          trigger: oppWrap,
          start: "top 55%",
          endTrigger: oppEnd,
          end: "bottom 60%",
          onToggle: (self: { isActive: boolean }) =>
            gsap.to(oppVideo, { autoAlpha: self.isActive ? 1 : 0, duration: 0.45, overwrite: true }),
        });
      }

      /* ---------------------------------------------------------------- *
       * MORPH-NOTES
       * The live site pins .home-productivity and scrubs the full-screen
       * hero down into the chart card (clip-path + scale), fading the chart
       * heading / chart image / CTA in as it lands. That timeline lived in
       * a JS chunk the scrape didn't capture, and reproducing it on top of
       * Lenis + ScrollTrigger without it was unstable, so the approximation
       * is: standalone hero section (see globals.css) → normal productivity
       * section with its chart card revealed here + a light scale-out on
       * the hero as you leave it.
       * ---------------------------------------------------------------- */
      const prodSection = document.querySelector<HTMLElement>(".home-productivity");
      const revealTargets = prodSection
        ? Array.from(
            prodSection.querySelectorAll<HTMLElement>(
              ".chart-wrapper .chart-heading, .chart-wrapper .chart-heading .label, .chart-wrapper .chart-image-wrapper, .chart-wrapper .cta",
            ),
          )
        : [];
      gsap.set(revealTargets, { autoAlpha: 1 });
      if (!reduced) {
        revealTargets.forEach((el) => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: { trigger: prodSection as HTMLElement, start: "top 60%" },
            },
          );
        });
        const heroSection = document.querySelector<HTMLElement>(".page-index .home-hero");
        if (heroSection) {
          gsap.to(heroSection, {
            scale: 0.94,
            opacity: 0.55,
            ease: "none",
            scrollTrigger: { trigger: heroSection, start: "top top", end: "bottom top", scrub: true },
          });
        }
      }

      /* ---------------------------------------------------------------- *
       * header theme follows the section under it
       * ---------------------------------------------------------------- */
      const header = document.querySelector<HTMLElement>(".site-header");
      if (header) {
        const darkEls = [
          ".page-index .home-hero",
          ".home-propositions",
          ".home-banner",
          ".opportunity-wrapper",
          ".site-footer",
        ].flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)));
        let headerDark: boolean | null = null;
        const setHeaderTheme = (dark: boolean) => {
          if (dark === headerDark) return;
          headerDark = dark;
          const from = dark ? "theme-light" : "theme-dark";
          const to = dark ? "theme-dark" : "theme-light";
          header.classList.remove(from);
          header.classList.add(to);
          header.querySelectorAll<HTMLElement>(`.navbar .${from}`).forEach((el) => {
            el.classList.remove(from);
            el.classList.add(to);
          });
        };
        const probeY = 28;
        const updateHeaderTheme = () => {
          const overDark = darkEls.some((el) => {
            const r = el.getBoundingClientRect();
            return r.top <= probeY && r.bottom >= probeY;
          });
          setHeaderTheme(overDark);
        };
        updateHeaderTheme();
        lenis.on("scroll", updateHeaderTheme);
        window.addEventListener("resize", updateHeaderTheme);
        cleanups.push(() => window.removeEventListener("resize", updateHeaderTheme));
      }

      ScrollTrigger.refresh();
      cleanups.push(() => ScrollTrigger.getAll().forEach((t) => t.kill()));

      /* ---------------------------------------------------------------- *
       * dotLottie — Propositions "stack" animation
       * ---------------------------------------------------------------- */
      const lottieHost = document.querySelector<HTMLElement>("[data-dotlottie-src]");
      if (lottieHost) {
        try {
          const lottie = (await import("lottie-web")).default;
          const anim = lottie.loadAnimation({
            container: lottieHost,
            renderer: "canvas",
            loop: true,
            autoplay: !reduced,
            path: lottieHost.dataset.dotlottieSrc!,
            rendererSettings: { clearCanvas: true, progressiveLoad: true },
          });
          if (reduced) anim.addEventListener("DOMLoaded", () => anim.goToAndStop(anim.totalFrames * 0.5, true));
          cleanups.push(() => anim.destroy());
        } catch {
          /* animation is decorative — ignore load failures */
        }
      }
    })();

    /* ------------------------------------------------------------------ *
     * FAQ accordion
     * ------------------------------------------------------------------ */
    const faqItems = Array.from(document.querySelectorAll<HTMLElement>(".faq-item"));
    const faqHandlers: Array<[HTMLElement, () => void]> = [];
    faqItems.forEach((item) => {
      const header = item.querySelector<HTMLElement>(".header");
      const body = item.querySelector<HTMLElement>(".body");
      const answer = item.querySelector<HTMLElement>(".body__answer");
      if (!header || !body || !answer) return;
      body.style.height = "0px";
      body.style.overflow = "hidden";
      body.style.transition = "height 0.4s cubic-bezier(0.4,0,0.2,1)";
      const toggle = () => {
        const open = item.classList.toggle("is-open");
        if (open) {
          body.style.height = "auto";
          const h = body.scrollHeight;
          body.style.height = "0px";
          void body.offsetHeight;
          body.style.height = `${h}px`;
        } else {
          body.style.height = `${body.scrollHeight}px`;
          void body.offsetHeight;
          body.style.height = "0px";
        }
      };
      header.style.cursor = "pointer";
      header.addEventListener("click", toggle);
      faqHandlers.push([header, toggle]);
    });
    cleanups.push(() => faqHandlers.forEach(([el, fn]) => el.removeEventListener("click", fn)));

    /* ------------------------------------------------------------------ *
     * mobile menu
     * ------------------------------------------------------------------ */
    const hamburger = document.querySelector<HTMLElement>(".hamburger-button");
    const mobileNav = document.querySelector<HTMLElement>(".mobile-menu");
    const menuToggle = () => {
      const open = document.body.classList.toggle("menu-open");
      mobileNav?.classList.toggle("open", open);
      hamburger?.classList.toggle("is-active", open);
      document.documentElement.style.overflow = open ? "hidden" : "";
    };
    hamburger?.addEventListener("click", menuToggle);
    const mobileLinks = mobileNav ? Array.from(mobileNav.querySelectorAll("a")) : [];
    const closeMenu = () => {
      document.body.classList.remove("menu-open");
      mobileNav?.classList.remove("open");
      hamburger?.classList.remove("is-active");
      document.documentElement.style.overflow = "";
    };
    mobileLinks.forEach((a) => a.addEventListener("click", closeMenu));
    cleanups.push(() => {
      hamburger?.removeEventListener("click", menuToggle);
      mobileLinks.forEach((a) => a.removeEventListener("click", closeMenu));
    });

    /* ------------------------------------------------------------------ *
     * cookie banner
     * ------------------------------------------------------------------ */
    const cookie = document.querySelector<HTMLElement>(".cookie-banner");
    const cookieClose = document.querySelector<HTMLElement>("#cookie-banner-close-cta");
    const setCookieOffset = (px: number) =>
      document.documentElement.style.setProperty("--cookie-offset", `${px}px`);
    let cookieDismissed = false;
    try {
      cookieDismissed = localStorage.getItem("sl-cookie-dismissed") === "1";
    } catch {
      /* private mode */
    }
    if (cookie) {
      if (cookieDismissed) {
        cookie.style.display = "none";
        setCookieOffset(0);
      } else {
        cookie.style.opacity = "1";
        cookie.style.visibility = "visible";
        setCookieOffset(cookie.offsetHeight || 48);
      }
    }
    const dismissCookie = () => {
      if (cookie) cookie.style.display = "none";
      setCookieOffset(0);
      try {
        localStorage.setItem("sl-cookie-dismissed", "1");
      } catch {
        /* ignore */
      }
    };
    cookieClose?.addEventListener("click", dismissCookie);
    cleanups.push(() => cookieClose?.removeEventListener("click", dismissCookie));

    /* ------------------------------------------------------------------ *
     * back to top
     * ------------------------------------------------------------------ */
    const backToTop = Array.from(document.querySelectorAll<HTMLElement>(".back-to-top, .footer-copyright a")).filter((el) =>
      /back to top/i.test(el.textContent || ""),
    );
    const scrollTop = (e: Event) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    backToTop.forEach((el) => el.addEventListener("click", scrollTop));
    cleanups.push(() => backToTop.forEach((el) => el.removeEventListener("click", scrollTop)));

    return () => {
      disposed = true;
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
      document.documentElement.classList.remove("js-anim");
    };
  }, []);

  return null;
}
