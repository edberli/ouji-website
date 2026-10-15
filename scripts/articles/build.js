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

/* ---------- 首頁「美妝小筆記」（index.html） ----------
   Codex 首頁原本嘅筆記卡（OUJI NOTE 編號、READ A LITTLE 尾標、手機左右掃），
   卡面改用韓國品牌官方明星海報＋芝麻貼圖（Winston 2026-10-15：插畫唔顯眼；貼圖要用而家首頁嘅白色水彩芝麻，唔係 App／shima 舊畫風）。
   位置：Codex 預覽原位，會員區正上面。
   home-notes.json 每張卡寫：文章 slug、海報（assets/images/home-codex/notes/posters/<poster>-480|720.webp，
   一律品牌韓國官網原圖，來源記喺 scripts/articles/home-notes-sources.md）、對焦位、海報標籤、芝麻貼圖、
   一句摘要（約 20 字、完整一句）、可選短標題。海報同貼圖唔准重複；海報品牌要喺文章入面出現。
   最尾一張係目錄卡（數埋全部文章）。只喺全量生成時更新。 */
const ARROW_RIGHT = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const ARROW_UP_RIGHT = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
const NOTES_IMG = '/assets/images/home-codex/notes';

/* 「Jennie 貓系裸玫瑰妝教學：4 步拆解，同效果產品香港買得到」→ 冒號後第一個逗號之前 */
function shortTitle(spec) { return shortTitleText(stripText(spec.title_html || spec.title)); }
function shortTitleText(s) {
  const colon = s.indexOf('：');
  const comma = colon >= 0 ? s.indexOf('，', colon) : -1;
  const t = comma > 0 ? s.slice(0, comma) : s;
  return /[。？！]$/.test(t) ? t : `${t}。`;
}

/* 「Olive Young」呢類兩個字以上嘅英文名唔准斷開兩行 */
const keepLatin = (html) => html.replace(/[A-Za-z0-9][A-Za-z0-9&’'.-]*(?:\s+[A-Za-z][A-Za-z0-9&’'.-]*)+/g, (m) => `<span class="note-nw">${m}</span>`);

/* 芝麻貼圖：而家首頁用緊嘅白色水彩芝麻（藍絲帶，Codex mascot-v2／v4 原圖）加白色剪紙邊，
   輸出喺 assets/images/home-codex/notes/stickers/<名>.webp。唔准用 App 有名牌嗰套舊貼圖，亦唔准鏡像。 */
function sticker(name, cls) {
  const f = `${NOTES_IMG}/stickers/${name}.webp`;
  if (!fs.existsSync(path.join(ROOT, f))) throw new Error(`搵唔到芝麻貼圖：${f}`);
  const [w, h] = webpSize(path.join(ROOT, f));
  return `<img class="${cls}" src="${f}" width="${w}" height="${h}" alt="" loading="lazy" decoding="async">`;
}

/* WebP 原圖尺寸（寫入 width／height，載入時唔會跳位） */
function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`唔係 WebP：${file}`);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  throw new Error(`讀唔到 WebP 尺寸：${file}`);
}

/* home-notes.json 揀咗嘅三篇（首頁美妝小筆記同專欄頁今期精選共用） */
function homeNotePicks(all) {
  const conf = JSON.parse(fs.readFileSync(path.join(__dirname, 'home-notes.json'), 'utf8'));
  const picks = conf.notes.map((n) => {
    const s = all.find((x) => x.slug === n.slug);
    if (!s) throw new Error(`home-notes.json 搵唔到文章：${n.slug}`);
    for (const k of ['poster', 'sticker', 'tag', 'alt']) if (!n[k]) throw new Error(`home-notes.json ${n.slug} 冇寫 ${k}`);
    for (const w of [480, 720]) {
      if (!fs.existsSync(path.join(ROOT, `${NOTES_IMG}/posters/${n.poster}-${w}.webp`))) throw new Error(`搵唔到海報：${n.poster}-${w}.webp`);
    }
    const title = n.title ? (/[。？！]$/.test(n.title) ? n.title : `${n.title}。`) : shortTitle(s);
    return { ...n, s, title, excerpt: n.excerpt || `${String(s.dek).split('。')[0]}。` };
  });
  for (const k of ['poster', 'sticker']) {
    const v = picks.map((x) => x[k]);
    if (new Set(v).size !== v.length) throw new Error(`home-notes.json ${k} 重複：${v.join('、')}`);
  }
  return { conf, picks };
}

/* 海報筆記卡：首頁 index.html 同 column.html 同一份 markup */
function posterNoteCard(n, i) {
    const src = (w) => `${NOTES_IMG}/posters/${n.poster}-${w}.webp`;
    return `
      <a class="joy-note" href="/articles/${n.s.slug}">
        <span class="note-top"><span>OUJI NOTE / ${String(i + 1).padStart(2, '0')}</span><span class="note-meta">${esc(n.s.category)} · ${n.s.read_minutes || 5} 分鐘</span></span>
        <span class="note-poster">
          <img class="note-poster__img" src="${src(720)}" srcset="${src(480)} 480w, ${src(720)} 720w" sizes="(max-width: 760px) 80vw, 360px" width="720" height="540" alt="${esc(n.alt)}" loading="lazy" decoding="async"${n.focus ? ` style="object-position: ${esc(n.focus)}"` : ''}>
          <span class="note-poster__tag">${esc(n.tag)}</span>
          ${sticker(n.sticker, 'note-sticker')}
        </span>
        <h3>${keepLatin(esc(n.title))}</h3>
        <p>${esc(n.excerpt)}</p>
        <span class="note-bottom">READ A LITTLE, CHOOSE A LITTLE BETTER</span>
      </a>`;
}

function updateHome(all) {
  const file = path.join(ROOT, 'index.html');
  const { conf, picks } = homeNotePicks(all);
  const total = fs.readdirSync(OUT).filter((f) => f.endsWith('.html')).length;
  const cards = picks.map(posterNoteCard);
  cards.push(`
      <a class="joy-note joy-note--index" href="/column">
        <span class="note-top"><span>OUJI NOTES / 目錄</span><span class="note-meta">${total} 篇</span></span>
        ${sticker(conf.index_sticker || 'journal', 'note-sticker-hero')}
        <h3>仲有 ${total - picks.length} 篇筆記。</h3>
        <p class="note-hand">五個分類，慢慢揭 ♡</p>
        <span class="note-bottom">睇全部筆記 ${ARROW_RIGHT}</span>
      </a>`);
  const section = `
<section class="joy-notes content-wrap" aria-labelledby="home-notes-title">
  <div class="joy-heading"><div><span class="joy-kicker">OUJI NOTES / 美妝小筆記</span><h2 id="home-notes-title">美妝小筆記。</h2></div><a class="text-link" href="/column">全部 ${total} 篇 ${ARROW_UP_RIGHT}</a></div>
  <div class="joy-note-grid" role="region" aria-label="美妝小筆記；可左右滑動" tabindex="0">${cards.join('')}
  </div>
</section>`;
  let html = fs.readFileSync(file, 'utf8');
  const re = /(<!-- AX-HOME-NOTES:START[^>]*-->)[\s\S]*?(\n\s*<!-- AX-HOME-NOTES:END -->)/;
  if (!re.test(html)) throw new Error('index.html 搵唔到 AX-HOME-NOTES 標記');
  /* 用 function 替換：內容有「HK$100」呢類字，字串替換會將「$1」當成第一組 */
  html = html.replace(re, (_, a, b) => `${a}${section}${b}`);
  fs.writeFileSync(file, html);
  console.log(`✓ 更新咗 index.html 美妝小筆記（${picks.length} 篇＋目錄，共 ${total} 篇）`);
}

/* ---------- 靈感專欄目錄頁（column.html） ----------
   Winston 2026-10-16：成頁跟首頁風格（Codex unified）。<main> 嘅內容全部由呢度寫入
   column.html 嘅 <!-- AX-COLUMN:START/END --> 之間；樣式喺 column-v2.css。
   開頭（標題＋數字＋白色水彩芝麻）→ 今期精選（同首頁美妝小筆記同一款海報卡）→ 分類掣
   → 五個分類段 → 結尾去逛。有 content/*.json 嘅文章用 spec；未翻新嘅舊文用 column-legacy.json
   （由舊卡 HTML 抽返標題、摘要、日期；圖用 image_src 或者 image_handle 嘅產品相）。 */
const SECTION_OF = { 明星妝感: 'celeb', 明星同款: 'celeb', 排行榜: 'ranking', 護膚攻略: 'tutorial', 問答: 'tutorial', 成分解碼: 'ingredient', 選物清單: 'picks' };
const SECTIONS = [
  { key: 'celeb', kicker: 'CELEBRITY LOOKS / 明星妝感', title: '明星同款・妝感。', tab: '明星妝感', sesame: 'makeup' },
  { key: 'ranking', kicker: 'THE RANKINGS / 榜單速報', title: '榜單速報。', tab: '榜單速報', sesame: 'awards' },
  { key: 'tutorial', kicker: 'HOW-TO / 護膚教學', title: '護膚教學。', tab: '護膚教學', sesame: 'skincare' },
  { key: 'ingredient', kicker: 'INGREDIENTS / 成分解碼', title: '成分解碼。', tab: '成分解碼', sesame: 'search' },
  { key: 'picks', kicker: 'SHOPPING LISTS / 選物清單', title: '選物清單。', tab: '選物清單', sesame: 'shopping' },
];
/* 手機「全部」每段先出幾多張，其餘撳「睇晒 N 篇」先出 */
const MOBILE_PREVIEW = 4;
const dotDate = (iso) => iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3');

function specEntry(spec) {
  const c = spec.cover || {};
  const photo = c.type === 'photo';
  return {
    slug: spec.slug, section: SECTION_OF[spec.category], tag: spec.category, read: spec.read_minutes || 5,
    iso: spec.updated && spec.updated !== spec.date ? spec.updated : spec.date,
    title: shortTitle(spec), excerpt: spec.dek,
    img: photo ? c.src : cdn(product(c.handle).img, 600), product: !photo,
  };
}

function legacyEntry(c) {
  const h = c.html || '';
  const pick = (re) => { const m = h.match(re); return m ? stripText(m[1]) : ''; };
  /* undated：舊文寫嘅係預設日（例如年尾 12 月 31 日），查唔到真發佈日就唔顯示、排喺段尾 */
  const dateTxt = c.undated ? '' : (c.date || pick(/class="column-card__meta">\s*<span>([^<]+)<\/span>/));
  const m = dateTxt.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!m && !c.undated) throw new Error(`column-legacy.json ${c.slug} 讀唔到日期（真係查唔到就寫 undated 同原因）`);
  let img = c.image_src;
  let isProduct = false;
  if (c.image_handle) { img = cdn(product(c.image_handle).img, 600); isProduct = true; }
  if (!img) throw new Error(`column-legacy.json ${c.slug} 冇圖（加 image_src 或 image_handle）`);
  return {
    slug: c.slug, section: c.section,
    tag: c.tag || pick(/class="column-card__tag">([\s\S]*?)<\/span>/),
    read: c.read || Number((h.match(/<\/svg>\s*(\d+)/) || [])[1]) || 5,
    iso: m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '',
    title: shortTitleText(c.title || pick(/class="column-card__title">([\s\S]*?)<\/h3>/)),
    excerpt: c.excerpt || pick(/class="column-card__excerpt">([\s\S]*?)<\/p>/),
    img, product: isProduct,
  };
}

/* 目錄卡：卡頂同首頁筆記卡一樣「OUJI NOTE / 段內編號 · 分鐘」；明星段相上有白色標籤；
   白底產品相（fit contain）縮細放淺色底，其他相滿版。 */
function indexCard(e, i) {
  return `
          <a class="cl-card" href="/articles/${e.slug}">
            <span class="cl-card__top"><span>OUJI NOTE / ${String(i + 1).padStart(2, '0')}</span><span>${e.read} 分鐘</span></span>
            <span class="cl-card__img${e.fit === 'contain' ? ' cl-card__img--contain' : ''}"><img src="${esc(e.img)}" alt="" loading="lazy" decoding="async"></span>${e.celeb ? `
            <span class="cl-card__tag">${esc(e.celeb)}</span>` : ''}
            <h3>${keepLatin(esc(e.title))}</h3>
            <p>${esc(e.excerpt)}</p>
            <span class="cl-card__foot">${e.iso ? `<time datetime="${e.iso}">${dotDate(e.iso)}</time>` : '<span>OUJI NOTES</span>'}${ARROW_RIGHT}</span>
          </a>`;
}

/* column-cards.json：目錄卡嘅換圖、滿版／縮細、明星標籤（說明寫喺檔頭） */
function applyCardOverrides(entries) {
  const conf = JSON.parse(fs.readFileSync(path.join(__dirname, 'column-cards.json'), 'utf8')).cards;
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  for (const [slug, o] of Object.entries(conf)) {
    const e = bySlug.get(slug);
    if (!e) throw new Error(`column-cards.json 搵唔到文章：${slug}`);
    if (o.handle) { e.img = cdn(product(o.handle).img, 600); e.product = true; }
    if (o.img) {
      if (!fs.existsSync(path.join(ROOT, o.img))) throw new Error(`column-cards.json ${slug} 搵唔到圖：${o.img}`);
      e.img = o.img; e.product = false;
    }
    if (o.fit && !['cover', 'contain'].includes(o.fit)) throw new Error(`column-cards.json ${slug} fit 只可以係 cover／contain`);
    if (o.fit) e.fit = o.fit;
    if (o.tag) e.celeb = o.tag;
  }
  for (const e of entries) {
    e.fit = e.fit || (e.product ? 'contain' : 'cover');
    if (e.section === 'celeb' && !e.celeb) throw new Error(`${e.slug} 係明星段，要喺 column-cards.json 寫 tag`);
  }
  const seen = new Map();
  const dup = [];
  for (const e of entries) {
    const k = e.img.split('?')[0];
    if (seen.has(k)) dup.push(`${e.slug} 同 ${seen.get(k)}`);
    else seen.set(k, e.slug);
  }
  if (dup.length) throw new Error(`目錄卡圖重複（喺 column-cards.json 換一張）：${dup.join('；')}`);
}

function updateColumn(all) {
  const file = path.join(ROOT, 'column.html');
  const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'column-legacy.json'), 'utf8'));
  const have = new Set(all.map((s) => s.slug));
  const entries = [...all.map(specEntry), ...legacy.filter((c) => !have.has(c.slug)).map(legacyEntry)];
  for (const e of entries) {
    if (!e.section) throw new Error(`${e.slug} 唔知屬邊個分類`);
    if (!fs.existsSync(path.join(OUT, `${e.slug}.html`))) throw new Error(`${e.slug} 冇文章頁`);
  }
  applyCardOverrides(entries);
  /* 新到舊；冇日期（undated）嘅排最尾 */
  entries.sort((a, b) => b.iso.localeCompare(a.iso) || a.slug.localeCompare(b.slug));
  const total = entries.length;
  const latest = entries[0].iso.slice(5).replace('-', '.');
  const by = Object.fromEntries(SECTIONS.map((s) => [s.key, entries.filter((e) => e.section === s.key)]));
  const { picks } = homeNotePicks(all);
  let html = fs.readFileSync(file, 'utf8');
  /* 結構化資料：CollectionPage＋全部文章 ItemList＋麵包屑。描述直接用 <head> 嗰句 meta description（唯一出處） */
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!desc) throw new Error('column.html 冇 meta description');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${SITE}/column#page`, url: `${SITE}/column`, name: 'OUJI 靈感專欄',
        description: desc.replace(/&amp;/g, '&'), inLanguage: 'zh-Hant-HK',
        isPartOf: { '@type': 'WebSite', name: 'OUJI', url: `${SITE}/` },
        mainEntity: {
          '@type': 'ItemList', numberOfItems: total,
          itemListElement: entries.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/articles/${e.slug}`, name: e.title })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首頁', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: '靈感專欄', item: `${SITE}/column` },
        ],
      },
    ],
  };
  const main = `
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<section class="cl-hero" aria-labelledby="cl-title">
  <div class="cl-wrap">
    <div class="cl-hero__copy">
      <span class="cl-kicker">OUJI NOTES / 靈感專欄</span>
      <h1 class="cl-hero__title" id="cl-title">靈感專欄。</h1>
      <p class="cl-hero__intro">明星妝感、評分排行、護膚教學同成分解碼。代言關係逐條核實出處，推介嘅產品都喺店內有得揀。</p>
      <dl class="cl-stats">
        <div class="cl-stat"><dt>文章</dt><dd>${total}<small>篇</small></dd></div>
        <div class="cl-stat"><dt>分類</dt><dd>${SECTIONS.length}<small>個</small></dd></div>
        <div class="cl-stat"><dt>最近更新</dt><dd>${latest}</dd></div>
      </dl>
    </div>
    <img class="cl-hero__art" src="/assets/images/column/sesame-journal.webp" width="480" height="447" alt="" decoding="async">
  </div>
</section>
<section class="cl-band cl-band--paper cl-featured" aria-labelledby="cl-featured-title">
  <div class="cl-wrap">
    <div class="cl-head"><div><span class="cl-kicker">FEATURED NOTES / 今期精選</span><h2 id="cl-featured-title">今期精選。</h2></div></div>
    <div class="joy-note-grid" role="region" aria-label="今期精選；可左右滑動" tabindex="0">${picks.map(posterNoteCard).join('')}
    </div>
  </div>
</section>
<div class="cl-tabs-band">
  <div class="cl-wrap">
    <div class="cl-tabs" role="toolbar" aria-label="文章分類">
      <button class="cl-tab" type="button" data-filter="all" aria-pressed="true">全部<b>${total}</b></button>${SECTIONS.map((s) => `
      <button class="cl-tab" type="button" data-filter="${s.key}" aria-pressed="false">${s.tab}<b>${by[s.key].length}</b></button>`).join('')}
    </div>
  </div>
</div>${SECTIONS.map((s) => {
    const list = by[s.key];
    const more = list.length > MOBILE_PREVIEW ? `
    <button class="cl-more" type="button" aria-expanded="false" aria-controls="cl-grid-${s.key}">睇晒 ${list.length} 篇${ARROW_RIGHT}</button>` : '';
    return `
<section class="cl-section" data-section="${s.key}" aria-labelledby="cl-sec-${s.key}">
  <div class="cl-wrap">
    <div class="cl-head"><div class="cl-head__main">${sticker(s.sesame, 'cl-head__sesame')}<div><span class="cl-kicker">${s.kicker}</span><h2 id="cl-sec-${s.key}">${s.title}</h2></div></div><span class="cl-head__aside"><b>${list.length}</b>篇</span></div>
    <div class="cl-grid" id="cl-grid-${s.key}">${list.map(indexCard).join('')}
    </div>${more}
  </div>
</section>`;
  }).join('')}
<section class="cl-end" aria-labelledby="cl-end-title">
  <div class="cl-wrap">
    <div><span class="cl-kicker">AFTER READING / 睇完去揀</span><h2 id="cl-end-title">睇完，去揀啱自己嗰件。</h2><p>文章入面嘅產品，可以喺網店或者觀塘門市揀。</p></div>
    <div class="cl-end__actions"><a class="cl-btn" href="/shop">逛全部產品 ${ARROW_RIGHT}</a><a class="cl-btn cl-btn--ghost" href="/stores">門市地址</a></div>
  </div>
</section>
`;
  const re = /(<!-- AX-COLUMN:START[^>]*-->)[\s\S]*?(\n\s*<!-- AX-COLUMN:END -->)/;
  if (!re.test(html)) throw new Error('column.html 搵唔到 AX-COLUMN 標記');
  /* 收走頭尾空行：唔收嘅話每跑一次 END 標記前面就多一行空行 */
  html = html.replace(re, (_, a, b) => `${a}${main.trimEnd()}
${b.trimStart()}`);
  fs.writeFileSync(file, html);
  console.log(`✓ 更新咗 column.html（${total} 篇：${SECTIONS.map((s) => `${s.tab} ${by[s.key].length}`).join('、')}）`);
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
