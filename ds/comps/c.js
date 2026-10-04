/* C — 幫你揀. The catalogue supplies every product, variant, image and price.
   Recommendations are title/tag matches, never a diagnosis or a sales ranking. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (n) => `HK$${Number(n).toLocaleString('en-HK', { maximumFractionDigits: 2 })}`;
  const unwrap = (x) => x?.node || x;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const steps = [
    { id: 'cleanse', name: '潔面', type: '潔面' },
    { id: 'tone', name: '爽膚水', type: '爽膚水' },
    { id: 'serum', name: '精華', type: '精華' },
    { id: 'cream', name: '保濕', type: '面霜' },
    { id: 'sun', name: '日間防曬', type: '防曬' }
  ];
  const words = {
    '乾性': ['保濕','水潤','hyalur','ceramide','神經醯胺'],
    '油性': ['清爽','控油','gel','毛孔','水感'],
    '混合': ['水感','gel','平衡','保濕'],
    '敏感': ['積雪草','舒緩','centella','cica','panthenol','敏感'],
    '乾燥・缺水': ['保濕','透明質酸','hyalur','水潤','hydr','白樺'],
    '暗瘡・粉刺': ['茶樹','tea tree','魚腥草','heartleaf','清爽','控油'],
    '敏感・泛紅': ['積雪草','centella','cica','舒緩','panthenol','敏感'],
    '暗沉': ['亮','rice','米','glow','煙酰胺'],
    '毛孔': ['毛孔','pore','紅豆','red bean','清爽']
  };
  const state = { products: [], ratings: {}, brands: [], skin: '', concern: '', selected: new Map(), pools: new Map(), busy: false, batchDone: new Set(), ready: false };
  const liveAnimations = new Set();
  const animate = (el, frames, options = {}) => {
    if (!el || media.matches || !el.animate) return null;
    const a = el.animate(frames, { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', ...options });
    liveAnimations.add(a);
    a.finished.catch(() => {}).finally(() => liveAnimations.delete(a));
    return a;
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0; };
  const assembly = (el, i = 0) => animate(el, [
    { opacity: 0, transform: `translateY(78px) rotate(${i % 2 ? 6 : -6}deg) scale(.9)` },
    { opacity: 1, transform: 'translateY(-7px) rotate(0deg) scale(1.02)', offset: .8 },
    { opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)' }
  ], { duration: 850, delay: i * 95 });
  const cardObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { assembly(e.target, Number(e.target.dataset.order || 0)); cardObserver.unobserve(e.target); } });
  }, { threshold: .12 }) : null;
  function observeCards() {
    document.querySelectorAll('#routine-cards .product-card').forEach((el, i) => {
      el.dataset.order = i;
      if (visible(el)) assembly(el, i);
      else if (cardObserver) cardObserver.observe(el);
    });
  }
  function photo(p) { return p.images?.edges?.map(unwrap).find((x) => x?.url)?.url || ''; }
  function variant(p) {
    return (p.variants?.edges || []).map(unwrap).filter((v) => v.availableForSale && (v.quantityAvailable == null || v.quantityAvailable > 0) && v.price?.currencyCode === 'HKD' && Number(v.price?.amount) > 0).sort((a,b) => Number(a.price.amount) - Number(b.price.amount))[0] || null;
  }
  const price = (p) => Number(variant(p)?.price.amount || 0);
  const productUrl = (p) => `/product.html?handle=${encodeURIComponent(p.handle)}`;
  const haystack = (p) => `${p.title} ${(p.tags || []).join(' ')}`.toLowerCase();
  function matched(p) {
    const text = haystack(p);
    return (words[state.concern] || words[state.skin] || []).find((w) => text.includes(w.toLowerCase()));
  }
  function score(p) {
    const text = haystack(p);
    let n = (words[state.concern] || []).filter((w) => text.includes(w.toLowerCase())).length * 12;
    n += (words[state.skin] || []).filter((w) => text.includes(w.toLowerCase())).length * 5;
    n += Number(state.ratings[p.handle]?.star || 0);
    n += price(p) >= 60 && price(p) <= 160 ? 4 : 0;
    return n;
  }
  function safe(p, step) {
    const text = haystack(p);
    if (/短效|清貨|小樣|試用|旅行|mini\b|sample\b|套裝|set\b|果酸|水楊酸|杏仁酸|\bbha\b|\baha\b|\bpha\b|retinol|retinal|視黃|a醇|微針|reedle|peeling|去角質/.test(text)) return false;
    if (/(?:煙酰胺|niacinamide).*(?:1\d|[2-9]\d)%|(?:1\d|[2-9]\d)%.*(?:煙酰胺|niacinamide)/.test(text)) return false;
    if (step.id === 'cleanse' && /卸妝|makeup remover|cleansing oil|cleansing balm|scrub/.test(text)) return false;
    if (step.id === 'sun' && /氣墊|粉底|噴霧|spray|身體|body|stick|防曬棒|tone.up|調色/.test(text)) return false;
    return true;
  }
  function poolFor(step) {
    return state.products.filter((p) => p.productType === step.type && variant(p) && photo(p) && safe(p, step))
      .sort((a,b) => score(b) - score(a) || price(a) - price(b) || a.handle.localeCompare(b.handle));
  }
  function card(p, step = null, alternative = false) {
    const v = variant(p), r = state.ratings[p.handle], match = matched(p), url = productUrl(p);
    if (!v) return '';
    const index = (alternative ? steps : steps.filter((s) => state.selected.has(s.id))).findIndex((s) => s.id === step?.id) + 1;
    return `<article class="product-card ${step && !alternative ? 'routine-card' : ''}" data-handle="${esc(p.handle)}" data-variant-id="${esc(v.id)}">
      ${step && !alternative ? `<div class="card-step"><span class="step-number">${String(index).padStart(2,'0')}</span><span>${step.name}</span><button type="button" class="step-toggle" data-remove-step="${step.id}" aria-label="移除${step.name}步驟">移除</button></div>` : ''}
      <a class="product-photo" href="${url}"><img src="${esc(photo(p))}" width="320" height="320" alt="${esc(p.title)}" loading="lazy" decoding="async"></a>
      <div class="product-info"><p class="product-brand">${esc(p.vendor)}</p><a class="product-name" href="${url}">${esc(p.title)}</a>
      ${v.title && v.title !== 'Default Title' ? `<p class="product-variant">${esc(v.title)}</p>` : ''}
      ${step ? `<p class="product-match">${match ? `名稱／標籤配對：${esc(match)}` : '基本步驟・可按需要換款'}</p>` : ''}
      ${r && Number(r.star) > 0 && Number(r.count) > 0 ? `<p class="product-rating">★ ${Number(r.star).toFixed(1)} · Olive Young (${Number(r.count).toLocaleString('en-HK')})</p>` : ''}
      <div class="product-bottom"><strong class="product-price">${money(Number(v.price.amount))}</strong>
      ${alternative ? `<button type="button" data-swap-step="${step.id}" data-swap-handle="${esc(p.handle)}" aria-label="將${step.name}換成${esc(p.title)}">換呢款 ↗</button>` : `<button type="button" class="quick-add" data-add="${esc(v.id)}" aria-label="加入購物袋：${esc(p.title)}">+</button>`}</div></div></article>`;
  }
  function renderAlternatives() {
    $('alternatives').innerHTML = steps.filter((s) => state.pools.get(s.id)?.length).map((s, i) => {
      const pool = state.pools.get(s.id), current = state.selected.get(s.id);
      const options = pool.filter((p) => p.handle !== current?.handle).slice(0,4);
      return `<div class="alternative-row"><div class="alternative-heading"><h3><span class="step-number">${String(i+1).padStart(2,'0')}</span> ${s.name}${!current ? ' · 未加入' : ''}</h3><p>${current ? '左右掃，換一款試下 ⟷' : '按「換呢款」加入呢一步'}</p></div><div class="alternative-track">${options.map((p) => card(p,s,true)).join('')}</div></div>`;
    }).join('');
  }
  function renderRoutine() {
    cardObserver?.disconnect();
    const selected = steps.filter((s) => state.selected.has(s.id));
    $('routine-cards').innerHTML = selected.length ? selected.map((s) => card(state.selected.get(s.id),s)).join('') : '<p class="loading-note">留白都可以。喺下面揀一款，重新加入你嘅步驟。</p>';
    $('routine-count').textContent = `${selected.length} 步`;
    updateTotals();
    observeCards();
    syncButtons();
  }
  function offers() {
    const p = window.OUJI_PROMOTIONS;
    return { threshold: p?.discount.threshold ?? 399, saving: p?.discount.enabled === false ? 0 : (p?.discount.saving ?? 20), gift: p?.gift.threshold ?? 599 };
  }
  function updateTotals() {
    const subtotal = Math.round([...state.selected.values()].reduce((n,p) => n + price(p),0) * 100) / 100;
    const o = offers(), saving = subtotal >= o.threshold ? o.saving : 0, net = Math.max(0,subtotal-saving);
    const giftGross = o.gift >= o.threshold ? o.gift + o.saving : o.gift;
    const gap = Math.max(0,Math.ceil((giftGross - subtotal) * 100) / 100);
    $('routine-total').textContent = money(subtotal);
    $('bag-total').textContent = money(subtotal);
    $('routine-payable').textContent = money(net);
    $('routine-saving').textContent = saving ? `呢套預計減 ${money(saving)}` : `再加 ${money(Math.max(0,o.threshold-subtotal))}，就減 $${o.saving}`;
    $('gift-message').textContent = gap ? `再加 ${money(gap)} 就送面霜` : '呢套已達送面霜門檻 · 送完即止';
    $('gift-message').setAttribute('title', '面霜禮遇按折後金額計算；達滿額減後需計入 $20 折扣。');
    const f = Math.min(1,net/o.gift), fill = $('offer-fill'), previous = fill.dataset.fraction || '0';
    fill.style.transform = `scaleX(${f})`;
    animate(fill,[{transform:`scaleX(${previous})`},{transform:`scaleX(${f})`}],{duration:950});
    fill.dataset.fraction = String(f);
    $('offer-progress').setAttribute('aria-valuenow',String(Math.min(o.gift,net)));
    $('offer-progress').setAttribute('aria-valuetext',`${money(net)}，${$('gift-message').textContent}`);
    document.querySelector('.discount-marker').style.left = `${(o.threshold-o.saving)/o.gift*100}%`;
    animate($('bag-total'),[{transform:'translateY(12px)',opacity:.3},{transform:'translateY(0)',opacity:1}],{duration:450});
  }
  function build() {
    if (!state.ready || state.busy) return;
    state.pools.clear();
    steps.forEach((s) => state.pools.set(s.id,poolFor(s)));
    const simple = !state.skin && !state.concern || state.skin === '敏感' || state.concern === '敏感・泛紅';
    state.selected.clear();
    steps.filter((s) => !simple || ['cleanse','cream','sun'].includes(s.id)).forEach((s) => {
      const p = state.pools.get(s.id)[0]; if (p) state.selected.set(s.id,p);
    });
    $('routine-title').textContent = state.skin || state.concern ? `${state.skin ? `${state.skin}肌，` : ''}${state.concern || '由日常照顧開始'}。` : '先由簡單三步，開始。';
    $('routine-note').textContent = state.skin || state.concern ? `${[state.skin,state.concern].filter(Boolean).join('／')} · 按名稱及標籤配對` : '未揀偏好：先睇 3 步基本護理';
    renderRoutine(); renderAlternatives();
  }
  function reactToAnswer(button) {
    const answer = button.dataset.skin || button.dataset.concern;
    $('scene-caption').textContent = `收到，${answer}。幫你揀緊。`;
    if (media.matches) return;
    const from = button.getBoundingClientRect(), to = $('mirror-target').getBoundingClientRect();
    const clone = document.createElement('span'); clone.className = 'answer-flight'; clone.textContent = answer;
    clone.style.left = `${from.left}px`; clone.style.top = `${from.top}px`; document.body.append(clone);
    const a = animate(clone,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(.22) rotate(16deg)`,opacity:0}],{duration:850,easing:'cubic-bezier(.45,0,.2,1)'});
    if (a) a.finished.catch(()=>{}).finally(()=>clone.remove()); else clone.remove();
    const cat = $('cat-patch'); cat.style.transformOrigin = '1250px 570px';
    animate(cat,[{transform:'rotate(0deg)'},{transform:'rotate(-7deg)',offset:.3},{transform:'rotate(5deg)',offset:.65},{transform:'rotate(0deg)'}],{duration:950});
    animate($('cat-eyes'),[{opacity:0},{opacity:1,offset:.25},{opacity:0,offset:.45},{opacity:1,offset:.65},{opacity:0}],{duration:900});
    animate($('mirror-halo'),[{transform:'scale(.5)',opacity:0},{transform:'scale(1.2)',opacity:1,offset:.45},{transform:'scale(2)',opacity:0}],{duration:1100});
    animate(button,[{transform:'scale(1)'},{transform:'scale(.92)',offset:.3},{transform:'scale(1.04)',offset:.6},{transform:'scale(1)'}],{duration:430});
  }
  function syncButtons() {
    document.querySelectorAll('[data-skin],[data-concern],[data-add],[data-swap-step],[data-remove-step],#make-routine').forEach((b)=>{b.disabled = state.busy || !state.ready;});
    const hasAPI = typeof window.addToCart === 'function', n = state.selected.size;
    const done = [...state.selected.values()].filter((p) => state.batchDone.has(variant(p).id)).length;
    const label = !hasAPI ? '逐件查看產品' : done && done < n ? `繼續加入餘下 ${n-done} 件` : done === n && n ? '已加入 · 查看購物袋' : '全套加入購物袋';
    $('routine-add').textContent = state.busy ? '正在逐件加入…' : `${label} ＋`;
    $('bag-add').textContent = state.busy ? '加入中…' : !hasAPI ? '逐件查看 ↗' : done === n && n ? '查看購物袋 ↗' : done ? `繼續加入 ${n-done} 件 ＋` : '全套加入 ＋';
    $('routine-add').disabled = $('bag-add').disabled = state.busy || !state.ready || n === 0;
  }
  function accepted(result) {
    return !!result?.cart?.id && Number(result.cart.totalQuantity) > 0 && !result.userErrors?.length && !result.warnings?.length;
  }
  async function addItems(items, batch, button) {
    if (state.busy || !items.length) return;
    if (typeof window.addToCart !== 'function') {
      if (batch) $('routine').scrollIntoView({behavior:media.matches?'instant':'smooth'});
      else location.assign(productUrl(items[0]));
      return;
    }
    state.busy = true; syncButtons();
    let count = 0, demo = false;
    const oldText = button?.textContent;
    if (button && !batch) button.textContent = '…';
    $('cart-feedback').textContent = '正在逐件核對存貨並加入購物袋…';
    try {
      for (const p of items) {
        const v = variant(p);
        if (!v) throw new Error('stock');
        const result = await window.addToCart(v.id,1);
        if (!accepted(result)) throw new Error('add');
        demo = demo || String(result.cart.id).startsWith('gid://demo/');
        count++;
        state.batchDone.add(v.id);
      }
      $('cart-feedback').textContent = `${demo?'示範購物袋：':'已加入購物袋：'}${count} 件。可到購物袋核對內容。`;
      if (!batch && button?.isConnected) {
        button.textContent = '✓';
        animate(button,[{transform:'scale(.75)'},{transform:'scale(1.3)',offset:.5},{transform:'scale(1)'}],{duration:550});
      }
    } catch (_) {
      $('cart-feedback').textContent = count ? `已加入 ${count} 件，其餘暫時未能加入。可重試餘下產品，或到購物袋核對。` : '暫時未能加入，可能存貨已更新或連線中斷。請重試或按產品查看詳情。';
      if (button && !batch) button.textContent = oldText;
    } finally { state.busy = false; syncButtons(); }
  }
  function addRoutine(button) {
    if (state.busy) return;
    const all = [...state.selected.values()], remaining = all.filter((p)=> !state.batchDone.has(variant(p).id));
    if (all.length && !remaining.length) { location.assign('/cart.html'); return; }
    addItems(remaining,true,button);
  }
  document.addEventListener('click',(e)=> {
    const b = e.target.closest('button'); if (!b || b.disabled || state.busy) return;
    if (b.dataset.skin || b.dataset.concern) {
      const group = b.dataset.skin ? 'skin' : 'concern';
      state[group] = state[group] === b.dataset[group] ? '' : b.dataset[group];
      document.querySelectorAll(`[data-${group}]`).forEach((x)=>{x.setAttribute('aria-pressed',String(x.dataset[group]===state[group]));});
      reactToAnswer(b); build();
    } else if (b.id === 'make-routine') {
      $('routine').scrollIntoView({behavior:media.matches?'instant':'smooth',block:'start'});
      $('routine-title').setAttribute('tabindex','-1'); $('routine-title').focus({preventScroll:true});
    } else if (b.dataset.swapStep) {
      const p = state.pools.get(b.dataset.swapStep)?.find((x)=>x.handle===b.dataset.swapHandle);
      if (p && variant(p)) {
        state.selected.set(b.dataset.swapStep,p); renderRoutine(); renderAlternatives();
        $('cart-feedback').textContent = `已換成 ${p.title}；小計已更新。`;
        $('routine').scrollIntoView({behavior:media.matches?'instant':'smooth',block:'start'});
      }
    } else if (b.dataset.removeStep) {
      state.selected.delete(b.dataset.removeStep); renderRoutine(); renderAlternatives();
      $('cart-feedback').textContent = '已移除呢一步；可喺下面選擇其他款式重新加入。';
    } else if (b.dataset.add) {
      const p = state.products.find((p)=>variant(p)?.id===b.dataset.add);
      if (p) addItems([p],false,b);
    } else if (b.id === 'routine-add' || b.id === 'bag-add') addRoutine(b);
  });
  function renderBrands() {
    const names = ['Torriden','Round Lab','Anua','SKIN1004','COSRX','Beauty of Joseon'];
    $('brand-shelf').innerHTML = names.map((name)=>state.brands.find((b)=>(b.aliases||[b.vendor]).some((v)=>v.toLowerCase()===name.toLowerCase()))).filter(Boolean).map((b)=> {
      const logo = b.logo ? `/${b.logo.replace(/^\//,'')}` : '';
      return `<a href="/shop.html?brand=${encodeURIComponent(b.vendor)}" aria-label="逛${esc(b.vendor)}">${logo?`<img src="${esc(logo)}" alt="${esc(b.vendor)}" width="105" height="30" loading="lazy">`:`<strong>${esc(b.vendor)}</strong>`}<span>逛呢個品牌 ↗</span></a>`;
    }).join('');
  }
  function renderRatings() {
    const list = state.products.filter((p)=>variant(p)&&photo(p)&&state.ratings[p.handle]?.star>0&&state.ratings[p.handle]?.count>0)
      .sort((a,b)=>state.ratings[b.handle].star-state.ratings[a.handle].star||state.ratings[b.handle].count-state.ratings[a.handle].count).slice(0,4);
    $('rated-cards').innerHTML = list.length ? list.map((p)=>card(p)).join('') : '<p>暫時未能載入 Olive Young 評分。可先逛品牌選物。</p>';
  }
  function initMotion() {
    document.querySelectorAll('.intro-item').forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:750,delay:i*80}));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries)=>entries.forEach((e)=>{
        if(e.isIntersecting){animate(e.target,[{opacity:0,transform:'translateY(35px)'},{opacity:1,transform:'translateY(0)'}],{duration:850});observer.unobserve(e.target);}
      }),{threshold:.12});
      document.querySelectorAll('.reveal').forEach((el)=>observer.observe(el));
      const receipt = $('offer-progress');
      const meter = new IntersectionObserver((entries)=>entries.forEach((e)=>{if(e.isIntersecting){const f=$('offer-fill').dataset.fraction||'0';animate($('offer-fill'),[{transform:'scaleX(0)'},{transform:`scaleX(${f})`}],{duration:1100});meter.unobserve(e.target);}}),{threshold:.5});
      meter.observe(receipt);
    }
    let queued = false;
    const drift = () => { queued=false; if(media.matches){$('scene').style.transform='';return;} const r=document.querySelector('.shopper').getBoundingClientRect(); if(r.bottom>0&&r.top<innerHeight)$('scene').style.transform=`translateY(${Math.max(-18,Math.min(18,-r.top*.06))}px)`; };
    addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(drift);}},{passive:true});
    media.addEventListener('change',()=>{if(media.matches){liveAnimations.forEach((a)=>a.cancel());document.querySelectorAll('.answer-flight').forEach((n)=>n.remove());$('scene').style.transform='';}});
  }
  async function json(path) {const r=await fetch(path);if(!r.ok)throw new Error(path);return r.json();}
  async function init() {
    initMotion(); syncButtons();
    const results = await Promise.allSettled([json('/data/catalog.json'),json('/data/ratings.json'),json('/data/brand-universe.json'),json('/data/stores.json')]);
    if(results[0].status!=='fulfilled') {
      $('routine-cards').innerHTML='<p class="loading-note">產品資料暫時未能載入。<a href="/shop.html">直接逛所有產品 ↗</a></p>';
      $('cart-feedback').textContent='未能載入產品，暫時無法建立選購指引。';
      return;
    }
    state.brands=results[2].status==='fulfilled'?results[2].value:[];
    const kbeauty=new Set(state.brands.filter((b)=>b.group==='kbeauty').flatMap((b)=>b.aliases||[b.vendor]).map((v)=>v.toLowerCase()));
    const beautyTypes=new Set(['潔面','爽膚水','精華','面霜','防曬','面膜','棉片','唇釉','唇膏','胭脂','眼影','高光','氣墊粉底','粉底','定妝噴霧','乳液','唇蜜','眼霜']);
    state.products=(results[0].value.v||[]).map(unwrap).filter((p)=>beautyTypes.has(p.productType)&&(kbeauty.size?kbeauty.has(String(p.vendor).toLowerCase()):(p.tags||[]).some((t)=>/^k-beauty$/i.test(t))));
    state.ratings=results[1].status==='fulfilled'?results[1].value.products||{}:{};
    const stores=results[3].status==='fulfilled'?results[3].value.filter((s)=>s.public===true):[];
    $('stores-list').innerHTML=stores.length?stores.map((s)=>`<a href="/stores.html"><strong>${esc(s.name)} ↗</strong><p>${esc(s.address)}</p></a>`).join(''):'<a href="/stores.html">查看門市地址 ↗</a>';
    state.ready=true;build();renderBrands();renderRatings();syncButtons();
  }
  init().catch(()=>{$('cart-feedback').textContent='選購指引暫時未能完成，請直接逛所有產品，或 WhatsApp 問我哋。';});
})();
