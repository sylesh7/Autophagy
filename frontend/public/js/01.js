
  document.addEventListener("DOMContentLoaded", () => {
  const navButton = document.querySelector('[data-nav-button="toggle"]');
  const body = document.body;
  
  // Select regular links and links inside the dropdown, 
  // but EXCLUDE the dropdown trigger itself so it doesn't break the toggle
  const navLinks = document.querySelectorAll(`
    .nav_menu .nav-link:not(.w-dropdown-toggle), 
    .navbar_dropdown-link,
    .nav_button-wrapper .nav-link
  `);

  if (navButton) {
    navButton.addEventListener("click", () => {
      body.classList.toggle("nav-open");
      
      // Optional Lenis control:
      // if (body.classList.contains("nav-open")) window.lenis.stop();
      // else window.lenis.start();
    });
  }

  // Remove the scroll lock if a user clicks an actual link
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      body.classList.remove("nav-open");
      // if (window.lenis) window.lenis.start();
    });
  });
});
