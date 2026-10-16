#!/usr/bin/env node
/**
 * 文章覆核：唔係改文，係將要人睇嘅位一次過列出嚟。
 *   node scripts/articles/review.js <slug> [...]
 * 會查：禁用字（醫療／誇張）、「最」字句、文中提到嘅 HK$ 同產品實價對唔對得上、
 * 連結、FAQ 數、字數、標題長度。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const catalog = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/catalog.json'), 'utf8')).v.map((e) => e.node || e).map((p) => [p.handle, p]));
const ratingsAll = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ratings.json'), 'utf8')).products || {};
// 文章寫明「Olive Young 評分」：@cosme（7 分制）／YesStyle 嘅分唔准混入
const ratings = Object.fromEntries(Object.entries(ratingsAll).filter(([, r]) => !r.src || r.src === 'oy'));

const BAD = /治療|根治|消炎|醫學證實|臨床證實|去斑|美白|神器|完美|史上|天花板|必買神物|零瑕疵|逆天|！！|療效|醫生推薦|藥用|殺菌|抗菌|排毒|速效|即時見效|保證/g;
const strip = (s) => String(s || '').replace(/<[^>]+>/g, '');

for (const slug of process.argv.slice(2)) {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', `${slug}.json`), 'utf8'));
  const texts = [];
  const handles = new Set();
  const walk = (x, where) => {
    if (Array.isArray(x)) return x.forEach((y) => walk(y, where));
    if (x && typeof x === 'object') {
      if (x.handle) handles.add(x.handle);
      if (Array.isArray(x.products)) x.products.forEach((h) => handles.add(h));
      if (Array.isArray(x.handles)) x.handles.forEach((h) => handles.add(h));
      for (const [k, v] of Object.entries(x)) {
        if (typeof v === 'string' && !['type', 'handle', 'id', 'src', 'slug', 'id_prefix', 'url', 'no'].includes(k)) texts.push([`${where}.${k}`, v]);
        else walk(v, `${where}.${k}`);
      }
    }
  };
  walk(spec, slug);
  const all = texts.map(([, v]) => strip(v)).join('\n');
  const prices = new Map([...handles].map((h) => [h, Number(catalog.get(h)?.priceRange?.minVariantPrice?.amount)]));
  console.log(`\n══ ${slug} ══`);
  console.log(`title(${strip(spec.title).length}) ${strip(spec.title)}`);
  console.log(`seo_title(${(spec.seo_title || '').length}) ${spec.seo_title}`);
  console.log(`description(${(spec.description || '').length}) ${spec.description}`);
  console.log(`字數約 ${all.replace(/\s/g, '').length}；產品 ${handles.size} 件；FAQ ${JSON.stringify(spec).match(/"q":/g)?.length || 0} 條`);
  const missing = [...handles].filter((h) => !catalog.has(h));
  if (missing.length) console.log('✗ 搵唔到產品：', missing.join(', '));
  for (const h of handles) {
    const p = catalog.get(h); if (!p) continue;
    const r = ratings[h];
    console.log(`  · ${p.vendor} ｜ ${p.title.slice(0, 46)} ｜ HK$${prices.get(h)}${r ? ` ｜ ★${r.star}(${r.count})` : ''}${typeof p.totalInventory === 'number' && p.totalInventory <= 0 ? ' ｜ ✗ 冇貨' : ''}`);
  }
  const bad = [...all.matchAll(BAD)].map((m) => m[0]);
  if (bad.length) console.log('✗ 禁用字：', [...new Set(bad)].join('、'));
  for (const [where, v] of texts) {
    const t = strip(v);
    if (/最/.test(t)) console.log(`  「最」 ${where}: ${t.slice(0, 120)}`);
  }
  const money = [...all.matchAll(/HK\$\s?([\d.]+)/g)].map((m) => Number(m[1]));
  const known = new Set([...prices.values()]);
  const odd = [...new Set(money.filter((v) => !known.has(v)))];
  if (odd.length) console.log('？ 文中金額唔係任何產品價（可能係計算／門檻，要人睇）：', odd.join(', '));
  const links = [...JSON.stringify(spec).matchAll(/href=\\"([^"\\]+)\\"/g)].map((m) => m[1]);
  console.log('連結：', [...new Set(links)].join('  '));
}
