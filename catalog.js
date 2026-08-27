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

/* BRAND_LOGO 同 brandLogo() 搬咗去 shopify.js。
   首頁載 shopify.js 但唔載 catalog.js，而「新品速遞」嗰格都要
   攞品牌 logo —— 放喺共用嗰層先兩邊都用得。 */


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

/* 「最新上架」用 Shopify 真實 createdAt。老闆 2026-08-28：「應該加一個
   篩選嘅排序，就係新嘅，即係由新去到舊嘅。咁起碼可以俾人睇到有咩新貨。」
   ⚠️ 首頁本來就有條「睇晒新貨」連結指住 shop.html?sort=new，但一直冇
   人接 —— 冇 new 呢個 key，個 sort 參數又冇讀，撳落去同預設排序一樣。
   而家兩樣一齊補返。 */
const SORTS = {
  featured: (a, b) => featuredScore(b) - featuredScore(a),
  new: (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
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
      set: new Set(products.filter((p) => (section
        ? subMatch(section, id, p)
        : matchesKeywords(p, sub.keywords))).map((p) => index.get(p))),
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
  // 細分類（`parent`）保證係阿爸嗰格嘅一部分，所以阿爸喺度就唔使出佢。
  // 唔可以淨係靠下面「細過」嗰條規則 —— 胭脂同頰彩件數一模一樣，
  // 「細過」唔成立，結果兩格都出咗。
  const parentOf = (id) => catOptions(section).find(([k]) => k === id)?.[1]?.parent;
  const ids = new Set(all.map((s) => s.id));
  const flat = all.filter((s) => !ids.has(parentOf(s.id)));
  const kept = flat.filter((s) => !flat.some((o) =>
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
      const hit = [...sel.cat].some((id) => (section
        ? subMatch(section, id, p)
        : matchesKeywords(p, catKeywords(section, id))));
      if (!hit) return false;
    }
    return true;
  });
}

/* ----- The two bars above the grid -----
   Filtering used to live entirely behind one 篩選 button: you could not
   see what was applied without reopening the drawer, and the commonest
   move of all — jump to 唇妝 — took three taps. */

/** 分類頁頂嘅入口 tile —— 每個子分類一格，一張真貨相加件數。
 *
 * 之前呢個位係一個大標題塊：細楷英文引子、40px 襯線標題、兩行說明、
 * 一塊淺藍虛化玻璃。量過之後，手機第一件貨喺 900px；Olive Young 同一
 * 種頁面係 219px。個標題塊乜都冇幫到手 —— 客係嚟睇貨，唔係嚟讀說明。
 *
 * 每格張相喺嗰個子分類自己啲貨度抽（同一把尺：推薦排序第一件），
 * 唔用圖示、唔用圖庫相。抽唔到相就淨係出名同件數，唔會爛版。 */
/* 相入錯咗嘅貨（Shopify 後台問題，唔係呢度嘅 bug）。件數照計，但唔會
   攞嚟做示範相 —— 老闆係憑 demo 判斷，示範相出錯比 code 出錯更嚴重。
   同 scripts/makeup_subcats.py 嘅 BAD_IMAGE 同步；喺後台換返張相就
   兩邊一齊剷走。 */
const BAD_IMAGE = new Set([
  // 檔名係 clio-kill-lash-superproof-mascara-01.jpg，名啱，但張圖係支唇釉。
  'CLIO 極緻捲翹超防水睫毛膏',
]);

/* 彩妝細分類（粉底／氣墊／遮瑕⋯）。
 *
 * 本來試過將 12 粒細貼紙圍喺五張大貼紙隔籬，但 hero 得 350px 高、手機
 * 一格得 75px 闊 —— 塞得落嘅話粒粒細到撳唔到。所以改成兩層：喺 hero
 * 揀大分類，揀咗之後先喺下面出返嗰個分類自己嘅細分類，一次最多四個。
 *
 * 圖用返 assets/images/makeup-subcategory-stickers/ 嗰套。
 * 件數唔可以問 availableSubs —— 佢特登會收埋細分類（唔係嘅話「胭脂」
 * 同「頰彩」會出兩格），所以直接數。 */
const MAKEUP_SUBS = {
  base:    [['foundation', '粉底', 'foundation'], ['cushion', '氣墊', 'cushion'],
            ['concealer', '遮瑕', 'concealer']],
  eye:     [['eyeshadow', '眼影', 'eyeshadow'], ['eyeliner', '眼線', 'eyeliner'],
            ['mascara', '睫毛膏', 'mascara'], ['brow', '眉筆', 'brow-pencil']],
  lip:     [['lipstick', '唇膏', 'lipstick'], ['liptint', '唇釉', 'lip-tint'],
            ['lipgloss', '唇彩', 'lip-gloss']],
  cheek:   [['blush', '胭脂', 'blush']],
  contour: [['highlight', '高光', 'highlighter']],
};

function buildMakeupSubs(section, products, active, lockCat) {
  const host = document.querySelector('[data-cat-subs]');
  if (!host) return;
  const parent = [...active].find((id) => MAKEUP_SUBS[id]);
  const rows = (MAKEUP_SUBS[parent] || [])
    .map(([id, label, file]) => ({ id, label, file,
      n: products.filter((p) => subMatch(section, id, p)).length }))
    .filter((r) => r.n);          // 冇貨嘅唔好出粒死掣
  // 一個細分類都冇（或者根本未揀大分類）就成行收埋，唔留條吉行
  host.hidden = rows.length < 2;
  if (host.hidden) { host.innerHTML = ''; return; }
  const dir = 'assets/images/makeup-subcategory-stickers';
  host.innerHTML = rows.map((r) => `
    <button type="button" class="cat-subs__item${lockCat === r.id ? ' is-on' : ''}"
      data-quick="${r.id}" data-booth-sub aria-pressed="${lockCat === r.id}">
      <picture>
        <source srcset="${dir}/${r.file}.webp" type="image/webp">
        <img src="${dir}/${r.file}.png" alt="" width="200" height="200" loading="lazy" decoding="async">
      </picture>
      <b>${r.label}</b><small>${r.n}</small>
    </button>`).join('');
}

/* 彩妝頁頂嘅貼紙相機。靜態裝飾同五粒掣本身寫死喺 makeup.html —— 咁樣
   閃光同相紙落下嘅動畫只會喺第一次載入播一次，之後換分類唔會成塊嘢
   重新閃過。呢度淨係填會變嘅嘢：件數、選中狀態、相紙嗰四張相。 */
function buildMakeupBooth(section, products, sel, lockCat) {
  const booth = document.querySelector('[data-makeup-booth]');
  if (!booth) return false;

  const counts = new Map(availableSubs(section, products).map((x) => [x.id, x.count]));
  // 選中邊格：側欄嘅 分類 剔（撳大貼紙會剔佢）＋ URL／細分類帶入嚟嗰個。
  const active = new Set(sel.cat);
  if (lockCat) active.add(CATEGORY_TAXONOMY[section]?.subs?.[lockCat]?.parent || lockCat);

  booth.querySelectorAll('[data-booth-sticker]').forEach((btn) => {
    const id = btn.dataset.quick;
    const n = counts.get(id) || 0;
    const on = active.has(id);
    btn.querySelector(`[data-booth-n="${id}"]`).textContent = n;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.toggleAttribute('data-active', on);
  });

  buildMakeupSubs(section, products, active, lockCat);

  const meta = booth.querySelector('[data-booth-meta]');
  const brands = new Set(products.map((p) => p.vendor).filter(Boolean)).size;
  if (meta) meta.textContent = `彩妝 · ${products.length} 件 · ${brands} 個品牌`;

  /* 相紙揀而家睇緊嗰格嘅貨，冇揀分類就成個彩妝度揀。同一把尺（推薦排序）
     揀頭四件有相嘅，跳過已知影錯相嗰啲 —— 寧願得三格，都好過掛住一支
     唔啱嘅貨。 */
  const pool = active.size
    ? products.filter((p) => [...active].some((id) => subMatch(section, id, p)))
    : products;
  const shots = pool
    .filter((p) => p.images?.edges?.[0]?.node?.url && !BAD_IMAGE.has(p.title))
    .sort((a, b) => featuredScore(b) - featuredScore(a))
    .slice(0, 4)
    .map((p) => p.images.edges[0].node.url + '&width=360');

  const frames = booth.querySelectorAll('.makeup-booth__frames img');
  frames.forEach((img, i) => {
    // 唔夠四張就收起嗰格，唔好留個 broken image 或者補張假貨相。
    if (shots[i]) { img.src = shots[i]; img.hidden = false; }
    else { img.removeAttribute('src'); img.hidden = true; }
  });
  const cap = booth.querySelector('[data-booth-caption]');
  if (cap) cap.textContent = `OUJI PHOTO CLUB · ${products.length} / ${brands}`;
  return true;
}

/* 護膚頁頂嘅水光房貼紙相機。同彩妝嗰邊一樣：靜態裝飾同八粒掣寫死喺
   category.html，呢度淨係填會變嘅嘢 —— 件數、選中狀態、相紙嗰四張相。
   咁樣閃光同相紙落下嘅動畫只會喺第一次載入播一次，換分類唔會重播。 */
function buildSkincareBooth(section, products, sel, lockCat) {
  const booth = document.querySelector('[data-skincare-booth]');
  if (!booth) return false;

  const counts = new Map(availableSubs(section, products).map((x) => [x.id, x.count]));
  const active = new Set(sel.cat);
  if (lockCat) active.add(lockCat);

  booth.querySelectorAll('[data-booth-sticker]').forEach((btn) => {
    const id = btn.dataset.quick;
    const on = active.has(id);
    btn.querySelector(`[data-skincare-booth-n="${id}"]`).textContent = counts.get(id) || 0;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.toggleAttribute('data-active', on);
  });

  const brands = new Set(products.map((p) => p.vendor).filter(Boolean)).size;
  const meta = booth.querySelector('[data-skincare-booth-meta]');
  if (meta) meta.textContent = `護膚 · ${products.length} 件 · ${brands} 品牌`;

  /* 相紙先用人手驗過有模特／情境嘅相（booth-shots.js）—— 貼紙相機要似
     影相機，四格白底 packshot 做唔到嗰種感覺。冇揀分類就八格度輪住抽，
     唔夠四張先用返推薦排序頭幾件補。全部都係嗰件貨自己嘅相。 */
  const live = new Set(products.map((p) => p.handle));
  const picked = typeof BOOTH_SHOTS === 'object' && BOOTH_SHOTS
    ? (active.size
        ? [...active].flatMap((id) => BOOTH_SHOTS[id] || [])
        // 冇揀分類：八格輪流抽一張，唔好一整排都係同一格嘅貨
        : Object.values(BOOTH_SHOTS).flatMap((rows, i) => rows[i % rows.length] || []))
      .filter((r) => live.has(r.handle))
    : [];

  const used = new Set(picked.map((r) => r.handle));
  const pool = active.size
    ? products.filter((p) => [...active].some((id) => subMatch(section, id, p)))
    : products;
  const filler = pool
    .filter((p) => p.images?.edges?.[0]?.node?.url && !BAD_IMAGE.has(p.title)
      && !used.has(p.handle))
    .sort((a, b) => featuredScore(b) - featuredScore(a))
    .map((p) => p.images.edges[0].node.url);

  const shots = [...picked.map((r) => r.url), ...filler]
    .slice(0, 4)
    .map((u) => u + '&width=300');

  booth.querySelectorAll('.skincare-booth__frames img').forEach((img, i) => {
    if (shots[i]) { img.src = shots[i]; img.hidden = false; }
    else { img.removeAttribute('src'); img.hidden = true; }
  });
  const cap = booth.querySelector('[data-skincare-booth-caption]');
  if (cap) cap.textContent = `FRESH DEW · ${products.length} / ${brands}`;
  return true;
}

function buildCatGate(section, products, sel, lockCat) {
  // 彩妝同護膚都換咗做貼紙相機，啲掣寫死喺 HTML，唔行下面砌 tile 嗰段。
  if (buildMakeupBooth(section, products, sel, lockCat)) return;
  if (buildSkincareBooth(section, products, sel, lockCat)) return;
  const host = document.querySelector('[data-cat-gate]');
  if (!host) return;
  const subs = availableSubs(section, products);
  if (subs.length < 3) { host.innerHTML = ''; return; }
  const used = new Set();
  const shot = (id) => {
    // 每格一張唔同嘅相 —— 兩格出同一支貨會令人以為我哋得嗰幾件
    const hit = products
      .filter((p) => subMatch(section, id, p) && p.images?.edges?.[0]?.node?.url
        && !used.has(p.handle))
      .sort((a, b) => featuredScore(b) - featuredScore(a))[0];
    if (!hit) return null;
    used.add(hit.handle);
    return hit.images.edges[0].node.url + '&width=260';
  };
  const active = sel.cat;
  host.innerHTML = subs.map((sub) => {
    const u = shot(sub.id);
    return `<button type="button" class="cat-gate__tile${active.has(sub.id) ? ' is-on' : ''}"
      data-quick="${sub.id}">
      <span class="cat-gate__shot">${u ? `<img src="${u}" alt="" loading="lazy">` : ''}</span>
      <span class="cat-gate__label">${sub.label}</span>
      <span class="cat-gate__c">${sub.count} 件</span>
    </button>`;
  }).join('');
}

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

/* 三個主要商品頁共用同一套 exact 品牌 carousel。每版 artwork 保留第 3 款
   樣板嘅左焦點＋右 4×2 構圖；品牌 link 係透明 hotspot，唔會再改寫字款、
   產品擺位同卡面材質。卡片本身冇圓形箭嘴，翻頁控制獨立放喺 board 外。 */
const BRAND_SPOTLIGHTS = {
  all: {
    label: '熱門品牌', page: 'shop.html',
    slides: [
      { art: 'all-slide-1.webp', focus: 'Round Lab', brands: ['Anua', 'Abib', 'COSRX', 'Torriden', 'Skin1004', 'rom&nd', 'hince', 'TIRTIR'] },
      { art: 'all-slide-2.webp', focus: 'Some By Mi', brands: ['Mixsoon', 'Goodal', 'TIRTIR', 'Beplain', 'Bring Green', 'AMUSE', 'LINDSAY', 'lilybyred'] },
      { art: 'all-slide-3.webp', focus: 'Skinfood', brands: ['hince', 'MAYBELLINE', 'Beauty of Joseon', 'CLIO', 'dasique', 'Needly', 'WAKEMAKE', 'April Skin'] },
      { art: 'all-slide-4.webp', focus: 'rom&nd', brands: ['Purito', 'rom&nd', 'KSECRET', 'BOH', 'Laka', 'TOCOBO', 'SO Natural', 'ma:nyo'] },
    ],
  },
  makeup: {
    label: '熱門彩妝品牌', page: 'makeup.html',
    slides: [
      { art: 'makeup-slide-1.webp', focus: 'hince', brands: ['AMUSE', 'TIRTIR', 'lilybyred', 'hince', 'CLIO', 'MAYBELLINE', 'dasique', 'WAKEMAKE'] },
      { art: 'makeup-slide-2.webp', focus: 'rom&nd', brands: ['rom&nd', 'Laka', 'UNLEASHIA', 'SO Natural', 'fwee', 'Heart Percent', 'Peripera', '2aN'] },
      { art: 'makeup-slide-3.webp', focus: 'AMUSE', brands: ['花知曉 Flower Knows', 'Coralhaze', 'BRAYE', 'Glint'] },
    ],
  },
  skincare: {
    label: '熱門護膚品牌', page: 'category.html',
    slides: [
      { art: 'skincare-slide-1.webp', focus: 'Round Lab', brands: ['Anua', 'Abib', 'COSRX', 'Torriden', 'Skin1004', 'Some By Mi', 'Skinfood', 'Beauty of Joseon'] },
      { art: 'skincare-slide-2.webp', focus: 'Anua', brands: ['VT Cosmetics', 'Mixsoon', 'Goodal', 'Beplain', 'Bring Green', 'LINDSAY', 'Needly', 'April Skin'] },
      { art: 'skincare-slide-3.webp', focus: 'COSRX', brands: ['Purito', 'KSECRET', 'BOH', 'TOCOBO', 'ma:nyo', 'ILSO', 'Arencia', 'Haruharu Wonder'] },
      { art: 'skincare-slide-4.webp', focus: 'Torriden', brands: ['Dr. Melaxin', 'SUNGBOON EDITOR', 'TIRTIR', 'Dr.Jart+', 'SO Natural', 'HEVEBLUE'] },
    ],
  },
};

/* 每張 artwork 都係獨立排版，卡面及焦點大圖邊界唔可以共用一組估算值。
   座標以原圖像素記錄為 [left, top, right, bottom]，由 hotspotStyle 統一換算
   desktop 百分比及 mobile 104% crop，避免 hover 框同實際卡面漂移。 */
const BRAND_SPOTLIGHT_GEOMETRY = {
  'all-slide-1.webp': {
    width: 2152, feature: [0, 25, 900, 695],
    columns: [[946, 1215], [1243, 1513], [1540, 1810], [1838, 2108]],
    rows: [[122, 397], [424, 693]],
  },
  'all-slide-2.webp': {
    width: 2152, feature: [0, 24, 901, 695],
    columns: [[945, 1213], [1242, 1509], [1537, 1808], [1836, 2106]],
    rows: [[123, 397], [425, 694]],
  },
  'all-slide-3.webp': {
    width: 2152, feature: [0, 28, 880, 685],
    columns: [[926, 1186], [1210, 1508], [1532, 1810], [1835, 2109]],
    rows: [[124, 372], [397, 683]],
  },
  'all-slide-4.webp': {
    width: 2152, feature: [2, 22, 893, 705],
    columns: [[938, 1216], [1241, 1519], [1543, 1822], [1847, 2127]],
    rows: [[115, 387], [412, 700]],
  },
  'makeup-slide-1.webp': {
    width: 2152, feature: [7, 28, 884, 700],
    columns: [[931, 1198], [1223, 1494], [1518, 1787], [1812, 2101]],
    rows: [[119, 396], [417, 697]],
  },
  'makeup-slide-2.webp': {
    width: 2152, feature: [21, 26, 921, 705],
    columns: [[966, 1245], [1268, 1549], [1566, 1844], [1861, 2130]],
    rows: [[124, 399], [426, 705]],
  },
  'makeup-slide-3.webp': {
    width: 2152, feature: [0, 23, 921, 702],
    columns: [[963, 1242], [1269, 1542], [1568, 1827], [1853, 2132]],
    rows: [[113, 401], [428, 701]],
  },
  'skincare-slide-1.webp': {
    width: 2151, feature: [7, 23, 894, 701],
    columns: [[932, 1215], [1234, 1528], [1547, 1825], [1844, 2121]],
    rows: [[116, 396], [417, 700]],
  },
  'skincare-slide-2.webp': {
    width: 2151, feature: [9, 21, 904, 698],
    columns: [[949, 1225], [1246, 1522], [1545, 1823], [1846, 2123]],
    rows: [[110, 388], [410, 694]],
  },
  'skincare-slide-3.webp': {
    width: 2152, feature: [0, 20, 913, 705],
    columns: [[958, 1228], [1253, 1527], [1553, 1827], [1854, 2129]],
    rows: [[117, 392], [420, 694]],
  },
  'skincare-slide-4.webp': {
    width: 2151, feature: [5, 21, 910, 703],
    columns: [[942, 1220], [1242, 1520], [1543, 1819], [1843, 2121]],
    rows: [[112, 401], [422, 702]],
  },
};

function hotspotStyle(box, artworkWidth, mobile = false) {
  const [left, top, right, bottom] = box;
  let x = left / artworkWidth;
  let y = top / 731;
  let width = (right - left) / artworkWidth;
  let height = (bottom - top) / 731;
  if (mobile) {
    x = (1291 - (artworkWidth * 1.04) + (left * 1.04)) / 1291;
    y = -.02 + (top * 1.04 / 731);
    width = (right - left) * 1.04 / 1291;
    height = (bottom - top) * 1.04 / 731;
  }
  const percent = (value) => `${(value * 100).toFixed(3)}%`;
  return `--hotspot-left:${percent(x)};--hotspot-top:${percent(y)};` +
    `--hotspot-width:${percent(width)};--hotspot-height:${percent(height)}`;
}

function spotlightLinks(slide, page, mobile = false) {
  const prefix = mobile ? 'shop-brand-carousel__mobile-' : 'shop-brand-spotlight__';
  const geometry = BRAND_SPOTLIGHT_GEOMETRY[slide.art];
  const brands = slide.brands.map((vendor, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const [left, right] = geometry.columns[col];
    const [top, bottom] = geometry.rows[row];
    return `<a class="${prefix}brand" href="${page}?brand=${encodeURIComponent(vendor)}"
      style="${hotspotStyle([left, top, right, bottom], geometry.width, mobile)}"
      aria-label="瀏覽 ${vendor} 產品"></a>`;
  }).join('');
  const feature = mobile ? '' : `<a class="${prefix}feature" href="${page}?brand=${encodeURIComponent(slide.focus)}"
      style="${hotspotStyle(geometry.feature, geometry.width)}"
      aria-label="瀏覽 ${slide.focus} 產品"></a>`;
  return `${feature}${brands}`;
}

function bindBrandSpotlight(host) {
  host._brandCarouselAbort?.abort();
  host._brandCarouselResize?.disconnect();
  const abort = new AbortController();
  host._brandCarouselAbort = abort;
  const viewport = host.querySelector('[data-brand-carousel-viewport]');
  const slides = [...host.querySelectorAll('.shop-brand-carousel__slide')];
  const dots = [...host.querySelectorAll('[data-brand-carousel-dot]')];
  const prev = host.querySelector('[data-brand-carousel-prev]');
  const next = host.querySelector('[data-brand-carousel-next]');
  const status = host.querySelector('[data-brand-carousel-status]');
  let active = 0;
  let raf = 0;

  const loadSlide = (index) => {
    const slide = slides[index];
    if (!slide) return;
    slide.querySelectorAll('img[data-src]').forEach((img) => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
    slide.querySelectorAll('[data-spotlight-art]').forEach((element) => {
      element.style.setProperty('--spotlight-art', `url("${element.dataset.spotlightArt}")`);
      element.removeAttribute('data-spotlight-art');
    });
  };

  const sync = (index, announce = false) => {
    active = Math.max(0, Math.min(slides.length - 1, index));
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === active);
      dot.setAttribute('aria-current', i === active ? 'true' : 'false');
    });
    if (prev) prev.disabled = active === 0;
    if (next) next.disabled = active === slides.length - 1;
    if (announce && status) status.textContent = `第 ${active + 1} 版，共 ${slides.length} 版`;
  };
  const go = (index) => {
    loadSlide(index);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollTo({ left: viewport.clientWidth * index, behavior: reduced ? 'auto' : 'smooth' });
    sync(index, true);
  };

  prev?.addEventListener('click', () => go(active - 1), { signal: abort.signal });
  next?.addEventListener('click', () => go(active + 1), { signal: abort.signal });
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i), { signal: abort.signal }));
  viewport.addEventListener('pointerdown', () => {
    loadSlide(active - 1);
    loadSlide(active + 1);
  }, { passive: true, signal: abort.signal });
  viewport.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const index = Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth));
      loadSlide(index);
      sync(index);
    });
  }, { passive: true, signal: abort.signal });
  const ro = new ResizeObserver(() => viewport.scrollTo({ left: viewport.clientWidth * active }));
  ro.observe(viewport);
  host._brandCarouselResize = ro;
  sync(0);
}

function buildShopBrandSpotlight(products, section = null) {
  const host = document.querySelector('[data-shop-brand-spotlight]');
  if (!host) return;
  const key = host.dataset.spotlightSection || section || 'all';
  const config = BRAND_SPOTLIGHTS[key] || BRAND_SPOTLIGHTS.all;
  const slides = config.slides.map((slide, index) => {
    const source = `assets/brand-carousel/${slide.art}?v=20260826-speed`;
    const sourceAttr = index ? `data-src="${source}"` : `src="${source}"`;
    const artAttr = index
      ? `data-spotlight-art="${source}"`
      : `style="--spotlight-art:url('${source}')"`;
    return `
    <article class="shop-brand-carousel__slide" role="group"
      aria-roledescription="slide" aria-label="第 ${index + 1} 版，共 ${config.slides.length} 版">
      <div class="shop-brand-spotlight__board" ${artAttr}>
        <img class="shop-brand-spotlight__visual" ${sourceAttr}
          alt="${slide.focus} 焦點及 ${slide.brands.join('、')} ${config.label}"
          width="2152" height="731" ${index ? 'loading="lazy"' : 'loading="eager" fetchpriority="high"'} decoding="async">
        ${spotlightLinks(slide, config.page)}
      </div>
      <div class="shop-brand-carousel__mobile-board">
        <a class="shop-brand-carousel__mobile-feature" href="${config.page}?brand=${encodeURIComponent(slide.focus)}">
          <span class="shop-brand-carousel__mobile-crop shop-brand-carousel__mobile-crop--feature">
            <img ${sourceAttr} alt="" width="2152" height="731" loading="lazy" decoding="async">
          </span>
        </a>
        <div class="shop-brand-carousel__mobile-grid" ${artAttr}>
          <span class="shop-brand-carousel__mobile-crop shop-brand-carousel__mobile-crop--grid">
            <img ${sourceAttr} alt="" width="2152" height="731" loading="lazy" decoding="async">
          </span>
          ${spotlightLinks(slide, config.page, true)}
        </div>
      </div>
    </article>`;
  }).join('');
  host.innerHTML = `
    <div class="shop-brand-carousel" aria-roledescription="carousel" aria-label="${config.label}">
      <div class="shop-brand-carousel__viewport" data-brand-carousel-viewport tabindex="0">
        <div class="shop-brand-carousel__track">${slides}</div>
      </div>
      <div class="shop-brand-carousel__controls">
        <button type="button" class="shop-brand-carousel__page" data-brand-carousel-prev>上一版</button>
        <div class="shop-brand-carousel__dots" aria-label="選擇品牌頁面">
          ${config.slides.map((_, i) => `<button type="button" data-brand-carousel-dot
            aria-label="顯示第 ${i + 1} 版" aria-current="${i ? 'false' : 'true'}"></button>`).join('')}
        </div>
        <button type="button" class="shop-brand-carousel__page" data-brand-carousel-next>下一版</button>
      </div>
      <span class="sr-only" data-brand-carousel-status aria-live="polite"></span>
    </div>`;
  bindBrandSpotlight(host);
}

/** What is applied right now, each removable on its own. */
function buildActiveChips(section, sel, lockCat) {
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
  /* 細分類（粉底、氣墊⋯）唔喺側欄剔嗰度，喺 lockCat。冇呢粒 chip 嘅話，
     碌落去就冇嘢話畀客知篩緊乜、亦都清唔到。 */
  if (lockCat) {
    chips.unshift(`<button class="filter-chip" data-unset-lock="1">
      ${label('cat', lockCat)}<span aria-hidden="true">×</span></button>`);
  }
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
/* ============================================================
   全部產品頁：Y2K BOOT hero ＋ OUJI Explorer（只喺 shop.html 行）

   五個頂層分類要互斥 —— 一件貨只可以入一格，五格合計等於全部產品，
   否則客撳完五格加埋會多過 899 件，即刻穿煲。順序就係優先次序：
   隱形眼鏡 → K-pop → 彩妝 → 護膚 → 其餘落「其他」。
   隱形眼鏡同 K-pop 行先係因為佢哋最明確；彩妝行喺護膚之前，
   因為好多彩妝品名都帶住護膚字眼（素顏霜、水光氣墊）。

   件數、貼紙、視窗四張相全部用 live catalog 計，唔准寫死。
   ============================================================ */
/* `href` = 有自己專屬版面嗰啲分類，撳咗就過去嗰版，唔係喺下面個
   Explorer 度篩。老闆：「嗰兩個分頁我做得咁靚，梗係期望啲人直接去
   呢兩個位置，而唔係純粹去篩選嗰個位置。」
   冇 href 嘅（其他）先至喺 Explorer 入面篩。 */
const SHOP_GROUPS = [
  { id: 'skincare', label: '護膚',       tint: '#70e5ff', dialog: 'Loading skin care...',   href: 'category.html' },
  { id: 'makeup',   label: '彩妝',       tint: '#ff82c9', dialog: 'Loading make-up...',     href: 'makeup.html' },
  { id: 'lens',     label: '隱形眼鏡',   tint: '#77c8ff', dialog: 'Loading contact lens...', href: 'lens.html' },
  { id: 'kpop',     label: 'K-pop 周邊', tint: '#fff06a', dialog: 'Loading K-pop goods...', href: 'kpop.html' },
  { id: 'other',    label: '其他',       tint: '#c8a6ff', dialog: 'Loading more goods...' },
];
const SHOP_GROUP_ORDER = ['lens', 'kpop', 'makeup', 'skincare'];
/* 貼紙擺位：唔係五個一樣高嘅圓掣，係順手擺落枱面嗰種高低錯落 */
const SHOP_STICKER_POS = [
  { x: '11%', y: '0px',  r: '-5deg', s: 1 },
  { x: '30%', y: '20px', r: '4deg',  s: 0.95 },
  { x: '50%', y: '-2px', r: '-2deg', s: 1.08 },
  { x: '70%', y: '18px', r: '5deg',  s: 0.98 },
  { x: '88%', y: '2px',  r: '-4deg', s: 0.94 },
];

function productGroup(p) {
  for (const id of SHOP_GROUP_ORDER) {
    if (matchesKeywords(p, categoryKeywords(id))) return id;
  }
  return 'other';
}

function productsForGroup(products, key) {
  if (!key) return products;
  return products.filter((p) => productGroup(p) === key);
}

function shopGroupCounts(products) {
  const n = Object.fromEntries(SHOP_GROUPS.map((g) => [g.id, 0]));
  products.forEach((p) => { n[productGroup(p)] += 1; });
  return n;
}

/* 四格預覽：只用當前 group（或全部）真係有相嗰啲貨，唔重複同一件、
   唔補生成圖。唔夠四張就出實際有幾多張。 */
function bootPreview(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    const url = p.images?.edges?.[0]?.node?.url;
    if (!url || seen.has(p.handle) || BAD_IMAGE.has(p.handle)) continue;
    seen.add(p.handle);
    out.push({ url, title: p.title });
    if (out.length === 4) break;
  }
  return out;
}

function stickerArt(id) {
  return `<span class="shop-boot__art shop-boot__art--${id}" aria-hidden="true"><i></i></span>`;
}

function buildShopBootHero(products, activeGroup) {
  const host = document.querySelector('[data-boot-stickers]');
  if (!host) return;
  const counts = shopGroupCounts(products);
  const brands = new Set(products.map((p) => p.vendor).filter(Boolean)).size;

  host.innerHTML = SHOP_GROUPS.map((g, i) => {
    const pos = SHOP_STICKER_POS[i];
    const on = activeGroup === g.id;
    const style = `--x:${pos.x};--y:${pos.y};--r:${pos.r};--s:${pos.s};--tint:${g.tint}`;
    const inner = `${stickerArt(g.id)}
      <b class="shop-boot__label">${g.label}</b>
      <small class="shop-boot__n">${counts[g.id]}</small>`;
    // 有專屬版面就出 <a>（撳咗過去嗰版），冇就出 <button>（喺下面篩）
    return g.href
      ? `<a class="shop-boot__sticker" href="${g.href}" style="${style}">${inner}</a>`
      : `<button type="button" class="shop-boot__sticker${on ? ' is-on' : ''}"
          data-boot-group="${g.id}" aria-pressed="${on ? 'true' : 'false'}"
          style="${style}">${inner}</button>`;
  }).join('');

  const count = document.querySelector('[data-boot-count]');
  if (count) {
    count.textContent = `${products.length} ITEMS READY · ${SHOP_GROUPS.length} FOLDERS FOUND`;
  }
  const disk = document.querySelector('[data-boot-disk]');
  if (disk) disk.textContent = `${products.length} / ${brands}`;
}

function syncShopBoot(products, activeGroup, list) {
  const g = SHOP_GROUPS.find((x) => x.id === activeGroup) || null;

  document.querySelectorAll('[data-boot-group]').forEach((b) => {
    const on = b.dataset.bootGroup === activeGroup;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  const photos = document.querySelector('[data-boot-photos]');
  if (photos) {
    const shots = bootPreview(list);
    photos.innerHTML = shots.map((sh) =>
      `<img src="${sh.url}&width=220" alt="" loading="lazy" decoding="async"
            onerror="this.remove()">`).join('');
  }
  const folder = document.querySelector('[data-boot-folder]');
  if (folder) folder.textContent = g ? `${g.label} folder selected` : '5 folders ready';
  const dialog = document.querySelector('[data-boot-dialog]');
  if (dialog) dialog.textContent = g ? g.dialog : 'Loading all products...';
}

/* 由搜尋或者煩惱入嚟嗰陣，資料夾名已經由 shop.html 設咗做「暗沉・痘印」
   之類。冇揀 group 就唔可以夾硬寫返「全部產品」—— 客會以為篩選冇生效。 */
let EXPLORER_BASE_LABEL = '全部產品';

function syncShopExplorer(activeGroup, shown, total) {
  const g = SHOP_GROUPS.find((x) => x.id === activeGroup) || null;
  const name = g ? g.label : EXPLORER_BASE_LABEL;

  const title = document.querySelector('[data-explorer-title]');
  if (title) title.textContent = name;
  const path = document.querySelector('[data-explorer-path]');
  if (path) path.innerHTML = `OUJI SHOP <i>›</i> ${name}`;
  const items = document.querySelector('[data-explorer-items]');
  if (items) items.textContent = `${shown} ITEMS`;
  const status = document.querySelector('[data-explorer-status]');
  if (status) status.textContent = `${shown} 個物件`;
  const say = document.querySelector('[data-explorer-announce]');
  if (say) say.textContent = `${name}，顯示 ${shown} 件產品`;
  const back = document.querySelector('[data-boot-reset]');
  if (back) back.disabled = !activeGroup;
  const crumb = document.querySelector('.breadcrumb span:last-child');
  if (crumb && !crumb.classList.contains('breadcrumb__sep')) crumb.textContent = name;
  document.title = `${name} — OUJI`;
  if (typeof total === 'number' && total !== shown) { /* 篩緊，件數以顯示為準 */ }
}

async function initCatalog({ section, cat, products, presetCat = null, group = null, folderLabel = null }) {
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
  /* URL 入面嘅 ?cat= 當一個已經揀咗嘅篩選處理，唔喺攞資料嗰陣預先篩走 ——
     咁樣分類入口先仲見到晒成套選擇同真件數。側欄冇對應嗰粒掣嘅（細分類
     例如 ?cat=foundation 會被收埋喺「底妝」下面），就落 lockCat，每次
     draw 都夾硬篩多一層。 */
  let lockCat = null;
  if (presetCat) {
    const box = [...document.querySelectorAll('.filter-sidebar input[data-group="cat"]')]
      .find((el) => el.value === presetCat);
    if (box) box.checked = true;
    else if (CATEGORY_TAXONOMY[section]?.subs?.[presetCat]) lockCat = presetCat;
  }
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

  /* ?sort=new 由首頁「睇晒新貨」同埋新品格帶過嚟。只認 SORTS 有嘅 key，
     亂打一個就當冇寫，唔好靜靜哋出一個空清單。 */
  const urlSort = new URLSearchParams(location.search).get('sort');
  if (sortEl && urlSort && SORTS[urlSort]) sortEl.value = urlSort;

  /* 全部產品頁先有 BOOT hero。其他分類頁行到呢度乜都唔會做。 */
  const bootHost = document.querySelector('[data-shop-boot]');
  if (folderLabel) EXPLORER_BASE_LABEL = folderLabel;
  const validGroup = (k) => SHOP_GROUPS.some((g) => g.id === k) ? k : null;
  let activeGroup = bootHost ? validGroup(group) : null;
  if (bootHost) buildShopBootHero(products, activeGroup);

  function draw() {
    const sel = activeFilters();
    const sortKey = sortEl?.value || 'featured';
    /* 先套 group（頂層資料夾），再套側欄篩選同排序 —— 次序調轉嘅話
       件數會對唔上客撳嗰張貼紙。 */
    const scope = bootHost ? productsForGroup(products, activeGroup) : products;
    let list = applyFilters(section, scope, sel);
    if (lockCat) list = list.filter((p) => subMatch(section, lockCat, p));
    const cmp = SORTS[sortKey];
    if (cmp) list = [...list].sort(cmp);

    // Arriving on a subcategory from the nav (底妝, 唇妝 …) is already a
    // narrowed request — the shopper wants every base product, not a
    // tour of the brands — so group only while browsing the whole section.
    const filtered = cat || lockCat || sel.cat.size || sel.vendor.size
      || sel.price.size || sel.flag.size;
    // Brand sections only survive the default order — asking for "cheapest
    // first" and getting it inside each brand is not what was asked.
    const grouped = !filtered && sortKey === 'featured'
      && new Set(list.map((p) => p.vendor)).size > 1;

    buildCatGate(section, products, sel, lockCat);
    buildQuickTabs(section, scope, sel);
    buildShopBrandSpotlight(scope, section);
    buildBrandStrip(scope, sel);
    buildActiveChips(section, sel, lockCat);
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
    if (bootHost) {
      syncShopBoot(products, activeGroup, list.length ? list : scope);
      syncShopExplorer(activeGroup, list.length, products.length);
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

  /* 頂層資料夾：撳貼紙、撳「返回全部」、browser 前後鍵，三條路
     都要行同一段。URL 用 ?group=，唔重用 ?cat=（cat 已經係子分類契約）。 */
  function setGroup(next, { push = true } = {}) {
    const key = validGroup(next);
    if (key === activeGroup) return;
    activeGroup = key;
    if (push) {
      const url = new URL(window.location.href);
      if (key) url.searchParams.set('group', key);
      else url.searchParams.delete('group');
      history.pushState({ group: key }, '', url);
    }
    /* 唔搶 focus 去頁頂 —— syncShopExplorer 會寫落個 live region 宣讀 */
    draw();
  }

  if (bootHost) {
    document.addEventListener('click', (e) => {
      const sticker = e.target.closest('[data-boot-group]');
      if (sticker) {
        const id = sticker.dataset.bootGroup;
        setGroup(id === activeGroup ? null : id);
        return;
      }
      if (e.target.closest('[data-boot-reset]')) setGroup(null);
    });
    window.addEventListener('popstate', () => {
      const key = new URLSearchParams(window.location.search).get('group');
      setGroup(key, { push: false });
    });
  }

  document.addEventListener('click', (e) => {
    const clear = e.target.closest('[data-filter-clear]');
    if (clear) {
      boxes().forEach((el) => { el.checked = false; });
      lockCat = null;   // 細分類唔喺 checkbox 度，唔清佢就清唔乾淨
      return draw();
    }
    // A quick tab is a 分類 filter that happens to live outside the drawer,
    // so it drives the same checkboxes rather than keeping its own state.
    const tab = e.target.closest('[data-quick]');
    if (tab) {
      // 貼紙牆冇「全部」嗰格，所以再撳一次選中嗰張就係解除 —— 唔係
      // 咁樣揀完一格就返唔到轉頭。pill 嗰行有「全部」，照舊。
      const isBooth = tab.hasAttribute('data-booth-sticker') || tab.hasAttribute('data-booth-sub');
      const off = isBooth && tab.getAttribute('aria-pressed') === 'true';
      /* 細分類（粉底、氣墊⋯）喺篩選側欄係冇對應嗰粒剔嘅 —— availableSubs
         特登收埋咗佢哋。所以細分類要行 lockCat 呢條路，大分類就照舊剔側欄。 */
      const isSub = tab.hasAttribute('data-booth-sub');
      lockCat = (!off && isSub) ? tab.dataset.quick : null;
      const id = (off || isSub) ? '' : tab.dataset.quick;
      boxes('cat').forEach((el) => { el.checked = !!id && el.value === id; });
      return draw();
    }
    if (e.target.closest('[data-unset-lock]')) { lockCat = null; return draw(); }
    const chip = e.target.closest('[data-unset-group]');
    if (chip) {
      boxes(chip.dataset.unsetGroup, chip.dataset.unsetValue)
        .forEach((el) => { el.checked = false; });
      return draw();
    }
  });

  draw();
}
