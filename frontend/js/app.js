/**
 * CraveNest - Main Application Script
 * Homepage feeds, live search dropdown, category filters, location modal, and favorites
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileDrawer();
  initLocationSelector();
  initLiveSearch();
  initNewsletter();
  initHero3DParallax();
  init3DTilt();

  // If on homepage
  if (document.getElementById('home-categories-grid')) {
    loadHomeCategories();
    loadPopularRestaurants();
    loadTopRatedRestaurants();
    loadPopularFoods();
    loadOffers();
  }
});

// Mobile Drawer Navigation
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const closeBtn = document.getElementById('close-drawer-btn');

  if (!toggleBtn || !drawer || !overlay) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
}

// Location Selector
function initLocationSelector() {
  const trigger = document.getElementById('location-trigger');
  const modal = document.getElementById('location-modal');
  const closeBtn = document.getElementById('close-location-modal');
  const display = document.getElementById('current-location-text');

  // Load saved location from localStorage or default
  const savedLocation = localStorage.getItem('cravenest_location') || 'Salt Lake, Sector V';
  if (display) display.textContent = savedLocation;

  if (!trigger || !modal) return;

  trigger.addEventListener('click', () => {
    modal.classList.add('show');
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });

  // Location option clicks
  const options = modal.querySelectorAll('.location-chip-option');
  options.forEach(chip => {
    chip.addEventListener('click', () => {
      const loc = chip.dataset.location;
      if (loc) {
        localStorage.setItem('cravenest_location', loc);
        if (display) display.textContent = loc;
        showToast(`Delivering to ${loc}`, 'success');
        modal.classList.remove('show');
      }
    });
  });
}

// Live Instant Search with Debounced Dropdown
function initLiveSearch() {
  const searchInput = document.getElementById('hero-search-input');
  const searchDropdown = document.getElementById('search-dropdown-results');

  if (!searchInput || !searchDropdown) return;

  const performSearch = debounce(async (query) => {
    if (!query || query.trim().length < 2) {
      searchDropdown.style.display = 'none';
      searchDropdown.innerHTML = '';
      return;
    }

    try {
      const [restRes, foodRes] = await Promise.all([
        API.get(`/restaurants?search=${encodeURIComponent(query)}`),
        API.get(`/foods?search=${encodeURIComponent(query)}`)
      ]);

      const restaurants = restRes.restaurants || [];
      const foods = foodRes.foods || [];

      if (restaurants.length === 0 && foods.length === 0) {
        searchDropdown.innerHTML = `
          <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
            <i class="fas fa-search" style="margin-bottom: 6px; display: block; font-size: 1.2rem;"></i>
            No matching restaurants or dishes found for "${query}"
          </div>
        `;
        searchDropdown.style.display = 'block';
        return;
      }

      let html = '';

      if (restaurants.length > 0) {
        html += `<div style="padding: 10px 14px 4px; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Restaurants (${restaurants.length})</div>`;
        restaurants.slice(0, 4).forEach(r => {
          html += `
            <a href="restaurant.html?id=${r._id}" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; text-decoration: none; border-bottom: 1px solid var(--border-light);">
              <img src="${r.image}" alt="${r.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;">
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary);">${r.name}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${r.cuisine.join(', ')} • ${r.address?.area || 'Kolkata'}</div>
              </div>
              <span class="rating-badge" style="padding: 2px 6px; font-size: 0.75rem;">★ ${r.rating}</span>
            </a>
          `;
        });
      }

      if (foods.length > 0) {
        html += `<div style="padding: 10px 14px 4px; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Dishes & Food Items (${foods.length})</div>`;
        foods.slice(0, 4).forEach(f => {
          const restName = typeof f.restaurant === 'object' ? f.restaurant.name : 'Restaurant';
          html += `
            <a href="restaurant.html?id=${f.restaurant._id || f.restaurant}&foodId=${f._id}" class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; text-decoration: none; border-bottom: 1px solid var(--border-light);">
              <img src="${f.image}" alt="${f.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;">
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                  <span class="diet-indicator ${f.isVeg ? 'veg' : 'nonveg'}" style="width: 14px; height: 14px;"></span>
                  <span>${f.name}</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${restName} • ${f.category}</div>
              </div>
              <div style="font-family: 'Outfit'; font-weight: 800; color: var(--primary); font-size: 0.95rem;">₹${f.price}</div>
            </a>
          `;
        });
      }

      searchDropdown.innerHTML = html;
      searchDropdown.style.display = 'block';
    } catch (err) {
      console.error(err);
    }
  }, 250);

  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#hero-search-card-wrap')) {
      searchDropdown.style.display = 'none';
    }
  });

  // Handle form submit / enter
  const form = document.getElementById('hero-search-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (val) {
        window.location.href = `restaurants.html?search=${encodeURIComponent(val)}`;
      }
    });
  }
}

// Categories Data & Renderer
const CATEGORIES = [
  { name: 'Biryani', icon: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=150&q=80' },
  { name: 'Pizza', icon: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&q=80' },
  { name: 'Burger', icon: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80' },
  { name: 'Chinese', icon: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=150&q=80' },
  { name: 'Indian', icon: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=150&q=80' },
  { name: 'Bengali', icon: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=150&q=80' },
  { name: 'Fast Food', icon: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=150&q=80' },
  { name: 'Desserts', icon: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=150&q=80' },
  { name: 'Beverages', icon: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=150&q=80' },
  { name: 'Healthy Food', icon: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=150&q=80' }
];

function loadHomeCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <a href="restaurants.html?category=${encodeURIComponent(cat.name)}" class="category-chip tilt-card-3d">
      <div class="card-glare"></div>
      <div class="category-icon-wrap depth-pop-front">
        <img src="${cat.icon}" alt="${cat.name}" loading="lazy">
      </div>
      <span class="category-name depth-pop-mid">${cat.name}</span>
    </a>
  `).join('');
  init3DTilt(container);
}

// Load Popular Restaurants (featured or top 6)
async function loadPopularRestaurants() {
  const container = document.getElementById('popular-restaurants-grid');
  if (!container) return;

  try {
    const res = await API.get('/restaurants?featured=true');
    const restaurants = res.restaurants || [];

    if (restaurants.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No restaurants found</p></div>`;
      return;
    }

    container.innerHTML = restaurants.slice(0, 6).map(r => renderRestaurantCard(r)).join('');
    initFavoriteButtons();
    init3DTilt(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Unable to load restaurants</p></div>`;
  }
}

// Load Top Rated Restaurants (minRating: 4.6)
async function loadTopRatedRestaurants() {
  const container = document.getElementById('top-rated-restaurants-grid');
  if (!container) return;

  try {
    const res = await API.get('/restaurants?minRating=4.7&sortBy=rating');
    const restaurants = res.restaurants || [];
    container.innerHTML = restaurants.slice(0, 6).map(r => renderRestaurantCard(r)).join('');
    initFavoriteButtons();
    init3DTilt(container);
  } catch (err) {
    console.error(err);
  }
}

// Load Popular Foods
async function loadPopularFoods() {
  const container = document.getElementById('popular-foods-grid');
  if (!container) return;

  try {
    const res = await API.get('/foods?sortBy=rating');
    const foods = res.foods || [];

    container.innerHTML = foods.slice(0, 8).map(f => renderFoodCard(f)).join('');
    initFoodCartControls();
    init3DTilt(container);
  } catch (err) {
    console.error(err);
  }
}

// Render Restaurant Card HTML with 3D Depth
function renderRestaurantCard(r) {
  const isVegOnly = r.isVeg ? `<span class="badge badge-success depth-pop-front" style="position: absolute; top: 12px; left: 12px; z-index: 4;">PURE VEG</span>` : '';
  const offer = r.offers && r.offers.length > 0 ? r.offers[0] : null;

  return `
    <div class="restaurant-card tilt-card-3d" data-id="${r._id}">
      <div class="card-glare"></div>
      <div class="card-sheen-sweep"></div>
      <div class="restaurant-image-wrap">
        ${isVegOnly}
        <button class="fav-btn depth-pop-front" data-id="${r._id}" data-type="restaurant" title="Save to favorites">
          <i class="far fa-heart"></i>
        </button>
        <img class="restaurant-img" src="${r.image}" alt="${r.name}" loading="lazy">
        ${offer ? `
          <div class="restaurant-offer-ribbon depth-pop-mid">
            <i class="fas fa-tag"></i> ${offer}
          </div>
        ` : ''}
      </div>
      <div class="restaurant-card-body depth-pop-mid">
        <div class="restaurant-title-row">
          <h3 class="restaurant-name">${r.name}</h3>
          <span class="rating-badge depth-pop-front">★ ${r.rating}</span>
        </div>
        <div class="restaurant-cuisines">${r.cuisine.join(', ')}</div>
        <div class="restaurant-meta-row">
          <div class="restaurant-meta-item">
            <i class="far fa-clock"></i> ${r.deliveryTime}
          </div>
          <div class="restaurant-meta-item">
            <i class="fas fa-motorcycle"></i> ${r.deliveryFee === 0 ? 'FREE' : '₹' + r.deliveryFee}
          </div>
          <div class="restaurant-meta-item">
            <i class="fas fa-map-marker-alt"></i> ${r.address?.area || 'Kolkata'}
          </div>
        </div>
        <div class="restaurant-footer-action">
          <a href="restaurant.html?id=${r._id}" class="view-menu-btn depth-pop-front">View Menu <i class="fas fa-arrow-right" style="font-size: 0.8rem; margin-left: 4px;"></i></a>
        </div>
      </div>
    </div>
  `;
}

// Render Food Card HTML with 3D Depth
function renderFoodCard(f) {
  const restName = typeof f.restaurant === 'object' ? f.restaurant.name : 'CraveNest Kitchen';
  const tag = f.tags && f.tags.length > 0 ? f.tags[0] : null;
  const currentQty = Cart.getItemQuantity(f._id);

  return `
    <div class="food-card tilt-card-3d" data-id="${f._id}">
      <div class="card-glare"></div>
      <div class="card-sheen-sweep"></div>
      <div class="food-image-wrap">
        ${tag ? `<span class="food-tag-badge depth-pop-front">${tag}</span>` : ''}
        <button class="fav-btn depth-pop-front" data-id="${f._id}" data-type="food" title="Save to favorites">
          <i class="far fa-heart"></i>
        </button>
        <img class="food-img" src="${f.image}" alt="${f.name}" loading="lazy">
      </div>
      <div class="food-card-body depth-pop-mid">
        <div class="food-header-row">
          <span class="diet-indicator ${f.isVeg ? 'veg' : 'nonveg'} depth-pop-front"></span>
          <span class="food-rating-pill depth-pop-front"><i class="fas fa-star" style="font-size: 0.7rem;"></i> ${f.rating}</span>
        </div>
        <h4 class="food-name">${f.name}</h4>
        <div class="food-restaurant-name"><i class="fas fa-store" style="font-size: 0.75rem; margin-right: 4px;"></i>${restName}</div>
        <p class="food-desc">${f.description}</p>
        <div class="food-footer-row">
          <div class="food-price-wrap depth-pop-front">
            <span class="food-price">₹${f.price}</span>
            ${f.originalPrice > f.price ? `<span class="food-original-price">₹${f.originalPrice}</span>` : ''}
          </div>
          <div class="food-action-control depth-pop-front" data-food-id="${f._id}">
            ${currentQty > 0 ? `
              <div class="qty-control-wrap">
                <button class="qty-btn minus-btn" data-id="${f._id}">−</button>
                <span class="qty-display">${currentQty}</span>
                <button class="qty-btn plus-btn" data-id="${f._id}">+</button>
              </div>
            ` : `
              <button class="add-cart-btn" data-id="${f._id}">Add +</button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Food Card Cart Interactions
function initFoodCartControls() {
  document.addEventListener('click', async (e) => {
    // Add button click
    if (e.target.matches('.add-cart-btn')) {
      const foodId = e.target.dataset.id;
      const foodCard = e.target.closest('.food-card');
      const name = foodCard.querySelector('.food-name').textContent;
      const priceText = foodCard.querySelector('.food-price').textContent.replace('₹', '');
      const image = foodCard.querySelector('.food-img').src;
      const isVeg = foodCard.querySelector('.diet-indicator').classList.contains('veg');

      // Add to cart
      Cart.addItem({
        _id: foodId,
        id: foodId,
        name,
        price: Number(priceText),
        image,
        isVeg
      });

      // Update control in place
      const controlWrap = foodCard.querySelector('.food-action-control');
      controlWrap.innerHTML = `
        <div class="qty-control-wrap">
          <button class="qty-btn minus-btn" data-id="${foodId}">−</button>
          <span class="qty-display">1</span>
          <button class="qty-btn plus-btn" data-id="${foodId}">+</button>
        </div>
      `;
    }

    // Plus button click
    if (e.target.matches('.plus-btn')) {
      const foodId = e.target.dataset.id;
      Cart.updateQuantity(foodId, 1);
      const display = e.target.closest('.qty-control-wrap').querySelector('.qty-display');
      display.textContent = Cart.getItemQuantity(foodId);
    }

    // Minus button click
    if (e.target.matches('.minus-btn')) {
      const foodId = e.target.dataset.id;
      Cart.updateQuantity(foodId, -1);
      const qty = Cart.getItemQuantity(foodId);
      const controlWrap = e.target.closest('.food-action-control');

      if (qty <= 0) {
        controlWrap.innerHTML = `<button class="add-cart-btn" data-id="${foodId}">Add +</button>`;
      } else {
        const display = controlWrap.querySelector('.qty-display');
        display.textContent = qty;
      }
    }
  });
}

// Offers Carousel / Grid
async function loadOffers() {
  const container = document.getElementById('home-offers-grid');
  if (!container) return;

  try {
    const res = await API.get('/coupons');
    const coupons = res.coupons || [];

    container.innerHTML = coupons.slice(0, 4).map(c => `
      <div class="offer-card tilt-card-3d">
        <div class="card-glare"></div>
        <div class="card-sheen-sweep"></div>
        <div class="offer-icon depth-pop-front"><i class="fas fa-ticket-alt"></i></div>
        <div class="offer-content depth-pop-mid">
          <div class="offer-code">${c.code}</div>
          <p class="offer-desc">${c.description || (c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `Flat ₹${c.discountValue} OFF`)}</p>
          <button class="copy-coupon-btn depth-pop-front" data-code="${c.code}">
            <i class="far fa-copy"></i> Copy Code
          </button>
        </div>
      </div>
    `).join('');

    // Copy to clipboard handler
    container.querySelectorAll('.copy-coupon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        navigator.clipboard.writeText(code);
        showToast(`Coupon "${code}" copied to clipboard!`, 'success');
      });
    });

    init3DTilt(container);
  } catch (err) {
    console.error(err);
  }
}

// Favorite Button Handler
function initFavoriteButtons() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!AuthHelper.isLoggedIn()) {
        showToast('Please sign in to save items to your favorites', 'info');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
      }

      const id = btn.dataset.id;
      const type = btn.dataset.type; // 'restaurant' or 'food'

      try {
        const res = await API.post('/users/favorites', { type, id });
        if (res.isFavorited) {
          btn.classList.add('active');
          btn.innerHTML = '<i class="fas fa-heart"></i>';
          showToast(res.message, 'success');
        } else {
          btn.classList.remove('active');
          btn.innerHTML = '<i class="far fa-heart"></i>';
          showToast(res.message, 'info');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// Newsletter subscription form
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    if (input && input.value) {
      showToast('Thank you for subscribing to CraveNest food perks!', 'success');
      input.value = '';
    }
  });
}

// ==========================================================================
// 3D INTERACTIVE TILT & HOLOGRAPHIC PARALLAX ENGINE
// ==========================================================================
function init3DTilt(root = document) {
  const selector = '.tilt-card-3d, .step-card, .offer-card, .category-chip, .review-card';
  let cards = [];
  if (root.matches && root.matches(selector)) {
    cards = [root];
  } else {
    cards = Array.from(root.querySelectorAll(selector));
  }

  cards.forEach(card => {
    if (card._tiltAttached) return;
    card._tiltAttached = true;

    // Ensure specular glare element exists
    if (!card.querySelector('.card-glare')) {
      const glare = document.createElement('div');
      glare.className = 'card-glare';
      card.appendChild(glare);
    }

    let isHovered = false;
    let bounds = null;

    const onPointerEnter = () => {
      isHovered = true;
      bounds = card.getBoundingClientRect();
      card.style.transition = 'transform 0.12s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s ease';
    };

    const onPointerMove = (e) => {
      if (!isHovered) return;
      if (!bounds) bounds = card.getBoundingClientRect();

      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      const width = bounds.width;
      const height = bounds.height;

      if (width === 0 || height === 0) return;

      const normX = (x / width) - 0.5;
      const normY = (y / height) - 0.5;

      const maxTilt = card.classList.contains('category-chip') ? 14 : 11;
      const rotateY = (normX * maxTilt * 2).toFixed(2);
      const rotateX = (-normY * maxTilt * 2).toFixed(2);

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(14px) scale3d(1.02, 1.02, 1.02)`;

      const glareX = ((x / width) * 100).toFixed(1);
      const glareY = ((y / height) * 100).toFixed(1);
      card.style.setProperty('--glare-x', `${glareX}%`);
      card.style.setProperty('--glare-y', `${glareY}%`);
      card.style.setProperty('--glare-opacity', '0.55');
    };

    const onPointerLeave = () => {
      isHovered = false;
      bounds = null;
      card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.4s ease';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
      card.style.setProperty('--glare-opacity', '0');
    };

    card.addEventListener('pointerenter', onPointerEnter);
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerleave', onPointerLeave);
  });
}

function initHero3DParallax() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  let targetTiltX = 6;
  let targetTiltY = -8;
  let targetOffsetX = 0;
  let targetOffsetY = 0;
  let currentTiltX = 6;
  let currentTiltY = -8;
  let currentOffsetX = 0;
  let currentOffsetY = 0;

  const updateParallax = () => {
    currentTiltX += (targetTiltX - currentTiltX) * 0.1;
    currentTiltY += (targetTiltY - currentTiltY) * 0.1;
    currentOffsetX += (targetOffsetX - currentOffsetX) * 0.1;
    currentOffsetY += (targetOffsetY - currentOffsetY) * 0.1;

    hero.style.setProperty('--hero-tilt-x', `${currentTiltX.toFixed(2)}deg`);
    hero.style.setProperty('--hero-tilt-y', `${currentTiltY.toFixed(2)}deg`);
    hero.style.setProperty('--stat-offset-x', `${currentOffsetX.toFixed(2)}px`);
    hero.style.setProperty('--stat-offset-y', `${currentOffsetY.toFixed(2)}px`);

    requestAnimationFrame(updateParallax);
  };

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width) - 0.5;
    const normY = ((e.clientY - rect.top) / rect.height) - 0.5;

    targetTiltY = normX * 18;
    targetTiltX = -normY * 16;
    targetOffsetX = normX * 24;
    targetOffsetY = normY * 20;
  });

  hero.addEventListener('mouseleave', () => {
    targetTiltX = 6;
    targetTiltY = -8;
    targetOffsetX = 0;
    targetOffsetY = 0;
  });

  requestAnimationFrame(updateParallax);
}

// Global export for multi-page integration
window.init3DTilt = init3DTilt;
