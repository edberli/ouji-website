#!/usr/bin/env node
/**
 * 靈感專欄文章生成器（模板 v2「芝麻手帳收藏」）。
 *
 *   node scripts/articles/build.js              # 生成全部 content/*.json
 *   node scripts/articles/build.js <slug> ...   # 只生成指定幾篇
 *   node scripts/articles/build.js --check      # 只檢查，唔寫檔
 *
 * 文章內容寫喺 scripts/articles/content/<slug>.json（唔會部署），輸出
 * articles/<slug>.html。產品資料唔准人手抄：名、圖、價錢、評分、得獎
 * 全部由網站現有資料即場讀 ——
 *   data/catalog.json   目錄快照（每日自動更新）
 *   data/ratings.json   Olive Young Global 評分
 *   awards.js           已核實嘅得獎紀錄
 *   product-naming.js   卡片用嘅中文名
 * 頁頭頁尾直接由 column.html 抽，導覽改咗之後重新生成就會跟住改。
 * 搵唔到嘅產品 handle 會直接報錯，唔會出一張爛卡。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const CONTENT = path.join(__dirname, 'content');
const OUT = path.join(ROOT, 'articles');
const SITE = 'https://oujikbeauty.com';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = (n) => Number(n).toLocaleString('en-US');
const money = (n) => `HK$${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(1)}`;
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

/* ---------- 資料 ---------- */
const naming = require(path.join(ROOT, 'product-naming.js'));
const catalog = new Map(JSON.parse(read('data/catalog.json')).v.map((e) => e.node || e).map((p) => [p.handle, p]));
const ratings = JSON.parse(read('data/ratings.json')).products || {};
const awardsCtx = { window: {}, document: { addEventListener() {} } };
vm.createContext(awardsCtx);
vm.runInContext(read('awards.js'), awardsCtx);
const AWARDS = vm.runInContext('typeof AWARDS === "object" ? AWARDS : {}', awardsCtx);
const BODIES = vm.runInContext('typeof AWARD_BODIES === "object" ? AWARD_BODIES : {}', awardsCtx);

function awardLabel(a) {
  const body = (BODIES[a.body] && BODIES[a.body].name) || a.body;
  const place = a.rank === 1 ? '冠軍' : a.rank ? `第 ${a.rank} 名` : '得獎';
  return `${body} ${a.year} ${a.category}${place}`;
}

function product(handle) {
  const p = catalog.get(handle);
  if (!p) throw new Error(`目錄快照搵唔到產品：${handle}（下架或者 handle 打錯）`);
  const lo = Number(p.priceRange?.minVariantPrice?.amount);
  const was = Number(p.compareAtPriceRange?.minVariantPrice?.amount);
  const r = ratings[handle];
  /* 印章只用「得獎嘅就係呢一款」嘅紀錄：note 寫住同系列、迷你裝、新版、
     套裝包含、入選清單嗰啲，得獎嘅唔係我哋賣緊嘅規格，卡上唔可以當自己得獎。 */
  const awards = (AWARDS[handle] || []).filter((a) => !/同系列|迷你|新版|套裝包含|入選|MD’s Pick/.test(a.note || ''))
    .sort((a, b) => (b.year - a.year) || ((a.rank || 9) - (b.rank || 9)));
  const img = p.images?.edges?.[0]?.node?.url || '';
  return {
    handle,
    url: `/products/${handle}`,
    brand: p.vendor,
    name: (naming.cardChinese ? naming.cardChinese(p) : '') || p.title,
    title: p.title,
    type: p.productType || '',
    img,
    price: lo,
    was: was > lo ? was : null,
    /* 評價少過 20 則嘅分數唔具代表性（試過 1 則評價 5 星），卡上唔出 */
    star: r && r.count >= 20 ? r.star : null,
    count: r && r.count >= 20 ? r.count : null,
    award: awards.length ? awardLabel(awards[0]) : null,
    inStock: typeof p.totalInventory === 'number' ? p.totalInventory > 0 : true,
  };
}

const cdn = (url, w) => (url ? `${url.split('?')[0]}?width=${w}` : '');
const imgTag = (url, alt, w, cls = '') => url
  ? `<img${cls ? ` class="${cls}"` : ''} src="${esc(cdn(url, w))}" srcset="${esc(cdn(url, Math.round(w / 2)))} ${Math.round(w / 2)}w, ${esc(cdn(url, w))} ${w}w" sizes="(max-width: 760px) 90vw, ${Math.round(w / 2)}px" alt="${esc(alt)}" loading="lazy" decoding="async">`
  : '';

/* ---------- 頁頭頁尾（由 column.html 抽） ---------- */
function chrome() {
  const html = read('column.html');
  const between = (a, b) => {
    const i = html.indexOf(a);
    const j = html.indexOf(b, i);
    if (i < 0 || j < 0) throw new Error(`column.html 搵唔到 ${a} … ${b}`);
    return html.slice(i, j);
  };
  const rootify = (s) => s.replace(/\b(href|src)="(?!https?:|\/|#|mailto:|tel:|data:|javascript:)([^"]+)"/g, '$1="/$2"');
  const top = rootify(between('<a href="#main-content" class="skip-link">', '<main'));
  const bottom = rootify(between('<footer class="footer">', '<script src='));
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1])
    .filter((s) => /^(product-naming|analytics|shopify|search|script)\.js/.test(s))
    .map((s) => `  <script src="/${s}"></script>`).join('\n');
  const styles = (html.match(/<link rel="stylesheet" href="(styles\.css[^"]*)">/) || [])[1] || 'styles.css';
  return { top, bottom, scripts, styles: `/${styles}` };
}

/* ---------- 區塊 ---------- */
function stripText(html) { return String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

function card(item, i, opts) {
  const p = product(item.handle);
  const no = opts.numbered === false ? '' : `<span class="ax-no">No.${String(i + 1).padStart(2, '0')}</span>`;
  const rating = p.star ? `★ ${p.star} · ${nf(p.count)}` : '';
  const name = item.name || p.name;
  const hero = opts.featureFirst && i === 0;
  const award = item.award === false ? null : (item.award || p.award);
  return `
      <article class="ax-card${hero ? ' ax-card--hero' : ''}${p.inStock ? '' : ' is-soldout'}" id="${esc(opts.idPrefix)}${i + 1}" data-ax-handle="${esc(p.handle)}">
        <div class="ax-strip">${no}<span>${esc(p.brand)}</span><span>${esc(item.kind || p.type)}</span>${rating ? `<span>${esc(rating)}</span>` : ''}</div>
        <a class="ax-card__img" href="${p.url}" tabindex="-1" aria-hidden="true">${imgTag(p.img, `${p.brand} ${name}`, 720)}</a>
        <div class="ax-card__body">
          <h3 class="ax-card__name"><a href="${p.url}">${esc(name)}</a></h3>
          ${p.star ? `<div class="ax-card__meta">Olive Young 評分 ${p.star}（${nf(p.count)} 則評價）</div>` : ''}
          ${award ? `<span class="ax-stamp">${esc(award)}</span>` : ''}
          ${item.why ? `<p class="ax-card__why">${item.why}</p>` : ''}
          ${item.fit && item.fit.length ? `<div class="ax-fit">${item.fit.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
          <div class="ax-card__foot"><span class="ax-price"><span data-ax-price>${money(p.price)}</span>${item.unit ? `<small>${esc(item.unit)}</small>` : ''}</span><a class="ax-go" href="${p.url}">睇產品 →</a></div>
        </div>
      </article>`;
}

function mini(handle) {
  const p = product(handle);
  return `<a class="ax-mini${p.inStock ? '' : ' is-soldout'}" href="${p.url}" data-ax-handle="${esc(p.handle)}">
            <span class="ax-mini__img">${imgTag(p.img, `${p.brand} ${p.name}`, 240)}</span>
            <span><span class="ax-mini__b">${esc(p.brand)}</span><span class="ax-mini__t">${esc(p.name)}</span><span class="ax-price"><span data-ax-price>${money(p.price)}</span></span></span>
          </a>`;
}

function renderBlock(b, ctx) {
  switch (b.type) {
    case 'p': return `<p>${b.html}</p>`;
    case 'list': return `<ul class="ax-list">${b.items.map((li) => `<li>${li}</li>`).join('')}</ul>`;
    case 'h3': return `<h3 class="ax-h3">${esc(b.text)}</h3>`;
    case 'sec': return `<div class="ax-sec" id="${esc(b.id)}"><small>${esc(b.label || '')}</small><h2>${b.title_html || esc(b.title)}</h2></div>`;
    case 'method': return `<div class="ax-method"><p><strong>${esc(b.label || '點樣揀')}：</strong>${b.html}</p></div>`;
    case 'callout': return `<div class="ax-callout"><p>${b.html}</p></div>`;
    case 'disclaimer': return `<p class="ax-disclaimer">${b.html}</p>`;
    case 'toc': return ctx.toc;
    case 'figure': return `<figure class="ax-figure"><img src="${esc(b.src)}" alt="${esc(b.alt || '')}" loading="lazy" decoding="async"${b.width ? ` width="${b.width}" height="${b.height}"` : ''}><figcaption>${b.caption || ''}${b.credit ? ` ${b.credit}` : ''}</figcaption></figure>`;
    case 'table': return `<div class="ax-table-wrap"><table class="ax-table"><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'compare': {
      const rows = b.handles.map((h, i) => {
        const p = product(h);
        return `<tr><td><a href="${p.url}">${b.numbered === false ? '' : `${i + 1}. `}${esc(p.brand)}</a></td><td>${esc((b.kinds && b.kinds[i]) || p.type)}</td><td>${p.star ? `★ ${p.star}（${nf(p.count)}）` : '—'}</td><td>${money(p.price)}</td></tr>`;
      }).join('');
      return `<div class="ax-table-wrap"><table class="ax-table"><thead><tr><th>產品</th><th>類型</th><th>Olive Young 評分</th><th>價錢</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case 'faq': return `<dl class="ax-faq">${b.items.map((f) => `<dt>${esc(f.q)}</dt><dd>${f.a}</dd>`).join('')}</dl>`;
    case 'sources': return `<div class="ax-sources"><b>資料來源</b><ol>${b.items.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</li>`).join('')}</ol></div>`;
    case 'steps': return `<div class="ax-steps">${b.items.map((s, i) => `
        <section class="ax-step"${s.id ? ` id="${esc(s.id)}"` : ''}>
          <div class="ax-step__head"><span class="ax-step__no">${esc(s.no || String(i + 1).padStart(2, '0'))}</span><h3 class="ax-step__title">${esc(s.title)}</h3></div>
          <p>${s.html}</p>
          ${s.products && s.products.length ? `<div class="ax-minis">${s.products.map(mini).join('')}</div>` : ''}
        </section>`).join('')}</div>`;
    case 'note': return note(b.html, ctx);
    default: throw new Error(`未識嘅區塊類型：${b.type}`);
  }
}

function note(html, ctx) {
  return `<aside class="ax-note"><img src="/assets/images/shima/shima-face.webp" alt="" width="44" height="44" loading="lazy"><div><b>芝麻手記</b><p>${html}</p></div></aside>`;
}

/* 一段 flow：左邊內文、右邊（桌面）芝麻手記；catalog 就闊啲獨立出。 */
function renderBody(spec, ctx) {
  const out = [];
  for (const b of spec.body) {
    if (b.type === 'catalog') {
      const items = b.items.map((it, i) => card(it, i, { numbered: b.numbered, featureFirst: b.feature_first, idPrefix: b.id_prefix || 'no' })).join('');
      out.push(`${b.intro ? `<div class="ax-col">${b.intro.map((x) => renderBlock(x, ctx)).join('')}</div>` : ''}<div class="ax-grid">${items}</div>`);
      for (const it of b.items) ctx.itemList.push(product(it.handle));
    } else if (b.type === 'flow') {
      const col = b.blocks.map((x) => renderBlock(x, ctx)).join('\n');
      out.push(b.note ? `<div class="ax-flow"><div class="ax-col">${col}</div>${note(b.note, ctx)}</div>` : `<div class="ax-col">${col}</div>`);
      for (const x of b.blocks) if (x.type === 'steps') for (const s of x.items) for (const h of s.products || []) ctx.itemList.push(product(h));
    } else {
      out.push(`<div class="ax-col">${renderBlock(b, ctx)}</div>`);
      if (b.type === 'steps') for (const s of b.items) for (const h of s.products || []) ctx.itemList.push(product(h));
    }
  }
  return out.join('\n');
}

function collectSecs(spec) {
  const secs = [];
  const walk = (blocks) => blocks.forEach((b) => {
    if (b.type === 'sec' && b.toc !== false) secs.push(b);
    if (b.type === 'flow') walk(b.blocks);
    if (b.type === 'catalog' && b.intro) walk(b.intro);
  });
  walk(spec.body);
  return secs;
}

function cover(spec) {
  const c = spec.cover || {};
  if (c.type === 'photo') {
    return `<div><figure class="ax-arch ax-arch--photo"><img src="${esc(c.src)}" alt="${esc(c.alt || '')}" fetchpriority="high"></figure>${c.credit ? `<p class="ax-credit">${c.credit}</p>` : ''}</div>`;
  }
  const p = product(c.handle);
  const stamp = c.stamp || (p.star ? `★ ${p.star} · ${nf(p.count)} 則評價` : '');
  return `<figure class="ax-arch"><img src="${esc(cdn(p.img, 900))}" alt="${esc(`${p.brand} ${p.name}`)}" fetchpriority="high">${stamp ? `<span class="ax-stamp">${esc(stamp)}</span>` : ''}</figure>`;
}

function coverImage(spec) {
  const c = spec.cover || {};
  if (c.type === 'photo') return c.src.startsWith('http') ? c.src : `${SITE}${c.src}`;
  return cdn(product(c.handle).img, 1200);
}

function related(spec, all) {
  const pool = all.filter((s) => s.slug !== spec.slug);
  const picks = (spec.related || []).map((slug) => pool.find((s) => s.slug === slug)).filter(Boolean);
  for (const s of pool) {
    if (picks.length >= 3) break;
    if (!picks.includes(s) && s.category === spec.category) picks.push(s);
  }
  for (const s of pool) { if (picks.length >= 3) break; if (!picks.includes(s)) picks.push(s); }
  return picks.slice(0, 3).map((s) => {
    const photo = s.cover && s.cover.type === 'photo';
    const src = photo ? s.cover.src : cdn(product(s.cover.handle).img, 400);
    return `<a class="ax-rel" href="/articles/${s.slug}"><span class="ax-rel__img${photo ? '' : ' ax-rel__img--product'}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></span><span><small>${esc(s.category)}</small><b>${esc(stripText(s.title_html || s.title))}</b></span></a>`;
  }).join('');
}

function jsonld(spec, ctx) {
  const url = `${SITE}/articles/${spec.slug}`;
  const title = stripText(spec.title_html || spec.title);
  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: title.slice(0, 110),
      description: spec.description,
      image: [coverImage(spec)],
      datePublished: spec.date,
      dateModified: spec.updated || spec.date,
      inLanguage: 'zh-HK',
      articleSection: spec.category,
      author: { '@type': 'Organization', name: 'OUJI 編輯部', url: `${SITE}/column` },
      publisher: { '@id': `${SITE}/#organization` },
      mainEntityOfPage: url,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首頁', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: '靈感專欄', item: `${SITE}/column` },
        { '@type': 'ListItem', position: 3, name: title, item: url },
      ],
    },
    { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'OUJI', url: `${SITE}/`, logo: `${SITE}/apple-touch-icon.png` },
  ];
  const seen = new Set();
  const items = ctx.itemList.filter((p) => !seen.has(p.handle) && seen.add(p.handle));
  if (items.length) {
    graph.push({ '@type': 'ItemList', name: `${title}：文中產品`, itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${p.url}`, name: `${p.brand} ${p.name}`.slice(0, 150) })) });
  }
  const faqs = [];
  const walk = (blocks) => blocks.forEach((b) => { if (b.type === 'faq') faqs.push(...b.items); if (b.type === 'flow') walk(b.blocks); });
  walk(spec.body);
  if (faqs.length) {
    graph.push({ '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripText(f.a) } })) });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

function page(spec, all, ch, cssV, jsV) {
  const ctx = { itemList: [], toc: '' };
  const secs = collectSecs(spec);
  ctx.toc = secs.length > 1
    ? `<nav class="ax-toc" aria-label="目錄"><b>呢篇講咩</b><ol>${secs.map((s) => `<li><a href="#${esc(s.id)}">${esc(stripText(s.title_html || s.title))}</a></li>`).join('')}</ol></nav>`
    : '';
  const body = renderBody(spec, ctx);
  const url = `${SITE}/articles/${spec.slug}`;
  const seoTitle = `${spec.seo_title || stripText(spec.title_html || spec.title)} — OUJI 靈感專欄`;
  const img = coverImage(spec);
  const zh = (iso) => { const d = new Date(`${iso}T00:00:00+08:00`); return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`; };
  /* 舊文翻新：網址同發佈日保留，byline 講明幾時更新過。 */
  const shown = spec.updated && spec.updated !== spec.date ? spec.updated : spec.date;
  const dateZh = `${shown === spec.date ? '' : '更新於 '}${zh(shown)}`;
  return `<!DOCTYPE html>
<html lang="zh-Hant-HK">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(seoTitle)}</title>
  <meta name="description" content="${esc(spec.description)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#2b4c58">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="OUJI">
  <meta property="og:locale" content="zh_HK">
  <meta property="og:title" content="${esc(seoTitle)}">
  <meta property="og:description" content="${esc(spec.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(img)}">
  <meta property="article:published_time" content="${spec.date}">
  <meta property="article:modified_time" content="${spec.updated || spec.date}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(seoTitle)}">
  <meta name="twitter:description" content="${esc(spec.description)}">
  <meta name="twitter:image" content="${esc(img)}">
  <script type="application/ld+json">${jsonld(spec, ctx)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
  <!-- 字體唔可以 render-blocking（見 styles.css 嘅說明）：media=print，落到先轉 all。 -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;700;900&family=Noto+Sans+TC:wght@400;500;600;700&family=League+Spartan:wght@800&family=Manrope:wght@600;700;800&family=Klee+One:wght@600&display=swap" media="print" onload="this.media='all'">
  <link rel="stylesheet" href="${ch.styles}">
  <link rel="stylesheet" href="/articles/article-v2.css?v=${cssV}">
</head>
<body>
  ${ch.top}
  <main id="main-content" class="ax">
    <header class="ax-cover">
      <div>
        <nav class="ax-crumb" aria-label="目前位置"><a href="/">首頁</a><span>›</span><a href="/column">靈感專欄</a><span>›</span><span>${esc(spec.category)}</span></nav>
        <div class="ax-issue"><span>${esc(spec.category)}</span>${esc(spec.kicker || '')}</div>
        <h1 class="ax-h1">${spec.title_html || esc(spec.title)}</h1>
        <p class="ax-dek">${esc(spec.dek)}</p>
        <div class="ax-by">OUJI 編輯部 · <time datetime="${shown}">${dateZh}</time> · 閱讀約 ${spec.read_minutes || 5} 分鐘</div>
      </div>
      ${cover(spec)}
    </header>
    <div class="ax-body">
${body}
    </div>
    <section class="ax-related" aria-labelledby="ax-related-title">
      <div class="ax-related__in">
        <h2 id="ax-related-title">延伸閱讀</h2>
        <div class="ax-related__grid">${related(spec, all)}</div>
      </div>
    </section>
  </main>
  ${ch.bottom}
${ch.scripts}
  <script src="/articles/article-v2.js?v=${jsV}" defer></script>
</body>
</html>
`;
}

/* ---------- 靈感專欄目錄頁（column.html） ----------
   每個分類段落入面嘅卡全部由呢度生成：有 content/*.json 嘅文章用新卡；
   未翻新嘅舊文用 column-legacy.json 入面原本嗰張卡。 */
const SECTION_OF = { 明星妝感: 'celeb', 明星同款: 'celeb', 排行榜: 'ranking', 護膚攻略: 'tutorial', 問答: 'tutorial', 成分解碼: 'ingredient', 選物清單: 'picks' };
const CLOCK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

function columnCard(spec, section) {
  const photo = spec.cover && spec.cover.type === 'photo';
  const img = photo ? spec.cover.src : cdn(product(spec.cover.handle).img, 600);
  const shown = spec.updated && spec.updated !== spec.date ? spec.updated : spec.date;
  const d = new Date(`${shown}T00:00:00+08:00`);
  return `
            <a href="/articles/${spec.slug}" style="text-decoration:none;color:inherit;display:block;height:100%;">
            <article class="column-card" data-category="${section}">
              <div class="column-card__image-wrap">
                <img class="column-card__image" src="${esc(img)}" alt="" loading="lazy" decoding="async">
              </div>
              <div class="column-card__body">
                <span class="column-card__tag">${esc(spec.category)}</span>
                <h3 class="column-card__title">${esc(stripText(spec.title_html || spec.title))}</h3>
                <p class="column-card__excerpt">${esc(spec.dek)}</p>
                <div class="column-card__meta">
                  <span>${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日</span>
                  <span class="column-card__read-time">
                    ${CLOCK}
                    ${spec.read_minutes || 5} 分鐘
                  </span>
                </div>
              </div>
            </article>
            </a>`;
}

function updateColumn(all) {
  const file = path.join(ROOT, 'column.html');
  let html = fs.readFileSync(file, 'utf8');
  const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'column-legacy.json'), 'utf8'));
  const have = new Set(all.map((s) => s.slug));
  const sorted = all.slice().sort((a, b) => String(b.updated || b.date).localeCompare(String(a.updated || a.date)) || a.slug.localeCompare(b.slug));
  for (const section of ['celeb', 'ranking', 'tutorial', 'ingredient', 'picks']) {
    const cards = sorted.filter((s) => SECTION_OF[s.category] === section).map((s) => columnCard(s, section));
    for (const c of legacy) if (c.section === section && !have.has(c.slug)) cards.push(`\n            ${c.html}`);
    const re = new RegExp(`(<!-- AX-CARDS:${section}:START[^>]*-->)[\\s\\S]*?(\\n\\s*<!-- AX-CARDS:${section}:END -->)`);
    if (!re.test(html)) throw new Error(`column.html 搵唔到 AX-CARDS:${section} 標記`);
    html = html.replace(re, `$1${cards.join('\n')}$2`);
    const secRe = new RegExp(`(<div class="column-section" data-section="${section}">[\\s\\S]*?<span class="column-section__count">)\\d+ 篇文章(</span>)`);
    html = html.replace(secRe, `$1${cards.length} 篇文章$2`);
  }
  fs.writeFileSync(file, html);
  console.log('✓ 更新咗 column.html');
}

/* ---------- 首頁「美妝小筆記」（index.html） ----------
   承繼 Codex 首頁原本嘅筆記卡：OUJI NOTE 編號、芝麻插畫、READ A LITTLE 尾標、
   手機左右掃。揀邊幾篇寫喺 home-notes.json；最尾一張係目錄卡（數埋全部文章）。
   art: "sesame" 用分類芝麻插畫；"cover" 用文章封面（明星相要寫出處）。只喺全量生成時更新。 */
const NOTE_ART = { 明星妝感: '10-compare', 明星同款: '10-compare', 排行榜: '15-awards', 護膚攻略: '07-skincare', 問答: '12-help', 成分解碼: '11-search', 選物清單: '06-shopping' };
const ARROW_UP_RIGHT = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';

/* 「Jennie 貓系裸玫瑰妝教學：4 步拆解，同效果產品香港買得到」→ 冒號後第一個逗號之前 */
function shortTitle(spec) {
  const s = stripText(spec.title_html || spec.title);
  const colon = s.indexOf('：');
  const comma = colon >= 0 ? s.indexOf('，', colon) : -1;
  return comma > 0 ? s.slice(0, comma) : s;
}

function noteArt(id) {
  const src = (w) => `/assets/images/home-codex/notes/${id}-${w}.webp`;
  return `<img src="${src(240)}" srcset="${src(240)} 240w, ${src(360)} 360w" sizes="(max-width: 760px) 94px, 112px" width="240" height="240" alt="" loading="lazy" decoding="async">`;
}

function noteCover(spec) {
  const c = spec.cover || {};
  if (c.type === 'photo') return `<span class="joy-note__cover joy-note__cover--photo"><img src="${esc(c.src)}" alt="" loading="lazy" decoding="async"></span>`;
  return `<span class="joy-note__cover"><img src="${esc(cdn(product(c.handle).img, 360))}" alt="" loading="lazy" decoding="async"></span>`;
}

function updateHome(all) {
  const file = path.join(ROOT, 'index.html');
  const conf = JSON.parse(fs.readFileSync(path.join(__dirname, 'home-notes.json'), 'utf8'));
  const picks = conf.slugs.map((slug) => {
    const s = all.find((x) => x.slug === slug);
    if (!s) throw new Error(`home-notes.json 搵唔到文章：${slug}`);
    return s;
  });
  const total = fs.readdirSync(OUT).filter((f) => f.endsWith('.html')).length;
  const cards = picks.map((s, i) => {
    const credit = conf.art === 'cover' && s.cover && s.cover.type === 'photo' && s.cover.credit ? stripText(s.cover.credit) : '';
    return `
      <a class="joy-note" href="/articles/${s.slug}">
        <span class="note-top"><span>OUJI NOTE / ${String(i + 1).padStart(2, '0')}</span><span class="note-meta">${esc(s.category)} · ${s.read_minutes || 5} 分鐘</span></span>
        ${conf.art === 'cover' ? noteCover(s) : noteArt(NOTE_ART[s.category] || '14-journal')}
        <h3>${esc(shortTitle(s))}</h3>
        <p>${esc(s.dek)}</p>
        <span class="note-bottom">${credit ? esc(credit) : 'READ A LITTLE, CHOOSE A LITTLE BETTER'}</span>
      </a>`;
  });
  cards.push(`
      <a class="joy-note joy-note--index" href="/column">
        <span class="note-top"><span>OUJI NOTES / 目錄</span><span class="note-meta">${total} 篇</span></span>
        ${noteArt('14-journal')}
        <h3>仲有 ${total - picks.length} 篇筆記</h3>
        <p>由明星妝感到成分解碼，五個分類慢慢揭。</p>
        <span class="note-bottom">睇全部筆記 →</span>
      </a>`);
  const section = `
<section class="joy-notes content-wrap" aria-labelledby="home-notes-title">
  <div class="joy-heading"><div><span class="joy-kicker">OUJI NOTES / 靈感專欄</span><h2 id="home-notes-title">美妝小筆記。</h2></div><a class="text-link" href="/column">全部 ${total} 篇 ${ARROW_UP_RIGHT}</a></div>
  <div class="joy-note-grid${conf.art === 'cover' ? ' joy-note-grid--cover' : ''}" role="region" aria-label="美妝小筆記；可左右滑動" tabindex="0">${cards.join('')}
  </div>
</section>`;
  let html = fs.readFileSync(file, 'utf8');
  const re = /(<!-- AX-HOME-NOTES:START[^>]*-->)[\s\S]*?(\n\s*<!-- AX-HOME-NOTES:END -->)/;
  if (!re.test(html)) throw new Error('index.html 搵唔到 AX-HOME-NOTES 標記');
  html = html.replace(re, `$1${section}$2`);
  fs.writeFileSync(file, html);
  console.log(`✓ 更新咗 index.html 美妝小筆記（${picks.length} 篇＋目錄，共 ${total} 篇）`);
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.filter((a) => !a.startsWith('--'));
  const files = fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json')).sort();
  const all = files.map((f) => JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8')));
  const ch = chrome();
  const cssV = hash(read('articles/article-v2.css'));
  const jsV = hash(read('articles/article-v2.js'));
  let n = 0;
  for (const spec of all) {
    if (only.length && !only.includes(spec.slug)) continue;
    const html = page(spec, all, ch, cssV, jsV);
    if (!check) fs.writeFileSync(path.join(OUT, `${spec.slug}.html`), html);
    n += 1;
    console.log(`${check ? '✓ 檢查' : '✓ 寫咗'} articles/${spec.slug}.html（${Math.round(html.length / 1024)} KB）`);
  }
  if (!check && !only.length) { updateColumn(all); updateHome(all); }
  console.log(`${n} 篇`);
}

main();
