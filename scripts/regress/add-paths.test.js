'use strict';
/* R11 / WP0：八條加購路徑逐條檢查有冇用 ds/purchasable.js 嗰把尺。
   行為測試（真瀏覽器、真 qty-0 variant）喺 browser-wp0.mjs。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('guard: addToCart re-checks stock on Shopify before cartLinesAdd', () => {
  const s = read('shopify.js');
  const fn = s.slice(s.indexOf('async function addToCart('), s.indexOf('cartLinesAdd(cartId: $cartId', s.indexOf('async function addToCart(')));
  assert.match(fn, /verifyVariantsAddable\(\[variantId\]\)/);
  assert.match(fn, /if \(!check\.ok\)[\s\S]*?return null;/);
  assert.match(s, /P\.verifyAddable\(ids,/);
});

test('every page that loads shopify.js loads ds/purchasable.js first', () => {
  const pages = [];
  const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((d) => {
    const rel = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (!['node_modules', 'prototypes', 'match-app', 'scripts', '.git', 'assets', 'data'].includes(d.name)) walk(rel);
    } else if (d.name.endsWith('.html')) pages.push(rel);
  });
  walk('.');
  let checked = 0;
  pages.forEach((p) => {
    const s = read(p);
    const i = s.search(/<script src="(?:\.\.\/|\/)?shopify\.js/);
    if (i < 0) return;
    checked++;
    const j = s.search(/<script src="(?:\.\.\/|\/)?ds\/purchasable\.js/);
    assert.ok(j >= 0 && j < i, `${p} must load ds/purchasable.js before shopify.js`);
  });
  assert.ok(checked >= 30, `checked ${checked} pages`);
});

test('path 1: PDP shade chips and CTA', () => {
  const s = read('product.html');
  assert.match(s, /data-variant-id="\$\{v\.id\}" \$\{!canBuy\(v\) \? 'disabled/, 'shade chip disabled when not purchasable');
  assert.doesNotMatch(s, /!v\.availableForSale \? 'disabled/, 'old availableForSale-only chip rule is gone');
  assert.match(s, /const anyStock = variants\.some\(canBuy\)/);
  assert.match(s, /if \(!chosenV \|\| !canBuy\(chosenV\)\) \{ syncCta\(\); return; \}/, 'CTA click re-checks the chosen variant');
  assert.doesNotMatch(s, /cartButton\.disabled = false/, 'chip click no longer re-enables the CTA unconditionally');
  assert.doesNotMatch(s, /\?\.click\(\);\s*\}\s*\} else if \(optionsContainer\)/, 'preselect does not rely on click() of a disabled chip');
  assert.match(s, /\} else if \(!canBuy\(v\)\) \{\s*cta\.disabled = true;/);
});

test('path 1 (lens): quantity-0 power shows a visible pre-order label on the chip and next to the CTA', () => {
  const s = read('product.html');
  assert.match(s, /\$\{buyable \? '' : ' disabled'\}/, 'unavailable powers are disabled');
  assert.match(s, /power-btn__tag">\$\{P\.PREORDER_LABEL\}<\/span>/);
  assert.match(s, /data-preorder-tag hidden>\$\{P\.PREORDER_LABEL\}到貨/);
  assert.match(s, /if \(tag\) tag\.hidden = !\(v && isPreorderV\(v\)\)/);
});

test('path 2: quick-add on cards (catalog.js, home.js; handler in script.js)', () => {
  const c = read('catalog.js');
  assert.match(c, /function variantInStock\(v\) \{\s*return window\.OUJI_purchasable\.isPurchasable\(v\);/);
  assert.match(c, /purchasable: variantInStock\(variant\)/);
  assert.match(c, /if \(oneVariant && variantId && !purchasable\)/);
  const h = read('home.js');
  assert.match(h, /one && canBuy\(v\)\s*\?\s*`<button type="button" class="product-card__quick-add"/);
  const sj = read('script.js');
  assert.match(sj, /await addToCart\(add\.dataset\.quickAdd, 1\)/, 'quick-add goes through the guarded addToCart');
  const sh = read('shopify.js');
  assert.doesNotMatch(sh, /data-quick-add/, 'shopify.js productCard has no quick-add');
});

test('path 3: variant sheet (WP3)', { todo: 'variant sheet lands in WP3; must call OUJI_purchasable.isPurchasable per chip and go through addToCart' }, () => {});

test('path 4: cart add-on rail', () => {
  const s = read('cart.html');
  assert.match(s, /\.filter\(\(p\) => window\.OUJI_purchasable\.isPurchasable\(p\.variants\?\.edges\?\.\[0\]\?\.node\)\)/);
  assert.doesNotMatch(s, /edges\?\.\[0\]\?\.node\?\.availableForSale/);
});

test('path 5: short-dated add-ons in the cart and on short-dated.html', () => {
  const s = read('cart.html');
  assert.equal((s.match(/window\.OUJI_purchasable\.firstPurchasable\(p\.variants\?\.edges\)/g) || []).length, 2);
  assert.match(read('short-dated.html'), /const live = window\.OUJI_purchasable\.firstPurchasable\(v\);/);
});

test('path 6: home rails', () => {
  const h = read('home.js');
  assert.match(h, /\.filter\(\(p\) => canBuy\(p\.variants\?\.edges\?\.\[0\]\?\.node\)\)/);
  assert.doesNotMatch(h, /edges\?\.\[0\]\?\.node\?\.availableForSale/);
});

test('path 7: awards cards have no add-to-bag control (link to PDP only)', () => {
  for (const f of ['awards.html', 'awards.js']) {
    const s = read(f);
    assert.doesNotMatch(s, /addToCart|data-quick-add|data-add=/, `${f} must not add to bag directly`);
  }
});

test('path 8: match tools', () => {
  const sm = read('skincare-match.js');
  assert.match(sm, /available: window\.OUJI_purchasable\.isPurchasable\(v\)/);
  assert.match(sm, /variants\(first: 1\) \{ edges \{ node \{ id availableForSale quantityAvailable \} \} \}/);
  assert.match(sm, /\.filter\(\(r\) => r\.live && r\.live\.available\)/);
  assert.match(sm, /const id = pick\?\.live\?\.available \? pick\.live\.variantId : null;/);
  assert.match(read('match.js'), /window\.OUJI_purchasable\.firstPurchasable\(full\?\.variants\?\.edges\)/);
});

test('path 8b: Makeup Room app live stock overlay (WP13)', { todo: 'match-app uses static inStock; covered meanwhile by the addToCart Shopify re-check' }, () => {});

test('no add path gates on availableForSale alone', () => {
  const files = ['catalog.js', 'home.js', 'cart.html', 'short-dated.html', 'product.html', 'skincare-match.js', 'match.js'];
  for (const f of files) {
    const s = read(f);
    assert.doesNotMatch(s, /\.find\(\(x\) => x\.(?:node\.)?availableForSale\)/, `${f}: find by availableForSale only`);
    assert.doesNotMatch(s, /x\.availableForSale && \(x\.quantityAvailable \?\? [01]\) > 0/, `${f}: inline stock rule instead of shared helper`);
  }
});
