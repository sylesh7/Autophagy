
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".s_component").forEach((component) => {
    const sWrap = component.querySelector(".swiper");
    if (!sWrap) return;

    const navNumberEl = component.querySelector(".testimonials_nav-number");
    const currentEl = navNumberEl?.querySelector(".s_nav-current");
    const totalEl = navNumberEl?.querySelector(".s_nav-total");

    // pads single digits with a leading zero: 1 -> "01", 12 -> "12"
    const pad = (num) => String(num).padStart(2, "0");

    const updateNavNumber = (swiper) => {
      if (!navNumberEl) return;

      // realIndex accounts for loop mode; use activeIndex if loop is off
      const current = (swiper.params.loop ? swiper.realIndex : swiper.activeIndex) + 1;
      const total = swiper.params.loop
        ? swiper.slides.length - (swiper.loopedSlides ? swiper.loopedSlides * 2 : 0)
        : swiper.slides.length;

      if (currentEl && totalEl) {
        currentEl.textContent = pad(current);
        totalEl.textContent = pad(total);
      } else {
        // fallback if it's just one text node like "01/03"
        navNumberEl.textContent = `${pad(current)}/${pad(total)}`;
      }
    };

    const swiper = new Swiper(sWrap, {
      slidesPerView: "auto",
      followFinger: true,
      freeMode: false,
      slideToClickedSlide: false,
      centeredSlides: true,
      spaceBetween: 20,
      autoHeight: false,
      speed: 700,
      slideActiveClass: "is-active",
      slideDuplicateActiveClass: "is-active",
      mousewheel: {
        forceToAxis: true,
      },
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      navigation: {
        nextEl: component.querySelector(".s_btn_element.is-next"),
        prevEl: component.querySelector(".s_btn_element.is-prev"),
      },
      pagination: {
        el: component.querySelector(".s_bullet_wrap"),
        bulletActiveClass: "is-active",
        bulletClass: "s_bullet_item",
        bulletElement: "button",
        clickable: true,
      },
      scrollbar: {
        el: component.querySelector(".s_draggable_wrap"),
        draggable: true,
        dragClass: "s_handle",
        snapOnRelease: true,
      },
      on: {
        init: updateNavNumber,
        slideChange: updateNavNumber,
      },
    });
  });
});
