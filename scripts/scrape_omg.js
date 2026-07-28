/**
 * Extract product media from an Oh My Glow product page.
 *
 * Paste into the page console (or run via the browser MCP) while a
 * /product/ page is open. Returns JSON with the gallery images, the long
 * Traditional-Chinese detail images, and the per-shade variation map.
 *
 * The page lazy-loads the detail images, so scroll the whole page first:
 *   for (let y = 0; y < document.body.scrollHeight; y += 400) {
 *     window.scrollTo(0, y); await new Promise(r => setTimeout(r, 140));
 *   }
 */
(() => {
  const UP = 'https://www.ohmyglow.co/wp-content/uploads/';
  const CHROME = /logo|badge|banner|gwp|a-solution|addct|placeholder/i;

  const clean = (u) => (u || '').split('?')[0];
  const isUpload = (u) => u.startsWith(UP);
  const isResized = (u) => /-\d+x\d+\.(jpe?g|png|webp)$/i.test(u);

  // Every non-chrome, full-size upload on the page, in DOM order.
  const seen = new Set();
  const media = [];
  document.querySelectorAll('img').forEach((img) => {
    const src = clean(img.currentSrc || img.src || img.dataset.src);
    if (!src || seen.has(src) || !isUpload(src)) return;
    if (isResized(src) || CHROME.test(src)) return;
    seen.add(src);
    media.push({ src, w: img.naturalWidth, h: img.naturalHeight });
  });

  // Tall images are the Taobao-style detail strips; the rest is gallery.
  const detail = media.filter((m) => m.h > m.w * 3).map((m) => m.src);
  const gallery = media
    .filter((m) => m.h <= m.w * 3 && m.w >= 600)
    .map((m) => m.src);

  // WooCommerce keeps the per-variation image in the add-to-cart form.
  let variations = [];
  const form = document.querySelector('[data-product_variations]');
  if (form) {
    try {
      variations = JSON.parse(form.getAttribute('data-product_variations')).map((v) => ({
        shade: Object.values(v.attributes).join(' / '),
        sku: v.sku || '',
        price: v.display_price,
        image: clean(v.image && (v.image.full_src || v.image.src)),
      }));
    } catch (e) {
      variations = [{ error: String(e) }];
    }
  }

  return JSON.stringify(
    {
      url: location.pathname,
      title: document.title.split('|')[0].trim(),
      gallery,
      detail,
      variations,
    },
    null,
    1
  );
})();
