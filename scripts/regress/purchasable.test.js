'use strict';
/* R11 / WP0：isPurchasable 同加購前覆核。node --test scripts/regress/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../../ds/purchasable.js');

const v = (availableForSale, quantityAvailable, id = 'gid://shopify/ProductVariant/1') =>
  ({ id, availableForSale, quantityAvailable });

test('isPurchasable: plain rule', () => {
  assert.equal(P.isPurchasable(v(true, 3)), true);
  assert.equal(P.isPurchasable(v(true, null)), true, 'untracked inventory follows availableForSale');
  assert.equal(P.isPurchasable(v(true, undefined)), true);
  assert.equal(P.isPurchasable(v(true, 0)), false, 'CONTINUE policy at 0 is not purchasable');
  assert.equal(P.isPurchasable(v(true, -2)), false);
  assert.equal(P.isPurchasable(v(false, 5)), false);
  assert.equal(P.isPurchasable(null), false);
  assert.equal(P.isPurchasable(undefined), false);
});

test('lens powers: pre-order at 0 only with the lens flag, never when Shopify says unavailable', () => {
  const lens = { lens: true };
  assert.equal(P.isPurchasable(v(true, 0), lens), P.LENS_PREORDER_ALLOWED);
  assert.equal(P.isPurchasable(v(false, 0), lens), false);
  assert.equal(P.isPreorder(v(true, 0), lens), P.LENS_PREORDER_ALLOWED);
  assert.equal(P.isPreorder(v(true, null), lens), P.LENS_PREORDER_ALLOWED, 'lens null qty is labelled pre-order like the old power chips');
  assert.equal(P.isPreorder(v(true, 4), lens), false);
  assert.equal(P.isPreorder(v(true, 0)), false, 'non-lens is never pre-order');
  assert.match(P.PREORDER_LABEL, /^預訂 · 約 14 日$/);
});

test('isLensProduct reads the first option name', () => {
  assert.equal(P.isLensProduct({ options: [{ name: '度數' }] }), true);
  assert.equal(P.isLensProduct({ options: [{ name: '色號' }, { name: '度數' }] }), false);
  assert.equal(P.isLensProduct({}), false);
  assert.equal(P.isLensProduct(null), false);
});

test('firstPurchasable accepts edges or nodes and skips quantity-0 variants', () => {
  const edges = [{ node: v(true, 0, 'a') }, { node: v(false, 9, 'b') }, { node: v(true, 2, 'c') }];
  assert.equal(P.firstPurchasable(edges).id, 'c');
  assert.equal(P.firstPurchasable(edges.map((e) => e.node)).id, 'c');
  assert.equal(P.firstPurchasable([{ node: v(true, 0) }]), null);
  assert.equal(P.firstPurchasable(undefined), null);
});

test('verifyAddable blocks a quantity-0 variant before cartLinesAdd', async () => {
  const fetchNodes = async (ids) => ids.map((id) => ({
    id, availableForSale: true, quantityAvailable: id.endsWith('/0') ? 0 : 5,
    product: { options: [{ name: '色號' }] },
  }));
  const bad = await P.verifyAddable(['gid://shopify/ProductVariant/0'], fetchNodes);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.blocked, ['gid://shopify/ProductVariant/0']);
  const good = await P.verifyAddable(['gid://shopify/ProductVariant/7'], fetchNodes);
  assert.equal(good.ok, true);
});

test('verifyAddable: lens power at 0 passes (pre-order), unavailable lens power is blocked', async () => {
  const fetchNodes = async (ids) => ids.map((id) => ({
    id, availableForSale: !id.endsWith('/x'), quantityAvailable: 0,
    product: { options: [{ name: '度數' }] },
  }));
  assert.equal((await P.verifyAddable(['lens/1'], fetchNodes)).ok, P.LENS_PREORDER_ALLOWED);
  assert.equal((await P.verifyAddable(['lens/x'], fetchNodes)).ok, false);
});

test('verifyAddable: unknown variant blocked, empty list refused, network error lets Shopify decide', async () => {
  assert.equal((await P.verifyAddable(['missing'], async () => [null])).ok, false);
  assert.equal((await P.verifyAddable([], async () => [])).ok, false);
  const offline = await P.verifyAddable(['x'], async () => { throw new Error('offline'); });
  assert.equal(offline.ok, true);
  assert.equal(offline.reason, 'unverified');
});
