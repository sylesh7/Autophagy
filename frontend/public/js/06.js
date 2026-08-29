
(function () {
  var el = document.querySelector('.section_statement.show-tablet');
  if (!el) return;
  var START = 0.65, END = 0.35; // top 35%-from-bottom -> 0 ; 35%-from-top -> 1
  el.style.willChange = 'opacity';
  function render() {
    var vh = window.innerHeight, top = el.getBoundingClientRect().top;
    var t = (START * vh - top) / ((START - END) * vh);
    el.style.opacity = Math.min(Math.max(t, 0), 1).toFixed(3);
  }
  var ticking = false;
  function onScroll(){ if (ticking) return; ticking = true; requestAnimationFrame(function(){ render(); ticking = false; }); }
  render();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
})();
