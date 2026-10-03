/* WP0 行為測試（真瀏覽器）。一次只開一個 headless browser。
   CHROME=<chrome-headless-shell> BASE=http://127.0.0.1:8801 node scripts/regress/browser-wp0.mjs
   會攔截 Storefront API：cartLinesAdd 一律 abort，唔會真係寫入任何購物車。 */
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(process.env.PW_NODE_MODULES || '/Volumes/core/.npm/_npx/9833c18b2d85bc59/node_modules/');
const { chromium } = require('playwright-core');

const BASE = process.env.BASE || 'http://127.0.0.1:8801';
const SHADE_HANDLE = process.env.SHADE_HANDLE || 'romand-juicy-lasting-tint';
const LENS_HANDLE = process.env.LENS_HANDLE || 'lens-feliamo-1day-sheer-brown';
const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass === null ? 'SKIP' : pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const settle = async (page, ms = 2500) => {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(ms);
};

async function withPage(viewport, fn, init) {
  const ctx = await browser.newContext({ viewport, locale: 'zh-HK' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  try {
    if (init) await init(page, ctx);
    await fn(page, errors);
  } finally {
    await ctx.close();
  }
}

/* Storefront 攔截：揀一個 variant 扮「賣完照賣、數量 0」，同時記低／擋住 cartLinesAdd。 */
async function mockStock(page, { handle, pick }) {
  const state = { mockedId: null, goodId: null, cartLinesAdd: 0 };
  await page.route(/myshopify\.com\/api\/.*graphql\.json/, async (route) => {
    const body = route.request().postData() || '';
    if (body.includes('cartLinesAdd')) {
      state.cartLinesAdd++;
      return route.abort();
    }
    const wantsProduct = body.includes('GetProduct') && body.includes(handle);
    const wantsVerify = body.includes('OujiVerifyVariants');
    if (!wantsProduct && !wantsVerify) return route.continue();
    const res = await route.fetch();
    const json = await res.json();
    if (wantsProduct && json?.data?.product) {
      const vs = json.data.product.variants.edges.map((e) => e.node);
      const target = pick(vs);
      if (target) {
        target.availableForSale = true;
        target.quantityAvailable = 0;
        state.mockedId = target.id;
        state.goodId = vs.find((v) => v !== target && v.availableForSale && (v.quantityAvailable == null || v.quantityAvailable > 0))?.id || null;
      }
    }
    if (wantsVerify && Array.isArray(json?.data?.nodes)) {
      json.data.nodes.forEach((n) => { if (n && n.id === state.mockedId) { n.availableForSale = true; n.quantityAvailable = 0; } });
    }
    return route.fulfill({ response: res, json });
  });
  return state;
}

const desktop = { width: 1440, height: 900 };
const mobile = { width: 375, height: 812 };

try {
  /* 1. /shop?brand= 喺 refreshed 事件之後仍然只係嗰個牌子 */
  await withPage(desktop, async (page, errors) => {
    await page.goto(`${BASE}/shop?brand=Round%20Lab`, { waitUntil: 'domcontentloaded' });
    await settle(page, 4000);
    const out = await page.evaluate(async () => {
      const r = await fetch('data/catalog.json');
      const edges = (await r.json()).v;
      const vendorOf = new Map(edges.map((e) => [e.node.handle, e.node.vendor]));
      const cards = () => [...document.querySelectorAll('[data-catalog] a.product-card')]
        .map((a) => decodeURIComponent((a.getAttribute('href') || '').split('/products/')[1] || ''));
      const before = cards();
      document.dispatchEvent(new CustomEvent('ouji:catalog-refreshed', { detail: { edges } }));
      await new Promise((ok) => setTimeout(ok, 2500));
      const after = cards();
      const chip = document.querySelector('.filter-sidebar input[data-group="vendor"]:checked')?.value || null;
      const activeChip = [...document.querySelectorAll('[data-active-filters] .filter-chip')].map((b) => b.textContent.trim());
      return {
        before: before.length, after: after.length,
        stray: after.filter((h) => vendorOf.get(h) && vendorOf.get(h) !== 'Round Lab').slice(0, 5),
        unknown: after.filter((h) => !vendorOf.get(h)).length,
        chip, activeChip,
      };
    });
    record('brand scope: /shop?brand=Round%20Lab renders only Round Lab after ouji:catalog-refreshed',
      out.after > 0 && out.stray.length === 0, JSON.stringify(out));
    record('brand scope: vendor group built with Round Lab as an active chip',
      out.chip === 'Round Lab' && out.activeChip.some((t) => t.includes('Round Lab')), JSON.stringify({ chip: out.chip, activeChip: out.activeChip }));
    if (errors.length) record('brand page: no page errors', false, errors.join(' | '));
  });

  for (const [q, label] of [['concern=acne', 'concern'], ['cat=toner', 'cat']]) {
    await withPage(desktop, async (page) => {
      await page.goto(`${BASE}/shop?${q}`, { waitUntil: 'domcontentloaded' });
      await settle(page, 4000);
      const out = await page.evaluate(async ({ q, label }) => {
        const params = new URLSearchParams(q);
        const r = await fetch('data/catalog.json');
        const edges = (await r.json()).v;
        const byHandle = new Map(edges.map((e) => [e.node.handle, e.node]));
        const cat = params.get('cat');
        const concern = concernById(params.get('concern'));
        const ok = (p) => (label === 'concern'
          ? matchesConcern(p, concern)
          : ['skincare', 'makeup', 'body-care', 'fragrance', 'lifestyle'].some((sec) => matchesKeywords(p, categoryKeywords(sec, cat))));
        const cards = () => [...document.querySelectorAll('[data-catalog] a.product-card')]
          .map((a) => decodeURIComponent((a.getAttribute('href') || '').split('/products/')[1] || ''));
        const before = cards().length;
        document.dispatchEvent(new CustomEvent('ouji:catalog-refreshed', { detail: { edges } }));
        await new Promise((res) => setTimeout(res, 2500));
        const after = cards();
        const stray = after.filter((h) => byHandle.get(h) && !ok(byHandle.get(h)));
        return { before, after: after.length, stray: stray.slice(0, 5), total: edges.length };
      }, { q, label });
      record(`${label} scope: /shop?${q} stays scoped after ouji:catalog-refreshed`,
        out.after > 0 && out.after < out.total && out.stray.length === 0, JSON.stringify(out));
    });
  }

  /* 2. PDP：qty 0 色號 chip disabled；Google 預選缺貨色號時 CTA 唔可以撳；addToCart 守門 */
  await withPage(desktop, async (page, errors) => {
    const st = await mockStock(page, { handle: SHADE_HANDLE, pick: (vs) => vs[1] || null });
    await page.goto(`${BASE}/product.html?handle=${SHADE_HANDLE}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const chip = await page.evaluate((id) => {
      const b = document.querySelector(`.variant-btn[data-variant-id="${id}"]`);
      return b ? { disabled: b.disabled } : null;
    }, st.mockedId);
    record('path 1: PDP shade chip of a quantity-0 variant is disabled', !!chip && chip.disabled === true, JSON.stringify({ mocked: st.mockedId, chip }));

    const guard = await page.evaluate(async (id) => (await addToCart(id, 1)) === null, st.mockedId);
    record('guard: addToCart refuses a quantity-0 variant and sends no cartLinesAdd', guard && st.cartLinesAdd === 0, `cartLinesAdd=${st.cartLinesAdd}`);
    if (st.goodId) {
      await page.evaluate(async (id) => { try { await addToCart(id, 1); } catch (e) {} }, st.goodId);
      record('guard control: an in-stock variant reaches cartLinesAdd (request aborted by the test)', st.cartLinesAdd > 0, `cartLinesAdd=${st.cartLinesAdd}`);
    }
    const dot = await page.evaluate(() => {
      const el = document.querySelector('.product-info__stock');
      if (!el) return { present: false };
      return { present: true, hidden: el.hidden, display: getComputedStyle(el).display, text: el.textContent.trim() };
    });
    record('no red dot under the PDP price when there is no low-stock text',
      !dot.present || (dot.hidden ? dot.display === 'none' : dot.text.length > 0), JSON.stringify(dot));
    if (errors.length) record('PDP: no page errors', false, errors.join(' | '));
  });

  await withPage(desktop, async (page) => {
    const st = await mockStock(page, { handle: SHADE_HANDLE, pick: (vs) => vs[1] || null });
    await page.goto(`${BASE}/product.html?handle=${SHADE_HANDLE}`, { waitUntil: 'domcontentloaded' });
    await settle(page, 1500);
    const num = String(st.mockedId || '').split('/').pop();
    await page.goto(`${BASE}/product.html?handle=${SHADE_HANDLE}&variant=${num}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const cta = await page.evaluate(() => {
      const b = document.getElementById('add-to-cart-btn');
      return { disabled: b.disabled, text: b.textContent.trim() };
    });
    record('path 1: Google ?variant= preselect of a quantity-0 shade leaves the CTA disabled', cta.disabled === true, JSON.stringify(cta));
    await page.evaluate(() => document.getElementById('add-to-cart-btn').click());
    await page.waitForTimeout(800);
    record('path 1: clicking the CTA anyway sends no cartLinesAdd', st.cartLinesAdd === 0, `cartLinesAdd=${st.cartLinesAdd}`);
  });

  /* 3. 隱形眼鏡：數量 0 嘅度數要有可見「預訂」標籤 */
  await withPage(desktop, async (page) => {
    await page.goto(`${BASE}/product.html?handle=${LENS_HANDLE}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const out = await page.evaluate(async (handle) => {
      const p = await getProduct(handle);
      const vs = (p?.variants?.edges || []).map((e) => e.node);
      const rows = [...document.querySelectorAll('.power-btn')].map((b) => {
        const v = vs.find((x) => x.id === b.dataset.variantId);
        const tag = b.querySelector('.power-btn__tag');
        return {
          qty: v?.quantityAvailable, afs: v?.availableForSale, disabled: b.disabled,
          tagVisible: !!tag && getComputedStyle(tag).display !== 'none'
            && tag.textContent.trim() === window.OUJI_purchasable.PREORDER_LABEL,
        };
      });
      const zeroEnabledNoTag = rows.filter((r) => !r.disabled && !((r.qty ?? 0) > 0) && !r.tagVisible).length;
      const unavailableEnabled = rows.filter((r) => r.afs === false && !r.disabled).length;
      const pre = [...document.querySelectorAll('.power-btn[data-preorder="1"]:not([disabled])')][0];
      let ctaLabel = null;
      if (pre) {
        pre.click();
        const tag = document.querySelector('[data-preorder-tag]');
        ctaLabel = tag && !tag.hidden && getComputedStyle(tag).display !== 'none' ? tag.textContent.trim() : '';
      }
      return { powers: rows.length, zero: rows.filter((r) => !((r.qty ?? 0) > 0)).length, zeroEnabledNoTag, unavailableEnabled, ctaLabel };
    }, LENS_HANDLE);
    if (!out.powers || !out.zero) {
      record('lens: quantity-0 powers carry a visible pre-order label', null, `no quantity-0 power live ${JSON.stringify(out)}`);
    } else {
      record('lens: no power orderable at quantity 0 without a visible pre-order label (chip)', out.zeroEnabledNoTag === 0 && out.unavailableEnabled === 0, JSON.stringify(out));
      record('lens: selected pre-order power shows "預訂 · 約 14 日" next to the CTA', !!out.ctaLabel && out.ctaLabel.includes('預訂 · 約 14 日'), JSON.stringify(out.ctaLabel));
    }
  });

  /* 4. sticky：PDP gallery 同 cart summary 會黐住；列出全部 computed sticky */
  const allowedSticky = ['product-gallery', 'cart-summary', 'filter-sidebar__header', 'rf__acts'];
  const stickyPages = [['home', '/'], ['shop', '/shop'], ['skincare', '/category'], ['makeup', '/makeup'],
    ['product', `/product.html?handle=tirtir-mask-fit-red-cushion`], ['brand', '/shop?brand=Round%20Lab'],
    ['cart', '/cart?demo=240'], ['about', '/about'], ['short-dated', '/short-dated'], ['awards', '/awards']];
  for (const vp of [desktop, mobile]) {
    for (const [name, path] of stickyPages) {
      await withPage(vp, async (page) => {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        await settle(page, 2000);
        const out = await page.evaluate(async (name) => {
          const sticky = [...document.querySelectorAll('body *')]
            .filter((el) => getComputedStyle(el).position === 'sticky')
            .map((el) => (typeof el.className === 'string' ? el.className : '').split(/\s+/)[0] || el.tagName);
          const target = name === 'product' ? '.product-gallery' : name === 'cart' ? '.cart-summary' : null;
          let moved = null;
          if (target && window.innerWidth > 1000) {
            const el = document.querySelector(target);
            if (el) {
              window.scrollTo(0, 0);
              await new Promise((r) => setTimeout(r, 300));
              const a = el.getBoundingClientRect().top;
              window.scrollTo(0, 500);
              await new Promise((r) => setTimeout(r, 400));
              const b = el.getBoundingClientRect().top;
              moved = { from: Math.round(a), to: Math.round(b), stuck: a - b < 480 };
            }
          }
          return { sticky: [...new Set(sticky)], moved };
        }, name);
        const unexpected = out.sticky.filter((c) => !allowedSticky.some((a) => c.includes(a)));
        record(`sticky inventory ${name} ${vp.width}: no unintended sticky`, unexpected.length === 0, JSON.stringify(out.sticky));
        if (out.moved) record(`sticky ${name} ${vp.width}: ${name === 'product' ? 'gallery' : 'summary'} sticks`, out.moved.stuck, JSON.stringify(out.moved));
      });
    }
  }

  /* 5. Clarity：撳一下 checkout = 一個 cart_checkout_click */
  await withPage(desktop, async (page) => {
    const hits = [];
    await page.exposeFunction('__clarityHit', (name) => hits.push(name));
    await page.addInitScript(() => {
      window.clarity = function () { if (arguments[0] === 'event') window.__clarityHit(arguments[1]); };
    });
    await page.route(/myshopify\.com\/api\/.*graphql\.json/, (route) =>
      ((route.request().postData() || '').includes('cartLinesAdd') ? route.abort() : route.continue()));
    await page.route(/shop\.oujikbeauty\.com|\/checkouts?\//, (route) => route.abort());
    await page.goto(`${BASE}/cart?demo=240`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const btn = page.locator('.cart-summary__checkout .btn').first();
    if (!(await btn.count())) {
      record('Clarity cart_checkout_click fires once per click', null, 'checkout button not found');
      return;
    }
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const n = hits.filter((h) => h === 'cart_checkout_click').length;
    record('Clarity cart_checkout_click fires once per click', n === 1, `events=${JSON.stringify(hits)}`);
  });
} finally {
  await browser.close();
}

const failed = results.filter((r) => r.pass === false);
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(results, null, 1));
console.log(`\n${results.length - failed.length}/${results.length} passed or skipped; ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
