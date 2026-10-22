/* 同芝麻揀護膚 — a small invitation on the category page that opens four
 * questions and a routine drawn from the shop's labelled shelf.
 *
 * Answers stay in this tab. The preview guard turns the cart into a local
 * demonstration; production adds through the site's cart and reads the cart
 * back before saying anything was added.
 */
(function () {
  'use strict';
  const entry = document.getElementById('skin-studio');
  const E = window.SkinStudioEngine;
  const Story = window.SkinStory;
  if (!entry || !E || !Story) return;

  const PREVIEW = !!window.OUJI_SKIN_STUDIO_PREVIEW;
  // The site's language switch (shopify.js) reloads the page, so read it once.
  const EN = (() => { try { return typeof getLang === 'function' ? getLang() === 'en' : localStorage.getItem('ouji:lang') === 'en'; } catch (_) { return false; } })();
  const L = (zh, en) => (EN ? en : zh);
  E.setLang(EN ? 'en' : 'zh');
  const OUT = 'cubic-bezier(.16,1,.3,1)';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const money = n => `HK$${new Intl.NumberFormat('zh-HK', {maximumFractionDigits:2}).format(n)}`;
  const NAMES = Object.fromEntries(Object.keys(E.STEP_NAMES).map(k => [k, E.stepName(k)]));
  // Chinese wraps between any two characters, so 「溫和」 can land on two lines.
  // Segment into words and let lines break only between them.
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('zh-Hant', {granularity:'word'}) : null;
  const words = s => !EN && segmenter ? [...segmenter.segment(String(s ?? ''))].map(x => esc(x.segment)).join('<wbr>') : esc(s);

  const ans = E.blankAnswers();
  let step = 0, furthest = 0, result = null, pool = null, poolLoad = null, packed = false;
  let dialog, sheet, story, heroStory, entryStory, lastFocus;
  let motionOff = false;
  try { motionOff = localStorage.getItem('ouji:skin-studio:motion') === 'off'; } catch (_) { /* storage may be blocked */ }
  const paused = () => motionOff;
  const still = () => motionOff || reduced();

  /* ── pictures ─────────────────────────────────────────────────────── */

  const svg = (body, size = 40, box = 40) => `<svg viewBox="0 0 ${box} ${box}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const DROP = 'M20 6c-5 7-10 12-10 18a10 10 0 0 0 20 0c0-6-5-11-10-18Z';
  const CONCERN_ART = {
    dry:svg(`<path d="${DROP}" fill="var(--tone)"/><path d="m18 17 3 3-3 3 3 3"/>`),
    oil:svg(`<path d="${DROP}" fill="var(--tone)"/><path d="M15 24a5 5 0 0 0 4 5"/><path d="M31 7v6m-3-3h6"/>`),
    pore:svg(`<circle cx="20" cy="20" r="13" fill="var(--tone)"/><g fill="currentColor" stroke="none"><circle cx="15" cy="15" r="1.4"/><circle cx="21" cy="13" r="1.4"/><circle cx="26" cy="18" r="1.4"/><circle cx="14" cy="22" r="1.4"/><circle cx="20" cy="21" r="1.4"/><circle cx="25" cy="25" r="1.4"/><circle cx="18" cy="27" r="1.4"/></g>`),
    acne:svg(`<path d="M6 29h28"/><path d="M10 29c0-5 3-7 5.5-7s5.5 2 5.5 7M22 29c0-3.5 2-5 4-5s4 1.5 4 5" fill="var(--tone)"/><path d="M15 15v2m11-5v2"/>`),
    dull:svg(`<circle cx="20" cy="20" r="12" fill="var(--tone)"/><path d="M20 8a12 12 0 0 1 0 24Z" fill="currentColor" stroke="none" opacity=".22"/><path d="M33 9l-2 2"/>`),
    spot:svg(`<circle cx="20" cy="20" r="13" fill="var(--tone)"/><g fill="currentColor" stroke="none"><circle cx="15" cy="17" r="2.8" opacity=".5"/><circle cx="24.5" cy="23.5" r="3.6" opacity=".4"/><circle cx="24" cy="14" r="1.7" opacity=".5"/></g>`),
    sensitive:svg(`<path d="M8 13c3-3 5 3 8 0s5 3 8 0 5 3 8 0"/><ellipse cx="13.5" cy="25" rx="4.5" ry="3" fill="var(--tone)"/><ellipse cx="26.5" cy="25" rx="4.5" ry="3" fill="var(--tone)"/>`),
    barrier:svg(`<path d="M20 5 32 9.5v9C32 27 26 32 20 35 14 32 8 27 8 18.5v-9Z" fill="var(--tone)"/><path d="M8.5 16h23M9 23h22M15 16v7m10-7v7M20 23v9"/>`),
    wrinkle:svg(`<circle cx="20" cy="20" r="14" fill="var(--tone)" stroke="none"/><path d="M9 14c4-3 7 3 11 0s7 3 11 0M9 20.5c4-3 7 3 11 0s7 3 11 0M9 27c4-3 7 3 11 0s7 3 11 0"/>`),
    steady:svg(`<path d="M20 31s-10-6-10-13a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 7-10 13-10 13Z" fill="var(--tone)"/>`, 22)
  };
  const STEP_ART = {
    remover:svg('<path d="M12 15h12v18a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3Z" fill="var(--tone)"/><path d="M15 15v-4h6v4M18 11V7h8"/><path d="M27 18c1.5 2 3 3.5 3 5a3 3 0 0 1-6 0c0-1.5 1.5-3 3-5Z"/>'),
    cleanse:svg('<path d="M13 6h14l-2 26a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3Z" fill="var(--tone)"/><path d="M17 35v-1M23 35v-1M14 13h12"/>'),
    toner:svg('<path d="M14 11h12v22a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3Z" fill="var(--tone)"/><path d="M16 11V6h8v5M14 20h12"/>'),
    serum:svg('<path d="M13 18h14v15a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z" fill="var(--tone)"/><path d="M17 18v-5h6v5M18 13V6a2 2 0 0 1 4 0v7"/>'),
    cream:svg('<path d="M8 19h24v12a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill="var(--tone)"/><path d="M7 14h26v5H7Z"/>'),
    sun:svg('<path d="M14 12h12l-1.5 21a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3Z" fill="var(--tone)"/><path d="M16 12V8h8v4"/><circle cx="20" cy="23" r="3.2"/><path d="M20 17.5v1.2m0 8.6v1.2m-5.5-5.5h1.2m8.6 0h1.2"/>'),
    mask:svg('<path d="M20 6c8 0 12 6 12 14 0 9-6 14-12 14S8 29 8 20C8 12 12 6 20 6Z" fill="var(--tone)"/><path d="M14 17h3m6 0h3M17 27c2 1 4 1 6 0"/>')
  };
  function face(type) {
    let marks = '';
    if (type === 'dry') marks = '<path d="m12 25 3-2m-2 6 3-2m9-2 3 2m-3 1 3 2" stroke="#b98c70"/>';
    if (type === 'oily') marks = '<path d="m20 10 3 5-3 3-3-3Z" fill="#c9dfd9"/><path d="m11 24 2 3-2 2-2-2Zm18 0 2 3-2 2-2-2Z" fill="#c9dfd9"/>';
    if (type === 'combo') marks = '<path d="M13 12h14v5h-5v11h-4V17h-5Z" fill="#c9dfd9" stroke="none"/>';
    if (type === 'normal') marks = '<path d="m29 9 1-4 2 4 4 1-4 2-2 3-1-3-3-2Z" fill="#e6d4ac" stroke="none"/>';
    return `<svg viewBox="0 0 40 44" width="40" height="44" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M9 18C7 2 33 2 31 18v7c-1 10-7 15-11 15S10 35 9 25Z" fill="#f7efe3"/>${marks}<path d="M13 20h3m8 0h3m-7 1-1 6h3m-5 5c2 1 4 1 6 0"/><path d="M9 17C5 4 24-3 31 13"/></svg>`;
  }
  const check = svg('<path d="m9 21 7 7 15-16"/>', 14);
  const ARROW = svg('<path d="M9 20h22m-8-8 8 8-8 8"/>', 18);
  const motionLabel = () => motionOff ? L('播放動畫', 'Play animation') : L('暫停動畫', 'Pause animation');
  const motionIcon = () => motionOff ? svg('<path d="M15 11v18l14-9Z" fill="currentColor"/>', 16) : svg('<path d="M15 11v18M25 11v18" stroke-width="3"/>', 16);

  /* ── the shelf ────────────────────────────────────────────────────── */

  const getJSON = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
  function loadPool() {
    if (pool) return Promise.resolve(pool);
    if (!poolLoad) {
      // Same hourly snapshot the category grid reads, so price and stock agree.
      const hour = Math.floor(Date.now() / 3600000);
      poolLoad = Promise.all([getJSON('/data/attrs.json'), getJSON(`/data/catalog.json?v=${hour}`), getJSON('/ingredients.json'),
        EN ? getJSON(`/data/catalog-en.json?v=${hour}`) : null])
        .then(([attrs, cat, ing, catEn]) => {
          let shelf = E.buildPool(attrs, cat, ing);
          // English shoppers read the English catalogue's names; a product
          // without one is left off rather than shown in Chinese.
          if (catEn) {
            const names = new Map((catEn.v || []).map(e => [e.node?.handle, e.node?.title]));
            shelf = shelf.filter(p => names.get(p.handle)).map(p => ({...p, titleEn:names.get(p.handle)}));
          }
          pool = shelf;
          if (pool.length < 20) throw new Error('shelf too small');
          return pool;
        })
        .catch(err => { poolLoad = null; throw err; });
    }
    return poolLoad;
  }

  // Titles carry brand and English name; the card wants the shop's Chinese name.
  function shortName(p) {
    const title = EN && p.titleEn ? p.titleEn : p.title;
    const letters = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const brand = letters(p.vendor);
    const words = title.split(/\s+/);
    let lead = '';
    while (words.length && !/[㐀-鿿]/.test(words[0]) && brand.startsWith(lead + letters(words[0])) && letters(words[0])) lead += letters(words.shift());
    // English titles often read "Brand - Product"; drop the joiner with the brand.
    let name = words.join(' ').replace(/^[\s\-–—:|·]+/, '');
    const cjk = name.search(/[㐀-鿿]/);
    if (cjk >= 0) {
      const english = name.slice(cjk).search(/\s[A-Za-z][A-Za-z'’]{2,}/);
      if (english > 0) name = name.slice(0, cjk + english);
    }
    return name.replace(/\[[^\]]*\]|【[^】]*】/g, '').replace(/\s+[\d.]+\s*$/, '').replace(/\s{2,}/g, ' ').trim() || title;
  }
  function sizeOf(p) {
    const m = p.variantTitle ? [0, p.variantTitle] : p.title.match(/\[([^\]]*\d[^\]]*)\]/) || p.title.match(/(\d+(?:\.\d+)?\s?(?:ml|g|毫升|克|片|枚))(?![a-z])/i);
    const size = m ? m[1] : '';
    return EN ? size.replace(/毫升/g, 'ml').replace(/克/g, 'g').replace(/(\d)\s*[片枚]/g, '$1 pcs') : size;
  }
  const productUrl = p => `/products/${encodeURIComponent(p.handle)}?variant=${String(p.variantId).split('/').pop()}`;

  /* ── the invitation ───────────────────────────────────────────────── */

  function mountEntry() {
    const label = result ? L('睇返我嘅護膚單', 'See my routine') : step || ans.concerns.length ? L('繼續揀', 'Continue') : L('開始揀', 'Start');
    entry.setAttribute('data-no-i18n', '');
    entry.setAttribute('aria-label', L('護膚小幫手', 'Skincare helper'));
    entry.innerHTML = `<div class="sr-entry-art">${Story.entryMarkup()}</div>
      <div class="sr-entry-copy"><h2>${L('答 4 條問題，<br>芝麻幫你<span class="sr-nowrap">執一套護膚</span>', 'Answer 4 questions,<br>Shima packs you <span class="sr-nowrap">a skincare set</span>')}</h2><p class="sr-entry-sub">${L('按膚質、困擾、質地同預算配搭', 'Matched to your skin, concerns, texture and budget')}</p></div>
      <div class="sr-entry-action"><button type="button" class="sr-cta" data-open>${label}${ARROW}</button></div>
      <button type="button" class="sr-motion sr-motion--entry" data-act="motion" aria-pressed="${motionOff}" aria-label="${motionLabel()}">${motionIcon()}</button>`;
    entryStory?.destroy();
    // The banner rests while the studio covers it.
    entryStory = Story.mountEntry(entry.querySelector('[data-entry-story]'), {paused:() => motionOff || !!dialog?.open});
    const open = entry.querySelector('[data-open]');
    ['pointerenter', 'focus', 'touchstart'].forEach(ev => open.addEventListener(ev, () => loadPool().catch(() => {}), {once:true, passive:true}));
    open.addEventListener('click', () => openStudio());
    entry.querySelector('[data-act="motion"]').addEventListener('click', toggleMotion);
  }

  function toggleMotion() {
    motionOff = !motionOff;
    try { localStorage.setItem('ouji:skin-studio:motion', motionOff ? 'off' : 'on'); } catch (_) { /* this tab still remembers */ }
    document.querySelectorAll('[data-act="motion"]').forEach(b => {
      b.setAttribute('aria-pressed', String(motionOff));
      b.setAttribute('aria-label', motionLabel());
      b.innerHTML = motionIcon();
    });
    [entryStory, story, heroStory].forEach(s => s?.sync());
  }

  /* ── the studio ───────────────────────────────────────────────────── */

  const STEPS = EN ? [
    {label:'Concerns', title:'What would you most like to improve?', help:'Pick up to three. Your first pick comes first.'},
    {label:'Skin', title:'What is your skin like?', help:'Pick what is closest to your usual skin.'},
    {label:'Texture', title:'Which texture do you like?', help:'Mainly affects cream and serum.'},
    {label:'Your set', title:'How many products this time?', help:'Skip anything you already use and like.'}
  ] : [
    {label:'想改善', title:'今次最想改善啲咩？', help:'揀最多三樣，第一樣揀嘅最優先。'},
    {label:'膚質', title:'你嘅皮膚係點？', help:'揀最似你平日嘅狀態。'},
    {label:'質地', title:'鍾意邊種質地？', help:'主要影響面霜同精華。'},
    {label:'件數預算', title:'今次想執幾多件？', help:'用緊又啱用嘅，今次可以唔買。'}
  ];

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'sr-studio';
    dialog.setAttribute('data-no-i18n', '');
    dialog.setAttribute('aria-labelledby', 'sr-title');
    document.body.appendChild(dialog);
    dialog.addEventListener('click', onClick);
    dialog.addEventListener('change', onChange);
    dialog.addEventListener('cancel', e => { e.preventDefault(); closeStudio(); });
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeStudio();
    });
  }

  function openStudio() {
    ensureDialog();
    lastFocus = document.activeElement;
    loadPool().catch(() => {});
    if (result) renderResults({reveal:false});
    else renderQuiz();
    dialog.showModal();
    entryStory?.sync();
    document.documentElement.classList.add('sr-locked');
    if (!still()) dialog.animate([{opacity:0, transform:'translateY(14px) scale(.985)'}, {opacity:1, transform:'none'}], {duration:300, easing:OUT});
    focusTitle();
  }

  function closeStudio() {
    sheet?.open && sheet.close();
    story?.skip();
    dialog.close();
    document.documentElement.classList.remove('sr-locked');
    mountEntry();
    (lastFocus && document.contains(lastFocus) ? lastFocus : entry.querySelector('[data-open]'))?.focus({preventScroll:true});
  }

  const focusTitle = () => requestAnimationFrame(() => dialog.querySelector('#sr-title')?.focus({preventScroll:true}));

  function header(title) {
    return `<header class="sr-top"><span class="sr-top-label"><img src="/assets/images/shima-v5/face.webp" width="30" height="30" alt="">${title}</span>
      <span class="sr-top-tools"><button type="button" class="sr-motion" data-act="motion" aria-pressed="${motionOff}" aria-label="${motionLabel()}">${motionIcon()}</button><button type="button" class="sr-close" data-act="close" aria-label="${L('關閉，繼續睇貨', 'Close and keep browsing')}">${svg('<path d="M11 11l18 18M29 11 11 29"/>', 22)}</button></span></header>`;
  }

  function renderQuiz() {
    heroStory?.destroy(); heroStory = null;
    dialog.dataset.view = 'quiz';
    dialog.innerHTML = `${header(L('芝麻嘅海邊小店', "Shima's seaside shop"))}<div class="sr-quiz"><div class="sr-art">${Story.stageMarkup()}</div><section class="sr-panel"><nav class="sr-progress" aria-label="${L('進度', 'Progress')}"></nav><div class="sr-scroll"></div><footer class="sr-foot"></footer></section></div>`;
    story?.destroy();
    story = Story.mount(dialog.querySelector('[data-story]'), {paused});
    story.go(step, {instant:true});
    drawStep(0);
  }

  /* One step on screen. The old question falls away while the new one rises,
     so there is never a blank frame between them. */
  function drawStep(dir) {
    furthest = Math.max(furthest, step);
    const scroll = dialog.querySelector('.sr-scroll');
    const old = scroll.firstElementChild;
    const q = STEPS[step];
    const node = document.createElement('div');
    node.className = 'sr-q';
    node.innerHTML = `<h2 id="sr-title" class="sr-enter" tabindex="-1">${q.title}</h2><p class="sr-help sr-enter">${q.help}</p>${[concernStep, skinStep, textureStep, routineStep][step]()}<p class="sr-note" role="status" aria-live="polite"></p>`;
    if (old && dir && !still()) {
      old.removeAttribute('id');
      old.querySelector('#sr-title')?.removeAttribute('id');
      old.classList.add('is-leaving');
      old.style.top = `${-scroll.scrollTop}px`;
      old.animate([{opacity:1, transform:'translateX(0)'}, {opacity:0, transform:`translateX(${-dir * 12}px)`}], {duration:110, easing:'ease-in', fill:'forwards'})
        .finished.catch(() => {}).finally(() => old.remove());
    } else old?.remove();
    scroll.appendChild(node);
    scroll.scrollTop = 0;
    dialog.classList.remove('is-compact');
    if (!scroll.dataset.watch) {
      scroll.dataset.watch = '1';
      scroll.addEventListener('scroll', () => {
        const y = scroll.scrollTop;
        if (y > 40) dialog.classList.add('is-compact');
        else if (y < 8) dialog.classList.remove('is-compact');
      }, {passive:true});
    }
    if (dir && !still()) {
      [...node.querySelectorAll('.sr-enter')].forEach((el, i) => el.animate(
        [{opacity:0, transform:`translate(${dir * 12}px, 4px)`}, {opacity:1, transform:'none'}],
        {duration:280, delay:100 + Math.min(i, 10) * 22, easing:OUT, fill:'backwards'}));
    }
    drawProgress();
    drawFoot();
    story.go(step);
    if (dir) focusTitle();
  }

  // Kept between steps so the bar can grow into the next segment.
  function drawProgress() {
    const nav = dialog.querySelector('.sr-progress');
    if (!nav.firstElementChild) nav.innerHTML = `<ol>${STEPS.map((s, i) => `<li><button type="button" data-act="goto" data-step="${i}"><span class="sr-progress-bar"></span><span class="sr-progress-label"><b>${i + 1}</b>${s.label}</span></button></li>`).join('')}</ol>`;
    nav.querySelectorAll('li').forEach((li, i) => {
      li.className = i < step ? 'is-done' : i === step ? 'is-now' : '';
      const b = li.firstElementChild;
      b.disabled = i > furthest;
      if (i === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }

  const ready = () => step === 0 ? ans.concerns.length > 0 : step === 1 ? Boolean(ans.skin && ans.sens) : true;
  function drawFoot() {
    const last = step === STEPS.length - 1;
    dialog.querySelector('.sr-foot').innerHTML = `<button type="button" class="sr-back" data-act="back">${step ? L('上一步', 'Back') : L('返去睇貨', 'Back to shop')}</button><button type="button" class="sr-next" data-act="next" ${ready() ? '' : 'disabled'}>${last ? L('幫我執好', 'Pack my set') : L('下一步', 'Next')}${ARROW}</button>`;
  }
  function syncReady() {
    const next = dialog.querySelector('[data-act="next"]');
    if (next) next.disabled = !ready();
  }

  const pressed = on => `aria-pressed="${on}"`;
  function concernStep() {
    const tiles = E.CONCERNS.map(c => {
      const n = ans.concerns.indexOf(c.id) + 1;
      return `<button type="button" class="sr-tile sr-enter ${n ? 'is-picked' : ''}" data-act="concern" data-id="${c.id}" ${pressed(!!n)} style="--tone:var(--tone-${c.id})"><span class="sr-tile-art">${CONCERN_ART[c.id]}</span><b>${E.concernName(c.id)}</b><small>${E.concernHint(c.id)}</small><span class="sr-badge" aria-hidden="true">${n || ''}</span></button>`;
    }).join('');
    const steady = ans.concerns.includes('steady');
    return `<div class="sr-tiles sr-tiles--concern">${tiles}</div><button type="button" class="sr-quiet sr-enter ${steady ? 'is-picked' : ''}" data-act="concern" data-id="steady" ${pressed(steady)} style="--tone:var(--tone-steady)">${CONCERN_ART.steady}${L('冇特別困擾，維持就好', 'No particular concern, just keep it healthy')}</button>`;
  }

  const unsureSkin = () => L('唔肯定自己膚質', 'Not sure of my skin type');
  function skinStep() {
    const skins = EN ? [['dry', 'Dry', 'Tight, flaky'], ['normal', 'Balanced', 'Not too dry or oily'], ['combo', 'Combination', 'Oily T-zone, dry cheeks'], ['oily', 'Oily', 'Shiny by day']]
      : [['dry', '偏乾', '易繃、起皮'], ['normal', '平衡', '唔太乾唔太油'], ['combo', '混合', 'T 字油、兩頰乾'], ['oily', '偏油', '日間會反光']];
    const sens = EN ? [['rare', 'Rarely'], ['sometimes', 'Sometimes'], ['often', 'Easily'], ['unknown', 'Not sure']]
      : [['rare', '好少'], ['sometimes', '有時'], ['often', '好容易'], ['unknown', '唔肯定']];
    return `<fieldset class="sr-group sr-enter"><legend>${L('膚質', 'Skin type')}</legend><div class="sr-tiles sr-tiles--skin">${skins.map(([v, t, d]) => `<button type="button" class="sr-tile sr-tile--row ${ans.skin === v ? 'is-picked' : ''}" data-act="skin" data-v="${v}" ${pressed(ans.skin === v)}><span class="sr-tile-art">${face(v)}</span><b>${t}</b><small>${d}</small><span class="sr-badge" aria-hidden="true">${check}</span></button>`).join('')}</div>
      <button type="button" class="sr-link ${ans.skin === 'unknown' ? 'is-picked' : ''}" data-act="skin" data-v="unknown" ${pressed(ans.skin === 'unknown')}>${ans.skin === 'unknown' ? check : ''}${unsureSkin()}</button></fieldset>
      <fieldset class="sr-group sr-enter"><legend>${L('用新產品，會唔會刺痛、痕或泛紅？', 'Do new products sting, itch or turn you red?')}</legend><div class="sr-segment">${sens.map(([v, t]) => `<button type="button" class="${ans.sens === v ? 'is-picked' : ''}" data-act="sens" data-v="${v}" ${pressed(ans.sens === v)}>${t}</button>`).join('')}</div></fieldset>
      <fieldset class="sr-group sr-safety sr-enter"><legend>${L('有以下情況就剔', 'Tick if either applies')}</legend>
        <label class="sr-check"><input type="checkbox" name="issue" ${ans.issue ? 'checked' : ''}><span>${L('皮膚而家紅腫、刺痛，或者用緊醫生處方藥膏', 'My skin is red, swollen or stinging now, or I use a prescription cream')}</span></label>
        <label class="sr-check"><input type="checkbox" name="preg" ${ans.preg ? 'checked' : ''}><span>${L('懷孕或者餵緊母乳（會避開 A 醇類）', 'Pregnant or breastfeeding (retinoids will be avoided)')}</span></label></fieldset>`;
  }

  function textureStep() {
    const tex = EN ? [['1', 'Light & watery', 'Light, absorbs fast'], ['2', 'Soft & balanced', 'Hydrating, not heavy'], ['3', 'Rich & cocooning', 'Dense, lasts longer']]
      : [['1', '清爽水感', '輕盈、快吸收'], ['2', '柔潤適中', '保濕但唔厚'], ['3', '滋潤包覆', '綿密、包得住']];
    return `<div class="sr-tiles sr-tiles--texture">${tex.map(([v, t, d]) => `<button type="button" class="sr-tile sr-tile--texture sr-enter ${ans.tex === v ? 'is-picked' : ''}" data-act="tex" data-v="${v}" ${pressed(ans.tex === v)}><span class="sr-swatch sr-swatch--${v}" aria-hidden="true"><i></i></span><b>${t}</b><small>${d}</small><span class="sr-badge" aria-hidden="true">${check}</span></button>`).join('')}</div>
      <button type="button" class="sr-quiet sr-enter ${ans.tex === 'auto' ? 'is-picked' : ''}" data-act="tex" data-v="auto" ${pressed(ans.tex === 'auto')}>${L('冇偏好，按我膚質揀', 'No preference, choose for my skin')}</button>
      <fieldset class="sr-group sr-enter sr-group--after"><legend>${L('日日有冇化妝或者搽防曬？', 'Do you wear makeup or sunscreen every day?')}</legend><div class="sr-segment sr-segment--2">${[['1', L('有，要卸妝', 'Yes, I need a remover')], ['0', L('冇', 'No')]].map(([v, t]) => `<button type="button" class="${String(+ans.makeup) === v ? 'is-picked' : ''}" data-act="makeup" data-v="${v}" ${pressed(String(+ans.makeup) === v)}>${t}</button>`).join('')}</div></fieldset>`;
  }

  function routineStep() {
    const routines = [['basic', L('精簡三步', '3 essentials'), E.ROUTINES.basic], ['full', L('完整五步', 'Full 5 steps'), E.ROUTINES.full], ['one', L('只補一件', 'Just one'), ['serum']]];
    const steps = ['remover', 'cleanse', 'toner', 'serum', 'cream', 'sun'];
    const chip = (act, v, on, text, off) => `<button type="button" class="sr-chip ${on ? 'is-picked' : ''}" data-act="${act}" data-v="${v}" ${pressed(on)} ${off ? 'disabled' : ''}>${on ? check : ''}${text}</button>`;
    const one = ans.routine === 'one';
    // The cheapest set these answers allow, so a budget that cannot work is
    // greyed out before it is picked rather than refused at the end.
    const floor = pool ? E.recommend(pool, {...ans, budget:0}).minimum || 0 : 0;
    if (floor && ans.budget && ans.budget < floor) ans.budget = 0;
    const shown = (one ? [] : E.ROUTINES[ans.routine]);
    return `<div class="sr-tiles sr-tiles--routine">${routines.map(([v, t, row]) => `<button type="button" class="sr-tile sr-tile--routine sr-enter ${ans.routine === v ? 'is-picked' : ''}" data-act="routine" data-v="${v}" ${pressed(ans.routine === v)}><span class="sr-pictos" aria-hidden="true">${row.map(s => `<i style="--tone:var(--tone-${s})">${STEP_ART[s]}</i>`).join('')}${v === 'one' ? `<i class="sr-plus">${svg('<path d="M20 11v18M11 20h18"/>', 18)}</i>` : ''}</span><b>${t}</b><small>${(EN ? {basic:'Cleanser · cream · sunscreen', full:'Adds toner and serum', one:'Pick one step'} : {basic:'潔面・面霜・防曬', full:'再加爽膚水、精華', one:'自己揀一步'})[v]}</small><span class="sr-badge" aria-hidden="true">${check}</span></button>`).join('')}</div>
      ${one ? `<div class="sr-row sr-enter"><p class="sr-row-label">${L('補邊一步？', 'Which step?')}</p><div class="sr-chips">${steps.map(s => chip('single', s, ans.single === s, NAMES[s])).join('')}</div></div>`
        : `<div class="sr-row sr-enter"><p class="sr-row-label">${L('已經有用緊、今次唔使買', 'Already using — skip this time')}</p><div class="sr-chips">${[...(ans.makeup ? ['remover'] : []), ...shown].map(s => chip('owned', s, ans.owned.includes(s), NAMES[s])).join('')}</div></div>`}
      <div class="sr-row sr-enter"><p class="sr-row-label">${L('預算', 'Budget')}</p><div class="sr-chips">${[[0, L('唔限', 'Any')], [300, L('$300 內', 'Under $300')], [500, L('$500 內', 'Under $500')], [800, L('$800 內', 'Under $800')]].map(([v, t]) => chip('budget', v, Number(ans.budget) === v, t, v && floor && v < floor)).join('')}</div>${floor && floor > 300 ? `<p class="sr-fine">${EN ? `For your answers, this set starts at ${money(floor)}${ans.routine === 'full' ? '; “3 essentials” costs less' : ''}.` : `按你嘅答案，呢套最少要 ${money(floor)}${ans.routine === 'full' ? '；揀「精簡三步」會平啲' : ''}。`}</p>` : ''}</div>
      <details class="sr-more sr-enter" ${ans.want.length || ans.avoid.length ? 'open' : ''}><summary><b>${L('有指定成分？', 'Specific ingredients?')}</b><span>${L('選填', 'Optional')}</span></summary>
        <div class="sr-row"><p class="sr-row-label">${L('想要', 'Want')}</p><div class="sr-chips">${E.ACTIVES.map(x => chip('want', x, ans.want.includes(x), E.activeName(x))).join('')}</div></div>
        <div class="sr-row"><p class="sr-row-label">${L('要避開', 'Avoid')}</p><div class="sr-chips">${E.FLAGS.map(x => chip('avoid', x, ans.avoid.includes(x), EN ? E.flagName(x).replace(/^./, c => c.toUpperCase()) : x)).join('')}</div></div>
        <p class="sr-fine">${L('避開成分只揀成分資料清楚嘅產品；資料未明嘅一律唔揀。', 'When avoiding ingredients, only products with clear ingredient data are picked.')}</p>
      </details>`;
  }

  /* ── answering ────────────────────────────────────────────────────── */

  function note(text) {
    const el = dialog.querySelector('.sr-note');
    if (el) el.textContent = text;
  }

  function refreshTiles() {
    dialog.querySelectorAll('[data-act="concern"]').forEach(b => {
      const n = ans.concerns.indexOf(b.dataset.id) + 1;
      b.classList.toggle('is-picked', !!n);
      b.setAttribute('aria-pressed', String(!!n));
      const badge = b.querySelector('.sr-badge');
      if (badge) badge.textContent = n || '';
    });
  }

  // Step four redraws in place: chips appear and disappear with the routine.
  function redrawRoutine(focusSel) {
    const q = dialog.querySelector('.sr-q');
    const more = q.querySelector('.sr-more')?.open;
    const scroll = dialog.querySelector('.sr-scroll').scrollTop;
    q.innerHTML = `<h2 id="sr-title" tabindex="-1">${STEPS[3].title}</h2><p class="sr-help">${STEPS[3].help}</p>${routineStep()}<p class="sr-note" role="status" aria-live="polite"></p>`;
    const d = q.querySelector('.sr-more');
    if (d && more) d.open = true;
    dialog.querySelector('.sr-scroll').scrollTop = scroll;
    if (focusSel) q.querySelector(focusSel)?.focus({preventScroll:true});
  }

  function pickSingle(group, value) {
    dialog.querySelectorAll(`[data-act="${group}"]`).forEach(b => {
      const on = b.dataset.v === value;
      b.classList.toggle('is-picked', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function onChange(e) {
    const t = e.target;
    if (t.name === 'issue') { ans.issue = t.checked; result = null; }
    if (t.name === 'preg') { ans.preg = t.checked; result = null; }
  }

  function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !dialog.contains(b)) return;
    const act = b.dataset.act, v = b.dataset.v;
    if (['concern', 'skin', 'sens', 'tex', 'routine', 'single', 'owned', 'makeup', 'budget', 'want', 'avoid'].includes(act)) result = null;
    switch (act) {
      case 'close': closeStudio(); break;
      case 'motion': toggleMotion(); break;
      case 'concern': {
        const id = b.dataset.id;
        if (id === 'steady') ans.concerns = ans.concerns.includes('steady') ? [] : ['steady'];
        else if (ans.concerns.includes(id)) ans.concerns = ans.concerns.filter(x => x !== id);
        else if (ans.concerns.filter(x => x !== 'steady').length >= 3) { note(L('最多揀三樣。撳返已揀嘅，可以換第二樣。', 'Up to three. Tap a picked one to swap it.')); return; }
        else {
          ans.concerns = [...ans.concerns.filter(x => x !== 'steady'), id];
          story.react('concern', id, b.querySelector('.sr-tile-art'), CONCERN_ART[id]);
        }
        refreshTiles();
        const first = E.CONCERNS.find(c => c.id === ans.concerns[0]);
        note(first ? L(`已揀 ${ans.concerns.length} 樣，會先處理「${first.name}」。`, `${ans.concerns.length} picked; “${E.concernName(first.id)}” comes first.`) : ans.concerns.length ? L('好，揀返日常保養。', 'OK, everyday care it is.') : '');
        break;
      }
      case 'skin': ans.skin = v; pickSingle('skin', v); dialog.querySelector('.sr-link').innerHTML = `${v === 'unknown' ? check : ''}${unsureSkin()}`; story.react('skin', v, b.querySelector('.sr-tile-art') || b, face(v === 'unknown' ? 'normal' : v)); break;
      case 'sens': ans.sens = v; pickSingle('sens', v); story.react('sens', v, b, check); break;
      case 'tex': ans.tex = v; pickSingle('tex', v); story.react('texture', v, b.querySelector('.sr-swatch') || b, CONCERN_ART.oil); break;
      case 'routine': ans.routine = v; ans.owned = []; redrawRoutine(`[data-act="routine"][data-v="${v}"]`); story.react('routine', v, null); break;
      case 'single': ans.single = v; pickSingle('single', v); break;
      case 'owned': ans.owned = ans.owned.includes(v) ? ans.owned.filter(x => x !== v) : [...ans.owned, v]; redrawRoutine(`[data-act="owned"][data-v="${v}"]`); break;
      case 'makeup': ans.makeup = v === '1'; if (!ans.makeup) ans.owned = ans.owned.filter(x => x !== 'remover'); pickSingle('makeup', v); story.react('makeup', v, b, check); break;
      case 'budget': ans.budget = Number(v); redrawRoutine(`[data-act="budget"][data-v="${v}"]`); break;
      case 'want': ans.want = ans.want.includes(v) ? ans.want.filter(x => x !== v) : [...ans.want, v]; redrawRoutine(`[data-act="want"][data-v="${CSS.escape(v)}"]`); break;
      case 'avoid': ans.avoid = ans.avoid.includes(v) ? ans.avoid.filter(x => x !== v) : [...ans.avoid, v]; redrawRoutine(`[data-act="avoid"][data-v="${CSS.escape(v)}"]`); break;
      case 'goto': if (+b.dataset.step !== step) { const dir = +b.dataset.step > step ? 1 : -1; step = +b.dataset.step; drawStep(dir); } break;
      case 'back': if (step) { step--; drawStep(-1); } else closeStudio(); break;
      case 'next': if (!ready()) return; if (step < STEPS.length - 1) { step++; drawStep(1); } else finish(b); break;
      case 'edit': step = Math.min(3, Number(b.dataset.step) || 0); furthest = 3; renderQuiz(); focusTitle(); break;
      case 'add': addToBag([...result.picks, ...(result.extra ? [result.extra] : [])].filter(p => p.variantId === b.dataset.variant), b); break;
      case 'add-all': addToBag(result.picks, b); break;
      case 'swap': openSwap(b.dataset.step, b); break;
      case 'view-cart': closeStudio(); (window.matchMedia('(max-width:760px)').matches || !window.OUJI_cartFeedback?.open) ? (location.href = '/cart.html') : requestAnimationFrame(() => window.OUJI_cartFeedback.open()); break;
      case 'retry': finish(null); break;
      case 'skip': story?.skip(); break;
      case 'basic': ans.routine = 'basic'; ans.owned = []; finish(null); break;
      case 'nobudget': ans.budget = 0; finish(null); break;
      default: break;
    }
    syncReady();
  }

  /* ── packing: the one authored moment ─────────────────────────────── */

  async function finish(button) {
    if (button) { button.disabled = true; button.innerHTML = L('芝麻執緊…', 'Packing…'); }
    let shelf;
    try { shelf = await loadPool(); } catch (_) { renderProblem(); return; }
    result = E.recommend(shelf, ans);
    if (result.picks.length && !still() && !packed && dialog.dataset.view === 'quiz') { packed = true; await playPack(result.picks); }
    renderResults({reveal:true});
  }

  /* The shelf scene fills the bag while the question panel turns into her
     receipt, one line per product as it lands. */
  function playPack(picks) {
    const panel = dialog.querySelector('.sr-panel');
    const pack = document.createElement('div');
    pack.className = 'sr-pack';
    pack.innerHTML = `<h2 class="sr-pack-title" aria-live="polite">${L('芝麻幫你執緊…', 'Shima is packing…')}</h2>
      <ol class="sr-receipt">${picks.map(p => `<li><img src="${esc(p.image)}" alt="" width="52" height="52"><span><b>${NAMES[p.step]}</b>${words(shortName(p))}</span><em>${money(p.price)}</em></li>`).join('')}</ol>
      <p class="sr-receipt-total"><span>${L(`${picks.length} 件`, `${picks.length} items`)}</span><b>${money(result.total)}</b></p>
      <button type="button" class="sr-link" data-act="skip">${L('略過動畫', 'Skip animation')}</button>`;
    panel.appendChild(pack);
    dialog.querySelector('.sr-quiz')?.classList.add('is-packing');
    pack.animate([{opacity:0}, {opacity:1}], {duration:240, easing:'ease-out'});
    const rows = pack.querySelectorAll('.sr-receipt li');
    return story.pack(picks, {onCount:n => rows[n - 1]?.classList.add('is-in')})
      .then(() => {
        rows.forEach(r => r.classList.add('is-in'));
        pack.classList.add('is-done');
        pack.querySelector('.sr-pack-title').textContent = L('執好喇！', 'All packed!');
        return new Promise(r => setTimeout(r, 360));
      });
  }

  /* ── results ──────────────────────────────────────────────────────── */

  const addedVariants = new Set();
  const previewKey = 'ouji:skin-studio:preview-bag:v2';
  if (PREVIEW) { try { JSON.parse(sessionStorage.getItem(previewKey) || '[]').forEach(id => addedVariants.add(id)); } catch (_) { /* demo only */ } }
  let cartBusy = false, cartUnverified = false, cartMessage = '';

  function routineTitle() {
    const picks = result.picks;
    if (picks.length === 1) return L(`幫你揀咗一支${NAMES[picks[0].step]}`, `Your ${NAMES[picks[0].step].toLowerCase()}`);
    return L(`${picks.length} 件，由${NAMES[picks[0].step]}到${NAMES[picks[picks.length - 1].step]}`, `${picks.length} products, ${NAMES[picks[0].step].toLowerCase()} to ${NAMES[picks[picks.length - 1].step].toLowerCase()}`);
  }

  // One row per bottle, in the order she puts them on: what it is, what it
  // costs, and the two things she can do with it. Why it is here is told
  // per concern in the plan beside the list, not repeated on every row.
  function item(p, i, extraLabel) {
    const was = p.compareAt ? `<s>${money(p.compareAt)}</s>` : '';
    const size = sizeOf(p);
    return `<li class="sr-item${extraLabel ? ' sr-item--extra' : ''}" data-step="${p.step}" data-link="${extraLabel ? '' : p.step}">
      <p class="sr-item-step">${extraLabel ? `<b>${extraLabel}</b><small>${L('可選', 'Optional')}</small>` : `<b>${String(i + 1).padStart(2, '0')}</b><span>${NAMES[p.step]}</span><small>${E.usage(p)}</small>`}</p>
      <a class="sr-item-img" href="${productUrl(p)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><img src="${esc(p.image)}" alt="" width="120" height="120" loading="lazy" decoding="async"></a>
      <div class="sr-item-body">
        <p class="sr-brand">${esc(p.vendor)}</p>
        <h3 class="sr-name"><a href="${productUrl(p)}" target="_blank" rel="noopener" title="${esc(EN && p.titleEn ? p.titleEn : p.title)}">${words(shortName(p))}</a></h3>
        <p class="sr-lead">${words(extraLabel ? L('想再加強：每星期敷 2–3 次，唔計入成套', 'Extra boost: 2–3 times a week, not part of the set') : E.lead(p, ans))}</p>
      </div>
      <p class="sr-price-row"><b>${money(p.price)}</b>${was}${size ? `<span>${esc(size)}</span>` : ''}</p>
      <div class="sr-item-actions"><button type="button" class="sr-add" data-act="add" data-variant="${esc(p.variantId)}">${L('加入購物車', 'Add to cart')}</button>${extraLabel ? '' : `<button type="button" class="sr-swap" data-act="swap" data-step="${p.step}">${svg('<path d="M9 14h20l-5-5M31 26H11l5 5"/>', 15)}${L('換一款', 'Swap')}</button>`}</div>
    </li>`;
  }

  // A mask as an optional extra: its own button, never inside 「全部加入」.
  function extraBlock() {
    result.extra = result.extra === undefined ? (pool ? E.extra(pool, ans, result.picks) : null) : result.extra;
    const p = result.extra;
    if (!p) return '';
    return `<ul class="sr-routine sr-routine--extra" aria-label="${L('可選加強', 'Optional extra')}">${item(p, 0, NAMES.mask)}</ul>`;
  }

  function howTo() {
    const picks = result.picks;
    const am = picks.filter(p => p.step !== 'remover' && p.am).map(p => p.step);
    const pm = picks.filter(p => p.step !== 'sun' && p.pm).map(p => p.step);
    const row = (label, icon, list) => list.length ? `<div class="sr-howto-row"><p>${icon}<b>${label}</b></p><ol>${list.map(s => `<li>${NAMES[s]}</li>`).join('')}</ol></div>` : '';
    const sun = svg('<circle cx="20" cy="20" r="6"/><path d="M20 6v4m0 20v4M6 20h4m20 0h4M10 10l3 3m14 14 3 3M10 30l3-3m14-14 3-3"/>', 16);
    const moon = svg('<path d="M28 25A11 11 0 0 1 15 12a11 11 0 1 0 13 13Z"/>', 16);
    return picks.length > 1 ? `<section class="sr-howto" aria-label="${L('點樣用', 'How to use')}">${row(L('早上', 'AM'), sun, am)}${row(L('夜晚', 'PM'), moon, pm)}</section>` : '';
  }

  // Each concern she ranked, in her order: how a routine goes about it, then
  // the bottles in this set that do it and with what. Then the rest of her
  // answers the set honours (sensitivity, skin, texture, pregnancy).
  function plan() {
    const picks = result.picks;
    const {concerns, care} = E.explain(picks, ans);
    if (!concerns.length && !care.length && !ans.budget) return '';
    const by = x => { const p = picks[x.i]; return `<li data-link="${p.step}"><img src="${esc(p.image)}" alt="" width="56" height="56" loading="lazy" decoding="async"><b>${NAMES[p.step]}</b><span>${words(x.text)}</span></li>`; };
    const cap = concerns.length >= 3 ? 2 : 3;
    const rows = concerns.map((c, n) => `<li class="sr-plan-item" style="--tone:var(--tone-${c.id})">
        <p class="sr-plan-head"><i aria-hidden="true">${n + 1}</i><b>${esc(c.name)}</b><span>${words(c.approach)}</span></p>
        ${c.met && c.items.length ? `<ul class="sr-plan-by">${c.items.slice(0, cap).map(by).join('')}</ul>`
          : `<p class="sr-plan-miss">${words(EN ? `Nothing in this set targets ${c.name.toLowerCase()} yet${ans.routine === 'basic' ? '; “Full 5 steps” adds a serum' : ''}.` : `今次未揀到針對${c.name}嘅產品${ans.routine === 'basic' ? '，試「完整五步」會加埋精華' : ''}。`)}</p>`}
      </li>`).join('');
    // Her answers are told here once, so the budget joins them.
    const lines = ans.budget ? [...care, {label:L('預算', 'Budget'), text:L(`${money(ans.budget)} 內，呢套 ${money(result.total)}`, `Under ${money(ans.budget)}; this set is ${money(result.total)}`)}] : care;
    const careRows = lines.map(c => `<li>${check}<b>${esc(c.label)}</b><span>${words(c.text)}</span></li>`).join('');
    return `<section class="sr-plan" aria-labelledby="sr-plan-title"><h3 id="sr-plan-title">${concerns.length ? L('點樣幫你解決', 'How this set helps') : L('照顧到你嘅要求', 'What it takes care of')}</h3>
      ${rows ? `<ol class="sr-plan-list">${rows}</ol>` : ''}${careRows ? `<ul class="sr-care">${careRows}</ul>` : ''}</section>`;
  }

  function method() {
    const n = pool ? pool.length : 0;
    const aad = '<a href="https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-budget" target="_blank" rel="noopener">';
    return EN ? `<details class="sr-method"><summary>How we pick &amp; where the data comes from</summary><div>
      <p><b>How we pick</b>From the ${n} labelled, in-stock skincare products in the shop: first we drop anything that does not suit your skin, sensitivity or ingredients to avoid, then rank by your concerns in order, texture and budget. A set is never one brand just because of the ranking.</p>
      <p><b>Ingredient data</b>Products with a published full ingredient list say “ingredient list”; others say “as far as we know”. When you avoid ingredients, products with unclear data are never picked.</p>
      <p><b>Not a diagnosis</b>This is a starting point for shopping, not treatment. For lasting redness, pain or scarring, see a doctor. Skincare principles follow the ${aad}American Academy of Dermatology</a>.</p>
      <p><b>Starting something new</b>Add one product at a time: try it on your inner arm for a few days first.</p>
      <p><b>Prices &amp; stock</b>From the shop's latest catalogue; your cart shows the final price.</p>
    </div></details>` : `<details class="sr-method"><summary>點樣揀、資料點嚟</summary><div>
      <p><b>點樣揀</b>由全店 ${n} 件有標籤、有貨嘅護膚品入面揀：先排除唔啱你膚質、刺激程度同要避開成分嘅，再按你揀嘅困擾次序、質地同預算排。同一套唔會因為排序而全部同一個牌子。</p>
      <p><b>成分資料</b>有公開全成分表嘅寫「成分表」；未公開嘅寫「據我哋掌握」。要避開成分時，成分未明嘅產品一律唔揀。</p>
      <p><b>唔係診斷</b>推薦係購物起點，唔係治療。持續紅腫、痛或者留疤，請睇醫生。護膚原則參考 ${aad}美國皮膚科學會：精簡護膚</a>。</p>
      <p><b>新產品點開始</b>逐件加：先喺手臂內側試幾日，冇不適先搽面。</p>
      <p><b>價錢同存貨</b>跟網店目錄最新資料；落單時以購物車顯示為準。</p>
    </div></details>`;
  }

  // The shop's own thresholds, read the same way the cart drawer reads them.
  function offerLine(total) {
    const c = window.OUJI_COMMERCE || {};
    const save = c.spendSave || {threshold:399, amount:20};
    const gift = c.promotion?.gift?.threshold || 599;
    const net = total >= save.threshold ? total - save.amount : total;
    const text = EN
      ? (total < save.threshold ? `Spend ${money(save.threshold - total)} more for ${money(save.amount)} off`
        : net < gift ? `${money(save.amount)} off · spend ${money(gift - net)} more for a free cream` : `${money(save.amount)} off · free cream included`)
      : total < save.threshold ? `再買 ${money(save.threshold - total)} 即減 ${money(save.amount)}`
        : net < gift ? `已減 ${money(save.amount)}・再買 ${money(gift - net)} 送面霜` : `已減 ${money(save.amount)}・送面霜`;
    return `<p class="sr-offer">${text}</p>`;
  }

  function cartBar() {
    const picks = result.picks;
    const done = picks.every(p => addedVariants.has(p.variantId));
    const rest = picks.filter(p => !addedVariants.has(p.variantId)).length;
    const label = cartBusy ? L('加緊…', 'Adding…') : done ? L('已全部加入', 'All added') : addedVariants.size && picks.some(p => addedVariants.has(p.variantId)) ? L(`加埋其餘 ${rest} 件`, `Add the other ${rest}`) : L('全部加入購物車', 'Add all to cart');
    return `<div class="sr-cart-total"><span>${L(`${picks.length} 件・未計運費`, `${picks.length} items · shipping not included`)}</span><b>${money(result.total)}</b></div>
      <div class="sr-cart-actions">${done && !PREVIEW ? `<button type="button" class="sr-link" data-act="view-cart">${L('睇購物車', 'View cart')}</button>` : ''}<button type="button" class="sr-add-all ${done ? 'is-done' : ''}" data-act="add-all" ${cartBusy || cartUnverified || done ? 'disabled' : ''}>${done ? check : svg('<path d="M10 14h20l-2 18H12Z"/><path d="M15 14v-2a5 5 0 0 1 10 0v2"/>', 18)}${label}</button></div>
      ${offerLine(result.total)}
      ${cartMessage ? `<p class="sr-cart-note ${cartUnverified ? 'is-error' : ''}" role="status">${esc(cartMessage)}</p>` : '<p class="sr-cart-note" role="status"></p>'}`;
  }

  function emptyState() {
    const st = result.status;
    const edit = L('改答案', 'Change answers');
    const msg = (EN ? {
      hold:['Give your skin a rest before trying anything new', 'Check with a doctor or pharmacist first, and come back when it has settled.', [['edit', edit, 1]]],
      owned:['You already have everything', 'If it works for you, keep using it. No need to buy a set for the sake of it.', [['edit', edit, 3]]],
      budget:['That budget does not cover a set', `For your answers, the lowest is ${money(result.minimum || 0)}.`, [...(ans.routine === 'full' ? [['basic', 'Switch to 3 essentials']] : []), ['nobudget', 'Any budget'], ['edit', edit, 3]]],
      empty:['Nothing fits right now', 'Your conditions are strict, or the matching products just sold out.', [['edit', edit, 3]]]
    } : {
      hold:['皮膚而家唔舒服，先唔好換新產品', '建議先問醫生或者藥劑師；好返先再嚟揀。', [['edit', edit, 1]]],
      owned:['你已經有齊，唔使再買', '用得舒服就繼續用，唔使為咗成套而買。', [['edit', edit, 3]]],
      budget:['呢個預算，未夠一套', `按你嘅要求，最平都要 ${money(result.minimum || 0)}。`, [...(ans.routine === 'full' ? [['basic', '改做精簡三步']] : []), ['nobudget', '唔限預算'], ['edit', edit, 3]]],
      empty:['暫時揀唔到啱你嘅貨', '你嘅條件太嚴，或者啱嘅貨暫時賣晒。', [['edit', edit, 3]]]
    })[st] || [L('暫時揀唔到啱你嘅貨', 'Nothing fits right now'), L('可以改少少答案再試。', 'Try changing an answer or two.'), [['edit', edit, 0]]];
    return `<div class="sr-empty"><img src="/assets/images/shima-v5/empty-bag.webp" width="150" height="150" alt=""><h2 id="sr-title" tabindex="-1">${msg[0]}</h2><p>${msg[1]}</p><div>${msg[2].map(([act, label, s], i) => `<button type="button" class="${i ? 'sr-link' : 'sr-next'}" data-act="${act}" ${s !== undefined ? `data-step="${s}"` : ''}>${label}</button>`).join('')}</div></div>`;
  }

  function renderResults({reveal}) {
    story?.destroy(); story = null;
    heroStory?.destroy(); heroStory = null;
    dialog.dataset.view = 'results';
    const picks = result.picks;
    if (!picks.length) {
      dialog.innerHTML = `${header(L('芝麻嘅揀貨單', "Shima's list"))}<div class="sr-results sr-results--empty">${emptyState()}</div>`;
      focusTitle();
      return;
    }
    const missing = result.missing || [];
    dialog.innerHTML = `${header(L('芝麻幫你揀好喇', 'Shima picked these for you'))}<div class="sr-results"><div class="sr-results-scroll"><div class="sr-board">
      <section class="sr-hero"><div class="sr-hero-art">${Story.stageMarkup({only:'result'})}</div><div class="sr-hero-copy">
        <h2 id="sr-title" tabindex="-1">${words(routineTitle())}</h2>
        <button type="button" class="sr-edit" data-act="edit" data-step="0">${svg('<path d="M12 15a10 10 0 1 1-1 9"/><path d="M11 8v7h7"/>', 18)}${L('改答案', 'Change answers')}</button>
      </div></section>
      ${plan()}
      <section class="sr-set" aria-label="${L('你嘅一套', 'Your set')}">
        ${missing.length ? `<p class="sr-gap">${words(EN ? `No ${missing.map(s => NAMES[s].toLowerCase()).join(' or ')} fits your answers right now, so it is left out.` : `${missing.map(s => NAMES[s]).join('、')}暫時冇啱你條件嘅貨，所以留空。`)}</p>` : ''}
        <ol class="sr-routine">${picks.map((p, i) => item(p, i)).join('')}</ol>
        ${extraBlock()}${howTo()}
      </section>
      ${method()}
    </div></div><footer class="sr-cartbar">${cartBar()}</footer></div>`;
    heroStory = Story.mount(dialog.querySelector('.sr-hero [data-story]'), {paused});
    heroStory.go('result', {instant:true});
    syncAddButtons();
    linkHover(dialog.querySelector('.sr-board'));
    if (reveal && !still()) {
      dialog.querySelector('.sr-hero').animate([{opacity:0, transform:'translateY(10px)'}, {opacity:1, transform:'none'}], {duration:380, easing:OUT});
      dialog.querySelectorAll('.sr-plan-item, .sr-care').forEach((el, i) => el.animate([{opacity:0, transform:'translateY(10px)'}, {opacity:1, transform:'none'}], {duration:380, delay:100 + i * 80, easing:OUT, fill:'backwards'}));
      dialog.querySelectorAll('.sr-routine .sr-item').forEach((el, i) => el.animate([{opacity:0, transform:'translateX(14px)'}, {opacity:1, transform:'none'}], {duration:380, delay:160 + i * 60, easing:OUT, fill:'backwards'}));
      dialog.querySelector('.sr-cartbar').animate([{transform:'translateY(100%)'}, {transform:'none'}], {duration:420, delay:200, easing:OUT, fill:'backwards'});
    }
    focusTitle();
  }

  // Pointing at a bottle in the plan lights its row, and the other way round.
  function linkHover(board) {
    if (!board || !matchMedia('(hover: hover)').matches) return;
    const light = step => board.querySelectorAll('[data-link]').forEach(el => el.classList.toggle('is-linked', !!step && el.dataset.link === step));
    board.addEventListener('pointerover', e => light(e.target.closest('[data-link]')?.dataset.link || ''));
    board.addEventListener('pointerleave', () => light(''));
  }

  function renderProblem() {
    dialog.dataset.view = 'results';
    dialog.innerHTML = `${header(L('芝麻嘅揀貨單', "Shima's list"))}<div class="sr-results sr-results--empty"><div class="sr-empty"><img src="/assets/images/shima-v5/empty-bag.webp" width="150" height="150" alt=""><h2 id="sr-title" tabindex="-1">${L('貨架資料暫時載入唔到', 'The shelf did not load')}</h2><p>${L('網絡可能慢咗，再試一次就得。', 'The connection may be slow. Try again.')}</p><div><button type="button" class="sr-next" data-act="retry">${L('再試一次', 'Try again')}</button></div></div></div>`;
    focusTitle();
  }

  /* ── swapping one step ────────────────────────────────────────────── */

  function openSwap(stepName, trigger) {
    const current = result.picks.find(p => p.step === stepName);
    if (!current || !pool) return;
    const alts = E.alternatives(pool, ans, current, result.picks);
    if (!sheet) {
      sheet = document.createElement('dialog');
      sheet.className = 'sr-sheet';
      sheet.setAttribute('data-no-i18n', '');
      sheet.setAttribute('aria-labelledby', 'sr-sheet-title');
      document.body.appendChild(sheet);
      sheet.addEventListener('click', e => {
        if (e.target === sheet) { sheet.close(); return; }
        const b = e.target.closest('[data-pick],[data-sheet-close]');
        if (!b) return;
        if (b.dataset.sheetClose !== undefined) { sheet.close(); return; }
        swapTo(sheet.dataset.step, b.dataset.pick);
      });
      sheet.addEventListener('close', () => sheet.returnFocus?.focus({preventScroll:true}));
    }
    sheet.dataset.step = stepName;
    sheet.returnFocus = trigger;
    const row = (p, chosen) => `<li class="sr-alt ${chosen ? 'is-current' : ''}"><img src="${esc(p.image)}" alt="" width="96" height="96"><div><p class="sr-brand">${esc(p.vendor)}</p><p class="sr-name">${words(shortName(p))}</p><p class="sr-price-row"><b>${money(p.price)}</b>${chosen ? `<span class="sr-now">${L('而家揀咗', 'Current pick')}</span>` : `<span>${p.delta === 0 ? L('同價', 'Same price') : p.delta > 0 ? L(`多 ${money(p.delta)}`, `${money(p.delta)} more`) : L(`平 ${money(-p.delta)}`, `${money(-p.delta)} less`)}</span>`}</p><p class="sr-lead">${words(E.lead(p, ans))}</p></div>${chosen ? '' : `<button type="button" class="sr-add" data-pick="${esc(p.handle)}" ${p.withinBudget ? '' : 'disabled'}>${p.withinBudget ? L('換呢款', 'Choose this') : L('超出預算', 'Over budget')}</button>`}</li>`;
    sheet.innerHTML = `<header><h3 id="sr-sheet-title">${L(`換${NAMES[stepName]}`, `Swap ${NAMES[stepName].toLowerCase()}`)}</h3><button type="button" class="sr-close" data-sheet-close aria-label="${L('關閉', 'Close')}">${svg('<path d="M11 11l18 18M29 11 11 29"/>', 22)}</button></header>
      <div class="sr-sheet-body"><div class="sr-why"><b>${L('點解揀而家呢款', 'Why this one')}</b><ul>${(E.detail(current, ans).length ? E.detail(current, ans) : [E.lead(current, ans)]).map(t => `<li>${words(t)}</li>`).join('')}</ul></div>
      <ul class="sr-alts">${row(current, true)}${alts.map(p => row(p, false)).join('')}</ul>
      ${alts.length ? '' : `<p class="sr-fine">${L('其他同類產品唔啱你嘅條件，所以冇得換。', 'No other product in this step fits your answers.')}</p>`}</div>`;
    sheet.showModal();
    if (!still()) sheet.animate([{opacity:0, transform:'translateY(24px)'}, {opacity:1, transform:'none'}], {duration:320, easing:OUT});
  }

  function swapTo(stepName, handle) {
    const next = pool.find(p => p.handle === handle);
    if (!next) return;
    result.picks = result.picks.map(p => p.step === stepName ? next : p);
    result.total = E.total(result.picks);
    result.coverage = E.covered(result.picks, ans);
    sheet.close();
    const y = dialog.querySelector('.sr-results-scroll')?.scrollTop || 0;
    renderResults({reveal:false});
    dialog.querySelector('.sr-results-scroll').scrollTop = y;
    const card = dialog.querySelector(`.sr-item[data-step="${stepName}"]`);
    card?.querySelector('.sr-swap')?.focus({preventScroll:true});
    if (card && !still()) card.animate([{boxShadow:'0 0 0 3px var(--sr-action)'}, {boxShadow:'0 0 0 0 transparent'}], {duration:900, easing:'ease-out'});
  }

  /* ── the cart ─────────────────────────────────────────────────────── */

  const cartQuantity = (cart, id) => (cart?.lines?.edges || []).reduce((n, {node}) => n + (node?.merchandise?.id === id ? Number(node.quantity) || 0 : 0), 0);

  function syncAddButtons() {
    dialog.querySelectorAll('[data-act="add"]').forEach(b => {
      const on = addedVariants.has(b.dataset.variant);
      b.disabled = cartBusy || cartUnverified || on;
      b.classList.toggle('is-done', on);
      b.innerHTML = on ? `${check}${L('已加入', 'Added')}` : cartBusy ? L('加緊…', 'Adding…') : L('加入購物車', 'Add to cart');
    });
    const bar = dialog.querySelector('.sr-cartbar');
    if (bar) bar.innerHTML = cartBar();
  }

  function flyToBar(from) {
    const img = from?.closest('.sr-item')?.querySelector('.sr-item-img img');
    const target = dialog.querySelector('.sr-add-all');
    if (!img || !target || still()) return;
    const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    const ghost = img.cloneNode();
    ghost.className = 'sr-ghost';
    Object.assign(ghost.style, {left:`${a.left}px`, top:`${a.top}px`, width:`${a.width}px`, height:`${a.height}px`});
    dialog.appendChild(ghost);
    const dx = b.left + 24 - a.left - a.width / 2, dy = b.top + b.height / 2 - a.top - a.height / 2;
    ghost.animate([{transform:'translate(0,0) scale(1)', opacity:1}, {transform:`translate(${dx * .6}px, ${dy * .6 - 50}px) scale(.55)`, opacity:1, offset:.6}, {transform:`translate(${dx}px, ${dy}px) scale(.2)`, opacity:.2}], {duration:600, easing:'cubic-bezier(.5,0,.4,1)'})
      .finished.catch(() => {}).finally(() => ghost.remove());
  }

  async function addToBag(products, button) {
    if (cartBusy || cartUnverified) return;
    const pending = products.filter(p => p.variantId && !addedVariants.has(p.variantId));
    if (!pending.length) return;
    if (pending.length === 1) flyToBar(button);
    cartBusy = true; cartMessage = ''; syncAddButtons();
    let sent = false;
    try {
      if (PREVIEW) {
        pending.forEach(p => addedVariants.add(p.variantId));
        try { sessionStorage.setItem(previewKey, JSON.stringify([...addedVariants])); } catch (_) { /* demo only */ }
        cartMessage = L(`預覽示範：已加 ${pending.length} 件（唔會寫入真購物車）。`, `Preview demo: ${pending.length} added (not your real cart).`);
      } else {
        if (typeof window.addToCart !== 'function' || typeof window.getCart !== 'function') throw new Error('cart unavailable');
        const before = await window.getCart();
        for (const p of pending) {
          try { sent = true; await window.addToCart(p.variantId, 1); } catch (_) { /* the read-back below decides */ }
        }
        const after = await window.getCart();
        if (!after?.lines?.edges) throw new Error('cart unreadable');
        pending.forEach(p => { if (cartQuantity(after, p.variantId) > cartQuantity(before, p.variantId)) addedVariants.add(p.variantId); });
        const count = pending.filter(p => addedVariants.has(p.variantId)).length;
        cartMessage = count < pending.length ? L(`加咗 ${count} 件；有 ${pending.length - count} 件加唔到，可能啱啱賣晒。`, `Added ${count}; ${pending.length - count} could not be added, possibly just sold out.`) : L(`已加 ${count} 件入購物車。`, `Added ${count} to your cart.`);
      }
    } catch (_) {
      if (sent) cartUnverified = true;
      cartMessage = sent ? L('購物車暫時核對唔到，請先睇購物車，避免重複加。', 'We could not confirm your cart. Please check it before adding again.') : L('暫時連唔到購物車，請稍後再試。', 'Cannot reach your cart right now. Please try again shortly.');
    } finally {
      cartBusy = false;
      syncAddButtons();
      const total = dialog.querySelector('.sr-add-all');
      if (total && !still()) total.animate([{transform:'scale(1)'}, {transform:'scale(1.04)', offset:.4}, {transform:'scale(1)'}], {duration:320, easing:'ease-out'});
    }
  }

  /* ── start ────────────────────────────────────────────────────────── */

  mountEntry();
  if ('requestIdleCallback' in window) requestIdleCallback(() => loadPool().catch(() => {}), {timeout:6000});
  // Arriving on #skin-studio: the grid above loads later and pushes the banner
  // down, so land again once the page has settled. #skincare-match is the old
  // section's anchor, still used by the bottom bar's helper sheet and old links.
  const HASHES = ['#skin-studio', '#skincare-match'];
  if (HASHES.includes(location.hash)) {
    const land = () => entry.scrollIntoView({block:'start', behavior:'instant'});
    let moved = false;
    ['wheel', 'touchmove', 'keydown'].forEach(ev => window.addEventListener(ev, () => { moved = true; }, {once:true, passive:true}));
    land();
    window.addEventListener('load', () => setTimeout(() => { if (!moved) land(); }, 400), {once:true});
  }
  window.addEventListener('hashchange', () => { if (HASHES.includes(location.hash)) entry.scrollIntoView({block:'start', behavior:'smooth'}); });
  // Links to the helper scroll here instead of loading a page: the category
  // page has <base href="/">, so even a bare #hash would leave for home, and a
  // collection URL would lose its filters on reload.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!HASHES.includes(new URL(a.href, location.href).hash)) return;
    e.preventDefault();
    history.replaceState(history.state, '', `${location.pathname}${location.search}#skin-studio`);
    entry.scrollIntoView({block:'start', behavior:still() ? 'auto' : 'smooth'});
    entry.querySelector('[data-open]')?.focus({preventScroll:true});
  });
})();
