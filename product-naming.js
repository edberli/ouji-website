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

  /* Keep source specifications after the first real size/count unit in the
     English subtitle. A trailing descriptor such as SPF or a scent is part
     of the source specification, even when it contains other Latin words. */
  function cardMeasurement(value) {
    const text = clean(value);
    const amount = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
    const measures = [...text.matchAll(new RegExp(
      amount + '\\s*(?:kg|ml|g|l|oz|片|枚|粒|個|本|支|包)(?![A-Za-z])', 'gi',
    ))];
    const measure = measures[0];
    const before = text.slice(0, measure ? measure.index : text.length);
    const descriptors = [];
    const numbered = before.match(/\bNo\.\s*\d+/i);
    if (numbered) descriptors.push({ index: numbered.index, value: clean(before.slice(numbered.index)) });
    const lightOchre = before.match(/\b\d{1,3}\s+Light\s+Ochre\b/i);
    if (lightOchre) descriptors.push({ index: lightOchre.index, value: clean(lightOchre[0]) });

    if (!measure) return descriptors.map((item) => item.value).join(' ');
    let start = measure.index;
    const opening = text[start - 1];
    const closing = { '[': ']', '(': ')', '（': '）', '【': '】', '{': '}', '［': '］' }[opening];
    if (closing && text.indexOf(closing, start + measure[0].length) >= 0) start--;
    const suffix = clean(text.slice(start));
    const leadingDescriptors = descriptors
      .filter((item) => item.index < measure.index)
      .map((item) => item.value);
    return [...leadingDescriptors, suffix].filter(Boolean).join(' ');
  }

  /* Product tiles have limited space. Remove only a verified brand prefix
     from the existing Chinese-market name. Digits, acronyms, pack counts and
     punctuation inside that name are product identity, never disposable. */
  function cardParts(product) {
    const names = display(product);
    const vendor = clean(product?.vendor);
    const primary = names.primary;
    const candidates = [vendor];
    const romanVendor = clean(vendor.replace(/[\u3400-\u9fff]+/g, ' '));
    if (romanVendor && romanVendor !== vendor) candidates.push(romanVendor);
    const chineseVendor = (vendor.match(/^[\u3400-\u9fff]+/) || [])[0];
    if (chineseVendor) candidates.push(chineseVendor);
    candidates.push((vendor.match(/^[^\s(]+/) || [])[0]);
    /* Compare a whole leading brand, allowing vendor spelling variants such as
       April Skin/APRILSKIN and KSECRET/K-SECRET. Never consume the next word. */
    const prefixes = [...primary.matchAll(/[^\s]+(?=\s|$)/g)]
      .filter((match) => match.index === 0);
    let brand = '';
    const candidateKeys = new Set(candidates.filter(Boolean).map(compact));
    for (const match of prefixes) {
      if (candidateKeys.has(compact(match[0]))) brand = match[0];
    }
    for (const candidate of candidates) {
      if (!candidate || brand.length >= candidate.length) continue;
      const prefix = primary.slice(0, candidate.length);
      if (compact(prefix) === compact(candidate)
          && (!/[A-Za-z0-9]/.test(prefix.at(-1))
            || !/[A-Za-z0-9]/.test(primary[candidate.length] || ''))) brand = prefix;
    }
    let chinese = brand ? clean(primary.slice(brand.length).replace(/^[\s-]+/, '')) : primary;
    if (!HAN.test(chinese)) return { brand: '', chinese: primary };
    /* 卡上已經有「X月X日到期」標籤，名唔使再寫「短效期・到期 YYYY-MM-DD」（產品頁照留） */
    const specification = clean(String(names.specification || '').replace(/短效期[・·]?\s*到期\s*\d{4}-\d{2}-\d{2}/g, ''));
    const measurement = cardMeasurement(names.subtitle);
    const cardSpecs = [];
    const appendSpec = (value) => {
      const spec = clean(value);
      const key = compact(spec);
      if (!key || compact(chinese).includes(key)
          || cardSpecs.some((existing) => compact(existing).includes(key)
            || key.includes(compact(existing)))) return;
      cardSpecs.push(spec);
    };
    if (!compact(specification).includes(compact(measurement))) appendSpec(measurement);
    appendSpec(specification);
    const suffix = cardSpecs.length ? ` ${cardSpecs.join(' ')}` : '';
    return { brand, chinese: clean(chinese + suffix) };
  }

  function cardTitle(product) {
    const parts = cardParts(product);
    return clean(`${parts.brand} ${parts.chinese}`);
  }

  /* Meta description for a product page: the price leads, because it is the
     first thing a shopper scans for in a search result; the product's own
     copy fills the rest of the ~150 characters Google shows. Shared so the
     server (api/product.js) and the browser (analytics.js) write the same
     words — a mismatch makes Google pick one at random. */
  function seoDescription(product) {
    const lo = Number(product?.priceRange?.minVariantPrice?.amount);
    const hi = Number(product?.priceRange?.maxVariantPrice?.amount);
    const money = (n) => `HK$${Number.isInteger(n) ? n : n.toFixed(1)}`;
    const price = lo > 0 ? `${money(lo)}${hi > lo ? ' 起' : ''}｜` : '';
    const raw = String(product?.description || '').replace(/\s+/g, ' ').trim();
    const body = raw
      || `${product?.vendor || 'OUJI'} ${product?.title || ''}｜OUJI 香港 K-Beauty 專門店，正貨韓國直送。`;
    const room = Math.max(60, 150 - price.length);
    return price + (body.length > room ? `${body.slice(0, room)}…` : body);
  }

  /* 產品頁購買區（2026-10-20 Winston 揀咗 Codex 原型嗰種排法）：品牌另起一行，所以大字產品名同英文名都唔再重複品牌；
     英文名入面嘅防曬值同容量拎出嚟，擺喺下面一行規格（SPF50+ PA++++｜50ml × 2｜韓國品牌）。
     伺服器（api/product.js）同瀏覽器（product.html）用同一個 function，載入唔會跳。 */
  const SPF = /SPF\s?(\d+\+?)(?:\s*[,，]?\s*PA\s?(\+{1,4}))?/i;
  const PA = /\bPA\s?(\+{1,4})/i;
  const SIZE = /(\d+(?:\.\d+)?)\s?(ml|mL|ML|g|G|kg|片|枚|pcs|oz|毫升|克)(?![a-wyzA-WYZ])(?:\s*[x×]\s*(\d+)\s*(片|支|入|枚|個)?)?/; // 「Rice 70 Glow」嘅 70 G 唔係容量
  /* 括號唔齊（例如「（Tender Bloom」「EMPATHY (LOVED IVE Ver.」）：由冇收尾嗰個開括號起剪走；頭尾多出嚟嘅分隔符號都剪 */
  const tidy = (value) => {
    let v = clean(value).replace(/^[\s,，、:：\-–—]+|[\s,，、:：\-–—]+$/g, '');
    const pairs = [['(', ')'], ['（', '）'], ['[', ']'], ['【', '】']];
    for (const [o, c] of pairs) {
      const lastOpen = v.lastIndexOf(o);
      if (lastOpen >= 0 && v.indexOf(c, lastOpen) < 0) v = clean(v.slice(0, lastOpen));
      const firstClose = v.indexOf(c);
      if (firstClose >= 0 && v.slice(0, firstClose).indexOf(o) < 0) v = clean(v.slice(firstClose + 1));
    }
    return v.replace(/^[\s,，、:：\-–—]+|[\s,，、:：\-–—]+$/g, '');
  };
  /* ── 規格行一定要有料（Winston 2026-10-20：「就算冇防曬、冇克數，都可以喺品牌國家隔離有簡單描述……
     眼影盤有幾多隻色、防水睫毛膏嘅克數或者特點……純素護手霜就講純素……隱形眼鏡全部都要有『日本』……你要有個份量喺嗰度」）。
     全部由標題同描述原文搵，搵唔到就唔出，唔作。次序：防曬值 → 容量 → 色數／件數／款數／筆芯 → 特點 → 國家（前面最多三粒）。 */
  const NUM = { 一: 1, 二: 2, 兩: 2, 雙: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const num = (v) => NUM[v] || Number(v) || 0;
  const COUNTRY_EN = {
    韓國: 'Korea', 日本: 'Japan', 美國: 'USA', 法國: 'France', 中國: 'China', 台灣: 'Taiwan', 德國: 'Germany',
    英國: 'UK', 新加坡: 'Singapore', 泰國: 'Thailand', 澳洲: 'Australia', 意大利: 'Italy', 瑞士: 'Switzerland', 西班牙: 'Spain',
  };
  /* 特點：每組揀最強嗰個（超防水 > 防水防汗 > 防水）；not＝否定寫法唔算。只係某幾個款式有（例如「薄荷／無香料」）嘅唔出。 */
  const FEATURES = [
    { re: /超防水|super\s?proof/i, zh: '超防水', en: 'Superproof', group: 'water' },
    { re: /防水防汗|防水.{0,2}防汗|防汗.{0,2}防水/, zh: '防水防汗', en: 'Water & sweat-proof', group: 'water' },
    /* 卸妝產品講「溶解防水彩妝」唔係話佢本身防水 */
    { re: /防水|waterproof|water-?resistant/i, zh: '防水', en: 'Waterproof', group: 'water', not: /(?:非|唔|不|無|冇|未必)\s?防水|防水.{0,2}(?:唔|不|差)|防水袋|防水(?:彩妝|妝|睫毛|眼線|化妝)|卸|溶解|清除|去除|預防水|防水分/ }, // 「預防水分流失」唔係防水
    { re: /防暈染|不暈染|唔暈染|smudge-?proof/i, zh: '防暈染', en: 'Smudge-proof' },
    { re: /純素|vegan/i, zh: '純素', en: 'Vegan' },
    { re: /無香料|無香精|無添加香料|fragrance-?free|unscented/i, zh: '無香料', en: 'Fragrance-free' },
    { re: /海洋友善|reef[\s-]?(?:safe|friendly)/i, zh: '海洋友善', en: 'Reef-friendly' },
    { re: /環保包裝|環保物料|環保材質|可回收|再生紙|eco-?friendly/i, zh: '環保', en: 'Eco-friendly' },
    { re: /半固化凝膠|semi-?cured gel/i, zh: '半固化凝膠', en: 'Semi-cured gel' },
  ];
  const UNIT_EN = { 色: 'colours', 款: 'designs', 件: 'pcs', 片: 'pcs', 枚: 'pcs', 粒: 'pcs', 條: 'pcs', 包: 'packs', 顆: 'pcs', 塊: 'pcs', 對: 'pairs', 個: 'pcs', 支: 'pcs' };
  const GML = /(?<![\d.,])(\d+(?:\.\d+)?)\s?(ml|mL|ML|g|G|kg|毫升|克)(?![a-zA-Z\d])/g;
  const gml = (n, u) => `${n}${u === '毫升' || /^ml$/i.test(u) ? 'ml' : u === '克' || u === 'G' ? 'g' : u}`;

  /** 描述文字：用 descriptionHtml，段同段之間留空格。Shopify 嘅純文字 description 會將兩段黐埋
   *（「材質：豬鬃＋尼龍毛全長：21.5cm」），標籤就分唔開。圖片 alt 亦唔會混入。 */
  function descText(product) {
    const html = String(product?.descriptionHtml || '');
    if (!html) return clean(product?.description);
    return clean(html.replace(/<(?:br|\/p|\/li|\/div|\/h\d|\/ul|\/ol|\/span|\/td|\/tr)\b[^>]*>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
  }

  /** 描述入面嘅容量：先睇「容量：」「產品容量：」「每支」呢類標示；冇就揀描述入面唯一一個容量（兩個就要有兩個款式）。 */
  function sizeFromText(text, product) {
    const label = /(?:容量\s*[／/]\s*規格|產品容量|淨含量|淨重|內容量|成分量|容量|規格|每支|net\s*(?:wt\.?|weight|contents?)|volume)\s*[:：]?\s*/gi;
    for (const m of text.matchAll(label)) {
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
      const a = after.match(/^[^\d]{0,3}?(\d+(?:\.\d+)?)\s?(ml|mL|ML|g|G|kg|毫升|克)(?![a-zA-Z\d])(?:\s?[／/]\s?(\d+(?:\.\d+)?)\s?(ml|mL|ML|g|G|kg|毫升|克)(?![a-zA-Z\d]))?/);
      if (!a || /^[^\d]{0,3}?\d+(?:\.\d+)?\s?\S{1,2}\s?[x×＋+]/.test(after)) continue;
      /* 「400ml／257ml／20ml」三個或以上：寫「20ml–400ml」 */
      const list = [...after.matchAll(/(\d+(?:\.\d+)?)\s?(ml|mL|ML|g|G|kg|毫升|克)(?![a-zA-Z\d])/g)].map((x) => gml(x[1], x[2]));
      const unit = list.length >= 3 && list.every((v) => v.replace(/[\d.]/g, '') === list[0].replace(/[\d.]/g, '')) ? list[0].replace(/[\d.]/g, '') : '';
      if (unit && /^[^\d]{0,3}?\d[\d.]*\s?\S{1,2}\s?[／/、]/.test(after)) {
        const ns = list.map((v) => Number.parseFloat(v)).sort((x, y) => x - y);
        return `${ns[0]}${unit}–${ns[ns.length - 1]}${unit}`;
      }
      return a[3] ? `${gml(a[1], a[2])}／${gml(a[3], a[4])}` : gml(a[1], a[2]);
    }
    /* 套裝（水 150ml＋乳液 110ml）唔揀單一容量 */
    if (/套裝|禮盒|兩件|[一二兩三四五六\d]\s?件|[+＋]|\bset\b/i.test(product?.title || '')) return '';
    const seen = [];
    for (const m of text.matchAll(GML)) {
      const before = text.slice(Math.max(0, m.index - 6), m.index);
      const next = text.slice(m.index + m[0].length, m.index + m[0].length + 3);
      if (/取|每次|用量|份量|含|加入|添加|重量|本體|[x×＋+]\s?$/.test(before) || /^\s?[x×＋+–\-~]/.test(next)) continue;
      const v = gml(m[1], m[2]);
      if (!seen.includes(v)) seen.push(v);
    }
    const variants = product?.variants?.edges?.length || 0;
    if (seen.length === 1) return seen[0];
    if (seen.length === 2 && variants >= 2) return seen.join('／');
    return '';
  }

  /** 品牌國家：描述「品牌國家：韓國品牌」→ 韓國；冇就睇「日本品牌」呢類寫法；隱形眼鏡全部係日本品牌（Winston 2026-10-20）。 */
  function countryOf(product, text) {
    let zh = ((text.match(/品牌國家\s*[:：]\s*([一-鿿]{2,6})/) || [])[1] || '').replace(/品牌$/, '');
    if (!zh) zh = (text.match(/(韓國|日本|美國|法國|台灣|德國|英國|中國|新加坡|泰國|澳洲|意大利|瑞士|西班牙)品牌/) || [])[1] || '';
    if (!zh && (/隱形眼鏡/.test(product?.productType || '') || /^lens-/.test(product?.handle || ''))) zh = '日本';
    return zh && zh.length <= 4 ? { zh, en: COUNTRY_EN[zh] || zh } : null;
  }

  /** 冇容量都有嘢講：色數、件數、款數、筆芯粗幼、尺寸、隱形眼鏡度數、專輯小卡、特點。每粒 { zh, en }。 */
  function moreChips(product, text, have) {
    const title = clean(product?.title);
    const type = clean(product?.productType);
    const out = [];
    const nums = new Set(have.flatMap((t) => String(t).match(/\d+(?:\.\d+)?/g) || [])); // 「2g × 30條」已經有 30，唔再出「30 條」
    const add = (zh, en, n) => {
      if (!zh || have.includes(zh) || out.some((c) => c.zh === zh) || (n && nums.has(String(n)))) return;
      out.push({ zh, en: en || zh });
      if (n) nums.add(String(n));
    };
    /* 色數：「12色眼影盤」「雙色胭脂盤」；眼影盤類先睇描述「12 色同色系眼影盤」 */
    const c = title.match(/(?<![\d.])([2-9]|[1-9]\d|[雙兩二三四五六七八九十])\s?色(?![號調系彩澤])/)
      || (/眼影|修容|胭脂|高光|盤|palette/i.test(`${title} ${type}`) ? text.match(/(?<![\d.])([2-9]|[1-9]\d)\s?色(?:同色系)?(?:眼影|盤|組|胭脂)/) : null);
    if (c) add(`${num(c[1])} 色`, `${num(c[1])} colours`, num(c[1]));
    /* 描述規格行（OUJI 由品牌官網／零售店核實後補入描述）：「色數：9 色」「材質：合成纖維毛」「尺寸：約 10cm」 */
    const tag = (re) => (text.match(re) || [])[1];
    const colours = tag(/色數\s*[:：]\s*(\d{1,2})\s*色/);
    if (colours) add(`${colours} 色`, `${colours} colours`, colours);
    const material = tag(/(?:材質|物料|毛料|刷毛)\s*[:：]\s*([^\s。；;，,、()（）]{1,12}(?:\s?[＋+／/]\s?[^\s。；;，,、()（）]{1,8})?)(?=[\s。；;，,]|$)/);
    if (material) add(material, material);
    const dim = text.match(/(尺寸|大小|全長|高度)\s*[:：]\s*(約?)\s*(\d+(?:\.\d+)?(?:\s?[–\-~]\s?\d+(?:\.\d+)?)?)\s?(cm|mm)(?![×x\d])/i);
    if (dim) {
      const v = `${dim[3].replace(/\s/g, '')}${dim[4]}`;
      const lead = /全長|高度/.test(dim[1]) ? `${dim[1]} ` : (dim[2] ? '約 ' : '');
      add(`${lead}${v}`, v, (dim[3].match(/[\d.]+/) || [])[0]);
    }
    const designs = tag(/款式\s*[:：]\s*全\s?(\d{1,2})\s?款/);
    if (designs) {
      add(`全 ${designs} 款`, `${designs} designs`, designs);
      if (/款式\s*[:：][^。]{0,12}隨機/.test(text)) add('款式隨機', 'Random design');
    }
    /* 套裝件數：「(一套四件)」「(1套5件)」「兩件套裝」 */
    const set = title.match(/(?:一套|1套)\s?([一二兩三四五六七八九十\d]{1,2})\s?件|([一二兩三四五六七八九十\d]{1,2})\s?件(?:套裝|裝|組|特別套裝)/);
    if (set) add(`${num(set[1] || set[2])} 件`, `${num(set[1] || set[2])} pcs`, num(set[1] || set[2]));
    /* 款數：「全6款」；扭蛋公仔「3款 7cm」 */
    const kinds = title.match(/全\s?([一二兩三四五六七八九十\d]{1,2})\s?款/)
      || (/公仔|盲盒|扭蛋|玩具|掛件|配件|吊飾|匙扣/.test(`${type} ${title}`) ? title.match(/(?<![\d.])(\d{1,2})\s?款(?:裝)?/) : null);
    if (kinds) add(`${kinds[0].startsWith('全') ? '全 ' : ''}${num(kinds[1])} 款`, `${num(kinds[1])} designs`, num(kinds[1]));
    if (/盲盒|盲袋|扭蛋/.test(`${type} ${title}`) && /隨機/.test(text)) add('款式隨機', 'Random design');
    /* 件數：標題「28粒」「30條」「4條裝」；美甲貼「30 片、15 個尺寸」 */
    const pcs = /[+＋]/.test(title) ? null : title.match(/(?<![\d.])(\d{1,3})\s?(粒|條|包|顆|塊|對|個|支)(?:裝|入)?(?![a-zA-Z])/); // 「粉撲4個+粉底掃1支」唔係一件嘢嘅件數
    if (pcs && Number(pcs[1]) > 1) add(`${pcs[1]} ${pcs[2]}`, `${pcs[1]} ${UNIT_EN[pcs[2]] || 'pcs'}`, pcs[1]);
    const nail = text.match(/(\d{1,3})\s?片[、，,]\s?(\d{1,2})\s?個尺寸/);
    if (nail) { add(`${nail[1]} 片`, `${nail[1]} pcs`, nail[1]); add(`${nail[2]} 個尺寸`, `${nail[2]} sizes`); }
    /* 筆芯／筆尖粗幼（眼線、眉筆、唇線筆）；描述講兩個唔同粗幼（例如兩個款式）就唔出 */
    if (/眼線|眉|唇線|筆/.test(type)) {
      const tips = [...`${title} ${text}`.matchAll(/(\d+(?:\.\d+)?)\s?mm\s?[^\d\s，。,]{0,4}?(筆芯|筆頭|筆尖|刷頭|細芯)|(筆芯|筆尖|筆頭)\s*[:：]\s*(\d+(?:\.\d+)?)\s?mm/g)]
        .map((m) => ({ n: m[1] || m[4], w: (m[2] || m[3]).replace('細芯', '筆芯') }));
      if (tips.length && tips.every((t) => t.n === tips[0].n)) add(`${tips[0].n}mm ${tips[0].w}`, `${tips[0].n}mm tip`);
    }
    /* 尺寸：公仔標題「14cm」「18–20cm」；工具描述「全長：90mm」「高度：126mm」（噴霧「距離 20cm」唔算） */
    const RANGE = '(\\d+(?:\\.\\d+)?(?:\\s?[–\\-~]\\s?\\d+(?:\\.\\d+)?)?)';
    const dimT = /公仔|盲盒|扭蛋|玩具|掛件|配件|吊飾|匙扣|擺設|雜貨/.test(`${type} ${title}`) ? title.match(new RegExp(`(?<![\\d.])${RANGE}\\s?cm`, 'i')) : null;
    if (dimT) add(`${dimT[1].replace(/\s/g, '')}cm`, `${dimT[1].replace(/\s/g, '')}cm`, dimT[1].match(/[\d.]+/)[0]);
    else if (/工具|掃|梳|夾|配件|雜貨|擺設|鏡|髮卷/.test(`${type} ${title}`)) { // 防曬泡沫「直徑 2–3cm 份量」唔係尺寸
      const dimD = text.match(new RegExp(`(全長|長度|高度|直徑|闊度|夾口闊度)\\s*[:：]?\\s*約?\\s*${RANGE}\\s?(cm|mm|厘米)(?![a-zA-Z×x])`));
      if (dimD) add(`${dimD[1].replace('夾口', '')} ${dimD[2].replace(/\s/g, '')}${dimD[3] === '厘米' ? 'cm' : dimD[3]}`, `${dimD[2].replace(/\s/g, '')}${dimD[3] === '厘米' ? 'cm' : dimD[3]}`);
    }
    /* 隱形眼鏡度數：「度數範圍：0.00 至 -6.00」→「0 至 600 度」（香港人講近視幾多度） */
    const pw = text.match(/度數範圍\s*[:：]\s*([+-]?\d+\.\d{2})\s?(?:至|到|~|–|-)\s?([+-]?\d+\.\d{2})/);
    if (pw) {
      const deg = (v) => Math.round(Math.abs(Number(v)) * 100);
      add(`${deg(pw[1])} 至 ${deg(pw[2])} 度`, `${pw[1]} to ${pw[2]}`);
    }
    /* 專輯：原裝正版、附隨機小卡 */
    if (/專輯|album/i.test(type)) {
      if (/原裝正版/.test(text)) add('原裝正版', 'Official release');
      if (/小卡|photocard/i.test(text) && !/(?:冇|唔附|不附|不含)小卡/.test(text)) add('附隨機小卡', 'Random photocard');
    }
    /* 特點 */
    const all = `${title} ${text}`;
    const vTitles = (product?.variants?.edges || []).map((e) => clean(e?.node?.title));
    const groups = new Set();
    const cleanser = /潔面|卸妝|卸|除.{0,4}液/.test(`${type} ${title}`);
    for (const f of FEATURES) {
      if (f.group && groups.has(f.group)) continue;
      if (f.group === 'water' && cleanser) continue;
      const hit = [...all.matchAll(new RegExp(f.re.source, `${f.re.flags.replace('g', '')}g`))].some((m) => {
        const around = all.slice(Math.max(0, m.index - 4), m.index + m[0].length + 4);
        return !(f.not && f.not.test(around));
      });
      if (!hit) continue;
      const inV = vTitles.filter((t) => f.re.test(t)).length;
      if (inV && inV < vTitles.length) continue; // 淨係某幾個款式先有
      if (f.group) groups.add(f.group);
      add(f.zh, f.en);
    }
    return out;
  }

  function buyBoxParts(product) {
    const d = display(product);
    const vendor = clean(product?.vendor);
    const title = clean(product?.title);
    const strip = (value) => {
      const v = clean(value);
      if (!vendor || !v.toLowerCase().startsWith(`${vendor.toLowerCase()} `)) return { brand: '', rest: v };
      const rest = clean(v.slice(vendor.length));
      if (/^[×x]\s/.test(rest)) return { brand: '', rest: v }; // 聯名（AMUSE × My Melody）：成個名照出
      return { brand: v.slice(0, vendor.length), rest };
    };
    const name = strip(d.primary);
    let cn = name.rest || clean(d.primary);
    let en = strip(d.subtitle).rest;
    let pack = clean(d.specification);
    let spf = '';
    /* 標題冇寫防曬值：防曬類先去描述搵（唔係防曬嘅貨，描述順口提 SPF 唔算） */
    const sunCare = /防曬|防晒|sun|uv/i.test(`${product?.productType || ''} ${title}`);
    /* 描述明寫「防曬值：SPF50+ PA++++」（例如有防曬嘅氣墊）就照用，唔理係咪防曬類 */
    const desc = descText(product);
    const labelled = desc.match(/防曬值\s*[:：]\s*(SPF\s?\d+\+?(?:\s*[,，]?\s*PA\s?\+{1,4})?)/i);
    const s = en.match(SPF) || title.match(SPF) || (labelled ? labelled[1].match(SPF) : null) || (sunCare ? desc.match(SPF) : null);
    if (s) {
      let pa = s[2] || (pack.match(PA) || title.match(PA) || [])[1] || '';
      spf = `SPF${s[1]}${pa ? ` PA${pa}` : ''}`;
      en = en.replace(SPF, ' ');
      pack = clean(pack.replace(PA, ' '));
    }
    let size = '';
    /* 套裝（水 150ml＋乳液 110ml）：唔出單一容量，名照原樣 */
    const isSet = /[+＋]/.test(title) && (title.match(new RegExp(SIZE.source, 'g')) || []).length >= 2;
    const z = isSet ? null : (en.match(SIZE) || cn.match(SIZE) || title.match(SIZE));
    if (z) {
      const unit = z[2] === '毫升' ? 'ml' : z[2] === '克' ? 'g' : /^ml$/i.test(z[2]) ? 'ml' : z[2];
      size = `${z[1]}${unit}${z[3] && Number(z[3]) > 1 ? ` × ${z[3]} ${z[4] || '支'}` : ''}`; /* 原型寫法「50ml × 2 支」 */
      en = en.replace(SIZE, ' ');
      /* 中文名入面嘅容量（例如「[80毫升]」、尾嗰個「150ml」）都拎走，下面規格行已經有 */
      cn = clean(cn.replace(/[\[【（(]\s*\d+(?:\.\d+)?\s?(?:ml|mL|ML|g|kg|毫升|克)\s*[\]】）)]/, ' ').replace(new RegExp(`\\s${SIZE.source}\\s*$`), ''));
    }
    /* 「x 10片（盒裝）」呢類件數：黐埋容量（25g × 10片）；其他規格（附補充裝、孖裝、2025版）逐粒出。
       同容量重複（「70片 175ml」入面嘅 70片、「25g/片」）、得 1 件、太長或者唔完整嘅都唔要。 */
    const per = pack.match(/^[x×]\s*(\d+)\s*(片|支|入|枚|個|條|粒|包|顆)?(盒裝|裝)?$/);
    if (per) { size = clean(`${size || ''} × ${per[1]}${per[2] || ''}`).replace(/^× /, ''); pack = ''; }
    /* 「10枚/盒」「30粒/樽」呢類一件幾多：保持一粒，唔好拆開 */
    const keep = tidy(pack).replace(/(\d+\s*[枚片支個入粒條包])\s*[／/]\s*(盒|包|支|袋|樽|瓶)/g, '$1｜$2');
    const extra = keep.split(/[\s／/]+/).map((t) => clean(t.replace('｜', '／')))
      .filter((t) => t && t.length <= 10 && !/[()（）\[\]【】+]/.test(t) && !/^1(片|件|個|支|入)$/.test(t)
        && !(size && (size === t || size.startsWith(t) || t.startsWith(size.split(' ')[0])))
        && !/^(片|件|個|支|盒|包|入|枚|對|粒|條|[x×+＋])$/.test(t))
      .slice(0, 2);
    /* 標題冇容量：描述入面搵（「容量：7g」「產品容量：0.4g」「2.5g 迷你裝」） */
    const text = desc;
    if (!size && !isSet) size = sizeFromText(text, product);
    const base = [spf, size, ...extra].filter(Boolean);
    const chips = [...base.map((t) => ({ zh: t, en: t })), ...moreChips(product, text, base)].slice(0, 3);
    const country = countryOf(product, text);
    /* 名尾「全6款」已經出咗喺規格行，名度唔再寫 */
    if (chips.some((c) => /^全 \d+ 款$/.test(c.zh))) cn = clean(cn.replace(/\s*全\s?\d+\s?款\s*$/, ''));
    return {
      brand: name.brand,               // 大字名前面收埋嘅品牌（讀屏同搜尋照讀）
      name: tidy(cn) || clean(d.primary),
      en: tidy(en),
      spf,
      size,
      extra,                           // 其他規格粒（附補充裝、孖裝……）
      country: country ? country.zh : '',
      meta: chips.map((c) => c.zh).join(' · '), // 底部購買條用（唔包國家）
      chips: country ? [...chips, country] : chips, // 規格一行，每粒 { zh, en }，國家喺最尾
      specs: [...chips, ...(country ? [country] : [])].map((c) => c.zh),
    };
  }

  return { display, buyBoxParts, cardTitle, cardChinese: (product) => cardParts(product).chinese, seoDescription };
});
