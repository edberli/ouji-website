const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const fmt = value => new Intl.NumberFormat('zh-HK', {maximumFractionDigits: 2}).format(value);
const node = value => value?.node || value;
const normalized = value => String(value || '').trim().normalize('NFKC').toLocaleLowerCase('en');
const shopBrand = vendor => `/shop.html?brand=${encodeURIComponent(vendor)}`;
const productURL = handle => `/product.html?handle=${encodeURIComponent(handle)}`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const $status = $('#page-status');

let universe = [];
let products = [];
let ratings = {};
let stores = [];
let productByHandle = new Map();
let currentCover = 0;
let coverVisible = false;
let coverTimer = 0;
let motionPaused = false;
let countVisible = false;
let countDone = false;
let countElapsed = 0;
let countLastFrame = 0;
let countFrame = 0;
const coverAnimations = new Set();

function setStatus(message) {
  if ($status) $status.textContent = message;
}

function canAnimate() {
  return !motionPaused && !reducedMotion.matches && !document.hidden;
}

async function readJSON(path) {
  const response = await fetch(path, {cache: 'no-cache'});
  if (!response.ok) throw new Error(`資料載入失敗 (${response.status})`);
  return response.json();
}

function productVariants(product) {
  return (product?.variants?.edges || []).map(node).filter(Boolean);
}

function canBuy(product, variant) {
  const api = window.OUJI_purchasable;
  if (api?.isPurchasable) {
    return api.isPurchasable(variant, {lens: api.isLensProduct(product)});
  }
  return !!variant && !!variant.availableForSale && (variant.quantityAvailable == null || variant.quantityAvailable > 0);
}

function productPhotos(product) {
  return (product?.images?.edges || []).map(node).filter(image => image?.url);
}

function liveVariants(product) {
  return productVariants(product).filter(variant => canBuy(product, variant));
}

function hasSeveralVariants(product) {
  const total = Number(product?.variants?.totalCount);
  return productVariants(product).length > 1 || (Number.isFinite(total) && total > 1);
}

function lowestPricedVariant(product) {
  return [...liveVariants(product)].sort((left, right) => Number(left.price?.amount) - Number(right.price?.amount))[0] || null;
}

function salePrice(variant) {
  return Number(variant?.price?.amount);
}

function catalogProductCount(product) {
  return liveVariants(product).length > 0;
}

function ratingFor(product) {
  const rating = ratings[product.handle];
  const star = Number(rating?.star);
  const count = Number(rating?.count);
  return Number.isFinite(star) && Number.isFinite(count) && count > 0
    ? {star, count}
    : null;
}

function productPriority(left, right) {
  const a = ratingFor(left);
  const b = ratingFor(right);
  if (!!a !== !!b) return a ? -1 : 1;
  if (a && b && a.star !== b.star) return b.star - a.star;
  if (a && b && a.count !== b.count) return b.count - a.count;
  const aSingle = liveVariants(left).length === 1;
  const bSingle = liveVariants(right).length === 1;
  if (aSingle !== bSingle) return aSingle ? -1 : 1;
  return String(left.title || '').localeCompare(String(right.title || ''), 'zh-Hant');
}

function brandLookup() {
  const result = new Map();
  for (const brand of universe) {
    for (const alias of [brand.vendor, ...(brand.aliases || [])]) {
      if (alias) result.set(normalized(alias), brand);
    }
  }
  return result;
}

function brandTitle(brand) {
  return brand.name_zh || brand.name_en || brand.vendor;
}

function renderLogos() {
  const track = $('#logo-track');
  if (!track) return;
  const brands = universe.filter(brand =>
    brand.counted !== false && ['kbeauty', 'beauty'].includes(brand.group) && brand.logo
  );
  const firstSet = brands.map(brand => `
    <a href="${shopBrand(brand.vendor)}" aria-label="${esc(brandTitle(brand))} 品牌">
      <img src="/${esc(brand.logo.replace(/^\/+/, ''))}" alt="${esc(brandTitle(brand))}" loading="lazy" decoding="async">
    </a>`).join('');
  const duplicateSet = brands.map(brand => `
    <a href="${shopBrand(brand.vendor)}" data-duplicate aria-hidden="true" tabindex="-1">
      <img src="/${esc(brand.logo.replace(/^\/+/, ''))}" alt="" loading="lazy" decoding="async">
    </a>`).join('');
  track.innerHTML = `${firstSet}${duplicateSet}`;
  track.querySelectorAll('img').forEach(image => image.addEventListener('error', () => { image.hidden = true; }, {once: true}));
}

function bindRevealMotion() {
  const targets = [...document.querySelectorAll('.reveal, [data-reveal]')];
  if (!targets.length) return;
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach(element => element.classList.add('is-visible'));
    return;
  }
  document.documentElement.classList.add('js-motion');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = entry.target.matches('.chapter-title-mask') ? entry.target.querySelector('[data-reveal]') : entry.target;
      target?.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {threshold: 0.12, rootMargin: '0px 0px -40px 0px'});
  targets.forEach(element => observer.observe(element.closest('.chapter-title-mask') || element));
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    targets.forEach(element => element.classList.add('is-visible'));
    observer.disconnect();
    document.documentElement.classList.remove('js-motion');
  });
}

function renderCard(product) {
  const photo = productPhotos(product)[0];
  const variants = liveVariants(product);
  const variant = lowestPricedVariant(product);
  if (!photo || !variant) return '';
  const rating = ratingFor(product);
  const multiple = hasSeveralVariants(product) || productVariants(product).length > 1;
  const vendor = product.vendor || '';
  const price = salePrice(variant);
  const actionLabel = multiple ? `想揀款？：${product.title}` : `加入購物袋：${product.title}`;
  const addButton = multiple
    ? `<button class="quick-add" type="button" data-select-variant="${esc(product.handle)}" aria-label="${esc(actionLabel)}" style="min-width:44px;min-height:44px">+</button>`
    : `<button class="quick-add" type="button" data-quick-add="${esc(product.handle)}" data-variant-id="${esc(variant.id)}" aria-label="${esc(actionLabel)}">+</button>`;
  const ratingMarkup = rating
    ? `<span class="product-rating" aria-label="Olive Young Global 評分 ${fmt(rating.star)}，${fmt(rating.count)} 則評價">★ ${fmt(rating.star)} (${fmt(rating.count)}) · Olive Young</span>`
    : '<span class="product-rating" aria-label="評分來源 Olive Young Global">Olive Young · 暫無評分</span>';
  return `
    <article class="product-card" data-handle="${esc(product.handle)}">
      <div class="product-image"><a href="${productURL(product.handle)}" aria-label="查看 ${esc(product.title)}">
        <img src="${esc(photo.url)}" alt="${esc(photo.altText || product.title)}" loading="lazy" decoding="async">
      </a></div>
      <div class="product-meta">
        <span class="product-brand">${esc(vendor)}</span>
        <a class="product-name" href="${productURL(product.handle)}">${esc(product.title)}</a>
        ${ratingMarkup}
        <span class="product-price">HK$${fmt(price)}</span>
        ${addButton}
      </div>
    </article>`;
}

function distinctProducts(list, limit) {
  const usedHandles = new Set();
  const usedImages = new Set();
  const chosen = [];
  const sorted = [...list].filter(p => !/^【短效期/.test(p.title) && p.productType !== '短效期特價').sort(productPriority);
  const type = p => [/防曬|Sunscreen/i,/潔面|洗面|Cleans/i,/爽膚水|化妝水|Toner/i,/精華|安瓶|Serum|Ampoule/i,/面霜|乳液|Cream|Lotion/i,/氣墊|Cushion/i,/面膜|Mask/i].findIndex(pattern => pattern.test(p.title));
  const types = new Set();
  // First choose different steps in a routine, then fill from the rated catalogue.
  const varied = sorted.filter(p => {const key = type(p); if(types.has(key)) return false; types.add(key); return true;});
  for (const product of [...varied, ...sorted]) {
    const photo = productPhotos(product)[0];
    if (!photo || !catalogProductCount(product) || usedHandles.has(product.handle) || usedImages.has(photo.url)) continue;
    usedHandles.add(product.handle);
    usedImages.add(photo.url);
    chosen.push(product);
    if (chosen.length >= limit) break;
  }
  return chosen;
}

const coverBrands = [
  {vendor: 'TIRTIR', label: 'TIRTIR', image: '/assets/images/home/brand/tirtir-v-1000.webp'},
  {vendor: 'Torriden', label: 'Torriden', image: '/assets/images/home/brand/torriden-divein-1000.webp'}
];

function activeCoverFocus() {
  const feature = $('#cover-feature');
  const active = document.activeElement;
  return active === $('#cover-prev') || active === $('#cover-next') || !!feature?.contains(active) || !!$('#cover-products')?.contains(active) || !!$('#variant-dialog')?.open;
}

function cancelCoverTimer() {
  if (!coverTimer) return;
  clearTimeout(coverTimer);
  coverTimer = 0;
}

function trackCoverAnimations(elements) {
  if (!canAnimate() || typeof Element.prototype.animate !== 'function') return;
  for (const [index, element] of elements.entries()) {
    if (!element) continue;
    const animation = element.animate([
      {opacity: 0, transform: 'translateY(12px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 560, delay: index * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both'});
    coverAnimations.add(animation);
    animation.finished.then(() => coverAnimations.delete(animation), () => coverAnimations.delete(animation));
  }
}

function renderCover(index, animate = false) {
  const feature = $('#cover-feature');
  if (!feature) return;
  const outgoing = animate && canAnimate() ? feature.cloneNode(true) : null;
  feature.querySelectorAll('.cover-outgoing').forEach(layer => layer.remove());
  currentCover = (index + coverBrands.length) % coverBrands.length;
  const brand = coverBrands[currentCover];
  const anchor = shopBrand(brand.vendor);
  feature.innerHTML = `
    <a class="cover-image" href="${anchor}">
      <img src="${brand.image}" alt="${esc(brand.label)} 品牌宣傳圖片" width="1000" height="495" fetchpriority="high" decoding="async">
      <span class="cover-image-label">THE COVER / ${esc(brand.label)}</span>
    </a>
    <div class="cover-caption">
      <span>本期封面品牌 · ${String(currentCover + 1).padStart(2, '0')} / 02</span>
      <h2>${esc(brand.label)}</h2>
      <a href="${anchor}">逛品牌 ↗</a>
    </div>`;
  if (animate) trackCoverAnimations([$('.cover-image', feature), $('.cover-caption', feature)]);
  if (outgoing) {
    outgoing.removeAttribute('id');
    outgoing.className = 'cover-outgoing';
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.inert = true;
    outgoing.querySelectorAll('.cover-outgoing').forEach(layer => layer.remove());
    feature.append(outgoing);
    const fade = outgoing.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}], {duration:560,easing:'ease-out',fill:'forwards'});
    coverAnimations.add(fade);
    fade.finished.then(()=>outgoing.remove(),()=>outgoing.remove()).finally(()=>coverAnimations.delete(fade));
  }
  renderCoverProducts();
}

function scheduleCover() {
  cancelCoverTimer();
  if (!coverVisible || !canAnimate() || activeCoverFocus()) return;
  coverTimer = window.setTimeout(() => {
    coverTimer = 0;
    if (!coverVisible || !canAnimate() || activeCoverFocus()) return;
    renderCover((currentCover + 1) % coverBrands.length, true);
    scheduleCover();
  }, 7000);
}

function renderCoverProducts() {
  const host = $('#cover-products');
  if (!host) return;
  const vendor = coverBrands[currentCover].vendor;
  const brand = brandLookup().get(normalized(vendor));
  const brandProducts = products.filter(product =>
    normalized(product.vendor) === normalized(brand?.vendor || vendor) && catalogProductCount(product)
  );
  const selected = distinctProducts(brandProducts, 3);
  if (!selected.length) {
    host.innerHTML = '<p class="loading-copy">封面產品暫時未能載入，請到品牌頁瀏覽現貨。</p>';
    host.setAttribute('aria-busy', 'false');
    return;
  }
  host.innerHTML = selected.map(renderCard).join('');
  host.setAttribute('aria-busy', 'false');
}

function titleExcerpt(product, brand) {
  let title = String(product.title || '').replace(/^【短效期[^】]*】\s*/, '').trim();
  const aliases = [brand.vendor, ...(brand.aliases || [])].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (normalized(title).startsWith(normalized(alias))) {
      title = title.slice(alias.length).replace(/^[\s:：|｜–—-]+/, '');
      break;
    }
  }
  return title.length > 58 ? `${title.slice(0, 57).trim()}…` : title;
}

function chapterAccent(index) {
  return ['#d9e5d0', '#d9e3ec', '#ece2d2', '#e4dfec'][index % 4];
}

function positioning(brand) {
  const corpus = products.filter(p => normalized(p.vendor) === normalized(brand.vendor) && catalogProductCount(p)).map(p => p.title).join(' ');
  const keywords = { 'round lab':['白樺樹','獨島','松樹'], skin1004:['積雪草','茶樹','玻尿酸'], 'some by mi':['柚子','蝸牛','茶樹'], skinfood:['胡蘿蔔','米萃','蜂膠'] }[normalized(brand.vendor)] || [];
  const present = keywords.filter(word => corpus.includes(word));
  return present.length > 1 ? `由${present[0]}到${present[1]}，翻開護膚日常。` : '由潔面到保養，揀你嘅日常一步。';
}

function renderChapter(brand, count, index, selected) {
  const id = `chapter-${normalized(brand.vendor).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const displayName = brandTitle(brand);
  const photos = selected.slice(0, 4);
  const quote = positioning(brand);
  const photoItems = photos.map((product, photoIndex) => {
    const image = productPhotos(product)[0];
    return `<img class="chapter-photo${photoIndex === 0 ? ' is-current current' : ''}" src="${esc(image.url)}" alt="${esc(image.altText || product.title)}" loading="lazy" decoding="async" data-photo-index="${photoIndex}">`;
  }).join('');
  const steps = photos.map((product, photoIndex) => `
    <button class="photo-step${photoIndex === 0 ? ' is-current' : ''}" type="button" data-photo-index="${photoIndex}" aria-pressed="${photoIndex === 0}" aria-label="顯示第 ${photoIndex + 1} 件產品圖片">${String(photoIndex + 1).padStart(2, '0')}</button>`).join('');
  const categories = [...new Set(photos.map(p => p.productType).filter(Boolean))];
  const notes = `<p class="editorial-note">今章選讀 · ${esc(categories.join(' ／ '))}<br>圖片下方有價錢；揀好就直接加袋。</p>`;
  const cardMarkup = photos.map(renderCard).join('');
  return `
    <article class="chapter" id="${id}" style="--chapter-accent:${chapterAccent(index)}">
      <header class="chapter-head">
        <span class="eyebrow">CHAPTER / ${String(index + 1).padStart(2, '0')} · ${fmt(count)} 款現貨</span>
        <div class="chapter-title-mask"><h2 class="chapter-title" data-reveal>${esc(displayName)}</h2></div>
        <p class="chapter-quote">「${esc(quote)}」</p>
      </header>
      <section class="chapter-spread" aria-label="${esc(displayName)}產品專頁">
        <div class="chapter-visual">
          <div class="chapter-photo-stack">${photoItems}</div>
          <div class="photo-caption"><span>${esc(displayName)} · 現貨選讀</span><span class="photo-index">01 / ${String(photos.length).padStart(2, '0')}</span></div>
          <div class="photo-steps" role="group" aria-label="切換產品照片">${steps}</div>
          <div class="chapter-progress" aria-hidden="true"><div></div></div>
        </div>
        <div class="chapter-content">
          ${notes}
          <div class="product-rail">${cardMarkup}</div>
          <a class="brand-link" href="${shopBrand(brand.vendor)}"><span>逛 ${esc(displayName)} 品牌頁</span><span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </article>`;
}

function renderChapters() {
  const host = $('#chapters');
  const indexHost = $('#chapter-index');
  if (!host || !indexHost) return;
  const lookup = brandLookup();
  const counts = new Map(universe.map(brand => [brand.vendor, 0]));
  const byBrand = new Map(universe.map(brand => [brand.vendor, []]));
  for (const product of products) {
    if (!catalogProductCount(product)) continue;
    const brand = lookup.get(normalized(product.vendor));
    if (!brand) continue;
    counts.set(brand.vendor, (counts.get(brand.vendor) || 0) + 1);
    byBrand.get(brand.vendor)?.push(product);
  }
  const candidates = universe
    .filter(brand => brand.counted !== false && (brand.categories || []).includes('護膚'))
    .map(brand => ({brand, count: counts.get(brand.vendor) || 0}))
    .filter(item => item.count > 0)
    .sort((left, right) => right.count - left.count);
  const chapters = [];
  for (const candidate of candidates) {
    const selected = distinctProducts(byBrand.get(candidate.brand.vendor) || [], 4);
    if (selected.length < 4) continue;
    chapters.push({...candidate, selected});
    if (chapters.length === 4) break;
  }
  if (!chapters.length) {
    host.innerHTML = '<p class="loading-copy">品牌專章暫時未能載入，請再試一次。</p>';
    indexHost.innerHTML = '<span>品牌篇章暫時未能載入。</span>';
    return;
  }
  indexHost.innerHTML = chapters.map(({brand, count}, index) => {
    const id = `chapter-${normalized(brand.vendor).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    return `<a href="/ds/comps/b.html#${id}"><span>CHAPTER / ${String(index + 1).padStart(2, '0')} · ${fmt(count)} 款現貨</span>${esc(brandTitle(brand))}</a>`;
  }).join('');
  host.innerHTML = chapters.map(({brand, count, selected}, index) => renderChapter(brand, count, index, selected)).join('');
  host.querySelectorAll('.chapter').forEach(initChapterPhotoControl);
}

function initChapterPhotoControl(chapter) {
  const spread = $('.chapter-spread', chapter);
  const photos = [...chapter.querySelectorAll('.chapter-photo')];
  const steps = [...chapter.querySelectorAll('.photo-step')];
  const indexLabel = $('.photo-index', chapter);
  const progress = $('.chapter-progress > div', chapter);
  if (!spread || !photos.length || photos.length !== steps.length) return;
  let active = 0;
  let nearViewport = !('IntersectionObserver' in window);
  let frame = 0;
  const show = (next, progressValue = (next + 1) / photos.length) => {
    active = Math.max(0, Math.min(photos.length - 1, next));
    photos.forEach((photo, photoIndex) => {
      const current = photoIndex === active;
      photo.classList.toggle('is-current', current);
      photo.classList.toggle('current', current);
      steps[photoIndex].classList.toggle('is-current', current);
      steps[photoIndex].setAttribute('aria-pressed', String(current));
    });
    if (indexLabel) indexLabel.textContent = `${String(active + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    if (progress) progress.style.transform = `scaleX(${Math.max(0, Math.min(1, progressValue))})`;
  };
  const updateFromScroll = () => {
    frame = 0;
    if (!nearViewport || reducedMotion.matches) return;
    const rect = spread.getBoundingClientRect();
    const span = Math.max(1, rect.height + window.innerHeight * 0.3);
    const fraction = Math.max(0, Math.min(0.999999, (window.innerHeight * 0.3 - rect.top) / span));
    show(Math.floor(fraction * photos.length), fraction);
  };
  const schedule = () => {
    if (!nearViewport || reducedMotion.matches || frame) return;
    frame = requestAnimationFrame(updateFromScroll);
  };
  steps.forEach((button, stepIndex) => button.addEventListener('click', () => show(stepIndex)));
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      nearViewport = entry.isIntersecting;
      if (nearViewport) schedule();
    }, {rootMargin: '250px 0px', threshold: 0});
    observer.observe(spread);
  }
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) schedule();
    else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
  show(0, 0);
}

function renderStores() {
  const host = $('#stores-list');
  if (!host) return;
  const publicStores = stores.filter(store => store.public === true);
  if (!publicStores.length) {
    host.innerHTML = '<p>門市資料暫時未能載入。</p>';
    return;
  }
  host.innerHTML = publicStores.map(store => {
    const mapURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`;
    return `<article class="store-card"><h3>${esc(store.name)}</h3><p>${esc(store.address)}</p><a href="${mapURL}" target="_blank" rel="noopener noreferrer">Google Maps 路線 ↗</a></article>`;
  }).join('');
}

function formatMoney(amount) {
  return fmt(Math.round((amount + Number.EPSILON) * 100) / 100);
}

function updateCartSummary(cart) {
  const bagCount = $('#bag-count');
  const bagTotal = $('#bag-total');
  const thresholdCopy = $('#threshold-copy');
  const progress = $('#offer-progress');
  const total = Number(cart?.cost?.subtotalAmount?.amount);
  const quantity = Number(cart?.totalQuantity);
  if (bagCount && Number.isFinite(quantity)) bagCount.textContent = fmt(Math.max(0, quantity));
  if (bagTotal && Number.isFinite(total)) bagTotal.textContent = `HK$${formatMoney(Math.max(0, total))}`;
  if (Number.isFinite(total)) {
    const subtotal = Math.max(0, total);
    const threshold = 399;
    const gap = Math.max(0, threshold - subtotal);
    if (thresholdCopy) thresholdCopy.textContent = gap > 0
      ? `再買 HK$${formatMoney(gap)} · 滿 HK$399 減 $20`
      : '已達滿 HK$399 減 $20 門檻';
    if (progress) {
      progress.style.transform = `scaleX(${Math.min(1, subtotal / threshold)})`;
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', '滿 HK$399 減 $20 進度');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', String(threshold));
      progress.setAttribute('aria-valuenow', String(Math.min(threshold, subtotal)));
    }
  }
}

function updateEmptyCart() {
  updateCartSummary({totalQuantity: 0, cost: {subtotalAmount: {amount: '0', currencyCode: 'HKD'}}});
}

async function refreshCartSummary() {
  if (typeof window.getCart !== 'function') return null;
  const cart = await window.getCart();
  if (cart) updateCartSummary(cart);
  else updateEmptyCart();
  return cart;
}

async function loadInitialCart() {
  if (typeof window.getCart !== 'function') return;
  try {
    await refreshCartSummary();
  } catch {
    setStatus('購物袋金額暫時未能更新。');
  }
}

function setButtonText(button, text) {
  button.textContent = text;
}

async function addVariant(product, variant, button) {
  if (!canBuy(product, variant)) {
    setStatus('呢個規格已無現貨，請重新選擇。');
    return false;
  }
  if (typeof window.addToCart !== 'function') {
    setStatus('購物袋功能暫時未能使用，請稍後再試。');
    return false;
  }
  const originalText = button?.dataset.originalText || button?.textContent || '加入購物袋';
  if (button) {
    button.dataset.originalText = originalText;
    button.disabled = true;
    button.classList.add('is-busy');
    button.setAttribute('aria-busy', 'true');
    setButtonText(button, '加入中…');
  }
  try {
    const result = await window.addToCart(variant.id, 1);
    if (!result?.cart || result.userErrors?.length) throw new Error('購物袋未能加入呢件產品。');
    if (Number.isFinite(Number(result.cart.totalQuantity)) && $('#bag-count')) {
      $('#bag-count').textContent = fmt(Number(result.cart.totalQuantity));
    }
    let cart = null;
    let refreshed = false;
    try {
      if (typeof window.getCart === 'function') {
        cart = await window.getCart();
        if (cart) {
          updateCartSummary(cart);
          refreshed = true;
        }
      }
    } catch { /* The confirmed add remains true; leave the last verified total visible. */ }
    if (button) {
      button.classList.add('is-added');
      setButtonText(button, '已加入 ✓');
    }
    const isDemoCart = String(result.cart.id || '').startsWith('gid://demo/Cart/');
    setStatus(isDemoCart
      ? `示範購物袋已更新：${product.title}`
      : refreshed ? `已加入購物袋：${product.title}` : `已加入購物袋：${product.title}；金額暫時未能重新讀取。`);
    return true;
  } catch (error) {
    if (button) setButtonText(button, originalText);
    setStatus(error?.message || '加入購物袋失敗，請再試一次。');
    return false;
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove('is-busy');
      button.removeAttribute('aria-busy');
    }
  }
}

function openVariantDialog(product) {
  const dialog = $('#variant-dialog');
  const content = $('#variant-content');
  if (!dialog || !content) {
    setStatus('款式選擇暫時未能開啟。');
    return;
  }
  const variants = productVariants(product);
  const markup = variants.map(variant => {
    const available = canBuy(product, variant);
    const price = salePrice(variant);
    return `<button type="button" data-variant-choice="${esc(variant.id)}" data-product-handle="${esc(product.handle)}" ${available ? '' : 'disabled'} aria-label="${esc(variant.title)}${available ? `，HK$${fmt(price)}` : '，暫時缺貨'}">
      <span>${esc(variant.title || '標準款')}</span> · ${available ? `HK$${fmt(price)}` : '暫時缺貨'}
    </button>`;
  }).join('');
  content.innerHTML = `<h3>想揀款？</h3><p>${esc(product.title)}</p>${markup}`;
  if (!dialog.open) dialog.showModal();
}

function bindCommerceControls() {
  const bagButton = $('#bag-button');
  if (bagButton instanceof HTMLAnchorElement) bagButton.href = '/cart.html';
  const closeButton = $('[data-close-dialog]');
  closeButton?.addEventListener('click', () => $('#variant-dialog')?.close());
  $('#variant-dialog')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  document.addEventListener('click', async event => {
    const close = event.target.closest('[data-close-dialog]');
    if (close) {
      $('#variant-dialog')?.close();
      return;
    }
    const choice = event.target.closest('[data-variant-choice]');
    if (choice && !choice.disabled) {
      const product = productByHandle.get(choice.dataset.productHandle);
      const variant = productVariants(product).find(item => item.id === choice.dataset.variantChoice);
      if (product && variant && await addVariant(product, variant, choice)) $('#variant-dialog')?.close();
      return;
    }
    const quickAdd = event.target.closest('[data-quick-add]');
    if (quickAdd && !quickAdd.disabled) {
      const product = productByHandle.get(quickAdd.dataset.quickAdd);
      const variant = productVariants(product).find(item => item.id === quickAdd.dataset.variantId);
      if (product && variant) await addVariant(product, variant, quickAdd);
      return;
    }
    const chooseVariant = event.target.closest('[data-select-variant]');
    if (chooseVariant && !chooseVariant.disabled) {
      const product = productByHandle.get(chooseVariant.dataset.selectVariant);
      if (product) openVariantDialog(product);
    }
  });
}

function pauseCoverAnimations(paused) {
  for (const animation of coverAnimations) {
    try { paused ? animation.pause() : animation.play(); } catch { coverAnimations.delete(animation); }
  }
}

function paintMotionToggle() {
  const button = $('#motion-toggle');
  if (!button) return;
  button.setAttribute('aria-pressed', String(motionPaused));
  button.setAttribute('aria-label', motionPaused ? '播放動畫' : '暫停動畫');
  const icon = button.firstChild;
  if (icon?.nodeType === Node.TEXT_NODE) icon.textContent = motionPaused ? '▶' : 'Ⅱ';
  const label = $('span', button);
  if (label) label.textContent = motionPaused ? '播放動畫' : '暫停動畫';
}

function startCountAnimation() {
  const number = $('#brand-number');
  if (!number || countDone || countFrame || !countVisible || !canAnimate()) return;
  const target = universe.length || 57;
  let started = 0;
  const tick = now => {
    countFrame = 0;
    if (!canAnimate() || !countVisible) {
      countLastFrame = 0;
      return;
    }
    if (!started) started = now;
    if (!countLastFrame) countLastFrame = now;
    countElapsed += now - countLastFrame;
    countLastFrame = now;
    const progress = Math.min(1, countElapsed / 1000);
    const eased = 1 - ((1 - progress) ** 3);
    number.textContent = String(Math.round(1 + (target - 1) * eased)).padStart(2, '0');
    if (progress >= 1) {
      number.textContent = String(target).padStart(2, '0');
      countDone = true;
      countLastFrame = 0;
      return;
    }
    countFrame = requestAnimationFrame(tick);
  };
  if (countElapsed === 0) number.textContent = '01';
  countFrame = requestAnimationFrame(tick);
}

function syncAmbientMotion() {
  if (reducedMotion.matches) {
    cancelCoverTimer();
    coverAnimations.forEach(animation => { try { animation.cancel(); } catch {} });
    coverAnimations.clear();
    const number = $('#brand-number');
    if (number) number.textContent = String(universe.length || 57).padStart(2, '0');
    countDone = true;
    if (countFrame) cancelAnimationFrame(countFrame);
    countFrame = 0;
    countLastFrame = 0;
    return;
  }
  pauseCoverAnimations(!canAnimate());
  if (!canAnimate()) {
    cancelCoverTimer();
    if (countFrame) cancelAnimationFrame(countFrame);
    countFrame = 0;
    countLastFrame = 0;
    return;
  }
  startCountAnimation();
  scheduleCover();
}

function initAmbientMotion() {
  const toggle = $('#motion-toggle');
  motionPaused = false;
  document.documentElement.classList.remove('motion-paused');
  paintMotionToggle();
  $('#cover-prev')?.addEventListener('click', () => {renderCover(currentCover - 1, true); scheduleCover();});
  $('#cover-next')?.addEventListener('click', () => {renderCover(currentCover + 1, true); scheduleCover();});
  toggle?.addEventListener('click', () => {
    motionPaused = !motionPaused;
    document.documentElement.classList.toggle('motion-paused', motionPaused);
    paintMotionToggle();
    syncAmbientMotion();
  });
  document.addEventListener('visibilitychange', syncAmbientMotion);
  reducedMotion.addEventListener('change', syncAmbientMotion);
  document.addEventListener('focusin', scheduleCover);
  document.addEventListener('focusout', () => queueMicrotask(scheduleCover));
  const feature = $('#cover-feature');
  if (feature && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      coverVisible = entry.isIntersecting && entry.intersectionRatio > 0;
      syncAmbientMotion();
    }, {threshold: [0, 0.01]});
    observer.observe(feature);
  } else {
    coverVisible = !!feature;
  }
  const number = $('#brand-number');
  if (number && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      countVisible = entry.isIntersecting;
      if (countVisible) startCountAnimation();
      else if (countFrame) {
        cancelAnimationFrame(countFrame);
        countFrame = 0;
        countLastFrame = 0;
      }
    }, {threshold: 0.12});
    observer.observe(number);
  } else {
    countVisible = true;
  }
  syncAmbientMotion();
}

async function loadMagazine() {
  const [universeResult, catalogResult, ratingResult, storesResult] = await Promise.allSettled([
    readJSON('/data/brand-universe.json'),
    readJSON('/data/catalog.json'),
    readJSON('/data/ratings.json'),
    readJSON('/data/stores.json')
  ]);
  const errors = [];
  if (universeResult.status === 'fulfilled' && Array.isArray(universeResult.value)) {
    universe = universeResult.value;
    renderLogos();
  } else errors.push('品牌名錄');
  if (ratingResult.status === 'fulfilled') ratings = ratingResult.value?.products || {};
  if (storesResult.status === 'fulfilled' && Array.isArray(storesResult.value)) {
    stores = storesResult.value;
    renderStores();
  } else errors.push('門市資料');
  if (catalogResult.status === 'fulfilled' && Array.isArray(catalogResult.value?.v)) {
    products = catalogResult.value.v.map(node).filter(Boolean);
    productByHandle = new Map(products.filter(product => product.handle).map(product => [product.handle, product]));
    renderCover(0, false);
    renderChapters();
    bindRevealMotion();
    syncAmbientMotion();
  } else {
    errors.push('產品目錄');
    const coverProducts = $('#cover-products');
    if (coverProducts) {
      coverProducts.innerHTML = '<p class="loading-copy">產品資料暫時未能載入，請到選購頁瀏覽。</p>';
      coverProducts.setAttribute('aria-busy', 'false');
    }
    const chapters = $('#chapters');
    if (chapters) chapters.innerHTML = '<p class="loading-copy">品牌專章暫時未能載入。</p>';
  }
  renderCoverProducts();
  renderStores();
  const coverFeature = $('#cover-feature');
  if (coverFeature && !coverFeature.querySelector('.cover-image')) renderCover(0, false);
  if (errors.length) setStatus(`${errors.join('、')}暫時未能載入，請重新整理再試。`);
}

initAmbientMotion();
bindCommerceControls();
loadInitialCart();
loadMagazine().catch(() => setStatus('品牌雜誌資料暫時未能載入，請重新整理再試。'));
