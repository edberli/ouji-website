/* 文章產品卡：價錢同存貨用最新目錄快照即場更新。
 *
 * 文章 HTML 入面嘅價錢係生成嗰日嘅數（俾搜尋引擎同冇 JS 嘅人睇）。
 * 改價、售罄之後唔使重新生成文章：呢度讀 /data/catalog.json（每日
 * 自動更新）逐張卡對返 handle，價錢唔同就改，冇貨就標「暫時缺貨」。
 * 讀唔到快照就乜都唔郁，照顯示生成嗰陣嘅價。 */
(function () {
  var cards = document.querySelectorAll('[data-ax-handle]');
  if (!cards.length || !window.fetch) return;
  var money = function (n) {
    var v = Number(n);
    return 'HK$' + (Math.round(v) === v ? v : v.toFixed(1));
  };
  fetch('/data/catalog.json', { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (snap) {
      if (!snap || !Array.isArray(snap.v)) return;
      var byHandle = {};
      snap.v.forEach(function (e) {
        var p = e && (e.node || e);
        if (p && p.handle) byHandle[p.handle] = p;
      });
      cards.forEach(function (card) {
        var p = byHandle[card.getAttribute('data-ax-handle')];
        if (!p) return;
        var lo = Number(p.priceRange && p.priceRange.minVariantPrice && p.priceRange.minVariantPrice.amount);
        var priceEl = card.querySelector('[data-ax-price]');
        if (priceEl && lo > 0) priceEl.textContent = money(lo);
        var soldOut = typeof p.totalInventory === 'number' && p.totalInventory <= 0;
        card.classList.toggle('is-soldout', soldOut);
      });
    })
    .catch(function () { /* 快照攞唔到就維持生成時嘅價錢 */ });
})();
