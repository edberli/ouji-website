/**
 * OUJI × Shopify Storefront API Integration
 * -----------------------------------------
 * 填入你的 Shopify 店鋪資料：
 */
const SHOPIFY_DOMAIN = '5rerjn-mt.myshopify.com';
const SHOPIFY_TOKEN  = '795e2f7cb13da1d3776449eba5802377';
const SHOPIFY_API    = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;

// ─────────────────────────────────────────────
// 核心請求函數
// ─────────────────────────────────────────────
/* 白畫面嘅真兇 —— 2026-09-02 由 `/api/jserr` 抓到 stack 先斷到症：
     「The string did not match the expected pattern. ‖ json@[native code]
       | shopifyFetch@https://oujikbeauty.com/sho…」（iPhone Safari）
   同一件事 Chrome 講「Unexpected end of JSON input」，bingbot 都中過。
   即係 Storefront API 間唔中回一個空／截斷嘅 body，`res.json()` 就拋。

   舊版由頭到尾冇 try —— 個 rejection 冇人接，上面 `initPage()` 死喺第一句，
   成版嘢就無聲無息停晒，客見到嘅就係白畫面。四條客報返嚟嘅 jserr 入面，
   出事嗰陣 `<main>` 得 791px／1,224px，即係產品區完全空。

   而家每個 request：12 秒 timeout、睇 HTTP status、parse 之前先讀 text，
   暫時性失敗（網絡斷、429、5xx、空 body）退避重試三次。4xx 唔重試 ——
   token 錯或者 query 錯，試幾多次都係一樣答案。 */
const SHOPIFY_TIMEOUT = 12000;
const SHOPIFY_TRIES = 3;

function shopifyWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shopifyFetch(query, variables = {}, { tries = SHOPIFY_TRIES } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    /* 300ms → 600ms，加少少隨機，唔好一車人同一刻重試 */
    if (attempt) await shopifyWait(300 * (2 ** (attempt - 1)) + Math.random() * 200);
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), SHOPIFY_TIMEOUT) : null;
    try {
      const res = await fetch(SHOPIFY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (!res.ok && res.status < 500 && res.status !== 429) {
        const fatal = new Error('Shopify HTTP ' + res.status);
        fatal.shopifyFatal = true;
        throw fatal;
      }
      if (!res.ok) throw new Error('Shopify HTTP ' + res.status);
      /* 唔直接用 res.json()：body 截斷嗰陣佢拋出嚟嘅 message 睇唔出係邊個
         request、收到幾多 bytes。自己讀 text 再 parse 就報得清楚。 */
      const text = await res.text();
      if (!text) throw new Error('Shopify 回咗空 body');
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (e) {
        throw new Error('Shopify 回嘅唔係 JSON（' + text.length + ' bytes）');
      }
      if (payload && payload.errors) console.error('Shopify API errors:', payload.errors);
      return payload ? payload.data : undefined;
    } catch (err) {
      lastErr = err;
      if (err && err.shopifyFatal) break;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastErr || new Error('Shopify 請求失敗');
}

// ─────────────────────────────────────────────
// 商品 API
// ─────────────────────────────────────────────

/** 取得商品列表（可按分類篩選） */
async function getProducts({ collectionHandle, first = 20, after = null } = {}) {
  if (collectionHandle) {
    const data = await shopifyFetch(`
      query GetCollection($handle: String!, $first: Int!, $after: String) {
        collection(handle: $handle) {
          title
          description
          products(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id handle title vendor productType tags createdAt
                priceRange { minVariantPrice { amount currencyCode } }
                compareAtPriceRange { minVariantPrice { amount currencyCode } }
                images(first: 2) { edges { node { url altText } } }
                totalInventory
                variants(first: 2) { edges { node { id availableForSale quantityAvailable } } }
              }
            }
          }
        }
      }
    `, { handle: collectionHandle, first, after });
    return data?.collection?.products;
  }

  const data = await shopifyFetch(`
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id handle title vendor productType tags createdAt
            priceRange { minVariantPrice { amount currencyCode } }
            compareAtPriceRange { minVariantPrice { amount currencyCode } }
            images(first: 2) { edges { node { url altText } } }
            totalInventory
            variants(first: 2) { edges { node { id availableForSale quantityAvailable } } }
          }
        }
      }
    }
  `, { first, after });
  return data?.products;
}

/**
 * Every product, not the first page of them.
 *
 * The Storefront API caps `first` at 250. That was invisible while the
 * catalogue was smaller than a page, but the shop passed 250 the day the
 * skincare range went up, and every caller asking for `first: 250` was
 * silently dropping the remainder — a third of the catalogue missing from
 * the grid, the matcher and the homepage with no error anywhere.
 */
/* Cursor paging cannot be parallelised — page two needs page one's
   cursor — so eight hundred products is five round trips end to end,
   about a second before the grid can draw anything. Doing that again on
   every hop between 彩妝 and 護膚 and 全部產品 is what makes the site
   feel slow, and none of it is new information.

   So the answer is cached for the tab session. Five minutes is short
   enough that a price change or a sell-out shows up while somebody is
   still browsing, and long enough that moving around the shop costs
   nothing. sessionStorage, not localStorage: a new visit should see
   today's catalogue, not last week's. */
const CATALOG_TTL = 5 * 60 * 1000;
const MEM_CACHE = new Map();

/* 快取住嘅係 GraphQL 回嚟嗰個物件，所以佢嘅「形狀」由 query 決定。
   一改 query（加咗 maxVariantPrice 嗰次就係），舊 session 入面啲快取
   就會少咗新欄位，新程式碼讀落去係 undefined —— 唔會報錯，只會靜靜哋
   行錯分支，最難捉。改 query 就順手 +1 呢個號，舊 key 自然失效。 */
/* 3：列表 query 由 variants(first: 1) 改成 first: 2，同時要埋
   quantityAvailable。卡片要知道件貨
   係咪得一個規格 —— 得一個先可以「快速加入」，多過一個就要客自己
   揀色，唔可以幫佢決定。改咗 query 就一定要 +1，否則舊 session 攞到
   嘅快取只有一個 variant，新碼會當佢單規格。 */
/* 4：加咗 totalInventory。列表 query 淨係攞頭兩個規格，隱形眼鏡一件貨
   有 25 個度數，頭兩個度數斷咗貨就會成件標「售完」—— 其實仲有十幾個
   度數有貨。totalInventory 係成件貨嘅總數，一個欄位就解決。 */
const CACHE_VERSION = 5;
const cacheKey = (name) => `ouji:v${CACHE_VERSION}:${name}`;

function cacheRead(key) {
  const hit = MEM_CACHE.get(key);
  if (hit && Date.now() - hit.at < CATALOG_TTL) return hit.v;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { at, v } = JSON.parse(raw);
    if (Date.now() - at >= CATALOG_TTL) return null;
    MEM_CACHE.set(key, { at, v });
    return v;
  } catch (e) {
    return null;
  }
}

function cacheWrite(key, v) {
  MEM_CACHE.set(key, { at: Date.now(), v });
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), v }));
  } catch (e) {
    // 配額爆咗（大目錄 + 私隱模式）—— 記憶體嗰份照用，唔使理。
  }
}

async function fetchAllPages({ collectionHandle, pageSize = 250, max = 2000 } = {}) {
  const out = [];
  let after = null;
  while (out.length < max) {
    const page = await getProducts({ collectionHandle, first: pageSize, after });
    const edges = page?.edges || [];
    out.push(...edges);
    if (!page?.pageInfo?.hasNextPage || !edges.length) break;
    after = page.pageInfo.endCursor;
  }
  return out;
}

/* ---------- 目錄快照 ----------
 *
 * 目錄有 899 件，Storefront 一頁最多 250 件，而且係游標分頁 —— 四個
 * request 一個接一個行，並行唔到。實測首頁要等到 **1.0 秒** 先攞齊，
 * 嗰一秒 header 出咗、下面白色一片。老闆嘅講法係「入到去先見到 header，
 * 之後先撈下面啲嘢」。
 *
 * `data/catalog.json` 就係嗰四個 request 嘅結果，事先抽好擺喺 Vercel 邊緣
 * （884 KB，壓縮後 102 KB，一個 request）。攞到就即刻畫，同時喺背景行返
 * 原本嗰四個 call 對數，對完寫返落 cache，下一版就係最新。
 *
 * 唔用快照嘅情況：檔唔喺度、格式唔啱、或者超過 36 鐘頭未更新 —— 寧願慢
 * 一秒，都好過出舊價錢同舊庫存。要更新：`scripts/build_catalog_snapshot.py`。
 */
const SNAPSHOT_URL = 'data/catalog.json';
const SNAPSHOT_MAX_AGE = 36 * 60 * 60 * 1000;
let revalidating = false;

async function readSnapshot() {
  try {
    /* 快照係首屏唯一嘅資料來源。冇 timeout 嘅話，一個吊住嘅 request
       就令成版停喺度乾等 —— 表現同白畫面一模一樣。8 秒攞唔到就當佢冇，
       退返去行 API，好過乾等。 */
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    const r = await fetch(SNAPSHOT_URL, { signal: ctrl ? ctrl.signal : undefined })
      .finally(() => { if (timer) clearTimeout(timer); });
    if (!r.ok) return null;
    const { at, v } = await r.json();
    if (!Array.isArray(v) || v.length < 100) return null;
    if (!at || Date.now() - at > SNAPSHOT_MAX_AGE) return null;
    return v;
  } catch (e) {
    return null;
  }
}

function revalidateCatalog(key, opts) {
  if (revalidating) return;
  revalidating = true;
  const run = async () => {
    try {
      const fresh = await fetchAllPages(opts);
      if (fresh.length >= 100) {
        cacheWrite(key, fresh);
        document.dispatchEvent(new CustomEvent('ouji:catalog-refreshed',
          { detail: { edges: fresh } }));
      }
    } catch (e) {
      /* 對唔到數就算 —— 快照已經畫咗出嚟，唔好因為呢個爆咗成版 */
    }
  };
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

async function getAllProducts({ collectionHandle, pageSize = 250, max = 2000 } = {}) {
  const key = cacheKey(`catalog:${collectionHandle || 'all'}`);
  const cached = cacheRead(key);
  if (cached) return { edges: cached };

  /* 快照淨係得全店嗰份；分類 collection 照行 API */
  if (!collectionHandle) {
    const snap = await readSnapshot();
    if (snap) {
      cacheWrite(key, snap);
      revalidateCatalog(key, { collectionHandle, pageSize, max });
      return { edges: snap };
    }
  }

  /* 呢個 function 係全站攞貨嘅單一入口 —— `shop.html`、`index.html`、
     分類頁全部直接 await 佢。所以佢**唔准 throw**：一 throw 就係
     DOMContentLoaded 死喺半路、成版白晒。攞唔到就回空清單兼標記，
     上面 `showCategoryEmpty()` 會出「再試一次」，唔會扮冇貨。 */
  let out = [];
  try {
    out = await fetchAllPages({ collectionHandle, pageSize, max });
  } catch (e) {
    window.OUJI_CATALOG_FAILED = true;
    console.error('[OUJI] 攞唔到目錄：', e);
    return { edges: [] };
  }
  /* 空清單唔准寫入 cache —— 否則一次失敗會鎖住成個 session 五分鐘。 */
  if (out.length) cacheWrite(key, out);
  return { edges: out };
}

/** 取得單一商品詳情 */
async function getProduct(handle) {
  const data = await shopifyFetch(`
    query GetProduct($handle: String!) {
      product(handle: $handle) {
        id handle title description descriptionHtml
        vendor tags productType
        # maxVariantPrice 係畀 schema.org 用 —— 一件產品幾隻色唔同價
        # 嗰陣要出 AggregateOffer，唔可以淨係報第一個變體嘅價。
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        compareAtPriceRange { minVariantPrice { amount currencyCode } }
        images(first: 50) { edges { node { url altText } } }
        variants(first: 50) {
          edges {
            node {
              id title
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              availableForSale
              quantityAvailable
              selectedOptions { name value }
              image { url altText }
            }
          }
        }
        options { name values }
      }
    }
  `, { handle });
  return data?.product;
}

/** 預存商品資料到 sessionStorage（供 product.html 即時讀取） */
function cacheProduct(product) {
  if (!product?.handle) return;
  try {
    sessionStorage.setItem(cacheKey('product:' + product.handle), JSON.stringify(product));
  } catch (e) {}
}

/** 從 sessionStorage 讀取已快取的商品 */
function getCachedProduct(handle) {
  try {
    const data = sessionStorage.getItem(cacheKey('product:' + handle));
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
}

/**
 * 預載入商品列表頭幾件嘅完整資料，等撳落去嗰下即刻出到。
 *
 * 呢個本來一次過發十二個 query，而且係喺格仔畫完即刻發。每個
 * `getProduct` 都攞五十張圖同五十個變體 —— 十二個加埋比成頁嘢
 * 都重，仲要同真正要顯示嘅產品相爭頻寬，結果係為咗令「可能會撳」
 * 嗰下快啲，令「而家就要睇」嗰下慢咗。
 *
 * 改成四件，而且等瀏覽器閒咗先發。
 */
function prefetchProducts(handles, limit = 4) {
  const run = () => {
    handles.slice(0, limit).forEach(async (handle) => {
      if (getCachedProduct(handle)) return;
      try {
        const product = await getProduct(handle);
        if (product) cacheProduct(product);
      } catch (e) { /* 預載失敗唔緊要，撳落去嗰陣照樣攞到 */ }
    });
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}

/** 搜尋商品 */
async function searchProducts(query, first = 10) {
  const data = await shopifyFetch(`
    query SearchProducts($query: String!, $first: Int!) {
      products(query: $query, first: $first) {
        edges {
          node {
            id handle title vendor productType tags createdAt
            priceRange { minVariantPrice { amount currencyCode } }
            images(first: 1) { edges { node { url altText } } }
          }
        }
      }
    }
  `, { query, first });
  return data?.products?.edges?.map(e => e.node) ?? [];
}

// ─────────────────────────────────────────────
// 品牌（Collections）API
// ─────────────────────────────────────────────

/** 取得所有分類 / 品牌 */
async function getCollections(first = 30) {
  const data = await shopifyFetch(`
    query GetCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id handle title vendor productType tags createdAt
            image { url altText }
            description
          }
        }
      }
    }
  `, { first });
  return data?.collections?.edges?.map(e => e.node) ?? [];
}

// ─────────────────────────────────────────────
// 購物車 API
// ─────────────────────────────────────────────

/**
 * The market every cart belongs to.
 *
 * Shopify decides a cart's market from the buyer's IP unless it is told
 * otherwise, and this shop's Markets only cover Hong Kong. A shopper
 * connecting from anywhere else — mainland China, Taiwan, the US, or
 * anyone behind a VPN — got a cart that accepted the line and then set its
 * quantity to 0 with a MERCHANDISE_OUT_OF_STOCK warning: the item vanished
 * with no error on screen and the badge stayed at 0.
 *
 * We sell in HKD and ship from Hong Kong, so pin every cart to HK rather
 * than let the buyer's address decide whether the shop works.
 */
const CART_COUNTRY = 'HK';

/** 建立購物車 */
async function createCart() {
  const data = await shopifyFetch(`
    mutation CreateCart($country: CountryCode!) @inContext(country: $country) {
      cartCreate(input: { buyerIdentity: { countryCode: $country } }) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `, { country: CART_COUNTRY });
  const cart = data?.cartCreate?.cart;
  if (cart) localStorage.setItem('shopify_cart_id', cart.id);
  return cart;
}

/** 取得或建立購物車 ID */
async function getOrCreateCartId() {
  const stored = localStorage.getItem('shopify_cart_id');
  if (stored) return stored;
  const cart = await createCart();
  return cart?.id;
}

/** 取得購物車內容 */
async function getCart() {
  const cartId = localStorage.getItem('shopify_cart_id');
  if (!cartId) return null;
  // 下面攞唔到就會清走個 ID（見尾）

  const data = await shopifyFetch(`
    query GetCart($cartId: ID!, $country: CountryCode!) @inContext(country: $country) {
      cart(id: $cartId) {
        id checkoutUrl totalQuantity
        cost {
          totalAmount { amount currencyCode }
          subtotalAmount { amount currencyCode }
        }
        lines(first: 50) {
          edges {
            node {
              id quantity
              cost { totalAmount { amount currencyCode } }
              merchandise {
                ... on ProductVariant {
                  id title
                  price { amount currencyCode }
                  image { url altText }
                  product { title handle vendor }
                  selectedOptions { name value }
                  quantityAvailable
                }
              }
            }
          }
        }
      }
    }
  `, { cartId, country: CART_COUNTRY });
  /* 個 ID 指住一個唔存在嘅購物車 → 清走佢。唔清嘅話，購物袋一版
     永遠都係空，而下一次加貨又會撞返同一個死 ID。 */
  if (!data?.cart) localStorage.removeItem('shopify_cart_id');
  return data?.cart;
}

/** 加入商品到購物車 */
async function addToCart(variantId, quantity = 1, retried = false) {
  const cartId = await getOrCreateCartId();
  const data = await shopifyFetch(`
    mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode!)
    @inContext(country: $country) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { id totalQuantity }
        userErrors { field message }
        warnings { code message }
      }
    }
  `, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
    country: CART_COUNTRY,
  });
  const result = data?.cartLinesAdd;

  // Shopify accepts the line and then silently zeroes it when the cart
  // belongs to a market that does not carry the product. A cart saved
  // before the market was pinned stays stuck that way for as long as it
  // sits in localStorage, so throw it away and build a new one — once.
  const swallowed = result?.cart && result.cart.totalQuantity === 0 && quantity > 0;

  /* 購物車 ID 死咗（過期、或者結咗帳嗰個仲擺喺度）。
     Shopify 唔會嘈，佢回一個冇 cart 嘅結果就算數 —— 舊碼跟住乜都
     唔做，件貨就咁不見咗。而且個死 ID 一路留喺 localStorage，
     即係之後每一次加貨都會照樣不見，喺同一部機上面永遠好唔返。
     老闆撞到嘅「加咗入購物袋但入面乜都冇」就係呢個。 */
  const dead = !result?.cart;
  if ((swallowed || dead) && !retried) {
    localStorage.removeItem('shopify_cart_id');
    return addToCart(variantId, quantity, true);
  }

  /* ⚠️ 呢兩行係「加咗入購物袋但入面乜都冇」嘅真正解藥。
     Shopify 收到一個過期／唔認得嘅購物車 ID 之後，唔會報錯 ——
     佢會開一個新車、加咗件貨入去，然後喺回覆度**畀返一個新 ID**。
     舊碼由頭到尾冇讀過個回覆嘅 ID，localStorage 仍然指住舊嗰個死車，
     所以：加貨每次都話成功，但購物袋一版永遠係空，而且喺同一部機
     上面唔會自己好返 —— 個死 ID 一直喺度。
     實測：發一個亂作嘅 ID 上去，Shopify 照回一個 totalQuantity 1
     嘅車，ID 同送出去嗰個唔同。 */
  if (result.cart.id && result.cart.id !== cartId) {
    localStorage.setItem('shopify_cart_id', result.cart.id);
  }
  if (result?.warnings?.length) {
    console.warn('購物車警告:', result.warnings.map((w) => `${w.code} ${w.message}`).join(' / '));
  }

  // 如果 mutation 回傳嘅 cart 有錯或 cart ID 過期，重新取得
  if (result?.cart?.totalQuantity != null) {
    updateCartBadge(result.cart.totalQuantity);
  } else {
    // Fallback: 重新 query cart 攞正確數量
    const freshCart = await getCart();
    if (freshCart) updateCartBadge(freshCart.totalQuantity);
  }

  /* 回 null 代表真係加唔到。舊碼一律回個 result 物件 —— 就算件貨
     根本冇入到袋都係 truthy，所以粒掣照樣顯示「加咗入袋 ✓」，
     客信咗，去到購物袋先發現冇。 */
  if (!result?.cart) {
    console.error('加入購物車失敗：', result?.userErrors || data);
    return null;
  }
  return result;
}

/** 更新購物車商品數量 */
async function updateCartLine(lineId, quantity) {
  const cartId = localStorage.getItem('shopify_cart_id');
  const data = await shopifyFetch(`
    mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode!)
    @inContext(country: $country) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `, {
    cartId,
    lines: [{ id: lineId, quantity }],
    country: CART_COUNTRY,
  });
  const result = data?.cartLinesUpdate;
  if (result?.cart?.totalQuantity != null) updateCartBadge(result.cart.totalQuantity);
  return result;
}

/** 移除購物車商品 */
async function removeCartLine(lineId) {
  const cartId = localStorage.getItem('shopify_cart_id');
  const data = await shopifyFetch(`
    mutation RemoveCartLine($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode!)
    @inContext(country: $country) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `, { cartId, lineIds: [lineId], country: CART_COUNTRY });
  const result = data?.cartLinesRemove;
  if (result?.cart?.totalQuantity != null) updateCartBadge(result.cart.totalQuantity);
  return result;
}

/* 結帳頁由 Shopify 主理。2026-08-09 之後 Shopify 嘅「主要網域」已經係
   shop.oujikbeauty.com，所以 Storefront API 回嘅 checkoutUrl 本身已經
   係我哋自己個網域 —— 唔使再改 host。

   為咩要咁做：結帳同商店同一個母網域，cookie 先共用得。之前結帳喺
   5rerjn-mt.myshopify.com，GA4 會當佢係全新 session，每張單都歸功於
   「myshopify.com 推薦連結」而唔係 Google／Meta 廣告。

   （apex 同 www 指緊 Vercel，唔郁得。）

   呢個變數留空即係「唔改 host，照用 Shopify 回嘅網址」，係而家嘅正常
   狀態。除非 Shopify 主要網域又變返做 myshopify，否則唔好填。 */
const CHECKOUT_DOMAIN = '';

function brandCheckoutUrl(url) {
  if (!CHECKOUT_DOMAIN || !url) return url;
  try {
    const u = new URL(url);
    u.host = CHECKOUT_DOMAIN;
    return u.toString();
  } catch (e) {
    return url;
  }
}

/** 將自提點寫落 cart attributes，跟住張單過去 Shopify。

    ⚠️ Shopify 自己個結帳頁改唔到（唔係 Plus，冇 checkout extension），
    所以自提點揀完之後係擺喺 **cart attributes**：客喺我哋自己個購物袋
    頁揀，個值跟住 cart 過去，鋪頭喺訂單詳情就見到「順豐自提點」同
    「網點碼」，打單嗰陣照抄。
*/
async function setCartAttributes(attrs) {
  const cart = await getCart();
  if (!cart?.id) return null;
  const q = `mutation($cartId:ID!,$attributes:[AttributeInput!]!){
    cartAttributesUpdate(cartId:$cartId, attributes:$attributes){
      cart{ id attributes{ key value } }
      userErrors{ field message }
    }}`;
  const data = await shopifyFetch(q, {
    cartId: cart.id,
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value: String(value) })),
  });
  const e = data?.cartAttributesUpdate?.userErrors;
  if (e && e.length) { console.warn('cartAttributesUpdate', e); return null; }
  return data?.cartAttributesUpdate?.cart?.attributes || null;
}

/** 將自提點寫成「預填送貨地址」，令客喺結帳頁唔使再打一次地址。

    ⚠️ 呢個係成件事嘅關鍵。淨係寫 cart attributes 係唔夠嘅 ——
    客揀完自提點，入到結帳頁一樣要由頭填地址，等於做兩次嘢。
    實測（訪客結帳）：寫咗 deliveryAddressPreferences 之後，結帳頁
    嘅「地址 / 公寓套房 / 市 / 國家」全部已經填好，客淨係要填
    電郵、姓名、電話。

    ⚠️ 但係 **Shop Pay 用戶唔會受影響** —— 佢會照列返自己啲已存地址，
    唔理呢個 preference（實測過，佢仲會彈「選取的地址不完整」）。
    所以 cart attributes 嗰邊要照寫，鋪頭有得對返。
*/
async function setDeliveryAddressPreference(addr) {
  const cart = await getCart();
  if (!cart?.id) return null;
  const q = `mutation($cartId:ID!,$b:CartBuyerIdentityInput!){
    cartBuyerIdentityUpdate(cartId:$cartId, buyerIdentity:$b){
      cart{ id } userErrors{ field message } } }`;
  const d = await shopifyFetch(q, { cartId: cart.id, b: {
    deliveryAddressPreferences: [{ deliveryAddress: addr }] } });
  const e = d?.cartBuyerIdentityUpdate?.userErrors;
  if (e && e.length) { console.warn('cartBuyerIdentityUpdate', e); return null; }
  return true;
}

/** 前往 Shopify 結帳 */
async function goToCheckout() {
  const cart = await getCart();
  if (!cart?.checkoutUrl) return;
  // 呢個係網站呢邊最後一個追蹤得到嘅動作 —— 之後就跳咗去 Shopify。
  if (typeof trackBeginCheckout === 'function') trackBeginCheckout(cart);
  let url = brandCheckoutUrl(cart.checkoutUrl);
  if (typeof decorateCheckoutUrl === 'function') url = decorateCheckoutUrl(url);
  window.location.href = url;
}

// ─────────────────────────────────────────────
// 會員 API（Customer Account API — OAuth 2.0 PKCE）
// ─────────────────────────────────────────────

const CUSTOMER_API_CLIENT_ID = '1f1d6e0a-746a-4c4e-9ca5-7006981c9ade';
const CUSTOMER_API_REDIRECT_URI = window.location.origin + '/account.html';
const SHOP_ID = '76534055070';

/** 取得 Shop ID（用於 Customer Account API 端點） */
function getShopId() {
  return SHOP_ID;
}

/** 產生隨機字串（PKCE 用） */
function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/** 產生 PKCE code challenge */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 會員登入（跳轉到 Shopify 登入頁面） */
async function customerLogin() {
  const shopId = getShopId();

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);
  const nonce = generateRandomString(32);

  sessionStorage.setItem('ca_code_verifier', codeVerifier);
  sessionStorage.setItem('ca_state', state);
  sessionStorage.setItem('ca_nonce', nonce);

  const authUrl = new URL(`https://shopify.com/authentication/${shopId}/oauth/authorize`);
  authUrl.searchParams.set('client_id', CUSTOMER_API_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', CUSTOMER_API_REDIRECT_URI);
  authUrl.searchParams.set('scope', 'openid email customer-account-api:full');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  window.location.href = authUrl.toString();
}

/** 處理 OAuth 回調（從 Shopify 登入頁面返回後） */
async function handleAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code) return false;

  const savedState = sessionStorage.getItem('ca_state');
  if (state !== savedState) { console.error('State 不符'); return false; }

  const codeVerifier = sessionStorage.getItem('ca_code_verifier');
  const shopId = getShopId();

  try {
    const res = await fetch(`https://shopify.com/authentication/${shopId}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CUSTOMER_API_CLIENT_ID,
        redirect_uri: CUSTOMER_API_REDIRECT_URI,
        code,
        code_verifier: codeVerifier,
      }),
    });

    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('customer_access_token', data.access_token);
      if (data.id_token) localStorage.setItem('customer_id_token', data.id_token);
      if (data.refresh_token) localStorage.setItem('customer_refresh_token', data.refresh_token);
      if (data.expires_in) {
        const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
        localStorage.setItem('customer_token_expires', expiresAt);
      }
      // 清除 URL 參數和暫存
      window.history.replaceState({}, '', window.location.pathname);
      sessionStorage.removeItem('ca_code_verifier');
      sessionStorage.removeItem('ca_state');
      sessionStorage.removeItem('ca_nonce');
      return true;
    }
  } catch (err) {
    console.error('Token 交換失敗:', err);
  }
  return false;
}

/** 使用 refresh_token 取得新的 access_token */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('customer_refresh_token');
  if (!refreshToken) return false;

  const shopId = getShopId();
  try {
    const res = await fetch(`https://shopify.com/authentication/${shopId}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CUSTOMER_API_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('customer_access_token', data.access_token);
      if (data.id_token) localStorage.setItem('customer_id_token', data.id_token);
      if (data.refresh_token) localStorage.setItem('customer_refresh_token', data.refresh_token);
      if (data.expires_in) {
        const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
        localStorage.setItem('customer_token_expires', expiresAt);
      }
      return true;
    }
  } catch (err) {
    console.error('Token 刷新失敗:', err);
  }
  return false;
}

/** 會員登出（撤銷 token + 清除 Shopify session） */
async function customerLogout() {
  const idToken = localStorage.getItem('customer_id_token');
  const refreshToken = localStorage.getItem('customer_refresh_token');
  const shopId = getShopId();

  // 1. 撤銷 refresh token（防止重用）
  if (refreshToken) {
    try {
      await fetch(`https://shopify.com/authentication/${shopId}/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: refreshToken,
          client_id: CUSTOMER_API_CLIENT_ID,
        }),
      });
    } catch (e) { /* 忽略 — 本地清除就夠 */ }
  }

  // 2. 清除本地 token
  localStorage.removeItem('customer_access_token');
  localStorage.removeItem('customer_id_token');
  localStorage.removeItem('customer_refresh_token');
  localStorage.removeItem('customer_token_expires');

  // 3. 跳去 Shopify logout endpoint 清除 server-side session
  //    Shopify 會清除 session cookie 再 redirect 回嚟
  if (idToken) {
    const logoutUrl = new URL(`https://shopify.com/authentication/${shopId}/logout`);
    logoutUrl.searchParams.set('id_token_hint', idToken);
    logoutUrl.searchParams.set('post_logout_redirect_uri', window.location.origin);
    window.location.href = logoutUrl.toString();
  } else {
    // 冇 id_token，只能清本地再 reload
    window.location.href = window.location.origin + '/account.html';
  }
}

/** 執行 Customer Account API GraphQL 請求 */
async function customerApiFetch(query) {
  const token = localStorage.getItem('customer_access_token');
  if (!token) return null;

  const shopId = getShopId();
  if (!shopId) return null;

  const res = await fetch(`https://shopify.com/${shopId}/account/customer/api/2025-01/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify({ query }),
  });

  if (res.status === 401) {
    // Token 過期，嘗試刷新
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = localStorage.getItem('customer_access_token');
      const retryRes = await fetch(`https://shopify.com/${shopId}/account/customer/api/2025-01/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': newToken,
        },
        body: JSON.stringify({ query }),
      });
      return retryRes.json();
    }
    // 刷新失敗，清除所有 token
    localStorage.removeItem('customer_access_token');
    localStorage.removeItem('customer_id_token');
    localStorage.removeItem('customer_refresh_token');
    localStorage.removeItem('customer_token_expires');
    return null;
  }

  return res.json();
}

/** 取得會員資料（Customer Account API GraphQL） */
async function getCustomer() {
  try {
    const data = await customerApiFetch(`query {
      customer {
        firstName
        lastName
        emailAddress { emailAddress }
        phoneNumber { phoneNumber }
        orders(first: 10) {
          edges {
            node {
              id name processedAt
              totalPrice { amount currencyCode }
              fulfillments(first: 1) { nodes { status } }
              financialStatus
            }
          }
        }
      }
    }`);

    if (!data) return null;

    if (data.errors) {
      console.error('Customer API errors:', data.errors);
      return null;
    }
    return data?.data?.customer;
  } catch (err) {
    console.error('取得會員資料失敗:', err);
    return null;
  }
}

/** 檢查是否已登入（同步檢查，不含刷新） */
function isLoggedIn() {
  const token = localStorage.getItem('customer_access_token');
  if (!token) return false;
  const expires = localStorage.getItem('customer_token_expires');
  if (expires && new Date(expires) < new Date()) {
    // Token 已過期，但可能有 refresh_token 可用
    // 不在這裡清除，讓 ensureLoggedIn() 處理刷新
    if (!localStorage.getItem('customer_refresh_token')) {
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_token_expires');
      return false;
    }
    // 有 refresh_token，先當作已登入，之後 API 呼叫會自動刷新
    return true;
  }
  return true;
}

/** 確保登入狀態（非同步，含 token 刷新） */
async function ensureLoggedIn() {
  const token = localStorage.getItem('customer_access_token');
  if (!token) return false;
  const expires = localStorage.getItem('customer_token_expires');
  if (expires && new Date(expires) < new Date()) {
    // Token 已過期，嘗試刷新
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_id_token');
      localStorage.removeItem('customer_refresh_token');
      localStorage.removeItem('customer_token_expires');
      return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────
// 心願單（本地 + 會員同步）
// ─────────────────────────────────────────────

function getWishlist() {
  return JSON.parse(localStorage.getItem('ouji_wishlist') || '[]');
}

function addToWishlist(product) {
  if (!isLoggedIn()) { customerLogin(); return; }
  const list = getWishlist();
  if (!list.find(p => p.id === product.id)) {
    list.push(product);
    localStorage.setItem('ouji_wishlist', JSON.stringify(list));
  }
  updateWishlistBadge();
  syncWishlistToShopify();
}

function removeFromWishlist(productId) {
  if (!isLoggedIn()) { customerLogin(); return; }
  const list = getWishlist().filter(p => p.id !== productId);
  localStorage.setItem('ouji_wishlist', JSON.stringify(list));
  updateWishlistBadge();
  syncWishlistToShopify();
}

function isInWishlist(productId) {
  return getWishlist().some(p => p.id === productId);
}

/** 將心願單同步到 Shopify customer metafield */
async function syncWishlistToShopify() {
  const list = getWishlist();
  const handles = list.map(p => p.handle).filter(Boolean);
  const value = JSON.stringify(handles);

  try {
    // 先取得 customer ID（metafieldsSet 需要 ownerId）
    const custData = await customerApiFetch(`query { customer { id } }`);
    const customerId = custData?.data?.customer?.id;
    if (!customerId) { console.warn('[Wishlist] sync skipped — no customer ID'); return; }

    const result = await customerApiFetch(`mutation {
      metafieldsSet(metafields: [{
        ownerId: "${customerId}",
        namespace: "custom",
        key: "wishlist",
        type: "json",
        value: ${JSON.stringify(value)}
      }]) {
        metafields { id namespace key }
        userErrors { field message }
      }
    }`);
    if (!result) return;
    if (result?.errors?.length) {
      console.error('心願單 GraphQL 錯誤:', result.errors);
    }
    if (result?.data?.metafieldsSet?.userErrors?.length) {
      console.error('心願單同步 userErrors:', result.data.metafieldsSet.userErrors);
    }
  } catch (e) {
    console.error('心願單同步失敗:', e);
  }
}

/** 從 Shopify 載入心願單並合併本地資料 */
async function loadWishlistFromShopify() {
  try {
    const data = await customerApiFetch(`query {
      customer {
        metafield(namespace: "custom", key: "wishlist") {
          value
        }
      }
    }`);
    if (!data) return;
    if (data?.errors?.length) {
      console.error('心願單載入 GraphQL 錯誤:', data.errors);
      return;
    }

    const raw = data?.data?.customer?.metafield?.value;
    const localList = getWishlist();

    // 遠端為空：如果本地有心願單，push 上 Shopify
    if (!raw) {
      if (localList.length > 0) {
        await syncWishlistToShopify();
      }
      return;
    }

    const remoteHandles = JSON.parse(raw);
    if (!Array.isArray(remoteHandles) || remoteHandles.length === 0) {
      if (localList.length > 0) {
        await syncWishlistToShopify();
      }
      return;
    }

    const localHandles = new Set(localList.map(p => p.handle));

    // 找出本地冇但遠端有嘅 handle
    const missing = remoteHandles.filter(h => !localHandles.has(h));
    if (missing.length === 0 && localList.length === remoteHandles.length) return;

    // 抓取缺少嘅商品資料
    for (const handle of missing) {
      try {
        const product = await getProduct(handle);
        if (product) {
          localList.push(product);
        }
      } catch (e) { /* 商品可能已下架 */ }
    }

    localStorage.setItem('ouji_wishlist', JSON.stringify(localList));
    updateWishlistBadge();

    // 如果本地有遠端冇嘅，反向同步
    const allHandles = localList.map(p => p.handle).filter(Boolean);
    if (allHandles.length !== remoteHandles.length ||
        allHandles.some(h => !remoteHandles.includes(h))) {
      await syncWishlistToShopify();
    }
  } catch (e) {
    console.error('載入遠端心願單失敗:', e);
  }
}

// ─────────────────────────────────────────────
// UI 工具函數
// ─────────────────────────────────────────────

/** 格式化價格顯示 */
function formatPrice(amount, currencyCode = 'HKD') {
  const num = parseFloat(amount);
  if (Number.isInteger(num)) {
    return `HK$${num.toLocaleString('en-US')}`;
  }
  return `HK$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* 2026 開業優惠：全單 88 折去到 9 月 15 日 23:59（香港時間）。
   Shopify 喺結帳先真正套用折扣，所以產品頁顯示「約」價；個客要求唔
   顯示毫子／仙位，視覺價用四捨五入整數，最後收費仍以結帳為準。
   到期後 helper 自動退回正常售價，唔會留低過期優惠價。 */
const OUJI_OPENING_PROMO = Object.freeze({
  rate: 0.88,
  endsAt: new Date('2026-09-15T23:59:00+08:00').getTime(),
});

function isOujiOpeningPromoActive(now = Date.now()) {
  return now <= OUJI_OPENING_PROMO.endsAt;
}

function formatWholePrice(amount) {
  const num = parseFloat(amount);
  if (!Number.isFinite(num)) return '';
  return `HK$${Math.round(num).toLocaleString('en-US')}`;
}

function oujiPromoPriceText(amount) {
  const num = parseFloat(amount);
  if (!Number.isFinite(num)) return '';
  if (!isOujiOpeningPromoActive()) return formatPrice(num);
  return `約 ${formatWholePrice(num * OUJI_OPENING_PROMO.rate)}`;
}

function oujiPromoPriceHTML(amount, { detail = false, search = false } = {}) {
  const num = parseFloat(amount);
  if (!Number.isFinite(num)) return '';
  if (!isOujiOpeningPromoActive()) return formatPrice(num);

  const discounted = formatWholePrice(num * OUJI_OPENING_PROMO.rate);
  const original = formatWholePrice(num);
  const aria = `全單 88 折後約 ${discounted}，原價 ${original}；實際金額以結帳為準`;

  if (search) {
    return `<span class="ouji-promo-price ouji-promo-price--search" aria-label="${aria}">
      <small>88 折約</small>${discounted}
    </span>`;
  }

  if (!detail) {
    return `<span class="ouji-promo-price ouji-promo-price--card" aria-label="${aria}">
      <span class="ouji-promo-price__sale"><small>88 折後約</small>${discounted}</span>
      <s class="ouji-promo-price__original" aria-hidden="true">${original}</s>
    </span>`;
  }

  return `<span class="ouji-promo-price ouji-promo-price--detail" aria-label="${aria}">
    <span class="ouji-promo-price__badge">開業限時優惠 <b>88 折</b></span>
    <span class="ouji-promo-price__row">
      <strong class="ouji-promo-price__sale">${discounted}</strong>
      <s class="ouji-promo-price__original" aria-hidden="true">${original}</s>
    </span>
    <small class="ouji-promo-price__note">88 折後約價・結帳自動減・實際金額以結帳為準</small>
  </span>`;
}

/* 商品卡由首頁、分類、願望清單同相關產品各自生成；首頁精選大卡亦有
   自己嘅價錢節點。與其喺幾套 renderer 複製同一段優惠邏輯，呢度統一
   處理呢啲節點；新卡插入 DOM
   亦會即時補上。原有 compare-at 價喺活動期間收埋，避免同 88 折原價
   疊成三個數。 */
function initOujiPromoPrices() {
  if (!isOujiOpeningPromoActive() || !document.body) return;
  document.documentElement.classList.add('has-ouji-opening-promo');
  const priceSelector = '.product-card__price, .home-feat__price, .site-search__price, .product-info__price';

  const enhance = (root) => {
    const nodes = [];
    if (root.nodeType === 1 && root.matches?.(priceSelector)) {
      nodes.push(root);
    }
    root.querySelectorAll?.(priceSelector).forEach((node) => nodes.push(node));

    nodes.forEach((node) => {
      if (node.dataset.oujiPromoReady === '1' || node.textContent.includes('售完')) return;
      const match = node.textContent.replace(/,/g, '').match(/HK\$\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (!match) return;
      const amount = parseFloat(match[1]);
      if (!Number.isFinite(amount)) return;
      node.dataset.oujiPromoReady = '1';
      node.innerHTML = oujiPromoPriceHTML(amount, {
        detail: node.classList.contains('product-info__price'),
        search: node.classList.contains('site-search__price'),
      });
    });
  };

  enhance(document.body);
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === 1) enhance(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOujiPromoPrices, { once: true });
} else {
  initOujiPromoPrices();
}

/** 更新購物袋數字徽章 */
function updateCartBadge(count) {
  document.querySelectorAll('.header__cart-count, .mobile-bottom-nav__badge, .cart-badge').forEach(el => {
    if (count > 0) {
      el.textContent = count;
      el.style.display = 'flex';
    } else {
      el.textContent = '0';
      el.style.display = 'none';
    }
  });
  // 購物車 icon 變色（desktop + mobile）
  document.querySelectorAll('.header__action-btn--cart').forEach(el => {
    el.classList.toggle('has-items', count > 0);
  });
  document.querySelectorAll('.mobile-bottom-nav__badge').forEach(el => {
    const item = el.closest('.mobile-bottom-nav__item');
    if (item) item.classList.toggle('has-items', count > 0);
  });
}

/** 更新心願單圖示（只變色，不顯示數字） */
function updateWishlistBadge() {
  const count = getWishlist().length;
  // 隱藏所有數字 badge
  document.querySelectorAll('.wishlist-badge').forEach(el => {
    el.style.display = 'none';
  });
  // 心願單 icon 變色（desktop + mobile）
  document.querySelectorAll('.header__action-btn--wishlist').forEach(el => {
    el.classList.toggle('has-items', count > 0);
  });
  document.querySelectorAll('.mobile-bottom-nav__wishlist-badge').forEach(el => {
    el.style.display = 'none';
    const item = el.closest('.mobile-bottom-nav__item');
    if (item) item.classList.toggle('has-items', count > 0);
  });
}

/** 初始化頁面（所有頁面共用）

    ⚠️ 呢個 function **唔准 throw**。每一版嘅 DOMContentLoaded 第一句都係
    `await initPage()` —— 佢一 reject，後面攞產品、畫 grid、行 initCatalog
    全部都唔會行，客見到嘅就係白畫面。

    以前 `getCart()` 就係咁殺人：客個 localStorage 有 cart id（即係返頭客），
    Shopify 一抽風，`shopifyFetch` 拋錯 → initPage reject → 成版死。
    新客冇 cart id，getCart 早早 return null，所以完全撞唔到 —— 呢個就係
    「有時得有時唔得」嘅來源。

    購物袋數字攞唔到係細事，畫唔到成版係大事。所以逐步包住，各不牽連。 */
async function initPage() {
  // 更新購物袋數量
  try {
    const cart = await getCart();
    if (cart) updateCartBadge(cart.totalQuantity);
  } catch (e) {
    console.warn('[OUJI] 攞唔到購物袋，照畫版：', e);
  }

  // 更新心願單數量
  try { updateWishlistBadge(); } catch (e) { /* 徽章而已，唔好連累成版 */ }

  // 更新會員狀態
  try {
    if (isLoggedIn()) {
      document.querySelectorAll('[data-show-logged-in]').forEach(el => el.style.display = '');
      document.querySelectorAll('[data-show-logged-out]').forEach(el => el.style.display = 'none');

      // 已登入：背景同步心願清單
      loadWishlistFromShopify().catch(() => {});
    }
  } catch (e) {
    console.warn('[OUJI] 會員狀態更新唔到：', e);
  }
}

/** 生成商品卡片 HTML */
function productCardHTML(product) {
  const image = product.images?.edges?.[0]?.node;
  const price = product.priceRange?.minVariantPrice;
  const comparePrice = product.compareAtPriceRange?.minVariantPrice;
  const variant = product.variants?.edges?.[0]?.node;
  const isOnSale = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount);
  const isSoldOut = !variant?.availableForSale;

  return `
    <article class="product-card" data-product-id="${product.id}">
      <a href="product.html?handle=${product.handle}" class="product-card__image-link">
        <div class="product-card__image-wrap">
          ${image ? `<img src="${image.url}" alt="${image.altText || product.title}" loading="lazy">` : '<div class="product-card__no-image"></div>'}
          ${isSoldOut ? '<span class="product-card__badge product-card__badge--sold-out">售完</span>' : ''}
          ${isOnSale && !isSoldOut ? '<span class="product-card__badge product-card__badge--sale">特價</span>' : ''}
        </div>
      </a>
      <div class="product-card__info">
        <a href="product.html?handle=${product.handle}" class="product-card__title">${product.title}</a>
        <div class="product-card__prices">
          <span class="product-card__price">${formatPrice(price.amount)}</span>
          ${isOnSale ? `<span class="product-card__compare-price">${formatPrice(comparePrice.amount)}</span>` : ''}
        </div>
        <button class="product-card__wishlist-btn ${isInWishlist(product.id) ? 'is-active' : ''}"
          onclick="toggleWishlist(event, ${JSON.stringify(product).replace(/"/g, '&quot;')})"
          aria-label="加入心願單">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>
    </article>
  `;
}

/** 切換心願單 */
window.toggleWishlist = function(e, product) {
  e.preventDefault();
  e.stopPropagation();
  if (isInWishlist(product.id)) {
    removeFromWishlist(product.id);
    e.currentTarget.classList.remove('is-active');
  } else {
    addToWishlist(product);
    e.currentTarget.classList.add('is-active');
  }
};

/* ============================================
   Category taxonomy
   Maps the site nav's ?cat= slugs onto product data (productType /
   tags / title), so browsing works without a Shopify collection per
   category. Keywords are matched case-insensitively.
   ============================================ */
const CATEGORY_TAXONOMY = {
  skincare: {
    label: '護膚',
    keywords: ['skincare', '護膚', '스킨케어'],
    subs: {
      cleanser:    { label: '潔面',     keywords: ['cleanser', 'cleansing', 'cleansing foam', '潔面', '洗面', '클렌징'] },
      toner:       { label: '爽膚水',   keywords: ['toner', '爽膚水', '化妝水', '토너'] },
      pad:         { label: '棉片',     keywords: ['pad', '棉片', '化妝棉', '패드'] },
      serum:       { label: '精華液',   keywords: ['serum', 'essence', 'ampoule', '精華', '安瓶', '에센스', '앰플'] },
      /* 眼霜個名一定有「霜／cream」，所以本來 24 件眼部護理全部同時
         中晒乳液 —— 「眼部護理」變成乳液嘅子集，喺分類入口度直接
         消失咗。眼霜屬於眼部護理，唔應該又計落乳液，所以剔走佢哋。 */
      moisturizer: { label: '乳液',     exclude: ['eye'],
                     keywords: ['moisturizer', 'lotion', 'cream', 'emulsion', '乳液', '面霜', '크림'] },
      mask:        { label: '面膜',     keywords: ['mask', 'sheet mask', 'mask pack', '面膜', '마스크', '팩'] },
      eye:         { label: '眼部護理', keywords: ['eye cream', 'eye lifter', 'eye serum', '眼霜', '眼部', '아이'] },
      sunscreen:   { label: '防曬',     keywords: ['sunscreen', 'suncare', 'sun cream', '防曬', '선크림', '선케어'] },
      spot:        { label: '局部護理', keywords: ['局部護理', '痘痘貼', 'spot'] },
      exfoliator:  { label: '去角質',   keywords: ['去角質', 'peeling', 'exfoliator'] },
      kit:         { label: '套裝',     keywords: ['套裝護膚', '套裝', 'kit'] },
    },
  },
  makeup: {
    label: '彩妝',
    keywords: ['makeup', '彩妝', '메이크업'],
    /* 彩妝子分類只可以睇產品名 —— Shopify 個 tag 亂到唔用得：實測高光
       被標成「頰彩」、胭脂被標成「修容」，用 tag 分出嚟係頰彩 39／修容
       39，兩格都係錯嘅數。同一套規則 scripts/makeup_subcats.py 有一份，
       改就兩邊一齊改。

       `bucket` 係五大類，互斥 —— 一件貨只入一格，順序由最 specific 行
       到最闊（唇 → 眼 → 底妝 → 修容 → 頰彩），所以「唇頰彩妝」歸唇妝。
       `parent` 係細分類，一定係佢阿爸嗰格入面嘅一部分，咁篩選側欄先
       收得埋佢哋，唔會多出幾格重複嘅。
       `keywords` 留返畀 section 層面用（categoryKeywords 會合埋佢哋
       decide 邊啲貨算彩妝），子分類本身唔再靠佢。 */
    subs: {
      base:       { label: '底妝',   bucket: 'base',
                    keywords: ['foundation', 'cushion', 'concealer', 'base makeup', '底妝', '粉底', '氣墊', '遮瑕'] },
      foundation: { label: '粉底',   parent: 'base', title: /粉底|foundation/i,
                    keywords: ['foundation', '粉底'] },
      cushion:    { label: '氣墊',   parent: 'base', title: /氣墊|cushion/i,
                    keywords: ['cushion', '氣墊'] },
      concealer:  { label: '遮瑕',   parent: 'base', title: /遮瑕|concealer/i,
                    keywords: ['concealer', '遮瑕'] },
      eye:        { label: '眼妝',   bucket: 'eye',
                    keywords: ['eyeshadow', 'eye shadow', 'eyeliner', 'mascara', 'brow', '眼影', '眼線', '睫毛', '眉'] },
      eyeshadow:  { label: '眼影',   parent: 'eye', title: /眼影|eyeshadow/i,
                    keywords: ['eyeshadow', 'eye shadow', '眼影'] },
      eyeliner:   { label: '眼線',   parent: 'eye', title: /眼線|eyeliner/i,
                    keywords: ['eyeliner', 'eye liner', '眼線'] },
      mascara:    { label: '睫毛膏', parent: 'eye', title: /睫毛|mascara/i,
                    keywords: ['mascara', '睫毛'] },
      brow:       { label: '眉筆',   parent: 'eye', title: /眉筆|眉粉|染眉|\bbrow\b/i,
                    keywords: ['brow', 'eyebrow', '眉'] },
      lip:        { label: '唇妝',   bucket: 'lip',
                    keywords: ['lipstick', 'lip tint', 'lip gloss', 'lip balm', '唇膏', '唇釉', '唇彩', '唇'] },
      lipstick:   { label: '唇膏',   parent: 'lip', title: /唇膏|lipstick/i,
                    keywords: ['lipstick', '唇膏'] },
      liptint:    { label: '唇釉',   parent: 'lip', title: /唇釉|tint/i,
                    keywords: ['tint', '唇釉'] },
      lipgloss:   { label: '唇彩',   parent: 'lip', title: /唇彩|唇蜜|gloss/i,
                    keywords: ['gloss', '唇彩'] },
      cheek:      { label: '頰彩',   bucket: 'cheek',
                    keywords: ['blush', '胭脂', '腮紅', '頰彩'] },
      blush:      { label: '胭脂',   parent: 'cheek', title: /胭脂|腮紅|blush/i,
                    keywords: ['blush', '胭脂'] },
      contour:    { label: '修容',   bucket: 'contour',
                    keywords: ['contour', 'bronzer', 'highlighter', '修容', '高光', '打亮'] },
      highlight:  { label: '高光',   parent: 'contour', title: /高光|打亮|highlight/i,
                    keywords: ['highlighter', 'highlight', '高光'] },
      setting:    { label: '定妝',   bucket: 'setting', title: /定妝|fixer|setting/i,
                    keywords: ['定妝噴霧', '定妝', 'fixer', 'setting'] },
      lash:       { label: '假睫毛', bucket: 'lash',    title: /假睫毛|eyelash/i,
                    keywords: ['假睫毛', 'eyelash'] },
    },
  },
  kpop: {
    label: 'K-pop 周邊',
    keywords: ['k-pop', 'kpop', '周邊', '專輯', '寫真書'],
    // Split by group first, by format second. A K-pop shopper arrives
    // knowing whose album they want — "專輯 vs 寫真書" is 24 against 1
    // and answers a question nobody asked.
    subs: {
      seventeen: { label: 'SEVENTEEN', keywords: ['seventeen'] },
      ive: { label: 'IVE', keywords: ['ive'] },
      illit: { label: 'ILLIT', keywords: ['illit'] },
      straykids: { label: 'Stray Kids', keywords: ['stray kids'] },
      enhypen: { label: 'ENHYPEN', keywords: ['enhypen'] },
      lesserafim: { label: 'LE SSERAFIM', keywords: ['le sserafim'] },
      gidle: { label: '(G)I-DLE', keywords: ['(g)i-dle', 'gidle', 'yuqi'] },
      twice: { label: 'TWICE', keywords: ['twice'] },
      txt: { label: 'TXT', keywords: ['tomorrow x together', 'yeonjun'] },
      album: { label: '專輯', keywords: ['專輯'], axis: 'format' },
      photobook: { label: '寫真書', keywords: ['寫真書'], axis: 'format' },
    },
  },
  lens: {
    label: '隱形眼鏡',
    keywords: ['隱形眼鏡', 'contact lens', '美瞳', '日拋'],
    subs: {
      feliamo: { label: 'Feliamo', keywords: ['feliamo'] },
      lilmoon: { label: 'Lilmoon', keywords: ['lilmoon'] },
      molak: { label: 'Molak', keywords: ['molak'] },
      nscollection: { label: "N's Collection", keywords: ["n's collection", 'ns collection'] },
      topards: { label: 'TOPARDS', keywords: ['topards'] },
    },
  },
  /* 老闆 2026-08-31：「併入『彩妝工具』，個格改名做『美妝工具』。」
     44 件髮梳、髮夾、髮圈、擦髮巾本來淨係喺「其他」度，比公仔仲多成倍。
     而家同化妝掃、粉撲、美容小工具一齊，個格改名做「美妝工具」——
     因為入面唔再淨係彩妝用嘅嘢。
     ⚠️ productType 保持「美髮工具」四個字，改嘅只係呢一格嘅名。 */
  tools: {
    label: '美妝工具',
    keywords: ['化妝工具', '美容工具', '美髮工具', 'brush', 'puff', 'tool'],
    subs: {
      brush:  { label: '化妝掃',   keywords: ['化妝掃', '掃', 'brush'] },
      puff:   { label: '粉撲海綿', keywords: ['粉撲', '美妝蛋', 'puff', 'sponge'] },
      hair:   { label: '美髮工具', keywords: ['美髮工具'] },
      beauty: { label: '美容小工具', keywords: ['美容工具', '睫毛夾', '黑頭', 'tweezer'] },
    },
  },
  bath: {
    label: '沐浴洗護',
    /* 老闆 2026-08-29：洗頭水、沐浴露越入越多，要有自己一格；潔面都放埋落嚟。
       ⚠️ 潔面同時屬護膚 —— 兩邊都要有，唔可以搬走。老闆原話：
       「你唔好因為某一個類別而犧牲另一個類別」。 */
    keywords: ['潔面', '洗髮', '護髮', '沐浴', '身體護理'],
    subs: {
      cleanser: { label: '潔面', keywords: ['潔面'] },
      shampoo:  { label: '洗髮', keywords: ['洗髮'] },
      hair:     { label: '護髮', keywords: ['護髮'] },
      body:     { label: '沐浴', keywords: ['沐浴'] },
      lotion:   { label: '身體乳', keywords: ['身體護理'] },
    },
  },
  health: {
    label: '保健品',
    keywords: ['保健品'],
    /* 子分類靠標題 —— 保健品全部得一個 productType，成分先分得開 */
    subs: {
      probiotics: { label: '益生菌',  keywords: ['益生菌', '乳酸菌', '프로바이오틱스'] },
      collagen:   { label: '膠原蛋白', keywords: ['膠原蛋白', 'collagen'] },
      vitamin:    { label: '維他命',  keywords: ['維他命', '維生素', 'vitamin'] },
      ginseng:    { label: '紅參人參', keywords: ['紅參', '人參', 'ginseng'] },
      kombucha:   { label: '康普茶',  keywords: ['康普茶', 'kombucha'] },
    },
  },
  seasonal: {
    label: '季節性',
    /* 防曬同護手霜跟季節走，所以喺呢度再出現一次；佢哋喺護膚／沐浴嗰邊
       照樣留住。呢個 section 係「疊」出嚟嘅，唔係搬。 */
    /* 老闆 2026-09-02：「嗰啲潤唇膏⋯係四季嘅產品」——
       同護手霜一樣，天氣一凍就要，唔係彩妝。 */
    keywords: ['防曬', '護手霜', '唇部護理', '涼感', '止汗'],
    subs: {
      sun:     { label: '防曬',   keywords: ['防曬'] },
      hand:    { label: '護手霜', keywords: ['護手霜'] },
      cooling: { label: '涼感止汗', keywords: ['涼感', '止汗'] },
    },
  },
  /* 老闆 2026-08-31：「嗰啲公仔，你應該有個新嘅分類叫『公仔』。」
     之前我自作主張改咗個型號做「公仔玩具」，仲淨係靠「其他」收住佢哋 ——
     客要行到最後一格先搵到一隻 Hello Kitty。而家佢自己一格。
     ⚠️ 型號一律用「公仔」兩個字，唔好再自己改名。 */
  toys: {
    label: '公仔',
    /* 2026-09-02 試過將角色美妝（Sanrio 護手霜、蠟筆小新唇膏）都收埋入嚟，
       老闆睇完否決：「有一個係潤唇膏，有一個係潤手霜嘅⋯根本上都唔當係公仔」。
       所以呢格淨係收實物精品 —— 公仔、盲盒、掛件、扭蛋。
       卡通美妝留返喺佢自己嘅型號格（護手霜、唇部護理⋯），唔好再搬入嚟。 */
    keywords: ['公仔', '盲盒', '毛絨', '掛件', '匙扣', '扭蛋', '玩具'],
    subs: {
      blindbox:  { label: '盲盒',     keywords: ['盲盒', '扭蛋'] },
      plush:     { label: '毛絨公仔', keywords: ['毛絨', '公仔'] },
      charm:     { label: '掛件匙扣', keywords: ['掛件', '匙扣', '掛繩'] },
    },
  },
  fragrance: {
    label: '香水香氛',
    keywords: ['香水', '身體噴霧', 'perfume', 'body mist'],
    subs: {
      perfume: { label: '香水',     keywords: ['香水', 'perfume'] },
      mist:    { label: '身體噴霧', keywords: ['身體噴霧', 'body mist'] },
    },
  },
};

// Text blob a product is matched against
/* Two haystacks, deliberately. productType and tags are curated per
   product; the title is whatever the brand called the thing. Matching the
   title put every TIRTIR "Mask Fit" cushion under 護膚 › 面膜 — thirteen
   cushions and not one face mask — so the title is only consulted when
   the curated fields say nothing at all. */
function productHaystack(p) {
  return [p.productType || '', (p.tags || []).join(' ')].join(' ').toLowerCase();
}

function productHaystackLoose(p) {
  return `${productHaystack(p)} ${(p.title || '').toLowerCase()}`;
}

function matchesKeywords(p, keywords) {
  // An unknown section used to match everything, so a typo in a section id
  // showed the whole catalogue under the wrong heading.
  if (!keywords || !keywords.length) return false;
  const hit = (hay) => keywords.some((k) => hay.includes(String(k).toLowerCase()));
  if (hit(productHaystack(p))) return true;
  // Untyped, untagged products still have to land somewhere.
  return !p.productType && !(p.tags || []).length && hit(productHaystackLoose(p));
}

/* 彩妝五大類嘅產品名規則。順序即係優先次序：行到邊個 match 就歸邊個，
   唔會再試下面嘅，所以一件貨只入一格。「唇頰兩用」嗰類歸唇妝，因為個名
   以唇行先 —— 呢個係有意嘅，唔係 bug。

   每個字都係由真貨度執返嚟，唔係憑空砌：
     唇線／唇筆    唇線筆、纖細唇筆（Heart Percent、UNLEASHIA、AMUSE）
     唇頰          唇頰暈染棒、唇頰兩用膏、滾珠唇頰露
     唇膜／唇凍    睡眠唇膜、牛油唇膜、成膜唇凍
     tint          「Laka Fruity Glam Tint 禮盒」呢種淨係得英文名嘅
                   （加咗字界，唔會撞到 tinted 防曬）
     臥蠶／閃粉    臥蠶製造筆、星塵閃粉、月光液體閃粉（全部係眼部貨）
     定妝          定妝噴霧 11 件（SO Natural 8＋TIRTIR 2＋Maybelline 1）
                   ——「定妝粉」本來就喺度，放寬做「定妝」一次過收埋
     底霜          光感底霜（妝前打底）
     水光棒        Radiance Balm 水光棒（打亮用）
     多用彩膏／多用膏  dasique 兩支多用彩膏，臉頰為主

   ⚠️ 同 scripts/makeup_subcats.py 嘅 RULES 係同一套，改就兩邊一齊改，
   否則頁面同 script 會報唔同嘅件數。 */
const MAKEUP_RULES = [
  ['lip',     /唇膏|唇釉|唇彩|唇蜜|唇泥|唇霜|唇部|唇線|唇筆|唇頰|唇膜|唇凍|\btint\b|lip/i],
  ['eye',     /眼影|眼線|睫毛|眉筆|眉粉|染眉|眼彩|臥蠶|閃粉|eyeshadow|eyeliner|mascara|\bbrow\b/i],
  ['base',    /粉底|氣墊|遮瑕|妝前|飾底|蜜粉|定妝|素顏霜|底霜|cushion|foundation|concealer|primer/i],
  ['contour', /修容|高光|打亮|陰影|水光棒|contour|highlight|shading/i],
  ['cheek',   /胭脂|腮紅|頰彩|多用彩膏|多用膏|blush|cheek/i],
];

function makeupBucket(p) {
  const hit = MAKEUP_RULES.find(([, re]) => re.test(p.title || ''));
  return hit ? hit[0] : null;
}

/* 一個子分類收唔收呢件貨。彩妝行上面嘅產品名規則，其餘照舊睇
   標題＋標籤＋類型（matchesKeywords）。 */
function subMatch(section, id, p) {
  const sub = CATEGORY_TAXONOMY[section]?.subs?.[id];
  if (!sub) return false;
  if (sub.bucket) return makeupBucket(p) === sub.bucket;
  if (sub.parent) return makeupBucket(p) === sub.parent && sub.title.test(p.title || '');
  if (!matchesKeywords(p, sub.keywords)) return false;
  // 專門嗰格有優先權：中咗 `exclude` 入面嗰啲格就唔算呢格嘅貨。
  return !(sub.exclude || []).some((other) =>
    matchesKeywords(p, CATEGORY_TAXONOMY[section]?.subs?.[other]?.keywords));
}

// Collect the keyword set for a section (+ optional subcategory)
function categoryKeywords(section, cat) {
  const sec = CATEGORY_TAXONOMY[section];
  if (!sec) return [];
  if (cat && sec.subs && sec.subs[cat]) return sec.subs[cat].keywords;
  const own = sec.keywords || [];
  const fromSubs = sec.subs ? Object.values(sec.subs).flatMap((s) => s.keywords) : [];
  return [...own, ...fromSubs];
}

function categoryLabel(section, cat) {
  const sec = CATEGORY_TAXONOMY[section];
  if (!sec) return '';
  if (cat && sec.subs && sec.subs[cat]) return sec.subs[cat].label;
  return sec.label || '';
}

/**
 * Products for a section/subcategory. Tries the matching Shopify
 * collection first; if that collection doesn't exist (or is empty),
 * falls back to scanning the catalogue and filtering by taxonomy.
 * Always applies the subcategory filter when `cat` is given.
 */
async function getCategoryProducts({ section, cat = null } = {}) {
  let products = [];
  try {
    // Paged, not `first: 48`. The old cap silently decided which brands the
    // 護膚 page showed — whichever four happened to land in the first 48 of
    // the collection — and there was nothing on screen to say so.
    const viaCollection = await getAllProducts({ collectionHandle: section });
    products = viaCollection?.edges?.map((e) => e.node) ?? [];
  } catch (e) {
    products = [];
  }
  if (!products.length) {
    /* 呢條後備路以前冇包 try —— collection 攞唔到、全店目錄又拋錯，
       個 rejection 就一直冒上去 DOMContentLoaded，成版唔畫。
       兩條路都斷 = 「攞唔到目錄」，唔係「呢個分類冇貨」，
       要分得清，否則客見到嘅係「暫時未有產品」，佢會以為真係冇貨。 */
    try {
      const all = await getAllProducts();
      const everything = all?.edges?.map((e) => e.node) ?? [];
      products = everything.filter((p) => matchesKeywords(p, categoryKeywords(section, null)));
    } catch (e) {
      window.OUJI_CATALOG_FAILED = true;
      products = [];
      console.error('[OUJI] 攞唔到目錄：', e);
    }
  }
  if (cat) {
    // 彩妝行產品名規則（睇 subMatch），其餘照舊行 keyword。
    products = products.filter((p) => (CATEGORY_TAXONOMY[section]?.subs?.[cat]
      ? subMatch(section, cat, p)
      : matchesKeywords(p, categoryKeywords(section, cat))));
  }
  return products;
}

/**
 * Reflect the active section/subcategory in the page chrome:
 * banner title, breadcrumb tail and document title.
 */
function applyCategoryHeading(section, cat) {
  // Without a subcategory this used to bail, leaving whichever heading and
  // <title> the page shipped with — /collections/makeup read "護膚".
  const label = categoryLabel(section, cat);
  if (!label) return;
  const sectionLabel = categoryLabel(section, null);

  const title = document.querySelector('.category-banner__title');
  if (title) title.textContent = label;

  const crumb = document.querySelector('.breadcrumb');
  if (crumb && !crumb.dataset.categoryApplied) {
    crumb.dataset.categoryApplied = '1';
    const tail = crumb.querySelector('span:last-child');
    if (tail && !tail.classList.contains('breadcrumb__sep')) tail.textContent = label;
    // Insert the parent section ahead of the subcategory
    if (tail && sectionLabel && sectionLabel !== label) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb__sep';
      sep.textContent = '/';
      const parent = document.createElement('span');
      parent.textContent = sectionLabel;
      crumb.insertBefore(parent, tail);
      crumb.insertBefore(sep, tail);
    }
  }

  document.title = `${label} — OUJI`;
}

/** Friendly state for a category that currently has no products. */
function showCategoryEmpty(section, cat) {
  // The catalogue renders into [data-catalog]; .product-grid only exists
  // once there are products to put in it. Writing into the grid meant an
  // empty category rendered nothing at all — a blank page under a heading,
  // with no explanation.
  const grid = document.querySelector('[data-catalog]')
    || document.querySelector('.product-grid');
  const count = document.querySelector('.filter-bar__count');
  if (count) count.textContent = '顯示 0 件產品';
  if (!grid) return;
  const label = categoryLabel(section, cat) || '這個分類';

  /* 攞唔到目錄同「真係冇貨」係兩件事。以前兩樣都出同一句「暫時未有產品」，
     客會以為 OUJI 冇嘢賣 —— 其實只係一次網絡失敗，撳一下就返到嚟。 */
  if (window.OUJI_CATALOG_FAILED) {
    grid.innerHTML =
      '<div class="category-empty category-empty--retry">' +
      '<div class="category-empty__icon"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></div>' +
      '<p class="category-empty__title">一時載入唔到產品</p>' +
      '<p class="category-empty__text">可能係網絡短暫唔穩定。撳一下再試，通常即刻返到嚟。</p>' +
      '<button type="button" class="btn btn--primary category-empty__retry">再試一次</button>' +
      '</div>';
    const again = grid.querySelector('.category-empty__retry');
    if (again) again.addEventListener('click', () => location.reload());
    return;
  }

  grid.innerHTML =
    '<div class="category-empty">' +
    '<div class="category-empty__icon"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>' +
    '<p class="category-empty__title">' + label + '暫時未有產品</p>' +
    '<p class="category-empty__text">我們正在為你搜羅更多好物，先看看其他系列吧。</p>' +
    '<a href="category.html" class="btn btn--primary">瀏覽所有產品</a>' +
    '</div>';
}

/* ============================================================
   煩惱分類 —— 客唔係諗住「我要支精華」，係諗住「我塊面又爆瘡」。
   分類頁係按貨品類型切，呢個係按客自己講得出嘅煩惱切。

   ⚠️ 呢度**唔係**話邊支貨醫得好邊個問題。我哋唔可以講療效。
   每格淨係做一件事：將講到呢個範疇嘅貨揀出嚟畀客自己揀。
   所以文案一律寫「揀畀你睇」「大家搵得最多」，唔准寫「治好」
   「有效改善」「消炎」呢類字。

   配對睇標題＋標籤＋類型。同 matchesKeywords 唔同 —— 嗰個特登唔睇
   標題（免得 TIRTIR「Mask Fit」氣墊跌晒入面膜）。但成分同功效字
   （積雪草、水楊酸、玻尿酸）就係寫喺標題度，唔睇標題就乜都搵唔到。
   ============================================================ */
const CONCERNS = [
  /* 「黑頭」同 bha 本來兩格都有，於是 acne 同 pore 攞到同一批貨、
     再由同一條 featured 排序揀封面 —— 兩格出同一支 COSRX toner。
     黑頭同去角質歸毛孔，暗瘡只留真係講緊暗瘡嗰啲。 */
  /* 2026-08-20：「痘印」由暗瘡搬去暗沉 —— 痘印係印唔係痘，客搵痘印
     想要嘅係提亮嗰批貨，唔係水楊酸。同時加返客自己會講嘅「閉口」。 */
  { id: 'acne',      label: '暗瘡・粉刺・閉口',
    note: '茶樹、水楊酸、痘痘貼呢類',
    re: /暗瘡|痘痘|閉口|粉刺|acne|blemish|spot patch|水楊酸|salicylic|茶樹|tea tree/i },
  { id: 'pore',      label: '毛孔・黑頭',
    note: '收毛孔、去角質嗰批',
    re: /毛孔|收毛孔|pore|黑頭|blackhead|去角質|peeling|scrub|\bbha\b|\bpha\b/i },
  { id: 'sensitive', label: '泛紅・敏感',
    note: '積雪草、鎮靜舒緩系列',
    re: /敏感|泛紅|鎮靜|舒緩|修護|calming|soothing|sensitive|redness|cica|centella|積雪草|panthenol|泛醇/i },
  { id: 'dry',       label: '乾燥・缺水',
    note: '玻尿酸、神經醯胺、補水面膜',
    re: /保濕|補水|乾燥|水潤|鎖水|hydra|moist|hyaluron|玻尿酸|透明質酸|ceramide|神經醯胺|barrier|屏障/i },
  { id: 'dull',      label: '暗沉・痘印',
    note: '維他命 C、煙酰胺、穀胱甘肽',
    re: /美白|亮白|提亮|暗沉|痘印|色斑|斑印|透亮|煥白|bright|whitening|glow|tone.?up|glutathione|穀胱甘肽|vitamin ?c|維他命 ?c|niacinamide|煙酰胺|煙醯胺|arbutin|tranexamic|傳明酸/i },
  { id: 'aging',     label: '細紋・鬆弛',
    note: '膠原、胜肽、視黃醇',
    re: /抗皺|細紋|皺紋|緊緻|提拉|彈力|抗老|逆齡|lifting|firming|wrinkle|anti.?aging|collagen|膠原|retinol|視黃醇|retinal|peptide|胜肽|多肽|pdrn/i },
  { id: 'oily',      label: '油光・出油',
    note: '控油、啞光、吸油',
    re: /控油|油光|出油|清爽|sebum|oil ?control|matte|啞光|no.?sebum|powder wash/i },
  { id: 'sun',       label: '每日防曬',
    note: '每日都要搽嗰支',
    re: /防曬|spf|sun ?(cream|stick|serum|essence|cushion|lotion|screen)|uv|선크림/i },
];

function concernById(id) {
  return CONCERNS.find((c) => c.id === id) || null;
}

/* 只計護膚品。唔設呢個閘嘅話，「水潤透亮胭脂液」會跌入乾燥缺水、
   「啞光眼影」跌入油光、氣墊粉底跌入防曬 —— 客撳「乾燥缺水」入去
   見到一堆唇釉，就知我哋係亂夾字。 */
function isSkincare(p) {
  const tags = (p.tags || []).map((t) => t.toLowerCase());
  if (tags.includes('makeup') || tags.includes('彩妝')) return false;
  return tags.includes('skincare') || tags.includes('護膚');
}

/* 一件貨可以同時屬幾格（積雪草面霜又鎮靜又保濕）—— 呢個係啱嘅，
   客由邊個煩惱入嚟都搵得返佢。 */
function matchesConcern(p, concern) {
  if (!concern || !isSkincare(p)) return false;
  const hay = `${p.title || ''} ${p.productType || ''} ${(p.tags || []).join(' ')}`;
  return concern.re.test(hay);
}

/* The brands' own logos, which we already hold as SVG. They ride on top
   of the banner rather than being cropped out of it. */
const BRAND_LOGO = {
  'lilybyred': 'logos/lilybyred.svg', 'AMUSE': 'logos/amuse.svg',
  'hince': 'logos/hince.svg', 'WAKEMAKE': 'logos/wakemake.svg',
  'CLIO': 'logos/clio.svg', 'dasique': 'logos/dasique.png',
  'TIRTIR': 'logos/tirtir.svg', 'MAYBELLINE': 'logos/maybelline.svg',
  'UNLEASHIA': 'logos/unleashia.svg', 'rom&nd': 'logos/romand.svg',
  'Laka': 'logos/laka.svg', '花知曉 Flower Knows': 'logos/flower-knows.svg',
  'fwee': 'logos/fwee.svg', 'Heart Percent': 'logos/heart-percent.svg',
  'Peripera': 'logos/peripera.png', '2aN': 'logos/2an.svg',
  'BRAYE': 'logos/braye.svg', 'Coralhaze': 'logos/coralhaze.svg',
  'Glint': 'logos/glint.svg',
  /* 護膚牌子。以前呢個表淨係得彩妝，所以護膚分類頁一個 logo 都出唔到。 */
  'Abib': 'logos/abib.svg', 'Anua': 'logos/anua.png',
  'Arencia': 'logos/arencia.png',
  'Beauty of Joseon': 'logos/beauty-of-joseon.svg',
  'Beplain': 'logos/beplain.png', 'Bring Green': 'logos/bring-green.svg',
  'COSRX': 'logos/cosrx.png', 'Goodal': 'logos/goodal.svg',
  'Mixsoon': 'logos/mixsoon.svg', 'Needly': 'logos/needly.svg',
  'OOTD': 'logos/ootd.svg', 'Purito': 'logos/purito.svg',
  'Round Lab': 'logos/round-lab.svg', 'Skin1004': 'logos/skin1004.png',
  'Skinfood': 'logos/skinfood.svg', 'Some By Mi': 'logos/some-by-mi.svg',
  'Torriden': 'logos/torriden.svg',
  /* 由品牌官網攞返嚟（2026-08-14）：aprilskin.com、ksecret.co.kr。
     另外四個 .com 官網要唔係得文字 logo、要唔係憑證過期，兜咗一圈先搵到：
       Arencia        — arencia.com Cafe24 頂部 banner（webpb 應用嘅 JSON 入面）
       Haruharu Wonder— haruharuindia.com 官方印度站 black-logo.png
       ILSO           — ilso.kr Cafe24 頁尾 logo.svg（theilso.org 憑證過期入唔到）
       Dr. Melaxin    — drmelaxin.us Shopify main_logo_black2.png
     四個都係透明底。brand-grid__logo 落咗 brightness(0) invert(1)，
     白底圖會變成一嚿白方格，所以之後換檔一定要保住 alpha。 */
  'April Skin': 'logos/april-skin.svg',
  'KSECRET': 'logos/ksecret.png',
  'Haruharu Wonder': 'logos/haruharu-wonder.png',
  'ILSO': 'logos/ilso.svg',
  'Dr. Melaxin': 'logos/dr-melaxin.png',
  /* 隱形眼鏡（2026-08-14）。五個都係日本 T-Garden 系嘅牌子，官網
     頭嗰個 logo.svg 就係正稿：lilmoon.jp、molak.jp、ns-collection.jp、
     topards.jp、feliamo.jp。之前成個隱形眼鏡分類一個 logo 都冇。 */
  'Lilmoon': 'logos/lilmoon.svg', 'Molak': 'logos/molak.svg',
  "N's Collection": 'logos/ns-collection.svg',
  'TOPARDS': 'logos/topards.svg', 'Feliamo': 'logos/feliamo.svg',
  /* 頭髮護理：solepkorea.com 頁頭嗰個 114×43 細版（唔用「SINCE Solep
     2005」嗰條 6.5:1 長帶 —— 太扁，喺手機卡度睇唔到）。 */
  'SOLEP': 'logos/solep.png',

  /* 2026-08-14 要上架嗰 11 個牌子。逐個喺品牌官網揾正稿：
       VT Cosmetics    — vt-cosmetics.com /images/cm_logo_1_black.png
       LINDSAY         — lindsay.co.kr 頁頭 logo_black
       TOCOBO          — tocobo.cafe24.com /wib/img/icon/logo.svg
       ma:nyo          — manyo.co.kr /img/common/h_logo.png
       SUNGBOON EDITOR — Shopify 頁頭 header__logo-image
       HEVEBLUE        — heveblue.co.kr 頁頭（HB 橢圓印章，直度嘅）
       BOH             — bioheal-boh.com 冇獨立 logo 檔，喺佢個 OG.png
                         度剪出嚟再去白底
       Dr.Jart+        — drjart.co.kr 頁頭 SVG sprite <symbol id="logo">
     揀圖規矩（今次踩過嘅雷）：**要粗體、長寬比唔好過 8:1、透明底**。
     幼體又扁嘅版本喺手機品牌卡（110px 闊）淨係 9px 高，等於冇。 */
  'VT Cosmetics': 'logos/vt-cosmetics.png',
  'LINDSAY': 'logos/lindsay.png',
  'TOCOBO': 'logos/tocobo.svg',
  'ma:nyo': 'logos/manyo.png',
  'SUNGBOON EDITOR': 'logos/sungboon-editor.png',
  'HEVEBLUE': 'logos/heveblue.png',
  'BOH': 'logos/boh.png',
  'Dr.Jart+': 'logos/dr-jart.svg',
  /* SO Natural：佢自己個韓國站 sonatural.co.kr 喺呢部機連唔通，
     Wayback 又封住，最尾喺 ohmyglow 個品牌頁攞到張 300×300 方形
     logo，剪走白底再去白。呢個係疊字版（1.4:1），入 2:1 卡好靚。 */
  'SO Natural': 'logos/so-natural.png',
};

function brandLogo(vendor) {
  return BRAND_LOGO[vendor] || null;
}

/* 新上架牌子嘅主視覺（2026-08-16）。
   老闆睇完頭一版話「唔需要 logo，寧願攞佢哋嗰啲品牌相擺喺嗰度，
   即係一個類似 header 咁樣」—— 所以呢度放嘅係品牌自己嗰張 KV，
   唔係 logo。

   全部搬咗上我哋自己個 Shopify CDN：韓國站會查 Referer，直接 hotlink
   落我哋啲頁面會出佔位圖。
   有四個牌子（Arencia、HEVEBLUE、ma:nyo、SO Natural）官網嗰張 KV 係
   一整幅韓文促銷 banner —— 韓文廣告字擺喺香港客面前係擺錯，所以佢哋
   唔入呢個表，改用我哋自己張產品相做封面（睇 home.js）。 */
const BRAND_KV = {
  'VT Cosmetics': 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/vt-cosmetics.jpg',
  'LINDSAY': 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lindsay.jpg',
  'BOH': 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/boh.jpg',
  'TOCOBO': 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/tocobo.png',
  'SUNGBOON EDITOR': 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/sungboon-editor.jpg',
  'SOLEP': 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/solep.jpg',
};

function brandKV(vendor) {
  return BRAND_KV[vendor] || null;
}
