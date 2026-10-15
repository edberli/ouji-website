#!/usr/bin/env node
/**
 * 明星妝感文章用：按 /match 嘅拆妝目標（類型、妝效、色系），喺而家有貨嘅
 * 彩妝入面揀候選產品，連色號同目錄原文（寫文要引用嘅事實）一齊印出。
 *
 *   node scripts/articles/look_candidates.js <look-id> [每步幾件=4]
 *
 * 揀貨規則同 /match 一致：類型要中、妝效要中（未知唔當否定）、色系有中嘅色號
 * 先列；同分就睇 Olive Young 評價數，再睇毛利率。只係候選，落筆前要人睇。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
global.window = {};
require(path.join(ROOT, 'data/match-look-recipes-data.js'));
require(path.join(ROOT, 'data/match-products-data.js'));
const looks = window.OUJI_LOOK_DATABASE.references;
const db = window.OUJI_PRODUCT_DATABASE.products;
const live = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/catalog.json'), 'utf8')).v
  .map((e) => e.node || e).map((p) => [p.handle, p]));
const ratings = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ratings.json'), 'utf8')).products || {};

const id = process.argv[2];
const per = Number(process.argv[3] || 4);
const look = looks.find((l) => l.id === id);
if (!look) { console.error('搵唔到 look：', id, '\n可用：', looks.map((l) => l.id).join(', ')); process.exit(1); }

const out = { id: look.id, person: look.person, title: look.title, analysis: look.analysis, source: look.source, image: look.image, steps: {} };
for (const [step, t] of Object.entries(look.targets || {})) {
  const scored = db.filter((p) => (t.types || []).includes(p.type)).map((p) => {
    const cur = live.get(p.handle);
    if (!cur || (typeof cur.totalInventory === 'number' && cur.totalInventory <= 0)) return null;
    const fin = p.effectProfile && p.effectProfile.finish;
    const finishHit = !t.finishes || !fin || t.finishes.includes(fin);
    if (!finishHit) return null;
    const shades = (p.variants || []).filter((v) => !t.colours || (v.shadeSignals && t.colours.includes(v.shadeSignals.family)));
    if (t.colours && p.variants && p.variants.length > 1 && !shades.length) return null;
    const r = ratings[p.handle];
    const margin = Math.max(0, ...(p.variants || []).map((v) => v.marginRate || 0));
    return {
      handle: p.handle, vendor: p.vendor, type: p.type, finish: fin || '未知',
      price: Number(cur.priceRange.minVariantPrice.amount),
      star: r ? r.star : null, count: r ? r.count : 0, margin,
      shades: shades.slice(0, 4).map((v) => `${v.title}${v.shadeSignals ? `（${v.shadeSignals.family}）` : ''}`),
      evidence: ((p.evidence && p.evidence.catalogueExcerpt) || []).slice(0, 3),
      score: (finishHit && fin ? 2 : 1) + (shades.length ? 1 : 0) + Math.log10((r ? r.count : 0) + 1) + margin / 100,
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, per);
  out.steps[step] = { target: t, candidates: scored };
}
console.log(JSON.stringify(out, null, 1));
