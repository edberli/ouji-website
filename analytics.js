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
  ga4: '',
  // Google Ads 轉換 ID，喺 Google Ads → 目標 → 轉換 攞。格式 AW-XXXXXXXXX
  googleAds: '',
  // Google Ads「加入購物車」／「開始結帳」嘅轉換標籤（選填）
  googleAdsLabels: { addToCart: '', beginCheckout: '' },
  // Meta pixel ID，喺 Meta 事件管理工具攞。純數字。
  metaPixel: '1618903536462904',
};

const TRACK_ON = Object.values(TRACKING).some((v) => typeof v === 'string' && v);

/* ---------- 載入 ---------- */

function loadScript(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function initGoogle() {
  const ids = [TRACKING.ga4, TRACKING.googleAds].filter(Boolean);
  if (!ids.length) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`);

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

function initMeta() {
  if (!TRACKING.metaPixel) return;
  /* Meta 官方 snippet，照抄；佢自己會處理重複載入。 */
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
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
  rememberClickIds();
  initGoogle();
  initMeta();
}

/* ---------- 結構化資料（schema.org Product）----------
 *
 * Google 靠呢段嘢先知道一版嘢係一件產品、幾錢、仲有冇貨 —— 搜尋結果
 * 嘅價錢／庫存標籤、同埋 Google Shopping 嘅免費刊登都由佢嚟。
 * 之前一版都冇。
 *
 * ⚠️ 特登唔放 aggregateRating。 我哋嘅評分係 Olive Young 顧客畀嘅，
 * 唔係 OUJI 顧客畀嘅。將人哋嘅評分放入自己個 Product schema，等於同
 * Google 講「呢啲係我哋收到嘅評價」—— 違反佢嘅評論摘要政策，會food
 * 人手處罰。頁面上照樣顯示（有寫明出處），但唔會餵去搜尋引擎。
 */
function injectProductSchema(product, variant) {
  if (!product) return;
  document.getElementById('ouji-product-schema')?.remove();

  const v = variant || product.variants?.edges?.[0]?.node;
  const price = v?.price?.amount ?? product.priceRange?.minVariantPrice?.amount;
  const inStock = product.variants?.edges?.some((e) => e.node.availableForSale);
  const images = (product.images?.edges || []).slice(0, 6).map((e) => e.node.url);

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: (product.description || '').slice(0, 500) || undefined,
    sku: v?.sku || undefined,
    image: images.length ? images : undefined,
    brand: product.vendor ? { '@type': 'Brand', name: product.vendor } : undefined,
    category: product.productType || undefined,
    offers: {
      '@type': 'Offer',
      url: `https://oujikbeauty.com/products/${product.handle}`,
      priceCurrency: 'HKD',
      price: price ? Number(price).toFixed(2) : undefined,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'OUJI' },
    },
  };

  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'ouji-product-schema';
  s.textContent = JSON.stringify(data, (k, val) => (val === undefined ? undefined : val));
  document.head.appendChild(s);
}
