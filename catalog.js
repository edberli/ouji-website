/**
 * Category page rendering: filters built from the live catalogue, and a
 * brand-by-brand layout instead of one undifferentiated grid.
 *
 * The old sidebar was skincare boilerplate hard-coded into every page —
 * the makeup page offered "潔面 / 化妝水" and a brand list of skincare
 * labels we no longer carry, and none of the checkboxes did anything.
 * Everything here is derived from the products actually on the page.
 */

/* Section-header artwork per brand, one entry for every vendor we carry —
   an unmapped brand fell back to a plain gradient band, which next to a
   photographed one read as unfinished.

   Nine are the brand's own homepage key visual, already shot to be read
   as a wide band — mirrored onto our CDN because the Korean storefronts
   check the Referer and would serve a placeholder to our pages. The rest
   have no usable KV (their homepage banner is a bare wordmark), so they
   fall back to a campaign frame from the brand's product media: a
   packshot cropped to a 220px band is a close-up of nothing, a model
   shot still reads at that height. */
const CDN = 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/';
const BRAND_ART = {
  // official key visuals
  'Coralhaze': CDN + 'coralhaze-banner.jpg',
  'lilybyred': CDN + 'lilybyred-banner.jpg',
  'UNLEASHIA': CDN + 'unleashia-banner.jpg',
  'rom&nd': CDN + 'romand-banner.jpg',
  'hince': CDN + 'hince-banner.jpg',
  'fwee': CDN + 'fwee-banner.jpg',
  'MAYBELLINE': CDN + 'maybelline-banner.jpg',
  '花知曉 Flower Knows': CDN + 'flowerknows-banner.jpg',
  'BRAYE': CDN + 'braye-banner.jpg',
  'dasique': CDN + 'dasique-banner.jpg',
  // no usable KV on the brand site — campaign frame from its own media
  'Glint': CDN + 'glint-highlighter-03.jpg',
  'Heart Percent': CDN + '3281c1e2c212110d5a09790bddb0b998.jpg',
  'CLIO': CDN + 'clio-kill-lash-superproof-mascara-01.jpg',
  'Peripera': CDN + 'Peripera_VShadingBlendingStick_T_4.jpg',
  '2aN': CDN + '2an-better-me-eye-palette-01_ec48f74b-0cd8-467e-80b6-b3549cb6d567.jpg',
  'Laka': CDN + 'laka-fruity-glam-tint-02_995c6109-9d56-412b-92eb-e7db4c8858e1.jpg',
  'AMUSE': CDN + 'amuse-powder-lip-cheek-08.jpg',
  'WAKEMAKE': CDN + 'wakemake-seamless-wear-foundation-01_697499fe-3af6-4453-951a-8427076ee269.jpg',
  'TIRTIR': CDN + 'tirtir-waterism-glow-melting-balm-03_1fc51da6-4d84-41ba-b4cd-4e7b7e4b0732.jpg',
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

/* How much a product has won, as one number: a first place is worth more
   than a third, and a recent win more than an old one. */
function awardWeight(p) {
  if (typeof awardsFor !== 'function') return 0;
  return awardsFor(p.handle).reduce((n, a) => {
    const place = a.rank === 1 ? 6 : a.rank === 0 ? 3 : 7 - a.rank * 2;
    return n + place + Math.max(0, a.year - 2022);
  }, 0);
}

/* Unit profit, as a 0–100 rank rather than an amount. featured.json is a
   public file, so it carries the ordering and not the money — cost prices
   are not something to publish. Loaded once, best-effort: the sort still
   works on awards alone if it is unavailable. */
let PROFIT_RANK = {};
fetch('featured.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => { if (d?.profitRank) PROFIT_RANK = d.profitRank; })
  .catch(() => {});

/* "推薦" is the default, so it has to mean something. Margin leads —
   that is the shop's own interest and the merchant asked for it — with
   awards as the customer-facing counterweight so the top of the grid is
   not simply the dearest thing we stock. Bestsellers join this term for
   term once there are orders to count. */
function featuredScore(p) {
  return (PROFIT_RANK[p.handle] || 0) * 10 + awardWeight(p) * 6;
}

const SORTS = {
  featured: (a, b) => featuredScore(b) - featuredScore(a),
  'price-asc': (a, b) => price(a) - price(b),
  'price-desc': (a, b) => price(b) - price(a),
  award: (a, b) => awardWeight(b) - awardWeight(a) || price(b) - price(a),
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

  // Stock and awards go first: they cut the grid hardest and neither is
  // derivable from the other three groups.
  const inStock = products.filter((p) => p.variants?.edges?.[0]?.node?.availableForSale).length;
  const awarded = products.filter((p) => typeof awardsFor === 'function'
    && awardsFor(p.handle).length).length;
  const flags = [];
  if (inStock && inStock < products.length) {
    flags.push(optionRow('flag', 'instock', '有貨', inStock));
  }
  if (awarded) flags.push(optionRow('flag', 'award', '得獎產品', awarded));
  if (flags.length) {
    groups.unshift(`<div class="filter-group">
      <div class="filter-group__title">精選</div>
      <div class="filter-group__options">${flags.join('')}</div></div>`);
  }

  sidebar.querySelectorAll('.filter-group, .filter-sidebar__actions').forEach((n) => n.remove());
  sidebar.insertAdjacentHTML('beforeend', groups.join('') + `
    <div class="filter-sidebar__actions">
      <button class="btn btn--ghost btn--full btn--sm" data-filter-clear>清除篩選</button>
    </div>`);
}

function activeFilters() {
  const sel = { cat: new Set(), vendor: new Set(), price: new Set(), flag: new Set() };
  document.querySelectorAll('.filter-sidebar input[type="checkbox"]:checked')
    .forEach((el) => sel[el.dataset.group]?.add(el.value));
  return sel;
}

function applyFilters(section, products, sel) {
  return products.filter((p) => {
    if (sel.flag.has('instock') && !p.variants?.edges?.[0]?.node?.availableForSale) return false;
    if (sel.flag.has('award') && !(typeof awardsFor === 'function'
        && awardsFor(p.handle).length)) return false;
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

/* ----- The two bars above the grid -----
   Filtering used to live entirely behind one 篩選 button: you could not
   see what was applied without reopening the drawer, and the commonest
   move of all — jump to 唇妝 — took three taps. */

/** A row of subcategory pills, the one filter worth having always-on. */
function buildQuickTabs(section, products, sel) {
  const host = document.querySelector('[data-quick-tabs]');
  if (!host) return;
  const subs = availableSubs(section, products);
  if (subs.length < 2) { host.innerHTML = ''; return; }
  const active = sel.cat;
  host.innerHTML = `
    <button class="quick-tab${active.size ? '' : ' is-active'}" data-quick="">全部</button>`
    + subs.map((s) => `<button class="quick-tab${active.has(s.id) ? ' is-active' : ''}"
        data-quick="${s.id}">${s.label}<span class="quick-tab__count">${s.count}</span></button>`).join('');
}

/** What is applied right now, each removable on its own. */
function buildActiveChips(section, sel) {
  const host = document.querySelector('[data-active-filters]');
  if (!host) return;
  const label = (group, value) => {
    if (group === 'cat') return catOptions(section).find(([id]) => id === value)?.[1]?.label || value;
    if (group === 'price') return PRICE_BUCKETS.find((b) => b.id === value)?.label || value;
    if (group === 'flag') return value === 'instock' ? '有貨' : '得獎產品';
    return value;
  };
  const chips = ['flag', 'cat', 'vendor', 'price'].flatMap((g) =>
    [...sel[g]].map((v) => `<button class="filter-chip" data-unset-group="${g}" data-unset-value="${v}">
      ${label(g, v)}<span aria-hidden="true">×</span></button>`));
  host.innerHTML = chips.length
    ? chips.join('') + '<button class="filter-chip filter-chip--clear" data-filter-clear>清除全部</button>'
    : '';
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
        ${typeof awardRibbon === 'function' ? awardRibbon(p.handle) : ''}
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

function brandSection(vendor, items, index) {
  const art = brandArt(vendor);
  return `
    <section class="brand-section" id="brand-${index}">
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

/**
 * A rail down the side listing the brands on the page, marking the one
 * you are scrolling through. With eleven brands stacked the page runs to
 * several screens, and without it there is no way to tell where you are
 * or to skip ahead.
 */
function buildBrandRail(order) {
  document.querySelector('.brand-rail')?.remove();
  if (order.length < 2) return;

  const rail = document.createElement('nav');
  rail.className = 'brand-rail';
  rail.setAttribute('aria-label', '品牌導覽');
  rail.innerHTML = `<span class="brand-rail__crest" aria-hidden="true"></span>`
    + order.map(([vendor], i) => `
    <a class="brand-rail__item" href="#brand-${i}" data-rail="${i}" style="--fall:0">
      <span class="brand-rail__tick"></span>
      <span class="brand-rail__name">${vendor}</span>
    </a>`).join('');
  document.body.appendChild(rail);

  const items = [...rail.querySelectorAll('.brand-rail__item')];
  const sections = [...document.querySelectorAll('.brand-section')];

  // Each tick's length falls off with its distance from the current one,
  // so the rail reads as a swell in the water rather than a list with one
  // item bolded. CSS turns --d into width, opacity and offset.
  // `at` may be fractional: the scrollspy passes a whole index, the
  // pointer passes wherever it actually is between two ticks, which is
  // what makes the swell track a finger rather than snap to the nearest
  // brand.
  const mark = (at, current = Math.round(at)) => {
    items.forEach((el, n) => {
      el.classList.toggle('is-current', n === current);
      // Compute the falloff here rather than in CSS: nesting a var() inside
      // max()/calc() for --fall resolved once and left every tick sized off
      // its index instead of its distance from the crest.
      el.style.setProperty('--fall', String(Math.max(0, 1 - Math.abs(n - at) * 0.22)));
    });
    rail.style.setProperty('--crest', String(at));
  };
  mark(0);

  /* Where the pointer sits along the rail, as a fractional index. The rail
     is vertical on desktop and horizontal on mobile, so the axis is read
     off the ticks themselves rather than hard-coded. */
  function indexAt(clientX, clientY) {
    const boxes = items.map((el) => el.getBoundingClientRect());
    const first = boxes[0], last = boxes[boxes.length - 1];
    const vertical = Math.abs(last.top - first.top) >= Math.abs(last.left - first.left);
    const pos = vertical ? clientY : clientX;
    const centres = boxes.map((b) => (vertical ? b.top + b.height / 2
                                               : b.left + b.width / 2));
    if (pos <= centres[0]) return 0;
    if (pos >= centres[centres.length - 1]) return centres.length - 1;
    for (let n = 0; n < centres.length - 1; n++) {
      if (pos <= centres[n + 1]) {
        const span = centres[n + 1] - centres[n] || 1;
        return n + (pos - centres[n]) / span;
      }
    }
    return centres.length - 1;
  }

  let tracking = false;
  const follow = (e) => {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    tracking = true;
    // The pointer wins over the scroll position while it is on the rail,
    // so hovering ahead previews where you are about to jump.
    mark(indexAt(t.clientX, t.clientY));
    if (e.cancelable) e.preventDefault();   // don't scroll the page mid-drag
  };
  const release = () => { tracking = false; spy(); };

  rail.addEventListener('pointermove', follow);
  rail.addEventListener('pointerleave', release);
  rail.addEventListener('touchmove', follow, { passive: false });
  rail.addEventListener('touchend', release);
  rail.addEventListener('touchcancel', release);

  // A section taller than the viewport never reaches a high intersection
  // ratio, so ratio-based spying kept crowning whichever short section
  // happened to be fully on screen. Track the last heading to pass the
  // top of the viewport instead.
  function spy() {
    if (tracking) return;          // a finger on the rail outranks the page
    const line = window.innerHeight * 0.28;
    let current = 0;
    sections.forEach((sec, i) => {
      if (sec.getBoundingClientRect().top <= line) current = i;
    });
    mark(current);
  }
  // Run it inline rather than behind requestAnimationFrame: a handful of
  // getBoundingClientRect calls is cheap, and rAF gets throttled in
  // background tabs, which left the rail stuck on the first brand.
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy, { passive: true });
  spy();

  rail.addEventListener('click', (e) => {
    const a = e.target.closest('[data-rail]');
    if (!a) return;
    e.preventDefault();
    sections[+a.dataset.rail]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** Group into brand sections, or fall back to one grid when filtered. */
function renderProducts(container, products, { grouped }) {
  if (!grouped) {
    document.querySelector('.brand-rail')?.remove();
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
  container.innerHTML = order.map(([v, items], i) => brandSection(v, items, i)).join('');
  buildBrandRail(order);
}

/**
 * Wire a category page. Renders brand sections by default and a flat
 * grid once the shopper filters or sorts, since grouping only helps
 * while you are browsing.
 */
function initCatalog({ section, cat, products }) {
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

    // Arriving on a subcategory from the nav (底妝, 唇妝 …) is already a
    // narrowed request — the shopper wants every base product, not a
    // tour of the brands — so group only while browsing the whole section.
    const filtered = cat || sel.cat.size || sel.vendor.size || sel.price.size || sel.flag.size;
    // Brand sections only survive the default order — asking for "cheapest
    // first" and getting it inside each brand is not what was asked.
    const grouped = !filtered && sortKey === 'featured'
      && new Set(list.map((p) => p.vendor)).size > 1;

    buildQuickTabs(section, products, sel);
    buildActiveChips(section, sel);
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
  const boxes = (group, value) =>
    [...document.querySelectorAll('.filter-sidebar input[type="checkbox"]')]
      .filter((el) => (!group || el.dataset.group === group)
                   && (value == null || el.value === value));

  document.addEventListener('click', (e) => {
    const clear = e.target.closest('[data-filter-clear]');
    if (clear) {
      boxes().forEach((el) => { el.checked = false; });
      return draw();
    }
    // A quick tab is a 分類 filter that happens to live outside the drawer,
    // so it drives the same checkboxes rather than keeping its own state.
    const tab = e.target.closest('[data-quick]');
    if (tab) {
      const id = tab.dataset.quick;
      boxes('cat').forEach((el) => { el.checked = !!id && el.value === id; });
      return draw();
    }
    const chip = e.target.closest('[data-unset-group]');
    if (chip) {
      boxes(chip.dataset.unsetGroup, chip.dataset.unsetValue)
        .forEach((el) => { el.checked = false; });
      return draw();
    }
  });

  draw();
}
