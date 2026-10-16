#!/usr/bin/env node
/**
 * 寫文章用嘅「資料包」：揀一批產品，連評分、得獎、價錢、官方描述一齊輸出。
 * 寫手只可以用資料包入面嘅事實（唔准自己作成分、SPF、功效）。
 *
 *   node scripts/articles/pack.js --sub makeup:liptint --top 12
 *   node scripts/articles/pack.js --type 氣墊粉底,底妝 --top 10
 *   node scripts/articles/pack.js --award OLIVE_YOUNG:2025
 *   node scripts/articles/pack.js --handles a,b,c
 *   node scripts/articles/pack.js --text "BHA|毛孔|黑頭" --top 12
 *   加 --under 100 只要 HK$100 以下；--min-reviews 30 只要有足夠評價嘅
 *
 * 排名：有貨先；Olive Young 評分用評價數加權（基準 4.5 星、200 則）。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

/* 分類規則：同網站一樣行 shopify.js（見 scripts/listing_urls.js） */
function rules() {
  const stub = () => { const f = function () { return p; }; const p = new Proxy(f, { get(t, k) { if (k === Symbol.toPrimitive) return () => ''; if (k === Symbol.iterator) return function* () {}; if (k === 'then') return undefined; if (k === 'length') return 0; return p; }, apply() { return p; }, construct() { return p; }, set() { return true; } }); return p; };
  const noop = () => {}; const store = { getItem: () => null, setItem: noop, removeItem: noop };
  class O { observe() {} disconnect() {} unobserve() {} }
  const ctx = { console: { log: noop, warn: noop, error: noop }, document: stub(), navigator: stub(), location: { search: '', pathname: '/', href: 'https://oujikbeauty.com/', origin: 'https://oujikbeauty.com' }, localStorage: store, sessionStorage: store, fetch: () => new Promise(noop), setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, requestAnimationFrame: () => 0, matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop, IntersectionObserver: O, MutationObserver: O, ResizeObserver: O, CustomEvent: class {}, URL, URLSearchParams, Intl, performance: { now: () => 0 } };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('shopify.js'), ctx);
  vm.runInContext(read('awards.js'), ctx);
  return ctx;
}

async function descriptions(handles) {
  const src = read('api/product.js');
  const shop = (src.match(/const SHOP = '([^']+)'/) || [])[1];
  const token = (src.match(/const TOKEN = '([^']+)'/) || [])[1];
  const out = {};
  for (let i = 0; i < handles.length; i += 20) {
    const batch = handles.slice(i, i + 20);
    const fields = batch.map((h, k) => `p${k}: product(handle: ${JSON.stringify(h)}) { handle description }`).join('\n');
    const r = await fetch(`https://${shop}/api/2026-07/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
      body: JSON.stringify({ query: `query @inContext(country: HK, language: ZH_TW) {\n${fields}\n}` }),
    });
    const j = await r.json();
    for (const v of Object.values((j && j.data) || {})) if (v) out[v.handle] = (v.description || '').replace(/\s+/g, ' ').trim();
  }
  return out;
}

(async () => {
  const ctx = rules();
  const AWARDS = vm.runInContext('AWARDS', ctx);
  const BODIES = vm.runInContext('AWARD_BODIES', ctx);
  const naming = require(path.join(ROOT, 'product-naming.js'));
  const ratingsAll = JSON.parse(read('data/ratings.json')).products || {};
  // 文章寫明「Olive Young 評分」：@cosme（7 分制）／YesStyle 嘅分唔准混入
  const ratings = Object.fromEntries(Object.entries(ratingsAll).filter(([, r]) => !r.src || r.src === 'oy'));
  let prods = JSON.parse(read('data/catalog.json')).v.map((e) => e.node || e);

  const sub = opt('sub'); const type = opt('type'); const award = opt('award'); const handles = opt('handles'); const text = opt('text');
  if (sub) { const [s, c] = sub.split(':'); prods = prods.filter((p) => ctx.sectionMatch(p, s) && (!c || ctx.subMatch(s, c, p))); }
  if (type) { const ts = type.split(','); prods = prods.filter((p) => ts.includes(String(p.productType || '').trim())); }
  if (award) { const [b, y] = award.split(':'); prods = prods.filter((p) => (AWARDS[p.handle] || []).some((a) => a.body === b && (!y || String(a.year) === y))); }
  if (handles) { const hs = handles.split(','); prods = hs.map((h) => prods.find((p) => p.handle === h)).filter(Boolean); }
  if (text) { const re = new RegExp(text, 'i'); prods = prods.filter((p) => re.test(`${p.title} ${p.productType} ${(p.tags || []).join(' ')}`)); }
  const under = Number(opt('under', 0)); if (under) prods = prods.filter((p) => Number(p.priceRange.minVariantPrice.amount) <= under);
  const minRev = Number(opt('min-reviews', 0)); if (minRev) prods = prods.filter((p) => ((ratings[p.handle] || {}).count || 0) >= minRev);

  const inStock = (p) => (typeof p.totalInventory === 'number' ? p.totalInventory > 0 : true);
  const score = (p) => { const r = ratings[p.handle]; return r ? (r.count * r.star + 200 * 4.5) / (r.count + 200) : 0; };
  prods = prods.filter(inStock).sort((a, b) => score(b) - score(a));
  if (!handles) prods = prods.slice(0, Number(opt('top', 12)));

  const desc = await descriptions(prods.map((p) => p.handle));
  const pack = prods.map((p) => {
    const r = ratings[p.handle];
    const aw = (AWARDS[p.handle] || []).map((a) => `${(BODIES[a.body] || {}).name || a.body} ${a.year} ${a.category}${a.rank === 1 ? '冠軍' : a.rank ? `第${a.rank}名` : '得獎'}${a.note ? `（${a.note}）` : ''}`);
    return {
      handle: p.handle,
      brand: p.vendor,
      title: p.title,
      card_name: (naming.cardChinese && naming.cardChinese(p)) || p.title,
      type: p.productType,
      price: Number(p.priceRange.minVariantPrice.amount),
      compare_at: Number(p.compareAtPriceRange?.minVariantPrice?.amount) || null,
      oy_star: r ? r.star : null,
      oy_reviews: r ? r.count : 0,
      weighted_score: Number(score(p).toFixed(3)),
      awards: aw,
      variants_sample: (p.variants?.edges || []).map((e) => e.node.title).filter((t) => t && t !== 'Default Title').slice(0, 6),
      description: (desc[p.handle] || '').slice(0, 700),
    };
  });
  process.stdout.write(JSON.stringify(pack, null, 1) + '\n');
})().catch((e) => { console.error(e); process.exit(1); });
