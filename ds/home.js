import {createCounts, inStock, RATING_SOURCE} from './counts.js';
import {renderCard} from './card.js';
import {renderShelf} from './shelf.js';

const $ = selector => document.querySelector(selector);
const node = value => value?.node || value;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => new Intl.NumberFormat('zh-HK', {maximumFractionDigits:2}).format(n);
const variants = p => (p.variants?.edges || []).map(node);
const photos = p => (p.images?.edges || []).map(node).filter(image => image?.url);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const desktopGrid = matchMedia('(min-width:768px)');
const motionAllowed = () => !reduced.matches && !document.documentElement.classList.contains('is-lite') && !document.documentElement.classList.contains('is-reduced');
const shortDated = p => p.productType === '短效期特價' || p.tags?.includes('短效期') || /^【短效期/.test(p.title || '');
const canBuy = (p, v) => globalThis.OUJI_purchasable.isPurchasable(v, {lens:globalThis.OUJI_purchasable.isLensProduct(p)});
const eligible = p => inStock(p) && photos(p).length && p.title !== 'CLIO 極緻捲翹超防水睫毛膏';
const pdp = p => `/product?handle=${encodeURIComponent(p.handle)}`;
const dataURL = name => new URL(`/data/${name}.json`, import.meta.url);
const readJSON = async url => {
  const response = await fetch(url, {cache:'no-cache'});
  if (!response.ok) throw Error(`Data unavailable: ${response.status}`);
  return response.json();
};
let products = [], ratings = {}, rank = {}, offer = 'clearance', concern = 'acne';
const savedWishlist = p => { try { return typeof isInWishlist === 'function' && isInWishlist(p.id); } catch { return false; } };
async function readCatalogue() {
  try {
    const snapshot = await readJSON(dataURL('catalog'));
    const age = Date.now() - Number(snapshot.at);
    if (Array.isArray(snapshot.v) && snapshot.v.length && Number.isFinite(age) && age >= 0 && age <= 36 * 60 * 60 * 1000) return snapshot;
  } catch { /* Use the existing live Storefront loader when the snapshot is unavailable. */ }
  if (typeof getAllProducts === 'function') {
    const result = await getAllProducts({progressive:false});
    if (result?.edges?.length) return {at:Date.now(), v:result.edges};
  }
  throw Error('No current catalogue available');
}

function skeletons(host, count, rail = false) {
  host.innerHTML = Array.from({length:count}, () => `${rail ? '<li class="o-rail__item">' : ''}<div class="o-home-card-skeleton" aria-hidden="true"><div class="o-skeleton"></div><div class="o-skeleton"></div><div class="o-skeleton"></div></div>${rail ? '</li>' : ''}`).join('');
}
function empty(host, message, retry = false, rail = false) {
  const content = `<div class="o-home-empty"><p>${esc(message)}</p>${retry ? '<button class="o-btn o-btn--secondary o-btn--compact" type="button" data-home-retry>再試一次</button>' : '<a class="o-home-text-link" href="/shop">瀏覽全部產品 ↗</a>'}</div>`;
  host.innerHTML = rail ? `<li class="o-rail__item">${content}</li>` : content;
  host.setAttribute('aria-busy', 'false');
}
function toast(message) {
  const element = $('#o-home-toast');
  element.querySelector('p').textContent = message;
  element.hidden = false;
  clearTimeout(toast.timer);
  // A toast stays while focused; it does not swallow the customer's next click.
  const schedule = () => { toast.timer = setTimeout(() => { if (!element.contains(document.activeElement)) element.hidden = true; }, 6000); };
  element.onfocusin = () => clearTimeout(toast.timer);
  element.onfocusout = schedule;
  schedule();
}

/* The shared renderer supplies photography, same-variant prices and stock gates.
   This page adds explicit source labels and actual specification/expiry wording. */
function card(p, options = {}) {
  const template = document.createElement('template');
  template.innerHTML = renderCard(p, {ratings, urlPrefix:'/', ...options});
  const root = template.content;
  root.querySelectorAll('a[href*="product.html?"]').forEach(link => { link.href = pdp(p); });
  root.querySelectorAll('.o-card__image').forEach(image => {
    try {
      const url = new URL(image.getAttribute('src'), location.href);
      if (url.hostname === 'cdn.shopify.com') {
        url.searchParams.set('width', '480');
        image.src = url.href;
      }
    } catch { /* Supplied local photographs remain valid. */ }
    image.width = 480; image.height = 480;
  });
  const rating = root.querySelector('.o-card__rating');
  if (rating) {
    rating.append(document.createTextNode(' · Olive Young'));
    rating.setAttribute('aria-label', `${ratings[p.handle].star} 分，${fmt(ratings[p.handle].count)} 則評價，${RATING_SOURCE}`);
  }
  const live = variants(p).filter(v => canBuy(p, v));
  const specification = [...root.querySelectorAll('.o-card__descriptor')].find(el => el.textContent.endsWith('個色號'));
  // The current snapshot caps variant edges: never claim this is the full shade count.
  if (specification) specification.textContent = '檢視全部規格';
  const wishlist = root.querySelector('[data-action="wishlist"]');
  if (wishlist) {
    const saved = savedWishlist(p);
    wishlist.setAttribute('aria-pressed', String(saved));
    wishlist.textContent = saved ? '♥' : '♡';
  }
  return template.innerHTML;
}
function score(p) {
  const list = typeof awardsFor === 'function' ? awardsFor(p.handle) : [];
  const awardWeight = list.reduce((sum, a) => sum + (a.rank === 1 ? 6 : a.rank === 0 ? 3 : 7 - a.rank * 2) + Math.max(0, a.year - 2022), 0);
  return (rank[p.handle] || 0) * 10 + awardWeight * 6;
}
function distinct(list, limit) {
  const seen = new Set();
  return list.filter(p => {
    const image = photos(p)[0]?.url;
    if (!eligible(p) || seen.has(p.handle) || seen.has(image)) return false;
    seen.add(p.handle); seen.add(image);
    return true;
  }).slice(0, limit);
}

function renderFinder() {
  const config = typeof concernById === 'function' ? concernById(concern) : null;
  const hits = products.filter(p => inStock(p) && !shortDated(p) && typeof matchesConcern === 'function' && matchesConcern(p, config));
  const picks = distinct([...hits].sort((a,b) => score(b) - score(a)), 3);
  const host = $('#o-home-finder-products');
  if (picks.length) host.innerHTML = picks.map(p => card(p)).join('');
  else empty(host, '呢個分類暫時冇現貨選擇。可以揀另一個護膚需要，或者睇全部產品。');
  host.setAttribute('aria-busy', 'false');
  $('#o-home-finder-status').textContent = `${config?.label || '護膚選擇'} · ${fmt(hits.length)} 件現貨${picks.length ? ` · 揀咗 ${fmt(picks.length)} 件畀你睇` : ''}`;
  $('#o-home-finder-link').href = `/shop?concern=${encodeURIComponent(concern)}`;
  syncWishlist();
}

const offerConfig = {
  clearance:{label:'清貨任揀 2 件 $160', href:'/shop', test:p => typeof oujiHasPairDeal === 'function' ? oujiHasPairDeal(p.tags) : p.tags?.includes('兩件優惠')},
  sun:{label:'防曬', href:'/shop?cat=sunscreen', test:p => !shortDated(p) && typeof isSunscreenProduct === 'function' && isSunscreenProduct(p)},
  twin:{label:'孖裝', href:'/shop', test:p => !shortDated(p) && /孖裝|雙支|雙瓶|2\s*(?:支|瓶|只)裝|twin\s*pack|double\s*pack|\bduo\b|(?:x|×)\s*2(?:\b|$)/i.test(p.title || '')},
  dated:{label:'短效期', href:'/short-dated', test:shortDated}
};
const expiry = p => typeof shortDatedExpiry === 'function' ? shortDatedExpiry(p) : (p.tags || []).find(tag => /^到期-\d{4}-\d{2}-\d{2}$/.test(tag))?.slice(3) || '';
function renderOffers() {
  const config = offerConfig[offer];
  const hits = products.filter(p => inStock(p) && config.test(p));
  const ordered = [...hits].sort((a,b) => offer === 'dated' ? (expiry(a) || '9999').localeCompare(expiry(b) || '9999') : score(b) - score(a));
  const picks = distinct(ordered, desktopGrid.matches ? 8 : 4);
  const host = $('#o-home-offer-products');
  if (picks.length) host.innerHTML = picks.map(p => card(p, {
    promo:offer === 'clearance' ? '任揀 2 件 $160' : '',
    descriptor:shortDated(p) ? (expiry(p) ? `到期 ${expiry(p)}` : '到期日請睇產品頁') : ''
  })).join('');
  else empty(host, '呢個優惠分類暫時冇現貨；可以睇其他分類。');
  host.setAttribute('aria-busy', 'false');
  $('#o-home-offer-panel').setAttribute('aria-labelledby', `o-home-tab-${offer}`);
  $('#o-home-offer-link').href = config.href;
  $('#o-home-offer-link').textContent = ['clearance','twin'].includes(offer) ? '全部產品 ↗' : `睇全部${config.label} ↗`;
  $('#o-home-offer-status').textContent = `${config.label} · ${fmt(hits.length)} 件現貨${picks.length ? ` · 顯示 ${fmt(picks.length)} 件` : ''}${offer === 'clearance' ? ' · 單件價如下，指定產品任揀兩件結帳自動優惠' : ''}`;
  for (const [key, tab] of Object.entries(offerConfig)) {
    const count = products.filter(p => inStock(p) && tab.test(p)).length;
    $(`[data-offer-count="${key}"]`).textContent = fmt(count);
  }
  syncWishlist();
}
function renderAwards() {
  const awarded = products.filter(p => inStock(p) && !shortDated(p) && typeof awardsFor === 'function' && awardsFor(p.handle).length);
  const host = $('#o-home-award-products');
  const picks = distinct([...awarded].sort((a,b) => score(b) - score(a)), 12);
  if (picks.length) host.innerHTML = picks.map(p => {
    const award = [...awardsFor(p.handle)].sort((a,b) => b.year - a.year || (a.rank || 99) - (b.rank || 99))[0];
    const body = typeof AWARD_BODIES !== 'undefined' ? AWARD_BODIES[award.body]?.name : award.body;
    const label = `${body} · ${award.year} · ${award.category}${award.note ? ` · ${award.note}` : ''}`;
    return `<li class="o-rail__item">${card(p, {award:label})}</li>`;
  }).join('');
  else empty(host, '暫時冇可展示嘅現貨得獎產品。', false, true);
  host.setAttribute('aria-busy', 'false');
  $('#o-home-award-meta').textContent = `${fmt(awarded.length)} 件現貨得獎產品 · Olive Young、Glowpick、화해、Allure、@cosme`;
  host.dispatchEvent(new Event('o-home:rail-updated'));
}

function animateShelf(counts) {
  const shelf = $('.o-home-shelf');
  const number = $('#o-home-brand-count');
  number.textContent = fmt(counts.brandCount);
  $('.o-home-shelf__number').setAttribute('aria-label', `探索 ${fmt(counts.brandCount)} 個現貨品牌`);
  if (!motionAllowed()) return;
  const spines = [...shelf.querySelectorAll('.o-shelf__spine')];
  // 20ms steps across the visible signature, capped at 200ms; 200ms rise = 400ms total.
  spines.forEach((spine, index) => spine.style.setProperty('--o-home-spine-delay', `${Math.min(index,10) * 20}ms`));
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (!motionAllowed()) return;
    shelf.classList.add('o-home-shelf-enter');
    number.setAttribute('aria-hidden', 'true');
    const start = performance.now();
    const tick = time => {
      const fraction = motionAllowed() ? Math.min(1, (time - start) / 600) : 1;
      number.textContent = fmt(Math.round(counts.brandCount * (1 - (1 - fraction) ** 3)));
      if (fraction < 1) requestAnimationFrame(tick);
      else { number.removeAttribute('aria-hidden'); shelf.classList.remove('o-home-shelf-enter'); }
    };
    requestAnimationFrame(tick);
  }, {threshold:.12});
  observer.observe(shelf);
}

async function loadCatalogue() {
  skeletons($('#o-home-finder-products'), 3);
  skeletons($('#o-home-offer-products'), desktopGrid.matches ? 8 : 4);
  skeletons($('#o-home-award-products'), 5, true);
  const [catalogueResult, brandResult, ratingResult, rankResult] = await Promise.allSettled([
    readCatalogue(), readJSON(dataURL('brand-universe')),
    readJSON(dataURL('ratings')), readJSON(new URL('/featured.json', import.meta.url))
  ]);
  if (catalogueResult.status !== 'fulfilled') {
    for (const id of ['finder','offer','award']) empty($(`#o-home-${id}-products`), '暫時讀唔到產品資料，請再試一次。', true, id === 'award');
    $('#o-home-finder-status').textContent = '產品資料暫時未能載入。';
    $('#o-home-offer-status').textContent = '優惠資料暫時未能載入。';
    empty($('#o-home-shelf-row'), '品牌書架暫時未能載入。', true);
    $('#o-home-count-status').textContent = '現貨數目暫時未能載入。';
    return;
  }
  const catalog = catalogueResult.value;
  products = (catalog.v || []).map(node).filter(Boolean);
  ratings = ratingResult.status === 'fulfilled' ? ratingResult.value.products || {} : {};
  rank = rankResult.status === 'fulfilled' ? rankResult.value.profitRank || {} : {};
  if (brandResult.status === 'fulfilled') {
    try {
      const counts = createCounts(catalog, brandResult.value);
      $('#o-home-stock').textContent = `${counts.format(counts.productCount)} 件現貨`;
      renderShelf(counts, $('#o-home-shelf-row'), $('#o-home-shelf-list'));
      $('#o-home-shelf-row').setAttribute('aria-busy', 'false');
      animateShelf(counts);
      $('#o-home-count-status').textContent = `已載入 ${counts.format(counts.brandCount)} 個現貨品牌。`;
      $('.o-home-shelf').dataset.catalogAt = catalog.at || '';
    } catch { empty($('#o-home-shelf-row'), '品牌資料暫時未能載入。', true); }
  } else empty($('#o-home-shelf-row'), '品牌資料暫時未能載入。', true);
  renderFinder(); renderOffers(); renderAwards();
}
async function loadStores() {
  const host = $('#o-home-store-cards');
  try {
    const stores = (await readJSON(dataURL('stores'))).filter(store => store.public === true);
    host.innerHTML = stores.map(store => `<article class="o-home-store-card"><h3>${esc(store.name)}</h3><p>${esc(store.address)}</p>${store.name.includes('觀塘') ? '<p class="o-home-meta">港鐵觀塘站 D4 出口直行約 2 分鐘</p>' : ''}<div class="o-home-store-card__links"><a class="o-home-text-link" href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent(store.address)}" target="_blank" rel="noopener">Google Maps 路線 ↗</a><a class="o-home-text-link" href="https://wa.me/85290195092">WhatsApp ↗</a></div></article>`).join('');
    if (!stores.length) empty(host, '門市資料更新中，歡迎 WhatsApp 查詢。');
    $('#o-home-public-stores').textContent = `${fmt(stores.length)} 間門市實體店`;
  } catch { host.innerHTML = '<p>門市資料暫時未能載入。<a class="o-home-text-link" href="/stores">門市資料 ↗</a></p>'; }
  host.setAttribute('aria-busy','false');
}

/* One media controller owns autoplay, explicit pause, viewport, tab visibility,
   preference changes and lite mode. Sources are never attached before window.load. */
function initHero() {
  const hero = $('.o-home-hero');
  const video = $('#o-home-video');
  const button = $('#o-home-video-toggle');
  const connection = navigator.connection;
  const mobile = matchMedia('(max-width:767px)');
  const compact = matchMedia('(max-width:1280px)');
  let loaded = document.readyState === 'complete', visible = true, pausedByUser = false, failed = false, sourceKey = '';
  const permitted = () => loaded && motionAllowed() && !connection?.saveData && !failed;
  const label = () => {
    const paused = video.paused;
    button.setAttribute('aria-label', paused ? '播放海邊動畫' : '暫停海邊動畫');
    button.innerHTML = `<span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span><span>${paused ? '播放動畫' : '暫停動畫'}</span>`;
  };
  const sync = () => {
    if (!permitted()) {
      video.pause(); hero.dataset.videoReady = 'false'; button.hidden = true;
      if (video.querySelector('source')) { video.replaceChildren(); video.removeAttribute('src'); video.load(); sourceKey = ''; }
      return;
    }
    button.hidden = false;
    if (!visible || document.hidden || pausedByUser) { video.pause(); label(); return; }
    const key = mobile.matches ? 'm-900' : compact.matches ? 'd-1280' : 'd-1920';
    if (sourceKey !== key) {
      sourceKey = key;
      hero.dataset.videoReady = 'false';
      video.poster = new URL(`/assets/images/world/home-coast-${mobile.matches ? 'm-poster-900' : compact.matches ? 'd-poster-1280' : 'd-poster-1920'}.webp`, import.meta.url).href;
      video.replaceChildren(...['webm','mp4'].map(extension => {
        const source = document.createElement('source');
        source.src = new URL(`/assets/images/world/home-coast-${key}.${extension}`, import.meta.url).href;
        source.type = `video/${extension}`;
        return source;
      }));
      video.muted = true;
      video.load();
    }
    button.hidden = false;
    video.play().then(label).catch(() => {
      label(); // Autoplay denial leaves an honest, working manual-play control.
    });
  };
  video.addEventListener('playing', () => {
    if (!permitted() || !visible || document.hidden || pausedByUser) { video.pause(); return; }
    hero.dataset.videoReady = 'true'; label();
  });
  video.addEventListener('pause', label);
  video.addEventListener('error', () => { failed = true; sync(); });
  button.addEventListener('click', () => { pausedByUser = !video.paused; if (pausedByUser) video.pause(); else sync(); label(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  mobile.addEventListener('change', sync); compact.addEventListener('change', sync);
  new MutationObserver(sync).observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {threshold:0}).observe(hero);
  const onLoad = () => { loaded = true; sync(); };
  if (loaded) sync(); else window.addEventListener('load', onLoad, {once:true});
  if (motionAllowed()) {
    try {
      if (!sessionStorage.getItem('o-home-assembled')) {
        hero.classList.add('o-home-assemble');
        sessionStorage.setItem('o-home-assembled', '1');
        setTimeout(() => hero.classList.remove('o-home-assemble'), 900);
      }
    } catch { /* Disabled storage leaves the poster and all links immediately usable. */ }
  }
}

function initRail(section) {
  const list = section.querySelector('.o-rail__list');
  const previous = section.querySelector('[data-home-rail-prev]');
  const next = section.querySelector('[data-home-rail-next]');
  const segments = [...section.querySelectorAll('[data-home-segment]')];
  let active = 0;
  const scrollToItem = index => {
    const items = [...list.children];
    const item = items[Math.max(0,Math.min(index,items.length - 1))];
    if (item) list.scrollTo({left:item.offsetLeft - list.children[0].offsetLeft,behavior:motionAllowed() ? 'smooth' : 'instant'});
  };
  // No measurements in the scroll event. IO tracks the leftmost visible frame.
  let observer;
  const observe = () => {
    observer?.disconnect();
    const visibility = new Map();
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.intersectionRatio));
      const items = [...list.children];
      const visible = items.filter(item => (visibility.get(item) || 0) > .5);
      if (!visible.length) return;
      active = items.indexOf(visible[0]);
      previous.disabled = (visibility.get(items[0]) || 0) > .98;
      next.disabled = (visibility.get(items.at(-1)) || 0) > .98;
      segments.forEach((segment,index) => {
        if (index === active) segment.setAttribute('aria-current','true');
        else segment.removeAttribute('aria-current');
      });
    }, {root:list,threshold:[0,.5,.99,1]});
    [...list.children].forEach(item => observer.observe(item));
  };
  previous.onclick = () => scrollToItem(active - 1);
  next.onclick = () => scrollToItem(active + 1);
  segments.forEach(segment => segment.onclick = () => scrollToItem(Number(segment.dataset.homeSegment)));
  list.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    scrollToItem(event.key === 'Home' ? 0 : event.key === 'End' ? list.children.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
  });
  list.addEventListener('o-home:rail-updated', observe);
  observe();
}
function syncWishlist() {
  if (typeof isInWishlist !== 'function') return;
  document.querySelectorAll('[data-action="wishlist"]').forEach(button => {
    const product = products.find(p => p.handle === button.closest('[data-handle]')?.dataset.handle);
    if (!product) return;
    const saved = savedWishlist(product);
    button.setAttribute('aria-pressed', String(saved)); button.textContent = saved ? '♥' : '♡';
    button.setAttribute('aria-label', `${saved ? '移除心願單' : '加入心願單'}：${product.title}`);
  });
}
function initControls() {
  $('#o-home-toast button').onclick = () => { $('#o-home-toast').hidden = true; };
  $('#o-home-concerns').addEventListener('click', event => {
    const button = event.target.closest('[data-concern]');
    if (!button) return;
    concern = button.dataset.concern;
    $('#o-home-concerns').querySelectorAll('button').forEach(chip => chip.setAttribute('aria-pressed', String(chip === button)));
    if (products.length) renderFinder();
  });
  const tabs = [...document.querySelectorAll('[data-offer]')];
  const select = button => {
    offer = button.dataset.offer;
    tabs.forEach(tab => { tab.setAttribute('aria-selected', String(tab === button)); tab.tabIndex = tab === button ? 0 : -1; });
    if (products.length) renderOffers();
  };
  tabs.forEach(button => {
    button.onclick = () => select(button);
    button.onkeydown = event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(button);
      const target = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      target.focus(); select(target);
    };
  });
  desktopGrid.addEventListener('change', () => { if (products.length) renderOffers(); });
  document.addEventListener('click', async event => {
    const retry = event.target.closest('[data-home-retry]');
    if (retry) { retry.disabled = true; await loadCatalogue(); return; }
    const button = event.target.closest('.o-card button[data-action]');
    if (!button || button.disabled) return;
    const product = products.find(p => p.handle === button.closest('[data-handle]')?.dataset.handle);
    if (!product) return;
    if (button.dataset.action === 'wishlist') {
      if (typeof isLoggedIn !== 'function' || !isLoggedIn()) { location.href = '/account'; return; }
      try {
        if (isInWishlist(product.id)) removeFromWishlist(product.id); else addToWishlist(product);
        syncWishlist(); toast(isInWishlist(product.id) ? '已加入心願單' : '已移除心願單');
      } catch { toast('暫時儲存唔到心願單，請再試一次。'); }
      return;
    }
    if (button.dataset.action === 'variants') { location.href = pdp(product); return; }
    const variant = variants(product).find(v => v.id === button.dataset.variantId);
    if (!canBuy(product, variant)) { button.disabled = true; toast('呢款規格暫時缺貨，請到產品頁睇其他選擇。'); return; }
    if (typeof addToCart !== 'function') { location.href = pdp(product); return; }
    button.disabled = true; button.setAttribute('aria-busy','true'); button.textContent = '…';
    try {
      // Existing commerce code verifies the chosen variant with Shopify before adding.
      const result = await addToCart(variant.id, 1);
      const errors = result?.userErrors || [];
      if (!result?.cart || errors.length) throw Error('Cart add failed');
      button.textContent = '✓'; toast('已加入購物袋。');
    } catch { button.textContent = '+'; toast('暫時加唔到購物袋，請到產品頁核對存貨或再試一次。'); }
    finally { button.removeAttribute('aria-busy'); button.disabled = false; setTimeout(() => { button.textContent = '+'; }, 1600); }
  });
  window.addEventListener('storage', syncWishlist);
}

initHero(); initControls();
document.querySelectorAll('[data-home-rail]').forEach(initRail);
// Independent: a catalogue failure must never hide real store information.
loadStores();
loadCatalogue().catch(() => toast('暫時讀唔到產品資料，請重新載入。'));
