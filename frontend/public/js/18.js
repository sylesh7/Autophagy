
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.team-slider_component').forEach((component) => {
      const cmsWrap = component.querySelector('.swiper');
      if (!cmsWrap) return;

      // Prevent transitions from firing on initial load
      cmsWrap.classList.add('is-initializing');

      // Randomize which sign starts the pattern, so it's not identical every page load
      const startSign = Math.random() < 0.5 ? 1 : -1;

      cmsWrap.querySelectorAll('.swiper-slide').forEach((slide, index) => {
        const magnitude = 20 + Math.random() * 10; // random 20–30
        // Sign flips every 2 slides: +,+,-,-,+,+,-,- ...
        const block = Math.floor(index / 2);
        const sign = block % 2 === 0 ? startSign : -startSign;
        const randomDeg = sign * magnitude;
        slide.style.setProperty('--rock-rotate', `${randomDeg.toFixed(2)}deg`);
      });

      const swiper = new Swiper(cmsWrap, {
        slidesPerView: 'auto',
        followFinger: true,
        freeMode: false,
        spaceBetween: 200,
        slideToClickedSlide: false,
        centeredSlides: true,
        loop: true,
        autoHeight: false,
        speed: 900,
        slideActiveClass: 'is-active',
        slideDuplicateActiveClass: 'is-active',
        mousewheel: {
          forceToAxis: true,
        },
        keyboard: {
          enabled: true,
          onlyInViewport: true,
        },
        navigation: {
          nextEl: component.querySelector('.testimonial_arrow.is-next'),
          prevEl: component.querySelector('.testimonial_arrow.is-prev'),
        },
        pagination: {
          el: component.querySelector('.team-slider_bullet_wrap'),
          bulletActiveClass: 'is-active',
          bulletClass: 'team-slider_bullet_item',
          bulletElement: 'button',
          clickable: true,
        },
        scrollbar: {
          el: component.querySelector('.team-slider_draggable_wrap'),
          draggable: true,
          dragClass: 'team-slider_draggable_handle',
          snapOnRelease: true,
        },
        on: {
          init() {
            // Force layout, then re-enable transitions on the next frame
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                cmsWrap.classList.remove('is-initializing');
              });
            });
          },
        },
      });
    });
  });
