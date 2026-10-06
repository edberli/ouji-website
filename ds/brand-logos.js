/** Match visible logo area, including the whitespace in supplied SVG/raster assets. */
export function normalizeBrandLogos(root) {
  const cache = new Map();
  const measure = img => {
    const width = img.naturalWidth, height = img.naturalHeight;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 512 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (data[i + 3] > 32 && Math.min(data[i], data[i + 1], data[i + 2]) < 230) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) return {aspect: width / height, x: 0, y: 0, w: 1, h: 1};
    return {aspect: (right - left + 1) / (bottom - top + 1), x: left / canvas.width, y: top / canvas.height, w: (right - left + 1) / canvas.width, h: (bottom - top + 1) / canvas.height};
  };
  const fit = (img, ink) => {
    const box = img.parentElement, safeWidth = box.clientWidth, safeHeight = box.clientHeight;
    const width = Math.sqrt(1800 * ink.aspect), height = width / ink.aspect;
    const factor = Math.min(1, safeWidth / width, safeHeight / height);
    const w = width * factor, h = height * factor;
    img.style.width = `${w / ink.w}px`; img.style.height = `${h / ink.h}px`;
    img.style.left = `${(safeWidth - w) / 2 - ink.x * w / ink.w}px`;
    img.style.top = `${(safeHeight - h) / 2 - ink.y * h / ink.h}px`;
    img.dataset.logoAspect = ink.aspect.toFixed(3);
    img.dataset.logoArea = (w * h).toFixed(1);
  };
  root.querySelectorAll('.o-brand').forEach(tile => {
    const img = tile.querySelector('.o-brand__logo'), fallback = tile.querySelector('.o-brand__fallback');
    const sizeFallback = () => {
      // Measure the rendered text too, so a long fallback does not outweigh a short logo.
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = '500 20px "League Spartan", sans-serif';
      const metrics = ctx.measureText(fallback.textContent);
      const width = Math.max(1, metrics.width), height = Math.max(1, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 16);
      const factor = Math.min(Math.sqrt(1800 / (width * height)), fallback.parentElement.clientWidth / width, fallback.parentElement.clientHeight / height);
      fallback.style.fontSize = `${20 * factor}px`;
    };
    let ink;
    const update = () => { if (ink) fit(img, ink); else sizeFallback(); };
    const load = () => {
      try {
        ink = cache.get(img.src) || measure(img); cache.set(img.src, ink);
      } catch { ink = {aspect: img.naturalWidth / img.naturalHeight, x: 0, y: 0, w: 1, h: 1}; }
      if (!Number.isFinite(ink.aspect) || ink.aspect <= 0) return fail();
      fallback.hidden = true; img.hidden = false; img.style.visibility = 'visible'; update();
    };
    const fail = () => { ink = null; if (img) img.hidden = true; fallback.hidden = false; sizeFallback(); };
    if (img) {
      img.addEventListener('load', load); img.addEventListener('error', fail);
      if (img.complete) { if (img.naturalWidth) load(); else fail(); }
    } else sizeFallback();
    new ResizeObserver(update).observe(fallback.parentElement);
    document.fonts.ready.then(update);
  });
}
