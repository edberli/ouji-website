/**
 * The homepage's product sections, rendered from the live catalogue.
 *
 * They used to be hard-coded: a "Best Sellers" grid of COSRX, Beauty of
 * Joseon and Torriden on stock photos — brands we do not carry — beside a
 * "春日光澤系列" edit for the same three. That is not merchandising, it is
 * a template nobody replaced, and it advertised things a shopper cannot buy.
 *
 * Everything here comes from Shopify, ordered the same way the category
 * pages order 推薦: margin first, awards as the counterweight.
 */
async function initHome() {
  const all = await getProducts({ first: 250 });
  const products = (all?.edges || []).map((e) => e.node)
    .filter((p) => p.variants?.edges?.[0]?.node?.availableForSale);
  if (!products.length) return;

  const rank = await fetch('featured.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.profitRank || {})
    .catch(() => ({}));

  const awards = (h) => (typeof awardsFor === 'function' ? awardsFor(h) : []);
  const weight = (p) => awards(p.handle).reduce((n, a) =>
    n + (a.rank === 1 ? 6 : a.rank === 0 ? 3 : 7 - a.rank * 2) + Math.max(0, a.year - 2022), 0);
  const featured = (p) => (rank[p.handle] || 0) * 10 + weight(p) * 6;

  const card = (p) => {
    const img = p.images?.edges?.[0]?.node;
    const v = p.variants?.edges?.[0]?.node;
    const cp = p.compareAtPriceRange?.minVariantPrice;
    const p0 = p.priceRange?.minVariantPrice;
    const onSale = cp && parseFloat(cp.amount) > parseFloat(p0.amount);
    return `<a href="/products/${p.handle}" class="product-card">
      <div class="product-card__image-wrap">
        ${img ? `<img class="product-card__image" src="${img.url}" alt="${p.title}" loading="lazy">` : ''}
        ${onSale ? '<span class="product-card__badge">特價</span>' : ''}
        ${typeof awardRibbon === 'function' ? awardRibbon(p.handle) : ''}
      </div>
      <span class="product-card__brand">${p.vendor || ''}</span>
      <span class="product-card__name">${p.title}</span>
      <span class="product-card__price">${formatPrice(p0.amount)}</span>
    </a>`;
  };

  /* ----- 精選推薦 ----- */
  const pick = document.querySelector('[data-home-featured]');
  if (pick) {
    const list = [...products].sort((a, b) => featured(b) - featured(a)).slice(0, 8);
    pick.innerHTML = list.map(card).join('');
  }

  /* ----- 獲獎產品 ----- */
  const won = document.querySelector('[data-home-awards]');
  if (won && typeof AWARDS === 'object') {
    const rows = products
      .filter((p) => awards(p.handle).length)
      .sort((a, b) => weight(b) - weight(a))
      .slice(0, 6);
    const total = Object.values(AWARDS).reduce((n, l) => n + l.length, 0);
    document.querySelectorAll('[data-award-total]').forEach((e) => { e.textContent = total; });
    document.querySelectorAll('[data-award-products]').forEach((e) => {
      e.textContent = Object.keys(AWARDS).length;
    });
    won.innerHTML = rows.map((p) => {
      const img = p.images?.edges?.[0]?.node;
      const a = topAward(p.handle);
      return `<a class="won-card" href="/products/${p.handle}">
        <span class="won-card__media">
          ${img ? `<img src="${img.url}" alt="${p.title}" loading="lazy">` : ''}
          <span class="won-card__seal">${awards(p.handle).length}</span>
        </span>
        <span class="won-card__brand">${p.vendor || ''}</span>
        <span class="won-card__title">${p.title}</span>
        <span class="won-card__award">${awardLabel(a)}</span>
      </a>`;
    }).join('');
  }

  /* ----- 妝感配對 ----- */
  const looks = document.querySelector('[data-home-looks]');
  if (looks) {
    const data = await fetch('match-data.json').then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (data?.looks) {
      looks.innerHTML = Object.entries(data.looks).map(([id, l]) =>
        `<a class="look-pill" href="match.html#${id}">
          <span class="look-pill__name">${l.label}</span>
          <span class="look-pill__desc">${l.desc}</span>
        </a>`).join('');
    }
  }
}
