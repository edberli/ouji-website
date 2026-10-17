/* 產品頁「重點」卡（2026-10-17 由「啱唔啱你」改；Winston：「產品頁唔係淨係得最普通嗰啲功能……要諗多一步，提供多啲資訊、創造價值」）。
 *
 * 每件貨同一張卡、同一個次序（類型 → 品牌國家 → 膚質 → 質地 → 主打成分 → 點樣用 → 要留意 → 顧客點睇）；
 * 唔另外作資料，全部用網站本身已有、已審過嘅來源，冇料嗰行唔出：
 *   · data/attrs.json —— 護膚配對（skincare-match.js）用緊嘅標籤：啱邊類膚質、針對咩問題、質地、清爽／滋潤、
 *     刺激度、新手程度、護膚第幾步、早／夜、一句重點（hook）。只有護膚品有（約 500 件）。
 *   · ingredients.json（ingredients.js 嘅 ing()）—— 主打成分同酒精／香料／精油。跟 activeChips 一樣：
 *     模型推斷（actives_src: 'model'）嘅主打成分唔用；冇官方成分表（inci: false）就唔講成分留意。
 *   · 產品描述入面品牌寫嘅「用法」一段。
 *   · 評價：來源網站嘅屬性平均分（質地／持久度…），同 data/review-highlights.json 嘅 AI 評價重點
 *     （只根據頁面引用嗰幾則評價整理，每點註明幾多則講到）。
 *
 * 「要留意」係按成分出嘅一般用法提示（例如酸類由一星期 2–3 晚開始、日間防曬），寫法跟 ingredients.js：
 * 「建議」「常見做法」，唔講「醫好」，唔講濃度。 */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* 英文版（Winston：講 live 之前先做）：介面字用 oujiCopy；attrs.json 標籤得中文，下面自己對英文 */
  const cp = (zh, en) => (typeof oujiCopy === 'function' ? oujiCopy(zh, en) : zh);
  const isEN = () => cp('zh', 'en') === 'en';
  const EN = {
    skin: { dry: 'Dry', oily: 'Oily', combo: 'Combination', normal: 'Normal', sensitive: 'Sensitive' },
    concern: { dry: 'Dryness & tightness', sensitive: 'Redness & sensitivity', barrier: 'Weak barrier', acne: 'Breakouts', pore: 'Large pores', dull: 'Dullness', spot: 'Marks & spots', wrinkle: 'Fine lines & firmness', oil: 'Oiliness', blackhead: 'Blackheads', texture: 'Rough texture', darkcircle: 'Dark circles', puffy: 'Puffiness' },
    tex: { watery: 'Watery', essence: 'Essence', milky: 'Milky', creamy: 'Creamy', gel: 'Gel', oil: 'Oil', foam: 'Foam', balm: 'Balm', sheet: 'Sheet mask', pad: 'Pad', mist: 'Mist' },
    beg: { 1: 'Beginner-friendly', 2: 'For experienced users', 3: 'Advanced' },
  };

  let ATTRS = null; let attrsP = null;
  let HL = null; let hlP = null;
  const loadAttrs = () => {
    if (ATTRS) return Promise.resolve(ATTRS);
    if (!attrsP) attrsP = fetch('/data/attrs.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => (ATTRS = d || {}));
    return attrsP;
  };
  const loadHighlights = () => {
    if (HL) return Promise.resolve(HL);
    if (!hlP) hlP = fetch('/data/review-highlights.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => (HL = d || {}));
    return hlP;
  };

  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    dot: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.5 10.2 12.6 4.5 10.8 10.2 9Z"/><path d="M18.5 3.5v3M17 5h3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
  };

  /* 護膚步驟：五格主線，其他步驟歸入最近嗰格（棉片當爽膚水、局部／眼霜當精華、乳液當面霜）；面膜／其他唔出主線。 */
  const TRACK = () => [cp('潔面', 'Cleanse'), cp('爽膚水', 'Toner'), cp('精華', 'Serum'), cp('面霜', 'Cream'), cp('防曬', 'Sunscreen')];
  const STEP_POS = { cleanse: 0, pad: 1, toner: 1, serum: 2, spot: 2, eye: 2, emulsion: 3, cream: 3, sun: 4 };
  const SKINS = ['dry', 'oily', 'combo', 'normal', 'sensitive'];

  /** 描述入面品牌寫嘅「用法」：<h3>用法</h3><p>…</p> 或者 <p><strong>用法</strong><br>…</p>。 */
  function usageFrom(descHtml) {
    if (!descHtml) return '';
    const doc = new DOMParser().parseFromString(descHtml, 'text/html');
    const tidy = (t) => {
      const s = String(t || '').replace(/\s+/g, ' ').replace(/^[：:\s]+/, '').trim();
      return s.length > 150 ? s.slice(0, 150).replace(/[，、；。,;.\s]*[^，、；。,;.]*$/, '') + '…' : s;
    };
    for (const h of doc.querySelectorAll('h2, h3, h4')) {
      if (!/^\s*(用法|使用方法|how to use|directions|usage)\s*[:：]?\s*$/i.test(h.textContent)) continue;
      let t = ''; let el = h.nextElementSibling;
      while (el && !/^H[2-4]$/.test(el.tagName) && t.length < 150) { t += ' ' + el.textContent; el = el.nextElementSibling; }
      return tidy(t);
    }
    for (const s of doc.querySelectorAll('strong, b')) {
      if (!/^\s*(用法|使用方法|how to use|directions|usage)\s*[:：]?\s*$/i.test(s.textContent)) continue;
      const box = s.closest('p, li, div');
      if (box) return tidy(box.textContent.replace(s.textContent, ''));
    }
    return '';
  }

  /** 主打成分同成分留意：跟 activeChips／flagChips 同一把尺（模型推斷嘅主打成分唔用；冇官方成分表唔講留意）。 */
  function activesOf(handle) {
    const r = typeof ing === 'function' ? ing(handle) : null;
    return {
      actives: r && r.actives_src !== 'model' ? (r.actives || []) : [],
      flags: r && r.inci ? (r.flags || []) : [],
    };
  }

  /** 沖走型（潔面、卸妝、沐浴、洗頭）：酸類／A 醇嗰類「由一星期幾晚開始」嘅提示唔適用。 */
  const isWashOff = (product, a) => a?.step === 'cleanse'
    || /潔面|洗面|洗顏|卸妝|沐浴|洗頭|洗髮|cleans|wash/i.test(`${product?.productType || ''} ${product?.title || ''}`);

  /** 按成分同標籤出嘅一般用法提示。同一樣（例如防曬）只講一次。 */
  function careTips(product, a) {
    const handle = product.handle;
    const { actives: all, flags } = activesOf(handle);
    const actives = isWashOff(product, a) ? [] : all;
    const has = (x) => actives.includes(x);
    const tips = [];
    let sun = false;
    if (has('AHA/BHA')) {
      tips.push(cp('含酸類（AHA／BHA）：第一次用建議由一星期 2–3 晚開始，皮膚適應咗先慢慢加到隔晚用。', 'Contains AHA/BHA: start with 2–3 nights a week, then build up to every other night once your skin is used to it.'));
      tips.push(cp('唔好同 A 醇（視黃醇）產品同一晚疊埋用。', "Don't layer with retinol (vitamin A) products on the same night."));
      sun = true;
    }
    if (has('視黃醇')) {
      tips.push(cp('含 A 醇（視黃醇）：建議夜晚用，由一星期 2 晚開始；懷孕或哺乳期唔建議用。', 'Contains retinol: use at night, starting with 2 nights a week. Not recommended during pregnancy or breastfeeding.'));
      sun = true;
    }
    if (has('維他命C')) {
      tips.push(cp('含維他命 C：早晚都用得；同酸類產品可以分開早晚用，減少刺激。', 'Contains vitamin C: fine morning or night; use acids at the opposite time of day to reduce irritation.'));
      sun = true;
    }
    if (has('曲酸／傳明酸')) sun = true;
    if (sun) tips.push(cp('用緊期間，日間記得搽防曬。', 'While using it, wear sunscreen during the day.'));
    const scent = flags.filter((f) => f === '香料' || f === '精油');
    if (scent.length) tips.push(cp(`含${scent.join('同')}：敏感肌建議先喺耳後或下顎試用一兩日。`, `Contains ${scent.map((f) => (f === '香料' ? 'fragrance' : 'essential oils')).join(' and ')}: sensitive skin should patch-test behind the ear or along the jaw for a day or two.`));
    if (flags.includes('酒精')) tips.push(cp('含酒精：乾燥或敏感肌用之前留意。', 'Contains alcohol: take care if your skin is dry or sensitive.'));
    if (a) {
      if (a.irr === 3 && !has('AHA/BHA') && !has('視黃醇')) tips.push(cp('屬高活性產品：新手建議由隔晚開始。', 'Highly active: beginners should start every other night.'));
      if (a.preg_safe === false && !has('視黃醇')) tips.push(cp('懷孕或哺乳期請先問醫生或藥劑師。', 'If pregnant or breastfeeding, check with a doctor or pharmacist first.'));
      if (a.step === 'sun') tips.push(cp('早上護膚最後一步用；長時間喺戶外，每 2–3 個鐘補搽。', "Use as the last step of your morning routine; reapply every 2–3 hours if you're outdoors for long."));
    }
    return tips;
  }

  function scale(v, max, words) {
    const n = Math.max(0, Math.min(max, Number(v) || 0));
    if (!n) return '';
    const dots = Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'is-on' : ''}"></i>`).join('');
    return `<span class="pdp-guide__scale" role="img" aria-label="${esc(words[n - 1] || '')}">${dots}</span><span>${esc(words[n - 1] || '')}</span>`;
  }

  /** 品牌國家：描述入面「品牌國家：韓國品牌 Brand origin: Korea」（全店約九成有）。 */
  function originFrom(descHtml) {
    const t = String(descHtml || '').replace(/<[^>]+>/g, '\n');
    return {
      zh: (t.match(/品牌國家\s*[:：]\s*([^\s\n。，,(（]{1,8}?)品牌/) || [])[1] || '',
      en: ((t.match(/Brand origin\s*[:：]\s*([A-Za-z][A-Za-z .-]{1,30})/i) || [])[1] || '').trim(),
    };
  }

  /** 容量：標題有就用標題（例如 150ml），冇就搵描述「容量：」。 */
  function sizeFrom(product, descHtml) {
    const m = String(product.title || '').match(/(\d+(?:\.\d+)?\s?(?:ml|mL|ML|g|kg|片|枚|pcs))(?![A-Za-z])/);
    if (m) return m[1].replace(/\s+/g, '');
    const d = String(descHtml || '').replace(/<[^>]+>/g, '\n').match(/容量\s*[:：]\s*([^\n]{1,24})/);
    return d ? d[1].trim() : '';
  }

  /* 一行＝左標籤右內容。每件貨行嘅次序都一樣；冇料嗰行唔出，但張卡一定喺度（2026-10-17 Winston：唔同產品頁面唔統一，好割裂）。 */
  const row = (key, label, html) => `<div class="pdp-facts__row pdp-facts__row--${key}"><dt>${label}</dt><dd>${html}</dd></div>`;

  function rowsHTML({ product, a, labels, usage, tips, origin, size, hl, rev, rating }) {
    const out = [];
    const en = isEN();
    /* 1 類型（產品類別用自己一個 span，英文版由 ui-en.json 譯）＋容量 */
    if (product.productType || size) {
      out.push(row('type', cp('類型', 'Type'), `${product.productType ? `<span>${esc(product.productType)}</span>` : ''}${product.productType && size ? '<i class="pdp-facts__sep" aria-hidden="true">·</i>' : ''}${size ? `<span>${esc(size)}</span>` : ''}`));
    }
    /* 2 品牌國家 */
    const org = en ? (origin.en || '') : (origin.zh || '');
    if (org) out.push(row('origin', cp('品牌國家', 'Brand origin'), esc(org)));
    /* 3–4 適合膚質、針對（護膚標籤） */
    if (a) {
      const fit = a.fit || {};
      const skins = SKINS.filter((k) => fit[k] && fit[k] !== 'unknown');
      if (skins.length) {
        out.push(row('skin', cp('適合膚質', 'Skin types'), `<ul class="pdp-guide__skins">${skins.map((k) => {
          const st = fit[k];
          const word = en ? EN.skin[k] : (labels.skin?.[k] || k);
          const tail = st === 'avoid' ? cp('唔建議', 'not advised') : st === 'ok' ? cp('可以', 'OK') : cp('啱用', 'suits');
          return `<li class="is-${st}">${st === 'good' ? ICON.check : st === 'avoid' ? ICON.cross : ICON.dot}<b>${esc(word)}</b><span>${tail}</span></li>`;
        }).join('')}</ul>`));
      }
      const conc = [...(a.c1 || []), ...(a.c2 || [])].map((k) => (en ? EN.concern[k] : labels.concern?.[k])).filter(Boolean);
      if (conc.length) out.push(row('concern', cp('針對', 'Targets'), esc(conc.join(en ? ' · ' : '・'))));
      /* 5 質地、膚感、刺激度、程度：一行一樣，唔再包多層 */
      const tex = en ? EN.tex[a.tex] : labels.tex?.[a.tex];
      const wt = a.wt ? scale(a.wt, 3, en ? ['Light', 'Medium', 'Rich'] : ['清爽', '中度', '滋潤']) : '';
      const irr = a.irr ? scale(a.irr, 3, en ? ['Gentle', 'Moderately active', 'Highly active'] : ['溫和', '中度活性', '高活性']) : '';
      const beg = en ? EN.beg[a.beg] : labels.beg?.[a.beg];
      if (tex) out.push(row('texture', cp('質地', 'Texture'), esc(tex)));
      if (wt) out.push(row('feel', cp('膚感', 'Feel'), `<span class="pdp-facts__inline">${wt}</span>`));
      if (irr) out.push(row('intensity', cp('刺激度', 'Intensity'), `<span class="pdp-facts__inline">${irr}</span>`));
      if (beg) out.push(row('level', cp('程度', 'Level'), esc(beg)));
    }
    /* 6 主打成分（ingredients.js 同一把尺：模型推斷嘅唔出；個「!」撳落去有解釋） */
    const chips = typeof activeChips === 'function' ? activeChips(product.handle) : '';
    if (chips) out.push(row('actives', cp('主打成分', 'Key ingredients'), `<span class="ing-chips">${chips}</span>`));
    /* 7 點樣用：護膚步驟＋早／夜＋品牌寫嘅用法 */
    const pos = a && STEP_POS[a.step] != null ? STEP_POS[a.step] : null;
    /* 含酸類／A 醇：唔好寫「早晚都用得」，同「由一星期 2–3 晚開始」打交；改講建議夜晚用 */
    const actives = isWashOff(product, a) ? [] : activesOf(product.handle).actives;
    const strong = actives.includes('AHA/BHA') || actives.includes('視黃醇');
    const when = strong
      ? `${ICON.moon}<span>${cp('建議夜晚用', 'Best at night')}${actives.includes('AHA/BHA') && a?.am ? cp('（日間用要搽防曬）', ' (wear sunscreen if used by day)') : ''}</span>`
      : a && (a.am || a.pm)
        ? (a.am && a.pm ? `${ICON.sun}${ICON.moon}<span>${cp('早晚都用得', 'Morning & night')}</span>` : a.am ? `${ICON.sun}<span>${cp('早上用', 'Morning')}</span>` : `${ICON.moon}<span>${cp('夜晚用', 'Night')}</span>`)
        : '';
    const track = TRACK();
    if (pos != null || when || usage) {
      out.push(row('use', cp('點樣用', 'How to use'), `
        ${pos != null ? `<ol class="pdp-guide__track" aria-label="${esc(cp(`護膚步驟：第 ${pos + 1} 步${track[pos]}`, `Routine step ${pos + 1}: ${track[pos]}`))}">${track.map((t, i) => `<li class="${i === pos ? 'is-here' : i < pos ? 'is-before' : ''}"><span>${esc(t)}</span></li>`).join('')}</ol>` : ''}
        ${when ? `<p class="pdp-guide__when">${when}</p>` : ''}
        ${usage ? `<p class="pdp-facts__text">${esc(usage)}</p>` : ''}`));
    }
    /* 8 要留意（按成分同標籤；香料／精油／酒精都喺度講） */
    if (tips.length) out.push(row('care', cp('要留意', 'Good to know'), `<ul class="pdp-guide__tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`));
    /* 9 顧客點睇：分數＋（有就）AI 評價重點＋評分項目，撳落去去評價區 */
    const voice = voiceHTML(hl, rev, rating);
    if (voice) out.push(row('voice', cp('顧客點睇', 'Reviews'), voice));
    return out.join('');
  }

  function voiceHTML(hl, rev, rating) {
    const en = isEN();
    const bars = (rev?.attrs || []).filter((x) => x && x.name && x.avg)
      .map((x) => ({ ...x, name: typeof rvAttrName === 'function' ? rvAttrName(x.name) : x.name })); // 評分項目名：reviews.js 中英對照
    /* 英文版：有英文重點（t_en）先出 */
    const pick = (list) => (list || []).map((p) => ({ ...p, t: en ? p.t_en : p.t })).filter((p) => p.t);
    const pros = pick(hl?.pros);
    const cons = pick(hl?.cons);
    const fit = en ? hl?.fit_en : hl?.fit;
    const r = rating || (rev?.count ? { star: rev.star, count: rev.count, src: rev.src, srcName: rev.source, max: rev.max } : null);
    if (!r && !pros.length && !bars.length) return '';
    const src = r && typeof ratingSrc === 'function' ? ratingSrc(r).name : (rev?.source || '');
    const max = r && typeof ratingMax === 'function' ? ratingMax(r) : 5;
    const score = r ? `<a class="pdp-facts__score" href="#reviews"${rev?.count ? '' : ' data-static'}>
        ${typeof stars === 'function' ? stars(r.star, max) : ''}<b>${typeof ratingNum === 'function' ? ratingNum(r.star, max) : esc(r.star)}</b>
        <span>${esc(cp(`${Number(r.count).toLocaleString()} 則評價（${src}）`, `${Number(r.count).toLocaleString()} reviews (${src})`))}</span>
      </a>` : '';
    const mention = (p) => (p.n ? `<small>${cp(`${p.n} 則講到`, `${p.n} mention${p.n > 1 ? 's' : ''}`)}</small>` : '');
    return `${score}
      ${pros.length ? `<div class="pdp-guide__voice">
        <p class="pdp-guide__label pdp-guide__label--ai">${ICON.spark}${cp('AI 幫你睇評價', 'AI review summary')}</p>
        <ul class="pdp-guide__pros">${pros.map((p) => `<li>${ICON.plus}<span>${esc(p.t)}</span>${mention(p)}</li>`).join('')}</ul>
        ${cons.length ? `<ul class="pdp-guide__cons">${cons.map((p) => `<li>${ICON.minus}<span>${esc(p.t)}</span>${mention(p)}</li>`).join('')}</ul>` : ''}
        ${fit ? `<p class="pdp-guide__fitline"><b>${cp('最啱：', 'Best for: ')}</b>${esc(fit)}</p>` : ''}
        <p class="pdp-guide__basis">${cp(`AI 只根據下面引用嘅 ${hl.basis || ''} 則評價整理`, `Summarised by AI from the ${hl.basis || ''} reviews quoted below`)}</p>
      </div>` : ''}
      ${bars.length ? `<dl class="pdp-guide__bars">${bars.map((b) => `<div><dt>${esc(b.name)}</dt><dd><span class="pdp-guide__bar"><i style="width:${Math.max(0, Math.min(100, (b.avg / 5) * 100))}%"></i></span><b>${esc(b.avg)}</b></dd></div>`).join('')}</dl>` : ''}`;
  }

  async function renderGuide(product, descHtml) {
    const host = document.querySelector('[data-pdp-guide]');
    if (!host || !product) return;
    const handle = product.handle;
    const [attrsDoc, hl, ratings] = await Promise.all([
      loadAttrs(),
      loadHighlights(),
      typeof loadRatings === 'function' ? loadRatings().catch(() => ({})) : {},
      typeof loadIngredients === 'function' ? loadIngredients() : null,
    ]);
    const a = attrsDoc?.products?.[handle] || null;
    let rev = null;
    try { rev = typeof loadReviews === 'function' ? await loadReviews(handle) : null; } catch (_) { rev = null; }
    const body = host.querySelector('[data-pdp-guide-body]');
    const tips = careTips(product, a);
    body.innerHTML = rowsHTML({
      product,
      a,
      labels: attrsDoc?.labels || {},
      usage: usageFrom(descHtml),
      tips,
      origin: originFrom(descHtml),
      size: sizeFrom(product, descHtml),
      hl: hl?.[handle],
      rev,
      rating: ratings?.[handle] || null,
    });
    const hook = isEN() ? '' : (a?.hook || ''); // hook 得中文
    const hookEl = host.querySelector('[data-pdp-guide-hook]');
    hookEl.textContent = hook;
    hookEl.hidden = !hook;
    /* 註腳：有膚質／成分提示先講「皮膚有狀況問醫生」；隱形眼鏡、保健品、公仔嗰啲唔啱講皮膚 */
    const note = host.querySelector('.pdp-facts__note');
    const skinInfo = !!(a || tips.length || (typeof activeChips === 'function' && activeChips(handle)));
    if (note) {
      note.textContent = skinInfo
        ? cp('資料由 OUJI 根據品牌說明、成分同顧客評價整理，只供參考；皮膚有狀況請先問醫生或藥劑師。', 'Compiled by OUJI from brand information, ingredients and customer reviews. For reference only — if you have a skin condition, please ask a doctor or pharmacist first.')
        : cp('資料由 OUJI 根據品牌說明同顧客評價整理，只供參考。', 'Compiled by OUJI from brand information and customer reviews. For reference only.');
    }
    host.hidden = !body.childElementCount;
  }

  window.renderGuide = renderGuide;
})();
