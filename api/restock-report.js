/**
 * 「邊啲缺貨嘅嘢有人想要」—— 老闆自己睇嘅一版過清單。
 *
 * 數字係 api/restock.js 一撳加一咁記落每件產品自己個 metafield。
 * 呢度淨係讀返出嚟，由多到少排，順便講埋而家仲有冇貨。
 *
 * 點解唔寄 email：老闆揀咗唔要通知，想睇就自己開。咁樣冇第三方
 * 寄信服務、冇月費、亦都唔會一件熱門貨缺貨就寄幾十封信塞爆個信箱。
 *
 * 網址要帶 ?key= —— 呢版係入貨用嘅生意數據（邊件貨斷市、幾多人等），
 * 唔應該邊個都開得到。條 key 係 Vercel 環境變數 RESTOCK_KEY。
 */

const SHOP = '5rerjn-mt.myshopify.com';
const API = '2025-07';

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

/* 一次過攞晒有記過數嘅產品。Shopify 冇得「淨係畀我有呢個 metafield
   嗰啲」，所以照掃，喺呢邊隔走冇數嘅。八百件貨分四頁，行得晒。 */
const LIST = `
query($c: String) {
  products(first: 250, after: $c) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      handle title vendor
      n: metafield(namespace: "ouji", key: "restock_requests") { value }
      last: metafield(namespace: "ouji", key: "restock_last") { value }
      totalInventory
      variants(first: 30) { edges { node { availableForSale inventoryQuantity } } }
    } }
  }
}`;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export default async function handler(req, res) {
  const key = process.env.RESTOCK_KEY;
  if (!process.env.SHOPIFY_ADMIN_TOKEN || !key) {
    return res.status(500).send('未設定：Vercel 要有 SHOPIFY_ADMIN_TOKEN 同 RESTOCK_KEY');
  }
  const given = (req.query && req.query.key) || '';
  if (given !== key) return res.status(404).send('Not found');

  try {
    const rows = [];
    let cursor = null;
    for (let page = 0; page < 8; page += 1) {
      const d = await admin(LIST, { c: cursor });
      const conn = d.products;
      conn.edges.forEach(({ node }) => {
        const n = Number(node.n?.value || 0);
        if (n > 0) rows.push({ ...node, n });
      });
      if (!conn.pageInfo.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }
    rows.sort((a, b) => b.n - a.n);

    const body = rows.length ? rows.map((p) => {
      const qty = (p.variants?.edges || [])
        .reduce((s, e) => s + (e.node.inventoryQuantity || 0), 0);
      const back = qty > 0;
      const when = p.last?.value ? String(p.last.value).slice(0, 10) : '—';
      return `<tr class="${back ? 'back' : ''}">
        <td class="n">${p.n}</td>
        <td><a href="https://oujikbeauty.com/products/${esc(p.handle)}">${esc(p.title)}</a>
            <span class="v">${esc(p.vendor || '')}</span></td>
        <td>${back ? `已補返 ${qty} 件` : '仍然冇貨'}</td>
        <td class="d">${when}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="4" class="empty">未有人撳過「通知我補貨」。</td></tr>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // 唔好畀搜尋器收錄，亦都唔好畀 CDN 快取住一份舊數
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>想要補貨嘅產品 — OUJI</title>
<style>
  body { font: 15px/1.6 -apple-system, "Noto Sans TC", sans-serif;
         margin: 0; padding: 24px; background: #f6f5f0; color: #2b4c58; }
  h1 { font-size: 1.25rem; margin: 0 0 4px; }
  p.sub { color: #6b8794; margin: 0 0 20px; font-size: 0.875rem; }
  table { width: 100%; max-width: 760px; border-collapse: collapse; background: #fff;
          border-radius: 12px; overflow: hidden; box-shadow: 0 2px 14px rgba(40,80,110,.08); }
  th, td { padding: 11px 14px; text-align: left; border-bottom: 1px solid #eceae4; }
  th { font-size: .75rem; letter-spacing: .08em; color: #6b8794; font-weight: 500; }
  td.n { font-weight: 700; font-size: 1.05rem; width: 56px; }
  td.d { color: #9aa8ae; font-size: .8125rem; white-space: nowrap; }
  span.v { display: block; font-size: .75rem; color: #9aa8ae; }
  a { color: inherit; }
  tr.back td { background: #f2f8f5; }
  td.empty { text-align: center; color: #9aa8ae; padding: 32px; }
</style></head><body>
<h1>想要補貨嘅產品</h1>
<p class="sub">數字 = 有幾多人撳過「通知我補貨」。綠色行 = 已經補返貨，可以考慮通知返啲客。</p>
<table>
  <tr><th>人數</th><th>產品</th><th>而家</th><th>最近一次</th></tr>
  ${body}
</table>
</body></html>`);
  } catch (err) {
    return res.status(500).send('出錯：' + esc(err.message || err));
  }
}
