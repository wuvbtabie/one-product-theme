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

  function toggleItem(item) {
    var items = getItems();
    var index = items.findIndex(function (saved) { return saved.handle === item.handle; });

    if (index > -1) {
      items.splice(index, 1);
      setItems(items);
      return false;
    }

    items.unshift(item);
    setItems(items.slice(0, 50));
    return true;
  }

  function removeItem(handle) {
    var items = getItems().filter(function (item) { return item.handle !== handle; });
    setItems(items);
  }

  function formatMoney(cents) {
    var amount = Number(cents || 0) / 100;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } catch (e) {
      return '$' + amount.toFixed(2);
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
    document.querySelectorAll('[data-wishlist-count]').forEach(function (node) {
      node.textContent = count;
      node.classList.toggle('visible', count > 0);
    });
  }

  function renderDrawer() {
    var items = getItems();
    var container = document.querySelector('[data-wishlist-items]');
    var empty = document.querySelector('[data-wishlist-empty]');
    if (!container || !empty) return;

    if (items.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    container.innerHTML = items.map(function (item) {
      var title = escapeHtml(item.title);
      var url = escapeHtml(item.url);
      var handle = escapeHtml(item.handle);
      var imageHtml = item.image
        ? '<a class="wishlist-item__img-wrap" href="' + url + '" tabindex="-1" aria-hidden="true"><img class="wishlist-item__image" src="' + escapeHtml(item.image) + '" alt="' + title + '" loading="lazy"></a>'
        : '<div class="wishlist-item__img-wrap wishlist-item__img-wrap--empty" aria-hidden="true"></div>';
      var priceHtml = item.price ? '<p class="wishlist-item__price">' + formatMoney(item.price) + '</p>' : '';
      return [
        '<article class="wishlist-item" data-handle="' + handle + '" data-product-url="' + url + '">',
        imageHtml,
        '<div class="wishlist-item__body">',
        '<a class="wishlist-item__title" href="' + url + '">' + title + '</a>',
        priceHtml,
        '<div class="wishlist-item__variants" data-variants-for="' + handle + '">',
        '<span class="wishlist-item__variants-loading">Loading options…</span>',
        '</div>',
        '<button type="button" class="wishlist-item__atc" data-wishlist-add-to-cart data-product-url="' + url + '">Add to Cart</button>',
        '<button type="button" class="wishlist-item__remove-btn" data-wishlist-remove="' + handle + '">Remove</button>',
        '</div>',
        '</article>'
      ].join('');
    }).join('');

    // Async-load variant options for each item
    items.forEach(function (item) {
      loadVariantsForItem(item.handle, item.url);
    });
  }

  function loadVariantsForItem(handle, url) {
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
        if (!hasRealOptions || variants.length <= 1) {
          container.innerHTML = '';
          if (articleEl && variants[0]) articleEl.dataset.selectedVariantId = variants[0].id;
          return;
        }
        var firstAvailable = variants.find(function (v) { return v.available; }) || variants[0];
        if (articleEl && firstAvailable) articleEl.dataset.selectedVariantId = firstAvailable.id;
        container.innerHTML = variants.map(function (variant) {
          var isSelected = firstAvailable && variant.id === firstAvailable.id;
          return '<button type="button" class="wishlist-item__variant-btn' + (isSelected ? ' is-selected' : '') + '"' +
            ' data-variant-id="' + variant.id + '"' +
            ' data-variant-price="' + variant.price + '"' +
            (!variant.available ? ' aria-disabled="true"' : '') + '>' +
            escapeHtml(variant.title) + '</button>';
        }).join('');
      })
      .catch(function () {
        var container = document.querySelector('[data-variants-for="' + handle + '"]');
        if (container) container.innerHTML = '';
      });
  }

  function addToCartFromWishlist(productUrl, button, variantId) {
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
      });
    };
    var finish = function () {
      if (button) { button.textContent = 'Added!'; }
      setTimeout(function () { window.location.reload(); }, 600);
    };
    var fail = function () {
      if (button) { button.disabled = false; button.textContent = 'Add to Cart'; }
    };
    if (variantId) {
      doAdd(variantId).then(function (r) { return r.json(); }).then(finish).catch(fail);
      return;
    }
    fetch(productUrl.replace(/\?.*/, '') + '.js')
      .then(function (r) { return r.json(); })
      .then(function (product) {
        var variant = (product.variants || []).find(function (v) { return v.available; }) || (product.variants || [])[0];
        if (!variant) throw new Error('no variant');
        return doAdd(variant.id);
      })
      .then(function (r) { return r.json(); })
      .then(finish)
      .catch(fail);
  }

  function setWishlistOpenState(isOpen) {
    document.querySelectorAll('[data-wishlist-open]').forEach(function (button) {
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  function openDrawer() {
    var drawer = document.querySelector('[data-wishlist-drawer]');
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    setWishlistOpenState(true);
  }

  function closeDrawer() {
    var drawer = document.querySelector('[data-wishlist-drawer]');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    setWishlistOpenState(false);
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
    renderDrawer();
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
      addToCartFromWishlist(addBtn.getAttribute('data-product-url'), addBtn, selectedVariantId);
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
      }
      return;
    }

    var openBtn = event.target.closest('[data-wishlist-open]');
    if (openBtn) {
      event.preventDefault();
      openDrawer();
      return;
    }

    if (event.target.closest('[data-wishlist-close]') || event.target.closest('.wishlist-drawer__overlay')) {
      closeDrawer();
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
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeDrawer();
    }
  });
})();
