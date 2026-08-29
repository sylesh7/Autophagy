
  document.addEventListener('DOMContentLoaded', function () {
    var maxChars = 80;
    var el = document.querySelector('.nav_banner-link .text-size-small.is-custom');
    if (el) {
      var fullText = el.textContent.trim();
      if (fullText.length > maxChars) {
        el.textContent = fullText.slice(0, maxChars).trim() + '...';
      }
    }
  });
