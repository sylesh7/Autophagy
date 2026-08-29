
(function () {
  'use strict';
  var SELECTOR = '.marquee__track';   // change to match your Webflow element
  var DEFAULT_DURATION = 26;          // seconds per set (lower = faster)
  var COPIES = 3;                     // copies for a seamless wrap (>= 2)
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(track) {
    if (!track || track.__marqueeInit) return;
    var originals = Array.prototype.slice.call(track.children);
    if (!originals.length) return;
    track.__marqueeInit = true;
    for (var c = 1; c < COPIES; c++)
      for (var i = 0; i < originals.length; i++) track.appendChild(originals[i].cloneNode(true));
    if (REDUCE) return;

    track.style.willChange = 'transform';
    if (!track.style.whiteSpace) track.style.whiteSpace = 'nowrap';
    var dur = parseFloat(track.getAttribute('data-marquee-duration')) || DEFAULT_DURATION;
    var reverse = track.hasAttribute('data-marquee-reverse');
    var setW = 0, offset = 0, last = 0, raf = 0;

    function measure() { setW = track.scrollWidth / COPIES; }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!last) { last = now; return; }
      var dt = (now - last) / 1000; last = now;
      if (dt > 0.1) dt = 0.1;
      if (setW <= 0) { measure(); return; }
      offset = (offset + (setW / dur) * dt) % setW;
      var x = reverse ? (offset - setW) : -offset;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    }
    function run() { measure(); if (!raf) raf = requestAnimationFrame(frame); }

    var pending = Array.prototype.slice.call(track.querySelectorAll('img')).filter(function (im) { return !im.complete; });
    if (!pending.length) { run(); }
    else {
      var left = pending.length;
      var done = function () { if (--left <= 0) run(); };
      pending.forEach(function (im) { im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true }); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    window.addEventListener('load', run);
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(measure, 200); });
  }
  function boot() { var t = document.querySelectorAll(SELECTOR); for (var i = 0; i < t.length; i++) init(t[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
