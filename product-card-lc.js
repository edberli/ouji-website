/* 產品頁新產品卡＋揀色號彈出畫面（Winston 2026-10-14 叫上 live：只換設計，網站原有功能照用）。

   - 張卡外層照舊係 <a class="product-card" href="/products/…">：連結、分析（view_item_list／select_item）照用。
     分析程式攞「第一個 class 有 price 字」做售價、「class 有 name 字」做名、「class 有 brand 字」做品牌，
     所以價錢行外層唔准用「price」字，售價本身先用 lc__pricenow。
   - 心心（data-wish）、單一款式「加入購物袋」（data-quick-add）、缺貨「通知我補貨」（data-restock）
     全部行 script.js 原本嘅委派 handler，呢度唔另外寫。
   - 多款式撳相上「選色・N色 ⊕」→ 彈出畫面：用 getProduct()（有快取）攞完整變體同色號相；加入購物袋用原本 addToCart()。
   - 只有載入咗呢個檔嘅產品頁先會轉用新卡（catalog.js productCard 見到 window.lcProductCard 先轉）。 */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cp = (zh, en) => (typeof oujiCopy === 'function' ? oujiCopy(zh, en) : zh);
  const num = (x) => parseFloat(x && typeof x === 'object' ? x.amount : x);
  const money = (n) => (typeof formatPrice === 'function' ? formatPrice(n) : `HK$${n}`);
  const amt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const imgUrl = (url, w) => (typeof shopifyImageUrl === 'function' ? shopifyImageUrl(url, w) : url);

  const ICON = {
    plus: '<svg viewBox="1.7 1.7 20.6 20.6" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v9M7.5 12h9"/></svg>',
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.5V11a2 2 0 0 0 .6 1.4l8.5 8.5a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8L12.4 3.6A2 2 0 0 0 11 3H4.5A1.5 1.5 0 0 0 3 4.5zM7.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>',
    clock: '<svg viewBox="1 1 22 22" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.6 3.2 1.9-.9 1.5-4.3-2.5V6.5h2z"/></svg>',
    trophy: '<svg viewBox="3 3 18 18" aria-hidden="true"><path d="M7 21v-2h4v-3.1a5.2 5.2 0 0 1-3.6-2.95A4.6 4.6 0 0 1 3 8V7a2 2 0 0 1 2-2h2V3h10v2h2a2 2 0 0 1 2 2v1a4.6 4.6 0 0 1-4.4 4.95A5.2 5.2 0 0 1 13 15.9V19h4v2H7zm0-10.2V7H5v1a2.9 2.9 0 0 0 2 2.8zm10 0A2.9 2.9 0 0 0 19 8V7h-2v3.8z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    mag: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4 20.5 20.5M10.5 7.9v5.2M7.9 10.5h5.2"/></svg>',
  };

  /* 細牌（Winston 2026-10-14 揀）：原價 HK$100 或以上寫「慳 HK$X」，以下寫「X% OFF」，減唔夠一成唔出 */
  function dealText(price, compare) {
    if (!(compare > price)) return '';
    const off = (compare - price) / compare;
    if (off < 0.1) return '';
    const save = Math.round(compare - price);
    return compare >= 100 ? cp(`慳 HK$${save}`, `Save HK$${save}`) : `${Math.round(off * 100)}% OFF`;
  }

  /* 款式字眼：色號寫「N 色可選」、款式寫「N 款可選」、規格寫「多規格可選」、度數寫「N 個度數」 */
  function wordFor(name) {
    const n = String(name || '');
    if (/度數/.test(n)) return 'power';
    if (/款式|款|style/i.test(n)) return 'style';
    if (/規格|容量|尺寸|件裝|片|size/i.test(n)) return 'spec';
    if (/色|shade|colou?r/i.test(n)) return 'shade';
    return '';
  }
  function words(w) {
    switch (w) {
      case 'style': return { label: (n) => (n ? cp(`${n} 款可選`, `${n} styles`) : cp('多款可選', 'More styles')), pick: (n) => (n ? cp(`選款・${n}款`, `${n} styles`) : cp('選款', 'Styles')), cta: cp('選擇款式', 'Choose style'), unit: cp('款式', 'Style') };
      case 'spec': return { label: () => cp('多規格可選', 'More sizes'), pick: () => cp('選規格', 'Sizes'), cta: cp('選擇規格', 'Choose size'), unit: cp('規格', 'Size') };
      case 'power': return { label: (n) => (n ? cp(`${n} 個度數`, `${n} powers`) : cp('多個度數', 'More powers')), pick: () => cp('選度數', 'Powers'), cta: cp('選擇度數', 'Choose power'), unit: cp('度數', 'Power') };
      default: return { label: (n) => (n ? cp(`${n} 色可選`, `${n} shades`) : cp('多色可選', 'More shades')), pick: (n) => (n ? cp(`選色・${n}色`, `${n} shades`) : cp('選色', 'Shades')), cta: cp('選擇色號', 'Choose shade'), unit: cp('色號', 'Shade') };
    }
  }
  function optionInfo(p) {
    const vs = (p.variants?.edges || []).map((e) => e.node).filter(Boolean);
    const opt = (p.options || []).find((o) => o && o.name && o.name !== 'Title');
    const count = opt ? (opt.optionValues?.length ?? opt.values?.length ?? 0) : 0;
    if (!(count > 1 || vs.length > 1)) return null;
    // 舊快取冇 options：當色號處理，唔寫數目
    return { word: wordFor(opt?.name) || 'shade', count: count > 1 ? count : 0, name: opt?.name || '' };
  }

  /* 優惠：跟 shopify.js oujiSaleBadgeHTML 同一套判斷，只係改為出喺獲獎條個位（Winston 2026-10-14：唔用相上標籤） */
  function offerOf(p, onSale) {
    const tags = p.tags || [];
    const title = p.title || '';
    if (typeof isShortDated === 'function' && isShortDated(p)) {
      const m = String(typeof shortDatedExpiry === 'function' ? shortDatedExpiry(p) : '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return { kind: 'expiry', label: cp(`${+m[2]}月${+m[3]}日到期`, `Best before ${+m[3]}/${+m[2]}`), tone: 'sale' };
    }
    if (typeof oujiHasPairDeal === 'function' && oujiHasPairDeal(tags) && typeof OUJI_PAIR_DEAL !== 'undefined') {
      return { kind: 'pair', label: cp(`任揀 ${OUJI_PAIR_DEAL.count} 件 HK$${OUJI_PAIR_DEAL.total}`, `Any ${OUJI_PAIR_DEAL.count} for HK$${OUJI_PAIR_DEAL.total}`), tone: 'sale' };
    }
    const bundle = typeof oujiBundleInfo === 'function' ? oujiBundleInfo(title) : null;
    const prestige = typeof isCounterBrandBundle === 'function' && isCounterBrandBundle(title, tags);
    if (typeof oujiIsSeasonProduct === 'function' && oujiIsSeasonProduct(title, tags) && !bundle && !prestige
      && (tags.includes('限時') || onSale)) return { kind: 'season', label: cp('換季優惠', 'Season sale'), tone: 'sale' };
    if (prestige) return { kind: 'prestige', label: cp('專櫃尊享套裝', 'Prestige set'), tone: 'prestige' };
    if (tags.includes('限時')) return { kind: 'limited', label: cp('限時優惠', 'Limited offer'), tone: 'sale' };
    if (bundle) {
      const label = bundle.count === 2 ? cp('孖裝', 'Twin pack') : bundle.count ? cp(`${bundle.count} 件裝`, `${bundle.count}-pack`) : cp('套裝優惠', 'Set deal');
      return { kind: 'bundle', label, tone: 'promo', count: bundle.count };
    }
    if (onSale) return { kind: 'discount', label: cp('限時優惠', 'Limited offer'), tone: 'sale' };
    return null;
  }
  const AWARD_SHORT = { OLIVE_YOUNG: 'Olive Young', GLOWPICK: 'Glowpick', HWAHAE: 'Hwahae', ALLURE_RC: 'Allure', ALLURE_BOB: 'Allure', COSME: '@cosme' };
  function awardOf(handle) {
    if (typeof topAward !== 'function' || typeof AWARD_BODIES === 'undefined') return null;
    const a = topAward(handle);
    const body = a && AWARD_BODIES[a.body];
    if (!body) return null;
    const parts = String(body.name).split(' ');
    const last = parts.pop();
    // 年份另外包住：手機窄卡收起年份（相上得獎章已經有）。
    // 首頁細卡（139px 或以下）放唔落全名，轉用短名（lc__aws），唔准截字（Winston 唔要「Allure Best of Beau…」）
    const short = AWARD_SHORT[a.body] || String(body.name).replace(/\s*Awards?$/i, '');
    return {
      html: `<span class="lc__awl">${parts.length ? esc(parts.join(' ')) + ' ' : ''}${esc(last)}</span><span class="lc__aws">${esc(short)}</span><span class="lc__yr">&nbsp;·&nbsp;${a.year}</span>`,
      title: `${body.name} ${a.year}`,
    };
  }
  /* 獲獎條個位：特別優惠（到期／任揀／換季／專櫃／限時 tag／孖裝套裝）先出；冇就出獎項；再冇先出一般減價「限時優惠」 */
  function barHTML(p, offer, price) {
    const offerBar = (o) => {
      let text = esc(o.label);
      if (o.kind === 'bundle' && o.count) text += `&nbsp;· ${cp('每件', 'each')}&nbsp;HK$${amt(price / o.count)}`;
      if (o.kind === 'pair') text = text.replace(/^任揀 (\d+) 件/, '任揀&nbsp;$1&nbsp;件');
      // 首頁細卡收起「HK」兩隻字先放得落（孖裝 · 每件 $37.5），唔准截字
      text = text.replace(/HK\$/g, '<span class="lc__hk">HK</span>$');
      return `<span class="lc__award lc__award--${o.tone}">${o.kind === 'expiry' ? ICON.clock : ICON.tag}<span>${text}</span></span>`;
    };
    if (offer && offer.kind !== 'discount') return offerBar(offer);
    const a = awardOf(p.handle);
    if (a) return `<span class="lc__award" title="${esc(a.title)}">${ICON.trophy}<span>${a.html}</span></span>`;
    if (offer) return offerBar(offer);
    return '<span class="lc__award is-empty" aria-hidden="true"></span>';
  }
  /* 評分：★ 4.6 ｜ 369 則評價 ｜ Olive Young（Winston 2026-10-14 定：寫 Olive Young，唔寫「韓國站」） */
  function ratingHTML(handle) {
    const r = typeof RATINGS_CACHE !== 'undefined' && RATINGS_CACHE ? RATINGS_CACHE[handle] : null;
    if (!r) return '<span class="lc__rating" aria-hidden="true"></span>';
    return `<span class="lc__rating"><span class="lc__score"><span class="lc__star" aria-hidden="true">★</span>${Number(r.star).toFixed(1)}</span>`
      + `<i aria-hidden="true"></i><span>${Number(r.count).toLocaleString('en-US')}<span class="lc__cw"> ${cp('則評價', 'reviews')}</span></span>`
      + `<i aria-hidden="true"></i><span class="lc__src">Olive Young</span></span>`;
  }

  const CARD_DATA = new Map();

  function lcProductCard(p, options = null) {
    const eager = !!(options && typeof options === 'object' && options.eager);
    const priority = !!(options && typeof options === 'object' && options.priority);
    const image = p.images?.edges?.[0]?.node;
    const p0 = p.priceRange?.minVariantPrice;
    const p1 = p.priceRange?.maxVariantPrice;
    /* 劃線價跟 catalog.js productCard 同一把尺：只用「最平嗰件變體」自己嘅劃線價；冇變體價錢就只喺全部同價先用範圍 */
    const vn = (p.variants?.edges || []).map((e) => e.node).filter(Boolean);
    const cheap = vn.find((v) => num(v.price) === num(p0));
    let cpx = cheap ? cheap.compareAtPrice : null;
    if (!vn.some((v) => v.price)) {
      const lo = num(p0 || 0);
      const hi = p1?.amount;
      cpx = hi != null && parseFloat(hi) === lo ? (p.compareAtPriceRange?.minVariantPrice || null) : null;
    }
    const price = num(p0);
    const compare = cpx ? num(cpx) : NaN;
    const onSale = Number.isFinite(compare) && compare > price;
    const from = p1 && num(p1) > price;
    const isSoldOut = typeof soldOut === 'function' ? soldOut(p) : false;
    const opt = optionInfo(p);
    const w = opt ? words(opt.word) : null;
    const offer = isSoldOut ? null : offerOf(p, onSale);
    const vendor = p.vendor || '';
    const name = (typeof oujiCardName === 'function' ? oujiCardName(p) : '') || p.title || '';
    // 品牌已經喺上一行，名唔再重複品牌（2026-10-15 Winston 嫌兩行粗黑字）
    // 聯名（「Torriden × Ganadi …」）保留品牌，唔係就變咗「× Ganadi …」
    const rest = (vendor && name.toLowerCase().startsWith(vendor.toLowerCase()) ? name.slice(vendor.length).trim() : name) || name;
    const title = vendor && /^(×|x\s|&|\+)/i.test(rest) ? `${vendor} ${rest}` : rest;
    const href = `/products/${p.handle}`;
    const lowText = !isSoldOut && typeof oujiLowStockText === 'function' && (p.options?.[0]?.name || '') !== '度數'
      ? oujiLowStockText(p.totalInventory) : '';
    const chip = onSale ? dealText(price, compare) : '';
    CARD_DATA.set(p.handle, { p, price, compare: onSale ? compare : null, from, chip, title, opt });

    const img = image
      ? `<img class="product-card__image" ${typeof shopifyResponsiveImageAttrs === 'function'
        ? shopifyResponsiveImageAttrs(image.url, { srcWidth: 480, widths: [320, 480, 640, 800], sizes: '(max-width: 600px) 48vw, (max-width: 1024px) 34vw, 320px' })
        : `src="${esc(image.url)}"`} alt="${esc(image.altText || p.title)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${priority ? ' fetchpriority="high"' : ''}>`
      : '';
    const wishOn = typeof isInWishlist === 'function' && isInWishlist(p.id);
    /* 粒掣放喺相右下角（Winston 2026-10-14 mock）：多款「選色・N色」開揀色畫面；單一款式「加入」；缺貨「到貨通知我」。
       色號數同揀色入口合埋一粒，唔再另外有色號行同大掣，張卡輕身啲、矮啲。 */
    let pick = '';
    if (isSoldOut) {
      pick = `<button type="button" class="lc__pick lc__pick--restock" data-restock="${esc(p.handle)}" data-restock-title="${esc(p.title)}">${cp('到貨通知我', 'Notify me')}</button>`;
    } else if (w) {
      pick = `<button type="button" class="lc__pick" data-lc-open="${esc(p.handle)}" aria-label="${w.cta}">${w.pick(opt.count)}${ICON.plus}</button>`;
    } else if (vn[0]?.id) {
      pick = `<button type="button" class="lc__pick" data-quick-add="${esc(vn[0].id)}" aria-label="${cp('加入購物袋', 'Add to bag')}">${cp('加入', 'Add')}${ICON.plus}</button>`;
    }
    return `
    <a href="${esc(href)}" class="product-card lc${p._oujiOtherBrandStart ? ' product-card--other-brand-start' : ''}">
      <span class="lc__in">
        <div class="product-card__image-wrap">
          ${img}
          ${p._oujiOtherBrandStart ? `<span class="product-card__mini-brand">${esc(p._oujiOtherBrandStart)}</span>` : ''}
          ${isSoldOut ? `<span class="product-card__badge product-card__badge--sold-out">${cp('暫時缺貨', 'Out of stock')}</span>` : ''}
          ${typeof awardRibbon === 'function' ? awardRibbon(p.handle) : ''}
          <button type="button" class="product-card__wishlist${wishOn ? ' is-active' : ''}" aria-label="${cp('加入心願清單', 'Add to wishlist')}" aria-pressed="${wishOn ? 'true' : 'false'}"
            data-wish="${esc(p.id)}" data-wish-handle="${esc(p.handle)}" data-wish-title="${esc(p.title)}">${ICON.heart}</button>
          ${pick}
        </div>
        <span class="lc__body">
          <span class="lc__brand">${esc(vendor)}</span>
          <span class="lc__name"><span class="lc__title">${esc(title)}</span></span>
          ${ratingHTML(p.handle)}
          <span class="lc__deal"><span class="lc__nums${onSale ? ' is-sale' : ''}">${onSale ? `<s class="lc__was">${money(compare)}</s>` : ''}<strong class="lc__pricenow">${money(price)}</strong>${from ? `<small class="lc__from">${cp('起', 'from')}</small>` : ''}</span>${chip ? `<em class="lc__chip">${esc(chip)}</em>` : ''}</span>
          <span class="lc__awardrow">${barHTML(p, offer, price)}${lowText ? `<span class="lc__low">${lowText}</span>` : ''}</span>
        </span>
      </span>
    </a>`;
  }

  /* ---------- 名嘅位：同一行卡有兩行名，成行先留兩行位；成行一行名就唔留空位 ---------- */
  function fitGrid(grid) {
    const cards = [...grid.children].filter((c) => c.classList && c.classList.contains('lc'));
    if (!cards.length) return;
    cards.forEach((c) => c.style.setProperty('--lc-lines', '2'));
    const t0 = cards[0].querySelector('.lc__title');
    const lh = (t0 && parseFloat(getComputedStyle(t0).lineHeight)) || 1;
    const rows = [];
    cards.forEach((c) => {
      const t = c.querySelector('.lc__title');
      const lines = t ? Math.min(2, Math.max(1, Math.round(t.getBoundingClientRect().height / lh))) : 1;
      const top = c.offsetTop;
      let r = rows.find((x) => Math.abs(x.top - top) < 4);
      if (!r) { r = { top, n: 1, cards: [] }; rows.push(r); }
      r.cards.push(c);
      r.n = Math.max(r.n, lines);
    });
    rows.forEach((r) => r.cards.forEach((c) => c.style.setProperty('--lc-lines', String(r.n))));
  }
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) fitGrid(en.target); }), { rootMargin: '900px 0px' })
    : null;
  let refreshQueued = false;
  function refreshGrids() {
    refreshQueued = false;
    document.querySelectorAll('.product-grid').forEach((g) => {
      if (!g.querySelector(':scope > .lc')) return;
      if (io) { io.unobserve(g); io.observe(g); } else fitGrid(g);
    });
  }
  const queueRefresh = () => { if (!refreshQueued) { refreshQueued = true; requestAnimationFrame(refreshGrids); } };
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && (n.classList.contains('lc') || (n.querySelector && n.querySelector('.lc')))) { queueRefresh(); return; }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; queueRefresh(); } }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueRefresh);

  /* ---------- 揀色號彈出畫面（shadow DOM，網站樣式影響唔到）：手機由底彈上，桌面中間彈框 ---------- */
  const SHEET_CSS = `
:host { all: initial; }
.sh { --ink: #1e3038; --ink-2: #4a5e66; --muted: #6f8590; --line: rgba(30, 48, 56, .1); --sale: #bd3a27; --sale-tint: #fdebea; --sale-ink: #b23423; --cta: #617a8b; --sel: #2b4c58;
  --f: "Manrope", "Noto Sans TC", -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif;
  position: fixed; inset: 0; z-index: 2147483000; display: none; color: var(--ink); font: 400 16px/1.5 var(--f); -webkit-font-smoothing: antialiased; }
.sh.is-open { display: block; }
* { box-sizing: border-box; }
.sh__scrim { position: absolute; inset: 0; background: rgba(20, 30, 36, .42); animation: fade .2s ease-out; }
.sh__panel { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; max-height: 86vh; padding-bottom: env(safe-area-inset-bottom, 0px); border-radius: 22px 22px 0 0; background: #fff; box-shadow: 0 -10px 30px rgba(15, 25, 32, .18); animation: rise .24s cubic-bezier(.2, .8, .2, 1); }
.sh__grab { align-self: center; width: 40px; height: 5px; margin: 8px 0 2px; border-radius: 99px; background: rgba(30, 48, 56, .18); }
.sh__head { display: grid; grid-template-columns: 64px minmax(0, 1fr) 36px; gap: 12px 18px; align-items: start; padding: 10px 16px 14px; border-bottom: 1px solid var(--line); }
.sh__thumb { display: block; width: 64px; height: 64px; border-radius: 12px; object-fit: cover; background: #eef2f3; }
.sh__zoom { position: relative; display: block; width: 64px; height: 64px; padding: 0; border: 0; border-radius: 12px; background: none; cursor: zoom-in; }
.sh__mag { position: absolute; right: -7px; bottom: -7px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #fff; color: var(--ink); box-shadow: 0 1px 5px rgba(15, 25, 32, .24); }
.sh__mag svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.sh__brand { margin: 0; color: var(--muted); font: 600 12px/1.3 var(--f); letter-spacing: .04em; }
.sh__title { margin: 2px 0 0; overflow: hidden; color: var(--ink); font: 700 15px/1.35 var(--f); white-space: nowrap; text-overflow: ellipsis; }
.sh__price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin: 6px 0 0; }
.sh__price s { color: #9aa7ad; font: 600 13px/1 var(--f); }
.sh__price strong { color: var(--ink); font: 700 20px/1.1 var(--f); font-variant-numeric: tabular-nums; }
.sh__price.is-sale strong { color: var(--sale); }
.sh__price small { margin-left: 2px; font: 700 12px/1 var(--f); }
.sh__price em { align-self: center; padding: 3px 8px; border-radius: 6px; background: var(--sale-tint); color: var(--sale-ink); font: 700 12px/1.1 var(--f); font-style: normal; }
.sh__close { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 50%; background: #f1f3f3; color: var(--ink-2); font: 400 22px/1 var(--f); cursor: pointer; }
.sh__group { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 14px 16px 16px; }
.sh__label { display: flex; align-items: baseline; gap: 8px; margin: 0 0 12px; color: var(--ink); font: 700 14px/1.3 var(--f); }
.sh__label span { color: var(--muted); font-weight: 500; }
.sh__label b { margin-left: auto; overflow: hidden; color: var(--sel); font-weight: 700; white-space: nowrap; text-overflow: ellipsis; }
.sh__state { margin: 18px 0; color: var(--muted); font: 500 14px/1.5 var(--f); text-align: center; }
.sh__grid { display: grid; gap: 10px; }
.sh__grid.is-thumbs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sh__grid.is-text { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sh__opt { position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 6px; min-width: 0; padding: 8px; border: 1.5px solid var(--line); border-radius: 14px; background: #fff; color: var(--ink); font: inherit; text-align: left; cursor: pointer; }
.sh__opt:disabled { cursor: default; opacity: .55; }
.sh__opt img { display: block; width: 100%; aspect-ratio: 1 / 1; border-radius: 9px; object-fit: cover; object-position: center top; background: #eef2f3; }
.sh__ph { display: grid; place-items: center; width: 100%; aspect-ratio: 1 / 1; border-radius: 9px; background: #eef2f3; color: var(--muted); font: 700 14px/1 var(--f); }
.sh__opt .n { overflow: hidden; font: 600 13px/1.3 var(--f); white-space: nowrap; text-overflow: ellipsis; }
.sh__opt .p { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 6px; font: 700 13px/1.2 var(--f); }
.sh__opt .p.is-sale { color: var(--sale); }
.sh__opt .p s { color: #9aa7ad; font: 600 11px/1 var(--f); }
.sh__opt .low { color: var(--sale-ink); font: 700 11px/1.2 var(--f); }
.sh__opt[aria-pressed="true"] { border-color: var(--sel); box-shadow: 0 0 0 1.5px var(--sel) inset; }
.sh__opt:focus-visible, .sh__close:focus-visible, .sh__add:focus-visible, .sh__more:focus-visible, .sh__zoom:focus-visible, .sh__lb-close:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.sh__foot { display: flex; gap: 10px; padding: 12px 16px 14px; border-top: 1px solid var(--line); background: #fff; }
.sh__more { display: flex; flex: none; align-items: center; justify-content: center; min-height: 50px; padding: 0 18px; border: 1.5px solid var(--cta); border-radius: 999px; background: #fff; color: var(--cta); font: 700 15px/1 var(--f); letter-spacing: .02em; text-decoration: none; white-space: nowrap; }
.sh__add { display: flex; flex: 1 1 auto; align-items: center; justify-content: center; min-width: 0; min-height: 50px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--cta); color: #fff; font: 700 16px/1 var(--f); letter-spacing: .04em; cursor: pointer; }
.sh__add:disabled { background: #c6d0d4; cursor: default; }
.sh__lb { position: fixed; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 60px 16px 28px; background: rgba(12, 18, 22, .9); cursor: zoom-out; animation: fade .18s ease-out; }
.sh__lb[hidden] { display: none; }
.sh__lb-img { display: block; max-width: min(92vw, 760px); max-height: 74vh; border-radius: 14px; background: #fff; object-fit: contain; }
.sh__lb-cap { max-width: min(92vw, 760px); margin: 0; color: #fff; font: 600 14px/1.45 var(--f); text-align: center; }
.sh__lb-close { position: absolute; top: max(14px, env(safe-area-inset-top, 0px)); right: 14px; display: grid; place-items: center; width: 42px; height: 42px; padding: 0; border: 0; border-radius: 50%; background: rgba(255, 255, 255, .16); color: #fff; font: 400 26px/1 var(--f); cursor: pointer; }
.toast { position: fixed; z-index: 2147483001; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 92px); max-width: calc(100vw - 32px); padding: 12px 18px; border-radius: 12px; background: rgba(30, 48, 56, .94); color: #fff; font: 600 14px/1.4 "Manrope", "Noto Sans TC", sans-serif; transform: translateX(-50%); box-shadow: 0 8px 24px rgba(15, 25, 32, .24); animation: fade .2s ease-out; }
.toast[hidden] { display: none; }
@media (min-width: 761px) {
  .sh__panel { left: 50%; right: auto; top: 50%; bottom: auto; width: min(560px, calc(100vw - 48px)); max-height: 80vh; border-radius: 22px; transform: translate(-50%, -50%); animation: pop .2s ease-out; }
  .sh__grab { display: none; }
  .sh__head { padding: 18px 20px 16px; }
  .sh__group { padding: 16px 20px 18px; }
  .sh__grid.is-thumbs { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .sh__grid.is-text { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sh__foot { padding: 14px 20px 18px; }
  .toast { bottom: 32px; }
}
@keyframes rise { from { transform: translateY(100%); } to { transform: none; } }
@keyframes pop { from { opacity: 0; transform: translate(-50%, -48%) scale(.98); } to { opacity: 1; transform: translate(-50%, -50%); } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sh__panel, .sh__scrim, .toast, .sh__lb { animation: none; } }`;

  let sh = null;
  let toastEl = null;
  let toastTimer = 0;
  let lastFocus = null;
  let openToken = 0;
  function ensureSheet() {
    if (sh) return;
    const host = document.createElement('div');
    host.id = 'lc-sheet-host';
    /* 網站 CSS 會將 body 下面嘅 div 設做 position:relative; z-index:1，咁彈出畫面就會俾底部導覽列（z-index 2000）
       遮住底部兩粒掣。個 host 自己要攞最高層。 */
    host.style.setProperty('position', 'relative', 'important');
    host.style.setProperty('z-index', '2147483647', 'important');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${SHEET_CSS}</style><div class="sh"></div><div class="toast" role="status" hidden></div>`;
    sh = root.querySelector('.sh');
    toastEl = root.querySelector('.toast');
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape' || !sh.classList.contains('is-open')) return;
      const lb = sh.querySelector('.sh__lb');
      if (lb && !lb.hidden) { lb.hidden = true; sh.querySelector('.sh__zoom')?.focus(); } else closeSheet();
    });
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2800);
  }
  function closeSheet() {
    openToken++;
    sh.classList.remove('is-open');
    sh.innerHTML = '';
    document.documentElement.style.removeProperty('overflow');
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }
  function headPrice(h) {
    return `<p class="sh__price${h.compare ? ' is-sale' : ''}">${h.compare ? `<s>${money(h.compare)}</s>` : ''}<strong>${money(h.price)}${h.from ? `<small>${cp('起', 'from')}</small>` : ''}</strong>${h.chip ? `<em>${esc(h.chip)}</em>` : ''}</p>`;
  }
  async function loadProduct(handle) {
    const cached = typeof getCachedProduct === 'function' ? getCachedProduct(handle) : null;
    if (cached && cached.variants?.edges?.length) return cached;
    const prod = await getProduct(handle);
    if (prod && typeof cacheProduct === 'function') cacheProduct(prod);
    return prod;
  }
  async function openSheet(handle, from) {
    ensureSheet();
    const card = CARD_DATA.get(handle);
    if (!card) { location.href = `/products/${handle}`; return; }
    const token = ++openToken;
    lastFocus = from || null;
    const { p } = card;
    const w = words(card.opt?.word || 'shade');
    const detail = `/products/${encodeURIComponent(handle)}`;
    sh.innerHTML = `<div class="sh__scrim" data-close></div>
      <section class="sh__panel" role="dialog" aria-modal="true" aria-labelledby="lc-sh-title">
        <div class="sh__grab" aria-hidden="true"></div>
        <header class="sh__head">
          <button class="sh__zoom" type="button" aria-label="${cp('放大睇相', 'Zoom image')}"><img class="sh__thumb" src="${esc(imgUrl(p.images?.edges?.[0]?.node?.url || '', 200))}" alt=""><span class="sh__mag">${ICON.mag}</span></button>
          <div><p class="sh__brand">${esc(p.vendor || '')}</p><p class="sh__title" id="lc-sh-title">${esc(card.title)}</p><p class="sh__price"></p></div>
          <button class="sh__close" type="button" data-close aria-label="${cp('關閉', 'Close')}">×</button>
        </header>
        <div class="sh__group"><p class="sh__label">${w.unit}<span></span><b></b></p><div class="sh__body"><p class="sh__state">${cp('載入緊…', 'Loading…')}</p></div></div>
        <footer class="sh__foot"><a class="sh__more" href="${esc(detail)}">${cp('查看詳情', 'Details')}</a><button class="sh__add" type="button" disabled>${cp(`請先揀${w.unit}`, `Choose a ${w.unit.toLowerCase()}`)}</button></footer>
      </section>
      <div class="sh__lb" hidden><button class="sh__lb-close" type="button" aria-label="${cp('關閉放大圖', 'Close zoom')}">×</button><img class="sh__lb-img" alt=""><p class="sh__lb-cap"></p></div>`;
    sh.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    sh.querySelector('.sh__price').outerHTML = headPrice({ price: card.price, compare: card.compare, from: card.from, chip: card.chip });
    sh.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', closeSheet));
    sh.querySelector('.sh__close').focus();

    let vs = [];
    let sel = null;
    const lb = sh.querySelector('.sh__lb');
    sh.querySelector('.sh__zoom').addEventListener('click', () => {
      const v = sel != null ? vs[sel] : null;
      const src = (v && v.img) || p.images?.edges?.[0]?.node?.url || '';
      if (!src) return;
      lb.querySelector('.sh__lb-img').src = imgUrl(src, 1200);
      lb.querySelector('.sh__lb-cap').textContent = v ? `${card.title}｜${v.name}` : card.title;
      lb.hidden = false;
      lb.querySelector('.sh__lb-close').focus();
    });
    lb.addEventListener('click', () => { lb.hidden = true; sh.querySelector('.sh__zoom')?.focus(); });

    let full = null;
    try { full = await loadProduct(handle); } catch (e) { full = null; }
    if (token !== openToken) return;
    vs = (full?.variants?.edges || []).map((e) => e.node).filter(Boolean).map((v) => ({
      id: v.id, name: v.title, price: num(v.price), compare: v.compareAtPrice ? num(v.compareAtPrice) : null,
      ok: !!v.availableForSale, qty: v.quantityAvailable, img: v.image?.url || '',
    }));
    const body = sh.querySelector('.sh__body');
    if (!vs.length) {
      body.innerHTML = `<p class="sh__state">${cp('暫時載入唔到，請撳「查看詳情」入產品頁揀。', 'Could not load. Please open Details to choose.')}</p>`;
      return;
    }
    // 同一張相用喺幾個色號＝分唔到顏色，當冇相；過半有相先出色號相
    const seen = {};
    vs.forEach((v) => { if (v.img) seen[v.img] = (seen[v.img] || 0) + 1; });
    vs.forEach((v) => { if (v.img && seen[v.img] > 1) v.img = ''; });
    const thumbs = vs.filter((v) => v.img).length * 2 >= vs.length;
    const varied = new Set(vs.map((v) => `${v.price}/${v.compare || 0}`)).size > 1;
    const optHTML = (v, i) => {
      const onSale = v.compare && v.compare > v.price;
      const priceLine = varied ? `<span class="p${onSale ? ' is-sale' : ''}">${money(v.price)}${onSale ? `<s>${money(v.compare)}</s>` : ''}</span>` : '';
      const lowTxt = v.ok && typeof oujiLowStockText === 'function' ? oujiLowStockText(v.qty) : '';
      const pic = thumbs ? (v.img ? `<img src="${esc(imgUrl(v.img, 300))}" alt="" loading="lazy">` : `<span class="sh__ph" aria-hidden="true">${esc(String(v.name).split(' ')[0])}</span>`) : '';
      const state = !v.ok ? `<span class="low">${cp('暫時缺貨', 'Out of stock')}</span>` : lowTxt ? `<span class="low">${lowTxt}</span>` : '';
      return `<button class="sh__opt" type="button" data-i="${i}" aria-pressed="false"${v.ok ? '' : ' disabled'}>${pic}<span class="n">${esc(v.name)}</span>${priceLine}${state}</button>`;
    };
    sh.querySelector('.sh__label span').textContent = cp(`（${vs.length} 個）`, ` (${vs.length})`);
    body.innerHTML = `<div class="sh__grid ${thumbs ? 'is-thumbs' : 'is-text'}">${vs.map(optHTML).join('')}</div>`;
    const add = sh.querySelector('.sh__add');
    const paint = () => {
      const v = sel != null ? vs[sel] : null;
      const h = v
        ? { price: v.price, compare: v.compare && v.compare > v.price ? v.compare : null, from: false, chip: v.compare && v.compare > v.price ? dealText(v.price, v.compare) : '' }
        : { price: card.price, compare: card.compare, from: card.from, chip: card.chip };
      sh.querySelector('.sh__price').outerHTML = headPrice(h);
      sh.querySelector('.sh__label b').textContent = v ? cp(`已揀：${v.name}`, `Selected: ${v.name}`) : '';
      const thumb = sh.querySelector('.sh__thumb');
      const src = (v && v.img) || p.images?.edges?.[0]?.node?.url || '';
      if (src) thumb.src = imgUrl(src, 200);
      add.disabled = !v;
      add.textContent = v ? cp(`加入購物袋 · ${money(v.price)}`, `Add to bag · ${money(v.price)}`) : cp(`請先揀${w.unit}`, `Choose a ${w.unit.toLowerCase()}`);
      sh.querySelectorAll('.sh__opt').forEach((b, i) => b.setAttribute('aria-pressed', String(i === sel)));
    };
    sh.querySelectorAll('.sh__opt').forEach((b) => b.addEventListener('click', () => { sel = Number(b.dataset.i); paint(); }));
    add.addEventListener('click', async () => {
      const v = sel != null ? vs[sel] : null;
      if (!v || typeof addToCart !== 'function') return;
      add.disabled = true;
      add.textContent = cp('加緊…', 'Adding…');
      let ok = null;
      try { ok = await addToCart(v.id, 1); } catch (e) { ok = null; }
      if (token !== openToken) return;
      if (ok) {
        closeSheet();
        // 有購物袋側欄／芝麻提示（cart-drawer.js）就唔再出呢行字，免得重複
        if (!window.OUJI_cartFeedback) toast(cp(`已加入購物袋：${card.title}（${v.name}）`, `Added to bag: ${card.title} (${v.name})`));
      } else {
        paint();
        toast(cp('加唔到，請再試一次', 'Could not add. Please try again.'));
      }
    });
    paint();
  }

  // 撳相上「選色・N色 ⊕」：攔住張卡條連結，開彈出畫面
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-lc-open]');
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    openSheet(t.dataset.lcOpen, t);
  });

  window.lcProductCard = lcProductCard;
})();
