
  document.addEventListener("DOMContentLoaded", () => {
    function initAccordions() {
      const accordions = document.querySelectorAll('[data-accordion="component"]');

      accordions.forEach(acc => {
        acc.addEventListener('click', () => {
          const isOpen = acc.getAttribute('data-accordion-state') === 'open';

          // Close every accordion on the page (not just siblings under one parent)
          accordions.forEach(item => {
            item.setAttribute('data-accordion-state', 'close');
          });

          // Re-open the clicked one only if it wasn't already open
          acc.setAttribute('data-accordion-state', isOpen ? 'close' : 'open');
        });
      });
    }

    initAccordions();
  });
