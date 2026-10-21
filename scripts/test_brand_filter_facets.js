'use strict';

// Brand-dependent category options against the real Shopify classifier,
// catalog helpers, and the current storefront catalog snapshot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(siteRoot, file), 'utf8');

const classificationContext = vm.createContext({
  window: { addEventListener() {}, location: { origin: 'https://example.test' } },
  document: {
    readyState: 'loading',
    addEventListener() {},
    createElement(tagName) {
      return { tagName, dataset: {}, style: {}, classList: { add() {}, remove() {} } };
    },
    querySelectorAll() { return []; },
    head: { appendChild() {} },
  },
  location: { pathname: '/shop.html', search: '' },
  localStorage: { getItem() { return null; }, setItem() {} },
  URLSearchParams,
  console,
});
vm.runInContext(read('shopify.js'), classificationContext, { filename: 'shopify.js' });
const classification = classificationContext.window.OUJI_categoryClassification;
assert.ok(classification, 'shopify.js exposes the real category classifier');
const taxonomy = vm.runInContext('CATEGORY_TAXONOMY', classificationContext);

const catalogSource = read('catalog.js');

function extractFunction(name) {
  const match = new RegExp(`(?:^|\\n)(function ${name}\\s*\\()`).exec(catalogSource);
  assert.ok(match, `catalog.js defines ${name}`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const bodyStart = catalogSource.indexOf('{', start);
  assert.ok(bodyStart >= 0, `${name} has a function body`);

  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = bodyStart; i < catalogSource.length; i++) {
    const ch = catalogSource[i];
    const next = catalogSource[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) return catalogSource.slice(start, i + 1);
  }
  assert.fail(`could not find the end of catalog.js function ${name}`);
}

function extractDeclaration(name, closing = ';\n') {
  const start = catalogSource.indexOf(`const ${name} =`);
  assert.ok(start >= 0, `catalog.js defines ${name}`);
  const end = catalogSource.indexOf(closing, start);
  assert.ok(end >= 0, `could not find the end of catalog.js declaration ${name}`);
  return catalogSource.slice(start, end + closing.length - 1);
}

const catalogContext = vm.createContext({
  CATEGORY_TAXONOMY: taxonomy,
  categoryKeywords: classification.categoryKeywords,
  sectionMatch: classification.sectionMatch,
  subMatch: classification.subMatch,
  CURRENT_SECTION: 'all',
});
const extractedCatalogCode = [
  extractDeclaration('LX_SECTIONS', '];\n'),
  extractDeclaration('LX_BRAND_FACETS'),
  extractDeclaration('MIN_STANDALONE_BRAND_PRODUCTS'),
  extractDeclaration('TOYS_MISC_VENDORS'),
  extractFunction('catOptions'),
  extractFunction('availableSubs'),
  extractFunction('mergedVendor'),
  extractFunction('vendorCounts'),
  extractFunction('groupedVendor'),
  extractFunction('lxBrandFacets'),
].join('\n');
vm.runInContext(extractedCatalogCode, catalogContext, { filename: 'catalog.js extracted helpers' });
const sections = JSON.parse(JSON.stringify(vm.runInContext('LX_SECTIONS', catalogContext)));

const snapshot = JSON.parse(read('data/catalog.json'));
assert.ok(Array.isArray(snapshot.v), 'data/catalog.json is the current storefront snapshot');
const products = snapshot.v.map((edge) => edge.node).filter(Boolean);
assert.ok(products.length > 100, 'catalog snapshot contains the full product catalog');

function callCatalog(expression, values) {
  Object.assign(catalogContext, values);
  return vm.runInContext(expression, catalogContext);
}

function vendorCountsFor(items) {
  return callCatalog('vendorCounts(__facetProducts)', { __facetProducts: items });
}

function groupedVendorFor(product, counts) {
  return callCatalog('groupedVendor(__facetProduct, __facetCounts)', {
    __facetProduct: product,
    __facetCounts: counts,
  });
}

function poolFor(items, vendors) {
  if (!vendors.size) return items;
  const counts = vendorCountsFor(items);
  return items.filter((product) => vendors.has(groupedVendorFor(product, counts)));
}

function actualSections(items) {
  return sections
    .filter(([id]) => items.some((product) => classification.sectionMatch(product, id)))
    .map(([id]) => id);
}

function actualAvailableSubs(section, items) {
  const value = callCatalog('availableSubs(__facetSection, __facetProducts)', {
    __facetSection: section,
    __facetProducts: items,
  });
  return JSON.parse(JSON.stringify(value));
}

function expectedFacets(items, vendors) {
  const pool = poolFor(items, vendors);
  return sections.flatMap(([id, label, href]) => {
    const matches = pool.filter((product) => classification.sectionMatch(product, id));
    return matches.length ? [{ id, label, href, subs: actualAvailableSubs(id, matches) }] : [];
  });
}

function runFacets(items, section, vendors) {
  const value = callCatalog('lxBrandFacets(__facetProducts, __facetSection, __facetVendors)', {
    __facetProducts: items,
    __facetSection: section,
    __facetVendors: vendors,
  });
  return JSON.parse(JSON.stringify(value));
}

function assertFacetsMatchClassifier(items, section, vendors, message) {
  const actual = runFacets(items, section, vendors);
  assert.deepEqual(actual, expectedFacets(items, vendors), message);
  assert.deepEqual(actual.map((facet) => facet.id), actualSections(poolFor(items, vendors)),
    `${message}: only sections represented by matching snapshot products appear`);
  return actual;
}

const fullCounts = vendorCountsFor(products);
function brandGroup(rawVendor) {
  const brandProducts = products.filter((product) => product.vendor === rawVendor);
  assert.ok(brandProducts.length >= 3, `${rawVendor} has real snapshot products`);
  const names = new Set(brandProducts.map((product) => groupedVendorFor(product, fullCounts)));
  assert.equal(names.size, 1, `${rawVendor} maps to one grouped vendor name`);
  const [name] = names;
  assert.notEqual(name, '其他', `${rawVendor} remains a selectable brand in the snapshot`);
  return name;
}

const cezanne = brandGroup('CEZANNE');
const sanrio = brandGroup('Sanrio');
assert.equal(cezanne, 'CEZANNE', 'the live snapshot contains the real CEZANNE vendor');

// No brand: expose every category that the current classifier finds in data.
const noBrand = new Set();
const allFacets = assertFacetsMatchClassifier(products, null, noBrand,
  'unfiltered all-products facets match the real catalog and classifier');
assert.deepEqual(allFacets.map((facet) => facet.id), actualSections(products),
  'no-brand options equal all actually represented categories');

// A section argument does not invent or suppress sections in its passed product set.
const nonNullSectionFacets = assertFacetsMatchClassifier(products, 'makeup', noBrand,
  'non-null section still derives represented sections from the passed products');
assert.ok(nonNullSectionFacets.length > 1,
  'the non-null section case covers the full passed catalog, not a hard-coded section');

const cezanneVendors = new Set([cezanne]);
const cezanneProducts = poolFor(products, cezanneVendors);
for (const section of ['toys', 'kpop']) {
  assert.equal(cezanneProducts.some((product) => classification.sectionMatch(product, section)), false,
    `CEZANNE has no actual ${section} products under the existing classifier`);
}
const cezanneFacets = assertFacetsMatchClassifier(products, null, cezanneVendors,
  'CEZANNE facets use its actual represented sections');
assert.equal(cezanneFacets.some((facet) => facet.id === 'toys' || facet.id === 'kpop'), false,
  'CEZANNE never offers toys or K-pop');

const sanrioVendors = new Set([sanrio]);
const sanrioProducts = poolFor(products, sanrioVendors);
assert.equal(sanrioProducts.some((product) => classification.sectionMatch(product, 'makeup')), false,
  'Sanrio has no actual makeup products under the existing classifier');
const sanrioFacets = assertFacetsMatchClassifier(products, null, sanrioVendors,
  'Sanrio facets follow its actual products');
assert.equal(sanrioFacets.some((facet) => facet.id === 'makeup'), false,
  'Sanrio does not offer makeup when its products have no makeup membership');

// Selecting multiple grouped brands keeps the union of their real categories.
const mixedVendors = new Set([cezanne, sanrio]);
const mixedProducts = poolFor(products, mixedVendors);
const mixedFacets = assertFacetsMatchClassifier(products, null, mixedVendors,
  'mixed-brand facets match the combined product pool');
const expectedUnion = new Set([...actualSections(cezanneProducts), ...actualSections(sanrioProducts)]);
assert.deepEqual(mixedFacets.map((facet) => facet.id),
  sections.map(([id]) => id).filter((id) => expectedUnion.has(id)),
  'mixed-brand categories equal the union of each selected brand\'s categories');
assert.ok(mixedFacets.some((facet) => !actualSections(cezanneProducts).includes(facet.id))
  && mixedFacets.some((facet) => !actualSections(sanrioProducts).includes(facet.id)),
'mixed-brand selection preserves categories unique to each brand');

// A category-restricted product set exposes only valid category/subcategory options.
const makeupProducts = products.filter((product) => classification.sectionMatch(product, 'makeup'));
const restrictedPool = poolFor(makeupProducts, cezanneVendors);
const restrictedFacets = assertFacetsMatchClassifier(makeupProducts, 'makeup', cezanneVendors,
  'restricted makeup-page facets use the passed category product set');
const makeupFacet = restrictedFacets.find((facet) => facet.id === 'makeup');
assert.ok(makeupFacet, 'CEZANNE offers the makeup category when real CEZANNE makeup products are passed');
assert.ok(makeupFacet.subs.length > 0, 'restricted makeup page has valid subcategory options');
for (const sub of makeupFacet.subs) {
  const count = restrictedPool.filter((product) => classification.subMatch('makeup', sub.id, product)).length;
  assert.ok(count > 0, `makeup › ${sub.id} is valid for selected CEZANNE products`);
  assert.equal(sub.count, count, `makeup › ${sub.id} count comes from matching snapshot products`);
}

console.log(`Brand filter facet tests passed against ${products.length} zh catalog products and live taxonomy/classifier.`);
