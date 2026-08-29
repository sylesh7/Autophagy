
  document.addEventListener("DOMContentLoaded", () => {
    // START OF DOM

    const currentYear = new Date().getFullYear();
    document.querySelectorAll('[data-current-year]').forEach(el => {
      el.textContent = currentYear;
    });

    //END OF DOM
  });
