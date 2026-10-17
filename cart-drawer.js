/* 購物袋側欄（電腦）＋芝麻加入提示（手機）—— 2026-10-15 Winston 要求上線。
   - 電腦：加入購物袋後由右邊彈出側欄；撳頁頭「購物袋」都係開側欄。
     側欄有：袋內貨品（可加減／移除）、下一個優惠進度、一件加購、商品小計，
     「揀配送及結帳」先去 cart.html 揀運送同付款。
   - 手機：唔開側欄，改為芝麻貼圖喺右下角彈出講「加咗入購物袋啦～」，3 秒消失；
     底部導航購物袋 icon 彈一下。
   - 數全部來自 Shopify 真購物車（getCart），唔自己估價。
   - 「滿 $399 減 $20」係 Shopify 自動折扣「滿 $399 減 $20（購物禮遇）」，
     2026-10-15 用 Storefront 真購物車核實：$343 冇減、$441 減 $20。門檻讀 shopify.js
     OUJI_COMMERCE.spendSave（購物袋頁都用同一份），下面嘅數只係舊快取冇嗰欄時嘅後備。
   - 加購揀貨跟 cart.html 同一套規則（ADDON_TYPE、$10–169、有現貨）。
   由 shopify.js 尾動態載入；cart.html 本身唔載。 */
(function () {
  'use strict';
  if (window.OUJI_cartFeedback || typeof window.addToCart !== 'function') return;

  const DISCOUNT = (window.OUJI_COMMERCE && window.OUJI_COMMERCE.spendSave) || { threshold: 399, amount: 20 };
  const GIFT = {
    threshold: (window.OUJI_COMMERCE && window.OUJI_COMMERCE.promotion && window.OUJI_COMMERCE.promotion.gift && window.OUJI_COMMERCE.promotion.gift.threshold) || 599,
    image: '/assets/images/cart/gift-cream-192.webp',
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
    tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.5 3.5 7.5-8"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/></svg>',
  };

  /* 2026-10-17 跟返新購物袋頁（cart.html「Cart（購物袋）」一段）：冷調灰白底、淺藍湊單卡、
     錢同連結青藍、唯一實色掣用藍 #5289A2；唔再用奶油底、紅字同襯線字。 */
  const CSS = `
.ocd { --ocd-ground:#f7fafc; --ocd-surface:#fff; --ocd-ink:#2e3a40; --ocd-muted:#5a6a70; --ocd-line:#e3eaed; --ocd-control:#d6e0e4; --ocd-teal:#36728a; --ocd-teal-ink:#2b6977; --ocd-brand:#5289a2; --ocd-brand-hover:#477c94; --ocd-tint:#ecf3f6; --ocd-tint-line:#b9cfd7; --ocd-track:#d2e3e9; --ocd-shadow:0 1px 2px rgb(46 58 64 / .04), 0 6px 18px rgb(46 58 64 / .05); --ocd-sans:"Manrope","PingFang TC", "Microsoft JhengHei",-apple-system,BlinkMacSystemFont,sans-serif; }
dialog.ocd { position:fixed; inset:0 0 0 auto; width:min(430px, calc(100vw - 18px)); max-width:none; height:100dvh; max-height:100dvh; margin:0; padding:20px 24px 0; border:0; border-left:1px solid var(--ocd-line); background:var(--ocd-ground); color:var(--ocd-ink); font-family:var(--ocd-sans); box-shadow:-18px 0 48px rgba(30,48,56,.12); overflow:hidden; }
dialog.ocd[open] { display:flex; flex-direction:column; animation:ocd-in .42s cubic-bezier(.16,1,.3,1); }
dialog.ocd::backdrop { background:rgba(30,48,56,.32); backdrop-filter:blur(3px); }
@keyframes ocd-in { from { transform:translateX(36px); opacity:0; } to { transform:none; opacity:1; } }
.ocd svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.ocd__top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.ocd__title { margin:0; color:var(--ocd-ink); font:700 22px/1.3 var(--ocd-sans); letter-spacing:.02em; }
.ocd__title span { margin-left:6px; color:var(--ocd-muted); font-size:13px; font-weight:400; letter-spacing:0; }
.ocd__close { display:grid; place-items:center; width:40px; height:40px; border:1px solid var(--ocd-line); border-radius:50%; background:var(--ocd-surface); color:var(--ocd-ink); cursor:pointer; }
.ocd__body { flex:1 1 auto; min-height:0; margin-top:12px; padding-bottom:16px; overflow-y:auto; overscroll-behavior:contain; }
.ocd__state { padding:40px 0; color:var(--ocd-muted); font-size:13px; text-align:center; }
.ocd-line { position:relative; display:grid; grid-template-columns:76px minmax(0,1fr); gap:12px; padding:14px 0; }
.ocd-line + .ocd-line { border-top:1px solid var(--ocd-line); }
.ocd-line__img { display:block; width:76px; height:76px; overflow:hidden; border-radius:8px; background:var(--ocd-surface); }
.ocd-line__img img { width:100%; height:100%; object-fit:contain; }
.ocd-line__info { display:flex; flex-direction:column; gap:3px; min-width:0; }
.ocd-line__name { display:-webkit-box; overflow:hidden; padding-right:30px; color:var(--ocd-ink); font-size:14px; line-height:1.38; text-decoration:none; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.ocd-line__meta { color:var(--ocd-muted); font-size:12.5px; line-height:1.4; }
.ocd-line__gift { align-self:flex-start; padding:2px 8px; border-radius:999px; background:var(--ocd-tint); color:var(--ocd-teal); font-size:11px; font-weight:700; }
.ocd-line__foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; padding-top:4px; }
.ocd-line__price { color:var(--ocd-teal); font-size:18px; font-weight:600; font-variant-numeric:lining-nums tabular-nums; }
.ocd-qty { display:flex; align-items:center; height:36px; border:1px solid var(--ocd-control); border-radius:8px; background:var(--ocd-surface); }
.ocd-qty button { display:grid; place-items:center; width:38px; height:34px; padding:0; border:0; background:none; color:var(--ocd-ink); cursor:pointer; }
.ocd-qty button svg { width:16px; height:16px; }
.ocd-qty button:disabled { color:#b4c2c7; cursor:default; }
.ocd-qty output { min-width:22px; text-align:center; font-size:14px; font-weight:600; font-variant-numeric:tabular-nums; }
.ocd-line__remove { position:absolute; top:10px; right:-8px; display:grid; place-items:center; width:38px; height:38px; padding:0; border:0; border-radius:50%; background:transparent; color:#74858b; cursor:pointer; }
.ocd-nudge { display:grid; gap:16px; margin-top:16px; }
.ocd-offer { position:relative; overflow:hidden; padding:14px 16px 12px; border-radius:12px; background:var(--ocd-tint); }
.ocd-offer__title { display:flex; flex-wrap:wrap; align-content:center; align-items:baseline; gap:0 6px; min-height:56px; margin:0; padding-right:100px; color:var(--ocd-teal); font-size:16px; font-weight:700; line-height:1.35; }
.ocd-offer__title strong { font-size:22px; letter-spacing:-.01em; font-variant-numeric:lining-nums tabular-nums; }
.ocd-offer[data-tone="reached"] .ocd-offer__title { align-items:center; font-size:15px; }
.ocd-offer[data-tone="reached"] .ocd-offer__title svg { flex:0 0 18px; stroke-width:2.4; }
.ocd-offer__art { position:absolute; top:6px; right:10px; width:100px; height:64px; pointer-events:none; }
.ocd-offer__badge { position:absolute; left:0; top:9px; display:grid; place-items:center; width:50px; height:50px; overflow:hidden; border:3px solid #fff; border-radius:50%; background:#fff; box-shadow:0 4px 12px rgb(46 58 64 / .1); color:var(--ocd-teal); transform:rotate(-6deg); }
.ocd-offer__badge img { width:100%; height:100%; object-fit:cover; }
.ocd-offer__coupon { display:grid; justify-items:center; font-size:10px; font-weight:700; line-height:1.1; }
.ocd-offer__coupon strong { font-size:15px; letter-spacing:-.01em; }
.ocd-offer__cat { position:absolute; right:0; bottom:-2px; width:62px; height:auto; filter:drop-shadow(0 3px 6px rgb(46 58 64 / .12)); }
.ocd-offer__meter { display:flex; align-items:center; gap:12px; margin-top:8px; }
.ocd-offer__bar { flex:1; height:7px; overflow:hidden; border-radius:999px; background:var(--ocd-track); }
.ocd-offer__bar span { display:block; height:100%; border-radius:inherit; background:var(--ocd-brand); transition:width .6s cubic-bezier(.16,1,.3,1); }
.ocd-offer__count { flex:0 0 auto; color:var(--ocd-muted); font-size:12.5px; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ocd-offer__sub { margin:6px 0 0; color:var(--ocd-muted); font-size:12px; line-height:1.5; }
.ocd-offer__perks { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 0; padding:0; list-style:none; }
.ocd-offer__perks li { display:inline-flex; align-items:center; gap:5px; height:26px; padding:0 10px 0 4px; border:1px dashed var(--ocd-tint-line); border-radius:999px; color:var(--ocd-muted); font-size:12px; font-weight:600; white-space:nowrap; }
.ocd-offer__perks i { display:grid; place-items:center; width:18px; height:18px; border:1.5px solid var(--ocd-tint-line); border-radius:50%; }
.ocd-offer__perks i svg { width:12px; height:12px; stroke-width:3; }
.ocd-offer__perks li.is-won { border:0; background:#fff; color:var(--ocd-teal); box-shadow:0 1px 2px rgb(46 58 64 / .06); }
.ocd-offer__perks li.is-won i { border:0; background:var(--ocd-teal); color:#fff; }
.ocd-offer__perks li.is-next { border-color:var(--ocd-teal); color:var(--ocd-teal-ink); }
.ocd-offer__perks li.is-next i { border-color:var(--ocd-teal); }
.ocd-pick h3 { margin:0 0 8px; color:var(--ocd-teal); font:700 15px/1.3 var(--ocd-sans); }
.ocd-pick__item { display:grid; grid-template-columns:64px minmax(0,1fr) auto; align-items:center; gap:12px; padding:10px 12px 10px 10px; border-radius:10px; background:var(--ocd-surface); box-shadow:var(--ocd-shadow); }
.ocd-pick__img { display:block; width:64px; height:64px; overflow:hidden; border-radius:6px; background:var(--ocd-surface); }
.ocd-pick__img img { width:100%; height:100%; object-fit:contain; }
.ocd-pick__copy { display:grid; gap:2px; min-width:0; }
.ocd-pick__vendor { overflow:hidden; color:#3d4a50; font-size:10.5px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; white-space:nowrap; text-overflow:ellipsis; }
.ocd-pick__name { display:-webkit-box; overflow:hidden; color:var(--ocd-muted); font-size:12.5px; line-height:1.4; text-decoration:none; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.ocd-pick__why { margin-top:2px; color:var(--ocd-teal); font-size:11px; font-weight:700; line-height:1.4; }
.ocd-pick__buy { display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
.ocd-pick__buy strong { color:var(--ocd-teal); font-size:14px; font-weight:600; font-variant-numeric:lining-nums tabular-nums; }
.ocd-pick__buy button { position:relative; display:grid; place-items:center; width:32px; height:32px; padding:0; border:0; border-radius:50%; background:var(--ocd-brand); color:#fff; cursor:pointer; }
.ocd-pick__buy button::after { content:""; position:absolute; inset:-6px; }
.ocd-pick__buy button svg { width:16px; height:16px; stroke-width:2.4; }
.ocd-pick__buy button:disabled { opacity:.5; cursor:default; }
.ocd__foot { flex:0 0 auto; padding:14px 0 max(16px, env(safe-area-inset-bottom)); border-top:1px solid var(--ocd-line); background:var(--ocd-ground); }
.ocd__row { display:flex; align-items:baseline; justify-content:space-between; gap:12px; color:var(--ocd-muted); font-size:13.5px; font-variant-numeric:tabular-nums; }
.ocd__row strong { color:var(--ocd-ink); font-size:14px; font-weight:600; }
.ocd__row--minor { margin-top:6px; }
.ocd__row--minor strong { color:var(--ocd-teal); }
.ocd__total { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; padding:12px 16px; border-radius:10px; background:var(--ocd-teal); color:#fff; }
.ocd__total span { font-size:14px; font-weight:700; }
.ocd__total strong { font-size:26px; font-weight:700; letter-spacing:-.01em; font-variant-numeric:lining-nums tabular-nums; }
.ocd__note { margin:10px 0 12px; color:var(--ocd-muted); font-size:12px; line-height:1.6; }
.ocd__cta { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; min-height:52px; border-radius:999px; background:var(--ocd-brand); color:#fff; font:700 18px var(--ocd-sans); letter-spacing:.04em; text-decoration:none; }
.ocd__cta svg { width:20px; height:20px; stroke-width:2.2; }
.ocd__continue { display:block; width:100%; min-height:44px; margin-top:6px; border:0; background:none; color:var(--ocd-muted); font:13px var(--ocd-sans); cursor:pointer; }
.ocd :is(button, a):focus-visible { outline:2px solid var(--ocd-teal); outline-offset:3px; }
@media (hover:hover) { .ocd__cta:hover { background:var(--ocd-brand-hover); } .ocd-pick__buy button:hover:not(:disabled) { background:var(--ocd-teal); } .ocd-line__remove:hover { background:var(--ocd-tint); color:var(--ocd-ink); } .ocd-pick__name:hover, .ocd-line__name:hover { text-decoration:underline; text-underline-offset:3px; } }
.ocd-sesame { position:fixed; z-index:2001; right:8px; bottom:calc(56px + var(--tabbar-gap, 16px) + 12px); display:flex; align-items:flex-end; color:#2b4c58; text-decoration:none; transform-origin:78% 100%; animation:ocd-pop .56s cubic-bezier(.34,1.56,.64,1) both; }
.ocd-sesame[hidden] { display:none; }
.ocd-sesame img { display:block; width:118px; height:auto; }
.ocd-sesame__bubble { position:relative; z-index:1; margin:0 -18px 62px 0; padding:10px 15px 11px; border-radius:18px 18px 4px 18px; background:#fff; box-shadow:0 6px 18px rgba(43,76,88,.16); font:600 14px/1.35 "Manrope","PingFang TC", "Microsoft JhengHei",sans-serif; white-space:nowrap; animation:ocd-bubble .38s .18s cubic-bezier(.16,1,.3,1) both; }
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
    dialog.innerHTML = `<div class="ocd__top"><h2 class="ocd__title" id="ocd-title">${esc(t('購物袋', 'Your bag'))}<span data-ocd-count></span></h2><button class="ocd__close" type="button" data-ocd-close aria-label="${esc(t('關閉購物袋', 'Close bag'))}">${icon.close}</button></div>
      <div class="ocd__body" data-ocd-body></div><div class="ocd__foot" data-ocd-foot></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', onDialogClick);
    dialog.addEventListener('close', () => document.documentElement.style.removeProperty('overflow'));
    return dialog;
  }
  /* 湊單卡跟購物袋頁一樣：再買幾多、進度、規則一行、卡底剔號（攞到打剔、下一個青藍框）。
     側欄未揀配送方式，所以只計「滿 $399 減 $20」同「折實滿 $599 送面霜」。 */
  function offerMarkup(state) {
    const giftIn = state.lines.some(isGiftLine);
    const saved = state.subtotal >= DISCOUNT.threshold;
    const gifted = giftIn || state.net >= GIFT.threshold;
    const tone = !saved ? 'saving' : !gifted ? 'gift' : 'reached';
    const badge = tone === 'saving'
      ? `<span class="ocd-offer__coupon">${t(`減<strong>$${DISCOUNT.amount}</strong>`, `<strong>$${DISCOUNT.amount}</strong>off`)}</span>`
      : `<img src="${GIFT.image}" alt="" decoding="async">`;
    const art = `<span class="ocd-offer__art" aria-hidden="true"><span class="ocd-offer__badge">${badge}</span><img class="ocd-offer__cat" src="${MASCOT_DIR}06-shopping-sticker-280.webp" width="280" height="256" alt="" decoding="async"></span>`;
    const perk = (won, next, zh, en) => `<li class="${won ? 'is-won' : next ? 'is-next' : ''}"><i aria-hidden="true">${won ? icon.tick : ''}</i>${esc(t(zh, en))}</li>`;
    const perks = `<ul class="ocd-offer__perks" aria-label="${esc(t('優惠達成情況', 'Rewards so far'))}">${perk(saved, tone === 'saving', `減 $${DISCOUNT.amount}`, `$${DISCOUNT.amount} off`)}${perk(gifted, tone === 'gift', '送面霜', 'Free cream')}</ul>`;
    if (tone === 'reached') {
      return `<section class="ocd-offer" data-tone="reached" aria-label="${esc(t('優惠進度', 'Offer progress'))}">${art}
        <p class="ocd-offer__title">${icon.check}<span>${esc(t('即減、送面霜都有齊', 'HK$20 off and the free cream — all yours'))}</span></p>
        <p class="ocd-offer__sub">${esc(t('Round Lab 白樺樹保濕面霜送完即止。', 'Round Lab birch cream, while stocks last.'))}</p>${perks}</section>`;
    }
    const now = tone === 'saving' ? state.subtotal : state.net;
    const target = tone === 'saving' ? DISCOUNT.threshold : GIFT.threshold;
    const gap = Math.max(0, target - now);
    const pct = Math.max(0, Math.min(100, now / target * 100));
    const title = tone === 'saving'
      ? t(`再買 <strong>${money(gap)}</strong> 即減 ${money(DISCOUNT.amount)}`, `Add <strong>${money(gap)}</strong> more to save ${money(DISCOUNT.amount)}`)
      : t(`再買 <strong>${money(gap)}</strong> 送面霜`, `Add <strong>${money(gap)}</strong> more for a free cream`);
    const sub = tone === 'saving'
      ? t(`商品小計滿 ${money(DISCOUNT.threshold)} 即減`, `${money(DISCOUNT.amount)} off goods over ${money(DISCOUNT.threshold)}`)
      : t(`折後滿 ${money(GIFT.threshold)} 送面霜`, `Free cream over ${money(GIFT.threshold)} after discounts`);
    return `<section class="ocd-offer" data-tone="${tone}" aria-label="${esc(t('優惠進度', 'Offer progress'))}">${art}
      <p class="ocd-offer__title">${title}</p>
      <div class="ocd-offer__meter"><div class="ocd-offer__bar" aria-hidden="true"><span style="width:${pct.toFixed(1)}%"></span></div><span class="ocd-offer__count">${money(now)} / ${money(target)}</span></div>
      <p class="ocd-offer__sub">${esc(sub)}</p>${perks}</section>`;
  }
  function pickMarkup(p, state) {
    if (!p) return '';
    let why = '';
    if (state.subtotal < DISCOUNT.threshold && p.__price >= DISCOUNT.threshold - state.subtotal) why = t(`加呢件，即減 ${money(DISCOUNT.amount)}`, `Add this to save ${money(DISCOUNT.amount)}`);
    else if (state.subtotal >= DISCOUNT.threshold && state.net < GIFT.threshold && p.__price >= GIFT.threshold - state.net) why = t('加呢件，就送面霜', 'Add this for the free cream');
    const href = `/products/${encodeURIComponent(p.handle)}`;
    return `<section class="ocd-pick" aria-labelledby="ocd-pick-title"><h3 id="ocd-pick-title">${esc(t('順手帶埋', 'Add a little extra'))}</h3>
      <article class="ocd-pick__item">
        <a class="ocd-pick__img" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(p.__img)}" alt="" width="64" height="64" loading="lazy" decoding="async"></a>
        <div class="ocd-pick__copy"><span class="ocd-pick__vendor">${esc(p.vendor)}</span><a class="ocd-pick__name" href="${href}">${esc(p.title)}</a>${why ? `<span class="ocd-pick__why">${esc(why)}</span>` : ''}</div>
        <div class="ocd-pick__buy"><strong>${money(p.__price)}</strong><button type="button" data-ocd-addon="${esc(p.__variantId)}" aria-label="${esc(t(`加購 ${p.title}，${money(p.__price)}`, `Add ${p.title}, ${money(p.__price)}`))}">${icon.plus}</button></div>
      </article></section>`;
  }
  function lineMarkup(l) {
    const m = l.merchandise || {};
    const prod = m.product || {};
    const variant = m.title && !/^default title$/i.test(m.title) && m.title !== '單一規格' ? m.title : '';
    const href = prod.handle ? `/products/${encodeURIComponent(prod.handle)}` : '/cart.html';
    const gift = isGiftLine(l);
    const img = m.image?.url ? `<img src="${esc(m.image.url)}" alt="" loading="lazy" decoding="async">` : '';
    const meta = [variant, !gift && l.quantity > 1 ? t(`每件 ${money(m.price?.amount)}`, `${money(m.price?.amount)} each`) : ''].filter(Boolean).join(' · ');
    return `<article class="ocd-line" data-line="${esc(l.id)}">
      <a class="ocd-line__img" href="${href}" tabindex="-1" aria-hidden="true">${img}</a>
      <div class="ocd-line__info"><a class="ocd-line__name" href="${href}">${esc(prod.title || '')}</a>
        ${meta ? `<span class="ocd-line__meta">${esc(meta)}</span>` : ''}
        ${gift ? `<span class="ocd-line__gift">${esc(t('贈品', 'Gift'))}</span>` : ''}
        <div class="ocd-line__foot"><strong class="ocd-line__price">${money(l.cost?.totalAmount?.amount)}</strong>${gift ? '' : `<div class="ocd-qty" role="group" aria-label="${esc(t('數量', 'Quantity'))}">
          <button type="button" data-ocd-qty="-1" aria-label="${esc(t('減少一件', 'Decrease'))}"${l.quantity <= 1 ? ' disabled' : ''}>${icon.minus}</button><output>${l.quantity}</output>
          <button type="button" data-ocd-qty="1" aria-label="${esc(t('增加一件', 'Increase'))}"${m.quantityAvailable != null && l.quantity >= m.quantityAvailable ? ' disabled' : ''}>${icon.plus}</button></div>`}</div></div>
      ${gift ? '' : `<button class="ocd-line__remove" type="button" data-ocd-remove aria-label="${esc(t(`移除 ${prod.title || ''}`, `Remove ${prod.title || ''}`))}">${icon.trash}</button>`}
    </article>`;
  }
  async function render() {
    const d = ensureDialog();
    const body = d.querySelector('[data-ocd-body]');
    const foot = d.querySelector('[data-ocd-foot]');
    let cart = null;
    try { cart = await window.getCart(); } catch (e) { cart = null; }
    const state = readCart(cart);
    d.querySelector('[data-ocd-count]').textContent = state.count ? t(`${state.count}件`, `${state.count} items`) : '';
    if (!state.lines.length) {
      body.innerHTML = `<p class="ocd__state">${esc(t('購物袋仲係空嘅。揀好款式就可以加入。', 'Your bag is empty.'))}</p>`;
      foot.innerHTML = `<a class="ocd__cta" href="/shop.html">${esc(t('逛好物', 'Shop now'))} ${icon.arrow}</a><button class="ocd__continue" type="button" data-ocd-close>${esc(t('繼續選購', 'Keep shopping'))}</button>`;
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
    foot.innerHTML = `<div class="ocd__row"><span>${esc(t('商品小計', 'Subtotal'))}</span><strong>${money(state.subtotal)}</strong></div>
      ${hasDiscount ? `<div class="ocd__row ocd__row--minor"><span>${esc(t('已套用商品優惠', 'Discount applied'))}</span><strong>−${money(state.discount)}</strong></div>` : ''}
      <div class="ocd__total"><span>${esc(hasDiscount ? t('折後商品小計', 'After discount') : t('商品小計', 'Subtotal'))}</span><strong>${money(state.net)}</strong></div>
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
