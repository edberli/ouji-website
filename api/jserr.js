/**
 * 客嗰邊出事就報返嚟 —— 因為「有時 load 唔到」我哋自己撞唔到。
 *
 * 老闆同客都反映過「白畫面，load 極都 load 唔到」。伺服器每次都 200、
 * 半秒內回，所以睇伺服器 log 永遠搵唔到 —— 出事係喺客部機度。今次修好
 * 咗三個成因（Google Fonts 阻住 render、listener 越疊越多、一次過畫
 * 千三張卡），但要證實仲有冇第四個，唯一辦法係等真實用戶撞到嗰刻，
 * 由佢部機講返俾我哋知。
 *
 * 存喺邊：`console.error` 出一行（Vercel 個 dashboard 睇得到），同時
 * 寫入 Shopify 個 shop metafield `ouji.jserr` —— 因為 `vercel logs` 係
 * 串流式，隔咗一陣就追唔返，而呢啲事故本身就係「隔一排先撞一次」。
 * metafield 只留最近 30 條，够我睇出個 pattern 就算。
 *
 *   python3 scripts/read_jserr.py
 *
 * 收咩：頁面、瀏覽器、出咩錯、當時 DOM 係咪真係吉。冇收任何個人資料。
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body && typeof body === 'object' ? body : {};

  // 剪短 —— 呢個 endpoint 係公開嘅，唔好畀人當 log 倉用。
  const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
  const line = {
    kind: cut(body.kind, 24),
    page: cut(body.page, 160),
    msg: cut(body.msg, 700),
    at: cut(body.at, 160),
    blank: body.blank === true,
    mainH: Number(body.mainH) || 0,
    fonts: cut(body.fonts, 16),
    ready: cut(body.ready, 16),
    ua: cut(req.headers['user-agent'], 180),
  };
  console.error('OUJI-JSERR ' + JSON.stringify(line));

  // 順手存落 Shopify，等 `vercel logs` 追唔返嗰陣仲有得睇。
  // 寫唔到都唔可以令個 endpoint 出錯 —— 呢度本身就係報錯用嘅。
  try { await keep({ ...line, t: new Date().toISOString() }); } catch (e) { /* 算 */ }
  res.status(204).end();
}

const SHOP = '5rerjn-mt.myshopify.com';
const API = '2025-07';
const KEEP = 30;

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

async function keep(entry) {
  if (!process.env.SHOPIFY_ADMIN_TOKEN) return;
  const got = await admin(`query{ shop{ id metafield(namespace:"ouji", key:"jserr"){ value } } }`);
  const shop = got?.shop;
  if (!shop) return;
  let list = [];
  try { list = JSON.parse(shop.metafield?.value || '[]'); } catch (e) { list = []; }
  list.unshift(entry);
  await admin(
    `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ message } } }`,
    { m: [{ ownerId: shop.id, namespace: 'ouji', key: 'jserr',
            type: 'json', value: JSON.stringify(list.slice(0, KEEP)) }] });
}
