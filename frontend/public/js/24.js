
  document.addEventListener('DOMContentLoaded', () => {
    const accordions = document.querySelectorAll('[data-tabs-accordion]');

    function setHeight(item, opening) {
      const wrap = item.querySelector('.tabs_paragraph-wrap');
      if (!wrap) return;
      if (opening) {
        wrap.style.height = 'auto';
        const fullHeight = wrap.scrollHeight;
        wrap.style.height = '0px';
        wrap.offsetHeight;
        wrap.style.height = fullHeight + 'px';
        wrap.addEventListener('transitionend', function handler(e) {
          if (e.propertyName === 'height' && item.classList.contains('is-active')) {
            wrap.style.height = 'auto';
          }
          wrap.removeEventListener('transitionend', handler);
        });
      } else {
        wrap.style.height = wrap.scrollHeight + 'px';
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

    accordions.forEach((item, index) => {
      const wrap = item.querySelector('.tabs_paragraph-wrap');
      if (index === 0) {
        item.classList.add('is-active');
        if (wrap) wrap.style.height = 'auto';
      } else {
        item.classList.remove('is-active');
        if (wrap) wrap.style.height = '0px';
      }
    });

    accordions.forEach((item) => {
      const trigger = item.querySelector('.tabs_content-top');
      if (!trigger) return;
      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('is-active');
        const offset = 120;

        const triggerTop = trigger.getBoundingClientRect().top;
        let heightAbove = 0;
        accordions.forEach((other) => {
          if (other === item) return;
          if (!other.classList.contains('is-active')) return;
          const otherTop = other.querySelector('.tabs_content-top').getBoundingClientRect().top;
          if (otherTop < triggerTop) {
            const wrap = other.querySelector('.tabs_paragraph-wrap');
            if (wrap) heightAbove += wrap.scrollHeight;
          }
        });

        accordions.forEach((other) => {
          if (other.classList.contains('is-active')) {
            closeItem(other);
          }
        });

        if (!isActive) {
          openItem(item);
          const targetY = window.scrollY + triggerTop - heightAbove - offset;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      });
    });
  });
