/* ═══════════════════════════════════════════════════════════════
   OUJI 首頁重整 Demo
   ───────────────────────────────────────────────────────────────
   三個 view：
     a   —— 方案 A：分類導覽格（八卡，一屏）＋ 護膚一條完整 poster
     b   —— 方案 B：四張海報並排，唔帶產品格
     now —— 原版次序同原版五種淺色，用嚟對照

   資料全部係真嘅：由 ../homepage-redesign/data.js 攞 live 目錄
   （928 件貨、真價錢、真評分、真得獎紀錄）。冇一個數係填出嚟。
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const P = window.OUJIPrototype;
  const stage = document.getElementById('stage');
  const esc = P.esc;

  /* 原版量到嘅 baseline（2026-08-28，1440×900，實測）——
     meter 攞呢組數做對照，唔係即場再量原版。 */
  const BASELINE = { total: 11816, gridShare: 39.5, tones: 5, fonts: 3 };

  const HEROES = ['hero-1', 'hero-2', 'hero-3', 'hero-4'];

  /* 海報封面唔可以攞「分類第一件貨」嘅產品相 —— 會出白底樽仔。
     呢四條 URL 係 home.js POSTERS 入面人手揀同修過嘅情境相，連埋
     隱形眼鏡嗰張已經裁走下面 32%（原圖右下角焗死咗個眼部特寫細圖，
     撞正標題位）。直接沿用，唔重新揀。 */
  const POSTER_IMG = {
    makeup: ['https://cdn.shopify.com/s/files/1/0765/3405/5070/files/romand-better-than-palette-01_bac0075f-a0d1-4679-8d95-8a9a7a7c33f9.jpg', null],
    skincare: ['https://cdn.shopify.com/s/files/1/0765/3405/5070/files/c3ac64d063dcea05b5c5933024923263_a6098918-4fe7-4eda-88bf-879728200f83.jpg', null],
    lens: ['https://cdn.shopify.com/s/files/1/0765/3405/5070/files/lens-poster.jpg', '50% 28%'],
    kpop: ['https://cdn.shopify.com/s/files/1/0765/3405/5070/files/seventeen-spill-the-feels-12th-mini-album-984146.webp', null],
  };

  function posterImg(id, fallback) {
    const entry = POSTER_IMG[id];
    const url = entry ? entry[0] : P.imageOf(fallback);
    const pos = entry && entry[1] ? ` style="object-position:${entry[1]}"` : '';
    return { url, pos };
  }

  /* 一個牌子最多一件 —— 唔加呢個，護膚格會出成排 TIRTIR。 */
  function spread(list, max) {
    const seen = new Set();
    const out = [];
    list.forEach((p) => {
      if (out.length >= max || seen.has(p.vendor)) return;
      seen.add(p.vendor); out.push(p);
    });
    return out;
  }
  const MARQUEE = ['rom&nd', 'CLIO', 'hince', 'TIRTIR', 'dasique', 'lilybyred', 'AMUSE',
    'WAKEMAKE', 'Peripera', 'UNLEASHIA', 'Laka', 'fwee', '2aN', 'Heart Percent', 'Coralhaze'];

  const CONCERN_CHIPS = [
    ['暗瘡・粉刺・閉口', 24], ['毛孔・黑頭', 60], ['泛紅・敏感', 167], ['乾燥・缺水', 166],
    ['暗沉・痘印', 70], ['細紋・鬆弛', 70], ['油光・出油', 15], ['每日防曬', 60],
  ];

  const JOURNAL = [
    ['明星同款', '做出 ENHYPEN SUNGHOON 同款乾淨底妝：hince Second Skin 系列', '2026 年 8 月 13 日'],
    ['明星同款', '畫出張員瑛同款陶瓷肌奶油唇：AMUSE 唇釉同氣墊', '2026 年 8 月 14 日'],
    ['明星同款', '養出裴秀智同款水光肌：Anua PDRN 系列點樣行', '2026 年 8 月 13 日'],
    ['明星同款', '養出 CORTIS 同款穩定肌：Torriden Balanceful 積雪草系列', '2026 年 8 月 12 日'],
  ];

  const LOOKS = [
    ['張員瑛 Wonyoung', '清透花瓣水光', 'celeb-wonyoung-thumb.webp'],
    ['Jennie', '低飽和貓系裸玫瑰', 'celeb-jennie-thumb.webp'],
    ['IU 李知恩', '暖橙珊瑚緞唇', 'celeb-iu-thumb.webp'],
  ];

  /* ── 細件組件 ─────────────────────────────────────────────── */

  function card(p, data) {
    const r = data.ratings[p.handle];
    const rate = r && r.count
      ? `<span class="pcard__rate">${esc(r.rating)}★ ${Number(r.count).toLocaleString()}</span>` : '';
    return `<a class="pcard" href="../../product.html?handle=${encodeURIComponent(p.handle)}">
      <span class="pcard__media"><img src="${esc(P.imageOf(p))}&width=520" alt="" loading="lazy"></span>
      <span class="pcard__brand">${esc(p.vendor || '')}</span>
      <span class="pcard__name">${esc(p.title)}</span>
      <span class="pcard__price">${P.priceOf(p)}${rate}</span>
    </a>`;
  }

  function head(eyebrow, title, more, small) {
    return `<div class="sec__head">
      <div>${eyebrow ? `<span class="sec__eyebrow">${esc(eyebrow)}</span>` : ''}
        <h2 class="sec__title${small ? ' sec__title--sm' : ''}">${esc(title)}</h2></div>
      ${more ? `<span class="sec__more">${esc(more)}</span>` : ''}
    </div>`;
  }

  /* ── 每一格 ───────────────────────────────────────────────── */

  const S = {};

  S.hero = () => `<section class="hero" data-kind="hero">
    <picture>
      <source srcset="../../assets/images/${HEROES[0]}-mobile.webp" media="(max-width:767px)" type="image/webp">
      <source srcset="../../assets/images/${HEROES[0]}.webp" type="image/webp">
      <img class="hero__img" src="../../assets/images/${HEROES[0]}.png" alt="">
    </picture>
    <span class="hero__note">Hero 唔郁 —— 沿用正式站四張輪播圖</span>
  </section>`;

  S.marquee = () => `<div class="marq" data-kind="strip">${
    MARQUEE.concat(MARQUEE).map((b) => `<span>${esc(b)}</span>`).join('')}</div>`;

  S.awards = (data) => {
    const rows = data.awardRows.slice(0, 5);
    return `<section class="sec sec--deep" data-kind="proof"><div class="wrap">
      ${head('得獎產品', `${data.awardProductCount} 件貨，攞過 ${data.awardTotal} 項獎`, '睇晒全部得獎產品')}
      <div class="won">${rows.map((r) => `<div class="won__item">
        <a class="pcard" href="../../product.html?handle=${encodeURIComponent(r.product.handle)}">
          <span class="pcard__media"><img src="${esc(P.imageOf(r.product))}&width=420" alt="" loading="lazy"></span>
          <span class="pcard__brand">${esc(r.product.vendor || '')}</span>
          <span class="pcard__name">${esc(r.product.title)}</span>
          <span class="won__badge">${Number(r.count) || 1} 項獎</span>
        </a></div>`).join('')}</div>
    </div></section>`;
  };

  /* 方案 A 嘅分類導覽格：八張細卡，一屏睇晒，件數係真數 */
  S.navcats = (data) => `<section class="sec" data-kind="nav"><div class="wrap">
    ${head('分類導覽', '想搵咩？', '全部產品')}
    <div class="navcats">${data.categories.filter((c) => c.count >= 20).slice(0, 7).map((c) => `
      <a class="navcat" href="${esc(c.href)}">
        <img src="${esc(P.imageOf(c.cover))}&width=160" alt="" loading="lazy">
        <span><span class="navcat__label">${esc(c.label)}</span>
        <span class="navcat__count">${c.count} 件現貨</span></span>
      </a>`).join('')}
      <!-- 第八格：夠貨嘅分類得七個，四欄擺落去尾行會吉一格。
           補一張「全部產品」入去，既填返個窿，又真係有用。 -->
      <a class="navcat navcat--all" href="../../shop.html">
        <span><span class="navcat__label">全部產品</span>
        <span class="navcat__count">${data.products.length.toLocaleString()} 件現貨</span></span>
      </a></div>
  </div></section>`;

  /* 方案 A 保留嘅一條完整 poster（護膚 —— 目錄最深嗰個） */
  S.onePoster = (data) => {
    const c = data.categories.find((x) => x.id === 'skincare') || data.categories[0];
    const list = spread(c.products, 6);
    const img = posterImg(c.id, c.cover);
    return `<section class="sec" data-kind="grid"><div class="wrap">
      ${head('精選分類', `${c.label} · ${c.count} 件現貨`, `睇晒${c.label}`)}
      <div class="poster">
        <a class="poster__visual" href="${esc(c.href)}">
          <img src="${esc(img.url)}?width=900" alt="" loading="lazy"${img.pos}>
          <span class="poster__cap"><h3>${esc(c.label)}</h3>
            <p>潔面、精華、面霜、防曬，一條過</p>
            <span class="poster__cta">睇晒 ${c.count} 件 ›</span></span>
        </a>
        <div class="pgrid pgrid--3">${list.map((p) => card(p, data)).join('')}</div>
      </div>
    </div></section>`;
  };

  /* 方案 B：四張海報並排，一件產品都唔帶 */
  S.fourPosters = (data) => {
    const ids = ['makeup', 'skincare', 'lens', 'kpop'];
    const lines = { makeup: '底妝、眼妝、唇妝', skincare: '潔面、精華、面霜、防曬',
      lens: '日拋為主，全度數', kpop: '專輯、寫真書' };
    return `<section class="sec" data-kind="nav"><div class="wrap">
      ${head('分類', '由邊度入手', '全部產品')}
      <div class="posters4">${ids.map((id) => {
        const c = data.categories.find((x) => x.id === id);
        if (!c || !c.cover) return '';
        const img = posterImg(id, c.cover);
        return `<a class="poster__visual" href="${esc(c.href)}">
          <img src="${esc(img.url)}?width=640" alt="" loading="lazy"${img.pos}>
          <span class="poster__cap"><h3>${esc(c.label)}</h3>
            <p>${esc(lines[id])}</p>
            <span class="poster__cta">睇晒 ${c.count} 件 ›</span></span>
        </a>`;
      }).join('')}</div>
    </div></section>`;
  };

  S.promo = () => `<section class="sec sec--band" data-kind="promo"><div class="wrap">
    <div class="promo">
      <div>
        <span class="sec__eyebrow">9 月 15 日前 · 全店冇門檻</span>
        <h2 class="sec__title promo__big">全單 <b>88</b> 折</h2>
        <ul class="promo__tiers">
          <li><b>HK$250</b> 折實滿呢個數，免順豐運費</li>
          <li><b>HK$499</b> 折實滿呢個數，送 Round Lab 白樺樹保濕面霜（價值 HK$148）</li>
        </ul>
        <p class="promo__fine">「折實」＝ 打完 88 折之後嘅金額。原價買夠 HK$454 免運、HK$568 有面霜。</p>
      </div>
      <img src="../../assets/images/home/ouji-shima-cat.png" alt="" loading="lazy" style="margin-inline:auto;max-width:280px">
    </div>
  </div></section>`;

  S.tabs = (data) => `<section class="sec" data-kind="grid"><div class="wrap">
    ${head('精選推薦', '而家買咩好', '瀏覽全部')}
    <div class="tabs">
      <button class="tabs__btn is-on" data-set="popular">熱賣</button>
      <button class="tabs__btn" data-set="new">新品上架</button>
    </div>
    <div class="pgrid" data-tab-host>${data.sets.popular.slice(0, 8).map((p) => card(p, data)).join('')}</div>
  </div></section>`;

  S.xp = () => `<div class="xp-in" data-kind="strip"></div>
    <section class="xp" data-kind="concern">
      <div class="xp__win">
        <div class="xp__bar">skin_helper.exe</div>
        <div class="xp__body">
          <p style="margin:0 0 16px;font-size:13px">先揀而家最困擾你嗰樣：</p>
          <div class="xp__chips">${CONCERN_CHIPS.map(([l, n]) =>
            `<span class="xp__chip">${esc(l)}<br><small>${n} 件產品</small></span>`).join('')}</div>
        </div>
      </div>
    </section>
    <div class="xp-out" data-kind="strip"></div>`;

  S.match = () => `<section class="sec sec--dark" data-kind="tool"><div class="wrap">
    <div class="match">
      <div>
        <span class="sec__eyebrow">妝感配對</span>
        <h2 class="sec__title">想化明星個妝，唔知由邊件入手？</h2>
        <p style="color:rgba(255,255,255,.72);max-width:52ch">27 個妝感、14 個明星仿妝。揀完我哋由二百幾件現貨配返成套 —— 每件配好實際色號。</p>
        <div class="match__swatches">
          ${[['底妝', '#e4c1ae'], ['眼影', '#e3a2a7'], ['胭脂', '#e290a2'], ['唇妝', '#e290a2']]
            .map(([l, c]) => `<span class="match__sw"><i style="background:${c}"></i>${l}</span>`).join('')}
        </div>
        <a class="match__go" href="../../match.html">開始配對</a>
      </div>
      <div class="match__rows">${LOOKS.map(([n, l, img]) => `<a class="match__row" href="../../match.html">
        <img src="../../assets/looks/${img}" alt="" width="44" height="52" loading="lazy">
        <span><b>${esc(n)}</b><em>${esc(l)}</em></span></a>`).join('')}</div>
    </div>
  </div></section>`;

  S.brands = (data) => `<section class="sec" data-kind="proof"><div class="wrap">
    ${head('合作品牌', `${data.brands.size} 個韓國牌子同場`, '睇晒品牌牆')}
    <div class="brands">${[...data.brands].slice(0, 32).map((b) => `<span>${esc(b)}</span>`).join('')}</div>
  </div></section>`;

  S.journal = () => `<section class="sec sec--band" data-kind="editorial"><div class="wrap">
    ${head('專欄', 'Journal', '更多文章')}
    <div class="jdeck">${JOURNAL.map(([tag, title, date]) => `<article class="jcard">
      <span class="jcard__tag">${esc(tag)}</span>
      <h3 class="jcard__title">${esc(title)}</h3>
      <span class="jcard__date">${esc(date)}</span></article>`).join('')}</div>
  </div></section>`;

  /* 呢兩格本來置中 —— 全頁其餘 8 個標題都係左對齊喺同一條軸，
     置中就變咗成頁唯一嘅例外，讀落似兩塊貼上去嘅嘢。改返左對齊。 */
  S.about = (data) => `<section class="sec" data-kind="brand"><div class="wrap">
    <span class="sec__eyebrow">關於 OUJI</span>
    <h2 class="sec__title">精選，源於講究</h2>
    <p style="max-width:56ch;margin:16px 0 0;color:var(--muted)">由韓國品牌官方渠道入貨，逐件對條碼上架。每件產品嘅質地、持妝度同適合膚質都寫清楚，唔靠形容詞。</p>
    <div class="facts">
      <span class="fact"><b>${data.brands.size}</b><i>合作品牌</i></span>
      <span class="fact"><b>${data.products.length.toLocaleString()}</b><i>在售產品</i></span>
      <span class="fact"><b>${data.awardTotal}</b><i>國際獎項</i></span>
      <span class="fact"><b>100%</b><i>正品保證</i></span>
    </div>
  </div></section>`;

  S.news = () => `<section class="sec sec--deep" data-kind="capture"><div class="wrap">
    <span class="sec__eyebrow">電郵通訊</span>
    <h2 class="sec__title">加入 OUJI 美妝通訊</h2>
    <p style="color:rgba(255,255,255,.75);margin-top:16px">立即訂閱，即送韓國人氣護膚試用套裝一份。</p>
    <form class="news__form" onsubmit="return false">
      <input type="email" placeholder="輸入你的電郵地址" aria-label="電郵地址">
      <button type="submit">免費訂閱</button>
    </form>
  </div></section>`;

  S.foot = () => `<footer class="foot" data-kind="foot"><div class="wrap"><div class="foot__row">
    <span>OUJI · 觀塘觀塘道 472–480 號 觀塘工業中心一期 地下 B 舖 · 每日 12:00–20:00</span>
    <span>© 2026 Ouji Limited</span>
  </div></div></footer>`;

  /* ── 三個 view ────────────────────────────────────────────── */

  const VIEWS = {
    a: (d) => [S.hero(), S.marquee(), S.awards(d), S.navcats(d), S.onePoster(d), S.promo(),
      S.tabs(d), S.xp(), S.match(), S.brands(d), S.journal(), S.about(d), S.news(), S.foot()],
    b: (d) => [S.hero(), S.marquee(), S.awards(d), S.fourPosters(d), S.promo(),
      S.tabs(d), S.xp(), S.match(), S.brands(d), S.journal(), S.about(d), S.news(), S.foot()],
    /* 視覺 QA 建議嘅折衷：B 嘅四張海報做分類入口（每節都換底色、
       每節都有標題），88 折之後加返一條有正式標題嘅產品 rail ——
       首頁仲係見到實物同真價錢，但唔會出現兩套分類系統背對背。 */
    br: (d) => [S.hero(), S.marquee(), S.awards(d), S.fourPosters(d), S.promo(),
      S.onePoster(d), S.tabs(d), S.xp(), S.match(), S.brands(d), S.journal(), S.about(d), S.news(), S.foot()],
    /* 原版次序：hero → 跑馬燈 → 產品分類 → promo → 熱賣 → 四條 rail
       → 品牌牆 → 新貨 → XP → 得獎 → 配對 → Journal → 關於 → 訂閱 */
    now: (d) => [S.hero(), S.marquee(), S.navcats(d), S.promo(), S.tabs(d),
      S.onePoster(d), S.onePoster(d), S.onePoster(d), S.onePoster(d),
      S.brands(d), S.tabs(d), S.xp(), S.awards(d), S.match(), S.journal(), S.about(d), S.news(), S.foot()],
  };

  /* ── 量度 ─────────────────────────────────────────────────── */

  function measure(view) {
    const total = document.body.scrollHeight;
    let grid = 0;
    stage.querySelectorAll('[data-kind]').forEach((el) => {
      if (el.dataset.kind === 'grid') grid += el.getBoundingClientRect().height;
    });
    const share = total ? (grid / total) * 100 : 0;
    const isNow = view === 'now';
    const tones = isNow ? 5 : 2;
    const fonts = isNow ? 3 : 1;

    const set = (sel, value, better) => {
      const el = document.querySelector(sel);
      el.textContent = value;
      el.classList.toggle('is-better', better === true);
      el.classList.toggle('is-worse', better === false);
    };
    /* 「原版對照」報嘅係正式站嘅實測值，唔係下面呢個示意重建量返嚟嘅數 ——
       重建淨係用嚟睇節奏同顏色，佢自己嘅高度冇代表性，報出嚟只會撈亂。 */
    set('[data-m-total]', isNow ? `${BASELINE.total.toLocaleString()}px`
      : `${Math.round(total).toLocaleString()}px`, isNow ? null : total < BASELINE.total);
    set('[data-m-grid]', isNow ? `${BASELINE.gridShare}%`
      : `${share.toFixed(1)}%`, isNow ? null : share < BASELINE.gridShare);
    set('[data-m-tones]', String(isNow ? BASELINE.tones : tones), isNow ? null : tones < BASELINE.tones);
    set('[data-m-fonts]', String(isNow ? BASELINE.fonts : fonts), isNow ? null : fonts < BASELINE.fonts);
    document.querySelector('[data-m-note]').textContent = isNow
      ? '正式站 2026-08-28 實測值 · 下面係示意重建，用嚟睇節奏同顏色'
      : '對比正式站 11,816px / 39.5% / 5 種淺色 / 3 套標題字';
  }

  function wireTabs(data) {
    const host = stage.querySelector('[data-tab-host]');
    if (!host) return;
    stage.querySelectorAll('.tabs__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        stage.querySelectorAll('.tabs__btn').forEach((b) => b.classList.toggle('is-on', b === btn));
        const list = data.sets[btn.dataset.set] || data.products;
        host.innerHTML = list.slice(0, 8).map((p) => card(p, data)).join('');
      });
    });
  }

  /* ── 88 折彈窗：方案 A（延遲、唔鎖捲動）＋ B（收埋變細掣）───── */

  const pop = document.querySelector('[data-pop]');
  const popTab = document.querySelector('.pop-tab');
  let popShown = false;

  function showPop() { pop.hidden = false; popTab.hidden = true; popShown = true; }
  function hidePop() { pop.hidden = true; popTab.hidden = false; }

  document.querySelector('[data-pop-close]').addEventListener('click', hidePop);
  popTab.addEventListener('click', showPop);
  document.querySelector('[data-demo-popup]').addEventListener('click', showPop);

  /* A：碌過 40% 先出。成個過程都冇掂過 body 嘅 overflow ——
     即係幾時都碌得郁，同原版鎖住個版嘅做法相反。

     正式站實作仲會加一個「停留 8 秒」嘅 timer 做後備。demo 呢度冇 ——
     否則你一開頁就彈出嚟蓋住 hero，睇唔到版面。撳右上角「示範 88 折
     彈窗」可以隨時叫佢出嚟。 */
  window.addEventListener('scroll', () => {
    if (popShown) return;
    const pct = window.scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
    if (pct > 0.4) showPop();
  }, { passive: true });

  /* ── 起機 ─────────────────────────────────────────────────── */

  let DATA = null;
  let view = new URLSearchParams(location.search).get('v') || 'a';

  function render() {
    if (!DATA) return;
    stage.innerHTML = VIEWS[view](DATA).join('');
    document.querySelectorAll('.ctl__tab').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
    wireTabs(DATA);
    requestAnimationFrame(() => measure(view));
  }

  document.querySelectorAll('.ctl__tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      view = btn.dataset.view;
      const url = new URL(location); url.searchParams.set('v', view);
      history.replaceState(null, '', url);
      window.scrollTo(0, 0);
      render();
    });
  });

  stage.innerHTML = '<div style="padding:96px 24px;text-align:center;color:#5c7078">載入緊真目錄…</div>';
  P.loadData().then((d) => { DATA = d; render(); })
    .catch((e) => {
      console.error(e);
      stage.innerHTML = '<div style="padding:96px 24px;text-align:center;color:#5c7078">目錄載入唔到，請重新整理。</div>';
    });
}());
