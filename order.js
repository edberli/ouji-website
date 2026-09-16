/* 「顯示您的訂單」—— /order

   點解有呢版：Shopify 訂單電郵嗰粒掣本來指去 Shopify 自己個訂單狀態頁，
   客人一撳就離開咗我哋個站（網址、字體、按鈕都唔同），成件事斷開兩截。
   而家封信可以改為指過嚟呢度，由 OUJI 自己畫返張單。

   唔使登入：條 link 由 Shopify 自己條訂單狀態 URL 拆出嚟嘅憑證（t／u），
   交畀 /api/order 同 Shopify 存嗰條對；對唔上就當冇呢張單，
   所以亂打訂單號碼係睇唔到任何嘢。

   語言：介面字行 data/ui-en.json 字典（shopify.js 嘅翻譯層），
   產品名喺英文模式會用 data/catalog-en.json 嘅 Shopify 原生翻譯。 */
(function () {
  'use strict';

  const root = document.getElementById('order-root');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const SECRET_KEYS = ['t', 'k', 'key', 'token', 'u', 'url'];
  const orderParam = (params.get('o') || params.get('order') || '').trim();

  const WHATSAPP = 'https://wa.me/85290195092';
  const CONTACT_PAGE = 'contact.html';
  const SHOP_PAGE = 'shop.html';
  const ACCOUNT_PAGE = 'account.html';

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);

  const lang = () => (typeof getLang === 'function' ? getLang() : 'zh');
  const t = (zh, en) => (lang() === 'en' ? en : zh);

  /* 訂單頁自己嘅英文字典。
     點解唔放入 data/ui-en.json：嗰個檔有其他 session 未 commit 嘅改動，
     呢頁嘅字自己跟身，就唔會同人撞，亦唔會因為字典滯後而漏譯。 */
  const EN = {
    '正在載入訂單…': 'Loading your order…',
    '開啟唔到呢張訂單': "We can't open this order",
    '呢版要用訂單電郵入面「顯示您的訂單」嗰條連結打開。':
      'This page opens from the “View your order” link in your order email.',
    '如果你係自己打網址入嚟，可以返去封信再撳一次；或者登入會員中心睇返全部訂單。':
      'If you typed the address yourself, go back to that email and tap the link again — or sign in to see all your orders.',
    '登入會員中心': 'Sign in to your account',
    '搵唔到呢張訂單': "We couldn't find this order",
    '條連結可能唔完整、複製嗰陣斷咗，或者呢張單已經好舊。':
      'The link may be incomplete, broken when copied, or this order may be older than the page keeps.',
    '試下返去嗰封訂單電郵，再撳一次「顯示您的訂單」。':
      'Go back to your order email and tap “View your order” again.',
    '暫時載入唔到': "Can't load right now",
    '可能係網絡問題，請再試一次。': 'This may be a network problem — please try again.',
    '重試': 'Retry',
    'WhatsApp 我哋': 'WhatsApp us',
    '商品': 'Items',
    '商品小計': 'Subtotal',
    '稅項': 'Tax',
    '已退款': 'Refunded',
    '訂單總額': 'Order total',
    '送貨資料': 'Delivery details',
    '收貨地址': 'Delivery address',
    '物流追蹤': 'Tracking',
    '寄出後物流公司需要一至兩日先更新到進度。':
      'Carriers usually take a day or two to update tracking after dispatch.',
    '訂單有問題、想改地址、或者想查物流，可以直接搵我哋，記得講返訂單號碼。':
      "If something's wrong with your order, you want to change the address, or you're checking on delivery, message us and quote your order number.",
    '繼續購物': 'Continue shopping',
    '想睇返所有訂單同會員優惠？': 'Want to see all your orders and member offers?',
    '商品明細暫時未能載入。': "Item details aren't available right now.",
    '查看物流進度': 'Track this parcel',
    '已取消': 'Cancelled',
    '已付款': 'Paid',
    '待付款': 'Payment pending',
    '已授權': 'Authorised',
    '部分付款': 'Partially paid',
    '部分退款': 'Partially refunded',
    '已逾期': 'Expired',
    '已寄出': 'Shipped',
    '待寄出': 'Not shipped yet',
    '部分寄出': 'Partially shipped',
    '備貨中': 'Preparing',
    '處理中': 'Processing',
    '暫緩': 'On hold',
    '已排期': 'Scheduled',
    '已退回': 'Restocked',
    '運送方式': 'Shipping method',
    '取件點': 'Pickup point',
    '需要幫手？': 'Need help?',
  };

  /* 只換完全匹配嘅 text node —— 同全站翻譯層同一個規矩，
     唔會喺「Anua 魚腥草潔面泡沫」中間亂咁換字。 */
  function translateLocal(scope) {
    if (lang() !== 'en' || !scope) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const jobs = [];
    let node = walker.nextNode();
    while (node) {
      const key = (node.nodeValue || '').trim();
      if (key && EN[key]) jobs.push([node, EN[key]]);
      node = walker.nextNode();
    }
    jobs.forEach(([textNode, value]) => { textNode.nodeValue = value; });
  }

  function paint(html) {
    root.innerHTML = html;
    translateLocal(root);
  }

  const fmtMoney = (money) => {
    if (!money || money.amount == null) return '';
    if (typeof formatPrice === 'function') return formatPrice(money.amount, money.currency || 'HKD');
    return 'HK$' + Number(money.amount).toLocaleString('en-US');
  };

  const fmtDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(lang() === 'en' ? 'en-HK' : 'zh-HK', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const FINANCIAL_LABELS = {
    PAID: '已付款', PENDING: '待付款', AUTHORIZED: '已授權', PARTIALLY_PAID: '部分付款',
    REFUNDED: '已退款', PARTIALLY_REFUNDED: '部分退款', VOIDED: '已取消', EXPIRED: '已逾期',
  };
  const FULFILLMENT_LABELS = {
    FULFILLED: '已寄出', UNFULFILLED: '待寄出', PARTIALLY_FULFILLED: '部分寄出',
    PENDING_FULFILLMENT: '備貨中', OPEN: '處理中', IN_PROGRESS: '處理中',
    ON_HOLD: '暫緩', SCHEDULED: '已排期', RESTOCKED: '已退回',
  };

  /* ---------- 小工具 ---------- */

  function stateBlock(title, body, actions) {
    return `<div class="order-state">
      <h1>${esc(title)}</h1>
      ${(body || []).map((line) => `<p>${esc(line)}</p>`).join('')}
      ${actions && actions.length ? `<div class="order-state__actions">${actions.join('')}</div>` : ''}
    </div>`;
  }

  function button(href, label, kind, external) {
    return `<a class="btn ${kind}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`;
  }

  function chip(label, kind) {
    return '<span class="order-chip' + (kind ? ' order-chip--' + kind : '') + '">' + esc(label) + '</span>';
  }

  function chipKind(status) {
    if (status === 'FULFILLED' || status === 'PAID') return 'done';
    if (status === 'REFUNDED' || status === 'VOIDED' || status === 'EXPIRED' || status === 'RESTOCKED') return 'warn';
    return '';
  }

  function apiUrl() {
    const query = new URLSearchParams();
    query.set('o', orderParam);
    SECRET_KEYS.forEach((name) => {
      const value = params.get(name);
      if (value) query.set(name, value);
    });
    return '/api/order?' + query.toString();
  }

  /* ---------- 商品名（英文模式用 Shopify 原生翻譯） ---------- */

  let catalogEn = null;

  async function englishTitles() {
    if (lang() !== 'en') return null;
    if (catalogEn) return catalogEn;
    try {
      const response = await fetch('data/catalog-en.json');
      if (!response.ok) return null;
      const data = await response.json();
      const map = new Map();
      (data && data.v ? data.v : []).forEach((entry) => {
        const node = entry && entry.node;
        if (node && node.handle && node.title) map.set(node.handle, node.title);
      });
      catalogEn = map;
      return map;
    } catch (error) {
      return null;
    }
  }

  function itemName(item, titles) {
    let title = String(item.title || '商品');
    /* Shopify 嘅 lineItem name 係「產品名 - 色號」；色號另外有一行，
       所以喺尾度切走，唔好顯示兩次。 */
    if (item.variant && title.endsWith(' - ' + item.variant)) {
      title = title.slice(0, title.length - (' - ' + item.variant).length);
    }
    if (titles && item.handle && titles.get(item.handle)) {
      title = titles.get(item.handle);
      /* Shopify 原生英文名有時已經包含咗色號（例如 "… Sunscreen 40ML"），
         唔想顯示成 "…40ML - 40ML"。 */
      if (item.variant && !title.toLowerCase().includes(String(item.variant).toLowerCase())) {
        title += ' - ' + item.variant;
      }
    }
    return title;
  }

  /* ---------- 各區塊 ---------- */

  function renderItems(order, titles) {
    if (!order.items.length) {
      return '<p class="account-order__empty">商品明細暫時未能載入。</p>';
    }
    const rows = order.items.map((item) => {
      const title = itemName(item, titles);
      const image = item.image
        ? `<img src="${esc(item.image)}" alt="${esc(title)}" loading="lazy" decoding="async">`
        : '<span aria-hidden="true">OUJI</span>';
      const variant = item.variant
        ? `<span class="account-order-item__variant">${esc(item.variant)}</span>`
        : '';
      return `<div class="account-order-item">
        <div class="account-order-item__image">${image}</div>
        <div class="account-order-item__info">
          <span class="account-order-item__name">${esc(title)}</span>
          ${variant}
          <span class="account-order-item__quantity">數量 <span class="order-num">${item.quantity}</span></span>
        </div>
        <span class="account-order-item__price">${esc(fmtMoney(item.lineTotal || item.unitPrice))}</span>
      </div>`;
    }).join('');
    return `<div class="account-order__items">${rows}</div>`;
  }

  function moneyRow(label, money, className, negative) {
    if (!money || money.amount == null) return '';
    /* 折扣／退款顯示成 -HK$36（唔用 formatPrice 嘅 HK$-36） */
    const value = negative ? '-' + fmtMoney({ amount: Math.abs(money.amount), currency: money.currency }) : fmtMoney(money);
    return `<div class="account-order-total ${className || ''}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function renderTotals(order) {
    const totals = order.totals || {};
    const discount = totals.discount && totals.discount.amount > 0 ? totals.discount : null;
    const refunded = totals.refunded && totals.refunded.amount > 0 ? totals.refunded : null;
    const tax = totals.tax && totals.tax.amount > 0 ? totals.tax : null;
    return `<div class="account-order__totals">
      ${moneyRow('商品小計', totals.subtotal)}
      ${moneyRow('運費', totals.shipping)}
      ${tax ? moneyRow('稅項', tax) : ''}
      ${discount ? moneyRow('折扣', discount, '', true) : ''}
      ${refunded ? moneyRow('已退款', refunded, 'account-order-total--refund', true) : ''}
      ${moneyRow('訂單總額', totals.total, 'account-order-total--grand')}
    </div>`;
  }

  function attributeMap(order) {
    const map = new Map();
    (order.attributes || []).forEach((entry) => {
      if (entry && entry.key && entry.value) map.set(entry.key, entry.value);
    });
    return map;
  }

  function renderTracking(order) {
    if (!order.tracking.length) return '';
    const rows = order.tracking.map((entry) => {
      /* Shopify 嘅 tracking company 有時淨係寫住「Other」（我哋出貨嗰陣
         淨係入單號），唔想客人見到「Other」就唔顯示。 */
      const company = entry.company && entry.company !== 'Other' ? entry.company : '';
      const label = [company, entry.number].filter(Boolean).join(' · ') || '查看物流進度';
      if (entry.url) {
        return `<a class="account-order__tracking" href="${esc(entry.url)}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`;
      }
      return `<p class="account-order__tracking">${esc(label)}</p>`;
    }).join('');
    return `<section class="account-order__detail-block account-order__detail-block--wide">
      <h3>物流追蹤</h3>${rows}
      <p class="order-tracking-hint">寄出後物流公司需要一至兩日先更新到進度。</p>
    </section>`;
  }

  function renderDelivery(order) {
    const attrs = attributeMap(order);
    const method = attrs.get('運送方式') || String(order.shippingMethod || '').split('｜')[0].trim();
    const pickup = attrs.get('取件點') || '';
    const pickupAddress = attrs.get('取件點地址') || '';
    const blocks = [];

    if (method) {
      blocks.push(`<section class="account-order__detail-block"><h3>運送方式</h3>
        <address>${esc(method)}</address>
      </section>`);
    }

    if (pickup || pickupAddress) {
      blocks.push(`<section class="account-order__detail-block"><h3>取件點</h3><address>
        ${pickup ? esc(pickup) + '<br>' : ''}${esc(pickupAddress)}
      </address></section>`);
    }

    if (order.address) {
      const lines = [
        order.address.name,
        order.address.line1,
        order.address.line2,
        [order.address.city, order.address.province].filter(Boolean).join(' '),
        order.address.zip,
      ].filter((line) => line && String(line).trim());
      if (lines.length) {
        blocks.push(`<section class="account-order__detail-block${pickup || pickupAddress ? '' : ' account-order__detail-block--wide'}">
          <h3>收貨地址</h3><address>${lines.map(esc).join('<br>')}</address>
        </section>`);
      }
    }

    const tracking = renderTracking(order);
    if (!blocks.length && !tracking) return '';

    return `<div class="order-card">
      <h2 class="order-card__title">送貨資料</h2>
      <div class="account-order__detail-grid">${blocks.join('')}${tracking}</div>
    </div>`;
  }

  function renderHero(order, itemCount) {
    const chips = [];
    if (order.cancelled) {
      chips.push(chip('已取消', 'warn'));
    } else {
      if (order.financial) chips.push(chip(FINANCIAL_LABELS[order.financial] || order.financial, chipKind(order.financial)));
      if (order.fulfillment) chips.push(chip(FULFILLMENT_LABELS[order.fulfillment] || order.fulfillment, chipKind(order.fulfillment)));
    }
    return `<div class="order-hero">
      <p class="order-hero__eyebrow">Order</p>
      <h1>${esc(order.name)}</h1>
      <p class="order-hero__meta"><span>${esc(fmtDate(order.processedAt || order.createdAt))}</span> · <span>${itemCount}</span> <span>${esc(itemCount === 1 ? t('件商品', 'item') : t('件商品', 'items'))}</span></p>
      <div class="order-chips">${chips.join('')}</div>
    </div>`;
  }

  function renderOrder(order, titles) {
    const itemCount = (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    return `${renderHero(order, itemCount)}
      <div class="order-card">
        <h2 class="order-card__title">商品</h2>
        ${renderItems(order, titles)}
        ${renderTotals(order)}
      </div>
      ${renderDelivery(order)}
      <div class="order-card">
        <h2 class="order-card__title">需要幫手？</h2>
        <p class="order-card__note">訂單有問題、想改地址、或者想查物流，可以直接搵我哋，記得講返訂單號碼。</p>
        <div class="order-actions">
          ${button(WHATSAPP, 'WhatsApp 我哋', 'btn--primary', true)}
          ${button(CONTACT_PAGE, '聯絡我們', 'btn--ghost')}
          ${button(SHOP_PAGE, '繼續購物', 'btn--secondary')}
        </div>
        <p class="order-card__note order-card__note--foot">想睇返所有訂單同會員優惠？<a href="${ACCOUNT_PAGE}">登入會員中心</a></p>
      </div>`;
  }

  /* ---------- 狀態 ---------- */

  function showLoading() {
    paint('<div class="order-state"><p class="order-state__msg">正在載入訂單…</p></div>');
  }

  function showMissing() {
    paint(stateBlock('開啟唔到呢張訂單', [
      '呢版要用訂單電郵入面「顯示您的訂單」嗰條連結打開。',
      '如果你係自己打網址入嚟，可以返去封信再撳一次；或者登入會員中心睇返全部訂單。',
    ], [
      button(ACCOUNT_PAGE, '登入會員中心', 'btn--primary'),
      button(CONTACT_PAGE, '聯絡我們', 'btn--ghost'),
    ]));
  }

  function showNotFound() {
    paint(stateBlock('搵唔到呢張訂單', [
      '條連結可能唔完整、複製嗰陣斷咗，或者呢張單已經好舊。',
      '試下返去嗰封訂單電郵，再撳一次「顯示您的訂單」。',
    ], [
      button(WHATSAPP, 'WhatsApp 我哋', 'btn--primary', true),
      button(ACCOUNT_PAGE, '登入會員中心', 'btn--ghost'),
    ]));
  }

  function showError() {
    paint(stateBlock('暫時載入唔到', [
      '可能係網絡問題，請再試一次。',
    ], [
      `<button type="button" class="btn btn--primary" id="order-retry">重試</button>`,
      button(WHATSAPP, 'WhatsApp 我哋', 'btn--ghost', true),
    ]));
    const retry = document.getElementById('order-retry');
    if (retry) retry.addEventListener('click', () => { load(); });
  }

  /* ---------- 載入 ---------- */

  async function load() {
    if (!orderParam) {
      showMissing();
      return;
    }
    showLoading();
    let payload = null;
    try {
      const response = await fetch(apiUrl(), { headers: { Accept: 'application/json' } });
      payload = await response.json().catch(() => null);
      if (response.status === 400) {
        showMissing();
        return;
      }
      if (response.status === 404) {
        showNotFound();
        return;
      }
      if (!response.ok || !payload || !payload.ok) {
        showError();
        return;
      }
    } catch (error) {
      showError();
      return;
    }

    const order = payload.order;
    paint(renderOrder(order, null));
    document.title = t('訂單', 'Order') + ' ' + order.name + ' — OUJI';

    /* 英文模式：產品名換返 Shopify 原生翻譯（字典檔慢一步，唔阻首次渲染）。 */
    englishTitles().then((titles) => {
      if (!titles) return;
      paint(renderOrder(order, titles));
    });
  }

  load();
})();
