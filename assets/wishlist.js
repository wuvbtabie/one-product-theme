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
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'USD' }).format(amount);
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
      var image = item.image ? '<img class="wishlist-item__image" src="' + escapeHtml(item.image) + '" alt="' + title + '">' : '<div class="wishlist-item__image" aria-hidden="true"></div>';
      var price = item.price ? '<p class="wishlist-item__price">' + formatMoney(item.price) + '</p>' : '';
      return [
        '<article class="wishlist-item">',
        image,
        '<div>',
        '<a class="wishlist-item__title" href="' + url + '">' + title + '</a>',
        price,
        '<div class="wishlist-item__actions">',
        '<a class="wishlist-item__view" href="' + url + '">View</a>',
        '<button type="button" class="wishlist-item__remove" data-wishlist-remove="' + handle + '">Remove</button>',
        '</div>',
        '</div>',
        '</article>'
      ].join('');
    }).join('');
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
