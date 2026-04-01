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
                id handle title
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
            id handle title
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

/** 取得單一商品詳情 */
async function getProduct(handle) {
  const data = await shopifyFetch(`
    query GetProduct($handle: String!) {
      product(handle: $handle) {
        id handle title description descriptionHtml
        vendor tags
        priceRange { minVariantPrice { amount currencyCode } }
        compareAtPriceRange { minVariantPrice { amount currencyCode } }
        images(first: 10) { edges { node { url altText } } }
        variants(first: 50) {
          edges {
            node {
              id title
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              availableForSale
              quantityAvailable
              selectedOptions { name value }
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

/** 預載入商品列表中每個商品的完整資料 */
async function prefetchProducts(handles) {
  handles.forEach(async (handle) => {
    if (getCachedProduct(handle)) return;
    const product = await getProduct(handle);
    if (product) cacheProduct(product);
  });
}

/** 搜尋商品 */
async function searchProducts(query, first = 10) {
  const data = await shopifyFetch(`
    query SearchProducts($query: String!, $first: Int!) {
      products(query: $query, first: $first) {
        edges {
          node {
            id handle title
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
            id handle title
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

/** 建立購物車 */
async function createCart() {
  const data = await shopifyFetch(`
    mutation CreateCart {
      cartCreate {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `);
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
    query GetCart($cartId: ID!) {
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
                  product { title handle }
                  selectedOptions { name value }
                }
              }
            }
          }
        }
      }
    }
  `, { cartId });
  return data?.cart;
}

/** 加入商品到購物車 */
async function addToCart(variantId, quantity = 1) {
  const cartId = await getOrCreateCartId();
  const data = await shopifyFetch(`
    mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }]
  });
  updateCartBadge(data?.cartLinesAdd?.cart?.totalQuantity);
  return data?.cartLinesAdd;
}

/** 更新購物車商品數量 */
async function updateCartLine(lineId, quantity) {
  const cartId = localStorage.getItem('shopify_cart_id');
  const data = await shopifyFetch(`
    mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `, {
    cartId,
    lines: [{ id: lineId, quantity }]
  });
  return data?.cartLinesUpdate;
}

/** 移除購物車商品 */
async function removeCartLine(lineId) {
  const cartId = localStorage.getItem('shopify_cart_id');
  const data = await shopifyFetch(`
    mutation RemoveCartLine($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `, { cartId, lineIds: [lineId] });
  return data?.cartLinesRemove;
}

/** 前往 Shopify 結帳 */
async function goToCheckout() {
  const cart = await getCart();
  if (cart?.checkoutUrl) {
    window.location.href = cart.checkoutUrl;
  }
}

// ─────────────────────────────────────────────
// 會員 API（Customer Account）
// ─────────────────────────────────────────────

/** 會員登入 */
async function customerLogin(email, password) {
  const data = await shopifyFetch(`
    mutation CustomerLogin($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { field message }
      }
    }
  `, { input: { email, password } });

  const token = data?.customerAccessTokenCreate?.customerAccessToken;
  if (token) {
    localStorage.setItem('shopify_customer_token', token.accessToken);
    localStorage.setItem('shopify_customer_token_expires', token.expiresAt);
  }
  return data?.customerAccessTokenCreate;
}

/** 會員登出 */
async function customerLogout() {
  const token = localStorage.getItem('shopify_customer_token');
  if (!token) return;
  await shopifyFetch(`
    mutation CustomerLogout($token: String!) {
      customerAccessTokenDelete(customerAccessToken: $token) {
        deletedAccessToken
      }
    }
  `, { token });
  localStorage.removeItem('shopify_customer_token');
  localStorage.removeItem('shopify_customer_token_expires');
}

/** 會員註冊 */
async function customerRegister(firstName, lastName, email, password) {
  const data = await shopifyFetch(`
    mutation CustomerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer { id email }
        customerUserErrors { field message }
      }
    }
  `, { input: { firstName, lastName, email, password } });
  return data?.customerCreate;
}

/** 取得會員資料 */
async function getCustomer() {
  const token = localStorage.getItem('shopify_customer_token');
  if (!token) return null;
  const data = await shopifyFetch(`
    query GetCustomer($token: String!) {
      customer(customerAccessToken: $token) {
        id firstName lastName email phone
        orders(first: 10) {
          edges {
            node {
              id name processedAt
              totalPrice { amount currencyCode }
              fulfillmentStatus financialStatus
            }
          }
        }
      }
    }
  `, { token });
  return data?.customer;
}

/** 檢查是否已登入 */
function isLoggedIn() {
  const token = localStorage.getItem('shopify_customer_token');
  const expires = localStorage.getItem('shopify_customer_token_expires');
  if (!token || !expires) return false;
  return new Date(expires) > new Date();
}

// ─────────────────────────────────────────────
// 心願單（本地儲存）
// ─────────────────────────────────────────────

function getWishlist() {
  return JSON.parse(localStorage.getItem('ouji_wishlist') || '[]');
}

function addToWishlist(product) {
  const list = getWishlist();
  if (!list.find(p => p.id === product.id)) {
    list.push(product);
    localStorage.setItem('ouji_wishlist', JSON.stringify(list));
  }
  updateWishlistBadge();
}

function removeFromWishlist(productId) {
  const list = getWishlist().filter(p => p.id !== productId);
  localStorage.setItem('ouji_wishlist', JSON.stringify(list));
  updateWishlistBadge();
}

function isInWishlist(productId) {
  return getWishlist().some(p => p.id === productId);
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
}

/** 更新心願單數字徽章 */
function updateWishlistBadge() {
  const count = getWishlist().length;
  document.querySelectorAll('.wishlist-badge').forEach(el => {
    if (count > 0) {
      el.textContent = count;
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
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
