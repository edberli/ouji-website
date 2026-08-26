const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const chatFeed = $('#chatFeed');
const mirrorScreen = $('#mirrorScreen');
const mirrorImage = $('#mirrorImage');
const mirrorEyebrow = $('#mirrorEyebrow');
const mirrorTitle = $('#mirrorTitle');
const mirrorBadge = $('#mirrorBadge');
const zoneStrip = $('#zoneStrip');
const shimaLine = $('#shimaLine');
const toast = $('#toast');

const state = {
  reference: null,
  skin: null,
  sensitive: false,
  depth: null,
  undertone: null,
  intensity: 'faithful',
  selections: {},
  cart: {},
  refTab: 'celebrity_photo',
  refFilter: 'all',
  data: null,
  recipes: null,
};

const ZONE_LABELS = { base: '底妝', eyes: '眼妝', brows: '眉妝', cheeks: '胭脂', contour: '修容', highlight: '高光', lips: '唇妝' };
const SKIN_LABELS = { dry: '乾肌', combo: '混合肌', oily: '油肌' };
const TONE_LABELS = { cool: '冷調', neutral: '中性調', warm: '暖調' };
const DEPTH_LABELS = { '19': '白皙 17–19', '21': '自然偏白 20–21', '23': '自然 22–23', '25': '健康 25+' };
const INTENSITY_LABELS = { soft: '柔和日常', faithful: '跟足原相', camera: '上鏡加強' };
const REFERENCE_FILTERS = {
  celebrity_photo: [['all','全部'], ['韓國','韓國'], ['日本','日本'], ['自然','自然系'], ['型格','型格']],
  studio_look: [['all','全部'], ['素顏','素顏'], ['韓系','韓系'], ['日系','日系'], ['Y2K','Y2K'], ['廢土','廢土'], ['中式','中式'], ['泰妝','泰妝'], ['型格','型格']],
};

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-on');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-on'), 1900);
}

function scrollFeed() {
  requestAnimationFrame(() => chatFeed.scrollTo({ top: chatFeed.scrollHeight, behavior: 'smooth' }));
}

function setStage(stage) {
  const stages = ['look','skin','tone','formula'];
  $$('[data-dossier-stage]').forEach(item => {
    item.classList.toggle('is-current', item.dataset.dossierStage === stage);
    item.classList.toggle('is-done', stages.indexOf(item.dataset.dossierStage) < stages.indexOf(stage));
  });
}

function assistant(text, label = 'SHIMA · OUJI MAKEUP ARTIST') {
  const welcomeClass = chatFeed.children.length === 0 ? ' artist-directive--welcome' : '';
  chatFeed.insertAdjacentHTML('beforeend', `<section class="artist-directive${welcomeClass}"><div class="directive-tab">SHIMA NOTE</div><div class="directive-copy"><small>${esc(label)}</small><p>${text}</p></div><div class="directive-seal" aria-hidden="true">S<br>✓</div></section>`);
  scrollFeed();
}

function user(text) {
  chatFeed.insertAdjacentHTML('beforeend', `<div class="selection-lock"><span>LOCKED IN</span><b>${esc(text)}</b><i aria-hidden="true">✓</i></div>`);
  scrollFeed();
}

function addModule(html, id = '') {
  if (id) $(`#${id}`)?.remove();
  chatFeed.insertAdjacentHTML('beforeend', `<div class="chat-module dossier-module"${id ? ` id="${id}"` : ''}>${html}</div>`);
  scrollFeed();
}

function updateToken(key, label) {
  const token = $(`[data-token="${key}"]`);
  if (!token) return;
  token.classList.toggle('is-empty', !label);
  $('span', token).textContent = label || ({reference:'參考妝',skin:'膚質',tone:'膚色',formula:'配方'}[key]);
}

function setMirror(ref) {
  mirrorScreen.classList.add('is-changing', 'has-reference');
  mirrorImage.src = ref.image;
  mirrorImage.alt = `${ref.person}：${ref.title}`;
  mirrorEyebrow.textContent = `${ref.kind === 'celebrity_photo' ? 'CELEBRITY PHOTO DECODE' : 'OUJI LOOK ATLAS'} · ${ref.subtitle}`;
  mirrorTitle.textContent = ref.title;
  mirrorBadge.textContent = '4 ZONES';
  setTimeout(() => mirrorScreen.classList.remove('is-changing'), 500);
}

function referenceModule() {
  const allRefs = state.recipes.references.filter(r => r.kind === state.refTab);
  const filters = REFERENCE_FILTERS[state.refTab];
  if (!filters.some(([value]) => value === state.refFilter)) state.refFilter = 'all';
  const refs = allRefs.filter(r => state.refFilter === 'all' || (r.categories || []).includes(state.refFilter));
  const cards = refs.map(r => {
    const context = r.kind === 'celebrity_photo' ? r.person : (r.categories || []).slice(0, 2).join(' · ');
    const stamp = (r.categories || [r.kind === 'celebrity_photo' ? '明星' : '亞洲'])[0];
    return `<button class="reference-card" type="button" data-ref="${esc(r.id)}" data-id="${esc(r.id)}"><img src="${esc(r.image)}" alt="${esc(r.person)} ${esc(r.title)}" loading="lazy"><span class="celeb-stamp">${esc(stamp)}</span><span class="reference-copy"><small>${esc(context)}</small><b>${esc(r.title)}</b><span>${esc(r.subtitle)}</span></span></button>`;
  }).join('');
  const filterButtons = filters.map(([value, label]) => `<button class="reference-filter ${state.refFilter === value ? 'is-on' : ''}" data-ref-filter="${esc(value)}" type="button" aria-pressed="${state.refFilter === value}">${esc(label)}</button>`).join('');
  const libraryLabel = state.refTab === 'celebrity_photo' ? `${allRefs.length} 位韓日明星` : `${allRefs.length} 款亞洲＋潮流妝感`;
  addModule(`<div class="module-label"><b>揀一張你真係想化到嘅相</b><span>LOOK BINDER · ${esc(libraryLabel)}</span></div><div class="reference-tabs"><button class="reference-tab ${state.refTab === 'celebrity_photo' ? 'is-on' : ''}" data-ref-tab="celebrity_photo" type="button">明星仿妝 <em>8</em></button><button class="reference-tab ${state.refTab === 'studio_look' ? 'is-on' : ''}" data-ref-tab="studio_look" type="button">妝感圖鑑 <em>13</em></button></div><div class="reference-filter-row" aria-label="篩選妝感">${filterButtons}</div><div class="reference-shelf-head"><span>${esc(state.refFilter === 'all' ? libraryLabel : state.refFilter)}</span><b>${refs.length} ${refs.length === 1 ? 'LOOK' : 'LOOKS'} · 左右掃 →</b></div><div class="reference-rail">${cards}</div>`, 'referenceModule');
  $$('[data-ref-tab]', $('#referenceModule')).forEach(button => button.addEventListener('click', () => {
    state.refTab = button.dataset.refTab;
    state.refFilter = 'all';
    referenceModule();
  }));
  $$('[data-ref-filter]', $('#referenceModule')).forEach(button => button.addEventListener('click', () => {
    state.refFilter = button.dataset.refFilter;
    referenceModule();
  }));
  $$('[data-ref]', $('#referenceModule')).forEach(button => button.addEventListener('click', () => chooseReference(button.dataset.ref)));
}

function analysisModule(ref) {
  const a = ref.analysis;
  addModule(`<article class="analysis-card"><header><div><small>LOOK EVIDENCE</small><b>Shima Face Chart</b></div><span>PHOTO-SPECIFIC · 4 ZONES</span></header><div class="analysis-layout"><div class="face-blueprint" aria-hidden="true"><svg viewBox="0 0 120 150" role="presentation"><ellipse cx="60" cy="72" rx="39" ry="55"></ellipse><path d="M38 58 Q47 52 55 58 M65 58 Q74 52 82 58 M60 61 Q55 81 60 86 M47 102 Q60 109 73 102 M28 48 Q34 20 60 16 Q86 20 92 48"></path><circle class="face-dot face-dot--eye" cx="80" cy="58" r="5"></circle><circle class="face-dot face-dot--cheek" cx="82" cy="82" r="5"></circle><circle class="face-dot face-dot--base" cx="43" cy="80" r="5"></circle><circle class="face-dot face-dot--lip" cx="60" cy="104" r="5"></circle></svg><span>FACE MAP · 4 ZONES</span></div><div class="analysis-workpad"><div class="analysis-reference"><span>REFERENCE LOCKED</span><b>${esc(ref.person)} · ${esc(ref.title)}</b></div><div class="analysis-summary">${esc(a.summary)}</div><div class="analysis-zones">${[['BASE',a.base],['EYES',a.eyes],['CHEEK',a.cheeks],['LIP',a.lips]].map(([z,v]) => `<div class="analysis-zone"><small>${z}</small><b>${esc(v)}</b></div>`).join('')}</div></div></div><div class="source-note"><span>明星相只喺左邊主鏡保留一次；右邊集中做拆妝標記。</span>${ref.source.page ? `<a href="${esc(ref.source.page)}" target="_blank" rel="noreferrer">相片來源／授權 ↗</a>` : '<span>OUJI 妝感圖鑑</span>'}</div></article>`);
}

function chooseReference(id) {
  const ref = state.recipes.references.find(r => r.id === id);
  state.reference = ref;
  $('#referenceModule')?.remove();
  $('.artist-directive--welcome')?.remove();
  user(`${ref.person} · ${ref.title}`);
  setStage('skin');
  setMirror(ref);
  updateToken('reference', ref.person.includes('OUJI') ? ref.title : ref.person.split(' ')[0]);
  shimaLine.textContent = `我已經將「${ref.title}」拆成底、眼、頰、唇四層。`;
  analysisModule(ref);
  setTimeout(() => {
    assistant('相片已經拆好。下一樣唔係問你鍾意咩品牌，而係問你塊面本身：你平時上底妝，最常見係邊種狀態？');
    skinModule();
  }, 260);
}

function skinModule() {
  addModule(`<div class="module-label"><b>你嘅膚質</b><span>BASE BEHAVIOUR</span></div><div class="choice-grid"><button class="choice-button" data-skin="dry" type="button"><i>◌</i><span><b>乾肌</b><small>易起皮／繃緊／卡粉</small></span></button><button class="choice-button" data-skin="combo" type="button"><i>◐</i><span><b>混合肌</b><small>T 區油、面頰正常或乾</small></span></button><button class="choice-button" data-skin="oily" type="button"><i>●</i><span><b>油肌</b><small>易浮油／溶妝／毛孔明顯</small></span></button><button class="choice-button sensitive-toggle ${state.sensitive ? 'is-on' : ''}" id="sensitiveToggle" type="button"><i>!</i><span><b>我容易敏感</b><small>會將「冇明確證據」標成未知，唔亂估安全</small></span></button></div>`, 'skinModule');
  $('#sensitiveToggle').addEventListener('click', e => {
    state.sensitive = !state.sensitive;
    e.currentTarget.classList.toggle('is-on', state.sensitive);
  });
  $$('[data-skin]', $('#skinModule')).forEach(button => button.addEventListener('click', () => chooseSkin(button.dataset.skin)));
}

function chooseSkin(value) {
  state.skin = value;
  $('#skinModule')?.remove();
  user(`${SKIN_LABELS[value]}${state.sensitive ? ' · 容易敏感' : ''}`);
  setStage('tone');
  updateToken('skin', `${SKIN_LABELS[value]}${state.sensitive ? '＋敏感' : ''}`);
  assistant(state.sensitive ? '收到。我會用較保守嘅方式揀底妝；落單前你仍然可以再睇成分，同埋先做局部測試。跟住揀大概膚色同底調。' : '收到。膚質會先影響底妝排序；眼、頰、唇就按相中效果同色號走。跟住揀大概膚色同底調。');
  toneModule();
}

function toneModule() {
  const depths = [['19','白皙 17–19','#f7d9cf'],['21','自然偏白 20–21','#edc2ae'],['23','自然 22–23','#d7a181'],['25','健康 25+','#b97b59']];
  const undertones = [['cool','冷調／粉調','偏粉、銀飾較自然','#efb8cf'],['neutral','中性調','粉黃之間','#d6b091'],['warm','暖調／黃調','偏黃、金飾較自然','#d79b62']];
  addModule(`<div class="module-label"><b>揀接近你塊面嘅深淺</b><span>FOUNDATION DEPTH</span></div><div class="choice-grid depth-grid">${depths.map(([v,l,swatch]) => `<button class="choice-button depth-choice" style="--swatch:${swatch}" data-depth="${v}" type="button"><i>${v}</i><span><b>${l}</b><small>睇色辦揀最接近，唔使靠估字眼</small></span></button>`).join('')}</div><div class="module-label tone-label"><b>再揀底調</b><span>UNDERTONE</span></div><div class="choice-grid undertone-grid">${undertones.map(([v,l,s,swatch]) => `<button class="choice-button undertone-choice" style="--swatch:${swatch}" data-undertone="${v}" type="button"><i>◉</i><span><b>${l}</b><small>${s}</small></span></button>`).join('')}</div>`, 'toneModule');
  $$('[data-depth]', $('#toneModule')).forEach(button => button.addEventListener('click', () => {
    state.depth = button.dataset.depth;
    $$('[data-depth]', $('#toneModule')).forEach(b => b.classList.toggle('is-selected', b === button));
    maybeFinishTone();
  }));
  $$('[data-undertone]', $('#toneModule')).forEach(button => button.addEventListener('click', () => {
    state.undertone = button.dataset.undertone;
    $$('[data-undertone]', $('#toneModule')).forEach(b => b.classList.toggle('is-selected', b === button));
    maybeFinishTone();
  }));
}

function maybeFinishTone() {
  if (!state.depth || !state.undertone) return;
  const text = `${DEPTH_LABELS[state.depth]} · ${TONE_LABELS[state.undertone]}`;
  $('#toneModule')?.remove();
  user(text);
  state.intensity = 'faithful';
  setStage('formula');
  updateToken('tone', `${state.depth} · ${TONE_LABELS[state.undertone]}`);
  updateToken('formula', INTENSITY_LABELS[state.intensity]);
  assistant('資料夠喇。我會先跟足原相配產品；想淡啲或者加強上鏡感，可以睇到配方之後先調，唔使而家多答一題。');
  shimaLine.textContent = '我會俾你每個部位幾款選擇，你可以逐件揀或者成套加入購物車。';
  setTimeout(showResults, 430);
}

function scoreVariant(variant, zoneTarget, isBase) {
  const s = variant.shadeSignals || {};
  let score = variant.inStock ? 7 : 0;
  if (isBase) {
    if (s.depthCode === state.depth) score += 24;
    else if (s.depthCode !== 'unknown' && Math.abs(Number(s.depthCode) - Number(state.depth)) <= 2) score += 12;
    if (s.undertone === state.undertone) score += 15;
  } else {
    if ((zoneTarget.colours || []).includes(s.family)) score += 22;
    if (s.undertone === state.undertone) score += 5;
  }
  return score;
}

function matchZone(zone, target) {
  const isBase = zone === 'base';
  const candidates = state.data.products.filter(p => p.inStock && target.types.includes(p.type));
  const ranked = candidates.map(product => {
    const profile = product.effectProfile;
    let score = 70;
    if ((target.finishes || []).includes(profile.finish)) score += 20;
    if (isBase && (target.coverage || []).includes(profile.coverage)) score += 14;
    if (isBase && profile.skinFit.includes(state.skin)) score += 18;
    if (state.sensitive && isBase) score += profile.sensitiveClaim === true ? 22 : -20;
    if (state.intensity === 'camera' && profile.wearLevel >= 2) score += 8;
    if (state.intensity === 'soft' && profile.difficulty === 1) score += 6;
    const stockedVariants = product.variants.filter(v => v.inStock);
    const variants = stockedVariants.length ? stockedVariants : (product.variants.length ? product.variants : [{title:'請到產品頁揀色',barcode:null,shadeSignals:{family:'unknown',undertone:'unknown',depthCode:'unknown'},inStock:false}]);
    const bestVariant = variants.map(v => ({...v, _score: scoreVariant(v, target, isBase)})).sort((a,b) => b._score - a._score)[0];
    score += bestVariant._score;
    return { product, variant: bestVariant, score };
  }).sort((a,b) => b.score - a.score);
  return ranked.slice(0, 3);
}

function reasonFor(match, zone, target) {
  const p = match.product;
  const v = match.variant;
  const bits = [];
  if (state.sensitive && zone === 'base') {
    bits.push(p.effectProfile.sensitiveClaim === true ? '產品資料標示較適合敏感肌' : '建議先做局部測試');
  }
  if ((target.finishes || []).includes(p.effectProfile.finish)) bits.push(`${p.effectProfile.finish}妝效對應相中${ZONE_LABELS[zone]}`);
  if (zone === 'base' && p.effectProfile.skinFit.includes(state.skin)) bits.push(`較適合${SKIN_LABELS[state.skin]}`);
  if (zone === 'base' && v.shadeSignals.depthCode !== 'unknown') bits.push(`先配 ${v.shadeSignals.depthCode} 深度`);
  if (zone !== 'base' && v.shadeSignals.family !== 'unknown') bits.push(`${v.shadeSignals.family} 色系貼近目標`);
  if (state.intensity === 'camera' && p.effectProfile.wearLevel >= 2) bits.push('上鏡版優先顯色同持妝');
  if (state.intensity === 'soft' && p.effectProfile.difficulty === 1) bits.push('日常版優先簡單易控制');
  return bits.slice(0, 2).join('；') || `類別同相中${ZONE_LABELS[zone]}用途吻合`;
}

function numericVariantId(variant) {
  return String(variant.shopifyVariantId || '').split('/').pop();
}

function matchKey(zone, match) {
  return `${zone}:${numericVariantId(match.variant) || match.product.handle}`;
}

function rememberCartItem(match) {
  const id = numericVariantId(match.variant);
  if (!id) return false;
  state.cart[id] = { product: match.product, variant: match.variant, quantity: 1 };
  return true;
}

async function addCartItem(match) {
  const id = numericVariantId(match.variant);
  if (!id) return false;
  if (state.cart[id]) return true;
  if (typeof window.addToCart === 'function') {
    const result = await window.addToCart(match.variant.shopifyVariantId, 1);
    if (!result) return false;
    window.trackAddToCart?.({
      handle: match.product.handle,
      title: match.product.title,
      vendor: match.product.vendor,
      productType: match.product.type,
      price: Number(match.variant.price || match.product.priceFrom),
    }, 1, Number(match.variant.price || match.product.priceFrom));
  }
  return rememberCartItem(match);
}

function updateCartUI() {
  const ids = Object.keys(state.cart);
  $$('[data-add-item]', $('#resultsModule')).forEach(button => {
    const added = Boolean(state.cart[button.dataset.addItem]);
    button.classList.toggle('is-added', added);
    button.textContent = added ? '已加入 ✓' : '加入購物車';
  });
  const openCart = $('#openCart');
  if (openCart) {
    openCart.disabled = ids.length === 0;
    openCart.textContent = ids.length ? `查看購物車（${ids.length}）` : '購物車未有產品';
  }
}

function openShopifyCart() {
  if (typeof window.addToCart === 'function') {
    window.location.href = '/cart.html';
    return;
  }
  const lines = Object.entries(state.cart).map(([id, item]) => `${id}:${item.quantity}`).join(',');
  if (!lines) return showToast('你仲未加入任何產品。');
  window.open(`https://shop.oujikbeauty.com/cart/${lines}`, '_blank', 'noopener,noreferrer');
}

function showResults() {
  const zoneSets = Object.entries(state.reference.targets).map(([zone, target]) => [zone, target, matchZone(zone, target)]).filter(([, , options]) => options.length).slice(0, 5);
  const matchLookup = new Map();
  const selectedMatches = [];
  const shelves = zoneSets.map(([zone, target, options]) => {
    const availableKeys = options.map(match => matchKey(zone, match));
    if (!availableKeys.includes(state.selections[zone])) state.selections[zone] = availableKeys[0];
    const cards = options.map((match, index) => {
      const p = match.product;
      const v = match.variant;
      const id = numericVariantId(v);
      const key = matchKey(zone, match);
      const selected = state.selections[zone] === key;
      matchLookup.set(key, match);
      if (selected) selectedMatches.push(match);
      return `<article class="product-choice ${selected ? 'is-selected' : ''}"><button class="product-pick" data-pick-zone="${esc(zone)}" data-pick-key="${esc(key)}" type="button" aria-pressed="${selected}"><span class="pick-badge">${selected ? '已選' : `選擇 ${index + 1}`}</span><img src="${esc(p.image || '')}" alt="${esc(p.title)}" loading="lazy"><span class="product-choice-copy"><small>${esc(p.vendor)}</small><b>${esc(p.title)}</b><em><i style="--shade:${esc(v.shadeSignals?.swatchHint || '#d8d1cc')}"></i>${esc(v.title)}</em><p>${esc(reasonFor(match, zone, target))}</p><strong>$${Number(v.price || p.priceFrom).toFixed(0)}</strong></span></button><button class="product-cart-button ${state.cart[id] ? 'is-added' : ''}" data-add-item="${esc(id)}" data-match-key="${esc(key)}" type="button">${state.cart[id] ? '已加入 ✓' : '加入購物車'}</button></article>`;
    }).join('');
    return `<section class="product-shelf"><header><div><small>MAKEUP ZONE</small><b>${esc(ZONE_LABELS[zone] || zone)}</b></div><span>${options.length} 款適合 · 左右掃 →</span></header><div class="product-rail">${cards}</div></section>`;
  }).join('');

  const intensityOptions = [
    ['soft','—','柔和日常','減少層次，易控制'],
    ['faithful','◎','跟足原相','預設：忠於相中效果'],
    ['camera','✦','上鏡加強','顯色、輪廓同持妝']
  ];
  const intensityControl = `<div class="formula-tuner"><div><small>OPTIONAL FINISH TUNER</small><b>配方已經出咗；想改濃淡先至撳</b></div><div class="intensity-switch" aria-label="調整妝效">${intensityOptions.map(([value,icon,label,help]) => `<button class="intensity-option ${state.intensity === value ? 'is-on' : ''}" data-intensity="${value}" type="button" aria-pressed="${state.intensity === value}"><i>${icon}</i><span><b>${label}</b><small>${help}</small></span></button>`).join('')}</div></div>`;
  const selectedTotal = selectedMatches.reduce((sum, match) => sum + Number(match.variant.price || match.product.priceFrom), 0);
  addModule(`<section class="recipe-board"><header class="recipe-head"><div><small>YOUR OUJI MAKEUP RECIPE</small><b>${esc(state.reference.title)} · ${esc(INTENSITY_LABELS[state.intensity])}</b></div><span>${zoneSets.length} 個部位</span></header>${intensityControl}<div class="product-list">${shelves}</div><div class="recipe-purchase"><div><small>你揀中嘅一套</small><b>${selectedMatches.length} 件 · $${selectedTotal.toFixed(0)}</b></div><button class="recipe-action recipe-action--main" id="addAllToCart" type="button">全部加入購物車</button><button class="recipe-action" id="openCart" type="button">購物車未有產品</button></div><div class="recipe-actions"><button class="recipe-action" id="pickAnother" type="button">繼續試另一個妝</button></div><div class="recipe-disclaimer">妝效會因膚況、上妝份量及光線而有分別。${state.sensitive ? '你已標記容易敏感；落單前請再睇成分，並先做局部測試。' : ''}</div></section>`, 'resultsModule');
  $$('[data-pick-key]', $('#resultsModule')).forEach(button => button.addEventListener('click', () => {
    state.selections[button.dataset.pickZone] = button.dataset.pickKey;
    showResults();
  }));
  $$('[data-add-item]', $('#resultsModule')).forEach(button => button.addEventListener('click', async () => {
    const match = matchLookup.get(button.dataset.matchKey);
    if (!match || state.cart[button.dataset.addItem]) return;
    button.disabled = true;
    button.textContent = '加入緊…';
    if (await addCartItem(match)) {
      updateCartUI();
      showToast(`${match.product.title} 已加入購物車`);
    } else {
      button.disabled = false;
      button.textContent = '再試一次';
      showToast('暫時加入唔到，請再試一次。');
    }
  }));
  $('#addAllToCart').addEventListener('click', async event => {
    const button = event.currentTarget;
    const pending = selectedMatches.filter(match => !state.cart[numericVariantId(match.variant)]);
    if (!pending.length) return showToast('你揀中嘅產品已經全部喺購物車。');
    button.disabled = true;
    button.textContent = `加入緊 0/${pending.length}…`;
    let added = 0;
    for (const match of pending) {
      if (await addCartItem(match)) added += 1;
      button.textContent = `加入緊 ${added}/${pending.length}…`;
    }
    button.disabled = false;
    button.textContent = '全部加入購物車';
    updateCartUI();
    showToast(added === pending.length ? `${added} 件產品已加入購物車` : `已加入 ${added} 件；其餘請再試一次。`);
  });
  $('#openCart').addEventListener('click', openShopifyCart);
  $$('[data-intensity]', $('#resultsModule')).forEach(button => button.addEventListener('click', () => {
    if (state.intensity === button.dataset.intensity) return;
    state.intensity = button.dataset.intensity;
    updateToken('formula', INTENSITY_LABELS[state.intensity]);
    showResults();
    showToast(`配方已調整：${INTENSITY_LABELS[state.intensity]}`);
  }));
  $('#pickAnother').addEventListener('click', () => {
    assistant('得，膚質同膚色我幫你留低。你直接換另一張相，我再按新妝感配。');
    state.reference = null;
    setStage('look');
    updateToken('reference', null);
    updateToken('formula', null);
    referenceModule();
  });
  updateCartUI();
  mirrorBadge.textContent = `${zoneSets.length} ZONES`;
}

function inspectZone(zone) {
  if (!state.reference) return showToast('揀咗參考相先，我先可以拆部位。');
  const analysis = state.reference.analysis[zone === 'cheeks' ? 'cheeks' : zone];
  $$('b', zoneStrip).forEach(b => b.classList.toggle('is-on', b.textContent === ZONE_LABELS[zone]));
  showToast(`${ZONE_LABELS[zone]}：${analysis || '配方會按相中效果重建'}`);
}

function resetSession() {
  Object.assign(state, { reference:null, skin:null, sensitive:false, depth:null, undertone:null, intensity:'faithful', selections:{}, cart:{}, refTab:'celebrity_photo', refFilter:'all' });
  setStage('look');
  chatFeed.innerHTML = '';
  ['reference','skin','tone','formula'].forEach(k => updateToken(k, null));
  mirrorScreen.classList.remove('has-reference');
  mirrorImage.src = '/assets/makeup-session/look-glow-korean.png';
  mirrorEyebrow.textContent = 'WAITING FOR YOUR PICK';
  mirrorTitle.textContent = '你想成為邊個版本嘅自己？';
  mirrorBadge.textContent = 'LIVE';
  shimaLine.textContent = '我會一路陪你揀，唔會叫你填完四頁表格。';
  assistant('歡迎入嚟 OUJI 化妝間。你唔需要先識產品名——先揀一張「想化到咁」嘅相，我再逐層拆俾你。');
  referenceModule();
}

function setupDataDialog() {
  const c = state.data.coverage;
  $('#dataCount').textContent = `${c.activeMakeupProducts} 產品 · ${state.recipes.library.total} 妝感`;
  $('#dataStats').innerHTML = [
    [c.activeMakeupProducts, '可配彩妝產品'], [c.variants, '可配色號'],
    [state.recipes.library.total, '參考妝感'], [4, '逐區拆解部位']
  ].map(([n,l]) => `<div class="data-stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
  $('#dataButton').addEventListener('click', () => $('#dataDialog').showModal());
  $('#dialogClose').addEventListener('click', () => $('#dataDialog').close());
  $('#dataDialog').addEventListener('click', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) e.currentTarget.close();
  });
}

async function boot() {
  try {
    const [data, recipes] = window.OUJI_PRODUCT_DATABASE && window.OUJI_LOOK_DATABASE
      ? [window.OUJI_PRODUCT_DATABASE, window.OUJI_LOOK_DATABASE]
      : await Promise.all([
          fetch('data/products.json').then(r => r.json()),
          fetch('/data/match-look-recipes.json').then(r => r.json())
        ]);
    state.data = data;
    state.recipes = recipes;
    setupDataDialog();
    resetSession();
  } catch (error) {
    console.error(error);
    chatFeed.innerHTML = '<section class="artist-directive"><div class="directive-tab">LOAD NOTE</div><div class="directive-copy"><p>配對資料暫時載入唔到，請重新整理一次。</p></div></section>';
  }
}

$('#restartButton').addEventListener('click', resetSession);
$$('.face-pin').forEach(pin => pin.addEventListener('click', () => inspectZone(pin.dataset.zone)));
$$('.tray-token').forEach(token => token.addEventListener('click', () => {
  if (token.classList.contains('is-empty')) showToast('呢一格仲未揀，跟住 Shima 對話就得。');
  else showToast('呢個答案已留喺今次 session；你可以繼續試另一個妝。');
}));

boot();
