/* 「買唔買得」全站只用呢一把尺（BRIEF 3.9 / WP0）。
   店入面好多貨嘅存貨政策係「賣完照賣」（CONTINUE），數量 0 Shopify 一樣報
   availableForSale: true，所以數量報 0 就當買唔到；quantityAvailable 係 null
   代表冇追蹤存貨，照信 availableForSale。
   隱形眼鏡度數係例外：老闆一直做預訂（DECISIONS #18 保留現行做法），
   數量 0 嘅度數照可以落單，但畫面一定要寫明「預訂 · 約 14 日」。 */
(function (root) {
  const LENS_OPTION = '度數';
  const LENS_PREORDER_ALLOWED = true;
  const PREORDER_LABEL = '預訂 · 約 14 日';

  function isLensProduct(product) {
    const first = product && product.options && product.options[0];
    return !!first && first.name === LENS_OPTION;
  }

  function hasStock(v) {
    return !!v && (v.quantityAvailable == null || v.quantityAvailable > 0);
  }

  function lensOpts(opts) {
    return !!(opts && opts.lens) && LENS_PREORDER_ALLOWED;
  }

  function isPurchasable(v, opts) {
    if (!v || !v.availableForSale) return false;
    if (lensOpts(opts)) return true;
    return hasStock(v);
  }

  /* 度數嘅「現貨」要真係有正數；null 都當預訂，同舊有度數掣一致。 */
  function isPreorder(v, opts) {
    if (!lensOpts(opts) || !isPurchasable(v, opts)) return false;
    return !((v.quantityAvailable ?? 0) > 0);
  }

  function firstPurchasable(variants, opts) {
    return (variants || []).map((x) => (x && x.node) || x).find((v) => isPurchasable(v, opts)) || null;
  }

  const VERIFY_QUERY = `query OujiVerifyVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id availableForSale quantityAvailable
        product { options(first: 1) { name } }
      }
    }
  }`;

  /* 加入購物袋之前喺 Shopify 再問一次真數。任何一個入口（卡片、PDP、
     購物袋加購、配對工具、日後嘅規格 sheet）漏咗檢查，都喺呢度攔住。
     問唔到（網絡錯）就放行：cartLinesAdd 本身都會失敗，唔應該因為
     檢查本身甩咗而令正常落單壞晒。 */
  async function verifyAddable(ids, fetchNodes) {
    const list = [...new Set((ids || []).filter(Boolean))];
    if (!list.length) return { ok: false, blocked: [], reason: 'empty' };
    let nodes;
    try {
      nodes = await fetchNodes(list);
    } catch (err) {
      return { ok: true, blocked: [], reason: 'unverified' };
    }
    if (!Array.isArray(nodes)) return { ok: true, blocked: [], reason: 'unverified' };
    const byId = new Map(nodes.filter(Boolean).map((n) => [n.id, n]));
    const blocked = list.filter((id) => {
      const v = byId.get(id);
      if (!v) return true;
      return !isPurchasable(v, { lens: isLensProduct(v.product) });
    });
    return { ok: blocked.length === 0, blocked, reason: blocked.length ? 'not-purchasable' : 'ok' };
  }

  const api = {
    LENS_OPTION,
    LENS_PREORDER_ALLOWED,
    PREORDER_LABEL,
    VERIFY_QUERY,
    isLensProduct,
    isPurchasable,
    isPreorder,
    firstPurchasable,
    verifyAddable,
  };
  root.OUJI_purchasable = api;
  root.isPurchasable = isPurchasable;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
