/* Product page display names, derived from the existing exact Shopify title.
 * This file is shared by the server-rendered product page and browser SEO.
 * It never changes Shopify Product Title, identifiers, or the Merchant feed. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OUJI_productNaming = api;
})(typeof window !== 'undefined' ? window : null, function () {
  const HAN = /[\u3400-\u9fff]/;
  const LATIN = /[A-Za-z]/;
  const WORD = /(?<![A-Za-z])[A-Za-z][A-Za-z0-9+&.\-]*/g;
  const compact = (value) => String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const EXACT = {
    'gid://shopify/Product/8863148834974': {
      title: 'UNOVE 深層修護髮膜 Deep Damage Treatment EX 320ml x2（Tender Bloom 花香 + Warm Petals 木質花香）',
      primary: 'UNOVE 深層修護髮膜', subtitle: 'UNOVE Deep Damage Treatment EX',
      specification: '320ml x2（Tender Bloom 花香 + Warm Petals 木質花香）',
      seoTitle: 'UNOVE 深層修護髮膜｜Deep Damage Treatment EX 320ml x2',
    },
    'gid://shopify/Product/8863159287966': {
      title: 'ma:nyo 純淨卸妝油套裝 Pure Cleansing Oil 200ml + 補充裝 Refill 200ml + 試用裝 2ml x 3',
      primary: 'ma:nyo 純淨卸妝油套裝', subtitle: 'ma:nyo Pure Cleansing Oil',
      specification: '200ml + 補充裝 Refill 200ml + 試用裝 2ml x 3',
      seoTitle: 'ma:nyo 純淨卸妝油套裝｜Pure Cleansing Oil 200ml＋補充裝',
    },
    'gid://shopify/Product/8887485104286': {
      title: 'FANCL White Force 營養片 180粒（30日份）',
      primary: 'FANCL 營養片', subtitle: 'FANCL White Force',
      specification: '180粒（30日份）', seoTitle: 'FANCL 營養片｜White Force 180粒',
    },
  };

  function brandFromTitle(title, vendor) {
    const firstHan = title.search(HAN);
    const before = firstHan >= 0 ? clean(title.slice(0, firstHan)) : title;
    if (!before) return clean(vendor);
    if (vendor && compact(before).startsWith(compact(vendor))) {
      const initial = clean(before.slice(0, vendor.length));
      if (compact(initial) === compact(vendor)) return initial;
    }
    if (vendor && compact(vendor).startsWith(compact(before))) return before;
    return before;
  }

  function latinBrand(brand, vendor) {
    if (!HAN.test(brand)) return brand;
    const roman = clean(vendor.replace(/[\u3400-\u9fff]+/g, ' '));
    return LATIN.test(roman) ? roman : '';
  }

  /* The boundary is an existing Latin word after the Chinese product type.
     Skip ingredient acronyms embedded in that Chinese phrase (AHA, pH, SPF).
     A later Chinese unit like 10片 is a specification, not a new name. */
  function englishStart(title) {
    const firstHan = title.search(HAN);
    if (firstHan < 0) return -1;
    const matches = [...title.matchAll(WORD)];
    for (const match of matches) {
      if (match.index <= firstHan) continue;
      if (HAN.test(title[match.index - 1] || '')
          && /^\s+[A-Za-z]{3,}/.test(title.slice(match.index + match[0].length))) continue;
      const after = title.slice(match.index);
      const nextHan = after.search(HAN);
      if (nextHan >= 0 && nextHan < 30 && /[A-Za-z]{3,}/.test(after.slice(nextHan))) continue;
      if (!/[A-Za-z]{2}/.test(match[0])) continue;
      const before = title.slice(0, match.index);
      const numeric = before.match(/(?:^|\s)(\d{1,5})\s+$/);
      return numeric ? match.index - numeric[1].length - 1 : match.index;
    }
    return -1;
  }

  function display(product) {
    const rawTitle = clean(product?.title);
    const exact = EXACT[product?.id];
    if (exact && exact.title === rawTitle) return { ...exact, split: true };
    const shortDatedMarker = (rawTitle.match(/【短效期[^】]*】/) || [])[0] || '';
    const title = clean(rawTitle.replace(/【短效期[^】]*】/g, ''));
    const vendor = clean(product?.vendor);
    const start = englishStart(title);
    let primary = start >= 0 ? clean(title.slice(0, start)) : title;
    let english = start >= 0 ? clean(title.slice(start)) : '';
    const brand = brandFromTitle(title, vendor);

    /* A rare English-first product: keep its Chinese descriptor as H1. */
    if (!english && HAN.test(title) && vendor && title.startsWith(vendor)) {
      const rest = clean(title.slice(vendor.length));
      const m = rest.match(/^(.+?)\s+([\u3400-\u9fff].*)$/);
      if (m) { primary = clean(`${vendor} ${m[2]}`); english = clean(m[1]); }
    }
    let specification = '';
    const shadeMatch = english.match(/^(.*?)\s+(#[0-9]{1,3}[A-Za-z]?)\s*(.*)$/);
    if (shadeMatch && shadeMatch[1]) {
      english = clean(shadeMatch[1]);
      specification = clean(`${shadeMatch[2]} ${shadeMatch[3]}`);
    }
    const pipeSpecification = english.match(/^(.*?)\s*[｜|]\s*(?=\d)(.*)$/);
    if (pipeSpecification) {
      english = clean(pipeSpecification[1]);
      specification = clean(`${pipeSpecification[2]} ${specification}`);
    }
    const cjkInEnglish = english.search(HAN);
    if (cjkInEnglish >= 0) {
      const left = english.slice(0, cjkInEnglish);
      let at = left.lastIndexOf(' ');
      if (at < 0 && left.includes('｜')) at = left.lastIndexOf('｜');
      if (at >= 0 && /(?:\d|×|x|\+)\s*$/.test(left)) {
        const previous = left.slice(0, at);
        const prevAt = previous.lastIndexOf(' ');
        if (prevAt >= 0 && /(?:×|x|\+)\s*$/.test(previous)) at = prevAt;
      }
      specification = clean(`${english.slice(Math.max(0, at))} ${specification}`);
      english = clean(english.slice(0, Math.max(0, at)));
    }
    const subtitleBrand = latinBrand(brand, vendor);
    const subtitle = english && subtitleBrand && !compact(english).startsWith(compact(subtitleBrand))
      ? clean(`${subtitleBrand} ${english}`) : english;
    let seoSpecification = specification;
    /* For a long shade name, its code is sufficient to identify the page.
       The full shade remains visible below the subtitle and in the source. */
    const shade = specification.match(/^(#[0-9]{1,3}[A-Za-z]?)(?:\s+.+)$/);
    if (shade && `${primary}｜${english} ${specification}`.length > 47) {
      seoSpecification = shade[1];
    }
    const seoEnglish = clean(`${english} ${seoSpecification}`);
    const seoTitle = (seoEnglish ? `${primary}｜${seoEnglish}` : primary)
      + (shortDatedMarker ? '｜短效期' : '');
    if (shortDatedMarker) specification = clean(`${specification} ${shortDatedMarker.slice(1, -1)}`);
    return { primary, subtitle, specification, seoTitle, split: Boolean(english) };
  }

  return { display };
});
