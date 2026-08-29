
  document.addEventListener("DOMContentLoaded", () => {
    //START OF DOM

    //Lenis Setup
    let lenis;
    
    // Initialize Lenis (only outside Webflow Editor)
    if (typeof Webflow === "undefined" || (Webflow.env && Webflow.env("editor") === undefined)) {
      lenis = new Lenis({
        lerp: 0.15,
        wheelMultiplier: 1,
        gestureOrientation: "vertical",
        normalizeWheel: false,
        smoothTouch: false,
      });

      // --- START OF DYNAMIC OFFSET & TOC FIX ---
      document.addEventListener('click', function(e) {
        const anchor = e.target.closest('a[href^="#"]');
        
        if (anchor) {
          const targetId = anchor.getAttribute('href');
          
          if (targetId === '#' || targetId === '' || anchor.hasAttribute('data-w-tab')) return; 

          if (targetId.startsWith('#')) {
             const targetElement = document.querySelector(targetId);

             if (targetElement) {
               e.preventDefault(); 
               e.stopPropagation(); 
               
               // DYNAMIC OFFSET: Automatically get the height of your fixed navbar
               let scrollOffset = -80; // Fallback value
               const navbar = document.querySelector('.navbar'); // <--- UPDATE THIS CLASS IF NEEDED
               
               if (navbar) {
                 scrollOffset = -(navbar.offsetHeight); // Turns height into a negative number for Lenis
               }
               
               // THE FIX: Faster duration and proper mathematical easing
               lenis.scrollTo(targetElement, {
                 offset: scrollOffset, 
                 duration: 0.8, 
                 easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) 
               });
             }
          }
        }
      }, true); 
      // --- END OF DYNAMIC OFFSET & TOC FIX ---

      // Disable pointer-events on videos while scrolling
      const videoWrappers = document.querySelectorAll('.common-lock-up_video.w-video.w-embed');
      let lastScrollPos = lenis.scroll || window.scrollY;

      function checkScroll() {
        const currentScrollPos = lenis.scroll || window.scrollY;

        videoWrappers.forEach(wrapper => {
          wrapper.style.pointerEvents = currentScrollPos !== lastScrollPos ? 'none' : 'auto';
        });

        lastScrollPos = currentScrollPos;
        requestAnimationFrame(checkScroll);
      }

      requestAnimationFrame(checkScroll);

      // Back to Top Button
      const backToTop = document.getElementById("backToTop");
      if (backToTop) {
        backToTop.addEventListener("click", (e) => {
          e.preventDefault();
          lenis.scrollTo(0, {
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
        });

        window.addEventListener("scroll", () => {
          const visible = window.scrollY > 300;
          backToTop.style.opacity = visible ? "1" : "0";
          backToTop.style.pointerEvents = visible ? "auto" : "none";
        }, { passive: true });
      }

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // jQuery check
    if (typeof $ === "undefined") {
      console.warn("jQuery is required for this script.");
      return;
    }

    // Start Lenis
    $("[data-lenis-start]").on("click", function () {
      lenis.start();
    });

    // Stop Lenis
    $("[data-lenis-stop]").on("click", function () {
      lenis.stop();
    });

    // Toggle Lenis Scroll
    $("[data-lenis-toggle]").on("click", function () {
      $(this).toggleClass("stop-scroll");
      $(this).hasClass("stop-scroll") ? lenis?.stop() : lenis?.start();
    });

    //END OF DOM
  });
