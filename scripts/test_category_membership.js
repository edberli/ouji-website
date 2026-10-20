'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const document = {
  readyState: 'loading',
  addEventListener() {},
  createElement(tagName) { return { tagName, dataset: {}, style: {}, classList: { add() {}, remove() {} } }; },
  querySelectorAll() { return []; },
  head: { appendChild() {} },
};
const window = {
  addEventListener() {},
  location: { origin: 'https://example.test' },
};
const context = vm.createContext({
  window,
  document,
  location: { pathname: '/health.html', search: '' },
  localStorage: { getItem() { return null; }, setItem() {} },
  URLSearchParams,
  console,
});

vm.runInContext(fs.readFileSync(path.join(siteRoot, 'shopify.js'), 'utf8'), context, {
  filename: 'shopify.js',
});
const rules = window.OUJI_categoryClassification;
assert.ok(rules, 'shopify.js exposes its category classification helpers');

const healthSubcategories = ['probiotics', 'collagen', 'vitamin', 'ginseng', 'kombucha'];
const formerUnionHealthKeywords = [
  '保健品', '益生菌', '乳酸菌', '프로바이오틱스', '膠原蛋白', 'collagen',
  '維他命', '維生素', 'vitamin', '紅參', '人參', 'ginseng', '康普茶', 'kombucha',
];
assert.deepEqual(Array.from(rules.categoryKeywords('health', null)), ['保健品']);
assert.deepEqual(Array.from(rules.categoryKeywords('health', 'collagen')), ['膠原蛋白', 'collagen']);

function matchedFormerHealthRule(product) {
  const typedFields = [product.productType || '', ...(product.tags || [])].join(' ').toLowerCase();
  if (formerUnionHealthKeywords.some((keyword) => typedFields.includes(keyword.toLowerCase()))) return true;
  return !product.productType && !(product.tags || []).length
    && formerUnionHealthKeywords.some((keyword) => (product.title || '').toLowerCase().includes(keyword.toLowerCase()));
}

function productsFrom(file) {
  const catalog = JSON.parse(fs.readFileSync(path.join(siteRoot, file), 'utf8'));
  assert.ok(Array.isArray(catalog.v), `${file} has the current catalog snapshot shape`);
  return catalog.v.map(({ node }) => node);
}

for (const file of ['data/catalog.json', 'data/catalog-en.json']) {
  const products = productsFrom(file);
  const healthProducts = products.filter((product) => rules.sectionMatch(product, 'health'));
  assert.equal(healthProducts.length, 125, `${file}: only the confirmed oral products enter health`);

  for (const product of products) {
    const inHealth = rules.sectionMatch(product, 'health');
    for (const subcategory of healthSubcategories) {
      if (rules.subMatch('health', subcategory, product)) {
        assert.ok(inHealth, `${file}: ${product.handle} is in health › ${subcategory} only if in health`);
      }
    }
  }

  const goodalProducts = products.filter((product) => /goodal/i.test(product.vendor || '')
    && matchedFormerHealthRule(product));
  assert.equal(goodalProducts.length, 9, `${file}: all nine current Goodal records are present`);
  for (const product of goodalProducts) {
    assert.equal(rules.sectionMatch(product, 'health'), false, `${file}: Goodal skincare excluded: ${product.handle}`);
    for (const subcategory of healthSubcategories) {
      assert.equal(rules.subMatch('health', subcategory, product), false,
        `${file}: Goodal skincare excluded from health › ${subcategory}: ${product.handle}`);
    }
  }
}

for (const productType of [
  '保健品', '保健', '美容食品', '膳食補充劑',
  'Supplement', 'SUPPLEMENTS', 'Dietary Supplement',
]) {
  assert.equal(rules.isHealthProduct({ productType }), true, `recognized oral productType: ${productType}`);
}

const oralLiquid = {
  id: 'oral-liquid', handle: 'vitamin-liquid', productType: 'Supplement',
  title: 'Vitamin C Oral Liquid 30ml', tags: [],
};
const collagenPowder = {
  id: 'collagen-powder', handle: 'collagen-powder', productType: '膳食補充劑',
  title: '低分子膠原蛋白粉 3g x 30包', tags: [],
};
const englishCollagenPowder = {
  id: 'english-collagen-powder', handle: 'english-collagen-powder', productType: 'Dietary Supplement',
  title: 'Marine Collagen Powder 3g x 30 sachets', tags: [],
};
const probioticCapsule = {
  id: 'probiotic-capsule', handle: 'probiotic-capsule', productType: '保健品',
  title: '益生菌膠囊 30粒', tags: [],
};
for (const product of [oralLiquid, collagenPowder, englishCollagenPowder, probioticCapsule]) {
  assert.equal(rules.sectionMatch(product, 'health'), true, `${product.handle} is an oral health product`);
}
assert.equal(rules.subMatch('health', 'vitamin', oralLiquid), true, 'vitamin liquid with ml remains eligible');
assert.equal(rules.subMatch('health', 'collagen', collagenPowder), true, 'Chinese collagen powder matches');
assert.equal(rules.subMatch('health', 'collagen', englishCollagenPowder), true, 'English collagen powder matches');
assert.equal(rules.subMatch('health', 'probiotics', probioticCapsule), true, 'Chinese probiotic capsule matches');

const vagueTypeWithExactHealthTag = {
  productType: 'Other', title: 'Vitamin C 30ml', tags: ['保健品'],
};
assert.equal(rules.isHealthProduct(vagueTypeWithExactHealthTag), true, 'vague type can fall back to an exact health tag');
assert.equal(rules.subMatch('health', 'vitamin', vagueTypeWithExactHealthTag), true);

for (const product of [
  { productType: '面霜', title: '膠原蛋白維他命C面霜 50ml', tags: ['保健品', 'collagen'] },
  { productType: '保健用品', title: 'Vitamin C', tags: ['保健品'] },
]) {
  assert.equal(rules.isHealthProduct(product), false, 'a concrete non-oral productType overrides health tags and ingredients');
  assert.equal(rules.sectionMatch(product, 'health'), false);
}

for (const product of [
  { productType: '', title: '膠原蛋白精華', tags: ['collagen'] },
  { productType: 'Other', title: 'Vitamin C serum', tags: ['vitamin', 'collagen'] },
  { productType: '', title: '益生菌粉', tags: [] },
]) {
  assert.equal(rules.isHealthProduct(product), false, 'ingredient words alone do not establish oral product identity');
  assert.equal(rules.sectionMatch(product, 'health'), false);
}

const contaminatedCollectionItem = {
  id: 'collection-goodal', handle: 'goodal-vitamin-c-serum', productType: '精華',
  title: 'Goodal Vitamin C Serum', tags: ['保健品', 'vitamin'],
};
const concreteTopicalWithHealthTag = {
  id: 'collection-topical', handle: 'topical-health-tag', productType: '面霜',
  title: 'Collagen Cream 50ml', tags: ['保健品', 'collagen'],
};
context.__collectionItems = [contaminatedCollectionItem, concreteTopicalWithHealthTag];
context.__allItems = [oralLiquid, contaminatedCollectionItem, concreteTopicalWithHealthTag];
vm.runInContext(`getAllProducts = async ({ collectionHandle } = {}) => ({
  edges: (collectionHandle ? __collectionItems : __allItems).map((node) => ({ node })),
})`, context);

(async () => {
  const categoryProducts = await rules.getCategoryProducts({ section: 'health' });
  assert.deepEqual(Array.from(categoryProducts, (product) => product.handle), ['vitamin-liquid'],
    'manual collection items are rechecked and topical health-tag contaminants are rejected');

  console.log('Health category membership tests passed against shopify.js and the current zh/en catalogs (125 oral products each).');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
