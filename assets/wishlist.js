(function () {
  var STORAGE_KEY = 'one_product_theme_wishlist_v1';

  function safeGetStorage() {
    try {
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function safeParse(value) {
    try {
      var parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function getItems() {
    var storage = safeGetStorage();
    if (!storage) return [];
    return safeParse(storage.getItem(STORAGE_KEY));
  }

  function setItems(items) {
    var storage = safeGetStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    document.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { items: items } }));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isSaved(handle) {
    if (!handle) return false;
    return getItems().some(function (item) { return item.handle === handle; });
  }

  function normalizeItem(item) {
    return {
      id: item && item.id ? String(item.id) : '',
      handle: item && item.handle ? String(item.handle) : '',
      title: item && item.title ? String(item.title) : 'Product',
      url: item && item.url ? String(item.url) : '#',
      image: item && item.image ? String(item.image) : '',
      price: Number(item && item.price ? item.price : 0),
      variantTitle: item && item.variantTitle ? String(item.variantTitle) : '',
      selectedVariantId: item && item.selectedVariantId ? String(item.selectedVariantId) : ''
    };
  }

  function saveItem(item) {
    var normalized = normalizeItem(item);
    if (!normalized.handle) return false;

    var items = getItems().filter(function (saved) {
      return saved.handle !== normalized.handle;
    });

    items.unshift(normalized);
    setItems(items.slice(0, 50));
    return true;
  }

  function toggleItem(item) {
    var items = getItems();
    var index = items.findIndex(function (saved) { return saved.handle === item.handle; });

    if (index > -1) {
      items.splice(index, 1);
      setItems(items);
      return false;
    }

    saveItem(item);
    return true;
  }

  function removeItem(handle) {
    var items = getItems().filter(function (item) { return item.handle !== handle; });
    setItems(items);
  }

  function formatMoney(cents) {
    var amount = Number(cents || 0) / 100;
    var locale = 'en-US';
    var currency = 'USD';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
      return amount.toFixed(2) + ' ' + currency;
    }
  }

  function updateButtonsState() {
    document.querySelectorAll('[data-wishlist-toggle]').forEach(function (button) {
      var handle = button.getAttribute('data-product-handle');
      var active = isSaved(handle);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      var label = button.querySelector('.wishlist-toggle__label');
      if (label) label.textContent = active ? 'Saved' : 'Save';
    });
  }

  function updateCount() {
    var count = getItems().length;
    document.querySelectorAll('[data-wishlist-count], [data-wishlist-page-count]').forEach(function (node) {
      node.textContent = count;
      node.classList.toggle('visible', count > 0);
    });
  }

  function setAvailabilityState(itemEl, isAvailable) {
    if (!itemEl) return;
    var availabilityEl = itemEl.querySelector('[data-wishlist-availability]');
    if (!availabilityEl) return;

    var available = isAvailable !== false;
    availabilityEl.textContent = available ? 'In stock' : 'Currently unavailable';
    availabilityEl.classList.toggle('is-unavailable', !available);
  }

  function buildWishlistItemMarkup(item) {
    var title = escapeHtml(item.title);
    var url = escapeHtml(item.url);
    var handle = escapeHtml(item.handle);
    var imageHtml = item.image
      ? '<a class="wishlist-item__img-wrap" href="' + url + '" tabindex="-1" aria-hidden="true"><img class="wishlist-item__image" src="' + escapeHtml(item.image) + '" alt="' + title + '" loading="lazy"></a>'
      : '<div class="wishlist-item__img-wrap wishlist-item__img-wrap--empty" aria-hidden="true"></div>';
    var priceHtml = item.price ? '<p class="wishlist-item__price">' + formatMoney(item.price) + '</p>' : '';
    var variantHtml = item.variantTitle && item.variantTitle !== 'Default Title'
      ? '<p class="wishlist-item__meta">' + escapeHtml(item.variantTitle) + '</p>'
      : '';

    return [
      '<article class="wishlist-item" data-handle="' + handle + '" data-product-url="' + url + '" data-selected-variant-id="' + escapeHtml(item.selectedVariantId || '') + '" data-wishlist-item>',
      '<div class="wishlist-item__swipe-actions" aria-hidden="true">',
      '<button type="button" class="wishlist-item__swipe-remove" data-wishlist-remove="' + handle + '" aria-label="Remove ' + title + ' from saved for later">',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M9 3.75h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '<path d="M4.5 6.75h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '<path d="M7.5 6.75v11.25a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V6.75" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M10 10.25v5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '<path d="M14 10.25v5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '</svg>',
      '<span>Delete</span>',
      '</button>',
      '</div>',
      '<div class="wishlist-item__surface" data-wishlist-item-surface>',
      imageHtml,
      '<div class="wishlist-item__body">',
      '<a class="wishlist-item__title" href="' + url + '">' + title + '</a>',
      priceHtml,
      variantHtml,
      '<p class="wishlist-item__availability" data-wishlist-availability>Checking availability</p>',
      '<div class="wishlist-item__variants" data-variants-for="' + handle + '">',
      '<span class="wishlist-item__variants-loading">Loading options…</span>',
      '</div>',
      '<div class="wishlist-item__actions">',
      '<button type="button" class="wishlist-item__atc" data-wishlist-add-to-cart data-product-url="' + url + '">Add to Cart</button>',
      '<button type="button" class="wishlist-item__remove-btn" data-wishlist-remove="' + handle + '" aria-label="Remove ' + title + ' from saved for later">',
      '<span class="wishlist-item__remove-icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M9 3.75h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '<path d="M4.5 6.75h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '<path d="M7.5 6.75v11.25a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V6.75" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M10 10.25v5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '<path d="M14 10.25v5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      '</svg>',
      '</span>',
      '<span class="wishlist-item__remove-label">Remove</span>',
      '</button>',
      '</div>',
      '</div>',
      '</div>',
      '</article>'
    ].join('');
  }

  function renderPage() {
    var items = getItems();
    var container = document.querySelector('[data-wishlist-page-items]');
    var empty = document.querySelector('[data-wishlist-page-empty]');
    if (!container || !empty) return;

    if (items.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('saved-items-page__empty--hidden');
      return;
    }

    empty.classList.add('saved-items-page__empty--hidden');
    container.innerHTML = items.map(buildWishlistItemMarkup).join('');

    items.forEach(function (item) {
      loadVariantsForItem(item.handle, item.url, item.selectedVariantId);
    });
  }

  function setWishlistItemOffset(itemEl, offset, shouldAnimate) {
    var surface = itemEl.querySelector('[data-wishlist-item-surface]');
    var actions = itemEl.querySelector('.wishlist-item__swipe-actions');
    if (!surface || !actions) return;

    var actionWidth = actions.offsetWidth || 98;
    var clamped = Math.max(-actionWidth, Math.min(0, offset || 0));
    surface.style.transition = shouldAnimate ? 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    surface.style.transform = 'translate3d(' + clamped + 'px, 0, 0)';
    itemEl.classList.toggle('is-revealed', clamped < -12);
    itemEl.dataset.offset = String(clamped);
  }

  function closeWishlistSwipeItems(exceptEl) {
    var container = document.querySelector('[data-wishlist-page-items]');
    if (!container) return;

    container.querySelectorAll('[data-wishlist-item].is-revealed').forEach(function (itemEl) {
      if (exceptEl && itemEl === exceptEl) return;
      setWishlistItemOffset(itemEl, 0, true);
    });
  }

  function initWishlistPageSwipe() {
    var container = document.querySelector('[data-wishlist-page-items]');
    if (!container) return;

    var mobileQuery = window.matchMedia('(max-width: 768px)');
    var swipeState = null;

    container.addEventListener('touchstart', function (event) {
      if (!mobileQuery.matches) return;
      if (event.target.closest('button, a, input, label')) return;

      var surface = event.target.closest('[data-wishlist-item-surface]');
      if (!surface) return;

      var itemEl = surface.closest('[data-wishlist-item]');
      if (!itemEl) return;

      closeWishlistSwipeItems(itemEl);

      var touch = event.touches[0];
      swipeState = {
        item: itemEl,
        startX: touch.clientX,
        startY: touch.clientY,
        startOffset: parseFloat(itemEl.dataset.offset || '0') || 0,
        locked: false,
        horizontal: false
      };
    }, { passive: true });

    container.addEventListener('touchmove', function (event) {
      if (!swipeState || !mobileQuery.matches) return;

      var touch = event.touches[0];
      var deltaX = touch.clientX - swipeState.startX;
      var deltaY = touch.clientY - swipeState.startY;

      if (!swipeState.locked) {
        swipeState.locked = true;
        swipeState.horizontal = Math.abs(deltaX) > Math.abs(deltaY);
      }

      if (!swipeState.horizontal) return;

      event.preventDefault();
      setWishlistItemOffset(swipeState.item, swipeState.startOffset + deltaX, false);
    }, { passive: false });

    container.addEventListener('touchend', function () {
      if (!swipeState || !mobileQuery.matches) return;

      var itemEl = swipeState.item;
      var actions = itemEl.querySelector('.wishlist-item__swipe-actions');
      var actionWidth = actions ? actions.offsetWidth || 98 : 98;
      var currentOffset = parseFloat(itemEl.dataset.offset || '0') || 0;
      var shouldReveal = currentOffset <= -(actionWidth * 0.4);

      setWishlistItemOffset(itemEl, shouldReveal ? -actionWidth : 0, true);
      swipeState = null;
    });

    container.addEventListener('touchcancel', function () {
      if (!swipeState) return;
      setWishlistItemOffset(swipeState.item, 0, true);
      swipeState = null;
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-wishlist-item]')) return;
      closeWishlistSwipeItems();
    });
  }

  function loadVariantsForItem(handle, url, selectedVariantId) {
    var productPath = (url || '').split('?')[0];
    if (!productPath || productPath === '#') return;
    fetch(productPath + '.js')
      .then(function (r) { return r.json(); })
      .then(function (product) {
        var container = document.querySelector('[data-variants-for="' + handle + '"]');
        if (!container) return;
        var variants = product.variants || [];
        var options = product.options || [];
        var hasRealOptions = options.length > 1 || (options.length === 1 && options[0].name !== 'Title');
        var articleEl = container.closest('.wishlist-item');
        var preferredVariant = null;

        if (selectedVariantId) {
          preferredVariant = variants.find(function (variant) {
            return String(variant.id) === String(selectedVariantId);
          }) || null;
        }

        if (!hasRealOptions || variants.length <= 1) {
          container.innerHTML = '';
          if (articleEl && (preferredVariant || variants[0])) {
            articleEl.dataset.selectedVariantId = (preferredVariant || variants[0]).id;
            setAvailabilityState(articleEl, !!(preferredVariant || variants[0]).available);
          }
          return;
        }
        var firstAvailable = preferredVariant || variants.find(function (v) { return v.available; }) || variants[0];
        if (articleEl && firstAvailable) {
          articleEl.dataset.selectedVariantId = firstAvailable.id;
          setAvailabilityState(articleEl, !!firstAvailable.available);
        }
        container.innerHTML = variants.map(function (variant) {
          var isSelected = firstAvailable && variant.id === firstAvailable.id;
          return '<button type="button" class="wishlist-item__variant-btn' + (isSelected ? ' is-selected' : '') + '"' +
            ' data-variant-id="' + variant.id + '"' +
            ' data-variant-price="' + variant.price + '"' +
            ' data-variant-available="' + (variant.available ? 'true' : 'false') + '"' +
            (!variant.available ? ' aria-disabled="true"' : '') + '>' +
            escapeHtml(variant.title) + '</button>';
        }).join('');
      })
      .catch(function () {
        var container = document.querySelector('[data-variants-for="' + handle + '"]');
        if (container) container.innerHTML = '';
        var itemEl = container ? container.closest('.wishlist-item') : null;
        setAvailabilityState(itemEl, true);
      });
  }

  function addToCartFromWishlist(productUrl, button, variantId, handle, shouldRedirectToCart) {
    if (!productUrl) return;
    if (button) {
      button.disabled = true;
      button.textContent = 'Adding...';
    }
    var doAdd = function (id) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, quantity: 1 })
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('cart add failed');
        }
        return response.json();
      });
    };
    var finish = function () {
      if (handle) {
        removeItem(handle);
      }
      if (button) { button.textContent = 'Added!'; }
      setTimeout(function () {
        if (shouldRedirectToCart) {
          window.location.href = '/cart';
          return;
        }
        window.location.reload();
      }, 450);
    };
    var fail = function () {
      if (button) { button.disabled = false; button.textContent = 'Add to Cart'; }
    };
    if (variantId) {
      doAdd(variantId).then(finish).catch(fail);
      return;
    }
    fetch(productUrl.replace(/\?.*/, '') + '.js')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('product load failed');
        }
        return response.json();
      })
      .then(function (product) {
        var variant = (product.variants || []).find(function (v) { return v.available; }) || (product.variants || [])[0];
        if (!variant) throw new Error('no variant');
        return doAdd(variant.id);
      })
      .then(finish)
      .catch(fail);
  }

  function readButtonData(button) {
    return {
      id: button.getAttribute('data-product-id') || '',
      handle: button.getAttribute('data-product-handle') || '',
      title: button.getAttribute('data-product-title') || 'Product',
      url: button.getAttribute('data-product-url') || '#',
      image: button.getAttribute('data-product-image') || '',
      price: Number(button.getAttribute('data-product-price') || 0)
    };
  }

  function syncUI() {
    updateButtonsState();
    updateCount();
    renderPage();
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-wishlist-toggle]');
    if (toggle) {
      event.preventDefault();
      var item = readButtonData(toggle);
      if (!item.handle) return;
      toggleItem(item);
      syncUI();
      return;
    }

    var addBtn = event.target.closest('[data-wishlist-add-to-cart]');
    if (addBtn) {
      event.preventDefault();
      var articleEl = addBtn.closest('.wishlist-item');
      var selectedVariantId = articleEl ? articleEl.dataset.selectedVariantId : null;
      var handle = articleEl ? articleEl.getAttribute('data-handle') : '';
      var shouldRedirectToCart = !!addBtn.closest('[data-wishlist-page-items]');
      addToCartFromWishlist(addBtn.getAttribute('data-product-url'), addBtn, selectedVariantId, handle, shouldRedirectToCart);
      return;
    }

    var variantBtn = event.target.closest('.wishlist-item__variant-btn');
    if (variantBtn && variantBtn.getAttribute('aria-disabled') !== 'true') {
      var itemEl = variantBtn.closest('.wishlist-item');
      if (itemEl) {
        itemEl.querySelectorAll('.wishlist-item__variant-btn').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        variantBtn.classList.add('is-selected');
        itemEl.dataset.selectedVariantId = variantBtn.dataset.variantId;
        var priceEl = itemEl.querySelector('.wishlist-item__price');
        var rawPrice = parseInt(variantBtn.dataset.variantPrice || '0', 10);
        if (priceEl && rawPrice) priceEl.textContent = formatMoney(rawPrice);
        setAvailabilityState(itemEl, variantBtn.dataset.variantAvailable !== 'false');
      }
      return;
    }

    var removeBtn = event.target.closest('[data-wishlist-remove]');
    if (removeBtn) {
      event.preventDefault();
      removeItem(removeBtn.getAttribute('data-wishlist-remove'));
      syncUI();
    }
  });

  document.addEventListener('wishlist:updated', syncUI);
  document.addEventListener('DOMContentLoaded', syncUI);
  document.addEventListener('DOMContentLoaded', initWishlistPageSwipe);

  window.OneProductWishlist = {
    getItems: getItems,
    addItem: saveItem,
    removeItem: removeItem,
    syncUI: syncUI,
    isSaved: isSaved
  };
})();
