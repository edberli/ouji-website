'use strict';

// Offline route regressions: execute the real storefront rules and catalog snapshots.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({
  window: { addEventListener() {}, location: { origin: 'https://example.test' } },
  document: {
    readyState: 'loading', addEventListener() {}, querySelectorAll() { return []; },
    createElement(tagName) { return { tagName, dataset: {}, style: {}, classList: { add() {}, remove() {} } }; },
    head: { appendChild() {} },
  },
  location: { pathname: '/shop.html', search: '' },
  localStorage: { getItem() { return null; }, setItem() {} },
  URLSearchParams, console,
});
vm.runInContext(read('shopify.js'), context, { filename: 'shopify.js' });
const rules = context.window.OUJI_categoryClassification;
assert.ok(rules, 'stable classification helpers are exposed');
const taxonomy = vm.runInContext('CATEGORY_TAXONOMY', context);
const sections = Object.keys(taxonomy);
assert.equal(sections.length, 11, 'evaluate every one of the 11 sections');
assert.equal(Object.values(taxonomy).reduce((n, section) => n + Object.keys(section.subs).length, 0), 79,
  'evaluate every one of the 79 subcategories');
const failures = [];
let checks = 0;
function check(condition, message) {
  checks++;
  if (!condition) failures.push(message);
}
function nonempty(items, message) {
  check(items.length > 0, `${message}: fixtures must exist`);
  return items;
}
function productText(p) { return [p.title, p.productType, ...(p.tags || [])].join(' '); }
function handles(products) { return products.map((p) => p.handle).sort(); }
const catalogs = ['data/catalog.json', 'data/catalog-en.json'].map((file) => {
  const snapshot = JSON.parse(read(file));
  assert.ok(Array.isArray(snapshot.v), `${file}: catalog snapshot has product edges`);
  return { file, products: snapshot.v.map(({ node }) => node) };
});
// Independent brand fixtures: provenance is not inferred from the unreliable K-Beauty tag.
const koreanSunBrands = new Set([
  'TIRTIR', 'COSRX', 'Beauty of Joseon', 'Haruharu WONDER', 'SKIN1004', 'Anua',
  'Round Lab', 'Torriden', 'mixsoon', 'beplain', 'Some By Mi', 'Abib', 'Skinfood',
  'Goodal', 'PURITO SEOUL', 'KSECRET', 'TOCOBO', 'BIOHEAL BOH', 'Arencia',
  "SO'NATURAL", 'VT Cosmetics', 'Dr.Jart+', 'Pyunkang Yul', "d'Alba", 'ATOPALM',
  'ongredients', 'OBgE', 'Derma:B', 'Cell Fusion C',
]);
const japaneseSunBrands = new Set([
  'Bioré', 'SUNCUT', 'ANESSA', 'PRIVACY', 'ROHTO', 'FANCL', 'ALLIE',
  'HADARIKI', 'BCL', 'SANA', 'ELIXIR', 'OMI', 'Sunplay',
]);
const requiredSunHandles = [
  'round-lab-round-lab-16g-spf50-pa-1031',
  'tocobo-tocobo-spf50-pa-35ml-1765',
  'vt-cosmetics-vt-pdrn-10-7201',
  'obge-pore-zero-oil-control-sun-stick-控油防曬棒-18g-spf50',
  'obge-uv-natural-cover-tone-up-cream-潤色防曬霜-50g-spf50-pa',
];
const diveInHandles = catalogs[0].products.filter((p) => /torriden/i.test(p.vendor)
  && /dive\s*in/i.test(p.title)).map((p) => p.handle);
assert.ok(diveInHandles.length > 0, 'actual Torriden DIVE IN products exist in the source catalog');
const membership = [];
const subMembership = [];
for (const { file, products } of catalogs) {
  const byHandle = new Map(products.map((p) => [p.handle, p]));
  check(byHandle.size === products.length, `${file}: product handles are unique`);
  const sectionSets = {};
  const subSets = {};
  let evaluatedSubs = 0;
  for (const section of sections) {
    sectionSets[section] = handles(products.filter((p) => rules.sectionMatch(p, section)));
    for (const sub of Object.keys(taxonomy[section].subs)) {
      evaluatedSubs++;
      subSets[`${section}:${sub}`] = handles(products.filter(p => rules.subMatch(section, sub, p)));
      for (const p of products) {
        const member = rules.subMatch(section, sub, p);
        if (member && !(section === 'skincare' && sub === 'counter')) {
          check(rules.sectionMatch(p, section), `${file}: ${section}/${sub} escapes parent: ${p.handle}`);
        }
      }
    }
  }
  check(evaluatedSubs === 79, `${file}: evaluated 79 subcategories`);
  membership.push(sectionSets);
  subMembership.push(subSets);
  const oral = products.filter((p) => p.productType === '保健品');
  check(oral.length === 125, `${file}: confirmed 125 oral product fixtures`);
  for (const p of oral) check(rules.sectionMatch(p, 'health'), `${file}: oral product missing health: ${p.handle}`);
  check(sectionSets.health.length === 125, `${file}: health contains only 125 oral products`);

  const nonMakeup = nonempty(products.filter((p) =>
    /^(?:化妝工具|化妝掃(?:／.*)?|美容工具|美妝工具|美髮工具|美甲工具|潔面|卸妝|口腔護理|保健品)$/.test(p.productType)), `${file}: tool/cleanser/oral`);
  for (const p of nonMakeup) check(!rules.sectionMatch(p, 'makeup'), `${file}: tool/cleanser/oral in makeup: ${p.handle}`);
  const topicalIngredients = nonempty(products.filter((p) =>
    /^(?:精華|面霜|面膜|防曬|眼霜|棉片|爽膚水|乳液)$/.test(p.productType)
    && /collagen|vitamin|膠原|維他命|維生素/i.test(productText(p))), `${file}: external ingredient`);
  for (const p of topicalIngredients) check(!rules.sectionMatch(p, 'health'), `${file}: external ingredient in health: ${p.handle}`);

  const kpop = products.filter((p) => rules.sectionMatch(p, 'kpop'));
  check(kpop.length === 25, `${file}: exactly 25 K-pop products`);
  check(kpop.filter((p) => p.productType === '專輯').length === 24, `${file}: 24 albums`);
  check(kpop.filter((p) => p.productType === '寫真書').length === 1, `${file}: one photobook`);
  for (const p of kpop) check(['專輯', '寫真書'].includes(p.productType), `${file}: non-media K-pop product: ${p.handle}`);
  const falseKpop = nonempty(products.filter((p) => /torriden|nivea/i.test(p.vendor)
    || /olive\s*young/i.test((p.tags || []).join(' '))), `${file}: DIVE IN/NIVEA/Olive Young`);
  for (const handle of diveInHandles) check(falseKpop.some((p) => p.handle === handle), `${file}: actual DIVE IN fixture ${handle} exists`);
  check(falseKpop.some((p) => /nivea/i.test(p.vendor)), `${file}: NIVEA fixture exists`);
  check(falseKpop.some((p) => /olive\s*young/i.test((p.tags || []).join(' '))), `${file}: Olive Young tag fixture exists`);
  for (const p of falseKpop) check(!rules.sectionMatch(p, 'kpop'), `${file}: false K-pop member: ${p.handle}`);

  const koreanSun = nonempty(products.filter((p) => p.productType === '防曬' && koreanSunBrands.has(p.vendor)), `${file}: Korean sunscreen`);
  for (const handle of requiredSunHandles) check(koreanSun.some((p) => p.handle === handle), `${file}: required sunscreen fixture ${handle}`);
  for (const p of koreanSun) {
    check(rules.sectionMatch(p, 'skincare'), `${file}: Korean sunscreen missing skincare: ${p.handle}`);
    check(rules.sectionMatch(p, 'seasonal'), `${file}: Korean sunscreen missing seasonal: ${p.handle}`);
    check(rules.subMatch('skincare', 'sunscreen', p), `${file}: Korean sunscreen missing skincare sub: ${p.handle}`);
    check(rules.subMatch('seasonal', 'sun', p), `${file}: Korean sunscreen missing seasonal sub: ${p.handle}`);
  }
  const japaneseSun = nonempty(products.filter((p) => p.productType === '防曬' && japaneseSunBrands.has(p.vendor)), `${file}: known Japanese sunscreen`);
  const mistagged = japaneseSun.filter((p) => p.tags.includes('K-Beauty'));
  check(mistagged.length === 2, `${file}: two known Japanese sunscreen fixtures incorrectly tagged K-Beauty`);
  for (const p of japaneseSun) {
    check(!rules.sectionMatch(p, 'skincare'), `${file}: known Japanese sunscreen in skincare: ${p.handle}`);
    check(!rules.subMatch('skincare', 'sunscreen', p), `${file}: known Japanese sunscreen in skincare sub: ${p.handle}`);
    check(rules.subMatch('seasonal', 'sun', p), `${file}: Japanese sunscreen missing seasonal: ${p.handle}`);
  }

  // Actual base makeup keeps its identity even when its name mentions skincare/SPF.
  const foundations = nonempty(products.filter((p) => /^(?:粉底|氣墊粉底)$/.test(p.productType)
    && /serum|精華|spf/i.test(p.title)), `${file}: serum/SPF foundation`);
  for (const p of foundations) {
    check(rules.sectionMatch(p, 'makeup'), `${file}: foundation missing makeup: ${p.handle}`);
    check(rules.subMatch('makeup', 'base', p), `${file}: foundation missing base: ${p.handle}`);
    check(!rules.subMatch('seasonal', 'sun', p), `${file}: SPF foundation became sunscreen: ${p.handle}`);
  }
  for (const handle of ['anua-anua-20-c-20g-3055', 'round-lab-round-lab-50-1840']) {
    const topical = byHandle.get(handle);
    check(Boolean(topical), `${file}: real vitamin/collagen skincare fixture ${handle} exists`);
    if (topical) {
      check(rules.sectionMatch(topical, 'skincare'), `${file}: real vitamin/collagen product remains skincare: ${handle}`);
      check(!rules.sectionMatch(topical, 'health'), `${file}: real vitamin/collagen skincare stays outside health: ${handle}`);
    }
  }
  const brandProbiotics = nonempty(products.filter((p) => /^vitamin village$/i.test(p.vendor)
    && /probiotic|益生菌/i.test(p.title)), `${file}: Vitamin Village probiotics`);
  for (const p of brandProbiotics) {
    check(rules.sectionMatch(p, 'health'), `${file}: Vitamin Village probiotic remains health`);
    check(!rules.subMatch('health', 'vitamin', p), `${file}: vendor-only vitamin match: ${p.handle}`);
    check(!rules.subMatch('health', 'vitamin', { ...p, tags: [...p.tags, p.vendor] }),
      `${file}: vendor brand tag must not become a vitamin ingredient: ${p.handle}`);
  }
  const actualVitaminC = byHandle.get('vitamin-village-美味超級-c-維他命-c-2000-維他命-d-3000-3g-x-60條');
  check(Boolean(actualVitaminC), `${file}: actual Vitamin C fixture exists`);
  if (actualVitaminC) check(rules.subMatch('health', 'vitamin', actualVitaminC), `${file}: actual Vitamin C matches vitamin`);

  for (const [section, sub] of [['tools', 'puff'], ['makeup', 'lash'], ['makeup', 'setting']]) {
    nonempty(products.filter(p => rules.subMatch(section, sub, p)), `${file}: ${section}/${sub} was incorrectly empty`);
  }
  for (const p of products.filter(p => /^(?:氣墊粉底|粉底|妝前乳|妝前底霜)$/.test(p.productType))) {
    check(!rules.subMatch('makeup', 'setting', p), `${file}: foundation/primer in setting: ${p.handle}`);
  }
  const toolCleaners = nonempty(products.filter(p => /工具/.test(p.productType)
    && /清潔|cleanser|cleaner|cleansing|拋光|buffer/i.test(p.title)), `${file}: tool cleaner/buffer fixtures`);
  for (const p of toolCleaners) {
    check(!rules.subMatch('tools', 'puff', p), `${file}: cleaner/buffer in puff: ${p.handle}`);
    check(!rules.subMatch('tools', 'brush', p), `${file}: cleaner/buffer in brush: ${p.handle}`);
  }
  for (const p of nonempty(products.filter(p => p.productType === '沐浴'), `${file}: bath products`)) {
    check(!rules.subMatch('bath', 'lotion', p), `${file}: bath wash in body lotion: ${p.handle}`);
  }
  const wrongMaterial = nonempty(products.filter(p => /3D.*(?:Magnet|冰箱貼)|Snow Globe|亞克力|Acrylic Rug Stand/i.test(p.title)), `${file}: hard toy fixtures`);
  for (const p of wrongMaterial) check(!rules.subMatch('toys', 'plush', p), `${file}: magnet/figure in plush: ${p.handle}`);
  for (const [id, expected] of [['8887486808222', 'mist'], ['8887486152862', 'home']]) {
    const p = products.find(p => p.id === `gid://shopify/Product/${id}`);
    check(Boolean(p), `${file}: reviewed fragrance fixture ${id}`);
    if (p) for (const sub of ['perfume', 'mist', 'home']) {
      check(rules.subMatch('fragrance', sub, p) === (sub === expected), `${file}: fragrance use ${id}/${sub}`);
    }
  }
}
for (const section of sections) {
  check(JSON.stringify(membership[0][section]) === JSON.stringify(membership[1][section]),
    `zh/en memberships differ for ${section}: zh-only=${membership[0][section].filter((h) => !membership[1][section].includes(h)).join(',')}; en-only=${membership[1][section].filter((h) => !membership[0][section].includes(h)).join(',')}`);
}
for (const key of Object.keys(subMembership[0])) {
  check(JSON.stringify(subMembership[0][key]) === JSON.stringify(subMembership[1][key]),
    `zh/en subcategory memberships differ for ${key}`);
}

// Static checks target the actual filtering function bodies, not unrelated mentions.
const shop = read('shop.html');
const catScope = shop.match(/const catScope\s*=\s*\(p\)\s*=>\s*\{([\s\S]*?)\n\s*\};/)?.[1] || '';
check(/if\s*\(CATEGORY_TAXONOMY\[cat\]\)\s*return sectionMatch\(p, cat\)/.test(catScope), 'shop.html catScope section delegates sectionMatch');
check(/sectionMatch\(p, sec\)\s*&&\s*subMatch\(sec, cat, p\)/.test(catScope), 'shop.html catScope sub checks parent and child');
check(/products\s*=\s*products\.filter\(catScope\)/.test(shop), 'shop.html applies catScope to products');
const catalog = read('catalog.js');
const applyFilters = catalog.slice(catalog.indexOf('function applyFilters('), catalog.indexOf('\n}', catalog.indexOf('function applyFilters(')) + 2);
check(/section\s*\?\s*subMatch\(section, id, p\)\s*:\s*sectionMatch\(p, id\)/.test(applyFilters), 'catalog.js all-products category filtering delegates sectionMatch');
check(/!sectionMatch\(p, sec\)/.test(applyFilters), 'catalog.js all-products sub filtering checks parent');
if (failures.length) {
  console.error(`Category route regressions: ${failures.length} failures / ${checks} assertions:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Category route regressions passed: ${checks} assertions; 11 sections / 79 subs evaluated in each zh/en catalog; 125 oral products and 25 K-pop products each; all section memberships identical.`);
}
