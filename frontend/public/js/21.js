
  document.addEventListener('DOMContentLoaded', () => {
    const accordions = document.querySelectorAll('[data-why-accordion]');

    function setHeight(item, opening) {
      const wrap = item.querySelector('.why_paragraph-wrap');
      if (!wrap) return;

      if (opening) {
        // measure natural height
        wrap.style.height = 'auto';
        const fullHeight = wrap.scrollHeight;
        wrap.style.height = '0px';
        // force reflow so the transition triggers from 0
        wrap.offsetHeight;
        wrap.style.height = fullHeight + 'px';
      } else {
        // collapse from current height to 0
        const currentHeight = wrap.scrollHeight;
        wrap.style.height = currentHeight + 'px';
        wrap.offsetHeight;
        wrap.style.height = '0px';
      }
    }

    function openItem(item) {
      item.classList.add('is-active');
      setHeight(item, true);
    }

    function closeItem(item) {
      item.classList.remove('is-active');
      setHeight(item, false);
    }

    // Initialize: first item open, rest closed
    accordions.forEach((item, index) => {
      if (index === 0) {
        item.classList.add('is-active');
        const wrap = item.querySelector('.why_paragraph-wrap');
        if (wrap) wrap.style.height = wrap.scrollHeight + 'px';
      } else {
        item.classList.remove('is-active');
      }
    });

    accordions.forEach((item) => {
      const trigger = item.querySelector('.why_content-top');
      if (!trigger) return;

      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('is-active');

        accordions.forEach((other) => {
          if (other.classList.contains('is-active')) {
            closeItem(other);
          }
        });

        if (!isActive) {
          openItem(item);
        }
      });
    });
  });
