document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.product-media').forEach(function (section) {
    var grid = section.querySelector('.product-media__grid');
    if (!grid) return;

    var placeholders = Array.prototype.slice.call(grid.querySelectorAll('.product-media__item--placeholder'));
    placeholders.forEach(function (node) {
      node.remove();
    });

    if (!grid.querySelector('.product-media__item')) {
      section.classList.add('product-media--gallery-empty');
    }
  });

  var targets = document.querySelectorAll(
    '.shopify-section .product-media, .shopify-section .product-showcase, .shopify-section .trust-strip, .shopify-section .trust-badges, .shopify-section .product-benefits, .shopify-section .why-choose, .shopify-section .reviews-section, .shopify-section .faq-section, .shopify-section .final-cta'
  );

  if (!targets.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  targets.forEach(function (el) {
    el.classList.add('reveal-on-scroll');
  });

  var observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.12,
    }
  );

  targets.forEach(function (el) {
    observer.observe(el);
  });
});
