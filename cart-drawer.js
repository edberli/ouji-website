/* 購物袋側欄（電腦）＋芝麻加入提示（手機）—— 2026-10-15 Winston 要求上線。
   - 電腦：加入購物袋後由右邊彈出側欄；撳頁頭「購物袋」都係開側欄。
     側欄有：袋內貨品（可加減／移除）、下一個優惠進度、一件加購、商品小計，
     「揀配送及結帳」先去 cart.html 揀運送同付款。
   - 手機：唔開側欄，改為芝麻貼圖喺右下角彈出講「加咗入購物袋啦～」，3 秒消失；
     底部導航購物袋 icon 彈一下。
   - 數全部來自 Shopify 真購物車（getCart），唔自己估價。
   - 「滿 $399 減 $20」係 Shopify 自動折扣「滿 $399 減 $20（購物禮遇）」，
     2026-10-15 用 Storefront 真購物車核實：$343 冇減、$441 減 $20。改優惠要同步改 DISCOUNT。
   - 加購揀貨跟 cart.html 同一套規則（ADDON_TYPE、$10–169、有現貨）。
   由 shopify.js 尾動態載入；cart.html 本身唔載。 */
(function () {
  'use strict';
  if (window.OUJI_cartFeedback || typeof window.addToCart !== 'function') return;

  const DISCOUNT = { threshold: 399, amount: 20 };
  const GIFT = {
    threshold: (window.OUJI_COMMERCE && window.OUJI_COMMERCE.promotion && window.OUJI_COMMERCE.promotion.gift && window.OUJI_COMMERCE.promotion.gift.threshold) || 599,
    image: '/assets/images/home/gift-cream-cutout.webp',
  };
  const MASCOT_DIR = '/assets/images/home-codex/mascot-v4/';
  const ADDON_TYPE = { 面膜: 100, 定妝噴霧: 95, 潔面: 65, 防曬: 60, 護手霜: 55, 棉片: 45, 局部護理: 40, 濕紙巾: 40, 化妝工具: 35, 精華: 30 };
  const ADDON_FALLBACK = [[/定妝噴霧|蜜粉噴霧|妝前噴霧/, 95], [/片裝?面膜|面膜\s*\d+片/, 100], [/防曬棒/, 60], [/護手霜/, 55]];
  const PRICE_MIN = 10, PRICE_MAX = 169;
  const MOBILE = window.matchMedia('(max-width: 768px)');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  const t = (zh, en) => (typeof window.OUJI_copy === 'function' ? window.OUJI_copy(zh, en) : zh);
  const isEnglish = () => t('zh', 'en') === 'en';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const money = (n) => `HK$${Math.round(num(n)).toLocaleString('en-HK')}`;
  const icon = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  };

  const CSS = `
.ocd { --ocd-canvas:#fbf9f5; --ocd-ink:#2b4c58; --ocd-text:#1e3038; --ocd-muted:#5c727a; --ocd-line:#dce5e5; --ocd-paper:#fffdf9; --ocd-teal:#4e8497; --ocd-red:#ac5d56; --ocd-sans:"Manrope","Noto Sans TC",-apple-system,BlinkMacSystemFont,sans-serif; --ocd-serif:"Cormorant Garamond","Noto Serif TC",Georgia,serif; }
dialog.ocd { position:fixed; inset:0 0 0 auto; width:min(430px, calc(100vw - 18px)); max-width:none; height:100dvh; max-height:100dvh; margin:0; padding:24px 24px 0; border:0; border-left:1px solid var(--ocd-line); background:var(--ocd-canvas); color:var(--ocd-text); font-family:var(--ocd-sans); box-shadow:-18px 0 48px rgba(30,48,56,.12); overflow:hidden; }
dialog.ocd[open] { display:flex; flex-direction:column; animation:ocd-in .42s cubic-bezier(.16,1,.3,1); }
dialog.ocd::backdrop { background:rgba(30,48,56,.32); backdrop-filter:blur(3px); }
@keyframes ocd-in { from { transform:translateX(36px); opacity:0; } to { transform:none; opacity:1; } }
.ocd svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.ocd__top { display:flex; align-items:center; justify-content:space-between; padding-bottom:13px; border-bottom:1px solid var(--ocd-line); }
.ocd__eyebrow { color:var(--ocd-muted); font-size:10px; font-weight:600; letter-spacing:.1em; }
.ocd__close { display:grid; place-items:center; width:40px; height:40px; border:1px solid var(--ocd-line); border-radius:50%; background:var(--ocd-paper); color:var(--ocd-ink); cursor:pointer; }
.ocd__title { margin:19px 0 6px; color:var(--ocd-ink); font:500 32px/1.2 var(--ocd-serif); letter-spacing:-.02em; }
.ocd__title span { margin-left:6px; font:400 12px/1.4 var(--ocd-sans); color:var(--ocd-muted); }
.ocd__body { flex:1 1 auto; min-height:0; margin-top:8px; padding-bottom:16px; overflow-y:auto; overscroll-behavior:contain; }
.ocd__state { padding:40px 0; color:var(--ocd-muted); font-size:13px; text-align:center; }
.ocd-line { display:grid; grid-template-columns:76px minmax(0,1fr); gap:10px 14px; padding:18px 0; border-bottom:1px solid var(--ocd-line); }
.ocd-line__img { display:block; width:76px; height:88px; overflow:hidden; border:1px solid #e7e4dc; border-radius:14px; background:#fff; }
.ocd-line__img img { width:100%; height:100%; object-fit:contain; }
.ocd-line__info { display:grid; align-content:start; gap:3px; min-width:0; }
.ocd-line__vendor { color:var(--ocd-muted); font-size:10.5px; letter-spacing:.04em; }
.ocd-line__name { color:var(--ocd-text); font-size:14px; font-weight:500; line-height:1.5; text-decoration:none; }
.ocd-line__meta { color:var(--ocd-muted); font-size:12px; line-height:1.5; }
.ocd-line__gift { justify-self:start; margin-top:2px; padding:2px 8px; border-radius:999px; background:#e7f1f4; color:var(--ocd-teal); font-size:11px; font-weight:600; }
.ocd-line__controls { grid-column:1 / -1; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.ocd-qty { display:flex; align-items:center; width:120px; border:1px solid #d4dfe0; border-radius:999px; background:var(--ocd-paper); }
.ocd-qty button { display:grid; place-items:center; width:44px; height:44px; border:0; background:none; color:var(--ocd-ink); cursor:pointer; }
.ocd-qty button:disabled { opacity:.35; cursor:default; }
.ocd-qty output { flex:1; text-align:center; font-size:14px; font-variant-numeric:tabular-nums; }
.ocd-line__end { display:flex; align-items:center; gap:10px; }
.ocd-line__end strong { color:var(--ocd-text); font-size:18px; font-weight:500; font-variant-numeric:lining-nums tabular-nums; }
.ocd-line__remove { min-width:44px; min-height:44px; border:0; background:none; color:var(--ocd-muted); font-size:11px; text-decoration:underline; text-underline-offset:4px; cursor:pointer; }
.ocd-nudge { display:grid; gap:22px; margin-top:22px; }
.ocd-offer { --offer-accent:var(--ocd-red); position:relative; isolation:isolate; display:flex; align-items:center; gap:14px; min-height:128px; padding:18px 96px 18px 20px; overflow:hidden; border-radius:20px; color:var(--ocd-ink); background:radial-gradient(ellipse at 88% 105%, #dcebef 0%, rgba(220,235,239,.4) 31%, transparent 56%), radial-gradient(ellipse at 0% 0%, #f4e5df 0%, rgba(244,229,223,.32) 32%, transparent 58%), #f7f1e9; }
.ocd-offer[data-tone="gift"], .ocd-offer[data-tone="reached"] { --offer-accent:var(--ocd-teal); }
.ocd-offer__copy { position:relative; z-index:2; flex:1; min-width:0; }
.ocd-offer__cat { position:absolute; z-index:1; right:2px; bottom:-6px; width:92px; height:101px; object-fit:contain; }
.ocd-offer__gift { position:relative; z-index:2; flex:0 0 54px; width:54px; height:54px; overflow:hidden; border:4px solid rgba(255,255,255,.92); border-radius:50%; background:#eaf4f6; box-shadow:0 5px 15px rgba(43,76,88,.06); transform:rotate(-7deg); }
.ocd-offer__gift img { width:100%; height:100%; object-fit:contain; }
.ocd-offer__label { display:flex; align-items:center; gap:4px; color:#657c84; font-size:12px; font-weight:500; line-height:1.5; }
.ocd-offer__label--done { color:var(--ocd-teal); }
.ocd-offer__label svg { width:13px; height:13px; }
.ocd-offer__benefit { margin:4px 0 0; color:var(--ocd-ink); font-size:19px; font-weight:600; line-height:1.3; letter-spacing:-.03em; }
.ocd-offer[data-tone="saving"] .ocd-offer__benefit { color:var(--ocd-red); font-size:16px; }
.ocd-offer__benefit em { font:500 34px/1 var(--ocd-serif); font-style:normal; letter-spacing:-.045em; }
.ocd-offer__bar { height:5px; margin-top:12px; overflow:hidden; border-radius:999px; background:rgba(43,76,88,.1); }
.ocd-offer__bar span { display:block; height:100%; border-radius:inherit; background:var(--offer-accent); transition:width .6s cubic-bezier(.16,1,.3,1); }
.ocd-offer__status { margin:8px 0 0; color:#4b6670; font-size:12px; line-height:1.55; }
.ocd-offer__status strong { color:var(--offer-accent); font-weight:600; }
.ocd-pick h3 { margin:0 0 10px; color:#4b6670; font-size:13px; font-weight:500; }
.ocd-pick__item { display:grid; grid-template-columns:64px minmax(0,1fr) auto; align-items:center; gap:14px; padding:12px 14px 12px 12px; border:1px solid #e7e4dc; border-radius:20px; background:var(--ocd-paper); }
.ocd-pick__img { display:block; width:64px; height:72px; overflow:hidden; border-radius:12px; background:#fff; }
.ocd-pick__img img { width:100%; height:100%; object-fit:contain; }
.ocd-pick__copy { display:grid; gap:2px; min-width:0; }
.ocd-pick__vendor { color:#4b6670; font-size:11px; letter-spacing:.04em; }
.ocd-pick__name { display:-webkit-box; overflow:hidden; color:var(--ocd-text); font-size:13px; line-height:1.45; text-decoration:none; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.ocd-pick__why { margin-top:2px; color:var(--ocd-red); font-size:11px; font-weight:500; line-height:1.5; }
.ocd-pick__buy { display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
.ocd-pick__buy strong { font-size:15px; font-weight:500; font-variant-numeric:lining-nums tabular-nums; }
.ocd-pick__buy button { display:inline-flex; align-items:center; gap:4px; min-height:40px; padding:0 14px; border:1px solid var(--ocd-ink); border-radius:999px; background:transparent; color:var(--ocd-ink); font:500 12px var(--ocd-sans); cursor:pointer; transition:background-color .2s ease, color .2s ease; }
.ocd-pick__buy button svg { width:14px; height:14px; }
.ocd-pick__buy button:disabled { opacity:.5; cursor:default; }
.ocd__foot { flex:0 0 auto; padding:19px 0 max(16px, env(safe-area-inset-bottom)); border-top:1px solid var(--ocd-line); background:var(--ocd-canvas); }
.ocd__row { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:13px; }
.ocd__row strong { font-size:28px; font-weight:500; font-variant-numeric:lining-nums tabular-nums; }
.ocd__row--minor { margin-top:7px; font-size:12px; color:var(--ocd-red); }
.ocd__row--minor strong { font-size:13px; }
.ocd__foot--discount .ocd__row:first-child strong { font-size:19px; }
.ocd__row--minor + .ocd__row { margin-top:9px; }
.ocd__note { margin:8px 0 16px; color:#667c83; font-size:12px; line-height:1.6; }
.ocd__cta { display:flex; align-items:center; justify-content:center; gap:13px; width:100%; min-height:50px; border-radius:999px; background:var(--ocd-ink); color:#fff; font-size:14px; font-weight:500; text-decoration:none; }
.ocd__continue { display:block; width:100%; min-height:44px; margin-top:7px; border:0; background:none; color:#526971; font:13px var(--ocd-sans); cursor:pointer; }
.ocd :is(button, a):focus-visible { outline:2px solid var(--ocd-ink); outline-offset:3px; }
@media (hover:hover) { .ocd__cta:hover { background:#1e3038; } .ocd-pick__buy button:hover:not(:disabled) { background:var(--ocd-ink); color:#fff; } .ocd-pick__name:hover, .ocd-line__name:hover { text-decoration:underline; text-underline-offset:3px; } }
.ocd-sesame { position:fixed; z-index:2001; right:8px; bottom:calc(56px + var(--tabbar-gap, 16px) + 12px); display:flex; align-items:flex-end; color:#2b4c58; text-decoration:none; transform-origin:78% 100%; animation:ocd-pop .56s cubic-bezier(.34,1.56,.64,1) both; }
.ocd-sesame[hidden] { display:none; }
.ocd-sesame img { display:block; width:118px; height:auto; }
.ocd-sesame__bubble { position:relative; z-index:1; margin:0 -18px 62px 0; padding:10px 15px 11px; border-radius:18px 18px 4px 18px; background:#fff; box-shadow:0 6px 18px rgba(43,76,88,.16); font:600 14px/1.35 "Manrope","Noto Sans TC",sans-serif; white-space:nowrap; animation:ocd-bubble .38s .18s cubic-bezier(.16,1,.3,1) both; }
.ocd-sesame__bubble small { display:block; margin-top:2px; color:#4e8497; font-size:11px; font-weight:500; }
@keyframes ocd-pop { 0% { opacity:0; transform:translateY(28px) scale(.6) rotate(-8deg); } 60% { opacity:1; transform:translateY(-4px) scale(1.04) rotate(2deg); } 100% { opacity:1; transform:none; } }
@keyframes ocd-bubble { from { opacity:0; transform:translateY(6px) scale(.9); } to { opacity:1; transform:none; } }
.mobile-bottom-nav__item.ocd-bump .mobile-bottom-nav__icon-wrap { animation:ocd-bump .52s cubic-bezier(.16,1,.3,1); }
@keyframes ocd-bump { 0% { transform:scale(1); } 35% { transform:scale(1.22) translateY(-3px); } 100% { transform:scale(1); } }
@media (prefers-reduced-motion: reduce) { dialog.ocd[open], .ocd-sesame, .ocd-sesame__bubble, .mobile-bottom-nav__item.ocd-bump .mobile-bottom-nav__icon-wrap { animation:none; } .ocd-offer__bar span { transition:none; } }
`;

  function injectCss() {
    if (document.getElementById('ocd-css')) return;
    const style = document.createElement('style');
    style.id = 'ocd-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ── 購物車資料 ── */
  function readCart(cart) {
    const lines = (cart?.lines?.edges || []).map((e) => e.node).filter((l) => l && l.quantity > 0);
    const subtotal = num(cart?.cost?.subtotalAmount?.amount);
    const shipping = num(cart?.deliveryGroups?.edges?.[0]?.node?.selectedDeliveryOption?.estimatedCost?.amount);
    const net = Math.max(0, num(cart?.cost?.totalAmount?.amount) - shipping);
    const discount = Math.max(0, Math.round((subtotal - net) * 100) / 100);
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    return { lines, subtotal, net, discount, count };
  }
  const isGiftLine = (l) => (l.attributes || []).some((a) => a.key === '_ouji_auto_gift') || num(l.cost?.totalAmount?.amount) === 0;

  /* ── 加購：同 cart.html 一樣嘅品類排位 ── */
  let pool = null;
  async function loadPool() {
    if (pool) return pool;
    try {
      const r = await fetch(isEnglish() ? '/data/catalog-en.json' : '/data/catalog.json');
      const list = (await r.json())?.v || [];
      const rank = (p) => {
        const w = ADDON_TYPE[(p.productType || '').trim()];
        if (w) return w;
        if (p.productType) return 0;
        for (const [re, v] of ADDON_FALLBACK) if (re.test(p.title || '')) return v;
        return 0;
      };
      pool = list.map((e) => e.node).filter((p) => {
        const price = num(p?.priceRange?.minVariantPrice?.amount);
        if (!(price >= PRICE_MIN && price <= PRICE_MAX)) return false;
        p.__rank = rank(p);
        if (!p.__rank) return false;
        const v = (p.variants?.edges || []).map((x) => x.node).find((x) => x.availableForSale && (x.quantityAvailable ?? 0) > 0);
        if (!v) return false;
        p.__variantId = v.id;
        p.__price = price;
        p.__img = p.images?.edges?.[0]?.node?.url || '';
        return !!p.__img;
      });
    } catch (e) { pool = []; }
    return pool;
  }
  function choosePick(list, state, goal) {
    const inCart = new Set(state.lines.map((l) => l.merchandise?.product?.handle).filter(Boolean));
    let best = null;
    for (const p of list) {
      if (inCart.has(p.handle)) continue;
      let score = p.__rank;
      if (goal && p.__price >= goal.gap) score += 120 - Math.min(110, (p.__price - goal.gap) * 1.5);
      if (!best || score > best.score) best = { p, score };
    }
    return best && best.p;
  }

  /* ── 側欄 ── */
  let dialog = null, busy = false;
  function ensureDialog() {
    if (dialog) return dialog;
    injectCss();
    dialog = document.createElement('dialog');
    dialog.className = 'ocd';
    dialog.setAttribute('aria-labelledby', 'ocd-title');
    dialog.innerHTML = `<div class="ocd__top"><span class="ocd__eyebrow">YOUR BAG</span><button class="ocd__close" type="button" data-ocd-close aria-label="${esc(t('關閉購物袋', 'Close bag'))}">${icon.close}</button></div>
      <h2 class="ocd__title" id="ocd-title">${esc(t('購物袋', 'Your bag'))} <span data-ocd-count></span></h2>
      <div class="ocd__body" data-ocd-body></div><div class="ocd__foot" data-ocd-foot></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', onDialogClick);
    dialog.addEventListener('close', () => document.documentElement.style.removeProperty('overflow'));
    return dialog;
  }
  function offerMarkup(state) {
    const cat = `<img class="ocd-offer__cat" src="${MASCOT_DIR}01-welcome-320.webp" width="320" height="350" alt="" aria-hidden="true" decoding="async">`;
    const giftBadge = `<span class="ocd-offer__gift"><img src="${GIFT.image}" alt="" decoding="async"></span>`;
    const bar = (pct) => `<div class="ocd-offer__bar" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></span></div>`;
    const giftName = t('Round Lab 白樺樹保濕面霜', 'Round Lab Birch Moisturizing Cream');
    const done = `<span class="ocd-offer__label ocd-offer__label--done">${icon.check} ${esc(t(`已享即減 ${money(DISCOUNT.amount)}`, `${money(DISCOUNT.amount)} off applied`))}</span>`;
    if (state.subtotal < DISCOUNT.threshold) {
      const gap = DISCOUNT.threshold - state.subtotal;
      return `<section class="ocd-offer" data-tone="saving" aria-label="${esc(t('優惠進度', 'Offer progress'))}"><div class="ocd-offer__copy">
        <span class="ocd-offer__label">${esc(t(`商品小計滿 ${money(DISCOUNT.threshold)}`, `Spend ${money(DISCOUNT.threshold)}`))}</span>
        <p class="ocd-offer__benefit">${esc(t('即減', 'Save'))} <em>${money(DISCOUNT.amount)}</em></p>
        ${bar(state.subtotal / DISCOUNT.threshold * 100)}
        <p class="ocd-offer__status">${t(`再買 <strong>${money(gap)}</strong> 就有`, `Add <strong>${money(gap)}</strong> more`)}</p>
      </div>${cat}</section>`;
    }
    if (state.net < GIFT.threshold) {
      const gap = GIFT.threshold - state.net;
      return `<section class="ocd-offer" data-tone="gift" aria-label="${esc(t('優惠進度', 'Offer progress'))}">${giftBadge}<div class="ocd-offer__copy">
        ${done}<p class="ocd-offer__benefit">${esc(t('加碼送面霜', 'Free cream next'))}</p>
        ${bar(state.net / GIFT.threshold * 100)}
        <p class="ocd-offer__status">${t(`再買 <strong>${money(gap)}</strong>，送 ${esc(giftName)}`, `Add <strong>${money(gap)}</strong> for a free ${esc(giftName)}`)}</p>
      </div>${cat}</section>`;
    }
    return `<section class="ocd-offer" data-tone="reached" aria-label="${esc(t('優惠進度', 'Offer progress'))}">${giftBadge}<div class="ocd-offer__copy">
      ${done}<p class="ocd-offer__benefit">${esc(t('加碼送面霜', 'Free cream unlocked'))}</p>
      <p class="ocd-offer__status">${esc(t(`已達門檻，加送 ${giftName}（送完即止）`, `${giftName} is on us (while stocks last)`))}</p>
    </div>${cat}</section>`;
  }
  function pickMarkup(p, state) {
    if (!p) return '';
    let why = '';
    if (state.subtotal < DISCOUNT.threshold && p.__price >= DISCOUNT.threshold - state.subtotal) why = t(`加呢件，即減 ${money(DISCOUNT.amount)}`, `Add this to save ${money(DISCOUNT.amount)}`);
    else if (state.subtotal >= DISCOUNT.threshold && state.net < GIFT.threshold && p.__price >= GIFT.threshold - state.net) why = t('加呢件，就送面霜', 'Add this for the free cream');
    const href = `/products/${encodeURIComponent(p.handle)}`;
    return `<section class="ocd-pick" aria-labelledby="ocd-pick-title"><h3 id="ocd-pick-title">${esc(t('順手帶埋', 'Add a little extra'))}</h3>
      <article class="ocd-pick__item">
        <a class="ocd-pick__img" href="${href}"><img src="${esc(p.__img)}" alt="${esc(p.title)}" width="64" height="72" loading="lazy" decoding="async"></a>
        <div class="ocd-pick__copy"><span class="ocd-pick__vendor">${esc(p.vendor)}</span><a class="ocd-pick__name" href="${href}">${esc(p.title)}</a>${why ? `<span class="ocd-pick__why">${esc(why)}</span>` : ''}</div>
        <div class="ocd-pick__buy"><strong>${money(p.__price)}</strong><button type="button" data-ocd-addon="${esc(p.__variantId)}" aria-label="${esc(t(`加購 ${p.title}，${money(p.__price)}`, `Add ${p.title}, ${money(p.__price)}`))}">${icon.plus}<span>${esc(t('加購', 'Add'))}</span></button></div>
      </article></section>`;
  }
  function lineMarkup(l) {
    const m = l.merchandise || {};
    const prod = m.product || {};
    const variant = m.title && !/^default title$/i.test(m.title) ? m.title : '';
    const href = prod.handle ? `/products/${encodeURIComponent(prod.handle)}` : '/cart.html';
    const gift = isGiftLine(l);
    const img = m.image?.url ? `<img src="${esc(m.image.url)}" alt="${esc(m.image.altText || prod.title || '')}" loading="lazy" decoding="async">` : '';
    return `<article class="ocd-line" data-line="${esc(l.id)}">
      <a class="ocd-line__img" href="${href}">${img}</a>
      <div class="ocd-line__info"><a class="ocd-line__name" href="${href}">${esc(prod.title || '')}</a>${prod.vendor ? `<span class="ocd-line__vendor">${esc(prod.vendor)}</span>` : ''}
        ${variant ? `<span class="ocd-line__meta">${esc(variant)}</span>` : ''}
        ${gift ? `<span class="ocd-line__gift">${esc(t('贈品', 'Gift'))}</span>` : `<span class="ocd-line__meta">${esc(t('單價', 'Each'))} ${money(m.price?.amount)}</span>`}</div>
      ${gift ? '' : `<div class="ocd-line__controls"><div class="ocd-qty" role="group" aria-label="${esc(t('數量', 'Quantity'))}">
        <button type="button" data-ocd-qty="-1" aria-label="${esc(t('減少一件', 'Decrease'))}"${l.quantity <= 1 ? ' disabled' : ''}>${icon.minus}</button><output>${l.quantity}</output>
        <button type="button" data-ocd-qty="1" aria-label="${esc(t('增加一件', 'Increase'))}"${m.quantityAvailable != null && l.quantity >= m.quantityAvailable ? ' disabled' : ''}>${icon.plus}</button></div>
        <div class="ocd-line__end"><strong>${money(l.cost?.totalAmount?.amount)}</strong><button class="ocd-line__remove" type="button" data-ocd-remove>${esc(t('移除', 'Remove'))}</button></div></div>`}
    </article>`;
  }
  async function render() {
    const d = ensureDialog();
    const body = d.querySelector('[data-ocd-body]');
    const foot = d.querySelector('[data-ocd-foot]');
    let cart = null;
    try { cart = await window.getCart(); } catch (e) { cart = null; }
    const state = readCart(cart);
    d.querySelector('[data-ocd-count]').textContent = state.count ? t(`${state.count} 件`, `${state.count} items`) : '';
    if (!state.lines.length) {
      body.innerHTML = `<p class="ocd__state">${esc(t('購物袋仲係空嘅。揀好款式就可以加入。', 'Your bag is empty.'))}</p>`;
      foot.innerHTML = `<a class="ocd__cta" href="/shop.html">${esc(t('逛好物', 'Shop now'))} ${icon.arrow}</a><button class="ocd__continue" type="button" data-ocd-close>${esc(t('繼續選購', 'Keep shopping'))}</button>`;
      foot.classList.remove('ocd__foot--discount');
      return;
    }
    const goal = state.subtotal < DISCOUNT.threshold ? { gap: DISCOUNT.threshold - state.subtotal } : state.net < GIFT.threshold ? { gap: GIFT.threshold - state.net } : null;
    const pick = choosePick(await loadPool(), state, goal);
    body.innerHTML = `${state.lines.map(lineMarkup).join('')}<div class="ocd-nudge">${offerMarkup(state)}${pickMarkup(pick, state)}</div>`;
    body.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => {
      const pickItem = img.closest('.ocd-pick');
      if (pickItem) pickItem.remove(); else img.remove();
    }, { once: true }));
    const hasDiscount = state.discount > 0;
    foot.classList.toggle('ocd__foot--discount', hasDiscount);
    foot.innerHTML = `<div class="ocd__row"><span>${esc(t('商品小計', 'Subtotal'))}</span><strong>${money(state.subtotal)}</strong></div>
      ${hasDiscount ? `<div class="ocd__row ocd__row--minor"><span>${esc(t('已套用商品優惠', 'Discount applied'))}</span><strong>−${money(state.discount)}</strong></div><div class="ocd__row"><span>${esc(t('折後商品小計', 'After discount'))}</span><strong>${money(state.net)}</strong></div>` : ''}
      <p class="ocd__note">${esc(t('下一步揀配送或自提，再核對運費。', 'Choose delivery or pickup next; shipping is shown there.'))}</p>
      <a class="ocd__cta" href="/cart.html">${esc(t('揀配送及結帳', 'Delivery & checkout'))} ${icon.arrow}</a>
      <button class="ocd__continue" type="button" data-ocd-close>${esc(t('繼續選購', 'Keep shopping'))}</button>`;
  }
  async function openDrawer() {
    const d = ensureDialog();
    if (!d.open) {
      d.querySelector('[data-ocd-body]').innerHTML = `<p class="ocd__state">${esc(t('載入緊…', 'Loading…'))}</p>`;
      try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
      document.documentElement.style.overflow = 'hidden';
    }
    await render();
  }
  async function mutate(fn) {
    if (busy) return;
    busy = true;
    dialog.querySelector('[data-ocd-body]').setAttribute('aria-busy', 'true');
    try { if (typeof window.invalidateCheckout === 'function') window.invalidateCheckout(); await fn(); } catch (e) { console.warn('[cart-drawer]', e); }
    busy = false;
    dialog.querySelector('[data-ocd-body]').removeAttribute('aria-busy');
    await render();
  }
  function onDialogClick(e) {
    if (e.target === dialog) { dialog.close(); return; }
    if (e.target.closest('[data-ocd-close]')) { dialog.close(); return; }
    const qty = e.target.closest('[data-ocd-qty]');
    const remove = e.target.closest('[data-ocd-remove]');
    const addon = e.target.closest('[data-ocd-addon]');
    if (qty || remove) {
      const lineEl = e.target.closest('[data-line]');
      const id = lineEl && lineEl.dataset.line;
      const current = Number(lineEl?.querySelector('output')?.textContent || 0);
      if (!id) return;
      mutate(() => remove ? window.removeCartLine(id) : window.updateCartLine(id, Math.max(1, current + Number(qty.dataset.ocdQty))));
    } else if (addon) {
      addon.disabled = true;
      mutate(() => originalAdd(addon.dataset.ocdAddon, 1));
    }
  }

  /* ── 手機：芝麻貼圖 ── */
  let sesame = null, sesameTimer = 0;
  function showSesame(count) {
    injectCss();
    if (!sesame) {
      sesame = document.createElement('a');
      sesame.className = 'ocd-sesame';
      sesame.href = '/cart.html';
      sesame.setAttribute('role', 'status');
      document.body.appendChild(sesame);
    }
    const line = count > 1 ? t(`加咗 ${count} 件入購物袋啦～`, `${count} items added to your bag!`) : t('加咗入購物袋啦～', 'Added to your bag!');
    sesame.setAttribute('aria-label', t('已加入購物袋，查看購物袋', 'Added to bag, view bag'));
    sesame.innerHTML = `<span class="ocd-sesame__bubble">${esc(line)}<small>${esc(t('撳我睇吓', 'Tap to view'))}</small></span><img src="${MASCOT_DIR}06-shopping-sticker-280.webp" width="280" height="256" alt="" decoding="async">`;
    sesame.hidden = false;
    sesame.style.animation = 'none'; void sesame.offsetWidth; sesame.style.animation = '';
    clearTimeout(sesameTimer);
    sesameTimer = setTimeout(() => { sesame.hidden = true; }, 3000);
    const bag = document.querySelector('.mobile-bottom-nav__item[href$="cart.html"], .mobile-bottom-nav__item[href="/cart"]');
    if (bag && !REDUCED.matches) { bag.classList.remove('ocd-bump'); void bag.offsetWidth; bag.classList.add('ocd-bump'); }
  }

  /* ── 接駁 addToCart：成功先有回饋；配對工具一次加幾件會合埋一次講 ── */
  const originalAdd = window.addToCart;
  let pending = 0, pendingTimer = 0;
  window.addToCart = async function (variantId, quantity = 1, retried = false) {
    const result = await originalAdd.call(this, variantId, quantity, retried);
    if (result && !retried) {
      pending += Number(quantity) || 1;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        const count = pending; pending = 0;
        if (MOBILE.matches) showSesame(count); else openDrawer();
      }, 120);
    }
    return result;
  };
  window.OUJI_cartFeedback = { open: openDrawer };

  /* 電腦撳頁頭「購物袋」都開側欄；手機照舊去購物袋頁 */
  document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('.header__action-btn--cart');
    if (!link || MOBILE.matches || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openDrawer();
  });
})();
