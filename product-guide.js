/* 產品頁「重點」卡（product-guide.js）。2026-10-17 由「啱唔啱你」改，Winston 嘅要求：
 *   ·「要諗多一步，提供多啲資訊、創造價值」
 *   ·「每件唔同嘅產品，你個頁面又唔同……應該諗一個可以統一到嘅做法」
 *   ·「啲內容有啲重複」
 *
 * 每件貨同一張卡、同一個次序：
 *   基本（類型／容量／品牌國家）→ 其他規格 → 適合膚質 → 針對 → 質地 → 主打成分 → 點樣用 → 要留意。
 * 冇料嗰格唔出，張卡同佢個位唔變。
 *
 * 唔另外作資料，全部用網站本身已有、已審過嘅來源：
 *   · 產品描述入面嘅規格行同「用法」：takeFacts() 搬入卡，同時喺描述刪走，唔出兩次。
 *   · data/attrs.json：護膚配對用緊嘅標籤，只有護膚品有（約 500 件）。
 *   · ingredients.json：主打成分同香料／精油／酒精，跟 activeChips 同一把尺。
 *   · data/review-highlights.json：AI 評價重點，擺喺評價區總結下面（renderReviewAI）。
 *
 * 「要留意」係按成分出嘅一般用法提示，寫「建議」「常見做法」，唔講「醫好」，唔講濃度。 */
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
  /* 護膚賣點（data/skincare-points.json）：{handle: {points:[{v}]}}，每點都有原文出處，內部檔另存（唔出畀客睇） */
  let PTS = null; let ptsP = null;
  const loadPoints = () => {
    if (PTS) return Promise.resolve(PTS);
    if (!ptsP) ptsP = fetch('/data/skincare-points.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => (PTS = d || {}));
    return ptsP;
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

  /* ---------- 由描述攞規格同用法（2026-10-17 Winston：「左邊又講容量、爽膚水，右邊又講一樣；左邊又有品牌、品牌國家，右邊又有」）----------
     重點卡出嘅嘢就喺描述度刪走，同一樣資料只出一次。只搬「成行都係『名稱：內容』」嘅規格行；
     句子入面順口提到嘅（例如「容量 150ml。」）照留，唔好整爛品牌寫嘅描述。 */
  const SPEC = [
    { key: 'size', zh: '容量', en: 'Size', re: /^(容量\s*[／/]\s*規格|容量|規格|淨含量|volume\s*\/\s*spec|volume|size|net\s*(?:wt|weight|content))$/i },
    { key: 'origin', re: /^(品牌國家|brand origin)$/i },
    { key: 'brand', re: /^(品牌|brand)$/i }, // 品牌名喺產品名上面已經有，淨係唔再喺描述重複
    { key: 'spf', zh: '防曬值', en: 'SPF', re: /^(防曬值|防曬標示|spf)$/i },
    { key: 'scent', zh: '香味', en: 'Scent', re: /^(香味|scent)$/i },
    { key: 'cycle', zh: '使用週期', en: 'Wear cycle', re: /^(使用週期|wear cycle)$/i },
    { key: 'perbox', zh: '每盒數量', en: 'Per box', re: /^(每盒數量|quantity per box)$/i },
    { key: 'power', zh: '度數範圍', en: 'Power range', re: /^(度數範圍|power range)$/i },
    { key: 'instock', zh: '現貨度數', en: 'In-stock powers', re: /^(現貨度數|in-stock powers)$/i },
    { key: 'preorder', zh: '預訂度數', en: 'Pre-order powers', re: /^(預訂度數|pre-order powers)$/i },
    { key: 'model', zh: '款號', en: 'Model', re: /^(款號|model)$/i },
    { key: 'version', zh: '版本', en: 'Version', re: /^(版本|version)$/i },
    { key: 'usage', re: /^(用法|使用方法|how to use|directions|usage)$/i },
    /* 2026-10-20 規格一行已經出（冇 zh＝唔再喺卡底重複）：色數、材質、尺寸 */
    { key: 'colours', re: /^(色數)$/ },
    { key: 'material', re: /^(材質|物料|毛料|刷毛)$/ },
    { key: 'dims', re: /^(尺寸|大小|全長|高度)$/ },
    { key: 'designs', re: /^(款式)$/ },
    { key: 'features', re: /^(特點)$/ },
  ];
  const NAME_RE = /^(英文名稱?|型號\s*[／/]\s*英文名|日文原名|日本販售名|english name|japanese name)$/i;
  const USAGE_HEAD = /^\s*(用法|使用方法|how to use|directions|usage)\s*[:：]?\s*$/i;
  const normKey = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

  /** 一行「名稱：內容」係咪規格；唔係就回 null。用法可以長啲，其他規格要短、唔可以係一句完整嘅句子。 */
  function specOf(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/^([^：:]{1,16}?)\s*[：:]\s*(.{1,200})$/);
    if (!m) return null;
    const label = m[1].trim();
    const value = m[2].trim().replace(/[。.]$/, '');
    const hit = SPEC.find((x) => x.re.test(label));
    const key = hit ? hit.key : NAME_RE.test(label) ? 'name' : '';
    if (!key) return null;
    if (key !== 'usage' && (value.length > 40 || /[。；;]/.test(value))) return null;
    /* 規格一行出唔到嘅（太長、包裝尺寸「W60 × H200」、一串成分）就留喺描述，唔好剷走 */
    if (['colours', 'material', 'dims'].includes(key) && (value.length > 14 || /\d\s*[×xX]\s*\d|[、(（]/.test(value))) return null;
    if (key === 'designs' && !/^全\s?\d{1,2}\s?款/.test(value)) return null; // 「款式：顏色隨機」呢類留喺描述
    if (key === 'features' && !/^(純素(認證)?|超防水|防水防汗|防水|防暈染|無香料|海洋友善|環保)([、，,](純素(認證)?|超防水|防水防汗|防水|防暈染|無香料|海洋友善|環保))*$/.test(value)) return null;
    return { key, value };
  }

  /** 喺描述 DOM 度攞走規格行、用法、開頭只係產品名嘅段落，回傳畀重點卡用。 */
  function takeFacts(root, product) {
    const facts = { specs: {}, usage: '', origin: '' };
    if (!root) return facts;
    const titleKey = normKey(product?.title);
    /* 英文名／日文原名：同產品名重複先刪，唔同嘅照留喺描述 */
    const duplicateName = (sp) => sp.key === 'name' && titleKey.includes(normKey(sp.value));
    const record = (sp) => {
      if (sp.key === 'origin') facts.origin = facts.origin || sp.value;
      else if (sp.key === 'usage') facts.usage = facts.usage || sp.value;
      else if (sp.key !== 'brand' && sp.key !== 'name') facts.specs[sp.key] = facts.specs[sp.key] || sp.value;
    };
    const take = (sp) => sp && (sp.key !== 'name' || duplicateName(sp));
    /* 1 「用法」標題同跟住嗰段 */
    root.querySelectorAll('h2, h3, h4').forEach((h) => {
      if (!USAGE_HEAD.test(h.textContent)) return;
      /* 只攞標題下面頭一兩段（p／ul），撞到規格行、品牌國家、包裝說明就停，唔好連後面其他內容都拎走 */
      const gone = [h]; let t = ''; let el = h.nextElementSibling;
      while (el && gone.length < 3 && /^(P|UL|OL)$/.test(el.tagName) && !el.querySelector('img')
        && !el.matches('.ouji-packaging-note, .ouji-brand-origin, .ouji-alt-names') && !specOf(el.textContent)
        && ![...el.querySelectorAll('li')].some((li) => specOf(li.textContent))) {
        t += ` ${el.textContent}`; gone.push(el); el = el.nextElementSibling;
      }
      if (gone.length < 2) return; // 標題下面冇用法內容：唔郁
      facts.usage = facts.usage || t.replace(/\s+/g, ' ').trim();
      gone.forEach((x) => x.remove());
    });
    /* 2 粗體「用法」開頭嘅段落 */
    root.querySelectorAll('strong, b').forEach((b) => {
      if (!root.contains(b) || !USAGE_HEAD.test(b.textContent)) return;
      const box = b.closest('p, li');
      if (!box || box.querySelector('img')) return;
      facts.usage = facts.usage || box.textContent.replace(b.textContent, '').replace(/\s+/g, ' ').replace(/^[：:\s]+/, '').trim();
      box.remove();
    });
    /* 3 規格行：li／p／span 成個係「名稱：內容」；p 入面用 <br> 分行嘅就逐行睇 */
    root.querySelectorAll('li, p, span.ouji-brand-origin').forEach((el) => {
      if (!root.contains(el) || el.querySelector('img')) return;
      const sp = specOf(el.textContent);
      if (take(sp)) { record(sp); el.remove(); return; }
      /* 「容量：50ml。防曬標示以實際包裝為準。」：規格搬入卡，後面嗰句照留（淨係處理冇其他格式嘅純文字段落） */
      if (!el.children.length) {
        const m = el.textContent.replace(/\s+/g, ' ').trim().match(/^([^：:]{1,16}?)\s*[：:]\s*([^。；;]{1,30})[。；;]\s*(.+)$/);
        const head = m && specOf(`${m[1]}：${m[2]}`);
        if (head && head.key !== 'usage' && head.key !== 'name') { record(head); el.textContent = m[3]; return; }
      }
      if (el.tagName !== 'P' || !/<br/i.test(el.innerHTML)) return;
      let changed = false;
      const left = el.innerHTML.split(/<br\s*\/?>/i).filter((html) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const line = specOf(tmp.textContent);
        if (!take(line)) return true;
        record(line); changed = true; return false;
      });
      if (!changed) return;
      el.innerHTML = left.join('<br>').replace(/^(\s*<br>)+|(<br>\s*)+$/g, '');
      if (!el.textContent.trim()) el.remove();
    });
    /* 4 開頭只係產品名嘅段落（上面已經有個名） */
    for (let n = 0; n < 4; n += 1) {
      const first = [...root.children].find((x) => x.textContent.trim() || x.querySelector('img'));
      if (!first || first.querySelector('img') || !/^(P|H[1-4]|DIV)$/.test(first.tagName)) break; // 淨係成段都係產品名先刪，句子開頭嘅粗體名唔郁
      const k = normKey(first.textContent);
      if (!k || !titleKey.includes(k)) break;
      first.remove();
    }
    /* 5 刪完變咗空嘅 ul／p／div */
    root.querySelectorAll('ul, ol, p, div').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('img, video, iframe')) el.remove();
    });
    /* 6 頂頭剩低嘅斷行（刪咗產品名之後，第一段開頭嘅 <br>） */
    for (let box = root, n = 0; box && n < 4; n += 1) {
      while (box.firstChild && (box.firstChild.nodeName === 'BR' || (box.firstChild.nodeType === 3 && !box.firstChild.textContent.trim()))) box.firstChild.remove();
      box = box.firstElementChild && box.firstChild === box.firstElementChild ? box.firstElementChild : null;
    }
    return facts;
  }

  /** 品牌國家：「韓國品牌 Brand origin: Korea」→ 中文「韓國」／英文「Korea」 */
  /* ── 重點卡：一張視覺化卡（2026-10-19 Winston：「重點、適合咩膚質、質地、點樣用，會唔會可以用一張視覺化嘅卡片表示晒，而唔係分開三四卡」──
     一張卡睇晒：一句重點 → 適合膚質五粒 → 三格（質地／膚感／刺激度；非護膚就類型／容量／產地）→ 點樣用（早夜＋步驟）→ 針對、主打成分；
     長字（品牌用法、要留意）收喺最底「詳細」，撳開先出 —— 資料一樣都冇少。冇料嗰格唔出，張卡同個次序唔變。 */
  const TEX_ICON = {
    drop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c3.2 4 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2.3-6 5.5-10Z"/></svg>',
    jar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="9" width="14" height="10.5" rx="2.5"/><path d="M6.5 9V6.5h11V9"/><path d="M9 13.5c1.8 1.2 4.2 1.2 6 0"/></svg>',
    gel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 14.5c0-4 3-8.5 7-8.5s7 4.5 7 8.5a7 4.5 0 0 1-14 0Z"/><path d="M9 11.5c.6-1.2 1.6-2 2.8-2.3"/></svg>',
    foam: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="13" r="4"/><circle cx="15.5" cy="10" r="3"/><circle cx="16" cy="16.5" r="2.2"/></svg>',
    oil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c3.2 4 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2.3-6 5.5-10Z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l2 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Z"/><circle cx="9.5" cy="11" r=".9"/><circle cx="14.5" cy="11" r=".9"/><path d="M10 15c1.2.8 2.8.8 4 0"/></svg>',
  };
  const TEX_KIND = { watery: 'drop', essence: 'drop', mist: 'drop', milky: 'jar', creamy: 'jar', balm: 'jar', gel: 'gel', foam: 'foam', oil: 'oil', sheet: 'sheet', pad: 'sheet' };

  function profileHTML({ product, facts, a, labels, tips, points }) {
    const en = isEN();
    const out = [];
    const label = (t) => `<p class="pdp-pf__label">${t}</p>`;
    if (a?.hook && !en && !points?.length) out.push(`<p class="pdp-pf__hook">${esc(a.hook)}</p>`);
    /* 特點（只有中文；英文版等 Winston 講 live 之後先譯） */
    if (points?.length && !en) out.push(`<div class="pdp-pf__sec pdp-pf__sec--points">${label('特點')}<ul class="pdp-pf__points">${points.map((t) => `<li>${ICON.check}<span>${esc(t)}</span></li>`).join('')}</ul></div>`);
    /* 適合膚質：啱用排先，可以、唔建議跟住 */
    if (a) {
      const fit = a.fit || {};
      const rank = { good: 0, ok: 1, avoid: 2 };
      const word = (k) => (en ? EN.skin[k] : (labels.skin?.[k] || k));
      const ks = SKINS.filter((k) => fit[k] && fit[k] !== 'unknown').sort((x, y) => rank[fit[x]] - rank[fit[y]]);
      const say = { good: cp('啱用', 'suits'), ok: cp('可以', 'OK'), avoid: cp('唔建議', 'not advised') };
      if (ks.length) out.push(`<div class="pdp-pf__sec pdp-pf__sec--skin">${label(cp('適合膚質', 'Skin types'))}<ul class="pdp-pf__skins">${ks.map((k) => `<li class="is-${fit[k]}" title="${esc(`${word(k)}${en ? ': ' : '：'}${say[fit[k]]}`)}">${fit[k] === 'good' ? ICON.check : fit[k] === 'avoid' ? ICON.cross : ICON.dot}<span>${esc(word(k))}</span><span class="pdp-pf__sr">${esc(say[fit[k]])}</span></li>`).join('')}</ul></div>`);
    }
    /* 三格（護膚先有）：質地／膚感／刺激度 */
    const meter = (v) => `<span class="pdp-pf__meter" aria-hidden="true">${[1, 2, 3].map((i) => `<i${i <= v ? ' class="is-on"' : ''}></i>`).join('')}</span>`;
    const tile = (t, v, vis = '') => `<div class="pdp-pf__tile">${label(t)}<p class="pdp-pf__val">${vis}<span>${v}</span></p></div>`;
    const tiles = [];
    const tex = a ? (en ? EN.tex[a.tex] : labels.tex?.[a.tex]) : '';
    if (a && (tex || a.wt || a.irr)) {
      if (tex) tiles.push(tile(cp('質地', 'Texture'), esc(tex), TEX_ICON[TEX_KIND[a.tex] || 'drop']));
      if (a.wt) tiles.push(tile(cp('膚感', 'Feel'), esc(en ? ['Light', 'Medium', 'Rich'][a.wt - 1] : labels.wt?.[a.wt]), meter(a.wt)));
      if (a.irr) tiles.push(tile(cp('刺激度', 'Intensity'), esc(en ? ['Gentle', 'Moderate', 'Strong'][a.irr - 1] : labels.irr?.[a.irr]), meter(a.irr)));
    }
    /* 類型、容量、品牌國家（2026-10-20 起）：購買區頂已經有（類別喺品牌右邊、規格一行），卡入面唔再講 */
    if (tiles.length) out.push(`<div class="pdp-pf__tiles">${tiles.join('')}</div>`);
    /* 冇護膚標籤（化妝品等）：品牌用法直接出喺卡度，唔好收埋（唔係張卡得兩格好空） */
    const skinMode = !!(a && (tex || a.wt || a.irr));
    if (!skinMode && facts.usage) out.push(`<div class="pdp-pf__sec pdp-pf__sec--use">${label(cp('點樣用', 'How to use'))}<p class="pdp-pf__text">${esc(facts.usage)}</p></div>`);
    /* 點樣用：早夜＋程度一行；護膚步驟條 */
    const pos = a && STEP_POS[a.step] != null ? STEP_POS[a.step] : null;
    const actives = isWashOff(product, a) ? [] : activesOf(product.handle).actives;
    const strong = actives.includes('AHA/BHA') || actives.includes('視黃醇');
    const when = strong ? `${ICON.moon}<span>${cp('建議夜晚用', 'Best at night')}</span>`
      : a && (a.am || a.pm) ? (a.am && a.pm ? `${ICON.sun}${ICON.moon}<span>${cp('早晚都用得', 'Morning & night')}</span>` : a.am ? `${ICON.sun}<span>${cp('早上用', 'Morning')}</span>` : `${ICON.moon}<span>${cp('夜晚用', 'Night')}</span>`) : '';
    const beg = a ? (en ? EN.beg[a.beg] : labels.beg?.[a.beg]) : '';
    if (pos != null || when) {
      const track = TRACK();
      out.push(`<div class="pdp-pf__sec pdp-pf__sec--use">${label(cp('點樣用', 'How to use'))}
        ${when || beg ? `<p class="pdp-pf__when">${when}${beg ? `<span class="pdp-pf__beg">${esc(beg)}</span>` : ''}</p>` : ''}
        ${pos != null ? `<ol class="pdp-guide__track pdp-pf__track" aria-label="${esc(cp(`護膚步驟：第 ${pos + 1} 步${track[pos]}`, `Routine step ${pos + 1}: ${track[pos]}`))}">${track.map((t, i) => `<li class="${i === pos ? 'is-here' : i < pos ? 'is-before' : ''}">${esc(t)}</li>`).join('')}</ol>` : ''}
      </div>`);
    }
    /* 針對、主打成分 */
    const conc = a ? [...(a.c1 || []), ...(a.c2 || [])].map((k) => (en ? EN.concern[k] : labels.concern?.[k])).filter(Boolean) : [];
    if (conc.length) out.push(`<div class="pdp-pf__sec pdp-pf__sec--inline pdp-pf__sec--targets">${label(cp('針對', 'Targets'))}<p class="pdp-pf__text">${esc(conc.join(en ? ' · ' : '・'))}</p></div>`);
    const chips = typeof activeChips === 'function' ? activeChips(product.handle) : '';
    if (chips) out.push(`<div class="pdp-pf__sec pdp-pf__sec--inline pdp-pf__sec--actives">${label(cp('主打成分', 'Key ingredients'))}<span class="ing-chips">${chips}</span></div>`);
    /* 最底：基本（護膚先出呢度；其他已經喺三格）＋其他規格＋「詳細」（品牌用法、要留意） */
    const foot = SPEC.filter((x) => x.zh && x.key !== 'size' && x.key !== 'spf' && facts.specs[x.key]).map((x) => `${cp(x.zh, x.en)} ${esc(facts.specs[x.key])}`);
    const more = [
      skinMode && facts.usage ? `<div class="pdp-pf__more-sec">${label(cp('品牌用法', 'Directions'))}<p class="pdp-pf__text">${esc(facts.usage)}</p></div>` : '',
      tips.length ? `<div class="pdp-pf__more-sec">${label(cp('要留意', 'Good to know'))}<ul class="pdp-guide__tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '',
    ].join('');
    if (foot.length || more) {
      out.push(`<div class="pdp-pf__foot">${foot.length ? `<p class="pdp-pf__basics">${foot.join('<span aria-hidden="true">・</span>')}</p>` : '<span></span>'}${more ? `<details class="pdp-pf__more"><summary>${cp('詳細', 'Details')}<i aria-hidden="true"></i></summary><div class="pdp-pf__more-body">${more}</div></details>` : ''}</div>`);
    }
    return `<div class="pdp-pf${skinMode ? ' is-skin' : ''}">${out.join('')}</div>`;
  }

  const withTimeout = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);

  /** 重點卡。第一下唔使等任何資料（類型、容量、品牌國家、用法即刻出），右邊唔會一片空白等資料；
   *  護膚標籤同成分載完再補（每樣最多等 6 秒，慢嘅唔會拖住其他）。 */
  async function renderGuide(product, facts) {
    const host = document.querySelector('[data-pdp-guide]');
    if (!host || !product) return;
    const body = host.querySelector('[data-pdp-guide-body]');
    const note = host.querySelector('.pdp-acc__note');
    const f = facts || { specs: {}, usage: '', origin: '' };
    const paint = (a, labels, points) => {
      const tips = careTips(product, a);
      const opened = new Set([...body.querySelectorAll('details')].filter((d) => d.open).map((d) => d.dataset.k));
      const first = !body.childElementCount;
      /* 2026-10-19 Winston：一張視覺化重點卡（取代 10-18 嘅摺疊清單） */
      host.classList.add('is-card');
      body.innerHTML = profileHTML({ product, facts: f, a, labels, tips, points });
      if (!first) body.querySelectorAll('details').forEach((d) => { d.open = opened.has(d.dataset.k); });
      /* 註腳：有膚質／成分提示先講「皮膚有狀況問醫生」；隱形眼鏡、保健品、公仔嗰啲唔啱講皮膚 */
      const skinInfo = !!(a || tips.length || (typeof activeChips === 'function' && activeChips(product.handle)));
      if (note) {
        note.textContent = skinInfo
          ? cp('資料由 OUJI 根據品牌說明、成分同顧客評價整理，只供參考；皮膚有狀況請先問醫生或藥劑師。', 'Compiled by OUJI from brand information, ingredients and customer reviews. For reference only — if you have a skin condition, please ask a doctor or pharmacist first.')
          : cp('資料由 OUJI 根據品牌說明整理，只供參考。', 'Compiled by OUJI from brand information. For reference only.');
      }
      host.hidden = !body.querySelector('.pdp-pf > *');
    };
    paint(null, {});
    const [attrsDoc, ptsDoc] = await Promise.all([
      withTimeout(loadAttrs(), 6000),
      withTimeout(loadPoints(), 6000),
      withTimeout(typeof loadIngredients === 'function' ? loadIngredients() : null, 6000),
    ]);
    paint(attrsDoc?.products?.[product.handle] || null, attrsDoc?.labels || {}, (ptsDoc?.[product.handle]?.points || []).map((x) => x.v));
  }

  /** AI 評價重點擺喺評價區總結下面：佢只根據呢度引用嘅幾則評價整理，放埋一齊先睇得出根據（評分項目都喺度，唔再喺重點卡重複）。 */
  async function renderReviewAI(product) {
    const aside = document.querySelector('[data-reviews] .rv-aside');
    if (!aside || !product || aside.querySelector('.pdp-guide__voice')) return;
    const hl = (await withTimeout(loadHighlights(), 6000))?.[product.handle];
    if (!hl) return;
    const en = isEN();
    const pick = (list) => (list || []).map((p) => ({ ...p, t: en ? p.t_en : p.t })).filter((p) => p.t);
    const pros = pick(hl.pros);
    const cons = pick(hl.cons);
    if (!pros.length) return;
    const fit = en ? hl.fit_en : hl.fit;
    const mention = (p) => (p.n ? `<small>${cp(`${p.n} 則講到`, `${p.n} mention${p.n > 1 ? 's' : ''}`)}</small>` : '');
    const html = `<div class="pdp-guide__voice">
      <p class="pdp-guide__label pdp-guide__label--ai">${ICON.spark}${cp('AI 幫你睇評價', 'AI review summary')}</p>
      <ul class="pdp-guide__pros">${pros.map((p) => `<li>${ICON.plus}<span>${esc(p.t)}</span>${mention(p)}</li>`).join('')}</ul>
      ${cons.length ? `<ul class="pdp-guide__cons">${cons.map((p) => `<li>${ICON.minus}<span>${esc(p.t)}</span>${mention(p)}</li>`).join('')}</ul>` : ''}
      ${fit ? `<p class="pdp-guide__fitline"><b>${cp('最啱：', 'Best for: ')}</b>${esc(fit)}</p>` : ''}
      <p class="pdp-guide__basis">${cp(`AI 只根據呢度引用嘅 ${hl.basis || ''} 則評價整理`, `Summarised by AI from the ${hl.basis || ''} reviews quoted here`)}</p>
    </div>`;
    const summary = aside.querySelector('.rv-summary');
    if (summary) summary.insertAdjacentHTML('afterend', html); else aside.insertAdjacentHTML('afterbegin', html);
  }

  window.renderGuide = renderGuide;
  window.takeFacts = takeFacts;
  window.renderReviewAI = renderReviewAI;
})();
