
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);

    const wrapper = document.querySelector('.why_wrapper'); // 180svh
    const stickyEl = document.querySelector('.why_content-wrapper'); // 100svh, sticky
    const items = document.querySelectorAll('[data-why-scroll]');
    const total = items.length;

    if (!wrapper || !stickyEl || !total) return;

    const DURATION = 0.4;
    const EASE = 'power2.out';

    const ACTIVE_HEADING_COLOR = '#f5f5f0';
    const ACTIVE_NUMBER_COLOR = '#f9fe2e';
    const DISABLED_HEADING_COLOR = '#343434';
    const DISABLED_NUMBER_COLOR = '#343434';

    function setActive(index) {
      items.forEach((item, i) => {
        const paragraphWrap = item.querySelector('.why_paragraph-wrap');
        const heading = item.querySelector('.why_content-heading');
        const number = item.querySelector('.why_content-number');
        const spacer = item.querySelector('.why_spacer');

        if (i === index) {
          gsap.to(paragraphWrap, { height: 'auto', duration: DURATION, ease: EASE });
          gsap.to(heading, { color: ACTIVE_HEADING_COLOR, duration: DURATION, ease: EASE });
          gsap.to(number, { color: ACTIVE_NUMBER_COLOR, duration: DURATION, ease: EASE });
          if (spacer) gsap.set(spacer, { display: 'block' });
        } else {
          gsap.to(paragraphWrap, { height: 0, duration: DURATION, ease: EASE });
          gsap.to(heading, { color: DISABLED_HEADING_COLOR, duration: DURATION, ease: EASE });
          gsap.to(number, { color: DISABLED_NUMBER_COLOR, duration: DURATION, ease: EASE });
          if (spacer) gsap.set(spacer, { display: 'none' });
        }
      });
    }

    // Initial state: first item active, rest disabled (no animation on load)
    items.forEach((item, i) => {
      const paragraphWrap = item.querySelector('.why_paragraph-wrap');
      const heading = item.querySelector('.why_content-heading');
      const number = item.querySelector('.why_content-number');
      const spacer = item.querySelector('.why_spacer');

      gsap.set(paragraphWrap, { height: i === 0 ? 'auto' : 0 });
      gsap.set(heading, { color: i === 0 ? ACTIVE_HEADING_COLOR : DISABLED_HEADING_COLOR });
      gsap.set(number, { color: i === 0 ? ACTIVE_NUMBER_COLOR : DISABLED_NUMBER_COLOR });
      if (spacer) gsap.set(spacer, { display: i === 0 ? 'block' : 'none' });
    });

    let currentIndex = 0;

    ScrollTrigger.create({
      trigger: wrapper,
      start: 'top top',
      // End exactly when the sticky element disengages:
      // total scroll distance while sticky = wrapper height - sticky element height
      end: () => `+=${wrapper.offsetHeight - stickyEl.offsetHeight}`,
      // markers: true, // uncomment to debug start/end positions
      onUpdate: (self) => {
        let index = Math.floor(self.progress * total);
        if (index >= total) index = total - 1;
        if (index < 0) index = 0;

        if (index !== currentIndex) {
          currentIndex = index;
          setActive(currentIndex);
        }
      },
      onLeaveBack: () => {
        currentIndex = 0;
        setActive(0);
      },
    });

    // Recalculate end value on resize since it depends on element heights
    ScrollTrigger.addEventListener('refreshInit', () => {
      // ScrollTrigger automatically re-evaluates the function-based `end`
    });
  });
