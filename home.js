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
  const all = await getAllProducts();
  if (typeof loadRatings === 'function') await loadRatings();
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
    /* 首頁啲卡本來一粒掣都冇 —— 心心同快速加入淨係喺分類頁有。
       同一張卡喺兩個地方做到唔同嘅嘢，客會當佢壞咗。
       數量報 0 就當冇貨（好多貨嘅存貨政策係「賣完照賣」，
       availableForSale 靠唔住），同 catalog.js 一把尺。 */
    const vs = (p.variants?.edges || []).map((e) => e.node);
    const inStock = (x) => x.availableForSale
      && (x.quantityAvailable == null || x.quantityAvailable > 0);
    const soldOut = vs.length > 0 && !vs.some(inStock);
    const one = vs.length === 1;
    return `<a href="/products/${p.handle}" class="product-card">
      <div class="product-card__image-wrap">
        ${img ? `<img class="product-card__image" src="${img.url}" alt="${p.title}" loading="lazy">` : ''}
        ${onSale && !soldOut ? '<span class="product-card__badge">特價</span>' : ''}
        ${soldOut ? '<span class="product-card__badge product-card__badge--sold-out">售完</span>' : ''}
        ${typeof awardRibbon === 'function' ? awardRibbon(p.handle) : ''}
        <button type="button" class="product-card__wishlist${
          typeof isInWishlist === 'function' && isInWishlist(p.id) ? ' is-active' : ''}"
          aria-label="加入願望清單" data-wish="${p.id}"
          data-wish-handle="${p.handle}"
          data-wish-title="${(p.title || '').replace(/"/g, '&quot;')}">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        ${soldOut
          ? `<button type="button" class="product-card__restock" data-restock="${p.handle}"
               data-restock-title="${(p.title || '').replace(/"/g, '&quot;')}">想要？通知我補貨</button>`
          : (one && v
            ? `<button type="button" class="product-card__quick-add" data-quick-add="${v.id}">快速加入</button>`
            : '<div class="product-card__quick-add product-card__quick-add--pick">入去揀規格</div>')}
      </div>
      <span class="product-card__brand">${p.vendor || ''}</span>
      <span class="product-card__name">${p.title}</span>
      ${typeof ratingChip === 'function' ? ratingChip(p.handle) : ''}
      <span class="product-card__price">${formatPrice(p0.amount)}</span>
    </a>`;
  };

  /* ----- the counts in the about block, from the catalogue itself ----- */
  // The count-up animation reads `data-count` when the block scrolls into
  // view, so setting it is usually enough. Usually — but not if the counter
  // has already run (reduced motion writes the numbers at load, and a short
  // window can have the block in view before this fetch returns). In that
  // case the markup's placeholder is what the shopper is left looking at, so
  // overwrite the text as well.
  const stat = (key, n) => {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (!el) return;
    const spent = el.textContent.trim() !== '0' || el.classList.contains('is-counting');
    el.dataset.count = n;
    if (spent) el.textContent = (el.dataset.prefix || '') + n.toLocaleString() + (el.dataset.suffix || '');
  };
  stat('products', products.length);
  stat('brands', new Set(products.map((p) => p.vendor)).size);
  if (typeof AWARDS === 'object') {
    stat('awards', Object.values(AWARDS).reduce((n, l) => n + l.length, 0));
  }

  /* ----- 逐個類別一條捲軸 -----
   *
   * One grid of "everything popular" made sense when the shop sold one
   * kind of thing. With makeup, skincare, lenses and K-pop in the same
   * catalogue it stopped meaning anything: a shopper looking for a lens
   * colour scrolled past eight serums to find out we sell lenses at all.
   *
   * Each category gets its own row instead — swipe along it, or take the
   * link at the end of the row into the full category. */
  /* 首頁主推區：四個 tab，唔係四個分類。
   *
   * 本來係彩妝／護膚／隱形眼鏡／K-pop 四行 —— 但呢啲客喺選單同分類頁
   * 已經揀得到，喺首頁再排一次係重複導覽。四個 tab 答嘅係「我應該買
   * 咩」，唔係「嗰樣嘢喺邊」。
   *
   * ⚠️ 四個都要講得出根據。老闆本來想將庫存多嘅貨標做「熱賣」嚟清貨 ——
   * 咁樣係將滯銷貨叫做暢銷貨，客信一次，第二次就唔信我哋。而且冇必要作：
   *   熱門口碑 = Olive Young 真實評價數（523 件有數，最多一萬個）
   *   新品上架 = Shopify 真實建立日期
   *   限時優惠 = 真係有原價劃線先入
   *   現貨即日發 = 真實庫存深度 ← 庫存多嘅擺呢度，賣點係「唔使等」
   * 清貨最快嘅唔係叫佢做熱賣，係畀個真理由客而家買。 */
  /* 分類卡（CATS）仲用緊佢 —— 之前剷走分類 rail 嗰陣連呢個都剷埋，
     結果成排分類卡靜靜哋消失咗。 */
  function hasTag(p, ...want) {
    const tags = (p.tags || []).map((t) => t.toLowerCase());
    return want.some((w) => tags.includes(w.toLowerCase()));
  }

  let RATINGS = null;
  const reviewCount = (p) => RATINGS?.[p.handle]?.count || 0;
  const onSale = (p) => {
    const cp = parseFloat(p.compareAtPriceRange?.minVariantPrice?.amount || 0);
    const p0 = parseFloat(p.priceRange?.minVariantPrice?.amount || 0);
    return cp > p0 ? (cp - p0) / cp : 0;
  };
  const stockDepth = (p) => (p.variants?.edges || [])
    .reduce((n, e) => n + (e.node.quantityAvailable ?? 0), 0);
  const inStock = (p) => (p.variants?.edges || []).some((e) =>
    e.node.availableForSale && (e.node.quantityAvailable == null || e.node.quantityAvailable > 0));

  const TABS = [
    { id: 'loved', label: '熱門口碑', note: '按 Olive Young 真實評價數排',
      pick: (list) => list.filter((p) => reviewCount(p) >= 50)
        .sort((a, b) => reviewCount(b) - reviewCount(a)) },
    { id: 'new', label: '新品上架', note: '最近上架',
      pick: (list) => [...list].sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))) },
    { id: 'deal', label: '限時優惠', note: '有原價劃線先入呢度',
      pick: (list) => list.filter((p) => onSale(p) > 0)
        .sort((a, b) => onSale(b) - onSale(a)) },
    { id: 'ready', label: '現貨即日發', note: '存貨最足，落單唔使等',
      pick: (list) => list.filter((p) => stockDepth(p) >= 6)
        .sort((a, b) => stockDepth(b) - stockDepth(a)) },
  ];

  const rails = document.querySelector('[data-home-rails]');
  if (rails) {
    const live = products.filter(inStock);

    /* 評價數要等 ratings.json 返嚟先計得到。之前喺載入之前就決定
       邊個 tab 出唔出，結果「熱門口碑」永遠計到零件貨、永遠唔出。
       所以成格喺資料到齊之後先砌。 */
    const build = () => {
      const shown = TABS.filter((t) => t.pick(live).length >= 3);
      if (!shown.length) return;

      const paint = (id) => {
        const t = shown.find((x) => x.id === id) || shown[0];
        rails.querySelectorAll('.home-tabs__btn').forEach((b) =>
          b.classList.toggle('is-on', b.dataset.tab === t.id));
        const note = rails.querySelector('[data-tab-note]');
        if (note) note.textContent = t.note;
        const track = rails.querySelector('[data-rail]');
        if (track) track.innerHTML = t.pick(live).slice(0, 14).map(card).join('');
      };

      rails.innerHTML = `
        <div class="container">
          <div class="home-tabs" role="tablist">
            ${shown.map((t) => `<button type="button" class="home-tabs__btn" role="tab"
               data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>
          <p class="home-tabs__note" data-tab-note></p>
        </div>
        <div class="home-rail__track" data-rail="tabs"></div>`;

      rails.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (b) paint(b.dataset.tab);
      });
      paint(shown[0].id);
    };

    fetch('data/ratings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { RATINGS = d?.products || null; build(); })
      .catch(() => build());
  }

  /* ----- 分類圓圈 -----
   *
   * This was four big tiles carrying Unsplash stock photos and invented
   * brand counts — "護膚 29 個品牌" next to a photograph of somebody
   * else's shelf. It took most of a screen to say less than a line of
   * text, and two of the four categories did not exist any more.
   *
   * A scrolling row of circles instead: each one a real product we
   * actually stock, and the real number behind it. */
  const CATS = [
    { label: '彩妝', href: 'makeup.html', has: (p) => hasTag(p, '彩妝', 'makeup') },
    { label: '護膚', href: 'category.html', has: (p) => hasTag(p, '護膚', 'skincare') },
    { label: '隱形眼鏡', href: 'lens.html', has: (p) => hasTag(p, '隱形眼鏡') },
    { label: 'K-pop', href: 'kpop.html', has: (p) => hasTag(p, 'K-pop', 'kpop') },
    { label: '精華', href: 'category.html?cat=serum', type: '精華' },
    { label: '面膜', href: 'category.html?cat=mask', type: '面膜' },
    { label: '防曬', href: 'category.html?cat=sunscreen', type: '防曬' },
    { label: '氣墊', href: 'makeup.html?cat=cushion', type: '氣墊粉底' },
    { label: '唇釉', href: 'makeup.html?cat=liptint', type: '唇釉' },
    { label: '眼影', href: 'makeup.html?cat=eyeshadow', type: '眼影' },
    { label: '身體護理', href: 'bodycare.html', has: (p) => hasTag(p, '身體護理') },
  ];

  const cats = document.querySelector('[data-home-cats]');
  if (cats) {
    // 護膚 and 精華 overlap, and both would otherwise wear the same
    // bottle — two circles side by side showing one product reads as a
    // rendering bug. Each takes the best picture not already spoken for.
    const taken = new Set();
    cats.innerHTML = CATS.map((c) => {
      const test = c.has || ((p) => p.productType === c.type);
      const list = products.filter(test).sort((a, b) => featured(b) - featured(a));
      if (list.length < 3) return '';
      const pick = list.find((p) => p.images?.edges?.[0]?.node
        && !taken.has(p.images.edges[0].node.url))
        || list.find((p) => p.images?.edges?.[0]?.node);
      const img = pick?.images?.edges?.[0]?.node;
      if (img) taken.add(img.url);
      /* 由細圓形改做卡。圓形得 78px，張相入面睇到嘅嘢太細，
         十一個細圓排埋一齊反而似一串頭像多過似入口。
         卡有相有名有件數，撳落去嗰下亦都有反應。 */
      return `<a class="cat-card" href="${c.href}">
        <span class="cat-card__shot">
          ${img ? `<img src="${img.url}" alt="" loading="lazy">` : ''}
        </span>
        <span class="cat-card__body">
          <span class="cat-card__name">${c.label}</span>
          <span class="cat-card__n">${list.length} 件</span>
        </span>
      </a>`;
    }).join('');
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
