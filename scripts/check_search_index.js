#!/usr/bin/env node
/* Regress real public catalog IDs against known catalog names and barcodes. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
if (!process.argv[2]) {
  console.error('Usage: node scripts/check_search_index.js /path/to/search-eval-cases.json');
  process.exit(2);
}
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json')))
  .v.map((edge) => edge.node);
const byId = new Map(products.map((product) => [product.id, product]));
const aliases = JSON.parse(fs.readFileSync(path.join(root, 'data/search-aliases.json')));
const cases = JSON.parse(fs.readFileSync(process.argv[2]));
const context = {
  window: {},
  document: { addEventListener() {} },
  console,
  fetch: async () => ({ ok: true, json: async () => aliases }),
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'search.js'), 'utf8'), context);

async function main() {
  await context.window.OUJI_loadSearchIndex();
  const totals = {};
  const misses = [];
  let duplicateBrandQueries = 0;
  const normalizedCases = [];
  for (const test of cases) {
    const product = byId.get(test.id);
    if (!product) continue;
    let query = test.q;
    if (test.kind === 'brand_english') {
      const brand = product.vendor || '';
      if (query.toLowerCase().startsWith(brand.toLowerCase() + ' ')) {
        const tail = query.slice(brand.length).trim();
        const compact = (s) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        if (compact(tail.slice(0, brand.length)) === compact(brand)) {
          query = tail;
          duplicateBrandQueries++;
        }
      }
    }
    const group = totals[test.kind] ||= { pass: 0, total: 0 };
    group.total++;
    normalizedCases.push({ ...test, query });
    if (context.window.OUJI_searchProductMatch(product, query)) group.pass++;
    else misses.push({ ...test, query });
  }
  const identifiers = { pass: 0, total: 0 };
  for (const [id, item] of Object.entries(aliases.products)) {
    for (const code of item.i) {
      identifiers.total++;
      if (context.window.OUJI_searchProductMatch(byId.get(id), code)) identifiers.pass++;
    }
  }
  const rank = (q, id) => products
    .map((p) => ({ id: p.id, score: context.window.OUJI_searchProductScore(p, q) }))
    .filter((p) => p.score < 99)
    .sort((a, b) => a.score - b.score)
    .findIndex((p) => p.id === id) + 1;
  const clio = [
    ['CLIO Pro Eye Palette Air', 'gid://shopify/Product/8817695719582'],
    ['CLIO Pro Eye Palette Air', 'gid://shopify/Product/8817695785118'],
  ].map(([query, id]) => ({ query, id, rank: rank(query, id) }));
  const rankSamples = {};
  for (const [kind] of Object.entries(totals)) {
    const subset = normalizedCases.filter((test) => test.kind === kind);
    const sample = subset.filter((_, index) => index % Math.max(1, Math.floor(subset.length / 100)) === 0).slice(0, 100);
    const ranks = sample.map((test) => rank(test.query, test.id));
    rankSamples[kind] = { total: ranks.length, top8: ranks.filter((value) => value > 0 && value <= 8).length,
      absent: ranks.filter((value) => value === 0).length };
  }
  const result = { productCount: products.length, duplicateBrandQueries, totals, identifiers, clio, rankSamples, missCount: misses.length,
    missExamples: misses.slice(0, 20) };
  console.log(JSON.stringify(result, null, 2));
  if (misses.length || identifiers.pass !== identifiers.total || clio.some((x) => !x.rank || x.rank > 8)) {
    process.exitCode = 1;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
