/**
 * Google 購物嘅產品清單（Merchant Center feed）。
 *
 * 點解唔用 Shopify 官方 app 出嘅 feed：
 *
 * 嗰個 feed 嘅產品連結一律用「線上商店主要網域」。2026-08-09 為咗修好
 * 廣告歸因，主要網域改咗做 `shop.oujikbeauty.com`，即係 Google 購物啲
 * 點擊會落喺 **Shopify 現成主題** —— 冇選單、冇評分、logo 位得個網址，
 * 而且顯示第一個變體嘅價（$138）而唔係最低價（$118）。我哋成日做嘅
 * SEO 修正亦都全部喺 oujikbeauty.com 嗰邊，用唔上。
 *
 * 所以自己出一份，所有連結指返 `oujikbeauty.com/products/<handle>`。
 *
 * 幾個要緊嘅取捨：
 *
 * - **一個變體一筆 offer。** Google 購物係變體層面嘅：#01 招牌紅同
 *   #08 磚紅係兩件唔同嘅貨、唔同條碼、唔同價。用 `item_group_id`
 *   將同一件產品嘅色號綁埋一組。
 * - **價錢一定要同落地頁一致**，唔係 Merchant Center 會拒收。所以
 *   逐個變體報自己嗰個價，唔用產品層面嘅範圍。
 * - **有條碼就一定要畀。** Shopify 嘅 barcode 就係 GTIN；冇咗佢
 *   Google 配唔到同一件貨嘅其他賣家，曝光會差好多。
 * - **即時出，唔預先生成。** 價錢同庫存一日一世界，一份過期嘅 feed
 *   換嚟嘅係「價格不符」停權。CDN 快取一個鐘，Google 一日拉幾次。
 *
 * 網址：https://oujikbeauty.com/google-feed.xml
 */
const SHOP = '5rerjn-mt.myshopify.com';
const TOKEN = '795e2f7cb13da1d3776449eba5802377';
const API = `https://${SHOP}/api/2026-07/graphql.json`;
const SITE = 'https://oujikbeauty.com';

/* 一版 60 件已經算保守。每件要攞 50 個變體，再大就會撞 Storefront API
   嘅查詢成本上限。807 件即係大約 14 個來回。 */
const PAGE = 60;

const QUERY = `
query($cursor: String, $n: Int!) @inContext(country: HK) {
  products(first: $n, after: $cursor, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id handle title description vendor productType tags
      featuredImage { url }
      images(first: 10) { edges { node { url } } }
      variants(first: 50) { edges { node {
        id title sku barcode availableForSale quantityAvailable
        price { amount currencyCode }
        compareAtPrice { amount }
        image { url }
        selectedOptions { name value }
      } } }
    } }
  }
}`;

/* 同 catalog.js 一把尺：數量報 0 就當冇貨。quantityAvailable 係 null
   （冇追蹤存貨嘅貨品）就照信 availableForSale。 */
function inStock(v) {
  if (!v.availableForSale) return false;
  return v.quantityAvailable == null || v.quantityAvailable > 0;
}

async function fetchAll() {
  const out = [];
  let cursor = null;
  for (let i = 0; i < 30; i += 1) {
    const r = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query: QUERY, variables: { cursor, n: PAGE } }),
    });
    if (!r.ok) throw new Error(`storefront ${r.status}`);
    const j = await r.json();
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
    const p = j?.data?.products;
    if (!p) throw new Error('no products in response');
    out.push(...p.edges.map((e) => e.node));
    if (!p.pageInfo.hasNextPage) break;
    cursor = p.pageInfo.endCursor;
  }
  return out;
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** XML 1.0 唔食控制字元，Shopify 啲文案由後台貼入去偶然會夾雜。 */
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const clean = (s) => String(s ?? '')
  .replace(CTRL, '')
  .replace(/\s+/g, ' ')
  .trim();

const tag = (name, value) =>
  (value === undefined || value === null || value === '' ? ''
    : `      <${name}>${esc(value)}</${name}>\n`);

/* Google 嘅分類樹。對唔到就唔好亂填 —— 填錯分類比唔填仲差，
   會拎去同錯嘅產品比較。 */
const CATEGORY = [
  [/隱形眼鏡|lens/i, 'Health & Beauty > Personal Care > Vision Care > Contact Lenses'],
  [/防曬/, 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Sunscreen'],
  [/面膜/, 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Facial Cleansers'],
  [/潔面|洗面/, 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Facial Cleansers'],
  [/爽膚水|化妝水|toner/i, 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Toners & Astringents'],
  [/精華|serum|安瓶/i, 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Facial Care'],
  [/乳液|面霜|保濕/, 'Health & Beauty > Personal Care > Cosmetics > Skin Care > Lotion & Moisturizer'],
  [/唇膏|唇釉|唇彩|唇/, 'Health & Beauty > Personal Care > Cosmetics > Makeup > Lip Makeup'],
  [/眼影|眼線|睫毛|眉/, 'Health & Beauty > Personal Care > Cosmetics > Makeup > Eye Makeup'],
  [/粉底|氣墊|遮瑕|蜜粉/, 'Health & Beauty > Personal Care > Cosmetics > Makeup > Face Makeup'],
  [/胭脂|修容|高光|頰彩/, 'Health & Beauty > Personal Care > Cosmetics > Makeup > Face Makeup'],
  [/香水|香氛/, 'Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne'],
  [/沐浴|身體|護手/, 'Health & Beauty > Personal Care > Cosmetics > Bath & Body'],
];

function googleCategory(p) {
  const hay = `${p.productType || ''} ${p.title || ''} ${(p.tags || []).join(' ')}`;
  for (const [rx, cat] of CATEGORY) if (rx.test(hay)) return cat;
  return 'Health & Beauty > Personal Care > Cosmetics';
}

function itemsFor(p) {
  /* `__test` 係畀付款測試商品用嘅。一件平價、寫明「唔係真貨」嘅嘢
     流去 Google 購物，輕則被拒、重則拖低成個帳戶嘅信任度。 */
  if ((p.tags || []).includes('__test')) return '';
  const variants = (p.variants?.edges || []).map((e) => e.node);
  if (!variants.length) return '';
  const desc = clean(p.description).slice(0, 4900)
    || `${p.vendor || 'OUJI'} ${p.title}｜OUJI 香港 K-Beauty 專門店，正貨韓國直送。`;
  const cat = googleCategory(p);
  const fallbackImg = p.featuredImage?.url
    || p.images?.edges?.[0]?.node?.url;
  const extra = (p.images?.edges || []).slice(1, 11)
    .map((e) => e.node.url).filter(Boolean);
  /* 一個變體先算「一件貨」，但單變體產品唔應該有 item_group_id ——
     Google 會當佢係一組得一件嘅殘缺分組。 */
  const grouped = variants.length > 1;

  return variants.map((v) => {
    const img = v.image?.url || fallbackImg;
    if (!img) return '';   // 冇相 Google 一定拒收，唔好白交
    const shade = (v.selectedOptions || [])
      .filter((o) => !/^title$/i.test(o.name) && !/default/i.test(o.value))
      .map((o) => o.value).join(' / ');
    const title = shade ? `${p.title} ${shade}` : p.title;
    const now = Number(v.price?.amount || 0);
    const was = v.compareAtPrice?.amount
      ? Number(v.compareAtPrice.amount) : null;
    /* Google 嘅定義：g:price 係原價，g:sale_price 係而家賣幾多。
       冇劃價就淨係報 g:price。原價一定要真係高過現價，
       報一個假原價會被當成虛構折扣。 */
    const onSale = was !== null && was > now;
    /* Shopify 接去 Merchant Center 嘅 Local Feed Partnership 使用呢個
       offer ID 格式。網店主 feed 一定要用同一個 ID，本地庫存／門市價
       先會合併落同一件商品；用 SKU／GTIN 會變成兩套產品，一套欠
       local inventory、另一套欠 price。`ZZ` 係 Shopify provider 實際
       交畀 OUJI Merchant Center 嘅固定前綴，唔係銷售國家代碼。 */
    const productId = String(p.id).split('/').pop();
    const variantId = String(v.id).split('/').pop();
    const merchantId = `shopify_ZZ_${productId}_${variantId}`;

    return '    <item>\n'
      + tag('g:id', merchantId)
      + (grouped ? tag('g:item_group_id', p.handle) : '')
      + tag('g:title', clean(title).slice(0, 150))
      + tag('g:description', desc)
      /* 帶住色號入去。唔帶嘅話客人撳咗 #08（$118）會落喺 #01（$138），
         Google 對唔到價就當「價格不符」。canonical 仍然係乾淨嗰條網址，
         唔會拆散收錄。 */
      + tag('g:link', `${SITE}/products/${p.handle}`
        + (grouped ? `?variant=${variantId}` : ''))
      + tag('g:image_link', img)
      + extra.map((u) => tag('g:additional_image_link', u)).join('')
      /* ⚠️ 唔可以淨係信 availableForSale。好多貨嘅存貨政策係「賣完照賣」，
         賣曬之後 availableForSale 仍然係 true —— 網站本身係用「數量報 0
         就當冇貨」（見 catalog.js）。之前呢度淨係睇 availableForSale，
         結果 2,354 個規格入面得 3 個報 out_of_stock，但實際有 86 件貨
         係斷曬。Google 會將人送去買唔到嘅貨：客白撳、廣告白燒，
         Merchant Center 仲會因為「availability 唔符」扣分甚至停戶。 */
      + tag('g:availability', inStock(v) ? 'in_stock' : 'out_of_stock')
      + tag('g:price', `${(onSale ? was : now).toFixed(2)} HKD`)
      + (onSale ? tag('g:sale_price', `${now.toFixed(2)} HKD`) : '')
      + tag('g:brand', p.vendor || 'OUJI')
      + tag('g:condition', 'new')
      + (v.barcode ? tag('g:gtin', v.barcode)
        : tag('g:identifier_exists', 'no'))
      + (v.sku ? tag('g:mpn', v.sku) : '')
      + tag('g:google_product_category', cat)
      + (shade ? tag('g:color', shade) : '')
      + '    </item>\n';
  }).join('');
}

module.exports = async function handler(req, res) {
  try {
    const products = await fetchAll();
    const items = products.map(itemsFor).join('');
    const count = (items.match(/<item>/g) || []).length;

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n'
      + '  <channel>\n'
      + '    <title>OUJI — 香港 K-Beauty 專門店</title>\n'
      + `    <link>${SITE}</link>\n`
      + '    <description>OUJI 全線韓國美妝護膚產品</description>\n'
      + items
      + '  </channel>\n</rss>\n';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Ouji-Items', String(count));
    res.setHeader('Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(xml);
  } catch (e) {
    /* 出唔到就要 500。回一份空 feed 更加危險 —— Google 會當你全線落架，
       跟住成個帳戶啲產品消失。 */
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send(`feed build failed: ${e.message}`);
  }
};
