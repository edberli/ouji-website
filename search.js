/* 頁頂嗰粒放大鏡。
 *
 * 每一版嘅 header 都有粒「搜尋」掣，但一直冇接過任何嘢 —— 撳落去乜都
 * 唔會發生。呢個檔就係補返佢。
 *
 * 做法：唔另開一版搜尋頁，開一塊蓋喺上面嘅浮層，一路打一路出結果。
 * 客好多時係認住個牌子入嚟（「我要買 TIRTIR」），要即刻見到貨，
 * 唔應該再跳多一版。
 *
 * 資料行 getAllProducts()（同目錄頁同一份 sessionStorage 快取，所以
 * 第一次之後係即時嘅）。攞唔到資料就退返去 shop.html?q=，唔會死。
 */
(function () {
  const MAX = 8;
  let cache = null;      // 全目錄，第一次開先攞
  let root = null;       // 浮層本身，第一次開先砌
  let cursor = -1;       // 鍵盤揀緊第幾個
  let vendors = null;    // 品牌清單（跟 cache 一齊建／清）
  const wordCache = new Map(); // 產品標題嘅字詞 runs（fuzzy 用）

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  /* 大細楷、空格、標點一律唔計，中日韓字照留。
     `&` 當成 a —— 目錄入面有 `rom&nd`，客實係打「romand」。
     用白名單剔標點試過走漏 `ma:nyo` 同 `Dr.Jart+`（個冒號同加號冇剔到），
     所以改成「唔係字母數字就剔」。 */
  const flat = (s) => String(s || '').toLowerCase()
    .replace(/&/g, 'a')
    .replace(/[^\p{L}\p{N}]/gu, '');

  /* 香港客會中英韓文混住打。只做明確同義詞，唔用模糊 AI 猜，避免
     「眼」一個字就撈晒眼影、眼霜、隱形眼鏡。 */
  const SYNONYM_GROUPS = [
    ['魚腥草', 'heartleaf', '어성초'],
    ['積雪草', 'cica', 'centella', '병풀'],
    ['氣墊', 'cushion'],
    ['唇釉', 'tint', 'liptint'],
    ['定妝噴霧', 'fixer', 'settingspray'],
    ['防曬', 'sunscreen', 'sunblock', 'spf'],
    ['桃瑞丹', 'torriden'],
    ['romand', 'romnd', 'rom&nd'],
  ].map((group) => [...new Set(group.map(flat))]);

  function queryForms(term) {
    const q = flat(term);
    const group = SYNONYM_GROUPS.find((forms) => forms.includes(q));
    return group ? [q, ...group.filter((form) => form !== q)] : [q];
  }

  /* ===== 打錯字都搵到（fuzzy） =====
     淨係喺「冇任何直接結果」先至行呢層；正常搜尋唔會畀佢污染。
     用編輯距離（容許相鄰字調位）；短字唔准差太遠，免得亂 suggest。 */
  const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u3040-\u30ff]/;
  function tolOf(q) { const L = q.length; return L <= 3 ? 0 : L <= 5 ? 1 : 2; }
  function tolCJK(q) { return q.length >= 6 ? 2 : 1; }

  function editd(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const m = a.length, n = b.length;
    let prev2 = null, prev = [], cur = [];
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur = [i];
      let rowMin = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[n];
  }

  /* 拆 runs：拉丁字一截、連續中日韓字一截。 */
  function runsOf(s) {
    const out = [];
    let buf = '', kind = 0;
    for (const ch of s) {
      const k = CJK_RE.test(ch) ? 2 : /[0-9a-z]/.test(ch) ? 1 : 0;
      if (!k) { if (buf) out.push(buf); buf = ''; kind = 0; continue; }
      if (k !== kind && buf) { out.push(buf); buf = ''; }
      kind = k; buf += ch;
    }
    if (buf) out.push(buf);
    return out;
  }

  function wordRuns(p) {
    if (!wordCache.has(p)) wordCache.set(p, runsOf(flat(p.title || '')));
    return wordCache.get(p);
  }

  function runBest(runs, q, max, cjk) {
    let best = max + 1;
    for (const run of runs) {
      if (best === 0) break;
      if (cjk) {
        for (let wl = Math.max(1, q.length - max); wl <= q.length + max && wl <= run.length; wl++) {
          if (best === 0) break;
          for (let s = 0; s + wl <= run.length; s++) {
            if (best === 0) break;
            const d = editd(q, run.slice(s, s + wl), Math.min(best - 1, max));
            if (d < best) best = d;
          }
        }
      } else {
        if (Math.abs(run.length - q.length) > max) continue;
        const d = editd(q, run, Math.min(best - 1, max));
        if (d < best) best = d;
      }
    }
    return best;
  }

  function fuzzyMatches(term) {
    const q = flat(term);
    if (!cache || !q) return { brand: null, products: [] };
    const cjk = CJK_RE.test(q), latin = /[a-z0-9]/.test(q);
    if (cjk && latin) return { brand: null, products: [] };   // 中英混合唔做 fuzzy
    if (cjk && q.length < 2) return { brand: null, products: [] };
    const max = cjk ? tolCJK(q) : tolOf(q);
    if (!max) return { brand: null, products: [] };
    if (!vendors) vendors = [...new Set(cache.map((p) => p.vendor).filter(Boolean))];

    let brand = null, bd = max + 1, blen = 1e9;
    for (const v of vendors) {
      const d = runBest(runsOf(flat(v)), q, max, cjk);
      if (d <= max) {
        const ld = Math.abs(flat(v).length - q.length);
        if (d < bd || (d === bd && (ld < blen || (ld === blen && brand && v.localeCompare(brand) < 0)))) {
          brand = v; bd = d; blen = ld;
        }
      }
    }

    const out = [];
    for (const p of cache) {
      if (typeof soldOut === 'function' && soldOut(p)) continue;
      const dv = runBest([flat(p.vendor || '')], q, max, cjk);
      let rank = 0;
      if (dv <= max) rank = 10 + dv;
      else {
        const dt = runBest(wordRuns(p), q, max, cjk);
        if (dt <= max) rank = 30 + dt;
      }
      if (rank) out.push({ p, rank });
    }
    out.sort((a, b) => a.rank - b.rank || a.p.title.length - b.p.title.length);
    return { brand, products: out.map((x) => x.p) };
  }

  function score(p, q) {
    const t = flat(p.title), v = flat(p.vendor);
    if (v.startsWith(q)) return 0;          // 牌子頭幾個字 —— 最想要嘅
    if (t.startsWith(q)) return 1;
    if (v.includes(q)) return 2;
    if (t.includes(q)) return 3;
    return -1;
  }

  function find(term) {
    const queries = queryForms(term);
    if (!queries[0] || !cache) return [];
    return cache
      .filter((p) => !(typeof soldOut === 'function' && soldOut(p)))
      .map((p) => ({ p, s: Math.min(...queries.map((q) => {
        const hit = score(p, q);
        return hit < 0 ? 99 : hit;
      })) }))
      .filter((x) => x.s < 99)
      .sort((a, b) => a.s - b.s
        || (typeof soldOut === 'function' ? soldOut(a.p) - soldOut(b.p) : 0)
        || a.p.title.length - b.p.title.length)
      .map((x) => x.p);
  }

  /* 打品牌名嗰陣，客其實想去品牌自己嗰版，唔係逐件貨睇。呢度搵返
     最貼嘅一個牌子：完全一樣（包括同義詞）行先；冇就前綴對，最少三隻字。
     搵到就喺產品上面加一行「直接去 <品牌> 品牌頁」。 */
  function brandHit(term) {
    if (!cache) return null;
    const forms = queryForms(term);
    if (!forms[0]) return null;
    if (!vendors) vendors = [...new Set(cache.map((p) => p.vendor).filter(Boolean))];
    const q = flat(term);
    let v = vendors.find((x) => forms.includes(flat(x)));
    if (!v && q.length >= 3) {
      v = vendors
        .filter((x) => flat(x).startsWith(q))
        .sort((a, b) => flat(a).length - flat(b).length || a.localeCompare(b))[0];
    }
    if (!v) return null;
    return { vendor: v, count: cache.filter((p) => p.vendor === v).length };
  }

  function brandRow(b) {
    return `<a class="site-search__hit site-search__hit--brand" href="/shop?brand=${encodeURIComponent(b.vendor)}">
      <span class="site-search__thumb site-search__thumb--brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></svg>
      </span>
      <span class="site-search__text">
        <span class="site-search__brand">品牌</span>
        <span class="site-search__name">直接去 ${esc(b.vendor)} 品牌頁</span>
      </span>
      <span class="site-search__price">${b.count} 件</span>
    </a>`;
  }

  function row(p, i) {
    const img = p.images?.edges?.[0]?.node?.url;
    const amt = p.priceRange?.minVariantPrice?.amount;
    const out = typeof soldOut === 'function' && soldOut(p);
    return `<a class="site-search__hit" href="/products/${esc(p.handle)}" data-i="${i}">
      <span class="site-search__thumb">${img
        ? `<img src="${esc(img)}&width=120" alt="" loading="lazy">` : ''}</span>
      <span class="site-search__text">
        <span class="site-search__brand">${esc(p.vendor || '')}</span>
        <span class="site-search__name">${esc(p.title)}</span>
      </span>
      <span class="site-search__price">${out ? '售完'
        : (amt ? 'HK$' + Math.round(parseFloat(amt)) : '')}</span>
    </a>`;
  }

  function draw(term) {
    const box = root.querySelector('[data-search-results]');
    let hits = find(term);
    cursor = -1;
    let b = brandHit(term);
    let note = '';
    if (!hits.length && !b) {
      // 打錯字都搵到：冇直接結果先出「相近」建議。
      const fz = fuzzyMatches(term);
      if (fz.brand || fz.products.length) {
        hits = fz.products;
        b = fz.brand ? { vendor: fz.brand, count: cache.filter((p) => p.vendor === fz.brand).length } : null;
        note = `<p class="site-search__hint site-search__hint--slim">搵唔到「${esc(term)}」——你係咪想搵：</p>`;
      }
    }
    const brandHTML = b ? brandRow(b) : '';
    if (!term.trim()) {
      box.innerHTML = '<p class="site-search__hint">打產品名或者品牌，例如「防曬」、「TIRTIR」</p>';
      return;
    }
    if (!hits.length && !brandHTML) {
      // 搵唔到唔好淨係得一句「冇結果」—— 畀條路行落去。
      box.innerHTML = `<p class="site-search__hint">搵唔到「${esc(term)}」。
        <a href="shop.html">睇全部產品</a></p>`;
      return;
    }
    box.innerHTML = note + brandHTML + hits.slice(0, MAX).map(row).join('')
      + (hits.length > MAX
        ? `<a class="site-search__more" href="shop.html?q=${encodeURIComponent(term)}">睇埋其餘 ${hits.length - MAX} 件</a>`
        : '');
  }

  function move(step) {
    const items = [...root.querySelectorAll('.site-search__hit, .site-search__more')];
    if (!items.length) return;
    cursor = (cursor + step + items.length + 1) % (items.length + 1) - 1;
    items.forEach((el, i) => el.classList.toggle('is-on', i === cursor));
    if (cursor >= 0) items[cursor].scrollIntoView({ block: 'nearest' });
  }

  function build() {
    root = document.createElement('div');
    root.className = 'site-search';
    root.hidden = true;
    root.innerHTML = `
      <div class="site-search__backdrop" data-search-close></div>
      <div class="site-search__panel" role="dialog" aria-modal="true" aria-label="搜尋產品">
        <div class="site-search__bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="search" autocomplete="off" placeholder="搵產品、品牌" aria-label="搜尋產品">
          <button type="button" class="site-search__x" data-search-close aria-label="關閉">✕</button>
        </div>
        <div class="site-search__results" data-search-results></div>
      </div>`;
    document.body.appendChild(root);

    const input = root.querySelector('input');
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => draw(input.value), 90);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        const on = root.querySelector('.is-on');
        if (on) { e.preventDefault(); location.href = on.href; }
        else if (input.value.trim()) {
          e.preventDefault();
          location.href = 'shop.html?q=' + encodeURIComponent(input.value.trim());
        }
      }
    });
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-search-close]')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !root.hidden) close();
    });
  }

  async function open() {
    if (!root) build();
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    const input = root.querySelector('input');
    input.focus();
    if (!cache) {
      draw('');
      try {
        const all = await getAllProducts();
        cache = all?.edges?.map((e) => e.node) || [];
      } catch (err) {
        cache = [];
      }
      vendors = null;
      wordCache.clear();
      if (input.value) draw(input.value);
    }
  }

  function close() {
    root.hidden = true;
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.header__action-btn[aria-label="搜尋"]');
    if (!btn) return;
    e.preventDefault();
    // 攞唔到目錄（例如 shopify.js 未載）就退返去 shop 頁，好過乜都唔發生
    if (typeof getAllProducts !== 'function') { location.href = 'shop.html'; return; }
    open();
  });
})();
