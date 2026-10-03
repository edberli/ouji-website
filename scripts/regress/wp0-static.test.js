'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const P = require('../../ds/purchasable.js');

const ROOT = path.join(__dirname, '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const trackedHtml = execFileSync('git', ['ls-files', '-z', '--', '*.html'], { cwd: ROOT })
  .toString().split('\0').filter(Boolean)
  .filter((f) => !/(?:^|\/)(?:preview[^/]*|color-preview)\.html$/.test(f));

test('isPurchasable truth table follows shared rule and existing lens exception', () => {
  const v = (availableForSale, quantityAvailable) => ({ availableForSale, quantityAvailable });
  for (const [variant, expected] of [
    [v(true, 4), true],
    [v(true, null), true],
    [v(true, undefined), true],
    [v(true, 0), false],
    [v(true, -1), false],
    [v(false, 4), false],
    [null, false],
    [undefined, false],
  ]) assert.equal(P.isPurchasable(variant), expected);
  assert.equal(P.isPurchasable(v(true, 0), { lens: true }), P.LENS_PREORDER_ALLOWED);
  assert.equal(P.isPurchasable(v(false, 0), { lens: true }), false);
  assert.equal(P.PREORDER_LABEL, '預訂 · 約 14 日');
});

test('all implemented add paths use the shared purchasability gate', () => {
  const product = read('product.html');
  assert.match(product, /const canBuy = \(v\) => P\.isPurchasable\(v, buyOpts\)/);
  assert.match(product, /!canBuy\(v\) \? 'disabled/);
  assert.match(product, /!chosenV \|\| !canBuy\(chosenV\)/);
  assert.match(product, /power-btn__tag">\$\{P\.PREORDER_LABEL\}/);
  assert.match(product, /data-preorder-tag hidden>\$\{P\.PREORDER_LABEL\}/);

  const catalog = read('catalog.js');
  const home = read('home.js');
  const shopify = read('shopify.js');
  const script = read('script.js');
  assert.match(catalog, /function variantInStock\(v\) \{\s*return window\.OUJI_purchasable\.isPurchasable\(v\);/);
  assert.match(catalog, /purchasable: variantInStock\(variant\)/);
  assert.match(catalog, /if \(oneVariant && variantId && !purchasable\)/);
  assert.match(home, /const canBuy = window\.OUJI_purchasable\.isPurchasable/);
  assert.match(home, /one && canBuy\(v\)[\s\S]{0,80}data-quick-add/);
  assert.match(script, /await addToCart\(add\.dataset\.quickAdd, 1\)/);
  assert.match(shopify, /verifyVariantsAddable\(\[variantId\]\)/);
  assert.match(shopify, /P\.verifyAddable\(ids,/);

  const cart = read('cart.html');
  assert.match(cart, /\.filter\(\(p\) => window\.OUJI_purchasable\.isPurchasable\(p\.variants\?\.edges\?\.\[0\]\?\.node\)\)/);
  assert.equal((cart.match(/window\.OUJI_purchasable\.firstPurchasable\(p\.variants\?\.edges\)/g) || []).length, 2);
  assert.equal((cart.match(/await addToCart\(btn\.dataset\.vid, 1\)/g) || []).length, 2);

  const shortDated = read('short-dated.html');
  assert.match(shortDated, /window\.OUJI_purchasable\.firstPurchasable\(v\)/);
  assert.match(shortDated, /await addToCart\(btn\.dataset\.vid, 1\)/);
  assert.match(home, /\.filter\(\(p\) => canBuy\(p\.variants\?\.edges\?\.\[0\]\?\.node\)\)/);

  const match = read('match.js');
  const skincareMatch = read('skincare-match.js');
  assert.match(match, /window\.OUJI_purchasable\.firstPurchasable\(full\?\.variants\?\.edges\)/);
  assert.match(match, /await addToCart\(v\.id, 1\)/);
  assert.match(skincareMatch, /available: window\.OUJI_purchasable\.isPurchasable\(v\)/);
  assert.match(skincareMatch, /await addToCart\(id, 1\)/);
  assert.match(skincareMatch, /await addToCart\(l\.merchandiseId, 1\)/);

  const awards = read('awards.html');
  assert.match(awards, /return `<a class="award-card/);
  assert.doesNotMatch(awards, /addToCart|data-quick-add|data-add=/);
  assert.doesNotMatch(read('awards.js'), /addToCart|data-quick-add|data-add=/);
});

test.todo('variant sheet add path lands in WP3 and must use isPurchasable before addToCart');
test.todo('match live overlay stock path lands in WP13 and must use isPurchasable');

test('catalog scopes remain applied after ouji:catalog-refreshed', () => {
  const shop = read('shop.html');
  const catalog = read('catalog.js');
  assert.match(shop, /scopes\.push\(brandScope\)/);
  assert.match(shop, /scopes\.push\(concernScope\)/);
  assert.match(shop, /scopes\.push\(catScope\)/);
  assert.match(shop, /const scope = scopes\.length \? \(p\) => scopes\.every\(\(f\) => f\(p\)\) : null/);
  assert.match(shop, /initCatalog\(\{[^}]*scope \}\)/);
  assert.match(catalog, /document\.addEventListener\('ouji:catalog-refreshed'/);
  assert.match(catalog, /\.filter\(inSection\)\s*\.filter\(\(p\) => !scope \|\| scope\(p\)\)/);
  assert.match(catalog, /brandFromUrl\(products\)/);
  assert.match(catalog, /preselectBrand\(urlBrand\)/);
});

test('production HTML contains none of the rejected superlatives or Korean fragment', () => {
  for (const f of trackedHtml) {
    const html = read(f);
    for (const term of ['過百', '過千', '最齊', '세라믹']) assert.ok(!html.includes(term), `${f} contains ${term}`);
  }
});

test('evergreen 限時 wording has no undated production HTML occurrence', () => {
  for (const f of trackedHtml) {
    const html = read(f);
    const hits = [...html.matchAll(/限時/g)];
    for (const hit of hits) {
      const context = html.slice(Math.max(0, hit.index - 180), hit.index + 180);
      assert.match(context, /(?:20\d{2}[年/-])?\d{1,2}\s*月.{0,30}\d{1,2}\s*[日至–—-]|\d{1,2}[/-]\d{1,2}\s*[日至–—-]\s*\d{1,2}[/-]\d{1,2}/, `${f} has undated 限時 copy`);
    }
  }
});

test('review source and headline match Olive Young Global · N 則評價', () => {
  const reviews = read('reviews.js');
  const source = JSON.parse(read('data/ratings.json')).source;
  assert.equal(source, 'Olive Young Global');
  assert.match(reviews, /const RATING_SOURCE = 'Olive Young Global'/);
  assert.match(reviews, /\$\{RATING_SOURCE\} · \$\{d\.count\.toLocaleString\(\)\} 則評價/);
  assert.doesNotMatch(reviews, /位顧客評過/);
});

test('copy fixes are present across production page and card sources', () => {
  for (const f of [...trackedHtml, 'catalog.js', 'home.js', 'shopify.js', 'reviews.js']) {
    const source = read(f).replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!source.includes('合作品牌'), `${f} retains 合作品牌`);
    assert.ok(!source.includes('今週焦點'), `${f} retains 今週焦點`);
  }
  const product = read('product.html');
  assert.match(product, /Allure\s*讀者票選/);
  assert.match(product, /replace\(\/\[—–-\]\*\\s\*\\d\{4\}\\s\*Allure/);
});

test('about claims are removed while preserving the verified street address', () => {
  const about = read('about.html');
  assert.doesNotMatch(about, /每一個都經過團隊親自試用|直接供貨/);
  assert.ok(!/\b48\b/.test(about.replace(/472–480/g, '')));
});

test('$399 discount remains visible and has consistent wording', () => {
  const index = read('index.html');
  assert.match(index, /滿 HK\$399 減 \$20/);
  const wording = new Set();
  for (const f of trackedHtml) {
    const html = read(f);
    for (const match of html.matchAll(/(?:買)?滿 HK\$399(?: 自動)? 減 \$20/g)) {
      wording.add(match[0].replace(/^買/, '').replace(' 自動', ''));
    }
  }
  assert.deepEqual([...wording], ['滿 HK$399 減 $20']);
  assert.match(index, /買滿 HK\$399 自動減 \$20/);
});

test('PDP low-stock red dot is hidden unless real 1–2 unit text is present', () => {
  const product = read('product.html');
  const css = read('styles.css');
  assert.match(product, /el\.hidden = !t/);
  assert.match(product, /oujiLowStockText\(v\.quantityAvailable\)/);
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
  assert.match(css, /\.product-info__stock::before/);
});

test('short-dated product cards do not render strike prices', () => {
  const catalog = read('catalog.js');
  const shopify = read('shopify.js');
  assert.doesNotMatch(read('short-dated.html'), /sd-card__was/);
  assert.doesNotMatch(read('cart.html'), /addon__was/);
  assert.match(shopify, /function oujiCardComparePrice\(p\) \{\s*if \(isShortDated\(p\)\) return null/);
  assert.match(catalog, /!\(typeof isShortDated === 'function' && isShortDated\(p\)\)/);
});

test('sticky foundations and Clarity click event are wired once', () => {
  const css = read('styles.css');
  assert.match(css, /html \{[^}]*overflow-x:\s*clip;/s);
  assert.match(css, /body \{[^}]*overflow-x:\s*clip;/s);
  assert.match(css, /\.product-gallery \{\s*position:\s*sticky/);
  assert.match(css, /\.cart-summary \{[\s\S]{0,700}position:\s*sticky/);
  const analytics = read('analytics.js');
  const cart = read('cart.html');
  assert.match(analytics, /function trackCheckoutClick\(\) \{\s*window\.clarity\?\.\('event', 'cart_checkout_click'\);/);
  assert.equal((cart.match(/trackCheckoutClick\(\)/g) || []).length, 1);
  assert.match(cart, /checkoutBtn\.addEventListener\('click', async \(\) => \{\s*if \(typeof trackCheckoutClick === 'function'\) trackCheckoutClick\(\);/);
});
