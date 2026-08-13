/**
 * 「通知我補貨」—— 記低邊件缺貨嘅嘢有人想要。
 *
 * 老闆想要嘅係「有幾多人想要呢件貨」，唔係一個逐單彈出嚟嘅通知。
 * 所以呢度做嘅係**點票**：每一撳就喺嗰件產品自己個 metafield
 * 度加一，時間戳記低最近嗰次。
 *
 * 點解唔直接寄 email：寄 email 要一個第三方寄信服務同一條 API key，
 * 呢個網站而家一條都冇（`.env` 淨係得 Shopify 個 token）。開戶口要
 * 老闆自己做。與其等，不如先保住啲數據 —— 數據冇咗就補唔返，
 * 通知遲一日先到冇死。email 嗰浸之後駁上嚟就得，呢度唔使改。
 *
 * 睇數：Shopify 後台 → 產品 → 揀件貨 → 最底 metafields，
 * 或者用 `scripts/restock_report.py` 一次過列晒。
 */

const SHOP = '5rerjn-mt.myshopify.com';
const API = '2025-07';
const NS = 'ouji';
const KEY_COUNT = 'restock_requests';
const KEY_LAST = 'restock_last';

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
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const FIND = `
query($h: String!) {
  productByHandle(handle: $h) {
    id
    title
    metafield(namespace: "${NS}", key: "${KEY_COUNT}") { value }
  }
}`;

const SET = `
mutation($m: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $m) { userErrors { field message } }
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  if (!process.env.SHOPIFY_ADMIN_TOKEN) {
    return res.status(500).json({ error: 'no admin token' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const handle = String(body.handle || '').trim();
    // handle 係我哋自己啲產品網址，只可能係細楷英數同破折號。
    // 收窄咗就唔會有人拋啲奇形怪狀嘅嘢入嚟。
    if (!handle || !/^[a-z0-9-]{1,120}$/.test(handle)) {
      return res.status(400).json({ error: 'bad handle' });
    }

    const found = await admin(FIND, { h: handle });
    const product = found?.productByHandle;
    if (!product) return res.status(404).json({ error: 'no such product' });

    const now = Number(product.metafield?.value || 0) + 1;
    const stamp = new Date().toISOString();

    const out = await admin(SET, {
      m: [
        { ownerId: product.id, namespace: NS, key: KEY_COUNT,
          type: 'number_integer', value: String(now) },
        { ownerId: product.id, namespace: NS, key: KEY_LAST,
          type: 'single_line_text_field', value: stamp },
      ],
    });
    const errs = out?.metafieldsSet?.userErrors || [];
    if (errs.length) return res.status(500).json({ error: errs[0].message });

    // 唔回覆總數畀前端。「你係第 3 個想要」聽落似冇人要，
    // 客見到反而更加唔想等。
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
