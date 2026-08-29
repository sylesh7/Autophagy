
  document.addEventListener("DOMContentLoaded", () => {
    // START OF DOM
    // Nav Change State
    let nav = $(".nav");
    gsap.timeline({
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "+=80",
        onEnterBack: () => {
          nav.removeClass("is-scrolled");
        },
        onLeave: () => {
          nav.addClass("is-scrolled");
        }
      }
    });
    // Mobile Menu
    function initMenuOpen() {
      // Elements that just need the staggered animation (no close-on-click)
      const animatedEls = document.querySelectorAll(
        "[data-nav-link], [data-nav-animate]"
      );
      // Apply CSS transition delay to all animated elements
      animatedEls.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.05}s`;
      });

      // Elements that close the menu on click
      const navLinks = document.querySelectorAll("[data-nav-link]");
      const toggleBtns = document.querySelectorAll(
        '[data-nav-button="toggle"]'
      );
      const closeBtns = document.querySelectorAll(
        '[data-nav-button="close"]'
      );
      const navStatusEl = document.querySelector("[data-nav-status]");
      const navMenuInner = document.querySelector(".nav_menu-inner");
      // Ensure an initial state
      if (navStatusEl && !navStatusEl.getAttribute("data-nav-status")) {
        navStatusEl.setAttribute("data-nav-status", "closed");
      }
      const openMenu = () => {
        if (!navStatusEl) return;
        navStatusEl.setAttribute("data-nav-status", "open");
        navMenuInner?.classList.add("is-open");
        lenis.stop();
      };
      const closeMenu = () => {
        if (!navStatusEl) return;
        navStatusEl.setAttribute("data-nav-status", "closed");
        navMenuInner?.classList.remove("is-open");
        lenis.start();
      };
      const keyHandler = (e) => {
        if (
          e.key === "Escape" &&
          navStatusEl?.getAttribute("data-nav-status") === "open"
        ) {
          closeMenu();
        }
      };
      const toggleHandler = () => {
        if (!navStatusEl) return;
        const isOpen =
          navStatusEl.getAttribute("data-nav-status") === "open";
        isOpen ? closeMenu() : openMenu();
      };
      const closeHandler = () => {
        closeMenu();
      };
      // Add event listeners
      toggleBtns.forEach((btn) =>
        btn.addEventListener("click", toggleHandler)
      );
      closeBtns.forEach((btn) =>
        btn.addEventListener("click", closeHandler)
      );
      // Only data-nav-link closes the menu on click
      navLinks.forEach((link) =>
        link.addEventListener("click", closeHandler)
      );
      document.addEventListener("keydown", keyHandler);
      // Cleanup function
      return () => {
        toggleBtns.forEach((btn) =>
          btn.removeEventListener("click", toggleHandler)
        );
        closeBtns.forEach((btn) =>
          btn.removeEventListener("click", closeHandler)
        );
        navLinks.forEach((link) =>
          link.removeEventListener("click", closeHandler)
        );
        document.removeEventListener("keydown", keyHandler);
      };
    }
    let cleanupMenu = null;
    function handleResponsiveInit() {
      const isTabletDown = window.matchMedia(
        "(max-width: 991px)"
      ).matches;
      if (isTabletDown && !cleanupMenu) {
        cleanupMenu = initMenuOpen();
      } else if (!isTabletDown && cleanupMenu) {
        cleanupMenu();
        cleanupMenu = null;
        const navStatusEl = document.querySelector(
          "[data-nav-status]"
        );
        const navMenuInner = document.querySelector(".nav_menu-inner");
        if (navStatusEl) {
          navStatusEl.setAttribute("data-nav-status", "closed");
        }
        navMenuInner?.classList.remove("is-open");
        lenis.start();
      }
    }
    // Init
    handleResponsiveInit();
    window.addEventListener("resize", handleResponsiveInit);
    // END OF DOM
  });
