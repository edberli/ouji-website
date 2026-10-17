/* 舊版產品頁專用（product-classic.html）：2026-10-17 main 嘅 reviews.js 原封不動抄一份。
   桌面都轉新版嗰陣刪走。 */
/**
 * Olive Young 評價.
 *
 * OUJI is new, so it has no reviews of its own — and inventing them was
 * never on the table. What it can do is show what Olive Young's shoppers
 * said about the same product, quoted and credited, with the original
 * text one tap away. A shopper can check every word.
 *
 * Three rules the renderer enforces rather than trusts the data for:
 *
 *   1. **The bad reviews stay.** A block that is all five stars is the
 *      thing people have learned to discount. The 3★ oxidation complaint
 *      is the most useful paragraph on the page for somebody deciding
 *      between two shades.
 *   2. **Never presented as ours.** Every unit carries the source, the
 *      reviewer's masked handle and the date, and the header says plainly
 *      that these came from Olive Young. It says it in text — there is no
 *      link. Naming your source is honest; handing a shopper a one-click
 *      route to the shop you sourced from is just losing the sale.
 *   3. **Only shades we can actually sell.** Olive Young carries 38
 *      colours of this tint; we carry ten. A glowing review of a shade
 *      that is not in the picker reads as a listing error, and the
 *      shopper is right — they cannot buy the thing being praised. The
 *      match runs against the live variant list at render time, so it
 *      self-corrects the moment stock changes.
 */
const RATINGS_URL = 'data/ratings.json';

/* 評分唔止一個來源：韓國貨引 Olive Young，日本貨引 @cosme，兩邊都冇
   先引 YesStyle。每件貨嘅 `src` 寫明出處（冇寫就係 Olive Young —— 舊資料
   全部係），`max` 係嗰個來源嘅滿分。@cosme 係 7 分制，唔換算做 5 分：
   換算咗嘅數字對方網站搵唔到，客人查唔返，等於作數。所以照原分數顯示，
   並且寫明「/7」。 */
const RATING_SOURCES = {
  oy: { name: 'Olive Young', who: 'Olive Young 顧客' },
  cosme: { name: '@cosme', who: '@cosme 會員' },
  ys: { name: 'YesStyle', who: 'YesStyle 顧客' },
};
const ratingSrc = (r) => RATING_SOURCES[r?.src] || { name: r?.srcName || 'Olive Young', who: `${r?.srcName || 'Olive Young'} 顧客` };
const ratingMax = (r) => Number(r?.max) || 5;
/** 分數文字：5 分制照舊「4.7」；其他滿分寫埋「/7」，免得 5.2 分（7 分制）俾人當 5 分制睇。 */
const ratingNum = (star, max) => (max === 5 ? `${star}` : `${star}<small class="rating-max">/${max}</small>`);

let RATINGS_CACHE = null;

/** 一件產品一個檔。全部夾埋係 800 KB —— 冇理由為咗睇一支唇釉
 *  嘅評價而攞埋其餘九十九件嘅。索引 (`ratings.json`) 話畀我哋知
 *  邊件有原文，冇嘅連 request 都唔使發。 */
async function loadReviews(handle) {
  const idx = await loadRatings();
  if (!idx[handle]?.text) return null;
  return fetch(`data/reviews/${encodeURIComponent(handle)}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

/* 分數同評價原文分開兩個檔，因為兩者嘅覆蓋率差好遠。分數係目錄
   一個 request 就攞到成個品牌，五百幾件都有；評價原文要逐件入產品頁
   先拎到。分開放，個網就唔使等齊先出得到星。 */
async function loadRatings() {
  if (RATINGS_CACHE) return RATINGS_CACHE;
  RATINGS_CACHE = await fetch(RATINGS_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.products || {})
    .catch(() => ({}));
  return RATINGS_CACHE;
}

/** 產品卡上面嗰行細星。冇分就回空字串，唔會留個窿。
 *
 *  卡片模板係同步嘅，所以呢個一定要同步答到 —— 頁面渲染之前
 *  行一次 `await loadRatings()` 就得，之後全部卡片即刻攞到。 */
function ratingChip(handle) {
  const r = RATINGS_CACHE?.[handle];
  if (!r) return '';
  /* 一定要標明呢啲分數唔係 OUJI 自己收返嚟嘅 —— 喺 OUJI 個 logo 隔籬
     淨係擺一串星同一個數字，客同 Google 都會當係我哋自己嘅評價。
     但呢度寫「韓國站」而唔係寫個店名：一版「全部產品」有六百幾個卡片，
     寫足店名等於喺自己個舖度幫人賣咗六百次廣告。講明唔係自己嘅就夠 ——
     真正引用評價原文嗰度（產品頁評價區）先寫足 Olive Young。 */
  const label = r.src && r.src !== 'oy' ? ratingSrc(r).name : '韓國站';
  return `<span class="card-rating">${stars(r.star, ratingMax(r))}
    <b>${ratingNum(r.star, ratingMax(r))}</b><span>${label} ${r.count.toLocaleString()} 則</span></span>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 實心／空心星，半星唔用圖 —— 用一條裁剪嘅實心星疊上去。 */
function stars(value, max = 5) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const row = (cls) => `<span class="stars__row stars__row--${cls}">★★★★★</span>`;
  return `<span class="stars" role="img" aria-label="${max} 分中 ${value} 分">
    ${row('bg')}<span class="stars__fill" style="width:${pct}%">${row('fg')}</span>
  </span>`;
}

function distBar(d, max) {
  const w = max ? (d.count / max) * 100 : 0;
  return `<div class="rv-dist__row">
    <span class="rv-dist__label">${d.star}★</span>
    <span class="rv-dist__track"><span class="rv-dist__bar" style="width:${w}%"></span></span>
    <span class="rv-dist__pct">${d.pct}%</span>
  </div>`;
}

/* ----- 色號對唔對得上 -----
 *
 * Olive Young 寫 "23 Peach Peach Me"、"[SET/miffy EDITION] 03 Bare Grape
 * (+Blur Fudge Pot)"；我哋寫 "#23 Peach Peach Me"。編號係最穩陣嘅鎖匙 ——
 * 全世界都跟返 rom&nd 官方編號，唔會因為套裝包裝而變。冇編號就拆返做字，
 * 睇名夠唔夠重疊。 */
function shadeKeys(s) {
  const t = String(s || '')
    .replace(/\[[^\]]*\]/g, ' ')          // [SET/miffy EDITION]
    .replace(/\([^)]*\)/g, ' ')           // (+Blur Fudge Pot)
    .toLowerCase();
  const num = t.match(/(?:^|[^\d])(\d{1,3})(?=\D|$)/);
  return {
    num: num ? String(+num[1]) : null,
    words: new Set(t.replace(/[^a-z一-鿿 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2)),
  };
}

function sameShade(a, b) {
  const x = shadeKeys(a); const y = shadeKeys(b);
  if (x.num && y.num) return x.num === y.num;
  if (!x.words.size || !y.words.size) return false;
  const hit = [...x.words].filter((w) => y.words.has(w)).length;
  return hit >= Math.min(2, Math.min(x.words.size, y.words.size));
}

/** 呢件產品實際賣緊嘅色號；冇色號選項（單一規格）就回 null。
 *  回 null 有兩個作用：唔篩評價，同埋唔好喺評價卡度貼個「色號」——
 *  單一規格嘅產品，OY 嗰個欄位其實係成個產品名。
 *  ProductOption.values 已由 Shopify query 移除，色號由 variants 嘅
 *  selectedOptions 推返出嚟，避免讀到不存在／過期嘅 options values。 */
function sellableShades(product) {
  const variants = (product?.variants?.edges || [])
    .map((e) => e?.node)
    .filter(Boolean);
  const options = new Map();

  variants.forEach((variant) => {
    (variant.selectedOptions || []).forEach((option) => {
      const name = String(option?.name || '').trim();
      const value = String(option?.value || '').trim();
      if (!name || !value || /^title$/i.test(name)) return;
      const key = name.toLowerCase();
      if (!options.has(key)) options.set(key, { key, name, values: new Set() });
      options.get(key).values.add(value);
    });
  });

  const shadeOption = [...options.values()].find((option) => option.values.size > 1
    && /color|colour|shade|tone|色號|顏色|色彩|色|カラー|色番|색상|호수/i.test(option.name));
  if (!shadeOption) return null;

  const valuesFor = (list) => {
    const values = [];
    list.forEach((variant) => {
      (variant.selectedOptions || []).forEach((option) => {
        if (String(option?.name || '').trim().toLowerCase() !== shadeOption.key) return;
        const value = String(option?.value || '').trim();
        if (value && !values.includes(value)) values.push(value);
      });
    });
    return values;
  };

  const live = valuesFor(variants.filter((variant) => variant.availableForSale));
  return live.length ? live : [...shadeOption.values];
}

function reviewCard(r, showShade, max = 5) {
  const attrs = (r.attrs || [])
    .map((a) => `<span class="rv-card__attr">${esc(a.name)} <b>${a.score}</b></span>`).join('');
  // 譯文行先、原文收喺 details 入面 —— 讀得明係頭等大事，
  // 但要查證嘅人一撳就見到原文，唔使離開個頁。
  return `<article class="rv-card">
    <header class="rv-card__head">
      ${stars(r.star, max)}
      <span class="rv-card__who">${esc(r.who)}</span>
      <time class="rv-card__date">${esc(r.date)}</time>
    </header>
    ${showShade && r.shade ? `<span class="rv-card__shade">${esc(r.shade)}</span>` : ''}
    <p class="rv-card__text">${esc(r.zh || r.text).replace(/\n+/g, '<br>')}</p>
    ${attrs ? `<div class="rv-card__attrs">${attrs}</div>` : ''}
    ${r.zh ? `<details class="rv-card__src">
      <summary>原文（${esc(r.lang || '')}）</summary>
      <p>${esc(r.text).replace(/\n+/g, '<br>')}</p>
    </details>` : ''}
  </article>`;
}

/* 標題下面嗰行分數。人未捲落去之前就見到 —— 呢個係大部分人喺產品頁
   上面唯一會搵嘅一樣嘢。有評價原文先撳得，冇就淨係顯示唔畀撳。 */
function ratingLine(star, count, jumpTo, r = null) {
  const el = document.querySelector('[data-rating-jump]');
  if (!el) return;
  const max = ratingMax(r);
  el.hidden = false;
  el.innerHTML = `${stars(star, max)}
    <b class="product-info__rating-num">${ratingNum(star, max)}</b>
    <span class="product-info__rating-n">${esc(ratingSrc(r).name)} ${count.toLocaleString()} 則評價</span>`;
  if (!jumpTo) {
    el.removeAttribute('href');
    el.classList.add('is-static');
    return;
  }
  el.addEventListener('click', (e) => {
    e.preventDefault();
    jumpTo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function initReviews(handle, product) {
  const host = document.querySelector('[data-reviews]');
  if (!handle) return;

  const d = await loadReviews(handle);
  if (!d || !d.count) {
    // 得分數冇評價原文 —— 出返標題下面嗰行就算，唔好開個空嘅評價區。
    const r = (await loadRatings())[handle];
    if (r) ratingLine(r.star, r.count, null, r);
    return;
  }
  if (!host) return;

  const shades = sellableShades(product);
  const shown = shades
    ? d.reviews.filter((r) => !r.shade || shades.some((v) => sameShade(v, r.shade)))
    : d.reviews;

  const idx = (await loadRatings())[handle] || {};
  const src = { src: d.src || idx.src, srcName: d.source, max: d.max || idx.max };
  const top = ratingMax(src);
  ratingLine(d.star, d.count, host, src);

  const dist = d.dist || [];
  const max = Math.max(0, ...dist.map((x) => x.count));
  const regions = Object.entries(d.byRegion || {})
    .map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' · ');

  host.hidden = false;
  host.innerHTML = `
    <div class="rv-head">
      <div>
        <span class="label">評價</span>
        <h2 class="heading-lg">${d.count.toLocaleString()} 位顧客評過</h2>
      </div>
      <span class="rv-head__src">評分來自 ${esc(d.source)}</span>
    </div>

    <div class="rv-summary">
      <div class="rv-score">
        <span class="rv-score__num">${ratingNum(d.star, top)}</span>
        ${stars(d.star, top)}
        ${regions ? `<span class="rv-score__meta">${regions}</span>` : ''}
      </div>
      ${dist.length ? `<div class="rv-dist">${dist.map((x) => distBar(x, max)).join('')}</div>` : ''}
      <div class="rv-attrs">
        ${(d.attrs || []).map((a) => `<div class="rv-attr">
          <span class="rv-attr__name">${esc(a.name)}</span>
          <span class="rv-attr__track"><span class="rv-attr__bar"
            style="width:${(a.avg / 5) * 100}%"></span></span>
          <span class="rv-attr__num">${a.avg}</span>
        </div>`).join('')}
      </div>
    </div>

    ${shown.length ? `<p class="rv-note">${esc(d.note || '')}</p>
    <div class="rv-list">${shown.map((r) => reviewCard(r, !!shades, top)).join('')}</div>` : ''}`;
}
