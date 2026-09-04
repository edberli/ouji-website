/**
 * 廣告追蹤：GA4、Google Ads、Meta pixel。
 *
 * 呢個網站係 headless —— 行街、睇貨、落購物袋喺 oujikbeauty.com，
 * 一撳結帳就跳去 Shopify 嘅網域。兩邊係兩個唔同嘅站，所以：
 *
 *   1. 呢個檔負責結帳之前嘅所有事件（睇產品、加入購物袋、去結帳）。
 *   2. 「成功購買」發生喺 Shopify 嗰邊，要喺 Shopify 後台
 *      設定 → 顧客事件 裝一個 custom pixel，見 docs/tracking.md。
 *
 * ⚠️ 冇 ID 就乜都唔會做。 填咗先開始追蹤，唔填就係一個空殼，
 * 唔會拖慢個站、唔會發任何 request。
 */
const TRACKING = {
  // GA4 評估 ID，喺 GA4 → 管理 → 資料串流 攞。格式 G-XXXXXXXXXX
  ga4: 'G-54MEJHNCXQ',
  // Google Ads 轉換 ID，喺 Google Ads → 目標 → 轉換 攞。格式 AW-XXXXXXXXX
  googleAds: 'AW-18398942973',
  // Google Ads「加入購物車」／「開始結帳」嘅轉換標籤（選填）
  googleAdsLabels: { addToCart: '2jAxCL_9r-QcEP2tpsVE', beginCheckout: 'LLheCML9r-QcEP2tpsVE' },
  // Meta pixel ID，喺 Meta 事件管理工具攞。純數字。
  metaPixel: '344492400198411',
};

const TRACK_ON = Object.values(TRACKING).some((v) => typeof v === 'string' && v);

/* ---------- 載入 ---------- */

function loadScript(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/* ⚠️ 分兩截，唔可以一齊拖延。
   `gtag` 同 `fbq` 呢兩個 shim 本身係幾行嘢，佢哋嘅工作就係「幫你排隊」——
   事件先入 queue，等真正嗰支 library 落到先一次過送出。
   2026-08-20 撞過一次：為咗慳 300ms，我將成個 initGoogle 拖到 idle 先行，
   結果 `window.gtag` 喺產品頁 fire `view_item` 嗰刻仲未存在，而 trackViewItem
   寫嘅係 `window.gtag?.(...)` —— 冇 gtag 就靜靜哋乜都唔做，GA4 一單
   view_item 都收唔到，仲要唔會報錯。
   而家：shim 即刻裝（要排隊），外部 script 先至 idle 落。 */
function initGoogle() {
  const ids = [TRACKING.ga4, TRACKING.googleAds].filter(Boolean);
  if (!ids.length) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  gtag('js', new Date());

  /* 結帳喺另一個網域，所以要開跨網域連結，否則 GA4 會當結帳係一個
     全新 session，每一張單都會歸功於「myshopify.com 推薦連結」而唔係
     Google／Meta 廣告 —— 即係廣告數據全部作廢。
     （接咗 shop.oujikbeauty.com 之後兩邊同一個母網域，呢個問題自己消失，
       但保留住都冇壞。） */
  const linker = { domains: ['oujikbeauty.com', 'shop.oujikbeauty.com',
                             '5rerjn-mt.myshopify.com'],
                   accept_incoming: true };
  ids.forEach((id) => gtag('config', id, { linker }));
}

/* 真正落外部 script —— 呢兩支先係慢嗰啲（實測 1.5–2.7 秒），可以遲少少 */
function loadTrackingScripts() {
  const ids = [TRACKING.ga4, TRACKING.googleAds].filter(Boolean);
  if (ids.length) loadScript(`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`);
  if (TRACKING.metaPixel && !window._fbqScriptLoaded) {
    window._fbqScriptLoaded = true;
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
  }
}

function loadClarity() {
  if (window.__oujiClarityLoaded) return;
  window.__oujiClarityLoaded = true;
  window.clarity = window.clarity || function clarityQueue() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  loadScript('https://www.clarity.ms/tag/y1kuv6ust0');
}

function initMeta() {
  if (!TRACKING.metaPixel) return;
  /* Meta 官方 snippet，照抄；佢自己會處理重複載入。 */
  /* eslint-disable */
  /* 淨係裝 shim，唔喺度落 fbevents.js —— 嗰句搬咗去 loadTrackingScripts()。
     shim 會將事件收喺 n.queue，library 落到自己會補送。 */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}
  (window,document,'script');
  /* eslint-enable */
  fbq('init', TRACKING.metaPixel);
  fbq('track', 'PageView');
}

/* ---------- 事件 ---------- */

const money = (v) => (v == null ? undefined : Number(v));

/** 一件產品 → GA4 items 格式。 */
function ga4Item(p, qty) {
  return {
    item_id: p.handle,
    item_name: p.title,
    item_brand: p.vendor || undefined,
    item_category: p.productType || undefined,
    price: money(p.priceRange?.minVariantPrice?.amount ?? p.price),
    quantity: qty || 1,
  };
}

function trackViewItem(p) {
  if (!TRACK_ON || !p) return;
  const item = ga4Item(p, 1);
  window.gtag?.('event', 'view_item', {
    currency: 'HKD', value: item.price, items: [item],
  });
  window.fbq?.('track', 'ViewContent', {
    content_ids: [p.handle], content_type: 'product',
    content_name: p.title, value: item.price, currency: 'HKD',
  });
}

function trackAddToCart(p, qty = 1, price) {
  if (!TRACK_ON || !p) return;
  const item = { ...ga4Item(p, qty), price: money(price) ?? ga4Item(p).price };
  const value = (item.price || 0) * qty;
  window.gtag?.('event', 'add_to_cart', { currency: 'HKD', value, items: [item] });
  if (TRACKING.googleAds && TRACKING.googleAdsLabels.addToCart) {
    window.gtag?.('event', 'conversion', {
      send_to: `${TRACKING.googleAds}/${TRACKING.googleAdsLabels.addToCart}`,
      value, currency: 'HKD',
    });
  }
  window.fbq?.('track', 'AddToCart', {
    content_ids: [p.handle], content_type: 'product',
    content_name: p.title, value, currency: 'HKD',
  });
}

function trackBeginCheckout(cart) {
  if (!TRACK_ON) return;
  const lines = cart?.lines?.edges?.map((e) => e.node) || [];
  const items = lines.map((l) => ({
    item_id: l.merchandise?.product?.handle || l.merchandise?.id,
    item_name: l.merchandise?.product?.title || l.merchandise?.title,
    item_brand: l.merchandise?.product?.vendor || undefined,
    price: money(l.merchandise?.price?.amount),
    quantity: l.quantity,
  }));
  const value = money(cart?.cost?.subtotalAmount?.amount);
  window.gtag?.('event', 'begin_checkout', { currency: 'HKD', value, items });
  if (TRACKING.googleAds && TRACKING.googleAdsLabels.beginCheckout) {
    window.gtag?.('event', 'conversion', {
      send_to: `${TRACKING.googleAds}/${TRACKING.googleAdsLabels.beginCheckout}`,
      value, currency: 'HKD',
    });
  }
  window.fbq?.('track', 'InitiateCheckout', {
    content_ids: items.map((i) => i.item_id), content_type: 'product',
    num_items: lines.reduce((n, l) => n + (l.quantity || 0), 0),
    value, currency: 'HKD',
  });
}

function ga4CartItems(cart) {
  return (cart?.lines?.edges || []).map((e) => e.node).map((l) => ({
    item_id: l.merchandise?.product?.handle || l.merchandise?.id,
    item_name: l.merchandise?.product?.title || l.merchandise?.title,
    item_brand: l.merchandise?.product?.vendor || undefined,
    item_variant: l.merchandise?.title || undefined,
    price: money(l.merchandise?.price?.amount),
    quantity: l.quantity,
  }));
}

function trackViewCart(cart) {
  if (!TRACK_ON || !cart) return;
  window.gtag?.('event', 'view_cart', {
    currency: 'HKD',
    value: money(cart.cost?.totalAmount?.amount),
    items: ga4CartItems(cart),
  });
}

function trackRemoveFromCart(line) {
  if (!TRACK_ON || !line) return;
  const item = {
    item_id: line.merchandise?.product?.handle || line.merchandise?.id,
    item_name: line.merchandise?.product?.title || line.merchandise?.title,
    item_brand: line.merchandise?.product?.vendor || undefined,
    item_variant: line.merchandise?.title || undefined,
    price: money(line.merchandise?.price?.amount),
    quantity: line.quantity,
  };
  window.gtag?.('event', 'remove_from_cart', {
    currency: 'HKD', value: (item.price || 0) * (item.quantity || 1), items: [item],
  });
}

function trackAddShippingInfo(cart, shippingTier) {
  if (!TRACK_ON || !cart) return;
  window.gtag?.('event', 'add_shipping_info', {
    currency: 'HKD',
    value: money(cart.cost?.totalAmount?.amount),
    shipping_tier: shippingTier,
    items: ga4CartItems(cart),
  });
}

/* 列表頁係動態載貨，HTML 初次 ready 時未必已有 product card。
   只追蹤真正進入視窗嘅卡，而且每批最多 20 件。舊版一見 DOM 有卡就將
   全部 1,500+ 件塞入同一個 view_item_list request，Google 直接回 413，
   即係個事件名雖然有，但實際上一件都收唔到。 */
function initProductListTracking() {
  if (!TRACK_ON || !document.body) return;
  const seen = new Set();
  const observed = new WeakSet();
  const pending = [];
  let scanTimer = null;
  let flushTimer = null;
  const itemFromCard = (card) => {
    const link = card.matches('a[href]') ? card : card.querySelector('a[href*="product"]');
    if (!link) return null;
    const u = new URL(link.href, location.href);
    const handle = u.pathname.match(/^\/products\/([^/]+)/)?.[1]
      || u.searchParams.get('handle');
    if (!handle) return null;
    const rawPrice = card.querySelector('[class*="price"]')?.textContent || '';
    return {
      item_id: decodeURIComponent(handle),
      item_name: card.querySelector('[class*="name"], h3')?.textContent?.trim() || decodeURIComponent(handle),
      item_brand: card.querySelector('[class*="brand"]')?.textContent?.trim() || undefined,
      price: money(rawPrice.replace(/[^0-9.]/g, '')),
      quantity: 1,
    };
  };
  const listName = () => document.querySelector('h1')?.textContent?.trim() || document.title;
  const flush = () => {
    flushTimer = null;
    while (pending.length) {
      window.gtag?.('event', 'view_item_list', {
        item_list_name: listName(),
        items: pending.splice(0, 20),
      });
    }
  };
  const queue = (card) => {
    const item = itemFromCard(card);
    if (!item || seen.has(item.item_id)) return;
    seen.add(item.item_id);
    pending.push(item);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 120);
  };

  const visibility = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        visibility.unobserve(entry.target);
        queue(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px 120px' })
    : null;

  const scan = () => {
    document.querySelectorAll('.product-card').forEach((card, index) => {
      if (observed.has(card)) return;
      observed.add(card);
      if (visibility) visibility.observe(card);
      else if (index < 20) queue(card);
    });
  };
  const schedule = () => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 120);
  };
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    const item = itemFromCard(card);
    if (item) window.gtag?.('event', 'select_item', {
      item_list_name: listName(),
      items: [item],
    });
  }, { capture: true });
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
}

/* ---------- 廣告點擊 ID 帶去結帳 ----------
 *
 * 客人由廣告入嚟，網址會帶住 gclid（Google）或者 fbclid（Meta）。
 * 一跳去 Shopify 結帳，呢啲參數就冇咗，Shopify 嗰邊嘅 pixel 就唔知
 * 呢張單係邊個廣告帶嚟。第一次到訪就記低，去結帳嗰陣帶埋過去。 */
const CLICK_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid',
                    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

function rememberClickIds() {
  const q = new URLSearchParams(location.search);
  CLICK_KEYS.forEach((k) => {
    const v = q.get(k);
    if (v) {
      try { sessionStorage.setItem(`ouji_${k}`, v); } catch (e) { /* 私隱模式 */ }
    }
  });
}

function decorateCheckoutUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    CLICK_KEYS.forEach((k) => {
      const v = sessionStorage.getItem(`ouji_${k}`);
      if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
    });
    return u.toString();
  } catch (e) {
    return url;
  }
}

/* ---------- 開機 ---------- */

if (TRACK_ON) {
  /* 點擊 ID 要即刻記 —— 客隨時撳走，遲一步就冇咗個 gclid。
     但 gtag 同 fbevents 兩支外部 script 唔急：實測佢哋係首頁最慢嘅四
     五個 request（300–590ms），同目錄嗰幾個 API call 爭連線，
     令下面啲貨遲咗先出到。改成得閒先載，追蹤一樣照計。 */
  rememberClickIds();
  /* shim ＋ config 即刻行：頁面一開波 fire 嘅 view_item／PageView 要有嘢接住 */
  initGoogle();
  initMeta();
  loadClarity();
  /* 兩支外部 library 遲少少先落，唔同目錄嗰幾個 request 爭連線 */
  const idle = window.requestIdleCallback
    ? (fn) => window.requestIdleCallback(fn, { timeout: 2500 })
    : (fn) => setTimeout(fn, 1200);
  if (document.readyState === 'complete') idle(loadTrackingScripts);
  else window.addEventListener('load', () => idle(loadTrackingScripts), { once: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductListTracking, { once: true });
  } else {
    initProductListTracking();
  }
  /* 產品可能喺 analytics.js 之前已經畫好；補返嗰一下 view_item。 */
  if (window.OUJI_currentProduct) trackViewItem(window.OUJI_currentProduct);
}

/* ---------- 產品頁嘅 SEO meta ----------
 *
 * product.html 係一個模板，807 件產品共用。之前佢個 <head> 由頭到尾都係
 * 死嘅：每一版都叫「商品 — OUJI」、同一段描述、而且 canonical 全部指住
 * `https://oujikbeauty.com/product`。
 *
 * 最後嗰樣係致命傷 —— canonical 等於同 Google 講「唔好收錄我，去收錄
 * /product」。807 件產品全部自我除名，一件都排唔到。
 *
 * 呢個函數喺攞到產品資料之後，將成組 meta 改返做嗰件產品自己嘅。
 */
function setMeta(selector, attr, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/** canonical 喺 product.html 特登冇寫死（寫死就一定係錯嘅嗰個），要即場開。 */
function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function applyProductSeo(product) {
  if (!product) return;
  const url = `https://oujikbeauty.com/products/${product.handle}`;
  const title = `${product.title} — OUJI`;
  /* 描述取產品自己嘅文案頭 150 字；冇就用品牌做 fallback，
     總之唔可以 807 版一模一樣。 */
  const raw = (product.description || '').replace(/\s+/g, ' ').trim();
  const desc = raw
    ? raw.slice(0, 150) + (raw.length > 150 ? '…' : '')
    : `${product.vendor || 'OUJI'} ${product.title}｜OUJI 香港 K-Beauty 專門店，正貨韓國直送。`;
  const image = product.images?.edges?.[0]?.node?.url;

  document.title = title;
  setCanonical(url);
  setMeta('meta[name="description"]', 'content', desc);
  setMeta('meta[property="og:type"]', 'content', 'product');
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', desc);
  setMeta('meta[property="og:image"]', 'content', image);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', desc);
  setMeta('meta[name="twitter:image"]', 'content', image);
}

/* ---------- 結構化資料（schema.org Product）----------
 *
 * Google 靠呢段嘢先知道一版嘢係一件產品、幾錢、仲有冇貨 —— 搜尋結果
 * 嘅價錢／庫存標籤、同埋 Google Shopping 嘅免費刊登都由佢嚟。
 * 之前一版都冇。
 *
 * ⚠️ 特登唔放 aggregateRating。 我哋嘅評分係 Olive Young 顧客畀嘅，
 * 唔係 OUJI 顧客畀嘅。將人哋嘅評分放入自己個 Product schema，等於同
 * Google 講「呢啲係我哋收到嘅評價」—— 違反佢嘅評論摘要政策，會招致
 * 人手處罰。頁面上照樣顯示（有寫明出處），但唔會餵去搜尋引擎。
 */
function injectProductSchema(product, variant) {
  if (!product) return;
  document.getElementById('ouji-product-schema')?.remove();

  const v = variant || product.variants?.edges?.[0]?.node;
  const variants = (product.variants?.edges || []).map((e) => e.node);
  const inStock = variants.some((x) => x.availableForSale);
  const images = (product.images?.edges || []).slice(0, 6).map((e) => e.node.url);
  const url = `https://oujikbeauty.com/products/${product.handle}`;

  /* 多變體產品唔可以淨係攞第一個變體嘅價。BRAYE Lipsleek 八隻色，
     七隻 $138、一隻 $118 —— 頁面顯示「HK$118」（最低價）。schema 若果
     寫住第一個變體嘅 $138，Google 就會見到頁面價同結構化資料唔夾，
     Merchant Center 直情拒收。所以有價格範圍就出 AggregateOffer。
     （同 api/product.js 嘅 buildOffers() 要一致。） */
  const lo = product.priceRange?.minVariantPrice?.amount;
  const hi = product.priceRange?.maxVariantPrice?.amount;
  const availability = inStock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
  const offers = (lo != null && hi != null && Number(lo) !== Number(hi))
    ? {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: 'HKD',
      lowPrice: Number(lo).toFixed(2),
      highPrice: Number(hi).toFixed(2),
      offerCount: variants.length || undefined,
      availability,
      seller: { '@type': 'Organization', name: 'OUJI' },
    }
    : {
      '@type': 'Offer',
      url,
      priceCurrency: 'HKD',
      price: lo != null ? Number(lo).toFixed(2) : undefined,
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'OUJI' },
    };

  function gtinField(rawGtin) {
    const digits = String(rawGtin || '').replace(/\D/g, '');
    if (![8, 12, 13, 14].includes(digits.length)) return {};
    const body = digits.slice(0, -1);
    let sum = 0;
    for (let i = body.length - 1, n = 0; i >= 0; i -= 1, n += 1) {
      sum += Number(body[i]) * (n % 2 === 0 ? 3 : 1);
    }
    if ((10 - (sum % 10)) % 10 !== Number(digits.at(-1))) return {};
    return { [`gtin${digits.length}`]: digits };
  }

  /* ⚠️ `name` 唔可以超過 150 個字。Search Console 2026-08-31 報
     「『name』欄位中的字串長度無效」—— 當時有一件貨個名 157 字。
     個名本身已經改短咗，但呢度都要守住個閘：日後再有人打個長名，
     唔應該再由 Google 嚟話畀我哋知。（同 api/product.js 要一致。） */
  const NAME_MAX = 150;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: (product.title || '').slice(0, NAME_MAX),
    description: (product.description || '').slice(0, 500) || undefined,
    sku: variants.length === 1 ? (v?.sku || undefined) : undefined,
    ...(variants.length === 1 ? gtinField(v?.barcode) : {}),
    image: images.length ? images : undefined,
    brand: product.vendor ? { '@type': 'Brand', name: product.vendor } : undefined,
    category: product.productType || undefined,
    offers,
  };

  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'ouji-product-schema';
  s.textContent = JSON.stringify(data, (k, val) => (val === undefined ? undefined : val));
  document.head.appendChild(s);
}
