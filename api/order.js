/**
 * 「顯示您的訂單」—— 客人喺訂單電郵撳入嚟，喺我哋自己個站睇返張單。
 *
 * 點解有呢個 endpoint：Shopify 封信本身條 link 指去 Shopify 自己個
 * 訂單狀態頁（shop.oujikbeauty.com/…），客人一撳就離開咗我哋個站，
 * 頁面亦唔係我哋嘅樣。而家封信可以改為指過嚟 /order，由我哋自己畫。
 *
 * 唔使登入，但要有憑證：Shopify 每張單都有一條唔公開嘅訂單狀態 URL
 * （Admin API 嘅 Order.statusPageUrl，入面有 order token 同 key）。
 * 電郵條 link 帶住呢串字過嚟，呢度攞返 Shopify 存嗰條出嚟對，
 * 對唔上就當冇呢張單 —— 所以淨係識訂單號碼係睇唔到任何嘢。
 *
 * 只回客人自己張單嘅資料：冇電郵、冇電話、冇付款卡。唔 cache。
 */

const SHOP = '5rerjn-mt.myshopify.com';
const API = '2026-07';
const MIN_SECRET = 20; // Shopify 嗰串 token／key 係 32 個字；20 係保險線

const QUERY = `query OrderByNumber($q: String!) {
  orders(first: 1, query: $q) {
    nodes {
      id
      name
      createdAt
      processedAt
      cancelledAt
      displayFinancialStatus
      displayFulfillmentStatus
      currencyCode
      statusPageUrl
      shippingLine { title }
      currentSubtotalPriceSet { shopMoney { amount currencyCode } }
      currentShippingPriceSet { shopMoney { amount currencyCode } }
      currentTotalTaxSet { shopMoney { amount currencyCode } }
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      currentTotalDiscountsSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } }
      customAttributes { key value }
      shippingAddress { name address1 address2 city provinceCode countryCodeV2 zip }
      lineItems(first: 100) {
        nodes {
          name
          variantTitle
          quantity
          sku
          image { url altText }
          originalUnitPriceSet { shopMoney { amount currencyCode } }
          discountedUnitPriceSet { shopMoney { amount currencyCode } }
          product { handle }
        }
      }
      fulfillments {
        status
        createdAt
        trackingInfo { company number url }
      }
    }
  }
}`;

async function admin(query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}

/* 訂單號碼：電郵會畀 {{ order.order_number }}（1041）或者
   {{ order.name }}（#1041），兩個都收。 */
function normalizeNumber(raw) {
  const digits = String(raw || '').trim().replace(/^#/, '').replace(/[^0-9]/g, '');
  if (!digits || digits.length > 12) return null;
  return digits;
}

/* 電郵條 link 可能帶住：成條狀態 URL（u）、key（t／k）、或者
   URL 入面嗰個 order token。逐個拆出嚟，全部當候選憑證。 */
function collectSecrets(query) {
  const out = [];
  const push = (value) => {
    const v = String(value == null ? '' : value).trim();
    if (v.length >= MIN_SECRET && v.length <= 600 && !out.includes(v)) out.push(v);
  };

  const rawUrl = query.u || query.url || '';
  if (rawUrl) {
    let url = String(rawUrl);
    try { url = decodeURIComponent(url); } catch (e) { /* 照用原字串 */ }
    const keyMatch = url.match(/[?&]key=([^&]+)/);
    if (keyMatch) push(keyMatch[1]);
    const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    /* Shopify 現行格式：/orders/<32字 token>/authenticate?key=<32字>。
       見到 authenticate 就攞前一段，否則攞最尾一段。 */
    if (last === 'authenticate') push(segments[segments.length - 2]);
    else if (last) push(last);
    push(url);
  }

  ['t', 'k', 'key', 'token'].forEach((name) => push(query[name]));
  return out;
}

function authorized(order, secrets) {
  const statusUrl = String(order.statusPageUrl || '');
  if (!statusUrl) return false;
  return secrets.some((secret) => statusUrl.includes(secret));
}

async function findOrder(number) {
  const wanted = '#' + number;
  for (const search of ['name:' + wanted, 'name:' + number]) {
    const data = await admin(QUERY, { q: search });
    const node = data?.orders?.nodes?.[0];
    if (node && node.name === wanted) return node;
  }
  return null;
}

function money(set) {
  const shop = set && set.shopMoney;
  if (!shop || shop.amount == null) return null;
  return { amount: Number(shop.amount), currency: shop.currencyCode || 'HKD' };
}

function shape(order) {
  const items = (order.lineItems?.nodes || []).map((item) => {
    const unit = money(item.discountedUnitPriceSet) || money(item.originalUnitPriceSet);
    const quantity = Number(item.quantity) || 0;
    return {
      title: item.name || '',
      variant: item.variantTitle && item.variantTitle !== 'Default Title' ? item.variantTitle : '',
      quantity,
      unitPrice: unit,
      lineTotal: unit ? { amount: Number((unit.amount * quantity).toFixed(2)), currency: unit.currency } : null,
      sku: item.sku || '',
      image: item.image?.url || '',
      handle: item.product?.handle || '',
    };
  });

  const tracking = (order.fulfillments || []).flatMap((fulfillment) => {
    const info = fulfillment.trackingInfo || [];
    return info.map((entry) => ({
      company: entry.company || '',
      number: entry.number || '',
      url: entry.url || '',
      status: fulfillment.status || '',
      fulfilledAt: fulfillment.createdAt || '',
    }));
  });

  const address = order.shippingAddress
    ? {
        name: order.shippingAddress.name || '',
        line1: order.shippingAddress.address1 || '',
        line2: order.shippingAddress.address2 || '',
        city: order.shippingAddress.city || '',
        province: order.shippingAddress.provinceCode || '',
        country: order.shippingAddress.countryCodeV2 || '',
        zip: order.shippingAddress.zip || '',
      }
    : null;

  /* customAttributes 係結帳時寫落單度嘅（例如取件點資料）。
     底線開頭嗰啲係系統用嘅，唔畀客人睇。 */
  const attributes = (order.customAttributes || [])
    .filter((entry) => entry && entry.key && !String(entry.key).startsWith('_'))
    .map((entry) => ({ key: String(entry.key), value: String(entry.value || '') }))
    .slice(0, 12);

  /* 積分：折扣後實付商品每 HK$1 = 1 Point，運費不計
     （同購物袋／會員頁同一條規則；currentSubtotalPriceSet 已經係折後商品金額）。 */
  const subtotal = money(order.currentSubtotalPriceSet);
  const pointsEarned = subtotal ? Math.max(0, Math.floor(subtotal.amount)) : 0;

  return {
    name: order.name,
    createdAt: order.createdAt,
    processedAt: order.processedAt || order.createdAt,
    cancelled: Boolean(order.cancelledAt),
    financial: order.displayFinancialStatus || '',
    fulfillment: order.displayFulfillmentStatus || '',
    currency: order.currencyCode || 'HKD',
    totals: {
      subtotal: money(order.currentSubtotalPriceSet),
      shipping: money(order.currentShippingPriceSet),
      tax: money(order.currentTotalTaxSet),
      discount: money(order.currentTotalDiscountsSet),
      refunded: money(order.totalRefundedSet),
      total: money(order.currentTotalPriceSet),
    },
    shippingMethod: order.shippingLine?.title || '',
    points: { earned: pointsEarned },
    items,
    tracking,
    address,
    attributes,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ ok: false, error: 'method' });
  }

  const query = req.query || {};
  const number = normalizeNumber(query.o || query.order || query.name);
  const secrets = collectSecrets(query);
  if (!number || !secrets.length) return res.status(400).json({ ok: false, error: 'missing' });
  if (!process.env.SHOPIFY_ADMIN_TOKEN) return res.status(500).json({ ok: false, error: 'config' });

  try {
    const order = await findOrder(number);
    if (!order || !authorized(order, secrets)) {
      return res.status(404).json({ ok: false, error: 'notfound' });
    }
    return res.status(200).json({ ok: true, order: shape(order) });
  } catch (error) {
    // 唔好將 GraphQL 錯誤原文或者客人資料寫落 log
    console.error('OUJI-ORDER ' + String((error && error.message) || 'error').slice(0, 300));
    return res.status(502).json({ ok: false, error: 'upstream' });
  }
}
