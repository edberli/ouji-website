#!/usr/bin/env node
/**
 * 分類頁同品牌頁嘅網址，畀 build_sitemap.py 加入 sitemap。
 *
 * 子分類（/makeup?cat=lip）同品牌頁（/shop?brand=CLIO）冇獨立 HTML，
 * 全部係同一個模板加參數；canonical 由 catalog.js applyListingSeo()
 * 喺瀏覽器即場寫。sitemap 列出嘅網址一定要同嗰度寫嘅 canonical 一字不差，
 * 唔係 Google 會當兩條網址、兩個都唔信。
 *
 * 邊件貨屬邊個分類，直接行 shopify.js 入面嘅 sectionMatch／subMatch
 * （喺 Node 沙盒度載入成個檔），唔另外寫一套規則 —— 兩套規則遲早會分家。
 *
 *   node scripts/listing_urls.js            # JSON：[{ loc, n }]
 *   node scripts/listing_urls.js --check    # 印出每條網址同件數
 *
 * ⚠️ LISTING_PAGES／LISTING_ALIAS 要同 catalog.js 嗰兩個一致。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://oujikbeauty.com';
const LISTING_PAGES = {
  skincare: '/category', makeup: '/makeup', kpop: '/kpop', lens: '/lens',
  tools: '/tools', bath: '/bath', supports: '/supports', health: '/health',
  seasonal: '/seasonal', toys: '/toys', fragrance: '/fragrance',
};
/* 同一樣嘢喺兩格都有（老闆定：潔面＝護膚＋沐浴、防曬主分類係季節性），
   淨係主嗰格入 sitemap，另一格嘅 canonical 指過去。 */
const LISTING_ALIAS = {
  'bath:cleanser': 'skincare:cleanser',
  'skincare:sunscreen': 'seasonal:sun',
  'seasonal:body': 'bath:lotion',
};
/* 唔係品牌：自家名、統稱。 */
const BRAND_SKIP = new Set(['OUJI', 'K-BEAUTY']);
const MIN_ITEMS = 2;

/* 夠用嘅瀏覽器假環境：shopify.js 頂層會掛 listener、讀 localStorage，
   全部當冇嘢發生。任何屬性都攞到一個「乜都得」嘅 stub。 */
function stub() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === Symbol.iterator) return function* () {};
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      return proxy;
    },
    apply() { return proxy; },
    construct() { return proxy; },
    set() { return true; },
  });
  return proxy;
}

function loadRules() {
  const noop = () => {};
  const store = { getItem: () => null, setItem: noop, removeItem: noop, key: () => null, length: 0, clear: noop };
  class Obs { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  const ctx = {
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    document: stub(), navigator: stub(), history: stub(), screen: stub(),
    location: { search: '', pathname: '/', hash: '', href: `${ORIGIN}/`, origin: ORIGIN, host: 'oujikbeauty.com', hostname: 'oujikbeauty.com', protocol: 'https:' },
    localStorage: store, sessionStorage: store,
    fetch: () => new Promise(noop), setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop, requestIdleCallback: () => 0, queueMicrotask: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop }),
    getComputedStyle: () => stub(), addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true,
    IntersectionObserver: Obs, MutationObserver: Obs, ResizeObserver: Obs, PerformanceObserver: Obs,
    CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } },
    Event: class {}, URL, URLSearchParams, Intl, AbortController, TextEncoder, TextDecoder,
    performance: { now: () => 0, mark: noop, measure: noop, getEntriesByType: () => [] },
    Blob: class {}, FormData: class {}, Headers: class {}, Image: class {},
    HTMLElement: class {}, Element: class {}, Node: class {}, DOMParser: class { parseFromString() { return stub(); } },
    crypto: { randomUUID: () => '0', getRandomValues: (a) => a },
    btoa: (s) => Buffer.from(s).toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString(),
  };
  ctx.window = ctx;
  ctx.self = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shopify.js'), 'utf8'), ctx,
    { filename: 'shopify.js', timeout: 5000 });
  const taxonomy = vm.runInContext('typeof CATEGORY_TAXONOMY === "object" ? CATEGORY_TAXONOMY : null', ctx);
  if (!taxonomy || typeof ctx.sectionMatch !== 'function' || typeof ctx.subMatch !== 'function') {
    throw new Error('shopify.js 入面搵唔到 CATEGORY_TAXONOMY／sectionMatch／subMatch');
  }
  return { taxonomy, sectionMatch: ctx.sectionMatch, subMatch: ctx.subMatch };
}

/* 同 catalog.js soldOut() 一樣。 */
function inStock(p) {
  if (typeof p.totalInventory === 'number') return p.totalInventory > 0;
  const vs = (p.variants && p.variants.edges) || [];
  return vs.length === 0 || vs.some(({ node: v }) => v && v.availableForSale
    && (v.quantityAvailable == null || v.quantityAvailable > 0));
}

function main() {
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/catalog.json'), 'utf8'));
  const products = (snap.v || []).map((e) => e.node || e).filter((p) => p && p.handle);
  if (products.length < 100) throw new Error(`data/catalog.json 得 ${products.length} 件，唔似完整目錄`);
  const live = products.filter(inStock);
  const { taxonomy, sectionMatch, subMatch } = loadRules();

  const rows = [];
  for (const [section, page] of Object.entries(LISTING_PAGES)) {
    const inSection = live.filter((p) => sectionMatch(p, section));
    for (const cat of Object.keys((taxonomy[section] && taxonomy[section].subs) || {})) {
      if (LISTING_ALIAS[`${section}:${cat}`]) continue;
      const n = inSection.filter((p) => subMatch(section, cat, p)).length;
      if (n >= MIN_ITEMS) rows.push({ loc: `${ORIGIN}${page}?cat=${encodeURIComponent(cat)}`, n });
    }
  }
  const byVendor = new Map();
  live.forEach((p) => {
    const v = p.vendor;
    if (v && !BRAND_SKIP.has(v)) byVendor.set(v, (byVendor.get(v) || 0) + 1);
  });
  [...byVendor.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([vendor, n]) => {
    if (n >= MIN_ITEMS) rows.push({ loc: `${ORIGIN}/shop?brand=${encodeURIComponent(vendor)}`, n });
  });

  if (process.argv.includes('--check')) {
    rows.forEach((r) => console.log(String(r.n).padStart(4), decodeURIComponent(r.loc)));
    console.log(`${rows.length} 條網址`);
  } else {
    process.stdout.write(JSON.stringify(rows));
  }
}

main();
