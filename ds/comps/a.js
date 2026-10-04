import {renderCard} from '/ds/card.js';
import {createCounts} from '/ds/counts.js';
import {renderShelf} from '/ds/shelf.js';

const $ = s => document.querySelector(s);
const node = x => x?.node || x;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => new Intl.NumberFormat('zh-HK', {maximumFractionDigits:2}).format(n);
const variants = p => (p.variants?.edges || []).map(node);
// This concept shows physical stock only, including lenses. Never expose preorder as stock.
const stocked = v => !!v?.availableForSale && (v.quantityAvailable == null || v.quantityAvailable > 0) && Number(v.price?.amount) > 0;
const lensProduct = p => p.productType === '隱形眼鏡' || p.options?.[0]?.name === '度數';
const liveVariants = p => variants(p).filter(v => stocked(v) && (!lensProduct(p) || v.quantityAvailable > 0));
const eligible = p => liveVariants(p).length > 0 && p.images?.edges?.some(x => node(x)?.url) && !/^【短效期/.test(p.title) && p.productType !== '短效期特價';
const mobile = matchMedia('(max-width:767px)');
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
const animations = new Set();
let paused = false, catalog = [], ratings = {}, counts, active = 'skin', exploring = false, loaded = false;
let stores = [], cartRead = 0, cartBusy = false, hoverTimer, catFrame = 0, catTimer;
const motion = () => !reduced.matches && !paused;
const shops = {
  skin: {number:'01 / SKINCARE', title:'護膚小店', note:'每日嘅照顧，由一件啱用嘅開始。', href:'/category.html', vendors:['Torriden','Round Lab','Anua'], types:['精華','面霜','爽膚水','防曬','潔面','面膜','棉片','乳液','護膚'], tag:'skincare'},
  makeup: {number:'02 / MAKEUP', title:'彩妝工作室', note:'今日嘅色彩，你話事。', href:'/makeup.html', vendors:['rom&nd','dasique','TIRTIR'], picks:['romand-juicy-lasting-tint','dasique-eyeshadow-palette','tirtir-mask-fit-red-cushion'], types:['氣墊粉底','唇釉','眼影','胭脂','唇膏','高光','彩妝','唇彩'], tag:'makeup'},
  lens: {number:'03 / CONTACT LENSES', title:'隱形眼鏡小店', note:'由顏色到度數，揀返啱你嘅現貨規格。', href:'/lens.html', vendors:['Molak','Lilmoon','TOPARDS'], types:['隱形眼鏡']},
  toys: {number:'04 / LITTLE COMPANIONS', title:'公仔小屋', note:'逛完護膚，再帶位小伙伴返屋企。', href:'/toys.html', vendors:[], types:['公仔','盲盒','玩具','掛件']},
  harbour: {number:'05 / MEET US IN HONG KONG', title:'門市碼頭', note:'兩間真實門市，喺香港等你。', href:'/stores.html', vendors:[]}
};

function animate(el, frames, options = {}) {
  if (!motion() || !el) return null;
  const a = el.animate(frames, {duration:700, easing:'cubic-bezier(.16,1,.3,1)', ...options});
  animations.add(a);
  a.finished.then(() => animations.delete(a)).catch(() => animations.delete(a));
  return a;
}

function toast(message, shopping = false) {
  const el = $('#town-toast');
  el.querySelector('span').textContent = message;
  el.querySelector('a').hidden = !shopping;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { if (!el.matches(':focus-within')) el.hidden = true; }, 5000);
}
$('#town-toast button').addEventListener('click', () => { $('#town-toast').hidden = true; });

function updateMotion() {
  const allowed = motion();
  document.body.classList.toggle('motion-paused', !allowed);
  $('#motion-toggle').setAttribute('aria-pressed', String(allowed));
  $('#motion-toggle').setAttribute('aria-label', reduced.matches ? '系統已設定減少動態' : allowed ? '關閉動態' : '開啟動態');
  $('#motion-toggle span').textContent = allowed ? '開' : '關';
  $('#motion-toggle').disabled = reduced.matches;
  if (!allowed) {
    animations.forEach(a => a.cancel()); animations.clear();
    $('#walking-cat').style.transform = '';
    $('#map-world').style.transform = '';
    document.querySelectorAll('.flying-product').forEach(el => el.remove());
  } else if (exploring) zoom(active);
}
$('#motion-toggle').addEventListener('click', () => { paused = !paused; updateMotion(); });
reduced.addEventListener('change', updateMotion);
updateMotion();

function zoom(key) {
  if (!motion()) return;
  const world = $('#map-world'), pin = $(`[data-shop="${key}"]`);
  const x = pin.offsetLeft / world.clientWidth, y = pin.offsetTop / world.clientHeight;
  const scale = mobile.matches ? 1.19 : 1.27;
  const pan = mobile.matches ? .26 : .34;
  world.style.transform = `translate(${(0.5-x)*world.clientWidth*pan}px, ${(0.44-y)*world.clientHeight*pan}px) scale(${scale})`;
}

function categoryProducts(key) {
  const shop = shops[key];
  const pool = catalog.filter(p => eligible(p) && (shop.types.includes(p.productType) || (shop.tag && p.tags?.includes(shop.tag))));
  // Editorial selection by brand diversity and available data, never sales/popularity claims.
  const candidates = [...pool].sort((a,b) => {
    const score = p => (ratings[p.handle]?.count >= 20 ? 10 : 0) + (liveVariants(p).length === 1 ? 3 : 0);
    return score(b) - score(a) || a.title.localeCompare(b.title, 'zh-HK');
  });
  const picks = [], used = new Set();
  for (const handle of shop.picks || []) {
    const p = pool.find(p => p.handle === handle);
    if (p) { picks.push(p); used.add(p.vendor); }
  }
  for (const vendor of shop.vendors) {
    if (picks.some(p => counts.resolveBrand(p.vendor)?.vendor === vendor)) continue;
    const match = candidates.find(p => counts.resolveBrand(p.vendor)?.vendor === vendor);
    if (match) { picks.push(match); used.add(match.vendor); }
  }
  for (const p of candidates) if (!used.has(p.vendor) && picks.length < 6) { picks.push(p); used.add(p.vendor); }
  for (const p of candidates) if (!picks.includes(p) && picks.length < 6) picks.push(p);
  return picks;
}

function card(p, index) {
  // Pass only stocked variants to shared renderer so its permissive lens preorder policy
  // cannot make an out-of-stock degree or a cheaper unavailable variant buyable here.
  const shown = {...p, variants:{edges:liveVariants(p).map(node => ({node}))}};
  const template = document.createElement('template');
  template.innerHTML = renderCard(shown, {ratings, urlPrefix:'/'});
  const el = template.content.firstElementChild;
  const rating = el.querySelector('.o-card__rating');
  if (rating) rating.textContent = `★ ${ratings[p.handle].star} · Olive Young (${fmt(ratings[p.handle].count)})`;
  // Align prices directly under names, before optional rating/low-stock metadata.
  el.querySelector('.o-card__name').insertAdjacentElement('afterend',el.querySelector('.o-card__price'));
  el.querySelectorAll('.o-card__descriptor').forEach(d => {
    if (d.textContent.includes('個色號')) d.textContent = d.textContent.replace('個色號', '個規格');
  });
  const add = el.querySelector('.o-card__add');
  if (add) {
    const n = variants(shown).length;
    add.dataset.action = n > 1 ? 'variants' : 'quick-add';
    add.setAttribute('aria-label', `${n > 1 ? '揀規格加入購物袋' : '加入購物袋'}：${p.title}`);
    add.title = n > 1 ? '揀規格' : '加入購物袋';
  }
  if (index < 2) {
    const first = el.querySelector('img');
    if (first) { first.loading = 'eager'; first.fetchPriority = 'high'; }
  }
  el.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    // Keep the real image URL and usable product link; never swap in a fake product shot.
    img.alt = `${p.title} · 圖片暫時未能載入`;
  }));
  return el;
}

function storeHTML(store, preview = false) {
  return `<article class="${preview ? 'harbour-preview' : 'store-address'}"><h3>${esc(store.name)}</h3><p>${esc(store.address)}</p><a href="/stores.html">門市詳情及前往方法 ↗</a></article>`;
}
function panelBrands(key, products) {
  const vendors = [...shops[key].vendors, ...products.map(p => counts.resolveBrand(p.vendor)?.vendor)].filter(Boolean);
  const brands = [...new Set(vendors)].map(v => counts.resolveBrand(v)).filter(b => b?.logo).slice(0,3);
  $('#panel-brands').innerHTML = brands.map(b => `<a href="/shop.html?brand=${encodeURIComponent(b.vendor)}" aria-label="${esc(b.name_en)}"><img src="/${esc(b.logo.replace(/^\//,''))}" alt="${esc(b.name_en)}" loading="lazy"></a>`).join('');
}
function renderShop(key, entrance = true) {
  const shop = shops[key];
  $('#shop-title').textContent = shop.title;
  $('#shop-number').textContent = shop.number;
  $('#enter-shop').href = shop.href;
  $('#panel-note').innerHTML = `${esc(shop.note)}<span>${key === 'harbour' ? 'WhatsApp 9019 5092' : '橫掃櫥窗，睇更多 →'}</span>`;
  const host = $('#product-window');
  host.classList.toggle('panel-harbour', key === 'harbour');
  if (key === 'harbour') {
    $('#panel-brands').innerHTML = '<a href="/about.html">關於王子 ↗</a>';
    host.innerHTML = stores.length ? stores.map(s => storeHTML(s,true)).join('') : '<p class="loading-note">門市資料整理中… <a href="/stores.html">直接睇門市 →</a></p>';
  } else if (loaded) {
    const products = categoryProducts(key);
    panelBrands(key, products);
    host.replaceChildren(...products.map(card));
    if (!products.length) host.innerHTML = `<p class="loading-note">呢間小店嘅櫥窗暫時未有現貨。<a href="${shop.href}">入店睇其他選擇 ↗</a></p>`;
    if (entrance) host.querySelectorAll('.o-card').forEach((el,i) => animate(el,[{transform:'translateY(35px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:650,delay:80*i}));
  }
  host.scrollLeft = 0;
  $('#shop-panel').setAttribute('aria-busy', String(!loaded && key !== 'harbour'));
}

function selectShop(key, {keyboard = false, scroll = false} = {}) {
  if (!shops[key]) return;
  const changed = active !== key;
  active = key; exploring = true;
  $('.town').classList.add('is-exploring');
  document.querySelectorAll('[data-shop]').forEach(pin => pin.setAttribute('aria-expanded', String(pin.dataset.shop === key)));
  $('#reset-map').hidden = false;
  zoom(key);
  if (changed) renderShop(key);
  animate($('#shop-panel'), [{transform:'translateY(60px)',opacity:.45},{transform:'translateY(0)',opacity:1}], {duration:800});
  if (keyboard) { $('#shop-title').tabIndex = -1; $('#shop-title').focus({preventScroll:true}); }
  if (scroll) $('#shop-panel').scrollIntoView({block:'start',behavior:motion() ? 'smooth':'instant'});
}
document.querySelectorAll('[data-shop]').forEach(pin => {
  pin.addEventListener('click', e => selectShop(pin.dataset.shop, {keyboard:e.detail === 0}));
  pin.addEventListener('pointerenter', e => {
    if (e.pointerType !== 'mouse' || mobile.matches) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => { if (active !== pin.dataset.shop) selectShop(pin.dataset.shop); },180);
  });
  pin.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
});
document.querySelectorAll('[data-enter]').forEach(b => b.addEventListener('click', () => selectShop(b.dataset.enter,{scroll:true})));
$('#reset-map').addEventListener('click', () => {
  exploring = false; $('.town').classList.remove('is-exploring');
  $('#map-world').style.transform = ''; $('#reset-map').hidden = true;
});
document.querySelectorAll('[data-scroll]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); $(`#${a.dataset.scroll}`).scrollIntoView(); $(`#${a.dataset.scroll}`).tabIndex = -1; $(`#${a.dataset.scroll}`).focus({preventScroll:true}); }));

// Scroll measures are cached on resize. Each scroll frame changes a single transform.
let mapVisible = true, mapMetrics;
function measureMap() {
  const rect = $('#map-viewport').getBoundingClientRect();
  mapMetrics = {top:rect.top + scrollY, width:rect.width, height:rect.height};
  if (exploring) zoom(active);
}
function walkCat() {
  catFrame = 0;
  if (!motion() || !mapVisible || !mapMetrics) return;
  const t = Math.max(0,Math.min(1,(scrollY-mapMetrics.top+90)/(mapMetrics.height*.65)));
  // Approximate the winding stone path, rather than moving the cat in a straight line.
  const path = mobile.matches ? [[0,0],[.10,-.06],[.23,-.13],[.17,-.23]] : [[0,0],[.035,-.04],[.08,-.12],[.055,-.19]];
  const at = Math.min(2,Math.floor(t*3)), local = t*3-at;
  const a = path[at], b = path[at+1];
  const x = (a[0]+(b[0]-a[0])*local)*mapMetrics.width;
  const y = (a[1]+(b[1]-a[1])*local)*mapMetrics.height;
  $('#walking-cat').style.transform = `translate3d(${x}px,${y}px,0)`;
  $('#walking-cat').classList.add('is-walking');
  clearTimeout(catTimer); catTimer = setTimeout(() => $('#walking-cat').classList.remove('is-walking'),200);
}
addEventListener('scroll', () => { if (!catFrame && mapVisible && motion()) catFrame = requestAnimationFrame(walkCat); },{passive:true});
addEventListener('resize', measureMap, {passive:true});
mobile.addEventListener('change', measureMap);
measureMap();
new IntersectionObserver(([e]) => { mapVisible = e.isIntersecting; },{threshold:0}).observe($('#map-viewport'));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    if (e.target.id === 'brand-shelf') e.target.querySelectorAll('.o-shelf__item').forEach((el,i) => {
      if (i < 24) animate(el,[{transform:'translateY(62px) rotate(9deg)',opacity:.2},{transform:'translateY(0) rotate(0)',opacity:1}],{duration:900,delay:Math.min(i,12)*45});
    });
    else if (e.target.id === 'noticeboard') e.target.querySelectorAll('.offer-paper').forEach((el,i) => animate(el,[{transform:'translateY(70px) rotate(-8deg)',opacity:0},{transform:getComputedStyle(el).transform,opacity:1}],{duration:900,delay:i*110}));
    else animate(e.target,[{transform:'translateY(36px)',opacity:.25},{transform:'translateY(0)',opacity:1}],{duration:950});
    revealObserver.unobserve(e.target);
  });
},{threshold:.12});
revealObserver.observe($('#noticeboard')); revealObserver.observe($('.harbour-content'));

function updateBag(cart, unavailable = false) {
  const qty = Number(cart?.totalQuantity || 0);
  const subtotal = Number(cart?.cost?.subtotalAmount?.amount || 0);
  $('#bag-count').textContent = fmt(qty); $('#dock-count').textContent = fmt(qty);
  $('#bag-link').setAttribute('aria-label', `購物袋，${qty} 件產品`);
  $('#bag-total').textContent = unavailable ? '—' : `HK$${fmt(subtotal)}`;
  const progress = $('#threshold-progress');
  progress.setAttribute('aria-valuenow', String(Math.min(599,subtotal)));
  $('#threshold-fill').style.transform = `scaleX(${Math.min(1,subtotal/599)})`;
  let message, dock;
  if (unavailable) { message = '暫時未能讀取購物袋；入袋核對金額及優惠。'; dock = '入袋核對優惠'; }
  else if (subtotal < 99) { message = `加多 HK$${fmt(99-subtotal)}，就可以 7-Eleven／郵局自取免運。`; dock = `差 HK$${fmt(99-subtotal)} 自取免運`; }
  else if (subtotal < 399) { message = `已達自取免運門檻！加多 HK$${fmt(399-subtotal)}，就達滿 $399 減 $20 門檻。`; dock = `已達自取免運 · 差 $${fmt(399-subtotal)} 減 $20`; }
  else if (subtotal < 599) { message = `已達滿 $399 減 $20 門檻！加多 HK$${fmt(599-subtotal)}，達贈品門檻（送完即止）。`; dock = `已達減 $20 門檻 · 差 $${fmt(599-subtotal)} 送面霜`; }
  else { message = '已達自取免運、減 $20 同贈品門檻；面霜送完即止，以結賬顯示為準。'; dock = '已達三項優惠門檻'; }
  $('#threshold-message').textContent = message;
  $('#dock-message').textContent = dock;
}
async function refreshBag() {
  const read = ++cartRead;
  try {
    if (typeof getCart !== 'function') throw Error('Cart unavailable');
    const cart = await getCart();
    if (read === cartRead) updateBag(cart);
  } catch { if (read === cartRead) updateBag(null,true); }
}
function flyToBag(button) {
  if (!motion()) return;
  const cardEl = button.closest('.o-card'), photo = cardEl?.querySelector('img');
  if (!photo) return;
  const start = button.getBoundingClientRect(), end = $('#bag-link').getBoundingClientRect();
  const img = document.createElement('img');
  img.className = 'flying-product'; img.src = photo.src; img.alt = ''; img.setAttribute('aria-hidden','true');
  img.style.left = `${start.left}px`; img.style.top = `${start.top}px`; document.body.append(img);
  const dx = end.left-start.left, dy = end.top-start.top;
  const a = animate(img,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.5}px,${dy*.5-90}px) scale(.8)`,opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.2)`,opacity:0}],{duration:850,easing:'cubic-bezier(.4,0,.2,1)'});
  a?.finished.then(() => img.remove()).catch(() => img.remove());
  animate($('#bag-link'),[{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:600,delay:550});
}
async function addProduct(p, v, button, sourceButton = button) {
  if (cartBusy || !liveVariants(p).some(x => x.id === v.id)) return;
  if (typeof addToCart !== 'function') { toast('暫時加唔到，請到產品頁再試。'); return; }
  cartBusy = true;
  const original = button.innerHTML;
  button.disabled = true; button.setAttribute('aria-busy','true'); button.textContent = '…';
  try {
    // Recheck exact stock here too: shared commerce intentionally permits lens preorders.
    // This town window promises physical stock and therefore fails closed on this read.
    const verified = typeof shopifyFetch === 'function' ? await shopifyFetch(globalThis.OUJI_purchasable.VERIFY_QUERY,{ids:[v.id]}) : null;
    const current = verified?.nodes?.find(x => x?.id === v.id);
    if (!current?.availableForSale || (lensProduct(p) ? !(current.quantityAvailable > 0) : current.quantityAvailable != null && current.quantityAvailable <= 0)) throw Error('Stock not verified');
    // Main site's mutation checks Shopify availability before writing the actual cart.
    const result = await addToCart(v.id,1);
    if (!result?.cart || result.userErrors?.length || result.warnings?.some(w => /OUT_OF_STOCK|NOT_ENOUGH_STOCK/.test(w.code))) throw Error('Add rejected');
    if ($('#variant-dialog').open) $('#variant-dialog').close();
    flyToBag(sourceButton); button.textContent = '✓';
    await refreshBag();
    toast('已加入購物袋。',true);
  } catch { toast('暫時加唔到：存貨可能有變，請到產品頁核對或再試。'); }
  finally { cartBusy = false; button.disabled = false; button.removeAttribute('aria-busy'); setTimeout(() => { if (button.isConnected) button.innerHTML = original; },1200); }
}
function openVariants(p, sourceButton) {
  const dialog = $('#variant-dialog');
  $('#variant-title').textContent = p.title;
  $('#variant-product-link').href = `/product.html?handle=${encodeURIComponent(p.handle)}`;
  const host = $('#variant-options'); host.replaceChildren();
  liveVariants(p).forEach(v => {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<span>${esc(v.title === 'Default Title' ? '標準規格' : v.title)}</span><strong>HK$${fmt(Number(v.price.amount))} ＋</strong>`;
    b.addEventListener('click', () => addProduct(p,v,b,sourceButton)); host.append(b);
  });
  dialog.showModal(); animate(dialog,[{transform:'translateY(70px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:450});
}
$('#variant-dialog').addEventListener('click', e => {
  if (e.target !== $('#variant-dialog')) return;
  const r = e.target.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
});
$('#product-window').addEventListener('click', e => {
  const button = e.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const p = catalog.find(p => p.handle === button.closest('[data-handle]').dataset.handle);
  if (!p) return;
  if (button.dataset.action === 'wishlist') { location.href = '/account.html'; return; }
  const live = liveVariants(p);
  if (!live.length) { button.disabled = true; toast('呢款暫時缺貨。'); return; }
  if (live.length > 1) openVariants(p,button);
  else addProduct(p,live[0],button);
});
addEventListener('storage', e => { if (e.key === 'shopify_cart_id') refreshBag(); });
addEventListener('pageshow', () => refreshBag());

async function readJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error(`Cannot read ${path}: ${response.status}`);
  return response.json();
}
async function loadCatalog() {
  $('#shop-panel').setAttribute('aria-busy','true');
  try {
    const [snapshot, universe, ratingData] = await Promise.all([
      readJSON('/data/catalog.json'),readJSON('/data/brand-universe.json'),readJSON('/data/ratings.json').catch(() => ({products:{}}))
    ]);
    catalog = (snapshot.v || []).map(node).filter(Boolean); ratings = ratingData.products || {};
    if (!catalog.length) throw Error('Empty catalog');
    counts = createCounts(snapshot,universe); loaded = true;
    $('#brand-count').textContent = fmt(universe.filter(b => b.counted).length);
    renderShelf(counts,$('#brand-shelf'),$('#shelf-mirror'));
    // The shared shelf uses site clean URLs; the prototype uses existing files everywhere.
    $('#brand-shelf').querySelectorAll('a').forEach(a => { a.href = `/shop.html${new URL(a.href).search}`; });
    revealObserver.observe($('#brand-shelf'));
    renderShop(active);
  } catch {
    loaded = false;
    $('#product-window').innerHTML = '<div class="loading-note"><p>暫時讀唔到櫥窗資料。</p><button type="button" id="retry-catalog" class="primary">再試一次 ↻</button> <a href="/category.html">直接入護膚小店 ↗</a></div>';
    $('#retry-catalog').addEventListener('click', () => loadCatalog());
    $('#shop-panel').setAttribute('aria-busy','false');
  }
}
readJSON('/data/stores.json').then(data => {
  stores = data.filter(s => s.public === true);
  $('#real-stores').innerHTML = stores.map(s => storeHTML(s)).join('');
  if (active === 'harbour') renderShop(active,false);
}).catch(() => { /* The real store-page link stays available independently of catalogue. */ });
animate($('.town-intro'),[{transform:'translateY(30px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:1100});
animate($('#map-world'),[{transform:'scale(1.09)',opacity:.6},{transform:'scale(1)',opacity:1}],{duration:1500});
animate($('#shop-panel'),[{transform:'translateY(85px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:1000,delay:300});
loadCatalog(); refreshBag();
