#!/usr/bin/env node
/* Exact-ID full-catalog check for the two-line display and Organic SEO title. */
const fs = require('fs');
const path = require('path');
const naming = require('../product-naming.js');
const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/catalog.json')))
  .v.map(({ node }) => node);
const failures = [];
const seo = new Map();
const comparable = (value) => String(value || '').normalize('NFKC').toLowerCase()
  .replace(/[^\p{L}\p{N}]/gu, '');

for (const product of products) {
  const out = naming.display(product);
  const cardName = naming.cardChinese(product);
  const cardTitle = naming.cardTitle(product);
  if (!/[\u3400-\u9fff]/.test(cardName)
      || !cardTitle.endsWith(cardName)
      || !comparable(cardTitle).startsWith(comparable(out.primary))) {
    failures.push({ id: product.id, reason: 'bad Chinese product tile', cardName, cardTitle });
  }
  const sourceSpecifications = product.title.match(/\d[\d,]*(?:\.\d+)?\s*(?:ml|kg|g|l|oz|片|枚|粒|支|包|條)(?![A-Za-z])|#[0-9]{1,3}[A-Za-z]?|\bNo\.\s*\d+/gi) || [];
  for (const specification of sourceSpecifications) {
    if (!comparable(cardTitle).includes(comparable(specification))) {
      failures.push({ id: product.id, reason: 'source specification lost on tile', specification, cardTitle });
    }
  }
  const vendorKeys = [product.vendor,
    String(product.vendor || '').replace(/[\u3400-\u9fff]+/g, ' ')].map(comparable).filter(Boolean);
  if (vendorKeys.some((key) => comparable(cardName).startsWith(key))) {
    failures.push({ id: product.id, reason: 'brand repeated inside tile name',
      vendor: product.vendor, cardName });
  }
  const combined = `${out.primary} ${out.subtitle} ${out.specification}`.toLowerCase();
  if (!out.split || !/[\u3400-\u9fff]/.test(out.primary)
      || !/[A-Za-z]/.test(out.subtitle) || /[\u3400-\u9fff]/.test(out.subtitle)) {
    failures.push({ id: product.id, reason: 'bad two-line split', title: product.title, out });
  }
  if (!out.seoTitle.startsWith(out.primary) || /[｜—-]\s*OUJI$/i.test(out.seoTitle)) {
    failures.push({ id: product.id, reason: 'bad Organic SEO title', out });
  }
  for (const token of product.title.match(/[\p{L}\p{N}]+/gu) || []) {
    if (!combined.includes(token.toLowerCase())) {
      failures.push({ id: product.id, reason: `lost title token: ${token}`, out });
    }
  }
  if (!seo.has(out.seoTitle)) seo.set(out.seoTitle, []);
  seo.get(out.seoTitle).push(product.id);
}

const clio = naming.display(products.find((p) => p.id === 'gid://shopify/Product/8817695785118'));
if (clio.primary !== 'CLIO 輕盈12色眼影盤'
    || clio.subtitle !== 'CLIO Pro Eye Palette Air'
    || clio.specification !== '#03 Mute Library'
    || clio.seoTitle !== 'CLIO 輕盈12色眼影盤｜Pro Eye Palette Air #03') {
  failures.push({ reason: 'approved CLIO layout drift', clio });
}

const molak = naming.display(products.find((p) => p.id === 'gid://shopify/Product/8826994131102'));
if (molak.subtitle !== 'Molak Brown Bunny' || molak.specification !== '10枚/盒') {
  failures.push({ reason: 'shade and pack split drift', molak });
}
const jungwonsam = naming.display(products.find((p) => p.id === 'gid://shopify/Product/8860607807646'));
if (!jungwonsam.subtitle.startsWith('JUNGWONSAM 6 Years')
    || jungwonsam.primary.endsWith(' 6')) {
  failures.push({ reason: 'English numeric name split drift', jungwonsam });
}
const clioTint = products.find((p) => p.id === 'gid://shopify/Product/8817694933150');
if (naming.cardChinese(clioTint) !== '水晶亮澤唇釉') {
  failures.push({ reason: 'CLIO product tile drift', cardName: naming.cardChinese(clioTint) });
}
for (const [id, expected] of [
  ['8820286324894', '20色眼影盤'],
  ['8819068108958', '3色亮膚定妝蜜粉'],
  ['8822188343454', '1025獨島爽膚水'],
  ['8822235168926', '(70片) 羅勒茶樹清涼棉片'],
  ['8822080274590', '水感清爽保濕防曬霜'],
  ['8820020543646', '甜心小熊成膜唇凍'],
  ['8822193553566', '胡蘿蔔舒緩保濕面膜'],
  ['8822242869406', '維他命C超亮眼凝膠眼膜'],
  ['8861742170270', '雙色眼線液筆'],
  ['8887467016350', '深椰香香氛凝膠'],
]) {
  const item = products.find((p) => p.id.endsWith(id));
  if (!naming.cardChinese(item).startsWith(expected)) {
    failures.push({ id, reason: 'product identity lost on tile', expected,
      actual: naming.cardChinese(item) });
  }
}

const duplicates = [...seo].filter(([, ids]) => ids.length > 1)
  .map(([title, ids]) => ({ title, ids }));
console.log(JSON.stringify({ checked: products.length, split: products.length - failures.length,
  failures: failures.slice(0, 15), duplicateSeoTitles: duplicates }, null, 2));
if (failures.length) process.exitCode = 1;
