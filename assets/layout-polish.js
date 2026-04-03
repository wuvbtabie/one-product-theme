document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.product-media').forEach(function (section) {
    var grid = section.querySelector('.product-media__grid');
    if (!grid) return;

    var hasRealMedia = Boolean(grid.querySelector('.product-media__item img, .product-media__item video, .product-media__item iframe'));
    if (!hasRealMedia) {
      section.classList.add('product-media--gallery-empty');
    } else {
      section.classList.remove('product-media--gallery-empty');
    }
  });

  var targets = document.querySelectorAll(
    '.shopify-section .product-media, .shopify-section .product-showcase, .shopify-section .trust-strip, .shopify-section .trust-badges, .shopify-section .product-benefits, .shopify-section .why-choose, .shopify-section .reviews-section, .shopify-section .faq-section, .shopify-section .final-cta'
  );

  if (document.body.classList.contains('template-index')) {
    var utilitySectionIds = ['benefits', 'reviews', 'faq'];
    var utilitySections = utilitySectionIds
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    var setUtilitySectionState = function (activeId, shouldScroll) {
      utilitySections.forEach(function (section) {
        var isActive = section.id === activeId;
        section.hidden = !isActive;
        section.classList.toggle('is-manually-visible', isActive);

        if (isActive) {
          section.classList.add('is-visible');
        }
      });

      if (!activeId || !shouldScroll) return;

      window.requestAnimationFrame(function () {
        var activeSection = document.getElementById(activeId);
        if (!activeSection) return;

        activeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    var syncUtilitySectionsFromHash = function (shouldScroll) {
      var hash = window.location.hash.replace('#', '');

      if (utilitySectionIds.indexOf(hash) !== -1) {
        setUtilitySectionState(hash, shouldScroll);
        return;
      }

      setUtilitySectionState('', false);
    };

    document.querySelectorAll('a[href="#benefits"], a[href="#reviews"], a[href="#faq"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var targetId = link.getAttribute('href').replace('#', '');
        if (!targetId) return;

        event.preventDefault();

        if (window.location.hash === '#' + targetId) {
          setUtilitySectionState(targetId, true);
          return;
        }

        window.location.hash = targetId;
      });
    });

    window.addEventListener('hashchange', function () {
      syncUtilitySectionsFromHash(true);
    });

    syncUtilitySectionsFromHash(false);
  }

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
