'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../shopify.js'), 'utf8');
const context = vm.createContext({ window: {}, Map });
vm.runInContext(source.slice(source.indexOf('const CLASSIFICATION_TITLES ='), source.indexOf('const cacheKey =')), context);
const requests = [];
context.getLang = () => 'en';
context.shopifyFetch = async (query, variables) => {
  requests.push({ query, variables });
  return { nodes: variables.ids.map(id => ({ id, title: `原始商品 ${id}` })) };
};
(async () => {
  const initial = { id: 'known', title: 'Translated display', classificationTitle: '原始產品' };
  await context.attachClassificationTitles([{ node: initial }]);
  assert.equal(requests.length, 0, 'snapshot canonical names need no API request');
  const fresh = { id: 'known', title: 'Updated English display' };
  await context.attachClassificationTitles([{ node: fresh }]);
  assert.equal(fresh.classificationTitle, '原始產品', 'background refresh retains source classification');
  assert.equal(fresh.title, 'Updated English display', 'display translation stays intact');
  const newProducts = Array.from({ length: 101 }, (_, i) => ({ node: { id: `new-${i}`, title: `English ${i}` } }));
  await context.attachClassificationTitles(newProducts);
  assert.deepEqual(requests.map(r => r.variables.ids.length), [100, 1], 'API-only English products batch canonical reads');
  assert.ok(requests.every(r => /@inContext\(language: ZH_TW\)/.test(r.query)), 'canonical reads explicitly request ZH_TW');
  assert.equal(newProducts[0].node.title, 'English 0');
  assert.equal(newProducts[0].node.classificationTitle, '原始商品 new-0');
  context.shopifyFetch = async () => ({ nodes: [null] });
  await assert.rejects(context.attachClassificationTitles([{ node: { id: 'unresolved', title: 'English only' } }]),
    /Incomplete canonical classification titles/, 'null canonical nodes cannot fall back to translated classification');
  context.shopifyFetch = async () => ({ nodes: [{ id: 'partial-found', title: '繁中商品' }] });
  await assert.rejects(context.attachClassificationTitles([
    { node: { id: 'partial-found', title: 'Found' } },
    { node: { id: 'partial-missing', title: 'Missing' } },
  ]), /Incomplete canonical classification titles/, 'partial canonical responses cannot publish incomplete membership');
  context.getLang = () => 'zh';
  const chinese = { id: 'zh-new', title: '中文原始商品' };
  await context.attachClassificationTitles([{ node: chinese }]);
  assert.equal(requests.length, 2, 'Chinese API data needs no additional request');
  assert.equal(chinese.classificationTitle, chinese.title);
  console.log('Classification title regressions passed: snapshots, refresh, missing English IDs, batching, and display preservation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
