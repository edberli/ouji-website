/* 品牌頁「全部品牌 A–Z」：讀 data/catalog.json，按品牌名首字母分組，
   可以搜尋、揀彩妝／護膚、跳字母。
   - 大細楷唔同嘅同一個牌（FANCL／Fancl、Skin1004／SKIN1004）合併做一個，
     用貨最多嗰個寫法。
   - 「K-BEAUTY」唔係品牌，唔列；K-pop 歌手名（周邊貨嘅 vendor）都唔列。 */
(function () {
  var root = document.querySelector('.brand-atlas');
  var groupsHost = root && root.querySelector('[data-atlas-groups]');
  if (!groupsHost) return;
  var lettersHost = root.querySelector('[data-atlas-letters]');
  var countEl = root.querySelector('[data-atlas-count]');
  var input = root.querySelector('[data-atlas-query]');
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-atlas-category]'));
  var SKIP = { 'k-beauty': true };
  var ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['#', '其他']);
  var arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
  var brands = [];
  var state = { q: '', category: 'all' };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase().trim(); }
  function letterOf(name) {
    var first = Array.from(name.trim())[0] || '';
    if (/[a-z]/i.test(first)) return first.toUpperCase();
    if (/[0-9]/.test(first)) return '#';
    return '其他';
  }

  function build(products) {
    var map = {};
    products.forEach(function (item) {
      var p = item.node || item;
      var vendor = (p.vendor || '').trim();
      var key = norm(vendor);
      if (!vendor || SKIP[key] || /待確認/.test(vendor)) return;
      var tags = (p.tags || []).map(norm);
      var b = map[key] || (map[key] = { spellings: {}, makeup: 0, skincare: 0, total: 0, kpop: 0 });
      b.total++;
      if (tags.indexOf('kpop') > -1 || tags.indexOf('k-pop') > -1) b.kpop++;
      b.spellings[vendor] = (b.spellings[vendor] || 0) + 1;
      if (tags.indexOf('makeup') > -1) b.makeup++;
      if (tags.indexOf('skincare') > -1) b.skincare++;
    });
    /* 成個「品牌」全部都係 K-pop 周邊（vendor 係歌手名，例如 IVE、ENHYPEN）就唔列；K-pop 頁有自己入口。 */
    return Object.keys(map).filter(function (key) { return map[key].kpop < map[key].total; }).map(function (key) {
      var b = map[key];
      var name = Object.keys(b.spellings).sort(function (x, y) { return b.spellings[y] - b.spellings[x]; })[0];
      return { name: name, key: key, makeup: b.makeup > 0, skincare: b.skincare > 0 };
    }).sort(function (x, y) { return x.name.localeCompare(y.name, 'en', { sensitivity: 'base' }); });
  }

  function render() {
    var q = norm(state.q);
    var list = brands.filter(function (b) {
      if (state.category !== 'all' && !b[state.category]) return false;
      return !q || b.key.indexOf(q) > -1;
    });
    var groups = {};
    list.forEach(function (b) { (groups[letterOf(b.name)] = groups[letterOf(b.name)] || []).push(b); });
    var letters = ORDER.filter(function (l) { return groups[l]; });
    countEl.textContent = list.length + ' 個品牌';
    lettersHost.innerHTML = letters.map(function (l) {
      return '<a href="#brand-' + encodeURIComponent(l) + '">' + esc(l) + '</a>';
    }).join('');
    groupsHost.innerHTML = letters.length ? letters.map(function (l) {
      return '<section class="atlas-group" id="brand-' + esc(l) + '" aria-label="' + esc(l) + ' 品牌"><h3>' + esc(l) +
        '<span>' + groups[l].length + ' 個</span></h3><div class="atlas-name-grid">' +
        groups[l].map(function (b) {
          return '<a href="shop.html?brand=' + encodeURIComponent(b.name) + '"><strong>' + esc(b.name) +
            '</strong><span aria-hidden="true">' + arrow + '</span></a>';
        }).join('') + '</div></section>';
    }).join('') : '<p class="atlas-empty">搵唔到呢個品牌，試下打少啲字。</p>';
  }

  input.addEventListener('input', function () { state.q = input.value; render(); });
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      state.category = tab.dataset.atlasCategory;
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t === tab)); });
      render();
    });
  });

  var file = document.documentElement.lang === 'en' ? 'data/catalog-en.json' : 'data/catalog.json';
  fetch(file).then(function (r) { return r.json(); }).then(function (data) {
    brands = build((data && (data.v || data.products)) || []);
    render();
  }).catch(function () {
    groupsHost.innerHTML = '<p class="atlas-empty">品牌目錄暫時載入唔到，請重新整理頁面。</p>';
  });
})();
