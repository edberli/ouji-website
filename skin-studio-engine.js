/* 同芝麻揀護膚 · routine engine.
 *
 * The shelf is the shop's own labelled skincare: data/attrs.json (offline
 * labels for ~500 products), data/catalog.json (the catalogue snapshot the
 * category page already reads: price, stock, image, variant) and
 * ingredients.json (published INCI lists, or recalled ones kept at their own
 * confidence). Nothing here scores a product in percent or claims an effect.
 *
 * Hard rules exclude (skin fit "avoid", irritation above what she tolerates,
 * avoided flags on a list we can actually read, pregnancy). Everything else
 * is weight: her concerns in the order she picked them, skin fit, texture,
 * ingredients she asked for. Ties spread across brands so a routine is never
 * one brand because of how the handles sort.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SkinStudioEngine = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Every sentence a shopper reads exists in both site languages; the site's
  // own switch (localStorage 'ouji:lang') picks one through setLang().
  let LANG = 'zh';
  const en = () => LANG === 'en';
  function setLang(l) { LANG = l === 'en' ? 'en' : 'zh'; }

  const STEP_ORDER = ['remover', 'cleanse', 'toner', 'serum', 'cream', 'sun'];
  const STEP_NAMES = {remover:'卸妝', cleanse:'潔面', toner:'爽膚水', serum:'精華', cream:'面霜', sun:'防曬', mask:'面膜'};
  const STEP_EN = {remover:'Makeup remover', cleanse:'Cleanser', toner:'Toner', serum:'Serum', cream:'Cream', sun:'Sunscreen', mask:'Mask'};
  const stepName = s => (en() ? STEP_EN : STEP_NAMES)[s] || s;
  const ROUTINES = {basic:['cleanse', 'cream', 'sun'], full:['cleanse', 'toner', 'serum', 'cream', 'sun']};

  // One tile can stand for several labels: 毛孔、黑頭 and 粗糙 are the same
  // complaint to a shopper and the same shelf (acids, clay, pads) to the shop.
  const CONCERNS = [
    {id:'dry', keys:['dry'], name:'乾燥繃緊', hint:'洗完面就繃'},
    {id:'oil', keys:['oil'], name:'出油反光', hint:'中午已經油'},
    {id:'pore', keys:['pore', 'blackhead', 'texture'], name:'毛孔黑頭', hint:'粗糙、黑頭位'},
    {id:'acne', keys:['acne'], name:'粉刺暗瘡', hint:'成日生粒粒'},
    {id:'dull', keys:['dull'], name:'暗沉無光', hint:'膚色唔均勻'},
    {id:'spot', keys:['spot'], name:'印痕色斑', hint:'痘印、曬斑'},
    {id:'sensitive', keys:['sensitive'], name:'泛紅敏感', hint:'易紅、易痕'},
    {id:'barrier', keys:['barrier'], name:'屏障脆弱', hint:'換季就唔穩'},
    {id:'wrinkle', keys:['wrinkle'], name:'細紋彈性', hint:'幼紋、鬆弛'}
  ];
  const CONCERN_EN = {
    dry:['Dry & tight', 'Tight after washing'], oil:['Oily shine', 'Shiny by midday'], pore:['Clogged pores', 'Rough, blackheads'],
    acne:['Breakouts', 'Spots keep coming'], dull:['Dullness', 'Uneven tone'], spot:['Dark spots', 'Acne marks, sun spots'],
    sensitive:['Sensitive skin', 'Flushes, itches'], barrier:['Weak barrier', 'Unsettled by weather'], wrinkle:['Lines & firmness', 'Fine lines, sagging']
  };
  const CONCERN = Object.fromEntries(CONCERNS.map(c => [c.id, c]));
  const concernName = id => (en() ? CONCERN_EN[id]?.[0] : CONCERN[id]?.name) || '';
  const concernHint = id => (en() ? CONCERN_EN[id]?.[1] : CONCERN[id]?.hint) || '';
  const ACTIVES = ['透明質酸', '神經醯胺', '積雪草', '泛醇', '煙酰胺', '維他命C', '曲酸／傳明酸', 'AHA/BHA', '視黃醇', '胜肽', 'PDRN'];
  const FLAGS = ['香料', '酒精', '精油'];
  const ACTIVE_EN = {透明質酸:'Hyaluronic acid', 神經醯胺:'Ceramides', 積雪草:'Centella', 泛醇:'Panthenol', 煙酰胺:'Niacinamide', 維他命C:'Vitamin C',
    '曲酸／傳明酸':'Kojic / tranexamic acid', 'AHA/BHA':'AHA/BHA', 視黃醇:'Retinol', 胜肽:'Peptides', PDRN:'PDRN'};
  const FLAG_EN = {香料:'fragrance', 酒精:'alcohol', 精油:'essential oils'};
  // Mid-sentence spellings: common words lower-case, acronyms and C kept.
  const ACTIVE_IN = {透明質酸:'hyaluronic acid', 神經醯胺:'ceramides', 積雪草:'centella', 泛醇:'panthenol', 煙酰胺:'niacinamide', 維他命C:'vitamin C',
    '曲酸／傳明酸':'kojic / tranexamic acid', 'AHA/BHA':'AHA/BHA', 視黃醇:'retinol', 胜肽:'peptides', PDRN:'PDRN'};
  // Labels for the chips and sentences; the data keys stay Chinese.
  const activeName = x => (en() ? ACTIVE_EN[x] : x) || x;
  const flagName = x => (en() ? FLAG_EN[x] : x) || x;
  const IRR_CAP = {rare:3, sometimes:2, often:1, unknown:2};
  const TEXTURE_WEIGHT = {cream:1, serum:.6, toner:.4, sun:.5};

  // Labels call some whipped cleansers "balm"; the title is what says 卸妝.
  const REMOVER = /卸妝|潔面油|潔顏油|cleansing\s*(oil|balm)/i;
  const EYE_LIP = /眼唇/;
  const isRemover = (a, title) => REMOVER.test(title) || (a.tex === 'oil' && /油/.test(title)) || (a.tex === 'balm' && /膏|balm/i.test(title));
  const SUN = /防曬|SPF|\bsun\b/i;

  // The label pass put a handful of products on the wrong step (a sun essence
  // as 精華, a cleansing water as 爽膚水, a cica cream as 防曬). The title is
  // the shop's own word for what the product is, so it settles the step.
  function stepOf(a, title) {
    if (a.step === 'cleanse') return isRemover(a, title) ? 'remover' : 'cleanse';
    if (/潔膚水|卸妝水|cleansing water|micellar/i.test(title)) return 'remover';
    if (a.step !== 'sun' && SUN.test(title)) return 'sun';
    if (a.step === 'sun' && !SUN.test(title)) return /面霜|cream/i.test(title) ? 'cream' : null;
    if (a.step === 'serum' && /爽膚水|化妝水|toner/i.test(title)) return 'toner';
    if ((a.step === 'serum' || a.step === 'cream') && /眼霜|亮眼|眼部|\beye\b/i.test(title)) return null;
    return a.step;
  }
  const TWIN = /×\s?2|x\s?2\b|孖裝|twin pack/i;

  /* ── the shelf ─────────────────────────────────────────────────────── */

  function firstImage(node) {
    const url = node?.images?.edges?.[0]?.node?.url || '';
    return url ? url + (url.includes('?') ? '&' : '?') + 'width=360' : '';
  }

  // A routine needs one buyable variant per product. Sizes are the usual
  // variants on skincare; the first one in stock is the one the shop leads with.
  function buyable(node) {
    const edges = node?.variants?.edges || [];
    const v = (edges.find(e => e.node?.availableForSale) || {}).node;
    if (!v) return null;
    return {id:v.id, title:v.title && v.title !== 'Default Title' ? v.title : '', price:Number(v.price?.amount),
      compareAt:Number(v.compareAtPrice?.amount) || 0};
  }

  function buildPool(attrs, catalog, ingredients) {
    const labels = attrs?.products || {};
    const nodes = new Map((catalog?.v || []).map(entry => [entry.node?.handle, entry.node]));
    const pool = [];
    for (const handle in labels) {
      const a = labels[handle];
      const node = nodes.get(handle);
      if (!node || !STEP_NAMES[a.step]) continue;
      const variant = buyable(node);
      if (!variant || !(variant.price > 0)) continue;
      const title = node.title || a.t || handle;
      const k = ingredients?.[handle] || null;
      const step = stepOf(a, title);
      if (!step || (step === 'remover' && EYE_LIP.test(title))) continue;
      pool.push({
        handle, step, title, vendor:node.vendor || a.v || '',
        price:variant.price, compareAt:variant.compareAt > variant.price ? variant.compareAt : 0,
        variantId:variant.id, variantTitle:variant.title, image:firstImage(node),
        fit:a.fit || {}, c1:a.c1 || [], c2:a.c2 || [], tex:a.tex || '', wt:a.wt || null,
        irr:a.irr || 1, beg:a.beg || 1, am:a.am !== false, pm:a.pm !== false, preg:a.preg_safe,
        hook:a.hook || '', twin:TWIN.test(title),
        ing:k ? {inci:!!k.inci, model:k.src === 'model', conf:k.conf || 0, flags:k.flags || [],
          actives:k.actives || [], named:k.actives_src === 'model' ? [] : (k.actives || []), head:k.head || []} : null
      });
    }
    ACTIVE_N = new Map();
    pool.forEach(p => (p.ing ? p.ing.named : []).forEach(x => ACTIVE_N.set(x, (ACTIVE_N.get(x) || 0) + 1)));
    return pool;
  }
  let ACTIVE_N = new Map();

  // A published list, or a recalled one the labeller kept at >= 0.5. Silence
  // is never read as "free of": an unknown list cannot pass an avoid rule.
  const knowsIngredients = p => !!p.ing && (p.ing.inci || (p.ing.model && p.ing.conf >= .5));

  /* ── answers ───────────────────────────────────────────────────────── */

  function blankAnswers() {
    return {concerns:[], skin:'', sens:'', tex:'auto', routine:'basic', single:'cream', makeup:false,
      budget:0, owned:[], want:[], avoid:[], preg:false, issue:false};
  }

  function wantedSteps(ans) {
    if (ans.routine === 'one') return [ans.single || 'cream'];
    const steps = (ROUTINES[ans.routine] || ROUTINES.basic).slice();
    if (ans.makeup) steps.unshift('remover');
    return steps.filter(s => !(ans.owned || []).includes(s));
  }

  const concernKeys = id => CONCERN[id]?.keys || [];
  const hasConcern = (ans, id) => (ans.concerns || []).includes(id);

  function eligible(p, ans) {
    if (!p || !(p.price > 0) || !p.variantId) return false;
    const fit = p.fit || {};
    if (ans.skin && ans.skin !== 'unknown' && fit[ans.skin] === 'avoid') return false;
    const cap = IRR_CAP[ans.sens] ?? 3;
    if ((p.irr || 1) > cap) return false;
    if (ans.sens === 'often' && fit.sensitive !== 'good' && fit.sensitive !== 'ok') return false;
    if ((ans.sens === 'sometimes' || hasConcern(ans, 'sensitive')) && fit.sensitive === 'avoid') return false;
    if (ans.sens === 'often' && knowsIngredients(p) && p.ing.flags.includes('香料')) return false;
    if ((ans.avoid || []).length) {
      if (!knowsIngredients(p)) return false;
      if (ans.avoid.some(flag => p.ing.flags.includes(flag))) return false;
    }
    if (ans.preg && (p.preg === false || (p.ing && p.ing.actives.includes('視黃醇')))) return false;
    return true;
  }

  function targetTexture(ans) {
    if (['1', '2', '3'].includes(String(ans.tex))) return Number(ans.tex);
    return {dry:3, oily:1, combo:1, normal:2}[ans.skin] || 2;
  }

  function score(p, ans) {
    let s = 0;
    const weights = [1, .6, .35];
    (ans.concerns || []).forEach((id, i) => {
      const keys = concernKeys(id);
      if (keys.some(k => p.c1.includes(k))) s += 42 * weights[i];
      else if (keys.some(k => p.c2.includes(k))) s += 42 * weights[i] * .45;
    });
    const fit = p.fit[ans.skin];
    s += fit === 'good' ? 20 : fit === 'ok' ? 9 : 0;
    const tw = TEXTURE_WEIGHT[p.step] || 0;
    if (tw && p.wt) {
      const explicit = ans.tex !== 'auto';
      s += 14 * tw * (explicit ? 1 : .5) * (1 - Math.abs(p.wt - targetTexture(ans)) / 2);
    }
    if (ans.sens === 'sometimes' || ans.sens === 'often' || hasConcern(ans, 'sensitive')) {
      const sf = p.fit.sensitive;
      s += sf === 'good' ? 14 : sf === 'ok' ? 6 : 0;
      if ((p.irr || 1) === 1) s += 4;
    }
    (ans.want || []).forEach(x => { if (p.ing && p.ing.named.includes(x)) s += 10; });
    if (p.ing?.inci) s += 2;
    // A twin pack is the same bottle twice; a first routine wants one.
    if (p.twin) s -= 10;
    return s;
  }

  // Ties are the normal case: two dozen creams can share a top score. A hash
  // of the handle keeps the order fixed for the same answers while spreading
  // it across the shelf, instead of letting the alphabet pick the brand.
  function hash(h) {
    let n = 0;
    for (let i = 0; i < h.length; i += 1) n = (n * 31 + h.charCodeAt(i)) % 100003;
    return n;
  }

  function ranked(pool, ans, step) {
    return pool.filter(p => p.step === step && eligible(p, ans))
      .map(p => ({p, s:score(p, ans)}))
      .sort((x, y) => y.s - x.s || hash(x.p.handle) - hash(y.p.handle));
  }

  // Acids and retinoids are left on the skin once per routine, not three
  // times: an acne answer would otherwise stack an AHA/BHA toner, serum and
  // cream, which is how a routine starts hurting. Rinse-off cleansers and
  // removers do not count.
  const LEAVE_ON = ['toner', 'serum', 'cream', 'sun', 'mask'];
  const STRONG = /\bAHA\b|\bBHA\b|\bPHA\b|水楊酸|果酸|杏仁酸|視黃醇|視黃醛|A\s?醇|A\s?醛|retinol|retinal/i;
  const strong = p => LEAVE_ON.includes(p.step)
    && ((p.ing && (p.ing.actives.includes('AHA/BHA') || p.ing.actives.includes('視黃醇'))) || STRONG.test(p.title) || (p.irr || 1) >= 3);
  const fits = (c, others) => !strong(c.p) || !others.some(o => strong(o.p));

  // One routine should not be one brand by accident. A brand already used has
  // to win by a real margin, not a rounding difference.
  const BRAND_REPEAT = 12;
  function choose(list, others) {
    const used = new Set(others.map(o => o.p.vendor));
    let best = null;
    for (const c of list) {
      if (!fits(c, others)) continue;
      const v = c.s - (used.has(c.p.vendor) ? BRAND_REPEAT : 0);
      if (!best || v > best.v) best = {c, v};
    }
    return best ? best.c : null;
  }

  const total = picks => Math.round(picks.reduce((n, p) => n + p.price, 0) * 100) / 100;

  /* Fit the budget by giving up as little as possible: repeatedly take the
     swap that saves the most money per point of score lost. */
  function fitBudget(chosen, lists, budget) {
    const picks = chosen.slice();
    let guard = 0;
    while (total(picks.map(c => c.p)) > budget && guard++ < 60) {
      let best = null;
      picks.forEach((cur, i) => {
        const others = picks.filter((_, j) => j !== i);
        lists[i].forEach(c => {
          if (c.p.price >= cur.p.price || !fits(c, others)) return;
          const cost = (cur.s - c.s + 1) / (cur.p.price - c.p.price);
          if (!best || cost < best.cost) best = {i, c, cost};
        });
      });
      if (!best) break;
      picks[best.i] = best.c;
    }
    return picks;
  }

  function covered(picks, ans) {
    const on = id => picks.some(p => concernKeys(id).some(k => p.c1.includes(k) || p.c2.includes(k)));
    const asked = (ans.concerns || []).filter(id => id !== 'steady');
    return {met:asked.filter(on), unmet:asked.filter(id => !on(id))};
  }

  function recommend(pool, ans) {
    const steps = wantedSteps(ans);
    const empty = (status, extra = {}) => ({status, steps, picks:[], missing:[], total:0, ...extra});
    if (ans.issue) return empty('hold');
    if (!steps.length) return empty('owned');
    const lists = [], missing = [];
    steps.forEach(step => {
      const list = ranked(pool, ans, step);
      if (list.length) lists.push({step, list});
      else missing.push(step);
    });
    if (!lists.length) return empty('empty', {missing});
    let chosen = [];
    lists.forEach(({list}) => { chosen.push(choose(list, chosen) || list[0]); });
    const budget = Number(ans.budget) > 0 ? Number(ans.budget) : Infinity;
    const minimum = total(lists.map(({list}) => list.reduce((m, c) => (c.p.price < m.p.price ? c : m), list[0]).p));
    if (minimum > budget) return empty('budget', {minimum, missing});
    chosen = fitBudget(chosen, lists.map(l => l.list), budget);
    const picks = chosen.map(c => c.p);
    return {status:missing.length ? 'partial' : 'ready', steps, picks, missing, minimum,
      total:total(picks), budget:Number(ans.budget) || 0, coverage:covered(picks, ans)};
  }

  // One optional extra outside the routine: a mask for her first concern.
  // Never part of the set total, never added by 「全部加入」.
  function extra(pool, ans, picks = []) {
    const others = picks.map(p => ({p}));
    const c = ranked(pool, ans, 'mask').find(c => fits(c, others));
    return c ? c.p : null;
  }

  // What she could have instead, for one step, with what it does to the total.
  function alternatives(pool, ans, current, picks, limit = 3) {
    const rest = picks.filter(p => p.step !== current.step);
    const budget = Number(ans.budget) > 0 ? Number(ans.budget) : Infinity;
    const used = new Set(rest.map(p => p.vendor));
    const others = rest.map(p => ({p}));
    return ranked(pool, ans, current.step)
      .filter(c => c.p.handle !== current.handle && fits(c, others))
      .sort((x, y) => y.s - x.s - (used.has(y.p.vendor) - used.has(x.p.vendor)) * BRAND_REPEAT || hash(x.p.handle) - hash(y.p.handle))
      .slice(0, limit)
      .map(c => ({...c.p, delta:Math.round((c.p.price - current.price) * 100) / 100,
        withinBudget:total(rest) + c.p.price <= budget}));
  }

  /* ── what a shopper reads ──────────────────────────────────────────── */

  // Same vocabulary the ingredient pass reads labels with, plus the spellings
  // marketing uses. Only used to check a hook against the pack.
  const ING_PAT = {
    視黃醇:/retinol|retinal|視黃醇|視黃醛|a\s*醇|a\s*醛/i,
    維他命C:/vitamin ?c|維他命 ?c|維生素 ?c|抗壞血/i,
    煙酰胺:/niacinamide|煙.胺|菸鹼醯胺|菸鹼胺|煙鹼醯胺/i,
    'AHA/BHA':/\baha\b|\bbha\b|\bpha\b|果酸|水楊酸|甘醇酸|杏仁酸/i,
    PDRN:/\bpdrn\b/i,
    胜肽:/peptide|胜肽|勝肽/i,
    透明質酸:/hyaluron|透明質酸|玻尿酸/i,
    積雪草:/centella|madecass|積雪草|\bcica\b/i,
    神經醯胺:/ceramide|神經醯胺|神經酰胺/i,
    泛醇:/panthenol|泛醇|\bb5\b/i,
    '曲酸／傳明酸':/kojic|tranexamic|arbutin|曲酸|傳明酸|熊果/i
  };
  const MEDICAL = /患處|治療|根治|醫治|消炎|抗炎|殺菌|療效|抗痘|去痘|消痘/;

  // The hook was written per product off its own copy. It leads only when
  // every ingredient or percentage it names is on the pack we can show.
  function hookOk(p) {
    const hook = p.hook || '';
    if (!hook || MEDICAL.test(hook) || hook.length > 30) return false;
    const pct = hook.match(/\d+(?:\.\d+)?(?=\s*%)/g) || [];
    if (pct.some(n => !p.title.includes(n))) return false;
    const named = p.ing ? p.ing.named : [];
    return !Object.keys(ING_PAT).some(nm => ING_PAT[nm].test(hook) && !ING_PAT[nm].test(p.title) && !named.includes(nm));
  }

  const TEX_ZH = {watery:'水感', essence:'精華', milky:'乳液', creamy:'綿密', gel:'啫喱', oil:'油狀', foam:'泡沫', balm:'膏狀', mist:'噴霧'};
  const WEIGHT_ZH = {1:'清爽', 2:'適中', 3:'滋潤'};
  const TEX_EN = {watery:'watery', essence:'essence', milky:'milky', creamy:'creamy', gel:'gel', oil:'oil', foam:'foam', balm:'balm', mist:'mist'};
  const WEIGHT_EN = {1:'light', 2:'medium', 3:'rich'};
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const list = xs => en() ? (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`) : xs.join('、');

  // Concern names this product carries for her, in the order she ranked them.
  function matched(p, ans) {
    return (ans.concerns || []).filter(id => concernKeys(id).some(k => p.c1.includes(k) || p.c2.includes(k)))
      .map(id => concernName(id));
  }

  function lead(p, ans) {
    // Hooks were written from the Chinese copy; English falls back to facts.
    if (!en() && hookOk(p)) return p.hook.replace(/[。．.]$/, '');
    // 「主打粉刺暗瘡」 on a sunscreen reads as a treatment claim; say what it is.
    const job = p.step === 'sun' ? null : (ans.concerns || []).find(id => concernKeys(id).some(k => p.c1.includes(k)));
    if (en()) {
      if (job) return `Made for ${SHORT_EN[job]}`;
      const feel = [WEIGHT_EN[p.wt], TEX_EN[p.tex] && TEX_EN[p.tex] !== STEP_EN[p.step].toLowerCase() ? TEX_EN[p.tex] : ''].filter(Boolean).join(' ');
      return feel ? `${cap(feel)} ${STEP_EN[p.step].toLowerCase()}` : `Everyday ${STEP_EN[p.step].toLowerCase()}`;
    }
    if (job) return `主打${CONCERN[job].name}`;
    const feel = `${WEIGHT_ZH[p.wt] || ''}${TEX_ZH[p.tex] && TEX_ZH[p.tex] !== STEP_NAMES[p.step] ? TEX_ZH[p.tex] : ''}`;
    return `${feel || '日常'}${STEP_NAMES[p.step]}`;
  }

  const ACTIVE_FOR = {
    煙酰胺:['dull', 'pore', 'oil'], 積雪草:['sensitive', 'barrier'], 透明質酸:['dry'], 神經醯胺:['dry', 'barrier'],
    泛醇:['sensitive', 'barrier', 'dry'], 維他命C:['dull', 'spot'], '曲酸／傳明酸':['spot', 'dull'],
    'AHA/BHA':['pore', 'acne'], 視黃醇:['wrinkle', 'pore'], 胜肽:['wrinkle'], PDRN:['barrier']
  };
  const ACTIVE_WHY = {
    煙酰胺:'維他命 B3，常用嚟改善暗沉、毛孔同出油', 積雪草:'韓國 cica，常用嚟鎮靜泛紅', 透明質酸:'抓水打底，皮膚濕住搽先鎖得住',
    神經醯胺:'屏障本身嘅脂質，補返可以減少水分流失', 泛醇:'維他命 B5，保濕兼安撫', 維他命C:'抗氧化，常用嚟提亮膚色',
    '曲酸／傳明酸':'走抑制黑色素嗰條路，要配埋防曬', 'AHA/BHA':'代謝角質、疏通毛孔', 視黃醇:'研究得最多嘅 A 醇，晚上用、日頭要防曬',
    胜肽:'唔想用 A 醇又想做抗老，多數揀呢類', PDRN:'近年多人用嘅修護成分，性質溫和'
  };
  const ACTIVE_WHY_EN = {
    煙酰胺:'vitamin B3, often used for dullness, pores and oil', 積雪草:'Korean cica, often used to calm redness', 透明質酸:'holds water; apply on damp skin',
    神經醯胺:'lipids your barrier is made of; they help reduce water loss', 泛醇:'vitamin B5, hydrating and soothing', 維他命C:'an antioxidant often used to brighten',
    '曲酸／傳明酸':'works on pigment; pair it with sunscreen', 'AHA/BHA':'exfoliates and clears pores', 視黃醇:'the most-studied retinoid; use at night, sunscreen by day',
    胜肽:'the usual pick for anti-ageing without retinol', PDRN:'a gentle repairing ingredient that has become popular'
  };

  // The longer answer, for 「點解揀佢」: short lines about the bottle, never a
  // promise. How an active works is only said of what stays on the skin; a
  // cleanser is rinsed off before 「抓水」 could mean anything.
  const RINSE = ['remover', 'cleanse'];
  function detail(p, ans) {
    const out = [];
    if (!en() && hookOk(p)) out.push(p.hook.replace(/[。．.]$/, ''));
    const named = p.ing ? p.ing.named : [];
    const asked = (ans.concerns || []).flatMap(concernKeys);
    // The active that tells this bottle from the next: one its name leads with,
    // else the rarest on the shelf. 透明質酸 is in most of them, so it says least.
    const active = RINSE.includes(p.step) ? null : named.filter(x => (ACTIVE_FOR[x] || []).some(k => asked.includes(k)))
      .sort((x, y) => (p.ing.head.includes(y) - p.ing.head.includes(x)) || (ACTIVE_N.get(x) || 0) - (ACTIVE_N.get(y) || 0))[0] || null;
    if (active && !(p.step === 'sun' && active === '視黃醇')) out.push(en() ? `Contains ${ACTIVE_IN[active]}: ${ACTIVE_WHY_EN[active]}` : `有${active}：${ACTIVE_WHY[active]}`);
    const jobs = matched(p, ans);
    if (jobs.length) out.push(en() ? `Matches your pick: ${list(jobs.map(j => j.toLowerCase()))}` : `對應你揀嘅${jobs.map(j => `「${j}」`).join('')}`);
    const skin = (en() ? {dry:'dry', oily:'oily', combo:'combination', normal:'balanced'} : {dry:'乾性', oily:'油性', combo:'混合性', normal:'中性'})[ans.skin];
    if (skin && p.fit[ans.skin] === 'good') out.push(en() ? `Suits ${skin} skin` : `啱${skin}肌`);
    if (p.tex && TEX_ZH[p.tex]) out.push(en() ? `${cap(TEX_EN[p.tex])} texture${p.wt ? `, ${WEIGHT_EN[p.wt]}` : ''}` : `${TEX_ZH[p.tex]}質地${p.wt ? '，偏' + WEIGHT_ZH[p.wt] : ''}`);
    if (knowsIngredients(p)) {
      const f = p.ing.flags;
      if (en()) {
        if (!f.length) out.push(p.ing.inci ? 'No fragrance, alcohol or essential oils on the ingredient list' : 'No fragrance, alcohol or essential oils as far as we know (full list not published)');
        else out.push(p.ing.inci ? `Ingredient list includes ${list(f.map(flagName))}; take care if sensitive` : `Contains ${list(f.map(flagName))} as far as we know; take care if sensitive`);
      } else if (!f.length) out.push(p.ing.inci ? '成分表冇香料、酒精、精油' : '據我哋掌握冇香料、酒精、精油（品牌未公開全成分）');
      else out.push(p.ing.inci ? `成分表有${f.join('、')}，敏感肌要留意` : `據我哋掌握含${f.join('、')}，敏感肌要留意`);
    }
    return out;
  }

  /* For each concern she picked: how a routine goes about it, then which
     bottles in this set do that job and with what. Actives come only from a
     published list or the product's own name (never the model's guess), and a
     rinse-off step is credited by its label, not by what it washes away. */
  const APPROACH = {
    dry:'先補水、再鎖水，潔面唔好洗到繃', oil:'控油唔靠洗多幾次，質地揀清爽',
    pore:'定期代謝角質，毛孔先唔易塞', acne:'疏通毛孔、少刺激，一套唔疊太多酸',
    dull:'提亮之外，日日防曬先唔會再暗', spot:'淡印成分要配防曬，印先唔會再深',
    sensitive:'先鎮靜、少刺激，成分越簡單越好', barrier:'補返屏障脂質，暫時避開強酸',
    wrinkle:'抗老成分夜晚用，日頭一定要防曬'
  };
  const APPROACH_EN = {
    dry:'Hydrate first, then seal it in; cleanse without stripping', oil:'Control oil without over-washing; choose light textures',
    pore:'Exfoliate regularly so pores clog less', acne:'Keep pores clear and irritation low; never stack acids',
    dull:'Brighten, and wear sunscreen daily so it does not dull again', spot:'Pair fading ingredients with sunscreen so marks do not deepen',
    sensitive:'Calm first and irritate less; the simpler the formula, the better', barrier:'Replenish barrier lipids and pause strong acids',
    wrinkle:'Anti-ageing actives at night, sunscreen every day'
  };
  // What an active does for that concern, in a few words; a pairing left out
  // here is never credited (積雪草 calms, it does not fade a mark).
  const ROLE = {
    透明質酸:{dry:'抓水打底'}, 神經醯胺:{dry:'鎖住水分', barrier:'補返屏障脂質'},
    積雪草:{sensitive:'鎮靜泛紅', barrier:'舒緩修護'}, 泛醇:{sensitive:'保濕安撫', barrier:'保濕修護', dry:'保濕'},
    煙酰胺:{dull:'提亮膚色', pore:'改善毛孔觀感', oil:'調節出油'}, 維他命C:{dull:'抗氧化、提亮', spot:'提亮膚色'},
    '曲酸／傳明酸':{spot:'針對色素', dull:'均勻膚色'}, 'AHA/BHA':{pore:'代謝角質、疏通毛孔', acne:'代謝角質、疏通毛孔'},
    視黃醇:{wrinkle:'抗老，夜晚用', pore:'代謝角質，夜晚用'}, 胜肽:{wrinkle:'彈性抗老'}, PDRN:{barrier:'修護'}
  };
  const ROLE_EN = {
    透明質酸:{dry:'draws in water'}, 神經醯胺:{dry:'locks in moisture', barrier:'replenishes barrier lipids'},
    積雪草:{sensitive:'calms redness', barrier:'soothes and repairs'}, 泛醇:{sensitive:'hydrates and soothes', barrier:'hydrates and repairs', dry:'hydrates'},
    煙酰胺:{dull:'brightens', pore:'refines the look of pores', oil:'balances oil'}, 維他命C:{dull:'antioxidant, brightens', spot:'brightens'},
    '曲酸／傳明酸':{spot:'targets pigment', dull:'evens tone'}, 'AHA/BHA':{pore:'exfoliates, clears pores', acne:'exfoliates, clears pores'},
    視黃醇:{wrinkle:'anti-ageing, night use', pore:'exfoliates, night use'}, 胜肽:{wrinkle:'firming'}, PDRN:{barrier:'repairs'}
  };
  // A step's own job for a concern, when its label says it is for that
  // concern but no listed active explains how.
  const STEP_ROLE = {
    dry:{toner:'補水打底', serum:'加強保濕', cream:'鎖住水分'}, oil:{toner:'清爽補水', cream:'清爽保濕'},
    sensitive:{toner:'溫和打底', cream:'舒緩保濕'}, barrier:{cream:'修護屏障'}, wrinkle:{cream:'滋潤彈性'}
  };
  const STEP_ROLE_EN = {
    dry:{toner:'hydrating prep', serum:'boosts hydration', cream:'seals in moisture'}, oil:{toner:'light hydration', cream:'light moisture'},
    sensitive:{toner:'gentle prep', cream:'soothing moisture'}, barrier:{cream:'barrier repair'}, wrinkle:{cream:'nourishes and firms'}
  };
  const SHORT = {dry:'乾燥', oil:'油光', pore:'毛孔', acne:'暗瘡肌', dull:'暗沉', spot:'印痕', sensitive:'敏感', barrier:'屏障', wrinkle:'細紋'};
  const SHORT_EN = {dry:'dryness', oil:'shine', pore:'pores', acne:'acne-prone skin', dull:'dullness', spot:'marks', sensitive:'sensitivity', barrier:'the barrier', wrinkle:'fine lines'};
  const SUN_FOR = {dull:'避免再暗沉', spot:'避免印再加深', wrinkle:'避免光老化'};
  const SUN_FOR_EN = {dull:'prevents more dullness', spot:'keeps marks from darkening', wrinkle:'prevents photo-ageing'};
  const TEX_PICK = {1:'清爽', 2:'柔潤', 3:'滋潤'};
  const TEX_PICK_EN = {1:'light', 2:'soft', 3:'rich'};
  const roleOf = (x, id) => ROLE[x]?.[id] || '';

  // `taken`: actives an earlier bottle already speaks for under this concern,
  // so two rows never read 「泛醇：保濕」 twice.
  function contribution(p, id, taken = new Set()) {
    const keys = concernKeys(id);
    const main = keys.some(k => p.c1.includes(k)), side = keys.some(k => p.c2.includes(k));
    const named = p.ing ? p.ing.named : [];
    const active = RINSE.includes(p.step) ? null : named.filter(x => roleOf(x, id) && !taken.has(x) && !(p.step === 'sun' && x === '視黃醇'))
      .sort((x, y) => (p.ing.head.includes(y) - p.ing.head.includes(x)) || (ACTIVE_N.get(x) || 0) - (ACTIVE_N.get(y) || 0))[0];
    const gentle = RINSE.includes(p.step) && (p.irr || 1) === 1;
    if (en()) {
      if (p.step === 'sun' && SUN_FOR_EN[id]) return {rank:active ? 1 : 2, text:active ? `UV protection, plus ${ACTIVE_IN[active]}` : `UV protection; ${SUN_FOR_EN[id]}`};
      if (active) return {rank:main ? 0 : 1, active, text:`${ACTIVE_EN[active]}: ${ROLE_EN[active][id]}`};
      if (main) return {rank:RINSE.includes(p.step) ? 3.5 : 3, text:STEP_ROLE_EN[id]?.[p.step] ? cap(STEP_ROLE_EN[id][p.step]) : gentle ? `Gentle; made for ${SHORT_EN[id]}` : `Made for ${SHORT_EN[id]}`};
      if (side) return {rank:4, text:`Also helps ${SHORT_EN[id]}`};
      return null;
    }
    if (p.step === 'sun' && SUN_FOR[id]) return {rank:active ? 1 : 2, text:active ? `擋紫外線；有${active}` : `擋紫外線，${SUN_FOR[id]}`};
    if (active) return {rank:main ? 0 : 1, active, text:`${active}：${roleOf(active, id)}`};
    // What stays on the skin explains more than what is rinsed off.
    if (main) return {rank:RINSE.includes(p.step) ? 3.5 : 3, text:STEP_ROLE[id]?.[p.step] || (gentle ? `低刺激，針對${SHORT[id]}` : `針對${SHORT[id]}`)};
    if (side) return {rank:4, text:`兼顧${SHORT[id]}`};
    return null;
  }

  function explain(picks, ans) {
    const met = covered(picks, ans).met;
    const concerns = (ans.concerns || []).filter(id => CONCERN[id]).map(id => {
      const taken = new Set();
      const all = picks.map((p, i) => {
        const c = contribution(p, id, taken);
        if (c?.active) taken.add(c.active);
        return {i, step:p.step, ...c};
      });
      return {id, name:concernName(id), approach:(en() ? APPROACH_EN : APPROACH)[id], met:met.includes(id), items:all.filter(x => x.text)
        .sort((a, b) => a.rank - b.rank || a.i - b.i)
        .filter((x, n, rows) => x.rank < 4 || rows.filter(y => y.rank < 4).length < 2).slice(0, 3)};
    });
    // The rest of her answers, said only where the set really honours them.
    const care = [];
    const E2 = en();
    const sens = (E2 ? {often:'Easily sensitive', sometimes:'Sometimes sensitive'} : {often:'容易敏感', sometimes:'有時敏感'})[ans.sens];
    if (sens) {
      const clean = picks.filter(p => p.ing?.inci && !p.ing.flags.length).length;
      const low = picks.every(p => (p.irr || 1) === 1);
      const text = E2 ? [low ? 'All low-irritation formulas' : '', clean ? `${clean} with no fragrance, alcohol or essential oils listed` : ''].filter(Boolean).join('; ')
        : [low ? '全套都係低刺激配方' : '', clean ? `${clean} 件成分表冇香料、酒精、精油` : ''].filter(Boolean).join('；');
      if (text) care.push({label:sens, text});
    }
    if (ans.preg) care.push(E2 ? {label:'Pregnant / breastfeeding', text:'Retinoids avoided'} : {label:'懷孕／餵哺', text:'已避開 A 醇類'});
    if ((ans.avoid || []).length) care.push(E2 ? {label:'Avoided', text:`Nothing with ${list(ans.avoid.map(flagName))}`} : {label:'避開成分', text:`已排除含${ans.avoid.join('、')}嘅產品`});
    const skin = (E2 ? {dry:'Dry skin', oily:'Oily skin', combo:'Combination skin', normal:'Balanced skin'} : {dry:'偏乾肌', oily:'偏油肌', combo:'混合肌', normal:'平衡肌'})[ans.skin];
    const t = ['1', '2', '3'].includes(String(ans.tex)) ? Number(ans.tex) : 0;
    const good = skin ? picks.filter(p => p.fit[ans.skin] === 'good').length : 0;
    const feel = t ? picks.filter(p => TEXTURE_WEIGHT[p.step] && p.wt === t).map(p => E2 ? STEP_EN[p.step].toLowerCase() : STEP_NAMES[p.step]) : [];
    const fitText = E2
      ? [good ? (good < picks.length ? `${good} labelled for ${skin.toLowerCase()}` : `${picks.length > 1 ? 'All' : 'It is'} labelled for ${skin.toLowerCase()}`) : '',
        feel.length ? `${cap(list(feel))} in a ${TEX_PICK_EN[t]} texture` : ''].filter(Boolean).join('; ')
      : [good ? (good < picks.length ? `${good} 件標明啱${skin}` : picks.length > 1 ? `全套都標明啱${skin}` : `標明啱${skin}`) : '',
        feel.length ? `${feel.join('、')}揀${TEX_PICK[t]}質地` : ''].filter(Boolean).join('；');
    if (fitText) care.push({label:[good ? skin : '', feel.length ? (E2 ? `${cap(TEX_PICK_EN[t])} textures` : `鍾意${TEX_PICK[t]}`) : ''].filter(Boolean).join(E2 ? ' · ' : '・'), text:fitText});
    if (picks.some(p => p.step === 'remover')) care.push(E2 ? {label:'Wears makeup', text:'Remover added: remove first, then cleanse at night'} : {label:'有化妝', text:'加咗卸妝，夜晚先卸再洗'});
    return {concerns, care:care.slice(0, 3)};
  }

  function usage(p) {
    if (en()) {
      if (p.step === 'sun') return 'AM';
      if (p.step === 'remover') return 'PM';
      if (p.step === 'mask') return '2–3× a week';
      return p.am && p.pm ? 'AM & PM' : p.pm ? 'PM' : 'AM';
    }
    if (p.step === 'sun') return '早上';
    if (p.step === 'remover') return '夜晚';
    if (p.step === 'mask') return '每星期 2–3 次';
    return p.am && p.pm ? '早晚' : p.pm ? '夜晚' : '早上';
  }

  return {STEP_ORDER, STEP_NAMES, ROUTINES, CONCERNS, ACTIVES, FLAGS, buildPool, blankAnswers, wantedSteps,
    eligible, score, ranked, recommend, alternatives, extra, covered, matched, lead, detail, explain, usage, hookOk, knowsIngredients, total,
    setLang, stepName, concernName, concernHint, activeName, flagName};
});
