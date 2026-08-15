/**
 * Category page rendering: filters built from the live catalogue, and a
 * brand-by-brand layout instead of one undifferentiated grid.
 *
 * The old sidebar was skincare boilerplate hard-coded into every page —
 * the makeup page offered "潔面 / 化妝水" and a brand list of skincare
 * labels we no longer carry, and none of the checkboxes did anything.
 * Everything here is derived from the products actually on the page.
 */

/* Section-header artwork per brand, one entry for every vendor we carry —
   an unmapped brand fell back to a plain gradient band, which next to a
   photographed one read as unfinished.

   Nine are the brand's own homepage key visual, already shot to be read
   as a wide band — mirrored onto our CDN because the Korean storefronts
   check the Referer and would serve a placeholder to our pages. The rest
   have no usable KV (their homepage banner is a bare wordmark), so they
   fall back to a campaign frame from the brand's product media: a
   packshot cropped to a 220px band is a close-up of nothing, a model
   shot still reads at that height. */
const CDN = 'https://cdn.shopify.com/s/files/1/0765/3405/5070/files/';
const BRAND_ART = {
  // The brands' own wide key visuals, mirrored onto our CDN because the
  // Korean storefronts check the Referer.
  'Coralhaze': CDN + 'coralhaze-banner.jpg',
  'lilybyred': CDN + 'lilybyred-banner.jpg',
  'UNLEASHIA': CDN + 'unleashia-banner_fd13a93b-38f1-4c06-bebc-7fe29b470740.jpg',
  'rom&nd': CDN + 'romand-banner.jpg',
  'hince': CDN + 'hince-banner.jpg',
  'fwee': CDN + 'fwee-banner.jpg',
  'MAYBELLINE': CDN + 'maybelline-banner_f5c7307d-576d-4796-b634-3e250ef3e300.jpg',
  '花知曉 Flower Knows': CDN + 'flowerknows-banner_6c6a0c46-1361-4db5-befd-e7526560c84e.jpg',
  'BRAYE': CDN + 'braye-banner.jpg',
  'dasique': CDN + 'dasique-banner_46065717-bfee-49a9-ab6a-6e31808e785f.jpg',
  // No wide art exists for these nine — their sites publish square frames
  // only. Rather than let a 2.4:1 slot cut into the subject, the frame is
  // centred on a blurred extension of itself at 1800x750.
  'Heart Percent': CDN + 'heartpercent-banner.jpg',
  '2aN': CDN + '2an-banner.jpg',
  'CLIO': CDN + 'clio-banner.jpg',
  'WAKEMAKE': CDN + 'wakemake-banner.jpg',
  'Peripera': CDN + 'peripera-banner.jpg',
  'Glint': CDN + 'glint-banner.jpg',
  'Laka': CDN + 'laka-banner.jpg',
  'AMUSE': CDN + 'amuse-banner.jpg',
  'TIRTIR': CDN + 'tirtir-banner.jpg',
};

/* Each brand's own colour, for the plate its logo sits on. Sampling the
   campaign photo was tried first and gave nineteen shades of mud — these
   are taken from the brands' own identities instead. `dark` says whether
   the logo needs knocking out white. */
const BRAND_PLATE = {
  'rom&nd': { tint: '#efe7dc' },
  'CLIO': { tint: '#14110f', dark: true },
  'hince': { tint: '#e6dbd0' },
  'TIRTIR': { tint: '#b8172a', dark: true },
  'dasique': { tint: '#f0e3d8' },
  'lilybyred': { tint: '#f3dcdd' },
  'AMUSE': { tint: '#f7dfe0' },
  'WAKEMAKE': { tint: '#eae7e2' },
  'Peripera': { tint: '#f8dbe4' },
  'UNLEASHIA': { tint: '#e8e5dc' },
  'Laka': { tint: '#5b2434', dark: true },
  'fwee': { tint: '#f6d7e2' },
  'MAYBELLINE': { tint: '#14110f', dark: true },
  '2aN': { tint: '#eee6dd' },
  'Heart Percent': { tint: '#f2e6e2' },
  'Coralhaze': { tint: '#f7ddd4' },
  'BRAYE': { tint: '#ebe9e6' },
  'Glint': { tint: '#e9e4dd' },
  '花知曉 Flower Knows': { tint: '#f6e2e6' },
};

function brandPlate(vendor) {
  return BRAND_PLATE[vendor] || { tint: '#eeeae3' };
}

/* The brands' own logos, which we already hold as SVG. They ride on top
   of the banner rather than being cropped out of it. */
const BRAND_LOGO = {
  'lilybyred': 'logos/lilybyred.svg', 'AMUSE': 'logos/amuse.svg',
  'hince': 'logos/hince.svg', 'WAKEMAKE': 'logos/wakemake.svg',
  'CLIO': 'logos/clio.svg', 'dasique': 'logos/dasique.png',
  'TIRTIR': 'logos/tirtir.svg', 'MAYBELLINE': 'logos/maybelline.svg',
  'UNLEASHIA': 'logos/unleashia.svg', 'rom&nd': 'logos/romand.svg',
  'Laka': 'logos/laka.svg', '花知曉 Flower Knows': 'logos/flower-knows.svg',
  'fwee': 'logos/fwee.svg', 'Heart Percent': 'logos/heart-percent.svg',
  'Peripera': 'logos/peripera.png', '2aN': 'logos/2an.svg',
  'BRAYE': 'logos/braye.svg', 'Coralhaze': 'logos/coralhaze.svg',
  'Glint': 'logos/glint.svg',
  /* 護膚牌子。以前呢個表淨係得彩妝，所以護膚分類頁一個 logo 都出唔到。 */
  'Abib': 'logos/abib.svg', 'Anua': 'logos/anua.png',
  'Arencia': 'logos/arencia.png',
  'Beauty of Joseon': 'logos/beauty-of-joseon.svg',
  'Beplain': 'logos/beplain.png', 'Bring Green': 'logos/bring-green.svg',
  'COSRX': 'logos/cosrx.png', 'Goodal': 'logos/goodal.svg',
  'Mixsoon': 'logos/mixsoon.svg', 'Needly': 'logos/needly.svg',
  'OOTD': 'logos/ootd.svg', 'Purito': 'logos/purito.svg',
  'Round Lab': 'logos/round-lab.svg', 'Skin1004': 'logos/skin1004.png',
  'Skinfood': 'logos/skinfood.svg', 'Some By Mi': 'logos/some-by-mi.svg',
  'Torriden': 'logos/torriden.svg',
  /* 由品牌官網攞返嚟（2026-08-14）：aprilskin.com、ksecret.co.kr。
     另外四個 .com 官網要唔係得文字 logo、要唔係憑證過期，兜咗一圈先搵到：
       Arencia        — arencia.com Cafe24 頂部 banner（webpb 應用嘅 JSON 入面）
       Haruharu Wonder— haruharuindia.com 官方印度站 black-logo.png
       ILSO           — ilso.kr Cafe24 頁尾 logo.svg（theilso.org 憑證過期入唔到）
       Dr. Melaxin    — drmelaxin.us Shopify main_logo_black2.png
     四個都係透明底。brand-grid__logo 落咗 brightness(0) invert(1)，
     白底圖會變成一嚿白方格，所以之後換檔一定要保住 alpha。 */
  'April Skin': 'logos/april-skin.svg',
  'KSECRET': 'logos/ksecret.png',
  'Haruharu Wonder': 'logos/haruharu-wonder.png',
  'ILSO': 'logos/ilso.svg',
  'Dr. Melaxin': 'logos/dr-melaxin.png',
  /* 隱形眼鏡（2026-08-14）。五個都係日本 T-Garden 系嘅牌子，官網
     頭嗰個 logo.svg 就係正稿：lilmoon.jp、molak.jp、ns-collection.jp、
     topards.jp、feliamo.jp。之前成個隱形眼鏡分類一個 logo 都冇。 */
  'Lilmoon': 'logos/lilmoon.svg', 'Molak': 'logos/molak.svg',
  "N's Collection": 'logos/ns-collection.svg',
  'TOPARDS': 'logos/topards.svg', 'Feliamo': 'logos/feliamo.svg',
  /* 頭髮護理：solepkorea.com 頁頭嗰個 114×43 細版（唔用「SINCE Solep
     2005」嗰條 6.5:1 長帶 —— 太扁，喺手機卡度睇唔到）。 */
  'SOLEP': 'logos/solep.png',

  /* 2026-08-14 要上架嗰 11 個牌子。逐個喺品牌官網揾正稿：
       VT Cosmetics    — vt-cosmetics.com /images/cm_logo_1_black.png
       LINDSAY         — lindsay.co.kr 頁頭 logo_black
       TOCOBO          — tocobo.cafe24.com /wib/img/icon/logo.svg
       ma:nyo          — manyo.co.kr /img/common/h_logo.png
       SUNGBOON EDITOR — Shopify 頁頭 header__logo-image
       HEVEBLUE        — heveblue.co.kr 頁頭（HB 橢圓印章，直度嘅）
       BOH             — bioheal-boh.com 冇獨立 logo 檔，喺佢個 OG.png
                         度剪出嚟再去白底
       Dr.Jart+        — drjart.co.kr 頁頭 SVG sprite <symbol id="logo">
     揀圖規矩（今次踩過嘅雷）：**要粗體、長寬比唔好過 8:1、透明底**。
     幼體又扁嘅版本喺手機品牌卡（110px 闊）淨係 9px 高，等於冇。 */
  'VT Cosmetics': 'logos/vt-cosmetics.png',
  'LINDSAY': 'logos/lindsay.png',
  'TOCOBO': 'logos/tocobo.svg',
  'ma:nyo': 'logos/manyo.png',
  'SUNGBOON EDITOR': 'logos/sungboon-editor.png',
  'HEVEBLUE': 'logos/heveblue.png',
  'BOH': 'logos/boh.png',
  'Dr.Jart+': 'logos/dr-jart.svg',
  /* SO Natural：佢自己個韓國站 sonatural.co.kr 喺呢部機連唔通，
     Wayback 又封住，最尾喺 ohmyglow 個品牌頁攞到張 300×300 方形
     logo，剪走白底再去白。呢個係疊字版（1.4:1），入 2:1 卡好靚。 */
  'SO Natural': 'logos/so-natural.png',
};


/* Displayed logo height per brand, so every mark reads the same size.
   Sizing on a shared max-height does not work: these marks carry wildly
   different amounts of ink inside their box — hince's hairline wordmark
   covers 13% of its bounding box, WAKEMAKE's covers 46% — so at equal
   height one looks twice the weight of the other. Each SVG was rasterised
   and its ink pixels counted, then the height set so the ink area comes
   out equal. Measured, not eyeballed. */
const BRAND_LOGO_H = {
  'hince': 115, 'fwee': 116, 'Coralhaze': 71, 'Glint': 68, 'WAKEMAKE': 47,
  'UNLEASHIA': 52, 'lilybyred': 78, 'rom&nd': 69, 'MAYBELLINE': 53,
  'AMUSE': 48, 'CLIO': 57, 'TIRTIR': 59, 'BRAYE': 56, 'Heart Percent': 75,
  'Peripera': 36, 'Laka': 60, '2aN': 69, 'dasique': 36,
  '花知曉 Flower Knows': 74,
};

function brandLogoHeight(vendor) {
  return BRAND_LOGO_H[vendor] || 58;
}

function brandArt(vendor) {
  return BRAND_ART[vendor] || null;
}

function brandLogo(vendor) {
  return BRAND_LOGO[vendor] || null;
}

const PRICE_BUCKETS = [
  { id: 'u100', label: 'HK$100 以下', test: (v) => v < 100 },
  { id: '100-200', label: 'HK$100 – HK$200', test: (v) => v >= 100 && v < 200 },
  { id: '200-400', label: 'HK$200 – HK$400', test: (v) => v >= 200 && v < 400 },
  { id: 'o400', label: 'HK$400 以上', test: (v) => v >= 400 },
];

/* How much a product has won, as one number: a first place is worth more
   than a third, and a recent win more than an old one. */
function awardWeight(p) {
  if (typeof awardsFor !== 'function') return 0;
  return awardsFor(p.handle).reduce((n, a) => {
    const place = a.rank === 1 ? 6 : a.rank === 0 ? 3 : 7 - a.rank * 2;
    return n + place + Math.max(0, a.year - 2022);
  }, 0);
}

/* Unit profit, as a 0–100 rank rather than an amount. featured.json is a
   public file, so it carries the ordering and not the money — cost prices
   are not something to publish. Loaded once, best-effort: the sort still
   works on awards alone if it is unavailable. */
let PROFIT_RANK = {};
fetch('featured.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => { if (d?.profitRank) PROFIT_RANK = d.profitRank; })
  .catch(() => {});

/* "推薦" is the default, so it has to mean something. Margin leads —
   that is the shop's own interest and the merchant asked for it — with
   awards as the customer-facing counterweight so the top of the grid is
   not simply the dearest thing we stock. Bestsellers join this term for
   term once there are orders to count. */
function featuredScore(p) {
  return (PROFIT_RANK[p.handle] || 0) * 10 + awardWeight(p) * 6;
}

const SORTS = {
  featured: (a, b) => featuredScore(b) - featuredScore(a),
  'price-asc': (a, b) => price(a) - price(b),
  'price-desc': (a, b) => price(b) - price(a),
  award: (a, b) => awardWeight(b) - awardWeight(a) || price(b) - price(a),
  'name-asc': (a, b) => (a.title || '').localeCompare(b.title || '', 'zh-Hant'),
};

function price(p) {
  return parseFloat(p.priceRange?.minVariantPrice?.amount || 0);
}

/* 「有冇貨」唔可以淨係信 availableForSale。
   店入面好多貨嘅存貨政策係 CONTINUE（賣完照賣），所以數量係 0
   Shopify 一樣會報 availableForSale: true。實測 808 件貨入面有
   89 件係「冇貨但買得到」—— 客落咗單、畀咗錢，我哋先發現要等入貨。
   所以數量報到係 0 就當冇貨。
   quantityAvailable 係 null 代表嗰件貨根本冇追蹤存貨，唔關佢事。 */
function variantInStock(v) {
  if (!v || !v.availableForSale) return false;
  return v.quantityAvailable == null || v.quantityAvailable > 0;
}

function soldOut(p) {
  /* totalInventory 係成件貨所有規格加埋嘅數。要行先 —— 列表 query
     淨係攞頭兩個規格，隱形眼鏡一件貨有 25 個度數，頭兩個斷咗就會
     成件誤標「售完」，其實仲有十幾個度數有貨。 */
  if (typeof p.totalInventory === 'number') return p.totalInventory <= 0;
  const vs = p.variants?.edges || [];
  return vs.length > 0 && !vs.some((e) => variantInStock(e.node));
}

/* The order you actually use the things in. A brand section used to list
   a serum next to a sunscreen next to a toner in whatever order the
   scorer produced, which reads as a pile rather than a routine. */
const ROUTINE = ['潔面', '卸妝', '爽膚水', '棉片', '精華', '安瓶', '局部護理',
                 '乳液', '面霜', '眼霜', '面膜', '防曬', '唇部護理',
                 '身體護理', '頭髮護理', '套裝',
                 // makeup follows the order you put it on in
                 '妝前乳', '底妝', '氣墊粉底', '粉底', '遮瑕', '蜜粉',
                 '眼影', '眼線', '眼線筆', '睫毛膏', '眉筆',
                 '胭脂', '修容', '高光', '多用彩妝',
                 '唇膏', '唇釉', '唇彩', '唇蜜', '唇線筆', '潤唇膏'];

function routineStep(p) {
  const i = ROUTINE.indexOf(p.productType || '');
  return i === -1 ? ROUTINE.length : i;   // unknown types sit at the end
}

/* The 分類 filter offers this section's subcategories, or — on the
   all-products page, where there is no one section — the top level. */
function catOptions(section) {
  if (!section) {
    return Object.entries(CATEGORY_TAXONOMY)
      .map(([id, sec]) => [id, { label: sec.label, keywords: categoryKeywords(id, null) }]);
  }
  return Object.entries(CATEGORY_TAXONOMY[section]?.subs || {});
}

function catKeywords(section, id) {
  return section
    ? CATEGORY_TAXONOMY[section]?.subs?.[id]?.keywords || []
    : categoryKeywords(id, null);
}

/* Which categories actually have stock behind them — an empty filter
   option is worse than no filter option. */
function availableSubs(section, products) {
  const index = new Map(products.map((p, i) => [p, i]));
  const all = catOptions(section)
    .map(([id, sub]) => ({
      id,
      label: sub.label,
      set: new Set(products.filter((p) => matchesKeywords(p, sub.keywords)).map((p) => index.get(p))),
    }))
    .filter((s) => s.set.size);

  // The taxonomy nests 唇膏/唇釉 under 唇妝, and every level matches. Keep
  // the widest option and drop any whose products another already covers,
  // so the sidebar reads as one flat, non-overlapping list.
  //
  // Only within one axis, though. K-pop is filtered by group *and* by
  // format, and those are independent: every IVE album is also 專輯, so
  // collapsing across axes swallowed all nine groups into one 專輯 tab
  // and left the page with nothing to filter by.
  const axis = (s) => catOptions(section).find(([id]) => id === s.id)?.[1]?.axis || 'main';
  const kept = all.filter((s) => !all.some((o) =>
    o !== s && axis(o) === axis(s)
    && o.set.size > s.set.size && [...s.set].every((i) => o.set.has(i))));
  const seen = new Set();
  return kept.filter((s) => !seen.has(s.label) && seen.add(s.label))
    .map((s) => ({ id: s.id, label: s.label, count: s.set.size }));
}

function vendorsOf(products) {
  const counts = new Map();
  products.forEach((p) => {
    const v = p.vendor || '其他';
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([vendor, count]) => ({ vendor, count }));
}

function optionRow(group, value, label, count) {
  return `<label class="filter-option">
    <input type="checkbox" data-group="${group}" value="${value}">
    <span>${label}</span>${count != null ? `<span class="filter-option__count">${count}</span>` : ''}
  </label>`;
}

/**
 * A brand named in the URL, matched against what the page actually holds.
 *
 * Every brand link on the site — 48 tiles on the homepage, the whole of
 * brands.html — pointed at a bare category.html. Tapping TIRTIR gave you
 * all 529 skincare products and no sign the shop had heard of TIRTIR.
 * The vendor filter existed the whole time; nothing ever set it from a
 * link.
 *
 * Matched loosely because a link is typed by a human and a vendor is
 * typed by whoever loaded the sheet: "rom&nd" arrives url-encoded,
 * "N's Collection" has an apostrophe, "(G)I-DLE" has brackets.
 */
function brandFromUrl(products) {
  const want = new URLSearchParams(location.search).get('brand');
  if (!want) return null;
  const flat = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = flat(want);
  const hit = products.find((p) => flat(p.vendor) === target)
    || products.find((p) => flat(p.vendor).startsWith(target) && target.length > 2);
  return hit ? hit.vendor : null;
}

function buildFilterSidebar(section, products) {
  const sidebar = document.querySelector('.filter-sidebar');
  if (!sidebar) return;
  const subs = availableSubs(section, products);
  const vendors = vendorsOf(products);
  const buckets = PRICE_BUCKETS
    .map((b) => ({ ...b, count: products.filter((p) => b.test(price(p))).length }))
    .filter((b) => b.count);

  const groups = [];
  if (subs.length > 1) {
    groups.push(`<div class="filter-group">
      <div class="filter-group__title">分類</div>
      <div class="filter-group__options">
        ${subs.map((s) => optionRow('cat', s.id, s.label, s.count)).join('')}
      </div></div>`);
  }
  if (vendors.length > 1) {
    groups.push(`<div class="filter-group">
      <div class="filter-group__title">品牌</div>
      <div class="filter-group__options">
        ${vendors.map((v) => optionRow('vendor', v.vendor, v.vendor, v.count)).join('')}
      </div></div>`);
  }
  if (buckets.length > 1) {
    groups.push(`<div class="filter-group">
      <div class="filter-group__title">價格</div>
      <div class="filter-group__options">
        ${buckets.map((b) => optionRow('price', b.id, b.label, b.count)).join('')}
      </div></div>`);
  }

  // Stock and awards go first: they cut the grid hardest and neither is
  // derivable from the other three groups.
  const inStock = products.filter((p) => !soldOut(p)).length;
  const awarded = products.filter((p) => typeof awardsFor === 'function'
    && awardsFor(p.handle).length).length;
  const flags = [];
  if (inStock && inStock < products.length) {
    flags.push(optionRow('flag', 'instock', '有貨', inStock));
  }
  if (awarded) flags.push(optionRow('flag', 'award', '得獎產品', awarded));
  if (flags.length) {
    groups.unshift(`<div class="filter-group">
      <div class="filter-group__title">精選</div>
      <div class="filter-group__options">${flags.join('')}</div></div>`);
  }

  sidebar.querySelectorAll('.filter-group, .filter-sidebar__actions').forEach((n) => n.remove());
  sidebar.insertAdjacentHTML('beforeend', groups.join('') + `
    <div class="filter-sidebar__actions">
      <button class="btn btn--ghost btn--full btn--sm" data-filter-clear>清除篩選</button>
    </div>`);
}

function activeFilters() {
  const sel = { cat: new Set(), vendor: new Set(), price: new Set(), flag: new Set() };
  document.querySelectorAll('.filter-sidebar input[type="checkbox"]:checked')
    .forEach((el) => sel[el.dataset.group]?.add(el.value));
  return sel;
}

/** Tick the sidebar box for a brand, so the URL and the UI agree. */
function preselectBrand(vendor) {
  if (!vendor) return;
  document.querySelectorAll('.filter-sidebar input[data-group="vendor"]')
    .forEach((el) => { if (el.value === vendor) el.checked = true; });
}

function applyFilters(section, products, sel) {
  return products.filter((p) => {
    if (sel.flag.has('instock') && soldOut(p)) return false;
    if (sel.flag.has('award') && !(typeof awardsFor === 'function'
        && awardsFor(p.handle).length)) return false;
    if (sel.vendor.size && !sel.vendor.has(p.vendor || '其他')) return false;
    if (sel.price.size) {
      const v = price(p);
      const hit = PRICE_BUCKETS.some((b) => sel.price.has(b.id) && b.test(v));
      if (!hit) return false;
    }
    if (sel.cat.size) {
      const hit = [...sel.cat].some((id) =>
        matchesKeywords(p, catKeywords(section, id)));
      if (!hit) return false;
    }
    return true;
  });
}

/* ----- The two bars above the grid -----
   Filtering used to live entirely behind one 篩選 button: you could not
   see what was applied without reopening the drawer, and the commonest
   move of all — jump to 唇妝 — took three taps. */

/** A row of subcategory pills, the one filter worth having always-on. */
function buildQuickTabs(section, products, sel) {
  const host = document.querySelector('[data-quick-tabs]');
  if (!host) return;
  const subs = availableSubs(section, products);
  if (subs.length < 2) { host.innerHTML = ''; return; }
  const active = sel.cat;
  host.innerHTML = `
    <button class="quick-tab${active.size ? '' : ' is-active'}" data-quick="">全部</button>`
    + subs.map((s) => `<button class="quick-tab${active.has(s.id) ? ' is-active' : ''}"
        data-quick="${s.id}">${s.label}<span class="quick-tab__count">${s.count}</span></button>`).join('');
}

/** 品牌 logo 一行，撳一下直接跳去嗰個牌子。
 *
 * 客好多時係認住個牌子先入嚟嘅 —— 「我要買 TIRTIR」。以前要行
 * 首頁品牌牆或者品牌頁先揀得到，即係喺搵緊貨嗰版反而冇入口。
 * 擺喺分類 pill 下面，同一個位置解決「揀類別」同「揀牌子」。
 *
 * 只出有 logo 檔嘅牌子 —— 得個名嘅一行 logo 入面會好突兀，
 * 佢哋照樣喺品牌頁搵得返。 */
function buildBrandStrip(products, sel) {
  const host = document.querySelector('[data-brand-strip]');
  if (!host) return;
  const count = new Map();
  products.forEach((p) => {
    const v = p.vendor;
    if (v && brandLogo(v)) count.set(v, (count.get(v) || 0) + 1);
  });
  const rows = [...count.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length < 3) { host.innerHTML = ''; return; }
  const active = (sel.brand instanceof Set) ? sel.brand : new Set();
  host.innerHTML = rows.map(([v, n]) => `
    <a class="brand-strip__item${active.has(v) ? ' is-active' : ''}"
       href="shop.html?brand=${encodeURIComponent(v)}" title="${v}｜${n} 件">
      <img src="${brandLogo(v)}" alt="${v}" loading="lazy">
    </a>`).join('');
}

/** What is applied right now, each removable on its own. */
function buildActiveChips(section, sel) {
  const host = document.querySelector('[data-active-filters]');
  if (!host) return;
  const label = (group, value) => {
    if (group === 'cat') return catOptions(section).find(([id]) => id === value)?.[1]?.label || value;
    if (group === 'price') return PRICE_BUCKETS.find((b) => b.id === value)?.label || value;
    if (group === 'flag') return value === 'instock' ? '有貨' : '得獎產品';
    return value;
  };
  const chips = ['flag', 'cat', 'vendor', 'price'].flatMap((g) =>
    [...sel[g]].map((v) => `<button class="filter-chip" data-unset-group="${g}" data-unset-value="${v}">
      ${label(g, v)}<span aria-hidden="true">×</span></button>`));
  host.innerHTML = chips.length
    ? chips.join('') + '<button class="filter-chip filter-chip--clear" data-filter-clear>清除全部</button>'
    : '';
}

/* 卡片右下角嗰粒掣。
   以前係一個 <div>「快速加入」，包喺成張卡嘅 <a> 入面 —— 冇 handler，
   撳落去只係跟住條連結入產品頁。即係擺明話「一撳即加」，實際上乜都
   冇加，客以為加咗，去到購物袋見到空嘅。 */
function quickAddControl(p, { isSoldOut, oneVariant, variantId }) {
  if (isSoldOut) {
    return `<button type="button" class="product-card__restock"
      data-restock="${p.handle}" data-restock-title="${(p.title || '').replace(/"/g, '&quot;')}"
      >想要？通知我補貨</button>`;
  }
  if (!oneVariant || !variantId) {
    // 唔扮做掣。成張卡本身就係去產品頁嘅連結，寫明要入去揀。
    return '<div class="product-card__quick-add product-card__quick-add--pick">入去揀規格</div>';
  }
  return `<button type="button" class="product-card__quick-add"
    data-quick-add="${variantId}">快速加入</button>`;
}

function productCard(p) {
  const image = p.images?.edges?.[0]?.node;
  const p0 = p.priceRange?.minVariantPrice;
  const cp = p.compareAtPriceRange?.minVariantPrice;
  const isOnSale = cp && parseFloat(cp.amount) > parseFloat(p0.amount);
  const variants = p.variants?.edges || [];
  const variant = variants[0]?.node;
  const isSoldOut = soldOut(p);
  // 得一個規格先可以一撳就加。多過一個（例如口紅色號）就要客自己揀 ——
  // 幫佢揀咗第一隻色，等於幫佢買錯嘢。
  const oneVariant = variants.length === 1;
  return `
    <a href="/products/${p.handle}" class="product-card">
      <div class="product-card__image-wrap">
        ${image ? `<img class="product-card__image" src="${image.url}" alt="${image.altText || p.title}" loading="lazy">` : ''}
        ${isSoldOut ? '<span class="product-card__badge product-card__badge--sold-out">售完</span>' : ''}
        ${isOnSale && !isSoldOut ? '<span class="product-card__badge">特價</span>' : ''}
        ${typeof awardRibbon === 'function' ? awardRibbon(p.handle) : ''}
        <button type="button" class="product-card__wishlist${
          typeof isInWishlist === 'function' && isInWishlist(p.id) ? ' is-active' : ''}"
          aria-label="加入願望清單" data-wish="${p.id}"
          data-wish-handle="${p.handle}"
          data-wish-title="${(p.title || '').replace(/"/g, '&quot;')}">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        ${quickAddControl(p, { isSoldOut, oneVariant, variantId: variant?.id })}
      </div>
      <span class="product-card__brand">${p.vendor || ''}</span>
      <span class="product-card__name">${p.title}</span>
      ${typeof ratingChip === 'function' ? ratingChip(p.handle) : ''}
      <span class="product-card__price">${formatPrice(p0.amount)}</span>
      ${isOnSale ? `<span class="product-card__compare-price">${formatPrice(cp.amount)}</span>` : ''}
    </a>`;
}

function brandSection(vendor, items, index) {
  const logo = brandLogo(vendor);
  const plate = brandPlate(vendor);
  // Within a brand, list the routine in the order you use it, then let
  // the featured score decide inside each step.
  const ordered = [...items].sort((a, b) =>
    routineStep(a) - routineStep(b) || featuredScore(b) - featuredScore(a));
  const [inStock, out] = splitStock(ordered);
  // A colour field, the brand's own logo, and its name. Photography was
  // tried twice and abandoned: nineteen brands shoot nineteen ways, half
  // of them burn their own wordmark into the frame, and nine publish
  // nothing wider than a square — no crop makes that set look like one
  // thing. A plate cannot crop, cannot clash, and never misrepresents.
  return `
    <section class="brand-section" id="brand-${index}">
      <header class="brand-plate${plate.dark ? ' is-dark' : ''}"
              style="--plate:${plate.tint}">
        ${logo
          ? `<img class="brand-plate__logo" src="${logo}" alt="${vendor}"
                  style="height:${brandLogoHeight(vendor)}px" loading="lazy">`
          : `<span class="brand-plate__wordmark">${vendor}</span>`}
        <span class="brand-plate__name">${vendor}</span>
        <h2 class="visually-hidden">${vendor}</h2>
      </header>
      <div class="product-grid">${inStock.map(productCard).join('')}</div>
      ${soldOutBlock(out, index)}
    </section>`;
}

/**
 * 頁邊嘅品牌導覽：你而家喺邊個品牌，同埋點樣跳去另一個。
 *
 * 樣式係一列短線，浪頭（你所在嗰個）附近嗰幾條會伸長、變深，
 * 旁邊一個標籤講你而家掂住／身處邊個品牌。
 * （試過掂到就成排品牌名一齊彈出嚟，五十幾個太多、太亂，撤回咗。）
 *
 * 兩件事同上一版唔同，兩件都係老闆撞過先改：
 *  1. 掂到**只係預覽**。以前一掂到就即刻捲版，碌版時滑鼠掃過條 rail
 *     就會無端端彈咗去第二個品牌。而家要撳落去先真係去。
 *  2. 幾何量一次就快取住。以前滑鼠每郁一下都要逐條線問一次位置
 *     （五十幾次，每次迫瀏覽器重算成版排版），再逐條改闊度 —— 就係窒
 *     嘅來源。而家只改浪頭附近嗰幾條。
 */
function buildBrandRail(order) {
  document.querySelector('.brand-rail')?.remove();
  if (order.length < 2) return;

  const names = order.map(([vendor]) => vendor);
  const rail = document.createElement('nav');
  rail.className = 'brand-rail';
  rail.setAttribute('aria-label', '品牌導覽');
  rail.innerHTML =
    '<span class="brand-rail__label" aria-hidden="true"></span>'
    + '<span class="brand-rail__crest" aria-hidden="true"></span>'
    + names.map((vendor, i) => `
      <a class="brand-rail__item" href="#brand-${i}" data-rail="${i}"
         aria-label="${vendor}" style="--fall:0"><span class="brand-rail__tick"></span></a>`).join('');
  document.body.appendChild(rail);

  const items = [...rail.querySelectorAll('.brand-rail__item')];
  const label = rail.querySelector('.brand-rail__label');
  const sections = [...document.querySelectorAll('.brand-section')];

  /* 浪頭附近先算數。cos 出嚟嘅肩膊圓，線性會變成尖帳篷。 */
  const REACH = 2.6;
  const swell = (d) => (d >= REACH ? 0 : (Math.cos((d / REACH) * Math.PI) + 1) / 2);

  /* ── 幾何：量一次就夠 ──────────────────────────────────
     條 rail 係 fixed，唔會跟住碌版郁，所以位置只需要喺開頭同改窗
     大細嗰陣量。 */
  let geo = null;
  function measure() {
    const box = rail.getBoundingClientRect();
    if (!box.width || !box.height) { geo = null; return; }
    const vertical = box.height >= box.width;
    geo = {
      vertical,
      left: box.left,
      top: box.top,
      centres: items.map((el) => {
        const b = el.getBoundingClientRect();
        return vertical ? b.top + b.height / 2 - box.top
                        : b.left + b.width / 2 - box.left;
      }),
    };
  }

  function posOf(at) {
    if (!geo) return 0;
    const c = geo.centres;
    const i = Math.max(0, Math.min(c.length - 1, at));
    const lo = Math.floor(i);
    const hi = Math.min(c.length - 1, lo + 1);
    return c[lo] + (c[hi] - c[lo]) * (i - lo);
  }

  /* ── 標示 ──────────────────────────────────────────────
     只改浪頭夠得到嗰幾條，同埋上一次改過而今次夠唔到嘅要清返 0。
     五十幾條逐條寫係之前窒嘅主因。 */
  let touched = [];
  let currentIdx = -1;

  function mark(at, current = Math.round(at)) {
    const lo = Math.max(0, Math.ceil(at - REACH));
    const hi = Math.min(items.length - 1, Math.floor(at + REACH));
    const next = [];
    for (let n = lo; n <= hi; n++) {
      items[n].style.setProperty('--fall', String(swell(Math.abs(n - at))));
      next.push(n);
    }
    touched.forEach((n) => {
      if (n < lo || n > hi) items[n].style.setProperty('--fall', '0');
    });
    touched = next;

    if (current !== currentIdx) {
      items[currentIdx]?.classList.remove('is-current');
      items[current]?.classList.add('is-current');
      currentIdx = current;
    }

    if (!geo) return;
    const p = posOf(at);
    rail.style.setProperty('--crest-x', (geo.vertical ? 14 : p) + 'px');
    rail.style.setProperty('--crest-y', (geo.vertical ? p : 20) + 'px');
    if (label && names[current] !== undefined) {
      label.textContent = names[current];
      if (geo.vertical) label.style.top = posOf(current) + 'px';
      else label.style.left = posOf(current) + 'px';
    }
  }

  function indexAt(clientX, clientY) {
    if (!geo) measure();
    if (!geo) return 0;
    const { vertical, centres, left, top } = geo;
    const pos = vertical ? clientY - top : clientX - left;
    const last = centres.length - 1;
    if (pos <= centres[0]) return 0;
    if (pos >= centres[last]) return last;
    for (let n = 0; n < last; n++) {
      if (pos <= centres[n + 1]) {
        const s = centres[n + 1] - centres[n] || 1;
        return n + (pos - centres[n]) / s;
      }
    }
    return last;
  }

  function goTo(i, smooth) {
    const sec = sections[i];
    if (!sec) return;
    const y = window.scrollY + sec.getBoundingClientRect().top
      - (parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--header-height')) || 72) - 12;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  }

  /* ── 掂到＝預覽，撳落去＝先至去 ──────────────────────── */
  let previewing = false;
  let dragged = false;

  const preview = (e) => {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    previewing = true;
    rail.classList.add('is-live');
    mark(indexAt(t.clientX, t.clientY));
  };
  const release = () => {
    previewing = false;
    rail.classList.remove('is-live');
    spy();
  };

  rail.addEventListener('pointermove', preview);
  rail.addEventListener('pointerleave', release);
  rail.addEventListener('touchstart', () => { dragged = false; }, { passive: true });
  rail.addEventListener('touchmove', (e) => {
    dragged = true;
    preview(e);
    if (e.cancelable) e.preventDefault();   // 拉緊條 rail 就唔好順手捲版
  }, { passive: false });
  rail.addEventListener('touchend', () => {
    // 手指沿住條 rail 拉完鬆手 → 去嗰個位。輕㩒一下就當普通點擊。
    if (dragged) goTo(Math.round(currentIdx), true);
    dragged = false;
    release();
  });
  rail.addEventListener('touchcancel', () => { dragged = false; release(); });

  rail.addEventListener('click', (e) => {
    const a = e.target.closest('[data-rail]');
    if (!a) return;
    e.preventDefault();
    goTo(+a.dataset.rail, true);
  });

  /* ── 跟住碌版行 ──────────────────────────────────────
     每段嘅位置都快取住，所以 spy() 只係加減數，唔使問排版。
     inline 行（唔用 rAF）—— 背景分頁 rAF 會停，以前試過令條 rail
     一直卡喺第一個品牌。 */
  let tops = [];
  function measureSections() {
    tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
  }
  function spy() {
    if (previewing || !tops.length) return;
    const line = window.scrollY + window.innerHeight * 0.28;
    let current = 0;
    for (let i = 0; i < tops.length; i++) if (tops[i] <= line) current = i;
    mark(current);
  }

  function remeasure() { measure(); measureSections(); spy(); }

  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', remeasure, { passive: true });
  window.addEventListener('load', remeasure);
  // 圖片載入會推低下面嘅段落，快取住嘅位置要跟住更新
  setTimeout(remeasure, 600);
  setTimeout(remeasure, 2000);

  remeasure();
  mark(0);
}

/** Group into brand sections, or fall back to one grid when filtered. */
/* Sold-out stock is still worth listing — people search for it, and it
   comes back — but a grid opening on four greyed-out cards reads as a
   shop that has run dry. It goes behind a disclosure at the end instead. */
function splitStock(items) {
  return [items.filter((p) => !soldOut(p)), items.filter(soldOut)];
}

function soldOutBlock(items, id) {
  if (!items.length) return '';
  return `<details class="sold-out" ${''}>
    <summary class="sold-out__toggle">
      <span>售完商品</span><span class="sold-out__n">${items.length}</span>
    </summary>
    <div class="product-grid sold-out__grid">${items.map(productCard).join('')}</div>
  </details>`;
}

function renderProducts(container, products, { grouped }) {
  if (!grouped) {
    document.querySelector('.brand-rail')?.remove();
    const [inStock, out] = splitStock(products);
    container.innerHTML =
      `<div class="product-grid">${inStock.map(productCard).join('')}</div>`
      + soldOutBlock(out, 'all');
    return;
  }
  const byVendor = new Map();
  products.forEach((p) => {
    const v = p.vendor || '其他';
    if (!byVendor.has(v)) byVendor.set(v, []);
    byVendor.get(v).push(p);
  });
  // Brands used to be ordered by how many products they had, which meant
  // the default page opened on whoever we happened to stock most of.
  // Order them by their best product instead, so "推薦" reaches the top of
  // the page and not just the inside of each section.
  const best = (items) => Math.max(...items.map(featuredScore));
  const order = [...byVendor.entries()]
    .sort((a, b) => best(b[1]) - best(a[1]) || b[1].length - a[1].length);
  container.innerHTML = order.map(([v, items], i) => brandSection(v, items, i)).join('');
  buildBrandRail(order);
}

/**
 * Wire a category page. Renders brand sections by default and a flat
 * grid once the shopper filters or sorts, since grouping only helps
 * while you are browsing.
 */
async function initCatalog({ section, cat, products }) {
  const host = document.querySelector('[data-catalog]')
    || document.querySelector('.product-grid')?.parentElement;
  if (!host) return;
  host.setAttribute('data-catalog', '');

  // Unit prices and ingredient chips are drawn into the cards, so the
  // data has to be in hand before the first draw — otherwise the badges
  // pop in a beat later and the grid jumps.
  if (typeof loadIngredients === 'function') await loadIngredients();
  if (typeof loadRatings === 'function') await loadRatings();

  buildFilterSidebar(section, products);
  // A brand in the URL is a filter like any other, just set before the
  // first draw instead of by a click.
  const urlBrand = brandFromUrl(products);
  preselectBrand(urlBrand);
  // Say whose page this is. Filtering silently looks like the link went
  // to the wrong place — which is exactly what it used to do.
  if (urlBrand) {
    const title = document.querySelector('.category-banner__title');
    if (title) title.textContent = urlBrand;
    const desc = document.querySelector('.category-banner__desc');
    if (desc) {
      const n = products.filter((p) => p.vendor === urlBrand).length;
      desc.textContent = `${urlBrand} 喺 OUJI 有 ${n} 件產品。`;
    }
    const tail = document.querySelector('.breadcrumb span:last-child');
    if (tail && !tail.classList.contains('breadcrumb__sep')) tail.textContent = urlBrand;
    document.title = `${urlBrand} — OUJI`;
  }

  const countEl = document.querySelector('.filter-bar__count');
  const sortEl = document.querySelector('.filter-bar__sort select');

  function draw() {
    const sel = activeFilters();
    const sortKey = sortEl?.value || 'featured';
    let list = applyFilters(section, products, sel);
    const cmp = SORTS[sortKey];
    if (cmp) list = [...list].sort(cmp);

    // Arriving on a subcategory from the nav (底妝, 唇妝 …) is already a
    // narrowed request — the shopper wants every base product, not a
    // tour of the brands — so group only while browsing the whole section.
    const filtered = cat || sel.cat.size || sel.vendor.size || sel.price.size || sel.flag.size;
    // Brand sections only survive the default order — asking for "cheapest
    // first" and getting it inside each brand is not what was asked.
    const grouped = !filtered && sortKey === 'featured'
      && new Set(list.map((p) => p.vendor)).size > 1;

    buildQuickTabs(section, products, sel);
    buildBrandStrip(products, sel);
    buildActiveChips(section, sel);
    if (countEl) countEl.textContent = `顯示 ${list.length} 件產品`;

    /* 分類標頭右邊嗰行細字。用成個分類嘅總數（唔跟篩選郁）——
       篩選咗之後仲話「529 件」會誤導，所以篩緊嘅時候唔出件數，
       嗰個數已經喺下面「顯示 N 件產品」度講咗。 */
    /* 標頭本來會喺呢個分類自己啲貨度抽一張產品相做背景。老闆睇完話
       「唔好睇」—— 一件貨放大到成個標頭，同下面成格產品相撞，
       而且抽邊件都似偏心。而家改成純 CSS 嘅淺藍虛化玻璃（睇 styles.css
       嘅 .cat-head__shot），唔使揀貨、每個分類都企理。 */

    const headMeta = document.querySelector('[data-cat-count]');
    if (headMeta) {
      const brands = new Set(products.map((x) => x.vendor).filter(Boolean)).size;
      headMeta.textContent = filtered ? ''
        : `${products.length} 件 · ${brands} 個品牌`;
    }
    if (!list.length) {
      host.innerHTML = `<p class="catalog-empty">冇產品符合呢個篩選。<button class="link-btn" data-filter-clear>清除篩選</button></p>`;
      return;
    }
    renderProducts(host, list, { grouped });
    prefetchProducts(list.slice(0, 12).map((p) => p.handle));
  }

  document.addEventListener('change', (e) => {
    if (e.target.closest('.filter-sidebar') || e.target === sortEl) draw();
  });
  const boxes = (group, value) =>
    [...document.querySelectorAll('.filter-sidebar input[type="checkbox"]')]
      .filter((el) => (!group || el.dataset.group === group)
                   && (value == null || el.value === value));

  document.addEventListener('click', (e) => {
    const clear = e.target.closest('[data-filter-clear]');
    if (clear) {
      boxes().forEach((el) => { el.checked = false; });
      return draw();
    }
    // A quick tab is a 分類 filter that happens to live outside the drawer,
    // so it drives the same checkboxes rather than keeping its own state.
    const tab = e.target.closest('[data-quick]');
    if (tab) {
      const id = tab.dataset.quick;
      boxes('cat').forEach((el) => { el.checked = !!id && el.value === id; });
      return draw();
    }
    const chip = e.target.closest('[data-unset-group]');
    if (chip) {
      boxes(chip.dataset.unsetGroup, chip.dataset.unsetValue)
        .forEach((el) => { el.checked = false; });
      return draw();
    }
  });

  draw();
}
