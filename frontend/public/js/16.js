
  document.addEventListener("DOMContentLoaded", () => {

    ScrollTrigger.matchMedia({

      // ===== DESKTOP ONLY (992px and up) =====
      "(min-width: 992px)": function () {

        const video = document.querySelector(".bg-video-2 video");

        ScrollTrigger.create({
          trigger: ".cta-sticky",
          start: "60% top",
          once: true,
          onEnter: () => {
            if (video && video.paused) video.play();
          }
        });

        gsap.to(".footer_logo-wrap-2", {
          y: "60svh",
          ease: "none",
          scrollTrigger: {
            trigger: ".cta-sticky",
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            // markers: true,
          }
        });

      },

      // ===== TABLET (768px - 991px) =====
      "(min-width: 768px) and (max-width: 991px)": function () {

        const video = document.querySelector(".bg-video-2 video");

        ScrollTrigger.create({
          trigger: ".cta-sticky",
          start: "60% top",
          once: true,
          onEnter: () => {
            if (video && video.paused) video.play();
          }
        });

        gsap.to(".footer_logo-wrap-2", {
          y: "75svh",
          ease: "none",
          scrollTrigger: {
            trigger: ".cta-sticky",
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            // markers: true,
          }
        });

      },

      // ===== MOBILE (up to 767px, landscape + portrait) =====
      "(max-width: 767px)": function () {

        const video = document.querySelector(".bg-video-2 video");

        ScrollTrigger.create({
          trigger: ".cta-sticky",
          start: "60% top",
          once: true,
          onEnter: () => {
            if (video && video.paused) video.play();
          }
        });

        gsap.to(".footer_logo-wrap-2", {
          y: "75svh",
          ease: "none",
          scrollTrigger: {
            trigger: ".cta-sticky",
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            // markers: true,
          }
        });

      }

    });

  });
