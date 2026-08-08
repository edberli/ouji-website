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
  return `<span class="card-rating">${stars(r.star)}
    <b>${r.star}</b><span>(${r.count.toLocaleString()})</span></span>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 實心／空心星，半星唔用圖 —— 用一條裁剪嘅實心星疊上去。 */
function stars(value) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (cls) => `<span class="stars__row stars__row--${cls}">★★★★★</span>`;
  return `<span class="stars" role="img" aria-label="5 星中 ${value} 星">
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
 *  單一規格嘅產品，OY 嗰個欄位其實係成個產品名。 */
function sellableShades(product) {
  const opt = (product?.options || []).find((o) => (o.values || []).length > 1);
  if (!opt) return null;
  const live = (product?.variants?.edges || [])
    .filter((e) => e.node.availableForSale)
    .map((e) => e.node.title);
  return live.length ? live : opt.values;
}

function reviewCard(r, showShade) {
  const attrs = (r.attrs || [])
    .map((a) => `<span class="rv-card__attr">${esc(a.name)} <b>${a.score}</b></span>`).join('');
  // 譯文行先、原文收喺 details 入面 —— 讀得明係頭等大事，
  // 但要查證嘅人一撳就見到原文，唔使離開個頁。
  return `<article class="rv-card">
    <header class="rv-card__head">
      ${stars(r.star)}
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
function ratingLine(star, count, jumpTo) {
  const el = document.querySelector('[data-rating-jump]');
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `${stars(star)}
    <b class="product-info__rating-num">${star}</b>
    <span class="product-info__rating-n">${count.toLocaleString()} 則評價</span>`;
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
    if (r) ratingLine(r.star, r.count, null);
    return;
  }
  if (!host) return;

  const shades = sellableShades(product);
  const shown = shades
    ? d.reviews.filter((r) => !r.shade || shades.some((v) => sameShade(v, r.shade)))
    : d.reviews;

  ratingLine(d.star, d.count, host);

  const max = Math.max(...d.dist.map((x) => x.count));
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
        <span class="rv-score__num">${d.star}</span>
        ${stars(d.star)}
        ${regions ? `<span class="rv-score__meta">${regions}</span>` : ''}
      </div>
      <div class="rv-dist">${d.dist.map((x) => distBar(x, max)).join('')}</div>
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
    <div class="rv-list">${shown.map((r) => reviewCard(r, !!shades)).join('')}</div>` : ''}`;
}
