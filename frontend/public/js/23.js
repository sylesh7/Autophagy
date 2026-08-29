
  (function () {
    const items = document.querySelectorAll('[data-why-accordion="item"]');

    function setHeight(item, open) {
      const wrap = item.querySelector('[data-why-accordion="paragraph-wrap"]');
      if (open) {
        wrap.style.height = wrap.scrollHeight + 'px';
        // once expanded, allow auto height for responsive content
        wrap.addEventListener('transitionend', function handler(e) {
          if (e.propertyName === 'height' && item.classList.contains('is-active')) {
            wrap.style.height = 'auto';
          }
          wrap.removeEventListener('transitionend', handler);
        });
      } else {
        // if currently auto, set explicit px first so the transition can run
        if (wrap.style.height === 'auto' || wrap.style.height === '') {
          wrap.style.height = wrap.scrollHeight + 'px';
          // force reflow
          wrap.offsetHeight;
        }
        requestAnimationFrame(() => {
          wrap.style.height = '0px';
        });
      }
    }

    items.forEach((item) => {
      const top = item.querySelector('[data-why-accordion="content-top"]');
      top.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-active');
        if (isOpen) return; // clicking the open one keeps it open; remove this line to allow full close

        items.forEach((other) => {
          if (other !== item && other.classList.contains('is-active')) {
            other.classList.remove('is-active');
            setHeight(other, false);
          }
        });

        item.classList.add('is-active');
        setHeight(item, true);
      });
    });

    // initialize first item's wrap to auto height on load
    window.addEventListener('load', () => {
      items.forEach((item) => {
        if (item.classList.contains('is-active')) {
          const wrap = item.querySelector('[data-why-accordion="paragraph-wrap"]');
          wrap.style.height = wrap.scrollHeight + 'px';
          requestAnimationFrame(() => {
            wrap.style.height = 'auto';
          });
        }
      });
    });
  })();
