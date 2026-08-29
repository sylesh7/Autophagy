
document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.querySelectorAll('.categories_item-btn');

  // --- 1. Set up hover behavior, but respect "current page" buttons ---
  buttons.forEach((btn) => {
    btn.addEventListener('mouseenter', () => btn.classList.add('is-active'));
    btn.addEventListener('mouseleave', () => {
      // Don't remove the active state if this button represents the current page
      if (btn.dataset.current === 'true') return;
      btn.classList.remove('is-active');
    });
  });

  // --- 2. Determine current page and mark/activate the matching button ---
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');

  buttons.forEach(btn => {
    btn.dataset.current = 'false';
    btn.classList.remove('is-active');
  });

  if (path === '/resources') {
    const staticBtn = document.querySelector('[data-button="categories-static-btn"]');
    if (staticBtn) {
      staticBtn.classList.add('is-active');
      staticBtn.dataset.current = 'true';
    }
    return;
  }

  if (path.startsWith('/categories/')) {
    const slug = path.split('/').pop().replace(/-/g, ' '); // "blog", "news", etc.

    buttons.forEach(btn => {
      const btnText = btn.textContent.trim().toLowerCase();
      if (btnText === slug) {
        btn.classList.add('is-active');
        btn.dataset.current = 'true';
      }
    });
  }
});
