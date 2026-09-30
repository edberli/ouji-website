'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const naming = require('../product-naming.js');

const catalogPath = require('node:path').join(__dirname, '../data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

function collectProducts(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectProducts(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  const product = value.node;
  if (product && typeof product.id === 'string'
      && product.id.startsWith('gid://shopify/Product/')) {
    output.push(product);
    return output;
  }
  for (const child of Object.values(value)) collectProducts(child, output);
  return output;
}

const productsById = new Map(collectProducts(catalog).map((product) => [product.id, product]));
function product(id) {
  const found = productsById.get(`gid://shopify/Product/${id}`);
  assert.ok(found, `catalog product ${id} exists`);
  return found;
}

const skin210 = naming.cardChinese(product('8822082306206'));
const skin400 = naming.cardChinese(product('8822086566046'));
assert.equal(skin210, '馬達加斯加積雪草爽膚水 210ml');
assert.equal(skin400, '馬達加斯加積雪草爽膚水 400ml');
assert.notEqual(skin210, skin400);
assert.doesNotMatch(skin210, /Madagascar|Centella|Toning Toner/i);

const clio = naming.cardChinese(product('8817695785118'));
assert.ok(clio.includes('#03 Mute Library'), `CLIO shade descriptor retained: ${clio}`);

const unove = naming.cardChinese(product('8863148834974'));
assert.ok(unove.includes('320ml x2'), `UNOVE set quantity retained: ${unove}`);
assert.ok(unove.includes('Tender Bloom 花香 + Warm Petals 木質花香'), `UNOVE scent set retained: ${unove}`);

const manyo = naming.cardChinese(product('8863159287966'));
assert.ok(manyo.includes('200ml + 補充裝 Refill 200ml + 試用裝 2ml x 3'), `ma:nyo refill set retained: ${manyo}`);

const maybelline = naming.cardChinese(product('8819509133470'));
assert.ok(maybelline.includes('正裝55ml+補充裝55ml'), `MAYBELLINE compound pack retained: ${maybelline}`);

const bracketed = naming.cardChinese(product('8822094364830'));
assert.ok(bracketed.includes('[200ml]'), `balanced source brackets retained: ${bracketed}`);

const ksecretWithIngredient = {
  title: 'K-SECRET 松樹精華 Serum Niacinamide 70% + Yuja 30ml',
  vendor: 'KSECRET',
};
assert.equal(naming.cardChinese(ksecretWithIngredient), '松樹精華 30ml', 'ingredient percentage is not treated as capacity');

const goldEnzyme = naming.cardChinese(product('8859708883102'));
assert.ok(goldEnzyme.includes('2g × 30條'), `100 Gold is not mistaken for 100g: ${goldEnzyme}`);

const tocobo = naming.cardChinese(product('8835129049246'));
assert.ok(tocobo.includes('50ml SPF50+ PA++++'), `SPF suffix retained: ${tocobo}`);

const whooSet = naming.cardChinese(product('8863033983134'));
assert.ok(whooSet.includes('150ml + Emulsion 110ml'), `two-product set suffix retained: ${whooSet}`);

const jmella = naming.cardChinese(product('8863038767262'));
assert.ok(jmella.includes('No.03 Lime & Basil 500ml'), `JMELLA scent descriptor retained: ${jmella}`);

const cezanne = naming.cardChinese(product('8883671564446'));
assert.ok(cezanne.includes('10 Light Ochre 9g'), `CEZANNE shade descriptor retained: ${cezanne}`);

for (const [id, descriptor] of [
  ['8863154405534', 'No.2 Flower Shop 1,013ml'],
  ['8864574537886', 'No.29 Daisy 1,013ml'],
  ['8864574865566', 'No.12 Soosunhwa 1,013ml'],
]) {
  const label = naming.cardChinese(product(id));
  assert.ok(label.includes(descriptor), `HETRAS numbered scent and comma-formatted size retained: ${label}`);
}

const arencia = naming.cardChinese(product('8835161817246'));
assert.ok(arencia.includes('No. 5'), `Arencia source shade code retained: ${arencia}`);

const chineseOnly = { title: '珂潤 潤浸保濕防曬乳 50g', vendor: '珂潤' };
const chineseOnlyLabel = naming.cardChinese(chineseOnly);
assert.equal(chineseOnlyLabel, '潤浸保濕防曬乳 50g');
assert.equal((chineseOnlyLabel.match(/50g/g) || []).length, 1, 'Chinese-only size is not duplicated');

const englishOnly = { title: 'Anessa Perfect UV Sunscreen Milk SPF50 60ml', vendor: 'ANESSA' };
assert.equal(naming.cardTitle(englishOnly), englishOnly.title, 'English-only fallback is unchanged');

console.log('Product card name tests passed against the current catalog.');

assert.ok(naming.cardChinese(product('8863164891294')).includes('No.05 Sparkling Rosé 500ml'));
