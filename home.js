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
    /* totalInventory 行先 —— 呢度淨係攞到頭兩個規格，隱形眼鏡一件貨
       有 25 個度數，頭兩個度數斷咗貨就會成件標「售完」。 */
    const soldOut = typeof p.totalInventory === 'number'
      ? p.totalInventory <= 0
      : (vs.length > 0 && !vs.some(inStock));
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
  const stockDepth = (p) => (typeof p.totalInventory === 'number'
    ? p.totalInventory
    : (p.variants?.edges || []).reduce((n, e) => n + (e.node.quantityAvailable ?? 0), 0));
  /* totalInventory 行先。列表 query 得頭兩個規格，隱形眼鏡一件貨有
     25 個度數，頭兩個斷咗就會成件當冇貨。 */
  const inStock = (p) => (typeof p.totalInventory === 'number'
    ? p.totalInventory > 0
    : (p.variants?.edges || []).some((e) =>
        e.node.availableForSale && (e.node.quantityAvailable == null || e.node.quantityAvailable > 0)));

  const TABS = [
    { id: 'hot', label: '熱賣', note: '韓國 Olive Young 最多人評價嗰批',
      pick: (list) => list.filter((p) => reviewCount(p) >= 50)
        .sort((a, b) => reviewCount(b) - reviewCount(a)) },
    { id: 'new', label: '新品上架', note: '最近上架',
      pick: (list) => [...list].sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))) },
    { id: 'deal', label: '限時優惠', note: '有原價劃線先入呢度',
      pick: (list) => list.filter((p) => onSale(p) > 0)
        .sort((a, b) => onSale(b) - onSale(a)) },
  ];

  const tabHost = document.querySelector('[data-home-tabs]');
  if (tabHost) {
    const live = products.filter(inStock);

    /* 評價數要等 ratings.json 返嚟先計得到。之前喺載入之前就決定
       邊個 tab 出唔出，結果「熱門口碑」永遠計到零件貨、永遠唔出。
       所以成格喺資料到齊之後先砌。 */
    const build = () => {
      const shown = TABS.filter((t) => t.pick(live).length >= 3);
      if (!shown.length) return;

      /* 頭位嗰件貨出一幅大相，唔再同其他貨排埋一行細卡。
         一行十四件細卡，客要橫掃先睇到，而且每件都一樣大 —— 冇邊件係
         「而家買咩好」嘅答案。呢度改成左邊一件、右邊六件。
         左邊嗰句「事實」跟返個 tab 本身嘅準則，唔係形容詞：熱賣講評價數，
         優惠講減幾多，新品就淨係講新上架。冇數就唔寫。 */
      const heroFact = (p, t) => {
        const r = RATINGS?.[p.handle];
        const cp = p.compareAtPriceRange?.minVariantPrice;
        const p0 = p.priceRange?.minVariantPrice;
        if (t.id === 'hot') {
          return r?.count
            ? `Olive Young ${r.count.toLocaleString()} 則評價${r.star ? ` · ${r.star}★` : ''}`
            : '';
        }
        if (t.id === 'deal') {
          const off = cp && parseFloat(cp.amount) > parseFloat(p0.amount)
            ? Math.round((1 - parseFloat(p0.amount) / parseFloat(cp.amount)) * 100) : 0;
          return off ? `原價 ${formatPrice(cp.amount)} · 減 ${off}%` : '';
        }
        return '新上架';
      };

      const hero = (p, t) => {
        const img = p.images?.edges?.[0]?.node;
        const p0 = p.priceRange?.minVariantPrice;
        const fact = heroFact(p, t);
        return `<a class="home-feat__hero" href="/products/${p.handle}">
          <span class="home-feat__shot">
            ${img ? `<img src="${img.url}" alt="${(p.title || '').replace(/"/g, '&quot;')}"
                 crossorigin="anonymous" data-feat-img>` : ''}
            ${typeof awardRibbon === 'function' ? awardRibbon(p.handle) : ''}
          </span>
          <span class="home-feat__meta">
            <span class="home-feat__brand">${p.vendor || ''}</span>
            <span class="home-feat__name">${p.title}</span>
            ${fact ? `<span class="home-feat__fact">${fact}</span>` : ''}
            <span class="home-feat__price">${formatPrice(p0.amount)}</span>
          </span>
        </a>`;
      };

      /* 白底 packshot 撐滿一幅大相會切走支樽；有真人／情境嗰啲就要滿幅。
         試過用長闊比分辨，行唔通 —— 呢個目錄連模特相都係正方形。
         改為讀張相四條邊：白邊夠多就當 packshot，改成留白擺中間。
         Shopify CDN 有開 CORS，所以 canvas 讀得到像素（實測過）；
         萬一讀唔到就當係情境相，滿幅出 —— 錯嗰邊冇咁核突。 */
      const isPackshot = (im) => {
        try {
          const c = document.createElement('canvas');
          c.width = 32; c.height = 32;
          const x = c.getContext('2d');
          x.drawImage(im, 0, 0, 32, 32);
          const d = x.getImageData(0, 0, 32, 32).data;
          let white = 0, n = 0;
          for (let i = 0; i < 32; i += 1) {
            for (const [px, py] of [[i, 0], [i, 31], [0, i], [31, i]]) {
              const k = (py * 32 + px) * 4;
              n += 1;
              if (d[k] > 238 && d[k + 1] > 238 && d[k + 2] > 238) white += 1;
            }
          }
          return white / n >= 0.3;
        } catch { return false; }
      };

      const fitShot = (box) => {
        const im = box?.querySelector('[data-feat-img]');
        const shot = box?.querySelector('.home-feat__shot');
        if (!im || !shot) return;
        const apply = () => {
          if (!im.naturalWidth) return;
          shot.classList.toggle('is-pack', isPackshot(im));
        };
        im.complete ? apply() : im.addEventListener('load', apply, { once: true });
      };

      const paint = (id) => {
        const t = shown.find((x) => x.id === id) || shown[0];
        tabHost.querySelectorAll('.home-tabs__btn').forEach((b) =>
          b.classList.toggle('is-on', b.dataset.tab === t.id));
        const note = tabHost.querySelector('[data-tab-note]');
        if (note) note.textContent = t.note;
        const list = t.pick(live);
        const heroBox = tabHost.querySelector('[data-feat-hero]');
        const grid = tabHost.querySelector('[data-feat-grid]');
        if (heroBox) {
          heroBox.innerHTML = list[0] ? hero(list[0], t) : '';
          fitShot(heroBox);
        }
        if (grid) grid.innerHTML = list.slice(1, 7).map(card).join('');
      };

      tabHost.innerHTML = `
        <div class="container">
          <div class="home-tabs" role="tablist">
            ${shown.map((t) => `<button type="button" class="home-tabs__btn" role="tab"
               data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>
          <p class="home-tabs__note" data-tab-note></p>
          <div class="home-feat">
            <div class="home-feat__lead" data-feat-hero></div>
            <div class="home-feat__grid" data-feat-grid></div>
          </div>
        </div>`;

      tabHost.addEventListener('click', (e) => {
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

  /* 分類行 —— 老闆講明呢啲要留返，tab 係加上去，唔係換走佢哋。 */
  const RAILS = [
    { id: 'makeup', label: '彩妝', href: 'makeup.html',
      has: (p) => hasTag(p, '彩妝', 'makeup') },
    { id: 'skincare', label: '護膚', href: 'category.html',
      has: (p) => hasTag(p, '護膚', 'skincare') },
    { id: 'lens', label: '隱形眼鏡', href: 'lens.html',
      has: (p) => hasTag(p, '隱形眼鏡') },
    { id: 'kpop', label: 'K-pop 周邊', href: 'kpop.html',
      has: (p) => hasTag(p, 'K-pop', 'kpop') },
  ];

  /* ----- 分類海報 -----
   *
   * 本來每個分類係一行橫掃嘅產品卡（12 件）。老闆 2026-08-28：
   * 「一個個產品擺喺度，其實對佢哋嚟講吸引力唔係咁大⋯⋯我寧願喺首頁
   * 整一啲靚啲嘅設計。」佢畀咗個參考：左邊一幅大嘅模特兒相，右邊四件
   * 產品，撳大相就入分類頁。
   *
   * 所以改成海報式：一幅真實嘅情境相 ＋ 分類名 ＋ 真件數 ＋ 入口，
   * 右邊 2×2 四件精選。四格之後就唔再排貨 —— 客要睇晒就撳入去，
   * 首頁唔再做「第二個目錄」。
   *
   * ⚠️ 啲相唔係 stock photo，係目錄入面真有嘅情境相：用腳本掃過
   * 全目錄（白底比例、膚色比例、色彩豐富度）揀出嚟，再人手睇過。
   * 換相就換 POSTERS 入面條 URL，唔好即場計 —— 每次載入揀唔同張相，
   * 首頁會變成每次都唔同樣。
   * ⚠️ 大相左右輪流擺（偶數幅喺左、單數幅喺右），四格連住落唔會
   * 睇落似同一個 template 重複四次。 */
  const POSTERS = [
    { id: 'makeup', label: '彩妝', href: 'makeup.html',
      has: (p) => hasTag(p, '彩妝', 'makeup'),
      line: '底妝、眼妝、唇妝，廿幾個牌子',
      img: 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/romand-better-than-palette-01_bac0075f-a0d1-4679-8d95-8a9a7a7c33f9.jpg' },
    { id: 'skincare', label: '護膚', href: 'category.html',
      has: (p) => hasTag(p, '護膚', 'skincare'),
      line: '潔面、精華、面霜、防曬，一條過',
      img: 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/c3ac64d063dcea05b5c5933024923263_a6098918-4fe7-4eda-88bf-879728200f83.jpg' },
    { id: 'lens', label: '隱形眼鏡', href: 'lens.html',
      has: (p) => hasTag(p, '隱形眼鏡'),
      line: '日拋為主，全度數，現貨',
      /* ⚠️ 之前用咗一張隻眼特寫，放大到成幅海報咁大好核突（老闆：「你梗係
         攞個模特兒嚟做封面啦」）。隱形眼鏡嘅產品相多數係眼部特寫，
         要特登揀返有模特兒嗰幾張。 */
      /* ⚠️ 隱形眼鏡呢格改過三次：
         ① 原本用咗一張隻眼特寫 —— 放大到成幅海報咁大好核突
           （老闆：「你梗係攞個模特兒嚟做封面啦」）。
         ② 換咗模特兒相，但品牌喺右下角焗死咗一個眼部特寫細圖，
           啱啱好撞正標題位。
         ③ 而家：將嗰張相裁走下面 32%（連個細圖一齊裁走），
           上載成獨立一張封面。 */
      img: 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lens-poster.jpg',
      pos: '50% 28%' },
    { id: 'kpop', label: 'K-pop 周邊', href: 'kpop.html',
      has: (p) => hasTag(p, 'K-pop', 'kpop'),
      line: '專輯、寫真書，出貨即入',
      img: 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/seventeen-spill-the-feels-12th-mini-album-984146.webp' },
  ];

  const posterHost = document.querySelector('[data-home-rails]');
  if (posterHost) {
    posterHost.innerHTML = POSTERS.map((r, i) => {
      const list = products.filter(r.has).sort((a, b) => featured(b) - featured(a));
      if (list.length < 4) return '';
      return `<section class="poster${i % 2 ? ' poster--flip' : ''}">
        <a class="poster__visual rise" href="${r.href}">
          <img src="${r.img}${r.img.includes('?') ? '&' : '?'}width=900" alt="" width="900" height="1125"
               loading="lazy" decoding="async"${r.pos ? ` style="object-position:${r.pos}"` : ''}>
          <div class="poster__caption">
            <h3 class="poster__title">${r.label}</h3>
            <p class="poster__line">${r.line}</p>
            <span class="poster__cta">睇晒 ${list.length} 件
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span>
          </div>
        </a>
        <div class="poster__grid">${list.slice(0, 4).map(card).join('')}</div>
      </section>`;
    }).join('');
    /* 海報係而家先砌出嚟，第一次 initRiseReveal() 跑嗰陣佢哋未存在 ——
       唔叫多次就永遠停喺 opacity: 0。 */
    if (typeof initRiseReveal === 'function') initRiseReveal();
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
  /* 頭七格＝而家嘅頂層分類（同 header 導覽、shop 貼紙一致），
     之後先跟熱門細分類。客喺首頁見到嘅第一排，應該同佢喺導覽度
     見到嗰套一樣，唔好一個講「精華／氣墊」另一個講「保健品／季節性」。 */
  const CATS = [
    { label: '護膚', href: 'category.html', has: (p) => hasTag(p, '護膚', 'skincare') },
    { label: '彩妝', href: 'makeup.html', has: (p) => hasTag(p, '彩妝', 'makeup') },
    { label: '沐浴洗護', href: 'bath.html', has: (p) => hasTag(p, '沐浴') || hasTag(p, '洗髮') || hasTag(p, '潔面') },
    { label: '季節性', href: 'seasonal.html', has: (p) => hasTag(p, '防曬') || hasTag(p, '護手霜') },
    { label: '美妝工具', href: 'tools.html', has: (p) => hasTag(p, '化妝工具') || hasTag(p, '美容工具') || hasTag(p, '美髮工具') },
    { label: '保健品', href: 'health.html', has: (p) => hasTag(p, '保健品') },
    { label: '隱形眼鏡', href: 'lens.html', has: (p) => hasTag(p, '隱形眼鏡') },
    { label: 'K-pop', href: 'kpop.html', has: (p) => hasTag(p, 'K-pop', 'kpop') },
    { label: '精華', href: 'category.html?cat=serum', type: '精華' },
    { label: '面膜', href: 'category.html?cat=mask', type: '面膜' },
    { label: '氣墊', href: 'makeup.html?cat=cushion', type: '氣墊粉底' },
    { label: '唇釉', href: 'makeup.html?cat=liptint', type: '唇釉' },
  ];

  /* 分類卡張相本來由目錄自動揀第一件貨嘅第一張圖。護膚永遠揀到一支白底
     樽仔，同隔籬「彩妝」「隱形眼鏡」嘅模特相擺埋一齊就好突兀。
     呢張係人手開圖確認過嘅品牌官方模特相（同 booth-shots.js 一套來源，
     揀嘅準則亦一樣：真人、乾淨、冇數據聲稱、冇特登舉住支貨）。 */
  const CAT_SHOT = {
    // Torriden Dive-In 低分子透明質酸爽膚水 300ml
    '護膚': 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/03_0c1305f6-66ed-4bf6-9a46-0eb58df2fd18.jpg?v=1786074858',
  };

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
      const shot = CAT_SHOT[c.label] || img?.url;
      /* 用咗指定相嗰格唔佔走自動揀嘅嗰張，等下面「精華」仲用得返 */
      if (img && !CAT_SHOT[c.label]) taken.add(img.url);
      /* 由細圓形改做卡。圓形得 78px，張相入面睇到嘅嘢太細，
         十一個細圓排埋一齊反而似一串頭像多過似入口。

         唔再喺卡上面寫件數。「542 件」幫唔到人揀嘢 —— 冇人因為護膚有
         542 件而揀護膚，佢係嚟搵護膚咋。個數字只係後台知識，擺喺入口
         度反而要人多讀一行。件數喺分類頁本身仲喺度，嗰度先真係有用。 */
      return `<a class="cat-card" href="${c.href}">
        <span class="cat-card__shot">
          ${shot ? `<img src="${shot}" alt="" loading="lazy">` : ''}
        </span>
        <span class="cat-card__body">
          <span class="cat-card__name">${c.label}</span>
        </span>
      </a>`;
    }).join('');
  }

  /* ----- 獲獎產品 ----- */
  const won = document.querySelector('[data-home-awards]');
  if (won && typeof AWARDS === 'object') {
    /* 由 6 件加到 12 件 —— 呢排而家係向右碌嘅，唔再係一行剛剛好塞滿
       六格，多出嚟嗰啲就係碌落去嘅理由。全店有 38 件得過獎。 */
    const rows = products
      .filter((p) => awards(p.handle).length)
      .sort((a, b) => weight(b) - weight(a))
      .slice(0, 12);
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
          ${typeof awardRibbon === 'function' ? awardRibbon(p.handle) : ''}
        </span>
        <span class="won-card__brand">${p.vendor || ''}</span>
        <span class="won-card__title">${p.title}</span>
        <span class="won-card__award">${awardLabel(a)}${
          awards(p.handle).length > 1 ? ` · 共 ${awards(p.handle).length} 項獎` : ''}</span>
      </a>`;
    }).join('');

    /* 碌到最右就收起個淡出，唔係最後嗰張卡會一路半透明。 */
    const endWatch = () => {
      won.classList.toggle('is-scroll-end',
        won.scrollLeft + won.clientWidth >= won.scrollWidth - 4);
    };
    won.addEventListener('scroll', endWatch, { passive: true });
    endWatch();
  }

  /* ----- 新品速遞 -----
     一次過多咗 11 個牌子、114 件貨。呢個唔係「新品上架」嗰個 tab 嘅
     重複：tab 係逐件排時間，呢格係話畀客知「多咗邊幾個牌子」，
     順便畀佢一撳就入到嗰個牌子。件數係實數，數得出先寫。 */
  const fresh = document.querySelector('[data-home-new]');
  if (fresh) {
    /* 最近一造上架嘅牌子 —— 唔寫死名單，由 createdAt 自己浮出嚟，
       下次再入貨都唔使改碼。 */
    const byBrand = new Map();
    products.forEach((p) => {
      if (!p.vendor || !p.createdAt) return;
      const cur = byBrand.get(p.vendor);
      if (!cur || p.createdAt > cur.newest) {
        byBrand.set(p.vendor, { newest: p.createdAt, n: (cur?.n || 0) + 1, sample: cur?.sample || p });
      } else {
        cur.n += 1;
      }
    });
    const brands = [...byBrand.entries()]
      .map(([vendor, v]) => ({ vendor, ...v }))
      .sort((a, b) => String(b.newest).localeCompare(String(a.newest)))
      .slice(0, 12)
      .filter((b) => b.n >= 3);

    /* 要有相 —— 冇相嗰啲上晒架但等緊舖頭補影，成行灰格唔好睇。
       同一個牌子最多兩件：最後上嗰個牌子（LINDSAY）自己就夠塞滿成行，
       客會以為我哋淨係入咗一個牌子。 */
    const perBrand = new Map();
    const newest = [...products]
      .filter((p) => p.createdAt && p.images?.edges?.[0]?.node?.url
        && (typeof p.totalInventory === 'number' ? p.totalInventory > 0 : true))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .filter((p) => {
        const n = (perBrand.get(p.vendor) || 0) + 1;
        perBrand.set(p.vendor, n);
        return n <= 2;
      })
      .slice(0, 14);

    if (newest.length >= 4) {
      /* 每個牌子一張橫相卡。有品牌自己張主視覺就用佢；冇（官網得一幅
         韓文促銷 banner）就用我哋自己張產品相 —— 韓文廣告字擺喺香港客
         面前係擺錯。 */
      const shotOf = (vendor) => {
        const kv = typeof brandKV === 'function' ? brandKV(vendor) : null;
        if (kv) return kv;
        const best = products
          .filter((p) => p.vendor === vendor && p.images?.edges?.[0]?.node?.url)
          .sort((a, b) => featured(b) - featured(a))[0];
        return best ? best.images.edges[0].node.url : null;
      };
      /* 品牌卡同產品卡本來 desktop 同係 210px、同一套圓角，上下相隔 16px
         —— 兩條行讀落似一個爛咗嘅兩行 grid，一掃就走位。而家品牌係
         16:9 橫相（闊）、產品係直度卡（窄），一眼睇得出係兩件事。
         字反白喺相上面，同下面「想搵咩？」嗰批卡同一套語言。 */
      fresh.innerHTML = `
        <div class="container">
          <div class="section-header section-header--split reveal-blur">
            <h2 class="heading-lg section-header__title">啱啱返嘅貨</h2>
            <a href="shop.html?sort=new" class="btn--ghost">睇晒新貨</a>
          </div>
          ${brands.length ? `<div class="new-brands">${brands.map((b) => {
            const shot = shotOf(b.vendor);
            return `<a class="new-brands__card" href="shop.html?brand=${encodeURIComponent(b.vendor)}">
              ${shot ? `<img class="new-brands__shot" src="${shot}" alt="" loading="lazy">` : ''}
              <span class="new-brands__name">${b.vendor}</span>
              <span class="new-brands__n">${b.n} 件</span>
            </a>`;
          }).join('')}</div>` : ''}
        </div>
        <div class="home-rail__track home-rail__track--new" data-rail="new">${newest.map(card).join('')}</div>`;
    }
  }

  /* ============================================================
     想搵咩？—— Y2K 芝麻貓皮膚助手（已批准設計）

     之前三個版本都畀否決咗：白底 packshot ＋ 黑漸變（灰濛濛）、
     淺色枱面卡（同上下兩格一樣係一排卡）、面部線稿（畫得唔靚）。
     而家係一部擺喺 XP 草地嘅 skin_helper.exe：左邊芝麻貓指住右邊，
     右邊係真係撳得嘅 Windows 視窗 —— 揀煩惱、睇三件真貨、撳綠掣入去。

     兩個唔可以破嘅規矩：
     1. 八個分類名同件數**未撳之前就要見到**，唔准收埋做 hover。
     2. 撳分類**淨係換視窗入面嘅結果**，唔重畫成格、唔郁 scroll、
        focus 留喺原本嗰粒掣。所以個 DOM 砌一次，之後淨係 patch。
     ============================================================ */
  const catHost = document.querySelector('[data-home-concerns]');
  if (catHost && typeof CONCERNS !== 'undefined') {
    const live = products.filter((p) =>
      typeof p.totalInventory === 'number' ? p.totalInventory > 0 : true);

    /* 每類：件數同三件推薦。三件要有首圖、唔重複、跟返 production
       嘅 featured 排序 —— 唔夠三件就出實際有幾件，唔補假貨。 */
    const buckets = CONCERNS.map((c) => {
      const hits = live.filter((p) => matchesConcern(p, c));
      const seen = new Set();
      const picks = hits
        .filter((p) => p.images?.edges?.[0]?.node?.url)
        .sort((x, y) => featured(y) - featured(x))
        .filter((p) => {
          const url = p.images.edges[0].node.url;
          if (seen.has(p.handle) || seen.has(url)) return false;
          seen.add(p.handle); seen.add(url);
          return true;
        })
        .slice(0, 3);
      return { c, hits, picks };
    });

    /* 一件貨都冇就唔好畫個假 hero 出嚟 */
    if (buckets.some((b) => b.hits.length)) {
      const esc = (t) => String(t || '').replace(/"/g, '&quot;');
      const money = (p) => formatPrice(p.priceRange?.minVariantPrice?.amount);

      const productCell = (p) => {
        const img = p.images.edges[0].node;
        return `<a class="home-skin-cat__product" href="/products/${p.handle}">
          <i><img src="${img.url}&width=240" alt="${esc(p.title)}"
                  width="240" height="267" loading="lazy" decoding="async"></i>
          <b>${p.vendor || ''}</b>
          <span>${p.title}</span>
          <em>${money(p)}</em>
        </a>`;
      };

      catHost.innerHTML = `
        <div class="home-skin-cat__wallpaper" aria-hidden="true">
          <span class="home-skin-cat__cloud home-skin-cat__cloud--a"></span>
          <span class="home-skin-cat__cloud home-skin-cat__cloud--b"></span>
        </div>
        <div class="container home-skin-cat__grid">
          <aside class="home-skin-cat__assistant">
            <div class="home-skin-cat__label" aria-hidden="true">
              <b>OUJI SKIN CAT</b>
              <span>揀右邊一個皮膚煩惱 ฅ^•ﻌ•^ฅ</span>
            </div>
            <div class="shima home-skin-cat__mascot" aria-hidden="true">
              ${[1, 2, 3, 4, 5, 6].map((n) => `
                <img class="shima__f${n === 1 ? ' is-on' : ''}" alt=""
                     src="assets/images/shima/shima-wave${n}.webp"
                     loading="lazy" decoding="async">`).join('')}
            </div>
          </aside>

          <article class="home-skin-cat__window">
            <div class="home-skin-cat__titlebar">
              <span>skin_helper.exe</span>
              <i aria-hidden="true">_</i><i aria-hidden="true">□</i><i aria-hidden="true">×</i>
            </div>
            <div class="home-skin-cat__menubar" aria-hidden="true">檔案　編輯　檢視　說明</div>
            <div class="home-skin-cat__body">
              <header class="home-skin-cat__head">
                <div>
                  <h3 data-skin-cat-title></h3>
                  <p data-skin-cat-note></p>
                </div>
                <span data-skin-cat-count></span>
              </header>
              <p class="home-skin-cat__caption">先揀而家最困擾你嗰樣：</p>
              <div class="home-skin-cat__concerns" data-skin-cat-buttons></div>
              <div class="home-skin-cat__products" data-skin-cat-products></div>
              <a class="home-skin-cat__cta" data-skin-cat-cta href="shop.html"></a>
            </div>
            <div class="home-skin-cat__status">
              <span data-skin-cat-status></span><span aria-hidden="true">OUJI SKIN OS</span>
            </div>
            <p class="visually-hidden" aria-live="polite" data-skin-cat-say></p>
          </article>
        </div>
        <div class="home-skin-cat__taskbar" aria-hidden="true">
          <b class="home-skin-cat__start">start</b>
          <span class="home-skin-cat__task">skin_helper.exe</span>
          <time class="home-skin-cat__clock">20:01</time>
        </div>`;

      const btnHost = catHost.querySelector('[data-skin-cat-buttons]');
      btnHost.innerHTML = buckets.map(({ c, hits }) => `
        <button type="button" class="home-skin-cat__concern"
                data-concern-id="${c.id}" aria-pressed="false"
                ${hits.length ? '' : 'disabled aria-disabled="true"'}>
          <b>${c.label}</b>
          <small>${hits.length} 件產品</small>
        </button>`).join('');

      /* 只 patch 結果區：標題、說明、件數、三件貨、CTA、狀態行。
         個 section、八粒掣、貓咪一律唔重畫 —— 所以 focus 唔會跌。 */
      const paintCat = (id) => {
        const b = buckets.find((x) => x.c.id === id) || buckets[0];
        btnHost.querySelectorAll('[data-concern-id]').forEach((el) => {
          el.setAttribute('aria-pressed', el.dataset.concernId === b.c.id ? 'true' : 'false');
        });
        catHost.querySelector('[data-skin-cat-title]').textContent = b.c.label;
        catHost.querySelector('[data-skin-cat-note]').textContent = b.c.note;
        catHost.querySelector('[data-skin-cat-count]').textContent = `${b.hits.length} 件`;
        catHost.querySelector('[data-skin-cat-products]').innerHTML =
          b.picks.map(productCell).join('');
        const cta = catHost.querySelector('[data-skin-cat-cta]');
        cta.href = `shop.html?concern=${b.c.id}`;
        cta.innerHTML = `<span>打開 ${b.hits.length} 件${b.c.label}產品</span>`
          + `<span aria-hidden="true">→</span>`;
        catHost.querySelector('[data-skin-cat-status]').textContent =
          `${b.picks.length} 件顯示中 · 共 ${b.hits.length} 件`;
        catHost.querySelector('[data-skin-cat-say]').textContent =
          `${b.c.label}，${b.hits.length} 件產品`;
      };

      btnHost.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-concern-id]');
        if (btn && !btn.disabled) paintCat(btn.dataset.concernId);
      });

      const first = buckets.find((b) => b.c.id === 'acne' && b.hits.length)
        || buckets.find((b) => b.hits.length);
      paintCat(first.c.id);
    }
  }

  /* 妝感配對嗰格改咗喺 index.html 寫死（三張妝感相 + 連結）。
     舊版由 match-data.json 生成六個文字 pill，連結去 match.html#<id> ——
     新版 /match 係讀 ?look=<id>，個 hash 乜都唔會做，即係啲連結全部死咗。 */
}
