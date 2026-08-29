
  document.addEventListener('DOMContentLoaded', function () {
    var COOKIE_NAME = 'navBannerDismissedId';

    function getCookie(name) {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    }

    function setCookie(name, value) {
      // 1 year expiry — effectively "forever" until cookies are cleared
      var maxAge = 60 * 60 * 24 * 365;
      document.cookie = name + '=' + encodeURIComponent(value) +
        '; max-age=' + maxAge + '; path=/; SameSite=Lax';
    }

    var closeBtn = document.querySelector('.nav_banner-close');
    var banner = document.querySelector('.nav_banner');
    var textEl = document.querySelector('.nav_banner-link .text-size-small.is-custom');
    if (!banner) return;

    // Identify the current banner. Prefer a manual data-banner-id attribute
    // on the .nav_banner element, e.g. data-banner-id="promo-july-2026".
    // Falls back to the banner text if no id is set.
    var currentBannerId = banner.getAttribute('data-banner-id') ||
      (textEl ? textEl.textContent.trim() : '');

    var dismissedId = getCookie(COOKIE_NAME);
    if (dismissedId && dismissedId === currentBannerId) {
      banner.style.display = 'none';
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        setCookie(COOKIE_NAME, currentBannerId);
        banner.classList.add('is-hidden');
        banner.addEventListener('transitionend', function handler() {
          banner.style.display = 'none';
          banner.removeEventListener('transitionend', handler);
        });
      });
    }
  });
