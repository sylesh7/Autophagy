
  document.addEventListener("DOMContentLoaded", () => {
    //START OF DOM

    // Array to store SplitText instances
    let splits = [];

    function runSplitText() {
      // Revert previous splits
      splits.forEach(s => s.revert());
      splits = [];

      // Find all target elements
      const elements = document.querySelectorAll("[text-animate], [split-text]");

      elements.forEach(el => {
        const splitInstance = new SplitText(el, {
          type: "lines, words",
          linesClass: "line",
          wordsClass: "word",
          mask: "lines"
        });
        splits.push(splitInstance);
      });
    }

    // Wait until fonts are loaded before splitting
    document.fonts.ready.then(() => {
      runSplitText();

      // Re-split on width change
      let windowWidth = window.innerWidth;
      window.addEventListener("resize", () => {
        if (windowWidth !== window.innerWidth) {
          windowWidth = window.innerWidth;
          runSplitText();
        }
      });

      // Animation Types
      let animateLines = document.querySelectorAll("[text-animate='lines']");
      let animateWord = document.querySelectorAll("[text-animate='words']");
      let animateScrub = document.querySelectorAll("[text-animate='scrub']");

      // Lines Slide Up Animation
      animateLines.forEach(function (el) {
        gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom bottom"
          }
        }).from(el.querySelectorAll(".line"), {
          yPercent: 115,
          duration: 1,
          ease: "power3.out",
          stagger: 0.01,
          delay: 0.5
        });
      });

      // Words Slide Up Animation
      animateWord.forEach(function (el) {
        gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom bottom"
          }
        }).from(el.querySelectorAll(".word"), {
          yPercent: 115,
          duration: 1,
          ease: "power3.out",
          stagger: 0.01,
          delay: 0.5
        });
      });

      // Word Fade-In Scrub Animation
      animateScrub.forEach(function (el) {
        gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top center",
            end: "bottom center",
            scrub: true
          }
        }).from(el.querySelectorAll(".word"), {
          opacity: 0.3,
          duration: 0.4,
          ease: "power1.out",
          stagger: 0.1
        });
      });
    });

    // Fade In Children
    $("[fade-in]").each(function () {
      gsap.timeline({
        scrollTrigger: {
          trigger: this,
          start: "top bottom",
          end: "bottom bottom"
        }
      }).from($(this).children(), {
        opacity: 0,
        y: "1.5rem",
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.01,
        delay: 0.5
      });
    });

    // Fade In Self
    $("[fade-in-self]").each(function () {
      gsap.timeline({
        scrollTrigger: {
          trigger: this,
          start: "top bottom",
          end: "bottom bottom"
        }
      }).from($(this), {
        opacity: 0,
        y: "1.5rem",
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.01,
        delay: 0.5
      });
    });

    // Parallax Images
    $("[parallax-image]").each(function () {
      gsap.timeline({
        scrollTrigger: {
          trigger: this,
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      }).from($(this), {
        yPercent: -15,
        ease: "none"
      });
    });

    // Avoid Flashing Content
    document.fonts.ready.then(() => {
      gsap.set(".page-wrapper", { opacity: 1 });
    });

    //END OF DOM
  });
