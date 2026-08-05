/**
 * The look matcher.
 *
 * Four questions, then a full face rather than a list of products. The
 * ranking is a plain scoring function, not a model: a shopper who says
 * "sensitive skin" needs that honoured every time, and a scorer that is
 * nearly right is wrong. So exclusions are hard rules, preferences are
 * weights, and nothing is generated.
 *
 * Slots are filled one product each, best first, with the rest of that
 * slot kept as alternates so a face can be swapped part by part.
 */
const SLOTS = [
  { key: 'base', label: '底妝', types: ['氣墊粉底', '底妝', '彩妝'] },
  { key: 'conceal', label: '遮瑕', types: ['遮瑕'], optional: true },
  { key: 'eye', label: '眼影', types: ['眼影'] },
  { key: 'liner', label: '眼線 · 睫毛', types: ['眼線', '眼線筆', '睫毛膏'], optional: true },
  { key: 'brow', label: '眉', types: ['眉筆'], optional: true },
  { key: 'cheek', label: '胭脂 · 修容', types: ['胭脂', '修容', '高光', '多用彩妝'] },
  { key: 'lip', label: '唇', types: ['唇釉', '唇膏', '唇彩', '唇蜜', '潤唇膏', '唇線筆'] },
];

const QUESTIONS = [
  {
    key: 'look', title: '想要邊種妝感？', hint: '揀一個',
    options: [],                       // filled from the data file
  },
  {
    key: 'skin', title: '你嘅膚質？', hint: '可以多揀',
    multi: true,
    options: [
      { id: 'dry', label: '乾性', desc: '容易繃緊、起皮' },
      { id: 'oily', label: '油性', desc: '中午就出油' },
      { id: 'combo', label: '混合性', desc: 'T 字油、兩頰乾' },
      { id: 'sensitive', label: '敏感', desc: '易泛紅、刺痛' },
    ],
  },
  {
    key: 'coverage', title: '想要幾自然？', hint: '揀一個',
    options: [
      { id: '1', label: '素顏感', desc: '薄到似冇化妝' },
      { id: '2', label: '日常妝', desc: '遮到瑕疵，仲似皮膚' },
      { id: '3', label: '完整妝容', desc: '遮好晒，夠上鏡' },
    ],
  },
  {
    key: 'wear', title: '要頂幾耐？', hint: '揀一個',
    options: [
      { id: '1', label: '幾個鐘', desc: '出街食飯、短時間' },
      { id: '2', label: '成個工作日', desc: '八至十個鐘' },
      { id: '3', label: '一日到黑', desc: '仲要防水防汗' },
    ],
  },
];

let DATA = null;
const answers = { look: null, skin: new Set(), coverage: null, wear: null };
let step = 0;
const swapped = {};        // slot -> index into its ranked list

/* ---------------------------------------------------------------- score */

/** Hard exclusions. Nothing here is a preference; each is a "never". */
function excluded(p) {
  if (!p.inStock) return true;
  // "Sensitive" is the one answer we refuse to approximate: unless the
  // brand states the formula is gentle, the product is not offered.
  if (answers.skin.has('sensitive') && p.gentle !== true) return true;
  return false;
}

function score(p) {
  let s = 0;
  if (answers.look && p.looks.includes(answers.look)) s += 40;

  // Skin fit — a match on any selected skin type counts once.
  const skins = [...answers.skin].filter((k) => k !== 'sensitive');
  if (skins.length) {
    s += skins.some((k) => p.skin.includes(k)) ? 22 : -14;
  }

  if (answers.coverage && p.coverage != null) {
    s += 16 - Math.abs(p.coverage - Number(answers.coverage)) * 12;
  }
  if (answers.wear) {
    const want = Number(answers.wear);
    // Longer-wearing than asked is fine; shorter is the failure.
    s += p.longevity >= want ? 14 : -10 * (want - p.longevity);
  }

  // Small nudges, only ever tie-breakers.
  if (typeof awardsFor === 'function' && awardsFor(p.handle).length) s += 6;
  if (answers.skin.has('sensitive') && p.vegan) s += 3;
  if (p.image) s += 2;
  return s;
}

function buildFace() {
  const pool = DATA.products.filter((p) => !excluded(p));
  return SLOTS.map((slot) => {
    const ranked = pool
      .filter((p) => slot.types.includes(p.type))
      .map((p) => ({ p, s: score(p) }))
      .sort((a, b) => b.s - a.s);
    return { slot, ranked };
  }).filter((r) => r.ranked.length);
}

/* ---------------------------------------------------------------- why */

function reasons(p) {
  const out = [];
  if (answers.look && p.looks.includes(answers.look)) {
    out.push(DATA.looks[answers.look].label);
  }
  const skins = [...answers.skin].filter((k) => k !== 'sensitive');
  const named = { dry: '乾性', oily: '油性', combo: '混合性' };
  const hit = skins.filter((k) => p.skin.includes(k)).map((k) => named[k]);
  if (hit.length) out.push(`${hit.join('、')}肌啱用`);
  if (p.finish && p.finish !== 'unknown') out.push(`${p.finish}質地`);
  if (answers.wear && p.longevity >= Number(answers.wear)) {
    out.push(['', '日常持妝', '全日持妝', '防水持妝'][p.longevity]);
  }
  if (p.gentle) out.push('品牌標明溫和');
  if (typeof awardsFor === 'function') {
    const a = typeof topAward === 'function' && topAward(p.handle);
    if (a) out.push(awardLabel(a));
  }
  return out.slice(0, 4);
}

/* ---------------------------------------------------------------- view */

const el = (sel) => document.querySelector(sel);

function renderQuestion() {
  const q = QUESTIONS[step];
  const chosen = q.multi ? answers[q.key] : new Set([answers[q.key]]);
  el('[data-match-quiz]').innerHTML = `
    <div class="match-progress">
      ${QUESTIONS.map((_, i) => `<span class="${i <= step ? 'is-done' : ''}"></span>`).join('')}
    </div>
    <p class="match-step">第 ${step + 1} 步 / ${QUESTIONS.length}</p>
    <h2 class="match-q">${q.title}</h2>
    <p class="match-hint">${q.hint}</p>
    <div class="match-options match-options--${q.key}">
      ${q.options.map((o) => `
        <button class="match-option${chosen.has(o.id) ? ' is-on' : ''}" data-pick="${o.id}">
          <span class="match-option__label">${o.label}</span>
          ${o.desc ? `<span class="match-option__desc">${o.desc}</span>` : ''}
        </button>`).join('')}
    </div>
    <div class="match-nav">
      ${step ? '<button class="btn btn--ghost btn--sm" data-back>返回</button>' : '<span></span>'}
      <button class="btn btn--primary btn--sm" data-next
        ${(q.multi ? answers[q.key].size : answers[q.key]) ? '' : 'disabled'}>
        ${step === QUESTIONS.length - 1 ? '睇推薦' : '下一步'}
      </button>
    </div>`;
}

function card(p, slotKey, ranked, idx) {
  return `
    <article class="face-item">
      <a class="face-item__media" href="/products/${p.handle}">
        ${p.image ? `<img src="${p.image}" alt="${p.title}" loading="lazy">` : ''}
      </a>
      <div class="face-item__body">
        <span class="face-item__slot">${SLOTS.find((s) => s.key === slotKey).label}</span>
        <a class="face-item__title" href="/products/${p.handle}">${p.title}</a>
        <span class="face-item__brand">${p.vendor}</span>
        <ul class="face-item__why">${reasons(p).map((r) => `<li>${r}</li>`).join('')}</ul>
        <div class="face-item__foot">
          <span class="face-item__price">${formatPrice(p.price)}</span>
          ${ranked > 1 ? `<button class="face-item__swap" data-swap="${slotKey}">
            換一件 <span>${idx + 1}/${ranked}</span></button>` : ''}
        </div>
      </div>
    </article>`;
}

function renderFace() {
  const face = buildFace();
  const picked = face.map(({ slot, ranked }) => {
    const i = (swapped[slot.key] || 0) % ranked.length;
    return { slot, p: ranked[i].p, n: ranked.length, i };
  });
  const total = picked.reduce((n, x) => n + x.p.price, 0);

  el('[data-match-quiz]').innerHTML = '';
  el('[data-match-result]').innerHTML = `
    <header class="face-head">
      <span class="face-head__eyebrow">為你配好嘅一套</span>
      <h2 class="face-head__title">${DATA.looks[answers.look].label}</h2>
      <p class="face-head__desc">${DATA.looks[answers.look].desc}</p>
      <div class="face-head__tags">
        ${[...answers.skin].map((k) => `<span>${
          { dry: '乾性肌', oily: '油性肌', combo: '混合肌', sensitive: '敏感肌' }[k]
        }</span>`).join('')}
        <span>${QUESTIONS[2].options.find((o) => o.id === answers.coverage).label}</span>
        <span>${QUESTIONS[3].options.find((o) => o.id === answers.wear).label}</span>
      </div>
    </header>

    <div class="face-list">
      ${picked.map(({ slot, p, n, i }) => card(p, slot.key, n, i)).join('')}
    </div>

    <div class="face-total">
      <div>
        <span class="face-total__label">${picked.length} 件 · 合共</span>
        <span class="face-total__price">${formatPrice(total)}</span>
      </div>
      <div class="face-total__actions">
        <button class="btn btn--ghost btn--sm" data-restart>重新配對</button>
        <button class="btn btn--primary" data-add-all>全部加入購物袋</button>
      </div>
    </div>

    ${answers.skin.has('sensitive') ? `<p class="face-note">
      你揀咗敏感肌，所以只顯示品牌自己標明溫和配方嘅產品。未標明嘅一律唔推薦
      —— 上妝前建議喺耳後試一試。</p>` : ''}
    <p class="face-note">配對根據產品質地、持妝度同遮瑕度計算，唔係醫學建議。
      如果皮膚有狀況，請先問過醫生。</p>`;
}

/* --------------------------------------------------------------- wiring */

async function initMatch() {
  DATA = await fetch('match-data.json').then((r) => r.json());
  QUESTIONS[0].options = Object.entries(DATA.looks)
    .map(([id, v]) => ({ id, label: v.label, desc: v.desc }));

  document.addEventListener('click', async (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const q = QUESTIONS[step];
      const id = pick.dataset.pick;
      if (q.multi) {
        answers[q.key].has(id) ? answers[q.key].delete(id) : answers[q.key].add(id);
      } else {
        answers[q.key] = id;
      }
      return renderQuestion();
    }
    if (e.target.closest('[data-back]')) { step--; return renderQuestion(); }
    if (e.target.closest('[data-next]')) {
      step++;
      return step < QUESTIONS.length ? renderQuestion() : renderFace();
    }
    const swap = e.target.closest('[data-swap]');
    if (swap) {
      const k = swap.dataset.swap;
      swapped[k] = (swapped[k] || 0) + 1;
      return renderFace();
    }
    if (e.target.closest('[data-restart]')) {
      step = 0; answers.look = null; answers.skin.clear();
      answers.coverage = null; answers.wear = null;
      Object.keys(swapped).forEach((k) => delete swapped[k]);
      el('[data-match-result]').innerHTML = '';
      return renderQuestion();
    }
    const addAll = e.target.closest('[data-add-all]');
    if (addAll) {
      addAll.disabled = true;
      addAll.textContent = '加緊…';
      const face = buildFace().map(({ slot, ranked }) =>
        ranked[(swapped[slot.key] || 0) % ranked.length].p);
      let ok = 0;
      for (const p of face) {
        try {
          const full = await getProduct(p.handle);
          const v = full?.variants?.edges?.find((x) => x.node.availableForSale);
          if (v) { await addToCart(v.node.id, 1); ok++; }
        } catch (err) { /* one failure should not stop the rest */ }
      }
      addAll.disabled = false;
      addAll.textContent = `已加入 ${ok} 件`;
      if (typeof updateCartCount === 'function') updateCartCount();
    }
  });

  renderQuestion();
}
