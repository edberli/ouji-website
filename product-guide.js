/* 產品頁「啱唔啱你」（2026-10-17，Winston：「產品頁唔係淨係得最普通嗰啲功能……要諗多一步，提供多啲資訊、創造價值」）。
 *
 * 唔另外作資料，全部用網站本身已有、已審過嘅來源，冇嗰項就唔出，成段冇料就成段唔出：
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
    guide: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c3.6 2.3 6.5 2.6 7.5 2.6v5.4c0 4.8-3.3 7.9-7.5 9-4.2-1.1-7.5-4.2-7.5-9V6.1c1 0 3.9-.3 7.5-2.6Z"/><path d="m8.8 12.2 2.3 2.3 4.3-4.6"/></svg>',
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

  function factsHTML(product, a, labels, usage, tips) {
    const cells = [];
    if (a) {
      const fit = a.fit || {};
      const skins = SKINS.filter((k) => fit[k] && fit[k] !== 'unknown');
      const conc = [...(a.c1 || []), ...(a.c2 || [])].map((k) => (isEN() ? EN.concern[k] : labels.concern?.[k])).filter(Boolean);
      if (skins.length || conc.length) {
        cells.push(`<div class="pdp-guide__cell pdp-guide__cell--fit">
          ${skins.length ? `<h3 class="pdp-guide__label">${cp('適合膚質', 'Skin types')}</h3>
          <ul class="pdp-guide__skins">${skins.map((k) => {
            const st = fit[k];
            const word = isEN() ? EN.skin[k] : (labels.skin?.[k] || k);
            const tail = st === 'avoid' ? cp('唔建議', 'not advised') : st === 'ok' ? cp('可以', 'OK') : cp('啱用', 'suits');
            return `<li class="is-${st}">${st === 'good' ? ICON.check : st === 'avoid' ? ICON.cross : ICON.dot}<b>${esc(word)}</b><span>${tail}</span></li>`;
          }).join('')}</ul>` : ''}
          ${conc.length ? `<h3 class="pdp-guide__label">${cp('針對', 'Targets')}</h3><p class="pdp-guide__text">${conc.map(esc).join(isEN() ? ' · ' : '・')}</p>` : ''}
        </div>`);
      }
      const tex = isEN() ? EN.tex[a.tex] : labels.tex?.[a.tex];
      const wt = a.wt ? scale(a.wt, 3, isEN() ? ['Light', 'Medium', 'Rich'] : ['清爽', '中度', '滋潤']) : '';
      const irr = a.irr ? scale(a.irr, 3, isEN() ? ['Gentle', 'Moderately active', 'Highly active'] : ['溫和', '中度活性', '高活性']) : '';
      const beg = isEN() ? EN.beg[a.beg] : labels.beg?.[a.beg];
      if (tex || wt || irr) {
        cells.push(`<div class="pdp-guide__cell pdp-guide__cell--feel">
          <h3 class="pdp-guide__label">${cp('質地同感覺', 'Texture & feel')}</h3>
          <dl class="pdp-guide__rows">
            ${tex ? `<div><dt>${cp('質地', 'Texture')}</dt><dd>${esc(tex)}</dd></div>` : ''}
            ${wt ? `<div><dt>${cp('膚感', 'Feel')}</dt><dd>${wt}</dd></div>` : ''}
            ${irr ? `<div><dt>${cp('刺激度', 'Intensity')}</dt><dd>${irr}</dd></div>` : ''}
            ${beg ? `<div><dt>${cp('適合', 'Level')}</dt><dd>${esc(beg)}</dd></div>` : ''}
          </dl>
        </div>`);
      }
    }
    const pos = a && STEP_POS[a.step] != null ? STEP_POS[a.step] : null;
    /* 含酸類／A 醇：唔好寫「早晚都用得」，同下面「由一星期 2–3 晚開始」打交；改講建議夜晚用 */
    const actives = isWashOff(product, a) ? [] : activesOf(product.handle).actives;
    const strong = actives.includes('AHA/BHA') || actives.includes('視黃醇');
    const when = strong
      ? `${ICON.moon}<span>${cp('建議夜晚用', 'Best at night')}${actives.includes('AHA/BHA') && a?.am ? cp('（日間用要搽防曬）', ' (wear sunscreen if used by day)') : ''}</span>`
      : a && (a.am || a.pm)
        ? (a.am && a.pm ? `${ICON.sun}${ICON.moon}<span>${cp('早晚都用得', 'Morning & night')}</span>` : a.am ? `${ICON.sun}<span>${cp('早上用', 'Morning')}</span>` : `${ICON.moon}<span>${cp('夜晚用', 'Night')}</span>`)
        : '';
    const track = TRACK();
    if (pos != null || when || usage) {
      cells.push(`<div class="pdp-guide__cell pdp-guide__cell--use">
        <h3 class="pdp-guide__label">${cp('點樣用', 'How to use')}</h3>
        ${pos != null ? `<ol class="pdp-guide__track" aria-label="${esc(cp(`護膚步驟：第 ${pos + 1} 步${track[pos]}`, `Routine step ${pos + 1}: ${track[pos]}`))}">${track.map((t, i) => `<li class="${i === pos ? 'is-here' : i < pos ? 'is-before' : ''}"><span>${esc(t)}</span></li>`).join('')}</ol>` : ''}
        ${when ? `<p class="pdp-guide__when">${when}</p>` : ''}
        ${usage ? `<p class="pdp-guide__text">${esc(usage)}</p>` : ''}
      </div>`);
    }
    if (tips.length) {
      cells.push(`<div class="pdp-guide__cell pdp-guide__cell--care">
        <h3 class="pdp-guide__label">${cp('要留意', 'Good to know')}</h3>
        <ul class="pdp-guide__tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>`);
    }
    return cells.join('');
  }

  function voiceHTML(hl, revAttrs, revSrc) {
    const en = isEN();
    const bars = (revAttrs || []).filter((x) => x && x.name && x.avg)
      .map((x) => ({ ...x, name: typeof rvAttrName === 'function' ? rvAttrName(x.name) : x.name })); // 評分項目名：reviews.js 中英對照
    /* 英文版：有英文重點（t_en）先出，冇就淨係出評分 */
    const pick = (list) => (list || []).map((p) => ({ ...p, t: en ? p.t_en : p.t })).filter((p) => p.t);
    const pros = pick(hl?.pros);
    const cons = pick(hl?.cons);
    const fit = en ? hl?.fit_en : hl?.fit;
    if (!pros.length && !bars.length) return '';
    return `<div class="pdp-guide__voice">
      <h3 class="pdp-guide__label pdp-guide__label--ai">${pros.length ? `${ICON.spark}${cp('AI 幫你睇評價', 'AI review summary')}` : cp('顧客點睇', 'What customers say')}</h3>
      ${pros.length ? `<ul class="pdp-guide__pros">${pros.map((p) => `<li>${ICON.plus}<span>${esc(p.t)}</span>${p.n ? `<small>${cp(`${p.n} 則講到`, `${p.n} mention${p.n > 1 ? 's' : ''}`)}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${cons.length ? `<ul class="pdp-guide__cons">${cons.map((p) => `<li>${ICON.minus}<span>${esc(p.t)}</span>${p.n ? `<small>${cp(`${p.n} 則講到`, `${p.n} mention${p.n > 1 ? 's' : ''}`)}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${pros.length && fit ? `<p class="pdp-guide__fitline"><b>${cp('最啱：', 'Best for: ')}</b>${esc(fit)}</p>` : ''}
      ${bars.length ? `<dl class="pdp-guide__bars">${bars.map((b) => `<div><dt>${esc(b.name)}</dt><dd><span class="pdp-guide__bar"><i style="width:${Math.max(0, Math.min(100, (b.avg / 5) * 100))}%"></i></span><b>${esc(b.avg)}</b></dd></div>`).join('')}</dl>` : ''}
      <p class="pdp-guide__basis">${pros.length ? cp(`AI 只根據下面引用嘅 ${hl.basis || ''} 則評價整理`, `Summarised by AI from the ${hl.basis || ''} reviews quoted below`) : ''}${pros.length && bars.length ? cp('；', '. ') : ''}${bars.length ? cp(`評分來自 ${esc(revSrc || '')} 顧客`, `Ratings from ${esc(revSrc || '')} customers`) : ''}</p>
    </div>`;
  }

  async function renderGuide(product, descHtml) {
    const host = document.querySelector('[data-pdp-guide]');
    if (!host || !product) return;
    const handle = product.handle;
    const [attrsDoc, hl] = await Promise.all([
      loadAttrs(),
      loadHighlights(),
      typeof loadIngredients === 'function' ? loadIngredients() : null,
    ]);
    const a = attrsDoc?.products?.[handle] || null;
    const labels = attrsDoc?.labels || {};
    let rev = null;
    try { rev = typeof loadReviews === 'function' ? await loadReviews(handle) : null; } catch (_) { rev = null; }
    const usage = usageFrom(descHtml);
    const tips = careTips(product, a);
    const facts = factsHTML(product, a, labels, usage, tips);
    const voice = voiceHTML(hl?.[handle], rev?.attrs, rev?.source);
    const body = host.querySelector('[data-pdp-guide-body]');
    if (!facts && !voice) { host.hidden = true; if (body) body.innerHTML = ''; return; }
    const hook = isEN() ? '' : (a?.hook || '');  // hook 得中文
    host.querySelector('[data-pdp-guide-hook]').textContent = hook;
    host.querySelector('[data-pdp-guide-hook]').hidden = !hook;
    body.innerHTML = `${voice}${facts ? `<div class="pdp-guide__facts">${facts}</div>` : ''}`;
    body.classList.toggle('has-voice', !!voice);
    host.hidden = false;
  }

  window.renderGuide = renderGuide;
  window.OUJI_guideIcon = ICON.guide;
})();
