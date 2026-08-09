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
async function shopifyFetch(query, variables = {}) {
  const res = await fetch(SHOPIFY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await res.json();
  if (errors) console.error('Shopify API errors:', errors);
  return data;
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
                id handle title vendor productType tags
                priceRange { minVariantPrice { amount currencyCode } }
                compareAtPriceRange { minVariantPrice { amount currencyCode } }
                images(first: 2) { edges { node { url altText } } }
                variants(first: 1) { edges { node { id availableForSale } } }
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
            id handle title vendor productType tags
            priceRange { minVariantPrice { amount currencyCode } }
            compareAtPriceRange { minVariantPrice { amount currencyCode } }
            images(first: 2) { edges { node { url altText } } }
            variants(first: 1) { edges { node { id availableForSale } } }
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

async function getAllProducts({ collectionHandle, pageSize = 250, max = 2000 } = {}) {
  const key = `ouji_catalog:${collectionHandle || 'all'}`;
  const cached = cacheRead(key);
  if (cached) return { edges: cached };

  const out = [];
  let after = null;
  while (out.length < max) {
    const page = await getProducts({ collectionHandle, first: pageSize, after });
    const edges = page?.edges || [];
    out.push(...edges);
    if (!page?.pageInfo?.hasNextPage || !edges.length) break;
    after = page.pageInfo.endCursor;
  }
  cacheWrite(key, out);
  return { edges: out };
}

/** 取得單一商品詳情 */
async function getProduct(handle) {
  const data = await shopifyFetch(`
    query GetProduct($handle: String!) {
      product(handle: $handle) {
        id handle title description descriptionHtml
        vendor tags productType
        priceRange { minVariantPrice { amount currencyCode } }
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
    sessionStorage.setItem('product_' + product.handle, JSON.stringify(product));
  } catch (e) {}
}

/** 從 sessionStorage 讀取已快取的商品 */
function getCachedProduct(handle) {
  try {
    const data = sessionStorage.getItem('product_' + handle);
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
            id handle title vendor productType tags
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
            id handle title vendor productType tags
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
  if (swallowed && !retried) {
    localStorage.removeItem('shopify_cart_id');
    return addToCart(variantId, quantity, true);
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

/** 初始化頁面（所有頁面共用） */
async function initPage() {
  // 更新購物袋數量
  const cart = await getCart();
  if (cart) updateCartBadge(cart.totalQuantity);

  // 更新心願單數量
  updateWishlistBadge();

  // 更新會員狀態
  if (isLoggedIn()) {
    document.querySelectorAll('[data-show-logged-in]').forEach(el => el.style.display = '');
    document.querySelectorAll('[data-show-logged-out]').forEach(el => el.style.display = 'none');

    // 已登入：背景同步心願清單
    loadWishlistFromShopify().catch(() => {});
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
      moisturizer: { label: '乳液',     keywords: ['moisturizer', 'lotion', 'cream', 'emulsion', '乳液', '面霜', '크림'] },
      mask:        { label: '面膜',     keywords: ['mask', 'sheet mask', 'mask pack', '面膜', '마스크', '팩'] },
      eye:         { label: '眼部護理', keywords: ['eye cream', 'eye lifter', 'eye serum', '眼霜', '眼部', '아이'] },
      sunscreen:   { label: '防曬',     keywords: ['sunscreen', 'suncare', 'sun cream', '防曬', '선크림', '선케어'] },
    },
  },
  makeup: {
    label: '彩妝',
    keywords: ['makeup', '彩妝', '메이크업'],
    subs: {
      base:       { label: '底妝',   keywords: ['foundation', 'cushion', 'concealer', 'base makeup', '底妝', '粉底', '氣墊', '遮瑕'] },
      foundation: { label: '粉底',   keywords: ['foundation', '粉底'] },
      cushion:    { label: '氣墊',   keywords: ['cushion', '氣墊'] },
      concealer:  { label: '遮瑕',   keywords: ['concealer', '遮瑕'] },
      eye:        { label: '眼妝',   keywords: ['eyeshadow', 'eye shadow', 'eyeliner', 'mascara', 'brow', '眼影', '眼線', '睫毛', '眉'] },
      eyeshadow:  { label: '眼影',   keywords: ['eyeshadow', 'eye shadow', '眼影'] },
      eyeliner:   { label: '眼線',   keywords: ['eyeliner', 'eye liner', '眼線'] },
      mascara:    { label: '睫毛膏', keywords: ['mascara', '睫毛'] },
      brow:       { label: '眉筆',   keywords: ['brow', 'eyebrow', '眉'] },
      lip:        { label: '唇妝',   keywords: ['lipstick', 'lip tint', 'lip gloss', 'lip balm', '唇膏', '唇釉', '唇彩', '唇'] },
      lipstick:   { label: '唇膏',   keywords: ['lipstick', '唇膏'] },
      liptint:    { label: '唇釉',   keywords: ['tint', '唇釉'] },
      lipgloss:   { label: '唇彩',   keywords: ['gloss', '唇彩'] },
      // 傘形，蓋住胭脂／修容／高光。同下面 contour 撞名嘅話，導航會出兩個「修容」。
      cheek:      { label: '頰彩',   keywords: ['blush', 'highlighter', 'contour', 'bronzer', '胭脂', '高光', '修容'] },
      blush:      { label: '胭脂',   keywords: ['blush', '胭脂'] },
      contour:    { label: '修容',   keywords: ['contour', 'bronzer', '修容'] },
      highlight:  { label: '高光',   keywords: ['highlighter', 'highlight', '高光'] },
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
  'body-care': { label: '身體護理', keywords: ['body', 'body care', 'hand', 'hair', 'shampoo', '身體', '護手', '頭皮', '髮'] },
  fragrance:   { label: '香氛',     keywords: ['fragrance', 'perfume', 'eau de', 'mist', '香水', '香氛'] },
  lifestyle:   { label: '生活風格', keywords: ['lifestyle', 'accessory', 'tool', 'goods', '生活', '配件', '工具'] },
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
    const all = await getAllProducts();
    const everything = all?.edges?.map((e) => e.node) ?? [];
    products = everything.filter((p) => matchesKeywords(p, categoryKeywords(section, null)));
  }
  if (cat) {
    products = products.filter((p) => matchesKeywords(p, categoryKeywords(section, cat)));
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
  grid.innerHTML =
    '<div class="category-empty">' +
    '<div class="category-empty__icon"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>' +
    '<p class="category-empty__title">' + label + '暫時未有產品</p>' +
    '<p class="category-empty__text">我們正在為你搜羅更多好物，先看看其他系列吧。</p>' +
    '<a href="category.html" class="btn btn--primary">瀏覽所有產品</a>' +
    '</div>';
}
