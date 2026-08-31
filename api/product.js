/**
 * 產品頁嘅服務端 <head>。
 *
 * 點解要有呢個檔：
 *
 * `analytics.js` 入面嘅 applyProductSeo() 已經會喺瀏覽器度寫返正確嘅
 * title／description／canonical／og。Google 會執行 JS，所以佢睇到。
 * 但 **WhatsApp、Facebook、LINE、IG、Slack 嘅連結預覽爬蟲唔會執行 JS**
 * —— 佢哋淨係讀原始 HTML。結果任何人分享產品連結，預覽永遠都係
 * 「商品 — OUJI」加一張通用圖。對一間靠 IG／WhatsApp 落單嘅店，
 * 呢個係實實在在嘅損失。
 *
 * 所以 /products/:handle 交畀呢個 function：向 Storefront API 攞資料，
 * 喺 product.html 個 <head> 度換好先出。之後客戶端嗰段 JS 照樣行，
 * 寫入一模一樣嘅值（同一個 canonical、同一個 title），唔會打架。
 *
 * ⚠️ 安全網：任何一步出事（API 掛咗、handle 唔存在、逾時）都會原封不動
 * 回 product.html。呢一版最衰嘅情況等於冇咗呢個 function 之前嘅行為，
 * 唔會白畫面、唔會 500。
 */
const fs = require('fs');
const path = require('path');

const SHOP = '5rerjn-mt.myshopify.com';
const TOKEN = '795e2f7cb13da1d3776449eba5802377';
const API = `https://${SHOP}/api/2024-10/graphql.json`;
const SITE = 'https://oujikbeauty.com';

const QUERY = `
query($handle: String!) @inContext(country: HK) {
  product(handle: $handle) {
    handle title description descriptionHtml vendor productType
    images(first: 1) { edges { node { url } } }
    variants(first: 50) { edges { node { sku availableForSale price { amount } } } }
    priceRange {
      minVariantPrice { amount }
      maxVariantPrice { amount }
    }
  }
}`;

/** 放入 HTML 屬性之前一定要跳脫，唔係產品名有引號就會拆咗個 tag。 */
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function readTemplate() {
  return fs.readFileSync(path.join(process.cwd(), 'product.html'), 'utf8');
}

async function fetchProduct(handle) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query: QUERY, variables: { handle } }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data?.product || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 多變體產品唔可以淨係攞第一個變體嘅價。
 *
 * 例：BRAYE Lipsleek 八隻色，七隻 $138、一隻 $118。頁面顯示「HK$118」
 * （最低價），但如果 schema 寫住第一個變體嘅 $138，Google 就會見到
 * 頁面價同結構化資料價唔夾 —— Merchant Center 直情會拒收。
 *
 * 所以：價格一致就出 Offer，有價格範圍就出 AggregateOffer。
 */
function buildOffers(p, variants, url) {
  const lo = p.priceRange?.minVariantPrice?.amount;
  const hi = p.priceRange?.maxVariantPrice?.amount;
  const inStock = variants.some((v) => v.availableForSale);
  const availability = inStock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  if (lo != null && hi != null && Number(lo) !== Number(hi)) {
    return {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: 'HKD',
      lowPrice: Number(lo).toFixed(2),
      highPrice: Number(hi).toFixed(2),
      offerCount: variants.length || undefined,
      availability,
      seller: { '@type': 'Organization', name: 'OUJI' },
    };
  }
  return {
    '@type': 'Offer',
    url,
    priceCurrency: 'HKD',
    price: lo != null ? Number(lo).toFixed(2) : undefined,
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: 'OUJI' },
  };
}

/** 同 analytics.js 嘅 applyProductSeo() 保持一致，兩邊出同一組值。 */
function buildHead(p) {
  const url = `${SITE}/products/${p.handle}`;
  const title = `${p.title} — OUJI`;
  const raw = (p.description || '').replace(/\s+/g, ' ').trim();
  const desc = raw
    ? raw.slice(0, 150) + (raw.length > 150 ? '…' : '')
    : `${p.vendor || 'OUJI'} ${p.title}｜OUJI 香港 K-Beauty 專門店，正貨韓國直送。`;
  const image = p.images?.edges?.[0]?.node?.url || `${SITE}/og-image.jpg`;
  const variants = (p.variants?.edges || []).map((e) => e.node);
  const v = variants[0];

  /* JSON-LD 都要喺服務端出一次。Google Merchant Center 嘅免費刊登靠佢，
     而嗰個爬蟲同社交爬蟲一樣唔一定行 JS。客戶端嗰段用同一個 id，
     行到嗰陣會整個換走，唔會出兩份。 */
  /* ⚠️ `name` 唔可以超過 150 個字。Search Console 2026-08-31 報
     「『name』欄位中的字串長度無效」—— 當時有一件貨個名 157 字。
     個名本身已經改短咗，但呢度都要守住個閘。（同 analytics.js 一致。） */
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: (p.title || '').slice(0, 150),
    description: raw.slice(0, 500) || undefined,
    sku: v?.sku || undefined,
    image: [image],
    brand: p.vendor ? { '@type': 'Brand', name: p.vendor } : undefined,
    category: p.productType || undefined,
    offers: buildOffers(p, variants, url),
  };

  return `  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="OUJI">
  <meta property="og:locale" content="zh_HK">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(image)}">
  <script type="application/ld+json" id="ouji-product-schema">${
    JSON.stringify(ld).replace(/</g, '\\u003c')
  }</script>`;
}

/* product.html 用兩個註解標記包住成組 SEO tag，就係為咗喺度可以精準
   換走。用 regex 由 <title> 掃到 twitter:image 會連 favicon 都食埋。 */
const HEAD_BLOCK = /<!-- OUJI-SEO:START[\s\S]*?OUJI-SEO:END -->/;

/* <h1> 喺 product.html 度係空白，靠客戶端 JS 填。但 Google 渲染 JS 排第二輪,
   h1 又係主要排名訊號 —— 唔等客戶端,喺服務端就填好。之後客戶端
   nameEl.textContent 會寫入一模一樣嘅值,所以冇衝突。 */
const H1_EMPTY = /<h1 class="product-info__name"><\/h1>/;

/* 同一個道理:品牌／價錢／簡介三格喺 template 都係空白,靠客戶端 JS 填。
   Google 第一眼見到嘅產品頁因此淨係得導覽選單 —— Search Console 有 557 版
   停喺「已找到 - 目前尚未建立索引」,即係佢覺得啲頁冇料到,唔值得爬。
   呢度出嘅值同客戶端嗰段 JS 一模一樣,所以客戶端覆寫落去唔會跳動。 */
const BRAND_EMPTY = /<span class="product-info__brand"><\/span>/;
const PRICE_EMPTY = /<div class="product-info__price"><\/div>/;
const DESC_EMPTY = /<p class="product-info__short-desc"><\/p>/;

function introText(p) {
  const m = (p.descriptionHtml || '').match(/<p[^>]*>([\s\S]*?)<\/p>/);
  const plain = m ? m[1].replace(/<[^>]+>/g, '').trim()
                  : (p.description || '').trim();
  return plain.length > 200 ? plain.slice(0, 200) + '…' : plain;
}

function fillBody(html, p) {
  let out = html;
  const vendor = p.vendor || '';
  if (vendor) {
    out = out.replace(BRAND_EMPTY,
      `<span class="product-info__brand"><a href="shop.html?brand=${
        encodeURIComponent(vendor)}">${esc(vendor)}</a></span>`);
  }
  const lo = p.priceRange?.minVariantPrice?.amount;
  if (lo != null) {
    out = out.replace(PRICE_EMPTY,
      `<div class="product-info__price">HK$${Number(lo).toFixed(2)}</div>`);
  }
  const intro = introText(p);
  if (intro) {
    out = out.replace(DESC_EMPTY,
      `<p class="product-info__short-desc">${esc(intro)}</p>`);
  }
  return out;
}

function fillH1(html, p) {
  const t = (p && p.title) || '';
  if (!t) return html;
  return html.replace(H1_EMPTY,
    `<h1 class="product-info__name">${esc(t)}</h1>`);
}

module.exports = async function handler(req, res) {
  let html;
  try {
    html = readTemplate();
  } catch (e) {
    res.status(500).send('product template missing');
    return;
  }

  const handle = String(req.query?.handle || '').trim();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!handle) {
    res.setHeader('Cache-Control', 'public, s-maxage=600');
    res.status(200).send(html);
    return;
  }

  const product = await fetchProduct(handle);
  if (!product) {
    /* 攞唔到就照出原本嗰版 —— 客戶端嗰段 JS 會自己處理「搵唔到產品」。
       快取短啲，等 API 恢復之後唔使等太耐。 */
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(200).send(html);
    return;
  }

  let out = HEAD_BLOCK.test(html)
    ? html.replace(HEAD_BLOCK, buildHead(product))
    : html.replace('</head>', `${buildHead(product)}\n</head>`);
  out = fillH1(out, product);
  out = fillBody(out, product);

  res.setHeader('Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(out);
};
