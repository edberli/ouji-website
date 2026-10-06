const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const fmt = value => new Intl.NumberFormat('zh-HK').format(value);
const hash = name => Array.from(name).reduce((n, c) => (Math.imul(n, 31) + c.codePointAt(0)) >>> 0, 0);

/** One ledge, two runs, and the same catalogue depths as every other count. */
export function renderShelf(counts, row, mirror) {
  const brands = counts.sorted().filter(b => ['kbeauty', 'beauty'].includes(b.group));
  const max = Math.max(1, ...brands.map(b => b.count));
  const deepest = new Set(brands.slice(0, 5).map(b => b.vendor));
  const tones = ['--o-blue-50', '--o-blue-100', '--o-blue-200', '--o-white'];
  row.innerHTML = `<div class="o-shelf__track">${['kbeauty', 'beauty'].map(group => {
    const run = brands.filter(b => b.group === group);
    if (!run.length) return '';
    const label = group === 'kbeauty' ? 'K-BEAUTY' : 'BEAUTY';
    return `<div class="o-shelf__group"><ol class="o-shelf__books" aria-label="${label}">${run.map(b => {
      const seed = hash(b.name_en), dark = deepest.has(b.vendor);
      const tone = dark ? (seed % 2 ? '--o-blue-650' : '--o-blue-800') : tones[seed % tones.length];
      // Linear depth above a readable floor. Reserve 4px at the top for hash jitter.
      const height = Math.min(160, 84 + 72 * b.count / max + seed % 5);
      const heightDesktop = Math.min(204, 104 + 96 * b.count / max + seed % 5);
      return `<li class="o-shelf__item"><a class="o-shelf__spine" href="/shop?brand=${encodeURIComponent(b.vendor)}" ${dark ? 'data-surface="dark"' : ''} style="--o-spine-height:${height.toFixed(2)}px;--o-spine-height-desktop:${heightDesktop.toFixed(2)}px;--o-spine-fill:var(${tone})" aria-label="${esc(b.name_en)}，${fmt(b.count)} 件現貨"><span class="o-shelf__spine-name">${esc(b.name_en)}</span><span class="o-shelf__spine-count">${fmt(b.count)}</span></a><span class="o-shelf__tooltip" aria-hidden="true">${b.logo ? `<img src="/${esc(b.logo)}" alt="" loading="lazy">` : `<span>${esc(b.name_en)}</span>`}<span>${fmt(b.count)} 件現貨</span></span></li>`;
    }).join('')}</ol><span class="o-shelf__label o-latin">${label}</span></div>`;
  }).join('')}</div>`;
  const ordered = ['kbeauty', 'beauty'].flatMap(group => brands.filter(b => b.group === group));
  mirror.innerHTML = ordered.map(b => `<li>${esc(b.name_en)}，${fmt(b.count)} 件現貨</li>`).join('');
  const edges = () => {
    row.dataset.start = String(row.scrollLeft <= 2);
    row.dataset.end = String(row.scrollLeft + row.clientWidth >= row.scrollWidth - 2);
  };
  row.addEventListener('scroll', edges, {passive: true});
  new ResizeObserver(edges).observe(row);
  row.addEventListener('keydown', event => {
    if (event.target !== row || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    row.scrollBy({left: (event.key === 'ArrowRight' ? 1 : -1) * 160, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth'});
  });
  edges();
  // A logo failing to load still leaves useful brand and stock information.
  row.querySelectorAll('.o-shelf__tooltip img').forEach(img => img.addEventListener('error', () => { img.hidden = true; }));
  return ordered;
}
