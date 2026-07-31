/**
 * Collect every detail-strip URL on an Olive Young Global product page.
 *
 * The strips are lazy-loaded, so walking the rendered <img> tags only ever
 * yields the one or two currently in view. The full list is already in the
 * server-rendered HTML though — read it straight out of the markup instead
 * of trying to coax the page into loading everything.
 *
 * Paste into the console on a /product/detail page, or run via the browser
 * MCP. Returns newline-separated absolute URLs, in document order.
 */
(() => {
  const html = document.documentElement.innerHTML;

  // Detail strips live under /slicedImg/ or /editorImg/ on the image CDN.
  const cdn = html.match(/https?:\/\/cdn-image\.oliveyoung\.com\/(?:slicedImg|editorImg)[^"'\\\s)]*/g) || [];

  // Some products serve a sequentially-numbered set from the shop CDN
  // (…/Designbook/<date>/<name>_img1.png). Those are worth having too.
  const shop = html.match(/https?:\/\/image\.globaloliveyoungshop\.com\/[^"'\\\s)]*\.(?:png|jpe?g)/gi) || [];

  const seen = new Set();
  const urls = [...cdn, ...shop].filter((u) => {
    const clean = u.split('?')[0];
    if (seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });

  return urls.length + '\n' + urls.join('\n');
})();
