
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".section_footer").forEach((footerSection) => {
      const video = footerSection.querySelector(".bg-video-2 video");

      ScrollTrigger.create({
        trigger: footerSection,
        start: "top 50%", // fires when the section's top crosses the middle of the viewport
        once: true,
        onEnter: () => {
          if (video && video.paused) video.play();
        }
      });
    });
  });
