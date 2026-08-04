/**
 * Category page rendering: filters built from the live catalogue, and a
 * brand-by-brand layout instead of one undifferentiated grid.
 *
 * The old sidebar was skincare boilerplate hard-coded into every page —
 * the makeup page offered "潔面 / 化妝水" and a brand list of skincare
 * labels we no longer carry, and none of the checkboxes did anything.
 * Everything here is derived from the products actually on the page.
 */

/* Section-header artwork per brand. The first four were cut from
   mirrored imagery and are served from this repo; the rest point at a
   product cover already on Shopify's CDN, since brand imagery no longer
   lives here. Falls back to a typographic band for an unknown vendor. */
const CDN = 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/';
const BRAND_ART = {
  'Coralhaze': 'brands/coralhaze/banner.jpg',
  'Heart Percent': 'brands/heartpercent/banner.jpg',
  'Glint': 'brands/glint/banner.jpg',
  'BRAYE': 'brands/braye/banner.jpg',
  'lilybyred': CDN + 'lilybyred-smiley-lip-blending-stick-01_4ef65b0e-7370-4068-b388-1dd668098e08.jpg',
  'UNLEASHIA': CDN + 'unleashia-glitterpedia-eye-palette-01_5ca9d7a1-6299-40c0-991f-eef225a18858.jpg',
  '2aN': CDN + '2an-dual-cheek-01_9d2e303b-b80d-4817-af99-1d02203d2902.jpg',
  'Peripera': CDN + 'Ink_Airy_Velvet_T_1_652cc774-f990-4aee-9d78-6ed4a83b84bd.jpg',
  'CLIO': CDN + 'clio-crystal-glam-tint-01.jpg',
};

function brandArt(vendor) {
  return BRAND_ART[vendor] || null;
}

const PRICE_BUCKETS = [
  { id: 'u100', label: 'HK$100 以下', test: (v) => v < 100 },
  { id: '100-200', label: 'HK$100 – HK$200', test: (v) => v >= 100 && v < 200 },
  { id: '200-400', label: 'HK$200 – HK$400', test: (v) => v >= 200 && v < 400 },
  { id: 'o400', label: 'HK$400 以上', test: (v) => v >= 400 },
];

const SORTS = {
  featured: null,
  'price-asc': (a, b) => price(a) - price(b),
  'price-desc': (a, b) => price(b) - price(a),
  'name-asc': (a, b) => (a.title || '').localeCompare(b.title || '', 'zh-Hant'),
};

function price(p) {
  return parseFloat(p.priceRange?.minVariantPrice?.amount || 0);
}

/* The 分類 filter offers this section's subcategories, or — on the
   all-products page, where there is no one section — the top level. */
function catOptions(section) {
  if (!section) {
    return Object.entries(CATEGORY_TAXONOMY)
      .map(([id, sec]) => [id, { label: sec.label, keywords: categoryKeywords(id, null) }]);
  }
  return Object.entries(CATEGORY_TAXONOMY[section]?.subs || {});
}

function catKeywords(section, id) {
  return section
    ? CATEGORY_TAXONOMY[section]?.subs?.[id]?.keywords || []
    : categoryKeywords(id, null);
}

/* Which categories actually have stock behind them — an empty filter
   option is worse than no filter option. */
function availableSubs(section, products) {
  const index = new Map(products.map((p, i) => [p, i]));
  const all = catOptions(section)
    .map(([id, sub]) => ({
      id,
      label: sub.label,
      set: new Set(products.filter((p) => matchesKeywords(p, sub.keywords)).map((p) => index.get(p))),
    }))
    .filter((s) => s.set.size);

  // The taxonomy nests 唇膏/唇釉 under 唇妝, and every level matches. Keep
  // the widest option and drop any whose products another already covers,
  // so the sidebar reads as one flat, non-overlapping list.
  const kept = all.filter((s) => !all.some((o) =>
    o !== s && o.set.size > s.set.size && [...s.set].every((i) => o.set.has(i))));
  const seen = new Set();
  return kept.filter((s) => !seen.has(s.label) && seen.add(s.label))
    .map((s) => ({ id: s.id, label: s.label, count: s.set.size }));
}

function vendorsOf(products) {
  const counts = new Map();
  products.forEach((p) => {
    const v = p.vendor || '其他';
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([vendor, count]) => ({ vendor, count }));
}

function optionRow(group, value, label, count) {
  return `<label class="filter-option">
    <input type="checkbox" data-group="${group}" value="${value}">
    <span>${label}</span>${count != null ? `<span class="filter-option__count">${count}</span>` : ''}
  </label>`;
}

function buildFilterSidebar(section, products) {
  const sidebar = document.querySelector('.filter-sidebar');
  if (!sidebar) return;
  const subs = availableSubs(section, products);
  const vendors = vendorsOf(products);
  const buckets = PRICE_BUCKETS
    .map((b) => ({ ...b, count: products.filter((p) => b.test(price(p))).length }))
    .filter((b) => b.count);

  const groups = [];
  if (subs.length > 1) {
    groups.push(`<div class="filter-group">
      <div class="filter-group__title">分類</div>
      <div class="filter-group__options">
        ${subs.map((s) => optionRow('cat', s.id, s.label, s.count)).join('')}
      </div></div>`);
  }
  if (vendors.length > 1) {
    groups.push(`<div class="filter-group">
      <div class="filter-group__title">品牌</div>
      <div class="filter-group__options">
        ${vendors.map((v) => optionRow('vendor', v.vendor, v.vendor, v.count)).join('')}
      </div></div>`);
  }
  if (buckets.length > 1) {
    groups.push(`<div class="filter-group">
      <div class="filter-group__title">價格</div>
      <div class="filter-group__options">
        ${buckets.map((b) => optionRow('price', b.id, b.label, b.count)).join('')}
      </div></div>`);
  }

  sidebar.querySelectorAll('.filter-group, .filter-sidebar__actions').forEach((n) => n.remove());
  sidebar.insertAdjacentHTML('beforeend', groups.join('') + `
    <div class="filter-sidebar__actions">
      <button class="btn btn--ghost btn--full btn--sm" data-filter-clear>清除篩選</button>
    </div>`);
}

function activeFilters() {
  const sel = { cat: new Set(), vendor: new Set(), price: new Set() };
  document.querySelectorAll('.filter-sidebar input[type="checkbox"]:checked')
    .forEach((el) => sel[el.dataset.group]?.add(el.value));
  return sel;
}

function applyFilters(section, products, sel) {
  return products.filter((p) => {
    if (sel.vendor.size && !sel.vendor.has(p.vendor || '其他')) return false;
    if (sel.price.size) {
      const v = price(p);
      const hit = PRICE_BUCKETS.some((b) => sel.price.has(b.id) && b.test(v));
      if (!hit) return false;
    }
    if (sel.cat.size) {
      const hit = [...sel.cat].some((id) =>
        matchesKeywords(p, catKeywords(section, id)));
      if (!hit) return false;
    }
    return true;
  });
}

function productCard(p) {
  const image = p.images?.edges?.[0]?.node;
  const p0 = p.priceRange?.minVariantPrice;
  const cp = p.compareAtPriceRange?.minVariantPrice;
  const isOnSale = cp && parseFloat(cp.amount) > parseFloat(p0.amount);
  const variant = p.variants?.edges?.[0]?.node;
  const isSoldOut = variant && !variant.availableForSale;
  return `
    <a href="/products/${p.handle}" class="product-card">
      <div class="product-card__image-wrap">
        ${image ? `<img class="product-card__image" src="${image.url}" alt="${image.altText || p.title}" loading="lazy">` : ''}
        ${isSoldOut ? '<span class="product-card__badge product-card__badge--sold-out">售完</span>' : ''}
        ${isOnSale && !isSoldOut ? '<span class="product-card__badge">特價</span>' : ''}
        <button class="product-card__wishlist" aria-label="加入願望清單" onclick="event.preventDefault(); event.stopPropagation();">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <div class="product-card__quick-add">快速加入</div>
      </div>
      <span class="product-card__brand">${p.vendor || ''}</span>
      <span class="product-card__name">${p.title}</span>
      <span class="product-card__price">${formatPrice(p0.amount)}</span>
      ${isOnSale ? `<span class="product-card__compare-price">${formatPrice(cp.amount)}</span>` : ''}
    </a>`;
}

function brandSection(vendor, items) {
  const art = brandArt(vendor);
  return `
    <section class="brand-section">
      <header class="brand-section__head${art ? ' brand-section__head--art' : ''}">
        ${art ? `<img class="brand-section__art" src="${art}" alt="${vendor}" loading="lazy">` : ''}
        <div class="brand-section__label">
          <span class="brand-section__eyebrow">品牌</span>
          <h2 class="brand-section__name">${vendor}</h2>
          <span class="brand-section__count">${items.length} 件產品</span>
        </div>
      </header>
      <div class="product-grid">${items.map(productCard).join('')}</div>
    </section>`;
}

/** Group into brand sections, or fall back to one grid when filtered. */
function renderProducts(container, products, { grouped }) {
  if (!grouped) {
    container.innerHTML = `<div class="product-grid">${products.map(productCard).join('')}</div>`;
    return;
  }
  const byVendor = new Map();
  products.forEach((p) => {
    const v = p.vendor || '其他';
    if (!byVendor.has(v)) byVendor.set(v, []);
    byVendor.get(v).push(p);
  });
  const order = [...byVendor.entries()].sort((a, b) => b[1].length - a[1].length);
  container.innerHTML = order.map(([v, items]) => brandSection(v, items)).join('');
}

/**
 * Wire a category page. Renders brand sections by default and a flat
 * grid once the shopper filters or sorts, since grouping only helps
 * while you are browsing.
 */
function initCatalog({ section, products }) {
  const host = document.querySelector('[data-catalog]')
    || document.querySelector('.product-grid')?.parentElement;
  if (!host) return;
  host.setAttribute('data-catalog', '');

  buildFilterSidebar(section, products);

  const countEl = document.querySelector('.filter-bar__count');
  const sortEl = document.querySelector('.filter-bar__sort select');

  function draw() {
    const sel = activeFilters();
    const sortKey = sortEl?.value || 'featured';
    let list = applyFilters(section, products, sel);
    const cmp = SORTS[sortKey];
    if (cmp) list = [...list].sort(cmp);

    const filtered = sel.cat.size || sel.vendor.size || sel.price.size;
    const grouped = !filtered && !cmp && new Set(list.map((p) => p.vendor)).size > 1;

    if (countEl) countEl.textContent = `顯示 ${list.length} 件產品`;
    if (!list.length) {
      host.innerHTML = `<p class="catalog-empty">冇產品符合呢個篩選。<button class="link-btn" data-filter-clear>清除篩選</button></p>`;
      return;
    }
    renderProducts(host, list, { grouped });
    prefetchProducts(list.slice(0, 12).map((p) => p.handle));
  }

  document.addEventListener('change', (e) => {
    if (e.target.closest('.filter-sidebar') || e.target === sortEl) draw();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-filter-clear]')) return;
    document.querySelectorAll('.filter-sidebar input[type="checkbox"]')
      .forEach((el) => { el.checked = false; });
    draw();
  });

  draw();
}
