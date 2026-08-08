/**
 * Olive Young 評價.
 *
 * OUJI is new, so it has no reviews of its own — and inventing them was
 * never on the table. What it can do is show what Olive Young's shoppers
 * said about the same product, quoted and credited, next to a link to
 * the page it came from. A shopper can check every word.
 *
 * Two rules the renderer enforces rather than trusts the data for:
 *
 *   1. **The bad reviews stay.** A block that is all five stars is the
 *      thing people have learned to discount. The 3★ oxidation complaint
 *      is the most useful paragraph on the page for somebody deciding
 *      between two shades.
 *   2. **Never presented as ours.** Every unit carries the source, the
 *      reviewer's masked handle and the date, and the header says plainly
 *      that these came from Olive Young.
 */
const REVIEWS_URL = 'data/reviews.json';

let REVIEWS_CACHE = null;

async function loadReviews() {
  if (REVIEWS_CACHE) return REVIEWS_CACHE;
  REVIEWS_CACHE = await fetch(REVIEWS_URL)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return REVIEWS_CACHE;
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

function reviewCard(r) {
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
    ${r.shade ? `<span class="rv-card__shade">${esc(r.shade)}</span>` : ''}
    <p class="rv-card__text">${esc(r.zh || r.text).replace(/\n+/g, '<br>')}</p>
    ${attrs ? `<div class="rv-card__attrs">${attrs}</div>` : ''}
    ${r.zh ? `<details class="rv-card__src">
      <summary>原文（${esc(r.lang || '')}）</summary>
      <p>${esc(r.text).replace(/\n+/g, '<br>')}</p>
    </details>` : ''}
  </article>`;
}

async function initReviews(handle) {
  const host = document.querySelector('[data-reviews]');
  if (!host || !handle) return;
  const d = (await loadReviews())[handle];
  if (!d || !d.count) return;

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
      <a class="rv-head__src" href="${esc(d.sourceUrl)}" target="_blank" rel="noopener">
        ${esc(d.source)}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
             aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
      </a>
    </div>

    <div class="rv-summary">
      <div class="rv-score">
        <span class="rv-score__num">${d.star}</span>
        ${stars(d.star)}
        <span class="rv-score__meta">${regions}</span>
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

    <p class="rv-note">${esc(d.note || '')}</p>
    <div class="rv-list">${d.reviews.map(reviewCard).join('')}</div>`;
}
