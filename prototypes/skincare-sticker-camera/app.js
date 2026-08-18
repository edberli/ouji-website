document.getElementById("site-chrome").innerHTML = `
  <div class="promo">8 月 31 日前全單 9 折 · 滿 HK$400 免運費</div>
  <nav class="site-nav" aria-label="主要導覽">
    <a class="site-nav__logo" href="#">OUJI</a>
    <a href="#">全部產品</a><a href="#">品牌</a><a href="#">獲獎產品</a><a href="#">妝感配對</a>
  </nav>`;

const variants = [renderHydro, renderMask, renderLab, renderBoot];
const stage = document.getElementById('stage');
const picker = document.querySelector('.proto-picker');
const highlight = picker.querySelector('.proto-picker-highlight');
const items = [...picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)')];
const replay = picker.querySelector('.proto-picker-replay');
let current = 0;

function moveHighlight() {
  const el = items[current];
  highlight.style.width = el.offsetWidth + 'px';
  highlight.style.transform = `translateX(${el.offsetLeft}px)`;
}

function activateCategory(id) {
  const cat = skinCat(id);
  stage.querySelectorAll('[data-cat]').forEach((control) => {
    const active = control.dataset.cat === cat.id;
    control.toggleAttribute('data-active', active);
    control.setAttribute('aria-pressed', String(active));
  });
  const title = stage.querySelector('[data-product-title]');
  const count = stage.querySelector('[data-product-count]');
  const grid = stage.querySelector('[data-product-grid]');
  const strip = stage.querySelector('[data-photo-strip]');
  if (title) title.textContent = cat.label;
  if (count) count.textContent = `${cat.count} 件`;
  if (grid) grid.innerHTML = skinProducts(cat);
  if (strip) strip.innerHTML = skinPhotoFrames(cat);
}

function mount(i) {
  stage.innerHTML = '';
  requestAnimationFrame(() => {
    stage.innerHTML = variants[i]();
    activateCategory('serum');
  });
}

function setActive(i) {
  if (i < 0 || i >= variants.length) return;
  current = i;
  items.forEach((el, j) => {
    el.toggleAttribute('data-active', j === i);
    if (j === i) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  moveHighlight();
  const url = new URL(location);
  url.searchParams.set('v', i + 1);
  history.replaceState(null, '', url);
  mount(i);
}

items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
replay?.addEventListener('click', () => mount(current));
window.addEventListener('resize', moveHighlight);

stage.addEventListener('click', (event) => {
  const control = event.target.closest('[data-cat]');
  if (control) activateCategory(control.dataset.cat);
});

document.addEventListener('keydown', (e) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= variants.length) setActive(num - 1);
  else if (e.key === 'ArrowRight') setActive((current + 1) % variants.length);
  else if (e.key === 'ArrowLeft') setActive((current - 1 + variants.length) % variants.length);
  else if (e.key === 'r' || e.key === 'R') mount(current);
});

setActive((parseInt(new URLSearchParams(location.search).get('v'), 10) || 1) - 1);
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
